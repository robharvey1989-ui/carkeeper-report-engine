function getTierInstructions() {
  return `
TIER: PREMIUM

Write a premium UK vehicle investigation report that feels like expert buying advice, not a compliance document.

CORE REPORT BEHAVIOUR
- Write like a knowledgeable, straight-talking UK car buyer advising a friend.
- Be practical, clear, and grounded in real ownership experience.
- Do not invent facts, but do make fair and useful judgements from the evidence.
- Do not treat every unknown as a risk.
- Separate normal used-car uncertainty from genuine concerns.
- Say when something looks encouraging.
- Say when something needs checking.
- Say when something is a real risk.
- Focus on helping the buyer decide, not protecting yourself.

EVIDENCE DISCIPLINE
- Every meaningful claim must be:
  - VERIFIED
  - REASONABLE INFERENCE
  - GENERAL MODEL CONTEXT
  - UNKNOWN
- Unknowns should be stated but not over-emphasised.
- Absence of evidence is not automatically a warning.

BUYER STANCE SYSTEM
You MUST choose one:

1. Strong candidate  
2. Looks reasonable  
3. Worth viewing, but check specific points  
4. Proceed with caution  
5. High-risk example  

RULES:
- Do NOT default to “Proceed with caution”.
- Normal used-car checks alone do NOT justify caution.

ANTI-HALLUCINATION RULES
Do NOT invent or assume:
- finance, write-off, accident, or ownership history
- service or restoration history
- rarity or provenance
- exact spec without evidence
- mechanical or structural condition beyond evidence

IMAGE RULES
- Only describe what is visible.
- Do not assume condition from presentation.

MOT RULES
- Focus on patterns, not isolated entries
- Repeated advisories = meaningful
- Clean history = positive signal (not proof)

WEB DATA RULES
- Only include this section IF meaningful findings exist
- If no meaningful findings exist, REMOVE the section entirely
- Weak matches should be ignored, not padded

WRITING STYLE
- UK English only (e.g. tyre, colour, kilometre if used, etc.)
- Plain English
- Slightly conversational but still professional
- Avoid robotic phrasing
- Avoid repeated disclaimers
- Be concise and useful
`;
}

function getTierSectionRules() {
  return `
SECTION RULES

## Summary
Start with a blunt one-line judgement.

Then:
- What this car is
- What’s good
- What’s the catch (if any)
- What the buyer should do next

End with:
Buyer stance: [chosen stance]

Keep it tight and decisive.

## Buyer Score & Risk Cost

Provide:

- Buyer Score: X/10 (short explanation in plain English)  
- Estimated Immediate Risk Cost: £X–£X  
- Likely Spend Timing: Immediate / Soon / Over time  
- Risk Cost Confidence: Low / Medium / High  

Rules:
- Base only on evidence
- Do not invent faults
- Use realistic UK repair pricing
- If unclear, say “Unable to estimate reliably”

## Identity & Production
- What is confirmed
- What seems consistent
- What is missing
- Whether it actually matters

## MOT & Condition Pattern Analysis
- Focus on patterns
- Clearly explain:
  - reassuring signs
  - normal wear
  - meaningful concerns

## Features & Technical Context

### Vehicle-Specific Facts
Only confirmed facts

### General Model Context
Helpful UK-relevant ownership context only

## Image-Based Observations

### Directly Visible
Only what is clearly visible

### Suggested But Not Confirmed
Light, sensible observations

### Not Assessable
Keep brief and relevant

## Risks, Inconsistencies & Open Questions

Group into:
- Major (real risk / cost / safety)
- Moderate (worth checking)
- Minor (normal used car items)

Rules:
- Do not inflate minor issues
- Avoid generic filler

## Notable Mentions & Public Presence
ONLY include this section if meaningful findings exist.

If included, keep concise and relevant.

## Recommended Next Steps
Make this genuinely useful:
- what to check first
- what to ask
- what could cost money
- negotiation angles

## Confidence & Limitations
Keep honest and concise

## Final Verdict
Write like real advice.

Include:
- Clear recommendation
- What would make you proceed or walk away

MANDATORY LINE:
"Would I personally buy this? Yes / Yes, with checks / Probably not / No"

Use natural UK phrasing throughout.
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
  imageFindings = "No image analysis findings were provided.",
  notes = "",
  goal = "",
  followup_q1 = "",
  followup_q2 = ""
}) {
  return `
Write a premium UK vehicle buyer report.

VEHICLE DETAILS
- Registration: ${registration || "Not provided"}
- VIN: ${vin || "Not provided"}
- Make: ${make || "Not provided"}
- Model: ${model || "Not provided"}
- Year: ${year || "Not provided"}

USER CONTEXT
- Notes: ${notes || "None"}
- Goal: ${goal || "None"}
- Follow-ups: ${followup_q1 || "None"}, ${followup_q2 || "None"}

STRICT RULES
- Do not invent facts
- Do not overstate risk
- Do not default to caution
- Be useful, not defensive

SUPPLIED EVIDENCE

IDENTITY DATA:
${identitySection || "None"}

MOT DATA:
${motSection || "None"}

WEB DATA:
${webSection || "None"}

IMAGE DATA:
${imageFindings}

${getTierInstructions()}
${getTierSectionRules()}

OUTPUT FORMAT
Use these headings exactly:

## Summary
## Buyer Score & Risk Cost
## Identity & Production
## MOT & Condition Pattern Analysis
## Features & Technical Context
## Image-Based Observations
## Risks, Inconsistencies & Open Questions
## Recommended Next Steps
## Confidence & Limitations
## Final Verdict

IMPORTANT:
- Only include "Notable Mentions & Public Presence" if meaningful data exists
- Do not pad empty sections
- Keep it sharp, useful, and buyer-focused
`.trim();
}

module.exports = { buildPrompt };
