
// Service Worker para PWA de ServyAuto Manager
const CACHE_NAME = 'servyauto-v1';
const OFFLINE_URL = '/offline.html';

// Recursos para cachear
const STATIC_CACHE = [
  '/',
  '/offline.html',
  '/servyauto-logo.png',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_CACHE);
    })
  );
  self.skipWaiting();
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Intercepción de peticiones
self.addEventListener('fetch', (event) => {
  // Solo cachear peticiones GET
  if (event.request.method !== 'GET') {
    return;
  }

  // No cachear peticiones a la API
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clonar la respuesta porque puede ser usada solo una vez
        const responseClone = response.clone();
        
        // Actualizar el cache con la nueva respuesta
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        
        return response;
      })
      .catch(() => {
        // Si falla la petición, intentar con el cache
        return caches.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          
          // Si no está en cache y es una navegación, mostrar página offline
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
        });
      })
  );
});
