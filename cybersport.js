/* ═══════════════════════════════════════════════════════════════
   CYBERSPORT — турнирная система
   Firestore:
     /tournaments/{id}                       — { name, format, teamCount, bo,
                                                 prizePool, isPublic, shareToken,
                                                 thirdPlace, status, createdBy,
                                                 createdAt, groupConfig?, playoffStarted? }
     /tournaments/{id}/teams/{teamId}        — { name, logoUrl, players[], seed }
     /tournaments/{id}/matches/{matchId}     — { phase, group?, round, matchNum, label,
                                                 team1Id, team2Id,
                                                 team1Source, team2Source,
                                                 score1, score2, winnerId,
                                                 status, bo }
   Модель связей:
     team1Source / team2Source = { matchId, takes: 'winner'|'loser' } | null
     Источник истины — receiver-side: каждый матч знает откуда приходят слоты.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     CONSTANTS
  ══════════════════════════════════════════════════════════ */
  var ROLES = {
    top:     '🗡️ Топ',
    jungle:  '🌿 Джангл',
    mid:     '⚡ Мид',
    adc:     '🏹 АДК',
    support: '🛡️ Сап'
  };
  var ROLE_KEYS = ['top', 'jungle', 'mid', 'adc', 'support'];

  var FORMAT_LABELS = {
    single_elim: 'Single Elimination',
    double_elim: 'Double Elimination',
    group_elim:  'Группы + Плей-офф'
  };

  /* ══════════════════════════════════════════════════════════
     STATE
  ══════════════════════════════════════════════════════════ */
  var S = {
    view: 'list',         // list | create | tournament
    tab: 'active',        // active | upcoming | completed
    bracketTab: 'bracket',
    step: 1,
    draftData: {},
    tournaments: [],
    currentTId: null,
    currentT: null,
    teams: {},
    matches: {},
    unsubT: null,
    unsubTeams: null,
    unsubMatches: null,
    editingTeamIdx: null,
    pendingDeepLinkId: null
  };

  /* ══════════════════════════════════════════════════════════
     LOW-LEVEL HELPERS
  ══════════════════════════════════════════════════════════ */
  function _e(s)  { if (s == null) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function _q(sel) { return document.querySelector(sel); }
  function _qa(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function _db()  { try { return firebase.firestore(); } catch (e) { return null; } }
  function _uid() { try { return firebase.auth().currentUser && firebase.auth().currentUser.uid; } catch (e) { return null; } }
  function _ts()  { return firebase.firestore.FieldValue.serverTimestamp(); }
  function _toast(msg) {
    if (window.toast) return window.toast(msg);
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);padding:10px 18px;background:rgba(0,0,0,0.85);color:#fff;border-radius:10px;z-index:99999;font-size:13px;';
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2200);
  }
  function _isCreator() { var u = _uid(); return !!(S.currentT && u && S.currentT.createdBy === u); }
  function _canEdit()   { return _isCreator(); }
  function _isPublicMode() {
    return document.documentElement.classList.contains('cs-public-mode');
  }
  function _randomToken() {
    return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
  }
  function _exitPublicMode() {
    document.documentElement.classList.remove('cs-public-mode');
    document.documentElement.classList.add('pre-guest');
    if (window.showSiteAuthGate) window.showSiteAuthGate();
  }
  /* Вход в Google — для CTA «Войти» в публичном режиме */
  window._csPublicSignIn = function () {
    // siteAuthSignIn() уже определён в index.html; пробуем его в первую очередь
    if (typeof window.siteAuthSignIn === 'function') {
      window.siteAuthSignIn();
    } else if (typeof window.signInWithGoogle === 'function') {
      window.signInWithGoogle();
    } else {
      // Fallback: открываем auth-gate, чтобы юзер нажал кнопку
      _exitPublicMode();
    }
  };

  /* ─── h(): мини template helper ────────────────────────────
     Использование:
       h('div', { class: 'foo', onclick: 'bar()' }, 'inner')
       h('div', { class: 'wrap' }, [ h('span', null, 'a'), h('span', null, 'b') ])
     children — строка ИЛИ массив строк; считается готовым HTML
     (использующий код сам экранирует пользовательские данные через _e()).
  ─────────────────────────────────────────────────────────── */
  function h(tag, attrs, children) {
    var out = '<' + tag;
    if (attrs) {
      for (var k in attrs) {
        var v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class' || k === 'className') {
          out += ' class="' + _e(v) + '"';
        } else if (k === 'style' && typeof v === 'object') {
          var s = '';
          for (var sk in v) { s += sk + ':' + v[sk] + ';'; }
          out += ' style="' + _e(s) + '"';
        } else if (v === true) {
          out += ' ' + k;
        } else {
          out += ' ' + k + '="' + _e(v) + '"';
        }
      }
    }
    out += '>';
    if (children == null) {
      // void
    } else if (Array.isArray(children)) {
      for (var i = 0; i < children.length; i++) {
        if (children[i] == null || children[i] === false) continue;
        out += children[i];
      }
    } else {
      out += children;
    }
    out += '</' + tag + '>';
    return out;
  }

  function _field(label, inputHtml) {
    return h('div', { class: 'cs-field' },
      h('label', { class: 'cs-label' }, _e(label)) + inputHtml);
  }

  function _logoEl(team, size) {
    if (team && team.logoUrl) {
      return h('img', { class: 'cs-logo-img', src: team.logoUrl, style: { width: size + 'px', height: size + 'px' } }, '');
    }
    var letter = (team && team.name) ? team.name[0].toUpperCase() : '?';
    return h('div', {
      class: 'cs-logo-ph',
      style: { width: size + 'px', height: size + 'px', 'font-size': Math.round(size * 0.45) + 'px' }
    }, _e(letter));
  }

  /* ══════════════════════════════════════════════════════════
     ENGINE — чистый генератор сетки
     Не знает про Firestore. На вход — teams[], opts.
     На выход — матчи с team{1,2}Source-связями.
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
        for (var i = 0; i < seeds.length; i++) {
          ns.push(seeds[i]); ns.push(n + 1 - seeds[i]);
        }
        seeds = ns;
      }
      var pairs = [];
      for (var j = 0; j < seeds.length; j += 2) pairs.push([seeds[j], seeds[j + 1]]);
      return pairs;
    }

    function _seRoundLabel(r, totalRnd, cnt) {
      if (r === totalRnd)         return 'Финал';
      if (r === totalRnd - 1)     return 'Полуфинал';
      if (r === totalRnd - 2)     return 'Четвертьфинал';
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
          var t1Id = null, t2Id = null;
          var t1Src = null, t2Src = null;

          if (r === 1) {
            var pair = pairs[mn - 1];
            t1Id = seedMap[pair[0]] || null;
            t2Id = seedMap[pair[1]] || null;
          } else {
            t1Src = { matchId: 'r' + (r - 1) + 'm' + (mn * 2 - 1), takes: 'winner' };
            t2Src = { matchId: 'r' + (r - 1) + 'm' + (mn * 2), takes: 'winner' };
          }

          // Bye в первом раунде
          var winnerId = null, status = 'upcoming', s1 = 0, s2 = 0;
          if (r === 1) {
            if (t1Id && !t2Id)  { winnerId = t1Id; status = 'completed'; s1 = Math.ceil(bo / 2); }
            else if (!t1Id && t2Id) { winnerId = t2Id; status = 'completed'; s2 = Math.ceil(bo / 2); }
          }

          matches.push({
            id: 'r' + r + 'm' + mn,
            phase: 'bracket',
            round: r, matchNum: mn,
            label: _seRoundLabel(r, totalRnd, cnt),
            team1Id: t1Id, team2Id: t2Id,
            team1Source: t1Src, team2Source: t2Src,
            score1: s1, score2: s2,
            winnerId: winnerId, status: status,
            bo: bo
          });
        }
      }

      // Матч за 3-е место
      if (opts.thirdPlace && totalRnd >= 2) {
        matches.push({
          id: 'third_place',
          phase: 'third_place',
          round: totalRnd, matchNum: 99,
          label: 'Матч за 3-е место',
          team1Id: null, team2Id: null,
          team1Source: { matchId: 'r' + (totalRnd - 1) + 'm1', takes: 'loser' },
          team2Source: { matchId: 'r' + (totalRnd - 1) + 'm2', takes: 'loser' },
          score1: 0, score2: 0, winnerId: null, status: 'upcoming',
          bo: bo
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
    function _lbLabel(r, total) {
      if (r === total) return 'LB Финал';
      return 'LB Раунд ' + r;
    }

    function genDE(teams, opts) {
      opts = opts || {};
      var bo = opts.bo || 3;
      var n = pow2(teams.length);
      var k = log2(n);
      var pairs = seedPairs(n);
      var seedMap = {};
      teams.forEach(function (t, i) { seedMap[i + 1] = t.id; });

      var matches = [];

      // ─── Upper Bracket ───
      for (var r = 1; r <= k; r++) {
        var cnt = n / Math.pow(2, r);
        for (var m = 1; m <= cnt; m++) {
          var id = 'ub_r' + r + '_m' + m;
          var t1Id = null, t2Id = null;
          var t1Src = null, t2Src = null;

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
            if (t1Id && !t2Id)  { winnerId = t1Id; status = 'completed'; s1 = Math.ceil(bo / 2); }
            else if (!t1Id && t2Id) { winnerId = t2Id; status = 'completed'; s2 = Math.ceil(bo / 2); }
          }

          matches.push({
            id: id,
            phase: 'upper',
            round: r, matchNum: m,
            label: _ubLabel(r, k),
            team1Id: t1Id, team2Id: t2Id,
            team1Source: t1Src, team2Source: t2Src,
            score1: s1, score2: s2,
            winnerId: winnerId, status: status,
            bo: bo
          });
        }
      }

      // ─── Lower Bracket ───
      var totalLBR = 2 * (k - 1);
      for (var lr = 1; lr <= totalLBR; lr++) {
        var jj = Math.ceil(lr / 2);
        var lCnt = Math.pow(2, k - 1 - jj);
        for (var lm = 1; lm <= lCnt; lm++) {
          var lid = 'lb_r' + lr + '_m' + lm;
          var lt1Src = null, lt2Src = null;

          if (lr === 1) {
            // UB R1 проигравшие: пары
            lt1Src = { matchId: 'ub_r1_m' + (lm * 2 - 1), takes: 'loser' };
            lt2Src = { matchId: 'ub_r1_m' + (lm * 2), takes: 'loser' };
          } else if (lr % 2 === 1) {
            // Pure: пары победителей предыдущего раунда LB
            lt1Src = { matchId: 'lb_r' + (lr - 1) + '_m' + (lm * 2 - 1), takes: 'winner' };
            lt2Src = { matchId: 'lb_r' + (lr - 1) + '_m' + (lm * 2), takes: 'winner' };
          } else {
            // Drop-in: победитель LB + проигравший UB того же номера
            lt1Src = { matchId: 'lb_r' + (lr - 1) + '_m' + lm, takes: 'winner' };
            lt2Src = { matchId: 'ub_r' + (lr / 2 + 1) + '_m' + lm, takes: 'loser' };
          }

          matches.push({
            id: lid,
            phase: 'lower',
            round: lr, matchNum: lm,
            label: _lbLabel(lr, totalLBR),
            team1Id: null, team2Id: null,
            team1Source: lt1Src, team2Source: lt2Src,
            score1: 0, score2: 0, winnerId: null, status: 'upcoming',
            bo: bo
          });
        }
      }

      // ─── Grand Final ───
      matches.push({
        id: 'grand_final',
        phase: 'final',
        round: 1, matchNum: 1,
        label: 'Гранд Финал',
        team1Id: null, team2Id: null,
        team1Source: { matchId: 'ub_r' + k + '_m1', takes: 'winner' },
        team2Source: { matchId: 'lb_r' + totalLBR + '_m1', takes: 'winner' },
        score1: 0, score2: 0, winnerId: null, status: 'upcoming',
        bo: bo
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
              id: 'g_' + g + '_m' + mNum,
              phase: 'group',
              group: g,
              round: 1, matchNum: mNum,
              label: 'Группа ' + g,
              team1Id: gt[a].id, team2Id: gt[b].id,
              team1Source: null, team2Source: null,
              score1: 0, score2: 0, winnerId: null, status: 'upcoming',
              bo: bo
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

    /* ─── Plаy-off из топ-2 групп (single-elim, кросс-пары) ─── */
    function genGroupPlayoff(groupConfig, currentMatches, opts) {
      opts = opts || {};
      var bo = opts.bo || 3;
      var groups = Object.keys(groupConfig).sort();

      // Считаем стандинги для каждой группы
      var standings = {};
      groups.forEach(function (g) {
        var gMatches = currentMatches.filter(function (m) { return m.group === g; });
        standings[g] = computeStandings(gMatches, groupConfig[g]);
      });

      // Топ-2 каждой группы → seed list: A1, B1, ..., A2, B2, ...
      // (cross-bracket гарантирует что 1-е места не встречаются раньше финала)
      var qualifiers = [];
      groups.forEach(function (g) {
        if (standings[g][0]) qualifiers.push({ id: standings[g][0].teamId });
      });
      groups.forEach(function (g) {
        if (standings[g][1]) qualifiers.push({ id: standings[g][1].teamId });
      });

      if (qualifiers.length < 2) return [];

      // Используем тот же SE-генератор, но переименовываем ID чтобы не пересеклись с групповыми
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

    /* ─── Автоматическое разрешение byes (рекурсивно тянет источники) ─── */
    function _autoResolveByes(matches) {
      var byId = {};
      matches.forEach(function (m) { byId[m.id] = m; });
      var changed = true;
      var safety = 0;
      while (changed && safety < 50) {
        changed = false; safety++;
        matches.forEach(function (m) {
          if (m.winnerId) return;
          if (!m.team1Id && m.team1Source) {
            var src = byId[m.team1Source.matchId];
            if (src && src.winnerId) {
              m.team1Id = m.team1Source.takes === 'winner'
                ? src.winnerId
                : (src.team1Id === src.winnerId ? src.team2Id : src.team1Id);
              changed = true;
            }
          }
          if (!m.team2Id && m.team2Source) {
            var src2 = byId[m.team2Source.matchId];
            if (src2 && src2.winnerId) {
              m.team2Id = m.team2Source.takes === 'winner'
                ? src2.winnerId
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

    /* ─── Обнуление вниз по сетке (для undo) ─── */
    function clearDownstream(allMatches, completedId) {
      var updates = {};
      allMatches.forEach(function (d) {
        if (d.team1Source && d.team1Source.matchId === completedId) {
          updates[d.id] = updates[d.id] || {};
          updates[d.id].team1Id = null;
        }
        if (d.team2Source && d.team2Source.matchId === completedId) {
          updates[d.id] = updates[d.id] || {};
          updates[d.id].team2Id = null;
        }
      });
      return updates;
    }

    return {
      pow2: pow2, log2: log2, seedPairs: seedPairs,
      genSE: genSE, genDE: genDE, genGroup: genGroup,
      genGroupPlayoff: genGroupPlayoff,
      computeStandings: computeStandings,
      propagateMatchResult: propagateMatchResult,
      clearDownstream: clearDownstream
    };
  })();

  /* ══════════════════════════════════════════════════════════
     OPEN / CLOSE
  ══════════════════════════════════════════════════════════ */
  window.openCybersport = function () {
    if (window.openModal) window.openModal('cybersportMask');
    S.view = 'list'; S.tab = 'active'; S.tournaments = [];
    _render();
    _loadList();
  };

  window.openCybersportTournament = function (id) {
    if (window.openModal) window.openModal('cybersportMask');
    S.view = 'tournament';
    S.currentTId = id; S.currentT = null; S.teams = {}; S.matches = {};
    S.bracketTab = 'bracket';
    _render();
    _loadTournament(id);
  };

  window.closeCybersport = function () {
    _unsubAll();
    if (window.closeModal) window.closeModal('cybersportMask');
    // В публичном режиме «закрытие» = «уйти из публичного просмотра» → показываем auth-gate
    if (_isPublicMode()) _exitPublicMode();
  };

  function _unsubAll() {
    if (S.unsubT)       { try { S.unsubT();       } catch (e) {} S.unsubT = null; }
    if (S.unsubTeams)   { try { S.unsubTeams();   } catch (e) {} S.unsubTeams = null; }
    if (S.unsubMatches) { try { S.unsubMatches(); } catch (e) {} S.unsubMatches = null; }
  }

  /* ══════════════════════════════════════════════════════════
     RENDER ROUTER
  ══════════════════════════════════════════════════════════ */
  function _render() {
    var root = document.getElementById('csRoot');
    if (!root) return;
    if      (S.view === 'list')       root.innerHTML = _htmlList();
    else if (S.view === 'create')     root.innerHTML = _htmlCreate();
    else if (S.view === 'tournament') root.innerHTML = _htmlTournament();

    // Постпроцесс: рисуем SVG-коннекторы для сеток
    if (S.view === 'tournament' && S.bracketTab === 'bracket') {
      _drawConnectors();
    }
  }
  window._csRender = _render;

  /* ══════════════════════════════════════════════════════════
     LIST VIEW
  ══════════════════════════════════════════════════════════ */
  function _loadList() {
    var db = _db(); if (!db) return;
    db.collection('tournaments').orderBy('createdAt', 'desc').limit(60).get()
      .then(function (snap) {
        S.tournaments = [];
        snap.forEach(function (doc) {
          S.tournaments.push(Object.assign({ id: doc.id }, doc.data()));
        });
        if (S.view === 'list') _render();
      }).catch(function (e) { console.warn('CS loadList:', e); });
  }

  function _htmlList() {
    var TAB_INFO = [
      { key: 'active',    label: 'Активные'    },
      { key: 'upcoming',  label: 'Предстоящие' },
      { key: 'completed', label: 'Завершённые' }
    ];
    var tabsHtml = TAB_INFO.map(function (ti) {
      var cnt = S.tournaments.filter(function (t) { return t.status === ti.key; }).length;
      return h('button', {
        class: 'cs-tab' + (S.tab === ti.key ? ' active' : ''),
        onclick: 'window._csSetTab(\'' + ti.key + '\')'
      }, _e(ti.label) + (cnt ? ' ' + h('span', { class: 'cs-tab-badge' }, String(cnt)) : ''));
    }).join('');

    var filtered = S.tournaments.filter(function (t) { return t.status === S.tab; });
    var listHtml;
    if (!S.tournaments.length) {
      listHtml = h('div', { class: 'cs-empty' },
        h('div', { class: 'cs-empty-icon' }, '🏆') + 'Нет турниров. Создайте первый!');
    } else if (!filtered.length) {
      listHtml = h('div', { class: 'cs-empty' },
        h('div', { class: 'cs-empty-icon' }, '📭') + 'Нет турниров в этой категории');
    } else {
      listHtml = filtered.map(_htmlTCard).join('');
    }

    var addBtn = _uid()
      ? h('button', { class: 'cs-btn-add', onclick: 'window._csShowCreate()' }, '＋')
      : '';

    return h('div', { class: 'cs-list-view' },
      h('div', { class: 'cs-list-top' },
        h('span', { class: 'cs-list-title' }, '🏆 Турниры') + addBtn) +
      h('div', { class: 'cs-tabs' }, tabsHtml) +
      h('div', { class: 'cs-list-body' }, listHtml));
  }

  function _htmlTCard(t) {
    var badge = ({
      active:    h('span', { class: 'cs-badge cs-badge-live' }, 'Идёт'),
      upcoming:  h('span', { class: 'cs-badge cs-badge-up' }, 'Скоро'),
      completed: h('span', { class: 'cs-badge cs-badge-done' }, 'Завершён')
    })[t.status] || '';
    var icoHtml = t.logoUrl
      ? h('img', { src: t.logoUrl }, '')
      : '🏆';
    return h('div', { class: 'cs-card', onclick: 'window._csOpenTournament(\'' + _e(t.id) + '\')' },
      h('div', { class: 'cs-card-ico' }, icoHtml) +
      h('div', { class: 'cs-card-body' },
        h('div', { class: 'cs-card-name' }, _e(t.name) + ' ' + badge) +
        h('div', { class: 'cs-card-meta' },
          (FORMAT_LABELS[t.format] || _e(t.format)) +
          ' · ' + (t.teamCount || '?') + ' команд' +
          (t.prizePool ? ' · 🏅 ' + _e(t.prizePool) : ''))) +
      h('div', { class: 'cs-card-arr' }, '›'));
  }

  window._csSetTab        = function (tab) { S.tab = tab; _render(); };
  window._csShowCreate    = function () { S.view = 'create'; S.step = 1; S.draftData = {}; _render(); };
  window._csOpenTournament = function (id) {
    _unsubAll();
    S.view = 'tournament'; S.currentTId = id;
    S.currentT = null; S.teams = {}; S.matches = {}; S.bracketTab = 'bracket';
    _render();
    _loadTournament(id);
  };
  window._csBackToList = function () {
    _unsubAll();
    S.view = 'list'; S.currentTId = null; S.currentT = null;
    S.teams = {}; S.matches = {};
    _render(); _loadList();
  };

  /* ══════════════════════════════════════════════════════════
     CREATE WIZARD
  ══════════════════════════════════════════════════════════ */
  function _htmlCreate() {
    var stepsHtml = ['Настройки', 'Команды', 'Запуск'].map(function (s, i) {
      var n = i + 1;
      var cls = 'cs-wiz-step' + (S.step === n ? ' active' : (S.step > n ? ' done' : ''));
      return h('div', { class: cls },
        h('div', { class: 'cs-wiz-num' }, String(n)) +
        h('div', { class: 'cs-wiz-lbl' }, _e(s))) +
        (i < 2 ? h('div', { class: 'cs-wiz-line' + (S.step > n ? ' done' : '') }, '') : '');
    }).join('');

    var body = S.step === 1 ? _htmlStep1() : S.step === 2 ? _htmlStep2() : _htmlStep3();
    return h('div', { class: 'cs-create-view' },
      h('div', { class: 'cs-wiz-steps' }, stepsHtml) +
      h('div', { class: 'cs-create-body' }, body));
  }

  function _htmlStep1() {
    var fmtHtml = Object.keys(FORMAT_LABELS).map(function (k) {
      var sel = S.draftData.format === k;
      return h('div', {
        class: 'cs-fmt-opt' + (sel ? ' sel' : ''),
        'data-fmt': k,
        onclick: 'window._csSelectFmt(\'' + k + '\')'
      }, h('span', { class: 'cs-fmt-name' }, _e(FORMAT_LABELS[k])));
    }).join('');

    var cntHtml = [4, 8, 12, 16, 24, 32].map(function (n) {
      return h('button', {
        class: 'cs-cnt-btn' + (S.draftData.teamCount === n ? ' sel' : ''),
        'data-n': String(n),
        onclick: 'window._csSetCount(' + n + ')'
      }, String(n));
    }).join('');

    var boHtml = [1, 3, 5].map(function (n) {
      return h('button', {
        class: 'cs-bo-btn' + ((S.draftData.bo || 3) === n ? ' sel' : ''),
        'data-bo': String(n),
        onclick: 'window._csSetBo(' + n + ')'
      }, 'BO' + n);
    }).join('');

    var thirdChecked = S.draftData.thirdPlace ? 'checked' : '';
    var publicChecked = S.draftData.isPublic !== false ? 'checked' : '';

    return h('div', { class: 'cs-step-body' },
      _field('Название турнира',
        h('input', { class: 'cs-input', id: 'csTName', placeholder: 'HFX Invitational 2026', value: S.draftData.name || '' }, '')) +
      _field('Формат',  h('div', { class: 'cs-fmts',  id: 'csFmts' }, fmtHtml)) +
      _field('Количество команд', h('div', { class: 'cs-cnt-row' }, cntHtml)) +
      _field('Плей-офф формат',   h('div', { class: 'cs-bo-row' }, boHtml)) +
      _field('Призовой фонд (опционально)',
        h('input', { class: 'cs-input', id: 'csPrize', placeholder: '10 000 руб', value: S.draftData.prizePool || '' }, '')) +
      h('label', { class: 'cs-checkrow' },
        '<input type="checkbox" id="csThirdPlace" ' + thirdChecked + '>' +
        '<span>Матч за 3-е место (только для Single Elimination)</span>') +
      h('label', { class: 'cs-checkrow' },
        '<input type="checkbox" id="csIsPublic" ' + publicChecked + '>' +
        '<span>Публичный — доступен по прямой ссылке без авторизации</span>') +
      h('div', { class: 'cs-step-actions' },
        h('button', { class: 'cs-btn cs-btn-sec', onclick: 'window._csBackToList()' }, 'Отмена') +
        h('button', { class: 'cs-btn cs-btn-pri', onclick: 'window._csStep1Next()' }, 'Далее →')));
  }

  function _htmlStep2() {
    var teams  = S.draftData.teams || [];
    var maxT   = S.draftData.teamCount || 8;
    var canAdd = teams.length < maxT;

    var listHtml = teams.length
      ? teams.map(function (t, i) {
          var logo = t.logoUrl
            ? h('img', { class: 'cs-wiz-logo', src: t.logoUrl }, '')
            : h('div', { class: 'cs-wiz-logo-ph' }, _e(t.name ? t.name[0].toUpperCase() : '?'));
          return h('div', { class: 'cs-wiz-team-row' },
            logo +
            h('span', { class: 'cs-wiz-tname' }, _e(t.name)) +
            h('span', { class: 'cs-seed-badge' }, '#' + (i + 1)) +
            h('button', { class: 'cs-btn-ico', onclick: 'window._csWizEditTeam(' + i + ')' }, '✏') +
            h('button', { class: 'cs-btn-ico cs-btn-del', onclick: 'window._csWizDelTeam(' + i + ')' }, '✕'));
        }).join('')
      : h('div', { class: 'cs-empty-sm' }, 'Добавьте команды');

    return h('div', { class: 'cs-step-body' },
      h('div', { class: 'cs-step2-hdr' },
        h('span', { class: 'cs-teams-cnt' }, teams.length + ' / ' + maxT + ' команд') +
        (canAdd ? h('button', { class: 'cs-btn cs-btn-sm cs-btn-pri', onclick: 'window._csWizAddTeam()' }, '+ Команда') : '')) +
      h('div', { class: 'cs-wiz-teams-list' }, listHtml) +
      h('div', { id: 'csWizTeamForm' }, '') +
      h('div', { class: 'cs-step-actions' },
        h('button', { class: 'cs-btn cs-btn-sec', onclick: 'window._csStep(1)' }, '← Назад') +
        h('button', { class: 'cs-btn cs-btn-pri', onclick: 'window._csStep2Next()' }, 'Далее →')));
  }

  function _htmlStep3() {
    var teams = S.draftData.teams || [];
    function _sumRow(label, val) {
      return h('div', { class: 'cs-sum-row' },
        h('span', null, _e(label)) + h('strong', null, val));
    }
    return h('div', { class: 'cs-step-body' },
      h('div', { class: 'cs-summary' },
        _sumRow('Название', _e(S.draftData.name)) +
        _sumRow('Формат',   _e(FORMAT_LABELS[S.draftData.format] || '—')) +
        _sumRow('Команд',   teams.length + ' / ' + S.draftData.teamCount) +
        _sumRow('Плей-офф', 'BO' + (S.draftData.bo || 3)) +
        (S.draftData.thirdPlace ? _sumRow('Матч за 3-е место', 'Да') : '') +
        _sumRow('Видимость', S.draftData.isPublic !== false ? '🌐 Публичный' : '🔒 Только по доступу') +
        (S.draftData.prizePool ? _sumRow('Призовой фонд', _e(S.draftData.prizePool)) : '')) +
      h('div', { class: 'cs-step3-note' }, 'После создания можно продолжать добавлять команды и редактировать их.') +
      h('div', { class: 'cs-step-actions' },
        h('button', { class: 'cs-btn cs-btn-sec', onclick: 'window._csStep(2)' }, '← Назад') +
        h('button', { class: 'cs-btn cs-btn-pri', id: 'csCreateBtn', onclick: 'window._csCreate()' }, 'Создать турнир 🚀')));
  }

  window._csStep = function (n) { S.step = n; _render(); };

  window._csSelectFmt = function (k) {
    S.draftData.format = k;
    _qa('.cs-fmt-opt').forEach(function (el) {
      el.classList.toggle('sel', el.dataset.fmt === k);
    });
  };
  window._csSetCount = function (n) {
    S.draftData.teamCount = n;
    _qa('.cs-cnt-btn').forEach(function (btn) {
      btn.classList.toggle('sel', parseInt(btn.dataset.n, 10) === n);
    });
  };
  window._csSetBo = function (n) {
    S.draftData.bo = n;
    _qa('.cs-bo-btn').forEach(function (btn) {
      btn.classList.toggle('sel', parseInt(btn.dataset.bo, 10) === n);
    });
  };

  window._csStep1Next = function () {
    var name = (_q('#csTName') || {}).value || '';
    S.draftData.name      = name.trim();
    S.draftData.prizePool = ((_q('#csPrize') || {}).value || '').trim();
    S.draftData.thirdPlace = !!(_q('#csThirdPlace') && _q('#csThirdPlace').checked);
    S.draftData.isPublic   = !!(_q('#csIsPublic') && _q('#csIsPublic').checked);

    if (!S.draftData.name)      { alert('Введите название турнира'); return; }
    if (!S.draftData.format)    { alert('Выберите формат'); return; }
    if (!S.draftData.teamCount) { alert('Выберите количество команд'); return; }
    S.step = 2; _render();
  };

  window._csStep2Next = function () {
    if (!(S.draftData.teams || []).length || S.draftData.teams.length < 2) {
      alert('Добавьте хотя бы 2 команды'); return;
    }
    S.step = 3; _render();
  };

  /* ─── Wizard team form ─── */
  function _renderWizTeamForm(team) {
    var wrap = _q('#csWizTeamForm'); if (!wrap) return;
    var t = team || { name: '', logoUrl: '' };
    var players = t.players && t.players.length ? t.players
      : ROLE_KEYS.map(function (r) { return { nick: '', role: r }; });

    var playersHtml = players.map(function (p, i) {
      var lbl = ROLES[p.role] || p.role;
      return h('div', { class: 'cs-pl-row' },
        h('span', { class: 'cs-rl-ico' }, lbl.split(' ')[0]) +
        h('span', { class: 'cs-rl-lbl' }, lbl.split(' ').slice(1).join(' ')) +
        h('input', {
          class: 'cs-input cs-pl-inp',
          'data-pi': String(i),
          placeholder: 'Ник',
          value: p.nick || ''
        }, ''));
    }).join('');

    wrap.innerHTML = h('div', { class: 'cs-team-form' },
      h('div', { class: 'cs-tf-hdr' },
        h('strong', null, S.editingTeamIdx !== null ? 'Редактировать команду' : 'Новая команда') +
        h('button', { class: 'cs-btn-ico', onclick: 'window._csCancelWizForm()' }, '✕')) +
      _field('Название',
        h('input', { class: 'cs-input', id: 'csTfName', value: t.name || '', placeholder: 'Team Name' }, '')) +
      _field('Лого (URL)',
        h('input', { class: 'cs-input', id: 'csTfLogo', value: t.logoUrl || '', placeholder: 'https://...' }, '')) +
      _field('Состав', h('div', { class: 'cs-players-wrap' }, playersHtml)) +
      h('button', { class: 'cs-btn cs-btn-pri', style: { width: '100%', 'margin-top': '8px' }, onclick: 'window._csSaveWizTeam()' }, 'Сохранить'));
  }

  window._csWizAddTeam   = function () { S.editingTeamIdx = null; _renderWizTeamForm(null); };
  window._csWizEditTeam  = function (i) { S.editingTeamIdx = i; _renderWizTeamForm((S.draftData.teams || [])[i]); };
  window._csWizDelTeam   = function (i) { if (S.draftData.teams) S.draftData.teams.splice(i, 1); _render(); };
  window._csCancelWizForm = function () { var w = _q('#csWizTeamForm'); if (w) w.innerHTML = ''; };

  window._csSaveWizTeam = function () {
    var name = (_q('#csTfName') || {}).value || '';
    if (!name.trim()) { alert('Введите название команды'); return; }
    var logo = (_q('#csTfLogo') || {}).value || '';
    var players = _collectPlayers();
    var team = { name: name.trim(), logoUrl: logo.trim(), players: players };
    if (!S.draftData.teams) S.draftData.teams = [];
    if (S.editingTeamIdx !== null) S.draftData.teams[S.editingTeamIdx] = team;
    else S.draftData.teams.push(team);
    _render();
  };

  function _collectPlayers() {
    var players = [];
    _qa('[data-pi]').forEach(function (inp, i) {
      players.push({ nick: inp.value.trim(), role: ROLE_KEYS[i] || 'top' });
    });
    return players;
  }

  /* ─── Создание в Firestore ─── */
  window._csCreate = function () {
    var db  = _db(); if (!db) return;
    var uid = _uid(); if (!uid) { alert('Войдите для создания турнира'); return; }
    var btn = _q('#csCreateBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Создание...'; }

    var data = {
      name:        S.draftData.name,
      format:      S.draftData.format,
      teamCount:   S.draftData.teamCount,
      bo:          S.draftData.bo || 3,
      prizePool:   S.draftData.prizePool || '',
      thirdPlace:  !!S.draftData.thirdPlace,
      isPublic:    S.draftData.isPublic !== false,
      shareToken:  _randomToken(),
      createdBy:   uid,
      createdAt:   _ts(),
      status:      'upcoming'
    };

    db.collection('tournaments').add(data).then(function (ref) {
      var id = ref.id;
      var batch = db.batch();
      (S.draftData.teams || []).forEach(function (t, i) {
        var tRef = db.collection('tournaments').doc(id).collection('teams').doc();
        batch.set(tRef, Object.assign({}, t, { seed: i + 1, createdAt: _ts() }));
      });
      return batch.commit().then(function () { return id; });
    }).then(function (id) {
      S.view = 'tournament'; S.currentTId = id; S.currentT = null;
      S.teams = {}; S.matches = {}; S.bracketTab = 'teams';
      _render(); _loadTournament(id);
    }).catch(function (e) {
      console.error('CS create:', e);
      alert('Ошибка создания: ' + e.message);
      if (btn) { btn.disabled = false; btn.textContent = 'Создать турнир 🚀'; }
    });
  };

  /* ══════════════════════════════════════════════════════════
     TOURNAMENT VIEW
  ══════════════════════════════════════════════════════════ */
  function _loadTournament(id) {
    var db = _db(); if (!db) return;
    _unsubAll();

    S.unsubT = db.collection('tournaments').doc(id).onSnapshot(function (doc) {
      if (!doc.exists) {
        alert('Турнир не найден или удалён');
        window._csBackToList();
        return;
      }
      S.currentT = Object.assign({ id: doc.id }, doc.data());
      _render();
    }, function (e) {
      console.warn('CS tourn:', e);
      var root = document.getElementById('csRoot');
      if (root) root.innerHTML = h('div', { class: 'cs-empty' },
        h('div', { class: 'cs-empty-icon' }, '🔒') +
        'Нет доступа к этому турниру или его не существует.');
    });

    S.unsubTeams = db.collection('tournaments').doc(id).collection('teams')
      .orderBy('seed').onSnapshot(function (snap) {
        S.teams = {};
        snap.forEach(function (d) { S.teams[d.id] = Object.assign({ id: d.id }, d.data()); });
        _render();
      }, function (e) { console.warn('CS teams:', e); });

    S.unsubMatches = db.collection('tournaments').doc(id).collection('matches')
      .onSnapshot(function (snap) {
        S.matches = {};
        snap.forEach(function (d) { S.matches[d.id] = Object.assign({ id: d.id }, d.data()); });
        _render();
      }, function (e) { console.warn('CS matches:', e); });
  }

  function _htmlTournament() {
    var t = S.currentT;
    var loading = !t;
    var name = loading ? 'Загрузка...' : t.name;

    var tabsHtml = [['bracket','🏆 Сетка'],['teams','👥 Команды'],['schedule','📅 Расписание']].map(function (tb) {
      return h('button', {
        class: 'cs-tab' + (S.bracketTab === tb[0] ? ' active' : ''),
        onclick: 'window._csBrTab(\'' + tb[0] + '\')'
      }, tb[1]);
    }).join('');

    var canEdit = _canEdit();
    var hasMatches = Object.keys(S.matches).length > 0;
    var startBtn = (canEdit && t && t.status === 'upcoming' && !hasMatches)
      ? h('button', { class: 'cs-btn cs-btn-sm cs-btn-pri', onclick: 'window._csStart()' }, '▶ Старт')
      : '';
    var shareBtn = t
      ? h('button', { class: 'cs-btn cs-btn-sm cs-btn-sec', onclick: 'window._csShare()' }, '🔗')
      : '';
    var editBtn = canEdit
      ? h('button', { class: 'cs-btn cs-btn-sm cs-btn-sec', onclick: 'window._csTEditSettings()' }, '✏')
      : '';

    var statusLabel = t ? ({active:'Идёт',upcoming:'Скоро',completed:'Завершён'}[t.status] || '') : '';
    var statusBadge = t ? ' ' + h('span', { class: 'cs-badge cs-badge-' + t.status }, _e(statusLabel)) : '';

    var publicBadge = (t && t.isPublic) ? ' ' + h('span', { class: 'cs-badge cs-badge-public', title: 'Открыт по ссылке' }, '🌐') : '';

    var body = '';
    if (!loading) {
      if (S.bracketTab === 'bracket')  body = _htmlBracket();
      if (S.bracketTab === 'teams')    body = _htmlTeamsTab();
      if (S.bracketTab === 'schedule') body = _htmlSchedule();
    } else {
      body = h('div', { class: 'cs-loading' }, 'Загрузка...');
    }

    return h('div', { class: 'cs-tourn-view' },
      h('div', { class: 'cs-tourn-hdr' },
        h('button', { class: 'cs-btn-ico cs-back', onclick: 'window._csBackToList()' }, '←') +
        h('span', { class: 'cs-tourn-name' }, _e(name) + statusBadge + publicBadge) +
        h('div', { class: 'cs-tourn-acts' }, startBtn + shareBtn + editBtn)) +
      (t ? h('div', { class: 'cs-tourn-meta' },
        _e(FORMAT_LABELS[t.format] || t.format) +
        ' · ' + (t.teamCount || '?') + ' команд · BO' + (t.bo || 3) +
        (t.prizePool ? ' · 🏅 ' + _e(t.prizePool) : '')) : '') +
      h('div', { class: 'cs-tabs' }, tabsHtml) +
      h('div', { class: 'cs-tourn-body' }, body));
  }

  window._csBrTab = function (tab) { S.bracketTab = tab; _render(); };

  /* ══════════════════════════════════════════════════════════
     TEAMS TAB
  ══════════════════════════════════════════════════════════ */
  function _htmlTeamsTab() {
    var t       = S.currentT;
    var canEdit = _canEdit();
    var teamArr = _teamsSorted();
    var maxT    = t ? (t.teamCount || 32) : 32;

    var addBtn = (canEdit && teamArr.length < maxT)
      ? h('button', {
          class: 'cs-btn cs-btn-pri',
          style: { margin: '12px 16px 4px' },
          onclick: 'window._csShowAddTeam()'
        }, '+ Добавить команду')
      : '';

    var html = teamArr.length
      ? teamArr.map(function (team) { return _htmlTeamCardFull(team, canEdit); }).join('')
      : h('div', { class: 'cs-empty' }, 'Нет команд');

    return h('div', { class: 'cs-teams-view' },
      addBtn + h('div', { id: 'csAddTeamWrap' }, '') + html);
  }

  function _htmlTeamCardFull(team, canEdit) {
    var players = (team.players || []).filter(function (p) { return p.nick; }).map(function (p) {
      var lbl = ROLES[p.role] || p.role;
      return h('div', { class: 'cs-pl-card-row' },
        h('span', { class: 'cs-rl-ico' }, lbl.split(' ')[0]) +
        h('span', { class: 'cs-pl-nick' }, _e(p.nick)) +
        h('span', { class: 'cs-pl-role' }, lbl.split(' ').slice(1).join(' ')));
    }).join('');

    var editBtns = canEdit
      ? h('button', { class: 'cs-btn-ico', onclick: 'window._csEditTeamFs(\'' + _e(team.id) + '\')' }, '✏') +
        h('button', { class: 'cs-btn-ico cs-btn-del', onclick: 'window._csDeleteTeam(\'' + _e(team.id) + '\')' }, '✕')
      : '';

    return h('div', { class: 'cs-team-card-full' },
      h('div', { class: 'cs-tc-hdr' },
        _logoEl(team, 40) +
        h('div', { class: 'cs-tc-info' },
          h('div', { class: 'cs-tc-name' }, _e(team.name)) +
          h('div', { class: 'cs-tc-seed' }, 'Посев #' + (team.seed || '?'))) +
        editBtns) +
      (players ? h('div', { class: 'cs-tc-players' }, players) : ''));
  }

  window._csShowAddTeam = function () {
    var wrap = _q('#csAddTeamWrap'); if (!wrap) return;
    var nextSeed = _teamsSorted().reduce(function (m, t) { return Math.max(m, t.seed || 0); }, 0) + 1;
    wrap.innerHTML = _teamFormHtml(null, nextSeed, '_csSaveAddTeam');
  };

  window._csEditTeamFs = function (teamId) {
    var team = S.teams[teamId]; if (!team) return;
    var wrap = _q('#csAddTeamWrap'); if (!wrap) return;
    wrap.innerHTML = _teamFormHtml(team, team.seed, "_csSaveEditTeam('" + teamId + "')");
  };

  function _teamFormHtml(team, seed, saveCmd) {
    var t = team || { name: '', logoUrl: '' };
    var players = t.players && t.players.length ? t.players
      : ROLE_KEYS.map(function (r) { return { nick: '', role: r }; });

    var plHtml = players.map(function (p, i) {
      var lbl = ROLES[p.role] || p.role;
      return h('div', { class: 'cs-pl-row' },
        h('span', { class: 'cs-rl-ico' }, lbl.split(' ')[0]) +
        h('span', { class: 'cs-rl-lbl' }, lbl.split(' ').slice(1).join(' ')) +
        h('input', {
          class: 'cs-input cs-pl-inp',
          'data-pi': String(i),
          placeholder: 'Ник',
          value: p.nick || ''
        }, ''));
    }).join('');

    return h('div', { class: 'cs-team-form' },
      h('div', { class: 'cs-tf-hdr' },
        h('strong', null, team ? 'Редактировать команду' : 'Новая команда') +
        h('button', { class: 'cs-btn-ico', onclick: 'window._csCancelAddTeam()' }, '✕')) +
      _field('Название',
        h('input', { class: 'cs-input', id: 'csFsName', value: t.name || '', placeholder: 'Team Name' }, '')) +
      _field('Лого (URL)',
        h('input', { class: 'cs-input', id: 'csFsLogo', value: t.logoUrl || '', placeholder: 'https://...' }, '')) +
      _field('Состав', h('div', { class: 'cs-players-wrap' }, plHtml)) +
      h('button', {
        class: 'cs-btn cs-btn-pri',
        style: { width: '100%', 'margin-top': '8px' },
        onclick: 'window.' + saveCmd
      }, 'Сохранить'));
  }

  window._csCancelAddTeam = function () { var w = _q('#csAddTeamWrap'); if (w) w.innerHTML = ''; };

  window._csSaveAddTeam = function () {
    var db = _db(); if (!db) return;
    var name = (_q('#csFsName') || {}).value || '';
    if (!name.trim()) { alert('Введите название'); return; }
    var logo = (_q('#csFsLogo') || {}).value || '';
    var players = _collectPlayers();
    var nextSeed = _teamsSorted().reduce(function (m, t) { return Math.max(m, t.seed || 0); }, 0) + 1;
    db.collection('tournaments').doc(S.currentTId).collection('teams')
      .add({ name: name.trim(), logoUrl: logo.trim(), players: players, seed: nextSeed, createdAt: _ts() })
      .then(function () { window._csCancelAddTeam(); })
      .catch(function (e) { alert('Ошибка: ' + e.message); });
  };

  window._csSaveEditTeam = function (teamId) {
    var db = _db(); if (!db) return;
    var name = (_q('#csFsName') || {}).value || '';
    if (!name.trim()) { alert('Введите название'); return; }
    var logo = (_q('#csFsLogo') || {}).value || '';
    var players = _collectPlayers();
    db.collection('tournaments').doc(S.currentTId).collection('teams').doc(teamId)
      .update({ name: name.trim(), logoUrl: logo.trim(), players: players })
      .then(function () { window._csCancelAddTeam(); })
      .catch(function (e) { alert('Ошибка: ' + e.message); });
  };

  window._csDeleteTeam = function (teamId) {
    if (!confirm('Удалить команду из турнира?')) return;
    var db = _db(); if (!db) return;
    db.collection('tournaments').doc(S.currentTId).collection('teams').doc(teamId)
      .delete().catch(function (e) { alert('Ошибка: ' + e.message); });
  };

  /* ══════════════════════════════════════════════════════════
     BRACKET TAB
  ══════════════════════════════════════════════════════════ */
  function _htmlBracket() {
    var t = S.currentT;
    var matchArr = Object.values(S.matches);

    if (!matchArr.length) {
      if (t && t.status === 'upcoming') {
        var startBtn = _canEdit()
          ? h('button', { class: 'cs-btn cs-btn-pri', style: { 'margin-top': '12px' }, onclick: 'window._csStart()' }, '▶ Запустить турнир')
          : '';
        return h('div', { class: 'cs-empty' },
          h('div', { class: 'cs-empty-icon' }, '📋') +
          'Турнир ещё не запущен.<br>Добавьте команды и нажмите «Старт».' + startBtn);
      }
      return h('div', { class: 'cs-empty' }, 'Нет матчей');
    }

    if (t && t.format === 'double_elim') return _renderDEBracket(matchArr);
    if (t && t.format === 'group_elim')  return _renderGroupView(matchArr);
    return _renderSEBracket(matchArr);
  }

  /* ─── SE рендер ─── */
  function _renderSEBracket(matchArr) {
    var canEdit = _canEdit();

    // Делим на основную сетку и матч за 3-е место
    var bracketM = matchArr.filter(function (m) { return m.phase !== 'third_place'; });
    var thirdM   = matchArr.filter(function (m) { return m.phase === 'third_place'; })[0];

    var rounds = {};
    var maxRound = 0;
    bracketM.forEach(function (m) {
      var r = m.round || 1;
      if (!rounds[r]) rounds[r] = [];
      rounds[r].push(m);
      if (r > maxRound) maxRound = r;
    });
    Object.keys(rounds).forEach(function (r) {
      rounds[r].sort(function (a, b) { return (a.matchNum || 0) - (b.matchNum || 0); });
    });

    var r1cnt = (rounds[1] || []).length;
    var SLOT_H = 96;
    var totalH = r1cnt * SLOT_H;

    var cols = '';
    for (var round = 1; round <= maxRound; round++) {
      var rm = rounds[round] || [];
      var slotH = totalH / rm.length;
      var matchesHtml = rm.map(function (m) {
        return h('div', { class: 'cs-br-slot-wrap', style: { height: slotH + 'px' } },
          _htmlMatchCard(m, canEdit));
      }).join('');
      cols += h('div', { class: 'cs-br-col' },
        h('div', { class: 'cs-br-rlabel' }, _e((rm[0] && rm[0].label) || ('Раунд ' + round))) +
        h('div', { class: 'cs-br-matches', style: { height: totalH + 'px' } }, matchesHtml));
    }

    // Победитель
    var finalMatch = maxRound && rounds[maxRound] && rounds[maxRound][0];
    var winTeam = finalMatch && finalMatch.winnerId ? (S.teams[finalMatch.winnerId] || null) : null;
    if (winTeam) {
      cols += h('div', { class: 'cs-br-col cs-br-winner-col' },
        h('div', { class: 'cs-br-rlabel' }, 'Победитель') +
        h('div', { class: 'cs-br-matches', style: { height: totalH + 'px' } },
          h('div', { class: 'cs-br-slot-wrap', style: { height: totalH + 'px' } },
            h('div', { class: 'cs-br-winner-card' },
              _logoEl(winTeam, 54) +
              h('div', { class: 'cs-bw-name' }, _e(winTeam.name)) +
              h('div', { class: 'cs-bw-crown' }, '🏆')))));
    }

    // SVG-слой будет дорисован в _drawConnectors
    var bracketHtml = h('div', { class: 'cs-bracket-wrap' },
      h('div', { class: 'cs-bracket', 'data-bracket': 'se' },
        cols + '<svg class="cs-bracket-svg" data-svg="se"></svg>'));

    // Матч за 3-е место (если есть)
    var thirdHtml = '';
    if (thirdM) {
      thirdHtml = h('div', { class: 'cs-third-place' },
        h('div', { class: 'cs-de-section-hdr' }, 'Матч за 3-е место') +
        h('div', { class: 'cs-third-place-match' }, _htmlMatchCard(thirdM, canEdit)));
    }

    return bracketHtml + thirdHtml;
  }

  /* ─── DE рендер ─── */
  function _renderDEBracket(matchArr) {
    var canEdit = _canEdit();
    var ubM = {}, lbM = {}, gfMatch = null;
    matchArr.forEach(function (m) {
      if (m.phase === 'upper') {
        if (!ubM[m.round]) ubM[m.round] = [];
        ubM[m.round].push(m);
      } else if (m.phase === 'lower') {
        if (!lbM[m.round]) lbM[m.round] = [];
        lbM[m.round].push(m);
      } else if (m.phase === 'final' || m.id === 'grand_final') {
        gfMatch = m;
      }
    });
    [ubM, lbM].forEach(function (obj) {
      Object.keys(obj).forEach(function (r) {
        obj[r].sort(function (a, b) { return (a.matchNum || 0) - (b.matchNum || 0); });
      });
    });

    function _buildCols(roundObj, slotH, svgKey) {
      var rounds = Object.keys(roundObj).map(Number).sort(function (a, b) { return a - b; });
      var r1cnt  = (roundObj[rounds[0]] || []).length;
      var totalH = r1cnt * slotH;
      var cols   = '';
      rounds.forEach(function (round) {
        var rm = roundObj[round] || [];
        var s  = totalH / rm.length;
        var matchesHtml = rm.map(function (m) {
          return h('div', { class: 'cs-br-slot-wrap', style: { height: s + 'px' } },
            _htmlMatchCard(m, canEdit));
        }).join('');
        cols += h('div', { class: 'cs-br-col' },
          h('div', { class: 'cs-br-rlabel' }, _e((rm[0] && rm[0].label) || '')) +
          h('div', { class: 'cs-br-matches', style: { height: totalH + 'px' } }, matchesHtml));
      });
      return h('div', { class: 'cs-bracket-wrap' },
        h('div', { class: 'cs-bracket', 'data-bracket': svgKey },
          cols + '<svg class="cs-bracket-svg" data-svg="' + svgKey + '"></svg>'));
    }

    var ubHtml = _buildCols(ubM, 96, 'ub');
    var lbHtml = _buildCols(lbM, 84, 'lb');

    var gfHtml = '';
    if (gfMatch) {
      gfHtml = h('div', { class: 'cs-de-gf' },
        h('div', { class: 'cs-de-gf-label' }, 'Гранд Финал') +
        _htmlMatchCard(gfMatch, canEdit) +
        (gfMatch.winnerId && S.teams[gfMatch.winnerId]
          ? h('div', { class: 'cs-br-winner-card', style: { margin: '12px auto 0', width: '140px' } },
              _logoEl(S.teams[gfMatch.winnerId], 50) +
              h('div', { class: 'cs-bw-name' }, _e(S.teams[gfMatch.winnerId].name)) +
              h('div', { class: 'cs-bw-crown' }, '🏆'))
          : ''));
    }

    return h('div', { class: 'cs-de-wrap' },
      h('div', { class: 'cs-de-section-hdr' }, 'Upper Bracket') + ubHtml +
      h('div', { class: 'cs-de-section-hdr' }, 'Lower Bracket') + lbHtml +
      gfHtml);
  }

  /* ─── Group + Playoff рендер ─── */
  function _renderGroupView(matchArr) {
    var canEdit = _canEdit();
    var groupM = matchArr.filter(function (m) { return m.phase === 'group'; });
    var poM    = matchArr.filter(function (m) { return m.phase === 'playoff'; });

    // Группы
    var groups = {};
    groupM.forEach(function (m) {
      var g = m.group || 'A';
      if (!groups[g]) groups[g] = [];
      groups[g].push(m);
    });
    var groupConfig = {};
    try { groupConfig = JSON.parse(S.currentT.groupConfig || '{}'); } catch (e) { groupConfig = {}; }

    var html = '';
    Object.keys(groups).sort().forEach(function (g) {
      var gm = groups[g];
      var standings = Engine.computeStandings(gm, groupConfig[g] || []);

      var standHtml = '<table class="cs-grp-table"><thead><tr>' +
        '<th>#</th><th>Команда</th><th>В</th><th>П</th></tr></thead><tbody>' +
        standings.map(function (row, i) {
          var team = S.teams[row.teamId];
          var qualified = i < 2;
          return '<tr class="' + (qualified ? 'cs-qualified' : '') + '">' +
            '<td>' + (i + 1) + '</td>' +
            '<td>' + (team ? _e(team.name) : '—') + '</td>' +
            '<td>' + row.wins + '</td>' +
            '<td>' + row.losses + '</td></tr>';
        }).join('') + '</tbody></table>';

      var mHtml = gm.map(function (m) { return _htmlMatchCard(m, canEdit); }).join('');

      html += h('div', { class: 'cs-grp-block' },
        h('div', { class: 'cs-grp-hdr' }, 'Группа ' + _e(g)) +
        h('div', { class: 'cs-grp-content' },
          h('div', { class: 'cs-grp-stand' }, standHtml) +
          h('div', { class: 'cs-grp-matches' }, mHtml)));
    });

    // Кнопка запуска плей-офф
    var allGroupsDone = groupM.length > 0 && groupM.every(function (m) { return !!m.winnerId; });
    var poBtnHtml = '';
    if (allGroupsDone && !poM.length && canEdit) {
      poBtnHtml = h('div', { style: { padding: '12px 16px', 'text-align': 'center' } },
        h('button', { class: 'cs-btn cs-btn-pri', onclick: 'window._csStartPlayoff()' }, '▶ Запустить плей-офф'));
    }

    // Plаy-off сетка (если уже создана)
    var poHtml = '';
    if (poM.length) {
      poHtml = h('div', { class: 'cs-de-section-hdr' }, 'Плей-офф') +
        _renderSEBracket(poM);
    }

    return h('div', { class: 'cs-groups-wrap' }, html + poBtnHtml) + poHtml;
  }

  /* ─── Карточка матча ─── */
  function _htmlMatchCard(m, canEdit) {
    var t1 = m.team1Id ? (S.teams[m.team1Id] || null) : null;
    var t2 = m.team2Id ? (S.teams[m.team2Id] || null) : null;
    var done = !!m.winnerId;
    var t1Win = done && m.winnerId === m.team1Id;
    var t2Win = done && m.winnerId === m.team2Id;

    var liveBadge = m.status === 'live' ? h('div', { class: 'cs-br-live' }, 'LIVE') : '';
    var editBtn = '';
    if (canEdit && t1 && t2 && !done) {
      editBtn = h('button', { class: 'cs-br-edit', onclick: 'window._csMatchEdit(\'' + _e(m.id) + '\')' }, 'Ввести счёт');
    } else if (canEdit && done) {
      editBtn = h('button', { class: 'cs-br-edit cs-br-undo', onclick: 'window._csUndoMatch(\'' + _e(m.id) + '\')' }, '↩ Отменить');
    }

    return h('div', { class: 'cs-br-match', 'data-mid': m.id },
      liveBadge +
      _slotHtml(t1, m.team1Source, m.score1, t1Win, done, 1, m.id) +
      h('div', { class: 'cs-br-vs' }, 'vs') +
      _slotHtml(t2, m.team2Source, m.score2, t2Win, done, 2, m.id) +
      editBtn);
  }

  function _slotHtml(team, source, score, isWin, showScore, slotNum, matchId) {
    var cls = 'cs-br-team' + (isWin ? ' win' : '') + (!team ? ' tbd' : '');
    var logoHtml, nameHtml;
    if (team) {
      logoHtml = h('div', { class: 'cs-br-logo-wrap', onclick: 'window._csTeamPopup(\'' + _e(team.id) + '\')' },
        _logoEl(team, 26));
      nameHtml = h('span', {
        class: 'cs-br-tname',
        onclick: 'window._csTeamPopup(\'' + _e(team.id) + '\')'
      }, _e(team.name));
    } else {
      var hint = source ? _sourceHint(source) : '';
      logoHtml = h('div', { class: 'cs-br-logo-wrap' },
        h('div', { class: 'cs-logo-ph', style: { width: '26px', height: '26px', 'font-size': '11px' } }, '?'));
      nameHtml = h('span', { class: 'cs-br-tname tbd' }, hint || 'TBD');
    }
    var scoreHtml = showScore
      ? h('span', { class: 'cs-br-score' + (isWin ? ' win' : '') }, String(score || 0))
      : '';
    return h('div', { class: cls, 'data-slot': slotNum, 'data-mid': matchId }, logoHtml + nameHtml + scoreHtml);
  }

  function _sourceHint(src) {
    var role = src.takes === 'winner' ? 'Победитель' : 'Проигравший';
    var label = (S.matches[src.matchId] && S.matches[src.matchId].label) || src.matchId;
    return role + ' · ' + _e(label);
  }

  /* ══════════════════════════════════════════════════════════
     SVG CONNECTORS — рисуем линии после рендера
  ══════════════════════════════════════════════════════════ */
  function _drawConnectors() {
    setTimeout(function () {
      _qa('.cs-bracket-wrap').forEach(function (wrap) {
        var bracket = wrap.querySelector('.cs-bracket');
        var svg = wrap.querySelector('.cs-bracket-svg');
        if (!bracket || !svg) return;

        var cards = bracket.querySelectorAll('.cs-br-match');
        var byMid = {};
        cards.forEach(function (c) { byMid[c.dataset.mid] = c; });

        var bRect = bracket.getBoundingClientRect();
        svg.setAttribute('width', bracket.scrollWidth);
        svg.setAttribute('height', bracket.scrollHeight);
        svg.style.width  = bracket.scrollWidth + 'px';
        svg.style.height = bracket.scrollHeight + 'px';
        svg.innerHTML = '';

        cards.forEach(function (card) {
          var mid = card.dataset.mid;
          var m = S.matches[mid];
          if (!m) return;
          var dRect = card.getBoundingClientRect();
          var dx = dRect.left - bRect.left;
          var dy = dRect.top  - bRect.top;
          var dHeight = dRect.height;

          [
            { src: m.team1Source, slot: 1 },
            { src: m.team2Source, slot: 2 }
          ].forEach(function (pair) {
            if (!pair.src) return;
            var srcCard = byMid[pair.src.matchId];
            if (!srcCard) return;  // источник в другой сетке (UB→LB) — не рисуем
            var sRect = srcCard.getBoundingClientRect();
            var sx = sRect.right - bRect.left;
            var sy = sRect.top + sRect.height / 2 - bRect.top;
            // Точка входа в карточку: правая или левая середина в зависимости от слота
            var ex = dx;
            var ey = dy + (pair.slot === 1 ? dHeight * 0.30 : dHeight * 0.70);
            var midX = sx + (ex - sx) / 2;
            var path = '<path d="M ' + sx + ' ' + sy +
              ' C ' + midX + ' ' + sy + ', ' + midX + ' ' + ey + ', ' + ex + ' ' + ey +
              '" class="cs-svg-link' + (pair.src.takes === 'loser' ? ' loser' : '') + '"/>';
            svg.insertAdjacentHTML('beforeend', path);
          });
        });
      });
    }, 30);
  }

  /* ══════════════════════════════════════════════════════════
     START / GENERATE
  ══════════════════════════════════════════════════════════ */
  window._csStart = function () {
    var t = S.currentT; if (!t) return;
    var db = _db(); if (!db) return;
    var teamArr = _teamsSorted();
    if (teamArr.length < 2) { alert('Добавьте хотя бы 2 команды'); return; }

    var batch = db.batch();
    var mRef = db.collection('tournaments').doc(S.currentTId).collection('matches');
    var matches, extra = {};

    if (t.format === 'single_elim') {
      matches = Engine.genSE(teamArr, { bo: t.bo || 3, thirdPlace: !!t.thirdPlace });
    } else if (t.format === 'double_elim') {
      matches = Engine.genDE(teamArr, { bo: t.bo || 3 });
    } else if (t.format === 'group_elim') {
      var res = Engine.genGroup(teamArr, { bo: t.bo || 3 });
      matches = res.matches;
      extra.groupConfig = JSON.stringify(res.groupConfig);
    } else {
      alert('Формат не поддерживается');
      return;
    }

    matches.forEach(function (m) { batch.set(mRef.doc(m.id), m); });
    var tUpdate = Object.assign({ status: 'active' }, extra);
    batch.update(db.collection('tournaments').doc(S.currentTId), tUpdate);

    batch.commit().then(function () {
      S.bracketTab = 'bracket';
    }).catch(function (e) { alert('Ошибка старта: ' + e.message); });
  };

  /* ─── Запуск плей-офф после групп ─── */
  window._csStartPlayoff = function () {
    var t = S.currentT; if (!t) return;
    var db = _db(); if (!db) return;

    var groupConfig;
    try { groupConfig = JSON.parse(t.groupConfig || '{}'); } catch (e) { groupConfig = {}; }
    if (!Object.keys(groupConfig).length) { alert('Нет данных о группах'); return; }

    var allMatches = Object.values(S.matches);
    var poMatches = Engine.genGroupPlayoff(groupConfig, allMatches, { bo: t.bo || 3 });
    if (!poMatches.length) { alert('Не удалось сгенерировать плей-офф'); return; }

    var batch = db.batch();
    var mRef = db.collection('tournaments').doc(S.currentTId).collection('matches');
    poMatches.forEach(function (m) { batch.set(mRef.doc(m.id), m); });
    batch.update(db.collection('tournaments').doc(S.currentTId), { playoffStarted: true });

    batch.commit().catch(function (e) { alert('Ошибка: ' + e.message); });
  };

  /* ══════════════════════════════════════════════════════════
     MATCH RESULT — ввод и отмена
  ══════════════════════════════════════════════════════════ */
  window._csMatchEdit = function (matchId) {
    var m = S.matches[matchId]; if (!m) return;
    var t1 = m.team1Id ? (S.teams[m.team1Id] || null) : null;
    var t2 = m.team2Id ? (S.teams[m.team2Id] || null) : null;
    var bo = m.bo || (S.currentT && S.currentT.bo) || 3;
    var max = Math.ceil(bo / 2);

    _removePopup('csMatchPopup');
    var overlay = document.createElement('div');
    overlay.id = 'csMatchPopup';
    overlay.className = 'cs-popup-overlay';
    overlay.innerHTML = h('div', { class: 'cs-popup' },
      h('div', { class: 'cs-popup-title' },
        'Счёт матча ' + h('span', { class: 'cs-popup-bo' }, 'BO' + bo)) +
      h('div', { class: 'cs-me-row' },
        h('span', { class: 'cs-me-team' }, _e(t1 ? t1.name : 'TBD')) +
        '<input type="number" class="cs-me-inp" id="csMeS1" min="0" max="' + max + '" value="' + (m.score1 || 0) + '">' +
        h('span', { class: 'cs-me-sep' }, ':') +
        '<input type="number" class="cs-me-inp" id="csMeS2" min="0" max="' + max + '" value="' + (m.score2 || 0) + '">' +
        h('span', { class: 'cs-me-team' }, _e(t2 ? t2.name : 'TBD'))) +
      h('div', { class: 'cs-popup-note' }, 'Максимум ' + max + ' побед в BO' + bo) +
      h('div', { class: 'cs-popup-acts' },
        h('button', { class: 'cs-btn cs-btn-sec', onclick: 'window._csRemovePopup(\'csMatchPopup\')' }, 'Отмена') +
        h('button', { class: 'cs-btn cs-btn-pri', onclick: 'window._csSaveResult(\'' + _e(matchId) + '\')' }, 'Сохранить')));
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
    var mask = document.getElementById('cybersportMask');
    if (mask) mask.appendChild(overlay);
  };

  window._csSaveResult = function (matchId) {
    var db = _db(); if (!db) return;
    var m = S.matches[matchId]; if (!m) return;
    var bo = m.bo || (S.currentT && S.currentT.bo) || 3;
    var max = Math.ceil(bo / 2);
    var s1 = parseInt((_q('#csMeS1') || {}).value || '0');
    var s2 = parseInt((_q('#csMeS2') || {}).value || '0');

    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0 || s1 > max || s2 > max) {
      alert('Некорректный счёт для BO' + bo + ' (максимум ' + max + ')'); return;
    }
    if (s1 === s2) { alert('Не может быть ничья в BO' + bo); return; }
    if (s1 !== max && s2 !== max) {
      alert('Один из счётов должен быть ' + max + ' (BO' + bo + ')'); return;
    }

    var winnerId = s1 > s2 ? m.team1Id : m.team2Id;
    var batch = db.batch();
    var mRef  = db.collection('tournaments').doc(S.currentTId).collection('matches').doc(matchId);
    batch.update(mRef, { score1: s1, score2: s2, winnerId: winnerId, status: 'completed' });

    // Вычисляем downstream-обновления через Engine
    var allMatches = Object.values(S.matches);
    var completedSnapshot = Object.assign({}, m, { score1: s1, score2: s2, winnerId: winnerId });
    var updates = Engine.propagateMatchResult(allMatches, completedSnapshot);
    Object.keys(updates).forEach(function (mid) {
      batch.update(db.collection('tournaments').doc(S.currentTId).collection('matches').doc(mid), updates[mid]);
    });

    batch.commit().then(function () {
      _removePopup('csMatchPopup');
      _checkComplete();
    }).catch(function (e) { alert('Ошибка: ' + e.message); });
  };

  window._csUndoMatch = function (matchId) {
    if (!confirm('Отменить результат этого матча?')) return;
    var db = _db(); if (!db) return;
    var m = S.matches[matchId]; if (!m) return;

    var batch = db.batch();
    var mRef  = db.collection('tournaments').doc(S.currentTId).collection('matches').doc(matchId);
    batch.update(mRef, { score1: 0, score2: 0, winnerId: null, status: 'upcoming' });

    var allMatches = Object.values(S.matches);
    var clears = Engine.clearDownstream(allMatches, matchId);
    Object.keys(clears).forEach(function (mid) {
      batch.update(db.collection('tournaments').doc(S.currentTId).collection('matches').doc(mid), clears[mid]);
    });

    batch.commit().catch(function (e) { alert('Ошибка: ' + e.message); });
  };

  function _checkComplete() {
    var all = Object.values(S.matches);
    if (!all.length) return;
    var t = S.currentT;
    // Для group_elim турнир завершён только когда есть плей-офф и его финал сыгран
    if (t && t.format === 'group_elim') {
      var poMatches = all.filter(function (m) { return m.phase === 'playoff'; });
      if (!poMatches.length) return;
      if (!poMatches.every(function (m) { return !!m.winnerId; })) return;
    } else {
      if (!all.every(function (m) { return !!m.winnerId; })) return;
    }
    var db = _db(); if (!db) return;
    db.collection('tournaments').doc(S.currentTId).update({ status: 'completed' })
      .catch(function () {});
  }

  /* ══════════════════════════════════════════════════════════
     TEAM POPUP
  ══════════════════════════════════════════════════════════ */
  window._csTeamPopup = function (teamId) {
    var team = S.teams[teamId]; if (!team) return;
    _removePopup('csTeamPopup');

    var players = (team.players || []).filter(function (p) { return p.nick; }).map(function (p) {
      var lbl = ROLES[p.role] || p.role;
      return h('div', { class: 'cs-tp-row' },
        h('span', { class: 'cs-rl-ico' }, lbl.split(' ')[0]) +
        h('span', { class: 'cs-tp-nick' }, _e(p.nick)) +
        h('span', { class: 'cs-tp-role' }, lbl.split(' ').slice(1).join(' ')));
    }).join('');

    var overlay = document.createElement('div');
    overlay.id = 'csTeamPopup';
    overlay.className = 'cs-popup-overlay';
    overlay.innerHTML = h('div', { class: 'cs-popup' },
      h('div', { class: 'cs-tp-hdr' },
        _logoEl(team, 42) +
        h('div', { class: 'cs-tp-info' },
          h('div', { class: 'cs-tp-name' }, _e(team.name)) +
          h('div', { class: 'cs-tp-seed' }, 'Seed #' + (team.seed || '?'))) +
        h('button', { class: 'cs-btn-ico', onclick: 'window._csRemovePopup(\'csTeamPopup\')' }, '✕')) +
      (players
        ? h('div', { class: 'cs-tp-players' }, players)
        : h('div', { class: 'cs-tp-empty' }, 'Состав не указан')));
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
    var mask = document.getElementById('cybersportMask');
    if (mask) mask.appendChild(overlay);
  };

  window._csRemovePopup = function (id) { _removePopup(id); };

  function _removePopup(id) {
    var el = document.getElementById(id);
    if (el) el.remove();
  }

  /* ══════════════════════════════════════════════════════════
     SCHEDULE TAB
  ══════════════════════════════════════════════════════════ */
  function _htmlSchedule() {
    var matchArr = Object.values(S.matches);
    if (!matchArr.length) return h('div', { class: 'cs-empty' }, 'Расписание появится после запуска');

    var canEdit = _canEdit();
    var upcoming = matchArr.filter(function (m) { return !m.winnerId; });
    var done     = matchArr.filter(function (m) { return !!m.winnerId; });

    function _rowHtml(m) {
      var t1 = m.team1Id ? (S.teams[m.team1Id] || null) : null;
      var t2 = m.team2Id ? (S.teams[m.team2Id] || null) : null;
      var lbl = m.label || (m.phase === 'group' ? 'Группа ' + m.group : 'Раунд ' + m.round);
      var w  = m.winnerId ? (m.winnerId === m.team1Id ? t1 : t2) : null;
      return h('div', { class: 'cs-sched-row' },
        h('span', { class: 'cs-sched-lbl' }, _e(lbl)) +
        h('span', { class: 'cs-sched-teams' },
          (t1 ? _e(t1.name) : 'TBD') + ' vs ' + (t2 ? _e(t2.name) : 'TBD')) +
        (w ? h('span', { class: 'cs-sched-win' }, '▶ ' + _e(w.name)) : '') +
        (canEdit && t1 && t2 && !m.winnerId
          ? h('button', { class: 'cs-sched-btn', onclick: 'window._csMatchEdit(\'' + _e(m.id) + '\')' }, 'Счёт')
          : ''));
    }

    var html = '';
    if (upcoming.length) html += h('div', { class: 'cs-sched-section' }, 'Предстоящие') + upcoming.map(_rowHtml).join('');
    if (done.length)     html += h('div', { class: 'cs-sched-section' }, 'Завершённые') + done.map(_rowHtml).join('');
    return h('div', { class: 'cs-schedule' }, html);
  }

  /* ══════════════════════════════════════════════════════════
     TOURNAMENT SETTINGS — редактирование
  ══════════════════════════════════════════════════════════ */
  window._csTEditSettings = function () {
    var t = S.currentT; if (!t) return;
    _removePopup('csTEditPopup');
    var publicChecked = t.isPublic ? 'checked' : '';
    var overlay = document.createElement('div');
    overlay.id = 'csTEditPopup';
    overlay.className = 'cs-popup-overlay';
    overlay.innerHTML = h('div', { class: 'cs-popup' },
      h('div', { class: 'cs-popup-title' }, 'Настройки турнира') +
      _field('Название',
        h('input', { class: 'cs-input', id: 'csTeName', value: t.name || '' }, '')) +
      _field('Призовой фонд',
        h('input', { class: 'cs-input', id: 'csTePrize', value: t.prizePool || '' }, '')) +
      h('label', { class: 'cs-checkrow' },
        '<input type="checkbox" id="csTeIsPublic" ' + publicChecked + '>' +
        '<span>Публичный — доступен по прямой ссылке</span>') +
      h('div', { class: 'cs-popup-acts' },
        h('button', { class: 'cs-btn cs-btn-danger', onclick: 'window._csTDeleteTournament()' }, 'Удалить турнир') +
        h('button', { class: 'cs-btn cs-btn-sec', onclick: 'window._csRemovePopup(\'csTEditPopup\')' }, 'Отмена') +
        h('button', { class: 'cs-btn cs-btn-pri', onclick: 'window._csSaveTSettings()' }, 'Сохранить')));
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
    var mask = document.getElementById('cybersportMask');
    if (mask) mask.appendChild(overlay);
  };

  window._csSaveTSettings = function () {
    var db = _db(); if (!db) return;
    var name  = (_q('#csTeName') || {}).value || '';
    var prize = (_q('#csTePrize') || {}).value || '';
    var isPublic = !!(_q('#csTeIsPublic') && _q('#csTeIsPublic').checked);
    if (!name.trim()) { alert('Введите название'); return; }
    db.collection('tournaments').doc(S.currentTId).update({
      name: name.trim(), prizePool: prize.trim(), isPublic: isPublic
    }).then(function () {
      _removePopup('csTEditPopup');
    }).catch(function (e) { alert('Ошибка: ' + e.message); });
  };

  window._csTDeleteTournament = function () {
    if (!confirm('Удалить турнир целиком? Это действие необратимо.')) return;
    var db = _db(); if (!db) return;
    var tId = S.currentTId;
    var tRef = db.collection('tournaments').doc(tId);

    // Удаляем подколлекции команд и матчей
    Promise.all([
      tRef.collection('teams').get(),
      tRef.collection('matches').get()
    ]).then(function (snaps) {
      var batch = db.batch();
      snaps.forEach(function (snap) {
        snap.forEach(function (d) { batch.delete(d.ref); });
      });
      batch.delete(tRef);
      return batch.commit();
    }).then(function () {
      _removePopup('csTEditPopup');
      window._csBackToList();
      _toast('Турнир удалён');
    }).catch(function (e) { alert('Ошибка удаления: ' + e.message); });
  };

  /* ══════════════════════════════════════════════════════════
     SHARING
  ══════════════════════════════════════════════════════════ */
  window._csShare = function () {
    var t = S.currentT; if (!t) return;
    var url = window.location.origin + window.location.pathname + '?cs=' + S.currentTId;

    if (!t.isPublic && _isCreator()) {
      if (confirm('Турнир сейчас приватный — зрители без авторизации не смогут открыть ссылку. Сделать его публичным?')) {
        var db = _db();
        if (db) db.collection('tournaments').doc(S.currentTId).update({ isPublic: true });
      }
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        _toast('Ссылка скопирована');
      }).catch(function () {
        _showShareLink(url);
      });
    } else {
      _showShareLink(url);
    }
  };

  function _showShareLink(url) {
    _removePopup('csSharePopup');
    var overlay = document.createElement('div');
    overlay.id = 'csSharePopup';
    overlay.className = 'cs-popup-overlay';
    overlay.innerHTML = h('div', { class: 'cs-popup' },
      h('div', { class: 'cs-popup-title' }, '🔗 Ссылка на турнир') +
      h('input', { class: 'cs-input', id: 'csShareUrl', value: url, readonly: 'readonly' }, '') +
      h('div', { class: 'cs-popup-note' }, 'Скопируйте и отправьте кому угодно — даже без аккаунта смогут смотреть сетку.') +
      h('div', { class: 'cs-popup-acts' },
        h('button', { class: 'cs-btn cs-btn-pri', onclick: 'window._csRemovePopup(\'csSharePopup\')' }, 'OK')));
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
    var mask = document.getElementById('cybersportMask');
    if (mask) mask.appendChild(overlay);
    setTimeout(function () { var i = _q('#csShareUrl'); if (i) i.select(); }, 50);
  }

  /* ══════════════════════════════════════════════════════════
     UTILS
  ══════════════════════════════════════════════════════════ */
  function _teamsSorted() {
    return Object.keys(S.teams).map(function (k) { return S.teams[k]; }).sort(function (a, b) {
      return (a.seed || 0) - (b.seed || 0);
    });
  }

  /* Перерисовываем коннекторы при ресайзе окна */
  window.addEventListener('resize', function () {
    if (S.view === 'tournament' && S.bracketTab === 'bracket') {
      _drawConnectors();
    }
  });

})();
