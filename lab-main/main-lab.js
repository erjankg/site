/* ============================================================
   lab-main — главный экран по КАНОНУ (DESIGN.md)
   Пересобран из эталона lab-design-system. Стекло/анимации ТОЛЬКО через токены.
   GOTCHA: стекло видно всё время; fade только opacity на самих .glass;
   никакого transform/will-change на стекле.
   ============================================================ */
(function () {
  'use strict';

  var root = document.documentElement;
  var app = document.getElementById('app');
  var $ = function (s, c) { return (c || document).querySelector(s); };

  /* ── анимация входа (fade на .glass) ── */
  function animMs() {
    var v = getComputedStyle(root).getPropertyValue('--anim-dur').trim();
    var n = parseFloat(v); if (v.indexOf('ms') > -1) return n || 300; return (n || .3) * 1000;
  }
  function playIn(el) {
    if (!el) return;
    el.classList.remove('anim-in'); void el.offsetWidth; el.classList.add('anim-in');
    setTimeout(function () { el.classList.remove('anim-in'); }, animMs() + 80);
  }

  /* ============================================================
     ДАННЫЕ (демо) — перенос из старого lab-main
     ============================================================ */
  var CH = [
    { n: 'Garen',   g: 'linear-gradient(135deg,#4aa3ff,#103a6e)', i: 'G',  ad: 108, hp: 1920, mana: '0',   ar: 95, mr: 58, rng: 1, wr: 54.8, pr: 16, br: 9,  tier: 's',  role: 'Соло', tr: 1.4 },
    { n: 'Camille', g: 'linear-gradient(135deg,#c0c0c0,#5a5a6e)', i: 'C',  ad: 103, hp: 1842, mana: 687,  ar: 88, mr: 56, rng: 1, wr: 49.1, pr: 9,  br: 38, tier: 's',  role: 'Соло', tr: -0.9 },
    { n: 'Aatrox',  g: 'linear-gradient(135deg,#e74c3c,#7a1d12)', i: 'A',  ad: 112, hp: 1854, mana: '0',   ar: 91, mr: 61, rng: 1, wr: 52.4, pr: 14, br: 22, tier: 'a',  role: 'Соло', tr: 0.5 },
    { n: 'Ambessa', g: 'linear-gradient(135deg,#d4760a,#7a3d05)', i: 'Am', ad: 99,  hp: 1740, mana: 'NRG', ar: 84, mr: 54, rng: 1, wr: 47.8, pr: 18, br: 12, tier: 'a',  role: 'Лес',  tr: -1.7 },
    { n: 'Akali',   g: 'linear-gradient(135deg,#27c4a8,#0a4a40)', i: 'Ak', ad: 97,  hp: 1701, mana: 'NRG', ar: 79, mr: 52, rng: 1, wr: 50.2, pr: 13, br: 16, tier: 'a',  role: 'Мид',  tr: 0.3 },
    { n: 'Amumu',   g: 'linear-gradient(135deg,#2ecc71,#145a32)', i: 'Am', ad: 85,  hp: 1626, mana: 975,  ar: 82, mr: 56, rng: 1, wr: 53.6, pr: 11, br: 5,  tier: 'b',  role: 'Лес',  tr: 1.0 },
    { n: 'Ahri',    g: 'linear-gradient(135deg,#ff63a4,#7a1d4a)', i: 'Ah', ad: 74,  hp: 1588, mana: 892,  ar: 68, mr: 50, rng: 2, wr: 51.0, pr: 12, br: 7,  tier: 'b',  role: 'Мид',  tr: -0.4 },
    { n: 'Lux',     g: 'linear-gradient(135deg,#ffe06b,#7a6010)', i: 'L',  ad: 71,  hp: 1540, mana: 1015, ar: 64, mr: 48, rng: 2, wr: 48.3, pr: 10, br: 4,  tier: 'c',  role: 'Мид',  tr: -0.7 }
  ];
  /* добор чемпов — чтобы пикер выглядел как настоящий (демо-цифры) */
  [['Darius', 'Соло', 's', 53.1, 15, 28], ['Jinx', 'Дракон', 'a', 51.7, 17, 8],
   ['Ezreal', 'Дракон', 'b', 49.6, 19, 6], ['Leona', 'Саппорт', 'a', 52.2, 12, 11],
   ['Malphite', 'Соло', 'b', 50.8, 8, 6], ['Nasus', 'Соло', 'c', 48.9, 7, 3],
   ['Riven', 'Соло', 'a', 51.3, 10, 14], ['Sett', 'Соло', 'b', 50.1, 11, 9],
   ['Yasuo', 'Мид', 'c', 47.9, 21, 19], ['Ashe', 'Дракон', 'b', 50.4, 13, 5],
   ['Jhin', 'Дракон', 'a', 52.0, 16, 7], ['Katarina', 'Мид', 'b', 49.4, 9, 12]
  ].forEach(function (r, i) {
    CH.push({
      n: r[0], g: 'linear-gradient(135deg,#4aa3ff,#103a6e)', i: r[0].slice(0, 2),
      ad: 70 + (i * 4) % 45, hp: 1520 + (i * 37) % 400, mana: 600 + (i * 53) % 420,
      ar: 60 + (i * 5) % 38, mr: 46 + (i * 3) % 18, rng: r[1] === 'Дракон' ? 2 : 1,
      wr: r[3], pr: r[4], br: r[5], tier: r[2], role: r[1], tr: ((i % 5) - 2) * 0.6
    });
  });

  var ch = function (n) { return CH.find(function (c) { return c.n === n; }); };
  /* ИКОНКА 120×120 (как app.js:348 DD_URL) — НЕ ужатый сплэш */
  var ICON = 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/';
  function icon(c) { return ICON + c.n + '.png'; }
  /* Ассет подбираем ПОД РАЗМЕР ПОКАЗА: иконка 128px мылится, если растянуть её на 180px
     (вид «Крупные карточки»). Квадратный тайл — ПРОВЕРЕНО замером 3 чемпов: 380×380.
     Больше квадрата нет: CommunityDragon square = 128×128, а loading = 308×560 (кривой
     формат, из-за него и было «качество говно»). Потолок источника = 380px, ячейка
     ограничена им в CSS — апскейлу неоткуда взяться ни на одном виде/размере. */
  var TILE = 'https://ddragon.leagueoflegends.com/cdn/img/champion/tiles/';
  function iconSet(c) { return icon(c) + ' 128w, ' + TILE + c.n + '_0.jpg 380w'; }

  /* ============================================================
     РЕЕСТР ИКОНОК СТАТОВ — снят с ЖИВОГО боевого (window._siteIcons, 2026-07-20).
     В боевом реестр приходит из Firestore; в лабе Firebase нет, поэтому держим
     снимок и всё равно СНАЧАЛА пробуем настоящий реестр, если он вдруг есть.
     Свои SVG не рисуем, emoji не используем (запрет владельца).
     ============================================================ */
  var ICONS_SNAPSHOT = {
    ad:   'https://assets.riftgg.app/icons/stats/attack-damage.svg',
    ap:   'https://assets.riftgg.app/icons/stats/ability-damage.svg',
    hp:   'https://assets.riftgg.app/icons/stats/health.svg',
    mana: 'https://assets.riftgg.app/icons/stats/mana.svg',
    arm:  'https://assets.riftgg.app/icons/stats/armor.svg',
    mrez: 'https://assets.riftgg.app/icons/stats/magic-resist.svg',
    as:   'https://assets.riftgg.app/icons/stats/attack-speed.svg',
    krit: 'https://assets.riftgg.app/icons/stats/crit-change.svg',
    usk:  'https://assets.riftgg.app/icons/stats/ability-haste.webp',
    mpen: 'https://assets.riftgg.app/icons/stats/magic-pen.webp',
    sh:   'https://assets.riftgg.app/icons/stats/heal-and-shield-power.webp',
    gold: 'https://www.svgrepo.com/show/234310/money-coin.svg'
  };
  function statIcon(name) {
    var reg = (window._siteIcons && window._siteIcons[name]) || ICONS_SNAPSHOT[name];
    return reg || '';
  }

  /* ============================================================
     КОЛОНКИ ТАБЛИЦЫ (порт STATS_COL_DEFS, app.js:371).
     ico  — ключ в реестре иконок ('' = иконки в реестре пока НЕТ)
     col  — цвет стата (палитра на утверждение)
     hi   — «выше значение = лучше» (для заливки по рейтингу)
     ============================================================ */
  var COL_DEFS = [
    { key:'ad',   label:'AD',   ico:'ad',   col:'#E5484D', hi:true },
    { key:'hp',   label:'HP',   ico:'hp',   col:'#3DD68C', hi:true },
    { key:'mana', label:'Mana', ico:'mana', col:'#4A9EFF', hi:true },
    { key:'ar',   label:'AR',   ico:'arm',  col:'#F5A524', hi:true },
    { key:'mr',   label:'MR',   ico:'mrez', col:'#A97BFF', hi:true },
    { key:'rng',  label:'RNG',  ico:'',     col:'#ffffff', hi:true },
    { key:'as',   label:'AS',   ico:'as',   col:'#F5D90A', hi:true,  off:true },
    { key:'ms',   label:'MS',   ico:'',     col:'#2DD4BF', hi:true,  off:true },
    { key:'hpreg',label:'HP5',  ico:'',     col:'#7BE0A8', hi:true,  off:true },
    { key:'mpreg',label:'MP5',  ico:'',     col:'#8FC4FF', hi:true,  off:true }
  ];
  /* видимые колонки — юзер правит в ⚙ вкладки (порт getStatsCols) */
  var colHidden = {};
  COL_DEFS.forEach(function (c) { if (c.off) colHidden[c.key] = true; });
  function visibleCols() { return COL_DEFS.filter(function (c) { return !colHidden[c.key]; }); }

  /* ============================================================
     РОСТ ЗА УРОВЕНЬ — для тултипа «+N за уровень» (демо-модель:
     доля от базы, одинаковая для всех чемпов; в боевом это реальные *_Growth).
     ============================================================ */
  var GROWTH_FR = { ad:.055, hp:.075, mana:.05, ar:.05, mr:.035, rng:0, as:.02, ms:0, hpreg:.06, mpreg:.05 };
  function growthOf(c, key) {
    var base = +c[key];
    if (isNaN(base)) return 0;
    return Math.round(base * (GROWTH_FR[key] || 0) * 10) / 10;
  }
  /* значение стата на текущем уровне: база + рост*(ур-1) */
  function statAt(c, key) {
    var base = c[key];
    if (isNaN(+base)) return base;            /* 'NRG' / '0' оставляем как есть */
    return Math.round(+base + growthOf(c, key) * (level - 1));
  }

  /* ============================================================
     ПАТЧ-ИЗМЕНЕНИЯ по чемпам (порт patchMap, app.js:368) — демо.
     ============================================================ */
  var PATCH_MAP = {
    Garen:   { type:'buff',   patch:'7.0f', stat:'ad', delta:'+8',  change:'Базовый урон Q +8%' },
    Camille: { type:'nerf',   patch:'7.0f', stat:'hp', delta:'-40', change:'Щит пассивки −10%' },
    Ahri:    { type:'adjust', patch:'7.0f', stat:'mana',delta:'+25',change:'Дальность E увеличена' },
    Amumu:   { type:'buff',   patch:'7.0f', stat:'ar', delta:'+1.5',change:'Броня за уровень +1.5' },
    Lux:     { type:'nerf',   patch:'7.0f', stat:'rng',delta:'-5',  change:'Радиус E уменьшен на 5%' }
  };

  var COLS = [
    { k: 'ad', t: 'AD' }, { k: 'hp', t: 'HP' }, { k: 'mana', t: 'Mana' },
    { k: 'ar', t: 'AR' }, { k: 'mr', t: 'MR' }, { k: 'rng', t: 'RNG' }
  ];
  var PATCH = [
    { n: 'Garen',   type: 'buff',   t: 'Базовый урон Q +8%, восстановление HP усилено' },
    { n: 'Camille', type: 'nerf',   t: 'Щит пассивки −10%, перезарядка W +2с' },
    { n: 'Ambessa', type: 'new',    t: 'Новый чемпион добавлен в Wild Rift' },
    { n: 'Ahri',    type: 'adjust', t: 'Дальность E увеличена, урон ульты снижен' },
    { n: 'Amumu',   type: 'buff',   t: 'Базовое HP +40, броня за уровень +1.5' },
    { n: 'Lux',     type: 'nerf',   t: 'Радиус E уменьшен на 5%' }
  ];
  var PBADGE = { buff: '▲ БАФ', nerf: '▼ НЕРФ', new: '✦ НОВЫЙ', adjust: '⚙ ПРАВКА' };
  var ROLES = ['Все', 'Соло', 'Лес', 'Мид'];
  var MAP_OBJ = [
    { x: 22, y: 20, l: 'B', t: 'Барон' }, { x: 74, y: 78, l: 'D', t: 'Дракон' },
    { x: 30, y: 62, l: '🐺', t: 'Волки' }, { x: 68, y: 34, l: '🦎', t: 'Ящеры' },
    { x: 50, y: 50, l: '⚔', t: 'Мид' }
  ];

  var TIER_ORD = { s: 5, a: 4, b: 3, c: 2, d: 1 };
  var wrCls = function (v) { return v >= 50 ? 'wr-g' : 'wr-b'; };
  var ava = function (c, cls) { return '<span class="' + (cls || 'ch-ava') + '" style="background:' + c.g + '">' + c.i + '</span>'; };
  function sparkPts(wr, tr) {
    var base = wr - tr, vals = [base - 1.1, base + 0.5, base - 0.7, base + 0.9, base - 0.2, wr];
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals), rg = (mx - mn) || 1;
    return vals.map(function (v, i) { return (i * 12) + ',' + (17 - ((v - mn) / rg) * 14).toFixed(1); }).join(' ');
  }

  /* ── состояние (только то, что не покрыто утв. дефолтами) ── */
  var selName = 'Garen';
  var roleFilter = 'Все';
  var level = 10;                                   /* уровень для таблицы Статс */
  var picked = {};                                  /* мультивыбор чемпов в таблицу */
  CH.slice(0, 8).forEach(function (c) { picked[c.n] = true; });
  var pkSearch = '', pkRole = 'Все';
  var _lastView = null;                             /* чтобы анимировать только смену вида */
  var rightMode = 'swap';                           /* swap | card | off */
  var tipMode = 'cursor';                           /* cursor | cell | row */
  var patchMode = 'dot';                            /* dot | cellhl | arrow */
  var fillOn = true, fillStrength = 'mid', fillShape = 'cell';
  var fillScheme = 'rg', fillInvert = false;        /* rg | cb */
  var iconMode = 'color';                           /* color | mono */
  var roleView = 'icons';                           /* icons | both | compact */
  var tblW = 1050;                                  /* ширина таблиц, px (⚙ юзера) */

  /* ============================================================
     ЗАЛИВКА ПО РЕЙТИНГУ — шкала считается ВНУТРИ СВОЕЙ КОЛОНКИ
     (мин/макс по видимым чемпам этой колонки), как в тирмейкере.
     ============================================================ */
  var STRENGTH = { none:0, weak:.12, mid:.24, bright:.40 };
  function colRange(list, key) {
    var mn = Infinity, mx = -Infinity;
    list.forEach(function (c) {
      var v = +statAt(c, key);
      if (isNaN(v)) return;
      if (v < mn) mn = v; if (v > mx) mx = v;
    });
    return (mn === Infinity) ? null : { mn: mn, mx: mx };
  }
  /* t: 0 = низ колонки, 1 = верх колонки */
  function fillColor(t) {
    var a = STRENGTH[fillStrength] || 0;
    if (!fillOn || !a) return '';
    if (fillInvert) t = 1 - t;
    if (fillScheme === 'cb') {
      /* Схема 2 — «Янтарь↔Лазурь»: безопасна для дальтоников (протан/дейтеран),
         красный/зелёный им сливаются, а синий↔жёлтый различимы всегда.
         Плюс работает и по ЯРКОСТИ, то есть читается даже в ч/б. */
      var hi = [245, 165, 36], lo = [74, 158, 255];
      var r = Math.round(lo[0] + (hi[0] - lo[0]) * t);
      var g = Math.round(lo[1] + (hi[1] - lo[1]) * t);
      var b = Math.round(lo[2] + (hi[2] - lo[2]) * t);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + (a * (0.35 + 0.65 * Math.abs(t - .5) * 2)).toFixed(3) + ')';
    }
    /* Схема 1 — конвенция тирмейкеров: ВЫШЕ = краснее и темнее, НИЖЕ = зеленее */
    var R = [229, 72, 77], G = [61, 214, 140];
    var rr = Math.round(G[0] + (R[0] - G[0]) * t);
    var gg = Math.round(G[1] + (R[1] - G[1]) * t);
    var bb = Math.round(G[2] + (R[2] - G[2]) * t);
    return 'rgba(' + rr + ',' + gg + ',' + bb + ',' + (a * (0.35 + 0.65 * Math.abs(t - .5) * 2)).toFixed(3) + ')';
  }

  /* уровень масштабирует статы (демо-формула: на 15-м = база) */
  function atLvl(v) {
    if (isNaN(+v)) return v;                         /* 'NRG' / '0' оставляем как есть */
    return Math.round(+v * (0.5 + level / 30));
  }
  var sort = { k: 'wr', d: -1 };   /* winrate по умолчанию */
  var statSort = { k: 'ad', d: -1 };

  /* ============================================================
     ВИДЫ HOME
     ============================================================ */
  function filtered() {
    return roleFilter === 'Все' ? CH.slice() : CH.filter(function (c) { return c.role === roleFilter; });
  }
  /* Таблица Статс показывает ТОЛЬКО выбранных в пикере.
     Роль фильтрует ПИКЕР (как в боевом), а не таблицу — фильтр теперь ОДИН. */
  function pickedList() {
    return CH.filter(function (c) { return picked[c.n]; });
  }

  /* ============================================================
     БЛОК УРОВНЯ — отдельный, СВЕРХУ над таблицей (как .lvl-container боевого)
     ============================================================ */
  var lvlView = 'pills';
  function lvlBlock() {
    var body;
    if (lvlView === 'slider') {
      body = '<div class="lvl-slider"><span>1</span><input type="range" id="lvlRange" min="1" max="15" value="' + level + '"><span>15</span></div>';
    } else if (lvlView === 'steps') {
      body = '<div class="lvl-steps">' + [1, 5, 9, 12, 15].map(function (i) {
        return '<button class="lvl-pill ' + (i === level ? 'on' : '') + '" data-lvl="' + i + '">ур. ' + i + '</button>';
      }).join('') + '<span class="lvl-hint">вехи прокачки</span></div>';
    } else {
      var pills = '';
      for (var i = 1; i <= 15; i++) pills += '<button class="lvl-pill ' + (i === level ? 'on' : '') + '" data-lvl="' + i + '">' + i + '</button>';
      body = '<div class="ruler" id="ruler">' + pills + '<span class="lvl-hint">зажми и тяни →</span></div>';
    }
    return '<div class="lvl-block glass ' + (lvlView === 'compact' ? 'lvl-compact' : '') + '">' +
      '<div class="lvl-info"><span class="lvl-label">УРОВЕНЬ</span><span class="lvl-num">' + level + '</span>' +
      '<span class="lvl-patch">Patch 7.0f</span></div>' + body + '</div>';
  }

  /* ============================================================
     ПИКЕР ЧЕМПИОНОВ — правая панель вида «Статс» (порт #statsChampPanel)
     Ховер БЕЗ МЫЛА: источник 120px, покой scale(.88) → ховер scale(1) (только downscale).
     ============================================================ */
  /* Ячейка пикера максимум ~185px (вид «Крупные карточки», размер L) — просим 200px,
     чтобы браузер взял тайл 380w там, где иконки 128w не хватит. */
  var PK_SIZES = '200px';   /* просим 200px → браузер берёт тайл 380w, запас есть */
  var pickView = 'tile', shadeMode = 'wr';
  function shadeHtml(c) {
    if (shadeMode === 'wrpr') {
      return '<div class="sh-row"><span>WR</span><b class="' + wrCls(c.wr) + '">' + c.wr.toFixed(1) + '%</b></div>' +
             '<div class="sh-row"><span>PR</span><b>' + c.pr + '%</b></div>';
    }
    if (shadeMode === 'roles') {
      return '<div class="sh-row"><span>' + c.role + '</span><b class="' + wrCls(c.wr) + '">' + c.wr.toFixed(1) + '%</b></div>' +
             '<div class="sh-row"><span>прочие</span><b>' + (c.wr - 2.1).toFixed(1) + '%</b></div>';
    }
    return '<b class="' + wrCls(c.wr) + '">' + c.wr.toFixed(1) + '% WR</b>';
  }
  /* чемпы роли ('Все' = вся база) — для тумблера «выбрать всех этой роли» */
  function champsOfRole(role) {
    return role === 'Все' ? CH.slice() : CH.filter(function (c) { return c.role === role; });
  }
  /* состояние тумблера роли: all (все выбраны) · some (часть) · none (никого) */
  function roleAddState(role) {
    var list = champsOfRole(role);
    if (!list.length) return 'none';
    var on = list.filter(function (c) { return picked[c.n]; }).length;
    return on === 0 ? 'none' : (on === list.length ? 'all' : 'some');
  }

  function pickerHtml() {
    var list = CH.filter(function (c) {
      if (pkRole !== 'Все' && c.role !== pkRole) return false;
      return !pkSearch || c.n.toLowerCase().indexOf(pkSearch.toLowerCase()) === 0;
    });
    /* ЕДИНСТВЕННЫЙ фильтр ролей (дубль в шапке убран). Иконки — локальные файлы
       боевого image/role_*.webp, не emoji и не свои SVG. */
    var ROLE_ICO = { 'Соло':'top', 'Лес':'jungle', 'Мид':'mid', 'Дракон':'adc', 'Саппорт':'support' };
    var roles = ['Все', 'Соло', 'Лес', 'Мид', 'Дракон', 'Саппорт'];
    var cells = list.map(function (c) {
      return '<div class="pk-cell ' + (picked[c.n] ? 'on' : '') + '" data-pick="' + c.n + '" title="' + c.n + '">' +
        '<div class="pk-lift">' +
          '<img class="pk-img" src="' + icon(c) + '" srcset="' + iconSet(c) + '" sizes="' + PK_SIZES + '" alt="' + c.n + '" loading="lazy" ' +
            'onerror="this.style.background=\'' + c.g + '\';this.removeAttribute(\'src\')">' +
          '<div class="pk-shade">' + shadeHtml(c) + '</div>' +
          /* бейдж WR поверх аватарки — в DOM всегда, показывается только в виде «Бейдж» (чистый CSS) */
          '<span class="pk-badge ' + wrCls(c.wr) + '">' + c.wr.toFixed(0) + '</span>' +
        '</div>' +
        '<span class="pk-name">' + c.n + '</span>' +
        '<span class="pk-wr ' + wrCls(c.wr) + '">' + c.wr.toFixed(1) + '%</span>' +
      '</div>';
    }).join('');
    var count = Object.keys(picked).filter(function (k) { return picked[k]; }).length;
    return '<aside class="picker panel glass">' +
      '<div class="pk-bar"><span><b class="pk-count">' + count + '</b> чемп. в таблице</span><button class="pk-clear" id="pkClear">Очистить</button></div>' +
      '<div class="pk-search"><input type="text" id="pkSearch" placeholder="Поиск..." value="' + pkSearch + '"></div>' +
      /* Две РАЗНЫЕ функции на одной строке роли:
         .pk-rf = ФИЛЬТР (что видно в пикере) · .rf-add = ВЫБОР (кого добавить в таблицу). */
      '<div class="pk-roles" data-roleview="' + roleView + '">' + roles.map(function (r) {
        var k = ROLE_ICO[r];
        var ic = k ? '<img class="rf-ico" src="../image/role_' + k + '.webp" alt="' + r + '" loading="lazy">' : '';
        /* текст ВСЕГДА в DOM — переключение вида прячет его, а не пересобирает кнопки */
        var hide = (roleView === 'icons' && k) ? ' style="display:none"' : '';
        return '<span class="pk-rf-wrap">' +
          '<button class="pk-rf ' + (r === pkRole ? 'on' : '') + '" data-pkrole="' + r + '" title="Фильтр: показать ' + r + '">' +
            ic + '<span class="rf-t"' + hide + '>' + r + '</span></button>' +
          '<button class="rf-add ' + roleAddState(r) + '" data-addrole="' + r + '" title="Выбрать всех: ' + r + '" aria-label="Выбрать всех ' + r + '"></button>' +
        '</span>';
      }).join('') + '</div>' +
      '<div class="pk-scroll"><div class="pk-grid">' + cells + '</div>' +
        '<div class="pk-empty lead"' + (cells ? ' style="display:none"' : '') + '>Ничего не найдено</div></div>' +
      '<span class="demo" style="align-self:flex-start">цифры демо</span>' +
    '</aside>';
  }
  function sortBy(list, s) {
    var val = function (c) { return s.k === 'tier' ? (TIER_ORD[c.tier] || 0) : (isNaN(+c[s.k]) ? -1 : +c[s.k]); };
    return list.slice().sort(function (a, b) { return (val(a) - val(b)) * s.d; });
  }

  /* — Статы — */
  function viewStats() {
    var cols = visibleCols();
    var list = sortBy(pickedList(), statSort);

    /* диапазоны для заливки — по КАЖДОЙ колонке отдельно */
    var ranges = {};
    cols.forEach(function (col) { ranges[col.key] = colRange(list, col.key); });

    var head = '<th>Чемпион</th>' + cols.map(function (col) {
      var on = statSort.k === col.key;
      var url = statIcon(col.ico);
      var ic = url
        ? '<img class="st-ico" src="' + url + '" alt="" loading="lazy"' +
          (iconMode === 'color' ? ' style="--ic:' + col.col + '"' : '') + '>'
        : '';
      return '<th data-sort="' + col.key + '" class="' + (on ? 'sorted' : '') + '" ' +
        (iconMode === 'color' ? 'style="--ic:' + col.col + '"' : '') + '>' +
        ic + '<span class="st-lbl">' + col.label + '</span>' +
        '<span class="arr">' + (on ? (statSort.d < 0 ? '▼' : '▲') : '⇅') + '</span></th>';
    }).join('');

    var rows = list.map(function (c) { return statRowHtml(c, cols, ranges); }).join('');

    var empty = '<tr><td colspan="' + (cols.length + 1) + '" style="text-align:center;height:80px">Выбери чемпионов в панели справа →</td></tr>';
    var rowTip = (tipMode === 'row') ? '<div class="row-tip" id="rowTip">Наведи на цифру — покажу рост за уровень</div>' : '';
    return lvlBlock() +
      '<div class="panel glass tbl-panel" style="padding:8px 12px"><table class="tbl" data-tbl="stats"><thead><tr>' + head + '</tr></thead>' +
      '<tbody>' + (rows || empty) + '</tbody></table>' + rowTip + '</div>';
  }

  /* Сборка ОДНОЙ строки — вынесена, чтобы добавление/удаление чемпа вставляло
     одну <tr>, а не пересобирало таблицу (приёмка счётчиком узлов). */
  function statRowHtml(c, cols, ranges) {
    {
      var p = PATCH_MAP[c.n];
      var patchDot = (p && patchMode === 'dot')
        ? '<span class="patch-dot ' + p.type + '" data-patch="' + c.n + '"></span>' : '';
      var cells = cols.map(function (col) {
        var v = statAt(c, col.key);
        var r = ranges[col.key];
        var num = +v;
        var t = (r && r.mx > r.mn && !isNaN(num)) ? (num - r.mn) / (r.mx - r.mn) : .5;
        var bg = fillColor(col.hi ? t : 1 - t);
        var touched = p && p.stat === col.key;
        var cls = 'st-cell' + (touched && patchMode === 'cellhl' ? ' patch-hl ' + p.type : '');
        var styleCell = (fillShape === 'cell' && bg) ? 'background:' + bg + ';' : '';
        var inner;
        if (fillShape === 'digit' && bg) inner = '<b class="st-v" style="color:' + bg.replace(/[\d.]+\)$/, '1)') + '">' + v + '</b>';
        else inner = '<b class="st-v">' + v + '</b>';
        if (fillShape === 'bar' && bg) inner += '<i class="st-bar" style="background:' + bg.replace(/[\d.]+\)$/, '1)') + ';width:' + Math.round(8 + t * 92) + '%"></i>';
        var arrow = (touched && patchMode === 'arrow')
          ? '<span class="p-arr ' + p.type + '" data-patch="' + c.n + '">' + (p.type === 'nerf' ? '▼' : '▲') + p.delta + '</span>' : '';
        return '<td class="' + cls + '" style="' + styleCell + '" data-ch="' + c.n + '" data-key="' + col.key + '">' + inner + arrow + '</td>';
      }).join('');
      return '<tr data-ch="' + c.n + '" class="' + (c.n === selName ? 'sel' : '') + '">' +
        '<td><div class="ch-cell">' + ava(c) + patchDot +
        '<span><span class="ch-name">' + c.n + '</span> <span class="ch-role">· ' + c.role + '</span></span></div></td>' +
        cells + '</tr>';
    }
  }

  /* ТОЧЕЧНО: чемп добавлен/убран → вставляем или убираем ОДНУ <tr>,
     затем перекрашиваем существующие ячейки (диапазон колонки сдвинулся) — БЕЗ пересоздания узлов. */
  function applyChampRow(name) {
    var tb = pane().querySelector('.tbl[data-tbl="stats"] tbody');
    if (!tb) { refreshTable(); return; }
    var existing = tb.querySelector('tr[data-ch="' + name + '"]');

    if (!picked[name]) {
      if (existing) existing.remove();
      if (!tb.querySelector('tr[data-ch]')) { refreshTable(); return; }  /* опустело — вернуть заглушку */
      refreshStatCells();
      return;
    }
    if (existing) return;
    if (!tb.querySelector('tr[data-ch]')) { refreshTable(); return; }    /* была заглушка — собрать заново */

    var cols = visibleCols();
    var list = sortBy(pickedList(), statSort);
    var ranges = {};
    cols.forEach(function (col) { ranges[col.key] = colRange(list, col.key); });
    var idx = -1;
    for (var i = 0; i < list.length; i++) { if (list[i].n === name) { idx = i; break; } }
    if (idx < 0) { refreshTable(); return; }

    var tmp = document.createElement('tbody');
    tmp.innerHTML = statRowHtml(list[idx], cols, ranges);
    var tr = tmp.firstElementChild;
    var rows = tb.querySelectorAll('tr[data-ch]');
    if (idx >= rows.length) tb.appendChild(tr); else tb.insertBefore(tr, rows[idx]);
    refreshStatCells();
    wireTable();
  }

  /* — WinRate — */
  function viewWinrate() {
    var list = sortBy(filtered(), sort);
    var cols = [['tier', 'Тир'], ['wr', 'WR'], ['pr', 'PR'], ['br', 'BR'], ['trend', 'Тренд']];
    var head = '<th>Чемпион</th>' + cols.map(function (c) {
      var on = sort.k === c[0];
      return '<th data-sort="' + c[0] + '" class="' + (on ? 'sorted' : '') + (c[0] === 'trend' ? ' col-spark' : '') + '">' + c[1] +
        '<span class="arr">' + (on ? (sort.d < 0 ? '▼' : '▲') : '▼') + '</span></th>';
    }).join('');
    var rows = list.map(function (c, i) {
      return '<tr data-ch="' + c.n + '" class="' + (c.n === selName ? 'sel' : '') + '">' +
        '<td><div class="ch-cell"><span class="ch-role">' + (i + 1) + '</span>' + ava(c) + '<span class="ch-name">' + c.n + '</span></div></td>' +
        '<td><span class="tier-badge t-' + c.tier + '">' + c.tier.toUpperCase() + '</span></td>' +
        '<td><span class="wr-cell"><span class="wr-track"><span class="wr-fill" style="width:' + Math.min(100, (c.wr - 40) * 5) + '%"></span></span><b class="' + wrCls(c.wr) + '">' + c.wr.toFixed(1) + '%</b></span></td>' +
        '<td>' + c.pr + '%</td><td>' + c.br + '%</td>' +
        '<td class="col-spark"><span class="wr-cell"><span class="trend ' + (c.tr >= 0 ? 'up' : 'dn') + '">' + (c.tr >= 0 ? '▲' : '▼') + Math.abs(c.tr).toFixed(1) + '</span>' +
        '<svg class="spark" viewBox="0 0 60 18" preserveAspectRatio="none"><polyline points="' + sparkPts(c.wr, c.tr) + '"/></svg></span></td></tr>';
    }).join('');
    return '<div class="head-right" style="margin:0 0 12px"><span class="upd">обновлено 04.04.2026 · демо</span></div>' +
      '<div class="panel glass tbl-panel" style="padding:8px 12px"><table class="tbl" data-tbl="wr"><thead><tr>' + head + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  /* — Мета-хаб (бенто) — */
  function viewHub() {
    var hero = ch('Garen');
    var top5 = sortBy(CH, { k: 'wr', d: -1 }).slice(0, 5);
    var movers = sortBy(CH, { k: 'wr', d: -1 }).slice(0).sort(function (a, b) { return b.tr - a.tr; });
    var sTier = CH.filter(function (c) { return c.tier === 's'; });
    var avgWr = (CH.reduce(function (s, c) { return s + c.wr; }, 0) / CH.length).toFixed(1);
    /* STRONG-полоса ключевых цифр: самостоятельная .glass-панель, тёмность 2-го уровня */
    var kpiStrip = '<div class="panel glass glass--strong b-wide kpi-strip" style="grid-column:1/-1">' +
      '<span class="kpi-i"><b>128</b><small>чемпионов</small></span>' +
      '<span class="kpi-i"><b>' + avgWr + '%</b><small>средний WR</small></span>' +
      '<span class="kpi-i"><b>7.0f</b><small>патч</small></span>' +
      '<span class="kpi-i"><b>Garen</b><small>чемпион дня</small></span>' +
      '<span class="kpi-i"><b>Camille</b><small>топ-бан 38%</small></span>' +
      '<span class="demo">strong · демо</span></div>';
    return '<div class="bento">' + kpiStrip +
      '<div class="panel glass b-wide"><div class="hero">' + ava(hero, 'cc-ava') +
        '<div><span class="lead">★ Чемпион дня · Patch 7.0f <span class="demo">демо</span></span>' +
        '<h2>' + hero.n + '</h2><div class="tags"><span class="tag">🎖 Тир ' + hero.tier.toUpperCase() + '</span><span class="tag">📈 ' + hero.wr + '% WR</span><span class="tag">🗺 ' + hero.role + '</span></div>' +
        '<button class="cta" data-ch="' + hero.n + '">Открыть в таблице →</button></div></div></div>' +
      '<div class="panel glass"><h2>📈 Топ-5 по WR</h2>' + top5.map(function (c) {
        return '<div class="mv" data-ch="' + c.n + '">' + ava(c) + '<span class="grow">' + c.n + '</span><b class="' + wrCls(c.wr) + '">' + c.wr.toFixed(1) + '%</b></div>';
      }).join('') + '</div>' +
      '<div class="panel glass"><h2>⇅ Движ. патча</h2>' + movers.slice(0, 5).map(function (c) {
        return '<div class="mv" data-ch="' + c.n + '">' + ava(c) + '<span class="grow">' + c.n + '</span><b class="trend ' + (c.tr >= 0 ? 'up' : 'dn') + '">' + (c.tr >= 0 ? '▲' : '▼') + Math.abs(c.tr).toFixed(1) + '</b></div>';
      }).join('') + '</div>' +
      '<div class="panel glass"><h2>🎖 S-тир сейчас</h2><div class="tier-list">' + sTier.map(function (c) {
        return '<span class="t-chip" data-ch="' + c.n + '">' + ava(c) + c.n + '</span>';
      }).join('') + '</div></div>' +
      '<div class="panel glass"><h2>🏆 Топ-бан</h2><div class="big-num">Camille</div><span class="lead">38% банов в патче</span></div>' +
      '<div class="panel glass b-wide"><h2>📰 Что нового <span class="demo">Patch 7.0f</span></h2>' + PATCH.slice(0, 4).map(function (p) {
        return '<div class="mv" data-ch="' + p.n + '">' + ava(ch(p.n)) + '<span class="grow">' + p.n + ' — ' + p.t + '</span></div>';
      }).join('') + '</div>' +
      '</div>';
  }

  /* — Тир-лист — */
  /* ============================================================
     ТИР-МЕЙКЕР (вид Тир-лист). Drag-drop как tiermaker.com.
     ОБЩИЙ ТАЙЛ (.tile) — не Статс-пикер: у пикера своё поведение (тоггл строк),
     тут тайл ПЕРЕТАСКИВАЕТСЯ как блок. Тайл = один компонент, поведение разное.
     ============================================================ */
  var RUNES = [
    { id: 'electro', n: 'Электрокьют', tree: 'Доминирование', f: '30–184 +40%бонус.AD +25%AP' },
    { id: 'conqueror', n: 'Завоеватель', tree: 'Точность', f: '6 стаков ·  на 6 → +8% омнивамп' },
    { id: 'aery', n: 'Аэри', tree: 'Колдовство', f: 'урон 10–50 · щит 20–120' },
    { id: 'comet', n: 'Комета', tree: 'Колдовство', f: '30–100 +35%бонус.AD +20%AP' },
    { id: 'bladestorm', n: 'Град клинков', tree: 'Точность', f: '+110%/+80% скор.атаки 3 авто' },
    { id: 'firststrike', n: 'Удар первым', tree: 'Вдохновение', f: '+9% чист.урона + золото' }
  ];
  var DRAGONS = [
    { id: 'infernal', n: 'Огненный', soul: 'Душа: взрыв 35 AoE адаптивного — лучшая для урона', col: 'linear-gradient(135deg,#e0506a,#5a0a1a)' },
    { id: 'mountain', n: 'Горный', soul: 'Душа: щит 150–350 после 5с без урона — лучшая для выживания', col: 'linear-gradient(135deg,#d4a050,#5a3a10)' },
    { id: 'ocean', n: 'Океанский', soul: 'Душа: вост. HP+маны при уроне — устойчивость в бою', col: 'linear-gradient(135deg,#4aa3ff,#103a6e)' },
    { id: 'cloud', n: 'Облачный', soul: 'Душа: доп. МС при ульте — мобильность/пики', col: 'linear-gradient(135deg,#7ab0d0,#2a4a6e)' }
  ];
  var ITEM_TYPE = { bork: 'ад', trin: 'ад', wits: 'ад', cleaver: 'танк', nash: 'ап', divine: 'танк', void: 'ап', steelcaps: 'ботинки', boots1: 'ботинки' };
  var TM_TIERS = [['s+', 'S+'], ['s', 'S'], ['a', 'A'], ['b', 'B'], ['c', 'C'], ['d', 'D']];
  var TM_TABS = [
    { k: 'champ', t: 'Чемпионы', subs: ['Все', 'Топ', 'Лес', 'Мид', 'АДК', 'Сап'] },
    { k: 'item', t: 'Предметы', subs: ['Все', 'АД', 'Танк', 'АП', 'Сап', 'Ботинки'] },
    { k: 'rune', t: 'Руны', subs: [] },
    { k: 'dragon', t: 'Объекты', subs: [] }
  ];
  var TM_SUBROLE = { 'Топ': 'Соло', 'Лес': 'Лес', 'Мид': 'Мид', 'АДК': 'Дракон', 'Сап': 'Саппорт' };
  var TM_SUBITEM = { 'АД': 'ад', 'Танк': 'танк', 'АП': 'ап', 'Сап': 'сап', 'Ботинки': 'ботинки' };
  var tmTab = 'champ', tmSub = 'Все', tmFull = false;
  /* ★ ОТДЕЛЬНЫЙ тир-лист на КАЖДУЮ роль/тип (не фильтр): ключ = вид|под-вид.
     champ|Все, champ|Топ, champ|Лес … item|АД … — у каждого своё размещение и сейв. */
  var tmState = {};
  function tmKey() { return tmTab + '|' + tmSub; }
  /* набор сущностей ИМЕННО этого под-листа (роль/тип), не вся база */
  function tmSubTids(kind, sub) {
    if (kind === 'champ') {
      return CH.filter(function (c) { return sub === 'Все' || c.role === TM_SUBROLE[sub]; }).map(function (c) { return 'champ:' + c.n; });
    }
    if (kind === 'item') {
      return ITEMS.filter(function (i) { return sub === 'Все' || ITEM_TYPE[i.id] === TM_SUBITEM[sub]; }).map(function (i) { return 'item:' + i.id; });
    }
    if (kind === 'rune') return RUNES.map(function (r) { return 'rune:' + r.id; });
    return DRAGONS.map(function (d) { return 'dragon:' + d.id; });
  }
  function tmInit() {
    var key = tmKey();
    if (tmState[key]) return;
    var st = { pool: tmSubTids(tmTab, tmSub) };
    TM_TIERS.forEach(function (t) { st[t[0]] = []; });
    tmState[key] = st;
  }
  function tmData(tid) {
    var p = tid.split(':'), k = p[0], id = p[1];
    if (k === 'champ') return ch(id);
    if (k === 'item') return ITEMS.find(function (x) { return x.id === id; });
    if (k === 'rune') return RUNES.find(function (x) { return x.id === id; });
    return DRAGONS.find(function (x) { return x.id === id; });
  }
  /* ── ОБЩИЙ ТАЙЛ: иконка + ховер-зум БЕЗ мыла (крупный источник, покой .88 → ховер 1.0) ── */
  function tileHTML(tid, hidden) {
    var p = tid.split(':'), k = p[0], d = tmData(tid);
    if (!d) return '';
    var h = hidden ? ' hidden' : '';
    if (k === 'champ') {
      return '<div class="tile tile-champ" draggable="true" data-tid="' + tid + '" data-ch="' + d.n + '" title="' + d.n + '"' + h + '>' +
        '<span class="tile-lift"><img class="tile-img" src="' + icon(d) + '" srcset="' + iconSet(d) + '" sizes="120px" alt="' + d.n + '" loading="lazy" onerror="this.style.background=\'' + d.g + '\';this.removeAttribute(\'src\')">' +
        '<span class="tile-shade"><b class="' + wrCls(d.wr) + '">' + d.wr.toFixed(1) + '%</b></span></span>' +
        '<span class="tile-n">' + d.n + '</span></div>';
    }
    if (k === 'item') {
      return '<div class="tile tile-item" draggable="true" data-tid="' + tid + '" data-item="' + d.id + '" title="' + d.n + '"' + h + '>' +
        '<span class="tile-lift"><span class="tile-ic" style="background:' + d.g + '"></span></span><span class="tile-n">' + d.n + '</span></div>';
    }
    if (k === 'rune') {
      return '<div class="tile tile-rune" draggable="true" data-tid="' + tid + '" data-rune="' + d.id + '" title="' + d.n + '"' + h + '>' +
        '<span class="tile-lift"><span class="tile-ic tile-rune-ic"></span></span><span class="tile-n">' + d.n + '</span></div>';
    }
    return '<div class="tile tile-dragon" draggable="true" data-tid="' + tid + '" data-dragon="' + d.id + '" title="' + d.n + '"' + h + '>' +
      '<span class="tile-lift"><span class="tile-ic" style="background:' + d.col + '"></span></span><span class="tile-n">' + d.n + '</span></div>';
  }
  function viewTier() {
    tmInit();
    var st = tmState[tmKey()];
    var tab = TM_TABS.find(function (x) { return x.k === tmTab; });
    var rows = TM_TIERS.map(function (t) {
      return '<div class="tm-row"><span class="tm-badge" style="background:var(--tier-' + (t[0] === 's+' ? 's-plus' : t[0]) + ')">' + t[1] + '</span>' +
        '<div class="tm-lane" data-zone="' + t[0] + '">' + st[t[0]].map(tileHTML).join('') + '</div></div>';
    }).join('');
    var subtabs = tab.subs.length ? '<div class="chips glass tm-subs">' + tab.subs.map(function (s) {
      return '<button class="chip-btn ' + (s === tmSub ? 'active' : '') + '" data-tmsub="' + s + '">' + s + '</button>';
    }).join('') + '</div>' : '';
    var poolTiles = st.pool.map(function (tid) { return tileHTML(tid); }).join('');
    return '<div class="tm-wrap' + (tmFull ? ' tm-full' : '') + '">' +
      '<div class="tm-main">' +
        '<div class="tm-bar"><div class="chips glass tm-tabs">' + TM_TABS.map(function (x) {
          return '<button class="chip-btn ' + (x.k === tmTab ? 'active' : '') + '" data-tmtab="' + x.k + '">' + x.t + '</button>';
        }).join('') + '</div>' +
        '<div class="tm-actions"><button class="tm-btn" data-tmsave>Сохранить</button><button class="tm-btn" data-tmload>Загрузить</button>' +
        '<button class="tm-btn" data-tmshare>Поделиться</button><button class="tm-btn" data-tmreset>Сброс</button>' +
        '<button class="tm-btn" data-tmfull>' + (tmFull ? 'Свернуть' : 'Во весь экран') + '</button></div></div>' +
        '<div class="panel glass tm-grid">' + rows + '</div>' +
        subtabs +
        '<div class="panel glass tm-pool"><div class="tm-pool-h">Палитра · тащи в тир <span class="demo">демо</span></div><div class="tm-pool-grid" data-zone="pool">' + poolTiles + '</div></div>' +
      '</div>' +
      '<aside class="tm-side panel glass" id="tmSide"><div class="tm-side-empty lead">Клик по любому — карточка тут. Свернёшь → тир на весь экран.</div></aside>' +
    '</div>';
  }
  /* снимок размещения из DOM (после drag) — узлы живут, не пересобираем */
  function tmSnapshot(host) {
    var st = tmState[tmKey()];
    host.querySelectorAll('.tm-lane[data-zone]').forEach(function (z) {
      st[z.getAttribute('data-zone')] = [].map.call(z.querySelectorAll('.tile'), function (t) { return t.getAttribute('data-tid'); });
    });
    var poolGrid = host.querySelector('.tm-pool-grid');
    st.pool = [].map.call(poolGrid.querySelectorAll('.tile'), function (t) { return t.getAttribute('data-tid'); });
  }

  /* ── провода тир-мейкера: DnD (точечно), вкладки, фильтры, действия, карточка ── */
  var _tmDrag = null;
  function wireTierMaker(host) {
    /* DnD: тащим ОДИН .tile между зонами. Drop = переставить этот узел (1 перемещение). */
    host.querySelectorAll('.tile[draggable]').forEach(function (t) {
      t.addEventListener('dragstart', function () { _tmDrag = t; t.classList.add('tm-dragging'); });
      t.addEventListener('dragend', function () { t.classList.remove('tm-dragging'); _tmDrag = null; host.querySelectorAll('.tm-over').forEach(function (z) { z.classList.remove('tm-over'); }); });
    });
    host.querySelectorAll('[data-zone]').forEach(function (z) {
      z.addEventListener('dragover', function (e) { e.preventDefault(); z.classList.add('tm-over'); });
      z.addEventListener('dragleave', function () { z.classList.remove('tm-over'); });
      z.addEventListener('drop', function (e) {
        e.preventDefault(); z.classList.remove('tm-over');
        if (!_tmDrag) return;
        z.appendChild(_tmDrag);          /* ← ПЕРЕМЕЩЕНИЕ ОДНОГО УЗЛА, не пересборка */
        tmSnapshot(host);
      });
    });

    /* вкладки источника — смена kind = ПЕРЕСТРОИТЬ только тир-маркер (labMorph), не весь вид */
    host.querySelectorAll('[data-tmtab]').forEach(function (b) {
      b.onclick = function () { tmTab = b.getAttribute('data-tmtab'); tmSub = 'Все'; rebuildTier(host); };
    });
    /* под-вкладки = ОТДЕЛЬНЫЕ тир-листы (у каждой роли/типа своё размещение) → перестроить */
    host.querySelectorAll('[data-tmsub]').forEach(function (b) {
      b.onclick = function () { tmSub = b.getAttribute('data-tmsub'); rebuildTier(host); };
    });

    /* карточка справа + связи (клик по тайлу) */
    host.querySelectorAll('.tile').forEach(function (t) {
      t.addEventListener('click', function () { tmShowCard(host, t.getAttribute('data-tid')); });
    });

    /* действия */
    var q = function (s) { return host.querySelector(s); };
    if (q('[data-tmfull]')) q('[data-tmfull]').onclick = function () { tmFull = !tmFull; rebuildTier(host); };
    if (q('[data-tmreset]')) q('[data-tmreset]').onclick = function () { delete tmState[tmKey()]; rebuildTier(host); };
    if (q('[data-tmsave]')) q('[data-tmsave]').onclick = function () {
      try { localStorage.setItem('tm-' + tmKey(), JSON.stringify(tmState[tmKey()])); toast('Тир сохранён: ' + tmSub); } catch (e) {}
    };
    if (q('[data-tmload]')) q('[data-tmload]').onclick = function () {
      try { var s = localStorage.getItem('tm-' + tmKey()); if (s) { tmState[tmKey()] = JSON.parse(s); rebuildTier(host); toast('Тир загружен: ' + tmSub); } } catch (e) {}
    };
    if (q('[data-tmshare]')) q('[data-tmshare]').onclick = function () {
      var st = tmState[tmKey()];
      var lines = TM_TIERS.map(function (t) { return t[1] + ': ' + (st[t[0]] || []).map(function (tid) { var d = tmData(tid); return d ? (d.n) : ''; }).join(', '); });
      var text = 'Тир-лист ' + tmTab + ' · ' + tmSub + ':\n' + lines.join('\n');
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { toast('Карточка-ссылка в буфере'); }, function () {});
      else toast('Скопируй вручную');
    };
  }
  function rebuildTier(host) { labMorph(host, viewTier()); wireTierMaker(host); }
  function toast(msg) {
    var t = document.getElementById('tmToast');
    if (!t) { t = document.createElement('div'); t.id = 'tmToast'; t.className = 'tm-toast glass'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('on');
    clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('on'); }, 1600);
  }
  /* карточка справа: чемп/предмет/руна/дракон + связи (клик «Открыть» → страница/карточка) */
  function tmShowCard(host, tid) {
    var p = tid.split(':'), k = p[0], d = tmData(tid), side = host.querySelector('#tmSide');
    if (!d || !side) return;
    var html;
    if (k === 'champ') {
      /* та же богатая карточка, что в WinRate (WR/PR/BR/тренд/спарк + матчапы Клода-ИИ) */
      labMorph(side, '<button class="tm-side-collapse" data-tmfull title="Свернуть карточку → тир на весь экран">›</button>' + champCardHTML(d));
      wireChampCard(side, d);
      var cl0 = side.querySelector('[data-tmfull]'); if (cl0) cl0.onclick = function () { tmFull = true; rebuildTier(host); };
      return;
    }
    if (k === 'item') {
      html = '<div class="tmc"><span class="tmc-ic" style="background:' + d.g + '"></span><div class="tmc-name">' + d.n + '</div>' +
        '<div class="tmc-sub">' + d.cat + ' · ' + d.cost + ' з</div><div class="tmc-pass">' + d.pass + '</div>' +
        '<button class="tm-btn tmc-open" data-open-item="' + d.id + '">Открыть карточку предмета →</button></div>';
    } else if (k === 'rune') {
      html = '<div class="tmc"><span class="tmc-ic tile-rune-ic"></span><div class="tmc-name">' + d.n + '</div>' +
        '<div class="tmc-sub">Дерево: ' + d.tree + '</div><div class="tmc-pass">' + d.f + ' <span class="demo">демо</span></div></div>';
    } else {
      html = '<div class="tmc"><span class="tmc-ic" style="background:' + d.col + '"></span><div class="tmc-name">' + d.n + ' дракон</div>' +
        '<div class="tmc-pass">' + d.soul + ' <span class="demo">демо</span></div></div>';
    }
    labMorph(side, '<button class="tm-side-collapse" data-tmfull title="Свернуть карточку → тир на весь экран">›</button>' + html);
    var oc = side.querySelector('[data-open-champ]'); if (oc) oc.onclick = function () { openChampPage(oc.getAttribute('data-open-champ')); };
    var oi = side.querySelector('[data-open-item]'); if (oi) oi.onclick = function () { var sh = sectionHost(); itemsGrid(sh); openItemCard(sh, oi.getAttribute('data-open-item')); };
    var cl = side.querySelector('[data-tmfull]'); if (cl) cl.onclick = function () { tmFull = true; rebuildTier(host); };
  }

  /* — Патч — */
  function viewPatch() {
    return '<div class="panel glass">' + PATCH.map(function (p) {
      return '<div class="patch-item" data-ch="' + p.n + '">' + ava(ch(p.n)) +
        '<span class="pb ' + p.type + '">' + PBADGE[p.type] + '</span><span>' + p.t + '</span></div>';
    }).join('') + '</div>';
  }

  /* — Карта (инфо-заглушка с кликабельными объектами) — */
  function viewMap() {
    return '<div class="panel glass"><h2>🗺 Карта · экономика <span class="demo">демо</span></h2>' +
      '<div class="map-wrap">' + MAP_OBJ.map(function (o) {
        return '<span class="map-dot" style="left:' + o.x + '%;top:' + o.y + '%" title="' + o.t + '">' + o.l + '</span>';
      }).join('') + '</div>' +
      '<p class="lead" style="text-align:center;margin-top:12px">Кликабельные объекты джангла · тайминги · экономика (порт из lab-map позже)</p></div>';
  }

  var VIEWS = [
    { v: 'stats', t: 'Статы',    ic: '📊', render: viewStats,   card: true },
    { v: 'wr',    t: 'WinRate',  ic: '🏆', render: viewWinrate, card: true },
    { v: 'hub',   t: 'Мета-хаб', ic: '🧩', render: viewHub,     card: false },
    { v: 'tier',  t: 'Тир-лист', ic: '🎖', render: viewTier,    card: false },
    { v: 'map',   t: 'Карта',    ic: '🗺', render: viewMap,     card: false },
    { v: 'patch', t: 'Патч',     ic: '📰', render: viewPatch,   card: false }
  ];
  var curView = 'stats';

  /* правая карточка чемпа */
  /* ── ОБЩАЯ БОГАТАЯ КАРТОЧКА ЧЕМПА — те же данные, что в таблице WinRate и Метахабе:
     тир, WR (цвет+полоса), PR, BR, тренд, спарклайн + матчап-тизер (данные Клода-ИИ, guides).
     Кнопка свернуть/развернуть + связь на страницу чемпа. Используется в WinRate и тир-мейкере. ── */
  function champCardHTML(c, opts) {
    opts = opts || {};
    var trend = '<span class="trend ' + (c.tr >= 0 ? 'up' : 'dn') + '">' + (c.tr >= 0 ? '▲' : '▼') + Math.abs(c.tr).toFixed(1) + '</span>';
    var spark = '<svg class="spark" viewBox="0 0 60 18" preserveAspectRatio="none"><polyline points="' + sparkPts(c.wr, c.tr) + '"/></svg>';
    var lvl = opts.level ? '<div class="lvl"><span>Ур.</span><input type="range" min="1" max="15" value="10" id="lvlR"><b id="lvlV">10</b></div>' : '';
    return '<div class="cc-top">' + ava(c, 'cc-ava') +
        '<div class="cc-idwrap"><div class="cc-name">' + c.n + '</div><div class="cc-sub">' + c.role +
        ' · <span class="tier-badge t-' + c.tier + '">' + c.tier.toUpperCase() + '</span></div></div>' +
        '<button class="cc-collapse" data-cc-collapse title="Свернуть карточку">▾</button></div>' +
      '<div class="cc-body">' +
        /* тот же набор, что строка WinRate: WR c полосой, PR, BR, тренд+спарклайн */
        '<div class="cc-wr"><span class="wr-track"><span class="wr-fill" style="width:' + Math.min(100, (c.wr - 40) * 5) + '%"></span></span>' +
          '<b class="' + wrCls(c.wr) + '">' + c.wr.toFixed(1) + '%</b><span class="cc-wrl">WinRate</span></div>' +
        '<div class="kpi-row"><div class="kpi"><span class="kpi-n">' + c.pr + '%</span><span class="kpi-l">PickRate</span></div>' +
          '<div class="kpi"><span class="kpi-n">' + c.br + '%</span><span class="kpi-l">BanRate</span></div>' +
          '<div class="kpi"><span class="kpi-n">' + trend + '</span><span class="kpi-l">тренд ' + spark + '</span></div></div>' +
        /* мини-статы (как метахаб-сводка) */
        '<div class="mini-row"><span>Атака</span><span>' + c.ad + '</span></div>' +
        '<div class="mini-row"><span>Здоровье</span><span>' + c.hp + '</span></div>' +
        '<div class="mini-row"><span>Броня / MR</span><span>' + c.ar + ' / ' + c.mr + '</span></div>' +
        lvl +
        /* матчап-тизер: данные Клода-ИИ (guides). Заполняется async. */
        '<div class="cc-mu" data-cc-mu="' + slugOf(c.n) + '"><div class="cc-mu-h">Матчапы <span class="demo">Клод-ИИ</span></div>' +
          '<div class="cc-mu-body lead">загрузка…</div></div>' +
        '<button class="tm-btn cc-open" data-open-champ="' + c.n + '">Открыть страницу чемпа →</button>' +
      '</div>';
  }
  /* async-догрузка матчапов в карточку (топ «силён/слаб против» из guides Клода-ИИ) */
  function fillCardMatchups(root, name) {
    var box = root.querySelector('.cc-mu[data-cc-mu] .cc-mu-body');
    if (!box) return;
    guideFor(slugOf(name)).then(function (g) {
      var m = g && g.matchups && g.matchups[0];
      if (!m) { box.textContent = 'нет данных'; return; }
      var row = function (x, cls, lbl) {
        if (!x) return '';
        var mc = ch(x.name) || ch(x.slug);
        var av = mc ? '<img class="cc-mu-ic" src="' + icon(mc) + '" alt="" onerror="this.remove()">' : '';
        return '<button class="cc-mu-row" data-open-champ="' + (mc ? mc.n : '') + '"><span class="' + cls + '">' + lbl + '</span>' + av +
          '<span class="cc-mu-n">' + x.name + '</span><b class="' + wrCls(x.wr) + '">' + x.wr + '%</b></button>';
      };
      box.innerHTML = row(m.best && m.best[0], 'mu-good', 'силён') + row(m.worst && m.worst[0], 'mu-bad', 'слаб') +
        (g.counters && g.counters.length ? '<div class="cc-mu-cnt">Контрят: ' + g.counters.slice(0, 3).join(', ') + '</div>' : '');
      box.querySelectorAll('.cc-mu-row[data-open-champ]').forEach(function (b) {
        var n = b.getAttribute('data-open-champ'); if (n) b.onclick = function () { openChampPage(n); };
      });
    });
  }

  function cardHtml() {
    var c = ch(selName) || CH[0];
    return '<div class="side-card panel glass" id="wrCard">' + champCardHTML(c, { level: true }) + '</div>';
  }

  /* ============================================================
     РЕНДЕР
     ============================================================ */
  var stage = document.getElementById('stage');
  /* ── АКТИВНАЯ ПАНЕЛЬ вида: точечные хелперы работают ТОЛЬКО в ней,
     спрятанные виды не трогаются (у stats и wr одинаковые .tbl — нельзя путать). ── */
  var viewHost = null, headerBuilt = false;
  function pane() {
    return (viewHost && viewHost.querySelector('.view-pane[data-view="' + curView + '"]')) || stage;
  }

  /* правая колонка по виду (свап как в боевом, data-rightcol) */
  function rightFor(name) {
    var view = VIEWS.find(function (v) { return v.v === name; });
    if (rightMode === 'off') return 'off';
    if (rightMode === 'card') return view && view.card ? 'card' : 'off';
    return name === 'stats' ? 'select' : (name === 'wr' ? 'card' : 'off');  /* swap */
  }
  function paneInner(name) {
    var view = VIEWS.find(function (v) { return v.v === name; });
    var body = view.render();
    var right = rightFor(name);
    var col = right === 'select' ? pickerHtml() : (right === 'card' ? cardHtml() : '');
    return col ? '<div class="split"><div>' + body + '</div>' + col + '</div>' : body;
  }

  /* шапка + хост панелей строятся ОДИН раз; вкладки-виды wired один раз */
  function buildShell() {
    if (headerBuilt) return;
    stage.innerHTML =
      '<header class="sec-head"><h1>Home</h1>' +
        '<div class="subtabs glass" role="tablist">' + VIEWS.map(function (v) {
          return '<button class="subtab" data-view="' + v.v + '">' + v.ic + ' ' + v.t + '</button>';
        }).join('') + '</div>' +
        '<div class="head-right"><span class="upd">демо-данные</span></div>' +
      '</header>' +
      '<div class="view-host" id="viewHost"></div>';
    viewHost = stage.querySelector('#viewHost');
    stage.querySelectorAll('.subtab').forEach(function (b) {
      b.onclick = function () { showView(b.getAttribute('data-view')); };
    });
    headerBuilt = true;
  }

  /* ЛЕНИВО + КЭШ: вид строится при ПЕРВОМ заходе (с появлением — реальное появление),
     потом НЕ удаляется — прячется hidden. Возврат = показать спрятанный, 0 пересоздания. */
  function showView(name) {
    curView = name;
    buildShell();
    stage.querySelectorAll('.subtab').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-view') === name);
    });
    app.setAttribute('data-rightcol', rightFor(name));

    var p = viewHost.querySelector('.view-pane[data-view="' + name + '"]');
    if (!p) {                                   /* ПЕРВЫЙ заход — построить один раз */
      p = document.createElement('section');
      p.className = 'view-pane';
      p.setAttribute('data-view', name);
      p.innerHTML = paneInner(name);
      viewHost.appendChild(p);
      wirePane(p);
      playIn(p);                                /* реальное появление — только при постройке */
    }
    /* показать целевую, спрятать прочие — БЕЗ пересборки */
    viewHost.querySelectorAll('.view-pane').forEach(function (x) { x.hidden = (x !== p); });
    _lastView = name;
  }

  /* Инструмент рельса = заглушка ПОВЕРХ, оболочка Home прячется (не затирается → кэш панелей цел) */
  function enterTool(title) {
    buildShell();
    stage.querySelector('.sec-head').hidden = true;
    if (viewHost) viewHost.hidden = true;
    var stub = stage.querySelector('#toolStub');
    if (!stub) {
      stub = document.createElement('div');
      stub.id = 'toolStub'; stub.className = 'tool-stub';
      stage.appendChild(stub);
    }
    stub.innerHTML = '<div class="panel glass"><h2>' + title + ' <span class="demo">заглушка</span></h2>' +
      '<p class="lead">Инструмент = отдельный раздел-страница (не модалка). Рельс остаётся, меняется контент. Порт из своего lab-* позже.</p></div>';
    stub.hidden = false;
    playIn(stub);
  }
  function exitTool() {
    var stub = stage.querySelector('#toolStub');
    if (stub) stub.hidden = true;
    var sh = stage.querySelector('#labSection');
    if (sh) sh.hidden = true;
    if (stage.querySelector('.sec-head')) stage.querySelector('.sec-head').hidden = false;
    if (viewHost) viewHost.hidden = false;
    showView(curView);
  }

  /* ============================================================
     РАЗДЕЛЫ РЕЛЬСА: Чемпионы + Предметы (строим из эталона lab-main —
     то же стекло/токены/lab-morph/playIn, свои узлы не изобретаем).
     Оболочка Home прячется (не затирается → её кэш панелей цел).
     ============================================================ */
  function sectionHost() {
    buildShell();
    if (stage.querySelector('.sec-head')) stage.querySelector('.sec-head').hidden = true;
    if (viewHost) viewHost.hidden = true;
    var stub = stage.querySelector('#toolStub'); if (stub) stub.hidden = true;
    var sh = stage.querySelector('#labSection');
    if (!sh) { sh = document.createElement('div'); sh.id = 'labSection'; sh.className = 'lab-section'; stage.appendChild(sh); }
    sh.hidden = false;
    return sh;
  }
  function enterSection(kind) {
    var sh = sectionHost();
    if (kind === 'champs') champsGrid(sh);
    else if (kind === 'items') itemsGrid(sh);
  }

  /* совместимость: старые вызовы render() = показать текущий вид (перестроит только если его нет) */
  function render() {
    /* если вид уже построен — просто показать (0 узлов); если данные вида надо
       обновить целиком (напр. переключили rightMode) — пересобрать его панель */
    if (headerBuilt) { var p = viewHost.querySelector('.view-pane[data-view="' + curView + '"]'); if (p) { p.remove(); } }
    showView(curView);
  }

  /* ── ТОЧЕЧНО: перерисовать ТОЛЬКО таблицу активного вида, не трогая пикер и шапку ── */
  function refreshTable() {
    var host = pane().querySelector('.split > div') || pane();
    if (!host || curView !== 'stats') { render(); return; }
    labMorph(host, viewStats());
    wireTable();
    wireLevel();
  }

  /* ── ТОЧЕЧНО: фильтр пикера показом/скрытием, БЕЗ пересборки ячеек ── */
  function filterPickerCells() {
    var grid = pane().querySelector('.pk-grid');
    if (!grid) return;
    var q = (pkSearch || '').trim().toLowerCase();
    var shown = 0;
    grid.querySelectorAll('.pk-cell[data-pick]').forEach(function (el) {
      var n = el.getAttribute('data-pick');
      var c = ch(n);
      var hit = (pkRole === 'Все' || (c && c.role === pkRole)) && (!q || n.toLowerCase().indexOf(q) !== -1);
      el.style.display = hit ? '' : 'none';
      if (hit) shown++;
    });
    var note = pane().querySelector('.pk-empty');
    if (note) note.style.display = shown ? 'none' : '';
    pane().querySelectorAll('[data-pkrole]').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-pkrole') === pkRole);
    });
  }

  /* ── ТОЧЕЧНО: перекрасить одну ячейку пикера + счётчик ── */
  function syncPickCell(name) {
    var on = !!picked[name];
    pane().querySelectorAll('.pk-cell[data-pick="' + name + '"]').forEach(function (el) {
      el.classList.toggle('on', on);
    });
    var cnt = pane().querySelector('.pk-count');
    if (cnt) cnt.textContent = Object.keys(picked).filter(function (k) { return picked[k]; }).length;
  }

  /* ── ТОЧЕЧНО: пересчитать состояние тумблеров ролей (all/some/none) по DOM-классу ── */
  function refreshRoleToggles() {
    pane().querySelectorAll('.rf-add[data-addrole]').forEach(function (b) {
      var st = roleAddState(b.getAttribute('data-addrole'));
      b.classList.remove('all', 'some', 'none');
      b.classList.add(st);
    });
  }

  /* ── ВЫБРАТЬ/СНЯТЬ всех чемпов роли — точечно (одна ячейка + одна строка на КАЖДОГО
     изменившегося, НЕ пересборка таблицы и НЕ пересборка сетки пикера) ── */
  function toggleRole(role) {
    var list = champsOfRole(role);
    var makeOn = roleAddState(role) !== 'all';   /* не все выбраны → добавляем; все → снимаем */
    list.forEach(function (c) {
      if (!!picked[c.n] === makeOn) return;      /* уже в нужном состоянии — не трогаем */
      picked[c.n] = makeOn;
      syncPickCell(c.n);                          /* одна ячейка */
      applyChampRow(c.n);                         /* одна строка (вставка по сорт-позиции / удаление) */
    });
    refreshRoleToggles();
  }

  /* провода ОДНОЙ панели — вешаются при её постройке (subtab-провод живёт в buildShell) */
  function wirePane(root) {
    wireTable();
    wireLevel();
    if (curView === 'tier' && root.querySelector('.tm-wrap')) wireTierMaker(root);

    /* ── ПИКЕР: мультивыбор, поиск, роли — БЕЗ пересборки сетки ── */
    root.querySelectorAll('[data-pick]').forEach(function (el) {
      el.onclick = function () {
        var n = el.getAttribute('data-pick');
        picked[n] = !picked[n];
        selName = n;
        syncPickCell(n);      /* одна ячейка пикера */
        applyChampRow(n);     /* одна строка таблицы */
        refreshRoleToggles(); /* состояние тумблеров ролей могло измениться */
      };
    });
    var ps = root.querySelector('#pkSearch');
    if (ps) ps.oninput = function () { pkSearch = ps.value; filterPickerCells(); };
    /* ФИЛЬТР роли (что видно) — только показ/скрытие ячеек */
    root.querySelectorAll('[data-pkrole]').forEach(function (b) {
      b.onclick = function () { pkRole = b.getAttribute('data-pkrole'); filterPickerCells(); };
    });
    /* ВЫБОР роли (кого добавить в таблицу) — тумблер on/off */
    root.querySelectorAll('[data-addrole]').forEach(function (b) {
      b.onclick = function (e) { e.stopPropagation(); toggleRole(b.getAttribute('data-addrole')); };
    });
    var pc = root.querySelector('#pkClear');
    if (pc) pc.onclick = function () {
      Object.keys(picked).forEach(function (k) { picked[k] = false; });
      pane().querySelectorAll('.pk-cell[data-pick]').forEach(function (el) { el.classList.remove('on'); });
      syncPickCell('');
      refreshRoleToggles();
      refreshTable();
    };
  }

  /* ── провода ТАБЛИЦЫ (пересоздаются вместе с ней) ── */
  function wireTable() {
    pane().querySelectorAll('.tbl thead th[data-sort]').forEach(function (th) {
      th.onclick = function () {
        var k = th.getAttribute('data-sort');
        var s = curView === 'stats' ? statSort : sort;
        if (s.k === k) s.d *= -1; else { s.k = k; s.d = -1; }
        if (curView === 'stats') refreshTable(); else render();
      };
    });
    pane().querySelectorAll('tr[data-ch]').forEach(function (el) {
      el.onclick = function () {
        selName = el.getAttribute('data-ch');
        pane().querySelectorAll('tr[data-ch]').forEach(function (x) { x.classList.toggle('sel', x === el); });
        var card = pane().querySelector('.side-card');
        if (card) { card.innerHTML = champCardHTML(ch(selName), { level: true }); wireChampCard(card, ch(selName)); }
      };
    });
    /* карточка WinRate живёт при построении вида — провод сразу */
    var wc = pane().querySelector('#wrCard');
    if (wc) wireChampCard(wc, ch(selName) || CH[0]);
    wireTips();
    wirePatch();
  }

  /* провод богатой карточки: свернуть/развернуть · матчапы · связь на страницу */
  function wireChampCard(root, c) {
    if (!c) return;
    var col = root.querySelector('[data-cc-collapse]');
    if (col) col.onclick = function () {
      var on = root.classList.toggle('cc-collapsed');
      col.textContent = on ? '▸' : '▾';
      col.title = on ? 'Развернуть карточку' : 'Свернуть карточку';
    };
    root.querySelectorAll('[data-open-champ]').forEach(function (b) {
      var n = b.getAttribute('data-open-champ'); if (n) b.onclick = function () { openChampPage(n); };
    });
    fillCardMatchups(root, c.n);
  }

  /* ── провода БЛОКА УРОВНЯ ── */
  function wireLevel() {
    pane().querySelectorAll('.lvl-pill[data-lvl]').forEach(function (p) {
      p.onclick = function () {
        level = +p.getAttribute('data-lvl');
        pane().querySelectorAll('.lvl-pill').forEach(function (x) { x.classList.toggle('on', x === p); });
        var num = pane().querySelector('.lvl-num'); if (num) num.textContent = level;
        refreshStatCells();
      };
    });
    var ruler = $('#ruler');
    if (ruler && !ruler.__wired) {
      ruler.__wired = 1;          // узел теперь переживает ре-рендер (labMorph) — не вешаем слушателя дважды
      var drag = false;
      var pick = function (e) {
        var el = document.elementFromPoint(e.clientX, e.clientY);
        var pill = el && el.closest ? el.closest('.lvl-pill[data-lvl]') : null;
        if (!pill) return;
        var v = +pill.getAttribute('data-lvl');
        if (v === level) return;
        level = v;
        /* тянем БЕЗ полного ре-рендера — иначе рвётся жест */
        ruler.querySelectorAll('.lvl-pill').forEach(function (x) { x.classList.toggle('on', x === pill); });
        var num = pane().querySelector('.lvl-num'); if (num) num.textContent = level;
        refreshStatCells();
      };
      ruler.addEventListener('pointerdown', function (e) {
        drag = true; try { ruler.setPointerCapture(e.pointerId); } catch (_) {} pick(e);
      });
      ruler.addEventListener('pointermove', function (e) { if (drag) pick(e); });
      ruler.addEventListener('pointerup', function () { drag = false; });
      ruler.addEventListener('pointercancel', function () { drag = false; });
    }
    var lrange = $('#lvlRange');
    if (lrange) lrange.oninput = function () {
      level = +lrange.value;
      var num = pane().querySelector('.lvl-num'); if (num) num.textContent = level;
      refreshStatCells();
    };
  }

  /* ============================================================
     ТУЛТИП РОСТА СТАТА — порт showT/moveT/hideT (app.js:3125).
     3 вида: у курсора · привязан к ячейке · строкой под таблицей.
     ============================================================ */
  function tipEl() {
    var el = document.getElementById('uiTip');
    if (!el) { el = document.createElement('div'); el.id = 'uiTip'; el.className = 'ui-tip glass'; document.body.appendChild(el); }
    return el;
  }
  function wireTips() {
    pane().querySelectorAll('td.st-cell[data-ch][data-key]').forEach(function (td) {
      var c = ch(td.getAttribute('data-ch'));
      var key = td.getAttribute('data-key');
      if (!c) return;
      var g = growthOf(c, key);
      var txt = g ? '+' + g + ' за уровень' : 'не растёт с уровнем';
      td.onmouseenter = function (ev) {
        if (tipMode === 'row') { var r = $('#rowTip'); if (r) r.textContent = c.n + ' · ' + key.toUpperCase() + ': ' + txt + ' (демо)'; return; }
        var el = tipEl();
        el.textContent = txt + ' (демо)';
        el.style.display = 'block';
        if (tipMode === 'cell') {
          var b = td.getBoundingClientRect();
          el.style.left = (b.left + b.width / 2) + 'px';
          el.style.top = (b.top - 8) + 'px';
          el.setAttribute('data-anchor', 'cell');
        } else {
          el.setAttribute('data-anchor', 'cursor');
          el.style.left = ev.clientX + 'px';
          el.style.top = ev.clientY + 'px';
        }
      };
      td.onmousemove = function (ev) {
        if (tipMode !== 'cursor') return;
        var el = tipEl();
        el.style.left = ev.clientX + 'px';
        el.style.top = (ev.clientY - 10) + 'px';
      };
      td.onmouseleave = function () {
        var el = document.getElementById('uiTip'); if (el) el.style.display = 'none';
        if (tipMode === 'row') { var r = $('#rowTip'); if (r) r.textContent = 'Наведи на цифру — покажу рост за уровень'; }
      };
    });
  }

  /* ── ПАТЧ-ТУЛТИП — порт showGlobalPatchTip (app.js:668) ── */
  function wirePatch() {
    pane().querySelectorAll('[data-patch]').forEach(function (el) {
      el.onclick = function (e) {
        e.stopPropagation();
        var p = PATCH_MAP[el.getAttribute('data-patch')];
        if (!p) return;
        var old = document.getElementById('patchTip'); if (old) old.remove();
        var tip = document.createElement('div');
        tip.id = 'patchTip'; tip.className = 'patch-tip glass';
        var lbl = p.type === 'buff' ? '🟢 БАФФ' : p.type === 'adjust' ? '🟡 КОРРЕКТИРОВКА' : '🔴 НЕРФ';
        tip.innerHTML = '<b>' + lbl + ' <span class="pt-v">Patch ' + p.patch + '</span></b><div class="pt-c">' + p.change + '</div><span class="demo">демо</span>';
        document.body.appendChild(tip);
        var r = el.getBoundingClientRect(), tr = tip.getBoundingClientRect();
        var left = Math.max(8, Math.min(r.left, window.innerWidth - tr.width - 8));
        var top = r.bottom + 6;
        if (top + tr.height > window.innerHeight - 8) top = Math.max(8, r.top - tr.height - 6);
        tip.style.left = left + 'px'; tip.style.top = top + 'px';
        setTimeout(function () {
          document.addEventListener('click', function rm() { var t = document.getElementById('patchTip'); if (t) t.remove(); document.removeEventListener('click', rm); }, { once: true });
        }, 50);
      };
    });
  }

  /* обновить только числа в таблице статов (без ре-рендера — без мигания) */
  function refreshStatCells() {
    var tb = pane().querySelector('.tbl[data-tbl="stats"] tbody');
    if (!tb) return;
    var list = sortBy(pickedList(), statSort);
    var cols = visibleCols();
    var ranges = {};
    cols.forEach(function (col) { ranges[col.key] = colRange(list, col.key); });
    tb.querySelectorAll('tr').forEach(function (tr, ri) {
      var c = list[ri]; if (!c) return;
      cols.forEach(function (col, ci) {
        var td = tr.children[ci + 1];
        if (!td) return;
        var v = statAt(c, col.key);
        var b = td.querySelector('.st-v'); if (b) b.textContent = v;
        var r = ranges[col.key], num = +v;
        var t = (r && r.mx > r.mn && !isNaN(num)) ? (num - r.mn) / (r.mx - r.mn) : .5;
        var bg = fillColor(col.hi ? t : 1 - t);
        if (fillShape === 'cell') td.style.background = bg || '';
        var bar = td.querySelector('.st-bar');
        if (bar && bg) { bar.style.background = bg.replace(/[\d.]+\)$/, '1)'); bar.style.width = Math.round(8 + t * 92) + '%'; }
      });
    });
  }

  /* ============================================================
     РЕЛЬС — hover раскрытие + смена раздела
     ============================================================ */
  var rail = document.getElementById('rail');
  rail.addEventListener('mouseenter', function () { if (!app.classList.contains('nav-top')) app.classList.add('rail-open'); });
  rail.addEventListener('mouseleave', function () { app.classList.remove('rail-open'); });
  rail.querySelectorAll('.rail-btn[data-section]').forEach(function (b) {
    b.onclick = function () {
      rail.querySelectorAll('.rail-btn[data-section]').forEach(function (x) { x.classList.toggle('active', x === b); });
      var sec = b.getAttribute('data-section');
      if (sec === 'home') { exitTool(); }
      else if (sec === 'champs') { enterSection('champs'); }
      else if (sec === 'items') { enterSection('items'); }
      else { enterTool(b.textContent.trim()); }
    };
  });

  /* ── данные для страницы чемпа (грузим один раз, кэш; демо при отсутствии) ── */
  var _abil = null, _ru = null, _guideCache = {};
  var slugOf = function (name) { return String(name).toLowerCase().replace(/[^a-z]/g, ''); };
  function loadJSON(url) { return fetch(url).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }
  function ensureAbilities() {
    if (_abil) return Promise.resolve();
    return Promise.all([
      loadJSON('../data-pipeline/abilities-en.json'),
      loadJSON('../data-pipeline/ability-names-ru.json')
    ]).then(function (r) { _abil = r[0] || { champions: [] }; _ru = r[1] || { champions: {} }; });
  }
  function guideFor(slug) {
    if (_guideCache[slug] !== undefined) return Promise.resolve(_guideCache[slug]);
    return loadJSON('../data-pipeline/guides/' + slug + '.json').then(function (g) { _guideCache[slug] = g; return g; });
  }

  /* ── СЕТКА ЧЕМПИОНОВ (переиспользуем стиль пикера из эталона) ── */
  var champSearch = '';
  function champsGrid(host) {
    var list = CH.filter(function (c) { return !champSearch || c.n.toLowerCase().indexOf(champSearch.toLowerCase()) === 0; });
    var cells = list.map(function (c) {
      return '<button class="cg-cell" data-champ="' + c.n + '" title="' + c.n + '">' +
        '<span class="cg-lift"><img class="cg-img" src="' + icon(c) + '" srcset="' + iconSet(c) + '" sizes="120px" alt="' + c.n + '" loading="lazy" ' +
          'onerror="this.style.background=\'' + c.g + '\';this.removeAttribute(\'src\')"></span>' +
        '<span class="cg-name">' + c.n + '</span>' +
        '<span class="cg-role">' + c.role + '</span></button>';
    }).join('');
    labMorph(host,
      '<header class="sec-head"><h1>Чемпионы</h1>' +
        '<div class="head-right"><div class="pk-search cg-search"><input type="text" id="cgSearch" placeholder="Поиск чемпиона..." value="' + champSearch + '"></div></div></header>' +
      '<div class="cg-grid">' + cells + '</div>');
    var s = host.querySelector('#cgSearch');
    if (s) s.oninput = function () { champSearch = s.value; champsGrid(host); var f = host.querySelector('#cgSearch'); if (f) { f.focus(); f.setSelectionRange(f.value.length, f.value.length); } };
    host.querySelectorAll('[data-champ]').forEach(function (b) {
      b.onclick = function () { openChampPage(b.getAttribute('data-champ')); };
    });
  }

  /* ── СТРАНИЦА ЧЕМПА (полноэкранная, та же что SEO champions/<name>/) ── */
  var champLevel = 10;
  /* скейл по уровню — та же формула, что в таблице Статс (демо-рост); строки/'0'/'NRG' как есть */
  function scaleStat(base) { return isNaN(+base) ? base : Math.round(+base * (0.5 + champLevel / 30)); }
  function statRow(lbl, key, c) {
    return '<div class="cs-row"><span class="cs-l">' + lbl + '</span><b class="cs-v">' + scaleStat(c[key]) + '</b></div>';
  }
  function openChampPage(name) {
    var c = ch(name); if (!c) return;
    var host = sectionHost();
    var slug = slugOf(name);
    /* каркас сразу (демо/скелет), данные догружаем и morph-им — без мигания */
    labMorph(host, champPageHTML(c, null, null));
    wireChampPage(host, c);
    playIn(host.querySelector('.cp-page'));
    Promise.all([ensureAbilities().then(function () { return _abil.champions.find(function (x) { return x.slug === slug; }); }), guideFor(slug)])
      .then(function (r) {
        labMorph(host, champPageHTML(c, r[0], r[1]));
        wireChampPage(host, c);
      });
  }
  function champPageHTML(c, abil, guide) {
    var tierT = (guide && guide.tier) || c.tier.toUpperCase();
    var patch = (guide && guide.patch) || '7.2a';
    var trend = c.tr >= 0 ? 'up' : 'dn';
    var badge = c.tr >= 0 ? 'БАФ' : 'НЕРФ';

    /* умения */
    var abilHTML;
    if (abil && abil.abilities) {
      var ruC = (_ru && _ru.champions && _ru.champions[c.n]) || {};
      abilHTML = Object.keys(abil.abilities).map(function (k) {
        var a = abil.abilities[k];
        var ruName = (ruC[a.slot] && ruC[a.slot].ru) || a.name;
        var scale = (a.scale || '').trim();
        return '<div class="ab-row"><img class="ab-ic" src="' + a.icon + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">' +
          '<div class="ab-body"><div class="ab-h"><b class="ab-slot">' + a.slot.toUpperCase() + '</b> <span class="ab-name">' + ruName + '</span>' +
          (a.name !== ruName ? '<span class="ab-en">' + a.name + '</span>' : '') + '</div>' +
          '<div class="ab-desc">' + (a.desc || '') + '</div>' +
          (scale ? '<div class="ab-scale">Скейл: ' + scale + '</div>' : '') + '</div></div>';
      }).join('');
    } else {
      abilHTML = '<div class="ab-row demo-skel">Умения загружаются… <span class="demo">демо</span></div>';
    }

    /* гайд: сборка / руны / заклы / прокачка */
    var guideHTML;
    if (guide) {
      var b = (guide.builds && guide.builds[0]) || {};
      var it = b.items || {};
      var chip = function (x) { return '<span class="bi-chip">' + x + '</span>'; };
      guideHTML =
        '<div class="gd-col"><h4>Сборка <span class="bi-tier">' + (b.tier || guide.tier || '') + '</span></h4>' +
          '<div class="bi-grp"><span class="bi-lbl">Старт</span>' + (it.starting || []).map(chip).join('') + '</div>' +
          '<div class="bi-grp"><span class="bi-lbl">Ядро</span>' + (it.core || []).map(chip).join('') + '</div>' +
          '<div class="bi-grp"><span class="bi-lbl">Ботинки</span>' + (it.boots || []).map(chip).join('') + '</div></div>' +
        '<div class="gd-col"><h4>Руны</h4><div class="bi-grp">' + (guide.runes || []).map(chip).join('') + '</div>' +
          '<h4>Заклинания</h4>' + (guide.spells || []).map(function (s) { return '<div class="sp-row"><span>' + s.combo + '</span><b class="wr-g">' + s.wr + '%</b></div>'; }).join('') + '</div>' +
        '<div class="gd-col"><h4>Прокачка</h4>' + (guide.skillOrder || []).map(function (s) { return '<div class="sk-row"><span>' + s.ability + '</span><span class="sk-lv">' + (s.levels || []).join(' · ') + '</span></div>'; }).join('') + '</div>';
    } else {
      guideHTML = '<div class="gd-col"><span class="demo">гайд загружается…</span></div>';
    }

    /* матчапы 3 секции */
    var mHTML;
    if (guide && guide.matchups && guide.matchups[0]) {
      var m = guide.matchups[0];
      var sec = function (title, arr, cls) {
        return '<div class="mu-sec"><h4 class="' + cls + '">' + title + '</h4>' +
          (arr || []).slice(0, 4).map(function (x) {
            var mc = ch(x.name) || ch(x.slug);
            var av = mc ? '<img class="mu-ic" src="' + icon(mc) + '" alt="" onerror="this.remove()">' : '';
            return '<button class="mu-row" data-champ="' + (mc ? mc.n : '') + '">' + av + '<span class="mu-n">' + x.name + '</span><b class="' + wrCls(x.wr) + '">' + x.wr + '%</b></button>';
          }).join('') + '</div>';
      };
      mHTML = sec('Силён против', m.best, 'mu-good') + sec('Слаб против', m.worst, 'mu-bad') +
        '<div class="mu-sec"><h4 class="mu-combo">Контрики</h4>' + (guide.counters || []).map(function (n) { return '<span class="bi-chip">' + n + '</span>'; }).join('') + '</div>';
    } else {
      mHTML = '<span class="demo">матчапы загружаются…</span>';
    }

    /* YouTube + стримы (демо-встраивания по чемпу) */
    var q = encodeURIComponent(c.n + ' Wild Rift guide');
    var ytHTML =
      '<div class="yt-col"><h4>Видео по чемпу <span class="demo">демо</span></h4>' +
        '<div class="yt-list">' +
          ['гайд', 'комбо', 'матчапы'].map(function (t) {
            return '<a class="yt-card" href="https://www.youtube.com/results?search_query=' + q + '+' + encodeURIComponent(t) + '" target="_blank" rel="noopener">' +
              '<span class="yt-thumb" style="background:' + c.g + '"></span><span class="yt-t">' + c.n + ' — ' + t + '</span></a>';
          }).join('') + '</div></div>' +
      '<div class="yt-col"><h4>Live-стримы <span class="demo">демо</span></h4>' +
        '<div class="yt-list">' +
          ['Challenger', 'PRO'].map(function (t) {
            return '<a class="yt-card live" href="https://www.twitch.tv/search?term=' + q + '" target="_blank" rel="noopener">' +
              '<span class="yt-thumb" style="background:' + c.g + '"><span class="yt-live">LIVE</span></span><span class="yt-t">' + t + ' · ' + c.n + '</span></a>';
          }).join('') + '</div></div>';

    return '<div class="cp-page">' +
      '<div class="cp-head panel glass glass--strong">' +
        '<button class="cp-back" data-back="champs" title="Назад к чемпионам">‹ Чемпионы</button>' +
        '<img class="cp-ava" src="' + icon(c) + '" srcset="' + iconSet(c) + '" sizes="88px" alt="' + c.n + '" onerror="this.style.background=\'' + c.g + '\';this.removeAttribute(\'src\')">' +
        '<div class="cp-id"><div class="cp-name">' + c.n + '</div><div class="cp-sub">' + c.role + ' · Тир ' + tierT + '</div>' +
          '<div class="cp-badges"><span class="cp-patch">Патч ' + patch + '</span><span class="cp-trend ' + trend + '">' + badge + ' ' + (c.tr >= 0 ? '+' : '') + c.tr.toFixed(1) + '</span></div></div>' +
      '</div>' +
      '<div class="cp-grid">' +
        '<div class="panel glass cp-stats"><h3>Статы <span class="lvl-mini">ур. <b class="cp-lv">' + champLevel + '</b></span>' +
          '<input type="range" class="cp-lvl" min="1" max="15" value="' + champLevel + '"></h3>' +
          statRow('Атака', 'ad', c) + statRow('Здоровье', 'hp', c) + statRow('Мана', 'mana', c) +
          statRow('Броня', 'ar', c) + statRow('Сопр. магии', 'mr', c) +
          '<div class="cs-row"><span class="cs-l">WinRate</span><b class="cs-v ' + wrCls(c.wr) + '">' + c.wr.toFixed(1) + '%</b></div></div>' +
        '<div class="panel glass cp-abil"><h3>Умения</h3>' + abilHTML + '</div>' +
        '<div class="panel glass cp-guide"><h3>Сборка · Руны · Прокачка</h3><div class="gd-wrap">' + guideHTML + '</div></div>' +
        '<div class="panel glass cp-mu"><h3>Матчапы</h3><div class="mu-wrap">' + mHTML + '</div></div>' +
        '<div class="panel glass cp-yt"><h3>YouTube · Стримы</h3><div class="yt-wrap">' + ytHTML + '</div></div>' +
      '</div></div>';
  }
  function wireChampPage(host, c) {
    var back = host.querySelector('[data-back]');
    if (back) back.onclick = function () { champsGrid(host); };
    var lv = host.querySelector('.cp-lvl');
    if (lv) lv.oninput = function () {
      champLevel = +lv.value;
      var num = host.querySelector('.cp-lv'); if (num) num.textContent = champLevel;
      /* пересчёт ТОЛЬКО чисел статов (без пересборки страницы) */
      var rows = host.querySelectorAll('.cp-stats .cs-row');
      ['ad', 'hp', 'mana', 'ar', 'mr'].forEach(function (k, i) {
        if (rows[i]) rows[i].querySelector('.cs-v').textContent = scaleStat(c[k]);
      });
    };
    /* ЗАКОН СВЯЗЕЙ: клик по матчап-чемпу → его страница */
    host.querySelectorAll('.mu-row[data-champ]').forEach(function (b) {
      var n = b.getAttribute('data-champ');
      if (n) b.onclick = function () { openChampPage(n); };
    });
  }

  /* ============================================================
     ПРЕДМЕТЫ — сетка (вид магазина WR) → карточка с 3 вкладками.
     Числа/зачарования из wr-combat-data.md (7.x); где нет надёжно — демо.
     ============================================================ */
  var ITEMS = [
    { id: 'bork', n: 'Клинок Раина', cat: 'Атака', cost: 3000, g: 'linear-gradient(135deg,#e0506a,#5a0a1a)', stats: [['Сила атаки', 40], ['Скор. атаки', '25%'], ['Вампиризм', '10%']], pass: 'Он-хит: 6% (ближ)/4% (даль) текущего HP цели физ. 3 атаки → −25% МС цели.', from: ['Меч сокрушителя', 'Кинжал'], into: [], who: ['Соло', 'АДК'], demoPass: false },
    { id: 'trin', n: 'Тринити Форс', cat: 'Атака', cost: 3333, g: 'linear-gradient(135deg,#f0b84a,#7a4a10)', stats: [['Сила атаки', 30], ['Скор. атаки', '30%'], ['Здоровье', 200], ['МС', '5%']], pass: 'Spellblade: 200% базового AD физ после умения. +5% МС (до +15% стаки).', from: ['Меч Шеррида', 'Молот рассвета'], into: [], who: ['Соло', 'Лес'], demoPass: false },
    { id: 'wits', n: 'Конец разума', cat: 'Атака', cost: 2800, g: 'linear-gradient(135deg,#6ab0c0,#1a3a4a)', stats: [['Скор. атаки', '40%'], ['Сопр. магии', 40], ['МС', '5%']], pass: 'Он-хит: 15–80 маг (по ур.). HP<50% → вампиризм от он-хита.', from: ['Клинок мечника', 'Плащ агилити'], into: [], who: ['АДК', 'Соло'], demoPass: false },
    { id: 'nash', n: 'Зуб Нашора', cat: 'Магия', cost: 3000, g: 'linear-gradient(135deg,#9b6bff,#2a0a5a)', stats: [['Сила умений', 90], ['Скор. атаки', '50%']], pass: 'Он-хит: 15 + 15% AP маг.', from: ['Утерянная глава', 'Клинок мечника'], into: [], who: ['Мид'], demoPass: false },
    { id: 'divine', n: 'Божественный раскол', cat: 'Атака', cost: 3300, g: 'linear-gradient(135deg,#e07a3a,#5a2a0a)', stats: [['Сила атаки', 40], ['Здоровье', 300], ['Ускор. умений', 20]], pass: 'Spellblade: 10%(ближ)/7%(даль) макс.HP цели физ (мин 100% базового AD). Вост. 7% макс.HP цели.', from: ['Меч сокрушителя', 'Кристалл рубина'], into: [], who: ['Соло', 'Лес'], demoPass: false },
    { id: 'cleaver', n: 'Чёрный тесак', cat: 'Атака', cost: 3100, g: 'linear-gradient(135deg,#555566,#1a1a22)', stats: [['Сила атаки', 45], ['Здоровье', 350], ['Ускор. умений', 25]], pass: 'Атаки/умения режут броню цели до −24% (6 стаков).', from: ['Меч сокрушителя', 'Пояс великана'], into: [], who: ['Соло'], demoPass: true },
    { id: 'void', n: 'Пустотный аметист', cat: 'Магия', cost: 1000, g: 'linear-gradient(135deg,#b48cff,#3a1a6e)', stats: [['Сила умений', 25], ['Маг. пробитие', '8%']], pass: '⚠ Название/числа 7.2 — сверить в клиенте.', from: [], into: [], who: ['Мид', 'Саппорт'], demoPass: true },
    { id: 'steelcaps', n: 'Стальные набивки', cat: 'Ботинки', cost: 1350, g: 'linear-gradient(135deg,#7aa2c4,#2a3a4a)', stats: [['Броня', 20], ['МС', 45]], pass: 'Снижает урон от авто-атак на 12%. T3 (+1000g): активка на выбор.', from: ['Ботинки скорости'], into: [], who: ['Соло', 'Лес'], demoPass: false },
    { id: 'boots1', n: 'Ботинки скорости', cat: 'Ботинки', cost: 500, g: 'linear-gradient(135deg,#8b8ba0,#3a3a44)', stats: [['МС', 20]], pass: 'База для T2/T3 ботинок.', from: [], into: ['Стальные набивки'], who: ['Все'], demoPass: false }
  ];
  var itemFilter = 'Все', itemSearch = '';
  var GOLD = { 'Сила атаки': 35, 'Сила умений': 22, 'Здоровье': 2.7, 'Броня': 20, 'Сопр. магии': 18, 'Скор. атаки': 25, 'МС': 12, 'Ускор. умений': 34, 'Маг. пробитие': 0, 'Вампиризм': 0, 'Слоу-рез': 0 };
  function goldEff(it) {
    var raw = 0, known = true;
    it.stats.forEach(function (s) {
      var v = typeof s[1] === 'number' ? s[1] : parseFloat(s[1]);
      var per = GOLD[s[0]];
      if (per == null || isNaN(v)) { known = false; return; }
      raw += v * per;
    });
    return { raw: Math.round(raw), pct: it.cost ? Math.round(raw / it.cost * 100) : 0, known: known };
  }
  function itemsGrid(host) {
    var cats = ['Все', 'Атака', 'Магия', 'Ботинки'];
    var list = ITEMS.filter(function (it) {
      return (itemFilter === 'Все' || it.cat === itemFilter) && (!itemSearch || it.n.toLowerCase().indexOf(itemSearch.toLowerCase()) >= 0);
    });
    var cells = list.map(function (it) {
      return '<button class="ig-cell" data-item="' + it.id + '" title="' + it.n + '">' +
        '<span class="ig-ic" style="background:' + it.g + '"></span>' +
        '<span class="ig-n">' + it.n + '</span><span class="ig-cost">' + it.cost + ' з</span></button>';
    }).join('');
    labMorph(host,
      '<header class="sec-head"><h1>Предметы</h1>' +
        '<div class="chips glass">' + cats.map(function (r) { return '<button class="chip-btn ' + (r === itemFilter ? 'active' : '') + '" data-icat="' + r + '">' + r + '</button>'; }).join('') + '</div>' +
        '<div class="head-right"><div class="pk-search cg-search"><input type="text" id="itSearch" placeholder="Поиск предмета..." value="' + itemSearch + '"></div></div></header>' +
      '<div class="ig-grid">' + cells + '</div>');
    host.querySelectorAll('[data-icat]').forEach(function (b) { b.onclick = function () { itemFilter = b.getAttribute('data-icat'); itemsGrid(host); }; });
    var s = host.querySelector('#itSearch');
    if (s) s.oninput = function () { itemSearch = s.value; itemsGrid(host); var f = host.querySelector('#itSearch'); if (f) { f.focus(); f.setSelectionRange(f.value.length, f.value.length); } };
    host.querySelectorAll('[data-item]').forEach(function (b) { b.onclick = function () { openItemCard(host, b.getAttribute('data-item')); }; });
  }
  var _itemTab = 'desc';
  function openItemCard(host, id) {
    var it = ITEMS.find(function (x) { return x.id === id; }); if (!it) return;
    labMorph(host, itemCardHTML(it));
    wireItemCard(host, it);
    playIn(host.querySelector('.ic-card'));
  }
  function itemCardHTML(it) {
    var ge = goldEff(it);
    var tab = _itemTab;
    var body;
    if (tab === 'tree') {
      body = '<div class="ic-tree"><div class="ic-grp"><span class="bi-lbl">Из чего</span>' +
        (it.from.length ? it.from.map(function (x) { return '<span class="bi-chip">' + x + '</span>'; }).join('') : '<span class="demo">базовый</span>') + '</div>' +
        '<div class="ic-grp"><span class="bi-lbl">Входит в</span>' +
        (it.into.length ? it.into.map(function (x) { return '<span class="bi-chip">' + x + '</span>'; }).join('') : '<span class="demo">финальный</span>') + '</div></div>';
    } else if (tab === 'gold') {
      body = '<div class="ic-gold">' +
        '<div class="ic-grow"><span>Статы стоят</span><b>' + ge.raw + ' з</b></div>' +
        '<div class="ic-grow"><span>Цена</span><b>' + it.cost + ' з</b></div>' +
        '<div class="ic-bar"><div class="ic-fill" style="width:' + Math.min(100, ge.pct) + '%"></div></div>' +
        '<div class="ic-eff">Золото-эффективность: <b class="' + (ge.pct >= 100 ? 'wr-g' : 'wr-b') + '">' + ge.pct + '%</b>' + (ge.known ? '' : ' <span class="demo">пассив не учтён</span>') + '</div>' +
        '<div class="ic-who"><span class="bi-lbl">Кому брать</span>' + it.who.map(function (r) { return '<span class="bi-chip">' + r + '</span>'; }).join('') + '</div>' +
        '<div class="demo" style="margin-top:8px">золото-цены статов — экспертная оценка</div></div>';
    } else {
      body = '<div class="ic-desc"><div class="ic-stats">' +
        it.stats.map(function (s) { return '<div class="cs-row"><span class="cs-l">' + s[0] + '</span><b class="cs-v">' + s[1] + '</b></div>'; }).join('') + '</div>' +
        '<div class="ic-pass"><b>Пассив.</b> ' + it.pass + (it.demoPass ? ' <span class="demo">демо</span>' : '') + '</div></div>';
    }
    var tabs = [['desc', 'Описание'], ['tree', 'Дерево'], ['gold', 'Золото + кому']];
    return '<div class="ic-card panel glass">' +
      '<div class="ic-head"><button class="cp-back" data-back="items">‹ Предметы</button>' +
        '<span class="ic-ic glass--strong" style="background:' + it.g + '"></span>' +
        '<div class="ic-id"><div class="ic-name">' + it.n + '</div><div class="ic-sub">' + it.cat + ' · ' + it.cost + ' з</div></div></div>' +
      '<div class="subtabs glass ic-tabs" role="tablist">' + tabs.map(function (t) {
        return '<button class="subtab ' + (t[0] === tab ? 'active' : '') + '" data-itab="' + t[0] + '">' + t[1] + '</button>';
      }).join('') + '</div>' +
      '<div class="ic-body">' + body + '</div></div>';
  }
  function wireItemCard(host, it) {
    var back = host.querySelector('[data-back="items"]');
    if (back) back.onclick = function () { itemsGrid(host); };
    host.querySelectorAll('[data-itab]').forEach(function (b) {
      b.onclick = function () { _itemTab = b.getAttribute('data-itab'); openItemCard(host, it.id); };
    });
  }

  /* ============================================================
     ⚙ НАСТРОЙКИ ЮЗЕРА — арт фона + акцент (blur/dark/сила = утв. дефолты, тут НЕТ)
     ============================================================ */
  var DD = 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash';
  var ARTS = [
    { v: 'thresh', t: 'Thresh', key: 'Thresh', kind: 'dark' },
    { v: 'yasuo',  t: 'Yasuo',  key: 'Yasuo',  kind: 'dark' },
    { v: 'lux',    t: 'Lux',    key: 'Lux',    kind: 'light' },
    { v: 'soraka', t: 'Soraka', key: 'Soraka', kind: 'light' },
    { v: 'jinx',   t: 'Jinx',   key: 'Jinx',   kind: 'busy' },
    { v: 'ahri',   t: 'Ahri',   key: 'Ahri',   kind: 'busy' }
  ];
  var KIND_LBL = { dark: 'Тёмные — легко читается', light: 'СВЕТЛЫЕ — худший случай (тут проверяй)', busy: 'Пёстрые' };
  var SPLASH = { brand: 'radial-gradient(ellipse at 28% 18%,rgba(255, 255, 255,.38),transparent 55%),radial-gradient(ellipse at 78% 82%,rgba(200,155,60,.30),transparent 55%),linear-gradient(135deg,#02121f,#0a0617)' };
  ARTS.forEach(function (a) { SPLASH[a.v] = "url('" + DD + '/' + a.key + "_0.jpg')"; });
  var splashEl = $('.splash');
  var curSplash = 'thresh';
  function applySplash() {
    splashEl.style.backgroundImage = SPLASH[curSplash] || SPLASH.thresh;
  }

  var pop = document.getElementById('settingsPop');
  function buildSettings() {
    function row(kind) {
      return '<div class="ss-kind">' + KIND_LBL[kind] + '</div><div class="ss-splash">' +
        ARTS.filter(function (a) { return a.kind === kind; }).map(function (a) {
          return '<button class="ss-thumb' + (curSplash === a.v ? ' on' : '') + '" data-v="' + a.v + '" style="background-image:url(\'' + DD + '/' + a.key + '_0.jpg\')"><span>' + a.t + '</span></button>';
        }).join('') + '</div>';
    }
    /* ⚙ юзера: колонки таблицы (порт getStatsCols) + цветовая схема заливки */
    /* Ползунок ширины таблиц — настройка ЮЗЕРА, одна на Статс и WinRate.
       660px = читаемая узкая колонка · 1500px = во всю доступную ширину. Дефолт 1050 (не максимум). */
    var widthUI = '<div class="set-block"><label>Ширина таблиц <span class="val" id="twVal">' + tblW + 'px</span></label>' +
      '<input type="range" id="twRange" min="660" max="1440" step="20" value="' + tblW + '">' +
      '<span class="ss-hint">Одна на Статс и WinRate — чтобы не разъезжались.</span></div>' +
      '<div class="set-block"><label class="set-toggle"><input type="checkbox" id="setChampShade"' +
        (app.getAttribute('data-champshade') !== 'off' ? ' checked' : '') + '> Шторка винрейта при ховере чемпов</label>' +
        '<span class="ss-hint">Выезжает WR снизу иконки чемпа (тир-мейкер, сетки).</span></div>';

    var colsUI = '<div class="set-block"><label>Колонки таблицы Статс</label><div class="col-list">' +
      COL_DEFS.map(function (c) {
        var u = statIcon(c.ico);
        return '<label class="col-row">' +
          '<input type="checkbox" data-col="' + c.key + '"' + (colHidden[c.key] ? '' : ' checked') + '>' +
          (u ? '<img class="st-ico" src="' + u + '" alt="">' : '<span style="width:14px"></span>') +
          '<span>' + c.label + '</span></label>';
      }).join('') + '</div></div>' +
      '<div class="set-block"><label>Схема заливки по рейтингу</label>' +
        '<div class="seg" id="setScheme">' +
          '<button data-v="rg" class="' + (fillScheme === 'rg' ? 'active' : '') + '">Красный↔Зелёный</button>' +
          '<button data-v="cb" class="' + (fillScheme === 'cb' ? 'active' : '') + '">Янтарь↔Лазурь</button>' +
        '</div>' +
        '<label style="margin-top:6px"><input type="checkbox" id="setInvert"' + (fillInvert ? ' checked' : '') + '> Инвертировать (выше = зелёный)</label>' +
      '</div>';

    $('#ssHost').innerHTML = widthUI + colsUI +
      '<div class="set-block"><label>Арт фона за стеклом — ОДИН на весь сайт</label>' +
      row('dark') + row('light') + row('busy') +
      '<div class="ss-kind">Без арта</div><div class="ss-splash"><button class="ss-thumb ss-thumb-grad' + (curSplash === 'brand' ? ' on' : '') + '" data-v="brand"><span>Бренд</span></button></div></div>';
    /* ширина таблиц — ТОЛЬКО CSS-переменная, таблица не пересобирается (0 узлов) */
    var tw = $('#twRange'), twv = $('#twVal');
    if (tw) tw.oninput = function () {
      tblW = +tw.value;
      /* верхний конец = БЕЗ ограничения: иначе на широком мониторе ползунок
         упирается в доступное место и верхняя половина хода ничего не делает */
      var atMax = tblW >= +tw.max;
      root.style.setProperty('--tbl-w', atMax ? 'none' : tblW + 'px');
      twv.textContent = atMax ? 'вся ширина' : tblW + 'px';
      updateChoice();
    };

    /* колонки */
    $('#ssHost').querySelectorAll('input[data-col]').forEach(function (cb) {
      cb.onchange = function () {
        colHidden[cb.getAttribute('data-col')] = !cb.checked;
        refreshTable(); updateChoice();
      };
    });
    /* тумблер «шторка винрейта при ховере чемпов» — атрибут на app, CSS гейтит .tile-shade (0 узлов) */
    var cs = $('#setChampShade');
    if (cs) cs.onchange = function () { app.setAttribute('data-champshade', cs.checked ? 'on' : 'off'); updateChoice(); };
    /* схема заливки */
    var sc = $('#setScheme');
    if (sc) sc.querySelectorAll('button').forEach(function (b) {
      b.onclick = function () {
        fillScheme = b.getAttribute('data-v');
        sc.querySelectorAll('button').forEach(function (x) { x.classList.toggle('active', x === b); });
        refreshTable(); updateChoice();
      };
    });
    var inv = $('#setInvert');
    if (inv) inv.onchange = function () { fillInvert = inv.checked; refreshTable(); updateChoice(); };

    $('#ssHost').querySelectorAll('.ss-thumb').forEach(function (b) {
      b.onclick = function () {
        curSplash = b.getAttribute('data-v');
        $('#ssHost').querySelectorAll('.ss-thumb').forEach(function (x) { x.classList.toggle('on', x === b); });
        applySplash(); updateChoice();
      };
    });
  }
  $('#gearBtn').onclick = function (e) { e.stopPropagation(); var show = pop.hidden; pop.hidden = !pop.hidden; if (show) { buildSettings(); playIn(pop); } };
  $('#setClose').onclick = function () { pop.hidden = true; };

  function hexRgba(hex, a) {
    var h = hex.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return 'rgba(' + parseInt(h.slice(0, 2), 16) + ',' + parseInt(h.slice(2, 4), 16) + ',' + parseInt(h.slice(4, 6), 16) + ',' + a + ')';
  }
  var curAccent = '#ffffff';
  pop.querySelectorAll('.sw').forEach(function (sw) {
    sw.onclick = function () {
      curAccent = sw.getAttribute('data-accent');
      pop.querySelectorAll('.sw').forEach(function (x) { x.classList.toggle('active', x === sw); });
      root.style.setProperty('--accent', curAccent);
      root.style.setProperty('--accent-glow', hexRgba(curAccent, .45));
      updateChoice();
    };
  });

  /* ============================================================
     ДЕВ-ПОЛОСА — варианты раскладки/размеров + «мой выбор» + drag
     ============================================================ */
  var choiceText = $('#choiceText');
  function segState(id) { var b = $('#' + id + ' button.active'); return b ? b.textContent.trim() : '?'; }
  function updateChoice() {
    var s = 'Навигация <b>' + segState('optNav') + '</b> · вкладки <b>' + segState('optTabs') + '</b> · плотность <b>' + segState('optDens') +
      '</b> · ширина <b>' + segState('optWidth') +
      '</b> · правая колонка <b>' + segState('optRight') + '</b> · пикер <b>' + segState('optPick') +
      '</b> · шторка <b>' + segState('optShade') + '</b> · уровень <b>' + segState('optLvl') +
      '</b> · форма вкладки <b>' + segState('optRailShape') + '</b> · ховер рельса <b>' + segState('optRailHover') +
      '</b> · шапка <b>' + segState('optSticky') +
      '</b> · ховер строки <b>' + segState('optHover') + '</b> · спарклайн <b>' + segState('optSpark') +
      '</b> · арт <b>' + curSplash + '</b> · акцент <b>' + curAccent +
      '</b> · тёмность STRONG <b>' + strongVal.textContent + '</b>';
    choiceText.innerHTML = 'Ваш выбор: ' + s;
    return choiceText.textContent;
  }

  /* сегменты дев-полосы: [id, применить(value)] */
  var DENS = { cozy: ['52px', '14px'], normal: ['44px', '13px'], dense: ['36px', '12px'] };
  var WIDTH = { full: 'none', wide: '1400px', narrow: '1100px' };
  function bindSeg(id, apply) {
    var box = $('#' + id);
    if (!box) return;
    box.querySelectorAll('button').forEach(function (b) {
      b.onclick = function () {
        box.querySelectorAll('button').forEach(function (x) { x.classList.toggle('active', x === b); });
        apply(b.getAttribute('data-v'));
        updateChoice();
      };
    });
  }
  bindSeg('optNav', function (v) { app.classList.toggle('nav-top', v === 'top'); if (v === 'top') app.classList.remove('rail-open'); });
  bindSeg('optTabs', function (v) { app.setAttribute('data-tabs', v); });
  bindSeg('optDens', function (v) { root.style.setProperty('--row-h', DENS[v][0]); root.style.setProperty('--tbl-font', DENS[v][1]); });
  bindSeg('optWidth', function (v) { root.style.setProperty('--content-max', WIDTH[v]); });
  bindSeg('optRight', function (v) { rightMode = v; render(); });
  /* ТОЛЬКО data-атрибут: все 6 видов пикера различаются ЧИСТО CSS, узлы не трогаем */
  bindSeg('optPick', function (v) { pickView = v; app.setAttribute('data-pick', v); });
  bindSeg('optPkSize', function (v) { app.setAttribute('data-pksize', v); });
  /* содержимое шторки меняется — но перерисовываем ТОЛЬКО шторки, не пикер целиком */
  bindSeg('optShade', function (v) {
    shadeMode = v;
    app.setAttribute('data-shade', v === 'off' ? 'off' : 'on');
    pane().querySelectorAll('.pk-cell[data-pick]').forEach(function (el) {
      var sh = el.querySelector('.pk-shade'); var c = ch(el.getAttribute('data-pick'));
      if (sh && c) sh.innerHTML = shadeHtml(c);
    });
  });
  /* меняем ТОЛЬКО блок уровня */
  bindSeg('optLvl', function (v) {
    lvlView = v;
    var old = pane().querySelector('.lvl-block');
    if (!old) { render(); return; }
    var tmp = document.createElement('div'); tmp.innerHTML = lvlBlock();
    old.replaceWith(tmp.firstElementChild);
    wireLevel();
  });
  bindSeg('optTip', function (v) { tipMode = v; refreshTable(); });
  bindSeg('optPatch', function (v) { patchMode = v; refreshTable(); });
  bindSeg('optFill', function (v) { fillStrength = v; fillOn = (v !== 'none'); refreshTable(); });
  bindSeg('optFillShape', function (v) { fillShape = v; refreshTable(); });
  bindSeg('optIcons', function (v) { iconMode = v; app.setAttribute('data-icons', v); refreshTable(); });
  /* меняем ТОЛЬКО полоску ролей */
  bindSeg('optRoleView', function (v) {
    roleView = v;
    var box = pane().querySelector('.pk-roles');
    if (!box) return;
    box.setAttribute('data-roleview', v);
    box.querySelectorAll('.pk-rf').forEach(function (b) {
      var t = b.querySelector('.rf-t'), ic = b.querySelector('.rf-ico');
      if (!ic) return;                       /* кнопка «Все» — текст оставляем всегда */
      if (t) t.style.display = (v === 'icons') ? 'none' : '';
    });
  });
  bindSeg('optRailShape', function (v) { app.setAttribute('data-railshape', v); });
  bindSeg('optRailHover', function (v) { app.setAttribute('data-railhover', v); });
  bindSeg('optSticky', function (v) { app.setAttribute('data-sticky', v); });
  bindSeg('optHover', function (v) { app.setAttribute('data-hover', v); });
  bindSeg('optSpark', function (v) { app.setAttribute('data-spark', v); });

  /* ползунок «Тёмность STRONG» (--glass-dark-strong) — подбор на светлом арте Lux */
  var strongRange = document.getElementById('strongRange');
  var strongVal = document.getElementById('strongVal');
  strongRange.oninput = function () {
    var v = parseFloat(strongRange.value).toFixed(2);
    root.style.setProperty('--glass-dark-strong', v);
    strongVal.textContent = v;
    updateChoice();
  };

  /* свернуть/развернуть */
  var strip = document.getElementById('labStrip');
  var minBtn = document.getElementById('stripMin');
  minBtn.onclick = function () { var m = strip.classList.toggle('min'); minBtn.textContent = m ? 'Развернуть' : 'Свернуть'; };

  /* копировать */
  var COPY = '📋 Скопировать мой выбор';
  var copyBtn = document.getElementById('stripCopy');
  copyBtn.onclick = function () {
    var s = updateChoice();
    function ok() { copyBtn.textContent = 'Скопировано ✓'; setTimeout(function () { copyBtn.textContent = COPY; }, 1200); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(s).then(ok, ok); else ok();
  };

  /* перетаскивание за грип */
  var head = document.getElementById('stripHead');
  var drag = false, offX = 0, offY = 0;
  head.addEventListener('mousedown', function (e) {
    if (e.target.closest('.strip-min-btn')) return;
    var r = strip.getBoundingClientRect();
    strip.style.transform = 'none'; strip.style.left = r.left + 'px'; strip.style.top = r.top + 'px';
    offX = e.clientX - r.left; offY = e.clientY - r.top; drag = true; e.preventDefault();
  });
  window.addEventListener('mousemove', function (e) {
    if (!drag) return;
    var x = Math.max(0, Math.min(e.clientX - offX, window.innerWidth - strip.offsetWidth));
    var y = Math.max(0, Math.min(e.clientY - offY, window.innerHeight - strip.offsetHeight));
    strip.style.left = x + 'px'; strip.style.top = y + 'px';
  });
  window.addEventListener('mouseup', function () { drag = false; });

  /* ── старт ── */
  applySplash();
  render();
  updateChoice();
})();
