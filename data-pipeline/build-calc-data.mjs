/* ═══════════════════════════════════════════════════════════════════════
   build-calc-data.mjs — собирает РЕАЛЬНЫЕ данные калькулятора урона.

   Вход  (data-pipeline/):
     base-stats.json   — база+рост статов, дальность, AS/MS, флаги ролей
     abilities.json    — умения WR с ПОРАНГОВЫМИ формулами (CN-текст: «57物理伤害（10+75%攻击力）»)
     abilities-en.json — EN-названия умений + иконки
     wr-stats.json     — тир/винрейт/пикрейт/RU-имена (снимок даты)

   Выход: calc-app/wr-data.js  →  window.WR_DATA = { ver, champs:[…] }
     champ = { dd, id, ru, en, rng, roles[], as_b, as_g, ms, res,
               ad_b, ad_g, hp_b, hp_g, ar_b, ar_g, mr_b, mr_g, mp_b, mp_g,
               hpr_b, hpr_g, mpr_b, mpr_g,
               meta:{tier,wr,pr,date},
               abils:[ {k,name,dt,ic,ct,cd[],mp[],ranks:[{base,ad,bad,ap,thp,ohp}],desc?} ],
               src:'real' | 'partial' }   // partial = формулы не распарсились → демо-скейлы
     k:'P' = пассивка (ranks может быть пуст — у пассивок формула часто текстовая, НЕ выдумываем).

   Запуск: node data-pipeline/build-calc-data.mjs
   ═══════════════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseSpell, champLean } from './parse-abilities.mjs';

const DIR = dirname(fileURLToPath(import.meta.url));
const rd = f => JSON.parse(readFileSync(join(DIR, f), 'utf8'));

const base = rd('base-stats.json');
const abil = rd('abilities.json').champions;
const abilEn = rd('abilities-en.json').champions;
const wr = rd('wr-stats.json');
const ruNames = rd('ability-names-ru.json').champions;   // fetch-ability-names-ru.mjs

/* строка «12/10/8/6» → [12,10,8,6] */
function splitNums(s) {
  return String(s || '').split('/').map(x => +x).filter(x => !isNaN(x));
}

const enBySlug = new Map(abilEn.map(c => [c.slug, c]));
const abilById = new Map(abil.map(c => [c.heroId, c]));

/* RU-имена и мета берём из среза «все ранги» (rankSlice 4), фолбэк — любой */
const metaById = new Map();
for (const r of wr.champions) {
  const prev = metaById.get(r.heroId);
  if (!prev || (prev.rankSlice !== '4' && r.rankSlice === '4')) metaById.set(r.heroId, r);
}

const SLOTS = ['passive', 'q', 'w', 'e', 'r'];
const SLOT_KEY = { passive: 'P', q: 'Q', w: 'W', e: 'E', r: 'R' };
let statReal = 0, statPartial = 0, spellsParsed = 0, passives = 0, withCost = 0;

/* красивое имя из ВЕРХНЕГО РЕГИСТРА EN («THE DARKIN BLADE» → «The Darkin Blade») */
function titleCase(s) {
  return String(s).toLowerCase().replace(/(^|\s|['-])\S/g, m => m.toUpperCase());
}
/* стоимость умения по рангам: vars[type === costType] → «65/70/75/80» */
function costOf(sp) {
  const ct = sp.costType && sp.costType !== 'None' ? sp.costType : null;
  if (!ct) return { ct: null, mp: [] };
  const v = (sp.vars || []).find(x => x.type === ct);
  const arr = v ? splitNums(v.value) : splitNums(sp.cost);
  return { ct, mp: arr.length ? arr : [] };
}

/* внутренние ключи коэффициентов → читаемые имена в champion-abilities.json */
const RATIO_OUT = {
  ad: 'adRatio', bonusAd: 'bonusAdRatio', ap: 'apRatio', bonusAp: 'bonusApRatio',
  selfMaxHp: 'selfMaxHpPct', selfBonusHp: 'selfBonusHpPct', selfMissHp: 'selfMissHpPct',
  targetMaxHp: 'targetMaxHpPct', targetCurHp: 'targetCurHpPct', targetMissHp: 'targetMissHpPct',
  armor: 'armorRatio', bonusArmor: 'bonusArmorRatio', mr: 'mrRatio', bonusMr: 'bonusMrRatio',
  crit: 'critRatio', as: 'asRatio', asPer1: 'perOnePctAs', ms: 'msRatio', mana: 'manaRatio',
};
const CC_KEYS = ['ccStun', 'ccKnockup', 'ccRoot', 'ccRootEmpowered', 'ccCharm', 'ccFear', 'ccBlind', 'ccTransform'];
/* эти vars уже вынесены отдельными полями умения — в effects не дублируем */
const FX_SKIP = new Set(['cd', 'cost', 'baseDmg', 'minDmg', 'maxBaseDmg', 'adRatio', 'adRatio2',
  'bonusAdRatio', 'bonusAdRatio2', 'apRatio', ...CC_KEYS]);

/* ОТЧЁТ ПОКРЫТИЯ: считаем, а не «на глаз» */
const cov = {
  spells: 0, withNumbers: 0, comps: 0, ok: 0, drift: 0, mismatch: 0, targetDep: 0,
  onHit: 0, execute: 0, charge: 0, ruExact: 0, ruApprox: 0, ruMissing: 0,
  manual: [], unmappedTypes: {},
};
const relOff = (shown, calc) => shown.map((s, i) => (s ? Math.abs(calc[i] - s) / s : null))
  .filter(x => x != null);

/* компонент разбора → выходной вид (читаемые имена, нули выброшены) */
function outComp(d) {
  const o = { kind: d.kind, base: d.base.map(v => +v.toFixed(2)) };
  if (d.dmgType) o.dmgType = d.dmgType;
  if (d.role && d.role !== 'main' && d.role !== d.kind) o.role = d.role;
  for (const [k, name] of Object.entries(RATIO_OUT)) if (d[k]) o[name] = d[k].map(v => +v.toFixed(4));
  if (d.pctPer) {
    o.pctPer = {};
    for (const f in d.pctPer) o.pctPer[RATIO_OUT[f] || f] = d.pctPer[f].map(v => +v.toFixed(5));
  }
  const oks = d.ok.filter(v => v !== null);
  o.verify = { shown: d.shown, calc: d.calc, status: !oks.length ? 'targetDependent' : oks.every(Boolean) ? 'ok' : 'mismatch' };
  if (o.verify.status === 'mismatch') {
    const off = relOff(d.shown, d.calc);
    if (off.length && Math.max(...off) <= 0.12) o.verify.status = 'minorDrift';
  }
  if (d.flags && d.flags.length) o.flags = d.flags;
  if (d.unknownTokens) o.unknownTokens = d.unknownTokens;
  return o;
}

const fullChamps = [];

const champs = base.champions.map(c => {
  const dd = String(c.nameEN || c.Champion).replace(/[^A-Za-z]/g, '');
  const meta = metaById.get(c.heroId);
  const src = abilById.get(c.heroId);
  const en = enBySlug.get(dd.toLowerCase());

  const abils = [], fullAbils = [];
  const lean = src ? champLean(src.spells) : 'ap';
  const ruSp = ruNames[dd] || {};
  if (src) for (const slot of SLOTS) {
    const sp = src.spells.find(s => s.slot === slot);
    if (!sp) continue;
    const isP = slot === 'passive';
    const p = parseSpell(sp, c, { lean });          // ЕДИНЫЙ разбор: vars → скобки → арифм. сверка
    cov.spells++;

    /* ── ЛЕГАСИ-вид для калькулятора: основной инстанс + more[] ──
       chargeMax в more НЕ кладём (это вилка того же удара, не второй удар — иначе двойной счёт) */
    const dmg = p.dmg.filter(d => d.role !== 'chargeMax');
    const head = dmg[0];
    const ranks = [];
    if (head) for (let r = 0; r < head.base.length; r++) {
      const at = (d, f) => (d[f] && d[f][r]) || 0;
      const rank = {
        base: Math.round(head.base[r]),
        ad: at(head, 'ad'), bad: at(head, 'bonusAd'), ap: at(head, 'ap'),
        thp: at(head, 'targetMaxHp'), ohp: at(head, 'selfMaxHp'),
      };
      if (at(head, 'targetMissHp')) rank.tmiss = at(head, 'targetMissHp');
      if (at(head, 'targetCurHp')) rank.tcur = at(head, 'targetCurHp');
      if (head.flags.includes('ratioAssumed')) rank.approx = 1;
      const more = dmg.slice(1).map(d => {
        const x = {
          dt: d.dmgType, base: Math.round(d.base[r] || 0),
          ad: at(d, 'ad'), bad: at(d, 'bonusAd'), ap: at(d, 'ap'),
          thp: at(d, 'targetMaxHp'), ohp: at(d, 'selfMaxHp'),
          approx: d.flags.includes('ratioAssumed') ? 1 : 0,
        };
        if (at(d, 'targetMissHp')) x.tmiss = at(d, 'targetMissHp');
        if (at(d, 'targetCurHp')) x.tcur = at(d, 'targetCurHp');
        return x;
      });
      if (more.length) rank.more = more;
      ranks.push(rank);
    }

    const enSp = en && en.abilities && en.abilities.find(a => a.slot === slot);
    const rn = ruSp[slot] || {};
    const nameEn = enSp && enSp.name ? titleCase(enSp.name) : (rn.en ? titleCase(rn.en) : SLOT_KEY[slot]);
    const nameRu = rn.ru || '';
    if (!nameRu) cov.ruMissing++; else if (rn.match === 'exact') cov.ruExact++; else cov.ruApprox++;

    const { ct, mp } = costOf(sp);
    const cd = p.vars.cd && p.vars.cd.length ? p.vars.cd : splitNums(sp.cd);

    /* ── ПОЛНЫЙ вид (champion-abilities.json) ── */
    const V = p.vars;
    const effects = {}, cc = {};
    for (const [k, v] of Object.entries(V)) {
      if (FX_SKIP.has(k)) continue;
      if (CC_KEYS.includes(k)) cc[k.replace(/^cc/, '').toLowerCase()] = v; else effects[k] = v;
    }
    for (const k of CC_KEYS) if (V[k]) cc[k.replace(/^cc/, '').toLowerCase()] = V[k];
    const comps = [...p.dmg, ...p.shield, ...p.heal].map(outComp);
    comps.forEach(o => {
      cov.comps++;
      cov[o.verify.status === 'ok' ? 'ok' : o.verify.status === 'minorDrift' ? 'drift'
        : o.verify.status === 'targetDependent' ? 'targetDep' : 'mismatch']++;
      if (o.role === 'chargeMin') cov.charge++;
      if (o.targetMaxHpPct || o.targetMissHpPct || o.targetCurHpPct) cov.execute++;
      if (o.verify.status === 'mismatch' || (o.flags || []).some(f => f === 'ratioUnresolved' || f === 'unknownToken'))
        cov.manual.push(`${dd} ${SLOT_KEY[slot]}: ${(o.flags || []).join('|') || o.verify.status} · показано ${JSON.stringify(o.verify.shown)} vs ${JSON.stringify(o.verify.calc)}`);
    });
    p.varsUnmapped.forEach(v => { cov.unmappedTypes[v.type] = (cov.unmappedTypes[v.type] || 0) + 1; });
    if (p.onHit) cov.onHit++;
    if (comps.length) cov.withNumbers++;

    fullAbils.push({
      slot, key: SLOT_KEY[slot], nameRu, nameEn, nameCn: sp.name,
      ruMatch: rn.match || 'none', icon: sp.icon || '',
      maxRank: p.maxRank, onHit: p.onHit,
      cd, cost: mp, costType: ct,
      components: comps,
      effects, cc,
      fromText: p.fromText,
      varsUnmapped: p.varsUnmapped,
    });

    /* умение без формулы пропускаем; пассивку оставляем ВСЕГДА (эффект бывает не числовой —
       выдумывать числа нельзя, показываем как «эффект», см. wr-formulas §14) */
    if (!ranks.length && !isP) continue;
    if (ranks.length) spellsParsed++;
    if (isP) passives++;
    if (ct) withCost++;
    const a = {
      k: SLOT_KEY[slot],
      name: nameEn,
      ru: nameRu,
      dt: head ? head.dmgType : null,
      ic: sp.icon || '',
      cd,
      ranks,
    };
    if (ct) { a.ct = ct; a.mp = mp; }
    if (p.onHit) a.onHit = 1;
    /* щит/лечение/замедление и т.п. — движку нужны так же, как урон */
    const fx = {};
    for (const k of ['shield', 'heal', 'manaRestore', 'msBonus', 'msSlow', 'asBonus', 'asSlow',
      'armorBonus', 'mrBonus', 'resistBonus', 'armorShred', 'mrShred', 'armorPen',
      'dmgReduction', 'vampPhys', 'vampMagic', 'vampOmni', 'critDmg', 'duration']) if (V[k]) fx[k] = V[k];
    if (Object.keys(fx).length) a.fx = fx;
    if (Object.keys(cc).length) a.cc = cc;
    /* EN-описание держим только у пассивки — она без формулы, иначе объяснить нечем.
       У Q/W/E/R описание не тащим: +100 КБ веса ради текста, который заменяет разбивка урона. */
    if (isP && enSp && enSp.desc) a.desc = enSp.desc;
    abils.push(a);
  }
  fullChamps.push({
    dd, id: c.heroId, en: c.nameEN || dd, ru: (meta && meta.name) || dd, lean,
    baseStats: { ad: c.AD_Base, hp: c.HP_Base, armor: c.Armor_Base, mr: c.MR_Base, mana: c.Mana_Base },
    abilities: fullAbils,
  });
  const roles = [];
  if (c.Is_Top) roles.push('Top');
  if (c.Is_Jungle) roles.push('Jungle');
  if (c.Is_Mid) roles.push('Mid');
  if (c.Is_Adc) roles.push('ADC');
  if (c.Is_Support) roles.push('Support');

  const withRanks = abils.filter(a => a.ranks.length).length;
  withRanks ? statReal++ : statPartial++;
  return {
    dd, id: c.heroId,
    ru: (meta && meta.name) || dd,
    en: c.nameEN || dd,
    rng: c.Range_Base || 175,
    roles,
    ad_b: c.AD_Base, ad_g: c.AD_Growth,
    hp_b: c.HP_Base, hp_g: c.HP_Growth,
    ar_b: c.Armor_Base, ar_g: c.Armor_Growth,
    mr_b: c.MR_Base, mr_g: c.MR_Growth,
    mp_b: c.Mana_Base, mp_g: c.Mana_Growth, res: c.Resource || 'None',
    hpr_b: c.HPRegen_Base, hpr_g: c.HPRegen_Growth,
    mpr_b: c.MPRegen_Base, mpr_g: c.MPRegen_Growth,
    as_b: c.AS_Base, as_g: c.AS_Growth, ms: c.MS_Base,
    meta: meta ? { tier: meta.tier, wr: meta.wr, pr: meta.pr, role: meta.role } : null,
    abils,
    src: withRanks ? 'real' : 'partial',
  };
});

const out = {
  ver: base.ddragonVersion,
  wrDate: wr.snapshotDate,
  built: new Date().toISOString().slice(0, 10),
  champs,
};

const js = `/* АВТО-СГЕНЕРИРОВАНО data-pipeline/build-calc-data.mjs — НЕ ПРАВИТЬ РУКАМИ.
   Реальные данные Wild Rift: база статов + ПОРАНГОВЫЕ формулы умений (база+скейл) + тир/винрейт.
   Источники: base-stats.json · abilities.json · abilities-en.json · wr-stats.json (снимок ${wr.snapshotDate}). */
window.WR_DATA=${JSON.stringify(out)};
`;
writeFileSync(join(DIR, '..', 'calc-app', 'wr-data.js'), js, 'utf8');

const full = {
  built: new Date().toISOString().slice(0, 10),
  ddragonVersion: base.ddragonVersion,
  sources: ['abilities.json (Tencent CN)', 'base-stats.json', 'abilities-en.json',
    'ability-names-ru.json (ddragon ru_RU)', `wr-stats.json (${wr.snapshotDate})`],
  legend: {
    ratios: 'доли: 0.75 = 75% · base — плоская часть, массив по РАНГАМ',
    verify: 'ok — формула сошлась с числом из текста при базовых статах · minorDrift — расхождение ≤12% ' +
      '(обычно база статов другого патча) · mismatch — сверить руками · targetDependent — зависит от цели, ' +
      'арифметикой не проверяется',
    role: 'chargeMin/chargeMax — вилка заряда ОДНОГО удара, складывать НЕЛЬЗЯ',
    flags: 'ratioByArith — стат подобран арифметикой · ratioAssumed — по типу урона · ' +
      'ratioUnresolved / unknownToken — РУЧНОЕ · scalesWithLevel — растёт от уровня, число не дано',
  },
  coverage: {
    spells: cov.spells, spellsWithNumbers: cov.withNumbers, components: cov.comps,
    verifiedOk: cov.ok, minorDrift: cov.drift, mismatch: cov.mismatch, targetDependent: cov.targetDep,
    onHitSpells: cov.onHit, executeComponents: cov.execute, chargeAbilities: cov.charge,
    ruNames: { exact: cov.ruExact, approx: cov.ruApprox, missing: cov.ruMissing },
    manualReview: cov.manual,
    unmappedVarTypes: cov.unmappedTypes,
  },
  champions: fullChamps,
};
writeFileSync(join(DIR, 'champion-abilities.json'), JSON.stringify(full, null, 1), 'utf8');

const pct = n => `${n} (${(n / cov.comps * 100).toFixed(1)}%)`;
console.log('\n══ ПОКРЫТИЕ ══');
console.log(`умений разобрано: ${cov.spells} · из них с числами: ${cov.withNumbers} · компонентов (урон/щит/лечение): ${cov.comps}`);
console.log(`сверка арифметикой: ✅ ${pct(cov.ok)} · ~дрейф ≤12%: ${pct(cov.drift)} · ❌ расхождение: ${pct(cov.mismatch)} · ⚪ зависит от цели: ${pct(cov.targetDep)}`);
console.log(`он-хит умений: ${cov.onHit} · %HP-компонентов (экзекьюты): ${cov.execute} · зарядных: ${cov.charge}`);
console.log(`RU-имена: точных ${cov.ruExact} · переименованных в WR ${cov.ruApprox} · нет ${cov.ruMissing}`);
console.log(`НА РУЧНОЕ: ${cov.manual.length} компонентов · неразобранных типов vars: ${Object.keys(cov.unmappedTypes).length}`);
console.log(`champion-abilities.json: ${(JSON.stringify(full).length / 1024).toFixed(0)} КБ\n`);
console.log(`чемпионов: ${champs.length} · с реальными умениями: ${statReal} · без формул (демо): ${statPartial}`);
console.log(`умений с поранговыми формулами: ${spellsParsed} · пассивок: ${passives} · со стоимостью: ${withCost}`);
console.log(`размер: ${(js.length / 1024).toFixed(0)} КБ`);
console.log(`WR-снимок: ${wr.snapshotDate} · ddragon: ${base.ddragonVersion}`);
