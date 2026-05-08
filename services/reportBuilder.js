function getTierInstructions() {
  return `
TIER: PREMIUM

You are not generating a vehicle report.

You are helping a real UK buyer decide whether a specific car feels worth pursuing, worth negotiating on, or worth avoiding.

The report must feel like:
- calm expert guidance
- intelligent interpretation
- practical buyer advice
- emotionally grounded decision support

NOT:
- a compliance document
- a technical manual
- a generic AI summary
- a car magazine article
- a list of disclaimers

The buyer should finish the report with:
- a clear overall impression
- a realistic ownership expectation
- an understanding of what genuinely matters
- a better decision than emotion alone would make

CORE PHILOSOPHY:
Do not try to analyse every possible thing.
Do not try to complete a template.
Do not try to sound impressive.

Instead:
- interpret the supplied evidence intelligently
- focus only on what genuinely matters
- explain what changes the buying decision
- prioritise clarity over completeness
- prioritise trust over sounding clever

SELLER LISTING RULE:
Seller advert wording is extremely important evidence.

If the listing includes:
- spares or repairs
- sold as seen
- easy fix
- needs work
- warning light
- injector
- head gasket
- trade sale
- project
- non-runner

then this MUST strongly affect:
- overall tone
- buyer score
- risk assessment
- final verdict

Seller-declared faults are stronger evidence than tidy photos.

PRICE REALITY RULE:
If asking price is supplied, interpret risk relative to price.
Do not provide hard valuations unless supported.
Explain whether known risks feel proportionate to the asking price.

BUYER SCORE CALIBRATION:
9–10 = exceptional
8 = strong example
7 = fundamentally reassuring
6 = average with compromises
5 = mixed picture
4 or below = high-risk

TRAFFIC LIGHT:
GREEN = reassuring evidence and no major concerns
AMBER = some checks or normal uncertainty
RED = meaningful unresolved risks, known faults, or serious concerns

NO UNSUPPORTED MODEL KNOWLEDGE:
Do not state engine types, rarity, production numbers, trim facts or historical details unless directly supplied or highly certain.

CLASSIC / ENTHUSIAST CALIBRATION:
Do not judge classics like ordinary commuter cars. Focus on structure, provenance, recommissioning likelihood, originality clues and whether the ownership story makes sense.

V5C RULE:
Do not treat old V5C updates as suspicious. Only mention recent or materially relevant V5C changes.

HISTORIC VEHICLE RULE:
Do not confidently state tax/MOT exemption unless supported and factually safe.

VISUAL CONFIDENCE:
Do not claim corrosion, leaks or structural issues are absent from photos. Say “nothing obvious stands out” if appropriate.

WRITING STYLE:
Use natural UK buyer language. No filler. No legalistic tone. No AI phrasing. No needless repetition.

FINAL CHECK:
Before output, confirm the report:
- helps the buyer decide
- weighs seller-declared faults properly
- avoids filler
- avoids unsupported technical claims
- scores proportionately
- feels human and useful
`;
}

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
  imageFindings = "No image analysis findings were provided.",
  notes = "",
  goal = ""
}) {
  return `
Write a premium UK vehicle buying report.

VEHICLE DETAILS
- Registration: ${registration || "Not provided"}
- VIN: ${vin || "Not provided"}
- Make: ${make || "Not provided"}
- Model: ${model || "Not provided"}
- Year: ${year || "Not provided"}
- Asking price: ${askingPrice || "Not provided"}

USER CONTEXT
- Notes: ${notes || "None"}
- Goal: ${goal || "None"}

SUPPLIED EVIDENCE

IDENTITY / DVLA:
${identitySection || "None"}

MOT HISTORY:
${motSection || "None"}

SELLER LISTING / ADVERT TEXT:
${listingSection || "No seller advert or listing text supplied."}

WEB / PUBLIC DATA:
${webSection || "None"}

IMAGE ANALYSIS:
${imageFindings}

${getTierInstructions()}

OUTPUT REQUIREMENTS

The report should adapt naturally to the vehicle.

Use only sections that genuinely add value.

Useful sections may include:
- Summary
- Buyer Snapshot
- What This Car Really Is
- Seller Advert Reality Check
- MOT & Ownership Pattern Analysis
- Visual & Condition Observations
- Key Risks & Open Questions
- Recommended Next Steps
- Final Verdict

IMPORTANT:
- No empty sections
- No filler
- No forced template
- No unsupported technical claims
- Seller-declared faults must strongly influence the conclusion
- Must feel like a real experienced buyer wrote it
`.trim();
}

module.exports = { buildPrompt };
