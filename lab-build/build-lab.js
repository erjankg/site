/* ============================================================
   lab-build — билд-симулятор «Сборка» (Я ↔ Цель).
   Формулы урона/резистов ПЕРЕИСПОЛЬЗОВАНЫ из calc-app (statAt/abilLerp/mitFromEff).
   Базовые статы чемпов — из calc-app/champ-base.js (window.WR_BASE_STATS).
   ВСЕ ЧИСЛА УРОНА/ПАССИВОК = ДЕМО (помечено в UI). Чистый JS.
   ============================================================ */
(function () {
'use strict';

var DD_VER = '14.24.1';
var BASE = (window.WR_BASE_STATS || []).slice().sort(function (a, b) { return a.n < b.n ? -1 : 1; });
function champIcon(dd) { return 'https://ddragon.leagueoflegends.com/cdn/' + DD_VER + '/img/champion/' + dd + '.png'; }
function itemImg(slug) { return 'https://www.wildriftfire.com/images/items/' + slug + '.png'; }
function runeImg(slug) { return 'https://www.wildriftfire.com/images/runes/' + slug + '.png'; }
function splashUrl(dd) { return 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/' + dd + '_0.jpg'; }

/* ---------- формулы (порт из calc-app) ---------- */
function statAt(b, g, lvl) { return Math.round(b + (lvl - 1) * g); }
function abilLerp(lo, hi, lvl) { return lo + (hi - lo) * (lvl - 1) / 14; }
function mitFromEff(eff) { return eff >= 0 ? 100 / (100 + eff) : 2 - 100 / (100 - eff); }
function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

/* ---------- тип урона чемпа (демо-эвристика) ---------- */
var AP_SET = {'Ahri':1,'Akali':1,'Au. Sol':1,'Aurora':1,'Brand':1,'Diana':1,'Ekko':1,'Evelynn':1,'Fiddle':1,'Fizz':1,'Galio':1,'Gragas':1,'Gwen':1,'Heimer':1,'Karma':1,'Kassadin':1,'Katarina':1,'Kayle':1,'Kennen':1,'Lillia':1,'Lissandra':1,'Lux':1,'Mel':1,'Milio':1,'Morde':1,'Morgana':1,'Nami':1,'Norra':1,'Orianna':1,'Rumble':1,'Ryze':1,'Seraph':1,'Singed':1,'Sona':1,'Soraka':1,'Swain':1,'Syndra':1,'Taliyah':1,'Teemo':1,'Tw. Fate':1,'Veigar':1,'Velkoz':1,'Vex':1,'Viktor':1,'Vladimir':1,'Yuumi':1,'Ziggs':1,'Zilean':1,'Zoe':1,'Zyra':1,'Lulu':1,'Janna':1,'Annie':1};
function dmgType(name) { return AP_SET[name] ? 'ap' : 'ad'; }

/* ---------- демо-кит способностей (общий по типу урона) ---------- */
var KIT = {
  ad: { Q: {dt:'phys', lo:40, hi:175, r:0.55}, W: {dt:'phys', lo:25, hi:115, r:0.35}, E: {dt:'phys', lo:20, hi:95, r:0.30}, R: {dt:'phys', lo:100, hi:360, r:1.0} },
  ap: { Q: {dt:'magic', lo:55, hi:215, r:0.55}, W: {dt:'magic', lo:40, hi:150, r:0.45}, E: {dt:'magic', lo:30, hi:125, r:0.35}, R: {dt:'magic', lo:120, hi:430, r:0.80} }
};

/* ---------- каталог снаряги (демо WR-статы + спец-механики условий) ----------
   sp = ключ спец-обработки в compute. stackType: time (минута) / count (стаки). */
var GEAR = {
  // AD / крит / пробивание
  ie:        {name:'Грань Бесконечности', slug:'infinity-edge', cat:'AD', cost:3400, ad:65, crit:20, sp:'ie', note:'крит-урон растёт при крите >100%'},
  collector: {name:'Коллекционер', slug:'the-collector', cat:'AD', cost:3000, ad:50, crit:20, arPenFlat:12},
  bt:        {name:'Жажда крови', slug:'bloodthirster', cat:'AD', cost:3200, ad:55, ls:18},
  botrk:     {name:'Клинок Погибшего Короля', slug:'blade-of-the-ruined-king', cat:'AD', cost:3000, ad:30, as:25, ls:8, sp:'botrk', note:'on-hit 8% ТЕК. HP цели'},
  bc:        {name:'Чёрный разделитель', slug:'black-cleaver', cat:'AD', cost:3000, ad:40, hp:300, arPenPct:24, sp:'cleaver', stackType:'count', maxStack:5, note:'−6% брони цели/стак (до −30%)'},
  youmuu:    {name:'Призрачный клинок Йоумуу', slug:'youmuus-ghostblade', cat:'AD', cost:3000, ad:55, arPenFlat:18, ms:20, sp:'youmuu', stackType:'count', maxStack:100, note:'Momentum: +MS, на макс +25% AS'},
  eclipse:   {name:'Затмение', slug:'eclipse', cat:'AD', cost:3000, ad:60, ls:8, sp:'eclipse', note:'2 попадания/1.8с → 7% макс. HP физ.'},
  divine:    {name:'Божественный разделитель', slug:'divine-sunderer', cat:'AD', cost:3300, ad:40, hp:300, ah:20, sp:'divine', note:'после скилла атака: 10% макс. HP физ.'},
  stormrazor:{name:'Стормрейзор', slug:'stormrazor', cat:'AD', cost:3100, ad:45, crit:20, as:15, sp:'storm', note:'Energized: маг.всплеск + слоу на макс'},
  muramana:  {name:'Мурамана', slug:'muramana', cat:'AD', cost:2900, ad:35, sp:'muramana', stackType:'time', maxStack:1, fullMin:10, mana:860, note:'растит ману, урон от маны'},
  guinsoo:   {name:'Ярость Гинсу', slug:'guinsoos-rageblade', cat:'AD', cost:3000, ap:30, as:25, sp:'guinsoo', stackType:'count', maxStack:4, note:'+8% AS/стак; на макс двойной on-hit'},
  wits:      {name:'Конец мудрости', slug:'wits-end', cat:'AD', cost:2800, as:40, mr:40, sp:'wits', note:'on-hit +45 маг.'},
  nashor:    {name:'Зуб Нашора', slug:'nashors-tooth', cat:'AP', cost:3000, ap:85, as:50, ah:15, sp:'nashor', note:'on-hit 15 + 20% AP маг.'},
  // AP
  luden:     {name:'Эхо Людена', slug:'ludens-echo', cat:'AP', cost:3200, ap:100, ah:20},
  liandry:   {name:'Мучения Лиандри', slug:'liandrys-torment', cat:'AP', cost:3000, ap:95, hp:300, sp:'liandry', note:'скиллы жгут 2% макс. HP/сек, 3с'},
  iorb:      {name:'Сфера бесконечности', slug:'infinity-orb', cat:'AP', cost:2900, ap:110, hp:200, sp:'iorb', note:'крит скилла +20% по цели <35% HP'},
  rylai:     {name:'Скипетр Рилай', slug:'rylais-crystal-scepter', cat:'AP', cost:2900, ap:75, hp:400},
  seraphs:   {name:'Обручение Серафима', slug:'archangels-staff', cat:'AP', cost:3000, ap:70, ah:20, sp:'seraphs', stackType:'time', maxStack:1, fullMin:10, mana:860, note:'<35% HP → щит за 20% маны'},
  mejai:     {name:'Душехват Меджая', slug:'mejais-soulstealer', cat:'AP', cost:1600, ap:20, sp:'mejai', stackType:'count', maxStack:30, note:'+AP/стак за киллы (до 30), MS'},
  roa:       {name:'Посох веков', slug:'rod-of-ages', cat:'AP', cost:2800, ap:60, hp:400, mana:400, sp:'roa', stackType:'time', maxStack:10, fullMin:6, note:'+HP/mana/AP каждые 35с (до 10)'},
  // защита / выживание
  steraks:   {name:'Мощь Стерака', slug:'steraks-gage', cat:'Защита', cost:3000, ad:45, hp:400, sp:'steraks', note:'урон <35% HP → щит 75% доп.HP'},
  fimbul:    {name:'Фимбулвинтер', slug:'fimbulwinter', cat:'Защита', cost:2700, hp:350, armor:0, mana:500, sp:'fimbul', stackType:'time', maxStack:3, fullMin:8, note:'заряды маны каждые 4с (до +700)'},
  sunfire:   {name:'Эгида Солнечного огня', slug:'sunfire-aegis', cat:'Защита', cost:2700, armor:50, hp:400, sp:'sunfire', stackType:'count', maxStack:6, note:'аура: базовое + 0.8% доп.HP/сек, Immolate до +30%'}
};
var GEAR_ORDER = Object.keys(GEAR);
var CAT_COLOR = {'AD':'#e8820a','AP':'#8b5cf6','Защита':'#4ade80'};

var BOOTS = {
  plated:{name:'Стальные набойки', slug:'plated-steelcaps', cost:1100, armor:20},
  merc:{name:'Ртутные ступни', slug:'mercurys-treads', cost:1100, mr:25},
  swift:{name:'Сапоги проворности', slug:'boots-of-swiftness', cost:1000, ms:45},
  ionian:{name:'Ионийские сапоги', slug:'ionian-boots-of-lucidity', cost:1000, ah:20},
  sorc:{name:'Магнитный бластер', slug:'magnetic-blaster', cost:1100, mrPenFlat:12}
};
var RUNES = {
  electrocute:{name:'Электрокьют', slug:'electrocute', dt:'magic', lo:30, hi:180, adR:.2, apR:.15, cond:null, note:'после 3 ударов'},
  comet:{name:'Тайная комета', slug:'arcane-comet', dt:'magic', lo:30, hi:100, adR:.1, apR:.2, note:'прок от умений'},
  darkharvest:{name:'Тёмная жатва', slug:'dark-harvest', dt:'adaptive', lo:20, hi:60, adR:.25, apR:.15, cond:'below50', note:'цель <50% HP'},
  conqueror:{name:'Завоеватель', slug:'conqueror', dt:'stat', note:'+адаптивная сила'},
  none:{name:'Без руны', slug:'', dt:'none'}
};
var RUNE_ORDER = ['electrocute','comet','darkharvest','conqueror','none'];
/* заклинания — иконки с DDragon (у wildriftfire их нет: 404) */
var SPELLS = {
  flash:{name:'Скачок', dd:'SummonerFlash'}, ignite:{name:'Поджиг', dd:'SummonerDot'},
  heal:{name:'Исцеление', dd:'SummonerHeal'}, exhaust:{name:'Изнурение', dd:'SummonerExhaust'},
  smite:{name:'Кара', dd:'SummonerSmite'}, ghost:{name:'Дух', dd:'SummonerHaste'}
};
var SPELL_ORDER = Object.keys(SPELLS);
function spellImg(dd) { return 'https://ddragon.leagueoflegends.com/cdn/' + DD_VER + '/img/spell/' + dd + '.png'; }

/* золотая ценность статов (демо, gold за 1 ед.) */
var GVAL = { hp:3.33, mana:3.5, ad:41.67, ap:20, armor:25, mr:25, as:33.33, crit:50, ah:30, ms:16 };

/* пресеты цели (демо: суммарные статы к лейту) */
var PRESETS = {
  squishy:{ic:'🎯', n:'Сквиши', hp:1900, armor:60, mr:45},
  bruiser:{ic:'🛡', n:'Бруизер', hp:3200, armor:120, mr:75},
  tank:{ic:'🗿', n:'Танк', hp:4300, armor:210, mr:150}
};

/* ============================================================
   СОСТОЯНИЕ
   ============================================================ */
var V = { layout:'side', pick:'grid', tgt:'preset', res:'tabs', spike:'bars', density:'normal' };
var S = {
  mode:'loadout', slot:0,
  champ:'Gnar', lvl:11,
  items:[null,null,null,null,null,null], boots:null, rune:'electrocute', spell:'flash', spell2:'ignite',
  tgtPreset:'bruiser', tgtHp:3200, tgtArmor:120, tgtMr:75,
  minute:15, stacks:0, maxStacks:false, tgtHpCurPct:100, below35:false, combatSec:3,
  resTab:'stats', dmgMode:'burst'
};

/* ── ЛОАДАУТЫ: 3 слота = снимки состояния «Я». Симулятор считает АКТИВНЫЙ слот,
   поэтому режимы связаны: собрал в «Сборке» → считается в «Симуляторе». ── */
function snapLD() {
  return { champ:S.champ, lvl:S.lvl, items:S.items.slice(), boots:S.boots,
    rune:S.rune, spell:S.spell, spell2:S.spell2 };
}
function loadLD(o) {
  S.champ=o.champ; S.lvl=o.lvl; S.items=o.items.slice(); S.boots=o.boots;
  S.rune=o.rune; S.spell=o.spell; S.spell2=o.spell2;
}
/* 3 демо-пресета, чтобы переключение сразу показывало разницу */
var LOADOUTS = [
  { champ:'Gnar', lvl:11, items:['bc','steraks','sunfire',null,null,null], boots:'plated',
    rune:'conqueror', spell:'flash', spell2:'ignite' },
  { champ:'Lux', lvl:13, items:['luden','liandry','iorb',null,null,null], boots:'sorc',
    rune:'electrocute', spell:'flash', spell2:'ignite' },
  { champ:'Vayne', lvl:15, items:['botrk','guinsoo','wits',null,null,null], boots:'merc',
    rune:'conqueror', spell:'flash', spell2:'heal' }
];
var LD_NAME = ['Танк-бруизер', 'Бурст-маг', 'Он-хит АДК'];
function switchSlot(i) {
  LOADOUTS[S.slot] = snapLD();   // сохранили текущий
  S.slot = i; loadLD(LOADOUTS[i]);
}
var pickState = null; // {type, slot}
var PAD = { air:'22px', normal:'16px', dense:'10px' };
var SPLASH = 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Gnar_0.jpg';

function champObj() { return BASE.find(function (c) { return c.n === S.champ; }) || BASE[0]; }

/* ============================================================
   СТАК-МЕХАНИКА (условия → эффективные стаки предмета)
   ============================================================ */
function stacksOf(g) {
  if (!g.stackType) return 0;
  var mx = g.maxStack || 1;
  if (S.maxStacks) return mx;
  if (g.stackType === 'time') return Math.round(clamp(S.minute / (g.fullMin || 10), 0, 1) * mx);
  return clamp(S.stacks, 0, mx); // count
}

/* ============================================================
   АГРЕГАЦИЯ СТАТОВ «Я» (база+уровень + предметы + стаки + руна)
   ============================================================ */
function aggregate() {
  var c = champObj(), type = dmgType(c.n);
  var a = { ad: statAt(c.adb, c.adg, S.lvl), ap:0, hp: statAt(c.hb, c.hg, S.lvl), mana:400,
    armor: statAt(c.arb, c.arg, S.lvl), mr: statAt(c.mrb, c.mrg, S.lvl),
    crit:0, as:0, ah:0, ms:0, ls:0, arPenFrac:1, arPenFlat:0, mrPenFrac:1, mrPenFlat:0,
    onhit:[], itemAD:0, itemAP:0, notes:[] };
  var manaItem = 0;

  S.items.forEach(function (k) {
    if (!k) return; var g = GEAR[k]; if (!g) return;
    a.ad += g.ad||0; a.itemAD += g.ad||0; a.ap += g.ap||0; a.itemAP += g.ap||0;
    a.hp += g.hp||0; a.armor += g.armor||0; a.mr += g.mr||0; a.crit += g.crit||0;
    a.as += g.as||0; a.ah += g.ah||0; a.ms += g.ms||0; a.ls += g.ls||0;
    manaItem += g.mana||0;
    if (g.arPenPct) a.arPenFrac *= (1 - g.arPenPct/100);
    a.arPenFlat += g.arPenFlat||0;
    if (g.mrPenPct) a.mrPenFrac *= (1 - g.mrPenPct/100);
    a.mrPenFlat += g.mrPenFlat||0;

    // спец-механики от условий
    var st = stacksOf(g);
    if (g.sp === 'roa') { a.hp += st*15; a.mana += st*30; a.ap += st*4; a.itemAP += st*4; }
    if (g.sp === 'mejai') { a.ap += st*4; a.itemAP += st*4; a.ms += st? 5:0; }
    if (g.sp === 'guinsoo') { a.as += st*8; if (st>=g.maxStack) a.onhit.push({label:'Гинсу (двойной)', dt:'magic', flat:15}); }
    if (g.sp === 'youmuu') { a.ms += Math.round(st*0.5); if (st>=g.maxStack) a.as += 25; }
    if (g.sp === 'muramana') { var mm = manaItem + a.mana; a.onhit.push({label:'Мурамана', dt:'phys', flat: Math.round(0.03*mm)}); }
    if (g.sp === 'storm' && (S.maxStacks || S.combatSec>=2)) a.onhit.push({label:'Стормрейзор', dt:'magic', flat:70});
    if (g.sp === 'nashor') a.onhit.push({label:'Зуб Нашора', dt:'magic', flat:15, apR:.2});
    if (g.sp === 'wits') a.onhit.push({label:'Конец мудрости', dt:'magic', flat:45});
    if (g.sp === 'botrk') a.onhit.push({label:'BORK', dt:'phys', pctCurHp:.08});
  });
  a.mana += manaItem;

  // руна-стат (Завоеватель)
  if (S.rune === 'conqueror') { if (type==='ap') { a.ap += 40; a.itemAP += 0; } else { a.ad += 25; } }

  a.crit = clamp(a.crit, 0, 100 + (S.items.indexOf('ie')>=0 ? 60 : 0));
  a.type = type;
  return a;
}

/* золото-эффективность: только статы ПРЕДМЕТОВ (не база, не стаки, не руны) */
function goldEff() {
  var val = 0, cost = 0, hasPassive = false;
  S.items.forEach(function (k) {
    if (!k) return; var g = GEAR[k]; cost += g.cost||0;
    val += (g.ad||0)*GVAL.ad + (g.ap||0)*GVAL.ap + (g.hp||0)*GVAL.hp + (g.mana||0)*GVAL.mana +
      (g.armor||0)*GVAL.armor + (g.mr||0)*GVAL.mr + (g.as||0)*GVAL.as + (g.crit||0)*GVAL.crit +
      (g.ah||0)*GVAL.ah + (g.ms||0)*GVAL.ms;
    if (g.sp || g.note) hasPassive = true;
  });
  var b = BOOTS[S.boots]; if (b) { cost += b.cost;
    val += (b.armor||0)*GVAL.armor + (b.mr||0)*GVAL.mr + (b.ms||0)*GVAL.ms + (b.ah||0)*GVAL.ah; }
  return { val: Math.round(val), cost: cost, pct: cost? Math.round(val/cost*100):0, hasPassive: hasPassive };
}

/* ============================================================
   ЦЕЛЬ (пресет или ползунки) + шред брони от Чёрного разделителя
   ============================================================ */
function targetStats(a) {
  var hp, armor, mr;
  if (V.tgt === 'preset') { var p = PRESETS[S.tgtPreset]; hp = p.hp; armor = p.armor; mr = p.mr; }
  else { hp = S.tgtHp; armor = S.tgtArmor; mr = S.tgtMr; }
  var shred = 0;
  if (S.items.indexOf('bc') >= 0) shred = stacksOf(GEAR.bc) * 0.06;
  var armorShred = armor * (1 - shred);
  var curHp = S.below35 ? Math.min(hp*0.34, hp*S.tgtHpCurPct/100) : hp*S.tgtHpCurPct/100;
  return { hp: hp, armor: armorShred, armorRaw: armor, mr: mr, curHp: curHp, shred: shred };
}

/* эффективная защита после пробивания */
function effRes(dt, D, a) {
  if (dt === 'phys') { var e = D.armor>0 ? D.armor*a.arPenFrac : D.armor; return e - a.arPenFlat; }
  if (dt === 'magic') { var m = D.mr>0 ? D.mr*a.mrPenFrac : D.mr; return m - a.mrPenFlat; }
  return -1e9; // true → без митигации (mitFromEff огромн.)
}
function mit(dt, raw, D, a) {
  if (dt === 'true') return raw;
  return raw * mitFromEff(effRes(dt, D, a));
}

/* ============================================================
   УРОН ПО ЦЕЛИ (разбивка по источникам) — burst / sustained
   ============================================================ */
function critInfo(a) {
  var critDmg = 1.75;
  if (S.items.indexOf('ie') >= 0) { critDmg += 0.35; var over = a.crit - 100; if (over>0) critDmg += over*0.006; }
  var chance = clamp(a.crit, 0, 100);
  return { mult: 1 + (chance/100)*(critDmg-1), chance: chance, critDmg: critDmg };
}

function computeDamage(a, D) {
  var kit = KIT[a.type], sources = [];
  var burst = S.dmgMode === 'burst';
  var secs = S.combatSec;

  // способности Q/W/E/R (по одному касту; в sustained ×кол-во ротаций ≈1)
  ['Q','W','E','R'].forEach(function (key) {
    var ab = kit[key];
    var raw = abilLerp(ab.lo, ab.hi, S.lvl) + ab.r * (a.type==='ap' ? a.ap : a.ad);
    sources.push({ label: 'Умение ' + key, dt: ab.dt, raw: raw, count: 1 });
  });

  // авто-атаки
  var ci = critInfo(a);
  var autoRaw = a.ad * ci.mult;
  var asTotal = 0.72 * (1 + a.as/100); // демо базовая AS
  var autoCount = burst ? 2 : Math.max(1, Math.round(asTotal * secs));
  sources.push({ label: 'Автоатаки', dt:'phys', raw: autoRaw, count: autoCount, sub: autoCount+'×' });

  // on-hit (на каждую автоатаку)
  a.onhit.forEach(function (oh) {
    var raw = (oh.flat||0) + (oh.apR? oh.apR*a.ap:0) + (oh.pctCurHp? oh.pctCurHp*D.curHp:0);
    sources.push({ label: oh.label + ' (on-hit)', dt: oh.dt, raw: raw, count: autoCount });
  });

  // руна-прок
  var r = RUNES[S.rune];
  if (r && (r.dt==='magic' || r.dt==='adaptive')) {
    if (!(r.cond==='below50' && !(S.below35 || S.tgtHpCurPct<50))) {
      var dt = r.dt==='adaptive' ? (a.type==='ap'?'magic':'phys') : r.dt;
      var raw = abilLerp(r.lo, r.hi, S.lvl) + r.adR*a.ad + r.apR*a.ap;
      sources.push({ label: 'Руна: '+r.name, dt: dt, raw: raw, count: 1 });
    }
  }

  // %HP / burn спец-предметы
  var has = function (k) { return S.items.indexOf(k)>=0; };
  if (has('liandry')) { var t=Math.min(secs,3); sources.push({label:'Лиандри (жжёт)', dt:'magic', raw: D.hp*0.02*t, count:1, sub:t+'с'}); }
  if (has('sunfire')) { var t2=burst?2:secs; var st=stacksOf(GEAR.sunfire); var per=20 + a.hp*0.008; per*=(1+Math.min(st,6)*0.05); sources.push({label:'Эгида (аура)', dt:'magic', raw: per*t2, count:1, sub:t2+'с'}); }
  if (has('eclipse')) sources.push({label:'Затмение %HP', dt:'phys', raw: D.hp*0.07, count:1});
  if (has('divine'))  sources.push({label:'Божеств. %HP', dt:'phys', raw: D.hp*0.10, count: burst?1:Math.max(1,Math.round(secs/3))});
  if (has('iorb') && (S.below35 || S.tgtHpCurPct<35)) sources.push({label:'Сфера (крит скилла)', dt:'magic', raw: (abilLerp(kit.Q.lo,kit.Q.hi,S.lvl)+kit.Q.r*a.ap)*0.20, count:1});

  // митигация + сумма
  var total = 0;
  sources.forEach(function (s) { s.mit = mit(s.dt, s.raw, D, a) * s.count; total += s.mit; });
  sources.sort(function (x,y){ return y.mit - x.mit; });

  var dps = secs>0 ? total/secs : total;
  return { sources: sources, total: total, dps: dps, crit: ci };
}

/* спайки: урон одного «burst»-комбо по текущей цели на каждом уровне / после каждого предмета */
function spikeSeries() {
  var savedLvl = S.lvl, savedMode = S.dmgMode; S.dmgMode = 'burst';
  var byLvl = [];
  for (var L=1; L<=15; L++) { S.lvl = L; var a=aggregate(); var D=targetStats(a); byLvl.push({ lvl:L, dmg: Math.round(computeDamage(a,D).total) }); }
  S.lvl = savedLvl;
  // по предметам: накопительно добавляем занятые слоты
  var filled = S.items.filter(Boolean);
  var byItem = [{ label:'0', key:null, dmg: 0 }];
  var savedItems = S.items.slice();
  var acc = [];
  filled.forEach(function (k) {
    acc.push(k);
    S.items = acc.concat(new Array(6-acc.length).fill(null));
    var a=aggregate(), D=targetStats(a);
    byItem.push({ label:'+', key:k, dmg: Math.round(computeDamage(a,D).total) });
  });
  S.items = savedItems; S.dmgMode = savedMode;
  byItem[0].dmg = byItem.length>1 ? Math.round(byItem[1].dmg*0.35) : 0; // база до предметов (демо-точка)
  return { byLvl: byLvl, byItem: byItem };
}

/* ============================================================
   РЕНДЕР: применение токенов вариантов
   ============================================================ */
function applyVars() {
  var r = document.documentElement.style;
  r.setProperty('--pad', PAD[V.density]);
  document.getElementById('splash').style.backgroundImage = 'url(' + SPLASH + ')';
  document.getElementById('board').className = 'board lay-' + V.layout;
}

/* ---------- слой условий ---------- */
function condHTML() {
  return '<div class="cond-t"><span class="dot"></span>Условия боя <span class="demo">влияют на %HP и стак-предметы</span></div>' +
    cg('Минута игры', 'minute', 0, 40, 1, S.minute) +
    cg('Стаки (килл/бой)', 'stacks', 0, 30, 1, S.stacks) +
    '<div class="cg"><label>Макс. стаки</label>' + toggle('maxStacks', S.maxStacks) + '</div>' +
    cg('Тек. HP цели, %', 'tgtHpCurPct', 5, 100, 5, S.tgtHpCurPct) +
    '<div class="cg"><label>Цель ниже 35%?</label>' + toggle('below35', S.below35) + '</div>' +
    cg('В бою, сек', 'combatSec', 1, 10, 1, S.combatSec);
}
function cg(label, key, min, max, step, val) {
  var unit = key==='tgtHpCurPct' ? '%' : key==='combatSec' ? 'с' : key==='minute' ? ' мин' : '';
  return '<div class="cg"><label>'+label+' <b id="v-'+key+'">'+val+unit+'</b></label>' +
    '<input type="range" data-cond="'+key+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+val+'"></div>';
}
function toggle(key, on) {
  return '<label class="tgl"><input type="checkbox" data-toggle="'+key+'"'+(on?' checked':'')+'><span class="box"></span></label>';
}

/* ============================================================
   РЕЖИМ 1 — СБОРКА / LOADOUTS (игровой экран)
   ============================================================ */
function ldSlotHTML(k, i, big) {
  if (k) { var g = GEAR[k];
    return '<div class="slot filled' + (big ? ' big' : '') + '" data-slot="' + i + '">' +
      '<img src="' + itemImg(g.slug) + '" alt="' + g.name + '" title="' + g.name + '">' +
      '<span class="gold-pip">' + g.cost + '</span>' +
      '<button class="rm" data-rm="' + i + '" title="Убрать">✕</button></div>';
  }
  return '<div class="slot' + (big ? ' big' : '') + '" data-slot="' + i + '"><span class="plus">＋</span></div>';
}
function loadoutHTML() {
  var c = champObj(), a = aggregate();
  var gold = S.items.reduce(function (s, k) { return s + (k ? GEAR[k].cost : 0); }, 0) + (S.boots ? BOOTS[S.boots].cost : 0);

  var tabs = [0,1,2].map(function (i) {
    return '<button class="ld-tab' + (S.slot === i ? ' on' : '') + '" data-ldslot="' + i + '">' +
      '<b>Слот ' + (i + 1) + '</b><span>' + LD_NAME[i] + '</span></button>';
  }).join('');

  /* модель чемпа — сплэш-арт, как в игровом LOADOUTS */
  var model = '<div class="ld-model">' +
    '<div class="ld-splash" style="background-image:url(' + splashUrl(c.dd) + ')"></div>' +
    '<div class="ld-model-body">' +
      '<button class="ld-champ" data-pick="champ"><img src="' + champIcon(c.dd) + '" alt="">' +
        '<span><b>' + c.n + '</b><i>' + (dmgType(c.n) === 'ap' ? 'маг. урон' : 'физ. урон') + ' · сменить</i></span></button>' +
      '<div class="ld-lvl"><label>Уровень <b>' + S.lvl + '</b></label>' +
        '<input type="range" data-lvl min="1" max="15" step="1" value="' + S.lvl + '"></div>' +
      '<div class="ld-stats">' +
        ldStat('AD', Math.round(a.ad)) + ldStat('AP', Math.round(a.ap)) +
        ldStat('HP', Math.round(a.hp)) + ldStat('Броня', Math.round(a.armor)) +
      '</div></div></div>';

  var itemsRow = '<div class="ld-row"><div class="ld-row-h">Предметы <span class="ld-gold">' + gold.toLocaleString('ru') + ' зол</span></div>' +
    '<div class="ld-slots">' + S.items.map(function (k, i) { return ldSlotHTML(k, i, true); }).join('') +
    '<div class="ld-boots" data-pick="boots" title="Ботинки">' +
      (S.boots ? '<img src="' + itemImg(BOOTS[S.boots].slug) + '" alt="">' : '<span class="plus">👟</span>') +
    '</div></div></div>';

  var r = RUNES[S.rune];
  var runesRow = '<div class="ld-row"><div class="ld-row-h">Руны</div><div class="ld-mini">' +
    '<button class="ld-chip" data-pick="rune">' +
      (r.slug ? '<img src="' + runeImg(r.slug) + '" alt="">' : '<span class="plus">⛌</span>') +
      '<span>' + r.name + '</span></button>' +
    '<span class="note">кейстоун · полное дерево рун — в lab-item-card</span></div></div>';

  var spellsRow = '<div class="ld-row"><div class="ld-row-h">Заклинания</div><div class="ld-mini">' +
    '<button class="ld-chip" data-pick="spell"><img src="' + spellImg(SPELLS[S.spell].dd) + '" alt="">' +
      '<span>' + SPELLS[S.spell].name + '</span></button>' +
    '<button class="ld-chip" data-pick="spell2"><img src="' + spellImg(SPELLS[S.spell2].dd) + '" alt="">' +
      '<span>' + SPELLS[S.spell2].name + '</span></button></div></div>';

  return '<div class="ld-tabs">' + tabs + '<span class="note ld-hint">Слот = быстрый пресет. Симулятор считает АКТИВНЫЙ слот.</span></div>' +
    '<div class="ld-grid">' + model +
      '<div class="ld-rows">' + itemsRow + runesRow + spellsRow +
        '<div class="actions"><button class="act-btn accent" data-act="tosim">📊 Посчитать в симуляторе</button>' +
        '<button class="act-btn" data-act="share">📤 Поделиться сборкой</button>' +
        '<button class="act-btn" data-act="reset">↺ Очистить слот</button></div>' +
      '</div></div>';
}
function ldStat(l, v) { return '<div class="ld-st"><span>' + l + '</span><b>' + v + '</b></div>'; }

/* ============================================================
   ОПТИМИЗАТОР «что купить следующим» (одобрено владельцем)
   Перебор всех предметов в свободный слот → прирост урона за золото.
   ============================================================ */
function optimize() {
  var free = S.items.indexOf(null);
  if (free < 0) return null;
  var saved = S.items.slice(), savedMode = S.dmgMode;
  S.dmgMode = 'burst';
  var a0 = aggregate(), D0 = targetStats(a0), base = computeDamage(a0, D0).total;

  var list = [];
  Object.keys(GEAR).forEach(function (k) {
    if (saved.indexOf(k) >= 0) return;
    S.items = saved.slice(); S.items[free] = k;
    var a = aggregate(), D = targetStats(a), t = computeDamage(a, D).total;
    var d = t - base, cost = GEAR[k].cost || 3000;
    list.push({ k:k, delta:d, cost:cost, per1000: d / cost * 1000 });
  });
  S.items = saved; S.dmgMode = savedMode;
  list.sort(function (x, y) { return y.per1000 - x.per1000; });
  return { base: base, byGold: list.slice(0, 3), byRaw: list.slice().sort(function (x, y) { return y.delta - x.delta; }).slice(0, 3), free: free };
}
/* урон за 1000 золота у ТЕКУЩЕЙ сборки по ЭТОЙ цели */
function dmgPerGold(dmg) {
  var gold = S.items.reduce(function (s, k) { return s + (k ? GEAR[k].cost : 0); }, 0) + (S.boots ? BOOTS[S.boots].cost : 0);
  if (!gold) return null;
  return { gold: gold, per1000: Math.round(dmg.total / gold * 1000) };
}

/* ---------- сторона «Я» ---------- */
function sideMeHTML(a) {
  var c = champObj();
  var slotsCls = V.pick==='list' ? 'slots two-row' : 'slots';
  var slots = S.items.map(function (k, i) {
    if (k) { var g=GEAR[k];
      return '<div class="slot filled" data-slot="'+i+'"><img src="'+itemImg(g.slug)+'" alt="'+g.name+'" title="'+g.name+'">' +
        '<span class="gold-pip">'+g.cost+'</span><button class="rm" data-rm="'+i+'" title="Убрать">✕</button></div>';
    }
    return '<div class="slot" data-slot="'+i+'"><span class="plus">＋</span></div>';
  }).join('');

  return '<div class="side-h">⚔ Я <span class="tag">атакующий</span></div>' +
    '<div class="champ-row">' +
      '<button class="champ-btn" data-pick="champ"><img src="'+champIcon(c.dd)+'" alt=""><div class="cb-meta">' +
        '<div class="cb-name">'+c.n+'</div><div class="cb-sub">'+(dmgType(c.n)==='ap'?'маг. урон':'физ. урон')+' · сменить</div></div></button>' +
      '<div class="lvl-box"><label>Уровень <b>'+S.lvl+'</b></label>' +
        '<input type="range" data-lvl min="1" max="15" step="1" value="'+S.lvl+'"></div>' +
    '</div>' +
    '<div class="'+slotsCls+'">'+slots+'</div>' +
    '<div class="aux-row">' +
      auxBtn('boots','Ботинки', S.boots?BOOTS[S.boots].name:null, S.boots?itemImg(BOOTS[S.boots].slug):null) +
      auxBtn('rune','Руна', RUNES[S.rune].name, RUNES[S.rune].slug?runeImg(RUNES[S.rune].slug):null) +
      auxBtn('spell','Заклин.', SPELLS[S.spell].name, spellImg(SPELLS[S.spell].dd)) +
    '</div>';
}
function auxBtn(type, lbl, name, img) {
  var ic = img ? '<img src="'+img+'" alt="" onerror="this.style.visibility=\'hidden\'">' : '<span style="width:26px;text-align:center;opacity:.5">＋</span>';
  return '<button class="aux" data-pick="'+type+'">'+ic+'<div><div class="aux-l">'+lbl+'</div>'+(name||'выбрать')+'</div></button>';
}

/* ---------- сторона «Цель» ---------- */
function sideTgtHTML(D) {
  var body;
  if (V.tgt === 'preset') {
    body = '<div class="presets">' + Object.keys(PRESETS).map(function (k) { var p=PRESETS[k];
      return '<button class="preset'+(S.tgtPreset===k?' on':'')+'" data-preset="'+k+'"><div class="p-ic">'+p.ic+'</div>' +
        '<div class="p-n">'+p.n+'</div><div class="p-s">'+p.hp+' HP · '+p.armor+'/'+p.mr+'</div></button>';
    }).join('') + '</div>';
  } else {
    body = '<div class="tgt-sliders">' +
      tsl('HP', 'tgtHp', 500, 5000, 50, S.tgtHp) +
      tsl('Броня', 'tgtArmor', 0, 400, 5, S.tgtArmor) +
      tsl('Сопр.маг', 'tgtMr', 0, 350, 5, S.tgtMr) + '</div>';
  }
  // сводка цели после условий (шред брони, текущее HP) — то, по чему реально считается урон
  var shredTxt = D.shred ? ' <span style="color:var(--good)">(−'+Math.round(D.shred*100)+'% шред)</span>' : '';
  var readout = '<div class="tgt-readout">' +
    '<div class="tro-h">По чему считается урон <span class="demo">после условий</span></div>' +
    ro('Макс. HP', Math.round(D.hp)) +
    ro('Текущее HP', Math.round(D.curHp) + ' <i>('+(S.below35?'<35%':S.tgtHpCurPct+'%')+')</i>') +
    ro('Броня', Math.round(D.armor) + shredTxt) +
    ro('Сопр. магии', Math.round(D.mr)) +
    '</div>';
  return '<div class="side-h">🎯 Цель <span class="tag">защита</span></div>' + body + readout;
}
function ro(l, v) { return '<div class="tro-row"><span>'+l+'</span><b>'+v+'</b></div>'; }
function tsl(lbl, key, min, max, step, val) {
  return '<div class="tsl"><span>'+lbl+'</span><input type="range" data-tgt="'+key+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+val+'"><b id="v-'+key+'">'+val+'</b></div>';
}

/* ---------- результат ---------- */
/* вкладка ОПТИМИЗАТОР */
function optPane(dmg) {
  var o = optimize();
  var pg = dmgPerGold(dmg);
  var head = pg
    ? '<div class="dmg1k"><span class="d-n">' + pg.per1000 + '</span><div class="d-l">урон за 1000 золота ' +
      '<b>по ЭТОЙ цели</b><br>сборка ' + pg.gold.toLocaleString('ru') + ' зол · комбо ' + Math.round(dmg.total) + ' урона</div></div>'
    : '<div class="ge-note">Добавь предметы — посчитаю урон за золото.</div>';

  if (!o) return head + '<div class="ge-note" style="margin-top:12px">Все 6 слотов заняты — оптимизировать нечего. Освободи слот, чтобы подобрать замену.</div>';

  function rows(list, unit) {
    return list.map(function (r, i) {
      var g = GEAR[r.k];
      return '<div class="opt-row"><span class="opt-n">' + (i + 1) + '</span>' +
        '<img src="' + itemImg(g.slug) + '" alt="" loading="lazy">' +
        '<span class="opt-name">' + g.name + '<i>' + g.cost + ' зол</i></span>' +
        '<span class="opt-v">' + (unit === 'gold' ? Math.round(r.per1000) : Math.round(r.delta)) +
        '<i>' + (unit === 'gold' ? 'за 1000 зол' : 'урона') + '</i></span></div>';
    }).join('');
  }
  return head +
    '<div class="opt-block"><div class="sec-h2">🔥 Лучшее за золото <span class="demo">слот ' + (o.free + 1) + '</span></div>' +
      rows(o.byGold, 'gold') + '</div>' +
    '<div class="opt-block"><div class="sec-h2">💪 Больше всего урона (без оглядки на цену)</div>' +
      rows(o.byRaw, 'raw') + '</div>' +
    '<div class="ge-note">Перебрал все предметы каталога в свободный слот и пересчитал комбо по текущей цели ' +
    'с текущими условиями. «За золото» честнее для покупки, «больше урона» — если золото не проблема.</div>';
}

function resultHTML(a, D, dmg, ge, spikes) {
  var tabs = [['stats','Статы + gold'],['dmg','Урон по цели'],['spikes','Спайки'],['opt','🔥 Оптимизатор']];
  var bar = '<div class="res-tabs">' + tabs.map(function (t) {
    return '<button class="res-tab'+(S.resTab===t[0]?' on':'')+'" data-restab="'+t[0]+'">'+t[1]+'</button>';
  }).join('') + '</div>';

  var body;
  if (V.res === 'all') {
    body = '<div class="res-body">' +
      sec('Статы + золото-эффективность', statsPane(a, ge)) +
      sec('Урон по цели', dmgPane(a, D, dmg)) +
      sec('Спайки', spikesPane(spikes)) +
      sec('Оптимизатор', optPane(dmg)) + '</div>';
  } else {
    var pane = S.resTab==='dmg' ? dmgPane(a,D,dmg)
      : S.resTab==='spikes' ? spikesPane(spikes)
      : S.resTab==='opt' ? optPane(dmg)
      : statsPane(a,ge);
    body = '<div class="res-body">'+pane+'</div>';
  }
  return bar + body + actionsHTML();
}
function sec(h, inner) { return '<div class="res-sec"><div class="res-sec-h">'+h+'</div>'+inner+'</div>'; }

function statsPane(a, ge) {
  var cells = [
    ['AD', Math.round(a.ad)], ['AP', Math.round(a.ap)], ['HP', Math.round(a.hp)],
    ['Броня', Math.round(a.armor)], ['Сопр.маг', Math.round(a.mr)], ['Крит', a.crit+'%'],
    ['Ск.атаки', '+'+a.as+'%'], ['Ускор.ум', a.ah], ['Ск.бега', '+'+a.ms], ['Мана', Math.round(a.mana)]
  ].map(function (c) { return '<div class="stat-cell"><span class="s-l">'+c[0]+'</span><span class="s-v">'+c[1]+'</span></div>'; }).join('');
  var col = ge.pct>=100?'var(--good)':ge.pct>=80?'var(--mid)':'var(--bad)';
  return '<div class="stat-grid">'+cells+'</div>' +
    '<div class="gold-eff"><div class="gold-eff-head">💰 Золото-эффективность (по статам)' +
      '<span class="ge-pct" style="color:'+col+'">'+ge.pct+'%</span>'+(ge.hasPassive?' <span class="demo">пассивы НЕ учтены</span>':'')+'</div>' +
      '<div class="ge-bar"><i style="width:'+clamp(ge.pct/150*100,0,100)+'%;background:'+col+'"></i></div>' +
      '<div class="ge-note">Стоимость статов '+ge.val+' зол / цена сборки '+ge.cost+' зол × 100%. '+
        'Формула считает только статы (AD/AP/HP/броня/…); уникальные пассивы и активы в неё не входят.</div></div>';
}

function dmgPane(a, D, dmg) {
  var modes = '<div class="dmg-modes"><button data-dmode="burst" class="'+(S.dmgMode==='burst'?'on':'')+'">Burst (комбо)</button>' +
    '<button data-dmode="sustained" class="'+(S.dmgMode==='sustained'?'on':'')+'">Sustained (DPS)</button></div>';
  var kill = dmg.total >= D.curHp;
  var killTag = '<span class="dt-kill" style="background:'+(kill?'var(--good)':'rgba(255,255,255,.12)')+';color:'+(kill?'#0a1016':'#fff')+';text-shadow:none">'+
    (kill?'✓ убивает':'не убивает')+' цель ('+Math.round(D.curHp)+' HP)</span>';
  var max = dmg.sources.reduce(function (m,s){ return Math.max(m,s.mit); }, 1);
  var rows = dmg.sources.filter(function(s){return s.mit>=1;}).map(function (s) {
    var col = s.dt==='phys'?'var(--phys)':s.dt==='magic'?'var(--magic)':'var(--true)';
    return '<div class="src-row"><span class="sr-l"><span class="kind" style="background:'+col+'"></span>'+s.label+(s.sub?' <i style="opacity:.6;font-size:10px">'+s.sub+'</i>':'')+'</span>' +
      '<div class="sr-track"><i style="width:'+(s.mit/max*100)+'%;background:'+col+'"></i></div>' +
      '<span class="sr-v">'+Math.round(s.mit)+'</span></div>';
  }).join('');
  var big = S.dmgMode==='burst' ? Math.round(dmg.total) : Math.round(dmg.dps);
  var bigL = S.dmgMode==='burst' ? 'урон за комбо (после сопротивлений)' : 'урон в секунду · всего '+Math.round(dmg.total)+' за '+S.combatSec+'с';
  return modes +
    '<div class="dmg-total"><span class="dt-n">'+big.toLocaleString('ru')+'</span><span class="dt-l">'+bigL+'</span>'+killTag+'</div>' +
    rows +
    '<div class="ge-note" style="margin-top:12px">Разбивка после брони/сопр.маг цели'+(D.shred?' (учтён шред −'+Math.round(D.shred*100)+'% брони)':'')+'. Цвет: <b style="color:var(--phys)">физ</b> · <b style="color:var(--magic)">маг</b> · чистый. Числа демо.</div>';
}

function spikesPane(sp) {
  var maxL = sp.byLvl.reduce(function (m,d){ return Math.max(m,d.dmg); },1);
  var chart;
  if (V.spike === 'line') {
    var W=100, H=100, n=sp.byLvl.length;
    var pts = sp.byLvl.map(function (d,i) { return (i/(n-1)*W).toFixed(1)+','+(H - d.dmg/maxL*H).toFixed(1); }).join(' ');
    var circ = sp.byLvl.map(function (d,i) { return '<circle cx="'+(i/(n-1)*W).toFixed(1)+'" cy="'+(H-d.dmg/maxL*H).toFixed(1)+'" r="1.4"/>'; }).join('');
    chart = '<svg class="spike-line" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="'+pts+'"/>'+circ+'</svg>';
  } else {
    chart = '<div class="spike-chart">' + sp.byLvl.map(function (d) {
      var hl = d.lvl===S.lvl ? ' hl' : '';
      return '<div class="spike-bar'+hl+'" style="height:'+(d.dmg/maxL*100)+'%"><span>'+(d.lvl%3===1||d.lvl===S.lvl?d.dmg:'')+'</span><em>'+d.lvl+'</em></div>';
    }).join('') + '</div>';
  }
  // по предметам
  var itemLine = sp.byItem.length>1 ? '<div class="spike-legend">'+sp.byItem.map(function (b,i) {
    if (i===0) return '<div class="sp-item">◾ База (без предметов): <b>'+b.dmg+'</b></div>';
    var g=GEAR[b.key];
    var prev = sp.byItem[i-1].dmg, delta = b.dmg-prev;
    return '<div class="sp-item"><img src="'+itemImg(g.slug)+'" alt=""> +'+g.name+': <b>'+b.dmg+'</b> <span style="color:var(--good)">(+'+delta+')</span></div>';
  }).join('')+'</div>' : '<div class="ge-note">Добавь предметы в слоты — покажу прирост урона за каждый.</div>';

  return '<div class="spikes"><div><div class="ge-note" style="margin-bottom:8px">Урон комбо по текущей цели на уровнях 1–15 (подсвечен '+S.lvl+'):</div>'+chart+'</div>' +
    '<div><div class="ge-note" style="margin:22px 0 8px">Прирост от каждого докупленного предмета:</div>'+itemLine+'</div></div>';
}

function actionsHTML() {
  return '<div class="res-body" style="padding-top:0;min-height:0"><div class="actions">' +
    '<button class="act-btn accent" data-act="share">📤 Поделиться сборкой в чат</button>' +
    '<button class="act-btn" data-act="card">🔍 Открыть карточку предмета</button>' +
    '<button class="act-btn" data-act="reset">↺ Сбросить</button></div></div>';
}

/* ============================================================
   ПИКЕР (оверлей): чемп / предмет / ботинки / руна / спелл
   ============================================================ */
function openPick(type, slot) { pickState = { type: type, slot: slot, q:'', cat:'all' }; renderPick(); }
function closePick() { pickState = null; renderPick(); }
function renderPick() {
  var host = document.getElementById('pickHost');
  if (!pickState) { host.innerHTML=''; return; }
  var t = pickState.type, title, cats='', grid;

  if (t === 'champ') {
    title = 'Выбор чемпиона';
    var q = pickState.q.toLowerCase();
    grid = BASE.filter(function (c) { return c.n.toLowerCase().indexOf(q)>=0; }).map(function (c) {
      return cell(champIcon(c.dd), c.n, '', 'champ:'+c.n);
    }).join('');
  } else if (t === 'boots') {
    title = 'Выбор ботинок';
    grid = Object.keys(BOOTS).map(function (k) { var b=BOOTS[k]; return cell(itemImg(b.slug), b.name, b.cost+' зол', 'boots:'+k); }).join('');
  } else if (t === 'rune') {
    title = 'Выбор руны';
    grid = RUNE_ORDER.map(function (k) { var r=RUNES[k]; return cell(r.slug?runeImg(r.slug):'', r.name, r.note||'', 'rune:'+k); }).join('');
  } else if (t === 'spell' || t === 'spell2') {
    title = 'Выбор заклинания';
    grid = SPELL_ORDER.map(function (k) { var s=SPELLS[k]; return cell(spellImg(s.dd), s.name, '', t+':'+k); }).join('');
  } else { // item
    title = 'Выбор предмета — слот '+(pickState.slot+1);
    var cur = pickState.cat, q2 = pickState.q.toLowerCase();
    cats = '<div class="pick-cats">' + ['all','AD','AP','Защита'].map(function (c) {
      return '<button class="pick-cat'+(cur===c?' on':'')+'" data-pcat="'+c+'">'+(c==='all'?'Все':c)+'</button>';
    }).join('') + '</div>';
    grid = GEAR_ORDER.filter(function (k) { var g=GEAR[k];
      return (cur==='all'||g.cat===cur) && g.name.toLowerCase().indexOf(q2)>=0;
    }).map(function (k) { var g=GEAR[k];
      return cell(itemImg(g.slug), g.name, g.cost+' зол', 'item:'+k);
    }).join('');
  }

  host.innerHTML = '<div class="pick-scrim" data-pclose="1"></div><div class="pick-wrap"><div class="picker glass anim-in">' +
    '<div class="pick-head"><h3>'+title+'</h3><div class="pick-search"><input type="text" id="pickSearch" placeholder="поиск…" value="'+pickState.q+'"></div>' +
    '<button class="pick-close" data-pclose="1">✕</button></div>' + cats +
    '<div class="pick-grid'+(V.pick==='list'?' list':'')+'">'+grid+'</div></div></div>';
  wirePick();
}
function cell(img, name, gold, pick) {
  var im = img ? '<img src="'+img+'" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">' : '<div style="width:46px;height:46px;border-radius:9px;background:rgba(255,255,255,.06);display:grid;place-items:center">⛌</div>';
  return '<button class="pick-cell" data-pick-val="'+pick+'">'+im+'<span class="pc-n">'+name+'</span>'+(gold?'<span class="pc-g">'+gold+'</span>':'')+'</button>';
}
function wirePick() {
  var host = document.getElementById('pickHost');
  host.querySelectorAll('[data-pclose]').forEach(function (b) { b.onclick = closePick; });
  host.querySelectorAll('[data-pcat]').forEach(function (b) { b.onclick = function () { pickState.cat=b.dataset.pcat; renderPick(); }; });
  host.querySelectorAll('[data-pick-val]').forEach(function (b) { b.onclick = function () { choosePick(b.dataset.pickVal); }; });
  var s = document.getElementById('pickSearch');
  if (s) s.oninput = function () { pickState.q = s.value; var keep=s.selectionStart; renderPick(); var s2=document.getElementById('pickSearch'); if(s2){s2.focus();s2.setSelectionRange(keep,keep);} };
}
function choosePick(val) {
  var i = val.indexOf(':'), t = val.slice(0,i), k = val.slice(i+1);
  if (t==='champ') { S.champ=k; SPLASH='https://ddragon.leagueoflegends.com/cdn/img/champion/splash/'+champObj().dd+'_0.jpg'; }
  else if (t==='item') { S.items[pickState.slot]=k; }
  else if (t==='boots') S.boots=k;
  else if (t==='rune') S.rune=k;
  else if (t==='spell') S.spell=k;
  else if (t==='spell2') S.spell2=k;
  closePick(); render();
}

/* ============================================================
   ГЛАВНЫЙ РЕНДЕР
   ============================================================ */
function render() {
  applyVars();

  /* переключатель режимов */
  document.getElementById('secLoadout').hidden = S.mode !== 'loadout';
  document.getElementById('secSim').hidden = S.mode !== 'sim';
  document.querySelectorAll('[data-mode]').forEach(function (b) { b.classList.toggle('on', b.dataset.mode === S.mode); });

  /* ТОЧЕЧНО (антидёрганье): ползунок/тумблер/пресет меняют ЧИСЛА,
     значит и в DOM меняются числа — панели не пересобираются. */
  if (S.mode === 'loadout') {
    labMorph(document.getElementById('loadout'), loadoutHTML());
    updateChoice(); wire(); return;
  }

  var a = aggregate(), D = targetStats(a), dmg = computeDamage(a, D), ge = goldEff(), spikes = spikeSeries();
  labMorph(document.getElementById('cond'), condHTML());
  labMorph(document.getElementById('sideMe'), sideMeHTML(a));
  labMorph(document.getElementById('sideTgt'), sideTgtHTML(D));
  document.getElementById('result').className = 'result glass' + (V.res==='all'?' all':'');
  labMorph(document.getElementById('result'), resultHTML(a, D, dmg, ge, spikes));
  updateChoice();
  wire();
}

function wire() {
  var $ = function (sel, root) { return (root||document).querySelectorAll(sel); };
  $('[data-cond]').forEach(function (inp) { inp.oninput = function () {
    S[inp.dataset.cond] = +inp.value; render();
  }; });
  $('[data-toggle]').forEach(function (t) { t.onchange = function () { S[t.dataset.toggle] = t.checked; render(); }; });
  $('[data-lvl]').forEach(function (inp) { inp.oninput = function () { S.lvl = +inp.value; render(); }; });
  $('[data-pick]').forEach(function (b) { b.onclick = function () { openPick(b.dataset.pick, null); }; });
  $('[data-slot]').forEach(function (b) { b.onclick = function (e) { if (e.target.dataset.rm!==undefined) return; openPick('item', +b.dataset.slot); }; });
  $('[data-rm]').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); S.items[+b.dataset.rm]=null; render(); }; });
  $('[data-preset]').forEach(function (b) { b.onclick = function () { S.tgtPreset=b.dataset.preset; render(); }; });
  $('[data-tgt]').forEach(function (inp) { inp.oninput = function () { S[inp.dataset.tgt]=+inp.value; render(); }; });
  $('[data-restab]').forEach(function (b) { b.onclick = function () { S.resTab=b.dataset.restab; render(); }; });
  $('[data-dmode]').forEach(function (b) { b.onclick = function () { S.dmgMode=b.dataset.dmode; render(); }; });
  $('[data-act]').forEach(function (b) { b.onclick = function () { doAct(b.dataset.act); }; });
  /* режимы + слоты лоадаутов */
  $('[data-mode]').forEach(function (b) { b.onclick = function () { S.mode = b.dataset.mode; render(); }; });
  $('[data-ldslot]').forEach(function (b) { b.onclick = function () { switchSlot(+b.dataset.ldslot); render(); }; });
}
function doAct(act) {
  if (act==='tosim') { S.mode='sim'; render(); return; }
  if (act==='reset') { S.items=[null,null,null,null,null,null]; S.boots=null; S.stacks=0; S.maxStacks=false; render(); return; }
  if (act==='share') { var txt=buildShareText(); navigator.clipboard.writeText(txt).then(function(){ toast('Сборка скопирована для чата ✓'); }); return; }
  if (act==='card') { var first=S.items.filter(Boolean)[0]; if(!first){toast('Сначала добавь предмет');return;} toast('→ откроется карточка «'+GEAR[first].name+'» (связь с lab-item-card)'); }
}
function buildShareText() {
  var c=champObj(), its=S.items.filter(Boolean).map(function(k){return GEAR[k].name;});
  return '🛠 Сборка '+c.n+' (ур.'+S.lvl+'): '+(its.join(' · ')||'—')+(S.boots?' · '+BOOTS[S.boots].name:'')+' · руна '+RUNES[S.rune].name+' [демо lab-build]';
}
function toast(msg) {
  var t=document.createElement('div'); t.textContent=msg;
  t.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:60;background:rgba(10,14,20,.96);color:#fff;padding:12px 20px;border-radius:12px;border:1px solid rgba(255,255,255,.14);font-size:13px;box-shadow:0 10px 30px rgba(0,0,0,.5)';
  document.body.appendChild(t); setTimeout(function(){ t.style.transition='opacity .3s'; t.style.opacity='0'; setTimeout(function(){t.remove();},300); }, 1800);
}

/* ============================================================
   ДЕВ-ПОЛОСА
   ============================================================ */
var LAB = {
  layout:{side:'Я | Цель рядом', stack:'Стек'}, pick:{grid:'Сетка', list:'Список'},
  tgt:{preset:'Пресеты', slider:'Ползунки'}, res:{tabs:'Вкладки', all:'Всё сразу'},
  spike:{bars:'Бары', line:'Линия'}, density:{air:'Просторно', normal:'Средне', dense:'Плотно'}
};
function choiceStr() {
  return 'Раскладка: '+LAB.layout[V.layout]+' · Пикеры: '+LAB.pick[V.pick]+' · Цель: '+LAB.tgt[V.tgt]+
    ' · Результат: '+LAB.res[V.res]+' · Спайки: '+LAB.spike[V.spike]+' · Плотность: '+LAB.density[V.density];
}
function updateChoice() { var el=document.getElementById('choiceText'); if(el) el.textContent=choiceStr(); }

document.querySelectorAll('.strip-body .seg[data-k]').forEach(function (seg) {
  seg.querySelectorAll('button').forEach(function (b) {
    b.onclick = function () {
      seg.querySelectorAll('button').forEach(function (x){ x.classList.remove('on'); });
      b.classList.add('on'); V[seg.dataset.k] = b.dataset.v; render();
    };
  });
});
document.getElementById('stripMin').onclick = function () {
  var s=document.getElementById('labStrip'); s.classList.toggle('min');
  this.textContent = s.classList.contains('min') ? 'Развернуть' : 'Свернуть';
};
document.getElementById('stripCopy').onclick = function () {
  var self=this; navigator.clipboard.writeText(choiceStr()).then(function () {
    self.textContent='✓ Скопировано'; setTimeout(function(){ self.textContent='📋 Скопировать мой выбор'; },1400);
  });
};
(function () {
  var strip=document.getElementById('labStrip'), head=document.getElementById('stripHead'), drag=false, dx=0, dy=0;
  head.addEventListener('pointerdown', function (ev) {
    if (ev.target.closest('button')) return;
    var r=strip.getBoundingClientRect(); strip.style.transform='none'; strip.style.left=r.left+'px'; strip.style.top=r.top+'px';
    dx=ev.clientX-r.left; dy=ev.clientY-r.top; drag=true; head.setPointerCapture(ev.pointerId);
  });
  head.addEventListener('pointermove', function (ev) {
    if (!drag) return; strip.style.left=Math.max(0,ev.clientX-dx)+'px'; strip.style.top=Math.max(0,ev.clientY-dy)+'px';
  });
  head.addEventListener('pointerup', function () { drag=false; });
})();
document.addEventListener('keydown', function (ev) { if (ev.key==='Escape' && pickState) closePick(); });

loadLD(LOADOUTS[S.slot]);
render();
})();
