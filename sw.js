const CACHE_NAME = "questpulse-shell-v17";
const APP_SHELL = [
  "./",
  "./index.html",
  "./domain-hunter.html",
  "./guide.html",
  "./publish.html",
  "./publisher-account.html",
  "./admin-review.html",
  "./publishing-policy.html",
  "./archive.html",
  "./link-check.html",
  "./account-safety.html",
  "./privacy.html",
  "./terms.html",
  "./404.html",
  "./offline.html",
  "./manifest.webmanifest",
  "./data/offers.json",
  "./assets/questpulse-icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith("questpulse-shell-") && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function cacheResponse(request, response) {
  if (response && response.ok && response.type !== "opaque") {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => cacheResponse(request, response))
        .catch(async () => (await caches.match(request)) || (await caches.match("./index.html")) || (await caches.match("./offline.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(response => cacheResponse(request, response));
      return cached || network.catch(() => new Response("", { status: 503, statusText: "Offline" }));
    })
  );
});
