/* ═══════════════════════════════════════════
   КАПИТАНСТВО · advise.js — советник.

   На вход СОСТОЯНИЕ драфта, на выход — ЛИНИИ хода с ценой каждой.
   Не один «правильный ход»: настоящие тренеры приносят на разбор
   несколько вариантов, и команда выбирает (см. ban-strategy.json).

   Порядок ходов берём из draft-logic.js — того же кода, что крутит
   живой драфт. Значит советник и игра всегда согласованы.
   ═══════════════════════════════════════════ */
(function (root, factory) {
  var lib = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  if (root) root.CaptaincyAdvise = lib;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var C = (typeof module !== 'undefined' && module.exports)
    ? require('./coach.js') : (root && root.CaptaincyCoach);
  var DL = (typeof module !== 'undefined' && module.exports)
    ? require('../../draft-logic.js') : (root && root.DraftLogic);

  function other(side) { return side === 'blue' ? 'red' : 'blue'; }

  // Минимум известных матчапов, чтобы вообще судить о чемпе как о слепом пике
  var MIN_KNOWN = 8;

  /* Шаг драфта: чей ход, бан или пик, и есть ли у нас следующий подряд. */
  function stepInfo(state) {
    var idx = state.turnIndex || 0;
    var seq = DL.WR_DRAFT_SEQUENCE;
    var step = seq[idx] || null;
    if (!step) return { done: true };
    var next = seq[idx + 1] || null;
    return {
      done: false, idx: idx, side: step.side, action: step.action, phase: step.phase,
      isDouble: !!(next && next.side === step.side && next.action === step.action),
      /* Когда мы ходим ПОСЛЕ текущей серии своих ходов. При дабл-пике сосед
         idx+1 — это наш же второй пик, он нам не «следующий ход»: вопрос
         «доживёт ли чемп» относится к пику ПОСЛЕ того, как враг отходит. */
      nextOwnPick: (function () {
        var i = idx;
        while (i + 1 < seq.length && seq[i + 1].side === step.side) i++;  // конец нашей серии
        for (var j = i + 1; j < seq.length; j++) {
          if (seq[j].side !== step.side) continue;
          if (seq[j].action === 'pick') return j;
        }
        return null;
      })(),
      // сколько ходов сделает враг, пока мы ждём
      enemyTurnsBefore: (function () {
        var i = idx;
        while (i + 1 < seq.length && seq[i + 1].side === step.side) i++;
        var n = 0;
        for (var j = i + 1; j < seq.length; j++) {
          if (seq[j].side === step.side) break;
          n++;
        }
        return n;
      })(),
    };
  }

  /* ── ЛУЧШИЙ СЛЕПОЙ ПИК ────────────────────────────────────────────────
     Не «самый сильный», а САМЫЙ НЕНАКАЗУЕМЫЙ: у кого меньше всего ЖИВЫХ
     контр. В фирлесе список живых тает с каждой картой, поэтому лучший
     слепой пик меняется от карты к карте (см. meta-web.json). */
  function blindRanking(KB, state, opts) {
    opts = opts || {};
    var unavail = C.availability(KB, state);
    var pool = opts.pool && opts.pool.length ? opts.pool.map(KB.idx.nameOf).filter(Boolean) : null;
    var out = [];
    (pool || KB.idx.names).forEach(function (name) {
      if (unavail[name]) return;
      var c = KB.idx.champ(name); if (!c) return;
      if (opts.lane && (c.lanes || []).indexOf(opts.lane) === -1) return;
      /* ЗАЩИТА ОТ «НЕЗНАНИЕ = БЕЗОПАСНОСТЬ». У чемпа без матчапов ноль живых
         контр — и он вылезал в лучшие слепые пики просто потому, что мы про
         него ничего не знаем. Это худший совет из возможных. */
      var mu = KB.matchups.of(name);
      var known = 0;
      if (mu && mu.lanes) Object.keys(mu.lanes).forEach(function (l) { known += (mu.lanes[l] || []).length; });
      if (known < MIN_KNOWN) return;

      var risk = C.blindRisk(KB, name, state);
      var meta = KB.idx.meta(name, state.rank);
      var tier = meta ? ({ 'S+': 3, S: 2, A: 1, B: 0, C: -1, D: -2 })[meta.tier] : 0;
      // тот же замок, что в оценке пика: тир на малом пикрейте — шум
      if (tier > 0 && meta) {
        var pr = meta.pr || 0;
        tier = tier * (pr >= 4 ? 1 : pr >= 2 ? 0.6 : pr >= 1 ? 0.25 : 0);
      }
      // «сгорело в серии» и «забанено» — разные вещи, путать их нельзя:
      // фирлес-выгорание держится всю серию, бан — только эту карту
      var burned = (risk.dead || []).filter(function (d) { return d.why === 'сгорел в серии'; });
      out.push({
        champ: name, ru: c.ru || name,
        liveCounters: risk.count, risk: risk.risk,
        removed: risk.removedRisk, burned: burned, main: risk.main,
        tier: meta && meta.tier,
        // ненаказуемость: мало живых контр + не мусорный тир
        score: -(risk.risk || 0) / 10 + (tier || 0),
      });
    });
    return out.sort(function (a, b) { return b.score - a.score; });
  }

  /* Доживёт ли чемп до нашего следующего пика: прогоняем советник ЗА ВРАГА
     и смотрим, входит ли он в его верхушку. Не входит — можно подождать. */
  function survives(KB, state, champ, info) {
    if (info.nextOwnPick == null) return { p: 0, why: 'нашего следующего пика уже нет' };
    var enemyState = Object.assign({}, state, { side: other(info.side) });
    var top = pickRanking(KB, enemyState, info, { limit: 6, skipSurvival: true });
    var pos = -1;
    top.forEach(function (x, i) { if (KB.idx.nameOf(x.champ) === KB.idx.nameOf(champ)) pos = i; });
    var turns = info.enemyTurnsBefore || 1;
    if (pos === -1) return { p: 0.9, why: 'враг его не хочет — в его верхушке нет' };
    // чем выше в их списке и чем больше у них ходов, тем вернее заберут
    var p = Math.max(0.05, 1 - (top.length - pos) / top.length) ;
    p = Math.max(0.05, 1 - Math.min(1, (1 - pos / top.length) * turns));
    return { p: Math.round(p * 100) / 100, why: 'он ' + (pos + 1) + '-й в их списке, у них ' + turns + ' ход(ов) до нас' };
  }

  /* ── РАНЖИРОВАНИЕ ПИКОВ ──────────────────────────────────────────────── */
  function pickRanking(KB, state, info, opts) {
    opts = opts || {};
    var side = state.side, unavail = C.availability(KB, state);
    var pool = state.ourPool && state.ourPool.length ? state.ourPool.map(KB.idx.nameOf).filter(Boolean) : null;
    var out = [];
    (pool || KB.idx.names).forEach(function (name) {
      if (unavail[name]) return;
      var v = C.valueFor(KB, name, side, state, state.rank);
      if (v.value <= -50) return;
      out.push({ champ: name, ru: C.ru(KB, name), value: Math.round(v.value * 10) / 10, why: v.why });
    });
    out.sort(function (a, b) { return b.value - a.value; });
    return out.slice(0, opts.limit || 10);
  }

  /* ── РАНЖИРОВАНИЕ БАНОВ ───────────────────────────────────────────────
     Банят не «сильного вообще», а того, кто силён ИМ и не нужен нам. */
  function banRanking(KB, state, opts) {
    opts = opts || {};
    var side = state.side, foe = other(side);
    var unavail = C.availability(KB, state);
    var pool = state.enemyPool && state.enemyPool.length ? state.enemyPool.map(KB.idx.nameOf).filter(Boolean) : null;
    var out = [];
    (pool || KB.idx.names).forEach(function (name) {
      if (unavail[name]) return;
      var toThem = C.valueFor(KB, name, foe, state, state.rank);
      var toUs = C.valueFor(KB, name, side, state, state.rank);
      var meta = KB.idx.meta(name, state.rank);
      if (!meta || ['C', 'D'].indexOf(meta.tier) !== -1) {
        // мусорный тир баним только если он прямо контрит наши пики
        var hitsUs = toThem.why.some(function (w) { return w.kind === 'matchup'; });
        if (!hitsUs) return;
      }
      out.push({
        champ: name, ru: C.ru(KB, name), tier: meta && meta.tier,
        denial: Math.round((toThem.value - toUs.value) * 10) / 10,
        valueToThem: Math.round(toThem.value * 10) / 10,
        why: toThem.why.slice(0, 3),
      });
    });
    out.sort(function (a, b) { return b.denial - a.denial; });
    return out.slice(0, opts.limit || 10);
  }

  /* ── ГЛАВНОЕ: ЛИНИИ ХОДА ─────────────────────────────────────────────── */
  function advise(KB, state) {
    var info = stepInfo(state);
    if (info.done) return { done: true, lines: [], note: 'драфт закончен — дальше расстановка ролей' };
    if (info.side !== state.side) {
      return { done: false, notOurTurn: true, whoseTurn: info.side,
               note: 'сейчас ход соперника — считаем, что он возьмёт', expect: expected(KB, state, info) };
    }
    var lines = info.action === 'ban' ? banLines(KB, state, info) : pickLines(KB, state, info);
    return {
      done: false, step: info.idx, phase: info.phase, action: info.action,
      isDouble: info.isDouble, lines: lines,
      dataNote: KB.staleNote('guides'),
    };
  }

  function expected(KB, state, info) {
    var enemyState = Object.assign({}, state, { side: info.side });
    return info.action === 'ban'
      ? banRanking(KB, enemyState, { limit: 3 })
      : pickRanking(KB, enemyState, info, { limit: 3 });
  }

  function banLines(KB, state, info) {
    var ranked = banRanking(KB, state, { limit: 8 });
    var lines = [];
    if (!ranked.length) return lines;

    // Линия 1 — простая: закрыть самого опасного для нас
    lines.push({
      kind: 'safe_line', ru: 'Простая линия',
      move: ranked[0].champ, moveRu: ranked[0].ru,
      why: ['Им он ценнее всего (' + ranked[0].valueToThem + '), нам — нет']
        .concat(ranked[0].why.map(function (w) { return w.text; })),
      cost: 'Никакой хитрости — зато убирает все ветки вокруг него.',
    });

    // Линия 2 — два сильнейших открыты: банить одного нельзя
    var topTier = ranked.filter(function (r) { return r.tier === 'S+' || r.tier === 'S'; });
    if (topTier.length >= 2) {
      lines.push({
        kind: 'two_ops', ru: 'Два сильнейших открыты',
        move: topTier[0].champ, moveRu: topTier[0].ru,
        warn: true,
        why: ['Открыты ' + topTier.slice(0, 2).map(function (t) { return t.ru; }).join(' и ')
            + '. Забаним одного — второй уйдёт им первым пиком.'],
        cost: 'Либо разменять обоих, либо не трогать ни одного и играть вокруг.',
      });
    }

    // Линия 3 — бан контрпика: закрыть ответ и открыть себе слепой пик
    var blind = blindRanking(KB, state, { pool: state.ourPool, lane: state.protectLane });
    if (blind.length && blind[0].main && blind[0].main.length) {
      var target = blind[0], killer = target.main[0];
      lines.push({
        kind: 'ban_the_counter', ru: 'Бан контрпика → откроем себе слепой пик',
        move: killer.champ, moveRu: killer.ru,
        why: ['Закрыв ' + killer.ru + ', мы открываем ' + target.ru + ' вслепую'
            + (killer.note ? ' (' + killer.note + ')' : '')],
        cost: 'Бан уходит не в их сильнейшего, а в наш комфорт. Считай, тратим бан на свой пик.',
      });
    }
    return lines;
  }

  function pickLines(KB, state, info) {
    var ranked = pickRanking(KB, state, info, { limit: 8 });
    var lines = [];
    if (!ranked.length) return lines;

    // Линия 1 — лучший по ценности
    lines.push({
      kind: 'value', ru: 'Сильнейший ход',
      move: ranked[0].champ, moveRu: ranked[0].ru,
      why: ranked[0].why.map(function (w) { return w.text; }),
      cost: null,
    });

    // Линия 2 — ДАБЛ: считаем пару целиком + что доживёт до третьего
    if (info.isDouble && ranked.length >= 2) {
      var a = ranked[0], b = ranked[1];
      var wait = ranked[2] ? survives(KB, state, ranked[2].champ, info) : null;
      lines.push({
        kind: 'double_pick', ru: 'Дабл-пик — считаем пару',
        move: [a.champ, b.champ], moveRu: a.ru + ' + ' + b.ru,
        why: ['Пара целиком, а не два хода по отдельности']
          .concat(a.why.slice(0, 1).map(function (w) { return w.text; }))
          .concat(b.why.slice(0, 1).map(function (w) { return w.text; })),
        wait: wait && ranked[2] ? {
          champ: ranked[2].champ, ru: ranked[2].ru,
          p: wait.p, why: wait.why,
          text: ranked[2].ru + ' доживёт до нашего хода ' + info.nextOwnPick
              + ' с вероятностью ' + Math.round(wait.p * 100) + '% — ' + wait.why,
        } : null,
        cost: 'Если ошиблись с «доживёт» — потеряли и связку, и темп.',
      });
    }

    // Линия 3 — слепой пик: самый ненаказуемый
    var blind = blindRanking(KB, state, { pool: state.ourPool, lane: state.protectLane });
    if (blind.length) {
      var top = blind[0];
      lines.push({
        kind: 'blind', ru: 'Самый ненаказуемый (слепой пик)',
        move: top.champ, moveRu: top.ru,
        why: ['Живых ответов на него осталось ' + top.liveCounters
            + (top.burned && top.burned.length
                ? ', а ' + top.burned.map(function (b) { return b.ru; }).join(' и ') + ' сгорел(и) в серии'
                : '')]
          .concat(top.main.slice(0, 2).map(function (m) {
            return 'остаётся опасен: ' + m.ru + (m.note ? ' — ' + m.note : '');
          })),
        cost: 'Ненаказуемый не значит сильнейший. Если нужен размен — это не он.',
      });
    }
    return lines;
  }

  return {
    advise: advise, stepInfo: stepInfo,
    pickRanking: pickRanking, banRanking: banRanking,
    blindRanking: blindRanking, survives: survives,
  };
});
