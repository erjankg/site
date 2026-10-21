/* ═══════════════════════════════════════════
   КАПИТАНСТВО · knowledge.js — загрузчик мозга.

   Собирает в одну коробку: правила драфта (draft-ai/knowledge) + данные
   (теги механик, матчапы, тир). Работает и в Node (тесты, само-игра),
   и в браузере (панель коуча) — один код, разные способы чтения файла.

   ОБЛАСТЬ ЗНАНИЙ ЗАКРЫТА: читаем только то, что перечислено в PATHS.
   Ничего из остального сайта сюда не попадает — см. draft-ai/KNOWLEDGE.md.
   ═══════════════════════════════════════════ */
(function (root, factory) {
  var lib = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  if (root) root.CaptaincyKnowledge = lib;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PATHS = {
    patterns:  'draft-ai/knowledge/patterns.json',
    rules:     'draft-ai/knowledge/draft-rules.json',
    archetypes:'draft-ai/knowledge/archetypes.json',
    synergies: 'draft-ai/knowledge/synergies.json',
    timing:    'draft-ai/knowledge/timing.json',
    notes:     'draft-ai/knowledge/champion-notes.json',
    bans:      'draft-ai/knowledge/ban-strategy.json',
    metaWeb:   'draft-ai/knowledge/meta-web.json',
    counterPower: 'draft-ai/knowledge/counter-power.json',
    pro:       'draft-ai/knowledge/pro-drafting.json',
    cc:        'draft-ai/knowledge/cc-and-damage.json',
    summoners: 'draft-ai/knowledge/summoner-spells.json',
    tags:      'data-pipeline/champion-tags.json',
    matchIndex:'data-pipeline/matchups.json',
    stats:     'data-pipeline/wr-stats.json',
  };
  /* НЕОБЯЗАТЕЛЬНЫЕ ФАЙЛЫ: их может не быть, и это НЕ ошибка.
     captain-tiers.json — компет-тир от владельца. Он лежит ОТДЕЛЬНО от
     champion-notes.json намеренно: import-captain.mjs перезаписывает notes
     целиком (матчапы), и тиры в нём сгорали бы при каждом импорте.
     При сборке знаний файл вливается в notes.tiers — там его и ищет
     coach.js:tierOf(), который ставит тир капитана выше соло-статистики. */
  var OPTIONAL = {
    captainTiers: 'draft-ai/knowledge/captain-tiers.json',
    annotations:  'draft-ai/knowledge/captain-annotations.json',
  };
  var MATCHUP_DIR = 'data-pipeline/matchups/';

  /* ── ИСТОЧНИК МАТЧАПОВ (решение владельца, 2026-10-21) ────────────────────
     'captain' — кэп НЕ берёт скрейп за факт. Пары из data-pipeline/matchups
     редакционные, местами перевёрнутые, и в расчёт драфта не идут вовсе:
     знание матчапов начинается ПУСТЫМ и растёт только из разметки владельца
     (captain-matchups.txt → notes.matchups.pairs, captain-annotations.json).
     Сами файлы data-pipeline никуда не деваются — на них живут страницы
     чемпионов сайта. Сюда они просто не попадают.
     'scrape' — старое поведение, если когда-нибудь понадобится сравнить. */
  var MATCHUP_SOURCE = 'captain';

  // Названия линий в статистике Tencent → наши
  var ROLE_TO_LANE = { Baron: 'Top', Top: 'Top', Jungle: 'Jungle', Mid: 'Mid',
                       Dragon: 'Adc', Adc: 'Adc', Support: 'Support' };

  var isNode = typeof process !== 'undefined' && process.versions && process.versions.node;

  function readJson(rel, base) {
    if (isNode) {
      var fs = require('fs'), path = require('path');
      return JSON.parse(fs.readFileSync(path.join(base, rel), 'utf8'));
    }
    throw new Error('в браузере используй loadAsync()');
  }

  /* Имя чемпиона в наших данных пишется коротко («M.Fortune»), а ddragon-имя
     полное. Слаг файла матчапов — кебаб от ddragon-имени. Сшивать по короткому
     имени нельзя, поэтому слаг всегда считаем от поля dd. */
  function slugOf(tagsEntry) {
    return String(tagsEntry.dd).replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }

  function buildIndex(K) {
    var byName = K.tags.champions;
    var names = Object.keys(byName);

    // Поиск чемпиона как угодно написанного: «M.Fortune», «MissFortune», «miss-fortune».
    // Кириллицу оставляем: иначе все русские имена превращались в пустую строку,
    // схлопывались в один ключ, и поиск «камилла» отдавал последнего по алфавиту.
    var norm = function (s) { return String(s || '').toLowerCase().replace(/[^a-zа-яё0-9]/g, ''); };
    var alias = {};
    names.forEach(function (n) {
      var c = byName[n];
      [n, c.dd, c.ru, slugOf(c)].forEach(function (v) { if (v) alias[norm(v)] = n; });
    });

    // Тир и мета из свежей статистики: берём лучшую строку чемпа по выбранному рангу.
    var metaByName = {};
    (K.stats.champions || []).forEach(function (row) {
      var key = alias[norm(row.nameEN)] || alias[norm(row.name)];
      if (!key) return;
      if (!metaByName[key]) metaByName[key] = {};
      var slot = metaByName[key][row.rank];
      // одна строка на ранг+роль; держим самую популярную роль
      if (!slot || (row.pr || 0) > (slot.pr || 0)) {
        metaByName[key][row.rank] = { tier: row.tier, wr: row.wr, pr: row.pr, br: row.br, role: row.role, date: row.date };
      }
    });

    return {
      names: names,
      champ: function (any) { var k = alias[norm(any)]; return k ? byName[k] : null; },
      nameOf: function (any) { return alias[norm(any)] || null; },
      slugOf: function (any) { var k = alias[norm(any)]; return k ? slugOf(byName[k]) : null; },
      /* Статистика зовёт линии по-своему: Baron — это Top, Dragon — стрелок.
         И роль в ней выбирается по пикрейту, из-за чего лесник мог приехать
         с ролью «Dragon» (несколько игр кого-то на боте перевесили). Поэтому
         сперва ищем роль, которую чемп РЕАЛЬНО играет по своим умениям. */
      meta: function (any, rank) {
        var k = alias[norm(any)]; if (!k) return null;
        var m = metaByName[k]; if (!m) return null;
        var row = m[rank] || m.master_plus || m.diamond_plus || m[Object.keys(m)[0]] || null;
        if (!row) return null;
        var lanes = (byName[k].lanes) || [];
        if (!lanes.length) return row;
        var asLane = ROLE_TO_LANE[row.role] || row.role;
        if (lanes.indexOf(asLane) !== -1) return row;
        // роль не та — ищем среди всех рангов строку с настоящей линией
        var better = null;
        Object.keys(m).forEach(function (r) {
          var x = m[r], l = ROLE_TO_LANE[x.role] || x.role;
          if (lanes.indexOf(l) === -1) return;
          if (!better || (x.pr || 0) > (better.pr || 0)) better = x;
        });
        if (better) return better;
        return Object.assign({}, row, { roleMismatch: true });
      },
    };
  }

  /* Матчапы лежат по файлу на чемпиона (так страница грузит свои 9 КБ, а не 1.3 МБ).
     Здесь — ленивый кэш: спросили про Камиллу, прочитали camille.json один раз. */
  function makeMatchups(K, idx, base, preloaded) {
    var cache = preloaded || {};
    return {
      of: function (any) {
        if (MATCHUP_SOURCE !== 'scrape') return null;   // скрейп кэпу не источник
        var slug = idx.slugOf(any); if (!slug) return null;
        if (cache[slug] !== undefined) return cache[slug];
        var val = null;
        if (isNode) {
          var fs = require('fs'), path = require('path');
          var p = path.join(base, MATCHUP_DIR, slug + '.json');
          val = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
        }
        cache[slug] = val;
        return val;
      },
      has: function (any) { var s = idx.slugOf(any); return s != null && cache[s] !== undefined; },
      preload: function (slug, data) { cache[slug] = data; },
    };
  }

  /* ── ЗАСТАВА СВЕЖЕСТИ ────────────────────────────────────────────────────
     Источник guides/*.json обновляется каждый день, НО сам трекер пересчитывает
     содержимое раз в вечность: dataDate стоит на апреле, а цифры байт в байт те же,
     что были в июне. Это касается ВСЕГО гайда — не только матчапов, но и сборок,
     рун, заклинаний, порядка прокачки.
     Поэтому запрет не оставляем на память: движок ПРОСТО НЕ ОТДАЁТ такие числа.
     Свежее только wr-stats.json (Tencent, ежедневно) — тир и винрейт чемпионов. */
  var MAX_AGE_DAYS = 60;

  function ageDays(dateLike) {
    if (!dateLike) return null;
    var s = String(dateLike);
    var iso = s.length === 8 ? s.slice(0, 4) + '-' + s.slice(4, 6) + '-' + s.slice(6, 8) : s;
    var t = Date.parse(iso);
    return isNaN(t) ? null : Math.round((Date.now() - t) / 86400000);
  }

  function buildFreshness(K) {
    var statAge = ageDays(K.stats && K.stats.snapshotDate);
    var mp = (K.matchIndex && K.matchIndex.policy) || {};
    var guideAge = mp.ageDays != null ? mp.ageDays : null;
    return {
      maxAgeDays: MAX_AGE_DAYS,
      sources: {
        // Tencent, ежедневно: тир, винрейт, пикрейт, бан-рейт чемпионов
        champStats: { date: (K.stats && K.stats.snapshotDate) || null, ageDays: statAge,
          fresh: statAge != null && statAge <= MAX_AGE_DAYS, use: 'тир и мета чемпионов' },
        // трекер-гайды: матчап-винрейты, сборки, руны, заклинания — ЗАМОРОЖЕНЫ
        guides: { date: mp.newestStatDate || null, ageDays: guideAge,
          fresh: guideAge != null && guideAge <= MAX_AGE_DAYS,
          use: 'НИЧЕГО ЧИСЛЕННОГО. Только направление матчапа, оно из механики' },
      },
    };
  }

  /* ── РАЗМЕТКА ВЛАДЕЛЬЦА ПОВЕРХ ЗАМЕТОК ───────────────────────────────────
     Порядок силы (слабое → сильное):
       соло-статистика  <  разметка в драфте (captain-annotations)  <  тирлист руками
     Разметка — быстрый сигнал «отметил по ходу дела», тирлист — осознанное
     решение за столом, поэтому он главнее. Соло-тир остаётся фолбэком для
     всех, кого не трогали ни там, ни там.
     Флекс: tags-данные знают только линии из умений; «играет на двух» в
     реальной команде знает владелец — его флаг и живёт в notes.flex. */
  function mergeNotes(K) {
    var der = (K.annotations && K.annotations.derived) || {};
    var cap = (K.captainTiers && K.captainTiers.tiers) || null;
    var capRole = (K.captainTiers && K.captainTiers.byRole) || null;   // тир ПО ЛИНИЯМ
    var fromAnn = der.tiers || null;
    var flex = der.flex || null;
    if (!cap && !capRole && !fromAnn && !flex) return K.notes;

    var tiers = {};
    Object.keys(K.notes.tiers || {}).forEach(function (k) { tiers[k] = K.notes.tiers[k]; });
    if (fromAnn) Object.keys(fromAnn).forEach(function (k) {
      var t = fromAnn[k] && fromAnn[k].tier;
      if (t) tiers[k] = t;
    });
    if (cap) Object.keys(cap).forEach(function (k) { if (cap[k]) tiers[k] = cap[k]; });

    /* Тир по линии. Запись либо строка "S", либо {t:"S",src:"soloCN"|"captain"}.
       src хранит СЛОЙ: soloCN — авто-сид из китайского винрейта (база, движок
       всё ещё скидывает за малый пикрейт), captain — решение владельца (без
       скидки). coach.js:tierOf читает это с учётом линии пика. */
    var tiersByRole = null;
    if (capRole) {
      tiersByRole = {};
      Object.keys(capRole).forEach(function (lane) {
        var m = capRole[lane]; if (!m) return;
        var o = {};
        Object.keys(m).forEach(function (nm) {
          var e = m[nm];
          var t = (e && typeof e === 'object') ? e.t : e;
          if (t) o[nm] = { tier: t, src: (e && e.src) || 'captain' };
        });
        tiersByRole[lane] = o;
      });
    }

    var out = {};
    Object.keys(K.notes).forEach(function (k) { out[k] = K.notes[k]; });
    out.tiers = tiers;
    if (tiersByRole) out.tiersByRole = tiersByRole;
    if (flex) out.flex = flex;

    /* Пары «кто кого бьёт», отмеченные прямо в драфте, подхватываются СРАЗУ —
       не дожидаясь прогона import-captain.mjs. Человеческий источник всё равно
       captain-matchups.txt: импорт перельёт те же пары в champion-notes.json,
       а здесь они просто не теряются между разметкой и импортом.
       Ключ — пара+линия без учёта направления: отметил наоборот — побеждает
       СВЕЖЕЕ, потому что это и есть последнее слово владельца. */
    if (der.flags) out.flags = der.flags;

    /* ВЫКИНУТОЕ. Сид по механике — предположение, и владелец вправе сказать
       «нет». Такая пара не просто не усиливается: она ВЫБЫВАЕТ из расчёта,
       даже если лежит в champion-notes.json после импорта. */
    var dropped = der.dropped || {};
    if (Object.keys(dropped).length && K.notes.matchups && K.notes.matchups.pairs) {
      out.matchups = Object.assign({}, K.notes.matchups, {
        pairs: K.notes.matchups.pairs.filter(function (p) { return !dropped[p.a + '>' + p.b]; }),
      });
    }

    var annPairs = der.pairs ? Object.keys(der.pairs).map(function (k) { return der.pairs[k]; }) : [];
    if (annPairs.length) {
      var byKey = {}, order = [];
      var key = function (p) { return [p.a, p.b].sort().join('|') + '|' + (p.lane || '*'); };
      ((out.matchups && out.matchups.pairs) || (K.notes.matchups && K.notes.matchups.pairs) || []).forEach(function (p) {
        var k = key(p); if (!byKey[k]) order.push(k); byKey[k] = p;
      });
      annPairs.forEach(function (p) {
        var k = key(p); if (!byKey[k]) order.push(k); byKey[k] = p;
      });
      out.matchups = Object.assign({}, K.notes.matchups, {
        pairs: order.map(function (k) { return byKey[k]; }),
      });
    }
    return out;
  }

  /* Связки, названные владельцем в драфте, кладём туда же, где живут
     именованные пары, — findSynergies читает их наравне с правилами. */
  function mergeSynergies(K) {
    var der = (K.annotations && K.annotations.derived) || {};
    var pairs = der.synergy ? Object.keys(der.synergy).map(function (k) { return der.synergy[k]; }) : [];
    if (!pairs.length) return K.synergies;
    var np = (K.synergies && K.synergies.namedPairs) || {};
    var have = (np.pairs || []).slice();
    var key = function (p) { return [p.a, p.b].sort().join('|'); };
    var seen = {};
    have.forEach(function (p) { seen[key(p)] = 1; });
    pairs.forEach(function (p) { if (!seen[key(p)]) have.push(p); });
    var out = {};
    Object.keys(K.synergies).forEach(function (k) { out[k] = K.synergies[k]; });
    out.namedPairs = Object.assign({}, np, { pairs: have });
    return out;
  }

  function assemble(K, base, preloadedMatchups) {
    K = Object.assign({}, K, { notes: mergeNotes(K), synergies: mergeSynergies(K) });
    var idx = buildIndex(K);
    var policy = (K.matchIndex && K.matchIndex.policy)
      || { useStatWinrate: false, reason: 'политика не найдена — цифрам не доверяем' };
    var freshness = buildFreshness(K);

    return {
      patterns: K.patterns, rules: K.rules, archetypes: K.archetypes,
      synergies: K.synergies, timing: K.timing, notes: K.notes,
      cc: K.cc, summoners: K.summoners, bans: K.bans, pro: K.pro, metaWeb: K.metaWeb,
      counterPower: K.counterPower,
      tags: K.tags, stats: K.stats,
      whyRules: (K.matchIndex && K.matchIndex.rules) || [],
      policy: policy,
      freshness: freshness,
      /* ЕДИНСТВЕННАЯ ДВЕРЬ К ЧИСЛАМ. Любое число из данных проходит здесь.
         Источник протух — вернётся null, и подставить его уже некуда. */
      num: function (source, value) {
        var s = freshness.sources[source];
        if (!s || !s.fresh) return null;
        return value;
      },
      staleNote: function (source) {
        var s = freshness.sources[source];
        if (!s) return 'источник неизвестен';
        return s.fresh ? null : 'данные от ' + (s.date || 'неизвестной даты')
          + ' (' + s.ageDays + ' дн.) — числа не показываем';
      },
      idx: idx,
      matchups: makeMatchups(K, idx, base, preloadedMatchups),
    };
  }

  // Node: синхронно от корня репозитория.
  function load(base) {
    base = base || process.cwd();
    var K = {};
    Object.keys(PATHS).forEach(function (k) { K[k] = readJson(PATHS[k], base); });
    Object.keys(OPTIONAL).forEach(function (k) {
      try { K[k] = readJson(OPTIONAL[k], base); } catch (e) { K[k] = null; }   // файла нет — так и живём
    });
    return assemble(K, base);
  }

  // Браузер: всё тянем по сети. Матчапы догружаются пачкой по нужным чемпам.
  function loadAsync(baseUrl) {
    baseUrl = (baseUrl || '/').replace(/\/?$/, '/');
    var keys = Object.keys(PATHS), opt = Object.keys(OPTIONAL);
    return Promise.all(keys.map(function (k) {
      return fetch(baseUrl + PATHS[k]).then(function (r) { return r.json(); });
    }).concat(opt.map(function (k) {
      // необязательный файл: нет его — не ошибка, едем дальше
      return fetch(baseUrl + OPTIONAL[k])
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    }))).then(function (arr) {
      var K = {};
      keys.forEach(function (k, i) { K[k] = arr[i]; });
      opt.forEach(function (k, i) { K[k] = arr[keys.length + i]; });
      var kb = assemble(K, baseUrl, {});
      kb.fetchMatchups = function (namesList) {
        var slugs = namesList.map(kb.idx.slugOf).filter(Boolean);
        return Promise.all(slugs.map(function (s) {
          return fetch(baseUrl + MATCHUP_DIR + s + '.json')
            .then(function (r) { return r.ok ? r.json() : null; })
            .catch(function () { return null; })
            .then(function (d) { kb.matchups.preload(s, d); });
        })).then(function () { return kb; });
      };
      return kb;
    });
  }

  return { load: load, loadAsync: loadAsync, PATHS: PATHS, MATCHUP_DIR: MATCHUP_DIR };
});
