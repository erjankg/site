/* ═══════════════════════════════════════════════════════════════════════
   parse-abilities.mjs — ЯДРО разбора умений Wild Rift (CN-текст Tencent).

   Из `abilities.json` на КАЖДОЕ умение × ранг достаёт СТРУКТУРНЫЕ числа:
   компоненты урона (база + коэффициенты AD/бонус-AD/AP/%HP цели/%HP своего),
   щит, лечение, КД, стоимость, замедление, скор.бега/атаки, броне-пробитие,
   вампиризм, длительности контроля и т.д.

   ПОРЯДОК ИСТОЧНИКОВ (как просил Эржан):
     1. `vars` — структурные пораноговые значения (cd, MP, 基础伤害, 护盾, 眩晕时间…).
     2. Скобки в `detail[]` — формула «база+%коэфф» (там же типы урона и вторые компоненты).

   ЧЕСТНОСТЬ ЧИСЕЛ: число ПЕРЕД «伤害» — это урон при БАЗОВЫХ статах (ур.1, без предметов).
   Поэтому каждый разобранный компонент ПРОВЕРЯЕТСЯ арифметикой по base-stats.json:
   base + Σ коэфф×стат  ==  показанное число. Не сошлось → флаг, а не тихая ложь.
   Этой же арифметикой решается «голый %» без иероглифа-токена
   (Braum Q «60+3%»: (81−60)/0.03 = 690 = его база HP → это %HP, а не AP).
   ═══════════════════════════════════════════════════════════════════════ */

/* ── словари ───────────────────────────────────────────────────────────── */
const DT = { '物理': 'phys', '魔法': 'magic', '真实': 'true' };

/* иероглиф-токен внутри скобки → поле коэффициента.
   Порядок ВАЖЕН: «额外攻击力» проверяем до «攻击力». */
const TOKENS = [
  ['每1%额外攻击速度', 'asPer1'], ['每1%攻击速度', 'asPer1'],
  ['额外攻击速度', 'as'], ['攻击速度', 'as'], ['攻速', 'as'],
  ['额外攻击力', 'bonusAd'], ['攻击力', 'ad'],
  ['额外法术强度', 'bonusAp'], ['法术强度', 'ap'], ['法强', 'ap'],
  ['目标最大生命值', 'targetMaxHp'], ['目标当前生命值', 'targetCurHp'],
  ['目标已损失生命值', 'targetMissHp'], ['已损失生命值', 'targetMissHp'],
  ['额外生命值', 'selfBonusHp'], ['损失生命值', 'selfMissHp'],
  ['最大生命值', 'selfMaxHp'], ['生命值', 'selfMaxHp'], ['最大', 'selfMaxHp'],
  ['额外armour_ratio', 'bonusArmor'], ['armour_ratio', 'armor'],
  ['额外护甲', 'bonusArmor'], ['护甲', 'armor'],
  ['额外魔法抗性', 'bonusMr'], ['魔法抗性', 'mr'], ['魔抗', 'mr'],
  ['暴击率', 'crit'], ['移动速度', 'ms'], ['移速', 'ms'],
  ['全能吸血', 'omnivamp'], ['法力值', 'mana'], ['法力', 'mana'],
];

/* тип vars (CN) → каноничное поле. `pct:true` — значение вида «50%» → 0.5 */
const VAR_MAP = {
  'cd': 'cd', '冷却时间': 'cd', '冷却缩减': 'cdr',
  'MP': 'cost', 'HP': 'costHp', 'HPPer': 'costHpPct', 'Resource': 'cost', '怒气回复': 'rageRestore',
  '基础伤害': 'baseDmg', '最低伤害': 'minDmg', '最大基础伤害': 'maxBaseDmg', '最大伤害': 'maxDmg',
  '二段基础伤害': 'baseDmg2', '首次基础伤害': 'baseDmgFirst', '额外伤害': 'bonusDmg',
  '强化伤害': 'empoweredDmg', '每秒伤害': 'dmgPerSec', '每秒基础伤害': 'dmgPerSec',
  '真实伤害': 'trueDmg', '最低真实伤害': 'trueDmgMin', '百分比伤害': 'pctDmg',
  '攻击系数': 'adRatio', '基础攻击加成': 'adRatio', '二段攻击系数': 'adRatio2',
  '额外攻击系数': 'bonusAdRatio', '二段额外攻击系数': 'bonusAdRatio2', '额外攻击力': 'bonusAdFlat',
  '法强系数': 'apRatio', '额外法强系数': 'apRatio',
  '最大生命值系数': 'selfMaxHpPct', '额外生命值系数': 'selfBonusHpPct', '强化生命值系数': 'selfMaxHpPct',
  '护甲加成系数': 'armorRatio', '魔抗加成系数': 'mrRatio',
  '目标最大生命值': 'targetMaxHpPct', '目标当前生命值': 'targetCurHpPct', '目标已损失生命值': 'targetMissHpPct',
  '护盾': 'shield', '强化护盾': 'shieldEmpowered', '最大生命值护盾': 'shieldMaxHpPct', '二次护盾': 'shield2',
  '回复': 'heal', '最大回复': 'healMax', '单次回复上限': 'healCap', '附加治疗': 'healExtra',
  '技能伤害回复': 'healOnDmg', '命中英雄回复': 'healOnHitChamp', '治疗护盾加成': 'healShieldPower',
  '法力恢复': 'manaRestore', '能量回复': 'energyRestore',
  '移速加成': 'msBonus', '移速降低': 'msSlow', '投石移速降低幅度': 'msSlow',
  '移速降低时间': 'msSlowDur', '领域减速时间': 'msSlowDur',
  '攻速加成': 'asBonus', '强化攻速加成': 'asBonusEmpowered', '被动攻击速度': 'asBonus',
  '主动：攻速加成': 'asBonus', '攻速加成时间': 'asBonusDur', '攻速降低': 'asSlow',
  '护甲提升': 'armorBonus', '魔法抗性提升': 'mrBonus', '双抗提升': 'resistBonus',
  '护甲降低': 'armorShred', '魔抗降低': 'mrShred', '魔抗击碎': 'mrShred', '双抗削减': 'resistShred',
  '护甲穿透': 'armorPen',
  '伤害减免': 'dmgReduction', '减伤比例': 'dmgReduction',
  '魔法伤害减免': 'dmgReductionMagic', '物理伤害减免': 'dmgReductionPhys',
  '物理吸血': 'vampPhys', '魔法吸血': 'vampMagic', '暴击伤害率': 'critDmg',
  '额外生命值': 'hpBonus', '生命值': 'hpBonus', '最大生命值': 'hpBonus',
  '攻击提升': 'adBonusFlat', '攻击距离': 'range', '攻击距离提升': 'rangeBonus',
  '眩晕时间': 'ccStun', '击飞时间': 'ccKnockup', '禁锢时长': 'ccRoot', '强化禁锢时长': 'ccRootEmpowered',
  '魅惑时长': 'ccCharm', '恐惧时长': 'ccFear', '致盲时间': 'ccBlind', '变形时长': 'ccTransform',
  '持续时间': 'duration', '区域持续时间': 'durationArea', '充能时间': 'chargeTime',
  '伤害比例': 'dmgRatio', '小兵伤害': 'dmgVsMinion', '对野怪最大伤害': 'dmgCapVsMonster',
  '野怪最大伤害': 'dmgCapVsMonster', '命中附伤': 'onHitDmg', '追加伤害': 'bonusDmg',
  '飞弹数量': 'projectiles', '飞箭数量': 'projectiles', '弹幕波数': 'waves', '爆炸计数': 'explosions',
};

/* поля, у которых значение в процентах хранится ДОЛЕЙ (0.5), а не числом (50) */
const VAR_KEEP_PCT = new Set(['adRatio', 'adRatio2', 'bonusAdRatio', 'bonusAdRatio2', 'apRatio',
  'selfMaxHpPct', 'selfBonusHpPct', 'armorRatio', 'mrRatio', 'targetMaxHpPct', 'targetCurHpPct',
  'targetMissHpPct', 'shieldMaxHpPct', 'msBonus', 'msSlow', 'asBonus', 'asBonusEmpowered', 'asSlow',
  'dmgReduction', 'dmgReductionMagic', 'dmgReductionPhys', 'vampPhys', 'vampMagic', 'critDmg',
  'dmgRatio', 'dmgVsMinion', 'pctDmg', 'costHpPct', 'healShieldPower', 'cdr']);

const RATIO_FIELDS = ['ad', 'bonusAd', 'ap', 'bonusAp', 'selfMaxHp', 'selfBonusHp', 'selfMissHp',
  'targetMaxHp', 'targetCurHp', 'targetMissHp', 'armor', 'bonusArmor', 'mr', 'bonusMr',
  'crit', 'as', 'asPer1', 'ms', 'mana'];
/* коэффициенты от состояния боя (HP цели, своё потерянное HP) → арифметикой
   при базовых статах не проверить — сверку по ним не гоним */
const TARGET_FIELDS = new Set(['targetMaxHp', 'targetCurHp', 'targetMissHp', 'selfMissHp']);

const num = s => { const v = parseFloat(s); return isNaN(v) ? null : v; };
const splitVar = s => String(s == null ? '' : s).split('/').map(x => x.trim());

/* «12/10/8/6» → [12,10,8,6] · «50%/55%» → [0.5,0.55] (если pct) */
function varValues(raw, asFraction) {
  const parts = splitVar(raw).filter(x => x !== '');
  if (!parts.length) return null;
  const out = parts.map(p => {
    const isPct = p.includes('%');
    const v = num(p.replace('%', ''));
    if (v == null) return null;
    return isPct && asFraction ? v / 100 : v;
  });
  return out.some(v => v == null) ? null : out;
}

/* ── разбор одной скобки-формулы «40+45%法术强度+10%» ───────────────────── */
function parseInner(inner) {
  const terms = [];
  let clean = true;
  for (const rawPart of String(inner).split(/[+＋]/)) {
    const part = rawPart.replace(/\s+/g, '').replace(/^的|丨/g, '');
    if (!part) continue;
    const m = part.match(/^(\d+(?:\.\d+)?)(%?)(.*)$/);
    if (!m) { clean = false; continue; }
    const value = +m[1], pct = m[2] === '%';
    let tok = m[3].replace(/[（）()、，,。的]/g, '');
    if (/随等级成长/.test(tok)) { terms.push({ field: 'levelScale', value, pct }); continue; }
    if (!tok) { terms.push({ field: pct ? null : 'flat', value, pct }); continue; }
    const hit = TOKENS.find(([cn]) => tok.includes(cn));
    if (!hit) { terms.push({ field: 'unknown', token: tok, value, pct }); clean = false; continue; }
    terms.push({ field: hit[1], value, pct });
  }
  return { terms, clean };
}

/* ── сканер текста одного ранга → сырые компоненты ─────────────────────── */
const BRACKET = /（([^）]*)）/g;
const HP_CLAUSE = /(?:相当于(\d+(?:\.\d+)?)加上)?(其|目标|自身|自己)?(目标最大生命值|目标当前生命值|目标已损失生命值|已损失生命值|最大生命值|生命值)(\d+(?:\.\d+)?)%(?:（([^）]*)）)?/g;
const PCT_HP = /(\d+(?:\.\d+)?)%(目标最大生命值|目标当前生命值|目标已损失生命值|最大生命值)(?:\s*（([^）]*)）)?/g;
const HP_FIELD = {
  '目标最大生命值': 'targetMaxHp', '目标当前生命值': 'targetCurHp',
  '目标已损失生命值': 'targetMissHp', '已损失生命值': 'targetMissHp',
  '最大生命值': 'selfMaxHp', '生命值': 'selfMaxHp',
};
const isFormula = s => /^\s*\d/.test(s) && !/[，。；、次层秒个名]/.test(s) && s.length < 70;

/* скобка-формула → компонент */
function mkComp(kind, dt, shown, inner) {
  const { terms, clean } = parseInner(inner);
  const comp = { kind, dt, shown, ratios: {}, base: 0, pctPer: {}, flags: [], clean };
  for (const tm of terms) {
    if (tm.field === 'flat') { comp.base += tm.value; continue; }
    if (tm.field === 'levelScale') { if (!tm.pct) comp.base += tm.value; comp.flags.push('scalesWithLevel'); continue; }
    if (tm.field === null) { comp.unresolved = (comp.unresolved || 0) + tm.value / 100; continue; }
    if (tm.field === 'unknown') { (comp.unknownTokens = comp.unknownTokens || []).push(tm.token); continue; }
    if (!tm.pct) { (comp.flatBonus = comp.flatBonus || []).push({ field: tm.field, value: tm.value }); continue; }
    comp.ratios[tm.field] = (comp.ratios[tm.field] || 0) + tm.value / 100;
  }
  return comp;
}

function scanRank(text) {
  const t = String(text || '');
  const comps = [];
  const taken = [];                                   // [start,end) уже съеденные HP-оборотами

  /* 1) %HP-обороты (экзекьюты Гарена/Дариуса, «相当于目标最大生命值4%的物理伤害») */
  HP_CLAUSE.lastIndex = 0;
  let m;
  while ((m = HP_CLAUSE.exec(t))) {
    const after = t.slice(m.index + m[0].length, m.index + m[0].length + 26);
    const before = t.slice(Math.max(0, m.index - 26), m.index);
    /* «的魔法伤害» сразу после оборота бьёт всё остальное: это УРОН, даже если
       дальше в предложении встретится слово «щит» (Sion W: «…10%的魔法伤害。 护盾会…») */
    const dmgHit = after.slice(0, 9).match(/(物理|魔法|真实)伤害/) || after.match(/(物理|魔法|真实)伤害/) ||
      (/伤害/.test(after.slice(0, 6)) ? [null, null] : null);
    const near = after.slice(0, 9);
    const isShield = !dmgHit && (/护盾|吸收/.test(near) || /护盾|吸收/.test(before.slice(-6)));
    const isHeal = !dmgHit && /回复|治疗/.test(near);
    if (!dmgHit && !isShield && !isHeal) continue;

    let field = HP_FIELD[m[3]];
    /* «其最大生命值» — чьё? В УРОНЕ «其/目标» = ЦЕЛЬ (Sion пассивка/W),
       «自身/自己» и любой щит/лечение — своё. */
    const owner = m[2];
    if (field === 'selfMaxHp' && dmgHit && owner !== '自身' && owner !== '自己' &&
        (owner === '其' || owner === '目标' || /对目标|对敌|敌人/.test(before.slice(-40)))) field = 'targetMaxHp';
    const comp = {
      kind: isShield ? 'shield' : isHeal ? 'heal' : 'damage',
      dt: dmgHit && dmgHit[1] ? DT[dmgHit[1]] : (/(物理|魔法|真实)伤害/.exec(before) ? DT[/(物理|魔法|真实)伤害/.exec(before)[1]] : null),
      shown: null, ratios: {}, base: 0, pctPer: {}, flags: ['hpClause'], clean: true,
    };
    comp.ratios[field] = +m[4] / 100;
    if (m[1] != null) comp.base = +m[1];               // «相当于150加上…»
    if (m[5] && isFormula(m[5])) {                     // «（15%+0.12%额外攻击力）» — прирост % за ед. стата
      const { terms, clean } = parseInner(m[5]);
      if (!clean) comp.clean = false;
      terms.forEach((tm, i) => {
        if (i === 0 && tm.field === null) { comp.ratios[field] = tm.value / 100; return; }
        if (tm.field && tm.field !== 'flat' && tm.field !== 'unknown') comp.pctPer[tm.field] = tm.value / 100;
      });
    }
    comps.push(comp);
    taken.push([m.index, m.index + m[0].length]);
  }

  /* 1б) обратный порядок: «外加2%目标最大生命值（2%+0.02%额外攻击力）的物理伤害»
         (Амбесса, Экко, Ивелинн, Кай'Са, Гвен — процент СТОИТ ДО иероглифа) */
  PCT_HP.lastIndex = 0;
  while ((m = PCT_HP.exec(t))) {
    if (taken.some(([a, b]) => m.index >= a && m.index < b)) continue;
    const after = t.slice(m.index + m[0].length, m.index + m[0].length + 30);
    const dmgHit = after.match(/(物理|魔法|真实)伤害/);
    const isShield = !dmgHit && /护盾|吸收/.test(after.slice(0, 10));
    const isHeal = !dmgHit && /回复|治疗/.test(after.slice(0, 10));
    if (!dmgHit && !isShield && !isHeal) continue;
    const comp = {
      kind: isShield ? 'shield' : isHeal ? 'heal' : 'damage',
      dt: dmgHit ? DT[dmgHit[1]] : null,
      shown: null, ratios: {}, base: 0, pctPer: {}, flags: ['hpClause'], clean: true,
    };
    const field = HP_FIELD[m[2]];
    comp.ratios[field] = +m[1] / 100;
    if (m[3] && isFormula(m[3])) {
      const { terms, clean } = parseInner(m[3]);
      if (!clean) comp.clean = false;
      terms.forEach((tm, i) => {
        if (i === 0 && tm.field === null) { comp.ratios[field] = tm.value / 100; return; }
        if (tm.field && tm.field !== 'flat' && tm.field !== 'unknown' && tm.field !== 'levelScale')
          comp.pctPer[tm.field] = tm.value / 100;
      });
    }
    comps.push(comp);
    taken.push([m.index, m.index + m[0].length]);
  }

  /* 2) обычные скобки-формулы «57物理伤害（10+75%攻击力）» */
  BRACKET.lastIndex = 0;
  while ((m = BRACKET.exec(t))) {
    const start = m.index, end = start + m[0].length;
    if (taken.some(([a, b]) => start >= a && start < b)) continue;
    if (!isFormula(m[1])) continue;

    const before = t.slice(Math.max(0, start - 34), start);
    const after = t.slice(end, end + 34);
    const numBefore = before.match(/(\d+(?:\.\d+)?)\s*(?:(物理|魔法|真实)伤害|伤害|生命值|护盾|点)?[^\d]{0,12}$/);
    let dt = null;
    const dtBefore = /(物理|魔法|真实)伤害[^）]{0,10}$/.exec(before);
    const dtAfter = /^[^。]{0,26}?的?(物理|魔法|真实)伤害/.exec(after);
    if (dtBefore) dt = DT[dtBefore[1]];
    else if (dtAfter) dt = DT[dtAfter[1]];
    /* решает СЛОВО ВПЛОТНУЮ к скобке, а не «где-то рядом»: «…的护盾（…）» = щит,
       «…造成60（…）» = урон (иначе «引爆护盾，对敌人造成60（…）» уезжало в щиты) */
    const tail = before.slice(-6);
    const isShield = /护盾|吸收/.test(tail) || (!dtBefore && !dtAfter && /护盾/.test(after.slice(0, 6)));
    const isHeal = !isShield && /回复|治疗/.test(before.slice(-9));
    const kind = isShield ? 'shield' : isHeal ? 'heal' : (dt || /伤害/.test(before.slice(-10)) ? 'damage' : null);
    if (!kind) continue;

    /* «（55+100%额外攻击力到110+200%额外攻击力）» — вилка мин–макс ВНУТРИ одной скобки
       (Ли Син Q, Варус Q, Акали R, Нуну R). Слева от скобки тогда стоит «55到110». */
    const rng = m[1].match(/^([^至到]+?)(?:至|到)(\d.+)$/);
    if (rng && /^\s*\d/.test(rng[1]) && /^\s*\d/.test(rng[2])) {
      const pair = before.match(/(\d+(?:\.\d+)?)\s*(?:至|到)\s*(\d+(?:\.\d+)?)[^\d]{0,12}$/);
      [rng[1], rng[2]].forEach((sub, k) => {
        const c = mkComp(kind, dt, pair ? +pair[k + 1] : (k ? (numBefore ? +numBefore[1] : null) : null), sub);
        c.role = k ? 'chargeMax' : 'chargeMin';
        c.__end = end;
        comps.push(c);
      });
      continue;
    }

    const comp = mkComp(kind, dt, numBefore ? +numBefore[1] : null, m[1]);
    /* «79（50+45%攻击力）至187（100+135%攻击力）» — заряд: это НЕ два удара,
       а вилка мин/макс одного. Движок обязан брать одно из двух, не сумму. */
    const prev = comps[comps.length - 1];
    if (prev && prev.kind === 'damage' && kind === 'damage' && /^\s*至\s*\d+\s*$/.test(t.slice(prev.__end || 0, start))) {
      prev.role = 'chargeMin'; comp.role = 'chargeMax';
    }
    comp.__end = end;
    comps.push(comp);
  }
  return comps;
}

/* эффекты, которых нет в vars, но есть словами в тексте ранга */
const TEXT_FX = [
  ['msBonus', /(?:提升|提供|获得|增加)(?:自身)?(\d+(?:\.\d+)?)%移动速度/],
  ['msSlow', /(?:移动速度降低|移速降低|减速)(\d+(?:\.\d+)?)%/],
  ['asBonus', /(?:提升|提供|获得|增加)(?:自身)?(\d+(?:\.\d+)?)%攻击速度/],
  ['asSlow', /(?:攻击速度降低|攻速降低)(\d+(?:\.\d+)?)%/],
  ['armorShred', /(?:移除|降低|减少)(?:其)?(\d+(?:\.\d+)?)%护甲/],
  ['vampPhys', /(\d+(?:\.\d+)?)%物理吸血/],
  ['vampOmni', /(\d+(?:\.\d+)?)%全能吸血/],
];
function scanEffects(text) {
  const out = {};
  for (const [key, re] of TEXT_FX) { const m = String(text || '').match(re); if (m) out[key] = +m[1] / 100; }
  return out;
}

/* ── арифметика при БАЗОВЫХ статах (ур.1) ─────────────────────────────── */
function statsL1(c) {
  return {
    ad: c.AD_Base, bonusAd: 0, ap: 0, bonusAp: 0,
    selfMaxHp: c.HP_Base, selfBonusHp: 0,
    armor: c.Armor_Base, bonusArmor: 0, mr: c.MR_Base, bonusMr: 0,
    crit: 0, as: 0, asPer1: 0, ms: c.MS_Base, mana: c.Mana_Base || 0,
  };
}
function calcShown(comp, S) {
  let v = comp.base;
  for (const f of RATIO_FIELDS) if (comp.ratios[f]) v += comp.ratios[f] * (S[f] || 0);
  return v;
}
const close = (a, b) => Math.abs(a - b) <= Math.max(1.5, Math.abs(b) * 0.02);

/* «голый %» без иероглифа: подобрать стат так, чтобы сошлось показанное число */
function resolveBare(comp, S, lean) {
  if (!comp.unresolved) return null;
  const known = calcShown(comp, S);
  if (comp.shown == null) return null;
  const residual = comp.shown - known;
  const need = residual / comp.unresolved;
  const cands = [['selfMaxHp', S.selfMaxHp], ['ad', S.ad], ['armor', S.armor], ['mr', S.mr], ['mana', S.mana]];
  for (const [f, v] of cands) if (v > 0 && close(need, v)) return { field: f, how: 'arith' };
  if (Math.abs(residual) <= 1.5) {                       // стат = 0 на 1 уровне → AP или бонус-AD
    if (comp.dt === 'phys' && lean === 'ad') return { field: 'bonusAd', how: 'assumed' };
    if (lean === 'ad' && comp.dt !== 'magic') return { field: 'bonusAd', how: 'assumed' };
    return { field: 'ap', how: 'assumed' };
  }
  return null;
}

/* ── публичное: разбор ОДНОГО умения ──────────────────────────────────── */
export function parseSpell(sp, champBase, ctx = {}) {
  const S = statsL1(champBase);
  const details = (sp.detail && sp.detail.length) ? sp.detail : [sp.desc || ''];
  const maxRank = details.length;

  /* --- vars → каноничные пораноговые массивы --- */
  const V = {}, unmapped = [];
  for (const v of sp.vars || []) {
    if (v.type === 'None') continue;
    const key = VAR_MAP[v.type];
    if (!key) { unmapped.push({ type: v.type, value: v.value }); continue; }
    const arr = varValues(v.value, VAR_KEEP_PCT.has(key));
    if (!arr) { unmapped.push({ type: v.type, value: v.value }); continue; }
    /* тип встречается дважды — у умения два под-удара (Амбесса: 暗袭 и 裂斩).
       Второе вхождение кладём под ключ «…2», а не выбрасываем в «ручное». */
    if (V[key] == null) V[key] = arr;
    else if (V[key + '2'] == null) V[key + '2'] = arr;
    else unmapped.push({ type: v.type, value: v.value });
  }

  /* --- компоненты по рангам --- */
  const perRank = details.map(scanRank);
  const nComp = Math.max(0, ...perRank.map(r => r.length));

  /* «голый %»: голосуем по всем рангам, чтобы один ранг-выброс не решал */
  const lean = ctx.lean || 'ap';
  const votes = [];
  for (const rank of perRank) for (let i = 0; i < rank.length; i++) {
    const r = resolveBare(rank[i], S, lean);
    if (r) votes.push({ i, ...r });
  }
  const winner = {};
  for (const v of votes) {
    const box = winner[v.i] = winner[v.i] || {};
    box[v.field] = (box[v.field] || 0) + (v.how === 'arith' ? 2 : 1);
    if (v.how === 'arith') box.__arith = true;
  }

  const comps = [];
  for (let i = 0; i < nComp; i++) {
    const box = winner[i] || {};
    const bestField = Object.keys(box).filter(k => k !== '__arith')
      .sort((a, b) => box[b] - box[a])[0];
    const slices = perRank.map(r => r[i]).filter(Boolean);
    if (!slices.length) continue;
    const c0 = slices[0];
    const comp = {
      kind: c0.kind, dmgType: c0.kind === 'damage' ? (c0.dt || null) : null,
      role: c0.role || (c0.kind === 'damage' ? 'main' : c0.kind),
      base: [], shown: [], calc: [], ok: [], flags: new Set(c0.flags || []),
    };
    for (const f of RATIO_FIELDS) comp[f] = [];
    const pctPerFields = new Set();
    for (const s of slices) {
      if (s.unresolved && bestField) {
        s.ratios[bestField] = (s.ratios[bestField] || 0) + s.unresolved;
        comp.flags.add(box.__arith ? 'ratioByArith' : 'ratioAssumed');
      } else if (s.unresolved) comp.flags.add('ratioUnresolved');
      if (s.unknownTokens) { comp.flags.add('unknownToken'); comp.unknownTokens = s.unknownTokens; }
      if (!s.clean) comp.flags.add('dirtyBracket');
      comp.base.push(s.base);
      for (const f of RATIO_FIELDS) comp[f].push(s.ratios[f] || 0);
      Object.keys(s.pctPer || {}).forEach(f => pctPerFields.add(f));
      const hasTarget = RATIO_FIELDS.some(f => TARGET_FIELDS.has(f) && s.ratios[f]);
      const calc = calcShown(s, S);
      comp.shown.push(s.shown);
      comp.calc.push(+calc.toFixed(1));
      comp.ok.push(s.shown == null || hasTarget ? null : close(calc, s.shown));
    }
    if (pctPerFields.size) {
      comp.pctPer = {};
      for (const f of pctPerFields) comp.pctPer[f] = slices.map(s => (s.pctPer && s.pctPer[f]) || 0);
    }
    for (const f of RATIO_FIELDS) if (comp[f].every(v => !v)) delete comp[f];
    comp.flags = [...comp.flags];
    comps.push(comp);
  }

  /* --- поранговая база урона: vars точнее текста (текст округляет) --- */
  const dmg = comps.filter(c => c.kind === 'damage');
  if (dmg.length === 1 && V.baseDmg && V.baseDmg.length === dmg[0].base.length &&
      dmg[0].base.every((b, i) => close(b, V.baseDmg[i]))) dmg[0].base = V.baseDmg.slice();

  /* эффекты словами: берём ТОЛЬКО те, которых нет в vars (vars точнее) */
  const fx = details.map(scanEffects);
  const fromText = [];
  for (const key of ['msBonus', 'msSlow', 'asBonus', 'asSlow', 'armorShred', 'vampPhys', 'vampOmni']) {
    if (V[key] != null) continue;
    if (!fx.some(f => f[key] != null)) continue;
    V[key] = fx.map(f => f[key] == null ? 0 : f[key]);
    fromText.push(key);
  }

  const txt = details.join(' ');
  return {
    maxRank,
    onHit: /攻击特效/.test(txt),
    fromText,
    dmg,
    shield: comps.filter(c => c.kind === 'shield'),
    heal: comps.filter(c => c.kind === 'heal'),
    vars: V, varsUnmapped: unmapped,
    parseFlags: [...new Set(comps.flatMap(c => c.flags))],
  };
}

/* AP- или AD-чемпион: считаем ЯВНЫЕ (с иероглифом) коэффициенты по всем умениям */
export function champLean(spells) {
  let ap = 0, ad = 0;
  for (const sp of spells || []) {
    const t = ((sp.detail && sp.detail.join(' ')) || sp.desc || '');
    for (const m of t.matchAll(/（([^）]*)）/g)) {
      if (!isFormula(m[1])) continue;
      for (const tm of parseInner(m[1]).terms) {
        if (!tm.pct) continue;
        if (tm.field === 'ap' || tm.field === 'bonusAp') ap += tm.value;
        if (tm.field === 'ad' || tm.field === 'bonusAd') ad += tm.value;
      }
    }
  }
  return ap >= ad ? 'ap' : 'ad';
}
