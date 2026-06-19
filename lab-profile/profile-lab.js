/* ════════════════════════════════════════════════════════════════
   Песочница «Мой профиль» — редактор слева + живая карточка справа.
   Аватар = сплэш любимого чемпа (он же фон за стеклом).
   Боевой сайт не трогается. Настройки живут через ../lab-settings.js
   ════════════════════════════════════════════════════════════════ */
(function(){
'use strict';

// ─── Чемпионы (демо-ростер WR; имена в формате DDragon) ───
var CHAMPS = ['Ahri','Akali','Akshan','Alistar','Amumu','Annie','Ashe','AurelionSol','Blitzcrank','Brand','Braum','Caitlyn','Camille','Corki','Darius','Diana','DrMundo','Draven','Ekko','Evelynn','Ezreal','Fiora','Fizz','Galio','Garen','Gragas','Graves','Gwen','Hecarim','Heimerdinger','Irelia','Janna','JarvanIV','Jax','Jhin','Jinx','Kaisa','Karma','Katarina','Kayle','Kennen','Khazix','LeeSin','Leona','Lucian','Lulu','Lux','Malphite','MasterYi','MissFortune','Nami','Nasus','Nautilus','Nilah','Nunu','Olaf','Orianna','Pantheon','Pyke','Rammus','Renekton','Rengar','Riven','Senna','Seraphine','Sett','Shen','Singed','Sion','Sona','Soraka','Teemo','Thresh','Tristana','Tryndamere','TwistedFate','Varus','Vayne','Veigar','Vi','Viego','MonkeyKing','Xayah','XinZhao','Yasuo','Yone','Zed','Ziggs','Zoe'];
var DISP = {AurelionSol:'Aurelion Sol',DrMundo:'Dr. Mundo',JarvanIV:'Jarvan IV',Kaisa:"Kai'Sa",Khazix:"Kha'Zix",LeeSin:'Lee Sin',MasterYi:'Master Yi',MissFortune:'Miss Fortune',MonkeyKing:'Wukong',TwistedFate:'Twisted Fate',XinZhao:'Xin Zhao'};
function dispName(id){ return DISP[id] || id; }
function splashUrl(id){ return 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/'+id+'_0.jpg'; }
function loadingUrl(id){ return 'https://ddragon.leagueoflegends.com/cdn/img/champion/loading/'+id+'_0.jpg'; }
function squareUrl(id){ return 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/'+id+'.png'; }

// ─── Роли / Ранги / Соцсети (как на боевом) ───
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
  {id:'youtube', name:'YouTube', bg:'rgba(255,0,0,0.15)', border:'rgba(255,0,0,0.5)', svg:'<svg viewBox="0 0 24 24"><path fill="#FF0000" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z"/></svg>'},
  {id:'twitch', name:'Twitch', bg:'rgba(145,70,255,0.15)', border:'rgba(145,70,255,0.5)', svg:'<svg viewBox="0 0 24 24"><path fill="#9146FF" d="M11.6 5.5H13v4.5h-1.4V5.5zm3.8 0H17v4.5h-1.6V5.5zM2.6 0L0 2.6v18.8h6.3V24l3.8-2.6H14l8.8-8.8V0H2.6zm18.7 12.1l-3.8 3.8H13l-3.4 2.5v-2.5H3.8V1.3h17.5v10.8z"/></svg>'},
  {id:'telegram', name:'Telegram', bg:'rgba(42,171,238,0.15)', border:'rgba(42,171,238,0.5)', svg:'<svg viewBox="0 0 24 24"><path fill="#2AABEE" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.9 8.2-2 9.4c-.1.6-.5.8-1 .5l-2.8-2-1.3 1.3c-.2.2-.4.3-.7.3l.2-2.9 5-4.5c.2-.2 0-.3-.3-.1L6.5 14.6l-2.7-.9c-.6-.2-.6-.6.1-.9l10.5-4c.6-.1 1.1.2.9.8z"/></svg>'},
  {id:'discord', name:'Discord', bg:'rgba(88,101,242,0.15)', border:'rgba(88,101,242,0.5)', svg:'<svg viewBox="0 0 24 24"><path fill="#5865F2" d="M20.3 4.4A19.6 19.6 0 0 0 15.4 3c-.2.4-.5.9-.7 1.3a18.2 18.2 0 0 0-5.4 0C9.1 3.9 8.8 3.4 8.6 3A19.5 19.5 0 0 0 3.7 4.4C.5 9.2-.3 13.9.1 18.5a19.8 19.8 0 0 0 6 3 14.7 14.7 0 0 0 1.3-2 12.8 12.8 0 0 1-2-.9l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4a12.8 12.8 0 0 1-2 1 14.7 14.7 0 0 0 1.3 2 19.7 19.7 0 0 0 6-3c.5-5.2-.8-9.8-3.7-14.1zM8.1 15.7c-1.2 0-2.1-1-2.1-2.3s.9-2.3 2.1-2.3c1.2 0 2.1 1 2.1 2.3s-.9 2.3-2.1 2.3zm7.8 0c-1.2 0-2.1-1-2.1-2.3s.9-2.3 2.1-2.3c1.2 0 2.1 1 2.1 2.3s-.9 2.3-2.1 2.3z"/></svg>'}
];
function socObj(id){ return SOCIALS.find(function(s){return s.id===id;}); }

// ─── Состояние ───
var DEFAULTS = {
  // дизайн (дизайн-полоса)
  layout:'two',          // two | top | form
  cardView:'expanded',   // expanded | compact | banner
  avatarStyle:'rank',    // circle | square | rank
  showRegion:false,
  showBio:true,
  // профиль (данные игрока)
  nick:'ERjanKG',
  avatarChamp:'Lux',
  mainRole:'Mid',
  secondRole:'Support',
  rank:'master',
  region:'Europe',
  bio:'Главный по мете Wild Rift',
  favs:['Ahri','Seraphine','Zoe'],
  socials:[{platform:'youtube',url:'https://youtube.com/@erjankg'},{platform:'twitch',url:'https://twitch.tv/erjankg'}]
};
var S = JSON.parse(JSON.stringify(DEFAULTS));

// ═══════════════════════ ВАРИАНТЫ (дизайн-полоса) ═══════════════════════
var VARIANTS = [
  {key:'layout', label:'Раскладка', opts:[
    {v:'two', n:'2 колонки'}, {v:'top', n:'Превью сверху'}, {v:'form', n:'Только форма'}
  ]},
  {key:'cardView', label:'Вид карточки', opts:[
    {v:'expanded', n:'Расширенная'}, {v:'compact', n:'Компактная'}, {v:'banner', n:'Баннер с артом'}
  ]},
  {key:'avatarStyle', label:'Аватар', opts:[
    {v:'circle', n:'Круг'}, {v:'square', n:'Квадрат'}, {v:'rank', n:'Рамка по рангу'}
  ]},
  {key:'_toggles', label:'Доп. поля', toggles:[
    {k:'showBio', n:'Био'}, {k:'showRegion', n:'Регион'}
  ]}
];

function buildVariantBar(){
  var bar = document.getElementById('variantBar');
  bar.innerHTML = '';
  VARIANTS.forEach(function(g){
    var grp = document.createElement('div'); grp.className='vb-group';
    grp.innerHTML = '<div class="vb-glabel">'+g.label+'</div>';
    var chips = document.createElement('div'); chips.className='vb-chips';
    if(g.toggles){
      g.toggles.forEach(function(t){
        var c = document.createElement('button'); c.className='variant-chip'+(S[t.k]?' active':'');
        c.textContent = t.n;
        c.onclick = function(){ S[t.k]=!S[t.k]; buildVariantBar(); renderPreview(); renderEditor(); };
        chips.appendChild(c);
      });
    } else {
      g.opts.forEach(function(o){
        var c = document.createElement('button'); c.className='variant-chip'+(S[g.key]===o.v?' active':'');
        c.textContent = o.n;
        c.onclick = function(){ S[g.key]=o.v; buildVariantBar(); applyLayout(); renderPreview(); renderEditor(); };
        chips.appendChild(c);
      });
    }
    grp.appendChild(chips); bar.appendChild(grp);
  });
}

// ═══════════════════════ ГЛОБАЛЬНЫЕ СТИЛИ ═══════════════════════
function applyGlobals(){
  var rk = rankObj(S.rank);
  document.documentElement.style.setProperty('--rank-color', rk?rk.color:'#9B59B6');
  document.documentElement.style.setProperty('--splash', "url('"+splashUrl(S.avatarChamp)+"')");
}
function applyLayout(){
  var main = document.getElementById('labMain');
  main.className = 'lab-main' + (S.layout==='top'?' layout-top': S.layout==='form'?' layout-form':'');
}

// ═══════════════════════ РЕДАКТОР ═══════════════════════
function renderEditor(){
  applyGlobals();
  var el = document.getElementById('editor');
  var avImg = loadingUrl(S.avatarChamp);
  var h = '';

  // Аватар + ник
  h += '<div class="ed-sec"><div class="ed-label">Аватар <span class="hintdot">сплэш любимого чемпа = фон за стеклом</span></div>';
  h += '<div class="av-row"><div class="av-box av-'+S.avatarStyle+'"><img src="'+avImg+'" alt="" onerror="this.style.display=\'none\';this.parentNode.textContent=\''+(S.nick.charAt(0)||'?')+'\'"></div>';
  h += '<div class="av-actions"><button class="btn-soft" data-act="avatar">🖼 Сменить чемпа</button><span style="font-size:11px;color:rgba(230,243,251,.4)">'+dispName(S.avatarChamp)+'</span></div></div></div>';

  // Ник
  h += '<div class="ed-sec"><div class="ed-label">Ник</div><input class="ed-nick" id="edNick" maxlength="24" value="'+escAttr(S.nick)+'"></div>';

  // Роли
  h += '<div class="ed-sec"><div class="ed-label">Роли <span class="hintdot">основная крупнее, вторая — поменьше справа</span></div>';
  h += '<div class="roles-flex"><div class="roles-col role-main"><div class="sub">ОСНОВНАЯ</div><div class="role-set">';
  ROLES.forEach(function(r){
    h += '<button class="role-btn'+(S.mainRole===r.id?' on':'')+'" data-mrole="'+r.id+'"><img src="'+r.img+'" alt=""><span>'+r.id+'</span></button>';
  });
  h += '</div></div><div class="roles-col role-second"><div class="sub">ВТОРАЯ <span style="opacity:.6">(можно снять)</span></div><div class="role-set">';
  ROLES.forEach(function(r){
    h += '<button class="role-btn clearable'+(S.secondRole===r.id?' on':'')+'" data-srole="'+r.id+'"><img src="'+r.img+'" alt=""><span>'+r.id+'</span></button>';
  });
  h += '</div></div></div></div>';

  // Ранг
  h += '<div class="ed-sec"><div class="ed-label">Максимальный ранг</div><div class="rank-grid">';
  RANKS.forEach(function(rk){
    var on = S.rank===rk.id;
    h += '<button class="rank-btn'+(on?' on':'')+'" data-rank="'+rk.id+'" style="'+(on?'border-color:'+rk.color+';background:'+rk.color+'1e;box-shadow:0 0 12px '+rk.color+'55;color:'+rk.color:'')+'"><img src="'+rk.img+'" alt=""><span>'+rk.name+'</span></button>';
  });
  h += '</div></div>';

  // Любимые чемпы
  h += '<div class="ed-sec"><div class="ed-label">Любимые чемпионы <span class="hintdot">до 5</span></div><div class="fav-row">';
  S.favs.forEach(function(id){
    h += '<div class="fav-chip"><img src="'+squareUrl(id)+'" alt="'+dispName(id)+'" title="'+dispName(id)+'" onerror="this.style.opacity=.2"><button class="x" data-unfav="'+id+'">✕</button></div>';
  });
  if(S.favs.length < 5) h += '<button class="fav-add" data-act="fav">+</button>';
  h += '</div></div>';

  // Био (если включено)
  if(S.showBio){
    h += '<div class="ed-sec"><div class="ed-label">О себе</div><input class="ed-input" id="edBio" maxlength="60" placeholder="Короткий статус…" value="'+escAttr(S.bio)+'"></div>';
  }
  // Регион (если включено)
  if(S.showRegion){
    h += '<div class="ed-sec"><div class="ed-label">Регион / сервер</div><input class="ed-input" id="edRegion" maxlength="24" placeholder="Например: Europe" value="'+escAttr(S.region)+'"></div>';
  }

  // Соцсети
  h += '<div class="ed-sec"><div class="ed-label">Социальные сети</div><div class="soc-list">';
  if(!S.socials.length) h += '<div style="font-size:12px;color:rgba(230,243,251,.3)">Пока нет ссылок</div>';
  S.socials.forEach(function(lk, i){
    var p = socObj(lk.platform); if(!p) return;
    h += '<div class="soc-item"><span class="ic">'+p.svg+'</span><span class="url">'+escHtml(lk.url||p.name)+'</span><button class="del" data-delsoc="'+i+'">✕</button></div>';
  });
  h += '</div><div class="soc-add"><select id="socPlat">'+SOCIALS.map(function(p){return '<option value="'+p.id+'">'+p.name+'</option>';}).join('')+'</select><input class="ed-input" id="socUrl" placeholder="https://…"><button class="btn-soft" data-act="addsoc">＋</button></div></div>';

  el.innerHTML = h;
  wireEditor();
}

function wireEditor(){
  var el = document.getElementById('editor');
  // ник / био / регион
  var nick = document.getElementById('edNick');
  if(nick) nick.oninput = function(){ S.nick=this.value; renderPreview(); };
  var bio = document.getElementById('edBio');
  if(bio) bio.oninput = function(){ S.bio=this.value; renderPreview(); };
  var reg = document.getElementById('edRegion');
  if(reg) reg.oninput = function(){ S.region=this.value; renderPreview(); };

  el.querySelectorAll('[data-mrole]').forEach(function(b){
    b.onclick = function(){ S.mainRole=this.getAttribute('data-mrole'); renderEditor(); renderPreview(); };
  });
  el.querySelectorAll('[data-srole]').forEach(function(b){
    b.onclick = function(){ var r=this.getAttribute('data-srole'); S.secondRole = (S.secondRole===r? '' : r); renderEditor(); renderPreview(); };
  });
  el.querySelectorAll('[data-rank]').forEach(function(b){
    b.onclick = function(){ S.rank=this.getAttribute('data-rank'); renderEditor(); renderPreview(); };
  });
  el.querySelectorAll('[data-unfav]').forEach(function(b){
    b.onclick = function(){ var id=this.getAttribute('data-unfav'); S.favs=S.favs.filter(function(x){return x!==id;}); renderEditor(); renderPreview(); };
  });
  el.querySelectorAll('[data-delsoc]').forEach(function(b){
    b.onclick = function(){ var i=+this.getAttribute('data-delsoc'); S.socials.splice(i,1); renderEditor(); renderPreview(); };
  });
  var avBtn = el.querySelector('[data-act="avatar"]');
  if(avBtn) avBtn.onclick = function(){ openPicker('avatar'); };
  var favBtn = el.querySelector('[data-act="fav"]');
  if(favBtn) favBtn.onclick = function(){ openPicker('fav'); };
  var addSoc = el.querySelector('[data-act="addsoc"]');
  if(addSoc) addSoc.onclick = function(){
    var plat=document.getElementById('socPlat').value;
    var url=document.getElementById('socUrl').value.trim();
    if(!url) return;
    S.socials.push({platform:plat, url:url});
    renderEditor(); renderPreview();
  };
}

// ═══════════════════════ ПРЕВЬЮ-КАРТОЧКА ═══════════════════════
function renderPreview(){
  applyGlobals();
  var card = document.getElementById('previewCard');
  card.className = 'preview-card glassy view-'+S.cardView;
  var rk = rankObj(S.rank);
  var showArt = (S.cardView==='banner');
  var avImg = loadingUrl(S.avatarChamp);
  var h = '';

  // Баннер-шапка
  h += '<div class="pc-banner'+(showArt?' has-art':'')+'">';
  if(showArt) h += '<div class="pc-art" style="background-image:url('+splashUrl(S.avatarChamp)+')"></div>';
  h += '<div class="pc-av av-'+S.avatarStyle+'"><img src="'+avImg+'" alt="" onerror="this.style.display=\'none\';this.parentNode.textContent=\''+(S.nick.charAt(0)||'?')+'\'"></div>';
  h += '<div class="pc-nick">'+escHtml(S.nick||'Без имени')+'</div>';
  if(S.showBio && S.bio) h += '<div class="pc-bio">'+escHtml(S.bio)+'</div>';
  if(S.showRegion && S.region) h += '<div class="pc-region">📍 '+escHtml(S.region)+'</div>';

  // Бейджи (ТОЛЬКО иконки, без подписей): основная роль крупнее, вторая меньше справа, потом ранг
  h += '<div class="pc-badges">';
  if(S.mainRole) h += '<span class="pc-badge role-main" title="'+S.mainRole+'"><img src="'+roleImg(S.mainRole)+'" alt="'+S.mainRole+'"></span>';
  if(S.secondRole) h += '<span class="pc-badge role-second" title="'+S.secondRole+'"><img src="'+roleImg(S.secondRole)+'" alt="'+S.secondRole+'"></span>';
  if(rk) h += '<span class="pc-badge rankb" title="'+rk.name+'"><img src="'+rk.img+'" alt="'+rk.name+'"></span>';
  h += '</div></div>';

  // Тело (фавориты + соцсети) — скрыто в компактном виде
  h += '<div class="pc-body">';
  if(S.favs.length){
    h += '<div class="pc-block"><div class="pc-block-h">Любимые чемпионы</div><div class="pc-favs">';
    S.favs.forEach(function(id){ h += '<img src="'+squareUrl(id)+'" alt="'+dispName(id)+'" title="'+dispName(id)+'" onerror="this.style.opacity=.2">'; });
    h += '</div></div>';
  }
  if(S.socials.length){
    h += '<div class="pc-block"><div class="pc-block-h">Соцсети</div><div class="pc-socials">';
    S.socials.forEach(function(lk){
      var p=socObj(lk.platform); if(!p) return;
      h += '<div class="pc-soc" title="'+p.name+'" style="background:'+p.bg+';border:1px solid '+p.border+'">'+p.svg+'</div>';
    });
    h += '</div></div>';
  }
  h += '</div>';

  card.innerHTML = h;
}

// ═══════════════════════ ПИКЕР ЧЕМПИОНОВ ═══════════════════════
var _pickMode = null; // 'avatar' | 'fav'
var _pickSel = [];
function openPicker(mode){
  _pickMode = mode;
  _pickSel = (mode==='avatar') ? [S.avatarChamp] : S.favs.slice();
  document.getElementById('cpTitle').textContent = (mode==='avatar') ? 'Аватар — выбери чемпа' : 'Любимые чемпионы (до 5)';
  document.getElementById('cpSearch').value='';
  document.getElementById('champPicker').hidden = false;
  buildPickerGrid('');
  updatePickHint();
  document.getElementById('cpSearch').focus();
}
function closePicker(){ document.getElementById('champPicker').hidden = true; _pickMode=null; }
function buildPickerGrid(q){
  q = (q||'').toLowerCase();
  var grid = document.getElementById('cpGrid');
  var list = CHAMPS.filter(function(id){ return dispName(id).toLowerCase().indexOf(q)>=0; });
  grid.innerHTML = list.map(function(id){
    var sel = _pickSel.indexOf(id)>=0;
    return '<div class="cp-cell'+(sel?' sel':'')+'" data-ch="'+id+'"><img src="'+squareUrl(id)+'" alt="" loading="lazy" onerror="this.style.opacity=.15"><div class="tick">✓</div><div class="nm">'+dispName(id)+'</div></div>';
  }).join('');
  grid.querySelectorAll('[data-ch]').forEach(function(c){
    c.onclick = function(){ pickToggle(this.getAttribute('data-ch')); };
  });
}
function pickToggle(id){
  if(_pickMode==='avatar'){
    _pickSel = [id];
    S.avatarChamp = id;
    closePicker(); renderEditor(); renderPreview();
    return;
  }
  // fav (multi, max 5)
  var i = _pickSel.indexOf(id);
  if(i>=0) _pickSel.splice(i,1);
  else { if(_pickSel.length>=5) return; _pickSel.push(id); }
  buildPickerGrid(document.getElementById('cpSearch').value);
  updatePickHint();
}
function updatePickHint(){
  var hint = document.getElementById('cpHint');
  hint.textContent = (_pickMode==='avatar') ? 'Клик по чемпу — сразу применится' : 'Выбрано '+_pickSel.length+' / 5';
}

// ═══════════════════════ УТИЛИТЫ ═══════════════════════
function escHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escAttr(s){ return escHtml(s).replace(/"/g,'&quot;'); }

// ═══════════════════════ СТАРТ ═══════════════════════
function renderAll(){ buildVariantBar(); applyLayout(); renderEditor(); renderPreview(); }
renderAll();

// пикер: поиск / закрытие / готово
document.getElementById('cpSearch').oninput = function(){ buildPickerGrid(this.value); };
document.getElementById('cpClose').onclick = closePicker;
document.getElementById('cpDone').onclick = function(){
  if(_pickMode==='fav'){ S.favs = _pickSel.slice(); renderEditor(); renderPreview(); }
  closePicker();
};
document.getElementById('champPicker').onclick = function(e){ if(e.target===this) closePicker(); };
document.addEventListener('keydown', function(e){ if(e.key==='Escape' && !document.getElementById('champPicker').hidden) closePicker(); });

// сброс
document.getElementById('resetBtn').onclick = function(){
  if(LS) LS.clearSaved();
  S = JSON.parse(JSON.stringify(DEFAULTS));
  renderAll();
};

// память лаба
var LS = LabSettings.attach({
  id:'profile', defaults:DEFAULTS, mount:'#labTools',
  getState:function(){ return S; },
  apply:function(st){ S = Object.assign({}, JSON.parse(JSON.stringify(DEFAULTS)), st); renderAll(); }
});

})();
