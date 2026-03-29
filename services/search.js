const axios = require("axios");

const SERPAPI_KEY = process.env.SERPAPI_KEY;

function clean(value) {
  if (value === null || value === undefined || value === "") return "";
  return String(value).trim();
}

function lowerBlob(title = "", link = "", snippet = "") {
  return `${title} ${link} ${snippet}`.toLowerCase();
}

function looksLikeListing(title = "", link = "", snippet = "") {
  const text = lowerBlob(title, link, snippet);

  return [
    "autotrader",
    "carandclassic",
    "collectingcars",
    "ebay",
    "pistonheads classifieds",
    "gumtree",
    "motors.co.uk",
    "exchangeandmart",
    "historics",
    "bonhams",
    "iconic auctioneers",
    "classiccarsforsale",
    "classic trader",
    "car for sale",
    "for sale",
    "classified"
  ].some(term => text.includes(term));
}

function looksLikeAuction(title = "", link = "", snippet = "") {
  const text = lowerBlob(title, link, snippet);

  return [
    "collectingcars",
    "historics",
    "bonhams",
    "iconic auctioneers",
    "car & classic auction",
    "auction",
    "sold for",
    "lot "
  ].some(term => text.includes(term));
}

function looksLikeForum(title = "", link = "", snippet = "") {
  const text = lowerBlob(title, link, snippet);

  return [
    "forum",
    "club",
    "owners club",
    "discussion",
    "thread",
    "reddit",
    "pistonheads forum",
    "mbclub",
    "briskoda",
    "babybmw",
    "civinfo",
    "vwroc"
  ].some(term => text.includes(term));
}

function looksLikeMedia(title = "", link = "", snippet = "") {
  const text = lowerBlob(title, link, snippet);

  return [
    "news",
    "article",
    "press",
    "magazine",
    "review",
    "media",
    "blog",
    "autocar",
    "what car",
    "top gear",
    "carwow",
    "honest john"
  ].some(term => text.includes(term));
}

function looksLikeRegisterOrHeritage(title = "", link = "", snippet = "") {
  const text = lowerBlob(title, link, snippet);

  return [
    "register",
    "heritage",
    "chassis register",
    "owners register",
    "marque register",
    "club register"
  ].some(term => text.includes(term));
}

function scoreResult(item) {
  let score = 0;
  const text = lowerBlob(item.title, item.link, item.snippet);

  if (looksLikeAuction(item.title, item.link, item.snippet)) score += 5;
  if (looksLikeListing(item.title, item.link, item.snippet)) score += 4;
  if (looksLikeForum(item.title, item.link, item.snippet)) score += 2;
  if (looksLikeMedia(item.title, item.link, item.snippet)) score += 2;
  if (looksLikeRegisterOrHeritage(item.title, item.link, item.snippet)) score += 3;

  if (text.includes(item.registrationCompact?.toLowerCase?.() || "")) score += 3;
  if (text.includes(item.registrationSpaced?.toLowerCase?.() || "")) score += 2;
  if (item.make && text.includes(item.make.toLowerCase())) score += 1;
  if (item.model && text.includes(item.model.toLowerCase())) score += 1;
  if (item.year && text.includes(String(item.year).toLowerCase())) score += 1;

  return score;
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
      },
      timeout: 20000
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

function categoriseResult(item) {
  if (looksLikeAuction(item.title, item.link, item.snippet)) return "auctions";
  if (looksLikeListing(item.title, item.link, item.snippet)) return "listings";
  if (looksLikeRegisterOrHeritage(item.title, item.link, item.snippet)) return "registers";
  if (looksLikeForum(item.title, item.link, item.snippet)) return "forums";
  if (looksLikeMedia(item.title, item.link, item.snippet)) return "media";
  return "other";
}

function summariseSearchResults(results, context = {}) {
  if (!results || !results.length) {
    return {
      summaryText: "No public web search results were returned.",
      findings: [],
      categories: {
        listings: [],
        auctions: [],
        forums: [],
        media: [],
        registers: [],
        other: []
      },
      interpretation: []
    };
  }

  const allOrganic = results.flatMap(r =>
    (r.organic_results || []).map(item => ({
      query: r.query,
      title: item.title || "",
      link: item.link || "",
      snippet: item.snippet || "",
      displayed_link: item.displayed_link || "",
      make: context.make || "",
      model: context.model || "",
      year: context.year || "",
      registrationCompact: context.registrationCompact || "",
      registrationSpaced: context.registrationSpaced || ""
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

  uniqueResults.forEach((item) => {
    item.score = scoreResult(item);
    item.category = categoriseResult(item);
  });

  uniqueResults.sort((a, b) => b.score - a.score);

  const categories = {
    listings: [],
    auctions: [],
    forums: [],
    media: [],
    registers: [],
    other: []
  };

  for (const item of uniqueResults) {
    categories[item.category].push(item);
  }

  const findings = uniqueResults.slice(0, 10).map(item => {
    return `- ${item.title}
  ${item.link}
  Query: ${item.query}
  Category: ${item.category}
  Relevance score: ${item.score}
  ${item.snippet || "No snippet available."}`;
  });

  const interpretation = [];

  if (categories.listings.length > 0) {
    interpretation.push("- Public listing-like results exist, which may indicate current or historic sale activity, but result titles/snippets should be checked before treating them as a confirmed match.");
  }

  if (categories.auctions.length > 0) {
    interpretation.push("- Auction-style results exist, which can sometimes be useful for past public sale exposure or photographic history, but identity matching should be checked carefully.");
  }

  if (categories.forums.length > 0) {
    interpretation.push("- Forum/community results exist, which may provide enthusiast discussion or owner commentary, though relevance can vary widely.");
  }

  if (categories.media.length > 0) {
    interpretation.push("- Media/editorial-style results exist, but some may refer to the broader model rather than this exact vehicle.");
  }

  if (categories.registers.length > 0) {
    interpretation.push("- Register or heritage-style results exist, which may matter more for unusual, enthusiast, or collector vehicles.");
  }

  if (
    categories.listings.length === 0 &&
    categories.auctions.length === 0 &&
    categories.forums.length === 0 &&
    categories.media.length === 0 &&
    categories.registers.length === 0
  ) {
    interpretation.push("- No strong public trace was identified in the indexed results returned by this search pass.");
  }

  const summaryLines = [
    `Total unique public web results reviewed: ${uniqueResults.length}`,
    `Likely listings/classified results: ${categories.listings.length}`,
    `Likely auction-style results: ${categories.auctions.length}`,
    `Likely forum/community results: ${categories.forums.length}`,
    `Likely media/editorial results: ${categories.media.length}`,
    `Likely register/heritage results: ${categories.registers.length}`
  ];

  return {
    summaryText: summaryLines.join("\n"),
    findings,
    categories,
    interpretation
  };
}

async function searchVehicleWebPresence({ registration, make, model, year }) {
  const regSpaced = clean(registration);
  const regCompact = regSpaced.replace(/\s+/g, "");
  const cleanMake = clean(make);
  const cleanModel = clean(model);
  const cleanYear = clean(year);
  const vehicleLabel = [cleanYear, cleanMake, cleanModel].filter(Boolean).join(" ").trim();

  const queries = [
    regCompact ? `"${regCompact}"` : "",
    regSpaced ? `"${regSpaced}" ${cleanMake} ${cleanModel}`.trim() : "",
    regCompact && vehicleLabel ? `${vehicleLabel} "${regCompact}"` : "",
    regCompact && vehicleLabel ? `${vehicleLabel} for sale "${regCompact}"` : "",
    regCompact && vehicleLabel ? `${vehicleLabel} site:carandclassic.com "${regCompact}"` : "",
    regCompact && vehicleLabel ? `${vehicleLabel} site:collectingcars.com "${regCompact}"` : "",
    regCompact && vehicleLabel ? `${vehicleLabel} site:ebay.co.uk "${regCompact}"` : "",
    regCompact && vehicleLabel ? `${vehicleLabel} site:pistonheads.com "${regCompact}"` : ""
  ].filter(Boolean);

  const results = [];
  for (const query of queries) {
    const result = await runSerpApiQuery(query);
    results.push(result);
  }

  return summariseSearchResults(results, {
    registrationCompact: regCompact,
    registrationSpaced: regSpaced,
    make: cleanMake,
    model: cleanModel,
    year: cleanYear
  });
}

function buildWebSection(searchSummary, tier = "basic") {
  if (tier === "basic") {
    return `## 7) Notable Mentions & Public Presence
### Evidence Status
- Public web search is not included in the Basic tier.

### Limitations
- No public web/context scan was performed for this tier.`;
  }

  if (!searchSummary || !searchSummary.findings) {
    return `## 7) Notable Mentions & Public Presence
### Evidence Status
- Public web search data was not available for this lookup.

### Limitations
- No public web/context interpretation could be produced.`;
  }

  const lines = [];

  lines.push("## 7) Notable Mentions & Public Presence");
  lines.push("### Search Overview");
  lines.push(searchSummary.summaryText);
  lines.push("");

  lines.push("### High-Level Interpretation");
  if (searchSummary.interpretation && searchSummary.interpretation.length) {
    lines.push(searchSummary.interpretation.join("\n"));
  } else {
    lines.push("- No strong interpretation could be drawn from the returned public results.");
  }

  lines.push("");

  if (!searchSummary.findings.length) {
    lines.push("### Key Public Findings");
    lines.push("- No clear public listing, forum, auction, register, or media references were identified from the returned indexed results.");
  } else {
    lines.push("### Key Public Findings");
    lines.push(searchSummary.findings.slice(0, tier === "premium" ? 10 : 6).join("\n\n"));
  }

  if (tier === "premium") {
    lines.push("");
    lines.push("### Premium Interpretation Notes");
    lines.push("- Public search can sometimes reveal old sale listings, auction traces, enthusiast discussion, or archived references that add context.");
    lines.push("- A lack of indexed results does not prove the vehicle has no online history; it only means no strong public trace was identified in this search pass.");
    lines.push("- Public search evidence should be matched carefully against the registration, make, model, year, and visible vehicle details before treating a result as a definite historical match.");
  }

  lines.push("");
  lines.push("### Limitations");
  lines.push("- This section is based on public indexed search results only.");
  lines.push("- It does not prove ownership history, accident history, finance status, or private sales that left no public trace.");

  return lines.join("\n");
}

module.exports = {
  searchVehicleWebPresence,
  buildWebSection
};
