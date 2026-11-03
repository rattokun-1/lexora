const test=require('node:test'),assert=require('node:assert/strict');
global.TangoScheduler=require('../src/scheduler.js');
const learning=require('../src/learning-events.js'),{train}=require('../scripts/train-model.cjs');
test('model events use an allowlist and exclude account identifiers',()=>{
 const e=learning.event({id:1,word:'secret'}, {name:'Private',email:'private@example.com'},true,'recall');
 assert.deepEqual(Object.keys(e).sort(),['correct','elapsed_days','event_id','format','model_version','occurred_at','prediction','response_ms','word_id']);
 assert(!JSON.stringify(e).includes('private@example.com'));assert.equal(learning.event({id:1},null,false,'study'),null);
});
test('optimizer rejects insufficient data',()=>assert.throws(()=>train([]),/Need/));
test('custom calibration learns systematic prediction bias on held-out learners',()=>{
 const rows=Array.from({length:2000},(_,i)=>({subject_id:'learner-'+i%100,elapsed_days:2,format:'recall',prediction:.5,correct:i%10<8}));
 const model=train(rows);assert(model.eligible);assert(model.validation.logLoss<model.baseline.logLoss);
 assert(!JSON.stringify(model).includes('learner-'));assert(learning.probability(.5,model)>.5);
});
test('the new region is gated and seasonal activities do not block study',()=>{
 const a=require('../src/adventure-data.js');assert.equal(a.highest(12),5);assert.equal(a.highest(8),4);assert(['春','夏','秋','冬'].includes(a.season));assert(a.POINTS.some(p=>p.id==='season-camp'));
});
