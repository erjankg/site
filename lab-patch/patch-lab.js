/* ============================================================
   lab-patch — экран «Патчи» (патч-ноты). Канон DESIGN.md.
   ПЕРВАЯ РЕАЛЬНАЯ реализация патч-вида для РЕЛЬСА (боевой = заглушка app.js:6639).

   ★ СХЕМА 1-в-1 С БОЕВЫМ Firestore (одобрено Эржаном 2026-07-25) — это ПОРТ, не рескин:
     • patchnotes  → чемпионы     {champion, type:buff/nerf/adjust, change, patch, timestamp}
     • changesFeed → всё остальное {type:news/patch/buff/nerf/adjust, title, text, patch, timestamp}
     • changelog   → предметы/руны {entity:item/rune, type:add/edit/delete, name, timestamp}
   Демо ниже имеет РОВНО ту же форму. Порт = снять флаг USE_LIVE → читаем window.*-глобалы.
   Поля-«обогащение» (key/wr/role/before/after/field/top/cat) авто-импортёр заполняет когда может;
   вид без них деградирует мягко (иконка-заглушка, нет спарклайна и т.п.).

   ВСЕ ЧИСЛА = ДЕМО (структура патча 7.2 как пример, помечено в UI). Чистый JS.
   Дёрганье НЕ тащим: фильтр/поиск = ТОЧЕЧНЫЙ ре-рендер (toggle видимости), НЕ innerHTML на всё.
   ============================================================ */
(function () {
'use strict';

var USE_LIVE = false; // ПОРТ: true → читать реальные коллекции (window._cmsPatchnotes/_changesFeed/_cmsChangelogCache)

var DD_VER = '14.24.1';
function champIcon(dd) { return 'https://ddragon.leagueoflegends.com/cdn/' + DD_VER + '/img/champion/' + dd + '.png'; }
function itemImg(slug) { return 'https://www.wildriftfire.com/images/items/' + slug + '.png'; }
function runeImg(slug) { return 'https://www.wildriftfire.com/images/runes/' + slug + '.png'; }

/* ---------- категории (для группировки в ленте) ---------- */
var CATS = [
  { k:'champ',  label:'Чемпионы', ic:'⚔' },
  { k:'item',   label:'Предметы', ic:'🗡' },
  { k:'rune',   label:'Руны',     ic:'🔮' },
  { k:'system', label:'Системы',  ic:'⚙' }
];
var CAT_LABEL = {}; CATS.forEach(function (c) { CAT_LABEL[c.k] = c; });

/* ---------- типы изменений = РЕАЛЬНЫЕ значения Firestore ----------
   patchnotes/changesFeed: buff/nerf/adjust · changesFeed: news · changelog: add/delete(→del)/edit(→adjust) */
var TYPES = {
  buff:   { ic:'🟢', label:'Бафф',    lnk:'усиление' },
  nerf:   { ic:'🔴', label:'Нерф',    lnk:'ослабление' },
  adjust: { ic:'🟡', label:'Правка',  lnk:'корректировка' },
  add:    { ic:'✨', label:'Новое',   lnk:'добавлено' },
  del:    { ic:'🗑', label:'Удалено', lnk:'убрано' },
  news:   { ic:'📣', label:'Новость', lnk:'новость' }
};
var SYS_IC = '🌀';

/* ============================================================
   ДЕМО-ДАННЫЕ — форма коллекций Firestore (структура 7.2 как образец)
   ============================================================ */
var DEMO = {
  // collection: patchnotes  (чемпионы). Обогащение: key/field/before/after/note/wr/role/top
  patchnotes: [
    { champion:'Люкс', key:'Lux', type:'buff', patch:'7.2', field:'R «Финальная вспышка» — перезарядка', before:'80с', after:'70с', top:1,
      change:'Быстрее добивает на миду, возвращается в мету.', wr:[48.9,49.2,49.6,50.1,50.7,51.2,51.6], role:'Маг · мид' },
    { champion:'Ясуо', key:'Yasuo', type:'nerf', patch:'7.2', field:'Q «Стальной вихрь» — урон', before:'60', after:'45',
      change:'Слишком сильное давление в ранней. Урон базы снижен.', wr:[52.4,51.8,51.1,50.6,50.0,49.4,48.8], role:'Боец · мид/топ' },
    { champion:'Дариус', key:'Darius', type:'buff', patch:'7.2', field:'Пассив «Кровотечение» — урон/стак', before:'8', after:'10',
      change:'Мощнее душит в клинче.', wr:[49.6,49.9,50.2,50.5,50.8,51.0,51.3], role:'Боец · топ' },
    { champion:'Малфит', key:'Malphite', type:'nerf', patch:'7.1', field:'W «Землетрясение» — броня', before:'30', after:'22',
      change:'Слишком безопасный в ранней.', wr:[52.0,51.5,51.0,50.4,49.9,49.5,49.0], role:'Танк · топ' },
    { champion:'Наами', key:'Nami', type:'buff', patch:'7.1', field:'E «Прилив» — урон', before:'25', after:'40',
      change:'Активнее поддержка в тимфайтах.', wr:[48.5,48.9,49.4,49.9,50.3,50.7,51.0], role:'Поддержка' },
    { champion:'Джинкс', key:'Jinx', type:'buff', patch:'7.0', field:'Пассив «Ажиотаж» — скорость атаки', before:'+75%', after:'+90%',
      change:'Гипер-керри возвращается в лейт.', wr:[49.0,49.4,49.9,50.5,51.1,51.6,52.0], role:'Стрелок' }
  ],
  // collection: changesFeed  (сводки + всё не-чемпионское). Обогащение: cat/key/field/before/after/top
  changesFeed: [
    { type:'patch', patch:'7.2', date:'15 июля 2026',
      title:'Мета-сдвиг: крит-АДК придержали, маги в фаворе. Вышла Амбесса, переработан Барон.' },
    { type:'news', patch:'7.2', cat:'champ', key:'Ambessa', title:'Амбесса', top:2, field:'Новый чемпион',
      text:'Боец-дуэлянт с цепочками умений. Роль: соло-лайн / лес.', role:'Боец · соло/лес', after:'Выход' },
    { type:'nerf', patch:'7.2', cat:'item', key:'infinity-edge', title:'Грань Бесконечности', top:3, field:'Бонус крит-урона', before:'40%', after:'35%',
      text:'Ядро всех крит-АДК. Урезали пик поздней игры.' },
    { type:'buff', patch:'7.2', cat:'item', key:'bloodthirster', title:'Жажда крови', field:'Вампиризм', before:'18%', after:'20%',
      text:'Больше устойчивости для АДК против бёрста.' },
    { type:'nerf', patch:'7.2', cat:'rune', key:'conqueror', title:'Завоеватель', field:'Макс. стаков', before:'12', after:'10',
      text:'Медленнее раскачивается в затяжном бою.' },
    { type:'buff', patch:'7.2', cat:'rune', key:'electrocute', title:'Электрокьют', field:'Перезарядка', before:'25с', after:'20с',
      text:'Чаще прокает бёрст-комбо.' },
    { type:'news', patch:'7.2', cat:'rune', key:'second-wind', title:'Второе дыхание', field:'Новая руна', after:'Новая',
      text:'Восстанавливает HP после получения урона на лайне.' },
    { type:'nerf', patch:'7.2', cat:'system', title:'Барон Нашор', field:'Бонус к урону по строениям', before:'+50%', after:'+35%',
      text:'Взятие Барона реже мгновенно решало игру.' },
    { type:'news', patch:'7.2', cat:'system', title:'Душа дракона: Хаос', field:'Новая душа', after:'Новая',
      text:'4-й дракон-Хаоса даёт всплеск по площади при умениях.' },
    { type:'buff', patch:'7.2', cat:'system', title:'Пластины башни', field:'Золото за пластину', before:'125', after:'160',
      text:'Больше награда за раннее давление на лайне.' },

    { type:'patch', patch:'7.1', date:'1 июля 2026',
      title:'Балансная итерация: подрезали танк-мету, буст поддержкам.' },
    { type:'buff', patch:'7.1', cat:'item', key:'ludens-echo', title:'Эхо Людена', field:'Сила умений', before:'90', after:'100',
      text:'Бёрст-маги получили ядро назад.' },
    { type:'nerf', patch:'7.1', cat:'rune', key:'arcane-comet', title:'Тайная комета', field:'Базовый урон', before:'35', after:'30',
      text:'Слишком стабильный поук.' },
    { type:'buff', patch:'7.1', cat:'system', title:'Дракон-Облако', field:'Ускорение вне боя', before:'+8%', after:'+12%',
      text:'Роумингу больше смысла.' },

    { type:'patch', patch:'7.0', date:'17 июня 2026',
      title:'Крупный сезонный патч: обновление системы предметов и старт сезона.' },
    { type:'buff', patch:'7.0', cat:'rune', key:'dark-harvest', title:'Тёмная жатва', field:'Урон за стак', before:'5', after:'8',
      text:'Снежный ком по добиваниям.' },
    { type:'news', patch:'7.0', cat:'system', title:'Сезонный ранг', field:'Старт сезона 7', after:'Старт',
      text:'Сброс рангов, новые награды.' }
  ],
  // collection: changelog  (структурные события предметов/рун: add/delete/edit)
  changelog: [
    { entity:'item', type:'add',    name:'Разлом Вечности', key:'eternity-rift', patch:'7.2', field:'Новый предмет',
      change:'AP: +100 сила, при добивании умением — всплеск по области.' },
    { entity:'item', type:'delete', name:'Наковальня Рока', key:'obsidian-anvil', patch:'7.2', field:'Предмет удалён',
      change:'Ломал баланс танков. Заменён системой брони.' },
    { entity:'item', type:'add',    name:'Кровавая жатва', key:'blood-harvest', patch:'7.0', field:'Новый предмет',
      change:'AD-предмет с исцелением от урона по чемпионам.' }
  ]
};

/* ============================================================
   НОРМАЛИЗАЦИЯ трёх коллекций → единый список изменений
   change: {id, cat, type, name, key, patch, field, before, after, note, wr, role, top, src}
   ★ Эта функция — граница порта: подмени 3 источника, вид не трогай.
   ============================================================ */
var CHG = [];        // все нормализованные изменения
var BY_ID = {};      // id → change
var PATCHES = [];    // [{ver, date, summary, fresh, changes:[...]}] сгруппировано, ver ↓

function _clItype(t) { return t === 'add' ? 'add' : t === 'delete' ? 'del' : 'adjust'; }

function buildData() {
  CHG = []; BY_ID = {};
  var summaries = {}; // patch → {date, summary}

  var src = USE_LIVE
    ? { patchnotes: window._cmsPatchnotes || [], changesFeed: window._changesFeed || [], changelog: window._cmsChangelogCache || [] }
    : DEMO;

  // patchnotes → чемпионы
  src.patchnotes.forEach(function (n) {
    if (!n.champion || !n.type) return;
    CHG.push({ cat:'champ', type:n.type, name:n.champion, key:n.key || n.champion, patch:n.patch || '—',
      field:n.field || '', before:n.before != null ? n.before : null, after:n.after != null ? n.after : (n.change ? '' : ''),
      note:n.change || n.note || '', wr:n.wr, role:n.role, top:n.top, src:'patchnotes' });
  });

  // changesFeed → сводки патчей + всё не-чемпионское
  src.changesFeed.forEach(function (e) {
    if (e.type === 'patch') { summaries[e.patch] = { date:e.date || '', summary:e.title || '' }; return; }
    CHG.push({ cat:e.cat || 'system', type:e.type, name:e.title || '', key:e.key || null, patch:e.patch || '—',
      field:e.field || '', before:e.before != null ? e.before : null, after:e.after != null ? e.after : null,
      note:e.text || '', wr:e.wr, role:e.role, top:e.top, src:'changesFeed' });
  });

  // changelog → структурные события предметов/рун
  src.changelog.forEach(function (c) {
    if (c.entity !== 'item' && c.entity !== 'rune') return;
    CHG.push({ cat:c.entity, type:_clItype(c.type), name:c.name || '', key:c.key || null, patch:c.patch || '—',
      field:c.field || '', before:c.before != null ? c.before : null, after:c.after != null ? c.after : null,
      note:c.change || '', top:c.top, src:'changelog' });
  });

  // id + индекс
  CHG.forEach(function (ch, i) { ch.id = 'c' + i; BY_ID[ch.id] = ch; });

  // группировка по патчу
  var groups = {};
  CHG.forEach(function (ch) { (groups[ch.patch] = groups[ch.patch] || []).push(ch); });
  PATCHES = Object.keys(groups).map(function (ver) {
    var s = summaries[ver] || {};
    return { ver:ver, date:s.date || '', summary:s.summary || '', changes:groups[ver] };
  }).sort(function (a, b) { return cmpVer(b.ver, a.ver); });
  if (PATCHES[0]) PATCHES[0].fresh = true; // новейший = «свежий» (подсветка новизны)

  // аккордеон: открыт только новейший
  PATCHES.forEach(function (p, i) { if (S.collapsed[p.ver] === undefined) S.collapsed[p.ver] = i > 0; });
}
function cmpVer(a, b) {
  var pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for (var i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
}

/* ============================================================
   СОСТОЯНИЕ (варианты дизайн-полосы + фильтр)
   ============================================================ */
var V = { feed:'feed', change:'row', hl:'cards', ind:'both', filter:'chips', spark:'on',
          layout:'single', btn:'soft', anim:'fade', hover:'lift', density:'normal', nov:'badge' };
var S = { activeCat:'all', q:'', collapsed:{}, catTab:{} };
var BTN_R = { round:'20px', soft:'10px', sharp:'4px' };
var SPLASH = 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Lux_0.jpg';
var detail = null; // текущее открытое изменение (оверлей-связь)

/* ============================================================
   ФИЛЬТР (по категории + поиск) — чистая функция, без DOM
   ============================================================ */
function matches(ch) {
  if (S.activeCat !== 'all' && ch.cat !== S.activeCat) return false;
  if (S.q) { var q = S.q.toLowerCase();
    if (ch.name.toLowerCase().indexOf(q) < 0 && (ch.field || '').toLowerCase().indexOf(q) < 0) return false; }
  return true;
}

/* ============================================================
   ПРИМЕНЕНИЕ ВАРИАНТОВ (data-атрибуты на <html>)
   ============================================================ */
function applyVars() {
  var el = document.documentElement;
  ['feed','change','hl','ind','filter','spark','layout','anim','hover','density','nov'].forEach(function (k) {
    el.setAttribute('data-' + k, V[k]);
  });
  el.style.setProperty('--btn-r', BTN_R[V.btn]);
  document.getElementById('splash').style.backgroundImage = 'url(' + SPLASH + ')';
}

/* ============================================================
   ИКОНКА ИЗМЕНЕНИЯ + СПАРКЛАЙН
   ============================================================ */
function chIconEl(ch) {
  if (ch.cat === 'champ' && ch.key) return '<img class="chg-ic" src="'+champIcon(ch.key)+'" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">';
  if (ch.cat === 'item'  && ch.key) return '<img class="chg-ic" src="'+itemImg(ch.key)+'" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">';
  if (ch.cat === 'rune'  && ch.key) return '<img class="chg-ic" src="'+runeImg(ch.key)+'" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">';
  return '<div class="chg-ic" style="display:grid;place-items:center;font-size:20px">'+(CAT_LABEL[ch.cat]?CAT_LABEL[ch.cat].ic:SYS_IC)+'</div>';
}
function sparkline(wr) {
  if (!wr || !wr.length) return '';
  var vals = wr.filter(function (v) { return v > 0; });
  if (vals.length < 2) return '';
  var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), rng = (hi - lo) || 1;
  var W = 58, H = 18, n = wr.length;
  var pts = wr.map(function (v, i) {
    var x = (i / (n - 1) * W).toFixed(1);
    var y = v > 0 ? (H - (v - lo) / rng * H).toFixed(1) : H;
    return x + ',' + y;
  }).join(' ');
  var cur = vals[vals.length - 1], first = vals[0];
  var col = cur > first ? 'var(--buff)' : cur < first ? 'var(--nerf)' : 'var(--txt)';
  return '<span class="spark" title="Тренд винрейта (демо)">' +
    '<svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'"><polyline points="'+pts+'" fill="none" stroke="'+col+'" stroke-width="1.6"/></svg>' +
    '<span class="wr-val" style="color:'+col+'">'+cur.toFixed(1)+'%</span></span>';
}

/* ============================================================
   РЕНДЕР ОДНОГО ИЗМЕНЕНИЯ (строка/карточка/бейдж)
   data-cat/data-name/data-field → чтобы фильтр работал ТОЧЕЧНО, без пересборки
   ============================================================ */
function changeHTML(ch) {
  var tp = TYPES[ch.t] || TYPES[ch.type];
  var ba = ch.before != null
    ? '<span class="before">'+ch.before+'</span><span class="arrow">→</span><span class="after">'+(ch.after||'')+'</span>'
    : (ch.after ? '<span class="after single">'+ch.after+'</span>' : '');
  var spark = (ch.cat === 'champ' && ch.wr) ? sparkline(ch.wr) : '';
  return '<div class="chg" data-t="'+ch.type+'" data-ch="'+ch.id+'" data-cat="'+ch.cat+'" ' +
      'data-name="'+esc(ch.name.toLowerCase())+'" data-field="'+esc((ch.field||'').toLowerCase())+'" role="button" tabindex="0">' +
    '<div class="chg-l">' +
      '<div class="chg-ic-wrap">'+chIconEl(ch)+'<span class="chg-badge">'+tp.ic+'</span></div>' +
      '<div class="chg-txt">' +
        '<div class="chg-name">'+ch.name+' <span class="lnk">→ '+tp.lnk+' · связь</span></div>' +
        (ch.field ? '<div class="chg-field">'+ch.field+'</div>' : '') +
        (ch.note ? '<div class="chg-note">'+ch.note+'</div>' : '') +
      '</div>' +
    '</div>' +
    '<div class="chg-r">' + spark +
      '<span class="type-pill">'+tp.ic+' '+tp.label+'</span>' +
      (ba ? '<span class="ba">'+ba+'</span>' : '') +
    '</div>' +
  '</div>';
}
function esc(s) { return String(s).replace(/"/g, '&quot;'); }

/* ============================================================
   РЕНДЕР ФИЛЬТР-БАРА
   ============================================================ */
function renderFilters() {
  var chips = '<button class="chip'+(S.activeCat==='all'?' on':'')+'" data-fc="all">Все</button>' +
    CATS.map(function (c) {
      return '<button class="chip'+(S.activeCat===c.k?' on':'')+'" data-fc="'+c.k+'">'+c.ic+' '+c.label+'</button>';
    }).join('');
  var opts = '<option value="all">Все категории</option>' +
    CATS.map(function (c) { return '<option value="'+c.k+'"'+(S.activeCat===c.k?' selected':'')+'>'+c.label+'</option>'; }).join('');
  document.getElementById('filters').innerHTML =
    '<div class="f-chips">'+chips+'</div>' +
    '<div class="f-drop"><select id="fcSelect">'+opts+'</select></div>' +
    '<div class="f-search"><input type="text" id="fSearch" placeholder="поиск по чемпу / предмету…" value="'+esc(S.q)+'"></div>';
}

/* ============================================================
   РЕНДЕР «ГЛАВНОЕ ПАТЧА» (топ-N новейшего) — статичен при фильтре
   ============================================================ */
function renderHighlight() {
  var p = PATCHES[0];
  if (!p) { document.getElementById('highlight').innerHTML = ''; return; }
  var tops = p.changes.filter(function (ch) { return ch.top; }).sort(function (a, b) { return a.top - b.top; });
  var cards = tops.map(function (ch) {
    var tp = TYPES[ch.type];
    var acc = 'var(--'+ch.type+')';
    var ba = ch.before != null ? ch.before+' → '+(ch.after||'') : (ch.after || '');
    return '<div class="hl-card" data-ch="'+ch.id+'" style="--acc:'+acc+'">' +
      chIconEl(ch).replace('class="chg-ic"', 'class="hl-ic"') +
      '<div class="hl-body">' +
        '<div class="hl-tag" style="color:'+acc+'">'+tp.ic+' '+tp.label+' · #'+ch.top+'</div>' +
        '<div class="hl-name">'+ch.name+'</div>' +
        '<div class="hl-sub">'+(ch.field||'')+(ba?' · '+ba:'')+'</div>' +
      '</div></div>';
  }).join('');
  document.getElementById('highlight').innerHTML =
    '<div class="hl-h"><span class="star">✨</span> Главное патча '+p.ver+' <span class="demo">топ-'+tops.length+'</span></div>' +
    '<div class="hl-cards">'+cards+'</div>';
}

/* ============================================================
   РЕНДЕР ЛЕНТЫ (полная сборка — только init + смена варианта)
   ============================================================ */
function patchSections(p) {
  return CATS.map(function (c) {
    return { cat: c, items: p.changes.filter(function (ch) { return ch.cat === c.k; }) };
  }).filter(function (s) { return s.items.length; });
}
function renderFeed() {
  var html = PATCHES.map(function (p) {
    var secs = patchSections(p);

    var activeCat = S.catTab[p.ver] || (secs[0] && secs[0].cat.k);
    var tabs = '<div class="cat-tabs">' + secs.map(function (s) {
      return '<button class="cat-tab'+(s.cat.k===activeCat?' on':'')+'" data-cattab="'+p.ver+'|'+s.cat.k+'">'+
        s.cat.ic+' '+s.cat.label+' <span class="cnt">'+s.items.length+'</span></button>';
    }).join('') + '</div>';

    var sections = secs.map(function (s) {
      var rows = s.items.map(changeHTML).join('');
      return '<div class="section'+(s.cat.k===activeCat?' active':'')+'" data-seccat="'+s.cat.k+'">' +
        '<div class="sec-h"><span class="sec-ic">'+s.cat.ic+'</span>'+s.cat.label+
        '<span class="sec-cnt">'+s.items.length+' изм.</span></div>' +
        '<div class="changes">'+rows+'</div></div>';
    }).join('');

    var collapsed = (V.feed === 'accordion' && S.collapsed[p.ver]) ? ' collapsed' : '';
    return '<section class="feed-item glass'+collapsed+(p.fresh?' fresh':'')+'" data-ver="'+p.ver+'">' +
      '<div class="patch-head" data-phead="'+p.ver+'">' +
        '<div class="patch-ver">'+p.ver+'</div>' +
        '<div class="patch-meta">' +
          '<div class="patch-titlerow">'+(p.fresh?'<span class="news-badge">✨ News</span>':'')+
            (p.date?'<span class="patch-date">'+p.date+'</span>':'')+'</div>' +
          (p.summary?'<div class="patch-summary">'+p.summary+'</div>':'') +
        '</div>' +
        '<span class="patch-caret">▾</span>' +
      '</div>' +
      tabs +
      '<div class="patch-body">'+sections+'</div>' +
    '</section>';
  }).join('');
  document.getElementById('feed').innerHTML = html;
}

/* ============================================================
   ★ ТОЧЕЧНЫЙ ФИЛЬТР — БЕЗ innerHTML на ленту (лечим дёрганье)
   Прячем/показываем существующие .chg, пересчитываем счётчики,
   прячем пустые секции/патчи. Ни один узел не пересоздаётся.
   ============================================================ */
function applyFilter() {
  // активная чип-кнопка
  document.querySelectorAll('[data-fc]').forEach(function (b) { b.classList.toggle('on', b.dataset.fc === S.activeCat); });

  var kept = 0, total = 0;
  document.querySelectorAll('.feed-item').forEach(function (item) {
    var patchVisible = false;
    item.querySelectorAll('.section').forEach(function (sec) {
      var vis = 0;
      sec.querySelectorAll('.chg').forEach(function (row) {
        total++;
        var ch = BY_ID[row.dataset.ch];
        var ok = ch ? matches(ch) : true;
        row.classList.toggle('filtered-out', !ok);
        if (ok) { vis++; kept++; }
      });
      var cnt = sec.querySelector('.sec-cnt'); if (cnt) cnt.textContent = vis + ' изм.';
      sec.classList.toggle('empty', vis === 0);
      // счётчик у вкладки категории
      var tab = item.querySelector('.cat-tab[data-cattab="'+item.dataset.ver+'|'+sec.dataset.seccat+'"]');
      if (tab) { var tc = tab.querySelector('.cnt'); if (tc) tc.textContent = vis; tab.classList.toggle('empty', vis === 0); }
      if (vis > 0) patchVisible = true;
    });
    item.classList.toggle('empty', !patchVisible);
  });

  // пусто по всему фильтру?
  var feed = document.getElementById('feed');
  var noneEl = feed.querySelector('.feed-none');
  var allEmpty = !document.querySelector('.feed-item:not(.empty)');
  if (allEmpty && !noneEl) {
    var d = document.createElement('div'); d.className = 'feed-none';
    d.textContent = 'Ничего не найдено по фильтру / поиску.';
    feed.appendChild(d);
  } else if (!allEmpty && noneEl) { noneEl.remove(); }

  window.__patchFilterAudit = { kept: kept, total: total }; // приёмка счётчиком
  return { kept: kept, total: total };
}

/* ============================================================
   ОВЕРЛЕЙ-КАРТОЧКА (СВЯЗЬ) — клик по изменению
   ============================================================ */
function openDetail(id) { detail = BY_ID[id]; renderDetail(); }
function closeDetail() { detail = null; renderDetail(); }
function renderDetail() {
  var host = document.getElementById('ovHost');
  if (!detail) { host.innerHTML = ''; return; }
  var ch = detail, tp = TYPES[ch.type], acc = 'var(--'+ch.type+')';
  var img = ch.key ? (ch.cat==='champ' ? champIcon(ch.key) : ch.cat==='item' ? itemImg(ch.key) : ch.cat==='rune' ? runeImg(ch.key) : '') : '';
  var head = img
    ? '<img src="'+img+'" alt="" onerror="this.style.visibility=\'hidden\'">'
    : '<div style="width:64px;height:64px;border-radius:12px;border:1px solid var(--glass-bd-c);background:rgba(0,0,0,.3);display:grid;place-items:center;font-size:30px">'+(CAT_LABEL[ch.cat]?CAT_LABEL[ch.cat].ic:SYS_IC)+'</div>';

  // демо-статы по категории
  var stats = '';
  if (ch.cat === 'champ') {
    var wr = ch.wr && ch.wr.length ? ch.wr[ch.wr.length-1].toFixed(1)+'%' : '—';
    stats = ovStat('Винрейт', wr) + ovStat('Тир', ['S','A','B'][ch.name.length%3]) +
            ovStat('Пикрейт', (8+ch.name.length%7)+'%') + ovStat('Банрейт', (3+ch.name.length%5)+'%');
  } else if (ch.cat === 'item') {
    stats = ovStat('Категория', (ch.field||'').indexOf('AP')>=0?'AP':'AD/Защита') + ovStat('Цена', (2800+ch.name.length*30)+' зол') +
            ovStat('Популярность', (30+ch.name.length%40)+'%') + ovStat('Слотов', '6');
  } else if (ch.cat === 'rune') {
    stats = ovStat('Ветка', 'Ключевая') + ovStat('Пикрейт', (20+ch.name.length%40)+'%');
  }

  var ba = ch.before != null ? '<span style="opacity:.55;text-decoration:line-through">'+ch.before+'</span> → <span class="after">'+(ch.after||'')+'</span>' : (ch.after ? '<span class="after">'+ch.after+'</span>' : '');
  var links = (LINKS[ch.cat] || LINKS.system).map(function (l) {
    return '<button class="ov-link" data-ovlink="'+l[0]+'"><span>'+l[2]+'</span>'+l[1]+'<span class="arr">→</span></button>';
  }).join('');
  var role = '<div class="ov-role">'+(ch.role || CAT_LABEL[ch.cat].label)+'</div>';

  host.innerHTML =
    '<div class="ov-scrim" data-ovclose="1"></div>' +
    '<div class="ov-wrap"><div class="ov-card glass anim-in" style="--acc:'+acc+'">' +
      '<div class="ov-head">'+head+'<div><div class="ov-name">'+ch.name+'</div>'+role+'</div>' +
        '<button class="ov-close" data-ovclose="1">✕</button></div>' +
      (stats ? '<div class="ov-stats">'+stats+'</div>' : '') +
      '<div class="ov-change" style="--acc:'+acc+'"><div class="ovc-h">'+tp.ic+' '+tp.label+' в патче '+ch.patch+'</div>' +
        '<div class="ovc-b">'+(ch.field?ch.field+': ':'')+ba+'</div>'+(ch.note?'<div class="ovc-b" style="opacity:.75;margin-top:4px;font-size:12px">'+ch.note+'</div>':'')+'</div>' +
      '<div class="ov-links">'+links+'</div>' +
      '<div class="ov-demo-note">Связь-демо: в боевом эти кнопки открывают реальные разделы (карточка/дерево/пикер). Ни одной фичи-тупика — по ЗАКОНУ СВЯЗЕЙ.</div>' +
    '</div></div>';
  wireDetail();
}
/* ссылки-связи по категориям (демо) */
var LINKS = {
  champ:  [['page','Страница чемпиона','📄'], ['matchup','Матчапы / контры','⚔'], ['build','Сборка и руны','🛠']],
  item:   [['card','Карточка предмета','📄'], ['tree','Дерево сборки','🌳'], ['who','Кто покупает','👥']],
  rune:   [['picker','Пикер рун','🔮'], ['with','С чем берут','🔗']],
  system: [['more','Подробнее о механике','📄']]
};
function ovStat(l, v) { return '<div class="ov-stat"><span>'+l+'</span><b>'+v+'</b></div>'; }
function wireDetail() {
  var host = document.getElementById('ovHost');
  host.querySelectorAll('[data-ovclose]').forEach(function (b) { b.onclick = closeDetail; });
  host.querySelectorAll('[data-ovlink]').forEach(function (b) {
    b.onclick = function () { toast('Связь → «'+b.textContent.trim().replace('→','')+'» (в боевом откроет раздел)'); };
  });
}

/* ============================================================
   TOAST
   ============================================================ */
function toast(msg) {
  var t = document.createElement('div'); t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:60;background:rgba(10,14,20,.96);color:#fff;padding:12px 20px;border-radius:12px;border:1px solid rgba(255,255,255,.14);font-size:13px;box-shadow:0 10px 30px rgba(0,0,0,.5);text-shadow:none';
  document.body.appendChild(t);
  setTimeout(function () { t.style.transition='opacity .3s'; t.style.opacity='0'; setTimeout(function () { t.remove(); }, 300); }, 1900);
}

/* ============================================================
   ГЛАВНЫЙ РЕНДЕР (полный — init + смена варианта) + WIRE
   ============================================================ */
function renderAll() {
  applyVars();
  renderFilters();
  renderHighlight();
  renderFeed();
  applyFilter();   // сразу применяем текущий фильтр к свежепостроенной ленте
  updateChoice();
  wire();
}
function wire() {
  var $ = function (sel) { return document.querySelectorAll(sel); };
  // фильтры → ТОЧЕЧНО (без пересборки ленты)
  $('[data-fc]').forEach(function (b) { b.onclick = function () { S.activeCat = b.dataset.fc; applyFilter(); syncDrop(); }; });
  var sel = document.getElementById('fcSelect');
  if (sel) sel.onchange = function () { S.activeCat = sel.value; applyFilter(); };
  var s = document.getElementById('fSearch');
  if (s) s.oninput = function () { S.q = s.value; applyFilter(); }; // фокус НЕ теряем — поле не пересоздаётся
  // клик по изменению → связь
  $('.chg[data-ch]').forEach(function (c) {
    c.onclick = function () { openDetail(c.dataset.ch); };
    c.onkeydown = function (e) { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); openDetail(c.dataset.ch); } };
  });
  // топ-N карточки → связь
  $('.hl-card[data-ch]').forEach(function (c) { c.onclick = function () { openDetail(c.dataset.ch); }; });
  // аккордеон
  $('[data-phead]').forEach(function (h) { h.onclick = function () {
    if (V.feed !== 'accordion') return; var ver = h.dataset.phead;
    S.collapsed[ver] = !S.collapsed[ver];
    var item = h.closest('.feed-item'); if (item) item.classList.toggle('collapsed', S.collapsed[ver]); // ТОЧЕЧНО
  }; });
  // вкладки категорий внутри патча → ТОЧЕЧНО
  $('[data-cattab]').forEach(function (b) { b.onclick = function () {
    var pr = b.dataset.cattab.split('|'); S.catTab[pr[0]] = pr[1];
    var item = b.closest('.feed-item'); if (!item) return;
    item.querySelectorAll('.cat-tab').forEach(function (t) { t.classList.toggle('on', t === b); });
    item.querySelectorAll('.section').forEach(function (sec) { sec.classList.toggle('active', sec.dataset.seccat === pr[1]); });
  }; });
}
function syncDrop() { var sel = document.getElementById('fcSelect'); if (sel) sel.value = S.activeCat; }
document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && detail) closeDetail(); });

/* ============================================================
   ДЕВ-ПОЛОСА (порт механизма из lab-build)
   ============================================================ */
var LAB = {
  feed:{feed:'Лента', accordion:'Аккордеон', cattabs:'Вкладки'},
  change:{row:'Строка', card:'Карточка', badge:'Бейдж'},
  hl:{cards:'Карточки', row:'Строка', hidden:'Скрыт'},
  ind:{both:'Цвет+иконка', icon:'Иконка', color:'Цвет'},
  filter:{chips:'Чипы', dropdown:'Дропдаун'},
  spark:{on:'Вкл', off:'Выкл'},
  layout:{single:'1 колонка', wide:'2 колонки'},
  btn:{round:'Круглые', soft:'Мягкие', sharp:'Острые'},
  anim:{fade:'Фейд', slide:'Сдвиг', none:'Нет'},
  hover:{lift:'Подъём', glow:'Свечение', none:'Нет'},
  density:{air:'Просторно', normal:'Средне', dense:'Плотно'},
  nov:{badge:'Бейдж News', ring:'Рамка', bar:'Полоса', off:'Нет'}
};
function choiceStr() {
  return 'Лента: '+LAB.feed[V.feed]+' · Изменение: '+LAB.change[V.change]+' · Главное: '+LAB.hl[V.hl]+
    ' · Индикатор: '+LAB.ind[V.ind]+' · Новизна: '+LAB.nov[V.nov]+' · Фильтры: '+LAB.filter[V.filter]+
    ' · Спарклайн: '+LAB.spark[V.spark]+' · Раскладка: '+LAB.layout[V.layout]+' · Кнопки: '+LAB.btn[V.btn]+
    ' · Появление: '+LAB.anim[V.anim]+' · Ховер: '+LAB.hover[V.hover]+' · Плотность: '+LAB.density[V.density];
}
function updateChoice() { var el = document.getElementById('choiceText'); if (el) el.textContent = choiceStr(); }

document.querySelectorAll('.strip-body .seg[data-k]').forEach(function (seg) {
  seg.querySelectorAll('button').forEach(function (b) {
    b.onclick = function () {
      seg.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on'); V[seg.dataset.k] = b.dataset.v; renderAll(); // смена варианта = полная пересборка (дев-действие, не юзер)
    };
  });
});
document.getElementById('stripMin').onclick = function () {
  var s = document.getElementById('labStrip'); s.classList.toggle('min');
  this.textContent = s.classList.contains('min') ? 'Развернуть' : 'Свернуть';
};
document.getElementById('stripCopy').onclick = function () {
  var self = this; navigator.clipboard.writeText(choiceStr()).then(function () {
    self.textContent = '✓ Скопировано'; setTimeout(function () { self.textContent = '📋 Скопировать мой выбор'; }, 1400);
  });
};
(function () {
  var strip = document.getElementById('labStrip'), head = document.getElementById('stripHead'), drag = false, dx = 0, dy = 0;
  head.addEventListener('pointerdown', function (ev) {
    if (ev.target.closest('button')) return;
    var r = strip.getBoundingClientRect(); strip.style.transform = 'none'; strip.style.left = r.left+'px'; strip.style.top = r.top+'px';
    dx = ev.clientX - r.left; dy = ev.clientY - r.top; drag = true; head.setPointerCapture(ev.pointerId);
  });
  head.addEventListener('pointermove', function (ev) {
    if (!drag) return; strip.style.left = Math.max(0, ev.clientX - dx)+'px'; strip.style.top = Math.max(0, ev.clientY - dy)+'px';
  });
  head.addEventListener('pointerup', function () { drag = false; });
})();

/* ============================================================
   ПРИЁМКА СЧЁТЧИКОМ УЗЛОВ (ГЕЙТ 3) — для консоли Эржана/Клода.
   window.__patchNodeAudit('champ') → кликает фильтр и считает выживших.
   ============================================================ */
window.__patchNodeAudit = function (cat) {
  var rows = document.querySelectorAll('.chg');
  rows.forEach(function (r) { r.__keep = true; });
  var before = rows.length;
  S.activeCat = cat || 'champ'; applyFilter();
  var survived = 0; document.querySelectorAll('.chg').forEach(function (r) { if (r.__keep) survived++; });
  var res = survived + '/' + before + ' строк пережили клик по фильтру (пересоздано ' + (before - survived) + ')';
  console.log('[patch node-audit] ' + res, window.__patchFilterAudit);
  S.activeCat = 'all'; applyFilter();
  return res;
};

/* ============================================================ */
buildData();
renderAll();
})();
