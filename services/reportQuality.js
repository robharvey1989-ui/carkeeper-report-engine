// Calculations and presentation consistency; no vehicle-condition inference.
function parseMoney(value) {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;
  const text = String(value ?? '').trim().replace(/^£\s*/, '').replace(/,/g, '');
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  const amount = Number(text);
  return amount > 0 ? amount : null;
}
function valuationComparisons(section, askingPrice) {
  const asking = parseMoney(askingPrice);
  if (!asking) return [];
  let data;
  try { data = typeof section === 'string' ? JSON.parse(section) : section; } catch { return []; }
  const results = [], seen = new Set();
  function walk(value) {
    if (!value || typeof value !== 'object') return;
    for (const [key, val] of Object.entries(value)) {
      const normal = key.toLowerCase().replace(/[^a-z]/g, '');
      const labels = {dealerforecourt:'Dealer Forecourt',dealerforecourtvalue:'Dealer Forecourt',privateclean:'Private Clean',privatecleanvalue:'Private Clean',privateaverage:'Private Average',privateaveragevalue:'Private Average'};
      const label = labels[normal];
      const amount = parseMoney(val);
      if (label && amount && !seen.has(label)) {
        seen.add(label);
        results.push({label, value:amount, askingPrice:asking, difference:Math.round((asking-amount)*100)/100, percentage:Math.round(((asking-amount)/amount)*1000)/10});
      }
      if (val && typeof val === 'object') walk(val);
    }
  }
  walk(data);
  return results;
}
function latestMotContext(motData) {
  const records = motData?.motTests || motData?.mot_tests || motData?.tests || motData?.MOTTests || [];
  if (!Array.isArray(records)) return {mileage:'', date:'', unit:''};
  const dated = records.filter(Boolean).map(test => ({test,date:test.completedDate || test.testDate || test.date || ''})).filter(row => Number.isFinite(Date.parse(row.date))).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
  if (!dated.length) return {mileage:'', date:'', unit:''};
  const {test,date} = dated[0];
  return {mileage:String(test.odometerValue ?? test.odometer_value ?? test.mileage ?? test.OdometerValue ?? '').replace(/[^\d]/g,''),date,unit:String(test.odometerUnit || test.odometer_unit || test.mileageUnit || '')};
}
function normaliseRecommendation(text) {
  // Restrict matching to the snapshot; never use incidental prose to set the rating.
  const match = String(text).match(/^## Buyer Snapshot\s*\n([\s\S]*?)(?=^## |$(?![\s\S]))/mi);
  if (!match) return text;
  const stance = match[1].match(/^Buyer Stance:\s*(Proceed with Caution|Cautious Interest|High Risk|Walk Away|Proceed)[ \t]*\.?[ \t]*$/mi);
  if (!stance) return text;
  const canonical = {'proceed':'Proceed','proceed with caution':'Proceed with Caution','cautious interest':'Cautious Interest','high risk':'High Risk','walk away':'Walk Away'}[stance[1].toLowerCase()];
  const light = {Proceed:'Green','Proceed with Caution':'Amber','Cautious Interest':'Amber','High Risk':'Red','Walk Away':'Red'}[canonical];
  return String(text).replace(/^Traffic Light:[ \t]*(?:Green|Amber|Red)[ \t]*\.?[ \t]*$/gmi, 'Traffic Light: '+light).replace(/^Buyer Stance:[ \t]*(?:Proceed with Caution|Cautious Interest|High Risk|Walk Away|Proceed)[ \t]*\.?[ \t]*$/gmi,'Buyer Stance: '+canonical);
}
module.exports = {parseMoney,valuationComparisons,latestMotContext,normaliseRecommendation};
