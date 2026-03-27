// server.js
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
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || OPENAI_MODEL;

app.use(express.json({ limit: "25mb" }));

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

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get("/", (_req, res) => res.send("CarKeeper report engine is running."));

/* =========================================================
   UTIL: robust output text extraction
========================================================= */

function extractOutputText(resp) {
  if (!resp) return "";
  if (typeof resp.output_text === "string" && resp.output_text.trim()) return resp.output_text.trim();

  const out = resp.output;
  if (Array.isArray(out)) {
    const chunks = [];
    for (const msg of out) {
      const content = msg?.content;
      if (!Array.isArray(content)) continue;
      for (const part of content) {
        if (part?.type === "output_text" && typeof part?.text === "string") chunks.push(part.text);
        if (part?.type === "text" && typeof part?.text === "string") chunks.push(part.text);
      }
    }
    const joined = chunks.join("\n").trim();
    if (joined) return joined;
  }

  const alt = resp?.response?.output_text;
  if (typeof alt === "string" && alt.trim()) return alt.trim();
  return "";
}

function splitIntoSections(text) {
  const lines = String(text || "").split("\n");
  const sections = [];
  let current = { title: "Overview", content: "" };

  const push = () => {
    const t = (current.title || "").trim();
    const c = (current.content || "").trim();
    if (t || c) sections.push({ title: t || "Section", content: c });
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
   IMAGES: accept url + base64 data URIs (from WP)
========================================================= */

function getImagesFromBody(body) {
  const images = [];

  const blobs = Array.isArray(body.images)
    ? body.images
    : Array.isArray(body.image_blobs)
    ? body.image_blobs
    : [];

  for (const b of blobs) {
    const dataUri = typeof b?.data_uri === "string" ? b.data_uri : "";
    const url = typeof b?.url === "string" ? b.url : "";
    if (dataUri.startsWith("data:image/")) images.push({ kind: "data_uri", value: dataUri });
    else if (url) images.push({ kind: "url", value: url });
  }

  const imageUrls = Array.isArray(body.image_urls) ? body.image_urls : [];
  for (const u of imageUrls) if (typeof u === "string" && u.trim()) images.push({ kind: "url", value: u.trim() });

  const single = typeof body.image_url === "string" ? body.image_url.trim() : "";
  if (single) images.push({ kind: "url", value: single });

  const seen = new Set();
  const deduped = [];
  for (const im of images) {
    const key = `${im.kind}:${im.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(im);
  }
  return deduped.slice(0, 8);
}

async function analyseSingleImage(image, detail = "low") {
  try {
    const response = await client.responses.create({
      model: OPENAI_IMAGE_MODEL,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
You are analysing a vehicle image for a UK vehicle investigation report.

Rules:
- Only describe what is visually supportable from the image.
- Do not guess hidden mechanical condition.
- Do not invent provenance or restoration history.
- Be cautious and specific.
- Mention if image quality/angle/lighting limits certainty.
- Do not identify exact trim/version unless clearly visible.

Return short structured findings under these headings:
## Visible Condition
## Identity / Spec Clues
## Possible Issues or Questions
## Confidence Notes
              `.trim(),
            },
            { type: "input_image", image_url: image.value, detail },
          ],
        },
      ],
    });

    const text = extractOutputText(response);
    return text || "Image supplied, but no findings were returned.";
  } catch (err) {
    console.error("Image analysis failed:", err?.message || err);
    return "Image supplied, but image analysis could not be completed.";
  }
}

async function analyseVehicleImages(images, tier) {
  if (!images.length) return "No images were supplied, so no image-based observations could be made.";

  // Tier-based image depth
  const cap = tier === "premium" ? 5 : tier === "pro" ? 3 : 1;
  const detail = tier === "premium" ? "high" : "low";
  const subset = images.slice(0, cap);

  const results = await Promise.all(subset.map((img) => analyseSingleImage(img, detail)));

  let out = "## Image Analysis\n";
  subset.forEach((img, idx) => {
    out += `\n## Image ${idx + 1}\n${results[idx]}\n`;
  });

  if (images.length > subset.length) out += `\n## Note\nAnalysed ${subset.length} of ${images.length} images for speed.\n`;
  return out.trim();
}

/* =========================================================
   TIER BUDGETS (keeps it fast + avoids timeouts)
========================================================= */

function getTierBudget(tier) {
  if (tier === "premium") {
    return {
      maxOutputTokens: 2600,
      depth: "deep",
      includeNegotiation: true,
      includeChecklist: true,
      includeRiskScore: true,
      includeMotDeep: true,
      includeWebDeep: true,
    };
  }
  if (tier === "pro") {
    return {
      maxOutputTokens: 1700,
      depth: "standard",
      includeNegotiation: true,
      includeChecklist: true,
      includeRiskScore: true,
      includeMotDeep: true,
      includeWebDeep: true,
    };
  }
  return {
    maxOutputTokens: 1100,
    depth: "light",
    includeNegotiation: false,
    includeChecklist: true,
    includeRiskScore: true,
    includeMotDeep: false,
    includeWebDeep: false,
  };
}

/* =========================================================
   DETERMINISTIC ANALYSIS (stable + fast)
   - Risk score (0-100)
   - Identity confidence
   - MOT anomaly hints (best effort)
========================================================= */

function safeLower(s) {
  return String(s || "").trim().toLowerCase();
}

function buildIdentityDiagnostics(dvlaData, provided) {
  const regProvided = safeLower(provided.registration);
  const makeProvided = safeLower(provided.make);
  const modelProvided = safeLower(provided.model);
  const yearProvided = safeLower(provided.year);

  const dvlaMake = safeLower(dvlaData?.make);
  const dvlaModel = safeLower(dvlaData?.model);
  const dvlaYear = safeLower(dvlaData?.yearOfManufacture || dvlaData?.year);

  const mismatches = [];

  if (dvlaMake && makeProvided && dvlaMake !== makeProvided) mismatches.push(`Make mismatch: DVLA="${dvlaMake}" vs Provided="${makeProvided}"`);
  if (dvlaModel && modelProvided && dvlaModel !== modelProvided) mismatches.push(`Model mismatch: DVLA="${dvlaModel}" vs Provided="${modelProvided}"`);
  if (dvlaYear && yearProvided && dvlaYear !== yearProvided) mismatches.push(`Year mismatch: DVLA="${dvlaYear}" vs Provided="${yearProvided}"`);

  const confidence =
    dvlaMake || dvlaModel || dvlaYear
      ? mismatches.length === 0
        ? "High"
        : mismatches.length === 1
        ? "Medium"
        : "Low"
      : "Unknown";

  return {
    confidence,
    mismatches,
    dvlaSnapshot: {
      make: dvlaMake || null,
      model: dvlaModel || null,
      year: dvlaYear || null,
    },
  };
}

function buildMotDiagnostics(motData) {
  // Best-effort: different MOT APIs shape data differently
  // We attempt to detect repeated advisories & mileage spikes if fields exist.
  const hints = [];
  let tests = [];

  if (Array.isArray(motData?.motTests)) tests = motData.motTests;
  else if (Array.isArray(motData?.tests)) tests = motData.tests;
  else if (Array.isArray(motData)) tests = motData;

  const mileages = [];
  const advisoryCounts = new Map();

  for (const t of tests) {
    const od = t?.odometerValue || t?.odometerReading || t?.mileage || null;
    const odNum = od ? Number(String(od).replace(/[^\d.]/g, "")) : NaN;
    if (!Number.isNaN(odNum) && odNum > 0) mileages.push(odNum);

    const advisories = t?.advisoryItems || t?.advisories || t?.advisoryText || [];
    const list = Array.isArray(advisories) ? advisories : typeof advisories === "string" ? [advisories] : [];
    for (const a of list) {
      const key = safeLower(a).slice(0, 120);
      if (!key) continue;
      advisoryCounts.set(key, (advisoryCounts.get(key) || 0) + 1);
    }
  }

  // Mileage spike heuristic
  if (mileages.length >= 3) {
    const sorted = [...mileages].sort((a, b) => a - b);
    const diffs = [];
    for (let i = 1; i < sorted.length; i++) diffs.push(sorted[i] - sorted[i - 1]);
    const maxDiff = Math.max(...diffs);
    const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;

    if (maxDiff > avgDiff * 3 && maxDiff > 25000) {
      hints.push("Possible mileage spike detected across MOT history (check odometer readings and service history).");
    }
  }

  // Repeat advisories heuristic
  const repeats = [...advisoryCounts.entries()].filter(([, c]) => c >= 3);
  if (repeats.length) {
    hints.push("Repeated advisories across multiple MOTs (suggests persistent issues or deferred repairs).");
  }

  return { hints };
}

function computeRiskScore({ identity, motDiag, imageFindings, tier }) {
  // Deterministic score: 0 (low) -> 100 (high)
  let score = 25;

  if (identity.confidence === "Low") score += 25;
  if (identity.confidence === "Medium") score += 12;
  if (identity.mismatches.length >= 2) score += 10;

  if (motDiag.hints.length) score += Math.min(20, motDiag.hints.length * 8);

  const imgText = safeLower(imageFindings);
  if (imgText.includes("rust") || imgText.includes("corrosion")) score += 12;
  if (imgText.includes("damage") || imgText.includes("dent") || imgText.includes("crack")) score += 10;
  if (imgText.includes("low confidence") || imgText.includes("limits certainty")) score += 5;

  // Tier doesn’t change truth, just how we present it:
  if (tier === "basic") score = Math.min(85, score);
  return Math.max(0, Math.min(100, score));
}

function buildRiskFlags({ identity, motDiag, riskScore }) {
  const flags = [];
  if (identity.mismatches.length) flags.push("Identity mismatch risk: provided details differ from DVLA (verify paperwork).");
  for (const h of motDiag.hints) flags.push(h);
  if (riskScore >= 70) flags.push("Overall risk elevated — recommend in-person inspection or independent pre-purchase check.");
  return flags.slice(0, 8);
}

/* =========================================================
   FALLBACK REPORT (if AI fails)
========================================================= */

function buildFallbackReport({ meta, identityDiag, riskScore, riskFlags, identitySection, motSection, webSection, imageFindings }) {
  const lines = [];
  lines.push("## Executive Summary");
  lines.push(`Registration: ${meta.registration || "N/A"}`);
  lines.push(`Vehicle: ${(meta.year || "").trim()} ${(meta.make || "").trim()} ${(meta.model || "").trim()}`.trim() || "Vehicle: N/A");
  lines.push(`Tier: ${meta.tier}`);
  lines.push("");
  lines.push("## Risk Score");
  lines.push(`Risk Score (0-100): **${riskScore}**`);
  lines.push(identityDiag?.confidence ? `Identity confidence: **${identityDiag.confidence}**` : "");
  if (riskFlags.length) {
    lines.push("");
    lines.push("## Key Risk Flags");
    for (const f of riskFlags) lines.push(`- ${f}`);
  }
  lines.push("");
  lines.push("## Identity (DVLA / Provided)");
  lines.push(identitySection || "No identity section available.");
  lines.push("");
  lines.push("## MOT Summary");
  lines.push(motSection || "No MOT section available.");
  lines.push("");
  lines.push("## Web Signals");
  lines.push(webSection || "No web section available.");
  lines.push("");
  lines.push("## Image Analysis");
  lines.push(imageFindings || "No image findings.");
  lines.push("");
  lines.push("## Buyer Checklist");
  lines.push("- Confirm V5C matches vehicle and seller details.");
  lines.push("- Check service history, invoices, and MOT history consistency.");
  lines.push("- Inspect bodywork, tyres, brakes, and interior wear vs mileage.");
  lines.push("- Verify warnings/lights, fluids, leaks, and test drive behaviour.");
  return lines.filter(Boolean).join("\n");
}

/* =========================================================
   ROUTE
========================================================= */

app.post("/generate-report", async (req, res) => {
  const startedAt = Date.now();

  try {
    const body = req.body || {};

    const registration = cleanString(body.registration);
    const vin = cleanString(body.vin);
    const make = cleanString(body.make);
    const model = cleanString(body.model);
    const year = cleanString(body.year);
    const tier = normaliseTier(body.tier);

    if (!registration && !vin && !(make && model)) {
      return res.status(400).json({ success: false, error: "Please provide a registration, VIN, or make and model." });
    }

    const budget = getTierBudget(tier);
    const meta = { registration, vin, make, model, year, tier };

    const forwardedDvlaKey = req.headers["x-dvla-api-key"] || "";
    const images = getImagesFromBody(body);

    console.log("REQ summary:", {
      registration,
      tier,
      imagesCount: images.length,
      dvlaKeyForwarded: !!forwardedDvlaKey,
      model: OPENAI_MODEL,
    });

    const [dvlaData, motData, searchSummary, imageFindings] = await Promise.all([
      fetchDvlaData(registration, forwardedDvlaKey),
      fetchMotData(registration),
      searchVehicleWebPresence({ registration, make, model, year }),
      analyseVehicleImages(images, tier),
    ]);

    const identitySection = buildDvlaSection(dvlaData, meta);
    const motSection = buildMotSection(motData);
    const webSection = buildWebSection(searchSummary, tier);

    // Deterministic layer
    const identityDiag = buildIdentityDiagnostics(dvlaData, meta);
    const motDiag = buildMotDiagnostics(motData);
    const riskScore = computeRiskScore({ identity: identityDiag, motDiag, imageFindings, tier });
    const riskFlags = buildRiskFlags({ identity: identityDiag, motDiag, riskScore });

    // Feed the deterministic layer into the report builder
    const deterministicInsights = [
      "## Deterministic Diagnostics",
      `Identity confidence: ${identityDiag.confidence}`,
      identityDiag.mismatches.length ? `Mismatches:\n- ${identityDiag.mismatches.join("\n- ")}` : "Mismatches: none detected from available fields",
      motDiag.hints.length ? `MOT anomaly hints:\n- ${motDiag.hints.join("\n- ")}` : "MOT anomaly hints: none detected (best-effort)",
      `Risk score (0-100): ${riskScore}`,
      riskFlags.length ? `Risk flags:\n- ${riskFlags.join("\n- ")}` : "Risk flags: none",
    ].join("\n");

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
      imageFindings,
      notes: "",
      goal: "",
      followup_q1: "",
      followup_q2: "",
    });

    const upgradedInstructions = `
You are CarKeeper, a UK-focused vehicle investigation assistant.

Hard rules:
- Never fabricate facts.
- Use only supplied data (DVLA/MOT/web summary/image findings/deterministic diagnostics).
- Clearly separate confirmed facts vs inferences.
- If data is missing, say so.

Output format rules:
- Output MUST be a polished paid report in Markdown.
- Use MANY "##" headings.
- Always include these sections IN THIS ORDER:

## Executive Summary
## Vehicle Identity & Confidence
## Risk Score & Key Flags
## DVLA / Identity Evidence
## MOT Evidence & Patterns
## Image-Based Observations
## Web / Market Signals
## Buyer Checklist
## Questions To Ask The Seller

If tier is "premium", also include:
## Negotiation Leverage
## What Would Make Me Walk Away?

Make it decisive, premium, and practical. Avoid fluff.
`.trim();

    // Inject deterministic insights at top of prompt to guide model
    const combinedPrompt = [
      deterministicInsights,
      "",
      "## Source Material",
      prompt,
    ].join("\n");

    let reportText = "";
    try {
      const aiResp = await client.responses.create({
        model: OPENAI_MODEL,
        instructions: upgradedInstructions,
        input: combinedPrompt,
        max_output_tokens: budget.maxOutputTokens,
      });
      reportText = extractOutputText(aiResp);
    } catch (aiErr) {
      console.error("OpenAI failed:", aiErr?.message || aiErr);
      reportText = "";
    }

    // Guaranteed non-empty output
    if (!reportText || reportText.trim().length < 80) {
      reportText = buildFallbackReport({
        meta,
        identityDiag,
        riskScore,
        riskFlags,
        identitySection,
        motSection,
        webSection,
        imageFindings,
      });
    }

    const sections = splitIntoSections(reportText);

    res.json({
      success: true,
      tier,
      report: reportText,
      sections,
      meta,
      debug: {
        durationMs: Date.now() - startedAt,
        imagesCount: images.length,
        riskScore,
        identityConfidence: identityDiag.confidence,
      },
    });
  } catch (error) {
    console.error("FULL ERROR:", error);
    res.status(500).json({ success: false, error: error?.message || "Report generation failed" });
  }
});

app.listen(port, () => console.log(`CarKeeper report engine running on port ${port}`));
