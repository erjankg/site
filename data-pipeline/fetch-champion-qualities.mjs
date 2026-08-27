// ───────────────────────────────────────────────────────────────────────────
// Сборщик КАЧЕСТВ чемпионов Wild Rift (оси радара в веер-витрине Мета-хаба).
//
//   Зачем: раньше боевой ходил за этими данными ПРЯМО В БРАУЗЕРЕ на сторонний
//   github.io. Это требовало открыть чужой хост в CSP (connect-src) — то есть
//   доверять чужому аккаунту навсегда и светить ему IP наших посетителей.
//   Теперь данные лежат у нас, страница грузит их с 'self'. CSP не трогаем.
//
//   Источник:  ry2x/WildRift-Merged-Champion-Data (открытые данные, CORS *)
//   Поля:      damage / difficult / survive / utility  (шкала 1-3)
//              Это ровно те 4 оси, что рисует radarInner() в app.js.
//
//   Запуск:  node data-pipeline/fetch-champion-qualities.mjs
//   Выход:   data-pipeline/champion-qualities.json
//
//   Качества меняются раз в патч, не ежедневно — гонять часто смысла нет.
// ───────────────────────────────────────────────────────────────────────────

import { writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = 'https://ry2x.github.io/WildRift-Merged-Champion-Data/data_en_US.json';

// Поля, которые реально рисует радар. Всё остальное не тащим — меньше веса,
// меньше поверхности (данные из чужого источника попадают к нам только числами).
const FIELDS = ['damage', 'difficult', 'survive', 'utility'];

// Приводим значение к числу 0..3. Источник иногда отдаёт строки.
function q(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(3, n));
}

async function main() {
  console.log('→ Тяну качества чемпионов:', SRC);
  const res = await fetch(SRC, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

  const raw = await res.json();
  const list = Array.isArray(raw) ? raw : Object.values(raw || {});
  if (!Array.isArray(list)) throw new Error('Ожидал массив чемпионов, пришло другое');

  const champions = [];
  for (const c of list) {
    if (!c) continue;
    const name = c.name || c.id;
    if (!name) continue;
    const row = { name: String(name) };
    if (c.id) row.id = String(c.id);
    for (const f of FIELDS) row[f] = q(c[f]);
    // чемпионов без единого заполненного качества не тащим — радар по ним всё равно пуст
    if (FIELDS.every((f) => row[f] === 0)) continue;
    champions.push(row);
  }

  // Защита: если данных подозрительно мало — НЕ перезаписываем прошлый хороший файл.
  // (Тот же приём, что в fetch-base-stats.mjs — источник может отдать огрызок.)
  if (champions.length < 80) {
    throw new Error(`Подозрительно мало чемпионов (${champions.length}) — НЕ перезаписываю champion-qualities.json`);
  }

  champions.sort((a, b) => a.name.localeCompare(b.name, 'en'));

  const out = {
    _source: SRC,
    _sourceRepo: 'https://github.com/ry2x/WildRift-Merged-Champion-Data',
    _fetchedAt: new Date().toISOString(),
    _note: 'Оси радара Мета-хаба (шкала 1-3). Обновлять раз в патч: node data-pipeline/fetch-champion-qualities.mjs',
    count: champions.length,
    champions,
  };

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const outPath = `${__dirname}/champion-qualities.json`;
  writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');

  console.log(`✓ Готово. Чемпионов: ${champions.length}`);
  console.log(`✓ Записано: ${outPath}`);
  const ex = champions.find((c) => c.name === 'Garen') || champions[0];
  if (ex) console.log('Пример:', JSON.stringify(ex));
}

main().catch((e) => { console.error('✗ Ошибка:', e.message); process.exit(1); });
