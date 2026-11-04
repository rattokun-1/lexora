(function(root){'use strict';
 function shuffle(values,rng=Math.random){const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.min(i,Math.max(0,Math.floor(rng()*(i+1))));[a[i],a[j]]=[a[j],a[i]];}return a;}
 const api={shuffle};root.KotomiaChoices=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
