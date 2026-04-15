/* ═══════════════════════════════════════════
   DRAFT COOP — кооперативный драфт (серии между капитанами)
   Firestore: /draftLobbies/{id}, /draftLobbies/{id}/games/{gameN}
   Этап 1: каркас + вкладки
   Этап 2: создание лобби + waiting room + приглашения
   ═══════════════════════════════════════════ */
(function(){
  'use strict';

  var db = null;
  var _unsubMyLobbies = null;
  var _unsubLobby = null;
  var _currentTab = 'my'; // 'my' | 'create' | 'lobby'
  var _currentLobbyId = null;
  var _currentLobby = null;

  function _db() {
    if (db) return db;
    if (typeof firebase === 'undefined' || !firebase.firestore) return null;
    db = firebase.firestore();
    return db;
  }

  function _uid() {
    try { return firebase.auth().currentUser && firebase.auth().currentUser.uid; } catch(e) { return null; }
  }

  function _user() {
    try { return firebase.auth().currentUser; } catch(e) { return null; }
  }

  function _myNick() {
    var u = _user();
    return (u && u.displayName) || (u && u.email) || 'anon';
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function toast(msg) {
    if (window.showToast) window.showToast(msg);
    else alert(msg);
  }

  // ─── TAB SWITCHING ───
  function switchTab(tab) {
    _currentTab = tab;
    var tabMy = document.getElementById('dcoopTabMy');
    var tabCreate = document.getElementById('dcoopTabCreate');
    var paneMy = document.getElementById('dcoopPaneMy');
    var paneCreate = document.getElementById('dcoopPaneCreate');
    var paneLobby = document.getElementById('dcoopPaneLobby');
    var authGate = document.getElementById('dcoopAuthGate');
    var tabsRow = document.querySelector('#draftCoopMask .dcoop-tabs');

    if (tabMy) tabMy.classList.toggle('active', tab === 'my');
    if (tabCreate) tabCreate.classList.toggle('active', tab === 'create');

    if (paneMy) paneMy.style.display = (tab === 'my') ? '' : 'none';
    if (paneCreate) paneCreate.style.display = (tab === 'create') ? '' : 'none';
    if (paneLobby) paneLobby.style.display = (tab === 'lobby') ? '' : 'none';
    if (authGate) authGate.style.display = 'none';
    if (tabsRow) tabsRow.style.display = (tab === 'lobby') ? 'none' : '';

    if (tab === 'my') startMyLobbiesListener();
    else stopMyLobbiesListener();

    if (tab !== 'lobby') {
      stopLobbyListener();
      stopGameListener();
      document.body.classList.remove('dcoop-fullscreen');
    var _aPanel = document.getElementById('dcoopAssistPanel'); if (_aPanel) _aPanel.parentNode.removeChild(_aPanel);
    }
  }

  // ─── AUTH GATE ───
  function showAuthGate() {
    ['dcoopPaneMy','dcoopPaneCreate','dcoopPaneLobby'].forEach(function(id){
      var el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    var tabsRow = document.querySelector('#draftCoopMask .dcoop-tabs');
    if (tabsRow) tabsRow.style.display = 'none';
    var gate = document.getElementById('dcoopAuthGate');
    if (gate) gate.style.display = '';
  }

  // ─── MY LOBBIES LISTENER ───
  function stopMyLobbiesListener() {
    if (_unsubMyLobbies) { try { _unsubMyLobbies(); } catch(e){} _unsubMyLobbies = null; }
  }

  function startMyLobbiesListener() {
    stopMyLobbiesListener();
    var uid = _uid();
    var dbInst = _db();
    if (!uid || !dbInst) return;

    var buckets = { created: [], blue: [], red: [], spec: [] };
    var unsubs = [];

    function render() {
      var all = [].concat(buckets.created, buckets.blue, buckets.red, buckets.spec);
      var seen = {};
      var unique = [];
      all.forEach(function(l){ if (!seen[l.id]) { seen[l.id] = 1; unique.push(l); } });
      unique.sort(function(a,b){
        var ta = (a.createdAt && a.createdAt.toMillis && a.createdAt.toMillis()) || 0;
        var tb = (b.createdAt && b.createdAt.toMillis && b.createdAt.toMillis()) || 0;
        return tb - ta;
      });
      renderMyLobbies(unique);
    }

    function sub(key, query) {
      var u = query.onSnapshot(function(snap){
        buckets[key] = snap.docs.map(function(d){ var x = d.data(); x.id = d.id; return x; });
        render();
      }, function(err){ console.warn('[draft] listener '+key+' error', err); });
      unsubs.push(u);
    }

    sub('created', dbInst.collection('draftLobbies').where('createdBy','==',uid));
    sub('blue',    dbInst.collection('draftLobbies').where('blueCaptain.uid','==',uid));
    sub('red',     dbInst.collection('draftLobbies').where('redCaptain.uid','==',uid));
    sub('spec',    dbInst.collection('draftLobbies').where('invitedSpectators','array-contains',uid));

    _unsubMyLobbies = function(){ unsubs.forEach(function(u){ try{u();}catch(e){} }); };
  }

  function renderMyLobbies(lobbies) {
    var activeList = document.getElementById('dcoopMyActiveList');
    var histList = document.getElementById('dcoopMyHistoryList');
    if (!activeList || !histList) return;

    var active = [], history = [];
    lobbies.forEach(function(l){
      if (l.status === 'series_done' || l.status === 'closed') history.push(l);
      else active.push(l);
    });

    activeList.innerHTML = active.length
      ? active.map(lobbyCardHtml).join('')
      : '<div class="dcoop-empty">Нет активных лобби</div>';
    histList.innerHTML = history.length
      ? history.map(lobbyCardHtml).join('')
      : '<div class="dcoop-empty">История пуста</div>';

    [activeList, histList].forEach(function(container){
      container.querySelectorAll('[data-lobby-id]').forEach(function(el){
        el.onclick = function(){ openLobby(el.getAttribute('data-lobby-id')); };
      });
    });
  }

  function lobbyCardHtml(l) {
    var statusMap = {
      waiting: ['dcoop-status-waiting','Ожидание'],
      ready_check: ['dcoop-status-waiting','Готовность'],
      drafting: ['dcoop-status-drafting','Идёт драфт'],
      paused: ['dcoop-status-waiting','Пауза'],
      finished_game: ['dcoop-status-drafting','Между играми'],
      series_done: ['dcoop-status-done','Завершено'],
      closed: ['dcoop-status-done','Закрыто']
    };
    var s = statusMap[l.status] || ['dcoop-status-waiting', l.status || '?'];
    var blue = escapeHtml(l.blueTeamName || 'Blue');
    var red  = escapeHtml(l.redTeamName  || 'Red');
    var mode = l.mode === 'fearless' ? 'Fearless' : 'Normal';
    var series = (l.seriesType || 'bo1').toUpperCase();
    var date = '';
    if (l.createdAt && l.createdAt.toDate) {
      var d = l.createdAt.toDate();
      date = d.toLocaleDateString('ru-RU') + ' ' + d.toTimeString().slice(0,5);
    }
    var scoreBlue = (l.seriesScore && l.seriesScore.blue) || 0;
    var scoreRed  = (l.seriesScore && l.seriesScore.red)  || 0;
    var done = (l.status === 'series_done' || l.status === 'closed');
    var scoreHtml = done
      ? '<div class="dcoop-lc-score"><span class="dcoop-lc-s-b">'+scoreBlue+'</span><span class="dcoop-lc-s-sep">:</span><span class="dcoop-lc-s-r">'+scoreRed+'</span></div>'
      : '';
    return ''
      + '<div class="dcoop-lobby-card" data-lobby-id="'+l.id+'">'
      +   '<div class="dcoop-lc-main">'
      +     '<div class="dcoop-lc-teams">'
      +       '<span class="dcoop-lc-team-b">'+blue+'</span>'
      +       '<span class="dcoop-lc-vs">vs</span>'
      +       '<span class="dcoop-lc-team-r">'+red+'</span>'
      +     '</div>'
      +     '<div class="dcoop-lc-meta">'+mode+' · '+series+(date?' · '+date:'')+'</div>'
      +   '</div>'
      +   scoreHtml
      +   '<div class="dcoop-lc-status '+s[0]+'">'+s[1]+'</div>'
      + '</div>';
  }

  // ─── CREATE LOBBY ───
  function createLobby() {
    var uid = _uid();
    var user = _user();
    var dbInst = _db();
    if (!uid || !user) { toast('Нужен вход'); return; }
    if (!dbInst) { toast('Firestore недоступен'); return; }

    var mode = document.querySelector('input[name=dcoopMode]:checked').value;
    var seriesType = document.getElementById('dcoopSeries').value;
    var timerSeconds = parseInt(document.querySelector('input[name=dcoopTimer]:checked').value, 10);
    var mySide = document.querySelector('input[name=dcoopSide]:checked').value;
    var blueName = document.getElementById('dcoopBlueName').value.trim() || 'Blue Team';
    var redName  = document.getElementById('dcoopRedName').value.trim()  || 'Red Team';
    var bluePlayers = Array.from(document.querySelectorAll('.dcoop-player-blue'))
      .map(function(i){ return i.value.trim(); }).filter(Boolean);
    var redPlayers = Array.from(document.querySelectorAll('.dcoop-player-red'))
      .map(function(i){ return i.value.trim(); }).filter(Boolean);

    if (seriesType === 'infinite' && mode !== 'fearless') {
      toast('Бесконечная серия только в Fearless');
      return;
    }

    var me = { uid: uid, nick: _myNick() };
    var lobby = {
      createdBy: uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      mode: mode,
      seriesType: seriesType,
      timerSeconds: timerSeconds,
      blueCaptain: mySide === 'blue' ? me : { uid: '', nick: '' },
      redCaptain:  mySide === 'red'  ? me : null,
      blueTeamName: blueName,
      redTeamName: redName,
      bluePlayers: bluePlayers,
      redPlayers: redPlayers,
      invitedSpectators: [],
      spectatorNicks: {},
      spectators: [],
      status: 'waiting',
      currentGame: 1,
      blueReady: false,
      redReady: false,
      pausedAt: null,
      pausedBy: null,
      shareToken: Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10),
      seriesScore: { blue: 0, red: 0 },
      creatorSide: mySide
    };

    dbInst.collection('draftLobbies').add(lobby).then(function(ref){
      toast('Лобби создано');
      openLobby(ref.id);
    }).catch(function(err){
      console.error('[draft] create error', err);
      toast('Ошибка создания: ' + err.message);
    });
  }

  // ─── OPEN LOBBY (подписка на документ + рендер) ───
  function stopLobbyListener() {
    if (_unsubLobby) { try { _unsubLobby(); } catch(e){} _unsubLobby = null; }
  }

  function openLobby(id) {
    _currentLobbyId = id;
    stopLobbyListener();
    switchTab('lobby');

    var dbInst = _db();
    if (!dbInst) return;
    var pane = document.getElementById('dcoopPaneLobby');
    if (pane) pane.innerHTML = '<div style="padding:30px;text-align:center;color:var(--text-faint);">Загрузка лобби…</div>';

    _unsubLobby = dbInst.collection('draftLobbies').doc(id).onSnapshot(function(snap){
      if (!snap.exists) {
        if (pane) pane.innerHTML = '<div style="padding:30px;text-align:center;color:#e74c3c;">Лобби не найдено или удалено</div>';
        return;
      }
      var l = snap.data(); l.id = snap.id;
      _currentLobby = l;
      renderLobby(l);
    }, function(err){
      console.warn('[draft] lobby listener', err);
      if (pane) pane.innerHTML = '<div style="padding:30px;text-align:center;color:#e74c3c;">Нет доступа к лобби</div>';
    });
  }

  // ─── RENDER LOBBY (router по статусу) ───
  function renderLobby(l) {
    var pane = document.getElementById('dcoopPaneLobby');
    if (!pane) return;

    if (l.status === 'waiting' || l.status === 'ready_check') {
      renderWaitingRoom(l, pane);
    } else if (l.status === 'drafting' || l.status === 'paused' || l.status === 'finished_game') {
      // Этап 3+ подставит UI драфта
      pane.innerHTML = renderWaitingRoomHtml(l)
        + '<div style="padding:20px;text-align:center;color:var(--text-faint);border-top:1px solid var(--accent-border-sub);margin-top:20px;">'
        + '⏳ UI драфта появится в Этапе 3'
        + '</div>';
      wireWaitingRoom(l);
    } else if (l.status === 'series_done' || l.status === 'closed') {
      pane.innerHTML = renderWaitingRoomHtml(l)
        + '<div style="padding:20px;text-align:center;color:var(--text-faint);">Серия завершена</div>';
      wireWaitingRoom(l);
    } else {
      pane.innerHTML = '<pre style="padding:20px;color:#fff;font-size:11px;">'+escapeHtml(JSON.stringify(l,null,2))+'</pre>';
    }
  }

  function renderWaitingRoom(l, pane) {
    pane.innerHTML = renderWaitingRoomHtml(l);
    wireWaitingRoom(l);
  }

  function renderWaitingRoomHtml(l) {
    var uid = _uid();
    var isCreator = l.createdBy === uid;
    var isBlueCap = l.blueCaptain && l.blueCaptain.uid === uid;
    var isRedCap  = l.redCaptain  && l.redCaptain.uid === uid;

    var blueNick = (l.blueCaptain && l.blueCaptain.nick) || '—';
    var redNick  = (l.redCaptain  && l.redCaptain.nick)  || '<span style="color:#f1c40f;">ждём…</span>';

    function teamPanel(side, cap, teamName, players, isReady) {
      var col = side === 'blue' ? '#5dade2' : '#e74c3c';
      var emoji = side === 'blue' ? '🔵' : '🔴';
      var readyBadge = isReady
        ? '<span style="color:#2ecc71;font-weight:900;">✓ Готов</span>'
        : '<span style="color:var(--text-faint);">—</span>';
      var capHtml = cap && cap.nick
        ? escapeHtml(cap.nick)
        : '<span style="color:#f1c40f;">ждём капитана…</span>';
      var playersHtml = (players && players.length)
        ? players.map(function(p,i){ return '<li>'+(i+1)+'. '+escapeHtml(p)+'</li>'; }).join('')
        : '<li style="color:var(--text-faint);list-style:none;">игроки не указаны</li>';
      return ''
        + '<div class="dcoop-team-panel" style="border:1px solid '+col+'33;border-radius:10px;padding:12px;background:'+col+'0a;">'
        +   '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">'
        +     '<span style="font-size:16px;">'+emoji+'</span>'
        +     '<div style="font-size:13px;font-weight:900;color:'+col+';flex:1;">'+escapeHtml(teamName)+'</div>'
        +     readyBadge
        +   '</div>'
        +   '<div style="font-size:11px;color:var(--text-faint);margin-bottom:4px;">Капитан:</div>'
        +   '<div style="font-size:12px;font-weight:700;color:#fff;margin-bottom:10px;">'+capHtml+'</div>'
        +   '<div style="font-size:11px;color:var(--text-faint);margin-bottom:4px;">Игроки:</div>'
        +   '<ul style="margin:0;padding:0 0 0 18px;font-size:12px;color:#fff;">'+playersHtml+'</ul>'
        + '</div>';
    }

    var needBlueCaptain = !l.blueCaptain || !l.blueCaptain.uid;
    var needRedCaptain  = !l.redCaptain  || !l.redCaptain.uid;
    var inviteCapBtn = '';
    if (isCreator && needBlueCaptain) {
      inviteCapBtn = '<button class="dcoop-submit" style="padding:10px;font-size:12px;margin-top:10px;" onclick="dcoopInviteCaptain(\'blue\')">➕ Пригласить капитана синих</button>';
    } else if (isCreator && needRedCaptain) {
      inviteCapBtn = '<button class="dcoop-submit" style="padding:10px;font-size:12px;margin-top:10px;" onclick="dcoopInviteCaptain(\'red\')">➕ Пригласить капитана красных</button>';
    }

    var myReady = isBlueCap ? l.blueReady : (isRedCap ? l.redReady : false);
    var canReady = (isBlueCap || isRedCap) && l.redCaptain && l.blueCaptain;
    var readyBtn = canReady
      ? '<button class="dcoop-submit" style="background:' + (myReady ? 'rgba(46,204,113,0.2);color:#2ecc71;border:2px solid #2ecc71;' : '') + '" onclick="dcoopToggleReady()">' + (myReady ? '✓ Готов (отменить)' : '✅ Готов') + '</button>'
      : '';

    var startNote = (l.blueReady && l.redReady)
      ? '<div style="padding:10px;text-align:center;color:#2ecc71;font-weight:800;">Оба готовы — начинаем…</div>'
      : (canReady ? '' : '<div style="padding:10px;text-align:center;color:var(--text-faint);font-size:11px;">Кнопка готовности появится когда оба капитана подключены</div>');

    var spectators = l.invitedSpectators || [];
    var specList = spectators.length
      ? '<ul style="margin:0;padding:0;list-style:none;font-size:12px;">' + spectators.map(function(su, idx){
          var entry = (l.spectatorNicks && l.spectatorNicks[su]) || su.slice(0,8);
          var rmBtn = isCreator ? '<button onclick="dcoopRemoveSpectator(\''+su+'\')" style="background:none;border:none;color:#e74c3c;cursor:pointer;font-size:11px;">✕</button>' : '';
          return '<li style="padding:4px 8px;border:1px solid var(--accent-border-sub);border-radius:6px;margin-bottom:4px;display:flex;align-items:center;gap:8px;"><span style="flex:1;">'+escapeHtml(entry)+'</span>'+rmBtn+'</li>';
        }).join('') + '</ul>'
      : '<div style="font-size:11px;color:var(--text-faint);padding:6px 0;">Пока никого</div>';

    var specActions = isCreator
      ? '<div style="margin-top:8px;display:flex;gap:6px;">'
        + '<button class="dcoop-submit" style="padding:8px 12px;font-size:11px;margin:0;flex:1;" onclick="dcoopInviteSpectator()">➕ Пригласить зрителя</button>'
        + '<button class="dcoop-submit" style="padding:8px 12px;font-size:11px;margin:0;flex:1;background:var(--accent-dim);color:var(--accent);" onclick="dcoopCopyInvite()">🔗 Копировать ссылку</button>'
        + '</div>'
      : '';

    var deleteBtn = isCreator
      ? '<button onclick="dcoopDeleteLobby()" style="width:100%;margin-top:14px;padding:10px;border:1px solid #e74c3c;background:rgba(231,76,60,0.1);color:#e74c3c;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer;">🗑 Удалить лобби</button>'
      : '';

    return ''
      + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">'
      +   '<button onclick="dcoopBackToList()" style="background:none;border:1px solid var(--accent-border);color:#fff;padding:6px 12px;border-radius:8px;font-size:12px;cursor:pointer;">← К списку</button>'
      +   '<div style="flex:1;font-size:14px;font-weight:900;color:#fff;">'+escapeHtml(l.blueTeamName || 'Blue')+' vs '+escapeHtml(l.redTeamName || 'Red')+'</div>'
      +   '<div style="font-size:11px;color:var(--text-faint);">'+(l.mode==='fearless'?'Fearless':'Normal')+' · '+(l.seriesType||'bo1').toUpperCase()+' · ⏱'+l.timerSeconds+'с</div>'
      + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'
      +   teamPanel('blue', l.blueCaptain, l.blueTeamName || 'Blue', l.bluePlayers, l.blueReady)
      +   teamPanel('red',  l.redCaptain,  l.redTeamName  || 'Red',  l.redPlayers,  l.redReady)
      + '</div>'
      + inviteCapBtn
      + '<div style="margin-top:14px;padding:10px 12px;border:1px solid var(--accent-border-sub);border-radius:8px;">'
      +   '<div style="font-size:11px;font-weight:800;color:var(--accent);margin-bottom:6px;">👁 ЗРИТЕЛИ ('+spectators.length+'/12)</div>'
      +   specList
      +   specActions
      + '</div>'
      + '<div style="margin-top:14px;">'+readyBtn+'</div>'
      + startNote
      + deleteBtn;
  }

  function wireWaitingRoom(l) {
    // Переход к старту драфта (только создатель, когда оба готовы)
    if (l.blueReady && l.redReady && l.status === 'waiting' && l.createdBy === _uid()) {
      // Автостарт при двойной готовности: создаём documents/games/1 и меняем status → drafting
      startDraft(l);
    }
  }

  // ─── READY / INVITE / REMOVE ───
  function toggleReady() {
    var l = _currentLobby; var uid = _uid();
    if (!l || !uid) return;
    var field = null;
    if (l.blueCaptain && l.blueCaptain.uid === uid) field = 'blueReady';
    else if (l.redCaptain && l.redCaptain.uid === uid) field = 'redReady';
    if (!field) return;
    var patch = {}; patch[field] = !l[field];
    patch.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
    _db().collection('draftLobbies').doc(l.id).update(patch)
      .catch(function(e){ toast('Ошибка: '+e.message); });
  }

  function deleteLobby() {
    var l = _currentLobby;
    if (!l) return;
    if (l.createdBy !== _uid()) { toast('Только создатель может удалить'); return; }
    if (!confirm('Удалить лобби?')) return;
    _db().collection('draftLobbies').doc(l.id).delete()
      .then(function(){ toast('Лобби удалено'); backToList(); })
      .catch(function(e){ toast('Ошибка: '+e.message); });
  }

  function backToList() {
    stopLobbyListener();
    stopGameListener();
    document.body.classList.remove('dcoop-fullscreen');
    var _aPanel = document.getElementById('dcoopAssistPanel'); if (_aPanel) _aPanel.parentNode.removeChild(_aPanel);
    _currentLobbyId = null;
    _currentLobby = null;
    switchTab('my');
  }

  function copyInviteLink() {
    var l = _currentLobby;
    if (!l) return;
    var url = window.location.origin + window.location.pathname + '?draft=' + l.id + '&t=' + l.shareToken;
    try {
      navigator.clipboard.writeText(url).then(function(){ toast('Ссылка скопирована'); });
    } catch(e) {
      prompt('Скопируйте ссылку:', url);
    }
  }

  // ─── USER SEARCH MODAL (для приглашения капитана/зрителя) ───
  var _searchMode = null; // 'captainBlue' | 'captainRed' | 'spectator'
  var _searchOverlay = null;

  var _userCache = null; // кэш списка юзеров (TTL 60s)
  var _userCacheAt = 0;

  function openUserSearch(mode) {
    _searchMode = mode;
    closeUserSearch();

    var overlay = document.createElement('div');
    overlay.id = 'dcoopSearchOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.onclick = function(e){ if (e.target === overlay) closeUserSearch(); };

    var titles = {
      captainBlue: '➕ Пригласить капитана синих',
      captainRed:  '➕ Пригласить капитана красных',
      spectator:   '➕ Пригласить зрителя'
    };
    overlay.innerHTML = ''
      + '<div style="background:var(--bg-base);border:1px solid var(--accent-border);border-radius:12px;width:100%;max-width:420px;padding:14px;display:flex;flex-direction:column;gap:10px;max-height:85vh;">'
      +   '<div style="font-size:14px;font-weight:900;color:#fff;">'+ (titles[mode] || 'Поиск юзера') +'</div>'
      +   '<input id="dcoopSearchInput" type="text" placeholder="🔍 Фильтр по нику" style="padding:9px 12px;border:1px solid var(--accent-border);background:var(--bg-primary);color:#fff;border-radius:8px;font-size:13px;outline:none;">'
      +   '<div id="dcoopSearchResults" style="overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:4px;min-height:200px;"><div style="color:var(--text-faint);font-size:11px;text-align:center;padding:20px;">Загрузка…</div></div>'
      +   '<button onclick="dcoopCloseSearch()" style="padding:8px;border:1px solid var(--accent-border);background:transparent;color:#fff;border-radius:8px;cursor:pointer;font-size:12px;">Отмена</button>'
      + '</div>';
    document.body.appendChild(overlay);
    _searchOverlay = overlay;

    var inp = document.getElementById('dcoopSearchInput');
    var timer = null;
    inp.addEventListener('input', function(){
      if (timer) clearTimeout(timer);
      timer = setTimeout(function(){ renderUserList(inp.value.trim().toLowerCase()); }, 80);
    });
    setTimeout(function(){ inp.focus(); }, 50);

    loadUserList().then(function(){ renderUserList(''); }).catch(function(e){
      var r = document.getElementById('dcoopSearchResults');
      if (r) r.innerHTML = '<div style="color:#e74c3c;font-size:11px;text-align:center;padding:20px;">Ошибка загрузки: '+escapeHtml(e.message||'')+'</div>';
    });
  }

  function loadUserList() {
    var dbInst = _db();
    if (!dbInst) return Promise.reject(new Error('no db'));
    if (_userCache && (Date.now() - _userCacheAt) < 60000) return Promise.resolve();

    return dbInst.collection('users').limit(300).get().then(function(snap){
      var me = _uid();
      var list = [];
      snap.forEach(function(d){
        var u = d.data(); u.uid = d.id;
        if (u.uid === me) return;
        // online = реальная метка + updated < 120s
        var fresh = false;
        if (u.online && u.lastSeen && u.lastSeen.toMillis) {
          fresh = (Date.now() - u.lastSeen.toMillis()) < 120000;
        } else if (u.online) {
          fresh = true; // запасной вариант если lastSeen нет
        }
        u._online = fresh;
        list.push(u);
      });
      list.sort(function(a,b){
        if (a._online !== b._online) return a._online ? -1 : 1;
        var na = (a.displayName || '').toLowerCase();
        var nb = (b.displayName || '').toLowerCase();
        return na < nb ? -1 : (na > nb ? 1 : 0);
      });
      _userCache = list;
      _userCacheAt = Date.now();
    });
  }

  function renderUserList(filter) {
    var results = document.getElementById('dcoopSearchResults');
    if (!results || !_userCache) return;
    var q = (filter || '').toLowerCase();
    var list = _userCache.filter(function(u){
      if (!q) return true;
      var n = (u.displayName || '').toLowerCase();
      return n.indexOf(q) !== -1;
    });
    if (!list.length) {
      results.innerHTML = '<div style="color:var(--text-faint);font-size:11px;text-align:center;padding:20px;">Никого не найдено</div>';
      return;
    }
    var online = list.filter(function(u){ return u._online; });
    var offline = list.filter(function(u){ return !u._online; });

    function rowHtml(u) {
      var nick = escapeHtml(u.displayName || '?');
      var dot = u._online
        ? '<span style="color:#2ecc71;font-size:10px;">● онлайн</span>'
        : '<span style="color:var(--text-faint);font-size:10px;">● оффлайн</span>';
      return ''
        + '<div onclick="dcoopPickUser(\''+u.uid+'\',\''+encodeURIComponent(u.displayName||'')+'\')" '
        +   'style="display:flex;align-items:center;gap:10px;padding:7px 10px;border:1px solid var(--accent-border-sub);border-radius:8px;cursor:pointer;background:rgba(255,255,255,0.02);">'
        +   '<div style="flex:1;min-width:0;">'
        +     '<div style="font-weight:700;color:#fff;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+nick+'</div>'
        +     '<div>'+dot+'</div>'
        +   '</div>'
        +   '<div style="font-size:14px;color:var(--accent);">→</div>'
        + '</div>';
    }

    var html = '';
    if (online.length) {
      html += '<div style="font-size:10px;color:#2ecc71;font-weight:900;letter-spacing:0.5px;margin:2px 0;">🟢 ОНЛАЙН · '+online.length+'</div>';
      html += online.map(rowHtml).join('');
    }
    if (offline.length) {
      html += '<div style="font-size:10px;color:var(--text-faint);font-weight:900;letter-spacing:0.5px;margin:10px 0 2px;">⚫ ОФФЛАЙН · '+offline.length+'</div>';
      html += offline.map(rowHtml).join('');
    }
    results.innerHTML = html;
  }

  function closeUserSearch() {
    if (_searchOverlay && _searchOverlay.parentNode) {
      _searchOverlay.parentNode.removeChild(_searchOverlay);
    }
    _searchOverlay = null;
  }

  // Клик по юзеру в списке поиска → открываем карточку профиля с кнопкой "Пригласить"
  function pickUser(uid, nickEncoded) {
    var nick = decodeURIComponent(nickEncoded || '');
    var l = _currentLobby;
    if (!l) { closeUserSearch(); return; }
    var user = null;
    if (_userCache) {
      for (var i = 0; i < _userCache.length; i++) {
        if (_userCache[i].uid === uid) { user = _userCache[i]; break; }
      }
    }
    if (!user) user = { uid: uid, displayName: nick };
    showUserInviteCard(user);
  }

  // ─── Карточка юзера для инвайта ───
  var _inviteCardOverlay = null;

  function closeInviteCard() {
    if (_inviteCardOverlay && _inviteCardOverlay.parentNode) {
      _inviteCardOverlay.parentNode.removeChild(_inviteCardOverlay);
    }
    _inviteCardOverlay = null;
  }

  function showUserInviteCard(user) {
    closeInviteCard();
    var l = _currentLobby;
    if (!l) return;
    var mode = _searchMode;

    var nick = escapeHtml(user.displayName || '?');
    var role = escapeHtml(user.role || '—');
    var rank = escapeHtml(user.rank || '—');
    var avatar = user.photoURL
      ? '<img src="'+escapeHtml(user.photoURL)+'" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid var(--accent);" onerror="this.style.display=\'none\';">'
      : '<div style="width:64px;height:64px;border-radius:50%;background:var(--accent-dim);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;color:#fff;border:2px solid var(--accent);">'+escapeHtml((user.displayName||'?').charAt(0).toUpperCase())+'</div>';

    var titles = {
      captainBlue: '➕ Пригласить капитаном СИНИХ',
      captainRed:  '➕ Пригласить капитаном КРАСНЫХ',
      spectator:   '➕ Пригласить зрителем'
    };

    var overlay = document.createElement('div');
    overlay.id = 'dcoopInviteCardOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:9100;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.onclick = function(e){ if (e.target === overlay) closeInviteCard(); };

    overlay.innerHTML = ''
      + '<div style="background:var(--bg-base);border:1px solid var(--accent-border);border-radius:14px;width:100%;max-width:360px;padding:18px;display:flex;flex-direction:column;gap:12px;align-items:center;">'
      +   '<div style="font-size:12px;color:var(--text-faint);font-weight:800;letter-spacing:0.5px;">'+ (titles[mode] || 'Приглашение') +'</div>'
      +   avatar
      +   '<div style="font-size:16px;font-weight:900;color:#fff;text-align:center;">'+nick+'</div>'
      +   '<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;font-size:11px;">'
      +     '<div style="padding:4px 10px;border:1px solid var(--accent-border-sub);border-radius:14px;"><span style="color:var(--text-faint);">Роль:</span> <strong style="color:#fff;">'+role+'</strong></div>'
      +     '<div style="padding:4px 10px;border:1px solid var(--accent-border-sub);border-radius:14px;"><span style="color:var(--text-faint);">Ранг:</span> <strong style="color:#fff;">'+rank+'</strong></div>'
      +   '</div>'
      +   '<div id="dcoopInviteCardStatus" style="min-height:20px;font-size:11px;color:var(--text-faint);text-align:center;">Проверка активных серий…</div>'
      +   '<div style="display:flex;gap:8px;width:100%;">'
      +     '<button onclick="dcoopCloseInviteCard()" style="flex:1;padding:10px;border:1px solid var(--accent-border);background:transparent;color:#fff;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;">Отмена</button>'
      +     '<button id="dcoopInviteConfirmBtn" disabled style="flex:1;padding:10px;border:none;background:var(--accent);color:#fff;border-radius:8px;cursor:pointer;font-size:12px;font-weight:900;opacity:0.5;">Пригласить</button>'
      +   '</div>'
      + '</div>';

    document.body.appendChild(overlay);
    _inviteCardOverlay = overlay;

    // Валидация: текущее лобби может отказать (уже кап, уже зритель, 12 зрителей)
    var localErr = null;
    if (mode === 'captainBlue' || mode === 'captainRed') {
      var side = mode === 'captainBlue' ? 'blue' : 'red';
      var capField = side === 'blue' ? 'blueCaptain' : 'redCaptain';
      var other = side === 'blue' ? l.redCaptain : l.blueCaptain;
      if (l[capField] && l[capField].uid) localErr = 'Капитан этой стороны уже назначен';
      else if (other && other.uid === user.uid) localErr = 'Юзер уже капитан другой стороны';
    } else if (mode === 'spectator') {
      var list = (l.invitedSpectators || []);
      if (list.indexOf(user.uid) !== -1) localErr = 'Юзер уже зритель в этом лобби';
      else if (list.length >= 12) localErr = 'Максимум 12 зрителей';
      else if (l.blueCaptain && l.blueCaptain.uid === user.uid) localErr = 'Юзер уже капитан этого лобби';
      else if (l.redCaptain && l.redCaptain.uid === user.uid) localErr = 'Юзер уже капитан этого лобби';
    }

    var statusEl = document.getElementById('dcoopInviteCardStatus');
    var btn = document.getElementById('dcoopInviteConfirmBtn');

    function setStatus(text, color, enableBtn) {
      if (statusEl) { statusEl.textContent = text; statusEl.style.color = color || 'var(--text-faint)'; }
      if (btn) {
        btn.disabled = !enableBtn;
        btn.style.opacity = enableBtn ? '1' : '0.5';
        btn.style.cursor = enableBtn ? 'pointer' : 'not-allowed';
      }
    }

    if (localErr) {
      setStatus(localErr, '#e74c3c', false);
      return;
    }

    // Удалённая проверка: юзер в другой активной серии?
    getActiveSeriesForUser(user.uid, l.id).then(function(series){
      if (series.length) {
        setStatus('Юзер уже в активной серии — приглос придёт после её завершения', '#f1c40f', false);
      } else {
        setStatus('Готов принять приглашение', '#2ecc71', true);
        if (btn) {
          btn.onclick = function(){
            btn.disabled = true; btn.style.opacity = '0.6';
            var roleArg = (mode === 'spectator') ? 'spectator' : 'captain';
            var sideArg = (mode === 'captainBlue') ? 'blue' : (mode === 'captainRed' ? 'red' : null);
            sendInvite(user.uid, user.displayName || '', roleArg, sideArg).then(function(msg){
              toast(msg || 'Приглашение отправлено');
              closeInviteCard();
              closeUserSearch();
            }).catch(function(e){
              setStatus('Ошибка: '+(e.message||e), '#e74c3c', false);
            });
          };
        }
      }
    }).catch(function(){
      setStatus('Не удалось проверить активные серии', '#f1c40f', true);
      if (btn) {
        btn.onclick = function(){
          btn.disabled = true; btn.style.opacity = '0.6';
          var roleArg = (mode === 'spectator') ? 'spectator' : 'captain';
          var sideArg = (mode === 'captainBlue') ? 'blue' : (mode === 'captainRed' ? 'red' : null);
          sendInvite(user.uid, user.displayName || '', roleArg, sideArg).then(function(msg){
            toast(msg || 'Приглашение отправлено');
            closeInviteCard();
            closeUserSearch();
          }).catch(function(e){
            setStatus('Ошибка: '+(e.message||e), '#e74c3c', false);
          });
        };
      }
    });
  }
  window.dcoopCloseInviteCard = closeInviteCard;

  // ═══════════════════════════════════════════
  // INVITE SYSTEM — draftInvites collection
  // ═══════════════════════════════════════════
  function inviteDocId(lobbyId, toUid) { return lobbyId + '__' + toUid; }

  function sendInvite(toUid, toNick, role, side) {
    var l = _currentLobby;
    if (!l) return Promise.reject(new Error('no lobby'));
    var fromUid = _uid();
    if (!fromUid) return Promise.reject(new Error('no auth'));
    var id = inviteDocId(l.id, toUid);
    var dbInst = _db();
    var ref = dbInst.collection('draftInvites').doc(id);
    return ref.get().then(function(snap){
      var prev = snap.exists ? snap.data() : {};
      if (prev.cooldownUntil && prev.cooldownUntil.toMillis && prev.cooldownUntil.toMillis() > Date.now()) {
        var mins = Math.ceil((prev.cooldownUntil.toMillis() - Date.now()) / 60000);
        return Promise.reject(new Error('Этот юзер отклонил дважды — подождите '+mins+' мин'));
      }
      if (prev.status === 'pending') {
        return Promise.reject(new Error('Приглашение уже ожидает ответа'));
      }
      return ref.set({
        toUid: toUid,
        toNick: toNick || '',
        fromUid: fromUid,
        fromNick: _myNick(),
        lobbyId: l.id,
        role: role,
        side: side || null,
        status: 'pending',
        declineCount: prev.declineCount || 0,
        cooldownUntil: prev.cooldownUntil || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }).then(function(){ return 'Приглашение отправлено'; });
    });
  }

  function acceptInvite(inviteId) {
    return _db().collection('draftInvites').doc(inviteId).update({
      status: 'accepted',
      acceptedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  function declineInvite(inviteId) {
    var ref = _db().collection('draftInvites').doc(inviteId);
    return ref.get().then(function(snap){
      if (!snap.exists) return;
      var d = snap.data();
      var newCount = (d.declineCount || 0) + 1;
      var patch = {
        status: 'declined',
        declineCount: newCount,
        declinedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (newCount >= 2) {
        patch.cooldownUntil = firebase.firestore.Timestamp.fromMillis(Date.now() + 60 * 60 * 1000);
      }
      return ref.update(patch);
    });
  }

  // ─── Listeners ───
  var _invitesListener = null;
  var _sentInvitesListener = null;
  var _shownInvites = {};

  function startInvitesListeners() {
    stopInvitesListeners();
    var uid = _uid();
    var dbInst = _db();
    if (!uid || !dbInst) return;

    // Получатель — pending invites → тост
    _invitesListener = dbInst.collection('draftInvites')
      .where('toUid','==',uid)
      .where('status','==','pending')
      .onSnapshot(function(snap){
        snap.docChanges().forEach(function(ch){
          var d = ch.doc.data(); d.id = ch.doc.id;
          if ((ch.type === 'added' || ch.type === 'modified') && !_shownInvites[d.id]) {
            _shownInvites[d.id] = 1;
            showInviteToast(d);
          }
          if (ch.type === 'removed') {
            var el = document.getElementById('dcoopInviteToast-' + d.id);
            if (el) el.remove();
            delete _shownInvites[d.id];
          }
        });
      }, function(err){ console.warn('[draft] invites listener', err); });

    // Отправитель — следим за accepted invites и финализируем
    _sentInvitesListener = dbInst.collection('draftInvites')
      .where('fromUid','==',uid)
      .where('status','==','accepted')
      .onSnapshot(function(snap){
        snap.docChanges().forEach(function(ch){
          if (ch.type !== 'added' && ch.type !== 'modified') return;
          var d = ch.doc.data(); d.id = ch.doc.id;
          finalizeAcceptedInvite(d);
        });
      }, function(err){ console.warn('[draft] sent invites listener', err); });
  }

  function stopInvitesListeners() {
    if (_invitesListener) { try { _invitesListener(); } catch(e){} _invitesListener = null; }
    if (_sentInvitesListener) { try { _sentInvitesListener(); } catch(e){} _sentInvitesListener = null; }
  }

  function finalizeAcceptedInvite(invite) {
    var dbInst = _db();
    var lobbyRef = dbInst.collection('draftLobbies').doc(invite.lobbyId);
    lobbyRef.get().then(function(snap){
      if (!snap.exists) return;
      var l = snap.data();
      var patch = { updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
      if (invite.role === 'captain') {
        var capField = invite.side === 'blue' ? 'blueCaptain' : 'redCaptain';
        if (l[capField] && l[capField].uid && l[capField].uid !== invite.toUid) return;
        patch[capField] = { uid: invite.toUid, nick: invite.toNick || '' };
      } else if (invite.role === 'spectator') {
        var list = (l.invitedSpectators || []).slice();
        if (list.indexOf(invite.toUid) === -1) list.push(invite.toUid);
        var nicks = Object.assign({}, l.spectatorNicks || {});
        nicks[invite.toUid] = invite.toNick || '';
        patch.invitedSpectators = list;
        patch.spectatorNicks = nicks;
      }
      lobbyRef.update(patch).then(function(){
        dbInst.collection('draftInvites').doc(invite.id).update({ status: 'finalized' }).catch(function(){});
      }).catch(function(e){ console.warn('[draft] finalize', e); });
    });
  }

  function showInviteToast(invite) {
    if (document.getElementById('dcoopInviteToast-' + invite.id)) return;
    // Если у меня уже активная серия (кап или принятый зритель) — не показываем тост.
    // Инвайт останется в pending и всплывёт после завершения серии (refresh страницы).
    var uid = _uid();
    getActiveSeriesForUser(uid, null).then(function(series){
      if (series.length) { console.info('[draft] invite skipped (active series):', invite.id); return; }
      _renderInviteToast(invite);
    }).catch(function(){ _renderInviteToast(invite); });
  }

  function _renderInviteToast(invite) {
    if (document.getElementById('dcoopInviteToast-' + invite.id)) return;
    var roleText = invite.role === 'captain'
      ? ('капитаном ' + (invite.side === 'blue' ? 'СИНИХ' : 'КРАСНЫХ'))
      : 'зрителем';
    var toastEl = document.createElement('div');
    toastEl.className = 'dcoop-invite-toast';
    toastEl.id = 'dcoopInviteToast-' + invite.id;
    toastEl.innerHTML = ''
      + '<div class="dcoop-invite-toast-text">'
      +   '<strong>'+escapeHtml(invite.fromNick || '?')+'</strong> приглашает вас '+roleText+' в драфт-лобби'
      + '</div>'
      + '<div class="dcoop-invite-toast-btns">'
      +   '<button class="dcoop-inv-accept" onclick="dcoopAcceptInvite(\''+invite.id+'\')">Принять</button>'
      +   '<button class="dcoop-inv-decline" onclick="dcoopDeclineInvite(\''+invite.id+'\')">Отклонить</button>'
      + '</div>';
    document.body.appendChild(toastEl);
    // Авто-скрытие через 5 минут
    setTimeout(function(){
      var el = document.getElementById('dcoopInviteToast-' + invite.id);
      if (el) el.remove();
    }, 5 * 60 * 1000);
  }

  window.dcoopAcceptInvite = function(id) {
    acceptInvite(id).then(function(){
      var el = document.getElementById('dcoopInviteToast-' + id);
      if (el) el.remove();
      toast('Приглашение принято — ждём подтверждения от создателя…');
      _db().collection('draftInvites').doc(id).get().then(function(snap){
        if (!snap.exists) return;
        var d = snap.data();
        if (window.openDraftCoop) window.openDraftCoop();
        // Ретраим открытие лобби пока не получим доступ (создатель финализирует)
        var tries = 0;
        (function tryOpen() {
          _db().collection('draftLobbies').doc(d.lobbyId).get().then(function(s){
            if (s.exists) { openLobby(d.lobbyId); return; }
          }).catch(function(){
            if (tries++ < 15) setTimeout(tryOpen, 1000);
          });
        })();
      });
    }).catch(function(e){ toast('Ошибка: '+e.message); });
  };

  window.dcoopDeclineInvite = function(id) {
    declineInvite(id).then(function(){
      var el = document.getElementById('dcoopInviteToast-' + id);
      if (el) el.remove();
      toast('Приглашение отклонено');
    }).catch(function(e){ toast('Ошибка: '+e.message); });
  };

  function removeSpectator(uid) {
    var l = _currentLobby;
    if (!l) return;
    var list = (l.invitedSpectators || []).filter(function(u){ return u !== uid; });
    var nicks = Object.assign({}, l.spectatorNicks || {});
    delete nicks[uid];
    _db().collection('draftLobbies').doc(l.id).update({
      invitedSpectators: list,
      spectatorNicks: nicks,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  // ═══════════════════════════════════════════
  // DRAFT CORE — последовательность, Lock In, таймер, hover
  // ═══════════════════════════════════════════
  var WR_DRAFT_SEQUENCE = [
    // Ban phase 1 (B-R-B-R-B-R)
    {phase:'ban1',  side:'blue', action:'ban',  banIdx:0, pickIdx:null},
    {phase:'ban1',  side:'red',  action:'ban',  banIdx:0, pickIdx:null},
    {phase:'ban1',  side:'blue', action:'ban',  banIdx:1, pickIdx:null},
    {phase:'ban1',  side:'red',  action:'ban',  banIdx:1, pickIdx:null},
    {phase:'ban1',  side:'blue', action:'ban',  banIdx:2, pickIdx:null},
    {phase:'ban1',  side:'red',  action:'ban',  banIdx:2, pickIdx:null},
    // Pick phase 1 (B1 R2 B2 R1)
    {phase:'pick1', side:'blue', action:'pick', banIdx:null, pickIdx:0},
    {phase:'pick1', side:'red',  action:'pick', banIdx:null, pickIdx:0},
    {phase:'pick1', side:'red',  action:'pick', banIdx:null, pickIdx:1},
    {phase:'pick1', side:'blue', action:'pick', banIdx:null, pickIdx:1},
    {phase:'pick1', side:'blue', action:'pick', banIdx:null, pickIdx:2},
    {phase:'pick1', side:'red',  action:'pick', banIdx:null, pickIdx:2},
    // Ban phase 2 (R-B-R-B)
    {phase:'ban2',  side:'red',  action:'ban',  banIdx:3, pickIdx:null},
    {phase:'ban2',  side:'blue', action:'ban',  banIdx:3, pickIdx:null},
    {phase:'ban2',  side:'red',  action:'ban',  banIdx:4, pickIdx:null},
    {phase:'ban2',  side:'blue', action:'ban',  banIdx:4, pickIdx:null},
    // Pick phase 2 (R1 B2 R1)
    {phase:'pick2', side:'red',  action:'pick', banIdx:null, pickIdx:3},
    {phase:'pick2', side:'blue', action:'pick', banIdx:null, pickIdx:3},
    {phase:'pick2', side:'blue', action:'pick', banIdx:null, pickIdx:4},
    {phase:'pick2', side:'red',  action:'pick', banIdx:null, pickIdx:4}
  ];
  var SEQ_LEN = WR_DRAFT_SEQUENCE.length;

  // ─── Champion gallery data ───
  function getAllChamps() {
    return (window._champsRaw || []).map(function(c){
      return { name: c.name, img: window._champIcon ? window._champIcon(c.name) : '', roles: c.is || {} };
    });
  }

  // Чемпионы, недоступные в текущем состоянии (забанены/запикнуты/fearless-lock)
  function getUnavailable(game, fearlessLock) {
    var set = {};
    (game.bans.blue || []).forEach(function(n){ if (n) set[n] = 'banned'; });
    (game.bans.red  || []).forEach(function(n){ if (n) set[n] = 'banned'; });
    (game.picks.blue || []).forEach(function(p){ if (p && p.champ) set[p.champ] = 'picked'; });
    (game.picks.red  || []).forEach(function(p){ if (p && p.champ) set[p.champ] = 'picked'; });
    (fearlessLock || []).forEach(function(n){ if (!set[n]) set[n] = 'fearless'; });
    return set;
  }

  // ─── Game state listener ───
  var _unsubGame = null;
  var _currentGame = null;
  var _timerInterval = null;
  var _hoverLocal = null; // локальное значение hover (для throttle)
  var _hoverWriteTimer = null;

  function stopGameListener() {
    if (_unsubGame) { try { _unsubGame(); } catch(e){} _unsubGame = null; }
    if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
  }

  function listenToCurrentGame(lobby) {
    stopGameListener();
    var dbInst = _db();
    if (!dbInst || !lobby) return;
    var gameId = String(lobby.currentGame || 1);
    _unsubGame = dbInst.collection('draftLobbies').doc(lobby.id)
      .collection('games').doc(gameId)
      .onSnapshot(function(snap){
        if (!snap.exists) return;
        var g = snap.data(); g.id = snap.id;
        _currentGame = g;
        renderDraftUi(lobby, g);
      }, function(err){ console.warn('[draft] game listener', err); });
  }

  // ─── DRAFT UI RENDER ───
  function renderDraftUi(lobby, game) {
    var pane = document.getElementById('dcoopPaneLobby');
    if (!pane) return;

    // Активируем fullscreen режим для лобби: срываем PC side-panel режим,
    // закрываем сайдбар, убираем side-panel-modal позиционирование.
    document.body.classList.remove('pc-side-mode');
    document.body.classList.remove('pc-chat-mode');
    var _mask = document.getElementById('draftCoopMask');
    if (_mask) _mask.classList.remove('side-panel-modal');
    var _panel = document.getElementById('sidePanel');
    if (_panel) _panel.classList.remove('open');
    var _sover = document.getElementById('sideOverlay');
    if (_sover) _sover.classList.remove('open');
    document.body.classList.remove('sidebar-open');
    document.body.classList.add('dcoop-fullscreen');

    var uid = _uid();
    var roles = sideRoles(lobby, game);
    var mySide = null;
    if (roles.blue.cap && roles.blue.cap.uid === uid) mySide = 'blue';
    else if (roles.red.cap && roles.red.cap.uid === uid) mySide = 'red';
    var iAmCaptain = !!mySide;
    var isCreator = lobby.createdBy === uid;

    var step = WR_DRAFT_SEQUENCE[game.turnIndex] || null;
    var myTurn = iAmCaptain && step && step.side === mySide && game.phase !== 'done';
    var fearlessLock = lobby.mode === 'fearless' ? (lobby.usedChampions || []) : [];
    var unavail = getUnavailable(game, fearlessLock);

    // Если hover невалиден (ход ушёл / чемп недоступен) — сбрасываем локально
    if (_hoverLocal && (!myTurn || unavail[_hoverLocal])) _hoverLocal = null;

    var isMob = isMobileDraft();
    pane.innerHTML = ''
      + draftHeaderHtml(lobby, game, step, mySide, isCreator)
      + (isMob ? pastGamesHtml(lobby, game) : '')
      + '<div class="dcoop-draft-layout">'
      +   sidePanelHtml('blue', lobby, game, step)
      +   '<div class="dcoop-gallery-col">'
      +     gallerySearchHtml()
      +     '<div id="dcoopGallery" class="dcoop-gallery"></div>'
      +     lockInBtnHtml(myTurn, game, step)
      +   '</div>'
      +   sidePanelHtml('red', lobby, game, step)
      + '</div>'
      + (isMob ? '' : pastGamesHtml(lobby, game));

    // Render gallery
    renderGallery(lobby, game, step, mySide, unavail);

    // Restore LockIn button state after re-render (fix "двойной клик")
    if (_hoverLocal && myTurn) {
      var lockBtn = document.getElementById('dcoopLockIn');
      if (lockBtn) lockBtn.disabled = false;
    }

    // Start timer
    startTimer(lobby, game, step, mySide);

    // Refresh assist panel if on
    if (_draftAssistantOn) renderAssistPanel();

    if (game.phase === 'done' || game.turnIndex >= SEQ_LEN) {
      if (lobby.status === 'series_done' || lobby.status === 'closed') {
        renderSeriesDone(lobby, pane);
        return;
      }
      renderBottomBar(lobby, game);
    } else {
      // Удаляем bottom bar если драфт ещё идёт (на случай перехода между играми)
      var bb = document.getElementById('dcoopBottomBar');
      if (bb) bb.remove();
    }
  }

  // ─── Bottom bar: выбор победителя / управление серией (не закрывает драфт) ───
  function renderBottomBar(lobby, game) {
    var pane = document.getElementById('dcoopPaneLobby');
    if (!pane) return;
    var old = document.getElementById('dcoopBottomBar');
    if (old) old.remove();

    var uid = _uid();
    var isCreator = lobby.createdBy === uid;
    // Мой «лагерь» — я капитан какой КОМАНДЫ (blue/red) в лобби
    var myCampTeam = null;
    if (lobby.blueCaptain && lobby.blueCaptain.uid === uid) myCampTeam = 'blue';
    else if (lobby.redCaptain && lobby.redCaptain.uid === uid) myCampTeam = 'red';

    var roles = sideRoles(lobby, game);
    var bar = document.createElement('div');
    bar.id = 'dcoopBottomBar';
    bar.className = 'dcoop-bottom-bar';

    // Команды: имя берём из исходного лобби (не зависит от позиции)
    var blueTeamName = escapeHtml(lobby.blueTeamName || 'Blue');
    var redTeamName  = escapeHtml(lobby.redTeamName  || 'Red');
    var score = lobby.seriesScore || {};
    var bScore = score.blue || 0;
    var rScore = score.red  || 0;
    var scoreHtml = '<div class="dcoop-bb-score"><span style="color:#5dade2;">'+blueTeamName+' '+bScore+'</span><span style="color:var(--text-faint);"> : </span><span style="color:#e74c3c;">'+rScore+' '+redTeamName+'</span></div>';

    // Таргет побед в серии — для определения «серия закончена»
    var targetWins = { bo1:1, bo3:2, bo5:3, bo7:4, infinite:999 }[lobby.seriesType] || 1;
    var seriesOver = (bScore >= targetWins || rScore >= targetWins) && lobby.seriesType !== 'infinite';

    if (!game.winner) {
      // Ещё не выбрали победителя — показываем кнопки (позиции, с названиями команд)
      var canPickWinner = isCreator || !!myCampTeam;
      if (canPickWinner) {
        bar.innerHTML = ''
          + scoreHtml
          + '<div class="dcoop-bb-label">Игра '+game.number+' · кто победил?</div>'
          + '<div class="dcoop-bb-btns">'
          +   '<button class="dcoop-bb-btn blue" onclick="dcoopSetWinner(\'blue\')">🔵 '+escapeHtml(roles.blue.teamName)+'</button>'
          +   '<button class="dcoop-bb-btn red"  onclick="dcoopSetWinner(\'red\')">🔴 '+escapeHtml(roles.red.teamName)+'</button>'
          + '</div>';
      } else {
        bar.innerHTML = scoreHtml + '<div class="dcoop-bb-label">Игра '+game.number+' завершена · ждём решения капитанов…</div>';
      }
    } else {
      // Победитель выбран — проигравшая КОМАНДА выбирает сторону на след игру.
      var winPos = game.winner; // 'blue' | 'red' (позиция)
      var winningTeam = roles[winPos].team; // 'blue' | 'red' (команда)
      var loserTeam = winningTeam === 'blue' ? 'red' : 'blue';
      var winTeamName = winningTeam === 'blue' ? blueTeamName : redTeamName;
      var loserTeamName = loserTeam === 'blue' ? blueTeamName : redTeamName;
      var winCol = winningTeam === 'blue' ? '#5dade2' : '#e74c3c';
      var loserCap = loserTeam === 'blue' ? lobby.blueCaptain : lobby.redCaptain;
      var loserCapUid = loserCap && loserCap.uid;
      var iAmLoserCap = !!(loserCapUid && loserCapUid === uid);
      var winnerHtml = '<div class="dcoop-bb-label">🏆 <span style="color:'+winCol+';font-weight:900;">'+winTeamName+'</span> победили</div>';

      if (seriesOver) {
        // Серия завершена — никаких кнопок next-game, только итог + "завершить"
        var finishBtn = isCreator ? '<button class="dcoop-bb-btn finish" onclick="dcoopFinishSeries()">🏁 Завершить серию</button>' : '';
        bar.innerHTML = ''
          + scoreHtml
          + winnerHtml
          + '<div class="dcoop-bb-sub">Серия завершена ('+lobby.seriesType+')</div>'
          + (finishBtn ? '<div class="dcoop-bb-btns">'+finishBtn+'</div>' : '');
      } else {
        // Какая позиция у ПРОИГРАВШЕЙ команды сейчас?
        // roles.blue.team === loserTeam → loser на blue-позиции; иначе на red.
        var loserOnBluePos = roles.blue.team === loserTeam;
        var canPickSide = iAmLoserCap || (isCreator && !loserCapUid);
        // «Завершить серию досрочно» — только создателю
        var finishBtn2 = isCreator ? '<button class="dcoop-bb-btn finish" onclick="dcoopFinishSeries()">🏁 Завершить серию</button>' : '';

        if (canPickSide) {
          bar.innerHTML = ''
            + scoreHtml
            + winnerHtml
            + '<div class="dcoop-bb-sub">'+loserTeamName+' (проигравшие) — выберите сторону на след. игру:</div>'
            + '<div class="dcoop-bb-btns">'
            +   '<button class="dcoop-bb-btn blue" onclick="dcoopNextGame('+(loserOnBluePos ? 'false' : 'true')+')">🔵 Синие (FP)</button>'
            +   '<button class="dcoop-bb-btn red"  onclick="dcoopNextGame('+(loserOnBluePos ? 'true'  : 'false')+')">🔴 Красные</button>'
            +   finishBtn2
            + '</div>';
        } else {
          bar.innerHTML = ''
            + scoreHtml
            + winnerHtml
            + '<div class="dcoop-bb-sub">Ждём '+loserTeamName+' — выбирают сторону на след. игру…</div>'
            + (finishBtn2 ? '<div class="dcoop-bb-btns">'+finishBtn2+'</div>' : '');
        }
      }
    }

    pane.appendChild(bar);
  }

  function isMobileDraft() {
    return window.innerWidth <= 760;
  }

  // ─── Bans/Picks slot rendering (shared PC + mobile) ───
  function banSlotsHtml(side, game, step, mode) {
    var bans = (game.bans && game.bans[side]) || [];
    var hover = (game.hover && game.hover[side]) || null;
    var activeBanIdx = (step && step.side === side && step.action === 'ban') ? step.banIdx : -1;
    return [0,1,2,3,4].map(function(i){
      var n = bans[i];
      var cls = 'dcoop-ban-slot' + (mode === 'mobile' ? ' m' : '');
      var html = '<span class="dcoop-slot-x">✕</span>';
      if (n) {
        var img = window._champIcon ? window._champIcon(n) : '';
        html = '<img src="'+img+'" alt="'+escapeHtml(n)+'" onerror="this.style.display=\'none\'">';
      } else if (i === activeBanIdx && hover) {
        var imgh = window._champIcon ? window._champIcon(hover) : '';
        html = '<img src="'+imgh+'" alt="'+escapeHtml(hover)+'" style="opacity:0.45;" onerror="this.style.display=\'none\'">';
        cls += ' dcoop-active-slot';
      } else if (i === activeBanIdx) {
        cls += ' dcoop-active-slot';
      }
      return '<div class="'+cls+'">'+html+'</div>';
    }).join('');
  }

  function pickSlotsHtml(side, game, step, mode) {
    var picks = (game.picks && game.picks[side]) || [];
    var hover = (game.hover && game.hover[side]) || null;
    var activePickIdx = (step && step.side === side && step.action === 'pick') ? step.pickIdx : -1;
    var showName = mode !== 'mobile';
    return [0,1,2,3,4].map(function(i){
      var p = picks[i];
      var cls = 'dcoop-pick-slot' + (mode === 'mobile' ? ' m' : '');
      var html = '<span class="dcoop-slot-placeholder">'+(i+1)+'</span>';
      if (p && p.champ) {
        var img = window._champIcon ? window._champIcon(p.champ) : '';
        html = '<img src="'+img+'" alt="'+escapeHtml(p.champ)+'" onerror="this.style.display=\'none\'">'
             + (showName ? '<div class="dcoop-pick-name">'+escapeHtml(p.champ)+'</div>' : '');
      } else if (i === activePickIdx && hover) {
        var imgh = window._champIcon ? window._champIcon(hover) : '';
        html = '<img src="'+imgh+'" alt="'+escapeHtml(hover)+'" style="opacity:0.45;" onerror="this.style.display=\'none\'">'
             + (showName ? '<div class="dcoop-pick-name" style="opacity:0.5;">'+escapeHtml(hover)+'</div>' : '');
        cls += ' dcoop-active-slot';
      } else if (i === activePickIdx) {
        cls += ' dcoop-active-slot';
      }
      return '<div class="'+cls+'">'+html+'</div>';
    }).join('');
  }

  // Map позиция (blue/red) → team (blue/red) + капитан + teamName.
  // Используется для корректного свапа сторон между играми серии.
  // currentGameBlueSide = какая "команда" сейчас играет на синей позиции.
  function sideRoles(lobby, game) {
    var bs = (game && game.blueSide) || (lobby && lobby.currentGameBlueSide) || 'blue';
    if (bs === 'red') {
      return {
        blue: { team:'red',  cap: lobby.redCaptain,  teamName: (lobby.redTeamName  || 'Red' ) },
        red:  { team:'blue', cap: lobby.blueCaptain, teamName: (lobby.blueTeamName || 'Blue') }
      };
    }
    return {
      blue: { team:'blue', cap: lobby.blueCaptain, teamName: (lobby.blueTeamName || 'Blue') },
      red:  { team:'red',  cap: lobby.redCaptain,  teamName: (lobby.redTeamName  || 'Red' ) }
    };
  }

  // ─── Captain block (user-card style) ───
  function captainBlockHtml(side, cap, lobby, step, teamNameOverride, scoreOverride) {
    var col = side === 'blue' ? '#5dade2' : '#e74c3c';
    var nick = (cap && cap.nick) ? escapeHtml(cap.nick) : '<span style="color:#f1c40f;">ждём…</span>';
    var teamName = teamNameOverride != null
      ? teamNameOverride
      : (side === 'blue' ? (lobby.blueTeamName || 'Blue') : (lobby.redTeamName || 'Red'));
    var isActive = step && step.side === side;
    var score = scoreOverride != null
      ? scoreOverride
      : ((lobby.seriesScore && lobby.seriesScore[side]) || 0);
    return '<div class="dcoop-hdr-cap dcoop-hdr-cap-'+side+(isActive?' active':'')+'" style="--side-col:'+col+';">'
      + '<div class="dcoop-hdr-cap-team">'+escapeHtml(teamName)+'</div>'
      + '<div class="dcoop-hdr-cap-nick">'+nick+'</div>'
      + '<div class="dcoop-hdr-cap-score">'+score+'</div>'
      + '</div>';
  }

  // ─── Header (mobile vs PC) ───
  function draftHeaderHtml(lobby, game, step, mySide, isCreator) {
    var stepCol = step ? (step.side === 'blue' ? '#5dade2' : '#e74c3c') : '#fff';
    var closeBtn = isCreator
      ? '<button class="dcoop-hdr-close" onclick="dcoopCloseLobbyConfirm()" title="Закрыть лобби">✕</button>'
      : '';
    var specCount = (lobby.invitedSpectators || []).length;
    var specBtn = '<button class="dcoop-hdr-spec" onclick="dcoopToggleSpectators()" title="Зрители">👁 '+specCount+'</button>';
    var assistBtn = '<button class="dcoop-hdr-assist" onclick="dcoopToggleAssist()" title="Драфт-помощник" data-on="'+(_draftAssistantOn?'1':'0')+'">🤖</button>';

    var roles = sideRoles(lobby, game);
    var score = lobby.seriesScore || {};
    var blueCap = captainBlockHtml('blue', roles.blue.cap, lobby, step, roles.blue.teamName, score[roles.blue.team] || 0);
    var redCap  = captainBlockHtml('red',  roles.red.cap,  lobby, step, roles.red.teamName,  score[roles.red.team]  || 0);

    if (isMobileDraft()) {
      return ''
        + '<div class="dcoop-hdr dcoop-hdr-mobile">'
        +   '<div class="dcoop-hdr-row-caps">'
        +     blueCap
        +     '<div class="dcoop-hdr-timer-m" id="dcoopTimer" style="color:'+stepCol+';">—</div>'
        +     redCap
        +   '</div>'
        +   '<div class="dcoop-hdr-row-bans">'
        +     '<div class="dcoop-hdr-bans dcoop-hdr-bans-blue">'+banSlotsHtml('blue', game, step, 'mobile')+'</div>'
        +     '<div class="dcoop-hdr-bans dcoop-hdr-bans-red">'+banSlotsHtml('red',  game, step, 'mobile')+'</div>'
        +   '</div>'
        +   '<div class="dcoop-hdr-row-picks">'
        +     '<div class="dcoop-hdr-picks dcoop-hdr-picks-blue">'+pickSlotsHtml('blue', game, step, 'mobile')+'</div>'
        +     '<div class="dcoop-hdr-picks dcoop-hdr-picks-red">'+pickSlotsHtml('red',  game, step, 'mobile')+'</div>'
        +   '</div>'
        +   '<div class="dcoop-hdr-corner">'+specBtn+closeBtn+'</div>'
        + '</div>';
    }

    // PC: большой таймер по центру + блоки капитанов по краям
    return ''
      + '<div class="dcoop-hdr dcoop-hdr-pc">'
      +   '<div class="dcoop-hdr-pc-left">'+blueCap+'</div>'
      +   '<div class="dcoop-hdr-timer-pc" id="dcoopTimer" style="color:'+stepCol+';">—</div>'
      +   '<div class="dcoop-hdr-pc-right">'+redCap+'</div>'
      +   '<div class="dcoop-hdr-corner-pc">'+specBtn+assistBtn+closeBtn+'</div>'
      + '</div>';
  }

  // ─── Past games (шторка мобила / панель снизу на PC) ───
  function pastGamesHtml(lobby, game) {
    var completed = (lobby.completedGames || []).slice().sort(function(a,b){ return a.number - b.number; });
    if (!completed.length) return ''; // показывается с игры 2+ (т.к. completed появляется после 1-й игры)

    function slot(n) {
      if (!n) return '<div class="dcoop-past-slot empty"></div>';
      var img = window._champIcon ? window._champIcon(n) : '';
      return '<div class="dcoop-past-slot"><img src="'+img+'" alt="'+escapeHtml(n)+'" title="'+escapeHtml(n)+'" onerror="this.style.display=\'none\'"></div>';
    }
    function padRow(arr) {
      var out = (arr || []).slice(0, 5);
      while (out.length < 5) out.push(null);
      return out;
    }

    var rowsHtml = completed.map(function(g){
      var blue = padRow(g.picksBlue).map(slot).join('');
      var red  = padRow(g.picksRed ).map(slot).join('');
      return '<div class="dcoop-past-row">'
        + '<div class="dcoop-past-num">Игра '+g.number+'</div>'
        + '<div class="dcoop-past-side blue">'+blue+'</div>'
        + '<div class="dcoop-past-divider"></div>'
        + '<div class="dcoop-past-side red">'+red+'</div>'
        + '</div>';
    }).join('');

    if (isMobileDraft()) {
      var icon = _pastGamesExpanded ? '▲' : '▼';
      return ''
        + '<div class="dcoop-past'+(_pastGamesExpanded?' open':'')+'" id="dcoopPast">'
        +   '<button class="dcoop-past-header" onclick="dcoopTogglePast()">'
        +     '<span>Прошлые пики · '+completed.length+'</span>'
        +     '<span class="dcoop-past-chev">'+icon+'</span>'
        +   '</button>'
        +   '<div class="dcoop-past-drawer">'+rowsHtml+'</div>'
        + '</div>';
    }

    // PC: разворот всегда открыт, блок снизу под основной областью
    return ''
      + '<div class="dcoop-past dcoop-past-pc">'
      +   '<div class="dcoop-past-label">Прошлые пики серии</div>'
      +   '<div class="dcoop-past-drawer open">'+rowsHtml+'</div>'
      + '</div>';
  }

  // ─── Side panel (PC only — bans/picks) ───
  function sidePanelHtml(side, lobby, game, step) {
    if (isMobileDraft()) return '';
    var col = side === 'blue' ? '#5dade2' : '#e74c3c';
    return ''
      + '<div class="dcoop-side-panel" style="--side-col:'+col+';">'
      +   '<div class="dcoop-bans-label">Баны</div>'
      +   '<div class="dcoop-bans-row">'+banSlotsHtml(side, game, step, 'pc')+'</div>'
      +   '<div class="dcoop-picks-label">Пики</div>'
      +   '<div class="dcoop-picks-col">'+pickSlotsHtml(side, game, step, 'pc')+'</div>'
      + '</div>';
  }

  function gallerySearchHtml() {
    var roles = [
      {k:'Top',l:'Top'},{k:'Jungle',l:'JG'},
      {k:'Mid',l:'Mid'},{k:'ADC',l:'ADC'},{k:'Support',l:'Sup'}
    ];
    var roleBtns = roles.map(function(r){
      return '<button class="dcoop-role-btn" data-role="'+r.k+'" onclick="dcoopFilterRole(\''+r.k+'\')">'+r.l+'</button>';
    }).join('');
    return ''
      + '<div class="dcoop-gallery-ctl">'
      +   '<input id="dcoopChampSearch" type="text" placeholder="🔍 Поиск чемпиона" oninput="dcoopFilterSearch(this.value)">'
      +   '<div class="dcoop-roles">'+roleBtns+'</div>'
      + '</div>';
  }

  function lockInBtnHtml(myTurn, game, step) {
    if (game.phase === 'done') return '';
    if (!myTurn) return '<div class="dcoop-lock-hint">Ход соперника…</div>';
    return '<button id="dcoopLockIn" class="dcoop-lock-btn" onclick="dcoopLockIn()" disabled>🔒 LOCK IN</button>';
  }

  // Filtering state
  var _filterRole = 'Top';
  var _filterQuery = '';
  var _pastGamesExpanded = false;
  var _draftAssistantOn = false;

  function renderGallery(lobby, game, step, mySide, unavail) {
    var grid = document.getElementById('dcoopGallery');
    if (!grid) return;
    var champs = getAllChamps();
    if (!champs.length) {
      grid.innerHTML = '<div style="color:var(--text-faint);padding:20px;text-align:center;">Загрузка чемпионов…</div>';
      document.addEventListener('champsLoaded', function once(){
        document.removeEventListener('champsLoaded', once);
        renderGallery(lobby, game, step, mySide, getUnavailable(game, lobby.mode==='fearless'?lobby.usedChampions||[]:[]));
      });
      return;
    }
    var q = _filterQuery.toLowerCase();
    var list = champs.filter(function(c){
      if (!c.roles[_filterRole]) return false;
      if (q && c.name.toLowerCase().indexOf(q) === -1) return false;
      return true;
    });

    // Стабильная сортировка: сначала доступные (unavail[c]=undefined),
    // потом banned/picked/fearless — чтобы свободные чемпы были сверху-слева.
    list.sort(function(a, b){
      var ua = unavail[a.name] ? 1 : 0;
      var ub = unavail[b.name] ? 1 : 0;
      return ua - ub;
    });

    grid.innerHTML = list.map(function(c){
      var st = unavail[c.name];
      var cls = 'dcoop-champ';
      if (st === 'banned') cls += ' banned';
      else if (st === 'picked') cls += ' picked';
      else if (st === 'fearless') cls += ' fearless-locked';
      return '<div class="'+cls+'" data-champ="'+escapeHtml(c.name)+'" onclick="dcoopChampClick(\''+encodeURIComponent(c.name)+'\')" title="'+escapeHtml(c.name)+'">'
        +   '<img src="'+c.img+'" alt="'+escapeHtml(c.name)+'" onerror="this.style.display=\'none\'">'
        +   '<div class="dcoop-champ-name">'+escapeHtml(c.name)+'</div>'
        + '</div>';
    }).join('');

    // Восстанавливаем активный role
    document.querySelectorAll('.dcoop-role-btn').forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-role') === _filterRole);
    });

    // Подсветка hover
    if (_hoverLocal) {
      var el = grid.querySelector('[data-champ="'+cssEscape(_hoverLocal)+'"]');
      if (el) el.classList.add('selected');
    }
  }

  function cssEscape(s) {
    return String(s).replace(/"/g,'\\"');
  }

  function filterRole(r) {
    _filterRole = r;
    if (_currentLobby && _currentGame) {
      var fl = _currentLobby.mode==='fearless' ? (_currentLobby.usedChampions||[]) : [];
      renderGallery(_currentLobby, _currentGame, WR_DRAFT_SEQUENCE[_currentGame.turnIndex], null, getUnavailable(_currentGame, fl));
    }
  }

  function filterSearch(v) {
    _filterQuery = v || '';
    if (_currentLobby && _currentGame) {
      var fl = _currentLobby.mode==='fearless' ? (_currentLobby.usedChampions||[]) : [];
      renderGallery(_currentLobby, _currentGame, WR_DRAFT_SEQUENCE[_currentGame.turnIndex], null, getUnavailable(_currentGame, fl));
    }
  }

  // ─── Champion click handler (hover + enable Lock In) ───
  function champClick(nameEncoded) {
    var name = decodeURIComponent(nameEncoded);
    var l = _currentLobby, g = _currentGame;
    if (!l || !g) return;
    var uid = _uid();
    var mySide = (l.blueCaptain && l.blueCaptain.uid === uid) ? 'blue'
               : ((l.redCaptain && l.redCaptain.uid === uid) ? 'red' : null);
    if (!mySide) return;
    var step = WR_DRAFT_SEQUENCE[g.turnIndex];
    if (!step || step.side !== mySide) return;

    var fl = l.mode==='fearless' ? (l.usedChampions||[]) : [];
    var unavail = getUnavailable(g, fl);
    if (unavail[name]) return;

    _hoverLocal = name;

    // Подсветка в галерее
    var grid = document.getElementById('dcoopGallery');
    if (grid) {
      grid.querySelectorAll('.dcoop-champ.selected').forEach(function(el){ el.classList.remove('selected'); });
      var el = grid.querySelector('[data-champ="'+cssEscape(name)+'"]');
      if (el) el.classList.add('selected');
    }

    // Включить Lock In
    var btn = document.getElementById('dcoopLockIn');
    if (btn) btn.disabled = false;

    // Throttled write
    if (_hoverWriteTimer) clearTimeout(_hoverWriteTimer);
    _hoverWriteTimer = setTimeout(function(){
      var patch = {};
      patch['hover.' + mySide] = name;
      _db().collection('draftLobbies').doc(l.id)
        .collection('games').doc(String(g.number))
        .update(patch).catch(function(e){ console.warn('[draft] hover update', e); });
    }, 250);

    // Обновить preview slots
    renderSlotsHoverPreview(mySide, name);
  }

  function renderSlotsHoverPreview(side, name) {
    // Перерисовка слотов (чтобы сразу увидеть свой hover на активном слоте)
    if (!_currentLobby || !_currentGame) return;
    var step = WR_DRAFT_SEQUENCE[_currentGame.turnIndex];
    if (!step || step.side !== side) return;
    // Мутируем локально hover и перерисовываем панели (без запроса в Firestore)
    var g = _currentGame;
    g.hover = g.hover || {};
    g.hover[side] = name;
    var pane = document.getElementById('dcoopPaneLobby');
    if (!pane) return;
    var blueEl = pane.querySelector('.dcoop-side-panel');
    if (blueEl && blueEl.parentElement) {
      // Перерисовываем только side panels через innerHTML replacement — проще перерисовать весь layout:
      var layout = pane.querySelector('.dcoop-draft-layout');
      if (!layout) return;
      var panels = layout.querySelectorAll(':scope > .dcoop-side-panel');
      // Blue = первый, Red = последний
      if (panels.length === 2) {
        panels[0].outerHTML = sidePanelHtml('blue', _currentLobby, g, step);
        // После outerHTML старая ссылка в панеле мертва; перезапрашиваем
        var panels2 = layout.querySelectorAll(':scope > .dcoop-side-panel');
        panels2[1].outerHTML = sidePanelHtml('red', _currentLobby, g, step);
      }
    }
  }

  // ─── LOCK IN ───
  function lockIn() {
    var l = _currentLobby, g = _currentGame;
    if (!l || !g || !_hoverLocal) return;
    var uid = _uid();
    var mySide = (l.blueCaptain && l.blueCaptain.uid === uid) ? 'blue'
               : ((l.redCaptain && l.redCaptain.uid === uid) ? 'red' : null);
    if (!mySide) return;
    var step = WR_DRAFT_SEQUENCE[g.turnIndex];
    if (!step || step.side !== mySide) return;
    var champ = _hoverLocal;

    var fl = l.mode==='fearless' ? (l.usedChampions||[]) : [];
    if (getUnavailable(g, fl)[champ]) { toast('Недоступен'); return; }

    applyLockIn(l, g, step, champ, mySide);
  }

  function applyLockIn(lobby, game, step, champ, side) {
    var dbInst = _db();
    var patch = { turnStartedAt: firebase.firestore.FieldValue.serverTimestamp() };
    // Обновляем конкретный слот
    if (step.action === 'ban') {
      var bans = (game.bans[side] || []).slice();
      bans[step.banIdx] = champ;
      patch['bans.' + side] = bans;
    } else {
      var picks = (game.picks[side] || []).slice();
      picks[step.pickIdx] = { champ: champ, lockedAt: Date.now() };
      patch['picks.' + side] = picks;
    }
    // Сбрасываем hover
    patch['hover.' + side] = null;
    // Инкремент turnIndex
    var nextIdx = game.turnIndex + 1;
    patch.turnIndex = nextIdx;
    if (nextIdx >= SEQ_LEN) {
      patch.phase = 'done';
      patch.finishedAt = firebase.firestore.FieldValue.serverTimestamp();
    } else {
      var nextStep = WR_DRAFT_SEQUENCE[nextIdx];
      patch.phase = nextStep.phase;
      patch.currentSide = nextStep.side;
      patch.currentAction = nextStep.action;
    }

    _hoverLocal = null;
    dbInst.collection('draftLobbies').doc(lobby.id)
      .collection('games').doc(String(game.number))
      .update(patch)
      .then(function(){
        if (nextIdx >= SEQ_LEN) {
          // Лобби → finished_game
          dbInst.collection('draftLobbies').doc(lobby.id).update({
            status: 'finished_game',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
      })
      .catch(function(e){ toast('Ошибка: '+e.message); });
  }

  // ─── TIMER ───
  function startTimer(lobby, game, step, mySide) {
    if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
    var tEl = document.getElementById('dcoopTimer');
    if (!tEl) return;
    if (!step || game.phase === 'done') { tEl.textContent = '—'; return; }

    var total = lobby.timerSeconds || 45;
    var startMs = (game.turnStartedAt && game.turnStartedAt.toMillis) ? game.turnStartedAt.toMillis() : Date.now();

    function tick() {
      var left = total - (Date.now() - startMs) / 1000;
      if (left < 0) left = 0;
      tEl.textContent = Math.ceil(left) + 'с';
      tEl.style.color = left < 5 ? '#e74c3c' : (left < 15 ? '#f1c40f' : '#fff');
      if (left <= 0) {
        clearInterval(_timerInterval); _timerInterval = null;
        onTimerExpired(lobby, game, step, mySide);
      }
    }
    tick();
    _timerInterval = setInterval(tick, 200);
  }

  var _autoActionFired = {};
  // Детерминированный random: одинаковый chamber на всех клиентах
  function deterministicPick(seed, pool) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return pool[h % pool.length];
  }

  function onTimerExpired(lobby, game, step, mySide) {
    if (!step) return;
    var uid = _uid();
    // Фаерят все уполномоченные (капитаны + создатель) — транзакция решит конфликт
    var blueCapUid = lobby.blueCaptain && lobby.blueCaptain.uid;
    var redCapUid  = lobby.redCaptain  && lobby.redCaptain.uid;
    var authorized = uid === lobby.createdBy || uid === blueCapUid || uid === redCapUid;
    if (!authorized) return;

    var key = lobby.id + '-' + game.number + '-' + game.turnIndex;
    if (_autoActionFired[key]) return;
    _autoActionFired[key] = 1;

    // Небольшая задержка, чтобы дать активному капитану шанс нажать Lock In
    var delay = step.side === mySide ? 0 : (uid === lobby.createdBy ? 1200 : 2400);

    setTimeout(function(){
      var dbInst = _db();
      var gameRef = dbInst.collection('draftLobbies').doc(lobby.id).collection('games').doc(String(game.number));

      dbInst.runTransaction(function(tx){
        return tx.get(gameRef).then(function(snap){
          if (!snap.exists) return;
          var g = snap.data();
          if (g.turnIndex !== game.turnIndex) return; // кто-то уже походил
          if (g.phase === 'done') return;

          var patch = { turnStartedAt: firebase.firestore.FieldValue.serverTimestamp() };
          var nextIdx = g.turnIndex + 1;
          patch.turnIndex = nextIdx;
          patch['hover.' + step.side] = null;

          if (step.action === 'ban') {
            var bans = (g.bans[step.side] || []).slice();
            // Если уже выбрал ховер — забанить его, иначе пустой слот
            bans[step.banIdx] = g.hover && g.hover[step.side] ? g.hover[step.side] : null;
            patch['bans.' + step.side] = bans;
          } else {
            var pick = g.hover && g.hover[step.side];
            if (!pick) {
              var fl = lobby.mode==='fearless' ? (lobby.usedChampions||[]) : [];
              var un = getUnavailable(g, fl);
              // Пул в активной роли, иначе fallback на всех
              var role = step.pickIdx != null ? ['Top','Jungle','Mid','ADC','Support'][step.pickIdx] : null;
              var allC = getAllChamps();
              var pool = allC.filter(function(c){ return !un[c.name] && (!role || c.roles[role]); }).map(function(c){return c.name;});
              if (!pool.length) pool = allC.filter(function(c){ return !un[c.name]; }).map(function(c){return c.name;});
              if (!pool.length) return;
              pick = deterministicPick(lobby.id + ':' + g.number + ':' + g.turnIndex, pool);
            }
            var picks = (g.picks[step.side] || []).slice();
            picks[step.pickIdx] = { champ: pick, lockedAt: Date.now(), auto: true };
            patch['picks.' + step.side] = picks;
          }

          if (nextIdx >= SEQ_LEN) {
            patch.phase = 'done';
            patch.finishedAt = firebase.firestore.FieldValue.serverTimestamp();
          } else {
            var ns = WR_DRAFT_SEQUENCE[nextIdx];
            patch.phase = ns.phase; patch.currentSide = ns.side; patch.currentAction = ns.action;
          }

          tx.update(gameRef, patch);
        });
      }).then(function(){
        // Если драфт завершён — обновляем статус лобби
        if (game.turnIndex + 1 >= SEQ_LEN) {
          dbInst.collection('draftLobbies').doc(lobby.id).update({
            status: 'finished_game',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }).catch(function(){});
        }
      }).catch(function(e){ console.warn('[draft] auto-advance tx', e); });
    }, delay);
  }

  function setWinner(side) {
    var l = _currentLobby, g = _currentGame;
    if (!l || !g) return;
    // Идемпотентность: не начислять повторно, если winner уже выставлен.
    if (g.winner) return;
    var dbInst = _db();
    // Маппим позицию (side) → TEAM, учитывая swap сторон.
    var roles = sideRoles(l, g);
    var winningTeam = roles[side].team; // 'blue' | 'red'
    var scoreField = 'seriesScore.' + winningTeam;
    var incr = firebase.firestore.FieldValue.increment(1);
    var patch = {}; patch[scoreField] = incr;
    patch.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

    // В Fearless — добавляем пики+баны в usedChampions
    if (l.mode === 'fearless') {
      var used = (l.usedChampions || []).slice();
      (g.picks.blue || []).forEach(function(p){ if(p && p.champ) used.push(p.champ); });
      (g.picks.red  || []).forEach(function(p){ if(p && p.champ) used.push(p.champ); });
      (g.bans.blue  || []).forEach(function(n){ if(n) used.push(n); });
      (g.bans.red   || []).forEach(function(n){ if(n) used.push(n); });
      patch.usedChampions = Array.from(new Set(used));
    }

    // Денормализация пиков прошлой игры для быстрого отображения в past games
    var completedEntry = {
      number: g.number,
      winner: side,
      picksBlue: (g.picks.blue || []).map(function(p){ return p && p.champ ? p.champ : null; }),
      picksRed:  (g.picks.red  || []).map(function(p){ return p && p.champ ? p.champ : null; }),
      bansBlue:  (g.bans.blue  || []).slice(),
      bansRed:   (g.bans.red   || []).slice()
    };
    var completedList = (l.completedGames || []).filter(function(e){ return e.number !== g.number; });
    completedList.push(completedEntry);
    completedList.sort(function(a,b){ return a.number - b.number; });
    patch.completedGames = completedList;

    // Проверяем — серия завершена?
    var targetWins = { bo1:1, bo3:2, bo5:3, bo7:4, infinite:999 }[l.seriesType] || 1;
    var newBlue = (l.seriesScore && l.seriesScore.blue || 0) + (winningTeam==='blue'?1:0);
    var newRed  = (l.seriesScore && l.seriesScore.red  || 0) + (winningTeam==='red' ?1:0);
    var seriesDone = (newBlue >= targetWins || newRed >= targetWins) && l.seriesType !== 'infinite';

    if (seriesDone) patch.status = 'series_done';
    else patch.status = 'finished_game';

    var lobbyRef = dbInst.collection('draftLobbies').doc(l.id);
    Promise.all([
      lobbyRef.collection('games').doc(String(g.number)).update({ winner: side }),
      lobbyRef.update(patch)
    ]).catch(function(e){ toast('Ошибка: '+e.message); });
  }

  // ─── Toggles ───
  function togglePast() {
    _pastGamesExpanded = !_pastGamesExpanded;
    var el = document.getElementById('dcoopPast');
    if (el) el.classList.toggle('open', _pastGamesExpanded);
    var chev = el && el.querySelector('.dcoop-past-chev');
    if (chev) chev.textContent = _pastGamesExpanded ? '▲' : '▼';
  }

  function toggleAssist() {
    _draftAssistantOn = !_draftAssistantOn;
    renderAssistPanel();
    // Обновить состояние кнопки
    document.querySelectorAll('.dcoop-hdr-assist').forEach(function(b){
      b.setAttribute('data-on', _draftAssistantOn ? '1' : '0');
    });
  }

  // ─── Tierlist + matchups readers (читаем из localStorage, куда пишет app.js) ───
  function _mchups() { try { return JSON.parse(localStorage.getItem('matchups') || '{}'); } catch(e) { return {}; } }
  function _wvs(n) { var m = _mchups(); return (m[n] && m[n].weakVs) || []; }
  function _cmbs(n) { var m = _mchups(); return (m[n] && m[n].combos) || []; }
  function _tierData() { try { return JSON.parse(localStorage.getItem('tierData') || '{}'); } catch(e) { return {}; } }
  function _tierStar(name) {
    var td = _tierData();
    var isSplus = false, isS = false;
    Object.keys(td).forEach(function(r){
      if (td[r] && td[r]['S+'] && td[r]['S+'].indexOf(name) !== -1) isSplus = true;
      if (td[r] && td[r]['S']  && td[r]['S' ].indexOf(name) !== -1) isS = true;
    });
    if (isSplus) return 'red';
    if (isS) return 'green';
    return null;
  }

  function computeAssist(lobby, game, mySide) {
    var enemySide = mySide === 'blue' ? 'red' : 'blue';
    var allyPicks = ((game.picks && game.picks[mySide]) || []).map(function(p){ return p && p.champ; }).filter(Boolean);
    var enemyPicks = ((game.picks && game.picks[enemySide]) || []).map(function(p){ return p && p.champ; }).filter(Boolean);
    var fearlessLock = lobby.mode === 'fearless' ? (lobby.usedChampions || []) : [];
    var unavail = getUnavailable(game, fearlessLock);

    var goodMap = {};   // что стоит пикнуть нам
    var dangerMap = {}; // чего ждать/банить/бояться

    function addTo(map, name, key, src) {
      if (!map[name]) map[name] = { counterFrom: [], synergyFrom: [] };
      map[name][key].push(src);
    }
    // GOOD: контры к пикам врагов + синергии с нашими пиками
    enemyPicks.forEach(function(ep){ _wvs(ep).forEach(function(c){ addTo(goodMap, c, 'counterFrom', ep); }); });
    allyPicks.forEach(function(ap){ _cmbs(ap).forEach(function(s){ addTo(goodMap, s, 'synergyFrom', ap); }); });
    // DANGER: контры к нашим пикам + синергии с пиками врагов
    allyPicks.forEach(function(ap){ _wvs(ap).forEach(function(c){ addTo(dangerMap, c, 'counterFrom', ap); }); });
    enemyPicks.forEach(function(ep){ _cmbs(ep).forEach(function(s){ addTo(dangerMap, s, 'synergyFrom', ep); }); });

    function starScore(x) {
      var s = 0;
      if (x.counterFrom.length === 1) s += 1; else if (x.counterFrom.length > 1) s += 2;
      if (x.synergyFrom.length === 1) s += 1; else if (x.synergyFrom.length > 1) s += 2;
      var ts = _tierStar(x.name);
      if (ts === 'red') s += 2; else if (ts) s += 1;
      return s;
    }
    function rankMap(map) {
      return Object.keys(map)
        .filter(function(n){ return !unavail[n]; })
        .map(function(n){ return { name: n, counterFrom: map[n].counterFrom, synergyFrom: map[n].synergyFrom }; })
        .sort(function(a,b){ return starScore(b) - starScore(a); });
    }
    return {
      good: rankMap(goodMap).slice(0, 12),
      danger: rankMap(dangerMap).slice(0, 12),
      hasMatchups: Object.keys(_mchups()).length > 0
    };
  }

  function renderAssistPanel() {
    var existing = document.getElementById('dcoopAssistPanel');
    if (existing) existing.parentNode.removeChild(existing);
    if (!_draftAssistantOn || !_currentLobby || !_currentGame) return;
    if (isMobileDraft()) return; // PC only

    var lobby = _currentLobby, game = _currentGame;
    var uid = _uid();
    var mySide = null;
    if (lobby.blueCaptain && lobby.blueCaptain.uid === uid) mySide = 'blue';
    else if (lobby.redCaptain && lobby.redCaptain.uid === uid) mySide = 'red';
    if (!mySide) return; // зритель — помощник не показываем

    var result = computeAssist(lobby, game, mySide);

    function renderItem(x) {
      var img = window._champIcon ? window._champIcon(x.name) : '';
      var ts = _tierStar(x.name);
      var stars = [];
      if (x.counterFrom.length === 1) stars.push('#2ecc71');
      else if (x.counterFrom.length > 1) stars.push('#e74c3c');
      if (x.synergyFrom.length === 1) stars.push('#2ecc71');
      else if (x.synergyFrom.length > 1) stars.push('#e74c3c');
      if (ts) stars.push(ts === 'red' ? '#e74c3c' : '#2ecc71');
      var starsHtml = stars.length
        ? '<div class="dcoop-assist-stars">'+stars.map(function(c){ return '<span style="color:'+c+';">★</span>'; }).join('')+'</div>'
        : '';
      return '<div class="dcoop-assist-item" onclick="dcoopChampClick(\''+encodeURIComponent(x.name)+'\')" title="'+escapeHtml(x.name)+'">'
        +    '<img src="'+img+'" alt="'+escapeHtml(x.name)+'" onerror="this.style.display=\'none\'">'
        +    starsHtml
        +    '<div class="dcoop-assist-item-name">'+escapeHtml(x.name)+'</div>'
        +  '</div>';
    }

    function section(title, arr, color, emptyTxt) {
      var body = arr.length
        ? '<div class="dcoop-assist-list">'+arr.map(renderItem).join('')+'</div>'
        : '<div class="dcoop-assist-empty">'+emptyTxt+'</div>';
      return '<div class="dcoop-assist-section">'
        + '<div class="dcoop-assist-sec-title" style="color:'+color+';">'+title+'</div>'
        + body
        + '</div>';
    }

    var warning = '';
    if (!result.hasMatchups && !Object.keys(_tierData()).length) {
      warning = '<div class="dcoop-assist-warn">Нет матчапов и тирлиста. Заполни Драфт-помощник, чтобы получать рекомендации.</div>';
    }

    var panel = document.createElement('div');
    panel.id = 'dcoopAssistPanel';
    panel.className = 'dcoop-assist-panel';
    panel.innerHTML = ''
      + '<div class="dcoop-assist-title">🤖 Драфт-помощник</div>'
      + '<div class="dcoop-assist-sub">Звёзды = контры (верх) · синергии (низ) · тир (низ)</div>'
      + warning
      + section('✅ GOOD PICK',  result.good,   '#2ecc71', 'Нет рекомендаций')
      + section('⚠ DANGER',     result.danger, '#e74c3c', 'Угроз не видно');
    document.body.appendChild(panel);
  }

  function toggleSpectators() {
    var l = _currentLobby;
    if (!l) return;
    var existing = document.getElementById('dcoopSpecDrop');
    if (existing) { existing.parentNode.removeChild(existing); return; }

    var specs = l.invitedSpectators || [];
    var rows = specs.length
      ? specs.map(function(su){
          var nick = (l.spectatorNicks && l.spectatorNicks[su]) || su.slice(0,8);
          return '<div class="dcoop-spec-row">'+escapeHtml(nick)+'</div>';
        }).join('')
      : '<div style="color:var(--text-faint);font-size:12px;padding:8px;text-align:center;">Зрителей нет</div>';

    var drop = document.createElement('div');
    drop.id = 'dcoopSpecDrop';
    drop.className = 'dcoop-spec-drop';
    drop.innerHTML = '<div class="dcoop-spec-title">👁 Зрители ('+specs.length+')</div>' + rows;
    drop.onclick = function(e){ e.stopPropagation(); };
    document.body.appendChild(drop);
    setTimeout(function(){
      document.addEventListener('click', function closer(){
        document.removeEventListener('click', closer);
        var el = document.getElementById('dcoopSpecDrop');
        if (el) el.parentNode.removeChild(el);
      }, { once: true });
    }, 10);
  }

  function closeLobbyConfirm() {
    var l = _currentLobby;
    if (!l) return;
    if (l.createdBy !== _uid()) { toast('Только создатель может закрыть лобби'); return; }
    if (!confirm('Закрыть лобби? Драфт будет прерван.')) return;
    _db().collection('draftLobbies').doc(l.id).update({
      status: 'closed',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function(){
      toast('Лобби закрыто');
      document.body.classList.remove('dcoop-fullscreen');
    var _aPanel = document.getElementById('dcoopAssistPanel'); if (_aPanel) _aPanel.parentNode.removeChild(_aPanel);
      backToList();
    }).catch(function(e){ toast('Ошибка: '+e.message); });
  }

  function nextGame(swapSides) {
    var l = _currentLobby;
    if (!l) return;
    // Guard: если серия уже завершена, новых игр не создаём
    var _target = { bo1:1, bo3:2, bo5:3, bo7:4, infinite:999 }[l.seriesType] || 1;
    var _b = (l.seriesScore && l.seriesScore.blue) || 0;
    var _r = (l.seriesScore && l.seriesScore.red)  || 0;
    if (l.seriesType !== 'infinite' && (_b >= _target || _r >= _target)) {
      toast('Серия уже завершена');
      return;
    }
    if (l.status === 'series_done' || l.status === 'closed') {
      toast('Серия закрыта');
      return;
    }
    var nextNum = (l.currentGame || 1) + 1;
    var dbInst = _db();
    // Стороны игры: base blue/red, при swap меняем
    // Храним в игре поле blueSide — кто играет на синей стороне в этой игре
    var game = {
      number: nextNum,
      blueSide: swapSides ? (l.currentGameBlueSide === 'blue' ? 'red' : 'blue') : (l.currentGameBlueSide || 'blue'),
      phase: 'ban1',
      turnIndex: 0,
      currentSide: 'blue',
      currentAction: 'ban',
      turnStartedAt: firebase.firestore.FieldValue.serverTimestamp(),
      bans: { blue: [null,null,null,null,null], red: [null,null,null,null,null] },
      picks: { blue: [], red: [] },
      hover: { blue: null, red: null },
      winner: null,
      finishedAt: null
    };
    var lobbyRef = dbInst.collection('draftLobbies').doc(l.id);
    lobbyRef.collection('games').doc(String(nextNum)).set(game).then(function(){
      return lobbyRef.update({
        status: 'drafting',
        currentGame: nextNum,
        currentGameBlueSide: game.blueSide,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }).catch(function(e){ toast('Ошибка: '+e.message); });
  }

  function finishSeries() {
    var l = _currentLobby;
    if (!l) return;
    _db().collection('draftLobbies').doc(l.id).update({
      status: 'series_done',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  // ─── Переопределяем renderLobby: поддержка drafting / finished_game ───
  // (Старая реализация уже была; расширяем через хук)
  renderLobby = function(l) {
    var pane = document.getElementById('dcoopPaneLobby');
    if (!pane) return;
    if (l.status === 'waiting' || l.status === 'ready_check') {
      stopGameListener();
      renderWaitingRoom(l, pane);
      return;
    }
    if (l.status === 'drafting' || l.status === 'paused' || l.status === 'finished_game') {
      listenToCurrentGame(l);
      // UI отрисовывается в onSnapshot игры (renderDraftUi),
      // который при status='finished_game' + game.winner покажет "между играми".
      return;
    }
    if (l.status === 'series_done' || l.status === 'closed') {
      stopGameListener();
      renderSeriesDone(l, pane);
      return;
    }
    pane.innerHTML = '<pre style="padding:20px;color:#fff;font-size:11px;">'+escapeHtml(JSON.stringify(l,null,2))+'</pre>';
  };

  function renderSeriesDone(lobby, pane) {
    var blue = lobby.seriesScore && lobby.seriesScore.blue || 0;
    var red  = lobby.seriesScore && lobby.seriesScore.red  || 0;
    var isTie = blue === red;
    var winnerName = isTie ? 'Ничья' : (blue > red ? (lobby.blueTeamName||'Blue') : (lobby.redTeamName||'Red'));
    var winnerCol = isTie ? 'var(--text-faint)' : (blue > red ? '#5dade2' : '#e74c3c');
    var uid = _uid();
    var isCreator = lobby.createdBy === uid;
    var deleteBtn = isCreator
      ? '<button onclick="dcoopDeleteLobby()" style="margin-top:20px;padding:8px 14px;border:1px solid #e74c3c;background:rgba(231,76,60,0.1);color:#e74c3c;border-radius:8px;font-size:11px;font-weight:800;cursor:pointer;">🗑 Удалить из истории</button>'
      : '';
    pane.innerHTML = ''
      + '<div style="padding:24px;text-align:center;">'
      +   '<button onclick="dcoopBackToList()" style="position:absolute;top:12px;left:12px;background:none;border:1px solid var(--accent-border);color:#fff;padding:6px 12px;border-radius:8px;font-size:12px;cursor:pointer;">← К списку</button>'
      +   '<div style="font-size:56px;margin-bottom:10px;">🏆</div>'
      +   '<div style="font-size:22px;font-weight:900;color:'+winnerCol+';margin-bottom:8px;">'+escapeHtml(winnerName)+(isTie?'':' победили')+'</div>'
      +   '<div style="font-size:32px;font-weight:900;margin-bottom:8px;">'
      +     '<span style="color:#5dade2;">'+blue+'</span><span style="color:var(--text-faint);font-size:20px;"> : </span><span style="color:#e74c3c;">'+red+'</span>'
      +   '</div>'
      +   '<div style="color:var(--text-faint);margin-bottom:20px;">'+escapeHtml(lobby.blueTeamName||'Blue')+' vs '+escapeHtml(lobby.redTeamName||'Red')+'</div>'
      +   '<div id="dcoopGamesList" style="max-width:460px;margin:0 auto;display:flex;flex-direction:column;gap:6px;">'
      +     '<div style="color:var(--text-faint);font-size:11px;">Загрузка списка игр…</div>'
      +   '</div>'
      +   deleteBtn
      + '</div>';

    // Подгружаем список игр серии
    _db().collection('draftLobbies').doc(lobby.id).collection('games').orderBy('number','asc').get()
      .then(function(snap){
        var list = document.getElementById('dcoopGamesList');
        if (!list) return;
        if (snap.empty) { list.innerHTML = '<div style="color:var(--text-faint);font-size:11px;">Игр нет</div>'; return; }
        var rows = [];
        snap.forEach(function(d){
          var g = d.data(); g.id = d.id;
          var winCol = g.winner === 'blue' ? '#5dade2' : (g.winner === 'red' ? '#e74c3c' : 'var(--text-faint)');
          var winLabel = g.winner === 'blue' ? (lobby.blueTeamName||'Blue')
                       : (g.winner === 'red' ? (lobby.redTeamName||'Red') : '—');
          rows.push(''
            + '<div class="dcoop-game-row" onclick="dcoopReplayGame(\''+lobby.id+'\',\''+g.id+'\')" '
            +   'style="display:flex;gap:10px;align-items:center;padding:10px 12px;border:1px solid var(--accent-border-sub);border-radius:8px;cursor:pointer;background:rgba(255,255,255,0.02);">'
            +   '<div style="font-weight:900;color:#fff;">Игра '+g.number+'</div>'
            +   '<div style="flex:1;text-align:left;font-size:11px;color:var(--text-faint);">победа: <span style="color:'+winCol+';font-weight:700;">'+escapeHtml(winLabel)+'</span></div>'
            +   '<div style="font-size:13px;color:var(--accent);">▶</div>'
            + '</div>');
        });
        list.innerHTML = rows.join('');
      })
      .catch(function(e){
        console.warn('[draft] series games list', e);
      });
  }

  // ─── REPLAY (read-only просмотр отдельной игры) ───
  function replayGame(lobbyId, gameId) {
    var dbInst = _db();
    if (!dbInst) return;
    var pane = document.getElementById('dcoopPaneLobby');
    if (!pane) return;
    pane.innerHTML = '<div style="padding:30px;text-align:center;color:var(--text-faint);">Загрузка…</div>';

    // Тянем и лобби, и ВСЕ игры серии — чтобы в реплее показать навигационные кнопки 1/2/3…
    Promise.all([
      dbInst.collection('draftLobbies').doc(lobbyId).get(),
      dbInst.collection('draftLobbies').doc(lobbyId).collection('games').orderBy('number','asc').get()
    ]).then(function(results){
      var lSnap = results[0], gamesSnap = results[1];
      if (!lSnap.exists || gamesSnap.empty) {
        pane.innerHTML = '<div style="padding:30px;color:#e74c3c;text-align:center;">Игра не найдена</div>';
        return;
      }
      var l = lSnap.data(); l.id = lSnap.id;
      var allGames = [];
      var found = null;
      gamesSnap.forEach(function(d){
        var gg = d.data(); gg.id = d.id;
        allGames.push(gg);
        if (d.id === gameId) found = gg;
      });
      if (!found) { pane.innerHTML = '<div style="padding:30px;color:#e74c3c;text-align:center;">Игра не найдена</div>'; return; }
      renderReplay(l, found, allGames);
    }).catch(function(e){
      pane.innerHTML = '<div style="padding:30px;color:#e74c3c;text-align:center;">Ошибка: '+escapeHtml(e.message||'')+'</div>';
    });
  }

  // Реплей — точная копия раскладки реалтайм-драфта, но статичная (read-only).
  function renderReplay(lobby, game, allGames) {
    var pane = document.getElementById('dcoopPaneLobby');
    if (!pane) return;
    stopGameListener();
    document.body.classList.remove('pc-side-mode');
    document.body.classList.remove('pc-chat-mode');
    var _mask = document.getElementById('draftCoopMask');
    if (_mask) _mask.classList.remove('side-panel-modal');
    var _panel = document.getElementById('sidePanel');
    if (_panel) _panel.classList.remove('open');
    var _sover = document.getElementById('sideOverlay');
    if (_sover) _sover.classList.remove('open');
    document.body.classList.remove('sidebar-open');
    document.body.classList.add('dcoop-fullscreen');

    // Победитель: маппим позицию в команду (учитывая swap сторон этой игры)
    var replayRoles = sideRoles(lobby, game);
    var winningTeam = game.winner ? replayRoles[game.winner].team : null;
    var winCol = winningTeam === 'blue' ? '#5dade2' : (winningTeam === 'red' ? '#e74c3c' : 'var(--text-faint)');
    var winLabel = winningTeam === 'blue' ? (lobby.blueTeamName||'Blue')
                 : (winningTeam === 'red' ? (lobby.redTeamName||'Red') : '—');
    var isMob = isMobileDraft();

    // Навигация по играм серии (1 / 2 / 3 …)
    var navHtml = '';
    if (Array.isArray(allGames) && allGames.length > 1) {
      var navBtns = allGames.map(function(gg){
        var activeCls = (gg.id === game.id) ? ' active' : '';
        return '<button class="dcoop-replay-nav-btn'+activeCls+'" onclick="dcoopReplayGame(\''+lobby.id+'\',\''+gg.id+'\')">Игра '+gg.number+'</button>';
      }).join('');
      navHtml = '<div class="dcoop-replay-nav">'+navBtns+'</div>';
    }

    var topBar = ''
      + '<div class="dcoop-replay-topbar">'
      +   '<button onclick="dcoopOpenLobby(\''+lobby.id+'\')" class="dcoop-back-btn">← К серии</button>'
      +   '<div class="dcoop-replay-info">'
      +     '<span class="dcoop-replay-title">Игра '+game.number+' · реплей</span>'
      +     '<span class="dcoop-replay-teams">'+escapeHtml(lobby.blueTeamName||'Blue')+' vs '+escapeHtml(lobby.redTeamName||'Red')+'</span>'
      +   '</div>'
      +   '<div class="dcoop-replay-winner" style="color:'+winCol+';">🏆 '+escapeHtml(winLabel)+'</div>'
      + '</div>'
      + navHtml;

    // Header — как в реалтайме, но с свапом сторон для этой конкретной игры
    var bCap = captainBlockHtml('blue', replayRoles.blue.cap, lobby, null, replayRoles.blue.teamName, (lobby.seriesScore && lobby.seriesScore[replayRoles.blue.team]) || 0);
    var rCap = captainBlockHtml('red',  replayRoles.red.cap,  lobby, null, replayRoles.red.teamName,  (lobby.seriesScore && lobby.seriesScore[replayRoles.red.team])  || 0);
    var header;
    if (isMob) {
      header = ''
        + '<div class="dcoop-hdr dcoop-hdr-mobile">'
        +   '<div class="dcoop-hdr-row-caps">'
        +     bCap
        +     '<div class="dcoop-hdr-timer-m" style="color:var(--text-faint);">—</div>'
        +     rCap
        +   '</div>'
        +   '<div class="dcoop-hdr-row-bans">'
        +     '<div class="dcoop-hdr-bans dcoop-hdr-bans-blue">'+banSlotsHtml('blue', game, null, 'mobile')+'</div>'
        +     '<div class="dcoop-hdr-bans dcoop-hdr-bans-red">'+banSlotsHtml('red',  game, null, 'mobile')+'</div>'
        +   '</div>'
        +   '<div class="dcoop-hdr-row-picks">'
        +     '<div class="dcoop-hdr-picks dcoop-hdr-picks-blue">'+pickSlotsHtml('blue', game, null, 'mobile')+'</div>'
        +     '<div class="dcoop-hdr-picks dcoop-hdr-picks-red">'+pickSlotsHtml('red',  game, null, 'mobile')+'</div>'
        +   '</div>'
        + '</div>';
    } else {
      header = ''
        + '<div class="dcoop-hdr dcoop-hdr-pc">'
        +   '<div class="dcoop-hdr-pc-left">'+bCap+'</div>'
        +   '<div class="dcoop-hdr-timer-pc" style="color:var(--text-faint);">—</div>'
        +   '<div class="dcoop-hdr-pc-right">'+rCap+'</div>'
        + '</div>';
    }

    if (isMob) {
      // На мобиле всё помещается в header (bans+picks строками). Центр-галерея не нужна.
      pane.innerHTML = topBar + header;
      return;
    }

    // PC: тот же 3-колоночный layout что в реалтайме, но в центре — stub вместо галереи
    var layout = ''
      + '<div class="dcoop-draft-layout">'
      +   sidePanelHtml('blue', lobby, game, null)
      +   '<div class="dcoop-gallery-col" style="display:flex;align-items:center;justify-content:center;color:var(--text-faint);font-size:13px;text-align:center;padding:20px;">Драфт завершён · просмотр реплея</div>'
      +   sidePanelHtml('red', lobby, game, null)
      + '</div>';

    pane.innerHTML = topBar + header + layout;
  }

  window.dcoopReplayGame = replayGame;

  // ─── EXPORTS (draft core) ───
  window.dcoopChampClick = champClick;
  window.dcoopLockIn = lockIn;
  window.dcoopFilterRole = filterRole;
  window.dcoopFilterSearch = filterSearch;
  window.dcoopSetWinner = setWinner;
  window.dcoopNextGame = nextGame;
  window.dcoopFinishSeries = finishSeries;
  window.dcoopTogglePast = togglePast;
  window.dcoopToggleAssist = toggleAssist;
  window.dcoopToggleSpectators = toggleSpectators;
  window.dcoopCloseLobbyConfirm = closeLobbyConfirm;

  // ─── START DRAFT (создать games/1 и перейти в drafting) ───
  function startDraft(l) {
    // Защита от двойного запуска
    if (l._startingDraft) return;
    l._startingDraft = true;

    var dbInst = _db();
    // creatorSide определяет стартовую сторону; если создатель = red, меняем blueSide игры
    var game1 = {
      number: 1,
      blueSide: 'blue', // в первой игре "blueSide" всегда blue (создатель blueCaptain)
      phase: 'ban1',
      turnIndex: 0,
      currentSide: 'blue',
      currentAction: 'ban',
      turnStartedAt: firebase.firestore.FieldValue.serverTimestamp(),
      bans: { blue: [null,null,null,null,null], red: [null,null,null,null,null] },
      picks: { blue: [], red: [] },
      hover: { blue: null, red: null },
      winner: null,
      finishedAt: null
    };

    var lobbyRef = dbInst.collection('draftLobbies').doc(l.id);
    lobbyRef.collection('games').doc('1').set(game1).then(function(){
      return lobbyRef.update({
        status: 'drafting',
        currentGame: 1,
        currentGameBlueSide: 'blue',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }).catch(function(e){
      console.warn('[draft] startDraft', e);
    });
  }

  // ─── OPEN / CLOSE MODAL ───
  function open() {
    var uid = _uid();
    if (!uid) { showAuthGate(); return; }
    // Проверка URL-параметра ?draft=ID
    var params = new URLSearchParams(window.location.search);
    var lobbyParam = params.get('draft');
    if (lobbyParam) {
      openLobby(lobbyParam);
    } else {
      switchTab('my');
    }
  }

  function close() {
    stopMyLobbiesListener();
    stopLobbyListener();
    stopGameListener();
    closeUserSearch();
    _currentLobbyId = null;
    _currentLobby = null;
    document.body.classList.remove('dcoop-fullscreen');
    var _aPanel = document.getElementById('dcoopAssistPanel'); if (_aPanel) _aPanel.parentNode.removeChild(_aPanel);
  }

  // ─── ACTIVE SERIES HELPER ───
  // Возвращает список активных серий, где юзер — кап ИЛИ принятый зритель
  var ACTIVE_STATUSES = ['drafting','ready_check','finished_game','waiting'];
  function getActiveSeriesForUser(uid, excludeLobbyId) {
    var dbInst = _db();
    if (!dbInst || !uid) return Promise.resolve([]);
    var ref = dbInst.collection('draftLobbies');
    return Promise.all([
      ref.where('blueCaptain.uid','==',uid).get().catch(function(){ return null; }),
      ref.where('redCaptain.uid','==',uid).get().catch(function(){ return null; }),
      ref.where('invitedSpectators','array-contains',uid).get().catch(function(){ return null; })
    ]).then(function(results){
      var byId = {};
      results.forEach(function(snap){
        if (!snap) return;
        snap.forEach(function(d){
          var l = d.data(); l.id = d.id;
          if (excludeLobbyId && l.id === excludeLobbyId) return;
          if (ACTIVE_STATUSES.indexOf(l.status) === -1) return;
          byId[l.id] = l;
        });
      });
      return Object.keys(byId).map(function(k){ return byId[k]; });
    });
  }

  // ─── AUTO-REDIRECT to active lobby (кап или зритель) ───
  function checkCaptainAutoRedirect() {
    var uid = _uid();
    if (!uid) return;
    getActiveSeriesForUser(uid, null).then(function(active){
      if (!active.length) return;
      // Приоритет: я кап > я зритель; затем drafting > finished_game > ready_check > waiting; затем свежайший
      var priority = { drafting: 4, finished_game: 3, ready_check: 2, waiting: 1 };
      active.forEach(function(l){
        l._iAmCap = (l.blueCaptain && l.blueCaptain.uid === uid) || (l.redCaptain && l.redCaptain.uid === uid);
      });
      active.sort(function(a,b){
        if (a._iAmCap !== b._iAmCap) return a._iAmCap ? -1 : 1;
        var pa = priority[a.status] || 0, pb = priority[b.status] || 0;
        if (pa !== pb) return pb - pa;
        var ta = (a.updatedAt && a.updatedAt.toMillis && a.updatedAt.toMillis()) || 0;
        var tb = (b.updatedAt && b.updatedAt.toMillis && b.updatedAt.toMillis()) || 0;
        return tb - ta;
      });
      if (_currentLobbyId) return;
      var target = active[0];
      if (window.openDraftCoop) window.openDraftCoop();
      setTimeout(function(){ openLobby(target.id); }, 200);
    }).catch(function(e){ console.warn('[draft] auto-redirect', e); });
  }
  window.dcoopCheckCaptainAutoRedirect = checkCaptainAutoRedirect;

  // ─── EXPORTS ───
  window.openDraftCoop = function() {
    if (window.openModal) window.openModal('draftCoopMask');
    open();
  };
  window.closeDraftCoop = function() {
    close();
    if (window.closeModal) window.closeModal('draftCoopMask');
  };
  window.dcoopSwitchTab = switchTab;
  window.dcoopCreateLobby = createLobby;
  window.dcoopOpenLobby = openLobby;
  window.dcoopBackToList = backToList;
  window.dcoopToggleReady = toggleReady;
  window.dcoopDeleteLobby = deleteLobby;
  window.dcoopInviteCaptain = function(side){ openUserSearch(side === 'blue' ? 'captainBlue' : 'captainRed'); };
  window.dcoopInviteSpectator = function(){ openUserSearch('spectator'); };
  window.dcoopCloseSearch = closeUserSearch;
  window.dcoopPickUser = pickUser;
  window.dcoopRemoveSpectator = removeSpectator;
  window.dcoopCopyInvite = copyInviteLink;

  // Переоткрыть при логине, если модалка сейчас открыта
  // + Автоматический переход на активное капитанское лобби
  var _autoRedirectChecked = false;
  document.addEventListener('DOMContentLoaded', function(){
    try {
      firebase.auth().onAuthStateChanged(function(user){
        var mask = document.getElementById('draftCoopMask');
        var visible = mask && mask.classList.contains('active');
        if (visible) {
          if (user) open(); else showAuthGate();
        }
        // Авто-редирект капитанов на активное лобби (один раз на сессию)
        if (user && !_autoRedirectChecked) {
          _autoRedirectChecked = true;
          setTimeout(checkCaptainAutoRedirect, 1500);
        }
        // Запуск listeners приглашений при логине
        if (user) startInvitesListeners();
        else stopInvitesListeners();
      });
    } catch(e) {}
  });

  // ?draft=ID deeplink обрабатывается в app.js после прохождения auth-gate и profile-setup
})();
