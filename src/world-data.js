/* Pure world layout and reward rules, shared by the UI and WebGL renderer. */
(function(root){
'use strict';
const THEMES=[
 {name:'田園',ground:0xb7da86,edge:0x9ab66a,tree:0x70a956,water:0x85cbd8,kind:'round'},
 {name:'杉の森',ground:0x89b88a,edge:0x668e72,tree:0x347969,water:0x79b8c3,kind:'pine'},
 {name:'桜の丘',ground:0xc4df9e,edge:0xa7b981,tree:0xf2a7c6,water:0xa7d7e5,kind:'round'},
 {name:'川辺の町',ground:0x91c6ae,edge:0x69a694,tree:0x519d89,water:0x6fc7d4,kind:'round'},
 {name:'漁港',ground:0xecd7a1,edge:0xccb87c,tree:0x68ad86,water:0x79cde5,kind:'palm'},
 {name:'海辺の町',ground:0xaad386,edge:0xd9c088,tree:0x429a69,water:0x61cbd5,kind:'palm'},
 {name:'宿場町',ground:0xcac39c,edge:0xa7a17b,tree:0x78966b,water:0x9ecfd2,kind:'round'},
 {name:'紅葉の谷',ground:0xceb77c,edge:0xa38c62,tree:0xe59458,water:0x83bcc2,kind:'round'},
 {name:'雪山',ground:0xe8eff5,edge:0xa5b8d0,tree:0x85aeb4,water:0x94b9db,kind:'snow'},
 {name:'城下町',ground:0xb9c6ad,edge:0x919f87,tree:0x76916d,water:0x8eb6d8,kind:'pine'},
 {name:'火山',ground:0xaaa0a5,edge:0x797480,tree:0xb87166,water:0xe99c6b,kind:'volcano'},
 {name:'温泉郷',ground:0xc1bca8,edge:0x959386,tree:0x7f9d80,water:0x9fcfd0,kind:'round'}
];
const REGIONS=[
 {name:'若葉県',cities:['田園市','木漏れ日市','花丘市','川辺市','果樹園市'],themes:[0,1,2,3,0]},
 {name:'潮風県',cities:['波音市','珊瑚市','帆影市','入江市','灯台市'],themes:[4,5,4,3,5]},
 {name:'琥珀県',cities:['街道市','湧水市','紅葉市','宿場市','城下市'],themes:[6,6,7,7,9]},
 {name:'白峰県',cities:['雪原市','氷湖市','渓谷市','湯沢市','頂上市'],themes:[8,8,9,11,8]},
 {name:'日向県',cities:['湯里市','杉原市','城見市','火口市','朝日市'],themes:[11,1,9,10,2]}
];
function build(route,completed=[],current,claimed=[]){
 const done=new Set(completed),gifts=new Set(claimed),cityCount=Math.ceil(route.length/10);
 const cities=Array.from({length:cityCount},(_,i)=>{const row=Math.floor(i/5),column=row%2?4-i%5:i%5,region=REGIONS[row%REGIONS.length];return {id:i,name:region.cities[i%5],region:region.name,regionIndex:row,theme:region.themes[i%5],x:(column-2)*32,z:(row-2)*32};});
 const nodes=route.map((index,i)=>{const city=cities[Math.floor(i/10)],j=i%10;return {index,step:i+1,city:city.id,x:city.x+[-8,-3,4,8,4,-3,-8,-3,4,8][j],z:city.z-11+j*2.5,done:done.has(index),active:index===current,open:done.has(index)||index===current};});
 const presents=[];
 for(let end=5;end<=route.length;end+=5){const node=nodes[end-1],city=cities[node.city],id='world-gift-'+end;presents.push({id,end,city:city.id,x:city.x+(end%10?12:-12),z:node.z,ready:route.slice(0,end).every(index=>done.has(index)),claimed:gifts.has(id),coins:end%10===0?30:15});}
 return {cities,nodes,presents,currentCity:nodes.find(n=>n.active)?.city??Math.max(0,cities.length-1),regions:REGIONS,themes:THEMES};
}
function claim(route,completed,claimed,id){const gift=build(route,completed,null,claimed).presents.find(g=>g.id===id);return gift&&gift.ready&&!gift.claimed?{id:gift.id,coins:gift.coins}:null;}
const api={THEMES,REGIONS,build,claim};root.TangoWorldData=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
