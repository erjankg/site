// ───────────────────────────────────────────────────────────────────────────
// ЗАГРУЗЧИК МАТЧАПОВ КАПИТАНА.
//
//   Берёт человеческий текст из knowledge/captain-matchups.txt и превращает
//   в данные, которые читает коуч. Владелец пишет строками — «Олаф > Вуконг
//   топ 4 — почему», — а не лезет в JSON.
//
//   Имена узнаёт как угодно написанные: Олаф / Olaf / олаф / OLAF.
//   Не узнал — НЕ выбрасывает молча, а печатает список: сам увидишь опечатку.
//
//   Запуск:  node draft-ai/import-captain.mjs
//   Выход:   knowledge/champion-notes.json → matchups.pairs
// ───────────────────────────────────────────────────────────────────────────

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(DIR, '..');
const SRC = path.join(DIR, 'knowledge', 'captain-matchups.txt');
const OUT = path.join(DIR, 'knowledge', 'champion-notes.json');

const TAGS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data-pipeline', 'champion-tags.json'), 'utf8'));
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-zа-яё0-9]/g, '');
const alias = {};
for (const [en, c] of Object.entries(TAGS.champions)) {
  const slug = String(c.dd).replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  for (const v of [en, c.dd, c.ru, slug]) if (v) alias[norm(v)] = en;
}

const LANES = {
  топ: 'Top', top: 'Top', барон: 'Top',
  лес: 'Jungle', джангл: 'Jungle', jungle: 'Jungle',
  мид: 'Mid', mid: 'Mid', центр: 'Mid',
  дракон: 'Adc', адк: 'Adc', adc: 'Adc', стрелок: 'Adc', бот: 'Adc',
  сап: 'Support', саппорт: 'Support', support: 'Support', сапп: 'Support',
};

const lines = fs.readFileSync(SRC, 'utf8').split(/\r?\n/);
const pairs = [];
const problems = [];

lines.forEach((raw, i) => {
  const line = raw.trim();
  if (!line || line.startsWith('#')) return;

  // «почему» отделяется тире (—, –, -) с пробелами вокруг
  const split = line.split(/\s[—–-]\s/);
  const head = split[0].trim();
  const why = split.slice(1).join(' - ').trim() || null;

  const m = head.match(/^(.+?)\s*>\s*(.+?)(?:\s+(\S+))?(?:\s+([1-5]))?\s*$/);
  if (!m) { problems.push(`строка ${i + 1}: не понял формат — «${line}»`); return; }

  let [, aRaw, bRaw, laneRaw, weightRaw] = m;

  // Линия могла прилипнуть к имени: «Вуконг топ» — отрезаем известное слово линии
  if (!laneRaw) {
    const tail = bRaw.trim().split(/\s+/);
    if (tail.length > 1 && LANES[norm(tail[tail.length - 1])]) {
      laneRaw = tail.pop(); bRaw = tail.join(' ');
    }
  } else if (!LANES[norm(laneRaw)] && !/^[1-5]$/.test(laneRaw)) {
    // третьим словом оказалась не линия — вернём его в имя
    bRaw = bRaw + ' ' + laneRaw; laneRaw = null;
  }
  if (laneRaw && /^[1-5]$/.test(laneRaw) && !weightRaw) { weightRaw = laneRaw; laneRaw = null; }

  const a = alias[norm(aRaw)], b = alias[norm(bRaw)];
  if (!a) { problems.push(`строка ${i + 1}: не знаю чемпиона «${aRaw.trim()}»`); return; }
  if (!b) { problems.push(`строка ${i + 1}: не знаю чемпиона «${bRaw.trim()}»`); return; }
  if (a === b) { problems.push(`строка ${i + 1}: чемпион сам против себя`); return; }

  const lane = laneRaw ? LANES[norm(laneRaw)] : null;
  if (laneRaw && !lane) { problems.push(`строка ${i + 1}: не знаю линию «${laneRaw}»`); return; }

  pairs.push({
    a, b, lane, weight: weightRaw ? Number(weightRaw) : 4,
    why: why || null,
    source: 'капитан',
  });
});

// Дубли: последняя строка побеждает — переписал мнение, оно и в силе.
const seen = new Map();
for (const p of pairs) seen.set(`${p.a}|${p.b}|${p.lane || '*'}`, p);
const final = [...seen.values()];

const notes = JSON.parse(fs.readFileSync(OUT, 'utf8'));
notes.matchups = notes.matchups || {};
notes.matchups._ = 'ПАРЫ ОТ КАПИТАНА. Собрано из captain-matchups.txt — правь ТОТ файл, этот перезапишется.';
notes.matchups.builtFrom = 'knowledge/captain-matchups.txt';
notes.matchups.built = new Date().toISOString().slice(0, 10);
notes.matchups.pairs = final;
fs.writeFileSync(OUT, JSON.stringify(notes, null, 1));

console.log(`✓ Матчапов от капитана: ${final.length}`);
const byLane = {};
for (const p of final) byLane[p.lane || 'все линии'] = (byLane[p.lane || 'все линии'] || 0) + 1;
console.log('  по линиям: ' + Object.entries(byLane).map(([k, v]) => `${k} ${v}`).join(' · '));
const noWhy = final.filter((p) => !p.why).length;
if (noWhy) console.log(`  без объяснения: ${noWhy} — коуч по ним скажет только «кто кого», без причины`);
if (problems.length) {
  console.log('\n⚠ НЕ РАЗОБРАЛ (остальное записалось нормально):');
  for (const p of problems) console.log('   ' + p);
  process.exitCode = 1;
}
