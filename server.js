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

app.use(cors({
  origin: [
    "https://carkeeper.uk",
    "https://www.carkeeper.uk",
    "http://localhost:4000",
    "http://localhost:3000"
  ],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "x-dvla-api-key"]
}));

app.use(express.json({ limit: "5mb" }));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get("/", (req, res) => {
  res.send("CarKeeper report engine is running.");
});

async function analyseVehicleImage(imageUrl) {
  if (!imageUrl) {
    return "No image was supplied, so no image-based observations could be made.";
  }

  try {
    const response = await client.responses.create({
      model: OPENAI_MODEL,
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
- Mention if the image quality, angle, lighting, or distance limits certainty.
- Do not identify exact trim/version unless it is clearly visible.

Return short structured findings under these headings:
## Visible Condition
## Identity / Spec Clues
## Possible Issues or Questions
## Confidence Notes
              `.trim()
            },
            {
              type: "input_image",
              image_url: imageUrl,
              detail: "high"
            }
          ]
        }
      ]
    });

    return response.output_text || "Image was supplied but no image findings were returned.";
  } catch (error) {
    console.error("Image analysis failed:", error.message);
    return "Image was supplied, but image analysis could not be completed.";
  }
}

function splitIntoSections(text) {
  const lines = String(text || "").split("\n");
  const sections = [];
  let current = { title: "Overview", content: "" };

  const push = () => {
    if ((current.title && current.title.trim()) || (current.content && current.content.trim())) {
      sections.push({
        title: current.title.trim() || "Section",
        content: current.content.trim()
      });
    }
  };

  for (const line of lines) {
    if (line.startsWith("## ")) {
      push();
      current = {
        title: line.replace(/^##\s+/, "").trim(),
        content: ""
      };
    } else {
      current.content += line + "\n";
    }
  }

  push();
  return sections;
}

app.post("/generate-report", async (req, res) => {
  try {
    console.log("REQ BODY:", req.body);

    const body = req.body || {};
    const registration = cleanString(body.registration);
    const vin = cleanString(body.vin);
    const make = cleanString(body.make);
    const model = cleanString(body.model);
    const year = cleanString(body.year);
    const tier = normaliseTier(body.tier);
    const imageUrl = cleanString(body.image_url);
    const notes = cleanString(body.notes);
    const goal = cleanString(body.goal);
    const followup_q1 = cleanString(body.followup_q1);
    const followup_q2 = cleanString(body.followup_q2);

    if (!registration && !vin && !(make && model)) {
      return res.status(400).json({
        success: false,
        error: "Please provide a registration, VIN, or make and model."
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
      image_url: imageUrl
    };

    const forwardedDvlaKey = req.headers["x-dvla-api-key"] || "";

    console.log("DVLA DEBUG:", {
      hasForwardedDvlaKey: !!forwardedDvlaKey,
      hasEnvDvlaKey: !!process.env.DVLA_API_KEY,
      registration
    });

    const [dvlaData, motData, searchSummary, imageFindings] = await Promise.all([
      fetchDvlaData(registration, forwardedDvlaKey),
      fetchMotData(registration),
      searchVehicleWebPresence({ registration, make, model, year }),
      analyseVehicleImage(imageUrl)
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
      imageFindings,
      notes,
      goal,
      followup_q1,
      followup_q2
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
      `.trim(),
      input: prompt
    });

    const reportText = response.output_text || "";
    const sections = splitIntoSections(reportText);

    res.json({
      success: true,
      tier,
      report: reportText,
      sections,
      identitySection,
      motSection,
      webSection,
      imageFindings,
      dvlaData,
      motData,
      searchSummary,
      debug: {
        dvlaHasForwardedKey: !!forwardedDvlaKey,
        dvlaHasEnvKey: !!process.env.DVLA_API_KEY,
        imageUsed: !!imageUrl
      }
    });
  } catch (error) {
    console.error("FULL ERROR:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Report generation failed"
    });
  }
});

app.listen(port, () => {
  console.log(`CarKeeper report engine running at http://localhost:${port}`);
});
