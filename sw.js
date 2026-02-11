const CACHE_NAME = 'check-asistencia-v4';
const urlsToCache = [
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  // Forzar que el nuevo SW tome el control inmediatamente
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  // Tomar control de todas las páginas inmediatamente
  event.waitUntil(
    clients.claim().then(() => {
      return caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Eliminando cache antiguo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      });
    })
  );
});

// Intercepción de peticiones - Network First para archivos críticos
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Para archivos HTML, JS y Firebase: SIEMPRE usar la red primero
  if (url.pathname.endsWith('.html') || 
      url.pathname.endsWith('.js') || 
      url.hostname.includes('firebase') ||
      url.hostname.includes('googleapis')) {
    
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clonar la respuesta para guardar en cache
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Si falla la red, intentar desde cache
          return caches.match(event.request);
        })
    );
  } else {
    // Para otros recursos (imágenes, etc): Cache First
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request);
        })
    );
  }
});
