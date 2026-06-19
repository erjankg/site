/* ════════════════════════════════════════════════════════════════
   chat-lab.js — песочница ЧАТА. По каждому пункту — несколько вариантов.
   Верхняя дизайн-полоса = для нас (подбор вида). В боевой переносим
   только выбранный вариант. Источник стиля боевого: app.js renderBubble
   + styles.css .chat-bubble-* (Telegram-вид: сайдбар + пузыри).
   Кнопки рабочие: отправка сообщений, клик по юзеру (@упоминание),
   📎 вложения = «кнопки-ссылки» карточками контента сайта + фото.
   ════════════════════════════════════════════════════════════════ */
(function(){
'use strict';

var ME = 'me';
function champIcon(key){ return 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/'+key+'.png'; }
function splash(key){ return 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/'+key+'_0.jpg'; }
function itemImg(slug){ return 'https://www.wildriftfire.com/images/items/'+slug+'.png'; }

// ── демо-диалог: показывает сценарий «скинь кнопку-ссылку» ──
var MSGS = [
  {id:'m1', sys:true, text:'Добро пожаловать в общий чат WildRift Hub 💬'},
  {id:'m2', uid:'u1', name:'Tahm_Top', text:'патч 5.1 завезли, Камилла снова сильна на топе', t:'14:02', av:'#e7642d',
    reactions:[{e:'🔥',n:3,mine:false},{e:'👍',n:1,mine:true}]},
  {id:'m3', uid:'u3', name:'jungle_gap', text:'кто-нибудь, скиньте кнопку-ссылку на матчапы Камиллы 🙏', t:'14:03', av:'#a06bff'},
  {id:'m4', uid:'adm', name:'ErjanKG', admin:true, text:'держи 👇', t:'14:04', av:'#0bc4e3',
    replyTo:{id:'m3', name:'jungle_gap', text:'кто-нибудь, скиньте кнопку-ссылку на матчапы Камиллы 🙏'},
    card:{type:'matchup', name:'Камилла', key:'Camille', vs:[['Дариус',true],['Гарен',true],['Сетт',false]]}},
  {id:'m5', uid:'u3', name:'jungle_gap', text:'о, спс! то что надо 🔥', t:'14:05', av:'#a06bff',
    reactions:[{e:'❤️',n:2,mine:false}]},
  {id:'m6', uid:ME,  name:'Я',        text:'а тир-лист патча можете скинуть? я чекну', t:'14:06'},
  {id:'m7', uid:'u1', name:'Tahm_Top', text:'лови', t:'14:07', av:'#e7642d',
    replyTo:{id:'m6', name:'Я', text:'а тир-лист патча можете скинуть? я чекну'},
    card:{type:'tier', patch:'5.1', items:[['Ясуо','S'],['Камилла','A'],['Гарен','B']]}},
  {id:'m8', uid:'adm', name:'ErjanKG', admin:true, text:'и сразу сборку Камиллы кину', t:'14:08', av:'#0bc4e3',
    card:{type:'build', name:'Камилла', key:'Camille', items:['eclipse','sterak-gage','death-dance']}},
  {id:'m9', uid:ME,  name:'Я',        text:'имба, всё в одном чате 👏', t:'14:09', grp:true,
    reactions:[{e:'👏',n:4,mine:false}]}
];

// rank + ОДНА соц-ссылка (на боевом у юзера м.б. ~4, пока одна)
var USERS = [
  {name:'ErjanKG', sub:'админ', av:'#0bc4e3', on:true,  admin:true, rank:'Challenger', link:{type:'tg', label:'Telegram'}},
  {name:'Tahm_Top', sub:'топ-лейн', av:'#e7642d', on:true,  rank:'Алмаз',   link:{type:'dc', label:'Discord'}},
  {name:'mid_diff', sub:'мид', av:'#5c7cff', on:true,  rank:'Мастер',  link:{type:'tg', label:'Telegram'}},
  {name:'jungle_gap', sub:'лес', av:'#a06bff', on:false, rank:'Платина', link:{type:'dc', label:'Discord'}},
  {name:'support_btw', sub:'саппорт', av:'#37e07a', on:true,  rank:'Золото',  link:{type:'tg', label:'Telegram'}},
  {name:'adc_main', sub:'дракон', av:'#ffb02e', on:false, rank:'Изумруд', link:{type:'dc', label:'Discord'}}
];
var RANKCOL={'Challenger':'#ff5d8f','Грандмастер':'#ff5d5d','Мастер':'#c389ff','Алмаз':'#7fd0ff',
  'Изумруд':'#46e08a','Платина':'#5fe0d0','Золото':'#ffd84d','Серебро':'#c9d6e0','Бронза':'#cd8b5a'};
function userIndexByName(n){ for(var i=0;i<USERS.length;i++){ if(USERS[i].name===n) return i; } return -1; }

// ── состояние (его выбор = дефолты) ──
var DEFAULTS = {
  layout:'classic',   // classic right full tabs float center rail
  bubble:'rounded',   // rounded tail card line glass pill neon
  avatar:'online',    // left others square none online big ring
  meta:'stacked',     // stacked inline hover grouped timeonly
  density:'compact',  // cozy compact tight airy
  bg:'art',           // dark art dots grad lines
  input:'rich',       // capsule rect rich float minimal big
  send:'circle',      // circle pill icon square
  blur:16
};
var S = Object.assign({}, DEFAULTS);
var _railMentions = 0; // сколько раз тебя тегнули → бейдж на 💬 в рельсе
var _replyTarget = null; // на какое сообщение отвечаю
var _keepScroll = false; // не прыгать вниз (реакция на старое сообщение)
var REACT_SET = ['👍','🔥','😂','❤️','😮','😢'];
function genId(){ return 'm'+Date.now()+Math.floor(Math.random()*99); }
function msgById(id){ for(var i=0;i<MSGS.length;i++){ if(MSGS[i].id===id) return MSGS[i]; } return null; }

var GROUPS = [
  {key:'layout', label:'Раскладка', opts:[
    ['classic','Сайдбар слева'],['right','Сайдбар справа'],['full','На весь экран'],['tabs','Каналы-вкладки'],
    ['float','Виджет в углу'],['center','Центр-колонка'],['rail','Рельс-иконки']]},
  {key:'bubble', label:'Пузырь', opts:[
    ['rounded','Скруглённый'],['tail','С хвостиком'],['card','Карточка'],['line','Линия (минимал)'],
    ['glass','Стекло'],['pill','Пилюля'],['neon','Неон']]},
  {key:'avatar', label:'Аватар', opts:[
    ['left','Круг слева'],['others','Только у чужих'],['square','Квадрат'],['none','Без аватара'],
    ['online','С онлайн-точкой'],['big','Крупный'],['ring','В кольце']]},
  {key:'meta', label:'Имя / время', opts:[
    ['stacked','Имя сверху'],['inline','В строку'],['hover','Время по наведению'],['grouped','Группировка подряд'],
    ['timeonly','Только время']]},
  {key:'density', label:'Плотность', opts:[
    ['cozy','Просторно'],['compact','Компактно'],['tight','Вплотную'],['airy','Очень просторно']]},
  {key:'bg', label:'Фон', opts:[
    ['dark','Тёмный'],['art','Сплэш за стеклом'],['dots','Точки'],['grad','Градиент'],['lines','Линии']]},
  {key:'input', label:'Поле ввода', opts:[
    ['capsule','Капсула'],['rect','Прямоугольник'],['rich','С кнопками'],['float','Плавающее'],
    ['minimal','Минимал'],['big','Крупное']]},
  {key:'send', label:'Кнопка отправки', opts:[
    ['circle','Круг ➤'],['pill','Капсула «Отпр.»'],['icon','Только иконка'],['square','Квадрат']]}
];

function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function initial(n){ return (n||'?').charAt(0).toUpperCase(); }
function nowHM(){ var d=new Date(); return ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2); }

var _tt;
function toast(msg){
  var el=document.querySelector('.cl-toast');
  if(!el){ el=document.createElement('div'); el.className='cl-toast'; document.body.appendChild(el); }
  el.textContent=msg; requestAnimationFrame(function(){ el.classList.add('show'); });
  clearTimeout(_tt); _tt=setTimeout(function(){ el.classList.remove('show'); },1700);
}

// ── полоса вариантов ──
function buildPanel(){
  var el = document.getElementById('settings');
  var html = GROUPS.map(function(g){
    var btns = g.opts.map(function(o){
      var on = S[g.key]===o[0] ? ' on' : '';
      return '<button class="'+on.trim()+'" data-k="'+g.key+'" data-v="'+o[0]+'">'+esc(o[1])+'</button>';
    }).join('');
    return '<div class="cfg-group"><div class="cfg-label">'+esc(g.label)+'</div><div class="seg">'+btns+'</div></div>';
  }).join('');
  html += '<div class="cfg-group"><div class="cfg-label">Сила стекла</div>'+
    '<div class="cfg-range"><input type="range" id="blurR" min="0" max="34" value="'+S.blur+'">'+
    '<span class="val" id="blurV">'+S.blur+'px</span></div></div>';
  el.innerHTML = html;

  el.querySelectorAll('.seg button').forEach(function(b){
    b.onclick = function(){ S[b.dataset.k]=b.dataset.v; buildPanel(); render(); };
  });
  var r = document.getElementById('blurR');
  r.oninput = function(){ S.blur=+r.value; document.getElementById('blurV').textContent=r.value+'px';
    document.querySelector('.chat-stage').style.setProperty('--blur', r.value+'px'); };
}

// ── карточка-вложение («кнопка-ссылка») ──
function cardHTML(c){
  var head=function(ic,round,t,s){
    return '<div class="card-h"><div class="card-ic'+(round?' round':'')+'">'+ic+'</div>'+
      '<div class="card-tt"><div class="t">'+esc(t)+'</div><div class="s">'+esc(s)+'</div></div></div>'; };
  var btn=function(label){ return '<button class="card-btn" data-open="'+esc(label)+'">'+esc(label)+' →</button>'; };
  var champPic=function(k){ return '<img src="'+champIcon(k)+'" onerror="this.style.display=\'none\'">'; };

  if(c.type==='champion')
    return '<div class="card">'+head(champPic(c.key),true,c.name,c.sub||'Чемпион')+btn('Открыть чемпиона')+'</div>';

  if(c.type==='matchup'){
    var rows=c.vs.map(function(v){ return '<div class="card-row"><span class="'+(v[1]?'ok':'no')+'">'+(v[1]?'✓':'✗')+'</span> '+esc(v[0])+'</div>'; }).join('');
    return '<div class="card">'+head(champPic(c.key),true,'Матчапы · '+c.name,'кого бьёт / кто бьёт')+
      '<div class="card-body">'+rows+'</div>'+btn('Открыть матчапы')+'</div>';
  }
  if(c.type==='tier'){
    var ti=c.items.map(function(it){ return '<div class="card-row"><span class="tierchip '+it[1]+'">'+it[1]+'</span> '+esc(it[0])+'</div>'; }).join('');
    return '<div class="card">'+head('🏆',false,'Тир-лист · патч '+c.patch,'актуальная мета')+
      '<div class="card-body">'+ti+'</div>'+btn('Открыть тир-лист')+'</div>';
  }
  if(c.type==='build'){
    var its=c.items.map(function(sl){ return '<img src="'+itemImg(sl)+'" onerror="this.style.visibility=\'hidden\'">'; }).join('');
    return '<div class="card">'+head(champPic(c.key),true,'Сборка · '+c.name,'ядро + ботинки')+
      '<div class="card-items">'+its+'</div>'+btn('Открыть сборку')+'</div>';
  }
  if(c.type==='item')
    return '<div class="card">'+head('<img src="'+itemImg(c.slug)+'" onerror="this.style.display=\'none\'">',false,c.name,'Предмет')+btn('Открыть предмет')+'</div>';

  if(c.type==='photo')
    return '<div class="card"><img class="card-photo" src="'+c.src+'" onerror="this.style.display=\'none\'">'+
      '<div class="card-h" style="padding-bottom:9px"><div class="card-tt"><div class="t">📷 '+esc(c.cap||'Скриншот')+'</div>'+
      '<div class="s">изображение</div></div></div></div>';
  return '';
}

// ── рендер строки ──
function rowHTML(m){
  if(m.sys) return '<div class="row sys"><div class="bub">'+esc(m.text)+'</div></div>';
  var me = m.uid===ME;
  var grp = m.grp && S.meta==='grouped' ? ' grp' : '';
  var av = '<div class="av" style="'+(m.av?('background:linear-gradient(135deg,'+m.av+',#7fe9ff)'):'')+'">'+
    initial(m.name)+'<span class="udot"></span></div>';
  var pi = me ? -1 : userIndexByName(m.name);
  var nmCls = 'nm'+(m.admin?' admin':'')+(pi>=0?' clickable':'');
  var name = (!me) ? '<div class="'+nmCls+'"'+(pi>=0?' data-pi="'+pi+'"':'')+'>'+(m.admin?'👑 ':'')+esc(m.name)+'</div>' : '';
  var txt = m.text ? '<div class="txt">'+esc(m.text)+'</div>' : '';
  var card = m.card ? cardHTML(m.card) : '';
  var meta = '<div class="meta"><span class="tm">'+esc(m.t||'')+'</span></div>';
  var quote = m.replyTo ? '<div class="reply-quote" data-jump="'+esc(m.replyTo.id||'')+'">'+
    '<span class="qn">'+esc(m.replyTo.name)+'</span><span class="qt">'+esc(m.replyTo.text||'вложение')+'</span></div>' : '';
  var reacts = (m.reactions&&m.reactions.length) ?
    '<div class="reacts">'+m.reactions.map(function(r){
      return '<button class="rchip'+(r.mine?' mine':'')+'" data-react="'+esc(r.e)+'">'+r.e+' '+r.n+'</button>'; }).join('')+'</div>' : '';
  var tools = '<div class="row-tools"><button class="rt-react" title="Реакция">😊</button>'+
    '<button class="rt-reply" title="Ответить">↩</button></div>';
  return '<div class="row'+(me?' me':'')+grp+'" data-id="'+esc(m.id)+'">'+av+
    '<div class="bub">'+quote+name+txt+card+meta+reacts+'</div>'+tools+'</div>';
}

function sideHTML(){
  var rows = USERS.map(function(u,i){
    return '<div class="cs-user" data-u="'+i+'"><div class="av" style="background:linear-gradient(135deg,'+u.av+',#7fe9ff)">'+
      initial(u.name)+(u.on?'<span class="cs-dot"></span>':'')+'</div>'+
      '<div class="nm">'+esc(u.name)+'<small>'+esc(u.sub)+'</small></div></div>';
  }).join('');
  var onCnt = USERS.filter(function(u){return u.on;}).length;
  return '<div class="cs-side"><div class="cs-side-h">👥 Пользователи<span class="cnt">'+onCnt+' онлайн</span></div>'+
    '<div class="cs-users">'+rows+'</div></div>';
}

function inputHTML(){
  var sendTxt = S.send==='pill' ? 'Отправить' : '➤';
  var extra = '<div class="extra"><button class="ex-emoji" title="Эмодзи">😊</button>'+
    '<button class="ex-attach" title="Прикрепить (кнопка-ссылка / фото)">📎</button></div>';
  var menu = '<div class="attach-menu" id="attachMenu">'+
    '<div class="am-h">Скинуть кнопку-ссылку</div>'+
    '<button data-card="champion"><span class="ai">🧙</span> Карточка чемпиона</button>'+
    '<button data-card="matchup"><span class="ai">⚔️</span> Матчапы чемпа</button>'+
    '<button data-card="tier"><span class="ai">🏆</span> Тир-лист (патч)</button>'+
    '<button data-card="build"><span class="ai">🛠️</span> Сборка чемпа</button>'+
    '<button data-card="item"><span class="ai">📦</span> Предмет</button>'+
    '<div class="am-h">Вложение</div>'+
    '<button data-card="photo"><span class="ai">📷</span> Фото / скриншот</button></div>';
  var inner = extra+
    '<input type="text" class="cl-inp" placeholder="Написать сообщение…">'+
    '<button class="cs-send">'+sendTxt+'</button>';
  var body = (S.input==='float') ? '<div class="ibox">'+inner+'</div>' : inner;
  var replyBar = _replyTarget ?
    '<div class="reply-bar"><span class="rb-ic">↩</span>'+
    '<span class="rb-tx">Ответ <b>'+esc(_replyTarget.name)+'</b>: '+esc(_replyTarget.text||'вложение')+'</span>'+
    '<button class="rb-x" title="Отмена">✕</button></div>' : '';
  return replyBar+'<div class="cs-input">'+menu+body+'</div>';
}

// ── главный рендер ──
function render(){
  var stage = document.getElementById('stage');
  var prevBox = stage.querySelector('.cs-msgs');
  var prevTop = prevBox ? prevBox.scrollTop : 0;
  stage.className = 'chat-stage lay-'+S.layout+' bub-'+S.bubble+' av-'+S.avatar+' meta-'+S.meta+
    ' dens-'+S.density+' bg-'+S.bg+' inp-'+S.input+' snd-'+S.send;
  stage.style.setProperty('--blur', S.blur+'px');

  var tabs = '<div class="cs-tabs"><div class="tab on">💬 Общий</div><div class="tab">🏆 Тир-лист</div><div class="tab">🎬 Инфл.</div></div>';
  var onCnt = USERS.filter(function(u){return u.on;}).length;

  var rail =
    '<div class="site-rail">'+
      '<div class="sr-logo">🎮</div>'+
      '<div class="sr-btn" title="Главная">🏠</div>'+
      '<div class="sr-btn" title="Статистика">📊</div>'+
      '<div class="sr-btn" title="Драфт">🛠</div>'+
      '<div class="sr-btn chat on" title="Чат">💬<span class="sr-badge"></span></div>'+
      '<div class="sr-btn" title="Настройки" style="margin-top:auto">⚙</div>'+
    '</div>';

  stage.innerHTML =
    '<div class="chat-art"></div><div class="chat-scrim"></div>'+ rail +
    '<div class="chat-glass">'+sideHTML()+
      '<div class="cs-main">'+
        '<div class="cs-head"><div><div class="ttl">💬 Общий чат</div>'+
          '<div class="sub">WildRift Hub · '+onCnt+' онлайн</div></div>'+
          '<div class="spacer"></div><button class="hbtn cl-infl">🎬 Инфл.</button></div>'+
        tabs+
        '<div class="cs-msgs">'+MSGS.map(rowHTML).join('')+'</div>'+
        inputHTML()+
      '</div></div>'+
    '<div class="cs-profile" id="csProfile"></div>';

  wire(stage);
  if(_railMentions>0){
    var btn=stage.querySelector('.site-rail .sr-btn.chat');
    if(btn){ btn.classList.add('lit'); btn.querySelector('.sr-badge').textContent=_railMentions; }
  }
  var box = stage.querySelector('.cs-msgs');
  if(box) box.scrollTop = _keepScroll ? prevTop : box.scrollHeight;
  _keepScroll = false;
}

// ── рабочие кнопки/взаимодействия ──
function wire(stage){
  var inp = stage.querySelector('.cl-inp');
  var send = stage.querySelector('.cs-send');

  function doSend(){
    var v=(inp.value||'').trim(); if(!v) return;
    var msg={id:genId(), uid:ME, name:'Я', text:v, t:nowHM()};
    if(_replyTarget) msg.replyTo={id:_replyTarget.id, name:_replyTarget.name, text:_replyTarget.text};
    MSGS.push(msg);
    _replyTarget=null;
    render();
  }
  if(send) send.onclick = doSend;
  if(inp) inp.addEventListener('keydown', function(e){ if(e.key==='Enter') doSend(); });

  // hover-инструменты: ответить / реакция
  stage.querySelectorAll('.rt-reply').forEach(function(b){
    b.onclick=function(){ setReply(b.closest('.row').dataset.id); };
  });
  stage.querySelectorAll('.rt-react').forEach(function(b){
    b.onclick=function(e){ e.stopPropagation(); openReactPop(b, b.closest('.row').dataset.id); };
  });
  // клик по существующей реакции-чипу → вкл/выкл
  stage.querySelectorAll('.rchip').forEach(function(c){
    c.onclick=function(){ toggleReact(c.closest('.row').dataset.id, c.dataset.react); };
  });
  // отмена ответа
  var rbx = stage.querySelector('.reply-bar .rb-x');
  if(rbx) rbx.onclick=function(){ _replyTarget=null; render(); };

  // эмодзи — простой быстрый набор по клику
  var emo = stage.querySelector('.ex-emoji');
  var EM=['🔥','😄','👍','😎','💪','🎯','😂','❤️'], ei=0;
  if(emo) emo.onclick=function(){ if(inp){ inp.value+=EM[ei++%EM.length]; inp.focus(); } };

  // меню вложений (📎)
  var attBtn = stage.querySelector('.ex-attach');
  var menu = stage.querySelector('#attachMenu');
  if(attBtn && menu){
    attBtn.onclick=function(e){ e.stopPropagation(); menu.classList.toggle('open'); };
    menu.querySelectorAll('button').forEach(function(b){
      b.onclick=function(){ menu.classList.remove('open'); sendCard(b.dataset.card); };
    });
    document.addEventListener('click', function(){ menu.classList.remove('open'); }, {once:true});
  }

  // клик по пользователю (в сайдбаре или по имени в пузыре) → карточка-профиль
  stage.querySelectorAll('.cs-user').forEach(function(u){
    u.onclick=function(){ openProfile(+u.dataset.u); };
  });
  stage.querySelectorAll('.bub .nm.clickable').forEach(function(n){
    n.onclick=function(){ openProfile(+n.dataset.pi); };
  });

  // клик по 💬 в рельсе = «открыл/посмотрел чат» → гасим подсветку тега
  var chatBtn = stage.querySelector('.site-rail .sr-btn.chat');
  if(chatBtn) chatBtn.onclick=function(){
    if(_railMentions>0){ _railMentions=0; render(); toast('Чат прочитан — подсветка снята'); }
  };

  // «Инфл.» и кнопки «Открыть» на карточках
  var infl = stage.querySelector('.cl-infl');
  if(infl) infl.onclick=function(){ toast('🎬 Раздел «Инфлюенсеры» (демо)'); };
  stage.querySelectorAll('.card-btn').forEach(function(b){
    b.onclick=function(){ toast('Открываю: '+b.dataset.open+' (на боевом — реальная модалка)'); };
  });
  stage.querySelectorAll('.cs-tabs .tab').forEach(function(tb){
    tb.onclick=function(){ stage.querySelectorAll('.cs-tabs .tab').forEach(function(x){x.classList.remove('on');});
      tb.classList.add('on'); };
  });
}

// ── отправить карточку-вложение от своего имени ──
function sendCard(type){
  var pre = (document.querySelector('.cl-inp')||{}).value || '';
  var card;
  if(type==='champion') card={type:'champion', name:'Камилла', key:'Camille', sub:'Чемпион · топ-лейн'};
  else if(type==='matchup') card={type:'matchup', name:'Камилла', key:'Camille', vs:[['Дариус',true],['Гарен',true],['Сетт',false]]};
  else if(type==='tier') card={type:'tier', patch:'5.1', items:[['Ясуо','S'],['Камилла','A'],['Гарен','B']]};
  else if(type==='build') card={type:'build', name:'Камилла', key:'Camille', items:['eclipse','sterak-gage','death-dance']};
  else if(type==='item') card={type:'item', name:'Кровопийца', slug:'bloodthirster'};
  else if(type==='photo') card={type:'photo', src:splash('Camille'), cap:'момент тимфайта'};
  MSGS.push({id:genId(), uid:ME, name:'Я', text:pre.trim()||'', card:card, t:nowHM()});
  render();
  toast('Карточка отправлена 📨');
}

// ── ответы и реакции ──
function setReply(id){
  var m=msgById(id); if(!m) return;
  _replyTarget={id:id, name:(m.uid===ME?'Я':(m.name||'Аноним')), text:m.text||(m.card?'вложение':'')};
  render();
  var inp=document.querySelector('.cl-inp'); if(inp) inp.focus();
}
function toggleReact(id, e){
  var m=msgById(id); if(!m) return;
  if(!m.reactions) m.reactions=[];
  var r=null; for(var i=0;i<m.reactions.length;i++){ if(m.reactions[i].e===e){ r=m.reactions[i]; break; } }
  if(r){
    if(r.mine){ r.n--; r.mine=false; if(r.n<=0) m.reactions=m.reactions.filter(function(x){return x!==r;}); }
    else { r.n++; r.mine=true; }
  } else { m.reactions.push({e:e, n:1, mine:true}); }
  _keepScroll=true; render();
}
function openReactPop(btn, id){
  var old=document.querySelector('.react-pop'); if(old) old.remove();
  var stage=document.getElementById('stage');
  var pop=document.createElement('div'); pop.className='react-pop';
  pop.innerHTML=REACT_SET.map(function(e){ return '<button data-e="'+e+'">'+e+'</button>'; }).join('');
  stage.appendChild(pop);
  var br=btn.getBoundingClientRect(), sr=stage.getBoundingClientRect();
  pop.style.left=Math.max(6, Math.min(br.left-sr.left, sr.width-pop.offsetWidth-6))+'px';
  var top=br.top-sr.top-pop.offsetHeight-6;
  if(top<6) top=br.bottom-sr.top+6;
  pop.style.top=top+'px';
  pop.querySelectorAll('button').forEach(function(b){
    b.onclick=function(ev){ ev.stopPropagation(); pop.remove(); toggleReact(id, b.dataset.e); };
  });
  setTimeout(function(){ document.addEventListener('click', function h(){ pop.remove(); document.removeEventListener('click',h); }); },0);
}

// ── карточка-профиль пользователя ──
function openProfile(i){
  var u=USERS[i]; if(!u) return;
  var ov=document.getElementById('csProfile'); if(!ov) return;
  var rc=RANKCOL[u.rank]||'#9fb4c4';
  var dot=u.on?'<span class="udot" style="display:block"></span>':'';
  var linkIc=u.link.type==='tg'?'✈':'🎮';
  ov.innerHTML=
    '<div class="pf-card">'+
      '<div class="pf-cover"></div>'+
      '<button class="pf-x" title="Закрыть">✕</button>'+
      '<div class="pf-av" style="background:linear-gradient(135deg,'+u.av+',#7fe9ff)">'+initial(u.name)+dot+'</div>'+
      '<div class="pf-name'+(u.admin?' admin':'')+'">'+(u.admin?'👑 ':'')+esc(u.name)+'</div>'+
      '<div class="pf-sub">'+esc(u.sub)+' · <span class="pf-rank" style="color:'+rc+';background:'+rc+'22">'+esc(u.rank)+'</span> · '+(u.on?'в сети':'не в сети')+'</div>'+
      '<div class="pf-actions">'+
        '<button class="pf-link '+u.link.type+'" data-link="'+esc(u.link.label)+'">'+linkIc+' '+esc(u.link.label)+'</button>'+
        '<button class="pf-mention" data-i="'+i+'">@ Упомянуть в чате</button>'+
      '</div>'+
    '</div>';
  ov.classList.add('open');
  function close(){ ov.classList.remove('open'); ov.innerHTML=''; }
  ov.querySelector('.pf-x').onclick=close;
  ov.onclick=function(e){ if(e.target===ov) close(); };
  ov.querySelector('.pf-link').onclick=function(){ toast('Открываю '+this.dataset.link+' пользователя @'+u.name+' (демо)'); };
  ov.querySelector('.pf-mention').onclick=function(){ mentionUser(i); close(); };
}

// ── упомянуть юзера: вставить @имя + «засветить» его кнопку чата в рельсе ──
function mentionUser(i){
  var u=USERS[i];
  var inp=document.querySelector('.cl-inp');
  if(inp){ inp.value=(inp.value?inp.value.trim()+' ':'')+'@'+u.name+' '; inp.focus(); }
  lightRail();
  toast('🔔 @'+u.name+' тегнут — у него засветится 💬 в рельсе');
}
function lightRail(){
  _railMentions++;
  var btn=document.querySelector('.site-rail .sr-btn.chat'); if(!btn) return;
  btn.querySelector('.sr-badge').textContent=_railMentions;
  btn.classList.remove('lit'); void btn.offsetWidth; btn.classList.add('lit');
}

// ── шапка: свернуть полосу / сброс ──
document.getElementById('toggleBtn').onclick = function(){
  var s = document.getElementById('settings');
  s.classList.toggle('cfg-min');
  this.textContent = s.classList.contains('cfg-min') ? '▼ Развернуть настройки' : '▲ Свернуть настройки';
};
document.getElementById('resetBtn').onclick = function(){
  S = Object.assign({}, DEFAULTS);
  if(window.__LS) window.__LS.clearSaved();
  buildPanel(); render();
};

// ── старт + память лаба ──
buildPanel();
render();
if(window.LabSettings){
  window.__LS = LabSettings.attach({
    id:'chat', defaults:DEFAULTS, mount:'#labTools', schema:2,
    getState:function(){ return S; },
    apply:function(st){ S=Object.assign({},DEFAULTS,st); buildPanel(); render(); }
  });
}
})();
