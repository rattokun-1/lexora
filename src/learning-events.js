/* A strict allowlist separates model data from account/profile state. */
(function(root){'use strict';
 const MODEL='fsrs6-default-v1',MAX_PENDING=500;
 function event(word,record,known,format,now=Date.now(),durationMs=null){
  const memory=root.TangoScheduler.memory(record,now);
  if(!['meaning-select','recall','spelling'].includes(format))return null;
  return {event_id:crypto.randomUUID(),word_id:String(word.id),format,correct:Boolean(known),
   elapsed_days:Math.min(3650,Math.max(0,memory.elapsed)),prediction:memory.retention,
   response_ms:Number.isFinite(durationMs)?Math.min(600000,Math.max(0,Math.round(durationMs))):null,
   model_version:root.LexoraModel?.version||MODEL,occurred_at:new Date(now).toISOString()};
 }
 function probability(retention,artifact){
  if(!artifact||artifact.kind!=='logistic-calibration-v1')return retention;
  const {intercept:a,slope:b}=artifact.parameters||{};
  if(!Number.isFinite(a)||!Number.isFinite(b)||b<=0||Math.abs(a)>5||b>5)return retention;
  const p=Math.max(.00001,Math.min(.99999,retention));
  return 1/(1+Math.exp(-(a+b*Math.log(p/(1-p)))));
 }
 const api={event,probability,MODEL,MAX_PENDING};root.LexoraLearning=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
