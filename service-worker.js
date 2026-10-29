/* AppLab JP V15.4 — réparation de l'ouverture mobile PWA.
   L'affichage ne doit jamais attendre l'écriture d'une page de ~12 Mo en Cache Storage.
   Données personnelles intactes (aucun accès à localStorage ou IndexedDB).
   Nouvelle version activée volontairement via APPLAB_APPLY_UPDATE. */
const VERSION = 'applabjp-shell-v15-4-mini-pelle-20261029';
const SHELL = ['./manifest.webmanifest', './icon-192.png', './icon-512.png'];
const HOMEPAGE = './index.html';

self.addEventListener('install', event => {
  // Ne pas bloquer l'installation sur une page HTML volumineuse.
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await Promise.allSettled(SHELL.map(path => cache.add(path)));
  })());
});

self.addEventListener('activate', event => {
  // Garder temporairement l'ancienne page hors ligne, le temps de charger la nouvelle.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'APPLAB_APPLY_UPDATE') {
    event.waitUntil(self.skipWaiting());
  }
});

async function fallbackPage() {
  // Dernière page utilisable, même si la nouvelle n'a pas encore été mise en cache.
  const current = await caches.open(VERSION);
  const fresh = await current.match(HOMEPAGE);
  if (fresh) return fresh;
  const keys = (await caches.keys()).filter(k => k.startsWith('applabjp-') && k !== VERSION);
  for (const key of keys.reverse()) {
    const cached = await (await caches.open(key)).match(HOMEPAGE);
    if (cached) return cached;
  }
  return new Response('AppLab JP : connexion nécessaire pour terminer cette mise à jour. Réessayez avec Internet.',
    {status:503, headers:{'Content-Type':'text/plain; charset=utf-8'}});
}

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
          // IMPORTANT : on répond immédiatement au navigateur. Ne jamais attendre cache.put().
          const copy = response.clone();
          event.waitUntil((async () => {
            try {
              const cache = await caches.open(VERSION);
              const existing = await cache.match(HOMEPAGE);
              if (!existing) {
                await cache.put(HOMEPAGE, copy);
                // Le nouveau shell est sûr; libérer les anciens caches devenus inutiles.
                const keys = await caches.keys();
                await Promise.all(keys.filter(k => k.startsWith('applabjp-') && k !== VERSION)
                  .map(k => caches.delete(k)));
              }
            } catch (e) { /* Le cache peut être limité ; ne pas bloquer l'ouverture. */ }
          })());
        }
        return response;
      } catch (e) {
        return fallbackPage();
      }
    })());
    return;
  }

  if (SHELL.some(path => url.pathname.endsWith(path.slice(1)))) {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      return (await cache.match(request)) || fetch(request);
    })());
  }
});
