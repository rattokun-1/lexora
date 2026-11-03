/* Load the 3D engine only when a map is near the visible area. */
(function(){
 let observer=null,loading=null;
 const loader={
  mount(){
   observer?.disconnect();observer=null;
   const host=document.querySelector('[data-adventure-model]');if(!host)return;
   const load=()=>{
    observer?.disconnect();observer=null;
    if(loading)return;
    loading=import('./world-map.bundle.js?v=1.4.0').catch(()=>{
     loading=null;const current=document.querySelector('.adventure-world');
     if(current){current.classList.add('adventure-fallback');current.querySelector('.adventure-status').textContent='3Dマップを読み込めませんでした。レッスン一覧から学習できます。';}
    });
   };
   observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))load();},{rootMargin:'160px'});
   observer.observe(host);
  },
  dispose(){observer?.disconnect();observer=null;}
 };
 window.TangoWorld=loader;loader.mount();
})();
