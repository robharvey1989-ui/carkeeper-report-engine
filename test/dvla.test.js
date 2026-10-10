const test=require('node:test'), assert=require('node:assert/strict');
const {buildDvlaSection}=require('../services/dvla');
test('routine tax and V5C data do not become buying concerns',()=>{
 const report=buildDvlaSection({make:'BMW',taxStatus:'Untaxed',taxDueDate:'2026-08-01',dateOfLastV5CIssued:'2026-06-01'},{model:'320i',year:'2009'});
 assert.doesNotMatch(report,/Untaxed|2026-08-01|2026-06-01|may justify/);
 assert.match(report,/Year of manufacture: Unknown/);
 assert.match(report,/Model supplied by user: 320i/);
});
test('unavailable DVLA leaves supplied details unverified',()=>{
 const report=buildDvlaSection({error:'unavailable'},{make:'BMW'});
 assert.doesNotMatch(report,/Verified/); assert.match(report,/externally unverified/);
});
