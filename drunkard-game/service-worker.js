const CACHE_VERSION = 'v1';
const CACHE_NAME = `drunkard-game-static-${CACHE_VERSION}`;
const urlsToCache = [
  './',
  './index.html',
  './drunkard.webmanifest',
  './css/drunkard.css',
  './js/drunkard.js',
  './icons/drunkard-icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames.map((cacheName) => {
        if (cacheName !== CACHE_NAME) {
          return caches.delete(cacheName);
        }
        return null;
      })
    )).then(() => self.clients.claim())
  );
});

async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    const cachedPage = await caches.match(request);
    if (cachedPage) return cachedPage;
    return caches.match('./index.html');
  }
}

async function handleAssetRequest(request) {
  const cached = await caches.match(request);
  const networkFetch = fetch(request).then(async (response) => {
    if (response && response.status === 200 && response.type === 'basic') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  if (cached) return cached;
  const response = await networkFetch;
  return response || Response.error();
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(event.request));
    return;
  }

  event.respondWith(handleAssetRequest(event.request));
});
