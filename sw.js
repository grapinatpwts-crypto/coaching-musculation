/**
 * Service worker — met en cache la coquille de l'app.
 * Les appels à l'API Apps Script ne sont jamais mis en cache : ils doivent
 * toujours refléter les données réelles du Google Sheet.
 * Incrémentez CACHE à chaque mise en ligne pour forcer la mise à jour.
 */
const CACHE = 'coaching-fitness-v2';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png',
               './assets/monogramme-w.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const externe = url.origin !== self.location.origin;

  // API, Google Sign-In, polices : toujours le réseau
  if (externe || e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copie = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copie));
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
