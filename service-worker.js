const CACHE_NAME = 'bix-extension-app-v3'; // ←バージョン変更で即更新可
const URLS_TO_CACHE = [
  './',
  './index.html',
  './settings.html',
  './style.css',
  './app.js',
  './manifest.json'
];

/* ===== Install ===== */
self.addEventListener('install', event => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting(); // ★インストール即有効
});

/* ===== Activate ===== */
self.addEventListener('activate', event => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => key !== CACHE_NAME ? caches.delete(key) : null)
      )
    )
  );
  self.clients.claim(); // ★既存ページにも即反映
});

/* ===== Fetch ===== */
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // ネット成功 → 最新を返しつつキャッシュ更新
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, response.clone());
          return response;
        });
      })
      .catch(() => caches.match(event.request)) // オフライン時はキャッシュ使用
  );
});

/* ===== 更新がある場合 即ページに通知し反映 ===== */
self.addEventListener('message', event => {
  if(event.data === 'skipWaiting'){
    self.skipWaiting();
  }
});
