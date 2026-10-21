/* ══════════════════════════════════════════════════════════════════════════
   lab-draft-coach · teams-lab.js — СОСТАВЫ И ПУЛЫ.

   ЗАЧЕМ. Советник, который не знает, КТО играет, советует абстракции: «возьми
   Орна» — а Орна в команде не играет никто. Пул игрока превращает совет в ход,
   который реально можно сделать. Это основная механика кэпа, а не настройка.

   ЧТО ЗДЕСЬ. Две команды по 5 игроков: имя + роль + пул чемпионов (тык по
   сетке). Пресетов несколько — у каждого соперника свой ростер, и между
   матчами их переключают, а не набивают заново.

   КУДА ПИШЕТ: draft-ai/teams.json через POST /save (tools/serve.mjs).
   Читает его coach.html и кладёт в state.pools — дальше движок сам режет
   кандидатов (draft-ai/engine/advise.js, poolOf).

   ЖИВОСТЬ: всё через labMorph. Тык по чемпиону меняет одну ячейку, сетка из
   142 чемпионов не пересоздаётся.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var FILE = 'draft-ai/teams.json';
  var DD = 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/';
  var LANES = ['Top', 'Jungle', 'Mid', 'Adc', 'Support'];
  var LANE_RU = { Top: 'ТОП', Jungle: 'ЛЕС', Mid: 'МИД', Adc: 'ДРАКОН', Support: 'САПП' };
  var RANK = 'diamond_plus';

  var KB = null;
  var S = {
    data: null,        // весь файл: { active, presets: [] }
    at: 0,             // индекс активного пресета
    side: 'blue',      // чей игрок сейчас правится
    row: 0,            // какой игрок
    q: '',
    lane: '',
    saving: 0,
    savedAt: null,
  };

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  /* ── ЗАГОТОВКА ПРЕСЕТА ─────────────────────────────────────────────────
     Пять строк заводим сразу: роль у каждой своя. Пустая строка — это не
     «ошибка заполнения», а честное «за эту роль пул ещё не собран». */
  function blankTeam(name) {
    return { name: name, players: LANES.map(function (l) { return { name: '', role: l, champs: [] }; }) };
  }
  function blankPreset(name) {
    return {
      id: 'p' + Date.now().toString(36),
      name: name || 'Новый состав',
      updated: new Date().toISOString().slice(0, 10),
      teams: { blue: blankTeam('Синие'), red: blankTeam('Красные') },
    };
  }

  function boot() {
    CaptaincyKnowledge.loadAsync('/').then(function (kb) {
      KB = kb;
      return fetch('/' + FILE).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    }).then(function (data) {
      S.data = (data && data.presets && data.presets.length) ? data : { active: null, presets: [blankPreset('Состав 1')] };
      var i = S.data.presets.findIndex(function (p) { return p.id === S.data.active; });
      S.at = i === -1 ? 0 : i;
      $('tmBoot').hidden = true;
      render();
      bindKeys();
    }).catch(function (e) {
      $('tmBoot').innerHTML = 'Не загрузилось: <b>' + esc(e && e.message) + '</b>';
    });
  }

  function preset() { return S.data.presets[S.at]; }
  function team(side) { return preset().teams[side]; }
  function player() { return team(S.side).players[S.row]; }

  function ruOf(en) { var c = KB.idx.champ(en); return (c && c.ru) || en; }
  function ddOf(en) { var c = KB.idx.champ(en); return c ? c.dd : null; }

  function tierHtml(en) {
    var t = CaptaincyCoach.tierOf(KB, en, { rank: RANK });
    if (!t) return '<span class="cx-tier">·</span>';
    return '<span class="cx-tier' + (t.fromCaptain ? ' cap' : '') + '" data-tier="' + esc(t.tier) + '"'
      + ' title="' + (t.fromCaptain ? 'тир от капитана' : 'тир из статистики' + (t.pr ? ', пикрейт ' + t.pr + '%' : '')) + '">'
      + esc(t.tier) + '</span>';
  }

  function face(en) {
    var dd = ddOf(en);
    return '<span class="cx-face">' + esc(ruOf(en).slice(0, 1))
      + (dd ? '<img src="' + DD + esc(dd) + '.png" alt="" loading="lazy" onerror="this.remove()">' : '') + '</span>';
  }

  /* ── ПУЛ ───────────────────────────────────────────────────────────────── */
  function toggle(en) {
    var p = player();
    var i = p.champs.indexOf(en);
    if (i === -1) p.champs.push(en); else p.champs.splice(i, 1);
    render();
    save();
  }

  /* ── ЗАПИСЬ ────────────────────────────────────────────────────────────── */
  var saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      preset().updated = new Date().toISOString().slice(0, 10);
      S.data.active = preset().id;
      var body = JSON.stringify({
        _: 'СОСТАВЫ И ПУЛЫ. Пишет lab-draft-coach/teams.html, читает coach.html → state.pools. ' +
           'Пул игрока режет кандидатов движка (draft-ai/engine/advise.js, poolOf).',
        built: new Date().toISOString(),
        active: S.data.active,
        presets: S.data.presets,
      }, null, 1);
      S.saving = 1; render();
      fetch('/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: FILE, content: body }),
      }).then(function (r) { return r.json(); }).then(function (j) {
        if (!j || !j.ok) throw new Error((j && j.error) || 'сервер отказал');
        S.saving = 0; S.savedAt = new Date(); render();
      }).catch(function (e) {
        S.saving = 0; render();
        toast('НЕ записалось: ' + (e && e.message), true);
      });
    }, 300);
  }

  var toastTimer = null;
  function toast(text, bad) {
    var t = $('tmToast');
    t.textContent = text;
    t.className = 'cx-toast show' + (bad ? ' bad' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = 'cx-toast' + (bad ? ' bad' : ''); }, 2600);
  }

  /* ── РЕНДЕР ────────────────────────────────────────────────────────────── */
  function render() { renderTop(); renderTeam('blue', 'tmBlue'); renderTeam('red', 'tmRed'); renderPick(); }

  function renderTop() {
    var opts = S.data.presets.map(function (p, i) {
      return '<option value="' + i + '"' + (i === S.at ? ' selected' : '') + '>' + esc(p.name) + '</option>';
    }).join('');
    var filled = ['blue', 'red'].reduce(function (n, s) {
      return n + team(s).players.filter(function (p) { return p.champs.length; }).length;
    }, 0);
    var state = S.saving ? '<span class="cx-chip">пишу…</span>'
      : S.savedAt ? '<span class="cx-chip cx-chip--good">записано ' + S.savedAt.toTimeString().slice(0, 5) + '</span>'
      : '<span class="cx-chip">ещё не писал</span>';
    labMorph($('tmTop'),
      '<div class="cx-mark"><b>Составы и пулы</b> <span>· кто что реально играет</span></div>' +
      '<select class="cx-field" id="tmPreset">' + opts + '</select>' +
      '<input class="cx-field" id="tmPresetName" value="' + esc(preset().name) + '" title="название состава">' +
      '<button class="cx-btn" data-act="new">+ состав</button>' +
      '<button class="cx-btn" data-act="copy">дублировать</button>' +
      '<button class="cx-btn" data-act="del">удалить</button>' +
      '<div class="cx-sp"></div>' +
      '<span class="cx-chip">ролей с пулом ' + filled + ' / 10</span>' +
      state +
      '<a class="cx-btn" href="tiers.html">Тирлист →</a>' +
      '<a class="cx-btn" href="coach.html">К драфту →</a>');
    var inp = $('tmPresetName');
    if (inp && document.activeElement !== inp && inp.value !== preset().name) inp.value = preset().name;
  }

  function renderTeam(side, host) {
    var t = team(side);
    var rows = t.players.map(function (p, i) {
      var on = S.side === side && S.row === i;
      var roleOpts = LANES.map(function (l) {
        return '<option value="' + l + '"' + (p.role === l ? ' selected' : '') + '>' + LANE_RU[l] + '</option>';
      }).join('');
      var pool = p.champs.length
        ? '<div class="tm-pool">' + p.champs.map(function (c) {
            return '<span class="p">' + esc(ruOf(c)) + '</span>';
          }).join('') + '</div>'
        : '';
      return '<div class="tm-player' + (on ? ' on' : '') + '" data-key="' + side + i + '" data-row="' + i + '" data-side="' + side + '">' +
        '<div style="flex:1 1 auto;min-width:0">' +
          '<div style="display:flex;align-items:center;gap:var(--sp-2)">' +
            '<select class="cx-field role" data-rolefor="' + side + i + '">' + roleOpts + '</select>' +
            '<input class="cx-field nm" data-namefor="' + side + i + '" placeholder="имя игрока" value="' + esc(p.name) + '">' +
            '<span class="n"><b>' + p.champs.length + '</b> чемп.</span>' +
          '</div>' + pool +
        '</div>' +
      '</div>';
    }).join('');
    labMorph($(host),
      '<div class="cx-h">' + (side === 'blue' ? 'синие' : 'красные') + '</div>' +
      '<input class="cx-field tm-name" data-teamname="' + side + '" placeholder="название команды" value="' + esc(t.name) + '">' +
      '<div class="cx-scroll" style="padding-top:var(--sp-3)"><div class="tm-players">' + rows + '</div></div>' +
      '<div class="tm-hint">Тык по строке — правим пул этого игрока.</div>');
    // значения полей атрибутом не описываются: переносим, не трогая то, что печатают
    t.players.forEach(function (p, i) {
      var el = document.querySelector('[data-namefor="' + side + i + '"]');
      if (el && document.activeElement !== el && el.value !== p.name) el.value = p.name;
    });
    var tn = document.querySelector('[data-teamname="' + side + '"]');
    if (tn && document.activeElement !== tn && tn.value !== t.name) tn.value = t.name;
  }

  function renderPick() {
    var p = player();
    var inPool = {};
    p.champs.forEach(function (c) { var k = KB.idx.nameOf(c); if (k) inPool[k] = 1; });
    var q = S.q.trim().toLowerCase();
    var list = KB.idx.names.filter(function (en) {
      var c = KB.idx.champ(en);
      if (S.lane && (c.lanes || []).indexOf(S.lane) === -1) return false;
      if (!q) return true;
      return (en + ' ' + (c.ru || '') + ' ' + (c.dd || '')).toLowerCase().indexOf(q) !== -1;
    });
    var cells = list.map(function (en) {
      return '<button class="ch-cell' + (inPool[en] ? ' in' : '') + '" data-key="c' + en + '" data-champ="' + esc(en) + '">'
        + face(en) + '<span class="nm">' + esc(ruOf(en)) + '</span>' + tierHtml(en) + '</button>';
    }).join('');
    var laneBtns = [''].concat(LANES).map(function (l) {
      return '<button class="cx-btn' + (S.lane === l ? ' on' : '') + '" data-lane="' + l + '">'
        + (l ? LANE_RU[l] : 'все') + '</button>';
    }).join('');
    labMorph($('tmPick'),
      '<div class="cx-h">пул · ' + esc(p.name || 'игрок без имени') + ' · ' + esc(LANE_RU[p.role])
        + '<div class="cx-sp"></div><span class="cx-chip">' + p.champs.length + ' выбрано</span></div>' +
      '<div class="rt-filters">' +
        '<input class="cx-field" id="tmQ" placeholder="поиск чемпиона   (/)" value="' + esc(S.q) + '">' +
        '<div class="cx-seg" style="flex-wrap:wrap">' + laneBtns +
          '<button class="cx-btn" data-act="clear">очистить пул</button>' +
          '<button class="cx-btn" data-act="lanepool">взять всех на роли</button>' +
          '<button class="cx-btn" data-act="nodes">счётчик узлов</button>' +
        '</div>' +
      '</div>' +
      '<div class="cx-scroll" style="padding-top:var(--sp-3)"><div class="ch-grid">' + cells + '</div></div>');
    var inp = $('tmQ');
    if (inp && document.activeElement !== inp && inp.value !== S.q) inp.value = S.q;
  }

  /* ── СОБЫТИЯ ───────────────────────────────────────────────────────────── */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-champ],[data-act],[data-lane],[data-row]');
    if (!el) return;
    if (el.dataset.champ) return toggle(el.dataset.champ);
    if (el.hasAttribute('data-lane')) { S.lane = el.dataset.lane; renderPick(); return; }
    if (el.dataset.row !== undefined && el.hasAttribute('data-row')) {
      if (e.target.closest('select,input')) return;      // правят поле, а не выбирают строку
      S.side = el.dataset.side; S.row = +el.dataset.row;
      render();
      return;
    }
    var a = el.dataset.act;
    if (a === 'new') { S.data.presets.push(blankPreset('Состав ' + (S.data.presets.length + 1))); S.at = S.data.presets.length - 1; render(); save(); }
    else if (a === 'copy') {
      var c = JSON.parse(JSON.stringify(preset()));
      c.id = 'p' + Date.now().toString(36); c.name = preset().name + ' (копия)';
      S.data.presets.push(c); S.at = S.data.presets.length - 1; render(); save();
    } else if (a === 'del') {
      if (S.data.presets.length === 1) { toast('Последний состав не удаляю', true); return; }
      S.data.presets.splice(S.at, 1); S.at = 0; render(); save();
    } else if (a === 'clear') { player().champs = []; render(); save(); }
    else if (a === 'lanepool') {
      // быстрый старт: взять всех, кто вообще играет на этой роли
      var role = player().role, p = player();
      KB.idx.names.forEach(function (en) {
        var c = KB.idx.champ(en);
        if ((c.lanes || []).indexOf(role) !== -1 && p.champs.indexOf(en) === -1) p.champs.push(en);
      });
      render(); save();
    } else if (a === 'nodes') nodes();
  });

  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'tmQ') { S.q = t.value; renderPick(); return; }
    if (t.dataset.namefor) {
      var side = t.dataset.namefor.slice(0, -1), i = +t.dataset.namefor.slice(-1);
      preset().teams[side].players[i].name = t.value;
      renderTop(); save(); return;
    }
    if (t.dataset.teamname) { team(t.dataset.teamname).name = t.value; save(); return; }
    if (t.id === 'tmPresetName') { preset().name = t.value; renderTop(); save(); }
  });

  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'tmPreset') { S.at = +t.value; S.row = 0; render(); save(); return; }
    if (t.dataset.rolefor) {
      var side = t.dataset.rolefor.slice(0, -1), i = +t.dataset.rolefor.slice(-1);
      preset().teams[side].players[i].role = t.value;
      render(); save();
    }
  });

  function bindKeys() {
    document.addEventListener('keydown', function (e) {
      var inField = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName || '');
      if (inField) {
        if (e.key === 'Escape') { e.target.blur(); }
        if (e.key === 'Enter' && e.target.id === 'tmQ') {
          var first = document.querySelector('.ch-cell');
          if (first) { toggle(first.dataset.champ); S.q = ''; renderPick(); }
        }
        return;
      }
      if (e.key === '/') { e.preventDefault(); var i = $('tmQ'); if (i) i.focus(); }
    });
  }

  /* ПРИЁМКА ЧИСЛОМ: добавление чемпиона в пул должно менять единицы узлов. */
  function nodes() {
    var first = document.querySelector('.ch-cell:not(.in)');
    if (!first) { toast('Нечего добавить — мерить нечем', true); return; }
    var before = labNodeMark(document.body);
    toggle(first.dataset.champ);
    toast('Чемпион в пуле. Узлов выжило ' + labNodeCount() + ' (помечено ' + before + ')');
  }

  boot();
})();
