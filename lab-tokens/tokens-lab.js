/* ════════════════════════════════════════════════════════════════
   lab-tokens — МАСТЕР УТВЕРЖДЕНИЯ ТОКЕНОВ (пересобран 2026-08-02)

   Жалоба владельца: «3 варианта, но НЕ ПОНЯТНО как работает, изменения НЕ ЧУВСТВУЮТСЯ,
   захламлено, в каждой настройке ещё вложенные ползунки — каша».

   Лечение:
   · ОДИН экран = ОДИН выбор. Шаг N из 10, кнопки Назад/Дальше.
   · 3 КРУПНЫХ пресета, каждый со словесным «что изменится».
   · Ползунки убраны с глаз — под «Тонкая настройка ▸» (свёрнуто).
   · Рядом БОЛЬШОЕ живое превью на реальных элементах, у него transition на
     padding/font-size/border-radius → при тыке изменение ВИДНО глазом, а не «вроде что-то».
   · Превью и фокус-блоки строятся ОДИН раз и переключаются → 0 пересозданных узлов.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var CDN = 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/';

  function ico(d) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
  }
  var I = {
    check: ico('<path d="m4 12 5 5L20 6"/>'),
    prev: ico('<path d="M15 19 8 12l7-7"/>'),
    next: ico('<path d="m9 5 7 7-7 7"/>'),
    star: ico('<path d="m12 3 2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-2.9L6.7 19.6l1.1-6L3.4 9.4l6-.8L12 3Z"/>')
  };

  /* ════════════════════════════════════════════════════════════
     СХЕМА ТОКЕНОВ — 156 штук. Нужна для «Тонкой настройки» и экспорта.
     Порядок групп = порядок в canon-tokens.css.
     ════════════════════════════════════════════════════════════ */
  var GROUPS = [
    { id: 'spacing', n: 1, t: 'ОТСТУПЫ', toks: [
      { k: '--sp-px', t: 'px', v: 1, min: 0, max: 4, s: 1 },
      { k: '--sp-0', t: 'px', v: 2, min: 0, max: 8, s: 1 },
      { k: '--sp-1', t: 'px', v: 4, min: 0, max: 14, s: 1 },
      { k: '--sp-2', t: 'px', v: 6, min: 0, max: 18, s: 1 },
      { k: '--sp-3', t: 'px', v: 8, min: 0, max: 24, s: 1 },
      { k: '--sp-4', t: 'px', v: 12, min: 0, max: 32, s: 1 },
      { k: '--sp-5', t: 'px', v: 16, min: 0, max: 40, s: 1 },
      { k: '--sp-6', t: 'px', v: 24, min: 0, max: 60, s: 1 },
      { k: '--sp-7', t: 'px', v: 32, min: 0, max: 80, s: 1 },
      { k: '--sp-8', t: 'px', v: 48, min: 0, max: 110, s: 1 },
      { k: '--sp-9', t: 'px', v: 64, min: 0, max: 140, s: 1 }
    ] },
    { id: 'type', n: 2, t: 'ШРИФТЫ', toks: [
      { k: '--fs-2xs', t: 'px', v: 10, min: 8, max: 20, s: .5 },
      { k: '--fs-xs', t: 'px', v: 11, min: 8, max: 22, s: .5 },
      { k: '--fs-sm', t: 'px', v: 12, min: 9, max: 24, s: .5 },
      { k: '--fs-base', t: 'px', v: 13, min: 10, max: 26, s: .5, note: 'базовый текст сайта' },
      { k: '--fs-md', t: 'px', v: 14, min: 10, max: 28, s: .5 },
      { k: '--fs-lg', t: 'px', v: 15, min: 11, max: 30, s: .5 },
      { k: '--fs-xl', t: 'px', v: 17, min: 12, max: 34, s: .5 },
      { k: '--fs-2xl', t: 'px', v: 20, min: 14, max: 40, s: .5 },
      { k: '--fs-3xl', t: 'px', v: 24, min: 16, max: 48, s: .5 },
      { k: '--fs-4xl', t: 'px', v: 28, min: 18, max: 60, s: .5 },
      { k: '--fs-5xl', t: 'px', v: 36, min: 20, max: 76, s: .5 },
      { k: '--fw-normal', t: 'int', v: 400, min: 100, max: 900, s: 100 },
      { k: '--fw-med', t: 'int', v: 500, min: 100, max: 900, s: 100 },
      { k: '--fw-semi', t: 'int', v: 600, min: 100, max: 900, s: 100 },
      { k: '--fw-bold', t: 'int', v: 700, min: 100, max: 900, s: 100 },
      { k: '--fw-black', t: 'int', v: 800, min: 100, max: 900, s: 100, note: 'снап 900→800' },
      { k: '--lh-tight', t: 'num', v: 1.15, min: 1, max: 1.6, s: .01 },
      { k: '--lh-snug', t: 'num', v: 1.35, min: 1, max: 1.8, s: .01 },
      { k: '--lh-normal', t: 'num', v: 1.5, min: 1, max: 2, s: .01 },
      { k: '--lh-relaxed', t: 'num', v: 1.6, min: 1, max: 2.2, s: .01 },
      { k: '--font-ui', t: 'raw', v: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }
    ] },
    { id: 'radii', n: 3, t: 'СКРУГЛЕНИЯ', toks: [
      { k: '--r-xs', t: 'px', v: 6, min: 0, max: 24, s: 1 },
      { k: '--r-sm', t: 'px', v: 8, min: 0, max: 28, s: 1 },
      { k: '--r-md', t: 'px', v: 11, min: 0, max: 34, s: 1 },
      { k: '--r-lg', t: 'px', v: 15, min: 0, max: 46, s: 1, note: '= --ds-r' },
      { k: '--r-xl', t: 'px', v: 20, min: 0, max: 56, s: 1 },
      { k: '--r-2xl', t: 'px', v: 24, min: 0, max: 70, s: 1 },
      { k: '--r-pill', t: 'px', v: 999, min: 100, max: 999, s: 1 },
      { k: '--r-full', t: 'raw', v: '50%' }
    ] },
    { id: 'widths', n: 4, t: 'ШИРИНЫ', toks: [
      { k: '--content-max', t: 'px', v: 1400, min: 900, max: 2200, s: 20, note: 'лечит «кнопку на весь монитор»' },
      { k: '--content-max-narrow', t: 'px', v: 920, min: 600, max: 1400, s: 10 },
      { k: '--rail-w', t: 'px', v: 235, min: 160, max: 340, s: 1 },
      { k: '--rail-min', t: 'px', v: 64, min: 40, max: 110, s: 1 },
      { k: '--rail-inset', t: 'px', v: 14, min: 0, max: 40, s: 1 },
      { k: '--rail-gap', t: 'px', v: 18, min: 0, max: 48, s: 1 },
      { k: '--shell-left', t: 'raw', v: 'calc(var(--rail-min) + var(--rail-inset) + var(--rail-gap))' },
      { k: '--header-h', t: 'px', v: 64, min: 40, max: 110, s: 1 },
      { k: '--tbl-w', t: 'px', v: 1050, min: 660, max: 1440, s: 10 },
      { k: '--card-w', t: 'px', v: 300, min: 220, max: 460, s: 2 },
      { k: '--pick-w', t: 'px', v: 330, min: 240, max: 500, s: 2 },
      { k: '--sidecard-reserve', t: 'px', v: 348, min: 260, max: 520, s: 2 },
      { k: '--modal-sm', t: 'px', v: 400, min: 280, max: 600, s: 10 },
      { k: '--modal-md', t: 'px', v: 520, min: 360, max: 800, s: 10 },
      { k: '--modal-lg', t: 'px', v: 760, min: 500, max: 1100, s: 10 }
    ] },
    { id: 'colors', n: 5, t: 'ЦВЕТА', toks: [
      { g: 'Текст' },
      { k: '--txt', t: 'color', v: '#ffffff' },
      { k: '--txt-dim', t: 'color', v: '#cfe4f0' },
      { k: '--txt-mute', t: 'wa', v: .72 },
      { k: '--txt-faint', t: 'wa', v: .42 },
      { k: '--txt-shadow', t: 'raw', v: '0 2px 14px rgba(1,10,19,.8)' },
      { k: '--on-accent', t: 'color', v: '#0a1016' },
      { g: 'Chrome — БЕЛАЯ шкала (синяя удалена)' },
      { k: '--sel-05', t: 'wa', v: .06 }, { k: '--sel-09', t: 'wa', v: .09 },
      { k: '--sel-12', t: 'wa', v: .12 }, { k: '--sel-18', t: 'wa', v: .18 },
      { k: '--sel-45', t: 'wa', v: .45 }, { k: '--sel-bd', t: 'wa', v: .5 },
      { g: 'Акцент — только ДАННЫЕ' },
      { k: '--accent', t: 'color', v: '#ffffff', accent: true },
      { k: '--accent-rgb', t: 'derived', from: '--accent', mode: 'rgb' },
      { k: '--accent-glow', t: 'derived', from: '--accent', mode: 'alpha', a: .45 },
      { k: '--accent-dim', t: 'derived', from: '--accent', mode: 'alpha', a: .15 },
      { g: 'WinRate' },
      { k: '--data-good', t: 'color', v: '#4ade80' }, { k: '--data-good-soft', t: 'color', v: '#7fdca4' },
      { k: '--data-bad', t: 'color', v: '#ff5470' }, { k: '--data-bad-soft', t: 'color', v: '#ff8080' },
      { g: 'Тиры' },
      { k: '--tier-s-plus', t: 'color', v: '#ff3a3a' }, { k: '--tier-s', t: 'color', v: '#ff5470' },
      { k: '--tier-a', t: 'color', v: '#ffb454' }, { k: '--tier-b', t: 'color', v: '#ffd700' },
      { k: '--tier-c', t: 'color', v: '#4ade80' }, { k: '--tier-d', t: 'color', v: '#7aa2c4' },
      { g: 'Урон' },
      { k: '--dmg-phys', t: 'color', v: '#f0a43c' }, { k: '--dmg-magic', t: 'color', v: '#29b6f6' },
      { k: '--dmg-true', t: 'color', v: '#ffffff' }, { k: '--dmg-onhit', t: 'color', v: '#B48CFF' },
      { k: '--dmg-mixed', t: 'color', v: '#ffd66b' },
      { g: 'Статы' },
      { k: '--stat-ad', t: 'color', v: '#8B5E3C' }, { k: '--stat-ap', t: 'color', v: '#B48CFF' },
      { k: '--stat-hp', t: 'color', v: '#27AE60' }, { k: '--stat-mana', t: 'color', v: '#5dade2' },
      { k: '--stat-armor', t: 'color', v: '#D4AC00' }, { k: '--stat-mr', t: 'color', v: '#7fb3d5' },
      { k: '--stat-as', t: 'color', v: '#f0a43c' }, { k: '--stat-ms', t: 'color', v: '#7fdca4' },
      { k: '--stat-crit', t: 'color', v: '#ff5470' },
      { g: 'Роли' },
      { k: '--role-top', t: 'color', v: '#e8935a' }, { k: '--role-jungle', t: 'color', v: '#4ade80' },
      { k: '--role-mid', t: 'color', v: '#5dade2' }, { k: '--role-adc', t: 'color', v: '#ff5470' },
      { k: '--role-support', t: 'color', v: '#c88bff' },
      { g: 'Статусы' },
      { k: '--status-online', t: 'color', v: '#4ade80' }, { k: '--status-ingame', t: 'color', v: '#5dade2' },
      { k: '--status-away', t: 'color', v: '#ffb454' }, { k: '--status-offline', t: 'color', v: '#8b8ba0' },
      { g: 'Золото + база' },
      { k: '--gold', t: 'color', v: '#C89B3C' },
      { k: '--gold-glow', t: 'derived', from: '--gold', mode: 'alpha', a: .45 },
      { k: '--bg-page', t: 'color', v: '#05090d' },
      { k: '--scrim-bg', t: 'raw', v: 'rgba(2,9,15,.72)' }
    ] },
    { id: 'glass', n: 6, t: 'СТЕКЛО', toks: [
      { k: '--glass-tint', t: 'raw', v: '255, 255, 255' },
      { k: '--glass-op', t: 'num', v: .06, min: 0, max: .3, s: .01 },
      { k: '--glass-blur', t: 'px', v: 12, min: 0, max: 30, s: .5, note: 'сила размытия' },
      { k: '--glass-sat', t: 'num', v: 1.55, min: 1, max: 3, s: .05 },
      { k: '--glass-dark', t: 'num', v: .58, min: 0, max: .9, s: .01, note: 'тёмность' },
      { k: '--glass-dark-strong', t: 'num', v: .66, min: 0, max: .95, s: .01, note: '2-й уровень' },
      { k: '--glass-bd-c', t: 'raw', v: 'var(--sel-12)' },
      { k: '--grain', t: 'num', v: 0, min: 0, max: 1, s: .05 },
      { k: '--sh-k', t: 'num', v: 1, min: 0, max: 2, s: .05 },
      { k: '--bg-blur', t: 'px', v: 0, min: 0, max: 24, s: 1 },
      { g: 'Тонировка (работает только при стиле «Тонировка»)' },
      { k: '--tint-c', t: 'color', v: '#24292f', tint: true },
      { k: '--tint-rgb', t: 'derived', from: '--tint-c', mode: 'rgb' },
      { k: '--tint-op', t: 'num', v: .58, min: .1, max: .95, s: .01, note: 'прозрачность' },
      { k: '--tint-sat', t: 'num', v: 1.35, min: .6, max: 2.5, s: .05, note: 'насыщенность' },
      { k: '--tint-blur', t: 'px', v: 3, min: 0, max: 10, s: .5 }
    ] },
    { id: 'shadows', n: 7, t: 'ТЕНИ', toks: [
      { k: '--sh-sm', t: 'raw', v: '0 2px 8px rgba(0,0,0,.3)' },
      { k: '--sh-md', t: 'raw', v: '0 8px 24px rgba(0,0,0,.4)' },
      { k: '--sh-lg', t: 'raw', v: '0 16px 48px rgba(0,0,0,.5)' },
      { k: '--sh-lift', t: 'raw', v: '0 12px 32px rgba(0,0,0,.45), 0 0 0 1px var(--sel-12)' },
      { k: '--sh-glow', t: 'raw', v: '0 0 24px var(--accent-glow)' },
      { k: '--sh-inset', t: 'raw', v: 'inset 0 1px 0 rgba(255,255,255,.08)' }
    ] },
    { id: 'zindex', n: 8, t: 'Z-СЛОИ', toks: [
      { k: '--z-base', t: 'int', v: 0, min: -1, max: 100, s: 1 },
      { k: '--z-raised', t: 'int', v: 1, min: 0, max: 100, s: 1 },
      { k: '--z-rail', t: 'int', v: 10, min: 0, max: 100, s: 1 },
      { k: '--z-sticky', t: 'int', v: 20, min: 0, max: 100, s: 1 },
      { k: '--z-dropdown', t: 'int', v: 30, min: 0, max: 100, s: 1 },
      { k: '--z-scrim', t: 'int', v: 40, min: 0, max: 100, s: 1 },
      { k: '--z-modal', t: 'int', v: 50, min: 0, max: 100, s: 1 },
      { k: '--z-overlay-modal', t: 'int', v: 60, min: 0, max: 100, s: 1 },
      { k: '--z-toast', t: 'int', v: 70, min: 0, max: 100, s: 1 },
      { k: '--z-tooltip', t: 'int', v: 80, min: 0, max: 100, s: 1 },
      { k: '--z-devstrip', t: 'int', v: 90, min: 0, max: 100, s: 1 }
    ] },
    { id: 'motion', n: 9, t: 'ДВИЖЕНИЕ', toks: [
      { k: '--dur-fast', t: 'ms', v: 130, min: 40, max: 500, s: 5 },
      { k: '--dur-base', t: 'ms', v: 200, min: 60, max: 700, s: 5 },
      { k: '--dur-slow', t: 'ms', v: 280, min: 100, max: 900, s: 5 },
      { k: '--dur-slower', t: 'ms', v: 500, min: 200, max: 1400, s: 10 },
      { k: '--stagger', t: 'ms', v: 45, min: 0, max: 200, s: 5 },
      { k: '--ease-out-expo', t: 'raw', v: 'cubic-bezier(.16, 1, .3, 1)' },
      { k: '--ease-standard', t: 'raw', v: 'cubic-bezier(.4, 0, .2, 1)' },
      { k: '--ease-overshoot', t: 'raw', v: 'cubic-bezier(.34, 1.56, .64, 1)' }
    ] },
    { id: 'icons', n: 10, t: 'ИКОНКИ', toks: [
      { k: '--ic-xs', t: 'px', v: 14, min: 8, max: 30, s: 1 },
      { k: '--ic-sm', t: 'px', v: 16, min: 10, max: 36, s: 1 },
      { k: '--ic-md', t: 'px', v: 20, min: 12, max: 44, s: 1 },
      { k: '--ic-lg', t: 'px', v: 24, min: 14, max: 54, s: 1 },
      { k: '--ic-xl', t: 'px', v: 44, min: 24, max: 90, s: 1 },
      { k: '--ava-sm', t: 'px', v: 30, min: 18, max: 60, s: 1 },
      { k: '--ava-md', t: 'px', v: 54, min: 30, max: 110, s: 1 },
      { k: '--ava-lg', t: 'px', v: 88, min: 48, max: 170, s: 1 }
    ] }
  ];
  var ALIASES = [
    { k: '--ds-r', v: 'var(--r-lg)' },
    { k: '--anim-dur', v: 'var(--dur-base)' },
    { k: '--anim-ease', v: 'var(--ease-standard)' }
  ];

  var DEFS = {}, ORDER = [], TOTAL = 0;
  GROUPS.forEach(function (g) {
    g.toks.forEach(function (d) { if (d.g) return; DEFS[d.k] = d; ORDER.push(d.k); TOTAL++; });
  });

  /* ════════════════════════════════════════════════════════════
     ШАГИ МАСТЕРА. Один экран = один выбор из 3 крупных пресетов.
     `adv` — какие группы токенов открываются под «Тонкая настройка».
     ════════════════════════════════════════════════════════════ */
  var STEPS = [
    {
      id: 'spacing', title: 'Отступы',
      sub: 'Сколько воздуха между блоками. Это главное, что задаёт ощущение «плотный справочник» или «просторный сайт». Тыкни вариант — превью справа раздвинется или сожмётся.',
      adv: ['spacing'], focus: 'ruler',
      presets: [
        { id: 'tight', t: 'Плотно', w: 'Максимум данных на экран. Строки таблицы ближе, панели компактнее — видно больше чемпионов без прокрутки.',
          v: { '--sp-px': 1, '--sp-0': 2, '--sp-1': 3, '--sp-2': 4, '--sp-3': 6, '--sp-4': 8, '--sp-5': 10, '--sp-6': 14, '--sp-7': 20, '--sp-8': 28, '--sp-9': 40 } },
        { id: 'canon', t: 'Средне', w: 'Текущий канон: база 4px. Золотая середина — плотно, но не тесно.', canon: true,
          v: { '--sp-px': 1, '--sp-0': 2, '--sp-1': 4, '--sp-2': 6, '--sp-3': 8, '--sp-4': 12, '--sp-5': 16, '--sp-6': 24, '--sp-7': 32, '--sp-8': 48, '--sp-9': 64 } },
        { id: 'roomy', t: 'Просторно', w: 'Блоки дышат, глаз отдыхает. Данных на экране меньше, зато читать спокойнее.',
          v: { '--sp-px': 1, '--sp-0': 2, '--sp-1': 6, '--sp-2': 10, '--sp-3': 14, '--sp-4': 20, '--sp-5': 26, '--sp-6': 38, '--sp-7': 52, '--sp-8': 72, '--sp-9': 96 } }
      ]
    },
    {
      id: 'type', title: 'Шрифты',
      sub: 'Размер всего текста сайта разом. Смотри на таблицу и на большие числа винрейта в превью.',
      adv: ['type'], focus: 'tscale',
      presets: [
        { id: 'compact', t: 'Мелкий', w: 'Больше строк влезает. Хорошо для широких таблиц, но с дивана читать тяжелее.',
          v: { '--fs-2xs': 9, '--fs-xs': 10, '--fs-sm': 11, '--fs-base': 11.5, '--fs-md': 12.5, '--fs-lg': 13, '--fs-xl': 14.5, '--fs-2xl': 17, '--fs-3xl': 20, '--fs-4xl': 23, '--fs-5xl': 29 } },
        { id: 'canon', t: 'Средний', w: 'Текущий канон: база 13px. Стандарт стат-сайтов.', canon: true,
          v: { '--fs-2xs': 10, '--fs-xs': 11, '--fs-sm': 12, '--fs-base': 13, '--fs-md': 14, '--fs-lg': 15, '--fs-xl': 17, '--fs-2xl': 20, '--fs-3xl': 24, '--fs-4xl': 28, '--fs-5xl': 36 } },
        { id: 'large', t: 'Крупный', w: 'Читается с откинутой спины, цифры видно сразу. Строк на экране меньше.',
          v: { '--fs-2xs': 12, '--fs-xs': 13, '--fs-sm': 15, '--fs-base': 16, '--fs-md': 18, '--fs-lg': 19, '--fs-xl': 22, '--fs-2xl': 26, '--fs-3xl': 31, '--fs-4xl': 37, '--fs-5xl': 47 } }
      ]
    },
    {
      id: 'radii', title: 'Скругления',
      sub: 'Насколько круглые углы у панелей, кнопок и карточек. Задаёт характер: строгий прибор или мягкий iOS.',
      adv: ['radii'], focus: 'rshapes',
      presets: [
        { id: 'sharp', t: 'Острые', w: 'Строгий «приборный» вид, углы почти прямые. Данные выглядят серьёзнее.',
          v: { '--r-xs': 2, '--r-sm': 3, '--r-md': 4, '--r-lg': 6, '--r-xl': 8, '--r-2xl': 10 } },
        { id: 'canon', t: 'Мягкие', w: 'Текущий канон: панель 15px. Сглажено, но не «пузырь».', canon: true,
          v: { '--r-xs': 6, '--r-sm': 8, '--r-md': 11, '--r-lg': 15, '--r-xl': 20, '--r-2xl': 24 } },
        { id: 'soft', t: 'Очень мягкие', w: 'Как стекло в iOS — всё обтекаемое, дружелюбное.',
          v: { '--r-xs': 12, '--r-sm': 16, '--r-md': 22, '--r-lg': 28, '--r-xl': 34, '--r-2xl': 42 } }
      ]
    },
    {
      id: 'glass', title: 'Стекло',
      sub: 'Материал всего сайта. Смотри на вложенную панель внизу превью — именно на ней видна разница между вариантами.',
      adv: ['glass', 'shadows'], focus: null, kind: 'gstyle',
      presets: [
        { id: 'matte', t: 'Матовое', w: 'Классика: тёмный слой + размытие. Вложенные блоки становятся СВЕТЛЕЕ (белым).',
          set: { gstyle: 'matte' } },
        { id: 'dark', t: 'Вложенное темнее', w: 'То же стекло, но вложенный блок ТЕМНЕЕ, а не светлее. Глубина читается лучше.', canon: true,
          set: { gstyle: 'dark' } },
        { id: 'tint', t: 'Тонировка', w: 'Как плёнка на авто-стекле: цветной прозрачный слой, размытие слабое, арт видно сквозь.',
          set: { gstyle: 'tint' } }
      ]
    },
    {
      id: 'accent', title: 'Акцент',
      sub: 'Акцент = БЕЛЫЙ. Решено окончательно 2026-08-07 — циан и золото удалены из кода, ' +
           'документов и памяти (циан стоял раньше только потому, что белого не было в списке). ' +
           'Цвет на сайте несут ТОЛЬКО данные: WR зелёный/красный, тиры, урон, статы, роли, валюта.',
      adv: [], focus: null, kind: 'accent',
      presets: [
        { id: 'white', t: 'Белый', w: 'Единственный вариант, выбора больше нет. Активная кнопка = белая заливка с тёмным текстом, важные числа белые, свечение белое.', canon: true,
          v: { '--accent': '#ffffff' } }
      ]
    },
    {
      id: 'tiers', title: 'Тиры',
      sub: 'Цветовая лестница S+ → D. Смотри на бейджи в колонке «Тир» и на превью рампы в каждом варианте.',
      adv: [], focus: null, kind: 'tiers',
      presets: [
        { id: 'A', t: 'Красный → холодный', w: 'S+ и S красные (опасно), середина янтарь-жёлтая, низ зелёно-синий.', canon: true,
          v: { '--tier-s-plus': '#ff3a3a', '--tier-s': '#ff5470', '--tier-a': '#ffb454', '--tier-b': '#ffd700', '--tier-c': '#4ade80', '--tier-d': '#7aa2c4' } },
        { id: 'B', t: 'Классика стат-сайтов', w: 'Как на op.gg: красный → оранж → жёлтый → зелёный → синий → серый.',
          v: { '--tier-s-plus': '#ff4e50', '--tier-s': '#ff8c42', '--tier-a': '#ffd700', '--tier-b': '#4ade80', '--tier-c': '#5dade2', '--tier-d': '#8b8ba0' } },
        { id: 'C', t: 'Золото сверху', w: 'S+ золотой как в игре, дальше по убыванию к серому. Спокойнее для глаз.',
          v: { '--tier-s-plus': '#C89B3C', '--tier-s': '#e3c06a', '--tier-a': '#ffffff', '--tier-b': '#cfe4f0', '--tier-c': '#7aa2c4', '--tier-d': '#8b8ba0' } }
      ]
    },
    {
      id: 'widths', title: 'Ширина контента',
      sub: 'Предел, шире которого контент не растягивается. Это лекарство от «одинокая кнопка на весь монитор» — пустые бока по краям НОРМА.',
      adv: ['widths'], focus: 'wdemo',
      presets: [
        { id: 'narrow', t: 'Узко · 1100', w: 'Колонка компактная, читать легко, но широкая таблица зажимается.',
          v: { '--content-max': 1100 } },
        { id: 'canon', t: 'Канон · 1400', w: 'Текущий выбор. Таблица на 1050 влезает свободно, на 2560 бока по 500px.', canon: true,
          v: { '--content-max': 1400 } },
        { id: 'wide', t: 'Широко · 1700', w: 'Больше места под таблицы и 2 колонки. На ноутбуке разницы не будет.',
          v: { '--content-max': 1700 } }
      ]
    },
    {
      id: 'motion', title: 'Движение',
      sub: 'Скорость всех переходов сайта. Нажми «Проиграть» в превью, чтобы почувствовать разницу.',
      adv: ['motion'], focus: 'mover',
      presets: [
        { id: 'snappy', t: 'Резко', w: 'Почти мгновенно. Сайт ощущается быстрым, но движение можно не заметить.',
          v: { '--dur-fast': 90, '--dur-base': 130, '--dur-slow': 180, '--dur-slower': 320, '--stagger': 25 } },
        { id: 'canon', t: 'Средне', w: 'Текущий канон 130/200/280ms — уровень Linear/Vercel.', canon: true,
          v: { '--dur-fast': 130, '--dur-base': 200, '--dur-slow': 280, '--dur-slower': 500, '--stagger': 45 } },
        { id: 'smooth', t: 'Плавно', w: 'Мягкие долгие переходы. Красиво, но на кликах может ощущаться «залипание».',
          v: { '--dur-fast': 190, '--dur-base': 300, '--dur-slow': 420, '--dur-slower': 700, '--stagger': 70 } }
      ]
    },
    {
      id: 'icons', title: 'Иконки и аватарки',
      sub: 'Размер значков в кнопках, иконок чемпионов в таблице и портретов в карточках.',
      adv: ['icons', 'zindex'], focus: 'icrow',
      presets: [
        { id: 'small', t: 'Мельче', w: 'Значки скромнее, текст доминирует. Строка таблицы ниже.',
          v: { '--ic-xs': 12, '--ic-sm': 14, '--ic-md': 17, '--ic-lg': 20, '--ic-xl': 36, '--ava-sm': 26, '--ava-md': 44, '--ava-lg': 72 } },
        { id: 'canon', t: 'Средне', w: 'Иконка чемпа 24px, портрет карточки 54px.',
          v: { '--ic-xs': 14, '--ic-sm': 16, '--ic-md': 20, '--ic-lg': 24, '--ic-xl': 44, '--ava-sm': 30, '--ava-md': 54, '--ava-lg': 88 } },
        { id: 'big', t: 'Крупнее', w: 'Текущий канон: портреты заметные, узнаются мгновенно. Строки выше.', canon: true,
          v: { '--ic-xs': 17, '--ic-sm': 20, '--ic-md': 25, '--ic-lg': 32, '--ic-xl': 56, '--ava-sm': 38, '--ava-md': 70, '--ava-lg': 112 } }
      ]
    },
    { id: 'final', title: 'Готово', sub: 'Проверь выбор и забирай файл.', final: true, adv: ['colors'] }
  ];

  /* ── состояние ── */
  var DEFAULTS = { v: {}, pick: {}, gstyle: 'dark', splash: 'lux', adv: {} };
  ORDER.forEach(function (k) { if (DEFS[k].t !== 'derived') DEFAULTS.v[k] = DEFS[k].v; });
  STEPS.forEach(function (s) {
    if (s.final) return;
    var c = (s.presets || []).filter(function (p) { return p.canon; })[0];
    DEFAULTS.pick[s.id] = c ? c.id : s.presets[0].id;
  });
  var S = JSON.parse(JSON.stringify(DEFAULTS));
  var step = 0;

  /* ── значение → CSS ── */
  function hexRGB(h) {
    h = String(h).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function cssOf(k) {
    var d = DEFS[k], v = S.v[k];
    switch (d.t) {
      case 'px': return v + 'px';
      case 'ms': return v + 'ms';
      case 'num': case 'int': return String(v);
      case 'wa': return 'rgba(255, 255, 255, ' + v + ')';
      case 'derived': {
        var rgb = hexRGB(S.v[d.from]);
        return d.mode === 'rgb' ? rgb.join(', ') : 'rgba(' + rgb.join(', ') + ', ' + d.a + ')';
      }
      default: return String(v);
    }
  }
  function applyTok(k) { root.style.setProperty(k, cssOf(k)); }
  function applyAll() {
    ORDER.forEach(applyTok);
    ALIASES.forEach(function (a) { root.style.setProperty(a.k, a.v); });
    root.setAttribute('data-gstyle', S.gstyle);
  }
  function setVal(k, v) {
    S.v[k] = v; applyTok(k);
    if (DEFS[k].accent) ['--accent-rgb', '--accent-glow', '--accent-dim'].forEach(applyTok);
    if (DEFS[k].tint) applyTok('--tint-rgb');
    if (k === '--gold') applyTok('--gold-glow');
    syncRow(k); updateWidthRead();
  }
  function syncRow(k) {
    var row = document.querySelector('[data-tok="' + k + '"]');
    if (!row) return;
    var o = $('.tok-val', row); if (o) o.textContent = cssOf(k);
    var sw = $('.tok-swatch', row);
    if (sw) sw.style.background = DEFS[k].mode === 'rgb' ? S.v[DEFS[k].from] : cssOf(k);
    var r = $('input[type="range"]', row); if (r && +r.value !== +S.v[k]) r.value = S.v[k];
    var c = $('input[type="color"]', row); if (c && c.value !== S.v[k]) c.value = S.v[k];
    var t = $('input[type="text"]', row); if (t && t.value !== S.v[k]) t.value = S.v[k];
  }

  /* ════════════════════════════════════════════════════════════
     БОЛЬШОЕ ПРЕВЬЮ — строится ОДИН раз, дальше только токены
     ════════════════════════════════════════════════════════════ */
  var ROWS = [
    { n: 'Garen', ru: 'Гарен', r: 'Соло', wr: 52.4, d: 1.2, tier: 1 },
    { n: 'Jinx', ru: 'Джинкс', r: 'Стрелок', wr: 51.1, d: 0.6, tier: 2 },
    { n: 'Lux', ru: 'Люкс', r: 'Мид', wr: 49.8, d: -0.3, tier: 3 },
    { n: 'Ahri', ru: 'Ари', r: 'Мид', wr: 48.2, d: -1.1, tier: 4 }
  ];
  var TK = ['--tier-s-plus', '--tier-s', '--tier-a', '--tier-b', '--tier-c', '--tier-d'];
  var TL = ['S+', 'S', 'A', 'B', 'C', 'D'];

  function stageHTML() {
    var rows = ROWS.map(function (c) {
      return '<tr><td><div class="who"><img src="' + CDN + c.n + '.png" alt=""><span>' + c.ru + '</span></div></td>' +
        '<td><span class="tier" style="background:var(' + TK[c.tier] + ')">' + TL[c.tier] + '</span></td>' +
        '<td class="num">' + c.wr.toFixed(1) + '%</td>' +
        '<td class="num ' + (c.d > 0 ? 'up' : 'dn') + '">' + (c.d > 0 ? '+' : '') + c.d.toFixed(1) + '</td></tr>';
    }).join('');
    return '<div class="st-head">' +
        '<div><div class="st-h1">Статы чемпионов</div><div class="st-sub">Патч 7.0f · Diamond+ · демо-данные</div></div>' +
        '<div class="st-actions"><button class="btn">Сравнить</button>' +
        '<button class="btn btn--primary">' + I.check + 'Применить</button></div>' +
      '</div>' +
      '<div class="st-cols">' +
        '<div><table class="tbl"><thead><tr><th>Чемпион</th><th>Тир</th><th class="num">WR</th><th class="num">Δ</th></tr></thead>' +
          '<tbody>' + rows + '</tbody></table>' +
          '<div class="chips">' +
            '<span class="chip on"><i style="background:var(--role-top)"></i>Соло</span>' +
            '<span class="chip"><i style="background:var(--role-jungle)"></i>Лес</span>' +
            '<span class="chip"><i style="background:var(--role-mid)"></i>Мид</span>' +
            '<span class="chip"><i style="background:var(--role-adc)"></i>Стрелок</span>' +
          '</div></div>' +
        '<div><div class="card"><div class="card-top">' +
            '<img class="card-ava" src="' + CDN + 'Garen.png" alt="">' +
            '<div><div class="card-name">Гарен</div><div class="card-role">Соло · Боец</div></div></div>' +
          '<div class="card-kpi"><div>Винрейт<b style="color:var(--data-good)">52.4%</b></div>' +
            '<div>Пик<b>8.1%</b></div></div>' +
          '<div class="bar"><span>Сила ат.</span><i style="background:var(--stat-ad);width:60%"></i><b>78</b></div>' +
          '<div class="bar"><span>Броня</span><i style="background:var(--stat-armor);width:42%"></i><b>54</b></div>' +
          '<div class="bar"><span>Здоровье</span><i style="background:var(--stat-hp);width:80%"></i><b>1240</b></div>' +
        '</div></div>' +
      '</div>' +
      '<div class="st-panel"><h4>Вложенная панель — на ней видно уровень стекла</h4>' +
        '<p>Урон умения Q: 200 = <b style="color:var(--dmg-phys)">130 база</b> + <b style="color:var(--stat-ap)">70 от Силы умений</b>. ' +
        'Пересчитывается от текущей сборки.</p></div>';
  }

  /* фокус-блоки: строятся ВСЕ сразу, переключаются hidden → 0 пересозданий */
  function focusHTML() {
    var sp = ['--sp-1', '--sp-2', '--sp-3', '--sp-4', '--sp-5', '--sp-6', '--sp-7', '--sp-8', '--sp-9']
      .map(function (k) { return '<div><i style="width:var(' + k + ')"></i><span>' + k.replace('--sp-', '') + '</span></div>'; }).join('');
    var ts = ['2xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '5xl']
      .map(function (n) { return '<div><b>' + n + '</b><span style="font-size:var(--fs-' + n + ')">Гарен · 52.4% винрейт</span></div>'; }).join('');
    var rs = ['xs', 'sm', 'md', 'lg', 'xl', '2xl']
      .map(function (n) { return '<i style="border-radius:var(--r-' + n + ')">' + n + '</i>'; }).join('');
    var ir = ['sm', 'md', 'lg', 'xl'].map(function (n) {
      return '<figure><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" style="width:var(--ic-' + n + ');height:var(--ic-' + n + ')"><path d="m12 3 2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-2.9L6.7 19.6l1.1-6L3.4 9.4l6-.8L12 3Z"/></svg><figcaption>ic-' + n + '</figcaption></figure>';
    }).join('') + ['sm', 'md', 'lg'].map(function (n) {
      return '<figure><img src="' + CDN + 'Ahri.png" alt="" style="width:var(--ava-' + n + ');height:var(--ava-' + n + ')"><figcaption>ava-' + n + '</figcaption></figure>';
    }).join('');

    return '<div class="focus" data-focus="ruler" hidden><div class="focus-h">Шкала отступов в реальном масштабе</div><div class="ruler">' + sp + '</div></div>' +
      '<div class="focus" data-focus="tscale" hidden><div class="focus-h">Шкала размеров текста</div><div class="tscale">' + ts + '</div></div>' +
      '<div class="focus" data-focus="rshapes" hidden><div class="focus-h">Все скругления</div><div class="rshapes">' + rs + '</div></div>' +
      '<div class="focus" data-focus="icrow" hidden><div class="focus-h">Значки и портреты</div><div class="icrow">' + ir + '</div></div>' +
      '<div class="focus" data-focus="mover" hidden><div class="focus-h">Проверка скорости — нажми кнопку</div>' +
        '<button class="btn" id="playBtn" style="margin-bottom:var(--sp-4)">Проиграть переход</button>' +
        '<div class="mover" id="mover"><i></i></div></div>' +
      '<div class="focus" data-focus="wdemo" hidden><div class="focus-h">Кнопка честно объявлена width:100% — её держит только предел</div>' +
        '<div class="wd-side"><div class="wd-wrap" id="wdWrap"><button class="wd-btn" id="wdBtn">Одинокая кнопка на всю ширину</button></div></div>' +
        '<div class="wd-read" id="wdRead"></div></div>';
  }

  function updateWidthRead() {
    var w = document.getElementById('wdBtn'), host = $('.wd-side');
    if (!w || !host || host.offsetParent === null) return;
    var bw = Math.round(w.getBoundingClientRect().width);
    var av = Math.round(host.clientWidth);
    document.getElementById('wdRead').innerHTML =
      'предел <b>' + S.v['--content-max'] + 'px</b> · кнопка <b>' + bw + 'px</b> · доступно <b>' + av +
      'px</b> · пустые бока <b>' + Math.max(0, av - bw - 2 * parseFloat(getComputedStyle($('.wd-wrap')).paddingLeft)) + 'px</b> = норма';
  }

  /* ════════════════════════════════════════════════════════════
     РЕНДЕР ШАГА
     ════════════════════════════════════════════════════════════ */
  function presetExtra(st, p) {
    if (st.kind === 'tiers') {
      return '<div class="ramp">' + TK.map(function (k, i) {
        return '<i style="background:' + p.v[k] + '">' + TL[i] + '</i>';
      }).join('') + '</div>';
    }
    if (st.kind === 'accent') {
      return '<div class="asample"><i style="background:' + p.v['--accent'] + '"></i>' +
        '<b style="color:' + p.v['--accent'] + '">52.4%</b>' +
        '<span style="font-size:12px;color:var(--txt-faint)">' + p.v['--accent'] + '</span></div>';
    }
    if (st.kind === 'gstyle') {
      return '<div class="gsample glass" data-gstyle="' + p.set.gstyle + '">поверхность' +
        '<div class="inner">вложенный блок</div></div>';
    }
    if (p.v) {
      var keys = Object.keys(p.v).filter(function (k) { return DEFS[k] && (DEFS[k].t === 'px' || DEFS[k].t === 'ms'); });
      if (!keys.length) return '';
      var pick = keys.slice(0, 4).map(function (k) { return k.replace(/^--/, '') + ' ' + p.v[k]; });
      return '<span class="pset-hint">' + pick.join(' · ') + '</span>';
    }
    return '';
  }

  function render() {
    var st = STEPS[step];
    /* шапка */
    $('.wiz-step').textContent = 'Шаг ' + (step + 1) + ' из ' + STEPS.length;
    $('.wiz-title').textContent = st.title;
    $('.wiz-sub').textContent = st.sub;
    $('#btnPrev').disabled = step === 0;
    var next = $('#btnNext');
    next.hidden = step === STEPS.length - 1;
    document.querySelectorAll('.wiz-dots i').forEach(function (d, i) {
      d.classList.toggle('now', i === step);
      d.classList.toggle('done', i < step);
    });

    /* левая колонка */
    var left = $('#wizLeft');
    if (st.final) {
      left.innerHTML = finalHTML();
      wireFinal(left);
    } else {
      left.innerHTML = '<div class="psets">' + st.presets.map(function (p) {
        return '<button class="pset' + (S.pick[st.id] === p.id ? ' on' : '') + '" data-p="' + p.id + '">' +
          '<span class="pset-t">' + p.t + (p.canon ? ' <span style="font-size:12px;color:var(--txt-faint);font-weight:400">сейчас</span>' : '') +
          '<span class="tick">' + I.check + '</span></span>' +
          '<span class="pset-w">' + p.w + '</span>' + presetExtra(st, p) + '</button>';
      }).join('') + '</div>';
      wirePresets(left, st);
    }
    /* «Тонкая настройка» */
    if (st.adv && st.adv.length) {
      var cnt = 0;
      st.adv.forEach(function (gid) {
        GROUPS.forEach(function (g) { if (g.id === gid) cnt += g.toks.filter(function (d) { return !d.g; }).length; });
      });
      var open = !!S.adv[st.id];
      left.insertAdjacentHTML('beforeend',
        '<button class="adv-btn' + (open ? ' open' : '') + '" id="advBtn">Тонкая настройка числами' +
        ' <span style="opacity:.6">(' + cnt + ')</span><span class="caret">▾</span></button>' +
        '<div class="adv" id="advBox"' + (open ? '' : ' hidden') + '>' + advHTML(st) + '</div>');
      wireAdv(left, st);
    }

    /* фокус-блок: показываем нужный, остальные прячем (не пересоздаём) */
    document.querySelectorAll('.focus').forEach(function (f) {
      f.hidden = f.getAttribute('data-focus') !== st.focus;
    });
    $('.pv-cap').innerHTML = 'Живой предпросмотр · <b>' + st.title.toLowerCase() + ' меняется прямо тут</b>';
    if (st.focus === 'wdemo') requestAnimationFrame(updateWidthRead);
  }

  function advHTML(st) {
    var out = '';
    st.adv.forEach(function (gid) {
      GROUPS.forEach(function (g) {
        if (g.id !== gid) return;
        out += '<div class="tok-note" style="margin:8px 0 4px;font-size:11px;color:var(--txt-dim)">' + g.n + ' · ' + g.t + '</div>';
        out += g.toks.map(tokHTML).join('');
      });
    });
    return out;
  }
  function tokHTML(d) {
    if (d.g) return '<div class="tok-note" style="margin:10px 0 2px">' + d.g + '</div>';
    var v = S.v[d.k], ctl = '';
    switch (d.t) {
      case 'px': case 'ms': case 'num': case 'int':
        ctl = '<input type="range" min="' + d.min + '" max="' + d.max + '" step="' + d.s + '" value="' + v + '">'; break;
      case 'wa':
        ctl = '<input type="range" min="0" max="1" step="0.01" value="' + v + '"><i class="tok-swatch"></i>'; break;
      case 'color':
        ctl = '<input type="color" value="' + v + '"><input type="text" value="' + v + '">'; break;
      case 'raw':
        ctl = '<input type="text" value="' + String(v).replace(/"/g, '&quot;') + '">'; break;
      case 'derived':
        ctl = '<i class="tok-swatch"></i><span class="tok-note" style="grid-column:auto">считается автоматически</span>'; break;
    }
    return '<div class="tok" data-tok="' + d.k + '"><span class="tok-name">' + d.k + '</span>' +
      '<span class="tok-val">' + cssOf(d.k) + '</span><div class="tok-ctl">' + ctl + '</div>' +
      (d.note ? '<div class="tok-note">' + d.note + '</div>' : '') + '</div>';
  }

  function wirePresets(host, st) {
    host.querySelectorAll('[data-p]').forEach(function (b) {
      b.onclick = function () {
        var p = st.presets.filter(function (x) { return x.id === b.getAttribute('data-p'); })[0];
        S.pick[st.id] = p.id;
        if (p.v) Object.keys(p.v).forEach(function (k) { setVal(k, p.v[k]); });
        if (p.set && p.set.gstyle) { S.gstyle = p.set.gstyle; root.setAttribute('data-gstyle', S.gstyle); }
        host.querySelectorAll('[data-p]').forEach(function (x) { x.classList.toggle('on', x === b); });
        if (st.focus === 'wdemo') requestAnimationFrame(updateWidthRead);
      };
    });
  }
  function wireAdv(host, st) {
    var btn = $('#advBtn', host), box = $('#advBox', host);
    btn.onclick = function () {
      S.adv[st.id] = !S.adv[st.id];
      btn.classList.toggle('open', S.adv[st.id]); box.hidden = !S.adv[st.id];
    };
    box.querySelectorAll('.tok').forEach(function (row) {
      var k = row.getAttribute('data-tok'), d = DEFS[k];
      var r = $('input[type="range"]', row), col = $('input[type="color"]', row), tx = $('input[type="text"]', row);
      if (r) r.oninput = function () { setVal(k, d.t === 'int' ? parseInt(r.value, 10) : parseFloat(r.value)); };
      if (col) col.oninput = function () { if (tx) tx.value = col.value; setVal(k, col.value); };
      if (tx) tx.oninput = function () {
        if (d.t === 'color' && !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(tx.value)) return;
        if (col) col.value = tx.value; setVal(k, tx.value);
      };
      if (d.t === 'derived' || d.t === 'wa') syncRow(k);
    });
  }

  /* ── финальный шаг ── */
  function finalHTML() {
    var rows = STEPS.filter(function (s) { return !s.final; }).map(function (s, i) {
      var p = s.presets.filter(function (x) { return x.id === S.pick[s.id]; })[0];
      return '<div class="final-row"><span>' + s.title + '</span><b>' + p.t + '</b>' +
        '<span class="go" data-goto="' + i + '">изменить</span></div>';
    }).join('');
    return '<div class="final-list">' + rows + '</div>' +
      '<button class="wiz-btn wiz-btn--next" id="btnExport" style="width:100%;justify-content:center;padding:16px">' +
      'Экспорт canon-tokens.css</button>' +
      '<div class="tok-note" style="margin-top:10px">' + TOTAL + ' токенов · 10 категорий · файл заменит все дубли в лабах и боевом</div>';
  }
  function wireFinal(host) {
    host.querySelectorAll('[data-goto]').forEach(function (a) {
      a.onclick = function () { step = +a.getAttribute('data-goto'); render(); window.scrollTo(0, 0); };
    });
    $('#btnExport', host).onclick = openExport;
  }

  /* ════════════════════════════════════════════════════════════
     ЭКСПОРТ
     ════════════════════════════════════════════════════════════ */
  function exportCSS() {
    var d = new Date();
    var stamp = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    var o = [];
    o.push('/* ════════════════════════════════════════════════════════════════');
    o.push('   canon-tokens.css — ЕДИНЫЙ источник дизайн-токенов сайта');
    o.push('   Утверждён в мастере lab-tokens · ' + stamp);
    o.push('');
    o.push('   ВЫБОР ВЛАДЕЛЬЦА ПО ШАГАМ:');
    STEPS.filter(function (s) { return !s.final; }).forEach(function (s) {
      var p = s.presets.filter(function (x) { return x.id === S.pick[s.id]; })[0];
      o.push('   · ' + (s.title + ' ').padEnd(26, '.') + ' ' + p.t);
    });
    o.push('   ════════════════════════════════════════════════════════════════ */');
    o.push('');
    o.push(':root,');
    o.push('html[data-glass="on"] {');
    GROUPS.forEach(function (g) {
      o.push(''); o.push('  /* ── ' + g.n + ' · ' + g.t + ' ── */');
      g.toks.forEach(function (t) {
        if (t.g) { o.push('  /* ' + t.g + ' */'); return; }
        o.push('  ' + t.k + ': ' + cssOf(t.k) + ';' + (t.note ? ' /* ' + t.note + ' */' : ''));
      });
    });
    o.push('');
    o.push('  /* ── АЛИАСЫ МИГРАЦИИ ── */');
    ALIASES.forEach(function (a) { o.push('  ' + a.k + ': ' + a.v + ';'); });
    o.push('}');
    o.push('');
    var G = {
      matte: ['2, 9, 15', 'var(--glass-dark)', 'var(--glass-blur)', 'var(--glass-sat)', 'var(--sel-05)', 'var(--sel-09)'],
      dark: ['2, 9, 15', 'var(--glass-dark)', 'var(--glass-blur)', 'var(--glass-sat)', 'rgba(2, 9, 15, var(--glass-dark))', 'rgba(2, 9, 15, var(--glass-dark-strong))'],
      tint: ['var(--tint-rgb)', 'var(--tint-op)', 'var(--tint-blur)', 'var(--tint-sat)', 'rgba(var(--tint-rgb), .30)', 'rgba(var(--tint-rgb), .50)']
    }[S.gstyle];
    var gName = STEPS.filter(function (s) { return s.id === 'glass'; })[0]
      .presets.filter(function (p) { return p.id === S.gstyle; })[0].t;
    o.push('/* СТИЛЬ СТЕКЛА: ' + gName + ' */');
    o.push(':root {');
    o.push('  --g-rgb: ' + G[0] + ';');
    o.push('  --g-op: ' + G[1] + ';');
    o.push('  --g-blur: ' + G[2] + ';');
    o.push('  --g-sat: ' + G[3] + ';');
    o.push('  --g-inner: ' + G[4] + ';');
    o.push('  --g-inner-2: ' + G[5] + ';');
    o.push('}');
    o.push('.glass {');
    o.push('  background:');
    o.push('    linear-gradient(rgba(var(--g-rgb), var(--g-op)), rgba(var(--g-rgb), var(--g-op))),');
    o.push('    rgba(var(--glass-tint), var(--glass-op));');
    o.push('  -webkit-backdrop-filter: blur(var(--g-blur)) saturate(var(--g-sat));');
    o.push('  backdrop-filter: blur(var(--g-blur)) saturate(var(--g-sat));');
    o.push('  border: 1px solid var(--glass-bd-c);');
    o.push('  border-radius: var(--ds-r);');
    o.push('  box-shadow: var(--sh-inset), var(--sh-md);');
    o.push('}');
    o.push('.glass--strong { --g-op: var(--glass-dark-strong); }');
    o.push('');
    o.push('/* ★ Обёртка контента. max-width:none тут ЗАПРЕЩЁН — это и есть');
    o.push('   «одинокая кнопка на весь монитор». Пустые бока = НОРМА. */');
    o.push('.shell {');
    o.push('  box-sizing: border-box;');
    o.push('  width: 100%;');
    o.push('  max-width: var(--content-max);');
    o.push('  margin-inline: auto;');
    o.push('}');
    o.push('.shell--narrow { max-width: var(--content-max-narrow); }');
    o.push('');
    return o.join('\n');
  }

  function openExport() {
    var css = exportCSS();
    var ov = document.createElement('div');
    ov.className = 'ex-ov';
    ov.innerHTML = '<div class="ex-modal glass"><div class="ex-h"><b>canon-tokens.css</b>' +
      '<span class="tok-note">' + css.split('\n').length + ' строк</span>' +
      '<span class="sp"><button class="sbtn sbtn--pri" id="exDl">Скачать</button>' +
      '<button class="sbtn" id="exCopy">Скопировать</button>' +
      '<button class="sbtn" id="exClose">Закрыть</button></span></div>' +
      '<textarea class="ex-ta" spellcheck="false"></textarea></div>';
    document.body.appendChild(ov);
    var ta = $('.ex-ta', ov); ta.value = css;
    $('#exClose', ov).onclick = function () { ov.remove(); };
    ov.onclick = function (e) { if (e.target === ov) ov.remove(); };
    $('#exCopy', ov).onclick = function () {
      ta.select();
      if (navigator.clipboard) navigator.clipboard.writeText(css).then(function () { toast('Скопировано'); });
      else toast('Ctrl+C');
    };
    $('#exDl', ov).onclick = function () {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([css], { type: 'text/css' }));
      a.download = 'canon-tokens.css'; a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      toast('canon-tokens.css скачан');
    };
  }

  var _tt;
  function toast(m) {
    var el = $('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = m;
    requestAnimationFrame(function () { el.classList.add('show'); });
    clearTimeout(_tt); _tt = setTimeout(function () { el.classList.remove('show'); }, 2000);
  }

  /* ── счётчик пересозданных узлов (приёмка) ── */
  function nodeAudit() {
    var host = $('.wiz');
    var all = host.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) all[i].__keep = true;
    var before = all.length;
    var b = document.querySelector('.pset:not(.on)'); if (b) b.click();
    var now = host.querySelectorAll('*'), s = 0;
    for (var j = 0; j < now.length; j++) if (now[j].__keep) s++;
    var pv = $('.stage').querySelectorAll('*'), ps = 0;
    for (var q = 0; q < pv.length; q++) if (pv[q].__keep) ps++;
    var msg = 'Превью: ' + ps + '/' + pv.length + ' выжило · весь экран: ' + s + '/' + before;
    $('#nodeCount').textContent = msg; toast(msg);
  }

  /* ── арт ── */
  var DD = 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash';
  var ARTS = [
    { v: 'lux', k: 'Lux', t: 'Lux — светлый (худший случай)' },
    { v: 'soraka', k: 'Soraka', t: 'Soraka — светлый' },
    { v: 'thresh', k: 'Thresh', t: 'Thresh — тёмный' },
    { v: 'jinx', k: 'Jinx', t: 'Jinx — пёстрый' }
  ];
  function applySplash() {
    var a = ARTS.filter(function (x) { return x.v === S.splash; })[0] || ARTS[0];
    $('.splash').style.backgroundImage = "url('" + DD + '/' + a.k + "_0.jpg')";
    document.querySelectorAll('.art-thumb').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-v') === S.splash);
    });
  }

  function go(d) {
    step = Math.max(0, Math.min(STEPS.length - 1, step + d));
    render(); window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function init() {
    /* превью и фокус-блоки — ОДИН раз */
    $('#focusHost').innerHTML = focusHTML();
    $('#stageBody').innerHTML = stageHTML();
    $('.wiz-dots').innerHTML = STEPS.map(function (_, i) { return '<i data-s="' + i + '"></i>'; }).join('');
    $('.wiz-dots').onclick = function (e) {
      var d = e.target.closest('[data-s]'); if (d) { step = +d.getAttribute('data-s'); render(); }
    };
    $('#btnPrev').onclick = function () { go(-1); };
    $('#btnNext').onclick = function () { go(1); };

    /* мувер */
    var mv = $('#mover');
    $('#playBtn').onclick = function () {
      var i = $('i', mv);
      i.style.transition = 'transform var(--dur-slow) var(--ease-out-expo)';
      i.style.transform = 'translateX(' + (mv.clientWidth - 40) + 'px)';
      setTimeout(function () { i.style.transform = 'translateX(0)'; }, 700);
    };

    /* дев-полоса */
    var arts = $('#artRow');
    arts.innerHTML = ARTS.map(function (a) {
      return '<button class="art-thumb" data-v="' + a.v + '" title="' + a.t + '" style="background-image:url(\'' + DD + '/' + a.k + '_0.jpg\')"></button>';
    }).join('');
    arts.onclick = function (e) {
      var b = e.target.closest('[data-v]'); if (!b) return;
      S.splash = b.getAttribute('data-v'); applySplash();
    };
    $('#btnAudit').onclick = nodeAudit;
    $('#btnReset').onclick = function () {
      S = JSON.parse(JSON.stringify(DEFAULTS));
      applyAll(); applySplash(); render();
      if (window.__LS) window.__LS.clearSaved();
      toast('Сброшено к утверждённому канону');
    };
    var strip = $('#labStrip');
    $('#stripMin').onclick = function () {
      strip.classList.toggle('min');
      this.textContent = strip.classList.contains('min') ? 'Развернуть' : 'Свернуть';
    };
    var head = $('#stripHead'), drag = null;
    head.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return;
      var r = strip.getBoundingClientRect();
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      strip.style.left = r.left + 'px'; strip.style.top = r.top + 'px'; strip.style.right = 'auto';
      head.setPointerCapture(e.pointerId);
    });
    head.addEventListener('pointermove', function (e) {
      if (!drag) return;
      strip.style.left = Math.max(0, e.clientX - drag.dx) + 'px';
      strip.style.top = Math.max(0, e.clientY - drag.dy) + 'px';
    });
    head.addEventListener('pointerup', function () { drag = null; });

    window.addEventListener('resize', updateWidthRead);
    window.addEventListener('keydown', function (e) {
      if (e.target.matches('input, textarea')) return;
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    });

    applyAll(); applySplash(); render();

    if (window.LabSettings) {
      window.__LS = window.LabSettings.attach({
        id: 'tokens', schema: 2, mount: '#labTools',
        getState: function () { return S; },
        apply: function (stt) {
          S = Object.assign({}, DEFAULTS, stt);
          S.v = Object.assign({}, DEFAULTS.v, stt.v || {});
          S.pick = Object.assign({}, DEFAULTS.pick, stt.pick || {});
          S.adv = stt.adv || {};
          applyAll(); applySplash(); render();
        }
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
