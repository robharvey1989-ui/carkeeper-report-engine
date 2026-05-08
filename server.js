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

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "carkeeper-report-engine" });
});

/* -------------------- helpers -------------------- */

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
  return deduped.slice(0, 6);
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
You are analysing a vehicle image for a UK vehicle buying report.

Rules:
- Only describe what is visually supportable from the image.
- Do not guess hidden mechanical condition.
- Do not invent provenance, restoration history, trim, engine, gearbox, or originality.
- Do not state rust, leaks, corrosion, accident damage, or structural issues are absent unless clearly visible.
- Be cautious and specific.
- Mention if image quality, angle, or lighting limits certainty.

Return short structured findings:
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
  const cap = tier === "premium" ? 4 : tier === "pro" ? 2 : 1;
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

/* -------------------- main route -------------------- */

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

    // NEW: fields sent from WordPress/functions.php
    const listingText = cleanString(body.listing_text || body.listingSection || body.listing || "");
    const askingPrice = cleanString(body.asking_price || body.askingPrice || body.price || "");
    const sourceType = cleanString(body.source_type || body.sourceType || body.source || "");
    const reportDate = cleanString(body.report_date || body.reportDate || "");
    const calculatedAge = cleanString(body.calculated_age || body.calculatedAge || "");

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
      tier,
      asking_price: askingPrice,
      source_type: sourceType,
      report_date: reportDate,
      calculated_age: calculatedAge,
    };

    const forwardedDvlaKey = req.headers["x-dvla-api-key"] || "";
    const images = getImagesFromBody(body);

    console.log("REQ:", {
      registration,
      tier,
      imagesCount: images.length,
      asking_price: askingPrice,
      source_type: sourceType,
      has_listing_text: Boolean(listingText),
      listing_text_preview: listingText ? listingText.slice(0, 120) : "",
      report_date: reportDate,
      calculated_age: calculatedAge,
    });

    const [dvlaData, motData, searchSummary, imageFindings] = await Promise.all([
      fetchDvlaData(registration, forwardedDvlaKey),
      fetchMotData(registration),
      searchVehicleWebPresence({ registration, make, model, year }),
      analyseVehicleImages(images, tier),
    ]);

    const identitySection = buildDvlaSection(dvlaData, provided);
    const motSection = buildMotSection(motData);
    const webSection = buildWebSection(searchSummary, tier);

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

      // NEW: correctly mapped into the prompt
      listingSection: listingText,
      askingPrice,
      sourceType,
      reportDate,
      calculatedAge,

      imageFindings,
      notes: cleanString(body.notes || ""),
      goal: cleanString(body.goal || ""),
    });

    const response = await client.responses.create({
      model: OPENAI_MODEL,
      instructions: `
You are CarKeeper, a UK-focused vehicle buying decision system.

Rules:
- Never fabricate facts.
- Use only supplied and retrieved data.
- Seller advert text is high-priority evidence.
- Seller-declared faults outweigh tidy photos and historic MOT data.
- If seller wording says spares/repairs, sold as seen, needs work, non-runner, warning light, injector, gearbox, head gasket, project, or trade sale, treat it as a major buyer-decision factor.
- Do not invent technical facts, rarity, engine details, production numbers, or VIN decoding.
- Do not overstate image evidence.
- Do not treat old V5C updates as suspicious unless recent or linked to another concern.
- Use UK terminology and buyer context.
- Be selective, practical, human, and decision-focused.
- Output MUST use multiple "##" headings.
`.trim(),
      input: prompt,
    });

    const reportText = extractOutputText(response);

    if (!reportText || reportText.trim().length < 80) {
      return res.status(502).json({
        success: false,
        error: "OpenAI returned an empty report. Check model/key/prompt size.",
        debug: { durationMs: Date.now() - startedAt, imagesCount: images.length },
      });
    }

    const sections = splitIntoSections(reportText);

    return res.json({
      success: true,
      tier,
      report: reportText,
      sections,
      meta: provided,
      debug: {
        durationMs: Date.now() - startedAt,
        imagesCount: images.length,
        hasListingText: Boolean(listingText),
        askingPrice,
        sourceType,
        reportDate,
        calculatedAge,
      },
    });
  } catch (err) {
    console.error("ROUTE ERROR:", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "Report generation failed",
    });
  }
});

/* -------------------- ALWAYS JSON on unhandled errors -------------------- */

app.use((err, req, res, _next) => {
  console.error("UNHANDLED ERROR:", err);
  res.status(500).json({
    success: false,
    error: err?.message || "Server error",
  });
});

process.on("unhandledRejection", (reason) => console.error("unhandledRejection:", reason));
process.on("uncaughtException", (err) => console.error("uncaughtException:", err));

app.listen(port, () => {
  console.log(`CarKeeper report engine running on port ${port}`);
});
