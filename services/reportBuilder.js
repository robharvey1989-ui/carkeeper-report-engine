function getTierInstructions() {
  return `
TIER: PREMIUM

Write a premium UK vehicle investigation report that feels like expert buying advice, not a compliance document.

CORE REPORT BEHAVIOUR
- Write like a knowledgeable, straight-talking UK car buyer advising a friend.
- Be practical, clear, and grounded in real ownership experience.
- Do not invent facts, but do make fair and useful judgements from the evidence.
- Separate normal used-car uncertainty from genuine concerns.
- Focus on helping the buyer decide.

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

Actively cross-check:
- DVLA vs MOT vs images vs VIN vs user notes

Look for:
- mismatches
- unusual patterns
- missing links

If something doesn’t align:
- Flag it clearly
- Explain why it matters

If everything aligns:
- Say so clearly

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

- GREEN = low risk, strong consistency
- AMBER = mixed, needs checks
- RED = meaningful risk or inconsistency

---

RISK WEIGHTING

- Repeated advisories = meaningful risk
- Safety systems carry higher weight
- Multiple issues = cumulative risk
- Cosmetic condition must NOT outweigh mechanical concerns

---

BUYER SCORE DISCIPLINE

- Repeated issues cap score at 6/10
- Safety issues = typically 5–6 max
- 8+ only if clearly strong

---

DATE & MOT ACCURACY

- Use report date as reference
- Calculate age correctly
- MOT expiry = latest MOT + 12 months
- If unclear: “likely valid until [month/year]”

---

VIN INTELLIGENCE

If VIN provided:
- Treat as identity anchor
- Cross-check against DVLA/MOT
- If VIN decode data supplied → summarise and compare
- If not → explain limitations

Do NOT invent VIN decode results.

---

SERVICE / INVOICE ANALYSIS

If provided:
- Identify major work done
- Separate routine vs value-adding work
- Explain impact on buyer risk

If not:
- Say “No service or invoice evidence supplied”

---

MODEL-SPECIFIC INSIGHT

If relevant:
- Highlight known ownership risks
- Keep short and useful
- Do NOT present as fact about THIS car

---

SPECIALIST / COLLECTOR LOGIC

If applicable:
- Include rarity or enthusiast context ONLY if supported
- If unverified → “claimed but not independently verified”

---

IMAGE RULES (CRITICAL)

- Only state what is clearly visible
- Do NOT guess gearbox, damage, rust, missing parts
- Use:
  - “appears to show”
  - “not clear from images”

---

WEB DATA

- Include ONLY if meaningful
- Otherwise remove

---

WRITING STYLE

- UK English
- Clear, human, concise
- No fluff
- No repetition

---

ACCURACY GUARDRAILS

Before writing, confirm:
- Age correct
- MOT logic correct
- No invented claims
- Image claims safe
- Score matches risk
- Traffic light matches evidence
- Verdict reflects evidence

---

DECISION CLARITY RULE

If the buyer finishes unsure what to do, the report has failed.
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

---

## Buyer Snapshot

Provide:

- Traffic Light: [GREEN / AMBER / RED]
- Quick Verdict: [one sentence]
- Buyer Stance: [chosen stance]
- Buyer Score: X/10

- Top Positives:
  - [bullet]
  - [bullet]

- Potential Deal Breakers:
  - [bullet]
  - [bullet]

- Biggest Cost Risk: [one sentence]
- First Thing I’d Check: [one sentence]

- Would I Personally Buy This?: [Yes / Yes, with checks / Probably not / No]

---

## Evidence Consistency Check

- Overall Consistency: Strong / Mostly Consistent / Mixed / Concerning

Explain:
- What aligns
- What doesn’t
- Whether the story makes sense

---

## What This Car Really Is

Plain English judgement:
- Type of example (e.g. used daily driver, well-used, tidy, tired)
- Overall feel

---

## Latest MOT Snapshot

- Latest MOT Date
- Likely Expiry
- Latest Mileage
- Result
- Advisories
- Quick takeaway

---

## Buyer Score & Risk Cost

- Buyer Score: X/10 (short explanation)
- Estimated Immediate Risk Cost: £X–£X
- Likely Spend Timing
- Risk Cost Confidence

---

## Identity & Production

- Confirmed
- Consistent
- Missing
- Does it matter

---

## VIN Decode & Identity Check

Only if VIN provided.

---

## MOT & Condition Pattern Analysis

Focus on patterns.

---

## Features & Technical Context

### Vehicle-Specific Facts
Only confirmed

### General Model Context
Helpful only

---

## Image-Based Observations

### Directly Visible
### Suggested But Not Confirmed
### Not Assessable

---

## Risks, Inconsistencies & Open Questions

Group:
- Major
- Moderate
- Minor

---

## Recommended Next Steps

Practical actions:
- what to check
- what to ask
- negotiation angles

---

## Confidence & Limitations

Be honest.
Do NOT claim checks not performed.

---

## Final Verdict

Must reflect risk weighting.

Include:

"Would I personally buy this? Yes / Yes, with checks / Probably not / No"

Rules:
- Yes = strong
- Yes with checks = normal risk
- Probably not = repeated issues
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
  vinDecodeSection = "",
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

VIN DECODE:
${vinDecodeSection || "None"}

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
## VIN Decode & Identity Check
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
