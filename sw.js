// NMS Galactic Map — Service Worker v2
// v2 switches the app shell from cache-first to network-first (falling back
// to cache only when the network request actually fails, i.e. offline).
// v1's cache-first strategy meant a real update pushed to GitHub/Netlify
// never reached a visitor -- or Tony himself -- who'd already loaded the
// site once: a cache hit was returned unconditionally, and the cache name
// never changed to force a refresh, so it could serve a stale copy
// indefinitely. Confirmed as a real bug 2026-08-13 (Tony's own question
// about whether updates reach him automatically), same class of issue NMS
// Hub's own service worker hit earlier in this project. The cache name bump
// below (v1->v2) is a one-time step to clear out anyone's already-stale v1
// cache on their next visit; network-first from here on means this CACHE
// constant shouldn't need bumping again for a normal content update -- only
// if this file (sw.js) ITSELF changes again in a way that needs old caches
// purged.
const CACHE = 'nms-galmap-v2';

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

// Activate — clean old caches (this is what actually evicts the stale v1
// cache the moment this v2 worker activates)
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network-first for everything same-origin: always try to get the
// latest version and refresh the cache as we go, falling back to whatever's
// cached only when the network request actually fails (offline use). Still
// completely untouched/network-only for the shared-edits backend -- that
// data has to be live for every visitor regardless of this file's own
// caching strategy, unrelated to the v1->v2 change above.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith('http')) return;
  if (e.request.url.indexOf('/.netlify/functions/') !== -1) return; // let it hit the network untouched

  e.respondWith(
    fetch(e.request).then(response => {
      if (response && response.status === 200 && response.type === 'basic') {
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
      }
      return response;
    }).catch(() => {
      return caches.match(e.request).then(cached => {
        if (cached) return cached;
        if (e.request.destination === 'document') return caches.match('/');
      });
    })
  );
});
