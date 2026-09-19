const CACHE_NAME = 'work-and-pay-cache-v2';
const STATIC_ASSETS = [
  '/',
  '/login',
  '/rider',
  '/guarantor/dashboard',
  '/admin/dashboard',
  '/manifest.json',
  '/favicon.ico',
];

// Install event: pre-cache core app shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching app shell assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event: clean up old cache versions
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
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Ignore browser extension schemes and Next.js dev HMR
  if (url.protocol.startsWith('chrome-extension') || url.pathname.startsWith('/_next/webpack-hmr')) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        console.log('[SW] Offline fetch fallback for:', event.request.url);

        // 1. Try exact match
        const directMatch = await caches.match(event.request);
        if (directMatch) return directMatch;

        // 2. Try match ignoring query parameters (e.g. Next.js _rsc parameters)
        const ignoreSearchMatch = await caches.match(event.request, { ignoreSearch: true });
        if (ignoreSearchMatch) return ignoreSearchMatch;

        // 3. Fallback for navigation or HTML / RSC component requests
        const isHtmlOrRsc =
          event.request.mode === 'navigate' ||
          event.request.headers.get('accept')?.includes('text/html') ||
          event.request.headers.get('accept')?.includes('text/x-component') ||
          event.request.headers.has('RSC');

        if (isHtmlOrRsc) {
          const fallbackPage =
            (await caches.match(url.pathname, { ignoreSearch: true })) ||
            (await caches.match('/rider')) ||
            (await caches.match('/guarantor/dashboard')) ||
            (await caches.match('/login')) ||
            (await caches.match('/'));
          if (fallbackPage) return fallbackPage;
        }

        return new Response('Offline: Connection unavailable', {
          status: 533,
          statusText: 'Offline',
          headers: { 'Content-Type': 'text/plain' },
        });
      })
  );
});
