// ───────────────────────────────────────────────────────────────────────────
// Сборщик БАЗОВЫХ СТАТОВ чемпионов Wild Rift (раньше велись РУКАМИ в Google-таблице).
//
//   Источники:
//     • Базовые статы (AD/HP/мана/броня/MR + рост, скорость передвижения, реген) + роли
//                              → Tencent: game.gtimg.cn/.../js/hero/<heroId>.js  (WR-точные)
//     • Список героев/имена    → game.gtimg.cn/.../js/heroList/hero_list.js
//     • Дальность атаки + скорость атаки (у Tencent их нет/мутно)
//                              → Riot Data Dragon (ПК-значения как близкий стенд-ин)
//
//   Запуск:  node data-pipeline/fetch-base-stats.mjs
//   Выход:   data-pipeline/base-stats.json
//
//   Числа Tencent приходят строками и УМНОЖЕНЫ на 10000 (делим). Имена ставим РОВНО как
//   в старой Google-таблице (карта SHEET_ALIAS), чтобы не сломать иконки/винрейты/драфт.
// ───────────────────────────────────────────────────────────────────────────

import { writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERO_LIST = 'https://game.gtimg.cn/images/lgamem/act/lrlib/js/heroList/hero_list.js';
const HERO_ONE  = (id) => `https://game.gtimg.cn/images/lgamem/act/lrlib/js/hero/${id}.js`;
const DDRAGON_VER = 'https://ddragon.leagueoflegends.com/api/versions.json';
const DDRAGON_ALL = (v) => `https://ddragon.leagueoflegends.com/cdn/${v}/data/en_US/championFull.json`;

// Англ. имя Tencent → имя РОВНО как в Google-таблице (только там, где отличается).
const SHEET_ALIAS = {
  MonkeyKing: 'Wukong', Tryndamere: 'Trynda', AurelionSol: 'Au. Sol', TwistedFate: 'Tw. Fate',
  Seraphine: 'Seraph', Mordekaiser: 'Morde', JarvanIV: 'Jarvan', DrMundo: 'Mundo',
  MissFortune: 'M.Fortune', Heimerdinger: 'Heimer', Fiddlesticks: 'Fiddle',
};
// Англ. имя Tencent → ключ Data Dragon (только там, где отличается; у большинства совпадает).
const DD_ALIAS = { Kogmaw: 'KogMaw', Ksante: 'KSante' };
// Дальность/AS для эксклюзивов Wild Rift, которых НЕТ в Data Dragon (ПК). Правим руками при нужде.
const RANGE_OVERRIDE = { Norra: { range: 500, as_b: 0.625, as_g: 0 } };

// Чемпионы на энергии (у них mp=0, но ресурс не «None»). Имена — как у Tencent (nameEN).
const ENERGY = new Set(['Akali', 'Kennen', 'LeeSin', 'Shen', 'Zed']);

// Линия (китайский) → роль сайта.
const LANE = { '单人路': 'Top', '打野': 'Jungle', '中路': 'Mid', '射手': 'Adc', '辅助': 'Support' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJSON(url, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://lolm.qq.com/' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const start = text.indexOf('{'); const end = text.lastIndexOf('}');
      return JSON.parse(text.slice(start, end + 1));
    } catch (e) {
      if (i === tries) throw new Error(`${url} → ${e.message} (после ${tries} попыток)`);
      await sleep(i * 1500);
    }
  }
}

const nameFromPoster = (p) => { const m = String(p || '').match(/\/([A-Za-z]+)_\d+\.jpg/); return m ? m[1] : null; };
const num = (v) => Number(v) / 10000;                 // строка Tencent ×10000 → число
const round = (v, d = 2) => +Number(v).toFixed(d);

// строит флаги ролей из строки lane («单人路;中路» → {Top, Mid})
function rolesFromLane(lane) {
  const flags = { Top: false, Jungle: false, Mid: false, Adc: false, Support: false };
  for (const part of String(lane || '').split(/[^一-龥]+/)) {
    const role = LANE[part]; if (role) flags[role] = true;
  }
  return flags;
}

async function main() {
  console.log('→ Тяну список героев Tencent + Data Dragon…');
  const ver = (await (await fetch(DDRAGON_VER)).json())[0];
  const [heroListRaw, ddAll] = await Promise.all([
    getJSON(HERO_LIST),
    fetch(DDRAGON_ALL(ver)).then((r) => r.json()),
  ]);
  console.log(`  Data Dragon ${ver}, чемпионов в DDragon: ${Object.keys(ddAll.data).length}`);

  // дальность + скорость атаки из DDragon по ключу
  const dd = {};
  for (const k of Object.keys(ddAll.data)) {
    const s = ddAll.data[k].stats || {};
    dd[k] = { range: s.attackrange || 0, as_b: s.attackspeed || 0, as_g: s.attackspeedperlevel || 0 };
  }

  const heroList = heroListRaw.heroList || heroListRaw;
  const ids = Object.keys(heroList).map((k) => ({ id: heroList[k].heroId, en: nameFromPoster(heroList[k].poster) }));
  console.log(`  Героев у Tencent: ${ids.length}. Тяну детали…`);

  // пул на 5 параллельных запросов
  const champions = [];
  const noDD = [];
  const queue = [...ids];
  async function worker() {
    while (queue.length) {
      const { id, en } = queue.shift();
      if (!en) continue;
      let d;
      try { d = await getJSON(HERO_ONE(id)); } catch (e) { console.warn(`  ⚠ ${en} (${id}): ${e.message}`); continue; }
      const h = d.hero || {};
      const sheetName = SHEET_ALIAS[en] || en;
      const ddKey = DD_ALIAS[en] || en;
      const range = dd[ddKey] || RANGE_OVERRIDE[en]; if (!range) noDD.push(en);
      const mp = num(h.mp);
      const resource = mp > 0 ? 'Mana' : (ENERGY.has(en) ? 'Energy' : 'None');
      const roles = rolesFromLane(h.lane);
      champions.push({
        Champion: sheetName, nameEN: en, heroId: id,
        AD_Base: round(num(h.attack)), AD_Growth: round(num(h.attackperlevel)),
        HP_Base: round(num(h.hp)), HP_Growth: round(num(h.hpperlevel)),
        Mana_Base: round(mp), Mana_Growth: round(num(h.mpperlevel)),
        Armor_Base: round(num(h.armor)), Armor_Growth: round(num(h.armorperlevel)),
        MR_Base: round(num(h.spellblock)), MR_Growth: round(num(h.spellblockperlevel)),
        Range_Base: range ? range.range : 0, Range_Growth: 0,
        AS_Base: range ? round(range.as_b, 3) : 0, AS_Growth: range ? round(range.as_g, 3) : 0,
        MS_Base: Math.round(Number(h.movespeed) / 100),
        HPRegen_Base: round(num(h.hpregen)), HPRegen_Growth: round(num(h.hpregenperlevel)),
        MPRegen_Base: round(num(h.mpregen)), MPRegen_Growth: round(num(h.mpregenperlevel)),
        Resource: resource,
        Is_Top: roles.Top ? 1 : 0, Is_Jungle: roles.Jungle ? 1 : 0, Is_Mid: roles.Mid ? 1 : 0,
        Is_Adc: roles.Adc ? 1 : 0, Is_Support: roles.Support ? 1 : 0,
      });
    }
  }
  await Promise.all(Array.from({ length: 5 }, worker));

  // защита: если чемпионов подозрительно мало — НЕ перезаписываем вчерашний хороший файл
  if (champions.length < 100) throw new Error(`Подозрительно мало чемпионов (${champions.length}) — НЕ перезаписываю base-stats.json`);

  champions.sort((a, b) => a.Champion.localeCompare(b.Champion));
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const outPath = `${__dirname}/base-stats.json`;
  writeFileSync(outPath, JSON.stringify({ ddragonVersion: ver, count: champions.length, champions }, null, 2), 'utf8');

  console.log(`✓ Готово. Чемпионов: ${champions.length}`);
  console.log(`✓ Записано: ${outPath}`);
  if (noDD.length) console.log(`⚠ Без дальности/AS из DDragon (range=0): ${noDD.join(', ')}`);
  const ex = champions.find((c) => c.nameEN === 'Garen');
  if (ex) console.log('Пример (Garen):', JSON.stringify(ex));
}

main().catch((e) => { console.error('✗ Ошибка:', e.message); process.exit(1); });
