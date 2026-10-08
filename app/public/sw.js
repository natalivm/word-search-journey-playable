/**
 * Service worker: make the game playable with no network.
 *
 * The precache list is rewritten at build time by
 * scripts/write-sw-manifest.mjs, because Vite emits content-hashed filenames
 * that cannot be known in advance. Editing the markers by hand will be
 * overwritten on the next build.
 *
 * Strategy, kept simple because every asset is small and versioned:
 *  - install  : pre-cache the whole app shell
 *  - activate : drop caches from older builds
 *  - fetch    : cache-first for our own GET requests, with a background
 *               refresh so a redeploy is picked up on the next launch
 */

const CACHE = "wsj-dev";

/* PRECACHE_START */
const ASSETS = ["./", "./index.html"];
/* PRECACHE_END */

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // addAll is all-or-nothing; cache each asset separately so one missing
      // optional file can't stop the whole install.
      .then((cache) => Promise.all(ASSETS.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      // Serve from cache instantly when we have it; refresh in the background.
      return cached || network;
    })
  );
});
