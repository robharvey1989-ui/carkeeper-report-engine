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
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json({ limit: "1mb" }));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get("/", (req, res) => {
  res.send("CarKeeper report engine is running.");
});

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

    if (!registration && !vin && !(make && model)) {
      return res.status(400).json({
        success: false,
        error: "Please provide a registration, VIN, or make and model."
      });
    }

    const provided = { registration, vin, make, model, year };

    const [dvlaData, motData, searchSummary] = await Promise.all([
      fetchDvlaData(registration),
      fetchMotData(registration),
      searchVehicleWebPresence({ registration, make, model, year })
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
      webSection
    });

    const response = await client.responses.create({
      model: OPENAI_MODEL,
      instructions: "You are Car History Finder, a UK-focused vehicle investigation assistant. Never fabricate facts. Use only supplied data. Unknowns must be stated clearly.",
      input: prompt
    });

    res.json({
      success: true,
      tier,
      report: response.output_text,
      identitySection,
      motSection,
      webSection,
      dvlaData,
      motData,
      searchSummary
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