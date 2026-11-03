/* Virtual study coins only. Normal weights and the tenth-draw rule are separate. */
(function(root){
  'use strict';
  const rewards=[
    {id:'hp5',name:'HP +5',rarity:'N',weight:20,kind:'hp',amount:5},
    {id:'stock1',name:'HP回復ストック ×1',rarity:'N',weight:25,kind:'hpStock',amount:1},
    {id:'stock3',name:'HP回復ストック ×3',rarity:'N',weight:15,kind:'hpStock',amount:3},
    {id:'keep',name:'連続記録キープ ×1',rarity:'R',weight:10,kind:'streakKeep',amount:1},
    {id:'focus',name:'FOCUS',rarity:'R',weight:8,kind:'badge',note:'集中のしるし'},
    {id:'sakura-star',name:'SAKURA STAR',rarity:'R',weight:8,kind:'badge',note:'春色のしるし'},
    {id:'lunar',name:'LUNAR',rarity:'SR',weight:3,kind:'badge',note:'月明かりの静けさ'},
    {id:'comet',name:'COMET',rarity:'SR',weight:3,kind:'badge',note:'一歩ずつ、遠くへ'},
    {id:'tidal',name:'TIDAL',rarity:'SR',weight:3,kind:'badge',note:'知識の波をつかまえて'},
    {id:'verdant',name:'VERDANT',rarity:'SR',weight:3,kind:'badge',note:'毎日の小さな芽吹き'},
    {id:'prism',name:'PRISM',rarity:'SSR',weight:1,kind:'badge',note:'光を集める探究者'},
    {id:'orbit',name:'ORBIT',rarity:'SSR',weight:1,kind:'badge',note:'学びは、どこまでも'}
  ];
  const integer=(value,max=1000000000)=>Math.min(max,Math.max(0,Math.floor(Number(value)||0)));
  function normalize(saved){return {total:integer(saved?.total),cycle:integer(saved?.cycle,9),history:Array.isArray(saved?.history)?saved.history.filter(x=>rewards.some(r=>r.id===x?.id)&&Number.isFinite(x.at)&&x.at>=0&&x.at<=8640000000000000).slice(0,30).map(x=>{const r=rewards.find(r=>r.id===x.id);return {id:r.id,name:r.name,rarity:r.rarity,kind:r.kind,at:x.at,number:integer(x.number),effect:String(x.effect||'').slice(0,160),duplicate:Boolean(x.duplicate),guaranteed:Boolean(x.guaranteed),refund:integer(x.refund,75)};}):[]};}
  function random(){if(root.crypto?.getRandomValues){const value=new Uint32Array(1);root.crypto.getRandomValues(value);return value[0]/4294967296;}return Math.random();}
  function pick(pool,rng){const point=Math.min(1-Number.EPSILON,Math.max(0,Number(rng())||0))*pool.reduce((sum,r)=>sum+r.weight,0);let sum=0;return pool.find(r=>(sum+=r.weight)>point)||pool[pool.length-1];}
  function draw(saved,count=1,rng=random,now=Date.now()){
    if(![1,5].includes(count))return {ok:false,reason:'count'};
    const cost=count*100,coin=integer(saved?.coin);if(coin<cost)return {ok:false,reason:'coins'};
    const gacha=normalize(saved?.gacha),owned=new Set(saved?.ownedBadges||[]),items={hpStock:integer(saved?.items?.hpStock),streakKeep:integer(saved?.items?.streakKeep)};
    let hp=Math.min(30,integer(saved?.hp,30)),refund=0;const results=[];
    for(let i=0;i<count;i++){
      const guaranteed=gacha.cycle===9;
      let pool=rewards;
      if(guaranteed){const unowned=rewards.filter(r=>r.kind==='badge'&&!owned.has(r.id));pool=(unowned.length?unowned:rewards.filter(r=>r.kind==='badge')).map(r=>({...r,weight:1}));}
      const reward=pick(pool,rng),duplicate=reward.kind==='badge'&&owned.has(reward.id),returned=duplicate?({R:25,SR:40,SSR:75}[reward.rarity]||25):0;
      let effect=reward.kind==='badge'?'プロフィールに装備できます':'';
      if(reward.kind==='badge'){owned.add(reward.id);effect=duplicate?`所持済み → ${returned}コイン`:'プロフィールに装備できます';}
      if(reward.kind==='hp'){if(hp===30){items.hpStock++;effect='HP満タンのため回復ストック ×1';}else{const added=Math.min(5,30-hp);hp+=added;effect=`HPが${added}回復しました`;}}
      if(reward.kind==='hpStock'){items.hpStock+=reward.amount;effect=`回復ストックを${reward.amount}個追加`;}
      if(reward.kind==='streakKeep'){items.streakKeep+=reward.amount;effect='連続記録キープを1個追加';}
      refund+=returned;gacha.total++;gacha.cycle=(gacha.cycle+1)%10;
      const result={id:reward.id,name:reward.name,rarity:reward.rarity,kind:reward.kind,duplicate,refund:returned,guaranteed,effect,at:now,number:gacha.total};results.push(result);
    }
    gacha.history=[...results].reverse().concat(gacha.history).slice(0,30);
    return {ok:true,cost,refund,results,coin:coin-cost+refund,hp,items,ownedBadges:[...owned],gacha};
  }
  const api={rewards,normalize,draw};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.TangoGacha=api;
})(typeof globalThis!=='undefined'?globalThis:this);
