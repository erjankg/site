/* ════════════════════════════════════════════════════════════════
   Пикер чемпионов (сетка) + god-tier раскладки (Веер/Колода/…)
   + финальная стеклянная карточка по клику.
   ════════════════════════════════════════════════════════════════ */
(function(){
'use strict';

var DD='https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/';
function icon(k){ return DD+k+'.png'; }
function loadingArt(k){ return 'https://ddragon.leagueoflegends.com/cdn/img/champion/loading/'+k+'_0.jpg'; }
function splashArt(k){ return 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/'+k+'_0.jpg'; }

var SMAX={ad:140,hp:2600,arm:160,mr:95,rng:650};
var SDEF=[
  {id:'ad', lbl:'AD',   ic:'⚔', color:'var(--c-ad)'},
  {id:'hp', lbl:'HP',   ic:'✚', color:'var(--c-hp)'},
  {id:'arm',lbl:'Броня',ic:'🛡',color:'var(--c-arm)'},
  {id:'mr', lbl:'МС',   ic:'✦', color:'var(--c-mr)'},
  {id:'rng',lbl:'RNG',  ic:'🏹',color:'var(--c-rng)'}
];
var QUAL=[
  {id:'power',lbl:'Сила'},{id:'dmg',lbl:'Урон'},{id:'diff',lbl:'Сложн.'},
  {id:'combo',lbl:'Комбо'},{id:'meta',lbl:'Мета'},{id:'mobility',lbl:'Мобил.'}
];

// ── пул чемпионов (на боевом подтянется ~140 из Google-таблицы) ──
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

// ── ДОП. СТАТЫ (новое, Часть 2): скорость атаки / передвижения / реген HP / реген маны ──
// Реальные базовые значения + рост (на боевом придут из base-stats.json). asg — %/уровень.
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

// ── ЕДИНЫЙ список ВСЕХ статов (базовые + новые) — показываем одним блоком, одним стилем ──
// src:'base' → значение из c.s (масштаб по уровню через dStat); src:'x' → из c.x (через xVal)
var ALLSTATS=[
  {id:'ad',   lbl:'AD',        ic:'⚔', color:'var(--c-ad)',  max:140,  dec:0, src:'base'},
  {id:'hp',   lbl:'HP',        ic:'✚', color:'var(--c-hp)',  max:2600, dec:0, src:'base'},
  {id:'arm',  lbl:'Броня',     ic:'🛡',color:'var(--c-arm)', max:160,  dec:0, src:'base'},
  {id:'mr',   lbl:'Mrez',      ic:'✦', color:'var(--c-mr)',  max:95,   dec:0, src:'base'},
  {id:'rng',  lbl:'RNG',       ic:'🏹',color:'var(--c-rng)', max:650,  dec:0, src:'base'},
  {id:'as',   lbl:'Ск.Атк',    ic:'⚡', color:'#f6c945',      max:1.2,  dec:2, src:'x'},
  {id:'ms',   lbl:'Ск.Пер',    ic:'👟', color:'#7ee0c0',      max:400,  dec:0, src:'x'},
  {id:'hpreg',lbl:'HP regen',  ic:'❤️', color:'#5ad17a',      max:22,   dec:1, src:'x'},
  {id:'mpreg',lbl:'Mana regen',ic:'🔷', color:'#5aa9ff',      max:22,   dec:1, src:'x'}
];

var DTIER={S:'#ff4d6d',A:'#ff9f43',B:'#ffd93d',C:'#54d98c',D:'#7ec8e3'};

// готовый цвет «гаммы» сплэша под каждого чемпа (надёжный фолбэк, т.к. ddragon без CORS)
var ARTCOL={Ezreal:'#3a7bd5',Caitlyn:'#c2873a',Jinx:'#2f8fd0',Ahri:'#d65a8f',Yasuo:'#4a90c2',Lux:'#d8b24a',
  Thresh:'#2f9e6a',Zed:'#b23a3a',LeeSin:'#c97a2a',Garen:'#3a78c0',Darius:'#8a3a3a',Soraka:'#7a86d6',Malphite:'#5a90b0'};

// ── доминирующий цвет сплэш-арта (для фона карточки) ──
var _colCache={};
function artColor(key, cb){
  if(_colCache[key]){ cb(_colCache[key]); return; }
  var img=new Image(); img.crossOrigin='anonymous';
  img.onload=function(){
    try{
      var cv=document.createElement('canvas'), w=cv.width=28, h=cv.height=28, ctx=cv.getContext('2d');
      ctx.drawImage(img,0,0,w,h);
      var d=ctx.getImageData(0,0,w,h).data, r=0,g=0,b=0,n=0,sw=0;
      for(var i=0;i<d.length;i+=4){
        if(d[i+3]<128) continue;
        var R=d[i],G=d[i+1],B=d[i+2];
        var mx=Math.max(R,G,B), mn=Math.min(R,G,B);
        var sat=mx===0?0:(mx-mn)/mx;               // взвешиваем по насыщенности — берём «живой» цвет, не серость
        var wgt=0.15+sat;
        r+=R*wgt; g+=G*wgt; b+=B*wgt; sw+=wgt; n++;
      }
      if(!n||!sw){ cb(null); return; }
      var col='rgb('+Math.round(r/sw)+','+Math.round(g/sw)+','+Math.round(b/sw)+')';
      _colCache[key]=col; cb(col);
    }catch(e){ cb(null); }
  };
  img.onerror=function(){ cb(null); };
  img.src=splashArt(key);
}

// ════════════════════════════════════════════════════════════════
// Параметры
// ════════════════════════════════════════════════════════════════
var LAYOUTS=[
  {id:'grid',     name:'Пикер-сетка', desc:'много чемпов, для боевого'},
  {id:'fan',      name:'Веер',        desc:'god-tier 🔥'},
  {id:'zoom',     name:'Зум-оверлей', desc:'крупнее поверх'},
  {id:'flip',     name:'Переворот',   desc:'статы на обороте'},
  {id:'curtain',  name:'Шторка',      desc:'выезжает снизу'},
  {id:'side',     name:'Вбок',        desc:'панель сбоку'},
  {id:'spotlight',name:'Прожектор',   desc:'соседи в блюр'},
  {id:'deck',     name:'Колода',      desc:'стопка веером'}
];

var CONTROLS=[
  {key:'statStyle', label:'⭐ Статы: стиль (ВСЕ вместе)', type:'seg', opts:[['badges','Бейджи'],['chips','Чипсы'],['bars','Бары'],['tiles','Плитки'],['rings','Кольца']]},
  {key:'cmpCard',   label:'⚖ Карточки сравнения', type:'seg', opts:[['glass','Стекло'],['splash','Сплэш 3D'],['table','Таблица']]},
  {key:'cmpCell',   label:'⚖ Таблица: вид ячейки', type:'seg', opts:[['bar','Число+бар'],['num','Число'],['arrow','Число+стрелка']]},
  {key:'size',    label:'Размер карточек (сетка)', type:'seg', opts:[['s','Мелкие'],['m','Средние'],['l','Крупные']]},
  {key:'hover',   label:'Ховер (сетка)', type:'seg', opts:[['reveal','Раскрытие'],['scale','Масштаб'],['lift','Подъём'],['glow','Подсветка'],['tilt','3D-наклон']]},
  {key:'reveal',  label:'Что показывать (Веер и др.)', type:'seg', opts:[['radar','Радар качеств'],['rows','Список'],['bars','Бары'],['mini','Мини']]},
  {key:'backdrop',label:'Фон при открытии', type:'seg', opts:[['glass','Стекло'],['blur','Блюр'],['darken','Затемнение'],['vignette','Виньетка'],['none','Нет']]},
  {key:'glass',   label:'Стекло модалки', type:'seg', opts:[['on','Вкл'],['off','Выкл']]},
  {key:'speed',   label:'Скорость', type:'seg', opts:[['slow','Медленно'],['normal','Средне'],['fast','Быстро']]},
  {key:'accent',  label:'Цвет акцента', type:'color', swatches:['#0BC4E3','#64d2ff','#6D3FF5','#2ecc71','#e8820a','#e74c3c']},
  {key:'radius',  label:'Скругление', type:'range', min:0, max:24, step:2, unit:'px'},
  // ── параметры КАРТОЧКИ-ШАПКИ (god-tier: 3D + параллакс + сплэш) ──
  {key:'cardBg',  label:'🃏 Карта: фон', type:'seg', opts:[['parallax','Параллакс'],['fullbody','Фулл-боди'],['banner','Баннер'],['none','Нет']]},
  {key:'cardTilt',label:'🃏 Карта: 3D-наклон', type:'seg', opts:[['on','Вкл'],['off','Выкл']]},
  {key:'cardScrim',label:'🃏 Карта: затемнение', type:'seg', opts:[['off','Нет'],['soft','Слабо'],['med','Средне'],['strong','Сильно']]},
  {key:'autoColor',label:'📄 Фон-ореол: цвет из арта', type:'seg', opts:[['on','Вкл'],['off','Выкл']]},
  {key:'cardGlow',label:'📄 Свечение страницы', type:'seg', opts:[['on','Вкл'],['off','Выкл']]},
  {key:'cgrad1',  label:'📄 Градиент 1', type:'color', swatches:['#0BC4E3','#011520','#6D3FF5','#010A13']},
  {key:'cgrad2',  label:'📄 Градиент 2', type:'color', swatches:['#011520','#010A13','#6D3FF5','#e74c3c']},
  {key:'cangle',  label:'📄 Угол градиента', type:'range', min:0, max:360, step:5, unit:'°'},
  {key:'iconShape',label:'📄 Форма иконки', type:'seg', opts:[['round','Скругл'],['circle','Круг'],['squircle','Squircle']]},
  {key:'pageSize', label:'📄 Размер страницы', type:'seg', opts:[['m','Компакт'],['l','Средне'],['xl','Широко']]},
  {key:'tabPos',   label:'📄 Вкладки: где', type:'seg', opts:[['top','Сверху'],['left','Слева']]},
  {key:'tabStyle', label:'📄 Вкладки: стиль', type:'seg', opts:[['pills','Пилюли'],['underline','Подчёркивание']]}
];
var DEFAULTS={layout:'grid', statStyle:'chips', cmpCard:'glass', cmpCell:'bar', size:'m', hover:'reveal', reveal:'radar', backdrop:'glass', glass:'on', speed:'normal', accent:'#0BC4E3', radius:14,
  cardBg:'parallax', cardTilt:'on', cardScrim:'med', cardGlow:'on', cgrad1:'#0BC4E3', cgrad2:'#011520', cangle:170, autoColor:'on', iconShape:'round',
  pageSize:'l', tabPos:'top', tabStyle:'pills'};
var CSCRIM={off:0, soft:0.32, med:0.55, strong:0.78};
var S=Object.assign({},DEFAULTS);
var CELL={s:'66px', m:'88px', l:'118px'};
var SPEED={slow:'.7s', normal:'.4s', fast:'.22s'};
var fRole='all', fQ='';

// ════════════════════════════════════════════════════════════════
// Полоса раскладок + панель
// ════════════════════════════════════════════════════════════════
function buildLayoutBar(){
  var bar=document.getElementById('variantBar');
  bar.style.display='';
  bar.innerHTML=LAYOUTS.map(function(v){
    return '<button class="variant-chip'+(S.layout===v.id?' active':'')+'" data-v="'+v.id+'"><span class="vc-name">'+v.name+'</span><span class="vc-desc">'+v.desc+'</span></button>';
  }).join('');
  bar.querySelectorAll('.variant-chip').forEach(function(b){ b.onclick=function(){ S.layout=b.dataset.v; buildLayoutBar(); render(); }; });
}
function buildPanel(){
  var p=document.getElementById('panel');
  p.innerHTML=CONTROLS.map(function(c){
    var inner='';
    if(c.type==='seg') inner='<div class="seg">'+c.opts.map(function(o){return '<button data-k="'+c.key+'" data-o="'+o[0]+'" class="'+(S[c.key]===o[0]?'on':'')+'">'+o[1]+'</button>';}).join('')+'</div>';
    else if(c.type==='color') inner='<div class="color-row"><input type="color" data-k="'+c.key+'" value="'+S[c.key]+'"><span class="cval">'+S[c.key]+'</span></div><div class="swatches">'+(c.swatches||[]).map(function(sw){return '<span class="swatch" data-k="'+c.key+'" data-sw="'+sw+'" style="background:'+sw+'"></span>';}).join('')+'</div>';
    else if(c.type==='range') inner='<input type="range" data-k="'+c.key+'" min="'+c.min+'" max="'+c.max+'" step="'+c.step+'" value="'+S[c.key]+'">';
    var badge=c.type==='range'?'<span class="ctrl-val" id="val-'+c.key+'">'+S[c.key]+(c.unit||'')+'</span>':'';
    return '<div class="ctrl"><div class="ctrl-label">'+c.label+badge+'</div>'+inner+'</div>';
  }).join('');
  p.querySelectorAll('.seg button[data-k]').forEach(function(b){ b.onclick=function(){ S[b.dataset.k]=b.dataset.o; buildPanel(); render(); refreshOpenCard(); }; });
  p.querySelectorAll('input[type=color]').forEach(function(inp){ inp.oninput=function(){ S[inp.dataset.k]=inp.value; inp.nextElementSibling.textContent=inp.value; applyVars(); }; });
  p.querySelectorAll('.swatch').forEach(function(sw){ sw.onclick=function(){ S[sw.dataset.k]=sw.dataset.sw; buildPanel(); applyVars(); }; });
  p.querySelectorAll('input[type=range]').forEach(function(inp){ inp.oninput=function(){ S[inp.dataset.k]=+inp.value; var u=(CONTROLS.find(function(c){return c.key===inp.dataset.k;})||{}).unit||''; var b=document.getElementById('val-'+inp.dataset.k); if(b)b.textContent=inp.value+u; applyVars(); }; });
}
function applyVars(){
  var r=document.documentElement.style;
  r.setProperty('--accent', S.accent);
  r.setProperty('--radius', S.radius+'px');
  r.setProperty('--cell', CELL[S.size]||'88px');
  r.setProperty('--sp', SPEED[S.speed]||'.4s');
  // переменные карточки (живое обновление открытой карты)
  r.setProperty('--cgrad1', S.cgrad1);
  r.setProperty('--cgrad2', S.cgrad2);
  r.setProperty('--cangle', S.cangle+'deg');
  r.setProperty('--cscrim', String(CSCRIM[S.cardScrim]!==undefined?CSCRIM[S.cardScrim]:0.55));
}
var _openC=null, _cmpC=null;
var _cmpArr=null;          // массив чемпов в сравнении (общий для всех режимов)
var CMP_MAX=6;             // максимум колонок в режиме «Таблица»
// единая точка входа: рисует сравнение в зависимости от выбранного режима
function renderCompare(){
  if(!_cmpArr || !_cmpArr.length) return;
  if(S.cmpCard==='table') openCompareTable();
  else openCompare(_cmpArr[0], _cmpArr[1]||_cmpArr[0]);
}
function startCompare(c1,c2){ _cmpArr=[c1,c2]; renderCompare(); }
function refreshOpenCard(){ var ov=document.getElementById('hrOverlay'); if(!ov || ov.hidden) return;
  if(_cmpArr) renderCompare(); else if(_openC) openDetail(_openC); }

// ════════════════════════════════════════════════════════════════
// Рендер: переключатель сетка / витрина-варианты
// ════════════════════════════════════════════════════════════════
function render(){ applyVars(); if(S.layout==='grid') renderPicker(); else renderShowcase(); }

// ── ПИКЕР (сетка) ──
function roles(){ var out=[]; POOL.forEach(function(c){ if(out.indexOf(c.role)<0) out.push(c.role); }); return out; }
function filtered(){
  var q=fQ.trim().toLowerCase();
  return POOL.filter(function(c){ return (fRole==='all'||c.role===fRole) && (!q || c.name.toLowerCase().indexOf(q)>=0); });
}
function pickCard(c){
  var gi=POOL.indexOf(c), wrc=c.wr>=50?'#43e08a':'#ff6b6b';
  return '<button class="pick-card" data-i="'+gi+'" type="button">'+
    '<div class="pc-av" style="background-image:url('+icon(c.key)+')">'+
      '<span class="pc-tier" style="--tc:'+(DTIER[c.tier]||'var(--accent)')+'">'+c.tier+'</span>'+
      '<div class="pc-reveal"><span class="pcr-wr">WR <b style="color:'+wrc+'">'+c.wr+'%</b></span><span class="pcr-pr">'+c.pr+'% PR</span></div>'+
    '</div>'+
    '<div class="pc-name">'+c.name+'</div><div class="pc-role">'+c.role+'</div></button>';
}
function gridHTML(list){
  if(!list.length) return '<div class="pick-grid" id="pickGrid"><div class="pick-none">Ничего не найдено</div></div>';
  return '<div class="pick-grid hv-'+S.hover+'" id="pickGrid">'+list.map(pickCard).join('')+'</div>';
}
function renderPicker(){
  var stage=document.getElementById('hrStage');
  var hint=document.getElementById('hrHint'); if(hint) hint.style.display='none';
  var chips='<button class="role-chip'+(fRole==='all'?' on':'')+'" data-role="all" type="button">Все</button>'+
    roles().map(function(r){ return '<button class="role-chip'+(fRole===r?' on':'')+'" data-role="'+r+'" type="button">'+r+'</button>'; }).join('');
  stage.className='hr-stage';
  stage.innerHTML='<div class="picker'+(S.glass==='on'?' glass':'')+'">'+
    '<div class="pick-head"><input id="pickSearch" class="pick-search" type="text" placeholder="🔍 Поиск чемпиона…">'+
      '<div class="role-chips">'+chips+'</div><div class="pick-count" id="pickCount"></div></div>'+
    gridHTML(filtered())+'</div>';
  var s=document.getElementById('pickSearch'); s.value=fQ;
  s.oninput=function(){ fQ=this.value; document.getElementById('pickGrid').outerHTML=gridHTML(filtered()); bindCards(); updateCount(); };
  stage.querySelectorAll('.role-chip').forEach(function(b){ b.onclick=function(){ fRole=b.dataset.role; renderPicker(); }; });
  bindCards(); updateCount();
}
function updateCount(){ var el=document.getElementById('pickCount'); if(el) el.textContent=filtered().length+' / '+POOL.length; }
function bindCards(){
  document.querySelectorAll('.pick-card').forEach(function(el){ el.onclick=function(){ DLVL=10; _openTab='matchups'; openDetail(POOL[+el.dataset.i]); }; });
  var grid=document.getElementById('pickGrid');
  if(grid && S.hover==='tilt'){
    grid.onmousemove=function(e){ var card=e.target.closest('.pick-card'); if(!card) return;
      var r=card.getBoundingClientRect(); var px=(e.clientX-r.left)/r.width-0.5, py=(e.clientY-r.top)/r.height-0.5;
      card.style.transform='perspective(500px) rotateY('+(px*16)+'deg) rotateX('+(-py*16)+'deg) scale(1.05)'; };
    grid.onmouseout=function(e){ var card=e.target.closest('.pick-card'); if(card) card.style.transform=''; };
  }
}

// ── ВИТРИНА (Веер/Колода/…) ──
function renderShowcase(){
  var stage=document.getElementById('hrStage');
  var hint=document.getElementById('hrHint'); if(hint){ hint.style.display=''; hint.textContent=showHint(); }
  stage.className='hr-stage v-'+S.layout;
  stage.innerHTML=POOL.map(function(c,i){ return cardHTML(c,i); }).join('');
  if(S.layout==='deck'){
    var els=stage.querySelectorAll('.hr-card'), m=(els.length-1)/2;
    els.forEach(function(el,i){ el.style.transform='rotate('+((i-m)*5)+'deg) translateY('+Math.abs(i-m)*7+'px)'; el.style.zIndex=String(20-Math.abs(i-m)); });
  }
  stage.querySelectorAll('.hr-card').forEach(function(el){ el.addEventListener('click',function(){ DLVL=10; _openTab='matchups'; openDetail(POOL[+el.dataset.i]); }); });
}
function showHint(){
  return ({fan:'Наведи — раздвинет соседей',zoom:'Наведи — крупнее поверх',flip:'Наведи — перевернётся',curtain:'Наведи — шторка снизу',side:'Наведи — панель сбоку',spotlight:'Наведи — соседи в блюр',deck:'Наведи на любую в стопке'}[S.layout]||'Наведи на чемпа')+' · клик → стеклянная карточка';
}
function cardHTML(c,i){
  var cls='hr-card glow';
  if(S.layout==='flip'){
    return '<div class="'+cls+'" data-i="'+i+'"><div class="hr-flip">'+
      '<div class="hr-face hr-front"><div class="hr-art" style="background-image:url('+loadingArt(c.key)+')"></div><div class="hr-shade"></div>'+
        '<div class="hr-body"><div class="hr-name">'+c.name+'</div><div class="hr-role">'+c.role+'</div></div></div>'+
      '<div class="hr-face hr-back"><div class="hr-name">'+c.name+'</div><div class="hr-role">'+c.role+'</div>'+buildReveal(c)+'</div>'+
    '</div></div>';
  }
  if(S.layout==='side'){
    return '<div class="'+cls+'" data-i="'+i+'"><div class="hr-art-sq" style="background-image:url('+loadingArt(c.key)+')"></div>'+
      '<div class="hr-side-panel"><div class="hr-name">'+c.name+'</div><div class="hr-role">'+c.role+'</div>'+buildReveal(c)+'</div></div>';
  }
  if(S.layout==='curtain'){
    return '<div class="'+cls+'" data-i="'+i+'"><div class="hr-art" style="background-image:url('+loadingArt(c.key)+')"></div><div class="hr-shade"></div>'+
      '<div class="hr-body"><div class="hr-name">'+c.name+'</div><div class="hr-role">'+c.role+'</div>'+buildReveal(c)+'<div class="click-tip">клик → подробнее</div></div></div>';
  }
  if(S.reveal==='radar'){
    return '<div class="'+cls+' card-radar" data-i="'+i+'"><div class="hr-art" style="background-image:url('+loadingArt(c.key)+')"></div>'+
      '<div class="hr-reveal-over">'+radarSVG(c)+'</div><div class="hr-shade"></div>'+
      '<div class="hr-body"><div class="hr-name">'+c.name+'</div><div class="hr-role">'+c.role+'</div><div class="click-tip">клик → подробнее</div></div></div>';
  }
  return '<div class="'+cls+'" data-i="'+i+'"><div class="hr-art" style="background-image:url('+loadingArt(c.key)+')"></div><div class="hr-shade"></div>'+
    '<div class="hr-body"><div class="hr-name">'+c.name+'</div><div class="hr-role">'+c.role+'</div>'+
    '<div class="hr-reveal">'+buildReveal(c)+'<div class="click-tip">клик → подробнее</div></div></div></div>';
}
function buildReveal(c){
  if(S.reveal==='radar') return radarSVG(c);
  if(S.reveal==='bars')
    return '<div class="rv-bars">'+SDEF.map(function(s){var pct=Math.min(100,Math.round(c.s[s.id]/SMAX[s.id]*100));return '<div class="bar"><div class="bt"><span>'+s.lbl+'</span><b style="color:'+s.color+'">'+c.s[s.id]+'</b></div><div class="bk"><i style="width:'+pct+'%;background:'+s.color+'"></i></div></div>';}).join('')+'</div>';
  if(S.reveal==='mini')
    return '<div class="rv-mini"><div><div class="mv" style="color:var(--c-ad)">'+c.s.ad+'</div><div class="ml">⚔ AD</div></div>'+
      '<div><div class="mv" style="color:var(--c-hp)">'+c.s.hp+'</div><div class="ml">✚ HP</div></div>'+
      '<div><div class="mv" style="color:'+(c.wr>=50?'#43e08a':'#ff6b6b')+'">'+c.wr+'%</div><div class="ml">WR</div></div></div>';
  return '<div class="rv-rows">'+SDEF.map(function(s){return '<div class="rs"><span>'+s.lbl+'</span><b style="color:'+s.color+'">'+c.s[s.id]+'</b></div>';}).join('')+'</div>';
}
function radarSVG(c){
  var n=QUAL.length,cx=120,cy=110,R=72;
  function pt(i,f){var a=(-90+i*(360/n))*Math.PI/180;return [cx+Math.cos(a)*R*f,cy+Math.sin(a)*R*f];}
  var grid=[0.33,0.66,1].map(function(g){return '<polygon points="'+QUAL.map(function(_,i){return pt(i,g).join(',');}).join(' ')+'" fill="none" stroke="rgba(11,196,227,.14)" stroke-width="1"/>';}).join('');
  var axes=QUAL.map(function(_,i){var e=pt(i,1);return '<line x1="'+cx+'" y1="'+cy+'" x2="'+e[0]+'" y2="'+e[1]+'" stroke="rgba(11,196,227,.12)" stroke-width="1"/>';}).join('');
  var labels=QUAL.map(function(q,i){var l=pt(i,1.34);return '<text x="'+l[0]+'" y="'+l[1]+'" fill="rgba(230,243,251,.85)" font-size="11" font-weight="700" text-anchor="middle" dominant-baseline="middle">'+q.lbl+' '+c.r[q.id]+'</text>';}).join('');
  var data=QUAL.map(function(q,i){return pt(i,Math.max(.06,c.r[q.id]/10)).join(',');}).join(' ');
  var dots=QUAL.map(function(q,i){var p=pt(i,Math.max(.06,c.r[q.id]/10));return '<circle cx="'+p[0]+'" cy="'+p[1]+'" r="2.6" fill="var(--accent)"/>';}).join('');
  return '<div class="rv-radar"><svg viewBox="0 0 240 220">'+grid+axes+
    '<polygon points="'+data+'" fill="rgba(11,196,227,.22)" stroke="var(--accent)" stroke-width="2"/>'+dots+labels+'</svg></div>';
}

// ════════════════════════════════════════════════════════════════
// Детальная карточка — финальный стеклянный дизайн
// ════════════════════════════════════════════════════════════════
var DLVL=10;
function dStat(base,id){ return id==='rng'?base:Math.round(base*(0.6+(DLVL-1)/14*0.6)); }
function dBadges(c){
  return '<div class="d-stats">'+SDEF.map(function(s){
    return '<div class="d-badge"><span class="bl">'+s.lbl+'</span><span class="bv" data-d="'+s.id+'">'+dStat(c.s[s.id],s.id)+'</span></div>';
  }).join('')+'</div>';
}
function dWrbr(c){
  return '<div class="d-wrbr"><span><b>'+c.wr+'%</b> WR</span><i>·</i><span><b>'+c.pr+'%</b> PR</span><i>·</i><span><b>'+c.br+'%</b> BR</span></div>';
}
// ── ДОП. СТАТЫ (новое): значение с учётом уровня ──
function xVal(c,id){
  var x=c.x; if(!x) return null;
  if(id==='as')    return x.as*(1+(x.asg/100)*(DLVL-1));   // asg — %/уровень
  if(id==='ms')    return x.ms;                            // скорость передвижения роста не имеет
  if(id==='hpreg') return x.hpreg+x.hpregg*(DLVL-1);
  if(id==='mpreg') return (x.res!=='Mana')?null:(x.mpreg+x.mpregg*(DLVL-1)); // у безманных/энергии — прочерк
  return null;
}
// значение любого стата (базового или нового) с учётом уровня
function aVal(c,it){ return it.src==='base' ? dStat(c.s[it.id],it.id) : xVal(c,it.id); }
// класс подсветки в сравнении: у кого значение выше (только ЦВЕТ — ширина не меняется, модалка не дёргается)
function statCmpCls(v, ov){
  if(v===null && ov===null) return '';
  if(v===null) return ' st-lo'; if(ov===null) return ' st-hi';
  if(Math.abs(v-ov)<1e-9) return '';
  return v>ov ? ' st-hi' : ' st-lo';
}
// cmp (необязательно) — функция(d,v)→класс подсветки для режима сравнения
function buildStatsInner(c, cmp){
  return ALLSTATS.map(function(d){
    var v=aVal(c,d), txt=(v===null)?'—':(+v).toFixed(d.dec);
    var hc=cmp?cmp(d,v):'';
    if(S.statStyle==='bars'){
      var pct=(v===null)?0:Math.max(4,Math.min(100,Math.round(v/d.max*100)));
      return '<div class="xs-bar"><div class="xs-bt"><span>'+d.ic+' '+d.lbl+'</span><b class="xs-num'+hc+'" style="color:'+d.color+'">'+txt+'</b></div>'+
        '<div class="xs-bk"><i style="width:'+pct+'%;background:'+d.color+'"></i></div></div>';
    }
    if(S.statStyle==='chips')
      return '<div class="xs-chip"><span class="xs-ic" style="color:'+d.color+'">'+d.ic+'</span><span class="xs-v xs-num'+hc+'">'+txt+'</span><span class="xs-l">'+d.lbl+'</span></div>';
    if(S.statStyle==='tiles')
      return '<div class="xs-tile"><span class="xs-t-ic" style="color:'+d.color+'">'+d.ic+'</span><span class="xs-t-v xs-num'+hc+'">'+txt+'</span><span class="xs-t-l">'+d.lbl+'</span></div>';
    if(S.statStyle==='rings'){
      var C=163.36, pct=(v===null)?0:Math.max(0,Math.min(1,v/d.max)), off=(C*(1-pct)).toFixed(1);
      return '<div class="xs-ring"><svg viewBox="0 0 64 64"><circle class="xs-rg-bg" cx="32" cy="32" r="26"/>'+
        '<circle class="xs-rg-fg" cx="32" cy="32" r="26" stroke="'+d.color+'" stroke-dasharray="'+C+'" stroke-dashoffset="'+off+'"/></svg>'+
        '<span class="xs-r-v xs-num'+hc+'">'+txt+'</span><span class="xs-r-l">'+d.lbl+'</span></div>';
    }
    // badges (по умолчанию)
    return '<div class="d-badge xs-badge"><span class="bl">'+d.ic+' '+d.lbl+'</span><span class="bv xs-num'+hc+'" style="color:'+d.color+'">'+txt+'</span></div>';
  }).join('');
}
function buildStats(c, boxId, cmp){
  return '<div id="'+(boxId||'statBox')+'" class="xstats xs-'+S.statStyle+' glass">'+buildStatsInner(c,cmp)+'</div>';
}
function dActions(){
  return '<div class="d-actions">'+
    '<button class="d-btn d-cmp" type="button">⚖ Сравнить</button>'+
    [['⚔','Сборки'],['📖','Гайд'],['★','В избранное']].map(function(a){
      return '<button class="d-btn" type="button">'+a[0]+' '+a[1]+'</button>';}).join('')+'</div>';
}
function dLevel(){
  var fill=Math.round((DLVL-1)/14*100);
  return '<div class="d-level"><div class="d-level-row"><span>УРОВЕНЬ</span><b id="dLvlNum">'+DLVL+'</b></div>'+
    '<input type="range" id="dLvl" min="1" max="15" value="'+DLVL+'" style="--fill:'+fill+'%"></div>';
}
function dMatch(c){
  function box(title,list){
    var chips=(list&&list.length)?list.map(function(x){return '<span class="d-chip"><img src="'+icon(x.k)+'" alt="">'+x.n+'</span>';}).join('')
      :'<span class="d-empty">пусто — нажми «+»</span>';
    return '<div class="d-mu"><div class="d-mu-h"><span>'+title+'</span><button class="d-mu-add" type="button">+</button></div><div class="d-mu-l">'+chips+'</div></div>';
  }
  return '<div class="d-matchups">'+box('СИЛЁН ПРОТИВ',c.strong)+box('СЛАБ ПРОТИВ',c.weak)+box('КОМБО',c.combo)+'</div>';
}
// ════════════════════════════════════════════════════════════════
// Демо-данные вкладок (детерминированно от имени чемпа). Реальные — позже из источника.
// ════════════════════════════════════════════════════════════════
function _seed(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function _rng(seed){var s=seed||1;return function(){s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
function itemIcon(id){return 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/'+id+'.png';}
function spellIcon(n){return 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/spell/'+n+'.png';}
function runeIcon(p){return 'https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/'+p+'.png';}
var ITEMS=[{n:'Eclipse',ic:itemIcon(6692)},{n:"Serylda's Grudge",ic:itemIcon(6694)},{n:'Black Cleaver',ic:itemIcon(3071)},{n:"Death's Dance",ic:itemIcon(6333)},{n:'Trinity Force',ic:itemIcon(3078)},{n:"Lord Dominik's",ic:itemIcon(3036)},{n:'Spear of Shojin',ic:itemIcon(3161)},{n:'Edge of Night',ic:itemIcon(3814)},{n:'Kraken Slayer',ic:itemIcon(6672)}];
var RUNES=[{n:'Conqueror',ic:runeIcon('Precision/Conqueror/Conqueror.png')},{n:'Grasp of the Undying',ic:runeIcon('Resolve/GraspOfTheUndying/GraspOfTheUndying.png')},{n:'Electrocute',ic:runeIcon('Domination/Electrocute/Electrocute.png')},{n:'Press the Attack',ic:runeIcon('Precision/PressTheAttack/PressTheAttack.png')},{n:'Fleet Footwork',ic:runeIcon('Precision/FleetFootwork/FleetFootwork.png')},{n:'Dark Harvest',ic:runeIcon('Domination/DarkHarvest/DarkHarvest.png')}];
var SPELLS=[{n:'Flash',ic:spellIcon('SummonerFlash')},{n:'Ignite',ic:spellIcon('SummonerDot')},{n:'Teleport',ic:spellIcon('SummonerTeleport')},{n:'Heal',ic:spellIcon('SummonerHeal')},{n:'Exhaust',ic:spellIcon('SummonerExhaust')},{n:'Ghost',ic:spellIcon('SummonerHaste')},{n:'Barrier',ic:spellIcon('SummonerBarrier')},{n:'Smite',ic:spellIcon('SummonerSmite')}];

function _pick(c,tag,pool,n){
  var rnd=_rng(_seed(c.name+tag));
  var arr=pool.map(function(it){return {n:it.n,ic:it.ic,wr:48+rnd()*15,pr:1.5+rnd()*22};});
  arr.sort(function(){return rnd()-0.5;});
  return arr.slice(0,n).sort(function(a,b){return b.wr-a.wr;});
}
function _matchups(c){
  var extra=[{name:'Jax',key:'Jax'},{name:'Fiora',key:'Fiora'},{name:'Urgot',key:'Urgot'},{name:'Mordekaiser',key:'Mordekaiser'},{name:'Riven',key:'Riven'},{name:'Volibear',key:'Volibear'},{name:'Renekton',key:'Renekton'},{name:'Sett',key:'Sett'}];
  var all=POOL.filter(function(x){return x.key!==c.key;}).map(function(x){return {name:x.name,key:x.key};}).concat(extra);
  var rnd=_rng(_seed(c.name+'mu'));
  var list=all.map(function(x){return {name:x.name,key:x.key,wr:42+rnd()*18,pr:1+rnd()*8};});
  list.sort(function(a,b){return b.wr-a.wr;});
  return list;
}
function _history(c){
  var rnd=_rng(_seed(c.name+'h')), out=[], wr=c.wr, pr=c.pr, br=c.br;
  for(var i=0;i<7;i++){ out.push({d:new Date(2026,5,8-i),wr:wr,pr:pr,br:br,dw:(rnd()-0.5)*0.9,dp:(rnd()-0.5)*0.3,db:(rnd()-0.5)*0.6}); wr-=out[i].dw; pr-=out[i].dp; br-=out[i].db; }
  return out;
}
function _invRow(it,rank){
  return '<div class="inv-row"><span class="mu-rank">#'+rank+'</span><img class="inv-ic" src="'+it.ic+'" alt="" loading="lazy">'+
    '<span class="inv-nm">'+it.n+'</span><span class="inv-wr">'+it.wr.toFixed(1)+'%<i>WR</i></span><span class="inv-pr">'+it.pr.toFixed(1)+'%<i>PR</i></span></div>';
}
function tabItems(c){ return '<div class="d-panel"><div class="d-panel-h">⚔ Топ предметы</div>'+_pick(c,'it',ITEMS,6).map(function(it,i){return _invRow(it,i+1);}).join('')+'</div>'; }
function tabRunes(c){ return '<div class="d-panel"><div class="d-panel-h">🔮 Руны</div>'+_pick(c,'rn',RUNES,5).map(function(it,i){return _invRow(it,i+1);}).join('')+'</div>'; }
function tabSpells(c){ return '<div class="d-panel"><div class="d-panel-h">✨ Заклинания</div>'+_pick(c,'sp',SPELLS,5).map(function(it,i){return _invRow(it,i+1);}).join('')+'</div>'; }
function tabMatchups(c){
  var mu=_matchups(c), best=mu.slice(0,5), worst=mu.slice(-5).reverse();
  function row(m,rank,good){ return '<div class="mu-row"><span class="mu-rank">#'+rank+'</span><img src="'+icon(m.key)+'" alt="" loading="lazy"><span class="mu-nm">'+m.name+'</span><span class="mu-wr" style="color:'+(good?'#43e08a':'#ff6b6b')+'">'+m.wr.toFixed(1)+'%</span><span class="mu-pr">'+m.pr.toFixed(1)+'%</span></div>'; }
  return '<div class="d-two"><div class="d-panel"><div class="d-panel-h good">▲ Лучшие матчапы</div>'+best.map(function(m,i){return row(m,i+1,true);}).join('')+'</div>'+
    '<div class="d-panel"><div class="d-panel-h bad">▼ Худшие матчапы</div>'+worst.map(function(m,i){return row(m,mu.length-i,false);}).join('')+'</div></div>';
}
function tabHistory(c){
  var h=_history(c);
  function arr(d){ return d>0.001?'<i class="up">↑ +'+d.toFixed(2)+'</i>':d<-0.001?'<i class="dn">↓ '+d.toFixed(2)+'</i>':'<i class="fl">—</i>'; }
  function cell(v,d){ return '<span class="hc">'+v.toFixed(2)+'%'+arr(d)+'</span>'; }
  var rows=h.map(function(x){ var dd=('0'+x.d.getDate()).slice(-2)+'.'+('0'+(x.d.getMonth()+1)).slice(-2);
    return '<div class="hist-row"><span class="hd">'+dd+'</span>'+cell(x.wr,x.dw)+cell(x.pr,x.dp)+cell(x.br,x.db)+'</div>'; }).join('');
  var ws=h.map(function(x){return x.wr;}).reverse(), mn=Math.min.apply(0,ws), mx=Math.max.apply(0,ws), rg=(mx-mn)||1;
  var pts=ws.map(function(v,i){return (i/(ws.length-1)*260+10).toFixed(1)+','+(75-(v-mn)/rg*60).toFixed(1);}).join(' ');
  return '<div class="d-panel"><div class="hist-head"><span>Дата</span><span>Победы</span><span>Пики</span><span>Баны</span></div>'+rows+'</div>'+
    '<div class="d-panel"><div class="d-panel-h">📈 Винрейт · 7 дней</div><svg class="spark" viewBox="0 0 280 85"><polyline points="'+pts+'" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/></svg></div>';
}
function tabOverview(c){
  return '<div class="d-grid">'+
    '<div class="d-col">'+dLevel()+dBadges(c)+'<div class="d-panel"><div class="d-panel-h">📊 Качества</div>'+radarSVG(c)+'</div></div>'+
    '<div class="d-col">'+dMatch(c)+'</div>'+
  '</div>';
}
var TABS=[['matchups','Матчапы'],['items','Предметы'],['runes','Руны'],['spells','Заклинания'],['history','История']];
var _openTab='matchups';
function tabHTML(c){
  return _openTab==='items'?tabItems(c):_openTab==='runes'?tabRunes(c):
         _openTab==='spells'?tabSpells(c):_openTab==='history'?tabHistory(c):tabMatchups(c);
}
function mountTab(c){
  var el=document.getElementById('dTab'); if(!el) return;
  el.innerHTML=tabHTML(c);
  var sl=el.querySelector('#dLvl');
  if(sl) sl.oninput=function(){ DLVL=+this.value; this.style.setProperty('--fill',Math.round((DLVL-1)/14*100)+'%');
    var n=el.querySelector('#dLvlNum'); if(n)n.textContent=DLVL;
    SDEF.forEach(function(s){var b=el.querySelector('[data-d="'+s.id+'"]'); if(b)b.textContent=dStat(c.s[s.id],s.id);}); };
  el.querySelectorAll('.d-mu-add').forEach(function(b){ b.onclick=function(e){e.stopPropagation(); b.style.transform='scale(1.3) rotate(90deg)'; setTimeout(function(){b.style.transform='';},180);}; });
}

function openDetail(c){
  _openC=c; _cmpC=null; _cmpArr=null;
  var ov=document.getElementById('hrOverlay');
  ov.className='hr-overlay bd-'+S.backdrop+(S.autoColor==='on'?' art-tint':'');
  if(S.autoColor==='on') ov.style.setProperty('--artcolor', ARTCOL[c.key]||S.accent); else ov.style.removeProperty('--artcolor');

  var tier='<span class="d-tier" style="--tc:'+(DTIER[c.tier]||'var(--accent)')+'">'+c.tier+'</span>';
  var tagsHTML='<div class="d-tags">'+c.tags.map(function(t){return '<span>'+t+'</span>';}).join('')+'</div>';
  var port='<img class="d-portrait ic-'+S.iconShape+'" src="'+icon(c.key)+'" alt="">';
  var nameBlock='<div class="d-nameRow"><div class="d-name">'+c.name+'</div>'+tier+'</div><div class="d-role">'+c.role+'</div>'+tagsHTML;
  // ── god-tier КАРТОЧКА-ШАПКА: фулл-сплэш + затемнение + краткая инфа ──
  var bgLayer = (S.cardBg==='fullbody'||S.cardBg==='parallax')
    ? '<div class="cd-bg" style="background-image:url('+splashArt(c.key)+')"></div><div class="cd-scrim"></div>'
    : '';
  var header = (S.cardBg==='banner')
    ? '<div class="d-art" style="background-image:url('+splashArt(c.key)+')"><div class="d-head">'+port+'<div>'+nameBlock+'</div></div></div>'
    : '<div class="d-head compact">'+port+'<div>'+nameBlock+'</div></div>';
  var cardCls='hr-detail champ-card cbg-'+S.cardBg+' ps-'+S.pageSize+(S.cardGlow==='on'?' cglow':'');
  ov.innerHTML='<div class="cp-tiltwrap'+(S.cardTilt==='on'?' tilting':'')+'"><div class="'+cardCls+'" id="champCard">'+bgLayer+
    '<button class="d-close" type="button">✕</button>'+header+
    '<div class="d-body"><div class="d-grid">'+
      '<div class="d-col">'+dActions()+dWrbr(c)+dLevel()+buildStats(c)+'</div>'+
      '<div class="d-col">'+dMatch(c)+'</div>'+
    '</div></div></div></div>';
  ov.hidden=false;
  requestAnimationFrame(function(){ ov.classList.add('show'); });
  ov.querySelector('.d-close').onclick=closeDetail;
  ov.onclick=function(e){ if(e.target===ov) closeDetail(); };

  // уровень + кнопки «+»
  var sl=ov.querySelector('#dLvl');
  if(sl) sl.oninput=function(){ DLVL=+this.value; this.style.setProperty('--fill',Math.round((DLVL-1)/14*100)+'%');
    ov.querySelector('#dLvlNum').textContent=DLVL;
    var sb=ov.querySelector('#statBox'); if(sb) sb.innerHTML=buildStatsInner(c); };
  ov.querySelectorAll('.d-mu-add').forEach(function(b){ b.onclick=function(e){ e.stopPropagation(); b.style.transform='scale(1.3) rotate(90deg)'; setTimeout(function(){b.style.transform='';},180); }; });
  var cmpBtn=ov.querySelector('.d-cmp'); if(cmpBtn) cmpBtn.onclick=function(){ openComparePicker(c); };

  if(S.autoColor==='on') artColor(c.key,function(col){ if(col && !ov.hidden && _openC===c) ov.style.setProperty('--artcolor',col); });

  // 3D-наклон (на ОБЁРТКЕ, чтобы скруглённые углы карты не ломались) + параллакс сплэша
  var wrap=ov.querySelector('.cp-tiltwrap'), card2=ov.querySelector('#champCard'), cbg=card2.querySelector('.cd-bg');
  if(S.cardTilt==='on' || S.cardBg==='parallax'){
    wrap.addEventListener('mousemove',function(e){
      var r=wrap.getBoundingClientRect(); var px=(e.clientX-r.left)/r.width-0.5, py=(e.clientY-r.top)/r.height-0.5;
      if(S.cardTilt==='on') wrap.style.transform='perspective(1600px) rotateY('+(px*6)+'deg) rotateX('+(-py*6)+'deg)';
      if(S.cardBg==='parallax' && cbg) cbg.style.transform='scale(1.12) translate('+(px*-24)+'px,'+(py*-24)+'px)';
    });
    wrap.addEventListener('mouseleave',function(){ wrap.style.transform=''; if(cbg) cbg.style.transform='scale(1.08)'; });
  }
}
function closeDetail(){
  _openC=null; _cmpC=null; _cmpArr=null;
  var ov=document.getElementById('hrOverlay');
  ov.classList.remove('show');
  setTimeout(function(){ ov.hidden=true; ov.innerHTML=''; },260);
}

// ════════════════════════════════════════════════════════════════
// СРАВНЕНИЕ (новое): кнопка «Сравнить» → пикер → две карточки + общий ползунок уровня
// ════════════════════════════════════════════════════════════════
function openComparePicker(c1){
  var ov=document.getElementById('hrOverlay');
  ov.className='hr-overlay bd-'+S.backdrop; ov.style.removeProperty('--artcolor');
  var list=POOL.filter(function(x){ return x.key!==c1.key; });
  ov.innerHTML='<div class="cmp-pick glass">'+
    '<div class="cmp-pick-h"><button class="cmp-back" type="button">← Назад</button>'+
      '<span>С кем сравнить <b>'+c1.name+'</b>?</span><button class="d-close" type="button">✕</button></div>'+
    '<input id="cmpSearch" class="pick-search" type="text" placeholder="🔍 Поиск чемпиона…">'+
    '<div class="cmp-pick-grid">'+list.map(function(x){
      return '<button class="cmp-pick-c" data-k="'+x.key+'" type="button"><img src="'+icon(x.key)+'" alt="" loading="lazy"><span>'+x.name+'</span></button>';
    }).join('')+'</div></div>';
  ov.hidden=false; requestAnimationFrame(function(){ ov.classList.add('show'); });
  ov.querySelector('.d-close').onclick=closeDetail;
  ov.querySelector('.cmp-back').onclick=function(){ openDetail(c1); };
  var srch=ov.querySelector('#cmpSearch');
  srch.oninput=function(){ var q=this.value.trim().toLowerCase();
    ov.querySelectorAll('.cmp-pick-c').forEach(function(b){
      var nm=b.querySelector('span').textContent.toLowerCase();
      b.style.display=(!q||nm.indexOf(q)>=0)?'':'none'; }); };
  ov.querySelectorAll('.cmp-pick-c').forEach(function(b){ b.onclick=function(){
    var c2=POOL.find(function(x){ return x.key===b.dataset.k; }); if(c2) startCompare(c1,c2); }; });
}
function compareCardHTML(c, boxId, cmp){
  if(S.cmpCard==='splash'){
    // 1-в-1 как ГЛАВНАЯ карточка: те же классы champ-card (сплэш-фон + скрим + свечение),
    // обёртка cp-tiltwrap даёт 3D-наклон, .cmp-mini сужает под две рядом.
    var tier='<span class="d-tier" style="--tc:'+(DTIER[c.tier]||'var(--accent)')+'">'+c.tier+'</span>';
    var tags='<div class="d-tags">'+c.tags.map(function(t){return '<span>'+t+'</span>';}).join('')+'</div>';
    var port='<img class="d-portrait ic-'+S.iconShape+'" src="'+icon(c.key)+'" alt="">';
    var nameBlock='<div class="d-nameRow"><div class="d-name">'+c.name+'</div>'+tier+'</div><div class="d-role">'+c.role+'</div>'+tags;
    return '<div class="cp-tiltwrap cmp-tw"><div class="hr-detail champ-card cmp-mini cbg-parallax cglow">'+
      '<div class="cd-bg" style="background-image:url('+splashArt(c.key)+')"></div><div class="cd-scrim"></div>'+
      '<div class="d-head compact">'+port+'<div>'+nameBlock+'</div></div>'+
      '<div class="d-body"><div class="cmp-wr"><b>'+c.wr+'%</b> WR · <b>'+c.pr+'%</b> PR · <b>'+c.br+'%</b> BR</div>'+
        buildStats(c, boxId, cmp)+'</div></div></div>';
  }
  // лёгкий стеклянный режим
  var head='<div class="cmp-head"><img class="cmp-port ic-'+S.iconShape+'" src="'+icon(c.key)+'" alt="">'+
      '<div class="cmp-id"><div class="cmp-name">'+c.name+'</div><div class="d-role">'+c.role+'</div></div>'+
      '<span class="cmp-tier" style="--tc:'+(DTIER[c.tier]||'var(--accent)')+'">'+c.tier+'</span></div>';
  var wr='<div class="cmp-wr"><b>'+c.wr+'%</b> WR · <b>'+c.pr+'%</b> PR · <b>'+c.br+'%</b> BR</div>';
  return '<div class="cmp-card glass">'+head+wr+buildStats(c, boxId, cmp)+'</div>';
}
function openCompare(c1, c2){
  _openC=c1; _cmpC=c2; _cmpArr=[c1,c2];
  var ov=document.getElementById('hrOverlay');
  ov.className='hr-overlay bd-'+S.backdrop; ov.style.removeProperty('--artcolor');
  var cmpL=function(d,v){ return statCmpCls(v, aVal(c2,d)); };  // подсветка: левый против правого
  var cmpR=function(d,v){ return statCmpCls(v, aVal(c1,d)); };
  ov.innerHTML='<div class="cmp-wrap glass">'+
    '<button class="d-close" type="button">✕</button>'+
    '<div class="cmp-top"><div class="cmp-title">⚖ Сравнение</div>'+
      '<div class="cmp-lvl"><span>УРОВЕНЬ</span><b id="cmpLvlNum">'+DLVL+'</b>'+
        '<input type="range" id="cmpLvl" min="1" max="15" value="'+DLVL+'" style="--fill:'+Math.round((DLVL-1)/14*100)+'%"></div>'+
      '<button class="cmp-swap" type="button" title="Поменять местами">⇄</button></div>'+
    '<div class="cmp-cards">'+compareCardHTML(c1,'statBoxL',cmpL)+compareCardHTML(c2,'statBoxR',cmpR)+'</div>'+
  '</div>';
  ov.hidden=false; requestAnimationFrame(function(){ ov.classList.add('show'); });
  ov.querySelector('.d-close').onclick=closeDetail;
  ov.onclick=function(e){ if(e.target===ov) closeDetail(); };
  var sl=ov.querySelector('#cmpLvl');
  sl.oninput=function(){ DLVL=+this.value; this.style.setProperty('--fill',Math.round((DLVL-1)/14*100)+'%');
    ov.querySelector('#cmpLvlNum').textContent=DLVL;
    var l=ov.querySelector('#statBoxL'); if(l) l.innerHTML=buildStatsInner(c1,cmpL);
    var r=ov.querySelector('#statBoxR'); if(r) r.innerHTML=buildStatsInner(c2,cmpR); };
  var sw=ov.querySelector('.cmp-swap'); if(sw) sw.onclick=function(){ openCompare(c2,c1); };
  // 3D-наклон + параллакс сплэш-карточек (как у главной): наклоняем обёртку, фон едет
  ov.querySelectorAll('.cmp-tw').forEach(function(tw){
    var bg=tw.querySelector('.cd-bg');
    tw.addEventListener('mousemove',function(e){ var r=tw.getBoundingClientRect(); var px=(e.clientX-r.left)/r.width-0.5, py=(e.clientY-r.top)/r.height-0.5;
      tw.style.transform='perspective(1400px) rotateY('+(px*6)+'deg) rotateX('+(-py*6)+'deg)';
      if(bg) bg.style.transform='scale(1.16) translate('+(px*-20)+'px,'+(py*-20)+'px)'; });
    tw.addEventListener('mouseleave',function(){ tw.style.transform=''; if(bg) bg.style.transform='scale(1.1)'; });
  });
}
// ════════════════════════════════════════════════════════════════
// СРАВНЕНИЕ · режим «Таблица»: статы строчками, чемпионы столбцами, кнопка «+»
// ════════════════════════════════════════════════════════════════
function ctCell(c, d, list){
  var v=aVal(c,d);
  var nums=list.map(function(x){ return aVal(x,d); }).filter(function(x){ return x!==null; });
  var mx=nums.length?Math.max.apply(null,nums):null, mn=nums.length?Math.min.apply(null,nums):null;
  var spread=(mx!==null && mx!==mn);
  var cls=''; if(v!==null && spread){ cls = v===mx ? ' st-hi' : (v===mn ? ' st-lo' : ''); }
  var txt=(v===null)?'—':(+v).toFixed(d.dec);
  var inner='<b class="ct-v xs-num'+cls+'">'+txt;
  if(S.cmpCell==='arrow' && v!==null && spread) inner += (v===mx)?'<i class="ct-ar up">▲</i>':'<i class="ct-ar dn">▼</i>';
  inner+='</b>';
  if(S.cmpCell==='bar'){
    var pct=(v===null)?0:Math.max(4,Math.min(100,Math.round(v/d.max*100)));
    inner+='<div class="ct-bar"><i style="width:'+pct+'%;background:'+d.color+'"></i></div>';
  }
  return '<div class="ct-cell">'+inner+'</div>';
}
function cmpTableInner(list){
  var labels='<div class="ct-labels"><div class="ct-corner">СТАТЫ</div>'+
    ALLSTATS.map(function(d){ return '<div class="ct-lbl"><span style="color:'+d.color+'">'+d.ic+'</span> '+d.lbl+'</div>'; }).join('')+'</div>';
  var cols=list.map(function(c,i){
    return '<div class="ct-col">'+
      '<div class="ct-colh">'+
        (list.length>2?'<button class="ct-rm" data-i="'+i+'" type="button" title="Убрать">✕</button>':'')+
        '<img class="ct-port ic-'+S.iconShape+'" src="'+icon(c.key)+'" alt="">'+
        '<div class="ct-nm">'+c.name+'</div>'+
        '<span class="ct-tier" style="--tc:'+(DTIER[c.tier]||'var(--accent)')+'">'+c.tier+'</span>'+
        '<div class="ct-wr"><b>'+c.wr+'%</b> WR</div>'+
      '</div>'+
      ALLSTATS.map(function(d){ return ctCell(c,d,list); }).join('')+
    '</div>';
  }).join('');
  var add = list.length<CMP_MAX ? '<button class="ct-add" type="button"><span>＋</span><i>чемпион</i></button>' : '';
  return labels+cols+add;
}
function bindTableBody(ov, list){
  ov.querySelectorAll('.ct-rm').forEach(function(b){ b.onclick=function(){
    _cmpArr.splice(+b.dataset.i,1); openCompareTable(); }; });
  var add=ov.querySelector('.ct-add'); if(add) add.onclick=openComparePickerAdd;
}
function openCompareTable(){
  var list=_cmpArr.slice(0,CMP_MAX);
  var ov=document.getElementById('hrOverlay');
  ov.className='hr-overlay bd-'+S.backdrop; ov.style.removeProperty('--artcolor');
  ov.innerHTML='<div class="cmp-wrap is-table glass cmpc-'+S.cmpCell+'">'+
    '<button class="d-close" type="button">✕</button>'+
    '<div class="cmp-top"><div class="cmp-title">⚖ Сравнение · '+list.length+'</div>'+
      '<div class="cmp-lvl"><span>УРОВЕНЬ</span><b id="cmpLvlNum">'+DLVL+'</b>'+
        '<input type="range" id="cmpLvl" min="1" max="15" value="'+DLVL+'" style="--fill:'+Math.round((DLVL-1)/14*100)+'%"></div></div>'+
    '<div class="cmp-table">'+cmpTableInner(list)+'</div>'+
  '</div>';
  ov.hidden=false; requestAnimationFrame(function(){ ov.classList.add('show'); });
  ov.querySelector('.d-close').onclick=closeDetail;
  ov.onclick=function(e){ if(e.target===ov) closeDetail(); };
  bindTableBody(ov, list);
  var sl=ov.querySelector('#cmpLvl');
  sl.oninput=function(){ DLVL=+this.value; this.style.setProperty('--fill',Math.round((DLVL-1)/14*100)+'%');
    ov.querySelector('#cmpLvlNum').textContent=DLVL;
    var tb=ov.querySelector('.cmp-table'); if(tb){ tb.innerHTML=cmpTableInner(list); bindTableBody(ov,list); } };
}
function openComparePickerAdd(){
  var ov=document.getElementById('hrOverlay');
  ov.className='hr-overlay bd-'+S.backdrop; ov.style.removeProperty('--artcolor');
  var have=_cmpArr.map(function(c){ return c.key; });
  var list=POOL.filter(function(x){ return have.indexOf(x.key)<0; });
  ov.innerHTML='<div class="cmp-pick glass">'+
    '<div class="cmp-pick-h"><button class="cmp-back" type="button">← Назад</button>'+
      '<span>Добавить чемпиона в сравнение</span><button class="d-close" type="button">✕</button></div>'+
    '<input id="cmpSearchA" class="pick-search" type="text" placeholder="🔍 Поиск чемпиона…">'+
    '<div class="cmp-pick-grid">'+list.map(function(x){
      return '<button class="cmp-pick-c" data-k="'+x.key+'" type="button"><img src="'+icon(x.key)+'" alt="" loading="lazy"><span>'+x.name+'</span></button>';
    }).join('')+'</div></div>';
  ov.hidden=false; requestAnimationFrame(function(){ ov.classList.add('show'); });
  ov.querySelector('.d-close').onclick=closeDetail;
  ov.querySelector('.cmp-back').onclick=openCompareTable;
  var srch=ov.querySelector('#cmpSearchA');
  srch.oninput=function(){ var q=this.value.trim().toLowerCase();
    ov.querySelectorAll('.cmp-pick-c').forEach(function(b){
      var nm=b.querySelector('span').textContent.toLowerCase();
      b.style.display=(!q||nm.indexOf(q)>=0)?'':'none'; }); };
  ov.querySelectorAll('.cmp-pick-c').forEach(function(b){ b.onclick=function(){
    var c=POOL.find(function(x){ return x.key===b.dataset.k; });
    if(c && _cmpArr.length<CMP_MAX) _cmpArr.push(c); openCompareTable(); }; });
}
document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeDetail(); });

// ── старт ──
var LS=null;
document.getElementById('resetBtn').onclick=function(){ S=Object.assign({},DEFAULTS); fRole='all'; fQ=''; buildLayoutBar(); buildPanel(); render(); if(LS) LS.clearSaved(); };
buildLayoutBar();
buildPanel();
render();
// настройки лаба: память (анти-сброс) + код настроек (копировать/вставить) + пресеты
if(window.LabSettings){
  LS=LabSettings.attach({ id:'hover-reveal', defaults:DEFAULTS, mount:'#labTools',
    getState:function(){ return S; },
    apply:function(st){ S=Object.assign({},DEFAULTS,st); buildLayoutBar(); buildPanel(); render(); refreshOpenCard(); } });
}

})();
