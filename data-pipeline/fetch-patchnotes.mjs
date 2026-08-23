// ───────────────────────────────────────────────────────────────────────────
// Авто-импорт патч-нотов Wild Rift → ЧЕРНОВИКИ для сайта (lab-patch / раздел «Патч»).
//
// ⚠️ У Wild Rift НЕТ публичного API патч-нотов. Поэтому импорт трёхслойный, и
// последний слой — РУЧНОЕ подтверждение в админке (робот готовит, Эржан жмёт ✓).
//
//   СЛОЙ 1 — СИГНАЛ (полный автомат): дельта винрейта между двумя прогонами
//            data-pipeline/wr-stats.json. Кого качнуло вверх/вниз ≥ порога →
//            кандидат buff/nerf. Числа реальные (Tencent), тип — эвристика.
//   СЛОЙ 2 — ТЕКСТ (полу-автомат): официальная страница game-updates. Версия+дата
//            парсятся; точные before→after — не всегда (ставим needsReview).
//   СЛОЙ 3 — ПУБЛИКАЦИЯ (вне этого скрипта): импорт JSON → Firestore со статусом
//            pending → админка cms.js показывает «черновики робота» → ✓/правка/✗.
//
//   Форма выхода 1-в-1 с боевыми коллекциями Firestore (см. lab-patch/patch-lab.js):
//     • patchnotes  {champion, type:buff/nerf/adjust, change, patch, ...}
//     • changesFeed {type, title, text, patch, cat, ...}
//     • changelog   {entity, type:add/edit/delete, name, ...}
//   Всё помечено auto:true, confirmed:false — на сайт попадёт только после ✓.
//
//   Запуск:  node data-pipeline/fetch-patchnotes.mjs
//   Выход:   data-pipeline/patchnotes-drafts.json
//   Далее:   Firebase Cloud Function scheduled (раз/день) → та же логика → pending в Firestore.
// ───────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const WR_CUR  = join(__dir, 'wr-stats.json');
const WR_PREV = join(__dir, 'wr-stats.prev.json'); // снимок прошлого прогона (базлайн для дельты)
const OUT     = join(__dir, 'patchnotes-drafts.json');

const WR_DELTA_THRESHOLD = 1.5;  // ±% винрейта, чтобы счесть за баф/нерф
const OFFICIAL_URL = 'https://wildrift.leagueoflegends.com/ru-ru/news/game-updates/'; // текст патча (полу-автомат)

// ── помощники ────────────────────────────────────────────────────────────────
function readJson(p) { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } }

// wr-stats → карта nameEN → { name(ru), role, wr, tier } по срезу «все ранги» (rankSlice "4")
function wrMap(stats) {
  const m = {};
  if (!stats || !Array.isArray(stats.champions)) return m;
  for (const c of stats.champions) {
    if (String(c.rankSlice) !== '4') continue; // «все ранги» — самый стабильный сигнал
    m[c.nameEN] = { name: c.name, nameEN: c.nameEN, role: c.role, wr: c.wr, tier: c.tier };
  }
  return m;
}

// ── СЛОЙ 1: дельта винрейта → черновики patchnotes ───────────────────────────
function layer1_wrDelta(cur, prev) {
  const drafts = [];
  const now = wrMap(cur), was = wrMap(prev);
  if (!prev) {
    console.log('[patchnotes] Прошлого снимка нет — первый прогон. Дельту посчитаю в следующий раз.');
    return drafts;
  }
  for (const en of Object.keys(now)) {
    const a = now[en], b = was[en];
    if (!b) continue; // нового чемпа дельтой не поймать — это СЛОЙ 2 (news)
    const d = +(a.wr - b.wr).toFixed(1);
    if (Math.abs(d) < WR_DELTA_THRESHOLD) continue;
    drafts.push({
      _collection: 'patchnotes',
      champion: a.name, key: en,
      type: d > 0 ? 'buff' : 'nerf',
      patch: '', // проставит слой 2 / админ
      change: `Винрейт ${b.wr}% → ${a.wr}% (${d > 0 ? '+' : ''}${d}). Роль: ${a.role}. [авто-сигнал по дельте WR]`,
      wrDelta: d,
      auto: true, confirmed: false, needsReview: true, source: 'wr-delta'
    });
  }
  drafts.sort((x, y) => Math.abs(y.wrDelta) - Math.abs(x.wrDelta));
  console.log(`[patchnotes] Слой 1 (дельта WR): ${drafts.length} кандидатов (порог ±${WR_DELTA_THRESHOLD}%).`);
  return drafts;
}

// ── СЛОЙ 2: официальный текст патча (полу-автомат, best-effort) ───────────────
async function layer2_official() {
  const out = { version: '', date: '', summaryDraft: null, notes: [] };
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 12000);
    const res = await fetch(OFFICIAL_URL, { headers: { 'User-Agent': 'Mozilla/5.0 (patchnotes-bot)' }, signal: ctl.signal }).finally(() => clearTimeout(timer));
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const html = await res.text();

    // Версия патча ТОЛЬКО по явной метке «Патч 7.2» / «Patch 7.2» (без метки — не гадаем,
    // иначе ловим случайные «2.1» из вёрстки; пусто → админ проставит вручную).
    const mv = html.match(/(?:патч|patch)\s*([0-9]+\.[0-9]+[a-z]?)/i);
    if (mv) out.version = mv[1];

    // TODO(парсер): структура официальной страницы меняется от локали/редизайна.
    // Здесь достаём версию/дату; блоки «чемпион: изменение» и точные before→after
    // требуют DOM-парсера под текущую вёрстку → эти поля оставляем needsReview.
    if (out.version) {
      out.summaryDraft = {
        _collection: 'changesFeed', type: 'patch', patch: out.version,
        title: `Патч ${out.version} — сводка (заполнить из официальных нот)`,
        auto: true, confirmed: false, needsReview: true, source: 'official'
      };
    }
    console.log(`[patchnotes] Слой 2 (официальный): версия="${out.version || '?'}", блоки нот = парсер под вёрстку (TODO).`);
  } catch (e) {
    console.warn('[patchnotes] Слой 2 недоступен (' + e.message + ') — работаем только на сигнале WR.');
  }
  return out;
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  const cur = readJson(WR_CUR);
  const prev = readJson(WR_PREV);
  if (!cur) { console.error('[patchnotes] Нет data-pipeline/wr-stats.json — сначала прогони fetch-wr-stats.mjs.'); process.exit(1); }

  const official = await layer2_official();
  const patch = official.version || '';

  const wrDrafts = layer1_wrDelta(cur, prev).map(d => ({ ...d, patch: d.patch || patch }));

  const drafts = [];
  if (official.summaryDraft) drafts.push(official.summaryDraft);
  drafts.push(...wrDrafts);

  const payload = {
    generatedAt: new Date().toISOString(),
    patch,
    baseline: prev ? prev.snapshotDate : null,
    current: cur.snapshotDate,
    counts: { total: drafts.length, wrDelta: wrDrafts.length },
    note: 'ЧЕРНОВИКИ. На сайт попадают ТОЛЬКО после ручного ✓ в админке (status pending → confirmed).',
    drafts
  };
  writeFileSync(OUT, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`[patchnotes] Готово → ${OUT} (${drafts.length} черновиков).`);

  // ротация: текущий снимок становится базлайном для следующего прогона
  writeFileSync(WR_PREV, JSON.stringify(cur), 'utf8');
  console.log('[patchnotes] Базлайн обновлён (wr-stats.prev.json) для следующей дельты.');
}

main();
