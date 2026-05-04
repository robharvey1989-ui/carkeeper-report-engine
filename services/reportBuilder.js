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
- Focus on helping the user decide whether the car is worth their time

---

CORE TRUST RULE (CRITICAL)

This report must be useful even when data is limited.

If something is not supplied:
- do NOT invent it
- do NOT imply it has been checked
- clearly state what is not confirmed

Trust comes from:
- clarity
- honesty
- correct interpretation
- useful next steps

---

BALANCE RULE

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

Do NOT default to caution.

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
- Score must align with verdict and traffic light

---

RISK WEIGHTING

- Repeated advisories = meaningful risk
- Safety systems (tyres, brakes, suspension) carry higher weight
- Cosmetic condition must NOT outweigh mechanical condition

---

DATE & AGE ACCURACY (CRITICAL)

Before stating age:

Calculate:
vehicle age = report year - vehicle year

Example:
- 2007 car in 2026 = 19 years old

Rules:
- Do NOT estimate
- Do NOT round loosely
- If unsure, avoid stating exact age and say:
  “for its age and mileage”

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

SPECIAL MODEL AWARENESS RULE (CRITICAL)

Look at the make/model name for clues such as:
LE, Limited Edition, Sport, M Sport, RS, GTI, VXR, Type R, AMG, M, S, R, Heritage, Anniversary, Final Edition.

If model name suggests possible special edition or enthusiast relevance but no supporting evidence is supplied:

- Do NOT ignore it
- Do NOT invent details
- Say:

“This model name suggests possible special-edition or enthusiast relevance, but no supporting research was supplied. This should be verified, as it may affect desirability, originality expectations, and value.”

If rarity or special features ARE supported by supplied evidence:
- Highlight them clearly near the top
- Explain why they matter

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
- Avoid repeating explanations

---

WRITING STYLE

- UK English
- Clear, concise, human
- No fluff
- No robotic phrasing

---

FINAL QUALITY CHECK

Before writing, confirm:

1. Age is correct or safely omitted
2. MOT logic is correct
3. No invented claims
4. Image observations are safe
5. Score matches risk
6. Rarity handled honestly (not ignored, not invented)
7. Report tells the buyer what to do next

If not, improve before output.

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

## What We Can and Cannot Confirm

### Confirmed
List key confirmed facts

### Not Confirmed
List important unknowns:
- VIN decode
- service history
- finance/write-off
- rarity/special edition (if applicable)

Keep this short.

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

Only include if relevant.

- Explain what might make the car special
- If unverified, clearly say so
- Explain why it matters

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
- VIN present OR
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
## What We Can and Cannot Confirm
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
