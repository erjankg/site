/* ════════════════════════════════════════════════════════════════
   ANIM-PERF — пауза бесконечных анимаций, когда они никому не видны.
   Снижает фоновый «грев» CPU/GPU и подлагивание.
   1) Вкладка скрыта  → замораживаем ВСЕ анимации.
   2) Элемент за экраном → паузим его декоративные анимации.
   Анимации внутри закрытых модалок (dcoop/cybersport) уже не идут —
   у тех элементов display:none, их трогать не нужно.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // ── 1) Заморозка при скрытой вкладке ──────────────────────────
  function onVisibility() {
    document.body.classList.toggle('anims-frozen', document.hidden);
  }
  document.addEventListener('visibilitychange', onVisibility);
  onVisibility();

  // ── 2) Пауза тяжёлых декоративных анимаций за пределами экрана ──
  if (!('IntersectionObserver' in window)) return;

  // Элементы с «вечными» background-position / box-shadow / rotate,
  // которые могут уезжать из вьюпорта при скролле.
  var SELECTORS = '.btn-support, .support-btn, #nickname';

  var io = new IntersectionObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) {
      entries[i].target.classList.toggle('anim-offscreen', !entries[i].isIntersecting);
    }
  }, { rootMargin: '150px' });

  function observeIn(root) {
    var els = (root || document).querySelectorAll(SELECTORS);
    for (var i = 0; i < els.length; i++) {
      if (!els[i]._animObserved) { els[i]._animObserved = true; io.observe(els[i]); }
    }
  }

  function start() {
    observeIn(document);

    // Динамически добавляемые элементы (таблицы винрейтов, ники и т.д.)
    var mo = new MutationObserver(function (muts) {
      for (var m = 0; m < muts.length; m++) {
        var added = muts[m].addedNodes;
        for (var a = 0; a < added.length; a++) {
          var n = added[a];
          if (n.nodeType !== 1) continue;
          if (n.matches && n.matches(SELECTORS) && !n._animObserved) {
            n._animObserved = true; io.observe(n);
          }
          if (n.querySelectorAll) observeIn(n);
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();

/* ════════════════════════════════════════════════════════════════
   PREFETCH тактической доски при наведении.
   Доска — отдельная страница (tactics-board/). При наведении на кнопку
   тихо подгружаем её и ассеты в кэш браузера → клик открывает мгновенно.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  function setup() {
    var link = document.querySelector('.side-btn-tactics');
    if (!link) return;
    var warmed = false;
    function warm() {
      if (warmed) return; warmed = true;
      ['tactics-board/', 'tactics-board/style.css', 'tactics-board/board.js'].forEach(function (href) {
        var l = document.createElement('link');
        l.rel = 'prefetch'; l.href = href;
        document.head.appendChild(l);
      });
      var img = new Image(); img.src = 'tactics-board/assets/map-square.webp';
    }
    link.addEventListener('mouseenter', warm);
    link.addEventListener('focus', warm);
    link.addEventListener('touchstart', warm, { passive: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
})();
