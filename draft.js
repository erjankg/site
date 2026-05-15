/* ═══════════════════════════════════════════
   DRAFT COOP — кооперативный драфт (серии между капитанами)
   Firestore: /draftLobbies/{id}, /draftLobbies/{id}/games/{gameN}
   Этап 1: каркас + вкладки
   Этап 2: создание лобби + waiting room + приглашения
   ═══════════════════════════════════════════ */
(function(){
  'use strict';

  // Лимиты, синхронизируй с firestore.rules при изменении
  var MAX_SPECTATORS = 12;

  // ───── Sound system (WebAudio bleeps, без внешних файлов) ─────
  var SOUND_PREF_KEY = '_dcoopSoundOn';
  function isSoundOn() {
    try { var v = localStorage.getItem(SOUND_PREF_KEY); return v === null ? true : v === '1'; }
    catch(e) { return true; }
  }
  function setSoundOn(on) {
    try { localStorage.setItem(SOUND_PREF_KEY, on ? '1' : '0'); } catch(e) {}
  }
  var _audioCtx = null;
  function _ctx() {
    if (_audioCtx) return _audioCtx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { _audioCtx = new AC(); } catch(e) { return null; }
    return _audioCtx;
  }
  // Короткий «блип» по частоте + длительность (мс)
  function _beep(freq, durMs, type, gain) {
    if (!isSoundOn()) return;
    var ctx = _ctx();
    if (!ctx) return;
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch(e){} }
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(gain || 0.18, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durMs / 1000);
    osc.connect(g).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durMs / 1000 + 0.02);
  }
  function playTickSound() { _beep(880, 90, 'sine', 0.15); }            // последние секунды
  function playUrgentSound() { _beep(1320, 140, 'square', 0.18); }       // последняя секунда
  function playTurnSound() {                                              // твой ход начался
    _beep(660, 90, 'triangle', 0.16);
    setTimeout(function(){ _beep(990, 110, 'triangle', 0.16); }, 90);
  }
  function playEndSound() { _beep(440, 200, 'sawtooth', 0.12); }          // драфт завершён

  var db = null;
  var _unsubMyLobbies = null;
  var _unsubLobby = null;
  var _currentTab = 'my'; // 'my' | 'create' | 'lobby'
  var _currentLobbyId = null;
  var _currentLobby = null;
  var _lastWaitingKey = '';
  var _globalBansList = [];
  var _pendingShareToken = null; // shareToken из ?t= при открытии по ссылке

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

  // ─── Server time sync (anti-clock-skew для таймера драфта) ──────────────
  // Часы устройств могут расходиться на секунды от NTP/провайдера. Без коррекции
  // таймер у двух кэпов идёт с разной скоростью: один видит "5с", другой "8с".
  // Замеряем offset (Date.now() - serverTime) один раз при открытии лобби,
  // и потом везде используем `_serverNow()` вместо `Date.now()`.
  var _serverOffsetMs = 0;
  function _serverNow() { return Date.now() - _serverOffsetMs; }
  function _measureServerOffset() {
    var dbInst = _db();
    var uid = _uid();
    if (!dbInst || !uid) return;
    var ref = dbInst.collection('users').doc(uid);
    var t0 = Date.now();
    // merge:true — не затираем остальные поля юзера
    ref.set({ lastSeen: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true })
      .then(function(){ return ref.get(); })
      .then(function(snap){
        var t1 = Date.now();
        var data = snap.exists ? snap.data() : null;
        var ls = data && data.lastSeen;
        if (!ls || !ls.toMillis) return;
        var serverTs = ls.toMillis();
        // Локальное время в момент когда сервер записал штамп ≈ t0 + (t1 - t0) / 2.
        var localAtServerWrite = t0 + (t1 - t0) / 2;
        _serverOffsetMs = localAtServerWrite - serverTs;
      })
      .catch(function(){ /* fallback offset=0 — текущее поведение */ });
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

  // ─── GLOBAL BANS PICKER (create form) ───
  function renderGlobalBansPreview() {
    var el = document.getElementById('dcoopGlobalBansPreview');
    if (!el) return;
    if (!_globalBansList.length) {
      el.innerHTML = '<span style="color:var(--text-faint);font-size:11px;">Не выбрано</span>';
      return;
    }
    el.innerHTML = _globalBansList.map(function(n){
      var img = window._champIcon ? window._champIcon(n) : '';
      return '<div onclick="dcoopRemoveGlobalBan(\''+encodeURIComponent(n)+'\')" title="'+escapeHtml(n)+' — убрать" style="position:relative;cursor:pointer;width:36px;height:36px;flex-shrink:0;">'
        + '<img loading="lazy" decoding="async" src="'+img+'" style="width:36px;height:36px;border-radius:6px;border:1.5px solid rgba(231,76,60,0.6);" onerror="this.style.display=\'none\'">'
        + '<div style="position:absolute;top:-4px;right:-4px;width:14px;height:14px;border-radius:50%;background:#e74c3c;display:flex;align-items:center;justify-content:center;font-size:8px;color:#fff;font-weight:900;pointer-events:none;">✕</div>'
        + '</div>';
    }).join('');
  }

  window.dcoopOpenGlobalBansPicker = function() {
    if (!window.openChampPicker) { toast('Загрузка…'); return; }
    openChampPicker('⛔ Глобальные баны серии', function(c) {
      if (_globalBansList.indexOf(c.name) === -1) _globalBansList.push(c.name);
      renderGlobalBansPreview();
    }, {
      multi: true,
      getSelected: function() { return _globalBansList.slice(); },
      onRemove: function(c) {
        _globalBansList = _globalBansList.filter(function(n){ return n !== c.name; });
        renderGlobalBansPreview();
      }
    });
  };

  window.dcoopRemoveGlobalBan = function(nameEncoded) {
    var name = decodeURIComponent(nameEncoded);
    _globalBansList = _globalBansList.filter(function(n){ return n !== name; });
    renderGlobalBansPreview();
  };

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
      globalBans: _globalBansList.slice(),
      creatorSide: mySide
    };

    dbInst.collection('draftLobbies').add(lobby).then(function(ref){
      _globalBansList = [];
      renderGlobalBansPreview();
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

  function openLobby(id, shareToken) {
    _replayCache = null; // сбрасываем кэш при смене лобби
    _currentLobbyId = id;
    _pendingShareToken = shareToken || null;
    stopLobbyListener();
    stopChatListener();
    startChatListener(id);
    switchTab('lobby');

    var dbInst = _db();
    if (!dbInst) return;
    // Сверяем локальные часы с серверными — иначе таймер драфта идёт с разной
    // скоростью у двух игроков (расхождение часов устройств ≈ секунды).
    _measureServerOffset();
    var pane = document.getElementById('dcoopPaneLobby');
    if (pane) pane.innerHTML = '<div style="padding:30px;text-align:center;color:var(--text-faint);">Загрузка лобби…</div>';

    _unsubLobby = dbInst.collection('draftLobbies').doc(id).onSnapshot(function(snap){
      if (!snap.exists) {
        if (pane) pane.innerHTML = '<div style="padding:30px;text-align:center;color:#e74c3c;">Лобби не найдено или удалено</div>';
        return;
      }
      var l = snap.data(); l.id = snap.id;

      // Detect "kicked": я был зрителем в прошлом снепшоте, но меня нет в новом.
      // Капитанов/создателя такая логика не трогает (их слот хранится отдельно).
      var meUid = _uid();
      if (meUid && _currentLobby && _currentLobby.id === l.id) {
        var wasSpec = (_currentLobby.invitedSpectators || []).indexOf(meUid) !== -1;
        var stillSpec = (l.invitedSpectators || []).indexOf(meUid) !== -1;
        var isCreator = l.createdBy === meUid;
        var isCap = (l.blueCaptain && l.blueCaptain.uid === meUid)
                 || (l.redCaptain  && l.redCaptain.uid  === meUid);
        if (wasSpec && !stillSpec && !isCreator && !isCap) {
          _currentLobby = l;
          stopGameListener();
          stopLobbyListener();
          toast('Вас удалили из лобби');
          setTimeout(backToList, 600);
          return;
        }
      }
      _currentLobby = l;

      // Авто-вход как зритель по share-ссылке (один раз на открытие)
      if (_pendingShareToken) {
        var token = _pendingShareToken;
        _pendingShareToken = null;
        var uid = _uid();
        if (uid && l.shareToken && l.shareToken === token) {
          var isCap2 = (l.blueCaptain && l.blueCaptain.uid === uid) || (l.redCaptain && l.redCaptain.uid === uid);
          var isCreator2 = l.createdBy === uid;
          var alreadySpec = (l.invitedSpectators || []).indexOf(uid) !== -1;
          if (!isCap2 && !isCreator2 && !alreadySpec && (l.invitedSpectators || []).length < MAX_SPECTATORS) {
            joinAsSpectatorViaLink(l, uid);
          }
        }
      }

      renderLobby(l);
    }, function(err){
      console.warn('[draft] lobby listener', err);
      if (pane) pane.innerHTML = '<div style="padding:30px;text-align:center;color:#e74c3c;">Нет доступа к лобби</div>';
    });
  }

  // Зритель добавляет себя по shareToken (server-side проверит совпадение токена)
  function joinAsSpectatorViaLink(l, uid) {
    var nick = _myNick();
    var dbInst = _db();
    if (!dbInst) return;
    var lobbyRef = dbInst.collection('draftLobbies').doc(l.id);
    // Транзакция: read-modify-write атомарно — иначе при гонке двух зрителей
    // последний перезатрёт первого.
    dbInst.runTransaction(function(tx){
      return tx.get(lobbyRef).then(function(snap){
        if (!snap.exists) return;
        var data = snap.data();
        var list = (data.invitedSpectators || []).slice();
        if (list.indexOf(uid) !== -1) return; // уже зашёл
        if (list.length >= MAX_SPECTATORS) return; // слот переполнен
        list.push(uid);
        var nicks = Object.assign({}, data.spectatorNicks || {});
        nicks[uid] = nick;
        tx.update(lobbyRef, {
          invitedSpectators: list,
          spectatorNicks: nicks,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });
    }).then(function(){
      console.info('[draft] joined as spectator via link');
    }).catch(function(e){ console.warn('[draft] join-spectator-via-link', e); });
  }

  // Получатель сам финализирует принятый инвайт-спектатор (без ожидания отправителя)
  function selfAddSpectatorViaInvite(invite) {
    var dbInst = _db();
    if (!dbInst || !invite) return;
    var uid = _uid();
    if (!uid || uid !== invite.toUid || invite.role !== 'spectator') return;
    var lobbyRef = dbInst.collection('draftLobbies').doc(invite.lobbyId);
    // Транзакция (race-safe): два зрителя одновременно жмут "Принять" — оба попадут
    dbInst.runTransaction(function(tx){
      return tx.get(lobbyRef).then(function(snap){
        if (!snap.exists) return;
        var l = snap.data();
        var list = (l.invitedSpectators || []).slice();
        if (list.indexOf(uid) !== -1) return; // уже в списке
        if (list.length >= MAX_SPECTATORS) return; // слот переполнен
        list.push(uid);
        var nicks = Object.assign({}, l.spectatorNicks || {});
        nicks[uid] = invite.toNick || _myNick();
        tx.update(lobbyRef, {
          invitedSpectators: list,
          spectatorNicks: nicks,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });
    }).then(function(){
      dbInst.collection('draftInvites').doc(invite.id).update({ status: 'finalized' }).catch(function(){});
      console.info('[draft] self-finalized spectator invite');
    }).catch(function(e){ console.warn('[draft] self-add-spectator-via-invite', e); });
  }

  function renderWaitingRoom(l, pane) {
    // Skip full rerender if nothing visually relevant changed (prevents button jitter)
    var key = [
      l.blueCaptain && l.blueCaptain.uid || '',
      l.blueCaptain && l.blueCaptain.nick || '',
      l.redCaptain  && l.redCaptain.uid  || '',
      l.redCaptain  && l.redCaptain.nick || '',
      l.blueTeamName || '',
      l.redTeamName  || '',
      (l.bluePlayers || []).join(','),
      (l.redPlayers  || []).join(','),
      l.blueReady ? '1' : '0',
      l.redReady  ? '1' : '0',
      (l.invitedSpectators || []).join(','),
      // ники зрителей: если кэп изменит nick зрителю — UI обновится
      Object.keys(l.spectatorNicks || {}).sort().map(function(k){ return k+':'+l.spectatorNicks[k]; }).join(','),
      l.status,
      l.seriesScore ? l.seriesScore.blue + '-' + l.seriesScore.red : '0-0',
      (l.globalBans || []).join(','),
      l.mode || '',
      l.seriesType || '',
      l.timerSeconds || '',
      l.id
    ].join('|');
    if (key === _lastWaitingKey) { wireWaitingRoom(l); return; }
    _lastWaitingKey = key;
    pane.innerHTML = renderWaitingRoomHtml(l);
    wireWaitingRoom(l);
  }

  function renderWaitingRoomHtml(l) {
    var uid = _uid();
    var isCreator = l.createdBy === uid;
    var isBlueCap = l.blueCaptain && l.blueCaptain.uid === uid;
    var isRedCap  = l.redCaptain  && l.redCaptain.uid === uid;

    function teamPanel(side, cap, teamName, players, isReady) {
      var emoji = side === 'blue' ? '🔵' : '🔴';
      var readyBadge = isReady
        ? '<span class="dcoop-tp-ready-badge ready">✓ Готов</span>'
        : '<span class="dcoop-tp-ready-badge waiting">ожидание</span>';
      var capHtml = cap && cap.nick
        ? escapeHtml(cap.nick)
        : '<span class="dcoop-tp-cap waiting">ждём капитана…</span>';
      var capClass = (cap && cap.nick) ? 'dcoop-tp-cap' : '';
      var playersHtml = (players && players.length)
        ? players.map(function(p,i){ return '<li>'+(i+1)+'. '+escapeHtml(p)+'</li>'; }).join('')
        : '<li style="color:var(--text-faint);list-style:none;font-size:11px;">игроки не указаны</li>';
      return ''
        + '<div class="dcoop-team-panel '+side+(isReady?' ready':'')+'">'
        +   '<div class="dcoop-tp-header">'
        +     '<span style="font-size:16px;">'+emoji+'</span>'
        +     '<div class="dcoop-tp-name '+side+'">'+escapeHtml(teamName)+'</div>'
        +     readyBadge
        +   '</div>'
        +   '<div class="dcoop-tp-label">Капитан</div>'
        +   '<div class="'+capClass+'" style="margin-bottom:10px;">'+capHtml+'</div>'
        +   '<div class="dcoop-tp-label">Игроки</div>'
        +   '<ul style="margin:0;padding:0 0 0 18px;font-size:12px;color:#fff;">'+playersHtml+'</ul>'
        + '</div>';
    }

    var needBlueCaptain = !l.blueCaptain || !l.blueCaptain.uid;
    var needRedCaptain  = !l.redCaptain  || !l.redCaptain.uid;
    var inviteCapBtn = isCreator
      ? '<button class="dcoop-submit" style="padding:11px;font-size:13px;margin-top:12px;width:100%;letter-spacing:0.3px;" onclick="dcoopOpenInvite()">👥 Пригласить игрока</button>'
      : '';

    var myReady = isBlueCap ? l.blueReady : (isRedCap ? l.redReady : false);
    var canReady = (isBlueCap || isRedCap) && l.redCaptain && l.blueCaptain;
    var readyBtn = canReady
      ? '<button class="dcoop-submit" style="background:' + (myReady ? 'rgba(46,204,113,0.2);color:#2ecc71;border:2px solid #2ecc71;' : '') + '" onclick="dcoopToggleReady()">' + (myReady ? '✓ Готов (отменить)' : '✅ Готов') + '</button>'
      : '';

    var bothReady = !!(l.blueReady && l.redReady);
    var sideAlreadyChosen = !!l.currentGameBlueSide;
    var startNote;
    if (!bothReady) {
      startNote = canReady ? '' : '<div style="padding:10px;text-align:center;color:var(--text-faint);font-size:11px;">Кнопка готовности появится когда оба капитана подключены</div>';
    } else if (isCreator && !sideAlreadyChosen) {
      startNote = ''
        + '<div class="dcoop-side-pick">'
        +   '<div class="dcoop-side-pick-title">Оба готовы — выбери сторону на 1-ю игру</div>'
        +   '<div class="dcoop-side-pick-sub">Команда «'+escapeHtml(l.blueTeamName || 'Blue')+'» — на какой стороне играет в первой игре серии?</div>'
        +   '<div class="dcoop-side-pick-btns">'
        +     '<button class="dcoop-side-pick-btn blue" onclick="dcoopPickGame1Side(\'blue\')">🔵 Синие (First Pick)</button>'
        +     '<button class="dcoop-side-pick-btn red"  onclick="dcoopPickGame1Side(\'red\')">🔴 Красные (counter-pick)</button>'
        +   '</div>'
        + '</div>';
    } else if (!isCreator && !sideAlreadyChosen) {
      startNote = '<div style="padding:10px;text-align:center;color:var(--text-faint);font-weight:700;">Ждём капитана-создателя — выбирает сторону на 1-ю игру…</div>';
    } else {
      startNote = '<div style="padding:10px;text-align:center;color:#2ecc71;font-weight:800;">Сторона выбрана — начинаем…</div>';
    }

    var spectators = l.invitedSpectators || [];
    var specList = spectators.length
      ? '<ul style="margin:0;padding:0;list-style:none;font-size:12px;">' + spectators.map(function(su, idx){
          var entry = (l.spectatorNicks && l.spectatorNicks[su]) || su.slice(0,8);
          var rmBtn = isCreator ? '<button onclick="dcoopRemoveSpectator(\''+su+'\')" style="background:none;border:none;color:#e74c3c;cursor:pointer;font-size:11px;">✕</button>' : '';
          return '<li style="padding:4px 8px;border:1px solid var(--accent-border-sub);border-radius:6px;margin-bottom:4px;display:flex;align-items:center;gap:8px;"><span style="flex:1;">'+escapeHtml(entry)+'</span>'+rmBtn+'</li>';
        }).join('') + '</ul>'
      : '<div style="font-size:11px;color:var(--text-faint);padding:6px 0;">Пока никого</div>';

    var specActions = isCreator
      ? '<div style="margin-top:8px;">'
        + '<button class="dcoop-submit" style="padding:8px 12px;font-size:11px;margin:0;width:100%;background:var(--accent-dim);color:var(--accent);" onclick="dcoopCopyInvite()">🔗 Копировать ссылку</button>'
        + '</div>'
      : '';

    var deleteBtn = isCreator
      ? '<div class="dcoop-danger-zone">'
        +   '<div class="dcoop-danger-zone-label">Опасная зона</div>'
        +   '<button onclick="dcoopDeleteLobby()" class="dcoop-danger-btn">🗑 Удалить лобби</button>'
        + '</div>'
      : '';

    var globalBansHtml = '';
    if (l.globalBans && l.globalBans.length) {
      var gbIcons = l.globalBans.map(function(n){
        var img = window._champIcon ? window._champIcon(n) : '';
        return '<div title="'+escapeHtml(n)+'" style="display:flex;flex-direction:column;align-items:center;gap:3px;">'
          + '<img loading="lazy" decoding="async" src="'+img+'" style="width:32px;height:32px;border-radius:6px;border:1.5px solid rgba(231,76,60,0.5);filter:grayscale(1) brightness(0.45);" onerror="this.style.display=\'none\'">'
          + '<div style="font-size:9px;color:rgba(231,76,60,0.7);max-width:36px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;">'+escapeHtml(n)+'</div>'
          + '</div>';
      }).join('');
      globalBansHtml = '<div style="margin-bottom:12px;padding:10px 12px;background:rgba(231,76,60,0.07);border:1px solid rgba(231,76,60,0.2);border-radius:10px;">'
        + '<div style="font-size:11px;font-weight:900;color:rgba(231,76,60,0.8);margin-bottom:8px;">⛔ Глобальные баны серии</div>'
        + '<div style="display:flex;gap:10px;flex-wrap:wrap;">'+gbIcons+'</div>'
        + '</div>';
    }

    var iAmSpec = (l.invitedSpectators || []).indexOf(uid) !== -1 && !isCreator && !isBlueCap && !isRedCap;
    var leaveBtn = iAmSpec
      ? '<button onclick="dcoopLeaveLobby()" style="background:none;border:1px solid rgba(231,76,60,0.4);color:#e74c3c;padding:6px 12px;border-radius:8px;font-size:12px;cursor:pointer;">🚪 Выйти</button>'
      : '';
    return ''
      + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap;">'
      +   '<button onclick="dcoopBackToList()" style="background:none;border:1px solid var(--accent-border);color:#fff;padding:6px 12px;border-radius:8px;font-size:12px;cursor:pointer;">← К списку</button>'
      +   leaveBtn
      +   '<div style="flex:1;font-size:14px;font-weight:900;color:#fff;">'+escapeHtml(l.blueTeamName || 'Blue')+' vs '+escapeHtml(l.redTeamName || 'Red')+'</div>'
      +   '<div style="font-size:11px;color:var(--text-faint);">'+(l.mode==='fearless'?'Fearless':'Normal')+' · '+(l.seriesType||'bo1').toUpperCase()+' · ⏱'+l.timerSeconds+'с</div>'
      + '</div>'
      + globalBansHtml
      + '<div class="dcoop-teams-grid">'
      +   teamPanel('blue', l.blueCaptain, l.blueTeamName || 'Blue', l.bluePlayers, l.blueReady)
      +   teamPanel('red',  l.redCaptain,  l.redTeamName  || 'Red',  l.redPlayers,  l.redReady)
      + '</div>'
      + inviteCapBtn
      + '<div class="dcoop-spec-section">'
      +   '<div class="dcoop-spec-title">👁 Зрители ('+spectators.length+'/'+MAX_SPECTATORS+')</div>'
      +   specList
      +   specActions
      + '</div>'
      + '<div style="margin-top:14px;">'+readyBtn+'</div>'
      + startNote
      + deleteBtn;
  }

  function wireWaitingRoom(l) {
    // Старт game 1: создатель выбирает сторону кнопкой (см. dcoopPickGame1Side).
    // Когда currentGameBlueSide уже записан и оба готовы — создатель пушит startDraft.
    if (l.blueReady && l.redReady && l.status === 'waiting'
        && l.currentGameBlueSide && l.createdBy === _uid()) {
      startDraft(l);
    }
  }

  // Создатель выбирает, на какой стороне (blue/red) играет команда blueCaptain в 1-й игре.
  // game.blueSide = 'blue' — команда blueCaptain на синей позиции (имеет first pick).
  // game.blueSide = 'red'  — команда blueCaptain на красной позиции (свап).
  function pickGame1Side(chosenSide) {
    var l = _currentLobby;
    if (!l) return;
    if (l.createdBy !== _uid()) { toast('Сторону выбирает создатель лобби'); return; }
    if (!l.blueReady || !l.redReady) { toast('Сначала оба капитана должны быть готовы'); return; }
    if (l.status !== 'waiting') return;
    if (l.currentGameBlueSide) return;
    if (chosenSide !== 'blue' && chosenSide !== 'red') return;
    _db().collection('draftLobbies').doc(l.id).update({
      currentGameBlueSide: chosenSide,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function(e){ toast('Ошибка: '+e.message); });
  }

  // ─── READY / INVITE / REMOVE ───
  function toggleReady() {
    var l = _currentLobby; var uid = _uid();
    if (!l || !uid) return;
    var field = null;
    if (l.blueCaptain && l.blueCaptain.uid === uid) field = 'blueReady';
    else if (l.redCaptain && l.redCaptain.uid === uid) field = 'redReady';
    if (!field) return;
    var newReady = !l[field];
    var patch = {}; patch[field] = newReady;
    patch.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
    // Если кто-то снимает готовность в waiting — сбрасываем уже выбранную сторону на 1-ю игру,
    // чтобы создатель смог выбрать заново после повторной готовности.
    if (!newReady && l.status === 'waiting' && l.currentGameBlueSide) {
      patch.currentGameBlueSide = null;
    }
    _db().collection('draftLobbies').doc(l.id).update(patch)
      .catch(function(e){ toast('Ошибка: '+e.message); });
  }

  function deleteLobby() {
    var l = _currentLobby;
    if (!l) return;
    if (l.createdBy !== _uid()) { toast('Только создатель может удалить'); return; }
    var _lid = l.id;
    window._showConfirm({ msg: 'Лобби «' + (l.blueTeamName||'Blue') + ' vs ' + (l.redTeamName||'Red') + '» будет удалено без возможности восстановления.', title: 'Удалить лобби?', confirmText: 'Удалить' }, function() {
      _db().collection('draftLobbies').doc(_lid).delete()
        .then(function(){ toast('Лобби удалено'); backToList(); })
        .catch(function(e){ toast('Ошибка: '+e.message); });
    });
  }

  function backToList() {
    stopLobbyListener();
    stopGameListener();
    stopChatListener();
    _lastWaitingKey = '';
    document.body.classList.remove('dcoop-fullscreen');
    // Restore sidebar open state on PC — same as close() does.
    // renderDraftUi removes the 'open' class for fullscreen mode; without
    // restoring it, sidebarOpen() thinks sidebar is closed and subsequent
    // modals open fullscreen instead of side-panel mode.
    if (window.matchMedia && window.matchMedia('(min-width: 769px)').matches) {
      var _sPanel = document.getElementById('sidePanel');
      if (_sPanel) _sPanel.classList.add('open');
    }
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

  // ─── UNIFIED USER SEARCH + INVITE MODAL ───
  // P0: realtime онлайн (onSnapshot), P0: роли прямо в строке, P1: фильтр online,
  // P1: аватар 40×40, P2: недавние, P2: badge "✉" для pending invites.
  var _searchOverlay = null;
  var _userList = [];              // realtime snapshot of users
  var _userListUnsub = null;
  var _pendingByUid = {};          // uid → { role, side } для моих pending invites в текущем лобби
  var _pendingUnsub = null;
  var _onlineOnly = true;          // default ON
  var _searchQuery = '';
  var _prefMode = null;            // hint: подсветить какую кнопку

  var RECENT_KEY = '_wrsRecentInvites';
  function getRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch(e){ return []; }
  }
  function pushRecent(u) {
    try {
      var arr = getRecent().filter(function(x){ return x.uid !== u.uid; });
      arr.unshift({ uid: u.uid, nick: u.displayName || '', photo: u.photoURL || '' });
      localStorage.setItem(RECENT_KEY, JSON.stringify(arr.slice(0, 5)));
    } catch(e) {}
  }

  function computeFresh(u) {
    if (u.online && u.lastSeen && u.lastSeen.toMillis) {
      return (Date.now() - u.lastSeen.toMillis()) < 120000;
    }
    return !!u.online;
  }

  var _searchKeyHandler = null;
  var _searchPrevFocus = null;
  function openUserSearch(prefMode) {
    _prefMode = prefMode || null;
    _searchQuery = '';
    _onlineOnly = true;
    closeUserSearch();

    _searchPrevFocus = document.activeElement;

    var overlay = document.createElement('div');
    overlay.id = 'dcoopSearchOverlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Пригласить в лобби');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.onclick = function(e){ if (e.target === overlay) closeUserSearch(); };

    // Escape + focus trap (Tab/Shift+Tab циклит фокус внутри overlay)
    _searchKeyHandler = function(e){
      if (e.key === 'Escape') {
        e.preventDefault();
        closeUserSearch();
        return;
      }
      if (e.key !== 'Tab') return;
      var focusables = overlay.querySelectorAll(
        'button, [href], input:not([type=hidden]), select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      var active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (!overlay.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', _searchKeyHandler, true);

    var hintMap = {
      captainBlue: '🔵 Нужен капитан СИНИХ — нажми «🔵 Капитан» у выбранного игрока',
      captainRed:  '🔴 Нужен капитан КРАСНЫХ — нажми «🔴 Капитан» у выбранного игрока',
      spectator:   '👁 Нужен зритель — нажми «👁 Зритель» у выбранного игрока'
    };
    var hintTxt = hintMap[_prefMode] || 'Выберите игрока и роль — «🔵 Капитан», «🔴 Капитан» или «👁 Зритель»';

    overlay.innerHTML = ''
      + '<div style="background:var(--bg-base);border:1px solid var(--accent-border);border-radius:12px;width:100%;max-width:460px;padding:14px;display:flex;flex-direction:column;gap:8px;max-height:88vh;">'
      +   '<div style="font-size:14px;font-weight:900;color:#fff;">👥 Пригласить в лобби</div>'
      +   '<div style="font-size:10.5px;color:var(--text-faint);line-height:1.4;">'+escapeHtml(hintTxt)+'</div>'
      +   '<input id="dcoopSearchInput" type="text" placeholder="🔍 Фильтр по нику" style="padding:9px 12px;border:1px solid var(--accent-border);background:var(--bg-primary);color:#fff;border-radius:8px;font-size:13px;outline:none;">'
      +   '<label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-faint);cursor:pointer;user-select:none;">'
      +     '<input id="dcoopSearchOnlineOnly" type="checkbox" checked style="accent-color:#2ecc71;">'
      +     '<span>Только онлайн</span>'
      +   '</label>'
      +   '<div id="dcoopSearchResults" style="overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:4px;min-height:220px;"><div style="color:var(--text-faint);font-size:11px;text-align:center;padding:20px;">Загрузка…</div></div>'
      +   '<button onclick="dcoopCloseSearch()" style="padding:8px;border:1px solid var(--accent-border);background:transparent;color:#fff;border-radius:8px;cursor:pointer;font-size:12px;">Закрыть</button>'
      + '</div>';
    document.body.appendChild(overlay);
    _searchOverlay = overlay;

    var inp = document.getElementById('dcoopSearchInput');
    var timer = null;
    inp.addEventListener('input', function(){
      if (timer) clearTimeout(timer);
      timer = setTimeout(function(){
        _searchQuery = inp.value.trim().toLowerCase();
        renderUserList();
      }, 80);
    });
    setTimeout(function(){ inp.focus(); }, 50);

    var onlineCb = document.getElementById('dcoopSearchOnlineOnly');
    onlineCb.addEventListener('change', function(){
      _onlineOnly = onlineCb.checked;
      renderUserList();
    });

    startUserListListener();
    startPendingInvitesListener();
  }

  // Лимит выборки: первые 500 юзеров отсортированы по lastSeen desc.
  // Этого хватает для сообщества <5к — самые активные всегда в выборке.
  // Для большего масштаба нужен полнотекстовый индекс (Algolia/Typesense).
  var USER_SEARCH_LIMIT = 500;

  function startUserListListener() {
    stopUserListListener();
    var dbInst = _db();
    if (!dbInst) return;
    var me = _uid();
    var query;
    try {
      query = dbInst.collection('users').orderBy('lastSeen','desc').limit(USER_SEARCH_LIMIT);
    } catch(e) {
      query = dbInst.collection('users').limit(USER_SEARCH_LIMIT);
    }
    _userListUnsub = query.onSnapshot(function(snap){
      var list = [];
      snap.forEach(function(d){
        var u = d.data(); u.uid = d.id;
        if (u.uid === me) return;
        u._online = computeFresh(u);
        list.push(u);
      });
      list.sort(function(a,b){
        if (a._online !== b._online) return a._online ? -1 : 1;
        var na = (a.displayName || '').toLowerCase();
        var nb = (b.displayName || '').toLowerCase();
        return na < nb ? -1 : (na > nb ? 1 : 0);
      });
      _userList = list;
      renderUserList();
    }, function(err){
      console.warn('[draft] user list', err);
      // Fallback: orderBy('lastSeen') может уронить запрос если поле отсутствует.
      // Тогда тянем без orderBy (старое поведение).
      if (err && err.code === 'failed-precondition') {
        _userListUnsub = dbInst.collection('users').limit(USER_SEARCH_LIMIT).onSnapshot(function(snap){
          var list = [];
          snap.forEach(function(d){
            var u = d.data(); u.uid = d.id;
            if (u.uid === me) return;
            u._online = computeFresh(u);
            list.push(u);
          });
          list.sort(function(a,b){
            if (a._online !== b._online) return a._online ? -1 : 1;
            var na = (a.displayName || '').toLowerCase();
            var nb = (b.displayName || '').toLowerCase();
            return na < nb ? -1 : (na > nb ? 1 : 0);
          });
          _userList = list;
          renderUserList();
        });
        return;
      }
      var r = document.getElementById('dcoopSearchResults');
      if (r) r.innerHTML = '<div style="color:#e74c3c;font-size:11px;text-align:center;padding:20px;">Ошибка загрузки: '+escapeHtml(err.message||'')+'</div>';
    });
  }

  function stopUserListListener() {
    if (_userListUnsub) { try { _userListUnsub(); } catch(e){} _userListUnsub = null; }
  }

  function startPendingInvitesListener() {
    stopPendingInvitesListener();
    var dbInst = _db();
    var l = _currentLobby;
    var me = _uid();
    if (!dbInst || !l || !me) return;
    _pendingByUid = {};
    _pendingUnsub = dbInst.collection('draftInvites')
      .where('fromUid','==',me)
      .where('status','==','pending')
      .onSnapshot(function(snap){
        var map = {};
        snap.forEach(function(d){
          var inv = d.data();
          if (inv.lobbyId !== l.id) return;
          map[inv.toUid] = { role: inv.role, side: inv.side || null };
        });
        _pendingByUid = map;
        renderUserList();
      }, function(err){ console.warn('[draft] pending listener', err); });
  }

  function stopPendingInvitesListener() {
    if (_pendingUnsub) { try { _pendingUnsub(); } catch(e){} _pendingUnsub = null; }
    _pendingByUid = {};
  }

  // Возвращает { blueDisabled, blueReason, redDisabled, redReason, specDisabled, specReason }
  function slotStatusFor(u) {
    var l = _currentLobby || {};
    var blueCap = l.blueCaptain && l.blueCaptain.uid;
    var redCap  = l.redCaptain  && l.redCaptain.uid;
    var specs   = l.invitedSpectators || [];
    var pend    = _pendingByUid[u.uid];

    var s = { blueDisabled:false, blueReason:'', redDisabled:false, redReason:'', specDisabled:false, specReason:'' };

    // Blue captain
    if (blueCap) { s.blueDisabled = true; s.blueReason = 'слот занят'; }
    else if (redCap === u.uid) { s.blueDisabled = true; s.blueReason = 'уже кап. красных'; }
    else if (pend && pend.role === 'captain' && pend.side === 'blue') { s.blueDisabled = true; s.blueReason = 'уже приглашён'; }

    // Red captain
    if (redCap) { s.redDisabled = true; s.redReason = 'слот занят'; }
    else if (blueCap === u.uid) { s.redDisabled = true; s.redReason = 'уже кап. синих'; }
    else if (pend && pend.role === 'captain' && pend.side === 'red') { s.redDisabled = true; s.redReason = 'уже приглашён'; }

    // Spectator
    if (specs.indexOf(u.uid) !== -1) { s.specDisabled = true; s.specReason = 'уже зритель'; }
    else if (specs.length >= MAX_SPECTATORS) { s.specDisabled = true; s.specReason = 'макс. '+MAX_SPECTATORS; }
    else if (blueCap === u.uid || redCap === u.uid) { s.specDisabled = true; s.specReason = 'уже капитан'; }
    else if (pend && pend.role === 'spectator') { s.specDisabled = true; s.specReason = 'уже приглашён'; }

    return s;
  }

  function avatarHtml(u, size) {
    var sz = size || 40;
    if (u.photoURL || u.photo) {
      var src = escapeHtml(u.photoURL || u.photo);
      return '<img loading="lazy" decoding="async" src="'+src+'" style="width:'+sz+'px;height:'+sz+'px;border-radius:50%;object-fit:cover;border:1px solid var(--accent-border-sub);flex-shrink:0;" onerror="this.outerHTML=&quot;<div style=\\&quot;width:'+sz+'px;height:'+sz+'px;border-radius:50%;background:var(--accent-dim);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;color:#fff;flex-shrink:0;\\&quot;>'+escapeHtml((u.displayName||u.nick||'?').charAt(0).toUpperCase())+'</div>&quot;;">';
    }
    var ini = escapeHtml((u.displayName || u.nick || '?').charAt(0).toUpperCase());
    return '<div style="width:'+sz+'px;height:'+sz+'px;border-radius:50%;background:var(--accent-dim);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;color:#fff;flex-shrink:0;">'+ini+'</div>';
  }

  function rowHtml(u) {
    var nick = escapeHtml(u.displayName || '?');
    var role = escapeHtml(u.role || '—');
    var rank = escapeHtml(u.rank || '—');
    var dot = u._online
      ? '<span style="color:#2ecc71;font-size:10px;">● онлайн</span>'
      : '<span style="color:var(--text-faint);font-size:10px;">● оффлайн</span>';
    var s = slotStatusFor(u);
    var pend = _pendingByUid[u.uid];
    var pendBadge = pend ? '<span title="Приглашение отправлено" style="font-size:11px;color:#f1c40f;font-weight:900;" >✉</span>' : '';

    function btn(label, bgActive, disabled, reason, onclick, highlight) {
      var bg = disabled ? 'rgba(255,255,255,0.06)' : bgActive;
      var op = disabled ? '0.35' : '1';
      var cur = disabled ? 'not-allowed' : 'pointer';
      var title = disabled ? escapeHtml(reason || '') : '';
      var anim = (highlight && !disabled) ? 'animation:dcoopPulseBtn 1.4s ease-in-out infinite;' : '';
      var click = disabled ? '' : ' onclick="'+onclick+'"';
      return '<button'+click+' title="'+title+'" style="border:none;background:'+bg+';color:#fff;padding:5px 10px;border-radius:7px;font-size:11px;font-weight:800;cursor:'+cur+';opacity:'+op+';white-space:nowrap;'+anim+'">'+label+'</button>';
    }

    var enc = encodeURIComponent(u.displayName || '');
    var blueBtn = btn('🔵 Капитан', 'linear-gradient(135deg,#1a6fa8,#3498db)', s.blueDisabled, s.blueReason,
      'dcoopSendInvite(\''+u.uid+'\',\''+enc+'\',\'captain\',\'blue\')', _prefMode==='captainBlue');
    var redBtn  = btn('🔴 Капитан', 'linear-gradient(135deg,#922b21,#e74c3c)', s.redDisabled, s.redReason,
      'dcoopSendInvite(\''+u.uid+'\',\''+enc+'\',\'captain\',\'red\')',  _prefMode==='captainRed');
    var specBtn = btn('👁 Зритель', 'linear-gradient(135deg,#1c2d3f,#2c4560)', s.specDisabled, s.specReason,
      'dcoopSendInvite(\''+u.uid+'\',\''+enc+'\',\'spectator\',null)',   _prefMode==='spectator');

    return ''
      + '<div style="display:flex;align-items:center;gap:10px;padding:6px 8px;border:1px solid var(--accent-border-sub);border-radius:8px;background:rgba(255,255,255,0.02);">'
      +   avatarHtml(u, 40)
      +   '<div style="flex:1;min-width:0;">'
      +     '<div style="display:flex;align-items:center;gap:6px;"><span style="font-weight:700;color:#fff;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;">'+nick+'</span>'+pendBadge+'</div>'
      +     '<div style="font-size:10px;color:var(--text-faint);">'+dot+' · '+role+' · '+rank+'</div>'
      +   '</div>'
      +   '<div style="display:flex;gap:4px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;max-width:200px;">'+blueBtn+redBtn+specBtn+'</div>'
      + '</div>';
  }

  function renderUserList() {
    var results = document.getElementById('dcoopSearchResults');
    if (!results) return;

    var q = _searchQuery;
    var base = _userList.filter(function(u){
      if (_onlineOnly && !u._online) return false;
      if (!q) return true;
      var n = (u.displayName || '').toLowerCase();
      return n.indexOf(q) !== -1;
    });

    // Recent section (filtered by q + presence of user still in _userList)
    var recent = getRecent();
    var recentResolved = [];
    if (recent.length) {
      var byUid = {};
      _userList.forEach(function(u){ byUid[u.uid] = u; });
      recent.forEach(function(r){
        var u = byUid[r.uid];
        if (!u) return;
        if (_onlineOnly && !u._online) return;
        if (q) {
          var n = (u.displayName || '').toLowerCase();
          if (n.indexOf(q) === -1) return;
        }
        recentResolved.push(u);
      });
    }

    if (!base.length && !recentResolved.length) {
      results.innerHTML = '<div style="color:var(--text-faint);font-size:11px;text-align:center;padding:20px;">Никого не найдено</div>';
      return;
    }

    var online = base.filter(function(u){ return u._online; });
    var offline = base.filter(function(u){ return !u._online; });

    var html = '';
    if (recentResolved.length) {
      html += '<div style="font-size:10px;color:#f39c12;font-weight:900;letter-spacing:0.5px;margin:2px 0;">🕑 НЕДАВНИЕ · '+recentResolved.length+'</div>';
      html += recentResolved.map(rowHtml).join('');
      html += '<div style="height:6px;"></div>';
    }
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
    stopUserListListener();
    stopPendingInvitesListener();
    if (_searchKeyHandler) {
      document.removeEventListener('keydown', _searchKeyHandler, true);
      _searchKeyHandler = null;
    }
    if (_searchOverlay && _searchOverlay.parentNode) {
      _searchOverlay.parentNode.removeChild(_searchOverlay);
    }
    _searchOverlay = null;
    _prefMode = null;
    // Вернуть фокус туда, где он был до открытия overlay
    if (_searchPrevFocus && typeof _searchPrevFocus.focus === 'function') {
      try { _searchPrevFocus.focus(); } catch(e){}
    }
    _searchPrevFocus = null;
  }

  // Прямая отправка инвайта из строки — без карточки-подтверждения.
  // Синхронная валидация через slotStatusFor + асинхронная проверка активной серии.
  function sendInviteFromRow(uid, nickEncoded, role, side) {
    var nick = decodeURIComponent(nickEncoded || '');
    var l = _currentLobby;
    if (!l) { toast('Нет лобби'); return; }

    // Найти user из realtime-списка (или минимальный объект)
    var user = null;
    for (var i = 0; i < _userList.length; i++) {
      if (_userList[i].uid === uid) { user = _userList[i]; break; }
    }
    if (!user) user = { uid: uid, displayName: nick };

    // Повторная локальная проверка (защита от гонок)
    var s = slotStatusFor(user);
    var blocked = (role === 'captain' && side === 'blue' && s.blueDisabled)
      || (role === 'captain' && side === 'red'  && s.redDisabled)
      || (role === 'spectator' && s.specDisabled);
    if (blocked) {
      var reason = (role === 'captain' && side === 'blue') ? s.blueReason
                 : (role === 'captain' && side === 'red')  ? s.redReason
                 : s.specReason;
      toast('Нельзя: '+reason);
      return;
    }

    // Проверка активных серий у получателя
    getActiveSeriesForUser(uid, l.id).then(function(series){
      if (series.length) {
        toast('У юзера уже есть активная серия — попробуйте позже');
        return;
      }
      return sendInvite(uid, nick, role, side).then(function(msg){
        toast(msg || 'Приглашение отправлено');
        pushRecent(user);
        // onSnapshot на pending invites сам перерисует строку — кнопки дизейблятся
      }).catch(function(e){
        toast('Ошибка: '+(e.message||e));
      });
    }).catch(function(){
      // Если проверка активных серий упала — всё равно пробуем послать
      sendInvite(uid, nick, role, side).then(function(msg){
        toast(msg || 'Приглашение отправлено');
        pushRecent(user);
      }).catch(function(e){
        toast('Ошибка: '+(e.message||e));
      });
    });
  }

  window.dcoopSendInvite = sendInviteFromRow;

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
      // Уже принят и финализирован — не дёргать повторно
      if (prev.status === 'finalized' && prev.lobbyId === l.id) {
        return Promise.reject(new Error('Юзер уже в этом лобби'));
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

  function _getInviteToastStack() {
    var stack = document.getElementById('dcoopInviteToastStack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'dcoopInviteToastStack';
      stack.className = 'dcoop-invite-toast-stack';
      document.body.appendChild(stack);
    }
    return stack;
  }

  function _renderInviteToast(invite) {
    if (document.getElementById('dcoopInviteToast-' + invite.id)) return;
    var roleText = invite.role === 'captain'
      ? ('капитаном ' + (invite.side === 'blue' ? 'СИНИХ' : 'КРАСНЫХ'))
      : 'зрителем';
    var toastEl = document.createElement('div');
    toastEl.className = 'dcoop-invite-toast';
    toastEl.id = 'dcoopInviteToast-' + invite.id;
    var safeId = encodeURIComponent(invite.id);
    toastEl.innerHTML = ''
      + '<div class="dcoop-invite-toast-text">'
      +   '<strong>'+escapeHtml(invite.fromNick || '?')+'</strong> приглашает вас '+roleText+' в драфт-лобби'
      + '</div>'
      + '<div class="dcoop-invite-toast-btns">'
      +   '<button class="dcoop-inv-accept" data-invite-id="'+safeId+'" data-action="accept">Принять</button>'
      +   '<button class="dcoop-inv-decline" data-invite-id="'+safeId+'" data-action="decline">Отклонить</button>'
      + '</div>';
    // Делегируем клики через addEventListener, чтобы не зависеть от inline onclick (CSP-safer).
    toastEl.addEventListener('click', function(e){
      var btn = e.target.closest('button[data-action]');
      if (!btn) return;
      var id = decodeURIComponent(btn.getAttribute('data-invite-id') || '');
      if (btn.getAttribute('data-action') === 'accept') window.dcoopAcceptInvite(id);
      else window.dcoopDeclineInvite(id);
    });
    _getInviteToastStack().appendChild(toastEl);
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
      toast('Приглашение принято!');
      _db().collection('draftInvites').doc(id).get().then(function(snap){
        if (!snap.exists) return;
        var d = snap.data(); d.id = snap.id;
        // Для зрителя — сразу финализируем сами, не ждём отправителя
        if (d.role === 'spectator') selfAddSpectatorViaInvite(d);
        if (window.openDraftCoop) window.openDraftCoop();
        setTimeout(function(){ openLobby(d.lobbyId); }, 400);
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

  // Случайный токен ~10-16 символов для shareToken (rotate при выгоне).
  function _genShareToken() {
    return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
  }

  function removeSpectator(uid) {
    var l = _currentLobby;
    if (!l) return;
    var dbInst = _db();
    if (!dbInst) return;
    var lobbyRef = dbInst.collection('draftLobbies').doc(l.id);
    var meUid = _uid();
    var amCreator = meUid && l.createdBy === meUid;
    // Транзакция: атомарный read-modify-write
    dbInst.runTransaction(function(tx){
      return tx.get(lobbyRef).then(function(snap){
        if (!snap.exists) return;
        var data = snap.data();
        var list = (data.invitedSpectators || []).filter(function(u){ return u !== uid; });
        if (list.length === (data.invitedSpectators || []).length) return; // не было
        var nicks = Object.assign({}, data.spectatorNicks || {});
        delete nicks[uid];
        var patch = {
          invitedSpectators: list,
          spectatorNicks: nicks,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        // Если создатель выгнал зрителя — ротируем shareToken,
        // чтобы старая ссылка-приглашение перестала работать.
        // Сам зритель, выходящий по своей воле, токен не ротирует.
        var kickedByCreator = amCreator && uid !== meUid;
        if (kickedByCreator) patch.shareToken = _genShareToken();
        tx.update(lobbyRef, patch);
      });
    }).then(function(){
      if (amCreator && uid !== meUid) toast('Зритель удалён, ссылка обновлена');
    }).catch(function(e){ console.warn('[draft] removeSpectator', e); });
  }

  // Зритель сам выходит из лобби (Fix 4). Использует то же removeSpectator,
  // но затем закрывает экран и возвращает в "Мои лобби".
  function leaveLobby() {
    var l = _currentLobby;
    var uid = _uid();
    if (!l || !uid) return;
    var isSpec = (l.invitedSpectators || []).indexOf(uid) !== -1;
    if (!isSpec) {
      toast('Только зритель может выйти. Капитан/создатель — закройте лобби или удалите.');
      return;
    }
    var teamLine = (l.blueTeamName || 'Blue') + ' vs ' + (l.redTeamName || 'Red');
    var confirmFn = window._showConfirm || function(opts, cb){ if (confirm(opts.msg || 'Покинуть лобби?')) cb(); };
    confirmFn({
      msg: 'Вы перестанете получать обновления драфта «' + teamLine + '».',
      title: 'Покинуть лобби?',
      confirmText: 'Покинуть',
      icon: '🚪',
      danger: false
    }, function(){
      removeSpectator(uid);
      toast('Вы покинули лобби');
      setTimeout(function(){ backToList(); }, 300);
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

  // Чемпионы, недоступные в текущем состоянии (забанены/запикнуты/fearless-lock/global-ban)
  function getUnavailable(game, fearlessLock, globalBans) {
    var set = {};
    (game.bans.blue || []).forEach(function(n){ if (n) set[n] = 'banned'; });
    (game.bans.red  || []).forEach(function(n){ if (n) set[n] = 'banned'; });
    (game.picks.blue || []).forEach(function(p){ if (p && p.champ) set[p.champ] = 'picked'; });
    (game.picks.red  || []).forEach(function(p){ if (p && p.champ) set[p.champ] = 'picked'; });
    (fearlessLock || []).forEach(function(n){ if (!set[n]) set[n] = 'fearless'; });
    (globalBans || []).forEach(function(n){ if (!set[n]) set[n] = 'global'; });
    return set;
  }

  // ─── Game state listener ───
  var _unsubGame = null;
  var _currentGame = null;
  var _currentListenGameKey = null; // lobby.id + '/' + gameId — чтобы не рестартовать лишний раз
  var _timerInterval = null;
  var _hoverLocal = null; // локальное значение hover (для throttle)
  var _hoverWriteTimer = null;

  function stopGameListener() {
    if (_unsubGame) { try { _unsubGame(); } catch(e){} _unsubGame = null; }
    if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
    if (_hoverWriteTimer) { clearTimeout(_hoverWriteTimer); _hoverWriteTimer = null; }
    _currentListenGameKey = null;
    _hoverLocal = null; // сбрасываем hover при переходе на новую игру
    if (typeof removeOpponentTimerBadge === 'function') removeOpponentTimerBadge();
    var pb = document.getElementById('dcoopPausedBanner'); if (pb) pb.remove();
  }

  function listenToCurrentGame(lobby) {
    var dbInst = _db();
    if (!dbInst || !lobby) return;
    var gameId = String(lobby.currentGame || 1);
    var key = lobby.id + '/' + gameId;
    // Не перезапускаем слушатель если уже подписаны на эту игру
    if (_currentListenGameKey === key && _unsubGame) return;
    stopGameListener();
    _currentListenGameKey = key;
    _unsubGame = dbInst.collection('draftLobbies').doc(lobby.id)
      .collection('games').doc(gameId)
      .onSnapshot(function(snap){
        if (!snap.exists) return;
        var g = snap.data(); g.id = snap.id;
        _currentGame = g;
        // Берём свежий lobby через _currentLobby (а не захваченный closure),
        // иначе обновления seriesScore/completedGames/status не доезжают до UI
        // при ранних return-ах listenToCurrentGame по тому же gameKey.
        renderDraftUi(_currentLobby || lobby, g);
      }, function(err){ console.warn('[draft] game listener', err); });
  }

  // ─── Global bans bar (shown during draft) ───
  function globalBansBarHtml(lobby) {
    var bans = lobby.globalBans || [];
    if (!bans.length) return '';
    var icons = bans.map(function(n){
      var img = window._champIcon ? window._champIcon(n) : '';
      return '<div title="'+escapeHtml(n)+'" style="position:relative;width:26px;height:26px;flex-shrink:0;">'
        + '<img loading="lazy" decoding="async" src="'+img+'" style="width:26px;height:26px;border-radius:5px;filter:grayscale(1) brightness(0.3);" onerror="this.style.display=\'none\'">'
        + '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11px;pointer-events:none;">⛔</div>'
        + '</div>';
    }).join('');
    return '<div style="display:flex;align-items:center;gap:6px;padding:4px 10px;background:rgba(231,76,60,0.07);border-bottom:1px solid rgba(231,76,60,0.18);overflow:hidden;">'
      + '<span style="font-size:9px;color:rgba(231,76,60,0.75);font-weight:900;white-space:nowrap;letter-spacing:0.4px;flex-shrink:0;">⛔</span>'
      + '<div style="display:flex;gap:4px;align-items:center;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;flex:1;">'+icons+'</div>'
      + '</div>';
  }

  // ─── DRAFT UI RENDER ───
  // Сохранить волатильное состояние UI до перерендера, чтобы вернуть
  // юзеру тот же scroll/фокус/value поиска вместо «прыжка наверх».
  function _captureUiState(pane) {
    var st = { scroll: 0, search: '', focusId: null, selectionStart: null };
    var galleryEl = pane.querySelector('#dcoopGallery');
    if (galleryEl) st.scroll = galleryEl.scrollTop;
    var inp = pane.querySelector('#dcoopChampSearch');
    if (inp) {
      st.search = inp.value;
      if (document.activeElement === inp) {
        st.focusId = 'dcoopChampSearch';
        st.selectionStart = inp.selectionStart;
        st.selectionEnd = inp.selectionEnd;
      }
    }
    return st;
  }
  function _restoreUiState(pane, st) {
    if (!st) return;
    var galleryEl = pane.querySelector('#dcoopGallery');
    if (galleryEl && st.scroll) galleryEl.scrollTop = st.scroll;
    var inp = pane.querySelector('#dcoopChampSearch');
    if (inp && st.search && !inp.value) inp.value = st.search;
    if (st.focusId === 'dcoopChampSearch' && inp) {
      try {
        inp.focus();
        if (st.selectionStart != null) inp.setSelectionRange(st.selectionStart, st.selectionEnd);
      } catch(e){}
    }
  }

  function renderDraftUi(lobby, game) {
    var pane = document.getElementById('dcoopPaneLobby');
    if (!pane) return;
    var _uiState = _captureUiState(pane);

    // Активируем fullscreen режим для лобби.
    // closeSidebar() сбрасывает JS-состояние (_pcSideMode, _sidebarModalId)
    // и убирает pc-side-mode / side-panel-modal — иначе после выхода из драфта
    // sidebarOpen() думает что предыдущий sidebar-modal всё ещё открыт.
    if (window.closeSidebar) window.closeSidebar();
    var _panel = document.getElementById('sidePanel');
    if (_panel) _panel.classList.remove('open'); // физически скрываем сайдбар для fullscreen
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
    // myTeam — идентификатор моей команды (blueCaptain/redCaptain), НЕ позиция.
    // Нужен отдельно от mySide потому что game.readyBlue/readyRed пишутся по КОМАНДЕ,
    // а mySide после свапа сторон даёт позицию. Без myTeam Ready-кнопка читала чужой флаг.
    var myTeam = null;
    if (lobby.blueCaptain && lobby.blueCaptain.uid === uid) myTeam = 'blue';
    else if (lobby.redCaptain && lobby.redCaptain.uid === uid) myTeam = 'red';
    var isCreator = lobby.createdBy === uid;

    var step = WR_DRAFT_SEQUENCE[game.turnIndex] || null;
    var myTurn = iAmCaptain && step && step.side === mySide && game.phase !== 'done';
    var fearlessLock = lobby.mode === 'fearless' ? (lobby.usedChampions || []) : [];
    var unavail = getUnavailable(game, fearlessLock, lobby.globalBans || []);

    // Если hover невалиден (ход ушёл / чемп недоступен) — сбрасываем локально
    if (_hoverLocal && (!myTurn || unavail[_hoverLocal])) _hoverLocal = null;

    var isMob = isMobileDraft();
    // Запоминаем, был ли layout уже на экране — на ре-рендере глушим анимацию появления
    var _wasRendered = !!pane.querySelector('.dcoop-draft-layout');
    pane.innerHTML = ''
      + draftHeaderHtml(lobby, game, step, mySide, isCreator)
      + (isMob ? '' : globalBansBarHtml(lobby))
      + (isMob ? pastGamesHtml(lobby, game) : '')
      + '<div class="dcoop-draft-layout">'
      +   sidePanelHtml('blue', lobby, game, step)
      +   '<div class="dcoop-gallery-col">'
      +     gallerySearchHtml()
      +     '<div id="dcoopGallery" class="dcoop-gallery"></div>'
      +     lockInBtnHtml(myTurn, game, step, mySide, iAmCaptain, myTeam)
      +   '</div>'
      +   sidePanelHtml('red', lobby, game, step)
      + '</div>'
      + (isMob ? '' : pastGamesHtml(lobby, game));
    // Подавляем анимацию на ре-рендерах (каждый пик/бан) — иначе layout дёргается
    if (_wasRendered) {
      var _layout = pane.querySelector('.dcoop-draft-layout');
      if (_layout) _layout.style.animation = 'none';
    }

    // Render gallery
    renderGallery(lobby, game, step, mySide, unavail);

    // Восстанавливаем scroll галереи / value+focus поиска до перерендера
    _restoreUiState(pane, _uiState);

    // Restore LockIn button state and hover preview after re-render
    if (_hoverLocal && myTurn) {
      var lockBtn = document.getElementById('dcoopLockIn');
      if (lockBtn) lockBtn.disabled = false;
      // Восстанавливаем локальный hover preview (он не в Firestore)
      renderSlotsHoverPreview(mySide, _hoverLocal);
      // Подсветка в галерее
      var grid2 = document.getElementById('dcoopGallery');
      if (grid2) {
        var el2 = grid2.querySelector('[data-champ="'+cssEscape(_hoverLocal)+'"]');
        if (el2) el2.classList.add('selected');
      }
    }

    // Start timer
    startTimer(lobby, game, step, mySide);

    // Refresh assist panel if on
    if (_draftAssistantOn) renderAssistPanel();

    if (game.phase === 'done' || game.turnIndex >= SEQ_LEN) {
      if (lobby.status === 'series_done' || lobby.status === 'closed') {
        stopGameListener(); // серия кончилась — больше не нужен
        replayGame(lobby.id, null); // сразу реплей игры 1
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
      // Ещё не выбрали победителя — показываем кнопки по КОМАНДАМ (не по позиции).
      // Синяя кнопка = всегда blueTeam (blueCaptain's team), красная = всегда redTeam.
      // Это гарантирует правильный счёт независимо от свапа сторон.
      var canPickWinner = isCreator || !!myCampTeam;
      if (canPickWinner) {
        bar.innerHTML = ''
          + scoreHtml
          + '<div class="dcoop-bb-label">Игра '+game.number+' · кто победил?</div>'
          + '<div class="dcoop-bb-btns">'
          +   '<button class="dcoop-bb-btn blue" onclick="dcoopSetWinner(\'blue\')">🔵 '+blueTeamName+'</button>'
          +   '<button class="dcoop-bb-btn red"  onclick="dcoopSetWinner(\'red\')">🔴 '+redTeamName+'</button>'
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
        html = '<img loading="lazy" decoding="async" src="'+img+'" alt="'+escapeHtml(n)+'" onerror="this.style.display=\'none\'">';
      } else if (i === activeBanIdx && hover) {
        var imgh = window._champIcon ? window._champIcon(hover) : '';
        html = '<img loading="lazy" decoding="async" src="'+imgh+'" alt="'+escapeHtml(hover)+'" style="opacity:0.45;" onerror="this.style.display=\'none\'">';
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
        html = '<img loading="lazy" decoding="async" src="'+img+'" alt="'+escapeHtml(p.champ)+'" onerror="this.style.display=\'none\'">'
             + (showName ? '<div class="dcoop-pick-name">'+escapeHtml(p.champ)+'</div>' : '');
      } else if (i === activePickIdx && hover) {
        var imgh = window._champIcon ? window._champIcon(hover) : '';
        html = '<img loading="lazy" decoding="async" src="'+imgh+'" alt="'+escapeHtml(hover)+'" style="opacity:0.45;" onerror="this.style.display=\'none\'">'
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
    var _meUid = _uid();
    var iAmSpecHdr = (lobby.invitedSpectators || []).indexOf(_meUid) !== -1
      && !isCreator
      && !(lobby.blueCaptain && lobby.blueCaptain.uid === _meUid)
      && !(lobby.redCaptain  && lobby.redCaptain.uid  === _meUid);
    var closeBtn = isCreator
      ? '<button class="dcoop-hdr-close" onclick="dcoopCloseLobbyConfirm()" title="Закрыть лобби">✕</button>'
      : (iAmSpecHdr
          ? '<button class="dcoop-hdr-close" onclick="dcoopLeaveLobby()" title="Покинуть лобби" style="font-size:16px;color:#e74c3c;">🚪</button>'
          // Не-создатель и не-зритель (запасной кап без позиции): кнопка "назад"
          : '<button class="dcoop-hdr-close" onclick="dcoopBackToList()" title="К списку" style="font-size:16px;">←</button>');
    var specCount = (lobby.invitedSpectators || []).length;
    var specBtn = '<button class="dcoop-hdr-spec" onclick="dcoopToggleSpectators()" title="Зрители">👁 '+specCount+'</button>';
    var assistBtn = '<button class="dcoop-hdr-assist" onclick="dcoopToggleAssist()" title="Драфт-помощник" data-on="'+(_draftAssistantOn?'1':'0')+'">🤖</button>';
    var soundBtn  = '<button class="dcoop-hdr-sound" onclick="dcoopToggleSound()" title="'+(isSoundOn()?'Звук вкл':'Звук выкл')+'" data-on="'+(isSoundOn()?'1':'0')+'">'+(isSoundOn()?'🔊':'🔇')+'</button>';
    var chatBtn   = '<button class="dcoop-hdr-chat" onclick="dcoopToggleChat()" title="Чат лобби">💬</button>';
    var isPaused = lobby.status === 'paused';
    var pauseBtn = isCreator
      ? '<button class="dcoop-hdr-pause" onclick="dcoopTogglePause()" title="'+(isPaused?'Возобновить':'Пауза')+'" data-on="'+(isPaused?'1':'0')+'">'+(isPaused?'▶':'⏸')+'</button>'
      : '';

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
        +     '<div class="dcoop-hdr-corner">'+chatBtn+soundBtn+pauseBtn+specBtn+closeBtn+'</div>'
        +   '</div>'
        +   '<div class="dcoop-hdr-row-bans">'
        +     '<div class="dcoop-hdr-bans dcoop-hdr-bans-blue">'+banSlotsHtml('blue', game, step, 'mobile')+'</div>'
        +     '<div class="dcoop-hdr-bans dcoop-hdr-bans-red">'+banSlotsHtml('red',  game, step, 'mobile')+'</div>'
        +   '</div>'
        +   '<div class="dcoop-hdr-row-picks">'
        +     '<div class="dcoop-hdr-picks dcoop-hdr-picks-blue">'+pickSlotsHtml('blue', game, step, 'mobile')+'</div>'
        +     '<div class="dcoop-hdr-picks dcoop-hdr-picks-red">'+pickSlotsHtml('red',  game, step, 'mobile')+'</div>'
        +   '</div>'
        + '</div>';
    }

    // PC: большой таймер по центру + блоки капитанов по краям
    return ''
      + '<div class="dcoop-hdr dcoop-hdr-pc">'
      +   '<div class="dcoop-hdr-pc-left">'+blueCap+'</div>'
      +   '<div class="dcoop-hdr-timer-pc" id="dcoopTimer" style="color:'+stepCol+';">—</div>'
      +   '<div class="dcoop-hdr-pc-right">'+redCap+'</div>'
      +   '<div class="dcoop-hdr-corner-pc">'+chatBtn+soundBtn+pauseBtn+specBtn+assistBtn+closeBtn+'</div>'
      + '</div>';
  }

  // F7: Pause / Resume — пауза замораживает таймер, новый turnStartedAt при возобновлении.
  function togglePause() {
    var l = _currentLobby; var g = _currentGame;
    if (!l) return;
    if (l.createdBy !== _uid()) { toast('Только создатель может ставить паузу'); return; }
    if (l.status !== 'drafting' && l.status !== 'paused') return;
    var dbInst = _db();
    if (l.status === 'drafting') {
      // На паузу
      dbInst.collection('draftLobbies').doc(l.id).update({
        status: 'paused',
        pausedAt: firebase.firestore.FieldValue.serverTimestamp(),
        pausedBy: _uid(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }).then(function(){ toast('Драфт на паузе'); })
        .catch(function(e){ toast('Ошибка: '+e.message); });
    } else {
      // Возобновить — стартовать таймер заново
      var patch = {
        status: 'drafting',
        pausedAt: null,
        pausedBy: null,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      var batch = dbInst.batch();
      batch.update(dbInst.collection('draftLobbies').doc(l.id), patch);
      if (g) {
        var gameRef = dbInst.collection('draftLobbies').doc(l.id)
          .collection('games').doc(String(g.number));
        batch.update(gameRef, { turnStartedAt: firebase.firestore.FieldValue.serverTimestamp() });
      }
      batch.commit().then(function(){ toast('Драфт возобновлён'); })
        .catch(function(e){ toast('Ошибка: '+e.message); });
    }
  }
  window.dcoopTogglePause = togglePause;

  // Если status === 'paused' — таймер фризим (не тикаем), показываем баннер
  function _renderPausedBanner() {
    var existing = document.getElementById('dcoopPausedBanner');
    if (!_currentLobby || _currentLobby.status !== 'paused') {
      if (existing) existing.remove();
      return;
    }
    if (existing) return;
    var banner = document.createElement('div');
    banner.id = 'dcoopPausedBanner';
    banner.className = 'dcoop-paused-banner';
    banner.innerHTML = '<span>⏸</span><span>Драфт на паузе</span>';
    document.body.appendChild(banner);
  }

  // Toggle sound (экспорт ниже)
  function toggleSound() {
    var on = !isSoundOn();
    setSoundOn(on);
    document.querySelectorAll('.dcoop-hdr-sound').forEach(function(b){
      b.setAttribute('data-on', on ? '1' : '0');
      b.textContent = on ? '🔊' : '🔇';
      b.title = on ? 'Звук вкл' : 'Звук выкл';
    });
    if (on) {
      // Прогрев AudioContext (для iOS — нужен user gesture)
      var c = _ctx(); if (c && c.state === 'suspended') { try { c.resume(); } catch(e){} }
      playTickSound();
    }
  }
  window.dcoopToggleSound = toggleSound;

  // ─── Past games (шторка мобила / панель снизу на PC) ───
  function pastGamesHtml(lobby, game) {
    var completed = (lobby.completedGames || []).slice().sort(function(a,b){ return a.number - b.number; });
    if (!completed.length) return ''; // показывается с игры 2+ (т.к. completed появляется после 1-й игры)

    function slot(n) {
      if (!n) return '<div class="dcoop-past-slot empty"></div>';
      var img = window._champIcon ? window._champIcon(n) : '';
      return '<div class="dcoop-past-slot"><img loading="lazy" decoding="async" src="'+img+'" alt="'+escapeHtml(n)+'" title="'+escapeHtml(n)+'" onerror="this.style.display=\'none\'"></div>';
    }
    function padRow(arr) {
      var out = (arr || []).slice(0, 5);
      while (out.length < 5) out.push(null);
      return out;
    }

    // currentBlueSide = кто СЕЙЧАС на синей стороне ('blue' или 'red')
    // Прошлые игры отображаем так, чтобы пики/баны были на той стороне,
    // где СЕЙЧАС находится эта команда (relative to current game positions).
    var currentBlueSide = (game && game.blueSide) || (lobby && lobby.currentGameBlueSide) || 'blue';

    function banSlot(n) {
      if (!n) return '<div class="dcoop-past-ban empty" title="пусто">✕</div>';
      var img = window._champIcon ? window._champIcon(n) : '';
      return '<div class="dcoop-past-ban" title="'+escapeHtml(n)+'"><img loading="lazy" decoding="async" src="'+img+'" alt="'+escapeHtml(n)+'" onerror="this.style.display=\'none\'"></div>';
    }

    var rowsHtml = completed.map(function(g){
      // Если blueSide прошлой игры не совпадает с текущим — свапаем отображение,
      // чтобы каждая команда всегда была на своей НЫНЕШНЕЙ стороне.
      var needSwap = (g.blueSide || 'blue') !== currentBlueSide;
      var bluePicks = padRow(needSwap ? g.picksRed  : g.picksBlue).map(slot).join('');
      var redPicks  = padRow(needSwap ? g.picksBlue : g.picksRed ).map(slot).join('');
      var blueBans  = (needSwap ? (g.bansRed  || []) : (g.bansBlue || [])).map(banSlot).join('');
      var redBans   = (needSwap ? (g.bansBlue || []) : (g.bansRed  || [])).map(banSlot).join('');
      // Маппим позицию победителя на текущую сторону отображения
      var winnerPos = g.winner; // 'blue'|'red' (позиция победителя)
      var winnerDisplay = winnerPos
        ? (needSwap ? (winnerPos === 'blue' ? 'red' : 'blue') : winnerPos)
        : null;
      var divContent = winnerDisplay
        ? '<span style="color:'+(winnerDisplay==='blue'?'#5dade2':'#e74c3c')+';font-size:9px;line-height:1;">▲</span>'
        : '';
      return '<div class="dcoop-past-row">'
        + '<div class="dcoop-past-num">G'+g.number+'</div>'
        + '<div class="dcoop-past-col blue">'
        +   '<div class="dcoop-past-bans">'+blueBans+'</div>'
        +   '<div class="dcoop-past-picks">'+bluePicks+'</div>'
        + '</div>'
        + '<div class="dcoop-past-divider">'+divContent+'</div>'
        + '<div class="dcoop-past-col red">'
        +   '<div class="dcoop-past-picks">'+redPicks+'</div>'
        +   '<div class="dcoop-past-bans">'+redBans+'</div>'
        + '</div>'
        + '</div>';
    }).join('');

    if (isMobileDraft()) {
      var icon = _pastGamesExpanded ? '▲' : '▼';
      // Мини-индикатор счёта серии: blue · cnt: red — даже когда drawer свёрнут.
      var bs = (lobby.seriesScore && lobby.seriesScore.blue) || 0;
      var rs = (lobby.seriesScore && lobby.seriesScore.red)  || 0;
      var seriesType = (lobby.seriesType || 'bo1').toUpperCase();
      // Цветовые индикаторы побед в каждой игре
      var dotsHtml = completed.map(function(g){
        var winningTeam = g.winner === 'blue'
          ? ((g.blueSide || 'blue') === 'blue' ? 'blue' : 'red')
          : ((g.blueSide || 'blue') === 'blue' ? 'red' : 'blue');
        var col = winningTeam === 'blue' ? '#5dade2' : '#e74c3c';
        return '<span class="dcoop-past-dot" style="background:'+col+';" title="Игра '+g.number+'"></span>';
      }).join('');
      return ''
        + '<div class="dcoop-past'+(_pastGamesExpanded?' open':'')+'" id="dcoopPast">'
        +   '<button class="dcoop-past-header" onclick="dcoopTogglePast()" aria-expanded="'+(_pastGamesExpanded?'true':'false')+'">'
        +     '<span class="dcoop-past-h-left">'
        +       '<span class="dcoop-past-h-title">📜 '+completed.length+'/'+seriesType+'</span>'
        +       '<span class="dcoop-past-dots">'+dotsHtml+'</span>'
        +     '</span>'
        +     '<span class="dcoop-past-h-right">'
        +       '<span class="dcoop-past-h-score"><span style="color:#5dade2;">'+bs+'</span><span style="color:var(--text-faint);">:</span><span style="color:#e74c3c;">'+rs+'</span></span>'
        +       '<span class="dcoop-past-chev">'+icon+'</span>'
        +     '</span>'
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
      +   fearlessPoolBadgeHtml()
      +   compositionWarningsHtml()
      +   '<input id="dcoopChampSearch" type="text" placeholder="🔍 Поиск чемпиона" oninput="dcoopFilterSearch(this.value)">'
      +   '<div class="dcoop-roles">'+roleBtns+'</div>'
      + '</div>';
  }

  // ─── F5: Composition warnings ─────────────────────────
  // Архетипы-категории: ищем категории с такими именами (case-insensitive substring)
  // и считаем, сколько наших пиков их имеют. Если 0 — предупреждение.
  var COMP_ARCHETYPES = [
    { key: 'ap',     match: ['ap','маг','mage'],           label: 'AP',     warn: 'нет магического урона' },
    { key: 'ad',     match: ['ad','адц','adc','физ'],      label: 'AD',     warn: 'нет физического урона' },
    { key: 'tank',   match: ['tank','танк'],               label: 'Tank',   warn: 'нет фронта/танка' },
    { key: 'engage', match: ['engage','инициат','стан'],   label: 'Engage', warn: 'нет инициации' },
    { key: 'heal',   match: ['heal','хил','лек'],          label: 'Heal',   warn: 'нет хила/сустэйна' }
  ];

  function _champCategoriesOf(champ) {
    var all = window._champCategories || [];
    return all.filter(function(c){
      if (c.champStars) {
        var found = false;
        ['1','2','3'].forEach(function(s){ if ((c.champStars[s]||[]).indexOf(champ) !== -1) found = true; });
        if (found) return true;
      }
      return (c.champions || []).indexOf(champ) !== -1;
    });
  }
  function _categoryMatchesArchetype(cat, arch) {
    var n = (cat.name || '').toLowerCase();
    for (var i = 0; i < arch.match.length; i++) {
      if (n.indexOf(arch.match[i]) !== -1) return true;
    }
    return false;
  }
  function computeCompositionWarnings(lobby, game, mySide) {
    if (!mySide || !game) return [];
    var picks = ((game.picks && game.picks[mySide]) || [])
      .map(function(p){ return p && p.champ; }).filter(Boolean);
    if (!picks.length) return [];
    // Считаем сколько пиков попадают в каждый архетип
    var counts = {};
    COMP_ARCHETYPES.forEach(function(a){ counts[a.key] = 0; });
    picks.forEach(function(name){
      var cats = _champCategoriesOf(name);
      COMP_ARCHETYPES.forEach(function(a){
        if (cats.some(function(c){ return _categoryMatchesArchetype(c, a); })) counts[a.key]++;
      });
    });
    var warnings = [];
    // Только когда уже выбрано хотя бы 3 пика — иначе слишком рано судить
    if (picks.length < 3) return warnings;
    COMP_ARCHETYPES.forEach(function(a){
      if (counts[a.key] === 0) warnings.push({ key: a.key, label: a.label, msg: a.warn });
    });
    // Перекос: все 5 пиков одного типа AD/AP
    if (picks.length === 5) {
      if (counts.ad === 5) warnings.push({ key: 'allAD', label: 'all-AD', msg: 'весь урон физический — лёгкая броня соперника' });
      if (counts.ap === 5) warnings.push({ key: 'allAP', label: 'all-AP', msg: 'весь урон магический — лёгкая магзащита соперника' });
    }
    return warnings;
  }

  function compositionWarningsHtml() {
    var l = _currentLobby; var g = _currentGame;
    if (!l || !g) return '';
    var uid = _uid();
    var mySide = null;
    if (l.blueCaptain && l.blueCaptain.uid === uid) mySide = 'blue';
    else if (l.redCaptain && l.redCaptain.uid === uid) mySide = 'red';
    if (!mySide) return ''; // только капитанам показываем
    // Учитываем свап сторон: какая моя «позиция» в текущей игре
    var roles = sideRoles(l, g);
    var posSide = (roles.blue.cap && roles.blue.cap.uid === uid) ? 'blue' : 'red';
    var warnings = computeCompositionWarnings(l, g, posSide);
    if (!warnings.length) return '';
    return '<div class="dcoop-comp-warn">'
      + warnings.map(function(w){
          return '<span class="dcoop-comp-warn-item">⚠ '+escapeHtml(w.msg)+'</span>';
        }).join('')
      + '</div>';
  }

  // F4: Champion pool exposure (только Fearless, начиная с game 2).
  // Считаем сколько чемпов из твоего профильного пула (localStorage 'p') ещё доступны.
  function _myComfortPool() {
    try {
      var arr = JSON.parse(localStorage.getItem('p') || '[]');
      if (Array.isArray(arr)) return arr;
    } catch(e){}
    return [];
  }
  function fearlessPoolBadgeHtml() {
    var l = _currentLobby; var g = _currentGame;
    if (!l || !g) return '';
    if (l.mode !== 'fearless') return '';
    if ((g.number || 1) < 2) return '';
    var pool = _myComfortPool();
    if (!pool.length) return '';
    var used = (l.usedChampions || []);
    var usedSet = {};
    used.forEach(function(n){ usedSet[n] = 1; });
    var available = pool.filter(function(n){ return !usedSet[n]; });
    var col = available.length <= 2 ? '#e74c3c'
            : (available.length <= 5 ? '#f1c40f' : '#2ecc71');
    var hint = available.length <= 2 ? 'мало комфортных пиков'
             : (available.length <= 5 ? 'твой пул сужается' : 'твой пул свободен');
    return '<div class="dcoop-fearless-pool" title="'+escapeHtml(hint)+'">'
      + '<span class="dcoop-fp-label">🛡 Твой пул:</span>'
      + '<span class="dcoop-fp-count" style="color:'+col+';">'+available.length+'/'+pool.length+'</span>'
      + '</div>';
  }

  function lockInBtnHtml(myTurn, game, step, mySide, iAmCaptain, myTeam) {
    if (game.phase === 'done') return '';
    // Оба кэпа ещё не нажали "Готов" — показываем кнопку готовности вместо Lock In
    if (!game.readyBlue || !game.readyRed) {
      if (iAmCaptain) {
        // game.readyBlue/readyRed пишутся по КОМАНДЕ (см. draftCapReady),
        // поэтому читаем по myTeam, не по mySide (позиции).
        var myReady = myTeam === 'blue' ? !!game.readyBlue : !!game.readyRed;
        if (myReady) {
          return '<button class="dcoop-lock-btn" disabled style="background:rgba(46,204,113,0.18);color:#2ecc71;border-color:#2ecc71;cursor:default;">✓ Готов — ждём соперника…</button>';
        }
        return '<button id="dcoopDraftReadyBtn" class="dcoop-lock-btn" onclick="dcoopDraftCapReady()" style="background:#2ecc71;color:#000;border-color:#2ecc71;">✅ Готов</button>';
      }
      return '<div class="dcoop-lock-hint">Ждём готовности капитанов…</div>';
    }
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
        renderGallery(lobby, game, step, mySide, getUnavailable(game, lobby.mode==='fearless'?lobby.usedChampions||[]:[], lobby.globalBans||[]));
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
      else if (st === 'global') cls += ' global-banned';
      return '<div class="'+cls+'" data-champ="'+escapeHtml(c.name)+'" onclick="dcoopChampClick(\''+encodeURIComponent(c.name)+'\')" title="'+escapeHtml(c.name)+'">'
        +   '<img loading="lazy" decoding="async" src="'+c.img+'" alt="'+escapeHtml(c.name)+'" onerror="this.style.display=\'none\'">'
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
      renderGallery(_currentLobby, _currentGame, WR_DRAFT_SEQUENCE[_currentGame.turnIndex], null, getUnavailable(_currentGame, fl, _currentLobby.globalBans||[]));
    }
  }

  function filterSearch(v) {
    _filterQuery = v || '';
    if (_currentLobby && _currentGame) {
      var fl = _currentLobby.mode==='fearless' ? (_currentLobby.usedChampions||[]) : [];
      renderGallery(_currentLobby, _currentGame, WR_DRAFT_SEQUENCE[_currentGame.turnIndex], null, getUnavailable(_currentGame, fl, _currentLobby.globalBans||[]));
    }
  }

  // ─── Champion click handler (hover + enable Lock In) ───
  function champClick(nameEncoded) {
    var name = decodeURIComponent(nameEncoded);
    var l = _currentLobby, g = _currentGame;
    if (!l || !g) return;
    var uid = _uid();
    var roles = sideRoles(l, g);
    var mySide = null;
    if (roles.blue.cap && roles.blue.cap.uid === uid) mySide = 'blue';
    else if (roles.red.cap && roles.red.cap.uid === uid) mySide = 'red';
    if (!mySide) return;
    var step = WR_DRAFT_SEQUENCE[g.turnIndex];
    if (!step || step.side !== mySide) return;

    var fl = l.mode==='fearless' ? (l.usedChampions||[]) : [];
    var unavail = getUnavailable(g, fl, l.globalBans||[]);
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

    // Hover остаётся ЛОКАЛЬНЫМ — НЕ пишем в Firestore.
    // Иначе соперник видит выбор капитана до Lock In (спойлер).
    // Если время истечёт — onTimerExpired сделает random fallback (deterministicPick).

    // Обновить preview slots (только в DOM текущего клиента)
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
    var roles = sideRoles(l, g);
    var mySide = null;
    if (roles.blue.cap && roles.blue.cap.uid === uid) mySide = 'blue';
    else if (roles.red.cap && roles.red.cap.uid === uid) mySide = 'red';
    if (!mySide) return;
    var step = WR_DRAFT_SEQUENCE[g.turnIndex];
    if (!step || step.side !== mySide) return;
    var champ = _hoverLocal;

    var fl = l.mode==='fearless' ? (l.usedChampions||[]) : [];
    if (getUnavailable(g, fl, l.globalBans||[])[champ]) { toast('Недоступен'); return; }

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
    // hover больше не пишется в Firestore — он чисто локальный, чтобы соперник
    // не видел выбор до Lock In. Очищать в Firestore не нужно.
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
  // Состояние звуковой системы — чтобы не пиликать дважды на одну секунду / поворот
  var _soundLastSecond = null;
  var _soundLastTurnKey = null;
  var _soundLastDoneKey = null;

  function startTimer(lobby, game, step, mySide) {
    if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
    _renderPausedBanner();
    var tEl = document.getElementById('dcoopTimer');
    if (!tEl) return;
    if (!step || game.phase === 'done') {
      tEl.textContent = '—';
      // Звук завершения драфта (один раз)
      if (game.phase === 'done') {
        var dk = lobby.id + '/' + game.number + ':done';
        if (_soundLastDoneKey !== dk) { _soundLastDoneKey = dk; playEndSound(); }
      }
      return;
    }
    // Не тикаем пока оба капитана не нажали "Готов"
    if (!game.readyBlue || !game.readyRed) { tEl.textContent = '—'; return; }
    // F7: пауза — таймер замораживаем, бейдж соперника скрываем
    if (lobby.status === 'paused') {
      tEl.textContent = '⏸';
      tEl.style.color = '#f1c40f';
      removeOpponentTimerBadge();
      return;
    }

    // Звук «твой ход начался» — один раз на смену turnIndex, только если ход мой
    var turnKey = lobby.id + '/' + game.number + '/' + game.turnIndex;
    if (mySide && step.side === mySide && _soundLastTurnKey !== turnKey) {
      _soundLastTurnKey = turnKey;
      playTurnSound();
    } else if (_soundLastTurnKey !== turnKey) {
      // Не мой ход — обновляем ключ без звука, чтобы не сыграть позднее
      _soundLastTurnKey = turnKey;
    }
    _soundLastSecond = null;

    var total = lobby.timerSeconds || 45;
    var startMs = (game.turnStartedAt && game.turnStartedAt.toMillis) ? game.turnStartedAt.toMillis() : _serverNow();

    function tick() {
      // _serverNow() = Date.now() - clock-skew offset. Без коррекции таймер
      // у двух кэпов идёт по-разному (часы их устройств не синхронны).
      var left = total - (_serverNow() - startMs) / 1000;
      if (left < 0) left = 0;
      var sec = Math.ceil(left);
      tEl.textContent = sec + 'с';
      tEl.style.color = left < 5 ? '#e74c3c' : (left < 15 ? '#f1c40f' : '#fff');

      // F2: бейдж «ход соперника» — виден только когда я капитан и ходит соперник.
      // Помогает чувствовать темп даже не глядя в центральный таймер.
      updateOpponentTimerBadge(mySide, step, sec);

      // Бипы только когда мой ход (соперника не отвлекаем)
      if (mySide && step.side === mySide && sec !== _soundLastSecond) {
        _soundLastSecond = sec;
        if (sec === 1) playUrgentSound();
        else if (sec >= 2 && sec <= 5) playTickSound();
      }

      if (left <= 0) {
        clearInterval(_timerInterval); _timerInterval = null;
        onTimerExpired(lobby, game, step, mySide);
      }
    }
    tick();
    _timerInterval = setInterval(tick, 200);
  }

  function updateOpponentTimerBadge(mySide, step, sec) {
    var showOpp = mySide && step && step.side !== mySide;
    var existing = document.getElementById('dcoopOppBadge');
    if (!showOpp) {
      if (existing) existing.remove();
      return;
    }
    if (!existing) {
      existing = document.createElement('div');
      existing.id = 'dcoopOppBadge';
      existing.className = 'dcoop-opp-badge dcoop-opp-' + step.side;
      document.body.appendChild(existing);
    } else {
      // Обновим класс — на случай смены стороны соперника
      existing.className = 'dcoop-opp-badge dcoop-opp-' + step.side;
    }
    var actionTxt = step.action === 'ban' ? 'банит' : 'пикает';
    var col = sec < 5 ? '#e74c3c' : (sec < 15 ? '#f1c40f' : '');
    existing.innerHTML = '<span class="dcoop-opp-badge-action">соперник '+actionTxt+'…</span>'
                       + '<span class="dcoop-opp-badge-time"'+(col?' style="color:'+col+';"':'')+'>'+sec+'с</span>';
  }
  function removeOpponentTimerBadge() {
    var el = document.getElementById('dcoopOppBadge');
    if (el) el.remove();
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

  // Показать поверх таймера и активного слота индикатор «применяется…» —
  // сообщает юзерам, что таймер истёк и сейчас применится auto-pick.
  function showAutoApplyHint(step) {
    var tEl = document.getElementById('dcoopTimer');
    if (tEl) {
      tEl.textContent = '…';
      tEl.style.color = '#f1c40f';
      tEl.classList.add('dcoop-timer-applying');
    }
    // Подсветка активного слота (баннер рядом)
    var activeSlot = document.querySelector('.dcoop-active-slot');
    if (activeSlot && !activeSlot.querySelector('.dcoop-auto-apply-badge')) {
      var badge = document.createElement('div');
      badge.className = 'dcoop-auto-apply-badge';
      badge.textContent = 'авто…';
      activeSlot.appendChild(badge);
    }
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

    // Визуальный индикатор: показываем что таймер истёк и сейчас применится auto-pick
    showAutoApplyHint(step);

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
              var un = getUnavailable(g, fl, lobby.globalBans||[]);
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

  function setWinner(winningTeam) {
    // winningTeam = 'blue' | 'red' — ИДЕНТИФИКАТОР КОМАНДЫ в лобби, не позиция.
    // Команда 'blue' = blueCaptain's team, 'red' = redCaptain's team — не меняется при свапах.
    var l = _currentLobby, g = _currentGame;
    if (!l || !g) return;
    // Идемпотентность: не начислять повторно, если winner уже выставлен.
    if (g.winner) return;
    var dbInst = _db();
    // Вычисляем, на какой ПОЗИЦИИ сейчас стоит выигравшая КОМАНДА (для хранения в game.winner).
    var roles = sideRoles(l, g);
    var winningSide = (roles.blue.team === winningTeam) ? 'blue' : 'red';
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
      winner: winningSide,  // позиция победителя (для отображения в past games / replay)
      blueSide: g.blueSide || 'blue',
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
      lobbyRef.collection('games').doc(String(g.number)).update({ winner: winningSide }),
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
    var unavail = getUnavailable(game, fearlessLock, lobby.globalBans || []);

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
        +    '<img loading="lazy" decoding="async" src="'+img+'" alt="'+escapeHtml(x.name)+'" onerror="this.style.display=\'none\'">'
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

    var uid = _uid();
    var isCreator = l.createdBy === uid;
    var specs = l.invitedSpectators || [];
    var rowsHtml = specs.length
      ? specs.map(function(su){
          var nick = (l.spectatorNicks && l.spectatorNicks[su]) || su.slice(0,8);
          var rmBtn = isCreator
            ? '<button class="dcoop-spec-remove-btn" data-spec-uid="'+escapeHtml(su)+'" title="Удалить" style="background:none;border:none;color:#e74c3c;cursor:pointer;font-size:11px;padding:0 4px;">✕</button>'
            : '';
          return '<div class="dcoop-spec-row" style="display:flex;align-items:center;gap:6px;justify-content:space-between;"><span>'+escapeHtml(nick)+'</span>'+rmBtn+'</div>';
        }).join('')
      : '<div style="color:var(--text-faint);font-size:12px;padding:8px;text-align:center;">Зрителей нет</div>';

    var inviteBtn = isCreator
      ? '<button class="dcoop-spec-action-btn" data-action="invite" style="margin-top:8px;width:100%;padding:7px;border:1px solid var(--accent-border);background:var(--accent-dim);color:var(--accent);border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;">+ Пригласить зрителя</button>'
      : '';
    var linkBtn = isCreator
      ? '<button class="dcoop-spec-action-btn" data-action="copy-link" style="margin-top:4px;width:100%;padding:7px;border:1px solid var(--accent-border);background:transparent;color:#fff;border-radius:7px;font-size:12px;cursor:pointer;">🔗 Скопировать ссылку</button>'
      : '';

    var drop = document.createElement('div');
    drop.id = 'dcoopSpecDrop';
    drop.className = 'dcoop-spec-drop';
    drop.innerHTML = '<div class="dcoop-spec-title">👁 Зрители ('+specs.length+'/'+MAX_SPECTATORS+')</div>' + rowsHtml + inviteBtn + linkBtn;
    drop.addEventListener('click', function(e){
      e.stopPropagation();
      var rmBtn = e.target.closest('.dcoop-spec-remove-btn');
      if (rmBtn) {
        var su = rmBtn.getAttribute('data-spec-uid');
        if (su) removeSpectator(su);
        return;
      }
      var actBtn = e.target.closest('.dcoop-spec-action-btn');
      if (!actBtn) return;
      var action = actBtn.getAttribute('data-action');
      // После любого action — закрываем drop, чтобы открылся следующий шаг.
      var el = document.getElementById('dcoopSpecDrop');
      if (el && el.parentNode) el.parentNode.removeChild(el);
      if (action === 'invite') window.dcoopInviteSpectator();
      else if (action === 'copy-link') window.dcoopCopyInvite();
    });
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
    var _cl = l;
    window._showConfirm({ msg: 'Текущий драфт будет прерван и лобби закроется.', title: 'Закрыть лобби?', confirmText: 'Закрыть', icon: '🚫' }, function() {
      _db().collection('draftLobbies').doc(_cl.id).update({
        status: 'closed',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }).then(function(){
        toast('Лобби закрыто');
        document.body.classList.remove('dcoop-fullscreen');
        var _aPanel = document.getElementById('dcoopAssistPanel'); if (_aPanel) _aPanel.parentNode.removeChild(_aPanel);
        backToList();
      }).catch(function(e){ toast('Ошибка: '+e.message); });
    });
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
    // Сброс кэша автодействий — чтобы не накапливать ключи прошлых игр
    _autoActionFired = {};
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
      turnStartedAt: null, // запустится когда оба кэпа нажмут "Готов" в драфте
      readyBlue: false,
      readyRed: false,
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

  // ─── RENDER LOBBY (router по статусу) ───
  function renderLobby(l) {
    var pane = document.getElementById('dcoopPaneLobby');
    if (!pane) return;
    if (l.status === 'waiting' || l.status === 'ready_check') {
      stopGameListener();
      renderWaitingRoom(l, pane);
      return;
    }
    if (l.status === 'drafting' || l.status === 'paused' || l.status === 'finished_game') {
      listenToCurrentGame(l);
      return;
    }
    if (l.status === 'series_done' || l.status === 'closed') {
      stopLobbyListener();
      stopGameListener();
      replayGame(l.id, null);
      return;
    }
    pane.innerHTML = '<pre style="padding:20px;color:#fff;font-size:11px;">'+escapeHtml(JSON.stringify(l,null,2))+'</pre>';
  }

  // ─── REPLAY (read-only просмотр отдельной игры) ───
  // Кэш: лобби + все игры серии. Сброс при смене лобби или выходе.
  var _replayCache = null; // { lobbyId, lobby, allGames }

  function replayGame(lobbyId, gameId) {
    var pane = document.getElementById('dcoopPaneLobby');
    if (!pane) return;

    // Если данные этой серии уже загружены — рендерим без Firestore запроса (без flash)
    if (_replayCache && _replayCache.lobbyId === lobbyId) {
      var cached = _replayCache;
      var found = null;
      if (!gameId) {
        found = cached.allGames[0] || null;
      } else {
        for (var i = 0; i < cached.allGames.length; i++) {
          if (cached.allGames[i].id === gameId) { found = cached.allGames[i]; break; }
        }
      }
      if (found) { renderReplay(cached.lobby, found, cached.allGames); return; }
    }

    // Первая загрузка — тянем из Firestore
    var dbInst = _db();
    if (!dbInst) return;
    pane.innerHTML = '<div style="padding:30px;text-align:center;color:var(--text-faint);">Загрузка…</div>';

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
        if (gameId && d.id === gameId) found = gg;
      });
      if (!found) found = allGames[0] || null; // null gameId → first game
      if (!found) { pane.innerHTML = '<div style="padding:30px;color:#e74c3c;text-align:center;">Игра не найдена</div>'; return; }
      // Сохраняем в кэш — следующие переключения будут мгновенными
      _replayCache = { lobbyId: lobbyId, lobby: l, allGames: allGames };
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
    if (window.closeSidebar) window.closeSidebar(); // сброс _pcSideMode/_sidebarModalId JS-состояния
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
      +   '<button onclick="dcoopBackToList()" class="dcoop-back-btn">← К списку</button>'
      +   '<div class="dcoop-replay-info">'
      +     '<span class="dcoop-replay-title">Игра '+game.number+' · реплей</span>'
      +     '<span class="dcoop-replay-teams">'+escapeHtml(lobby.blueTeamName||'Blue')+' vs '+escapeHtml(lobby.redTeamName||'Red')+'</span>'
      +   '</div>'
      +   '<div class="dcoop-replay-winner" style="color:'+winCol+';">🏆 '+escapeHtml(winLabel)+'</div>'
      +   '<div class="dcoop-replay-export-btns">'
      +     '<button onclick="dcoopExportReplayPng(\''+lobby.id+'\',\''+game.id+'\')" class="dcoop-back-btn" title="Сохранить PNG">📷 PNG</button>'
      +     '<button onclick="dcoopCopyReplayText(\''+lobby.id+'\',\''+game.id+'\')" class="dcoop-back-btn" title="Скопировать в буфер">📋 Текст</button>'
      +   '</div>'
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

  // ─── F8: Replay export (PNG + text) ─────────────────────
  function _findGameInCache(lobbyId, gameId) {
    if (_replayCache && _replayCache.lobbyId === lobbyId) {
      var g = _replayCache.allGames.filter(function(x){ return x.id === gameId; })[0];
      if (g) return { lobby: _replayCache.lobby, game: g };
    }
    return null;
  }

  function copyReplayText(lobbyId, gameId) {
    var ctx = _findGameInCache(lobbyId, gameId);
    if (!ctx) { toast('Нет данных для экспорта'); return; }
    var l = ctx.lobby, g = ctx.game;
    var roles = sideRoles(l, g);
    var blueName = roles.blue.teamName;
    var redName  = roles.red.teamName;
    var bs = (l.seriesScore && l.seriesScore[roles.blue.team]) || 0;
    var rs = (l.seriesScore && l.seriesScore[roles.red.team])  || 0;
    var winnerTeam = g.winner ? roles[g.winner].team : null;
    var winnerLabel = winnerTeam === 'blue' ? (l.blueTeamName||'Blue')
                     : winnerTeam === 'red'  ? (l.redTeamName||'Red')
                     : '—';
    var lines = [];
    lines.push('🎯 Драфт · Игра ' + g.number);
    lines.push(blueName + ' ' + bs + ' : ' + rs + ' ' + redName);
    lines.push('🏆 Победили: ' + winnerLabel);
    lines.push('');
    function listPicks(side) {
      return ((g.picks && g.picks[side]) || []).map(function(p){ return p && p.champ; }).filter(Boolean);
    }
    function listBans(side) {
      return ((g.bans && g.bans[side]) || []).filter(Boolean);
    }
    lines.push('🔵 ' + blueName);
    lines.push('  ⛔ Баны: '  + (listBans('blue').join(', ') || '—'));
    lines.push('  ⚔ Пики: '  + (listPicks('blue').join(', ') || '—'));
    lines.push('🔴 ' + redName);
    lines.push('  ⛔ Баны: '  + (listBans('red').join(', ') || '—'));
    lines.push('  ⚔ Пики: '  + (listPicks('red').join(', ') || '—'));
    lines.push('');
    lines.push('Mode: ' + (l.mode === 'fearless' ? 'Fearless' : 'Normal') + ' · ' + (l.seriesType || 'bo1').toUpperCase());
    var txt = lines.join('\n');
    try {
      navigator.clipboard.writeText(txt).then(function(){ toast('Текст скопирован'); });
    } catch(e) {
      prompt('Скопируйте текст:', txt);
    }
  }
  window.dcoopCopyReplayText = copyReplayText;

  function exportReplayPng(lobbyId, gameId) {
    var ctx = _findGameInCache(lobbyId, gameId);
    if (!ctx) { toast('Нет данных для экспорта'); return; }
    var l = ctx.lobby, g = ctx.game;
    var roles = sideRoles(l, g);
    var blueName = roles.blue.teamName;
    var redName  = roles.red.teamName;
    var bs = (l.seriesScore && l.seriesScore[roles.blue.team]) || 0;
    var rs = (l.seriesScore && l.seriesScore[roles.red.team])  || 0;
    var winnerTeam = g.winner ? roles[g.winner].team : null;
    var W = 960, H = 540;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var c = document.createElement('canvas');
    c.width = W * dpr; c.height = H * dpr;
    var ctx2d = c.getContext('2d');
    ctx2d.scale(dpr, dpr);
    // Фон
    var grad = ctx2d.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#1a0d2e');
    grad.addColorStop(1, '#0f0520');
    ctx2d.fillStyle = grad;
    ctx2d.fillRect(0, 0, W, H);
    // Заголовок
    ctx2d.fillStyle = '#fff';
    ctx2d.font = '700 26px system-ui, sans-serif';
    ctx2d.textAlign = 'center';
    ctx2d.fillText('🎯 Драфт · Игра ' + g.number, W/2, 44);
    ctx2d.font = '900 36px system-ui, sans-serif';
    ctx2d.fillStyle = '#5dade2'; ctx2d.textAlign = 'right';
    ctx2d.fillText(blueName + '  ' + bs, W/2 - 18, 90);
    ctx2d.fillStyle = 'rgba(255,255,255,0.4)'; ctx2d.textAlign = 'center';
    ctx2d.fillText(':', W/2, 90);
    ctx2d.fillStyle = '#e74c3c'; ctx2d.textAlign = 'left';
    ctx2d.fillText(rs + '  ' + redName, W/2 + 18, 90);
    // Победитель
    if (winnerTeam) {
      var wLabel = winnerTeam === 'blue' ? blueName : redName;
      var wCol   = winnerTeam === 'blue' ? '#5dade2' : '#e74c3c';
      ctx2d.fillStyle = wCol; ctx2d.font = '800 18px system-ui, sans-serif'; ctx2d.textAlign = 'center';
      ctx2d.fillText('🏆 ' + wLabel + ' победили', W/2, 122);
    }

    function listPicks(side) {
      return ((g.picks && g.picks[side]) || []).map(function(p){ return p && p.champ; }).filter(Boolean);
    }
    function listBans(side) {
      return ((g.bans && g.bans[side]) || []).filter(Boolean);
    }

    // Превращаем chamber-name в img-объект (URL → загрузить → отрисовать)
    function loadImg(src){
      return new Promise(function(resolve){
        if (!src) { resolve(null); return; }
        var img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function(){ resolve(img); };
        img.onerror = function(){ resolve(null); };
        img.src = src;
      });
    }
    var SLOT = 60, GAP = 10, ICO_R = 6;
    function drawSlot(x, y, name, isBan) {
      ctx2d.fillStyle = 'rgba(255,255,255,0.04)';
      _roundRect(ctx2d, x, y, SLOT, SLOT, ICO_R);
      ctx2d.fill();
      ctx2d.strokeStyle = isBan ? 'rgba(231,76,60,0.5)' : 'rgba(255,255,255,0.18)';
      ctx2d.lineWidth = 1.5;
      _roundRect(ctx2d, x, y, SLOT, SLOT, ICO_R);
      ctx2d.stroke();
      if (name) {
        ctx2d.fillStyle = '#fff';
        ctx2d.font = '700 9px system-ui, sans-serif';
        ctx2d.textAlign = 'center';
        ctx2d.fillText((name || '').slice(0, 10), x + SLOT/2, y + SLOT - 4);
      }
    }
    function _roundRect(c, x, y, w, h, r) {
      c.beginPath();
      c.moveTo(x+r, y);
      c.arcTo(x+w, y, x+w, y+h, r);
      c.arcTo(x+w, y+h, x, y+h, r);
      c.arcTo(x, y+h, x, y, r);
      c.arcTo(x, y, x+w, y, r);
      c.closePath();
    }

    // Layout: 2 строки бан/пик для blue (вверху) и red (внизу)
    var iconFn = window._champIcon;
    var bluePicks = listPicks('blue');
    var redPicks  = listPicks('red');
    var blueBans  = listBans('blue');
    var redBans   = listBans('red');
    // Заголовки строк
    function drawRowLabels(yTop, color, label) {
      ctx2d.fillStyle = color; ctx2d.textAlign = 'left';
      ctx2d.font = '900 14px system-ui, sans-serif';
      ctx2d.fillText(label, 30, yTop - 8);
    }
    var BLUE_Y = 170;
    var RED_Y  = 360;
    drawRowLabels(BLUE_Y, '#5dade2', '🔵 ' + blueName);
    drawRowLabels(RED_Y,  '#e74c3c', '🔴 ' + redName);

    // Сначала рисуем заглушки (поверх потом добавим картинки)
    function rowX(i){ return 30 + i * (SLOT + GAP); }
    [0,1,2,3,4].forEach(function(i){
      drawSlot(rowX(i), BLUE_Y, bluePicks[i], false);
      drawSlot(rowX(i), RED_Y,  redPicks[i], false);
    });
    // Баны — отдельная row
    var BAN_BLUE_Y = BLUE_Y + 80;
    var BAN_RED_Y  = RED_Y  + 80;
    ctx2d.fillStyle = 'rgba(231,76,60,0.65)';
    ctx2d.font = '700 11px system-ui, sans-serif'; ctx2d.textAlign = 'left';
    ctx2d.fillText('⛔ Bans', 30, BAN_BLUE_Y - 6);
    ctx2d.fillText('⛔ Bans', 30, BAN_RED_Y  - 6);
    [0,1,2,3,4].forEach(function(i){
      drawSlot(rowX(i), BAN_BLUE_Y, blueBans[i], true);
      drawSlot(rowX(i), BAN_RED_Y,  redBans[i],  true);
    });

    // Footer
    ctx2d.fillStyle = 'rgba(255,255,255,0.4)';
    ctx2d.font = '600 11px system-ui, sans-serif';
    ctx2d.textAlign = 'center';
    ctx2d.fillText((l.mode === 'fearless' ? 'Fearless' : 'Normal') + ' · ' + (l.seriesType || 'bo1').toUpperCase()
      + ' · wildrift-stats', W/2, H - 14);

    // Загружаем картинки чемпов параллельно и накладываем поверх слотов
    var jobs = [];
    function addJob(name, x, y) {
      if (!name || !iconFn) return;
      jobs.push(loadImg(iconFn(name)).then(function(img){
        if (!img) return;
        ctx2d.save();
        _roundRect(ctx2d, x, y, SLOT, SLOT, ICO_R); ctx2d.clip();
        ctx2d.drawImage(img, x, y, SLOT, SLOT);
        ctx2d.restore();
        // Затем имя в углу — оно уже было нарисовано до картинки, можно ещё раз сверху для четкости
      }));
    }
    [0,1,2,3,4].forEach(function(i){
      addJob(bluePicks[i], rowX(i), BLUE_Y);
      addJob(redPicks[i],  rowX(i), RED_Y);
      addJob(blueBans[i],  rowX(i), BAN_BLUE_Y);
      addJob(redBans[i],   rowX(i), BAN_RED_Y);
    });

    Promise.all(jobs).then(function(){
      try {
        c.toBlob(function(blob){
          if (!blob) { toast('Не удалось создать PNG'); return; }
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'draft-' + (l.blueTeamName||'blue').replace(/[^a-z0-9]+/gi,'_')
                    + '-vs-' + (l.redTeamName||'red').replace(/[^a-z0-9]+/gi,'_')
                    + '-game' + g.number + '.png';
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
          toast('PNG сохранён');
        }, 'image/png');
      } catch(e) {
        // CORS на чемп-иконках может уронить toBlob — fallback на open в новом окне
        try {
          var url2 = c.toDataURL('image/png');
          var w = window.open();
          if (w) w.document.write('<img loading="lazy" decoding="async" src="'+url2+'" style="max-width:100%;">');
          else toast('PNG не удалось сохранить (CORS). Скопируйте текст.');
        } catch(_) { toast('PNG не удалось сохранить (CORS). Скопируйте текст.'); }
      }
    });
  }
  window.dcoopExportReplayPng = exportReplayPng;

  // ─── DRAFT CAP READY (замена Lock In до старта таймера) ───
  function draftCapReady() {
    var l = _currentLobby, g = _currentGame;
    if (!l || !g) return;
    var uid = _uid();
    var isBlue = l.blueCaptain && l.blueCaptain.uid === uid;
    var isRed  = l.redCaptain  && l.redCaptain.uid  === uid;
    if (!isBlue && !isRed) return;

    // Disable кнопку сразу чтобы не нажали дважды
    var btn = document.getElementById('dcoopDraftReadyBtn');
    if (btn) { btn.disabled = true; btn.textContent = '…'; }

    var dbInst = _db();
    var gameRef = dbInst.collection('draftLobbies').doc(l.id)
      .collection('games').doc(String(g.number));

    dbInst.runTransaction(function(tx) {
      return tx.get(gameRef).then(function(snap) {
        if (!snap.exists) return;
        var data = snap.data();
        var patch = {};
        if (isBlue) patch.readyBlue = true;
        if (isRed)  patch.readyRed  = true;

        var newBlue = isBlue ? true : !!data.readyBlue;
        var newRed  = isRed  ? true : !!data.readyRed;

        // Когда оба готовы — стартуем таймер
        if (newBlue && newRed) {
          patch.turnStartedAt = firebase.firestore.FieldValue.serverTimestamp();
        }
        tx.update(gameRef, patch);
      });
    }).catch(function(e) { toast('Ошибка: ' + e.message); });
  }
  window.dcoopDraftCapReady = draftCapReady;

  // ═══════════════════════════════════════════
  // F3: LOBBY CHAT (text + reactions, любой участник лобби)
  // ═══════════════════════════════════════════
  var _chatUnsub = null;
  var _chatMessages = [];
  var _chatOpen = false;
  var _chatKnownIds = {};        // id → 1, чтобы не флешить старые при первой загрузке
  var _chatFloatingReactions = []; // активные эмодзи-баблы
  var REACTION_EMOJI = ['👍','😂','🔥','😱','😢','💪','❤️','💀'];

  function _myChatRole(lobby) {
    var u = _uid();
    if (!u || !lobby) return 'guest';
    if (lobby.createdBy === u) return 'creator';
    if (lobby.blueCaptain && lobby.blueCaptain.uid === u) return 'cap_blue';
    if (lobby.redCaptain  && lobby.redCaptain.uid  === u) return 'cap_red';
    if ((lobby.invitedSpectators || []).indexOf(u) !== -1) return 'spectator';
    return 'guest';
  }

  function startChatListener(lobbyId) {
    stopChatListener();
    var dbInst = _db();
    if (!dbInst) return;
    _chatMessages = [];
    _chatKnownIds = {};
    _chatUnsub = dbInst.collection('draftLobbies').doc(lobbyId)
      .collection('chat')
      .orderBy('ts','asc')
      .limit(200)
      .onSnapshot(function(snap){
        var initialLoad = !Object.keys(_chatKnownIds).length;
        snap.docChanges().forEach(function(ch){
          var d = ch.doc.data(); d.id = ch.doc.id;
          if (ch.type === 'added') {
            if (!_chatKnownIds[d.id]) {
              _chatKnownIds[d.id] = 1;
              _chatMessages.push(d);
              // Реакции — плывущие эмодзи поверх драфта. Не флешим старые при первом снэпшоте.
              if (!initialLoad && d.kind === 'reaction' && d.uid !== _uid()) {
                spawnFloatingReaction(d.emoji || '👍');
              }
            }
          } else if (ch.type === 'removed') {
            delete _chatKnownIds[d.id];
            _chatMessages = _chatMessages.filter(function(m){ return m.id !== d.id; });
          }
        });
        // Обрезаем до 200 (Firestore лимит уже это делает но на всякий)
        if (_chatMessages.length > 200) _chatMessages = _chatMessages.slice(-200);
        renderChatPanel();
        updateChatUnreadBadge();
      }, function(err){ console.warn('[draft] chat listener', err); });
  }
  function stopChatListener() {
    if (_chatUnsub) { try { _chatUnsub(); } catch(e){} _chatUnsub = null; }
    _chatMessages = [];
    _chatKnownIds = {};
    var p = document.getElementById('dcoopChatPanel'); if (p) p.remove();
    _chatOpen = false;
  }

  function sendChatMessage(text) {
    var l = _currentLobby; var u = _user(); var uid = _uid();
    if (!l || !u || !uid) return;
    var clean = (text || '').trim();
    if (!clean) return;
    if (clean.length > 500) clean = clean.slice(0, 500);
    var role = _myChatRole(l);
    if (role === 'guest') { toast('Только участники лобби могут писать'); return; }
    var dbInst = _db();
    dbInst.collection('draftLobbies').doc(l.id).collection('chat').add({
      uid: uid,
      name: _myNick(),
      photoURL: u.photoURL || '',
      kind: 'text',
      text: clean,
      role: role,
      ts: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function(e){ toast('Ошибка: '+e.message); });
  }

  function sendReaction(emoji) {
    var l = _currentLobby; var u = _user(); var uid = _uid();
    if (!l || !u || !uid) return;
    var role = _myChatRole(l);
    if (role === 'guest') return;
    var safe = String(emoji || '').slice(0, 8);
    if (!safe) return;
    var dbInst = _db();
    dbInst.collection('draftLobbies').doc(l.id).collection('chat').add({
      uid: uid,
      name: _myNick(),
      photoURL: u.photoURL || '',
      kind: 'reaction',
      emoji: safe,
      role: role,
      ts: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function(e){ console.warn('reaction', e); });
    // Локальная анимация — мгновенный фидбек
    spawnFloatingReaction(safe);
  }

  function spawnFloatingReaction(emoji) {
    var el = document.createElement('div');
    el.className = 'dcoop-floating-reaction';
    el.textContent = emoji;
    // Случайный сдвиг по X для разнообразия
    var x = 40 + Math.random() * 30; // 40-70% от ширины экрана
    el.style.left = x + 'vw';
    document.body.appendChild(el);
    setTimeout(function(){ if (el.parentNode) el.parentNode.removeChild(el); }, 2600);
  }

  function _roleColor(role) {
    if (role === 'creator')  return '#f1c40f';
    if (role === 'cap_blue') return '#5dade2';
    if (role === 'cap_red')  return '#e74c3c';
    if (role === 'spectator')return 'rgba(255,255,255,0.55)';
    return 'rgba(255,255,255,0.4)';
  }
  function _roleLabel(role) {
    if (role === 'creator') return 'хост';
    if (role === 'cap_blue') return 'кэп 🔵';
    if (role === 'cap_red')  return 'кэп 🔴';
    if (role === 'spectator')return '👁';
    return '';
  }

  function ensureChatPanel() {
    if (document.getElementById('dcoopChatPanel')) return;
    var panel = document.createElement('div');
    panel.id = 'dcoopChatPanel';
    panel.className = 'dcoop-chat-panel';
    panel.innerHTML = ''
      + '<div class="dcoop-chat-header">'
      +   '<div class="dcoop-chat-title">💬 Чат лобби</div>'
      +   '<button class="dcoop-chat-close" type="button" aria-label="Закрыть">✕</button>'
      + '</div>'
      + '<div class="dcoop-chat-body" id="dcoopChatBody"></div>'
      + '<div class="dcoop-chat-reactions">'
      +   REACTION_EMOJI.map(function(e){ return '<button type="button" data-emoji="'+escapeHtml(e)+'">'+e+'</button>'; }).join('')
      + '</div>'
      + '<form class="dcoop-chat-input-row" id="dcoopChatForm">'
      +   '<input type="text" id="dcoopChatInput" maxlength="500" placeholder="Сообщение…" autocomplete="off">'
      +   '<button type="submit" title="Отправить">➤</button>'
      + '</form>';
    document.body.appendChild(panel);

    panel.querySelector('.dcoop-chat-close').addEventListener('click', closeChatPanel);
    panel.querySelector('#dcoopChatForm').addEventListener('submit', function(e){
      e.preventDefault();
      var inp = document.getElementById('dcoopChatInput');
      if (!inp) return;
      var val = inp.value;
      inp.value = '';
      sendChatMessage(val);
    });
    panel.querySelector('.dcoop-chat-reactions').addEventListener('click', function(e){
      var b = e.target.closest('button[data-emoji]');
      if (!b) return;
      sendReaction(b.getAttribute('data-emoji'));
    });
  }

  function renderChatPanel() {
    var body = document.getElementById('dcoopChatBody');
    if (!body) return;
    if (!_chatMessages.length) {
      body.innerHTML = '<div class="dcoop-chat-empty">Сообщений пока нет</div>';
      return;
    }
    // Показываем только text-сообщения; реакции — летящие эмодзи (уже отрисованы).
    var lines = _chatMessages.filter(function(m){ return m.kind === 'text'; }).map(function(m){
      var col = _roleColor(m.role);
      var lbl = _roleLabel(m.role);
      var nick = escapeHtml(m.name || '?');
      var txt  = escapeHtml(m.text || '');
      return '<div class="dcoop-chat-msg">'
        + '<div class="dcoop-chat-msg-head">'
        +   '<span class="dcoop-chat-msg-nick" style="color:'+col+';">'+nick+'</span>'
        +   (lbl ? '<span class="dcoop-chat-msg-role">'+escapeHtml(lbl)+'</span>' : '')
        + '</div>'
        + '<div class="dcoop-chat-msg-text">'+txt+'</div>'
      + '</div>';
    }).join('');
    body.innerHTML = lines || '<div class="dcoop-chat-empty">Сообщений пока нет</div>';
    // Автоскролл вниз
    body.scrollTop = body.scrollHeight;
  }

  function openChatPanel() {
    ensureChatPanel();
    var panel = document.getElementById('dcoopChatPanel');
    if (panel) panel.classList.add('open');
    _chatOpen = true;
    setTimeout(function(){
      var inp = document.getElementById('dcoopChatInput');
      if (inp) inp.focus();
      renderChatPanel();
    }, 30);
    // Сбрасываем badge непрочитанных
    _chatUnreadCount = 0;
    updateChatUnreadBadge();
  }
  function closeChatPanel() {
    var panel = document.getElementById('dcoopChatPanel');
    if (panel) panel.classList.remove('open');
    _chatOpen = false;
  }
  function toggleChatPanel() {
    if (_chatOpen) closeChatPanel(); else openChatPanel();
  }

  // Badge непрочитанных
  var _chatUnreadCount = 0;
  var _chatLastSeenCount = 0;
  function updateChatUnreadBadge() {
    if (_chatOpen) {
      _chatUnreadCount = 0;
      _chatLastSeenCount = _chatMessages.length;
    } else {
      var textMsgs = _chatMessages.filter(function(m){ return m.kind === 'text'; }).length;
      _chatUnreadCount = Math.max(0, textMsgs - _chatLastSeenCount);
    }
    document.querySelectorAll('.dcoop-hdr-chat').forEach(function(b){
      var badge = b.querySelector('.dcoop-chat-unread');
      if (_chatUnreadCount > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'dcoop-chat-unread';
          b.appendChild(badge);
        }
        badge.textContent = _chatUnreadCount > 9 ? '9+' : _chatUnreadCount;
      } else if (badge) {
        badge.remove();
      }
    });
  }

  window.dcoopToggleChat = toggleChatPanel;

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
  // Модульный флаг (а не l._startingDraft на snapshot-объекте, который сбрасывается
  // на каждый onSnapshot) — гарантирует одноразовый старт даже если snapshot
  // прилетел между лок. set(games/1) и update(status:drafting).
  var _startingDraftId = null;
  function startDraft(l) {
    if (_startingDraftId === l.id) return;
    _startingDraftId = l.id;

    var dbInst = _db();
    // currentGameBlueSide определяет, какая команда играет на синей позиции.
    // Если coin flip ещё не разрешён — fallback 'blue' (старое поведение).
    var game1BlueSide = l.currentGameBlueSide || 'blue';
    var game1 = {
      number: 1,
      blueSide: game1BlueSide,
      phase: 'ban1',
      turnIndex: 0,
      currentSide: 'blue',
      currentAction: 'ban',
      turnStartedAt: null, // запустится когда оба кэпа нажмут "Готов" в драфте
      readyBlue: false,
      readyRed: false,
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
        currentGameBlueSide: game1BlueSide,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }).catch(function(e){
      console.warn('[draft] startDraft', e);
      // Сбрасываем флаг при ошибке, чтобы можно было попробовать снова
      if (_startingDraftId === l.id) _startingDraftId = null;
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
    stopChatListener();
    closeUserSearch();
    _currentLobbyId = null;
    _currentLobby = null;
    document.body.classList.remove('dcoop-fullscreen');
    // Restore sidebar open state on PC — renderDraftUi/renderReplay remove the
    // 'open' class to hide the sidebar during fullscreen draft mode. Without
    // restoring it, sidebarOpen() thinks the sidebar is closed and opens the
    // next modal in mobile (full-screen) mode instead of side-panel mode.
    if (window.matchMedia && window.matchMedia('(min-width: 769px)').matches) {
      var _sPanel = document.getElementById('sidePanel');
      if (_sPanel) _sPanel.classList.add('open');
    }
    var _aPanel = document.getElementById('dcoopAssistPanel'); if (_aPanel) _aPanel.parentNode.removeChild(_aPanel);
  }

  // ─── ACTIVE SERIES HELPER ───
  // Возвращает список активных серий, где юзер — кап ИЛИ принятый зритель
  var ACTIVE_STATUSES = ['drafting','ready_check','finished_game','waiting','paused'];
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
  window.dcoopPickGame1Side = pickGame1Side;
  window.dcoopDeleteLobby = deleteLobby;
  window.dcoopInviteCaptain = function(side){ openUserSearch(side === 'blue' ? 'captainBlue' : 'captainRed'); };
  window.dcoopInviteSpectator = function(){ openUserSearch('spectator'); };
  window.dcoopOpenInvite = function() {
    var l = _currentLobby || {};
    var prefMode = null;
    if (!l.blueCaptain || !l.blueCaptain.uid) prefMode = 'captainBlue';
    else if (!l.redCaptain || !l.redCaptain.uid) prefMode = 'captainRed';
    openUserSearch(prefMode);
  };
  window.dcoopCloseSearch = closeUserSearch;
  window.dcoopRemoveSpectator = removeSpectator;
  window.dcoopLeaveLobby = leaveLobby;
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
