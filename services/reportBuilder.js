function getTierInstructions() {
  return `
TIER: PREMIUM SALES ADVERT

Write a clean, natural UK vehicle sales advert.

PRIMARY OBJECTIVE
- This must read like a real person wrote it.
- It should feel like a strong private sale or dealer advert.
- It should be clear, confident, and easy to read.
- It should present the car in the best possible light WITHOUT exaggeration.

CORE RULES
- Use only the supplied evidence.
- Do not invent anything.
- Do not guess spec, history, ownership, or condition.
- If something isn’t supported, leave it out.
- Do not explain uncertainty unless it actually matters.

ANTI-AI / ANTI-FLuff RULES
Do NOT use phrases like:
- "presents well"
- "offers a balance"
- "well suited for"
- "the kind of car that"
- "represents"
- "sensible choice"
- "documented mileage"
- "prospective buyers"
- "it should be noted"
- "the supplied images"
- "the photos suggest"
- "this indicates"

Instead:
- just say what’s there
- keep it simple
- keep it real

WRITING STYLE
- Shorter sentences
- Less explanation
- More direct statements
- Natural flow
- Slightly informal but still professional
- No waffle

IMAGE RULE
- Describe what is visible as if you are standing next to the car
- Never say “in the images” or “supplied photos”
- Just describe it naturally

MOT RULE
- Mention only useful points
- Keep it short
- No analysis tone

GOAL
A buyer should read this and think:
“This sounds like a decent, honest car”
NOT:
“This sounds like a report”
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
  imageFindings = "",
  notes = ""
}) {
  return `
Write a UK vehicle sales advert.

IMPORTANT:
- This must sound human
- Keep it concise
- No fluff
- No report-style language
- No mention of “supplied” anything

VEHICLE DETAILS
- Registration: ${registration || "Not provided"}
- Make: ${make || "Not provided"}
- Model: ${model || "Not provided"}
- Year: ${year || "Not provided"}

DATA AVAILABLE
IDENTITY:
${identitySection || "None"}

MOT:
${motSection || "None"}

WEB:
${webSection || "None"}

IMAGES:
${imageFindings || "None"}

${getTierInstructions()}

OUTPUT STRUCTURE

## Headline
Short, clean, like a real advert title.

## Opening
1 short paragraph. Natural and engaging.

## Description
Main body.
Keep it tight and readable.
No filler.

## Highlights
Bullet points.
Only strong, real points.

## Condition
Natural, honest description.
No “photos show” wording.

## History
Short and simple.

## Spec
Facts only.

## Closing
1 short paragraph.
Clean, confident finish.
No sales clichés.
`.trim();
}

module.exports = { buildPrompt };
