/* ══════════════════════════════════════════════════════════════════════════
   lab-draft-coach · coach-lab.js — ИИ-КЭП НА ДРАФТЕ.

   ЗАЧЕМ. Движок (draft-ai/engine/advise.js) уже умеет приносить несколько
   ЛИНИЙ хода и к каждой — разбор: массив why[] и строку cost («чем платим»).
   До этого экрана разбор никто не видел: он лежал в объекте. Тренер должен
   видеть, ПОЧЕМУ кэп так думает — иначе это чёрный ящик, которому нечего
   возразить. Поэтому here каждая линия показана целиком: заголовок, ход,
   все пункты рассуждения, цена, и вероятность «доживёт» для дабл-пика.

   ЧТО ЗАПИСЫВАЕТ. 👍/👎 на каждом рассуждении → draft-ai/feedback.json
   (через POST /save в tools/serve.mjs). Это ДАТАСЕТ для подкрутки весов
   руками, а не обучение нейросети: копим «на этом ходу совет был мимо»,
   потом смотрим, какое правило дало плохой совет, и правим ему вес.

   ПОРЯДОК ХОДОВ — только из draft-logic.js (window.DraftLogic.WR_DRAFT_SEQUENCE),
   того же кода, что крутит живой драфт. Своей копии последовательности здесь
   НЕТ намеренно: разъехались бы.

   ЖИВОСТЬ: всё рисуется через labMorph. Тык по чемпиону меняет единицы узлов,
   сетка из 142 чемпионов не пересоздаётся.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var FB_FILE = 'draft-ai/feedback.json';
  var TEAMS_FILE = 'draft-ai/teams.json';
  var ANN_FILE = 'draft-ai/knowledge/captain-annotations.json';
  var TXT_FILE = 'draft-ai/knowledge/captain-matchups.txt';
  var SYN_FILE = 'draft-ai/knowledge/synergies.json';

  /* Строки ниже метки принадлежат разметке: инструмент их перегенерирует.
     Всё, что написано ВЫШЕ (руками или прошлыми инструментами), не трогаем. */
  var TXT_MARK = '# ═══ РАЗМЕТКА В ДРАФТЕ (lab-draft-coach/coach.html) — строки ниже перегенерирует инструмент ═══';
  var SEED_MARK = '# ═══ СИД: МЕХАНИКА (node draft-ai/seed-mechanics.mjs --apply) — строки ниже перегенерируются ═══';

  /* ── СЛОВАРЬ РАЗМЕТКИ ──────────────────────────────────────────────────
     Теги — это НЕ украшение: каждый либо превращается в знание (матчап,
     связка, тир, флекс), либо копится сырьём под будущие веса. Что во что
     превращается — написано в поле `to`. */
  /* Группы — это КУДА знание ляжет, а не просто рубрикатор экрана:
       мета     → notes.tiers      (тир вверх/вниз)
       роль     → notes.flex + notes.flags (пул, мейн соперника)
       драфт    → notes.flags      (как чемп ведёт себя в порядке ходов)
       линия    → notes.flags      (что он делает на своей линии)
       контра   → матчап-пара      (captain-matchups.txt)
       синергия → synergies.namedPairs
       функция  → notes.flags      (какую дыру состава закрывает)
       бан      → notes.flags + матчап-пара
     Любой тег, у которого нет своего поля, всё равно копится в flags:
     это размеченный датасет, из него потом считаются веса. */
  var TAG_GROUPS = [
    { id: 'meta', ru: 'мета', where: 'both', tags: [
      { id: 'super_meta', ru: 'супер-мета', to: 'тир ↑' },
      { id: 'tempo', ru: 'компет-темп', to: 'тир ↑' },
      { id: 'fallen', ru: 'упал из меты', to: 'тир ↓' },
      { id: 'situational', ru: 'ситуативный', to: 'флаг' },
    ] },
    { id: 'role', ru: 'роль', where: 'both', tags: [
      { id: 'our_pool', ru: 'в нашем пуле', to: 'флаг' },
      { id: 'enemy_pool', ru: 'во вражеском пуле', to: 'флаг' },
      { id: 'enemy_main', ru: 'мейн соперника', to: 'флаг' },
      { id: 'flex', ru: 'флекс', to: 'флекс-флаг' },
    ] },
    { id: 'draft', ru: 'драфт', where: 'both', tags: [
      { id: 'safe_fp', ru: 'безопасный FP', to: 'флаг' },
      { id: 'force_pick', ru: 'форс-пик', to: 'флаг' },
      { id: 'breaks_plan', ru: 'ломает наш план', to: 'флаг' },
      { id: 'our_plan', ru: 'под нашу стратегию', to: 'флаг' },
    ] },
    { id: 'lane', ru: 'линия', where: 'pick', tags: [
      { id: 'wins_lane', ru: 'выигрывает линию', to: 'флаг' },
      { id: 'survives_lane', ru: 'переживает линию', to: 'флаг' },
      { id: 'needs_jungle', ru: 'нужен приоритет леса', to: 'флаг' },
    ] },
    { id: 'counter', ru: 'контра', where: 'both', tags: [
      { id: 'counters', ru: 'контрит', pick: 'enemy', to: 'матчап' },
      { id: 'counters_ours', ru: 'контрит наш пик', pick: 'ours', to: 'матчап' },
    ] },
    { id: 'syn', ru: 'синергия', where: 'pick', tags: [
      { id: 'synergy', ru: 'синергия с', pick: 'ours', to: 'связка' },
    ] },
    { id: 'func', ru: 'функция', where: 'pick', tags: [
      { id: 'fills', ru: 'закрывает', pick: 'func', to: 'флаг' },
    ] },
    { id: 'ban', ru: 'бан', where: 'ban', tags: [
      { id: 'enemy_meta', ru: 'мета у врага', to: 'флаг' },
      { id: 'deny_comfort', ru: 'снимаем комфорт', to: 'флаг' },
      { id: 'deny_flex', ru: 'снимаем флекс', to: 'флаг' },
    ] },
  ];
  function groupsFor(action) {
    return TAG_GROUPS.filter(function (g) { return g.where === 'both' || g.where === action; });
  }
  function allTags(action) {
    return groupsFor(action).reduce(function (a, g) { return a.concat(g.tags); }, []);
  }
  var FUNCS = [
    { id: 'frontline', ru: 'фронт' }, { id: 'waveclear', ru: 'вейв' },
    { id: 'engage', ru: 'энгейдж' }, { id: 'peel', ru: 'пил' }, { id: 'carry', ru: 'дамаг' },
  ];
  var DD = 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/';
  var LANE_SHORT = { Top: 'ТОП', Jungle: 'ЛЕС', Mid: 'МИД', Adc: 'ДРАКОН', Support: 'САПП' };
  var LANES = ['Top', 'Jungle', 'Mid', 'Adc', 'Support'];
  var PHASE_RU = { ban1: 'баны · первая фаза', pick1: 'пики · первая фаза', ban2: 'баны · вторая фаза', pick2: 'пики · вторая фаза' };
  var RANKS = { diamond_plus: 'Алмаз+', master_plus: 'Мастер+', challenger: 'Претендент', apex: 'Супер-сервер', all: 'все ранги' };

  var KB = null, SEQ = null;
  var S = {
    mySide: 'blue',
    rank: 'diamond_plus',
    turnIndex: 0,
    bans: { blue: [], red: [] },
    picks: { blue: [], red: [] },
    fearlessUsed: [],
    map: 1,
    q: '',
    lane: '',
    /* РОСТЕРЫ: кто играет и что умеет (teams.json, экран teams.html).
       Нет ростера → советник работает по всем 142, как раньше. */
    teams: null,
    presets: [],
    presetAt: 0,
    pickRole: '',      // за какую роль идёт ТЕКУЩИЙ пик; пусто = любая свободная
    /* РАЗМЕТКА: знание матчапов кэпа начинается пустым и растёт отсюда. */
    annOn: true,       // режим разметки (можно выключить и просто драфтить)
    pending: null,     // ход, который сейчас размечаем
    ann: { annotations: [], derived: { pairs: {}, synergy: {}, tiers: {}, flex: {}, flags: {}, dropped: {}, seedOk: {} } },
    txtHead: '',       // строки captain-matchups.txt выше меток — не трогаем
    txtSeed: [],       // строки сида по механике — их прунят прямо в разметке
    syn: null,         // synergies.json целиком (пишем только namedPairs)
    votes: {},          // подпись хода+линии → +1/-1 (чтобы было видно, что уже сказал)
    feedback: [],
    saving: 0,
    err: null,
    advice: null,
  };

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  /* ── ЗАГРУЗКА ──────────────────────────────────────────────────────────── */
  function boot() {
    var n = 0, bootN = $('chBootN');
    SEQ = window.DraftLogic.WR_DRAFT_SEQUENCE;
    CaptaincyKnowledge.loadAsync('/').then(function (kb) {
      KB = kb;
      /* Матчапы лежат по файлу на чемпиона и в браузере НЕ подтягиваются сами.
         Без них blindRisk() молчит, и линия «самый ненаказуемый» не родится —
         то есть советник работает вполсилы. Тянем все файлы один раз, список —
         из оглавления: у части чемпионов файла нет вовсе. */
      return fetch('/data-pipeline/matchups.json').then(function (r) { return r.json(); }).then(function (idx) {
        var slugs = Object.keys(idx.champions || {}).map(function (k) { return idx.champions[k].slug; }).filter(Boolean);
        return Promise.all(slugs.map(function (s) {
          return fetch('/data-pipeline/matchups/' + s + '.json')
            .then(function (r) { return r.ok ? r.json() : null; })
            .catch(function () { return null; })
            .then(function (d) { KB.matchups.preload(s, d); bootN.textContent = 'матчапы ' + (++n) + '/' + slugs.length; });
        }));
      });
    }).then(function () {
      var get = function (f, asText) {
        return fetch('/' + f)
          .then(function (r) { return r.ok ? (asText ? r.text() : r.json()) : null; })
          .catch(function () { return null; });
      };
      return Promise.all([
        get(FB_FILE), get(TEAMS_FILE), get(ANN_FILE), get(TXT_FILE, true), get(SYN_FILE),
      ]);
    }).then(function (arr) {
      var fb = arr[0], tm = arr[1], an = arr[2], txt = arr[3], syn = arr[4];
      if (an && an.annotations) {
        S.ann.annotations = an.annotations;
        ['pairs', 'synergy', 'tiers', 'flex', 'flags', 'dropped', 'seedOk'].forEach(function (k) {
          if (an.derived && an.derived[k]) S.ann.derived[k] = an.derived[k];
        });
      }
      var parsed = parseTxt(txt || '');
      S.txtHead = parsed.head;
      S.txtSeed = parsed.seed;
      S.syn = syn;
      if (fb && fb.votes) {
        S.feedback = fb.votes;
        fb.votes.forEach(function (v) { if (v.sig) S.votes[v.sig] = v.verdict; });
      }
      if (tm && tm.presets && tm.presets.length) {
        S.presets = tm.presets;
        var i = tm.presets.findIndex(function (p) { return p.id === tm.active; });
        S.presetAt = i === -1 ? 0 : i;
        loadPreset();
      }
      $('chBoot').hidden = true;
      think();
      render();
      bindKeys();
    }).catch(function (e) {
      $('chBoot').innerHTML = 'Не загрузилось: <b>' + esc(e && e.message) + '</b>';
    });
  }

  /* ── РОСТЕР ────────────────────────────────────────────────────────────
     Пресет — это описание команд, оно общее для всех карт серии. Копию кладём
     в S.teams и уже в ней помечаем, кому какого чемпиона отдали: сам пресет
     драфт не портит. */
  function loadPreset() {
    var p = S.presets[S.presetAt];
    if (!p) { S.teams = null; return; }
    S.teams = JSON.parse(JSON.stringify(p.teams));
    ['blue', 'red'].forEach(function (side) {
      (S.teams[side].players || []).forEach(function (pl) { pl.pick = null; pl.pickIdx = null; });
    });
  }

  function roster(side) { return (S.teams && S.teams[side] && S.teams[side].players) || null; }

  /* ═══ РАЗМЕТКА ХОДА ═══════════════════════════════════════════════════════
     Один ход = одна аннотация. Теги превращаются в знание ТУТ ЖЕ: пары идут
     в captain-matchups.txt, связки в synergies, супер-мета/темп в тиры,
     флекс во флаг. Всё сырьё целиком ложится в captain-annotations.json —
     по нему потом можно пересчитать что угодно, не переспрашивая человека.
     Уверенность = сколько раз подтверждено: вес пары растёт с повторами. */

  /* captain-matchups.txt состоит из трёх слоёв, и каждый пишет свой хозяин:
       1) ГОЛОВА   — руками владельца (и прошлыми инструментами). Не трогаем.
       2) СИД      — механика, node draft-ai/seed-mechanics.mjs. Отсюда прунят:
                     выкинутая строка исчезает, подтверждённая уезжает в слой 3.
       3) РАЗМЕТКА — то, что отмечено прямо в драфте. Перегенерируем целиком.
     Раньше голова бралась «всё до своей метки», и сид, лежащий НИЖЕ, стёрся бы
     первой же записью. Поэтому разбираем файл на слои явно. */
  function parseTxt(txt) {
    var out = { head: '', seed: [] };
    if (!txt) return out;
    var iSeed = txt.indexOf(SEED_MARK);
    var iAnn = txt.indexOf(TXT_MARK);
    var cut = [iSeed, iAnn].filter(function (i) { return i !== -1; });
    out.head = (cut.length ? txt.slice(0, Math.min.apply(null, cut)) : txt).replace(/\s+$/, '');
    if (iSeed !== -1) {
      var tail = txt.slice(iSeed + SEED_MARK.length);
      if (iAnn > iSeed) tail = txt.slice(iSeed + SEED_MARK.length, iAnn);
      out.seed = tail.split(/\r?\n/).filter(function (l) {
        return l.trim() && !l.trim().startsWith('#');
      });
    }
    return out;
  }

  /* Ключ строки сида: «кто > кого» без линии и веса — по нему прунят. */
  function seedKey(line) {
    var m = String(line).split(/\s[—–-]\s/)[0].match(/^(.+?)\s*>\s*(.+?)(?:\s+\S+)?(?:\s+[1-5])?\s*$/);
    if (!m) return null;
    var a = KB.idx.nameOf(m[1].trim()), b = KB.idx.nameOf(m[2].trim().replace(/\s+(топ|лес|мид|дракон|саппорт)\s*$/i, ''));
    return (a && b) ? a + '>' + b : null;
  }

  // сидовые пары, где участвует этот чемпион — их и показываем на вычитку
  function seedFor(en) {
    return S.txtSeed.filter(function (l) {
      var k = seedKey(l);
      if (!k || S.ann.derived.dropped[k] || S.ann.derived.seedOk[k]) return false;
      var p = k.split('>');
      return p[0] === en || p[1] === en;
    }).slice(0, 6);
  }

  // линия хода: роль игрока из ростера → иначе единственная линия чемпа → иначе без линии
  function laneOf(side, en, pickIdx) {
    var r = roster(side) || [];
    var who = r.filter(function (p) { return pickIdx != null && p.pickIdx === pickIdx; })[0];
    if (who && who.role) return who.role;
    var c = KB.idx.champ(en);
    var lanes = (c && c.lanes) || [];
    return lanes.length === 1 ? lanes[0] : null;
  }

  function laneRu(l) { return ({ Top: 'топ', Jungle: 'лес', Mid: 'мид', Adc: 'дракон', Support: 'саппорт' })[l] || null; }
  function weightOf(count) { return Math.min(5, 2 + (count || 1)); }

  function cleanWhy(s) {
    // тире с пробелами в import-captain.mjs делит строку на пару и «почему»
    return String(s || '').replace(/\s+/g, ' ').replace(/\s[—–-]\s/g, ', ').trim();
  }

  function openAnnotation(side, action, en, pickIdx) {
    S.pending = {
      turn: S.turnIndex, side: side, action: action, champ: en,
      lane: laneOf(side, en, pickIdx), pickIdx: pickIdx,
      tags: {}, targets: { counters: [], synergy: [], counters_ours: [], fills: [] },
      note: '',
    };
  }

  function toggleTag(id) {
    var p = S.pending; if (!p) return;
    if (p.tags[id]) delete p.tags[id]; else p.tags[id] = 1;
    render();
  }

  function toggleTarget(tag, val) {
    var p = S.pending; if (!p) return;
    var list = p.targets[tag] || (p.targets[tag] = []);
    var i = list.indexOf(val);
    if (i === -1) list.push(val); else list.splice(i, 1);
    p.tags[tag] = 1;                         // выбрал цель — значит тег стоит
    render();
  }

  /* Пара «кто кого бьёт» с накоплением уверенности. */
  function addPair(a, b, lane, why) {
    if (!a || !b || a === b) return;
    var key = a + '|' + b + '|' + (lane || '*');
    var rev = b + '|' + a + '|' + (lane || '*');
    if (S.ann.derived.pairs[rev]) delete S.ann.derived.pairs[rev];   // развернул — старое не держим
    var cur = S.ann.derived.pairs[key];
    var count = (cur ? cur.count : 0) + 1;
    S.ann.derived.pairs[key] = {
      a: a, b: b, lane: lane || null, why: cleanWhy(why),
      count: count, weight: weightOf(count), source: 'разметка в драфте',
    };
  }

  function addSynergy(a, b, why) {
    if (!a || !b || a === b) return;
    var key = [a, b].sort().join('|');
    var cur = S.ann.derived.synergy[key];
    var count = (cur ? cur.count : 0) + 1;
    S.ann.derived.synergy[key] = {
      a: a, b: b, why: cleanWhy(why), count: count, id: 'captain_' + key.toLowerCase().replace(/\W+/g, '_'),
      source: 'разметка в драфте',
    };
  }

  /* Тир от разметки: «супер-мета» — это S+, «компет-темп» — ступень выше соло.
     Тирлист руками (captain-tiers.json) всё равно главнее — см. knowledge.js. */
  function bumpTier(en, tags) {
    var solo = KB.idx.meta(en, S.rank);
    var soloTier = (solo && solo.tier) || 'B';
    var ORDER = ['D', 'C', 'B', 'A', 'S', 'S+'];
    var want;
    if (tags.fallen) {
      want = ORDER[Math.max(0, ORDER.indexOf(soloTier) - 1)] || 'C';   // ступень вниз
    } else if (tags.super_meta) {
      want = 'S+';
    } else {
      want = ['S+', 'S'].indexOf(soloTier) !== -1 ? 'S+' : 'S';        // темп — ступень вверх
    }
    var cur = S.ann.derived.tiers[en];
    var count = (cur ? cur.count : 0) + 1;
    var from = (cur && cur.from) || [];
    Object.keys(tags).forEach(function (t) {
      if (['super_meta', 'tempo', 'fallen'].indexOf(t) !== -1 && from.indexOf(t) === -1) from.push(t);
    });
    S.ann.derived.tiers[en] = { tier: want, solo: soloTier, count: count, from: from };
  }

  /* Разметил ход — знание выросло. Пишем на диск и ТУТ ЖЕ подкладываем в
     живой KB, чтобы следующий совет уже считался с новым знанием. */
  function confirmAnnotation() {
    var p = S.pending;
    if (!p) return;
    var tagList = Object.keys(p.tags);
    if (!tagList.length) { toast('Ни одного тега — нечего записывать', true); return; }

    var why = p.note ? p.note : tagList.map(function (t) { return tagRu(t); }).join(', ');

    (p.targets.counters || []).forEach(function (x) { addPair(p.champ, x, p.lane, why); });
    (p.targets.counters_ours || []).forEach(function (x) {
      // забаненный чемпион бьёт наш пик — линия берётся от НАШЕГО чемпа
      addPair(p.champ, x, laneOf(other(p.side), x, null), why);
    });
    (p.targets.synergy || []).forEach(function (y) { addSynergy(p.champ, y, why); });
    if (p.tags.super_meta || p.tags.tempo || p.tags.fallen) bumpTier(p.champ, p.tags);
    if (p.tags.flex) S.ann.derived.flex[p.champ] = (S.ann.derived.flex[p.champ] || 0) + 1;
    /* Остальные теги — тоже знание, просто у него пока нет своего расчёта:
       копим счётчиком на чемпиона, движок читает это как notes.flags. */
    var hasOwnField = { counters: 1, counters_ours: 1, synergy: 1, super_meta: 1, tempo: 1, fallen: 1, flex: 1 };
    var flags = S.ann.derived.flags[p.champ] || (S.ann.derived.flags[p.champ] = {});
    tagList.forEach(function (t) { if (!hasOwnField[t]) flags[t] = (flags[t] || 0) + 1; });
    (p.targets.fills || []).forEach(function (f) { flags['func_' + f] = (flags['func_' + f] || 0) + 1; });

    S.ann.annotations.push({
      turn: p.turn, side: p.side, action: p.action, champ: p.champ, lane: p.lane,
      tags: tagList, targets: p.targets, note: p.note || null, map: S.map,
      date: new Date().toISOString(),
    });

    applyToLiveKB();
    S.pending = null;
    think();
    render();
    saveKnowledge();
  }

  /* ПРУНИНГ СИДА. Сид — это механика, а не факт: «уклоняется от автоатак»
     верно по умениям, но в игре может не значить ничего. Поэтому каждая
     сидовая строка живёт до первого решения человека.
       ✓ — пара становится твоей: вес выше, текст твой, строка уезжает из сида;
       ✗ — пара выкидывается и больше не всплывает (движок её отфильтрует). */
  function seedVerdict(line, ok) {
    var k = seedKey(line);
    if (!k) return;
    var p = k.split('>');
    if (ok) {
      S.ann.derived.seedOk[k] = { a: p[0], b: p[1], date: new Date().toISOString().slice(0, 10) };
      var lane = (line.split(/\s[—–-]\s/)[0].match(/\s(топ|лес|мид|дракон|саппорт)\s/) || [])[1];
      var LANE_EN = { 'топ': 'Top', 'лес': 'Jungle', 'мид': 'Mid', 'дракон': 'Adc', 'саппорт': 'Support' };
      addPair(p[0], p[1], LANE_EN[lane] || null, 'подтверждено в драфте (было сидом по механике)');
    } else {
      S.ann.derived.dropped[k] = { a: p[0], b: p[1], date: new Date().toISOString().slice(0, 10) };
      delete S.ann.derived.pairs[p[0] + '|' + p[1] + '|*'];
    }
    applyToLiveKB();
    think();
    render();
    saveKnowledge();
  }

  function tagRu(id) {
    var t = TAG_GROUPS.reduce(function (a, g) { return a.concat(g.tags); }, [])
      .filter(function (x) { return x.id === id; })[0];
    return t ? t.ru : id;
  }

  /* Живой KB: те же структуры, что соберёт knowledge.js при следующей загрузке. */
  function applyToLiveKB() {
    var d = S.ann.derived;
    var pairs = Object.keys(d.pairs).map(function (k) { return d.pairs[k]; });
    var base = (KB.notes.matchups && KB.notes.matchups.pairs) || [];
    var byKey = {}, order = [];
    var key = function (x) { return [x.a, x.b].sort().join('|') + '|' + (x.lane || '*'); };
    base.forEach(function (x) { var k = key(x); if (!byKey[k]) order.push(k); byKey[k] = x; });
    pairs.forEach(function (x) { var k = key(x); if (!byKey[k]) order.push(k); byKey[k] = x; });
    KB.notes.matchups = KB.notes.matchups || {};
    KB.notes.matchups.pairs = order.map(function (k) { return byKey[k]; });

    KB.notes.tiers = KB.notes.tiers || {};
    Object.keys(d.tiers).forEach(function (en) { KB.notes.tiers[en] = d.tiers[en].tier; });
    KB.notes.flex = Object.assign({}, KB.notes.flex || {}, d.flex);
    KB.notes.flags = Object.assign({}, KB.notes.flags || {}, d.flags);
    // выкинутый сид выбывает из живого расчёта сразу, не дожидаясь перезагрузки
    KB.notes.matchups.pairs = KB.notes.matchups.pairs.filter(function (x) {
      return !d.dropped[KB.idx.nameOf(x.a) + '>' + KB.idx.nameOf(x.b)];
    });

    var named = Object.keys(d.synergy).map(function (k) { return d.synergy[k]; });
    KB.synergies.namedPairs = KB.synergies.namedPairs || { pairs: [] };
    KB.synergies.namedPairs.pairs = named;
  }

  /* ── ЗАПИСЬ ЗНАНИЙ НА ДИСК ─────────────────────────────────────────────── */
  function buildTxt() {
    var d = S.ann.derived;
    var keys = Object.keys(d.pairs).sort();
    // сид сохраняем как есть, минус выкинутое и минус то, что уже подтверждено
    // (подтверждённое уезжает в секцию разметки с бóльшим весом и твоим текстом)
    var seed = S.txtSeed.filter(function (l) {
      var k = seedKey(l);
      return !k || (!d.dropped[k] && !d.seedOk[k]);
    });
    var dropped = Object.keys(d.dropped).length;
    var lines = [S.txtHead, '', SEED_MARK].concat(seed, [
      '', '# сида осталось: ' + seed.length + ' · выкинуто тобой: ' + dropped
        + ' · подтверждено: ' + Object.keys(d.seedOk).length,
      '', TXT_MARK,
    ]);
    keys.forEach(function (k) {
      var p = d.pairs[k];
      lines.push(ruOf(p.a) + ' > ' + ruOf(p.b)
        + (p.lane ? '  ' + laneRu(p.lane) : '') + '  ' + p.weight
        + (p.why ? '  — ' + p.why : '')
        + (p.count > 1 ? ' (подтверждено ' + p.count + ')' : ''));
    });
    lines.push('');
    lines.push('# пар из разметки: ' + keys.length + ' · аннотаций всего: ' + S.ann.annotations.length);
    return lines.join('\n') + '\n';
  }

  function saveKnowledge() {
    var d = S.ann.derived;
    var jobs = [];
    jobs.push(post(ANN_FILE, JSON.stringify({
      _: 'РАЗМЕТКА ДРАФТА ОТ ВЛАДЕЛЬЦА — ЕДИНСТВЕННЫЙ источник матчапов для кэпа. ' +
         'Пишет lab-draft-coach/coach.html. knowledge.js вливает derived в notes.matchups.pairs, ' +
         'notes.tiers, notes.flex и synergies.namedPairs. Скрейп data-pipeline кэп не читает вовсе.',
      built: new Date().toISOString(),
      counts: {
        annotations: S.ann.annotations.length,
        pairs: Object.keys(d.pairs).length,
        synergy: Object.keys(d.synergy).length,
        tiers: Object.keys(d.tiers).length,
        flex: Object.keys(d.flex).length,
        flags: Object.keys(d.flags).length,
        seedDropped: Object.keys(d.dropped).length,
        seedConfirmed: Object.keys(d.seedOk).length,
      },
      derived: d,
      annotations: S.ann.annotations,
    }, null, 1)));

    jobs.push(post(TXT_FILE, buildTxt()));

    if (S.syn) {
      var named = Object.keys(d.synergy).map(function (k) { return d.synergy[k]; });
      var syn = Object.assign({}, S.syn);
      syn.namedPairs = Object.assign({}, syn.namedPairs || {}, {
        _: 'Именованные связки. Добавляются владельцем в разметке драфта (lab-draft-coach/coach.html).',
        pairs: named,
      });
      S.syn = syn;
      jobs.push(post(SYN_FILE, JSON.stringify(syn, null, 1)));
    }

    S.saving = 1; render();
    Promise.all(jobs).then(function () {
      S.saving = 0; render();
      toast('Записано: ' + Object.keys(d.pairs).length + ' пар · ' + Object.keys(d.synergy).length
        + ' связок · ' + Object.keys(d.tiers).length + ' тиров');
    }).catch(function (e) {
      S.saving = 0; render();
      toast('НЕ записалось: ' + (e && e.message), true);
    });
  }

  function post(file, content) {
    return fetch('/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: file, content: content }),
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.ok) throw new Error((j && j.error) || 'сервер отказал');
      return j;
    });
  }

  // кому отдать этого чемпиона: свободный игрок нужной роли, в чьём пуле он есть
  function playerFor(side, en, role) {
    var r = roster(side);
    if (!r) return null;
    var want = role || S.pickRole;
    var fit = r.filter(function (p) {
      if (p.pick) return false;
      if (want && p.role !== want) return false;
      return (p.champs || []).some(function (c) { return KB.idx.nameOf(c) === en; });
    });
    return fit[0] || null;
  }

  /* ── СОСТОЯНИЕ ДЛЯ СОВЕТНИКА ───────────────────────────────────────────── */
  function stateFor(side) {
    var st = {
      side: side || S.mySide,
      turnIndex: S.turnIndex,
      rank: S.rank,
      bans: { blue: S.bans.blue.slice(), red: S.bans.red.slice() },
      picks: { blue: S.picks.blue.map(wrap), red: S.picks.red.map(wrap) },
      fearlessUsed: S.fearlessUsed.slice(),
    };
    /* Пулы отдаём движку как есть: он сам режет кандидатов ДО ранжирования
       (advise.js → poolOf). Ростера нет — ключа нет, и всё идёт по-старому. */
    if (S.teams) {
      st.pools = { blue: roster('blue'), red: roster('red') };
      if (S.pickRole) st.pickRole = S.pickRole;
    }
    return st;
  }
  function wrap(n) { return { champ: n }; }

  function think() {
    try {
      S.advice = CaptaincyAdvise.advise(KB, stateFor());
      S.err = null;
    } catch (e) {
      S.advice = null;
      S.err = String(e && e.message || e);
    }
  }

  function step() { return SEQ[S.turnIndex] || null; }

  /* ── ХОД ───────────────────────────────────────────────────────────────── */
  function unavail() { return CaptaincyCoach.availability(KB, stateFor()); }

  function apply(name) {
    var st = step();
    if (!st) { toast('Драфт закончен', true); return; }
    var en = KB.idx.nameOf(name);
    if (!en) return;
    if (unavail()[en]) { toast(ruOf(en) + ' уже недоступен', true); return; }
    if (st.action === 'ban') S.bans[st.side][st.banIdx] = en;
    else {
      S.picks[st.side][st.pickIdx] = en;
      /* Чемпион уходит КОНКРЕТНОМУ игроку: он закрывает роль и выбывает из
         дальнейших кандидатов. Если ни у кого его нет — ростер этого не
         предполагал, и мы говорим об этом вслух, а не молчим. */
      if (roster(st.side)) {
        var who = playerFor(st.side, en, S.pickRole);
        if (who) { who.pick = en; who.pickIdx = st.pickIdx; }
        else toast(ruOf(en) + ' вне пулов — в ростере такого нет', true);
      }
    }
    /* РАЗМЕТКА СТОИТ НА ПУТИ ХОДА. Матчапы кэпа растут только отсюда, поэтому
       форма открывается сразу после хода, а не прячется кнопкой «добавить». */
    if (S.annOn) openAnnotation(st.side, st.action, en, st.action === 'pick' ? st.pickIdx : null);
    S.turnIndex++;
    S.q = '';
    S.pickRole = '';
    think();
    render();
  }

  function undoStep() {
    if (!S.turnIndex) { toast('Отменять нечего', true); return; }
    S.turnIndex--;
    var st = step();
    if (st.action === 'ban') S.bans[st.side][st.banIdx] = undefined;
    else {
      S.picks[st.side][st.pickIdx] = undefined;
      (roster(st.side) || []).forEach(function (p) {
        if (p.pickIdx === st.pickIdx) { p.pick = null; p.pickIdx = null; }
      });
    }
    think();
    render();
  }

  function resetDraft(burn) {
    if (burn) {
      S.picks.blue.concat(S.picks.red).forEach(function (n) {
        if (n && S.fearlessUsed.indexOf(n) === -1) S.fearlessUsed.push(n);
      });
      S.map++;
    } else {
      S.fearlessUsed = [];
      S.map = 1;
    }
    S.bans = { blue: [], red: [] };
    S.picks = { blue: [], red: [] };
    S.turnIndex = 0;
    S.pickRole = '';
    ['blue', 'red'].forEach(function (side) {
      (roster(side) || []).forEach(function (p) { p.pick = null; p.pickIdx = null; });
    });
    think();
    render();
  }

  function ruOf(en) { var c = KB.idx.champ(en); return (c && c.ru) || en; }
  function ddOf(en) { var c = KB.idx.champ(en); return c ? c.dd : null; }

  /* ── ФИДБЭК ────────────────────────────────────────────────────────────── */
  function vote(sig, verdict, line) {
    var st = step() || {};
    S.votes[sig] = verdict;
    S.feedback.push({
      sig: sig,
      date: new Date().toISOString(),
      turn: { index: S.turnIndex, phase: st.phase || null, action: st.action || null, side: st.side || null, map: S.map },
      variant: { kind: line.kind, ru: line.ru, move: line.move, moveRu: line.moveRu },
      why: line.why || [],
      cost: line.cost || null,
      verdict: verdict,
      board: {
        bans: { blue: S.bans.blue.filter(Boolean), red: S.bans.red.filter(Boolean) },
        picks: { blue: S.picks.blue.filter(Boolean), red: S.picks.red.filter(Boolean) },
      },
    });
    render();
    saveFeedback();
  }

  var saveTimer = null;
  function saveFeedback() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      var body = JSON.stringify({
        _: 'ФИДБЭК ПО СОВЕТАМ ИИ-КЭПА. Пишет lab-draft-coach/coach.html. Датасет для ручной ' +
           'подкрутки весов в draft-ai/knowledge/*.json — НЕ обучение нейросети.',
        built: new Date().toISOString(),
        up: S.feedback.filter(function (v) { return v.verdict > 0; }).length,
        down: S.feedback.filter(function (v) { return v.verdict < 0; }).length,
        votes: S.feedback,
      }, null, 1);
      S.saving = 1; render();
      fetch('/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: FB_FILE, content: body }),
      }).then(function (r) { return r.json(); }).then(function (j) {
        if (!j || !j.ok) throw new Error((j && j.error) || 'сервер отказал');
        S.saving = 0; render();
        toast('Записано в ' + FB_FILE);
      }).catch(function (e) {
        S.saving = 0; render();
        toast('НЕ записалось: ' + (e && e.message), true);
      });
    }, 200);
  }

  var toastTimer = null;
  function toast(text, bad) {
    var t = $('chToast');
    t.textContent = text;
    t.className = 'cx-toast show' + (bad ? ' bad' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = 'cx-toast' + (bad ? ' bad' : ''); }, 2600);
  }

  /* ── РЕНДЕР ────────────────────────────────────────────────────────────── */
  function face(en, big, cls) {
    if (!en) return '<span class="cx-face' + (cls ? ' ' + cls : '') + '">·</span>';
    var dd = ddOf(en);
    return '<span class="cx-face' + (big ? ' cx-face--big' : '') + (cls ? ' ' + cls : '') + '">'
      + esc(ruOf(en).slice(0, 1))
      + (dd ? '<img src="' + DD + esc(dd) + '.png" alt="" loading="lazy" onerror="this.remove()">' : '')
      + '</span>';
  }

  function render() { renderTop(); renderBoard(); renderPick(); renderAi(); }

  function renderTop() {
    var st = step();
    var who = st ? (st.side === 'blue' ? 'синие' : 'красные') : '—';
    var act = st ? (st.action === 'ban' ? 'БАН' : 'ПИК') : 'готово';
    var mine = st && st.side === S.mySide;
    var rankOpts = Object.keys(RANKS).map(function (k) {
      return '<option value="' + k + '"' + (S.rank === k ? ' selected' : '') + '>' + RANKS[k] + '</option>';
    }).join('');
    labMorph($('chTop'),
      '<div class="cx-mark"><b>ИИ-кэп</b> <span>· разбор видно целиком</span></div>' +
      '<div class="ch-turn ' + (st ? (st.side === 'blue' ? 'ch-side-blue' : 'ch-side-red') : '') + '">' +
        '<span class="cx-chip">ход ' + Math.min(S.turnIndex + 1, SEQ.length) + ' / ' + SEQ.length + '</span>' +
        '<span class="cx-chip">' + act + '</span>' +
        '<span class="who">' + who + '</span>' +
        '<span class="cx-chip' + (mine ? ' cx-chip--good' : '') + '">' + (mine ? 'наш ход' : 'ход соперника') + '</span>' +
        (st ? '<span class="cx-chip">' + esc(PHASE_RU[st.phase] || st.phase) + '</span>' : '') +
      '</div>' +
      '<div class="cx-sp"></div>' +
      '<div class="cx-seg">' +
        '<button class="cx-btn' + (S.mySide === 'blue' ? ' on' : '') + '" data-side="blue">мы синие</button>' +
        '<button class="cx-btn' + (S.mySide === 'red' ? ' on' : '') + '" data-side="red">мы красные</button>' +
      '</div>' +
      '<select class="cx-field" id="chRank">' + rankOpts + '</select>' +
      '<span class="cx-chip">карта ' + S.map + (S.fearlessUsed.length ? ' · сгорело ' + S.fearlessUsed.length : '') + '</span>' +
      presetHtml() +
      '<button class="cx-btn' + (S.annOn ? ' on' : '') + '" data-act="' + (S.annOn ? 'an-off' : 'an-on') + '">'
        + (S.annOn ? 'разметка вкл' : 'разметка выкл') + '</button>' +
      '<span class="cx-chip">знание: ' + Object.keys(S.ann.derived.pairs).length + ' пар · '
        + S.ann.annotations.length + ' ходов</span>' +
      '<a class="cx-btn" href="tiers.html">Тирлист →</a>');
  }

  /* Ростер виден всегда: советник, который режет кандидатов, обязан показать,
     ЧЕМ он их режет. Нет пресета — так и пишем, и зовём его завести. */
  function presetHtml() {
    if (!S.presets.length) {
      return '<span class="cx-chip cx-chip--warn">ростера нет — советую по всем 142</span>' +
             '<a class="cx-btn" href="teams.html">Составы →</a>';
    }
    var opts = S.presets.map(function (p, i) {
      return '<option value="' + i + '"' + (i === S.presetAt ? ' selected' : '') + '>' + esc(p.name) + '</option>';
    }).join('');
    return '<select class="cx-field" id="chPreset">' + opts + '</select>' +
      '<button class="cx-btn' + (S.teams ? ' on' : '') + '" data-act="pools">'
        + (S.teams ? 'пулы вкл' : 'пулы выкл') + '</button>' +
      '<a class="cx-btn" href="teams.html">Составы →</a>';
  }

  function teamHtml(side) {
    var st = step();
    var nowBan = st && st.side === side && st.action === 'ban' ? st.banIdx : -1;
    var nowPick = st && st.side === side && st.action === 'pick' ? st.pickIdx : -1;
    var bans = '';
    for (var b = 0; b < 5; b++) {
      bans += face(S.bans[side][b], false, nowBan === b ? 'now' : '');
    }
    var picks = '';
    for (var p = 0; p < 5; p++) {
      var n = S.picks[side][p];
      // кто из ростера взял этого чемпиона — видно прямо в слоте
      var who = (roster(side) || []).filter(function (pl) { return pl.pickIdx === p; })[0];
      picks += '<div class="ch-slot' + (n ? '' : ' empty') + (nowPick === p ? ' now' : '') + '" data-key="' + side + 'p' + p + '">' +
        '<span class="n">' + (p + 1) + '</span>' + face(n) +
        '<span class="nm">' + (n ? esc(ruOf(n)) : '—') +
          (who ? ' <span class="cx-sub">' + esc(who.name || LANE_SHORT[who.role]) + ' · ' + esc(LANE_SHORT[who.role]) + '</span>' : '') +
        '</span></div>';
    }
    return '<div class="ch-team ' + (side === 'blue' ? 'ch-side-blue' : 'ch-side-red') + '">' +
      '<div class="cx-h">' + (side === 'blue' ? 'синие' : 'красные') +
        (side === S.mySide ? ' · мы' : '') + '</div>' +
      '<div class="ch-bans">' + bans + '</div>' +
      '<div class="ch-slots">' + picks + '</div>' +
      freeHtml(side) +
    '</div>';
  }

  /* Свободные игроки ростера: по ним видно, кого ещё предстоит закрыть. */
  function freeHtml(side) {
    var r = roster(side);
    if (!r) return '';
    var free = r.filter(function (p) { return !p.pick; });
    if (!free.length) return '<div class="cx-sub">состав собран</div>';
    return '<div class="cx-sub">ждут: ' + free.map(function (p) {
      return esc((p.name || '—') + ' · ' + LANE_SHORT[p.role] + ' (' + (p.champs || []).length + ')');
    }).join(' · ') + '</div>';
  }

  function renderBoard() {
    var done = S.turnIndex >= SEQ.length;
    labMorph($('chBoard'),
      teamHtml('blue') + teamHtml('red') +
      '<div class="cx-sub">Тык по чемпиону = ход по последовательности. <kbd>⌫</kbd> — отменить ход.</div>' +
      '<div class="cx-seg" style="flex-wrap:wrap">' +
        '<button class="cx-btn" data-act="undo">↶ Отменить ход</button>' +
        '<button class="cx-btn" data-act="reset">Сброс</button>' +
        (done ? '<button class="cx-btn on" data-act="next">Следующая карта (сжечь пики)</button>' : '') +
      '</div>');
  }

  function tierHtml(en) {
    var t = CaptaincyCoach.tierOf(KB, en, { rank: S.rank });
    if (!t) return '<span class="cx-tier">·</span>';
    return '<span class="cx-tier' + (t.fromCaptain ? ' cap' : '') + '" data-tier="' + esc(t.tier) + '">'
      + esc(t.tier) + '</span>';
  }

  /* Кто сейчас вообще в кандидатах: пул игрока (пик) или ростер врага (бан).
     Ростера нет — null, и сетка не затемняется. */
  function candidates() {
    if (!S.teams) return null;
    var st = step();
    if (!st) return null;
    var side = st.action === 'ban' ? other(st.side) : st.side;
    var list = CaptaincyAdvise.poolOf(KB, stateFor(st.side), side, st.action === 'ban' ? null : S.pickRole);
    if (list === null) return null;
    var set = {};
    list.forEach(function (n) { set[n] = 1; });
    return set;
  }

  function other(side) { return side === 'blue' ? 'red' : 'blue'; }

  /* ── ФОРМА РАЗМЕТКИ ───────────────────────────────────────────────────── */
  function targetList(kind) {
    var p = S.pending;
    if (kind === 'func') return FUNCS.map(function (f) { return { id: f.id, ru: f.ru }; });
    var side = kind === 'enemy' ? other(p.side) : p.side;
    var out = [];
    (S.picks[side] || []).forEach(function (en) {
      if (en && en !== p.champ) out.push({ id: en, ru: ruOf(en) });
    });
    // на ранних ходах доска пустая — предлагаем ростер соперника/наш
    if (!out.length) {
      (roster(side) || []).forEach(function (pl) {
        (pl.champs || []).forEach(function (c) {
          var en = KB.idx.nameOf(c);
          if (en && en !== p.champ && !out.some(function (x) { return x.id === en; })) out.push({ id: en, ru: ruOf(en) });
        });
      });
    }
    return out;
  }

  function tagBtn(t, i) {
    var p = S.pending;
    var on = !!p.tags[t.id];
    return '<button class="cx-btn' + (on ? ' on' : '') + '" data-tag="' + t.id + '">'
      + esc(t.ru) + (t.pick ? ' →' : '') + (i < 9 ? ' <kbd>' + (i + 1) + '</kbd>' : '') + '</button>';
  }

  function targetsHtml(t) {
    var p = S.pending;
    if (!t.pick || !p.tags[t.id]) return '';
    var list = targetList(t.pick);
    var chosen = p.targets[t.id] || [];
    if (!list.length) return '<div class="an-targets"><span class="lbl">выбрать не из кого — на доске пусто</span></div>';
    return '<div class="an-targets"><span class="lbl">' + esc(t.ru) + ' — выбери кого (можно несколько)</span>' +
      list.map(function (x) {
        return '<button class="cx-btn' + (chosen.indexOf(x.id) !== -1 ? ' on' : '') + '"'
          + ' data-target="' + esc(t.id) + '" data-val="' + esc(x.id) + '">' + esc(x.ru) + '</button>';
      }).join('') + '</div>';
  }

  /* Сид на вычитку: пары по механике, где участвует размечаемый чемпион.
     Он их видит ровно тогда, когда думает именно об этом чемпионе. */
  function seedHtml(en) {
    var list = seedFor(en);
    if (!list.length) return '';
    return '<div class="an-group"><div class="cx-h">сид по механике — подтверди или выкинь</div>' +
      list.map(function (l, i) {
        var head = l.split(/\s[—–-]\s/)[0].trim();
        var why = l.split(/\s[—–-]\s/).slice(1).join(' — ').replace(/^сид: механика, проверь ·\s*/, '');
        return '<div class="an-targets"><span class="lbl">' + esc(head) + '</span>' +
          '<span class="ch-note" style="flex:1 1 100%">' + esc(why) + '</span>' +
          '<button class="cx-btn cx-btn--good" data-seed="ok" data-i="' + i + '">✓ верно</button>' +
          '<button class="cx-btn cx-btn--bad" data-seed="no" data-i="' + i + '">✗ выкинуть</button>' +
        '</div>';
      }).join('') + '</div>';
  }

  function renderAnnotation() {
    var p = S.pending;
    var d = S.ann.derived;
    labMorph($('chPick'),
      '<div class="cx-h">Почему этот ход?' +
        '<div class="cx-sp"></div>' +
        '<span class="cx-chip">' + (p.action === 'ban' ? 'БАН' : 'ПИК') + ' · ход ' + (p.turn + 1) + '</span>' +
        '<span class="cx-chip">' + (p.side === 'blue' ? 'синие' : 'красные') + '</span>' +
        (p.lane ? '<span class="cx-chip">' + esc(LANE_SHORT[p.lane]) + '</span>' : '') +
      '</div>' +
      '<div class="cx-scroll"><div class="an-wrap">' +
        '<div class="an-who">' + face(p.champ, true) + '<b>' + esc(ruOf(p.champ)) + '</b></div>' +
        (function () {
          var n = 0;
          return groupsFor(p.action).map(function (g) {
            return '<div class="an-group"><div class="cx-h">' + esc(g.ru) + '</div>' +
              '<div class="an-tags">' + g.tags.map(function (t) { return tagBtn(t, n++); }).join('') + '</div>' +
              g.tags.map(targetsHtml).join('') +
            '</div>';
          }).join('');
        })() +
        seedHtml(p.champ) +
        '<div class="rt-edit">' +
          '<label for="anNote">своими словами (попадёт в знания как «почему»)</label>' +
          '<textarea class="cx-field" id="anNote" rows="2" placeholder="необязательно — иначе соберу из тегов"></textarea>' +
        '</div>' +
        '<div class="an-acts">' +
          '<button class="cx-btn on" data-act="an-ok">✓ Записать <kbd>Enter</kbd></button>' +
          '<button class="cx-btn" data-act="an-skip">Пропустить <kbd>Esc</kbd></button>' +
          '<button class="cx-btn" data-act="an-off">выключить разметку</button>' +
        '</div>' +
        '<div class="an-done"><div class="cx-h">уже накоплено</div>' +
          '<li>пар <b>' + Object.keys(d.pairs).length + '</b> · связок <b>' + Object.keys(d.synergy).length +
          '</b> · тиров <b>' + Object.keys(d.tiers).length + '</b> · флексов <b>' + Object.keys(d.flex).length +
          '</b> · ходов размечено <b>' + S.ann.annotations.length + '</b></li>' +
          '<li>Пишет <code>' + ANN_FILE + '</code>, <code>' + TXT_FILE + '</code>, <code>' + SYN_FILE + '</code></li>' +
        '</div>' +
      '</div></div>');
    var ta = $('anNote');
    if (ta && ta.__turn !== p.turn) { ta.value = p.note || ''; ta.__turn = p.turn; }
  }

  function renderPick() {
    if (S.pending) return renderAnnotation();
    var un = unavail();
    var cand = candidates();
    var q = S.q.trim().toLowerCase();
    var list = KB.idx.names.filter(function (en) {
      var c = KB.idx.champ(en);
      if (S.lane && (c.lanes || []).indexOf(S.lane) === -1) return false;
      if (!q) return true;
      return (en + ' ' + (c.ru || '') + ' ' + (c.dd || '')).toLowerCase().indexOf(q) !== -1;
    });
    var cells = list.map(function (en, i) {
      var why = un[en];
      var out = cand && !cand[en];
      return '<button class="ch-cell' + (!why && q && i === 0 ? ' hit' : '') + (out ? ' out' : '')
        + '" data-key="c' + en + '" data-champ="' + esc(en) + '"'
        + (why ? ' disabled title="' + esc(why) + '"' : (out ? ' title="вне пула этого хода"' : '')) + '>'
        + face(en) + '<span class="nm">' + esc(ruOf(en)) + '</span>'
        + (why ? '<span class="t">' + esc(why) + '</span>' : tierHtml(en)) + '</button>';
    }).join('');
    var laneBtns = [''].concat(LANES).map(function (l) {
      return '<button class="cx-btn' + (S.lane === l ? ' on' : '') + '" data-lane="' + l + '">'
        + (l ? LANE_SHORT[l] : 'все') + '</button>';
    }).join('');
    labMorph($('chPick'),
      '<div class="cx-h">Кого ставим · ' + list.length +
        (cand ? '<div class="cx-sp"></div><span class="cx-chip">в пуле ' + Object.keys(cand).length + '</span>' : '') +
      '</div>' +
      '<div class="rt-filters">' +
        '<input class="cx-field" id="chQ" placeholder="поиск: имя по-русски или латиницей   (/)" value="' + esc(S.q) + '">' +
        '<div class="cx-seg" style="flex-wrap:wrap">' + laneBtns + '</div>' +
        roleRowHtml() +
      '</div>' +
      '<div class="cx-scroll" style="padding-top:var(--sp-3)"><div class="ch-grid">' + cells + '</div></div>');
    var inp = $('chQ');
    if (inp && inp.value !== S.q) inp.value = S.q;
  }

  /* ЗА КОГО ЭТОТ ПИК. Выбрал роль — кандидаты сужаются до пула того игрока;
     не выбрал — команда вправе закрыть любую свободную роль. */
  function roleRowHtml() {
    var st = step();
    if (!S.teams || !st || st.action !== 'pick') return '';
    var r = roster(st.side) || [];
    var btns = r.map(function (p) {
      if (p.pick) return '';
      return '<button class="cx-btn' + (S.pickRole === p.role ? ' on' : '') + '" data-role="' + p.role + '">'
        + esc(LANE_SHORT[p.role]) + ' ' + esc(p.name || '—') + '</button>';
    }).join('');
    return '<div class="cx-seg" style="flex-wrap:wrap">' +
      '<span class="cx-chip">пик за</span>' +
      '<button class="cx-btn' + (S.pickRole ? '' : ' on') + '" data-role="">любую роль</button>' + btns +
    '</div>';
  }

  /* Разбор линии: why у разных слоёв приходит то строками, то объектами
     {kind,text,bad} — показываем и то и то, ничего не теряя. */
  function whyLi(w) {
    if (w == null) return '';
    if (typeof w === 'string') return '<li>' + esc(w) + '</li>';
    return '<li' + (w.bad ? ' class="bad"' : '') + '>' + esc(w.text || JSON.stringify(w)) + '</li>';
  }

  function lineHtml(line, i, kind) {
    var sig = S.turnIndex + '|' + (line.kind || kind) + '|' + [].concat(line.move).join('+');
    var said = S.votes[sig];
    var moveRu = line.moveRu || (line.ru && line.champ ? line.ru : '') || [].concat(line.move).map(ruOf).join(' + ');
    /* У дабл-пика ход — ПАРА. Кнопка ставит обоих подряд: ровно это и
       советует линия, разбивать её на два клика незачем. */
    var moves = [].concat(line.move || line.champ).filter(Boolean);
    var firstMove = moves[0];
    return '<div class="ch-line' + (line.warn ? ' warn' : '') + '" data-key="l' + i + '">' +
      '<div class="ch-line-h"><span class="num">' + (i + 1) + '</span>' +
        '<span class="ru">' + esc(line.ru || kind || 'вариант') + '</span>' +
      '</div>' +
      '<div class="ch-move">' + face(firstMove, true) + '<b>' + esc(moveRu) + '</b>' +
        '<button class="cx-btn" data-champs="' + esc(moves.join(',')) + '">поставить' +
          (i < 3 ? ' <kbd>' + (i + 1) + '</kbd>' : '') + '</button>' +
      '</div>' +
      '<ul class="ch-arg">' + (line.why || []).map(whyLi).join('') + '</ul>' +
      (line.wait && line.wait.text ? '<div class="ch-wait">' + esc(line.wait.text) + '</div>' : '') +
      (line.cost ? '<div class="ch-cost">' + esc(line.cost) + '</div>' : '') +
      '<div class="ch-vote">' +
        '<button class="cx-btn' + (said > 0 ? ' on' : '') + '" data-vote="1" data-line="' + i + '">👍</button>' +
        '<button class="cx-btn' + (said < 0 ? ' on' : '') + '" data-vote="-1" data-line="' + i + '">👎</button>' +
        '<span class="said">' + (said ? (said > 0 ? 'сказал: совет верный' : 'сказал: совет мимо') : 'оцени рассуждение') + '</span>' +
      '</div>' +
    '</div>';
  }

  var shown = [];     // что сейчас на панели — по индексу из data-line

  function renderAi() {
    var a = S.advice;
    shown = [];
    if (S.err) {
      labMorph($('chAi'), '<div class="cx-h">ИИ-кэп</div><div class="ch-note">Советник упал: ' + esc(S.err) + '</div>');
      return;
    }
    if (!a || a.done) {
      labMorph($('chAi'), '<div class="cx-h">ИИ-кэп</div>' +
        '<div class="ch-note">' + esc((a && a.note) || 'драфт закончен') + '</div>');
      return;
    }
    var head = '', body = '';
    if (a.notOurTurn) {
      head = 'Ждём соперника';
      var exp = (a.expect || []).map(function (x, i) {
        shown.push(x);
        return lineHtml({
          kind: 'expect', ru: 'Соперник скорее всего возьмёт', move: x.champ, moveRu: x.ru,
          why: x.why || [], cost: null,
        }, i, 'expect');
      }).join('');
      body = '<div class="ch-note">' + esc(a.note || '') + '</div>' + '<div class="ch-lines">' + exp + '</div>';
    } else {
      head = (a.action === 'ban' ? 'Что банить' : 'Кого брать') + (a.isDouble ? ' · дабл' : '');
      var lines = (a.lines || []);
      if (!lines.length) body = '<div class="ch-note">вариантов нет — пул пуст или всё недоступно</div>';
      else body = '<div class="ch-lines">' + lines.map(function (l, i) { shown.push(l); return lineHtml(l, i); }).join('') + '</div>';
    }
    /* Откуда кандидаты — это часть разбора: «из пула Айка» и «из всех 142» —
       два разных совета, и тренер должен видеть, какой перед ним. */
    var poolNote = a.pool
      ? '<div class="ch-note">кандидаты: ' + esc(a.pool.from)
        + (a.pool.role ? ' · роль ' + esc(LANE_SHORT[a.pool.role] || a.pool.role) : '')
        + ' · ' + a.pool.count + (a.pool.note ? ' — ' + esc(a.pool.note) : '') + '</div>'
      : (a.notOurTurn ? ''      // чужой ход — про наши пулы тут говорить нечего
        : '<div class="ch-note">ростер не задан — считаю по всем ' + KB.idx.names.length + ' чемпионам</div>');
    var note = poolNote + (a.dataNote ? '<div class="ch-note">' + esc(a.dataNote) + '</div>' : '');
    var tally = '<span class="cx-chip">👍 ' + S.feedback.filter(function (v) { return v.verdict > 0; }).length
      + ' · 👎 ' + S.feedback.filter(function (v) { return v.verdict < 0; }).length + '</span>'
      + (S.saving ? '<span class="cx-chip">пишу…</span>' : '');
    labMorph($('chAi'),
      '<div class="cx-h">' + esc(head) + '<div class="cx-sp"></div>' + tally + '</div>' +
      '<div class="cx-scroll">' + body + note +
        '<div class="cx-sub">Оценки копятся в <code>' + FB_FILE + '</code> — датасет для подкрутки весов.</div>' +
        '<div style="padding-top:var(--sp-4)"><button class="cx-btn cx-btn--wide" data-act="nodes">Счётчик узлов</button></div>' +
      '</div>');
  }

  /* ── СОБЫТИЯ ───────────────────────────────────────────────────────────── */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-champ],[data-champs],[data-act],[data-side],[data-lane],[data-vote],[data-role],[data-tag],[data-target],[data-seed]');
    if (!el) return;
    if (el.hasAttribute('data-seed')) {
      var line = seedFor(S.pending ? S.pending.champ : '')[+el.dataset.i];
      if (line) seedVerdict(line, el.dataset.seed === 'ok');
      return;
    }
    if (el.hasAttribute('data-tag')) return toggleTag(el.dataset.tag);
    if (el.hasAttribute('data-target')) return toggleTarget(el.dataset.target, el.dataset.val);
    if (el.hasAttribute('data-role')) { S.pickRole = el.dataset.role; think(); render(); return; }
    if (el.dataset.vote) {
      var line = shown[+el.dataset.line];
      if (!line) return;
      var norm = line.kind ? line : { kind: 'expect', ru: 'ожидаемый ход соперника', move: line.champ, moveRu: line.ru, why: line.why, cost: null };
      var sig = S.turnIndex + '|' + (norm.kind) + '|' + [].concat(norm.move).join('+');
      return vote(sig, +el.dataset.vote, norm);
    }
    if (el.dataset.champs) return el.dataset.champs.split(',').forEach(apply);
    if (el.dataset.champ) return apply(el.dataset.champ);
    if (el.dataset.side) { S.mySide = el.dataset.side; think(); render(); return; }
    if (el.dataset.lane !== undefined && el.hasAttribute('data-lane')) { S.lane = el.dataset.lane; renderPick(); return; }
    var a = el.dataset.act;
    if (a === 'an-ok') confirmAnnotation();
    else if (a === 'an-skip') { S.pending = null; render(); }
    else if (a === 'an-off') { S.annOn = false; S.pending = null; render(); toast('Разметка выключена — включить в шапке'); }
    else if (a === 'an-on') { S.annOn = true; render(); toast('Разметка включена'); }
    else if (a === 'undo') undoStep();
    else if (a === 'reset') resetDraft(false);
    else if (a === 'next') resetDraft(true);
    else if (a === 'pools') {
      // выключатель пулов на месте: сравнить «с ростером» и «без» за один тык
      if (S.teams) { S.teams = null; S.pickRole = ''; } else loadPreset();
      think(); render();
      toast(S.teams ? 'Советую по пулам ростера' : 'Советую по всем чемпионам');
    } else if (a === 'nodes') nodes();
  });

  document.addEventListener('change', function (e) {
    if (e.target.id === 'chRank') { S.rank = e.target.value; think(); render(); }
    if (e.target.id === 'chPreset') { S.presetAt = +e.target.value; loadPreset(); think(); render(); }
  });
  // поиск: фильтруем на каждую букву, но через morph — сетка не пересоздаётся
  document.addEventListener('input', function (e) {
    if (e.target.id === 'chQ') { S.q = e.target.value; renderPick(); }
    if (e.target.id === 'anNote' && S.pending) S.pending.note = e.target.value;
  });

  function bindKeys() {
    document.addEventListener('keydown', function (e) {
      var inField = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName || '');
      if (inField) {
        if (e.key === 'Escape') { e.target.blur(); if (!S.pending) { S.q = ''; renderPick(); } }
        if (e.key === 'Enter' && !e.shiftKey) {
          if (S.pending) { e.preventDefault(); e.target.blur(); confirmAnnotation(); return; }
          var first = document.querySelector('.ch-cell:not([disabled])');
          if (first) apply(first.dataset.champ);
        }
        return;
      }
      /* Пока размечаем ход — клавиши принадлежат форме: цифры ставят теги,
         Enter записывает, Esc пропускает. Драфт при этом уже сделан. */
      if (S.pending) {
        if (e.key === 'Enter') { e.preventDefault(); return confirmAnnotation(); }
        if (e.key === 'Escape') { e.preventDefault(); S.pending = null; return render(); }
        if (e.key >= '1' && e.key <= '9') {
          var t = allTags(S.pending.action)[+e.key - 1];
          if (t) { e.preventDefault(); toggleTag(t.id); }
        }
        return;
      }
      if (e.key === '/') { e.preventDefault(); var i = $('chQ'); if (i) i.focus(); return; }
      if (e.key === 'Backspace') { e.preventDefault(); return undoStep(); }
      if (e.key >= '1' && e.key <= '3') {
        var l = shown[+e.key - 1];
        if (l) { e.preventDefault(); [].concat(l.move || l.champ).filter(Boolean).forEach(apply); }
      }
    });
  }

  /* ПРИЁМКА ЧИСЛОМ (закон счётчика узлов): помечаем весь экран, делаем РЕАЛЬНЫЙ
     ход — тык по первому доступному чемпиону — и смотрим, сколько узлов выжило.
     Здоровый ход меняет единицы. Ход остаётся сделанным: отменить — <⌫>. */
  function nodes() {
    var first = document.querySelector('.ch-cell:not([disabled])');
    if (!first) { toast('Некого ставить — счётчик нечем мерить', true); return; }
    var before = labNodeMark(document.body);
    apply(first.dataset.champ);
    toast('Ход сделан. Узлов выжило ' + labNodeCount() + ' (помечено ' + before + ')');
  }

  boot();
})();
