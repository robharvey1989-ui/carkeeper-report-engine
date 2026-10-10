const test=require('node:test'),assert=require('node:assert/strict');
const {reportIssues,reviewReport}=require('../services/reportReview');
const good='## Buyer Snapshot\nTraffic Light: Amber\nBuyer Score: 6.5/10\nPricing Verdict: Not Available\nBuyer Stance: Proceed with Caution\n## DVLA Identity Check\nDVLA does not confirm finance, theft or write-off history.\n## Vehicle Valuation\nSeller type is unknown; compare dealer and private benchmarks conditionally.\n## Final Verdict - Would I Buy This Vehicle?\nPossibly, after inspection of the dated brake advisories.';
test('BMW errors trigger review without deleting records',()=>{
 const draft=good.replace('DVLA does not confirm finance, theft or write-off history.','No indicators of finance, theft, or scrappage from DVLA data.')+'\nReasonably maintained. Annual mileage ~4,660. Legal and consistent ownership trail. Rear window tint legal compliance. Tyres may require near-term work.';
 assert.ok(reportIssues(draft).length>=5);
});
test('negative DVLA limitations and conditional pricing pass',()=>assert.deepEqual(reportIssues(good),[]));
test('clean report avoids additional model call',async()=>{
 const result=await reviewReport({draft:good,revise:()=>{throw new Error('unexpected call');}});
 assert.equal(result.revised,false);assert.equal(result.report,good);
});
test('flagged report is revised once with original evidence and findings',async()=>{
 let calls=0;const result=await reviewReport({draft:good+'\nReasonably maintained.',prompt:'original evidence',revise:async x=>{calls++;assert.equal(x.prompt,'original evidence');assert.ok(x.issues.length);return good;}});
 assert.equal(calls,1);assert.equal(result.revised,true);
});
test('persistent errors and empty revisions cannot return successful reports',async()=>{
 for(const revised of ['',good+'\nReasonably maintained.']){
 let calls=0;await assert.rejects(reviewReport({draft:good+'\nReasonably maintained.',revise:async()=>{calls++;return revised;}}),{code:'REPORT_QUALITY_FAILED'});assert.equal(calls,1);
 }
});

test('attributed seller maintenance claims and explicit limitations are not silently removed',()=>{
 assert.deepEqual(reportIssues(good+'\nThe seller claims the car is well-maintained.\nPhotos cannot establish genuine mileage.'),[]);
});
