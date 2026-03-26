/**
 * server.js
 *
 * CarKeeper report engine (Render)
 * - POST /generate-report
 * - DVLA + DVSA + Web presence + OpenAI report generation
 * - ✅ Vision: supports multiple images from WordPress payload (data URIs)
 *
 * ENV:
 * - OPENAI_API_KEY (required)
 * - OPENAI_MODEL (optional, default gpt-4.1-mini)
 * - PORT (Render sets)
 * - DVLA_API_KEY (optional fallback if no forwarded key)
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
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

// ✅ Base64 images are big. 5mb will break. Use 25mb.
// (If you allow 10 premium images, you may want 35mb; start with 25mb.)
app.use(express.json({ limit: "25mb" }));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get("/", (req, res) => {
  res.send("CarKeeper report engine is running.");
});

/* =========================================================
   IMAGE HELPERS
========================================================= */

function tierConfig(tier) {
  const t = String(tier || "pro").toLowerCase();
  if (t === "premium") return { maxImages: 10, depth: "comprehensive" };
  if (t === "basic") return { maxImages: 3, depth: "condensed" };
  return { maxImages: 6, depth: "standard" };
}

function normalizeDataUri(item) {
  if (!item) return null;

  // string data uri
  if (typeof item === "string") {
    return item.startsWith("data:image/") ? item : null;
  }

  // object with data_uri keys
  if (typeof item === "object") {
    const du =
      item.data_uri ||
      item.dataUri ||
      item.dataURL ||
      item.data_url ||
      item.url; // sometimes people pass {url:"data:image..."}
    if (typeof du === "string" && du.startsWith("data:image/")) return du;
  }

  return null;
}

function extractImageDataUris(body, tier) {
  const cfg = tierConfig(tier);

  const fromImages = Array.isArray(body.images) ? body.images : [];
  const fromBlobs = Array.isArray(body.image_blobs) ? body.image_blobs : [];
  const fromAlias = Array.isArray(body.imageBlobs) ? body.imageBlobs : [];
  const fromSingle = body.image_url ? [body.image_url] : [];

  const all = [...fromImages, ...fromBlobs, ...fromAlias, ...fromSingle];

  const dataUris = all
    .map(normalizeDataUri)
    .filter(Boolean)
    .slice(0, cfg.maxImages);

  return dataUris;
}

/**
 * Vision analysis across multiple images.
 *
 * Returns:
 * {
 *   text: string,            // premium markdown headings starting with ##
 *   perImage: [{index, observations[], flags[], confidence}]
 * }
 */
async function analyseVehicleImages(dataUris, { tier, registration, make, model, year }) {
  if (!Array.isArray(dataUris) || dataUris.length === 0) {
    return {
      text: "No images were supplied, so no image-based observations could be made.",
      perImage: [],
    };
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
- Note image limitations (angle/lighting/coverage).
- If multiple images conflict, flag the inconsistency clearly.

Return TWO things:

(1) A premium "Image Analysis" section in markdown with headings:
## Image Overview
## Visible Condition
## Identity / Spec Clues
## Possible Issues or Questions
## Confidence Notes

(2) A STRICT JSON block (no markdown) named IMAGE_FEEDBACK_JSON with schema:
{
  "per_image": [
    {"index": 1, "observations": ["..."], "flags": ["..."], "confidence": 0.0}
  ]
}

Flags suggestions (use only if supported by images):
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
              image_url: du, // ✅ data URI supported
              detail: "high",
            })),
          ],
        },
      ],
      temperature: 0.2,
    });

    const out = response.output_text || "";

    // Extract the JSON block if present
    // Expect something like:
    // IMAGE_FEEDBACK_JSON
    // { ... }
    let perImage = [];
    const marker = "IMAGE_FEEDBACK_JSON";
    const idx = out.indexOf(marker);
    if (idx !== -1) {
      const jsonPart = out.slice(idx + marker.length).trim();
      // Find first { ... } block
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
        } catch (e) {
          // ignore parse errors; still return text
        }
      }
    }

    // Remove the JSON block from text portion for cleaner report injection
    const cleanedText = idx !== -1 ? out.slice(0, idx).trim() : out.trim();

    return {
      text: cleanedText || "Images were supplied but no image findings were returned.",
      perImage,
    };
  } catch (error) {
    console.error("Image analysis failed:", error?.message || error);
    return {
      text: "Images were supplied, but image analysis could not be completed.",
      perImage: [],
    };
  }
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
   MAIN ENDPOINT
========================================================= */

app.post("/generate-report", async (req, res) => {
  try {
    const body = req.body || {};

    const registration = cleanString(body.registration);
    const vin = cleanString(body.vin);
    const make = cleanString(body.make);
    const model = cleanString(body.model);
    const year = cleanString(body.year);
    const tier = normaliseTier(body.tier);

    // Legacy single url still supported, but WP should now send images/image_blobs with data_uri
    const legacyImageUrl = cleanString(body.image_url);

    // You mentioned you removed notes/followups in WP form; keep support if backend still receives them.
    const notes = cleanString(body.notes);
    const goal = cleanString(body.goal);
    const followup_q1 = cleanString(body.followup_q1);
    const followup_q2 = cleanString(body.followup_q2);

    if (!registration && !vin && !(make && model)) {
      return res.status(400).json({
        success: false,
        error: "Please provide a registration, VIN, or make and model.",
      });
    }

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

    // DVLA key forwarded from WordPress (preferred). Fallback to env DVLA_API_KEY.
    const forwardedDvlaKey = req.headers["x-dvla-api-key"] || "";
    const dvlaKeyToUse = forwardedDvlaKey || process.env.DVLA_API_KEY || "";

    console.log("DVLA DEBUG:", {
      hasForwardedDvlaKey: !!forwardedDvlaKey,
      hasEnvDvlaKey: !!process.env.DVLA_API_KEY,
      usingKey: !!dvlaKeyToUse,
      registration,
    });

    // ✅ Extract images from payload (base64 data URIs)
    const dataUris = extractImageDataUris(body, tier);

    console.log("IMAGE DEBUG:", {
      tier,
      imagesFieldCount: Array.isArray(body.images) ? body.images.length : 0,
      imageBlobsFieldCount: Array.isArray(body.image_blobs) ? body.image_blobs.length : 0,
      dataUrisUsed: dataUris.length,
      legacyImageUrlUsed: !!legacyImageUrl && dataUris.length === 0,
    });

    const [dvlaData, motData, searchSummary, imageAnalysis] = await Promise.all([
      fetchDvlaData(registration, dvlaKeyToUse),
      fetchMotData(registration),
      searchVehicleWebPresence({ registration, make, model, year }),
      analyseVehicleImages(
        dataUris.length ? dataUris : legacyImageUrl ? [legacyImageUrl] : [],
        { tier, registration, make, model, year }
      ),
    ]);

    const identitySection = buildDvlaSection(dvlaData, provided);
    const motSection = buildMotSection(motData);
    const webSection = buildWebSection(searchSummary, tier);

    // ✅ Inject the image analysis text into your prompt builder.
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
      imageFindings: imageAnalysis.text, // <-- IMPORTANT
      notes,
      goal,
      followup_q1,
      followup_q2,
    });

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

    // ✅ Ensure Image Analysis section exists even if prompt builder didn't include headings
    if (!reportText.includes("## Image Analysis") && imageAnalysis.text) {
      reportText = `${reportText}\n\n## Image Analysis\n${imageAnalysis.text}\n`;
    }

    // ✅ Add appendix with per-image bullets if we have them (premium/pro)
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

    const sections = splitIntoSections(reportText);

    res.json({
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
        dvlaHasForwardedKey: !!forwardedDvlaKey,
        dvlaHasEnvKey: !!process.env.DVLA_API_KEY,
        imagesReceived: {
          images: Array.isArray(body.images) ? body.images.length : 0,
          image_blobs: Array.isArray(body.image_blobs) ? body.image_blobs.length : 0,
        },
        imagesUsed: dataUris.length,
        legacyImageUrlUsed: !!legacyImageUrl && dataUris.length === 0,
      },
    });
  } catch (error) {
    console.error("FULL ERROR:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Report generation failed",
    });
  }
});

app.listen(port, () => {
  console.log(`CarKeeper report engine running on port ${port}`);
});

