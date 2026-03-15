require("dotenv").config();

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const axios = require("axios");

const app = express();
const port = process.env.PORT || 4000;

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

const DVSA_API_KEY = process.env.DVSA_API_KEY;
const DVSA_CLIENT_ID = process.env.DVSA_CLIENT_ID;
const DVSA_CLIENT_SECRET = process.env.DVSA_CLIENT_SECRET;
const DVSA_TOKEN_URL = process.env.DVSA_TOKEN_URL;
const DVSA_SCOPE = process.env.DVSA_SCOPE;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

const SYSTEM_PROMPT = `
You are Car History Finder, a UK-focused investigative vehicle history system.

Your job is to generate the most useful, factual, and transparent vehicle history insight report possible from the data supplied.

Core rules:
- Never fabricate details.
- Never pretend to have checked a source that is not actually included in the input.
- Clearly distinguish between:
  1. verified facts
  2. reasonable model-level context
  3. unknown or unavailable information
- If verified MOT data is included in the input, you MUST use it in section 3.
- Never say MOT history is unavailable if verified MOT data has been provided.
- Do not advise the user to go elsewhere for MOT history if MOT history is already supplied in the input.
- Do not claim access to private keeper identities, insurance data, finance data, or accident databases unless such information is explicitly provided.
- Use a precise, investigative, helpful tone.
- Be specific. Avoid vague filler.
- Focus on practical value for a buyer, owner, or enthusiast.

Output style rules:
- Write in clean markdown.
- Use the exact section headings below.
- Use bullet points where helpful.
- When analysing MOT history, identify:
  - earliest and latest visible test records
  - mileage progression
  - repeated advisories
  - failures and what they suggest
  - any obvious anomaly or inconsistency
- If no anomaly is visible, say so clearly.
- If data is incomplete, say so clearly.

Use this exact structure:

# UK Vehicle History Insight Report

## 1) Summary
A concise overview of what is known about the vehicle and the most important findings.

## 2) Identity & Production
Use the supplied registration, VIN, make, model, year, and safe model-level context only.

## 3) Service & Maintenance History
This section MUST use the verified MOT history summary if provided.
Summarise:
- MOT record span
- mileage development
- notable advisories
- failures
- repeated themes
- maintenance implications

## 4) Features & Technical Specs
Only include safe and reasonable model-level information unless exact trim/spec is verified.

## 5) Recalls & Safety
Only discuss known model-level recall context if exact recall data is not supplied.
Be clear about that limitation.

## 6) Rarity & Historical Value
Explain whether the car is common, uncommon, or potentially collectible in broad terms.

## 7) Notable Mentions & Public Presence
Only use actual supplied public mention data. If none is supplied, say none was identified from the data provided.

## 8) Confidence & Limitations
Be explicit about what this report can and cannot confirm.

Final instruction:
The report should feel genuinely helpful to someone researching a real car, not like a generic AI answer.
`;

app.get("/", (req, res) => {
  res.send("CarKeeper report engine is running.");
});

function cleanString(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

async function getDvsaAccessToken() {
  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");
  params.append("client_id", DVSA_CLIENT_ID);
  params.append("client_secret", DVSA_CLIENT_SECRET);
  params.append("scope", DVSA_SCOPE);

  const response = await axios.post(DVSA_TOKEN_URL, params.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });

  return response.data.access_token;
}

function normaliseMotVehicle(motData) {
  if (!motData) return null;

  if (Array.isArray(motData)) {
    return motData[0] || null;
  }

  if (Array.isArray(motData?.vehicles)) {
    return motData.vehicles[0] || null;
  }

  return motData;
}

function normaliseMotTests(vehicle) {
  if (!vehicle) return [];

  if (Array.isArray(vehicle.motTests)) return vehicle.motTests;
  if (Array.isArray(vehicle.tests)) return vehicle.tests;
  if (Array.isArray(vehicle.motTestResult)) return vehicle.motTestResult;

  return [];
}

function extractMotCommentText(comment) {
  if (!comment) return "";

  if (typeof comment === "string") return comment.trim();

  const text = comment.text || comment.comment || "";
  const type = comment.type || comment.commentType || "";

  if (text && type) return `${text} [${type}]`;
  return text || type || "";
}

function summariseMotData(motData) {
  if (!motData) {
    return "No MOT data returned.";
  }

  if (motData.error) {
    return `MOT lookup error: ${motData.error}`;
  }

  const vehicle = normaliseMotVehicle(motData);

  if (!vehicle) {
    return "No MOT vehicle record found.";
  }

  const testsRaw = normaliseMotTests(vehicle);

  if (!testsRaw.length) {
    return "No MOT test records found.";
  }

  const tests = testsRaw.map((test, index) => {
    const date =
      test.completedDate ||
      test.testDate ||
      test.expiryDate ||
      "Unknown date";

    const result =
      test.testResult ||
      test.result ||
      "Unknown result";

    const odometerValue =
      test.odometerValue ||
      test.odometerReading ||
      test.mileage ||
      "Unknown mileage";

    const odometerUnit =
      test.odometerUnit ||
      test.odometerResultType ||
      "mi";

    const commentsArray =
      test.rfrAndComments ||
      test.comments ||
      test.defects ||
      [];

    const comments = Array.isArray(commentsArray)
      ? commentsArray
          .map(extractMotCommentText)
          .filter(Boolean)
      : [];

    return {
      index: index + 1,
      date,
      result,
      odometerValue,
      odometerUnit,
      comments
    };
  });

  const mileagePoints = tests
    .map(t => {
      const numeric = Number(String(t.odometerValue).replace(/[^0-9.]/g, ""));
      return Number.isFinite(numeric) ? numeric : null;
    })
    .filter(v => v !== null);

  const firstTest = tests[tests.length - 1] || tests[0];
  const latestTest = tests[0];

  const allComments = tests.flatMap(t => t.comments);

  const repeatedThemes = {
    tyres: allComments.filter(c => /tyre|tire/i.test(c)).length,
    brakes: allComments.filter(c => /brake|disc|pad|binding/i.test(c)).length,
    suspension: allComments.filter(c => /suspension|shock|strut|spring|arm|bush/i.test(c)).length,
    corrosion: allComments.filter(c => /corrosion|rust|corroded/i.test(c)).length,
    lights: allComments.filter(c => /lamp|light|indicator|headlamp|bulb/i.test(c)).length,
    emissions: allComments.filter(c => /emission|smoke|exhaust|catalytic|dpf/i.test(c)).length,
    steering: allComments.filter(c => /steering|track rod|rack|alignment/i.test(c)).length
  };

  const trendNotes = [];

  if (mileagePoints.length >= 2) {
    const firstMileage = mileagePoints[mileagePoints.length - 1];
    const latestMileage = mileagePoints[0];

    if (latestMileage < firstMileage) {
      trendNotes.push("Possible mileage inconsistency detected: a later test appears to show lower mileage than an earlier test.");
    } else {
      trendNotes.push(`Visible MOT mileage rises from approximately ${firstMileage.toLocaleString()} to ${latestMileage.toLocaleString()}.`);
    }
  }

  const repeatedThemeNotes = Object.entries(repeatedThemes)
    .filter(([, count]) => count >= 2)
    .map(([theme, count]) => `Repeated ${theme}-related items appear ${count} times across the visible MOT history.`);

  const testLines = tests.map(t => {
    const commentsText = t.comments.length
      ? t.comments.map(c => `  - ${c}`).join("\n")
      : "  - None recorded";

    return `Test ${t.index}
Date: ${t.date}
Result: ${t.result}
Mileage: ${t.odometerValue} ${t.odometerUnit}
Comments:
${commentsText}`;
  });

  return `
Vehicle identified in MOT dataset.

Visible MOT record count: ${tests.length}

Earliest visible MOT record:
- Date: ${firstTest?.date || "Unknown"}
- Result: ${firstTest?.result || "Unknown"}
- Mileage: ${firstTest?.odometerValue || "Unknown"} ${firstTest?.odometerUnit || ""}

Latest visible MOT record:
- Date: ${latestTest?.date || "Unknown"}
- Result: ${latestTest?.result || "Unknown"}
- Mileage: ${latestTest?.odometerValue || "Unknown"} ${latestTest?.odometerUnit || ""}

Trend notes:
${trendNotes.length ? trendNotes.map(t => `- ${t}`).join("\n") : "- No clear mileage trend note could be extracted from the available data."}

Repeated theme notes:
${repeatedThemeNotes.length ? repeatedThemeNotes.map(t => `- ${t}`).join("\n") : "- No repeated advisory/failure theme stood out strongly from the visible MOT comments."}

Detailed visible MOT entries:
${testLines.join("\n-----------------\n")}
`.trim();
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

    if (!registration && !vin && !(make && model)) {
      return res.status(400).json({
        success: false,
        error: "Please provide a registration, VIN, or make and model."
      });
    }

    let motData = null;
    let motSummary = "MOT data was not requested or was unavailable.";

    if (
      registration &&
      DVSA_API_KEY &&
      DVSA_CLIENT_ID &&
      DVSA_CLIENT_SECRET &&
      DVSA_TOKEN_URL &&
      DVSA_SCOPE
    ) {
      try {
        const accessToken = await getDvsaAccessToken();

        const motResponse = await axios.get(
          `https://history.mot.api.gov.uk/v1/trade/vehicles/registration/${encodeURIComponent(registration)}`,
          {
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "X-API-Key": DVSA_API_KEY,
              "Accept": "application/json"
            }
          }
        );

        motData = motResponse.data;
        console.log("MOT DATA:", JSON.stringify(motData, null, 2));

        motSummary = summariseMotData(motData);
        console.log("MOT SUMMARY:", motSummary);
      } catch (motError) {
        console.error("MOT lookup failed:", motError.response?.data || motError.message);
        motData = { error: "MOT data unavailable" };
        motSummary = summariseMotData(motData);
      }
    } else {
      motData = { error: "DVSA credentials incomplete" };
      motSummary = summariseMotData(motData);
    }

    const userInput = `
Vehicle investigation request

Registration: ${registration || "Not provided"}
VIN: ${vin || "Not provided"}
Make: ${make || "Not provided"}
Model: ${model || "Not provided"}
Year: ${year || "Not provided"}

IMPORTANT:
Verified MOT history data from the DVSA MOT API is provided below.
You MUST use this in section 3: Service & Maintenance History.
Do NOT say MOT history is unavailable if a summary is included below.
Do NOT tell the user to go elsewhere for MOT history if it is already included below.

VERIFIED MOT HISTORY SUMMARY:
${motSummary}

Additional instructions:
- Make the report specific to this vehicle where the input allows.
- If exact trim, engine, or recall status cannot be confirmed from the supplied data, say so clearly.
- Use the MOT summary as the main evidence base for maintenance commentary.
- Identify any obvious patterns such as repeated advisories, likely wear items, or gaps in visible testing history.
- If the vehicle appears ordinary rather than rare, say that plainly.
- Keep the report practical and useful.
`.trim();

    const response = await client.responses.create({
      model: OPENAI_MODEL,
      instructions: SYSTEM_PROMPT,
      input: userInput
    });

    res.json({
      success: true,
      report: response.output_text,
      motSummary,
      motData
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