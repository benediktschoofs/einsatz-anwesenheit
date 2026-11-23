// Offline-Unterstützung: App und PDF-Bausteine werden auf dem Gerät gespeichert.
const CACHE = "einsatz-v1";
const PDF_LIBS = [
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all([
    c.add("./index.html").catch(() => {}),
    c.add("./manifest.json").catch(() => {}),
    ...PDF_LIBS.map(u => c.add(new Request(u, { mode: "cors" })).catch(() => {}))
  ])));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // Sofort aus dem Speicher starten, im Hintergrund auf Updates prüfen
    const key = (req.mode === "navigate" || url.pathname.endsWith("/")) ? "./index.html" : req;
    e.respondWith(caches.open(CACHE).then(async c => {
      const cached = await c.match(key, { ignoreSearch: true });
      const net = fetch(req).then(r => { if (r && r.ok) c.put(key, r.clone()); return r; }).catch(() => null);
      if (cached) { e.waitUntil(net); return cached; }
      return (await net) || new Response("Offline – App bitte einmal mit Internet öffnen.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }));
  } else if (url.hostname === "cdnjs.cloudflare.com") {
    e.respondWith(caches.match(req, { ignoreVary: true }).then(r => r || fetch(new Request(req.url, { mode: "cors" })).then(n => {
      const copy = n.clone(); caches.open(CACHE).then(c => c.put(req.url, copy)); return n;
    })));
  }
});
