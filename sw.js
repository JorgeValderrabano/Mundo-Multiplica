// Service Worker: cache del app shell para funcionar offline
const CACHE_NAME = 'mundo-multiplica-v9';
const APP_SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './js/game.js',
  './manifest.json',
  './assets/branding/mundo-multiplica-logo-1200.png',
  './assets/menu/bosque-suma.webp',
  './assets/menu/montana-resta.webp',
  './assets/menu/ciudad-multiplicadora.webp',
  './assets/menu/bahia-division.webp',
  './assets/menu/aventura-mixta.webp',
  './assets/ui/star-counter.png',
  './assets/ui/heart-counter.png',
  './assets/ui/home-button.png',
  './assets/ui/sound-button.png',
  './assets/ui/mute-button.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/favicon-32.png',
  './assets/icons/icon-64.png'
];

// Instalar: precachear el app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activar: limpiar cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: servir desde caché con fallback a red
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cachear solo respuestas válidas del mismo origen
        if (response && response.ok && event.request.url.startsWith(self.location.origin)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
