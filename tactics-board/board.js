/* ═══════════════════════════════════════════════════════════
   ТАКТИЧЕСКАЯ ДОСКА — board.js (Phase 1)
   ───────────────────────────────────────────────────────────
   Структура:
     1. Конфиг (G_URL, маппинг имён, спец-картинки)
     2. Загрузка чемпов из Google Sheets (с кэшем)
     3. Состояние
     4. Picker — модалка выбора чемпиона
     5. Слоты команд
     6. Токены чемпов
     7. Универсальный drag (токены, варды, стрелки) во всех режимах
     8. Рисование стрелок
     9. Постановка вардов с проверкой расстояния
    10. Инструменты + Очистка + Зеркало
   ═══════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  // ───────────────────────────────────────────────────────────
  // 1. КОНФИГ
  // ───────────────────────────────────────────────────────────
  const G_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQnqVwUluQiuho1Wj6A3tZRvDJsLlyAZYmg0soWy4EJ_Un00P8e3Y2EAo3Iv6KvMm5HPwce_0AnzPfb/pub?gid=0&single=true&output=tsv';

  // Маппинг имени чемпа в ключ Data Dragon — 1-в-1 как в app.js
  function champKey(n) {
    const m = {
      'Aurelion Sol':'AurelionSol','Dr. Mundo':'DrMundo','Jarvan IV':'JarvanIV',
      'Lee Sin':'LeeSin','Master Yi':'MasterYi','Miss Fortune':'MissFortune',
      'Twisted Fate':'TwistedFate','Xin Zhao':'XinZhao','Nunu & Willump':'Nunu',
      "Cho'Gath":'Chogath',"Vel'Koz":'Velkoz',"Kai'Sa":'Kaisa',"Kha'Zix":'Khazix',"Kog'Maw":'KogMaw',
      "K'Sante":'KSante',"Rek'Sai":'RekSai','Tahm Kench':'TahmKench','Wukong':'MonkeyKing',
      'M.Fortune':'MissFortune','Tw. Fate':'TwistedFate','Au. Sol':'AurelionSol',
      'Jarvan':'JarvanIV','XinZhao':'XinZhao','KhaZix':'Khazix','KogMaw':'KogMaw','Ksante':'KSante',
      'KaiSa':'Kaisa','Morde':'Mordekaiser','Seraph':'Seraphine',
      'Fiddle':'Fiddlesticks','Fiddles':'Fiddlesticks','FiddleSticks':'Fiddlesticks','Fiddlesticks':'Fiddlesticks',
      'Trynda':'Tryndamere','Trynd':'Tryndamere','Trinda':'Tryndamere','Heimer':'Heimerdinger',
      'Mundo':'DrMundo','Nunu':'Nunu',
    };
    return m[n] || n.replace(/[\s\'\.\#&]/g, '');
  }
  const DD_URL = 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/';
  const SPECIAL = {
    'Norra': '../image/norra.png',
    'Mel':   'https://ddragon.leagueoflegends.com/cdn/img/champion/tiles/Mel_0.jpg'
  };
  const FALLBACK = {
    'Norra': ['https://www.wildriftfire.com/images/champions/norra.png','https://cdn.communitydragon.org/latest/champion/norra/square'],
    'Mel':   ['https://www.wildriftfire.com/images/champions/mel.png']
  };
  function champIcon(name) {
    return SPECIAL[name] || (DD_URL + champKey(name) + '.png');
  }
  function onImgError(img, name) {
    if (!img._fb) img._fb = 0;
    const fb = FALLBACK[name];
    if (fb && img._fb < fb.length) {
      img.src = fb[img._fb++];
    } else {
      img.style.cssText = 'width:100%;height:100%;background:#1a2a3a;display:flex;align-items:center;justify-content:center;color:#0BC4E3;font-weight:bold;font-size:18px;';
    }
  }

  // Минимальное расстояние между вардами (в % размера карты)
  const WARD_MIN_DIST_PCT = 6;

  // Локальный fallback на случай если Google Sheets недоступен (file://, нет интернета и т.д.)
  // Это список всех Wild Rift чемпов на момент 2026-05. Будет заменён данными из шита при загрузке.
  const FALLBACK_CHAMPS = [
    'Aatrox','Ahri','Akali','Akshan','Alistar','Amumu','Annie','Ashe','Aurelion Sol',
    'Blitzcrank','Brand','Braum','Caitlyn','Camille',"Cho'Gath",'Corki','Darius','Diana',
    'Dr. Mundo','Draven','Ekko','Evelynn','Ezreal','Fiddlesticks','Fiora','Fizz','Galio','Garen',
    'Gnar','Gragas','Graves','Gwen','Hecarim','Heimerdinger','Irelia','Janna','Jarvan IV','Jax',
    'Jayce','Jhin','Jinx',"Kai'Sa",'Karma','Kassadin','Katarina','Kayle','Kayn','Kennen',
    "Kha'Zix",'Kindred',"Kog'Maw",'LeBlanc','Lee Sin','Leona','Lillia','Lucian','Lulu','Lux',
    'Malphite','Master Yi','Mel','Miss Fortune','Mordekaiser','Morgana','Nami','Nasus','Nautilus',
    'Norra','Nunu & Willump','Olaf','Orianna','Pantheon','Poppy','Pyke','Rakan','Rammus','Renekton',
    'Rengar','Riven','Samira','Senna','Seraphine','Sett','Shen','Shyvana','Singed','Sion','Sivir',
    'Skarner','Sona','Soraka','Swain','Syndra','Talon','Teemo','Thresh','Tristana','Tryndamere',
    'Twisted Fate','Twitch','Varus','Vayne','Veigar','Vex','Vi','Viego','Viktor','Vladimir',
    'Volibear','Warwick','Wukong','Xayah','Xin Zhao','Yasuo','Yone','Yuumi','Zed','Zeri','Ziggs','Zoe','Zyra'
  ].map(name => ({ name, is: {} }));

  // ───────────────────────────────────────────────────────────
  // 2. ЗАГРУЗКА ЧЕМПОВ ИЗ GOOGLE SHEETS
  //    Кэш в localStorage на 1 час (чтобы не дергать шит постоянно)
  // ───────────────────────────────────────────────────────────
  const CACHE_KEY = 'tb_champs_v1';
  const CACHE_TTL_MS = 60 * 60 * 1000; // 1 час

  async function loadChampions() {
    // 1) Если в окне уже есть _champsRaw от основного app.js — используем напрямую
    if (window._champsRaw && Array.isArray(window._champsRaw) && window._champsRaw.length) {
      return window._champsRaw.map(c => ({ name: c.name, is: c.is || {} }));
    }
    // 2) Кэш
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (cached && cached.ts && (Date.now() - cached.ts) < CACHE_TTL_MS && cached.list && cached.list.length) {
        // фон: обновим в фоне, но сразу вернём что есть
        fetchFromSheets().then(list => list && cacheChamps(list));
        return cached.list;
      }
    } catch(e) {}
    // 3) Сетевой запрос
    const list = await fetchFromSheets();
    if (list) cacheChamps(list);
    return list || [];
  }

  function cacheChamps(list) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), list })); } catch(e) {}
  }

  async function fetchFromSheets() {
    try {
      const r = await fetch(G_URL);
      const tsv = await r.text();
      if (tsv.trim().startsWith('<')) throw new Error('Sheet returned HTML — not published');
      const lines = tsv.trim().split('\n');
      const heads = lines[0].split('\t').map(h => h.trim());
      const ci = name => heads.indexOf(name);
      const cName = ci('Champion');
      const list = lines.slice(1)
        .map(l => {
          const c = l.split('\t');
          const name = (c[cName] || '').trim();
          if (!name) return null;
          return {
            name,
            is: {
              Top:     +c[ci('Is_Top')]     === 1,
              Jungle:  +c[ci('Is_Jungle')]  === 1,
              Mid:     +c[ci('Is_Mid')]     === 1,
              ADC:     +c[ci('Is_Adc')]     === 1,
              Support: +c[ci('Is_Support')] === 1,
            }
          };
        })
        .filter(Boolean);
      return list;
    } catch (e) {
      console.warn('[tactics-board] Не удалось загрузить чемпов из Google Sheets:', e);
      return null;
    }
  }

  // ───────────────────────────────────────────────────────────
  // 3. СОСТОЯНИЕ
  // ───────────────────────────────────────────────────────────
  const state = {
    teams: { blue: [null, null, null, null, null], red: [null, null, null, null, null] },
    tokens: {},        // tokenId → { team, idx, name, x, y, el }
    tool: null,        // null | 'arrow' | 'pen' | 'note' | 'ward-ally' | 'ward-enemy'
    pickerTarget: null,
    tokenCounter: 0,
    mirrored: false,
    champions: [],     // [{ name, is }]
    champLoadDone: false,
    arrowColor: '#FFD700',   // цвет стрелок/карандаша
    pickerRole: 'all',       // фильтр ролей в пикере
    mapEdit: false,          // режим калибровки карты
    undo: []                 // стек функций отмены (Ctrl+Z)
  };

  const boardEl     = document.getElementById('tbBoard');
  const mapBgEl     = document.getElementById('tbMapBg');
  const arrowsLayer = document.getElementById('tbArrowsLayer');
  const tokensLayer = document.getElementById('tbTokensLayer');
  const pickerEl    = document.getElementById('tbPicker');
  const pickerGrid  = document.getElementById('tbPickerGrid');
  const pickerSearch= document.getElementById('tbPickerSearch');
  const statusEl    = document.getElementById('tbStatus');

  // ── Отмена (Ctrl+Z) ──
  function pushUndo(fn) { state.undo.push(fn); if (state.undo.length > 60) state.undo.shift(); }
  function doUndo() { const fn = state.undo.pop(); if (fn) try { fn(); } catch (e) {} }

  // ───────────────────────────────────────────────────────────
  // 4. PICKER — модалка выбора чемпа
  // ───────────────────────────────────────────────────────────
  function renderPickerGrid(filter) {
    if (!state.champions.length) {
      pickerGrid.innerHTML = '<div class="tb-picker-loading">' +
        (state.champLoadDone
          ? 'Не удалось загрузить чемпов. Проверь интернет и обнови страницу.'
          : 'Загружаю чемпов…') +
        '</div>';
      return;
    }
    const q = (filter || '').trim().toLowerCase();
    const role = state.pickerRole || 'all';
    const taken = new Set();
    state.teams.blue.forEach(n => n && taken.add(n));
    state.teams.red.forEach(n => n && taken.add(n));

    const html = state.champions
      .filter(c => role === 'all' || (c.is && c.is[role]))
      .filter(c => !q || c.name.toLowerCase().includes(q))
      .map(c => {
        const isTaken = taken.has(c.name) ? ' tb-pick-taken' : '';
        return '<button class="tb-pick' + isTaken + '" data-name="' + c.name + '">' +
          '<img src="' + champIcon(c.name) + '" alt="' + c.name + '" data-name="' + c.name + '">' +
          '<span class="tb-pick-name">' + c.name + '</span>' +
        '</button>';
      })
      .join('');
    pickerGrid.innerHTML = html || '<div class="tb-picker-loading">Ничего не нашёл</div>';
    // Подцепить фолбеки картинок
    pickerGrid.querySelectorAll('img[data-name]').forEach(img => {
      img.onerror = function() { onImgError(this, this.dataset.name); };
    });
  }

  function openPicker(team, idx) {
    state.pickerTarget = { team, idx };
    pickerSearch.value = '';
    renderPickerGrid('');
    pickerEl.hidden = false;
    setTimeout(() => pickerSearch.focus(), 50);
  }
  function closePicker() {
    pickerEl.hidden = true;
    state.pickerTarget = null;
  }

  pickerSearch.addEventListener('input', e => renderPickerGrid(e.target.value));
  pickerEl.addEventListener('click', e => {
    if (e.target.matches('[data-picker-close]')) { closePicker(); return; }
    const pick = e.target.closest('.tb-pick');
    if (pick && state.pickerTarget) {
      const name = pick.dataset.name;
      const { team, idx } = state.pickerTarget;
      pickChampion(team, idx, name);
      closePicker();
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!pickerEl.hidden) closePicker();
      else if (state.tool) deactivateTool();
    }
  });

  // ───────────────────────────────────────────────────────────
  // 5. СЛОТЫ КОМАНД
  // ───────────────────────────────────────────────────────────
  document.querySelectorAll('.tb-slot').forEach(slot => {
    slot.addEventListener('click', () => {
      const team = slot.dataset.team;
      const idx = parseInt(slot.dataset.idx, 10);
      openPicker(team, idx);
    });
  });

  function pickChampion(team, idx, name) {
    const prev = state.teams[team][idx];
    if (prev) removeTokenByTeamIdx(team, idx);

    state.teams[team][idx] = name;
    updateSlotUI(team, idx);

    // Спавн: с учётом текущей ориентации (если карта зеркалирована, спавны меняются местами)
    const blueIsBottom = !state.mirrored;
    const spawnX = (team === 'blue') === blueIsBottom ? 12 : 88;
    const spawnY = (team === 'blue') === blueIsBottom ? 88 : 12;
    const offset = idx * 4 - 8;
    createToken(team, idx, name, spawnX + offset, spawnY - offset);
  }

  function updateSlotUI(team, idx) {
    const slot = document.querySelector('.tb-slot[data-team="' + team + '"][data-idx="' + idx + '"]');
    if (!slot) return;
    const name = state.teams[team][idx];
    const plus = slot.querySelector('.tb-slot-plus');
    const label = slot.querySelector('.tb-slot-label');
    if (name) {
      slot.classList.add('tb-slot-filled');
      const img = document.createElement('img');
      img.src = champIcon(name);
      img.alt = name;
      img.onerror = function() { onImgError(this, name); };
      plus.innerHTML = '';
      plus.appendChild(img);
      label.textContent = name;
    } else {
      slot.classList.remove('tb-slot-filled');
      plus.textContent = '+';
      const roles = ['Топ','Лес','Мид','АДК','Саппорт'];
      label.textContent = roles[idx];
    }
  }

  // ───────────────────────────────────────────────────────────
  // 6. ТОКЕНЫ
  // ───────────────────────────────────────────────────────────
  function createToken(team, idx, name, xPct, yPct) {
    state.tokenCounter++;
    const tokenId = 't' + state.tokenCounter;
    const el = document.createElement('div');
    el.className = 'tb-token' + (team === 'red' ? ' tb-token-red' : '');
    el.dataset.tokenId = tokenId;
    el.style.left = xPct + '%';
    el.style.top = yPct + '%';
    const img = document.createElement('img');
    img.src = champIcon(name);
    img.alt = name;
    img.onerror = function() { onImgError(this, name); };
    el.appendChild(img);
    el.title = name + ' — перетаскивай, двойной/правый клик — удалить';
    tokensLayer.appendChild(el);
    state.tokens[tokenId] = { team, idx, name, x: xPct, y: yPct, el };
    pushUndo(() => {
      if (state.tokens[tokenId]) {
        state.teams[team][idx] = null;
        updateSlotUI(team, idx);
        el.remove();
        delete state.tokens[tokenId];
      }
    });
  }

  function removeTokenByTeamIdx(team, idx) {
    for (const id in state.tokens) {
      const t = state.tokens[id];
      if (t.team === team && t.idx === idx) {
        t.el.remove();
        delete state.tokens[id];
        return;
      }
    }
  }

  // Двойной клик — удалить чемпа/вард/стрелку
  tokensLayer.addEventListener('dblclick', e => {
    const tok = e.target.closest('.tb-token');
    if (tok) {
      const id = tok.dataset.tokenId;
      const t = state.tokens[id];
      if (t) {
        state.teams[t.team][t.idx] = null;
        updateSlotUI(t.team, t.idx);
        tok.remove();
        delete state.tokens[id];
      }
      return;
    }
    const ward = e.target.closest('.tb-ward-on-map');
    if (ward) ward.remove();
  });
  arrowsLayer.addEventListener('dblclick', e => {
    const arrow = e.target.closest('.tb-arrow');
    if (arrow) arrow.remove();
  });

  // ───────────────────────────────────────────────────────────
  // 7. УНИВЕРСАЛЬНЫЙ DRAG
  //    Любой объект (токен/вард/стрелка) тащится при pointerdown
  //    в ЛЮБОМ режиме (включая режим стрелки/варда).
  //    Тулы срабатывают только на пустой области карты.
  // ───────────────────────────────────────────────────────────
  let dragState = null;

  function getBoardCoords(clientX, clientY) {
    const rect = boardEl.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))
    };
  }

  function startDragToken(el, e) {
    el.setPointerCapture(e.pointerId);
    el.classList.add('tb-token-dragging');
    dragState = { kind: 'token', el, pointerId: e.pointerId };
  }
  function startDragWard(el, e) {
    el.setPointerCapture(e.pointerId);
    el.classList.add('tb-token-dragging');
    dragState = { kind: 'ward', el, pointerId: e.pointerId };
  }
  function startDragArrow(groupEl, e) {
    // Перемещаем стрелку целиком — храним исходные точки и стартовый клиент
    const visPath = groupEl.querySelector('.tb-arrow-vis');
    if (!visPath) return;
    const d = visPath.getAttribute('d');
    const m = d && d.match(/M\s+([-\d.]+)\s+([-\d.]+)\s+L\s+([-\d.]+)\s+([-\d.]+)/);
    if (!m) return;
    boardEl.setPointerCapture(e.pointerId);
    dragState = {
      kind: 'arrow',
      groupEl,
      x1: parseFloat(m[1]), y1: parseFloat(m[2]),
      x2: parseFloat(m[3]), y2: parseFloat(m[4]),
      startClientX: e.clientX, startClientY: e.clientY,
      pointerId: e.pointerId
    };
  }
  // Установить одинаковый d на все path внутри группы (видимая + hit-зона)
  function setArrowD(groupEl, d) {
    groupEl.querySelectorAll('path').forEach(p => p.setAttribute('d', d));
  }

  // Главный pointerdown обработчик
  boardEl.addEventListener('pointerdown', e => {
    if (e.button && e.button !== 0) return; // правый клик — отдаём contextmenu

    // 0) Режим калибровки карты — двигаем картинку, всё остальное игнорим
    if (state.mapEdit) { e.preventDefault(); startMapPan(e); return; }

    // Клик по тексту заметки — даём редактировать, не драгаем
    if (e.target.closest('.tb-note-text')) return;
    // Клик по ручке заметки — тащим заметку
    const grip = e.target.closest('.tb-note-grip');
    if (grip) { e.preventDefault(); startDragNote(grip.parentElement, e); return; }

    // 1) Если ткнули по токену/варду/стрелке/карандашу — всегда драгаем (в любом режиме)
    const token = e.target.closest('.tb-token');
    if (token) { e.preventDefault(); startDragToken(token, e); return; }
    const ward = e.target.closest('.tb-ward-on-map');
    if (ward)  { e.preventDefault(); startDragWard(ward, e); return; }
    const arrow = e.target.closest('.tb-arrow');
    if (arrow) { e.preventDefault(); startDragArrow(arrow, e); return; }

    // 2) Пустая область — действие активного инструмента
    if (state.tool === 'arrow') {
      startArrowDraw(e);
    } else if (state.tool === 'pen') {
      startPenDraw(e);
    } else if (state.tool === 'note') {
      createNoteAt(e);
    } else if (state.tool === 'ward-ally' || state.tool === 'ward-enemy') {
      placeWard(e);
    }
    // если tool === null — ничего не делаем
  });

  boardEl.addEventListener('pointermove', e => {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    if (dragState.kind === 'token' || dragState.kind === 'ward' || dragState.kind === 'note') {
      const { x, y } = getBoardCoords(e.clientX, e.clientY);
      dragState.el.style.left = x + '%';
      dragState.el.style.top = y + '%';
    } else if (dragState.kind === 'mappan') {
      mapState.offX = dragState.baseOffX + (e.clientX - dragState.startClientX);
      mapState.offY = dragState.baseOffY + (e.clientY - dragState.startClientY);
      applyMapTransform();
    } else if (dragState.kind === 'pen') {
      const { x, y } = getBoardCoords(e.clientX, e.clientY);
      dragState.pts.push((x * 10).toFixed(1) + ' ' + (y * 10).toFixed(1));
      dragState.path.setAttribute('d', 'M ' + dragState.pts.join(' L '));
    } else if (dragState.kind === 'arrow') {
      const rect = boardEl.getBoundingClientRect();
      const dxPct = ((e.clientX - dragState.startClientX) / rect.width) * 100;
      const dyPct = ((e.clientY - dragState.startClientY) / rect.height) * 100;
      // viewBox 0..1000 → coord% × 10
      const dx = dxPct * 10, dy = dyPct * 10;
      const x1 = dragState.x1 + dx, y1 = dragState.y1 + dy;
      const x2 = dragState.x2 + dx, y2 = dragState.y2 + dy;
      setArrowD(dragState.groupEl, 'M ' + x1 + ' ' + y1 + ' L ' + x2 + ' ' + y2);
    } else if (dragState.kind === 'arrow-draw') {
      const { x, y } = getBoardCoords(e.clientX, e.clientY);
      setArrowD(dragState.groupEl, 'M ' + (dragState.startX * 10) + ' ' + (dragState.startY * 10) +
                                     ' L ' + (x * 10) + ' ' + (y * 10));
    }
  });

  function endDrag(e) {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    if (dragState.kind === 'token') {
      dragState.el.classList.remove('tb-token-dragging');
      const id = dragState.el.dataset.tokenId;
      if (id && state.tokens[id]) {
        state.tokens[id].x = parseFloat(dragState.el.style.left);
        state.tokens[id].y = parseFloat(dragState.el.style.top);
      }
    } else if (dragState.kind === 'ward') {
      dragState.el.classList.remove('tb-token-dragging');
    } else if (dragState.kind === 'note') {
      // позиция уже в style — ничего сохранять не надо
    } else if (dragState.kind === 'mappan') {
      saveMap();
    } else if (dragState.kind === 'pen') {
      // слишком короткий штрих (случайный клик) — удаляем, иначе пишем отмену
      if (dragState.pts.length < 3) dragState.path.remove();
      else { const p = dragState.path; pushUndo(() => p.remove()); }
    } else if (dragState.kind === 'arrow-draw') {
      const visPath = dragState.groupEl.querySelector('.tb-arrow-vis');
      const d = (visPath && visPath.getAttribute('d')) || '';
      const parts = d.match(/[-\d.]+/g);
      let removed = false;
      if (parts && parts.length >= 4) {
        const dx = parseFloat(parts[2]) - parseFloat(parts[0]);
        const dy = parseFloat(parts[3]) - parseFloat(parts[1]);
        if (Math.sqrt(dx*dx + dy*dy) < 30) { dragState.groupEl.remove(); removed = true; }
      } else { dragState.groupEl.remove(); removed = true; }
      if (!removed) { const g = dragState.groupEl; pushUndo(() => g.remove()); }
    }
    dragState = null;
  }
  boardEl.addEventListener('pointerup', endDrag);
  boardEl.addEventListener('pointercancel', endDrag);

  // ───────────────────────────────────────────────────────────
  // 8. РИСОВАНИЕ СТРЕЛОК
  // ───────────────────────────────────────────────────────────
  function startArrowDraw(e) {
    e.preventDefault();
    const { x, y } = getBoardCoords(e.clientX, e.clientY);
    const initialD = 'M ' + (x * 10) + ' ' + (y * 10);

    // Создаём <g> с двумя path: hit (широкая невидимая для клика) и vis (видимая золотая)
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'tb-arrow');

    const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hitPath.setAttribute('class', 'tb-arrow-hit');
    hitPath.setAttribute('d', initialD);

    const visPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    visPath.setAttribute('class', 'tb-arrow-vis');
    visPath.setAttribute('stroke', state.arrowColor);
    visPath.style.color = state.arrowColor;
    visPath.setAttribute('marker-end', 'url(#tbArrowHead)');
    visPath.setAttribute('d', initialD);

    g.appendChild(hitPath);
    g.appendChild(visPath);
    arrowsLayer.appendChild(g);

    boardEl.setPointerCapture(e.pointerId);
    dragState = { kind: 'arrow-draw', groupEl: g, startX: x, startY: y, pointerId: e.pointerId };
  }

  // ───────────────────────────────────────────────────────────
  // 9. ПОСТАНОВКА ВАРДОВ С ПРОВЕРКОЙ РАССТОЯНИЯ
  // ───────────────────────────────────────────────────────────
  function placeWard(e) {
    const side = state.tool === 'ward-ally' ? 'ally' : 'enemy';
    const { x, y } = getBoardCoords(e.clientX, e.clientY);

    // Проверка минимального расстояния до других вардов
    const wards = tokensLayer.querySelectorAll('.tb-ward-on-map');
    for (const w of wards) {
      const wx = parseFloat(w.style.left);
      const wy = parseFloat(w.style.top);
      const dx = x - wx, dy = y - wy;
      if (Math.sqrt(dx*dx + dy*dy) < WARD_MIN_DIST_PCT) {
        // Слишком близко к существующему — мигаем тем вардом, не ставим новый
        w.classList.add('tb-ward-too-close');
        setTimeout(() => w.classList.remove('tb-ward-too-close'), 350);
        return;
      }
    }

    const ward = document.createElement('div');
    ward.className = 'tb-ward-on-map tb-w-' + side;
    ward.style.left = x + '%';
    ward.style.top = y + '%';
    ward.innerHTML = '<div class="tb-ward-radius"></div><div class="tb-ward-dot"></div>';
    ward.title = (side === 'ally' ? 'Свой вард' : 'Вражеский вард') + ' — перетаскивай, двойной/правый клик — удалить';
    tokensLayer.appendChild(ward);
    pushUndo(() => ward.remove());
  }

  // ───────────────────────────────────────────────────────────
  // 10. ИНСТРУМЕНТЫ + ОЧИСТКА + ЗЕРКАЛО
  // ───────────────────────────────────────────────────────────
  function deactivateTool() {
    document.querySelectorAll('.tb-tool').forEach(b => b.classList.remove('tb-tool-active'));
    state.tool = null;
    boardEl.dataset.tool = '';
  }

  document.querySelectorAll('.tb-tool').forEach(btn => {
    btn.addEventListener('click', () => {
      // Если кликнули по уже активному инструменту — отключаем
      if (state.tool === btn.dataset.tool) { deactivateTool(); return; }
      document.querySelectorAll('.tb-tool').forEach(b => b.classList.remove('tb-tool-active'));
      btn.classList.add('tb-tool-active');
      state.tool = btn.dataset.tool;
      boardEl.dataset.tool = state.tool;
    });
  });

  document.querySelectorAll('[data-clear]').forEach(btn => {
    btn.addEventListener('click', () => {
      const what = btn.dataset.clear;
      if (what === 'arrows' || what === 'all') {
        arrowsLayer.querySelectorAll('.tb-arrow, .tb-pen').forEach(a => a.remove());
      }
      if (what === 'wards' || what === 'all') {
        tokensLayer.querySelectorAll('.tb-ward-on-map').forEach(w => w.remove());
      }
      if (what === 'notes' || what === 'all') {
        tokensLayer.querySelectorAll('.tb-note').forEach(n => n.remove());
      }
      if (what === 'all') {
        tokensLayer.querySelectorAll('.tb-token').forEach(t => t.remove());
        state.tokens = {};
        ['blue','red'].forEach(team => {
          state.teams[team] = [null, null, null, null, null];
          for (let i = 0; i < 5; i++) updateSlotUI(team, i);
        });
      }
    });
  });

  // ЗЕРКАЛО — поменять стороны Baron/Dragon
  document.getElementById('tbMirrorBtn').addEventListener('click', () => {
    state.mirrored = !state.mirrored;
    applyMapTransform();

    // Зеркалируем все токены (x → 100-x, y → 100-y)
    for (const id in state.tokens) {
      const t = state.tokens[id];
      t.x = 100 - t.x;
      t.y = 100 - t.y;
      t.el.style.left = t.x + '%';
      t.el.style.top = t.y + '%';
    }
    // Зеркалируем варды
    tokensLayer.querySelectorAll('.tb-ward-on-map').forEach(w => {
      const x = parseFloat(w.style.left);
      const y = parseFloat(w.style.top);
      w.style.left = (100 - x) + '%';
      w.style.top = (100 - y) + '%';
    });
    // Зеркалируем стрелки И карандаш (viewBox 0..1000 → 1000-coord)
    arrowsLayer.querySelectorAll('.tb-arrow path, .tb-pen').forEach(path => {
      const d = path.getAttribute('d');
      if (!d) return;
      const newD = d.replace(/([ML])\s+([-\d.]+)\s+([-\d.]+)/g, (_, cmd, x, y) => {
        return cmd + ' ' + (1000 - parseFloat(x)) + ' ' + (1000 - parseFloat(y));
      });
      path.setAttribute('d', newD);
    });
    // Зеркалируем заметки
    tokensLayer.querySelectorAll('.tb-note').forEach(n => {
      n.style.left = (100 - parseFloat(n.style.left)) + '%';
      n.style.top = (100 - parseFloat(n.style.top)) + '%';
    });
  });

  // ───────────────────────────────────────────────────────────
  // 11. КАРАНДАШ (свободное рисование)
  // ───────────────────────────────────────────────────────────
  function startPenDraw(e) {
    e.preventDefault();
    const { x, y } = getBoardCoords(e.clientX, e.clientY);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'tb-pen');
    path.setAttribute('stroke', state.arrowColor);
    const start = (x * 10).toFixed(1) + ' ' + (y * 10).toFixed(1);
    path.setAttribute('d', 'M ' + start);
    arrowsLayer.appendChild(path);
    boardEl.setPointerCapture(e.pointerId);
    dragState = { kind: 'pen', path, pts: [start], pointerId: e.pointerId };
  }

  // ───────────────────────────────────────────────────────────
  // 12. ТЕКСТОВЫЕ ЗАМЕТКИ
  // ───────────────────────────────────────────────────────────
  function createNoteAt(e) {
    e.preventDefault();
    const { x, y } = getBoardCoords(e.clientX, e.clientY);
    const note = document.createElement('div');
    note.className = 'tb-note';
    note.style.left = x + '%';
    note.style.top = y + '%';
    note.innerHTML = '<div class="tb-note-grip" title="Тащи — двигать, правый клик — удалить">⠿</div>' +
                     '<div class="tb-note-text" contenteditable="true"></div>';
    tokensLayer.appendChild(note);
    pushUndo(() => note.remove());
    const txt = note.querySelector('.tb-note-text');
    setTimeout(() => txt.focus(), 0);
  }
  function startDragNote(noteEl, e) {
    noteEl.setPointerCapture(e.pointerId);
    dragState = { kind: 'note', el: noteEl, pointerId: e.pointerId };
  }

  // ───────────────────────────────────────────────────────────
  // 13. КАРТА — своя картинка + калибровка (у каждого в браузере)
  // ───────────────────────────────────────────────────────────
  const MAP_KEY = 'tb_map_v1';
  const DEFAULT_MAP = 'assets/map-square.webp';
  const mapState = { src: null, offX: 0, offY: 0, scale: 1 };

  function applyMapTransform() {
    const sign = state.mirrored ? -1 : 1;
    mapBgEl.style.transform =
      'translate(' + mapState.offX + 'px,' + mapState.offY + 'px) scale(' + (mapState.scale * sign) + ')';
  }
  function setMapImage(src) {
    mapState.src = src;
    mapBgEl.src = src || DEFAULT_MAP;
  }
  function saveMap() {
    try { localStorage.setItem(MAP_KEY, JSON.stringify(mapState)); }
    catch (e) { if (mapHint) mapHint.textContent = 'Картинка слишком большая — показана, но не сохранится между заходами.'; }
  }
  function loadMap() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(MAP_KEY) || 'null'); } catch (e) {}
    if (s) {
      mapState.src = s.src || null;
      mapState.offX = s.offX || 0;
      mapState.offY = s.offY || 0;
      mapState.scale = s.scale || 1;
      if (mapState.src) mapBgEl.src = mapState.src;
    }
    applyMapTransform();
    const sc = document.getElementById('tbMapScale'); if (sc) sc.value = mapState.scale;
  }
  function resetMap() {
    mapState.src = null; mapState.offX = 0; mapState.offY = 0; mapState.scale = 1;
    mapBgEl.src = DEFAULT_MAP;
    applyMapTransform();
    const sc = document.getElementById('tbMapScale'); if (sc) sc.value = 1;
    saveMap();
    if (mapHint) mapHint.textContent = '';
  }
  function startMapPan(e) {
    boardEl.setPointerCapture(e.pointerId);
    dragState = { kind: 'mappan', baseOffX: mapState.offX, baseOffY: mapState.offY,
                  startClientX: e.clientX, startClientY: e.clientY, pointerId: e.pointerId };
  }
  // Зум колесом в режиме калибровки
  boardEl.addEventListener('wheel', e => {
    if (!state.mapEdit) return;
    e.preventDefault();
    const d = e.deltaY < 0 ? 1.08 : 1 / 1.08;
    mapState.scale = Math.max(0.4, Math.min(3, mapState.scale * d));
    applyMapTransform();
    const sc = document.getElementById('tbMapScale'); if (sc) sc.value = mapState.scale;
    saveMap();
  }, { passive: false });

  // Сжатие загружаемого файла до ~1200px, чтобы влезло в localStorage
  function fileToDataUrl(file, cb) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1200;
        let w = img.width, h = img.height;
        if (w > max || h > max) { const k = max / Math.max(w, h); w = Math.round(w * k); h = Math.round(h * k); }
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        try { cb(cv.toDataURL('image/webp', 0.85)); } catch (e) { cb(reader.result); }
      };
      img.onerror = () => cb(reader.result);
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  // ── Панель карты (всегда открыта в правой колонке) ──
  const mapHint  = document.getElementById('tbMapHint');
  document.getElementById('tbMapUpload').addEventListener('click', () => document.getElementById('tbMapFile').click());
  document.getElementById('tbMapFile').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    fileToDataUrl(f, url => { setMapImage(url); saveMap(); });
    e.target.value = '';
  });
  document.getElementById('tbMapUrlApply').addEventListener('click', () => {
    const u = (document.getElementById('tbMapUrl').value || '').trim();
    if (!u) return;
    setMapImage(u); saveMap(); if (mapHint) mapHint.textContent = '';
  });
  document.getElementById('tbMapCalib').addEventListener('click', function () {
    state.mapEdit = !state.mapEdit;
    this.classList.toggle('tb-mp-on', state.mapEdit);
    boardEl.classList.toggle('tb-calib', state.mapEdit);
    if (mapHint) mapHint.textContent = state.mapEdit ? 'Тащи карту мышкой, колесо или слайдер — масштаб.' : '';
    if (state.mapEdit) deactivateTool();
  });
  document.getElementById('tbMapScale').addEventListener('input', function () {
    mapState.scale = parseFloat(this.value);
    applyMapTransform(); saveMap();
  });
  document.getElementById('tbMapReset').addEventListener('click', resetMap);

  // ── Кнопка «Редактор раскладки» (двигать/менять размер любых кнопок) ──
  const editToggle = document.getElementById('tbEditToggle');
  if (editToggle) {
    editToggle.addEventListener('click', () => {
      if (!window.LayoutEditor) return;
      const on = document.body.classList.contains('le-on');
      if (on) window.LayoutEditor.deactivate();
      else window.LayoutEditor.activate();
      editToggle.classList.toggle('tb-edit-on', !on);
    });
  }

  // ── Цветовые свотчи (стрелки/карандаш) ──
  document.querySelectorAll('.tb-color').forEach(sw => {
    sw.addEventListener('click', () => {
      document.querySelectorAll('.tb-color').forEach(s => s.classList.remove('tb-color-active'));
      sw.classList.add('tb-color-active');
      state.arrowColor = sw.dataset.color;
    });
  });

  // ── Вкладки ролей в пикере ──
  document.querySelectorAll('.tb-prole').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tb-prole').forEach(t => t.classList.remove('tb-prole-active'));
      tab.classList.add('tb-prole-active');
      state.pickerRole = tab.dataset.role;
      renderPickerGrid(pickerSearch.value);
    });
  });

  // ── Правый клик = удалить любой элемент (с отменой) ──
  boardEl.addEventListener('contextmenu', e => {
    const target = e.target.closest('.tb-token, .tb-ward-on-map, .tb-arrow, .tb-pen, .tb-note');
    if (!target) return;
    e.preventDefault();
    const parent = target.parentNode, next = target.nextSibling;
    if (target.classList.contains('tb-token')) {
      const id = target.dataset.tokenId;
      const t = state.tokens[id];
      if (t) { state.teams[t.team][t.idx] = null; updateSlotUI(t.team, t.idx); delete state.tokens[id]; }
      target.remove();
      pushUndo(() => {
        if (parent) parent.insertBefore(target, next);
        if (t) { state.tokens[id] = t; state.teams[t.team][t.idx] = t.name; updateSlotUI(t.team, t.idx); }
      });
    } else {
      target.remove();
      pushUndo(() => { if (parent) parent.insertBefore(target, next); });
    }
  });

  // ── Ctrl+Z = отмена (не мешаем редактированию заметки) ──
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z' || e.key === 'я' || e.key === 'Я')) {
      const ae = document.activeElement;
      if (ae && ae.classList && ae.classList.contains('tb-note-text')) return;
      e.preventDefault(); doUndo();
    }
  });

  // ───────────────────────────────────────────────────────────
  // СТАРТ
  // ───────────────────────────────────────────────────────────
  (async function init() {
    boardEl.dataset.tool = '';
    loadMap();
    // Сразу подсовываем локальный список, чтобы picker работал даже без сети
    state.champions = FALLBACK_CHAMPS.slice().sort((a, b) => a.name.localeCompare(b.name));
    state.champLoadDone = true;
    statusEl.textContent = 'Чемпов: ' + state.champions.length + ' (локальный)';
    // Параллельно пытаемся подтянуть свежий список из шита — апгрейд если получилось
    loadChampions().then(list => {
      if (list && list.length) {
        state.champions = list.sort((a, b) => a.name.localeCompare(b.name));
        statusEl.textContent = 'Чемпов: ' + state.champions.length + ' (из Sheets)';
        if (!pickerEl.hidden) renderPickerGrid(pickerSearch.value);
      }
    });
    console.log('[tactics-board] стартовал с', state.champions.length, 'чемпами (локальный fallback)');
  })();

})();
