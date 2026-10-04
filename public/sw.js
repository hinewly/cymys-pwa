/**
 * Service Worker — cache-first 策略（与 vocab-pwa 同模式）
 * 改 public/ 下任何文件后必须递增 CACHE_VERSION
 */
const CACHE_VERSION = 'v0.6.5';
const CACHE_NAME = `cymys-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './js/app.js',
  './js/csvParser.js',
  './js/data/questions.csv.js',
  './js/data/paipu.js',
  './js/data/paijing.js',
  './js/data/hanghua.js',
  './js/data/videos.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && new URL(event.request.url).origin === location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
