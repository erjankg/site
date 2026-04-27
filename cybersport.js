/* ═══════════════════════════════════════════════════════════════
   CYBERSPORT — Турнирная система
   Firestore:
     /tournaments/{id}
     /tournaments/{id}/teams/{teamId}
     /tournaments/{id}/matches/{matchId}
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── CONSTANTS ───────────────────────────────────────────── */
  var ROLES = {
    top:     '🗡️ Топ',
    jungle:  '🌿 Джангл',
    mid:     '⚡ Мид',
    adc:     '🏹 АДК',
    support: '🛡️ Сап'
  };
  var ROLE_KEYS = ['top', 'jungle', 'mid', 'adc', 'support'];

  var FORMAT_LABELS = {
    single_elim:       'Single Elimination',
    double_elim:       'Double Elimination',
    group_elim:        'Группы + Плей-офф',
    playin_group_elim: 'Play-in → Группы → Плей-офф'
  };

  /* ── STATE ───────────────────────────────────────────────── */
  var _view        = 'list';    // list | create | tournament
  var _tab         = 'active';  // active | upcoming | completed
  var _bracketTab  = 'bracket'; // bracket | teams | schedule
  var _step        = 1;         // wizard step 1-3
  var _draftData   = {};        // wizard in-progress data
  var _tournaments = [];
  var _currentTId  = null;
  var _currentT    = null;
  var _teams       = {};        // {teamId: teamData}
  var _matches     = {};        // {matchId: matchData}
  var _unsubTeams   = null;
  var _unsubMatches = null;
  var _editingTeamIdx = null;   // index in _draftData.teams for wizard editing

  /* ── FIREBASE ────────────────────────────────────────────── */
  function _db() {
    if (typeof firebase !== 'undefined' && firebase.firestore) return firebase.firestore();
    return null;
  }
  function _uid() {
    try { return firebase.auth().currentUser && firebase.auth().currentUser.uid; } catch (e) { return null; }
  }
  function _ts() { return firebase.firestore.FieldValue.serverTimestamp(); }

  /* ── OPEN / CLOSE ────────────────────────────────────────── */
  window.openCybersport = function () {
    if (window.openModal) window.openModal('cybersportMask');
    _view = 'list'; _tab = 'active'; _tournaments = [];
    _render();
    _loadList();
  };

  window.closeCybersport = function () {
    _unsubAll();
    if (window.closeModal) window.closeModal('cybersportMask');
  };

  function _unsubAll() {
    if (_unsubTeams)   { try { _unsubTeams();   } catch (e) {} _unsubTeams   = null; }
    if (_unsubMatches) { try { _unsubMatches(); } catch (e) {} _unsubMatches = null; }
  }

  /* ── RENDER ROUTER ───────────────────────────────────────── */
  function _render() {
    var root = document.getElementById('csRoot');
    if (!root) return;
    if      (_view === 'list')       root.innerHTML = _htmlList();
    else if (_view === 'create')     root.innerHTML = _htmlCreate();
    else if (_view === 'tournament') root.innerHTML = _htmlTournament();
  }
  window._csRender = _render;

  /* ══════════════════════════════════════════════════════════
     LIST VIEW
  ══════════════════════════════════════════════════════════ */
  function _loadList() {
    var db = _db(); if (!db) return;
    db.collection('tournaments').orderBy('createdAt', 'desc').limit(60).get()
      .then(function (snap) {
        _tournaments = [];
        snap.forEach(function (doc) {
          _tournaments.push(Object.assign({ id: doc.id }, doc.data()));
        });
        _renderList();
      }).catch(function (e) { console.warn('CS loadList:', e); });
  }

  function _renderList() {
    var root = document.getElementById('csRoot');
    if (!root || _view !== 'list') return;
    root.innerHTML = _htmlList();
  }

  function _htmlList() {
    var TAB_INFO = [
      { key: 'active',    label: 'Активные'     },
      { key: 'upcoming',  label: 'Предстоящие'  },
      { key: 'completed', label: 'Завершённые'  }
    ];
    var tabsHtml = TAB_INFO.map(function (ti) {
      var cnt = _tournaments.filter(function (t) { return t.status === ti.key; }).length;
      return '<button class="cs-tab' + (_tab === ti.key ? ' active' : '') +
        '" onclick="window._csSetTab(\'' + ti.key + '\')">' + ti.label +
        (cnt ? ' <span class="cs-tab-badge">' + cnt + '</span>' : '') + '</button>';
    }).join('');

    var filtered = _tournaments.filter(function (t) { return t.status === _tab; });
    var listHtml;
    if (!_tournaments.length) {
      listHtml = '<div class="cs-empty"><div class="cs-empty-icon">🏆</div>Нет турниров. Создайте первый!</div>';
    } else if (!filtered.length) {
      listHtml = '<div class="cs-empty"><div class="cs-empty-icon">📭</div>Нет турниров в этой категории</div>';
    } else {
      listHtml = filtered.map(_htmlTCard).join('');
    }

    return '<div class="cs-list-view">' +
      '<div class="cs-list-top"><span class="cs-list-title">🏆 Турниры</span>' +
      '<button class="cs-btn-add" onclick="window._csShowCreate()">＋</button></div>' +
      '<div class="cs-tabs">' + tabsHtml + '</div>' +
      '<div class="cs-list-body">' + listHtml + '</div></div>';
  }

  function _htmlTCard(t) {
    var badge = {
      active:    '<span class="cs-badge cs-badge-live">Идёт</span>',
      upcoming:  '<span class="cs-badge cs-badge-up">Скоро</span>',
      completed: '<span class="cs-badge cs-badge-done">Завершён</span>'
    }[t.status] || '';
    return '<div class="cs-card" onclick="window._csOpenTournament(\'' + t.id + '\')">' +
      '<div class="cs-card-ico">' + (t.logoUrl ? '<img src="' + _ea(t.logoUrl) + '">' : '🏆') + '</div>' +
      '<div class="cs-card-body">' +
      '<div class="cs-card-name">' + _e(t.name) + ' ' + badge + '</div>' +
      '<div class="cs-card-meta">' + (FORMAT_LABELS[t.format] || t.format) + ' · ' + (t.teamCount || '?') + ' команд' +
      (t.prizePool ? ' · 🏅 ' + _e(t.prizePool) : '') + '</div>' +
      '</div><div class="cs-card-arr">›</div></div>';
  }

  window._csSetTab = function (tab) { _tab = tab; _renderList(); };
  window._csShowCreate = function () { _view = 'create'; _step = 1; _draftData = {}; _render(); };
  window._csOpenTournament = function (id) {
    _unsubAll(); _view = 'tournament'; _currentTId = id;
    _currentT = null; _teams = {}; _matches = {}; _bracketTab = 'bracket';
    _render(); _loadTournament(id);
  };

  /* ══════════════════════════════════════════════════════════
     CREATE WIZARD
  ══════════════════════════════════════════════════════════ */
  function _htmlCreate() {
    var stepsHtml = ['Настройки', 'Команды', 'Запуск'].map(function (s, i) {
      var n = i + 1;
      var cls = 'cs-wiz-step' + (_step === n ? ' active' : (_step > n ? ' done' : ''));
      return '<div class="' + cls + '"><div class="cs-wiz-num">' + n +
        '</div><div class="cs-wiz-lbl">' + s + '</div></div>' +
        (i < 2 ? '<div class="cs-wiz-line' + (_step > n ? ' done' : '') + '"></div>' : '');
    }).join('');

    var body = _step === 1 ? _htmlStep1() : _step === 2 ? _htmlStep2() : _htmlStep3();
    return '<div class="cs-create-view">' +
      '<div class="cs-wiz-steps">' + stepsHtml + '</div>' +
      '<div class="cs-create-body">' + body + '</div></div>';
  }

  function _htmlStep1() {
    var fmtHtml = Object.keys(FORMAT_LABELS).map(function (k) {
      var sel = _draftData.format === k;
      return '<div class="cs-fmt-opt' + (sel ? ' sel' : '') + '" data-fmt="' + k + '" onclick="window._csSelectFmt(\'' + k + '\')">' +
        '<span class="cs-fmt-name">' + FORMAT_LABELS[k] + '</span></div>';
    }).join('');

    var cntHtml = [8, 12, 16, 24, 32].map(function (n) {
      return '<button class="cs-cnt-btn' + (_draftData.teamCount === n ? ' sel' : '') +
        '" data-n="' + n + '" onclick="window._csSetCount(' + n + ')">' + n + '</button>';
    }).join('');

    var boHtml = [1, 3, 5].map(function (n) {
      return '<button class="cs-bo-btn' + ((_draftData.bo || 3) === n ? ' sel' : '') +
        '" data-bo="' + n + '" onclick="window._csSetBo(' + n + ')">BO' + n + '</button>';
    }).join('');

    return '<div class="cs-step-body">' +
      _field('Название турнира', '<input class="cs-input" id="csTName" placeholder="HFX Invitational 2026" value="' + _e(_draftData.name || '') + '">') +
      _field('Формат', '<div class="cs-fmts" id="csFmts">' + fmtHtml + '</div>') +
      _field('Количество команд', '<div class="cs-cnt-row">' + cntHtml + '</div>') +
      _field('Плей-офф формат', '<div class="cs-bo-row">' + boHtml + '</div>') +
      _field('Призовой фонд (опционально)', '<input class="cs-input" id="csPrize" placeholder="10 000 руб" value="' + _e(_draftData.prizePool || '') + '">') +
      '<div class="cs-step-actions">' +
      '<button class="cs-btn cs-btn-sec" onclick="window._csBackToList()">Отмена</button>' +
      '<button class="cs-btn cs-btn-pri" onclick="window._csStep1Next()">Далее →</button>' +
      '</div></div>';
  }

  function _htmlStep2() {
    var teams  = _draftData.teams || [];
    var maxT   = _draftData.teamCount || 8;
    var canAdd = teams.length < maxT;

    var listHtml = teams.length
      ? teams.map(function (t, i) {
          return '<div class="cs-wiz-team-row">' +
            (t.logoUrl ? '<img class="cs-wiz-logo" src="' + _ea(t.logoUrl) + '">' :
              '<div class="cs-wiz-logo-ph">' + (t.name ? t.name[0].toUpperCase() : '?') + '</div>') +
            '<span class="cs-wiz-tname">' + _e(t.name) + '</span>' +
            '<span class="cs-seed-badge">#' + (i + 1) + '</span>' +
            '<button class="cs-btn-ico" onclick="window._csWizEditTeam(' + i + ')">✏</button>' +
            '<button class="cs-btn-ico cs-btn-del" onclick="window._csWizDelTeam(' + i + ')">✕</button>' +
            '</div>';
        }).join('')
      : '<div class="cs-empty-sm">Добавьте команды</div>';

    return '<div class="cs-step-body">' +
      '<div class="cs-step2-hdr">' +
      '<span class="cs-teams-cnt">' + teams.length + ' / ' + maxT + ' команд</span>' +
      (canAdd ? '<button class="cs-btn cs-btn-sm cs-btn-pri" onclick="window._csWizAddTeam()">+ Команда</button>' : '') +
      '</div>' +
      '<div class="cs-wiz-teams-list">' + listHtml + '</div>' +
      '<div id="csWizTeamForm"></div>' +
      '<div class="cs-step-actions">' +
      '<button class="cs-btn cs-btn-sec" onclick="window._csStep(1)">← Назад</button>' +
      '<button class="cs-btn cs-btn-pri" onclick="window._csStep2Next()">Далее →</button>' +
      '</div></div>';
  }

  function _htmlStep3() {
    var teams = _draftData.teams || [];
    return '<div class="cs-step-body">' +
      '<div class="cs-summary">' +
      _sumRow('Название',       _e(_draftData.name)) +
      _sumRow('Формат',         FORMAT_LABELS[_draftData.format] || '—') +
      _sumRow('Команд',         teams.length + ' / ' + _draftData.teamCount) +
      _sumRow('Плей-офф',       'BO' + (_draftData.bo || 3)) +
      (_draftData.prizePool ? _sumRow('Призовой фонд', _e(_draftData.prizePool)) : '') +
      '</div>' +
      '<div class="cs-step3-note">После создания можно продолжать добавлять команды и редактировать их.</div>' +
      '<div class="cs-step-actions">' +
      '<button class="cs-btn cs-btn-sec" onclick="window._csStep(2)">← Назад</button>' +
      '<button class="cs-btn cs-btn-pri" id="csCreateBtn" onclick="window._csCreate()">Создать турнир 🚀</button>' +
      '</div></div>';
  }

  function _sumRow(label, val) {
    return '<div class="cs-sum-row"><span>' + label + '</span><strong>' + val + '</strong></div>';
  }

  window._csStep       = function (n) { _step = n; _render(); };

  /* Выбор формата — только обновляем классы, без ре-рендера */
  window._csSelectFmt  = function (k) {
    _draftData.format = k;
    document.querySelectorAll('.cs-fmt-opt').forEach(function (el) {
      el.classList.toggle('sel', el.dataset.fmt === k);
    });
  };

  /* Кол-во команд — обновляем кнопки без ре-рендера */
  window._csSetCount   = function (n) {
    _draftData.teamCount = n;
    document.querySelectorAll('.cs-cnt-btn').forEach(function (btn) {
      btn.classList.toggle('sel', parseInt(btn.dataset.n, 10) === n);
    });
  };

  /* BO — обновляем кнопки без ре-рендера */
  window._csSetBo      = function (n) {
    _draftData.bo = n;
    document.querySelectorAll('.cs-bo-btn').forEach(function (btn) {
      btn.classList.toggle('sel', parseInt(btn.dataset.bo, 10) === n);
    });
  };

  window._csBackToList = function () { _unsubAll(); _view = 'list'; _currentTId = null; _currentT = null; _render(); _loadList(); };

  window._csStep1Next = function () {
    var name = (_q('#csTName') || {}).value || '';
    var fmt  = document.querySelector('#csFmts input[name="csFmt"]:checked');
    _draftData.name      = name.trim();
    if (fmt) _draftData.format = fmt.value;
    _draftData.prizePool = ((_q('#csPrize') || {}).value || '').trim();
    if (!_draftData.name)      { alert('Введите название турнира'); return; }
    if (!_draftData.format)    { alert('Выберите формат'); return; }
    if (!_draftData.teamCount) { alert('Выберите количество команд'); return; }
    _step = 2; _render();
  };

  window._csStep2Next = function () {
    if (!(_draftData.teams || []).length || _draftData.teams.length < 2) {
      alert('Добавьте хотя бы 2 команды'); return;
    }
    _step = 3; _render();
  };

  /* ── Wizard team form ── */
  function _renderWizTeamForm(team) {
    var wrap = _q('#csWizTeamForm'); if (!wrap) return;
    var t = team || { name: '', logoUrl: '' };
    var players = t.players && t.players.length ? t.players
      : ROLE_KEYS.map(function (r) { return { nick: '', role: r }; });

    var playersHtml = players.map(function (p, i) {
      var lbl = ROLES[p.role] || p.role;
      return '<div class="cs-pl-row">' +
        '<span class="cs-rl-ico">' + lbl.split(' ')[0] + '</span>' +
        '<span class="cs-rl-lbl">' + lbl.split(' ').slice(1).join(' ') + '</span>' +
        '<input class="cs-input cs-pl-inp" data-pi="' + i + '" placeholder="Ник" value="' + _e(p.nick || '') + '">' +
        '</div>';
    }).join('');

    wrap.innerHTML = '<div class="cs-team-form">' +
      '<div class="cs-tf-hdr"><strong>' + (_editingTeamIdx !== null ? 'Редактировать' : 'Новая') + ' команда</strong>' +
      '<button class="cs-btn-ico" onclick="window._csCancelWizForm()">✕</button></div>' +
      _field('Название', '<input class="cs-input" id="csTfName" value="' + _e(t.name || '') + '" placeholder="Team Name">') +
      _field('Лого (URL)', '<input class="cs-input" id="csTfLogo" value="' + _e(t.logoUrl || '') + '" placeholder="https://...">') +
      _field('Состав', '<div class="cs-players-wrap">' + playersHtml + '</div>') +
      '<button class="cs-btn cs-btn-pri" style="width:100%;margin-top:8px" onclick="window._csSaveWizTeam()">Сохранить</button>' +
      '</div>';
  }

  window._csWizAddTeam  = function () { _editingTeamIdx = null; _renderWizTeamForm(null); };
  window._csWizEditTeam = function (i) { _editingTeamIdx = i; _renderWizTeamForm((_draftData.teams || [])[i]); };
  window._csWizDelTeam  = function (i) { if (_draftData.teams) _draftData.teams.splice(i, 1); _render(); };
  window._csCancelWizForm = function () { var w = _q('#csWizTeamForm'); if (w) w.innerHTML = ''; };

  window._csSaveWizTeam = function () {
    var name = (_q('#csTfName') || {}).value || '';
    if (!name.trim()) { alert('Введите название команды'); return; }
    var logo    = (_q('#csTfLogo') || {}).value || '';
    var players = _collectPlayers();
    var team = { name: name.trim(), logoUrl: logo.trim(), players: players };
    if (!_draftData.teams) _draftData.teams = [];
    if (_editingTeamIdx !== null) _draftData.teams[_editingTeamIdx] = team;
    else _draftData.teams.push(team);
    _render();
  };

  /* ── Create tournament in Firestore ── */
  window._csCreate = function () {
    var db  = _db(); if (!db) return;
    var uid = _uid(); if (!uid) { alert('Войдите для создания турнира'); return; }
    var btn = _q('#csCreateBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Создание...'; }

    var data = {
      name: _draftData.name, format: _draftData.format,
      teamCount: _draftData.teamCount, bo: _draftData.bo || 3,
      prizePool: _draftData.prizePool || '', createdBy: uid,
      createdAt: _ts(), status: 'upcoming'
    };

    db.collection('tournaments').add(data).then(function (ref) {
      var id = ref.id;
      var batch = db.batch();
      (_draftData.teams || []).forEach(function (t, i) {
        var tRef = db.collection('tournaments').doc(id).collection('teams').doc();
        batch.set(tRef, Object.assign({}, t, { seed: i + 1, createdAt: _ts() }));
      });
      return batch.commit().then(function () { return id; });
    }).then(function (id) {
      _view = 'tournament'; _currentTId = id; _currentT = null;
      _teams = {}; _matches = {}; _bracketTab = 'teams';
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

    db.collection('tournaments').doc(id).get().then(function (doc) {
      if (!doc.exists) { alert('Турнир не найден'); window._csBackToList(); return; }
      _currentT = Object.assign({ id: doc.id }, doc.data()); _render();
    });

    _unsubTeams = db.collection('tournaments').doc(id).collection('teams')
      .orderBy('seed').onSnapshot(function (snap) {
        _teams = {};
        snap.forEach(function (d) { _teams[d.id] = Object.assign({ id: d.id }, d.data()); });
        _render();
      }, function (e) { console.warn('CS teams:', e); });

    _unsubMatches = db.collection('tournaments').doc(id).collection('matches')
      .onSnapshot(function (snap) {
        _matches = {};
        snap.forEach(function (d) { _matches[d.id] = Object.assign({ id: d.id }, d.data()); });
        _render();
      }, function (e) { console.warn('CS matches:', e); });
  }

  function _htmlTournament() {
    var t         = _currentT;
    var loading   = !t;
    var isCreator = t && _uid() && t.createdBy === _uid();
    var name      = loading ? 'Загрузка...' : t.name;

    var tabsHtml = [['bracket','🏆 Сетка'],['teams','👥 Команды'],['schedule','📅 Расписание']].map(function (tb) {
      return '<button class="cs-tab' + (_bracketTab === tb[0] ? ' active' : '') +
        '" onclick="window._csBrTab(\'' + tb[0] + '\')">' + tb[1] + '</button>';
    }).join('');

    var startBtn = (isCreator && t && t.status === 'upcoming' && !Object.keys(_matches).length)
      ? '<button class="cs-btn cs-btn-sm cs-btn-pri" onclick="window._csStart()">▶ Старт</button>' : '';
    var editBtn = isCreator
      ? '<button class="cs-btn cs-btn-sm cs-btn-sec" onclick="window._csTEditSettings()">✏</button>' : '';

    var status = t ? ({active:'Идёт',upcoming:'Скоро',completed:'Завершён'}[t.status] || '') : '';
    var statusBadge = t ? (' <span class="cs-badge cs-badge-' + t.status + '">' + status + '</span>') : '';

    var body = '';
    if (!loading) {
      if (_bracketTab === 'bracket')  body = _htmlBracket();
      if (_bracketTab === 'teams')    body = _htmlTeamsTab();
      if (_bracketTab === 'schedule') body = _htmlSchedule();
    } else {
      body = '<div class="cs-loading">Загрузка...</div>';
    }

    return '<div class="cs-tourn-view">' +
      '<div class="cs-tourn-hdr">' +
      '<button class="cs-btn-ico cs-back" onclick="window._csBackToList()">←</button>' +
      '<span class="cs-tourn-name">' + _e(name) + statusBadge + '</span>' +
      '<div class="cs-tourn-acts">' + startBtn + editBtn + '</div>' +
      '</div>' +
      (t ? '<div class="cs-tourn-meta">' +
        (FORMAT_LABELS[t.format] || t.format) + ' · ' + (t.teamCount || '?') + ' команд · BO' + (t.bo || 3) +
        (t.prizePool ? ' · 🏅 ' + _e(t.prizePool) : '') + '</div>' : '') +
      '<div class="cs-tabs">' + tabsHtml + '</div>' +
      '<div class="cs-tourn-body">' + body + '</div>' +
      '</div>';
  }

  window._csBrTab = function (tab) { _bracketTab = tab; _render(); };

  /* ══════════════════════════════════════════════════════════
     TEAMS TAB
  ══════════════════════════════════════════════════════════ */
  function _htmlTeamsTab() {
    var t         = _currentT;
    var isCreator = t && _uid() && t.createdBy === _uid();
    var teamArr   = _teamsSorted();
    var maxT      = t ? (t.teamCount || 32) : 32;

    var addBtn = (isCreator && teamArr.length < maxT)
      ? '<button class="cs-btn cs-btn-pri" style="margin:12px 16px 4px" onclick="window._csShowAddTeam()">+ Добавить команду</button>' : '';

    var html = teamArr.length
      ? teamArr.map(function (team) { return _htmlTeamCardFull(team, isCreator); }).join('')
      : '<div class="cs-empty">Нет команд</div>';

    return '<div class="cs-teams-view">' + addBtn +
      '<div id="csAddTeamWrap"></div>' + html + '</div>';
  }

  function _htmlTeamCardFull(team, isCreator) {
    var players = (team.players || []).filter(function (p) { return p.nick; }).map(function (p) {
      var lbl = ROLES[p.role] || p.role;
      return '<div class="cs-pl-card-row">' +
        '<span class="cs-rl-ico">' + lbl.split(' ')[0] + '</span>' +
        '<span class="cs-pl-nick">' + _e(p.nick) + '</span>' +
        '<span class="cs-pl-role">' + lbl.split(' ').slice(1).join(' ') + '</span>' +
        '</div>';
    }).join('');

    return '<div class="cs-team-card-full">' +
      '<div class="cs-tc-hdr">' +
      _logoEl(team, 40) +
      '<div class="cs-tc-info"><div class="cs-tc-name">' + _e(team.name) + '</div>' +
      '<div class="cs-tc-seed">Посев #' + (team.seed || '?') + '</div></div>' +
      (isCreator ? '<button class="cs-btn-ico" onclick="window._csEditTeamFs(\'' + team.id + '\')">✏</button>' : '') +
      (isCreator ? '<button class="cs-btn-ico cs-btn-del" onclick="window._csDeleteTeam(\'' + team.id + '\')">✕</button>' : '') +
      '</div>' +
      (players ? '<div class="cs-tc-players">' + players + '</div>' : '') +
      '</div>';
  }

  window._csShowAddTeam = function () {
    var wrap = _q('#csAddTeamWrap'); if (!wrap) return;
    var nextSeed = _teamsSorted().reduce(function (m, t) { return Math.max(m, t.seed || 0); }, 0) + 1;
    wrap.innerHTML = _teamFormHtml(null, nextSeed, '_csSaveAddTeam');
  };

  window._csEditTeamFs = function (teamId) {
    var team = _teams[teamId]; if (!team) return;
    var wrap = _q('#csAddTeamWrap'); if (!wrap) return;
    wrap.innerHTML = _teamFormHtml(team, team.seed, '_csSaveEditTeam(\'' + teamId + '\')');
  };

  function _teamFormHtml(team, seed, saveCmd) {
    var t = team || { name: '', logoUrl: '' };
    var players = t.players && t.players.length ? t.players
      : ROLE_KEYS.map(function (r) { return { nick: '', role: r }; });

    var plHtml = players.map(function (p, i) {
      var lbl = ROLES[p.role] || p.role;
      return '<div class="cs-pl-row">' +
        '<span class="cs-rl-ico">' + lbl.split(' ')[0] + '</span>' +
        '<span class="cs-rl-lbl">' + lbl.split(' ').slice(1).join(' ') + '</span>' +
        '<input class="cs-input cs-pl-inp" data-pi="' + i + '" placeholder="Ник" value="' + _e(p.nick || '') + '">' +
        '</div>';
    }).join('');

    return '<div class="cs-team-form">' +
      '<div class="cs-tf-hdr"><strong>' + (team ? 'Редактировать' : 'Новая') + ' команда</strong>' +
      '<button class="cs-btn-ico" onclick="window._csCancelAddTeam()">✕</button></div>' +
      _field('Название', '<input class="cs-input" id="csFsName" value="' + _e(t.name || '') + '" placeholder="Team Name">') +
      _field('Лого (URL)', '<input class="cs-input" id="csFsLogo" value="' + _e(t.logoUrl || '') + '" placeholder="https://...">') +
      _field('Состав', '<div class="cs-players-wrap">' + plHtml + '</div>') +
      '<button class="cs-btn cs-btn-pri" style="width:100%;margin-top:8px" onclick="window.' + saveCmd + '">Сохранить</button>' +
      '</div>';
  }

  window._csCancelAddTeam = function () { var w = _q('#csAddTeamWrap'); if (w) w.innerHTML = ''; };

  window._csSaveAddTeam = function () {
    var db = _db(); if (!db) return;
    var name = (_q('#csFsName') || {}).value || '';
    if (!name.trim()) { alert('Введите название'); return; }
    var logo    = (_q('#csFsLogo') || {}).value || '';
    var players = _collectPlayers();
    var nextSeed = _teamsSorted().reduce(function (m, t) { return Math.max(m, t.seed || 0); }, 0) + 1;
    db.collection('tournaments').doc(_currentTId).collection('teams')
      .add({ name: name.trim(), logoUrl: logo.trim(), players: players, seed: nextSeed, createdAt: _ts() })
      .then(function () { window._csCancelAddTeam(); })
      .catch(function (e) { alert('Ошибка: ' + e.message); });
  };

  window._csSaveEditTeam = function (teamId) {
    var db = _db(); if (!db) return;
    var name = (_q('#csFsName') || {}).value || '';
    if (!name.trim()) { alert('Введите название'); return; }
    var logo    = (_q('#csFsLogo') || {}).value || '';
    var players = _collectPlayers();
    db.collection('tournaments').doc(_currentTId).collection('teams').doc(teamId)
      .update({ name: name.trim(), logoUrl: logo.trim(), players: players })
      .then(function () { window._csCancelAddTeam(); })
      .catch(function (e) { alert('Ошибка: ' + e.message); });
  };

  window._csDeleteTeam = function (teamId) {
    if (!confirm('Удалить команду из турнира?')) return;
    var db = _db(); if (!db) return;
    db.collection('tournaments').doc(_currentTId).collection('teams').doc(teamId)
      .delete().catch(function (e) { alert('Ошибка: ' + e.message); });
  };

  /* ══════════════════════════════════════════════════════════
     BRACKET TAB
  ══════════════════════════════════════════════════════════ */
  function _htmlBracket() {
    var t       = _currentT;
    var matchArr = Object.values(_matches);

    if (!matchArr.length) {
      if (t && t.status === 'upcoming') {
        var startBtnHtml = (_uid() === (t && t.createdBy))
          ? '<button class="cs-btn cs-btn-pri" style="margin-top:12px" onclick="window._csStart()">▶ Запустить турнир</button>' : '';
        return '<div class="cs-empty">' +
          '<div class="cs-empty-icon">📋</div>' +
          '<div>Турнир ещё не запущен.<br>Добавьте команды и нажмите «Старт».</div>' +
          startBtnHtml + '</div>';
      }
      return '<div class="cs-empty">Нет матчей</div>';
    }

    if (t && (t.format === 'single_elim' || t.format === 'double_elim')) {
      return _renderSEBracket(matchArr);
    }
    if (t && t.format === 'group_elim') {
      return _renderGroupBracket(matchArr);
    }
    // Fallback: single elim rendering
    return _renderSEBracket(matchArr);
  }

  /* ── Single Elimination ── */
  function _renderSEBracket(matchArr) {
    var rounds   = {};
    var maxRound = 0;
    matchArr.forEach(function (m) {
      var r = m.round || 1;
      if (!rounds[r]) rounds[r] = [];
      rounds[r].push(m);
      if (r > maxRound) maxRound = r;
    });

    // Sort matches within each round
    for (var r in rounds) {
      rounds[r].sort(function (a, b) { return (a.matchNum || 0) - (b.matchNum || 0); });
    }

    var roundLabels = {};
    for (var rr = 1; rr <= maxRound; rr++) {
      var cnt = (rounds[rr] || []).length;
      if (rr === maxRound)     roundLabels[rr] = 'Финал';
      else if (rr === maxRound - 1) roundLabels[rr] = 'Полуфинал';
      else if (rr === maxRound - 2) roundLabels[rr] = 'Четвертьфинал';
      else                     roundLabels[rr] = '1/' + (cnt * 2) + ' финала';
    }

    var isCreator = _uid() && _currentT && _currentT.createdBy === _uid();

    // Use round 1 count to determine slot heights
    var r1cnt      = (rounds[1] || []).length;
    var SLOT_H     = 96; // px per slot in round 1
    var totalH     = r1cnt * SLOT_H;

    var cols = '';
    for (var round = 1; round <= maxRound; round++) {
      var rm        = rounds[round] || [];
      var slotH     = totalH / rm.length;
      var matchesHtml = rm.map(function (m) {
        return '<div class="cs-br-slot-wrap" style="height:' + slotH + 'px">' +
          _htmlSEMatch(m, isCreator) + '</div>';
      }).join('');

      cols += '<div class="cs-br-col">' +
        '<div class="cs-br-rlabel">' + roundLabels[round] + '</div>' +
        '<div class="cs-br-matches" style="height:' + totalH + 'px">' + matchesHtml + '</div>' +
        '</div>';

      // Connector column (not last round)
      if (round < maxRound) {
        var nextCnt = (rounds[round + 1] || []).length;
        var connPairs = rm.length / 2;
        var connHtml = '';
        for (var ci = 0; ci < connPairs; ci++) {
          connHtml += '<div class="cs-conn-pair" style="height:' + (totalH / connPairs) + 'px">' +
            '<div class="cs-conn-top"></div><div class="cs-conn-bot"></div></div>';
        }
        cols += '<div class="cs-br-conn" style="height:' + totalH + 'px;margin-top:' +
          (/* label height */ 28) + 'px">' + connHtml + '</div>';
      }
    }

    // Winner column
    var finalMatch  = maxRound && rounds[maxRound] && rounds[maxRound][0];
    var winTeam     = finalMatch && finalMatch.winnerId ? (_teams[finalMatch.winnerId] || null) : null;
    if (winTeam) {
      cols += '<div class="cs-br-col cs-br-winner-col">' +
        '<div class="cs-br-rlabel">Победитель</div>' +
        '<div class="cs-br-matches" style="height:' + totalH + 'px">' +
        '<div class="cs-br-slot-wrap" style="height:' + totalH + 'px">' +
        '<div class="cs-br-winner-card">' +
        _logoEl(winTeam, 54) +
        '<div class="cs-bw-name">' + _e(winTeam.name) + '</div>' +
        '<div class="cs-bw-crown">🏆</div>' +
        '</div></div></div></div>';
    }

    return '<div class="cs-bracket-wrap"><div class="cs-bracket">' + cols + '</div></div>';
  }

  function _htmlSEMatch(m, isCreator) {
    var t1    = m.team1Id ? (_teams[m.team1Id] || null) : null;
    var t2    = m.team2Id ? (_teams[m.team2Id] || null) : null;
    var done  = !!(m.winnerId);
    var t1Win = done && m.winnerId === m.team1Id;
    var t2Win = done && m.winnerId === m.team2Id;

    var s1Html = _slotHtml(t1, m.score1, t1Win, done);
    var s2Html = _slotHtml(t2, m.score2, t2Win, done);

    var liveBadge = m.status === 'live' ? '<div class="cs-br-live">LIVE</div>' : '';
    var editBtn   = '';
    if (isCreator && t1 && t2 && !done) {
      editBtn = '<button class="cs-br-edit" onclick="window._csMatchEdit(\'' + m.id + '\')">Ввести счёт</button>';
    } else if (isCreator && done) {
      editBtn = '<button class="cs-br-edit cs-br-undo" onclick="window._csUndoMatch(\'' + m.id + '\')">↩ Отменить</button>';
    }

    return '<div class="cs-br-match">' + liveBadge + s1Html +
      '<div class="cs-br-vs">vs</div>' + s2Html + editBtn + '</div>';
  }

  function _slotHtml(team, score, isWin, showScore) {
    var cls = 'cs-br-team' + (isWin ? ' win' : '') + (!team ? ' tbd' : '');
    var logoHtml = team
      ? '<div class="cs-br-logo-wrap" onclick="window._csTeamPopup(\'' + team.id + '\')">' + _logoEl(team, 26) + '</div>'
      : '<div class="cs-br-logo-wrap"><div class="cs-logo-ph" style="width:26px;height:26px;font-size:11px">?</div></div>';
    var nameHtml = team
      ? '<span class="cs-br-tname" onclick="window._csTeamPopup(\'' + team.id + '\')">' + _e(team.name) + '</span>'
      : '<span class="cs-br-tname tbd">TBD</span>';
    var scoreHtml = showScore
      ? '<span class="cs-br-score' + (isWin ? ' win' : '') + '">' + (score || 0) + '</span>' : '';
    return '<div class="' + cls + '">' + logoHtml + nameHtml + scoreHtml + '</div>';
  }

  /* ── Group Stage ── */
  function _renderGroupBracket(matchArr) {
    var groups = {};
    matchArr.forEach(function (m) {
      var g = m.group || 'A';
      if (!groups[g]) groups[g] = [];
      groups[g].push(m);
    });

    var isCreator = _uid() && _currentT && _currentT.createdBy === _uid();
    var html = '';

    Object.keys(groups).sort().forEach(function (g) {
      var gm = groups[g];
      var standings = _groupStandings(gm);
      var maxWins = 0;
      if (standings.length) maxWins = standings[0].wins;

      var standHtml = '<table class="cs-grp-table"><thead><tr>' +
        '<th>#</th><th>Команда</th><th>В</th><th>П</th></tr></thead><tbody>' +
        standings.map(function (row, i) {
          var team = _teams[row.teamId];
          var qualified = i < 2; // top 2 advance
          return '<tr class="' + (qualified ? 'cs-qualified' : '') + '">' +
            '<td>' + (i + 1) + '</td>' +
            '<td>' + (team ? _e(team.name) : '—') + '</td>' +
            '<td>' + row.wins + '</td>' +
            '<td>' + row.losses + '</td>' +
            '</tr>';
        }).join('') + '</tbody></table>';

      var mHtml = gm.map(function (m) { return _htmlSEMatch(m, isCreator); }).join('');

      html += '<div class="cs-grp-block">' +
        '<div class="cs-grp-hdr">Группа ' + g + '</div>' +
        '<div class="cs-grp-content">' +
        '<div class="cs-grp-stand">' + standHtml + '</div>' +
        '<div class="cs-grp-matches">' + mHtml + '</div>' +
        '</div></div>';
    });

    return '<div class="cs-groups-wrap">' + html + '</div>';
  }

  function _groupStandings(matches) {
    var stats = {};
    matches.forEach(function (m) {
      [m.team1Id, m.team2Id].forEach(function (id) {
        if (id && !stats[id]) stats[id] = { teamId: id, wins: 0, losses: 0 };
      });
      if (m.winnerId) {
        if (stats[m.winnerId]) stats[m.winnerId].wins++;
        var loserId = m.winnerId === m.team1Id ? m.team2Id : m.team1Id;
        if (loserId && stats[loserId]) stats[loserId].losses++;
      }
    });
    return Object.values(stats).sort(function (a, b) {
      return b.wins - a.wins || a.losses - b.losses;
    });
  }

  /* ── Start tournament ── */
  window._csStart = function () {
    var t = _currentT; if (!t) return;
    var db = _db(); if (!db) return;
    var teamArr = _teamsSorted();
    if (teamArr.length < 2) { alert('Добавьте хотя бы 2 команды'); return; }

    if (t.format === 'single_elim' || t.format === 'double_elim') {
      _generateSE(teamArr, db);
    } else if (t.format === 'group_elim') {
      _generateGroups(teamArr, db);
    } else {
      alert('Формат "' + (FORMAT_LABELS[t.format] || t.format) + '" — генерация скоро. Пока используйте Single Elimination или Группы + Плей-офф');
    }
  };

  /* ── Generate Single Elimination ── */
  function _seedPairs(n) {
    var seeds = [1, 2];
    var rounds = Math.log2(n);
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

  function _pow2(n) { var p = 1; while (p < n) p *= 2; return p; }

  function _generateSE(teamArr, db) {
    var n      = _pow2(teamArr.length);
    var pairs  = _seedPairs(n);
    var totRnd = Math.log2(n);
    var batch  = db.batch();
    var mRef   = db.collection('tournaments').doc(_currentTId).collection('matches');

    var seedMap = {};
    teamArr.forEach(function (t, i) { seedMap[i + 1] = t.id; });

    // Pre-build all match IDs so we can resolve nextMatchId links
    // Also compute round-1 bye info in the same batch
    var pairIdx  = 0;
    var r2Updates = {}; // nextMatchId → {field: winnerId} for byes

    for (var round = 1; round <= totRnd; round++) {
      var cnt   = n / Math.pow(2, round);
      for (var mn = 1; mn <= cnt; mn++) {
        var mId   = 'r' + round + 'm' + mn;
        var nRnd  = round + 1;
        var nMn   = Math.ceil(mn / 2);
        var nId   = nRnd <= totRnd ? 'r' + nRnd + 'm' + nMn : null;
        var nSlot = mn % 2 === 1 ? 1 : 2;

        var t1Id = null, t2Id = null;
        if (round === 1) {
          var pair = pairs[pairIdx] || [];
          t1Id = seedMap[pair[0]] || null;
          t2Id = seedMap[pair[1]] || null;
          pairIdx++;
        }

        // Detect bye: one team present, other missing — resolve immediately in batch
        var byeWinnerId = null;
        if (round === 1 && t1Id && !t2Id) byeWinnerId = t1Id;
        if (round === 1 && !t1Id && t2Id) byeWinnerId = t2Id;

        var matchData = {
          round: round, matchNum: mn, phase: 'bracket',
          team1Id: t1Id, team2Id: t2Id,
          score1: byeWinnerId ? (t1Id ? 1 : 0) : 0,
          score2: byeWinnerId ? (t2Id ? 1 : 0) : 0,
          winnerId: byeWinnerId, status: byeWinnerId ? 'completed' : 'upcoming',
          nextMatchId: nId, nextMatchSlot: nSlot, bo: _currentT.bo || 3
        };
        batch.set(mRef.doc(mId), matchData);

        // If bye, prefill next round slot in same batch
        if (byeWinnerId && nId) {
          if (!r2Updates[nId]) r2Updates[nId] = {};
          r2Updates[nId][nSlot === 1 ? 'team1Id' : 'team2Id'] = byeWinnerId;
        }
      }
    }

    // Apply prefill updates for round-2 slots from byes
    Object.keys(r2Updates).forEach(function (matchId) {
      batch.update(mRef.doc(matchId), r2Updates[matchId]);
    });

    batch.update(db.collection('tournaments').doc(_currentTId), { status: 'active' });
    batch.commit().then(function () {
      _currentT.status = 'active'; _bracketTab = 'bracket'; _render();
    }).catch(function (e) { alert('Ошибка старта: ' + e.message); });
  }

  /* ── Generate Group Stage (Round Robin) ── */
  function _generateGroups(teamArr, db) {
    var numGroups = teamArr.length <= 8 ? 2 : teamArr.length <= 16 ? 4 : 8;
    var labels    = 'ABCDEFGH';
    var groups    = {};
    for (var i = 0; i < numGroups; i++) groups[labels[i]] = [];
    teamArr.forEach(function (t, i) { groups[labels[i % numGroups]].push(t); });

    var batch  = db.batch();
    var mRef   = db.collection('tournaments').doc(_currentTId).collection('matches');
    var mNum   = 1;

    Object.keys(groups).forEach(function (g) {
      var gt = groups[g];
      for (var a = 0; a < gt.length; a++) {
        for (var b = a + 1; b < gt.length; b++) {
          batch.set(mRef.doc('g' + g + 'm' + mNum), {
            phase: 'group', group: g, round: 1, matchNum: mNum,
            team1Id: gt[a].id, team2Id: gt[b].id,
            score1: 0, score2: 0, winnerId: null, status: 'upcoming', bo: _currentT.bo || 3
          });
          mNum++;
        }
      }
    });

    var gConfig = {};
    Object.keys(groups).forEach(function (g) {
      gConfig[g] = groups[g].map(function (t) { return t.id; });
    });

    batch.update(db.collection('tournaments').doc(_currentTId), {
      status: 'active',
      groupConfig: JSON.stringify(gConfig)
    });

    batch.commit().then(function () {
      _currentT.status = 'active'; _bracketTab = 'bracket'; _render();
    }).catch(function (e) { alert('Ошибка старта: ' + e.message); });
  }

  /* ── Match result recording ── */
  window._csMatchEdit = function (matchId) {
    var m  = _matches[matchId]; if (!m) return;
    var t1 = m.team1Id ? (_teams[m.team1Id] || null) : null;
    var t2 = m.team2Id ? (_teams[m.team2Id] || null) : null;
    var bo = m.bo || (_currentT && _currentT.bo) || 3;
    var max = Math.ceil(bo / 2);

    _removePopup('csMatchPopup');
    var overlay = document.createElement('div');
    overlay.id  = 'csMatchPopup';
    overlay.className = 'cs-popup-overlay';
    overlay.innerHTML = '<div class="cs-popup">' +
      '<div class="cs-popup-title">Счёт матча <span class="cs-popup-bo">BO' + bo + '</span></div>' +
      '<div class="cs-me-row">' +
      '<span class="cs-me-team">' + _e(t1 ? t1.name : 'TBD') + '</span>' +
      '<input type="number" class="cs-me-inp" id="csMeS1" min="0" max="' + max + '" value="' + (m.score1 || 0) + '">' +
      '<span class="cs-me-sep">:</span>' +
      '<input type="number" class="cs-me-inp" id="csMeS2" min="0" max="' + max + '" value="' + (m.score2 || 0) + '">' +
      '<span class="cs-me-team">' + _e(t2 ? t2.name : 'TBD') + '</span>' +
      '</div>' +
      '<div class="cs-popup-note">Максимум ' + max + ' побед в BO' + bo + '</div>' +
      '<div class="cs-popup-acts">' +
      '<button class="cs-btn cs-btn-sec" onclick="window._csRemovePopup(\'csMatchPopup\')">Отмена</button>' +
      '<button class="cs-btn cs-btn-pri" onclick="window._csSaveResult(\'' + matchId + '\')">Сохранить</button>' +
      '</div></div>';
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
    var mask = document.getElementById('cybersportMask');
    if (mask) mask.appendChild(overlay);
  };

  window._csSaveResult = function (matchId) {
    var db = _db(); if (!db) return;
    var m  = _matches[matchId]; if (!m) return;
    var bo  = m.bo || (_currentT && _currentT.bo) || 3;
    var max = Math.ceil(bo / 2);
    var s1  = parseInt((_q('#csMeS1') || {}).value || '0');
    var s2  = parseInt((_q('#csMeS2') || {}).value || '0');

    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0 || s1 > max || s2 > max) {
      alert('Некорректный счёт для BO' + bo + ' (максимум ' + max + ')'); return;
    }
    if (s1 === s2) { alert('Не может быть ничья в BO' + bo); return; }
    if (s1 !== max && s2 !== max) {
      alert('Один из счётов должен быть ' + max + ' (BO' + bo + ')'); return;
    }

    var winnerId = s1 > s2 ? m.team1Id : m.team2Id;
    var batch    = db.batch();
    var mRef     = db.collection('tournaments').doc(_currentTId).collection('matches').doc(matchId);
    batch.update(mRef, { score1: s1, score2: s2, winnerId: winnerId, status: 'completed' });

    if (m.nextMatchId) {
      var nRef  = db.collection('tournaments').doc(_currentTId).collection('matches').doc(m.nextMatchId);
      var field = m.nextMatchSlot === 1 ? 'team1Id' : 'team2Id';
      var upd   = {}; upd[field] = winnerId;
      batch.update(nRef, upd);
    }

    batch.commit().then(function () {
      _removePopup('csMatchPopup');
      _checkComplete();
    }).catch(function (e) { alert('Ошибка: ' + e.message); });
  };

  window._csUndoMatch = function (matchId) {
    if (!confirm('Отменить результат этого матча?')) return;
    var db = _db(); if (!db) return;
    var m  = _matches[matchId]; if (!m) return;
    var batch = db.batch();
    var mRef  = db.collection('tournaments').doc(_currentTId).collection('matches').doc(matchId);
    batch.update(mRef, { score1: 0, score2: 0, winnerId: null, status: 'upcoming' });
    if (m.nextMatchId) {
      var nRef  = db.collection('tournaments').doc(_currentTId).collection('matches').doc(m.nextMatchId);
      var field = m.nextMatchSlot === 1 ? 'team1Id' : 'team2Id';
      var upd   = {}; upd[field] = null;
      batch.update(nRef, upd);
    }
    batch.commit().catch(function (e) { alert('Ошибка: ' + e.message); });
  };

  function _checkComplete() {
    var all = Object.values(_matches).every(function (m) { return !!m.winnerId; });
    if (!all) return;
    var db = _db(); if (!db) return;
    db.collection('tournaments').doc(_currentTId).update({ status: 'completed' })
      .then(function () { if (_currentT) _currentT.status = 'completed'; })
      .catch(function () {});
  }

  /* ── Team popup ── */
  window._csTeamPopup = function (teamId) {
    var team = _teams[teamId]; if (!team) return;
    _removePopup('csTeamPopup');

    var players = (team.players || []).filter(function (p) { return p.nick; }).map(function (p) {
      var lbl = ROLES[p.role] || p.role;
      return '<div class="cs-tp-row">' +
        '<span class="cs-rl-ico">' + lbl.split(' ')[0] + '</span>' +
        '<span class="cs-tp-nick">' + _e(p.nick) + '</span>' +
        '<span class="cs-tp-role">' + lbl.split(' ').slice(1).join(' ') + '</span>' +
        '</div>';
    }).join('');

    var overlay = document.createElement('div');
    overlay.id  = 'csTeamPopup';
    overlay.className = 'cs-popup-overlay';
    overlay.innerHTML = '<div class="cs-popup">' +
      '<div class="cs-tp-hdr">' +
      _logoEl(team, 42) +
      '<div class="cs-tp-info"><div class="cs-tp-name">' + _e(team.name) + '</div>' +
      '<div class="cs-tp-seed">Seed #' + (team.seed || '?') + '</div></div>' +
      '<button class="cs-btn-ico" onclick="window._csRemovePopup(\'csTeamPopup\')">✕</button>' +
      '</div>' +
      (players ? '<div class="cs-tp-players">' + players + '</div>' :
        '<div class="cs-tp-empty">Состав не указан</div>') +
      '</div>';
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
    var mask = document.getElementById('cybersportMask');
    if (mask) mask.appendChild(overlay);
  };

  window._csRemovePopup = function (id) { _removePopup(id); };

  /* ══════════════════════════════════════════════════════════
     SCHEDULE TAB
  ══════════════════════════════════════════════════════════ */
  function _htmlSchedule() {
    var matchArr = Object.values(_matches);
    if (!matchArr.length) return '<div class="cs-empty">Расписание появится после запуска</div>';

    var isCreator = _uid() && _currentT && _currentT.createdBy === _uid();
    var upcoming  = matchArr.filter(function (m) { return !m.winnerId; });
    var done      = matchArr.filter(function (m) { return !!m.winnerId; });

    function _rowHtml(m) {
      var t1  = m.team1Id ? (_teams[m.team1Id] || null) : null;
      var t2  = m.team2Id ? (_teams[m.team2Id] || null) : null;
      var lbl = m.phase === 'group' ? 'Группа ' + m.group : 'Раунд ' + m.round;
      var w   = m.winnerId ? (m.winnerId === m.team1Id ? t1 : t2) : null;
      return '<div class="cs-sched-row">' +
        '<span class="cs-sched-lbl">' + lbl + '</span>' +
        '<span class="cs-sched-teams">' + (t1 ? _e(t1.name) : 'TBD') + ' vs ' + (t2 ? _e(t2.name) : 'TBD') + '</span>' +
        (w ? '<span class="cs-sched-win">▶ ' + _e(w.name) + '</span>' : '') +
        (isCreator && t1 && t2 && !m.winnerId ? '<button class="cs-sched-btn" onclick="window._csMatchEdit(\'' + m.id + '\')">Счёт</button>' : '') +
        '</div>';
    }

    var html = '';
    if (upcoming.length) html += '<div class="cs-sched-section">Предстоящие</div>' + upcoming.map(_rowHtml).join('');
    if (done.length)     html += '<div class="cs-sched-section">Завершённые</div>' + done.map(_rowHtml).join('');
    return '<div class="cs-schedule">' + html + '</div>';
  }

  /* ── Edit tournament settings ── */
  window._csTEditSettings = function () {
    var t = _currentT; if (!t) return;
    _removePopup('csTEditPopup');
    var overlay = document.createElement('div');
    overlay.id  = 'csTEditPopup';
    overlay.className = 'cs-popup-overlay';
    overlay.innerHTML = '<div class="cs-popup">' +
      '<div class="cs-popup-title">Настройки турнира</div>' +
      _field('Название', '<input class="cs-input" id="csTeName" value="' + _e(t.name || '') + '">') +
      _field('Призовой фонд', '<input class="cs-input" id="csTePrize" value="' + _e(t.prizePool || '') + '">') +
      '<div class="cs-popup-acts">' +
      '<button class="cs-btn cs-btn-sec" onclick="window._csRemovePopup(\'csTEditPopup\')">Отмена</button>' +
      '<button class="cs-btn cs-btn-pri" onclick="window._csSaveTSettings()">Сохранить</button>' +
      '</div></div>';
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
    var mask = document.getElementById('cybersportMask');
    if (mask) mask.appendChild(overlay);
  };

  window._csSaveTSettings = function () {
    var db = _db(); if (!db) return;
    var name  = (_q('#csTeName') || {}).value || '';
    var prize = (_q('#csTePrize') || {}).value || '';
    if (!name.trim()) { alert('Введите название'); return; }
    db.collection('tournaments').doc(_currentTId).update({ name: name.trim(), prizePool: prize.trim() })
      .then(function () {
        if (_currentT) { _currentT.name = name.trim(); _currentT.prizePool = prize.trim(); }
        _removePopup('csTEditPopup'); _render();
      }).catch(function (e) { alert('Ошибка: ' + e.message); });
  };

  /* ══════════════════════════════════════════════════════════
     UTILS
  ══════════════════════════════════════════════════════════ */
  function _e(s)  { if (!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function _ea(s) { return _e(s); }
  function _q(sel) { return document.querySelector(sel); }

  function _field(label, inputHtml) {
    return '<div class="cs-field"><label class="cs-label">' + label + '</label>' + inputHtml + '</div>';
  }

  function _teamsSorted() {
    return Object.values(_teams).sort(function (a, b) { return (a.seed || 0) - (b.seed || 0); });
  }

  function _logoEl(team, size) {
    if (team.logoUrl) {
      return '<img class="cs-logo-img" src="' + _ea(team.logoUrl) + '" style="width:' + size + 'px;height:' + size + 'px">';
    }
    return '<div class="cs-logo-ph" style="width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * 0.45) + 'px">' +
      (team.name ? team.name[0].toUpperCase() : '?') + '</div>';
  }

  function _collectPlayers() {
    var players = [];
    document.querySelectorAll('[data-pi]').forEach(function (inp, i) {
      players.push({ nick: inp.value.trim(), role: ROLE_KEYS[i] || 'top' });
    });
    return players;
  }

  function _removePopup(id) {
    var el = document.getElementById(id);
    if (el) el.remove();
  }

})();
