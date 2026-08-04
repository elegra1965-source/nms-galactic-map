// NMS Galactic Map — Service Worker v1
const CACHE = 'nms-galmap-v1';

const CORE_FILES = [
  '/',
  '/preview.html',
  '/manifest.json',
  '/favicon/icon-192.png',
  '/favicon/icon-512.png',
];

// Install — cache the app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(CORE_FILES))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — cache-first for the app shell/assets, but ALWAYS network-only for
// the shared-edits backend. Community system edits need to be live for
// every visitor; caching a GET to the Function would serve stale data
// (or someone else's system edits) to a later visitor offline/online mix.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith('http')) return;
  if (e.request.url.indexOf('/.netlify/functions/') !== -1) return; // let it hit the network untouched

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        if (e.request.destination === 'document') {
          return caches.match('/');
        }
      });
    })
  );
});
