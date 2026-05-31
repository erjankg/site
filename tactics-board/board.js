/* ═══════════════════════════════════════════════════════════
   ТАКТИЧЕСКАЯ ДОСКА — board.js
   Песочница для тренеров: 5v5 чемпы на карте, стрелки, варды.
   ───────────────────────────────────────────────────────────
   Структура файла:
     1. Конфиг и константы (чемпы, маппинг имён в Data Dragon)
     2. Состояние (выбранные чемпы, текущий инструмент)
     3. Picker — модалка выбора чемпиона
     4. Слоты — клик по слоту → открыть picker
     5. Токены чемпов на карте — drag&drop
     6. Стрелки — рисование на SVG-оверлее
     7. Варды — постановка одним кликом
     8. Кнопки очистки + переключение инструментов
   ═══════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  // ───────────────────────────────────────────────────────────
  // 1. КОНФИГ — список чемпионов Wild Rift + маппинг в Data Dragon
  //    Имена и логика картинок взяты из основного app.js (champKey/champIcon)
  // ───────────────────────────────────────────────────────────
  const CHAMPIONS = [
    'Aatrox','Ahri','Akali','Akshan','Alistar','Amumu','Annie','Ashe','Aurelion Sol',
    'Blitzcrank','Brand','Braum','Caitlyn','Camille','Cho\'Gath','Corki','Darius','Diana',
    'Dr. Mundo','Draven','Ekko','Evelynn','Ezreal','Fiddlesticks','Fiora','Fizz','Galio','Garen',
    'Gnar','Gragas','Graves','Gwen','Hecarim','Heimerdinger','Irelia','Janna','Jarvan IV','Jax',
    'Jayce','Jhin','Jinx','Kai\'Sa','Karma','Kassadin','Katarina','Kayle','Kayn','Kennen',
    'Kha\'Zix','Kindred','Kog\'Maw','LeBlanc','Lee Sin','Leona','Lillia','Lucian','Lulu','Lux',
    'Malphite','Master Yi','Mel','Miss Fortune','Mordekaiser','Morgana','Nami','Nasus','Nautilus',
    'Norra','Nunu & Willump','Olaf','Orianna','Pantheon','Poppy','Pyke','Rakan','Rammus','Renekton',
    'Rengar','Riven','Samira','Senna','Seraphine','Sett','Shen','Shyvana','Singed','Sion','Sivir',
    'Skarner','Sona','Soraka','Swain','Syndra','Talon','Teemo','Thresh','Tristana','Tryndamere',
    'Twisted Fate','Twitch','Varus','Vayne','Veigar','Vex','Vi','Viego','Viktor','Vladimir',
    'Volibear','Warwick','Wukong','Xayah','Xin Zhao','Yasuo','Yone','Yuumi','Zed','Zeri','Ziggs','Zoe','Zyra'
  ].sort();

  // Маппинг имени чемпа в ключ Data Dragon (взят 1-в-1 из app.js)
  function champKey(n) {
    const m = {
      'Aurelion Sol':'AurelionSol','Dr. Mundo':'DrMundo','Jarvan IV':'JarvanIV',
      'Lee Sin':'LeeSin','Master Yi':'MasterYi','Miss Fortune':'MissFortune',
      'Twisted Fate':'TwistedFate','Xin Zhao':'XinZhao','Nunu & Willump':'Nunu',
      "Cho'Gath":'Chogath',"Vel'Koz":'Velkoz',"Kai'Sa":'Kaisa',"Kha'Zix":'Khazix',"Kog'Maw":'KogMaw',
      "K'Sante":'KSante',"Rek'Sai":'RekSai','Tahm Kench':'TahmKench','Wukong':'MonkeyKing',
    };
    return m[n] || n.replace(/[\s\'\.\#&]/g, '');
  }
  const DD_URL = 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/';
  // Спец-картинки для чемпов, которых нет в DD (Wild Rift exclusives)
  const SPECIAL = {
    'Norra': '../image/norra.png',
    'Mel':   'https://ddragon.leagueoflegends.com/cdn/img/champion/tiles/Mel_0.jpg'
  };
  // Запасные ссылки если основная не отдаёт картинку (для error-фолбека)
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
      // Совсем не нашли — серая заглушка с инициалом
      img.style.cssText = 'width:100%;height:100%;background:#1a2a3a;display:flex;align-items:center;justify-content:center;color:#0BC4E3;font-weight:bold;font-size:18px;';
      img.outerHTML = '<div style="' + img.style.cssText + '">' + (name[0] || '?') + '</div>';
    }
  }

  // ───────────────────────────────────────────────────────────
  // 2. СОСТОЯНИЕ
  // ───────────────────────────────────────────────────────────
  const state = {
    teams: { blue: [null, null, null, null, null], red: [null, null, null, null, null] },
    tokens: {},      // tokenId → { team, idx, name, x, y, el }
    tool: 'move',    // 'move' | 'arrow' | 'ward-yellow' | 'ward-pink' | 'ward-blue'
    pickerTarget: null,  // { team, idx } — какой слот сейчас открыт в picker'е
    arrowDraw: null,     // { startX, startY, pathEl } — текущая рисуемая стрелка
    tokenCounter: 0
  };

  // ───────────────────────────────────────────────────────────
  // 3. PICKER — модалка выбора чемпа
  // ───────────────────────────────────────────────────────────
  const pickerEl = document.getElementById('tbPicker');
  const pickerGridEl = document.getElementById('tbPickerGrid');
  const pickerSearchEl = document.getElementById('tbPickerSearch');

  function renderPickerGrid(filter) {
    const q = (filter || '').trim().toLowerCase();
    const taken = new Set();
    state.teams.blue.forEach(n => n && taken.add(n));
    state.teams.red.forEach(n => n && taken.add(n));

    pickerGridEl.innerHTML = '';
    CHAMPIONS
      .filter(n => !q || n.toLowerCase().includes(q))
      .forEach(name => {
        const btn = document.createElement('button');
        btn.className = 'tb-pick' + (taken.has(name) ? ' tb-pick-taken' : '');
        btn.dataset.name = name;
        btn.innerHTML =
          '<img src="' + champIcon(name) + '" alt="' + name + '">' +
          '<span class="tb-pick-name">' + name + '</span>';
        btn.querySelector('img').onerror = function() { onImgError(this, name); };
        pickerGridEl.appendChild(btn);
      });
  }

  function openPicker(team, idx) {
    state.pickerTarget = { team, idx };
    pickerSearchEl.value = '';
    renderPickerGrid('');
    pickerEl.hidden = false;
    setTimeout(() => pickerSearchEl.focus(), 50);
  }
  function closePicker() {
    pickerEl.hidden = true;
    state.pickerTarget = null;
  }

  pickerSearchEl.addEventListener('input', e => renderPickerGrid(e.target.value));
  pickerEl.addEventListener('click', e => {
    if (e.target.matches('[data-picker-close]')) closePicker();
    const pick = e.target.closest('.tb-pick');
    if (pick && state.pickerTarget) {
      const name = pick.dataset.name;
      const { team, idx } = state.pickerTarget;
      pickChampion(team, idx, name);
      closePicker();
    }
  });
  // Esc — закрыть picker
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !pickerEl.hidden) closePicker();
  });

  // ───────────────────────────────────────────────────────────
  // 4. СЛОТЫ — клик открывает picker
  // ───────────────────────────────────────────────────────────
  document.querySelectorAll('.tb-slot').forEach(slot => {
    slot.addEventListener('click', () => {
      const team = slot.dataset.team;
      const idx = parseInt(slot.dataset.idx, 10);
      openPicker(team, idx);
    });
  });

  function pickChampion(team, idx, name) {
    // Если у этого слота уже был чемп — удалить старый токен
    const prevName = state.teams[team][idx];
    if (prevName) removeTokenByTeamIdx(team, idx);

    state.teams[team][idx] = name;
    updateSlotUI(team, idx);

    // Стартовая позиция: синие — нижний левый, красные — верхний правый
    // Раскидываем по 5 слотам с небольшим смещением
    const spawnX = team === 'blue' ? 12 : 88;
    const spawnY = team === 'blue' ? 88 : 12;
    const offset = idx * 4 - 8; // -8, -4, 0, 4, 8
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
      plus.innerHTML = '<img src="' + champIcon(name) + '" alt="' + name + '">';
      plus.querySelector('img').onerror = function() { onImgError(this, name); };
      label.textContent = name;
    } else {
      slot.classList.remove('tb-slot-filled');
      plus.textContent = '+';
      // Восстановить дефолтную роль-метку
      const roles = ['Топ','Лес','Мид','АДК','Саппорт'];
      label.textContent = roles[idx];
    }
  }

  // ───────────────────────────────────────────────────────────
  // 5. ТОКЕНЫ — чемпы на карте (drag&drop)
  // ───────────────────────────────────────────────────────────
  const boardEl = document.getElementById('tbBoard');
  const tokensLayer = document.getElementById('tbTokensLayer');

  function createToken(team, idx, name, xPct, yPct) {
    state.tokenCounter++;
    const tokenId = 't' + state.tokenCounter;
    const el = document.createElement('div');
    el.className = 'tb-token' + (team === 'red' ? ' tb-token-red' : '');
    el.dataset.tokenId = tokenId;
    el.style.left = xPct + '%';
    el.style.top = yPct + '%';
    el.innerHTML = '<img src="' + champIcon(name) + '" alt="' + name + '">';
    el.querySelector('img').onerror = function() { onImgError(this, name); };
    el.title = name + ' (двойной клик — удалить)';
    tokensLayer.appendChild(el);
    state.tokens[tokenId] = { team, idx, name, x: xPct, y: yPct, el };
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

  // Drag & drop токенов и вардов (одной функцией — оба перетаскиваются)
  let dragState = null;
  function getBoardCoords(clientX, clientY) {
    const rect = boardEl.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))
    };
  }

  boardEl.addEventListener('pointerdown', e => {
    // Только в режиме "Двигать" таскаем токены/варды
    if (state.tool !== 'move') return;
    const draggable = e.target.closest('.tb-token, .tb-ward-on-map');
    if (!draggable) return;
    e.preventDefault();
    draggable.setPointerCapture(e.pointerId);
    draggable.classList.add('tb-token-dragging');
    dragState = { el: draggable, pointerId: e.pointerId };
  });

  boardEl.addEventListener('pointermove', e => {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    const { x, y } = getBoardCoords(e.clientX, e.clientY);
    dragState.el.style.left = x + '%';
    dragState.el.style.top = y + '%';
  });

  function endDrag(e) {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    dragState.el.classList.remove('tb-token-dragging');
    // Сохранить координаты в state, если это токен
    const id = dragState.el.dataset.tokenId;
    if (id && state.tokens[id]) {
      state.tokens[id].x = parseFloat(dragState.el.style.left);
      state.tokens[id].y = parseFloat(dragState.el.style.top);
    }
    dragState = null;
  }
  boardEl.addEventListener('pointerup', endDrag);
  boardEl.addEventListener('pointercancel', endDrag);

  // Двойной клик по токену → удалить (и освободить слот)
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

  // ───────────────────────────────────────────────────────────
  // 6. СТРЕЛКИ — рисование на SVG-оверлее
  // ───────────────────────────────────────────────────────────
  const arrowsLayer = document.getElementById('tbArrowsLayer');

  // Используем pointerdown/move/up на самой карте — но только когда tool === 'arrow'
  // и pointerdown НЕ на токене (чтобы можно было таскать поверх)
  let arrowDraw = null;

  boardEl.addEventListener('pointerdown', e => {
    if (state.tool !== 'arrow') return;
    if (e.target.closest('.tb-token, .tb-ward-on-map')) return;
    e.preventDefault();
    const { x, y } = getBoardCoords(e.clientX, e.clientY);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'tb-arrow');
    path.setAttribute('stroke', '#FFD700');
    path.setAttribute('marker-end', 'url(#tbArrowHead)');
    path.style.color = '#FFD700';
    // viewBox карты 0..1000, координаты в % → умножаем на 10
    path.setAttribute('d', 'M ' + (x * 10) + ' ' + (y * 10));
    arrowsLayer.appendChild(path);
    arrowDraw = { path, startX: x, startY: y, points: [{ x, y }], pointerId: e.pointerId };
    boardEl.setPointerCapture(e.pointerId);
  });

  boardEl.addEventListener('pointermove', e => {
    if (!arrowDraw || e.pointerId !== arrowDraw.pointerId) return;
    const { x, y } = getBoardCoords(e.clientX, e.clientY);
    arrowDraw.points.push({ x, y });
    // Простая линия от старта до текущей точки (можно потом сделать ломаную, но прямая стрелка читабельнее)
    const d = 'M ' + (arrowDraw.startX * 10) + ' ' + (arrowDraw.startY * 10) +
              ' L ' + (x * 10) + ' ' + (y * 10);
    arrowDraw.path.setAttribute('d', d);
  });

  function endArrow(e) {
    if (!arrowDraw || e.pointerId !== arrowDraw.pointerId) return;
    // Если стрелка слишком короткая — удалить (случайный клик)
    const last = arrowDraw.points[arrowDraw.points.length - 1];
    const dx = last.x - arrowDraw.startX;
    const dy = last.y - arrowDraw.startY;
    if (Math.sqrt(dx * dx + dy * dy) < 2) {
      arrowDraw.path.remove();
    }
    arrowDraw = null;
  }
  boardEl.addEventListener('pointerup', endArrow);
  boardEl.addEventListener('pointercancel', endArrow);

  // Двойной клик по стрелке → удалить
  arrowsLayer.addEventListener('dblclick', e => {
    if (e.target.matches('.tb-arrow')) e.target.remove();
  });

  // ───────────────────────────────────────────────────────────
  // 7. ВАРДЫ — клик ставит вард в режиме ward-*
  // ───────────────────────────────────────────────────────────
  boardEl.addEventListener('click', e => {
    if (!state.tool.startsWith('ward-')) return;
    if (e.target.closest('.tb-token, .tb-ward-on-map')) return;
    const color = state.tool.replace('ward-', ''); // yellow | pink | blue
    const { x, y } = getBoardCoords(e.clientX, e.clientY);
    const ward = document.createElement('div');
    ward.className = 'tb-ward tb-ward-on-map tb-w-' + color;
    ward.style.left = x + '%';
    ward.style.top = y + '%';
    ward.title = 'Вард (двойной клик — удалить)';
    tokensLayer.appendChild(ward);
  });

  // ───────────────────────────────────────────────────────────
  // 8. ИНСТРУМЕНТЫ + ОЧИСТКА
  // ───────────────────────────────────────────────────────────
  document.querySelectorAll('.tb-tool').forEach(btn => {
    btn.addEventListener('click', () => {
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
        arrowsLayer.querySelectorAll('.tb-arrow').forEach(a => a.remove());
      }
      if (what === 'wards' || what === 'all') {
        tokensLayer.querySelectorAll('.tb-ward-on-map').forEach(w => w.remove());
      }
      if (what === 'all') {
        // Удалить всех чемпов и сбросить слоты
        tokensLayer.querySelectorAll('.tb-token').forEach(t => t.remove());
        state.tokens = {};
        ['blue','red'].forEach(team => {
          state.teams[team] = [null, null, null, null, null];
          for (let i = 0; i < 5; i++) updateSlotUI(team, i);
        });
      }
    });
  });

  // Старт — установить дефолтный инструмент
  boardEl.dataset.tool = state.tool;

  console.log('[tactics-board] готов. Чемпов в базе:', CHAMPIONS.length);
})();
