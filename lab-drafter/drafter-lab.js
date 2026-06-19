/* ══════════════════════════════════════════════════════════
   DRAFTER-LAB · песочница полноэкранного драфтера (стекло)
   Живой мок серии Bo3 (Fearless): идёт Игра 2, Игра 1 сыграна.
   Доиграй драфт → выбери победителя → проигравший выбирает сторону →
   СЛЕДУЮЩАЯ ИГРА реально стартует: свап сторон, чистый драфт, прошлые
   пики/баны перерисованы под текущие стороны, fearless-локи обновлены.
   Варианты раскладки переключаются панелью сверху (data-* на .dl-frame).
   ══════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  /* ── Боевая последовательность драфта (из draft-logic.js) ── */
  const SEQ = [
    {action:'ban', side:'blue',idx:0},{action:'ban', side:'red',idx:0},
    {action:'ban', side:'blue',idx:1},{action:'ban', side:'red',idx:1},
    {action:'ban', side:'blue',idx:2},{action:'ban', side:'red',idx:2},
    {action:'pick',side:'blue',idx:0},{action:'pick',side:'red',idx:0},
    {action:'pick',side:'red', idx:1},{action:'pick',side:'blue',idx:1},
    {action:'pick',side:'blue',idx:2},{action:'pick',side:'red',idx:2},
    {action:'ban', side:'red', idx:3},{action:'ban', side:'blue',idx:3},
    {action:'ban', side:'red', idx:4},{action:'ban', side:'blue',idx:4},
    {action:'pick',side:'red', idx:3},{action:'pick',side:'blue',idx:3},
    {action:'pick',side:'blue',idx:4},{action:'pick',side:'red', idx:4},
  ];
  const SEQ_LEN = SEQ.length;
  const ROLES = ['Соло','Лес','Мид','АДК','Сап'];
  const ROLE_TABS = [
    {k:'Соло',t:'Top'},{k:'Лес',t:'Jng'},{k:'Мид',t:'Mid'},{k:'АДК',t:'Adc'},{k:'Сап',t:'Sup'},
  ];

  /* ── Демо-чемпионы (портрет = градиент + буквы) ── */
  function C(n,i,g,role,wr){ return {n:n,i:i,g:g,role:role,wr:wr}; }
  const CHAMPS = [
    C('Aatrox','A','linear-gradient(135deg,#e74c3c,#7a1d12)','Соло',52),
    C('Camille','C','linear-gradient(135deg,#c0c0c0,#5a5a6e)','Соло',49),
    C('Darius','D','linear-gradient(135deg,#b03030,#3a0a0a)','Соло',53),
    C('Garen','G','linear-gradient(135deg,#4aa3ff,#103a6e)','Соло',55),
    C('Malphite','M','linear-gradient(135deg,#7ac0a0,#1a4a3a)','Соло',53),
    C('Nasus','N','linear-gradient(135deg,#d4a050,#5a3a10)','Соло',51),
    C('Renekton','Re','linear-gradient(135deg,#d06a3a,#5a2208)','Соло',50),
    C('Riven','R','linear-gradient(135deg,#7ab0d0,#2a4a6e)','Соло',49),
    C('Sett','St','linear-gradient(135deg,#e06a6a,#5a1a1a)','Соло',52),
    C('Fiora','F','linear-gradient(135deg,#c97a8a,#4a1a2a)','Соло',50),
    C('Jax','Jx','linear-gradient(135deg,#9a8a4a,#3a3010)','Соло',51),
    C('Mordekaiser','Mo','linear-gradient(135deg,#6a4a8a,#2a1040)','Соло',52),
    C('Amumu','Am','linear-gradient(135deg,#2ecc71,#145a32)','Лес',54),
    C('Vi','V','linear-gradient(135deg,#e08a3a,#5a2a0a)','Лес',50),
    C('LeeSin','Le','linear-gradient(135deg,#c08a3a,#4a2a08)','Лес',51),
    C('Khazix','Kh','linear-gradient(135deg,#5a4a8a,#1a1040)','Лес',52),
    C('Hecarim','He','linear-gradient(135deg,#3a8a7a,#0a3a30)','Лес',51),
    C('Graves','Gr','linear-gradient(135deg,#8a6a4a,#3a2010)','Лес',50),
    C('Kayn','Ka','linear-gradient(135deg,#c03a5a,#3a0a1a)','Лес',52),
    C('Rengar','Rg','linear-gradient(135deg,#c0903a,#4a3008)','Лес',49),
    C('Ahri','Ah','linear-gradient(135deg,#ff63a4,#7a1d4a)','Мид',51),
    C('Akali','Ak','linear-gradient(135deg,#27c4a8,#0a4a40)','Мид',50),
    C('Katarina','Kt','linear-gradient(135deg,#e0506a,#5a0a1a)','Мид',48),
    C('Yasuo','Y','linear-gradient(135deg,#6ab0c0,#1a3a4a)','Мид',50),
    C('Zed','Z','linear-gradient(135deg,#5a6ac0,#1a1a4a)','Мид',51),
    C('Ziggs','Zg','linear-gradient(135deg,#e0d050,#5a4a10)','Мид',49),
    C('Orianna','Or','linear-gradient(135deg,#5aa0c0,#1a3a4a)','Мид',50),
    C('Syndra','Sy','linear-gradient(135deg,#9a5ac0,#3a1050)','Мид',51),
    C('Ashe','As','linear-gradient(135deg,#7ec8e3,#1a4a66)','АДК',50),
    C('Ezreal','E','linear-gradient(135deg,#f3d65a,#7a5a10)','АДК',49),
    C('Jhin','J','linear-gradient(135deg,#d44a6a,#3a0a1a)','АДК',51),
    C('Jinx','Ji','linear-gradient(135deg,#ff7ac0,#5a1a6e)','АДК',50),
    C('Caitlyn','Ca','linear-gradient(135deg,#c0a060,#4a3818)','АДК',51),
    C('MissFortune','MF','linear-gradient(135deg,#e07a4a,#5a2208)','АДК',52),
    C('Kaisa','Ks','linear-gradient(135deg,#a060c0,#3a1050)','АДК',53),
    C('Tristana','Tr','linear-gradient(135deg,#5ac08a,#1a4a30)','АДК',50),
    C('Leona','L','linear-gradient(135deg,#f0b84a,#7a4a10)','Сап',52),
    C('Thresh','Th','linear-gradient(135deg,#3ad0b0,#0a3a4a)','Сап',51),
    C('Nautilus','Nt','linear-gradient(135deg,#3a8fb0,#0a2a3a)','Сап',50),
    C('Lulu','Lu','linear-gradient(135deg,#c08ad0,#3a1050)','Сап',51),
    C('Janna','Ja','linear-gradient(135deg,#8ad0e0,#1a4a5a)','Сап',50),
    C('Nami','Na','linear-gradient(135deg,#4a9ac0,#0a3a4a)','Сап',52),
    C('Pyke','Py','linear-gradient(135deg,#3a6a7a,#0a1a2a)','Сап',51),
  ];
  const CMAP = Object.fromEntries(CHAMPS.map(c=>[c.n,c]));
  const port = (name,extra) => {
    const c = CMAP[name]; if(!c) return '<span class="dl-port'+(extra?' '+extra:'')+'"></span>';
    return `<span class="dl-port${extra?' '+extra:''}" style="background:${c.g}">${c.i}</span>`;
  };

  /* ── Фон-сплэш (ФИКСИРОВАННЫЙ) ── */
  const DD = 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/';
  const SPLASHES = {
    thresh:`url('${DD}Thresh_0.jpg')`, lux:`url('${DD}Lux_0.jpg')`,
    yasuo:`url('${DD}Yasuo_0.jpg')`, ahri:`url('${DD}Ahri_0.jpg')`, zed:`url('${DD}Zed_0.jpg')`,
    brand:`radial-gradient(ellipse at 22% 8%,rgba(11,196,227,.30),transparent 55%),radial-gradient(ellipse at 80% 92%,rgba(200,155,60,.24),transparent 55%),linear-gradient(135deg,#02121f,#0a0617)`,
  };

  /* ── Команды (стабильная идентичность A/B) + серия ── */
  const TEAMS = { A:{name:'Cloud9',cap:'Перкз'}, B:{name:'T1',cap:'Faker'} };
  const other = t => t==='A' ? 'B' : 'A';
  const SERIES = { type:'bo3', fearless:true, targetWins:2 };
  const GLOBAL_BANS = ['Camille','Veigar'];   // баны на всю серию (отдельно от fearless)

  // Состояние серии. picks/bans хранятся по ПОЗИЦИИ (blue/red); blueTeam = чья команда на синей.
  function initState(){
    return {
      gameNo:3,
      blueTeam:'A',                  // Cloud9 на синей в игре 3
      score:{A:1,B:1},
      seriesOver:false,
      past:[
        // Игра 1: Cloud9 (A) на СИНЕЙ, выиграла
        { no:1, blueTeam:'A', winner:'A',
          picks:{ blue:['Garen','Amumu','Ahri','Jhin','Leona'], red:['Darius','Vi','Zed','Caitlyn','Thresh'] },
          bans: { blue:['Aatrox','Akali','Katarina'],          red:['Yasuo','Jinx','Nautilus'] } },
        // Игра 2: СВАП — T1 (B) теперь на СИНЕЙ, выиграла
        { no:2, blueTeam:'B', winner:'B',
          picks:{ blue:['Malphite','Hecarim','Orianna','Ezreal','Nami'], red:['Renekton','Khazix','Syndra','MissFortune','Lulu'] },
          bans: { blue:['Sett','Kayn','Ziggs'],                          red:['Riven','Rengar','Pyke'] } },
      ],
      turnIndex:10, hover:null, winner:null,
      bans:{ blue:['Aatrox','Sett','Ziggs'], red:['Yasuo','Kaisa','Jax'] },
      picks:{ blue:['Nasus','LeeSin'], red:['Fiora','Ashe'] },
    };
  }
  let st = initState();

  // helpers сторон/команд
  const teamOnSide = side => side==='blue' ? st.blueTeam : other(st.blueTeam);
  const sideOfTeam = team => st.blueTeam===team ? 'blue' : 'red';
  function fearlessUsed(){
    if(!SERIES.fearless) return new Set();
    const s = new Set();
    st.past.forEach(g=>{ (g.picks.blue||[]).forEach(n=>s.add(n)); (g.picks.red||[]).forEach(n=>s.add(n)); });
    return s;
  }

  /* ── Переключатели вариантов (верхняя панель — ДЛЯ НАС) ── */
  const OPTS = {
    screen:{label:'Экран драфтера', val:'draft', items:[
      {v:'mode',t:'Выбор режима'},{v:'solo',t:'Соло-драфт'},{v:'drafts',t:'Мои драфты'},{v:'create',t:'Создать'},{v:'waiting',t:'Ожидание'},{v:'draft',t:'Драфт серии'},{v:'results',t:'Результаты'},
    ]},
    createvar:{label:'Создать — раскладка', val:'2col', items:[
      {v:'2col',t:'2 колонки'},{v:'1col',t:'1 колонка'},{v:'wizard',t:'Мастер-шаги'},
    ]},
    waitvar:{label:'Ожидание — раскладка', val:'side', items:[
      {v:'side',t:'Команды рядом'},{v:'stacked',t:'Стопкой'},
    ]},
    driftsvar:{label:'Мои драфты — вид', val:'rows', items:[
      {v:'cards',t:'Карточки'},{v:'rows',t:'Строки'},{v:'compact',t:'Компактно'},
    ]},
    bg:{label:'Фон (под стекло)', val:'thresh', items:[
      {v:'thresh',t:'Thresh'},{v:'lux',t:'Lux'},{v:'yasuo',t:'Yasuo'},{v:'ahri',t:'Ahri'},{v:'zed',t:'Zed'},{v:'brand',t:'Бренд'},
    ]},
    ctrlpos:{label:'Кнопки управления', val:'corner', items:[
      {v:'corner',t:'В шапке'},{v:'dock',t:'Док снизу'},{v:'rail',t:'Рельс сбоку'},{v:'menu',t:'Меню «⋯»'},{v:'split',t:'Разнесённые'},{v:'topbar',t:'Верхняя панель'},
    ]},
    pool:{label:'Пул чемпионов', val:'center', items:[
      {v:'center',t:'Центр'},{v:'bottom',t:'Полоса снизу'},{v:'fav',t:'Центр + избранное'},
    ]},
    pickslot:{label:'Слоты пиков', val:'rows', items:[
      {v:'rows',t:'Строки'},{v:'cards',t:'Карточки'},{v:'cardswr',t:'Карточки + WR'},{v:'polaroid',t:'Полароид'},
    ]},
    timer:{label:'Таймер', val:'capsule', items:[
      {v:'capsule',t:'Капсула'},{v:'bar',t:'Полоса'},{v:'mini',t:'Мини'},
      {v:'ring-thin',t:'Кольцо тонкое'},{v:'ring-thick',t:'Кольцо толстое'},{v:'ring-grad',t:'Кольцо градиент'},
    ]},
    glass:{label:'Стиль стекла', val:'dense', items:[
      {v:'light',t:'Лёгкое'},{v:'dense',t:'Плотное'},{v:'neon',t:'Неон-кант'},{v:'tint',t:'Тонирование'},
    ]},
    turnfx:{label:'Подсветка хода', val:'pulse', items:[
      {v:'pulse',t:'Пульс рамки'},{v:'glow',t:'Свечение'},{v:'flash',t:'Вспышка слота'},{v:'spotlight',t:'Подсветка команды'},
    ]},
    bans:{label:'Баны', val:'incol', items:[
      {v:'incol',t:'В колонке'},{v:'bar',t:'Полоса под шапкой'},{v:'corner',t:'В углах капитанов'},
    ]},
    past:{label:'Прошлые игры (серия)', val:'collapsed', items:[
      {v:'collapsed',t:'Свёрнуто'},{v:'expanded',t:'Раскрыто'},{v:'off',t:'Скрыть'},
    ]},
    density:{label:'Плотность', val:'normal', items:[
      {v:'cozy',t:'Просторно'},{v:'normal',t:'Средне'},{v:'compact',t:'Плотно'},
    ]},
    lockstyle:{label:'Кнопка фиксации', val:'fill', items:[
      {v:'fill',t:'Заливка'},{v:'outline',t:'Контур'},{v:'neon',t:'Неон'},
    ]},
    scrim:{label:'Затемнение фона', val:'medium', items:[
      {v:'light',t:'Лёгкое'},{v:'medium',t:'Среднее'},{v:'strong',t:'Сильное'},
    ]},
  };
  // Какая настройка к какому экрану относится. НЕ указанные здесь = общие (видны везде):
  // это глобальный стиль (фон/стекло/затемнение/плотность) + сам переключатель «Экран».
  const SCOPE = {
    ctrlpos:['draft'], pool:['draft'], pickslot:['draft','solo'], timer:['draft'],
    turnfx:['draft','solo'], bans:['draft'], past:['draft'],
    createvar:['create'], waitvar:['waiting'], driftsvar:['drafts'],
  };

  const S = {};
  Object.keys(OPTS).forEach(k=>S[k]=OPTS[k].val);
  S.sound = true; S.paused = false; S.roleFilter = 'Соло'; S.champSize = 'm'; S.cellname = 'under';
  const DEFAULTS = JSON.parse(JSON.stringify(S));
  let _settingsOpen = false;
  let _pastOpen = false;
  let _overlay = null;      // 'invite' | 'picker' | 'chat' | 'assist' | 'share' | null
  let _ready = {A:false, B:false};   // косметика комнаты ожидания
  let _soloFill = 'me';     // в соло заполняю «Я» или «Соперник»
  let solo = { me:['Garen','Amumu'], opp:['Darius','Vi'] };  // соло-пики

  const $ = s => document.querySelector(s);
  const frame = $('#dlFrame');
  let toastT;
  function toast(msg){
    const el = $('#dlToast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(()=>el.classList.remove('show'), 1600);
  }

  /* ══════════════ ПАНЕЛЬ УПРАВЛЕНИЯ (наша) ══════════════ */
  function buildControls(){
    const c = $('#dlControls'); if(!c) return;
    let h = '';
    for(const key of Object.keys(OPTS)){
      const sc = SCOPE[key];
      if(sc && sc.indexOf(S.screen)===-1) continue;   // настройка не для этого экрана — прячем
      const o = OPTS[key];
      h += `<div class="dl-group"><span class="dl-glabel">${o.label}</span><div class="dl-seg" data-opt="${key}">`;
      h += o.items.map(it=>`<button data-v="${it.v}" class="${it.v===S[key]?'on':''}">${it.t}</button>`).join('');
      h += `</div></div>`;
    }
    h += `<div class="dl-group"><span class="dl-glabel">Оверлеи (поверх)</span><div class="dl-seg" id="dlOverlays">`
      + `<button data-ov="invite">👥 Пригласить</button><button data-ov="picker">⛔ Пикер банов</button><button data-ov="chat">💬 Чат</button><button data-ov="assist">🤖 Помощник</button>`
      + `</div></div>`;
    h += `<div class="dl-group"><span class="dl-glabel">Демо</span><div class="dl-seg"><button id="dlReset">↺ Сбросить серию</button></div></div>`;
    c.innerHTML = h;
    c.querySelectorAll('.dl-seg[data-opt]').forEach(seg=>{
      seg.addEventListener('click', e=>{
        const b = e.target.closest('button[data-v]'); if(!b) return;
        const key = seg.dataset.opt;
        if(key==='screen'){ gotoScreen(b.dataset.v); return; }   // смена экрана → панель перефильтруется
        S[key] = b.dataset.v;
        seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on', x===b));
        applyVariants();
      });
    });
    const ov = $('#dlOverlays');
    if(ov) ov.addEventListener('click', e=>{ const b=e.target.closest('button[data-ov]'); if(!b)return; _overlay=b.dataset.ov; render(); });
    const r = $('#dlReset'); if(r) r.onclick = ()=>{ st = initState(); render(); toast('Серия сброшена'); };
  }

  function applyVariants(){
    frame.dataset.ctrlpos=S.ctrlpos; frame.dataset.pool=S.pool; frame.dataset.pickslot=S.pickslot;
    frame.dataset.timer=S.timer; frame.dataset.glass=S.glass; frame.dataset.turnfx=S.turnfx;
    frame.dataset.bans=S.bans; frame.dataset.density=S.density; frame.dataset.cellname=S.cellname;
    frame.dataset.lockstyle=S.lockstyle; frame.dataset.champsize=S.champSize;
    frame.dataset.createvar=S.createvar; frame.dataset.waitvar=S.waitvar; frame.dataset.driftsvar=S.driftsvar;
    updateBg(); render();
  }

  function updateBg(){
    const bg = document.getElementById('dlBg'); if(!bg) return;
    const isArt = S.bg !== 'brand';
    bg.className = 'dl-bg' + (isArt?' art':'') + ' scrim-' + S.scrim;
    bg.style.backgroundImage = SPLASHES[S.bg] || SPLASHES.thresh;
  }

  /* ══════════════ ВЫЧИСЛЕНИЯ ══════════════ */
  function step(){ return SEQ[st.turnIndex] || null; }
  function isDone(){ return st.turnIndex >= SEQ_LEN; }
  function usedSet(){
    const u = new Set(GLOBAL_BANS);
    ['blue','red'].forEach(side=>{ (st.bans[side]||[]).forEach(n=>u.add(n)); (st.picks[side]||[]).forEach(n=>u.add(n)); });
    if(st.hover) u.add(st.hover);
    return u;
  }

  /* ══════════════ РЕНДЕР ══════════════ */
  function render(){
    const s = step();
    frame.dataset.activeSide = (!isDone() && s) ? s.side : 'none';
    frame.dataset.phase = isDone() ? 'done' : (s ? s.action : '');
    frame.dataset.screen = S.screen;
    let html;
    if(S.screen==='draft'){
      html = headerHtml() + bansBarHtml()
        + `<div class="dl-board">` + sidePanelHtml('blue') + centerHtml() + sidePanelHtml('red') + `</div>`
        + pastGamesHtml() + bottomBarHtml() + settingsHtml();
    } else if(S.screen==='mode'){
      html = modeHtml();
    } else if(S.screen==='solo'){
      html = soloHtml() + settingsHtml();
    } else if(S.screen==='results'){
      html = resultsHtml();
    } else {
      html = shellHtml(S.screen);
    }
    frame.innerHTML = html + overlayHtml();
    wire();
  }
  function gotoScreen(v){ S.screen=v; _overlay=null; buildControls(); applyVariants(); }

  function headerHtml(){
    const s = step();
    const fl = SERIES.fearless ? ' · Fearless' : '';
    return `<div class="dl-hdr">`
      + capHtml('blue')
      + `<div class="dl-hdr-center">`
      +   `<div class="dl-series">${SERIES.type.toUpperCase()}${fl} · Игра ${st.gameNo}</div>`
      +   timerHtml()
      +   `<div class="dl-turn">${turnText()}</div>`
      + `</div>`
      + capHtml('red')
      + ctrlsHtml()
      + `</div>`
      + `<div class="dl-timerbar"><i style="width:${(!isDone()&&s)?'62%':'0'}"></i></div>`;
  }

  function capHtml(side){
    const team = teamOnSide(side);
    const t = TEAMS[team];
    const s = step();
    const active = !isDone() && s && s.side === side;
    const score = st.score[team] || 0;
    const cornerBans = (st.bans[side]||[]).map(n=>port(n,'mini')).join('')
      + Array.from({length:Math.max(0,5-(st.bans[side]||[]).length)}).map(()=>`<span class="dl-port mini empty">✕</span>`).join('');
    return `<div class="dl-cap dl-cap-${side}${active?' active':''}">`
      + `<div class="dl-cap-info"><div class="dl-cap-team">${t.name}</div><div class="dl-cap-nick">${t.cap}</div></div>`
      + `<div class="dl-cap-score">${score}</div>`
      + `<div class="dl-cap-minitimer">${fmtTime()}</div>`
      + `<div class="dl-cap-cornerbans">${cornerBans}</div>`
      + `</div>`;
  }

  function turnText(){
    if(isDone()) return 'Драфт игры завершён';
    const s = step();
    return `Ход: ${TEAMS[teamOnSide(s.side)].name} · ${s.action==='ban'?'бан':'выбор'}`;
  }

  function fmtTime(){ return isDone() ? '0' : '24'; }   // только секунды
  function timerHtml(){
    return `<div class="dl-timer">`
      + `<svg class="dl-timer-ring" viewBox="0 0 100 100" aria-hidden="true">`
      +   `<defs><linearGradient id="dlTGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0BC4E3"/><stop offset="1" stop-color="#C89B3C"/></linearGradient></defs>`
      +   `<circle class="bg" cx="50" cy="50" r="44"/><circle class="fg" cx="50" cy="50" r="44"/></svg>`
      + `<span class="dl-timer-num">${fmtTime()}</span></div>`;
  }

  function bansBarHtml(){
    const s = step();
    function row(side){
      let out='';
      for(let i=0;i<5;i++){
        const n=(st.bans[side]||[])[i];
        const activeBan=!isDone()&&s&&s.side===side&&s.action==='ban'&&s.idx===i;
        const showHover=activeBan&&st.hover;
        out+=`<div class="dl-bb-slot${activeBan?' active':''}">`+(n?port(n,'mini'):(showHover?port(st.hover,'mini ghost'):`<span class="dl-x">✕</span>`))+`</div>`;
      }
      return `<div class="dl-bb-side dl-bb-${side}">${out}</div>`;
    }
    return `<div class="dl-bansbar"><span class="dl-bb-lbl">Баны</span>${row('blue')}<span class="dl-bb-vs">5×5</span>${row('red')}<span class="dl-bb-lbl">Баны</span></div>`;
  }

  function sidePanelHtml(side){
    const picks=st.picks[side]||[], bans=st.bans[side]||[], s=step();
    let banRow=`<div class="dl-bans">`;
    for(let i=0;i<5;i++){
      const n=bans[i];
      const activeBan=!isDone()&&s&&s.side===side&&s.action==='ban'&&s.idx===i;
      const showHover=activeBan&&st.hover;
      banRow+=`<div class="dl-ban${activeBan?' active':''}">`+(n?port(n):(showHover?port(st.hover,'ghost'):`<span class="dl-x">✕</span>`))+`</div>`;
    }
    banRow+=`</div>`;
    let pickRows=`<div class="dl-picks">`;
    for(let i=0;i<5;i++){
      const n=picks[i];
      const activePick=!isDone()&&s&&s.side===side&&s.action==='pick'&&s.idx===i;
      const showHover=activePick&&st.hover;
      const champ=n||(showHover?st.hover:null);
      const wr=champ?CMAP[champ].wr:50;
      pickRows+=`<div class="dl-pick${activePick?' active':''}${showHover?' ghost':''}">`
        +(champ?port(champ):`<span class="dl-pick-num">${i+1}</span>`)
        +`<div class="dl-pick-meta"><span class="dl-pick-name">${champ||'—'}</span><span class="dl-pick-role">${ROLES[i]}</span></div>`
        +`<div class="dl-pick-wr"><i style="width:${champ?(wr+'%'):'0'}"></i></div></div>`;
    }
    pickRows+=`</div>`;
    return `<div class="dl-side dl-side-${side}">`
      +`<div class="dl-side-head"><span class="dl-side-dot"></span>${side==='blue'?'Синяя':'Красная'} · ${TEAMS[teamOnSide(side)].name}</div>`
      +banRow+pickRows+`</div>`;
  }

  function centerHtml(){
    return `<div class="dl-center">`
      + globalBansHtml() + rolesFilterHtml()
      + `<div class="dl-pool-wrap">`
      +   (S.pool==='fav' ? favStripHtml() : '')
      +   `<div class="dl-pool-main">`
      +     `<div class="dl-search">🔍 <input type="text" placeholder="Поиск чемпиона…" id="dlSearch"></div>`
      +     `<div class="dl-grid" id="dlGrid">${gridHtml()}</div>`
      +     lockBtnHtml()
      +   `</div>`
      + `</div></div>`;
  }

  function globalBansHtml(){
    const fl = fearlessUsed();
    let out = `<div class="dl-gbans">`;
    if(GLOBAL_BANS.length) out += `<span class="dl-gbans-lbl">⛔ Баны серии</span>` + GLOBAL_BANS.map(n=>port(n,'gban')).join('');
    if(SERIES.fearless) out += `<span class="dl-fearless-badge" title="Fearless: сыгранных чемпов нельзя брать снова">🔒 Fearless · использовано ${fl.size}</span>`;
    out += `</div>`;
    return out;
  }

  function rolesFilterHtml(){
    return `<div class="dl-roles">`
      + ROLE_TABS.map(rt=>`<button class="${rt.k===S.roleFilter?'on':''}" data-role="${rt.k}">${rt.t}</button>`).join('')
      + `</div>`;
  }

  function favStripHtml(){
    const fav=['Garen','Ahri','Jhin','Leona','Vi','Zed'];
    return `<div class="dl-fav"><div class="dl-fav-h">Мета / избранное</div>`
      + fav.map(n=>`<div class="dl-fav-item">${port(n,'mini')}<span>${n}</span><b>${CMAP[n].wr}%</b></div>`).join('')+`</div>`;
  }

  function gridHtml(){
    const used = usedSet(), fl = fearlessUsed();
    const list = CHAMPS.filter(c=>c.role===S.roleFilter);
    return list.map(c=>{
      const isFearless=fl.has(c.n)&&c.n!==st.hover;
      const isUsed=(used.has(c.n)||isFearless)&&c.n!==st.hover;
      const sel=c.n===st.hover;
      const cls='dl-cell'+(isUsed?' used':'')+(isFearless?' fearless':'')+(sel?' sel':'');
      const lock=isFearless?'<span class="dl-cell-lock">🔒</span>':'';
      return `<div class="${cls}" data-champ="${c.n}" title="${c.n} · ${c.role} · ${c.wr}% WR${isFearless?' · сыгран в прошлой игре (fearless)':''}">`
        + port(c.n)+lock+`<span class="dl-cell-name">${c.n}</span></div>`;
    }).join('');
  }

  function lockBtnHtml(){
    const s=step();
    if(isDone()) return `<button class="dl-lock done" disabled>✓ Драфт игры завершён</button>`;
    const label=s.action==='ban'?'Забанить':'Зафиксировать';
    const ready=!!st.hover;
    return `<button class="dl-lock${ready?' ready':''}" id="dlLock"${ready?'':' disabled'}>${st.hover?(label+' · '+st.hover):('Выбери чемпиона — '+label.toLowerCase())}</button>`;
  }

  /* ── Панель ПРОШЛЫХ игр серии (свапается под текущие стороны) ── */
  function pastGamesHtml(){
    if(S.past==='off' || !st.past.length) return '';
    const open = S.past==='expanded' || _pastOpen;
    const rows = st.past.map(g=>{
      // Каждую команду показываем на её ТЕКУЩЕЙ стороне (свап если в той игре было иначе)
      const swap = g.blueTeam !== st.blueTeam;
      const picksBlueNow = swap ? g.picks.red  : g.picks.blue;
      const picksRedNow  = swap ? g.picks.blue : g.picks.red;
      const bansBlueNow   = swap ? g.bans.red   : g.bans.blue;
      const bansRedNow    = swap ? g.bans.blue  : g.bans.red;
      const winnerSideNow = sideOfTeam(g.winner);   // на какой стороне СЕЙЧАС победитель
      const slot=n=> n?`<div class="dl-pg-slot">${port(n,'mini')}</div>`:`<div class="dl-pg-slot empty"></div>`;
      const banSlot=n=> n?`<div class="dl-pg-ban" title="${n}">${port(n,'mini')}</div>`:`<div class="dl-pg-ban empty">✕</div>`;
      const pad=a=>{const o=(a||[]).slice(0,5);while(o.length<5)o.push(null);return o;};
      return `<div class="dl-pg-row">`
        + `<div class="dl-pg-num">G${g.no}</div>`
        + `<div class="dl-pg-col blue${winnerSideNow==='blue'?' won':''}"><div class="dl-pg-bans">${bansBlueNow.map(banSlot).join('')}</div><div class="dl-pg-picks">${pad(picksBlueNow).map(slot).join('')}</div></div>`
        + `<div class="dl-pg-mid">${winnerSideNow==='blue'?'◀':''}<span class="dl-pg-w">G${g.no}</span>${winnerSideNow==='red'?'▶':''}</div>`
        + `<div class="dl-pg-col red${winnerSideNow==='red'?' won':''}"><div class="dl-pg-picks">${pad(picksRedNow).map(slot).join('')}</div><div class="dl-pg-bans">${bansRedNow.map(banSlot).join('')}</div></div>`
        + `</div>`;
    }).join('');
    const bs=st.score[teamOnSide('blue')]||0, rs=st.score[teamOnSide('red')]||0;
    const canToggle = S.past==='collapsed';
    return `<div class="dl-past${open?' open':''}">`
      + `<button class="dl-past-head"${canToggle?' id="dlPastToggle"':' disabled'}>`
      +   `<span class="dl-past-h-l">📜 Прошлые игры серии <span class="dl-past-cnt">${st.past.length}/${SERIES.type.toUpperCase()}</span></span>`
      +   `<span class="dl-past-h-r"><span class="dl-past-score"><b style="color:var(--blue)">${bs}</b>:<b style="color:var(--red)">${rs}</b></span>${canToggle?`<span class="dl-past-chev">${open?'▲':'▼'}</span>`:''}</span>`
      + `</button>`
      + `<div class="dl-past-body">${rows}</div></div>`;
  }

  /* ── Экран МЕЖДУ играми / итог серии ── */
  function bottomBarHtml(){
    if(!isDone()) return '';
    const blueT=teamOnSide('blue'), redT=teamOnSide('red');
    const score=`<div class="dl-bb-score"><span style="color:var(--blue)">${TEAMS[blueT].name} ${st.score[blueT]}</span><span style="color:var(--t3)"> : </span><span style="color:var(--red)">${st.score[redT]} ${TEAMS[redT].name}</span></div>`;
    if(st.seriesOver){
      const champ=st.score.A>=SERIES.targetWins?'A':'B';
      return `<div class="dl-betbar">`+score
        +`<div class="dl-bb-label">🏆 <b style="color:var(--gold)">${TEAMS[champ].name}</b> выигрывает серию!</div>`
        +`<div class="dl-bb-btns"><button class="dl-bb-btn finish" data-act="newseries">↺ Новая серия</button></div></div>`;
    }
    if(!st.winner){
      return `<div class="dl-betbar">`+score
        +`<div class="dl-bb-label">Игра ${st.gameNo} · кто победил?</div>`
        +`<div class="dl-bb-btns"><button class="dl-bb-btn blue" data-win="${blueT}">🔵 ${TEAMS[blueT].name}</button><button class="dl-bb-btn red" data-win="${redT}">🔴 ${TEAMS[redT].name}</button></div></div>`;
    }
    const loser=other(st.winner);
    return `<div class="dl-betbar">`+score
      +`<div class="dl-bb-label">🏆 <b style="color:${st.winner==='A'?'var(--blue)':'var(--red)'}">${TEAMS[st.winner].name}</b> победили в игре ${st.gameNo}</div>`
      +`<div class="dl-bb-sub"><b>${TEAMS[loser].name}</b> (проигравшие) выбирают сторону на игру ${st.gameNo+1}:</div>`
      +`<div class="dl-bb-btns"><button class="dl-bb-btn blue" data-next="blue">🔵 Синие (FP)</button><button class="dl-bb-btn red" data-next="red">🔴 Красные</button></div></div>`;
  }

  /* ══════════════ ПРОЧИЕ ОКНА (shell-модалка) ══════════════ */
  function shellHtml(sc){
    const tab=(v,t)=>`<button class="dl-mtab${sc===v?' active':''}" data-screen="${v}">${t}</button>`;
    const tabs=(sc==='drafts'||sc==='create')?`<div class="dl-mtabs">${tab('drafts','Мои драфты')}${tab('create','Создать лобби')}</div>`:'';
    let pane='';
    if(sc==='drafts') pane=draftsPaneHtml();
    else if(sc==='create') pane=createPaneHtml();
    else if(sc==='waiting') pane=waitingPaneHtml();
    const hdrLeft = (sc==='waiting')
      ? `<button class="dl-modal-back" data-screen="drafts">←</button>`
      : `<span class="dl-modal-ic">🎯</span>`;
    return `<div class="dl-modal">`
      + `<div class="dl-modal-hdr">${hdrLeft}<span class="dl-modal-t">Драфт (серии)</span></div>`
      + tabs
      + `<div class="dl-modal-pane">${pane}</div>`
      + `</div>`;
  }

  function lobbyCard(blue,red,meta,status,cls,score,target){
    return `<div class="dl-lc" data-screen="${target||'waiting'}">`
      + `<div class="dl-lc-main"><div class="dl-lc-teams"><span class="dl-lc-b">${blue}</span><span class="dl-lc-vs">vs</span><span class="dl-lc-r">${red}</span></div><div class="dl-lc-meta">${meta}</div></div>`
      + (score?`<div class="dl-lc-score">${score}</div>`:'')
      + `<div class="dl-lc-status ${cls}">${status}</div>`
      + `<span class="dl-lc-go" aria-hidden="true">›</span></div>`;
  }
  function draftsPaneHtml(){
    return `<div class="dl-list-block"><div class="dl-block-title">⚡ Активные лобби</div>`
      + lobbyCard('Cloud9','T1','Fearless · BO3 · сегодня 18:30','Идёт драфт','drafting','draft')
      + lobbyCard('Gen.G','DRX','Normal · BO5 · сегодня 17:00','Ожидание','waiting','waiting')
      + `</div>`
      + `<div class="dl-list-block"><div class="dl-block-title">📚 История серий</div>`
      + lobbyCard('KT','DK','Fearless · BO3 · вчера','Завершено','done','2:1','results')
      + lobbyCard('JDG','BLG','Normal · BO5 · 12.06','Завершено','done','3:2','results')
      + `</div>`;
  }

  function createPaneHtml(){
    const radio=(name,v,label,checked,col)=>`<label class="dl-radio"><input type="radio" name="${name}" value="${v}"${checked?' checked':''}><span${col?` style="color:${col}"`:''}>${label}</span></label>`;
    const players=()=>Array.from({length:5}).map((_,i)=>`<input class="dl-inp sm" placeholder="${i+1}">`).join('');
    return `<div class="dl-form">`
      + `<div class="dl-form-cols">`
      +   `<div class="dl-form-col">`
      +     `<div class="dl-field"><label>Режим</label><div class="dl-radio-row">${radio('cMode','normal','Обычный',true)}${radio('cMode','fearless','Fearless')}</div></div>`
      +     `<div class="dl-field"><label>Серия</label><select class="dl-inp"><option>Bo1</option><option selected>Bo3</option><option>Bo5</option><option>Bo7</option><option>Бесконечная (Fearless)</option></select></div>`
      +     `<div class="dl-field"><label>Таймер на ход, сек</label><div class="dl-radio-row">${radio('cTimer','30','30')}${radio('cTimer','45','45',true)}${radio('cTimer','60','60')}</div></div>`
      +     `<div class="dl-field"><label>Моя сторона</label><div class="dl-radio-row">${radio('cSide','blue','Синие',true,'var(--blue)')}${radio('cSide','red','Красные',false,'var(--red)')}</div></div>`
      +   `</div>`
      +   `<div class="dl-form-col">`
      +     `<div class="dl-field"><label>Название синей команды</label><input class="dl-inp" placeholder="Blue Team"></div>`
      +     `<div class="dl-field"><label>Игроки синих (опц.)</label><div class="dl-players">${players()}</div></div>`
      +     `<div class="dl-field"><label>Название красной команды</label><input class="dl-inp" placeholder="Red Team"></div>`
      +     `<div class="dl-field"><label>Игроки красных (опц.)</label><div class="dl-players">${players()}</div></div>`
      +   `</div>`
      + `</div>`
      + `<div class="dl-field"><label>⛔ Глобальные баны серии</label><div class="dl-gb-prev">${GLOBAL_BANS.map(n=>port(n,'mini')).join('')}</div><button class="dl-gb-btn" data-ov="picker">⛔ Выбрать глобальные баны</button></div>`
      + `<button class="dl-submit" data-screen="waiting">Создать лобби →</button>`
      + `</div>`;
  }

  function waitingPaneHtml(){
    function teamPanel(team,side){
      const t=TEAMS[team], ready=_ready[team];
      const players = side==='blue' ? ['Перкз','Бёрдфорс','Близ','Зэвен','Винсент'] : ['Faker','Оунер','Гумаюси','Керия','Доран'];
      return `<div class="dl-tp dl-tp-${side}${ready?' ready':''}">`
        + `<div class="dl-tp-h"><span>${side==='blue'?'🔵':'🔴'}</span><span class="dl-tp-name">${t.name}</span><span class="dl-tp-ready ${ready?'on':''}">${ready?'✓ Готов':'ожидание'}</span></div>`
        + `<div class="dl-tp-lbl">Капитан</div><div class="dl-tp-cap">${t.cap}</div>`
        + `<div class="dl-tp-lbl">Игроки</div><ol class="dl-tp-players">${players.map(p=>`<li>${p}</li>`).join('')}</ol>`
        + `<button class="dl-tp-readybtn" data-ready="${team}">${ready?'✓ Готов (отменить)':'✅ Готов'}</button>`
        + `</div>`;
    }
    const bothReady=_ready.A&&_ready.B;
    const sidePick = bothReady
      ? `<div class="dl-sidepick"><div class="dl-sidepick-t">Оба готовы — выбери сторону на 1-ю игру</div><div class="dl-sidepick-btns"><button class="dl-bb-btn blue" data-screen="draft">🔵 Синие (First Pick)</button><button class="dl-bb-btn red" data-screen="draft">🔴 Красные</button></div></div>`
      : `<div class="dl-sidepick muted">Нажмите «Готов» за обе команды — появится выбор стороны и старт</div>`;
    return `<div class="dl-wait">`
      + `<div class="dl-wait-bar"><span class="dl-wait-title">Cloud9 vs T1</span><span class="dl-wait-meta">Fearless · BO3 · ⏱45с</span></div>`
      + `<div class="dl-gbans"><span class="dl-gbans-lbl">⛔ Баны серии</span>${GLOBAL_BANS.map(n=>port(n,'gban')).join('')}</div>`
      + `<div class="dl-teams-grid">${teamPanel('A','blue')}${teamPanel('B','red')}</div>`
      + `<button class="dl-wait-invite" data-ov="invite">👥 Пригласить игрока</button>`
      + `<div class="dl-spec"><div class="dl-spec-h">👁 Зрители (1/12)</div><ul class="dl-spec-list"><li>Гость_42 <button class="dl-spec-x">✕</button></li></ul><button class="dl-spec-copy" data-ov="invite">🔗 Копировать ссылку</button></div>`
      + sidePick
      + `</div>`;
  }

  /* ══════════════ ОВЕРЛЕИ (поверх любого экрана) ══════════════ */
  function overlayHtml(){
    if(!_overlay) return '';
    let inner='';
    if(_overlay==='invite') inner=inviteOverlay();
    else if(_overlay==='picker') inner=pickerOverlay();
    else if(_overlay==='chat') inner=chatOverlay();
    else if(_overlay==='assist') inner=assistOverlay();
    else if(_overlay==='share') inner=shareOverlay();
    return `<div class="dl-ov-mask" id="dlOvMask"><div class="dl-ov">${inner}</div></div>`;
  }
  function inviteOverlay(){
    const users=[['ProMid','Мид','Diamond',1],['SuppGod','Сап','Master',1],['JglDiff','Лес','Plat',0],['AdcMain','АДК','Diamond',1],['TopOnly','Топ','Gold',0],['MidOrFeed','Мид','Master',1]];
    const rows=users.map(u=>`<div class="dl-usr"><div class="dl-usr-av">${u[0][0]}</div><div class="dl-usr-info"><b>${u[0]}</b><span>${u[1]} · ${u[2]}</span></div><span class="dl-usr-dot ${u[3]?'on':''}">${u[3]?'● онлайн':'оффлайн'}</span><div class="dl-usr-btns"><button class="dl-usr-b blue">🔵 Кэп</button><button class="dl-usr-b red">🔴 Кэп</button><button class="dl-usr-b">👁</button></div></div>`).join('');
    return `<div class="dl-ov-h">👥 Пригласить в лобби<button class="dl-ov-x" id="dlOvX">✕</button></div>`
      + `<input class="dl-inp" placeholder="🔍 Фильтр по нику">`
      + `<label class="dl-ov-chk"><input type="checkbox" checked> Только онлайн</label>`
      + `<div class="dl-usr-list">${rows}</div>`;
  }
  function pickerOverlay(){
    const cells=CHAMPS.map(c=>`<div class="dl-pk-cell">${port(c.n)}<span>${c.n}</span></div>`).join('');
    return `<div class="dl-ov-h">⛔ Глобальные баны серии<button class="dl-ov-x" id="dlOvX">✕</button></div>`
      + `<input class="dl-inp" placeholder="🔍 Поиск чемпиона">`
      + `<div class="dl-pk-grid">${cells}</div>`
      + `<button class="dl-submit" id="dlOvDone">Готово</button>`;
  }
  function chatOverlay(){
    const msgs=[['Перкз','го на ready','me'],['Faker','секунду, баны гляну','x'],['Перкз','+','me'],['Гость_42','удачи!','x']];
    return `<div class="dl-ov-h">💬 Чат лобби<button class="dl-ov-x" id="dlOvX">✕</button></div>`
      + `<div class="dl-chat-msgs">${msgs.map(m=>`<div class="dl-msg ${m[2]==='me'?'mine':''}"><b>${m[0]}</b><span>${m[1]}</span></div>`).join('')}</div>`
      + `<div class="dl-chat-inp"><input class="dl-inp" placeholder="Сообщение…"><button class="dl-chat-send">➤</button></div>`;
  }
  function assistOverlay(){
    const sug=[['Malphite','контрит вражеский AD-топ','Соло'],['Lulu','усиливает кэрри (щит+ульта)','Сап'],['Amumu','тимфайт-ульта под состав','Лес']];
    return `<div class="dl-ov-h">🤖 Драфт-помощник<button class="dl-ov-x" id="dlOvX">✕</button></div>`
      + `<div class="dl-assist-note">Подсказки на основе текущих пиков/банов (демо):</div>`
      + `<div class="dl-assist-list">${sug.map(s=>`<div class="dl-assist-row">${port(s[0],'mini')}<div class="dl-assist-info"><b>${s[0]}</b><span>${s[1]}</span></div><span class="dl-assist-role">${s[2]}</span></div>`).join('')}</div>`;
  }
  function shareOverlay(){
    const g=st.past[0];
    const mini=(arr)=>arr.slice(0,5).map(n=>port(n,'mini')).join('');
    return `<div class="dl-ov-h">📷 Поделиться драфтом<button class="dl-ov-x" id="dlOvX">✕</button></div>`
      + `<div class="dl-share-card">`
      +   `<div class="dl-share-row blue"><span>${TEAMS.A.name}</span><div>${mini(g.picks.blue)}</div></div>`
      +   `<div class="dl-share-vs">G${g.no} · ${SERIES.type.toUpperCase()}</div>`
      +   `<div class="dl-share-row red"><span>${TEAMS.B.name}</span><div>${mini(g.picks.red)}</div></div>`
      + `</div>`
      + `<div class="dl-share-link"><input class="dl-inp" value="pro-wildrift.com/draft/abc123" readonly><button class="dl-share-copy">Копировать</button></div>`
      + `<div class="dl-share-btns"><button class="dl-submit">⬇ Скачать картинку</button></div>`;
  }

  /* ══════════════ ВЫБОР РЕЖИМА (входная дверь объединённого драфтера) ══════════════ */
  function modeHtml(){
    return `<div class="dl-mode">`
      + `<div class="dl-mode-h">🎯 Драфтер</div>`
      + `<div class="dl-mode-sub">Тренируй драфт соло или собери серию с командой</div>`
      + `<div class="dl-mode-cards">`
      +   `<button class="dl-mode-card" data-screen="solo"><span class="dl-mode-ic">🎯</span><b>Соло-тренировка</b><span>Драфт один, с подсказками контрпиков. Без входа, сразу.</span></button>`
      +   `<button class="dl-mode-card" data-screen="drafts"><span class="dl-mode-ic">👥</span><b>Серия с командой</b><span>Онлайн пик/бан капитан vs капитан · Bo3/5/7 · fearless · зрители.</span></button>`
      + `</div></div>`;
  }

  /* ══════════════ СОЛО-ДРАФТ (тренировка + подсказки контрпиков) ══════════════ */
  function soloUsed(){ return new Set([].concat(solo.me, solo.opp).concat(GLOBAL_BANS)); }
  function soloColHtml(who){
    const arr = solo[who];
    const label = who==='me' ? 'Ты' : 'Соперник';
    const side = who==='me' ? 'blue' : 'red';
    let rows='';
    for(let i=0;i<5;i++){
      const n=arr[i];
      rows+=`<div class="dl-pick${(!n&&_soloFill===who&&i===arr.length)?' active':''}">`
        +(n?port(n):`<span class="dl-pick-num">${i+1}</span>`)
        +`<div class="dl-pick-meta"><span class="dl-pick-name">${n||'—'}</span><span class="dl-pick-role">${ROLES[i]}</span></div></div>`;
    }
    return `<div class="dl-side dl-side-${side}"><div class="dl-side-head"><span class="dl-side-dot"></span>${label}</div><div class="dl-picks">${rows}</div></div>`;
  }
  function soloHintsHtml(){
    // демо-подсказки: топ-WR свободные чемпы под пустые роли + «причина»
    const used=soloUsed();
    const reasons=['силён против вражеского состава','высокий WR на патче','перформит против их керри','безопасный блайнд-пик','контрит их инициацию'];
    const free=CHAMPS.filter(c=>!used.has(c.n)).sort((a,b)=>b.wr-a.wr).slice(0,5);
    return `<div class="dl-hints"><div class="dl-hints-h">💡 Подсказки</div>`
      + free.map((c,i)=>`<div class="dl-hint" data-pick="${c.n}">${port(c.n,'mini')}<div class="dl-hint-info"><b>${c.n}</b><span>${reasons[i%reasons.length]}</span></div><b class="dl-hint-wr">${c.wr}%</b></div>`).join('')
      + `</div>`;
  }
  function soloGridHtml(){
    const used=soloUsed();
    return CHAMPS.filter(c=>c.role===S.roleFilter).map(c=>{
      const u=used.has(c.n);
      return `<div class="dl-cell${u?' used':''}" data-solo="${c.n}" title="${c.n} · ${c.wr}% WR">${port(c.n)}<span class="dl-cell-name">${c.n}</span></div>`;
    }).join('');
  }
  function soloHtml(){
    return `<div class="dl-hdr dl-hdr-solo">`
      + `<div class="dl-solo-title">🎯 Соло-тренировка <span class="dl-solo-sub">тренируй пики/баны, тул подсказывает контрпики</span></div>`
      + `<div class="dl-solo-fill">Заполняю: <button class="dl-fillbtn${_soloFill==='me'?' on':''}" data-fill="me">Ты</button><button class="dl-fillbtn${_soloFill==='opp'?' on':''}" data-fill="opp">Соперник</button></div>`
      + `<button class="dl-cbtn" data-soloreset="1" title="Сброс">↺</button>`
      + `</div>`
      + `<div class="dl-board dl-board-solo">`
      +   soloColHtml('me')
      +   `<div class="dl-center"><div class="dl-roles">`+ROLE_TABS.map(rt=>`<button class="${rt.k===S.roleFilter?'on':''}" data-role="${rt.k}">${rt.t}</button>`).join('')+`</div>`
      +     `<div class="dl-pool-wrap"><div class="dl-pool-main"><div class="dl-search">🔍 <input type="text" placeholder="Поиск чемпиона…" id="dlSearch"></div><div class="dl-grid" id="dlSoloGrid">${soloGridHtml()}</div></div>${soloHintsHtml()}</div>`
      +   `</div>`
      +   soloColHtml('opp')
      + `</div>`;
  }

  /* ══════════════ РЕЗУЛЬТАТЫ СЕРИИ (все игры: пики+баны обеих сторон, кто выиграл, со свапами) ══════════════ */
  function resultsHtml(){
    // Каждую игру показываем КАК ИГРАЛИ: команда на той стороне, где была в той игре
    // (видно свапы — в G1 команда синяя, в G2 красная и т.п.).
    const rows = st.past.map(g=>{
      const blueTeam=g.blueTeam, redTeam=other(g.blueTeam);
      const winSide = g.winner===blueTeam ? 'blue' : 'red';
      function block(side,team,picks,bans){
        const win = winSide===side;
        return `<div class="dl-res-block ${side}${win?' won':''}">`
          + `<div class="dl-res-team">${side==='blue'?'🔵':'🔴'} ${TEAMS[team].name}${win?' <span class="dl-res-win">🏆</span>':''}</div>`
          + `<div class="dl-res-bans">${(bans||[]).map(n=>port(n,'mini')).join('')}</div>`
          + `<div class="dl-res-picks">${(picks||[]).map(n=>port(n)).join('')}</div>`
          + `</div>`;
      }
      return `<div class="dl-res-row">`
        + `<div class="dl-res-num">Игра ${g.no}</div>`
        + block('blue', blueTeam, g.picks.blue, g.bans.blue)
        + `<div class="dl-res-vs">VS</div>`
        + block('red', redTeam, g.picks.red, g.bans.red)
        + `</div>`;
    }).join('');
    return `<div class="dl-hdr dl-hdr-solo">`
      + `<button class="dl-modal-back" data-screen="drafts">←</button>`
      + `<div class="dl-solo-title">📜 Результаты серии <span class="dl-solo-sub">${SERIES.type.toUpperCase()} · ${TEAMS.A.name} ${st.score.A}–${st.score.B} ${TEAMS.B.name}</span></div>`
      + `<button class="dl-cbtn" data-ov="share" title="Поделиться">📷</button>`
      + `</div>`
      + `<div class="dl-results">${rows||'<div class="dl-res-empty">Игр пока нет</div>'}</div>`;
  }

  function ctrlsHtml(){
    const btn=(k,ic,title,prio)=>`<button class="dl-cbtn${prio?' prio':''}" data-k="${k}" title="${title}">${ic}</button>`;
    return `<div class="dl-ctrls" id="dlCtrls">`
      + `<button class="dl-ctrls-toggle" id="dlCtrlsToggle" title="Меню">⋯</button>`
      + `<div class="dl-ctrls-list">`
      +   btn('chat','💬','Чат лобби')+btn('sound',S.sound?'🔊':'🔇','Звук')+btn('assist','🤖','Драфт-помощник')
      +   btn('spec','👁 3','Зрители')+btn('settings','⚙','Настройки')+btn('pause',S.paused?'▶':'⏸','Пауза',true)+btn('close','✕','Закрыть',true)
      + `</div></div>`;
  }

  function settingsHtml(){
    if(!_settingsOpen) return '';
    function seg(key,items){
      return `<div class="dl-set-seg" data-set="${key}">`+items.map(it=>`<button data-v="${it.v}" class="${S[key]===it.v?'on':''}">${it.t}</button>`).join('')+`</div>`;
    }
    return `<div class="dl-settings-mask" id="dlSetMask"><div class="dl-settings">`
      + `<div class="dl-settings-h"><span>⚙ Настройки</span><button class="dl-settings-x" id="dlSetX">✕</button></div>`
      + `<div class="dl-set-row"><span>Размер чемпионов</span>${seg('champSize',[{v:'s',t:'S'},{v:'m',t:'M'},{v:'l',t:'L'}])}</div>`
      + `<div class="dl-set-row"><span>Имя чемпиона</span>${seg('cellname',[{v:'under',t:'Видно'},{v:'hover',t:'Ховер'},{v:'hide',t:'Скрыть'}])}</div>`
      + `<div class="dl-set-row"><span>Звук</span>${seg('sound',[{v:true,t:'Вкл'},{v:false,t:'Выкл'}])}</div>`
      + `<div class="dl-set-note">Это настройки игрока (в боевом — в шестерёнке драфтера). Верхняя панель — наша, для подбора дизайна.</div>`
      + `</div></div>`;
  }

  /* ══════════════ СОБЫТИЯ ══════════════ */
  function wire(){
    const grid=$('#dlGrid');
    if(grid){
      grid.querySelectorAll('.dl-cell:not(.used)').forEach(cell=>{
        cell.onclick=()=>{ if(isDone())return; st.hover=(st.hover===cell.dataset.champ)?null:cell.dataset.champ; render(); };
      });
    }
    const search=$('#dlSearch'), gridEl=$('#dlGrid')||$('#dlSoloGrid');
    if(search&&gridEl){ search.oninput=()=>{ const q=search.value.trim().toLowerCase(); gridEl.querySelectorAll('.dl-cell').forEach(c=>{ const nm=(c.dataset.champ||c.dataset.solo||'').toLowerCase(); c.style.display=nm.includes(q)?'':'none'; }); }; }
    frame.querySelectorAll('.dl-roles button').forEach(b=>{ b.onclick=()=>{ S.roleFilter=b.dataset.role; render(); }; });
    // СОЛО-драфт
    frame.querySelectorAll('[data-solo]').forEach(c=>{ if(c.classList.contains('used'))return; c.onclick=()=>{ if(solo[_soloFill].length<5) solo[_soloFill].push(c.dataset.solo); render(); }; });
    frame.querySelectorAll('[data-pick]').forEach(el=>{ el.onclick=()=>{ if(solo[_soloFill].length<5) solo[_soloFill].push(el.dataset.pick); render(); }; });
    frame.querySelectorAll('[data-fill]').forEach(b=>{ b.onclick=()=>{ _soloFill=b.dataset.fill; render(); }; });
    const sr=frame.querySelector('[data-soloreset]'); if(sr) sr.onclick=()=>{ solo={me:[],opp:[]}; render(); };
    const sc=frame.querySelector('.dl-share-copy'); if(sc) sc.onclick=()=>toast('Ссылка скопирована');
    const lock=$('#dlLock'); if(lock) lock.onclick=lockIn;
    frame.querySelectorAll('.dl-cbtn').forEach(b=>{ if(b.dataset.k) b.onclick=()=>handleCtrl(b.dataset.k); });
    const tg=$('#dlCtrlsToggle'); if(tg) tg.onclick=()=>$('#dlCtrls').classList.toggle('open');
    const pt=$('#dlPastToggle'); if(pt) pt.onclick=()=>{ _pastOpen=!_pastOpen; render(); };
    // навигация между окнами (вкладки/карточки/кнопки с data-screen)
    frame.querySelectorAll('[data-screen]').forEach(el=>{ el.onclick=()=>gotoScreen(el.dataset.screen); });
    // открыть оверлей (data-ov внутри кадра)
    frame.querySelectorAll('[data-ov]').forEach(el=>{ el.onclick=(e)=>{ e.stopPropagation(); _overlay=el.dataset.ov; render(); }; });
    // кнопки «Готов» в комнате ожидания
    frame.querySelectorAll('[data-ready]').forEach(el=>{ el.onclick=(e)=>{ e.stopPropagation(); const t=el.dataset.ready; _ready[t]=!_ready[t]; render(); }; });
    // закрытие оверлея
    const ovMask=$('#dlOvMask');
    if(ovMask){
      ovMask.onclick=e=>{ if(e.target===ovMask){ _overlay=null; render(); } };
      const ox=$('#dlOvX'); if(ox) ox.onclick=()=>{ _overlay=null; render(); };
      const od=$('#dlOvDone'); if(od) od.onclick=()=>{ _overlay=null; render(); };
    }
    // экран между играми
    frame.querySelectorAll('.dl-bb-btn[data-win]').forEach(b=>{ b.onclick=()=>pickWinner(b.dataset.win); });
    frame.querySelectorAll('.dl-bb-btn[data-next]').forEach(b=>{ b.onclick=()=>nextGame(b.dataset.next); });
    frame.querySelectorAll('.dl-bb-btn[data-act="newseries"]').forEach(b=>{ b.onclick=()=>{ st=initState(); render(); toast('Новая серия'); }; });
    // ⚙ настройки
    const setMask=$('#dlSetMask');
    if(setMask){
      setMask.onclick=e=>{ if(e.target===setMask){ _settingsOpen=false; render(); } };
      const sx=$('#dlSetX'); if(sx) sx.onclick=()=>{ _settingsOpen=false; render(); };
      frame.querySelectorAll('.dl-set-seg').forEach(seg=>{
        seg.addEventListener('click',e=>{
          const b=e.target.closest('button[data-v]'); if(!b) return;
          let v=b.dataset.v; if(v==='true')v=true; else if(v==='false')v=false;
          S[seg.dataset.set]=v; applyVariants();
        });
      });
    }
  }

  function lockIn(){
    if(isDone()||!st.hover) return;
    const s=step();
    if(s.action==='ban') st.bans[s.side][s.idx]=st.hover; else st.picks[s.side][s.idx]=st.hover;
    st.hover=null; st.turnIndex++;
    if(S.sound) beep();
    render();
    if(isDone()) toast('Драфт игры завершён 🎉');
  }

  // Победитель игры → записываем игру в прошлые, счёт, проверяем конец серии
  function pickWinner(team){
    st.winner=team;
    st.past.push({ no:st.gameNo, blueTeam:st.blueTeam, winner:team,
      picks:{ blue:st.picks.blue.slice(), red:st.picks.red.slice() },
      bans: { blue:st.bans.blue.slice(),  red:st.bans.red.slice() } });
    st.score[team]=(st.score[team]||0)+1;
    if(st.score[team]>=SERIES.targetWins) st.seriesOver=true;
    render();
  }

  // Следующая игра: проигравший выбрал сторону → СВАП + чистый драфт новой карты
  function nextGame(chosenSide){
    const loser=other(st.winner);
    const newBlueTeam = chosenSide==='blue' ? loser : st.winner;
    st.gameNo++;
    st.blueTeam=newBlueTeam;
    st.turnIndex=0; st.hover=null; st.winner=null;
    st.bans={blue:[],red:[]}; st.picks={blue:[],red:[]};
    render();
    toast(`Игра ${st.gameNo}: ${TEAMS[newBlueTeam].name} на синей стороне`);
  }

  function handleCtrl(k){
    if(k==='settings'){ _settingsOpen=!_settingsOpen; render(); return; }
    if(k==='sound'){ S.sound=!S.sound; render(); toast(S.sound?'Звук вкл':'Звук выкл'); return; }
    if(k==='pause'){ S.paused=!S.paused; render(); toast(S.paused?'Пауза':'Продолжаем'); return; }
    if(k==='close'){ toast('Закрытие (мок)'); return; }
    if(k==='chat'){ toast('Чат лобби (мок)'); return; }
    if(k==='spec'){ toast('Зрители: 3 (мок)'); return; }
    if(k==='assist'){ toast('Драфт-помощник (мок)'); return; }
  }

  let _ac=null;
  function beep(){
    try{
      const AC=window.AudioContext||window.webkitAudioContext; if(!AC)return;
      _ac=_ac||new AC();
      const o=_ac.createOscillator(),g=_ac.createGain();
      o.type='triangle'; o.frequency.value=720;
      g.gain.setValueAtTime(0.0001,_ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.14,_ac.currentTime+0.01);
      g.gain.exponentialRampToValueAtTime(0.0001,_ac.currentTime+0.12);
      o.connect(g).connect(_ac.destination); o.start(); o.stop(_ac.currentTime+0.14);
    }catch(e){}
  }

  /* ══════════════ INIT ══════════════ */
  $('#dlMinBtn').onclick=()=>{
    document.body.classList.toggle('dl-min');
    $('#dlMinBtn').textContent=document.body.classList.contains('dl-min')?'Развернуть панель':'Свернуть панель';
  };
  buildControls();
  applyVariants();

  if(window.LabSettings){
    window.LabSettings.attach({
      id:'drafter', defaults:DEFAULTS, mount:'#labTools',
      getState:function(){ return S; },
      apply:function(s){ Object.assign(S, DEFAULTS, s); buildControls(); applyVariants(); }
    });
  }
})();
