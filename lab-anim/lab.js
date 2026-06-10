/* ════════════════════════════════════════════════════════════════
   ANIM-LAB — логика лаборатории.
   ANIMS — единый список. Каждая запись описывает пару keyframes
   (из lab-animations.css) + длительность + кривую. JS собирает из
   этого готовую строку animation и вешает на окно.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // dur — секунды появления. outDur — закрытия (если короче).
  // ease — кривая появления. outEase — кривая закрытия.
  var EXPO = 'var(--ease-out-expo)';
  var APPLE = 'var(--ease-apple)';
  var SPRING = 'var(--ease-spring)';
  var BACK = 'var(--ease-back)';
  var ELASTIC = 'var(--ease-elastic)';
  var INFAST = 'var(--ease-in-fast)';

  var ANIMS = [
    { id:'fade',       name:'Fade',          cat:'Базовые',   desc:'Чистое затухание',                in:'fade',       dur:0.22, ease:EXPO,    outDur:0.16, outEase:INFAST },
    { id:'scaleFade',  name:'Scale-Fade',    cat:'Базовые',   desc:'Текущий стиль сайта (2026)',      in:'scaleFade',  dur:0.28, ease:EXPO,    outDur:0.18, outEase:INFAST },
    { id:'slideUp',    name:'Slide-Up',      cat:'Скольжение',desc:'Въезжает снизу',                  in:'slideUp',    dur:0.32, ease:EXPO,    outDur:0.20, outEase:INFAST },
    { id:'slideDown',  name:'Slide-Down',    cat:'Скольжение',desc:'Падает сверху',                   in:'slideDown',  dur:0.32, ease:EXPO,    outDur:0.20, outEase:INFAST },
    { id:'slideLeft',  name:'Slide-Left',    cat:'Скольжение',desc:'Выезжает справа',                 in:'slideLeft',  dur:0.34, ease:EXPO,    outDur:0.22, outEase:INFAST },
    { id:'slideRight', name:'Slide-Right',   cat:'Скольжение',desc:'Выезжает слева',                  in:'slideRight', dur:0.34, ease:EXPO,    outDur:0.22, outEase:INFAST },
    { id:'springPop',  name:'Spring-Pop',    cat:'Пружина',   desc:'Лёгкий перелёт',                  in:'springPop',  dur:0.40, ease:BACK,    outDur:0.18, outEase:INFAST },
    { id:'elastic',    name:'Elastic',       cat:'Пружина',   desc:'Сильный отскок',                  in:'elastic',    dur:0.62, ease:ELASTIC, outDur:0.22, outEase:INFAST },
    { id:'dropBounce', name:'Drop-Bounce',   cat:'Пружина',   desc:'Падает с отскоком',               in:'dropBounce', dur:0.62, ease:BACK,    outDur:0.30, outEase:INFAST },
    { id:'flipX',      name:'Flip-X',        cat:'3D',        desc:'Переворот по горизонтали',        in:'flipX',      dur:0.46, ease:EXPO,    outDur:0.26, outEase:INFAST },
    { id:'flipY',      name:'Flip-Y',        cat:'3D',        desc:'Переворот по вертикали',          in:'flipY',      dur:0.50, ease:EXPO,    outDur:0.28, outEase:INFAST },
    { id:'door',       name:'Door',          cat:'3D',        desc:'Открывается как дверь',           in:'door',       dur:0.52, ease:EXPO,    outDur:0.30, outEase:INFAST },
    { id:'tilt',       name:'Tilt-In',       cat:'3D',        desc:'3D-наклон с оседанием',           in:'tilt',       dur:0.48, ease:EXPO,    outDur:0.26, outEase:INFAST },
    { id:'swing',      name:'Swing',         cat:'3D',        desc:'Качается на петле сверху',        in:'swing',      dur:0.58, ease:BACK,    outDur:0.26, outEase:INFAST },
    { id:'depth',      name:'Depth-Push',    cat:'3D',        desc:'Выезжает из глубины',             in:'depth',      dur:0.42, ease:EXPO,    outDur:0.26, outEase:INFAST },
    { id:'zoomIn',     name:'Zoom-In',       cat:'Масштаб',   desc:'Из маленького',                   in:'zoomIn',     dur:0.34, ease:BACK,    outDur:0.20, outEase:INFAST },
    { id:'zoomOut',    name:'Zoom-Out',      cat:'Масштаб',   desc:'Из большого, оседает',            in:'zoomOut',    dur:0.34, ease:EXPO,    outDur:0.20, outEase:INFAST },
    { id:'blur',       name:'Blur-In',       cat:'Премиум',   desc:'Фокусировка из размытия',         in:'blur',       dur:0.40, ease:EXPO,    outDur:0.24, outEase:INFAST },
    { id:'riseBlur',   name:'Rise-Blur',     cat:'Премиум',   desc:'Снизу + фокус (рекомендую)',      in:'riseBlur',   dur:0.46, ease:EXPO,    outDur:0.26, outEase:INFAST },
    { id:'iris',       name:'Iris',          cat:'Маска',     desc:'Раскрытие из круга',              in:'iris',       dur:0.50, ease:EXPO,    outDur:0.30, outEase:INFAST },
    { id:'wipeDown',   name:'Wipe-Down',     cat:'Маска',     desc:'Штора сверху вниз',               in:'wipeDown',   dur:0.42, ease:EXPO,    outDur:0.28, outEase:INFAST },
    { id:'unfold',     name:'Unfold',        cat:'Маска',     desc:'Линия → разворот',                in:'unfold',     dur:0.50, ease:EXPO,    outDur:0.34, outEase:INFAST },
    { id:'skew',       name:'Skew-In',       cat:'Геймер',    desc:'Въезд с перекосом',               in:'skew',       dur:0.36, ease:EXPO,    outDur:0.22, outEase:INFAST },
    { id:'neon',       name:'Neon-Glow',     cat:'Геймер',    desc:'Вспышка неона',                   in:'neon',       dur:0.55, ease:EXPO,    outDur:0.24, outEase:INFAST },
    { id:'glitch',     name:'Glitch',        cat:'Геймер',    desc:'Цифровой сбой',                   in:'glitch',     dur:0.50, ease:'steps(1,end)', outDur:0.34, outEase:'steps(1,end)' },

    /* ── ПАК +50 ── */
    { id:'rotateIn',       name:'Rotate-In',        cat:'Поворот',   desc:'Вращение + появление',          in:'rotateIn',       dur:0.55, ease:BACK,  outDur:0.30, outEase:INFAST },
    { id:'rotateDownLeft', name:'Rotate ↙',         cat:'Поворот',   desc:'Из нижнего-левого, вращаясь',   in:'rotateDownLeft', dur:0.52, ease:EXPO,  outDur:0.28, outEase:INFAST },
    { id:'rotateUpRight',  name:'Rotate ↗',         cat:'Поворот',   desc:'Из нижнего-правого, вращаясь',  in:'rotateUpRight',  dur:0.52, ease:EXPO,  outDur:0.28, outEase:INFAST },
    { id:'cardFlip',   name:'Card-Flip',      cat:'3D',        desc:'Переворот карты 180°',           in:'cardFlip',   dur:0.60, ease:EXPO,    outDur:0.34, outEase:INFAST },
    { id:'foldUp',     name:'Fold-Up',        cat:'3D',        desc:'Складывается снизу',             in:'foldUp',     dur:0.50, ease:EXPO,    outDur:0.28, outEase:INFAST },
    { id:'perspTop',   name:'Persp-Top',      cat:'3D',        desc:'Наклон от верхнего края',        in:'perspTop',   dur:0.48, ease:EXPO,    outDur:0.26, outEase:INFAST },
    { id:'cube',       name:'Cube',           cat:'3D',        desc:'Кубический поворот справа',      in:'cube',       dur:0.58, ease:APPLE,   outDur:0.30, outEase:INFAST },
    { id:'flipDiag',   name:'Flip-Diagonal',  cat:'3D',        desc:'Диагональный флип',              in:'flipDiag',   dur:0.55, ease:EXPO,    outDur:0.30, outEase:INFAST },
    { id:'bounceIn',   name:'Bounce-In',      cat:'Пружина',   desc:'Многоступенчатый отскок',        in:'bounceIn',   dur:0.72, ease:EXPO,    outDur:0.30, outEase:INFAST },
    { id:'jackBox',    name:'Jack-in-Box',    cat:'Пружина',   desc:'Из коробки (scale+rotate)',      in:'jackBox',    dur:0.62, ease:BACK,    outDur:0.26, outEase:INFAST },
    { id:'backInUp',   name:'Back-In-Up',     cat:'Пружина',   desc:'Назад-вверх с перелётом',        in:'backInUp',   dur:0.60, ease:EXPO,    outDur:0.34, outEase:INFAST },
    { id:'backInDown', name:'Back-In-Down',   cat:'Пружина',   desc:'Назад-вниз с перелётом',         in:'backInDown', dur:0.60, ease:EXPO,    outDur:0.34, outEase:INFAST },
    { id:'wobbleIn',   name:'Wobble-In',      cat:'Пружина',   desc:'Покачивание при входе',          in:'wobbleIn',   dur:0.70, ease:EXPO,    outDur:0.24, outEase:INFAST },
    { id:'tadaIn',     name:'Ta-Da!',         cat:'Пружина',   desc:'Привлекает внимание',            in:'tadaIn',     dur:0.72, ease:EXPO,    outDur:0.24, outEase:INFAST },
    { id:'heartbeatIn',name:'Heartbeat',      cat:'Пружина',   desc:'Толчок-сердцебиение',            in:'heartbeatIn',dur:0.62, ease:EXPO,    outDur:0.26, outEase:INFAST },
    { id:'slideUpBig',  name:'Slide-Up Big',  cat:'Скольжение',desc:'Издалека снизу',                 in:'slideUpBig',  dur:0.50, ease:EXPO,   outDur:0.30, outEase:INFAST },
    { id:'slideDownBig',name:'Slide-Down Big',cat:'Скольжение',desc:'Издалека сверху',                in:'slideDownBig',dur:0.50, ease:EXPO,   outDur:0.30, outEase:INFAST },
    { id:'lightSpeed',  name:'Light-Speed →', cat:'Скольжение',desc:'Светоскорость справа',           in:'lightSpeed',  dur:0.45, ease:EXPO,   outDur:0.26, outEase:INFAST },
    { id:'lightSpeedLeft',name:'Light-Speed ←',cat:'Скольжение',desc:'Светоскорость слева',           in:'lightSpeedLeft',dur:0.45,ease:EXPO,  outDur:0.26, outEase:INFAST },
    { id:'slideRotate', name:'Slide-Rotate',  cat:'Скольжение',desc:'Снизу с поворотом',              in:'slideRotate', dur:0.50, ease:BACK,   outDur:0.26, outEase:INFAST },
    { id:'flyTopLeft',    name:'Fly ↖',        cat:'Угол',      desc:'Влетает из верх-лево',          in:'flyTopLeft',    dur:0.48, ease:EXPO, outDur:0.26, outEase:INFAST },
    { id:'flyTopRight',   name:'Fly ↗',        cat:'Угол',      desc:'Влетает из верх-право',         in:'flyTopRight',   dur:0.48, ease:EXPO, outDur:0.26, outEase:INFAST },
    { id:'flyBottomLeft', name:'Fly ↙',        cat:'Угол',      desc:'Влетает из низ-лево',           in:'flyBottomLeft', dur:0.48, ease:EXPO, outDur:0.26, outEase:INFAST },
    { id:'flyBottomRight',name:'Fly ↘',        cat:'Угол',      desc:'Влетает из низ-право',          in:'flyBottomRight',dur:0.48, ease:EXPO, outDur:0.26, outEase:INFAST },
    { id:'popCornerTL', name:'Pop-Corner',    cat:'Угол',      desc:'Раскрытие из верх-лево угла',    in:'popCornerTL', dur:0.40, ease:BACK,   outDur:0.22, outEase:INFAST },
    { id:'wipeUp',     name:'Wipe-Up',        cat:'Маска',     desc:'Штора снизу вверх',              in:'wipeUp',     dur:0.42, ease:EXPO,    outDur:0.28, outEase:INFAST },
    { id:'wipeLeft',   name:'Wipe-Left',      cat:'Маска',     desc:'Штора справа налево',            in:'wipeLeft',   dur:0.42, ease:EXPO,    outDur:0.28, outEase:INFAST },
    { id:'wipeRight',  name:'Wipe-Right',     cat:'Маска',     desc:'Штора слева направо',            in:'wipeRight',  dur:0.42, ease:EXPO,    outDur:0.28, outEase:INFAST },
    { id:'circleTR',   name:'Circle ↗',       cat:'Маска',     desc:'Круг из верх-право угла',        in:'circleTR',   dur:0.50, ease:EXPO,    outDur:0.30, outEase:INFAST },
    { id:'circleBL',   name:'Circle ↙',       cat:'Маска',     desc:'Круг из низ-лево угла',          in:'circleBL',   dur:0.50, ease:EXPO,    outDur:0.30, outEase:INFAST },
    { id:'diamond',    name:'Diamond',        cat:'Маска',     desc:'Ромб из центра',                 in:'diamond',    dur:0.50, ease:EXPO,    outDur:0.30, outEase:INFAST },
    { id:'splitV',     name:'Split-Vertical', cat:'Маска',     desc:'Раскрытие из центра по бокам',   in:'splitV',     dur:0.45, ease:EXPO,    outDur:0.28, outEase:INFAST },
    { id:'splitH',     name:'Split-Horizontal',cat:'Маска',    desc:'Раскрытие из центра вверх-вниз', in:'splitH',     dur:0.45, ease:EXPO,    outDur:0.28, outEase:INFAST },
    { id:'boxExpand',  name:'Box-Expand',     cat:'Маска',     desc:'Коробка из центра',              in:'boxExpand',  dur:0.45, ease:EXPO,    outDur:0.28, outEase:INFAST },
    { id:'zoomBlur',   name:'Zoom-Blur',      cat:'Масштаб',   desc:'Наезд с размытием',              in:'zoomBlur',   dur:0.45, ease:EXPO,    outDur:0.24, outEase:INFAST },
    { id:'popIn',      name:'Pop-In',         cat:'Масштаб',   desc:'Резкий поп',                     in:'popIn',      dur:0.32, ease:BACK,    outDur:0.18, outEase:INFAST },
    { id:'growWidth',  name:'Grow-Width',     cat:'Масштаб',   desc:'Сначала ширина, потом высота',   in:'growWidth',  dur:0.50, ease:EXPO,    outDur:0.30, outEase:INFAST },
    { id:'expandCenter',name:'Expand-Center', cat:'Масштаб',   desc:'Из точки в центре',              in:'expandCenter',dur:0.40, ease:BACK,   outDur:0.22, outEase:INFAST },
    { id:'silkUp',     name:'Silk-Up',        cat:'Премиум',   desc:'Шёлковый подъём с фокусом',      in:'silkUp',     dur:0.55, ease:EXPO,    outDur:0.28, outEase:INFAST },
    { id:'floatUp',    name:'Float-Up',       cat:'Премиум',   desc:'Лёгкое всплытие',                in:'floatUp',    dur:0.50, ease:EXPO,    outDur:0.26, outEase:INFAST },
    { id:'driftIn',    name:'Drift-In',       cat:'Премиум',   desc:'Мягкий дрейф по диагонали',      in:'driftIn',    dur:0.50, ease:EXPO,    outDur:0.26, outEase:INFAST },
    { id:'revealSoft', name:'Reveal-Soft',    cat:'Премиум',   desc:'Нежное проявление',              in:'revealSoft', dur:0.50, ease:EXPO,    outDur:0.28, outEase:INFAST },
    { id:'fadeScaleSoft',name:'Fade-Scale Soft',cat:'Премиум', desc:'Тонкий scale-fade',              in:'fadeScaleSoft',dur:0.40,ease:EXPO,   outDur:0.22, outEase:INFAST },
    { id:'powerOn',    name:'Power-On (ЭЛТ)', cat:'Геймер',    desc:'Включение старого экрана',       in:'powerOn',    dur:0.55, ease:EXPO,    outDur:0.34, outEase:INFAST },
    { id:'hologram',   name:'Hologram',       cat:'Геймер',    desc:'Голограмма с мерцанием',         in:'hologram',   dur:0.60, ease:EXPO,    outDur:0.30, outEase:INFAST },
    { id:'scanline',   name:'Scanline',       cat:'Геймер',    desc:'Скан-линия сверху вниз',         in:'scanline',   dur:0.50, ease:EXPO,    outDur:0.28, outEase:INFAST },
    { id:'shatter',    name:'Reassemble',     cat:'Геймер',    desc:'Сборка из осколков',             in:'shatter',    dur:0.50, ease:EXPO,    outDur:0.28, outEase:INFAST },
    { id:'energize',   name:'Energize',       cat:'Геймер',    desc:'Заряд энергии (свечение)',       in:'energize',   dur:0.60, ease:EXPO,    outDur:0.26, outEase:INFAST },
    { id:'hueShift',   name:'Hue-Shift',      cat:'Геймер',    desc:'Сдвиг цвета',                    in:'hueShift',   dur:0.50, ease:EXPO,    outDur:0.26, outEase:INFAST },
    { id:'matrixDrop', name:'Matrix-Drop',    cat:'Геймер',    desc:'Падение в стиле Матрицы',        in:'matrixDrop', dur:0.55, ease:EXPO,    outDur:0.30, outEase:INFAST }
  ];

  var BACKDROPS = [
    { id:'fade',     name:'Fade (тёмный)' },
    { id:'blur',     name:'Blur (размытие)' },
    { id:'vignette', name:'Vignette (виньетка)' }
  ];

  // ── DOM ──
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var listEl    = $('#labList');
  var catsEl    = $('#labCats');
  var searchEl  = $('#labSearch');
  var maskEl    = $('#labMask');
  var winEl     = $('#labWin');
  var hintEl    = $('#labHint');
  var currentEl = $('#labCurrent');
  var codeEl    = $('#labCode');
  var bdSelect  = $('#labBackdrop');
  var speedEl   = $('#labSpeed');
  var speedVal  = $('#labSpeedVal');
  var queueBadge= $('#labQueueBadge');

  var state = {
    current: ANIMS[1],   // Scale-Fade по умолчанию
    cat: 'Все',
    speed: 1,
    backdrop: 'fade',
    queueTimer: null
  };

  // ════════════════ построение строки animation ════════════════
  function inShorthand(a, speed) {
    var d = (a.dur / speed).toFixed(2);
    return 'labIn_' + a.in + ' ' + d + 's ' + a.ease + ' both';
  }
  function outShorthand(a, speed) {
    var d = ((a.outDur || a.dur * 0.7) / speed).toFixed(2);
    return 'labOut_' + a.in + ' ' + d + 's ' + (a.outEase || INFAST) + ' forwards';
  }
  function bdInShorthand(id, speed) {
    return 'labBdIn_' + id + ' ' + (0.3 / speed).toFixed(2) + 's ease both';
  }
  function bdOutShorthand(id, speed) {
    return 'labBdOut_' + id + ' ' + (0.25 / speed).toFixed(2) + 's ease forwards';
  }

  // ════════════════ воспроизведение ════════════════
  var closeT = null;
  function forceReflow(el) { void el.offsetWidth; }

  function play(a) {
    a = a || state.current;
    if (closeT) { clearTimeout(closeT); closeT = null; }
    // показать фон
    maskEl.classList.add('show');
    maskEl.style.animation = 'none';
    forceReflow(maskEl);
    maskEl.style.animation = bdInShorthand(state.backdrop, state.speed);
    // показать окно
    winEl.style.display = 'block';
    winEl.style.animation = 'none';
    // перезапуск stagger-строк внутри окна
    winEl.classList.remove('lab-stagger');
    forceReflow(winEl);
    winEl.classList.add('lab-stagger');
    winEl.style.animation = inShorthand(a, state.speed);
    hintEl.style.display = 'none';
  }

  function close(a) {
    a = a || state.current;
    if (closeT) { clearTimeout(closeT); closeT = null; }
    winEl.style.animation = outShorthand(a, state.speed);
    maskEl.style.animation = bdOutShorthand(state.backdrop, state.speed);
    var outMs = ((a.outDur || a.dur * 0.7) / state.speed) * 1000 + 30;
    closeT = setTimeout(function () {
      winEl.style.display = 'none';
      maskEl.classList.remove('show');
    }, outMs);
  }

  // play → подождать → close, вернуть промис (для очереди)
  function playThenClose(a) {
    return new Promise(function (resolve) {
      play(a);
      var inMs = (a.dur / state.speed) * 1000;
      setTimeout(function () {
        close(a);
        var outMs = ((a.outDur || a.dur * 0.7) / state.speed) * 1000 + 200;
        setTimeout(resolve, outMs);
      }, inMs + 650); // подержать открытой, чтоб разглядеть
    });
  }

  // ════════════════ очередь ════════════════
  function runQueue(count) {
    stopQueue();
    var pool = visibleAnims();
    if (count !== 'all') pool = pool.slice(0, count);
    if (!pool.length) return;
    var i = 0;
    queueBadge.classList.add('on');
    function step() {
      if (i >= pool.length) { stopQueue(); return; }
      var a = pool[i];
      select(a, true);
      queueBadge.textContent = '▶ очередь ' + (i + 1) + ' / ' + pool.length + '  ·  ' + a.name;
      playThenClose(a).then(function () {
        i++;
        state.queueTimer = setTimeout(step, 120);
      });
    }
    step();
  }
  function stopQueue() {
    if (state.queueTimer) { clearTimeout(state.queueTimer); state.queueTimer = null; }
    queueBadge.classList.remove('on');
  }

  // ════════════════ список / фильтры ════════════════
  function visibleAnims() {
    var q = (searchEl.value || '').toLowerCase().trim();
    return ANIMS.filter(function (a) {
      if (state.cat !== 'Все' && a.cat !== state.cat) return false;
      if (q && (a.name + ' ' + a.desc + ' ' + a.cat).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }

  function renderList() {
    var arr = visibleAnims();
    listEl.innerHTML = '';
    arr.forEach(function (a, i) {
      var row = document.createElement('div');
      row.className = 'lab-item' + (a === state.current ? ' on' : '');
      row.innerHTML =
        '<div class="lab-item-num">' + (i + 1) + '</div>' +
        '<div class="lab-item-body">' +
          '<div class="lab-item-name">' + a.name + '</div>' +
          '<div class="lab-item-desc">' + a.desc + '</div>' +
        '</div>' +
        '<div class="lab-item-tag">' + a.cat + '</div>';
      row.addEventListener('click', function () { select(a); });
      row.addEventListener('mouseenter', function () { /* hover preview off by default */ });
      listEl.appendChild(row);
    });
  }

  function renderCats() {
    var cats = ['Все'];
    ANIMS.forEach(function (a) { if (cats.indexOf(a.cat) === -1) cats.push(a.cat); });
    catsEl.innerHTML = '';
    cats.forEach(function (c) {
      var b = document.createElement('div');
      b.className = 'lab-cat' + (c === state.cat ? ' on' : '');
      b.textContent = c;
      b.addEventListener('click', function () { state.cat = c; renderCats(); renderList(); });
      catsEl.appendChild(b);
    });
  }

  // ════════════════ выбор + код ════════════════
  function select(a, fromQueue) {
    state.current = a;
    currentEl.innerHTML = a.name + ' <span>· ' + a.cat + '</span>';
    renderList();
    renderCode(a);
    if (!fromQueue) { stopQueue(); play(a); }
  }

  function renderCode(a) {
    var inS = inShorthand(a, 1);
    var outS = outShorthand(a, 1);
    codeEl.innerHTML =
      '<span class="k">/* появление окна модалки */</span>\n' +
      '.m-mask.active > .m-win {\n' +
      '  <span class="k">animation</span>: <span class="v">' + inS + '</span>;\n' +
      '}\n' +
      '<span class="k">/* закрытие */</span>\n' +
      '.m-mask.closing > .m-win {\n' +
      '  <span class="k">animation</span>: <span class="v">' + outS + '</span>;\n' +
      '}\n' +
      '<span class="k">/* фон (backdrop) */</span>\n' +
      '.m-mask.active { <span class="k">animation</span>: <span class="v">' + bdInShorthand(state.backdrop, 1) + '</span>; }';
    codeEl._copyText =
      '/* ' + a.name + ' — из anim-lab. keyframes лежат в lab-animations.css */\n' +
      '.m-mask.active > .m-win  { animation: ' + inS + '; }\n' +
      '.m-mask.closing > .m-win { animation: ' + outS + '; }\n' +
      '.m-mask.active { animation: ' + bdInShorthand(state.backdrop, 1) + '; }';
  }

  // ════════════════ привязка пульта ════════════════
  function bind() {
    searchEl.addEventListener('input', renderList);
    bdSelect.addEventListener('change', function () { state.backdrop = bdSelect.value; renderCode(state.current); });

    speedEl.addEventListener('input', function () {
      state.speed = parseFloat(speedEl.value);
      speedVal.textContent = state.speed.toFixed(2) + '×';
    });

    $('#btnPlay').addEventListener('click', function () { stopQueue(); play(); });
    $('#btnClose').addEventListener('click', function () { close(); });
    $('#btnLoop').addEventListener('click', function () { stopQueue(); playThenClose(state.current).then(function(){ $('#btnLoop').click(); }); });

    $('#btnQ10').addEventListener('click', function () { runQueue(10); });
    $('#btnQ20').addEventListener('click', function () { runQueue(20); });
    $('#btnQAll').addEventListener('click', function () { runQueue('all'); });
    $('#btnStop').addEventListener('click', stopQueue);

    // окно-образец: кнопки внутри
    $('#winClose').addEventListener('click', function () { close(); });
    maskEl.addEventListener('click', function (e) { if (e.target === maskEl) close(); });

    var copyBtn = $('#labCopy');
    copyBtn.addEventListener('click', function () {
      var txt = codeEl._copyText || '';
      navigator.clipboard.writeText(txt).then(function () {
        copyBtn.textContent = '✓ скопировано'; copyBtn.classList.add('ok');
        setTimeout(function () { copyBtn.textContent = 'copy'; copyBtn.classList.remove('ok'); }, 1400);
      });
    });

    // клавиатура
    document.addEventListener('keydown', function (e) {
      if (e.target === searchEl) return;
      var arr = visibleAnims();
      var idx = arr.indexOf(state.current);
      if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); select(arr[(idx + 1) % arr.length]); }
      else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); select(arr[(idx - 1 + arr.length) % arr.length]); }
      else if (e.key === ' ') { e.preventDefault(); stopQueue(); play(); }
      else if (e.key === 'Escape') { stopQueue(); close(); }
    });
  }

  // ════════════════ init ════════════════
  function init() {
    // заполнить выбор backdrop
    BACKDROPS.forEach(function (b) {
      var o = document.createElement('option'); o.value = b.id; o.textContent = b.name; bdSelect.appendChild(o);
    });
    renderCats();
    renderList();
    bind();
    select(state.current);
    winEl.style.display = 'none';
    maskEl.classList.remove('show');
    hintEl.style.display = 'block';
  }

  document.addEventListener('DOMContentLoaded', init);
})();
