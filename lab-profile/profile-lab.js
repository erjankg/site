'use strict';

/* ════════════════════════════════════════════════════════════
   Profile-Lab. Один источник правды: у каждого варианта поле css
   с плейсхолдером "&" вместо селектора строки.
     • для превью   "&" → ".v-<id> .pi"  (инжектим в <style>)
     • для копир... "&" → ".user-menu-item" (уходит в буфер)
   Значит то, что видишь, ровно то и копируется в боевой styles.css.
   ════════════════════════════════════════════════════════════ */

/* Строки меню — точь-в-точь как на боевом (для админа) */
var EMAIL = 'erjansatyndiev@gmail.com';
var ROWS = [
  { ic: '👤', lbl: 'Мой профиль' },
  { ic: '🔄', lbl: 'Синхронизировать' },
  { ic: '📋', lbl: 'История изменений' },
  { ic: '⚙',  lbl: 'Настройки лейаута' },
  { ic: '🎚', lbl: 'Редактор позиций' },
  { ic: '🧹', lbl: 'Очистить все патч-ноты' },
  { ic: '🖼', lbl: 'Иконки' },
  { ic: '🔤', lbl: 'Сайдбар' },
  { ic: '🔤', lbl: 'Шрифты сайта' },
  { ic: '🚪', lbl: 'Выйти' }
];

/* ── Варианты ──
   wrap:true  → в снипет добавляется напоминание обернуть текст в <span>. */
var VARIANTS = [

  { id: 'combo', name: 'Combo Premium', tag: 'РЕКОМЕНДУЮ', best: true, featured: true,
    desc: 'Главный кандидат. Строка мягко уезжает вправо, слева вырастает светящаяся полоса, иконка подрастает, справа выезжает «›», лёгкий ореол. Дорого и спокойно — как у топовых продуктов. Тот же язык, что уже стоит в сайдбаре.',
    css:
      '&{ transition: transform var(--dur-base) var(--ease-soft), background var(--dur-base) var(--ease-soft), color var(--dur-base), box-shadow var(--dur-base) var(--ease-soft); }\n' +
      '&::before{ content:""; position:absolute; left:0; top:18%; bottom:18%; width:3px; border-radius:0 3px 3px 0; background:var(--accent); box-shadow:0 0 10px var(--accent-glow); transform:scaleY(0); transition:transform var(--dur-base) var(--ease-spring); }\n' +
      '&::after{ content:"›"; position:absolute; right:12px; top:50%; transform:translate(-6px,-50%); font-size:17px; font-weight:700; color:var(--accent); opacity:0; transition:opacity var(--dur-base), transform var(--dur-base) var(--ease-soft); }\n' +
      '& .ic{ transition:transform var(--dur-base) var(--ease-spring), filter var(--dur-base); }\n' +
      '&:hover{ background:linear-gradient(90deg,var(--accent-dim),transparent 85%); color:#fff; transform:translateX(6px); box-shadow:inset 0 0 0 1px var(--accent-border),0 6px 18px rgba(0,0,0,.35); }\n' +
      '&:hover::before{ transform:scaleY(1); }\n' +
      '&:hover::after{ opacity:1; transform:translate(0,-50%); }\n' +
      '&:hover .ic{ transform:scale(1.18); filter:drop-shadow(0 0 6px var(--accent-glow)); }' },

  { id: 'current', name: 'Текущая', tag: 'сейчас',
    desc: 'То, что на сайте сейчас — просто меняется фон. Для сравнения.',
    css:
      '&{ transition: background var(--dur-base), color var(--dur-base); }\n' +
      '&:hover{ background:var(--accent-dim); color:#fff; }' },

  { id: 'liquid', name: 'Liquid Fill',
    desc: 'Акцентный фон плавно затекает слева направо, как наливается. Минимализм, ноль суеты.',
    css:
      '&{ transition: color var(--dur-base); z-index:0; }\n' +
      '&::before{ content:""; position:absolute; inset:0; z-index:-1; border-radius:inherit; background:linear-gradient(90deg,var(--accent-dim),var(--accent-glow)); transform:scaleX(0); transform-origin:left; transition:transform var(--dur-mid) var(--ease-snap); }\n' +
      '&:hover{ color:#fff; }\n' +
      '&:hover::before{ transform:scaleX(1); }' },

  { id: 'indent', name: 'Indent & Bar',
    desc: 'Строка сдвигается вправо, слева вырастает тонкая полоса. Классика премиум-навигации.',
    css:
      '&{ transition: transform var(--dur-base) var(--ease-soft), color var(--dur-base); }\n' +
      '&::before{ content:""; position:absolute; left:0; top:0; bottom:0; width:3px; background:var(--accent); transform:scaleY(0); transform-origin:bottom; transition:transform var(--dur-base) var(--ease-snap); }\n' +
      '&:hover{ transform:translateX(8px); color:#fff; }\n' +
      '&:hover::before{ transform:scaleY(1); }' },

  { id: 'sheen', name: 'Glass Sheen',
    desc: 'По строке один раз пробегает диагональный световой блик + микроподъём. Эффект стекла.',
    css:
      '&{ transition: transform var(--dur-base) var(--ease-soft), background var(--dur-base), color var(--dur-base); }\n' +
      '&::after{ content:""; position:absolute; inset:0; border-radius:inherit; pointer-events:none; background:linear-gradient(110deg,transparent 35%,rgba(255,255,255,.14) 50%,transparent 65%); transform:translateX(-120%); transition:transform var(--dur-slow) var(--ease-soft); }\n' +
      '&:hover{ background:rgba(255,255,255,.04); color:#fff; transform:translateY(-1px); }\n' +
      '&:hover::after{ transform:translateX(120%); }' },

  { id: 'spotlight', js: 'spotlight', name: 'Cursor Spotlight',
    desc: 'Мягкое пятно света следует за курсором вдоль строки. Тактильно, реагирует на тебя.',
    css:
      '&{ transition: color var(--dur-base); }\n' +
      '&::before{ content:""; position:absolute; inset:0; border-radius:inherit; pointer-events:none; background:radial-gradient(80px circle at var(--mx,50%) var(--my,50%),var(--accent-glow),transparent 70%); opacity:0; transition:opacity var(--dur-base); }\n' +
      '&:hover{ color:#fff; }\n' +
      '&:hover::before{ opacity:.6; }\n' +
      '/* JS: */\n' +
      'document.querySelectorAll(".user-menu-item").forEach(function(b){ b.addEventListener("mousemove",function(e){ var r=b.getBoundingClientRect(); b.style.setProperty("--mx",((e.clientX-r.left)/r.width*100)+"%"); b.style.setProperty("--my",((e.clientY-r.top)/r.height*100)+"%"); }); });' },

  { id: 'magnetic', js: 'magnetic', name: 'Magnetic Icon',
    desc: 'Иконка слегка тянется к курсору, как магнит. Незаметная, но приятная деталь.',
    css:
      '&{ transition: background var(--dur-base), color var(--dur-base); }\n' +
      '& .ic{ transition:transform var(--dur-base) var(--ease-spring); will-change:transform; }\n' +
      '&:hover{ background:rgba(255,255,255,.04); color:#fff; }\n' +
      '/* JS: */\n' +
      'document.querySelectorAll(".user-menu-item").forEach(function(b){ var ic=b.querySelector(".ic"); if(!ic) return; b.addEventListener("mousemove",function(e){ var r=b.getBoundingClientRect(); ic.style.transform="translate("+((e.clientX-r.left)/r.width-0.5)*8+"px,"+((e.clientY-r.top)/r.height-0.5)*5+"px)"; }); b.addEventListener("mouseleave",function(){ ic.style.transform=""; }); });' },

  { id: 'chevron', name: 'Chevron Reveal',
    desc: 'Справа выезжает стрелка «›», строка чуть раздвигается. Подсказка «можно нажать».',
    css:
      '&{ transition: color var(--dur-base), padding var(--dur-base) var(--ease-soft), background var(--dur-base); }\n' +
      '&::after{ content:"›"; position:absolute; right:12px; top:50%; transform:translate(-8px,-50%); font-size:18px; font-weight:700; color:var(--accent); opacity:0; transition:opacity var(--dur-base), transform var(--dur-base) var(--ease-spring); }\n' +
      '&:hover{ color:#fff; background:rgba(255,255,255,.03); padding-right:28px; }\n' +
      '&:hover::after{ opacity:1; transform:translate(0,-50%); }' },

  { id: 'aurora', name: 'Aurora Glow',
    desc: 'За строкой включается мягкое «дышащее» свечение. Тихо, атмосферно, премиально.',
    css:
      '&{ transition: color var(--dur-base); }\n' +
      '&::before{ content:""; position:absolute; inset:-1px; border-radius:inherit; pointer-events:none; background:radial-gradient(ellipse at 20% 50%,var(--accent-glow),transparent 70%); opacity:0; transition:opacity var(--dur-mid) var(--ease-soft); }\n' +
      '&:hover{ color:#fff; }\n' +
      '&:hover::before{ opacity:1; animation:pl-breathe calc(2.6s * var(--spd)) var(--ease-soft) infinite; }\n' +
      '@keyframes pl-breathe{ 0%,100%{opacity:.45} 50%{opacity:1} }' },

  { id: 'frost', name: 'Frost Glass',
    desc: 'Матовое стекло со светлой внутренней рамкой. Apple-вайб, очень сдержанно.',
    css:
      '&{ transition: background var(--dur-base), color var(--dur-base), box-shadow var(--dur-base); }\n' +
      '&:hover{ background:rgba(255,255,255,.07); -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px); color:#fff; box-shadow:inset 0 0 0 1px rgba(255,255,255,.18); }' },

  { id: 'underline', wrap: true, name: 'Ink Underline',
    desc: 'Под названием выезжает тонкая светящаяся линия. Аккуратно и информативно.',
    css:
      '&{ transition: color var(--dur-base); }\n' +
      '& .lbl{ position:relative; flex:0 0 auto; }\n' +
      '& .lbl::after{ content:""; position:absolute; left:0; right:0; bottom:-3px; height:2px; border-radius:2px; background:var(--accent); box-shadow:0 0 8px var(--accent-glow); transform:scaleX(0); transform-origin:left; transition:transform var(--dur-base) var(--ease-snap); }\n' +
      '&:hover{ color:#fff; }\n' +
      '&:hover .lbl::after{ transform:scaleX(1); }' },

  { id: 'depth', name: 'Depth Lift',
    desc: 'Строка приподнимается к тебе с мягкой тенью. Ощущение глубины и веса.',
    css:
      '&{ transition: transform var(--dur-base) var(--ease-spring), background var(--dur-base), box-shadow var(--dur-base) var(--ease-soft), color var(--dur-base); }\n' +
      '&:hover{ background:rgba(255,255,255,.05); color:#fff; transform:translateY(-3px) scale(1.02); box-shadow:0 10px 24px rgba(0,0,0,.5),0 0 0 1px var(--accent-border); }' },

  { id: 'spread', wrap: true, name: 'Letter Spread',
    desc: 'Буквы названия чуть расходятся, иконка перекрашивается в акцент. Дорогой типографский приём.',
    css:
      '&{ transition: color var(--dur-base), background var(--dur-base); }\n' +
      '& .lbl{ transition:letter-spacing var(--dur-mid) var(--ease-soft); }\n' +
      '& .ic{ transition:color var(--dur-base), transform var(--dur-base) var(--ease-spring); }\n' +
      '&:hover{ color:#fff; background:rgba(255,255,255,.03); }\n' +
      '&:hover .lbl{ letter-spacing:1.2px; }\n' +
      '&:hover .ic{ color:var(--accent); transform:scale(1.1); }' },

  { id: 'gold', name: 'Gold Emboss',
    desc: 'Тёплый золотой внутренний свет вместо циана. Премиум-люкс, «золотая» подача.',
    css:
      '&{ transition: background var(--dur-base), color var(--dur-base), box-shadow var(--dur-base); }\n' +
      '&:hover{ background:linear-gradient(90deg,rgba(200,155,60,.16),transparent 80%); color:#FFF4DC; box-shadow:inset 1px 0 0 #C89B3C,inset 0 0 22px rgba(200,155,60,.12); }\n' +
      '&:hover .ic{ filter:drop-shadow(0 0 6px rgba(200,155,60,.5)); }' },

  { id: 'wipe', wrap: true, name: 'Color Wipe',
    desc: 'Текст и иконка перекрашиваются в белый слева направо, как заливка. Необычно и чисто.',
    css:
      '&{ transition: background var(--dur-base); }\n' +
      '& .lbl, & .ic{ background:linear-gradient(90deg,#fff 50%,rgba(255,255,255,.55) 50%); background-size:200% 100%; background-position:100% 0; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; color:transparent; transition:background-position var(--dur-mid) var(--ease-snap); }\n' +
      '&:hover{ background:rgba(255,255,255,.03); }\n' +
      '&:hover .lbl, &:hover .ic{ background-position:0 0; }' },

  { id: 'halo', name: 'Halo Icon',
    desc: 'Вокруг иконки загорается световое кольцо, иконка подрастает. Фокус на смысле строки.',
    css:
      '&{ transition: color var(--dur-base), background var(--dur-base); }\n' +
      '& .ic{ border-radius:50%; transition:transform var(--dur-base) var(--ease-spring), box-shadow var(--dur-base); }\n' +
      '&:hover{ color:#fff; background:rgba(255,255,255,.03); }\n' +
      '&:hover .ic{ transform:scale(1.15); box-shadow:0 0 0 2px var(--accent-border),0 0 14px var(--accent-glow); }' },

  { id: 'neon', name: 'Neon Trace',
    desc: 'По рамке бежит градиентный неоновый блик. Самый «вау» и заметный — для смелых.',
    css:
      '&{ transition: color var(--dur-base); }\n' +
      '&::before{ content:""; position:absolute; inset:0; border-radius:inherit; padding:1px; pointer-events:none; background:conic-gradient(from 0deg,transparent 0deg,var(--accent) 60deg,transparent 140deg); -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0); -webkit-mask-composite:xor; mask-composite:exclude; opacity:0; transition:opacity var(--dur-base); }\n' +
      '&:hover{ color:#fff; }\n' +
      '&:hover::before{ opacity:1; animation:pl-spin calc(2.4s * var(--spd)) linear infinite; }\n' +
      '@keyframes pl-spin{ to{transform:rotate(1turn)} }' },

  { id: 'scan', name: 'Holo Scan',
    desc: 'Голографическая полоса проходит по строке снизу вверх. Технологично, футуристично.',
    css:
      '&{ transition: color var(--dur-base); }\n' +
      '&::after{ content:""; position:absolute; left:0; right:0; height:40%; border-radius:inherit; pointer-events:none; background:linear-gradient(transparent,var(--accent-glow),transparent); top:100%; opacity:0; transition:opacity var(--dur-fast); }\n' +
      '&:hover{ color:#fff; }\n' +
      '&:hover::after{ opacity:1; animation:pl-scan calc(1.3s * var(--spd)) var(--ease-mat) infinite; }\n' +
      '@keyframes pl-scan{ from{top:100%} to{top:-40%} }' },

  { id: 'pill', name: 'Pill Pop',
    desc: 'Из центра раскрывается мягкая капсула-подсветка, строка чуть подрастает. Игриво и чисто.',
    css:
      '&{ transition: color var(--dur-base), transform var(--dur-base) var(--ease-spring); z-index:0; }\n' +
      '&::before{ content:""; position:absolute; inset:0; z-index:-1; border-radius:inherit; background:var(--accent-dim); transform:scale(.6); opacity:0; transition:transform var(--dur-base) var(--ease-spring), opacity var(--dur-base); }\n' +
      '&:hover{ color:#fff; transform:scale(1.03); }\n' +
      '&:hover::before{ transform:scale(1); opacity:1; }' },

  { id: 'border', name: 'Border Draw',
    desc: 'Тонкая акцентная рамка обрисовывает строку по периметру. Строго и технологично.',
    css:
      '&{ transition: color var(--dur-base), background var(--dur-base); }\n' +
      '&::before{ content:""; position:absolute; inset:0; border-radius:inherit; pointer-events:none; border:1px solid var(--accent); clip-path:inset(0 100% 100% 0); transition:clip-path var(--dur-mid) var(--ease-snap); }\n' +
      '&:hover{ color:#fff; background:rgba(255,255,255,.02); }\n' +
      '&:hover::before{ clip-path:inset(0 0 0 0); }' },

  { id: 'glow', name: 'Text Glow',
    desc: 'Текст и иконка мягко загораются акцентом, без фона. Минимум, но строка «оживает».',
    css:
      '&{ transition: color var(--dur-base), text-shadow var(--dur-base); }\n' +
      '& .ic{ transition:filter var(--dur-base), transform var(--dur-base) var(--ease-spring); }\n' +
      '&:hover{ color:var(--accent); text-shadow:0 0 12px var(--accent-glow); }\n' +
      '&:hover .ic{ filter:drop-shadow(0 0 8px var(--accent-glow)); transform:scale(1.1); }' },

  { id: 'shift', name: 'Gradient Shift',
    desc: 'Тёмно-акцентный градиент на фоне медленно сдвигается. Спокойный «живой» фон.',
    css:
      '&{ transition: color var(--dur-base); }\n' +
      '&::before{ content:""; position:absolute; inset:0; z-index:-1; border-radius:inherit; background:linear-gradient(90deg,var(--accent-dim),rgba(255,255,255,.04),var(--accent-dim)); background-size:200% 100%; background-position:100% 0; opacity:0; transition:opacity var(--dur-base); }\n' +
      '&:hover{ color:#fff; }\n' +
      '&:hover::before{ opacity:1; animation:pl-shift calc(3s * var(--spd)) linear infinite; }\n' +
      '@keyframes pl-shift{ to{background-position:-100% 0} }' },

  { id: 'dot', name: 'Leading Dot',
    desc: 'Слева возникает аккуратная светящаяся точка-маркер, текст слегка сдвигается. Тихий акцент.',
    css:
      '&{ transition: color var(--dur-base), padding-left var(--dur-base) var(--ease-soft); }\n' +
      '&::before{ content:""; position:absolute; left:6px; top:50%; width:6px; height:6px; border-radius:50%; background:var(--accent); box-shadow:0 0 8px var(--accent-glow); transform:translateY(-50%) scale(0); transition:transform var(--dur-base) var(--ease-spring); }\n' +
      '&:hover{ color:#fff; padding-left:20px; }\n' +
      '&:hover::before{ transform:translateY(-50%) scale(1); }' },

  { id: 'zoom', name: 'Soft Zoom',
    desc: 'Вся строка плавно чуть приближается с лёгкой подсветкой. Самый простой и безотказный.',
    css:
      '&{ transition: transform var(--dur-base) var(--ease-soft), background var(--dur-base), color var(--dur-base); }\n' +
      '&:hover{ transform:scale(1.04); background:var(--accent-dim); color:#fff; }' },

  { id: 'flip', name: 'Icon Flip',
    desc: 'Иконка эффектно переворачивается по оси Y, строка подсвечивается. Внимание на иконку.',
    css:
      '&{ transition: background var(--dur-base), color var(--dur-base); }\n' +
      '& .ic{ transition:transform var(--dur-mid) var(--ease-snap); }\n' +
      '&:hover{ background:rgba(255,255,255,.04); color:#fff; }\n' +
      '&:hover .ic{ transform:rotateY(360deg) scale(1.1); }' },

  { id: 'ripple', name: 'Ripple Tint',
    desc: 'Из-под курсора расходится мягкая радиальная заливка по всей строке. Тёплый «отклик».',
    css:
      '&{ transition: color var(--dur-base); z-index:0; }\n' +
      '&::before{ content:""; position:absolute; left:50%; top:50%; width:0; height:0; z-index:-1; border-radius:50%; background:var(--accent-dim); transform:translate(-50%,-50%); transition:width var(--dur-mid) var(--ease-snap), height var(--dur-mid) var(--ease-snap); }\n' +
      '&:hover{ color:#fff; }\n' +
      '&:hover::before{ width:320px; height:320px; }' },

  { id: 'stripe', name: 'Diagonal Stripes',
    desc: 'На фоне мягко проступает диагональная штриховка акцентом. Декоративно, но сдержанно.',
    css:
      '&{ transition: color var(--dur-base); }\n' +
      '&::before{ content:""; position:absolute; inset:0; z-index:-1; border-radius:inherit; background:repeating-linear-gradient(45deg,var(--accent-dim) 0,var(--accent-dim) 2px,transparent 2px,transparent 8px); opacity:0; transition:opacity var(--dur-base); }\n' +
      '&:hover{ color:#fff; }\n' +
      '&:hover::before{ opacity:1; }' },

  { id: 'dual', name: 'Dual Accent',
    desc: 'Две полоски — слева и справа — одновременно вырастают навстречу. Симметрично и собранно.',
    css:
      '&{ transition: color var(--dur-base), background var(--dur-base); }\n' +
      '&::before, &::after{ content:""; position:absolute; top:22%; bottom:22%; width:3px; background:var(--accent); box-shadow:0 0 8px var(--accent-glow); transform:scaleY(0); transition:transform var(--dur-base) var(--ease-spring); }\n' +
      '&::before{ left:0; border-radius:0 3px 3px 0; }\n' +
      '&::after{ right:0; border-radius:3px 0 0 3px; }\n' +
      '&:hover{ color:#fff; background:rgba(255,255,255,.03); }\n' +
      '&:hover::before, &:hover::after{ transform:scaleY(1); }' },

  { id: 'lift-bar', name: 'Lift & Bar',
    desc: 'Combo «лайт»: строка приподнимается + слева светится полоса, без стрелки. Чуть спокойнее главного.',
    css:
      '&{ transition: transform var(--dur-base) var(--ease-soft), background var(--dur-base), box-shadow var(--dur-base) var(--ease-soft), color var(--dur-base); }\n' +
      '&::before{ content:""; position:absolute; left:0; top:20%; bottom:20%; width:3px; border-radius:0 3px 3px 0; background:var(--accent); box-shadow:0 0 10px var(--accent-glow); transform:scaleX(0); transform-origin:left; transition:transform var(--dur-base) var(--ease-spring); }\n' +
      '&:hover{ transform:translateY(-2px); background:rgba(255,255,255,.04); color:#fff; box-shadow:0 8px 20px rgba(0,0,0,.4); }\n' +
      '&:hover::before{ transform:scaleX(1); }' },

  { id: 'icon-slide', name: 'Icon Slide-In',
    desc: 'Иконка въезжает слева, текст уступает ей место. Деликатное «появление» элемента.',
    css:
      '&{ transition: color var(--dur-base), background var(--dur-base); }\n' +
      '& .ic{ transition:transform var(--dur-base) var(--ease-spring), opacity var(--dur-base); transform:translateX(-4px); opacity:.7; }\n' +
      '&:hover{ color:#fff; background:rgba(255,255,255,.03); }\n' +
      '&:hover .ic{ transform:translateX(0) scale(1.12); opacity:1; }' }
];

/* ── Инжект всех вариантов в один <style> (один источник правды) ── */
(function injectVariantStyles() {
  var css = '';
  VARIANTS.forEach(function (v) {
    // в превью отбрасываем JS-строки (они только для снипета)
    var body = v.css.replace(/\n\/\* JS: \*\/[\s\S]*$/, '');
    css += body.replace(/&/g, '.v-' + v.id + ' .pi') + '\n';
  });
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);
})();

/* ── Готовый снипет под боевой .user-menu-item ── */
function snippetFor(v) {
  var out = '/* ' + v.name + ' — для меню профиля (.user-menu-item) */\n';
  out += v.css.replace(/&/g, '.user-menu-item');
  if (v.wrap) {
    out += '\n/* ВАЖНО: оберни содержимое кнопки в спаны:\n' +
           '   <button class="user-menu-item"><span class="ic">👤</span><span class="lbl">Мой профиль</span></button> */';
  }
  return out;
}

/* ── Рендер ── */
function buildMenu(v) {
  var menu = document.createElement('div');
  menu.className = 'pmenu v-' + v.id;

  var em = document.createElement('div');
  em.className = 'pmenu-email';
  em.textContent = EMAIL;
  menu.appendChild(em);

  ROWS.forEach(function (r) {
    var b = document.createElement('button');
    b.className = 'pi';
    b.type = 'button';
    b.innerHTML = '<span class="ic">' + r.ic + '</span><span class="lbl">' + r.lbl + '</span>';
    menu.appendChild(b);
  });
  return menu;
}

function attachJS(menu, kind) {
  var btns = menu.querySelectorAll('.pi');
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
        ic.style.transform = 'translate(' + ((e.clientX - r.left) / r.width - 0.5) * 8 + 'px,' +
          ((e.clientY - r.top) / r.height - 0.5) * 5 + 'px)';
      });
      b.addEventListener('mouseleave', function () { ic.style.transform = ''; });
    });
  }
}

function renderCard(wrap, v) {
  var card = document.createElement('section');
  card.className = 'pl-card' + (v.featured ? ' featured' : '');

  var head = document.createElement('div');
  head.className = 'pl-card-head';
  head.innerHTML =
    '<div class="pl-card-meta">' +
    '<div class="pl-name">' + v.name +
    (v.tag ? '<span class="pl-tag' + (v.best ? ' best' : '') + '">' + v.tag + '</span>' : '') +
    '</div>' +
    '<p class="pl-desc">' + v.desc + '</p>' +
    '</div>';

  var btn = document.createElement('button');
  btn.className = 'pl-copy';
  btn.textContent = 'Скопировать CSS';
  btn.addEventListener('click', function () {
    navigator.clipboard.writeText(snippetFor(v)).then(function () {
      btn.textContent = '✓ Скопировано';
      btn.classList.add('done');
      setTimeout(function () { btn.textContent = 'Скопировать CSS'; btn.classList.remove('done'); }, 1600);
    });
  });
  head.appendChild(btn);
  card.appendChild(head);

  var stage = document.createElement('div');
  stage.className = 'pl-stage';
  var menu = buildMenu(v);
  stage.appendChild(menu);
  card.appendChild(stage);
  wrap.appendChild(card);

  if (v.js) attachJS(menu, v.js);
}

function renderGroup(wrap, title, desc) {
  var g = document.createElement('div');
  g.className = 'pl-group';
  g.innerHTML = '<h2>' + title + '</h2>' + (desc ? '<p>' + desc + '</p>' : '');
  wrap.appendChild(g);
}

function render() {
  var wrap = document.getElementById('plWrap');
  wrap.innerHTML = '';
  renderGroup(wrap, 'Меню «Мой профиль» — ' + VARIANTS.length + ' вариантов ховера',
    'Наводи мышкой на строки меню в каждой карточке. Combo Premium вверху — мой главный кандидат (тот же язык, что уже стоит в сайдбаре). Выберешь — перенесу выбранный в боевой styles.css. У каждого варианта кнопка «Скопировать CSS» уже под селектор .user-menu-item.');
  VARIANTS.forEach(function (v) { renderCard(wrap, v); });
}

/* ── Контролы ── */
var speed = document.getElementById('plSpeed');
var speedVal = document.getElementById('plSpeedVal');
speed.addEventListener('input', function () {
  document.documentElement.style.setProperty('--spd', speed.value);
  speedVal.textContent = parseFloat(speed.value).toFixed(1) + '×';
});

function setAccent(rgb) {
  document.documentElement.style.setProperty('--accent-rgb', rgb);
}
document.getElementById('plSwatches').addEventListener('click', function (e) {
  var sw = e.target.closest('.pl-sw');
  if (!sw) return;
  this.querySelectorAll('.pl-sw').forEach(function (s) { s.classList.remove('active'); });
  sw.classList.add('active');
  setAccent(sw.dataset.accent);
});
document.getElementById('plCustom').addEventListener('input', function () {
  var h = this.value.replace('#', '');
  var rgb = parseInt(h.substr(0, 2), 16) + ',' + parseInt(h.substr(2, 2), 16) + ',' + parseInt(h.substr(4, 2), 16);
  setAccent(rgb);
  document.querySelectorAll('.pl-sw').forEach(function (s) { s.classList.remove('active'); });
});
document.getElementById('plDim').addEventListener('change', function () {
  document.body.classList.toggle('dim', this.checked);
});

render();
