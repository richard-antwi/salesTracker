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

// --- OFFLINE POST QUEUE (IndexedDB) ---
const DB_NAME = 'workAndPaySyncDB';
const STORE_NAME = 'sync-queue';

function openSyncDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveToSyncQueue(requestData) {
  const db = await openSyncDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add(requestData);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getSyncQueue() {
  const db = await openSyncDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function deleteFromSyncQueue(id) {
  const db = await openSyncDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Fetch event: Network-first with Cache Fallback for GET, Background Sync for POST
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignore browser extension schemes and Next.js dev HMR
  if (url.protocol.startsWith('chrome-extension') || url.pathname.startsWith('/_next/webpack-hmr')) return;

  // Handle POST requests for Offline Sync (e.g., Recording a Payment)
  if (event.request.method === 'POST' && url.pathname.includes('/payments')) {
    event.respondWith(
      fetch(event.request.clone()).catch(async (error) => {
        console.log('[SW] Network failed for POST. Saving to offline sync queue.');
        
        // Clone request body before it's consumed
        const body = await event.request.clone().json();
        const headers = {};
        event.request.headers.forEach((val, key) => (headers[key] = val));

        await saveToSyncQueue({
          url: event.request.url,
          method: 'POST',
          headers,
          body,
          timestamp: Date.now()
        });

        // Register background sync if supported
        if ('sync' in self.registration) {
          try {
            await self.registration.sync.register('sync-payments');
            console.log('[SW] Background sync registered');
          } catch (err) {
            console.error('[SW] Sync registration failed:', err);
          }
        }

        // Return a mock success response so the UI doesn't crash
        return new Response(JSON.stringify({ 
          success: true, 
          offline: true, 
          message: 'Saved offline. Will sync when network returns.' 
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Handle normal GET requests
  if (event.request.method === 'GET') {
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

          const directMatch = await caches.match(event.request);
          if (directMatch) return directMatch;

          const ignoreSearchMatch = await caches.match(event.request, { ignoreSearch: true });
          if (ignoreSearchMatch) return ignoreSearchMatch;

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
  }
});

// Background Sync Event handler
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-payments') {
    console.log('[SW] Background sync event triggered for sync-payments');
    event.waitUntil(
      (async () => {
        const queue = await getSyncQueue();
        for (const req of queue) {
          try {
            console.log('[SW] Replaying offline request:', req.url);
            const response = await fetch(req.url, {
              method: req.method,
              headers: req.headers,
              body: JSON.stringify(req.body)
            });
            
            if (response.ok) {
              await deleteFromSyncQueue(req.id);
              console.log('[SW] Offline request successfully synced.');
            }
          } catch (err) {
            console.error('[SW] Sync replay failed, keeping in queue:', err);
            // Will retry on next sync event
          }
        }
      })()
    );
  }
});

