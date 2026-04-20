function getTierInstructions() {
  return `
TIER: PREMIUM SALES ADVERT

Write a premium UK vehicle sales advert based only on the supplied evidence.

PRIMARY OBJECTIVE
- The advert must read like it was written by a good private seller or specialist car sales team, not by an inspector, analyst, or compliance system.
- It should feel natural, confident, readable, and appealing.
- It should help the vehicle sound desirable without becoming exaggerated, artificial, or vague.
- It must stay accurate and evidence-led.

CORE BEHAVIOUR
- Write like a human who is genuinely trying to present the car properly.
- The tone should feel natural and polished, not clinical.
- Use flowing advert language, not report language.
- Make the car sound attractive through specific, believable details rather than generic praise.
- The best output should feel like a strong Auto Trader / dealer / enthusiast advert, not a checklist or a technical summary.
- Keep the tone warm, grounded, and credible.

STRICT ACCURACY RULE
- Every meaningful factual claim must be traceable to supplied evidence.
- If the evidence does not justify a claim, do not make it.
- Do not invent ownership stories, emotional backstory, maintenance history, restoration history, rarity, originality, or desirability.
- Do not imply the seller’s personal experience unless it has been supplied.
- Do not fabricate “drives superbly”, “starts on the button”, “pulls well”, “wants for nothing”, “well loved”, “cherished”, or similar phrases unless supported by evidence.

ANTI-REPORT RULE
Do NOT write like:
- a buyer-risk report
- an inspection summary
- a forensic analysis
- a cautious consultant memo
- a vehicle provenance report

Do NOT use language such as:
- “documented mileage” unless genuinely necessary
- “prospective buyers”
- “buyer confidence”
- “vehicle-specific facts”
- “general model context”
- “reasonable inference”
- “unknown / not verified”
- “it represents”
- “roadworthy condition”
- “continued use”
- “usage clues”
- “identity confidence”
- “evidence suggests” repeatedly
- “it should be noted”
- “this indicates”
- “this may merit”
- “source reliability”
- “public traceability”

Instead, write in a more natural advert voice.

TARGET STYLE
- Natural, clean UK advert style
- Specialist but approachable
- Human rather than robotic
- Sales-focused without sounding pushy
- Informative without sounding legalistic
- Honest without constantly highlighting uncertainty
- Readable enough that a real seller would happily post it as their advert

LANGUAGE STYLE RULES
- Prefer natural phrasing such as:
  - "This Astra presents well for its age"
  - "A tidy, practical five-door hatchback"
  - "The interior looks smart and well kept in the supplied photos"
  - "A solid-looking example with sensible mileage"
  - "A straightforward, usable car"
  - "The MOT history shows mainly age- and wear-related items"
- Avoid over-formal phrasing such as:
  - "documented mileage progression"
  - "continued roadworthiness"
  - "well-known engineering"
  - "private-market presentation"
  - "mileage credibility"
  - "vehicle identity strength"
- Vary sentence length so it feels written, not generated.
- Let the advert breathe. It should not feel like every sentence is trying to qualify itself.

IMAGE DISCIPLINE
- Only describe what is actually visible in the supplied images or image findings.
- You may present visible positives naturally, but do not overclaim.
- Good example: "The car looks tidy in the supplied photos, with a clean interior and smart overall presentation."
- Bad example: "The vehicle is in excellent cosmetic and structural condition."
- Do not claim absence of rust, paintwork issues, prior repairs, corrosion, or structural problems unless clearly evidenced.

MOT DISCIPLINE
- Use MOT history to support the advert where helpful, but do not turn it into a report section.
- If the MOT history mainly shows minor wear-related items, that can be summarised naturally.
- If repeated advisories matter, mention them briefly and honestly.
- Do not over-explain MOT logic unless necessary.

WEB / PUBLIC EVIDENCE RULES
- Only use public findings if they genuinely help the advert.
- If there is no meaningful public trace, usually omit that entirely.
- Do not talk about source reliability, match confidence, or public traceability in the advert itself.

IF EVIDENCE IS LIMITED
- Write a shorter, cleaner advert.
- Do not pad with generic filler.
- Do not compensate with fake enthusiasm.
- Keep it believable.

OVERALL RESULT
The finished advert should feel like:
- a real person wrote it
- the car has been presented properly
- the seller is honest and credible
- the listing is stronger than a typical private advert
- the reader would be happy to enquire
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

This is NOT a buyer-risk report.
This is NOT an inspection report.
This is NOT a forensic analysis.
It must read like a genuine, well-written advert that a real seller or specialist would publish.

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

CORE RULES
- Use only the supplied evidence below.
- Never fabricate facts.
- Never present assumptions as confirmed facts.
- Do not write in a report-like tone.
- Do not sound clinical, legalistic, or robotic.
- Do not overuse cautionary phrases.
- Do not keep reminding the reader about uncertainty unless it is genuinely important.
- Do not talk to the reader like an analyst addressing a buyer.
- Write like someone presenting the car for sale properly.

WHAT THE ADVERT SHOULD DO
- Open strongly
- Present the car in an appealing but believable way
- Use natural sales language
- Highlight what makes it worth considering
- Mention useful condition/history points without sounding defensive
- End in a way that encourages genuine interest

WHAT THE ADVERT MUST NOT DO
- Read like a report
- Read like bullet-pointed evidence
- Sound emotionally empty
- Use fake enthusiasm
- Use inflated claims
- Invent ownership history, restoration history, service history, rarity, provenance, or condition claims
- Use phrases like "buyer confidence notes", "vehicle-specific facts", "general model context", "identity confidence", or similar report language

STYLE RULES
- Use UK terminology.
- Write in a natural advert tone.
- The advert should feel like something a capable seller would actually publish.
- Let the writing flow naturally.
- Use some personality in the phrasing, but only where it stays believable.
- Keep it polished and premium, but not stiff.
- Avoid sounding like AI-generated copy.

GOOD TONE EXAMPLES
- "A tidy and practical example"
- "A smart-looking five-door hatchback"
- "A well-presented car with sensible mileage"
- "The interior looks clean and honest in the supplied photos"
- "A straightforward, usable car that should suit anyone after dependable everyday motoring"
- "The MOT history appears broadly in keeping with age and mileage"

BAD TONE EXAMPLES
- "documented mileage progression"
- "vehicle presents as a solid example"
- "continued roadworthiness"
- "usage clues"
- "identity evidence"
- "public trace"
- "prospective buyers should note"
- "buyer confidence notes"
- "reasonable inference"
- "general model context"
- "roadworthy condition for its age"

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

FINAL SELF-CHECK BEFORE WRITING
Before producing the advert, silently check:
1. Does this read like a real advert rather than a report?
2. Does it sound like a human wrote it?
3. Have I kept it natural without inventing facts?
4. Have I avoided over-formal language?
5. Does the car sound appealing in a believable way?
6. If the evidence is thin, have I kept it concise rather than padded?

OUTPUT RULES
- Return the advert using the exact headings below.
- Use "## " headings exactly.
- Keep the writing natural and flowing under each heading.
- Bullet points are allowed only where they genuinely improve readability.
- Do not include any scoring.
- Do not include any warnings section.
- Do not include any buyer-advice section.
- Do not include any confidence section.
- Do not include any analysis language.
- Do not mention what has not been verified unless it matters to the credibility of the advert.
- Make it feel like a proper for-sale listing.

REQUIRED OUTPUT STRUCTURE

## Headline
Write a clean, attractive sales headline for the car.
It should feel like a real advert title.

## Opening Description
Write a short opening paragraph that introduces the car naturally and makes it sound worth a closer look.

## Full Description
Write the main body of the advert in natural prose.
This should feel like the core of a proper sale listing.
It should be readable, human, and appealing.

## Highlights
Use bullet points for the strongest supported selling points only.

## Condition
Summarise visible condition and presentation naturally.
Be positive where justified, but keep it believable.

## History
Summarise any useful MOT, registration, or background information in a clean and natural way.
Do not turn this into a report.

## Specification
Include supported facts such as engine size, fuel type, transmission, body style, colour, etc where supplied.
Do not invent trim/spec details.

## Final Paragraph
Finish with a natural closing paragraph that makes the car sound like a worthwhile example and encourages interest without sounding pushy.
`.trim();
}

module.exports = { buildPrompt };
