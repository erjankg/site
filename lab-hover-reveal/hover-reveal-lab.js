/* ════════════════════════════════════════════════════════════════
   lab-hover-reveal — ПИКЕР → СТРАНИЦА ЧЕМПА (единственная карточка чемпа, будущая SEO
   /champion/slug). Финальный канон стекла. Все фичи страницы = тумблеры в дев-полосе.
   ════════════════════════════════════════════════════════════════ */
(function(){
'use strict';

var DD='https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/';
function icon(k){ return DD+k+'.png'; }
function loadingArt(k){ return 'https://ddragon.leagueoflegends.com/cdn/img/champion/loading/'+k+'_0.jpg'; }
function splashArt(k){ return 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/'+k+'_0.jpg'; }
function slugOf(c){ return c.name.toLowerCase().replace(/[^a-z0-9]+/g,'-'); }

// ── SVG-ИКОНЫ СТАТОВ (единый набор, заменяет emoji) ──
var SVGP={
  ad:'<path d="M14 3l7 7-4 1-1 4-7-7z"/><path d="M3 21l6-6"/>',
  ap:'<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  hp:'<path d="M12 20s-7-4.5-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.5-7 9-7 9z"/>',
  arm:'<path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z"/>',
  mr:'<path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z"/><path d="M12 8v6"/>',
  rng:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  as:'<path d="M13 2L4 14h6l-1 8 9-12h-6z"/>',
  ms:'<path d="M4 12h13M13 6l6 6-6 6"/>',
  hpreg:'<path d="M12 3s6 6 6 10a6 6 0 0 1-12 0c0-4 6-10 6-10z"/><path d="M12 11v4M10 13h4"/>',
  mpreg:'<path d="M12 3s6 6 6 10a6 6 0 0 1-12 0c0-4 6-10 6-10z"/>',
  ah:'<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  critc:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
  critd:'<path d="M12 2l2 6 6-2-4 5 4 5-6-2-2 6-2-6-6 2 4-5-4-5 6 2z"/>',
  resreg:'<path d="M4 12a8 8 0 0 1 13-6M20 12a8 8 0 0 1-13 6"/><path d="M17 3v3h-3M7 21v-3h3"/>',
  arpen:'<path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z"/><path d="M9 11l3 3 3-3"/>',
  mpen:'<path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z"/><path d="M9 11l3 3 3-3"/>',
  arpenp:'<path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z"/><path d="M9 11l3 3 3-3"/>',
  mpenp:'<path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z"/><path d="M9 11l3 3 3-3"/>',
  pvamp:'<path d="M12 3s6 6 6 10a6 6 0 0 1-12 0c0-4 6-10 6-10z"/>',
  mvamp:'<path d="M12 3s6 6 6 10a6 6 0 0 1-12 0c0-4 6-10 6-10z"/>',
  ten:'<path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  res:'<path d="M12 3l6 6-6 12L6 9z"/>'
};
function svgIco(id,color){
  var p=SVGP[id]||'<circle cx="12" cy="12" r="7"/>';
  return '<span class="st-ic" style="color:'+(color||'currentColor')+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg></span>';
}

var SMAX={ad:140,hp:2600,arm:160,mr:95,rng:650};
var QUAL=[{id:'power',lbl:'Сила'},{id:'dmg',lbl:'Урон'},{id:'diff',lbl:'Сложн.'},{id:'combo',lbl:'Комбо'},{id:'meta',lbl:'Мета'},{id:'mobility',lbl:'Мобил.'}];

var POOL=[
  {name:'Ezreal',key:'Ezreal',role:'ADC',tier:'S',wr:51.8,pr:14.2,br:3.5,tags:['Поке','Мобильный'],s:{ad:99,hp:1680,arm:79,mr:43,rng:525},r:{power:7,dmg:8,diff:7,combo:8,meta:8,mobility:9},
   strong:[{n:'Caitlyn',k:'Caitlyn'},{n:'Ashe',k:'Ashe'}],weak:[{n:'Draven',k:'Draven'},{n:'Samira',k:'Samira'}],combo:[{n:'Lux',k:'Lux'},{n:'Thresh',k:'Thresh'}]},
  {name:'Caitlyn',key:'Caitlyn',role:'ADC',tier:'A',wr:50.4,pr:11.0,br:2.1,tags:['Дальность','Ловушки'],s:{ad:110,hp:1700,arm:85,mr:40,rng:650},r:{power:8,dmg:9,diff:4,combo:5,meta:7,mobility:4},
   strong:[{n:'Jinx',k:'Jinx'}],weak:[{n:'Yasuo',k:'Yasuo'}],combo:[{n:'Lux',k:'Lux'},{n:'Morgana',k:'Morgana'}]},
  {name:'Jinx',key:'Jinx',role:'ADC',tier:'S',wr:52.6,pr:13.4,br:4.0,tags:['Скейл','АоЕ'],s:{ad:105,hp:1750,arm:80,mr:40,rng:525},r:{power:9,dmg:10,diff:5,combo:6,meta:8,mobility:4},
   strong:[{n:'Ashe',k:'Ashe'}],weak:[{n:'Caitlyn',k:'Caitlyn'},{n:'Zed',k:'Zed'}],combo:[{n:'Thresh',k:'Thresh'},{n:'Lulu',k:'Lulu'}]},
  {name:'Ahri',key:'Ahri',role:'Маг',tier:'A',wr:50.9,pr:9.5,br:3.2,tags:['Мобильный','Бурст'],s:{ad:60,hp:1620,arm:70,mr:50,rng:550},r:{power:7,dmg:7,diff:6,combo:8,meta:7,mobility:8},
   strong:[{n:'Lux',k:'Lux'}],weak:[{n:'Zed',k:'Zed'}],combo:[{n:'LeeSin',k:'LeeSin'}]},
  {name:'Yasuo',key:'Yasuo',role:'Воин',tier:'A',wr:49.2,pr:12.8,br:14.5,tags:['Дуэлянт','Щит'],s:{ad:120,hp:1900,arm:95,mr:45,rng:175},r:{power:8,dmg:8,diff:9,combo:9,meta:7,mobility:8},
   strong:[{n:'Caitlyn',k:'Caitlyn'},{n:'Lux',k:'Lux'}],weak:[{n:'Malphite',k:'Malphite'}],combo:[{n:'Malphite',k:'Malphite'}]},
  {name:'Lux',key:'Lux',role:'Маг',tier:'B',wr:49.1,pr:8.0,br:2.4,tags:['Поке','Контроль'],s:{ad:62,hp:1580,arm:65,mr:52,rng:550},r:{power:6,dmg:8,diff:4,combo:6,meta:6,mobility:3},
   strong:[{n:'Jinx',k:'Jinx'}],weak:[{n:'Zed',k:'Zed'},{n:'LeeSin',k:'LeeSin'}],combo:[{n:'Jinx',k:'Jinx'}]},
  {name:'Thresh',key:'Thresh',role:'Саппорт',tier:'A',wr:50.9,pr:10.1,br:6.7,tags:['Контроль','Крюк'],s:{ad:75,hp:1800,arm:90,mr:48,rng:450},r:{power:7,dmg:5,diff:8,combo:9,meta:8,mobility:5},
   strong:[{n:'Soraka',k:'Soraka'}],weak:[{n:'Morgana',k:'Morgana'}],combo:[{n:'Ezreal',k:'Ezreal'},{n:'Jinx',k:'Jinx'}]},
  {name:'Zed',key:'Zed',role:'Ассасин',tier:'A',wr:50.2,pr:9.8,br:12.4,tags:['Бурст','Мобильный'],s:{ad:115,hp:1850,arm:88,mr:40,rng:125},r:{power:8,dmg:9,diff:8,combo:8,meta:7,mobility:9},
   strong:[{n:'Lux',k:'Lux'},{n:'Ahri',k:'Ahri'}],weak:[{n:'Malphite',k:'Malphite'}],combo:[{n:'LeeSin',k:'LeeSin'}]},
  {name:'LeeSin',key:'LeeSin',role:'Лес',tier:'A',wr:49.6,pr:11.2,br:4.1,tags:['Ганк','Дуэль'],s:{ad:110,hp:1900,arm:95,mr:42,rng:125},r:{power:7,dmg:7,diff:10,combo:9,meta:6,mobility:9},
   strong:[{n:'Zed',k:'Zed'}],weak:[{n:'Garen',k:'Garen'}],combo:[{n:'Ahri',k:'Ahri'}]},
  {name:'Garen',key:'Garen',role:'Топ',tier:'B',wr:51.0,pr:6.5,br:1.2,tags:['Танк','Сустейн'],s:{ad:118,hp:2100,arm:98,mr:40,rng:175},r:{power:7,dmg:7,diff:2,combo:4,meta:6,mobility:4},
   strong:[{n:'Darius',k:'Darius'}],weak:[{n:'Malphite',k:'Malphite'}],combo:[]},
  {name:'Darius',key:'Darius',role:'Топ',tier:'A',wr:51.5,pr:7.8,br:8.9,tags:['Дуэль','Кровотечение'],s:{ad:125,hp:2050,arm:100,mr:40,rng:175},r:{power:9,dmg:9,diff:5,combo:6,meta:7,mobility:3},
   strong:[{n:'Garen',k:'Garen'}],weak:[{n:'Yasuo',k:'Yasuo'}],combo:[]},
  {name:'Soraka',key:'Soraka',role:'Саппорт',tier:'B',wr:52.1,pr:5.4,br:2.0,tags:['Хил','Поддержка'],s:{ad:58,hp:1550,arm:60,mr:50,rng:550},r:{power:6,dmg:4,diff:4,combo:5,meta:7,mobility:3},
   strong:[{n:'Caitlyn',k:'Caitlyn'}],weak:[{n:'Thresh',k:'Thresh'}],combo:[{n:'Jinx',k:'Jinx'}]},
  {name:'Malphite',key:'Malphite',role:'Танк',tier:'A',wr:52.8,pr:6.0,br:5.5,tags:['Танк','АоЕ-ульт'],s:{ad:95,hp:2000,arm:110,mr:45,rng:125},r:{power:7,dmg:6,diff:3,combo:8,meta:7,mobility:4},
   strong:[{n:'Yasuo',k:'Yasuo'},{n:'Zed',k:'Zed'}],weak:[{n:'Darius',k:'Darius'}],combo:[{n:'Yasuo',k:'Yasuo'}]}
];
var XSTATS={
  Ezreal:{as:0.625,asg:2.5,ms:340,hpreg:6,hpregg:0.68,mpreg:9,mpregg:0.9,res:'Mana'},
  Caitlyn:{as:0.681,asg:4,ms:335,hpreg:6,hpregg:0.55,mpreg:12,mpregg:0.7,res:'Mana'},
  Jinx:{as:0.625,asg:1,ms:335,hpreg:7.5,hpregg:0.55,mpreg:12,mpregg:1.3,res:'Mana'},
  Ahri:{as:0.668,asg:2.2,ms:355,hpreg:7.5,hpregg:0.68,mpreg:18,mpregg:1.1,res:'Mana'},
  Yasuo:{as:0.697,asg:3.5,ms:355,hpreg:12,hpregg:0.94,mpreg:0,mpregg:0,res:'None'},
  Lux:{as:0.669,asg:3,ms:360,hpreg:7.5,hpregg:0.55,mpreg:9,mpregg:1.1,res:'Mana'},
  Thresh:{as:0.625,asg:3.5,ms:345,hpreg:10.5,hpregg:0.81,mpreg:12,mpregg:1.3,res:'Mana'},
  Zed:{as:0.651,asg:3.3,ms:355,hpreg:9,hpregg:0.68,mpreg:0,mpregg:0,res:'Energy'},
  LeeSin:{as:0.651,asg:3,ms:355,hpreg:10.5,hpregg:0.68,mpreg:0,mpregg:0,res:'Energy'},
  Garen:{as:0.625,asg:3.65,ms:350,hpreg:7.5,hpregg:0.55,mpreg:0,mpregg:0,res:'None'},
  Darius:{as:0.625,asg:1,ms:350,hpreg:7.5,hpregg:0.81,mpreg:9,mpregg:0.5,res:'Mana'},
  Soraka:{as:0.625,asg:2.14,ms:340,hpreg:6,hpregg:0.55,mpreg:18,mpregg:0.5,res:'Mana'},
  Malphite:{as:0.736,asg:3.4,ms:340,hpreg:9,hpregg:0.81,mpreg:15,mpregg:0.7,res:'Mana'}
};
POOL.forEach(function(c){ if(XSTATS[c.key]) c.x=XSTATS[c.key]; });

var ALLSTATS=[
  {id:'ad',lbl:'AD',color:'var(--c-ad)',max:140,dec:0,src:'base'},
  {id:'hp',lbl:'HP',color:'var(--c-hp)',max:2600,dec:0,src:'base'},
  {id:'arm',lbl:'Броня',color:'var(--c-arm)',max:160,dec:0,src:'base'},
  {id:'mr',lbl:'Mrez',color:'var(--c-mr)',max:95,dec:0,src:'base'},
  {id:'rng',lbl:'RNG',color:'var(--c-rng)',max:650,dec:0,src:'base'},
  {id:'as',lbl:'Ск.Атк',color:'#f6c945',max:1.2,dec:2,src:'x'},
  {id:'ms',lbl:'Ск.Пер',color:'#7ee0c0',max:400,dec:0,src:'x'},
  {id:'hpreg',lbl:'HP reg',color:'#5ad17a',max:22,dec:1,src:'x'},
  {id:'mpreg',lbl:'Mana reg',color:'#5aa9ff',max:22,dec:1,src:'x'}
];
var DTIER={S:'#ff4d6d',A:'#ff9f43',B:'#ffd93d',C:'#54d98c',D:'#7ec8e3'};

// ════════════════════════════════════════════════════════════════
// ДИЗАЙН-ВАРИАНТЫ + ФИЧИ (дев-полоса)
// ════════════════════════════════════════════════════════════════
var VARIANTS=[
  {key:'layout',label:'Пикер',opts:[['grid','Сетка'],['fan','Веер 🔥']]},
  {key:'clickOpens',label:'Клик',opts:[['page','Страница'],['popup','Попап → стр.']]},
  {key:'pageLayout',label:'Страница',opts:[['sidebar','Сайдбар'],['top','2 колонки'],['single','Вкладки']]},
  {key:'statStyle',label:'Статы',opts:[['chips','Чипсы'],['bars','Бары'],['tiles','Плитки'],['rings','Кольца'],['grid','Сетка 5×4']]},
  {key:'abilLayout',label:'Умения',opts:[['railTop','Рельс сверху'],['railLeft','Рельс слева'],['list','Списком']]},
  {key:'cell',label:'Плитки',opts:[['s','S'],['m','M'],['l','L']]},
  {key:'hover',label:'Ховер',opts:[['shine','Блик'],['reveal','WR снизу'],['lift','Подъём'],['none','Выкл']]},
  {key:'iconShape',label:'Иконки',opts:[['round','Скругл'],['circle','Круг'],['squircle','Squircle']]},
  {key:'density',label:'Плотность',opts:[['compact','Плотно'],['cozy','Норма'],['roomy','Просторно']]}
];
var DEFAULTS={layout:'grid',clickOpens:'page',pageLayout:'sidebar',statStyle:'chips',abilLayout:'railTop',cell:'m',hover:'shine',iconShape:'round',density:'cozy'};
var S=Object.assign({},DEFAULTS);
var CELL={s:'64px',m:'88px',l:'116px'};

// 14 фич страницы — тумблеры
var FEATURES=[
  {key:'seo',label:'SEO: роутинг+H1+крошки+schema'},
  {key:'abil',label:'Умения (числа по рангам)'},
  {key:'skill',label:'Скиллордер'},
  {key:'stats',label:'Статы по уровням'},
  {key:'build',label:'Билды → раздел Сборка'},
  {key:'runes',label:'Руны → пикер рун'},
  {key:'match',label:'Матчапы / контры'},
  {key:'syn',label:'Синергии'},
  {key:'meta',label:'Тир/WR/PR/BR + спарклайн'},
  {key:'yt',label:'YouTube-видео'},
  {key:'patch',label:'Изменения по патчам'},
  {key:'guide',label:'Гайд текстом'},
  {key:'cmp',label:'Сравнение (чекбоксы в пикере)'},
  {key:'share',label:'Поделиться / Открыть в Сборке'}
];
var F={}; FEATURES.forEach(function(f){ F[f.key]=true; });

// пользовательские настройки (⚙): сплэш + акцент (сила/тёмность/blur зафиксированы каноном)
var UI={art:'Lux',accent:'#ffffff'};
var ARTS=[['Lux','светлый'],['Soraka','светлый'],['Thresh','тёмный'],['Yasuo','тёмный'],['Jinx','пёстрый'],['Ahri','пёстрый']];
var ACCENTS=['#ffffff','#C89B3C','#9B6BFF','#4ADE80'];

// ════════════════════════════════════════════════════════════════
// ДЕВ-ПОЛОСА
// ════════════════════════════════════════════════════════════════
function buildStrip(){
  var body=document.getElementById('stripBody');
  var vHTML='<div class="strip-sub">Вид</div><div class="strip-row">'+VARIANTS.map(function(v){
    return '<div class="strip-group"><label>'+v.label+'</label><div class="seg" data-k="'+v.key+'">'+
      v.opts.map(function(o){return '<button data-o="'+o[0]+'" class="'+(S[v.key]===o[0]?'active':'')+'">'+o[1]+'</button>';}).join('')+'</div></div>';
  }).join('')+'</div>';
  var fHTML='<div class="strip-sub">Фичи страницы (вкл/выкл)</div><div class="strip-row">'+FEATURES.map(function(f){
    return '<button class="feat'+(F[f.key]?' on':'')+'" data-f="'+f.key+'" type="button"><span class="dot"></span>'+f.label+'</button>';
  }).join('')+'</div>';
  body.innerHTML=vHTML+fHTML+'<div class="strip-choice">Ваш выбор: <b id="choiceText"></b><button class="strip-copy" id="stripCopy" type="button">📋 Скопировать мой выбор</button></div>';
  body.querySelectorAll('.seg').forEach(function(seg){ seg.querySelectorAll('button').forEach(function(b){ b.onclick=function(){
    S[seg.dataset.k]=b.dataset.o; seg.querySelectorAll('button').forEach(function(x){x.classList.toggle('active',x===b);});
    applyVars(); render(); refreshOpen(); updateChoice(); }; }); });
  body.querySelectorAll('.feat').forEach(function(b){ b.onclick=function(){ F[b.dataset.f]=!F[b.dataset.f];
    b.classList.toggle('on',F[b.dataset.f]); refreshOpen(); render(); updateChoice(); }; });
  document.getElementById('stripCopy').onclick=function(){
    var txt=JSON.stringify({вид:S,фичи:F},null,2);
    if(navigator.clipboard) navigator.clipboard.writeText(txt);
    this.textContent='✓ Скопировано'; var self=this; setTimeout(function(){ self.textContent='📋 Скопировать мой выбор'; },1400); };
  updateChoice();
}
function updateChoice(){
  var el=document.getElementById('choiceText'); if(!el) return;
  var vid=VARIANTS.map(function(v){ var o=v.opts.filter(function(x){return x[0]===S[v.key];})[0]; return v.label+': '+(o?o[1]:S[v.key]); }).join(' · ');
  var off=FEATURES.filter(function(f){return !F[f.key];}).map(function(f){return f.label.split(' ')[0];});
  el.innerHTML=vid+' · <b>Выключено:</b> '+(off.length?off.join(', '):'—');
}
function setupStrip(){
  var strip=document.getElementById('labStrip'),head=document.getElementById('stripHead');
  document.getElementById('stripMin').onclick=function(e){ e.stopPropagation(); var min=strip.classList.toggle('min'); this.textContent=min?'▸':'Свернуть'; };
  document.getElementById('stripReset').onclick=function(e){ e.stopPropagation();
    S=Object.assign({},DEFAULTS); FEATURES.forEach(function(f){F[f.key]=true;}); buildStrip(); applyVars(); render(); refreshOpen(); };
  var dragging=false,offX=0,offY=0;
  head.addEventListener('mousedown',function(e){ if(e.target.closest('button')) return;
    var r=strip.getBoundingClientRect(); strip.style.transform='none'; strip.style.left=r.left+'px'; strip.style.top=r.top+'px';
    offX=e.clientX-r.left; offY=e.clientY-r.top; dragging=true; e.preventDefault(); });
  window.addEventListener('mousemove',function(e){ if(!dragging) return;
    var x=Math.max(0,Math.min(e.clientX-offX,innerWidth-strip.offsetWidth)), y=Math.max(0,Math.min(e.clientY-offY,innerHeight-strip.offsetHeight));
    strip.style.left=x+'px'; strip.style.top=y+'px'; });
  window.addEventListener('mouseup',function(){ dragging=false; });
}

// ⚙ настройки юзера
function applyGlass(){ document.querySelector('.splash').style.backgroundImage='url('+splashArt(UI.art)+')';
  document.documentElement.style.setProperty('--accent',UI.accent); }
function buildSettings(){
  var pop=document.getElementById('settingsPop');
  pop.innerHTML='<div class="set-head"><b>⚙ Настройки</b><button class="set-close" id="setClose" type="button">✕</button></div>'+
    '<div class="set-block"><label>Сплэш-арт (проверь читабельность на светлом)</label><div class="art-grid" id="artGrid">'+
      ARTS.map(function(a){return '<button class="art-sw'+(UI.art===a[0]?' on':'')+'" data-art="'+a[0]+'" title="'+a[0]+' — '+a[1]+'" style="background-image:url('+splashArt(a[0])+')"></button>';}).join('')+'</div></div>'+
    '<div class="set-block"><label>Акцент (только на данных)</label><div class="acc-row" id="accRow">'+
      ACCENTS.map(function(a){return '<button class="acc-sw'+(UI.accent===a?' on':'')+'" data-acc="'+a+'" style="--sw:'+a+'"></button>';}).join('')+'</div></div>'+
    '<div class="set-block"><label style="color:var(--txt-dim);font-size:10px">Сила стекла · тёмность · blur — зафиксированы каноном.</label></div>';
  document.getElementById('setClose').onclick=function(){ pop.hidden=true; };
  pop.querySelectorAll('.art-sw').forEach(function(b){ b.onclick=function(){ UI.art=b.dataset.art; pop.querySelectorAll('.art-sw').forEach(function(x){x.classList.toggle('on',x===b);}); applyGlass(); }; });
  pop.querySelectorAll('.acc-sw').forEach(function(b){ b.onclick=function(){ UI.accent=b.dataset.acc; pop.querySelectorAll('.acc-sw').forEach(function(x){x.classList.toggle('on',x===b);}); applyGlass(); }; });
}
function setupSettings(){ buildSettings(); document.getElementById('gearBtn').onclick=function(){ var p=document.getElementById('settingsPop'); p.hidden=!p.hidden; }; }

var _toastT=null;
function toast(msg){ var t=document.querySelector('.toast'); if(!t){ t=document.createElement('div'); t.className='toast'; document.body.appendChild(t); }
  t.textContent=msg; requestAnimationFrame(function(){ t.classList.add('show'); }); clearTimeout(_toastT);
  _toastT=setTimeout(function(){ t.classList.remove('show'); },1800); }

function applyVars(){ document.documentElement.style.setProperty('--cell',CELL[S.cell]||'88px'); document.documentElement.setAttribute('data-density',S.density); }

// ════════════════════════════════════════════════════════════════
// ПИКЕР
// ════════════════════════════════════════════════════════════════
var fRole='all',fQ='',_cmpMode=false,_cmpSel=[];
function render(){ applyVars(); if(S.layout==='fan') renderFan(); else renderPicker(); }
function roles(){ var out=[]; POOL.forEach(function(c){ if(out.indexOf(c.role)<0) out.push(c.role); }); return out; }
function filtered(){ var q=fQ.trim().toLowerCase(); return POOL.filter(function(c){ return (fRole==='all'||c.role===fRole)&&(!q||c.name.toLowerCase().indexOf(q)>=0); }); }
function pickCard(c){
  var gi=POOL.indexOf(c),wrc=c.wr>=50?'var(--good)':'var(--bad)',picked=_cmpSel.indexOf(c)>=0;
  var hit=_hitSet.indexOf(c)>=0;
  return '<button class="pick-card'+(_cmpMode?' pickable':'')+(picked?' picked':'')+(hit?'':' is-off')+'" data-key="c'+gi+'" data-i="'+gi+'" type="button">'+
    '<div class="pc-av" style="background-image:url('+icon(c.key)+')">'+
      '<span class="pc-check">'+(picked?'✓':'')+'</span>'+
      '<span class="pc-tier" style="--tc:'+(DTIER[c.tier]||'var(--accent)')+'">'+c.tier+'</span>'+
      '<div class="pc-reveal"><span class="pcr-wr">WR <b style="color:'+wrc+'">'+c.wr+'%</b></span><span class="pcr-pr">'+c.pr+'% PR</span></div>'+
    '</div><div class="pc-name">'+c.name+'</div><div class="pc-role">'+c.role+'</div></button>';
}
/* ФИЛЬТР = ПОКАЗАТЬ/СКРЫТЬ готовые карточки (закон антидёрганья).
   В сетке всегда ВСЕ чемпы; не подошедшие получают класс .is-off (display:none),
   поэтому клик по роли/букве в поиске меняет классы, а не пересоздаёт пул. */
var _hitSet=[];
function gridHTML(list){
  _hitSet=list;
  return '<div class="pick-grid hv-'+S.hover+(list.length?'':' is-empty')+'" id="pickGrid">'+
    POOL.map(pickCard).join('')+'<div class="pick-none">Ничего не найдено</div></div>'; }
function renderPicker(){
  var stage=document.getElementById('hrStage');
  var chips='<button class="role-chip'+(fRole==='all'?' on':'')+'" data-role="all" type="button">Все</button>'+
    roles().map(function(r){return '<button class="role-chip'+(fRole===r?' on':'')+'" data-role="'+r+'" type="button">'+r+'</button>';}).join('');
  var cmpToggle=F.cmp?'<button class="role-chip'+(_cmpMode?' on':'')+'" id="cmpToggle" type="button">⚖ Сравнить</button>':'';
  var cmpBar=(F.cmp&&_cmpMode)?'<div class="pick-cmpbar">Режим сравнения — отметь чемпов. Выбрано: <b>'+_cmpSel.length+'</b>'+
    '<button id="cmpGo" '+(_cmpSel.length<2?'disabled':'')+'>Сравнить '+_cmpSel.length+'</button>'+
    '<button class="clear" id="cmpClear">Очистить</button></div>':'';
  stage.className='hr-stage';
  // ТОЧЕЧНО: фильтр роли / поиск правят карточки, а не пересобирают пикер
  labMorph(stage,'<div class="picker glass"><div class="pick-head" data-key="head">'+
    '<input id="pickSearch" class="pick-search" type="text" placeholder="🔍 Поиск чемпиона…">'+
    '<div class="role-chips">'+chips+cmpToggle+'</div><div class="pick-count" id="pickCount"></div>'+cmpBar+'</div>'+gridHTML(filtered())+'</div>');
  var s=document.getElementById('pickSearch'); s.value=fQ;
  s.oninput=function(){ fQ=this.value; morphGrid(); bindCards(); updateCount(); };
  stage.querySelectorAll('.role-chip[data-role]').forEach(function(b){ b.onclick=function(){ fRole=b.dataset.role; renderPicker(); }; });
  var ct=document.getElementById('cmpToggle'); if(ct) ct.onclick=function(){ _cmpMode=!_cmpMode; if(!_cmpMode)_cmpSel=[]; renderPicker(); };
  var cg=document.getElementById('cmpGo'); if(cg) cg.onclick=function(){ if(_cmpSel.length>=2){ _cmpArr=_cmpSel.slice(0,CMP_MAX); openCompareTable(); } };
  var cc=document.getElementById('cmpClear'); if(cc) cc.onclick=function(){ _cmpSel=[]; renderPicker(); };
  bindCards(); updateCount();
}
function updateCount(){ var el=document.getElementById('pickCount'); if(el) el.textContent=filtered().length+' / '+POOL.length; }
/* поиск — правим содержимое сетки, а не выкидываем её целиком (антидёрганье) */
function morphGrid(){
  var g=document.getElementById('pickGrid'); if(!g) return;
  var t=document.createElement('div'); t.innerHTML=gridHTML(filtered());
  g.className=t.firstElementChild.className;
  labMorph(g, t.firstElementChild.innerHTML);
}
function bindCards(){ document.querySelectorAll('.pick-card').forEach(function(el){ el.onclick=function(){ var c=POOL[+el.dataset.i];
  if(_cmpMode){ var i=_cmpSel.indexOf(c); if(i>=0)_cmpSel.splice(i,1); else if(_cmpSel.length<CMP_MAX)_cmpSel.push(c); renderPicker(); }
  else openFromGrid(c); }; }); }
function renderFan(){
  var stage=document.getElementById('hrStage'); stage.className='hr-stage v-fan';
  var top=POOL.slice().sort(function(a,b){return b.wr-a.wr;}).slice(0,8); // веер = витрина ТОП-N
  stage.innerHTML=top.map(function(c){ var gi=POOL.indexOf(c);
    return '<div class="hr-card" data-i="'+gi+'"><div class="hr-art" style="background-image:url('+loadingArt(c.key)+')"></div>'+
      '<div class="hr-reveal-over">'+radarSVG(c)+'</div><div class="hr-shade"></div>'+
      '<div class="hr-body"><div class="hr-name">'+c.name+'</div><div class="hr-role">'+c.role+'</div><div class="click-tip">клик → страница</div></div></div>';
  }).join('');
  stage.querySelectorAll('.hr-card').forEach(function(el){ el.onclick=function(){ openFromGrid(POOL[+el.dataset.i]); }; });
}
function radarSVG(c){
  var n=QUAL.length,cx=120,cy=110,R=72;
  function pt(i,f){ var a=(-90+i*(360/n))*Math.PI/180; return [cx+Math.cos(a)*R*f,cy+Math.sin(a)*R*f]; }
  var grid=[0.33,0.66,1].map(function(g){return '<polygon points="'+QUAL.map(function(_,i){return pt(i,g).join(',');}).join(' ')+'" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="1"/>';}).join('');
  var axes=QUAL.map(function(_,i){var e=pt(i,1);return '<line x1="'+cx+'" y1="'+cy+'" x2="'+e[0]+'" y2="'+e[1]+'" stroke="rgba(255,255,255,.12)" stroke-width="1"/>';}).join('');
  var labels=QUAL.map(function(q,i){var l=pt(i,1.34);return '<text x="'+l[0]+'" y="'+l[1]+'" fill="#fff" font-size="11" font-weight="700" text-anchor="middle" dominant-baseline="middle">'+q.lbl+' '+c.r[q.id]+'</text>';}).join('');
  var data=QUAL.map(function(q,i){return pt(i,Math.max(.06,c.r[q.id]/10)).join(',');}).join(' ');
  var dots=QUAL.map(function(q,i){var p=pt(i,Math.max(.06,c.r[q.id]/10));return '<circle cx="'+p[0]+'" cy="'+p[1]+'" r="2.6" fill="var(--accent)"/>';}).join('');
  return '<div class="rv-radar"><svg viewBox="0 0 240 220">'+grid+axes+'<polygon points="'+data+'" fill="rgba(255, 255, 255,.22)" stroke="var(--accent)" stroke-width="2"/>'+dots+labels+'</svg></div>';
}

// ════════════════════════════════════════════════════════════════
// Статы / уровень
// ════════════════════════════════════════════════════════════════
var DLVL=10;
function dStat(base,id){ return id==='rng'?base:Math.round(base*(0.6+(DLVL-1)/14*0.6)); }
function xVal(c,id){ var x=c.x; if(!x) return null;
  if(id==='as') return x.as*(1+(x.asg/100)*(DLVL-1));
  if(id==='ms') return x.ms;
  if(id==='hpreg') return x.hpreg+x.hpregg*(DLVL-1);
  if(id==='mpreg') return (x.res!=='Mana')?null:(x.mpreg+x.mpregg*(DLVL-1));
  return null; }
function aVal(c,it){ return it.src==='base'?dStat(c.s[it.id],it.id):xVal(c,it.id); }
function buildStatsInner(c,cmp){
  return ALLSTATS.map(function(d){
    var v=aVal(c,d),txt=(v===null)?'—':(+v).toFixed(d.dec),hc=cmp?cmp(d,v):'',ic=svgIco(d.id,d.color);
    if(S.statStyle==='bars'){ var pct=(v===null)?0:Math.max(4,Math.min(100,Math.round(v/d.max*100)));
      return '<div class="xs-bar"><div class="xs-bt"><span class="lbl">'+ic+d.lbl+'</span><b class="xs-num'+hc+'" style="color:'+d.color+'">'+txt+'</b></div><div class="xs-bk"><i style="width:'+pct+'%;background:'+d.color+'"></i></div></div>'; }
    if(S.statStyle==='tiles') return '<div class="xs-tile">'+ic+'<span class="xs-t-v xs-num'+hc+'">'+txt+'</span><span class="xs-t-l">'+d.lbl+'</span></div>';
    if(S.statStyle==='rings'){ var C=163.36,p=(v===null)?0:Math.max(0,Math.min(1,v/d.max)),off=(C*(1-p)).toFixed(1);
      return '<div class="xs-ring"><svg viewBox="0 0 64 64"><circle class="xs-rg-bg" cx="32" cy="32" r="26"/><circle class="xs-rg-fg" cx="32" cy="32" r="26" stroke="'+d.color+'" stroke-dasharray="'+C+'" stroke-dashoffset="'+off+'"/></svg><span class="xs-r-v xs-num'+hc+'">'+txt+'</span><span class="xs-r-l">'+d.lbl+'</span></div>'; }
    return '<div class="xs-chip">'+ic+'<span class="xs-v xs-num'+hc+'">'+txt+'</span><span class="xs-l">'+d.lbl+'</span></div>';
  }).join('');
}
function buildStats(c,boxId,cmp){ return '<div id="'+(boxId||'statBox')+'" class="xstats xs-'+S.statStyle+'">'+buildStatsInner(c,cmp)+'</div>'; }
function dLevel(){ var fill=Math.round((DLVL-1)/14*100);
  return '<div class="d-level"><div class="d-level-row"><span>УРОВЕНЬ</span><b id="dLvlNum">'+DLVL+'</b></div><input type="range" id="dLvl" min="1" max="15" value="'+DLVL+'" style="--fill:'+fill+'%"></div>'; }

var CRIT_DMG=200,ENERGY_POOL=200,ENERGY_REGEN=50;
var GRID20=[
  {id:'ad',lbl:'AD',color:'var(--c-ad)'},{id:'ap',lbl:'AP',color:'#b07bff'},{id:'hp',lbl:'Тек. HP',color:'var(--c-hp)'},{id:'res',lbl:'Ресурс',color:'#5aa9ff'},
  {id:'arm',lbl:'Броня',color:'var(--c-arm)'},{id:'mr',lbl:'Mrez',color:'var(--c-mr)'},{id:'as',lbl:'Ск. атаки',color:'#f6c945'},{id:'ah',lbl:'Ускор. умений',color:'#7ee0c0'},
  {id:'critc',lbl:'Шанс крита',color:'#ff9f43'},{id:'critd',lbl:'Урон крита',color:'#ff6b6b'},{id:'hpreg',lbl:'Реген HP',color:'#5ad17a'},{id:'resreg',lbl:'Реген ресурса',color:'#5aa9ff'},
  {id:'arpen',lbl:'Проб. брони',color:'#e8a05a'},{id:'mpen',lbl:'Проб. магии',color:'#c08bff'},{id:'arpenp',lbl:'Проб. брони %',color:'#e8a05a'},{id:'mpenp',lbl:'Проб. магии %',color:'#c08bff'},
  {id:'pvamp',lbl:'Физ. вампиризм',color:'#ff6b6b'},{id:'mvamp',lbl:'Маг. вампиризм',color:'#c08bff'},{id:'ms',lbl:'Ск. перемещ.',color:'#7ee0c0'},{id:'ten',lbl:'Стойкость',color:'#f6c945'}
];
function gridVal(c,id){ var x=c.x||{};
  switch(id){
    case 'ad': return String(dStat(c.s.ad,'ad'));
    case 'hp': return String(dStat(c.s.hp,'hp'));
    case 'arm':return String(dStat(c.s.arm,'arm'));
    case 'mr': return String(dStat(c.s.mr,'mr'));
    case 'as': return (x.as?(x.as*(1+(x.asg/100)*(DLVL-1))):0).toFixed(2);
    case 'ms': return String(x.ms||0);
    case 'hpreg': return (x.hpreg?(x.hpreg+x.hpregg*(DLVL-1)):0).toFixed(1);
    case 'res': return x.res==='Energy'?String(ENERGY_POOL):'—';
    case 'resreg': return x.res==='Energy'?String(ENERGY_REGEN):x.res==='Mana'?(x.mpreg+x.mpregg*(DLVL-1)).toFixed(1):'—';
    case 'critd': return CRIT_DMG+'%';
    case 'ap': case 'ah': case 'arpen': case 'mpen': return '0';
    case 'critc': case 'arpenp': case 'mpenp': case 'pvamp': case 'mvamp': case 'ten': return '0%';
    default: return '0';
  }
}
function resLabel(c){ var r=(c.x||{}).res; return r==='Energy'?'Энергия':r==='Mana'?'Мана':'Ресурс'; }
function statGridInner(c){
  return GRID20.map(function(d){
    var lbl=d.id==='res'?resLabel(c):d.id==='resreg'?('Реген '+resLabel(c).toLowerCase()):d.lbl;
    var val=gridVal(c,d.id),dim=(val==='0'||val==='0%'||val==='—')?' g-dim':'';
    return '<div class="g-cell'+dim+'" title="'+lbl+'"><span class="g-l" style="color:'+d.color+'">'+svgIco(d.id,d.color)+lbl+'</span><span class="g-v" data-g="'+d.id+'">'+val+'</span></div>';
  }).join('');
}
function tabStatsGrid(c){ return '<div id="statGrid" class="stat-grid">'+statGridInner(c)+'</div>'; }

// ════════════════════════════════════════════════════════════════
// Демо-данные
// ════════════════════════════════════════════════════════════════
function _seed(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function _rng(seed){var s=seed||1;return function(){s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
function itemIcon(id){return 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/'+id+'.png';}
function spellIcon(n){return 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/'+n+'.png';}
function runeIcon(p){return 'https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/'+p+'.png';}
var ITEMS=[{n:'Eclipse',ic:itemIcon(6692)},{n:"Serylda's Grudge",ic:itemIcon(6694)},{n:'Black Cleaver',ic:itemIcon(3071)},{n:"Death's Dance",ic:itemIcon(6333)},{n:'Trinity Force',ic:itemIcon(3078)},{n:"Lord Dominik's",ic:itemIcon(3036)},{n:'Spear of Shojin',ic:itemIcon(3161)},{n:'Edge of Night',ic:itemIcon(3814)},{n:'Kraken Slayer',ic:itemIcon(6672)}];
var RUNES=[{n:'Conqueror',ic:runeIcon('Precision/Conqueror/Conqueror.png')},{n:'Grasp of the Undying',ic:runeIcon('Resolve/GraspOfTheUndying/GraspOfTheUndying.png')},{n:'Electrocute',ic:runeIcon('Domination/Electrocute/Electrocute.png')},{n:'Press the Attack',ic:runeIcon('Precision/PressTheAttack/PressTheAttack.png')},{n:'Fleet Footwork',ic:runeIcon('Precision/FleetFootwork/FleetFootwork.png')},{n:'Dark Harvest',ic:runeIcon('Domination/DarkHarvest/DarkHarvest.png')}];
var SPELLS=[{n:'Flash',ic:spellIcon('SummonerFlash')},{n:'Ignite',ic:spellIcon('SummonerDot')},{n:'Teleport',ic:spellIcon('SummonerTeleport')},{n:'Heal',ic:spellIcon('SummonerHeal')},{n:'Exhaust',ic:spellIcon('SummonerExhaust')},{n:'Ghost',ic:spellIcon('SummonerHaste')},{n:'Barrier',ic:spellIcon('SummonerBarrier')},{n:'Smite',ic:spellIcon('SummonerSmite')}];
function _pick(c,tag,pool,n){ var rnd=_rng(_seed(c.name+tag)); var arr=pool.map(function(it){return {n:it.n,ic:it.ic,wr:48+rnd()*15,pr:1.5+rnd()*22};});
  arr.sort(function(){return rnd()-0.5;}); return arr.slice(0,n).sort(function(a,b){return b.wr-a.wr;}); }
function _matchups(c){
  var extra=[{name:'Jax',key:'Jax'},{name:'Fiora',key:'Fiora'},{name:'Urgot',key:'Urgot'},{name:'Mordekaiser',key:'Mordekaiser'},{name:'Riven',key:'Riven'},{name:'Volibear',key:'Volibear'},{name:'Renekton',key:'Renekton'},{name:'Sett',key:'Sett'}];
  var all=POOL.filter(function(x){return x.key!==c.key;}).map(function(x){return {name:x.name,key:x.key};}).concat(extra);
  var rnd=_rng(_seed(c.name+'mu')); var list=all.map(function(x){return {name:x.name,key:x.key,wr:42+rnd()*18,pr:1+rnd()*8};});
  list.sort(function(a,b){return b.wr-a.wr;}); return list; }
function _history(c){ var rnd=_rng(_seed(c.name+'h')),out=[],wr=c.wr,pr=c.pr,br=c.br;
  for(var i=0;i<7;i++){ out.push({d:new Date(2026,5,8-i),wr:wr,pr:pr,br:br,dw:(rnd()-0.5)*0.9,dp:(rnd()-0.5)*0.3,db:(rnd()-0.5)*0.6}); wr-=out[i].dw; pr-=out[i].dp; br-=out[i].db; }
  return out; }
function _patchChanges(c){
  var rnd=_rng(_seed(c.name+'pc'));
  var pool=[['Q','урон','+8'],['W','щит','+12'],['E','перезарядка','−1.5с'],['R','урон','+40'],['Пассивка','скорость атаки','+5%'],['Базовое HP','','+45'],['Броня','рост','−0.3']];
  var out=[]; for(var i=0;i<4;i++){ var p=pool[Math.floor(rnd()*pool.length)],buff=rnd()>0.42, v='5.'+(3-i);
    out.push({ver:v,buff:buff,txt:'<b>'+p[0]+'</b> '+p[1]+' '+(buff?'усилен':'ослаблен')+' '+(p[2]||'')}); }
  return out; }
function _invRow(it,rank,cls,onDataAttr){
  return '<div class="inv-row'+(cls||'')+'"'+(onDataAttr||'')+'><span class="mu-rank">#'+rank+'</span><img class="inv-ic" src="'+it.ic+'" alt="" loading="lazy">'+
    '<span class="inv-nm">'+it.n+'</span><span class="inv-wr">'+it.wr.toFixed(1)+'%<i>WR</i></span><span class="inv-pr">'+it.pr.toFixed(1)+'%<i>PR</i></span></div>'; }

// ════════════════════════════════════════════════════════════════
// Секции страницы (каждая — под тумблером). Возвращают HTML или ''.
// ════════════════════════════════════════════════════════════════
function pgSec(title,inner,linkHint){ return '<div class="pg-sec glass"><div class="pg-h">'+title+(linkHint?'<span class="link-hint" data-hint="'+linkHint+'">'+linkHint+' →</span>':'')+'</div>'+inner+'</div>'; }

// умения
var SLOTLBL={passive:'Пасс',q:'Q',w:'W',e:'E',r:'R'},_abilSlot='q';
function abilOf(c){ return (window.LAB_ABIL&&window.LAB_ABIL[c.key])||[]; }
function abilCost(sp){ if(!sp.cost||sp.costType==='None') return ''; var unit=sp.costType==='Mana'?'маны':'эн.'; return '<span class="ab-meta-cost">◈ '+sp.cost+' '+unit+'</span>'; }
function abilVars(sp){ var rows=[]; if(sp.cd) rows.push({l:'Перезарядка',v:sp.cd+' c'}); (sp.vars||[]).forEach(function(v){ rows.push({l:v.l,v:v.v}); });
  if(!rows.length) return ''; return '<div class="ab-vars">'+rows.map(function(r){ var ranks=String(r.v).split('/'); var vv=ranks.length>1?ranks.map(function(x){return '<i>'+x+'</i>';}).join('<u>/</u>'):'<i>'+r.v+'</i>';
    return '<div class="ab-var"><span class="ab-var-l">'+r.l+'</span><span class="ab-var-v">'+vv+'</span></div>'; }).join('')+'</div>'; }
function abilInfo(sp){ return '<div class="ab-head"><img class="ab-head-ic" src="'+sp.icon+'" alt=""><div><div class="ab-name">'+sp.name+'</div><div class="ab-meta"><span class="ab-slot">'+(SLOTLBL[sp.slot]||sp.slot)+'</span>'+abilCost(sp)+'</div></div></div><div class="ab-desc">'+sp.desc+'</div>'+abilVars(sp); }
function abilRail(c){ return '<div class="abil-rail">'+abilOf(c).map(function(sp){ return '<button class="ab-ico'+(sp.slot===_abilSlot?' on':'')+'" data-slot="'+sp.slot+'" title="'+sp.name+'"><img src="'+sp.icon+'" alt=""><span>'+(SLOTLBL[sp.slot]||sp.slot)+'</span></button>'; }).join('')+'</div>'; }
function tabAbilities(c){ var ab=abilOf(c); if(!ab.length) return '<div class="d-empty">умения подгрузятся на боевом</div>';
  if(S.abilLayout==='list') return '<div class="abil abil-list">'+ab.map(function(sp){ return '<div class="abil-card">'+abilInfo(sp)+'</div>'; }).join('')+'</div>';
  var sp=ab.filter(function(s){return s.slot===_abilSlot;})[0]||ab[0];
  return '<div class="abil abil-'+S.abilLayout+'">'+abilRail(c)+'<div class="abil-main"><div class="abil-info">'+abilInfo(sp)+'</div></div></div>'; }
function secAbilities(c){ return pgSec('Умения','<div id="pgAbil">'+tabAbilities(c)+'</div>'); }
function secSkill(c){ var max=['Q','E','W'],dots=[];
  for(var lv=1;lv<=15;lv++){ var s=([1,3,5,7,9].indexOf(lv)>=0)?'Q':([4,8,11].indexOf(lv)>=0)?'W':([2,6,10].indexOf(lv)>=0)?'E':([5,9,13].indexOf(lv)>=0)?'R':'Q'; dots.push('<span class="sk-dot sk-'+s+'">'+lv+'</span>'); }
  return pgSec('Порядок прокачки','<div class="pg-skill"><div class="sk-max">Максить: '+max.map(function(s){return '<b>'+s+'</b>';}).join(' › ')+' · Ульта <b>R</b> на 5/9/13</div><div class="sk-row">'+dots.join('')+'</div></div>'); }
function secStats(c){ return pgSec('Статы по уровню',dLevel()+(S.statStyle==='grid'?tabStatsGrid(c):buildStats(c,'statBox'))); }
function secBuild(c){ var rows=_pick(c,'it',ITEMS,6).map(function(it,i){ return _invRow(it,i+1,F.build?' clickable':'',' data-goto="Сборка"'); }).join('');
  return pgSec('Рекомендованные билды','<div class="d-panel">'+rows+'</div>',F.build?'Открыть Сборку':''); }
function secRunes(c){ var rows=_pick(c,'rn',RUNES,5).map(function(it,i){ return _invRow(it,i+1,F.runes?' clickable':'',' data-goto="пикер Рун"'); }).join('');
  var sp=_pick(c,'sp',SPELLS,4).map(function(it,i){ return _invRow(it,i+1,'',''); }).join('');
  return pgSec('Руны и заклинания','<div class="d-panel">'+rows+'</div><div class="d-panel" style="margin-top:10px">'+sp+'</div>',F.runes?'Пикер рун':''); }
function secMatch(c){
  var mu=_matchups(c),best=mu.slice(0,5),worst=mu.slice(-5).reverse();
  function row(m,rank,good){ return '<div class="mu-row"><span class="mu-rank">#'+rank+'</span><img src="'+icon(m.key)+'" alt="" loading="lazy"><span class="mu-nm">'+m.name+'</span><span class="mu-wr" style="color:'+(good?'var(--good)':'var(--bad)')+'">'+m.wr.toFixed(1)+'%</span><span class="mu-pr">'+m.pr.toFixed(1)+'%</span></div>'; }
  var counters=(c.weak||[]).map(function(x){return '<span class="d-chip"><img src="'+icon(x.k)+'" alt="">'+x.n+'</span>';}).join('')||'<span class="d-empty">—</span>';
  return pgSec('Матчапы и контры','<div class="d-two"><div class="d-panel"><div class="d-panel-h good">▲ Силён против</div>'+best.map(function(m,i){return row(m,i+1,true);}).join('')+'</div>'+
    '<div class="d-panel"><div class="d-panel-h bad">▼ Слаб против</div>'+worst.map(function(m,i){return row(m,mu.length-i,false);}).join('')+'</div></div>'+
    '<div class="pg-counters"><span class="pg-ct-l">⚠ Осторожно:</span>'+counters+'</div>'); }
function secSynergy(c){
  var rnd=_rng(_seed(c.name+'syn'));
  var syn=(c.combo&&c.combo.length?c.combo:[{n:'Lux',k:'Lux'},{n:'Thresh',k:'Thresh'}]).map(function(x){ return {n:x.n,k:x.k,wr:(52+rnd()*6).toFixed(1)}; });
  return pgSec('Синергии (с кем силён)','<div class="syn-row">'+syn.map(function(x){ return '<div class="syn-chip"><img src="'+icon(x.k)+'" alt=""><div><div class="syn-nm">'+x.n+'</div><div class="syn-wr">вместе '+x.wr+'% WR</div></div></div>'; }).join('')+'</div>'); }
function secMeta(c){
  var h=_history(c),ws=h.map(function(x){return x.wr;}).reverse(),mn=Math.min.apply(0,ws),mx=Math.max.apply(0,ws),rg=(mx-mn)||1;
  var pts=ws.map(function(v,i){return (i/(ws.length-1)*260+10).toFixed(1)+','+(45-(v-mn)/rg*32).toFixed(1);}).join(' ');
  var trend=+(h[0].wr-h[h.length-1].wr).toFixed(1);
  return pgSec('Мета: тир / винрейт',
    '<div class="d-panel"><div class="db-main">'+
      '<div class="db-wr"><b style="color:'+(c.wr>=50?'var(--good)':'var(--bad)')+'">'+c.wr+'%</b><span>WR</span>'+trendArrow(trend)+'</div>'+
      '<div class="db-chip">Тир <b style="color:'+(DTIER[c.tier]||'#fff')+'">'+c.tier+'</b></div>'+
      '<div class="db-chip">'+c.pr+'%<i>ПИК</i></div><div class="db-chip">'+c.br+'%<i>БАН</i></div></div>'+
      '<div style="margin-top:10px"><div class="lrn-sub">WR по патчам</div><svg class="spark" viewBox="0 0 280 52"><polyline points="'+pts+'" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/></svg></div></div>'); }
function secPatch(c){
  var rows=_patchChanges(c).map(function(p){ return '<div class="patch-row"><span class="patch-ver">'+p.ver+'</span><span class="patch-tag '+(p.buff?'buff':'nerf')+'">'+(p.buff?'🔼 БУФ':'🔽 НЕРФ')+'</span><span class="patch-txt">'+p.txt+'</span></div>'; }).join('');
  return pgSec('Изменения по патчам','<div class="patch-list">'+rows+'</div>'); }
function secYoutube(c){
  var rnd=_rng(_seed(c.name+'yt'));
  var yt=[{t:c.name+': лучший билд и комбо (гайд 2026)',ch:'WildRift Mastery',v:(40+Math.floor(rnd()*180))+'K'},
          {t:'Как карри на '+c.name+' — макро и тимфайты',ch:'Rift Academy',v:(20+Math.floor(rnd()*120))+'K'}];
  var tw=[{ch:c.name+'OTP',live:rnd()>0.5,vw:(Math.floor(rnd()*30)/10+0.3).toFixed(1)+'K'},{ch:'ProRift_'+c.key,live:rnd()>0.6,vw:(Math.floor(rnd()*20)/10+0.2).toFixed(1)+'K'}];
  var ytHTML=yt.map(function(v){return '<a class="lrn-yt" href="#" onclick="return false"><span class="lrn-thumb" style="background-image:url('+splashArt(c.key)+')"><i class="lrn-play">▶</i></span><span class="lrn-yt-t">'+v.t+'</span><span class="lrn-yt-m">'+v.ch+' · '+v.v+' просм.</span></a>';}).join('');
  var twHTML=tw.map(function(s){return '<a class="lrn-tw" href="#" onclick="return false"><span>'+s.ch+'</span>'+(s.live?'<span class="lrn-live">🔴 LIVE · '+s.vw+'</span>':'<span class="lrn-off">оффлайн</span>')+'</a>';}).join('');
  return pgSec('Видео сильных игроков','<div class="lrn-wrap"><div><div class="lrn-sub">▶ YouTube</div>'+ytHTML+'</div><div><div class="lrn-sub">🟣 Twitch</div>'+twHTML+'<div class="lrn-note">демо · список ведём вручную, LIVE — авто</div></div></div>'); }
function secGuide(c){
  return pgSec('Гайд и советы','<div class="guide-txt"><b>'+c.name+'</b> — '+c.role.toLowerCase()+' архетипа «'+c.tags.join('/')+'». Сложность '+c.r.diff+'/10.'+
    '<ul><li>Ранняя игра: используй дальность и позицию, не рискуй без видения.</li>'+
    '<li>Пики силы — уровни 6/11 (ульта). Ищи фарм и объекты.</li>'+
    '<li>Против '+(c.weak[0]?c.weak[0].n:'контр-пиков')+' играй пассивно, зови ганки.</li></ul>'+
    '<div class="lrn-note">демо-текст · на боевом — редакторский гайд</div></div>'); }

function trendArrow(d){ return d>0.05?'<i class="tr-up">▲ '+d.toFixed(1)+'</i>':d<-0.05?'<i class="tr-dn">▼ '+Math.abs(d).toFixed(1)+'</i>':'<i class="tr-fl">—</i>'; }
function dBrief(c){
  var wrCol=c.wr>=50?'var(--good)':'var(--bad)',h=_history(c),trend=+(h[0].wr-h[h.length-1].wr).toFixed(1);
  var parts='<div class="db-wr"><b style="color:'+wrCol+'">'+c.wr+'%</b><span>WR</span>'+trendArrow(trend)+'</div>'+
    '<div class="db-chip">'+c.pr+'%<i>PR</i></div><div class="db-chip">'+c.br+'%<i>BR</i></div>'+
    '<div class="db-chip">'+c.tags.join(' · ')+' · сложн. '+c.r.diff+'/10</div>';
  return '<div class="d-brief"><div class="db-main">'+parts+'</div><div class="db-radar">'+radarSVG(c)+'</div></div>';
}

// секции под тумблерами (порядок = порядок на странице/вкладках)
function pageSecDefs(c){
  var defs=[];
  if(F.abil) defs.push({id:'abil',label:'Умения',html:secAbilities(c)});
  if(F.skill) defs.push({id:'skill',label:'Прокачка',html:secSkill(c)});
  if(F.stats) defs.push({id:'stats',label:'Статы',html:secStats(c)});
  if(F.build) defs.push({id:'build',label:'Билды',html:secBuild(c)});
  if(F.runes) defs.push({id:'runes',label:'Руны',html:secRunes(c)});
  if(F.match) defs.push({id:'match',label:'Матчапы',html:secMatch(c)});
  if(F.syn) defs.push({id:'syn',label:'Синергии',html:secSynergy(c)});
  if(F.meta) defs.push({id:'meta',label:'Мета',html:secMeta(c)});
  if(F.patch) defs.push({id:'patch',label:'Патчи',html:secPatch(c)});
  if(F.yt) defs.push({id:'yt',label:'Видео',html:secYoutube(c)});
  if(F.guide) defs.push({id:'guide',label:'Гайд',html:secGuide(c)});
  return defs;
}

// ════════════════════════════════════════════════════════════════
// Оверлей: попап-превью / страница / сравнение
// ════════════════════════════════════════════════════════════════
var _openC=null,_openMode=null,_pageFromPopup=false,_cmpArr=null,CMP_MAX=6;
function ovShow(ov){ ov.hidden=false; requestAnimationFrame(function(){ ov.classList.add('show'); }); }
function ovClear(){ _openMode=null; _cmpArr=null; _openC=null; clearSEO(); var ov=document.getElementById('hrOverlay');
  ov.classList.remove('show'); setTimeout(function(){ ov.hidden=true; ov.innerHTML=''; },300); }
function refreshOpen(){ var ov=document.getElementById('hrOverlay'); if(!ov||ov.hidden) return;
  if(_cmpArr) openCompareTable(); else if(_openMode==='page'&&_openC) openPage(_openC); else if(_openC) openDetail(_openC); }
function openFromGrid(c){ DLVL=10; _pageTab=null; if(S.clickOpens==='page'){ _pageFromPopup=false; openPage(c); } else openDetail(c); }

function actionsBtns(c){
  var share=F.share?'<button class="pg-link pg-share" type="button">📤 В чат</button><button class="pg-link pg-inbuild" type="button">🛠 В Сборке</button>':'';
  var cmp=F.cmp?'<button class="pg-link pg-cmp" type="button">⚖ Сравнить</button>':'';
  return '<div class="pg-actions"><a class="pg-link" href="#" onclick="return false">▶ Гайд</a>'+cmp+share+'<button class="pg-link" type="button">★ Избранное</button></div>';
}

function openDetail(c){
  _openC=c; _openMode='popup'; _cmpArr=null;
  var ov=document.getElementById('hrOverlay'); ov.className='hr-overlay';
  var tier='<span class="d-tier" style="--tc:'+(DTIER[c.tier]||'var(--accent)')+'">'+c.tier+'</span>';
  var tags='<div class="d-tags">'+c.tags.map(function(t){return '<span>'+t+'</span>';}).join('')+'</div>';
  ov.innerHTML='<div class="ov-center"><div class="champ-card glass">'+
    '<div class="cc-art" style="background-image:url('+splashArt(c.key)+')"><div class="cc-head">'+
      '<img class="d-portrait ic-'+S.iconShape+'" src="'+icon(c.key)+'" alt=""><div><div class="d-nameRow"><div class="d-name">'+c.name+'</div>'+tier+'</div><div class="d-role">'+c.role+'</div>'+tags+'</div></div></div>'+
    '<button class="d-close" type="button">✕</button>'+
    '<div class="cc-body">'+dBrief(c)+'<div class="d-actions"><button class="d-btn d-more" type="button">Открыть полную страницу →</button></div>'+
      '<div class="lrn-note">Это краткая версия (как в таблицах). Полная = страница чемпа.</div></div></div></div>';
  ovShow(ov);
  ov.querySelector('.d-close').onclick=ovClear;
  ov.onclick=function(e){ if(e.target===ov||e.target.classList.contains('ov-center')) ovClear(); };
  ov.querySelector('.d-more').onclick=function(){ _pageFromPopup=true; openPage(c); };
}

// ── SEO: hash-роутинг + h1 + крошки + JSON-LD ──
function injectSEO(c){
  if(!F.seo) return;
  try{ history.replaceState(null,'','#/champion/'+slugOf(c)); }catch(e){}
  var old=document.getElementById('champLD'); if(old) old.remove();
  var ld=document.createElement('script'); ld.type='application/ld+json'; ld.id='champLD';
  ld.textContent=JSON.stringify({"@context":"https://schema.org","@type":"Article",
    "headline":c.name+" — гайд, билд, руны, матчапы (Wild Rift)",
    "about":{"@type":"Thing","name":c.name},"inLanguage":"ru",
    "breadcrumb":{"@type":"BreadcrumbList","itemListElement":[
      {"@type":"ListItem","position":1,"name":"Чемпионы"},
      {"@type":"ListItem","position":2,"name":c.name}]}});
  document.head.appendChild(ld);
  document.title=c.name+' — гайд Wild Rift';
}
function clearSEO(){ var old=document.getElementById('champLD'); if(old) old.remove();
  try{ if(location.hash.indexOf('#/champion/')===0) history.replaceState(null,'',location.pathname+location.search); }catch(e){}
  document.title='lab-hover-reveal — страница чемпиона (SEO)'; }

function pageHero(c,side){
  var tier='<span class="d-tier" style="--tc:'+(DTIER[c.tier]||'var(--accent)')+'">'+c.tier+'</span>';
  return '<div class="pg-hero glass"><img class="pg-portrait ic-'+S.iconShape+'" src="'+icon(c.key)+'" alt="'+c.name+'">'+
    '<div class="pg-head-main"><div class="d-nameRow"><div class="pg-name">'+c.name+'</div>'+tier+'</div>'+
    '<div class="pg-role">'+c.role+' · '+c.tags.join(' · ')+'</div>'+dBrief(c)+'</div>'+
    (side?'<div class="pg-hero-side">'+side+'</div>':'')+'</div>'; }
var _pageTab=null;
function bindPageContent(ov,c){
  ov.querySelectorAll('.ab-ico').forEach(function(b){ b.onclick=function(){ _abilSlot=b.dataset.slot;
    var a=ov.querySelector('#pgAbil'); if(a){ a.innerHTML=tabAbilities(c); bindPageContent(ov,c); } }; });
  var sl=ov.querySelector('#dLvl');
  if(sl) sl.oninput=function(){ DLVL=+this.value; this.style.setProperty('--fill',Math.round((DLVL-1)/14*100)+'%');
    var n=ov.querySelector('#dLvlNum'); if(n)n.textContent=DLVL;
    var g=ov.querySelector('#statGrid'); if(g)g.innerHTML=statGridInner(c);
    var bx=ov.querySelector('#statBox'); if(bx)bx.innerHTML=buildStatsInner(c); };
  ov.querySelectorAll('.link-hint,[data-goto]').forEach(function(b){ b.onclick=function(e){ e.stopPropagation();
    var t=b.getAttribute('data-hint')||b.getAttribute('data-goto'); toast('→ откроется раздел: '+t); }; });
  var sh=ov.querySelector('.pg-share'); if(sh) sh.onclick=function(){ toast('📤 Карточка-ссылка '+c.name+' готова к отправке в чат'); };
  var ib=ov.querySelector('.pg-inbuild'); if(ib) ib.onclick=function(){ toast('🛠 '+c.name+' открыт в разделе Сборка'); };
  var cm=ov.querySelector('.pg-cmp'); if(cm) cm.onclick=function(){ openComparePicker(c); };
}
function openPage(c){
  _openC=c; _openMode='page'; _cmpArr=null;
  injectSEO(c);
  var ov=document.getElementById('hrOverlay'); ov.className='hr-overlay';
  var actions=actionsBtns(c),defs=pageSecDefs(c);
  var crumbs=F.seo?'<nav class="pg-crumbs" aria-label="Хлебные крошки"><a href="#" onclick="return false">Чемпионы</a> › <b>'+c.name+'</b></nav>':'';
  var h1=F.seo?'<h1 class="pg-h1">'+c.name+' — гайд, билды, руны и матчапы Wild Rift</h1>':'';
  var body;
  if(S.pageLayout==='single'){
    if(!_pageTab||!defs.some(function(d){return d.id===_pageTab;})) _pageTab=defs.length?defs[0].id:null;
    var tabbar='<div class="pg-tabbar">'+defs.map(function(d){return '<button class="pg-tab'+(_pageTab===d.id?' on':'')+'" data-pt="'+d.id+'">'+d.label+'</button>';}).join('')+'</div>';
    var active=defs.filter(function(d){return d.id===_pageTab;})[0];
    body=pageHero(c,actions)+tabbar+'<div id="pgTab" class="pg-tabwrap">'+(active?active.html:'')+'</div>';
  } else {
    var colA=[],colB=[]; defs.forEach(function(d,i){ (i%2?colB:colA).push(d.html); });
    var grid='<div class="pg-col">'+colA.join('')+'</div><div class="pg-col">'+colB.join('')+'</div>';
    if(S.pageLayout==='sidebar') body='<div class="pg-shell"><aside class="pg-side">'+pageHero(c,actions)+'</aside><div class="pg-data">'+grid+'</div></div>';
    else body=pageHero(c,actions)+'<div class="pg-2col">'+grid+'</div>';
  }
  ov.innerHTML='<div class="champ-page"><div class="pg-bg" style="background-image:url('+splashArt(c.key)+')"></div>'+
    '<div class="pg-inner">'+h1+'<div class="pg-topbar"><button class="pg-back" type="button">← Назад</button><button class="pg-x d-close" type="button">✕</button></div>'+
      crumbs+body+'</div></div>';
  ovShow(ov);
  ov.querySelector('.d-close').onclick=ovClear;
  ov.querySelector('.pg-back').onclick=function(){ if(_pageFromPopup){ clearSEO(); openDetail(c); } else ovClear(); };
  ov.querySelectorAll('.pg-tab').forEach(function(b){ b.onclick=function(){ _pageTab=b.dataset.pt;
    ov.querySelectorAll('.pg-tab').forEach(function(x){x.classList.toggle('on',x===b);});
    var active=pageSecDefs(c).filter(function(d){return d.id===_pageTab;})[0];
    var t=ov.querySelector('#pgTab'); if(t){ t.innerHTML=active?active.html:''; bindPageContent(ov,c); } }; });
  bindPageContent(ov,c);
}

// ════════════════════════════════════════════════════════════════
// Сравнение = таблица (без внутр. скролла)
// ════════════════════════════════════════════════════════════════
function statCmpHi(v,mx,mn){ if(v===null||mx===null||mx===mn) return ''; return v===mx?' st-hi':(v===mn?' st-lo':''); }
function openComparePicker(c1){
  var ov=document.getElementById('hrOverlay'); ov.className='hr-overlay';
  var list=POOL.filter(function(x){return x.key!==c1.key;});
  ov.innerHTML='<div class="ov-center"><div class="cmp-pick glass thin-scroll">'+
    '<div class="cmp-pick-h"><button class="cmp-back" type="button">← Назад</button><span>С кем сравнить <b>'+c1.name+'</b>?</span><button class="d-close" type="button">✕</button></div>'+
    '<input id="cmpSearch" class="pick-search" type="text" placeholder="🔍 Поиск чемпиона…">'+
    '<div class="cmp-pick-grid">'+list.map(function(x){return '<button class="cmp-pick-c" data-k="'+x.key+'" type="button"><img src="'+icon(x.key)+'" alt="" loading="lazy"><span>'+x.name+'</span></button>';}).join('')+'</div></div></div>';
  ovShow(ov);
  ov.querySelector('.d-close').onclick=ovClear;
  ov.querySelector('.cmp-back').onclick=function(){ openPage(c1); };
  ov.querySelector('#cmpSearch').oninput=function(){ var q=this.value.trim().toLowerCase();
    ov.querySelectorAll('.cmp-pick-c').forEach(function(b){ var nm=b.querySelector('span').textContent.toLowerCase(); b.style.display=(!q||nm.indexOf(q)>=0)?'':'none'; }); };
  ov.querySelectorAll('.cmp-pick-c').forEach(function(b){ b.onclick=function(){ var c2=POOL.find(function(x){return x.key===b.dataset.k;}); if(c2){ _cmpArr=[c1,c2]; openCompareTable(); } }; });
}
function ctCell(c,d,list){
  var v=aVal(c,d),nums=list.map(function(x){return aVal(x,d);}).filter(function(x){return x!==null;});
  var mx=nums.length?Math.max.apply(null,nums):null,mn=nums.length?Math.min.apply(null,nums):null,spread=(mx!==null&&mx!==mn);
  var cls=spread?statCmpHi(v,mx,mn):'',txt=(v===null)?'—':(+v).toFixed(d.dec);
  var inner='<b class="ct-v xs-num'+cls+'">'+txt;
  if(v!==null&&spread) inner+=(v===mx)?'<i class="ct-ar up">▲</i>':(v===mn?'<i class="ct-ar dn">▼</i>':'');
  inner+='</b>'; var pct=(v===null)?0:Math.max(4,Math.min(100,Math.round(v/d.max*100)));
  inner+='<div class="ct-bar"><i style="width:'+pct+'%;background:'+d.color+'"></i></div>';
  return '<div class="ct-cell">'+inner+'</div>';
}
function cmpTableInner(list){
  var labels='<div class="ct-labels"><div class="ct-corner">СТАТЫ</div>'+ALLSTATS.map(function(d){return '<div class="ct-lbl">'+svgIco(d.id,d.color)+d.lbl+'</div>';}).join('')+'</div>';
  var cols=list.map(function(c,i){
    return '<div class="ct-col"><div class="ct-colh">'+(list.length>2?'<button class="ct-rm" data-i="'+i+'" type="button" title="Убрать">✕</button>':'')+
      '<img class="ct-port ic-'+S.iconShape+'" src="'+icon(c.key)+'" data-open="'+c.key+'" alt="" title="Открыть страницу"><div class="ct-nm">'+c.name+'</div>'+
      '<span class="ct-tier" style="--tc:'+(DTIER[c.tier]||'var(--accent)')+'">'+c.tier+'</span><div class="ct-wr"><b>'+c.wr+'%</b> WR</div></div>'+
      ALLSTATS.map(function(d){return ctCell(c,d,list);}).join('')+'</div>';
  }).join('');
  var add=(list.length<CMP_MAX)?'<button class="ct-add" type="button"><span>＋</span><i>чемпион</i></button>':'';
  return labels+cols+add;
}
function bindTable(ov,list){
  ov.querySelectorAll('.ct-rm').forEach(function(b){ b.onclick=function(){ _cmpArr.splice(+b.dataset.i,1); openCompareTable(); }; });
  ov.querySelectorAll('.ct-add').forEach(function(b){ b.onclick=openComparePickerAdd; });
  ov.querySelectorAll('.ct-port[data-open]').forEach(function(b){ b.onclick=function(){ var c=POOL.find(function(x){return x.key===b.dataset.open;}); if(c){ _cmpArr=null; _pageFromPopup=false; openPage(c); } }; });
}
function openCompareTable(){
  var list=_cmpArr.slice(0,CMP_MAX);
  var ov=document.getElementById('hrOverlay'); ov.className='hr-overlay';
  ov.innerHTML='<div class="ov-center"><div class="cmp-wrap glass">'+
    '<button class="d-close" type="button">✕</button>'+
    '<div class="cmp-top"><div class="cmp-title">⚖ Сравнение · '+list.length+'</div>'+
      '<div class="cmp-lvl"><span>УРОВЕНЬ</span><b id="cmpLvlNum">'+DLVL+'</b><input type="range" id="cmpLvl" min="1" max="15" value="'+DLVL+'" style="--fill:'+Math.round((DLVL-1)/14*100)+'%"></div></div>'+
    '<div class="cmp-table">'+cmpTableInner(list)+'</div></div></div>';
  ovShow(ov);
  ov.querySelector('.d-close').onclick=ovClear;
  ov.onclick=function(e){ if(e.target===ov||e.target.classList.contains('ov-center')) ovClear(); };
  bindTable(ov,list);
  ov.querySelector('#cmpLvl').oninput=function(){ DLVL=+this.value; this.style.setProperty('--fill',Math.round((DLVL-1)/14*100)+'%');
    ov.querySelector('#cmpLvlNum').textContent=DLVL; var tb=ov.querySelector('.cmp-table'); if(tb){ tb.innerHTML=cmpTableInner(list); bindTable(ov,list); } };
}
function openComparePickerAdd(){
  var ov=document.getElementById('hrOverlay'); ov.className='hr-overlay';
  var have=_cmpArr.map(function(c){return c.key;}),list=POOL.filter(function(x){return have.indexOf(x.key)<0;});
  ov.innerHTML='<div class="ov-center"><div class="cmp-pick glass thin-scroll">'+
    '<div class="cmp-pick-h"><button class="cmp-back" type="button">← Назад</button><span>Добавить чемпиона</span><button class="d-close" type="button">✕</button></div>'+
    '<input id="cmpSearchA" class="pick-search" type="text" placeholder="🔍 Поиск чемпиона…">'+
    '<div class="cmp-pick-grid">'+list.map(function(x){return '<button class="cmp-pick-c" data-k="'+x.key+'" type="button"><img src="'+icon(x.key)+'" alt="" loading="lazy"><span>'+x.name+'</span></button>';}).join('')+'</div></div></div>';
  ovShow(ov);
  ov.querySelector('.d-close').onclick=ovClear;
  ov.querySelector('.cmp-back').onclick=openCompareTable;
  ov.querySelector('#cmpSearchA').oninput=function(){ var q=this.value.trim().toLowerCase();
    ov.querySelectorAll('.cmp-pick-c').forEach(function(b){ var nm=b.querySelector('span').textContent.toLowerCase(); b.style.display=(!q||nm.indexOf(q)>=0)?'':'none'; }); };
  ov.querySelectorAll('.cmp-pick-c').forEach(function(b){ b.onclick=function(){ var c=POOL.find(function(x){return x.key===b.dataset.k;}); if(c&&_cmpArr.length<CMP_MAX) _cmpArr.push(c); openCompareTable(); }; });
}

document.addEventListener('keydown',function(e){ if(e.key==='Escape'){ var ov=document.getElementById('hrOverlay'); if(!ov.hidden) ovClear(); else { var p=document.getElementById('settingsPop'); if(!p.hidden) p.hidden=true; } } });

// ── СТАРТ ──
applyGlass(); applyVars(); buildStrip(); setupStrip(); setupSettings(); render();
// deep-link: если открыли #/champion/slug — сразу страница
(function(){ var m=location.hash.match(/#\/champion\/([a-z0-9-]+)/); if(m){ var c=POOL.find(function(x){return slugOf(x)===m[1];}); if(c){ _pageFromPopup=false; openPage(c); } } })();

})();
