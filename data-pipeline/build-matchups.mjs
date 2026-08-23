/* ═══════════════════════════════════════════════════════════════════════
   build-matchups.mjs — СШИВКА матчапов. 3 СЛОЯ (см. DRAFT-AI.md).

   1. СТАТИСТИКА (основной слой)  ← guides/*.json — трекер wildriftallstats.
      Реальный winrate/pickrate по 4 рангам и линиям + dataDate.
      Источник НАЗВАН и датирован → winrate ПОКАЗЫВАЕМ честно, с датой и подписью.
   2. РЕДАКЦИОННЫЕ (заполняют пробелы) ← counters.json — скрейп wildriftcounter/wildriftfire.
      ⚠️ БЕЗ winrate: у этих сайтов источник чисел не указан. Только сама пара + дата.
   3. «ПОЧЕМУ» (поверх обоих) ← champion-tags.json — теги механик + правила «тег бьёт тег».

   ГЛАВНОЕ ПРАВИЛО: НЕ ВЫДУМЫВАТЬ.
   Нет статистики → падаем на редакционную пару. Нет и её → пары нет.
   Не сработало ни одно правило → пара идёт БЕЗ «почему» (`explained:false`).
   Пустое «почему» честнее придуманного: игрок читает готовое, а не фантазию робота.
   ЧИСЛО winrate берётся ТОЛЬКО из слоя 1. Из редакционного скрейпа — НИКОГДА.

   ЗАПУСК: node data-pipeline/build-matchups.mjs
   ═══════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));

const TAGS = read('champion-tags.json');
const CNT = read('counters.json');
const RU = TAGS.tagNames;

/* ── СЛОЙ 1: СТАТИСТИКА из guides/*.json ──────────────────────────────────
   Формат гайда: matchups:[{rank, lane, date, best:[{slug,wr,pr}], worst:[...]}]
   `wr` — винрейт САМОГО чемпиона в этой паре (best = ему хорошо, worst = плохо).
   Рангов 4; для заголовочного числа берём первый доступный по этому порядку —
   diamond_plus самый массовый, дальше по убыванию населённости. */
const RANK_ORDER = ['diamond_plus', 'master_plus', 'challenger', 'super_server'];
/* в JSON ранги пишем одной буквой: полные имена в тысячах пар стоили ~130 КБ трафика.
   Расшифровка едет в самом файле (out.ranks), чтобы UI не держал свой словарь. */
const RANK_KEY = { diamond_plus: 'd', master_plus: 'm', challenger: 'c', super_server: 's' };
const RANK_RU = { d: 'Алмаз+', m: 'Мастер+', c: 'Претендент', s: 'Супер-сервер' };
const LANE_MAP = { top: 'Top', jungle: 'Jungle', mid: 'Mid', adc: 'Adc', support: 'Support' };

/* Читаем терпимо: пропавшая папка или один битый файл не должны ронять сборку стектрейсом.
   Просадка слоя всё равно поймается порогом перед записью — но сообщением, а не падением. */
const GUIDES = [];
const gdir = path.join(DIR, 'guides');
let badGuides = 0;
if (!fs.existsSync(gdir)) {
  console.warn('⚠ Папки guides/ нет — слой статистики пуст. Запусти: node data-pipeline/fetch-all.mjs');
} else {
  for (const f of fs.readdirSync(gdir)) {
    if (f === '_index.json' || !f.endsWith('.json')) continue;
    try { GUIDES.push(JSON.parse(fs.readFileSync(path.join(gdir, f), 'utf8'))); }
    catch { badGuides++; }
  }
  if (badGuides) console.warn('⚠ Не прочитались гайды: ' + badGuides + ' шт (битый JSON) — пропущены');
}

/* ── ПРАВИЛА «тег A бьёт тег B» ───────────────────────────────────────────
   Порт из доказанного на образце прототипа. Вес = насколько взаимодействие решающее.
   Используются ТОЛЬКО для ОБЪЯСНЕНИЯ уже известной пары, НЕ для её генерации:
   на генерации метод даёт 8% попаданий против 13% случайного (доказано, DRAFT-AI.md). */
const RULES = [
  ['dodge_auto', 'auto_carry', 5, 'уклонение от автоатак обнуляет основной урон авто-керри'],
  ['dodge_auto', 'empower_aa', 3, 'усиленная автоатака уходит в молоко'],
  ['block_proj', 'poke_ranged', 4, 'снаряды поука блокируются стеной'],
  ['block_proj', 'cc_proj', 3, 'контроль-снаряд не долетает'],
  ['cc_hard', 'dive_assassin', 5, 'вход пойман контролем до размена'],
  ['cc_hard', 'auto_carry', 4, 'керри не бьёт, пока в контроле'],
  ['cc_hard', 'immobile', 2, 'неподвижный не выходит из контроля'],
  ['cc_knockback', 'gap_close', 4, 'вход отменяется отбрасыванием'],
  ['cc_knockback', 'frontline', 3, 'дизенгейдж ломает инициацию танка'],
  ['cc_knockback', 'dive_assassin', 4, 'ассасина вышибает до добивания'],
  ['cc_knockup', 'immobile', 3, 'подброс по неподвижной цели проходит гарантированно'],
  ['cc_pull', 'poke_ranged', 4, 'притянутый поукер теряет свою дистанцию'],
  ['cc_pull', 'immobile', 3, 'притягивание нечем отменить без рывка'],
  ['cc_root', 'dash', 3, 'обездвиживание отменяет мобильность'],
  ['cc_root', 'dive_assassin', 4, 'ассасин прибит на месте'],
  ['cc_root', 'auto_carry', 2, 'керри не может кайтить'],
  ['cc_silence', 'dash', 3, 'немота отбирает кнопку побега'],
  ['cc_silence', 'dive_assassin', 3, 'ассасин остаётся без комбо'],
  ['cc_slow', 'melee', 2, 'ближний не догоняет'],
  ['cc_slow', 'gap_close', 1, 'вход замедлен'],
  ['antiheal', 'heal_sustain', 5, 'сустейн срезан — размен проигран'],
  ['pct_maxhp', 'frontline', 5, '%HP-урон игнорирует стак здоровья танка'],
  ['pct_maxhp', 'shield', 2, 'щит не спасает от процента здоровья'],
  ['true_dmg', 'frontline', 4, 'чистый урон игнорирует броню и сопротивление магии'],
  ['shred_resist', 'frontline', 3, 'срез резистов обнуляет защитную сборку'],
  ['execute', 'frontline', 2, 'добивание пробивает большой запас здоровья'],
  ['poke_ranged', 'immobile', 4, 'неподвижного выбивают с дистанции безнаказанно'],
  ['poke_ranged', 'melee', 3, 'ближний не отвечает на поук'],
  ['gap_close', 'poke_ranged', 5, 'вход сокращает дистанцию — поукер беззащитен'],
  ['gap_close', 'immobile', 4, 'от входа неподвижному не убежать'],
  ['dive_assassin', 'poke_ranged', 5, 'ассасин казнит хрупкого поукера'],
  ['dive_assassin', 'auto_carry', 4, 'керри убит до первой автоатаки'],
  ['dash', 'poke_ranged', 3, 'мобильность уклоняется от скиллшотов поука'],
  ['dash', 'cc_proj', 2, 'рывок уходит от контроля-снаряда'],
  ['stealth', 'immobile', 3, 'невидимость даёт свободный вход по неподвижному'],
  ['stealth', 'poke_ranged', 3, 'поукер не видит цель для размена'],
  ['cc_immune', 'cc_hard', 4, 'иммунитет или чистка снимает главный контроль'],
  ['cc_immune', 'cc_root', 3, 'чистка снимает обездвиживание'],
  ['untargetable', 'cc_hard', 3, 'нельзя выбрать целью — точечный контроль впустую'],
  ['untargetable', 'dive_assassin', 3, 'ассасин теряет цель в момент бурста'],
  ['shield', 'poke_ranged', 4, 'щит съедает поук-урон'],
  ['shield', 'execute', 3, 'щит выводит из порога добивания'],
  ['heal_sustain', 'poke_ranged', 4, 'хил отыгрывает поук назад'],
  ['dmg_reduction', 'auto_carry', 3, 'снижение урона гасит DPS керри'],
  ['dmg_reduction', 'dive_assassin', 3, 'бурст не пробивает порог'],
  ['frontline', 'dive_assassin', 3, 'ассасин не пробивает броню и запас здоровья'],
  ['vision', 'stealth', 5, 'ревил снимает невидимость'],
  ['as_scaling', 'frontline', 2, 'DPS от скорости атаки прогрызает большой запас здоровья'],
  ['waveclear', 'poke_ranged', 1, 'вейвклир не даёт зажать под башней'],
  ['reset_on_kill', 'immobile', 3, 'сброс КД превращает добивание в серию рывков'],
  ['scaling_infinite', 'poke_ranged', 2, 'бесконечный скейл переживает раннее давление'],
  ['stack_burst', 'frontline', 3, 'взрыв по проценту здоровья бьёт именно по танку'],
];

/* ── слаг сайта → наше имя чемпиона ──────────────────────────────────────── */
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const bySlug = {};
for (const [en, c] of Object.entries(TAGS.champions)) {
  for (const v of [en, c.dd, String(c.dd).replace(/([a-z0-9])([A-Z])/g, '$1-$2')]) bySlug[norm(v)] = en;
}
/* Слаги, которые не выводятся из имени автоматически.
   Ключи champion-tags.json — КОРОТКИЕ имена из abilities.json («Mundo», «Trynda»),
   поле dd — полное ddragon-имя; кебаб от dd закрывает большинство слагов, остальное здесь. */
Object.assign(bySlug, {
  wukong: 'Wukong', monkeyking: 'Wukong', nunuwillump: 'Nunu', nunuandwillump: 'Nunu',
  nunuampwillump: 'Nunu',        // слаг «nunu-&amp;-willump» — амперсанд экранирован в HTML
  jarvaniv: 'Jarvan', jarvan: 'Jarvan', khazix: 'Khazix', kogmaw: 'Kogmaw',
  velkoz: 'Velkoz', ksante: 'Ksante', leblanc: 'Leblanc', chogath: 'Chogath',
});
/* Возвращаем ТОЛЬКО существующего у нас чемпиона: на сайтах-источниках есть чемпионы,
   которых нет в наших данных (Aphelios, LeBlanc, Cho'Gath…) — такие пары просто пропускаем. */
const resolve = (slug) => {
  const k = bySlug[norm(slug)];
  return k && TAGS.champions[k] ? k : null;
};

/* ── ДВИЖОК «ПОЧЕМУ» ──────────────────────────────────────────────────────
   winner бьёт loser. Возвращает список объяснений с цитатами умений.
   Пусто — значит объяснить нечем; так и отдаём, ничего не сочиняя. */
function explain(winner, loser) {
  const W = TAGS.champions[winner], L = TAGS.champions[loser];
  if (!W || !L) return [];
  const wt = new Set(W.tags), lt = new Set(L.tags);
  // Отдаём только НОМЕР правила. Полный текст в каждой из 5228 пар раздувал файл до 5.5 МБ,
  // цитата умения — до 2.7 МБ, а её и так можно взять из champion-tags.json по тегу правила.
  // Итог 0.79 МБ. Расшифровка правила — out.rules[r], цитата — tags.champions[winner].src[rules[r].tag].
  return RULES
    .map((r, i) => [r, i])
    .filter(([[a, b]]) => wt.has(a) && lt.has(b))
    .sort(([x], [y]) => y[2] - x[2])
    .map(([, i]) => i);
}

/* ── ИНДЕКС СЛОЯ 1 (статистика) ───────────────────────────────────────────
   STATS[чемп][Линия][оппонент] = { byRank: {ранг: [winrate, pickrate]}, date } */
const STATS = {};
const st = { pairs: 0, blocks: 0, unresolved: new Set(), noMatchups: [] };

for (const g of GUIDES) {
  const me = resolve(g.slug);
  if (!me) { st.unresolved.add(g.slug); continue; }
  if (!g.matchups?.length) { st.noMatchups.push(g.slug); continue; }
  for (const block of g.matchups) {
    const lane = LANE_MAP[String(block.lane).toLowerCase()];
    if (!lane) continue;
    st.blocks++;
    const put = (row) => {
      const opp = resolve(row.slug);
      if (!opp || opp === me) { if (!opp) st.unresolved.add(row.slug); return; }
      const cell = (((STATS[me] ||= {})[lane] ||= {})[opp] ||= { byRank: {}, date: block.date || g.dataDate || null });
      const rk = RANK_KEY[block.rank] || block.rank;
      if (typeof row.wr === 'number') { cell.byRank[rk] = [row.wr, row.pr ?? null]; st.pairs++; }
    };
    for (const r of block.best || []) put(r);
    for (const r of block.worst || []) put(r);
  }
}

/* Признак крошечной выборки: винрейт, равный простой дроби от ≤6 игр (33.3 = 1/3, 66.7 = 2/3…).
   Замерено: у super_server такие 7.5% значений, у challenger 1.1%, у diamond_plus 0.1% —
   поэтому порядок рангов ниже идёт от самого чистого. Показывать такое число как факт нельзя. */
const WEAK_WR = new Set([0, 100, 16.7, 20, 25, 33.3, 66.7, 75, 80, 83.3]);
const isWeak = (wr) => WEAK_WR.has(Math.round(wr * 10) / 10);

/* заголовочное число пары: первый доступный ранг по порядку населённости */
function headline(cell) {
  for (const full of RANK_ORDER) {
    const r = RANK_KEY[full];
    if (cell.byRank[r]) return { rank: r, wr: cell.byRank[r][0], pr: cell.byRank[r][1] };
  }
  const r = Object.keys(cell.byRank)[0];
  return r ? { rank: r, wr: cell.byRank[r][0], pr: cell.byRank[r][1] } : null;
}

/* ── СБОРКА ТРЁХ СЛОЁВ ────────────────────────────────────────────────────
   Идём по ВСЕМ нашим чемпионам, а не только по тем, кто есть в скрейпе:
   у статистики бывают пары, которых в редакционных списках нет. */
const champions = {};
const stat = { pairs: 0, explained: 0, bare: 0, withWr: 0, weak: 0, statOnly: 0, edOnly: 0, both: 0, disagree: 0, newestStatDate: null, unresolved: new Set() };

/* редакционный слой в удобном виде: ED[чемп][Линия][оппонент] = {verdict, sources[], date} */
const ED = {};
for (const [rawKey, rec] of Object.entries(CNT.champions)) {
  const en = resolve(rawKey) || (TAGS.champions[rawKey] ? rawKey : null);
  if (!en) { stat.unresolved.add(rawKey); continue; }
  const put = (lane, slug, verdict, source, date) => {
    const opp = resolve(slug);
    if (!opp || opp === en) { if (!opp) stat.unresolved.add(slug); return; }
    const cell = (((ED[en] ||= {})[lane] ||= {})[opp] ||= { verdict, sources: [], date });
    if (!cell.sources.includes(source)) cell.sources.push(source);
    if (!cell.date && date) cell.date = date;
  };
  const wrc = rec.sources?.wildriftcounter;
  if (wrc) for (const [lane, v] of Object.entries(wrc.lanes)) {
    for (const o of v.counteredBy) put(lane, o, 'counteredBy', 'wildriftcounter', wrc.sourceDate);
    for (const o of v.strongAgainst) put(lane, o, 'strongAgainst', 'wildriftcounter', wrc.sourceDate);
  }
  const wrf = rec.sources?.wildriftfire;
  if (wrf) for (const [lane, arr] of Object.entries(wrf.counteredBy)) {
    for (const o of arr) put(lane, o, 'counteredBy', 'wildriftfire', null);
  }
}

for (const en of Object.keys(TAGS.champions)) {
  const lanesSet = new Set([...Object.keys(STATS[en] || {}), ...Object.keys(ED[en] || {})]);
  if (!lanesSet.size) continue;
  const lanes = {};

  for (const lane of lanesSet) {
    const s = STATS[en]?.[lane] || {}, e = ED[en]?.[lane] || {};
    const rows = [];
    for (const opp of new Set([...Object.keys(s), ...Object.keys(e)])) {
      const cell = s[opp], ed = e[opp];
      const h = cell ? headline(cell) : null;

      // ВЕРДИКТ: решает статистика (winrate относительно 50%), редакционный — только запасной
      const verdict = h ? (h.wr >= 50 ? 'strongAgainst' : 'counteredBy') : ed.verdict;
      const winner = verdict === 'counteredBy' ? opp : en;
      const loser = verdict === 'counteredBy' ? en : opp;
      const why = explain(winner, loser);

      // Поля, выводимые из других, НЕ пишем: имя оппонента по-русски и цитаты берутся из
      // champion-tags.json (UI грузит его всё равно), «есть ли объяснение» = why.length,
      // «чем определён вердикт» = наличие stat. На тысячах пар это сотни КБ трафика.
      const row = {
        opponent: opp, verdict,
        why: why.slice(0, 3),           // не больше 3 причин — читать, а не листать
      };
      if (h) {
        row.stat = {                     // ЧИСЛА только отсюда — источник назван и датирован
          date: cell.date, rank: h.rank, wr: h.wr, pr: h.pr, byRank: cell.byRank,
        };
        if (isWeak(h.wr)) { row.stat.weak = true; stat.weak++; }  // крошечная выборка — не подавать как факт
        stat.withWr++;
        // самая свежая дата статистики во всей базе — по ней политика решает, доверять ли числам
        if (cell.date && (!stat.newestStatDate || cell.date > stat.newestStatDate)) stat.newestStatDate = cell.date;
      }
      if (ed) row.ed = { s: ed.sources, date: ed.date, verdict: ed.verdict };

      if (h && ed) { stat.both++; if (ed.verdict !== verdict) { stat.disagree++; row.disagree = true; } }
      else if (h) stat.statOnly++; else stat.edOnly++;

      stat.pairs++; why.length ? stat.explained++ : stat.bare++;
      rows.push(row);
    }
    // сильнее всего разошедшиеся по winrate — наверх, они интереснее всего игроку
    rows.sort((a, b) => Math.abs((b.stat?.wr ?? 50) - 50) - Math.abs((a.stat?.wr ?? 50) - 50));
    lanes[lane] = rows;
  }

  champions[en] = { ru: TAGS.champions[en].ru, dd: TAGS.champions[en].dd, lanes };
}

const out = {
  built: new Date().toISOString().slice(0, 10),
  note: 'СШИВКА ТРЁХ СЛОЁВ. 1) stat — РЕАЛЬНАЯ статистика трекера wildriftallstats (winrate/pickrate '
      + 'по рангам), источник назван и датирован, ПОКАЗЫВАТЬ можно. 2) editorial — редакционные пары со '
      + 'скрейпа, заполняют пробелы, winrate у них НЕ берём (источник чисел не указан). 3) why — объяснение '
      + 'из механики умений. explained:false = объяснить нечем, пара показывается голой, не выдумываем. '
      + 'ДАТЫ РАЗЪЕЗЖАЮТСЯ (до 1.5 лет) — рядом с парой ВСЕГДА показывать «данные от <дата> · <источник>».',
  legend: {
    verdict: 'counteredBy — оппонент контрит этого чемпиона · strongAgainst — этот чемпион контрит оппонента',
    stat: 'ЕДИНСТВЕННЫЙ источник чисел (трекер wildriftallstats). wr/pr — заголовочный ранг, '
        + 'byRank — все ранги: {ранг:[winrate,pickrate]}. Есть stat → вердикт посчитан по winrate.',
    ed: 'редакционная пара со скрейпа: s — источники, date — дата. Чисел не несёт принципиально. '
      + 'Нет stat → вердикт взят отсюда.',
    disagree: 'статистика и редакция разошлись во мнении — можно показать как «спорный матчап»',
    'stat.weak': 'винрейт равен простой дроби (33.3 = 1/3) — выборка в несколько игр. НЕ подавать как факт',
    why: 'массив НОМЕРОВ правил в rules[]. Пусто = объяснить нечем, показывать пару голой. '
       + 'Победитель пары: verdict==="counteredBy" ? opponent : сам чемпион.',
    howToShowQuote: 'цитата умения = champion-tags.json → champions[победитель].src[ rules[номер].tag ]',
    opponentRu: 'намеренно НЕ дублируется — брать champion-tags.json → champions[opponent].ru',
  },
  /* КОНТРАКТ ПОКАЗА — обязателен для UI. Полная версия в data-pipeline/README.md. */
  uiContract: [
    'policy.useStatWinrate:false — проценты НЕ показывать и НЕ брать в вес. Направление (кто кого бьёт) остаётся.',
    'Вердикт всегда по статистике: есть stat → считать по stat.wr относительно 50%. ed.verdict на вердикт не влияет.',
    'disagree:true — флаг «источники расходятся» ОБЯЗАН быть виден. Вердикт показываем по статистике, расхождение не прячем.',
    'stat.weak:true — числом НЕ показывать: за ним несколько игр. Либо скрыть пару, либо показать без процента с подписью «мало данных».',
    'Дата и источник всегда рядом с числом: «данные от <stat.date> · wildriftallstats» / «<ed.date> · <ed.s>».',
    'Процент только из stat. У ed процентов нет — пара показывается без числа, подставлять нечего.',
    'Пустой why — нормальный результат: показать пару без объяснения, ничего не досочинять.',
  ],
  ranks: RANK_RU,
  /* ПОЛИТИКА ДОВЕРИЯ К ЦИФРАМ — считается автоматически, не ставится руками.
     Источник статистики матчапов замирал: страницы обновляются, а winrate внутри
     остаётся с прежней датой. Показывать такой процент как «сейчас» = врать.
     Поэтому: свежее порога — цифры живые; протухло — цифры молчат, а направление
     («Джакс бьёт Камиллу») остаётся: оно из механики и так быстро не меняется.
     Источник оживёт — цифры включатся сами, без правки кода. */
  policy: (() => {
    const MAX_AGE_DAYS = 60;
    const ageDays = stat.newestStatDate
      ? Math.round((Date.now() - Date.parse(stat.newestStatDate)) / 86400000) : null;
    const ok = ageDays !== null && ageDays <= MAX_AGE_DAYS;
    return {
      useStatWinrate: ok,
      newestStatDate: stat.newestStatDate || null,
      ageDays,
      maxAgeDays: MAX_AGE_DAYS,
      reason: ok
        ? 'статистика свежая — проценты можно показывать и брать в вес'
        : 'источник не обновлял winrate матчапов ' + ageDays + ' дней (последняя дата ' + stat.newestStatDate
          + '). Проценты НЕ показывать и в вес НЕ брать. Направление пары остаётся — оно из механики.',
      useVerdict: true,
      useEditorial: true,
      useTags: true,
    };
  })(),
  // справочник правил: пары ссылаются на него номером, иначе файл раздувается впятеро
  rules: RULES.map(([tag, vs, weight, text]) => ({ tag, vs, weight, text, tagRu: RU[tag] || tag, vsRu: RU[vs] || vs })),
  count: Object.keys(champions).length,
  pairs: stat.pairs,
  pairsWithWinrate: stat.withWr,
  pairsEditorialOnly: stat.edOnly,
  pairsWeakSample: stat.weak,
  explainedPairs: stat.explained,
  barePairs: stat.bare,
};

/* ── FAIL-SAFE перед записью ──────────────────────────────────────────────
   Это файлы, которые читает сайт. Если входные слои просели (источник лёг, гайды
   не обновились, counters.json урезался), лучше оставить вчерашние матчапы, чем
   выложить обрубок. Порог тот же, что у скрейпера: 60% от прошлого объёма. */
const MIN_PAIRS = 500, KEEP_RATIO = 0.6;
let prevPairs = 0;
try { prevPairs = JSON.parse(fs.readFileSync(path.join(DIR, 'matchups.json'), 'utf8')).pairs || 0; } catch { /* первого запуска ещё не было */ }
const floor = Math.max(MIN_PAIRS, Math.round(prevPairs * KEEP_RATIO));
if (stat.pairs < floor) {
  console.error('✗ FAIL-SAFE: сшилось ' + stat.pairs + ' пар, минимум ' + floor + ' (было ' + prevPairs + ').');
  console.error('  matchups.json и matchups/ НЕ ТРОНУТЫ — прежние данные целы. Проверь входные слои:');
  console.error('  guides/*.json (статистика) и counters.json (редакционные пары).');
  process.exit(1);
}

/* ── ЗАПИСЬ: оглавление + файл на чемпиона ────────────────────────────────
   Одним файлом выходило 1.3 МБ — грузить столько ради одного чемпиона на странице
   значит тормоза на ровном месте. Режем как уже сделано у guides/: страница берёт
   свои ~9 КБ. Правила и расшифровки лежат в оглавлении, оно маленькое. */
const outDir = path.join(DIR, 'matchups');
fs.mkdirSync(outDir, { recursive: true });
for (const f of fs.readdirSync(outDir)) if (f.endsWith('.json')) fs.unlinkSync(path.join(outDir, f));

const slugOf = (en) => String(TAGS.champions[en].dd).replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
const index = {};
for (const [en, rec] of Object.entries(champions)) {
  const slug = slugOf(en);
  fs.writeFileSync(path.join(outDir, slug + '.json'), JSON.stringify({ en, ru: rec.ru, dd: rec.dd, lanes: rec.lanes }));
  index[en] = {
    slug, ru: rec.ru,
    lanes: Object.fromEntries(Object.entries(rec.lanes).map(([l, rows]) => [l, rows.length])),
  };
}
out.file = 'matchups/<slug>.json — матчапы одного чемпиона; здесь только оглавление, правила и расшифровки';
out.champions = index;
// без отступов: файлы машинные, отступы стоили бы лишние сотни КБ трафика
fs.writeFileSync(path.join(DIR, 'matchups.json'), JSON.stringify(out));

const pct = (n) => (100 * n / stat.pairs).toFixed(1) + '%';
console.log('✓ matchups.json — чемпионов: ' + out.count + ' · пар: ' + stat.pairs);
console.log(out.policy.useStatWinrate
  ? '  ЦИФРЫ ВКЛЮЧЕНЫ: статистике ' + out.policy.ageDays + ' дн., это свежо'
  : '  ⚠ ЦИФРЫ ВЫКЛЮЧЕНЫ: последняя статистика ' + out.policy.newestStatDate
    + ' (' + out.policy.ageDays + ' дн. назад, порог ' + out.policy.maxAgeDays + ').'
    + '\n    Проценты не показываем и в вес не берём. Направление пар работает. Источник оживёт — включатся сами.');
console.log('  слой 1 СТАТИСТИКА: ' + stat.withWr + ' пар с winrate (' + pct(stat.withWr) + ')'
  + ' · из ' + st.blocks + ' блоков ранг×линия');
console.log('  слой 2 РЕДАКЦИЯ:  ' + stat.edOnly + ' пар только редакционных (' + pct(stat.edOnly) + ')'
  + ' · обоими источниками: ' + stat.both + ' · из них расходятся: ' + stat.disagree);
console.log('  слой 3 ПОЧЕМУ:    ' + stat.explained + ' с объяснением (' + pct(stat.explained) + ')'
  + ' · голых: ' + stat.bare);
if (st.noMatchups.length) console.log('  гайд есть, статистики нет: ' + st.noMatchups.join(', '));
const un = new Set([...stat.unresolved, ...st.unresolved]);
if (un.size) console.log('  не сопоставлены слаги: ' + [...un].join(', '));
