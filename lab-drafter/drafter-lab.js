/* ══════════════════════════════════════════════════════════
   lab-drafter · драфтер по ФИНАЛЬНОМУ КАНОНУ (DESIGN.md 2026-07-13)
   ТРИ РЕЖИМА: Соло (тренировка) · AI-соперник (тренажёр) · Кооп/Серии (люди, fearless).
   Драфтер = ФУЛЛСКРИН-РАЗДЕЛ (рельс сворачивается), НЕ модалка.
   КООП: когда драфт начался — «клетка», выхода нет (data-no-esc).
   Чат-панель справа = ОВЕРЛЕЙ поверх драфтера, вкладка «ДРАФТ» = участники + зрители.
   ВСЕ данные — ДЕМО (помечено).

   ═══ ОБЯЗАТЕЛЬНО ПРИ ПОРТЕ В БОЕВОЙ: НЕ ТАЩИТЬ ДЁРГАНЬЕ ═══
   «Весь экран дёргается при любом нажатии» — ОДНА болезнь по всему старому коду. НЕ тащи:
   1. Анимацию появления на ПОСТОЯННОМ блоке (шапка, доска, панель, рельс). Появление —
      только модалке/попапу/тосту/НОВОМУ элементу списка. (Тут: fade только на .glass через
      .anim-in, и только при СМЕНЕ экрана — см. render(), _lastScreen.)
   2. Вечные (infinite) декоративные анимации: пульсация/свечение/блик/градиент-по-тексту.
      infinite можно только функциональному: спиннер, «твой ход», непрочитанное (ограничить).
      (Тут: pulse/glow подсветки хода — функциональны, висят только на активном слоте.)
   3. display:none → обратно ПЕРЕЗАПУСКАЕТ CSS-анимацию. Блок, что прячется при смене вкладки,
      анимацию появления носить НЕ МОЖЕТ.
   4. Принудительный перезапуск (void offsetWidth между remove/add класса) — только единичному
      РЕАЛЬНО появившемуся элементу, НИКОГДА на контейнер. (Тут: только на #dlFrame при смене экрана.)
   5. Перерисовку всего ради одного: не innerHTML на весь контейнер на каждый клик/букву/тумблер.
      ПРИЁМКА СЧЁТЧИКОМ: пометь узлы, сделай действие, посчитай сколько выжило («N/N пережили клик»).
   ГОЧА: transform/will-change/filter/contain УБИВАЮТ backdrop-filter → трансформ на ОБЁРТКЕ,
   стекло на статичном слое. opacity<1 у ПРЕДКА тоже убивает стекло у потомка.
   ══════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  /* ── Боевая последовательность драфта ── */
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
  const ROLE_TABS = [{k:'Соло',t:'Top'},{k:'Лес',t:'Jng'},{k:'Мид',t:'Mid'},{k:'АДК',t:'Adc'},{k:'Сап',t:'Sup'}];

  /* ── Чемпионы (ДЕМО). dmg = AD/AP · tags: tank(фронтлайн) cc(контроль) early/late(фаза) ── */
  function C(n,i,g,role,wr,dmg,tags){ return {n,i,g,role,wr,dmg,tags:tags.split(' ')}; }
  const CHAMPS = [
    C('Aatrox','A','linear-gradient(135deg,#e74c3c,#7a1d12)','Соло',52,'AD','cc'),
    C('Camille','C','linear-gradient(135deg,#c0c0c0,#5a5a6e)','Соло',49,'AD','cc late'),
    C('Darius','D','linear-gradient(135deg,#b03030,#3a0a0a)','Соло',53,'AD','early'),
    C('Garen','G','linear-gradient(135deg,#4aa3ff,#103a6e)','Соло',55,'AD','tank early'),
    C('Malphite','M','linear-gradient(135deg,#7ac0a0,#1a4a3a)','Соло',53,'AP','tank cc late'),
    C('Nasus','N','linear-gradient(135deg,#d4a050,#5a3a10)','Соло',51,'AD','tank late'),
    C('Renekton','Re','linear-gradient(135deg,#d06a3a,#5a2208)','Соло',50,'AD','cc early'),
    C('Riven','R','linear-gradient(135deg,#7ab0d0,#2a4a6e)','Соло',49,'AD','cc early'),
    C('Sett','St','linear-gradient(135deg,#e06a6a,#5a1a1a)','Соло',52,'AD','tank cc'),
    C('Fiora','F','linear-gradient(135deg,#c97a8a,#4a1a2a)','Соло',50,'AD','late'),
    C('Jax','Jx','linear-gradient(135deg,#9a8a4a,#3a3010)','Соло',51,'AD','late'),
    C('Mordekaiser','Mo','linear-gradient(135deg,#6a4a8a,#2a1040)','Соло',52,'AP','tank'),
    C('Amumu','Am','linear-gradient(135deg,#2ecc71,#145a32)','Лес',54,'AP','tank cc'),
    C('Vi','V','linear-gradient(135deg,#e08a3a,#5a2a0a)','Лес',50,'AD','cc'),
    C('LeeSin','Le','linear-gradient(135deg,#c08a3a,#4a2a08)','Лес',51,'AD','early'),
    C('Khazix','Kh','linear-gradient(135deg,#5a4a8a,#1a1040)','Лес',52,'AD','early'),
    C('Hecarim','He','linear-gradient(135deg,#3a8a7a,#0a3a30)','Лес',51,'AD','cc'),
    C('Graves','Gr','linear-gradient(135deg,#8a6a4a,#3a2010)','Лес',50,'AD','early'),
    C('Kayn','Ka','linear-gradient(135deg,#c03a5a,#3a0a1a)','Лес',52,'AD','late'),
    C('Rengar','Rg','linear-gradient(135deg,#c0903a,#4a3008)','Лес',49,'AD','early'),
    C('Ahri','Ah','linear-gradient(135deg,#ff63a4,#7a1d4a)','Мид',51,'AP','cc'),
    C('Akali','Ak','linear-gradient(135deg,#27c4a8,#0a4a40)','Мид',50,'AP','late'),
    C('Katarina','Kt','linear-gradient(135deg,#e0506a,#5a0a1a)','Мид',48,'AP','late'),
    C('Yasuo','Y','linear-gradient(135deg,#6ab0c0,#1a3a4a)','Мид',50,'AD','late'),
    C('Zed','Z','linear-gradient(135deg,#5a6ac0,#1a1a4a)','Мид',51,'AD','early'),
    C('Ziggs','Zg','linear-gradient(135deg,#e0d050,#5a4a10)','Мид',49,'AP','late'),
    C('Orianna','Or','linear-gradient(135deg,#5aa0c0,#1a3a4a)','Мид',50,'AP','cc late'),
    C('Syndra','Sy','linear-gradient(135deg,#9a5ac0,#3a1050)','Мид',51,'AP','cc late'),
    C('Ashe','As','linear-gradient(135deg,#7ec8e3,#1a4a66)','АДК',50,'AD','cc early'),
    C('Ezreal','E','linear-gradient(135deg,#f3d65a,#7a5a10)','АДК',49,'AD',''),
    C('Jhin','J','linear-gradient(135deg,#d44a6a,#3a0a1a)','АДК',51,'AD','cc'),
    C('Jinx','Ji','linear-gradient(135deg,#ff7ac0,#5a1a6e)','АДК',50,'AD','late'),
    C('Caitlyn','Ca','linear-gradient(135deg,#c0a060,#4a3818)','АДК',51,'AD','early'),
    C('MissFortune','MF','linear-gradient(135deg,#e07a4a,#5a2208)','АДК',52,'AD',''),
    C('Kaisa','Ks','linear-gradient(135deg,#a060c0,#3a1050)','АДК',53,'AD','late'),
    C('Tristana','Tr','linear-gradient(135deg,#5ac08a,#1a4a30)','АДК',50,'AD','late'),
    C('Leona','L','linear-gradient(135deg,#f0b84a,#7a4a10)','Сап',52,'AP','tank cc early'),
    C('Thresh','Th','linear-gradient(135deg,#3ad0b0,#0a3a4a)','Сап',51,'AP','tank cc'),
    C('Nautilus','Nt','linear-gradient(135deg,#3a8fb0,#0a2a3a)','Сап',50,'AP','tank cc'),
    C('Lulu','Lu','linear-gradient(135deg,#c08ad0,#3a1050)','Сап',51,'AP','cc late'),
    C('Janna','Ja','linear-gradient(135deg,#8ad0e0,#1a4a5a)','Сап',50,'AP','cc late'),
    C('Nami','Na','linear-gradient(135deg,#4a9ac0,#0a3a4a)','Сап',52,'AP','cc'),
    C('Pyke','Py','linear-gradient(135deg,#3a6a7a,#0a1a2a)','Сап',51,'AD','cc'),
  ];
  const CMAP = Object.fromEntries(CHAMPS.map(c=>[c.n,c]));
  const has = (c,t)=>c.tags.indexOf(t)>-1;
  const port = (name,extra)=>{
    const c = CMAP[name];
    if(!c) return `<span class="dl-port${extra?' '+extra:''}"></span>`;
    return `<span class="dl-port${extra?' '+extra:''}" style="background:${c.g}">${c.i}</span>`;
  };

  /* ── Сплэш-арт (один глобальный, за стеклом) ── */
  const DD = 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/';
  const SPLASHES = {
    thresh:`url('${DD}Thresh_0.jpg')`, lux:`url('${DD}Lux_0.jpg')`,
    yasuo:`url('${DD}Yasuo_0.jpg')`, ahri:`url('${DD}Ahri_0.jpg')`, zed:`url('${DD}Zed_0.jpg')`,
    brand:`radial-gradient(ellipse at 22% 8%,rgba(255, 255, 255,.30),transparent 55%),radial-gradient(ellipse at 80% 92%,rgba(200,155,60,.24),transparent 55%),linear-gradient(135deg,#02121f,#0a0617)`,
  };

  /* ══════════════ ВАРИАНТЫ (дев-полоса) ══════════════ */
  const OPTS = {
    screen:{label:'Экран', val:'mode', items:[
      {v:'mode',t:'Выбор режима'},{v:'solo',t:'Соло'},{v:'ai',t:'AI-соперник'},
      {v:'authgate',t:'Вход (гейт)'},{v:'drafts',t:'Мои лобби'},{v:'create',t:'Создать'},
      {v:'waiting',t:'Ожидание'},{v:'draft',t:'Драфт серии'},{v:'results',t:'Результаты'},
    ]},
    timer:{label:'Таймер', val:'num', items:[
      {v:'num',t:'Число'},{v:'ring',t:'Кольцо'},{v:'bar',t:'Полоса'},
    ]},
    bans:{label:'Баны', val:'sides', items:[
      {v:'top',t:'Сверху полосой'},{v:'sides',t:'По бокам'},
    ]},
    portsize:{label:'Размер портретов', val:'m', items:[
      {v:'s',t:'S'},{v:'m',t:'M'},{v:'l',t:'L'},
    ]},
    density:{label:'Плотность', val:'normal', items:[
      {v:'cozy',t:'Просторно'},{v:'normal',t:'Средне'},{v:'compact',t:'Плотно'},
    ]},
    picker:{label:'Позиция пикера', val:'center', items:[
      {v:'center',t:'Центр'},{v:'bottom',t:'Снизу'},{v:'right',t:'Справа'},
    ]},
    turnfx:{label:'Подсветка стороны', val:'pulse', items:[
      {v:'pulse',t:'Пульс'},{v:'glow',t:'Свечение'},{v:'spotlight',t:'Глушить соперника'},
    ]},
    tourney:{label:'Турнирная раскладка (трансляция)', val:'off', items:[
      {v:'off',t:'Обычная'},{v:'cams-center',t:'Вебки сверху'},{v:'theater',t:'Студия (по бокам)'},
      {v:'lower-third',t:'Нижняя треть'},{v:'stacked',t:'Вертикаль (стрим)'},
    ]},
    bg:{label:'Сплэш', val:'thresh', items:[
      {v:'thresh',t:'Thresh (тёмн.)'},{v:'lux',t:'Lux (светл.)'},{v:'yasuo',t:'Yasuo'},
      {v:'ahri',t:'Ahri'},{v:'zed',t:'Zed'},{v:'brand',t:'Бренд'},
    ]},
    bgdim:{label:'Затемнение фона', val:'off', items:[
      {v:'off',t:'Нет'},{v:'light',t:'Лёгкое'},{v:'medium',t:'Среднее'},
    ]},
    fearless:{label:'Fearless-локи', val:'picksbans', items:[
      {v:'picks',t:'Только пики'},{v:'picksbans',t:'Пики + баны'},
    ]},
  };
  // какая настройка на каком экране видна (остальные = общие)
  const SCOPE = {
    timer:['draft','ai'], bans:['draft','ai'], picker:['draft','ai','solo'],
    turnfx:['draft','ai'], fearless:['draft'], tourney:['draft','ai'],
  };

  /* ══════════════ ФИЧИ — ТУМБЛЕРЫ ВКЛ/ВЫКЛ ══════════════ */
  const FEATS = [
    {k:'ai',         t:'1 · AI-соперник',        on:true },
    {k:'tips',       t:'2 · Подсказки в драфте', on:true },
    {k:'analysis',   t:'3 · Анализ состава',     on:true },
    {k:'spectators', t:'4 · Зрители',            on:true },
    {k:'share',      t:'5 · Шаринг + реплей',    on:true },
    {k:'import',     t:'6 · Импорт состава',     on:true },
    {k:'roles',      t:'7 · Роли-слоты',         on:true },
  ];
  const F = {};
  FEATS.forEach(f=>F[f.k]=f.on);

  const S = {};
  Object.keys(OPTS).forEach(k=>S[k]=OPTS[k].val);
  S.roleFilter = 'Соло';

  /* ══════════════ СОСТОЯНИЕ ══════════════ */
  const TEAMS = { A:{name:'Cloud9',cap:'Перкз'}, B:{name:'T1',cap:'Faker'} };
  const other = t => t==='A' ? 'B' : 'A';
  const SERIES = { type:'bo3', fearless:true, targetWins:2 };
  const GLOBAL_BANS = ['Camille','Veigar'];

  function initState(){
    return {
      gameNo:3, blueTeam:'A', score:{A:1,B:1}, seriesOver:false,
      past:[
        { no:1, blueTeam:'A', winner:'A',
          picks:{ blue:['Garen','Amumu','Ahri','Jhin','Leona'], red:['Darius','Vi','Zed','Caitlyn','Thresh'] },
          bans: { blue:['Aatrox','Akali','Katarina'],          red:['Yasuo','Jinx','Nautilus'] } },
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

  // Соло / AI — отдельное лёгкое состояние (без серии)
  function initTrain(){ return { turnIndex:0, hover:null, bans:{blue:[],red:[]}, picks:{blue:[],red:[]} }; }
  let tr = initTrain();
  let _soloFill = 'blue';        // в соло заполняю синих или красных
  let _botThinking = false;
  let _paused = false;           // пауза драфта (в боевом — только создатель)
  let _authed = false;           // auth-gate: кооп/серии требуют входа (в боевом — Firebase)

  const teamOnSide = side => side==='blue' ? st.blueTeam : other(st.blueTeam);
  const sideOfTeam = team => st.blueTeam===team ? 'blue' : 'red';

  /* активное состояние = серия (draft) или тренировка (solo/ai) */
  const isTrain = ()=> S.screen==='solo' || S.screen==='ai';
  const G = ()=> isTrain() ? tr : st;

  /* Fearless: чемпы из прошлых игр серии не повторяются (пики, опц. + баны) */
  function fearlessUsed(){
    if(!SERIES.fearless || isTrain()) return new Set();
    const s = new Set();
    st.past.forEach(g=>{
      (g.picks.blue||[]).forEach(n=>s.add(n));
      (g.picks.red ||[]).forEach(n=>s.add(n));
      if(S.fearless==='picksbans'){
        (g.bans.blue||[]).forEach(n=>s.add(n));
        (g.bans.red ||[]).forEach(n=>s.add(n));
      }
    });
    return s;
  }

  const $ = s => document.querySelector(s);
  const app = $('#dlApp');
  const frame = $('#dlFrame');
  const chatEl = $('#dlChat');

  let toastT;
  function toast(msg){
    const el=$('#dlToast'); el.textContent=msg; el.classList.add('show');
    clearTimeout(toastT); toastT=setTimeout(()=>el.classList.remove('show'),1700);
  }

  /* UI-состояние */
  let _overlay = null;         // 'import' | 'share' | 'replay' | 'settings' | 'gbans'
  let _chatOpen = false;
  let _chatTab = 'draft';      // 'chat' | 'draft'
  let _pastOpen = false;
  let _ready = {A:false,B:false};
  let _importComp = [];        // импортированный вражеский состав (фича 6)
  let _replayStep = SEQ_LEN;
  let _chatMsgs = [
    {who:'Перкз', txt:'го на ready', mine:true},
    {who:'Faker', txt:'секунду, баны гляну', mine:false},
  ];
  const SPECTATORS = ['Гость_42','WR_Fan','coach_ru'];

  /* ══════════════ ХОД / ДОСТУПНОСТЬ ══════════════ */
  function step(){ return SEQ[G().turnIndex] || null; }
  function isDone(){ return G().turnIndex >= SEQ_LEN; }
  function usedSet(){
    const g=G(), u=new Set(isTrain()?[]:GLOBAL_BANS);
    ['blue','red'].forEach(side=>{
      (g.bans[side]||[]).forEach(n=>u.add(n));
      (g.picks[side]||[]).forEach(n=>u.add(n));
    });
    if(g.hover) u.add(g.hover);
    return u;
  }

  /* ══════════════ ПОДСКАЗКИ (фича 2) — по демо-WR и тегам, не выдумка ══════════════ */
  function compOf(side){ return (G().picks[side]||[]).filter(Boolean).map(n=>CMAP[n]); }
  function compStats(side){
    const c=compOf(side);
    const ad=c.filter(x=>x.dmg==='AD').length, ap=c.filter(x=>x.dmg==='AP').length;
    return {
      n:c.length, ad, ap,
      front:c.filter(x=>has(x,'tank')).length,
      cc:c.filter(x=>has(x,'cc')).length,
      early:c.filter(x=>has(x,'early')).length,
      late:c.filter(x=>has(x,'late')).length,
    };
  }
  /* мой борт = сторона, за которую я играю (в кооп — синие; в AI — синие) */
  const mySide = ()=> S.screen==='solo' ? _soloFill : 'blue';
  const foeSide = ()=> mySide()==='blue' ? 'red' : 'blue';

  /* предупреждения по МОЕМУ составу */
  function warnings(){
    const m=compStats(mySide()), out=[];
    if(m.n>=3 && m.front===0) out.push('У вас <b>нет фронтлайна</b> — некому заходить в замес.');
    if(m.n>=3 && m.cc<=1) out.push('<b>Мало контроля</b> (CC) — сложно поймать их кэрри.');
    if(m.n>=3 && (m.ad===0 || m.ap===0)) out.push(`<b>Перекос урона</b>: ${m.ad} AD / ${m.ap} AP — их защита закроет одну сторону.`);
    return out;
  }
  /* контр-подсказки: чем закрыть дыру + что контрит их пики */
  function suggestions(limit){
    const used=usedSet(), fl=fearlessUsed();
    const me=compStats(mySide()), foe=compStats(foeSide());
    const free=CHAMPS.filter(c=>!used.has(c.n) && !fl.has(c.n));
    const scored = free.map(c=>{
      let sc=c.wr, why='высокий WR на патче (демо)';
      if(me.front===0 && has(c,'tank')){ sc+=6; why='у вас нет фронтлайна — закрывает дыру'; }
      else if(me.cc<=1 && has(c,'cc')){ sc+=4; why='добавляет контроль (CC) вашему составу'; }
      else if(foe.ad>=2 && has(c,'tank')){ sc+=3; why=`контрит их ${foe.ad}×AD — броня работает`; }
      else if(me.ad===0 && c.dmg==='AD'){ sc+=3; why='выравнивает урон (у вас весь AP)'; }
      else if(me.ap===0 && c.dmg==='AP'){ sc+=3; why='выравнивает урон (у вас весь AD)'; }
      else if(foe.late>=2 && has(c,'early')){ sc+=2; why='они на поздней — давит их в ранней'; }
      return {c, sc, why};
    }).sort((a,b)=>b.sc-a.sc);
    return scored.slice(0, limit||4);
  }
  /* топ-бан против их состава */
  function banTarget(){
    const used=usedSet(), fl=fearlessUsed();
    const foe=compStats(foeSide());
    const free=CHAMPS.filter(c=>!used.has(c.n)&&!fl.has(c.n));
    const scored=free.map(c=>{
      let sc=c.wr;
      if(foe.front===0 && has(c,'tank')) sc+=5;       // не дать им фронтлайн
      if(foe.cc<=1 && has(c,'cc')) sc+=3;
      if(has(c,'late')) sc+=2;
      return {c,sc};
    }).sort((a,b)=>b.sc-a.sc);
    return scored[0] ? scored[0].c : null;
  }
  /* чемпы, помеченные «контрит их пик» — для метки на плитке */
  function counterSet(){
    const foe=compStats(foeSide());
    const s=new Set();
    if(foe.ad>=2) CHAMPS.filter(c=>has(c,'tank')).forEach(c=>s.add(c.n));
    if(foe.front===0) CHAMPS.filter(c=>has(c,'late')).forEach(c=>s.add(c.n));
    return s;
  }

  /* ══════════════ РЕНДЕР ══════════════ */
  let _lastScreen = null;
  function render(){
    const s=step();
    const cage = S.screen==='draft' && !isDone() && G().turnIndex>0;
    app.dataset.cage = cage ? 'on' : 'off';
    if(cage) frame.setAttribute('data-no-esc',''); else frame.removeAttribute('data-no-esc');

    frame.dataset.activeSide = (!isDone()&&s) ? s.side : 'none';
    frame.dataset.screen = S.screen;
    frame.dataset.timer = S.timer;
    frame.dataset.bans = S.bans;
    frame.dataset.portsize = S.portsize;
    frame.dataset.density = S.density;
    frame.dataset.picker = S.picker;
    frame.dataset.turnfx = S.turnfx;
    frame.dataset.tourney = S.tourney;
    frame.dataset.roles = F.roles ? 'on' : 'off';

    let html;
    if(S.screen==='draft' || S.screen==='ai' || S.screen==='solo') html = boardScreen();
    else if(S.screen==='mode') html = modeHtml();
    else if(S.screen==='authgate') html = authGateHtml();
    else if(S.screen==='results') html = resultsHtml();
    else html = shellHtml(S.screen);

    // ТОЧЕЧНО: morph правит изменившееся. Появления на кадре НЕТ — кадр постоянный
    // блок, смена экрана это подмена контента, а не «появление» (закон 1+4).
    labMorph(frame, html);
    _lastScreen = S.screen;

    renderChat();
    renderOverlay();
    wire();
  }

  /* ── общий экран доски: используется драфтом серии, AI и соло ── */
  function boardScreen(){
    const showTips = F.tips && !isDone();
    const showAnalysis = F.analysis && isDone();
    // Турнирная раскладка (трансляция): вебки стримеров + доска, всё видно зрителю.
    if (S.tourney !== 'off') {
      return hdrHtml()
        + bansBarHtml()
        + broadcastHtml()
        + (showAnalysis ? analysisHtml() : '')
        + (S.screen==='draft' ? betbarHtml() : '');
    }
    return hdrHtml()
      + bansBarHtml()
      + `<div class="dl-board">` + sideHtml('blue') + centerHtml(showTips) + sideHtml('red') + `</div>`
      + (showAnalysis ? analysisHtml() : '')
      + (S.screen==='draft' ? pastHtml() + betbarHtml() : '');
  }

  /* ── ТУРНИРНАЯ ТРАНСЛЯЦИЯ: 2 вебки стримеров + доска обеих команд + пул.
     4 раскладки (data-tourney): вебки сверху / студия по бокам / нижняя треть / вертикаль.
     Реюз sideHtml (пики+баны) и gridHtml (пул) — без дублей разметки. Вебки = демо-плейсхолдеры. ── */
  function broadcastHtml(){
    const teamLabel = side => S.screen==='draft' ? TEAMS[teamOnSide(side)].name : (side==='blue'?'Синие':'Красные');
    const cam = (side)=>`<div class="dl-cam dl-cam-${side} glass" data-el="2">`
      + `<div class="dl-cam-ph">🎥</div>`
      + `<div class="dl-cam-meta"><b>${teamLabel(side)}</b><span class="demo">вебка стримера</span></div></div>`;
    return `<div class="dl-broadcast">`
      + cam('blue') + cam('red')
      + `<div class="dl-bc-body">`
      +   sideHtml('blue')
      +   `<div class="dl-bc-center glass" data-el="1">`
      +     `<div class="dl-bc-hint">🎬 Обзор трансляции <span class="demo">демо</span></div>`
      +     `<div class="dl-roles">` + ROLE_TABS.map(r=>`<button class="btn${r.k===S.roleFilter?' on':''}" data-role="${r.k}">${r.t}</button>`).join('') + `</div>`
      +     `<div class="dl-grid dl-sc" id="dlGrid">${gridHtml()}</div>`
      +     lockHtml()
      +   `</div>`
      +   sideHtml('red')
      + `</div></div>`;
  }

  function hdrHtml(){
    const cage = app.dataset.cage==='on';
    let title, sub;
    if(S.screen==='solo'){ title='🎯 Соло-тренировка'; sub='драфтишь оба борта сам'; }
    else if(S.screen==='ai'){ title='🤖 AI-соперник'; sub=F.ai?'бот драфтит за красных':'⚠️ фича AI выключена — бот не ходит'; }
    else { title=`${SERIES.type.toUpperCase()}${SERIES.fearless?' · Fearless':''} · Игра ${st.gameNo}`; sub=''; }

    const center = `<div class="dl-hdr-center">`
      + `<div class="dl-series">${title}${sub?` <span style="opacity:.8;font-weight:600;text-transform:none;letter-spacing:0">· ${sub}</span>`:''}</div>`
      + timerHtml()
      + `<div class="dl-turn">${turnText()}</div>`
      + (cage ? `<div class="dl-cage-badge">🔒 Клетка — драфт начался, выхода нет</div>` : '')
      + `</div>`;

    return `<div class="dl-hdr glass" data-el="2">`
      + capHtml('blue') + center + capHtml('red') + ctrlsHtml()
      + `</div>`
      + (S.timer==='bar' ? `<div class="dl-timerbar"><i style="width:${isDone()?'0':'62%'}"></i></div>` : '');
  }

  function capHtml(side){
    const s=step();
    const active = !isDone() && s && s.side===side;
    let name, nick, score='';
    if(S.screen==='draft'){
      const team=teamOnSide(side);
      name=TEAMS[team].name; nick=TEAMS[team].cap;
      score=`<div class="dl-cap-score">${st.score[team]||0}</div>`;
    } else if(S.screen==='ai'){
      name = side==='blue' ? 'Ты' : 'Бот';
      nick = side==='blue' ? 'тренировка' : (F.ai?'AI · демо':'выкл');
    } else {
      name = side==='blue' ? 'Синие' : 'Красные';
      nick = (_soloFill===side) ? 'заполняешь' : '—';
    }
    const cb = (st.bans[side]||[]).map(n=>port(n,'mini')).join('');
    return `<div class="dl-cap dl-cap-${side}${active?' active':''}">`
      + `<div class="dl-cap-info"><div class="dl-cap-team">${name}</div><div class="dl-cap-nick">${nick}</div></div>`
      + score
      + `<div class="dl-cap-minitimer">${fmtTime()}</div>`
      + `<div class="dl-cap-cornerbans">${cb}</div>`
      + `</div>`;
  }

  function turnText(){
    if(isDone()) return 'Драфт завершён';
    const s=step();
    const who = S.screen==='draft' ? TEAMS[teamOnSide(s.side)].name
              : S.screen==='ai' ? (s.side==='blue'?'Ты':'Бот')
              : (s.side==='blue'?'Синие':'Красные');
    return `Ход: ${who} · ${s.action==='ban'?'бан':'выбор'}`;
  }
  function fmtTime(){ return isDone() ? '0' : (_paused ? '⏸' : '24'); }
  function timerHtml(){
    return `<div class="dl-timer">`
      + `<svg class="dl-timer-ring" viewBox="0 0 100 100" aria-hidden="true">`
      +   `<circle class="bg" cx="50" cy="50" r="44"/><circle class="fg" cx="50" cy="50" r="44"/></svg>`
      + `<span class="dl-timer-num">${fmtTime()}</span></div>`;
  }

  function ctrlsHtml(){
    const b=(k,ic,title,on)=>`<button class="dl-cbtn${on?' on':''}" data-k="${k}" title="${title}">${ic}</button>`;
    let out=`<div class="dl-ctrls">`;
    if(F.import) out += b('import','📥','Импорт вражеского состава');
    if(F.share && isDone()) out += b('share','📷','Поделиться драфтом');
    // Пауза — только в кооп-серии и только пока драфт идёт (в боевом = только создатель)
    if(S.screen==='draft' && !isDone()) out += b('pause', _paused?'▶':'⏸', _paused?'Продолжить':'Пауза', _paused);
    out += b('chat','💬','Чат / участники', _chatOpen);
    out += b('settings','⚙','Настройки');
    if(app.dataset.cage!=='on') out += b('exit','✕','Выйти в разделы');
    return out+`</div>`;
  }

  function bansBarHtml(){
    const g=G(), s=step();
    function row(side){
      let out='';
      for(let i=0;i<5;i++){
        const n=(g.bans[side]||[])[i];
        const act=!isDone()&&s&&s.side===side&&s.action==='ban'&&s.idx===i;
        const gh=act&&g.hover;
        out+=`<div class="dl-bb-slot${act?' active':''}">`+(n?port(n,'mini'):(gh?port(g.hover,'mini ghost'):`<span class="dl-x">✕</span>`))+`</div>`;
      }
      return `<div class="dl-bb-side dl-bb-${side}">${out}</div>`;
    }
    return `<div class="dl-bansbar glass" data-el="2"><span class="dl-bb-lbl">Баны</span>${row('blue')}<span class="dl-bb-vs">5×5</span>${row('red')}<span class="dl-bb-lbl">Баны</span></div>`;
  }

  function sideHtml(side){
    const g=G(), picks=g.picks[side]||[], bans=g.bans[side]||[], s=step();
    let banRow=`<div class="dl-bans">`;
    for(let i=0;i<5;i++){
      const n=bans[i];
      const act=!isDone()&&s&&s.side===side&&s.action==='ban'&&s.idx===i;
      const gh=act&&g.hover;
      banRow+=`<div class="dl-ban${act?' active':''}">`+(n?port(n,'mini'):(gh?port(g.hover,'mini ghost'):`<span class="dl-x">✕</span>`))+`</div>`;
    }
    banRow+=`</div>`;

    let rows=`<div class="dl-picks">`;
    for(let i=0;i<5;i++){
      const n=picks[i];
      const act=!isDone()&&s&&s.side===side&&s.action==='pick'&&s.idx===i;
      const gh=act&&g.hover;
      const champ=n||(gh?g.hover:null);
      rows+=`<div class="dl-pick${act?' active':''}${gh?' ghost':''}">`
        +(champ?port(champ):`<span class="dl-pick-num">${i+1}</span>`)
        +`<div class="dl-pick-meta"><span class="dl-pick-name">${champ||'—'}</span><span class="dl-pick-role">${ROLES[i]}</span></div>`
        +(champ?`<span class="dl-pick-wr">${CMAP[champ].wr}%</span>`:'')
        +`</div>`;
    }
    rows+=`</div>`;

    let head;
    if(S.screen==='draft') head=`${side==='blue'?'Синяя':'Красная'} · ${TEAMS[teamOnSide(side)].name}`;
    else if(S.screen==='ai') head= side==='blue'?'Ты':'Бот';
    else head= side==='blue'?'Синие':'Красные';

    return `<div class="dl-side dl-side-${side} glass" data-el="1">`
      + `<div class="dl-side-head"><span class="dl-side-dot"></span>${head}</div>`
      + banRow + rows + `</div>`;
  }

  function centerHtml(showTips){
    return `<div class="dl-center">`
      + gbansHtml()
      + `<div class="dl-roles">` + ROLE_TABS.map(r=>`<button class="btn${r.k===S.roleFilter?' on':''}" data-role="${r.k}">${r.t}</button>`).join('') + `</div>`
      + `<div style="display:flex;gap:var(--gap);flex:1;min-height:0">`
      +   `<div class="dl-pool glass" data-el="1">`
      +     `<div class="dl-search">🔍 <input type="text" placeholder="Поиск чемпиона…" id="dlSearch"></div>`
      +     `<div class="dl-grid" id="dlGrid">${gridHtml()}</div>`
      +     lockHtml()
      +   `</div>`
      +   (showTips ? tipsHtml() : '')
      + `</div></div>`;
  }

  function gbansHtml(){
    if(isTrain()) return `<div class="dl-gbans"><span class="dl-gbans-lbl">🎓 Тренировка</span><span class="demo">данные демо</span></div>`;
    const fl=fearlessUsed();
    return `<div class="dl-gbans">`
      + `<span class="dl-gbans-lbl">⛔ Баны серии</span>` + GLOBAL_BANS.map(n=>port(n,'gban')).join('')
      + `<span class="dl-fearless">🔒 Fearless · залочено ${fl.size} (${S.fearless==='picksbans'?'пики+баны':'пики'})</span>`
      + `<span class="demo">демо</span></div>`;
  }

  function gridHtml(){
    const used=usedSet(), fl=fearlessUsed(), g=G();
    const counters = F.tips ? counterSet() : new Set();
    return CHAMPS.filter(c=>c.role===S.roleFilter).map(c=>{
      const locked = fl.has(c.n) && c.n!==g.hover;
      const isUsed = (used.has(c.n)||locked) && c.n!==g.hover;
      const sel = c.n===g.hover;
      const tip = (!isUsed && counters.has(c.n)) ? `<span class="dl-cell-tip" title="контрит их состав">⚔</span>` : '';
      return `<div class="dl-cell${isUsed?' used':''}${sel?' sel':''}" data-champ="${c.n}" `
        + `title="${c.n} · ${c.role} · ${c.wr}% WR (демо)${locked?' · fearless: сыгран в серии':''}">`
        + `<span class="dl-cell-wr">${c.wr}</span>`
        + port(c.n)
        + (locked?`<span class="dl-cell-lock">🔒</span>`:'')
        + tip
        + `<span class="dl-cell-name">${c.n}</span></div>`;
    }).join('');
  }

  function lockHtml(){
    const g=G(), s=step();
    if(isDone()) return `<button class="btn btn-lg dl-lock" disabled>✓ Драфт завершён</button>`;
    if(_paused) return `<button class="btn btn-lg dl-lock" disabled>⏸ Пауза — таймер остановлен</button>`;
    if(_botThinking) return `<button class="btn btn-lg dl-lock" disabled>🤖 Бот думает…</button>`;
    const label = s.action==='ban' ? 'Забанить' : 'Зафиксировать';
    const ready = !!g.hover;
    return `<button class="btn btn-lg dl-lock${ready?' ready':''}" id="dlLock"${ready?'':' disabled'}>`
      + (g.hover ? `${label} · ${g.hover}` : `Выбери чемпиона — ${label.toLowerCase()}`) + `</button>`;
  }

  /* ── подсказки во время драфта (фича 2) ── */
  function tipsHtml(){
    const s=step();
    const sug=suggestions(4);
    const warns=warnings();
    const bt=banTarget();
    let out=`<div class="dl-tips glass dl-sc" data-el="2">`
      + `<div class="dl-tips-h"><span>💡 Подсказки</span><span class="demo">демо</span></div>`;
    warns.forEach(w=>{ out+=`<div class="dl-tip-warn">⚠️ ${w}</div>`; });
    if(s && s.action==='ban' && bt){
      out+=`<div class="dl-tip-warn">🚫 Топ-бан против их состава: <b style="color:#fff">${bt.n}</b> (${bt.wr}% WR)</div>`;
      out+=`<div class="dl-tip" data-tip="${bt.n}">${port(bt.n,'mini')}<div class="dl-tip-info"><b>${bt.n}</b><span>забанить — закрывает их дыру</span></div><span class="dl-tip-wr">${bt.wr}%</span></div>`;
    }
    sug.forEach(x=>{
      out+=`<div class="dl-tip" data-tip="${x.c.n}">${port(x.c.n,'mini')}`
        + `<div class="dl-tip-info"><b>${x.c.n}</b><span>${x.why}</span></div>`
        + `<span class="dl-tip-wr">${x.c.wr}%</span></div>`;
    });
    return out+`</div>`;
  }

  /* ── анализ состава после драфта (фича 3) ── */
  function analysisHtml(){
    function col(side){
      const c=compOf(side), n=Math.max(1,c.length);
      const st_=compStats(side);
      const early=Math.round(st_.early/n*100), late=Math.round(st_.late/n*100);
      const mid=Math.max(0,100-early-late);
      const ad=Math.round(st_.ad/n*100), ap=100-ad;
      const bar=(lbl,v)=>`<div class="dl-an-row"><span>${lbl}</span><div class="dl-an-track"><i class="dl-an-fill" style="display:block;width:${v}%"></i></div><span class="dl-an-v">${v}%</span></div>`;
      const label = S.screen==='draft' ? TEAMS[teamOnSide(side)].name : (side==='blue'?'Синие':'Красные');
      return `<div class="dl-an-col${side==='red'?' red':''}">`
        + `<div class="dl-an-team">${label}</div>`
        + bar('Ранняя', early) + bar('Средняя', mid) + bar('Поздняя', late)
        + bar('Урон AD', ad) + bar('Урон AP', ap)
        + `<div class="dl-an-flags">`
        +   `<span class="dl-an-flag ${st_.front?'good':'bad'}">Фронтлайн: ${st_.front}</span>`
        +   `<span class="dl-an-flag ${st_.cc>=2?'good':'bad'}">Контроль (CC): ${st_.cc}</span>`
        +   `<span class="dl-an-flag ${(st_.ad&&st_.ap)?'good':'bad'}">Баланс урона: ${st_.ad&&st_.ap?'ок':'перекос'}</span>`
        + `</div></div>`;
    }
    return `<div class="dl-analysis glass" data-el="2">`
      + `<div class="dl-an-h">📊 Анализ состава <span class="demo">демо · по тегам чемпионов</span></div>`
      + `<div class="dl-an-grid">${col('blue')}${col('red')}</div>`
      + `</div>`;
  }

  /* ── прошлые игры серии ── */
  function pastHtml(){
    if(!st.past.length) return '';
    const rows=st.past.map(g=>{
      const swap=g.blueTeam!==st.blueTeam;
      const pB=swap?g.picks.red:g.picks.blue, pR=swap?g.picks.blue:g.picks.red;
      const bB=swap?g.bans.red:g.bans.blue,  bR=swap?g.bans.blue:g.bans.red;
      const winSide=sideOfTeam(g.winner);
      const slot=n=>n?`<div class="dl-pg-slot">${port(n,'mini')}</div>`:`<div class="dl-pg-slot empty"></div>`;
      const ban=n=>n?`<div class="dl-pg-ban">${port(n,'mini')}</div>`:`<div class="dl-pg-ban empty"></div>`;
      const pad=a=>{const o=(a||[]).slice(0,5);while(o.length<5)o.push(null);return o;};
      return `<div class="dl-pg-row"><div class="dl-pg-num">G${g.no}</div>`
        + `<div class="dl-pg-col blue${winSide==='blue'?' won':''}"><div class="dl-pg-bans">${bB.map(ban).join('')}</div><div class="dl-pg-picks">${pad(pB).map(slot).join('')}</div></div>`
        + `<div class="dl-pg-mid">${winSide==='blue'?'◀':''} G${g.no} ${winSide==='red'?'▶':''}</div>`
        + `<div class="dl-pg-col red${winSide==='red'?' won':''}"><div class="dl-pg-picks">${pad(pR).map(slot).join('')}</div><div class="dl-pg-bans">${bR.map(ban).join('')}</div></div>`
        + `</div>`;
    }).join('');
    const bs=st.score[teamOnSide('blue')]||0, rs=st.score[teamOnSide('red')]||0;
    return `<div class="dl-past glass${_pastOpen?' open':''}" data-el="2">`
      + `<button class="dl-past-head" id="dlPastToggle">`
      +  `<span class="dl-past-h-l">📜 Прошлые игры серии <span class="dl-past-cnt">${st.past.length}/${SERIES.type.toUpperCase()}</span></span>`
      +  `<span class="dl-past-score"><b style="color:var(--blue)">${bs}</b> : <b style="color:var(--red)">${rs}</b> ${_pastOpen?'▲':'▼'}</span>`
      + `</button><div class="dl-past-body">${rows}</div></div>`;
  }

  function betbarHtml(){
    if(!isDone()) return '';
    const bT=teamOnSide('blue'), rT=teamOnSide('red');
    const score=`<div class="dl-bb-score"><span style="color:var(--blue)">${TEAMS[bT].name} ${st.score[bT]}</span> : <span style="color:var(--red)">${st.score[rT]} ${TEAMS[rT].name}</span></div>`;
    if(st.seriesOver){
      const ch=st.score.A>=SERIES.targetWins?'A':'B';
      return `<div class="dl-betbar glass" data-el="3">${score}`
        + `<div class="dl-bb-label">🏆 <span style="color:var(--gold)">${TEAMS[ch].name}</span> выигрывает серию!</div>`
        + `<div class="dl-bb-btns"><button class="btn dl-bb-btn finish" data-act="newseries">↺ Новая серия</button></div></div>`;
    }
    if(!st.winner){
      return `<div class="dl-betbar glass" data-el="3">${score}`
        + `<div class="dl-bb-label">Игра ${st.gameNo} · кто победил?</div>`
        + `<div class="dl-bb-btns"><button class="btn dl-bb-btn blue" data-win="${bT}">🔵 ${TEAMS[bT].name}</button><button class="btn dl-bb-btn red" data-win="${rT}">🔴 ${TEAMS[rT].name}</button></div></div>`;
    }
    const loser=other(st.winner);
    return `<div class="dl-betbar glass" data-el="3">${score}`
      + `<div class="dl-bb-label">🏆 ${TEAMS[st.winner].name} победили в игре ${st.gameNo}</div>`
      + `<div class="dl-bb-sub"><b>${TEAMS[loser].name}</b> (проигравшие) выбирают сторону на игру ${st.gameNo+1}:</div>`
      + `<div class="dl-bb-btns"><button class="btn dl-bb-btn blue" data-next="blue">🔵 Синие (FP)</button><button class="btn dl-bb-btn red" data-next="red">🔴 Красные</button></div></div>`;
  }

  /* ══════════════ AUTH-GATE (кооп/серии требуют входа) ══════════════
     Соло и AI играются БЕЗ входа. Кооп = аккаунт (в боевом Firebase-auth:
     нужен uid для капитанства, приглашений, зрителей и истории серий). */
  function authGateHtml(){
    return `<div class="dl-mode glass" data-el="2" style="max-width:560px">`
      + `<div class="dl-mode-h">🔒 Вход в кооп</div>`
      + `<div class="dl-mode-sub">Соло и AI-тренажёр играются <b>без входа</b>. Для серии с людьми нужен аккаунт: капитанство, приглашения, зрители и история серий привязаны к профилю.</div>`
      + `<div class="dl-mode-cards" style="grid-template-columns:1fr">`
      +   `<button class="dl-mode-card" data-auth="in"><span class="dl-mode-ic">👤</span><b>Войти</b><span>Google-аккаунт <span class="demo">демо — просто откроет лобби</span></span></button>`
      + `</div>`
      + `<button class="btn" data-screen="mode" style="margin-top:var(--sp-3)">← К выбору режима</button>`
      + `</div>`;
  }

  /* ══════════════ ЭКРАН ВЫБОРА РЕЖИМА ══════════════ */
  function modeHtml(){
    return `<div class="dl-mode glass" data-el="2">`
      + `<div class="dl-mode-h">🎯 Драфтер</div>`
      + `<div class="dl-mode-sub">Три режима. Все данные — <span class="demo">демо</span></div>`
      + `<div class="dl-mode-cards">`
      +  `<button class="dl-mode-card" data-screen="solo"><span class="dl-mode-ic">🎓</span><b>Соло</b><span>Тренировка: драфтишь оба борта сам, с подсказками. Без входа.</span></button>`
      +  `<button class="dl-mode-card" data-screen="ai"><span class="dl-mode-ic">🤖</span><b>AI-соперник</b><span>Тренажёр: бот драфтит против тебя и отвечает на твои пики.</span></button>`
      +  `<button class="dl-mode-card" data-screen="drafts"><span class="dl-mode-ic">👥</span><b>Кооп / Серии</b><span>С людьми: капитан vs капитан, Bo3/5, fearless, зрители, чат.</span></button>`
      + `</div></div>`;
  }

  /* ══════════════ ЛОББИ / СОЗДАНИЕ / ОЖИДАНИЕ ══════════════ */
  function shellHtml(sc){
    const tab=(v,t)=>`<button class="btn${sc===v?' on':''}" data-screen="${v}">${t}</button>`;
    const tabs=(sc==='drafts'||sc==='create')?`<div class="dl-mtabs">${tab('drafts','Мои лобби')}${tab('create','Создать')}</div>`:'';
    let pane='';
    if(sc==='drafts') pane=draftsPane();
    else if(sc==='create') pane=createPane();
    else if(sc==='waiting') pane=waitingPane();
    const back=`<button class="btn" data-screen="${sc==='waiting'?'drafts':'mode'}">←</button>`;
    return `<div class="dl-modal glass" data-el="2">`
      + `<div class="dl-modal-hdr">${back}<span>Кооп / Серии</span><span class="demo">демо</span></div>`
      + tabs + `<div class="dl-modal-pane">${pane}</div></div>`;
  }

  function lobbyCard(b,r,meta,status,score,target){
    return `<div class="dl-lc" data-screen="${target}">`
      + `<div class="dl-lc-main"><div class="dl-lc-teams"><span class="dl-lc-b">${b}</span><span class="dl-lc-vs">vs</span><span class="dl-lc-r">${r}</span></div><div class="dl-lc-meta">${meta}</div></div>`
      + (score?`<div class="dl-lc-score">${score}</div>`:'')
      + `<div class="dl-lc-status">${status}</div><span class="dl-lc-go">›</span></div>`;
  }
  function draftsPane(){
    return `<div class="dl-list-block"><div class="dl-block-title">⚡ Активные лобби</div>`
      + lobbyCard('Cloud9','T1','Fearless · BO3 · сегодня 18:30','Идёт драфт','','draft')
      + lobbyCard('Gen.G','DRX','Normal · BO5 · 17:00','Ожидание','','waiting')
      + `</div><div class="dl-list-block"><div class="dl-block-title">📚 История серий</div>`
      + lobbyCard('KT','DK','Fearless · BO3 · вчера','Завершено','2:1','results')
      + `</div>`;
  }
  function createPane(){
    const radio=(n,v,l,ch)=>`<label class="dl-radio"><input type="radio" name="${n}" value="${v}"${ch?' checked':''}><span>${l}</span></label>`;
    const players=()=>Array.from({length:5}).map((_,i)=>`<input class="dl-inp sm" placeholder="${i+1}">`).join('');
    return `<div class="dl-form"><div class="dl-form-cols"><div>`
      + `<div class="dl-field"><label>Режим</label><div class="dl-radio-row">${radio('m','n','Обычный',0)}${radio('m','f','Fearless',1)}</div></div>`
      + `<div class="dl-field"><label>Серия</label><select class="dl-inp"><option>Bo1</option><option selected>Bo3</option><option>Bo5</option><option>Bo7</option></select></div>`
      + `<div class="dl-field"><label>Таймер на ход, сек</label><div class="dl-radio-row">${radio('t','30','30',0)}${radio('t','45','45',1)}${radio('t','60','60',0)}</div></div>`
      + `<div class="dl-field"><label>Зрители</label><div class="dl-radio-row">${radio('sp','on','Разрешить',1)}${radio('sp','off','Закрыто',0)}</div></div>`
      + `</div><div>`
      + `<div class="dl-field"><label>Синяя команда</label><input class="dl-inp" placeholder="Blue Team"></div>`
      + `<div class="dl-field"><label>Игроки синих</label><div class="dl-players">${players()}</div></div>`
      + `<div class="dl-field"><label>Красная команда</label><input class="dl-inp" placeholder="Red Team"></div>`
      + `<div class="dl-field"><label>Игроки красных</label><div class="dl-players">${players()}</div></div>`
      + `</div></div>`
      + `<div class="dl-field"><label>⛔ Глобальные баны серии</label><div class="dl-gb-prev">${GLOBAL_BANS.map(n=>port(n,'mini')).join('')}</div><button class="btn" data-ov="gbans">Выбрать баны серии</button></div>`
      + `<button class="btn btn-lg" data-screen="waiting" style="align-self:center">Создать лобби →</button></div>`;
  }
  function waitingPane(){
    function tp(team,side){
      const t=TEAMS[team], rd=_ready[team];
      const pl = side==='blue' ? ['Перкз','Бёрдфорс','Близ','Зэвен','Винсент'] : ['Faker','Оунер','Гумаюси','Керия','Доран'];
      return `<div class="dl-tp dl-tp-${side}${rd?' ready':''}">`
        + `<div class="dl-tp-h"><span>${side==='blue'?'🔵':'🔴'}</span><span class="dl-tp-name">${t.name}</span><span class="dl-tp-ready${rd?' on':''}">${rd?'✓ Готов':'ожидание'}</span></div>`
        + `<div class="dl-tp-lbl">Капитан</div><div>${t.cap}</div>`
        + `<div class="dl-tp-lbl">Игроки</div><ol class="dl-tp-players">${pl.map(p=>`<li>${p}</li>`).join('')}</ol>`
        + `<button class="btn" data-ready="${team}" style="display:block;margin:10px auto 0">${rd?'✓ Готов (отменить)':'✅ Готов'}</button></div>`;
    }
    const both=_ready.A&&_ready.B;
    const pick = both
      ? `<div class="dl-sidepick"><div class="dl-sidepick-t">Оба готовы — выбери сторону на 1-ю игру</div><div class="dl-sidepick-btns"><button class="btn dl-bb-btn blue" data-screen="draft">🔵 Синие (FP)</button><button class="btn dl-bb-btn red" data-screen="draft">🔴 Красные</button></div><div class="demo" style="margin-top:8px">после старта — КЛЕТКА: выхода нет</div></div>`
      : `<div class="dl-sidepick">Нажми «Готов» за обе команды — появится выбор стороны и старт</div>`;
    return `<div class="dl-wait">`
      + `<div class="dl-wait-bar"><span class="dl-wait-title">Cloud9 vs T1</span><span>Fearless · BO3 · ⏱45с</span></div>`
      + `<div class="dl-gbans"><span class="dl-gbans-lbl">⛔ Баны серии</span>${GLOBAL_BANS.map(n=>port(n,'gban')).join('')}</div>`
      + `<div class="dl-teams-grid">${tp('A','blue')}${tp('B','red')}</div>`
      + (F.spectators?`<div class="dl-tp"><div class="dl-pp-h">👁 Зрители · <b>${SPECTATORS.length}</b></div>${SPECTATORS.map(s=>`<div class="dl-pp"><div class="dl-pp-av">${s[0]}</div>${s}</div>`).join('')}</div>`:'')
      + pick + `</div>`;
  }

  /* ══════════════ РЕЗУЛЬТАТЫ СЕРИИ ══════════════ */
  function resultsHtml(){
    const rows=st.past.map(g=>{
      const bT=g.blueTeam, rT=other(g.blueTeam);
      const winSide=g.winner===bT?'blue':'red';
      const blk=(side,team,picks,bans)=>{
        const won=winSide===side;
        return `<div class="dl-res-block ${side}${won?' won':''}">`
          + `<div class="dl-res-team">${side==='blue'?'🔵':'🔴'} ${TEAMS[team].name}${won?' 🏆':''}</div>`
          + `<div class="dl-res-bans">${(bans||[]).map(n=>port(n,'mini')).join('')}</div>`
          + `<div class="dl-res-picks">${(picks||[]).map(n=>port(n,'mini')).join('')}</div></div>`;
      };
      return `<div class="dl-res-row glass" data-el="1"><div class="dl-res-num">Игра ${g.no}</div>`
        + blk('blue',bT,g.picks.blue,g.bans.blue)
        + `<div class="dl-res-vs">VS</div>`
        + blk('red',rT,g.picks.red,g.bans.red) + `</div>`;
    }).join('');
    return `<div class="dl-hdr glass" data-el="2" style="grid-template-columns:auto 1fr auto">`
      + `<button class="btn" data-screen="drafts">←</button>`
      + `<div class="dl-hdr-center"><div class="dl-series">📜 Результаты серии</div><div class="dl-turn">${TEAMS.A.name} ${st.score.A}–${st.score.B} ${TEAMS.B.name}</div></div>`
      + (F.share?`<button class="dl-cbtn" data-k="share" title="Поделиться">📷</button>`:'<span></span>')
      + `</div>`
      + `<div class="dl-results dl-sc">${rows}</div>`;
  }

  /* ══════════════ ЧАТ-ПАНЕЛЬ (оверлей справа) ══════════════ */
  function renderChat(){
    if(!_chatOpen){ chatEl.hidden=true; return; }
    chatEl.hidden=false;
    const tab=(v,t)=>`<button class="btn${_chatTab===v?' on':''}" data-ctab="${v}">${t}</button>`;
    let pane='';
    if(_chatTab==='chat'){
      pane = _chatMsgs.map(m=>{
        if(m.card){
          return `<div class="dl-msg-card" data-ov="replay"><div class="dl-msg-card-h">📷 Драфт · Игра ${m.card.no} — открыть реплей</div>`
            + `<div class="dl-msg-card-row">${m.card.blue.map(n=>port(n,'mini')).join('')}</div>`
            + `<div class="dl-msg-card-row">${m.card.red.map(n=>port(n,'mini')).join('')}</div></div>`;
        }
        return `<div class="dl-msg${m.mine?' mine':''}"><b>${m.who}</b><span>${m.txt}</span></div>`;
      }).join('');
    } else {
      const cap=(team,side)=>`<div class="dl-pp"><div class="dl-pp-av">${TEAMS[team].cap[0]}</div>${TEAMS[team].cap}<span class="dl-pp-role">${side==='blue'?'🔵':'🔴'} кэп</span></div>`;
      pane = `<div class="dl-pp-h">Участники драфта</div>`
        + cap(teamOnSide('blue'),'blue') + cap(teamOnSide('red'),'red')
        + (F.spectators
            ? `<div class="dl-pp-h">👁 Зрители · <b>${SPECTATORS.length}</b></div>`
              + SPECTATORS.map(s=>`<div class="dl-pp"><div class="dl-pp-av">${s[0]}</div>${s}<span class="dl-pp-role">смотрит</span></div>`).join('')
            : `<div class="dl-pp-h">👁 Зрители выключены (фича 4)</div>`);
    }
    // ТОЧЕЧНО: новое сообщение дописывается одним узлом, лента чата не пересобирается
    labMorph(chatEl,
        `<div class="dl-chat-h"><span>💬 Лобби</span><button class="dl-ov-x" id="dlChatX">✕</button></div>`
      + `<div class="dl-chat-tabs">${tab('chat','Чат')}${tab('draft','ДРАФТ')}</div>`
      + `<div class="dl-chat-pane" data-key="pane">${pane}</div>`
      + (_chatTab==='chat' ? `<div class="dl-chat-inp" data-key="inp"><input class="dl-inp" placeholder="Сообщение…" id="dlChatInp"><button class="btn" id="dlChatSend">➤</button></div>` : ''));
  }

  /* ══════════════ ОВЕРЛЕИ ══════════════ */
  let _ovEl = null, _ovKind = null;
  function renderOverlay(){
    if(!_overlay){ if(_ovEl){ _ovEl.remove(); _ovEl=null; _ovKind=null; } return; }
    let inner='';
    if(_overlay==='import') inner=importOv();
    else if(_overlay==='share') inner=shareOv();
    else if(_overlay==='replay') inner=replayOv();
    else if(_overlay==='settings') inner=settingsOv();
    else if(_overlay==='gbans') inner=gbansOv();
    if(_ovEl && _ovKind === _overlay){          // тот же оверлей открыт — правим внутри, не пересоздаём
      labMorph(_ovEl.firstElementChild, inner);
      return;
    }
    if(_ovEl){ _ovEl.remove(); _ovEl=null; }
    _ovKind = _overlay;
    const d=document.createElement('div');
    d.className='dl-ov-mask'; d.id='dlOvMask';
    d.innerHTML=`<div class="dl-ov glass dl-sc" data-el="3">${inner}</div>`;
    document.body.appendChild(d);
    _ovEl=d;
  }
  const ovHead=t=>`<div class="dl-ov-h"><span>${t}</span><button class="dl-ov-x" id="dlOvX">✕</button></div>`;

  /* фича 6: импорт вражеского состава → советы по банам/пикам */
  function importOv(){
    const cells=CHAMPS.map(c=>`<div class="dl-pk-cell${_importComp.indexOf(c.n)>-1?' on':''}" data-imp="${c.n}">${port(c.n,'mini')}<span>${c.n}</span></div>`).join('');
    let advice='';
    if(_importComp.length){
      const comp=_importComp.map(n=>CMAP[n]);
      const ad=comp.filter(c=>c.dmg==='AD').length, ap=comp.length-ad;
      const front=comp.filter(c=>has(c,'tank')).length;
      const late=comp.filter(c=>has(c,'late')).length;
      const bans=CHAMPS.filter(c=>_importComp.indexOf(c.n)===-1)
        .map(c=>({c, sc:c.wr + (front===0&&has(c,'tank')?5:0) + (has(c,'late')?2:0)}))
        .sort((a,b)=>b.sc-a.sc).slice(0,3);
      const picks=CHAMPS.filter(c=>_importComp.indexOf(c.n)===-1)
        .map(c=>({c, sc:c.wr + (ad>=3&&has(c,'tank')?6:0) + (late>=2&&has(c,'early')?4:0)}))
        .sort((a,b)=>b.sc-a.sc).slice(0,3);
      advice = `<div class="dl-ov-h" style="font-size:12px"><span>Их состав: ${ad} AD / ${ap} AP · фронтлайн ${front} · поздних ${late}</span><span class="demo">демо</span></div>`
        + `<div class="dl-pp-h">🚫 Рекомендуем забанить</div><div class="dl-adv">`
        + bans.map(x=>`<div class="dl-adv-row">${port(x.c.n,'mini')} ${x.c.n} <b>${x.c.wr}%</b></div>`).join('')
        + `</div><div class="dl-pp-h">✅ Рекомендуем пикнуть</div><div class="dl-adv">`
        + picks.map(x=>`<div class="dl-adv-row">${port(x.c.n,'mini')} ${x.c.n} <b>${x.c.wr}%</b></div>`).join('')
        + `</div>`;
    }
    return ovHead('📥 Импорт вражеского состава')
      + `<div style="font-size:12px">Отметь чемпов соперника (до 5) — получишь советы по банам и пикам.</div>`
      + `<div class="dl-pk-grid">${cells}</div>` + advice;
  }

  /* фича 5: шаринг драфта — карточка-ссылка в чат + реплей */
  function shareOv(){
    const g=G();
    const mini=a=>(a||[]).filter(Boolean).map(n=>port(n,'mini')).join('');
    return ovHead('📷 Поделиться драфтом')
      + `<div class="dl-share-card">`
      +  `<div class="dl-share-row blue"><span>Синие</span><div>${mini(g.picks.blue)}</div></div>`
      +  `<div class="dl-share-vs">${S.screen==='draft'?`Игра ${st.gameNo} · ${SERIES.type.toUpperCase()}`:'Тренировка'}</div>`
      +  `<div class="dl-share-row red"><span>Красные</span><div>${mini(g.picks.red)}</div></div>`
      + `</div>`
      + `<div class="dl-share-link"><input class="dl-inp" value="pro-wildrift.com/draft/abc123" readonly><button class="btn" id="dlShareCopy">Копировать</button></div>`
      + `<div style="display:flex;gap:6px"><button class="btn" id="dlShareChat" style="flex:1">💬 Отправить карточкой в чат</button><button class="btn" data-ov="replay" style="flex:1">▶ Реплей для разбора</button></div>`;
  }

  /* реплей: шаг за шагом по последовательности драфта */
  function replayOv(){
    const g=G();
    const upto=_replayStep;
    const seq=SEQ.slice(0,upto).map((s,i)=>{
      const arr = s.action==='ban' ? g.bans[s.side] : g.picks[s.side];
      const n = (arr||[])[s.idx];
      if(!n) return '';
      return `<div class="dl-adv-row">${port(n,'mini')} <span style="color:var(--${s.side==='blue'?'blue':'red'})">${s.action==='ban'?'бан':'пик'}</span> ${n} <b>${i+1}</b></div>`;
    }).join('');
    return ovHead('▶ Реплей драфта')
      + `<div class="dl-replay">`
      +  `<button class="btn" id="dlRwd">◀</button>`
      +  `<div class="dl-replay-track"><div class="dl-replay-fill" style="width:${Math.round(upto/SEQ_LEN*100)}%"></div></div>`
      +  `<button class="btn" id="dlFwd">▶</button>`
      +  `<span class="dl-replay-step">${upto}/${SEQ_LEN}</span>`
      + `</div>`
      + `<div class="dl-adv dl-sc" style="max-height:46vh">${seq||'<div class="dl-adv-row">Начало драфта</div>'}</div>`
      + `<div class="demo">демо · перемотка по шагам последовательности</div>`;
  }

  function gbansOv(){
    const cells=CHAMPS.map(c=>`<div class="dl-pk-cell${GLOBAL_BANS.indexOf(c.n)>-1?' on':''}">${port(c.n,'mini')}<span>${c.n}</span></div>`).join('');
    return ovHead('⛔ Глобальные баны серии') + `<div class="dl-pk-grid">${cells}</div>`
      + `<button class="btn btn-lg" id="dlOvDone" style="align-self:center">Готово</button>`;
  }

  function settingsOv(){
    const seg=(k,items)=>`<div class="dl-set-seg" data-set="${k}">`
      + items.map(i=>`<button data-v="${i.v}" class="${S[k]===i.v?'on':''}">${i.t}</button>`).join('')+`</div>`;
    return ovHead('⚙ Настройки')
      + `<div class="dl-set-row"><span>Размер портретов</span>${seg('portsize',OPTS.portsize.items)}</div>`
      + `<div class="dl-set-row"><span>Плотность</span>${seg('density',OPTS.density.items)}</div>`
      + `<div class="dl-set-note">Стекло (сила / тёмность / blur) — зафиксировано каноном, в настройках его НЕТ. Верхняя полоса — наша дев-панель, на боевой не едет.</div>`;
  }

  /* ══════════════ ДЕЙСТВИЯ ══════════════ */
  function lockIn(){
    const g=G();
    if(isDone()||!g.hover||_botThinking||_paused) return;
    const s=step();
    if(s.action==='ban') g.bans[s.side][s.idx]=g.hover;
    else g.picks[s.side][s.idx]=g.hover;
    g.hover=null; g.turnIndex++;
    render();
    if(isDone()) toast('Драфт завершён 🎉');
    else maybeBot();
  }

  /* фича 1: AI-соперник — бот драфтит за красных */
  function maybeBot(){
    if(S.screen!=='ai' || !F.ai || isDone()) return;
    const s=step();
    if(!s || s.side!=='red') return;
    _botThinking=true; render();
    setTimeout(()=>{
      const s2=step();
      if(!s2 || s2.side!=='red' || isDone()){ _botThinking=false; render(); return; }
      const used=usedSet();
      // бот: берёт лучший по WR свободный чемп нужной роли (при пике), иначе лучший вообще
      const roleNeeded = ROLES[s2.idx];
      let pool=CHAMPS.filter(c=>!used.has(c.n));
      if(s2.action==='pick' && F.roles){
        const byRole=pool.filter(c=>c.role===roleNeeded);
        if(byRole.length) pool=byRole;
      }
      const best=pool.sort((a,b)=>b.wr-a.wr)[0];
      if(best){
        if(s2.action==='ban') tr.bans.red[s2.idx]=best.n;
        else tr.picks.red[s2.idx]=best.n;
        tr.turnIndex++;
      }
      _botThinking=false;
      render();
      if(isDone()) toast('Драфт завершён 🎉');
      else maybeBot();
    }, 750);
  }

  function pickWinner(team){
    st.winner=team;
    st.past.push({ no:st.gameNo, blueTeam:st.blueTeam, winner:team,
      picks:{blue:st.picks.blue.slice(), red:st.picks.red.slice()},
      bans:{blue:st.bans.blue.slice(), red:st.bans.red.slice()} });
    st.score[team]=(st.score[team]||0)+1;
    if(st.score[team]>=SERIES.targetWins) st.seriesOver=true;
    render();
  }
  function nextGame(chosen){
    const loser=other(st.winner);
    st.blueTeam = chosen==='blue' ? loser : st.winner;
    st.gameNo++; st.turnIndex=0; st.hover=null; st.winner=null;
    st.bans={blue:[],red:[]}; st.picks={blue:[],red:[]};
    render();
    toast(`Игра ${st.gameNo}: ${TEAMS[st.blueTeam].name} на синей · fearless обновлён`);
  }

  // Кооп-экраны за auth-gate. bypass=true — переход из дев-полосы (наш инструмент
  // должен показывать любой экран без входа).
  const COOP_SCREENS = ['drafts','create','waiting','draft','results'];
  function gotoScreen(v, bypass){
    if(!bypass && !_authed && COOP_SCREENS.indexOf(v)!==-1) v = 'authgate';
    S.screen=v; _overlay=null; _paused=false;
    if(v==='solo'||v==='ai'){ tr=initTrain(); _botThinking=false; }
    if(v==='draft'||v==='ai'||v==='solo') _chatTab='draft';
    buildControls(); render(); updateChoice();
    if(v==='ai') maybeBot();
  }

  function handleCtrl(k){
    if(k==='pause'){ _paused=!_paused; render(); toast(_paused?'⏸ Драфт на паузе':'▶ Продолжаем'); return; }
    if(k==='chat'){ _chatOpen=!_chatOpen; render(); return; }
    if(k==='settings'){ _overlay='settings'; render(); return; }
    if(k==='import'){ _overlay='import'; render(); return; }
    if(k==='share'){ _overlay='share'; render(); return; }
    if(k==='exit'){ gotoScreen('mode'); return; }
  }

  /* ══════════════════════════════════════════════════════════
     ★ ТОЧЕЧНОЕ ОБНОВЛЕНИЕ — закон «НЕ ТАЩИТЬ ДЁРГАНЬЕ», п.5.
     Раньше КАЖДЫЙ клик делал frame.innerHTML = всё → пересоздавался весь кадр
     (0 из ~120 узлов выживали). Теперь выбор чемпа трогает 3-4 узла:
     плитка-выделение · кнопка фиксации · активный слот. Полный render() остаётся
     только там, где реально меняется структура: lock-in, смена экрана, тумблеры.
     ══════════════════════════════════════════════════════════ */
  const cssEsc = s => String(s).replace(/"/g,'\\"');

  function applyHover(name){
    const g=G();
    g.hover = (g.hover===name) ? null : name;
    // 1) выделение в пуле — снять со старой плитки, поставить новой
    const grid=$('#dlGrid');
    if(grid){
      const prev=grid.querySelector('.dl-cell.sel');
      if(prev && prev.dataset.champ!==g.hover) prev.classList.remove('sel');
      if(g.hover){
        const el=grid.querySelector('.dl-cell[data-champ="'+cssEsc(g.hover)+'"]');
        if(el) el.classList.add('sel');
      }
    }
    updateLockBtn();
    updateActiveSlot();
  }

  function updateLockBtn(){
    const btn=$('#dlLock'), g=G(), s=step();
    if(!btn||!s) return;
    const label = s.action==='ban' ? 'Забанить' : 'Зафиксировать';
    const ready = !!g.hover;
    btn.disabled = !ready;
    btn.classList.toggle('ready', ready);
    btn.textContent = g.hover ? (label+' · '+g.hover) : ('Выбери чемпиона — '+label.toLowerCase());
  }

  /* Превью-«призрак» в активном слоте: обновляем ОДИН слот, не всю панель. */
  function updateActiveSlot(){
    const g=G(), s=step();
    if(!s) return;
    const sideEl = frame.querySelector('.dl-side-'+s.side);
    if(s.action==='ban'){
      const slot = sideEl && sideEl.querySelector('.dl-ban.active');
      if(slot) slot.innerHTML = g.hover ? port(g.hover,'mini ghost') : '<span class="dl-x">✕</span>';
      // полоса банов сверху (вариант bans=top) — тот же один слот
      const bb = frame.querySelector('.dl-bb-'+s.side+' .dl-bb-slot.active');
      if(bb) bb.innerHTML = g.hover ? port(g.hover,'mini ghost') : '<span class="dl-x">✕</span>';
    } else {
      const slot = sideEl && sideEl.querySelector('.dl-pick.active');
      if(!slot) return;
      slot.classList.toggle('ghost', !!g.hover);
      const ico = slot.querySelector('.dl-port, .dl-pick-num');
      const nameEl = slot.querySelector('.dl-pick-name');
      if(ico) ico.outerHTML = g.hover ? port(g.hover) : '<span class="dl-pick-num">'+(s.idx+1)+'</span>';
      if(nameEl) nameEl.textContent = g.hover || '—';
    }
  }

  /* Смена роли — перерисовываем ТОЛЬКО сетку пула, не весь кадр. */
  function refreshGrid(){
    const grid=$('#dlGrid');
    frame.querySelectorAll('[data-role]').forEach(b=>b.classList.toggle('on', b.dataset.role===S.roleFilter));
    if(!grid) return;
    labMorph(grid, gridHtml());   // фильтр роли — правим ячейки, а не пересобираем пул
    wireCells(grid);
  }

  function wireCells(root){
    root.querySelectorAll('.dl-cell:not(.used)').forEach(c=>{
      c.onclick=()=>{ if(isDone()||_botThinking) return;
        if(S.screen==='ai' && step() && step().side==='red') return;   // ход бота — не мешаем
        applyHover(c.dataset.champ); };
    });
  }

  /* ══════════════ СОБЫТИЯ ══════════════ */
  function wire(){
    const g=G();
    wireCells(frame);
    const search=$('#dlSearch'), grid=$('#dlGrid');
    if(search&&grid) search.oninput=()=>{ const q=search.value.trim().toLowerCase();
      grid.querySelectorAll('.dl-cell').forEach(c=>{ c.style.display=(c.dataset.champ||'').toLowerCase().includes(q)?'':'none'; }); };
    frame.querySelectorAll('[data-role]').forEach(b=>{ b.onclick=()=>{ S.roleFilter=b.dataset.role; refreshGrid(); }; });
    frame.querySelectorAll('[data-tip]').forEach(b=>{ b.onclick=()=>{ if(g.hover!==b.dataset.tip) applyHover(b.dataset.tip); }; });
    const lock=$('#dlLock'); if(lock) lock.onclick=lockIn;
    frame.querySelectorAll('.dl-cbtn[data-k]').forEach(b=>{ b.onclick=()=>handleCtrl(b.dataset.k); });
    frame.querySelectorAll('[data-screen]').forEach(e=>{ e.onclick=()=>gotoScreen(e.dataset.screen); });
    frame.querySelectorAll('[data-auth]').forEach(e=>{ e.onclick=()=>{ _authed=true; toast('Вошли (демо)'); gotoScreen('drafts'); }; });
    frame.querySelectorAll('[data-ov]').forEach(e=>{ e.onclick=ev=>{ ev.stopPropagation(); _overlay=e.dataset.ov; render(); }; });
    frame.querySelectorAll('[data-ready]').forEach(e=>{ e.onclick=()=>{ _ready[e.dataset.ready]=!_ready[e.dataset.ready]; render(); }; });
    frame.querySelectorAll('[data-win]').forEach(b=>{ b.onclick=()=>pickWinner(b.dataset.win); });
    frame.querySelectorAll('[data-next]').forEach(b=>{ b.onclick=()=>nextGame(b.dataset.next); });
    frame.querySelectorAll('[data-act="newseries"]').forEach(b=>{ b.onclick=()=>{ st=initState(); render(); toast('Новая серия'); }; });
    const pt=$('#dlPastToggle'); if(pt) pt.onclick=()=>{ _pastOpen=!_pastOpen; render(); };

    // чат-панель
    const cx=$('#dlChatX'); if(cx) cx.onclick=()=>{ _chatOpen=false; render(); };
    chatEl.querySelectorAll('[data-ctab]').forEach(b=>{ b.onclick=()=>{ _chatTab=b.dataset.ctab; renderChat(); wire(); }; });
    chatEl.querySelectorAll('[data-ov]').forEach(e=>{ e.onclick=()=>{ _overlay=e.dataset.ov; render(); }; });
    const send=$('#dlChatSend'), inp=$('#dlChatInp');
    if(send&&inp) send.onclick=()=>{ const v=inp.value.trim(); if(!v) return;
      _chatMsgs.push({who:'Ты',txt:v,mine:true}); inp.value=''; renderChat(); wire(); };

    // оверлеи
    if(_ovEl){
      _ovEl.onclick=e=>{ if(e.target===_ovEl){ _overlay=null; render(); } };
      const x=$('#dlOvX'); if(x) x.onclick=()=>{ _overlay=null; render(); };
      const done=$('#dlOvDone'); if(done) done.onclick=()=>{ _overlay=null; render(); };
      _ovEl.querySelectorAll('[data-imp]').forEach(c=>{ c.onclick=()=>{
        const n=c.dataset.imp, i=_importComp.indexOf(n);
        if(i>-1) _importComp.splice(i,1); else if(_importComp.length<5) _importComp.push(n);
        renderOverlay(); wire(); }; });
      _ovEl.querySelectorAll('[data-ov]').forEach(e=>{ e.onclick=()=>{ _overlay=e.dataset.ov; render(); }; });
      const sc=$('#dlShareCopy'); if(sc) sc.onclick=()=>toast('Ссылка скопирована');
      const shc=$('#dlShareChat'); if(shc) shc.onclick=()=>{
        const gg=G();
        _chatMsgs.push({who:'Ты',mine:true,card:{no:st.gameNo,blue:gg.picks.blue.filter(Boolean),red:gg.picks.red.filter(Boolean)}});
        _overlay=null; _chatOpen=true; _chatTab='chat'; render(); toast('Карточка драфта отправлена в чат');
      };
      const rw=$('#dlRwd'); if(rw) rw.onclick=()=>{ _replayStep=Math.max(0,_replayStep-1); renderOverlay(); wire(); };
      const fw=$('#dlFwd'); if(fw) fw.onclick=()=>{ _replayStep=Math.min(SEQ_LEN,_replayStep+1); renderOverlay(); wire(); };
      _ovEl.querySelectorAll('.dl-set-seg').forEach(seg=>{
        seg.onclick=e=>{ const b=e.target.closest('button[data-v]'); if(!b) return;
          S[seg.dataset.set]=b.dataset.v; buildControls(); render(); updateChoice(); };
      });
    }
  }

  /* Esc: закрывает оверлей/чат. В КЛЕТКЕ раздел не закрывается (data-no-esc). */
  window.addEventListener('keydown', e=>{
    if(e.key!=='Escape') return;
    if(_overlay){ _overlay=null; render(); return; }
    if(_chatOpen){ _chatOpen=false; render(); return; }
    if(app.dataset.cage==='on'){ toast('🔒 Клетка: драфт начался — выхода нет'); return; }
  });

  /* рельс (демо-навигация: уводит из драфтера) */
  document.querySelectorAll('.dl-rail-btn').forEach(b=>{
    b.onclick=()=>{ if(b.dataset.nav==='drafter'){ gotoScreen('mode'); return; } toast('Раздел «'+b.querySelector('.lbl').textContent+'» — демо-заглушка'); };
  });

  /* ══════════════ ДЕВ-ПОЛОСА ══════════════ */
  function buildControls(){
    const c=$('#dlControls'); let h='';
    for(const k of Object.keys(OPTS)){
      const sc=SCOPE[k];
      if(sc && sc.indexOf(S.screen)===-1) continue;
      const o=OPTS[k];
      h+=`<div class="dl-group"><span class="dl-glabel">${o.label}</span><div class="dl-seg" data-opt="${k}">`
        + o.items.map(i=>`<button data-v="${i.v}" class="${i.v===S[k]?'on':''}">${i.t}</button>`).join('')
        + `</div></div>`;
    }
    h+=`<div class="dl-group" style="flex:1"><span class="dl-glabel">Фичи — тумблеры ВКЛ/ВЫКЛ</span><div class="dl-feats" id="dlFeats">`
      + FEATS.map(f=>`<button class="dl-feat${F[f.k]?' on':''}" data-feat="${f.k}"><i></i>${f.t}</button>`).join('')
      + `</div></div>`;
    h+=`<div class="dl-group"><span class="dl-glabel">Демо</span><div class="dl-seg"><button id="dlReset">↺ Сбросить</button></div></div>`;
    c.innerHTML=h;

    c.querySelectorAll('.dl-seg[data-opt]').forEach(seg=>{
      seg.onclick=e=>{
        const b=e.target.closest('button[data-v]'); if(!b) return;
        const k=seg.dataset.opt;
        if(k==='screen'){ gotoScreen(b.dataset.v, true); return; }  // дев-полоса минует auth-gate
        S[k]=b.dataset.v;
        seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
        applyGlobals(); render(); updateChoice();
      };
    });
    c.querySelectorAll('[data-feat]').forEach(b=>{
      b.onclick=()=>{ const k=b.dataset.feat; F[k]=!F[k]; b.classList.toggle('on',F[k]);
        if(k==='ai' && F.ai) maybeBot();
        render(); updateChoice(); };
    });
    $('#dlReset').onclick=()=>{ st=initState(); tr=initTrain(); _importComp=[]; _replayStep=SEQ_LEN; render(); toast('Сброшено'); };
  }

  function applyGlobals(){
    const sp=$('#dlSplash');
    sp.style.backgroundImage = SPLASHES[S.bg] || SPLASHES.thresh;
    document.documentElement.dataset.bgdim = S.bgdim;
  }

  function updateChoice(){
    const el=$('#dlChoice'); if(!el) return '';
    const vars = Object.keys(OPTS).map(k=>{
      const it=OPTS[k].items.find(i=>i.v===S[k]);
      return OPTS[k].label+': '+(it?it.t:S[k]);
    }).join(' · ');
    const feats = FEATS.map(f=>`${f.t.replace(/^\d+ · /,'')}=${F[f.k]?'ВКЛ':'выкл'}`).join(' · ');
    const s = vars + '  ||  ФИЧИ: ' + feats;
    el.textContent = s;
    return s;
  }

  const COPY='📋 Скопировать мой выбор';
  $('#dlCopy').onclick=()=>{
    const s=updateChoice(), btn=$('#dlCopy');
    const ok=()=>{ btn.textContent='Скопировано ✓'; setTimeout(()=>btn.textContent=COPY,1200); };
    if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(s).then(ok,ok);
    else { const ta=document.createElement('textarea'); ta.value=s; document.body.appendChild(ta); ta.select();
           try{document.execCommand('copy');}catch(e){} document.body.removeChild(ta); ok(); }
  };

  const strip=$('#dlStrip'), sMin=$('#dlStripMin'), sHead=$('#dlStripHead');
  sMin.onclick=()=>{ const m=strip.classList.toggle('min'); sMin.textContent=m?'Развернуть':'Свернуть'; };
  let drag=false,ox=0,oy=0;
  sHead.addEventListener('mousedown',e=>{
    if(e.target.closest('.dl-strip-min')) return;
    const r=strip.getBoundingClientRect();
    strip.style.transform='none'; strip.style.left=r.left+'px'; strip.style.top=r.top+'px';
    ox=e.clientX-r.left; oy=e.clientY-r.top; drag=true; e.preventDefault();
  });
  window.addEventListener('mousemove',e=>{
    if(!drag) return;
    const x=Math.max(0,Math.min(e.clientX-ox,window.innerWidth-strip.offsetWidth));
    const y=Math.max(0,Math.min(e.clientY-oy,window.innerHeight-strip.offsetHeight));
    strip.style.left=x+'px'; strip.style.top=y+'px';
  });
  window.addEventListener('mouseup',()=>{ drag=false; });

  /* ══════════════ INIT ══════════════ */
  buildControls();
  applyGlobals();
  render();
  updateChoice();
})();
