/* ═══════════════════════════════════════════
   КАПИТАНСТВО · coach.js — считалка драфта.

   Три слоя, каждый объясняет себя словами:
     1. evaluateTeam  — что состав умеет и где у него дыры
     2. patterns      — фирлес-приёмы: отказ, дабл-пик, форс, безопасный FP, флекс
     3. advise        — какой ход делать и почему

   ЧЕСТНОСТЬ. Это считалка по записанным правилам, а не нейросеть.
   Каждый вывод несёт разбор: какое правило сработало и на каких данных.
   Проценты матчапов НЕ используются, пока knowledge.policy.useStatWinrate = false
   (источник заморожен) — берём только НАПРАВЛЕНИЕ пары, оно из механики.
   ═══════════════════════════════════════════ */
(function (root, factory) {
  var lib = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  if (root) root.CaptaincyCoach = lib;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var FUNCS = ['frontline', 'engage', 'carry', 'waveclear', 'peel'];
  var LANES = ['Top', 'Jungle', 'Mid', 'Adc', 'Support'];

  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
  function sum(a) { return a.reduce(function (s, x) { return s + x; }, 0); }

  /* ── СОСТАВ: что умеет, где дыры ─────────────────────────────────────── */
  function evaluateTeam(KB, picks, opts) {
    opts = opts || {};
    var champs = picks.map(function (p) { return KB.idx.champ(typeof p === 'string' ? p : p.champ); }).filter(Boolean);
    var R = KB.rules, why = [], score = 0;

    // 1. Пять функций: закрыта или дыра
    var cover = {}, holes = [];
    FUNCS.forEach(function (f) {
      var who = champs.filter(function (c) { return c.funcs && c.funcs[f]; });
      cover[f] = who.map(function (c) { return c.ru || c.dd; });
      var w = R.functions[f].weight;
      if (who.length) {
        score += w;
        why.push({ kind: 'func', ok: true, text: R.functions[f].ru + ' — есть (' + cover[f].join(', ') + ')' });
      } else if (champs.length >= 3) {
        // На двух пиках дыра ещё ничего не значит — состав не собран
        score -= w;
        holes.push(f);
        why.push({ kind: 'func', ok: false, weight: w, text: R.functions[f].ru + ': ' + R.functions[f].hole });
      }
    });

    // 2. Баланс урона. Штрафуем моно-урон ТОЛЬКО против танков и брузеров.
    var ad = champs.filter(function (c) { return c.funcs && c.funcs.lean === 'ad'; }).length;
    var ap = champs.filter(function (c) { return c.funcs && c.funcs.lean === 'ap'; }).length;
    var mix = { ad: ad, ap: ap };
    if (champs.length >= 4 && (ad === 0 || ap === 0)) {
      var enemyTanky = (opts.enemy || []).filter(function (n) {
        var c = KB.idx.champ(n); return c && c.funcs && c.funcs.frontline;
      }).length;
      if (enemyTanky > 0) {
        score -= R.functions.damageMix.weight;
        holes.push('damageMix');
        why.push({ kind: 'mix', ok: false, weight: R.functions.damageMix.weight,
          text: 'Весь урон одного типа (' + (ad ? 'физический' : 'магический') + '), а у них ' + enemyTanky
              + ' в фронтлайне — купят одну защиту и обнулят нас.' });
      } else {
        why.push({ kind: 'mix', ok: true, text: 'Моно-урон, но у них нет танков — не наказываем: умрут раньше брони.' });
      }
    }

    // 3. Архетип состава — по механикам, не по именам
    var arch = detectArchetype(KB, champs);

    // 4. Связки и анти-связки
    var syn = findSynergies(KB, champs);
    syn.good.forEach(function (s) { score += s.weight; why.push({ kind: 'synergy', ok: true, text: s.text }); });
    syn.bad.forEach(function (s) { score -= s.weight; why.push({ kind: 'synergy', ok: false, weight: s.weight, text: s.text }); });

    return {
      score: score, funcs: cover, holes: holes, mix: mix,
      archetype: arch, synergies: syn, why: why,
      picks: champs.map(function (c) { return c.ru || c.dd; }),
    };
  }

  function detectArchetype(KB, champs) {
    var A = KB.archetypes.archetypes, best = null;
    Object.keys(A).forEach(function (key) {
      var a = A[key], need = (a.tags && a.tags.need) || [], avoid = (a.tags && a.tags.avoid) || [];
      var hits = champs.filter(function (c) {
        var t = c.tags || [];
        return need.some(function (x) { return t.indexOf(x) !== -1; })
            && !avoid.some(function (x) { return t.indexOf(x) !== -1; });
      }).length;
      if (!best || hits > best.hits) best = { key: key, ru: a.ru, hits: hits, beatenBy: a.beatenBy, why: a.why };
    });
    return best && best.hits >= 2 ? best : null;
  }

  /* Связка засчитывается, только если механики совпали у РАЗНЫХ чемпионов.
     Сила растёт от числа совпадений: одно — намёк, три — настоящая связка. */
  function findSynergies(KB, champs) {
    var good = [], bad = [];
    (KB.synergies.byMechanic || []).forEach(function (r) {
      var A = champs.filter(function (c) { return r.a.some(function (t) { return (c.tags || []).indexOf(t) !== -1; }); });
      var B = champs.filter(function (c) { return r.b.some(function (t) { return (c.tags || []).indexOf(t) !== -1; }); });
      var pairs = [];
      A.forEach(function (a) { B.forEach(function (b) { if (a !== b) pairs.push([a, b]); }); });
      if (!pairs.length) return;
      var p = pairs[0];
      // один и тот же чемп в обеих ролях — связки нет; вес режем на слабых совпадениях
      var strength = Math.min(r.weight, 1 + Math.floor(pairs.length / 2));
      good.push({ id: r.id, weight: strength,
        text: r.say.replace('{a}', p[0].ru || p[0].dd).replace('{b}', p[1].ru || p[1].dd) });
    });

    var hasCC = champs.some(function (c) { return ['cc_hard', 'cc_knockup', 'cc_root', 'cc_slow'].some(function (t) { return (c.tags || []).indexOf(t) !== -1; }); });
    if (champs.length >= 3 && !hasCC) {
      bad.push({ id: 'no_cc_gank', weight: 3, text: 'Ни у кого нет надёжного контроля — приходить на ганк нечем, цель просто уходит.' });
    }
    var allMelee = champs.length >= 4 && champs.every(function (c) { return (c.tags || []).indexOf('melee') !== -1; });
    if (allMelee) bad.push({ id: 'all_melee', weight: 4, text: 'Весь состав ближнего боя — будут поукать до объекта, а зайти нечем.' });

    return { good: good, bad: bad };
  }

  /* ── МАТЧАП: только направление, без процентов ───────────────────────────
     Ищем в ОБОИХ файлах: пара может быть записана только у одного из двоих.
     Без указания линии не хватаем первую попавшуюся — собираем все и отдаём
     ту, где линия совпала, иначе самую подтверждённую. Иначе выходило, что
     «Джакс против Камиллы» отвечал по МИДУ, когда речь про ТОП. */
  function collectRows(KB, a, b) {
    var out = [], aName = KB.idx.nameOf(a), bName = KB.idx.nameOf(b);
    [[a, false], [b, true]].forEach(function (pair) {
      var m = KB.matchups.of(pair[0]);
      if (!m || !m.lanes) return;
      var other = pair[1] ? aName : bName;
      Object.keys(m.lanes).forEach(function (lane) {
        (m.lanes[lane] || []).forEach(function (row) {
          if (KB.idx.nameOf(row.opponent) !== other) return;
          // Файл чемпа Б смотрит с его стороны — переворачиваем вердикт к нашей.
          var winner = row.verdict === 'counteredBy'
            ? (pair[1] ? aName : bName)
            : (pair[1] ? bName : aName);
          out.push({ lane: lane, winner: winner, row: row, fromOther: pair[1] });
        });
      });
    });
    return out;
  }

  function rowConfidence(row) {
    var c = 1;
    if (row.stat) c += 2;                                   // трекер видел эту пару
    if (row.ed && row.ed.s && row.ed.s.length > 1) c += 1;  // подтверждена двумя изданиями
    if (row.disagree) c -= 1;                               // источники спорят
    return c;
  }

  /* Пара, записанная капитаном, бьёт любой скрейп: источники редакционные,
     тонкие и местами перевёрнутые, а тут живой опыт с площадки. */
  function noteMatchup(KB, ours, theirs, lane) {
    var pairs = (KB.notes.matchups && KB.notes.matchups.pairs) || [];
    var o = KB.idx.nameOf(ours), t = KB.idx.nameOf(theirs);
    for (var i = 0; i < pairs.length; i++) {
      var p = pairs[i], a = KB.idx.nameOf(p.a), b = KB.idx.nameOf(p.b);
      if (lane && p.lane && p.lane !== lane) continue;
      if (a === o && b === t) return { winner: o, p: p };
      if (a === t && b === o) return { winner: t, p: p };
    }
    return null;
  }

  function matchup(KB, ours, theirs, lane) {
    var note = noteMatchup(KB, ours, theirs, lane);
    if (note) {
      return {
        lane: note.p.lane || lane || null, winner: note.winner,
        loser: note.winner === KB.idx.nameOf(ours) ? KB.idx.nameOf(theirs) : KB.idx.nameOf(ours),
        ourEdge: note.winner === KB.idx.nameOf(ours),
        why: [note.p.why], whyIdx: [], weightHint: note.p.weight || 4, disagree: false,
        confidence: 5 + (note.p.weight || 0),
        fromCaptain: true, sourceDate: null, source: note.p.source || 'заметка капитана',
      };
    }
    var rows = collectRows(KB, ours, theirs);
    if (!rows.length) return null;
    var pick = null;
    if (lane) pick = rows.filter(function (r) { return r.lane === lane; })[0] || null;
    if (!pick) {
      if (lane) return null;                                // спросили про линию — не подменяем другой
      pick = rows.slice().sort(function (x, y) { return rowConfidence(y.row) - rowConfidence(x.row); })[0];
    }
    var row = pick.row;
    var texts = (row.why || []).map(function (n) { return KB.whyRules[n] && KB.whyRules[n].text; }).filter(Boolean);
    var out = {
      lane: pick.lane, winner: pick.winner,
      loser: pick.winner === KB.idx.nameOf(ours) ? KB.idx.nameOf(theirs) : KB.idx.nameOf(ours),
      ourEdge: pick.winner === KB.idx.nameOf(ours),
      why: texts, whyIdx: (row.why || []), disagree: !!row.disagree,
      confidence: rowConfidence(row),
      lanesFound: uniq(rows.map(function (r) { return r.lane; })),
      sourceDate: (row.stat && row.stat.date) || (row.ed && row.ed.date) || null,
    };
    /* Двойной замок: политика разрешила И застава свежести пропустила.
       Без этого число из апрельского гайда могло просочиться в совет. */
    if (KB.policy.useStatWinrate && row.stat && !row.stat.weak) {
      var wr = KB.num ? KB.num('guides', row.stat.wr) : null;
      if (wr !== null) { out.wr = wr; out.rank = row.stat.rank; }
    }
    if (out.wr === undefined && KB.staleNote) out.noNumbers = KB.staleNote('guides');
    return out;
  }

  /* ── СИЛА КОНТРЫ С УЧЁТОМ СИЛЫ ЧЕМПОВ ────────────────────────────────────
     Контра — не константа. Против сломанно-сильного чемпа обычная контра
     не работает: она держится на размене, а размен выигрывает тот, кто просто
     сильнее. Работают только МЕХАНИЧЕСКИЕ контры — механику тиром не перекачать.
     Модель владельца: абсолютная / промежуточная / относительная. */
  var TIER_NUM = { 'S+': 5, S: 4, A: 3, B: 2, C: 1, D: 0 };

  function tierOf(KB, champ, state) {
    // капитанский тир перебивает авто: мета региональна
    var over = KB.notes.tiers && KB.notes.tiers[KB.idx.nameOf(champ)];
    if (over) return { tier: over, num: TIER_NUM[over], fromCaptain: true };
    var m = KB.idx.meta(champ, state && state.rank);
    if (!m || TIER_NUM[m.tier] === undefined) return null;
    return { tier: m.tier, num: TIER_NUM[m.tier], pr: m.pr, fromCaptain: false };
  }

  /* Тип контры выводится из того, ЧЕМ она объяснена:
     сильное механическое правило — абсолютная, слабое — промежуточная,
     нечем объяснить (только редакция/статистика) — относительная. */
  /* Абсолютной считаем только ту контру, что механику ОТМЕНЯЕТ, а не мешает ей.
     Отменяют — невосприимчивость, щит от умений, парирование, блок снарядов,
     уклонение от автоатак, невыбираемость целью. Всё остальное упирается
     в размен, а размен выигрывает тот, кто просто сильнее. */
  var NEGATORS = ['cc_immune', 'cc_spellshield', 'cc_parry', 'block_proj', 'dodge_auto', 'untargetable'];

  function counterType(KB, mu) {
    if (mu && mu.fromCaptain) return (mu.weightHint >= 5) ? 'absolute' : 'mixed';
    var best = 0, negates = false;
    (mu && mu.whyIdx || []).forEach(function (i) {
      var r = KB.whyRules[i]; if (!r) return;
      if (r.weight > best) best = r.weight;
      if (NEGATORS.indexOf(r.tag) !== -1 && r.weight >= 4) negates = true;
    });
    if (negates) return 'absolute';
    if (best >= 3) return 'mixed';
    return 'scaled';
  }

  function counterStrength(KB, counterChamp, strongChamp, state, lane) {
    var mu = matchup(KB, counterChamp, strongChamp, lane);
    if (!mu || !mu.ourEdge) return null;
    var type = mu.type || counterType(KB, mu);
    var ts = tierOf(KB, strongChamp, state), tc = tierOf(KB, counterChamp, state);
    var gap = (ts && tc) ? Math.max(0, ts.num - tc.num) : 0;

    var mod = 1, note = null;
    if (type === 'scaled') {
      mod = Math.max(0, 1 - 0.2 * gap);
      if (gap >= 2) note = 'разрыв в силе ' + gap + ' тира — контра почти не сработает';
    } else if (type === 'mixed') {
      mod = Math.max(0.4, 1 - 0.1 * gap);
      if (gap >= 3) note = 'мешает, но при таком разрыве не решает';
    } else {
      note = 'абсолютная контра: держится на механике, тир тут не решает';
    }

    return {
      type: type, tierGap: gap, modifier: Math.round(mod * 100) / 100,
      effective: Math.round(mod * 100) / 100,
      strongTier: ts && ts.tier, counterTier: tc && tc.tier,
      captainTier: !!(ts && ts.fromCaptain) || !!(tc && tc.fromCaptain),
      why: mu.why, note: note,
      works: mod >= 0.5,
    };
  }

  /* Есть ли вообще АБСОЛЮТНЫЙ ответ на сломанного чемпа среди доступных.
     Нет — значит его надо банить, а не пытаться перепикать. */
  function absoluteAnswers(KB, strongChamp, state, lane) {
    var unavail = availability(KB, state);
    var out = [];
    KB.idx.names.forEach(function (n) {
      if (unavail[n] || n === KB.idx.nameOf(strongChamp)) return;
      var cs = counterStrength(KB, n, strongChamp, state, lane);
      if (cs && cs.type === 'absolute') out.push({ champ: n, ru: ru(KB, n), why: cs.why[0] || null });
    });
    return out;
  }

  /* ── ФИРЛЕС: насколько опасно брать чемпа вслепую ─────────────────────── */
  function blindRisk(KB, champ, state) {
    var m = KB.matchups.of(champ);
    if (!m || !m.lanes) return { risk: 0, killers: [], dead: [], note: 'матчапов по нему нет — риск не посчитать' };
    var gone = {};
    (state.fearlessUsed || []).forEach(function (n) { var k = KB.idx.nameOf(n); if (k) gone[k] = 'сгорел в серии'; });
    (state.bans && state.bans.blue || []).concat(state.bans && state.bans.red || []).forEach(function (n) {
      var k = KB.idx.nameOf(n); if (k) gone[k] = 'забанен';
    });
    var pool = state.enemyPool && state.enemyPool.length ? state.enemyPool.map(KB.idx.nameOf).filter(Boolean) : null;

    /* ВЕС КОНТРЫ. Процентов у нас нет (политика их выключила), поэтому силу
       считаем по тому, что осталось честного: подтверждённость источниками и
       насколько чемпа вообще берут. Иначе «27 контр» — бесполезное число, где
       Фиора весит столько же, сколько случайный редакционный совет. */
    var weigh = function (row, opp) {
      var w = rowConfidence(row);
      var meta = KB.idx.meta(opp, state.rank);
      if (meta) {
        w += ({ 'S+': 2, S: 1.5, A: 1, B: 0.5 })[meta.tier] || 0;
        if ((meta.pr || 0) >= 5) w += 0.5;   // его часто берут — угроза реальная
      }
      return Math.round(w * 10) / 10;
    };

    var killers = [], dead = [];
    var capPairs = (KB.notes.matchups && KB.notes.matchups.pairs) || [];
    var me = KB.idx.nameOf(champ);

    // Кого капитан назвал ПОБЕЖДЁННЫМ нашим чемпом — тот контрой быть не может.
    // Скрейп местами перевёрнут (Вуконг стоял контрой Олафа, хотя всё наоборот),
    // и молча тащить это в расчёт нельзя.
    var refuted = {};
    capPairs.forEach(function (p) {
      if (KB.idx.nameOf(p.a) === me) refuted[KB.idx.nameOf(p.b)] = p;
    });

    // Контры, названные капитаном: тяжелее любого скрейпа.
    capPairs.forEach(function (p) {
      if (KB.idx.nameOf(p.b) !== me) return;
      var opp = KB.idx.nameOf(p.a); if (!opp) return;
      var item = { champ: opp, lane: p.lane || null, ru: (KB.idx.champ(opp) || {}).ru || opp,
        weight: 5 + (p.weight || 0), fromCaptain: true, note: p.why };
      if (gone[opp]) { item.why = gone[opp]; dead.push(item); return; }
      if (pool && pool.indexOf(opp) === -1) { item.why = 'нет в пуле соперника'; dead.push(item); return; }
      killers.push(item);
    });
    Object.keys(m.lanes).forEach(function (lane) {
      (m.lanes[lane] || []).forEach(function (row) {
        if (row.verdict !== 'counteredBy') return;
        var opp = KB.idx.nameOf(row.opponent); if (!opp) return;
        if (refuted[opp]) return;   // капитан сказал обратное — пара выкинута
        var item = { champ: opp, lane: lane, ru: (KB.idx.champ(opp) || {}).ru || opp, weight: weigh(row, opp) };
        if (gone[opp]) { item.why = gone[opp]; dead.push(item); return; }
        // Пула врага нет — считаем, что доступен любой. Есть — учитываем только их чемпов.
        if (pool && pool.indexOf(opp) === -1) { item.why = 'нет в пуле соперника'; dead.push(item); return; }
        killers.push(item);
      });
    });
    killers = uniqBy(killers, 'champ').sort(function (a, b) { return b.weight - a.weight; });
    dead = uniqBy(dead, 'champ').sort(function (a, b) { return b.weight - a.weight; });

    var total = killers.reduce(function (s, k) { return s + k.weight; }, 0);
    var removed = dead.reduce(function (s, k) { return s + k.weight; }, 0);
    return {
      risk: Math.round(total * 10) / 10,
      removedRisk: Math.round(removed * 10) / 10,
      // «Главные» — те, кто заметно тяжелее остальных: их и называем вслух.
      main: killers.slice(0, 3),
      killers: killers, dead: dead,
      count: killers.length,
    };
  }

  function uniqBy(arr, key) {
    var seen = {}, out = [];
    arr.forEach(function (x) { if (!seen[x[key]]) { seen[x[key]] = 1; out.push(x); } });
    return out;
  }

  /* ── ФЛЕКС: на скольких линиях реально играется ──────────────────────── */
  function flexOf(KB, champ) {
    var c = KB.idx.champ(champ); if (!c) return { lanes: [], n: 0 };
    var lanes = (c.lanes || []).filter(function (l) { return LANES.indexOf(l) !== -1; });
    return { lanes: lanes, n: lanes.length };
  }

  /* ── ДОСТУПНОСТЬ ─────────────────────────────────────────────────────── */
  function availability(KB, state) {
    var out = {};
    var mark = function (list, why) {
      (list || []).forEach(function (n) { var k = KB.idx.nameOf(n && n.champ ? n.champ : n); if (k && !out[k]) out[k] = why; });
    };
    mark(state.bans && state.bans.blue, 'забанен');
    mark(state.bans && state.bans.red, 'забанен');
    mark(state.picks && state.picks.blue, 'взят');
    mark(state.picks && state.picks.red, 'взят');
    mark(state.fearlessUsed, 'сгорел в серии');
    mark(state.globalBans, 'глобальный бан');
    return out;
  }

  function names(list) { return (list || []).map(function (p) { return p && p.champ ? p.champ : p; }).filter(Boolean); }

  /* ── ЦЕННОСТЬ ЧЕМПА ДЛЯ СТОРОНЫ ──────────────────────────────────────── */
  function valueFor(KB, champ, side, state, rank) {
    var c = KB.idx.champ(champ); if (!c) return { value: -99, why: [] };
    var mine = names(state.picks && state.picks[side]);
    var theirSide = side === 'blue' ? 'red' : 'blue';
    var theirs = names(state.picks && state.picks[theirSide]);
    var why = [], v = 0;

    // закрывает дыру состава
    var before = evaluateTeam(KB, mine, { enemy: theirs });
    var after = evaluateTeam(KB, mine.concat([champ]), { enemy: theirs });
    var delta = after.score - before.score;
    v += delta;
    if (delta > 0 && before.holes.length) {
      var closed = before.holes.filter(function (h) { return after.holes.indexOf(h) === -1; });
      if (closed.length) why.push({ kind: 'hole', text: 'закрывает: ' + closed.map(function (h) { return KB.rules.functions[h].ru; }).join(', ') });
    }

    // матчапы против уже показанных врагов
    theirs.forEach(function (t) {
      var mu = matchup(KB, champ, t);
      if (!mu) return;
      if (mu.ourEdge) { v += 2; why.push({ kind: 'matchup', text: 'забирает ' + ru(KB, t) + (mu.why[0] ? ' — ' + mu.why[0] : ''), date: mu.sourceDate }); }
      else { v -= 2; why.push({ kind: 'matchup', bad: true, text: ru(KB, t) + ' его разбирает' + (mu.why[0] ? ' — ' + mu.why[0] : ''), date: mu.sourceDate }); }
    });

    // мета: тир из свежей статистики
    var meta = KB.idx.meta(champ, rank);
    if (meta) {
      var bonus = { 'S+': 3, S: 2, A: 1, B: 0, C: -1, D: -2 }[meta.tier];
      /* Тир на крошечном пикрейте — шум, а не сила: чемпа взяли пару раз,
         выиграли, и он «S+». Такой тир вытаскивал в советы чемпов, которых
         никто не играет. Доверие к тиру растёт вместе с пикрейтом. */
      if (bonus > 0) {
        var pr = meta.pr || 0;
        var trust = pr >= 4 ? 1 : pr >= 2 ? 0.6 : pr >= 1 ? 0.25 : 0;
        bonus = Math.round(bonus * trust * 10) / 10;
        if (!bonus) why.push({ kind: 'meta', text: 'тир ' + meta.tier + ' при пикрейте '
          + pr + '% — выборка мала, в вес не берём' });
      }
      if (bonus !== undefined) {
        v += bonus;
        // roleMismatch — статистика приписала чемпу линию, на которой он не играется.
        // Роль в таком случае не называем: соврём.
        if (bonus) why.push({ kind: 'meta', text: 'тир ' + meta.tier
          + (meta.roleMismatch ? '' : ' (' + meta.role + ')') + ', данные ' + fmtDate(meta.date) });
      }
    }

    // флекс — прячет распределение линий, ценен только пока роли не назначены
    var fx = flexOf(KB, champ);
    if (fx.n >= 2 && !state.rolesLocked) {
      v += 1.5;
      why.push({ kind: 'flex', text: 'играется на ' + fx.lanes.join(' и ') + ' — не показываем распределение' });
    }

    // ручные заметки владельца перебивают автоматику
    (KB.notes.notes || []).forEach(function (n) {
      if (!n.id) return;
      if (n.id === 'olaf_fears_fiora' && KB.idx.nameOf(champ) === 'Olaf') {
        var br = blindRisk(KB, champ, state);
        var fioraGone = br.dead.some(function (d) { return d.champ === 'Fiora'; });
        if (fioraGone) { v += n.weight; why.push({ kind: 'note', text: 'заметка капитана: ' + n.alsoWhen }); }
        else if (mine.length === 0) { v -= n.weight; why.push({ kind: 'note', bad: true, text: 'заметка капитана: ' + n.because }); }
      }
    });

    return { value: v, why: why };
  }

  function ru(KB, n) { var c = KB.idx.champ(n); return (c && c.ru) || n; }
  function fmtDate(d) {
    if (!d) return 'без даты';
    var s = String(d);
    return s.length === 8 ? s.slice(6, 8) + '.' + s.slice(4, 6) + '.' + s.slice(0, 4) : s;
  }

  return {
    FUNCS: FUNCS, LANES: LANES,
    evaluateTeam: evaluateTeam, detectArchetype: detectArchetype, findSynergies: findSynergies,
    matchup: matchup, blindRisk: blindRisk, flexOf: flexOf,
    counterStrength: counterStrength, counterType: counterType, tierOf: tierOf,
    absoluteAnswers: absoluteAnswers,
    availability: availability, valueFor: valueFor, names: names, ru: ru,
  };
});
