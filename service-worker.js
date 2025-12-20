const CACHE_NAME = 'bix-extension-app-v9';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './settings.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];


/* ===== Install ===== */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting();
});

/* ===== Activate ===== */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => (key !== CACHE_NAME ? caches.delete(key) : null)))
    )
  );
  self.clients.claim();
});

/* ===== Fetch ===== */
self.addEventListener('fetch', event => {
  // 安全のため GET 以外は触らない
  if (event.request.method !== 'GET') return;

  const req = event.request;

  // ページ遷移（index.html など）は「ネット優先＋失敗時 index.html にフォールバック」
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // それ以外（CSS/JS/画像など）は「キャッシュ優先＋裏で更新」
  event.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req)
        .then(res => {
          // キャッシュ更新（成功時のみ）
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          return res;
        })
        .catch(() => cached); // ネット失敗時はキャッシュ

      // まずキャッシュがあれば即返し、なければネット
      return cached || fetchPromise;
    })
  );
});

/* ===== 更新がある場合 即ページに通知し反映 ===== */
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
