// Offline-first service worker. The classroom has bad connectivity and the
// network is an optional extra, never a dependency (driver D4) — but a
// deploy must still reach returning learners. Navigations are network-first
// with the cache as the offline fallback; fingerprinted assets are immutable
// and stay cache-first. The cache name is versioned: bumping it purges every
// client's stale copy on the next visit.
const CACHE = "mbpt-v2";
const PRECACHE = ["/", "/index.html", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
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
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  // The app shell: always try the network so a new deploy is seen on the
  // next load; fall back to the cached shell only when offline.
  if (event.request.mode === "navigate" || url.pathname === "/" || url.pathname === "/index.html") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put("/index.html", copy));
          return response;
        })
        .catch(() => caches.match("/index.html").then((hit) => hit ?? Response.error())),
    );
    return;
  }

  // Everything else (hashed assets, case media): cache-first — the filename
  // changes when the content does, so a cache hit is never stale.
  event.respondWith(
    caches.match(event.request).then(
      (hit) =>
        hit ??
        fetch(event.request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return response;
        }),
    ),
  );
});
