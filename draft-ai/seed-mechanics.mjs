// ───────────────────────────────────────────────────────────────────────────
// СИД ЗНАНИЙ ИЗ МЕХАНИКИ.
//
//   Кэп больше не читает скрейп: матчапы растут из разметки владельца. Но
//   начинать с абсолютного нуля незачем — есть то, что НЕ является ничьим
//   мнением: умения чемпионов. «Уклонение от автоатак обнуляет авто-керри» —
//   это не редакционная оценка, это механика из champion-tags.json и правил
//   matchups.json → rules[].
//
//   Поэтому сид = пары, где перевес механики ОДНОСТОРОННИЙ и крупный. Вес 3
//   (нижняя ступень — «обычная контра»), пометка «сид: механика, проверь».
//   Владелец прунит их разметкой прямо в драфте: подтвердил — вес растёт и
//   текст становится его, выкинул — строка исчезает.
//
//   Запуск:
//     node draft-ai/seed-mechanics.mjs           — только отчёт: knowledge/_seed.md
//     node draft-ai/seed-mechanics.mjs --apply   — ещё и вписать сид в
//                                                  knowledge/captain-matchups.txt
//                                                  и knowledge/captain-synergies.txt
//
//   Ручные строки владельца (выше меток) не трогаются никогда.
// ───────────────────────────────────────────────────────────────────────────

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(DIR, '..');
const K = path.join(DIR, 'knowledge');

const TAGS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data-pipeline/champion-tags.json'), 'utf8')).champions;
const IDX = JSON.parse(fs.readFileSync(path.join(ROOT, 'data-pipeline/matchups.json'), 'utf8'));
const SYN = JSON.parse(fs.readFileSync(path.join(K, 'synergies.json'), 'utf8'));

const LANES = ['Top', 'Jungle', 'Mid', 'Adc', 'Support'];
const LANE_RU = { Top: 'топ', Jungle: 'лес', Mid: 'мид', Adc: 'дракон', Support: 'саппорт' };

// Пороги. Низкие дают болото из тысячи пар, которое никто не вычитает.
const MIN_NET = 6;      // перевес механики, ниже — спорно, сид не ставим
const PER_LANE = 3;     // сколько контр на чемпиона на линию
const SYN_PER = 2;      // сколько связок на чемпиона

const names = Object.keys(TAGS);
const has = (n, t) => (TAGS[n].tags || []).indexOf(t) !== -1;
const ru = (n) => TAGS[n].ru || n;
const lanesOf = (n) => (TAGS[n].lanes || []).filter((l) => LANES.indexOf(l) !== -1);

/* ── КОНТРЫ ─────────────────────────────────────────────────────────────── */
const counters = [];
for (const a of names) {
  for (const b of names) {
    if (a === b) continue;
    const common = lanesOf(a).filter((l) => lanesOf(b).indexOf(l) !== -1);
    if (!common.length) continue;
    let ab = 0, ba = 0;
    const why = [];
    for (const r of IDX.rules) {
      if (has(a, r.tag) && has(b, r.vs)) { ab += r.weight; why.push(r.text); }
      if (has(b, r.tag) && has(a, r.vs)) ba += r.weight;
    }
    const net = ab - ba;
    if (net < MIN_NET || !why.length) continue;
    // самое тяжёлое объяснение — им и подписываем пару
    const top = why.slice(0, 2).join('; ');
    for (const lane of common) counters.push({ a, b, lane, net, why: top });
  }
}
// по чемпиону и линии держим только самые односторонние
const keep = new Map();
for (const c of counters) {
  const k = c.a + '|' + c.lane;
  const arr = keep.get(k) || [];
  arr.push(c);
  keep.set(k, arr);
}
const seedCounters = [];
for (const [, arr] of keep) {
  arr.sort((x, y) => y.net - x.net);
  seedCounters.push(...arr.slice(0, PER_LANE));
}
seedCounters.sort((x, y) => y.net - x.net);

/* ── СВЯЗКИ ─────────────────────────────────────────────────────────────── */
const synergy = [];
for (const r of (SYN.byMechanic || [])) {
  for (const a of names) {
    if (!r.a.some((t) => has(a, t))) continue;
    for (const b of names) {
      if (a === b || !r.b.some((t) => has(b, t))) continue;
      synergy.push({ a, b, id: r.id, weight: r.weight,
        why: r.say.replace('{a}', ru(a)).replace('{b}', ru(b)) });
    }
  }
}
const synKeep = new Map();
for (const s of synergy) {
  const k = s.a;
  const arr = synKeep.get(k) || [];
  arr.push(s);
  synKeep.set(k, arr);
}
const seedSyn = [];
const seen = new Set();
for (const [, arr] of synKeep) {
  arr.sort((x, y) => y.weight - x.weight);
  for (const s of arr.slice(0, SYN_PER)) {
    const k = [s.a, s.b].sort().join('|');
    if (seen.has(k)) continue;
    seen.add(k);
    seedSyn.push(s);
  }
}

/* ── ОТЧЁТ ──────────────────────────────────────────────────────────────── */
const line = (c) => `${ru(c.a)} > ${ru(c.b)}  ${LANE_RU[c.lane]}  3  — сид: механика, проверь · ${c.why}`;
const synLine = (s) => `${ru(s.a)} + ${ru(s.b)}  — сид: механика, проверь · ${s.why}`;

const byLane = {};
for (const c of seedCounters) byLane[c.lane] = (byLane[c.lane] || 0) + 1;

const md = [
  '# СИД ЗНАНИЙ ИЗ МЕХАНИКИ',
  '',
  'Сгенерировано `node draft-ai/seed-mechanics.mjs` из `champion-tags.json` (умения) и правил',
  '`matchups.json → rules[]`. Это НЕ чьё-то мнение о матчапах: только то, что следует из умений.',
  'Чужой скрейп (`data-pipeline/matchups/*`) сюда не входит — кэп его не читает.',
  '',
  `Пороги: перевес механики ≥ ${MIN_NET}, не больше ${PER_LANE} контр на чемпиона на линию,`,
  `не больше ${SYN_PER} связок на чемпиона.`,
  '',
  `**Контры: ${seedCounters.length}** (${Object.entries(byLane).map(([k, v]) => `${LANE_RU[k]} ${v}`).join(' · ')})`,
  `**Связки: ${seedSyn.length}**`,
  '',
  'Вес сида — 3 («обычная контра»), подпись «сид: механика, проверь». Разметка в драфте',
  '(`lab-draft-coach/coach.html`) поднимает вес и переписывает текст своими словами, а ненужное',
  'выкидывает. Пока пара не подтверждена — она сид, и кэп это говорит вслух.',
  '',
  '## Контры',
  '',
  '```',
  ...seedCounters.map(line),
  '```',
  '',
  '## Связки',
  '',
  '```',
  ...seedSyn.map(synLine),
  '```',
  '',
].join('\n');

fs.writeFileSync(path.join(K, '_seed.md'), md);
console.log(`✓ knowledge/_seed.md: контр ${seedCounters.length}, связок ${seedSyn.length}`);
console.log('  по линиям: ' + Object.entries(byLane).map(([k, v]) => `${LANE_RU[k]} ${v}`).join(' · '));

/* ── ВПИСАТЬ В ЗНАНИЯ ───────────────────────────────────────────────────── */
const MARK_C = '# ═══ СИД: МЕХАНИКА (node draft-ai/seed-mechanics.mjs --apply) — строки ниже перегенерируются ═══';
const MARK_S = '# ═══ СИД: МЕХАНИКА — связки ═══';

if (process.argv.includes('--apply')) {
  const f = path.join(K, 'captain-matchups.txt');
  const cur = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
  // всё, что человек и разметка написали ВЫШЕ метки сида, остаётся как есть
  const head = (cur.indexOf(MARK_C) === -1 ? cur : cur.slice(0, cur.indexOf(MARK_C))).replace(/\s+$/, '');
  fs.writeFileSync(f, [head, '', MARK_C, ...seedCounters.map(line), ''].join('\n'));
  console.log(`✓ captain-matchups.txt: вписано ${seedCounters.length} строк сида (ручные строки сверху не тронуты)`);

  const sf = path.join(K, 'captain-synergies.txt');
  const scur = fs.existsSync(sf) ? fs.readFileSync(sf, 'utf8') : '# СВЯЗКИ ОТ КАПИТАНА. Формат: «A + B — почему».\n';
  const shead = (scur.indexOf(MARK_S) === -1 ? scur : scur.slice(0, scur.indexOf(MARK_S))).replace(/\s+$/, '');
  fs.writeFileSync(sf, [shead, '', MARK_S, ...seedSyn.map(synLine), ''].join('\n'));
  console.log(`✓ captain-synergies.txt: вписано ${seedSyn.length} связок`);
  console.log('  дальше: node draft-ai/import-captain.mjs');
} else {
  console.log('  (сухой прогон — чтобы вписать в знания: --apply)');
}
