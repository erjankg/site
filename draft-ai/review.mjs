// ───────────────────────────────────────────────────────────────────────────
// РАЗБОР ЧЕМПИОНА — превращает мусорный скрейп в готовые строки для капитана.
//
//   Показывает, что база думает про чемпа, СРАЗУ в формате captain-matchups.txt.
//   Капитан смотрит глазами: верно — оставил, наоборот — развернул стрелку,
//   бред — удалил строку. Копипаст в свой файл, и знание в системе.
//
//   Так сотни матчапов заливаются не по одному, а пачками — и каждая
//   подтверждённая пара навсегда перебивает скрейп.
//
//   Запуск:  node draft-ai/review.mjs Олаф
//            node draft-ai/review.mjs Олаф топ
//            node draft-ai/review.mjs --lane топ --limit 40      (весь топ пачкой)
//
//   ✓ — уже подтверждено тобой   ? — скрейп, нужен твой взгляд
// ───────────────────────────────────────────────────────────────────────────

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const KB = require(path.join(ROOT, 'draft-ai/engine/knowledge.js')).load(ROOT);

const LANE_RU = { Top: 'топ', Jungle: 'лес', Mid: 'мид', Adc: 'дракон', Support: 'сап' };
const RU_LANE = { топ: 'Top', лес: 'Jungle', мид: 'Mid', дракон: 'Adc', сап: 'Support', саппорт: 'Support' };

const argv = process.argv.slice(2);
let laneFilter = null, limit = 30, who = null;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--lane') { laneFilter = RU_LANE[argv[++i]] || argv[i]; continue; }
  if (a === '--limit') { limit = Number(argv[++i]) || 30; continue; }
  if (RU_LANE[a.toLowerCase()]) { laneFilter = RU_LANE[a.toLowerCase()]; continue; }
  who = who ? who + ' ' + a : a;
}

const capPairs = (KB.notes.matchups && KB.notes.matchups.pairs) || [];
const confirmed = new Set(capPairs.map((p) => `${KB.idx.nameOf(p.a)}|${KB.idx.nameOf(p.b)}`));
const ru = (n) => (KB.idx.champ(n) || {}).ru || n;

function linesFor(name) {
  const key = KB.idx.nameOf(name);
  if (!key) { console.log(`Не знаю чемпиона «${name}». Проверь написание.`); return 0; }
  const m = KB.matchups.of(key);
  if (!m || !m.lanes) { console.log(`${ru(key)}: матчапов в базе нет.`); return 0; }

  const meta = KB.idx.meta(key, 'master_plus');
  console.log(`\n█ ${ru(key)}${meta ? `  ·  тир ${meta.tier} · ${meta.role}` : ''}`);

  const rows = [];
  for (const lane of Object.keys(m.lanes)) {
    if (laneFilter && lane !== laneFilter) continue;
    for (const r of m.lanes[lane] || []) {
      const opp = KB.idx.nameOf(r.opponent); if (!opp) continue;
      // Скрейп говорит: counteredBy — оппонент бьёт нас, strongAgainst — мы бьём его
      const winner = r.verdict === 'counteredBy' ? opp : key;
      const loser = winner === key ? opp : key;
      rows.push({ lane, winner, loser, disagree: !!r.disagree, hasStat: !!r.stat });
    }
  }
  if (!rows.length) { console.log('  (на этой линии пар нет)'); return 0; }

  // Сначала спорные и подтверждённые статистикой — там больше шанс поймать перевёртыш
  rows.sort((a, b) => (b.disagree - a.disagree) || (b.hasStat - a.hasStat));

  let shown = 0;
  for (const r of rows.slice(0, limit)) {
    const done = confirmed.has(`${r.winner}|${r.loser}`);
    const flipped = confirmed.has(`${r.loser}|${r.winner}`);
    let mark = done ? '✓' : flipped ? '⟲' : '?';
    let tail = '';
    if (flipped) tail = '   # ты сказал НАОБОРОТ — скрейп уже не считается';
    else if (r.disagree) tail = '   # источники спорят — глянь внимательнее';
    console.log(`  ${mark} ${ru(r.winner)} > ${ru(r.loser)}  ${LANE_RU[r.lane] || r.lane}  4  — ${tail}`);
    shown++;
  }
  const rest = rows.length - shown;
  if (rest > 0) console.log(`  … ещё ${rest}. Показать все: --limit ${rows.length}`);
  return shown;
}

if (who) {
  linesFor(who);
} else if (laneFilter) {
  // Пачкой по линии: начинаем с самых играемых — их матчапы решают чаще
  const byPr = KB.idx.names
    .map((n) => ({ n, meta: KB.idx.meta(n, 'master_plus') }))
    .filter((x) => x.meta && x.meta.role && x.meta.pr)
    .sort((a, b) => b.meta.pr - a.meta.pr)
    .slice(0, 8);
  console.log(`Линия ${argv.find((a) => RU_LANE[a.toLowerCase()]) || laneFilter}: 8 самых играемых чемпионов.`);
  for (const x of byPr) linesFor(x.n);
} else {
  console.log('Кого разбираем?  node draft-ai/review.mjs Олаф');
  console.log('Или всю линию:   node draft-ai/review.mjs --lane топ');
}

console.log('\n─────────────────────────────────────────────');
console.log('Верно — копируй строку к себе в draft-ai/knowledge/captain-matchups.txt.');
console.log('Наоборот — разверни стрелку. Бред — просто не бери.');
console.log('Допиши после « — » почему: это коуч скажет вслух.');
console.log('Потом:  node draft-ai/import-captain.mjs');
