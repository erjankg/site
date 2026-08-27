/* ══════════════════════════════════════════════════════════════════════════
   calc-engine.js — ЧИСТЫЙ ДВИЖОК калькулятора урона Wild Rift.
   Считает СТРОГО по data-pipeline/wr-formulas.md. Ни одной выдуманной формулы.
   Номера параграфов в комментариях = разделы wr-formulas.md.
   DOM тут НЕТ — только числа. UI живёт в calc-main.js.
   ══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  const E = {};

  /* ── §12 Рост базы стата по уровням 1..15 ────────────────────────────────
     Кривая Riot: Base + Growth×(n−1)×(0.7025 + 0.0175×(n−1)).
     'linear' — старая модель боевого app.js (Base + Growth×(n−1)); держим
     переключателем, чтобы сверить с числами из игры. */
  E.growCurve = (b, g, lvl) => (+b || 0) + (+g || 0) * (lvl - 1) * (0.7025 + 0.0175 * (lvl - 1));
  E.growLinear = (b, g, lvl) => (+b || 0) + (+g || 0) * (lvl - 1);
  E.grow = (b, g, lvl, mode) => (mode === 'linear' ? E.growLinear : E.growCurve)(b, g, lvl);

  /* ── §1 Ускорение умений → КД. Стак аддитивный, потолка нет ───────────── */
  E.cdWithHaste = (cd, ah) => (+cd || 0) * 100 / (100 + Math.max(0, +ah || 0));
  E.cdrPct = ah => (1 - 100 / (100 + Math.max(0, +ah || 0))) * 100;
  /* §11 Ускорение предметов — та же формула, свой стат */
  E.itemCd = (cd, ih) => E.cdWithHaste(cd, ih);

  /* ── §2/§3 Эффективная броня / маг.сопр ──────────────────────────────────
     Порядок: (1) плоское снижение → (2) % снижение → (3) % пробитие → (4) плоское пробитие.
     Пробитие НЕ опускает защиту ниже 0; снижение (reduction) — может. */
  E.effResist = (res, p) => {
    p = p || {};
    let a = ((+res || 0) - (+p.redFlat || 0)) * (1 - (+p.redPct || 0));
    if (a > 0) a = Math.max(0, a * (1 - (+p.penPct || 0)) - (+p.penFlat || 0));
    return a;
  };
  /* Множитель урона от уже-эффективной защиты (отрицательная защита усиливает урон) */
  E.mit = eff => (eff >= 0 ? 100 / (100 + eff) : 2 - 100 / (100 - eff));

  /* ── §4 Стойкость: мультипликативно, минимум длительности CC = 0.3с ───── */
  E.tenacity = list => 1 - (list || []).reduce((a, t) => a * (1 - (+t || 0)), 1);
  E.ccDuration = (sec, ten) => Math.max(0.3, (+sec || 0) * (1 - (+ten || 0)));

  /* ── §8 Крит: база WR 175%, Бесконечный Клинок +30% ──────────────────── */
  E.critMult = bonus => 1.75 + (+bonus || 0);

  /* ── §9 Скорость атаки: Base × (1 + Bonus%), потолок 2.50/с ───────────── */
  E.attackSpeed = (base, bonusPct, uncapped) => {
    const v = (+base || 0) * (1 + (+bonusPct || 0) / 100);
    return uncapped ? v : Math.min(2.5, v);
  };

  /* ── §7 Реген за 5с: %-бонус умножает ТОЛЬКО базовый реген ────────────── */
  E.regen5 = (baseRegen, pctBonusBase, flatBonus, maxHp, pctMaxHp) =>
    (+baseRegen || 0) * (1 + (+pctBonusBase || 0)) + (+flatBonus || 0) + (+maxHp || 0) * (+pctMaxHp || 0);

  /* ── §5 Вампиризм: физ→ls, маг→sv, чистый→только омнивамп. AoE = ×1/3 ─── */
  E.lifesteal = (dmg, dt, S, aoe) => {
    const ls = dt === 'phys' ? (+S.ls || 0) : dt === 'magic' ? (+S.sv || 0) : 0;
    const v = (+dmg || 0) * (ls + (+S.omni || 0)) / 100;
    return aoe ? v / 3 : v;
  };
  /* ── §6 Сила лечения и щитов (на вампиризм НЕ влияет) ─────────────────── */
  E.healOut = (base, hspPct) => (+base || 0) * (1 + (+hspPct || 0) / 100);

  /* ── Свод статов: базовые статы чемпа на уровне + всё со сборки ─────────
     champ — запись из window.WR_DATA.champs; gear — сумма из calc-data.js. */
  E.attacker = (c, lvl, gear, opt) => {
    opt = opt || {}; gear = gear || {};
    const gm = opt.growth;
    const adBase = E.grow(c.ad_b, c.ad_g, lvl, gm);
    const hpBase = E.grow(c.hp_b, c.hp_g, lvl, gm);
    const A = {
      lvl,
      adBase, adBonus: +gear.ad || 0, ad: adBase + (+gear.ad || 0),
      ap: +gear.ap || 0,
      hpBase, hpBonus: +gear.hp || 0, hp: hpBase + (+gear.hp || 0),
      mpBase: E.grow(c.mp_b, c.mp_g, lvl, gm), mp: E.grow(c.mp_b, c.mp_g, lvl, gm) + (+gear.mp || 0),
      armor: E.grow(c.ar_b, c.ar_g, lvl, gm) + (+gear.armor || 0),
      mr: E.grow(c.mr_b, c.mr_g, lvl, gm) + (+gear.mr || 0),
      ah: +gear.ah || 0, ih: +gear.ih || 0,
      arPenFlat: +gear.arPenFlat || 0, arPenPct: +gear.arPenPct || 0,
      mrPenFlat: +gear.mrPenFlat || 0, mrPenPct: +gear.mrPenPct || 0,
      ms: (+c.ms || 0) + (+gear.ms || 0),
      crit: Math.min(100, +gear.crit || 0), critBonus: +gear.critDmg || 0,
      ls: +gear.ls || 0, sv: +gear.sv || 0, omni: +gear.omni || 0,
      hsp: +gear.hsp || 0, ten: +gear.ten || 0,
      amps: (gear.amps || []).slice(),          // множители урона (перемножаются, §14)
      onhit: (gear.onhit || []).slice(),
      res: c.res || 'None',
    };
    /* §9 скорость атаки: рост AS в данных Tencent = % за уровень */
    A.asBonus = E.grow(0, c.as_g, lvl, gm) + (+gear.as || 0);
    A.as = E.attackSpeed(c.as_b, A.asBonus);
    /* §7 реген за 5с */
    A.hpr = E.regen5(E.grow(c.hpr_b, c.hpr_g, lvl, gm), gear.hprPct, gear.hprFlat, A.hp, gear.hpPctRegen);
    A.mpr = E.regen5(E.grow(c.mpr_b, c.mpr_g, lvl, gm), gear.mprPct, gear.mprFlat, 0, 0);
    return A;
  };

  /* Цель-манекен: свои база+сборка или ручные числа. */
  E.target = t => ({
    lvl: t.lvl, hp: +t.hp || 1, hpCur: t.hpCur == null ? +t.hp || 1 : t.hpCur,
    armor: +t.armor || 0, mr: +t.mr || 0,
  });

  /* Общий множитель усилений (§14: усиления УМНОЖАЮТСЯ, не складываются) */
  E.ampMult = amps => (amps || []).reduce((m, a) => m * (1 + (+a.v || 0)), 1);

  /* Ранг умения по уровню чемпа. WR: Q/W/E → 4 ранга, R → 3 (даётся с 5/9/13).
     n берём из данных (у Джейса/Юми рангов больше — данные честнее модели). */
  E.rankIdx = (n, lvl, isUlt) => {
    if (n <= 1) return 0;
    if (isUlt) return Math.max(0, Math.min(n - 1, lvl >= 13 ? 2 : lvl >= 9 ? 1 : 0));  /* R: 5 / 9 / 13 */
    return Math.max(0, Math.min(n - 1, Math.floor((lvl - 1) * n / 15)));
  };
  /* Открыто ли умение на этом уровне (R — с 5-го) */
  E.unlocked = (k, lvl) => (k === 'R' ? lvl >= 5 : true);
  /* значение из массива по рангу (в данных бывает одно число на все ранги) */
  E.perRank = (arr, i) => {
    if (!arr || !arr.length) return null;
    return arr[Math.min(i, arr.length - 1)];
  };

  /* ── ЯДРО: урон одного применения ───────────────────────────────────────
     Порядок ровно как в wr-formulas.md «⚙️ ПОРЯДОК ВЫЧИСЛЕНИЯ»:
       1 Raw = база + скейлы → 2 крит → 3 он-хит → 4 усиления →
       5 эфф.защита → 6 множитель → 7 урон после защиты → 8 + чистый.
     Возвращает разбивку по слагаемым (для ховера «что сколько добавило»). */
  E.hit = (spec, A, D, o) => {
    o = o || {};
    const parts = [];
    const dt = spec.dt || 'phys';
    const add = (key, label, raw, type, icon) => {
      if (!raw) return;
      parts.push({ key, label, raw, dt: type || dt, icon: icon || null });
    };

    /* 1 · Raw: база + скейлы. %HP цели и %своего HP — тоже слагаемые (§14). */
    add('base', 'База умения', +spec.base || 0);
    add('ad', 'от AD', (+spec.ad || 0) * A.ad);
    add('bad', 'от бонус-AD', (+spec.bad || 0) * A.adBonus);
    add('ap', 'от Силы умений', (+spec.ap || 0) * A.ap);
    add('thp', '% макс.HP цели', (+spec.thp || 0) * D.hp);
    add('tcur', '% текущего HP цели', (+spec.tcur || 0) * D.hpCur);
    add('tmiss', '% потерянного HP цели', (+spec.tmiss || 0) * Math.max(0, D.hp - D.hpCur));
    add('ohp', '% своего макс.HP', (+spec.ohp || 0) * A.hp);
    if (spec.flat) add('flat', spec.flatLabel || 'доп.', +spec.flat || 0);

    /* 2 · Крит (только там, где крит применим — автоатака / крит-умение) */
    let critMult = 1;
    if (spec.canCrit && o.crit) critMult = E.critMult(A.critBonus);
    if (critMult > 1) parts.forEach(p => { p.raw *= critMult; p.crit = true; });

    /* 3 · Он-хит: только автоатака (или умение с явным applies-on-hit, §10).
       Именные пассивы (Spellblade) НЕ стакаются — берём наибольший. */
    if (spec.onHit) {
      const named = {};
      (A.onhit || []).forEach(h => {
        let raw = (+h.flat || 0) + (+h.ap || 0) * A.ap + (+h.ad || 0) * A.ad
          + (+h.pctCurHp || 0) * D.hpCur + (+h.pctMaxHp || 0) * D.hp;
        if (h.min) raw = Math.max(h.min, raw);
        if (!raw) return;
        if (h.named) { const cur = named[h.named]; if (!cur || cur.raw < raw) named[h.named] = { h, raw }; return; }
        parts.push({ key: 'onhit:' + h.key, label: h.name, raw, dt: h.dt || 'phys', icon: h.icon, onhit: true, demo: h.demo });
      });
      Object.values(named).forEach(({ h, raw }) =>
        parts.push({ key: 'onhit:' + h.key, label: h.name, raw, dt: h.dt || 'phys', icon: h.icon, onhit: true, demo: h.demo }));
    }

    /* 4 · Усиления атакующего — УМНОЖАЮТСЯ (§14) */
    const amp = E.ampMult(A.amps);
    if (amp !== 1) parts.forEach(p => { p.raw *= amp; });

    /* 5-7 · Эффективная защита → множитель → урон после защиты.
       Считаем по типу каждого слагаемого: физ→броня, маг→МС, чистый→без резиста. */
    const effAr = E.effResist(D.armor, { penPct: A.arPenPct, penFlat: A.arPenFlat, redFlat: o.arRedFlat, redPct: o.arRedPct });
    const effMr = E.effResist(D.mr, { penPct: A.mrPenPct, penFlat: A.mrPenFlat, redFlat: o.mrRedFlat, redPct: o.mrRedPct });
    const mAr = E.mit(effAr), mMr = E.mit(effMr);
    parts.forEach(p => {
      p.mult = p.dt === 'phys' ? mAr : p.dt === 'magic' ? mMr : 1;   /* 8 · чистый резисты игнорит */
      p.dmg = p.raw * p.mult;
    });

    const raw = parts.reduce((s, p) => s + p.raw, 0);
    const dmg = parts.reduce((s, p) => s + p.dmg, 0);
    const byType = { phys: 0, magic: 0, true: 0 };
    parts.forEach(p => { byType[p.dt] = (byType[p.dt] || 0) + p.dmg; });

    return {
      parts: parts.sort((a, b) => b.dmg - a.dmg),   /* «от большего к меньшему» для тултипа */
      raw, dmg, byType, dt, crit: critMult > 1, critMult, amp,
      effArmor: effAr, effMr, mitPhys: mAr, mitMagic: mMr,
      heal: E.lifesteal(dmg, dt, A, spec.aoe),
    };
  };

  /* Урон умения по его данным (реальные ранги из wr-data.js).
     rank.more — дополнительные инстансы урона одного применения (Ahri Q: маг. туда +
     чистый обратно). o.instances==='first' — считать только основной инстанс. */
  E.ability = (ab, rankIdx, A, D, o) => {
    o = o || {};
    const r = ab.ranks && ab.ranks[Math.min(rankIdx, (ab.ranks.length || 1) - 1)];
    if (!r) return null;
    const mk = (src, dt) => ({
      base: src.base, ad: src.ad, bad: src.bad, ap: src.ap, thp: src.thp, ohp: src.ohp,
      tmiss: src.tmiss, tcur: src.tcur,
      dt: dt || ab.dt || 'phys', onHit: !!ab.applyOnHit, canCrit: !!ab.canCrit, aoe: !!ab.aoe,
    });
    const main = E.hit(mk(r), A, D, o);
    if (r.approx) main.parts.forEach(p => { if (p.key === 'ad' || p.key === 'ap') p.approx = true; });
    if (o.instances === 'first' || !r.more || !r.more.length) return main;

    r.more.forEach((m, i) => {
      const extra = E.hit(mk(m, m.dt), A, D, o);
      extra.parts.forEach(p => {
        p.key = 'i' + (i + 2) + ':' + p.key;
        p.label = (i + 2) + '-е попадание · ' + p.label;
        if (m.approx) p.approx = true;
        main.parts.push(p);
      });
      main.raw += extra.raw; main.dmg += extra.dmg;
      for (const k in extra.byType) main.byType[k] = (main.byType[k] || 0) + extra.byType[k];
      main.hits = (main.hits || 1) + 1;
    });
    main.parts.sort((a, b) => b.dmg - a.dmg);
    return main;
  };

  /* Автоатака: AD × (крит) + он-хит, физический */
  E.auto = (A, D, o) => E.hit({ base: 0, ad: 1, dt: 'phys', onHit: true, canCrit: true }, A, D, o);

  /* Средний урон автоатаки с учётом шанса крита (для DPS) */
  E.autoAvg = (A, D) => {
    const n = E.auto(A, D, { crit: false }), c = E.auto(A, D, { crit: true });
    const p = Math.min(100, A.crit) / 100;
    return { dmg: n.dmg * (1 - p) + c.dmg * p, normal: n, critHit: c };
  };
  E.dps = (A, D) => E.autoAvg(A, D).dmg * A.as;

  root.CALC_ENGINE = E;
})(typeof window !== 'undefined' ? window : globalThis);
