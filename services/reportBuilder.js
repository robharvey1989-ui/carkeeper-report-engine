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

BUYER STANCE SYSTEM
You MUST choose one:

1. Strong candidate  
2. Looks reasonable  
3. Worth viewing, but check specific points  
4. Proceed with caution  
5. High-risk example  

RULES:
- Do NOT default to “Proceed with caution”
- Normal checks alone do NOT justify caution

RISK WEIGHTING RULES (CRITICAL)
- Repeated advisories = meaningful risk
- Safety systems carry higher weight
- Multiple issues = cumulative risk
- Cosmetic condition must NOT outweigh mechanical risk

BUYER SCORE DISCIPLINE
- Repeated issues cap score at 6/10
- Safety issues usually 5–6/10 max
- 8+ only for genuinely strong cars

TRAFFIC LIGHT SYSTEM (CRITICAL)

Assign ONE overall colour:

- GREEN = Low risk, no meaningful recurring issues, evidence broadly strong
- AMBER = Mixed picture, some concerns or unknowns that require checks
- RED = Clear risk signals, repeated issues, or significant uncertainty

Rules:
- Do NOT assign GREEN if:
  - repeated mechanical advisories exist
  - safety systems are involved
  - key identity gaps exist

- AMBER should be the most common outcome
- RED should be used when risks are meaningful, not just possible

The colour must match the evidence — not the tone.

DATE AND AGE ACCURACY
- Use report date as reference
- Calculate age properly (no guessing)

MOT LOGIC
- Latest MOT date + 12 months = likely expiry
- If unclear, say “likely valid until [month/year]”

VIN RULE
- Missing VIN = check required, NOT major risk alone

ANTI-HALLUCINATION
Do NOT invent:
- finance, write-off, accident, ownership
- service history
- exact spec

If unknown, say:
“not supplied” or “not verified”

IMAGE RULES (CRITICAL)
- Only state what is clearly visible
- Do NOT guess gearbox, damage, rust, missing parts
- Use cautious phrasing:
  - “appears to show”
  - “not clear from images”

WEB DATA
- Only include if meaningful
- Otherwise remove entirely

WRITING STYLE
- UK English
- Clear, concise, human
- No fluff, no robotic tone

ACCURACY GUARDRAILS
Before writing, silently confirm:
- Age correct
- MOT logic correct
- No invented claims
- Image claims are safe
- Score matches risk
- Traffic light matches evidence
- Verdict reflects evidence
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
- What’s the catch
- What to do next

End with:
Buyer stance: [chosen stance]

## Buyer Snapshot

Provide:

- Traffic Light: [GREEN / AMBER / RED]
- Quick Verdict: [one sentence]
- Buyer Stance: [chosen stance]
- Buyer Score: X/10
- Main Reason to Proceed: [one sentence]
- Main Reason to Pause: [one sentence]
- Biggest Cost Risk: [one sentence]
- First Thing I’d Check: [one sentence]
- Would I Personally Buy This?: [Yes / Yes, with checks / Probably not / No]

Rules:
- Fast, punchy, high-value
- Traffic light must align with risk weighting
- No fluff

## Buyer Score & Risk Cost

Provide:

- Buyer Score: X/10 (short explanation)
- Estimated Immediate Risk Cost: £X–£X
- Likely Spend Timing: Immediate / Soon / Over time
- Risk Cost Confidence: Low / Medium / High

Rules:
- No invented faults
- Realistic UK pricing
- If unclear: “Unable to estimate reliably”

## Identity & Production
- What is confirmed
- What is consistent
- What is missing
- Whether it matters

## MOT & Condition Pattern Analysis
- Focus on patterns
- Apply correct MOT date logic

## Features & Technical Context

### Vehicle-Specific Facts
Only confirmed facts

### General Model Context
Helpful only, not assumed

## Image-Based Observations

### Directly Visible
Only clear facts

### Suggested But Not Confirmed
Soft observations only

### Not Assessable
Keep brief

## Risks, Inconsistencies & Open Questions

Group into:
- Major
- Moderate
- Minor

## Recommended Next Steps
- What to check
- What to ask
- What could cost money

## Confidence & Limitations
- Be honest
- Do NOT claim checks not performed

## Final Verdict

- Must reflect risk weighting
- No optimism bias

Include:

"Would I personally buy this? Yes / Yes, with checks / Probably not / No"

Rules:
- Yes = strong
- Yes with checks = normal risks
- Probably not = recurring issues
- No = high risk

Usable ≠ good buy
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
- No empty sections
- No fluff
- Must be genuinely useful to a buyer
`.trim();
}

module.exports = { buildPrompt };
