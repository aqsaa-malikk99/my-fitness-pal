/* MyFitnessPal Lite — offline shell (free PWA). Bump CACHE when HTML/JS changes. */
const CACHE = 'mfp-lite-v3';
const PRECACHE_PATHS = [
  './index.html',
  './myfitnesspal-lite-dashboard.html',
  './recipes-data.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

function scopeUrl(path) {
  return new URL(path, self.registration.scope).href;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(PRECACHE_PATHS.map(scopeUrl));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) return res;
          throw new Error('bad');
        })
        .catch(() => caches.match(scopeUrl('./myfitnesspal-lite-dashboard.html')))
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) {
        fetch(req)
          .then((net) => {
            if (net.ok) caches.open(CACHE).then((c) => c.put(req, net.clone()));
          })
          .catch(() => {});
        return cached;
      }
      try {
        const net = await fetch(req);
        if (net.ok) {
          const c = await caches.open(CACHE);
          await c.put(req, net.clone());
        }
        return net;
      } catch {
        return cached;
      }
    })()
  );
});
