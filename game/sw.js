/**
 * Service worker: make the game playable with no network.
 *
 * Strategy is deliberately simple because every asset is small, versioned by
 * cache name, and shipped together:
 *  - install  : pre-cache the whole app shell
 *  - activate : drop caches from older versions
 *  - fetch    : cache-first for our own GET requests, with a background
 *               refresh so a redeploy is picked up on the next launch
 *
 * Bump CACHE whenever the shipped files change.
 */

const CACHE = "wsj-v1";

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/tokens.css",
  "./css/base.css",
  "./css/screens.css",
  "./css/game.css",
  "./js/main.js",
  "./js/router.js",
  "./js/store.js",
  "./js/theme.js",
  "./js/ui.js",
  "./js/rng.js",
  "./js/words.js",
  "./js/levels.js",
  "./js/generator.js",
  "./js/audio.js",
  "./js/haptics.js",
  "./js/achievements.js",
  "./js/screens/home.js",
  "./js/screens/map.js",
  "./js/screens/play.js",
  "./js/screens/profile.js",
  "./js/screens/settings.js",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-180.png",
  "./icons/icon-maskable-512.png"
];

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
