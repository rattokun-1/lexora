/* Retire the previous site's offline cache worker on this scope. */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  await self.registration.unregister();
  const pages=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  await Promise.all(pages.filter(page=>new URL(page.url).origin===self.location.origin).map(page=>page.navigate(page.url).catch(()=>{})));
})()));
