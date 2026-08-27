/* ════════════════════════════════════════════════════════════════
   wr-prefs.js — ЕДИНЫЙ ХАБ ЮЗЕР-НАСТРОЕК (⚙). ОДИН источник правды.

   Закон: настройка = ОДНА глобальная переменная на :root. Никто ничего
   не «пересобирает» — весь сайт читает переменные и обновляется сам.
   Поэтому смена настройки = 0 пересозданных DOM-узлов (счётчик докажет).

   ★ ПОДКЛЮЧАТЬ ОБЫЧНЫМ <script> В <head>, ДО стилей контента:
       <script src="wr-prefs.js?v=1"></script>
     Блокирующий скрипт в head успевает применить настройки ДО первой
     отрисовки → первый кадр сразу правильный, ничего не мигает
     (закон feedback_no_flash). defer/async тут НЕЛЬЗЯ — будет вспышка дефолта.

   ХРАНЕНИЕ:
     · ЛАБ / первый кадр ....... localStorage (ключ wr:prefs:v1) — синхронно, мгновенно.
     · БОЕВОЙ (per-user) ....... Firestore users/<uid>.prefs — подключается одной строкой:
           WRPrefs.setRemote({ save: fn(state), });      // запись при каждом изменении
           WRPrefs.merge(remoteState);                   // когда профиль догрузился
       localStorage при этом остаётся КЭШЕМ первого кадра (Firestore асинхронный,
       без кэша был бы кадр дефолта → вспышка).

   ЧТО НЕ ЖИВЁТ ЗДЕСЬ: сила/тёмность/blur стекла. Они ЗАФИКСИРОВАНЫ каноном
   (DESIGN.md, выбор владельца 2026-08-01) и из ⚙ убраны намеренно.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.WRPrefs) return;

  var KEY = 'wr:prefs:v1';

  /* Сплэш-арты. ★ Э1.1: демо-набор заменён БОЕВЫМ РЕЕСТРОМ (это и предписывал
     комментарий выше: «в боевом заменить реестром WR-сплэшей»).
     Группировка по ЯРКОСТИ (kind) — чтобы читабельность проверялась на худшем
     случае: на тёмном арте текст читается всегда, на СВЕТЛОМ тонет.
     ★ ДВА РАЗМЕРА ОДНОГО АРТА (закон «ассет под размер показа»):
       фон страницы = splash 1215×717 (~500 КБ), плитка в ⚙ = loading 308×560 (~40 КБ).
     Тянуть полные сплэши ради плиток = мегабайты впустую.
     Два последних — БЕЗ арта (mode:'none'): «Бренд» (градиент) и «Свой цвет». */
  var SPLASH_BASE = 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/';
  var THUMB_BASE = 'https://ddragon.leagueoflegends.com/cdn/img/champion/loading/';
  var ARTS = [
    { v: 'thresh', t: 'Треш', key: 'Thresh', kind: 'dark' },
    { v: 'nocturne', t: 'Ноктюрн', key: 'Nocturne', kind: 'dark' },
    { v: 'yasuo', t: 'Ясуо', key: 'Yasuo', kind: 'dark' },
    { v: 'lux', t: 'Люкс', key: 'Lux', kind: 'light' },
    { v: 'soraka', t: 'Сорака', key: 'Soraka', kind: 'light' },
    { v: 'janna', t: 'Жанна', key: 'Janna', kind: 'light' },
    { v: 'jinx', t: 'Джинкс', key: 'Jinx', kind: 'busy' },
    { v: 'zoe', t: 'Зои', key: 'Zoe', kind: 'busy' },
    { v: 'ahri', t: 'Ари', key: 'Ahri', kind: 'busy' },
    { v: 'brand', t: 'Бренд', mode: 'none', kind: 'none' },
    { v: 'color', t: 'Свой цвет', mode: 'none', kind: 'none' }
  ];

  /* Акцент — ТОЛЬКО на данных (WR%, тиры, ↑↓). Chrome остаётся белым --sel-*. */
  /* ★ АКЦЕНТ = БЕЛЫЙ, ОДИН (Эржан 2026-08-07). Циан и золото УДАЛЕНЫ —
     они были в списке только потому, что белого варианта не существовало.
     Цвет на сайте несут ТОЛЬКО данные (WR/тиры/урон/статы/роли/валюта). */
  var ACCENTS = [
    { v: 'white', t: 'Белый', c: '#ffffff', rgb: '255,255,255' }
  ];

  /* Плотность — ОДИН множитель --dens, от него считаются отступы блоков. */
  var DENSITY = [
    { v: 'compact', t: 'Компакт', k: 0.82, note: 'больше данных на экран' },
    { v: 'normal', t: 'Средне', k: 1, note: 'канон' },
    { v: 'roomy', t: 'Просторно', k: 1.2, note: 'воздуха больше' }
  ];

  var DEF = { splash: 'thresh', accent: 'white', density: 'normal' };
  var LISTS = { splash: ARTS, accent: ACCENTS, density: DENSITY };
  /* Свободные (не из списка) значения. splashColor — цвет режима «Свой цвет».
     Живёт здесь, а не в чужом сторе: у подложки ОДИН владелец, иначе снова два
     источника правды и снова расхождение. */
  var FREE = { splashColor: '#04121f' };
  var HEX = /^#[0-9a-fA-F]{6}$/;

  function find(list, v) {
    for (var i = 0; i < list.length; i++) if (list[i].v === v) return list[i];
    return null;
  }
  function clean(raw) {
    var o = {}, k;
    for (k in DEF) o[k] = (raw && find(LISTS[k], raw[k])) ? raw[k] : DEF[k];
    for (k in FREE) o[k] = (raw && HEX.test(String(raw[k] || ''))) ? raw[k] : FREE[k];
    return o;
  }
  function read() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { }
    return clean(s);
  }
  function write() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { }
    if (remote && remote.save) { try { remote.save(copy()); } catch (e) { } }
  }
  function copy() { var o = {}, k; for (k in state) o[k] = state[k]; return o; }

  var state = read();
  var subs = [];
  var remote = null;

  /* key = имя файла на CDN; для «Бренд»/«Свой цвет» арта нет вообще. */
  function artURL(v) {
    var a = find(ARTS, v);
    if (!a || a.mode === 'none') return '';
    return SPLASH_BASE + (a.key || v) + '_0.jpg';
  }
  function thumbURL(v) {
    var a = find(ARTS, v);
    if (!a || a.mode === 'none') return '';
    return THUMB_BASE + (a.key || v) + '_0.jpg';
  }

  /* ★ ВСЯ смена вида сайта живёт в этих строках. Узлы не трогаем вообще.
     ★★ ПОДЛОЖКА: ЕДИНСТВЕННОЕ место во всём проекте, где задаётся фон-арт.
     Больше никто — ни вид, ни раздел, ни калькулятор — своей подложки не кладёт
     и `style.backgroundImage` не пишет. Меняешь тут одну переменную → меняется
     весь сайт разом. Нарушения ловит tools/canon-lint.mjs (правило «свой-арт-фон»). */
  function apply() {
    var r = document.documentElement;
    var a = find(ACCENTS, state.accent), d = find(DENSITY, state.density);
    var url = artURL(state.splash);
    /* три режима подложки — все через ОДНУ переменную:
       арт → url(…) · «Бренд» → готовый градиент канона · «Свой цвет» → арта нет */
    r.style.setProperty('--splash-img',
      url ? "url('" + url + "')" : (state.splash === 'brand' ? 'var(--splash-brand)' : 'none'));
    r.style.setProperty('--splash-color',
      state.splash === 'color' ? state.splashColor : 'transparent');
    r.style.setProperty('--accent', a.c);
    r.style.setProperty('--accent-rgb', a.rgb);
    r.style.setProperty('--accent-glow', 'rgba(' + a.rgb + ',.45)');
    r.style.setProperty('--accent-dim', 'rgba(' + a.rgb + ',.15)');
    r.style.setProperty('--dens', String(d.k));
    r.setAttribute('data-splash', state.splash);
    r.setAttribute('data-accent', state.accent);
    r.setAttribute('data-density', state.density);
  }

  function notify(key) {
    for (var i = 0; i < subs.length; i++) { try { subs[i](copy(), key); } catch (e) { } }
  }

  apply();   /* ДО первой отрисовки — иначе кадр мигнёт дефолтом */

  window.WRPrefs = {
    KEY: KEY,
    ARTS: ARTS, ACCENTS: ACCENTS, DENSITY: DENSITY, DEFAULTS: DEF,
    get: copy,
    artURL: artURL, thumbURL: thumbURL,
    option: function (key, v) { return find(LISTS[key], v); },
    set: function (key, v) {
      if (state[key] === v) return false;
      if (key in FREE) { if (!HEX.test(String(v || ''))) return false; }
      else if (!(key in DEF) || !find(LISTS[key], v)) return false;
      state[key] = v; apply(); write(); notify(key);
      return true;
    },
    /* профиль догрузился из Firestore — тихо доливаем (без вспышки: меняются переменные) */
    merge: function (raw) {
      var next = clean(raw), changed = false, k;
      for (k in next) if (next[k] !== state[k]) { state[k] = next[k]; changed = true; }
      if (changed) { apply(); write(); notify(null); }
      return changed;
    },
    reset: function () {
      var k;
      for (k in DEF) state[k] = DEF[k];
      for (k in FREE) state[k] = FREE[k];
      apply(); write(); notify(null);
    },
    /* ★ ДРУГАЯ ВКЛАДКА/IFRAME сменила настройку → подхватываем.
       Нужно калькулятору: он живёт в iframe, CSS-переменные границу iframe НЕ переходят,
       а localStorage у нас общий (тот же origin). Событие storage в документе-источнике
       не срабатывает, только в соседних — ровно то, что надо. */
    listenCrossDoc: function () {
      window.addEventListener('storage', function (e) {
        if (e.key !== KEY) return;
        try { window.WRPrefs.merge(JSON.parse(e.newValue || 'null')); } catch (_) { }
      });
    },
    setRemote: function (r) { remote = r; },
    onChange: function (fn) { subs.push(fn); return function () { subs.splice(subs.indexOf(fn), 1); }; }
  };
})();
