/* ══════════════════════════════════════════════════════════════════════════
   champ-page.js — СТРАНИЦА ЧЕМПИОНА. ОДИН источник разметки на два мира.

   Э1.9 · порт из lab-hover-reveal (openPage, pageLayout:'sidebar' — выбор Эржана
   в LAB-CHOICES). Решение владельца Р1 = «D»: страница чемпа и SEO-страница —
   ОДНА вещь по одному адресу `champions/<slug>/`.

     · СТАТИКА  — seo/generate.mjs зовёт renderHTML() в Node и печатает результат
                  прямо в HTML-файл. Поисковик видит весь текст без JS.
     · SPA      — app.js зовёт ТУ ЖЕ renderHTML() и кладёт результат в вид-панель,
                  адрес меняет pushState. Рельс сайта остаётся на месте (Р6).

   Почему так, а не два рендера: два рендера = два вида одной страницы, которые
   расходятся через неделю. Здесь расходиться нечему — разметку печатает одна
   функция, различается только СБОРКА данных (в Node — из файлов/Firestore,
   в браузере — из живого состояния приложения).

   ЧЕГО ЗДЕСЬ НЕТ И ПОЧЕМУ (решения владельца 2026-08-22):
     · видео YouTube/Twitch — источника данных нет, фейк не показываем (Р4);
     · «★ Избранное» — фичи нет (Р4);
     · спарклайн «WR по патчам» — истории патчей нет, рисуем текущий WR (Р4);
     · EN-описания умений — публикуем русские имена и числа (Р5);
     · админ-кнопки и личные матчапы — только в SPA, в статике их нет (Р3).

   АНТИДЁРГАНЬЕ: ползунок уровня и вкладки умений меняют ТОЧЕЧНО (textContent /
   класс), innerHTML на контейнер не пишется — см. hydrate().
   ══════════════════════════════════════════════════════════════════════════ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ChampPage = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function num(v, d) { var n = Number(v); return isFinite(n) ? n : (d || 0); }
  function slugify(s) {
    return String(s).toLowerCase().replace(/['’.]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  /* Стат на уровне: база + рост × (уровень − 1) — та же формула, что в таблице Статс.
     СКОРОСТЬ АТАКИ — исключение: её рост в данных задан В ПРОЦЕНТАХ от базы
     (AS_Growth: 2.5 = +2.5% за уровень). Считать её плоско = 35 атак в секунду
     на 15 уровне; проверено на Эзреале в браузере. */
  function statAt(b, g, lv, id) {
    var v = id === 'as'
      ? num(b) * (1 + (num(g) / 100) * (lv - 1))
      : num(b) + (lv - 1) * num(g);
    return Math.round(v * 1000) / 1000;
  }
  function tierCls(t) { return 'cp-t-' + String(t || 'c').toLowerCase(); }
  function wrCls(v) { return v == null ? '' : (v >= 51 ? ' is-good' : (v < 49 ? ' is-bad' : '')); }
  function fmt(v, dec) { return v == null ? '—' : Number(v).toFixed(dec == null ? 1 : dec); }

  /* ── СТАТЫ СТРАНИЦЫ. base/growth приходят из base-stats.json (тот же источник,
        что у таблицы Статс). Цвет даёт CSS по data-stat, инлайн-цветов нет. ── */
  var STATS = [
    { id: 'ad', lbl: 'AD', dec: 0 },
    { id: 'hp', lbl: 'HP', dec: 0 },
    { id: 'armor', lbl: 'Броня', dec: 0 },
    { id: 'mr', lbl: 'Mrez', dec: 0 },
    { id: 'mana', lbl: 'Мана', dec: 0 },
    { id: 'rng', lbl: 'Дальность', dec: 0 },
    { id: 'as', lbl: 'Ск. атаки', dec: 3 },
    { id: 'ms', lbl: 'Ск. пер.', dec: 0 },
    { id: 'hpreg', lbl: 'Реген HP', dec: 1 },
    { id: 'mpreg', lbl: 'Реген маны', dec: 1 }
  ];
  var SLOT_LBL = { passive: 'Пасс', p: 'Пасс', q: 'Q', w: 'W', e: 'E', r: 'R' };
  var DMG_LBL = { phys: 'физ.', magic: 'маг.', true: 'чистый', mixed: 'смеш.' };

  /* ══ ДАННЫЕ ═══════════════════════════════════════════════════════════════
     buildData сводит сырые куски к одной форме. Куски собирает вызывающая
     сторона (Node — из файлов, браузер — из живого состояния): источники разные,
     нормализация одна. Всё необязательное может отсутствовать — блок просто
     не нарисуется (пустых заглушек и демо-цифр не показываем).                */
  function buildData(src) {
    var row = src.row || {};
    var name = src.name || row.name || '';
    var d = {
      name: name,
      ru: src.ru || name,
      en: src.en || name,
      slug: src.slug || slugify(name),
      icon: src.icon || '',
      key: src.key || name,
      roles: src.roles || [],
      res: row.res || src.res || '',
      stats: src.stats || {
        ad: [row.ad_b, row.ad_g], hp: [row.hp_b, row.hp_g], mana: [row.mn_b, row.mn_g],
        armor: [row.ar_b, row.ar_g], mr: [row.mr_b, row.mr_g], rng: [row.rng_b, row.rng_g],
        as: [row.as_b, row.as_g], ms: [row.ms_b, 0],
        hpreg: [row.hpreg_b, row.hpreg_g], mpreg: [row.mpreg_b, row.mpreg_g]
      },
      meta: src.meta || null,        /* {tier,wr,pr,br,trend,role} — wr-stats.json */
      wrRanks: src.wrRanks || [],    /* [{rank,role,wr,pr}] — Firestore winrates   */
      qual: src.qual || null,        /* {damage,difficult,survive,utility} 1..3    */
      abils: src.abils || [],        /* champion-abilities.json                    */
      guide: src.guide || null,      /* data-pipeline/guides/<slug>.json           */
      mu: src.mu || null,            /* {best,worst,rank,lane,date} из гайда       */
      counters: src.counters || null,/* counters.json (редакторские)               */
      patch: src.patch || null,      /* {type,patch,change} — Firestore patchnotes */
      tags: src.tags || []           /* категории сайта (только SPA)               */
    };
    return d;
  }

  /* ══ КУСКИ РАЗМЕТКИ ══════════════════════════════════════════════════════ */

  function sec(id, title, inner, note) {
    if (!inner) return '';
    return '<section class="cp-sec glass" data-sec="' + id + '">' +
      '<h2 class="cp-sec-h">' + esc(title) + (note ? '<span class="cp-sec-note">' + esc(note) + '</span>' : '') + '</h2>' +
      inner + '</section>';
  }

  /* Радар качеств: оси из champion-qualities.json (реальные, шкала 1..3). */
  var RAXES = [
    { f: 'damage', lbl: 'Урон' }, { f: 'difficult', lbl: 'Сложн.' },
    { f: 'survive', lbl: 'Выжив.' }, { f: 'utility', lbl: 'Польза' }
  ];
  /* viewBox шире фигуры: подписи осей стоят на 1.38 радиуса и при тесной коробке
     обрезались по бокам (поймано в браузере на Эзреале). */
  function radarHTML(q) {
    if (!q) return '';
    var cx = 130, cy = 100, R = 56, n = RAXES.length;
    function pt(i, f) {
      var a = (-90 + i * (360 / n)) * Math.PI / 180;
      return [(cx + Math.cos(a) * R * f).toFixed(1), (cy + Math.sin(a) * R * f).toFixed(1)];
    }
    var grid = [0.34, 0.67, 1].map(function (g) {
      return '<polygon class="cp-rd-grid" points="' + RAXES.map(function (_, i) { return pt(i, g).join(','); }).join(' ') + '"/>';
    }).join('');
    var axes = RAXES.map(function (_, i) {
      var e = pt(i, 1);
      return '<line class="cp-rd-ax" x1="' + cx + '" y1="' + cy + '" x2="' + e[0] + '" y2="' + e[1] + '"/>';
    }).join('');
    var labels = RAXES.map(function (a, i) {
      var l = pt(i, 1.38), v = num(q[a.f], 0);
      return '<text class="cp-rd-lbl" x="' + l[0] + '" y="' + l[1] + '">' + a.lbl + ' ' + v + '</text>';
    }).join('');
    var data = RAXES.map(function (a, i) { return pt(i, Math.max(0.08, num(q[a.f], 0) / 3)).join(','); }).join(' ');
    return '<div class="cp-radar"><svg viewBox="0 0 260 196" role="img" aria-label="Качества чемпиона">' +
      grid + axes + '<polygon class="cp-rd-data" points="' + data + '"/>' + labels + '</svg></div>';
  }

  function patchHTML(p) {
    if (!p) return '';
    var t = p.type === 'buff' ? 'buff' : p.type === 'adjust' ? 'adjust' : 'nerf';
    var lbl = t === 'buff' ? 'БАФФ' : t === 'adjust' ? 'КОРРЕКТИРОВКА' : 'НЕРФ';
    return '<div class="cp-patch cp-p-' + t + '" data-patch>' +
      '<div class="cp-patch-h"><b>' + lbl + '</b><span>Патч ' + esc(p.patch || '') + '</span></div>' +
      (p.change ? '<div class="cp-patch-txt">' + esc(p.change) + '</div>' : '') + '</div>';
  }

  function heroHTML(d, mode) {
    var m = d.meta || {};
    var tier = m.tier ? '<span class="cp-tier ' + tierCls(m.tier) + '">' + esc(m.tier) + '</span>' : '';
    var roles = (d.roles || []).map(function (r) { return '<span class="cp-role">' + esc(r) + '</span>'; }).join('');
    var tags = (d.tags || []).map(function (t) { return '<span class="cp-tag">' + esc(t.name || t) + '</span>'; }).join('');
    var chips = '';
    if (m.wr != null) chips += '<div class="cp-kpi"><b class="cp-num' + wrCls(m.wr) + '">' + fmt(m.wr) + '%</b><i>винрейт</i></div>';
    if (m.pr != null) chips += '<div class="cp-kpi"><b class="cp-num">' + fmt(m.pr) + '%</b><i>пикрейт</i></div>';
    if (m.br != null) chips += '<div class="cp-kpi"><b class="cp-num">' + fmt(m.br) + '%</b><i>банрейт</i></div>';

    /* ЗАКОН СВЯЗЕЙ: из страницы чемпа есть выход в соседние инструменты.
       В статике это обычные ссылки, в SPA их перехватывает hydrate. */
    var acts = '<div class="cp-acts">' +
      '<a class="cp-act" href="' + (mode === 'spa' ? '#' : '/') + '" data-act="calc">Калькулятор урона</a>' +
      '<a class="cp-act" href="/tier-list/" data-act="tier">Тир-лист</a>' +
      (mode === 'spa' ? '<button class="cp-act" type="button" data-act="cmp">Сравнить</button>' +
        '<button class="cp-act" type="button" data-act="share">В чат</button>' : '') +
      '</div>';

    return '<div class="cp-hero glass">' +
      '<div class="cp-hero-top">' +
        '<img class="cp-port" src="' + esc(d.icon) + '" alt="' + esc(d.ru) + ' Wild Rift" width="112" height="112" loading="eager">' +
        '<div class="cp-hero-id">' +
          '<div class="cp-name-row"><span class="cp-name">' + esc(d.ru) + '</span>' + tier + '</div>' +
          (d.en && d.en !== d.ru ? '<div class="cp-name-en">' + esc(d.en) + '</div>' : '') +
          (roles ? '<div class="cp-roles">' + roles + '</div>' : '') +
        '</div>' +
      '</div>' +
      (tags ? '<div class="cp-tags">' + tags + '</div>' : '') +
      (chips ? '<div class="cp-kpis">' + chips + '</div>' : '') +
      radarHTML(d.qual) +
      patchHTML(d.patch) +
      '<div class="cp-admin" data-admin hidden></div>' +
      acts +
      '</div>';
  }

  /* ── Умения: РУССКИЕ имена + числа (Р5). EN/CN-текста здесь нет. ── */
  function abilVarsHTML(sp) {
    var rows = [];
    if (sp.cd && sp.cd.length && sp.cd.some(function (x) { return num(x) > 0; })) {
      rows.push({ l: 'Перезарядка', v: sp.cd.map(function (x) { return fmt(x, 0) + ' с'; }) });
    }
    if (sp.cost && sp.cost.length && sp.cost.some(function (x) { return num(x) > 0; })) {
      var unit = sp.costType === 'energy' || sp.costType === 'EN' ? 'эн.' : 'маны';
      rows.push({ l: 'Стоимость', v: sp.cost.map(function (x) { return fmt(x, 0) + ' ' + unit; }) });
    }
    (sp.components || []).forEach(function (c) {
      var kind = c.kind === 'heal' ? 'Лечение' : c.kind === 'shield' ? 'Щит' : 'Урон';
      var typ = c.kind === 'damage' && DMG_LBL[c.dmgType] ? ' (' + DMG_LBL[c.dmgType] + ')' : '';
      if (c.base && c.base.some(function (x) { return num(x) > 0; })) {
        rows.push({ l: kind + typ, v: c.base.map(function (x) { return fmt(x, 0); }) });
      }
      if (c.adRatio) rows.push({ l: 'Коэфф. AD', v: c.adRatio.map(function (x) { return Math.round(num(x) * 100) + '%'; }) });
      if (c.bonusAdRatio) rows.push({ l: 'Коэфф. доп. AD', v: c.bonusAdRatio.map(function (x) { return Math.round(num(x) * 100) + '%'; }) });
      if (c.apRatio) rows.push({ l: 'Коэфф. AP', v: c.apRatio.map(function (x) { return Math.round(num(x) * 100) + '%'; }) });
      if (c.targetMaxHpPct) rows.push({ l: '% макс. HP цели', v: c.targetMaxHpPct.map(function (x) { return Math.round(num(x) * 1000) / 10 + '%'; }) });
    });
    if (!rows.length) return '';
    return '<div class="cp-ab-vars">' + rows.map(function (r) {
      var vals = (Array.isArray(r.v) ? r.v : [r.v]);
      return '<div class="cp-ab-var"><span class="cp-ab-l">' + esc(r.l) + '</span><span class="cp-ab-v">' +
        vals.map(function (x) { return '<i>' + esc(x) + '</i>'; }).join('<u>/</u>') + '</span></div>';
    }).join('') + '</div>';
  }
  function abilOne(sp) {
    return '<div class="cp-ab-info">' +
      '<div class="cp-ab-head">' +
        (sp.icon ? '<img class="cp-ab-ic" src="' + esc(sp.icon) + '" alt="" loading="lazy">' : '') +
        '<div><div class="cp-ab-name">' + esc(sp.nameRu || sp.name || '') + '</div>' +
        '<div class="cp-ab-slot">' + esc(SLOT_LBL[sp.slot] || sp.key || '') + '</div></div>' +
      '</div>' + abilVarsHTML(sp) + '</div>';
  }
  function secAbilities(d) {
    var ab = (d.abils || []).filter(function (s) { return s && (s.nameRu || s.name); });
    if (!ab.length) return '';
    /* ВСЕ слоты печатаем сразу (поисковик видит текст), показываем один —
       переключение вкладок = смена класса, разметка не пересоздаётся.
       Открыт по умолчанию Q (как в лабе): у пассивки чаще всего нет чисел. */
    var openIdx = 0;
    ab.forEach(function (sp, i) { if (openIdx === 0 && sp.slot === 'q') openIdx = i; });
    var rail = '<div class="cp-ab-rail" role="tablist">' + ab.map(function (sp, i) {
      return '<button class="cp-ab-btn' + (i === openIdx ? ' is-on' : '') + '" type="button" role="tab" data-slot="' + esc(sp.slot) + '">' +
        (sp.icon ? '<img src="' + esc(sp.icon) + '" alt="" loading="lazy">' : '') +
        '<span>' + esc(SLOT_LBL[sp.slot] || sp.key || '') + '</span></button>';
    }).join('') + '</div>';
    var panes = ab.map(function (sp, i) {
      return '<div class="cp-ab-pane" data-slot="' + esc(sp.slot) + '"' + (i === openIdx ? '' : ' hidden') + '>' + abilOne(sp) + '</div>';
    }).join('');
    return sec('abil', 'Умения', '<div class="cp-abil">' + rail + '<div class="cp-ab-body">' + panes + '</div></div>',
      'числа по рангам');
  }

  /* Гайд называет умения по-английски («Mystic Shot»), а игрок думает слотами.
     Сводим имя → слот по champion-abilities (там есть nameEn/nameRu), и показываем
     Q/W/E/R + русское имя. Не сошлось — показываем как есть, без выдумок. */
  function slotOfAbility(d, nameEn) {
    var n = String(nameEn || '').toLowerCase().replace(/[^a-zа-яё0-9]/gi, '');
    if (!n) return null;
    var hit = (d.abils || []).filter(function (sp) {
      return [sp.nameEn, sp.nameRu, sp.name].some(function (x) {
        return x && String(x).toLowerCase().replace(/[^a-zа-яё0-9]/gi, '') === n;
      });
    })[0];
    return hit ? { key: SLOT_LBL[hit.slot] || hit.key || '', ru: hit.nameRu || nameEn } : null;
  }
  function secSkillOrder(d) {
    var so = d.guide && d.guide.skillOrder;
    if (!so || !so.length) return '';
    var lv = {};
    so.forEach(function (s) {
      var hit = slotOfAbility(d, s.ability);
      var k = hit ? hit.key : String(s.ability || '').trim().slice(0, 1).toUpperCase();
      (s.levels || []).forEach(function (l) { lv[num(l)] = k; });
    });
    var dots = '';
    for (var i = 1; i <= 15; i++) {
      var k = lv[i] || '';
      dots += '<span class="cp-sk-dot' + (k ? ' is-on' : '') + '"><b>' + esc(k || '·') + '</b><i>' + i + '</i></span>';
    }
    var order = so.map(function (s) {
      var hit = slotOfAbility(d, s.ability);
      return '<b>' + esc(hit ? hit.key + ' · ' + hit.ru : s.ability) + '</b>';
    }).join(' › ');
    return sec('skill', 'Порядок прокачки',
      '<div class="cp-sk-max">Качаем: ' + order + '</div><div class="cp-sk-row">' + dots + '</div>');
  }

  /* ── Статы: ползунок + чипсы + таблица по уровням (была только в SEO, B1) ── */
  function secStats(d, lv) {
    var st = d.stats || {}, chips = '', has = false;
    STATS.forEach(function (s) {
      var pair = st[s.id];
      if (!pair) return;
      var b = num(pair[0]), g = num(pair[1]);
      if (!b && !g) return;
      has = true;
      var isRes = s.id === 'mana' && d.res && /energy/i.test(d.res);
      var lbl = isRes ? 'Энергия' : s.lbl;
      var val = isRes ? 200 : statAt(b, g, lv, s.id);
      chips += '<div class="cp-stat" data-stat="' + s.id + '">' +
        '<span class="cp-stat-v cp-num" data-b="' + b + '" data-g="' + (isRes ? 0 : g) + '" data-dec="' + s.dec + '" data-id="' + s.id + '">' + fmt(val, s.dec) + '</span>' +
        '<span class="cp-stat-l">' + esc(lbl) + '</span></div>';
    });
    if (!has) return '';
    var lvls = [1, 5, 10, 15];
    var head = '<tr><th>Параметр</th>' + lvls.map(function (l) { return '<th>Ур. ' + l + '</th>'; }).join('') + '<th>За уровень</th></tr>';
    var rows = '';
    STATS.forEach(function (s) {
      var pair = st[s.id]; if (!pair) return;
      var b = num(pair[0]), g = num(pair[1]);
      if (!b && !g) return;
      rows += '<tr><td>' + esc(s.lbl) + '</td>' +
        lvls.map(function (l) { return '<td>' + fmt(statAt(b, g, l, s.id), s.dec) + '</td>'; }).join('') +
        '<td>' + (g ? (s.id === 'as' ? '+' + fmt(g, 1) + '%' : '+' + fmt(g, s.dec === 0 ? 2 : s.dec)) : '—') + '</td></tr>';
    });
    var slider = '<div class="cp-lvl"><div class="cp-lvl-row"><span>УРОВЕНЬ</span><b class="cp-num" data-lvl-num>' + lv + '</b></div>' +
      '<input class="cp-lvl-inp" type="range" min="1" max="15" value="' + lv + '" data-lvl aria-label="Уровень чемпиона"></div>';
    return sec('stats', 'Характеристики по уровням',
      slider + '<div class="cp-stats">' + chips + '</div>' +
      '<div class="cp-tbl-wrap"><table class="cp-tbl"><thead>' + head + '</thead><tbody>' + rows + '</tbody></table></div>');
  }

  function chipList(arr, cls) {
    return (arr || []).map(function (x) {
      return '<span class="cp-chip' + (cls ? ' ' + cls : '') + '">' + esc(x && x.name ? x.name : x) + '</span>';
    }).join('');
  }
  function secBuild(d) {
    var g = d.guide, b = g && g.builds && g.builds[0];
    if (!b || !b.items) return '';
    var it = b.items, out = '';
    if (it.starting && it.starting.length) out += '<div class="cp-sub">Старт</div><div class="cp-chips">' + chipList(it.starting) + '</div>';
    if (it.core && it.core.length) out += '<div class="cp-sub">Ядро</div><div class="cp-chips">' + chipList(it.core) + '</div>';
    if (it.boots && it.boots.length) out += '<div class="cp-sub">Ботинки</div><div class="cp-chips">' + chipList(it.boots) + '</div>';
    if (!out) return '';
    var note = [b.title, b.tier ? 'тир ' + b.tier : '', g.dataDate ? 'данные ' + g.dataDate : ''].filter(Boolean).join(' · ');
    return sec('build', 'Рекомендуемая сборка', out, note);
  }
  function secRunes(d) {
    var g = d.guide; if (!g) return '';
    var out = '';
    if (g.runes && g.runes.length) out += '<div class="cp-sub">Руны</div><div class="cp-chips">' + chipList(g.runes) + '</div>';
    if (g.spells && g.spells.length) {
      out += '<div class="cp-sub">Заклинания</div><div class="cp-chips">' + g.spells.map(function (s) {
        var nm = s && s.combo ? s.combo : s;
        var wr = s && s.wr != null ? ' <i class="cp-chip-wr">' + fmt(s.wr) + '%</i>' : '';
        return '<span class="cp-chip">' + esc(nm) + wr + '</span>';
      }).join('') + '</div>';
    }
    return sec('runes', 'Руны и заклинания', out);
  }

  /* ── Матчапы: реальные WR из гайда + редакторские контры. Личные и авто-из-
        категорий подмешивает SPA (hydrate → api.matchups), в статике их нет. ── */
  /* data-champ = имя ИЗ ТАБЛИЦЫ САЙТА (по нему приложение находит чемпа),
     видимый текст — русское имя. Путать их нельзя: клик по «Самире» с русским
     ключом ничего не находил бы. */
  function muRow(m, good, iconOf) {
    var href = 'champions/' + slugify(m.slug || m.en || m.name) + '/';
    return '<a class="cp-mu-row" href="/' + href + '" data-champ="' + esc(m.en || m.name) + '">' +
      (iconOf ? '<img src="' + esc(iconOf(m)) + '" alt="" loading="lazy">' : '') +
      '<span class="cp-mu-nm">' + esc(m.name) + '</span>' +
      '<span class="cp-mu-wr' + (good ? ' is-good' : ' is-bad') + '">' + fmt(m.wr) + '%</span>' +
      (m.pr != null ? '<span class="cp-mu-pr">' + fmt(m.pr) + '%</span>' : '') + '</a>';
  }
  function secMatchups(d, iconOf) {
    var mu = d.mu, out = '';
    if (mu && (mu.best || []).length) {
      out += '<div class="cp-mu-box"><div class="cp-sub is-good">Силён против</div>' +
        mu.best.map(function (m) { return muRow(m, true, iconOf); }).join('') + '</div>';
    }
    if (mu && (mu.worst || []).length) {
      out += '<div class="cp-mu-box"><div class="cp-sub is-bad">Слаб против</div>' +
        mu.worst.map(function (m) { return muRow(m, false, iconOf); }).join('') + '</div>';
    }
    if (out) out = '<div class="cp-mu">' + out + '</div>';
    var c = d.counters;
    if (c && (c.counteredBy || []).length) {
      out += '<div class="cp-sub">Контрят по мнению редакций</div><div class="cp-chips">' + chipList(c.counteredBy) + '</div>';
    }
    /* Гнездо для личных/авто матчапов (заполняет SPA, в статике остаётся пустым и скрытым) */
    out += '<div class="cp-mu-own" data-own hidden></div>';
    if (!out) return '';
    var note = mu && mu.rank ? (mu.rank === 'master_plus' ? 'Мастер+' : mu.rank === 'diamond_plus' ? 'Алмаз+' : mu.rank) : '';
    return sec('mu', 'Матчапы и контры', out, note);
  }

  function secMeta(d) {
    var m = d.meta || {}, out = '';
    if (m.wr != null || m.tier) {
      out += '<div class="cp-meta-row">' +
        (m.tier ? '<span class="cp-tier ' + tierCls(m.tier) + '">' + esc(m.tier) + '</span>' : '') +
        (m.wr != null ? '<b class="cp-num cp-meta-wr' + wrCls(m.wr) + '">' + fmt(m.wr) + '%</b><span class="cp-meta-l">винрейт сейчас</span>' : '') +
        (m.trend != null && m.trend !== 0 ? '<span class="cp-trend' + (m.trend > 0 ? ' is-good' : ' is-bad') + '">' + (m.trend > 0 ? '▲' : '▼') + ' ' + fmt(Math.abs(m.trend)) + '</span>' : '') +
        '</div>';
    }
    if ((d.wrRanks || []).length) {
      out += '<div class="cp-tbl-wrap"><table class="cp-tbl"><thead><tr><th>Ранг</th><th>Линия</th><th>Винрейт</th><th>Пикрейт</th></tr></thead><tbody>' +
        d.wrRanks.map(function (e) {
          return '<tr><td>' + esc(e.rank) + '</td><td>' + esc(e.role) + '</td>' +
            '<td class="cp-num' + wrCls(e.wr) + '">' + (e.wr != null ? fmt(e.wr) + '%' : '—') + '</td>' +
            '<td>' + (e.pr != null ? fmt(e.pr) + '%' : '—') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    return sec('meta', 'Мета: тир и винрейт', out);
  }

  /* ══ СРАВНЕНИЕ ЧЕМПОВ ════════════════════════════════════════════════════
     Порт из lab-hover-reveal (openCompareTable/cmpTableInner). Печатает ОДИН
     рендерер — тот же модуль, что печатает всю страницу, поэтому статике
     сравнение достанется даром, как только у неё появится список чемпов
     (ждём лёгкий champ-index.json: slug → ru/en; см. бэклог).

     Список = массив тех же объектов, что даёт buildData. Своей формы данных и
     своего расчёта статов здесь НЕТ — считает та же statAt, что и вся страница.

     ЧТО ВЫЧИЩЕНО ПРИ ПОРТЕ (канонизация, дрейф лаба не переносим):
       · захардкоженный потолок стата (`d.max`) → полоска считается от максимума
         В СРАВНИВАЕМОЙ ГРУППЕ: числа честные, выдуманных шкал нет;
       · инлайновый `background:d.color` в полосках → цвет даёт CSS по data-stat;
       · эмодзи (⚖ ＋ 🔍) и стрелки ▲▼ в числах → разница читается цветом;
       · `innerHTML` всей таблицы на КАЖДЫЙ тик ползунка (hover-reveal-lab.js:643)
         → applyCompareLevel меняет textContent, ширину полоски и класс. Узлы живут.
     ══════════════════════════════════════════════════════════════════════════ */
  var CMP_MAX = 6;

  /* База и рост стата для сравнения. Энергия — как на странице: у неё нет роста,
     показываем ровные 200, а не «ману», которой у чемпа нет. */
  function cmpPair(d, s) {
    var pair = (d.stats || {})[s.id];
    if (!pair) return null;
    if (s.id === 'mana' && d.res && /energy/i.test(d.res)) return [200, 0];
    var b = num(pair[0]), g = num(pair[1]);
    return (!b && !g) ? null : [b, g];
  }
  /* Сводка по СТРОКЕ (один стат у всех чемпов) — из неё и подсветка, и полоска.
     Все одинаковые (mx === mn) — подсветки нет: «лучший» из одинаковых = враньё. */
  function cmpRow(vals) {
    var nums = vals.filter(function (v) { return v !== null; });
    var mx = nums.length ? Math.max.apply(null, nums) : null;
    var mn = nums.length ? Math.min.apply(null, nums) : null;
    return { mx: mx, mn: mn, spread: mx !== null && mx !== mn };
  }
  function cmpCls(v, r) { return (v === null || !r.spread) ? '' : (v === r.mx ? 'is-hi' : (v === r.mn ? 'is-lo' : '')); }
  function cmpPct(v, r) { return (v === null || !r.mx || r.mx <= 0) ? 0 : Math.max(4, Math.min(100, Math.round(v / r.mx * 100))); }

  function cmpCell(d, s, v, r) {
    var p = cmpPair(d, s);
    var cls = cmpCls(v, r);
    return '<div class="cc-cell" data-stat="' + s.id + '" data-id="' + s.id + '" data-dec="' + s.dec + '"' +
      (p ? ' data-b="' + p[0] + '" data-g="' + p[1] + '"' : '') + '>' +
      '<b class="cc-v cp-num' + (cls ? ' ' + cls : '') + '">' + (v === null ? '—' : fmt(v, s.dec)) + '</b>' +
      '<span class="cc-bar"><i style="width:' + cmpPct(v, r) + '%"></i></span></div>';
  }

  /* ВРЕМЕННАЯ дизайн-полоса: Эржан выбирает живьём, где живёт сравнение.
     После выбора полоса и проигравший вариант удаляются (на боевом полосе не место). */
  function cmpStripHTML(opt) {
    var place = opt.stripPlace === 'inline' ? 'inline' : 'view';
    var b = function (k, lbl) {
      return '<button class="cc-strip-b' + (place === k ? ' is-on' : '') + '" type="button" data-cmp-var="' + k + '">' + esc(lbl) + '</button>';
    };
    return '<div class="cc-strip' + (opt.stripMin ? ' is-min' : '') + '" data-key="strip">' +
      '<span class="cc-strip-l">ГДЕ ПОКАЗЫВАТЬ СРАВНЕНИЕ</span>' +
      b('view', 'A · отдельный вид') + b('inline', 'Б · секция на странице') +
      '<button class="cc-strip-min" type="button" data-cmp="min">' +
      (opt.stripMin ? 'Настройки' : 'Свернуть настройки') + '</button></div>';
  }

  function renderCompareHTML(list, opt) {
    opt = opt || {};
    var lv = opt.level || 10;
    list = (list || []).slice(0, CMP_MAX);

    /* Значения считаем ОДИН раз на всю таблицу: они нужны и ячейке, и сводке строки. */
    var grid = STATS.map(function (s) {
      var vals = list.map(function (d) {
        var p = cmpPair(d, s);
        return p ? statAt(p[0], p[1], lv, s.id) : null;
      });
      return { vals: vals, row: cmpRow(vals) };
    });

    var top = '<div class="cc-top" data-key="top">' +
      (opt.backLabel ? '<button class="cc-back" type="button" data-cmp="back">' + esc(opt.backLabel) + '</button>' : '') +
      '<div class="cc-title">Сравнение · <b class="cp-num">' + list.length + '</b></div>' +
      '<div class="cc-lvl"><span>УРОВЕНЬ</span><b class="cp-num" data-cmp-lvlnum>' + lv + '</b>' +
      '<input class="cc-lvl-inp" type="range" min="1" max="15" value="' + lv + '" data-cmp-lvl aria-label="Уровень для сравнения"></div>' +
      '</div>';

    var labels = '<div class="cc-labels" data-key="labels"><div class="cc-corner">СТАТЫ</div>' +
      STATS.map(function (s) { return '<div class="cc-lbl">' + esc(s.lbl) + '</div>'; }).join('') + '</div>';

    /* data-key = якорь колонки: убрали чемпа из середины — соседние колонки
       переезжают целиком, а не пересобираются (см. lab-morph.js). */
    var cols = list.map(function (d, i) {
      var m = d.meta || {};
      return '<div class="cc-col" data-key="c-' + esc(d.slug) + '">' +
        '<div class="cc-colh">' +
          (list.length > 1 ? '<button class="cc-rm" type="button" data-cmp="rm" data-champ="' + esc(d.name) + '" aria-label="Убрать из сравнения" title="Убрать из сравнения">×</button>' : '') +
          '<img class="cc-port" src="' + esc(d.icon) + '" alt="' + esc(d.ru) + '" data-cmp="open" data-champ="' + esc(d.name) + '" title="Открыть страницу чемпиона" loading="lazy">' +
          '<div class="cc-nm">' + esc(d.ru) + '</div>' +
          (m.tier ? '<span class="cc-tier ' + tierCls(m.tier) + '">' + esc(m.tier) + '</span>' : '') +
          (m.wr != null ? '<div class="cc-wr"><b class="cp-num' + wrCls(m.wr) + '">' + fmt(m.wr) + '%</b> WR</div>' : '') +
        '</div>' +
        STATS.map(function (s, j) { return cmpCell(d, s, grid[j].vals[i], grid[j].row); }).join('') +
        '</div>';
    }).join('');

    var add = list.length < CMP_MAX
      ? '<button class="cc-add" type="button" data-cmp="add" data-key="add"><span>+</span><i>чемпион</i></button>' : '';

    return '<div class="cc glass" data-cmp-root>' +
      (opt.strip ? cmpStripHTML(opt) : '') + top +
      '<div class="cc-table" data-key="table">' + labels + cols + add + '</div></div>';
  }

  /* ТОЧЕЧНЫЙ пересчёт: ползунок трогает число, ширину полоски и класс подсветки.
     Разметка не пересоздаётся — ни ячейка, ни строка, ни таблица. */
  function applyCompareLevel(root, lv) {
    if (!root) return;
    var out = root.querySelector('[data-cmp-lvlnum]');
    if (out) out.textContent = lv;
    STATS.forEach(function (s) {
      var cells = root.querySelectorAll('.cc-cell[data-id="' + s.id + '"]');
      var vals = [], i;
      for (i = 0; i < cells.length; i++) {
        var b = cells[i].getAttribute('data-b');
        vals.push(b === null ? null : statAt(+b, +cells[i].getAttribute('data-g'), lv, s.id));
      }
      var r = cmpRow(vals);
      for (i = 0; i < cells.length; i++) {
        var v = vals[i], cls = cmpCls(v, r);
        var el = cells[i].querySelector('.cc-v');
        if (el) {
          el.textContent = v === null ? '—' : fmt(v, +cells[i].getAttribute('data-dec'));
          el.classList.toggle('is-hi', cls === 'is-hi');
          el.classList.toggle('is-lo', cls === 'is-lo');
        }
        var bar = cells[i].querySelector('.cc-bar i');
        if (bar) bar.style.width = cmpPct(v, r) + '%';
      }
    });
  }

  /* Оживление таблицы. Действие читается в момент клика, а не при подписке:
     morph переиспользует узлы, и захваченное «что это была за кнопка» соврало бы. */
  function hydrateCompare(root, api) {
    if (!root) return;
    api = api || {};
    var inp = root.querySelector('[data-cmp-lvl]');
    if (inp && !inp.__wired) {
      inp.__wired = 1;
      inp.addEventListener('input', function () {
        var lv = +this.value;
        applyCompareLevel(root, lv);
        if (api.level) api.level(lv);
      });
    }
    root.querySelectorAll('[data-cmp], [data-cmp-var]').forEach(function (b) {
      if (b.__wired) return;
      b.__wired = 1;
      b.addEventListener('click', function (e) {
        e.preventDefault();
        var v = b.getAttribute('data-cmp-var');
        if (v) { if (api.place) api.place(v); return; }
        var act = b.getAttribute('data-cmp'), name = b.getAttribute('data-champ');
        if (act === 'open' && api.onChamp) api.onChamp(name);        /* ЗАКОН СВЯЗЕЙ */
        else if (act === 'rm' && api.remove) api.remove(name);
        else if (act === 'add' && api.add) api.add();
        else if (act === 'back' && api.back) api.back();
        else if (act === 'min' && api.min) api.min();
      });
    });
  }

  /* ══ СБОРКА СТРАНИЦЫ ═════════════════════════════════════════════════════ */
  function renderHTML(d, opt) {
    opt = opt || {};
    var mode = opt.mode || 'static';
    var lv = opt.level || 10;
    var iconOf = opt.iconOf || null;

    var left = [secAbilities(d), secStats(d, lv), secBuild(d), secRunes(d)].filter(Boolean).join('');
    var right = [secMatchups(d, iconOf), secMeta(d), secSkillOrder(d)].filter(Boolean).join('');

    var crumbs = '<nav class="cp-crumbs" aria-label="Хлебные крошки">' +
      '<a href="/">Главная</a> › <a href="/champions/">Чемпионы</a> › <b>' + esc(d.ru) + '</b></nav>';
    var h1 = '<h1 class="cp-h1">' + esc(d.ru) + ' — гайд Wild Rift: билд, руны, статы и матчапы</h1>';

    return '<article class="cp" data-champ="' + esc(d.name) + '" data-slug="' + esc(d.slug) + '">' +
      crumbs + h1 +
      '<div class="cp-shell">' +
        '<aside class="cp-side">' + heroHTML(d, mode) + '</aside>' +
        '<div class="cp-data">' +
          '<div class="cp-col">' + left + '</div>' +
          '<div class="cp-col">' + right + '</div>' +
        '</div>' +
      '</div>' +
      /* Гнездо варианта «Б» для таблицы сравнения: во всю ширину под раскладкой.
         Наполняет SPA; в статике остаётся пустым и скрытым (как cp-mu-own). */
      '<div class="cp-cmp-slot" data-cmp-slot hidden></div>' +
      '</article>';
  }

  /* Рельс для СТАТИЧЕСКОЙ страницы: в SPA рельс сайта уже на экране (Р6),
     здесь — его ссылочный двойник, чтобы прямой заход из поиска не был тупиком. */
  var RAIL = [
    ['/', 'Главная'], ['/champions/', 'Чемпионы'], ['/items/', 'Предметы'],
    ['/runes/', 'Руны'], ['/tier-list/', 'Тир-лист'],
    ['/damage-calculator/', 'Калькулятор'], ['/drafter/', 'Драфтер']
  ];
  function railHTML(active) {
    return '<nav class="cp-rail glass" aria-label="Разделы сайта"><div class="cp-rail-items">' +
      RAIL.map(function (r) {
        return '<a class="cp-rail-btn' + (r[0] === active ? ' is-on' : '') + '" href="' + r[0] + '">' + esc(r[1]) + '</a>';
      }).join('') + '</div></nav>';
  }

  /* ══ ОЖИВЛЕНИЕ ════════════════════════════════════════════════════════════
     Работает и на статической странице, и в SPA. Меняем ТОЧЕЧНО: ползунок
     трогает только числа статов, вкладка умения — только атрибут hidden.     */
  function hydrate(root, d, api) {
    if (!root) return;
    api = api || {};

    /* ползунок уровня → пересчёт чисел (без пересоздания узлов) */
    var inp = root.querySelector('[data-lvl]');
    if (inp && !inp.__wired) {
      inp.__wired = 1;
      inp.addEventListener('input', function () {
        var lv = +this.value;
        var out = root.querySelector('[data-lvl-num]');
        if (out) out.textContent = lv;
        root.querySelectorAll('.cp-stat-v').forEach(function (el) {
          var b = +el.getAttribute('data-b'), g = +el.getAttribute('data-g'), dec = +el.getAttribute('data-dec');
          el.textContent = fmt(statAt(b, g, lv, el.getAttribute('data-id')), dec);
        });
      });
    }

    /* вкладки умений — показ/скрытие ГОТОВЫХ панелей */
    root.querySelectorAll('.cp-ab-btn').forEach(function (b) {
      if (b.__wired) return;
      b.__wired = 1;
      b.addEventListener('click', function () {
        var slot = b.getAttribute('data-slot');
        root.querySelectorAll('.cp-ab-btn').forEach(function (x) { x.classList.toggle('is-on', x === b); });
        root.querySelectorAll('.cp-ab-pane').forEach(function (p) { p.hidden = p.getAttribute('data-slot') !== slot; });
      });
    });

    /* ЗАКОН СВЯЗЕЙ: клик по чемпу в матчапах. В SPA перехватываем и открываем
       страницу без перезагрузки, в статике — обычный переход по ссылке. */
    if (api.onChamp) {
      root.querySelectorAll('.cp-mu-row[data-champ]').forEach(function (a) {
        if (a.__wired) return;
        a.__wired = 1;
        a.addEventListener('click', function (e) { e.preventDefault(); api.onChamp(a.getAttribute('data-champ')); });
      });
    }
    root.querySelectorAll('.cp-act[data-act]').forEach(function (b) {
      if (b.__wired) return;
      b.__wired = 1;
      var act = b.getAttribute('data-act');
      if (api[act]) b.addEventListener('click', function (e) { e.preventDefault(); api[act](d); });
    });
  }

  /* ── Разбор источников. Живёт здесь, потому что читают его ОБА мира:
        генератор (Node) и приложение (браузер). Разъедется — разъедутся страницы. ── */

  /* В гайдах имена набраны КАПСОМ («КОГ'МАО») — приводим к обычному виду. */
  function prettyCaps(s) {
    return String(s || '').toLowerCase().replace(/(^|[\s'’-])(\S)/g, function (_a, a, b) { return a + b.toUpperCase(); });
  }
  /* slug ddragon-стиля («dr-mundo») → читаемое имя */
  function unslug(s) { return prettyCaps(String(s || '').replace(/-/g, ' ')); }

  /* Матчапы гайда: берём самый массовый срез (Алмаз+), по 5 в каждую сторону.
     nameOf — как показать имя (в SPA и в статике карты имён разные). */
  function pickMatchups(guide, nameOf) {
    var arr = (guide && guide.matchups) || [];
    if (!arr.length) return null;
    var m = arr.filter(function (x) { return x.rank === 'diamond_plus'; })[0] || arr[0];
    var map = function (list) {
      return (list || []).slice(0, 5).map(function (x) {
        var out = nameOf ? nameOf(x) : {};
        return { name: out.name || prettyCaps(x.name), en: out.en || '', slug: x.slug, wr: x.wr, pr: x.pr };
      });
    };
    return { best: map(m.best), worst: map(m.worst), rank: m.rank, lane: m.lane, date: m.date };
  }

  /* counters.json: несколько редакций × несколько линий → один список «кто контрит».
     Берём основную линию чемпа (первую в данных) и объединяем источники. */
  function mergeCounters(entry, nameOf) {
    if (!entry) return null;
    var lanes = {};
    var srcs = entry.sources || {};
    Object.keys(srcs).forEach(function (sk) {
      var lanesOf = srcs[sk].lanes || {};
      Object.keys(lanesOf).forEach(function (ln) {
        lanes[ln] = lanes[ln] || [];
        (lanesOf[ln].counteredBy || []).forEach(function (x) { if (lanes[ln].indexOf(x) < 0) lanes[ln].push(x); });
      });
    });
    var first = Object.keys(lanes)[0];
    if (!first) return null;
    return { counteredBy: lanes[first].slice(0, 8).map(function (s) { return nameOf ? nameOf(s) : unslug(s); }) };
  }

  var API = {
    VERSION: 1,
    esc: esc, slugify: slugify, statAt: statAt, buildData: buildData,
    renderHTML: renderHTML, railHTML: railHTML, hydrate: hydrate, STATS: STATS,
    CMP_MAX: CMP_MAX, renderCompareHTML: renderCompareHTML,
    applyCompareLevel: applyCompareLevel, hydrateCompare: hydrateCompare,
    prettyCaps: prettyCaps, unslug: unslug, pickMatchups: pickMatchups, mergeCounters: mergeCounters
  };

  /* СТАТИЧЕСКАЯ страница оживляет себя сама (ползунок + вкладки умений).
     Метка — класс .cp-page на <body>, его ставит только генератор; в приложении
     оживлением занимается app.js, поэтому там этот код не срабатывает. */
  if (typeof document !== 'undefined') {
    var boot = function () {
      if (!document.body || !document.body.classList.contains('cp-page')) return;
      var root = document.querySelector('.cp');
      if (root) hydrate(root, null, {});
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }

  return API;
});
