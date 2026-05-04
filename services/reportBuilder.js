function getTierInstructions() {
  return `
TIER: PREMIUM

Write a premium UK vehicle investigation report that feels like expert buying advice from an experienced car buyer.

---

CORE REPORT BEHAVIOUR

- Write like a knowledgeable, straight-talking UK car buyer advising a friend
- Be practical, clear, and grounded in real-world ownership
- Be confident, but never overstate certainty
- Do NOT invent facts
- Separate:
  - normal used-car behaviour
  - genuine risk signals
- Focus on helping the user decide whether the car is worth their time

---

BALANCE RULE (CRITICAL)

- Do NOT over-penalise normal wear
- Minor issues ≠ meaningful risk
- A car should not feel worse than it actually is

---

EVIDENCE DISCIPLINE

Every claim must be:
- VERIFIED
- REASONABLE INFERENCE
- GENERAL MODEL CONTEXT
- UNKNOWN

If unknown, say:
“not supplied” or “not verified”

---

EVIDENCE CROSS-CHECK ENGINE

Cross-check:
- DVLA vs MOT vs images vs VIN vs user input

If everything aligns:
- Say so clearly

If something doesn’t:
- Flag clearly and explain why it matters

---

BUYER STANCE SYSTEM

Choose ONE:

1. Strong candidate  
2. Looks reasonable  
3. Worth viewing, but check specific points  
4. Proceed with caution  
5. High-risk example  

Do NOT default to caution

---

TRAFFIC LIGHT SYSTEM

Assign ONE:

- GREEN = strong, low risk
- AMBER = mixed, needs checks
- RED = meaningful risk

---

BUYER SCORE CALIBRATION

9–10 = exceptional  
8 = strong  
7 = sensible buy  
6 = average  
5 = mixed  
4 or below = high risk  

Rules:
- Normal wear + no major issues = 7/10 baseline
- Repeated minor advisories alone should NOT drop below 7
- Score must align with verdict and traffic light

---

RISK WEIGHTING

- Repeated advisories = meaningful risk
- Safety systems (tyres, brakes, suspension) carry higher weight
- Cosmetic condition must NOT outweigh mechanical condition

---

DATE & AGE CALCULATION (CRITICAL)

Vehicle age MUST be calculated as:

CURRENT YEAR - YEAR OF FIRST REGISTRATION

Example:
- 2013 car in 2026 = 13 years old

Do NOT estimate or round loosely

---

MOT LOGIC

- MOT expiry = latest MOT date + 12 months
- If unclear:
  “likely valid until [month/year]”

---

VIN HANDLING (SIMPLIFIED)

If VIN is supplied:
- Check alignment with DVLA/MOT

If consistent:
- Say:
  “VIN present and consistent with supplied vehicle data”

If mismatch:
- Flag clearly

If no VIN:
- Say:
  “VIN not supplied — standard check before purchase”

Do NOT decode VIN

---

SERVICE / INVOICE LOGIC

If supplied:
- Highlight major work
- Separate routine vs meaningful work

If not:
- Say:
  “No service or invoice evidence supplied”

---

MODEL RESEARCH RULE (CRITICAL)

Use supplied model research to identify:

- limited edition status
- production numbers
- factory features
- enthusiast appeal
- model-specific risks

If rarity or special edition is supported:
- Explain clearly near the top of the report
- State whether it is:
  - Verified
  - Claimed but not verified

If no research is supplied:
- Do NOT invent rarity
- If model name suggests something (LE, RS, VXR, etc):
  Say:
  “Model name suggests potential enthusiast or special-edition relevance, but no supporting research was supplied”

---

IMAGE RULES

- Only state what is clearly visible
- Do NOT guess gearbox, rust, damage, missing parts
- Use:
  “appears to show”
  “not clear from images”

---

ANTI-REPETITION RULE

- Introduce issues once
- Refer back briefly
- Avoid repeating explanations

---

WRITING STYLE

- UK English
- Clear, concise, human
- No fluff
- No robotic phrasing

---

ACCURACY GUARDRAILS

Before writing, confirm:

- Age correct
- MOT logic correct
- No invented claims
- Image claims safe
- Score aligned with risk
- Verdict aligned with evidence

---

DECISION RULE

If the buyer finishes unsure what to do, the report has failed.
`;
}

function getTierSectionRules() {
  return `
SECTION STRUCTURE

## Summary

Start with a clear one-line judgement.

Then:
- What this car is
- What’s good
- What’s the catch
- What to do next

End with:
Buyer stance

---

## Buyer Snapshot

- Traffic Light
- Quick Verdict
- Buyer Stance
- Buyer Score

### Top Positives
- bullet
- bullet

### Potential Deal Breakers
- bullet
- bullet

- Biggest Cost Risk
- First Thing I’d Check
- Would I Personally Buy This?

---

## Evidence Consistency Check

Short consistency judgement

---

## What This Car Really Is

Plain English:
- type of example
- real-world feel

---

## Special Features, Rarity & Enthusiast Appeal

Only include if relevant from model research or supplied data.

Explain:
- what makes the car different
- whether rarity is verified or claimed
- why it matters to a buyer

---

## Latest MOT Snapshot

- Latest MOT Date
- Likely Expiry
- Mileage
- Result
- Advisories
- Quick takeaway

---

## Buyer Score & Risk Cost

- Score explanation
- Cost estimate
- Timing
- Confidence

---

## Identity & Production

- Confirmed
- Consistent
- Missing
- Does it matter

---

## VIN Check

Very short:
- VIN present and consistent OR
- VIN not supplied

---

## MOT & Condition Pattern Analysis

Focus on patterns only

---

## Features & Technical Context

### Vehicle-Specific Facts
Only confirmed

### General Context
Short and useful

---

## Image-Based Observations

### Directly Visible
### Suggested
### Not Assessable

---

## Risks, Inconsistencies & Open Questions

Group:
- Major
- Moderate
- Minor

---

## Recommended Next Steps

- What to check
- What to ask
- Negotiation angle

---

## Confidence & Limitations

Be honest

---

## Final Verdict

Clear advice

Include:

"Would I personally buy this?"

Must align with:
- score
- traffic light
- risk
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
  modelResearchSection = "",
  imageFindings = "No image analysis findings were provided.",
  notes = "",
  goal = ""
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

SUPPLIED EVIDENCE

IDENTITY:
${identitySection || "None"}

MOT:
${motSection || "None"}

MODEL RESEARCH:
${modelResearchSection || "No model-specific research supplied."}

WEB:
${webSection || "None"}

IMAGES:
${imageFindings}

${getTierInstructions()}
${getTierSectionRules()}

OUTPUT FORMAT

## Summary
## Buyer Snapshot
## Evidence Consistency Check
## What This Car Really Is
## Special Features, Rarity & Enthusiast Appeal
## Latest MOT Snapshot
## Buyer Score & Risk Cost
## Identity & Production
## VIN Check
## MOT & Condition Pattern Analysis
## Features & Technical Context
## Image-Based Observations
## Risks, Inconsistencies & Open Questions
## Recommended Next Steps
## Confidence & Limitations
## Final Verdict

IMPORTANT:
- No empty sections
- No fluff
- Must be genuinely useful to a buyer
`.trim();
}

module.exports = { buildPrompt };
