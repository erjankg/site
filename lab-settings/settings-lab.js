/* ════════════════════════════════════════════════════════════════
   lab-settings — ⚙ ГЛОБАЛЬНЫЕ ЮЗЕР-НАСТРОЙКИ (хаб посетителя)

   ★★ НЕ ТАЩИТЬ ДЁРГАНЬЕ (закон CLAUDE.md, соблюдён здесь построчно):
   1. Появление ТОЛЬКО у ⚙-попапа — он единственный реально появляется.
      Рельс, шапка, таблица, KPI живут всегда → анимации появления НЕТ.
   2. Вечных (infinite) анимаций нет ни одной.
   3. Скрытый триггер display:none → обратно не перезапускает анимацию:
      вкладки прячутся/показываются БЕЗ классов появления.
   4. Принудительного перезапуска (void offsetWidth) нет нигде.
   5. Перерисовки всего ради одного НЕТ:
      · смена настройки = root.style.setProperty (0 узлов вообще);
      · разметка попапа обновляется через labMorph (diff), а не innerHTML;
      · вкладки строятся ЛЕНИВО и КЭШИРУЮТСЯ в DOM — возврат = показ.
   Приёмка — счётчиком узлов в дев-полосе, не «на глаз».

   ЧТО ГДЕ ХРАНИТСЯ: сами настройки → ../wr-prefs.js (localStorage; в боевом
   + Firestore per-user). Выбор ВАРИАНТА вида хаба → LabSettings (только лаб,
   на боевой не едет).
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var P = window.WRPrefs;
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };

  /* ── линейные иконки (эмодзи как иконки интерфейса ЗАПРЕЩЕНЫ) ── */
  function ico(d) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  }
  var ICONS = {
    gear: ico('<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/>'),
    close: ico('<path d="M6 6l12 12M18 6 6 18"/>'),
    art: ico('<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5"/>'),
    accent: ico('<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16 4 4 0 0 0 0-8 4 4 0 0 1 0-8Z"/>'),
    dens: ico('<path d="M4 6h16M4 12h16M4 18h16"/>'),
    stats: ico('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    winrate: ico('<path d="M3 17l5-6 4 3 5-8"/><path d="M17 6h4v4"/>'),
    tier: ico('<path d="m12 3 2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-2.9L6.7 19.6l1.1-6L3.4 9.4l6-.8L12 3Z"/>'),
    map: ico('<path d="m9 4 6 3 6-3v13l-6 3-6-3-6 3V7l6-3Z"/><path d="M9 4v13M15 7v13"/>'),
    tools: ico('<path d="M14.5 4.5a4 4 0 0 0 5 5L21 8l-5 5-5 5-2.5-2.5 5-5 5-5-1.5-1Z"/><path d="m6 14-2 2 4 4 2-2"/>')
  };

  /* ── ДЕМО-ДАННЫЕ (не боевые: в порт подключается реальный wr-stats.json) ── */
  var IC = 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/';
  var CHAMPS = [
    { k: 'Garen', n: 'Гарен', r: 'Верх', wr: 53.4, pick: 12.1, t: 's', d: 1.4 },
    { k: 'Jax', n: 'Джакс', r: 'Верх', wr: 52.1, pick: 9.4, t: 's', d: 0.6 },
    { k: 'LeeSin', n: 'Ли Син', r: 'Лес', wr: 51.7, pick: 14.8, t: 'a', d: -0.3 },
    { k: 'Ahri', n: 'Ари', r: 'Центр', wr: 51.2, pick: 11.2, t: 'a', d: 0.9 },
    { k: 'Katarina', n: 'Катарина', r: 'Центр', wr: 50.4, pick: 8.7, t: 'a', d: -1.1 },
    { k: 'Jinx', n: 'Джинкс', r: 'Стрелок', wr: 49.8, pick: 13.5, t: 'b', d: 0.2 },
    { k: 'Ashe', n: 'Эш', r: 'Стрелок', wr: 49.1, pick: 7.9, t: 'b', d: -0.7 },
    { k: 'Ekko', n: 'Экко', r: 'Лес', wr: 48.6, pick: 6.3, t: 'b', d: 1.8 }
  ];
  var RAIL = [
    { v: 'stats', t: 'Статс', i: 'stats' }, { v: 'winrate', t: 'WinRate', i: 'winrate' },
    { v: 'tier', t: 'Тир-лист', i: 'tier' }, { v: 'map', t: 'Карта', i: 'map' },
    { v: 'tools', t: 'Инструменты', i: 'tools' }
  ];

  var S = { view: 'list' };             /* состояние ЛАБА (не юзера) */
  var panes = {};                        /* кэш вкладок: построенное живёт дальше */
  var tab = 'stats';
  var popBuilt = false, popOpen = false;

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fmtD(d) { return (d > 0 ? '+' : '') + d.toFixed(1); }

  /* ════════════════════════════════════════════════════════════
     ДЕМО-САЙТ. Строится ОДИН раз, вкладки — лениво и с кэшем.
     ════════════════════════════════════════════════════════════ */
  function rowsHTML() {
    return CHAMPS.map(function (c) {
      return '<tr><td><div class="who"><img src="' + IC + c.k + '.png" alt="" loading="lazy">' +
        '<div>' + esc(c.n) + '<br><em>' + esc(c.r) + '</em></div></div></td>' +
        '<td><span class="tier ' + c.t + '">' + c.t.toUpperCase() + '</span></td>' +
        '<td class="num wr">' + c.wr.toFixed(1) + '%</td>' +
        '<td class="num">' + c.pick.toFixed(1) + '%</td>' +
        '<td class="num ' + (c.d >= 0 ? 'up' : 'dn') + '">' + fmtD(c.d) + '</td></tr>';
    }).join('');
  }

  function paneHTML(v) {
    if (v === 'stats') {
      return '<div class="kpis">' +
        '<div class="kpi glass"><span>Патч</span><b>7.2b</b><i>обновлено сегодня</i></div>' +
        '<div class="kpi glass"><span>Чемпионов</span><b>142</b><i>в базе</i></div>' +
        '<div class="kpi glass"><span>Матчей учтено</span><b>1.2M</b><i>Алмаз+</i></div>' +
        '</div>' +
        '<section class="panel glass"><div class="panel-h">Топ чемпионов<em>ДЕМО-ЦИФРЫ</em></div>' +
        '<table class="tbl"><thead><tr><th>Чемпион</th><th>Тир</th><th class="num">WR</th>' +
        '<th class="num">Пик</th><th class="num">Δ</th></tr></thead><tbody>' + rowsHTML() +
        '</tbody></table><p class="demo-note">ДЕМО: цифры выдуманы. В боевом — data-pipeline/wr-stats.json.</p></section>';
    }
    if (v === 'winrate') {
      var srt = CHAMPS.slice().sort(function (a, b) { return b.wr - a.wr; });
      return '<section class="panel glass"><div class="panel-h">Винрейт<em>ДЕМО-ЦИФРЫ</em></div>' +
        '<table class="tbl"><thead><tr><th>Чемпион</th><th>Винрейт</th><th class="num">Δ за патч</th></tr></thead><tbody>' +
        srt.map(function (c) {
          return '<tr><td><div class="who"><img src="' + IC + c.k + '.png" alt="" loading="lazy">' +
            esc(c.n) + '</div></td>' +
            '<td><div class="wbar"><i style="--w:' + Math.round((c.wr - 45) * 12) + '%"></i>' +
            '<b>' + c.wr.toFixed(1) + '%</b></div></td>' +
            '<td class="num ' + (c.d >= 0 ? 'up' : 'dn') + '">' + fmtD(c.d) + '</td></tr>';
        }).join('') +
        '</tbody></table><p class="demo-note">ДЕМО: полоса и Δ выдуманы.</p></section>';
    }
    if (v === 'map' || v === 'tools') {
      return '<section class="panel glass"><div class="panel-h">' +
        (v === 'map' ? 'Карта' : 'Инструменты') + '<em>ЗАГЛУШКА ЛАБА</em></div>' +
        '<p class="set-note">Раздел живёт в своём лабе (lab-map / драфтер, калькулятор). ' +
        'Здесь он нужен только чтобы видеть: настройки ⚙ применяются и к нему тоже.</p></section>';
    }
    var byT = { s: [], a: [], b: [] };
    CHAMPS.forEach(function (c) { byT[c.t].push(c); });
    return '<section class="panel glass"><div class="panel-h">Тир-лист<em>ДЕМО-ЦИФРЫ</em></div>' +
      ['s', 'a', 'b'].map(function (t) {
        return '<div class="tier-row"><span class="tier ' + t + '">' + t.toUpperCase() + '</span>' +
          '<div class="pack">' + byT[t].map(function (c) {
            return '<img src="' + IC + c.k + '.png" alt="' + esc(c.n) + '" title="' + esc(c.n) + '" loading="lazy">';
          }).join('') + '</div></div>';
      }).join('') +
      '<p class="demo-note">ДЕМО: распределение выдумано.</p></section>';
  }

  /* показ вкладки = скрыть/показать. Первый показ строит, дальше только display. */
  function showTab(v) {
    if (tab === v && panes[v]) return;
    tab = v;
    var stage = $('#stage');
    if (!panes[v]) {
      /* display:contents — обёртка не создаёт своей коробки: панели остаются
         прямыми детьми .shell (её max-width и зазоры работают как надо) */
      var d = document.createElement('div');
      d.style.display = 'contents';
      d.innerHTML = paneHTML(v);
      stage.appendChild(d);
      panes[v] = d;
    }
    Object.keys(panes).forEach(function (k) { panes[k].style.display = k === v ? 'contents' : 'none'; });
    document.querySelectorAll('#tabs button').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-tab') === v);
    });
    document.querySelectorAll('.rail-btn').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-tab') === v);
    });
  }

  /* ════════════════════════════════════════════════════════════
     ⚙ ХАБ НАСТРОЕК. Разметка обновляется через labMorph:
     смена настройки трогает атрибут class у 1-2 кнопок, не узлы.
     ════════════════════════════════════════════════════════════ */
  function popHTML() {
    var st = P.get();
    var arts = P.ARTS.map(function (a) {
      return '<button type="button" class="art' + (st.splash === a.v ? ' on' : '') + '" data-key="art-' + a.v +
        '" data-set="splash" data-v="' + a.v + '" title="' + esc(a.t + ' · ' + a.tone) + '" ' +
        'aria-pressed="' + (st.splash === a.v) + '" style="--art:url(' + P.thumbURL(a.v) + ')">' +
        '<span>' + esc(a.t) + '</span></button>';
    }).join('');

    var accs = P.ACCENTS.map(function (a) {
      return '<button type="button" class="opt' + (st.accent === a.v ? ' on' : '') + '" data-key="acc-' + a.v +
        '" data-set="accent" data-v="' + a.v + '" aria-pressed="' + (st.accent === a.v) + '" ' +
        'style="--sw:' + a.c + '"><i class="dot"></i>' + esc(a.t) + '</button>';
    }).join('');

    var dens = P.DENSITY.map(function (d) {
      return '<button type="button" class="opt' + (st.density === d.v ? ' on' : '') + '" data-key="den-' + d.v +
        '" data-set="density" data-v="' + d.v + '" aria-pressed="' + (st.density === d.v) + '">' +
        esc(d.t) + '</button>';
    }).join('');

    return '<div class="set-hd" data-key="hd"><b>Настройки</b><span>вид сайта</span>' +
      '<button type="button" class="set-x" id="setClose" title="Закрыть">' + ICONS.close + '</button></div>' +
      '<div class="set-body" data-key="body">' +
      '<section class="set-sec" data-key="sec-art"><h4>' + ICONS.art + 'Фон-арт</h4>' +
      '<p class="set-note">Один арт за ВСЕМ стеклом сайта.</p>' +
      '<div class="arts">' + arts + '</div></section>' +

      '<section class="set-sec" data-key="sec-acc"><h4>' + ICONS.accent + 'Акцент</h4>' +
      '<p class="set-note">Красит только ДАННЫЕ (винрейт, числа, ↑↓). Кнопки и рамки остаются белыми.</p>' +
      '<div class="opts">' + accs + '</div></section>' +

      '<section class="set-sec" data-key="sec-den"><h4>' + ICONS.dens + 'Плотность</h4>' +
      '<p class="set-note">Сколько воздуха между строками и блоками.</p>' +
      '<div class="dens-seg">' + dens + '</div>' +
      '<div class="dens-prev" aria-hidden="true"><i></i><i></i><i></i></div></section>' +
      '</div>' +

      '<div class="set-ft" data-key="ft"><span>Сохраняется в этом браузере (localStorage). ' +
      'В боевом — ещё и в профиле Firestore, чтобы вид совпадал на всех устройствах.</span>' +
      '<button type="button" id="setReset">Сбросить</button></div>';
  }

  function renderPop() {
    var card = $('#setCard');
    card.setAttribute('data-view', S.view);
    window.labMorph(card, popHTML());
  }

  function placePop() {
    var g = $('#gearBtn').getBoundingClientRect();
    root.style.setProperty('--pop-top', Math.round(g.bottom + 10) + 'px');
    root.style.setProperty('--pop-right', Math.max(8, Math.round(window.innerWidth - g.right)) + 'px');
  }

  function openPop(on) {
    if (on && !popBuilt) { renderPop(); popBuilt = true; }   /* лениво: до первого клика попапа нет */
    popOpen = on;
    if (on) placePop();
    $('#setPop').classList.toggle('open', on);
    $('#gearBtn').setAttribute('aria-expanded', String(on));
  }

  var _tt;
  function toast(msg) {
    var el = $('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = msg;
    requestAnimationFrame(function () { el.classList.add('show'); });
    clearTimeout(_tt); _tt = setTimeout(function () { el.classList.remove('show'); }, 1900);
  }

  /* ════════════════════════════════════════════════════════════
     ПРИЁМКА: счётчик пересозданных узлов.
     Помечаем всё дерево → крутим ВСЕ 3 настройки + переключаем вкладку →
     считаем, сколько помеченных узлов выжило. Здоровье = 100%.
     ════════════════════════════════════════════════════════════ */
  function audit() {
    if (!popBuilt) { renderPop(); popBuilt = true; }
    window.labNodeMark(document.body);
    var st = P.get(), backTab = tab;

    P.set('accent', st.accent === 'gold' ? 'cyan' : 'gold');
    P.set('density', st.density === 'roomy' ? 'compact' : 'roomy');
    P.set('splash', st.splash === 'Thresh' ? 'Lux' : 'Thresh');
    showTab(tab === 'winrate' ? 'tier' : 'winrate');
    showTab(backTab);
    P.set('accent', st.accent); P.set('density', st.density); P.set('splash', st.splash);

    var res = window.labNodeCount();                    /* «выжило/помечено» */
    var parts = res.split('/'), lost = parts[1] - parts[0];
    var msg = 'Узлы: выжило ' + res + ' · пересоздано ' + lost;
    $('#nodeCount').textContent = msg;
    toast(msg + (lost === 0 ? ' → 0 дёрганья' : ' → чинить!'));
  }

  /* ════════════════════════════════════════════════════════════
     СТАРТ
     ════════════════════════════════════════════════════════════ */
  function init() {
    /* рельс — постоянный блок, строится один раз */
    var rail = $('#rail');
    rail.innerHTML = RAIL.map(function (r) {
      return '<button type="button" class="rail-btn" data-tab="' + r.v + '">' + ICONS[r.i] +
        '<span>' + r.t + '</span></button>';
    }).join('') + '<div class="rail-note">Настройка = одна переменная на :root.<br>Сайт обновляется без пересборки.</div>';
    rail.onclick = function (e) {
      var b = e.target.closest('[data-tab]'); if (b) showTab(b.getAttribute('data-tab'));
    };
    $('#tabs').onclick = function (e) {
      var b = e.target.closest('[data-tab]'); if (b) showTab(b.getAttribute('data-tab'));
    };

    /* ⚙ */
    $('#gearBtn').innerHTML = ICONS.gear;
    $('#gearBtn').onclick = function (e) { e.stopPropagation(); openPop(!popOpen); };
    $('#setPop').addEventListener('click', function (e) {
      if (e.target === this) { openPop(false); return; }
      var b = e.target.closest('[data-set]');
      if (b) {
        if (P.set(b.getAttribute('data-set'), b.getAttribute('data-v'))) renderPop();
        return;
      }
      if (e.target.closest('#setClose')) { openPop(false); return; }
      if (e.target.closest('#setReset')) { P.reset(); renderPop(); toast('Настройки сброшены'); }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && popOpen) openPop(false); });
    window.addEventListener('resize', function () { if (popOpen) placePop(); });

    /* дев-полоса */
    $('#stripInfo').textContent = '3 настройки · арт/акцент/плотность';
    var seg = $('#viewSeg');
    function paintView() {
      seg.querySelectorAll('[data-view]').forEach(function (b) {
        b.classList.toggle('on', b.getAttribute('data-view') === S.view);
      });
      if (popBuilt) $('#setCard').setAttribute('data-view', S.view);
    }
    seg.onclick = function (e) {
      var b = e.target.closest('[data-view]'); if (!b) return;
      S.view = b.getAttribute('data-view');
      paintView();
      if (!popOpen) openPop(true);
    };
    paintView();

    $('#btnAudit').onclick = audit;
    $('#btnOpen').onclick = function () { openPop(!popOpen); };
    $('#btnResetPrefs').onclick = function () { P.reset(); if (popBuilt) renderPop(); toast('Настройки юзера сброшены'); };

    var strip = $('#labStrip');
    $('#stripMin').onclick = function () {
      strip.classList.toggle('min');
      this.textContent = strip.classList.contains('min') ? 'Развернуть' : 'Свернуть';
    };
    var head = $('#stripHead'), drag = null;
    head.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return;
      var r = strip.getBoundingClientRect();
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      strip.classList.add('dragged');
      strip.style.left = r.left + 'px'; strip.style.top = r.top + 'px'; strip.style.right = 'auto';
      head.setPointerCapture(e.pointerId);
    });
    head.addEventListener('pointermove', function (e) {
      if (!drag) return;
      strip.style.left = Math.max(0, e.clientX - drag.dx) + 'px';
      strip.style.top = Math.max(0, e.clientY - drag.dy) + 'px';
    });
    head.addEventListener('pointerup', function () { drag = null; });

    function syncStripH() {
      var h = Math.round(strip.getBoundingClientRect().bottom) + 16;
      root.style.setProperty('--strip-h', (strip.classList.contains('dragged') ? 110 : h) + 'px');
      if (popOpen) placePop();
    }
    if (window.ResizeObserver) new ResizeObserver(syncStripH).observe(strip);
    syncStripH();
    window.addEventListener('resize', syncStripH);

    showTab('stats');

    /* Firestore-заглушка: в боевом сюда встанет запись в users/<uid>.prefs */
    P.setRemote({ save: function () { /* боевой: db.doc('users/'+uid).set({prefs:st},{merge:true}) */ } });

    /* память ЛАБА — только выбор варианта вида хаба (на боевой не едет) */
    if (window.LabSettings) {
      window.__LS = window.LabSettings.attach({
        id: 'settings', schema: 1, mount: '#labTools',
        getState: function () { return S; },
        apply: function (st) { S.view = st.view || 'list'; paintView(); }
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
