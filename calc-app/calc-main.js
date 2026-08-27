/* ══════════════════════════════════════════════════════════════════════════
   calc-main.js — ГЛАВНЫЙ КАЛЬКУЛЯТОР УРОНА (интерактив + манекен).
   Данные: wr-data.js (реальные: база+скейл по рангам, КД, мана, иконки).
   Счёт:   calc-engine.js — СТРОГО по data-pipeline/wr-formulas.md.
   Вид:    calc-main.css — канон DESIGN.md.

   ═══ НЕ ТАЩИТЬ ДЁРГАНЬЕ (правила, вшитые в этот файл) ═══
   1. Каркас строится ОДИН раз (build()). Дальше — только точечные апдейты
      конкретных узлов: textContent / className / style. innerHTML на контейнер
      НЕ вызывается ни на клик, ни на ползунок, ни на букву в поиске.
   2. Появление есть только у того, что реально появляется: пикер, тултип, тост.
      Шапка, панели умений, сборка, манекен, итоги — постоянные, без анимаций.
   3. Ни одной вечной (infinite) анимации.
   4. Перезапуска анимации через offsetWidth нет вообще.
   5. transform/filter не вешаются на .glass-узлы (иначе стекло гаснет).
   Приёмка — window.CALC_AUDIT() считает пересозданные узлы (цифры в отчёт).
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const E = window.CALC_ENGINE, D = window.CALC_DATA;
  const CHAMPS = ((window.WR_DATA || {}).champs || []).slice()
    .sort((a, b) => (a.ru || a.dd).localeCompare(b.ru || b.dd, 'ru'));
  const DDV = (window.WR_DATA || {}).ver || '16.12.1';
  /* champIcon = КОНТЕНТ (портрет выбранного чемпа в карточке) — остаётся.
     ★ splashOf() УДАЛЁН: калькулятор больше не выбирает фон-арт. Подложка на весь
     сайт ОДНА и приходит из --splash-img (⚙ / wr-prefs.js). См. DESIGN.md. */
  const champIcon = dd => `https://ddragon.leagueoflegends.com/cdn/${DDV}/img/champion/${dd}.png`;

  /* ── состояние ──────────────────────────────────────────────────────── */
  const LS_KEY = 'calcMain.v1';
  const DEFAULTS = {
    champ: 'Ahri', lvl: 11, ab: 'Q', rank: {},          /* rank: {Q:2} — ручной ранг, иначе авто от уровня */
    items: [null, null, null, null, null], boots: null, enchant: null,
    keystone: 'electrocute', branch: [null, null, null], solo: null,
    buffs: {},                                          /* активированные баффы: ключ → true */
    dummy: { preset: 'squishy', hp: 2100, armor: 75, mr: 55, lvl: 11 }, combo: [],
    hpCur: null, hits: 0, mpCur: null, strip: { x: null, y: null, min: false },
    view: {
      layout: 'three', dummypos: 'right', dummysize: 'm', brk: 'formula', build: 'row',
      tabs: 'letter', density: 'normal', corners: 'canon', tip: 'list',
      growth: 'curve', inst: 'all',
      /* splash отсюда УБРАН: фон — не настройка калькулятора, а глобальный --splash-img */
    },
  };
  let state = JSON.parse(JSON.stringify(DEFAULTS));
  let LS = null;                                        /* общий пульт лабов (lab-settings.js) */
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    Object.assign(state, saved);
    state.view = Object.assign({}, DEFAULTS.view, saved.view || {});   /* новые виды не теряются */
  } catch (e) { }
  const save = () => { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { } };

  const R = {};                                         /* кэш узлов — цель точечных апдейтов */
  const $ = (s, p) => (p || document).querySelector(s);
  const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };
  const num = (v, d) => (Math.round((+v || 0) * Math.pow(10, d || 0)) / Math.pow(10, d || 0)).toLocaleString('ru-RU');
  const champ = () => CHAMPS.find(c => c.dd === state.champ) || CHAMPS[0];
  const DT_RU = { phys: 'ФИЗ', magic: 'МАГ', true: 'ЧИСТ' };
  /* склонение: 1 применение · 2 применения · 5 применений */
  const plural = (n, one, few, many) => {
    const a = Math.abs(n) % 100, b = a % 10;
    return n + ' ' + (a > 10 && a < 20 ? many : b === 1 ? one : b > 1 && b < 5 ? few : many);
  };
  const DT_C = { phys: 'var(--d-phys)', magic: 'var(--d-magic)', true: 'var(--d-true)' };
  /* контроль и эффекты умения — ключи из данных K1 (data-pipeline/parse-abilities.mjs) */
  const CC_RU = { stun: 'стан', knockup: 'подброс', root: 'обездвиж.', rootempowered: 'обездвиж.+', charm: 'очарование', fear: 'страх', blind: 'ослепление', transform: 'превращение' };
  const FX_RU = {
    msSlow: 'замедление', msBonus: '+скор. бега', asBonus: '+скор. атаки', asSlow: '−скор. атаки',
    heal: 'лечение', shield: 'щит', armorShred: '−броня цели', mrShred: '−МС цели',
    armorBonus: '+броня', mrBonus: '+МС', resistBonus: '+защита', dmgReduction: 'снижение урона',
    critDmg: '+крит.урон', armorPen: 'проб. брони', manaRestore: 'возврат маны',
    vampOmni: 'омнивамп', vampPhys: 'вампиризм', vampMagic: 'маг. вампиризм', duration: 'длительность',
  };

  /* ── сборка → список источников статов ──────────────────────────────── */
  function dmgType(c) {                                  /* AD- или AP-чемпион (для адаптивных рун) */
    let ad = 0, ap = 0;
    (c.abils || []).forEach(a => (a.ranks || []).forEach(r => { ad += (r.ad || 0) + (r.bad || 0); ap += r.ap || 0; }));
    return ap > ad ? 'ap' : 'ad';
  }
  function sources() {
    const out = [];
    state.items.forEach(k => { const it = D.ITEMS[k]; if (it) out.push(Object.assign({ key: k }, it)); });
    if (state.boots && D.BOOTS[state.boots]) out.push(Object.assign({ key: state.boots }, D.BOOTS[state.boots]));
    if (state.enchant && D.ENCHANTS[state.enchant]) out.push(Object.assign({ key: state.enchant }, D.ENCHANTS[state.enchant]));
    const ks = D.KEYSTONES[state.keystone];
    if (ks) {
      const s = Object.assign({}, ks.s || {});
      if (ks.adaptive) { const t = dmgType(champ()); s[t] = (s[t] || 0) + ks.adaptive[t]; }
      out.push({ key: state.keystone, n: ks.n, img: ks.img, s, amp: ks.type === 'amp' ? { label: ks.n, v: ks.amp } : null, demo: ks.demo });
    }
    state.branch.forEach((k, i) => {
      const r = (D.BRANCH[i] || []).find(x => x.k === k);
      if (r) out.push({ key: r.k, n: r.n, img: r.img, s: r.s, amp: r.amp ? { label: r.n, v: r.amp } : null, demo: r.demo });
    });
    const so = D.SOLO.find(x => x.k === state.solo);
    if (so) out.push({ key: so.k, n: so.n, img: so.img, s: so.s, demo: so.demo });
    /* активированные баффы (активки предметов/зачарований — только когда нажаты) */
    Object.keys(state.buffs).forEach(k => {
      if (!state.buffs[k]) return;
      const src = D.ITEMS[k] || D.ENCHANTS[k] || D.BOOTS[k];
      if (src && src.act) out.push({ key: k + ':act', n: src.act.n, img: src.img, s: { ms: src.act.ms || 0 }, demo: true });
    });
    return out;
  }
  function gear(skipKey) {
    const list = skipKey ? sources().filter(s => s.key !== skipKey) : sources();
    return D.sumStats(list);
  }
  const attacker = skip => E.attacker(champ(), state.lvl, gear(skip), { growth: state.view.growth });
  function target() {
    const d = state.dummy;
    return E.target({ lvl: d.lvl, hp: d.hp, armor: d.armor, mr: d.mr, hpCur: state.hpCur == null ? d.hp : state.hpCur });
  }
  const abil = () => abilOf(state.ab);
  function rankOf(a) {
    if (!a) return 0;
    const n = (a.ranks || []).length || 1;
    if (state.rank[a.k] != null) return Math.min(state.rank[a.k], n - 1);
    return E.rankIdx(n, state.lvl, a.k === 'R');
  }

  /* прок ключевой руны как отдельное «попадание» (Электрокьют 40%AP/20%AD) */
  function runeProc(A, T) {
    const ks = D.KEYSTONES[state.keystone];
    if (!ks || ks.type !== 'proc') return null;
    if (ks.cond === 'lowhp' && T.hpCur / T.hp > 0.5) return null;
    const p = ks.proc, lo = p.base[0], hi = p.base[1];
    const base = lo + (hi - lo) * (state.lvl - 1) / 14;
    let dt = p.dt; if (dt === 'adaptive') dt = dmgType(champ()) === 'ap' ? 'magic' : 'phys';
    const res = E.hit({ base, ad: p.ad || 0, ap: p.ap || 0, ohp: p.ohp || 0, dt }, A, T, {});
    res.parts.forEach(x => { x.label = ks.n + ' · ' + x.label; x.icon = D.IMG_RUNE(ks.img); x.demo = ks.demo; x.rune = true; });
    return res;
  }

  /* ── ГЛАВНЫЙ РАСЧЁТ (то, что показывает манекен) ─────────────────────── */
  function compute(skipKey) {
    const A = attacker(skipKey), T = target(), a = abil();
    const useProc = state.keystone !== 'none';
    let parts = [], dmg = 0, dt = 'phys', label = '';
    if (a && a.ranks && a.ranks.length) {
      const r = E.ability(a, rankOf(a), A, T, { instances: state.view.inst });
      parts = r.parts.slice(); dmg = r.dmg; dt = r.dt; label = a.ru || a.name;
      var mainRes = r;
    } else {
      const r = E.auto(A, T, { crit: false });                 /* пассивка без формулы → показываем автоатаку */
      parts = r.parts.slice(); dmg = r.dmg; dt = 'phys'; label = 'Автоатака';
      var mainRes = r;
    }
    if (useProc) {
      const pr = runeProc(A, T);
      if (pr) { parts = parts.concat(pr.parts); dmg += pr.dmg; }
    }
    parts.sort((x, y) => y.dmg - x.dmg);
    const byType = { phys: 0, magic: 0, true: 0 };
    parts.forEach(p => { byType[p.dt] = (byType[p.dt] || 0) + p.dmg; });
    const types = Object.keys(byType).filter(k => byType[k] > 0.5);
    return {
      A, T, a, parts, dmg, dt, label, byType,
      mix: types.length > 1 ? 'mix' : (types[0] || dt),
      eff: mainRes, demo: parts.some(p => p.demo),
    };
  }

  /* ══════════════════ ПОСТРОЕНИЕ КАРКАСА (один раз) ══════════════════ */
  function build() {
    document.documentElement.setAttribute('data-glass', 'on');
    const root = el('div', 'calc glass-host'); root.id = 'calc';


    /* ── ВЕРХ ── */
    const top = el('section', 'c-top glass hero');
    top.innerHTML = `
      <button class="hero-por" id="cPor" title="Сменить чемпиона"><img id="cPorImg" alt=""></button>
      <div class="hero-id">
        <div class="hero-name" id="cName">—</div>
        <div class="hero-sub"><span id="cRole">—</span><span id="cSrc" class="tag" hidden>демо</span></div>
      </div>
      <div class="hero-lvl">
        <div class="lvl-head"><span>Уровень чемпиона</span><b id="cLvlV">11</b></div>
        <div class="rng-wrap" id="cLvlWrap"><i class="rng-fill"></i>
          <input type="range" class="rng" id="cLvl" min="1" max="15" step="1" value="11"></div>
      </div>
      <div class="hero-badges">
        <span class="badge badge--tier">Тир <b id="cTier">—</b></span>
        <span class="badge">WR <b id="cWr">—</b></span>
        <span class="badge">Дальность <b id="cRng">—</b></span>
      </div>`;

    /* ── ЛЕВО: умения ── */
    const left = el('section', 'c-left');
    const tabs = el('div', 'ab-tabs glass'); tabs.id = 'abTabs';
    const card = el('div', 'ab-card glass scroll'); card.id = 'abCard';
    card.innerHTML = `
      <div class="ab-head">
        <img id="abIco" alt="">
        <div style="flex:1;min-width:0">
          <div class="ab-name" id="abName">—</div>
          <div class="ab-meta">
            <span class="tag" id="abType">—</span>
            <span class="rank-pick" id="abRank"></span>
            <span class="tag tag--demo" id="abDemo" hidden>без формулы</span>
          </div>
        </div>
      </div>
      <div class="brk">
        <div class="brk-row brk-formula" id="abFormula"></div>
        <div class="brk-row"><span class="brk-total" id="abTotal">0</span><span class="brk-sub" id="abTotalSub">сырой урон (до брони)</span></div>
      </div>
      <div class="kv">
        <div><span>КД</span><b id="abCd">—</b></div>
        <div><span>Стоимость</span><b id="abCost">—</b></div>
        <div><span>Ранг</span><b id="abRankV">—</b></div>
        <div><span>Ускорение</span><b id="abAh">—</b></div>
      </div>
      <div>
        <div class="bar-lbl"><span id="mpName">Мана</span><b id="mpV">—</b></div>
        <div class="bar"><i id="mpBar" style="width:100%"></i></div>
        <div class="brk-sub" id="mpCombo" style="margin-top:4px">—</div>
      </div>
      <div id="abFx" class="ab-fx" hidden></div>
      <div class="buffs" id="abBuffs"></div>
      <div id="abDesc" class="brk-sub"></div>
      <div style="margin-top:auto;display:flex;flex-direction:column;gap:6px">
        <button class="btn btn--wide" id="btnHit">⚔ УДАРИТЬ</button>
        <button class="btn" id="btnReset">↺ Восстановить манекен</button>
      </div>`;
    left.append(tabs, card);

    /* ── ЦЕНТР: сборка + руны ── */
    const center = el('section', 'c-center');
    const build = el('div', 'build glass'); build.id = 'buildBox';
    build.innerHTML = `
      <div class="sect-h">Сборка · 5 предметов + ботинки<span class="sp">Золото: <b id="bGold">0</b></span></div>
      <div class="slots" id="bSlots"></div>
      <div class="sect-h" style="margin-top:6px">Руны · главная + 3 ветки + соло</div>
      <div class="runes" id="bRunes"></div>
      <div class="build-foot">
        <button class="btn" id="bEnch">Зачарование: <b>—</b></button>
        <span>Тип чемпиона: <b id="bType">—</b></span>
        <span>Он-хиты: <b id="bOnhit">нет</b></span>
        <span>Усиления: <b id="bAmp">×1.00</b></span>
      </div>`;
    const spare = el('div', 'glass build'); spare.id = 'buildInfo';
    spare.innerHTML = `<div class="sect-h">Что даёт сборка</div><div class="kv" id="bStats"></div>
      <div class="brk-sub">Наведи на предмет или руну — покажу, сколько урона она добавляет ИМЕННО сейчас (с твоими AD/AP).</div>
      <div class="sect-h" style="margin-top:6px">Комбо<span class="sp">Урон комбо: <b id="cbDmg">0</b></span></div>
      <div class="combo-add" id="cbAdd"></div>
      <div class="combo-list" id="cbList"></div>
      <div class="kv">
        <div><span>Мана на комбо</span><b id="cbMana">—</b></div>
        <div><span>Хватит маны</span><b id="cbOk">—</b></div>
        <div><span>Остаток HP цели</span><b id="cbLeft">—</b></div>
        <div><span>Самое долгое КД</span><b id="cbCd">—</b></div>
      </div>
      <div class="brk-sub" id="cbNote"></div>
      <div style="display:flex;gap:8px;margin-top:auto">
        <button class="btn" id="cbRun" style="flex:1">▶ Разыграть комбо</button>
        <button class="btn" id="cbClear">Очистить</button>
      </div>`;
    center.append(build, spare);

    /* ── ПРАВО: манекен + результат ── */
    const right = el('section', 'c-right');
    const dummy = el('div', 'dummy glass'); dummy.id = 'dummyBox';
    dummy.innerHTML = `
      <div class="sect-h">Манекен — цель<span class="sp tag tag--demo">пресеты демо</span></div>
      <div class="dummy-figure">🧍</div>
      <div class="dummy-presets" id="dPresets"></div>
      <div class="field"><label>HP</label><input type="number" id="dHp" min="1" step="50"></div>
      <div class="field"><label>Броня</label><input type="number" id="dAr" min="0" step="5"></div>
      <div class="field"><label>Маг. сопр.</label><input type="number" id="dMr" min="0" step="5"></div>
      <div class="field"><label>Уровень</label>
        <div class="rng-wrap" id="dLvlWrap"><i class="rng-fill"></i>
          <input type="range" class="rng" id="dLvl" min="1" max="15" step="1"></div>
        <b id="dLvlV" class="fld-v">11</b></div>
      <div class="hp-bar"><i id="dHpBar" style="width:100%"></i><u id="dHpTxt"></u></div>`;
    const res = el('div', 'res glass glass--up'); res.id = 'resBox';
    res.innerHTML = `
      <div class="sect-h">Результат — урон ПОСЛЕ защиты</div>
      <div class="res-num t-mix" id="rNum">0</div>
      <div class="res-sub" id="rSub">—</div>
      <div class="res-bars" id="rBars"></div>
      <div class="res-ring" id="rRing">
        <svg viewBox="0 0 100 100"><g id="rRingG"></g></svg>
        <div class="rr-legend" id="rRingL"></div>
      </div>
      <div class="res-icons" id="rIcons"></div>
      <div class="res-sub" id="rTtk">—</div>`;
    right.append(dummy, res);

    /* ── НИЗ: итоги + легенда ── */
    const bot = el('section', 'c-bot glass totals'); bot.id = 'totals';
    bot.innerHTML = `
      <span class="tot up">AD <b id="tAd">0</b></span>
      <span class="tot up">AP <b id="tAp">0</b></span>
      <span class="tot">HP <b id="tHp">0</b></span>
      <span class="tot">Броня <b id="tAr">0</b></span>
      <span class="tot">МС <b id="tMr">0</b></span>
      <span class="tot">Ускор. умений <b id="tAh">0</b></span>
      <span class="tot">Ускор. предм. <b id="tIh">0</b></span>
      <span class="tot">Скор. бега <b id="tMs">0</b></span>
      <span class="tot">Скор. атаки <b id="tAs">0</b></span>
      <span class="tot">Крит <b id="tCrit">0</b></span>
      <span class="tot">Вампиризм <b id="tLs">0</b></span>
      <span class="tot">Стойкость <b id="tTen">0</b></span>
      <span class="tot">DPS <b id="tDps">0</b></span>
      <span class="legend">
        <span><i style="background:var(--d-phys)"></i>физ</span>
        <span><i style="background:var(--d-magic)"></i>маг</span>
        <span><i style="background:var(--d-true)"></i>чистый</span>
        <span><i style="background:var(--d-onhit)"></i>он-хит</span>
        <span><i style="background:var(--gain)"></i>прибавка</span>
        <span class="demo-note">демо — число не подтверждено</span>
      </span>`;

    root.append(top, left, center, right, bot);
    document.body.append(root);

    /* кэш узлов (точечные апдейты пишут только сюда) */
    ['cPorImg', 'cName', 'cRole', 'cSrc', 'cLvl', 'cLvlV', 'cLvlWrap', 'dLvlWrap', 'cTier', 'cWr', 'cRng',
      'abTabs', 'abIco', 'abName', 'abType', 'abRank', 'abDemo', 'abFormula', 'abTotal', 'abTotalSub',
      'abCd', 'abCost', 'abRankV', 'abAh', 'mpName', 'mpV', 'mpBar', 'mpCombo', 'abBuffs', 'abDesc', 'abFx',
      'bSlots', 'bRunes', 'bGold', 'bType', 'bOnhit', 'bAmp', 'bStats',
      'bEnch', 'cbAdd', 'cbList', 'cbDmg', 'cbMana', 'cbOk', 'cbLeft', 'cbCd', 'cbNote',
      'dPresets', 'dHp', 'dAr', 'dMr', 'dLvl', 'dLvlV', 'dHpBar', 'dHpTxt',
      'rNum', 'rSub', 'rBars', 'rIcons', 'rTtk', 'rRingG', 'rRingL',
      'tAd', 'tAp', 'tHp', 'tAr', 'tMr', 'tAh', 'tIh', 'tMs', 'tAs', 'tCrit', 'tLs', 'tTen', 'tDps',
    ].forEach(id => R[id] = document.getElementById(id));
    R.root = root; R.resBox = res;

    buildSlots(); buildRunes(); buildPresets(); wire();
  }

  /* слоты сборки: 5 предметов + ботинки — создаются ОДИН раз */
  function buildSlots() {
    for (let i = 0; i < 6; i++) {
      const b = el('button', 'slot'); b.dataset.slot = i;
      b.innerHTML = '<span class="ph">' + (i === 5 ? '👢' : '+') + '</span>';
      if (i === 5) b.append(el('span', 'boot-mark', 'боты'));
      R.bSlots.append(b);
    }
  }
  function buildRunes() {
    const mk = (cls, kind, idx, ph) => { const b = el('button', 'rune ' + cls); b.dataset.rune = kind; b.dataset.idx = idx; b.innerHTML = `<span class="ph">${ph}</span>`; return b; };
    R.bRunes.append(mk('key', 'key', 0, '★'));
    for (let i = 0; i < 3; i++) R.bRunes.append(mk('', 'branch', i, '+'));
    R.bRunes.append(mk('', 'solo', 0, '◆'));
  }
  function buildPresets() {
    Object.keys(D.DUMMY).forEach(k => {
      const p = D.DUMMY[k], b = el('button', 'btn', p.ic + ' ' + p.n);
      b.dataset.preset = k; R.dPresets.append(b);
    });
  }

  /* ══════════════════ ТОЧЕЧНЫЕ АПДЕЙТЫ ══════════════════════════════════ */
  function paintHero() {
    const c = champ();
    R.cPorImg.src = champIcon(c.dd);
    R.cName.textContent = c.ru || c.dd;
    R.cRole.textContent = (c.roles || []).join(' · ') || '—';
    R.cLvl.value = state.lvl; R.cLvlV.textContent = state.lvl;
    R.cLvlWrap.style.setProperty('--fill', ((state.lvl - 1) / 14 * 100) + '%');
    const m = c.meta || {};
    R.cTier.textContent = m.tier || '—';
    R.cTier.className = 'tier-' + (m.tier || '');
    R.cWr.textContent = m.wr == null ? '—' : (m.wr > 1 ? num(m.wr, 1) : num(m.wr * 100, 1)) + '%';
    R.cRng.textContent = c.rng || '—';
  }

  /* Слоты ВСЕГДА все пять. Если у умения нет числовой формулы в данных —
     показываем вкладку-заглушку, а не прячем: игрок должен видеть, что умение есть. */
  const SLOTS = ['P', 'Q', 'W', 'E', 'R'];
  const abilOf = k => (champ().abils || []).find(a => a.k === k) || { k, name: k, stub: true, ranks: [], cd: [] };

  /* вкладки умений — пересоздаются ТОЛЬКО при смене чемпиона (5 узлов) */
  function paintTabs() {
    const frag = document.createDocumentFragment();
    SLOTS.map(abilOf).forEach(a => {
      const b = el('button', 'ab-tab'); b.dataset.ab = a.k;
      const locked = !E.unlocked(a.k, state.lvl) || a.stub;
      if (a.k === state.ab) b.classList.add('on');
      if (locked) b.classList.add('locked');
      if (a.ic) { const im = el('img'); im.src = a.ic; im.alt = a.k; im.loading = 'lazy'; b.append(im); }
      else b.append(el('span', 'ab-noico', '—'));
      b.append(el('span', null, a.k === 'P' ? 'Пасс' : a.k));
      /* название держим в DOM всегда — вид «иконка+название» показывает его CSS-ом.
         У заглушки (нет формулы в данных) названия нет — не дублируем букву. */
      b.append(el('span', 'ab-nm', a.stub ? '' : (a.ru || a.name || '')));
      if (a.ranks && a.ranks.length) b.append(el('span', 'rk', String(rankOf(a) + 1)));
      frag.append(b);
    });
    R.abTabs.replaceChildren(frag);
  }
  function paintTabRanks() {                              /* при смене уровня: только цифра ранга */
    [...R.abTabs.children].forEach(b => {
      const a = abilOf(b.dataset.ab);
      const rk = b.querySelector('.rk');
      if (a.ranks.length && rk) rk.textContent = String(rankOf(a) + 1);
      b.classList.toggle('locked', !E.unlocked(b.dataset.ab, state.lvl) || !!a.stub);
    });
  }

  function paintAbility(res) {
    const a = abil(), c = champ(), A = res.A;
    if (!a) return;
    R.abIco.src = a.ic || ''; R.abIco.hidden = !a.ic;
    R.abName.textContent = a.ru || a.name || a.k;      /* RU-имя из данных, EN — фолбэк */
    R.abName.title = a.name || '';
    const has = !!(a.ranks && a.ranks.length);
    R.abType.textContent = has ? DT_RU[a.dt || 'phys'] : 'ЭФФЕКТ';
    R.abType.className = 'tag tag--' + (has ? (a.dt || 'phys') : 'demo');
    const rk0 = has ? a.ranks[rankOf(a)] : null;
    const approx = !!(rk0 && (rk0.approx || (rk0.more || []).some(m => m.approx)));
    R.abDemo.hidden = has && !approx;
    R.abDemo.textContent = !has ? (a.stub ? 'нет в данных' : 'без формулы') : 'скейл выведен по типу урона';
    R.abDesc.textContent = has
      ? (rk0 && rk0.more && rk0.more.length && state.view.inst === 'all'
        ? `Одно применение бьёт ${rk0.more.length + 1} раза (${[a.dt].concat(rk0.more.map(m => m.dt)).map(t => DT_RU[t]).join(' + ')}).` : '')
      : a.stub
        ? 'У этого умения в текущем срезе данных нет числовой формулы урона (рывок, превращение, контроль). Числа не выдумываем — ниже показан урон автоатаки.'
        : (a.desc || 'Эффект без числовой формулы в данных — числа не выдумываем.');

    /* бейдж ранга: 1..n, клик = ручной ранг */
    const n = (a.ranks || []).length;
    if (R.abRank.childElementCount !== n) {
      const f = document.createDocumentFragment();
      for (let i = 0; i < n; i++) { const b = el('button', null, String(i + 1)); b.dataset.rank = i; f.append(b); }
      R.abRank.replaceChildren(f);
    }
    const ri = rankOf(a);
    [...R.abRank.children].forEach((b, i) => b.classList.toggle('on', i === ri));
    R.abRankV.textContent = has ? (ri + 1) + ' / ' + n : '—';

    /* разбивка «130 + 70 = 200», прибавка ЗЕЛЁНАЯ */
    const own = res.parts.filter(p => !p.rune);
    const base = own.find(p => p.key === 'base');
    const scale = own.filter(p => p.key !== 'base' && !p.onhit);
    const rawTotal = own.reduce((s, p) => s + p.raw, 0);
    /* узлы формулы НЕ пересоздаём, пока не изменилось их КОЛИЧЕСТВО —
       на ползунке уровня меняется только текст (счётчик узлов: 0 пересозданных) */
    const need = has ? scale.length + 3 : 0;
    if (R.abFormula.childElementCount !== need) {
      const f = document.createDocumentFragment();
      if (has) {
        f.append(el('span', 'brk-num'));
        scale.forEach(() => f.append(el('span', 'brk-gain')));
        f.append(el('span', 'brk-num', '='));
        f.append(el('span', 'brk-num'));
      }
      R.abFormula.replaceChildren(f);
    }
    /* показываем ОКРУГЛЁННЫЕ слагаемые и их сумму — чтобы строка сходилась глазами */
    const rBase = Math.round(base ? base.raw : 0);
    const rScale = scale.map(p => Math.round(p.raw));
    const rSum = rBase + rScale.reduce((s, v) => s + v, 0);
    if (has) {
      const ch = R.abFormula.children;
      ch[0].textContent = num(rBase);
      scale.forEach((p, i) => { ch[i + 1].textContent = '+ ' + num(rScale[i]); ch[i + 1].title = p.label; });
      ch[need - 1].textContent = num(rSum);
    }
    R.abTotal.textContent = num(has ? rSum : rawTotal);
    R.abTotal.style.color = has ? DT_C[a.dt || 'phys'] : '';
    const uniq = [...new Set(scale.map(p => p.label.replace(/^\d-е попадание · /, '')))];
    R.abTotalSub.textContent = has ? 'сырой урон · ' + (uniq.length ? uniq.join(', ') : 'без скейла') : 'нет формулы';

    /* КД после ускорения умений, стоимость, мана */
    const cdRaw = E.perRank(a.cd, ri);
    R.abCd.textContent = cdRaw ? num(E.cdWithHaste(cdRaw, A.ah), 1) + ' с' + (A.ah ? ' (было ' + num(cdRaw, 1) + ')' : '') : '—';
    const cost = a.mp ? E.perRank(a.mp, ri) : null;
    const resName = c.res === 'Mana' ? 'Мана' : c.res === 'Energy' ? 'Энергия' : c.res === 'None' ? 'Без ресурса' : c.res;
    R.abCost.textContent = cost ? num(cost) : '—';
    /* контроль и эффекты умения — реальные числа из данных (K1), не выдумка */
    const cc = a.cc ? Object.keys(a.cc).map(k => (CC_RU[k] || k) + ' ' + num(E.perRank(a.cc[k], ri), 2) + 'с').join(' · ') : '';
    const fx = a.fx ? Object.keys(a.fx).filter(k => FX_RU[k]).map(k => {
      const v = E.perRank(a.fx[k], ri);
      return FX_RU[k] + ' ' + (Math.abs(v) <= 3 ? num(v * 100) + '%' : num(v));
    }).join(' · ') : '';
    R.abFx.textContent = [cc, fx].filter(Boolean).join(' · ');
    R.abFx.hidden = !cc && !fx;
    R.abAh.textContent = num(A.ah) + ' (−' + num(E.cdrPct(A.ah), 1) + '% КД)';

    const mpMax = Math.round(A.mp);
    R.mpName.textContent = resName;
    if (mpMax <= 0) { R.mpV.textContent = '—'; R.mpBar.style.width = '0%'; R.mpCombo.textContent = 'Чемпион без ресурса — комбо ограничено только КД.'; }
    else {
      const cur = state.mpCur == null ? mpMax : Math.max(0, Math.min(mpMax, state.mpCur));
      R.mpV.textContent = num(cur) + ' / ' + num(mpMax);
      R.mpBar.style.width = (cur / mpMax * 100) + '%';
      R.mpBar.style.setProperty('--bar-c', c.res === 'Energy' ? 'var(--res-energy)' : 'var(--accent)');
      R.mpCombo.textContent = cost ? 'Хватит на ' + Math.floor(cur / cost) + ' примен. подряд (лимит комбо)' : 'Умение без стоимости';
    }
    paintBuffs();
  }

  /* кнопки-активации баффов: только у того, что реально есть в сборке */
  function paintBuffs() {
    const list = [];
    state.items.forEach(k => { const it = D.ITEMS[k]; if (it && it.act) list.push({ k, n: it.act.n, d: it.act.d, img: it.img }); });
    if (state.enchant && D.ENCHANTS[state.enchant] && D.ENCHANTS[state.enchant].act) {
      const e2 = D.ENCHANTS[state.enchant]; list.push({ k: state.enchant, n: e2.act.n, d: e2.act.d, img: e2.img });
    }
    const key = list.map(x => x.k).join('|');
    if (R.abBuffs.dataset.key !== key) {                    /* пересоздаём ТОЛЬКО когда набор активок изменился */
      const f = document.createDocumentFragment();
      if (!list.length) f.append(el('span', 'brk-sub', 'Активируемых баффов в сборке нет — возьми Йоумуу, Стерак или зачарование.'));
      list.forEach(x => {
        const b = el('button', 'buff'); b.dataset.buff = x.k; b.title = x.d || '';
        const im = el('img'); im.src = D.IMG_ITEM(x.img); im.alt = ''; im.loading = 'lazy';
        b.append(im, el('span', null, x.n));
        f.append(b);
      });
      R.abBuffs.replaceChildren(f); R.abBuffs.dataset.key = key;
    }
    [...R.abBuffs.querySelectorAll('.buff')].forEach(b => b.classList.toggle('on', !!state.buffs[b.dataset.buff]));
  }

  /* сборка: обновляем ТОЛЬКО картинку конкретного слота */
  function paintSlot(i) {
    const b = R.bSlots.children[i]; if (!b) return;
    const k = i === 5 ? state.boots : state.items[i];
    const src = i === 5 ? D.BOOTS[k] : D.ITEMS[k];
    if (!src) {
      if (b.dataset.k === '') return;
      b.dataset.k = ''; b.title = i === 5 ? 'Ботинки' : 'Пустой слот';
      b.replaceChildren(el('span', 'ph', i === 5 ? '👢' : '+'));
      if (i === 5) b.append(el('span', 'boot-mark', 'боты'));
      b.append(el('span', 'slot-cap', i === 5 ? 'Ботинки' : 'Пусто'));   /* подпись для вида «как в игре» */
      return;
    }
    if (b.dataset.k === k) return;
    b.dataset.k = k; b.title = src.n;
    const im = el('img'); im.src = D.IMG_ITEM(src.img); im.alt = src.n; im.loading = 'lazy';
    b.replaceChildren(im);
    if (src.demo) b.append(el('span', 'dm', 'демо'));
    b.append(el('span', 'slot-cap', src.n));
  }
  function paintRune(kind, idx) {
    const b = [...R.bRunes.children].find(x => x.dataset.rune === kind && +x.dataset.idx === idx); if (!b) return;
    let src = null, k = '';
    if (kind === 'key') { k = state.keystone; src = D.KEYSTONES[k]; }
    else if (kind === 'branch') { k = state.branch[idx]; src = (D.BRANCH[idx] || []).find(x => x.k === k); }
    else { k = state.solo; src = D.SOLO.find(x => x.k === k); }
    if (!src) { if (b.dataset.k === '') return; b.dataset.k = ''; b.replaceChildren(el('span', 'ph', kind === 'key' ? '★' : kind === 'solo' ? '◆' : '+')); return; }
    if (b.dataset.k === k) return;
    b.dataset.k = k; b.title = src.n + (src.note ? ' — ' + src.note : '');
    const im = el('img'); im.src = D.IMG_RUNE(src.img); im.alt = src.n; im.loading = 'lazy';
    b.replaceChildren(im);
  }

  function paintBuild(res) {
    const A = res.A, g = gear();
    let gold = 0;
    state.items.forEach(k => { if (D.ITEMS[k]) gold += D.ITEMS[k].g || 0; });
    if (state.boots && D.BOOTS[state.boots]) gold += D.BOOTS[state.boots].g || 0;
    if (state.enchant && D.ENCHANTS[state.enchant]) gold += D.ENCHANTS[state.enchant].g || 0;
    R.bGold.textContent = num(gold);
    R.bEnch.lastChild.textContent = state.enchant && D.ENCHANTS[state.enchant] ? D.ENCHANTS[state.enchant].n : '—';
    R.bType.textContent = dmgType(champ()) === 'ap' ? 'AP (маг.)' : 'AD (физ.)';
    R.bOnhit.textContent = (A.onhit || []).length ? A.onhit.map(o => o.name).join(', ') : 'нет';
    R.bAmp.textContent = '×' + num(E.ampMult(A.amps), 2);
    const rows = [
      ['Пробитие брони', num(A.arPenFlat) + ' + ' + num(A.arPenPct * 100) + '%'],
      ['Маг. пробитие', num(A.mrPenFlat) + ' + ' + num(A.mrPenPct * 100) + '%'],
      ['Сила лечения/щитов', num(A.hsp) + '%'],
      ['Реген HP / 5с', num(A.hpr, 1)],
      ['Реген маны / 5с', num(A.mpr, 1)],
      ['Омнивамп', num(A.omni) + '%'],
    ];
    if (R.bStats.childElementCount !== rows.length) {
      const f = document.createDocumentFragment();
      rows.forEach(() => { const d = el('div'); d.append(el('span'), el('b')); f.append(d); });
      R.bStats.replaceChildren(f);
    }
    [...R.bStats.children].forEach((d, i) => { d.children[0].textContent = rows[i][0]; d.children[1].textContent = rows[i][1]; });
  }

  function paintDummy(res) {
    const d = state.dummy;
    if (document.activeElement !== R.dHp) R.dHp.value = d.hp;
    if (document.activeElement !== R.dAr) R.dAr.value = d.armor;
    if (document.activeElement !== R.dMr) R.dMr.value = d.mr;
    R.dLvl.value = d.lvl; R.dLvlV.textContent = d.lvl;
    R.dLvlWrap.style.setProperty('--fill', ((d.lvl - 1) / 14 * 100) + '%');
    const cur = state.hpCur == null ? d.hp : state.hpCur;
    R.dHpBar.style.width = Math.max(0, cur / d.hp * 100) + '%';
    R.dHpTxt.textContent = num(Math.max(0, Math.round(cur))) + ' / ' + num(d.hp) + (state.hits ? ' · ударов: ' + state.hits : '');
    [...R.dPresets.children].forEach(b => b.classList.toggle('on', b.dataset.preset === d.preset));
  }

  function paintResult(res) {
    const dmg = res.dmg;
    R.rNum.textContent = num(dmg);
    R.rNum.className = 'res-num t-' + res.mix;
    const A = res.A, T = res.T;
    R.rSub.textContent = `${res.label} · эфф. броня ${num(res.eff.effArmor)} (было ${num(T.armor)}) · эфф. МС ${num(res.eff.effMr)} (было ${num(T.mr)})`
      + (res.demo ? ' · есть демо-числа' : '');

    /* полоса по типам урона */
    const bt = res.byType, tot = Math.max(1, bt.phys + bt.magic + bt.true);
    const seg = [['phys', bt.phys], ['magic', bt.magic], ['true', bt.true]].filter(x => x[1] > 0.5);
    if (R.rBars.childElementCount !== seg.length) R.rBars.replaceChildren(...seg.map(() => el('i')));
    [...R.rBars.children].forEach((n, i) => { n.style.width = (seg[i][1] / tot * 100) + '%'; n.style.background = DT_C[seg[i][0]]; });

    /* ряд иконок «что сколько добавило» (от большего к меньшему) */
    /* ряд иконок пересоздаём ТОЛЬКО если изменилось их КОЛИЧЕСТВО;
       иначе меняем на месте (уровень/броня/предмет = 0-1 пересозданных узла) */
    const parts = res.parts.filter(p => p.dmg > 0.5);
    if (R.rIcons.childElementCount !== parts.length) {
      const f = document.createDocumentFragment();
      parts.forEach(() => {
        const s = el('span', 'res-ico');
        s.append(el('i'), el('img'), el('b'));
        f.append(s);
      });
      R.rIcons.replaceChildren(f);
    }
    [...R.rIcons.children].forEach((s, i) => {
      const p = parts[i], [dot, img, val] = s.children;
      if (p.icon) { if (img.getAttribute('src') !== p.icon) img.src = p.icon; img.hidden = false; dot.hidden = true; }
      else { img.hidden = true; dot.hidden = false; dot.style.setProperty('--c', p.onhit ? 'var(--d-onhit)' : DT_C[p.dt]); }
      val.textContent = num(p.dmg);
      s.title = p.label;
    });

    /* КОЛЬЦО разбивки (вид «Кольцо»): SVG-сегменты, без градиента.
       Пересоздаём, только если изменилось ЧИСЛО сегментов. */
    if (state.view.brk === 'ring') paintRing(parts);

    /* сколько ударов до смерти + вампиризм */
    const cur = state.hpCur == null ? state.dummy.hp : state.hpCur;
    const hits = dmg > 0 ? Math.ceil(cur / dmg) : Infinity;
    const heal = E.lifesteal(dmg, res.dt, A, false);
    R.rTtk.textContent = (isFinite(hits) ? 'Убить: ' + plural(hits, 'применение', 'применения', 'применений') : 'Урона нет')
      + (heal > 0.5 ? ` · вернёт ${num(heal)} HP` : '') + ` · DPS автоатак ${num(E.dps(A, T))}`;
  }

  /* кольцо: один <circle> на слагаемое, длина дуги через stroke-dasharray */
  const SVGNS = 'http://www.w3.org/2000/svg';
  function paintRing(parts) {
    const g = R.rRingG, lg = R.rRingL;
    const top = parts.slice(0, 6);
    const tot = Math.max(1, top.reduce((s, p) => s + p.dmg, 0));
    if (g.childElementCount !== top.length + 1) {
      const f = document.createDocumentFragment();
      const base = document.createElementNS(SVGNS, 'circle');
      base.setAttribute('cx', 50); base.setAttribute('cy', 50); base.setAttribute('r', 40);
      base.setAttribute('fill', 'none'); base.setAttribute('stroke-width', 14);
      base.setAttribute('stroke', 'rgba(255,255,255,.12)');
      f.append(base);
      top.forEach(() => {
        const c = document.createElementNS(SVGNS, 'circle');
        c.setAttribute('cx', 50); c.setAttribute('cy', 50); c.setAttribute('r', 40);
        c.setAttribute('fill', 'none'); c.setAttribute('stroke-width', 14); c.setAttribute('stroke-linecap', 'butt');
        f.append(c);
      });
      g.replaceChildren(f);
      const lf = document.createDocumentFragment();
      top.forEach(() => { const s = el('span'); s.append(el('i'), el('em'), el('b')); lf.append(s); });
      lg.replaceChildren(lf);
    }
    const C = 2 * Math.PI * 40;
    let acc = 0;
    top.forEach((p, i) => {
      const c = g.children[i + 1], frac = p.dmg / tot;
      const col = p.onhit ? 'var(--d-onhit)' : DT_C[p.dt];
      c.setAttribute('stroke', col);
      c.setAttribute('stroke-dasharray', (C * frac) + ' ' + C);
      c.setAttribute('stroke-dashoffset', -C * acc);
      acc += frac;
      const row = lg.children[i];
      row.children[0].style.background = col;
      row.children[1].textContent = p.label;
      row.children[2].textContent = num(p.dmg);
    });
  }

  function paintTotals(res) {
    const A = res.A;
    R.tAd.textContent = num(A.ad); R.tAp.textContent = num(A.ap); R.tHp.textContent = num(A.hp);
    R.tAr.textContent = num(A.armor); R.tMr.textContent = num(A.mr);
    R.tAh.textContent = num(A.ah); R.tIh.textContent = num(A.ih);
    R.tMs.textContent = num(A.ms); R.tAs.textContent = num(A.as, 2);
    R.tCrit.textContent = num(A.crit) + '% ×' + num(E.critMult(A.critBonus), 2);
    R.tLs.textContent = num(A.ls) + '% / ' + num(A.sv) + '%';
    R.tTen.textContent = num(A.ten * 100) + '%';
    R.tDps.textContent = num(E.dps(A, res.T));
  }

  /* один общий проход: считает и раздаёт числа по узлам */
  function refresh(what) {
    const res = compute();
    if (!what || what.hero) paintHero();
    if (what && what.tabs) paintTabs();
    if (!what || what.ranks) paintTabRanks();
    paintAbility(res); paintBuild(res); paintCombo(); paintDummy(res); paintResult(res); paintTotals(res);
    save();
    return res;
  }

  /* ══════════════════ ТУЛТИПЫ ══════════════════════════════════════════ */
  let tipEl = null;
  function showTip(html, x, y) {
    if (!tipEl) { tipEl = el('div', 'tip glass glass--up'); document.body.append(tipEl); }
    tipEl.innerHTML = html; tipEl.hidden = false;
    const r = tipEl.getBoundingClientRect();
    tipEl.style.left = Math.min(x + 14, innerWidth - r.width - 10) + 'px';
    tipEl.style.top = Math.min(y + 14, innerHeight - r.height - 10) + 'px';
  }
  const hideTip = () => { if (tipEl) tipEl.hidden = true; };

  function tipBreakdown(res) {
    const rows = res.parts.filter(p => p.dmg > 0.5).map(p => `
      <div class="tip-row">${p.icon ? '<img src="' + p.icon + '" alt="">' : ''}<i style="--c:${p.onhit ? 'var(--d-onhit)' : DT_C[p.dt]}"></i>
        <span class="nm">${p.label}${p.demo ? ' <span class=\"demo-note\">демо</span>' : ''}</span>
        <b>${num(p.dmg)}</b></div>`).join('');
    return `<h4>Из чего урон (от большего к меньшему)</h4>${rows}
      <div class="tip-foot">Сырой ${num(res.parts.reduce((s, p) => s + p.raw, 0))} → после защиты ${num(res.dmg)}.
      Множитель: физ ×${num(res.eff.mitPhys, 2)} · маг ×${num(res.eff.mitMagic, 2)}</div>`;
  }
  /* ХОВЕР ПО ПРЕДМЕТУ/РУНЕ: сколько он добавляет с ТЕКУЩИМИ AD/AP */
  function tipSource(key, name, note) {
    const now = compute(), without = compute(key);
    const d = now.dmg - without.dmg;
    const A = now.A, B = without.A;
    const stat = [
      ['AD', A.ad - B.ad], ['AP', A.ap - B.ap], ['HP', A.hp - B.hp], ['Броня', A.armor - B.armor],
      ['МС', A.mr - B.mr], ['Ускор. умений', A.ah - B.ah], ['Крит', A.crit - B.crit],
      ['Скор. атаки', (A.as - B.as) * 100 / Math.max(0.01, B.as)], ['Скор. бега', A.ms - B.ms],
    ].filter(x => Math.abs(x[1]) > 0.01).map(x => `<div class="tip-row"><span class="nm">${x[0]}</span><b>+${num(x[1], 1)}</b></div>`).join('');
    return `<h4>${name}</h4>${note ? `<div class="tip-foot" style="margin:0 0 6px;border:0;padding:0">${note}</div>` : ''}${stat}
      <div class="tip-foot">Добавляет к текущему удару: <b style="color:var(--gain)">+${num(d)}</b> урона
      (${num(without.dmg)} → ${num(now.dmg)}) при твоих AD ${num(A.ad)} / AP ${num(A.ap)}.</div>`;
  }

  /* ══════════════════ ПИКЕРЫ (появляются — анимация уместна) ═══════════ */
  let pick = null;
  function openPick(title, list, onPick, opts) {
    closePick();
    opts = opts || {};
    pick = el('div', 'pick');
    const box = el('div', 'pick-box glass glass--up');
    box.innerHTML = `<div class="pick-head"><h3>${title}</h3>
      <input class="pick-search" placeholder="Поиск…" ${opts.search === false ? 'hidden' : ''}>
      <span class="sp"></span><button class="btn" data-x>Закрыть</button></div>
      <div class="pick-grid ${opts.champs ? 'champs' : ''}"></div>`;
    const grid = box.querySelector('.pick-grid');
    /* Сетку строим ОДИН раз. Поиск НЕ пересобирает её (закон 5: не innerHTML на каждую
       букву) — только прячет неподходящие кнопки. Пересозданных узлов при вводе: 0. */
    const f = document.createDocumentFragment();
    list.forEach(x => {
      const b = el('button', 'pick-it' + (opts.champs ? ' champ' : ''));
      b.dataset.q = (x.n || '').toLowerCase();
      if (x.img) { const im = el('img'); im.src = x.img; im.alt = ''; im.loading = 'lazy'; b.append(im); }
      const w = el('div', 'nm'); w.append(el('div', null, x.n));
      if (x.st) w.append(el('div', 'st', x.st));
      b.append(w);
      b.onclick = () => { onPick(x.k); closePick(); };
      f.append(b);
    });
    grid.replaceChildren(f);
    const s = box.querySelector('.pick-search');
    if (s) s.oninput = () => {
      const q = s.value.trim().toLowerCase();
      let shown = 0;
      [...grid.children].forEach(b => { const ok = !q || b.dataset.q.includes(q); b.hidden = !ok; if (ok) shown++; });
      grid.dataset.empty = shown ? '' : 'Ничего не найдено';
    };
    box.querySelector('[data-x]').onclick = closePick;
    pick.onclick = e => { if (e.target === pick) closePick(); };
    pick.append(box); document.body.append(pick);
    if (s) s.focus();
  }
  function closePick() { if (pick) { pick.remove(); pick = null; } }

  const statLine = s => Object.keys(s || {}).map(k => {
    const nm = { ad: 'AD', ap: 'AP', hp: 'HP', armor: 'броня', mr: 'МС', crit: 'крит', critDmg: 'крит.урон', as: 'ск.атаки', ah: 'ускор.', ms: 'ск.бега', ls: 'вамп', sv: 'маг.вамп', omni: 'омни', hsp: 'лечение', ten: 'стойкость', arPenFlat: 'проб.брони', arPenPct: '% проб.брони', mrPenFlat: 'маг.проб', mrPenPct: '% маг.проб' }[k] || k;
    const v = (k.endsWith('Pct') || k === 'ten' || k === 'critDmg') ? Math.round(s[k] * 100) + '%' : s[k];
    return '+' + v + ' ' + nm;
  }).join(', ');

  function pickItem(i) {
    if (i === 5) {
      const list = Object.keys(D.BOOTS).map(k => ({ k, n: D.BOOTS[k].n, img: D.IMG_ITEM(D.BOOTS[k].img), st: statLine(D.BOOTS[k].s) }));
      list.unshift({ k: null, n: '— убрать —', st: '' });
      openPick('Ботинки', list, k => { state.boots = k; paintSlot(5); refresh(); });
      return;
    }
    const list = Object.keys(D.ITEMS).map(k => ({ k, n: D.ITEMS[k].n, img: D.IMG_ITEM(D.ITEMS[k].img), st: D.ITEMS[k].cat + ' · ' + statLine(D.ITEMS[k].s) }));
    list.unshift({ k: null, n: '— убрать —', st: '' });
    openPick('Предмет в слот ' + (i + 1), list, k => { state.items[i] = k; paintSlot(i); refresh(); });
  }
  function pickRune(kind, idx) {
    if (kind === 'key') {
      const list = Object.keys(D.KEYSTONES).map(k => ({ k, n: D.KEYSTONES[k].n, img: D.IMG_RUNE(D.KEYSTONES[k].img), st: D.KEYSTONES[k].note || '' }));
      list.unshift({ k: 'none', n: '— без главной руны —', st: '' });
      openPick('Главная руна', list, k => { state.keystone = k; paintRune('key', 0); refresh(); });
    } else if (kind === 'branch') {
      const list = (D.BRANCH[idx] || []).map(r => ({ k: r.k, n: r.n, img: D.IMG_RUNE(r.img), st: statLine(r.s) + (r.note ? ' · ' + r.note : '') }));
      list.unshift({ k: null, n: '— пусто —', st: '' });
      openPick('Руна ветки · слот ' + (idx + 1), list, k => { state.branch[idx] = k; paintRune('branch', idx); refresh(); }, { search: false });
    } else {
      const list = D.SOLO.map(r => ({ k: r.k, n: r.n, img: D.IMG_RUNE(r.img), st: statLine(r.s) }));
      list.unshift({ k: null, n: '— пусто —', st: '' });
      openPick('Соло-руна', list, k => { state.solo = k; paintRune('solo', 0); refresh(); }, { search: false });
    }
  }
  /* Патч 7.2: зачарование = отдельная ACTIVE поверх ботинок, максимум одна в сборке */
  function pickEnchant() {
    const list = Object.keys(D.ENCHANTS).map(k => ({ k, n: D.ENCHANTS[k].n, img: D.IMG_ITEM(D.ENCHANTS[k].img), st: (D.ENCHANTS[k].act ? D.ENCHANTS[k].act.d + ' · ' : '') + D.ENCHANTS[k].g + ' зол · демо' }));
    list.unshift({ k: null, n: '— без зачарования —', st: '' });
    openPick('Зачарование ботинок (патч 7.2)', list, k => { state.enchant = k; refresh(); }, { search: false });
  }
  function pickChamp() {
    const list = CHAMPS.map(c => ({ k: c.dd, n: c.ru || c.dd, img: champIcon(c.dd), st: (c.meta && c.meta.tier) ? 'Тир ' + c.meta.tier : '' }));
    openPick('Чемпион', list, k => {
      state.champ = k; state.rank = {}; state.mpCur = null;
      const c = champ(); state.ab = (c.abils.find(a => a.k === 'Q') ? 'Q' : (c.abils[0] || {}).k || 'Q');
      /* ★ setSplash() отсюда УБРАН: выбор чемпа МЕНЯЛ ФОН ЭКРАНА под этого чемпа.
         Портрет чемпа — контент карточки (его обновляет refresh), фон — глобальный. */
      refresh({ hero: 1, tabs: 1 });
    }, { champs: true });
  }

  /* ══════════════════ КОМБО ════════════════════════════════════════════
     Считает последовательность применений по одной цели: HP цели падает по ходу
     (важно для %текущего/%потерянного HP), мана тратится, прок ключевой руны
     срабатывает ОДИН раз за комбо (Электрокьют — после 3 ударов), не на каждом. */
  function comboCalc() {
    const A = attacker(), d = state.dummy;
    let hp = state.hpCur == null ? d.hp : state.hpCur;
    let dmg = 0, mana = 0, maxCd = 0, procDone = false;
    const steps = [];
    (state.combo || []).forEach(k => {
      const T = E.target({ lvl: d.lvl, hp: d.hp, armor: d.armor, mr: d.mr, hpCur: hp });
      let r, name;
      if (k === 'AA') { r = E.autoAvg(A, T); r = { dmg: r.dmg, parts: [] }; name = 'Автоатака'; }
      else {
        const a = abilOf(k);
        if (!a.ranks.length) return;
        const ri = rankOf(a);
        r = E.ability(a, ri, A, T, { instances: state.view.inst });
        name = a.ru || a.name;
        const cost = a.mp ? E.perRank(a.mp, ri) || 0 : 0;
        mana += cost;
        const cd = E.perRank(a.cd, ri);
        if (cd) maxCd = Math.max(maxCd, E.cdWithHaste(cd, A.ah));
      }
      let stepDmg = r.dmg;
      if (!procDone) {                                  /* прок руны — один раз за комбо */
        const pr = runeProc(A, T);
        if (pr) { stepDmg += pr.dmg; procDone = true; }
      }
      hp = Math.max(0, hp - stepDmg);
      dmg += stepDmg;
      steps.push({ k, name, dmg: stepDmg, left: hp });
    });
    return { steps, dmg, mana, left: hp, maxCd, manaMax: Math.round(A.mp), procDone };
  }
  function paintCombo() {
    /* кнопки-добавления создаём один раз на чемпиона */
    const keys = SLOTS.filter(k => abilOf(k).ranks.length).concat('AA');
    const key = state.champ + '|' + keys.join('');
    if (R.cbAdd.dataset.key !== key) {
      const f = document.createDocumentFragment();
      keys.forEach(k => { const b = el('button', 'btn combo-btn', k === 'AA' ? 'АА' : k === 'P' ? 'Пасс' : k); b.dataset.add = k; f.append(b); });
      R.cbAdd.replaceChildren(f); R.cbAdd.dataset.key = key;
    }
    const c = comboCalc();
    const sig = (state.combo || []).join('');
    if (R.cbList.dataset.sig !== sig) {
      const f = document.createDocumentFragment();
      if (!c.steps.length) f.append(el('span', 'brk-sub', 'Собери комбо кнопками выше — посчитаю урон, ману и КД по цепочке.'));
      c.steps.forEach((s, i) => {
        const chip = el('span', 'combo-chip'); chip.dataset.del = i;
        chip.append(el('b', null, s.k === 'AA' ? 'АА' : s.k), el('span', null, s.name), el('u', null, '✕'));
        chip.title = s.name;
        f.append(chip);
      });
      R.cbList.replaceChildren(f); R.cbList.dataset.sig = sig;
    }
    [...R.cbList.querySelectorAll('.combo-chip')].forEach((chip, i) => {
      if (c.steps[i]) chip.title = c.steps[i].name + ' — ' + num(c.steps[i].dmg) + ' урона';
    });
    R.cbDmg.textContent = num(c.dmg);
    R.cbMana.textContent = c.manaMax ? num(c.mana) + ' / ' + num(c.manaMax) : '—';
    R.cbOk.textContent = !c.manaMax ? 'без ресурса' : c.mana <= c.manaMax ? 'да' : 'НЕТ';
    R.cbLeft.textContent = c.steps.length ? num(Math.round(c.left)) : '—';
    R.cbCd.textContent = c.maxCd ? num(c.maxCd, 1) + ' с' : '—';
    R.cbNote.textContent = c.steps.length
      ? (c.left <= 0 ? '💀 Комбо убивает цель.' : 'Не добивает: остаётся ' + num(Math.round(c.left)) + ' HP.')
        + (c.procDone ? ' Прок ключевой руны учтён один раз.' : '')
      : '';
  }
  function comboRun() {
    const c = comboCalc();
    if (!c.steps.length) return;
    state.hpCur = c.left; state.hits += c.steps.length;
    if (c.manaMax) state.mpCur = Math.max(0, (state.mpCur == null ? c.manaMax : state.mpCur) - c.mana);
    refresh();
    toast(c.left <= 0 ? `💀 Комбо убило за ${plural(c.steps.length, 'применение', 'применения', 'применений')}` : `Комбо: ${num(c.dmg)} урона`);
  }

  /* ══════════════════ БОЙ: УДАРИТЬ ═════════════════════════════════════ */
  function strike() {
    const res = compute();
    const d = state.dummy;
    const cur = state.hpCur == null ? d.hp : state.hpCur;
    const left = Math.max(0, cur - res.dmg);
    state.hpCur = left; state.hits++;
    /* трата ресурса */
    const a = abil(), A = res.A;
    if (a && a.mp) {
      const cost = E.perRank(a.mp, rankOf(a)) || 0;
      const mpMax = Math.round(A.mp);
      const mpCur = state.mpCur == null ? mpMax : state.mpCur;
      state.mpCur = Math.max(0, mpCur - cost);
    }
    refresh();
    if (left <= 0) { toast(`💀 Манекен убит за ${state.hits} применений`); }
  }
  function resetDummy() { state.hpCur = null; state.hits = 0; state.mpCur = null; refresh(); }

  let toastBox = null;
  function toast(txt) {
    if (!toastBox) { toastBox = el('div', 'toasts'); document.body.append(toastBox); }
    const t = el('div', 'toast glass glass--up', txt);
    toastBox.append(t);
    setTimeout(() => t.remove(), 2600);
  }

  /* ══════════════════ СОБЫТИЯ (делегирование — узлы не пересоздаём) ════ */
  function wire() {
    R.root.addEventListener('click', e => {
      const t = e.target;
      const tab = t.closest('.ab-tab');
      if (tab) { state.ab = tab.dataset.ab; [...R.abTabs.children].forEach(b => b.classList.toggle('on', b === tab)); refresh(); return; }
      const rk = t.closest('#abRank button');
      if (rk) { state.rank[state.ab] = +rk.dataset.rank; refresh({ ranks: 1 }); return; }
      const slot = t.closest('.slot'); if (slot) { pickItem(+slot.dataset.slot); return; }
      const rune = t.closest('.rune'); if (rune) { pickRune(rune.dataset.rune, +rune.dataset.idx); return; }
      const bf = t.closest('.buff'); if (bf) { state.buffs[bf.dataset.buff] = !state.buffs[bf.dataset.buff]; refresh(); return; }
      const pr = t.closest('[data-preset]');
      if (pr) { Object.assign(state.dummy, D.DUMMY[pr.dataset.preset], { preset: pr.dataset.preset }); state.hpCur = null; state.hits = 0; refresh(); return; }
      const cbA = t.closest('[data-add]');
      if (cbA) { (state.combo = state.combo || []).push(cbA.dataset.add); refresh(); return; }
      const cbD = t.closest('[data-del]');
      if (cbD) { state.combo.splice(+cbD.dataset.del, 1); refresh(); return; }
      if (t.closest('#bEnch')) { pickEnchant(); return; }
      if (t.closest('#cbRun')) { comboRun(); return; }
      if (t.closest('#cbClear')) { state.combo = []; refresh(); return; }
      if (t.closest('#cPor')) { pickChamp(); return; }
      if (t.closest('#btnHit')) { strike(); return; }
      if (t.closest('#btnReset')) { resetDummy(); return; }
    });

    R.cLvl.addEventListener('input', () => {
      state.lvl = +R.cLvl.value; state.mpCur = null;
      R.cLvlV.textContent = state.lvl;
      R.cLvlWrap.style.setProperty('--fill', ((state.lvl - 1) / 14 * 100) + '%');
      refresh({ ranks: 1 });
    });
    R.dLvl.addEventListener('input', () => { state.dummy.lvl = +R.dLvl.value; state.dummy.preset = ''; refresh(); });
    [['dHp', 'hp'], ['dAr', 'armor'], ['dMr', 'mr']].forEach(([id, k]) => {
      R[id].addEventListener('input', () => {
        state.dummy[k] = Math.max(k === 'hp' ? 1 : 0, +R[id].value || 0);
        state.dummy.preset = '';
        if (k === 'hp') state.hpCur = null;
        refresh();
      });
    });

    /* ховеры: результат → разбивка; предмет/руна → «сколько добавляет сейчас» */
    R.resBox.addEventListener('mousemove', e => showTip(tipBreakdown(compute()), e.clientX, e.clientY));
    R.resBox.addEventListener('mouseleave', hideTip);
    R.root.addEventListener('mousemove', e => {
      const s = e.target.closest('.slot,.rune');
      if (!s) return;
      const k = s.dataset.k;
      if (!k) { hideTip(); return; }
      const src = D.ITEMS[k] || D.BOOTS[k] || D.KEYSTONES[k] || D.SOLO.find(x => x.k === k) || D.BRANCH.flat().find(x => x.k === k);
      if (!src) return;
      showTip(tipSource(k, src.n, src.note || (src.demo ? 'числа статов — демо' : '')), e.clientX, e.clientY);
    });
    R.root.addEventListener('mouseleave', hideTip, true);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { closePick(); hideTip(); } });
  }

  /* ══════════════════ ФОН: СВОЕГО НЕТ ═══════════════════════════════════
     Было: свой слой .splash + splashOf(state.view.splash) + пикер арта в дев-полосе,
     причём выбор ЧЕМПА перекрашивал фон под этого чемпа (setSplash в openPick).
     Это и есть болезнь «вид ставит свою подложку»: два владельца фона на одном экране.

     Стало — два случая, оба БЕЗ своей картинки:
       · в iframe боевого (?embed=1) — подложки нет вообще, тела прозрачные,
         сквозь них видно ЕДИНУЮ подложку сайта. Наследование даром, всегда в такт.
       · отдельной страницей — рисуем ту же глобальную подложку из --splash-img
         (её ставит wr-prefs.js, ключ localStorage общий) — ни одного своего числа. */
  const EMBED = /[?&]embed=1/.test(location.search);
  function ensureBackdrop() {
    if (EMBED || R.splash) return;
    R.splash = el('div', 'splash'); document.body.prepend(R.splash);
    document.body.append(el('div', 'vignette'));
  }

  /* ══════════════════ ДЕВ-ПОЛОСА — ПЛАВАЮЩАЯ (канон-стандарт) ══════════
     Механизм ПОРТИРОВАН из lab-patch 1-в-1 (не изобретаем свой):
     плавающая панель · драг за шапку · свернуть/развернуть · строка выбора · 📋 копировать.
     Живёт только в лабе: в ?embed=1 не строится вообще.
     У КАЖДОГО БЛОКА свой сегмент «вид» — Эржан собирает экран как конструктор. */
  const VIEWS = [
    { k: 'layout', n: 'Раскладка', root: 1, o: [['three', '3 колонки'], ['bottom', 'Манекен снизу'], ['wide', '2 колонки'], ['focus', 'Фокус на уроне']] },
    { k: 'dummypos', n: 'Манекен где', root: 1, o: [['right', 'Справа'], ['left', 'Слева']] },
    { k: 'dummysize', n: 'Манекен размер', root: 1, o: [['s', 'Компакт'], ['m', 'Обычный'], ['l', 'Крупный']] },
    { k: 'brk', n: 'Разбивка урона', root: 1, o: [['formula', 'Формула'], ['total', 'Только итог'], ['bars', 'Полоса по типам'], ['ring', 'Кольцо']] },
    { k: 'build', n: 'Вид сборки', root: 1, o: [['row', 'Слоты в ряд'], ['grid', 'Сетка 3×2'], ['shop', 'Как в игре']] },
    { k: 'tabs', n: 'Вкладки умений', root: 1, o: [['letter', 'Иконка + буква'], ['text', 'Иконка + название'], ['icon', 'Только иконка'], ['compact', 'Компакт']] },
    { k: 'density', n: 'Плотность', html: 1, o: [['normal', 'Средне'], ['air', 'Просторно'], ['dense', 'Плотно']] },
    { k: 'corners', n: 'Углы', html: 1, o: [['canon', 'Канон 15'], ['soft', 'Мягкие 22'], ['sharp', 'Острые 6']] },
    { k: 'tip', n: 'Тултип разбивки', html: 1, o: [['list', 'Список'], ['icons', 'С иконками'], ['compact', 'Компакт']] },
    { k: 'growth', n: 'Рост статов', calc: 1, o: [['curve', 'Кривая Riot (§12)'], ['linear', 'Линейный (боевой)']] },
    { k: 'inst', n: 'Инстансы урона', calc: 1, o: [['all', 'Все попадания'], ['first', 'Только основное']] },
    /* ★ Сегмент «Сплэш-арт» УДАЛЁН из дев-полосы: у калькулятора нет и не может быть
       своего выбора фона. Арт один на весь сайт и выбирается в ⚙ (wr-prefs). */
  ];
  const viewLabel = v => (v.o.find(o => o[0] === state.view[v.k]) || v.o[0])[1];

  /* варианты вида применяются АТРИБУТАМИ — узлы не пересоздаются */
  function applyViews() {
    VIEWS.forEach(v => {
      if (v.root) R.root.dataset[v.k] = state.view[v.k];
      if (v.html) document.documentElement.dataset[v.k] = state.view[v.k];
    });
  }

  function buildDev() {
    const strip = el('div', 'lab-strip'); strip.id = 'labStrip';
    const head = el('div', 'strip-head'); head.id = 'stripHead';
    head.innerHTML = `<span class="strip-title">⋮⋮ Дизайн-полоса — Калькулятор</span>
      <span class="strip-sub">виды блоков · для нас, на боевой едет только выбранное</span>
      <span class="strip-btns"><span id="labTools"></span>
        <button class="btn" id="stripCopy">📋 Мой выбор</button>
        <button class="btn" id="stripAudit">🔢 Счётчик узлов</button>
        <button class="btn" id="stripMin">Свернуть</button></span>`;
    const body = el('div', 'strip-body');
    VIEWS.forEach(v => {
      const row = el('div', 'strip-group'); row.append(el('label', null, v.n));
      const seg = el('div', 'seg');
      v.o.forEach(([val, lbl]) => {
        const b = el('button', state.view[v.k] === val ? 'on' : '', lbl);
        b.onclick = () => {
          state.view[v.k] = val;
          [...seg.children].forEach(x => x.classList.toggle('on', x === b));
          applyViews();
          if (v.calc) refresh();                     /* меняет ЧИСЛА → пересчёт */
          else if (v.k === 'brk' || v.k === 'tabs' || v.k === 'build') refresh();  /* меняет ТЕКСТ узлов */
          updateChoice(); save();
        };
        seg.append(b);
      });
      row.append(seg); body.append(row);
    });
    const choice = el('div', 'strip-choice'); choice.id = 'stripChoice';
    strip.append(head, body, choice);
    document.body.append(strip);
    updateChoice();

    const minBtn = document.getElementById('stripMin');
    const applyMin = () => {
      strip.classList.toggle('min', !!state.strip.min);
      minBtn.textContent = state.strip.min ? 'Развернуть' : 'Свернуть';
    };
    minBtn.onclick = () => { state.strip.min = !state.strip.min; applyMin(); save(); };
    applyMin();
    if (state.strip.x != null) { strip.style.transform = 'none'; strip.style.left = state.strip.x + 'px'; strip.style.top = state.strip.y + 'px'; strip.style.right = 'auto'; }
    document.getElementById('stripCopy').onclick = function () {
      const self = this;
      navigator.clipboard.writeText(choiceStr()).then(() => {
        self.textContent = '✓ Скопировано';
        setTimeout(() => { self.textContent = '📋 Мой выбор'; }, 1400);
      });
    };
    document.getElementById('stripAudit').onclick = () => {
      const r = window.CALC_AUDIT();
      toast(r.map(x => `${x.action}: ${x.survived}/${x.before}`).join(' · '));
      console.table(r);
    };
    /* драг за шапку (pointer events, как в lab-patch) */
    let drag = false, dx = 0, dy = 0;
    head.addEventListener('pointerdown', ev => {
      if (ev.target.closest('button')) return;
      const r = strip.getBoundingClientRect();
      strip.style.transform = 'none'; strip.style.right = 'auto'; strip.style.left = r.left + 'px'; strip.style.top = r.top + 'px';
      dx = ev.clientX - r.left; dy = ev.clientY - r.top; drag = true; head.setPointerCapture(ev.pointerId);
    });
    head.addEventListener('pointermove', ev => {
      if (!drag) return;
      strip.style.left = Math.max(0, Math.min(innerWidth - 80, ev.clientX - dx)) + 'px';
      strip.style.top = Math.max(0, Math.min(innerHeight - 40, ev.clientY - dy)) + 'px';
    });
    head.addEventListener('pointerup', () => {
      if (!drag) return; drag = false;
      state.strip.x = parseFloat(strip.style.left) || 0; state.strip.y = parseFloat(strip.style.top) || 0; save();
    });

    /* общий пульт лабов: автосохранение набора + 📋 Код / 📥 Вставить + пресеты */
    if (window.LabSettings) {
      LS = LabSettings.attach({
        id: 'calc-main', defaults: JSON.parse(JSON.stringify(DEFAULTS)), mount: '#labTools',
        getState: () => state,
        apply: st => {
          state = Object.assign({}, JSON.parse(JSON.stringify(DEFAULTS)), st);
          applyViews();
          paintTabs(); for (let i = 0; i < 6; i++) paintSlot(i);
          paintRune('key', 0); [0, 1, 2].forEach(i => paintRune('branch', i)); paintRune('solo', 0);
          refresh({ hero: 1 }); updateChoice();
        },
      });
    }
  }
  const choiceStr = () => VIEWS.map(v => v.n + ': ' + viewLabel(v)).join(' · ');
  function updateChoice() {
    const c = document.getElementById('stripChoice');
    if (c) c.innerHTML = 'Текущий выбор: <b>' + choiceStr() + '</b>';
  }

  /* ══════════════════ ПРИЁМКА СЧЁТЧИКОМ УЗЛОВ ═════════════════════════ */
  window.CALC_AUDIT = function () {
    const root = R.root;
    const run = (name, fn) => {
      const before = [...root.querySelectorAll('*')];
      before.forEach(n => n.__keep = 1);
      fn();
      const after = [...root.querySelectorAll('*')];
      const survived = after.filter(n => n.__keep).length;
      return { action: name, before: before.length, after: after.length, survived, recreated: before.length - survived };
    };
    const out = [];
    out.push(run('уровень 11→12', () => { state.lvl = 12; refresh({ ranks: 1 }); }));
    out.push(run('предмет в слот 1', () => { state.items[0] = state.items[0] === 'luden' ? 'iorb' : 'luden'; paintSlot(0); refresh(); }));
    out.push(run('смена умения Q→W', () => { state.ab = state.ab === 'Q' ? 'W' : 'Q'; refresh(); }));
    out.push(run('броня манекена +50', () => { state.dummy.armor += 50; refresh(); }));
    out.push(run('УДАРИТЬ', () => strike()));
    out.push(run('добавить шаг комбо', () => { (state.combo = state.combo || []).push('Q'); refresh(); }));
    out.push(run('руна ветки', () => {
      state.branch[1] = state.branch[1] === 'axiom' ? 'sudden' : 'axiom'; paintRune('branch', 1); refresh();
    }));
    out.push(run('смена чемпиона', () => {
      const other = CHAMPS.find(c => c.dd !== state.champ && c.abils.some(a => a.ranks.length));
      state.champ = other.dd; state.rank = {}; state.mpCur = null; refresh({ hero: 1, tabs: 1 });
    }));
    /* буква в поиске пикера — раньше именно тут была полная перерисовка сетки */
    const pickRun = (name, fn) => {
      pickChamp();
      const box = document.querySelector('.pick-grid');
      const before = [...box.querySelectorAll('*')]; before.forEach(n => n.__keep = 1);
      fn(document.querySelector('.pick-search'));
      const after = [...box.querySelectorAll('*')];
      const r = { action: name, before: before.length, after: after.length, survived: after.filter(n => n.__keep).length };
      r.recreated = r.before - r.survived; closePick(); return r;
    };
    out.push(pickRun('буква в поиске пикера', s => { s.value = 'ари'; s.oninput(); }));
    /* смена ВАРИАНТА ВИДА из дев-полосы: должна быть чистой сменой атрибута */
    const vrun = (k, v) => run('вид: ' + k + '→' + v, () => {
      state.view[k] = v; applyViews();
      if (k === 'brk' || k === 'tabs' || k === 'build') refresh();
      updateChoice();
    });
    out.push(vrun('layout', 'bottom'));
    out.push(vrun('dummysize', 'l'));
    out.push(vrun('density', 'dense'));
    out.push(vrun('corners', 'sharp'));
    out.push(vrun('tabs', 'text'));
    out.push(vrun('build', 'shop'));
    out.push(vrun('brk', 'ring'));
    out.push(vrun('brk', 'formula'));
    return out;
  };

  /* ══════════════════ СТАРТ ═══════════════════════════════════════════ */
  function init() {
    if (!CHAMPS.length) { document.body.innerHTML = '<p style="padding:40px">Нет данных wr-data.js</p>'; return; }
    if (!champ().abils.some(a => a.k === state.ab)) state.ab = 'Q';
    build();
    applyViews();                 /* виды = data-атрибуты, первый кадр сразу правильный */
    ensureBackdrop();             /* только слои; КАРТИНКУ даёт --splash-img, не мы */
    paintTabs();
    for (let i = 0; i < 6; i++) { R.bSlots.children[i].dataset.k = '_'; paintSlot(i); }
    R.bRunes.querySelectorAll('.rune').forEach(b => b.dataset.k = '_');
    paintRune('key', 0); [0, 1, 2].forEach(i => paintRune('branch', i)); paintRune('solo', 0);
    refresh({ hero: 1 });
    if (!/[?&]embed=1/.test(location.search)) buildDev();
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
