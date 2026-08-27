/* ============================================================
   lab-tournaments — «Турниры Wild Rift» (бывш. Киберспорт).
   ЛОГИКА (Engine) — ПОРТ 1-в-1 из cybersport.js, НЕ переписана:
     genSE · genDE · genGroup · genGroupPlayoff · computeStandings ·
     propagateMatchResult · clearDownstream · _autoResolveByes · seedPairs.
   Вид — собран заново по канону DESIGN.md (стекло на контейнерах,
   выделение белое, акцент только на данных).
   Firestore заменён локальным STORE (лаб): те же поля документов.
   ДАННЫЕ: иконки чемпионов — РЕАЛЬНЫЕ (ddragon). Команды/игроки/счёт — ДЕМО (помечено).
   ============================================================ */
(function () {
'use strict';

var DD = '14.24.1';
function champIcon(k) { return 'https://ddragon.leagueoflegends.com/cdn/' + DD + '/img/champion/' + k + '.png'; }
function _e(s) { if (s == null) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function $(id) { return document.getElementById(id); }

/* ══════════════════════════════════════════════════════════
   ENGINE — ПОРТ 1-в-1 из cybersport.js (чистый генератор сетки).
   Не знает ни про Firestore, ни про DOM.
══════════════════════════════════════════════════════════ */
var Engine = (function () {
  function pow2(n) { var p = 1; while (p < n) p *= 2; return p; }
  function log2(n) { return Math.log(n) / Math.log(2); }

  /* Standard tournament seeding: для n=8 → [[1,8],[4,5],[3,6],[2,7]] */
  function seedPairs(n) {
    var seeds = [1, 2];
    var rounds = log2(n);
    for (var r = 1; r < rounds; r++) {
      var ns = [];
      for (var i = 0; i < seeds.length; i++) { ns.push(seeds[i]); ns.push(n + 1 - seeds[i]); }
      seeds = ns;
    }
    var pairs = [];
    for (var j = 0; j < seeds.length; j += 2) pairs.push([seeds[j], seeds[j + 1]]);
    return pairs;
  }

  function _seRoundLabel(r, totalRnd, cnt) {
    if (r === totalRnd)     return 'Финал';
    if (r === totalRnd - 1) return 'Полуфинал';
    if (r === totalRnd - 2) return 'Четвертьфинал';
    return '1/' + (cnt * 2) + ' финала';
  }

  /* ─── Single Elimination ─── */
  function genSE(teams, opts) {
    opts = opts || {};
    var bo = opts.bo || 3;
    var n = pow2(teams.length);
    var totalRnd = log2(n);
    var pairs = seedPairs(n);
    var seedMap = {};
    teams.forEach(function (t, i) { seedMap[i + 1] = t.id; });

    var matches = [];
    for (var r = 1; r <= totalRnd; r++) {
      var cnt = n / Math.pow(2, r);
      for (var mn = 1; mn <= cnt; mn++) {
        var t1Id = null, t2Id = null, t1Src = null, t2Src = null;
        if (r === 1) {
          var pair = pairs[mn - 1];
          t1Id = seedMap[pair[0]] || null;
          t2Id = seedMap[pair[1]] || null;
        } else {
          t1Src = { matchId: 'r' + (r - 1) + 'm' + (mn * 2 - 1), takes: 'winner' };
          t2Src = { matchId: 'r' + (r - 1) + 'm' + (mn * 2), takes: 'winner' };
        }
        var winnerId = null, status = 'upcoming', s1 = 0, s2 = 0;
        if (r === 1) {
          if (t1Id && !t2Id)      { winnerId = t1Id; status = 'completed'; s1 = Math.ceil(bo / 2); }
          else if (!t1Id && t2Id) { winnerId = t2Id; status = 'completed'; s2 = Math.ceil(bo / 2); }
        }
        matches.push({
          id: 'r' + r + 'm' + mn, phase: 'bracket',
          round: r, matchNum: mn, label: _seRoundLabel(r, totalRnd, cnt),
          team1Id: t1Id, team2Id: t2Id, team1Source: t1Src, team2Source: t2Src,
          score1: s1, score2: s2, winnerId: winnerId, status: status, bo: bo
        });
      }
    }
    if (opts.thirdPlace && totalRnd >= 2) {
      matches.push({
        id: 'third_place', phase: 'third_place',
        round: totalRnd, matchNum: 99, label: 'Матч за 3-е место',
        team1Id: null, team2Id: null,
        team1Source: { matchId: 'r' + (totalRnd - 1) + 'm1', takes: 'loser' },
        team2Source: { matchId: 'r' + (totalRnd - 1) + 'm2', takes: 'loser' },
        score1: 0, score2: 0, winnerId: null, status: 'upcoming', bo: bo
      });
    }
    _autoResolveByes(matches);
    return matches;
  }

  /* ─── Double Elimination ─── */
  function _ubLabel(r, k) {
    if (r === k)     return 'UB Финал';
    if (r === k - 1) return 'UB Полуфинал';
    return 'UB Раунд ' + r;
  }
  function _lbLabel(r, total) { return r === total ? 'LB Финал' : 'LB Раунд ' + r; }

  function genDE(teams, opts) {
    opts = opts || {};
    var bo = opts.bo || 3;
    var n = pow2(teams.length);
    var k = log2(n);
    var pairs = seedPairs(n);
    var seedMap = {};
    teams.forEach(function (t, i) { seedMap[i + 1] = t.id; });
    var matches = [];

    for (var r = 1; r <= k; r++) {
      var cnt = n / Math.pow(2, r);
      for (var m = 1; m <= cnt; m++) {
        var id = 'ub_r' + r + '_m' + m;
        var t1Id = null, t2Id = null, t1Src = null, t2Src = null;
        if (r === 1) {
          var pair = pairs[m - 1];
          t1Id = seedMap[pair[0]] || null;
          t2Id = seedMap[pair[1]] || null;
        } else {
          t1Src = { matchId: 'ub_r' + (r - 1) + '_m' + (m * 2 - 1), takes: 'winner' };
          t2Src = { matchId: 'ub_r' + (r - 1) + '_m' + (m * 2), takes: 'winner' };
        }
        var winnerId = null, status = 'upcoming', s1 = 0, s2 = 0;
        if (r === 1) {
          if (t1Id && !t2Id)      { winnerId = t1Id; status = 'completed'; s1 = Math.ceil(bo / 2); }
          else if (!t1Id && t2Id) { winnerId = t2Id; status = 'completed'; s2 = Math.ceil(bo / 2); }
        }
        matches.push({
          id: id, phase: 'upper', round: r, matchNum: m, label: _ubLabel(r, k),
          team1Id: t1Id, team2Id: t2Id, team1Source: t1Src, team2Source: t2Src,
          score1: s1, score2: s2, winnerId: winnerId, status: status, bo: bo
        });
      }
    }

    var totalLBR = 2 * (k - 1);
    for (var lr = 1; lr <= totalLBR; lr++) {
      var jj = Math.ceil(lr / 2);
      var lCnt = Math.pow(2, k - 1 - jj);
      for (var lm = 1; lm <= lCnt; lm++) {
        var lid = 'lb_r' + lr + '_m' + lm;
        var lt1Src = null, lt2Src = null;
        if (lr === 1) {
          lt1Src = { matchId: 'ub_r1_m' + (lm * 2 - 1), takes: 'loser' };
          lt2Src = { matchId: 'ub_r1_m' + (lm * 2), takes: 'loser' };
        } else if (lr % 2 === 1) {
          lt1Src = { matchId: 'lb_r' + (lr - 1) + '_m' + (lm * 2 - 1), takes: 'winner' };
          lt2Src = { matchId: 'lb_r' + (lr - 1) + '_m' + (lm * 2), takes: 'winner' };
        } else {
          lt1Src = { matchId: 'lb_r' + (lr - 1) + '_m' + lm, takes: 'winner' };
          lt2Src = { matchId: 'ub_r' + (lr / 2 + 1) + '_m' + lm, takes: 'loser' };
        }
        matches.push({
          id: lid, phase: 'lower', round: lr, matchNum: lm, label: _lbLabel(lr, totalLBR),
          team1Id: null, team2Id: null, team1Source: lt1Src, team2Source: lt2Src,
          score1: 0, score2: 0, winnerId: null, status: 'upcoming', bo: bo
        });
      }
    }

    matches.push({
      id: 'grand_final', phase: 'final', round: 1, matchNum: 1, label: 'Гранд Финал',
      team1Id: null, team2Id: null,
      team1Source: { matchId: 'ub_r' + k + '_m1', takes: 'winner' },
      team2Source: { matchId: 'lb_r' + totalLBR + '_m1', takes: 'winner' },
      score1: 0, score2: 0, winnerId: null, status: 'upcoming', bo: bo
    });

    _autoResolveByes(matches);
    return matches;
  }

  /* ─── Group Stage (round-robin внутри групп) ─── */
  function genGroup(teams, opts) {
    opts = opts || {};
    var bo = opts.bo || 3;
    var numGroups = teams.length <= 8 ? 2 : teams.length <= 16 ? 4 : 8;
    var labels = 'ABCDEFGH';
    var groups = {};
    for (var i = 0; i < numGroups; i++) groups[labels[i]] = [];
    teams.forEach(function (t, idx) { groups[labels[idx % numGroups]].push(t); });

    var matches = [];
    var mNum = 1;
    Object.keys(groups).forEach(function (g) {
      var gt = groups[g];
      for (var a = 0; a < gt.length; a++) {
        for (var b = a + 1; b < gt.length; b++) {
          matches.push({
            id: 'g_' + g + '_m' + mNum, phase: 'group', group: g,
            round: 1, matchNum: mNum, label: 'Группа ' + g,
            team1Id: gt[a].id, team2Id: gt[b].id,
            team1Source: null, team2Source: null,
            score1: 0, score2: 0, winnerId: null, status: 'upcoming', bo: bo
          });
          mNum++;
        }
      }
    });

    var groupConfig = {};
    Object.keys(groups).forEach(function (g) {
      groupConfig[g] = groups[g].map(function (t) { return t.id; });
    });
    return { matches: matches, groupConfig: groupConfig };
  }

  /* ─── Плей-офф из топ-2 групп (SE, кросс-пары) ─── */
  function genGroupPlayoff(groupConfig, currentMatches, opts) {
    opts = opts || {};
    var bo = opts.bo || 3;
    var groups = Object.keys(groupConfig).sort();
    var standings = {};
    groups.forEach(function (g) {
      var gMatches = currentMatches.filter(function (m) { return m.group === g; });
      standings[g] = computeStandings(gMatches, groupConfig[g]);
    });
    var qualifiers = [];
    groups.forEach(function (g) { if (standings[g][0]) qualifiers.push({ id: standings[g][0].teamId }); });
    groups.forEach(function (g) { if (standings[g][1]) qualifiers.push({ id: standings[g][1].teamId }); });
    if (qualifiers.length < 2) return [];

    var seMatches = genSE(qualifiers, { bo: bo });
    seMatches.forEach(function (m) {
      m.id = 'po_' + m.id;
      m.phase = 'playoff';
      if (m.team1Source) m.team1Source.matchId = 'po_' + m.team1Source.matchId;
      if (m.team2Source) m.team2Source.matchId = 'po_' + m.team2Source.matchId;
    });
    return seMatches;
  }

  /* ─── Стандинги в группе ─── */
  function computeStandings(groupMatches, teamIds) {
    var stats = {};
    (teamIds || []).forEach(function (id) {
      stats[id] = { teamId: id, wins: 0, losses: 0, scoreFor: 0, scoreAgainst: 0 };
    });
    groupMatches.forEach(function (m) {
      [m.team1Id, m.team2Id].forEach(function (id) {
        if (id && !stats[id]) stats[id] = { teamId: id, wins: 0, losses: 0, scoreFor: 0, scoreAgainst: 0 };
      });
      if (m.winnerId && stats[m.winnerId]) {
        stats[m.winnerId].wins++;
        var loserId = m.winnerId === m.team1Id ? m.team2Id : m.team1Id;
        if (loserId && stats[loserId]) stats[loserId].losses++;
        if (stats[m.team1Id]) { stats[m.team1Id].scoreFor += (m.score1 || 0); stats[m.team1Id].scoreAgainst += (m.score2 || 0); }
        if (stats[m.team2Id]) { stats[m.team2Id].scoreFor += (m.score2 || 0); stats[m.team2Id].scoreAgainst += (m.score1 || 0); }
      }
    });
    return Object.keys(stats).map(function (k) { return stats[k]; }).sort(function (a, b) {
      return (b.wins - a.wins) || (a.losses - b.losses)
        || ((b.scoreFor - b.scoreAgainst) - (a.scoreFor - a.scoreAgainst));
    });
  }

  /* ─── Автоматическое разрешение byes ─── */
  function _autoResolveByes(matches) {
    var byId = {};
    matches.forEach(function (m) { byId[m.id] = m; });
    var changed = true, safety = 0;
    while (changed && safety < 50) {
      changed = false; safety++;
      matches.forEach(function (m) {
        if (m.winnerId) return;
        if (!m.team1Id && m.team1Source) {
          var src = byId[m.team1Source.matchId];
          if (src && src.winnerId) {
            m.team1Id = m.team1Source.takes === 'winner' ? src.winnerId
              : (src.team1Id === src.winnerId ? src.team2Id : src.team1Id);
            changed = true;
          }
        }
        if (!m.team2Id && m.team2Source) {
          var src2 = byId[m.team2Source.matchId];
          if (src2 && src2.winnerId) {
            m.team2Id = m.team2Source.takes === 'winner' ? src2.winnerId
              : (src2.team1Id === src2.winnerId ? src2.team2Id : src2.team1Id);
            changed = true;
          }
        }
      });
    }
  }

  /* ─── Какие матчи обновить когда completed получил winnerId ─── */
  function propagateMatchResult(allMatches, completed) {
    var winnerId = completed.winnerId;
    var loserId = completed.team1Id === winnerId ? completed.team2Id : completed.team1Id;
    var updates = {};
    allMatches.forEach(function (d) {
      if (d.team1Source && d.team1Source.matchId === completed.id) {
        updates[d.id] = updates[d.id] || {};
        updates[d.id].team1Id = d.team1Source.takes === 'winner' ? winnerId : loserId;
      }
      if (d.team2Source && d.team2Source.matchId === completed.id) {
        updates[d.id] = updates[d.id] || {};
        updates[d.id].team2Id = d.team2Source.takes === 'winner' ? winnerId : loserId;
      }
    });
    return updates;
  }

  /* ─── Обнуление вниз по сетке (undo) ─── */
  function clearDownstream(allMatches, completedId) {
    var updates = {};
    allMatches.forEach(function (d) {
      if (d.team1Source && d.team1Source.matchId === completedId) {
        updates[d.id] = updates[d.id] || {}; updates[d.id].team1Id = null;
      }
      if (d.team2Source && d.team2Source.matchId === completedId) {
        updates[d.id] = updates[d.id] || {}; updates[d.id].team2Id = null;
      }
    });
    return updates;
  }

  return { pow2: pow2, log2: log2, seedPairs: seedPairs, genSE: genSE, genDE: genDE,
    genGroup: genGroup, genGroupPlayoff: genGroupPlayoff, computeStandings: computeStandings,
    propagateMatchResult: propagateMatchResult, clearDownstream: clearDownstream };
})();

/* ══════════════════════════════════════════════════════════
   КОНСТАНТЫ (порт из cybersport.js)
══════════════════════════════════════════════════════════ */
var ROLES = { top: '🗡️ Соло', jungle: '🌿 Лес', mid: '⚡ Мид', adc: '🏹 Дракон', support: '🛡️ Саппорт' };
var ROLE_KEYS = ['top', 'jungle', 'mid', 'adc', 'support'];
var FORMAT_LABELS = {
  single_elim: 'Single Elimination',
  double_elim: 'Double Elimination',
  group_elim:  'Группы + Плей-офф'
};
var FORMAT_DESC = {
  single_elim: 'На вылет. Проиграл — вылетел. Быстро, для 1 игрового дня.',
  double_elim: 'Две сетки: проигравший в верхней падает в нижнюю. Второй шанс каждому.',
  group_elim:  'Сначала круговые группы, топ-2 из каждой идут в плей-офф.'
};
var STATUS_LABEL = { active: 'Идёт', upcoming: 'Скоро', completed: 'Завершён' };

/* ══════════════════════════════════════════════════════════
   ДЕМО-ДАННЫЕ (все команды/игроки/счета = ДЕМО, иконки чемпов реальные)
══════════════════════════════════════════════════════════ */
var CHAMPS = [
  { k: 'Jinx', n: 'Джинкс' }, { k: 'Lux', n: 'Люкс' }, { k: 'Yasuo', n: 'Ясуо' },
  { k: 'Darius', n: 'Дариус' }, { k: 'Malphite', n: 'Малфит' }, { k: 'Nami', n: 'Наами' },
  { k: 'Ahri', n: 'Ари' }, { k: 'Ezreal', n: 'Эзреаль' }, { k: 'LeeSin', n: 'Ли Син' },
  { k: 'Thresh', n: 'Треш' }, { k: 'Vayne', n: 'Вейн' }, { k: 'Katarina', n: 'Катарина' },
  { k: 'Nasus', n: 'Насус' }, { k: 'Amumu', n: 'Амуму' }, { k: 'Orianna', n: 'Орианна' },
  { k: 'Caitlyn', n: 'Кейтлин' }, { k: 'Leona', n: 'Леона' }, { k: 'Graves', n: 'Грейвз' },
  { k: 'Zed', n: 'Зед' }, { k: 'Garen', n: 'Гарен' }, { k: 'Seraphine', n: 'Серафина' },
  { k: 'Camille', n: 'Камилла' }, { k: 'Jhin', n: 'Джин' }, { k: 'Lulu', n: 'Лулу' }
];
var CH_BY_K = {}; CHAMPS.forEach(function (c) { CH_BY_K[c.k] = c; });

var TEAM_POOL = [
  { name: 'Ala-Too Esports',  nicks: ['Manas', 'Kambar', 'Aikol', 'Ryskul', 'Bermet'] },
  { name: 'Bishkek Wolves',   nicks: ['Ulan', 'Timur', 'Aziz', 'Nurbek', 'Elmira'] },
  { name: 'Osh Titans',       nicks: ['Adil', 'Kanat', 'Zamir', 'Iskender', 'Aida'] },
  { name: 'Issyk Storm',      nicks: ['Baiel', 'Erlan', 'Talant', 'Marat', 'Saltanat'] },
  { name: 'Naryn Nomads',     nicks: ['Aibek', 'Nurlan', 'Daniyar', 'Ermek', 'Cholpon'] },
  { name: 'Tien Shan Kings',  nicks: ['Bakyt', 'Sultan', 'Askar', 'Ilim', 'Nazgul'] },
  { name: 'Chuy Rangers',     nicks: ['Aman', 'Ruslan', 'Beksultan', 'Emil', 'Aliya'] },
  { name: 'Karakol Frost',    nicks: ['Almaz', 'Jyrgal', 'Maksat', 'Sanjar', 'Gulnaz'] },
  { name: 'Talas Falcons',    nicks: ['Azat', 'Bektur', 'Chyngyz', 'Damir', 'Elnura'] },
  { name: 'Jalal Dragons',    nicks: ['Farid', 'Gulzat', 'Hasan', 'Islam', 'Jamila'] },
  { name: 'Batken Blades',    nicks: ['Kairat', 'Lazizbek', 'Murat', 'Nurzat', 'Orozbek'] },
  { name: 'Sary Su Legion',   nicks: ['Pamir', 'Rakhat', 'Samat', 'Tilek', 'Umut'] }
];

/* детерминированный псевдо-рандом (одинаковая «история» при каждом открытии) */
function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 16777619) >>> 0; } return h; }
function rng(seed) { var s = hash(String(seed)); return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function makeTeams(prefix, count, offset) {
  var out = {};
  for (var i = 0; i < count; i++) {
    var src = TEAM_POOL[(i + (offset || 0)) % TEAM_POOL.length];
    var r = rng(prefix + src.name);
    var id = prefix + '_t' + (i + 1);
    out[id] = {
      id: id, name: src.name, seed: i + 1,
      players: ROLE_KEYS.map(function (role, pi) {
        var pool = CHAMPS.slice();
        var favs = [];
        for (var f = 0; f < 3; f++) favs.push(pool.splice(Math.floor(r() * pool.length), 1)[0].k);
        return {
          nick: src.nicks[pi], role: role, champs: favs,
          kda: (2 + r() * 3).toFixed(1), winrate: (46 + Math.round(r() * 14)),
          games: 30 + Math.round(r() * 90)
        };
      })
    };
  }
  return out;
}

/* ══════════════════════════════════════════════════════════
   STORE (замена Firestore для лаба; поля документов те же)
══════════════════════════════════════════════════════════ */
var STORE = { tournaments: [] };

function newTournament(cfg) {
  var t = {
    id: cfg.id, name: cfg.name, format: cfg.format, teamCount: cfg.teamCount,
    bo: cfg.bo || 3, prizePool: cfg.prizePool || '', thirdPlace: !!cfg.thirdPlace,
    isPublic: cfg.isPublic !== false, status: 'upcoming', region: cfg.region || 'Кыргызстан',
    date: cfg.date || '—', groupConfig: null, playoffStarted: false,
    official: !!cfg.official,                 // ★ гибрид: помечает только админ (ADMIN_UID)
    entryMode: cfg.entryMode || 'manual',     // manual = организатор вбивает · open = открытая запись
    applications: cfg.applications || [],     // заявки при open-режиме {name, players, byUid, status}
    createdByName: cfg.createdByName || 'Организатор',
    teams: cfg.teams || {}, matches: {}
  };
  STORE.tournaments.push(t);
  return t;
}
function teamsSorted(t) {
  return Object.keys(t.teams).map(function (k) { return t.teams[k]; })
    .sort(function (a, b) { return (a.seed || 0) - (b.seed || 0); });
}
function matchArr(t) { return Object.keys(t.matches).map(function (k) { return t.matches[k]; }); }

/* Старт турнира — тот же путь, что _csStart в cybersport.js */
function startTournament(t) {
  var arr = teamsSorted(t);
  if (arr.length < 2) { toast('Нужно минимум 2 команды'); return false; }
  var matches;
  if (t.format === 'single_elim')      matches = Engine.genSE(arr, { bo: t.bo, thirdPlace: !!t.thirdPlace });
  else if (t.format === 'double_elim') matches = Engine.genDE(arr, { bo: t.bo });
  else if (t.format === 'group_elim') {
    var res = Engine.genGroup(arr, { bo: t.bo });
    matches = res.matches;
    t.groupConfig = JSON.stringify(res.groupConfig);
  } else { toast('Формат не поддерживается'); return false; }
  t.matches = {};
  matches.forEach(function (m) { t.matches[m.id] = m; });
  t.status = 'active';
  return true;
}

/* Сохранение счёта — валидация + propagateMatchResult (как _csSaveResult) */
function saveResult(t, matchId, s1, s2) {
  var m = t.matches[matchId]; if (!m) return 'Матч не найден';
  var bo = m.bo || t.bo || 3;
  var max = Math.ceil(bo / 2);
  if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0 || s1 > max || s2 > max) return 'Некорректный счёт для BO' + bo + ' (максимум ' + max + ')';
  if (s1 === s2) return 'Не может быть ничья в BO' + bo;
  if (s1 !== max && s2 !== max) return 'Один из счётов должен быть ' + max + ' (BO' + bo + ')';

  m.score1 = s1; m.score2 = s2;
  m.winnerId = s1 > s2 ? m.team1Id : m.team2Id;
  m.status = 'completed';

  var updates = Engine.propagateMatchResult(matchArr(t), m);
  Object.keys(updates).forEach(function (mid) {
    if (updates[mid].team1Id !== undefined) t.matches[mid].team1Id = updates[mid].team1Id;
    if (updates[mid].team2Id !== undefined) t.matches[mid].team2Id = updates[mid].team2Id;
  });
  checkComplete(t);
  return { ok: true, touched: Object.keys(updates) };
}

/* Отмена результата — clearDownstream (как _csUndoMatch) */
function undoMatch(t, matchId) {
  var m = t.matches[matchId]; if (!m) return null;
  m.score1 = 0; m.score2 = 0; m.winnerId = null; m.status = 'upcoming';
  var clears = Engine.clearDownstream(matchArr(t), matchId);
  Object.keys(clears).forEach(function (mid) {
    if (clears[mid].team1Id !== undefined) t.matches[mid].team1Id = clears[mid].team1Id;
    if (clears[mid].team2Id !== undefined) t.matches[mid].team2Id = clears[mid].team2Id;
  });
  if (t.status === 'completed') t.status = 'active';
  return { ok: true, touched: Object.keys(clears) };
}

/* Плей-офф после групп (как _csStartPlayoff) */
function startPlayoff(t) {
  var groupConfig;
  try { groupConfig = JSON.parse(t.groupConfig || '{}'); } catch (e) { groupConfig = {}; }
  if (!Object.keys(groupConfig).length) { toast('Нет данных о группах'); return false; }
  var po = Engine.genGroupPlayoff(groupConfig, matchArr(t), { bo: t.bo });
  if (!po.length) { toast('Не удалось сгенерировать плей-офф'); return false; }
  po.forEach(function (m) { t.matches[m.id] = m; });
  t.playoffStarted = true;
  return true;
}

/* Завершённость турнира (как _checkComplete) */
function checkComplete(t) {
  var all = matchArr(t);
  if (!all.length) return;
  if (t.format === 'group_elim') {
    var po = all.filter(function (m) { return m.phase === 'playoff'; });
    if (!po.length) return;
    if (!po.every(function (m) { return !!m.winnerId; })) return;
  } else {
    if (!all.every(function (m) { return !!m.winnerId; })) return;
  }
  t.status = 'completed';
}

/* ─── СИД: три демо-турнира в разных состояниях ─── */
(function seed() {
  // 1) SE 8 команд, доигран до полуфиналов — ОФИЦИАЛЬНЫЙ (админ пометил)
  var t1 = newTournament({ id: 'demo1', name: 'Ala-Too Invitational', format: 'single_elim',
    teamCount: 8, bo: 3, prizePool: '150 000 сом', thirdPlace: true, date: '2–4 августа',
    official: true, createdByName: 'PRO-WILDRIFT (админ)', teams: makeTeams('demo1', 8, 0) });
  startTournament(t1);
  var r = rng('demo1res');
  ['r1m1', 'r1m2', 'r1m3', 'r1m4'].forEach(function (mid) {
    var a = r() > 0.5;
    saveResult(t1, mid, a ? 2 : 0, a ? 0 : 2);
  });
  saveResult(t1, 'r2m1', 2, 1);

  // 2) Группы + плей-офф, группы доиграны, плей-офф идёт
  var t2 = newTournament({ id: 'demo2', name: 'Bishkek Wild Cup', format: 'group_elim',
    teamCount: 8, bo: 3, prizePool: '80 000 сом', date: '10–12 августа',
    teams: makeTeams('demo2', 8, 3) });
  startTournament(t2);
  var r2 = rng('demo2res');
  matchArr(t2).filter(function (m) { return m.phase === 'group'; }).forEach(function (m) {
    var a = r2() > 0.45;
    saveResult(t2, m.id, a ? 2 : 1, a ? 1 : 2);
  });
  startPlayoff(t2);
  saveResult(t2, 'po_r1m1', 2, 0);

  // 3) DE 8 команд — запущен, первый раунд сыгран
  var t3 = newTournament({ id: 'demo3', name: 'Nomad Series · Double', format: 'double_elim',
    teamCount: 8, bo: 5, prizePool: '250 000 сом', date: '18–20 августа',
    teams: makeTeams('demo3', 8, 6) });
  startTournament(t3);
  var r3 = rng('demo3res');
  ['ub_r1_m1', 'ub_r1_m2', 'ub_r1_m3', 'ub_r1_m4'].forEach(function (mid) {
    var a = r3() > 0.5;
    saveResult(t3, mid, a ? 3 : 1, a ? 1 : 3);
  });

  // 4) Ещё не запущен, ОТКРЫТАЯ ЗАПИСЬ — 2 команды приняты, 3 в заявках
  var openTeams = makeTeams('demo4', 2, 2);
  var pendingSrc = makeTeams('demo4p', 3, 5);
  var applications = Object.keys(pendingSrc).map(function (k) {
    var team = pendingSrc[k];
    return { name: team.name, players: team.players, byUid: 'u_' + team.name.split(' ')[0], status: 'pending' };
  });
  newTournament({ id: 'demo4', name: 'Osh Open Qualifier', format: 'single_elim',
    teamCount: 8, bo: 1, prizePool: '30 000 сом', date: '25 августа',
    entryMode: 'open', createdByName: 'Ulan (комьюнити)', teams: openTeams, applications: applications });
})();

/* ══════════════════════════════════════════════════════════
   ИНФЛЮЕНСЕРЫ (структура = Firestore-коллекция influencers из app.js)
   поля: name, platform, rank, role, url, avatar, achievements,
         tierlist {S,A,B,C}, counters {champ:[...]}, combos {champ:[...]}
══════════════════════════════════════════════════════════ */
var INFLUENCERS = [
  { name: 'NomadWR', platform: 'youtube', rank: 'sovereign', role: 'Лес',
    achievements: 'Топ-1 Суверен сезона 6 · финалист Ala-Too Invitational · 120к подписчиков',
    tierlist: { S: ['LeeSin', 'Graves', 'Amumu'], A: ['Nasus', 'Camille'], B: ['Garen'], C: ['Malphite'] },
    counters: { LeeSin: ['Graves', 'Amumu'], Graves: ['LeeSin'] },
    combos: { Amumu: ['Lux', 'Katarina'], LeeSin: ['Thresh'] } },
  { name: 'AikoMid', platform: 'twitch', rank: 'challenger', role: 'Мид',
    achievements: 'Челленджер 5 сезонов подряд · тренер Bishkek Wolves',
    tierlist: { S: ['Ahri', 'Katarina'], A: ['Lux', 'Orianna', 'Zed'], B: ['Seraphine'], C: [] },
    counters: { Katarina: ['Lux', 'Orianna'], Ahri: ['Zed'] },
    combos: { Ahri: ['Amumu'], Orianna: ['Malphite'] } },
  { name: 'ManasADC', platform: 'youtube', rank: 'master', role: 'Дракон',
    achievements: 'MVP Bishkek Wild Cup · гайды по крит-АДК',
    tierlist: { S: ['Jinx', 'Caitlyn'], A: ['Jhin', 'Vayne'], B: ['Ezreal'], C: [] },
    counters: { Jinx: ['Caitlyn', 'Jhin'], Vayne: ['Caitlyn'] },
    combos: { Jinx: ['Lulu', 'Nami'], Caitlyn: ['Lulu'] } },
  { name: 'BermetSupp', platform: 'tiktok', rank: 'diamond', role: 'Саппорт',
    achievements: 'Разбор вардинга · 60к в TikTok',
    tierlist: { S: ['Thresh', 'Leona'], A: ['Nami', 'Lulu'], B: ['Seraphine'], C: [] },
    counters: { Leona: ['Nami'], Thresh: ['Leona'] },
    combos: { Thresh: ['Jinx'], Lulu: ['Vayne', 'Jinx'] } }
];
var RANK_LABELS = { sovereign: 'Суверен', challenger: 'Челленджер', grandmaster: 'Грандмастер', master: 'Мастер', diamond: 'Бриллиант' };
var PLAT_ICONS = { youtube: '▶', twitch: '◆', tiktok: '♪' };
var PLAT_LABELS = { youtube: 'YouTube', twitch: 'Twitch', tiktok: 'TikTok' };

/* ══════════════════════════════════════════════════════════
   СОСТОЯНИЕ
══════════════════════════════════════════════════════════ */
var V = { br: 'tree', mcard: 'compact', gtable: 'table', tcard: 'roster', icard: 'poster',
          wiz: 'steps', conn: 'on', hover: 'glow', density: 'normal', anim: 'fade' };
var S = { section: 'tours', view: 'list', tab: 'active', tid: null, brTab: 'bracket',
          step: 1, draft: {}, q: '', infTab: 'tier', listFilter: 'all',
          isAdmin: true /* лаб: эмулируем админа (в боевом = uid===ADMIN_UID) */ };
var OV = [];   // стопка оверлеев (МАТРЁШКА: Esc закрывает только верхний)
var SPLASH = 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Lux_0.jpg';

function curT() { return STORE.tournaments.filter(function (t) { return t.id === S.tid; })[0] || null; }

/* ══════════════════════════════════════════════════════════
   МЕЛКИЕ ХЕЛПЕРЫ ВИДА
══════════════════════════════════════════════════════════ */
function logo(team, size, cls) {
  var letter = team && team.name ? team.name[0].toUpperCase() : '?';
  return '<div class="logo-ph ' + (cls || '') + '" style="width:' + size + 'px;height:' + size + 'px;font-size:' +
    Math.round(size * 0.45) + 'px">' + _e(letter) + '</div>';
}
function badge(status) {
  var cl = status === 'active' ? 'live' : status === 'completed' ? 'done' : 'up';
  return '<span class="badge ' + cl + '">' + (STATUS_LABEL[status] || '') + '</span>';
}
function teamRecord(t, teamId) {
  var w = 0, l = 0;
  matchArr(t).forEach(function (m) {
    if (!m.winnerId) return;
    if (m.team1Id === teamId || m.team2Id === teamId) { if (m.winnerId === teamId) w++; else l++; }
  });
  return w + '–' + l;
}
function toast(msg) {
  var old = document.querySelector('.toast'); if (old) old.remove();
  var el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(function () { el.remove(); }, 2200);
}

/* ══════════════════════════════════════════════════════════
   СПИСОК ТУРНИРОВ
══════════════════════════════════════════════════════════ */
function htmlList() {
  var counts = { active: 0, upcoming: 0, completed: 0 };
  STORE.tournaments.forEach(function (t) { counts[t.status]++; });
  var tabs = [['active', 'Идут'], ['upcoming', 'Скоро'], ['completed', 'Завершённые']].map(function (x) {
    return '<button class="' + (S.tab === x[0] ? 'on' : '') + '" data-act="tab" data-v="' + x[0] + '">' +
      x[1] + ' <span class="cnt">' + counts[x[0]] + '</span></button>';
  }).join('');

  var list = STORE.tournaments.filter(function (t) {
    if (t.status !== S.tab) return false;
    if (S.listFilter === 'official' && !t.official) return false;
    if (S.listFilter === 'community' && t.official) return false;
    if (S.q && t.name.toLowerCase().indexOf(S.q.toLowerCase()) < 0) return false;
    return true;
  }).sort(function (a, b) { return (b.official ? 1 : 0) - (a.official ? 1 : 0); }); // ★ официальные выше

  var body = list.length ? list.map(function (t) {
    var teams = Object.keys(t.teams).length;
    var offBadge = t.official ? '<span class="badge official" title="Официальный турнир PRO-WILDRIFT">⭐ Официальный</span>' : '';
    var openBadge = t.entryMode === 'open' ? '<span class="badge up" title="Открытая запись">📝 запись</span>' : '';
    return '<div class="t-card' + (t.official ? ' is-official' : '') + '" data-act="openT" data-v="' + t.id + '">' +
      '<div class="t-ico">' + (t.official ? '⭐' : '🏆') + '</div>' +
      '<div><div class="t-name">' + _e(t.name) + ' ' + offBadge + ' ' + badge(t.status) + ' ' + openBadge +
        (t.isPublic ? ' <span class="badge pub" title="Открыт по ссылке">🌐</span>' : '') + '</div>' +
      '<div class="t-meta">' + FORMAT_LABELS[t.format] + ' · ' + teams + '/' + t.teamCount +
        ' команд · BO' + t.bo + ' · 📅 ' + _e(t.date) + ' · 👤 ' + _e(t.createdByName) + '</div></div>' +
      '<div class="t-prize">' + (t.prizePool ? _e(t.prizePool) : '<span style="opacity:.4">без приза</span>') + '</div>' +
      '<div class="t-arr">›</div></div>';
  }).join('') : '<div class="empty"><span class="ic">📭</span>Нет турниров в этой категории</div>';

  var filters = [['all', 'Все'], ['official', '⭐ Официальные'], ['community', 'Комьюнити']].map(function (x) {
    return '<button class="' + (S.listFilter === x[0] ? 'on' : '') + '" data-act="listFilter" data-v="' + x[0] + '">' + x[1] + '</button>';
  }).join('');

  return '<section class="topbar glass">' +
      '<div class="seg2">' + tabs + '</div>' +
      '<div class="seg2" style="margin-left:12px">' + filters + '</div>' +
      '<div class="sp"></div>' +
      '<div class="search"><input type="text" id="qInp" placeholder="поиск турнира…" value="' + _e(S.q) + '"></div>' +
      '<button class="btn pri" data-act="create">＋ Создать турнир</button>' +
    '</section>' +
    '<section class="panel glass"><div class="t-list">' + body + '</div></section>';
}

/* ══════════════════════════════════════════════════════════
   МАСТЕР СОЗДАНИЯ: тип сетки → команды → настройки, ЖИВОЕ ПРЕВЬЮ справа
══════════════════════════════════════════════════════════ */
function draftDefaults() {
  var d = S.draft;
  if (!d.format) d.format = 'single_elim';
  if (!d.teamCount) d.teamCount = 8;
  if (!d.bo) d.bo = 3;
  if (!d.teams) d.teams = [];
  if (d.isPublic === undefined) d.isPublic = true;
  if (!d.entryMode) d.entryMode = 'manual';
  if (d.official === undefined) d.official = false;
  return d;
}
function fmtSkeleton(k) {
  if (k === 'group_elim') return '<i></i><i></i><u></u><i></i><i></i><u></u><i></i>';
  if (k === 'double_elim') return '<i></i><u></u><i></i><u></u><i></i><i></i><u></u><i></i>';
  return '<i></i><u></u><i></i><u></u><i></i>';
}
function htmlWizard() {
  var d = draftDefaults();
  var steps = ['Тип сетки', 'Команды', 'Настройки'].map(function (lbl, i) {
    var n = i + 1;
    return '<div class="wstep' + (S.step === n ? ' on' : (S.step > n ? ' done' : '')) + '" data-act="wizStep" data-v="' + n + '">' +
      '<span class="n">' + n + '</span>' + lbl + '</div>';
  }).join('');

  /* шаг 1 — визуальный выбор формата (UI-KIT: visual picker, не select) */
  var fmts = Object.keys(FORMAT_LABELS).map(function (k) {
    return '<button class="fmt' + (d.format === k ? ' on' : '') + '" data-act="wizFmt" data-v="' + k + '">' +
      '<div class="fmt-n">' + (k === 'group_elim' ? '🔢' : k === 'double_elim' ? '🔁' : '⚔') + ' ' + FORMAT_LABELS[k] + '</div>' +
      '<div class="fmt-d">' + FORMAT_DESC[k] + '</div>' +
      '<div class="fmt-sk">' + fmtSkeleton(k) + '</div></button>';
  }).join('');
  var counts = [4, 8, 12, 16, 24, 32].map(function (n) {
    return '<button class="pickbtn' + (d.teamCount === n ? ' on' : '') + '" data-act="wizCount" data-v="' + n + '">' + n + '</button>';
  }).join('');

  /* шаг 2 — команды */
  var teamRows = d.teams.length ? d.teams.map(function (t, i) {
    return '<div class="wteam"><span class="seed">#' + (i + 1) + '</span>' + logo(t, 30) +
      '<div><div class="nm">' + _e(t.name) + '</div><div class="pl">' +
        (t.players || []).filter(function (p) { return p.nick; }).length + ' игроков</div></div>' +
      '<button class="btn sm ico" data-act="wizDelTeam" data-v="' + i + '" title="Убрать">✕</button></div>';
  }).join('') : '<div class="empty" style="padding:18px">Пока пусто — добавь команды или залей демо-ростер</div>';

  /* шаг 3 — настройки */
  var bos = [1, 3, 5, 7].map(function (n) {
    return '<button class="pickbtn' + (d.bo === n ? ' on' : '') + '" data-act="wizBo" data-v="' + n + '">BO' + n + '</button>';
  }).join('');

  var body =
    '<div class="wstep-body' + (S.step === 1 ? ' on' : '') + '" data-step="1">' +
      '<div class="wstep-title">1 · Тип сетки</div>' +
      '<div class="field"><label>Как играем</label><div class="fmt-grid">' + fmts + '</div></div>' +
      '<div class="field"><label>Сколько команд</label><div class="row-btns">' + counts + '</div></div>' +
    '</div>' +
    '<div class="wstep-body' + (S.step === 2 ? ' on' : '') + '" data-step="2">' +
      '<div class="wstep-title">2 · Команды</div>' +
      '<div class="field"><label>Как набираем команды</label><div class="fmt-grid">' +
        '<button class="fmt' + (d.entryMode === 'manual' ? ' on' : '') + '" data-act="wizEntry" data-v="manual">' +
          '<div class="fmt-n">✍ Вручную</div><div class="fmt-d">Организатор сам вбивает команды и составы. Полный контроль.</div></button>' +
        '<button class="fmt' + (d.entryMode === 'open' ? ' on' : '') + '" data-act="wizEntry" data-v="open">' +
          '<div class="fmt-n">📝 Открытая запись</div><div class="fmt-d">Команды заявляются сами, организатор подтверждает. Можно совмещать с ручным набором.</div></button>' +
      '</div></div>' +
      (d.entryMode === 'open' ? '<div class="ov-note" style="margin:0 0 12px">📝 Открытая запись: после создания появится раздел «Заявки». Можно сразу засеять несколько команд вручную (посев), остальные придут заявками. <span class="demo">заявки — демо</span></div>' : '') +
      '<div class="field"><label>' + (d.entryMode === 'open' ? 'Засеять команду вручную (опционально)' : 'Название команды') + '</label>' +
        '<input class="inp" id="wizTeamName" placeholder="Ala-Too Esports" autocomplete="off"></div>' +
      '<div class="row-btns" style="margin-bottom:12px">' +
        '<button class="btn" data-act="wizAddTeam">+ Добавить команду</button>' +
        '<button class="btn" data-act="wizFillDemo">⚡ Залить демо-ростер</button>' +
        '<span style="align-self:center;font-size:12px;opacity:.7">' + d.teams.length + ' / ' + d.teamCount + '</span></div>' +
      '<div class="wteams">' + teamRows + '</div>' +
    '</div>' +
    '<div class="wstep-body' + (S.step === 3 ? ' on' : '') + '" data-step="3">' +
      '<div class="wstep-title">3 · Настройки</div>' +
      '<div class="field"><label>Название турнира</label>' +
        '<input class="inp" id="wizName" placeholder="Ala-Too Invitational 2026" value="' + _e(d.name || '') + '"></div>' +
      '<div class="field"><label>Формат серии</label><div class="row-btns">' + bos + '</div></div>' +
      '<div class="field"><label>Призовой фонд (опционально)</label>' +
        '<input class="inp" id="wizPrize" placeholder="150 000 сом" value="' + _e(d.prizePool || '') + '"></div>' +
      '<label class="chk"><input type="checkbox" id="wizThird"' + (d.thirdPlace ? ' checked' : '') +
        (d.format === 'single_elim' ? '' : ' disabled') + '><span>Матч за 3-е место (только Single Elimination)</span></label>' +
      '<label class="chk"><input type="checkbox" id="wizPublic"' + (d.isPublic ? ' checked' : '') +
        '><span>Публичный — открывается по прямой ссылке без входа</span></label>' +
      (S.isAdmin
        ? '<label class="chk"><input type="checkbox" id="wizOfficial"' + (d.official ? ' checked' : '') +
            '><span>⭐ Официальный турнир PRO-WILDRIFT <span class="demo">только админ</span></span></label>'
        : '<div class="ov-note" style="margin:8px 0 0">⭐ Пометку «Официальный» ставит только админ сайта. Твой турнир будет комьюнити-турниром.</div>') +
    '</div>';

  var nav = '<div class="wiz-acts">' +
    (S.step > 1 ? '<button class="btn" data-act="wizStep" data-v="' + (S.step - 1) + '">← Назад</button>' : '<button class="btn" data-act="back">← К списку</button>') +
    (S.step < 3 ? '<button class="btn pri" data-act="wizStep" data-v="' + (S.step + 1) + '">Далее →</button>'
                : '<button class="btn pri" data-act="wizCreate">Создать турнир 🚀</button>') +
    '</div>';

  return '<section class="wiz glass"><div class="wiz-steps">' + steps + '</div>' +
    '<div class="wiz-grid"><div>' + body + nav + '</div>' +
    '<div class="wiz-preview"><div class="prev-h">👁 Превью сетки — живьём <span class="demo">обновляется на каждый шаг</span></div>' +
      '<div class="prev-box" id="wizPreview">' + wizPreviewHTML() + '</div></div>' +
    '</div></section>';
}

/* Превью = ТОТ ЖЕ Engine + ТОТ ЖЕ рендер, что и в боевой сетке */
function previewTournament() {
  var d = draftDefaults();
  var teams = {}, arr = [];
  for (var i = 0; i < d.teamCount; i++) {
    var real = d.teams[i];
    var id = 'p' + (i + 1);
    var team = { id: id, seed: i + 1, name: real ? real.name : 'Команда ' + (i + 1), players: real ? real.players : [], _ph: !real };
    teams[id] = team; arr.push(team);
  }
  var t = { id: '__preview', name: d.name || 'Новый турнир', format: d.format, bo: d.bo,
    thirdPlace: !!d.thirdPlace, teamCount: d.teamCount, teams: teams, matches: {}, status: 'upcoming', groupConfig: null };
  startTournament(t);
  STORE.tournaments = STORE.tournaments.filter(function (x) { return x.id !== '__preview'; });
  return t;
}
function wizPreviewHTML() {
  var d = draftDefaults();
  var t = previewTournament();
  var mCount = matchArr(t).length;
  var rounds = t.format === 'group_elim'
    ? Object.keys(JSON.parse(t.groupConfig || '{}')).length + ' групп'
    : Math.max.apply(null, matchArr(t).map(function (m) { return m.round; })) + ' раундов';
  var kpis = '<div class="prev-sum">' +
    '<div class="kpi">Матчей<b>' + mCount + '</b></div>' +
    '<div class="kpi">Структура<b>' + rounds + '</b></div>' +
    '<div class="kpi">Серия<b>BO' + d.bo + '</b></div>' +
    '<div class="kpi">Команд<b>' + d.teams.length + '/' + d.teamCount + '</b></div></div>';
  var brHtml = t.format === 'group_elim' ? groupsHTML(t, true) : bracketHTML(t, true);
  return kpis + brHtml;
}

/* ══════════════════════════════════════════════════════════
   ТУРНИР — шапка + вкладки
══════════════════════════════════════════════════════════ */
function htmlTournament() {
  var t = curT();
  if (!t) return '<div class="empty">Турнир не найден</div>';
  var has = matchArr(t).length > 0;
  var tabs = [['bracket', t.format === 'group_elim' ? '🔢 Группы' : '🏆 Сетка'], ['schedule', '📅 Расписание'], ['teams', '👥 Команды']]
    .map(function (x) {
      return '<button class="' + (S.brTab === x[0] ? 'on' : '') + '" data-act="brTab" data-v="' + x[0] + '">' + x[1] + '</button>';
    }).join('');

  var acts =
    (!has ? '<button class="btn pri" data-act="start">▶ Запустить турнир</button>' : '') +
    '<button class="btn" data-act="share">🔗 Поделиться</button>' +
    '<button class="btn" data-act="back">← К списку</button>';

  var apps = (t.entryMode === 'open' && !has) ? applicationsHTML(t) : '';
  var body = S.brTab === 'teams' ? teamsHTML(t)
    : S.brTab === 'schedule' ? scheduleHTML(t)
    : (!has ? apps + '<div class="empty"><span class="ic">📋</span>Турнир ещё не запущен. ' +
        (t.entryMode === 'open' ? 'Подтверди заявки или добавь команды, затем ' : 'Добавь команды и ') + 'жми «Запустить».</div>'
      : t.format === 'group_elim' ? groupsHTML(t, false)
      : bracketHTML(t, false));

  return '<section class="t-head glass">' +
      '<div><div class="th-name">' + _e(t.name) + ' <span id="tStatus">' + badge(t.status) + '</span>' +
        (t.isPublic ? ' <span class="badge pub">🌐 публичный</span>' : '') + '</div>' +
      '<div class="th-meta">' + FORMAT_LABELS[t.format] + ' · ' + Object.keys(t.teams).length + ' команд · BO' + t.bo +
        (t.prizePool ? ' · 🏅 ' + _e(t.prizePool) : '') + ' · 📅 ' + _e(t.date) + ' · 📍 ' + _e(t.region) + '</div></div>' +
      '<div class="th-acts">' + acts + '</div></section>' +
    '<section class="topbar glass"><div class="seg2">' + tabs + '</div>' +
      '<div class="sp"></div><span class="demo">команды и счёт — демо</span></section>' +
    '<section class="panel glass" style="padding:0" id="tBody">' + body + '</section>';
}

/* ─── ЗАЯВКИ (открытая запись): подтвердить/отклонить ─── */
function applicationsHTML(t) {
  var pending = (t.applications || []).filter(function (a) { return a.status === 'pending'; });
  var accepted = Object.keys(t.teams).length;
  var rows = pending.length ? pending.map(function (a, i) {
    var champs = (a.players || []).slice(0, 5).map(function (p) {
      return (p.champs || []).slice(0, 1).map(function (c) {
        return '<img src="' + champIcon(c) + '" alt="" loading="lazy" style="width:20px;height:20px;border-radius:5px">';
      }).join('');
    }).join('');
    return '<div class="wteam" style="grid-template-columns:30px 1fr auto auto">' + logo(a, 30) +
      '<div><div class="nm">' + _e(a.name) + '</div><div class="pl">' +
        (a.players || []).filter(function (p) { return p.nick; }).length + ' игроков · ' + champs + '</div></div>' +
      '<button class="btn sm pri" data-act="appAccept" data-v="' + i + '">✓ Принять</button>' +
      '<button class="btn sm" data-act="appReject" data-v="' + i + '">✕</button></div>';
  }).join('') : '<div class="empty" style="padding:16px">Новых заявок нет</div>';
  return '<div style="padding:var(--pad)"><div class="ov-sec" style="margin-top:0">📝 Заявки команд · принято ' +
    accepted + '/' + t.teamCount + ' <span class="demo">заявки демо</span></div>' + rows + '</div>';
}

/* ─── СЕТКА (SE / DE / плей-офф групп) ─── */
function bracketHTML(t, mini) {
  var all = matchArr(t);
  if (!all.length) return '<div class="empty">Нет матчей</div>';
  if (t.format === 'double_elim') {
    var ub = all.filter(function (m) { return m.phase === 'upper'; });
    var lb = all.filter(function (m) { return m.phase === 'lower'; });
    var gf = all.filter(function (m) { return m.phase === 'final'; })[0];
    return '<div class="sec-hdr">Верхняя сетка</div>' + colsHTML(t, ub, 'ub', mini) +
      '<div class="sec-hdr">Нижняя сетка</div>' + colsHTML(t, lb, 'lb', mini) +
      (gf ? '<div class="sec-hdr">Гранд Финал</div><div class="third">' + matchHTML(t, gf) +
        winnerHTML(t, gf) + '</div>' : '');
  }
  var main = all.filter(function (m) { return m.phase !== 'third_place'; });
  var third = all.filter(function (m) { return m.phase === 'third_place'; })[0];
  var finalM = main.filter(function (m) { return m.round === Math.max.apply(null, main.map(function (x) { return x.round; })); })[0];
  return colsHTML(t, main, 'se', mini) +
    (third ? '<div class="sec-hdr">Матч за 3-е место</div><div class="third">' + matchHTML(t, third) + '</div>' : '') +
    (finalM && finalM.winnerId ? '<div class="third">' + winnerHTML(t, finalM) + '</div>' : '');
}

function colsHTML(t, matches, key, mini) {
  var rounds = {}, maxRound = 0;
  matches.forEach(function (m) {
    var r = m.round || 1;
    (rounds[r] = rounds[r] || []).push(m);
    if (r > maxRound) maxRound = r;
  });
  Object.keys(rounds).forEach(function (r) {
    rounds[r].sort(function (a, b) { return (a.matchNum || 0) - (b.matchNum || 0); });
  });
  var slotH = mini ? 62 : 104;
  var r1 = (rounds[1] || []).length;
  var totalH = r1 * slotH;

  var cols = '';
  for (var r = 1; r <= maxRound; r++) {
    var rm = rounds[r] || []; if (!rm.length) continue;
    var h = totalH / rm.length;
    cols += '<div class="br-col"><div class="br-rlabel">' + _e(rm[0].label || ('Раунд ' + r)) + '</div>' +
      '<div class="br-matches" style="height:' + totalH + 'px">' +
      rm.map(function (m) {
        return '<div class="slot-wrap" style="height:' + h + 'px">' + matchHTML(t, m) + '</div>';
      }).join('') + '</div></div>';
  }
  return '<div class="br-wrap"><div class="br" data-br="' + key + '">' + cols +
    '<svg class="br-svg"></svg></div></div>';
}

function slotHTML(t, m, num) {
  var teamId = num === 1 ? m.team1Id : m.team2Id;
  var src    = num === 1 ? m.team1Source : m.team2Source;
  var score  = num === 1 ? m.score1 : m.score2;
  var team   = teamId ? t.teams[teamId] : null;
  var isWin  = !!m.winnerId && m.winnerId === teamId;
  if (!team) {
    var hint = 'TBD';
    if (src) {
      var srcM = t.matches[src.matchId];
      hint = (src.takes === 'winner' ? 'Победитель' : 'Проигравший') + ' · ' + ((srcM && srcM.label) || src.matchId);
    }
    return '<div class="slot tbd"><div class="logo-ph s-logo">?</div>' +
      '<span class="s-name hint">' + _e(hint) + '</span><span class="s-score"></span></div>';
  }
  return '<div class="slot' + (isWin ? ' win' : '') + '" data-act="team" data-v="' + team.id + '">' +
    logo(team, 24, 's-logo') + '<span class="s-name">' + _e(team.name) + '</span>' +
    '<span class="s-score">' + (m.winnerId ? (score || 0) : '') + '</span></div>';
}

function matchHTML(t, m) {
  var done = !!m.winnerId;
  var playable = m.team1Id && m.team2Id && !done;
  var acts = '';
  if (playable) acts = '<div class="mt-acts"><button class="btn sm" data-act="score" data-v="' + m.id + '">Ввести счёт</button></div>';
  else if (done) acts = '<div class="mt-acts"><button class="btn sm" data-act="undo" data-v="' + m.id + '">↩ Отменить</button></div>';
  return '<div class="mt" data-mid="' + m.id + '" data-act="match" data-v="' + m.id + '">' +
    '<div class="mt-lbl">' + (m.status === 'live' ? '<span class="mt-live">● LIVE</span>' : '') +
      _e(m.label || '') + '<span class="bo">BO' + (m.bo || t.bo) + '</span></div>' +
    slotHTML(t, m, 1) + slotHTML(t, m, 2) + acts + '</div>';
}

function winnerHTML(t, finalM) {
  var w = finalM.winnerId ? t.teams[finalM.winnerId] : null;
  if (!w) return '';
  return '<div class="winner-card" data-act="team" data-v="' + w.id + '">' +
    logo(w, 54, 'wc-logo') + '<div class="wc-name">' + _e(w.name) + '</div><div class="wc-crown">🏆</div></div>';
}

/* ─── ГРУППЫ + плей-офф ─── */
function groupsHTML(t, mini) {
  var all = matchArr(t);
  var groupM = all.filter(function (m) { return m.phase === 'group'; });
  var poM    = all.filter(function (m) { return m.phase === 'playoff'; });
  if (!groupM.length) return '<div class="empty">Нет матчей</div>';

  var groupConfig = {};
  try { groupConfig = JSON.parse(t.groupConfig || '{}'); } catch (e) {}
  var byG = {};
  groupM.forEach(function (m) { (byG[m.group] = byG[m.group] || []).push(m); });

  var blocks = Object.keys(byG).sort().map(function (g) {
    return '<div class="grp" data-grp="' + g + '"><div class="grp-h">Группа ' + g + '</div>' +
      groupTableHTML(t, g, byG[g], groupConfig[g] || []) +
      '<div class="grp-matches">' + byG[g].map(function (m) { return matchHTML(t, m); }).join('') + '</div></div>';
  }).join('');

  var allDone = groupM.every(function (m) { return !!m.winnerId; });
  var poBtn = (allDone && !poM.length && !mini)
    ? '<div style="padding:0 var(--pad) var(--pad);text-align:center"><button class="btn pri" data-act="startPlayoff">▶ Запустить плей-офф</button></div>' : '';
  var poHtml = poM.length ? '<div class="sec-hdr">Плей-офф</div>' + colsHTML(t, poM, 'po', mini) +
    (function () {
      var fin = poM.filter(function (m) { return m.round === Math.max.apply(null, poM.map(function (x) { return x.round; })); })[0];
      return fin && fin.winnerId ? '<div class="third">' + winnerHTML(t, fin) + '</div>' : '';
    })() : '';

  return '<div class="grp-grid">' + blocks + '</div>' + poBtn + poHtml;
}

function groupTableHTML(t, g, gMatches, ids) {
  var st = Engine.computeStandings(gMatches, ids);
  var rows = st.map(function (row, i) {
    var team = t.teams[row.teamId];
    var diff = row.scoreFor - row.scoreAgainst;
    return '<tr class="' + (i < 2 ? 'q' : '') + '" data-act="team" data-v="' + row.teamId + '">' +
      '<td>' + (i + 1) + '</td><td><span class="gt-team">' + logo(team, 22) +
      _e(team ? team.name : '—') + '</span></td>' +
      '<td>' + row.wins + '</td><td>' + row.losses + '</td>' +
      '<td>' + (diff > 0 ? '+' : '') + diff + '</td></tr>';
  }).join('');
  return '<table class="gt" data-gt="' + g + '"><thead><tr><th>#</th><th>Команда</th><th>В</th><th>П</th><th>±</th></tr></thead>' +
    '<tbody>' + rows + '</tbody></table>';
}

/* ─── РАСПИСАНИЕ ─── */
function scheduleHTML(t) {
  var all = matchArr(t);
  if (!all.length) return '<div class="empty">Расписание появится после запуска</div>';
  var up = all.filter(function (m) { return !m.winnerId; });
  var done = all.filter(function (m) { return !!m.winnerId; });
  function row(m) {
    var t1 = m.team1Id ? t.teams[m.team1Id] : null;
    var t2 = m.team2Id ? t.teams[m.team2Id] : null;
    var r = rng(t.id + m.id);
    var hh = 14 + Math.floor(r() * 7), mm = r() > 0.5 ? '00' : '30';
    return '<div class="sr" data-act="match" data-v="' + m.id + '">' +
      '<span class="sr-lbl">' + _e(m.label || '') + ' · BO' + (m.bo || t.bo) + '</span>' +
      '<span class="sr-teams">' + (t1 ? _e(t1.name) : 'TBD') + ' <span class="sr-vs">vs</span> ' + (t2 ? _e(t2.name) : 'TBD') + '</span>' +
      (m.winnerId ? '<span class="sr-score">' + m.score1 + ':' + m.score2 + '</span>'
                  : '<span class="sr-time">' + hh + ':' + mm + '</span>') +
      (m.winnerId ? '<span class="badge done">финал</span>' : '<span class="badge up">ждём</span>') + '</div>';
  }
  return '<div class="sched">' +
    (up.length ? '<div class="sched-h">Предстоящие</div>' + up.map(row).join('') : '') +
    (done.length ? '<div class="sched-h">Сыгранные</div>' + done.map(row).join('') : '') + '</div>';
}

/* ─── КОМАНДЫ ─── */
function teamsHTML(t) {
  var arr = teamsSorted(t);
  if (!arr.length) return '<div class="empty">Нет команд</div>';
  return '<div class="teams-grid">' + arr.map(function (team) {
    var players = (team.players || []).filter(function (p) { return p.nick; }).map(function (p, pi) {
      return '<div class="pl-row" data-act="player" data-v="' + team.id + '|' + pi + '">' +
        '<span>' + (ROLES[p.role] || '').split(' ')[0] + '</span>' +
        '<span>' + _e(p.nick) + ' <span class="pl-role">' + (ROLES[p.role] || '').split(' ').slice(1).join(' ') + '</span></span>' +
        '<span class="pl-champs">' + (p.champs || []).map(function (c) {
          return '<img src="' + champIcon(c) + '" alt="" title="' + _e((CH_BY_K[c] || {}).n || c) + '" loading="lazy" data-act="champ" data-v="' + c + '">';
        }).join('') + '</span></div>';
    }).join('');
    return '<div class="tc" data-act="team" data-v="' + team.id + '">' +
      '<div class="tc-h">' + logo(team, 40) +
        '<div><div class="tc-n">' + _e(team.name) + '</div><div class="tc-s">Посев #' + team.seed + '</div></div>' +
        '<span class="tc-rec">' + teamRecord(t, team.id) + '</span></div>' +
      '<div class="tc-pl">' + players + '</div></div>';
  }).join('') + '</div>';
}

/* ══════════════════════════════════════════════════════════
   ИНФЛЮЕНСЕРЫ — список + 4 вкладки (Достижения · Комбо · Контр · Тир-лист)
══════════════════════════════════════════════════════════ */
function htmlInf() {
  var cards = INFLUENCERS.map(function (inf, i) {
    var dots = (inf.tierlist ? '<span title="Тир-лист">🏆</span>' : '') +
      (inf.counters ? '<span title="Контр-пики">🔴</span>' : '') +
      (inf.combos ? '<span title="Комбо">🟢</span>' : '');
    return '<div class="inf" data-act="inf" data-v="' + i + '">' +
      '<div class="inf-av">' + _e(inf.name[0]) + '</div>' +
      '<div><div class="inf-n">' + _e(inf.name) + '</div>' +
      '<div class="inf-m">' + (PLAT_ICONS[inf.platform] || '●') + ' ' + PLAT_LABELS[inf.platform] + ' · ' + _e(inf.role) + '</div></div>' +
      '<div class="inf-dots">' + dots + '</div>' +
      (inf.rank ? '<span class="rank">' + RANK_LABELS[inf.rank] + '</span>' : '') + '</div>';
  }).join('');
  return '<section class="topbar glass"><b style="font-size:14px">⭐ Инфлюенсеры и их мнение</b>' +
    '<span style="font-size:12.5px;opacity:.8">тир-листы, комбо и контр-пики от известных игроков</span>' +
    '<div class="sp"></div><span class="demo">демо-профили (в боевом — Firestore)</span></section>' +
    '<section class="panel glass" style="padding:0"><div class="inf-grid">' + cards + '</div></section>';
}

/* ══════════════════════════════════════════════════════════
   ОВЕРЛЕИ (МАТРЁШКА): команда → игрок → чемп, матч → чемп
══════════════════════════════════════════════════════════ */
function openOv(type, payload) { OV.push({ type: type, payload: payload, tab: type === 'inf' ? 'tier' : null }); renderOv(); }
function closeOv() { OV.pop(); renderOv(); }
function closeAllOv() { OV = []; renderOv(); }

function ovHead(title, sub, avatarHtml) {
  return '<div class="ov-head">' + (avatarHtml || '') +
    '<div><div class="ov-name">' + title + '</div><div class="ov-sub">' + sub + '</div></div>' +
    '<div class="ov-x">' + (OV.length > 1 ? '<button class="btn sm" data-act="ovBack">‹ Назад</button>' : '') +
    '<button class="btn sm ico" data-act="ovClose">✕</button></div></div>';
}
function ovLink(label, ic) { return '<button class="ov-link" data-act="link" data-v="' + _e(label) + '"><span>' + ic + '</span>' + label + '<span class="arr">→</span></button>'; }

function ovTeam(teamId) {
  var t = curT(); var team = t && t.teams[teamId]; if (!team) return '';
  var played = matchArr(t).filter(function (m) { return m.team1Id === teamId || m.team2Id === teamId; });
  var players = (team.players || []).filter(function (p) { return p.nick; }).map(function (p, pi) {
    return '<div class="pl-row" data-act="player" data-v="' + teamId + '|' + pi + '" style="background:rgba(255,255,255,.05)">' +
      '<span>' + (ROLES[p.role] || '').split(' ')[0] + '</span>' +
      '<span>' + _e(p.nick) + ' <span class="pl-role">' + (ROLES[p.role] || '').split(' ').slice(1).join(' ') + '</span></span>' +
      '<span class="pl-champs">' + (p.champs || []).map(function (c) {
        return '<img src="' + champIcon(c) + '" alt="" loading="lazy" data-act="champ" data-v="' + c + '" title="' + _e((CH_BY_K[c] || {}).n || c) + '">';
      }).join('') + '</span></div>';
  }).join('');
  var mHtml = played.map(function (m) {
    var opId = m.team1Id === teamId ? m.team2Id : m.team1Id;
    var op = opId ? t.teams[opId] : null;
    var mine = m.team1Id === teamId ? m.score1 : m.score2;
    var his  = m.team1Id === teamId ? m.score2 : m.score1;
    return '<div class="sr" data-act="match" data-v="' + m.id + '" style="grid-template-columns:110px 1fr auto">' +
      '<span class="sr-lbl">' + _e(m.label || '') + '</span>' +
      '<span class="sr-teams">vs ' + (op ? _e(op.name) : 'TBD') + '</span>' +
      (m.winnerId ? '<span class="sr-score" style="color:' + (m.winnerId === teamId ? 'var(--win)' : 'var(--lose)') + '">' +
        mine + ':' + his + '</span>' : '<span class="sr-time">ждём</span>') + '</div>';
  }).join('');

  return ovHead(_e(team.name) + ' <span class="demo">демо</span>',
      'Посев #' + team.seed + ' · счёт в турнире ' + teamRecord(t, teamId), logo(team, 58, 'ov-av')) +
    '<div class="ov-body">' +
      '<div class="ov-sec">Состав — клик по игроку открывает профиль</div>' + players +
      '<div class="ov-sec">Матчи команды</div>' + (mHtml || '<div class="empty">Матчей ещё нет</div>') +
      '<div class="ov-links">' + ovLink('Страница команды', '🏳') + ovLink('Все турниры команды', '🏆') + '</div>' +
      '<div class="ov-note">ЗАКОН СВЯЗЕЙ: команда → состав → игрок → его чемпионы → карточка чемпа. Ни одного тупика.</div>' +
    '</div>';
}

function ovPlayer(v) {
  var parts = v.split('|');
  var t = curT(); var team = t && t.teams[parts[0]]; if (!team) return '';
  var p = (team.players || [])[+parts[1]]; if (!p) return '';
  var champs = (p.champs || []).map(function (c) {
    return '<img src="' + champIcon(c) + '" alt="" loading="lazy" data-act="champ" data-v="' + c + '" title="' + _e((CH_BY_K[c] || {}).n || c) + '">';
  }).join('');
  return ovHead(_e(p.nick) + ' <span class="demo">демо</span>',
      (ROLES[p.role] || '') + ' · ' + _e(team.name),
      '<div class="inf-av ov-av">' + _e(p.nick[0]) + '</div>') +
    '<div class="ov-body">' +
      '<div class="ov-sec">Статистика игрока <span class="demo">демо</span></div>' +
      '<div class="ov-stats">' +
        '<div class="ov-stat"><span>KDA</span><b>' + p.kda + '</b></div>' +
        '<div class="ov-stat"><span>Винрейт</span><b>' + p.winrate + '%</b></div>' +
        '<div class="ov-stat"><span>Матчей</span><b>' + p.games + '</b></div>' +
        '<div class="ov-stat"><span>Роль</span><b>' + (ROLES[p.role] || '').split(' ').slice(1).join(' ') + '</b></div>' +
      '</div>' +
      '<div class="ov-sec">Любимые чемпионы — клик открывает карточку</div>' +
      '<div class="tier-champs">' + champs + '</div>' +
      '<div class="ov-links">' + ovLink('Профиль на сайте', '👤') + ovLink('Написать в чат', '💬') + ovLink('Драфты игрока', '🎯') + '</div>' +
      '<div class="ov-note">В боевом это тот же профиль, что и на сайте (Firestore-юзер), а не отдельная сущность.</div>' +
    '</div>';
}

function ovChamp(k) {
  var c = CH_BY_K[k] || { k: k, n: k };
  var r = rng('champ' + k);
  var wr = (46 + r() * 9).toFixed(1), pr = (4 + r() * 20).toFixed(1), br = (1 + r() * 25).toFixed(1);
  var tier = ['S', 'A', 'B'][Math.floor(r() * 3)];
  return ovHead(_e(c.n), 'Чемпион Wild Rift · иконка реальная, цифры демо',
      '<img class="ov-av" src="' + champIcon(k) + '" alt="" style="border-radius:13px">') +
    '<div class="ov-body">' +
      '<div class="ov-sec">Мета <span class="demo">демо-цифры</span></div>' +
      '<div class="ov-stats">' +
        '<div class="ov-stat"><span>Винрейт</span><b>' + wr + '%</b></div>' +
        '<div class="ov-stat"><span>Тир</span><b>' + tier + '</b></div>' +
        '<div class="ov-stat"><span>Пикрейт</span><b>' + pr + '%</b></div>' +
        '<div class="ov-stat"><span>Банрейт</span><b>' + br + '%</b></div>' +
      '</div>' +
      '<div class="ov-links">' + ovLink('Страница чемпиона', '📄') + ovLink('Матчапы и контры', '⚔') +
        ovLink('Сборка и руны', '🛠') + ovLink('Кто на нём играет в турнирах', '🏆') + '</div>' +
      '<div class="ov-note">В боевом эти кнопки открывают реальные разделы сайта (карточка чемпа, матчапы, сборка).</div>' +
    '</div>';
}

/* демо-игры матча: пики/баны, длительность, MVP */
function matchGames(t, m) {
  if (!m.winnerId) return [];
  var total = (m.score1 || 0) + (m.score2 || 0);
  var r = rng(t.id + m.id + 'g');
  var out = [];
  var w1 = 0, w2 = 0;
  for (var i = 0; i < total; i++) {
    var firstWins;
    if (w1 === m.score1) firstWins = false;
    else if (w2 === m.score2) firstWins = true;
    else firstWins = r() > 0.5;
    if (firstWins) w1++; else w2++;
    function picks() {
      var pool = CHAMPS.slice(); var res = [];
      for (var j = 0; j < 5; j++) res.push(pool.splice(Math.floor(r() * pool.length), 1)[0].k);
      return res;
    }
    out.push({ n: i + 1, firstWins: firstWins, dur: (12 + Math.floor(r() * 12)) + ':' + (10 + Math.floor(r() * 49)),
      p1: picks(), p2: picks() });
  }
  return out;
}

function ovMatch(mid) {
  var t = curT(); var m = t && t.matches[mid]; if (!m) return '';
  var t1 = m.team1Id ? t.teams[m.team1Id] : null;
  var t2 = m.team2Id ? t.teams[m.team2Id] : null;
  var games = matchGames(t, m);
  function picksHTML(list, side) {
    return '<span class="g-side">' + side + '</span>' + list.map(function (c) {
      return '<img src="' + champIcon(c) + '" alt="" loading="lazy" data-act="champ" data-v="' + c + '" title="' + _e((CH_BY_K[c] || {}).n || c) + '">';
    }).join('');
  }
  var gHtml = games.map(function (g) {
    var winner = g.firstWins ? t1 : t2;
    return '<div class="game"><span class="g-n">#' + g.n + '</span>' +
      '<span class="g-picks">' + picksHTML(g.p1, '') + '<span class="g-side" style="margin:0 4px">vs</span>' + picksHTML(g.p2, '') + '</span>' +
      '<span><span class="g-dur">' + g.dur + '</span><br><span class="g-win">' + _e(winner ? winner.name : '') + '</span></span></div>';
  }).join('');

  var head = (t1 ? _e(t1.name) : 'TBD') + ' <span style="opacity:.5">vs</span> ' + (t2 ? _e(t2.name) : 'TBD');
  var sub = _e(m.label || '') + ' · BO' + (m.bo || t.bo) + (m.winnerId ? ' · счёт ' + m.score1 + ':' + m.score2 : ' · не сыгран');
  return '<div class="ov-head"><div><div class="ov-name">' + head + '</div><div class="ov-sub">' + sub + '</div></div>' +
    '<div class="ov-x">' + (OV.length > 1 ? '<button class="btn sm" data-act="ovBack">‹ Назад</button>' : '') +
    '<button class="btn sm ico" data-act="ovClose">✕</button></div></div>' +
    '<div class="ov-body">' +
      (t1 && t2 ? '<div class="ov-sec">Команды</div>' +
        '<div class="ov-links"><button class="ov-link" data-act="team" data-v="' + t1.id + '">' + logo(t1, 22) + _e(t1.name) + '<span class="arr">→</span></button>' +
        '<button class="ov-link" data-act="team" data-v="' + t2.id + '">' + logo(t2, 22) + _e(t2.name) + '<span class="arr">→</span></button></div>' : '') +
      (games.length ? '<div class="ov-sec">Карты серии — клик по чемпу открывает карточку <span class="demo">пики демо</span></div>' + gHtml
        : '<div class="ov-sec">Матч ещё не сыгран</div>') +
      (m.team1Id && m.team2Id && !m.winnerId ? '<div class="ov-acts"><button class="btn pri" data-act="score" data-v="' + m.id + '">Ввести счёт</button></div>' : '') +
      (m.winnerId ? '<div class="ov-acts"><button class="btn" data-act="undo" data-v="' + m.id + '">↩ Отменить результат</button></div>' : '') +
      '<div class="ov-links">' + ovLink('Открыть драфт этой серии', '🎯') + ovLink('Трансляция / VOD', '📺') + '</div>' +
    '</div>';
}

function ovScore(mid) {
  var t = curT(); var m = t && t.matches[mid]; if (!m) return '';
  var t1 = m.team1Id ? t.teams[m.team1Id] : null;
  var t2 = m.team2Id ? t.teams[m.team2Id] : null;
  var bo = m.bo || t.bo; var max = Math.ceil(bo / 2);
  return ovHead('Счёт матча', _e(m.label || '') + ' · BO' + bo + ' · до ' + max + ' побед', '') +
    '<div class="ov-body"><div class="score-edit">' +
      '<span class="se-t r">' + (t1 ? _e(t1.name) : 'TBD') + '</span>' +
      '<input type="number" id="sc1" min="0" max="' + max + '" value="' + (m.score1 || 0) + '">' +
      '<span style="opacity:.5">:</span>' +
      '<input type="number" id="sc2" min="0" max="' + max + '" value="' + (m.score2 || 0) + '">' +
      '<span class="se-t">' + (t2 ? _e(t2.name) : 'TBD') + '</span></div>' +
      '<div class="ov-note" id="scErr">Победитель автоматически уезжает дальше по сетке (propagateMatchResult).</div>' +
      '<div class="ov-acts"><button class="btn" data-act="ovClose">Отмена</button>' +
      '<button class="btn pri" data-act="scoreSave" data-v="' + mid + '">Сохранить</button></div></div>';
}

function ovInf(idx) {
  var inf = INFLUENCERS[+idx]; if (!inf) return '';
  var tab = OV[OV.length - 1].tab || 'tier';
  var tabs = [['tier', '🏆 Тир-лист'], ['combo', '🟢 Комбо'], ['counter', '🔴 Контр'], ['ach', '🎖 Достижения']]
    .map(function (x) { return '<button class="' + (tab === x[0] ? 'on' : '') + '" data-act="infTab" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('');

  var body = '';
  if (tab === 'tier') {
    var colors = { S: '#ff8f8f', A: '#ffc98f', B: '#ffe98f', C: '#9fe6b6' };
    body = ['S', 'A', 'B', 'C'].map(function (k) {
      var list = (inf.tierlist && inf.tierlist[k]) || [];
      if (!list.length) return '';
      return '<div class="tier-row"><div class="tier-lbl" style="background:' + colors[k] + '">' + k + '</div>' +
        '<div class="tier-champs">' + list.map(function (c) {
          return '<img src="' + champIcon(c) + '" alt="" loading="lazy" data-act="champ" data-v="' + c + '" title="' + _e((CH_BY_K[c] || {}).n || c) + '">';
        }).join('') + '</div></div>';
    }).join('') || '<div class="empty">Тир-лист не заполнен</div>';
  } else if (tab === 'combo' || tab === 'counter') {
    var src = tab === 'combo' ? inf.combos : inf.counters;
    var op = tab === 'combo' ? '+' : '→';
    body = Object.keys(src || {}).map(function (champ) {
      return '<div class="pair-row"><img class="pr-main" src="' + champIcon(champ) + '" alt="" loading="lazy" data-act="champ" data-v="' + champ + '">' +
        '<span class="pr-nm">' + _e((CH_BY_K[champ] || {}).n || champ) + '</span><span class="pr-op">' + op + '</span>' +
        '<span class="pr-list">' + (src[champ] || []).map(function (c) {
          return '<img src="' + champIcon(c) + '" alt="" loading="lazy" data-act="champ" data-v="' + c + '" title="' + _e((CH_BY_K[c] || {}).n || c) + '">';
        }).join('') + '</span></div>';
    }).join('') || '<div class="empty">Пусто</div>';
  } else {
    body = '<div style="font-size:13px;line-height:1.6">' + _e(inf.achievements || 'Не указано') + '</div>';
  }

  return ovHead(_e(inf.name) + (inf.rank ? ' <span class="rank">' + RANK_LABELS[inf.rank] + '</span>' : ''),
      (PLAT_ICONS[inf.platform] || '●') + ' ' + PLAT_LABELS[inf.platform] + ' · ' + _e(inf.role),
      '<div class="inf-av ov-av">' + _e(inf.name[0]) + '</div>') +
    '<div class="ov-body"><div class="ov-tabs">' + tabs + '</div>' + body +
      '<div class="ov-links">' + ovLink('Смотреть канал', '▶') + ovLink('Сравнить с мета-тиром сайта', '📊') + '</div>' +
      '<div class="ov-note">Клик по любому чемпу открывает его карточку — мнение инфлюенсера связано с данными сайта.</div>' +
    '</div>';
}

function renderOv() {
  var host = $('ovHost');
  if (!OV.length) { host.innerHTML = ''; return; }
  var top = OV[OV.length - 1];
  var inner =
    top.type === 'team'   ? ovTeam(top.payload) :
    top.type === 'player' ? ovPlayer(top.payload) :
    top.type === 'champ'  ? ovChamp(top.payload) :
    top.type === 'match'  ? ovMatch(top.payload) :
    top.type === 'score'  ? ovScore(top.payload) :
    top.type === 'inf'    ? ovInf(top.payload) : '';
  var wide = (top.type === 'match' || top.type === 'inf') ? ' wide' : '';
  host.innerHTML = '<div class="ov-scrim" data-act="ovClose"></div>' +
    '<div class="ov-wrap"><div class="ov-card glass' + wide + '" data-depth="2">' + inner + '</div></div>';
}

/* ══════════════════════════════════════════════════════════
   ТОЧЕЧНЫЕ ОБНОВЛЕНИЯ (НЕ перерисовываем весь экран)
══════════════════════════════════════════════════════════ */
function updateMatchCard(t, mid) {
  var m = t.matches[mid]; if (!m) return 0;
  var nodes = document.querySelectorAll('.mt[data-mid="' + mid + '"]');
  var n = 0;
  Array.prototype.forEach.call(nodes, function (el) {
    el.innerHTML = matchHTML(t, m).replace(/^<div[^>]*>/, '').replace(/<\/div>$/, '');
    n++;
  });
  return n;
}
function updateGroupTable(t, g) {
  var tbl = document.querySelector('table.gt[data-gt="' + g + '"]');
  if (!tbl) return;
  var gm = matchArr(t).filter(function (m) { return m.group === g; });
  var cfg = {}; try { cfg = JSON.parse(t.groupConfig || '{}'); } catch (e) {}
  var fresh = document.createElement('div');
  fresh.innerHTML = groupTableHTML(t, g, gm, cfg[g] || []);
  tbl.querySelector('tbody').innerHTML = fresh.querySelector('tbody').innerHTML;
}
function refreshStatusBadge(t) {
  var el = $('tStatus'); if (el) el.innerHTML = badge(t.status);
}
function applyResultToDOM(t, mid, touched) {
  var changed = updateMatchCard(t, mid);
  (touched || []).forEach(function (x) { changed += updateMatchCard(t, x); });
  var m = t.matches[mid];
  if (m && m.group) updateGroupTable(t, m.group);
  refreshStatusBadge(t);
  drawConnectors();
  return changed;
}

/* ══════════════════════════════════════════════════════════
   SVG-КОННЕКТОРЫ (порт из cybersport.js, адаптирован)
══════════════════════════════════════════════════════════ */
function drawConnectors() {
  if (V.br !== 'tree' || V.conn === 'off') {
    Array.prototype.forEach.call(document.querySelectorAll('.br-svg'), function (s) { s.innerHTML = ''; });
    return;
  }
  requestAnimationFrame(function () {
    var t = curT();
    Array.prototype.forEach.call(document.querySelectorAll('.br-wrap'), function (wrap) {
      var br = wrap.querySelector('.br'), svg = wrap.querySelector('.br-svg');
      if (!br || !svg) return;
      var cards = br.querySelectorAll('.mt');
      var byMid = {};
      Array.prototype.forEach.call(cards, function (c) { byMid[c.dataset.mid] = c; });
      var bRect = br.getBoundingClientRect();
      svg.setAttribute('width', br.scrollWidth); svg.setAttribute('height', br.scrollHeight);
      svg.style.width = br.scrollWidth + 'px'; svg.style.height = br.scrollHeight + 'px';
      var paths = '';
      Array.prototype.forEach.call(cards, function (card) {
        var mid = card.dataset.mid;
        var m = (t && t.matches[mid]) || (PREVIEW_T && PREVIEW_T.matches[mid]);
        if (!m) return;
        var dRect = card.getBoundingClientRect();
        var dx = dRect.left - bRect.left, dy = dRect.top - bRect.top, dH = dRect.height;
        [{ src: m.team1Source, slot: 1 }, { src: m.team2Source, slot: 2 }].forEach(function (pair) {
          if (!pair.src) return;
          var srcCard = byMid[pair.src.matchId]; if (!srcCard) return;
          var sRect = srcCard.getBoundingClientRect();
          var sx = sRect.right - bRect.left, sy = sRect.top + sRect.height / 2 - bRect.top;
          var ex = dx, ey = dy + (pair.slot === 1 ? dH * 0.30 : dH * 0.70);
          var midX = sx + (ex - sx) / 2;
          paths += '<path d="M ' + sx + ' ' + sy + ' C ' + midX + ' ' + sy + ', ' + midX + ' ' + ey + ', ' + ex + ' ' + ey +
            '" class="svg-link' + (pair.src.takes === 'loser' ? ' loser' : '') + '"/>';
        });
      });
      svg.innerHTML = paths;
    });
  });
}
var PREVIEW_T = null;

/* ══════════════════════════════════════════════════════════
   ГЛАВНЫЙ РЕНДЕР
══════════════════════════════════════════════════════════ */
function applyVars() {
  var el = document.documentElement;
  ['br', 'mcard', 'gtable', 'tcard', 'icard', 'wiz', 'conn', 'hover', 'density', 'anim'].forEach(function (k) {
    el.setAttribute('data-' + k, V[k]);
  });
  var sp = $('splash'); if (sp && !sp.style.backgroundImage) sp.style.backgroundImage = 'url(' + SPLASH + ')';
}
function render() {
  applyVars();
  var html = S.section === 'inf' ? htmlInf()
    : S.view === 'list' ? htmlList()
    : S.view === 'create' ? htmlWizard()
    : htmlTournament();
  labMorph($("app"), html);   // ТОЧЕЧНО: смена раздела/вкладки правит изменившееся
  var nav = $('navTours'), nav2 = $('navInf');
  if (nav)  nav.classList.toggle('on', S.section === 'tours');
  if (nav2) nav2.classList.toggle('on', S.section === 'inf');
  drawConnectors();
  updateChoice();
}
function refreshPreview() {
  var box = $('wizPreview'); if (!box) return;
  PREVIEW_T = previewTournament();
  labMorph(box, wizPreviewHTML());
  drawConnectors();
}

/* ══════════════════════════════════════════════════════════
   ДЕЛЕГИРОВАННЫЕ КЛИКИ (один слушатель — переклейка узлов не рвёт обработчики)
══════════════════════════════════════════════════════════ */
document.addEventListener('click', function (ev) {
  var el = ev.target.closest('[data-act]'); if (!el) return;
  var act = el.dataset.act, v = el.dataset.v;
  var t = curT();

  switch (act) {
    case 'section': S.section = v; S.view = 'list'; closeAllOv(); render(); return;
    case 'tab':     S.tab = v; render(); return;
    case 'listFilter': S.listFilter = v; render(); return;
    case 'openT':   S.tid = v; S.view = 'tournament'; S.brTab = 'bracket'; render(); return;
    case 'back':    S.view = 'list'; S.tid = null; render(); return;
    case 'brTab':   S.brTab = v; render(); return;
    case 'create':  S.view = 'create'; S.step = 1; S.draft = {}; render(); return;

    /* ─── мастер ─── */
    case 'wizStep':
      if (+v > S.step) syncWizardInputs();
      S.step = +v; render(); return;
    case 'wizFmt':
      syncWizardInputs(); S.draft.format = v;
      if (v !== 'single_elim') S.draft.thirdPlace = false;
      render(); return;
    case 'wizCount': syncWizardInputs(); S.draft.teamCount = +v; render(); return;
    case 'wizBo':    syncWizardInputs(); S.draft.bo = +v; render(); return;
    case 'wizEntry': syncWizardInputs(); S.draft.entryMode = v; render(); return;
    case 'wizAddTeam': {
      var inp = $('wizTeamName'); var nm = inp && inp.value.trim();
      if (!nm) { toast('Введи название команды'); return; }
      var d = draftDefaults();
      if (d.teams.length >= d.teamCount) { toast('Уже набрано ' + d.teamCount + ' команд'); return; }
      d.teams.push({ name: nm, players: ROLE_KEYS.map(function (r) { return { nick: '', role: r, champs: [] }; }) });
      render(); var i2 = $('wizTeamName'); if (i2) i2.focus(); return;
    }
    case 'wizFillDemo': {
      var dd = draftDefaults();
      var need = dd.teamCount - dd.teams.length;
      var demo = makeTeams('draft', dd.teamCount, 0);
      Object.keys(demo).slice(dd.teams.length, dd.teams.length + need).forEach(function (k) { dd.teams.push(demo[k]); });
      render(); return;
    }
    case 'wizDelTeam': draftDefaults().teams.splice(+v, 1); render(); return;
    case 'wizCreate': {
      syncWizardInputs();
      var d2 = draftDefaults();
      if (!d2.name) { toast('Введи название турнира'); S.step = 3; render(); return; }
      if (d2.teams.length < 2) { toast('Нужно минимум 2 команды'); S.step = 2; render(); return; }
      var id = 'u' + Date.now();
      var teams = {};
      d2.teams.forEach(function (x, i) {
        var tid = id + '_t' + (i + 1);
        teams[tid] = { id: tid, name: x.name, seed: i + 1, players: x.players || [] };
      });
      newTournament({ id: id, name: d2.name, format: d2.format, teamCount: d2.teamCount, bo: d2.bo,
        prizePool: d2.prizePool, thirdPlace: d2.thirdPlace, isPublic: d2.isPublic,
        entryMode: d2.entryMode, official: !!(S.isAdmin && d2.official),
        createdByName: S.isAdmin && d2.official ? 'PRO-WILDRIFT (админ)' : 'Ты (комьюнити)',
        date: 'дата не задана', teams: teams });
      S.tid = id; S.view = 'tournament'; S.brTab = 'bracket'; S.tab = 'upcoming';
      render(); toast(d2.entryMode === 'open' ? 'Турнир создан — открой заявки или добавь команды' : 'Турнир создан — жми «Запустить турнир»'); return;
    }

    /* ─── турнир ─── */
    case 'start':
      if (t && startTournament(t)) { render(); toast('Сетка сгенерирована'); }
      return;
    case 'startPlayoff':
      if (t && startPlayoff(t)) { render(); toast('Плей-офф запущен из топ-2 каждой группы'); }
      return;

    /* ─── заявки (открытая запись) ─── */
    case 'appAccept': {
      if (!t) return;
      var pend = (t.applications || []).filter(function (a) { return a.status === 'pending'; });
      var app = pend[+v]; if (!app) return;
      if (Object.keys(t.teams).length >= t.teamCount) { toast('Уже набрано ' + t.teamCount + ' команд'); return; }
      app.status = 'accepted';
      var seed = Object.keys(t.teams).length + 1;
      var tid2 = t.id + '_a' + seed;
      t.teams[tid2] = { id: tid2, name: app.name, seed: seed, players: app.players || [] };
      render(); toast('Команда «' + app.name + '» принята (посев #' + seed + ')');
      return;
    }
    case 'appReject': {
      if (!t) return;
      var pend2 = (t.applications || []).filter(function (a) { return a.status === 'pending'; });
      var app2 = pend2[+v]; if (!app2) return;
      app2.status = 'rejected';
      render(); toast('Заявка отклонена');
      return;
    }
    case 'share':
      toast('Ссылка скопирована (в боевом — публичная ссылка на турнир)'); return;

    /* ─── матч / счёт ─── */
    case 'match': openOv('match', v); return;
    case 'score': ev.stopPropagation(); openOv('score', v); return;
    case 'undo': {
      ev.stopPropagation();
      if (!t) return;
      var res = undoMatch(t, v);
      if (res) { closeAllOv(); var n = applyResultToDOM(t, v, res.touched); toast('Результат отменён · обновлено карточек: ' + n); }
      return;
    }
    case 'scoreSave': {
      if (!t) return;
      var s1 = parseInt(($('sc1') || {}).value, 10), s2 = parseInt(($('sc2') || {}).value, 10);
      var r = saveResult(t, v, s1, s2);
      if (typeof r === 'string') { var errEl = $('scErr'); if (errEl) { errEl.textContent = '⚠ ' + r; errEl.style.opacity = '1'; } return; }
      closeAllOv();
      var changed = applyResultToDOM(t, v, r.touched);
      toast('Счёт сохранён · точечно обновлено карточек: ' + changed);
      return;
    }

    /* ─── связи ─── */
    case 'team':   ev.stopPropagation(); openOv('team', v); return;
    case 'player': ev.stopPropagation(); openOv('player', v); return;
    case 'champ':  ev.stopPropagation(); openOv('champ', v); return;
    case 'inf':    openOv('inf', v); return;
    case 'infTab': OV[OV.length - 1].tab = v; renderOv(); return;
    case 'link':   toast('Связь → «' + v + '» (в боевом откроет раздел сайта)'); return;
    case 'ovClose': closeOv(); return;
    case 'ovBack':  closeOv(); return;
  }
});

/* поиск по списку — точечно, без перерисовки шапки */
document.addEventListener('input', function (ev) {
  if (ev.target.id === 'qInp') {
    S.q = ev.target.value;
    var listBox = document.querySelector('.t-list');
    if (!listBox) return;
    var tmp = document.createElement('div');
    tmp.innerHTML = htmlList();
    listBox.innerHTML = tmp.querySelector('.t-list').innerHTML;
  }
});

/* Esc закрывает ТОЛЬКО верхний оверлей (матрёшка) */
document.addEventListener('keydown', function (ev) {
  if (ev.key === 'Escape' && OV.length) { ev.preventDefault(); closeOv(); }
  if (ev.key === 'Enter' && OV.length && OV[OV.length - 1].type === 'score') {
    var btn = document.querySelector('[data-act="scoreSave"]'); if (btn) btn.click();
  }
});

/* поля мастера читаем перед любым переходом (чтобы ввод не терялся) */
function syncWizardInputs() {
  var d = draftDefaults();
  var n = $('wizName'); if (n) d.name = n.value.trim();
  var p = $('wizPrize'); if (p) d.prizePool = p.value.trim();
  var th = $('wizThird'); if (th) d.thirdPlace = th.checked;
  var pb = $('wizPublic'); if (pb) d.isPublic = pb.checked;
  var of = $('wizOfficial'); if (of) d.official = of.checked;
}
document.addEventListener('change', function (ev) {
  if (ev.target.id === 'wizThird' || ev.target.id === 'wizPublic') { syncWizardInputs(); refreshPreview(); }
});
document.addEventListener('input', function (ev) {
  if (ev.target.id === 'wizName' || ev.target.id === 'wizPrize') syncWizardInputs();
});

window.addEventListener('resize', drawConnectors);

/* ══════════════════════════════════════════════════════════
   ДЕВ-ПОЛОСА + ПРИЁМКА СЧЁТЧИКОМ УЗЛОВ
══════════════════════════════════════════════════════════ */
var LAB = {
  br: { tree: 'Дерево+линии', cols: 'Колонки', compact: 'Компакт-плитки' },
  mcard: { full: 'Полная', compact: 'Компакт', bar: 'Полоса' },
  gtable: { table: 'Таблица', cards: 'Плитки', minimal: 'Минимал' },
  tcard: { rich: 'С составом', compact: 'Без состава', roster: 'Ростер-плитка' },
  icard: { card: 'Карточка', row: 'Строка', poster: 'Постер' },
  wiz: { steps: 'По шагам', onepage: 'Одна страница' },
  conn: { on: 'Линии вкл', off: 'Линии выкл' },
  hover: { lift: 'Подъём', glow: 'Свечение', none: 'Нет' },
  density: { air: 'Просторно', normal: 'Средне', dense: 'Плотно' },
  anim: { fade: 'Фейд', none: 'Нет' }
};
function choiceStr() {
  return 'Сетка: ' + LAB.br[V.br] + ' · Матч: ' + LAB.mcard[V.mcard] + ' · Группа: ' + LAB.gtable[V.gtable] +
    ' · Команда: ' + LAB.tcard[V.tcard] + ' · Инфлюенсер: ' + LAB.icard[V.icard] +
    ' · Мастер: ' + LAB.wiz[V.wiz] + ' · ' + LAB.conn[V.conn] + ' · Ховер: ' + LAB.hover[V.hover] +
    ' · Плотность: ' + LAB.density[V.density] + ' · Появление: ' + LAB.anim[V.anim];
}
function updateChoice() { var el = $('choiceText'); if (el) el.textContent = choiceStr(); }

Array.prototype.forEach.call(document.querySelectorAll('.strip-body .seg[data-k]'), function (seg) {
  Array.prototype.forEach.call(seg.querySelectorAll('button'), function (b) {
    b.onclick = function () {
      Array.prototype.forEach.call(seg.querySelectorAll('button'), function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      V[seg.dataset.k] = b.dataset.v;
      /* тумблеры = ТОЛЬКО data-атрибуты (CSS), DOM не пересобираем */
      applyVars(); drawConnectors(); updateChoice();
    };
  });
});
$('stripMin').onclick = function () {
  var s = $('labStrip'); s.classList.toggle('min');
  this.textContent = s.classList.contains('min') ? 'Развернуть' : 'Свернуть';
};
$('stripCopy').onclick = function () {
  var self = this;
  navigator.clipboard.writeText(choiceStr()).then(function () {
    self.textContent = '✓ Скопировано';
    setTimeout(function () { self.textContent = '📋 Скопировать мой выбор'; }, 1400);
  });
};

/* ─── СЧЁТЧИК ПЕРЕСОЗДАННЫХ УЗЛОВ (обязательная приёмка) ─── */
function markAll() {
  var nodes = $('app').querySelectorAll('*');
  Array.prototype.forEach.call(nodes, function (n) { n.__keep = true; });
  return nodes.length;
}
function countSurvivors() {
  var nodes = $('app').querySelectorAll('*');
  var alive = 0;
  Array.prototype.forEach.call(nodes, function (n) { if (n.__keep) alive++; });
  return alive;
}
$('stripCount').onclick = function () {
  var out = [];

  /* 0. если не в турнире — открываем демо-турнир (это смена вида, не мерим) */
  if (S.section !== 'tours' || S.view !== 'tournament') {
    S.section = 'tours'; S.view = 'tournament'; S.tid = 'demo1'; S.brTab = 'bracket'; render();
  }
  var t = curT();

  /* 1. тумблер вида сетки */
  var total = markAll();
  V.br = V.br === 'tree' ? 'cols' : 'tree'; applyVars(); drawConnectors();
  out.push('тумблер вида сетки: <b>' + countSurvivors() + '/' + total + '</b> узлов пережили');

  /* 2. клик по команде (оверлей) */
  total = markAll();
  openOv('team', teamsSorted(t)[0].id);
  out.push('клик по команде (оверлей): <b>' + countSurvivors() + '/' + total + '</b>');
  closeAllOv();

  /* 3. сохранение счёта матча (движок + проброс) */
  var playable = matchArr(t).filter(function (m) { return m.team1Id && m.team2Id && !m.winnerId; })[0];
  if (playable) {
    total = markAll();
    var bo = playable.bo || t.bo, max = Math.ceil(bo / 2);
    var r = saveResult(t, playable.id, max, 0);
    var changed = applyResultToDOM(t, playable.id, r.touched || []);
    out.push('ввод счёта матча (' + changed + ' карточек обновлено): <b>' + countSurvivors() + '/' + total + '</b>');
    /* откат, чтобы демо осталось прежним */
    var u = undoMatch(t, playable.id); applyResultToDOM(t, playable.id, u.touched);
  } else {
    out.push('ввод счёта: нет доступного матча');
  }

  $('stripRes').innerHTML = '🔢 ПРИЁМКА · ' + out.join(' · ');
  console.log('[lab-tournaments] приёмка счётчиком узлов:', out.join(' | ').replace(/<\/?b>/g, ''));
};

/* драг дев-полосы */
(function () {
  var strip = $('labStrip'), head = $('stripHead'), drag = false, dx = 0, dy = 0;
  head.addEventListener('pointerdown', function (ev) {
    if (ev.target.closest('button')) return;
    var r = strip.getBoundingClientRect();
    strip.style.transform = 'none'; strip.style.left = r.left + 'px'; strip.style.top = r.top + 'px';
    dx = ev.clientX - r.left; dy = ev.clientY - r.top; drag = true; head.setPointerCapture(ev.pointerId);
  });
  head.addEventListener('pointermove', function (ev) {
    if (!drag) return;
    strip.style.left = Math.max(0, ev.clientX - dx) + 'px';
    strip.style.top = Math.max(0, ev.clientY - dy) + 'px';
  });
  head.addEventListener('pointerup', function () { drag = false; });
})();

/* верхняя навигация раздела */
$('navTours').onclick = function () { S.section = 'tours'; S.view = 'list'; closeAllOv(); render(); };
$('navInf').onclick   = function () { S.section = 'inf'; closeAllOv(); render(); };

render();
})();
