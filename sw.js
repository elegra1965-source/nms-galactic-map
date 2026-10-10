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
const CACHE = 'nms-galmap-v8';

/* 2026-09-15, Tony's live-test report: refreshing into Local (or any mode)
   left drag/orbit feeling frozen for a few seconds before "catching up" --
   traced to preview.js's render loop not starting until it finishes
   fetching the 8 letter_map_N.json shards (nms-core's proc-gen naming
   data, ~2.94MB combined) that window.nmsCoreReady gates on. The
   network-first strategy below was making EVERY load, including repeat
   visits/refreshes, redo that full fetch from scratch -- there was no fast
   path back to a copy already sitting in this cache.
   These shard files are static generated data, not hand-edited content
   Tony expects to see update instantly (unlike preview.js/preview.html),
   so a cache-first/stale-while-revalidate read is the right trade here:
   an already-cached visit gets them back near-instantly (render loop can
   start right away, no more frozen-drag window), while still refreshing
   the cache in the background on every load in case the shards themselves
   are ever regenerated -- so this never goes stale forever the way v1's
   blanket cache-first bug (see the CACHE comment above) did. Scoped
   narrowly to just this one folder rather than widening cache-first to
   everything, so preview.html/preview.js/etc keep the network-first
   always-fresh behaviour the v1->v2 change was specifically for. */
const CACHE_FIRST_RE = /\/nms-core\/letter-map\/letter_map_\d+\.json$/;

const CORE_FILES = [
  '/',
  '/preview.html',
  // 2026-09-12: the app's main script used to be inline inside preview.html
  // itself; split out to its own file today so the browser can cache it
  // separately from the HTML (a small HTML tweak no longer means re-fetching
  // and re-parsing the whole ~600KB script too). Listed here for the same
  // reason preview.html itself is -- so the offline app shell has it too.
  '/preview.js',
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

  if (CACHE_FIRST_RE.test(e.request.url)) {
    e.respondWith(
      caches.open(CACHE).then(cache => cache.match(e.request).then(cached => {
        const network = fetch(e.request).then(response => {
          if (response && response.status === 200 && response.type === 'basic') {
            cache.put(e.request, response.clone());
          }
          return response;
        }).catch(() => cached); // offline and nothing cached yet -- let it reject same as before
        return cached || network;
      }))
    );
    return;
  }

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

// 2026-10-09: RETIRED_HOST — on the old *.netlify.app address this worker cleans up after itself:
// drops any push sign-up (so alerts don't arrive twice once the app is reinstalled from
// https://map.nomansskyhub.app), clears its caches, unregisters and sends open windows to the new address.
if (/\.netlify\.app$/.test(self.location.hostname)) {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', e => e.waitUntil((async () => {
    try {
      const s = self.registration.pushManager && await self.registration.pushManager.getSubscription();
      if (s) {
        await fetch('/api/push-subscribe', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: s.endpoint }) }).catch(() => {});
        await s.unsubscribe();
      }
    } catch (err) {}
    try { for (const k of await caches.keys()) await caches.delete(k); } catch (err) {}
    await self.registration.unregister();
    const wins = await self.clients.matchAll({ type: 'window' });
    wins.forEach(c => { const u = new URL(c.url); c.navigate('https://map.nomansskyhub.app' + u.pathname + u.search).catch(() => {}); });
  })()));
}
