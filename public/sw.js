// A small service worker so the installed game opens without data.
// - Pages: try the network first (so updates arrive), fall back to the cache.
// - Built files in /assets/ have unique names, so cache-first is safe.
// - Other websites (Supabase, PostHog, WhatsApp) are never cached.
// Paths are relative to where the game is served (a domain root or a
// subfolder such as GitHub Pages' /campus-life/).
const CACHE = 'campus-life-v2';
const HOME = new URL('./', self.location).pathname;
const SHELL = ['./', './manifest.webmanifest', './icons/icon-192.png', './favicon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(HOME, copy));
          return res;
        })
        .catch(() => caches.match(HOME)),
    );
    return;
  }

  if (url.pathname.startsWith(`${HOME}assets/`) || url.pathname.startsWith(`${HOME}icons/`)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
