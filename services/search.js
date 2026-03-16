const axios = require("axios");

const SERPAPI_KEY = process.env.SERPAPI_KEY;

function looksLikeListing(title = "", link = "", snippet = "") {
  const text = `${title} ${link} ${snippet}`.toLowerCase();

  return [
    "autotrader",
    "carandclassic",
    "collectingcars",
    "ebay",
    "pistonheads",
    "gumtree",
    "motors.co.uk",
    "exchangeandmart",
    "historics",
    "bonhams",
    "iconic auctioneers",
    "classiccarsforsale",
    "classic trader"
  ].some(term => text.includes(term));
}

function looksLikeForum(title = "", link = "", snippet = "") {
  const text = `${title} ${link} ${snippet}`.toLowerCase();

  return [
    "forum",
    "club",
    "owners club",
    "discussion",
    "thread",
    "reddit",
    "pistonheads"
  ].some(term => text.includes(term));
}

function looksLikeMedia(title = "", link = "", snippet = "") {
  const text = `${title} ${link} ${snippet}`.toLowerCase();

  return [
    "news",
    "article",
    "press",
    "magazine",
    "review",
    "media",
    "blog"
  ].some(term => text.includes(term));
}

async function runSerpApiQuery(query) {
  if (!SERPAPI_KEY) {
    return {
      query,
      error: "SERPAPI key missing",
      organic_results: []
    };
  }

  try {
    const response = await axios.get("https://serpapi.com/search.json", {
      params: {
        engine: "google",
        q: query,
        api_key: SERPAPI_KEY,
        num: 10,
        gl: "uk",
        hl: "en"
      }
    });

    return {
      query,
      organic_results: response.data.organic_results || []
    };
  } catch (error) {
    console.error("SerpAPI search failed:", error.response?.data || error.message);

    return {
      query,
      error: "Search unavailable",
      organic_results: []
    };
  }
}

function summariseSearchResults(results) {
  if (!results || !results.length) {
    return {
      summaryText: "No public web search results were returned.",
      findings: [],
      categories: {
        listings: [],
        forums: [],
        media: [],
        other: []
      }
    };
  }

  const allOrganic = results.flatMap(r =>
    (r.organic_results || []).map(item => ({
      query: r.query,
      title: item.title || "",
      link: item.link || "",
      snippet: item.snippet || ""
    }))
  );

  const uniqueResults = [];
  const seenLinks = new Set();

  for (const item of allOrganic) {
    if (!item.link) continue;
    if (seenLinks.has(item.link)) continue;
    seenLinks.add(item.link);
    uniqueResults.push(item);
  }

  const categories = {
    listings: [],
    forums: [],
    media: [],
    other: []
  };

  for (const item of uniqueResults) {
    if (looksLikeListing(item.title, item.link, item.snippet)) {
      categories.listings.push(item);
    } else if (looksLikeForum(item.title, item.link, item.snippet)) {
      categories.forums.push(item);
    } else if (looksLikeMedia(item.title, item.link, item.snippet)) {
      categories.media.push(item);
    } else {
      categories.other.push(item);
    }
  }

  const findings = uniqueResults.slice(0, 8).map(item => {
    return `- ${item.title}\n  ${item.link}\n  ${item.snippet || "No snippet available."}`;
  });

  const summaryLines = [
    `Total unique public web results reviewed: ${uniqueResults.length}`,
    `Likely listings/auction/classified results: ${categories.listings.length}`,
    `Likely forum/community results: ${categories.forums.length}`,
    `Likely media/editorial results: ${categories.media.length}`
  ];

  return {
    summaryText: summaryLines.join("\n"),
    findings,
    categories
  };
}

async function searchVehicleWebPresence({ registration, make, model, year }) {
  const cleanReg = (registration || "").replace(/\s+/g, "").trim();
  const regWithSpace = registration || "";
  const vehicleLabel = [year, make, model].filter(Boolean).join(" ").trim();

  const queries = [
    `"${cleanReg}"`,
    `"${regWithSpace}" ${make || ""} ${model || ""}`.trim(),
    `${vehicleLabel} "${cleanReg}"`,
    `${vehicleLabel} for sale "${cleanReg}"`.trim()
  ].filter(Boolean);

  const results = [];

  for (const query of queries) {
    const result = await runSerpApiQuery(query);
    results.push(result);
  }

  return summariseSearchResults(results);
}

function buildWebSection(searchSummary, tier = "basic") {
  if (tier === "basic") {
    return `## 7) Notable Mentions & Public Presence

Public web search is not included in the Basic Lookup tier.`;
  }

  if (!searchSummary || !searchSummary.findings) {
    return `## 7) Notable Mentions & Public Presence

Public web search data was not available for this lookup.`;
  }

  const lines = [];

  lines.push("## 7) Notable Mentions & Public Presence");
  lines.push("");
  lines.push("The following section is based on public web search results.");
  lines.push("");
  lines.push(searchSummary.summaryText);
  lines.push("");

  if (!searchSummary.findings.length) {
    lines.push("No clear public listing, forum, or media references were identified from the returned web results.");
  } else {
    lines.push("### Key public web findings");
    lines.push(searchSummary.findings.join("\n\n"));
  }

  if (tier === "premium") {
    lines.push("");
    lines.push("### Interpretation");
    lines.push("- Public search results can sometimes reveal old sale listings, enthusiast discussion, or past public appearances.");
    lines.push("- Absence of strong public web results does not prove a vehicle has no online history; it only means no obvious indexed trace was identified in this search pass.");
  }

  return lines.join("\n");
}

module.exports = {
  searchVehicleWebPresence,
  buildWebSection
};