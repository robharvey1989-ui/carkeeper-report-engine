const axios = require("axios");

const DVSA_API_KEY = process.env.DVSA_API_KEY;
const DVSA_CLIENT_ID = process.env.DVSA_CLIENT_ID;
const DVSA_CLIENT_SECRET = process.env.DVSA_CLIENT_SECRET;
const DVSA_TOKEN_URL = process.env.DVSA_TOKEN_URL;
const DVSA_SCOPE = process.env.DVSA_SCOPE;

async function getDvsaAccessToken() {
  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");
  params.append("client_id", DVSA_CLIENT_ID);
  params.append("client_secret", DVSA_CLIENT_SECRET);
  params.append("scope", DVSA_SCOPE);

  const response = await axios.post(DVSA_TOKEN_URL, params.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
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

async function fetchMotData(registration) {
  if (
    !registration ||
    !DVSA_API_KEY ||
    !DVSA_CLIENT_ID ||
    !DVSA_CLIENT_SECRET ||
    !DVSA_TOKEN_URL ||
    !DVSA_SCOPE
  ) {
    return { error: "DVSA credentials incomplete or registration missing" };
  }

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

    return motResponse.data;
  } catch (motError) {
    console.error("MOT lookup failed:", {
      message: motError.message,
      status: motError.response?.status || null,
      data: motError.response?.data || null
    });

    return { error: "MOT data unavailable" };
  }
}

function buildMotSection(motData) {
  if (!motData) {
    return `## 3) MOT & Condition Pattern Analysis
No MOT data was returned for this lookup.`;
  }

  if (motData.error) {
    return `## 3) MOT & Condition Pattern Analysis
MOT data could not be retrieved for this lookup.
Reason: ${motData.error}`;
  }

  const vehicle = normaliseMotVehicle(motData);
  if (!vehicle) {
    return `## 3) MOT & Condition Pattern Analysis
No MOT vehicle record was found.`;
  }

  const testsRaw = normaliseMotTests(vehicle);
  if (!testsRaw.length) {
    return `## 3) MOT & Condition Pattern Analysis
No visible MOT test records were found in the returned DVSA data.`;
  }

  const tests = testsRaw.map((test) => {
    const date = test.completedDate || test.testDate || test.expiryDate || "Unknown date";
    const result = test.testResult || test.result || "Unknown result";
    const mileageRaw = test.odometerValue || test.odometerReading || test.mileage || "Unknown mileage";
    const mileage = Number(String(mileageRaw).replace(/[^0-9.]/g, ""));
    const mileageDisplay = Number.isFinite(mileage) ? mileage.toLocaleString() : String(mileageRaw);
    const unit = test.odometerUnit || test.odometerResultType || "mi";

    const commentsArray = test.rfrAndComments || test.comments || test.defects || [];
    const comments = Array.isArray(commentsArray)
      ? commentsArray.map(extractMotCommentText).filter(Boolean)
      : [];

    return {
      date,
      result,
      mileage,
      mileageDisplay,
      unit,
      comments
    };
  });

  const latestVisible = tests[0];
  const earliestVisible = tests[tests.length - 1];

  const passCount = tests.filter(t => String(t.result).toUpperCase().includes("PASS")).length;
  const failCount = tests.filter(t => String(t.result).toUpperCase().includes("FAIL")).length;

  const recurringCommentMap = {};
  tests.forEach((t) => {
    t.comments.forEach((c) => {
      const key = c.toLowerCase();
      recurringCommentMap[key] = (recurringCommentMap[key] || 0) + 1;
    });
  });

  const recurringIssues = Object.entries(recurringCommentMap)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([text, count]) => `- ${text} (appears ${count} times)`);

  const latestComments = latestVisible.comments.length
    ? latestVisible.comments.map(c => `- ${c}`).join("\n")
    : "- None recorded";

  return `## 3) MOT & Condition Pattern Analysis
The following section is based on verified DVSA MOT history returned for this registration.

- Visible MOT record count: ${tests.length}
- Pass count in visible history: ${passCount}
- Fail count in visible history: ${failCount}
- Earliest visible MOT entry: ${earliestVisible.date} (${earliestVisible.result}, ${earliestVisible.mileageDisplay} ${earliestVisible.unit})
- Latest visible MOT entry: ${latestVisible.date} (${latestVisible.result}, ${latestVisible.mileageDisplay} ${latestVisible.unit})

### Latest recorded comments
${latestComments}

### Recurring visible themes
${recurringIssues.length ? recurringIssues.join("\n") : "- No obvious repeated comment pattern identified in the visible records."}

### Visible MOT history summary
${tests.slice(0, 8).map((t, i) => {
  const commentsText = t.comments.length
    ? t.comments.map(c => `  - ${c}`).join("\n")
    : "  - None recorded";

  return `${i + 1}. ${t.date} | ${t.result} | ${t.mileageDisplay} ${t.unit}
${commentsText}`;
}).join("\n\n")}`;
}

module.exports = { fetchMotData, buildMotSection };
