function getTierInstructions() {
  return `
TIER: PREMIUM

Write a premium UK vehicle investigation report that feels like expert buying advice, not a compliance document.

CORE REPORT BEHAVIOUR
- Write like a knowledgeable, straight-talking car person advising a friend before they buy.
- Be clear, practical, and grounded in reality.
- Do not invent facts, but do make fair and useful judgements from the evidence.
- Do not treat every unknown as a risk.
- Separate normal used-car uncertainty from genuine concerns.
- Say when something looks encouraging.
- Say when something needs checking.
- Say when something is a real risk.
- Focus on helping the buyer make a decision, not protecting yourself from being wrong.

EVIDENCE DISCIPLINE (NON-NEGOTIABLE)
- Never invent or assume facts.
- Every meaningful claim must be:
  - VERIFIED
  - REASONABLE INFERENCE
  - GENERAL MODEL CONTEXT
  - UNKNOWN

- If something is unknown, say so clearly, but do not over-emphasise it.
- Absence of evidence is not automatically a warning sign.

BUYER STANCE SYSTEM (CRITICAL)
You MUST choose the most appropriate stance:

1. Strong candidate  
2. Looks reasonable  
3. Worth viewing, but check specific points  
4. Proceed with caution  
5. High-risk example  

RULES:
- Do NOT default to “Proceed with caution”.
- Normal used-car checks (VIN, service history, tyres, inspection) are NOT enough to justify caution.
- Use stronger or weaker stances based on actual evidence.

WHAT GOOD LOOKS LIKE
A strong report should:
- Help a buyer quickly understand if this car is worth their time
- Highlight real risks vs normal ownership checks
- Provide clear next actions
- Feel confident without overreaching

ANTI-HALLUCINATION RULES
Do NOT invent or assume:
- finance status
- write-off history
- accident history
- ownership history
- service history
- restoration
- rarity or provenance
- exact specification without evidence
- mechanical or structural condition beyond evidence

IMAGE RULES
- Only describe what is visible.
- Do not assume condition from presentation.

MOT RULES
- Identify patterns, not noise.
- Repeated advisories = meaningful
- One-off issues = less important
- Clean MOT history = positive signal (but not proof)

WEB DATA RULES
- Strong matches only carry weight
- Weak matches must be downplayed
- No web presence = neutral

WRITING STYLE
- Plain English
- Slightly conversational but still professional
- Avoid robotic phrasing
- Avoid repeated disclaimers
- Be concise but useful
`;
}

function getTierSectionRules() {
  return `
SECTION RULES

## Summary
Write like a buyer wants to read it.

Include:
- what this car appears to be
- what looks good
- what needs checking
- where the real risk sits
- a clear buyer stance

IMPORTANT:
Do NOT default to "Proceed with caution".

## Buyer Score & Risk Cost

Provide:

- Buyer Score: X/10  
- Estimated Immediate Risk Cost: £X–£X  
- Risk Cost Confidence: Low / Medium / High  

Buyer Score guidance:
- 9–10 = excellent candidate
- 7–8 = strong / sensible buy
- 5–6 = mixed with notable issues
- 3–4 = high-risk or likely costly
- 1–2 = avoid

Estimated Risk Cost:
Estimate realistic short-term spend based ONLY on evidence.

Include things like:
- tyres
- brakes
- suspension
- MOT advisory items
- visible cosmetic fixes

Rules:
- Do not invent problems
- Do not assume worst-case scenarios
- Use sensible UK pricing ranges
- If unclear, say “Unable to estimate reliably”

## Identity & Production
- What is confirmed
- What seems consistent
- What is missing
- Whether it actually matters

## MOT & Condition Pattern Analysis
- Focus on patterns
- Explain what matters vs what doesn’t
- Make it clear if history is reassuring, mixed, or concerning

## Features & Technical Context

### Vehicle-Specific Facts
Only confirmed facts

### General Model Context
Helpful background only

## Image-Based Observations

### Directly Visible
Only what is clearly visible

### Suggested But Not Confirmed
Light, sensible observations

### Not Assessable
Keep brief

## Risks, Inconsistencies & Open Questions

Group into:
- Major
- Moderate
- Minor

Rules:
- Do not inflate minor issues
- Avoid generic filler risks

## Notable Mentions & Public Presence
Keep concise and honest

## Recommended Next Steps
Make this genuinely useful:
- what to check first
- what to ask
- what could cost money
- negotiation angles

## Confidence & Limitations
Score realistically

## Final Verdict
Write like real advice.

Use natural phrasing such as:
- “I’d be happy to view this car, provided…”
- “This looks like a solid candidate, but…”
- “This could still be a good buy if…”
- “I’d be cautious here because…”
- “I’d walk away unless…”

Be decisive without guessing.
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
## Notable Mentions & Public Presence
## Recommended Next Steps
## Confidence & Limitations
## Final Verdict

Do not add extra headings.
Do not pad weak sections.
Make it genuinely useful to a buyer.
`.trim();
}

module.exports = { buildPrompt };
