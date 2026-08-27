/* ============================================================
   lab-ui-kit v4 — GSAP-контроллер. Слой-сэндвич, transform/opacity only,
   reduced-motion → fade. Переключение варианта → мгновенное превью эффекта.
   ============================================================ */
(function () {
  'use strict';
  var root = document.documentElement;
  var $ = function (id) { return document.getElementById(id); };
  if (window.gsap && window.Flip) gsap.registerPlugin(Flip);
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  function reduced() { return root.getAttribute('data-rm') === 'on' || mqReduce.matches; }

  /* ---------- ЕДИНЫЙ SVG-НАБОР ---------- */
  var S = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">';
  var F = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none">';
  var E = '</svg>', SH = '<path d="M12 3 L19 6 V11 C19 16 15.6 19.4 12 21 C8.4 19.4 5 16 5 11 V6 Z"/>';
  var ICONS = {
    close: S + '<path d="M6 6 L18 18 M18 6 L6 18"/>' + E,
    back: S + '<path d="M14 6 L8 12 L14 18"/><path d="M8 12 H20"/>' + E,
    down: S + '<path d="M6 13 L12 19 L18 13"/><path d="M12 5 V18"/>' + E,
    menu: S + '<path d="M4 7 H20 M4 12 H20 M4 17 H20"/>' + E,
    check: S + '<path d="M5 12.5 L10 17.5 L19 7"/>' + E,
    copy: S + '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M5 15 V6 A2 2 0 0 1 7 4 H15"/>' + E,
    search: S + '<circle cx="11" cy="11" r="6.5"/><path d="M16.5 16.5 L21 21"/>' + E,
    sun: S + '<circle cx="12" cy="12" r="4"/><path d="M12 2.5V4.8M12 19.2V21.5M2.5 12H4.8M19.2 12H21.5M5.2 5.2 6.8 6.8M17.2 17.2 18.8 18.8M18.8 5.2 17.2 6.8M6.8 17.2 5.2 18.8"/>' + E,
    moon: F + '<path d="M20 14.6 A8 8 0 1 1 9.4 4 A6.4 6.4 0 0 0 20 14.6 Z"/>' + E,
    star: F + '<path d="M12 3 L14.6 8.9 21 9.6 16.2 13.9 17.6 20.2 12 16.9 6.4 20.2 7.8 13.9 3 9.6 9.4 8.9 Z"/>' + E,
    ad: S + '<path d="M12 3 V13"/><path d="M9.6 5.4 L12 3 L14.4 5.4"/><path d="M8.5 13 H15.5"/><path d="M12 13 V18"/><circle cx="12" cy="20" r="1.3"/>' + E,
    ap: F + '<path d="M12 3 C12.5 10 13.5 11 20 11.5 C13.5 12 12.5 13 12 20 C11.5 13 10.5 12 4 11.5 C10.5 11 11.5 10 12 3 Z"/>' + E,
    hp: F + '<path d="M12 20 C4.5 15 2.6 10.6 4.3 7.5 C5.7 4.9 9 4.6 12 7.6 C15 4.6 18.3 4.9 19.7 7.5 C21.4 10.6 19.5 15 12 20 Z"/>' + E,
    armor: S + SH + E,
    mr: S + SH + '<path fill="currentColor" stroke="none" d="M12 8 C12.2 10.4 12.6 10.8 15 11 C12.6 11.2 12.2 11.6 12 14 C11.8 11.6 11.4 11.2 9 11 C11.4 10.8 11.8 10.4 12 8 Z"/>' + E,
    as: S + '<circle cx="12" cy="13.5" r="7"/><path d="M9.5 3.5 H14.5"/><path d="M12 3.5 V6.3"/><path d="M12 13.5 L15 10.5"/>' + E,
    ms: S + '<path d="M4 8 H13"/><path d="M4 12 H10"/><path d="M4 16 H14"/><path d="M15 7 L20 12 L15 17"/>' + E,
    crit: S + '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="3"/><path d="M12 2.5 V5 M12 19 V21.5 M2.5 12 H5 M19 12 H21.5"/>' + E,
    lethality: S + SH + '<path stroke-width="2" d="M4.5 19.5 L19.5 4.5"/><path stroke-width="2" d="M14.5 4.5 H19.5 V9.5"/>' + E,
    magicpen: S + SH + '<path fill="currentColor" stroke="none" d="M12.9 6 L8.4 12.6 H11.4 L10.3 18 L15.4 10.7 H12.2 Z"/>' + E,
    penpct: S + SH + '<path d="M9.6 9.6 L14.4 14.4"/><circle cx="9.6" cy="9.6" r="1.1"/><circle cx="14.4" cy="14.4" r="1.1"/>' + E,
    up: F + '<path d="M12 6 L18.5 15.5 H5.5 Z"/>' + E,
    dn: F + '<path d="M12 18 L5.5 8.5 H18.5 Z"/>' + E,
    spark: F + '<path d="M12 3 C12.4 8.4 13.6 9.6 19 10 C13.6 10.4 12.4 11.6 12 17 C11.6 11.6 10.4 10.4 5 10 C10.4 9.6 11.6 8.4 12 3 Z"/><path d="M18 15 C18.15 17 18.5 17.35 20.5 17.5 C18.5 17.65 18.15 18 18 20 C17.85 18 17.5 17.65 15.5 17.5 C17.5 17.35 17.85 17 18 15 Z"/>' + E
  };
  function ICON(n) { return ICONS[n] || ''; }
  function fillIcons(scope) { (scope || document).querySelectorAll('[data-icon]').forEach(function (el) { if (!el._ic) { el.innerHTML = ICON(el.getAttribute('data-icon')); el._ic = 1; } }); }
  fillIcons();

  /* ★ ПОРТРЕТЫ — КВАДРАТНАЯ ИКОНКА 120×120 (как в боевом app.js), а НЕ loading-сплэш.
     Была корневая причина «качество говно»: сплэш 308×560 ужимался в кружок 54px (в ~6 раз,
     с обрезкой) → мыло. Иконка 120×120 под 54–64px = почти 1:1, резко даже на retina. */
  var DDI = 'https://ddragon.leagueoflegends.com/cdn/16.13.1/img/champion/';
  var DDL = 'https://ddragon.leagueoflegends.com/cdn/img/champion/loading/'; /* только для A/B «как было» */
  document.querySelectorAll('[data-portrait]').forEach(function (img) { img.src = DDI + img.getAttribute('data-portrait') + '.png'; });
  document.querySelectorAll('[data-portrait-old]').forEach(function (img) { img.src = DDL + img.getAttribute('data-portrait-old') + '_0.jpg'; });
  var DDT = 'https://ddragon.leagueoflegends.com/cdn/img/champion/tiles/'; /* тайл 380×380 — для диагностики E */
  document.querySelectorAll('[data-portrait-tile]').forEach(function (img) { img.src = DDT + img.getAttribute('data-portrait-tile') + '_0.jpg'; });

  /* ---------- арт / rm / звук ---------- */
  var DD = 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/', ARTN = { lux: 'Lux', soraka: 'Soraka', thresh: 'Thresh', jinx: 'Jinx' };
  function setArt(a) { root.setAttribute('data-art', a); $('splash').style.backgroundImage = "url('" + DD + (ARTN[a] || 'Lux') + "_0.jpg')"; }
  $('artPick').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; $('artPick').querySelectorAll('button').forEach(function (x) { x.classList.remove('active'); }); b.classList.add('active'); setArt(b.getAttribute('data-art')); choice(); });
  setArt('lux');
  if (mqReduce.matches) { $('rmToggle').checked = true; root.setAttribute('data-rm', 'on'); }
  $('rmToggle').addEventListener('change', function () { root.setAttribute('data-rm', this.checked ? 'on' : 'off'); choice(); });
  /* замедление для теста зума (чтобы разглядеть кадр ВО ВРЕМЯ движения) */
  var slowTgl = $('slowTgl');
  if (slowTgl) slowTgl.addEventListener('click', function () { slowTgl.classList.toggle('on'); root.setAttribute('data-slow', slowTgl.classList.contains('on') ? 'on' : 'off'); });
  var soundOn = false, actx = null;
  $('soundToggle').addEventListener('change', function () { soundOn = this.checked; if (soundOn && !actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } });
  function blip(f, d) { if (!soundOn || !actx) return; var o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.value = f; o.connect(g); g.connect(actx.destination); g.gain.setValueAtTime(.0001, actx.currentTime); g.gain.exponentialRampToValueAtTime(.07, actx.currentTime + .008); g.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + d); o.start(); o.stop(actx.currentTime + d); }
  document.addEventListener('pointerdown', function (e) { if (soundOn && e.target.closest('.btn,.mr-ico,.ic-btn,.chip,.tab,.sw-field,.drop-btn,.drop-opt,.cmdk-item')) blip(320, .09); });

  /* ---------- ГЕНЕРИК seg + ПРЕВЬЮ ---------- */
  document.querySelectorAll('[data-seg]').forEach(function (seg) {
    var axis = seg.getAttribute('data-axis'), kit = seg.closest('.kit-card').querySelector('.kit');
    seg.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      seg.querySelectorAll('button').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active'); kit.setAttribute('data-' + axis, b.getAttribute('data-val'));
      preview(kit); choice();
    });
  });
  /* ГЕНЕРИК тумблеры (вкл/выкл — комбинируются, в отличие от сегмента) */
  document.querySelectorAll('[data-tgl]').forEach(function (t) {
    var attr = t.getAttribute('data-attr'), kit = t.closest('.kit-card').querySelector('.kit');
    if (t.classList.contains('on')) kit.setAttribute('data-' + attr, '');
    t.addEventListener('click', function () { t.classList.toggle('on'); if (t.classList.contains('on')) kit.setAttribute('data-' + attr, ''); else kit.removeAttribute('data-' + attr); preview(kit); choice(); });
  });
  function preview(kit) {
    var k = kit.dataset.kind;
    if (k === 'ic') { refreshIc(kit); previewIc(kit); }
    else if (k === 'tab') movePill(kit.querySelector('.tabs'), false);
    else if (k === 'btn') { var b = kit.querySelector('.btn'); if (b && !reduced()) gsap.fromTo(b, { scale: .9 }, { scale: 1, duration: .45, ease: 'back.out(2)' }); }
    else if (k === 'chip') { var c = kit.querySelector('.chip'); if (c && !reduced()) gsap.fromTo(c, { scale: .9 }, { scale: 1, duration: .4, ease: 'back.out(3)' }); }
    else if (k === 'sw') { kit.querySelectorAll('[data-sw-el]').forEach(function (s) { placeSw(kit, s, false); }); }
    else if (k === 'slider') updSlider();
    else if (k === 'drop') { if (dropAPI) { dropAPI.open(); setTimeout(dropAPI.close, 650); } }
    else if (k === 'tip') { flashTip(kit); }
    else if (k === 'toast') layoutStack();
    else if (k === 'card') sweepCard(kit);
    else if (k === 'vt') { /* контент тот же, переход виден при клике */ }
    else if (k === 'kpi') runKpi();
    else if (k === 'rating') runRating();
    else if (k === 'prog') { if (kit.dataset.prog === 'bar') gsap.fromTo($('progFill'), { width: '0%' }, { width: '66%', duration: .5, ease: 'power2.out' }); }
    else if (k === 'ava') { var a = kit.querySelector('.ava-row'); if (a && !reduced()) gsap.fromTo(a, { autoAlpha: .35 }, { autoAlpha: 1, duration: .35, ease: 'power2.out' }); }
    else if (k === 'icon') { if (kit.dataset.istyle === 'drawon') drawOnIcons(); }
  }

  /* ============ 1 · КНОПКИ ============ */
  document.querySelectorAll('.btn').forEach(function (btn) {
    var kit = btn.closest('.kit'), has = function (a) { return kit && kit.hasAttribute('data-' + a); };
    var xTo = gsap.quickTo(btn, 'x', { duration: .4, ease: 'power3' }), yTo = gsap.quickTo(btn, 'y', { duration: .4, ease: 'power3' });
    function settle() { if (!has('magnetic') && !has('lift') && !btn.matches(':hover')) gsap.set(btn, { clearProps: 'transform' }); }
    btn.addEventListener('pointerenter', function () { clearTimeout(btn._ct); if (has('lift') && !reduced()) yTo(-3); });
    btn.addEventListener('pointermove', function (e) { if (!has('magnetic') || reduced()) return; var r = btn.getBoundingClientRect(); xTo((e.clientX - (r.left + r.width / 2)) * .35); yTo((e.clientY - (r.top + r.height / 2)) * .35); });
    btn.addEventListener('pointerleave', function () { xTo(0); yTo(0); clearTimeout(btn._ct); btn._ct = setTimeout(function () { gsap.set(btn, { clearProps: 'transform' }); }, 500); });
    btn.addEventListener('pointerdown', function (e) {
      if (!reduced()) gsap.to(btn, { scale: .94, duration: .12, ease: 'power2.out' });
      if (has('ripple') && !reduced()) { var fxl = btn.querySelector('.el-fx'); if (fxl) { var r = btn.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2.2, rip = document.createElement('span'); rip.className = 'ripple'; rip.style.left = (e.clientX - r.left) + 'px'; rip.style.top = (e.clientY - r.top) + 'px'; rip.style.width = rip.style.height = d + 'px'; fxl.appendChild(rip); gsap.fromTo(rip, { scale: 0, autoAlpha: .55 }, { scale: 1, autoAlpha: 0, duration: .6, ease: 'power2.out', onComplete: function () { rip.remove(); } }); } }
    });
    ['pointerup', 'pointercancel'].forEach(function (ev) { btn.addEventListener(ev, function () { if (!reduced()) gsap.to(btn, { scale: 1, duration: .45, ease: 'back.out(2)', onComplete: settle }); }); });
  });

  /* ============ 2 · КРЕСТИК / ИКОНКИ ============ */
  function refreshIc(kit) {
    var fx = kit.dataset.fx;
    kit.querySelectorAll('.ic-btn').forEach(function (btn) {
      var ga = btn.querySelector('.g-a'), gb = btn.querySelector('.g-b');
      ga.classList.remove('hide'); gb.classList.add('hide'); gsap.set(btn, { rotation: 0, scale: 1 });
      gb.innerHTML = fx === 'morph' ? ICON('back') : fx === 'menu' ? ICON('close') : (fx === 'draw' || fx === 'copy') ? ICON('check') : '';
      ga.innerHTML = fx === 'menu' ? ICON('menu') : ICON(ga.getAttribute('data-icon'));
    });
  }
  function previewIc(kit) {
    if (reduced()) return; var btn = kit.querySelector('.ic-btn'); if (!btn) return;
    var fx = kit.dataset.fx, ga = btn.querySelector('.g-a'), gb = btn.querySelector('.g-b');
    if (fx === 'rotate') gsap.fromTo(btn, { rotation: 0 }, { rotation: 90, scale: 1.08, duration: .32, ease: 'back.out(2)', yoyo: true, repeat: 1 });
    else if (fx === 'spin') gsap.fromTo(btn, { rotation: 0 }, { rotation: 360, duration: .6, ease: 'power2.out' });
    else if (fx === 'morph' || fx === 'menu') { ga.classList.add('hide'); gb.classList.remove('hide'); setTimeout(function () { ga.classList.remove('hide'); gb.classList.add('hide'); }, 700); }
    else if (fx === 'draw') { ga.classList.add('hide'); gb.classList.remove('hide'); var p = gb.querySelector('path'); if (p) { var L = p.getTotalLength(); gsap.set(p, { strokeDasharray: L, strokeDashoffset: L }); gsap.to(p, { strokeDashoffset: 0, duration: .5, ease: 'power2.out' }); } setTimeout(function () { ga.classList.remove('hide'); gb.classList.add('hide'); }, 1200); }
    else if (fx === 'copy') { ga.classList.add('hide'); gb.classList.remove('hide'); gsap.fromTo(gb, { scale: .4 }, { scale: 1, duration: .4, ease: 'back.out(3)' }); setTimeout(function () { ga.classList.remove('hide'); gb.classList.add('hide'); }, 1100); }
  }
  document.querySelectorAll('.ic-btn').forEach(function (btn) {
    var kit = btn.closest('.kit'), ga = btn.querySelector('.g-a'), gb = btn.querySelector('.g-b'), busy = false;
    function revert() { ga.classList.remove('hide'); gb.classList.add('hide'); busy = false; }
    btn.addEventListener('pointerenter', function () { var f = kit.dataset.fx; if (reduced()) return; if (f === 'rotate') gsap.to(btn, { rotation: 90, scale: 1.08, duration: .3, ease: 'back.out(2)' }); else if (f === 'morph' && !busy) { ga.classList.add('hide'); gb.classList.remove('hide'); } });
    btn.addEventListener('pointerleave', function () { var f = kit.dataset.fx; if (f === 'rotate') gsap.to(btn, { rotation: 0, scale: 1, duration: .35, ease: 'power3' }); else if (f === 'morph' && !busy) revert(); });
    btn.addEventListener('click', function () {
      var f = kit.dataset.fx;
      if (f === 'spin') gsap.to(btn, { rotation: '+=360', duration: .6, ease: 'power2.out' });
      else if (f === 'menu') { busy = !busy; if (busy) { ga.classList.add('hide'); gb.classList.remove('hide'); } else revert(); }
      else if (f === 'draw') { busy = true; ga.classList.add('hide'); gb.classList.remove('hide'); var p = gb.querySelector('path'); if (p && !reduced()) { var L = p.getTotalLength(); gsap.set(p, { strokeDasharray: L, strokeDashoffset: L }); gsap.to(p, { strokeDashoffset: 0, duration: .5, ease: 'power2.out' }); } setTimeout(revert, 1400); }
      else if (f === 'copy') { busy = true; ga.classList.add('hide'); gb.classList.remove('hide'); if (!reduced()) gsap.fromTo(gb, { scale: .4 }, { scale: 1, duration: .4, ease: 'back.out(3)' }); setTimeout(revert, 1200); }
    });
  });
  document.querySelectorAll('.kit[data-kind="ic"]').forEach(refreshIc);

  /* ============ 3 · ТАБЫ ============ */
  function movePill(tabs, animate) {
    if (!tabs) return; var pill = tabs.querySelector('.tab-pill'), act = tabs.querySelector('.tab.active'); if (!pill || !act) return;
    var d = { left: act.offsetLeft, width: act.offsetWidth };
    if (animate && !reduced()) gsap.to(pill, { left: d.left, width: d.width, duration: .4, ease: 'power3.out' }); else gsap.set(pill, d);
  }
  document.querySelectorAll('.tabs').forEach(function (tabs) {
    movePill(tabs, false);
    tabs.querySelectorAll('.tab').forEach(function (tab) { tab.addEventListener('click', function () { tabs.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); }); tab.classList.add('active'); movePill(tabs, true); }); });
  });
  window.addEventListener('resize', function () { document.querySelectorAll('.tabs').forEach(function (t) { movePill(t, false); }); });

  /* ============ 4 · ЧИПЫ ============ */
  document.querySelectorAll('.chip').forEach(function (chip) {
    chip.addEventListener('click', function (e) {
      if (e.target.closest('.chip-x')) { gsap.to(chip, { scale: 0, autoAlpha: 0, duration: .25, ease: 'back.in(2)', onComplete: function () { chip.remove(); } }); return; }
      chip.classList.toggle('on'); if (!reduced()) gsap.fromTo(chip, { scale: .9 }, { scale: 1, duration: .4, ease: 'back.out(3)' });
    });
  });

  /* ============ 5 · ТУМБЛЕРЫ ============ */
  function placeSw(kit, sw, animate) {
    var knob = sw.querySelector('.sw-knob'), dist = sw.classList.contains('on') ? (sw.offsetWidth - knob.offsetWidth - 6) : 0;
    if (!animate || reduced()) { gsap.set(knob, { x: dist, scaleX: 1 }); return; }
    if (kit.dataset.sw === 'squash') gsap.timeline().to(knob, { scaleX: 1.5, duration: .12, ease: 'power2.out' }).to(knob, { scaleX: 1, duration: .3, ease: 'back.out(2)' }, '<');
    gsap.to(knob, { x: dist, duration: .35, ease: 'back.out(1.7)' });
  }
  document.querySelectorAll('[data-sw-el]').forEach(function (sw) {
    var kit = sw.closest('.kit'); placeSw(kit, sw, false);
    sw.closest('.sw-field').addEventListener('click', function () { sw.classList.toggle('on'); placeSw(kit, sw, true); });
  });

  /* ============ 6 · ПОЛЗУНОК ============ */
  var rng = $('rngDemo');
  function updSlider() { if (!rng) return; var pct = (rng.value - rng.min) / (rng.max - rng.min) * 100; $('rngVal').textContent = rng.value; var b = $('rngBubble'); if (b) b.textContent = rng.value; rng.style.setProperty('--fill', pct + '%'); rng.closest('.rng-field').style.setProperty('--fill', pct + '%'); }
  if (rng) { rng.addEventListener('input', updSlider); updSlider(); }

  /* ============ 7 · ДРОПДАУН ============ */
  var dropAPI = null, drop = $('dropDemo');
  if (drop) {
    var menu = drop.querySelector('.drop-menu'), sInput = drop.querySelector('.drop-search'); gsap.set(menu, { autoAlpha: 0 });
    function openD() { drop.classList.add('open'); gsap.killTweensOf(menu); gsap.fromTo(menu, { autoAlpha: 0, y: -6, scale: .94 }, { autoAlpha: 1, y: 0, scale: 1, duration: reduced() ? .01 : .3, ease: 'back.out(1.6)', transformOrigin: 'top center' }); if (drop.closest('.kit').dataset.drop === 'combobox' && sInput) setTimeout(function () { sInput.focus(); }, 30); }
    function closeD() { drop.classList.remove('open'); gsap.to(menu, { autoAlpha: 0, y: -6, scale: .96, duration: .18, ease: 'power2.in' }); }
    dropAPI = { open: openD, close: closeD };
    drop.querySelector('.drop-btn').addEventListener('click', function (e) { e.stopPropagation(); drop.classList.contains('open') ? closeD() : openD(); });
    drop.querySelectorAll('.drop-opt').forEach(function (o) { o.addEventListener('click', function () { drop.querySelectorAll('.drop-opt').forEach(function (x) { x.classList.remove('sel'); }); o.classList.add('sel'); drop.querySelector('.drop-cur').textContent = o.textContent.trim(); closeD(); }); });
    if (sInput) sInput.addEventListener('input', function () { var q = this.value.toLowerCase(); drop.querySelectorAll('.drop-opt').forEach(function (o) { o.style.display = o.textContent.toLowerCase().indexOf(q) > -1 ? '' : 'none'; }); });
    sInput && sInput.addEventListener('click', function (e) { e.stopPropagation(); });
    document.addEventListener('click', function () { if (drop.classList.contains('open')) closeD(); });
  }

  /* ============ 8 · ПОИСК ============ */
  document.querySelectorAll('.s-clear').forEach(function (c) { c.addEventListener('click', function () { c.parentNode.querySelector('input').value = ''; }); });

  /* ============ 10 · ТУЛТИП ============ */
  function flashTip(kit) { var tip = kit.querySelector('.tip'); if (!tip) return; gsap.fromTo(tip, { autoAlpha: 0, scale: .85, y: 6 }, { autoAlpha: 1, scale: 1, y: 0, duration: reduced() ? .01 : .3, ease: 'back.out(1.7)' }); setTimeout(function () { gsap.to(tip, { autoAlpha: 0, scale: .9, duration: .2 }); }, 1100); }
  document.querySelectorAll('.tip-host').forEach(function (host) {
    var kit = host.closest('.kit'), tip = host.querySelector('.tip');
    var xTo = gsap.quickTo(tip, 'x', { duration: .3, ease: 'power2' }), yTo = gsap.quickTo(tip, 'y', { duration: .3, ease: 'power2' }); gsap.set(tip, { autoAlpha: 0 });
    host.addEventListener('pointerenter', function () {
      if (kit.dataset.fx === 'follow') { tip.style.position = 'fixed'; tip.style.left = '0'; tip.style.top = '0'; tip.style.bottom = 'auto'; } else { tip.style.position = ''; tip.style.left = ''; tip.style.top = ''; tip.style.bottom = ''; }
      gsap.fromTo(tip, { autoAlpha: 0, scale: .85, y: kit.dataset.fx === 'follow' ? 0 : 6 }, { autoAlpha: 1, scale: 1, y: 0, duration: reduced() ? .01 : .3, ease: 'back.out(1.7)' });
    });
    host.addEventListener('pointermove', function (e) { if (kit.dataset.fx !== 'follow') return; xTo(e.clientX + 14); yTo(e.clientY + 16); });
    host.addEventListener('pointerleave', function () { gsap.to(tip, { autoAlpha: 0, scale: .9, duration: .18 }); });
  });

  /* ============ 11 · ТОСТЫ ============ */
  var stack = $('toastStack'), stackToasts = [], toastKit = document.querySelector('.kit[data-kind="toast"]');
  function layoutStack(expanded) {
    if (!stack) return; var model = toastKit.dataset.model, exp = expanded || model === 'expand' || model === 'list';
    stackToasts.forEach(function (t, i) {
      t.style.zIndex = 100 - i; var to;
      if (model === 'single') to = { y: 0, scale: 1, autoAlpha: i === 0 ? 1 : 0 };
      else if (exp) to = { y: i * 64, scale: 1, autoAlpha: 1 };
      else to = { y: i * 11, scale: 1 - i * .05, autoAlpha: i < 3 ? 1 : 0 };
      to.duration = reduced() ? .01 : .35; to.ease = 'power3.out'; to.overwrite = 'auto'; gsap.to(t, to);
    });
  }
  if (stack) {
    stackToasts = Array.prototype.slice.call(stack.querySelectorAll('.toast')); layoutStack();
    stack.addEventListener('pointerenter', function () { if (toastKit.dataset.model === 'stack') layoutStack(true); });
    stack.addEventListener('pointerleave', function () { layoutStack(false); });
    stackToasts.forEach(function (t) {
      var sx = 0, drag = false;
      t.addEventListener('pointerdown', function (e) { drag = true; sx = e.clientX; t.setPointerCapture(e.pointerId); });
      t.addEventListener('pointermove', function (e) { if (drag) gsap.set(t, { x: e.clientX - sx }); });
      t.addEventListener('pointerup', function (e) { drag = false; var dx = e.clientX - sx; if (Math.abs(dx) > 90) gsap.to(t, { x: dx > 0 ? 400 : -400, autoAlpha: 0, duration: .3, ease: 'power2.in', onComplete: function () { stackToasts = stackToasts.filter(function (x) { return x !== t; }); t.remove(); layoutStack(); } }); else gsap.to(t, { x: 0, duration: .35, ease: 'back.out(1.7)' }); });
    });
  }
  /* живые тосты */
  var host = $('toastHost'), live = [];
  function hostPos() { return toastKit ? toastKit.dataset.pos : 'br'; }
  function relayoutLive() { var top = hostPos() === 'tc', dir = top ? 1 : -1; live.forEach(function (el, i) { gsap.to(el, { y: dir * i * 66, scale: 1 - i * .04, autoAlpha: i < 4 ? 1 : 0, duration: .3, ease: 'power3.out' }); }); }
  function makeToast(cls, html) { var t = document.createElement('div'); t.className = 'toast ' + cls; t.innerHTML = html; host.className = 'toast-host ' + hostPos(); if (toastKit.dataset.tstyle === 'glass') t.style.cssText = 'background:rgba(2,9,15,.5);backdrop-filter:blur(8px) saturate(1.6);-webkit-backdrop-filter:blur(8px) saturate(1.6)'; host.appendChild(t); live.unshift(t); var top = hostPos() === 'tc'; gsap.fromTo(t, { y: top ? -30 : 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: reduced() ? .01 : .35, ease: 'power3.out', onComplete: relayoutLive }); relayoutLive(); return t; }
  function killToast(t) { gsap.to(t, { autoAlpha: 0, x: 40, duration: .25, ease: 'power2.in', onComplete: function () { live = live.filter(function (x) { return x !== t; }); t.remove(); relayoutLive(); } }); }
  var kinds = [['ok', 'Билд сохранён', 'Добавлен в коллекцию'], ['info', 'Данные обновлены', 'WR пересчитан'], ['warn', 'Патч 7.x на подходе', 'Мета сдвинется']], ki = 0;
  $('toastBtn') && $('toastBtn').addEventListener('click', function () { var k = kinds[ki++ % kinds.length]; var t = makeToast(k[0] + ' rich', '<span class="t-dot"></span><div class="t-body"><b>' + k[1] + '</b><span>' + k[2] + '</span></div>'); setTimeout(function () { killToast(t); }, 3000); });
  $('confettiBtn') && $('confettiBtn').addEventListener('click', function () { var r = this.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top + r.height / 2); blip(523, .12); setTimeout(function () { blip(659, .14); }, 70); setTimeout(function () { blip(784, .18); }, 150); makeToast('ok rich', '<span class="t-dot"></span><div class="t-body"><b>Драфт завершён 🎉</b><span>Команда собрана</span></div>'); });
  $('promiseBtn') && $('promiseBtn').addEventListener('click', function () { var t = makeToast('info', '<span class="t-spin"></span><div class="t-body"><b>Импорт билда…</b><span>Загружаем данные</span></div>'); setTimeout(function () { t.className = 'toast ok rich'; t.innerHTML = '<span class="t-dot"></span><div class="t-body"><b>Билд импортирован</b><span>Готово к применению</span></div>'; setTimeout(function () { killToast(t); }, 2200); }, 1500); });
  $('actionBtn') && $('actionBtn').addEventListener('click', function () { var t = makeToast('warn rich', '<span class="t-dot"></span><div class="t-body"><b>Билд удалён</b><span>Можно отменить</span></div><button class="t-act">Отмена</button>'); t.querySelector('.t-act').addEventListener('click', function () { killToast(t); }); setTimeout(function () { if (t.parentNode) killToast(t); }, 4000); });
  $('progressBtn') && $('progressBtn').addEventListener('click', function () { var t = makeToast('info', '<span class="t-dot"></span><div class="t-body"><b>Синхронизация</b><span>Обновляем стату</span></div><span class="t-prog"></span>'); var bar = t.querySelector('.t-prog'); gsap.fromTo(bar, { scaleX: 1 }, { scaleX: 0, duration: 3, ease: 'none', onComplete: function () { killToast(t); } }); });

  /* ============ 12 · КАРТОЧКИ ============ */
  function sweepCard(kit) { var c = kit.querySelector('.card-el'); if (!c || reduced()) return; var s = kit.dataset.surface; if (s === 'spotlight' || s === 'borderglow') gsap.fromTo(c, { '--mx': '0%' }, { '--mx': '100%', duration: .8, ease: 'power2.inOut' }); if (kit.hasAttribute('data-tilt')) gsap.fromTo(c, { rotationY: -10 }, { rotationY: 0, duration: .6, ease: 'power3.out', transformPerspective: 800, clearProps: 'transform' }); }
  document.querySelectorAll('.card-el').forEach(function (card) {
    var kit = card.closest('.kit');
    var rX = gsap.quickTo(card, 'rotationX', { duration: .4, ease: 'power3' }), rY = gsap.quickTo(card, 'rotationY', { duration: .4, ease: 'power3' });
    card.addEventListener('pointerenter', function () { if (kit.hasAttribute('data-tilt')) gsap.set(card, { transformPerspective: 800 }); });
    card.addEventListener('pointermove', function (e) { var r = card.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height; card.style.setProperty('--mx', px * 100 + '%'); card.style.setProperty('--my', py * 100 + '%'); if (kit.hasAttribute('data-tilt') && !reduced()) { rY((px - .5) * 12); rX(-(py - .5) * 12); } });
    card.addEventListener('pointerleave', function () { rX(0); rY(0); clearTimeout(card._ct); card._ct = setTimeout(function () { if (!card.matches(':hover')) gsap.set(card, { clearProps: 'transform' }); }, 450); });
  });

  /* ============ 13 · СПИСКИ / ЧИСЛА ============ */
  function countUp(el, target, dec, suf) { var o = { v: 0 }; gsap.to(o, { v: target, duration: reduced() ? .01 : 1.1, ease: 'power2.out', onUpdate: function () { el.textContent = fmt(o.v, dec) + (suf || ''); } }); }
  function fmt(v, dec) { var s = v.toFixed(dec); if (dec === 0) s = Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '); return s; }
  function scramble(el, target, dec, suf) { if (reduced()) { el.textContent = target.toFixed(dec) + (suf || ''); return; } var i = 0; var iv = setInterval(function () { if (++i >= 15) { clearInterval(iv); el.textContent = target.toFixed(dec) + (suf || ''); return; } el.textContent = (Math.random() * target * 1.7).toFixed(dec) + (suf || ''); }, 45); }
  function runCounts() { document.querySelectorAll('.li-wr[data-num]').forEach(function (el) { countUp(el, parseFloat(el.dataset.num), 1, '%'); }); var bn = $('bigNum'); if (bn) countUp(bn, parseFloat(bn.dataset.target), 1, ''); }
  var listEl = $('listEl');
  if (listEl) {
    var asc = false;
    $('staggerBtn').addEventListener('click', function () { if (!reduced()) gsap.from(listEl.querySelectorAll('.li-row'), { y: 16, autoAlpha: 0, stagger: .045, duration: .45, ease: 'power3.out' }); });
    $('countBtn').addEventListener('click', runCounts);
    $('scrambleBtn').addEventListener('click', function () { document.querySelectorAll('.li-wr[data-num]').forEach(function (el) { scramble(el, parseFloat(el.dataset.num), 1, '%'); }); var bn = $('bigNum'); if (bn) scramble(bn, parseFloat(bn.dataset.target), 1, ''); });
    $('flipBtn').addEventListener('click', function () { var rows = Array.prototype.slice.call(listEl.querySelectorAll('.li-row')), st = Flip.getState(rows); rows.sort(function (a, b) { return asc ? a.dataset.wr - b.dataset.wr : b.dataset.wr - a.dataset.wr; }); asc = !asc; rows.forEach(function (r, i) { listEl.appendChild(r); r.querySelector('.li-rank').textContent = i + 1; }); Flip.from(st, { duration: reduced() ? .01 : .55, ease: 'power3.inOut', absolute: true }); });
    runCounts();
  }

  /* ============ 15 · АВАТАРКИ ============ */
  /* ★ КРИСП-ЗУМ аватарок делает ЧИСТЫЙ CSS (см. «ФИКС-ЗУМ» в ui-kit.css):
     растр сразу в целевом размере (×1.18) + scale(.847) в покое → scale(1) на ховере.
     JS тут НЕ нужен: нет inline-transform от GSAP (грязный слой) и нет reflow (дёрганье).
     Раскладку держит .ava-cell фикс. габаритом → соседи не едут. */

  /* ============ 17 · ИКОНКИ (набор + draw-on) ============ */
  var STAT = [['ad', 'Атака (AD)'], ['ap', 'Сила умений (AP)'], ['hp', 'Здоровье (HP)'], ['armor', 'Броня'], ['mr', 'Сопр. магии (MR)'], ['as', 'Скор. атаки (AS)'], ['ms', 'Скор. движ. (MS)'], ['crit', 'Крит'], ['lethality', 'Пробитие физ'], ['magicpen', 'Пробитие маг'], ['penpct', 'Пробитие %']];
  var grid = $('iconsGrid');
  if (grid) grid.innerHTML = STAT.map(function (i) { return '<div class="ico-tile"><span class="ico-svg">' + ICON(i[0]) + '</span><span>' + i[1] + '</span></div>'; }).join('');
  function drawOnIcons() { var g = $('iconsGrid'); if (!g || reduced()) return; g.querySelectorAll('.ico-svg path, .ico-svg circle').forEach(function (p, idx) { var L = (p.getTotalLength && p.getTotalLength()) || 60; if (!p.getAttribute('stroke') && p.parentNode.getAttribute('stroke') === 'none') return; gsap.set(p, { strokeDasharray: L, strokeDashoffset: L }); gsap.to(p, { strokeDashoffset: 0, duration: .6, ease: 'power2.out', delay: idx * .03 }); }); }

  /* ============ 18 · МАГНИТНЫЙ РЕЛЬС ============ */
  var mrail = $('mrail');
  if (mrail) {
    var kitM = mrail.closest('.kit'), setters = [];
    mrail.querySelectorAll('.mr-ico').forEach(function (ic) { setters.push({ el: ic, x: gsap.quickTo(ic, 'x', { duration: .4, ease: 'power3' }), y: gsap.quickTo(ic, 'y', { duration: .4, ease: 'power3' }), s: gsap.quickTo(ic, 'scale', { duration: .4, ease: 'power3' }) }); });
    var ind = $('mrailInd'); ind && ind.addEventListener && 0;
    mrail.querySelectorAll('.mr-ico').forEach(function (ic) { ic.addEventListener('pointerenter', function () { if (ind && kitM.dataset.mag === 'indicator') gsap.to(ind, { y: ic.offsetTop - 10, duration: .3, ease: 'power3' }); }); });
    mrail.addEventListener('pointermove', function (e) {
      if (reduced()) return; var mode = kitM.dataset.mag;
      setters.forEach(function (o) { var r = o.el.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), dist = Math.hypot(dx, dy), R = 100; if (dist < R) { var f = 1 - dist / R; if (mode === 'dock') { o.s(1 + .45 * f); o.y(-8 * f); } else { o.x(dx * .4 * f); o.y(dy * .4 * f); o.s(1 + .2 * f); } } else { o.x(0); o.y(0); o.s(1); } });
    });
    mrail.addEventListener('pointerleave', function () { setters.forEach(function (o) { o.x(0); o.y(0); o.s(1); }); });
  }

  /* ============ 19 · VIEW-TRANSITION ============ */
  var vtTabs = $('vtTabs'), vtPane = $('vtPane'), vtKit = vtTabs && vtTabs.closest('.kit');
  if (vtTabs && vtPane) {
    var VIEWS = { stats: '<h4>Базовые статы</h4><div class="vt-row">Атака <b>62</b></div><div class="vt-row">Броня <b>34</b></div><div class="vt-row">Здоровье <b>1840</b></div>', wr: '<h4>WinRate</h4><div class="vt-row">Соло <b>52.4%</b></div><div class="vt-row">Дуо <b>54.1%</b></div><div class="vt-row">Флекс <b>50.8%</b></div>', tier: '<h4>Тир-лист</h4><div class="vt-row">Патч 7.0 <b>S</b></div><div class="vt-row">Движение <b>▲2</b></div><div class="vt-row">Пикрейт <b>14.1%</b></div>' };
    function setView(v) { var mode = vtKit.dataset.vt, swap = function () { vtPane.innerHTML = VIEWS[v]; }; if (mode === 'native' && document.startViewTransition && !reduced()) { document.startViewTransition(swap); return; } var from = mode === 'slide' ? { x: 30, autoAlpha: 0 } : mode === 'scale' ? { scale: .96, autoAlpha: 0 } : { autoAlpha: 0 }; gsap.to(vtPane, { autoAlpha: 0, duration: .12, onComplete: function () { swap(); gsap.fromTo(vtPane, from, { x: 0, scale: 1, autoAlpha: 1, duration: .28, ease: 'power2.out' }); } }); }
    setView('stats');
    vtTabs.querySelectorAll('.tab').forEach(function (t) { t.addEventListener('click', function () { setView(t.dataset.view); }); });
  }

  /* ============ 20 · OVERSCROLL ============ */
  var osPanel = $('osPanel');
  if (osPanel) {
    var osInner = osPanel.querySelector('.os-inner'), oy = 0, osT, kitOs = osPanel.closest('.kit');
    osPanel.addEventListener('wheel', function (e) { e.preventDefault(); var max = Math.max(0, osInner.scrollHeight - osPanel.clientHeight); oy -= e.deltaY; var target = oy, bounce = kitOs.dataset.os === 'bounce' ? .12 : .3; if (oy > 0) target = oy * bounce; else if (oy < -max) target = -max + (oy + max) * bounce; gsap.to(osInner, { y: target, duration: .25, ease: 'power2.out', overwrite: true }); clearTimeout(osT); osT = setTimeout(function () { oy = Math.min(0, Math.max(-max, oy)); gsap.to(osInner, { y: oy, duration: .4, ease: kitOs.dataset.os === 'bounce' ? 'elastic.out(1,.5)' : 'back.out(1.4)', overwrite: true }); }, 140); }, { passive: false });
  }

  /* ============ 21 · ПРОГРЕСС / СТЕППЕР ============ */
  var progBtn = $('progBtn');
  if (progBtn) {
    var steps = Array.prototype.slice.call(document.querySelectorAll('#stepper .step')), conns = Array.prototype.slice.call(document.querySelectorAll('#stepper .st-conn')), cur = 1, pf = $('progFill');
    gsap.set(pf, { width: '33%' });
    progBtn.addEventListener('click', function () {
      if (cur < steps.length - 1) { steps[cur].classList.remove('active'); steps[cur].classList.add('done'); steps[cur].querySelector('.st-dot').innerHTML = ICON('check'); conns[cur] && conns[cur].classList.add('fill'); cur++; steps[cur].classList.add('active'); gsap.to(pf, { width: (cur + 1) / steps.length * 100 + '%', duration: .5, ease: 'power2.out' }); }
      else { steps.forEach(function (s, i) { s.className = 'step' + (i === 0 ? ' active' : ''); s.querySelector('.st-dot').innerHTML = i === 0 ? '1' : (i + 1); }); conns.forEach(function (c) { c.classList.remove('fill'); }); cur = 0; gsap.to(pf, { width: '33%', duration: .4 }); }
    });
  }

  /* ============ 22 · KPI-ПЛИТКИ ============ */
  function runKpi() {
    document.querySelectorAll('.kpi').forEach(function (kp) {
      var v = kp.querySelector('.k-val'), t = parseFloat(v.dataset.kval), suf = v.dataset.suf, dec = suf === '%' ? 1 : 0; countUp(v, t, dec, suf);
      var sp = kp.querySelector('.k-spark'); if (sp && !sp._done) { var pts = sp.dataset.spark; sp.innerHTML = '<svg viewBox="0 0 72 24" preserveAspectRatio="none"><path d="M ' + pts.split(' ').join(' L ') + '"/></svg>'; var p = sp.querySelector('path'); if (p && !reduced()) { var L = p.getTotalLength(); gsap.set(p, { strokeDasharray: L, strokeDashoffset: L }); gsap.to(p, { strokeDashoffset: 0, duration: 1, ease: 'power2.out' }); } sp._done = 1; }
    });
  }

  /* ============ 23 · РЕЙТИНГ ============ */
  var rating = $('rating');
  function runRating() { if (!rating) return; var avg = parseFloat(rating.dataset.avg || rating.querySelector('.r-avg').dataset.avg); paintStars(Math.round(avg)); var av = rating.querySelector('.r-avg'); if (av) countUp(av, parseFloat(av.dataset.avg), 1, ''); }
  function paintStars(n) { rating.querySelectorAll('.star').forEach(function (s, i) { s.classList.toggle('on', i < n); if (i < n && !reduced()) gsap.fromTo(s, { scale: .6 }, { scale: 1, duration: .3, ease: 'back.out(3)', delay: i * .04 }); }); }
  if (rating) {
    var starsBox = rating.querySelector('.stars'); for (var s = 0; s < 5; s++) { var sp = document.createElement('span'); sp.className = 'star'; sp.innerHTML = ICON('star'); starsBox.appendChild(sp); }
    var stars = Array.prototype.slice.call(rating.querySelectorAll('.star')), set = 5;
    stars.forEach(function (st, i) { st.addEventListener('pointerenter', function () { stars.forEach(function (x, j) { x.classList.toggle('on', j <= i); }); }); st.addEventListener('click', function () { set = i + 1; }); });
    starsBox.addEventListener('pointerleave', function () { stars.forEach(function (x, j) { x.classList.toggle('on', j < set); }); });
    runRating(); set = Math.round(parseFloat(rating.querySelector('.r-avg').dataset.avg));
  }

  /* ============ 24 · COMMAND PALETTE ⌘K ============ */
  var overlay = $('cmdkOverlay'), cmdBox = $('cmdkBox'), cmdInput = $('cmdkInput'), cmdList = $('cmdkList');
  var CMD = [
    { s: 'Чемпионы', items: [['Ahri', 'champ'], ['Lee Sin', 'champ'], ['Jinx', 'champ'], ['Garen', 'champ']] },
    { s: 'Инструменты', items: [['Драфтер', 'search', '⌘D'], ['Калькулятор урона', 'ad', '⌘C'], ['Карта', 'ms'], ['Тир-лист', 'crit']] },
    { s: 'Действия', items: [['Сохранить билд', 'check', '⌘S'], ['Сравнить чемпионов', 'ap']] }
  ];
  function renderCmd(q) {
    q = (q || '').toLowerCase(); var html = '';
    CMD.forEach(function (g) { var rows = g.items.filter(function (it) { return it[0].toLowerCase().indexOf(q) > -1; }); if (!rows.length) return; html += '<div class="cmdk-sec">' + g.s + '</div>'; rows.forEach(function (it) { var ic = it[1] === 'champ' ? '<img data-portrait="' + it[0].replace(/\s/g, '') + '" alt="">' : '<span class="ci-ic">' + ICON(it[1]) + '</span>'; html += '<div class="cmdk-item"><span style="width:24px;height:24px;display:grid;place-items:center">' + ic + '</span>' + it[0] + (it[2] ? '<span class="ci-k">' + it[2] + '</span>' : '') + '</div>'; }); });
    cmdList.innerHTML = html || '<div class="cmdk-sec">Ничего не найдено</div>';
    cmdList.querySelectorAll('[data-portrait]').forEach(function (img) { img.src = DDI + img.getAttribute('data-portrait') + '.png'; });
    var first = cmdList.querySelector('.cmdk-item'); if (first) first.classList.add('sel');
    cmdList.querySelectorAll('.cmdk-item').forEach(function (it) { it.addEventListener('click', closeCmd); });
  }
  function openCmd() { overlay.classList.add('show'); renderCmd(''); cmdInput.value = ''; gsap.fromTo(overlay, { autoAlpha: 0 }, { autoAlpha: 1, duration: reduced() ? .01 : .2 }); gsap.fromTo(cmdBox, { scale: .96, y: -10, autoAlpha: 0 }, { scale: 1, y: 0, autoAlpha: 1, duration: reduced() ? .01 : .3, ease: 'back.out(1.5)' }); setTimeout(function () { cmdInput.focus(); }, 40); }
  function closeCmd() { gsap.to(overlay, { autoAlpha: 0, duration: .18, onComplete: function () { overlay.classList.remove('show'); overlay.style.opacity = ''; } }); }
  $('cmdkOpen') && $('cmdkOpen').addEventListener('click', openCmd);
  cmdInput && cmdInput.addEventListener('input', function () { renderCmd(this.value); });
  overlay && overlay.addEventListener('click', function (e) { if (e.target === overlay) closeCmd(); });
  document.addEventListener('keydown', function (e) { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); overlay.classList.contains('show') ? closeCmd() : openCmd(); } else if (e.key === 'Escape' && overlay.classList.contains('show')) closeCmd(); });

  /* ============ 25 · МАРКИЗ-ТИКЕР ============ */
  var marq = $('marqTrack');
  if (marq) {
    var TICK = [['Ahri', '52.4%', 'up'], ['Zed', '48.1%', 'dn'], ['Lux', '51.2%', 'up'], ['Garen', '49.0%', 'dn'], ['Jinx', '53.3%', 'up'], ['Thresh', '50.1%', 'up'], ['Teemo', '46.9%', 'dn'], ['Lee Sin', '50.8%', 'up']];
    var one = TICK.map(function (t) { return '<span class="marq-item"><b>' + t[0] + '</b> <span class="' + t[2] + '">' + (t[2] === 'up' ? '▲' : '▼') + ' ' + t[1] + '</span></span>'; }).join('');
    marq.innerHTML = one + one;
  }

  /* ============ Ваш выбор + копир ============ */
  var AX = { fx: 'эффект', size: 'размер', shape: 'фигура', tab: 'вид', sw: 'вид', drop: 'вид', search: 'вид', badge: 'вид', pos: 'позиц', model: 'модель', tstyle: 'стиль', list: 'строки', skel: 'вид', empty: 'вид', istyle: 'стиль', icolor: 'цвет', mag: 'вид', vt: 'переход', os: 'вид', prog: 'вид', kpi: 'вид', rating: 'вид', marquee: 'вид', ashape: 'форма', track: 'трек', surface: 'поверхн' };
  function choice() {
    var lines = ['Арт: ' + root.getAttribute('data-art') + ' · reduced-motion: ' + (reduced() ? 'вкл' : 'выкл')];
    document.querySelectorAll('.kit-card').forEach(function (card) { var kit = card.querySelector('.kit'); if (!kit) return; var keys = Object.keys(kit.dataset).filter(function (k) { return k !== 'kind'; }); if (!keys.length) return; var h3 = card.querySelector('h3').textContent.trim().replace(/\s*NEW\s*$/, ''); var parts = keys.map(function (k) { var v = kit.dataset[k]; return v === '' ? '+' + (AX[k] || k) : (AX[k] || k) + '=' + v; }); lines.push(h3 + ' → ' + parts.join(' · ')); });
    $('choiceText').textContent = lines.join('\n');
  }
  choice();
  $('stripCopy').addEventListener('click', function () { navigator.clipboard.writeText('/* lab-ui-kit v4 — выбор Эржана */\n' + $('choiceText').textContent).then(function () { var b = $('stripCopy'); b.textContent = '✅ Скопировано'; setTimeout(function () { b.textContent = '📋 Скопировать мой выбор'; }, 1400); }); });

  /* ============ CONFETTI ============ */
  function confetti(x, y) { if (reduced()) return; var cs = ['#ff5470', '#ffb454', '#4ade80', '#ffffff', '#fff']; for (var i = 0; i < 28; i++) { var p = document.createElement('div'); p.style.cssText = 'position:fixed;width:8px;height:8px;border-radius:2px;pointer-events:none;z-index:900;left:' + x + 'px;top:' + y + 'px;background:' + cs[i % cs.length]; document.body.appendChild(p); var a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 150; gsap.to(p, { x: Math.cos(a) * d, y: Math.sin(a) * d - 50 - Math.random() * 60, rotation: Math.random() * 360, autoAlpha: 0, duration: .8 + Math.random() * .5, ease: 'power2.out', onComplete: function () { this.targets()[0].remove(); } }); } }

  /* ============ дев-полоса ============ */
  var strip = $('labStrip');
  $('stripMin').addEventListener('click', function () { strip.classList.toggle('min'); $('stripMin').textContent = strip.classList.contains('min') ? 'Развернуть' : 'Свернуть'; });
  (function () { var head = $('stripHead'), dx = 0, dy = 0, on = false; head.addEventListener('pointerdown', function (e) { if (e.target.closest('button')) return; on = true; head.setPointerCapture(e.pointerId); var r = strip.getBoundingClientRect(); dx = e.clientX - r.left; dy = e.clientY - r.top; strip.style.right = 'auto'; }); head.addEventListener('pointermove', function (e) { if (!on) return; strip.style.left = (e.clientX - dx) + 'px'; strip.style.top = (e.clientY - dy) + 'px'; }); head.addEventListener('pointerup', function () { on = false; }); })();

  /* первичные прогоны чисел */
  runKpi();
})();
