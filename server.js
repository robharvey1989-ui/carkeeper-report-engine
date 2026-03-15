require("dotenv").config();

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `
You are Car History Finder, a UK-focused investigative system designed to generate factual vehicle history insight reports.

Rules:
- Never fabricate details.
- Clearly distinguish between verified information and unknown information.
- If vehicle-specific data cannot be confirmed, explain what should be checked.
- Do not claim access to private keeper data or paid databases.
- Maintain an investigative, professional tone.

Report structure:

1) Summary
2) Identity & Production
3) Service & Maintenance History
4) Features & Technical Specs
5) Recalls & Safety
6) Rarity & Historical Value
7) Notable Mentions & Public Presence
8) Confidence & Limitations
`;

app.get("/", (req, res) => {
  res.send("CarKeeper report engine is running.");
});

app.post("/generate-report", async (req, res) => {
  try {
    console.log("REQ BODY:", req.body);

    const body = req.body || {};
    const { registration, vin, make, model, year } = body;

    if (!registration && !vin && !(make && model)) {
      return res.status(400).json({
        success: false,
        error: "Please provide a registration, VIN, or make and model."
      });
    }

    const userInput = `
Vehicle investigation request:

Registration: ${registration || "Not provided"}
VIN: ${vin || "Not provided"}
Make: ${make || "Not provided"}
Model: ${model || "Not provided"}
Year: ${year || "Not provided"}

Generate a UK vehicle history insight report based on these details.
If exact data is unavailable, explain what should be verified.
`;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      instructions: SYSTEM_PROMPT,
      input: userInput
    });

    res.json({
      success: true,
      report: response.output_text
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