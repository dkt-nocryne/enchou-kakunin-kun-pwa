// リリースごとに必ず変更。同じ版名の再利用は禁止。
const RELEASE = 'v25';
const PREFIX = 'bix-extension-app-';
const CACHE_NAME = PREFIX + RELEASE;
const BASE = new URL('./', self.location.href);
const FILES = [
  'index.html', 'settings.html', 'style.css', 'app.js', 'manifest.json',
  'icons/icon-192.png', 'icons/icon-512.png', 'fonts/lineseedjp_a_ttf_bd.ttf'
];
const URLS = FILES.map(file => new URL(file, BASE).href);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // HTTPキャッシュを避け、全必須ファイルが取得できた場合だけインストール成功。
    await cache.addAll(URLS.map(url => new Request(url, { cache: 'reload' })));
    // 自動skipWaitingは行わない。更新ボタンまたは旧app.jsのメッセージを待つ。
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key =>
      key.startsWith(PREFIX) && key !== CACHE_NAME
    ).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  // v20のapp.jsとの移行互換性も維持。
  if (event.data === 'skipWaiting' || event.data?.type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting());
  }
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== BASE.origin ||
      !url.pathname.startsWith(BASE.pathname)) return;

  // このアプリの既知ファイルのみ処理。HTML/JS/CSSを同一版で固定する。
  const canonical = new URL(url.href);
  canonical.search = '';
  canonical.hash = '';
  if (canonical.href === BASE.href) canonical.pathname += 'index.html';
  if (!URLS.includes(canonical.href)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(canonical.href);
    if (cached) return cached;
    // キャッシュの欠損を別リリースのファイルで埋めない。
    return new Response('アプリの保存データが不足しています。オンラインで更新してください。', {
      status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  })());
});

