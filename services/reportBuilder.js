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

RISK WEIGHTING RULES (CRITICAL)
- Repeated MOT advisories on the same system = meaningful risk
- Safety-related systems (brakes, suspension, tyres, steering) carry higher weight
- Multiple recurring issues across systems = cumulative risk
- High mileage + repeated advisories = increased ownership risk
- Cosmetic condition must never outweigh mechanical concerns

IMPORTANT:
- Cars with repeated brake, suspension, or tyre issues must NOT be described as strong or low-risk
- Do not allow tidy presentation to override risk signals

BUYER SCORE DISCIPLINE
- Repeated mechanical issues cap score at 6/10 or below
- Safety-related recurring issues should typically result in 5–6/10
- Scores above 7/10 require genuinely strong evidence

ANTI-HALLUCINATION RULES
Do NOT invent or assume:
- finance, write-off, accident, or ownership history
- service or restoration history
- rarity or provenance
- exact specification without evidence
- mechanical or structural condition beyond evidence

IMAGE ACCURACY RULES (CRITICAL)
- Images are supporting evidence only
- Never identify gearbox type unless clearly visible and unambiguous
- Never say something is missing, broken, modified, or aftermarket unless clearly visible
- Do not infer trim level, spec, or originality from partial images
- Do not assume paint mismatch, lowered suspension, or modifications without clear evidence

Use cautious phrasing:
- “appears to show”
- “not clear from images”
- “cannot be confirmed”

MOT RULES
- Focus on patterns, not isolated entries
- Repeated advisories = meaningful
- Clean history = positive signal (not proof)

WEB DATA RULES
- Only include if meaningful findings exist
- If no meaningful findings exist, REMOVE the section entirely

WRITING STYLE
- UK English only (tyre, colour, etc.)
- Plain English
- Slightly conversational but professional
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

Then include:
- What this car is
- What’s good
- What’s the catch
- What the buyer should do next

End with:
Buyer stance: [chosen stance]

## Buyer Score & Risk Cost

Provide:

- Buyer Score: X/10 (short plain-English explanation)
- Estimated Immediate Risk Cost: £X–£X
- Likely Spend Timing: Immediate / Soon / Over time
- Risk Cost Confidence: Low / Medium / High

Rules:
- Base only on evidence
- Do not invent faults
- Use realistic UK pricing
- If unclear, say “Unable to estimate reliably”

## Identity & Production
- What is confirmed
- What seems consistent
- What is missing
- Whether it matters

## MOT & Condition Pattern Analysis
- Focus on patterns
- Clearly explain:
  - reassuring signs
  - normal wear
  - meaningful concerns

## Features & Technical Context

### Vehicle-Specific Facts
Only confirmed facts.
Do NOT state gearbox type, trim level, or spec unless directly confirmed.

### General Model Context
Helpful UK ownership context only.

## Image-Based Observations

### Directly Visible
Only what is unmistakably visible.

### Suggested But Not Confirmed
Soft observations only.

### Not Assessable
Keep brief.

## Risks, Inconsistencies & Open Questions

Group into:
- Major (real risk / safety / cost)
- Moderate (worth checking)
- Minor (normal used car items)

Rules:
- Do not inflate minor issues
- Avoid generic filler risks

## Recommended Next Steps
Make practical and useful:
- what to check
- what to ask
- what could cost money
- negotiation angles

## Confidence & Limitations
Keep honest and concise

## Final Verdict
Write like real buying advice.

CRITICAL:
- Verdict must reflect risk weighting, not tone
- Repeated mechanical concerns must influence the verdict

Include:

"Would I personally buy this? Yes / Yes, with checks / Probably not / No"

Rules:
- “Yes” = strong evidence only
- “Yes, with checks” = normal used car risks
- “Probably not” = recurring issues or moderate risk
- “No” = high-risk or serious concerns

Do not over-upgrade a car simply because it is usable.
Usable does not equal a good buy.
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
