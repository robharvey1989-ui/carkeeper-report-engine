function getTierInstructions(tier) {
  if (tier === "premium") {
    return `
TIER: PREMIUM

Write a premium, high-detail, evidence-led UK vehicle investigation report.

Premium behaviour:
- Think like a careful vehicle investigator and experienced buyer.
- Interpret the supplied evidence deeply, but never invent facts.
- Clearly separate VERIFIED facts, REASONABLE INFERENCES, and UNKNOWN / NOT VERIFIED points.
- Prioritise buyer protection, due diligence, negotiation leverage, and unresolved risk.
- Highlight inconsistencies, suspicious patterns, usage clues, and anything that deserves closer inspection.
- Use stronger judgement than lower tiers, but stay within the evidence.
- Include a clear verdict and a confidence score out of 100.

Premium output expectations:
- Strong, useful executive summary
- Practical buyer guidance
- Red flags prioritised by seriousness
- More analytical MOT interpretation
- Stronger condition/risk interpretation from images where supported
- Clearer market/use-case context
- More detailed next-step actions
- Final verdict should be decisive but evidence-based

Do NOT invent:
- finance status
- accident history
- keeper count
- ownership history
- auction history
- rarity claims
- service history
- restoration history
- public fame or provenance
- exact trim/spec unless supported by evidence

If evidence is weak:
- say so directly
- explain what cannot safely be concluded
- state what should be checked next
`;
  }

  if (tier === "pro") {
    return `
TIER: PRO

Write a detailed, practical UK vehicle investigation report.

Pro behaviour:
- Go beyond a basic summary and provide useful interpretation.
- Separate confirmed facts from likely suggestions and unanswered questions.
- Identify practical buyer concerns, recurring MOT themes, condition concerns, and likely risk patterns.
- Keep the report grounded, useful, and clearly structured.
- Include a clear verdict and a lighter confidence score.

Pro output expectations:
- Strong summary
- Good practical interpretation
- Clear risk section
- Useful image observations if images were provided
- Actionable next steps

Do NOT invent:
- finance status
- accident history
- keeper count
- ownership history
- public provenance
- exact trim/spec unless supported
`;
  }

  return `
TIER: BASIC

Write a concise, clear, buyer-focused UK vehicle report.

Basic behaviour:
- Prioritise the most important known facts.
- Explain the headline risks and the most useful next checks.
- Keep it short, practical, and easy to understand.
- Do not over-analyse or speculate.
- Do not include a confidence score unless directly supported by evidence.
- Keep the verdict light and cautious.

Basic output expectations:
- Simple summary
- Core identity interpretation
- Basic MOT pattern summary
- Basic risk notes
- Clear next steps

Do NOT invent:
- finance status
- accident history
- keeper count
- ownership history
- provenance
- rarity
- exact trim/spec unless supported
`;
}

function getTierSectionRules(tier) {
  if (tier === "premium") {
    return `
SECTION DEPTH RULES FOR PREMIUM
- Executive Summary: decisive and high value
- Identity & Production: interpret identity strength, possible build/spec clues, and any mismatch risk
- MOT & Condition Pattern Analysis: analyse trend, repeat advisories, neglect clues, usage clues, and mileage confidence
- Features & Technical Context: add relevant UK buyer context and model-specific ownership considerations where framed as general context
- Image-Based Observations: include visible condition, panel/paint consistency clues, wear, presentation, and questions raised by the photos
- Risks, Inconsistencies & Open Questions: prioritise into major / moderate / minor concerns if possible
- Notable Mentions & Public Presence: summarise clearly and state limitations honestly
- Recommended Next Steps: give strong viewing, paperwork, inspection, and negotiation actions
- Confidence & Limitations: include a score out of 100 and explain what is driving confidence up or down
- Final Verdict: must be present and must be decisive
`;
  }

  if (tier === "pro") {
    return `
SECTION DEPTH RULES FOR PRO
- Executive Summary: clear and useful
- Identity & Production: explain what is solid and what is uncertain
- MOT & Condition Pattern Analysis: identify practical patterns and buyer concerns
- Features & Technical Context: useful general context only
- Image-Based Observations: include practical visible findings if images exist
- Risks, Inconsistencies & Open Questions: clear and buyer-focused
- Notable Mentions & Public Presence: useful summary without padding
- Recommended Next Steps: practical and actionable
- Confidence & Limitations: include a light confidence view, preferably as Low / Moderate / Good with reasoning
- Final Verdict: should be present
`;
  }

  return `
SECTION DEPTH RULES FOR BASIC
- Executive Summary: short and clear
- Identity & Production: use the supplied facts and explain them simply
- MOT & Condition Pattern Analysis: brief pattern summary only
- Features & Technical Context: minimal and only if genuinely useful
- Image-Based Observations: short and factual if images exist
- Risks, Inconsistencies & Open Questions: keep concise
- Notable Mentions & Public Presence: summarise briefly
- Recommended Next Steps: practical checklist
- Confidence & Limitations: explain limits simply, no complex scoring
- Final Verdict: optional, light, and cautious
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
Write a UK vehicle history and buyer-risk report for this vehicle.

VEHICLE DETAILS PROVIDED BY USER
- Registration: ${registration || "Not provided"}
- VIN: ${vin || "Not provided"}
- Make: ${make || "Not provided"}
- Model: ${model || "Not provided"}
- Year: ${year || "Not provided"}
- Tier: ${tier || "basic"}

USER CONTEXT
- Notes: ${notes || "None provided"}
- Main goal: ${goal || "None provided"}
- Follow-up answer 1: ${followup_q1 || "None provided"}
- Follow-up answer 2: ${followup_q2 || "None provided"}

CORE RULES
- Use only the evidence supplied below.
- Never fabricate facts.
- Never claim checks were performed if they were not supplied.
- Unknowns must be stated clearly.
- Do not present assumptions as facts.
- Clearly distinguish:
  - VERIFIED / CONFIRMED
  - LIKELY / REASONABLE INFERENCE
  - UNKNOWN / NOT VERIFIED
- Be precise, useful, investigative, and buyer-focused.
- Use UK terminology and context.
- Do not pad weak sections with filler.
- If evidence is thin, say so plainly.

FORBIDDEN INVENTIONS
Do not invent or imply the following unless explicitly supported by the supplied material:
- outstanding finance
- insurance write-off history
- accident history
- ownership count
- keeper history
- service book history
- invoice history
- restoration history
- rarity or collector status
- public media appearances
- auction appearances
- exact trim level
- exact engine/spec details not supported by evidence
- stolen status unless explicitly provided by a supplied source

SUPPLIED FACTUAL MATERIAL

IDENTITY / DVLA EVIDENCE
${identitySection}

MOT / CONDITION HISTORY EVIDENCE
${motSection}

PUBLIC WEB / MENTION EVIDENCE
${webSection}

IMAGE ANALYSIS EVIDENCE
${imageFindings}

${getTierInstructions(tier)}

${getTierSectionRules(tier)}

OUTPUT RULES
- Return the report using the exact headings below.
- Use "## " headings exactly so the report can be split into sections.
- Preserve the supplied identity, MOT, public presence, and image material in substance.
- Do not tell the user to check DVLA or MOT elsewhere if that information is already present in the supplied evidence.
- If a section is limited, state the limitation clearly instead of padding.
- Make the report genuinely useful to a careful buyer, inspector, or investigator.
- Keep paragraphs fairly short and readable.
- Avoid generic filler language.
- Avoid repeating the same fact in multiple sections unless necessary for interpretation.

REQUIRED OUTPUT STRUCTURE

## Summary
Provide a tight summary of the vehicle and the most important findings.
For PRO and PREMIUM, include an overall buyer stance such as:
- Looks reasonable
- Proceed with caution
- Higher-risk example

## Identity & Production
Use the supplied identity evidence.
Explain what appears confirmed about the vehicle's identity.
Mention any mismatches, gaps, weak points, or unresolved identity questions.
If build/spec detail is uncertain, say so.

## MOT & Condition Pattern Analysis
Use the supplied MOT evidence.
Interpret recurring advisories, failure themes, maintenance signals, neglect clues, corrosion clues, tyre/brake/suspension wear patterns, and any mileage confidence issues.
If MOT evidence is absent or weak, explain that limitation.

## Features & Technical Context
Discuss features, class, technical context, and likely ownership context only if supported by evidence or clearly framed as general model context.
Do not present generic model knowledge as confirmed vehicle-specific fact.

## Image-Based Observations
Use only the supplied image findings.
Summarise visible condition, presentation, wear, damage clues, mismatch concerns, and anything that deserves checking in person.
If no images were supplied or image quality is limited, say so clearly.

## Risks, Inconsistencies & Open Questions
Identify what looks solid, what looks uncertain, and what should be checked further.
For PRO and PREMIUM, prioritise the most important concerns first.
For PREMIUM, make this section especially strong and practically useful.

## Notable Mentions & Public Presence
Use the supplied web/public presence evidence only.
If there are no meaningful public findings, state that honestly.
Do not pad this section.

## Recommended Next Steps
Give practical actions for:
- viewing the car
- questions to ask the seller
- paperwork to inspect
- inspection priorities
- negotiation leverage
For PREMIUM, make this especially specific.

## Confidence & Limitations
Explain how strong or weak the available evidence is.
For PREMIUM, include:
- Confidence Score: X/100
and explain the score.
For PRO, you may use a lighter confidence rating if more appropriate.
For BASIC, keep this simple.

## Final Verdict
Give a short final judgement.
For BASIC, keep it light and cautious.
For PRO and PREMIUM, be clearer and more decisive, while staying within the evidence.
`.trim();
}

module.exports = { buildPrompt };

