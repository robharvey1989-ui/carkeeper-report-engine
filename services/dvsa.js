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

function clean(value) {
  if (value === null || value === undefined || value === "") return "Unknown";
  return String(value).trim();
}

function parseMileageValue(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMileage(value) {
  return Number.isFinite(value) ? value.toLocaleString() : "Unknown";
}

function parseDateValue(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysBetween(a, b) {
  if (!(a instanceof Date) || !(b instanceof Date)) return null;
  const diffMs = Math.abs(b.getTime() - a.getTime());
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function classifyCommentTheme(text) {
  const t = String(text || "").toLowerCase();

  if (/tyre|tire/.test(t)) return "Tyres";
  if (/brake|disc|pad|binding/.test(t)) return "Brakes";
  if (/suspension|shock|strut|spring|damper/.test(t)) return "Suspension";
  if (/corrosion|rust|corroded/.test(t)) return "Corrosion";
  if (/oil leak|fluid leak|leak/.test(t)) return "Leaks";
  if (/steering|track rod|rack|power steering/.test(t)) return "Steering";
  if (/exhaust|emission|smoke|catalyst|dpf/.test(t)) return "Emissions / Exhaust";
  if (/lamp|light|headlamp|rear lamp|indicator|fog lamp/.test(t)) return "Lights / Electrical";
  if (/seat belt|airbag|srs/.test(t)) return "Safety Systems";
  if (/windscreen|wiper|washer|screen/.test(t)) return "Glass / Wipers";
  if (/wheel bearing|bearing/.test(t)) return "Wheel Bearings";
  if (/undertray|body|panel|structure|subframe|chassis/.test(t)) return "Body / Structure";

  return "General Wear / Other";
}

function buildMileageAnalysis(tests) {
  const valid = tests
    .filter((t) => Number.isFinite(t.mileage))
    .map((t) => ({
      dateObj: t.dateObj,
      mileage: t.mileage,
      result: t.result,
      date: t.date
    }))
    .filter((t) => t.dateObj instanceof Date)
    .sort((a, b) => a.dateObj - b.dateObj);

  if (valid.length < 2) {
    return {
      summary: "- Mileage trend confidence is limited because too few valid dated MOT mileage entries were available.",
      warnings: [],
      annualised: null
    };
  }

  const first = valid[0];
  const last = valid[valid.length - 1];
  const totalMiles = last.mileage - first.mileage;
  const totalDays = daysBetween(first.dateObj, last.dateObj);
  const annualised =
    totalDays && totalDays > 0 ? Math.round((totalMiles / totalDays) * 365) : null;

  const warnings = [];

  for (let i = 1; i < valid.length; i++) {
    const prev = valid[i - 1];
    const curr = valid[i];
    const deltaMiles = curr.mileage - prev.mileage;
    const deltaDays = daysBetween(prev.dateObj, curr.dateObj);

    if (deltaMiles < 0) {
      warnings.push(
        `- Mileage anomaly: recorded mileage appears to decrease between ${prev.date} and ${curr.date}.`
      );
    }

    if (deltaDays && deltaDays > 0) {
      const perYear = Math.round((deltaMiles / deltaDays) * 365);

      if (deltaMiles >= 0 && perYear > 30000) {
        warnings.push(
          `- Usage intensity: mileage increase between ${prev.date} and ${curr.date} suggests very high annualised use (around ${perYear.toLocaleString()} miles/year).`
        );
      }

      if (deltaMiles >= 0 && perYear < 1000) {
        warnings.push(
          `- Low-use interval: mileage increase between ${prev.date} and ${curr.date} was unusually low, which may be innocent but can justify checking storage, inactivity, or documentation consistency.`
        );
      }
    }
  }

  let summary = `- Earliest valid MOT mileage: ${formatMileage(first.mileage)}.
- Latest valid MOT mileage: ${formatMileage(last.mileage)}.
- Visible mileage change across dated MOT history: ${formatMileage(totalMiles)} miles.`;

  if (annualised !== null && totalMiles >= 0) {
    summary += `\n- Broad annualised usage across visible MOT history: about ${annualised.toLocaleString()} miles/year.`;
  }

  if (totalMiles < 0) {
    summary += `\n- Overall mileage direction is inconsistent and should be investigated carefully.`;
  }

  return { summary, warnings, annualised };
}

function buildCommentThemeSummary(tests) {
  const themeCounts = {};
  const recurringCommentMap = {};

  tests.forEach((t) => {
    t.comments.forEach((comment) => {
      const rawKey = String(comment || "").trim().toLowerCase();
      if (!rawKey) return;

      recurringCommentMap[rawKey] = (recurringCommentMap[rawKey] || 0) + 1;

      const theme = classifyCommentTheme(comment);
      themeCounts[theme] = (themeCounts[theme] || 0) + 1;
    });
  });

  const topThemes = Object.entries(themeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([theme, count]) => `- ${theme}: ${count} mention${count === 1 ? "" : "s"} across visible records.`);

  const recurringIssues = Object.entries(recurringCommentMap)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([text, count]) => `- ${text} (appears ${count} times)`);

  return {
    topThemes,
    recurringIssues
  };
}

function buildResultPatternSummary(tests) {
  const passCount = tests.filter((t) => String(t.result).toUpperCase().includes("PASS")).length;
  const failCount = tests.filter((t) => String(t.result).toUpperCase().includes("FAIL")).length;

  const latest = tests[0];
  const earliest = tests[tests.length - 1];

  const summary = [
    `- Visible MOT record count: ${tests.length}.`,
    `- Pass count in visible history: ${passCount}.`,
    `- Fail count in visible history: ${failCount}.`,
    `- Earliest visible MOT entry: ${earliest.date} (${earliest.result}, ${earliest.mileageDisplay} ${earliest.unit}).`,
    `- Latest visible MOT entry: ${latest.date} (${latest.result}, ${latest.mileageDisplay} ${latest.unit}).`
  ];

  if (failCount > 0 && passCount > 0) {
    summary.push("- Test history includes both passes and failures, which is normal, but the reasons for failures matter more than the raw count.");
  } else if (failCount === 0) {
    summary.push("- No visible failures appear in the returned MOT history. That is positive, but advisory content still matters.");
  }

  return {
    passCount,
    failCount,
    latest,
    earliest,
    summary: summary.join("\n")
  };
}

function buildConditionSignals(tests, themeSummary) {
  const notes = [];

  if (themeSummary.topThemes.some((t) => t.toLowerCase().includes("tyres"))) {
    notes.push("- Tyre-related mentions can indicate routine wear, but repeated tyre advisories may also justify checking alignment, suspension condition, and general maintenance standards.");
  }

  if (themeSummary.topThemes.some((t) => t.toLowerCase().includes("brakes"))) {
    notes.push("- Brake-related MOT comments can be normal wear items, but recurring brake observations may suggest deferred maintenance or repeated short-term fixes.");
  }

  if (themeSummary.topThemes.some((t) => t.toLowerCase().includes("suspension"))) {
    notes.push("- Suspension-related entries are worth taking seriously because they can affect ride quality, tyre wear, handling, and overall upkeep costs.");
  }

  if (themeSummary.topThemes.some((t) => t.toLowerCase().includes("corrosion"))) {
    notes.push("- Corrosion-related MOT comments deserve careful physical inspection, especially underneath the vehicle, because corrosion severity can change meaningfully over time.");
  }

  if (themeSummary.topThemes.some((t) => t.toLowerCase().includes("emissions / exhaust"))) {
    notes.push("- Emissions or exhaust-related comments can matter financially because they may lead to more expensive repairs than routine wear items.");
  }

  const latestCommentsCount = tests[0]?.comments?.length || 0;
  if (latestCommentsCount === 0) {
    notes.push("- No comments were recorded on the latest visible test entry, which is generally a better sign than a long advisory list, though it does not prove absence of wear.");
  } else {
    notes.push("- The latest visible test still contains comments/advisories, so those specific areas should be checked carefully in person.");
  }

  return notes.length ? notes.join("\n") : "- No strong condition signals could be inferred beyond the raw MOT history.";
}

function buildMotTimeline(tests) {
  return tests.slice(0, 8).map((t, i) => {
    const commentsText = t.comments.length
      ? t.comments.map((c) => `  - ${c}`).join("\n")
      : "  - None recorded";

    return `${i + 1}. ${t.date} | ${t.result} | ${t.mileageDisplay} ${t.unit}
${commentsText}`;
  }).join("\n\n");
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
### Evidence Status
- No MOT data was returned for this lookup.

### Limitations
- No MOT-based condition pattern analysis could be completed.`;
  }

  if (motData.error) {
    return `## 3) MOT & Condition Pattern Analysis
### Evidence Status
- MOT data could not be retrieved for this lookup.
- Reason: ${motData.error}

### Limitations
- No MOT-based condition pattern analysis could be completed from DVSA history.`;
  }

  const vehicle = normaliseMotVehicle(motData);
  if (!vehicle) {
    return `## 3) MOT & Condition Pattern Analysis
### Evidence Status
- No MOT vehicle record was found.

### Limitations
- No visible MOT history was available to analyse.`;
  }

  const testsRaw = normaliseMotTests(vehicle);
  if (!testsRaw.length) {
    return `## 3) MOT & Condition Pattern Analysis
### Evidence Status
- No visible MOT test records were found in the returned DVSA data.

### Limitations
- No MOT pattern analysis could be produced from the returned record.`;
  }

  const tests = testsRaw.map((test) => {
    const date = clean(test.completedDate || test.testDate || test.expiryDate || "Unknown date");
    const dateObj = parseDateValue(test.completedDate || test.testDate || test.expiryDate || null);
    const result = clean(test.testResult || test.result || "Unknown result");
    const mileageRaw = test.odometerValue || test.odometerReading || test.mileage || null;
    const mileage = parseMileageValue(mileageRaw);
    const mileageDisplay = Number.isFinite(mileage) ? mileage.toLocaleString() : clean(mileageRaw);
    const unit = clean(test.odometerUnit || test.odometerResultType || "mi");

    const commentsArray = test.rfrAndComments || test.comments || test.defects || [];
    const comments = Array.isArray(commentsArray)
      ? commentsArray.map(extractMotCommentText).filter(Boolean)
      : [];

    return {
      date,
      dateObj,
      result,
      mileage,
      mileageDisplay,
      unit,
      comments
    };
  });

  const resultSummary = buildResultPatternSummary(tests);
  const mileageAnalysis = buildMileageAnalysis(tests);
  const themeSummary = buildCommentThemeSummary(tests);
  const conditionSignals = buildConditionSignals(tests, themeSummary);

  const latestComments = resultSummary.latest.comments.length
    ? resultSummary.latest.comments.map((c) => `- ${c}`).join("\n")
    : "- None recorded";

  const mileageWarnings = mileageAnalysis.warnings.length
    ? mileageAnalysis.warnings.join("\n")
    : "- No obvious mileage anomaly is visible in the returned MOT history, although hidden issues cannot be ruled out.";

  const recurringIssues = themeSummary.recurringIssues.length
    ? themeSummary.recurringIssues.join("\n")
    : "- No obvious repeated comment pattern was identified in the visible records.";

  const topThemes = themeSummary.topThemes.length
    ? themeSummary.topThemes.join("\n")
    : "- No strong theme concentration was identified in the visible comments.";

  return `## 3) MOT & Condition Pattern Analysis
### MOT History Overview
${resultSummary.summary}

### Mileage Pattern & Usage Signals
${mileageAnalysis.summary}
${mileageWarnings}

### Latest Recorded Comments
${latestComments}

### Recurring Advisory / Defect Themes
${recurringIssues}

### Main Condition Themes in Visible History
${topThemes}

### Practical Condition Interpretation
${conditionSignals}

### Visible MOT History Summary
${buildMotTimeline(tests)}

### Limitations
- MOT history is useful for pattern recognition, mileage sense-checking, and visible advisory themes.
- It does not prove full service quality, hidden mechanical condition, or work completed between tests.`;
}

module.exports = { fetchMotData, buildMotSection };
