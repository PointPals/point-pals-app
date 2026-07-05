// PointPals service worker (§8).
//
// A deliberately small, clean offline shell: cache-first for the app's own
// static assets, network-first for navigations (so users always get fresh
// pages when online but still load offline). Nothing here relies on APIs a
// Capacitor wrapper would need native equivalents for — in a native shell the
// SW simply isn't used and the app runs the same.

// Cache name is versioned per deploy (§2d): ClientBoot registers this worker as
// /sw.js?v=<build id>, so a new deploy = a new SW URL = a new cache, and the
// activate handler below prunes every older "pointpals-*" cache.
const VERSION = new URL(self.location.href).searchParams.get("v") || "v1";
const CACHE = "pointpals-" + VERSION;
const PRECACHE = ["/", "/manifest.webmanifest", "/icon.svg", "/favicon.ico"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Never cache API / auth / functions calls.
  if (url.pathname.startsWith("/api") || url.hostname.includes("supabase")) return;

  // Network-first for page navigations.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((m) => m || caches.match("/"))),
    );
    return;
  }

  // Cache-first for same-origin static assets.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok && res.type === "basic") {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
