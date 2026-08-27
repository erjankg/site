/* ============================================================
   lab-profile — «Мой профиль» · ФИНАЛЬНЫЙ КАНОН (DESIGN.md 2026-07-13).
   ДАННЫЕ: только реальные. Об ИГРОКЕ показываем лишь то, что он указал сам
   (ник/аватар/роль/ранг/био/соцсети) и то, что он сделал У НАС (регистрация,
   чат, драфты). Статистика чемпиона — из wr-stats.json, подписана как данные
   ЧЕМПИОНА. Личного винрейта/игр/мастерства нет: match API у Wild Rift нет.
   GOTCHA: фейд на самом .glass; transform/will-change на стекле НЕТ.
   ДЁРГАНЬЕ: анимации появления только у попапов; ввод текста обновляет ТОЧЕЧНО.
   ============================================================ */
(function () {
'use strict';

var root = document.documentElement;
var app = document.getElementById('app');

/* ─── Ростер (имена в формате DDragon) ─── */
var CHAMPS = ['Ahri','Akali','Akshan','Alistar','Amumu','Annie','Ashe','AurelionSol','Blitzcrank','Brand','Braum','Caitlyn','Camille','Corki','Darius','Diana','DrMundo','Draven','Ekko','Evelynn','Ezreal','Fiora','Fizz','Galio','Garen','Gragas','Graves','Gwen','Hecarim','Heimerdinger','Irelia','Janna','JarvanIV','Jax','Jhin','Jinx','Kaisa','Karma','Katarina','Kayle','Kennen','Khazix','LeeSin','Leona','Lucian','Lulu','Lux','Malphite','MasterYi','MissFortune','Nami','Nasus','Nautilus','Nilah','Nunu','Olaf','Orianna','Pantheon','Pyke','Rammus','Renekton','Rengar','Riven','Senna','Seraphine','Sett','Shen','Singed','Sion','Sona','Soraka','Teemo','Thresh','Tristana','Tryndamere','TwistedFate','Varus','Vayne','Veigar','Vi','Viego','MonkeyKing','Xayah','XinZhao','Yasuo','Yone','Zed','Ziggs','Zoe'];
var DISP = {AurelionSol:'Aurelion Sol',DrMundo:'Dr. Mundo',JarvanIV:'Jarvan IV',Kaisa:"Kai'Sa",Khazix:"Kha'Zix",LeeSin:'Lee Sin',MasterYi:'Master Yi',MissFortune:'Miss Fortune',MonkeyKing:'Wukong',TwistedFate:'Twisted Fate',XinZhao:'Xin Zhao'};
function dispName(id){ return DISP[id] || id; }
function splashUrl(id){ return 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/'+id+'_0.jpg'; }
function loadingUrl(id){ return 'https://ddragon.leagueoflegends.com/cdn/img/champion/loading/'+id+'_0.jpg'; }
function squareUrl(id){ return 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/'+id+'.png'; }

var ROLES = [
  {id:'Top', img:'../image/role_top.webp'},
  {id:'Jungle', img:'../image/role_jungle.webp'},
  {id:'Mid', img:'../image/role_mid.webp'},
  {id:'ADC', img:'../image/role_adc.webp'},
  {id:'Support', img:'../image/role_support.webp'}
];
function roleImg(id){ var r=ROLES.find(function(x){return x.id===id;}); return r?r.img:''; }
var RANKS = [
  {id:'diamond', name:'Diamond', color:'#B9F2FF', img:'../web.p/Diamond.webp'},
  {id:'master', name:'Master', color:'#9B59B6', img:'../web.p/Master.webp'},
  {id:'grandmaster', name:'GM', color:'#E74C3C', img:'../web.p/Grandmaster.webp'},
  {id:'challenger', name:'Chall', color:'#F39C12', img:'../web.p/Challenger.webp'},
  {id:'sovereign', name:'Sovereign', color:'#D4AF37', img:'../web.p/Sovereign.webp'}
];
function rankObj(id){ return RANKS.find(function(r){return r.id===id;}); }

var SOCIALS = [
  {id:'youtube', name:'YouTube', re:/(youtube\.com|youtu\.be)/i, svg:'<svg viewBox="0 0 24 24"><path fill="#FF0000" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z"/></svg>'},
  {id:'twitch', name:'Twitch', re:/twitch\.tv/i, svg:'<svg viewBox="0 0 24 24"><path fill="#9146FF" d="M11.6 5.5H13v4.5h-1.4V5.5zm3.8 0H17v4.5h-1.6V5.5zM2.6 0L0 2.6v18.8h6.3V24l3.8-2.6H14l8.8-8.8V0H2.6zm18.7 12.1l-3.8 3.8H13l-3.4 2.5v-2.5H3.8V1.3h17.5v10.8z"/></svg>'},
  {id:'telegram', name:'Telegram', re:/(t\.me|telegram)/i, svg:'<svg viewBox="0 0 24 24"><path fill="#2AABEE" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.9 8.2-2 9.4c-.1.6-.5.8-1 .5l-2.8-2-1.3 1.3c-.2.2-.4.3-.7.3l.2-2.9 5-4.5c.2-.2 0-.3-.3-.1L6.5 14.6l-2.7-.9c-.6-.2-.6-.6.1-.9l10.5-4c.6-.1 1.1.2.9.8z"/></svg>'},
  {id:'discord', name:'Discord', re:/(discord\.gg|discord\.com)/i, svg:'<svg viewBox="0 0 24 24"><path fill="#5865F2" d="M20.3 4.4A19.6 19.6 0 0 0 15.4 3c-.2.4-.5.9-.7 1.3a18.2 18.2 0 0 0-5.4 0C9.1 3.9 8.8 3.4 8.6 3A19.5 19.5 0 0 0 3.7 4.4C.5 9.2-.3 13.9.1 18.5a19.8 19.8 0 0 0 6 3 14.7 14.7 0 0 0 1.3-2 12.8 12.8 0 0 1-2-.9l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4a12.8 12.8 0 0 1-2 1 14.7 14.7 0 0 0 1.3 2 19.7 19.7 0 0 0 6-3c.5-5.2-.8-9.8-3.7-14.1zM8.1 15.7c-1.2 0-2.1-1-2.1-2.3s.9-2.3 2.1-2.3c1.2 0 2.1 1 2.1 2.3s-.9 2.3-2.1 2.3zm7.8 0c-1.2 0-2.1-1-2.1-2.3s.9-2.3 2.1-2.3c1.2 0 2.1 1 2.1 2.3s-.9 2.3-2.1 2.3z"/></svg>'},
  {id:'tiktok', name:'TikTok', re:/tiktok\.com/i, svg:'<svg viewBox="0 0 24 24"><path fill="#fff" d="M16.5 3c.3 2 1.5 3.6 3.5 3.9V9c-1.3 0-2.5-.4-3.5-1v6.2c0 3.2-2.4 5.8-5.5 5.8S5.5 17.4 5.5 14.2 8 8.5 11 8.5c.3 0 .6 0 .9.1v2.4c-.3-.1-.6-.2-.9-.2-1.7 0-3 1.4-3 3.4s1.3 3.4 3 3.4 3-1.4 3-3.4V3h2.5z"/></svg>'},
  {id:'instagram', name:'Instagram', re:/instagram\.com/i, svg:'<svg viewBox="0 0 24 24"><path fill="#E1306C" d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.3-2.2-.4a3.8 3.8 0 0 1-1.4-.9 3.8 3.8 0 0 1-.9-1.4c-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 3.2A6.6 6.6 0 1 0 12 18.6 6.6 6.6 0 0 0 12 5.4zm0 10.9A4.3 4.3 0 1 1 12 7.7a4.3 4.3 0 0 1 0 8.6zm6.8-11.2a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/></svg>'},
  {id:'twitter', name:'X (Twitter)', re:/(twitter\.com|x\.com)/i, svg:'<svg viewBox="0 0 24 24"><path fill="#fff" d="M18.2 2h3.3l-7.2 8.2L23 22h-6.6l-5.2-6.8L5.3 22H2l7.7-8.8L1.5 2h6.8l4.7 6.2L18.2 2zm-1.2 18h1.8L7.1 3.9H5.2L17 20z"/></svg>'},
  {id:'kick', name:'Kick', re:/kick\.com/i, svg:'<svg viewBox="0 0 24 24"><path fill="#53FC18" d="M3 2h5v6h2V6h2V4h2V2h6v6h-2v2h-2v2h-2v2h2v2h2v2h2v6h-6v-2h-2v-2h-2v-2H8v6H3z"/></svg>'}
];
function socObj(id){ return SOCIALS.find(function(s){return s.id===id;}); }
function detectSocial(url){ for(var i=0;i<SOCIALS.length;i++){ if(SOCIALS[i].re.test(url)) return SOCIALS[i].id; } return null; }

/* ─── Данные ЧЕМПИОНА (реальные, data-pipeline/wr-stats.json) ───
   Это статистика чемпиона в патче, НЕ статистика игрока. Подписывается явно.
   Под file:// fetch запрещён браузером → значения остаются пустыми («—»),
   выдумывать их нельзя. На http (Live Server / боевой) подтягиваются реально. */
var TIER_COLOR = {'S+':'#ff5470','S':'#ff5470','A':'#ffb454','B':'#4ade80','C':'#7aa2c4','D':'#7aa2c4'};
function wrColor(wr){ return wr>=53 ? '#4ade80' : wr>=50 ? 'var(--accent)' : '#ff8296'; }
var CHAMP_STATS = {};
var CHAMP_PATCH = '';
function normId(id){ return (id==='MonkeyKing'?'wukong':id).replace(/[^a-z0-9]/gi,'').toLowerCase(); }
function champStat(id){ return CHAMP_STATS[normId(id)] || null; }
(function loadChampStats(){
  try {
    fetch('../data-pipeline/wr-stats.json').then(function(r){ return r.ok ? r.json() : null; }).then(function(j){
      if (!j || !j.champions) return;
      CHAMP_PATCH = j.snapshotDate || '';
      j.champions.forEach(function(c){
        if (c.rank !== 'all' || !c.nameEN) return;
        var k = normId(c.nameEN);
        if (!CHAMP_STATS[k] || c.wr > CHAMP_STATS[k].wr) CHAMP_STATS[k] = { wr:c.wr, tier:c.tier, role:c.role };
      });
      renderPreview();
    }).catch(function(){});
  } catch (e) {}
})();

/* ─── Активность НА САЙТЕ (честные источники) ───
   На боевом значения приходят из Firestore/Auth:
     regDate  = firebase.auth().currentUser.metadata.creationTime
     chatMsgs = globalChat where uid == me            (app.js:5157)
     drafts   = draftLobbies where createdBy/captain == me (draft.js:239-242)
   В лабе Firebase нет → значения пустые. Числа НЕ выдумываем: тумблер
   «Примерные числа» (ВЫКЛ по умолчанию) нужен только чтобы оценить ВИД блока. */
var LIVE = { regDate:null, chatMsgs:null, drafts:null };
var SAMPLE = { regDate:'12.07.2026', chatMsgs:'312', drafts:'14' };
function liveVal(key){
  if (LIVE[key] !== null && LIVE[key] !== undefined) return String(LIVE[key]);
  return S.fSample ? SAMPLE[key] : '—';
}

/* ─── Состояние ─── */
var DEFAULTS = {
  /* раскладка/вид */
  layout:'two', cardView:'expanded', avatarStyle:'rank', badges:'round', rankStyle:'halo',
  champView:'list',       // grid | list | tiles
  socView:'icons',        // icons | labeled | compact
  actView:'tiles',        // tiles | list
  /* кнопки */
  btnShape:'pill', btnContent:'icontext', btnStyle:'fill', btnSize:'m',
  /* анимации (появления у постоянной карточки НЕТ — закон «не тащить дёрганье») */
  hover:'bright', avChange:'fade',
  /* размеры */
  cardW:380, avSize:88, radius:15, dens:1,
  splashSrc:'avatar',
  /* блоки */
  fChampStats:true,       // показывать тир/WR ЧЕМПИОНА рядом с избранным
  fActivity:true,         // блок «На сайте»
  fShare:true, fValidate:true, showBio:true, showRegion:false,
  fSample:false,          // примерные числа — только для оценки вида
  emptyDemo:false,
  /* данные игрока — вводит он сам */
  nick:'ERjanKG', avatarChamp:'Lux', mainRole:'Mid', secondRole:'Support', rank:'master',
  region:'Europe', bio:'Главный по мете Wild Rift',
  favs:['Ahri','Seraphine','Zoe','Jinx','LeeSin'],
  socials:[{platform:'youtube',url:'https://youtube.com/@erjankg'},{platform:'twitch',url:'https://twitch.tv/erjankg'}]
};
var S = JSON.parse(JSON.stringify(DEFAULTS));

function favsView(){ return S.emptyDemo ? [] : S.favs; }
function socialsView(){ return S.emptyDemo ? [] : S.socials; }

/* ═══════════════ ДЕВ-ПОЛОСА ═══════════════ */
var CATS = [
  { h:'Раскладка / вид', segs:[
    {k:'layout', label:'Раскладка', opts:[['two','Форма+карточка'],['swap','Карточка слева'],['top','Карточка сверху'],['card','Только карточка']]},
    {k:'cardView', label:'Вид карточки', opts:[['expanded','Полная'],['compact','Компакт'],['banner','Баннер'],['row','Строка']]},
    {k:'avatarStyle', label:'Аватар', opts:[['circle','Круг'],['square','Квадрат'],['rank','Рамка ранга']]},
    {k:'badges', label:'Бейджи', opts:[['round','Жетоны'],['pill','Пилюли'],['strip','Строка']]},
    {k:'rankStyle', label:'Ранг', opts:[['halo','Ореол'],['border','Обводка']]}
  ], ranges:[
    {k:'cardW', label:'Ширина', min:320, max:460, step:10, unit:'px', css:'--card-w'},
    {k:'avSize', label:'Аватар', min:60, max:130, step:2, unit:'px', css:'--av-size'},
    {k:'radius', label:'Радиус', min:8, max:26, step:1, unit:'px', css:'--ds-r'},
    {k:'dens', label:'Плотность', min:70, max:130, step:5, unit:'%', css:'--dens', scale:100}
  ]},
  { h:'Блоки карточки — вид', segs:[
    {k:'champView', label:'Избранные чемпы', opts:[['grid','Сетка иконок'],['list','Список'],['tiles','Плитки']]},
    {k:'actView', label:'На сайте', opts:[['tiles','Плитки'],['list','Строки']]},
    {k:'socView', label:'Соцсети', opts:[['icons','Иконки'],['labeled','С подписью'],['compact','Компакт-строка']]}
  ]},
  { h:'Кнопки', segs:[
    {k:'btnShape', label:'Форма', opts:[['pill','Пилюля'],['rect','Прямоуг'],['square','Квадрат']]},
    {k:'btnContent', label:'Контент', opts:[['icontext','Иконка+текст'],['icon','Иконка'],['text','Текст']]},
    {k:'btnStyle', label:'Стиль', opts:[['fill','Заливка'],['outline','Контур'],['ghost','Призрак']]},
    {k:'btnSize', label:'Размер', opts:[['s','S'],['m','M'],['l','L']]}
  ]},
  { h:'Анимации', segs:[
    {k:'hover', label:'Ховер карточки', opts:[['none','Нет'],['bright','Ярче'],['shadow','Тень']]},
    {k:'avChange', label:'Смена аватара', opts:[['none','Нет'],['fade','Фейд'],['flip','Флип']]}
  ]},
  { h:'Арт за стеклом (проверка читабельности)', segs:[
    {k:'splashSrc', label:'Арт', opts:[['avatar','= аватар'],['lux','Lux (светлый)'],['thresh','Thresh (тёмный)']]}
  ]},
  { h:'Блоки и фичи (вкл/выкл)', toggles:[
    ['fChampStats','Тир/WR чемпиона'],['fActivity','Блок «На сайте»'],['fShare','Поделиться'],
    ['fValidate','Валидация соцссылок'],['showBio','Био'],['showRegion','Регион'],
    ['fSample','Примерные числа (для вида)'],['emptyDemo','Пустое состояние']
  ]}
];

function rangeRaw(r){ return r.scale ? Math.round(S[r.k]*r.scale) : S[r.k]; }
function rangeText(r){ return rangeRaw(r) + r.unit; }

function buildStrip(){
  var h = '';
  CATS.forEach(function(cat){
    h += '<div class="strip-cat"><div class="strip-cat-h">'+cat.h+'</div>';
    (cat.segs||[]).forEach(function(g){
      h += '<div class="strip-group"><label>'+g.label+'</label><div class="seg" data-seg="'+g.k+'">' +
        g.opts.map(function(o){ return '<button data-v="'+o[0]+'"'+(S[g.k]===o[0]?' class="active"':'')+'>'+o[1]+'</button>'; }).join('') +
        '</div></div>';
    });
    (cat.ranges||[]).forEach(function(r){
      h += '<div class="strip-group"><label>'+r.label+' <b data-val="'+r.k+'">'+rangeText(r)+'</b></label>' +
        '<input type="range" class="strip-range" data-range="'+r.k+'" min="'+r.min+'" max="'+r.max+'" step="'+r.step+'" value="'+rangeRaw(r)+'"></div>';
    });
    if (cat.toggles){
      h += '<div class="seg tgl" data-toggles>' +
        cat.toggles.map(function(t){ return '<button data-t="'+t[0]+'"'+(S[t[0]]?' class="active"':'')+'>'+t[1]+'</button>'; }).join('') +
        '</div>';
    }
    h += '</div>';
  });
  h += '<div class="strip-foot">' +
    '<button class="strip-reset" id="stripReset">↺ Сброс</button>' +
    '<div class="strip-choice">Ваш выбор: <span id="choiceText">…</span></div>' +
    '<button class="strip-copy" id="stripCopy">📋 Скопировать мой выбор</button></div>';
  document.getElementById('stripBody').innerHTML = h;
  wireStrip();
}

function wireStrip(){
  var body = document.getElementById('stripBody');
  body.querySelectorAll('[data-seg]').forEach(function(seg){
    seg.addEventListener('click', function(e){
      var b = e.target.closest('button[data-v]'); if(!b) return;
      S[seg.getAttribute('data-seg')] = b.getAttribute('data-v');
      seg.querySelectorAll('button').forEach(function(x){ x.classList.toggle('active', x===b); });
      applyTokens(); renderPreview(); updateChoice();
    });
  });
  var tog = body.querySelector('[data-toggles]');
  if (tog) tog.addEventListener('click', function(e){
    var b = e.target.closest('button[data-t]'); if(!b) return;
    var k = b.getAttribute('data-t');
    S[k] = !S[k];
    b.classList.toggle('active', S[k]);
    renderEditor(); renderPreview(); updateChoice();
  });
  body.querySelectorAll('[data-range]').forEach(function(inp){
    inp.addEventListener('input', function(){
      var k = inp.getAttribute('data-range');
      var r; CATS.forEach(function(c){ (c.ranges||[]).forEach(function(x){ if(x.k===k) r=x; }); });
      var raw = parseFloat(inp.value);
      S[k] = r.scale ? raw / r.scale : raw;
      body.querySelector('[data-val="'+k+'"]').textContent = rangeText(r);
      applyTokens(); updateChoice();          /* только токены — карточку НЕ перерисовываем */
    });
  });
  document.getElementById('stripReset').addEventListener('click', function(){
    S = JSON.parse(JSON.stringify(DEFAULTS)); renderAll();
  });
  var COPY = '📋 Скопировать мой выбор';
  var cb = document.getElementById('stripCopy');
  cb.addEventListener('click', function(){
    copyText(updateChoice(), function(){ cb.textContent='Скопировано ✓'; setTimeout(function(){ cb.textContent=COPY; }, 1200); });
  });
}

function segName(k){
  var found='?';
  CATS.forEach(function(c){ (c.segs||[]).forEach(function(g){ if(g.k===k){ g.opts.forEach(function(o){ if(o[0]===S[k]) found=o[1]; }); } }); });
  return found;
}
function updateChoice(){
  var on = [];
  [['fChampStats','тир/WR чемпа'],['fActivity','на сайте'],['fShare','шаринг'],['fValidate','валидация'],
   ['showBio','био'],['showRegion','регион'],['fSample','примерные числа'],['emptyDemo','ПУСТО']]
    .forEach(function(f){ if(S[f[0]]) on.push(f[1]); });
  var s = 'Раскладка '+segName('layout')+' · карточка '+segName('cardView')+' · аватар '+segName('avatarStyle')+' '+S.avSize+'px'+
    ' · бейджи '+segName('badges')+' · ранг '+segName('rankStyle')+
    ' · блоки: чемпы '+segName('champView')+', на сайте '+segName('actView')+', соцсети '+segName('socView')+
    ' · кнопки '+segName('btnShape')+'/'+segName('btnContent')+'/'+segName('btnStyle')+'/'+S.btnSize.toUpperCase()+
    ' · ховер '+segName('hover')+' · аватар-аним '+segName('avChange')+
    ' · ширина '+S.cardW+'px · радиус '+S.radius+'px · плотность '+Math.round(S.dens*100)+'%'+
    ' · арт '+segName('splashSrc')+' · вкл: '+(on.join(', ')||'—')+
    ' · стекло op0/blur8/dark.46 (канон 2026-07-13)';
  var el = document.getElementById('choiceText'); if(el) el.textContent = s;
  return s;
}

/* драг полосы */
(function dragStrip(){
  var strip = document.getElementById('labStrip');
  var head = document.getElementById('stripHead');
  var minBtn = document.getElementById('stripMin');
  var dragging=false, offX=0, offY=0;
  minBtn.addEventListener('click', function(){ var m=strip.classList.toggle('min'); minBtn.textContent = m?'Развернуть':'Свернуть'; });
  head.addEventListener('mousedown', function(e){
    if (e.target.closest('.strip-min-btn')) return;
    var r = strip.getBoundingClientRect();
    strip.style.transform='none'; strip.style.left=r.left+'px'; strip.style.top=r.top+'px';
    offX=e.clientX-r.left; offY=e.clientY-r.top; dragging=true; e.preventDefault();
  });
  window.addEventListener('mousemove', function(e){
    if(!dragging) return;
    var x=Math.max(0,Math.min(e.clientX-offX, window.innerWidth-strip.offsetWidth));
    var y=Math.max(0,Math.min(e.clientY-offY, window.innerHeight-strip.offsetHeight));
    strip.style.left=x+'px'; strip.style.top=y+'px';
  });
  window.addEventListener('mouseup', function(){ dragging=false; });
})();

/* ═══════════════ ТОКЕНЫ + РАСКЛАДКА ═══════════════ */
function applyTokens(){
  var rk = rankObj(S.rank);
  root.style.setProperty('--rank-color', rk?rk.color:'#9B59B6');
  root.style.setProperty('--card-w', S.cardW+'px');
  root.style.setProperty('--av-size', S.avSize+'px');
  root.style.setProperty('--ds-r', S.radius+'px');
  root.style.setProperty('--dens', String(S.dens));
  var champ = S.splashSrc==='lux' ? 'Lux' : S.splashSrc==='thresh' ? 'Thresh' : S.avatarChamp;
  document.querySelector('.splash').style.backgroundImage = "url('"+splashUrl(champ)+"')";
  app.className = 'app lay-'+S.layout;
  app.setAttribute('data-btnshape', S.btnShape);
  app.setAttribute('data-btncontent', S.btnContent);
  app.setAttribute('data-btnstyle', S.btnStyle);
  app.setAttribute('data-btnsize', S.btnSize);
}

/* фейд ТОЛЬКО для попапов, которые реально появляются (закон «не тащить дёрганье») */
function playIn(el){ if(!el) return; el.classList.remove('anim-in'); void el.offsetWidth; el.classList.add('anim-in'); }

/* ═══════════════ РЕДАКТОР ═══════════════ */
function btn(act, icon, label, cls){
  return '<button class="btn'+(cls?' '+cls:'')+'" data-act="'+act+'"><span class="bi">'+icon+'</span><span class="bl">'+label+'</span></button>';
}
function renderEditor(){
  var el = document.getElementById('editor');
  var h = '';

  h += '<div class="ed-sec"><div class="ed-label">Аватар <span class="hint">сплэш чемпа = фон за стеклом</span></div>' +
    '<div class="av-row"><div class="av-box av-'+S.avatarStyle+'"><img src="'+loadingUrl(S.avatarChamp)+'" alt="" onerror="this.remove()"></div>' +
    '<div class="av-actions">'+btn('avatar','🖼','Сменить чемпа')+'<span class="av-name">'+dispName(S.avatarChamp)+'</span></div></div></div>';

  h += '<div class="ed-sec"><div class="ed-label">Ник</div><input class="ed-input big" id="edNick" maxlength="24" value="'+escAttr(S.nick)+'"></div>';

  h += '<div class="ed-sec"><div class="ed-label">Роли <span class="hint">основная крупнее, вторую можно снять</span></div>' +
    '<div class="roles-flex"><div class="roles-col role-main"><div class="sub">Основная</div><div class="role-set">';
  ROLES.forEach(function(r){ h += '<button class="pick-btn'+(S.mainRole===r.id?' on':'')+'" data-mrole="'+r.id+'"><img src="'+r.img+'" alt=""><span>'+r.id+'</span></button>'; });
  h += '</div></div><div class="roles-col role-second"><div class="sub">Вторая</div><div class="role-set">';
  ROLES.forEach(function(r){ h += '<button class="pick-btn'+(S.secondRole===r.id?' on':'')+'" data-srole="'+r.id+'"><img src="'+r.img+'" alt=""><span>'+r.id+'</span></button>'; });
  h += '</div></div></div></div>';

  h += '<div class="ed-sec"><div class="ed-label">Максимальный ранг</div><div class="rank-grid">';
  RANKS.forEach(function(rk){ h += '<button class="pick-btn'+(S.rank===rk.id?' on':'')+'" data-rank="'+rk.id+'"><img src="'+rk.img+'" alt=""><span>'+rk.name+'</span></button>'; });
  h += '</div></div>';

  h += '<div class="ed-sec"><div class="ed-label">Избранные чемпионы <span class="hint">до 5 · клик в карточке → страница чемпа</span></div><div class="fav-row">';
  S.favs.forEach(function(id){ h += '<div class="fav-chip"><img src="'+squareUrl(id)+'" alt="'+dispName(id)+'" title="'+dispName(id)+'"><button class="x" data-unfav="'+id+'">✕</button></div>'; });
  if (S.favs.length < 5) h += '<button class="fav-add" data-act="fav">+</button>';
  h += '</div></div>';

  if (S.showBio) h += '<div class="ed-sec"><div class="ed-label">О себе</div><input class="ed-input" id="edBio" maxlength="60" placeholder="Короткий статус…" value="'+escAttr(S.bio)+'"></div>';
  if (S.showRegion) h += '<div class="ed-sec"><div class="ed-label">Регион / сервер</div><input class="ed-input" id="edRegion" maxlength="24" placeholder="Europe" value="'+escAttr(S.region)+'"></div>';

  h += '<div class="ed-sec"><div class="ed-label">Социальные сети <span class="hint">'+(S.fValidate?'вставь ссылку — иконку подберём сами':'валидация выключена')+'</span></div><div class="soc-list">';
  if (!S.socials.length) h += '<div class="soc-empty">Пока нет ссылок</div>';
  S.socials.forEach(function(lk, i){ var p=socObj(lk.platform); if(!p) return;
    h += '<div class="soc-item"><span class="ic">'+p.svg+'</span><span class="url">'+escHtml(lk.url||p.name)+'</span><button class="del" data-delsoc="'+i+'">✕</button></div>';
  });
  h += '</div><div class="soc-add"><input class="ed-input soc-in" id="socUrl" placeholder="https://youtube.com/@ник">'+btn('addsoc','＋','Добавить')+
    '</div><div class="soc-detect" id="socDetect"></div><div class="ed-err" id="socErr"></div></div>';

  labMorph(el, h);            // ТОЧЕЧНО: правка поля не пересобирает редактор
  wireEditor();
}

function wireEditor(){
  var el = document.getElementById('editor');
  /* ввод текста обновляет ТОЧЕЧНО (не перерисовывает карточку целиком) */
  bindText('edNick','nick','.pc-nick');
  bindText('edBio','bio','.pc-bio');
  bindText('edRegion','region','.pc-region');

  el.querySelectorAll('[data-mrole]').forEach(function(b){ b.onclick=function(){ S.mainRole=this.getAttribute('data-mrole'); renderEditor(); renderPreview(); }; });
  el.querySelectorAll('[data-srole]').forEach(function(b){ b.onclick=function(){ var r=this.getAttribute('data-srole'); S.secondRole=(S.secondRole===r?'':r); renderEditor(); renderPreview(); }; });
  el.querySelectorAll('[data-rank]').forEach(function(b){ b.onclick=function(){ S.rank=this.getAttribute('data-rank'); applyTokens(); renderEditor(); renderPreview(); }; });
  el.querySelectorAll('[data-unfav]').forEach(function(b){ b.onclick=function(){ var id=this.getAttribute('data-unfav'); S.favs=S.favs.filter(function(x){return x!==id;}); renderEditor(); renderPreview(); }; });
  el.querySelectorAll('[data-delsoc]').forEach(function(b){ b.onclick=function(){ S.socials.splice(+this.getAttribute('data-delsoc'),1); renderEditor(); renderPreview(); }; });
  var avBtn=el.querySelector('[data-act="avatar"]'); if(avBtn) avBtn.onclick=function(){ openPicker('avatar'); };
  var favBtn=el.querySelector('[data-act="fav"]'); if(favBtn) favBtn.onclick=function(){ openPicker('fav'); };

  var urlInp = document.getElementById('socUrl');
  var detect = document.getElementById('socDetect');
  var err = document.getElementById('socErr');
  function refreshDetect(){
    err.textContent = '';
    var u = urlInp.value.trim();
    if (!u){ detect.innerHTML=''; return; }
    var id = detectSocial(u);
    if (id){ var p=socObj(id); detect.innerHTML = p.svg + '<span>Распознано: '+p.name+'</span>'; }
    else detect.innerHTML = S.fValidate ? '<span>Соцсеть не распознана</span>' : '';
  }
  if (urlInp) urlInp.oninput = refreshDetect;
  var addSoc = el.querySelector('[data-act="addsoc"]');
  if (addSoc) addSoc.onclick = function(){
    var u = urlInp.value.trim(); if(!u){ return; }
    var id = detectSocial(u);
    if (S.fValidate && !id){ urlInp.classList.add('invalid'); err.textContent='Не похоже на ссылку соцсети (YouTube/Twitch/TG/Discord/TikTok/IG/X/Kick).'; return; }
    urlInp.classList.remove('invalid');
    S.socials.push({ platform: id || 'youtube', url: u });
    renderEditor(); renderPreview();
  };
}
/* точечное обновление: меняется одна строка — обновляем одну строку */
function bindText(inputId, key, sel){
  var e = document.getElementById(inputId); if(!e) return;
  e.oninput = function(){
    S[key] = this.value;
    var node = document.querySelector('#previewCard '+sel);
    if (!node) { renderPreview(); return; }           /* блока нет (появился/исчез) — пересобрать */
    if (sel === '.pc-nick') node.textContent = S.nick || 'Без имени';
    else if (sel === '.pc-region') node.textContent = '📍 ' + S.region;
    else node.textContent = S[key];
  };
}

/* ═══════════════ КАРТОЧКА ═══════════════ */
function renderPreview(){
  var card = document.getElementById('previewCard');
  var cls = 'preview-card glass lvl2 view-'+S.cardView+' badges-'+S.badges;
  cls += S.rankStyle==='halo' ? ' rank-halo' : ' rank-border';
  if (S.hover!=='none') cls += ' hov-'+S.hover;
  card.className = cls;

  var favs = favsView(), socials = socialsView();
  var rk = rankObj(S.rank);
  var showArt = (S.cardView==='banner');

  var h = '<div class="pc-banner">';
  if (showArt) h += '<div class="pc-art" style="background-image:url('+splashUrl(S.avatarChamp)+')"></div>';
  h += '<div class="pc-av av-'+S.avatarStyle+(S.avChange!=='none'?' chg-'+S.avChange:'')+'" data-act="avmax">' +
    '<img src="'+loadingUrl(S.avatarChamp)+'" alt="" onerror="this.remove()"></div>';
  h += '<div class="pc-ident"><div class="pc-nick">'+escHtml(S.nick||'Без имени')+'</div>';
  if (S.showBio) h += '<div class="pc-bio">'+escHtml(S.bio)+'</div>';
  if (S.showRegion) h += '<div class="pc-region">📍 '+escHtml(S.region)+'</div>';
  h += '<div class="pc-badges">';
  if (S.mainRole) h += '<span class="pc-badge b-main" title="'+S.mainRole+'"><img src="'+roleImg(S.mainRole)+'" alt=""><b>'+S.mainRole+'</b></span>';
  if (S.secondRole) h += '<span class="pc-badge b-second" title="'+S.secondRole+'"><img src="'+roleImg(S.secondRole)+'" alt=""><b>'+S.secondRole+'</b></span>';
  if (rk) h += '<span class="pc-badge b-rank" title="'+rk.name+'"><img src="'+rk.img+'" alt=""><b>'+rk.name+'</b></span>';
  h += '</div></div></div>';

  h += '<div class="pc-body">';

  /* ИЗБРАННЫЕ ЧЕМПИОНЫ — выбор игрока. Цифры рядом = данные ЧЕМПИОНА, подписано. */
  h += '<div class="pc-block"><div class="pc-block-h">Избранные чемпионы' +
    (S.fChampStats ? '<span class="pc-src">тир и WR — данные чемпиона в патче'+(CHAMP_PATCH?' '+CHAMP_PATCH:'')+'</span>' : '') +
    '</div>';
  if (favs.length){
    h += '<div class="pc-champs v-'+S.champView+'">';
    favs.forEach(function(id){
      var cs = champStat(id);
      var tc = cs ? (TIER_COLOR[cs.tier] || '#7aa2c4') : 'var(--glass-edge)';
      var sub = '';
      if (S.fChampStats){
        sub = cs
          ? 'WR чемпа <b style="color:'+wrColor(cs.wr)+'">'+cs.wr.toFixed(1)+'%</b> · тир '+cs.tier
          : '<span class="pc-nodata">нет данных патча</span>';
      }
      h += '<div class="ch-item'+(S.fChampStats && cs ? ' tiered':'')+'" style="--tier-c:'+tc+'" data-champ="'+id+'"' +
        ' title="'+dispName(id)+(cs?' · WR чемпа '+cs.wr+'% · тир '+cs.tier:'')+'">' +
        '<span class="ch-ava"><img src="'+squareUrl(id)+'" alt="'+dispName(id)+'"></span>' +
        '<div class="ch-body"><div class="ch-name">'+dispName(id)+'</div>' +
        (sub ? '<div class="ch-sub">'+sub+'</div>' : '') + '</div>' +
        (S.fChampStats && cs ? '<div class="ch-meta"><span class="ch-tier" style="color:'+tc+'">'+cs.tier+'</span></div>' : '') +
        '</div>';
    });
    h += '</div>';
  } else h += '<div class="pc-ph">➕ добавь избранного чемпиона</div>';
  h += '</div>';

  /* НА САЙТЕ — честные наши источники (значения приходят с боевого) */
  if (S.fActivity){
    var acts = [
      {k:'regDate', ic:'📅', l:'С нами с',        v:liveVal('regDate'),  go:null,      src:'Firebase Auth · creationTime'},
      {k:'chatMsgs',ic:'💬', l:'Сообщений в чате', v:liveVal('chatMsgs'), go:'chat',    src:'Firestore · globalChat (uid)'},
      {k:'drafts',  ic:'🎯', l:'Драфтов у нас',    v:liveVal('drafts'),   go:'drafter', src:'Firestore · draftLobbies (uid)'}
    ];
    h += '<div class="pc-block"><div class="pc-block-h">На сайте' +
      (S.fSample ? '<span class="pc-src">числа — пример, для оценки вида</span>' : '') + '</div>';
    h += '<div class="pc-acts v-'+S.actView+'">';
    acts.forEach(function(a){
      var empty = (a.v === '—');
      h += '<div class="act-item'+(a.go?' clickable':'')+(empty?' empty':'')+'"'+(a.go?' data-go="'+a.go+'"':'')+
        ' title="'+a.src+'"><span class="act-ic">'+a.ic+'</span>' +
        '<div class="act-body"><span class="act-v">'+a.v+'</span><span class="act-l">'+a.l+'</span></div></div>';
    });
    h += '</div></div>';
  }

  /* СОЦСЕТИ */
  h += '<div class="pc-block"><div class="pc-block-h">Соцсети</div>';
  if (socials.length){
    h += '<div class="pc-socials v-'+S.socView+'">';
    socials.forEach(function(lk){ var p=socObj(lk.platform); if(!p) return;
      h += '<div class="pc-soc" title="'+p.name+'" data-soc="'+escAttr(lk.url||'')+'">'+p.svg+'<span class="soc-name">'+p.name+'</span></div>'; });
    h += '</div>';
  } else h += '<div class="pc-ph">➕ добавь соцсеть</div>';
  h += '</div>';

  if (S.fShare) h += '<div class="pc-block">'+btn('share','📤','Поделиться профилем','')+'</div>';
  h += '</div>';

  labMorph(card, h);          // ТОЧЕЧНО: смена чемпа/тумблера правит карточку, а не пересоздаёт
  wirePreview();
}

function wirePreview(){
  var card = document.getElementById('previewCard');
  /* ЗАКОН СВЯЗЕЙ: ни одной фичи-тупика */
  card.querySelectorAll('[data-champ]').forEach(function(e){
    e.onclick = function(){ toast('→ страница чемпиона: '+dispName(this.getAttribute('data-champ'))); };
  });
  card.querySelectorAll('[data-go]').forEach(function(e){
    e.onclick = function(){
      var g = this.getAttribute('data-go');
      toast(g==='chat' ? '→ глобальный чат' : '→ драфтер (мои драфты)');
    };
  });
  card.querySelectorAll('[data-soc]').forEach(function(e){
    e.onclick = function(){ toast('→ соцсеть: '+(this.getAttribute('data-soc')||'—')); };
  });
  var avmax = card.querySelector('[data-act="avmax"]');
  if (avmax) avmax.onclick = function(){ toast('→ аватар открывается из чата (связь чат ↔ профиль)'); };
  var share = card.querySelector('[data-act="share"]');
  if (share) share.onclick = openShare;
}

/* ═══════════════ ПИКЕР ЧЕМПИОНОВ ═══════════════ */
var _pickMode=null, _pickSel=[];
function openPicker(mode){
  _pickMode=mode; _pickSel = (mode==='avatar') ? [S.avatarChamp] : S.favs.slice();
  document.getElementById('cpTitle').textContent = (mode==='avatar')?'Аватар — выбери чемпа':'Избранные чемпионы (до 5)';
  document.getElementById('cpSearch').value='';
  document.getElementById('champPicker').hidden=false;
  playIn(document.querySelector('.cp-win'));
  buildPickerGrid(''); updatePickHint();
  document.getElementById('cpSearch').focus();
}
function closePicker(){ document.getElementById('champPicker').hidden=true; _pickMode=null; }
function buildPickerGrid(q){
  q=(q||'').toLowerCase();
  var grid = document.getElementById('cpGrid');
  // ПОИСК = показать/скрыть готовые ячейки (закон антидёрганья), сетка не пересобирается
  labMorph(grid, CHAMPS
    .map(function(id){ var hit=dispName(id).toLowerCase().indexOf(q)>=0;
      return '<div class="cp-cell'+(_pickSel.indexOf(id)>=0?' sel':'')+(hit?'':' is-off')+'" data-key="'+id+'" data-ch="'+id+'"><img src="'+squareUrl(id)+'" alt="" loading="lazy"><div class="tick">✓</div><div class="nm">'+dispName(id)+'</div></div>'; }).join(''));
  grid.querySelectorAll('[data-ch]').forEach(function(c){ c.onclick=function(){ pickToggle(this.getAttribute('data-ch')); }; });
}
function pickToggle(id){
  if (_pickMode==='avatar'){ S.avatarChamp=id; closePicker(); applyTokens(); renderEditor(); renderPreview(); updateChoice(); return; }
  var i=_pickSel.indexOf(id);
  if (i>=0) _pickSel.splice(i,1); else { if(_pickSel.length>=5) return; _pickSel.push(id); }
  /* точечно: меняем ТОЛЬКО задетую ячейку, сетку не пересобираем */
  var cell = document.querySelector('#cpGrid [data-ch="'+id+'"]');
  if (cell) cell.classList.toggle('sel', _pickSel.indexOf(id)>=0);
  updatePickHint();
}
function updatePickHint(){ document.getElementById('cpHint').textContent = (_pickMode==='avatar')?'Клик по чемпу — применится сразу':'Выбрано '+_pickSel.length+' / 5'; }
document.getElementById('cpSearch').oninput = function(){ buildPickerGrid(this.value); };
document.getElementById('cpClose').onclick = closePicker;
document.getElementById('cpDone').onclick = function(){ if(_pickMode==='fav'){ S.favs=_pickSel.slice(); renderEditor(); renderPreview(); } closePicker(); };
document.getElementById('champPicker').onclick = function(e){ if(e.target===this) closePicker(); };

/* ═══════════════ ШАРИНГ (PNG-снимок + ссылка /u/ник) ═══════════════ */
function slug(s){ return String(s).trim().toLowerCase().replace(/[^a-z0-9а-я]+/gi,'-').replace(/^-+|-+$/g,'') || 'player'; }
function profileUrl(){ return 'https://pro-wildrift.example/u/'+slug(S.nick); }
function roundRect(ctx,x,y,w,hh,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+hh,r); ctx.arcTo(x+w,y+hh,x,y+hh,r); ctx.arcTo(x,y+hh,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
function drawShare(){
  var cv = document.getElementById('shareCanvas');
  var W=380, H=196, sc=2;
  cv.width=W*sc; cv.height=H*sc; cv.style.width=W+'px'; cv.style.height=H+'px';
  var ctx = cv.getContext('2d'); ctx.scale(sc,sc);
  var rk = rankObj(S.rank), rankCol = rk?rk.color:'#9B59B6';
  var g = ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#0c1620'); g.addColorStop(1,'#060b12');
  ctx.fillStyle=g; roundRect(ctx,0,0,W,H,15); ctx.fill();
  if (S.rankStyle==='halo'){ var rg=ctx.createRadialGradient(W/2,0,10,W/2,0,200); rg.addColorStop(0,rankCol+'66'); rg.addColorStop(1,'transparent'); ctx.fillStyle=rg; roundRect(ctx,0,0,W,H,15); ctx.fill(); }
  else { ctx.strokeStyle=rankCol; ctx.lineWidth=2; roundRect(ctx,1,1,W-2,H-2,14); ctx.stroke(); }
  ctx.save(); ctx.beginPath(); ctx.arc(60,64,34,0,7); ctx.closePath(); ctx.clip();
  ctx.fillStyle='#132634'; ctx.fillRect(26,30,68,68);
  ctx.fillStyle='#cfe4f0'; ctx.font='700 30px system-ui'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText((S.nick[0]||'?').toUpperCase(),60,66); ctx.restore();
  if (S.avatarStyle==='rank'){ ctx.strokeStyle=rankCol; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(60,64,34,0,7); ctx.stroke(); }
  ctx.textAlign='left'; ctx.textBaseline='alphabetic';
  ctx.fillStyle='#fff'; ctx.font='700 22px system-ui'; ctx.fillText(S.nick||'Без имени',110,54);
  ctx.fillStyle='rgba(255,255,255,.75)'; ctx.font='500 13px system-ui';
  ctx.fillText([S.mainRole,S.secondRole].filter(Boolean).join(' · ')+'  ·  '+(rk?rk.name:''),110,76);
  if (S.showBio && S.bio){ ctx.fillStyle='rgba(255,255,255,.6)'; ctx.font='400 12px system-ui'; ctx.fillText(S.bio.slice(0,40),110,96); }
  /* избранные чемпы — плитки-инициалы (без внешних картинок → canvas не tainted) */
  favsView().slice(0,5).forEach(function(id,i){ var x=20+i*40;
    ctx.fillStyle='#1a2c3c'; roundRect(ctx,x,120,34,34,8); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.8)'; ctx.font='700 13px system-ui'; ctx.textAlign='center';
    ctx.fillText(dispName(id).slice(0,2),x+17,141); });
  ctx.textAlign='right'; ctx.fillStyle='rgba(255,255,255,.5)'; ctx.font='600 11px system-ui';
  ctx.fillText('pro-wildrift · /u/'+slug(S.nick),W-16,172);
}
function openShare(){
  drawShare();
  document.getElementById('shareUrl').value = profileUrl();
  document.getElementById('shareMask').hidden=false;
  playIn(document.querySelector('.share-win'));
}
function closeShare(){ document.getElementById('shareMask').hidden=true; }
document.getElementById('shareClose').onclick = closeShare;
document.getElementById('shareMask').onclick = function(e){ if(e.target===this) closeShare(); };
document.getElementById('shareCopy').onclick = function(){ copyText(profileUrl(), function(){ toast('Ссылка скопирована: '+profileUrl()); }); };
document.getElementById('shareChat').onclick = function(){ toast('→ карточка-ссылка отправлена в чат'); };
document.getElementById('shareDl').onclick = function(){
  var cv=document.getElementById('shareCanvas');
  try { var a=document.createElement('a'); a.href=cv.toDataURL('image/png'); a.download=slug(S.nick)+'-profile.png'; a.click(); toast('PNG сохранён'); }
  catch(e){ toast('Не удалось сохранить PNG'); }
};

/* ═══════════════ УТИЛИТЫ ═══════════════ */
function escHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escAttr(s){ return escHtml(s).replace(/"/g,'&quot;'); }
function copyText(s, ok){
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(s).then(ok, function(){ copyFallback(s); ok&&ok(); });
  else { copyFallback(s); ok&&ok(); }
}
function copyFallback(s){ var ta=document.createElement('textarea'); ta.value=s; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy');}catch(e){} document.body.removeChild(ta); }
var _toastT=null;
function toast(msg){ var t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(_toastT); _toastT=setTimeout(function(){ t.classList.remove('show'); }, 2600); }

document.addEventListener('keydown', function(e){
  if (e.key!=='Escape') return;
  if (!document.getElementById('shareMask').hidden) closeShare();
  else if (!document.getElementById('champPicker').hidden) closePicker();
});

/* ПРИЁМКА СЧЁТЧИКОМ (консоль): __nodeCheck('#previewCard *') → пометить,
   выполнить действие, снова вызвать → покажет сколько узлов выжило. */
window.__nodeCheck = function(sel){
  var nodes = document.querySelectorAll(sel || '#previewCard *');
  var kept = 0, total = nodes.length;
  nodes.forEach(function(n){ if (n.__keep) kept++; n.__keep = true; });
  console.log('узлов: '+total+' · выжило с прошлой пометки: '+kept+'/'+total);
  return kept+'/'+total;
};

/* ═══════════════ СТАРТ ═══════════════ */
function renderAll(){ buildStrip(); applyTokens(); renderEditor(); renderPreview(); updateChoice(); }
renderAll();

})();
