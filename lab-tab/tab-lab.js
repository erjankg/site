'use strict';

/* ═══════════════════════════════════════════════════════════
   Tab-Lab · песочница анимаций вкладок
   Каждый вариант = ряд из 3 вкладок (как в модалке турниров) +
   панель контента снизу. Клик по вкладке двигает индикатор-ползунок
   и проигрывает переход контента. Кнопка «Скопировать CSS» отдаёт
   готовый код под боевые классы .cs-tabs / .cs-tab / .cs-ink.
   ═══════════════════════════════════════════════════════════ */

/* ── Вкладки и их контент (имитация модалки «Турниры») ── */
var TABS = [
  ['active',    'Активные'],
  ['upcoming',  'Предстоящие'],
  ['completed', 'Завершённые']
];

var CONTENT = {
  active: {
    title: '🟢 Идут сейчас',
    rows: ['LCK Spring · Gen.G — T1', 'LPL · BLG — JDG', 'Кубок СНГ · полуфинал']
  },
  upcoming: {
    title: '🔵 Скоро начнутся',
    rows: ['Worlds 2026 — через 3 дня', 'MSI отборочные — 12 июня', 'Showmatch — в субботу']
  },
  completed: {
    title: '⚪ Уже сыграны',
    rows: ['MSI 2025 — победил T1', 'Worlds 2025 — финал', 'Весенний сплит — итоги']
  }
};

/* ── Избранные комбо (во всю ширину, кандидаты на боевой) ── */
var FEATURED = [
  { id: 'combo-pro', featured: true, ink: true, content: 'slidedir',
    name: 'Магическая линия PRO', tag: 'кандидат',
    desc: 'Подчерк-ползунок плавно скользит между вкладками с лёгкой пружиной и мягким свечением, а контент уезжает в сторону движения. Самый «дорогой» вариант — то, что просится в боевую модалку.' },
  { id: 'combo-pill', featured: true, ink: true, content: 'zoom',
    name: 'Скользящая пилюля', tag: 'кандидат',
    desc: 'Капсула-подложка переезжает под активную вкладку, текст внутри светлеет, а контент приближается с лёгким зумом. Заметно и тактильно, как переключатели в дорогих приложениях.' }
];

/* ── 48 обычных вариантов ── */
var VARIANTS = [
  /* A · Линия снизу (чистый CSS, индикатор на ::after активной вкладки) */
  { id: 'line-center',   name: 'Линия из центра',         tag: 'текущая', content: 'fade',    desc: 'Полоска снизу растягивается из центра. Ровно то, что сейчас в модалке турниров.' },
  { id: 'line-left',     name: 'Линия слева-направо',                     content: 'fade',    desc: 'Подчерк раскрывается от левого края к правому. Чуть «техничнее» центрового.' },
  { id: 'line-grow',     name: 'Линия растёт в толщину',                  content: 'fade',    desc: 'Полоска появляется не в ширину, а в высоту — будто наливается снизу.' },
  { id: 'line-double',   name: 'Двойная линия',                          content: 'fade',    desc: 'Две тонкие полоски расходятся вверх и вниз от центра. Аккуратный акцент.' },
  { id: 'line-dashed',   name: 'Пунктир → сплошная',                     content: 'fade',    desc: 'Снизу пунктир, под активной он «сшивается» в сплошную линию.' },
  { id: 'line-gradient', name: 'Градиентная линия',                      content: 'fade',    desc: 'Подчерк — мягкий градиент акцента, тает к краям. Премиально и спокойно.' },
  { id: 'line-glow',     name: 'Неоновая линия',                         content: 'fade',    desc: 'Тонкая линия с неоновым свечением. Хорошо смотрится на тёмном фоне.' },
  { id: 'line-shimmer',  name: 'Линия с бликом',                         content: 'fade',    desc: 'По активному подчерку бесконечно пробегает световой блик. Живая деталь.' },
  { id: 'line-rounded',  name: 'Растущая пилюля-линия',                  content: 'fade',    desc: 'Скруглённая толстая полоска вырастает по ширине. Мягко и современно.' },
  { id: 'line-split',    name: 'Раскрытие из точки',                     content: 'fade',    desc: 'Из точки по центру линия раскрывается в обе стороны. Чёткий «щелчок» выбора.' },

  /* B · Подвижная «чернильная» линия (JS двигает один элемент .tl-ink) */
  { id: 'ink-slide',     name: 'Скользящая линия',        tag: 'JS', ink: true, content: 'slidedir', desc: 'Один подчерк физически едет от старой вкладки к новой. Классика «магической линии».' },
  { id: 'ink-spring',    name: 'Скользит с пружиной',     tag: 'JS', ink: true, content: 'slidedir', desc: 'То же скольжение, но линия чуть перелетает цель и возвращается. Игриво.' },
  { id: 'ink-stretch',   name: 'Растягивается в пути',    tag: 'JS', ink: true, content: 'slidedir', desc: 'Во время переезда линия вытягивается, перекрывая расстояние, и снова сжимается. Эффект «резинки».' },
  { id: 'ink-dot',       name: 'Скользящая точка',        tag: 'JS', ink: true, content: 'fade',     desc: 'Под активной вкладкой ездит маленькая светящаяся точка-маркер.' },
  { id: 'ink-arrow',     name: 'Скользящий уголок',       tag: 'JS', ink: true, content: 'slideup',  desc: 'Треугольник-указатель переезжает под активную вкладку, как стрелка-подсказка.' },
  { id: 'ink-double',    name: 'Две линии (верх+низ)',    tag: 'JS', ink: true, content: 'fade',     desc: 'Активную вкладку зажимают сверху и снизу две скользящие линии.' },
  { id: 'ink-tube',      name: 'Скользящая капсула',      tag: 'JS', ink: true, content: 'fade',     desc: 'Контур-капсула обводит активную вкладку и переезжает между ними.' },
  { id: 'ink-pill-spring', name: 'Пилюля с отскоком',     tag: 'JS', ink: true, content: 'zoom',     desc: 'Заливка-капсула переезжает под активную с упругим отскоком. Сочно.' },
  { id: 'ink-goo',       name: 'Жидкий индикатор',        tag: 'JS', ink: true, content: 'fade',     desc: 'Подложка перетекает между вкладками как капля ртути (SVG-фильтр «gooey»).' },

  /* C · Заливка / подложка активной вкладки */
  { id: 'fill-up',       name: 'Заливка снизу вверх',                     content: 'fade',    desc: 'Активная вкладка наливается цветом снизу вверх.' },
  { id: 'fill-pill',     name: 'Капсула на активной',                     content: 'fade',    desc: 'Под активной вкладкой проявляется скруглённая подложка. Чисто и понятно.' },
  { id: 'fill-soft',     name: 'Мягкая подложка',                         content: 'fade',    desc: 'Едва заметный тонированный фон под активной. Минималистично.' },
  { id: 'fill-gradient', name: 'Градиентная заливка',                     content: 'fade',    desc: 'Капсула с диагональным градиентом акцента. Богато.' },
  { id: 'fill-frost',    name: 'Матовое стекло',                          content: 'fade',    desc: 'Активная вкладка — будто кусочек матового стекла поверх фона.' },
  { id: 'fill-spotlight',name: 'Свет за текстом',                         content: 'fade',    desc: 'За текстом активной вкладки разгорается мягкое световое пятно.' },

  /* D · Геометрия и маркеры */
  { id: 'box-border',    name: 'Рамка вокруг активной',                   content: 'fade',    desc: 'Вокруг активной вкладки прорисовывается тонкая рамка.' },
  { id: 'corner-brackets', name: 'Уголки-скобки',                         content: 'fade',    desc: 'Активную вкладку отмечают четыре уголка по краям. Как прицел.' },
  { id: 'dot-under',     name: 'Точка снизу',                             content: 'fade',    desc: 'Под активной вкладкой загорается аккуратная точка. Минимум шума.' },
  { id: 'triangle',      name: 'Треугольник-указатель',                   content: 'slideup', desc: 'Снизу поднимается треугольник, указывающий на активную вкладку.' },
  { id: 'notch',         name: 'Вырез-язычок',                            content: 'fade',    desc: 'У активной вкладки снизу будто «вырезан» язычок-подсказка.' },
  { id: 'bracket-text',  name: 'Скобки [ текст ]',                        content: 'fade',    desc: 'Текст активной вкладки берётся в квадратные скобки, выезжающие по бокам.' },

  /* E · Свечение и неон */
  { id: 'glow-text',     name: 'Свечение текста',                         content: 'fade',    desc: 'Текст активной вкладки мягко светится акцентом. Без полосок.' },
  { id: 'glow-pool',     name: 'Световое пятно снизу',                    content: 'fade',    desc: 'Под активной вкладкой разливается размытое световое пятно.' },
  { id: 'neon-pulse',    name: 'Неоновый пульс',                          content: 'fade',    desc: 'Подчерк-неон пульсирует яркостью, привлекая внимание.' },
  { id: 'glow-ring',     name: 'Пульсирующее кольцо',                     content: 'fade',    desc: 'От активной вкладки один раз расходится кольцо-импульс при выборе.' },

  /* F · С характером (движение/пружина) */
  { id: 'bounce-line',   name: 'Линия падает с отскоком',                 content: 'fade',    desc: 'Подчерк «роняется» сверху и отскакивает, прежде чем застыть.' },
  { id: 'overshoot',     name: 'Промах и возврат',        tag: 'JS', ink: true, content: 'slidedir', desc: 'Линия проскакивает мимо цели и доводится назад. Дорогая мелкая моторика.' },
  { id: 'elastic',       name: 'Эластичная ширина',       tag: 'JS', ink: true, content: 'fade',     desc: 'Линия подгоняется по ширине текста с эластичным «дотягиванием».' },
  { id: 'wobble',        name: 'Лёгкий вобл',                             content: 'fade',    desc: 'При выборе подчерк коротко покачивается. Чуть живости без перебора.' },
  { id: 'swing',         name: 'Маятник',                                 content: 'fade',    desc: 'Линия выезжает маятником из стороны и замирает по центру.' },

  /* G · Акцент на переходе контента (индикатор — простая линия) */
  { id: 'content-fade',  name: 'Контент: плавно',         tag: 'контент', content: 'fade',    desc: 'Содержимое вкладки мягко перетекает кросс-фейдом. База на каждый день.' },
  { id: 'content-slide', name: 'Контент: уезжает вбок',   tag: 'контент', content: 'slidedir',desc: 'Контент уезжает в сторону движения вкладки и въезжает новый. Чувствуется направление.' },
  { id: 'content-up',    name: 'Контент: всплывает',      tag: 'контент', content: 'slideup', desc: 'Новое содержимое всплывает снизу с лёгким затуханием.' },
  { id: 'content-zoom',  name: 'Контент: приближение',    tag: 'контент', content: 'zoom',    desc: 'Содержимое приближается из глубины. Акцент на смене.' },
  { id: 'content-blur',  name: 'Контент: расфокус',       tag: 'контент', content: 'blur',    desc: 'Новый контент проявляется из размытия в резкость.' },
  { id: 'content-flip',  name: 'Контент: переворот 3D',   tag: 'контент', content: 'flip',    desc: 'Панель переворачивается в 3D, открывая новое содержимое.' },
  { id: 'content-mask',  name: 'Контент: штора',          tag: 'контент', content: 'mask',    desc: 'Содержимое открывается шторкой (clip-path) сверху вниз.' },
  { id: 'content-stagger', name: 'Контент: строки по очереди', tag: 'контент', content: 'stagger', desc: 'Строки нового списка появляются одна за другой каскадом.' }
];

var ALL = FEATURED.concat(VARIANTS);

/* ── Готовые CSS-сниппеты под боевые классы (.cs-tabs / .cs-tab / .cs-ink) ── */
var INK_JS =
'/* JS — двигать индикатор под активную вкладку (вызывать при клике, на load и resize) */\n' +
'function csMoveInk(tabs){var ink=tabs.querySelector(".cs-ink"),a=tabs.querySelector(".cs-tab.active");if(!ink||!a)return;ink.style.setProperty("--ink-x",a.offsetLeft+"px");ink.style.setProperty("--ink-w",a.offsetWidth+"px");}';

var BASE_LINE =
'.cs-tab { position:relative; border-bottom-color:transparent !important; transition:color var(--dur-base) var(--ease-snap); }\n' +
'.cs-tab::after { content:""; position:absolute; left:12px; right:12px; bottom:0; height:2px; background:var(--accent); border-radius:2px; ';

var SNIPPETS = {
  'combo-pro':
'/* Магическая линия PRO — подвижный подчерк со свечением. Нужен <span class="cs-ink"></span> в .cs-tabs */\n' +
'.cs-tabs { position:relative; }\n' +
'.cs-tab { position:relative; z-index:1; border-bottom-color:transparent !important; transition:color var(--dur-base) var(--ease-snap); }\n' +
'.cs-tab.active { color:var(--accent); }\n' +
'.cs-ink { position:absolute; left:0; bottom:0; height:2px; width:var(--ink-w,40px); border-radius:2px; background:var(--accent); box-shadow:0 0 10px var(--accent-glow); transform:translateX(var(--ink-x,0)); transition:transform var(--dur-mid) var(--ease-spring), width var(--dur-mid) var(--ease-spring), background var(--dur-base); pointer-events:none; }\n' +
INK_JS,
  'combo-pill':
'/* Скользящая пилюля — подложка-капсула едет под активную. Нужен <span class="cs-ink"></span> */\n' +
'.cs-tabs { position:relative; }\n' +
'.cs-tab { position:relative; z-index:1; border-bottom:none !important; transition:color var(--dur-base) var(--ease-snap); }\n' +
'.cs-tab.active { color:#fff; }\n' +
'.cs-ink { position:absolute; left:0; top:50%; height:30px; width:var(--ink-w,40px); border-radius:999px; background:var(--accent-dim); border:1px solid var(--accent-border-str); transform:translate(var(--ink-x,0),-50%); transition:transform var(--dur-mid) var(--ease-spring), width var(--dur-mid) var(--ease-spring); pointer-events:none; }\n' +
INK_JS,

  'line-center': BASE_LINE + 'transform:scaleX(0); transform-origin:center; transition:transform var(--dur-base) var(--ease-spring); }\n.cs-tab.active { color:var(--accent); }\n.cs-tab.active::after { transform:scaleX(1); }',
  'line-left':   BASE_LINE + 'transform:scaleX(0); transform-origin:left; transition:transform var(--dur-base) var(--ease-snap); }\n.cs-tab.active { color:var(--accent); }\n.cs-tab.active::after { transform:scaleX(1); }',
  'line-grow':   BASE_LINE + 'height:0; transition:height var(--dur-base) var(--ease-spring); }\n.cs-tab.active { color:var(--accent); }\n.cs-tab.active::after { height:3px; }',
  'line-double':
'.cs-tab { position:relative; border-bottom-color:transparent !important; transition:color var(--dur-base); }\n' +
'.cs-tab::before, .cs-tab::after { content:""; position:absolute; left:12px; right:12px; height:2px; background:var(--accent); border-radius:2px; transform:scaleX(0); transition:transform var(--dur-base) var(--ease-spring); }\n' +
'.cs-tab::before { top:0; } .cs-tab::after { bottom:0; }\n' +
'.cs-tab.active { color:var(--accent); }\n.cs-tab.active::before, .cs-tab.active::after { transform:scaleX(1); }',
  'line-dashed': BASE_LINE + 'background:repeating-linear-gradient(90deg,var(--accent) 0 5px,transparent 5px 10px); opacity:.35; transition:opacity var(--dur-base), background-size var(--dur-base); }\n.cs-tab.active { color:var(--accent); }\n.cs-tab.active::after { opacity:1; background:var(--accent); }',
  'line-gradient': BASE_LINE + 'background:linear-gradient(90deg,transparent,var(--accent),transparent); opacity:0; transform:scaleX(.4); transition:opacity var(--dur-base), transform var(--dur-base) var(--ease-spring); }\n.cs-tab.active { color:var(--accent); }\n.cs-tab.active::after { opacity:1; transform:scaleX(1); }',
  'line-glow':   BASE_LINE + 'box-shadow:0 0 8px var(--accent),0 0 14px var(--accent-glow); transform:scaleX(0); transition:transform var(--dur-base) var(--ease-spring); }\n.cs-tab.active { color:var(--accent); }\n.cs-tab.active::after { transform:scaleX(1); }',
  'line-shimmer':
BASE_LINE + 'transform:scaleX(0); transition:transform var(--dur-base) var(--ease-spring); overflow:hidden; }\n' +
'.cs-tab.active { color:var(--accent); }\n.cs-tab.active::after { transform:scaleX(1); background:linear-gradient(90deg,var(--accent),#fff,var(--accent)); background-size:200% 100%; animation:cs-shimmer 1.6s linear infinite; }\n' +
'@keyframes cs-shimmer { to { background-position:-200% 0; } }',
  'line-rounded': BASE_LINE + 'height:4px; border-radius:999px; left:18px; right:18px; transform:scaleX(0); transition:transform var(--dur-base) var(--ease-spring); }\n.cs-tab.active { color:var(--accent); }\n.cs-tab.active::after { transform:scaleX(1); }',
  'line-split':  BASE_LINE + 'transform:scaleX(0); transform-origin:center; transition:transform var(--dur-mid) var(--ease-soft); }\n.cs-tab.active { color:var(--accent); }\n.cs-tab.active::after { transform:scaleX(1); }',

  'ink-slide':
'.cs-tabs { position:relative; }\n.cs-tab { position:relative; z-index:1; border-bottom-color:transparent !important; transition:color var(--dur-base); }\n.cs-tab.active { color:var(--accent); }\n' +
'.cs-ink { position:absolute; left:0; bottom:0; height:2px; width:var(--ink-w,40px); border-radius:2px; background:var(--accent); transform:translateX(var(--ink-x,0)); transition:transform var(--dur-base) var(--ease-snap), width var(--dur-base) var(--ease-snap); pointer-events:none; }\n' + INK_JS,
  'ink-spring':
'.cs-tabs { position:relative; }\n.cs-tab { position:relative; z-index:1; border-bottom-color:transparent !important; transition:color var(--dur-base); }\n.cs-tab.active { color:var(--accent); }\n' +
'.cs-ink { position:absolute; left:0; bottom:0; height:2px; width:var(--ink-w,40px); border-radius:2px; background:var(--accent); transform:translateX(var(--ink-x,0)); transition:transform var(--dur-mid) var(--ease-spring), width var(--dur-mid) var(--ease-spring); pointer-events:none; }\n' + INK_JS,
  'ink-stretch':
'.cs-tabs { position:relative; }\n.cs-tab { position:relative; z-index:1; border-bottom-color:transparent !important; transition:color var(--dur-base); }\n.cs-tab.active { color:var(--accent); }\n' +
'.cs-ink { position:absolute; left:0; bottom:0; height:2px; width:var(--ink-w,40px); border-radius:2px; background:var(--accent); transform-origin:left; transform:translateX(var(--ink-x,0)); transition:transform var(--dur-mid) var(--ease-snap), width var(--dur-mid) var(--ease-snap); pointer-events:none; }\n.cs-ink.moving { transform:translateX(var(--ink-x,0)) scaleX(1.25); }\n' + INK_JS + '\n/* при клике коротко добавляй класс .moving на 250мс */',
  'ink-dot':
'.cs-tabs { position:relative; }\n.cs-tab { position:relative; z-index:1; border-bottom-color:transparent !important; transition:color var(--dur-base); }\n.cs-tab.active { color:var(--accent); }\n' +
'.cs-ink { position:absolute; left:0; bottom:2px; width:6px; height:6px; border-radius:50%; background:var(--accent); box-shadow:0 0 8px var(--accent); transform:translateX(calc(var(--ink-x,0) + var(--ink-w,40px)/2 - 3px)); transition:transform var(--dur-base) var(--ease-spring); pointer-events:none; }\n' + INK_JS,
  'ink-arrow':
'.cs-tabs { position:relative; }\n.cs-tab { position:relative; z-index:1; border-bottom-color:transparent !important; transition:color var(--dur-base); }\n.cs-tab.active { color:var(--accent); }\n' +
'.cs-ink { position:absolute; left:0; bottom:0; width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-bottom:6px solid var(--accent); transform:translateX(calc(var(--ink-x,0) + var(--ink-w,40px)/2 - 6px)); transition:transform var(--dur-base) var(--ease-spring); pointer-events:none; }\n' + INK_JS,
  'ink-double':
'.cs-tabs { position:relative; }\n.cs-tab { position:relative; z-index:1; border-bottom-color:transparent !important; transition:color var(--dur-base); }\n.cs-tab.active { color:var(--accent); }\n' +
'.cs-ink { position:absolute; left:0; top:0; bottom:0; width:var(--ink-w,40px); transform:translateX(var(--ink-x,0)); transition:transform var(--dur-base) var(--ease-snap), width var(--dur-base) var(--ease-snap); pointer-events:none; }\n.cs-ink::before, .cs-ink::after { content:""; position:absolute; left:6px; right:6px; height:2px; background:var(--accent); border-radius:2px; }\n.cs-ink::before { top:0; } .cs-ink::after { bottom:0; }\n' + INK_JS,
  'ink-tube':
'.cs-tabs { position:relative; }\n.cs-tab { position:relative; z-index:1; border-bottom:none !important; transition:color var(--dur-base); }\n.cs-tab.active { color:var(--accent); }\n' +
'.cs-ink { position:absolute; left:0; top:50%; height:30px; width:var(--ink-w,40px); border-radius:999px; border:1.5px solid var(--accent); transform:translate(var(--ink-x,0),-50%); transition:transform var(--dur-mid) var(--ease-spring), width var(--dur-mid) var(--ease-spring); pointer-events:none; }\n' + INK_JS,
  'ink-pill-spring':
'.cs-tabs { position:relative; }\n.cs-tab { position:relative; z-index:1; border-bottom:none !important; transition:color var(--dur-base); }\n.cs-tab.active { color:#fff; }\n' +
'.cs-ink { position:absolute; left:0; top:50%; height:30px; width:var(--ink-w,40px); border-radius:999px; background:var(--accent-dim); border:1px solid var(--accent-border-str); transform:translate(var(--ink-x,0),-50%); transition:transform var(--dur-mid) var(--ease-spring), width var(--dur-mid) var(--ease-spring); pointer-events:none; }\n' + INK_JS,
  'ink-goo':
'/* «Жидкий» индикатор. Нужен SVG-фильтр #goo на странице и обёртка с filter:url(#goo) */\n' +
'.cs-tabs { position:relative; }\n.cs-tab { position:relative; z-index:1; border-bottom:none !important; transition:color var(--dur-base); }\n.cs-tab.active { color:#fff; }\n' +
'.cs-ink-layer { position:absolute; inset:0; filter:url(#goo); pointer-events:none; }\n.cs-ink { position:absolute; left:0; top:50%; height:28px; width:var(--ink-w,40px); border-radius:999px; background:var(--accent); transform:translate(var(--ink-x,0),-50%); transition:transform var(--dur-mid) var(--ease-soft), width var(--dur-mid) var(--ease-soft); }\n' + INK_JS,

  'fill-up':
'.cs-tab { position:relative; overflow:hidden; border-bottom:none !important; border-radius:8px; transition:color var(--dur-base); }\n.cs-tab::after { content:""; position:absolute; inset:0; background:var(--accent-dim); transform:scaleY(0); transform-origin:bottom; transition:transform var(--dur-base) var(--ease-snap); z-index:-1; }\n.cs-tab.active { color:var(--accent); }\n.cs-tab.active::after { transform:scaleY(1); }',
  'fill-pill':
'.cs-tab { position:relative; border-bottom:none !important; border-radius:999px; transition:color var(--dur-base); }\n.cs-tab::after { content:""; position:absolute; inset:0; border-radius:999px; background:var(--accent-dim); border:1px solid var(--accent-border-str); opacity:0; transform:scale(.85); transition:opacity var(--dur-base), transform var(--dur-base) var(--ease-spring); z-index:-1; }\n.cs-tab.active { color:var(--accent); }\n.cs-tab.active::after { opacity:1; transform:scale(1); }',
  'fill-soft':
'.cs-tab { position:relative; border-bottom:none !important; border-radius:8px; transition:color var(--dur-base), background var(--dur-base); }\n.cs-tab.active { color:var(--accent); background:rgba(255,255,255,.05); }',
  'fill-gradient':
'.cs-tab { position:relative; border-bottom:none !important; border-radius:999px; transition:color var(--dur-base); }\n.cs-tab::after { content:""; position:absolute; inset:0; border-radius:999px; background:linear-gradient(120deg,var(--accent-dim),transparent); opacity:0; transform:scale(.9); transition:opacity var(--dur-base), transform var(--dur-base) var(--ease-spring); z-index:-1; }\n.cs-tab.active { color:var(--accent); }\n.cs-tab.active::after { opacity:1; transform:scale(1); }',
  'fill-frost':
'.cs-tab { position:relative; border-bottom:none !important; border-radius:10px; transition:color var(--dur-base); }\n.cs-tab::after { content:""; position:absolute; inset:0; border-radius:10px; background:rgba(255,255,255,.06); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); border:1px solid rgba(255,255,255,.12); opacity:0; transition:opacity var(--dur-base); z-index:-1; }\n.cs-tab.active { color:#fff; }\n.cs-tab.active::after { opacity:1; }',
  'fill-spotlight':
'.cs-tab { position:relative; border-bottom:none !important; transition:color var(--dur-base); }\n.cs-tab::after { content:""; position:absolute; left:50%; top:50%; width:80%; height:140%; border-radius:50%; background:radial-gradient(circle,var(--accent-glow),transparent 70%); opacity:0; transform:translate(-50%,-50%) scale(.6); transition:opacity var(--dur-base), transform var(--dur-base) var(--ease-soft); z-index:-1; }\n.cs-tab.active { color:var(--accent); }\n.cs-tab.active::after { opacity:1; transform:translate(-50%,-50%) scale(1); }',

  'box-border':
'.cs-tab { position:relative; border:1px solid transparent !important; border-radius:8px; transition:color var(--dur-base), border-color var(--dur-base); }\n.cs-tab.active { color:var(--accent); border-color:var(--accent-border-str) !important; }',
  'corner-brackets':
'.cs-tab { position:relative; border-bottom:none !important; transition:color var(--dur-base); }\n.cs-tab::before, .cs-tab::after { content:""; position:absolute; width:8px; height:8px; border:2px solid var(--accent); opacity:0; transition:opacity var(--dur-base), transform var(--dur-base) var(--ease-spring); }\n.cs-tab::before { left:2px; top:2px; border-right:none; border-bottom:none; transform:translate(4px,4px); }\n.cs-tab::after { right:2px; bottom:2px; border-left:none; border-top:none; transform:translate(-4px,-4px); }\n.cs-tab.active { color:var(--accent); }\n.cs-tab.active::before, .cs-tab.active::after { opacity:1; transform:translate(0,0); }',
  'dot-under':
'.cs-tab { position:relative; border-bottom:none !important; transition:color var(--dur-base); }\n.cs-tab::after { content:""; position:absolute; left:50%; bottom:2px; width:5px; height:5px; border-radius:50%; background:var(--accent); transform:translateX(-50%) scale(0); transition:transform var(--dur-base) var(--ease-spring); }\n.cs-tab.active { color:var(--accent); }\n.cs-tab.active::after { transform:translateX(-50%) scale(1); }',
  'triangle':
'.cs-tab { position:relative; border-bottom:none !important; transition:color var(--dur-base); }\n.cs-tab::after { content:""; position:absolute; left:50%; bottom:-1px; width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-bottom:6px solid var(--accent); transform:translateX(-50%) translateY(6px); opacity:0; transition:transform var(--dur-base) var(--ease-spring), opacity var(--dur-base); }\n.cs-tab.active { color:var(--accent); }\n.cs-tab.active::after { transform:translateX(-50%) translateY(0); opacity:1; }',
  'notch':
'.cs-tab { position:relative; border-bottom:none !important; transition:color var(--dur-base); }\n.cs-tab::after { content:""; position:absolute; left:50%; bottom:0; width:18px; height:3px; border-radius:3px 3px 0 0; background:var(--accent); transform:translateX(-50%) scaleX(0); transition:transform var(--dur-base) var(--ease-spring); }\n.cs-tab.active { color:var(--accent); }\n.cs-tab.active::after { transform:translateX(-50%) scaleX(1); }',
  'bracket-text':
'.cs-tab { position:relative; border-bottom:none !important; transition:color var(--dur-base); }\n.cs-tab::before, .cs-tab::after { color:var(--accent); opacity:0; transition:opacity var(--dur-base), transform var(--dur-base) var(--ease-spring); position:relative; }\n.cs-tab::before { content:"[ "; transform:translateX(6px); }\n.cs-tab::after { content:" ]"; transform:translateX(-6px); }\n.cs-tab.active { color:var(--accent); }\n.cs-tab.active::before, .cs-tab.active::after { opacity:1; transform:translateX(0); }',

  'glow-text':
'.cs-tab { transition:color var(--dur-base), text-shadow var(--dur-base); border-bottom:none !important; }\n.cs-tab.active { color:var(--accent); text-shadow:0 0 12px var(--accent-glow); }',
  'glow-pool':
'.cs-tab { position:relative; border-bottom:none !important; transition:color var(--dur-base); }\n.cs-tab::after { content:""; position:absolute; left:0; right:0; bottom:-6px; height:18px; background:radial-gradient(ellipse at center,var(--accent-glow),transparent 70%); opacity:0; transition:opacity var(--dur-base); pointer-events:none; }\n.cs-tab.active { color:var(--accent); }\n.cs-tab.active::after { opacity:1; }',
  'neon-pulse':
'.cs-tab { position:relative; border-bottom-color:transparent !important; transition:color var(--dur-base); }\n.cs-tab::after { content:""; position:absolute; left:12px; right:12px; bottom:0; height:2px; border-radius:2px; background:var(--accent); transform:scaleX(0); transition:transform var(--dur-base) var(--ease-spring); }\n.cs-tab.active { color:var(--accent); }\n.cs-tab.active::after { transform:scaleX(1); animation:cs-neon 1.4s ease-in-out infinite; }\n@keyframes cs-neon { 0%,100% { box-shadow:0 0 4px var(--accent); } 50% { box-shadow:0 0 12px var(--accent),0 0 20px var(--accent-glow); } }',
  'glow-ring':
'.cs-tab { position:relative; border-bottom-color:transparent !important; transition:color var(--dur-base); }\n.cs-tab::after { content:""; position:absolute; inset:0; border-radius:10px; border:2px solid var(--accent); opacity:0; pointer-events:none; }\n.cs-tab.active { color:var(--accent); }\n.cs-tab.active::after { animation:cs-ring .6s var(--ease-soft); }\n@keyframes cs-ring { 0% { opacity:.8; transform:scale(.85); } 100% { opacity:0; transform:scale(1.15); } }',

  'bounce-line':
'.cs-tab { position:relative; border-bottom-color:transparent !important; transition:color var(--dur-base); }\n.cs-tab::after { content:""; position:absolute; left:12px; right:12px; bottom:0; height:2px; border-radius:2px; background:var(--accent); transform:scaleX(0); }\n.cs-tab.active { color:var(--accent); }\n.cs-tab.active::after { animation:cs-bounce .5s var(--ease-spring) forwards; }\n@keyframes cs-bounce { 0% { transform:translateY(-8px) scaleX(.6); opacity:0; } 60% { transform:translateY(2px) scaleX(1.05); opacity:1; } 100% { transform:translateY(0) scaleX(1); } }',
  'overshoot':
'.cs-tabs { position:relative; }\n.cs-tab { position:relative; z-index:1; border-bottom-color:transparent !important; transition:color var(--dur-base); }\n.cs-tab.active { color:var(--accent); }\n.cs-ink { position:absolute; left:0; bottom:0; height:2px; width:var(--ink-w,40px); border-radius:2px; background:var(--accent); transform:translateX(var(--ink-x,0)); transition:transform var(--dur-mid) cubic-bezier(.5,1.7,.4,1), width var(--dur-mid) var(--ease-snap); pointer-events:none; }\n' + INK_JS,
  'elastic':
'.cs-tabs { position:relative; }\n.cs-tab { position:relative; z-index:1; border-bottom-color:transparent !important; transition:color var(--dur-base); }\n.cs-tab.active { color:var(--accent); }\n.cs-ink { position:absolute; left:0; bottom:0; height:2px; width:var(--ink-w,40px); border-radius:2px; background:var(--accent); transform:translateX(var(--ink-x,0)); transition:transform var(--dur-base) var(--ease-snap), width var(--dur-mid) var(--ease-spring); pointer-events:none; }\n' + INK_JS,
  'wobble':
'.cs-tab { position:relative; border-bottom-color:transparent !important; transition:color var(--dur-base); }\n.cs-tab::after { content:""; position:absolute; left:12px; right:12px; bottom:0; height:2px; border-radius:2px; background:var(--accent); transform:scaleX(0); transition:transform var(--dur-base) var(--ease-spring); }\n.cs-tab.active { color:var(--accent); }\n.cs-tab.active::after { transform:scaleX(1); animation:cs-wobble .5s var(--ease-soft); }\n@keyframes cs-wobble { 0%,100% { transform:scaleX(1) skewX(0); } 30% { transform:scaleX(1) skewX(-8deg); } 60% { transform:scaleX(1) skewX(5deg); } }',
  'swing':
'.cs-tab { position:relative; border-bottom-color:transparent !important; transition:color var(--dur-base); }\n.cs-tab::after { content:""; position:absolute; left:12px; right:12px; bottom:0; height:2px; border-radius:2px; background:var(--accent); transform:scaleX(0); transform-origin:left; }\n.cs-tab.active { color:var(--accent); }\n.cs-tab.active::after { animation:cs-swing .5s var(--ease-spring) forwards; }\n@keyframes cs-swing { 0% { transform:scaleX(0); transform-origin:left; } 100% { transform:scaleX(1); transform-origin:left; } }',

  /* G — индикатор простой (линия из центра), вся соль в переходе контента (см. JS-заметку) */
  'content-fade':   BASE_LINE + 'transform:scaleX(0); transition:transform var(--dur-base) var(--ease-spring); }\n.cs-tab.active { color:var(--accent); }\n.cs-tab.active::after { transform:scaleX(1); }\n/* + при смене вкладки прогоняй на панели контента: opacity 0→1 */',
  'content-slide':  BASE_LINE + 'transform:scaleX(0); transition:transform var(--dur-base) var(--ease-spring); }\n.cs-tab.active { color:var(--accent); }\n.cs-tab.active::after { transform:scaleX(1); }\n/* + панель контента: translateX(±16px)→0 в сторону движения вкладки */',
  'content-up':     BASE_LINE + 'transform:scaleX(0); transition:transform var(--dur-base) var(--ease-spring); }\n.cs-tab.active { color:var(--accent); }\n.cs-tab.active::after { transform:scaleX(1); }\n/* + панель контента: translateY(10px)+opacity 0 → 0+1 */',
  'content-zoom':   BASE_LINE + 'transform:scaleX(0); transition:transform var(--dur-base) var(--ease-spring); }\n.cs-tab.active { color:var(--accent); }\n.cs-tab.active::after { transform:scaleX(1); }\n/* + панель контента: scale(.96)+opacity 0 → 1+1 */',
  'content-blur':   BASE_LINE + 'transform:scaleX(0); transition:transform var(--dur-base) var(--ease-spring); }\n.cs-tab.active { color:var(--accent); }\n.cs-tab.active::after { transform:scaleX(1); }\n/* + панель контента: filter:blur(6px)+opacity 0 → blur(0)+1 */',
  'content-flip':   BASE_LINE + 'transform:scaleX(0); transition:transform var(--dur-base) var(--ease-spring); }\n.cs-tab.active { color:var(--accent); }\n.cs-tab.active::after { transform:scaleX(1); }\n/* + панель контента: rotateX(-90deg)→0 (нужен perspective на родителе) */',
  'content-mask':   BASE_LINE + 'transform:scaleX(0); transition:transform var(--dur-base) var(--ease-spring); }\n.cs-tab.active { color:var(--accent); }\n.cs-tab.active::after { transform:scaleX(1); }\n/* + панель контента: clip-path inset(0 0 100% 0)→inset(0) */',
  'content-stagger':BASE_LINE + 'transform:scaleX(0); transition:transform var(--dur-base) var(--ease-spring); }\n.cs-tab.active { color:var(--accent); }\n.cs-tab.active::after { transform:scaleX(1); }\n/* + строки списка: translateY(8px)+opacity 0 → 0+1 с задержкой nth-child */'
};

/* ── Построение разметки ── */
function panelHtml(key) {
  var c = CONTENT[key];
  var rows = c.rows.map(function (r) {
    return '<div class="tl-row"><span class="tl-dot"></span>' + r + '</div>';
  }).join('');
  return '<div class="tl-p-title">' + c.title + '</div>' + rows;
}

function buildDemo(v) {
  var btns = TABS.map(function (t, i) {
    return '<button class="tl-tab' + (i === 0 ? ' active' : '') + '" data-key="' + t[0] + '">' + t[1] + '</button>';
  }).join('');
  var ink = '';
  if (v.ink) {
    ink = (v.id === 'ink-goo')
      ? '<span class="tl-ink-layer"><span class="tl-ink"></span></span>'
      : '<span class="tl-ink"></span>';
  }
  return '<div class="tl-demo" data-content="' + (v.content || 'fade') + '">' +
           '<div class="tl-tabs v-' + v.id + '" data-idx="0">' + btns + ink + '</div>' +
           '<div class="tl-panel tl-anim" data-dir="right">' + panelHtml('active') + '</div>' +
         '</div>';
}

function buildVariant(v, idx) {
  var tag = '';
  if (v.tag) tag += '<span class="tl-tag' + (v.tag === 'JS' ? ' js' : '') + '">' + v.tag + '</span>';
  var num = v.featured ? '★' : idx;
  var cls = 'tl-variant' + (v.featured ? ' tl-variant--feature' : '');
  return '<section class="' + cls + '">' +
    '<div class="tl-variant-head">' +
      '<div class="tl-variant-num">' + num + '</div>' +
      '<div class="tl-variant-meta">' +
        '<div class="tl-variant-name">' + v.name + tag + '</div>' +
        '<p class="tl-variant-desc">' + v.desc + '</p>' +
      '</div>' +
      '<button class="tl-copy" data-snip="' + v.id + '">Скопировать CSS</button>' +
    '</div>' +
    buildDemo(v) +
  '</section>';
}

var wrap = document.getElementById('tlWrap');
var html = '';
FEATURED.forEach(function (v) { html += buildVariant(v, -1); });
VARIANTS.forEach(function (v, i) { html += buildVariant(v, i + 1); });
wrap.innerHTML = html;

/* ── Переключатель вкладок: двигаем индикатор + проигрываем переход контента ── */
function moveInk(tabs) {
  var ink = tabs.querySelector('.tl-ink');
  if (!ink) return;
  var a = tabs.querySelector('.tl-tab.active');
  if (!a) return;
  ink.style.setProperty('--ink-x', a.offsetLeft + 'px');
  ink.style.setProperty('--ink-w', a.offsetWidth + 'px');
}

function positionAll() {
  var list = document.querySelectorAll('.tl-tabs');
  for (var i = 0; i < list.length; i++) moveInk(list[i]);
}

wrap.addEventListener('click', function (e) {
  var copy = e.target.closest('.tl-copy');
  if (copy) {
    copySnippet(copy);
    return;
  }
  var tab = e.target.closest('.tl-tab');
  if (!tab) return;

  var tabs = tab.parentElement;
  var demo = tab.closest('.tl-demo');
  var btns = Array.prototype.slice.call(tabs.querySelectorAll('.tl-tab'));
  var newIdx = btns.indexOf(tab);
  var oldIdx = parseInt(tabs.getAttribute('data-idx'), 10) || 0;
  if (newIdx === oldIdx) return;

  btns.forEach(function (b) { b.classList.remove('active'); });
  tab.classList.add('active');
  tabs.setAttribute('data-idx', newIdx);

  /* стретч-индикатор: короткий импульс растяжения на время переезда */
  var ink = tabs.querySelector('.tl-ink');
  if (ink && tabs.classList.contains('v-ink-stretch')) {
    ink.classList.add('moving');
    clearTimeout(ink._t);
    ink._t = setTimeout(function () { ink.classList.remove('moving'); }, 260);
  }
  moveInk(tabs);

  var panel = demo.querySelector('.tl-panel');
  panel.setAttribute('data-dir', newIdx > oldIdx ? 'right' : 'left');
  panel.innerHTML = panelHtml(tab.getAttribute('data-key'));
  panel.classList.remove('tl-anim');
  void panel.offsetWidth;          /* форсируем перезапуск анимации */
  panel.classList.add('tl-anim');
});

window.addEventListener('load', positionAll);
window.addEventListener('resize', positionAll);
positionAll();

/* ── Кнопка «Скопировать CSS» ── */
function copySnippet(btn) {
  var css = SNIPPETS[btn.getAttribute('data-snip')] || '';
  var done = function () {
    var prev = btn.textContent;
    btn.textContent = '✓ Скопировано';
    btn.classList.add('done');
    setTimeout(function () { btn.textContent = prev; btn.classList.remove('done'); }, 1500);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(css).then(done, done);
  } else {
    var ta = document.createElement('textarea');
    ta.value = css; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (err) {}
    ta.remove(); done();
  }
}

/* ── Ползунок скорости ── */
var speed = document.getElementById('tlSpeed');
var speedVal = document.getElementById('tlSpeedVal');
speed.addEventListener('input', function () {
  document.documentElement.style.setProperty('--sp', speed.value);
  speedVal.textContent = parseFloat(speed.value).toFixed(1) + '×';
});

/* ── Смена акцентного цвета ── */
var swatches = document.getElementById('tlSwatches');
var custom = document.getElementById('tlCustom');

function applyAccent(rgb) {
  var root = document.documentElement.style;
  root.setProperty('--accent', 'rgb(' + rgb + ')');
  root.setProperty('--accent-glow', 'rgba(' + rgb + ',0.4)');
  root.setProperty('--accent-dim', 'rgba(' + rgb + ',0.15)');
  root.setProperty('--accent-border', 'rgba(' + rgb + ',0.2)');
  root.setProperty('--accent-border-sub', 'rgba(' + rgb + ',0.08)');
  root.setProperty('--accent-border-str', 'rgba(' + rgb + ',0.5)');
}
function hexToRgb(hex) {
  var h = hex.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return parseInt(h.slice(0, 2), 16) + ',' + parseInt(h.slice(2, 4), 16) + ',' + parseInt(h.slice(4, 6), 16);
}
swatches.addEventListener('click', function (e) {
  var sw = e.target.closest('.tl-sw');
  if (!sw) return;
  swatches.querySelectorAll('.tl-sw').forEach(function (s) { s.classList.remove('active'); });
  sw.classList.add('active');
  applyAccent(sw.getAttribute('data-accent'));
});
custom.addEventListener('input', function () {
  swatches.querySelectorAll('.tl-sw').forEach(function (s) { s.classList.remove('active'); });
  applyAccent(hexToRgb(custom.value));
});
