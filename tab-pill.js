'use strict';

/* ═══════════════════════════════════════════════════════════
   tab-pill.js · скользящая пилюля-индикатор для рядов вкладок
   Работает для .cs-tabs (Турниры) и .dcoop-tabs (Кооп-драфт).
   Запоминает прошлое положение пилюли по ключу группы, поэтому
   пилюля ПЛАВНО ПЕРЕЕЗЖАЕТ даже если ряд вкладок перерисован заново
   (как в Турнирах, где _render() пересобирает весь HTML).
   ═══════════════════════════════════════════════════════════ */
(function () {
  var LAST = Object.create(null);

  function tabSelector(el) {
    if (el.classList.contains('cs-tabs')) return '.cs-tab';
    if (el.classList.contains('dcoop-tabs')) return '.dcoop-tab';
    return null;
  }

  function keyFor(el) {
    var anc = el.closest('.m-mask') || el.closest('[id]') || document.body;
    var aid = anc.id || 'root';
    var cls = el.classList.contains('cs-tabs') ? 'cs-tabs' : 'dcoop-tabs';
    var same = anc.querySelectorAll('.' + cls);
    var idx = Array.prototype.indexOf.call(same, el);
    return aid + '/' + cls + '/' + idx;
  }

  function place(el) {
    var sel = tabSelector(el);
    if (!sel) return false;
    if (el.offsetParent === null) return false;           // ряд скрыт — пропускаем

    var active = el.querySelector(sel + '.active');
    var pill = el.querySelector(':scope > .tab-pill');
    if (!active) { if (pill) pill.style.opacity = '0'; return true; }

    if (!pill) {
      pill = document.createElement('span');
      pill.className = 'tab-pill';
      el.insertBefore(pill, el.firstChild);
    }
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';

    var er = el.getBoundingClientRect();
    var ar = active.getBoundingClientRect();
    var x = ar.left - er.left;
    var y = ar.top - er.top;
    var w = ar.width;
    var hgt = ar.height;
    if (w <= 0) return;

    var key = keyFor(el);
    var prev = LAST[key];
    if (prev && (Math.abs(prev.x - x) > 0.5 || Math.abs(prev.w - w) > 0.5)) {
      // FLIP: ставим в прошлую позицию без анимации, затем плавно едем в новую
      pill.style.transition = 'none';
      pill.style.transform = 'translate(' + prev.x + 'px,' + prev.y + 'px)';
      pill.style.width = prev.w + 'px';
      pill.style.height = prev.h + 'px';
      pill.getBoundingClientRect();                        // форсируем reflow
      pill.style.transition = '';
    }
    pill.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    pill.style.width = w + 'px';
    pill.style.height = hgt + 'px';
    pill.style.opacity = '1';
    LAST[key] = { x: x, y: y, w: w, h: hgt };
  }

  function placeTabPill(el) {
    if (!el) return;
    requestAnimationFrame(function () {
      // если ряд ещё скрыт (модалка только открывается) — повторяем разок
      if (place(el) === false) setTimeout(function () { place(el); }, 80);
    });
  }

  function placeTabPills(root) {
    root = root || document;
    if (root.classList && tabSelector(root)) { placeTabPill(root); return; }
    var groups = root.querySelectorAll ? root.querySelectorAll('.cs-tabs, .dcoop-tabs') : [];
    requestAnimationFrame(function () { Array.prototype.forEach.call(groups, place); });
  }

  window.placeTabPill = placeTabPill;
  window.placeTabPills = placeTabPills;

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      document.querySelectorAll('.cs-tabs, .dcoop-tabs').forEach(place);
    }, 120);
  });
})();
