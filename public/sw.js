// ValueFlow Service Worker — offline fallback + static asset caching only.
// Auth safety rules (NEVER change these):
//   - /api/*          → network-only (no caching — NextAuth + backend proxies)
//   - /dashboard/*    → network-only (no caching — authenticated pages)
//   - /admin/*        → network-only (no caching — authenticated pages)
//   - /_next/static/* → cache-first (content-hashed by Next.js — safe)
//   - /icons/*        → cache-first (immutable)
//   - /Logo/*         → cache-first (immutable)
//   - all other navigation → network-only with offline fallback

const CACHE_NAME = "vf-static-v1";
const OFFLINE_URL = "/offline.html";

const STATIC_PREFIXES = ["/_next/static/", "/icons/", "/Logo/"];

function isStaticAsset(url) {
  return STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}

function isAuthenticatedRoute(url) {
  return (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/dashboard") ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/super-admin")
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Auth/API/authenticated pages — always network-only, never intercept
  if (isAuthenticatedRoute(url)) return;

  // Static assets — cache-first (content-hashed, safe to cache forever)
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          });
        }),
      ),
    );
    return;
  }

  // All other navigation requests — network-first with offline fallback
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL)),
    );
  }
});
