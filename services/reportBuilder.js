function getTierInstructions(tier) {
  if (tier === "premium") {
    return `
TIER: PREMIUM

Write a high-detail, evidence-led vehicle investigation report.

Your priorities:
- go beyond summary and provide interpretation
- distinguish clearly between confirmed facts, likely inferences, and unknowns
- identify inconsistencies, unanswered questions, and due-diligence gaps
- explain what the evidence suggests in practical terms
- give strong, specific buyer, viewing, paperwork, and negotiation guidance
- avoid fluff, repetition, and generic filler
- do not invent provenance, accidents, finance history, ownership count, rarity, restoration history, or public appearances

Style:
- professional, clear, analytical, and genuinely useful
- premium in quality, but still direct and readable
- confident where evidence is strong
- cautious where evidence is limited

If evidence is missing:
- say so plainly
- explain what cannot be concluded safely

If public web findings are weak:
- do not pad the section
- explain the limitation honestly

If image evidence is limited or absent:
- say that clearly
- do not pretend condition details are confirmed
`;
  }

  if (tier === "pro") {
    return `
TIER: PRO

Write a detailed vehicle investigation report.

Your priorities:
- provide more interpretation than a standard vehicle check
- identify likely risk patterns, recurring MOT themes, and practical buyer concerns
- separate confirmed facts from likely suggestions
- keep the report useful, grounded, and concise

Style:
- clear, practical, investigative
- no fluff
- no invented facts
`;
  }

  return `
TIER: BASIC

Write a concise, useful, buyer-focused report.

Your priorities:
- explain the most important findings clearly
- highlight immediate risks or useful next checks
- keep it practical and easy to understand

Style:
- plain English
- no unnecessary detail
- no invented facts
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
  webSection,
  imageFindings = "No image analysis findings were provided.",
  notes = "",
  goal = "",
  followup_q1 = "",
  followup_q2 = ""
}) {
  return `
Write a UK vehicle insight report for this vehicle.

USER-SUPPLIED VEHICLE DETAILS
- Registration: ${registration || "Not provided"}
- VIN: ${vin || "Not provided"}
- Make: ${make || "Not provided"}
- Model: ${model || "Not provided"}
- Year: ${year || "Not provided"}

USER CONTEXT
- Notes: ${notes || "None provided"}
- Main goal: ${goal || "None provided"}
- Follow-up answer 1: ${followup_q1 || "None provided"}
- Follow-up answer 2: ${followup_q2 || "None provided"}

IMPORTANT EVIDENCE RULES
- Use only the evidence supplied below.
- Never fabricate facts.
- Unknowns must be stated clearly.
- Do not claim certainty where the evidence does not support it.
- Distinguish between:
  - Confirmed facts
  - Likely inferences
  - Unknown / not verified

PREBUILT FACTUAL SECTION 2
${identitySection}

PREBUILT FACTUAL SECTION 3
${motSection}

PREBUILT FACTUAL SECTION 7
${webSection}

IMAGE ANALYSIS FINDINGS
${imageFindings}

${getTierInstructions(tier)}

OUTPUT RULES
- Return the report using the exact headings below.
- Preserve Sections 2, 3, and 7 in substance.
- Do not tell the user to go elsewhere for DVLA or MOT history if the supplied sections already contain that material.
- Do not invent finance data, accident data, keeper history, service invoices, restoration history, or public mentions.
- If Section 7 says public web search is not included, respect that.
- If image evidence is absent, limited, or unclear, say so plainly.
- Make the report genuinely useful to a buyer or investigator.

REQUIRED HEADINGS

# UK Vehicle History Insight Report

## 1) Executive Summary
A tight overview of what matters most.

## 2) Identity & Production
Use the supplied factual identity section.

## 3) MOT & Condition Pattern Analysis
Use the supplied MOT section, but make the interpretation stronger where appropriate.

## 4) Features & Technical Context
Only discuss features or spec context if supported by supplied data or clearly framed as general context rather than vehicle-specific certainty.

## 5) Image-Based Observations
Use only the supplied image findings. If no image findings were provided, explain that clearly.

## 6) Risks, Inconsistencies & Open Questions
Identify what seems solid, what looks uncertain, and what should be checked further.

## 7) Notable Mentions & Public Presence
Use the supplied public web section.

## 8) Recommended Next Steps
Give practical viewing, questioning, paperwork, and negotiation actions.

## 9) Confidence & Limitations
Explain what this report can and cannot safely conclude.
`.trim();
}

module.exports = { buildPrompt };
