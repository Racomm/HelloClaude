// Service Worker for Dino/Drunkard PWA
const CACHE_VERSION = 'v4';
const CACHE_NAME = `hello-claude-static-${CACHE_VERSION}`;
const urlsToCache = [
  './',
  './index.html',
  './drunkard.html',
  './manifest.json',
  './drunkard.webmanifest',
  './css/style.css',
  './css/drunkard.css',
  './js/sprite.js',
  './js/sound.js',
  './js/ground.js',
  './js/dino.js',
  './js/obstacle.js',
  './js/score.js',
  './js/game.js',
  './js/drunkard.js'
];

// 安装 Service Worker 并缓存资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// 激活 Service Worker，清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
          return null;
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 导航请求: network-first，保证页面尽快更新
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

// 静态资源: stale-while-revalidate
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

// 拦截网络请求
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(event.request));
    return;
  }

  event.respondWith(
    handleAssetRequest(event.request)
  );
});
