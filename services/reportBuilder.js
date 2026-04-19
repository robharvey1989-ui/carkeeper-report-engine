function getTierInstructions() {
  return `
TIER: PREMIUM

Write a premium, evidence-led UK vehicle investigation report for a careful buyer who wants the highest-value possible pre-purchase analysis from the supplied evidence.

CORE PREMIUM BEHAVIOUR
- Think like a forensic used-vehicle analyst, experienced buyer, cautious inspector, provenance researcher, and negotiation adviser.
- Depth must come from sharper reasoning, not richer-sounding language.
- Every meaningful conclusion must be traceable to supplied evidence.
- Be as strict about unsupported positive claims as unsupported negative claims.
- If the evidence does not justify a flattering conclusion, do not imply one.
- If the evidence does not justify a concern, do not imply one.
- Prioritise identity confidence, condition uncertainty, recurring risk, buyer protection, unresolved questions, provenance strength, and negotiation leverage.
- Explain not just what the concern is, but why it matters to a buyer.
- When evidence is thin, reduce certainty rather than filling space with generic commentary.
- Write like an expert whose credibility depends on being accurate, not dramatic.

MANDATORY EVIDENCE CATEGORIES
Every material point must fit one of these:
- VERIFIED / DIRECTLY SUPPORTED
- REASONABLE INFERENCE
- GENERAL MODEL CONTEXT
- UNKNOWN / NOT VERIFIED

CATEGORY RULES
- VERIFIED / DIRECTLY SUPPORTED means directly grounded in supplied evidence.
- REASONABLE INFERENCE means a cautious conclusion drawn from supplied evidence, with the link explained.
- GENERAL MODEL CONTEXT means broad model/platform/ownership background and must never be presented as fact about this exact vehicle.
- UNKNOWN / NOT VERIFIED means the evidence does not safely support a conclusion.

PREMIUM OUTPUT STANDARD
- Strong executive summary with a clear buyer stance
- Deeper, disciplined interpretation of MOT and condition history
- Strong identity confidence analysis
- Clear separation between what is known, suggested, and unknown
- Conservative but useful image interpretation
- Risks prioritised by seriousness and evidence strength
- Practical viewing, paperwork, inspection, and negotiation guidance
- Properly reasoned confidence scoring
- Decisive final verdict without overstating certainty

WEB EVIDENCE PREMIUM STANDARD
- Analyse public findings like a provenance researcher, not a search engine summary.
- For every meaningful online trace, assess both match confidence and source reliability.
- Explain whether the finding genuinely strengthens provenance, condition history, market history, ownership understanding, or buyer understanding.
- If a source is weak, derivative, undated, reposted, or loosely matched, say so directly.
- Do not confuse discoverability with credibility.
- A premium report should help the buyer understand not only what exists online, but how much trust to place in it.

STRICT ANTI-HALLUCINATION RULES
Do NOT invent, imply, or quietly assume:
- finance status
- write-off status
- accident history
- keeper count
- ownership history
- auction history unless explicitly supported in supplied evidence
- service history
- invoice history
- restoration history
- rarity
- collector status
- provenance unless explicitly supported
- media appearances
- public fame
- exact trim level
- exact engine/spec details not directly supported
- originality unless explicitly supported
- underbody condition unless actually evidenced
- corrosion status unless actually visible or explicitly evidenced
- structural integrity unless explicitly evidenced
- that repairs were completed unless explicitly evidenced
- that the car is "excellent", "well-preserved", "well-maintained", "cared for", "honest", "original", "straight", "turn-key", or similar unless the supplied evidence genuinely supports that wording

IMAGE DISCIPLINE
- Treat images as limited evidence, not proof of full condition.
- Only describe what is actually visible in the supplied images or image findings.
- Prefer phrasing such as:
  - "No obvious ... is visible in the supplied images"
  - "The supplied photos suggest ..."
  - "This cannot confirm ..."
- Do NOT claim that rust, filler, corrosion, paint mismatch, previous repair, straightness, originality, or panel integrity are absent unless the supplied images truly justify that conclusion.
- Do NOT convert presentation into condition certainty.
- Do NOT claim mechanical soundness, structural health, or restoration quality from cosmetic photos alone.

MOT DISCIPLINE
- MOT history can identify patterns, but cannot prove overall quality, maintenance standards, structural soundness, or ownership quality.
- State whether MOT issues look isolated, repeated, escalating, improving, or inconclusive.
- Do not over-dramatise a limited MOT record.
- Do not underplay repeated advisories.
- Distinguish between mild age-related themes and more meaningful recurring concerns.

WEB / PUBLIC EVIDENCE RULES
- Treat web findings as variable-quality evidence.
- Do not assume an online mention relates to this exact vehicle unless the supplied evidence supports that match clearly.
- Strong identifiers include registration, VIN, unique visible features, matching sale details, or highly specific contextual alignment.
- If a web finding appears to match only loosely, say so clearly.
- For each meaningful web finding, assess:
  - match strength to this exact vehicle
  - source type
  - likely reliability
  - practical value to a buyer
- Distinguish clearly between:
  - Confirmed Match
  - Probable Match
  - Possible Match
  - Too Weak to Rely On
- Do not inflate the significance of weak web matches.
- If no credible public trace exists, say so plainly.
- A weak forum mention, recycled listing, aggregator page, or image-only match should carry less weight than a primary source, auction archive, dealer listing, registry, or well-documented publication.

BUYER VALUE RULE
This report should help a serious buyer:
- understand what looks strong
- understand what remains uncertain
- identify where money could be lost
- know what to inspect
- know what to ask
- know what to use in negotiation
- know whether to proceed, proceed cautiously, or hold back

IF EVIDENCE IS THIN
- Say so directly
- Keep weak sections tight
- Focus on the highest-value unanswered questions
- Do not pad
`;
}

function getTierSectionRules() {
  return `
SECTION DEPTH RULES FOR PREMIUM
- Summary: decisive, high-value, evidence-led
- Identity & Production: analyse identity strength, registration/VIN confidence, mismatch risk, and unresolved identity gaps
- MOT & Condition Pattern Analysis: analyse repeat advisories, failures, wear themes, usage clues, mileage credibility, maintenance signals, and evidence limits
- Features & Technical Context: strictly separate vehicle-specific facts from general model context
- Image-Based Observations: separate directly visible points from suggested but unconfirmed points and from what cannot be assessed
- Risks, Inconsistencies & Open Questions: prioritise major / moderate / minor where possible and explain why each matters
- Notable Mentions & Public Presence: concise, analytical, and honest; explain source reliability and buyer relevance
- Recommended Next Steps: strong, buyer-useful, tied to evidence gaps and risk
- Confidence & Limitations: score by category, then explain the overall confidence honestly
- Final Verdict: must be present, must be useful, and must be decisive without pretending certainty where there is none
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
Write a premium UK vehicle history and buyer-risk report for this vehicle.

VEHICLE DETAILS PROVIDED BY USER
- Registration: ${registration || "Not provided"}
- VIN: ${vin || "Not provided"}
- Make: ${make || "Not provided"}
- Model: ${model || "Not provided"}
- Year: ${year || "Not provided"}
- Tier: premium

USER CONTEXT
- Notes: ${notes || "None provided"}
- Main goal: ${goal || "None provided"}
- Follow-up answer 1: ${followup_q1 || "None provided"}
- Follow-up answer 2: ${followup_q2 || "None provided"}

CORE EVIDENCE RULES
- Use only the supplied evidence below.
- Never fabricate facts.
- Never claim a check was done unless the supplied evidence shows it was done.
- Unknowns must be stated clearly.
- Do not present assumptions as facts.
- Do not strengthen weak evidence with confident wording.
- Do not use persuasive or sales-style language.
- Depth must come from better interpretation, not from more adjectives.
- If a point is not supported, omit it.
- If a section is thin, keep it thin and honest.
- Do not treat absence of evidence as evidence of absence.

MANDATORY CLASSIFICATION RULE
Every material point in the report must fit one of these categories:
- VERIFIED / DIRECTLY SUPPORTED
- REASONABLE INFERENCE
- GENERAL MODEL CONTEXT
- UNKNOWN / NOT VERIFIED

IMPORTANT CATEGORY RULES
- VERIFIED / DIRECTLY SUPPORTED means directly supported by the supplied evidence.
- REASONABLE INFERENCE means a cautious conclusion drawn from supplied evidence, with the logic made clear.
- GENERAL MODEL CONTEXT must never be presented as confirmed fact about this exact vehicle.
- UNKNOWN / NOT VERIFIED means the evidence does not safely support a conclusion.

STRICT FORBIDDEN INVENTIONS
Do not invent, imply, or quietly assume:
- outstanding finance
- write-off history
- accident history
- ownership count
- keeper history
- service book history
- invoice history
- restoration history
- rarity or collector status
- public media appearances
- auction appearances unless explicitly supplied
- exact trim level
- exact engine/spec details not directly supported
- stolen status unless explicitly supplied
- originality unless explicitly supported
- cosmetic quality beyond what the images clearly show
- mechanical condition beyond what the supplied data supports
- underbody condition unless explicitly evidenced
- corrosion status unless actually visible or explicitly evidenced
- structural integrity unless explicitly evidenced
- repair completion unless explicitly evidenced

PHOTO INTERPRETATION RULES
- Treat images as limited evidence.
- Only describe what is visibly apparent in the supplied photos or image findings.
- Do not state that rust, filler, paint mismatch, dents, corrosion, or structural issues are absent unless that is genuinely clear from the images.
- Prefer cautious phrasing such as:
  - "No obvious ..."
  - "The supplied images suggest ..."
  - "This is not sufficient to confirm ..."
- Do not call the vehicle well-kept, cared for, original, restored, straight, honest, excellent, or similar unless the evidence truly supports that wording.
- Do not convert presentation into mechanical or structural confidence.

MOT INTERPRETATION RULES
- Use MOT history to identify patterns only where the data genuinely supports a pattern.
- Explain whether issues are isolated, repeated, escalating, improving, or inconclusive.
- MOT data does not prove overall condition, ownership quality, service quality, or structural integrity.
- Do not turn a small number of advisories into a dramatic narrative.
- Do not ignore repeated advisory themes where they exist.

WEB / PUBLIC EVIDENCE RULES
- Treat web findings as variable-quality evidence.
- Do not assume an online mention relates to this exact vehicle unless the supplied evidence supports that match clearly.
- Strong identifiers include registration, VIN, unique visible features, matching sale details, or highly specific contextual alignment.
- If a web finding appears to match only loosely, say so clearly.
- For each meaningful web finding, assess:
  - match strength to this exact vehicle
  - source type
  - likely reliability
  - practical value to a buyer
- Distinguish clearly between:
  - Confirmed Match
  - Probable Match
  - Possible Match
  - Too Weak to Rely On
- Do not inflate the significance of weak web matches.
- If no credible public trace exists, say so plainly.

WRITING RULES
- Use UK terminology and UK buyer context.
- Keep paragraphs readable and relatively tight.
- Avoid filler.
- Avoid repeating the same fact in multiple sections unless necessary.
- Be useful to a cautious buyer, inspector, negotiator, or investigator.
- Sound like a credible expert, not a marketer.
- If evidence is weak, the report should sound appropriately limited.

SUPPLIED FACTUAL MATERIAL

IDENTITY / DVLA EVIDENCE
${identitySection || "No identity evidence was supplied."}

MOT / CONDITION HISTORY EVIDENCE
${motSection || "No MOT or condition-history evidence was supplied."}

PUBLIC WEB / MENTION EVIDENCE
${webSection || "No web or public-mention evidence was supplied."}

IMAGE ANALYSIS EVIDENCE
${imageFindings || "No image analysis findings were provided."}

${getTierInstructions()}
${getTierSectionRules()}

FINAL SELF-CHECK BEFORE WRITING
Before producing the report, silently check:
1. Have I made any claim stronger than the supplied evidence supports?
2. Have I mixed general model knowledge into vehicle-specific fact?
3. Have I made any flattering or critical condition claim that the images do not really prove?
4. Have I treated absence of evidence as evidence of absence?
5. Have I explained the main unresolved risks clearly enough to help a buyer?
6. Have I explained source reliability and match strength properly for web findings?
7. Have I made this report more useful, not just longer?

OUTPUT RULES
- Return the report using the exact headings below.
- Use "## " headings exactly.
- Do not add extra top-level headings.
- Do not include chain-of-thought.
- Keep the report disciplined, evidence-led, and genuinely useful.
- If evidence is limited, say so plainly.
- Do not use bullet points excessively; use them only where they improve clarity.
- Make the report feel premium because it is sharper, more precise, and more useful than a normal summary.
- Do not write like a sales listing or magazine feature.
- Do not pad weak sections.

REQUIRED OUTPUT STRUCTURE

## Summary
Provide a tight but high-value summary of the vehicle and the most important findings.
Include an overall buyer stance, choosing the closest fit:
- Looks reasonable
- Proceed with caution
- Higher-risk example

The stance must be justified by the supplied evidence, not by tone.
This section should help a serious buyer understand the overall position quickly.

## Identity & Production
Use only the supplied identity evidence.
Explain:
- what is directly supported
- what appears plausible but not fully verified
- what remains unresolved
- whether there is any meaningful mismatch or identity-risk question

Do not imply full identity certainty if VIN/chassis validation is absent.
Do not present general model knowledge as confirmed vehicle identity.

## MOT & Condition Pattern Analysis
Use only the supplied MOT evidence.
Interpret:
- recurring advisories
- isolated failures
- repeat wear themes
- possible maintenance signals
- usage clues
- mileage consistency or confidence
- what the MOT history can and cannot tell us

If the evidence is weak or patchy, say so clearly.
Where relevant, explain whether a pattern appears mild, meaningful, or unresolved.

## Features & Technical Context
Split this section exactly into these subheadings:

### Vehicle-Specific Facts
Only include facts directly supported by supplied evidence.

### General Model Context
Include only helpful background that a buyer should know, but make it explicit that this is general model/platform/ownership context and not confirmed specification of this exact vehicle.

## Image-Based Observations
Split this section exactly into these subheadings:

### Directly Visible
State only what is plainly supported by the supplied images or image-analysis evidence.

### Suggested But Not Confirmed
State cautious visual inferences only where they are reasonable and explain why they remain unconfirmed.

### Not Assessable From Supplied Images
State what the photos do not allow you to verify.

## Risks, Inconsistencies & Open Questions
Prioritise concerns by seriousness and evidence strength.
Where useful, separate into:
- Major
- Moderate
- Minor

For each important point, explain:
- what the concern is
- what evidence supports it
- why it matters to a buyer
- what would confirm or resolve it

Focus on the most decision-relevant issues, not generic classic-car caveats unless they clearly matter here.

## Notable Mentions & Public Presence
Split this section exactly into these subheadings:

### Findings
Summarise the meaningful public-facing results found for the vehicle.

### Match Strength
For each meaningful result, state whether it looks like:
- Confirmed Match
- Probable Match
- Possible Match
- Too Weak to Rely On

Briefly explain why.

### Source Reliability
Assess the reliability of the source or sources.
Explain whether the source is primary, secondary, derivative, user-generated, commercial, archival, or otherwise limited.

### Buyer Relevance
Explain what, if anything, the finding adds for a buyer.
Examples might include:
- supports provenance
- supports market history
- supports mileage/context
- supports prior sale visibility
- adds little beyond surface-level visibility
- too weak to influence a buying decision

If there are no meaningful public findings, say so plainly and explain that this leaves provenance and public traceability limited.

## Recommended Next Steps
Give practical and specific actions for:
- viewing the car
- questions to ask the seller
- paperwork to inspect
- inspection priorities
- negotiation leverage

Every recommendation should connect to a real evidence gap, concern, or uncertainty in this case.
The output here should feel especially useful to a buyer preparing for first contact, viewing, or inspection.

## Confidence & Limitations
Score and explain the evidence quality using exactly this format:

- Identity Confidence: X/100
- Mileage Confidence: X/100
- Condition Confidence: X/100
- Documentary Confidence: X/100
- Visual Confidence: X/100
- Provenance Confidence: X/100
- Overall Confidence Score: X/100

Then explain briefly:
- what is driving confidence upward
- what is reducing confidence
- what still cannot be concluded safely

The score must be evidence-based, not cosmetic.

## Final Verdict
Give a short final judgement.
Be clear and decisive, but do not overstate certainty.
The verdict should help a buyer decide whether to move forward confidently, move forward carefully, or hold back pending further checks.
`.trim();
}

module.exports = { buildPrompt };
