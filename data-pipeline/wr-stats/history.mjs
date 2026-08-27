// ───────────────────────────────────────────────────────────────────────────
// ИСТОРИЯ ВИНРЕЙТОВ — чтение архива снимков + дельта между двумя днями.
//
//   Архив пишет data-pipeline/fetch-wr-stats.mjs: по файлу на день, ГГГГММДД.json (см. README.md рядом).
//   Этот модуль НИЧЕГО не пишет — только читает. Боевой data-pipeline/wr-stats.json не трогается.
//
//   Зачем: спарклайны (динамика WR чемпа по дням) и tier-movers (кто вырос/упал за период)
//   считаются как дельта двух снимков, а не выдумываются.
//
//   Как модуль:
//     import { diffSnapshots, tierMovers, championTrend } from './wr-stats/history.mjs';
//     const d = diffSnapshots('prev', 'latest', { rank: 'diamond_plus' });
//     const s = championTrend('Джакс', { rank: 'diamond_plus', days: 14 });
//
//   Как команда:
//     node data-pipeline/wr-stats/history.mjs list
//     node data-pipeline/wr-stats/history.mjs diff [from] [to] [--rank diamond_plus] [--role Jungle] [--limit 15]
//     node data-pipeline/wr-stats/history.mjs movers [from] [to] [--rank diamond_plus] [--min-pr 0.5]
//     node data-pipeline/wr-stats/history.mjs trend <чемпион|heroId> [--rank diamond_plus] [--role Mid] [--days 14]
//
//   Ссылки на снимок (ref) везде одинаковые:
//     '20260619' — конкретный день · 'latest' — последний · 'prev' — предпоследний
//     '-3'       — на 3 шага назад от последнего
//     'live'     — текущий data-pipeline/wr-stats.json (если архив ещё пуст — 'latest' сам берёт его)
// ───────────────────────────────────────────────────────────────────────────

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const ARCHIVE_DIR = __dirname;                       // data-pipeline/wr-stats
export const LIVE_FILE = `${__dirname}/../wr-stats.json`;   // боевой файл (только чтение)

// порядок тиров снизу вверх — чтобы «поднялся на 2 тира» было числом
export const TIER_ORDER = ['D', 'C', 'B', 'A', 'S', 'S+'];
export const tierIndex = (t) => {
  const i = TIER_ORDER.indexOf(String(t));
  return i < 0 ? null : i;
};

// строка статы уникальна тройкой: чемпион + ранговый бракет + роль
export const rowKey = (r) => `${r.heroId}|${r.rankSlice}|${r.role}`;

const num = (v) => (v == null || Number.isNaN(Number(v)) ? null : Number(v));
const round = (v, d = 2) => (v == null ? null : +Number(v).toFixed(d));

// ── ЧТЕНИЕ СНИМКОВ ─────────────────────────────────────────────────────────

/** Список дат в архиве, по возрастанию: ['20260619', '20260620', …]. */
export function listSnapshots(dir = ARCHIVE_DIR) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /^\d{8}\.json$/.test(f))
    .map((f) => f.slice(0, 8))
    .sort();
}

function shape({ id, source, ranks, names, rows }) {
  const byKey = new Map(rows.map((r) => [rowKey(r), r]));
  return {
    id,                       // '20260619'
    source,                   // 'archive' | 'live'
    ranks: ranks || {},
    names: names || {},
    rows,
    byKey,
    /** Имя чемпиона (рус → англ → #id). */
    nameOf(heroId) {
      const n = this.names[String(heroId)] || {};
      return n.ru || n.en || `#${heroId}`;
    },
  };
}

/** Архивный файл ГГГГММДД.json. */
export function readArchiveFile(dayId, dir = ARCHIVE_DIR) {
  const path = `${dir}/${dayId}.json`;
  if (!existsSync(path)) throw new Error(`Нет снимка ${dayId} (${path})`);
  const j = JSON.parse(readFileSync(path, 'utf8'));
  return shape({ id: j.snapshotDate || dayId, source: 'archive', ranks: j.ranks, names: j.names, rows: j.rows || [] });
}

/** Боевой wr-stats.json, приведённый к форме снимка (сам файл не меняется). */
export function readLive(path = LIVE_FILE) {
  if (!existsSync(path)) throw new Error(`Нет боевого файла ${path}`);
  const j = JSON.parse(readFileSync(path, 'utf8'));
  const names = {};
  const rows = (j.champions || []).map((c) => {
    if (!names[c.heroId]) names[c.heroId] = { ru: c.name || null, en: c.nameEN || null, cn: c.nameCN || null };
    return {
      heroId: c.heroId, rankSlice: c.rankSlice, role: c.role,
      tier: c.tier, wr: num(c.wr), pr: num(c.pr), br: num(c.br),
    };
  });
  return shape({ id: j.snapshotDate || 'live', source: 'live', ranks: j.ranks, names, rows });
}

/**
 * Снимок по ссылке: 'ГГГГММДД' | 'latest' | 'prev' | '-N' | 'live'.
 * Если архив пуст, 'latest'/'prev' падают обратно на боевой файл — история работает с первого дня.
 */
export function loadSnapshot(ref = 'latest', dir = ARCHIVE_DIR) {
  const days = listSnapshots(dir);
  const r = String(ref);

  if (r === 'live') return readLive();
  if (/^\d{8}$/.test(r)) return readArchiveFile(r, dir);

  let idx = null;
  if (r === 'latest') idx = days.length - 1;
  else if (r === 'prev') idx = days.length - 2;
  else if (/^-\d+$/.test(r)) idx = days.length - 1 + Number(r);
  else throw new Error(`Непонятная ссылка на снимок: "${ref}"`);

  if (idx < 0 || !days.length) {
    if (r === 'prev' && days.length === 1) throw new Error('В архиве всего один снимок — сравнивать не с чем');
    return readLive();      // архива ещё нет → работаем от боевого файла
  }
  return readArchiveFile(days[idx], dir);
}

// ── ФИЛЬТРЫ ────────────────────────────────────────────────────────────────

/** 'diamond_plus' | '0' | 0 → ключ слайса '0'. null = без фильтра. */
export function resolveRankSlice(snap, rank) {
  if (rank == null || rank === 'all_slices') return null;
  const r = String(rank);
  if (/^\d$/.test(r)) return r;
  const hit = Object.entries(snap.ranks || {}).find(([, name]) => name === r);
  if (!hit) throw new Error(`Неизвестный бракет "${rank}". Есть: ${Object.values(snap.ranks || {}).join(', ')}`);
  return hit[0];
}

function filterRows(snap, { rank, role, minPr } = {}) {
  const slice = resolveRankSlice(snap, rank);
  return snap.rows.filter((r) =>
    (slice == null || r.rankSlice === slice) &&
    (!role || r.role === role) &&
    (minPr == null || (r.pr ?? 0) >= minPr));
}

/** heroId по русскому/английскому имени (или сам heroId, если передали его). */
export function findHeroId(query, snap = loadSnapshot('latest')) {
  const q = String(query).trim().toLowerCase();
  if (/^\d+$/.test(q) && snap.names[q]) return q;
  for (const [id, n] of Object.entries(snap.names)) {
    if ([n.ru, n.en, n.cn].some((x) => x && String(x).toLowerCase() === q)) return id;
  }
  for (const [id, n] of Object.entries(snap.names)) {
    if ([n.ru, n.en].some((x) => x && String(x).toLowerCase().startsWith(q))) return id;
  }
  return null;
}

// ── ДЕЛЬТА ДВУХ СНИМКОВ ────────────────────────────────────────────────────

/**
 * Дельта между двумя снимками — основа спарклайнов и tier-movers.
 * opts: { rank, role, minPr } — minPr отсекает мусорные строки с копеечным пикрейтом.
 * Возвращает строки со status: 'ok' (есть в обоих) | 'new' (появился) | 'gone' (пропал).
 */
export function diffSnapshots(fromRef = 'prev', toRef = 'latest', opts = {}) {
  const from = typeof fromRef === 'object' ? fromRef : loadSnapshot(fromRef);
  const to = typeof toRef === 'object' ? toRef : loadSnapshot(toRef);

  const toRows = filterRows(to, opts);
  const fromRows = filterRows(from, opts);
  const fromByKey = new Map(fromRows.map((r) => [rowKey(r), r]));
  const seen = new Set();

  const rows = toRows.map((cur) => {
    const key = rowKey(cur);
    seen.add(key);
    const prev = fromByKey.get(key) || null;
    const dTier = prev && tierIndex(cur.tier) != null && tierIndex(prev.tier) != null
      ? tierIndex(cur.tier) - tierIndex(prev.tier) : null;
    return {
      heroId: cur.heroId,
      name: to.nameOf(cur.heroId),
      role: cur.role,
      rankSlice: cur.rankSlice,
      rank: to.ranks[cur.rankSlice] || cur.rankSlice,
      status: prev ? 'ok' : 'new',
      wr: cur.wr, wrPrev: prev ? prev.wr : null, dWr: prev ? round(cur.wr - prev.wr) : null,
      pr: cur.pr, prPrev: prev ? prev.pr : null, dPr: prev ? round(cur.pr - prev.pr) : null,
      br: cur.br, brPrev: prev ? prev.br : null, dBr: prev ? round(cur.br - prev.br) : null,
      tier: cur.tier, tierPrev: prev ? prev.tier : null, dTier,
    };
  });

  for (const prev of fromRows) {
    const key = rowKey(prev);
    if (seen.has(key)) continue;
    rows.push({
      heroId: prev.heroId,
      name: from.nameOf(prev.heroId),
      role: prev.role,
      rankSlice: prev.rankSlice,
      rank: from.ranks[prev.rankSlice] || prev.rankSlice,
      status: 'gone',
      wr: null, wrPrev: prev.wr, dWr: null,
      pr: null, prPrev: prev.pr, dPr: null,
      br: null, brPrev: prev.br, dBr: null,
      tier: null, tierPrev: prev.tier, dTier: null,
    });
  }

  rows.sort((a, b) => (b.dWr ?? -Infinity) - (a.dWr ?? -Infinity));
  return { from: { id: from.id, source: from.source }, to: { id: to.id, source: to.source }, count: rows.length, rows };
}

/**
 * Кто вырос / кто упал за период. Для блока «tier movers» на главной.
 * Возвращает wrRisers / wrFallers (по дельте винрейта) и tierUp / tierDown (смена буквы тира).
 */
export function tierMovers(fromRef = 'prev', toRef = 'latest', opts = {}) {
  const { limit = 10, minPr = 0.5, ...rest } = opts;
  const d = diffSnapshots(fromRef, toRef, { minPr, ...rest });
  const moved = d.rows.filter((r) => r.status === 'ok' && r.dWr != null);

  return {
    from: d.from,
    to: d.to,
    wrRisers: moved.filter((r) => r.dWr > 0).slice(0, limit),
    wrFallers: moved.filter((r) => r.dWr < 0).sort((a, b) => a.dWr - b.dWr).slice(0, limit),
    tierUp: moved.filter((r) => r.dTier > 0).sort((a, b) => b.dTier - a.dTier || b.dWr - a.dWr).slice(0, limit),
    tierDown: moved.filter((r) => r.dTier < 0).sort((a, b) => a.dTier - b.dTier || a.dWr - b.dWr).slice(0, limit),
    newcomers: d.rows.filter((r) => r.status === 'new').slice(0, limit),
  };
}

/**
 * Ряд значений по дням для одного чемпиона — прямое питание спарклайна.
 * champ: heroId или имя (рус/англ). opts: { rank='diamond_plus', role, days=14, includeLive=false }.
 * Роль не задана → она определяется ОДИН раз по свежему снимку (основная = наибольший пикрейт)
 * и держится на всём ряде: иначе линия скачет между Baron и Dragon и сравнивает разные вещи.
 * Дни без данных по чемпиону/роли пропускаются, а не рисуются нулями.
 */
export function championTrend(champ, opts = {}) {
  const { rank = 'diamond_plus', role = null, days = 14, includeLive = false, dir = ARCHIVE_DIR } = opts;
  // без бракета линия смешала бы 5 разных выборок в один ряд — это не тренд, а каша
  if (rank == null) throw new Error('Тренду нужен конкретный бракет (rank), например diamond_plus');
  const all = listSnapshots(dir);
  const picked = days > 0 ? all.slice(-days) : all;

  const snaps = picked.map((d) => readArchiveFile(d, dir));
  if (includeLive || !snaps.length) {
    try {
      const live = readLive();
      if (!snaps.length || snaps[snaps.length - 1].id !== live.id) snaps.push(live);
    } catch { /* боевого файла нет — работаем только по архиву */ }
  }
  if (!snaps.length) return { heroId: null, name: null, rank, role, points: [] };

  const heroId = findHeroId(champ, snaps[snaps.length - 1]);
  if (!heroId) throw new Error(`Не нашёл чемпиона "${champ}"`);

  const pick = (snap) => {
    const slice = resolveRankSlice(snap, rank);
    return snap.rows.filter((r) => r.heroId === heroId && (slice == null || r.rankSlice === slice));
  };

  // роль фиксируем один раз — по самому свежему снимку, где чемпион вообще есть
  let lockedRole = role;
  if (!lockedRole) {
    for (let i = snaps.length - 1; i >= 0 && !lockedRole; i--) {
      const cand = pick(snaps[i]).sort((a, b) => (b.pr ?? 0) - (a.pr ?? 0));
      if (cand.length) lockedRole = cand[0].role;
    }
  }

  const points = [];
  for (const s of snaps) {
    const row = pick(s).find((r) => r.role === lockedRole);
    if (!row) continue;
    points.push({ date: s.id, role: row.role, wr: row.wr, pr: row.pr, br: row.br, tier: row.tier });
  }

  const first = points[0]; const last = points[points.length - 1];
  return {
    heroId,
    name: snaps[snaps.length - 1].nameOf(heroId),
    rank,
    role: lockedRole,
    roleLocked: !role,          // роль выбрана автоматически, а не задана вызывающим
    points,
    dWr: first && last && points.length > 1 ? round(last.wr - first.wr) : null,
  };
}

// ── CLI ────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const flags = {}; const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { flags[a.slice(2)] = argv[i + 1]?.startsWith('--') ? true : argv[++i]; }
    else pos.push(a);
  }
  return { flags, pos };
}

const sign = (v) => (v == null ? '   —  ' : `${v > 0 ? '+' : ''}${v.toFixed(2)}`.padStart(6));

// by='wr' → впереди дельта винрейта; by='tier' → впереди движение тира (иначе колонки врут:
// в блоке «тир вверх» первым числом стоял минус по WR и строка читалась наоборот)
function printRows(rows, limit, by = 'wr') {
  for (const r of rows.slice(0, limit)) {
    const head = by === 'tier'
      ? `${r.dTier > 0 ? '+' : ''}${r.dTier} тир`.padStart(6)
      : sign(r.dWr);
    const tail = by === 'tier'
      ? `${r.tierPrev}→${r.tier} · WR ${r.wr ?? '—'}% (${sign(r.dWr).trim()})`
      : `WR ${r.wr ?? '—'}% (было ${r.wrPrev ?? '—'}%)${r.dTier ? `  ${r.tierPrev}→${r.tier}` : ''}`;
    console.log(`   ${head}  ${String(r.name).padEnd(16)} · ${String(r.role).padEnd(8)} · ${tail}`);
  }
  if (!rows.length) console.log('   (пусто)');
}

function cli() {
  const { flags, pos } = parseArgs(process.argv.slice(2));
  const cmd = pos[0] || 'list';
  const limit = Number(flags.limit ?? 15);
  const common = { rank: flags.rank ?? 'diamond_plus', role: flags.role ?? null };
  if (flags.rank === 'all_slices') common.rank = null;

  if (cmd === 'list') {
    const days = listSnapshots();
    console.log(`Снимков в архиве: ${days.length}${days.length ? ` (${days[0]} … ${days[days.length - 1]})` : ''}`);
    for (const d of days.slice(-30)) console.log(`   ${d}`);
    if (!days.length) console.log('   Пока пусто — запусти: node data-pipeline/fetch-wr-stats.mjs');
    return;
  }

  if (cmd === 'diff') {
    const d = diffSnapshots(pos[1] || 'prev', pos[2] || 'latest', { ...common, minPr: Number(flags['min-pr'] ?? 0) });
    console.log(`Дельта ${d.from.id} → ${d.to.id} · бракет ${common.rank ?? 'все'}${common.role ? ` · ${common.role}` : ''} · строк ${d.count}`);
    console.log('Выросли:'); printRows(d.rows.filter((r) => r.dWr > 0), limit);
    console.log('Упали:'); printRows(d.rows.filter((r) => r.dWr < 0).sort((a, b) => a.dWr - b.dWr), limit);
    return;
  }

  if (cmd === 'movers') {
    const m = tierMovers(pos[1] || 'prev', pos[2] || 'latest', { ...common, limit, minPr: Number(flags['min-pr'] ?? 0.5) });
    console.log(`Tier movers ${m.from.id} → ${m.to.id} · бракет ${common.rank ?? 'все'}`);
    console.log('▲ Тир вверх:'); printRows(m.tierUp, limit, 'tier');
    console.log('▼ Тир вниз:'); printRows(m.tierDown, limit, 'tier');
    console.log('▲ Рост WR:'); printRows(m.wrRisers, limit);
    console.log('▼ Падение WR:'); printRows(m.wrFallers, limit);
    return;
  }

  if (cmd === 'trend') {
    if (!pos[1]) throw new Error('Кого смотрим? Пример: node data-pipeline/wr-stats/history.mjs trend Джакс');
    const t = championTrend(pos[1], { ...common, days: Number(flags.days ?? 14), includeLive: true });
    console.log(`${t.name} · бракет ${t.rank}${t.role ? ` · ${t.role}` : ''} · точек ${t.points.length} · итог ${sign(t.dWr).trim()}`);
    for (const p of t.points) console.log(`   ${p.date}  WR ${String(p.wr).padStart(5)}%  PR ${String(p.pr).padStart(5)}%  тир ${p.tier}  (${p.role})`);
    if (t.points.length < 2) console.log('   ⚠ Меньше двух точек — спарклайну нужно хотя бы 2 дня архива.');
    return;
  }

  throw new Error(`Неизвестная команда "${cmd}". Есть: list | diff | movers | trend`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try { cli(); } catch (e) { console.error('✗', e.message); process.exit(1); }
}
