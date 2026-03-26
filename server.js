/**
 * server.js — CarKeeper report engine (Render) — JOB MODE (no 504s)
 *
 * ENDPOINTS:
 * - POST /generate-report
 *     Starts a job and returns immediately: { success:true, job_id, status_url }
 *
 * - GET  /report-status?job_id=...
 *     Returns job state: queued|running|done|error + progress + (report when done)
 *
 * - GET  /report-result?job_id=...
 *     Returns final report payload (same as done status), 404/409 otherwise
 *
 * ENV:
 * - OPENAI_API_KEY (required)
 * - OPENAI_MODEL (optional, default: gpt-4.1-mini)
 * - PORT (Render sets)
 * - DVLA_API_KEY (optional fallback if no forwarded key)
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const OpenAI = require("openai");

const { cleanString, normaliseTier } = require("./services/helpers");
const { fetchDvlaData, buildDvlaSection } = require("./services/dvla");
const { fetchMotData, buildMotSection } = require("./services/dvsa");
const { searchVehicleWebPresence, buildWebSection } = require("./services/search");
const { buildPrompt } = require("./services/reportBuilder");

const app = express();
const port = process.env.PORT || 4000;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

app.use(
  cors({
    origin: [
      "https://carkeeper.uk",
      "https://www.carkeeper.uk",
      "http://localhost:4000",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "x-dvla-api-key"],
  })
);

// Base64 images can be large.
app.use(express.json({ limit: "35mb" }));

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get("/", (req, res) => res.send("CarKeeper report engine is running (job mode)."));

/* =========================================================
   JOB STORE (in-memory)
   - For “proper” production, swap this for Redis/DB.
   - This fixes timeouts immediately and is stable for normal operation.
========================================================= */

const JOB_TTL_MS = 1000 * 60 * 30; // 30 mins
const jobs = new Map();

function nowMs() {
  return Date.now();
}

function makeJobId(seed) {
  // If WP provides report_id, use it for deterministic mapping.
  if (seed && String(seed).trim()) return `rpt_${String(seed).trim()}`;
  return `job_${crypto.randomUUID()}`;
}

function setJob(job_id, patch) {
  const existing = jobs.get(job_id) || {};
  jobs.set(job_id, { ...existing, ...patch });
}

function getJob(job_id) {
  return jobs.get(job_id) || null;
}

function cleanupJobs() {
  const cutoff = nowMs() - JOB_TTL_MS;
  for (const [id, job] of jobs.entries()) {
    if (!job || !job.updated_at || job.updated_at < cutoff) {
      jobs.delete(id);
    }
  }
}
setInterval(cleanupJobs, 60 * 1000).unref();

/* =========================================================
   IMAGE HELPERS (WordPress payload)
========================================================= */

function tierConfig(tier) {
  const t = String(tier || "pro").toLowerCase();
  // Keep it reasonable: vision is expensive + slower.
  // You can raise later once stable.
  if (t === "premium") return { maxImages: 6, depth: "comprehensive" };
  if (t === "basic") return { maxImages: 2, depth: "condensed" };
  return { maxImages: 4, depth: "standard" };
}

function normalizeDataUri(item) {
  if (!item) return null;
  if (typeof item === "string") return item.startsWith("data:image/") ? item : null;
  if (typeof item === "object") {
    const du =
      item.data_uri ||
      item.dataUri ||
      item.dataURL ||
      item.data_url ||
      item.url;
    if (typeof du === "string" && du.startsWith("data:image/")) return du;
  }
  return null;
}

function extractImageDataUris(body, tier) {
  const cfg = tierConfig(tier);

  const fromImages = Array.isArray(body.images) ? body.images : [];
  const fromBlobs = Array.isArray(body.image_blobs) ? body.image_blobs : [];
  const fromAlias = Array.isArray(body.imageBlobs) ? body.imageBlobs : [];
  const legacySingle = body.image_url ? [body.image_url] : [];

  const all = [...fromImages, ...fromBlobs, ...fromAlias, ...legacySingle];

  return all
    .map(normalizeDataUri)
    .filter(Boolean)
    .slice(0, cfg.maxImages);
}

/* =========================================================
   REPORT HELPERS
========================================================= */

function splitIntoSections(text) {
  const lines = String(text || "").split("\n");
  const sections = [];
  let current = { title: "Overview", content: "" };

  const push = () => {
    if ((current.title && current.title.trim()) || (current.content && current.content.trim())) {
      sections.push({
        title: current.title.trim() || "Section",
        content: current.content.trim(),
      });
    }
  };

  for (const line of lines) {
    if (line.startsWith("## ")) {
      push();
      current = { title: line.replace(/^##\s+/, "").trim(), content: "" };
    } else {
      current.content += line + "\n";
    }
  }

  push();
  return sections;
}

/* =========================================================
   OPENAI VISION (multi-image)
========================================================= */

async function analyseVehicleImages(dataUris, { tier, registration, make, model, year }) {
  if (!Array.isArray(dataUris) || dataUris.length === 0) {
    return { text: "No images were supplied, so no image-based observations could be made.", perImage: [] };
  }

  const cfg = tierConfig(tier);
  const vehicleLabel = [year, make, model].filter(Boolean).join(" ").trim();

  const promptText = `
You are analysing vehicle photos for a UK vehicle investigation report.

Context:
- Registration: ${registration || "Not provided"}
- Vehicle: ${vehicleLabel || "Not provided"}
- Tier depth: ${cfg.depth}

Rules:
- Only describe what is visually supportable from the photos.
- Do not guess hidden mechanical condition.
- Do not invent provenance or restoration history.
- Be cautious and specific.
- Note limitations (angle/lighting/coverage).
- If multiple images conflict, flag the inconsistency clearly.

Return TWO things:

(1) A premium "Image Analysis" section in markdown with headings:
## Image Overview
## Visible Condition
## Identity / Spec Clues
## Possible Issues or Questions
## Confidence Notes

(2) A STRICT JSON block (no markdown) named IMAGE_FEEDBACK_JSON with schema:
{"per_image":[{"index":1,"observations":["..."],"flags":["..."],"confidence":0.0}]}

Flags suggestions (use only if supported):
["damage_possible","repair_possible","warning_light_seen","tyre_wear_uneven","panel_gap_inconsistent","leak_possible","interior_wear_high","odometer_inconsistent","rust_possible"]
`.trim();

  try {
    const response = await client.responses.create({
      model: OPENAI_MODEL,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: promptText },
            ...dataUris.map((du) => ({
              type: "input_image",
              image_url: du,
              detail: "high",
            })),
          ],
        },
      ],
      temperature: 0.2,
    });

    const out = response.output_text || "";

    let perImage = [];
    const marker = "IMAGE_FEEDBACK_JSON";
    const idx = out.indexOf(marker);

    if (idx !== -1) {
      const jsonPart = out.slice(idx + marker.length).trim();
      const firstBrace = jsonPart.indexOf("{");
      const lastBrace = jsonPart.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const candidate = jsonPart.slice(firstBrace, lastBrace + 1);
        try {
          const parsed = JSON.parse(candidate);
          if (parsed && Array.isArray(parsed.per_image)) {
            perImage = parsed.per_image.map((x, i) => ({
              index: Number(x.index || i + 1),
              observations: Array.isArray(x.observations) ? x.observations.map(String) : [],
              flags: Array.isArray(x.flags) ? x.flags.map(String) : [],
              confidence: typeof x.confidence === "number" ? x.confidence : null,
            }));
          }
        } catch (_) {}
      }
    }

    const cleanedText = idx !== -1 ? out.slice(0, idx).trim() : out.trim();

    return {
      text: cleanedText || "Images were supplied but no image findings were returned.",
      perImage,
    };
  } catch (error) {
    console.error("Image analysis failed:", error?.message || error);
    return { text: "Images were supplied, but image analysis could not be completed.", perImage: [] };
  }
}

/* =========================================================
   JOB WORKER
========================================================= */

async function runJob(job_id) {
  const job = getJob(job_id);
  if (!job) return;

  setJob(job_id, {
    status: "running",
    step: "starting",
    progress: 0.02,
    updated_at: nowMs(),
  });

  const { body, forwardedDvlaKey } = job;

  const registration = cleanString(body.registration);
  const vin = cleanString(body.vin);
  const make = cleanString(body.make);
  const model = cleanString(body.model);
  const year = cleanString(body.year);
  const tier = normaliseTier(body.tier);

  const notes = cleanString(body.notes);
  const goal = cleanString(body.goal);
  const followup_q1 = cleanString(body.followup_q1);
  const followup_q2 = cleanString(body.followup_q2);

  const legacyImageUrl = cleanString(body.image_url);
  const dataUris = extractImageDataUris(body, tier);

  const provided = {
    registration,
    vin,
    make,
    model,
    year,
    notes,
    goal,
    followup_q1,
    followup_q2,
    image_url: legacyImageUrl,
  };

  const dvlaKeyToUse = forwardedDvlaKey || process.env.DVLA_API_KEY || "";

  try {
    setJob(job_id, { step: "fetching_data", progress: 0.08, updated_at: nowMs() });

    // Tier gating to keep things sane (you can expand later):
    // - Basic: DVLA + images (light) + report
    // - Pro: DVLA + MOT + images + report
    // - Premium: DVLA + MOT + Web + images + report
    const tierLower = String(tier || "pro").toLowerCase();
    const includeMot = tierLower !== "basic";
    const includeWeb = tierLower === "premium";

    const dvlaPromise = fetchDvlaData(registration, dvlaKeyToUse);
    const motPromise = includeMot ? fetchMotData(registration) : Promise.resolve(null);
    const webPromise = includeWeb ? searchVehicleWebPresence({ registration, make, model, year }) : Promise.resolve(null);

    const [dvlaData, motData, searchSummary] = await Promise.all([dvlaPromise, motPromise, webPromise]);

    setJob(job_id, { step: "image_analysis", progress: 0.32, updated_at: nowMs() });

    const imageAnalysis = await analyseVehicleImages(
      dataUris.length ? dataUris : legacyImageUrl ? [legacyImageUrl] : [],
      { tier, registration, make, model, year }
    );

    setJob(job_id, { step: "building_prompt", progress: 0.55, updated_at: nowMs() });

    const identitySection = buildDvlaSection(dvlaData, provided);
    const motSection = includeMot ? buildMotSection(motData) : "## MOT / DVSA\nNot included for this tier.\n";
    const webSection = includeWeb ? buildWebSection(searchSummary, tier) : "## Web Presence\nNot included for this tier.\n";

    const prompt = buildPrompt({
      registration,
      vin,
      make,
      model,
      year,
      tier,
      identitySection,
      motSection,
      webSection,
      imageFindings: imageAnalysis.text,
      notes,
      goal,
      followup_q1,
      followup_q2,
    });

    setJob(job_id, { step: "writing_report", progress: 0.72, updated_at: nowMs() });

    const response = await client.responses.create({
      model: OPENAI_MODEL,
      instructions: `
You are CarKeeper, a UK-focused vehicle investigation assistant.

Never fabricate facts.
Use only supplied data.
Unknowns must be stated clearly.
Separate confirmed facts from likely inferences.
Write with clarity, discipline, and genuine usefulness.

Ensure there is a dedicated section titled:
## Image Analysis

If image findings are unavailable, state that clearly.
`.trim(),
      input: prompt,
      temperature: 0.2,
    });

    let reportText = response.output_text || "";

    // Ensure Image Analysis exists even if prompt builder didn't include headings properly
    if (!reportText.includes("## Image Analysis") && imageAnalysis.text) {
      reportText = `${reportText}\n\n## Image Analysis\n${imageAnalysis.text}\n`;
    }

    // Add appendix
    if (imageAnalysis.perImage && imageAnalysis.perImage.length) {
      reportText += `\n\n## Appendix A — Image Observations\n`;
      for (const img of imageAnalysis.perImage) {
        reportText += `\n### Image ${img.index}\n`;
        if (img.flags && img.flags.length) reportText += `- Flags: ${img.flags.join(", ")}\n`;
        if (typeof img.confidence === "number") reportText += `- Confidence: ${img.confidence}\n`;
        if (img.observations && img.observations.length) {
          for (const o of img.observations) reportText += `- ${o}\n`;
        } else {
          reportText += `- No specific observations returned.\n`;
        }
      }
    }

    setJob(job_id, { step: "finalizing", progress: 0.92, updated_at: nowMs() });

    const sections = splitIntoSections(reportText);

    const result = {
      success: true,
      tier,
      report: reportText,
      sections,
      identitySection,
      motSection,
      webSection,
      imageFindings: imageAnalysis.text,
      image_feedback: imageAnalysis.perImage,
      dvlaData,
      motData,
      searchSummary,
      debug: {
        imagesReceived: {
          images: Array.isArray(body.images) ? body.images.length : 0,
          image_blobs: Array.isArray(body.image_blobs) ? body.image_blobs.length : 0,
        },
        imagesUsed: dataUris.length,
        legacyImageUrlUsed: !!legacyImageUrl && dataUris.length === 0,
        includeMot,
        includeWeb,
      },
    };

    setJob(job_id, {
      status: "done",
      step: "done",
      progress: 1.0,
      updated_at: nowMs(),
      result,
    });
  } catch (err) {
    console.error("JOB ERROR:", job_id, err);
    setJob(job_id, {
      status: "error",
      step: "error",
      progress: 1.0,
      updated_at: nowMs(),
      error: err?.message || "Job failed",
    });
  }
}

/* =========================================================
   ROUTES (JOB MODE)
========================================================= */

app.post("/generate-report", async (req, res) => {
  try {
    const body = req.body || {};

    // Validate minimal identity quickly (do not run heavy work here)
    const registration = cleanString(body.registration);
    const vin = cleanString(body.vin);
    const make = cleanString(body.make);
    const model = cleanString(body.model);

    if (!registration && !vin && !(make && model)) {
      return res.status(400).json({
        success: false,
        error: "Please provide a registration, VIN, or make and model.",
      });
    }

    const forwardedDvlaKey = req.headers["x-dvla-api-key"] || "";

    // Prefer using report_id as deterministic job id (WP sends report_id)
    const job_id = makeJobId(body.report_id);

    // If job already exists and is done, return that immediately
    const existing = getJob(job_id);
    if (existing && existing.status === "done") {
      return res.json({
        success: true,
        job_id,
        status: "done",
        status_url: `/report-status?job_id=${encodeURIComponent(job_id)}`,
        result: existing.result,
        cached: true,
      });
    }

    // Create or reset job record
    setJob(job_id, {
      job_id,
      status: "queued",
      step: "queued",
      progress: 0.0,
      created_at: nowMs(),
      updated_at: nowMs(),
      body,
      forwardedDvlaKey,
    });

    // Kick off background processing (do not await)
    setImmediate(() => runJob(job_id));

    return res.json({
      success: true,
      job_id,
      status: "queued",
      status_url: `/report-status?job_id=${encodeURIComponent(job_id)}`,
    });
  } catch (err) {
    console.error("START JOB ERROR:", err);
    return res.status(500).json({ success: false, error: err?.message || "Failed to start job" });
  }
});

app.get("/report-status", (req, res) => {
  const job_id = String(req.query.job_id || "").trim();
  if (!job_id) return res.status(400).json({ success: false, error: "Missing job_id" });

  const job = getJob(job_id);
  if (!job) return res.status(404).json({ success: false, error: "Job not found" });

  // Return minimal info while running; include result when done
  const payload = {
    success: true,
    job_id,
    status: job.status,
    step: job.step,
    progress: job.progress,
  };

  if (job.status === "done") payload.result = job.result;
  if (job.status === "error") payload.error = job.error || "Job failed";

  return res.json(payload);
});

app.get("/report-result", (req, res) => {
  const job_id = String(req.query.job_id || "").trim();
  if (!job_id) return res.status(400).json({ success: false, error: "Missing job_id" });

  const job = getJob(job_id);
  if (!job) return res.status(404).json({ success: false, error: "Job not found" });

  if (job.status !== "done") {
    return res.status(409).json({
      success: false,
      error: "Job not complete",
      status: job.status,
      step: job.step,
      progress: job.progress,
    });
  }

  return res.json({ success: true, job_id, result: job.result });
});

app.listen(port, () => {
  console.log(`CarKeeper report engine (job mode) running on port ${port}`);
});


