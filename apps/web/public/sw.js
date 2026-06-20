// Snapdesk service worker — P10 PWA (TASKS.md: "manifest + service worker +
// ดูคิววันนี้แบบ offline").
//
// Scope is deliberately narrow: this is NOT a full offline-app cache (the
// dashboard's charts/forms/server actions all need a live connection and a
// logged-in session). What it does cover:
//   1. App shell precache (icons + manifest + the /offline fallback page)
//      so the install prompt + icon work without a network round trip.
//   2. Navigation fallback — if a page navigation fails (offline), serve the
//      precached /offline page instead of the browser's default error.
//   3. Stale-while-revalidate runtime cache for GET /api/jobs/today — this
//      is what lets /offline actually show today's shoot queue instead of
//      just an apology. Every successful online visit refreshes the cache;
//      offline visits replay the last cached payload.
//
// Everything else (Server Actions, auth, /api/auth/*, /api/webhooks/*) is
// left untouched — those are POSTs or must always hit the network, and
// caching them would risk serving stale/incorrect data silently.

const VERSION = "v1";
const SHELL_CACHE = `snapdesk-shell-${VERSION}`;
const TODAY_CACHE = `snapdesk-today-${VERSION}`;

const SHELL_ASSETS = [
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== TODAY_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // Server Actions, auth, webhooks — always network

  const url = new URL(request.url);

  // 1. Today's queue — stale-while-revalidate.
  if (url.pathname === "/api/jobs/today") {
    event.respondWith(
      caches.open(TODAY_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached ?? network;
      }),
    );
    return;
  }

  // 2. Page navigations — network first, fall back to the precached
  //    /offline page if the network is unreachable.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline").then((res) => res ?? Response.error())),
    );
    return;
  }
});
