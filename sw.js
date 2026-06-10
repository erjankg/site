/* Wild Rift Stats — Service Worker
 *
 * Стратегии:
 *  - Network-first (с таймаутом) для нашей статики HTML/CSS/JS — всегда отдаём
 *    согласованный свежий набор файлов; кэш используется только как офлайн-резерв.
 *    Раньше тут был stale-while-revalidate, и файлы (index.html, app.js, cms.js…)
 *    обновлялись в кэше независимо друг от друга — установленное PWA могло
 *    запуститься со смесью старого и нового JS, из-за чего падали обработчики
 *    и не открывались модалки. Network-first это исключает.
 *  - Stale-while-revalidate для картинок (свои и CDN) — меняются редко.
 *  - Network-only для Firebase/Firestore/Google APIs — не кешируем чтобы
 *    не сломать auth, presence и Firestore-снэпшоты.
 *
 * Старые caches удаляются в activate.
 */
const VERSION = 'wrs-v2.20260610-213051';

// Сколько ждём сеть, прежде чем отдать офлайн-резерв из кэша (мс).
const NET_TIMEOUT = 3000;

// Что грузим заранее (precache) при первом визите.
// При офлайне эти URL гарантированно доступны.
const PRECACHE_URLS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './draft.js',
  './draft-logic.js',
  './share.js',
  './cms.js',
  './cybersport.js',
  './tab-pill.js',
  './anim-perf.js',
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

  // Картинки (свои и CDN) — stale-while-revalidate: меняются редко, скорость важнее.
  if (/\.(png|jpe?g|webp|gif|svg|ico)(\?|$)/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Своя статика HTML/CSS/JS — network-first: всегда согласованный свежий набор,
  // кэш только как офлайн-резерв.
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Всё прочее — без вмешательства.
});

// network-first с таймаутом: ждём сеть, при ошибке/таймауте — кэш.
async function networkFirst(req) {
  const cache = await caches.open(VERSION);
  try {
    const res = await fetchWithTimeout(req, NET_TIMEOUT);
    if (res && res.ok) {
      cache.put(req, res.clone()).catch(() => {});
      return res;
    }
    // Не-ok ответ (404/500): пробуем кэш, иначе отдаём что пришло.
    const cached = await cache.match(req);
    return cached || res;
  } catch (_) {
    // Сеть недоступна или таймаут — офлайн-резерв.
    const cached = await cache.match(req);
    return cached || new Response('', { status: 504, statusText: 'Offline' });
  }
}

function fetchWithTimeout(req, ms) {
  return new Promise((resolve, reject) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    fetch(req, { signal: ctrl.signal }).then((res) => {
      clearTimeout(timer);
      resolve(res);
    }).catch((err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

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

// Позволяет странице форсировать активацию новой версии (postMessage SKIP_WAITING)
// и узнать текущую версию (GET_VERSION → отвечаем через MessageChannel-порт).
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  else if (event.data === 'GET_VERSION') {
    if (event.ports && event.ports[0]) event.ports[0].postMessage(VERSION);
  }
});
