// ───────────────────────────────────────────────────────────────────────────
// Сборщик УМЕНИЙ И ПАССИВОК всех чемпионов Wild Rift.
//
//   Источник (тот же, что и базовые статы — официальный CN Tencent):
//     • Список героев → game.gtimg.cn/.../js/heroList/hero_list.js
//     • Умения чемпа  → game.gtimg.cn/.../js/hero/<heroId>.js  → массив `spells`
//
//   У каждого чемпа 5 умений: пассивка + Q + W + E + R (в этом порядке).
//   По каждому: имя, краткое описание, подробное (по рангам), иконка (полный URL),
//   видео (в этом источнике ПУСТО — поле есть, но не заполнено), кулдаун, стоимость,
//   и значения-переменные по рангам (variType/variValue: базовый урон, коэф. АД и т.п.).
//
//   ВЕСЬ ТЕКСТ — КИТАЙСКИЙ. Перевод на русский — отдельный слой (не здесь).
//   Числа/коэффициенты/иконки языконезависимы и приходят точными.
//
//   Запуск:  node data-pipeline/fetch-abilities.mjs
//   Выход:   data-pipeline/abilities.json
// ───────────────────────────────────────────────────────────────────────────

import { writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERO_LIST = 'https://game.gtimg.cn/images/lgamem/act/lrlib/js/heroList/hero_list.js';
const HERO_ONE  = (id) => `https://game.gtimg.cn/images/lgamem/act/lrlib/js/hero/${id}.js`;

// Англ. имя Tencent → имя РОВНО как в Google-таблице (синхронно с fetch-base-stats.mjs).
const SHEET_ALIAS = {
  MonkeyKing: 'Wukong', Tryndamere: 'Trynda', AurelionSol: 'Au. Sol', TwistedFate: 'Tw. Fate',
  Seraphine: 'Seraph', Mordekaiser: 'Morde', JarvanIV: 'Jarvan', DrMundo: 'Mundo',
  MissFortune: 'M.Fortune', Heimerdinger: 'Heimer', Fiddlesticks: 'Fiddle',
};

// порядок умений в массиве spells → ключ слота (passive, затем Q/W/E/R)
const SLOTS = ['passive', 'q', 'w', 'e', 'r'];

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

// собрать пары variType/variValue (значения умения по рангам), отбросив пустые
function spellVars(s) {
  const out = [];
  for (let i = 1; i <= 20; i++) {
    const t = s['variType' + i], v = s['variValue' + i];
    if (t) out.push({ type: t, value: v });
  }
  return out;
}

function mapSpell(s, slot) {
  return {
    slot,                                  // passive / q / w / e / r
    name: s.name || '',                    // КИТАЙСКИЙ
    desc: s.description || '',             // краткое (КИТАЙСКИЙ)
    detail: s.detail || '',               // подробно по рангам (КИТАЙСКИЙ)
    icon: s.abilityIconPath || '',        // полный URL картинки
    video: s.abilityVideoPath || '',      // в этом источнике пусто (оставляем поле под будущий источник)
    cd: s.cdtime != null ? String(s.cdtime) : '',       // кулдаун (может быть «6/6/6/6»)
    costType: s.costtype || 'None',       // Resource / Mana / None
    cost: s.costvalue != null ? String(s.costvalue) : '',
    vars: spellVars(s),                   // [{type:'基础伤害',value:'40/80/120/160'}, ...]
  };
}

async function main() {
  console.log('→ Тяну список героев Tencent…');
  const heroListRaw = await getJSON(HERO_LIST);
  const heroList = heroListRaw.heroList || heroListRaw;
  const ids = Object.keys(heroList).map((k) => ({ id: heroList[k].heroId, en: nameFromPoster(heroList[k].poster) }));
  console.log(`  Героев у Tencent: ${ids.length}. Тяну умения…`);

  const champions = [];
  let noVideo = 0, totalSpells = 0;
  const queue = [...ids];
  async function worker() {
    while (queue.length) {
      const { id, en } = queue.shift();
      if (!en) continue;
      let d;
      try { d = await getJSON(HERO_ONE(id)); } catch (e) { console.warn(`  ⚠ ${en} (${id}): ${e.message}`); continue; }
      const spells = (d.spells || []).map((s, idx) => mapSpell(s, SLOTS[idx] || ('x' + idx)));
      spells.forEach((sp) => { totalSpells++; if (!sp.video) noVideo++; });
      champions.push({
        Champion: SHEET_ALIAS[en] || en, nameEN: en, heroId: id,
        spells,
      });
    }
  }
  await Promise.all(Array.from({ length: 5 }, worker));

  // защита: если чемпионов подозрительно мало — НЕ перезаписываем вчерашний хороший файл
  if (champions.length < 100) throw new Error(`Подозрительно мало чемпионов (${champions.length}) — НЕ перезаписываю abilities.json`);

  champions.sort((a, b) => a.Champion.localeCompare(b.Champion));
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const outPath = `${__dirname}/abilities.json`;
  writeFileSync(outPath, JSON.stringify({ count: champions.length, totalSpells, champions }, null, 2), 'utf8');

  console.log(`✓ Готово. Чемпионов: ${champions.length}, умений: ${totalSpells}`);
  console.log(`✓ Записано: ${outPath}`);
  if (noVideo) console.log(`⚠ Без видео (поле пустое в источнике): ${noVideo}/${totalSpells} — ролики тянуть из другого источника`);
  const zed = champions.find((c) => c.nameEN === 'Zed');
  if (zed) console.log('Пример (Zed Q):', JSON.stringify(zed.spells[1]).slice(0, 200));
}

main().catch((e) => { console.error('✗ Ошибка:', e.message); process.exit(1); });
