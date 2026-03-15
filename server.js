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

Your task is to write a practical, detailed, and transparent vehicle history report.

Rules:
- Never fabricate facts.
- Use only the supplied data.
- If something is unknown, say so clearly.
- Do not claim the user needs to check MOT history elsewhere if a completed MOT section is already provided.
- Treat the supplied MOT section as verified factual content and preserve its substance.
- The report should be helpful to a buyer, owner, or enthusiast.
- Avoid generic filler and empty disclaimers.

Return the report in clean markdown using these exact headings:

# UK Vehicle History Insight Report

## 1) Summary
## 2) Identity & Production
## 3) Service & Maintenance History
## 4) Features & Technical Specs
## 5) Recalls & Safety
## 6) Rarity & Historical Value
## 7) Notable Mentions & Public Presence
## 8) Confidence & Limitations
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
  if (Array.isArray(motData)) return motData[0] || null;
  if (Array.isArray(motData?.vehicles)) return motData.vehicles[0] || null;
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

function buildMotSection(motData) {
  if (!motData) {
    return `## 3) Service & Maintenance History

No MOT data was returned for this lookup.`;
  }

  if (motData.error) {
    return `## 3) Service & Maintenance History

MOT data could not be retrieved for this lookup.

Reason: ${motData.error}`;
  }

  const vehicle = normaliseMotVehicle(motData);
  if (!vehicle) {
    return `## 3) Service & Maintenance History

No MOT vehicle record was found.`;
  }

  const testsRaw = normaliseMotTests(vehicle);
  if (!testsRaw.length) {
    return `## 3) Service & Maintenance History

No visible MOT test records were found in the returned DVSA data.`;
  }

  const tests = testsRaw.map((test) => {
    const date =
      test.completedDate ||
      test.testDate ||
      test.expiryDate ||
      "Unknown date";

    const result =
      test.testResult ||
      test.result ||
      "Unknown result";

    const mileageRaw =
      test.odometerValue ||
      test.odometerReading ||
      test.mileage ||
      "Unknown mileage";

    const mileage = Number(String(mileageRaw).replace(/[^0-9.]/g, ""));
    const mileageDisplay = Number.isFinite(mileage)
      ? mileage.toLocaleString()
      : String(mileageRaw);

    const unit =
      test.odometerUnit ||
      test.odometerResultType ||
      "mi";

    const commentsArray =
      test.rfrAndComments ||
      test.comments ||
      test.defects ||
      [];

    const comments = Array.isArray(commentsArray)
      ? commentsArray.map(extractMotCommentText).filter(Boolean)
      : [];

    return {
      date,
      result,
      mileage: Number.isFinite(mileage) ? mileage : null,
      mileageDisplay,
      unit,
      comments
    };
  });

  const firstVisible = tests[tests.length - 1];
  const latestVisible = tests[0];

  const mileageValues = tests
    .map(t => t.mileage)
    .filter(v => v !== null);

  let mileageLine = "- Mileage trend could not be confidently established from the returned data.";
  if (mileageValues.length >= 2) {
    const firstMileage = mileageValues[mileageValues.length - 1];
    const latestMileage = mileageValues[0];

    if (latestMileage >= firstMileage) {
      mileageLine = `- Visible mileage rises from approximately ${firstMileage.toLocaleString()} to ${latestMileage.toLocaleString()}.`;
    } else {
      mileageLine = `- Possible mileage inconsistency: a later visible MOT entry appears lower than an earlier one (${latestMileage.toLocaleString()} vs ${firstMileage.toLocaleString()}).`;
    }
  }

  const allComments = tests.flatMap(t => t.comments);

  const themeCounts = {
    tyres: allComments.filter(c => /tyre|tire/i.test(c)).length,
    brakes: allComments.filter(c => /brake|pad|disc/i.test(c)).length,
    suspension: allComments.filter(c => /suspension|spring|shock|strut|bush|arm/i.test(c)).length,
    corrosion: allComments.filter(c => /corrosion|rust|corroded/i.test(c)).length,
    lights: allComments.filter(c => /lamp|light|bulb|indicator|headlamp/i.test(c)).length,
    emissions: allComments.filter(c => /emission|smoke|exhaust|dpf|catalytic/i.test(c)).length,
    steering: allComments.filter(c => /steering|track rod|rack/i.test(c)).length
  };

  const repeatedThemes = Object.entries(themeCounts)
    .filter(([, count]) => count >= 2)
    .map(([theme, count]) => `- Repeated ${theme}-related observations appear ${count} times across the visible MOT history.`);

  const failures = tests.filter(t => /fail/i.test(t.result));
  const advisories = tests.filter(t => t.comments.length > 0);

  const testBreakdown = tests.slice(0, 8).map((t, i) => {
    const commentsText = t.comments.length
      ? t.comments.map(c => `  - ${c}`).join("\n")
      : "  - None recorded";

    return `### MOT Record ${i + 1}
- Date: ${t.date}
- Result: ${t.result}
- Mileage: ${t.mileageDisplay} ${t.unit}
- Comments:
${commentsText}`;
  }).join("\n\n");

  return `## 3) Service & Maintenance History

The following section is based on verified DVSA MOT history returned for this registration.

- Visible MOT record count: ${tests.length}
- Earliest visible MOT entry: ${firstVisible.date} (${firstVisible.result}, ${firstVisible.mileageDisplay} ${firstVisible.unit})
- Latest visible MOT entry: ${latestVisible.date} (${latestVisible.result}, ${latestVisible.mileageDisplay} ${latestVisible.unit})
${mileageLine}

${failures.length ? `- Visible failed MOT entries: ${failures.length}.` : "- No failed MOT entries are visible in the returned records."}
${advisories.length ? `- MOT entries containing comments/advisories/failure items: ${advisories.length}.` : "- No advisory or comment items are visible in the returned records."}

${repeatedThemes.length ? repeatedThemes.join("\n") : "- No strongly repeated maintenance theme stood out from the visible MOT comments."}

### Practical interpretation
- MOT history is useful for spotting visible wear patterns, recurring issues, and mileage development over time.
- MOT history does not replace a full service file, but repeated advisories can indicate areas that deserve closer inspection.
- Where failures or repeated advisories appear, these may point to recurring maintenance needs rather than one-off items.

### Visible MOT record breakdown
${testBreakdown}`;
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
      } catch (motError) {
        console.error("MOT lookup failed:", motError.response?.data || motError.message);
        motData = { error: "MOT data unavailable" };
      }
    } else {
      motData = { error: "DVSA credentials incomplete" };
    }

    const motSection = buildMotSection(motData);
    console.log("MOT SECTION:", motSection);

    const userInput = `
Write a detailed UK vehicle history insight report for this vehicle.

Vehicle details:
- Registration: ${registration || "Not provided"}
- VIN: ${vin || "Not provided"}
- Make: ${make || "Not provided"}
- Model: ${model || "Not provided"}
- Year: ${year || "Not provided"}

IMPORTANT:
A completed factual section for "## 3) Service & Maintenance History" is provided below.
You must preserve and use it.
Do not replace it with generic advice.
Do not say MOT history is unavailable if this section contains MOT history.
Do not direct the user elsewhere for MOT history.

PREBUILT FACTUAL SECTION:
${motSection}

Requirements for the rest of the report:
- Section 1 should summarise the most important findings.
- Section 2 should explain identity and production carefully using only safe information from the supplied vehicle details.
- Section 4 should give practical model-level technical context without pretending exact trim/engine is confirmed unless it truly is.
- Section 5 should explain safety/recall context carefully and transparently.
- Section 6 should be honest about rarity and historical value.
- Section 7 should say no notable public presence has been identified unless supplied data proves otherwise.
- Section 8 should be clear and useful, not repetitive.

IMPORTANT:
Return the full report with all eight sections.
For section 3, use the prebuilt factual section exactly in substance and do not contradict it.
`.trim();

    const response = await client.responses.create({
      model: OPENAI_MODEL,
      instructions: SYSTEM_PROMPT,
      input: userInput
    });

    res.json({
      success: true,
      report: response.output_text,
      motSection,
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