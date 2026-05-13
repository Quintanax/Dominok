// ============================================================
//  DominoStats Pro — Service Worker
//  Estrategia: Cache-first para assets estáticos,
//              Network-first para peticiones a Firestore/API
// ============================================================

const CACHE_NAME = 'dominostats-v1';
const STATIC_CACHE = 'dominostats-static-v1';
const DYNAMIC_CACHE = 'dominostats-dynamic-v1';

// Assets que se cachean en la instalación (shell de la app)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // CSS
  '/css/variables.css',
  '/css/base.css',
  '/css/components.css',
  '/css/layout.css',
  '/css/dashboard.css',
  '/css/tables.css',
  '/css/modals.css',
  '/css/animations.css',
  '/css/ocr.css',
  '/css/rankings.css',
  // JS Core
  '/js/db.js',
  '/js/auth.js',
  '/js/utils.js',
  '/js/charts.js',
  '/js/firebase_manager.js',
  '/js/firebase_config.js',
  '/js/app.js',
  '/js/gemini_ocr.js',
  // JS Pages
  '/js/pages/dashboard.js',
  '/js/pages/matches.js',
  '/js/pages/players.js',
  '/js/pages/rankings.js',
  '/js/pages/history.js',
  '/js/pages/stats.js',
  '/js/pages/predictor.js',
  '/js/pages/import.js',
  '/js/pages/reports.js',
  '/js/pages/admin.js',
  '/js/pages/admin_dashboard.js',
  '/js/pages/global_tournament.js',
  '/js/pages/tournaments.js',
];

// ── INSTALL ──────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando DominoStats v1...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Pre-cacheando app shell');
      // Usamos addAll con manejo de errores para no bloquear si algún asset falla
      return Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[SW] No se pudo cachear:', url, err.message);
          })
        )
      );
    })
  );
  self.skipWaiting(); // Activa el SW inmediatamente sin esperar recarga
});

// ── ACTIVATE ─────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => {
            console.log('[SW] Eliminando caché antigua:', key);
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim(); // Toma control de todas las páginas abiertas
});

// ── FETCH ─────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar peticiones que no son GET
  if (request.method !== 'GET') return;

  // Ignorar peticiones a Firebase, extensiones de Chrome, etc.
  const ignoredOrigins = [
    'firestore.googleapis.com',
    'firebase.googleapis.com',
    'identitytoolkit.googleapis.com',
    'securetoken.googleapis.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'cdn.jsdelivr.net',
    'www.gstatic.com',
    'googleapis.com',
  ];

  if (ignoredOrigins.some((origin) => url.hostname.includes(origin))) {
    return; // Deja pasar al navegador sin intervención
  }

  // Extensiones de Chrome y similares
  if (!url.protocol.startsWith('http')) return;

  // Estrategia: Cache-First para assets estáticos conocidos
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Recurso encontrado en caché — devolver inmediatamente
        // y actualizar en background (stale-while-revalidate)
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(STATIC_CACHE).then((cache) => {
                cache.put(request, networkResponse.clone());
              });
            }
            return networkResponse;
          })
          .catch(() => {/* offline, usamos caché */});

        return cachedResponse;
      }

      // No está en caché — ir a la red y guardar en caché dinámica
      return fetch(request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // Offline y sin caché: devolver página de fallback si es navegación
          if (request.destination === 'document') {
            return caches.match('/index.html');
          }
        });
    })
  );
});

// ── PUSH NOTIFICATIONS (preparado para futuro uso) ────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'Nueva notificación de DominoStats',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'DominoStats Pro', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
