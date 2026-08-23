// ───────────────────────────────────────────────────────────────────────────
// СТОРОЖ ПАТЧА. Следит, не вышел ли новый патч Wild Rift, и поднимает флаг
// по числам, которые робот скачать НЕ может.
//
//   ЗАЧЕМ. Часть данных приезжает сама (статы чемпионов, умения, предметы —
//   всё это лежит машиночитаемым у Tencent). А тайминги карты — во сколько
//   первый дракон, когда Барон, сколько респаун крабов — Riot нигде не
//   выкладывает списком. Их можно только сверить в игре.
//   Поэтому робот не выдумывает числа, а СТОРОЖИТ: вышел новый патч →
//   помечает тайминги «требуют сверки» и печатает чек-лист что перепроверить.
//
//   ИСТОЧНИК ВЕРСИИ: страницы гайдов wildriftallstats (в описании стоит
//   «Патч: 7.2c»). Официальные патч-ноуты версию машиночитаемо не отдают.
//
//   Запуск:  node data-pipeline/check-patch.mjs
//   Выход:   data-pipeline/patch-watch.json   (что за патч, когда замечен, что сверить)
//   Код возврата: 0 — патч тот же · 1 — ВЫШЕЛ НОВЫЙ, нужна сверка
// ───────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const WATCH_FILE = join(DIR, 'patch-watch.json');
const ECON_FILE = join(DIR, 'jungle-economy.json');

// Несколько чемпионов на случай, если одна страница временно легла.
const PROBES = ['aatrox', 'garen', 'jax'].map((s) => `https://wildriftallstats.ru/guides/${s}`);

// Числа, которые робот скачать не может — только глазами в игре.
// Каждый пункт: что сверить и где это лежит у нас.
const RECHECK = [
  { id: 'dragon_first',   what: 'первый элементальный дракон — время спауна',        where: 'jungle-economy.json → epicMonsters.elementalDragons.spawn_s' },
  { id: 'dragon_respawn', what: 'респаун дракона после убийства',                    where: 'jungle-economy.json → epicMonsters.elementalDragons' },
  { id: 'herald',         what: 'Герольд — спаун и до какой минуты живёт',           where: 'jungle-economy.json → epicMonsters.riftHerald' },
  { id: 'baron',          what: 'Барон — спаун',                                     where: 'jungle-economy.json → epicMonsters.baronNashor' },
  { id: 'elder',          what: 'Старший дракон — спаун',                            where: 'jungle-economy.json → epicMonsters.elderDragon' },
  { id: 'scuttle',        what: 'крабы — спаун и респаун',                           where: 'jungle-economy.json → jungleCamps.scuttleCrab' },
  { id: 'camps',          what: 'респаун лесных кэмпов и баффов',                    where: 'jungle-economy.json → jungleCamps' },
  { id: 'minions',        what: 'первая волна миньонов и интервал между волнами',    where: 'jungle-economy.json → minions' },
  { id: 'death_timer',    what: 'дез-таймер по уровням',                             where: 'jungle-economy.json → scaling' },
];

async function readPatch() {
  for (const url of PROBES) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) continue;
      const html = await res.text();
      const m = html.match(/[Пп]атч:?\s*([0-9]{1,2}\.[0-9][a-z]?)/);
      if (m) return { patch: m[1], from: url };
    } catch { /* пробуем следующую страницу */ }
  }
  return null;
}

const prev = existsSync(WATCH_FILE) ? JSON.parse(readFileSync(WATCH_FILE, 'utf8')) : null;
const found = await readPatch();

// Код возврата ставим через exitCode, а не process.exit(): на Windows принудительный
// выход при живых сетевых сокетах роняет Node с assertion в libuv — и код теряется.
if (!found) {
  console.error('✗ Версию патча определить не удалось — все страницы-пробы молчат.');
  console.error('  Данные НЕ трогаем. Если источник переехал, поправь PROBES в этом файле.');
  process.exitCode = 2;
}

const today = new Date().toISOString().slice(0, 10);
const isNew = found && (!prev || prev.patch !== found.patch);

if (found) {

const out = {
  patch: found.patch,
  seen: isNew ? today : prev.seen,
  source: found.from,
  checkedAt: today,
  // Числа сверены под ЭТОТ патч? Ставится вручную, когда прошли чек-лист.
  timingsVerifiedFor: isNew ? null : (prev.timingsVerifiedFor || null),
  recheck: RECHECK,
  note: 'Робот только СТОРОЖИТ версию. Числа таймингов он не качает — их нет в открытом виде. '
      + 'Вышел новый патч → timingsVerifiedFor обнуляется, значит тайминги показывать с пометкой «сверить».',
};
writeFileSync(WATCH_FILE, JSON.stringify(out, null, 1));

// Проставим версию и в файл экономики карты, чтобы в одном месте не разъезжалось.
if (existsSync(ECON_FILE)) {
  const econ = JSON.parse(readFileSync(ECON_FILE, 'utf8'));
  if (econ._meta && econ._meta.patch !== found.patch) {
    econ._meta.patch = found.patch;
    econ._meta.patchVerified = out.timingsVerifiedFor;
    writeFileSync(ECON_FILE, JSON.stringify(econ, null, 1));
  }
}

if (isNew) {
  console.log(`⚠ НОВЫЙ ПАТЧ: ${found.patch} (было: ${prev ? prev.patch : '—'}), замечен ${today}`);
  console.log('  Тайминги карты помечены «требуют сверки». Проверить в игре:');
  for (const r of RECHECK) console.log(`   • ${r.what}\n     └ ${r.where}`);
  console.log('  Сверил — впиши версию в patch-watch.json → timingsVerifiedFor.');
  process.exitCode = 1;
} else {
  console.log(`✓ Патч тот же: ${found.patch} (замечен ${out.seen}).`
    + ` Тайминги сверены под: ${out.timingsVerifiedFor || 'НЕ СВЕРЕНЫ — показывать с пометкой'}`);
}

}
