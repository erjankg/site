'use strict';

/* ── Образцы рун (реальные иконки с боевого) ── */
var RUNE_BASE = 'https://www.wildriftfire.com/images/runes/';
var RUNES = [
  ['electrocute', 'Электрокут'],
  ['conqueror', 'Завоеватель'],
  ['grasp-of-the-undying', 'Хватка бессмертного'],
  ['fleet-footwork', 'Скороход'],
  ['dark-harvest', 'Тёмная жатва'],
  ['arcane-comet', 'Тайная комета'],
  ['glacial-augment', 'Ледяной доспех'],
  ['first-strike', 'Первый удар'],
  ['aery', 'Пушинка'],
  ['lethal-tempo', 'Смертельный темп']
];

/* ── Варианты hover-анимаций ── */
var VARIANTS = [
  { id: 'shine', name: 'Shine Sweep', tag: 'текущая', desc: 'Диагональный блик пробегает по карточке + лёгкий подъём и свечение. То, что сейчас на сайте.' },
  { id: 'lift', name: 'Lift & Glow', desc: 'Чистый минимализм: карточка приподнимается, рамка и иконка мягко светятся. Спокойно и дорого.' },
  { id: 'spotlight', name: 'Cursor Spotlight', js: true, desc: 'Пятно света следует за курсором внутри карточки. Живо, тактильно.' },
  { id: 'tilt', name: '3D Tilt', js: true, desc: 'Карточка наклоняется в сторону курсора, иконка чуть выезжает вперёд. Эффект глубины.' },
  { id: 'magnetic', name: 'Magnetic Pull', js: true, desc: 'Карточка слегка притягивается к курсору. Ощущение «магнита».' },
  { id: 'sparkle', name: 'Sparkle Burst', js: true, desc: 'Искры-звёздочки разлетаются от карточки. Быстро, сверкающе, празднично.' },
  { id: 'ring', name: 'Pulse Ring', desc: 'От карточки расходится одно аккуратное кольцо-импульс. Сигнал «выбрано».' },
  { id: 'conic', name: 'Conic Border', desc: 'По рамке бежит вращающийся градиентный блик. Премиально и заметно.' },
  { id: 'reveal', name: 'Color Reveal', desc: 'Иконка из чёрно-белой превращается в цветную с лёгким зумом. Фокус на наведённом.' },
  { id: 'holo', name: 'Holo Scanline', desc: 'Голографическая полоса-скан бежит вверх по карточке. Футуристично.' },
  { id: 'focus', name: 'Focus & Dim', desc: 'Наведённая карточка вырастает, соседние гаснут. Максимальный акцент на одной.' },
  { id: 'label', name: 'Label Reveal', desc: 'Снизу выезжает название руны. Информативно — полезно для предметов.' }
];

/* ── CSS-сниппеты для кнопки «Скопировать CSS» (готовы к вставке в styles.css) ── */
var SNIPPETS = {
  shine:
'.rune-card { overflow:hidden; transition:transform var(--dur-base) var(--ease-spring), border-color var(--dur-base) var(--ease-snap), box-shadow var(--dur-base) var(--ease-snap); }\n' +
'.rune-card::after { content:""; position:absolute; inset:0; background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.14) 50%,transparent 70%); transform:translateX(-110%); opacity:0; pointer-events:none; border-radius:inherit; transition:opacity var(--dur-fast) var(--ease-snap), transform .65s var(--ease-soft); }\n' +
'.rune-card:hover { border-color:var(--accent); transform:translateY(-2px) scale(1.07); box-shadow:var(--shadow-md),0 0 18px var(--accent-glow); z-index:2; }\n' +
'.rune-card:hover::after { opacity:1; transform:translateX(110%); }',
  lift:
'.rune-card { transition:transform var(--dur-base) var(--ease-spring), border-color var(--dur-base) var(--ease-snap), box-shadow var(--dur-base) var(--ease-snap); }\n' +
'.rune-card:hover { transform:translateY(-4px); border-color:var(--accent-border-str); box-shadow:0 10px 22px rgba(0,0,0,.45),0 0 0 1px var(--accent-border),0 0 20px var(--accent-glow); z-index:2; }\n' +
'.rune-card:hover img { filter:drop-shadow(0 0 6px var(--accent-glow)); }',
  spotlight:
'/* CSS */\n.rune-card { overflow:hidden; transition:transform var(--dur-base) var(--ease-snap), border-color var(--dur-base) var(--ease-snap); }\n' +
'.rune-card::before { content:""; position:absolute; inset:0; background:radial-gradient(120px circle at var(--mx,50%) var(--my,50%),rgba(11,196,227,.35),transparent 60%); opacity:0; pointer-events:none; border-radius:inherit; transition:opacity var(--dur-base) var(--ease-snap); }\n' +
'.rune-card:hover { border-color:var(--accent-border-str); transform:scale(1.05); z-index:2; }\n' +
'.rune-card:hover::before { opacity:1; }\n' +
'/* JS */\ndocument.querySelectorAll(".rune-card").forEach(function(c){ c.addEventListener("mousemove",function(e){ var r=c.getBoundingClientRect(); c.style.setProperty("--mx",((e.clientX-r.left)/r.width*100)+"%"); c.style.setProperty("--my",((e.clientY-r.top)/r.height*100)+"%"); }); });',
  tilt:
'/* CSS — на контейнер .rune-grid добавь perspective:600px */\n.rune-grid { perspective:600px; }\n.rune-card { transition:transform var(--dur-base) var(--ease-soft), box-shadow var(--dur-base), border-color var(--dur-base); transform-style:preserve-3d; }\n' +
'.rune-card:hover { border-color:var(--accent); box-shadow:var(--shadow-md),0 0 18px var(--accent-glow); z-index:2; }\n' +
'.rune-card:hover img { transform:translateZ(18px); }\n' +
'/* JS */\ndocument.querySelectorAll(".rune-card").forEach(function(c){ c.addEventListener("mousemove",function(e){ var r=c.getBoundingClientRect(); var px=(e.clientX-r.left)/r.width-0.5, py=(e.clientY-r.top)/r.height-0.5; c.style.transform="rotateY("+(px*16)+"deg) rotateX("+(-py*16)+"deg) scale(1.05)"; }); c.addEventListener("mouseleave",function(){ c.style.transform=""; }); });',
  magnetic:
'/* CSS */\n.rune-card { transition:transform var(--dur-base) var(--ease-soft), box-shadow var(--dur-base), border-color var(--dur-base); }\n' +
'.rune-card:hover { border-color:var(--accent); box-shadow:0 8px 20px rgba(0,0,0,.4),0 0 16px var(--accent-glow); z-index:2; }\n' +
'/* JS */\ndocument.querySelectorAll(".rune-card").forEach(function(c){ c.addEventListener("mousemove",function(e){ var r=c.getBoundingClientRect(); var px=(e.clientX-r.left)/r.width-0.5, py=(e.clientY-r.top)/r.height-0.5; c.style.transform="translate("+(px*10)+"px,"+(py*10)+"px) scale(1.06)"; }); c.addEventListener("mouseleave",function(){ c.style.transform=""; }); });',
  sparkle:
'/* CSS */\n.rune-card { overflow:visible; transition:transform var(--dur-base) var(--ease-spring), border-color var(--dur-base), box-shadow var(--dur-base); }\n' +
'.rune-card:hover { transform:translateY(-2px) scale(1.06); border-color:var(--accent); box-shadow:var(--shadow-md),0 0 22px var(--accent-glow); z-index:3; }\n' +
'.spark { position:absolute; width:6px; height:6px; pointer-events:none; background:linear-gradient(#fff,#fff) center/100% 1.4px no-repeat,linear-gradient(#fff,#fff) center/1.4px 100% no-repeat; filter:drop-shadow(0 0 4px var(--accent)); transform:translate(-50%,-50%) scale(0); animation:spark-fly .62s var(--ease-soft) forwards; }\n' +
'@keyframes spark-fly { 0%{transform:translate(-50%,-50%) scale(0) rotate(0);opacity:0} 25%{opacity:1} 60%{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(1) rotate(120deg);opacity:1} 100%{transform:translate(calc(-50% + var(--dx)*1.4),calc(-50% + var(--dy)*1.4)) scale(0) rotate(200deg);opacity:0} }\n' +
'/* JS — спавн искр при наведении */\ndocument.querySelectorAll(".rune-card").forEach(function(c){ c.addEventListener("mouseenter",function(){ for(var i=0;i<8;i++){ var s=document.createElement("span"); s.className="spark"; var a=Math.random()*6.28, d=18+Math.random()*16; s.style.left=(20+Math.random()*60)+"%"; s.style.top=(20+Math.random()*60)+"%"; s.style.setProperty("--dx",Math.cos(a)*d+"px"); s.style.setProperty("--dy",Math.sin(a)*d+"px"); c.appendChild(s); setTimeout(function(el){return function(){el.remove();};}(s),650); } }); });',
  ring:
'.rune-card { transition:transform var(--dur-base) var(--ease-spring), border-color var(--dur-base); }\n' +
'.rune-card::after { content:""; position:absolute; inset:0; border-radius:inherit; border:2px solid var(--accent); opacity:0; pointer-events:none; }\n' +
'.rune-card:hover { transform:scale(1.05); border-color:var(--accent-border-str); z-index:2; }\n' +
'.rune-card:hover::after { animation:ring .6s var(--ease-soft); }\n' +
'@keyframes ring { 0%{opacity:.9;transform:scale(1)} 100%{opacity:0;transform:scale(1.55)} }',
  conic:
'.rune-card { transition:transform var(--dur-base) var(--ease-snap); }\n' +
'.rune-card::before { content:""; position:absolute; inset:-1.5px; border-radius:inherit; padding:1.5px; background:conic-gradient(from 0deg,transparent,var(--accent),transparent 40%); -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0); -webkit-mask-composite:xor; mask-composite:exclude; opacity:0; pointer-events:none; transition:opacity var(--dur-base); }\n' +
'.rune-card:hover { transform:scale(1.05); z-index:2; }\n' +
'.rune-card:hover::before { opacity:1; animation:spin 1.6s linear infinite; }\n' +
'@keyframes spin { to{transform:rotate(1turn)} }',
  reveal:
'.rune-card { transition:transform var(--dur-base) var(--ease-spring), border-color var(--dur-base); }\n' +
'.rune-card img { filter:grayscale(1) brightness(.75); transition:filter var(--dur-mid) var(--ease-snap), transform var(--dur-base) var(--ease-spring); }\n' +
'.rune-card:hover { border-color:var(--accent); z-index:2; }\n' +
'.rune-card:hover img { filter:grayscale(0) brightness(1); transform:scale(1.12); }',
  holo:
'.rune-card { overflow:hidden; transition:transform var(--dur-base) var(--ease-snap), border-color var(--dur-base), box-shadow var(--dur-base); }\n' +
'.rune-card::after { content:""; position:absolute; left:0; right:0; height:45%; top:100%; background:linear-gradient(to top,transparent,rgba(11,196,227,.28),transparent); pointer-events:none; opacity:0; }\n' +
'.rune-card:hover { border-color:var(--accent-border-str); box-shadow:inset 0 0 18px rgba(11,196,227,.18); z-index:2; }\n' +
'.rune-card:hover::after { animation:scan .9s var(--ease-soft) infinite; }\n' +
'@keyframes scan { 0%{top:100%;opacity:0} 20%{opacity:1} 100%{top:-45%;opacity:0} }',
  focus:
'.rune-grid:hover .rune-card { opacity:.4; filter:saturate(.6); }\n' +
'.rune-card { transition:transform var(--dur-base) var(--ease-spring), opacity var(--dur-base), filter var(--dur-base), border-color var(--dur-base), box-shadow var(--dur-base); }\n' +
'.rune-card:hover { opacity:1; filter:none; transform:scale(1.12); border-color:var(--accent); box-shadow:var(--shadow-md),0 0 18px var(--accent-glow); z-index:3; }',
  label:
'/* Требует <div class="rune-card-name"> внутри карточки */\n.rune-card { overflow:hidden; transition:transform var(--dur-base) var(--ease-spring), border-color var(--dur-base); }\n' +
'.rune-card-name { position:absolute; left:0; right:0; bottom:0; display:block; font-size:9px; font-weight:700; padding:3px 2px; background:linear-gradient(to top,rgba(1,10,19,.95),transparent); color:var(--accent); transform:translateY(100%); opacity:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; transition:transform var(--dur-base) var(--ease-soft), opacity var(--dur-base); }\n' +
'.rune-card:hover { transform:translateY(-2px); border-color:var(--accent); z-index:2; }\n' +
'.rune-card:hover .rune-card-name { transform:translateY(0); opacity:1; }'
};

/* ── Построение разметки ── */
function buildCard(rune) {
  var src = RUNE_BASE + rune[0] + '.png';
  var fallback = "this.onerror=null;this.style.cssText='width:40px;height:40px;background:var(--accent-border);border-radius:50%;display:block;margin:0 auto;'";
  return '<div class="h-card" title="' + rune[1] + '">' +
           '<img src="' + src + '" alt="' + rune[1] + '" loading="lazy" onerror="' + fallback + '">' +
           '<span class="h-name">' + rune[1] + '</span>' +
         '</div>';
}

function buildVariant(v, idx) {
  var cards = RUNES.map(buildCard).join('');
  var tag = '';
  if (v.tag) tag += '<span class="hl-tag">' + v.tag + '</span>';
  if (v.js)  tag += '<span class="hl-tag js">JS</span>';
  return '<section class="hl-variant">' +
    '<div class="hl-variant-head">' +
      '<div class="hl-variant-num">' + (idx + 1) + '</div>' +
      '<div class="hl-variant-meta">' +
        '<div class="hl-variant-name">' + v.name + tag + '</div>' +
        '<p class="hl-variant-desc">' + v.desc + '</p>' +
      '</div>' +
      '<button class="hl-copy" data-snip="' + v.id + '">Скопировать CSS</button>' +
    '</div>' +
    '<div class="hl-grid v-' + v.id + '" data-variant="' + v.id + '">' + cards + '</div>' +
  '</section>';
}

var wrap = document.getElementById('hlWrap');
wrap.innerHTML = VARIANTS.map(buildVariant).join('');

/* ── Кнопка копирования CSS ── */
wrap.addEventListener('click', function (e) {
  var btn = e.target.closest('.hl-copy');
  if (!btn) return;
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
});

/* ── Интерактив для JS-вариантов (делегирование на window) ── */
function cardLocal(card, e) {
  var r = card.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height, r: r };
}

document.addEventListener('mousemove', function (e) {
  var card = e.target.closest && e.target.closest('.h-card');
  if (!card) return;
  var grid = card.parentElement;
  var variant = grid.getAttribute('data-variant');
  var p = cardLocal(card, e);

  if (variant === 'spotlight') {
    card.style.setProperty('--mx', (p.x / p.w * 100) + '%');
    card.style.setProperty('--my', (p.y / p.h * 100) + '%');
  } else if (variant === 'tilt') {
    var px = p.x / p.w - 0.5, py = p.y / p.h - 0.5;
    card.style.transform = 'rotateY(' + (px * 16) + 'deg) rotateX(' + (-py * 16) + 'deg) scale(1.05)';
  } else if (variant === 'magnetic') {
    var mx = p.x / p.w - 0.5, my = p.y / p.h - 0.5;
    card.style.transform = 'translate(' + (mx * 10) + 'px,' + (my * 10) + 'px) scale(1.06)';
  }
}, true);

document.addEventListener('mouseout', function (e) {
  var card = e.target.closest && e.target.closest('.h-card');
  if (!card) return;
  var v = card.parentElement.getAttribute('data-variant');
  if (v === 'tilt' || v === 'magnetic') card.style.transform = '';
});

document.addEventListener('mouseover', function (e) {
  var card = e.target.closest && e.target.closest('.h-card');
  if (!card) return;
  if (card.parentElement.getAttribute('data-variant') !== 'sparkle') return;
  if (card._sparking) return;
  card._sparking = true;
  setTimeout(function () { card._sparking = false; }, 200);
  for (var i = 0; i < 8; i++) {
    var s = document.createElement('span');
    s.className = 'hl-spark';
    var a = Math.random() * 6.283, d = 18 + Math.random() * 16;
    s.style.left = (20 + Math.random() * 60) + '%';
    s.style.top = (20 + Math.random() * 60) + '%';
    s.style.setProperty('--dx', Math.cos(a) * d + 'px');
    s.style.setProperty('--dy', Math.sin(a) * d + 'px');
    card.appendChild(s);
    (function (el) { setTimeout(function () { el.remove(); }, 700); })(s);
  }
});

/* ── Ползунок скорости ── */
var speed = document.getElementById('hlSpeed');
var speedVal = document.getElementById('hlSpeedVal');
speed.addEventListener('input', function () {
  document.documentElement.style.setProperty('--sp', speed.value);
  speedVal.textContent = parseFloat(speed.value).toFixed(1) + '×';
});

/* ── Смена акцентного цвета ── */
var swatches = document.getElementById('hlSwatches');
swatches.addEventListener('click', function (e) {
  var sw = e.target.closest('.hl-sw');
  if (!sw) return;
  swatches.querySelectorAll('.hl-sw').forEach(function (s) { s.classList.remove('active'); });
  sw.classList.add('active');
  var rgb = sw.getAttribute('data-accent');
  var root = document.documentElement.style;
  root.setProperty('--accent', 'rgb(' + rgb + ')');
  root.setProperty('--accent-glow', 'rgba(' + rgb + ',0.4)');
  root.setProperty('--accent-dim', 'rgba(' + rgb + ',0.15)');
  root.setProperty('--accent-border', 'rgba(' + rgb + ',0.2)');
  root.setProperty('--accent-border-sub', 'rgba(' + rgb + ',0.08)');
  root.setProperty('--accent-border-str', 'rgba(' + rgb + ',0.5)');
});
