// ───────────────────────────────────────────────────────────────────────────
// Сборщик статистики Wild Rift из ОФИЦИАЛЬНЫХ эндпоинтов Tencent (китайский сервер).
// Подтверждено 2026-06-10: эндпоинты отвечают из вне (гео-блока нет).
//
//   Источники:
//     • WR/PR/BR/тир/тренд  → https://mlol.qt.qq.com/go/lgame_battle_info/hero_rank_list_v2
//     • Имена чемпионов     → https://game.gtimg.cn/images/lgamem/act/lrlib/js/heroList/hero_list.js
//   (это те же источники, что у wildriftallstats.ru / wildriftcore — см. lolm.qq.com)
//
//   Запуск:  node data-pipeline/fetch-wr-stats.mjs     (нужен Node 18+, там встроенный fetch)
//   Выход:   data-pipeline/wr-stats.json  — готовая стата по чемпионам и линиям.
//
//   Дальше: эту же логику кладём в Firebase Cloud Function со scheduled-триггером (раз в день).
// ───────────────────────────────────────────────────────────────────────────

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RANK_URL = 'https://mlol.qt.qq.com/go/lgame_battle_info/hero_rank_list_v2';
const HERO_URL = 'https://game.gtimg.cn/images/lgamem/act/lrlib/js/heroList/hero_list.js';

// позиция (lane) из API → роль Wild Rift
const POS = { 1: 'Baron', 2: 'Mid', 3: 'Jungle', 4: 'Support', 5: 'Dragon' };
// тир из strength_level (0..5) Tencent → буква
const TIER = { 5: 'S+', 4: 'S', 3: 'A', 2: 'B', 1: 'C', 0: 'D' };

// английское имя → русское (кого нет — останется английское). Дополняй по мере надобности.
const RU = {
  Aatrox:'Аатрокс', Ahri:'Ари', Akali:'Акали', Akshan:'Акшан', Alistar:'Алистар', Ambessa:'Амбесса',
  Amumu:'Амуму', Annie:'Энни', Aphelios:'Афелий', Ashe:'Эш', AurelionSol:'Аурелион Сол', Aurora:'Аврора',
  Blitzcrank:'Блицкранк', Brand:'Бренд', Braum:'Браум', Caitlyn:'Кейтлин', Camille:'Камилла', Cassiopeia:'Кассиопея',
  Corki:'Корки', Darius:'Дариус', Diana:'Диана', DrMundo:'Доктор Мундо', Draven:'Дрейвен', Ekko:'Экко',
  Evelynn:'Эвелинн', Ezreal:'Эзреаль', Fiddlesticks:'Фиддлстикс', Fiora:'Фиора', Fizz:'Физз', Galio:'Галио',
  Garen:'Гарен', Gnar:'Гнар', Gragas:'Грагас', Graves:'Грейвз', Gwen:'Гвен', Hecarim:'Гекарим',
  Heimerdinger:'Хеймердингер', Irelia:'Ирелия', Janna:'Жанна', JarvanIV:'Джарван IV', Jax:'Джакс', Jayce:'Джейс',
  Jhin:'Джин', Jinx:'Джинкс', Kaisa:'Каиса', Kalista:'Калиста', Karma:'Карма', Katarina:'Катарина',
  Kayle:'Кайл', Kayn:'Кейн', Kennen:'Кеннен', Khazix:'Каазикс', Kindred:'Киндред', Leblanc:'Леблан',
  LeeSin:'Ли Син', Leona:'Леона', Lillia:'Лиллия', Lucian:'Люциан', Lulu:'Лулу', Lux:'Люкс',
  Malphite:'Мальфит', Maokai:'Маокай', MasterYi:'Мастер Йи', Milio:'Милио', MissFortune:'Мисс Фортуна',
  Mordekaiser:'Мордекайзер', Morgana:'Моргана', Nami:'Нами', Nasus:'Насус', Nautilus:'Наутилус',
  Nidalee:'Нидали', Nilah:'Нила', Nocturne:'Ноктюрн', Nunu:'Нуну', Olaf:'Олаф', Orianna:'Орианна',
  Ornn:'Орн', Pantheon:'Пантеон', Poppy:'Поппи', Pyke:'Пайк', Qiyana:'Кияна', Rakan:'Ракан',
  Rammus:'Раммус', Renekton:'Ренектон', Rengar:'Ренгар', Riven:'Ривен', Rumble:'Рамбл', Ryze:'Райз',
  Samira:'Самира', Senna:'Сенна', Seraphine:'Серафина', Sett:'Сетт', Shen:'Шен', Shyvana:'Шивана',
  Singed:'Синджед', Sion:'Сион', Sivir:'Сивир', Sona:'Сона', Soraka:'Сорака', Swain:'Свейн',
  Syndra:'Синдра', Talon:'Талон', Teemo:'Тимо', Thresh:'Треш', Tristana:'Тристана', Tryndamere:'Триндамир',
  TwistedFate:'Твистед Фейт', Twitch:'Твич', Varus:'Варус', Vayne:'Вейн', Veigar:'Вейгар', Vex:'Векс',
  Vi:'Ви', Viego:'Виего', Viktor:'Виктор', Vladimir:'Владимир', Volibear:'Волибир', Warwick:'Варвик',
  Wukong:'Вуконг', Xayah:'Заят', Xerath:'Зерат', XinZhao:'Син Жао', Yasuo:'Ясуо', Yone:'Йоне',
  Yuumi:'Юми', Zac:'Зак', Zed:'Зед', Zeri:'Зери', Ziggs:'Зиггс', Zoe:'Зои', Zyra:'Зайра',
  Taliyah:'Талия', Ksante:"К'Санте", MonkeyKing:'Вуконг', Zilean:'Зилеан', Rell:'Релл',
  Smolder:'Смолдер', Kogmaw:"Ког'Мао", Velkoz:"Вел'Коз", Norra:'Норра', Kassadin:'Кассадин',
  Mel:'Мел', Lissandra:'Лиссандра', Urgot:'Ургот', Bard:'Бард',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// fetch с 3 попытками и нарастающей паузой — чтобы дневной автозапуск не падал из-за сетевого сбоя
async function getJSON(url, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://lolm.qq.com/' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      // hero_list.js может быть чистым JSON или присваиванием (var x = {...}); вытащим объект
      const start = text.indexOf('{'); const end = text.lastIndexOf('}');
      return JSON.parse(text.slice(start, end + 1));
    } catch (e) {
      if (i === tries) throw new Error(`${url} → ${e.message} (после ${tries} попыток)`);
      await sleep(i * 1500);
    }
  }
}

// ранговые бракеты Tencent (срезы 0-4). Точное соответствие уточним при подключении к сайту.
const RANK = { 0: 'all', 1: 'r1', 2: 'r2', 3: 'r3', 4: 'r4' };

// английское имя зашито в ссылке на постер: .../Posters/Garen_0.jpg → "Garen"
function nameFromPoster(poster) {
  const m = String(poster || '').match(/\/([A-Za-z]+)_\d+\.jpg/);
  return m ? m[1] : null;
}

function buildHeroMap(heroJson) {
  const list = heroJson.heroList || heroJson;       // {heroId: {name, alias, poster, ...}}
  const map = {};
  for (const k of Object.keys(list)) {
    const h = list[k];
    map[String(h.heroId)] = {
      nameEN: nameFromPoster(h.poster),             // Garen / Amumu / Lux
      nameCN: h.name,                               // 盖伦 / 阿木木 / 拉克丝
      nameRU: RU[nameFromPoster(h.poster)] || null, // русское (если есть в словаре)
      alias: h.alias, title: h.title, lane: h.lane,
    };
  }
  return map;
}

async function main() {
  console.log('→ Тяну данные Tencent…');
  const [rank, heroes] = await Promise.all([getJSON(RANK_URL), getJSON(HERO_URL)]);
  const heroMap = buildHeroMap(heroes);

  // rank.data = { "0": {pos: [...]}, "1": {pos: [...]} } — "0"/"1" = срезы данных (напр. ранги/режим)
  const slices = rank.data || rank;
  const out = [];
  let snapshotDate = null;

  for (const sliceKey of Object.keys(slices)) {
    const byPos = slices[sliceKey];
    for (const posKey of Object.keys(byPos)) {
      for (const c of byPos[posKey]) {
        const h = heroMap[String(c.hero_id)] || {};
        snapshotDate = snapshotDate || c.dtstatdate;
        out.push({
          rankSlice: sliceKey,                  // 0-4 (бракет ранга Tencent)
          rank: RANK[sliceKey] || sliceKey,
          heroId: c.hero_id,
          name: h.nameRU || h.nameEN || `#${c.hero_id}`, // показываемое имя: рус → англ → запас
          nameEN: h.nameEN || null,
          nameCN: h.nameCN || null,
          role: POS[c.position] || c.position,
          tier: TIER[c.strength_level] ?? '?',
          wr: +Number(c.win_rate_percent ?? Number(c.win_rate) * 100).toFixed(1),
          pr: +Number(c.appear_rate_percent ?? Number(c.appear_rate) * 100).toFixed(1),
          br: +Number(c.forbid_rate_percent ?? Number(c.forbid_rate) * 100).toFixed(1),
          // тренд за день: Tencent отдаёт *_float поля (дельта)
          wrTrend: c.win_rate_float != null ? +Number(c.win_rate_float).toFixed(2) : null,
          date: c.dtstatdate,
        });
      }
    }
  }

  out.sort((a, b) => b.wr - a.wr);
  // защита: если строк подозрительно мало — источник изменился, не затираем вчерашний хороший файл
  if (out.length < 100) throw new Error(`Подозрительно мало строк (${out.length}) — НЕ перезаписываю wr-stats.json`);

  const __dirname = dirname(fileURLToPath(import.meta.url));
  mkdirSync(__dirname, { recursive: true });
  const outPath = `${__dirname}/wr-stats.json`;
  writeFileSync(outPath, JSON.stringify({ snapshotDate, count: out.length, ranks: RANK, champions: out }, null, 2), 'utf8');

  console.log(`✓ Готово. Чемпионов-строк: ${out.length}, снимок: ${snapshotDate}`);
  console.log(`✓ Записано: ${outPath}`);
  const noRU = [...new Set(out.filter(c => c.nameEN && !RU[c.nameEN]).map(c => c.nameEN))];
  console.log(`Топ-10 по WR (бракет «all»):`);
  for (const c of out.filter(c => c.rankSlice === '0').slice(0, 10)) console.log(`   ${c.wr}%  ${c.name}  · ${c.role} · тир ${c.tier} · PR ${c.pr}% BR ${c.br}%`);
  if (noRU.length) console.log(`\n⚠ Нет в русском словаре (показываю по-английски): ${noRU.join(', ')}`);

  // ── ДЛЯ FIREBASE (раскомментировать при переносе в Cloud Function): ──
  // import admin from 'firebase-admin'; admin.initializeApp();
  // const db = admin.firestore();
  // const batch = db.batch();
  // out.forEach(c => batch.set(db.collection('wrStats').doc(`${c.heroId}_${c.slice}_${c.role}`), c));
  // await batch.commit();
}

main().catch(e => { console.error('✗ Ошибка:', e.message); process.exit(1); });
