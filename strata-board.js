/* ══════════════════════════════════════════════════════════════════════
   СТРАТА — тактическая доска ВНУТРИ вида «Карта» (Home → Карта → Страта).

   ПОРТ из lab-map/map-board.js (который сам = порт tactics-board/board.js).
   Логику доски НЕ переписывали: слоты, токены, drag, стрелки, карандаш,
   заметки, варды с проверкой расстояния, зеркало сторон, своя картинка карты
   с калибровкой, правый клик = удалить, Ctrl+Z — всё 1-в-1.

   ЧТО ИЗМЕНИЛОСЬ ПРИ ПЕРЕНОСЕ (принудительная канонизация + дедуп):
     · чемпы больше НЕ грузятся отдельным fetch: боевой app.js уже читает тот
       же лист в window._champsRaw и шлёт событие champsLoaded. Свой champKey,
       свой DD_URL, свой localStorage-кэш и локальный список-фолбэк снесены —
       иконки берём у window._champIcon (там же авто-версия ddragon);
     · страничная шапка («← назад», заголовок, BETA) не нужна: раздел инлайн,
       рельс и вкладки на месте. BETA переехала на саму под-вкладку;
     · эмодзи в кнопках → линейные глифы 24×24 (DESIGN.md);
     · цвета стрелок/вардов/команд — из токенов, не хардкод-хексы;
     · ключ карты в localStorage: tb_map_v1 → strata_map_v1 С МИГРАЦИЕЙ
       (кто рисовал на своей картинке в tactics-board — ничего не теряет);
     · document-слушатели (Esc, Ctrl+Z) СПЯТ, пока Страта не видна: раньше
       доска была отдельной страницей и могла хватать клавиши безнаказанно.

   НЕ ТАЩИТЬ ДЁРГАНЬЕ: сетка пикера строится ОДИН раз, поиск/роль только
   ПРЯЧУТ узлы (никакого innerHTML на каждую букву); доска монтируется лениво
   при первом открытии под-вкладки и дальше живёт в DOM (возврат = показ).
   Приёмка счётчиком узлов: window.STRATA_AUDIT() в консоли.
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── линейные глифы (эмодзи каноном запрещены). Стиль 1-в-1 с lab-ui-kit ── */
  var S = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">', ES = '</svg>';
  var G = {
    arrow:  S + '<path d="M5.6 18.4 L18.4 5.6"/><path d="M9.4 5.6 H18.4 V14.6"/>' + ES,
    pen:    S + '<path d="M4.6 19.4 L5.4 15.4 L15.8 5 A2.4 2.4 0 0 1 19.2 8.4 L8.8 18.8 Z"/><path d="M14.2 6.6 L17.6 10"/>' + ES,
    note:   S + '<path d="M5.4 4.6 H18.6 V19.4 H5.4 Z"/><path d="M8.4 9 H15.6"/><path d="M8.4 12.4 H15.6"/><path d="M8.4 15.8 H13"/>' + ES,
    map:    S + '<path d="M3.6 6.4 L9 4.2 L15 6.8 L20.4 4.6 V17.6 L15 19.8 L9 17.2 L3.6 19.4 Z"/><path d="M9 4.2 V17.2"/><path d="M15 6.8 V19.8"/>' + ES,
    upload: S + '<path d="M12 16.4 V4.6"/><path d="M7.6 9 L12 4.6 L16.4 9"/><path d="M4.6 15.4 V19.4 H19.4 V15.4"/>' + ES,
    target: S + '<circle cx="12" cy="12" r="7.6"/><circle cx="12" cy="12" r="2.6"/><path d="M12 2.6 V6"/><path d="M12 18 V21.4"/><path d="M2.6 12 H6"/><path d="M18 12 H21.4"/>' + ES,
    reset:  S + '<path d="M4.6 12 A7.4 7.4 0 1 0 7 6.6"/><path d="M4.2 3.4 V8 H8.8"/>' + ES,
    mirror: S + '<path d="M4.6 8.6 H19.4"/><path d="M16.4 5.6 L19.4 8.6 L16.4 11.6"/><path d="M19.4 15.4 H4.6"/><path d="M7.6 12.4 L4.6 15.4 L7.6 18.4"/>' + ES,
    layout: S + '<path d="M12 3.4 V20.6"/><path d="M3.4 12 H20.6"/><path d="M9.4 6 L12 3.4 L14.6 6"/><path d="M9.4 18 L12 20.6 L14.6 18"/><path d="M6 9.4 L3.4 12 L6 14.6"/><path d="M18 9.4 L20.6 12 L18 14.6"/>' + ES,
    grip:   S + '<circle cx="9" cy="6.4" r="1"/><circle cx="15" cy="6.4" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="17.6" r="1"/><circle cx="15" cy="17.6" r="1"/>' + ES,
    go:     S + '<path d="M5.6 12 H17.4"/><path d="M13 7.6 L17.4 12 L13 16.4"/>' + ES
  };

  var ROLES = ['Топ', 'Лес', 'Мид', 'АДК', 'Саппорт'];
  /* цвет стрелок/карандаша — ТОКЕНАМИ (свой хекс = дрейф от канона) */
  var ARROW_COLOR = { gold: 'var(--gold)', blue: 'var(--team-blue)', red: 'var(--team-red)' };
  var WARD_MIN_DIST_PCT = 6;   /* минимальное расстояние между вардами, % размера карты */

  function slotsHTML(team) {
    var h = '';
    for (var i = 0; i < 5; i++) {
      h += '<button class="tb-slot" data-team="' + team + '" data-idx="' + i + '">' +
             '<span class="tb-slot-plus">+</span>' +
             '<span class="tb-slot-label">' + ROLES[i] + '</span>' +
             '<span class="tb-slot-go" data-slot-go hidden title="Открыть страницу чемпиона">' + G.go + '</span>' +
           '</button>';
    }
    return h;
  }

  function markup() {
    return '' +
    '<div class="tb-layout">' +
      /* ЛЕВО: синяя команда + инструменты */
      '<aside class="tb-side tb-side-left">' +
        '<div class="tb-panel tb-blue-side"><div class="tb-panel-in glass">' +
          '<div class="tb-side-header"><span class="tb-side-dot tb-side-dot-blue"></span><span class="tb-side-title">Синяя</span></div>' +
          '<div class="tb-team-slots" data-team="blue">' + slotsHTML('blue') + '</div>' +
        '</div></div>' +
        '<div class="tb-panel"><div class="tb-panel-in glass">' +
          '<div class="tb-panel-title">Инструменты</div>' +
          '<button class="tb-tool" data-tool="arrow" title="Рисовать стрелки"><span class="tb-tool-icon">' + G.arrow + '</span> Стрелка</button>' +
          '<button class="tb-tool" data-tool="pen" title="Свободное рисование"><span class="tb-tool-icon">' + G.pen + '</span> Карандаш</button>' +
          '<button class="tb-tool" data-tool="note" title="Текстовая заметка"><span class="tb-tool-icon">' + G.note + '</span> Заметка</button>' +
          '<div class="tb-colors" title="Цвет стрелок и карандаша">' +
            '<button class="tb-color tb-color-active" data-color="gold" title="Нейтральный"></button>' +
            '<button class="tb-color" data-color="blue" title="Синяя команда"></button>' +
            '<button class="tb-color" data-color="red" title="Красная команда"></button>' +
          '</div>' +
          '<button class="tb-tool tb-tool-ward" data-tool="ward-ally" title="Свой вард"><span class="tb-ward-chip tb-ward-chip-ally"></span> Свой вард</button>' +
          '<button class="tb-tool tb-tool-ward" data-tool="ward-enemy" title="Вражеский вард"><span class="tb-ward-chip tb-ward-chip-enemy"></span> Враг вард</button>' +
        '</div></div>' +
      '</aside>' +

      /* ЦЕНТР: доска */
      '<section class="tb-board-wrap">' +
        '<div class="tb-board" data-role="board">' +
          '<img class="tb-map-bg" data-role="mapBg" src="tactics-board/assets/map-square.webp" alt="Карта Wild Rift" draggable="false">' +
          '<svg class="tb-arrows-layer" data-role="arrows" viewBox="0 0 1000 1000" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">' +
            '<defs><marker id="strataArrowHead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto" markerUnits="strokeWidth">' +
              '<path d="M 0 0 L 8 4 L 0 8 z" fill="currentColor"/>' +
            '</marker></defs>' +
          '</svg>' +
          '<div class="tb-tokens-layer" data-role="tokens"></div>' +
        '</div>' +
      '</section>' +

      /* ПРАВО: красная команда + карта + действия */
      '<aside class="tb-side tb-side-right">' +
        '<div class="tb-panel tb-red-side"><div class="tb-panel-in glass">' +
          '<div class="tb-side-header"><span class="tb-side-dot tb-side-dot-red"></span><span class="tb-side-title">Красная</span></div>' +
          '<div class="tb-team-slots" data-team="red">' + slotsHTML('red') + '</div>' +
        '</div></div>' +
        '<div class="tb-panel"><div class="tb-panel-in glass">' +
          '<div class="tb-panel-title"><span class="tb-title-ico">' + G.map + '</span> Карта</div>' +
          '<button class="tb-mp-btn" data-role="mapUpload"><span class="tb-tool-icon">' + G.upload + '</span> Загрузить файл</button>' +
          '<input type="file" data-role="mapFile" accept="image/*" hidden>' +
          '<div class="tb-mp-urlrow">' +
            '<input type="text" class="tb-mp-url" data-role="mapUrl" placeholder="ссылка на картинку">' +
            '<button class="tb-mp-btn" data-role="mapUrlApply">OK</button>' +
          '</div>' +
          '<button class="tb-mp-btn tb-mp-toggle" data-role="mapCalib" title="Двигать карту мышкой, колесо/слайдер — масштаб"><span class="tb-tool-icon">' + G.target + '</span> Калибровка</button>' +
          '<label class="tb-mp-scale">Масштаб <input type="range" data-role="mapScale" min="0.4" max="3" step="0.02" value="1"></label>' +
          '<button class="tb-mp-btn tb-mp-reset" data-role="mapReset"><span class="tb-tool-icon">' + G.reset + '</span> Сброс карты</button>' +
          '<div class="tb-map-panel-hint" data-role="mapHint"></div>' +
        '</div></div>' +
        '<div class="tb-panel"><div class="tb-panel-in glass">' +
          '<div class="tb-panel-title">Действия</div>' +
          '<button class="tb-mirror-btn" data-role="mirror" title="Поменять стороны (Барон / Дракон)"><span class="tb-tool-icon">' + G.mirror + '</span> Стороны</button>' +
          '<div class="tb-clear-row">' +
            '<button class="tb-clear-btn" data-clear="arrows">Стрелки</button>' +
            '<button class="tb-clear-btn" data-clear="wards">Варды</button>' +
            '<button class="tb-clear-btn" data-clear="notes">Заметки</button>' +
            '<button class="tb-clear-btn tb-clear-all" data-clear="all">Всё</button>' +
          '</div>' +
          '<button class="tb-edit-toggle" data-role="editToggle" title="Редактор раскладки: двигать и менять размер панелей"><span class="tb-tool-icon">' + G.layout + '</span> Редактор раскладки</button>' +
          '<div class="tb-status" data-role="status">Доска загружается…</div>' +
        '</div></div>' +
      '</aside>' +
    '</div>' +

    /* пикер чемпов — инлайн-оверлей раздела (НЕ страничная модалка) */
    '<div class="tb-picker" data-role="picker" hidden>' +
      '<div class="tb-picker-backdrop" data-picker-close></div>' +
      '<div class="tb-picker-box glass">' +
        '<div class="tb-picker-header">' +
          '<span class="tb-picker-title">Выбери чемпиона</span>' +
          '<input type="text" class="tb-picker-search" data-role="pickerSearch" placeholder="Поиск по имени…" autocomplete="off">' +
          '<button class="tb-picker-close" data-picker-close aria-label="Закрыть">×</button>' +
        '</div>' +
        '<div class="tb-picker-roles">' +
          '<button class="tb-prole tb-prole-active" data-role-filter="all">Все</button>' +
          '<button class="tb-prole" data-role-filter="Top"><img src="image/role_top.webp" alt="">Топ</button>' +
          '<button class="tb-prole" data-role-filter="Jungle"><img src="image/role_jungle.webp" alt="">Лес</button>' +
          '<button class="tb-prole" data-role-filter="Mid"><img src="image/role_mid.webp" alt="">Мид</button>' +
          '<button class="tb-prole" data-role-filter="ADC"><img src="image/role_adc.webp" alt="">АДК</button>' +
          '<button class="tb-prole" data-role-filter="Support"><img src="image/role_support.webp" alt="">Сап</button>' +
        '</div>' +
        '<div class="tb-picker-grid" data-role="pickerGrid"><div class="tb-picker-loading">Загружаю чемпов…</div></div>' +
      '</div>' +
    '</div>';
  }

  /* ══════════════════════════════════════════════════════════════════
     МОНТАЖ. Всё внутри — чтобы узлы и слушатели жили ровно один раз
     и были привязаны к своему host (в боевом на странице не одна доска).
     ══════════════════════════════════════════════════════════════════ */
  window.mountStrata = function (host) {
    if (!host || host.dataset.strataReady) return;
    host.dataset.strataReady = '1';
    host.innerHTML = markup();

    var $ = function (role) { return host.querySelector('[data-role="' + role + '"]'); };
    var boardEl = $('board'), mapBgEl = $('mapBg'), arrowsLayer = $('arrows'), tokensLayer = $('tokens');
    var pickerEl = $('picker'), pickerGrid = $('pickerGrid'), pickerSearch = $('pickerSearch');
    var statusEl = $('status'), mapHint = $('mapHint');
    /* доска видна? (под-вкладка спрятана display:none → offsetParent === null).
       От этого зависят глобальные клавиши: чужой экран мы трогать не имеем права */
    var visible = function () { return host.offsetParent !== null; };

    var champIcon = function (n) { return window._champIcon ? window._champIcon(n) : ''; };
    var onImgError = function (img, name) { if (window._champImgError) window._champImgError(img, name); };

    // ── 1. СОСТОЯНИЕ ──
    var state = {
      teams: { blue: [null, null, null, null, null], red: [null, null, null, null, null] },
      tokens: {},
      tool: null,
      pickerTarget: null,
      tokenCounter: 0,
      mirrored: false,
      champions: [],
      champLoadDone: false,
      arrowColor: ARROW_COLOR.gold,
      pickerRole: 'all',
      mapEdit: false,
      undo: []
    };
    function pushUndo(fn) { state.undo.push(fn); if (state.undo.length > 60) state.undo.shift(); }
    function doUndo() { var fn = state.undo.pop(); if (fn) { try { fn(); } catch (e) {} } }

    // ── 2. ЧЕМПЫ: берём у боевого (window._champsRaw), своего fetch больше нет ──
    function readChamps() {
      var raw = window._champsRaw || [];
      return raw.map(function (c) { return { name: c.name, is: c.is || {} }; })
                .sort(function (a, b) { return a.name.localeCompare(b.name); });
    }
    function applyChamps() {
      state.champions = readChamps();
      state.champLoadDone = state.champions.length > 0;
      statusEl.textContent = state.champions.length
        ? 'Чемпов: ' + state.champions.length
        : 'Список чемпов ещё грузится…';
      if (!pickerEl.hidden) renderPickerGrid(pickerSearch.value);
    }
    document.addEventListener('champsLoaded', applyChamps);

    // ── 3. ПИКЕР: сетка строится ОДИН раз, фильтр только ПРЯЧЕТ узлы ──
    var pickCards = new Map(), pickerBuiltFor = null, pickNoneEl = null;

    function buildPickerGrid() {
      pickerGrid.innerHTML = '';
      pickCards.clear();
      pickNoneEl = null;
      if (!state.champions.length) {
        pickerGrid.innerHTML = '<div class="tb-picker-loading">' +
          (state.champLoadDone ? 'Не удалось загрузить чемпов.' : 'Загружаю чемпов…') + '</div>';
        pickerBuiltFor = null;
        return;
      }
      var frag = document.createDocumentFragment();
      state.champions.forEach(function (c) {
        var btn = document.createElement('button');
        btn.className = 'tb-pick';
        btn.dataset.name = c.name;
        var img = document.createElement('img');
        img.src = champIcon(c.name);
        img.alt = c.name;
        img.dataset.name = c.name;
        img.onerror = function () { onImgError(this, this.dataset.name); };
        var nm = document.createElement('span');
        nm.className = 'tb-pick-name';
        nm.textContent = c.name;
        btn.appendChild(img);
        btn.appendChild(nm);
        frag.appendChild(btn);
        pickCards.set(c.name, btn);
      });
      pickNoneEl = document.createElement('div');
      pickNoneEl.className = 'tb-picker-loading';
      pickNoneEl.textContent = 'Ничего не нашёл';
      pickNoneEl.hidden = true;
      frag.appendChild(pickNoneEl);
      pickerGrid.appendChild(frag);
      pickerBuiltFor = state.champions;
    }

    function renderPickerGrid(filter) {
      if (pickerBuiltFor !== state.champions) buildPickerGrid();
      if (!pickCards.size) return;
      var q = (filter || '').trim().toLowerCase();
      var role = state.pickerRole || 'all';
      var taken = {};
      state.teams.blue.forEach(function (n) { if (n) taken[n] = 1; });
      state.teams.red.forEach(function (n) { if (n) taken[n] = 1; });
      var shown = 0;
      state.champions.forEach(function (c) {
        var el = pickCards.get(c.name);
        if (!el) return;
        var ok = (role === 'all' || (c.is && c.is[role])) && (!q || c.name.toLowerCase().indexOf(q) > -1);
        el.hidden = !ok;
        el.classList.toggle('tb-pick-taken', !!taken[c.name]);
        if (ok) shown++;
      });
      if (pickNoneEl) pickNoneEl.hidden = shown > 0;
    }

    function openPicker(team, idx) {
      state.pickerTarget = { team: team, idx: idx };
      pickerSearch.value = '';
      renderPickerGrid('');
      pickerEl.hidden = false;
      setTimeout(function () { pickerSearch.focus(); }, 50);
    }
    function closePicker() { pickerEl.hidden = true; state.pickerTarget = null; }

    pickerSearch.addEventListener('input', function (e) { renderPickerGrid(e.target.value); });
    pickerEl.addEventListener('click', function (e) {
      if (e.target.closest('[data-picker-close]')) { closePicker(); return; }
      var pick = e.target.closest('.tb-pick');
      if (pick && state.pickerTarget) {
        pickChampion(state.pickerTarget.team, state.pickerTarget.idx, pick.dataset.name);
        closePicker();
      }
    });
    host.querySelectorAll('[data-role-filter]').forEach(function (tab) {
      tab.addEventListener('click', function () {
        host.querySelectorAll('[data-role-filter]').forEach(function (t) { t.classList.remove('tb-prole-active'); });
        tab.classList.add('tb-prole-active');
        state.pickerRole = tab.dataset.roleFilter;
        renderPickerGrid(pickerSearch.value);
      });
    });

    // ── 4. СЛОТЫ КОМАНД ──
    host.querySelectorAll('.tb-slot').forEach(function (slot) {
      slot.addEventListener('click', function (e) {
        /* ЗАКОН СВЯЗЕЙ: стрелка на занятом слоте ведёт на СТРАНИЦУ чемпа,
           сам слот по-прежнему открывает пикер */
        var go = e.target.closest('[data-slot-go]');
        var name = state.teams[slot.dataset.team][+slot.dataset.idx];
        if (go && name) {
          e.stopPropagation();
          window.location.href = window.champPageHref ? window.champPageHref(name) : 'champions/';
          return;
        }
        openPicker(slot.dataset.team, parseInt(slot.dataset.idx, 10));
      });
    });

    function pickChampion(team, idx, name) {
      if (state.teams[team][idx]) removeTokenByTeamIdx(team, idx);
      state.teams[team][idx] = name;
      updateSlotUI(team, idx);
      var blueIsBottom = !state.mirrored;
      var spawnX = (team === 'blue') === blueIsBottom ? 12 : 88;
      var spawnY = (team === 'blue') === blueIsBottom ? 88 : 12;
      var offset = idx * 4 - 8;
      createToken(team, idx, name, spawnX + offset, spawnY - offset);
    }

    function updateSlotUI(team, idx) {
      var slot = host.querySelector('.tb-slot[data-team="' + team + '"][data-idx="' + idx + '"]');
      if (!slot) return;
      var name = state.teams[team][idx];
      var plus = slot.querySelector('.tb-slot-plus');
      var label = slot.querySelector('.tb-slot-label');
      var go = slot.querySelector('[data-slot-go]');
      if (name) {
        slot.classList.add('tb-slot-filled');
        var img = document.createElement('img');
        img.src = champIcon(name);
        img.alt = name;
        img.onerror = function () { onImgError(this, name); };
        plus.innerHTML = '';
        plus.appendChild(img);
        label.textContent = name;
        go.hidden = false;
      } else {
        slot.classList.remove('tb-slot-filled');
        plus.textContent = '+';
        label.textContent = ROLES[idx];
        go.hidden = true;
      }
    }

    // ── 5. ТОКЕНЫ ──
    function createToken(team, idx, name, xPct, yPct) {
      state.tokenCounter++;
      var tokenId = 't' + state.tokenCounter;
      var el = document.createElement('div');
      el.className = 'tb-token' + (team === 'red' ? ' tb-token-red' : '');
      el.dataset.tokenId = tokenId;
      el.style.left = xPct + '%';
      el.style.top = yPct + '%';
      var img = document.createElement('img');
      img.src = champIcon(name);
      img.alt = name;
      img.onerror = function () { onImgError(this, name); };
      el.appendChild(img);
      el.title = name + ' — перетаскивай, правый клик — удалить';
      tokensLayer.appendChild(el);
      state.tokens[tokenId] = { team: team, idx: idx, name: name, x: xPct, y: yPct, el: el };
      pushUndo(function () {
        if (state.tokens[tokenId]) {
          state.teams[team][idx] = null;
          updateSlotUI(team, idx);
          el.remove();
          delete state.tokens[tokenId];
        }
      });
    }
    function removeTokenByTeamIdx(team, idx) {
      for (var id in state.tokens) {
        var t = state.tokens[id];
        if (t.team === team && t.idx === idx) { t.el.remove(); delete state.tokens[id]; return; }
      }
    }

    // ── 6. УНИВЕРСАЛЬНЫЙ DRAG (токен/вард/стрелка/заметка — в любом режиме) ──
    var dragState = null;
    function getBoardCoords(clientX, clientY) {
      var rect = boardEl.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
        y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))
      };
    }
    function startDragToken(el, e) {
      el.setPointerCapture(e.pointerId);
      el.classList.add('tb-token-dragging');
      dragState = { kind: 'token', el: el, pointerId: e.pointerId };
    }
    function startDragWard(el, e) {
      el.setPointerCapture(e.pointerId);
      el.classList.add('tb-token-dragging');
      dragState = { kind: 'ward', el: el, pointerId: e.pointerId };
    }
    function startDragArrow(groupEl, e) {
      var visPath = groupEl.querySelector('.tb-arrow-vis');
      if (!visPath) return;
      var d = visPath.getAttribute('d');
      var m = d && d.match(/M\s+([-\d.]+)\s+([-\d.]+)\s+L\s+([-\d.]+)\s+([-\d.]+)/);
      if (!m) return;
      boardEl.setPointerCapture(e.pointerId);
      dragState = {
        kind: 'arrow', groupEl: groupEl,
        x1: parseFloat(m[1]), y1: parseFloat(m[2]), x2: parseFloat(m[3]), y2: parseFloat(m[4]),
        startClientX: e.clientX, startClientY: e.clientY, pointerId: e.pointerId
      };
    }
    function setArrowD(groupEl, d) {
      groupEl.querySelectorAll('path').forEach(function (p) { p.setAttribute('d', d); });
    }
    function startDragNote(noteEl, e) {
      noteEl.setPointerCapture(e.pointerId);
      dragState = { kind: 'note', el: noteEl, pointerId: e.pointerId };
    }

    boardEl.addEventListener('pointerdown', function (e) {
      if (e.button && e.button !== 0) return;             /* правый клик — отдаём contextmenu */
      if (state.mapEdit) { e.preventDefault(); startMapPan(e); return; }
      if (e.target.closest('.tb-note-text')) return;      /* текст заметки — редактируем, не тащим */
      var grip = e.target.closest('.tb-note-grip');
      if (grip) { e.preventDefault(); startDragNote(grip.parentElement, e); return; }
      var token = e.target.closest('.tb-token');
      if (token) { e.preventDefault(); startDragToken(token, e); return; }
      var ward = e.target.closest('.tb-ward-on-map');
      if (ward) { e.preventDefault(); startDragWard(ward, e); return; }
      var arrow = e.target.closest('.tb-arrow');
      if (arrow) { e.preventDefault(); startDragArrow(arrow, e); return; }
      if (state.tool === 'arrow') startArrowDraw(e);
      else if (state.tool === 'pen') startPenDraw(e);
      else if (state.tool === 'note') createNoteAt(e);
      else if (state.tool === 'ward-ally' || state.tool === 'ward-enemy') placeWard(e);
    });

    boardEl.addEventListener('pointermove', function (e) {
      if (!dragState || e.pointerId !== dragState.pointerId) return;
      var p;
      if (dragState.kind === 'token' || dragState.kind === 'ward' || dragState.kind === 'note') {
        p = getBoardCoords(e.clientX, e.clientY);
        dragState.el.style.left = p.x + '%';
        dragState.el.style.top = p.y + '%';
      } else if (dragState.kind === 'mappan') {
        mapState.offX = dragState.baseOffX + (e.clientX - dragState.startClientX);
        mapState.offY = dragState.baseOffY + (e.clientY - dragState.startClientY);
        applyMapTransform();
      } else if (dragState.kind === 'pen') {
        p = getBoardCoords(e.clientX, e.clientY);
        dragState.pts.push((p.x * 10).toFixed(1) + ' ' + (p.y * 10).toFixed(1));
        dragState.path.setAttribute('d', 'M ' + dragState.pts.join(' L '));
      } else if (dragState.kind === 'arrow') {
        var rect = boardEl.getBoundingClientRect();
        var dx = ((e.clientX - dragState.startClientX) / rect.width) * 100 * 10;
        var dy = ((e.clientY - dragState.startClientY) / rect.height) * 100 * 10;
        setArrowD(dragState.groupEl, 'M ' + (dragState.x1 + dx) + ' ' + (dragState.y1 + dy) +
                                    ' L ' + (dragState.x2 + dx) + ' ' + (dragState.y2 + dy));
      } else if (dragState.kind === 'arrow-draw') {
        p = getBoardCoords(e.clientX, e.clientY);
        setArrowD(dragState.groupEl, 'M ' + (dragState.startX * 10) + ' ' + (dragState.startY * 10) +
                                     ' L ' + (p.x * 10) + ' ' + (p.y * 10));
      }
    });

    function endDrag(e) {
      if (!dragState || e.pointerId !== dragState.pointerId) return;
      if (dragState.kind === 'token') {
        dragState.el.classList.remove('tb-token-dragging');
        var id = dragState.el.dataset.tokenId;
        if (id && state.tokens[id]) {
          state.tokens[id].x = parseFloat(dragState.el.style.left);
          state.tokens[id].y = parseFloat(dragState.el.style.top);
        }
      } else if (dragState.kind === 'ward') {
        dragState.el.classList.remove('tb-token-dragging');
      } else if (dragState.kind === 'mappan') {
        saveMap();
      } else if (dragState.kind === 'pen') {
        if (dragState.pts.length < 3) dragState.path.remove();      /* случайный клик — не штрих */
        else { var pth = dragState.path; pushUndo(function () { pth.remove(); }); }
      } else if (dragState.kind === 'arrow-draw') {
        var visPath = dragState.groupEl.querySelector('.tb-arrow-vis');
        var d = (visPath && visPath.getAttribute('d')) || '';
        var parts = d.match(/[-\d.]+/g);
        var removed = false;
        if (parts && parts.length >= 4) {
          var ax = parseFloat(parts[2]) - parseFloat(parts[0]);
          var ay = parseFloat(parts[3]) - parseFloat(parts[1]);
          if (Math.sqrt(ax * ax + ay * ay) < 30) { dragState.groupEl.remove(); removed = true; }
        } else { dragState.groupEl.remove(); removed = true; }
        if (!removed) { var g = dragState.groupEl; pushUndo(function () { g.remove(); }); }
      }
      dragState = null;
    }
    boardEl.addEventListener('pointerup', endDrag);
    boardEl.addEventListener('pointercancel', endDrag);

    // ── 7. СТРЕЛКИ ──
    function startArrowDraw(e) {
      e.preventDefault();
      var p = getBoardCoords(e.clientX, e.clientY);
      var initialD = 'M ' + (p.x * 10) + ' ' + (p.y * 10);
      var NS = 'http://www.w3.org/2000/svg';
      var g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'tb-arrow');
      var hitPath = document.createElementNS(NS, 'path');
      hitPath.setAttribute('class', 'tb-arrow-hit');
      hitPath.setAttribute('d', initialD);
      var visPath = document.createElementNS(NS, 'path');
      visPath.setAttribute('class', 'tb-arrow-vis');
      /* цвет — через inline style: в презентационный атрибут var(--…) не подставляется */
      visPath.style.stroke = state.arrowColor;
      visPath.style.color = state.arrowColor;      /* маркер-остриё рисуется currentColor */
      visPath.setAttribute('marker-end', 'url(#strataArrowHead)');
      visPath.setAttribute('d', initialD);
      g.appendChild(hitPath);
      g.appendChild(visPath);
      arrowsLayer.appendChild(g);
      boardEl.setPointerCapture(e.pointerId);
      dragState = { kind: 'arrow-draw', groupEl: g, startX: p.x, startY: p.y, pointerId: e.pointerId };
    }

    // ── 8. ВАРДЫ (с проверкой расстояния) ──
    function placeWard(e) {
      var side = state.tool === 'ward-ally' ? 'ally' : 'enemy';
      var p = getBoardCoords(e.clientX, e.clientY);
      var wards = tokensLayer.querySelectorAll('.tb-ward-on-map');
      for (var i = 0; i < wards.length; i++) {
        var w = wards[i];
        var dx = p.x - parseFloat(w.style.left), dy = p.y - parseFloat(w.style.top);
        if (Math.sqrt(dx * dx + dy * dy) < WARD_MIN_DIST_PCT) {
          w.classList.add('tb-ward-too-close');                 /* единичная реакция на действие */
          setTimeout(function () { w.classList.remove('tb-ward-too-close'); }, 350);
          return;
        }
      }
      var ward = document.createElement('div');
      ward.className = 'tb-ward-on-map tb-w-' + side;
      ward.style.left = p.x + '%';
      ward.style.top = p.y + '%';
      ward.innerHTML = '<div class="tb-ward-radius"></div><div class="tb-ward-dot"></div>';
      ward.title = (side === 'ally' ? 'Свой вард' : 'Вражеский вард') + ' — перетаскивай, правый клик — удалить';
      tokensLayer.appendChild(ward);
      pushUndo(function () { ward.remove(); });
    }

    // ── 9. ИНСТРУМЕНТЫ + ОЧИСТКА + ЗЕРКАЛО ──
    function deactivateTool() {
      host.querySelectorAll('.tb-tool').forEach(function (b) { b.classList.remove('tb-tool-active'); });
      state.tool = null;
      boardEl.dataset.tool = '';
    }
    host.querySelectorAll('.tb-tool').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (state.tool === btn.dataset.tool) { deactivateTool(); return; }
        host.querySelectorAll('.tb-tool').forEach(function (b) { b.classList.remove('tb-tool-active'); });
        btn.classList.add('tb-tool-active');
        state.tool = btn.dataset.tool;
        boardEl.dataset.tool = state.tool;
      });
    });
    host.querySelectorAll('[data-clear]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var what = btn.dataset.clear;
        if (what === 'arrows' || what === 'all')
          arrowsLayer.querySelectorAll('.tb-arrow, .tb-pen').forEach(function (a) { a.remove(); });
        if (what === 'wards' || what === 'all')
          tokensLayer.querySelectorAll('.tb-ward-on-map').forEach(function (w) { w.remove(); });
        if (what === 'notes' || what === 'all')
          tokensLayer.querySelectorAll('.tb-note').forEach(function (n) { n.remove(); });
        if (what === 'all') {
          tokensLayer.querySelectorAll('.tb-token').forEach(function (t) { t.remove(); });
          state.tokens = {};
          ['blue', 'red'].forEach(function (team) {
            state.teams[team] = [null, null, null, null, null];
            for (var i = 0; i < 5; i++) updateSlotUI(team, i);
          });
        }
      });
    });
    $('mirror').addEventListener('click', function () {
      state.mirrored = !state.mirrored;
      applyMapTransform();
      for (var id in state.tokens) {
        var t = state.tokens[id];
        t.x = 100 - t.x; t.y = 100 - t.y;
        t.el.style.left = t.x + '%';
        t.el.style.top = t.y + '%';
      }
      tokensLayer.querySelectorAll('.tb-ward-on-map').forEach(function (w) {
        w.style.left = (100 - parseFloat(w.style.left)) + '%';
        w.style.top = (100 - parseFloat(w.style.top)) + '%';
      });
      arrowsLayer.querySelectorAll('.tb-arrow path, .tb-pen').forEach(function (path) {
        var d = path.getAttribute('d');
        if (!d) return;
        path.setAttribute('d', d.replace(/([ML])\s+([-\d.]+)\s+([-\d.]+)/g, function (_, cmd, x, y) {
          return cmd + ' ' + (1000 - parseFloat(x)) + ' ' + (1000 - parseFloat(y));
        }));
      });
      tokensLayer.querySelectorAll('.tb-note').forEach(function (n) {
        n.style.left = (100 - parseFloat(n.style.left)) + '%';
        n.style.top = (100 - parseFloat(n.style.top)) + '%';
      });
    });

    // ── 10. КАРАНДАШ ──
    function startPenDraw(e) {
      e.preventDefault();
      var p = getBoardCoords(e.clientX, e.clientY);
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('class', 'tb-pen');
      path.style.stroke = state.arrowColor;
      var start = (p.x * 10).toFixed(1) + ' ' + (p.y * 10).toFixed(1);
      path.setAttribute('d', 'M ' + start);
      arrowsLayer.appendChild(path);
      boardEl.setPointerCapture(e.pointerId);
      dragState = { kind: 'pen', path: path, pts: [start], pointerId: e.pointerId };
    }

    // ── 11. ЗАМЕТКИ ──
    function createNoteAt(e) {
      e.preventDefault();
      var p = getBoardCoords(e.clientX, e.clientY);
      var note = document.createElement('div');
      note.className = 'tb-note';
      note.style.left = p.x + '%';
      note.style.top = p.y + '%';
      note.innerHTML = '<div class="tb-note-grip" title="Тащи — двигать, правый клик — удалить">' + G.grip + '</div>' +
                       '<div class="tb-note-text" contenteditable="true"></div>';
      tokensLayer.appendChild(note);
      pushUndo(function () { note.remove(); });
      var txt = note.querySelector('.tb-note-text');
      setTimeout(function () { txt.focus(); }, 0);
    }

    // ── 12. КАРТА: своя картинка + калибровка (у каждого в браузере) ──
    var MAP_KEY = 'strata_map_v1', OLD_MAP_KEY = 'tb_map_v1';
    var DEFAULT_MAP = 'tactics-board/assets/map-square.webp';
    var mapState = { src: null, offX: 0, offY: 0, scale: 1 };

    function applyMapTransform() {
      var sign = state.mirrored ? -1 : 1;
      mapBgEl.style.transform =
        'translate(' + mapState.offX + 'px,' + mapState.offY + 'px) scale(' + (mapState.scale * sign) + ')';
    }
    function setMapImage(src) { mapState.src = src; mapBgEl.src = src || DEFAULT_MAP; }
    function saveMap() {
      try { localStorage.setItem(MAP_KEY, JSON.stringify(mapState)); }
      catch (e) { if (mapHint) mapHint.textContent = 'Картинка слишком большая — показана, но не сохранится между заходами.'; }
    }
    function loadMap() {
      var s = null;
      /* МИГРАЦИЯ: доска переехала со страницы tactics-board во вкладку —
         пользователь не должен потерять свою карту и калибровку */
      try { s = JSON.parse(localStorage.getItem(MAP_KEY) || localStorage.getItem(OLD_MAP_KEY) || 'null'); } catch (e) {}
      if (s) {
        mapState.src = s.src || null;
        mapState.offX = s.offX || 0;
        mapState.offY = s.offY || 0;
        mapState.scale = s.scale || 1;
        if (mapState.src) mapBgEl.src = mapState.src;
      }
      applyMapTransform();
      $('mapScale').value = mapState.scale;
    }
    function resetMap() {
      mapState = { src: null, offX: 0, offY: 0, scale: 1 };
      mapBgEl.src = DEFAULT_MAP;
      applyMapTransform();
      $('mapScale').value = 1;
      saveMap();
      if (mapHint) mapHint.textContent = '';
    }
    function startMapPan(e) {
      boardEl.setPointerCapture(e.pointerId);
      dragState = { kind: 'mappan', baseOffX: mapState.offX, baseOffY: mapState.offY,
                    startClientX: e.clientX, startClientY: e.clientY, pointerId: e.pointerId };
    }
    boardEl.addEventListener('wheel', function (e) {
      if (!state.mapEdit) return;
      e.preventDefault();
      mapState.scale = Math.max(0.4, Math.min(3, mapState.scale * (e.deltaY < 0 ? 1.08 : 1 / 1.08)));
      applyMapTransform();
      $('mapScale').value = mapState.scale;
      saveMap();
    }, { passive: false });

    function fileToDataUrl(file, cb) {
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var max = 1200, w = img.width, h = img.height;
          if (w > max || h > max) { var k = max / Math.max(w, h); w = Math.round(w * k); h = Math.round(h * k); }
          var cv = document.createElement('canvas');
          cv.width = w; cv.height = h;
          cv.getContext('2d').drawImage(img, 0, 0, w, h);
          try { cb(cv.toDataURL('image/webp', 0.85)); } catch (e) { cb(reader.result); }
        };
        img.onerror = function () { cb(reader.result); };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }

    $('mapUpload').addEventListener('click', function () { $('mapFile').click(); });
    $('mapFile').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      fileToDataUrl(f, function (url) { setMapImage(url); saveMap(); });
      e.target.value = '';
    });
    $('mapUrlApply').addEventListener('click', function () {
      var u = ($('mapUrl').value || '').trim();
      if (!u) return;
      setMapImage(u); saveMap();
      if (mapHint) mapHint.textContent = '';
    });
    $('mapCalib').addEventListener('click', function () {
      state.mapEdit = !state.mapEdit;
      this.classList.toggle('tb-mp-on', state.mapEdit);
      boardEl.classList.toggle('tb-calib', state.mapEdit);
      if (mapHint) mapHint.textContent = state.mapEdit ? 'Тащи карту мышкой, колесо или слайдер — масштаб.' : '';
      if (state.mapEdit) deactivateTool();
    });
    $('mapScale').addEventListener('input', function () {
      mapState.scale = parseFloat(this.value);
      applyMapTransform(); saveMap();
    });
    $('mapReset').addEventListener('click', resetMap);

    // ── 13. РЕДАКТОР РАСКЛАДКИ (грузится лениво вместе с доской) ──
    var editToggle = $('editToggle');
    editToggle.addEventListener('click', function () {
      if (!window.LayoutEditor) { statusEl.textContent = 'Редактор раскладки не загрузился.'; return; }
      var on = document.body.classList.contains('le-on');
      if (on) window.LayoutEditor.deactivate(); else window.LayoutEditor.activate();
      editToggle.classList.toggle('tb-edit-on', !on);
    });

    // ── 14. ЦВЕТА ──
    host.querySelectorAll('.tb-color').forEach(function (sw) {
      sw.addEventListener('click', function () {
        host.querySelectorAll('.tb-color').forEach(function (s) { s.classList.remove('tb-color-active'); });
        sw.classList.add('tb-color-active');
        state.arrowColor = ARROW_COLOR[sw.dataset.color] || ARROW_COLOR.gold;
      });
    });

    // ── 15. ПРАВЫЙ КЛИК = УДАЛИТЬ (с отменой) ──
    boardEl.addEventListener('contextmenu', function (e) {
      var target = e.target.closest('.tb-token, .tb-ward-on-map, .tb-arrow, .tb-pen, .tb-note');
      if (!target) return;
      e.preventDefault();
      var parent = target.parentNode, next = target.nextSibling;
      if (target.classList.contains('tb-token')) {
        var id = target.dataset.tokenId, t = state.tokens[id];
        if (t) { state.teams[t.team][t.idx] = null; updateSlotUI(t.team, t.idx); delete state.tokens[id]; }
        target.remove();
        pushUndo(function () {
          if (parent) parent.insertBefore(target, next);
          if (t) { state.tokens[id] = t; state.teams[t.team][t.idx] = t.name; updateSlotUI(t.team, t.idx); }
        });
      } else {
        target.remove();
        pushUndo(function () { if (parent) parent.insertBefore(target, next); });
      }
    });

    // ── 16. КЛАВИШИ. Работают ТОЛЬКО когда Страта на экране ──
    document.addEventListener('keydown', function (e) {
      if (!visible()) return;
      if (e.key === 'Escape') {
        if (!pickerEl.hidden) { e.stopPropagation(); closePicker(); }
        else if (state.tool) deactivateTool();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && /^[zZяЯ]$/.test(e.key)) {
        var ae = document.activeElement;
        if (ae && ae.classList && ae.classList.contains('tb-note-text')) return;
        e.preventDefault();
        doUndo();
      }
    });

    // ── ПРИЁМКА СЧЁТЧИКОМ УЗЛОВ: буква в поиске пикера не должна пересобирать сетку ──
    window.STRATA_AUDIT = function () {
      if (pickerEl.hidden) openPicker('blue', 0);
      var before = Array.prototype.slice.call(pickerGrid.querySelectorAll('*'));
      before.forEach(function (n) { n.__keep = true; });
      pickerSearch.value = 'a';
      pickerSearch.dispatchEvent(new Event('input'));
      var after = Array.prototype.slice.call(pickerGrid.querySelectorAll('*'));
      var survived = after.filter(function (n) { return n.__keep; }).length;
      var msg = survived + '/' + before.length + ' узлов пережили букву в поиске';
      console.log('[Страта] ПРИЁМКА:', msg, '| было', before.length, '→ стало', after.length);
      return msg;
    };

    // ── СТАРТ ──
    boardEl.dataset.tool = '';
    loadMap();
    applyChamps();
    console.log('[Страта] доска смонтирована, чемпов:', state.champions.length);
  };
})();
