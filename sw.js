/* Wild Rift Stats — Service Worker
 *
 * Стратегии:
 *  - Cache-first + background-revalidate для нашей статики (HTML/CSS/JS/icon)
 *  - Stale-while-revalidate для картинок чемпов/предметов из CDN (CORS-safe)
 *  - Network-only для Firebase/Firestore/Google APIs — не кешируем чтобы
 *    не сломать auth, presence и Firestore-снэпшоты.
 *
 * Версия. Бампи при изменении статики, иначе у юзера может остаться старый JS.
 * Старые caches удаляются в activate.
 */
const VERSION = 'wrs-v1.2026-05-15';

// Что грузим заранее (precache) при первом визите.
// При офлайне эти URL гарантированно доступны.
const PRECACHE_URLS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './draft.js',
  './cms.js',
  './cybersport.js',
  './migrate.js',
  './migrate-winrates.js',
  './i18n.js',
  './icon.svg',
  './manifest.webmanifest'
];

// Хосты, на которые SW НЕ должен влиять (auth, БД, real-time).
const NETWORK_ONLY_HOSTS = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebasestorage.googleapis.com',
  'apis.google.com',
  'accounts.google.com',
  // wildcard'ом через includes — поймём wss/https одинаково
  'firebaseio.com',
  'firebaseapp.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // Тихий precache: если что-то не загрузилось — не ломаем установку.
    await Promise.all(PRECACHE_URLS.map((url) =>
      cache.add(new Request(url, { cache: 'reload' })).catch(() => null)
    ));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Кешируем только GET — POST/PUT/DELETE идут как есть.
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  // Авторизация и Firestore идут network-only.
  if (NETWORK_ONLY_HOSTS.some((h) => url.hostname.includes(h))) return;

  // Своя статика — cache-first + background revalidate.
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Картинки (CDN champion icons и т.п.) — stale-while-revalidate.
  if (/\.(png|jpe?g|webp|gif|svg|ico)(\?|$)/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Всё прочее — без вмешательства.
});

async function staleWhileRevalidate(req) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(req);
  const network = fetch(req).then((res) => {
    // Только успешные/непустые ответы кладём в cache.
    // opaque responses (CORS у некоторых CDN) тоже кешируем — это нормально для картинок.
    if (res && (res.ok || res.type === 'opaque')) {
      cache.put(req, res.clone()).catch(() => {});
    }
    return res;
  }).catch(() => null);
  return cached || (await network) || new Response('', { status: 504, statusText: 'Offline' });
}

// Позволяет странице форсировать активацию новой версии (postMessage SKIP_WAITING).
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
