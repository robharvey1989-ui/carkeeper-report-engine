// These checks request an evidence-based rewrite; they never delete adverse evidence.
function reportIssues(text) {
  const s=String(text || ''), issues=[];
  const identity=s.match(/^## DVLA Identity Check\s*\n([\s\S]*?)(?=^## |$(?![\s\S]))/mi)?.[1] || '';
  if (/^(?!.*(?:does not|cannot|not available|not provided|doesn't|unavailable|not verify)).*(?:finance|theft|write.off|scrappage)/mi.test(identity)) issues.push('DVLA identity section must not report finance, theft, write-off or scrappage clearance. Attribute any available results only to the history provider.');
  const unqualified=s.split(/\n|(?<=[.!?])\s+/).filter(line=>!/(?:seller (?:claims|says|reports|declares)|according to the seller|advert (?:claims|states|says)|not (?:proof|evidence)|cannot (?:confirm|establish)|does not (?:confirm|establish)|not established)/i.test(line)).join('\n');
  if (/\b(?:legal (?:and consistent )?(?:ownership|title)|consistent ownership trail|well.maintained|reasonably maintained|mechanically sound|genuine mileage|mileage (?:is |appears )?genuine)\b/i.test(unqualified)) issues.push('Replace unsupported ownership legality, maintenance or mileage-authenticity conclusions with attributed recorded facts or seller claims. A tidy photo or consistent MOT sequence does not establish these.');
  if (/\b(?:annual (?:use|mileage)|miles (?:per|a) year)\b/i.test(s)) issues.push('Omit annual mileage averages. Describe dated recorded readings instead; no unsupported usage arithmetic or driving-pattern inference.');
  if (/\b(?:tint|tinted)\b[^\n.]*(?:legal|legality|compliance)|\b(?:legal|legality|compliance)\b[^\n.]*(?:tint|tinted)/i.test(s)) issues.push('Do not raise tint legality from darkness in photos. Omit the concern unless supplied evidence explicitly identifies an applicable defect.');
  if (/\b(?:may reflect|could reflect)\b[^\n.]*(?:servic|dealer)/i.test(s)) issues.push('Do not invent an explanation for valuation differences such as servicing or a dealer offering.');
  if (/seller type (?:is )?(?:unspecified|unknown|not confirmed)/i.test(s) && /^Pricing Verdict:\s*(?:Excellent Value|Fairly Priced|Slightly Expensive|Significantly Overpriced)/mi.test(s)) issues.push('Seller type is unconfirmed: set Pricing Verdict to Not Available and give conditional dealer/private comparisons; do not choose one benchmark as the definitive verdict.');
  if (/\b(?:imminent replacement|near.term work|pending maintenance|expected repairs|repairs identified as likely)\b/i.test(s)) issues.push('Check each repair urgency claim against current declared faults or latest dated evidence. Historic advisories alone justify checking present condition, not assuming pending repairs.');
  return issues;
}
async function reviewReport({draft, prompt, revise}) {
  let report=String(draft || ''), issues=reportIssues(report);
  if (!issues.length) return {report, revised:false};
  report=String(await revise({prompt, draft:report, issues}) || '').trim();
  if (report.length<80 || reportIssues(report).length) {
    const error=new Error('The report did not pass its evidence quality check. Please retry or contact support with your order number.');
    error.code='REPORT_QUALITY_FAILED'; throw error;
  }
  return {report,revised:true};
}
module.exports={reportIssues,reviewReport};
