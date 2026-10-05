/*
 * Lunelle service worker — app-shell caching ONLY.
 *
 * Privacy rule: this worker never caches API traffic. It ignores every
 * cross-origin request (Supabase lives on another origin) and every non-GET
 * request, so no reproductive or sexual-health data is ever written to the
 * Cache Storage on the device.
 *
 * Paths are relative to the worker's scope, so the same file works at a
 * domain root and under a sub-path such as /lunelle/ on GitHub Pages.
 */
const CACHE = 'lunelle-shell-v2';
const BASE = new URL(self.registration.scope).pathname; // e.g. "/" or "/lunelle/"
const SHELL = [BASE, `${BASE}manifest.webmanifest`, `${BASE}icons/favicon.svg`, `${BASE}icons/icon-192.png`];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // SPA navigations: network first, fall back to the cached shell offline.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(BASE)));
    return;
  }

  // Hashed build assets are immutable: cache first.
  if (url.pathname.startsWith(`${BASE}assets/`) || url.pathname.startsWith(`${BASE}icons/`)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
