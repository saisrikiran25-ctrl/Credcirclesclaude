/* Minimal service worker: makes the app installable and shows a friendly offline page.
   It deliberately caches NO account or money data. */
const OFFLINE = new Response(
  '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title>' +
    '<body style="font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0;background:#f7f5f0;color:#14182b;text-align:center;padding:24px">' +
    '<div><h1 style="font-size:22px">You are offline</h1><p>Circlo needs a connection to show your circles and ledger. Reconnect and try again.</p></div>',
  { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 },
);
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  if (e.request.mode === "navigate") e.respondWith(fetch(e.request).catch(() => OFFLINE.clone()));
});
