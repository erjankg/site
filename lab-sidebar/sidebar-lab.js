'use strict';

/* ── Образец строк сайдбара (как на боевом) ── */
var SAMPLE = [
  { sec: 'Инструменты' },
  { ic: '👥', lbl: 'Чемпионы' },
  { ic: '⚔',  lbl: 'Калькулятор урона' },
  { ic: '📦', lbl: 'Предметы' },
  { ic: '💎', lbl: 'Руны' },
  { ic: '📋', lbl: 'Драфт-помощник', cls: 'draft' },
  { ic: '🏆', lbl: 'Тир-лист', cls: 'tier' },
  { ic: '🗺', lbl: 'Тактическая доска', badge: 'BETA' },
  { sec: 'Сообщество' },
  { ic: '💬', lbl: 'Чат', cls: 'chat' },
  { ic: '🏆', lbl: 'Киберспорт' }
];

/* ── Варианты ── */
var VARIANTS = [
  { id: 'combo', v: 'v-combo', featured: true, name: 'Combo Premium', tag: 'РЕКОМЕНДУЮ', best: true,
    desc: 'Мой главный кандидат. Строка мягко уезжает вправо, слева вырастает светящаяся полоса, иконка подрастает, справа выезжает «›», лёгкий ореол. Дорого, спокойно, но живо — как у топовых продуктов.' },

  { id: 'current', v: 'v-current', name: 'Текущая', tag: 'сейчас',
    desc: 'То, что на сайте сейчас — просто меняется фон и цвет. Для сравнения.' },

  { id: 'liquid', v: 'v-liquid', name: 'Liquid Fill',
    desc: 'Акцентный фон плавно затекает слева направо, как наливается. Минимализм, ноль суеты.' },

  { id: 'indent', v: 'v-indent', name: 'Indent & Bar',
    desc: 'Строка сдвигается вправо, слева вырастает тонкая полоса. Классика премиум-навигации, сделанная чисто.' },

  { id: 'sheen', v: 'v-sheen', name: 'Glass Sheen',
    desc: 'По строке один раз пробегает диагональный световой блик + микроподъём. Эффект стекла.' },

  { id: 'spotlight', v: 'v-spotlight', js: 'spotlight', name: 'Cursor Spotlight',
    desc: 'Мягкое пятно света следует за курсором вдоль строки. Тактильно, реагирует на тебя.' },

  { id: 'magnetic', v: 'v-magnetic', js: 'magnetic', name: 'Magnetic Icon',
    desc: 'Иконка слегка тянется к курсору, как магнит. Незаметная, но приятная деталь.' },

  { id: 'chevron', v: 'v-chevron', name: 'Chevron Reveal',
    desc: 'Справа выезжает стрелка «›», строка чуть раздвигается. Подсказка «можно нажать».' },

  { id: 'aurora', v: 'v-aurora', name: 'Aurora Glow',
    desc: 'За строкой включается мягкое «дышащее» свечение. Тихо, атмосферно, премиально.' },

  { id: 'frost', v: 'v-frost', name: 'Frost Glass',
    desc: 'Матовое стекло со светлой внутренней рамкой. Apple-вайб, очень сдержанно.' },

  { id: 'underline', v: 'v-underline', name: 'Ink Underline',
    desc: 'Под названием выезжает тонкая светящаяся линия. Аккуратно и информативно.' },

  { id: 'depth', v: 'v-depth', name: 'Depth Lift',
    desc: 'Строка приподнимается к тебе с мягкой тенью. Ощущение глубины и веса.' },

  { id: 'spread', v: 'v-spread', name: 'Letter Spread',
    desc: 'Буквы названия чуть расходятся, иконка перекрашивается в акцент. Дорогой типографский приём.' },

  { id: 'gold', v: 'v-gold', name: 'Gold Emboss',
    desc: 'Тёплый золотой внутренний свет вместо циана. Премиум-люкс, «золотая» подача.' },

  { id: 'wipe', v: 'v-wipe', name: 'Color Wipe',
    desc: 'Текст и иконка перекрашиваются в белый слева направо, как заливка. Необычно и чисто.' },

  { id: 'halo', v: 'v-halo', name: 'Halo Icon',
    desc: 'Вокруг иконки загорается световое кольцо, иконка подрастает. Фокус на смысле строки.' },

  { id: 'neon', v: 'v-neon', name: 'Neon Trace',
    desc: 'По рамке бежит градиентный неоновый блик. Самый «вау» и заметный — для смелых.' },

  { id: 'scan', v: 'v-scan', name: 'Holo Scan',
    desc: 'Голографическая полоса проходит по строке снизу вверх. Технологично, футуристично.' }
];

/* ── Только цветные строки (для второй группы) ── */
var COLORED_SAMPLE = [
  { ic: '📋', lbl: 'Драфт-помощник', cls: 'draft' },
  { ic: '🎯', lbl: 'Драфт (серии)',  cls: 'coop' },
  { ic: '🏆', lbl: 'Тир-лист',       cls: 'tier' },
  { ic: '💬', lbl: 'Чат',            cls: 'chat' },
  { ic: '🏆', lbl: 'Киберспорт',     cls: 'cs' }
];

/* ── Цветные варианты (каждый играет своим цветом кнопки) ── */
var COLORED_VARIANTS = [
  { id: 'cv-combo', v: 'cv-combo', sample: 'colored', name: 'Combo (свой цвет)', tag: 'базовый', best: true,
    desc: 'Тот же Combo Premium, но каждая кнопка светит своим цветом. Уже стоит в боевом по умолчанию — отсюда отталкиваемся.' },
  { id: 'cv-edge', v: 'cv-edge', sample: 'colored', name: 'Neon Edge',
    desc: 'Вся рамка кнопки загорается её цветом + внешнее свечение. Кнопка будто «включается». Заметно и дорого.' },
  { id: 'cv-sweep', v: 'cv-sweep', sample: 'colored', name: 'Color Sweep',
    desc: 'Цвет заливает строку целиком слева направо, текст становится тёмным. Максимально сочно и читаемо.' },
  { id: 'cv-pulse', v: 'cv-pulse', sample: 'colored', name: 'Pulse Bar',
    desc: 'Цветная полоса слева начинает пульсировать-дышать, строка чуть раздвигается. Живой «маячок».' },
  { id: 'cv-slide', v: 'cv-slide', sample: 'colored', name: 'Gradient Slide',
    desc: 'Диагональный градиент её цвета проезжает по строке насквозь. Эффект цветного стекла.' },
  { id: 'cv-halo', v: 'cv-halo', sample: 'colored', name: 'Icon Halo',
    desc: 'Вокруг иконки загорается кольцо её цвета, иконка перекрашивается и растёт. Фокус на смысле.' },
  { id: 'cv-spot', v: 'cv-spot', sample: 'colored', js: 'spotlight', name: 'Color Spotlight',
    desc: 'Пятно её цвета следует за курсором вдоль строки. Тактильно, реагирует на тебя.' },
  { id: 'cv-aurora', v: 'cv-aurora', sample: 'colored', name: 'Aurora Pull',
    desc: 'Отступ вправо + дышащий цветной ореол + выезжает «›». Combo, но мягче и атмосфернее.' }
];

/* ── Готовые CSS-сниппеты под боевой .side-btn (вставлять в styles.css) ── */
var SNIPPETS = {
  combo:
'/* Combo Premium — отступ + растущая полоса + иконка + «›» + ореол */\n' +
'.side-btn { position: relative; overflow: hidden;\n' +
'  transition: transform var(--dur-base) var(--ease-soft), background var(--dur-base) var(--ease-soft), color var(--dur-base), box-shadow var(--dur-base) var(--ease-soft); }\n' +
'.side-btn::before { content:""; position:absolute; left:0; top:18%; bottom:18%; width:3px; border-radius:0 3px 3px 0; background:var(--accent); box-shadow:0 0 10px var(--accent-glow); transform:scaleY(0); transition:transform var(--dur-base) var(--ease-spring); }\n' +
'.side-btn::after { content:"\\203A"; position:absolute; right:14px; font-size:18px; font-weight:700; color:var(--accent); opacity:0; transform:translateX(-6px); transition:opacity var(--dur-base), transform var(--dur-base) var(--ease-soft); }\n' +
'.side-btn .side-icon { transition:transform var(--dur-base) var(--ease-spring), filter var(--dur-base); }\n' +
'.side-btn:hover { background:linear-gradient(90deg,var(--accent-dim),transparent 85%); color:#fff; transform:translateX(6px); box-shadow:inset 0 0 0 1px var(--accent-border),0 6px 18px rgba(0,0,0,.35); }\n' +
'.side-btn:hover::before { transform:scaleY(1); }\n' +
'.side-btn:hover::after { opacity:1; transform:translateX(0); }\n' +
'.side-btn:hover .side-icon { transform:scale(1.18); filter:drop-shadow(0 0 6px var(--accent-glow)); }',

  liquid:
'/* Liquid Fill — фон затекает слева направо */\n' +
'.side-btn { position:relative; overflow:hidden; z-index:0; transition:color var(--dur-base); }\n' +
'.side-btn::before { content:""; position:absolute; inset:0; z-index:-1; border-radius:inherit; background:linear-gradient(90deg,var(--accent-dim),rgba(11,196,227,.22)); transform:scaleX(0); transform-origin:left; transition:transform var(--dur-mid) var(--ease-snap); }\n' +
'.side-btn:hover { color:#fff; }\n' +
'.side-btn:hover::before { transform:scaleX(1); }',

  indent:
'/* Indent & Bar — сдвиг вправо + растущая полоса слева */\n' +
'.side-btn { position:relative; overflow:hidden; transition:transform var(--dur-base) var(--ease-soft), color var(--dur-base); }\n' +
'.side-btn::before { content:""; position:absolute; left:0; top:0; bottom:0; width:3px; background:var(--accent); transform:scaleY(0); transform-origin:bottom; transition:transform var(--dur-base) var(--ease-snap); }\n' +
'.side-btn:hover { transform:translateX(8px); color:#fff; }\n' +
'.side-btn:hover::before { transform:scaleY(1); }',

  sheen:
'/* Glass Sheen — диагональный блик + микроподъём */\n' +
'.side-btn { position:relative; overflow:hidden; transition:transform var(--dur-base) var(--ease-soft), background var(--dur-base), color var(--dur-base); }\n' +
'.side-btn::after { content:""; position:absolute; inset:0; border-radius:inherit; pointer-events:none; background:linear-gradient(110deg,transparent 35%,rgba(255,255,255,.14) 50%,transparent 65%); transform:translateX(-120%); transition:transform var(--dur-slow) var(--ease-soft); }\n' +
'.side-btn:hover { background:rgba(255,255,255,.04); color:#fff; transform:translateY(-1px); }\n' +
'.side-btn:hover::after { transform:translateX(120%); }',

  spotlight:
'/* Cursor Spotlight — CSS + JS (пятно света за курсором) */\n' +
'.side-btn { position:relative; overflow:hidden; transition:color var(--dur-base); }\n' +
'.side-btn::before { content:""; position:absolute; inset:0; border-radius:inherit; pointer-events:none; background:radial-gradient(90px circle at var(--mx,50%) var(--my,50%),rgba(11,196,227,.22),transparent 70%); opacity:0; transition:opacity var(--dur-base); }\n' +
'.side-btn:hover { color:#fff; }\n' +
'.side-btn:hover::before { opacity:1; }\n' +
'/* JS: */\n' +
'document.querySelectorAll(".side-btn").forEach(function(b){ b.addEventListener("mousemove",function(e){ var r=b.getBoundingClientRect(); b.style.setProperty("--mx",((e.clientX-r.left)/r.width*100)+"%"); b.style.setProperty("--my",((e.clientY-r.top)/r.height*100)+"%"); }); });',

  magnetic:
'/* Magnetic Icon — CSS + JS (иконка тянется к курсору) */\n' +
'.side-btn { transition:background var(--dur-base), color var(--dur-base); }\n' +
'.side-btn .side-icon { transition:transform var(--dur-base) var(--ease-spring); will-change:transform; }\n' +
'.side-btn:hover { background:rgba(255,255,255,.04); color:#fff; }\n' +
'/* JS: */\n' +
'document.querySelectorAll(".side-btn").forEach(function(b){ var ic=b.querySelector(".side-icon"); if(!ic) return; b.addEventListener("mousemove",function(e){ var r=b.getBoundingClientRect(); ic.style.transform="translate("+((e.clientX-r.left)/r.width-0.5)*10+"px,"+((e.clientY-r.top)/r.height-0.5)*6+"px)"; }); b.addEventListener("mouseleave",function(){ ic.style.transform=""; }); });',

  chevron:
'/* Chevron Reveal — выезжает «›» справа */\n' +
'.side-btn { position:relative; overflow:hidden; transition:color var(--dur-base), padding var(--dur-base) var(--ease-soft), background var(--dur-base); }\n' +
'.side-btn::after { content:"\\203A"; position:absolute; right:14px; font-size:20px; font-weight:700; color:var(--accent); opacity:0; transform:translateX(-8px); transition:opacity var(--dur-base), transform var(--dur-base) var(--ease-spring); }\n' +
'.side-btn:hover { color:#fff; background:rgba(255,255,255,.03); padding-right:30px; }\n' +
'.side-btn:hover::after { opacity:1; transform:translateX(0); }',

  aurora:
'/* Aurora Glow — мягкое дышащее свечение */\n' +
'.side-btn { position:relative; overflow:hidden; transition:color var(--dur-base); }\n' +
'.side-btn::before { content:""; position:absolute; inset:-1px; border-radius:inherit; pointer-events:none; background:radial-gradient(ellipse at 20% 50%,rgba(11,196,227,.22),transparent 70%); opacity:0; transition:opacity var(--dur-mid) var(--ease-soft); }\n' +
'.side-btn:hover { color:#fff; }\n' +
'.side-btn:hover::before { opacity:1; animation:sb-breathe 2.6s var(--ease-soft) infinite; }\n' +
'@keyframes sb-breathe { 0%,100%{opacity:.45} 50%{opacity:1} }',

  frost:
'/* Frost Glass — матовое стекло + светлая рамка */\n' +
'.side-btn { transition:background var(--dur-base), color var(--dur-base), box-shadow var(--dur-base); }\n' +
'.side-btn:hover { background:rgba(255,255,255,.07); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); color:#fff; box-shadow:inset 0 0 0 1px rgba(255,255,255,.18); }',

  underline:
'/* Ink Underline — выезжает линия под текстом (нужен <span> вокруг подписи) */\n' +
'.side-btn { transition:color var(--dur-base); }\n' +
'.side-btn .side-label { position:relative; }\n' +
'.side-btn .side-label::after { content:""; position:absolute; left:0; right:0; bottom:-3px; height:2px; border-radius:2px; background:var(--accent); box-shadow:0 0 8px var(--accent-glow); transform:scaleX(0); transform-origin:left; transition:transform var(--dur-base) var(--ease-snap); }\n' +
'.side-btn:hover { color:#fff; }\n' +
'.side-btn:hover .side-label::after { transform:scaleX(1); }\n' +
'/* ВАЖНО: текст кнопки оберни в <span class="side-label">…</span> */',

  depth:
'/* Depth Lift — строка поднимается к тебе */\n' +
'.side-btn { transition:transform var(--dur-base) var(--ease-spring), background var(--dur-base), box-shadow var(--dur-base) var(--ease-soft), color var(--dur-base); }\n' +
'.side-btn:hover { background:rgba(255,255,255,.05); color:#fff; transform:translateY(-3px) scale(1.02); box-shadow:0 10px 24px rgba(0,0,0,.5),0 0 0 1px var(--accent-border); }',

  spread:
'/* Letter Spread — буквы расходятся, иконка в акцент (нужен <span> вокруг подписи) */\n' +
'.side-btn { transition:color var(--dur-base), background var(--dur-base); }\n' +
'.side-btn .side-label { transition:letter-spacing var(--dur-mid) var(--ease-soft); }\n' +
'.side-btn .side-icon { transition:color var(--dur-base), transform var(--dur-base) var(--ease-spring); }\n' +
'.side-btn:hover { color:#fff; background:rgba(255,255,255,.03); }\n' +
'.side-btn:hover .side-label { letter-spacing:1.4px; }\n' +
'.side-btn:hover .side-icon { color:var(--accent); transform:scale(1.1); }\n' +
'/* ВАЖНО: текст кнопки оберни в <span class="side-label">…</span> */',

  gold:
'/* Gold Emboss — тёплый золотой свет */\n' +
'.side-btn { transition:background var(--dur-base), color var(--dur-base), box-shadow var(--dur-base); }\n' +
'.side-btn:hover { background:linear-gradient(90deg,rgba(200,155,60,.16),transparent 80%); color:#FFF4DC; box-shadow:inset 1px 0 0 #C89B3C,inset 0 0 22px rgba(200,155,60,.12); }\n' +
'.side-btn:hover .side-icon { filter:drop-shadow(0 0 6px rgba(200,155,60,.5)); }',

  wipe:
'/* Color Wipe — текст перекрашивается слева направо (нужны <span> вокруг подписи) */\n' +
'.side-btn { transition:background var(--dur-base); }\n' +
'.side-btn .side-label, .side-btn .side-icon { background:linear-gradient(90deg,#fff 50%,var(--text-secondary) 50%); background-size:200% 100%; background-position:100% 0; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; transition:background-position var(--dur-mid) var(--ease-snap); }\n' +
'.side-btn:hover { background:rgba(255,255,255,.03); }\n' +
'.side-btn:hover .side-label, .side-btn:hover .side-icon { background-position:0 0; }\n' +
'/* ВАЖНО: текст кнопки оберни в <span class="side-label">…</span> */',

  halo:
'/* Halo Icon — световое кольцо вокруг иконки */\n' +
'.side-btn { transition:color var(--dur-base), background var(--dur-base); }\n' +
'.side-btn .side-icon { border-radius:50%; transition:transform var(--dur-base) var(--ease-spring), box-shadow var(--dur-base); }\n' +
'.side-btn:hover { color:#fff; background:rgba(255,255,255,.03); }\n' +
'.side-btn:hover .side-icon { transform:scale(1.15); box-shadow:0 0 0 2px var(--accent-border),0 0 14px var(--accent-glow); }',

  neon:
'/* Neon Trace — бегущая градиентная рамка */\n' +
'.side-btn { position:relative; overflow:hidden; transition:color var(--dur-base); }\n' +
'.side-btn::before { content:""; position:absolute; inset:0; border-radius:inherit; padding:1px; pointer-events:none; background:conic-gradient(from 0deg,transparent 0deg,var(--accent) 60deg,transparent 140deg); -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0); -webkit-mask-composite:xor; mask-composite:exclude; opacity:0; transition:opacity var(--dur-base); }\n' +
'.side-btn:hover { color:#fff; }\n' +
'.side-btn:hover::before { opacity:1; animation:sb-spin 2.4s linear infinite; }\n' +
'@keyframes sb-spin { to{transform:rotate(1turn)} }',

  scan:
'/* Holo Scan — полоса проходит снизу вверх */\n' +
'.side-btn { position:relative; overflow:hidden; transition:color var(--dur-base); }\n' +
'.side-btn::after { content:""; position:absolute; left:0; right:0; height:40%; border-radius:inherit; pointer-events:none; background:linear-gradient(transparent,rgba(11,196,227,.22),transparent); top:100%; opacity:0; transition:opacity var(--dur-fast); }\n' +
'.side-btn:hover { color:#fff; }\n' +
'.side-btn:hover::after { opacity:1; animation:sb-scan 1.3s var(--ease-mat) infinite; }\n' +
'@keyframes sb-scan { from{top:100%} to{top:-40%} }'
};

/* ── Рендер ── */
function buildNav(v) {
  var nav = document.createElement('div');
  nav.className = 'sl-nav ' + v.v;
  var rows = v.sample === 'colored' ? COLORED_SAMPLE : SAMPLE;
  rows.forEach(function (r) {
    if (r.sec) {
      var s = document.createElement('div');
      s.className = 'sl-section';
      s.textContent = r.sec;
      nav.appendChild(s);
      return;
    }
    var b = document.createElement('button');
    b.className = 'sb' + (r.cls ? ' ' + r.cls : '');
    b.type = 'button';
    b.innerHTML =
      '<span class="ic">' + r.ic + '</span>' +
      '<span class="lbl">' + r.lbl + '</span>' +
      (r.badge ? '<span class="badge">' + r.badge + '</span>' : '');
    nav.appendChild(b);
  });
  return nav;
}

function attachJS(nav, kind) {
  var btns = nav.querySelectorAll('.sb');
  if (kind === 'spotlight') {
    btns.forEach(function (b) {
      b.addEventListener('mousemove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
        b.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
      });
    });
  } else if (kind === 'magnetic') {
    btns.forEach(function (b) {
      var ic = b.querySelector('.ic');
      b.addEventListener('mousemove', function (e) {
        var r = b.getBoundingClientRect();
        ic.style.transform = 'translate(' + ((e.clientX - r.left) / r.width - 0.5) * 10 + 'px,' +
          ((e.clientY - r.top) / r.height - 0.5) * 6 + 'px)';
      });
      b.addEventListener('mouseleave', function () { ic.style.transform = ''; });
    });
  }
}

function renderCard(wrap, v) {
  var card = document.createElement('section');
  card.className = 'sl-card' + (v.featured ? ' featured' : '');

  var head = document.createElement('div');
  head.className = 'sl-card-head';
  head.innerHTML =
    '<div class="sl-card-meta">' +
    '<div class="sl-name">' + v.name +
    (v.tag ? '<span class="sl-tag' + (v.best ? ' best' : '') + '">' + v.tag + '</span>' : '') +
    '</div>' +
    '<p class="sl-desc">' + v.desc + '</p>' +
    '</div>';

  if (SNIPPETS[v.id]) {
    var btn = document.createElement('button');
    btn.className = 'sl-copy';
    btn.textContent = 'Скопировать CSS';
    btn.addEventListener('click', function () {
      navigator.clipboard.writeText(SNIPPETS[v.id]).then(function () {
        btn.textContent = '✓ Скопировано';
        btn.classList.add('done');
        setTimeout(function () { btn.textContent = 'Скопировать CSS'; btn.classList.remove('done'); }, 1600);
      });
    });
    head.appendChild(btn);
  }
  card.appendChild(head);

  var frame = document.createElement('div');
  frame.className = 'sl-nav-frame';
  var nav = buildNav(v);
  frame.appendChild(nav);
  card.appendChild(frame);
  wrap.appendChild(card);

  if (v.js) attachJS(nav, v.js);
}

function renderGroup(wrap, title, desc) {
  var g = document.createElement('div');
  g.className = 'sl-group';
  g.innerHTML = '<h2>' + title + '</h2>' + (desc ? '<p>' + desc + '</p>' : '');
  wrap.appendChild(g);
}

function render() {
  var wrap = document.getElementById('slWrap');
  wrap.innerHTML = '';
  renderGroup(wrap, 'Обычные кнопки сайдбара',
    'Combo Premium уже стоит в боевом для обычных кнопок. Здесь можно сравнить с другими вариантами.');
  VARIANTS.forEach(function (v) { renderCard(wrap, v); });

  renderGroup(wrap, 'Цветные кнопки — варианты покруче',
    'Тир, чат, драфт, серии, киберспорт — у каждой свой цвет слева. Здесь каждый эффект играет цветом конкретной кнопки. Выбери лучший — впишу в боевой как надо (специфика CSS, поэтому без кнопки «Скопировать»).');
  COLORED_VARIANTS.forEach(function (v) { renderCard(wrap, v); });
}

/* ── Контролы ── */
var speed = document.getElementById('slSpeed');
var speedVal = document.getElementById('slSpeedVal');
speed.addEventListener('input', function () {
  document.documentElement.style.setProperty('--spd', speed.value);
  speedVal.textContent = parseFloat(speed.value).toFixed(1) + '×';
});

function setAccent(rgb) {
  document.documentElement.style.setProperty('--accent-rgb', rgb);
}
document.getElementById('slSwatches').addEventListener('click', function (e) {
  var sw = e.target.closest('.sl-sw');
  if (!sw) return;
  this.querySelectorAll('.sl-sw').forEach(function (s) { s.classList.remove('active'); });
  sw.classList.add('active');
  setAccent(sw.dataset.accent);
});
document.getElementById('slCustom').addEventListener('input', function () {
  var h = this.value.replace('#', '');
  var rgb = parseInt(h.substr(0, 2), 16) + ',' + parseInt(h.substr(2, 2), 16) + ',' + parseInt(h.substr(4, 2), 16);
  setAccent(rgb);
  document.querySelectorAll('.sl-sw').forEach(function (s) { s.classList.remove('active'); });
});
document.getElementById('slDim').addEventListener('change', function () {
  document.body.classList.toggle('dim', this.checked);
});

render();
