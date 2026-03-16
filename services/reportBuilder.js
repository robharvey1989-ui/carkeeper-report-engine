function getTierInstructions(tier) {
  if (tier === "premium") {
    return `
Tier: PREMIUM

Write a richer, more analytical report.
Focus on:
- deeper summary
- stronger maintenance interpretation
- collector/provenance-style tone where appropriate
- broader historical and rarity context
- stronger due-diligence guidance
- use public web findings carefully and meaningfully
`;
  }

  if (tier === "pro") {
    return `
Tier: PRO

Write a more detailed buyer/investigation report.
Focus on:
- stronger summary
- clearer maintenance and risk interpretation
- practical market and ownership context
- use public web findings where available
- more useful next-step guidance
`;
  }

  return `
Tier: BASIC

Write a concise, practical, buyer-focused report.
Focus on:
- clarity
- immediate usefulness
- simple takeaways
- no unnecessary waffle
`;
}

function buildPrompt({
  registration,
  vin,
  make,
  model,
  year,
  tier,
  identitySection,
  motSection,
  webSection
}) {
  return `
Write a UK vehicle history insight report for this vehicle.

Vehicle details supplied by user:
- Registration: ${registration || "Not provided"}
- VIN: ${vin || "Not provided"}
- Make: ${make || "Not provided"}
- Model: ${model || "Not provided"}
- Year: ${year || "Not provided"}

The following sections are prebuilt from factual data and must be preserved in substance.

PREBUILT FACTUAL SECTION 2:
${identitySection}

PREBUILT FACTUAL SECTION 3:
${motSection}

PREBUILT SECTION 7:
${webSection}

${getTierInstructions(tier)}

Rules:
- Return the full report with all 8 sections.
- Preserve section 2, section 3, and section 7 in substance.
- Do not say the user must go elsewhere for DVLA or MOT history if those sections already contain the data.
- Do not invent finance data, accident data, keeper history, or public mentions.
- If section 7 says public web search is not included, respect that.
- Make the report genuinely useful.

Required headings:

# UK Vehicle History Insight Report
## 1) Summary
## 2) Identity & Production
## 3) Service & Maintenance History
## 4) Features & Technical Specs
## 5) Recalls & Safety
## 6) Rarity & Historical Value
## 7) Notable Mentions & Public Presence
## 8) Confidence & Limitations
`.trim();
}

module.exports = {
  buildPrompt
};