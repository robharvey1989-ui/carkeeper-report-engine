function buildPrompt({
  registration,
  vin,
  make,
  model,
  year,
  identitySection,
  motSection,
  webSection,
  listingSection = "",
  askingPrice = "",
  sourceType = "",
  reportDate = "",
  calculatedAge = "",
  imageFindings = "No image analysis findings were provided.",
  notes = "",
  goal = ""
}) {
  return `
Write a premium UK vehicle buying report.

You are helping a real buyer decide whether this specific car is worth pursuing, negotiating on, or avoiding.

REPORT DATE:
${reportDate || "Not supplied"}

CALCULATED VEHICLE AGE:
${calculatedAge || "Not supplied"}

VEHICLE DETAILS:
- Registration: ${registration || "Not provided"}
- VIN: ${vin || "Not provided"}
- Make: ${make || "Not provided"}
- Model: ${model || "Not provided"}
- Year: ${year || "Not provided"}
- Asking price: ${askingPrice || "Not provided"}
- Source: ${sourceType || "Not provided"}

USER CONTEXT:
${notes || "None"}

IDENTITY / DVLA:
${identitySection || "None"}

MOT HISTORY:
${motSection || "None"}

SELLER ADVERT / LISTING:
${listingSection || "No seller advert text supplied."}

WEB / PUBLIC DATA:
${webSection || "None"}

IMAGE FINDINGS:
${imageFindings}

CORE RULES:
- Do not generate a generic vehicle report.
- Help the buyer decide what actually matters.
- Seller-declared faults outweigh tidy photos or historic MOT data.
- If the seller says “spares or repairs”, “sold as seen”, “needs work”, “injector fault”, “non-runner”, “project”, or similar, treat this as high-priority evidence.
- Use calculated vehicle age exactly. Do not calculate age yourself.
- Do not invent technical facts, rarity, engine details, production numbers, or VIN decoding.
- Do not overstate visual evidence from photos.
- Do not treat old V5C updates as suspicious unless recent or linked to another concern.
- Keep the report selective, human, practical, and buyer-focused.

OUTPUT:
Use only sections that genuinely add value.

Potential sections:
## Summary
## Buyer Snapshot
## Seller Advert Reality Check
## What This Car Really Is
## MOT & Ownership Pattern Analysis
## Visual & Condition Observations
## Key Risks & Open Questions
## Recommended Next Steps
## Report Scope & Limitations
## Final Verdict

Make the final verdict clear, decisive and useful.
`.trim();
}

module.exports = { buildPrompt };
