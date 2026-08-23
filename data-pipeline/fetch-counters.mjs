/* ═══════════════════════════════════════════════════════════════════════
   fetch-counters.mjs — ПАРЫ «кто кого контрит» (скрейп).

   Почему скрейп, а не ИИ: доказано на образце (DRAFT-AI.md, «ИСТОЧНИК МАТЧАПОВ —
   ГИБРИД») — сгенерить контры из текста умений нельзя (8% попаданий против 13%
   случайного). Реальные контры решают линия/вейвклир/тайминги, чего в умениях нет.
   Здесь берём ТОЛЬКО пары. Текст «почему» подставляется отдельно из champion-tags.json.

   ИСТОЧНИКИ
     1. wildriftcounter.com — ОСНОВНОЙ. По 6 слабых + 6 сильных на каждую из 5 линий.
        robots.txt: `Disallow:` пустой (открыто всё). Отдаёт готовый HTML.
     2. wildriftfire.com    — СВЕРКА. По 3 «Countered By» на линию + синергии.
        robots.txt: закрыты /ajax/ /json/ /popup/ /cron/, раздел /guide/ РАЗРЕШЁН.

   ⚠️ WINRATE-ПРОЦЕНТЫ С ЭТИХ САЙТОВ НЕ ЗАБИРАЕМ.
   У wildriftcounter в таблице есть числа вида «Jax vs Shyvana 63.36%», но источник
   этих чисел нигде не указан — показывать их = выдать выдумку за факт. Статистику
   с ЧИСЛАМИ берём из другого места (guides/*.json, трекер wildriftallstats), там
   источник назван. Здесь — только сами пары.

   ЧЕСТНОСТЬ ДАННЫХ: пары РЕДАКЦИОННЫЕ (мнение авторов сайта, не статистика).
   Пишем `kind:"editorial"`, `source`, `url` и `sourceDate` (из dateModified страницы) —
   часть страниц отстаёт на несколько патчей, игрок должен видеть дату.

   ЗАПУСК
     node data-pipeline/fetch-counters.mjs           # все чемпионы
     node data-pipeline/fetch-counters.mjs 5         # первые 5 (быстрая проверка)
     node data-pipeline/fetch-counters.mjs jax yasuo # поимённо
   ═══════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const WRC = 'https://wildriftcounter.com';
const WRF = 'https://www.wildriftfire.com';

/* Список чемпионов берём из champion-tags.json — это наш канон на 139.
   champion-abilities.json НЕ годится: там 138, нет Skarner. */
const TAGS = JSON.parse(fs.readFileSync(path.join(DIR, 'champion-tags.json'), 'utf8'));
const CHAMPS = Object.entries(TAGS.champions).map(([en, c]) => ({ en, ru: c.ru, dd: c.dd }));

/* линия на сайте → наша */
/* Названия линий у источников гуляют: Top/Solo/Baron, Bot/Bottom/Duo/Dragon, Mid/Middle.
   Braum выпадал целиком только потому, что его блок подписан «Bottom», а не «Bot». */
const LANE = { top: 'Top', solo: 'Top', baron: 'Top',
               jungler: 'Jungle', jungle: 'Jungle',
               mid: 'Mid', middle: 'Mid',
               bot: 'Adc', bottom: 'Adc', duo: 'Adc', dragon: 'Adc', adc: 'Adc',
               support: 'Support', sup: 'Support' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

async function get(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.text();
    } catch (e) {
      if (attempt === 3) { console.warn('  ⚠ ' + url + ' — ' + e.message); return null; }
      await sleep(1200 * attempt);
    }
  }
}

/* ── ИНДЕКСЫ СЛАГОВ ───────────────────────────────────────────────────────
   Слаги НЕ угадываем (Ksante→ksante, но KSante→k-sante = 404, MonkeyKing→wukong).
   Тянем список чемпионов с самого сайта и сопоставляем по нормализованному имени. */
async function slugIndex(url, re) {
  const html = await get(url);
  if (!html) return {};
  const idx = {};
  for (const m of html.matchAll(re)) idx[norm(m[1])] = m[1];
  return idx;
}

/* наши варианты написания → под какой слаг искать на сайте */
function candidates(c) {
  const out = [c.dd, c.en];
  if (c.dd === 'MonkeyKing') out.push('Wukong');
  if (c.dd === 'Kogmaw') out.push('KogMaw', 'Kog Maw');
  if (c.dd === 'Khazix') out.push('KhaZix', 'Kha Zix');
  if (c.dd === 'Velkoz') out.push('VelKoz', 'Vel Koz');
  if (c.dd === 'JarvanIV') out.push('Jarvan', 'JarvanIV', 'Jarvan4');
  if (c.dd === 'Nunu') out.push('NunuWillump', 'NunuAndWillump');
  // camelCase → через дефис: MissFortune → miss-fortune
  out.push(c.dd.replace(/([a-z0-9])([A-Z])/g, '$1-$2'));
  return [...new Set(out)];
}
const resolveSlug = (c, idx) => {
  for (const v of candidates(c)) if (idx[norm(v)]) return idx[norm(v)];
  return null;
};

/* ── ПАРСЕР wildriftcounter ───────────────────────────────────────────────
   Разметка: <strong>Top</strong> … «X is Weak Against» <gallery> … «X is Strong Against» <gallery>
   Галерея = <figure class='gallery-item'> … <figcaption><a href="/champions/<slug>/">Имя</a> */
function parseWRC(full) {
  const date = (full.match(/"dateModified":"([^"]+)"/) || [])[1] || null;
  const lanes = {};
  // СНАЧАЛА вырезаем только секцию «Champion Counter …» до «Item Counter»/«How to counter».
  // Без этого последняя линия дотягивалась до подвала сайта и хватала весь список из 145 чемпионов.
  const from = full.search(/<h2[^>]*>\s*Champion Counter/i);
  const to = full.search(/<h2[^>]*>\s*(Item Counter|How to counter|[^<]*Matchups)/i);
  const html = full.slice(from < 0 ? 0 : from, to > from ? to : undefined);
  // режем секцию по меткам линий, внутри куска ищем два блока
  // порядок в чередовании важен: Bottom и Middle должны стоять ДО Bot и Mid
  const marks = [...html.matchAll(/<strong>\s*(Bottom|Middle|Jungler|Jungle|Support|Dragon|Baron|Solo|Duo|Top|Mid|Bot|Adc)\s*<\/strong>/gi)];
  for (let i = 0; i < marks.length; i++) {
    const lane = LANE[marks[i][1].toLowerCase()];
    if (!lane) continue;
    const chunk = html.slice(marks[i].index, i + 1 < marks.length ? marks[i + 1].index : html.length);
    // Границы блоков: «Weak» тянется РОВНО до «Strong», «Strong» — до конца куска (следующей линии).
    // Ловушка: искать конец по `</div> </div>` нельзя — вёрстка вложенная, слепляет обе галереи в одну.
    const pWeak = chunk.search(/is\s+Weak\s+Against/i);
    const pStrong = chunk.search(/is\s+Strong\s+Against/i);
    const slugs = (from, to) => from < 0 ? []
      : [...chunk.slice(from, to < 0 ? undefined : to).matchAll(/href="[^"]*\/champions\/([a-z0-9-]+)\/"/g)].map((m) => m[1]);
    const weak = slugs(pWeak, pStrong > pWeak ? pStrong : -1);
    const strong = slugs(pStrong, -1);
    if (weak.length || strong.length) lanes[lane] = { counteredBy: [...new Set(weak)], strongAgainst: [...new Set(strong)] };
  }
  return { date, lanes };
}

/* ── ПАРСЕР wildriftfire ──────────────────────────────────────────────────
   <h2>X is Countered By</h2> … <div class="counters-mod counters"> …
   <img class="lane" alt="Solo"> <a href="/guide/<slug>"> */
function parseWRF(html) {
  const patch = (html.match(/[Pp]atch\s*(\d+\.\d+[a-z]?)/) || [])[1] || null;
  const lanes = {};
  for (const blk of html.matchAll(/<h2>[^<]*?is Countered By<\/h2>([\s\S]*?)<\/div>\s*<\/div>/g)) {
    for (const m of blk[1].matchAll(/<img class="lane"[^>]*alt="([^"]*)"[^>]*>[\s\S]{0,240}?href="\/guide\/([a-z0-9-]+)"/g)) {
      const lane = LANE[String(m[1]).toLowerCase()];
      if (!lane) continue;
      (lanes[lane] ||= new Set()).add(m[2]);
    }
  }
  return { patch, lanes: Object.fromEntries(Object.entries(lanes).map(([k, v]) => [k, [...v]])) };
}

/* ── ГЛАВНОЕ ──────────────────────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const limit = argv.length === 1 && /^\d+$/.test(argv[0]) ? Number(argv[0]) : null;
const only = limit || !argv.length ? null : new Set(argv.map(norm));
const list = CHAMPS.filter((c) => !only || only.has(norm(c.en)) || only.has(norm(c.dd))).slice(0, limit || undefined);

console.log('→ Индексы слагов…');
const idxWRC = await slugIndex(WRC + '/champions/', /wildriftcounter\.com\/champions\/([a-z0-9-]+)\//g);
const idxWRF = await slugIndex(WRF + '/tier-list', /href="\/guide\/([a-z0-9-]+)"/g);
console.log('  wildriftcounter: ' + Object.keys(idxWRC).length + ' чемпионов · wildriftfire: ' + Object.keys(idxWRF).length);

/* FAIL-SAFE, уровень 1 — ПОЧЕМИОННЫЙ.
   Всегда стартуем от УЖЕ СОБРАННОГО файла, а не с пустого места. Чемпион, которого
   сегодня не отдали (сайт лёг, страницу переверстали, слаг сменился), сохраняет вчерашние
   данные вместо того, чтобы молча исчезнуть. Дозапись по именам работает тем же механизмом:
   полный обход идёт ~6 минут, дёргать чужие серверы ради одного чемпиона незачем. */
const prevPath = path.join(DIR, 'counters.json');
let prev = null;
if (fs.existsSync(prevPath)) {
  try { prev = JSON.parse(fs.readFileSync(prevPath, 'utf8')); }
  catch { console.warn('⚠ counters.json не читается — соберу заново'); }
}
/* Ключи прежнего файла приводим к нашему канону. Ранние сборки писали полные ddragon-имена
   (MonkeyKing, DrMundo, AurelionSol), а список чемпионов теперь короткий (Wukong, Mundo, «Au. Sol»).
   Без нормализации у этих 11 заводились ПУСТЫЕ дубли рядом со старыми записями. */
const canon = {};
for (const c of CHAMPS) { canon[norm(c.en)] = c.en; canon[norm(c.dd)] = c.en; }
const champions = {};
let renamed = 0;
for (const [k, v] of Object.entries(prev?.champions || {})) {
  const key = canon[norm(k)] || k;
  if (key !== k) renamed++;
  // при коллизии старого и нового ключа побеждает запись с данными
  if (!champions[key] || !Object.keys(champions[key].sources || {}).length) champions[key] = v;
}
if (renamed) console.log('  ключей приведено к канону: ' + renamed);
const kept = [];
const missing = { wrc: [], wrf: [] };
let pairs = 0;

for (const c of list) {
  const sWRC = resolveSlug(c, idxWRC), sWRF = resolveSlug(c, idxWRF);
  const rec = { en: c.en, ru: c.ru, dd: c.dd, sources: {} };

  if (sWRC) {
    const html = await get(WRC + '/champions/' + sWRC + '/');
    if (html) {
      const { date, lanes } = parseWRC(html);
      if (Object.keys(lanes).length)
        rec.sources.wildriftcounter = { url: WRC + '/champions/' + sWRC + '/', sourceDate: date ? date.slice(0, 10) : null, kind: 'editorial', lanes };
      for (const L of Object.values(lanes)) pairs += L.counteredBy.length + L.strongAgainst.length;
    }
    await sleep(400);                    // вежливо к чужому серверу
  } else missing.wrc.push(c.en);

  if (sWRF) {
    const html = await get(WRF + '/guide/' + sWRF);
    if (html) {
      const { patch, lanes } = parseWRF(html);
      if (Object.keys(lanes).length)
        rec.sources.wildriftfire = { url: WRF + '/guide/' + sWRF, patch, kind: 'editorial', counteredBy: lanes };
      for (const L of Object.values(lanes)) pairs += L.length;
    }
    await sleep(400);
  } else missing.wrf.push(c.en);

  const n = Object.keys(rec.sources).length;
  if (n) {
    champions[c.en] = rec;
    console.log('✓ ' + c.en.padEnd(14) + Object.keys(rec.sources).join(' + '));
  } else if (champions[c.en] && Object.keys(champions[c.en].sources || {}).length) {
    // ничего не отдали, но старое есть — ОСТАВЛЯЕМ старое, не затираем пустышкой
    kept.push(c.en);
    console.log('· ' + c.en.padEnd(14) + 'пусто → оставил прежние данные');
  } else {
    // пустую запись не заводим вовсе — она только мусорит файл и врёт про охват
    console.log('✗ ' + c.en.padEnd(14) + 'НЕТ ДАННЫХ');
  }
}

/* пересчитываем по ВСЕМУ файлу, а не только по свежескачанным (из-за дозаписи) */
pairs = 0;
for (const rec of Object.values(champions)) {
  for (const L of Object.values(rec.sources?.wildriftcounter?.lanes || {})) pairs += L.counteredBy.length + L.strongAgainst.length;
  for (const L of Object.values(rec.sources?.wildriftfire?.counteredBy || {})) pairs += L.length;
}

const out = {
  built: new Date().toISOString().slice(0, 10),
  note: 'ПАРЫ «кто кого контрит», собраны роботом. Данные РЕДАКЦИОННЫЕ — это мнение авторов '
      + 'сайтов-источников, не статистика матчей. Показывать вместе с источником и sourceDate: '
      + 'часть страниц отстаёт на несколько патчей. Winrate-проценты этих сайтов НЕ забираем — '
      + 'источник чисел там не указан. Текст «почему» берётся из champion-tags.json.',
  sources: {
    wildriftcounter: { url: WRC, role: 'основной', depth: 'до 6 слабых + 6 сильных на каждую из 5 линий' },
    wildriftfire:    { url: WRF, role: 'сверка',   depth: '3 «Countered By» на линию' },
  },
  count: Object.keys(champions).length,
  pairs,
  champions,
};

/* FAIL-SAFE, уровень 2 — ОБЩИЙ ПОРОГ.
   Даже с почемпионной защитой возможен сценарий «источник переверстался целиком»: страницы
   отдаются, но парсер видит 0 пар почти везде. Тогда файл формально не пустой, а данные — труха.
   Порог: не меньше MIN_PAIRS в абсолюте и не меньше 60% от прошлого объёма.
   Не прошли — НЕ пишем, оставляем прежний файл и выходим с ошибкой, чтобы CI это показал. */
const MIN_PAIRS = 500;
const KEEP_RATIO = 0.6;
const prevPairs = prev?.pairs || 0;
const floor = Math.max(MIN_PAIRS, Math.round(prevPairs * KEEP_RATIO));

if (prev && pairs < floor) {
  console.error('\n✗ FAIL-SAFE: собрано ' + pairs + ' пар, а нужно минимум ' + floor
    + ' (было ' + prevPairs + ', порог ' + Math.round(KEEP_RATIO * 100) + '%).');
  console.error('  counters.json НЕ ПЕРЕЗАПИСАН — прежние данные целы. Похоже, источник лёг или сменил вёрстку.');
  process.exit(1);
}
if (!prev && pairs < MIN_PAIRS) {
  console.error('\n✗ FAIL-SAFE: первый сбор дал всего ' + pairs + ' пар (минимум ' + MIN_PAIRS + ') — файл не пишу.');
  process.exit(1);
}

fs.writeFileSync(path.join(DIR, 'counters.json'), JSON.stringify(out, null, 1));

console.log('\n✓ counters.json — чемпионов: ' + out.count + ' · пар: ' + pairs
  + (prevPairs ? ' (было ' + prevPairs + ')' : ''));
if (kept.length) console.log('  оставлены прежние данные (источник не отдал): ' + kept.join(', '));
if (missing.wrc.length) console.log('  без слага на wildriftcounter: ' + missing.wrc.join(', '));
if (missing.wrf.length) console.log('  без слага на wildriftfire: ' + missing.wrf.join(', '));
