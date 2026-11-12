// Cache the GitHub edition's static screens; account data stays in browser storage.
const cachePrefix='queueless-github:'+new URL(self.registration.scope).pathname+':';
const cacheName=cachePrefix+'v5.1';
const assets=['./','index.html','style.css?v=5.1','app.js?v=5.1','manifest.json','icon.svg'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(cacheName);
  await cache.addAll(assets.map(path=>new URL(path,self.registration.scope).href));
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const names=await caches.keys();
  await Promise.all(names.filter(name=>name.startsWith(cachePrefix)&&name!==cacheName).map(name=>caches.delete(name)));
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url),scope=new URL(self.registration.scope);
  if(event.request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
  event.respondWith((async()=>{
    const cache=await caches.open(cacheName);
    try{const response=await fetch(event.request);if(response.ok)await cache.put(event.request,response.clone());return response;}
    catch{const saved=await cache.match(event.request)||(event.request.mode==='navigate'?await cache.match(new URL('index.html',scope).href):null);return saved||new Response('Reconnect to download this part of QueueLess.',{status:503,headers:{'Content-Type':'text/plain'}});}
  })());
});
