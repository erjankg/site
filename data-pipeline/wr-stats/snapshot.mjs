// ───────────────────────────────────────────────────────────────────────────
// ФОРМАТ АРХИВНОГО СНИМКА — единственное место, где он описан.
// Пишут его: fetch-wr-stats.mjs (каждый прогон) и backfill.mjs (старые файлы).
// Читает: history.mjs. Боевой data-pipeline/wr-stats.json этот модуль НЕ трогает.
//
// Снимок урезанный: heroId + бракет + роль + tier/wr/pr/br, а имена лежат общим словарём
// `names` один раз на файл. Полная копия wr-stats.json весила бы ~275 КБ в день (~100 МБ
// за год в git), урезанная — ~55 КБ (~20 МБ за год).
// ───────────────────────────────────────────────────────────────────────────

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SNAPSHOT_FORMAT = 1;
export const ARCHIVE_DIR = dirname(fileURLToPath(import.meta.url));   // data-pipeline/wr-stats

/** Дата снимка: то, что отдал Tencent («20260619»), иначе сегодняшняя UTC-дата. */
export function snapshotDayId(dtstatdate) {
  if (/^\d{8}$/.test(String(dtstatdate || ''))) return String(dtstatdate);
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

/** Строки боевого формата → строки снимка + словарь имён. */
export function toSnapshot(champions) {
  const names = {};
  const rows = [];
  for (const c of champions) {
    if (!names[c.heroId]) names[c.heroId] = { ru: c.name || null, en: c.nameEN || null, cn: c.nameCN || null };
    rows.push({
      heroId: c.heroId, rankSlice: c.rankSlice, role: c.role,
      tier: c.tier, wr: c.wr, pr: c.pr, br: c.br,
    });
  }
  return { names, rows };
}

/**
 * Записать снимок дня. Пишем построчно (строка = чемпион), чтобы git-дифф архива читался человеком.
 * opts: { dir, ranks, sourceDate, fetchedAt, overwrite=true }.
 * Возвращает путь или null, если файл уже есть и overwrite=false.
 */
export function writeSnapshot(dayId, champions, opts = {}) {
  const { dir = ARCHIVE_DIR, ranks = {}, sourceDate = null, fetchedAt = new Date().toISOString(), overwrite = true } = opts;
  const path = `${dir}/${dayId}.json`;
  if (!overwrite && existsSync(path)) return null;

  const { names, rows } = toSnapshot(champions);
  const body = [
    '{',
    `  "format": ${SNAPSHOT_FORMAT},`,
    `  "snapshotDate": ${JSON.stringify(dayId)},`,
    `  "sourceDate": ${JSON.stringify(sourceDate)},`,
    `  "fetchedAt": ${JSON.stringify(fetchedAt)},`,
    `  "count": ${rows.length},`,
    `  "ranks": ${JSON.stringify(ranks)},`,
    `  "names": ${JSON.stringify(names)},`,
    '  "rows": [',
    rows.map((r) => `    ${JSON.stringify(r)}`).join(',\n'),
    '  ]',
    '}',
    '',
  ].join('\n');

  mkdirSync(dir, { recursive: true });
  writeFileSync(path, body, 'utf8');
  return path;
}
