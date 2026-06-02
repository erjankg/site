/* ════════════════════════════════════════════════════════════════
   LAYOUT EDITOR — drag-редактор позиций/размеров (только админ).
   Грузится лениво (app.js → _openLayoutEditor). На обычных юзеров
   не влияет: код подтягивается лишь по клику в админ-меню.

   Модель: позиция = transform: translate(dx,dy) от родного места
   (не ломает соседей), размер = явные width/height. Всё в px, под ПК.
   Черновик хранится в localStorage[LS_KEY]; на боевой переносится через
   «Экспорт» (готовый CSS) → пользователь отдаёт его Claude.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var LS_KEY = 'le_layout_pc';
  var STYLE_ID = 'le-applied-style';
  var SNAP = 6; // порог привязки, px

  // drafts: { "<selector>": { dx, dy, w, h } }
  function loadDrafts() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch (e) { return {}; } }
  var drafts = loadDrafts();

  // ── Адрес-селектор элемента ───────────────────────────────────
  function cssPath(el) {
    if (!el || el.nodeType !== 1) return '';
    if (el.id) return '#' + CSS.escape(el.id);
    var parts = [], node = el;
    while (node && node.nodeType === 1 && node !== document.body) {
      if (node.id) { parts.unshift('#' + CSS.escape(node.id)); break; }
      var p = node.parentNode; if (!p) break;
      var idx = Array.prototype.indexOf.call(p.children, node) + 1;
      parts.unshift(node.tagName.toLowerCase() + ':nth-child(' + idx + ')');
      node = p;
    }
    return parts.join('>');
  }

  // ── Сборка CSS из черновика ───────────────────────────────────
  function buildCSS(wrap) {
    var rules = [];
    for (var sel in drafts) {
      var d = drafts[sel], decl = [];
      if (d.dx || d.dy) decl.push('transform: translate(' + (d.dx || 0) + 'px, ' + (d.dy || 0) + 'px) !important');
      if (d.w != null) decl.push('width: ' + d.w + 'px !important', 'max-width: none !important');
      if (d.h != null) decl.push('height: ' + d.h + 'px !important');
      if (decl.length) rules.push(sel + ' { ' + decl.join('; ') + '; }');
    }
    var body = rules.join('\n');
    if (wrap) return '/* layout-editor — правки позиций (ПК) */\n@media (min-width: 769px) {\n' + body.replace(/^/gm, '  ') + '\n}';
    return body;
  }

  function rebuildStyle() {
    var st = document.getElementById(STYLE_ID);
    if (!st) { st = document.createElement('style'); st.id = STYLE_ID; document.head.appendChild(st); }
    st.textContent = buildCSS(true);
  }
  function saveDrafts() { localStorage.setItem(LS_KEY, JSON.stringify(drafts)); rebuildStyle(); }

  // Применить черновик без открытия редактора (зовётся из app.js на старте).
  function applyOnly() { if (Object.keys(drafts).length) rebuildStyle(); }

  // ════════════════════════════════════════════════════════════
  //  Ниже — интерактив, создаётся только при activate()
  // ════════════════════════════════════════════════════════════
  var active = false, bar, selBox, hoverEl, selEl = null, selData = null;
  var guideV, guideH;
  var drag = null; // { mode:'move'|'resize', edges, startX,startY, startW,startH, startDx,startDy }
  var snapLines = { v: [], h: [] };

  function el(tag, cls, parent) { var e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }

  function activate() {
    if (active) return;
    active = true;
    // подключаем CSS редактора, если ещё нет
    if (!document.getElementById('le-css')) {
      var l = document.createElement('link'); l.id = 'le-css'; l.rel = 'stylesheet'; l.href = 'layout-editor.css';
      document.head.appendChild(l);
    }
    document.body.classList.add('le-on');
    buildBar();
    hoverEl = el('div', 'le-hover-outline', document.body); hoverEl.style.display = 'none';
    guideV = el('div', 'le-guide le-guide-v', document.body); guideV.style.display = 'none';
    guideH = el('div', 'le-guide le-guide-h', document.body); guideH.style.display = 'none';

    document.addEventListener('mousemove', onHover, true);
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('click', blockClick, true);
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition, true);
    toast('Редактор включён. Кликни элемент → тяни тело/углы. Esc — снять выбор.');
    document.addEventListener('keydown', onKey, true);
  }

  function deactivate() {
    if (!active) return;
    active = false;
    deselect();
    document.removeEventListener('mousemove', onHover, true);
    document.removeEventListener('mousedown', onDown, true);
    document.removeEventListener('click', blockClick, true);
    window.removeEventListener('scroll', reposition, true);
    window.removeEventListener('resize', reposition, true);
    document.removeEventListener('keydown', onKey, true);
    document.body.classList.remove('le-on');
    if (bar) { bar.remove(); bar = null; }
    if (hoverEl) hoverEl.remove();
    if (guideV) guideV.remove();
    if (guideH) guideH.remove();
    // Черновик остаётся применённым (<style> на месте) — он переживает выключение.
  }

  // ── Панель ────────────────────────────────────────────────────
  function buildBar() {
    bar = el('div', 'le-bar', document.body);
    var t = el('div', 'le-bar-title', bar); t.textContent = '🎚 Редактор позиций';
    var m = el('div', 'le-bar-mode', bar); m.textContent = 'ПК';
    el('div', 'le-spacer', bar);
    mkBtn('Экспорт', 'accent', exportCSS);
    mkBtn('Сброс', 'danger', resetAll);
    mkBtn('Выкл', '', deactivate);
  }
  function mkBtn(label, extra, fn) {
    var b = el('button', 'le-btn' + (extra ? ' ' + extra : ''), bar);
    b.textContent = label;
    b.addEventListener('click', function (e) { e.stopPropagation(); fn(); });
    return b;
  }

  // ── Перехват кликов сайта в режиме правки ─────────────────────
  function isChrome(t) { return t.closest && (t.closest('.le-bar') || t.closest('.le-sel') || t.closest('.le-toast')); }
  function blockClick(e) {
    if (isChrome(e.target)) return;
    e.preventDefault(); e.stopPropagation();
  }

  // ── Hover-подсветка ───────────────────────────────────────────
  function onHover(e) {
    if (drag) return;
    var t = e.target;
    if (isChrome(t)) { hoverEl.style.display = 'none'; return; }
    var r = t.getBoundingClientRect();
    hoverEl.style.display = ''; hoverEl.style.left = r.left + 'px'; hoverEl.style.top = r.top + 'px';
    hoverEl.style.width = r.width + 'px'; hoverEl.style.height = r.height + 'px';
  }

  // ── Выбор ─────────────────────────────────────────────────────
  function select(target) {
    selEl = target;
    var sel = cssPath(target);
    selData = drafts[sel] || (drafts[sel] = {});
    selData._sel = sel;
    if (!selBox) {
      selBox = el('div', 'le-sel', document.body);
      el('div', 'le-sel-body', selBox);
      ['nw','n','ne','e','se','s','sw','w'].forEach(function (h) { var hh = el('div', 'le-h le-h-' + h, selBox); hh.dataset.edge = h; });
      el('div', 'le-tag', selBox);
    }
    selBox.style.display = '';
    reposition();
  }
  function deselect() { selEl = null; selData = null; if (selBox) selBox.style.display = 'none'; }

  function reposition() {
    if (!selEl || !selBox) return;
    var r = selEl.getBoundingClientRect();
    selBox.style.left = r.left + 'px'; selBox.style.top = r.top + 'px';
    selBox.style.width = r.width + 'px'; selBox.style.height = r.height + 'px';
    var tag = selBox.querySelector('.le-tag');
    tag.textContent = selEl.tagName.toLowerCase() + '  ' + Math.round(r.width) + '×' + Math.round(r.height);
  }

  // ── Mousedown: resize / move / select ─────────────────────────
  function onDown(e) {
    if (e.button !== 0) return;
    if (isChrome(e.target) && e.target.closest('.le-bar')) return; // кнопки панели
    var handle = e.target.closest && e.target.closest('.le-h');
    if (handle) { e.preventDefault(); e.stopPropagation(); startResize(handle.dataset.edge, e); return; }
    var body = e.target.closest && e.target.closest('.le-sel-body');
    if (body && selEl) { e.preventDefault(); e.stopPropagation(); startMove(e); return; }
    // обычный элемент сайта → выбрать и сразу разрешить move
    if (isChrome(e.target)) return;
    e.preventDefault(); e.stopPropagation();
    select(e.target);
    startMove(e);
  }

  function curXY(d) { return { dx: (d && d.dx) || 0, dy: (d && d.dy) || 0 }; }

  function startMove(e) {
    var c = curXY(selData);
    drag = { mode: 'move', startX: e.clientX, startY: e.clientY, startDx: c.dx, startDy: c.dy };
    collectSnap();
    document.addEventListener('mousemove', onDrag, true);
    document.addEventListener('mouseup', endDrag, true);
  }
  function startResize(edge, e) {
    var c = curXY(selData);
    drag = {
      mode: 'resize', edges: edge,
      startX: e.clientX, startY: e.clientY,
      startW: selEl.offsetWidth, startH: selEl.offsetHeight,
      startDx: c.dx, startDy: c.dy
    };
    document.addEventListener('mousemove', onDrag, true);
    document.addEventListener('mouseup', endDrag, true);
  }

  function onDrag(e) {
    if (!drag || !selEl) return;
    var mdx = e.clientX - drag.startX, mdy = e.clientY - drag.startY;
    if (drag.mode === 'move') {
      var ndx = drag.startDx + mdx, ndy = drag.startDy + mdy;
      var snapped = applySnap(ndx, ndy);
      ndx = snapped.dx; ndy = snapped.dy;
      selEl.style.setProperty('transform', 'translate(' + ndx + 'px,' + ndy + 'px)', 'important');
      selData.dx = Math.round(ndx); selData.dy = Math.round(ndy);
    } else {
      var ed = drag.edges, nw = drag.startW, nh = drag.startH, ndx2 = drag.startDx, ndy2 = drag.startDy;
      if (ed.indexOf('e') !== -1) nw = drag.startW + mdx;
      if (ed.indexOf('w') !== -1) { nw = drag.startW - mdx; ndx2 = drag.startDx + mdx; }
      if (ed.indexOf('s') !== -1) nh = drag.startH + mdy;
      if (ed.indexOf('n') !== -1) { nh = drag.startH - mdy; ndy2 = drag.startDy + mdy; }
      nw = Math.max(16, nw); nh = Math.max(16, nh);
      selEl.style.setProperty('width', nw + 'px', 'important');
      selEl.style.setProperty('max-width', 'none', 'important');
      selEl.style.setProperty('height', nh + 'px', 'important');
      selEl.style.setProperty('transform', 'translate(' + ndx2 + 'px,' + ndy2 + 'px)', 'important');
      selData.w = Math.round(nw); selData.h = Math.round(nh);
      selData.dx = Math.round(ndx2); selData.dy = Math.round(ndy2);
    }
    reposition();
  }

  function endDrag() {
    document.removeEventListener('mousemove', onDrag, true);
    document.removeEventListener('mouseup', endDrag, true);
    guideV.style.display = 'none'; guideH.style.display = 'none';
    // снять inline (его заменит <style> из черновика) и сохранить
    if (selEl) { selEl.style.removeProperty('transform'); selEl.style.removeProperty('width'); selEl.style.removeProperty('max-width'); selEl.style.removeProperty('height'); }
    // если правок по элементу нет — убрать пустую запись
    if (selData && !selData.dx && !selData.dy && selData.w == null && selData.h == null) { delete drafts[selData._sel]; }
    saveDrafts();
    reposition();
    drag = null;
  }

  // ── Привязка ──────────────────────────────────────────────────
  function collectSnap() {
    snapLines = { v: [], h: [] };
    var all = document.body.getElementsByTagName('*');
    var vw = window.innerWidth, vh = window.innerHeight;
    // края и центр вьюпорта
    snapLines.v.push(0, vw / 2, vw); snapLines.h.push(0, vh / 2, vh);
    for (var i = 0; i < all.length; i++) {
      var n = all[i];
      if (n === selEl || isChrome(n)) continue;
      var r = n.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) continue;
      if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue;
      snapLines.v.push(r.left, r.left + r.width / 2, r.right);
      snapLines.h.push(r.top, r.top + r.height / 2, r.bottom);
    }
  }
  function nearest(val, lines) {
    var best = null, bd = SNAP + 1;
    for (var i = 0; i < lines.length; i++) { var d = Math.abs(lines[i] - val); if (d < bd) { bd = d; best = lines[i]; } }
    return best;
  }
  function applySnap(ndx, ndy) {
    if (!selEl) return { dx: ndx, dy: ndy };
    // текущий rect соответствует ещё не применённому ndx/dy → считаем от базового
    var r = selEl.getBoundingClientRect();
    // базовый left без текущего применённого transform: r.left - (старый dx)
    var baseLeft = r.left - (selData.dx || 0), baseTop = r.top - (selData.dy || 0);
    var w = r.width, h = r.height;
    guideV.style.display = 'none'; guideH.style.display = 'none';
    // вертикаль: проверяем left/center/right при новом ndx
    var L = baseLeft + ndx, edgesV = [L, L + w / 2, L + w];
    for (var a = 0; a < edgesV.length; a++) { var sv = nearest(edgesV[a], snapLines.v); if (sv != null) { ndx += sv - edgesV[a]; guideV.style.display = ''; guideV.style.left = sv + 'px'; break; } }
    var T = baseTop + ndy, edgesH = [T, T + h / 2, T + h];
    for (var b = 0; b < edgesH.length; b++) { var sh = nearest(edgesH[b], snapLines.h); if (sh != null) { ndy += sh - edgesH[b]; guideH.style.display = ''; guideH.style.top = sh + 'px'; break; } }
    return { dx: ndx, dy: ndy };
  }

  // ── Esc ───────────────────────────────────────────────────────
  function onKey(e) { if (e.key === 'Escape') { deselect(); } }

  // ── Экспорт / Сброс ───────────────────────────────────────────
  function exportCSS() {
    var css = buildCSS(true);
    if (!Object.keys(drafts).length) { toast('Пока нечего экспортировать — ничего не менял.'); return; }
    navigator.clipboard.writeText(css).then(function () {
      toast('✓ CSS скопирован. Вставь его Claude в чат — он вошьёт в styles.css.');
    }, function () {
      // fallback: показать в prompt
      window.prompt('Скопируй CSS вручную:', css);
    });
  }
  function resetAll() {
    if (!confirm('Сбросить ВСЕ изменения позиций? (вернётся как было)')) return;
    drafts = {}; saveDrafts(); deselect();
    toast('Сброшено.');
  }

  // ── Тост ──────────────────────────────────────────────────────
  var toastEl, toastT;
  function toast(msg) {
    if (!toastEl) toastEl = el('div', 'le-toast', document.body);
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 3200);
  }

  // ── Экспорт API ───────────────────────────────────────────────
  window.LayoutEditor = { activate: activate, deactivate: deactivate, applyOnly: applyOnly };
  // применить черновик сразу при загрузке этого файла (если есть)
  applyOnly();
})();
