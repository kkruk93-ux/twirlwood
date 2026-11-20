const CACHE = 'twirlwood-v1';
const ASSETS = ['./', './index.html', './privacy.html', './manifest.json', './css/styles.css',
  './js/main.js', './js/game.js', './js/levels.js', './js/art.js', './js/audio.js', './js/input.js', './js/storage.js', './js/monetization.js',
  './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res && res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match('./index.html'))));
});
