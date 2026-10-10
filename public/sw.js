/* Service worker de Parnassa Cashback : application installable et démarrage hors ligne. */
const VERSION = 'parnassa-cashback-v7';
const COQUILLE = ['./', './index.html', './manifest.webmanifest', './icone.svg', './icone-192.png', './icone-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(COQUILLE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function reseauPuisCache(requete) {
  const cache = await caches.open(VERSION);
  const cle = new URL('./index.html', self.registration.scope).href;
  try {
    const reponse = await fetch(requete);
    if (reponse.ok) cache.put(cle, reponse.clone());
    return reponse;
  } catch (erreur) {
    const enCache = await cache.match(cle);
    if (enCache) return enCache;
    throw erreur;
  }
}

/** Garde au plus 30 fichiers compilés (les plus récents). */
async function elaguerAssets(cache) {
  const assets = (await cache.keys()).filter((r) => r.url.includes('/assets/'));
  for (const r of assets.slice(0, Math.max(0, assets.length - 30))) await cache.delete(r);
}

async function cachePuisReseau(requete) {
  const cache = await caches.open(VERSION);
  const enCache = await cache.match(requete);
  if (enCache) return enCache;
  const reponse = await fetch(requete);
  if (reponse.ok) {
    await cache.put(requete, reponse.clone());
    await elaguerAssets(cache);
  }
  return reponse;
}

self.addEventListener('fetch', (e) => {
  const requete = e.request;
  if (requete.method !== 'GET') return;
  const url = new URL(requete.url);
  if (url.origin !== self.location.origin) return;
  // Pages : réseau d'abord (toujours la dernière version), copie locale hors ligne.
  if (requete.mode === 'navigate') e.respondWith(reseauPuisCache(requete));
  // Fichiers compilés (noms à empreinte) : immuables, servis depuis le cache.
  else if (url.pathname.includes('/assets/')) e.respondWith(cachePuisReseau(requete));
});
