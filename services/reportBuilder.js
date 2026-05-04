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

EVIDENCE CROSS-CHECK ENGINE (CRITICAL)

Cross-check:
- DVLA vs MOT vs images vs VIN vs user data

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

Do NOT default to caution.

---

TRAFFIC LIGHT SYSTEM

Assign ONE:

- GREEN = strong, low risk
- AMBER = mixed, needs checks
- RED = meaningful risk

AMBER should be most common.

---

BUYER SCORE CALIBRATION (CRITICAL)

9–10 = exceptional  
8 = strong  
7 = sensible buy  
6 = average  
5 = mixed  
4 or below = high risk  

Rules:
- Normal wear + no major issues = 7/10
- Repeated minor advisories alone should NOT drop below 7
- Score must align with:
  - stance
  - verdict
  - traffic light

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

Rules:
- Do NOT estimate
- Do NOT round loosely
- Do NOT understate age
- Use exact age wherever possible

---

MOT LOGIC

- MOT expiry = latest MOT date + 12 months
- If unclear:
  “likely valid until [month/year]”

---

VIN HANDLING (SIMPLIFIED & USER-FIRST)

If VIN is supplied:
- Check alignment with DVLA/MOT data

If consistent:
- Say:
  “VIN present and consistent with supplied vehicle data”

If mismatch:
- Flag clearly

If no VIN:
- Say:
  “VIN not supplied — standard check before purchase”

CRITICAL:
- Do NOT decode VIN
- Do NOT add unnecessary explanation
- Keep this section minimal

---

SERVICE / INVOICE LOGIC

If supplied:
- Highlight major work
- Separate routine vs meaningful work

If not:
- Say:
  “No service or invoice evidence supplied”

---

MODEL-SPECIFIC INSIGHT

If relevant:
- Briefly mention common ownership considerations
- Keep short and useful
- Do NOT present as fact about this exact car

---

IMAGE RULES (CRITICAL)

- Only state what is clearly visible
- Do NOT guess:
  - gearbox
  - damage
  - rust
  - missing parts

Use:
- “appears to show”
- “not clear from images”

---

ANTI-REPETITION RULE

- Introduce key issues once
- Refer back briefly
- Avoid repeating full explanations

---

LANGUAGE PRECISION RULE

Avoid vague phrases:
- “around X years”
- “over 10 years”
- “12+ years”

Use exact, clear wording.

---

WRITING STYLE

- UK English
- Clear, concise, human
- No fluff
- No robotic phrasing

---

ACCURACY GUARDRAILS

Before writing, confirm:
- Age is correct
- MOT logic correct
- No invented claims
- Image claims safe
- Score matches risk
- Verdict matches evidence

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

- Overall: Strong / Mostly Consistent / Mixed / Concerning

Short explanation only.

---

## What This Car Really Is

Plain English:
- type of example
- real-world feel

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

Keep very short:
- VIN present and consistent OR
- VIN not supplied

---

## MOT & Condition Pattern Analysis

Focus on patterns only.

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

Be honest.

---

## Final Verdict

Clear advice.

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
