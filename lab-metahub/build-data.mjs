// Готовит данные для Мета-хаба из реальных файлов data-pipeline/.
// Выход: lab-metahub/meta-data.js  →  window.META = {...}
// Запуск: node lab-metahub/build-data.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const DP = `${here}/../data-pipeline`;
const wr = JSON.parse(readFileSync(`${DP}/wr-stats.json`, 'utf8'));
const index = JSON.parse(readFileSync(`${DP}/guides/_index.json`, 'utf8'));

const RANKS = ['diamond_plus', 'master_plus', 'challenger', 'apex', 'all'];
const RANK_RU = { diamond_plus: 'Diamond+', master_plus: 'Master+', challenger: 'Challenger', apex: 'Топ Рифта', all: 'Все ранги' };

// slug гайда по английскому имени (через оглавление; запас — нормализация)
const byName = new Map(index.champions.map((c) => [c.name.toLowerCase(), c.slug]));
const slugOf = (nameEN) => byName.get(String(nameEN).toLowerCase()) || String(nameEN).toLowerCase().replace(/[^a-z]/g, '');
const loadGuide = (nameEN) => {
  try { return JSON.parse(readFileSync(`${DP}/guides/${slugOf(nameEN)}.json`, 'utf8')); } catch { return null; }
};

const clean = (c) => ({ name: c.name, nameEN: c.nameEN, heroId: c.heroId, role: c.role, tier: c.tier, wr: c.wr, pr: c.pr, br: c.br, trend: c.wrTrend ?? 0 });

const byRank = {};
for (let s = 0; s <= 4; s++) {
  const rank = RANKS[s];
  const list = wr.champions.filter((c) => c.rankSlice === String(s));
  // чемпион патча: сильный и реально играемый (хороший WR + заметный пик + не вечный бан)
  const featured = list
    .filter((c) => c.pr >= 2.5 && c.br < 35 && ['S+', 'S', 'A'].includes(c.tier))
    .sort((a, b) => (b.wr + b.pr * 0.3) - (a.wr + a.pr * 0.3))[0] || list[0];
  const topWR = list.filter((c) => c.pr >= 1).sort((a, b) => b.wr - a.wr).slice(0, 6).map(clean);
  const moversUp = list.filter((c) => c.pr >= 1.5).sort((a, b) => b.trend - a.trend).slice(0, 4).map(clean);
  const moversDown = list.filter((c) => c.pr >= 1.5).sort((a, b) => a.trend - b.trend).slice(0, 4).map(clean);
  byRank[rank] = { label: RANK_RU[rank], featured: clean(featured), topWR, moversUp, moversDown };
}

// плитки «дня» из гайдов: берём заметных играемых чемпионов Diamond+
const dia = wr.champions.filter((c) => c.rankSlice === '0');
const pickPopular = (n) => dia.filter((c) => ['S+', 'S', 'A'].includes(c.tier) && c.pr >= 2).sort((a, b) => b.pr - a.pr).map((c) => c.nameEN).filter((x, i, a) => a.indexOf(x) === i).slice(0, n);
const [c1, c2, c3] = pickPopular(8);

function matchupTile(nameEN) {
  const g = loadGuide(nameEN);
  if (!g || !g.matchups[0]) return null;
  const m = g.matchups[0];
  return { champ: g.name, role: g.role, best: m.best[0], worst: m.worst[0] };
}
function buildTile(nameEN) {
  const g = loadGuide(nameEN);
  if (!g || !g.builds[0]) return null;
  const b = g.builds.find((x) => x.default) || g.builds[0];
  return { champ: g.name, role: g.role, tier: b.tier, core: b.items.core || [], boots: (b.items.boots || [])[0] || null, runes: g.runes.slice(0, 3), spells: g.spells[0]?.combo || null };
}

const META = {
  patch: loadGuide(c1)?.patch || '7.x',
  updated: wr.snapshotDate ? `${wr.snapshotDate.slice(0, 4)}-${wr.snapshotDate.slice(4, 6)}-${wr.snapshotDate.slice(6, 8)}` : null,
  ranks: RANKS, rankLabels: RANK_RU,
  byRank,
  matchupOfDay: matchupTile(c1) || matchupTile(c2),
  counterOfDay: matchupTile(c2) || matchupTile(c3),
  buildOfDay: buildTile(c1) || buildTile(c3),
};

writeFileSync(`${here}/meta-data.js`, `window.META = ${JSON.stringify(META, null, 2)};\n`, 'utf8');
console.log('✓ meta-data.js готов.');
console.log('  Чемпион патча (Diamond+):', META.byRank.diamond_plus.featured.name, META.byRank.diamond_plus.featured.wr + '%', 'тир', META.byRank.diamond_plus.featured.tier);
console.log('  Матчап дня:', META.matchupOfDay?.champ, '→ лучший', META.matchupOfDay?.best?.name, META.matchupOfDay?.best?.wr + '%');
console.log('  Билд дня:', META.buildOfDay?.champ, '| core:', META.buildOfDay?.core?.join(', '));
console.log('  Патч:', META.patch, '| обновлено:', META.updated);
