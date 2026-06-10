/* ══════════════════════════════════════════════════════════
   MAIN-LAB · песочница главного экрана (v3)
   ══════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  /* ── Темы (все с тонким рельсом слева + вкладками + карточкой справа) ── */
  const LAYOUTS = [
    {id:'base', n:'Базовый', d:'Тонкий рельс + вкладки + карточка чемпа справа', pic:'base'},
  ];

  /* ── Виды (вкладки в шапке) ── */
  const VIEWS = [
    {v:'stats',   t:'Статы',        ic:'📊'},
    {v:'wrpr',    t:'WinRate',      ic:'🏆'},
    {v:'hub',     t:'Мета-хаб',     ic:'🧩'},
    {v:'tier',    t:'Тир-лист',     ic:'🎖'},
    {v:'patch',   t:'Патч',         ic:'📰'},
    {v:'tactics', t:'Тактич. доска',ic:'🗺'},
  ];

  /* ── Категории-сегменты ── */
  const HLITE=[
    {v:'white', t:'Бело-стекло'},
    {v:'accent',t:'Акцент'},
    {v:'gold',  t:'Золото'},
    {v:'grad',  t:'Градиент'},
    {v:'edge',  t:'Неон-кант'},
    {v:'frost', t:'Заморозка'},
  ];
  const OPTS = {
    menufx:{label:'Открытие меню (профиль/админ)', val:'dim', items:[
      {v:'none', t:'Нет'},
      {v:'dim',  t:'Затемнение'},
      {v:'blur', t:'Блюр фона'},
    ]},
    menuanim:{label:'Анимация меню (из кнопки)', val:'genie', items:[
      {v:'genie',  t:'Джинн (плавно)'},
      {v:'pop',    t:'Пружина'},
      {v:'unfold', t:'Разворот'},
      {v:'zoom',   t:'Зум (быстро)'},
      {v:'drop',   t:'Падение'},
      {v:'flip',   t:'Флип 3D'},
      {v:'fade',   t:'Фейд'},
    ]},
    srowh:{label:'Статы · ховер строки',     val:'white',  items:HLITE},
    srows:{label:'Статы · выбранная строка', val:'accent', items:HLITE},
    scolh:{label:'Статы · ховер столбца',    val:'white',  items:HLITE},
    scols:{label:'Статы · выбранный столбец',val:'accent', items:HLITE},
    wrowh:{label:'WinRate · ховер строки',     val:'white',  items:HLITE},
    wrows:{label:'WinRate · выбранная строка', val:'accent', items:HLITE},
    splashart:{label:'Арт фона (сплэш)', val:'lux', items:[
      {v:'lux',    t:'Lux'},
      {v:'thresh', t:'Thresh'},
      {v:'ahri',   t:'Ahri'},
      {v:'yasuo',  t:'Yasuo'},
      {v:'jinx',   t:'Jinx'},
      {v:'brand',  t:'Бренд'},
    ]},
    glasstint:{label:'СТЕКЛО — оттенок', val:'neutral', items:[
      {v:'neutral', t:'Нейтр.'},
      {v:'accent',  t:'Акцент'},
      {v:'warm',    t:'Тёплое'},
      {v:'cool',    t:'Холодное'},
    ]},
  };

  /* Пользовательские настройки — ВНУТРИ «Мой профиль → Настройки» (на боевом — настройка юзера) */
  const PROFOPTS = {
    glasspow:{label:'Сила стекла', items:[{v:'light',t:'Лёгкое'},{v:'mid',t:'Среднее'},{v:'strong',t:'Сильное'},{v:'ultra',t:'Экстрим'}]},
    density:{label:'Плотность таблиц', items:[{v:'cozy',t:'Просторно'},{v:'normal',t:'Средне'},{v:'dense',t:'Плотно'}]},
    tblfont:{label:'Шрифт таблиц', items:[{v:'small',t:'Мелкий'},{v:'medium',t:'Средний'},{v:'large',t:'Крупный'}]},
    glow:{label:'Сила свечения', items:[{v:'off',t:'Выкл'},{v:'soft',t:'Лёгкое'},{v:'strong',t:'Сочное'}]},
    radius:{label:'Скругление углов', items:[{v:'sharp',t:'Острые'},{v:'medium',t:'Средние'},{v:'round',t:'Круглые'}]},
  };

  /* Параметры тир-листа — ВНУТРИ вида (не в верхней панели) */
  const TIEROPTS = {
    tlayout:{label:'Раскладка', items:[{v:'rows',t:'Ряды'},{v:'cols',t:'Колонки'}]},
    tpool:{label:'Пул', items:[{v:'bottom',t:'Снизу'},{v:'side',t:'Сбоку'}]},
    tsize:{label:'Размер в тирах', items:[{v:'s',t:'S'},{v:'m',t:'M'},{v:'l',t:'L'}]},
    psize:{label:'Размер в пуле', items:[{v:'s',t:'S'},{v:'m',t:'M'},{v:'l',t:'L'}]},
  };

  const SPLASHES = {
    lux:   "url('https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Lux_0.jpg')",
    thresh:"url('https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Thresh_0.jpg')",
    ahri:  "url('https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ahri_0.jpg')",
    yasuo: "url('https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Yasuo_0.jpg')",
    jinx:  "url('https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Jinx_0.jpg')",
    brand: "radial-gradient(ellipse at 28% 18%,rgba(11,196,227,.38),transparent 55%),radial-gradient(ellipse at 78% 82%,rgba(200,155,60,.30),transparent 55%),linear-gradient(135deg,#02121f,#0a0617)",
  };
  const BG_COLORS = [
    {hex:'#01070e', t:'Почти чёрный'},
    {hex:'#04121f', t:'Тёмно-синий'},
    {hex:'#0a0617', t:'Тёмно-фиолет'},
    {hex:'#06140f', t:'Тёмно-зелёный'},
    {hex:'#16060b', t:'Тёмно-красный'},
    {hex:'#0d0d12', t:'Графит'},
  ];
  const ACCENTS = [
    {rgb:'11,196,227',  hex:'#0BC4E3', t:'Циан (сайт)'},
    {rgb:'200,155,60',  hex:'#C89B3C', t:'Золото'},
    {rgb:'180,140,255', hex:'#B48CFF', t:'Фиолет'},
    {rgb:'46,204,113',  hex:'#2ECC71', t:'Зелёный'},
    {rgb:'231,76,60',   hex:'#E74C3C', t:'Красный'},
    {rgb:'255,99,164',  hex:'#FF63A4', t:'Розовый'},
  ];

  /* ── Мок-данные ── */
  const SIDE = [
    {ic:'👥', t:'Чемпионы', active:true},{ic:'⚔', t:'Калькулятор урона'},
    {ic:'📦', t:'Предметы'},{ic:'💎', t:'Руны'},{ic:'📋', t:'Драфтер'},
    {ic:'💬', t:'Чат'},{ic:'🏆', t:'Киберспорт'},
  ];
  const COLS = [
    {k:'ad',t:'AD',ic:'🗡',sorted:true},{k:'hp',t:'HP',ic:'➕'},{k:'mana',t:'Mana',ic:'💧'},
    {k:'ar',t:'AR',ic:'🛡'},{k:'mr',t:'MR',ic:'✦'},{k:'rng',t:'RNG',ic:'⊘'},
  ];
  const CH = [
    {n:'Garen',   g:'linear-gradient(135deg,#4aa3ff,#103a6e)', i:'G', ad:108,hp:1920,mana:'0',  ar:95,mr:58,rng:1, wr:54.8,pr:16,br:9, tier:'s', role:'Соло'},
    {n:'Camille', g:'linear-gradient(135deg,#c0c0c0,#5a5a6e)', i:'C', ad:103,hp:1842,mana:687,  ar:88,mr:56,rng:1, wr:49.1,pr:9, br:38,tier:'s', role:'Соло'},
    {n:'Aatrox',  g:'linear-gradient(135deg,#e74c3c,#7a1d12)', i:'A', ad:112,hp:1854,mana:'0',  ar:91,mr:61,rng:1, wr:52.4,pr:14,br:22,tier:'a', role:'Соло'},
    {n:'Ambessa', g:'linear-gradient(135deg,#d4760a,#7a3d05)', i:'Am',ad:99, hp:1740,mana:'NRG',ar:84,mr:54,rng:1, wr:47.8,pr:18,br:12,tier:'a', role:'Лес'},
    {n:'Akali',   g:'linear-gradient(135deg,#27c4a8,#0a4a40)', i:'Ak',ad:97, hp:1701,mana:'NRG',ar:79,mr:52,rng:1, wr:50.2,pr:13,br:16,tier:'a', role:'Мид'},
    {n:'Amumu',   g:'linear-gradient(135deg,#2ecc71,#145a32)', i:'Am',ad:85, hp:1626,mana:975,  ar:82,mr:56,rng:1, wr:53.6,pr:11,br:5, tier:'b', role:'Лес'},
    {n:'Ahri',    g:'linear-gradient(135deg,#ff63a4,#7a1d4a)', i:'Ah',ad:74, hp:1588,mana:892,  ar:68,mr:50,rng:2, wr:51.0,pr:12,br:7, tier:'b', role:'Мид'},
    {n:'Lux',     g:'linear-gradient(135deg,#ffe06b,#7a6010)', i:'L', ad:71, hp:1540,mana:1015, ar:64,mr:48,rng:2, wr:48.3,pr:10,br:4, tier:'c', role:'Мид'},
  ];
  const ch = name => CH.find(c=>c.n===name);
  /* тренд WR vs прошлый патч + генератор мини-спарклайна (новая фича) */
  const TREND = {Garen:1.4, Camille:-0.9, Aatrox:0.5, Ambessa:-1.7, Akali:0.3, Amumu:1.0, Ahri:-0.4, Lux:-0.7};
  function sparkPts(wr,tr){
    const base=wr-tr, vals=[base-1.1,base+0.5,base-0.7,base+0.9,base-0.2,wr];
    const mn=Math.min(...vals),mx=Math.max(...vals),rg=(mx-mn)||1;
    return vals.map((v,i)=>`${i*12},${(17-((v-mn)/rg)*14).toFixed(1)}`).join(' ');
  }
  const PATCH = [
    {n:'Garen',type:'buff',t:'Базовый урон Q +8%, восстановление HP усилено'},
    {n:'Camille',type:'nerf',t:'Щит пассивки −10%, перезарядка W +2с'},
    {n:'Ambessa',type:'new',t:'Новый чемпион добавлен в Wild Rift'},
    {n:'Ahri',type:'adjust',t:'Дальность E увеличена, урон ульты снижен'},
    {n:'Amumu',type:'buff',t:'Базовое HP +40, броня за уровень +1.5'},
    {n:'Lux',type:'nerf',t:'Радиус E уменьшен на 5%'},
  ];
  const PBADGE={buff:{t:'▲ БАФ',c:'buff'},nerf:{t:'▼ НЕРФ',c:'nerf'},new:{t:'✦ НОВЫЙ',c:'new'},adjust:{t:'⚙ ПРАВКА',c:'adjust'}};

  /* ── Тир-мейкер: чемпы для пула (перенос из tier-layout-lab) ── */
  const TIERKEYS=['S+','S','A','B','C','D'];
  const TIERCOLORS={'S+':'#FF3A3A','S':'#C43A3A','A':'#C46A1C','B':'#BC9800','C':'#1E8848','D':'#555566'};
  const TIERCH=[
    {n:'Aatrox',i:'A', g:'linear-gradient(135deg,#e74c3c,#7a1d12)'},
    {n:'Ahri',  i:'Ah',g:'linear-gradient(135deg,#ff63a4,#7a1d4a)'},
    {n:'Akali', i:'Ak',g:'linear-gradient(135deg,#27c4a8,#0a4a40)'},
    {n:'Ashe',  i:'As',g:'linear-gradient(135deg,#7ec8e3,#1a4a66)'},
    {n:'Camille',i:'C',g:'linear-gradient(135deg,#c0c0c0,#5a5a6e)'},
    {n:'Darius',i:'D', g:'linear-gradient(135deg,#b03030,#3a0a0a)'},
    {n:'Ezreal',i:'E', g:'linear-gradient(135deg,#f3d65a,#7a5a10)'},
    {n:'Garen', i:'G', g:'linear-gradient(135deg,#4aa3ff,#103a6e)'},
    {n:'Jhin',  i:'J', g:'linear-gradient(135deg,#d44a6a,#3a0a1a)'},
    {n:'Jinx',  i:'Jx',g:'linear-gradient(135deg,#ff7ac0,#5a1a6e)'},
    {n:'Katarina',i:'K',g:'linear-gradient(135deg,#e0506a,#5a0a1a)'},
    {n:'Leona', i:'L', g:'linear-gradient(135deg,#f0b84a,#7a4a10)'},
    {n:'Lux',   i:'Lx',g:'linear-gradient(135deg,#ffe06b,#7a6010)'},
    {n:'Malphite',i:'M',g:'linear-gradient(135deg,#7ac0a0,#1a4a3a)'},
    {n:'Nasus', i:'N', g:'linear-gradient(135deg,#d4a050,#5a3a10)'},
    {n:'Riven', i:'R', g:'linear-gradient(135deg,#7ab0d0,#2a4a6e)'},
    {n:'Sett',  i:'S', g:'linear-gradient(135deg,#e06a6a,#5a1a1a)'},
    {n:'Yasuo', i:'Y', g:'linear-gradient(135deg,#6ab0c0,#1a3a4a)'},
  ];
  const TIERMAP=Object.fromEntries(TIERCH.map(c=>[c.n,c]));
  let tierPlacement=null;
  function tierInit(){ tierPlacement={pool:TIERCH.map(c=>c.n)}; TIERKEYS.forEach(k=>tierPlacement[k]=[]); }

  /* ── Состояние ── */
  const S = {
    layout:'base', view:'hub', selRow:0,
    switcher:'glass', level:'chipdrag', tbl:'cards', anim:'slide', density:'normal', bg:'splash',
    srowh:'white', srows:'accent', scolh:'white', scols:'accent', wrowh:'white', wrows:'accent', menufx:'dim', menuanim:'genie',
    rail:'float', railanim:'fade', railbtn:'minimal', railact:'border',
    radius:'medium', glow:'soft', tblfont:'medium', island:true, thstyle:'glass',
    tlayout:'rows', tpool:'bottom', tsize:'m', psize:'m', tierOpen:false,
    speed:1.5, accent:ACCENTS[0].rgb, accent2:'200,155,60', gpos:62, gang:135,
    bg1:'#04121f', bg2:'#01070e', bgpos:60, bgang:160,
    wrpull:80, rightpanel:true, winloss:true, wrtrend:false,
    glass:true, glasspow:'mid', glasstint:'neutral', glasssat:'norm', glassborder:'thin', glassnoise:false, parallax:false, splashart:'lux',
  };

  const $ = s => document.querySelector(s);
  const frame = $('#mlFrame');
  const toast = $('#mlToast');
  let toastT;
  const root = document.documentElement;
  let selChamp = CH[0];

  /* ══════════════ CONTROLS ══════════════ */
  function buildControls(){
    const c = $('#mlControls');
    let h = '';
    for(const key of Object.keys(OPTS)){
      const o = OPTS[key]; const nu=o.neu;
      h += `<div class="ml-group${nu?' ml-group--new':''}"><span class="ml-glabel${nu?' ml-glabel--new':''}">${nu?'🆕 ':''}${o.label}</span><div class="ml-seg" data-opt="${key}">`;
      h += o.items.map(it=>`<button data-v="${it.v}" class="${it.v===S[key]?'on':''}">${it.t}</button>`).join('');
      h += `</div></div>`;
    }
    // тумблеры
    h += `<div class="ml-group"><span class="ml-glabel">Доп.</span><div style="display:flex;gap:14px;align-items:center;height:34px;">
      <label class="ml-check"><input type="checkbox" id="mlRP" checked> Правая панель</label>
      <label class="ml-check"><input type="checkbox" id="mlWL" checked> Цвет побед/пораж.</label>
      <label class="ml-check"><input type="checkbox" id="mlISL" ${S.island?'checked':''}> Островной стиль</label></div></div>`;
    h += `<div class="ml-group"><span class="ml-glabel">СТЕКЛО (glassmorphism)</span><div style="display:flex;gap:14px;align-items:center;height:34px;">
      <label class="ml-check"><input type="checkbox" id="mlGlass" ${S.glass?'checked':''}> Стекло вкл</label>
      <label class="ml-check"><input type="checkbox" id="mlGlassNoise"> Зерно/шум</label>
      <label class="ml-check"><input type="checkbox" id="mlParallax"> Параллакс фона</label></div></div>`;
    h += `<div class="ml-group ml-group--new"><span class="ml-glabel ml-glabel--new">🆕 НОВЫЕ ФИЧИ (по ресёрчу)</span><div style="display:flex;gap:14px;align-items:center;height:34px;">
      <label class="ml-check"><input type="checkbox" id="mlWrTrend"> WR-тренд + спарклайн</label></div></div>`;
    // ползунки
    h += `<div class="ml-group"><span class="ml-glabel">Скорость</span><div class="ml-speed"><input id="mlSpeed" type="range" min="0.3" max="2" step="0.1" value="${S.speed}"><span id="mlSpeedVal">${S.speed.toFixed(1)}×</span></div></div>`;
    h += `<div class="ml-group"><span class="ml-glabel">Баланс градиента</span><div class="ml-speed"><input id="mlGpos" type="range" min="5" max="95" step="1" value="${S.gpos}"><span id="mlGposVal">${S.gpos}%</span></div></div>`;
    h += `<div class="ml-group"><span class="ml-glabel">Угол градиента</span><div class="ml-speed"><input id="mlGang" type="range" min="0" max="360" step="5" value="${S.gang}"><span id="mlGangVal">${S.gang}°</span></div></div>`;
    h += `<div class="ml-group"><span class="ml-glabel">Приближение WR</span><div class="ml-speed"><input id="mlWR" type="range" min="0" max="100" step="1" value="${S.wrpull}"><span id="mlWRVal">${S.wrpull}</span></div></div>`;
    // цвета
    h += `<div class="ml-group"><span class="ml-glabel">Акцент (1-й)</span><div class="ml-swatches" id="mlSw">`;
    h += ACCENTS.map(a=>`<span class="ml-sw ${a.rgb===S.accent?'on':''}" data-rgb="${a.rgb}" style="background:${a.hex}" title="${a.t}"></span>`).join('');
    h += `<label class="ml-custom"><input type="color" id="mlCustom" value="#0bc4e3"></label></div></div>`;
    h += `<div class="ml-group"><span class="ml-glabel">Градиент (2-й)</span><div class="ml-swatches" id="mlSw2">`;
    h += ACCENTS.map(a=>`<span class="ml-sw ${a.rgb===S.accent2?'on':''}" data-rgb="${a.rgb}" style="background:${a.hex}" title="${a.t}"></span>`).join('');
    h += `<label class="ml-custom"><input type="color" id="mlCustom2" value="#c89b3c"></label></div></div>`;
    h += `<div class="ml-group"><span class="ml-glabel">Фон (1-й)</span><div class="ml-swatches" id="mlBg1">`;
    h += BG_COLORS.map(c=>`<span class="ml-sw ${c.hex===S.bg1?'on':''}" data-hex="${c.hex}" style="background:${c.hex}" title="${c.t}"></span>`).join('');
    h += `<label class="ml-custom"><input type="color" id="mlBg1c" value="${S.bg1}"></label></div></div>`;
    h += `<div class="ml-group"><span class="ml-glabel">Фон (2-й)</span><div class="ml-swatches" id="mlBg2">`;
    h += BG_COLORS.map(c=>`<span class="ml-sw ${c.hex===S.bg2?'on':''}" data-hex="${c.hex}" style="background:${c.hex}" title="${c.t}"></span>`).join('');
    h += `<label class="ml-custom"><input type="color" id="mlBg2c" value="${S.bg2}"></label></div></div>`;
    h += `<div class="ml-group"><span class="ml-glabel">Баланс фона</span><div class="ml-speed"><input id="mlBgPos" type="range" min="5" max="95" step="1" value="${S.bgpos}"><span id="mlBgPosVal">${S.bgpos}%</span></div></div>`;
    h += `<div class="ml-group"><span class="ml-glabel">Угол фона</span><div class="ml-speed"><input id="mlBgAng" type="range" min="0" max="360" step="5" value="${S.bgang}"><span id="mlBgAngVal">${S.bgang}°</span></div></div>`;
    // действия
    h += `<div class="ml-group"><span class="ml-glabel">&nbsp;</span><div style="display:flex;gap:10px;">
      <button class="ml-copy" id="mlReplay">↻ Проиграть</button><button class="ml-copy" id="mlCopy">⧉ Конфиг</button></div></div>`;
    c.innerHTML = h;

    c.querySelectorAll('.ml-seg').forEach(seg=>{
      const key = seg.dataset.opt;
      seg.querySelectorAll('button').forEach(b=>{
        b.onclick = ()=>{
          S[key] = b.dataset.v;
          seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
          applyAttrs();
          if(key==='level') renderCentral();
          if(['anim','hover','tbl','density'].includes(key)) replay();
        };
      });
    });
    const sl=(id,fn)=>{ $('#'+id).oninput=e=>fn(+e.target.value,e.target); };
    sl('mlSpeed',v=>{S.speed=v;$('#mlSpeedVal').textContent=v.toFixed(1)+'×';root.style.setProperty('--spd',v);});
    sl('mlGpos',v=>{S.gpos=v;$('#mlGposVal').textContent=v+'%';root.style.setProperty('--g-pos',v+'%');});
    sl('mlGang',v=>{S.gang=v;$('#mlGangVal').textContent=v+'°';root.style.setProperty('--g-ang',v+'deg');});
    sl('mlWR',v=>{S.wrpull=v;$('#mlWRVal').textContent=v;applyWR();});
    $('#mlRP').onchange=e=>{S.rightpanel=e.target.checked;renderCentral();};
    $('#mlWL').onchange=e=>{S.winloss=e.target.checked;applyAttrs();};
    $('#mlISL').onchange=e=>{S.island=e.target.checked;applyAttrs();};
    $('#mlGlass').onchange=e=>{S.glass=e.target.checked;applyAttrs();};
    $('#mlGlassNoise').onchange=e=>{S.glassnoise=e.target.checked;applyAttrs();};
    $('#mlParallax').onchange=e=>{S.parallax=e.target.checked;applyAttrs();};
    $('#mlWrTrend').onchange=e=>{S.wrtrend=e.target.checked;applyAttrs();};
    $('#mlBg1').querySelectorAll('.ml-sw').forEach(sw=>sw.onclick=()=>{setBg1(sw.dataset.hex);mark('#mlBg1',sw);});
    $('#mlBg1c').oninput=e=>{setBg1(e.target.value);mark('#mlBg1',null);};
    $('#mlBg2').querySelectorAll('.ml-sw').forEach(sw=>sw.onclick=()=>{setBg2(sw.dataset.hex);mark('#mlBg2',sw);});
    $('#mlBg2c').oninput=e=>{setBg2(e.target.value);mark('#mlBg2',null);};
    sl('mlBgPos',v=>{S.bgpos=v;$('#mlBgPosVal').textContent=v+'%';root.style.setProperty('--bg-pos',v+'%');});
    sl('mlBgAng',v=>{S.bgang=v;$('#mlBgAngVal').textContent=v+'°';root.style.setProperty('--bg-ang',v+'deg');});
    $('#mlSw').querySelectorAll('.ml-sw').forEach(sw=>sw.onclick=()=>{setAccent(sw.dataset.rgb);mark('#mlSw',sw);});
    $('#mlCustom').oninput=e=>{setAccent(hexToRgb(e.target.value));mark('#mlSw',null);};
    $('#mlSw2').querySelectorAll('.ml-sw').forEach(sw=>sw.onclick=()=>{setG2(sw.dataset.rgb);mark('#mlSw2',sw);});
    $('#mlCustom2').oninput=e=>{setG2(hexToRgb(e.target.value));mark('#mlSw2',null);};
    $('#mlReplay').onclick=replay;
    $('#mlCopy').onclick=copyConfig;
    // кнопка свернуть настройки
    const headEl=document.querySelector('.ml-head');
    headEl.insertAdjacentHTML('beforeend','<button class="ml-min-btn" id="mlMin">▲ Свернуть настройки</button>');
    $('#mlMin').onclick=()=>{
      const min=document.body.classList.toggle('ml-min');
      $('#mlMin').textContent=min?'▼ Показать настройки':'▲ Свернуть настройки';
      positionIndicator();
    };
  }
  function mark(sel,el){ $(sel).querySelectorAll('.ml-sw').forEach(x=>x.classList.toggle('on',x===el)); }

  /* ══════════════ LAYOUT MAP ══════════════ */
  function buildLayouts(){
    const wrap = $('#mlLayouts');
    if(LAYOUTS.length<2){ wrap.style.display='none'; return; }
    wrap.innerHTML = LAYOUTS.map(l=>`
      <div class="ml-lay ${l.id===S.layout?'on':''}" data-l="${l.id}">
        <div class="ml-lay-pic">${picSchema(l.pic)}</div>
        <div class="ml-lay-name"><b>${l.id.toUpperCase()}</b>${l.n}</div>
        <div class="ml-lay-desc">${l.d}</div></div>`).join('');
    wrap.querySelectorAll('.ml-lay').forEach(el=>el.onclick=()=>{
      S.layout=el.dataset.l;
      wrap.querySelectorAll('.ml-lay').forEach(x=>x.classList.toggle('on',x===el));
      applyAttrs(); positionIndicator();
    });
  }
  function picSchema(t){
    const rail = `<i class="bar" style="flex:0 0 7px"></i>`;
    const m={
      base:`${rail}<div class="col"><i class="top" style="flex:0 0 11px;background:var(--acc-border)"></i><div class="split"><i></i><i class="side"></i></div></div>`,
      dash:`${rail}<div class="col"><i class="top" style="flex:0 0 11px;background:var(--acc-border)"></i><div class="cards"><i></i><i></i><i></i></div><div class="split"><i></i><i class="side"></i></div></div>`,
      compact:`${rail}<div class="col"><i class="top" style="flex:0 0 6px;background:var(--acc-border)"></i><div class="split"><i></i><i class="side"></i></div></div>`,
      neon:`<i class="bar" style="flex:0 0 7px;box-shadow:0 0 8px var(--acc-glow)"></i><div class="col"><i class="top" style="flex:0 0 11px;background:var(--acc-border)"></i><div class="split"><i style="box-shadow:0 0 8px var(--acc-glow)"></i><i class="side"></i></div></div>`,
      glass:`${rail}<div class="col"><i class="top" style="flex:0 0 11px;background:rgba(255,255,255,.12)"></i><div class="split"><i style="background:rgba(255,255,255,.08)"></i><i class="side" style="background:rgba(255,255,255,.1)"></i></div></div>`,
    };
    return m[t]||'';
  }

  /* ══════════════ FRAME SHELL ══════════════ */
  function buildFrame(){
    const side = `<aside class="f-side">
      <div class="f-brand"><div class="logo">🎮</div><div class="binfo"><b>pro-wildrift</b><span>справочник чемпионов</span></div></div>
      <div class="f-cap">Инструменты</div>
      ${SIDE.map((s,i)=>`<div class="side-btn ${s.active?'active':''}" style="--i:${i}" data-tip="${s.t}"><span class="ico">${s.ic}</span><span class="lbl">${s.t}</span>${s.beta?'<span class="beta">BETA</span>':''}</div>`).join('')}</aside>`;
    const head = `<div class="f-head">
      <span class="f-logo">PRO-WILDRIFT</span>
      <div class="f-nav" id="fNav">
        ${VIEWS.map(v=>`<button class="f-tab ${v.v===S.view?'on':''}" data-v="${v.v}" data-ic="${v.ic}">${v.t}</button>`).join('')}
        <span class="f-ind"></span></div>
      <div class="f-h-right">
        <div class="f-menu"><button class="f-admin" id="fAdmin">⚙ Админ</button>
          <div class="f-dd f-dd-r" id="fAdminDD"><b>Админ-инструменты</b><span>📋 История изменений</span><span>⚙ Настройки лейаута</span><span>🎚 Редактор позиций</span><span>🖼 Иконки</span><span>🔤 Шрифты</span><span>🏷 Категории</span><span>📰 Изменения</span><span>🧹 Очистить патч-ноты</span></div></div>
        <button class="f-pill-btn">RU</button>
        <div class="f-menu"><div class="f-ava" id="fAva"></div>
          <div class="f-dd f-dd-r" id="fAvaDD"><b>satyndy…@gmail.com</b><span>👤 Мой профиль</span><span id="fSettingsBtn">⚙ Настройки</span><span>🔄 Синхронизировать</span><span>🚪 Выйти</span></div>
          <div class="f-dd f-dd-r f-dd-wide" id="fSettingsDD"><b>Настройки отображения</b>
            ${Object.keys(PROFOPTS).map(k=>{const o=PROFOPTS[k];return `<div class="tl-grp"><span class="tl-glabel">${o.label}</span><div class="tl-seg" data-popt="${k}">${o.items.map(it=>`<button data-v="${it.v}" class="${it.v===S[k]?'on':''}">${it.t}</button>`).join('')}</div></div>`;}).join('')}</div></div>
      </div></div>`;
    frame.innerHTML = side + `<div class="f-app">${head}<div class="f-central" id="fCentral"></div></div><div class="ml-dim"></div>`;
    frame.querySelectorAll('.f-tab').forEach(b=>b.onclick=()=>{
      S.view=b.dataset.v;
      frame.querySelectorAll('.f-tab').forEach(x=>x.classList.toggle('on',x===b));
      positionIndicator();                       // пилюля едет сразу (transform, плавно)
      requestAnimationFrame(()=>renderCentral()); // тяжёлый контент рендерим следующим кадром — пилюля не дёргается
    });
    const adminBtn=$('#fAdmin'), avaBtn=$('#fAva'), setBtn=$('#fSettingsBtn');
    const anyOpen=()=>['fAdminDD','fAvaDD','fSettingsDD'].some(id=>{const d=$('#'+id);return d&&d.classList.contains('open');});
    const syncMenu=()=>{frame.dataset.menuopen=anyOpen()?'on':'off';};
    const closeDD=()=>{['fAdminDD','fAvaDD','fSettingsDD'].forEach(id=>{const d=$('#'+id);if(d)d.classList.remove('open');});syncMenu();};
    const openOne=(id,btn)=>{const dd=$('#'+id);if(!dd)return;const o=dd.classList.contains('open');closeDD();if(!o){originFrom(dd,btn);dd.classList.add('open');}syncMenu();};
    if(adminBtn) adminBtn.onclick=e=>{e.stopPropagation();openOne('fAdminDD',adminBtn);};
    if(avaBtn) avaBtn.onclick=e=>{e.stopPropagation();openOne('fAvaDD',avaBtn);};
    if(setBtn) setBtn.onclick=e=>{e.stopPropagation();$('#fAvaDD').classList.remove('open');const dd=$('#fSettingsDD');const o=dd.classList.contains('open');if(!o){originFrom(dd,avaBtn);dd.classList.add('open');}else dd.classList.remove('open');syncMenu();};
    frame.querySelectorAll('#fSettingsDD .tl-seg').forEach(seg=>{const key=seg.dataset.popt;seg.querySelectorAll('button').forEach(b=>b.onclick=ev=>{ev.stopPropagation();S[key]=b.dataset.v;seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));applyAttrs();});});
    document.addEventListener('click',closeDD);
    frame.querySelectorAll('.side-btn').forEach(b=>b.onclick=()=>{
      frame.querySelectorAll('.side-btn').forEach(x=>x.classList.toggle('active',x===b));
      openTool(b.dataset.tip);
    });
    frame.addEventListener('pointermove',e=>{ if(!S.parallax)return; const r=frame.getBoundingClientRect(); frame.style.setProperty('--px',((e.clientX-r.left)/r.width-0.5).toFixed(3)); frame.style.setProperty('--py',((e.clientY-r.top)/r.height-0.5).toFixed(3)); });
    applyAttrs(); renderCentral();
  }

  /* ══════════════ CENTRAL ══════════════ */
  function renderCentral(){
    const box = $('#fCentral');
    box.innerHTML = ({stats:statsView,wrpr:wrprView,hub:hubView,tier:tierView,patch:patchView,tactics:tacticsView}[S.view])();
    if(['stats','wrpr'].includes(S.view)) wireRows();
    if(S.view==='wrpr') wireWrSort();
    if(S.view==='stats'){ if(S.level==='chipdrag') wireChipdrag(); wireHeaders(); }
    if(S.view==='tier'){ initTierSortable(); wireTierControls(); }
    if(S.view==='patch') wirePatch();
    applyWR();
    positionIndicator();
    if(['stats','wrpr','patch'].includes(S.view)) replay(); else frame.classList.remove('anim-run');
  }

  const rpWrap = inner => S.rightpanel && ['stats','wrpr','tier','patch'].includes(S.view)
    ? `<div class="f-rpwrap">${inner}${preview()}</div>` : inner;

  function statsView(){
    const lvl = `<div class="f-lvl"><div class="f-lvl-top">
        <span class="f-lvl-lbl">УРОВЕНЬ</span><span class="f-lvl-num">10</span>
        <span class="f-gear">⚙</span></div>${levelControl()}</div>`;
    const table = `<div class="f-tbl-card"><table class="f-tbl">
        <thead><tr><th class="th-num"></th><th class="chmp"><span class="f-chmp-th">⚔ Champions</span></th>
        ${COLS.map((c,i)=>`<th class="th-col ${c.sorted?'sorted':''}" data-col="${i+3}"><span class="th-pill">${c.ic} ${c.t}<i class="arr">▼</i></span></th>`).join('')}</tr></thead>
        <tbody>${CH.map((c,i)=>`<tr style="--i:${i}" class="${CH[i]===selChamp?'sel':''}" data-row="${i}">
          <td class="f-num">${i+1}</td>
          <td><div class="f-name-cell"><span class="f-x">✕</span><span class="f-port" style="background:${c.g}">${c.i}</span><span class="f-cname">${c.n}</span></div></td>
          <td class="s-ad">${c.ad}</td><td class="s-hp">${c.hp}</td><td class="s-mana">${c.mana}</td>
          <td class="s-ar">${c.ar}</td><td class="s-mr">${c.mr}</td><td class="s-rng">${c.rng}</td></tr>`).join('')}</tbody></table></div>`;
    return rpWrap(`<div class="f-statcol">${lvl}${table}</div>`);
  }
  function wireHeaders(){
    const ths=[...frame.querySelectorAll('.f-tbl th.th-col')];
    const colCells=n=>[...frame.querySelectorAll('.f-tbl tbody tr')].map(tr=>tr.children[n-1]).filter(Boolean);
    const clearHover=()=>frame.querySelectorAll('.f-tbl .colhover').forEach(x=>x.classList.remove('colhover'));
    ths.forEach(th=>{
      const n=+th.dataset.col;
      th.addEventListener('mouseenter',()=>{ if(th.classList.contains('on'))return; th.classList.add('colhover'); colCells(n).forEach(c=>c.classList.add('colhover')); });
      th.addEventListener('mouseleave',clearHover);
      th.onclick=()=>{
        const was=th.classList.contains('on');
        ths.forEach(x=>x.classList.remove('on'));
        frame.querySelectorAll('.f-tbl .colhl').forEach(x=>x.classList.remove('colhl'));
        clearHover();
        if(!was){ th.classList.add('on','colhl'); colCells(n).forEach(c=>c.classList.add('colhl')); }
      };
    });
  }

  let wrSort={k:'wr',d:-1};
  function wireWrSort(){
    const wl=frame.querySelector('.f-wrlist');
    frame.querySelectorAll('.wr-head .wr-sortable').forEach(h=>{
      h.onclick=()=>{
        const k=h.dataset.sort;
        if(wrSort.k===k) wrSort.d*=-1; else { wrSort.k=k; wrSort.d=-1; }
        renderCentral();
      };
      h.onmouseenter=()=>{ if(wl) wl.dataset.hovcol=h.dataset.sort; };
      h.onmouseleave=()=>{ if(wl) wl.removeAttribute('data-hovcol'); };
    });
  }
  function wrprView(){
    const ranks=['Все ранги','Бронза','Золото','Платина','Алмаз','Мастер+'];
    const roles=['Все роли','Соло','Лес','Мид','Дракон','Саппорт'];
    const TIER_ORD={'s+':6,s:5,a:4,b:3,c:2,d:1};
    const val=(c,k)=> k==='tier' ? (TIER_ORD[String(c.tier).toLowerCase()]||0) : +c[k];
    const sorted=[...CH].sort((a,b)=>(val(a,wrSort.k)-val(b,wrSort.k))*wrSort.d);
    const arr=k=> wrSort.k===k ? (wrSort.d<0?' ▼':' ▲') : '';
    const hc=(k,t)=>`<span class="wr-cell wr-sortable ${wrSort.k===k?'wr-srt on':''}" data-sort="${k}">${t}${arr(k)}</span>`;
    const list = `<div class="f-card f-wrlist">
      <div class="wr-head"><span class="wr-rank">#</span><span class="wr-name-h">Чемпион</span><span class="wr-sp"></span>${hc('tier','Тир')}${hc('wr','WR')}${hc('pr','PR')}${hc('br','BR')}</div>
      ${sorted.map((c,i)=>`<div class="wr-row" data-row="${CH.indexOf(c)}" style="--i:${i}">
        <span class="wr-rank">${i+1}</span>
        <span class="wr-name"><span class="f-port" style="background:${c.g}">${c.i}</span><span class="f-cname">${c.n}</span></span>
        <span class="wr-sp"></span>
        <span class="wr-cell wr-c-tier"><span class="f-tierbadge tb-${c.tier}">${c.tier.toUpperCase()}</span></span>
        <span class="wr-cell wr-val wr-c-wr ${wrCls(c.wr)}">${c.wr.toFixed(1)}%</span>
        <span class="wr-cell wr-mut wr-c-pr">${c.pr}%</span><span class="wr-cell wr-mut wr-c-br">${c.br}%</span>
        <span class="wr-extra"><span class="wr-trend ${(TREND[c.n]||0)>=0?'up':'down'}">${(TREND[c.n]||0)>=0?'▲':'▼'}${Math.abs(TREND[c.n]||0).toFixed(1)}</span><svg class="wr-spark" viewBox="0 0 60 18" preserveAspectRatio="none"><polyline points="${sparkPts(c.wr,TREND[c.n]||0)}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg></span></div>`).join('')}</div>`;
    const body = `<div class="f-wrpr">
      <div class="f-wrpr-head">📊<span class="ttl">WinRate &amp; PickRate</span><span class="upd">обновлено 04.04.2026</span></div>
      <div class="f-filters">${ranks.map((r,i)=>`<span class="f-fchip ${i===0?'on':''}">${r}</span>`).join('')}</div>
      <div class="f-filters">${roles.map((r,i)=>`<span class="f-fchip ${i===0?'on':''}">${r}</span>`).join('')}</div>
      ${list}</div>`;
    return rpWrap(body);
  }
  const wrCls = v => !S.winloss ? 'wr-n' : (v>=50?'wr-g':'wr-b');

  function hubView(){
    const hero=ch('Garen');
    const top5=[...CH].sort((a,b)=>b.wr-a.wr).slice(0,5);
    const sTier=CH.filter(c=>c.tier==='s');
    const counters=[{c:'Garen',vs:'Teemo, Vayne'},{c:'Camille',vs:'Jax'},{c:'Akali',vs:'Kassadin'}];
    const tours=[['🔴','WR Masters','сегодня 18:00'],['🟡','Asia Cup','завтра 14:00'],['⚪','EU Open','12.06']];
    const tools=[['👥','Чемпионы'],['⚔','Калькулятор'],['📦','Предметы'],['💎','Руны'],['📋','Драфтер'],['🗺','Тактич. доска']];
    const port=c=>`<span class="f-port" style="background:${c.g}">${c.i}</span>`;
    return `<div class="f-hub">
      <div class="hub-hero"><div class="big" style="background:${hero.g}">${hero.i}</div>
        <div class="info"><span class="lbl">★ Чемпион дня · Patch 7.0f</span><h2>${hero.n}</h2>
          <div class="row"><span class="tag">🎖 Тир ${hero.tier.toUpperCase()}</span><span class="tag">📈 ${hero.wr}% WR</span><span class="tag">🗺 ${hero.role}</span></div>
          <button class="cta">Открыть гайд →</button></div></div>
      <div class="f-kpis" style="display:flex">${kpiCards()}</div>
      <div class="hub-cards">
        <div class="hub-card"><h4>📈 Топ-5 по винрейту</h4>${top5.map(c=>`<div class="hc-row">${port(c)}<span class="hc-n">${c.n}</span><span class="hc-v ${wrCls(c.wr)}">${c.wr.toFixed(1)}%</span></div>`).join('')}</div>
        <div class="hub-card"><h4>🎖 S-тир сейчас</h4><div class="hc-pool">${sTier.map(c=>`<div class="hc-champ">${port(c)}<span>${c.n}</span></div>`).join('')}</div></div>
        <div class="hub-card"><h4>⚔ Контрпики дня</h4>${counters.map(x=>`<div class="hc-cp">${port(ch(x.c))}<b>${x.c}</b><span class="hc-arr">бьёт</span><span class="hc-vs">${x.vs}</span></div>`).join('')}</div>
        <div class="hub-card"><h4>🏆 Ближайшие турниры</h4>${tours.map(t=>`<div class="hc-tour"><span class="hc-dot">${t[0]}</span><b>${t[1]}</b><span class="hc-when">${t[2]}</span></div>`).join('')}</div>
        <div class="hub-card"><h4>📰 Что нового <span class="pill">Patch 7.0f</span></h4><ul class="hc-news"><li>🟢 <b>Garen</b> усилен — Q +8%</li><li>🔴 <b>Camille</b> ослаблена — щит −10%</li><li>✦ Добавлен <b>Ambessa</b></li><li>⚙ Реворк «Кровожадника»</li></ul></div>
        <div class="hub-card"><h4>🛠 Лучшие сборки патча</h4>${[ch('Garen'),ch('Ahri')].map(c=>`<div class="hc-build">${port(c)}<b>${c.n}</b><span class="hc-items">🗡 🛡 ⚔ 👢</span></div>`).join('')}</div>
      </div>
      <div class="hub-tools">${tools.map(t=>`<div class="hub-tool"><div class="ti">${t[0]}</div><div class="tn">${t[1]}</div></div>`).join('')}</div></div>`;
  }

  function tchip(name){ const c=TIERMAP[name]; return `<div class="tl-chip" data-champ="${name}" title="${name}" style="background:${c.g}">${c.i}</div>`; }
  function tierView(){
    if(!tierPlacement) tierInit();
    const tiers=`<div class="tl-tiers">${TIERKEYS.map(k=>`<div class="tl-tier"><div class="tl-badge" style="background:${TIERCOLORS[k]}">${k}</div><div class="tl-lane" data-zone="${k}">${(tierPlacement[k]||[]).map(tchip).join('')}</div></div>`).join('')}</div>`;
    const pool=`<div class="tl-poolwrap"><div class="tl-plabel">Пул чемпионов</div><div class="tl-pool" data-zone="pool">${(tierPlacement.pool||[]).map(tchip).join('')}</div></div>`;
    const settings=`<div class="tl-settings ${S.tierOpen?'open':''}" id="tlSettings">
      ${Object.keys(TIEROPTS).map(k=>{const o=TIEROPTS[k];return `<div class="tl-grp"><span class="tl-glabel">${o.label}</span><div class="tl-seg" data-topt="${k}">${o.items.map(it=>`<button data-v="${it.v}" class="${it.v===S[k]?'on':''}">${it.t}</button>`).join('')}</div></div>`;}).join('')}
      <button class="tl-reset" id="tlReset">↺ Сбросить расстановку</button></div>`;
    const bar=`<div class="tl-bar"><span class="tl-title">🎖 Тир-лист</span><button class="tl-gear ${S.tierOpen?'on':''}" id="tlGear" title="Настройки">⚙</button></div>`;
    return rpWrap(`<div class="f-tier">${bar}${settings}<div class="tl-board">${tiers}${pool}</div></div>`);
  }
  function tierSnapshot(){
    const p={};
    frame.querySelectorAll('.f-tier [data-zone]').forEach(z=>{ p[z.dataset.zone]=[...z.querySelectorAll('.tl-chip')].map(c=>c.dataset.champ); });
    tierPlacement=p;
  }
  function initTierSortable(){
    if(!window.Sortable) return;
    frame.querySelectorAll('.f-tier [data-zone]').forEach(zone=>{
      new Sortable(zone,{group:'tier',animation:90,ghostClass:'tl-ghost',chosenClass:'tl-chosen',dragClass:'tl-drag',forceFallback:true,fallbackOnBody:true,onEnd:tierSnapshot});
    });
  }
  // origin = центр кнопки (панель растёт ИЗ кнопки) + клемп: не вылезать за фрейм
  function originFrom(dd,btn){
    if(!dd||!btn)return;
    dd.style.left='';dd.style.right='';const pt=dd.style.transform;dd.style.transform='none';
    // клемп по ГРАНИЦАМ ОКНА (не фрейма) — чтобы панель не уходила за экран
    const vr={left:8,right:window.innerWidth-8};
    let pr=dd.getBoundingClientRect();
    let shift=0;
    if(pr.right>vr.right) shift=vr.right-pr.right;
    if(pr.left+shift<vr.left) shift=vr.left-pr.left;
    if(shift){dd.style.left=(dd.offsetLeft+shift)+'px';dd.style.right='auto';pr=dd.getBoundingClientRect();}
    dd.style.transform=pt;
    const br=btn.getBoundingClientRect();
    // X = центр кнопки внутри панели, Y = верхний край панели (она прямо под кнопкой) → растёт из-под кнопки
    const ox=Math.max(0,Math.min(pr.width, br.left+br.width/2-pr.left));
    dd.style.transformOrigin=`${ox.toFixed(1)}px 0px`;
  }
  function wireTierControls(){
    const gear=$('#tlGear');
    const setTier=(open)=>{S.tierOpen=open;const s=$('#tlSettings');if(s){if(open)originFrom(s,gear);s.classList.toggle('open',open);}if(gear)gear.classList.toggle('on',open);frame.dataset.menuopen=open?'on':'off';};
    if(gear) gear.onclick=e=>{e.stopPropagation();setTier(!S.tierOpen);};
    if(!frame._tlOutside){frame._tlOutside=true;document.addEventListener('click',e=>{if(S.tierOpen&&!e.target.closest('#tlSettings')&&!e.target.closest('#tlGear'))setTier(false);});}
    frame.querySelectorAll('.tl-seg').forEach(seg=>{const key=seg.dataset.topt;seg.querySelectorAll('button').forEach(b=>b.onclick=()=>{S[key]=b.dataset.v;seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));applyAttrs();});});
    const rb=$('#tlReset'); if(rb) rb.onclick=()=>{tierInit();renderCentral();};
    frame.querySelectorAll('.tl-chip').forEach(c=>c.addEventListener('click',()=>{selChamp=TIERMAP[c.dataset.champ];updatePreview();}));
  }
  function wirePatch(){ frame.querySelectorAll('.patch-item').forEach(it=>it.onclick=()=>{selChamp=ch(it.dataset.champ);updatePreview();}); }

  /* ── Мок-модалки инструментов рельса ── */
  const TOOLIC={'Чемпионы':'👥','Калькулятор урона':'⚔','Предметы':'📦','Руны':'💎','Драфтер':'📋','Чат':'💬','Киберспорт':'🏆'};
  const port=c=>`<span class="f-port" style="background:${c.g}">${c.i}</span>`;
  function toolBody(name){
    if(name==='Чемпионы') return `<div class="fm-search">🔍 Поиск чемпиона…</div>
      <div class="fm-grid">${TIERCH.map(c=>`<div class="fm-cell">${port(c)}<span>${c.n}</span></div>`).join('')}</div>`;
    if(name==='Калькулятор урона') return `<div class="fm-calc">
      <div class="fm-card"><h4>⚔ Мой чемпион</h4><div class="fm-pick">${port(ch('Garen'))}<b>Garen</b> · ур.10</div><div class="fm-row"><span>AD</span><b>108</b></div><div class="fm-row"><span>Предметы</span><b>3</b></div></div>
      <div class="fm-vs">→</div>
      <div class="fm-card"><h4>🛡 Цель</h4><div class="fm-pick">${port(ch('Ahri'))}<b>Ahri</b> · ур.10</div><div class="fm-row"><span>Броня</span><b>68</b></div><div class="fm-row"><span>HP</span><b>1588</b></div></div>
      <div class="fm-result">Итоговый урон с авто-атаки: <b>~187</b> · с комбо: <b>~1 240</b></div></div>`;
    if(name==='Предметы'){const cols=['#e74c3c','#4aa3ff','#2ecc71','#C89B3C','#b48cff','#ff63a4'];
      return `<div class="fm-tabs"><span class="on">Все</span><span>Атака</span><span>Защита</span><span>Магия</span><span>Ботинки</span></div>
      <div class="fm-grid items">${Array.from({length:24}).map((_,i)=>`<div class="fm-item" style="background:linear-gradient(135deg,${cols[i%6]},#0a1420)">${['🗡','🛡','🔮','👢','💎','🏹'][i%6]}</div>`).join('')}</div>`;}
    if(name==='Руны') return `<div class="fm-runes">${['Доминирование','Точность','Колдовство','Решимость'].map(t=>`<div class="fm-rune-tree"><div class="rt-h">${t}</div><div class="rt-keys">${Array.from({length:4}).map(()=>'<span class="rt-k"></span>').join('')}</div><div class="rt-rows">${Array.from({length:3}).map(()=>`<div class="rt-row">${Array.from({length:3}).map(()=>'<span class="rt-m"></span>').join('')}</div>`).join('')}</div></div>`).join('')}</div>`;
    if(name==='Драфтер'){
      const slot=(t,r)=>`<div class="dr-slot"><span class="dr-plus">+</span>${r}</div>`;
      const roles=['Соло','Лес','Мид','АДК','Саппорт'];
      const bans=n=>Array.from({length:5}).map(()=>`<span class="dr-ban">✕</span>`).join('');
      return `<div class="fm-draft">
        <div class="dr-bans"><span class="dr-bl blue">Баны</span>${bans()}<span class="dr-vs">5 баны на 5</span>${bans()}<span class="dr-bl red">Баны</span></div>
        <div class="dr-main">
          <div class="dr-team blue"><div class="dr-th">🔵 Синяя</div>${roles.map(r=>slot('b',r)).join('')}</div>
          <div class="dr-center"><div class="dr-timer">0:27</div><div class="dr-turn">Ход синей · выбор</div><div class="dr-hint">Полноэкранный режим драфта (как на боевом)</div></div>
          <div class="dr-team red"><div class="dr-th">🔴 Красная</div>${roles.map(r=>slot('r',r)).join('')}</div>
        </div>
        <div class="dr-pool"><div class="dr-pool-h">Пул чемпионов</div><div class="dr-pool-grid">${TIERCH.map(c=>`<span class="f-port" style="background:${c.g}">${c.i}</span>`).join('')}</div></div></div>`;
    }
    if(name==='Чат') return `<div class="fm-chat"><div class="fm-msgs">
      ${[['Aatrox_main','Кто на ранкеды?','me'],['ProMid','я го','x'],['SuppGod','через 5 мин','x'],['You','+','me']].map(m=>`<div class="fm-msg ${m[2]==='me'?'mine':''}"><b>${m[0]}</b><span>${m[1]}</span></div>`).join('')}
      </div><div class="fm-input">💬 Написать сообщение…<span class="fm-send">➤</span></div></div>`;
    if(name==='Киберспорт') return `<div class="fm-tabs"><span class="on">Активные</span><span>Предстоящие</span><span>Завершённые</span></div>
      <div class="fm-tours">${[['🔴 LIVE','WR Masters 2026','Финал · BO5'],['Сегодня 18:00','Asia Cup','Полуфинал'],['12.06','EU Open','Групповой этап']].map(t=>`<div class="fm-tour"><div class="ft-when">${t[0]}</div><div class="ft-name">${t[1]}</div><div class="ft-stage">${t[2]}</div></div>`).join('')}</div>`;
    return `<p style="color:var(--t3)">Здесь будет «${name}».</p>`;
  }
  function openTool(name){
    closeTool();
    const full = name==='Драфтер';
    const m=document.createElement('div'); m.className='f-modal-mask'; m.id='fModal';
    m.innerHTML=`<div class="f-modal-win ${full?'full':''}"><div class="fm-hdr"><span class="fm-ic">${TOOLIC[name]||'•'}</span><span class="fm-title">${name}</span>${full?'<span class="fm-tag">FULLSCREEN</span>':''}<button class="fm-x" id="fmX">✕</button></div><div class="fm-body">${toolBody(name)}</div></div>`;
    frame.appendChild(m);
    m.addEventListener('click',e=>{ if(e.target===m) closeTool(); });
    m.querySelector('#fmX').onclick=closeTool;
  }
  function closeTool(){ const m=$('#fModal'); if(m) m.remove(); }

  function patchView(){
    return rpWrap(`<div class="f-patchfeed">
      <div class="patch-banner"><span class="v">7.0f</span><span class="t"><b>Обновление меты</b>6 изменений чемпионов · 04.04.2026</span></div>
      ${PATCH.map((p,i)=>{const c=ch(p.n),b=PBADGE[p.type];
        return `<div class="patch-item" data-champ="${p.n}" style="--i:${i}"><span class="f-port" style="background:${c.g}">${c.i}</span>
          <div class="pc"><div class="pn">${p.n}<span class="pbadge pb-${b.c}">${b.t}</span></div><div class="pt">${p.t}</div></div></div>`;}).join('')}</div>`);
  }

  function tacticsView(){
    const dots=[['18%','26%','#3ca0e6'],['34%','52%','#3ca0e6'],['50%','46%','var(--gold)'],['66%','60%','#e64646'],['80%','30%','#e64646']];
    const roles=['Топ','Лес','Мид','АДК','Саппорт'];
    const slots=roles.map(r=>`<button class="tb-slot"><span class="tb-plus">+</span>${r}</button>`).join('');
    const blue=`<div class="tb-col">
      <div class="tb-team"><div class="tb-team-h"><span class="tb-tdot" style="background:#3ca0e6"></span>Синяя</div>${slots}</div>
      <div class="tb-toolp"><div class="tt">Инструменты</div>
        <div class="tb-tool"><span>↗</span>Стрелка</div><div class="tb-tool"><span>✏</span>Карандаш</div><div class="tb-tool"><span>📝</span>Заметка</div>
        <div class="tb-colors"><span class="tb-color on" style="background:#FFD700"></span><span class="tb-color" style="background:#3ca0e6"></span><span class="tb-color" style="background:#e64646"></span></div>
        <div class="tb-tool"><span>🟢</span>Свой вард</div><div class="tb-tool"><span>🔴</span>Враг вард</div></div></div>`;
    const board=`<div class="tb-mapwrap"><div class="tb-board">
      <div class="tb-lane tb-top"></div><div class="tb-lane tb-mid"></div><div class="tb-lane tb-bot"></div><div class="tb-river"></div>
      ${dots.map(d=>`<span class="tb-dot" style="left:${d[0]};top:${d[1]};background:${d[2]}"></span>`).join('')}
      <span class="tb-base tb-b1"></span><span class="tb-base tb-b2"></span>
      <div class="tb-zoom"><button title="Приблизить">+</button><button title="Отдалить">−</button><button title="Вписать">⤢</button></div></div></div>`;
    const red=`<div class="tb-col">
      <div class="tb-team"><div class="tb-team-h"><span class="tb-tdot" style="background:#e64646"></span>Красная</div>${slots}</div>
      <div class="tb-toolp"><div class="tt">Действия</div>
        <div class="tb-tool"><span>🧹</span>Очистить</div><div class="tb-tool"><span>💾</span>Сохранить</div><div class="tb-tool"><span>📷</span>Поделиться</div><div class="tb-tool"><span>↺</span>Сброс</div></div></div>`;
    return `<div class="f-tactics">${blue}${board}${red}</div>`;
  }

  function kpiCards(){
    return `<div class="f-kpi"><div class="k-lbl">Топ патча 7.0f</div><div class="k-val">Garen</div><div class="k-sub">▲ +4.2% WR</div></div>
      <div class="f-kpi"><div class="k-lbl">Мета-роль</div><div class="k-val">Лес</div><div class="k-sub">52% пиков</div></div>
      <div class="f-kpi"><div class="k-lbl">Самый банимый</div><div class="k-val">Camille</div><div class="k-sub">38% банов</div></div>
      <div class="f-kpi"><div class="k-lbl">Чемпионов</div><div class="k-val">128</div><div class="k-sub">обновлено сегодня</div></div>`;
  }
  function preview(){
    const c=selChamp||CH[0];
    const tags=(c.ad!=null)?`<span class="tag">⚔ ${c.ad} AD</span><span class="tag">❤ ${c.hp} HP</span><span class="tag">🛡 ${c.ar} AR</span>`:`<span class="tag">🎖 ${c.role||'чемпион'}</span>`;
    return `<aside class="f-preview"><div class="big" style="background:${c.g}">${c.i}</div>
      <h3>${c.n}</h3><div class="meta">${tags}</div>
      <p>Правая панель: превью выбранного. Кликни строку или чемпа — карточка обновится.</p></aside>`;
  }
  function updatePreview(){ const pv=frame.querySelector('.f-preview'); if(pv){const t=document.createElement('div');t.innerHTML=preview();pv.replaceWith(t.firstElementChild);} }

  function levelControl(){
    if(S.level==='slider') return `<div class="f-slider"><div class="track"><div class="fill"></div></div><div class="knob"></div></div>`;
    if(S.level==='dots'){let d='';for(let i=1;i<=15;i++)d+=`<i class="${i<=10?'f':''}"></i>`;return `<div class="f-lvldots">${d}</div>`;}
    // chips / chipdrag / chipsneon
    const cls = S.level==='chipdrag'?'f-chips f-chipdrag':S.level==='chipsneon'?'f-chips f-chipsneon':'f-chips';
    let h=`<div class="${cls}">`; for(let i=1;i<=15;i++)h+=`<div class="f-chip ${i===10?'on':''}" data-lvl="${i}">${i}</div>`;
    return h + (S.level==='chipdrag'?'<span class="f-chiphint">зажми и тяни →</span>':'') + '</div>';
  }
  function wireChipdrag(){
    const strip = frame.querySelector('.f-chipdrag'); if(!strip) return;
    const chips=[...strip.querySelectorAll('.f-chip')], num=frame.querySelector('.f-lvl-num');
    let drag=false;
    const setAt = x=>{
      let hit=chips[0];
      chips.forEach(ch=>{const r=ch.getBoundingClientRect(); if(x>=r.left) hit=ch;});
      chips.forEach(c=>c.classList.toggle('on',c===hit));
      if(num) num.textContent=hit.dataset.lvl;
    };
    strip.addEventListener('pointerdown',e=>{drag=true;strip.setPointerCapture(e.pointerId);setAt(e.clientX);});
    strip.addEventListener('pointermove',e=>{if(drag)setAt(e.clientX);});
    strip.addEventListener('pointerup',()=>drag=false);
    chips.forEach(c=>c.addEventListener('click',()=>{chips.forEach(x=>x.classList.toggle('on',x===c));if(num)num.textContent=c.dataset.lvl;}));
  }

  /* ══════════════ EVENTS / APPLY ══════════════ */
  function wireRows(){
    frame.querySelectorAll('.f-tbl tbody tr,.wr-row').forEach(r=>{
      r.onclick=()=>{
        selChamp=CH[+r.dataset.row];
        frame.querySelectorAll('.f-tbl tbody tr,.wr-row').forEach(x=>x.classList.toggle('sel',x===r));
        updatePreview();
      };
      if(S.hover==='spotlight') r.addEventListener('pointermove',e=>{
        const b=r.getBoundingClientRect();
        r.style.setProperty('--mx',(e.clientX-b.left)+'px');
        r.style.setProperty('--my',(e.clientY-b.top)+'px');
      });
    });
  }
  function applyAttrs(){
    frame.dataset.layout=S.layout; frame.dataset.view=S.view;
    frame.dataset.switcher=S.switcher; frame.dataset.tbl=S.tbl;
    frame.dataset.srowh=S.srowh; frame.dataset.srows=S.srows; frame.dataset.scolh=S.scolh; frame.dataset.scols=S.scols; frame.dataset.wrowh=S.wrowh; frame.dataset.wrows=S.wrows; frame.dataset.menufx=S.menufx; frame.dataset.menuanim=S.menuanim;
    frame.dataset.anim=S.anim; frame.dataset.bg=S.bg; frame.dataset.density=S.density;
    frame.dataset.rail=S.rail; frame.dataset.railanim=S.railanim; frame.dataset.railbtn=S.railbtn; frame.dataset.railact=S.railact;
    frame.dataset.radius=S.radius; frame.dataset.glow=S.glow; frame.dataset.tblfont=S.tblfont; frame.dataset.island=S.island?'on':'off';
    frame.dataset.thstyle=S.thstyle;
    frame.dataset.tlayout=S.tlayout; frame.dataset.tpool=S.tpool; frame.dataset.tsize=S.tsize; frame.dataset.psize=S.psize;
    frame.dataset.glass=S.glass?'on':'off'; frame.dataset.glasspow=S.glasspow; frame.dataset.glasstint=S.glasstint; frame.dataset.glasssat=S.glasssat; frame.dataset.glassborder=S.glassborder; frame.dataset.glassnoise=S.glassnoise?'on':'off'; frame.dataset.parallax=S.parallax?'on':'off';
    frame.dataset.splashart=S.splashart; root.style.setProperty('--splash-img', SPLASHES[S.splashart]||SPLASHES.lux);
    frame.dataset.wrtrend=S.wrtrend?'on':'off';
    frame.dataset.winloss=S.winloss?'on':'off';
  }
  function applyWR(){
    const gap = Math.round((100-S.wrpull)*3.4)+8;
    root.style.setProperty('--wr-gap', gap+'px');
  }
  function positionIndicator(){
    const nav=frame.querySelector('.f-nav'); if(!nav)return;
    const ind=nav.querySelector('.f-ind'), on=nav.querySelector('.f-tab.on'); if(!ind||!on)return;
    requestAnimationFrame(()=>{ind.style.width=on.offsetWidth+'px';ind.style.transform=`translateX(${on.offsetLeft}px)`;});
  }
  function replay(){
    if(S.anim==='none'){frame.classList.remove('anim-run');return;}
    frame.classList.remove('anim-run'); void frame.offsetWidth; frame.classList.add('anim-run');
  }
  function setAccent(rgb){S.accent=rgb;root.style.setProperty('--acc-rgb',rgb);}
  function setG2(rgb){S.accent2=rgb;root.style.setProperty('--g2-rgb',rgb);}
  function setBg1(hex){S.bg1=hex;root.style.setProperty('--bg1',hex);}
  function setBg2(hex){S.bg2=hex;root.style.setProperty('--bg2',hex);}
  function hexToRgb(hex){const n=parseInt(hex.slice(1),16);return `${(n>>16)&255},${(n>>8)&255},${n&255}`;}

  /* ══════════════ COPY ══════════════ */
  function copyConfig(){
    const lay=LAYOUTS.find(l=>l.id===S.layout), view=VIEWS.find(v=>v.v===S.view);
    const nm=k=>OPTS[k].items.find(i=>i.v===S[k]).t;
    const acc=ACCENTS.find(a=>a.rgb===S.accent), acc2=ACCENTS.find(a=>a.rgb===S.accent2);
    const txt=
`Main-Lab — конфигурация главного экрана
──────────────────────────────────────────────
Раскладка:        ${lay.id.toUpperCase()} · ${lay.n}
Главный вид:      ${view.ic} ${view.t}
Зафиксировано:    Навигация=Обводка · Уровень=Чипы-драг · Карточки=Базовые · Hover=Неон-рамка · Анимация=Слайд
                  Заголовки=Сегмент · Ховер статов=Заливка · Рельс=Плавающий · активный=Рамка · раскрытие=Проявление
Фон:              Сплэш-арт (${S.splashart})
Профиль-настройки:Шрифт=${S.tblfont} · Свечение=${S.glow} · Скругление=${S.radius}
Правая панель:    ${S.rightpanel?'вкл':'выкл'}
Цвет побед/пор.:  ${S.winloss?'вкл':'выкл'}
Приближение WR:   ${S.wrpull}
Баланс/угол град: ${S.gpos}% / ${S.gang}°
Скорость:         ${S.speed.toFixed(1)}×
Акцент 1:         ${acc?acc.hex+' ('+acc.t+')':'rgb('+S.accent+')'}
Акцент 2:         ${acc2?acc2.hex+' ('+acc2.t+')':'rgb('+S.accent2+')'}
Островной стиль:  ${S.island?'вкл':'выкл'}
Фон-градиент:     ${S.bg1} → ${S.bg2} (${S.bgpos}% / ${S.bgang}°)
──────────────────────────────────────────────
data: layout="${S.layout}" view="${S.view}" switcher="${S.switcher}" level="${S.level}"
      tbl="${S.tbl}" hover="${S.hover}" anim="${S.anim}" density="${S.density}" bg="${S.bg}"
      rail="${S.rail}" railanim="${S.railanim}" railbtn="${S.railbtn}" railact="${S.railact}"`;
    navigator.clipboard.writeText(txt).then(()=>showToast('Конфиг скопирован ✓')).catch(()=>showToast('Не удалось'));
  }
  function showToast(m){toast.textContent=m;toast.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>toast.classList.remove('show'),2000);}

  /* ══════════════ INIT ══════════════ */
  buildControls();
  buildLayouts();
  setAccent(S.accent); setG2(S.accent2); setBg1(S.bg1); setBg2(S.bg2); applyWR();
  root.style.setProperty('--g-pos',S.gpos+'%'); root.style.setProperty('--g-ang',S.gang+'deg');
  root.style.setProperty('--bg-pos',S.bgpos+'%'); root.style.setProperty('--bg-ang',S.bgang+'deg');
  root.style.setProperty('--spd',S.speed);
  buildFrame();
  // пре-прогрев reflow-пути раздвигания рельса — первое наведение без рывка (синхронно, без промежуточной отрисовки)
  try{ const _pc=frame.style.gridTemplateColumns; frame.style.gridTemplateColumns='252px 1fr'; void frame.offsetWidth; frame.style.gridTemplateColumns=_pc; }catch(e){}
  window.addEventListener('resize', positionIndicator);
  // видимый штамп сборки — если число свежее, значит грузится новый код (не кеш)
  (function(){const b=document.createElement('div');b.textContent='build 18';b.style.cssText='position:fixed;bottom:8px;right:10px;z-index:99999;background:#0BC4E3;color:#001016;font:800 12px system-ui,sans-serif;padding:4px 10px;border-radius:8px;box-shadow:0 4px 14px rgba(0,0,0,.4);';document.body.appendChild(b);})();
})();
