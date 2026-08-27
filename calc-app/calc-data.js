/* ══════════════════════════════════════════════════════════════════════════
   calc-data.js — КАТАЛОГ СНАРЯГИ для калькулятора: предметы · ботинки ·
   зачарования · руны (главная + ветка + соло) · он-хиты · пресеты манекена.

   ⚠️ ПОМЕТКИ ИСТОЧНИКА (закон: не выдумывать, помечать демо):
      demo:true  — число НЕ подтверждено данными (экспертная прикидка по WR).
                   Такие в UI носят значок «демо» и попадают в легенду.
      реальные   — предметы/руны существуют в WR, иконки настоящие
                   (wildriftfire), точные числа заводим через админку.
   Статы умений/чемпов сюда НЕ попадают — они реальные, из wr-data.js.
   ══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  const IMG_ITEM = s => `https://www.wildriftfire.com/images/items/${s}.png`;
  const IMG_RUNE = s => `https://www.wildriftfire.com/images/runes/${s}.png`;

  /* ── ПРЕДМЕТЫ. Поля статов = ключи, которые понимает движок ──────────────
     ad ap hp mp armor mr crit critDmg as ah ih ms ls sv omni hsp ten
     arPenFlat arPenPct(0..1) mrPenFlat mrPenPct(0..1)
     onhit:{dt,flat,ad,ap,pctCurHp,pctMaxHp,named} · amp:{label,v}            */
  const ITEMS = {
    /* ——— AD / крит / пробитие ——— */
    ie:        { n: 'Грань Бесконечности',       img: 'infinity-edge',            cat: 'AD', g: 3400, s: { ad: 65, crit: 20, critDmg: 0.30 } },
    bt:        { n: 'Жажда крови',               img: 'bloodthirster',            cat: 'AD', g: 3200, s: { ad: 55, ls: 18 } },
    collector: { n: 'Коллекционер',              img: 'the-collector',            cat: 'AD', g: 3000, s: { ad: 50, crit: 20, arPenFlat: 12 } },
    youmuu:    { n: 'Призрачный клинок Йоумуу',  img: 'youmuus-ghostblade',       cat: 'AD', g: 3000, s: { ad: 55, arPenFlat: 18 }, act: { n: 'Призрак', d: '+40 скор. бега 6с', ms: 40, cd: 45, demo: true } },
    serylda:   { n: 'Обида Серильды',            img: 'seryldas-grudge',          cat: 'AD', g: 3000, s: { ad: 45, arPenPct: 0.30, ah: 15 } },
    mortal:    { n: 'Смертельное напоминание',   img: 'mortal-reminder',          cat: 'AD', g: 3000, s: { ad: 35, crit: 20, arPenPct: 0.30 } },
    bc:        { n: 'Чёрный разделитель',        img: 'black-cleaver',            cat: 'AD', g: 3000, s: { ad: 40, hp: 300, arPenPct: 0.24 } },
    tri:       { n: 'Сила Троицы',               img: 'trinity-force',            cat: 'AD', g: 3333, s: { ad: 35, as: 30, hp: 250, ah: 20 },
                 onhit: { dt: 'phys', ad: 2.0, named: 'spellblade', n: 'Чароклинок (Троица)', demo: true } },
    navori:    { n: 'Клинки Навори',             img: 'navori-quickblades',       cat: 'AD', g: 3000, s: { ad: 60, crit: 20, ah: 15 } },
    botrk:     { n: 'Клинок Погибшего Короля',   img: 'blade-of-the-ruined-king', cat: 'AD', g: 3000, s: { ad: 30, as: 25, ls: 8 },
                 onhit: { dt: 'phys', pctCurHp: 0.08, min: 15, n: 'Он-хит BotRK (8% тек.HP)', demo: true } },
    wits:      { n: 'Конец мудрости',            img: 'wits-end',                 cat: 'AD', g: 2800, s: { as: 40, mr: 40, ten: 0.20 },
                 onhit: { dt: 'magic', flat: 45, n: 'Он-хит Конца мудрости', demo: true } },
    /* ——— AP ——— */
    luden:     { n: 'Эхо Людена',                img: 'ludens-echo',              cat: 'AP', g: 3200, s: { ap: 100, ah: 20 } },
    liandry:   { n: 'Мучения Лиандри',           img: 'liandrys-torment',         cat: 'AP', g: 3000, s: { ap: 95, hp: 300 },
                 amp: { label: 'Лиандри +6% урона по живучим', v: 0.06, demo: true } },
    lich:      { n: 'Лезвие лича',               img: 'lich-bane',                cat: 'AP', g: 3000, s: { ap: 80, ah: 15, ms: 8 },
                 onhit: { dt: 'magic', ap: 0.75, named: 'spellblade', n: 'Чароклинок (Лич)', demo: true } },
    nashor:    { n: 'Зуб Нашора',                img: 'nashors-tooth',            cat: 'AP', g: 3000, s: { ap: 85, as: 50, ah: 15 },
                 onhit: { dt: 'magic', flat: 15, ap: 0.20, n: 'Он-хит Нашора', demo: true } },
    iorb:      { n: 'Сфера бесконечности',       img: 'infinity-orb',             cat: 'AP', g: 2900, s: { ap: 110, hp: 200 } },
    rylai:     { n: 'Скипетр Рилай',             img: 'rylais-crystal-scepter',   cat: 'AP', g: 2900, s: { ap: 75, hp: 400 } },
    void:      { n: 'Посох Бездны',              img: 'void-staff',               cat: 'AP', g: 3000, s: { ap: 85, mrPenPct: 0.35 } },
    morello:   { n: 'Мореллономикон',            img: 'morellonomicon',           cat: 'AP', g: 2900, s: { ap: 75, hp: 250, ah: 15 } },
    /* ——— Защита (и для манекена, и в свою сборку) ——— */
    thornmail: { n: 'Шипованный доспех',         img: 'thornmail',                cat: 'Защита', g: 2700, s: { armor: 55, hp: 300 } },
    sunfire:   { n: 'Эгида Солнечного огня',     img: 'sunfire-aegis',            cat: 'Защита', g: 2700, s: { armor: 50, hp: 400 } },
    deadmans:  { n: 'Хватка мертвеца',           img: 'dead-mans-plate',          cat: 'Защита', g: 2900, s: { armor: 55, hp: 300, ms: 15 } },
    frozen:    { n: 'Ледяное сердце',            img: 'frozen-heart',             cat: 'Защита', g: 2700, s: { armor: 70, ah: 20 } },
    heartsteel:{ n: 'Сердце стали',              img: 'heartsteel',               cat: 'Защита', g: 3000, s: { hp: 700 } },
    hollow:    { n: 'Пустотное сияние',          img: 'hollow-radiance',          cat: 'Защита', g: 2700, s: { mr: 45, hp: 350 } },
    force:     { n: 'Сила природы',              img: 'force-of-nature',          cat: 'Защита', g: 2900, s: { mr: 60, ms: 25, ten: 0.20 } },
    kaenic:    { n: 'Каэник Рукерн',             img: 'kaenic-rookern',           cat: 'Защита', g: 2800, s: { mr: 65, hp: 350 } },
    steraks:   { n: 'Мощь Стерака',              img: 'steraks-gage',             cat: 'Защита', g: 3000, s: { hp: 400 },
                 act: { n: 'Щит Стерака', d: 'щит от бонус-HP', shield: 0.30, demo: true } },
    /* ——— Поддержка / прочее ——— */
    ardent:    { n: 'Пылкий целитель',           img: 'ardent-censer',            cat: 'Поддержка', g: 2700, s: { ap: 40, ah: 20, hsp: 12 } },
    redemption:{ n: 'Искупление',                img: 'redemption',               cat: 'Поддержка', g: 2500, s: { hp: 200, ah: 20, hsp: 10 } },
    protobelt: { n: 'Гиперзаряд',                img: 'protobelt-enchant',        cat: 'Поддержка', g: 2900, s: { ap: 60, hp: 250, ah: 15 } },
  };

  /* ── БОТИНКИ (6-й слот) ─────────────────────────────────────────────── */
  const BOOTS = {
    plated:  { n: 'Стальные набойки',    img: 'plated-steelcaps',         g: 1100, s: { armor: 20, ms: 40 } },
    merc:    { n: 'Ртутные ступни',      img: 'mercurys-treads',          g: 1100, s: { mr: 25, ms: 40, ten: 0.30 } },
    swift:   { n: 'Сапоги проворности',  img: 'boots-of-swiftness',       g: 1000, s: { ms: 55 } },
    ionian:  { n: 'Ионийские сапоги',    img: 'ionian-boots-of-lucidity', g: 1000, s: { ah: 20, ms: 40 } },
    sorc:    { n: 'Магнитный бластер',   img: 'magnetic-blaster',         g: 1100, s: { mrPenFlat: 12, ms: 40 } },
    glutton: { n: 'Прожорливые поножи',  img: 'gluttonous-greaves',       g: 1100, s: { ls: 8, sv: 8, ms: 40 } },
    /* Патч 7.2 — ботинки T3 (после 10:00), числа демо */
    plated3: { n: 'Стальные набойки III', img: 'plated-steelcaps',         g: 2000, t3: true, demo: true, s: { armor: 40, hp: 150, ms: 45 } },
    merc3:   { n: 'Ртутные ступни III',   img: 'mercurys-treads',          g: 2000, t3: true, demo: true, s: { mr: 45, hp: 150, ms: 45, ten: 0.30 } },
    sorc3:   { n: 'Магнитный бластер III',img: 'magnetic-blaster',         g: 2200, t3: true, demo: true, s: { mrPenFlat: 18, ap: 25, ms: 45 } },
    ionian3: { n: 'Ионийские сапоги III', img: 'ionian-boots-of-lucidity', g: 2100, t3: true, demo: true, s: { ah: 35, ms: 45 } },
  };

  /* ── ЗАЧАРОВАНИЯ (Патч 7.2: отдельный ACTIVE поверх ботинок) ────────── */
  const ENCHANTS = {
    stasis:      { n: 'Стазис',     img: 'stasis-enchant',      g: 800, act: { n: 'Стазис', d: 'неуязвимость 2.5с', cd: 120 }, demo: true, s: {} },
    gargoyle:    { n: 'Горгулья',   img: 'gargoyle-enchant',    g: 800, act: { n: 'Горгулья', d: 'щит по числу врагов', shield: 0.15, cd: 90 }, demo: true, s: { hp: 150 } },
    glorious:    { n: 'Славная',    img: 'glorious-enchant',    g: 600, act: { n: 'Рывок', d: 'рывок к союзнику + ускорение', ms: 60, cd: 120 }, demo: true, s: {} },
    quicksilver: { n: 'Ртутная',    img: 'quicksilver-enchant', g: 800, act: { n: 'Очищение', d: 'снять контроль', cd: 90 }, demo: true, s: {} },
    protobelt:   { n: 'Пробойник',  img: 'protobelt-enchant',   g: 900, act: { n: 'Залп', d: 'рывок + залп магии', cd: 40 }, demo: true, s: { ap: 15 } },
  };

  /* ── РУНЫ: 1 ГЛАВНАЯ (кейстоун) ─────────────────────────────────────────
     proc  — отдельный прок урона (считается движком как своё «попадание»)
     amp   — множитель ко всему урону
     stat  — статы
     Числа Электрокьюта (40% AP / 20% AD) — по спеке Эржана; остальные демо. */
  const KEYSTONES = {
    electrocute: { n: 'Электрокьют', img: 'electrocute', type: 'proc', note: 'после 3 ударов по чемпиону',
                   proc: { dt: 'magic', base: [30, 180], ap: 0.40, ad: 0.20 } },
    comet:       { n: 'Тайная комета', img: 'arcane-comet', type: 'proc', note: 'прок от умений', demo: true,
                   proc: { dt: 'magic', base: [30, 100], ap: 0.20, ad: 0.10 } },
    darkharvest: { n: 'Тёмная жатва', img: 'dark-harvest', type: 'proc', note: 'если цель <50% HP', demo: true,
                   cond: 'lowhp', proc: { dt: 'adaptive', base: [20, 60], ap: 0.15, ad: 0.25 } },
    firststrike: { n: 'Первый удар', img: 'first-strike', type: 'amp', note: '+8% ко всему урону', demo: true, amp: 0.08 },
    conqueror:   { n: 'Завоеватель', img: 'conqueror', type: 'stat', note: 'адаптивная сила за стаки', demo: true,
                   adaptive: { ad: 25, ap: 40 } },
    lethaltempo: { n: 'Смертельный темп', img: 'lethal-tempo', type: 'stat', note: 'разгон скор. атаки', demo: true, s: { as: 40 } },
    grasp:       { n: 'Хватка бессмертных', img: 'grasp-of-the-undying', type: 'proc', note: 'усиленная автоатака', demo: true,
                   proc: { dt: 'magic', base: [20, 60], ohp: 0.035 } },
  };

  /* ── РУНЫ ВЕТКИ: 3 слота × 3 варианта (реальные руны WR, статы демо) ─── */
  const BRANCH = [
    [ { k: 'brutal',       n: 'Жестокость',        img: 'brutal',        s: { ad: 9, arPenFlat: 5 }, demo: true },
      { k: 'giantslayer',  n: 'Убийца гигантов',   img: 'giant-slayer',  s: {}, amp: 0.05, note: '+урон по живучим', demo: true },
      { k: 'gathering',    n: 'Накопление бури',   img: 'gathering-storm', s: { ap: 20 }, demo: true } ],
    [ { k: 'axiom',        n: 'Аксиома чародея',   img: 'axiom-arcanist', s: { ap: 14 }, demo: true },
      { k: 'sudden',       n: 'Внезапный удар',    img: 'sudden-impact', s: { arPenFlat: 7, mrPenFlat: 7 }, demo: true },
      { k: 'cheapshot',    n: 'Дешёвый выстрел',   img: 'cheap-shot',    s: {}, demo: true, note: 'чистый урон по контролю' } ],
    [ { k: 'boneplating',  n: 'Костяная пластина', img: 'bone-plating',  s: { hp: 55, armor: 5 }, demo: true },
      { k: 'secondwind',   n: 'Второе дыхание',    img: 'second-wind',   s: { hp: 45 }, demo: true },
      { k: 'laststand',    n: 'Последний шанс',    img: 'last-stand',    s: { ad: 7 }, amp: 0.04, demo: true } ],
  ];

  /* ── РУНА-СОЛО (5-й слот: одиночная руна вне ветки) ─────────────────── */
  const SOLO = [
    { k: 'hunterVampirism', n: 'Охотник — вампиризм', img: 'hunter-vampirism', s: { ls: 6, omni: 3 }, demo: true },
    { k: 'hunterTitan',     n: 'Охотник — титан',     img: 'hunter-titan',     s: { hp: 120, ten: 0.10 }, demo: true },
    { k: 'hunterGenius',    n: 'Охотник — гений',     img: 'hunter-genius',    s: { ah: 15 }, demo: true },
    { k: 'pathfinder',      n: 'Следопыт',            img: 'pathfinder',       s: { ms: 20 }, demo: true },
  ];

  /* ── ПРЕСЕТЫ МАНЕКЕНА (типовая цель на уровне; база — реальные средние
        значения чемпов WR соответствующего класса, помечены как ориентир) ─ */
  const DUMMY = {
    squishy: { n: 'Сквиши', ic: '🎯', hp: 2100, armor: 75,  mr: 55,  lvl: 11, demo: true },
    fighter: { n: 'Боец',   ic: '⚔',  hp: 3000, armor: 120, mr: 80,  lvl: 11, demo: true },
    tank:    { n: 'Танк',   ic: '🛡', hp: 4200, armor: 190, mr: 130, lvl: 11, demo: true },
  };

  /* ── Свод статов сборки: предметы + ботинки + зачарование + руны ─────── */
  const PCT_KEYS = { arPenPct: 1, mrPenPct: 1 };            /* % пробития перемножаются (§2) */
  function sumStats(list) {
    const a = { arPenPct: 0, mrPenPct: 0, amps: [], onhit: [], ten: 0, demo: false };
    let arF = 1, mrF = 1, tenF = 1;
    (list || []).forEach(src => {
      if (!src) return;
      const s = src.s || {};
      for (const k in s) {
        if (k === 'arPenPct') { arF *= (1 - s[k]); continue; }
        if (k === 'mrPenPct') { mrF *= (1 - s[k]); continue; }
        if (k === 'ten') { tenF *= (1 - s[k]); continue; }        /* §4 стойкость мультипликативна */
        a[k] = (a[k] || 0) + s[k];
      }
      if (src.onhit) a.onhit.push(Object.assign({ key: src.key || src.img, icon: src.img, name: src.onhit.n }, src.onhit));
      if (src.amp) a.amps.push({ label: src.amp.label || src.n, v: src.amp.v != null ? src.amp.v : src.amp });
      if (src.demo || (src.onhit && src.onhit.demo) || (src.amp && src.amp.demo)) a.demo = true;
    });
    a.arPenPct = 1 - arF; a.mrPenPct = 1 - mrF; a.ten = 1 - tenF;
    return a;
  }

  root.CALC_DATA = { ITEMS, BOOTS, ENCHANTS, KEYSTONES, BRANCH, SOLO, DUMMY, sumStats, IMG_ITEM, IMG_RUNE, PCT_KEYS };
})(typeof window !== 'undefined' ? window : globalThis);
