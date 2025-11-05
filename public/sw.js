// Service Worker for Oryon App PWA
const CACHE_NAME = 'oryon-app-v1.1.0';
const RUNTIME_CACHE = 'oryon-runtime-v1.1.0';

// Recursos esenciales para cachear durante la instalación
const PRECACHE_URLS = [
  '/',
  '/App.tsx',
  '/styles/globals.css',
  '/manifest.json',
  '/favicon.svg'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching essential files');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estrategia de caché: Network First con fallback a Cache
self.addEventListener('fetch', (event) => {
  // Ignorar requests que no sean GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Ignorar requests a APIs externas (Supabase, etc.)
  const url = new URL(event.request.url);
  if (url.origin !== location.origin && !url.hostname.includes('supabase')) {
    return;
  }

  // Para requests a Supabase: siempre intentar red primero
  if (url.hostname.includes('supabase')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return new Response(
            JSON.stringify({ 
              error: 'Sin conexión a internet',
              offline: true 
            }),
            { 
              headers: { 'Content-Type': 'application/json' },
              status: 503
            }
          );
        })
    );
    return;
  }

  // Para recursos locales: Network First, fallback a Cache
  event.respondWith(
    caches.open(RUNTIME_CACHE).then(cache => {
      return fetch(event.request)
        .then(response => {
          // Cachear la respuesta si es exitosa
          if (response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        })
        .catch(() => {
          // Si falla la red, intentar servir desde caché
          return cache.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // Si no está en caché y es navegación HTML, servir página offline
            if (event.request.headers.get('accept').includes('text/html')) {
              return cache.match('/');
            }
            
            // Para otros recursos, retornar error
            return new Response('Offline', { 
              status: 503, 
              statusText: 'Service Unavailable' 
            });
          });
        });
    })
  );
});

// Manejo de mensajes desde la aplicación
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      })
    );
  }
});

// Sync en segundo plano (para cuando vuelva la conexión)
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered');
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  // Aquí podrías implementar lógica para sincronizar datos
  // cuando la conexión vuelva
  console.log('Service Worker: Syncing data...');
}

// Notificaciones Push
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  let data = {
    title: 'Oryon App',
    body: 'Nueva notificación',
    icon: '/icons/icon-192x192.png'
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'oryon-notification',
    requireInteraction: data.requireInteraction || false,
    data: {
      url: data.url || '/',
      ...data.data
    },
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Oryon App', options)
  );
});

// Manejo de clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // Buscar si ya hay una ventana abierta
        for (let client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Si no hay ventana abierta, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Click en notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Si hay una ventana abierta, enfocarla
        for (let client of clientList) {
          if (client.url === event.notification.data.url && 'focus' in client) {
            return client.focus();
          }
        }
        // Si no, abrir nueva ventana
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url);
        }
      })
  );
});
