// Kill switch. While tanyabirthday.ru briefly pointed at another server (2026-10-13), some browsers
// installed that app's service worker for this domain. Browsers re-check the worker script on every
// visit; this replacement removes itself, wipes the caches it left and reloads the real site.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await self.registration.unregister();
    const keys = await caches.keys();
    await Promise.all(keys.map(key => caches.delete(key)));
    const windows = await self.clients.matchAll({type:'window', includeUncontrolled:true});
    windows.forEach(client => client.navigate(client.url));
  })());
});
