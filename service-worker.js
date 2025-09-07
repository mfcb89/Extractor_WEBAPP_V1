const CACHE_NAME = 'urbanistic-form-cache-v1';
// The app shell files that are essential for the app to work offline.
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/index.tsx',
  '/vite.svg'
];

// Install event: Cache the app shell.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

// Fetch event: Serve from cache first, then fall back to network.
self.addEventListener('fetch', (event) => {
  // We only want to cache GET requests.
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response from cache.
        if (response) {
          return response;
        }

        // Not in cache - fetch from network.
        return fetch(event.request).then(
          (response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
              return response;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});

// Activate event: Clean up old caches.
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
