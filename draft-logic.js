/* ═══════════════════════════════════════════
   draft-logic.js — чистая (pure) логика драфта.
   Вынесена из draft.js, чтобы:
     1) её можно было покрыть unit-тестами (Node + Vitest);
     2) UI/Firebase-код в draft.js не смешивался с алгоритмами.
   Никаких side-effects, DOM, Firebase — только данные на входе/выходе.

   Dual-export: в браузере вешается на window.DraftLogic,
   в Node (тесты) доступна через require('./draft-logic.js').
   ═══════════════════════════════════════════ */
(function (root, factory) {
  var lib = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  if (root) root.DraftLogic = lib;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Порядок ходов pro-драфта Wild Rift: 20 шагов.
  // ban1 (B-R-B-R-B-R) → pick1 (B1 R2 B2 R1) → ban2 (R-B-R-B) → pick2 (R1 B2 R1).
  var WR_DRAFT_SEQUENCE = [
    { phase: 'ban1',  side: 'blue', action: 'ban',  banIdx: 0,    pickIdx: null },
    { phase: 'ban1',  side: 'red',  action: 'ban',  banIdx: 0,    pickIdx: null },
    { phase: 'ban1',  side: 'blue', action: 'ban',  banIdx: 1,    pickIdx: null },
    { phase: 'ban1',  side: 'red',  action: 'ban',  banIdx: 1,    pickIdx: null },
    { phase: 'ban1',  side: 'blue', action: 'ban',  banIdx: 2,    pickIdx: null },
    { phase: 'ban1',  side: 'red',  action: 'ban',  banIdx: 2,    pickIdx: null },
    { phase: 'pick1', side: 'blue', action: 'pick', banIdx: null, pickIdx: 0 },
    { phase: 'pick1', side: 'red',  action: 'pick', banIdx: null, pickIdx: 0 },
    { phase: 'pick1', side: 'red',  action: 'pick', banIdx: null, pickIdx: 1 },
    { phase: 'pick1', side: 'blue', action: 'pick', banIdx: null, pickIdx: 1 },
    { phase: 'pick1', side: 'blue', action: 'pick', banIdx: null, pickIdx: 2 },
    { phase: 'pick1', side: 'red',  action: 'pick', banIdx: null, pickIdx: 2 },
    { phase: 'ban2',  side: 'red',  action: 'ban',  banIdx: 3,    pickIdx: null },
    { phase: 'ban2',  side: 'blue', action: 'ban',  banIdx: 3,    pickIdx: null },
    { phase: 'ban2',  side: 'red',  action: 'ban',  banIdx: 4,    pickIdx: null },
    { phase: 'ban2',  side: 'blue', action: 'ban',  banIdx: 4,    pickIdx: null },
    { phase: 'pick2', side: 'red',  action: 'pick', banIdx: null, pickIdx: 3 },
    { phase: 'pick2', side: 'blue', action: 'pick', banIdx: null, pickIdx: 3 },
    { phase: 'pick2', side: 'blue', action: 'pick', banIdx: null, pickIdx: 4 },
    { phase: 'pick2', side: 'red',  action: 'pick', banIdx: null, pickIdx: 4 }
  ];
  var SEQ_LEN = WR_DRAFT_SEQUENCE.length;

  // Чемпионы, недоступные в текущем состоянии игры.
  // Возвращает map: name -> 'banned' | 'picked' | 'fearless' | 'global'.
  // banned/picked имеют приоритет над fearless/global (выставляются первыми).
  function getUnavailable(game, fearlessLock, globalBans) {
    var set = {};
    var bans = (game && game.bans) || {};
    var picks = (game && game.picks) || {};
    (bans.blue || []).forEach(function (n) { if (n) set[n] = 'banned'; });
    (bans.red  || []).forEach(function (n) { if (n) set[n] = 'banned'; });
    (picks.blue || []).forEach(function (p) { if (p && p.champ) set[p.champ] = 'picked'; });
    (picks.red  || []).forEach(function (p) { if (p && p.champ) set[p.champ] = 'picked'; });
    (fearlessLock || []).forEach(function (n) { if (!set[n]) set[n] = 'fearless'; });
    (globalBans || []).forEach(function (n) { if (!set[n]) set[n] = 'global'; });
    return set;
  }

  // Map позиция (blue/red на экране) → команда (blue/red в лобби) + капитан + имя.
  // Нужно для корректного свапа сторон между играми серии:
  // game.blueSide === 'red' означает что команда red играет на синей позиции.
  function sideRoles(lobby, game) {
    lobby = lobby || {};
    var bs = (game && game.blueSide) || (lobby && lobby.currentGameBlueSide) || 'blue';
    if (bs === 'red') {
      return {
        blue: { team: 'red',  cap: lobby.redCaptain,  teamName: (lobby.redTeamName  || 'Red') },
        red:  { team: 'blue', cap: lobby.blueCaptain, teamName: (lobby.blueTeamName || 'Blue') }
      };
    }
    return {
      blue: { team: 'blue', cap: lobby.blueCaptain, teamName: (lobby.blueTeamName || 'Blue') },
      red:  { team: 'red',  cap: lobby.redCaptain,  teamName: (lobby.redTeamName  || 'Red') }
    };
  }

  // Детерминированный выбор из пула по строке-сиду (FNV-1a hash).
  // Все клиенты с одинаковым seed+pool получат одного чемпиона —
  // используется для авто-пика при истечении таймера, чтобы не было рассинхрона.
  function deterministicPick(seed, pool) {
    if (!pool || !pool.length) return undefined;
    seed = String(seed == null ? '' : seed);
    var h = 2166136261 >>> 0;
    for (var i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return pool[h % pool.length];
  }

  return {
    WR_DRAFT_SEQUENCE: WR_DRAFT_SEQUENCE,
    SEQ_LEN: SEQ_LEN,
    getUnavailable: getUnavailable,
    sideRoles: sideRoles,
    deterministicPick: deterministicPick
  };
});
