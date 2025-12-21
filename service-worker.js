// service-worker.js

const CACHE_NAME = 'bix-extension-app-v12';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './settings.html',
  './style.css',
  './app.js',
  './manifest.json',
  // アイコンファイルが実際に存在することを確認してください
  './icons/icon-192.png',
  './icons/icon-512.png',
  './fonts/lineseedjp_a_ttf_bd.ttf',
];

/* ===== Install: キャッシュへのファイル格納 ===== */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // 失敗してもインストールを止めないよう、個別にcatchすることも検討できますが、
      // 基本的にはこれでOKです。
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  // インストール後、待機中のSWを即座にアクティブにする
  self.skipWaiting();
});

/* ===== Activate: 古いキャッシュの削除 ===== */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  // 即座にページをコントロールする
  return self.clients.claim();
});

/* ===== Fetch: 通信の制御 ===== */
self.addEventListener('fetch', event => {
  // 安全のため GET 以外はスルー
  if (event.request.method !== 'GET') return;

  const req = event.request;
  const url = new URL(req.url);

  // 1. HTMLページ（ナビゲーション）の場合
  // 戦略: Network First (ネット優先 -> ダメならキャッシュ)
  // 理由: 料金設定などのロジック変更をすぐに反映させるため
  if (req.mode === 'navigate' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(req)
        .then(async res => {
          // 正常なレスポンスのみキャッシュする
          if (res.ok) {
            const copy = res.clone();
            const cache = await caches.open(CACHE_NAME);
            // ★修正: 固定の './index.html' ではなく、リクエストされたURLに対して保存する
            cache.put(req, copy);
          }
          return res;
        })
        .catch(() => {
          // オフライン時はキャッシュから探す
          return caches.match(req).then(cached => {
            // キャッシュもなければ、index.html を返す（SPA的なフォールバックが必要な場合）
            // 今回は settings.html もあるので、単純にキャッシュを返すだけに留めるのが安全
            return cached;
          });
        })
    );
    return;
  }

  // 2. CSS, JS, 画像などの静的リソース
  // 戦略: Stale-While-Revalidate (キャッシュ優先 -> 裏で更新)
  // 理由: 画面表示を爆速にするため
  event.respondWith(
    caches.match(req).then(cached => {
      // ネットワークへのリクエスト（裏側で実行）
      const fetchPromise = fetch(req).then(async res => {
        if (res.ok) {
          const copy = res.clone();
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, copy);
        }
        return res;
      }).catch(() => {
        // ネットワークエラーは何もしない（キャッシュが生きる）
      });

      // キャッシュがあればそれを即座に返す。なければネットワークの結果を待つ
      return cached || fetchPromise;
    })
  );
});

// app.js からの更新通知用
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});