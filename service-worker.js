/* AppLab JP V15-1 — PWA à activation contrôlée.
   Mise à jour volontaire : ne pas exécuter skipWaiting() lors d'une nouvelle installation.
   Les caches ne contiennent aucune donnée personnelle des Coteries. */
const VERSION = 'applabjp-shell-v15-1-20261027';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('applabjp-') && k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'APPLAB_APPLY_UPDATE') {
    event.waitUntil(self.skipWaiting());
  }
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Ne pas intercepter les applications externes.
  if (url.pathname.endsWith('/release.json') || url.pathname.endsWith('/service-worker.js')) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(VERSION);
          await cache.put('./index.html', response.clone());
        }
        return response;
      } catch (e) {
        const cached = await caches.match('./index.html');
        return cached || Response.error();
      }
    })());
    return;
  }
  const eligible = SHELL.some(path => path !== './' && url.pathname.endsWith(path.slice(1)));
  if (eligible) {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      return (await cache.match(request)) || fetch(request);
    })());
  }
});
