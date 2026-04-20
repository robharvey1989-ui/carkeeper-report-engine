function getTierInstructions() {
  return `
TIER: PREMIUM SALES ADVERT

Write a premium, evidence-led UK vehicle sales advert based only on the supplied evidence.

CORE PREMIUM BEHAVIOUR
- Think like an experienced classic and specialist car sales writer, provenance researcher, and careful vehicle presenter.
- The objective is to produce an advert that helps sell the car well, but never at the expense of accuracy.
- The advert must be attractive, well-structured, credible, and persuasive without exaggeration.
- Every meaningful claim must be traceable to supplied evidence.
- If the evidence does not justify a positive claim, do not imply it.
- Do not use vague sales fluff to fill gaps.
- Do not oversell.
- Do not invent provenance, service history, restoration history, rarity, ownership quality, specification, condition, originality, or desirability.
- Write in a way that makes the car sound appealing where justified, while remaining completely defensible.
- Prioritise clarity, confidence, readability, and buyer trust.
- The best advert is one that makes a buyer want to enquire because it feels both attractive and believable.

MANDATORY EVIDENCE CATEGORIES
Every material point must fit one of these:
- VERIFIED / DIRECTLY SUPPORTED
- REASONABLE INFERENCE
- GENERAL MODEL CONTEXT
- UNKNOWN / NOT VERIFIED

CATEGORY RULES
- VERIFIED / DIRECTLY SUPPORTED means directly grounded in supplied evidence.
- REASONABLE INFERENCE means a cautious conclusion drawn from supplied evidence, with the link explained internally before writing.
- GENERAL MODEL CONTEXT means broad model/platform background and must never be presented as fact about this exact vehicle.
- UNKNOWN / NOT VERIFIED means the evidence does not safely support a conclusion.

PREMIUM OUTPUT STANDARD
- Strong advert headline
- Attractive but accurate overview
- Clear highlights
- Honest, well-presented condition description based only on evidence
- Useful history and provenance summary where supported
- Strong feature/specification section without inventing trim-specific facts
- Clear statement of what is not confirmed where relevant
- A professional advert tone suitable for a serious sales platform
- Strong enough to convert interest, restrained enough to preserve trust

SELLER-VALUE RULE
This advert should:
- make the car sound worth enquiring about
- help the seller present the vehicle professionally
- help the buyer understand what is known about the vehicle
- create confidence through clarity
- avoid the kind of exaggerated wording that weakens trust
- feel better than a typical private sale advert because it is sharper, more structured, and more evidence-led

WEB EVIDENCE SALES STANDARD
- Use public findings only where they genuinely strengthen the advert.
- If a public trace supports provenance, prior sale visibility, market presence, or identity confidence, use it carefully.
- If a source is weak, loosely matched, derivative, reposted, or uncertain, do not build meaningful advert claims on it.
- Discoverability is not the same as credibility.
- Online traces should only appear in the advert if they genuinely add value and can be expressed accurately.

STRICT ANTI-HALLUCINATION RULES
Do NOT invent, imply, or quietly assume:
- finance status
- write-off status
- accident history
- keeper count
- ownership history
- auction history unless explicitly supported
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
- that the car is "excellent", "beautifully maintained", "exceptional", "show-winning", "investment-grade", "collector-quality", "immaculate", "fully restored", or similar unless the supplied evidence genuinely supports that wording

IMAGE DISCIPLINE
- Treat images as limited evidence, not proof of full condition.
- Only describe what is actually visible in the supplied images or image findings.
- Prefer phrasing such as:
  - "The supplied photos show ..."
  - "The supplied images suggest ..."
  - "No obvious ... is visible in the supplied images"
  - "This is not sufficient to confirm ..."
- Do NOT claim that rust, filler, corrosion, paint mismatch, previous repair, straightness, originality, or panel integrity are absent unless the supplied images truly justify that conclusion.
- Do NOT convert presentation into full condition certainty.
- Do NOT claim mechanical soundness, structural health, or restoration quality from cosmetic photos alone.

MOT DISCIPLINE
- MOT history can support maintenance themes, usage patterns, and testing history, but cannot prove overall quality or condition.
- State whether MOT issues appear isolated, repeated, improving, or inconclusive only where the evidence supports that.
- Do not overstate minor or historic advisories.
- Do not ignore repeated advisory themes where they materially shape buyer understanding.

WEB / PUBLIC EVIDENCE RULES
- Treat web findings as variable-quality evidence.
- Do not assume an online mention relates to this exact vehicle unless the supplied evidence supports that match clearly.
- Strong identifiers include registration, VIN, unique visible features, matching sale details, or highly specific contextual alignment.
- If a web finding appears to match only loosely, say so clearly internally and avoid strong advert claims based on it.
- For each meaningful web finding, assess:
  - match strength to this exact vehicle
  - source type
  - likely reliability
  - practical value to a prospective buyer
- Distinguish internally between:
  - Confirmed Match
  - Probable Match
  - Possible Match
  - Too Weak to Rely On
- Do not inflate the significance of weak web matches.
- If no credible public trace exists, say so plainly only if relevant; otherwise omit it rather than padding the advert.

IF EVIDENCE IS THIN
- Say less, not more
- Keep weak sections tight
- Focus on what is genuinely supported
- Do not pad with generic classic-car language
`;
}

function getTierSectionRules() {
  return `
SECTION DEPTH RULES FOR PREMIUM SALES ADVERT
- Headline: concise, appealing, specific where evidence allows
- At a Glance: clear summary of the car and why it is worth attention
- Overview: strongest evidence-led selling description without hype
- Vehicle Highlights: only include supported positives or careful inferences
- Condition & Presentation: based strictly on visible and documentary evidence
- History & Background: include only what is directly supported or cautiously inferable
- Features & Technical Context: strictly separate vehicle-specific facts from general model context
- Buyer Confidence Notes: honest clarification of what is supported versus not verified
- Closing Summary: finish with a strong but accurate sales-oriented conclusion
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
Write a premium UK vehicle sales advert for this vehicle.

The advert must be attractive, professional, and persuasive while remaining strictly accurate and evidence-led.

VEHICLE DETAILS PROVIDED BY USER
- Registration: ${registration || "Not provided"}
- VIN: ${vin || "Not provided"}
- Make: ${make || "Not provided"}
- Model: ${model || "Not provided"}
- Year: ${year || "Not provided"}
- Tier: premium sales advert

USER CONTEXT
- Notes: ${notes || "None provided"}
- Main goal: ${goal || "None provided"}
- Follow-up answer 1: ${followup_q1 || "None provided"}
- Follow-up answer 2: ${followup_q2 || "None provided"}

CORE EVIDENCE RULES
- Use only the supplied evidence below.
- Never fabricate facts.
- Never claim a check was done unless the supplied evidence shows it was done.
- Unknowns must be handled carefully.
- Do not present assumptions as facts.
- Do not strengthen weak evidence with confident wording.
- Do not use empty persuasive language.
- Do not write like a speculative magazine feature.
- Do not write like a buyer-risk report.
- Write like a professional sales advert that earns trust through accuracy.
- If a point is not supported, omit it.
- If a section is thin, keep it thin and honest.
- Do not treat absence of evidence as evidence of absence.

MANDATORY CLASSIFICATION RULE
Every material point in the advert must fit one of these categories:
- VERIFIED / DIRECTLY SUPPORTED
- REASONABLE INFERENCE
- GENERAL MODEL CONTEXT
- UNKNOWN / NOT VERIFIED

IMPORTANT CATEGORY RULES
- VERIFIED / DIRECTLY SUPPORTED means directly supported by the supplied evidence.
- REASONABLE INFERENCE means a cautious conclusion drawn from supplied evidence.
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
  - "The supplied images show ..."
  - "The supplied photos suggest ..."
  - "No obvious ..."
  - "This is not sufficient to confirm ..."
- Do not call the vehicle immaculate, exceptional, beautifully restored, highly original, or similar unless the evidence truly supports that wording.
- Do not convert presentation into mechanical or structural confidence.

MOT INTERPRETATION RULES
- Use MOT history only where it genuinely supports a useful understanding of the vehicle.
- Explain internally whether issues are isolated, repeated, improving, or inconclusive.
- MOT data does not prove overall condition, ownership quality, service quality, or structural integrity.
- Do not turn a small number of advisories into a dramatic narrative.
- Do not ignore repeated advisory themes where they exist.
- In the advert itself, use MOT-derived information selectively and professionally.

WEB / PUBLIC EVIDENCE RULES
- Treat web findings as variable-quality evidence.
- Do not assume an online mention relates to this exact vehicle unless the supplied evidence supports that match clearly.
- Strong identifiers include registration, VIN, unique visible features, matching sale details, or highly specific contextual alignment.
- If a web finding appears to match only loosely, do not use it as a strong selling point.
- Use public findings only where they add genuine credibility or useful background.
- If no credible public trace exists, do not pad the advert by discussing the lack of it unless clearly relevant.

WRITING RULES
- Use UK terminology and UK sales context.
- Keep paragraphs readable and well-paced.
- Avoid filler and repeated points.
- Sound professional, credible, and polished.
- The tone should be premium but restrained.
- The advert should feel better than a normal classified advert because it is clearer, sharper, and more trustworthy.
- Avoid overuse of exclamation marks, clichés, and generic enthusiast phrases.
- Do not use cheesy or exaggerated marketing lines.
- Make the car sound appealing through specifics, not hype.

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
Before producing the advert, silently check:
1. Have I made any claim stronger than the supplied evidence supports?
2. Have I mixed general model knowledge into vehicle-specific fact?
3. Have I made any flattering condition claim that the images do not really prove?
4. Have I treated absence of evidence as evidence of absence?
5. Does this sound like a premium advert rather than a buyer-risk report?
6. Is the advert genuinely attractive without becoming inaccurate?
7. Have I included only what helps present the vehicle honestly and well?

OUTPUT RULES
- Return the advert using the exact headings below.
- Use "## " headings exactly.
- Do not add extra top-level headings.
- Do not include chain-of-thought.
- Keep the advert disciplined, credible, and sales-oriented.
- If evidence is limited, write a tighter advert rather than padding.
- Use bullet points where they improve clarity.
- Make the advert feel premium because it is sharper, cleaner, and more useful than a normal listing.
- Do not write a buyer warning report.
- Do not pad weak sections.
- Do not include confidence scores.
- Do not include negotiation advice.
- Do not include a final verdict in buyer-risk language.

REQUIRED OUTPUT STRUCTURE

## Advert Headline
Write a strong, concise advert headline for the vehicle.
It should feel premium and appealing, but only include specifics that are genuinely supported.

## At a Glance
Give a short opening summary that quickly tells a prospective buyer what this vehicle is and why it is worth attention.
This should be clean, readable, and professional.

## Overview
Write the main sales description.
This should be the strongest section in the advert.
Make the car sound appealing, well-presented, and worth enquiring about, but remain fully grounded in the supplied evidence.
Where the evidence is limited, keep the writing tighter rather than filling space.

## Vehicle Highlights
Use bullet points for key selling points that are directly supported by the evidence.
Only include points that are genuinely useful in a sales advert.

## Condition & Presentation
Summarise the visible presentation and any careful condition-related observations that are supported by the supplied evidence.
Be positive where justified, but honest and restrained.
Do not present full condition certainty if the evidence does not support it.

## History & Background
Summarise any useful identity, MOT, provenance, or public-trace information that genuinely strengthens the advert.
Only include points that are supported.
Do not force this section if little is known.

## Features & Technical Context
Split this section exactly into these subheadings:

### Vehicle-Specific Facts
Only include facts directly supported by supplied evidence.

### General Model Context
Include only helpful background that may make the advert more informative, but make it clear internally that this is general context and not confirmed specification of this exact vehicle.
Write this in a way that reads naturally in an advert without misleading the buyer.

## Buyer Confidence Notes
This section should help preserve trust.
Briefly and professionally clarify any important limitations in the available evidence.
Do not make the advert negative.
Examples:
- where full specification is not verified
- where condition cannot be fully judged from supplied images
- where provenance is limited
This section should make the advert feel honest and credible rather than defensive.

## Closing Summary
End with a concise closing paragraph that presents the vehicle well and encourages serious interest.
This should feel like the final paragraph of a premium specialist sale advert.
Do not use pushy sales language.
`.trim();
}

module.exports = { buildPrompt };
