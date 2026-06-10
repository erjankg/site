/* ════════════════════════════════════════════════════════════════
   Песочница карточки чемпиона. Чистый JS, без зависимостей.
   ════════════════════════════════════════════════════════════════ */
(function(){
'use strict';

var DD = 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/';
function icon(key){ return DD + key + '.png'; }
function loadingArt(key){ return 'https://ddragon.leagueoflegends.com/cdn/img/champion/loading/'+key+'_0.jpg'; }

// ── Данные демо-чемпиона (Ezreal) ──
var CHAMP = {
  name:'Ezreal', key:'Ezreal', role:'ADC',
  portrait: icon('Ezreal'),
  splash:  'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ezreal_0.jpg',
  loading: loadingArt('Ezreal'),
  tags:['Поке','Мобильный','Скейл'],
  tier:'S', wr:51.8, pr:14.2, br:3.5,
  patch:{type:'buff', label:'🟢 БАФФ', patch:'14.24', text:'Урон Q увеличен на ранних уровнях.'},
  stats:[
    {id:'ad',  lbl:'AD',    ic:'⚔', b:54,  g:5,    max:140,  color:'var(--c-ad)'},
    {id:'hp',  lbl:'HP',    ic:'✚', b:600, g:120,  max:2600, color:'var(--c-hp)'},
    {id:'mana',lbl:'Мана',  ic:'💧',b:375, g:50,   max:1300, color:'var(--c-mana)'},
    {id:'arm', lbl:'Броня', ic:'🛡',b:25,  g:6,    max:160,  color:'var(--c-arm)'},
    {id:'mr',  lbl:'МС',    ic:'✦', b:30,  g:1.4,  max:95,   color:'var(--c-mr)'},
    {id:'rng', lbl:'RNG',   ic:'🏹',b:525, g:0,    max:650,  color:'var(--c-rng)'}
  ],
  strong:[{n:'Caitlyn',k:'Caitlyn'},{n:'Ashe',k:'Ashe'},{n:'Vayne',k:'Vayne'}],
  weak:[{n:'Draven',k:'Draven'},{n:'Samira',k:'Samira'}],
  combo:[{n:'Lux',k:'Lux'},{n:'Thresh',k:'Thresh'},{n:'Nami',k:'Nami'}]
};

var RAIL = [
  {name:'Caitlyn',key:'Caitlyn',role:'ADC',  tier:'A', wr:50.4},
  {name:'Jinx',key:'Jinx',role:'ADC',        tier:'S', wr:52.6},
  {name:'Ezreal',key:'Ezreal',role:'ADC',main:true, tier:'S', wr:51.8},
  {name:'Lux',key:'Lux',role:'Маг',          tier:'B', wr:49.1},
  {name:'Thresh',key:'Thresh',role:'Саппорт',tier:'A', wr:50.9}
];

// цвета тиров (отдельно от акцента — тиру нужны разные цвета)
var TIER_COLOR = {S:'#ff4d6d', A:'#ff9f43', B:'#ffd93d', C:'#54d98c', D:'#7ec8e3'};
function tierColor(t){ return TIER_COLOR[t] || 'var(--accent)'; }

// гамма значений: цветные / под акцент / бело-серые
function toneColor(base){ return S.tone==='accent' ? 'var(--accent)' : S.tone==='mono' ? '#dfeefb' : base; }
// эмодзи скрыты везде, кроме кнопок действий (зафиксировано Эржаном)
function emo(){ return ''; }

function statVal(s,lvl){ return Math.round(s.b + (lvl-1)*s.g); }

// ════════════════════════════════════════════════════════════════
// Конфиги
// ════════════════════════════════════════════════════════════════
var VARIANTS = [
  {id:'classic',  name:'Классика+',     desc:'улучшенная текущая'},
  {id:'splash',   name:'Splash-герой',  desc:'арт на фоне'},
  {id:'cinematic',name:'Кинематик',     desc:'портрет во всю высоту'},
  {id:'poster',   name:'Постер',        desc:'арт-баннер сверху'},
  {id:'hextech',  name:'Hextech-карты', desc:'грани + свечение'},
  {id:'glass',    name:'Стекло',        desc:'glassmorphism'},
  {id:'hud',      name:'HUD-компакт',   desc:'плотный esports'},
  {id:'diagonal', name:'Диагональ',     desc:'косой раздел'},
  {id:'minimal',  name:'Минимал',       desc:'воздух, без рамок'},
  {id:'rail',     name:'Hover-раскрытие',desc:'раздвигает соседей'}
];

var PRESETS = [
  {id:'default', name:'🔄 Дефолт',     set:{variant:'classic',statmode:'tiles',wrbr:'bars',tier:'shield',buttons:'fill',btnpos:'top',tone:'multi',emoji:'on',slider:'line',scrim:'med',hover:'lift',bg:'right',anim:'fade',plus:'outline',glow:'on',numfont:'normal',accent:'#0BC4E3',grad1:'#0BC4E3',grad2:'#6D3FF5',gangle:135,radius:16,density:'normal'}},
  {id:'hud',     name:'🎮 Esports HUD', set:{variant:'hud',statmode:'compact',scrim:'strong',hover:'glow',bg:'right',anim:'slide',plus:'neon',glow:'on',numfont:'wide',accent:'#0BC4E3',grad1:'#0BC4E3',grad2:'#011520',gangle:120,radius:10,density:'dense'}},
  {id:'neon',    name:'⚡ Неон',        set:{variant:'glass',statmode:'badges',scrim:'med',hover:'glow',bg:'full',anim:'zoomin',plus:'grad',glow:'on',numfont:'wide',accent:'#6D3FF5',grad1:'#0BC4E3',grad2:'#e74c3c',gangle:140,radius:20,density:'normal'}},
  {id:'minimal', name:'🤍 Минимал',     set:{variant:'minimal',statmode:'big',scrim:'soft',hover:'none',bg:'none',anim:'fade',plus:'soft',glow:'off',numfont:'thin',accent:'#64d2ff',grad1:'#0BC4E3',grad2:'#010A13',gangle:160,radius:14,density:'air'}},
  {id:'poster',  name:'🖼 Постер',      set:{variant:'poster',statmode:'list',scrim:'strong',hover:'lift',bg:'none',anim:'slide',plus:'outline',glow:'on',numfont:'normal',accent:'#0BC4E3',grad1:'#011520',grad2:'#010A13',gangle:180,radius:18,density:'normal'}},
  {id:'cine',    name:'🎬 Кинотеатр',   set:{variant:'cinematic',statmode:'list',scrim:'med',hover:'none',bg:'none',anim:'fade',plus:'ghost',glow:'on',numfont:'normal',accent:'#64d2ff',grad1:'#0BC4E3',grad2:'#6D3FF5',gangle:135,radius:16,density:'normal'}},
  {id:'radar',   name:'📡 Радар-фокус', set:{variant:'classic',statmode:'radar',scrim:'strong',hover:'tilt',bg:'right',anim:'fade',plus:'outline',glow:'on',numfont:'normal',accent:'#0BC4E3',grad1:'#0BC4E3',grad2:'#6D3FF5',gangle:135,radius:16,density:'normal'}},
  {id:'rail',    name:'🃏 Hover-веер',  set:{variant:'rail',statmode:'list',scrim:'med',hover:'lift',bg:'right',anim:'fade',plus:'outline',glow:'on',numfont:'normal',accent:'#0BC4E3',grad1:'#0BC4E3',grad2:'#6D3FF5',gangle:135,radius:16,density:'normal'}}
];

// зафиксированные Эржаном параметры убраны из панели (см. DEFAULTS). Открыты только статы и ползунок + цвета/размеры.
var CONTROLS = [
  {key:'statmode',label:'Вид статов', type:'seg', opts:[['compact','Компакт'],['badges','Бейджи']]},
  {key:'slider',  label:'Ползунок уровня', type:'seg', opts:[['white','Белый'],['green','Зелёный'],['purple','Фиолет'],['amber','Янтарь'],['pink','Розовый'],['cyan','Циан']]},
  {key:'numfont', label:'Шрифт чисел', type:'seg', opts:[['normal','Обычный'],['wide','Широкий'],['mono','Моно'],['thin','Тонкий']]},
  {key:'accent',  label:'Цвет акцента', type:'color', swatches:['#0BC4E3','#64d2ff','#6D3FF5','#2ecc71','#e8820a','#e74c3c','#f1c40f']},
  {key:'grad1',   label:'Градиент — цвет 1', type:'color', swatches:['#0BC4E3','#011520','#6D3FF5','#0094cc','#010A13']},
  {key:'grad2',   label:'Градиент — цвет 2', type:'color', swatches:['#6D3FF5','#010A13','#e74c3c','#2ecc71','#011520']},
  {key:'gangle',  label:'Угол градиента', type:'range', min:0, max:360, step:5, unit:'°'},
  {key:'radius',  label:'Скругление углов', type:'range', min:0, max:34, step:2, unit:'px'},
  {key:'density', label:'Плотность', type:'seg', opts:[['air','Просторно'],['normal','Средне'],['dense','Плотно'],['ultra','Ультра']]}
];

// ✅ зафиксировано Эржаном: glass / inline WR / тир-буква / контур-кнопки сверху / бело-серая гамма /
//    эмодзи только на кнопках / без затемнения / 3D-наклон / параллакс / стагер / неон-плюс / свечение
var DEFAULTS = {
  variant:'glass', statmode:'badges', wrbr:'inline', tier:'letter', buttons:'outline', btnpos:'top',
  tone:'mono', slider:'white',
  scrim:'off', hover:'tilt', bg:'parallax', anim:'stagger',
  plus:'neon', glow:'on', numfont:'mono',
  accent:'#0BC4E3', grad1:'#0BC4E3', grad2:'#011520', gangle:170, radius:22, density:'ultra'
};
var S = Object.assign({}, DEFAULTS);
var lvl = 10;

var SCRIM_MAP = {off:0, soft:0.32, med:0.55, strong:0.78};

// ════════════════════════════════════════════════════════════════
// Полоса раскладок + панель
// ════════════════════════════════════════════════════════════════
function buildVariantBar(){
  var bar = document.getElementById('variantBar');
  bar.innerHTML = VARIANTS.map(function(v){
    return '<button class="variant-chip'+(S.variant===v.id?' active':'')+'" data-v="'+v.id+'">'+
      '<span class="vc-name">'+v.name+'</span><span class="vc-desc">'+v.desc+'</span></button>';
  }).join('');
  bar.querySelectorAll('.variant-chip').forEach(function(b){
    b.onclick=function(){ S.variant=b.dataset.v; buildVariantBar(); render(); };
  });
}

function buildPanel(){
  var p = document.getElementById('panel');
  p.innerHTML = CONTROLS.map(function(c){
    var inner='', extra='';
    if(c.type==='preset'){
      extra=' ctrl-preset';
      inner='<div class="seg preset">'+PRESETS.map(function(pr){
        return '<button data-preset="'+pr.id+'">'+pr.name+'</button>';
      }).join('')+'</div>';
    } else if(c.type==='seg'){
      inner='<div class="seg">'+c.opts.map(function(o){
        return '<button data-k="'+c.key+'" data-o="'+o[0]+'" class="'+(S[c.key]===o[0]?'on':'')+'">'+o[1]+'</button>';
      }).join('')+'</div>';
    } else if(c.type==='color'){
      inner='<div class="color-row"><input type="color" data-k="'+c.key+'" value="'+S[c.key]+'"><span class="cval">'+S[c.key]+'</span></div>'+
        '<div class="swatches">'+(c.swatches||[]).map(function(sw){
          return '<span class="swatch" data-k="'+c.key+'" data-sw="'+sw+'" style="background:'+sw+'"></span>';
        }).join('')+'</div>';
    } else if(c.type==='range'){
      inner='<input type="range" data-k="'+c.key+'" min="'+c.min+'" max="'+c.max+'" step="'+c.step+'" value="'+S[c.key]+'">';
    }
    var valBadge = c.type==='range' ? '<span class="ctrl-val" id="val-'+c.key+'">'+S[c.key]+(c.unit||'')+'</span>' : '';
    return '<div class="ctrl'+extra+'"><div class="ctrl-label">'+c.label+valBadge+'</div>'+inner+'</div>';
  }).join('');

  p.querySelectorAll('[data-preset]').forEach(function(b){
    b.onclick=function(){ applyPreset(b.dataset.preset); };
  });
  p.querySelectorAll('.seg button[data-k]').forEach(function(b){
    b.onclick=function(){ S[b.dataset.k]=b.dataset.o; buildPanel(); render(); };
  });
  p.querySelectorAll('input[type=color]').forEach(function(inp){
    inp.oninput=function(){ S[inp.dataset.k]=inp.value; inp.nextElementSibling.textContent=inp.value; applyVars(); };
  });
  p.querySelectorAll('.swatch').forEach(function(sw){
    sw.onclick=function(){ S[sw.dataset.k]=sw.dataset.sw; buildPanel(); applyVars(); };
  });
  p.querySelectorAll('input[type=range]').forEach(function(inp){
    inp.oninput=function(){
      S[inp.dataset.k]=+inp.value;
      var u=(CONTROLS.find(function(c){return c.key===inp.dataset.k;})||{}).unit||'';
      var badge=document.getElementById('val-'+inp.dataset.k); if(badge) badge.textContent=inp.value+u;
      applyVars();
    };
  });
}

function applyPreset(id){
  var pr = PRESETS.find(function(x){return x.id===id;}); if(!pr) return;
  Object.assign(S, pr.set);
  buildVariantBar(); buildPanel(); render();
}

// ════════════════════════════════════════════════════════════════
// CSS-переменные
// ════════════════════════════════════════════════════════════════
function applyVars(){
  var r=document.documentElement.style;
  r.setProperty('--accent', S.accent);
  r.setProperty('--grad1', S.grad1);
  r.setProperty('--grad2', S.grad2);
  r.setProperty('--grad-angle', S.gangle+'deg');
  r.setProperty('--radius', S.radius+'px');
  r.setProperty('--pad', S.density==='air'?'22px':S.density==='dense'?'11px':S.density==='ultra'?'8px':'16px');
  var ff={normal:"'Segoe UI',system-ui,sans-serif", wide:"'Segoe UI Black','Arial Black',sans-serif",
          mono:"'Consolas','SF Mono',ui-monospace,monospace", thin:"'Segoe UI Light','Segoe UI',sans-serif"};
  r.setProperty('--num-font', ff[S.numfont]||ff.normal);
  r.setProperty('--num-weight', S.numfont==='thin'?'300':'900');
  r.setProperty('--glow-strength', S.glow==='on'?'0.45':'0');
  r.setProperty('--scrim', String(SCRIM_MAP[S.scrim]!==undefined?SCRIM_MAP[S.scrim]:0.55));
}

// ════════════════════════════════════════════════════════════════
// Рендер
// ════════════════════════════════════════════════════════════════
function render(){
  applyVars();
  var host = document.getElementById('stageInner');
  if(S.variant==='rail'){ host.innerHTML = renderRail(); return; }

  var cls = ['cc-card','v-'+S.variant,'tone-'+S.tone];
  if(S.glow==='on') cls.push('glow');
  if(S.hover!=='none') cls.push('hv-'+S.hover);
  if(S.bg!=='none') cls.push('bg-'+S.bg);
  cls.push('plus-'+S.plus);
  if(S.anim!=='none') cls.push('anim-'+S.anim);

  var bgArt = S.bg!=='none'
    ? '<div class="cc-bg" style="background-image:url('+CHAMP.splash+')"></div><div class="cc-scrim"></div>'
    : '';

  var contentClass, content;
  if(S.variant==='poster'){ contentClass='stack'; content=renderStack(true); }
  else if(S.variant==='minimal'){ contentClass='stack'; content=renderStack(false); }
  else if(S.variant==='cinematic'){ contentClass='grid2 cine'; content=renderCinematic(); }
  else { contentClass='grid2'; content=renderGrid2(); }

  host.innerHTML = '<div class="'+cls.join(' ')+'" id="ccCard">'+bgArt+
    '<div class="cc-content '+contentClass+'">'+content+'</div></div>';

  wireCard();
}

function tagsHTML(){ return '<div class="cc-tags">'+CHAMP.tags.map(function(t){return '<span class="cc-tag">'+t+'</span>';}).join('')+'</div>'; }

function headHTML(){
  return '<div class="cc-head"><img class="cc-portrait" src="'+CHAMP.portrait+'" alt="">'+
    '<div><div class="cc-name">'+CHAMP.name+'</div><div class="cc-role">'+CHAMP.role+'</div>'+tagsHTML()+'</div>'+tierHTML()+'</div>';
}
function patchHTML(){
  var p=CHAMP.patch, col=p.type==='buff'?'var(--c-strong)':p.type==='nerf'?'var(--c-weak)':'var(--c-arm)';
  return '<div class="cc-patchbtn" style="border-color:'+col+';color:'+col+'">'+p.label+' · Патч '+p.patch+'</div>';
}
function levelHTML(){
  var fill=Math.round((lvl-1)/14*100);
  return '<div class="cc-level sl-'+S.slider+'"><div class="cc-level-row"><span class="lbl">УРОВЕНЬ</span>'+
    '<span class="num" id="ccLvlNum">'+lvl+'</span></div>'+
    '<input type="range" id="ccLvl" min="1" max="15" value="'+lvl+'" style="--fill:'+fill+'%"></div>';
}

// ── тир-бейдж ──
function tierHTML(){
  if(S.tier==='off') return '';
  var t=CHAMP.tier;
  return '<div class="cc-tier tier-'+S.tier+'" style="--tc:'+tierColor(t)+'"><span>'+t+'</span></div>';
}

// ── винрейт / пикрейт / банрейт ──
function wrColor(v){ return v>=50?'#2ecc71':'#e74c3c'; }
function wrbrHTML(){
  if(S.wrbr==='off') return '';
  var items=[
    {lbl:'Винрейт',short:'WR',v:CHAMP.wr,max:100,col:toneColor(wrColor(CHAMP.wr))},
    {lbl:'Пикрейт',short:'PR',v:CHAMP.pr,max:30, col:toneColor('var(--accent)')},
    {lbl:'Банрейт',short:'BR',v:CHAMP.br,max:30, col:toneColor('#bb8fce')}
  ];
  if(S.wrbr==='inline')
    return '<div class="cc-wrbr inline">'+items.map(function(m){return '<span><b style="color:'+m.col+'">'+m.v+'%</b> '+m.short+'</span>';}).join('<i>·</i>')+'</div>';
  if(S.wrbr==='pills')
    return '<div class="cc-wrbr pills">'+items.map(function(m){return '<div class="wp"><div class="wv" style="color:'+m.col+'">'+m.v+'%</div><div class="wl">'+m.lbl+'</div></div>';}).join('')+'</div>';
  if(S.wrbr==='rings')
    return '<div class="cc-wrbr rings">'+items.map(function(m){var deg=Math.round(Math.min(1,m.v/m.max)*360);return '<div class="wrr"><div class="rc" style="background:conic-gradient('+m.col+' '+deg+'deg,rgba(255,255,255,.08) 0)"><span class="wv" style="color:'+m.col+'">'+m.v+'</span></div><div class="wl">'+m.lbl+'</div></div>';}).join('')+'</div>';
  return '<div class="cc-wrbr bars">'+items.map(function(m){var pct=Math.min(100,Math.round(m.v/m.max*100));return '<div class="wb"><div class="wt"><span>'+m.lbl+'</span><b style="color:'+m.col+'">'+m.v+'%</b></div><div class="wk"><i style="width:'+pct+'%;background:'+m.col+'"></i></div></div>';}).join('')+'</div>';
}

// ── кнопки действий ──
var ACTIONS=[{ic:'⚔',lbl:'Сборки'},{ic:'📖',lbl:'Гайд'},{ic:'★',lbl:'В избранное'}];
function btnsHTML(){
  if(S.buttons==='off') return '';
  return '<div class="cc-btns btn-'+S.buttons+'">'+ACTIONS.map(function(a){
    var inner=S.buttons==='icons'?a.ic:a.ic+' '+a.lbl;
    return '<button class="cc-btn" type="button" title="'+a.lbl+'">'+inner+'</button>';
  }).join('')+'</div>';
}

// ── порядок блоков инфо-колонки ──
function infoCore(){
  var btns=btnsHTML();
  return patchHTML()+(S.btnpos==='top'?btns:'')+wrbrHTML()+levelHTML()+statsHTML()+(S.btnpos==='bottom'?btns:'');
}

// ── статы ──
function statsHTML(){
  if(S.statmode==='radar') return radarHTML();
  return '<div class="cc-stats mode-'+S.statmode+'">'+CHAMP.stats.map(function(s,i){
    var col=toneColor(s.color);
    var style='animation-delay:'+(S.anim==='stagger'?i*0.07:0)+'s;';
    if(S.statmode==='split')  style+='border-left-color:'+col+';';
    if(S.statmode==='badges') style+='background:color-mix(in srgb,'+col+' 18%,#010a13);border-color:color-mix(in srgb,'+col+' 40%,transparent);';
    return '<div class="cc-stat" style="'+style+'">'+
      '<div class="s-lbl">'+emo(s.ic)+s.lbl+'</div>'+
      '<div class="s-val" data-stat="'+s.id+'" style="color:'+col+'">'+statVal(s,lvl)+'</div></div>';
  }).join('')+'</div>';
}
function radarHTML(){
  var st=CHAMP.stats, n=st.length, cx=170, cy=150, R=108;
  function pt(i,frac){ var a=(-90 + i*(360/n))*Math.PI/180; return [cx+Math.cos(a)*R*frac, cy+Math.sin(a)*R*frac]; }
  var grid='';
  [0.25,0.5,0.75,1].forEach(function(g){
    grid+='<polygon points="'+st.map(function(_,i){return pt(i,g).join(',');}).join(' ')+'" fill="none" stroke="rgba(11,196,227,.12)" stroke-width="1"/>';
  });
  var axes='', labels='';
  st.forEach(function(s,i){
    var e=pt(i,1); axes+='<line x1="'+cx+'" y1="'+cy+'" x2="'+e[0]+'" y2="'+e[1]+'" stroke="rgba(11,196,227,.15)" stroke-width="1"/>';
    var l=pt(i,1.22); labels+='<text x="'+l[0]+'" y="'+l[1]+'" fill="rgba(230,243,251,.7)" font-size="11" font-weight="700" text-anchor="middle" dominant-baseline="middle">'+emo(s.ic)+s.lbl+'</text>';
  });
  var dataPts=st.map(function(s,i){return pt(i,Math.min(1,statVal(s,lvl)/s.max)).join(',');}).join(' ');
  var dots=st.map(function(s,i){var p=pt(i,Math.min(1,statVal(s,lvl)/s.max));return '<circle cx="'+p[0]+'" cy="'+p[1]+'" r="3" fill="var(--accent)"/>';}).join('');
  return '<div class="cc-stats mode-radar"><div class="radar-wrap"><svg viewBox="0 0 340 300">'+grid+axes+
    '<polygon points="'+dataPts+'" fill="rgba(11,196,227,.18)" stroke="var(--accent)" stroke-width="2"/>'+dots+labels+'</svg></div></div>';
}

// ── матчапы ──
function matchHTML(){
  function box(ic,title,base,list){
    var col=toneColor(base);
    var chips = list.length ? list.map(function(c){
      return '<span class="mu-chip"><img src="'+icon(c.k)+'" alt="">'+c.n+'</span>';
    }).join('') : '<span class="mu-empty">пусто — нажми «+»</span>';
    return '<div class="mu-box" style="border-color:color-mix(in srgb,'+col+' 38%,transparent);background:color-mix(in srgb,'+col+' 10%,transparent);color:'+col+'">'+
      '<div class="mu-head"><span class="mu-title">'+emo(ic)+title+'</span><button class="mu-add" type="button">+</button></div>'+
      '<div class="mu-list">'+chips+'</div></div>';
  }
  return '<div class="cc-matchups">'+
    box('⚔','СИЛЁН ПРОТИВ','#2ecc71',CHAMP.strong)+
    box('💀','СЛАБ ПРОТИВ','#e74c3c',CHAMP.weak)+
    box('🤝','КОМБО','#5dade2',CHAMP.combo)+'</div>';
}

// ── компоновки ──
function renderGrid2(){
  return '<div class="cc-left">'+headHTML()+infoCore()+'</div>'+
         '<div class="cc-right">'+matchHTML()+'</div>';
}
function renderCinematic(){
  return '<div class="cc-left"><img class="cc-portrait-big" src="'+CHAMP.loading+'" alt="">'+
    '<div class="cc-cine-overlay">'+tierHTML()+'<div class="cc-name">'+CHAMP.name+'</div>'+
    '<div class="cc-role">'+CHAMP.role+'</div>'+tagsHTML()+'</div></div>'+
    '<div class="cc-right">'+infoCore()+matchHTML()+'</div>';
}
function renderStack(useArt){
  var top = useArt
    ? '<div class="cc-poster-art" style="background-image:url('+CHAMP.splash+')">'+tierHTML()+'<div class="ov"><div class="cc-name">'+CHAMP.name+'</div><div class="cc-role">'+CHAMP.role+'</div>'+tagsHTML()+'</div></div>'
    : headHTML();
  return top+'<div class="cc-poster-body">'+infoCore()+matchHTML()+'</div>';
}

// ── рельс ──
function renderRail(){
  var cards = RAIL.map(function(c){
    var rows = CHAMP.stats.slice(0,5).map(function(s){
      var v = c.main ? statVal(s,lvl) : Math.round(statVal(s,10)*(0.8+Math.random()*0.4));
      return '<div class="rs"><span>'+s.ic+' '+s.lbl+'</span><b style="color:'+s.color+'">'+v+'</b></div>';
    }).join('');
    var tierBadge = (c.tier && S.tier!=='off') ? '<span class="rc-tier" style="background:'+tierColor(c.tier)+'">'+c.tier+'</span>' : '';
    var wrLine = (c.wr!=null && S.wrbr!=='off') ? '<div class="rc-wr">WR <b style="color:'+wrColor(c.wr)+'">'+c.wr+'%</b></div>' : '';
    return '<div class="rail-card"'+(c.main?' style="border-color:var(--accent)"':'')+'>'+
      '<div class="rc-art" style="background-image:url('+loadingArt(c.key)+')">'+tierBadge+'</div>'+
      '<div class="rc-body"><div class="rc-name">'+c.name+'</div><div class="rc-role">'+c.role+'</div>'+wrLine+
      '<div class="rc-stats">'+rows+'</div></div></div>';
  }).join('');
  return '<div class="rail-hint">наведи на любого — увеличится, раздвинет остальных, появятся статы</div>'+
         '<div class="rail">'+cards+'</div>';
}

// ════════════════════════════════════════════════════════════════
// Интерактив
// ════════════════════════════════════════════════════════════════
function wireCard(){
  var card=document.getElementById('ccCard');
  var sl=document.getElementById('ccLvl');
  if(sl) sl.oninput=function(){
    lvl=+this.value;
    this.style.setProperty('--fill', Math.round((lvl-1)/14*100)+'%');
    var n=document.getElementById('ccLvlNum'); if(n) n.textContent=lvl;
    refreshStats();
  };
  card.querySelectorAll('.mu-add').forEach(function(b){ b.onclick=function(){ flash(b); }; });

  if(S.hover==='tilt'){
    card.addEventListener('mousemove',function(e){
      var r=card.getBoundingClientRect();
      var px=(e.clientX-r.left)/r.width-0.5, py=(e.clientY-r.top)/r.height-0.5;
      card.style.transform='rotateY('+(px*9)+'deg) rotateX('+(-py*9)+'deg)';
    });
    card.addEventListener('mouseleave',function(){ card.style.transform=''; });
  }
  if(S.bg==='parallax'){
    var bg=card.querySelector('.cc-bg');
    card.addEventListener('mousemove',function(e){
      var r=card.getBoundingClientRect();
      var px=(e.clientX-r.left)/r.width-0.5, py=(e.clientY-r.top)/r.height-0.5;
      if(bg) bg.style.transform='scale(1.12) translate('+(px*-18)+'px,'+(py*-18)+'px)';
    });
    card.addEventListener('mouseleave',function(){ if(bg) bg.style.transform='scale(1.08)'; });
  }
  if(S.anim==='count') countUp();
}

function refreshStats(){
  var card=document.getElementById('ccCard'); if(!card) return;
  if(S.statmode==='radar'){
    var holder=card.querySelector('.cc-stats'); if(holder) holder.outerHTML=statsHTML();
  } else {
    CHAMP.stats.forEach(function(s){
      var el=card.querySelector('[data-stat="'+s.id+'"]'); if(el) el.textContent=statVal(s,lvl);
    });
  }
}
function countUp(){
  var card=document.getElementById('ccCard');
  card.querySelectorAll('[data-stat]').forEach(function(el){
    var target=+el.textContent; if(isNaN(target)) return;
    var start=performance.now(), dur=700;
    (function step(now){ var p=Math.min(1,(now-start)/dur); el.textContent=Math.round(target*(1-Math.pow(1-p,3))); if(p<1) requestAnimationFrame(step); })(start);
  });
}
function flash(el){ el.style.transition='transform .15s'; el.style.transform='scale(1.35) rotate(90deg)'; setTimeout(function(){ el.style.transform=''; },180); }

// ── старт ──
document.getElementById('resetBtn').onclick=function(){ S=Object.assign({},DEFAULTS); lvl=10; buildPanel(); render(); };
var vbar=document.getElementById('variantBar'); if(vbar) vbar.style.display='none';
buildPanel();
render();

})();
