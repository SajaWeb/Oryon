// Código del Service Worker como string
const SW_CODE = `
// Service Worker for Oryon App PWA
const CACHE_NAME = 'oryon-app-v1.0.0';
const RUNTIME_CACHE = 'oryon-runtime-v1.0.0';

// Recursos esenciales para cachear durante la instalación
const PRECACHE_URLS = [
  '/',
  '/manifest.json'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching essential files');
        return cache.addAll(PRECACHE_URLS).catch(err => {
          console.log('Some resources failed to cache, but continuing...', err);
        });
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

  const url = new URL(event.request.url);
  
  // Ignorar requests a APIs externas (excepto mismo origen)
  if (url.origin !== location.origin) {
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
            if (event.request.headers.get('accept')?.includes('text/html')) {
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
`;

// Registro del Service Worker
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Workers no soportados en este navegador')
    return
  }

  // No intentar registrar en entornos de iframe (como Figma preview)
  if (window.self !== window.top) {
    console.log('Service Worker no se puede registrar en un iframe')
    return
  }

  try {
    // Intentar registrar el service worker desde /sw.js
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })

    console.log('Service Worker registrado exitosamente:', registration.scope)

    // Actualizar el service worker cuando haya una nueva versión
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (!newWorker) return

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // Hay una nueva versión disponible
          console.log('Nueva versión del Service Worker disponible')
          
          // Mostrar notificación al usuario
          if (confirm('Hay una nueva versión disponible. ¿Deseas actualizar?')) {
            newWorker.postMessage({ type: 'SKIP_WAITING' })
            window.location.reload()
          }
        }
      })
    })

    // Manejar actualizaciones del service worker
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    })

    // Verificar actualizaciones periódicamente
    setInterval(() => {
      registration.update()
    }, 60 * 60 * 1000) // Verificar cada hora

  } catch (error) {
    console.error('Error al registrar el Service Worker:', error)
  }
}

// Función para verificar el estado de instalación de la PWA
export function isPWAInstalled(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  )
}

// Función para verificar si es un dispositivo móvil
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

// Función para solicitar permisos de notificación
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.log('Este navegador no soporta notificaciones')
    return 'denied'
  }

  if (Notification.permission === 'granted') {
    return 'granted'
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission
  }

  return Notification.permission
}

// Función para mostrar una notificación
export async function showNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  const permission = await requestNotificationPermission()

  if (permission !== 'granted') {
    console.log('Permiso de notificación denegado')
    return
  }

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    // Usar service worker para mostrar la notificación
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification(title, {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      ...options
    })
  } else {
    // Fallback: mostrar notificación directamente
    new Notification(title, {
      icon: '/icons/icon-192x192.png',
      ...options
    })
  }
}

// Función para limpiar la caché
export async function clearServiceWorkerCache(): Promise<void> {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' })
    console.log('Caché del Service Worker limpiada')
  }
}

// Función para verificar si hay conexión a internet
export function isOnline(): boolean {
  return navigator.onLine
}

// Listener para cambios en la conectividad
export function onConnectivityChange(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)

  // Retornar función de limpieza
  return () => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  }
}
