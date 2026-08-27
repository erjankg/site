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
    pro:       'draft-ai/knowledge/pro-drafting.json',
    cc:        'draft-ai/knowledge/cc-and-damage.json',
    summoners: 'draft-ai/knowledge/summoner-spells.json',
    tags:      'data-pipeline/champion-tags.json',
    matchIndex:'data-pipeline/matchups.json',
    stats:     'data-pipeline/wr-stats.json',
  };
  var MATCHUP_DIR = 'data-pipeline/matchups/';

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

  function assemble(K, base, preloadedMatchups) {
    var idx = buildIndex(K);
    var policy = (K.matchIndex && K.matchIndex.policy)
      || { useStatWinrate: false, reason: 'политика не найдена — цифрам не доверяем' };
    var freshness = buildFreshness(K);

    return {
      patterns: K.patterns, rules: K.rules, archetypes: K.archetypes,
      synergies: K.synergies, timing: K.timing, notes: K.notes,
      cc: K.cc, summoners: K.summoners, bans: K.bans, pro: K.pro, metaWeb: K.metaWeb,
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
    return assemble(K, base);
  }

  // Браузер: всё тянем по сети. Матчапы догружаются пачкой по нужным чемпам.
  function loadAsync(baseUrl) {
    baseUrl = (baseUrl || '/').replace(/\/?$/, '/');
    var keys = Object.keys(PATHS);
    return Promise.all(keys.map(function (k) {
      return fetch(baseUrl + PATHS[k]).then(function (r) { return r.json(); });
    })).then(function (arr) {
      var K = {}; keys.forEach(function (k, i) { K[k] = arr[i]; });
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
