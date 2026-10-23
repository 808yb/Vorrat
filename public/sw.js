// Vorrat PWA Service Worker (Offline-First)
const CACHE_NAME = 'vorrat-pwa-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // CRITICAL: NEVER intercept or cache non-GET requests (e.g. POST, PUT, DELETE)
  if (event.request.method !== 'GET') {
    return;
  }

  const url = event.request.url;

  // Never intercept or cache API calls, dev-server assets or localhost
  if (
    url.includes('/api/') ||
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    url.includes('/src/') ||
    url.includes('/@vite') ||
    !url.startsWith(self.location.origin)
  ) {
    return;
  }

  // Network first with cache fallback for HTML navigation
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html') || caches.match('/'))
    );
    return;
  }

  // Stale-while-revalidate for local assets (GET requests only!)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (
            event.request.method === 'GET' &&
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic'
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              try {
                if (event.request.method === 'GET') {
                  cache.put(event.request, responseToCache);
                }
              } catch {}
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
