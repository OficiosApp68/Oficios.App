// Keep live account and directory requests on the network; cache only the offline notice.
const OFFLINE_CACHE = "oficios-offline-v1";
const offlineUrl = new URL("offline.html", self.registration.scope).href;
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then((cache) => cache.add(offlineUrl)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.mode !== "navigate" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).catch(async () => {
    return (await caches.match(offlineUrl)) || Response.error();
  }));
});
