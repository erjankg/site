// ───────────────────────────────────────────────────────────────────────────
// Сборщик ГАЙДА по чемпиону (матчапы + предметы + руны + заклинания + прокачка + контры).
// Источник: wildriftallstats.ru — у них всё уже посчитано и лежит чистым JSON в странице
// (Next.js встраивает данные в поток __next_f). Мы достаём этот JSON напрямую.
//   База данных у них, в свою очередь, из Tencent CN (lolm.qq.com) + агрегатора riftgg.
//
//   Запуск:  node data-pipeline/fetch-guide.mjs aatrox     (slug чемпиона; по умолч. aatrox)
//   Выход:   data-pipeline/guides/<slug>.json
// ───────────────────────────────────────────────────────────────────────────

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// раскодировать экранирование RSC-потока Next.js
const decode = (s) => s.replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\\//g, '/');

// достать сбалансированное значение JSON после первого `"key":` начиная с from
function extractValue(s, key, from = 0) {
  let i = s.indexOf('"' + key + '":', from);
  if (i < 0) return null;
  i += key.length + 3;
  while (s[i] === ' ') i++;
  const open = s[i];
  if (open !== '{' && open !== '[') return null;
  const close = open === '{' ? '}' : ']';
  let depth = 0, inStr = false, esc = false;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') { inStr = true; continue; }
    if (c === open) depth++;
    else if (c === close) { if (--depth === 0) return { value: s.slice(i, j + 1), end: j + 1 }; }
  }
  return null;
}

// перебрать все вхождения ключа, вернуть первый валидно-парсящийся и проходящий проверку
function grab(s, key, validate) {
  let from = 0;
  for (let guard = 0; guard < 50; guard++) {
    const r = extractValue(s, key, from);
    if (!r) return null;
    try { const v = JSON.parse(r.value); if (!validate || validate(v)) return v; } catch {}
    from = r.end;
  }
  return null;
}

const names = (arr) => (arr || []).map((x) => x?.name).filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Достать и разобрать гайд по slug. Возвращает чистый объект (без записи в файл).
export async function fetchGuide(slug, tries = 3) {
  let html = null;
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(`https://wildriftallstats.ru/guides/${slug}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      html = await res.text();
      break;
    } catch (e) {
      if (i === tries) throw new Error(`${slug} → ${e.message} (после ${tries} попыток)`);
      await sleep(i * 1200);
    }
  }
  const d = decode(html);

  const champName = (d.match(new RegExp('"name":"([^"]+)","slug":"' + slug + '"')) || [])[1] || slug;
  const meta = grab(d, 'metadata', (v) => v && (v.tier !== undefined || v.patch !== undefined)) || {};

  // МАТЧАПЫ: [{rank,lane,dataDate,best:[...],worst:[...]}]
  const rawMatch = grab(d, 'matchups', (v) => Array.isArray(v) && v[0]?.best) || [];
  const mapSide = (a) => (a || []).map((e) => ({ name: e.opponent?.name || e.opponentSlug, slug: e.opponentSlug, wr: +(+e.winRate).toFixed(1), pr: +(+e.pickRate).toFixed(1) }));
  const matchups = rawMatch.map((m) => ({ rank: m.rank, lane: m.lane, date: m.dataDate, best: mapSide(m.best), worst: mapSide(m.worst) }));

  // КОНТРЫ (просто список имён)
  const counters = names(grab(d, 'counters', (v) => Array.isArray(v) && v[0]?.slug));

  // ЗАКЛИНАНИЯ: [{rank,lane,entries:[{entrySlugs,winRate,pickRate}]}]
  const rawSpells = grab(d, 'spells', (v) => Array.isArray(v) && v[0]?.entries) || [];
  const spells = (rawSpells[0]?.entries || []).map((e) => ({ combo: (e.entrySlugs || []).join(' + '), wr: +(+e.winRate).toFixed(1), pr: +(+e.pickRate).toFixed(1) }));

  // ПРОКАЧКА: rows [{name,slug,levels:[..]}]
  const rows = grab(d, 'rows', (v) => Array.isArray(v) && Array.isArray(v[0]?.levels)) || [];
  const skillOrder = rows.map((r) => ({ ability: r.name, levels: r.levels }));

  // СБОРКИ (варианты с предметами): [{title,tier,isDefault,itemBuild:{slot:[{name}]}}]
  const variants = grab(d, 'variants', (v) => Array.isArray(v) && v[0]?.itemBuild) || [];
  const builds = variants.map((vr) => ({
    title: vr.title, tier: vr.tier, default: !!vr.isDefault,
    items: Object.fromEntries(Object.entries(vr.itemBuild || {}).map(([slot, arr]) => [slot, names(arr)])),
  }));

  // РУНЫ (список названий доступных рун)
  const runes = names(grab(d, 'runes', (v) => Array.isArray(v) && v[0]?.kind === 'Rune'));

  // защита: если ВСЁ пусто — источник изменил структуру, не отдаём пустышку
  if (!matchups.length && !builds.length && !runes.length && !skillOrder.length)
    throw new Error(`данные не распознаны (источник мог изменить разметку)`);

  return {
    slug, name: champName,
    role: meta.recommendedRole || null, tier: meta.tier || null, patch: meta.patch || null,
    dataDate: matchups[0]?.date || null,
    matchups, counters, builds, runes, spells, skillOrder,
  };
}

// Записать гайд в data-pipeline/guides/<slug>.json
export function writeGuide(out) {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  mkdirSync(`${__dirname}/guides`, { recursive: true });
  const outPath = `${__dirname}/guides/${out.slug}.json`;
  writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
  return outPath;
}

// CLI: node fetch-guide.mjs <slug>
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('fetch-guide.mjs')) {
  const slug = process.argv[2] || 'aatrox';
  console.log(`→ Тяну гайд: ${slug}`);
  fetchGuide(slug).then((out) => {
    const p = writeGuide(out);
    console.log(`✓ ${out.name} · роль ${out.role} · тир ${out.tier} · патч ${out.patch} · данные ${out.dataDate}`);
    console.log(`✓ Записано: ${p}`);
    const m0 = out.matchups[0];
    if (m0) {
      console.log(`\nМатчапы (${m0.rank}/${m0.lane}):`);
      console.log('  Лучшие:', m0.best.slice(0, 3).map((x) => `${x.name} ${x.wr}%`).join(', '));
      console.log('  Худшие:', m0.worst.slice(0, 3).map((x) => `${x.name} ${x.wr}%`).join(', '));
    }
    console.log(`Контры: ${out.counters.slice(0, 5).join(', ')}`);
    console.log(`Сборок: ${out.builds.length}, рун: ${out.runes.length}, комбо: ${out.spells.length}, прокачка: ${out.skillOrder.length}`);
  }).catch((e) => { console.error('✗ Ошибка:', e.message); process.exit(1); });
}
