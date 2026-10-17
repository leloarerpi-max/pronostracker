/* PronoTracker : fichier de cache (service worker).
   - La page et le manifeste : on essaie d'abord internet (donc les mises à jour s'affichent tout de suite),
     et si internet manque, on sert la dernière copie en cache.
   - Les bibliothèques externes (Tailwind, Chart.js, FontAwesome) : servies depuis le cache dès la 2e ouverture.
   - Les données (Firebase, Supabase, football-data) ne sont JAMAIS mises en cache. */
const VERSION = 'pronotracker-v1';
const CDN = ['cdn.tailwindcss.com', 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com'];

self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function reseauPuisCache(req) {
  const cache = await caches.open(VERSION);
  try {
    const rep = await fetch(req);
    if (rep && rep.ok) cache.put(req, rep.clone());
    return rep;
  } catch (err) {
    const copie = await cache.match(req, { ignoreSearch: true });
    if (copie) return copie;
    if (req.mode === 'navigate') { const idx = await cache.match('index.html') || await cache.match('./'); if (idx) return idx; }
    throw err;
  }
}

async function cachePuisReseau(req) {
  const cache = await caches.open(VERSION);
  const copie = await cache.match(req);
  if (copie) return copie;
  const rep = await fetch(req);
  if (rep && (rep.ok || rep.type === 'opaque')) cache.put(req, rep.clone());
  return rep;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) { e.respondWith(reseauPuisCache(req)); return; }
  if (CDN.includes(url.hostname)) { e.respondWith(cachePuisReseau(req)); return; }
});
