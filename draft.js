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

    if (tab !== 'lobby') stopLobbyListener();
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
    return ''
      + '<div class="dcoop-lobby-card" data-lobby-id="'+l.id+'">'
      +   '<div style="flex:1;min-width:0;">'
      +     '<div class="dcoop-lc-title">'+blue+' <span style="color:var(--text-faint);">vs</span> '+red+'</div>'
      +     '<div class="dcoop-lc-meta">'+mode+' · '+series+' · '+date+'</div>'
      +   '</div>'
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
      + '<div style="background:var(--bg-base);border:1px solid var(--accent-border);border-radius:12px;width:100%;max-width:420px;padding:16px;display:flex;flex-direction:column;gap:10px;max-height:80vh;">'
      +   '<div style="font-size:14px;font-weight:900;color:#fff;">'+ (titles[mode] || 'Поиск юзера') +'</div>'
      +   '<input id="dcoopSearchInput" type="text" placeholder="Введите ник (минимум 2 символа)" style="padding:10px 12px;border:1px solid var(--accent-border);background:var(--bg-primary);color:#fff;border-radius:8px;font-size:13px;outline:none;">'
      +   '<div id="dcoopSearchResults" style="overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:4px;min-height:80px;"><div style="color:var(--text-faint);font-size:11px;text-align:center;padding:20px;">Начните вводить ник</div></div>'
      +   '<button onclick="dcoopCloseSearch()" style="padding:8px;border:1px solid var(--accent-border);background:transparent;color:#fff;border-radius:8px;cursor:pointer;font-size:12px;">Отмена</button>'
      + '</div>';
    document.body.appendChild(overlay);
    _searchOverlay = overlay;

    var inp = document.getElementById('dcoopSearchInput');
    var timer = null;
    inp.addEventListener('input', function(){
      if (timer) clearTimeout(timer);
      timer = setTimeout(function(){ doSearch(inp.value.trim()); }, 250);
    });
    setTimeout(function(){ inp.focus(); }, 50);
  }

  function closeUserSearch() {
    if (_searchOverlay && _searchOverlay.parentNode) {
      _searchOverlay.parentNode.removeChild(_searchOverlay);
    }
    _searchOverlay = null;
  }

  function doSearch(query) {
    var results = document.getElementById('dcoopSearchResults');
    if (!results) return;
    if (query.length < 2) {
      results.innerHTML = '<div style="color:var(--text-faint);font-size:11px;text-align:center;padding:20px;">Начните вводить ник</div>';
      return;
    }
    var q = query.toLowerCase();
    var dbInst = _db();
    if (!dbInst) return;
    results.innerHTML = '<div style="color:var(--text-faint);font-size:11px;text-align:center;padding:20px;">Поиск…</div>';

    // Префиксный поиск по nickLower
    dbInst.collection('users')
      .where('nickLower','>=', q)
      .where('nickLower','<=', q + '\uf8ff')
      .limit(12)
      .get()
      .then(function(snap){
        var me = _uid();
        var rows = [];
        snap.forEach(function(d){
          var u = d.data(); u.uid = d.id;
          if (u.uid === me) return;
          rows.push(u);
        });
        if (!rows.length) {
          results.innerHTML = '<div style="color:var(--text-faint);font-size:11px;text-align:center;padding:20px;">Никого не найдено</div>';
          return;
        }
        results.innerHTML = rows.map(function(u){
          var nick = escapeHtml(u.displayName || '?');
          var online = u.online ? '<span style="color:#2ecc71;">● online</span>' : '<span style="color:var(--text-faint);">● offline</span>';
          return ''
            + '<div onclick="dcoopPickUser(\''+u.uid+'\',\''+encodeURIComponent(u.displayName||'')+'\')" '
            +   'style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--accent-border-sub);border-radius:8px;cursor:pointer;">'
            +   '<div style="flex:1;"><div style="font-weight:700;color:#fff;font-size:13px;">'+nick+'</div><div style="font-size:10px;">'+online+'</div></div>'
            +   '<div style="font-size:16px;color:var(--accent);">→</div>'
            + '</div>';
        }).join('');
      })
      .catch(function(err){
        console.warn('[draft] search error', err);
        results.innerHTML = '<div style="color:#e74c3c;font-size:11px;text-align:center;padding:20px;">Ошибка поиска. Возможно, поле nickLower ещё не заполнено у пользователей.</div>';
      });
  }

  function pickUser(uid, nickEncoded) {
    var nick = decodeURIComponent(nickEncoded || '');
    var l = _currentLobby;
    if (!l) { closeUserSearch(); return; }
    var dbInst = _db();

    if (_searchMode === 'captainBlue' || _searchMode === 'captainRed') {
      var side = _searchMode === 'captainBlue' ? 'blue' : 'red';
      var capField = side === 'blue' ? 'blueCaptain' : 'redCaptain';
      var other = side === 'blue' ? l.redCaptain : l.blueCaptain;
      if (l[capField] && l[capField].uid) { toast('Капитан уже назначен'); closeUserSearch(); return; }
      if (other && other.uid === uid) { toast('Нельзя пригласить того же юзера'); return; }
      var patch = {};
      patch[capField] = { uid: uid, nick: nick };
      patch.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
      dbInst.collection('draftLobbies').doc(l.id).update(patch)
        .then(function(){ toast('Капитан приглашён'); closeUserSearch(); })
        .catch(function(e){ toast('Ошибка: '+e.message); });
    } else if (_searchMode === 'spectator') {
      var list = (l.invitedSpectators || []).slice();
      if (list.indexOf(uid) !== -1) { toast('Уже приглашён'); closeUserSearch(); return; }
      if (list.length >= 12) { toast('Максимум 12 зрителей'); return; }
      list.push(uid);
      var nicks = Object.assign({}, l.spectatorNicks || {});
      nicks[uid] = nick;
      dbInst.collection('draftLobbies').doc(l.id).update({
        invitedSpectators: list,
        spectatorNicks: nicks,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }).then(function(){ toast('Зритель приглашён'); closeUserSearch(); })
        .catch(function(e){ toast('Ошибка: '+e.message); });
    }
  }

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

    var uid = _uid();
    var mySide = null;
    if (lobby.blueCaptain && lobby.blueCaptain.uid === uid) mySide = 'blue';
    else if (lobby.redCaptain && lobby.redCaptain.uid === uid) mySide = 'red';
    var iAmCaptain = !!mySide;

    var step = WR_DRAFT_SEQUENCE[game.turnIndex] || null;
    var myTurn = iAmCaptain && step && step.side === mySide && game.phase !== 'done';
    var fearlessLock = lobby.mode === 'fearless' ? (lobby.usedChampions || []) : [];
    var unavail = getUnavailable(game, fearlessLock);

    pane.innerHTML = ''
      + topBarHtml(lobby, game, step)
      + fearlessLockHtml(fearlessLock)
      + '<div class="dcoop-draft-layout">'
      +   sidePanelHtml('blue', lobby, game, step)
      +   '<div class="dcoop-gallery-col">'
      +     gallerySearchHtml()
      +     '<div id="dcoopGallery" class="dcoop-gallery"></div>'
      +     lockInBtnHtml(myTurn, game, step)
      +   '</div>'
      +   sidePanelHtml('red', lobby, game, step)
      + '</div>';

    // Render gallery
    renderGallery(lobby, game, step, mySide, unavail);

    // Start timer
    startTimer(lobby, game, step, mySide);

    if (game.phase === 'done' || game.turnIndex >= SEQ_LEN) {
      if (game.winner) {
        // Победитель уже выбран — показываем экран "между играми" или "серия завершена"
        if (lobby.status === 'series_done' || lobby.status === 'closed') {
          renderSeriesDone(lobby, pane);
        } else {
          renderBetweenGames(lobby);
        }
      } else {
        renderGameFinished(lobby, game);
      }
    }
  }

  function topBarHtml(lobby, game, step) {
    var phaseText = {ban1:'Баны 1',pick1:'Пики 1',ban2:'Баны 2',pick2:'Пики 2',done:'Драфт завершён'}[game.phase] || game.phase;
    var sideCol = step ? (step.side === 'blue' ? '#5dade2' : '#e74c3c') : 'var(--text-faint)';
    var sideText = step ? (step.side === 'blue' ? 'СИНИЕ' : 'КРАСНЫЕ') : '—';
    var actionText = step ? (step.action === 'ban' ? 'БАНЯТ' : 'ПИКАЮТ') : '';

    return ''
      + '<div class="dcoop-topbar">'
      +   '<button onclick="dcoopBackToList()" class="dcoop-back-btn">← К списку</button>'
      +   '<div class="dcoop-topbar-info">'
      +     '<span style="font-weight:900;color:#fff;">'+escapeHtml(lobby.blueTeamName||'Blue')+' vs '+escapeHtml(lobby.redTeamName||'Red')+'</span>'
      +     '<span style="color:var(--text-faint);font-size:11px;">Игра '+ (game.number || lobby.currentGame || 1) +'</span>'
      +     '<span style="color:var(--text-faint);font-size:11px;">'+phaseText+'</span>'
      +   '</div>'
      +   '<div class="dcoop-turn-info" style="color:'+sideCol+';">'+sideText+' '+actionText+'</div>'
      +   '<div id="dcoopTimer" class="dcoop-timer">--</div>'
      + '</div>';
  }

  function fearlessLockHtml(list) {
    if (!list || !list.length) return '';
    var icons = list.map(function(n){
      var img = window._champIcon ? window._champIcon(n) : '';
      return '<img src="'+img+'" alt="'+escapeHtml(n)+'" title="'+escapeHtml(n)+'" class="dcoop-fearless-icon" onerror="this.style.display=\'none\'">';
    }).join('');
    return '<div class="dcoop-fearless-bar"><span class="dcoop-fearless-label">🔒 Fearless ('+list.length+'):</span>'+icons+'</div>';
  }

  function sidePanelHtml(side, lobby, game, step) {
    var col = side === 'blue' ? '#5dade2' : '#e74c3c';
    var emoji = side === 'blue' ? '🔵' : '🔴';
    var teamName = side === 'blue' ? (lobby.blueTeamName||'Blue') : (lobby.redTeamName||'Red');
    var bans = game.bans[side] || [];
    var picks = game.picks[side] || [];
    var hover = game.hover[side] || null;
    var activeBanIdx = (step && step.side === side && step.action === 'ban') ? step.banIdx : -1;
    var activePickIdx = (step && step.side === side && step.action === 'pick') ? step.pickIdx : -1;

    var banSlots = [0,1,2,3,4].map(function(i){
      var n = bans[i];
      var cls = 'dcoop-ban-slot';
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

    var pickSlots = [0,1,2,3,4].map(function(i){
      var p = picks[i];
      var cls = 'dcoop-pick-slot';
      var html = '<span class="dcoop-slot-placeholder">'+(i+1)+'</span>';
      if (p && p.champ) {
        var img = window._champIcon ? window._champIcon(p.champ) : '';
        html = '<img src="'+img+'" alt="'+escapeHtml(p.champ)+'" onerror="this.style.display=\'none\'"><div class="dcoop-pick-name">'+escapeHtml(p.champ)+'</div>';
      } else if (i === activePickIdx && hover) {
        var imgh = window._champIcon ? window._champIcon(hover) : '';
        html = '<img src="'+imgh+'" alt="'+escapeHtml(hover)+'" style="opacity:0.45;" onerror="this.style.display=\'none\'"><div class="dcoop-pick-name" style="opacity:0.5;">'+escapeHtml(hover)+'</div>';
        cls += ' dcoop-active-slot';
      } else if (i === activePickIdx) {
        cls += ' dcoop-active-slot';
      }
      return '<div class="'+cls+'">'+html+'</div>';
    }).join('');

    return ''
      + '<div class="dcoop-side-panel" style="--side-col:'+col+';">'
      +   '<div class="dcoop-side-header">'+emoji+' '+escapeHtml(teamName)+'</div>'
      +   '<div class="dcoop-bans-label">Баны</div>'
      +   '<div class="dcoop-bans-row">'+banSlots+'</div>'
      +   '<div class="dcoop-picks-label">Пики</div>'
      +   '<div class="dcoop-picks-col">'+pickSlots+'</div>'
      + '</div>';
  }

  function gallerySearchHtml() {
    var roles = [
      {k:'all',l:'Все'},{k:'Top',l:'Top'},{k:'Jungle',l:'JG'},
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
  var _filterRole = 'all';
  var _filterQuery = '';

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
      if (_filterRole !== 'all' && !c.roles[_filterRole]) return false;
      if (q && c.name.toLowerCase().indexOf(q) === -1) return false;
      return true;
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
  function onTimerExpired(lobby, game, step, mySide) {
    // Только капитан своей стороны делает auto-action
    if (!step || step.side !== mySide) return;
    var key = lobby.id + '-' + game.number + '-' + game.turnIndex;
    if (_autoActionFired[key]) return;
    _autoActionFired[key] = 1;

    if (step.action === 'ban') {
      // пропуск бана (null)
      var patch = { turnStartedAt: firebase.firestore.FieldValue.serverTimestamp() };
      var bans = (game.bans[step.side] || []).slice();
      bans[step.banIdx] = null;
      patch['bans.' + step.side] = bans;
      patch['hover.' + step.side] = null;
      var nextIdx = game.turnIndex + 1;
      patch.turnIndex = nextIdx;
      if (nextIdx >= SEQ_LEN) { patch.phase='done'; patch.finishedAt=firebase.firestore.FieldValue.serverTimestamp(); }
      else {
        var ns = WR_DRAFT_SEQUENCE[nextIdx];
        patch.phase = ns.phase; patch.currentSide = ns.side; patch.currentAction = ns.action;
      }
      _db().collection('draftLobbies').doc(lobby.id).collection('games').doc(String(game.number)).update(patch);
    } else {
      // Пик: если есть hover — фиксируем, иначе рандом
      var pick = game.hover && game.hover[step.side];
      if (!pick) {
        var fl = lobby.mode==='fearless' ? (lobby.usedChampions||[]) : [];
        var un = getUnavailable(game, fl);
        var pool = getAllChamps().map(function(c){return c.name;}).filter(function(n){ return !un[n]; });
        if (!pool.length) return;
        pick = pool[Math.floor(Math.random()*pool.length)];
      }
      applyLockIn(lobby, game, step, pick, step.side);
    }
  }

  function renderGameFinished(lobby, game) {
    // Оверлей с кнопками "Синие победили / Красные победили / Следующая игра / Завершить серию"
    var pane = document.getElementById('dcoopPaneLobby');
    if (!pane) return;
    var uid = _uid();
    var isCreator = lobby.createdBy === uid;
    if (!isCreator) return; // Остальные просто видят финал

    // Проверяем — результат уже проставлен?
    if (game.winner) return;

    var overlay = document.createElement('div');
    overlay.className = 'dcoop-game-overlay';
    overlay.innerHTML = ''
      + '<div class="dcoop-game-overlay-win">'
      +   '<div style="font-size:18px;font-weight:900;margin-bottom:12px;">Игра '+game.number+' завершена</div>'
      +   '<div style="margin-bottom:14px;color:var(--text-faint);">Кто победил?</div>'
      +   '<div style="display:flex;gap:10px;justify-content:center;">'
      +     '<button class="dcoop-submit" style="background:#5dade2;flex:1;" onclick="dcoopSetWinner(\'blue\')">🔵 '+escapeHtml(lobby.blueTeamName||'Blue')+'</button>'
      +     '<button class="dcoop-submit" style="background:#e74c3c;flex:1;" onclick="dcoopSetWinner(\'red\')">🔴 '+escapeHtml(lobby.redTeamName||'Red')+'</button>'
      +   '</div>'
      + '</div>';
    pane.appendChild(overlay);
  }

  function setWinner(side) {
    var l = _currentLobby, g = _currentGame;
    if (!l || !g) return;
    var dbInst = _db();
    var scoreField = side === 'blue' ? 'seriesScore.blue' : 'seriesScore.red';
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

    // Проверяем — серия завершена?
    var targetWins = { bo1:1, bo3:2, bo5:3, bo7:4, infinite:999 }[l.seriesType] || 1;
    var newBlue = (l.seriesScore && l.seriesScore.blue || 0) + (side==='blue'?1:0);
    var newRed  = (l.seriesScore && l.seriesScore.red  || 0) + (side==='red' ?1:0);
    var seriesDone = (newBlue >= targetWins || newRed >= targetWins) && l.seriesType !== 'infinite';

    if (seriesDone) patch.status = 'series_done';
    else patch.status = 'finished_game'; // ждём "следующая игра"

    // Помечаем winner в документе игры
    var lobbyRef = dbInst.collection('draftLobbies').doc(l.id);
    Promise.all([
      lobbyRef.collection('games').doc(String(g.number)).update({ winner: side }),
      lobbyRef.update(patch)
    ]).catch(function(e){ toast('Ошибка: '+e.message); });
  }

  function nextGame(swapSides) {
    var l = _currentLobby;
    if (!l) return;
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

  function renderBetweenGames(lobby) {
    // Ждём подгрузки игры через listener, но заранее показываем "между играми" экран
    var pane = document.getElementById('dcoopPaneLobby');
    if (!pane) return;
    var uid = _uid();
    var isCreator = lobby.createdBy === uid;
    var blue = lobby.seriesScore && lobby.seriesScore.blue || 0;
    var red  = lobby.seriesScore && lobby.seriesScore.red  || 0;
    var controls = isCreator
      ? '<div style="display:flex;gap:10px;margin-top:14px;justify-content:center;">'
        + '<button class="dcoop-submit" style="flex:1;max-width:200px;" onclick="dcoopNextGame(false)">▶ Следующая игра</button>'
        + '<button class="dcoop-submit" style="flex:1;max-width:200px;background:rgba(231,76,60,0.2);border:1px solid #e74c3c;" onclick="dcoopNextGame(true)">🔄 Swap + След. игра</button>'
        + '<button class="dcoop-submit" style="flex:1;max-width:200px;background:var(--accent-dim);color:var(--accent);" onclick="dcoopFinishSeries()">🏁 Завершить серию</button>'
        + '</div>'
      : '<div style="text-align:center;color:var(--text-faint);margin-top:14px;">Ожидание решения создателя лобби…</div>';

    pane.innerHTML = ''
      + '<div style="padding:30px;text-align:center;">'
      +   '<button onclick="dcoopBackToList()" style="position:absolute;top:12px;left:12px;background:none;border:1px solid var(--accent-border);color:#fff;padding:6px 12px;border-radius:8px;font-size:12px;cursor:pointer;">← К списку</button>'
      +   '<div style="font-size:20px;font-weight:900;margin-bottom:14px;">🏆 Счёт серии</div>'
      +   '<div style="font-size:36px;font-weight:900;margin-bottom:20px;">'
      +     '<span style="color:#5dade2;">'+blue+'</span>'
      +     '<span style="color:var(--text-faint);font-size:24px;"> : </span>'
      +     '<span style="color:#e74c3c;">'+red+'</span>'
      +   '</div>'
      +   '<div style="color:var(--text-faint);margin-bottom:8px;">'+escapeHtml(lobby.blueTeamName||'Blue')+' vs '+escapeHtml(lobby.redTeamName||'Red')+'</div>'
      +   controls
      + '</div>';
  }

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

    Promise.all([
      dbInst.collection('draftLobbies').doc(lobbyId).get(),
      dbInst.collection('draftLobbies').doc(lobbyId).collection('games').doc(gameId).get()
    ]).then(function(results){
      var lSnap = results[0], gSnap = results[1];
      if (!lSnap.exists || !gSnap.exists) {
        pane.innerHTML = '<div style="padding:30px;color:#e74c3c;text-align:center;">Игра не найдена</div>';
        return;
      }
      var l = lSnap.data(); l.id = lSnap.id;
      var g = gSnap.data(); g.id = gSnap.id;
      renderReplay(l, g);
    }).catch(function(e){
      pane.innerHTML = '<div style="padding:30px;color:#e74c3c;text-align:center;">Ошибка: '+escapeHtml(e.message||'')+'</div>';
    });
  }

  function renderReplay(lobby, game) {
    var pane = document.getElementById('dcoopPaneLobby');
    if (!pane) return;
    stopGameListener();
    var winCol = game.winner === 'blue' ? '#5dade2' : (game.winner === 'red' ? '#e74c3c' : 'var(--text-faint)');
    var winLabel = game.winner === 'blue' ? (lobby.blueTeamName||'Blue')
                 : (game.winner === 'red' ? (lobby.redTeamName||'Red') : '—');
    var endTs = '';
    if (game.finishedAt && game.finishedAt.toDate) {
      var d = game.finishedAt.toDate();
      endTs = d.toLocaleString('ru-RU');
    }
    pane.innerHTML = ''
      + '<div class="dcoop-topbar">'
      +   '<button onclick="dcoopOpenLobby(\''+lobby.id+'\')" class="dcoop-back-btn">← К серии</button>'
      +   '<div class="dcoop-topbar-info">'
      +     '<span style="font-weight:900;color:#fff;">'+escapeHtml(lobby.blueTeamName||'Blue')+' vs '+escapeHtml(lobby.redTeamName||'Red')+'</span>'
      +     '<span style="color:var(--text-faint);font-size:11px;">Игра '+game.number+' · реплей</span>'
      +   '</div>'
      +   '<div style="color:'+winCol+';font-weight:900;font-size:13px;">🏆 '+escapeHtml(winLabel)+'</div>'
      + '</div>'
      + (endTs ? '<div style="padding:6px 12px;color:var(--text-faint);font-size:11px;border-bottom:1px solid var(--accent-border-sub);">Завершено: '+endTs+'</div>' : '')
      + '<div class="dcoop-draft-layout" style="grid-template-columns:1fr 1fr;">'
      +   sidePanelHtml('blue', lobby, game, null)
      +   sidePanelHtml('red',  lobby, game, null)
      + '</div>';
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
    closeUserSearch();
    _currentLobbyId = null;
    _currentLobby = null;
  }

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
  document.addEventListener('DOMContentLoaded', function(){
    try {
      firebase.auth().onAuthStateChanged(function(user){
        var mask = document.getElementById('draftCoopMask');
        var visible = mask && mask.classList.contains('active');
        if (!visible) return;
        if (user) open(); else showAuthGate();
      });
    } catch(e) {}
  });

  // Автовход по ?draft=ID на старте страницы
  window.addEventListener('load', function(){
    var params = new URLSearchParams(window.location.search);
    if (params.get('draft')) {
      setTimeout(function(){ if (window.openDraftCoop) window.openDraftCoop(); }, 800);
    }
  });
})();
