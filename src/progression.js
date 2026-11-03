(function(root) {
  'use strict';
  const SIZE = 10;
  const count = words => Math.ceil(words.length / SIZE);
  function completed(values, total) {
    return [...new Set(Array.isArray(values) ? values.filter(i => Number.isInteger(i) && i >= 0 && i < total) : [])].sort((a,b)=>a-b);
  }
  function order(total,saved) {
    if(Array.isArray(saved)&&saved.length===total&&new Set(saved).size===total&&saved.every(i=>Number.isInteger(i)&&i>=0&&i<total))return [...saved];
    return Array.from({length:total},(_,i)=>i);
  }
  function frontier(values, total, sequence) {
    const done=new Set(completed(values,total));
    return order(total,sequence).find(i=>!done.has(i)) ?? total;
  }
  function unlocked(index, values, total, sequence) {
    return Number.isInteger(index) && index>=0 && index<total && (completed(values,total).includes(index) || index===frontier(values,total,sequence));
  }
  function progress(words, saved) {
    const result={};
    if(!saved || typeof saved!=='object') return result;
    for(let i=0;i<count(words);i++) {
      const expected=new Set(words.slice(i*SIZE,(i+1)*SIZE).map(w=>w.id));
      const ids=Array.isArray(saved[i]) ? [...new Set(saved[i].filter(id=>expected.has(id)))] : [];
      if(ids.length) result[i]=ids;
    }
    return result;
  }
  function answer(words, saved, values, id, sequence) {
    const p=progress(words,saved), offset=words.findIndex(w=>w.id===id);
    if(offset<0) return p;
    const unit=Math.floor(offset/SIZE);
    if(!unlocked(unit,values,count(words),sequence)) return p;
    p[unit]=[...new Set([...(p[unit] || []),id])];
    return p;
  }
  function clear(words, saved, values, sequence) {
    const done=completed(values,count(words)), p=progress(words,saved);
    let next=frontier(done,count(words),sequence);
    while(next<count(words)) {
      const ids=words.slice(next*SIZE,(next+1)*SIZE).map(w=>w.id);
      if(!ids.every(id=>(p[next] || []).includes(id))) break;
      done.push(next); next=frontier(done,count(words),sequence);
    }
    return done.sort((a,b)=>a-b);
  }
  function dayKey(now=Date.now()) { return new Date(now+9*3600000).toISOString().slice(0,10); }
  function shiftDay(key,delta) { return new Date(Date.parse(`${key}T00:00:00Z`)+delta*86400000).toISOString().slice(0,10); }
  function week(key=dayKey()) {
    const day=(new Date(`${key}T00:00:00Z`).getUTCDay()+6)%7;
    return Array.from({length:7},(_,i)=>shiftDay(key,i-day));
  }
  const api={SIZE,count,completed,order,frontier,unlocked,progress,answer,clear,dayKey,shiftDay,week};
  root.TangoProgress=api;
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
})(globalThis);
