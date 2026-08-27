/* ============================================================
   lab-metahub — паритет с боевым (11 блоков), КАНОН (DESIGN.md)
   ═══ НЕ ТАЩИТЬ ДЁРГАНЬЕ ═══
   • Визуальные тумблеры дев-полосы = data-* на .app (CSS), БЕЗ innerHTML.
   • Полный ре-рендер бенто — ТОЛЬКО при смене ранга/источника (меняются все данные).
   • Веер = порт 1-в-1 из боевого, НЕ трогаем; вариантов на него не вешаем.
   • ГОЧА: transform/will-change/filter/contain убивают backdrop → веер-карты НЕ стеклянные
     (свой градиент-фон, без backdrop-filter). Стекло только на hub-card/kpi/hero-контейнерах.
   • Приёмка счётчиком узлов (кнопка в дев-полосе).
   ============================================================ */
(function () {
  'use strict';

  var M = window.META;
  var root = document.documentElement;
  var app = document.getElementById('app');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); };
  var gnorm = function (s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); };

  var iconUrl = function (heroId) { return 'https://game.gtimg.cn/images/lgamem/act/lrlib/img/HeadIcon/H_S_' + heroId + '.png'; };
  var splashUrl = function (nameEN) { return 'https://game.gtimg.cn/images/lgamem/act/lrlib/img/Posters/' + nameEN + '_0.jpg'; };
  var FB = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='34' height='34'><rect width='34' height='34' rx='9' fill='%230d1a27'/></svg>";
  var imgErr = "this.onerror=null;this.src='" + FB + "'";

  var ROLE_RU = { Baron: 'Барон', Mid: 'Мид', Jungle: 'Лес', Dragon: 'Дракон', Support: 'Саппорт', top: 'Барон', jungle: 'Лес', mid: 'Мид', ADC: 'АДК' };
  var role = function (r) { return ROLE_RU[r] || r || ''; };
  var tier = function (t) { return '<span class="tier" data-t="' + t + '">' + t + '</span>'; };
  var wrCls = function (wr) { return wr >= 52 ? 'wr-g' : (wr < 49 ? 'wr-b' : 'wr-n'); };
  var byName = {};   // nameRU -> nameEN (для маршрутов/иконок по имени)
  Object.keys(M.byRank).forEach(function (rk) { (M.byRank[rk].pool || []).forEach(function (c) { byName[c.name] = c; }); });
  var enOf = function (nm) { return (byName[nm] && byName[nm].nameEN) || nm; };
  var idOf = function (nm) { return byName[nm] && byName[nm].heroId; };
  var portByName = function (nm) { var id = idOf(nm); return '<img class="port" src="' + (id ? iconUrl(id) : FB) + '" onerror="' + imgErr + '" alt="">'; };

  var S = {
    /* визуальные варианты (дев-полоса) — CSS-driven, без ре-рендера */
    heroart: 'on', herosize: 'normal', spark: 'on',
    kpi: 'cards', cards: '3', lists: 'bars', stier: 'icons', hover: 'on',
    density: 'normal', radius: 'normal',
    /* источники (ре-рендер) */
    srcTours: 'demo', srcNews: 'demo',
    /* пользовательские (⚙) */
    rank: 'diamond_plus', splash: 'thresh', accent: '#ffffff', op: 0.00, blur: 8, dark: 0.46
  };
  var VISUAL = ['heroart', 'herosize', 'spark', 'kpi', 'cards', 'lists', 'stier', 'hover', 'density', 'radius'];

  /* ============================================================
     МАРШРУТЫ (ЗАКОН СВЯЗЕЙ) — на боевом роутер; в лабе тост + лаб-источник
     ============================================================ */
  var ROUTES = {
    champ:   { title: 'Карточка чемпа',   lab: '../lab-hover-reveal/index.html' },
    build:   { title: 'Раздел «Сборка»',  lab: '../lab-build/index.html' },
    item:    { title: 'Карточка предмета', lab: '../lab-item-card/index.html' },
    esports: { title: 'Турниры Wild Rift', lab: null },
    patch:   { title: 'Лента изменений (Патч)', lab: null },
    tool:    { title: 'Инструмент', lab: null }
  };
  var toast = document.getElementById('toast'), toastT = null;
  function say(m) { toast.textContent = m; toast.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { toast.classList.remove('on'); }, 2600); }
  function go(kind, label) { var r = ROUTES[kind]; if (!r) return; say('→ ' + r.title + (label ? ' · ' + label : '') + (r.lab ? ' (открываю лаб-источник)' : ' · раздела ещё нет')); if (r.lab) window.open(r.lab, '_blank'); }
  function share(kind, label) { var r = ROUTES[kind] || { title: 'Мета-хаб' }; var card = '[' + r.title + (label ? ' · ' + label : '') + '] — патч ' + M.patch + ' · pro-wildrift'; if (navigator.clipboard) navigator.clipboard.writeText(card); say('📎 Карточка-ссылка скопирована: ' + card); }
  document.addEventListener('click', function (e) {
    var sh = e.target.closest('[data-share]'); if (sh) { e.stopPropagation(); share(sh.dataset.share, sh.dataset.label || ''); return; }
    var g = e.target.closest('[data-go]'); if (g) go(g.dataset.go, g.dataset.label || '');
  });
  var shareBtn = function (kind, label) { return '<button class="share-btn" data-share="' + kind + '" data-label="' + esc(label) + '" title="Поделиться в чат">📎</button>'; };

  /* ============================================================
     ★ ИСТОЧНИКИ ДАННЫХ — где нет, честный пустой стейт, превью помечено ДЕМО
     ============================================================ */
  /* история WR по патчам: в wr-stats.json ОДИН снимок → истории нет. Демо-кривая по тренду. */
  function wrHist(c) {
    if (Array.isArray(c.wrHistory) && c.wrHistory.length > 1) return { real: true, vals: c.wrHistory };
    var t = (c.trend || 0) / 10;
    var vals = [-0.85, -0.6, -0.32, -0.13, 0].map(function (k, i) { var wob = ((i * 37 + c.wr * 10) % 7 - 3) / 10; return +(c.wr + t * k * 10 + wob).toFixed(1); });
    return { real: false, vals: vals };
  }
  /* «Ближайшие турниры»: источник = турнирная база (Firestore /tournaments, cybersport.js). */
  function tours() {
    if (M.tournaments && M.tournaments.length) return { real: true, list: M.tournaments.slice(0, 3) };
    if (S.srcTours === 'empty') return { real: false, list: [] };
    return { real: false, list: [
      { dot: '🔴', name: 'WR Masters · Финал', when: 'сегодня 18:00', live: true },
      { dot: '🟡', name: 'Asia Cup · 1/2', when: 'завтра 14:00' },
      { dot: '⚪', name: 'EU Open · Групповой', when: '12.06' }
    ] };
  }
  /* «Что нового»: связь с лентой изменений (патч-ноты). Парсера пока нет. */
  function news() {
    if (M.patchNotes && M.patchNotes.length) return { real: true, list: M.patchNotes.slice(0, 4) };
    if (S.srcNews === 'empty') return { real: false, list: [] };
    return { real: false, list: [
      { ico: '🔼', name: 'Амуму', what: 'урон Q +8', kind: 'buff' },
      { ico: '🔽', name: 'Ли Син', what: 'КД W +2с', kind: 'nerf' },
      { ico: '🔼', name: 'Сетт', what: 'щит W +40', kind: 'buff' },
      { ico: '🆕', name: 'Предмет', what: 'добавлен «Разлом»', kind: '' }
    ] };
  }
  function whyHero(h) {
    var n = news().list.filter(function (p) { return p.name === h.name && p.kind === 'buff'; })[0];
    if (n) return { real: false, text: 'Забуфлен в патче ' + M.patch + ': ' + n.what };
    if ((h.trend || 0) > 0) return { real: false, text: 'Растёт ' + h.trend + ' поз. за патч — держит топ ' + M.rankLabels[S.rank] };
    return { real: false, text: 'Лидер винрейта на ранге ' + M.rankLabels[S.rank] };
  }

  /* ============================================================
     РАДАР качеств (для веера) — ПОРТ 1-в-1 из боевого app.js (radarInner)
     ============================================================ */
  var RAXES = [{ f: 'damage', lbl: 'Урон' }, { f: 'difficult', lbl: 'Сложн.' }, { f: 'survive', lbl: 'Выжив.' }, { f: 'utility', lbl: 'Польза' }];
  var _qmap = null, _qP = null;
  function loadQualities() {
    if (_qP) return _qP;
    _qP = fetch('../data-pipeline/champion-qualities.json', { cache: 'force-cache' })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (j) { var arr = Array.isArray(j) ? j : (j && j.champions) || []; var m = {}; arr.forEach(function (c) { if (!c) return; if (c.name) m[gnorm(c.name)] = c; if (c.id) m[gnorm(c.id)] = c; }); _qmap = m; return m; })
      .catch(function () { _qmap = {}; return {}; });
    return _qP;
  }
  function radarInner(nameEN) {
    var q = _qmap && _qmap[gnorm(nameEN)];
    if (!q) return '';
    var n = RAXES.length, cx = 120, cy = 110, R = 66;
    var frac = function (v) { return Math.max(0.14, Math.min(1, (+v || 0) / 3)); };
    var pt = function (i, f) { var a = (-90 + i * (360 / n)) * Math.PI / 180; return [cx + Math.cos(a) * R * f, cy + Math.sin(a) * R * f]; };
    var grid = [0.33, 0.66, 1].map(function (g) { return '<polygon points="' + RAXES.map(function (_, i) { return pt(i, g).join(','); }).join(' ') + '" fill="none" stroke="rgba(255, 255, 255,.14)" stroke-width="1"/>'; }).join('');
    var axes = RAXES.map(function (_, i) { var e = pt(i, 1); return '<line x1="' + cx + '" y1="' + cy + '" x2="' + e[0] + '" y2="' + e[1] + '" stroke="rgba(255, 255, 255,.12)" stroke-width="1"/>'; }).join('');
    var labels = RAXES.map(function (a, i) { var l = pt(i, 1.28); return '<text x="' + l[0] + '" y="' + l[1] + '" fill="rgba(230,243,251,.85)" font-size="11" font-weight="700" text-anchor="middle" dominant-baseline="middle">' + a.lbl + '</text>'; }).join('');
    var data = RAXES.map(function (a, i) { return pt(i, frac(q[a.f])).join(','); }).join(' ');
    var dots = RAXES.map(function (a, i) { var p = pt(i, frac(q[a.f])); return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="2.6" fill="var(--accent)"/>'; }).join('');
    return '<svg viewBox="0 0 240 220">' + grid + axes + '<polygon points="' + data + '" fill="rgba(255, 255, 255,.22)" stroke="var(--accent)" stroke-width="2"/>' + dots + labels + '</svg>';
  }

  /* спарклайн inline SVG */
  function spark(vals, cls, w, h) {
    w = w || 48; h = h || 16;
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals), span = (max - min) || 1;
    var pts = vals.map(function (v, i) { var x = (i / (vals.length - 1)) * (w - 2) + 1; var y = h - 2 - ((v - min) / span) * (h - 4); return x.toFixed(1) + ',' + y.toFixed(1); });
    var last = pts[pts.length - 1].split(',');
    return '<svg class="spark ' + cls + '" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true"><polyline class="ln" points="' + pts.join(' ') + '"/><circle class="dot" cx="' + last[0] + '" cy="' + last[1] + '" r="1.9"/></svg>';
  }

  /* ============================================================
     11 БЛОКОВ (данные из реального пула ранга)
     ============================================================ */
  function ctx() {
    var r = M.byRank[S.rank];
    var pool = (r.pool || []).slice();
    var byWr = pool.slice().sort(function (a, b) { return b.wr - a.wr; });
    return {
      r: r, pool: pool, hero: byWr[0], top5: byWr.slice(0, 5),
      sTier: byWr.filter(function (c) { return c.wr >= 52; }).slice(0, 10),
      topPr: pool.slice().sort(function (a, b) { return b.pr - a.pr; }).slice(0, 5),
      topBr: pool.slice().sort(function (a, b) { return b.br - a.br; }).slice(0, 5)
    };
  }

  /* 1 — Лидер меты */
  function heroBlock(c) {
    var h = wrHist(c), why = whyHero(c);
    return '<div class="hub-hero glass">' +
      '<div class="hero-art" style="background-image:url(\'' + splashUrl(c.nameEN) + '\')"></div>' +
      shareBtn('champ', c.name) +
      '<img class="big" src="' + iconUrl(c.heroId) + '" onerror="this.style.visibility=\'hidden\'" alt="">' +
      '<div class="info">' +
        '<span class="lbl">★ Лидер меты · ' + M.rankLabels[S.rank] + '</span>' +
        '<h2 class="go" data-go="champ" data-label="' + esc(c.name) + '">' + c.name + '</h2>' +
        '<div class="hrow"><span class="tag">🎖 Тир ' + c.tier + '</span><span class="tag">📈 <b>' + c.wr.toFixed(1) + '%</b> WR</span><span class="tag">🗺 ' + role(c.role) + '</span></div>' +
        '<div class="spark-row">' + spark(h.vals, 'acc', 84, 20) + '<span>WR за 5 патчей ' + h.vals[0] + '% → ' + h.vals[h.vals.length - 1] + '%</span>' + (h.real ? '' : ' <span class="demo">демо</span>') + '</div>' +
        '<div class="spark-row" style="margin-bottom:10px"><span>💡 ' + why.text + '</span> <span class="demo">демо</span></div>' +
        '<button class="cta" data-go="champ" data-label="' + esc(c.name) + '">Открыть гайды →</button>' +
      '</div></div>';
  }

  /* 2 — KPI */
  function kpiBlock(c) {
    var pool = c.pool, champs = c.pool;
    var topWr = c.hero;
    var mostBan = pool.slice().sort(function (a, b) { return b.br - a.br; })[0];
    var roleSum = {}; pool.forEach(function (o) { roleSum[o.role] = (roleSum[o.role] || 0) + o.pr; });
    var metaRole = Object.keys(roleSum).sort(function (a, b) { return roleSum[b] - roleSum[a]; })[0];
    function kpi(lbl, val, sub) { return '<div class="f-kpi glass"><div class="k-lbl">' + lbl + '</div><div class="k-val">' + val + '</div><div class="k-sub">' + sub + '</div></div>'; }
    return '<div class="f-kpis">' +
      kpi('Топ винрейт', esc(topWr.name), '<b>' + topWr.wr.toFixed(1) + '%</b> WR') +
      kpi('Мета-роль', role(metaRole), 'по пикрейту') +
      kpi('Самый банимый', esc(mostBan.name), '<b>' + mostBan.br.toFixed(1) + '%</b> банов') +
      kpi('Чемпионов', champs.length, M.rankLabels[S.rank]) +
    '</div>';
  }

  /* 3 — ВЕЕР (порт 1-в-1).
     `fresh` (появление карточек) — ТОЛЬКО при первой сборке: смена ранга это
     не «появление», блок постоянный. Иначе веер мигает на каждый клик. */
  var _fanShown = false;
  function fanBlock(list) {
    var fresh = _fanShown ? '' : ' fresh'; _fanShown = true;
    return '<div class="mh-fan-wrap' + fresh + '"><h4>🔥 Витрина меты <span class="pill-lbl">Топ-' + list.length + ' ' + M.rankLabels[S.rank] + '</span></h4>' +
      '<div class="mh-fan-stage v-fan">' + list.map(function (c) {
        return '<div class="mh-card glow" data-go="champ" data-label="' + esc(c.name) + '">' +
          '<div class="mh-art"><img src="' + splashUrl(c.nameEN) + '" alt="" onerror="this.onerror=null;this.src=\'' + iconUrl(c.heroId) + '\'"></div>' +
          '<div class="mh-shade"></div>' +
          '<div class="mh-body"><div class="mh-name">' + esc(c.name) + '</div><div class="mh-role">' + role(c.role) + '</div></div>' +
          '<div class="mh-reveal">' +
            '<div class="mh-radar" data-radar="' + esc(c.nameEN) + '">' + radarInner(c.nameEN) + '</div>' +
            '<div class="mh-wrs">' +
              '<div class="mh-wr ' + (c.wr >= 50 ? 'wr-g' : 'wr-b') + '"><b>' + c.wr.toFixed(1) + '%</b><span>WR</span></div>' +
              '<div class="mh-wr mh-wr-pr"><b>' + c.pr.toFixed(1) + '%</b><span>PR</span></div>' +
              '<div class="mh-wr mh-wr-br"><b>' + c.br.toFixed(1) + '%</b><span>BR</span></div>' +
            '</div><div class="click-tip">клик → карточка чемпа</div>' +
          '</div></div>';
      }).join('') + '</div></div>';
  }

  /* 4 — Топ-5 WR (со спарклайном тренда) */
  function topWrBlock(list) {
    var rows = list.map(function (c, i) {
      var h = wrHist(c);
      return '<div class="hc-row go" data-go="champ" data-label="' + esc(c.name) + '"><span class="rank-i">' + (i + 1) + '</span>' + portByName(c.name) +
        '<span class="hc-n">' + esc(c.name) + '</span>' + spark(h.vals, c.trend >= 0 ? 'up' : 'dn', 44, 16) +
        '<span class="hc-v ' + wrCls(c.wr) + '">' + c.wr.toFixed(1) + '%</span></div>';
    }).join('');
    return '<div class="hub-card glass"><h4>📈 Топ-5 по винрейту <span class="pill-lbl">' + M.rankLabels[S.rank] + '</span>' + shareBtn('champ', 'Топ по винрейту') + '</h4>' + rows + '</div>';
  }

  /* 5 — S-тир */
  function sTierBlock(list) {
    if (!list.length) return '<div class="hub-card glass"><h4>🎖 S-тир сейчас</h4><div class="empty"><b>Нет чемпов с WR ≥ 52%</b> на этом ранге.</div></div>';
    return '<div class="hub-card glass"><h4>🎖 S-тир сейчас <span class="pill-lbl">WR ≥ 52%</span></h4><div class="hc-pool">' +
      list.map(function (c) { return '<div class="hc-champ go" data-go="champ" data-label="' + esc(c.name) + '">' + portByName(c.name) + '<span>' + esc(c.name) + '</span></div>'; }).join('') + '</div></div>';
  }

  /* 6 — Топ пикрейт · 7 — Топ банрейт */
  function topRateBlock(list, kind) {
    var isBan = kind === 'ban';
    var rows = list.map(function (c, i) {
      var v = isBan ? c.br : c.pr;
      return '<div class="hc-row go" data-go="champ" data-label="' + esc(c.name) + '"><span class="rank-i">' + (i + 1) + '</span>' + portByName(c.name) +
        '<span class="hc-n">' + esc(c.name) + '</span><span class="hc-v ' + (isBan ? 'wr-b' : 'wr-n') + '">' + v.toFixed(1) + '%</span></div>';
    }).join('');
    return '<div class="hub-card glass"><h4>' + (isBan ? '🚫 Топ по банрейту' : '🎯 Топ по пикрейту') + shareBtn('champ', isBan ? 'Топ банов' : 'Топ пиков') + '</h4>' + rows + '</div>';
  }

  /* Контрят героя (из гайда) */
  function counterBlock(c) {
    var cs = c.r.heroCounters || [];
    var head = '<h4>⚔ Контрят ' + esc(c.hero.name) + shareBtn('champ', 'Контры ' + c.hero.name) + '</h4>';
    if (!cs.length) return '<div class="hub-card glass">' + head + '<div class="empty"><b>Нет данных о контрах.</b></div></div>';
    return '<div class="hub-card glass">' + head + '<div class="hc-pool">' +
      cs.map(function (nEn) { var nm = (byName[nEn] ? nEn : nEn); return '<div class="hc-champ go" data-go="champ" data-label="' + esc(nEn) + '"><img class="port" src="' + (idByEn(nEn) ? iconUrl(idByEn(nEn)) : FB) + '" onerror="' + imgErr + '" alt=""><span>' + esc(nEn) + '</span></div>'; }).join('') + '</div></div>';
  }
  var _enId = {}; Object.keys(M.byRank).forEach(function (rk) { (M.byRank[rk].pool || []).forEach(function (c) { _enId[gnorm(c.nameEN)] = c.heroId; }); });
  function idByEn(en) { return _enId[gnorm(en)]; }

  /* 10 — Ближайшие турниры (DEMO / из базы) */
  function toursBlock() {
    var t = tours();
    var head = '<h4>🏆 Ближайшие турниры' + (t.real ? '' : (t.list.length ? ' <span class="demo">демо</span>' : '')) + '<button class="go-all" data-go="esports">В Турниры →</button></h4>' + shareBtn('esports', 'Турниры');
    if (!t.list.length) return '<div class="hub-card glass">' + head + '<div class="empty"><b>Сейчас нет активных турниров.</b><br>Список тянется из турнирной базы (Турниры Wild Rift). Появится турнир — плитка заполнится сама.</div></div>';
    return '<div class="hub-card glass">' + head + t.list.map(function (x) {
      return '<div class="hc-tour go" data-go="esports" data-label="' + esc(x.name) + '">' + (x.live ? '<span class="es-live">LIVE</span>' : '<span class="hc-dot">' + (x.dot || '⚪') + '</span>') + '<b>' + esc(x.name) + '</b><span class="hc-when">' + esc(x.when) + '</span></div>';
    }).join('') + '</div>';
  }

  /* 11 — Что нового (лента изменений) */
  function newsBlock() {
    var n = news();
    var head = '<h4>📰 Что нового <span class="pill-lbl">Патч ' + M.patch + '</span>' + (n.real ? '' : (n.list.length ? ' <span class="demo">демо</span>' : '')) + '<button class="go-all" data-go="patch">Все изменения →</button></h4>' + shareBtn('patch', 'Патч ' + M.patch);
    if (!n.list.length) return '<div class="hub-card glass">' + head + '<div class="empty"><b>Патч-ноты ещё не подключены.</b><br>Как появится лента изменений — топ буфов/нерфов встанет сюда.</div></div>';
    return '<div class="hub-card glass">' + head + '<ul class="hc-news">' + n.list.map(function (x) {
      var clickable = byName[x.name];
      return '<li' + (clickable ? ' class="go" data-go="champ" data-label="' + esc(x.name) + '"' : '') + '><span class="n-ico">' + x.ico + '</span><b>' + esc(x.name) + '</b> <span>' + esc(x.what) + '</span>' + (x.kind ? '<span class="n-kind ' + x.kind + '">' + (x.kind === 'buff' ? 'БУФ' : 'НЕРФ') + '</span>' : '') + '</li>';
    }).join('') + '</ul></div>';
  }

  var bento = document.getElementById('bento');
  function render() {
    var c = ctx();
    // ТОЧЕЧНО: labMorph трогает только изменившееся, а не пересобирает бенто (антидёрганье)
    labMorph(bento,
      heroBlock(c.hero) + kpiBlock(c) + fanBlock(c.top5) +
      '<div class="hub-cards">' +
        topWrBlock(c.top5) + sTierBlock(c.sTier) + topRateBlock(c.topPr, 'pick') + topRateBlock(c.topBr, 'ban') +
        counterBlock(c) + toursBlock() + newsBlock() +
      '</div>');
    // радары веера дозаполняются по готовности qualities (пустой бокс держит размер — без мигания)
    loadQualities().then(function () {
      bento.querySelectorAll('.mh-radar[data-radar]').forEach(function (el) { if (!el.innerHTML.trim()) el.innerHTML = radarInner(el.getAttribute('data-radar')); });
    });
    // снять класс .fresh после первого проигрыша, чтобы при ре-рендере не мигало лишний раз
    var fan = bento.querySelector('.mh-fan-wrap.fresh');
    if (fan) setTimeout(function () { fan.classList.remove('fresh'); }, 400);
  }

  /* визуальные варианты — ТОЛЬКО data-* на .app (CSS), без ре-рендера бенто */
  function applyVisual() { VISUAL.forEach(function (k) { app.dataset[k] = S[k]; }); }

  /* ============================================================
     РАНГИ
     ============================================================ */
  var rankPills = document.getElementById('rankPills');
  rankPills.innerHTML = M.ranks.map(function (rk) { return '<button class="pill' + (rk === S.rank ? ' on' : '') + '" data-r="' + rk + '">' + M.rankLabels[rk] + '</button>'; }).join('');
  rankPills.onclick = function (e) { var b = e.target.closest('.pill'); if (!b) return; S.rank = b.dataset.r; rankPills.querySelectorAll('.pill').forEach(function (x) { x.classList.toggle('on', x === b); }); render(); updateChoice(); };

  document.getElementById('patchBadge').innerHTML = 'Патч <b>' + M.patch + '</b> · снимок <b>' + M.updated + '</b> · lolm.qq.com';

  /* ============================================================
     ⚙ НАСТРОЙКИ ЮЗЕРА
     ============================================================ */
  var DD = 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash';
  var ARTS = [
    { v: 'thresh', t: 'Thresh', key: 'Thresh', kind: 'dark' }, { v: 'nocturne', t: 'Nocturne', key: 'Nocturne', kind: 'dark' }, { v: 'yasuo', t: 'Yasuo', key: 'Yasuo', kind: 'dark' },
    { v: 'lux', t: 'Lux', key: 'Lux', kind: 'light' }, { v: 'soraka', t: 'Soraka', key: 'Soraka', kind: 'light' }, { v: 'janna', t: 'Janna', key: 'Janna', kind: 'light' },
    { v: 'jinx', t: 'Jinx', key: 'Jinx', kind: 'busy' }, { v: 'zoe', t: 'Zoe', key: 'Zoe', kind: 'busy' }, { v: 'ahri', t: 'Ahri', key: 'Ahri', kind: 'busy' }
  ];
  var KIND_LBL = { dark: 'Тёмные — текст читается легко', light: 'СВЕТЛЫЕ — худший случай, тут и проверяй', busy: 'Пёстрые — много контраста' };
  var artUrl = function (a) { return DD + '/' + a.key + '_0.jpg'; };
  var splashEl = $('.splash');
  function applySplash() { var a = ARTS.filter(function (x) { return x.v === S.splash; })[0] || ARTS[0]; splashEl.style.backgroundImage = "url('" + artUrl(a) + "')"; }

  var ssHost = document.getElementById('ssHost');
  ssHost.innerHTML = '<div class="ss-grp"><div class="ss-label">Арт фона за стеклом — ОДИН на весь сайт</div>' +
    ['dark', 'light', 'busy'].map(function (kind) {
      return '<div class="ss-kind">' + KIND_LBL[kind] + '</div><div class="ss-splash">' + ARTS.filter(function (a) { return a.kind === kind; }).map(function (a) {
        return '<button class="ss-thumb' + (S.splash === a.v ? ' on' : '') + '" data-v="' + a.v + '" title="' + a.t + '" style="background-image:url(\'' + artUrl(a) + '\')"><span>' + a.t + '</span></button>';
      }).join('') + '</div>';
    }).join('') + '<div class="ss-hint">Читабельность подбирай на СВЕТЛОМ арте (Lux/Soraka) — худший случай.</div></div>';
  ssHost.querySelectorAll('.ss-thumb').forEach(function (b) { b.onclick = function () { S.splash = b.dataset.v; ssHost.querySelectorAll('.ss-thumb').forEach(function (x) { x.classList.toggle('on', x === b); }); applySplash(); updateChoice(); }; });

  var pop = document.getElementById('settingsPop');
  document.getElementById('gearBtn').onclick = function () { pop.hidden = !pop.hidden; };
  document.getElementById('setClose').onclick = function () { pop.hidden = true; };

  document.querySelectorAll('.sw').forEach(function (sw) { sw.onclick = function () { S.accent = sw.dataset.accent; document.querySelectorAll('.sw').forEach(function (x) { x.classList.toggle('active', x === sw); }); root.style.setProperty('--accent', S.accent); updateChoice(); }; });

  function wireRange(id, valId, key, token, toVal, fmtCss, fmtLbl) { var r = document.getElementById(id), v = document.getElementById(valId); r.oninput = function () { S[key] = toVal(r.value); root.style.setProperty(token, fmtCss(S[key])); v.textContent = fmtLbl(S[key]); updateChoice(); }; }
  wireRange('opRange', 'opVal', 'op', '--glass-op', function (x) { return x / 100; }, String, function (x) { return x.toFixed(2); });
  wireRange('blurRange', 'blurVal', 'blur', '--glass-blur', function (x) { return parseInt(x, 10); }, function (x) { return x + 'px'; }, function (x) { return x + 'px'; });
  wireRange('darkRange', 'darkVal', 'dark', '--glass-dark', parseFloat, String, function (x) { return x.toFixed(2); });

  /* ============================================================
     ДИЗАЙН-ПОЛОСА
     ============================================================ */
  var GROUPS = [
    { key: 'heroart', label: 'Лидер · арт-фон', items: [['on', 'Вкл'], ['off', 'Выкл']] },
    { key: 'herosize', label: 'Лидер · размер', items: [['normal', 'Норм'], ['compact', 'Компакт']] },
    { key: 'kpi', label: 'KPI', items: [['cards', '4 карточки'], ['strip', 'Полоской']] },
    { key: 'cards', label: 'Колонок в сетке', items: [['2', '2'], ['3', '3'], ['4', '4']] },
    { key: 'lists', label: 'Топ-списки', items: [['bars', 'Со спарклайном'], ['plain', 'Чисто']] },
    { key: 'stier', label: 'S-тир', items: [['icons', 'Иконками'], ['rows', 'Строками']] },
    { key: 'spark', label: 'Спарклайны', items: [['on', 'Вкл'], ['off', 'Выкл']] },
    { key: 'density', label: 'Плотность', items: [['compact', 'Компакт'], ['normal', 'Норм'], ['roomy', 'Просторно']] },
    { key: 'radius', label: 'Углы', items: [['sharp', '10'], ['normal', '15'], ['round', '24']] },
    { key: 'hover', label: 'Hover карточек', items: [['on', 'Вкл'], ['off', 'Выкл']] },
    { key: 'srcTours', label: 'Турниры (источник)', items: [['demo', 'Есть (демо)'], ['empty', 'Пусто']] },
    { key: 'srcNews', label: '«Что нового» (источник)', items: [['demo', 'Есть (демо)'], ['empty', 'Пусто']] }
  ];
  var CONTENT_KEYS = { srcTours: 1, srcNews: 1 };   // эти требуют ре-рендера (меняют данные блока)

  var stripBody = document.getElementById('stripBody');
  stripBody.innerHTML = GROUPS.map(function (g) {
    return '<div class="lg"><span class="lg-lbl">' + g.label + '</span><div class="seg" data-key="' + g.key + '">' +
      g.items.map(function (it) { return '<button data-v="' + it[0] + '"' + (S[g.key] === it[0] ? ' class="on"' : '') + '>' + it[1] + '</button>'; }).join('') + '</div></div>';
  }).join('') + '<div class="strip-choice">Ваш выбор: <b id="choiceText">…</b></div>' + '<button class="strip-copy" id="stripCopy">📋 Скопировать мой выбор</button>';

  stripBody.querySelectorAll('.seg').forEach(function (seg) {
    seg.onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var key = seg.dataset.key;
      S[key] = b.dataset.v;
      seg.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
      if (CONTENT_KEYS[key]) render();   // меняет данные → ре-рендер
      else applyVisual();                // визуальное → только CSS, без ре-рендера (НЕ дёргаем)
      updateChoice();
    };
  });

  var choiceText = document.getElementById('choiceText');
  function updateChoice() {
    var lbl = function (key) { var g = GROUPS.filter(function (x) { return x.key === key; })[0]; if (!g) return S[key]; var it = g.items.filter(function (i) { return i[0] === S[key]; })[0]; return it ? it[1] : S[key]; };
    var s = 'Лидер ' + lbl('heroart') + '/' + lbl('herosize') + ' · KPI ' + lbl('kpi') + ' · сетка ' + lbl('cards') + ' кол · списки ' + lbl('lists') +
      ' · S-тир ' + lbl('stier') + ' · спарклайны ' + lbl('spark') + ' · плотн. ' + lbl('density') + ' · углы ' + lbl('radius') + ' · hover ' + lbl('hover') +
      ' || ⚙ арт ' + S.splash + ' · акцент(данные) ' + S.accent + ' · стекло op ' + S.op.toFixed(2) + '/blur ' + S.blur + 'px/dark ' + S.dark.toFixed(2) + ' · ранг ' + M.rankLabels[S.rank];
    choiceText.textContent = s;
    return s;
  }

  var COPY = '📋 Скопировать мой выбор';
  var stripCopy = document.getElementById('stripCopy');
  stripCopy.onclick = function () { var s = updateChoice(); var done = function () { stripCopy.textContent = 'Скопировано ✓'; setTimeout(function () { stripCopy.textContent = COPY; }, 1200); }; if (navigator.clipboard) navigator.clipboard.writeText(s).then(done, function () { fallbackCopy(s); done(); }); else { fallbackCopy(s); done(); } };
  function fallbackCopy(s) { var ta = document.createElement('textarea'); ta.value = s; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} document.body.removeChild(ta); }

  /* ★ СЧЁТЧИК УЗЛОВ — приёмка: пометить, выполнить действие, посчитать выживших */
  var countEl = document.getElementById('nodeCount');
  document.getElementById('countVisual').onclick = function () {
    var nodes = bento.querySelectorAll('.hub-card, .f-kpi, .mh-card, .hub-hero');
    nodes.forEach(function (n) { n.__keep = true; }); var total = nodes.length;
    app.dataset.density = (S.density === 'roomy' ? 'compact' : 'roomy'); // визуальный тумблер
    var live = bento.querySelectorAll('.hub-card, .f-kpi, .mh-card, .hub-hero');
    var kept = 0; live.forEach(function (n) { if (n.__keep) kept++; });
    app.dataset.density = S.density;
    countEl.textContent = 'Визуальный тумблер: ' + kept + '/' + total + ' узлов выжили (здорово — 0 пересоздано)';
  };
  document.getElementById('countRank').onclick = function () {
    var nodes = bento.querySelectorAll('.hub-card, .f-kpi, .mh-card, .hub-hero');
    nodes.forEach(function (n) { n.__keep = true; }); var total = nodes.length;
    render();
    var live = bento.querySelectorAll('.hub-card, .f-kpi, .mh-card, .hub-hero');
    var kept = 0; live.forEach(function (n) { if (n.__keep) kept++; });
    countEl.textContent = 'Ре-рендер данных: ' + kept + '/' + total + ' выжили (ожидаемо 0 — сменились все данные, как в боевом)';
  };

  var labStrip = document.getElementById('labStrip');
  var stripMin = document.getElementById('stripMin');
  stripMin.onclick = function () { var min = labStrip.classList.toggle('min'); stripMin.textContent = min ? 'Развернуть' : 'Свернуть'; };

  var stripHead = document.getElementById('stripHead');
  var dragging = false, offX = 0, offY = 0;
  stripHead.addEventListener('mousedown', function (e) {
    if (e.target.closest('button')) return;
    var r = labStrip.getBoundingClientRect();
    labStrip.style.transform = 'none'; labStrip.style.left = r.left + 'px'; labStrip.style.top = r.top + 'px'; labStrip.style.width = r.width + 'px';
    offX = e.clientX - r.left; offY = e.clientY - r.top; dragging = true; e.preventDefault();
  });
  window.addEventListener('mousemove', function (e) { if (!dragging) return; var x = Math.max(0, Math.min(e.clientX - offX, window.innerWidth - labStrip.offsetWidth)); var y = Math.max(0, Math.min(e.clientY - offY, window.innerHeight - labStrip.offsetHeight)); labStrip.style.left = x + 'px'; labStrip.style.top = y + 'px'; });
  window.addEventListener('mouseup', function () { dragging = false; });

  /* старт */
  applyVisual();
  root.style.setProperty('--accent', S.accent);
  applySplash();
  render();
  updateChoice();
})();
