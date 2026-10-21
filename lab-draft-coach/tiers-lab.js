/* ══════════════════════════════════════════════════════════════════════════
   lab-draft-coach · tiers-lab.js — ТИРЛИСТ КОМПЕТА.

   ЗАЧЕМ. Соло-статистика считает по соло-очереди: там решает, насколько чемп
   прощает ошибки и насколько его легко тащить одному. В компете работает
   другое — контроль, связки, объекты, дисциплина пятёрки. Поэтому соло-тир
   здесь СИД (с него начинают, он рядом как ориентир), а главный тир ставит
   человек.

   ПО ЛИНИЯМ. Тир у одного чемпа разный по ролям (Люкс: мид A, сапп B), поэтому
   доска показывает ОДНУ линию за раз, а файл хранит byRole: линия → {имя→{t,src}}.
   src:'soloCN' — авто-сид из китайского винрейта (база, движок всё ещё скидывает
   за малый пикрейт); src:'captain' — ТВОЁ решение (без скидки).

   КАК ЭТО ПОПАДАЕТ В СОВЕТ. Пишем draft-ai/knowledge/captain-tiers.json;
   knowledge.js вливает его в notes.tiersByRole при загрузке; coach.js:tierOf(KB,
   champ,state,lane) читает тир С УЧЁТОМ ЛИНИИ пика и ставит выше соло-статистики.
   Файл отдельный намеренно: import-captain перезаписывает champion-notes.json
   целиком, и тиры в нём сгорали бы.

   ЖИВОСТЬ: доска — постоянный блок, рисуется через labMorph. Перетащил
   одного — меняются единицы узлов, 142 фишки не пересоздаются.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var FILE = 'draft-ai/knowledge/captain-tiers.json';
  var DD = 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/';
  var TIERS = ['S+', 'S', 'A', 'B', 'C', 'D'];
  var TIER_WHY = {
    'S+': 'ломает драфт', S: 'забираем всегда', A: 'сильно', B: 'ровно', C: 'ситуативно', D: 'не берём',
  };
  var LANES = ['Top', 'Jungle', 'Mid', 'Adc', 'Support'];
  var LANE_RU = { Top: 'ТОП', Jungle: 'ЛЕС', Mid: 'МИД', Adc: 'ДРАКОН', Support: 'САПП' };

  var KB = null;
  var S = {
    byRole: {},          // линия → { EN-имя → {t, src} }. src: 'soloCN' (авто-сид) | 'captain' (твоё)
    rank: 'diamond_plus',
    q: '',
    lane: 'Top',         // тир per-role: доска всегда показывает ОДНУ линию
    sel: null,           // выбранный чемпион
    over: null,          // ряд, над которым тащат
    saving: 0,
    savedAt: null,
  };

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  function boot() {
    CaptaincyKnowledge.loadAsync('/').then(function (kb) {
      KB = kb;
      return fetch('/' + FILE).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    }).then(function (data) {
      // Читаем per-role: линия → { канон-имя → {t, src} }. Имя канонизируем через
      // nameOf (ловит ddragon-ключи), чтобы ключ совпал с тем, что ищет движок.
      if (data && data.byRole) {
        LANES.forEach(function (lane) {
          var m = data.byRole[lane]; if (!m) return;
          S.byRole[lane] = {};
          Object.keys(m).forEach(function (k) {
            var en = KB.idx.nameOf(k); if (!en) return;
            var e = m[k], t = (e && typeof e === 'object') ? e.t : e;
            if (TIERS.indexOf(t) !== -1) S.byRole[lane][en] = { t: t, src: (e && e.src) || 'captain' };
          });
        });
      }
      S.sel = KB.idx.names[0];
      $('trBoot').hidden = true;
      render();
      bindKeys();
    }).catch(function (e) {
      $('trBoot').innerHTML = 'Не загрузилось: <b>' + esc(e && e.message) + '</b>';
    });
  }

  function ruOf(en) { var c = KB.idx.champ(en); return (c && c.ru) || en; }
  function ddOf(en) { var c = KB.idx.champ(en); return c ? c.dd : null; }
  function solo(en) { return KB.idx.meta(en, S.rank); }

  /* Запись чемпа на ТЕКУЩЕЙ линии (или undefined). */
  function cur(en) { var m = S.byRole[S.lane]; return m && m[en]; }
  /* Сколько тиров ты подтвердил руками (src:captain) по всем линиям. */
  function captainCount() {
    var n = 0;
    LANES.forEach(function (l) { var m = S.byRole[l] || {}; Object.keys(m).forEach(function (en) { if (m[en].src === 'captain') n++; }); });
    return n;
  }

  /* Тир чемпа на ТЕКУЩЕЙ линии = ТОЛЬКО то, что ты поставил. Не поставил — чемп
     лежит в пуле «без тира». Соло за тебя НИКОГО не раскладывает: тирлист с нуля
     строишь ты. Соло-винрейт висит рядом на фишке как ориентир, но не раскладывает. */
  function tierOf(en) {
    var e = cur(en);
    return e ? e.t : null;
  }

  /* ЕДИНСТВЕННАЯ ДВЕРЬ К ЧИСЛАМ: винрейт показываем только пока источник
     свежий. Протух — движок вернёт null, и мы честно покажем прочерк. */
  function wrOf(en) {
    var m = solo(en);
    if (!m) return null;
    return KB.num('champStats', m.wr);
  }

  function setTier(en, tier) {
    if (!en) return;
    var m = S.byRole[S.lane] || (S.byRole[S.lane] = {});
    // Пусто = сбросить к соло-сиду (удаляем запись линии целиком).
    if (!tier) delete m[en]; else m[en] = { t: tier, src: 'captain' };   // руками = твоё решение
    S.sel = en;
    render();
    save();
  }

  /* ── ЗАПИСЬ ────────────────────────────────────────────────────────────── */
  var saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      // Собираем byRole: линия → { имя → {t, src} }. src сохраняем как есть
      // (soloCN у сида, captain у твоих правок) — движок по нему решает, давать
      // ли скидку за пикрейт (соло-сид = база, твой тир = жёсткое решение).
      var byRole = {}, total = 0;
      LANES.forEach(function (lane) {
        var m = S.byRole[lane]; if (!m) return;
        var o = {}, has = false;
        Object.keys(m).forEach(function (en) { o[en] = { t: m[en].t, src: m[en].src || 'captain' }; has = true; total++; });
        if (has) byRole[lane] = o;
      });
      var body = JSON.stringify({
        _: 'ТИРЛИСТ КОМПЕТА ПО ЛИНИЯМ. Пишет lab-draft-coach/tiers.html. knowledge.js вливает в ' +
           'notes.tiersByRole; coach.js:tierOf(KB,champ,state,lane) читает с учётом ЛИНИИ пика. ' +
           'src:"soloCN" — авто-сид из китайского винрейта (база, движок скидывает за малый пикрейт); ' +
           'src:"captain" — ТВОЁ компет-решение (без скидки). Файл отдельный, чтобы import-captain.mjs не затёр.',
        built: new Date().toISOString(),
        seedRank: S.rank,
        count: total,
        tiers: {},
        byRole: byRole,
      }, null, 1);
      S.saving = 1; renderTop();
      fetch('/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: FILE, content: body }),
      }).then(function (r) { return r.json(); }).then(function (j) {
        if (!j || !j.ok) throw new Error((j && j.error) || 'сервер отказал');
        S.saving = 0; S.savedAt = new Date(); renderTop();
      }).catch(function (e) {
        S.saving = 0; renderTop();
        toast('НЕ записалось: ' + (e && e.message), true);
      });
    }, 250);
  }

  var toastTimer = null;
  function toast(text, bad) {
    var t = $('trToast');
    t.textContent = text;
    t.className = 'cx-toast show' + (bad ? ' bad' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = 'cx-toast' + (bad ? ' bad' : ''); }, 2600);
  }

  /* ── РЕНДЕР ────────────────────────────────────────────────────────────── */
  function face(en) {
    var dd = ddOf(en);
    return '<span class="cx-face">' + esc(ruOf(en).slice(0, 1))
      + (dd ? '<img src="' + DD + esc(dd) + '.png" alt="" loading="lazy" onerror="this.remove()">' : '') + '</span>';
  }

  function render() { renderTop(); renderBoard(); renderIns(); }

  function renderTop() {
    var mine = captainCount();
    var state = S.saving ? '<span class="cx-chip">пишу…</span>'
      : S.savedAt ? '<span class="cx-chip cx-chip--good">записано ' + S.savedAt.toTimeString().slice(0, 5) + '</span>'
      : '<span class="cx-chip">ещё не писал</span>';
    var fresh = KB.freshness.sources.champStats;
    labMorph($('trTop'),
      '<div class="cx-mark"><b>Тирлист компета</b> <span>· по линии ' + esc(LANE_RU[S.lane] || S.lane) + ' · солока — сид, тир ставишь ты</span></div>' +
      '<input class="cx-field" id="trQ" placeholder="поиск   (/)" value="' + esc(S.q) + '">' +
      '<div class="cx-seg">' + LANES.map(function (l) {
        return '<button class="cx-btn' + (S.lane === l ? ' on' : '') + '" data-lane="' + l + '">'
          + LANE_RU[l] + '</button>';
      }).join('') + '</div>' +
      '<div class="cx-sp"></div>' +
      '<span class="cx-chip">моих тиров <b>' + mine + '</b> / ' + KB.idx.names.length + '</span>' +
      '<span class="cx-chip">соло от ' + esc(fresh.date || '—') + '</span>' +
      state +
      '<a class="cx-btn" href="teams.html">Составы →</a>' +
      '<a class="cx-btn" href="coach.html">К драфту →</a>');
    var inp = $('trQ');
    if (inp && document.activeElement !== inp && inp.value !== S.q) inp.value = S.q;
  }

  /* Показываем ВСЕХ чемпов на любой линии: роли в данных кривые (кто-то на двух,
     кто-то ни на одной) — кого куда ставить решаешь ты, а не фильтр. */
  function matches(en) {
    var c = KB.idx.champ(en);
    var q = S.q.trim().toLowerCase();
    if (!q) return true;
    return (en + ' ' + (c.ru || '') + ' ' + (c.dd || '')).toLowerCase().indexOf(q) !== -1;
  }

  function chip(en) {
    var wr = wrOf(en);
    var e = cur(en), mine = e && e.src === 'captain';
    var cls = 'tr-chip' + (mine ? ' mine' : '') + (S.sel === en ? ' sel' : '');
    var tip = mine ? ' · тир твой' : (e ? ' · сид из китайской солоки' : ' · тир из соло-статистики');
    return '<button class="' + cls + '" draggable="true" data-key="c' + en + '" data-champ="' + esc(en) + '"'
      + ' title="' + esc(ruOf(en)) + tip + '">'
      + face(en) + '<span>' + esc(ruOf(en)) + '</span>'
      + '<span class="wr' + (wr == null ? '' : (wr >= 50 ? ' up' : ' dn')) + '">'
      + (wr == null ? '—' : wr + '%') + '</span></button>';
  }

  function renderBoard() {
    var rows = TIERS.map(function (t) {
      var list = KB.idx.names.filter(function (en) { return tierOf(en) === t && matches(en); });
      return '<div class="tr-row' + (S.over === t ? ' over' : '') + '" data-key="r' + t + '" data-tier="' + esc(t) + '">' +
        '<div class="tr-lab" data-tier="' + esc(t) + '" data-set="' + esc(t) + '">' + esc(t) +
          '<small>' + esc(TIER_WHY[t]) + '</small><small>' + list.length + '</small></div>' +
        '<div class="tr-chips">' +
          (list.length ? list.map(chip).join('') : '<span class="tr-empty">пусто</span>') +
        '</div>' +
      '</div>';
    }).join('');
    var noTier = KB.idx.names.filter(function (en) { return tierOf(en) === null && matches(en); });
    labMorph($('trBoard'),
      '<div class="cx-h">доска · тащи фишку в ряд, или выбери и жми 1-6' +
        '<div class="cx-sp"></div><span class="cx-chip">обведённые — твои</span></div>' +
      '<div class="cx-scroll"><div class="tr-board">' + rows +
        (noTier.length ? '<div class="tr-row" data-key="rnone" data-tier="">' +
          '<div class="tr-lab"><small>без тира</small><small>' + noTier.length + '</small></div>' +
          '<div class="tr-chips">' + noTier.map(chip).join('') + '</div></div>' : '') +
      '</div></div>');
  }

  function renderIns() {
    var en = S.sel;
    if (!en) { labMorph($('trIns'), '<div class="cx-h">чемпион</div><div class="ch-note">выбери фишку</div>'); return; }
    var m = solo(en), wr = wrOf(en);
    var e = cur(en), mine = e ? e.t : null;        // тир на ТЕКУЩЕЙ линии
    var isCap = e && e.src === 'captain';
    var c = KB.idx.champ(en);
    var sets = TIERS.map(function (t) {
      return '<button class="cx-btn' + (mine === t ? ' on' : '') + '" data-set="' + esc(t) + '">' + esc(t) + '</button>';
    }).join('');
    labMorph($('trIns'),
      '<div class="cx-h">чемпион · ' + esc(LANE_RU[S.lane] || S.lane) + '<div class="cx-sp"></div>' +
        (isCap ? '<span class="cx-chip cx-chip--good">тир твой</span>'
               : e ? '<span class="cx-chip">сид из солоки</span>'
                   : '<span class="cx-chip">тир из соло</span>') + '</div>' +
      '<div class="tr-ins">' +
        '<div class="who">' + face(en) + '<b>' + esc(ruOf(en)) + '</b></div>' +
        '<div class="solo">' +
          '<span class="cx-chip">линии: ' + esc((c.lanes || []).map(function (l) { return LANE_RU[l]; }).join(' · ') || '—') + '</span>' +
          '<span class="cx-chip">соло-тир ' + esc((m && m.tier) || '—') + '</span>' +
          '<span class="cx-chip">WR ' + (wr == null ? '— (источник протух)' : wr + '%') + '</span>' +
          '<span class="cx-chip">пикрейт ' + (m && m.pr != null ? m.pr + '%' : '—') + '</span>' +
          '<span class="cx-chip">бан-рейт ' + (m && m.br != null ? m.br + '%' : '—') + '</span>' +
        '</div>' +
        '<div class="ch-note">Соло-винрейт считает соло-очередь: там решает, насколько чемп прощает ошибки. ' +
          'В компете решают контроль, связки и объекты — поэтому тир ставишь ты.</div>' +
        '<div class="cx-h">твой компет-тир</div>' +
        '<div class="tr-set">' + sets +
          '<button class="cx-btn" data-set="">сбросить к соло</button>' +
        '</div>' +
        '<div class="rt-keys">' +
          '<div><kbd>1</kbd>…<kbd>6</kbd><span>S+ · S · A · B · C · D</span></div>' +
          '<div><kbd>0</kbd><span>сбросить к соло</span></div>' +
          '<div><kbd>/</kbd><span>поиск</span></div>' +
        '</div>' +
        '<div class="cx-sub">Пишет <code>' + FILE + '</code> по линиям — движок читает как notes.tiersByRole.</div>' +
        '<button class="cx-btn cx-btn--wide" data-act="nodes">Счётчик узлов</button>' +
      '</div>');
  }

  /* ── СОБЫТИЯ ───────────────────────────────────────────────────────────── */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-champ],[data-set],[data-lane],[data-act]');
    if (!el) return;
    if (el.hasAttribute('data-lane')) { S.lane = el.dataset.lane; render(); return; }
    if (el.hasAttribute('data-set')) { setTier(S.sel, el.dataset.set); return; }
    if (el.dataset.champ) { S.sel = el.dataset.champ; renderBoard(); renderIns(); return; }
    if (el.dataset.act === 'nodes') nodes();
  });

  document.addEventListener('input', function (e) {
    if (e.target.id === 'trQ') { S.q = e.target.value; renderBoard(); }
  });

  /* ── ПЕРЕТАСКИВАНИЕ ────────────────────────────────────────────────────── */
  var dragging = null;
  document.addEventListener('dragstart', function (e) {
    var chipEl = e.target.closest('[data-champ]');
    if (!chipEl) return;
    dragging = chipEl.dataset.champ;
    S.sel = dragging;
    try { e.dataTransfer.setData('text/plain', dragging); e.dataTransfer.effectAllowed = 'move'; } catch (_) {}
  });
  document.addEventListener('dragover', function (e) {
    var row = e.target.closest('.tr-row');
    if (!row || !dragging) return;
    e.preventDefault();
    if (S.over !== row.dataset.tier) { S.over = row.dataset.tier; renderBoard(); }
  });
  document.addEventListener('drop', function (e) {
    var row = e.target.closest('.tr-row');
    if (!row || !dragging) return;
    e.preventDefault();
    var en = dragging; dragging = null; S.over = null;
    setTier(en, row.dataset.tier || '');
  });
  document.addEventListener('dragend', function () {
    dragging = null;
    if (S.over !== null) { S.over = null; renderBoard(); }
  });

  function bindKeys() {
    document.addEventListener('keydown', function (e) {
      var inField = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName || '');
      if (inField) { if (e.key === 'Escape') e.target.blur(); return; }
      if (e.key === '/') { e.preventDefault(); var i = $('trQ'); if (i) i.focus(); return; }
      if (e.key >= '1' && e.key <= '6') { e.preventDefault(); setTier(S.sel, TIERS[+e.key - 1]); return; }
      if (e.key === '0' || e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); setTier(S.sel, ''); }
    });
  }

  /* ПРИЁМКА ЧИСЛОМ: смена тира одному чемпиону не должна пересобирать доску. */
  function nodes() {
    var en = S.sel;
    var now = tierOf(en);
    var to = TIERS[(TIERS.indexOf(now) + 1) % TIERS.length];
    var before = labNodeMark(document.body);
    setTier(en, to);
    toast(ruOf(en) + ' → ' + to + '. Узлов выжило ' + labNodeCount() + ' (помечено ' + before + ')');
  }

  boot();
})();
