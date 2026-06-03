// SEO static-page generator for pro-wildrift.com
//
// Сайт — одностраничное приложение на GitHub Pages: для Google это один URL.
// Этот скрипт «печатает» настоящие отдельные HTML-страницы (по чемпиону, предмету,
// руне, тир-листу и т.д.) с реальным текстом, заголовками и мета-тегами, чтобы Google
// мог индексировать и ранжировать каждую тему отдельно.
//
// Данные берутся из тех же источников, что и живой сайт:
//   - статы чемпионов: опубликованная Google-таблица (TSV)
//   - винрейты / предметы / руны: Firestore (публичное чтение, без ключей)
// Карты имён (RU<->EN) извлекаются прямо из app.js, чтобы не было рассинхрона.
//
// Запуск:  npm run seo
// Вывод:   /champions/<slug>/index.html, /items/<slug>/ ... + обновлённый sitemap.xml

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SITE = 'https://pro-wildrift.com';
const PROJECT = 'wildrift-stats-600c0';
const G_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQnqVwUluQiuho1Wj6A3tZRvDJsLlyAZYmg0soWy4EJ_Un00P8e3Y2EAo3Iv6KvMm5HPwce_0AnzPfb/pub?gid=0&single=true&output=tsv';
const DDV = '14.24.1';
const BUILD_DATE = new Date().toISOString().slice(0, 10);

// ── helpers ──────────────────────────────────────────────────────────────
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const slug = (s) => String(s).toLowerCase()
  .replace(/['’.]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9а-яё]/gi, '');

function writePage(relDir, html) {
  const dir = path.join(ROOT, relDir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
}

// ── name maps extracted from app.js ────────────────────────────────────────
const appjs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');

function extractObj(name) {
  const m = appjs.match(new RegExp(name + '\\s*=\\s*\\{([\\s\\S]*?)\\n\\s*\\};'));
  if (!m) { console.warn('[seo] map not found:', name); return {}; }
  const out = {};
  const re = /(['"])(.+?)\1\s*:\s*(['"])(.+?)\3/g;
  let r;
  while ((r = re.exec(m[1]))) out[r[2]] = r[4];
  return out;
}

const RU2EN = extractObj('WR_CHAMP_KEYS');        // 'Аатрокс' -> 'Aatrox'
const DISP = extractObj('_wrprDisplayName');       // 'JarvanIV' -> 'Jarvan IV'
const SPECIAL_ICON = extractObj('_wrprSpecialIcons'); // 'Norra' -> url/path

const EN2RU = {};
for (const [ru, en] of Object.entries(RU2EN)) EN2RU[en] = ru;

// EN ключ из таблицы -> id в ddragon, если отличается
const DD_ID = { Wukong: 'MonkeyKing' };

function ruName(en) { return EN2RU[en] || DISP[en] || en; }
function prettyEn(en) { return DISP[en] || en; }

function champIcon(en) {
  const sp = SPECIAL_ICON[en];
  if (sp) return sp.startsWith('http') ? sp : (SITE + '/' + sp.replace(/^\//, ''));
  const id = DD_ID[en] || en;
  return `https://ddragon.leagueoflegends.com/cdn/${DDV}/img/champion/${id}.png`;
}

// ── Firestore (public read, REST) ──────────────────────────────────────────
function decode(v) {
  if (v == null) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decode);
  if ('mapValue' in v) return decodeFields(v.mapValue.fields || {});
  return null;
}
function decodeFields(f) { const o = {}; for (const k in f) o[k] = decode(f[k]); return o; }

async function fetchCollection(name) {
  let docs = [], pageToken = '';
  do {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${name}?pageSize=300`
      + (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '');
    const j = await fetch(url).then(r => r.json());
    if (j.error) throw new Error(`Firestore ${name}: ${j.error.message}`);
    (j.documents || []).forEach(d => docs.push({ id: d.name.split('/').pop(), ...decodeFields(d.fields || {}) }));
    pageToken = j.nextPageToken || '';
  } while (pageToken);
  return docs;
}

// ── champions from published Google Sheet ──────────────────────────────────
async function fetchChampions() {
  const tsv = await fetch(G_URL).then(r => r.text());
  if (tsv.trim().startsWith('<')) throw new Error('Sheet вернул HTML вместо TSV (лист не опубликован)');
  const lines = tsv.trim().split('\n');
  const heads = lines[0].split('\t').map(h => h.trim());
  return lines.slice(1).map(l => {
    const c = l.split('\t');
    const o = {}; heads.forEach((h, i) => o[h] = (c[i] || '').trim());
    const num = (x) => { const n = parseFloat(x); return isNaN(n) ? 0 : n; };
    const roles = [];
    if (+o.Is_Top) roles.push('Топ');
    if (+o.Is_Jungle) roles.push('Лес');
    if (+o.Is_Mid) roles.push('Мид');
    if (+o.Is_Adc) roles.push('Бот (стрелок)');
    if (+o.Is_Support) roles.push('Поддержка');
    return {
      en: o.Champion,
      stats: {
        ad: [num(o.AD_Base), num(o.AD_Growth)],
        hp: [num(o.HP_Base), num(o.HP_Growth)],
        mana: [num(o.Mana_Base), num(o.Mana_Growth)],
        armor: [num(o.Armor_Base), num(o.Armor_Growth)],
        mr: [num(o.MR_Base), num(o.MR_Growth)],
        as: [num(o.AS_Base), num(o.AS_Growth)],
      },
      resource: o.Resource || '',
      roles,
    };
  }).filter(x => x.en);
}

// winrate index: normalized EN name -> [{rank, role, wr, pr}]
function buildWinrateIndex(winrateDocs) {
  const RANK_RU = { 'чалик': 'Челленджер', 'алмаз': 'Алмаз', 'мастер': 'Мастер', 'грандмастер': 'Грандмастер', 'суверен': 'Суверен' };
  const ROLE_RU = { top: 'Топ', jungle: 'Лес', mid: 'Мид', adc: 'Бот', support: 'Поддержка' };
  const idx = {};
  for (const doc of winrateDocs) {
    const rank = RANK_RU[doc.id] || doc.id;
    for (const role of ['top', 'jungle', 'mid', 'adc', 'support']) {
      const arr = doc[role];
      if (!Array.isArray(arr)) continue;
      for (const e of arr) {
        if (!e || !e.name) continue;
        const k = norm(e.name);
        (idx[k] = idx[k] || []).push({ rank, role: ROLE_RU[role] || role, wr: e.wr, pr: e.pr });
      }
    }
  }
  return idx;
}

// ── shared HTML shell ──────────────────────────────────────────────────────
const CSS = `
:root{--bg:#010A13;--bg2:#011520;--card:rgba(1,15,32,.6);--accent:#0BC4E3;--gold:#C89B3C;
--tx:#fff;--tx2:rgba(255,255,255,.72);--tx3:rgba(255,255,255,.42);--bd:rgba(11,196,227,.2)}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--tx);font:16px/1.6 system-ui,'Segoe UI',Roboto,sans-serif;
background-image:radial-gradient(ellipse at 20% 0%,rgba(11,196,227,.07),transparent 55%),radial-gradient(ellipse at 90% 100%,rgba(40,20,80,.25),transparent 55%)}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:1080px;margin:0 auto;padding:0 18px}
header.top{border-bottom:1px solid var(--bd);background:rgba(1,10,19,.85);position:sticky;top:0;z-index:5;backdrop-filter:blur(8px)}
header.top .wrap{display:flex;align-items:center;gap:18px;height:56px}
.logo{font-weight:800;letter-spacing:.5px;font-size:18px;color:#fff}
.logo b{color:var(--accent)}
nav.main{display:flex;gap:16px;flex-wrap:wrap;font-size:14px}
nav.main a{color:var(--tx2)}
.crumbs{font-size:13px;color:var(--tx3);padding:14px 0 0}
.crumbs a{color:var(--tx3)}
h1{font-size:30px;line-height:1.2;margin:14px 0 6px}
h2{font-size:21px;margin:30px 0 12px;border-left:3px solid var(--accent);padding-left:10px}
.lead{color:var(--tx2);font-size:17px;max-width:70ch}
.hero{display:flex;gap:18px;align-items:center;margin-top:18px}
.hero img{width:84px;height:84px;border-radius:12px;border:1px solid var(--bd);background:var(--bg2)}
.tags{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.tag{font-size:13px;color:var(--tx2);background:var(--card);border:1px solid var(--bd);border-radius:20px;padding:3px 12px}
table{width:100%;border-collapse:collapse;margin:10px 0;font-size:14px}
th,td{padding:7px 10px;text-align:right;border-bottom:1px solid rgba(255,255,255,.07)}
th:first-child,td:first-child{text-align:left}
thead th{color:var(--accent);font-weight:600;border-bottom:1px solid var(--bd)}
tbody tr:hover{background:rgba(11,196,227,.05)}
.card{background:var(--card);border:1px solid var(--bd);border-radius:14px;padding:16px 18px;margin:14px 0}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin:12px 0}
.gcard{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:12px;display:flex;gap:10px;align-items:center}
.gcard img{width:40px;height:40px;border-radius:8px;background:var(--bg2)}
.gcard b{display:block;font-size:14px}.gcard span{font-size:12px;color:var(--tx3)}
.cta{display:inline-block;margin:18px 0;background:linear-gradient(135deg,var(--accent),#0892ab);color:#012;font-weight:700;
padding:11px 22px;border-radius:10px}
.cta:hover{text-decoration:none;filter:brightness(1.08)}
footer.bot{border-top:1px solid var(--bd);margin-top:40px;padding:24px 0;color:var(--tx3);font-size:13px}
footer.bot a{color:var(--tx3)}
.muted{color:var(--tx3);font-size:13px}
@media(max-width:560px){h1{font-size:24px}.hero img{width:64px;height:64px}th,td{padding:6px 6px;font-size:13px}}
`;

const NAV = [
  ['/champions/', 'Чемпионы'],
  ['/items/', 'Предметы'],
  ['/runes/', 'Руны'],
  ['/tier-list/', 'Тир-лист'],
  ['/', 'Инструменты'],
].map(([h, t]) => `<a href="${h}">${t}</a>`).join('');

function htmlDoc({ title, desc, canonical, body, ogImage, jsonld, crumbs }) {
  const og = ogImage || (SITE + '/preview.jpg');
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${og}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/icon.svg">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
<style>${CSS}</style>
</head>
<body>
<header class="top"><div class="wrap">
<a class="logo" href="/">PRO<b>WILDRIFT</b></a>
<nav class="main">${NAV}</nav>
</div></header>
<main class="wrap">
${crumbs ? `<div class="crumbs">${crumbs}</div>` : ''}
${body}
</main>
<footer class="bot"><div class="wrap">
PRO WILDRIFT — статы чемпионов, винрейты, предметы, руны и инструменты для League of Legends: Wild Rift.
Данные обновляются вместе с патчами. <a href="/">Открыть приложение →</a>
</div></footer>
</body>
</html>`;
}

const crumb = (...parts) => parts.map((p, i) =>
  i === parts.length - 1 ? esc(p[1]) : `<a href="${p[0]}">${esc(p[1])}</a>`).join(' › ');

// ── champion page ──────────────────────────────────────────────────────────
function champRows(stats) {
  const order = [['hp', 'Здоровье'], ['ad', 'Атака (AD)'], ['armor', 'Броня'], ['mr', 'Сопр. магии'], ['mana', 'Мана'], ['as', 'Скор. атаки']];
  const lvls = [1, 5, 10, 15];
  let head = '<tr><th>Параметр</th>' + lvls.map(l => `<th>Ур. ${l}</th>`).join('') + '<th>За уровень</th></tr>';
  let rows = '';
  for (const [key, label] of order) {
    const [b, g] = stats[key];
    if (!b && !g) continue;
    const at = (l) => { const v = b + (l - 1) * g; return Math.round(v * 100) / 100; };
    rows += `<tr><td>${label}</td>` + lvls.map(l => `<td>${at(l)}</td>`).join('') + `<td>${g ? '+' + (Math.round(g * 100) / 100) : '—'}</td></tr>`;
  }
  return `<table><thead>${head}</thead><tbody>${rows}</tbody></table>`;
}

function championPage(c, wrIndex) {
  const ru = ruName(c.en);
  const url = `${SITE}/champions/${slug(c.en)}/`;
  const rolesTxt = c.roles.length ? c.roles.join(', ') : 'разные линии';
  const resTxt = c.resource && c.resource.toLowerCase() !== 'mana' && c.resource !== 'Мана'
    ? ` Ресурс — ${esc(c.resource)}.` : (c.stats.mana[0] ? ' Использует ману.' : ' Не использует ману.');

  const wr = (wrIndex[norm(c.en)] || []);
  let wrSection = '';
  if (wr.length) {
    const rankOrder = ['Челленджер', 'Грандмастер', 'Мастер', 'Алмаз', 'Суверен'];
    wr.sort((a, b) => rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank));
    let rows = wr.map(e => `<tr><td>${esc(e.rank)}</td><td>${esc(e.role)}</td><td>${e.wr != null ? e.wr + '%' : '—'}</td><td>${e.pr != null ? e.pr + '%' : '—'}</td></tr>`).join('');
    wrSection = `<h2>Винрейт ${esc(ru)} по рангам</h2>
<p class="lead">Актуальный процент побед и популярность ${esc(ru)} в Wild Rift на текущем патче.</p>
<div class="card"><table><thead><tr><th>Ранг</th><th>Линия</th><th>Винрейт</th><th>Пикрейт</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  const title = `${ru} Wild Rift — статы по уровням, винрейт и сборка`;
  const desc = `${ru} в Wild Rift: базовые характеристики на уровнях 1–15 (здоровье, атака, броня), линии (${rolesTxt}) и актуальный винрейт по рангам.`;

  const body = `
<div class="hero">
  <img src="${champIcon(c.en)}" alt="${esc(ru)} Wild Rift" width="84" height="84" loading="eager">
  <div>
    <h1>${esc(ru)} — Wild Rift</h1>
    <div class="tags">${c.roles.map(r => `<span class="tag">${esc(r)}</span>`).join('')}</div>
  </div>
</div>
<p class="lead">${esc(ru)} (${esc(prettyEn(c.en))}) — чемпион League of Legends: Wild Rift. Играется на позициях: ${esc(rolesTxt)}.${resTxt} Ниже — базовые характеристики по уровням и винрейт по рангам.</p>

<h2>Характеристики ${esc(ru)} по уровням</h2>
<div class="card">${champRows(c.stats)}</div>
<p class="muted">Значения посчитаны как «база + прирост за уровень». Полную таблицу всех чемпионов с сортировкой смотрите в <a href="/">интерактивном справочнике</a>.</p>

${wrSection}

<a class="cta" href="/">Открыть ${esc(ru)} в калькуляторе урона и драфтере →</a>
`;

  const jsonld = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: title, description: desc, mainEntityOfPage: url,
    image: champIcon(c.en), inLanguage: 'ru',
    publisher: { '@type': 'Organization', name: 'PRO WILDRIFT', url: SITE },
  };

  return htmlDoc({
    title, desc, canonical: url, ogImage: champIcon(c.en), jsonld,
    crumbs: crumb(['/', 'Главная'], ['/champions/', 'Чемпионы'], [url, ru]),
    body,
  });
}

function championsIndex(champs) {
  const url = `${SITE}/champions/`;
  const sorted = [...champs].sort((a, b) => ruName(a.en).localeCompare(ruName(b.en), 'ru'));
  const cards = sorted.map(c => `<a class="gcard" href="/champions/${slug(c.en)}/">
<img src="${champIcon(c.en)}" alt="${esc(ruName(c.en))}" width="40" height="40" loading="lazy">
<span style="overflow:hidden"><b>${esc(ruName(c.en))}</b><span>${esc(c.roles[0] || '')}</span></span></a>`).join('');
  const title = 'Все чемпионы Wild Rift — статы и винрейты | PRO WILDRIFT';
  const desc = `Полный список из ${sorted.length} чемпионов Wild Rift с базовыми характеристиками по уровням и винрейтом по рангам. Выбери чемпиона и смотри подробную страницу.`;
  const body = `<h1>Чемпионы Wild Rift</h1>
<p class="lead">${sorted.length} чемпионов League of Legends: Wild Rift. Нажми на чемпиона, чтобы открыть его характеристики по уровням 1–15 и винрейт по рангам.</p>
<div class="grid">${cards}</div>`;
  return htmlDoc({
    title, desc, canonical: url,
    crumbs: crumb(['/', 'Главная'], [url, 'Чемпионы']),
    body,
    jsonld: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, url, inLanguage: 'ru' },
  });
}

// ── items & runes ───────────────────────────────────────────────────────────
// База частично содержит битый авто-перевод (латиница слиплась с кириллицей).
// Такие описания на страницы НЕ выводим, чтобы не публиковать мусор.
function looksClean(text) {
  if (!text) return false;
  for (const w of String(text).split(/\s+/)) {
    if (/[a-z]/i.test(w) && /[а-яё]/i.test(w)) return false;
  }
  return true;
}
const tidy = (s) => String(s || '').replace(/[ \t]{2,}/g, ' ').replace(/ *\n */g, '\n').trim();

// rich-text разметка сайта ([текст|ad], [icon:arm]) → обычный текст для SEO-страниц
const richToPlain = (s) => String(s || '')
  .replace(/\[icon:[^\]]*\]/g, '')
  .replace(/\[([^\]|]*)\|[^\]]*\]/g, '$1')
  .replace(/[ \t]{2,}/g, ' ')
  .replace(/ *\n */g, '\n')
  .trim();

const ITEM_CAT = {
  defensive: 'Защитные предметы', magic: 'Магические предметы', support: 'Предметы поддержки',
  enchants: 'Зачарования ботинок', boots: 'Ботинки', physical: 'Предметы физического урона',
};
const RUNE_CAT = {
  Keystone: 'Ключевые руны', Inspiration: 'Вдохновение', Resolve: 'Стойкость',
  Precision: 'Точность', Domination: 'Доминирование',
};

// уникальные slug в пределах раздела
function uniqueSlugger() {
  const used = new Set();
  return (name, id) => {
    let s = slug(name) || ('x-' + slug(id));
    if (!s) s = 'x';
    let out = s, i = 2;
    while (used.has(out)) out = s + '-' + (i++);
    used.add(out);
    return out;
  };
}

function itemPage(it, s) {
  const name = it.name_ru && it.name_ru !== it.name_en ? it.name_ru : (it.name_en || it.name_ru || it.id);
  const url = `${SITE}/items/${s}/`;
  const catRu = ITEM_CAT[it.category] || 'Предметы';
  const stats = richToPlain(it.stats);
  const cost = tidy(it.cost);
  const rawDesc = richToPlain(it.description_ru || it.description);
  const desc = looksClean(rawDesc) ? rawDesc : '';

  const title = `${name} Wild Rift — характеристики, цена, эффект`;
  const metaDesc = `${name} в Wild Rift: ${catRu.toLowerCase()}.${stats ? ' Характеристики: ' + stats + '.' : ''}${cost ? ' Цена: ' + cost + '.' : ''}`;

  const body = `
<div class="hero">
  ${it.image ? `<img src="${esc(it.image)}" alt="${esc(name)} Wild Rift" width="84" height="84" loading="eager">` : ''}
  <div><h1>${esc(name)} — Wild Rift</h1>
  <div class="tags"><span class="tag">${esc(catRu)}</span>${cost ? `<span class="tag">${esc(cost)}</span>` : ''}</div></div>
</div>
<p class="lead">${esc(name)} — ${esc(catRu.toLowerCase())} в League of Legends: Wild Rift.${cost ? ' Стоимость: ' + esc(cost) + '.' : ''}</p>
${stats ? `<h2>Характеристики</h2><div class="card"><p>${esc(stats)}</p></div>` : ''}
${desc ? `<h2>Эффект</h2><div class="card"><p>${esc(desc).replace(/\n/g, '<br>')}</p></div>` : ''}
<a class="cta" href="/">Открыть список всех предметов и сборки →</a>`;

  return htmlDoc({
    title, desc: metaDesc, canonical: url, ogImage: it.image || undefined,
    crumbs: crumb(['/', 'Главная'], ['/items/', 'Предметы'], [url, name]),
    body,
    jsonld: { '@context': 'https://schema.org', '@type': 'Product', name, image: it.image, category: catRu, inLanguage: 'ru' },
  });
}

function itemsIndex(items, slugs) {
  const url = `${SITE}/items/`;
  const byCat = {};
  items.forEach((it, i) => { (byCat[it.category] = byCat[it.category] || []).push({ it, s: slugs[i] }); });
  let sections = '';
  for (const cat of Object.keys(ITEM_CAT)) {
    const list = byCat[cat]; if (!list || !list.length) continue;
    const cards = list.map(({ it, s }) => {
      const name = it.name_ru && it.name_ru !== it.name_en ? it.name_ru : (it.name_en || it.id);
      return `<a class="gcard" href="/items/${s}/">${it.image ? `<img src="${esc(it.image)}" alt="${esc(name)}" width="40" height="40" loading="lazy">` : ''}<span style="overflow:hidden"><b>${esc(name)}</b><span>${esc(tidy(it.cost))}</span></span></a>`;
    }).join('');
    sections += `<h2>${esc(ITEM_CAT[cat])}</h2><div class="grid">${cards}</div>`;
  }
  const title = 'Все предметы Wild Rift — характеристики и цены | PRO WILDRIFT';
  const desc = `Полный список предметов League of Legends: Wild Rift по категориям: защита, магия, физический урон, ботинки, зачарования и предметы поддержки. Характеристики и стоимость.`;
  return htmlDoc({
    title, desc, canonical: url,
    crumbs: crumb(['/', 'Главная'], [url, 'Предметы']),
    body: `<h1>Предметы Wild Rift</h1><p class="lead">Все предметы Wild Rift с характеристиками и ценой, сгруппированные по категориям.</p>${sections}`,
    jsonld: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, url, inLanguage: 'ru' },
  });
}

function runePage(r, s) {
  const name = r.name_ru && r.name_ru !== r.name_en ? r.name_ru : (r.name_en || r.id);
  const url = `${SITE}/runes/${s}/`;
  const catRu = RUNE_CAT[r.category] || 'Руны';
  const rawDesc = richToPlain(r.description_ru || r.description);
  const desc = looksClean(rawDesc) ? rawDesc : '';
  const title = `${name} Wild Rift — руна, эффект и дерево`;
  const metaDesc = `${name} — руна в Wild Rift (${catRu}).${desc ? ' ' + desc.slice(0, 140) : ''}`;
  const body = `
<div class="hero">
  ${r.image ? `<img src="${esc(r.image)}" alt="${esc(name)} руна Wild Rift" width="84" height="84" loading="eager">` : ''}
  <div><h1>${esc(name)} — руна Wild Rift</h1><div class="tags"><span class="tag">${esc(catRu)}</span></div></div>
</div>
<p class="lead">${esc(name)} — руна из дерева «${esc(catRu)}» в League of Legends: Wild Rift.</p>
${desc ? `<h2>Эффект руны</h2><div class="card"><p>${esc(desc).replace(/\n/g, '<br>')}</p></div>` : ''}
<a class="cta" href="/">Открыть все руны и собрать набор →</a>`;
  return htmlDoc({
    title, desc: metaDesc, canonical: url, ogImage: r.image || undefined,
    crumbs: crumb(['/', 'Главная'], ['/runes/', 'Руны'], [url, name]),
    body,
    jsonld: { '@context': 'https://schema.org', '@type': 'Article', headline: title, image: r.image, inLanguage: 'ru' },
  });
}

function runesIndex(runes, slugs) {
  const url = `${SITE}/runes/`;
  const byCat = {};
  runes.forEach((r, i) => { (byCat[r.category] = byCat[r.category] || []).push({ r, s: slugs[i] }); });
  let sections = '';
  for (const cat of Object.keys(RUNE_CAT)) {
    const list = byCat[cat]; if (!list || !list.length) continue;
    const cards = list.map(({ r, s }) => {
      const name = r.name_ru && r.name_ru !== r.name_en ? r.name_ru : (r.name_en || r.id);
      return `<a class="gcard" href="/runes/${s}/">${r.image ? `<img src="${esc(r.image)}" alt="${esc(name)}" width="40" height="40" loading="lazy">` : ''}<span style="overflow:hidden"><b>${esc(name)}</b></span></a>`;
    }).join('');
    sections += `<h2>${esc(RUNE_CAT[cat])}</h2><div class="grid">${cards}</div>`;
  }
  const title = 'Все руны Wild Rift — деревья и эффекты | PRO WILDRIFT';
  const desc = 'Руны League of Legends: Wild Rift по деревьям: ключевые руны, Точность, Доминирование, Стойкость, Вдохновение. Эффекты каждой руны.';
  return htmlDoc({
    title, desc, canonical: url,
    crumbs: crumb(['/', 'Главная'], [url, 'Руны']),
    body: `<h1>Руны Wild Rift</h1><p class="lead">Все руны Wild Rift, сгруппированные по деревьям.</p>${sections}`,
    jsonld: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, url, inLanguage: 'ru' },
  });
}

// ── tier list (data-driven from winrates) ───────────────────────────────────
const ROLES = [
  { key: 'top', slug: 'top', ru: 'Топ' },
  { key: 'jungle', slug: 'jungle', ru: 'Лес' },
  { key: 'mid', slug: 'mid', ru: 'Мид' },
  { key: 'adc', slug: 'bot', ru: 'Бот (стрелок)' },
  { key: 'support', slug: 'support', ru: 'Поддержка' },
];

function tierOf(wr) {
  if (wr >= 52.5) return 'S';
  if (wr >= 51) return 'A';
  if (wr >= 49.5) return 'B';
  return 'C';
}

// role -> [{en, ru, wr, pr, tier}] (усреднено по рангам), отсортировано по wr
function buildTierData(winrateDocs) {
  const out = {};
  for (const role of ROLES) {
    const agg = {};
    for (const doc of winrateDocs) {
      const arr = doc[role.key];
      if (!Array.isArray(arr)) continue;
      for (const e of arr) {
        if (!e || !e.name || e.wr == null) continue;
        const a = agg[e.name] = agg[e.name] || { wrSum: 0, prSum: 0, n: 0 };
        a.wrSum += e.wr; a.prSum += (e.pr || 0); a.n++;
      }
    }
    out[role.slug] = Object.entries(agg).map(([en, a]) => {
      const wr = Math.round((a.wrSum / a.n) * 100) / 100;
      return { en, ru: ruName(en), icon: champIcon(en), wr, pr: Math.round((a.prSum / a.n) * 100) / 100, tier: tierOf(wr) };
    }).sort((x, y) => y.wr - x.wr);
  }
  return out;
}

const TIER_COLOR = { S: '#D64545', A: '#D4760A', B: '#C89B3C', C: '#5b8a72' };

function tierTable(list) {
  const rows = list.map((c, i) => `<tr>
<td>${i + 1}</td>
<td><span style="display:inline-flex;align-items:center;gap:8px"><img src="${esc(c.icon)}" alt="${esc(c.ru)}" width="28" height="28" style="border-radius:6px;vertical-align:middle" loading="lazy"> <a href="/champions/${slug(c.en)}/">${esc(c.ru)}</a></span></td>
<td><b style="color:${TIER_COLOR[c.tier]}">${c.tier}</b></td>
<td>${c.wr}%</td>
<td>${c.pr ? c.pr + '%' : '—'}</td>
</tr>`).join('');
  return `<div class="card"><table><thead><tr><th>#</th><th>Чемпион</th><th>Тир</th><th>Винрейт</th><th>Пикрейт</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function tierRolePage(role, list) {
  const url = `${SITE}/tier-list/${role.slug}/`;
  const title = `Тир-лист ${role.ru} Wild Rift — лучшие чемпионы по винрейту`;
  const desc = `Актуальный тир-лист чемпионов на линии ${role.ru} в Wild Rift. Рейтинг по среднему винрейту на высоких рангах: тиры S, A, B, C.`;
  const top = list.slice(0, 5).map(c => c.ru).join(', ');
  const body = `<h1>Тир-лист ${esc(role.ru)} — Wild Rift</h1>
<p class="lead">Лучшие чемпионы на линии ${esc(role.ru)} в League of Legends: Wild Rift по среднему винрейту на высоких рангах. В топе сейчас: ${esc(top)}.</p>
${tierTable(list)}
<p class="muted">Тиры назначаются по винрейту: S — от 52.5%, A — 51–52.5%, B — 49.5–51%, C — ниже 49.5%. Данные обновляются вместе с патчами.</p>
<a class="cta" href="/">Открыть драфтер и таблицу винрейтов →</a>`;
  return htmlDoc({
    title, desc, canonical: url,
    crumbs: crumb(['/', 'Главная'], ['/tier-list/', 'Тир-лист'], [url, role.ru]),
    body,
    jsonld: { '@context': 'https://schema.org', '@type': 'Article', headline: title, description: desc, inLanguage: 'ru' },
  });
}

function tierIndex(tierData) {
  const url = `${SITE}/tier-list/`;
  let sections = '';
  for (const role of ROLES) {
    const list = tierData[role.slug] || [];
    if (!list.length) continue;
    sections += `<h2><a href="/tier-list/${role.slug}/">Тир-лист ${esc(role.ru)}</a></h2>${tierTable(list.slice(0, 8))}<p class="muted"><a href="/tier-list/${role.slug}/">Полный тир-лист ${esc(role.ru)} →</a></p>`;
  }
  const title = 'Тир-лист Wild Rift — лучшие чемпионы по линиям | PRO WILDRIFT';
  const desc = 'Актуальный тир-лист чемпионов Wild Rift по всем линиям: топ, лес, мид, бот, поддержка. Рейтинг по винрейту, тиры S/A/B/C.';
  return htmlDoc({
    title, desc, canonical: url,
    crumbs: crumb(['/', 'Главная'], [url, 'Тир-лист']),
    body: `<h1>Тир-лист Wild Rift</h1><p class="lead">Лучшие чемпионы Wild Rift по линиям, рейтинг по среднему винрейту на высоких рангах.</p>${sections}`,
    jsonld: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, url, inLanguage: 'ru' },
  });
}

// ── tool landing pages (substantive authored copy, не «тонкие» страницы) ──────
function landingPage({ s, title, desc, h1, paras, faq, cta }) {
  const url = `${SITE}/${s}/`;
  const body = `<h1>${esc(h1)}</h1>
${paras.map(p => `<p class="lead">${p}</p>`).join('\n')}
${faq && faq.length ? `<h2>Частые вопросы</h2>${faq.map(([q, a]) => `<div class="card"><b>${esc(q)}</b><p class="muted" style="margin:6px 0 0">${esc(a)}</p></div>`).join('')}` : ''}
<a class="cta" href="/">${esc(cta)} →</a>`;
  const jsonld = faq && faq.length ? {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  } : { '@context': 'https://schema.org', '@type': 'WebPage', name: title, url, inLanguage: 'ru' };
  return htmlDoc({ title, desc, canonical: url, crumbs: crumb(['/', 'Главная'], [url, h1]), body, jsonld });
}

// ── main ───────────────────────────────────────────────────────────────────
const urls = []; // for sitemap: {loc, priority}

async function main() {
  console.log('[seo] fetching data…');
  const [champs, winrateDocs, items, runes] = await Promise.all([
    fetchChampions(),
    fetchCollection('winrates').catch(e => { console.warn('[seo]', e.message); return []; }),
    fetchCollection('items').catch(e => { console.warn('[seo]', e.message); return []; }),
    fetchCollection('runes').catch(e => { console.warn('[seo]', e.message); return []; }),
  ]);
  console.log(`[seo] champions: ${champs.length}, winrate ranks: ${winrateDocs.length}, items: ${items.length}, runes: ${runes.length}`);
  console.log(`[seo] name map RU->EN: ${Object.keys(RU2EN).length} entries`);

  const wrIndex = buildWinrateIndex(winrateDocs);

  // Phase A: champions
  let wrHit = 0;
  for (const c of champs) {
    writePage(`champions/${slug(c.en)}`, championPage(c, wrIndex));
    urls.push({ loc: `${SITE}/champions/${slug(c.en)}/`, priority: '0.8' });
    if ((wrIndex[norm(c.en)] || []).length) wrHit++;
  }
  writePage('champions', championsIndex(champs));
  urls.push({ loc: `${SITE}/champions/`, priority: '0.9' });
  console.log(`[seo] champions pages: ${champs.length} (+index). winrate matched: ${wrHit}/${champs.length}`);

  // Phase B: items
  const validItems = items
    .filter(it => (it.name_en || it.name_ru) && ITEM_CAT[it.category])
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const itemSlug = uniqueSlugger();
  const itemSlugs = validItems.map(it => itemSlug(it.name_en || it.name_ru, it.id));
  validItems.forEach((it, i) => {
    writePage(`items/${itemSlugs[i]}`, itemPage(it, itemSlugs[i]));
    urls.push({ loc: `${SITE}/items/${itemSlugs[i]}/`, priority: '0.7' });
  });
  writePage('items', itemsIndex(validItems, itemSlugs));
  urls.push({ loc: `${SITE}/items/`, priority: '0.8' });
  console.log(`[seo] items pages: ${validItems.length} (+index, skipped ${items.length - validItems.length})`);

  // Phase B: runes (только осмысленные деревья)
  const validRunes = runes
    .filter(r => (r.name_en || r.name_ru) && RUNE_CAT[r.category])
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const runeSlug = uniqueSlugger();
  const runeSlugs = validRunes.map(r => runeSlug(r.name_en || r.name_ru, r.id));
  validRunes.forEach((r, i) => {
    writePage(`runes/${runeSlugs[i]}`, runePage(r, runeSlugs[i]));
    urls.push({ loc: `${SITE}/runes/${runeSlugs[i]}/`, priority: '0.6' });
  });
  writePage('runes', runesIndex(validRunes, runeSlugs));
  urls.push({ loc: `${SITE}/runes/`, priority: '0.7' });
  console.log(`[seo] runes pages: ${validRunes.length} (+index, skipped ${runes.length - validRunes.length})`);

  // Phase C: tier list (data-driven)
  const tierData = buildTierData(winrateDocs);
  let tierPages = 0;
  for (const role of ROLES) {
    const list = tierData[role.slug] || [];
    if (!list.length) continue;
    writePage(`tier-list/${role.slug}`, tierRolePage(role, list));
    urls.push({ loc: `${SITE}/tier-list/${role.slug}/`, priority: '0.8' });
    tierPages++;
  }
  writePage('tier-list', tierIndex(tierData));
  urls.push({ loc: `${SITE}/tier-list/`, priority: '0.9' });
  console.log(`[seo] tier-list pages: ${tierPages} roles (+index)`);

  // Phase D: tool landing pages (содержательные описания инструментов)
  const landings = [
    landingPage({
      s: 'drafter', title: 'Драфтер Wild Rift — симулятор пик/бан и контрпики | PRO WILDRIFT',
      desc: 'Бесплатный драфтер Wild Rift: симулятор фазы пиков и банов, подсказки по контрпикам и силе команды. Тренируй драфт соло или с друзьями.',
      h1: 'Драфтер Wild Rift — симулятор пиков и банов',
      cta: 'Открыть драфтер',
      paras: [
        'Драфтер — это интерактивный симулятор фазы выбора и запрета чемпионов (пик/бан) в League of Legends: Wild Rift. Он повторяет порядок драфта из рейтинговых игр, помогает отрабатывать запреты против сильных чемпионов и подбирать контрпики под состав соперника.',
        'Инструмент показывает винрейты чемпионов по ролям прямо во время драфта, поэтому ты видишь, кто сейчас в силе на каждой линии, и не теряешь пик вслепую. Есть кооперативный режим: можно драфтить вместе с друзьями по ссылке — удобно для тренировки командой перед турниром.',
        'Драфтер работает в браузере без установки и полностью бесплатен. Открой его и попробуй разыграть свой следующий ранговый драфт заранее.',
      ],
      faq: [
        ['Что такое драфт в Wild Rift?', 'Драфт — это фаза перед игрой, где команды по очереди банят и выбирают чемпионов. Грамотный драфт часто решает исход матча ещё до его начала.'],
        ['Можно ли драфтить с друзьями?', 'Да, в драфтере есть кооперативный режим по ссылке: вы выбираете чемпионов вместе в реальном времени.'],
        ['Это бесплатно?', 'Да, драфтер и все инструменты на сайте бесплатны и работают прямо в браузере.'],
      ],
    }),
    landingPage({
      s: 'damage-calculator', title: 'Калькулятор урона Wild Rift — расчёт урона и сборок | PRO WILDRIFT',
      desc: 'Калькулятор урона Wild Rift: посчитай урон чемпиона с учётом предметов, брони и сопротивления магии цели. Сравнивай сборки и пробивание защиты.',
      h1: 'Калькулятор урона Wild Rift',
      cta: 'Открыть калькулятор урона',
      paras: [
        'Калькулятор урона помогает посчитать, сколько урона ты наносишь по конкретной цели в League of Legends: Wild Rift с учётом своего уровня, предметов, а также брони и сопротивления магии противника. Это убирает догадки из сборок: видно, какой предмет реально увеличивает урон против выбранного врага.',
        'Инструмент учитывает базовые характеристики чемпионов по уровням, пробивание брони и магического сопротивления, и позволяет сравнить несколько вариантов сборки между собой. Удобно подбирать предметы против танков или, наоборот, против хрупких целей.',
        'Открой калькулятор, выбери своего чемпиона и цель — и собери максимально эффективный билд под текущий матч.',
      ],
      faq: [
        ['Как считается пробивание брони?', 'Калькулятор учитывает как процентное, так и фиксированное пробивание, применяя их в правильном порядке к броне цели.'],
        ['Можно ли сравнить две сборки?', 'Да, инструмент позволяет менять предметы и сразу видеть, как меняется итоговый урон по цели.'],
      ],
    }),
    landingPage({
      s: 'map-strategy', title: 'Карта и стратегия Wild Rift — тактическая доска | PRO WILDRIFT',
      desc: 'Тактическая доска Wild Rift: разбирай движения по карте, расстановку на объекты, контроль линий и ганки. Планируй макро-стратегию команды.',
      h1: 'Карта и стратегия Wild Rift — тактическая доска',
      cta: 'Открыть тактическую доску',
      paras: [
        'Тактическая доска — это интерактивная карта Ущелья Призывателей для League of Legends: Wild Rift, на которой можно разбирать перемещения, расстановку команды на объекты (драконы, Барон, башни), контроль линий, варды и маршруты ганков леса.',
        'Инструмент полезен для разбора макро-игры: где стоять при взятии объекта, как ротировать после убийства, как контролировать видимость на карте. Тренеры и капитаны команд используют такую доску, чтобы объяснять движения наглядно, а не на словах.',
        'Открой доску и разложи на карте план на следующий матч или разбери ошибку из прошлой игры.',
      ],
      faq: [
        ['Для чего нужна тактическая доска?', 'Чтобы наглядно планировать перемещения команды по карте: контроль объектов, ганки, варды и ротации.'],
        ['Подходит ли новичкам?', 'Да. Доска помогает понять базовую макро-игру Wild Rift: где находиться и куда двигаться в разные моменты матча.'],
      ],
    }),
    landingPage({
      s: 'coaching', title: 'Мап-коучинг Wild Rift — разбор игры по карте | PRO WILDRIFT',
      desc: 'Мап-коучинг Wild Rift: разбор перемещений по карте, ошибок позиционирования и принятия решений. Прокачай макро-игру и поднимись в ранге.',
      h1: 'Мап-коучинг Wild Rift',
      cta: 'Открыть инструменты коучинга',
      paras: [
        'Мап-коучинг — это разбор твоей игры в League of Legends: Wild Rift с точки зрения карты: где ты находился в ключевые моменты, как двигался по линии, когда стоило ротировать к объекту, а когда — отступить. Именно ошибки на карте, а не механика, чаще всего мешают подняться в ранге.',
        'На сайте собраны инструменты, которые помогают разбирать макро-игру: тактическая доска для планирования перемещений, тир-листы и винрейты для выбора сильных чемпионов, драфтер для отработки пиков и банов. Вместе они дают цельную картину того, как принимать решения по ходу матча.',
        'Начни с разбора одной своей игры по карте — и ты быстро увидишь повторяющиеся ошибки, которые стоят тебе побед.',
      ],
      faq: [
        ['Что важнее — механика или игра по карте?', 'На большинстве рангов именно решения по карте (макро) дают больший прирост побед, чем чистая механика.'],
        ['С чего начать улучшение?', 'С разбора собственных перемещений: где вы теряли время, пропускали объекты или попадали под ганки.'],
      ],
    }),
  ];
  const landingMeta = [
    ['drafter', '0.7'], ['damage-calculator', '0.7'], ['map-strategy', '0.7'], ['coaching', '0.7'],
  ];
  landings.forEach((html, i) => {
    writePage(landingMeta[i][0], html);
    urls.push({ loc: `${SITE}/${landingMeta[i][0]}/`, priority: landingMeta[i][1] });
  });
  console.log(`[seo] landing pages: ${landings.length}`);

  // sitemap (homepage + everything generated so far)
  const all = [{ loc: SITE + '/', priority: '1.0' }, ...urls];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all.map(u => `  <url><loc>${u.loc}</loc><lastmod>${BUILD_DATE}</lastmod><changefreq>weekly</changefreq><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf8');
  console.log(`[seo] sitemap.xml: ${all.length} urls`);
  console.log('[seo] done.');
}

main().catch(e => { console.error('[seo] FAILED:', e); process.exit(1); });
