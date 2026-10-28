/* AppLab JP V15.2 — correctif PWA GitHub Pages du 28 octobre 2026.
   Conserve les ajouts personnels : aucun effacement de localStorage/IndexedDB.
   L'activation des nouvelles versions demeure volontaire. */
const VERSION = 'applabjp-shell-v15-2-test-maquette-20261028';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
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
  if (event.data && event.data.type === 'APPLAB_APPLY_UPDATE') event.waitUntil(self.skipWaiting());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
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
        return (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }
  if (SHELL.some(path => path !== './' && url.pathname.endsWith(path.slice(1)))) {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      return (await cache.match(request)) || fetch(request);
    })());
  }
});
