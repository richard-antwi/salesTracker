const CACHE_NAME = 'work-and-pay-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/login',
  '/rider',
  '/guarantor/dashboard',
  '/manifest.json',
  '/favicon.ico',
];

// Install event: cache app shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching app shell assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event: Network-first with Cache Fallback for offline resilience
self.addEventListener('fetch', (event) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Ignore Next.js HMR & hot-reload requests during dev
  if (url.pathname.startsWith('/_next/webpack-hmr')) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Clone & save successful GET responses to cache
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache when offline
        console.log('[SW] Network request failed. Serving from cache:', event.request.url);
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback to home/offline cached page if available
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/rider') || caches.match('/login');
          }
        });
      })
  );
});
