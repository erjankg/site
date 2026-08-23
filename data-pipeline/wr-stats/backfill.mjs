// ───────────────────────────────────────────────────────────────────────────
// БЭКФИЛЛ — сделать архивный снимок из СТАРОЙ копии wr-stats.json.
// Нужен один раз: чтобы история началась не с нуля, а с тех снимков, что уже лежат в git.
//
//   Из файла:            node data-pipeline/wr-stats/backfill.mjs путь/к/wr-stats.json
//   Из ревизии git:      node data-pipeline/wr-stats/backfill.mjs --git HEAD
//                        node data-pipeline/wr-stats/backfill.mjs --git HEAD~5
//   Все ревизии подряд:  node data-pipeline/wr-stats/backfill.mjs --git-all
//
//   Дату берём из snapshotDate внутри файла. Существующий снимок НЕ перезаписываем
//   (перезаписать явно: --force). Боевой wr-stats.json не трогается — только чтение.
//
//   ⚠ СТАРЫЕ ФАЙЛЫ = СТАРАЯ КАРТА ЛИНИЙ. До 2026-06 скрипт раскладывал позиции Tencent как
//   {1:Baron, 2:Mid, 3:Jungle, 4:Support, 5:Dragon} — это оказалось неверно, сейчас
//   {1:Mid, 2:Baron, 3:Dragon, 4:Support, 5:Jungle}. Если бэкфилл поймает такой файл,
//   он сам починит роли (Baron↔Mid, Jungle↔Dragon) и скажет об этом. Отключить: --no-remap.
//   Без этого история сравнивала бы разные линии (Амуму «Dragon» вчера vs «Jungle» сегодня).
// ───────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeSnapshot, snapshotDayId, ARCHIVE_DIR } from './snapshot.mjs';

const REPO_FILE = 'data-pipeline/wr-stats.json';
const REPO_ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

// старая карта ↔ новая: пары просто менялись местами, поэтому таблица сама себе обратная
const LEGACY_ROLE_FIX = { Baron: 'Mid', Mid: 'Baron', Jungle: 'Dragon', Dragon: 'Jungle', Support: 'Support' };

// контрольные чемпионы с однозначной линией — по ним видно, какой картой собран файл
const ROLE_SENTINELS = { Amumu: 'Jungle', Garen: 'Baron', Kaisa: 'Dragon', Ahri: 'Mid' };

/** Файл собран старой (ошибочной) картой линий? Голосуем по контрольным чемпионам. */
function looksLegacy(champions) {
  let ok = 0; let swapped = 0;
  for (const [en, expected] of Object.entries(ROLE_SENTINELS)) {
    const rows = champions.filter((c) => c.nameEN === en);
    if (!rows.length) continue;
    const main = rows.slice().sort((a, b) => (b.pr ?? 0) - (a.pr ?? 0))[0];
    if (main.role === expected) ok++;
    else if (LEGACY_ROLE_FIX[main.role] === expected) swapped++;
  }
  return swapped > ok;
}

function fromJson(text, { force, label, remap = true }) {
  const j = JSON.parse(text);
  if (!Array.isArray(j.champions)) throw new Error(`${label}: это не wr-stats.json (нет champions[])`);

  if (remap && looksLegacy(j.champions)) {
    for (const c of j.champions) c.role = LEGACY_ROLE_FIX[c.role] || c.role;
    console.log(`   ↻ ${label}: файл собран СТАРОЙ картой линий — роли перевёрнуты на нынешние (Baron↔Mid, Jungle↔Dragon)`);
  }

  const dayId = snapshotDayId(j.snapshotDate);
  const path = writeSnapshot(dayId, j.champions, {
    ranks: j.ranks || {},
    sourceDate: j.snapshotDate ?? null,
    fetchedAt: null,
    overwrite: !!force,
  });
  if (!path) { console.log(`•  ${dayId} — уже есть, пропускаю (${label})`); return null; }
  console.log(`✓  ${dayId} — записан из ${label} (${j.champions.length} строк)`);
  return dayId;
}

function gitShow(rev) {
  return execFileSync('git', ['show', `${rev}:${REPO_FILE}`], { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function gitRevisions() {
  const out = execFileSync('git', ['log', '--format=%H', '--', REPO_FILE], { cwd: REPO_ROOT, encoding: 'utf8' });
  return out.split('\n').map((s) => s.trim()).filter(Boolean);
}

function main() {
  const argv = process.argv.slice(2);
  const force = argv.includes('--force');
  const remap = !argv.includes('--no-remap');
  const args = argv.filter((a) => a !== '--force' && a !== '--no-remap');

  if (args[0] === '--git-all') {
    const revs = gitRevisions();
    console.log(`Ревизий ${REPO_FILE} в истории git: ${revs.length}`);
    let made = 0;
    for (const rev of revs) {
      try { if (fromJson(gitShow(rev), { force, remap, label: `git ${rev.slice(0, 7)}` })) made++; }
      catch (e) { console.warn(`⚠  ${rev.slice(0, 7)}: ${e.message}`); }
    }
    console.log(`Готово. Новых снимков: ${made}. Архив: ${ARCHIVE_DIR}`);
    return;
  }

  if (args[0] === '--git') {
    const rev = args[1] || 'HEAD';
    fromJson(gitShow(rev), { force, remap, label: `git ${rev}` });
    return;
  }

  const path = args[0];
  if (!path) throw new Error('Укажи путь к wr-stats.json, или --git <ревизия>, или --git-all');
  if (!existsSync(path)) throw new Error(`Нет файла ${path}`);
  fromJson(readFileSync(path, 'utf8'), { force, remap, label: path });
}

try { main(); } catch (e) { console.error('✗', e.message); process.exit(1); }
