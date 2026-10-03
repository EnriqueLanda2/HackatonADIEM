// =============================================================================
// Service Worker - agromIA PWA
// - Push notifications de alertas (agua, riesgo, sequía, lluvia, plagas).
// - Caché mínima: solo íconos y manifiesto. La app y el código de Next siempre
//   se piden a la red para no servir versiones viejas.
// =============================================================================

const CACHE_NAME = 'agromai-v3';
const STATIC_ASSETS = ['/manifest.json', '/agromai-logo.png', '/icons/icon-192x192.png', '/icons/icon-72x72.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

// Borra cachés anteriores (la v1 guardaba páginas y chunks de Next).
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Navegación: red primero; sin conexión, una página mínima.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(
        () =>
          new Response('<h1 style="font-family:sans-serif">agromIA sin conexión</h1><p>Revisa tu conexión e inténtalo de nuevo.</p>', {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          })
      )
    );
    return;
  }

  // Íconos y manifiesto: caché primero.
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
  }
});

const VIBRACION = {
  critica: [300, 100, 300, 100, 300],
  alta: [200, 100, 200],
  media: [150],
  baja: [],
};

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const severidad = data.severidad || 'media';

  event.waitUntil(
    self.registration.showNotification(data.titulo || '🌱 agromIA', {
      body: data.mensaje || 'Nueva alerta del sistema de riego',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: VIBRACION[severidad] || VIBRACION.media,
      tag: data.clave || data.tipo || 'alerta',
      renotify: severidad === 'critica' || severidad === 'alta',
      requireInteraction: severidad === 'critica',
      data,
      actions: [
        { action: 'ver', title: 'Ver dashboard' },
        { action: 'cerrar', title: 'Cerrar' },
      ],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'cerrar') return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const abierta = clients.find((client) => new URL(client.url).origin === self.location.origin);
      return abierta ? abierta.focus() : self.clients.openWindow('/');
    })
  );
});
