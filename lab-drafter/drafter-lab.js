/* ══════════════════════════════════════════════════════════
   DRAFTER-LAB · песочница полноэкранного драфтера (стекло)
   Живой мок: клик по чемпу → превью в активный слот →
   «Зафиксировать» → ход идёт дальше по боевой последовательности.
   Все варианты раскладки переключаются панелью сверху (data-* на .dl-frame).
   ══════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  /* ── Боевая последовательность драфта (из draft-logic.js) ── */
  const SEQ = [
    {phase:'ban1', side:'blue',action:'ban', idx:0},
    {phase:'ban1', side:'red', action:'ban', idx:0},
    {phase:'ban1', side:'blue',action:'ban', idx:1},
    {phase:'ban1', side:'red', action:'ban', idx:1},
    {phase:'ban1', side:'blue',action:'ban', idx:2},
    {phase:'ban1', side:'red', action:'ban', idx:2},
    {phase:'pick1',side:'blue',action:'pick',idx:0},
    {phase:'pick1',side:'red', action:'pick',idx:0},
    {phase:'pick1',side:'red', action:'pick',idx:1},
    {phase:'pick1',side:'blue',action:'pick',idx:1},
    {phase:'pick1',side:'blue',action:'pick',idx:2},
    {phase:'pick1',side:'red', action:'pick',idx:2},
    {phase:'ban2', side:'red', action:'ban', idx:3},
    {phase:'ban2', side:'blue',action:'ban', idx:3},
    {phase:'ban2', side:'red', action:'ban', idx:4},
    {phase:'ban2', side:'blue',action:'ban', idx:4},
    {phase:'pick2',side:'red', action:'pick',idx:3},
    {phase:'pick2',side:'blue',action:'pick',idx:3},
    {phase:'pick2',side:'blue',action:'pick',idx:4},
    {phase:'pick2',side:'red', action:'pick',idx:4},
  ];
  const SEQ_LEN = SEQ.length;
  const ROLES = ['Соло','Лес','Мид','АДК','Сап'];
  // Чипы-фильтры пула: ярлык Top/Jng/Mid/Adc/Sup → роль чемпа (в данных по-русски)
  const ROLE_TABS = [
    {k:'Соло', t:'Top'},
    {k:'Лес',  t:'Jng'},
    {k:'Мид',  t:'Mid'},
    {k:'АДК',  t:'Adc'},
    {k:'Сап',  t:'Sup'},
  ];

  /* ── Демо-чемпионы (портрет = градиент + буквы, без внешних картинок) ── */
  const CHAMPS = [
    {n:'Aatrox',  i:'A', g:'linear-gradient(135deg,#e74c3c,#7a1d12)', role:'Соло', wr:52},
    {n:'Ahri',    i:'Ah',g:'linear-gradient(135deg,#ff63a4,#7a1d4a)', role:'Мид',  wr:51},
    {n:'Akali',   i:'Ak',g:'linear-gradient(135deg,#27c4a8,#0a4a40)', role:'Мид',  wr:50},
    {n:'Amumu',   i:'Am',g:'linear-gradient(135deg,#2ecc71,#145a32)', role:'Лес',  wr:54},
    {n:'Ashe',    i:'As',g:'linear-gradient(135deg,#7ec8e3,#1a4a66)', role:'АДК',  wr:50},
    {n:'Camille', i:'C', g:'linear-gradient(135deg,#c0c0c0,#5a5a6e)', role:'Соло', wr:49},
    {n:'Darius',  i:'D', g:'linear-gradient(135deg,#b03030,#3a0a0a)', role:'Соло', wr:53},
    {n:'Ezreal',  i:'E', g:'linear-gradient(135deg,#f3d65a,#7a5a10)', role:'АДК',  wr:49},
    {n:'Garen',   i:'G', g:'linear-gradient(135deg,#4aa3ff,#103a6e)', role:'Соло', wr:55},
    {n:'Jhin',    i:'J', g:'linear-gradient(135deg,#d44a6a,#3a0a1a)', role:'АДК',  wr:51},
    {n:'Jinx',    i:'Jx',g:'linear-gradient(135deg,#ff7ac0,#5a1a6e)', role:'АДК',  wr:50},
    {n:'Katarina',i:'K', g:'linear-gradient(135deg,#e0506a,#5a0a1a)', role:'Мид',  wr:48},
    {n:'Leona',   i:'L', g:'linear-gradient(135deg,#f0b84a,#7a4a10)', role:'Сап',  wr:52},
    {n:'Lux',     i:'Lx',g:'linear-gradient(135deg,#ffe06b,#7a6010)', role:'Сап',  wr:50},
    {n:'Malphite',i:'M', g:'linear-gradient(135deg,#7ac0a0,#1a4a3a)', role:'Соло', wr:53},
    {n:'Nasus',   i:'N', g:'linear-gradient(135deg,#d4a050,#5a3a10)', role:'Соло', wr:51},
    {n:'Nautilus',i:'Nt',g:'linear-gradient(135deg,#3a8fb0,#0a2a3a)', role:'Сап',  wr:50},
    {n:'Riven',   i:'R', g:'linear-gradient(135deg,#7ab0d0,#2a4a6e)', role:'Соло', wr:49},
    {n:'Sett',    i:'St',g:'linear-gradient(135deg,#e06a6a,#5a1a1a)', role:'Соло', wr:52},
    {n:'Thresh',  i:'Th',g:'linear-gradient(135deg,#3ad0b0,#0a3a4a)', role:'Сап',  wr:51},
    {n:'Vi',      i:'V', g:'linear-gradient(135deg,#e08a3a,#5a2a0a)', role:'Лес',  wr:50},
    {n:'Yasuo',   i:'Y', g:'linear-gradient(135deg,#6ab0c0,#1a3a4a)', role:'Мид',  wr:50},
    {n:'Zed',     i:'Z', g:'linear-gradient(135deg,#5a6ac0,#1a1a4a)', role:'Мид',  wr:51},
    {n:'Ziggs',   i:'Zg',g:'linear-gradient(135deg,#e0d050,#5a4a10)', role:'Мид',  wr:49},
  ];
  const CMAP = Object.fromEntries(CHAMPS.map(c=>[c.n,c]));

  /* ── Фон-сплэш (стеклу нужно что блюрить — см. feedback_glass_standard) ── */
  const DD = 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/';
  const SPLASHES = {
    thresh:`url('${DD}Thresh_0.jpg')`,
    lux:   `url('${DD}Lux_0.jpg')`,
    yasuo: `url('${DD}Yasuo_0.jpg')`,
    ahri:  `url('${DD}Ahri_0.jpg')`,
    zed:   `url('${DD}Zed_0.jpg')`,
    brand: `radial-gradient(ellipse at 22% 8%,rgba(11,196,227,.30),transparent 55%),radial-gradient(ellipse at 80% 92%,rgba(200,155,60,.24),transparent 55%),linear-gradient(135deg,#02121f,#0a0617)`,
  };
  const port = (name,extra) => {
    const c = CMAP[name]; if(!c) return '';
    return `<span class="dl-port${extra?' '+extra:''}" style="background:${c.g}">${c.i}</span>`;
  };

  /* ── Команды + стартовое состояние драфта (середина 1-й игры) ── */
  const TEAMS = {
    blue:{name:'Cloud9', cap:'Перкз', score:1},
    red: {name:'T1',     cap:'Faker', score:0},
  };
  const GLOBAL_BANS = ['Camille','Akali']; // баны серии (fearless), серым в пуле
  function freshGame(){
    return {
      turnIndex:10, // середина: ходит синяя, 3-й пик
      hover:null,   // выбранный, но не зафиксированный чемп активной стороны
      bans:{ blue:['Aatrox','Darius','Katarina'], red:['Yasuo','Jhin','Leona'] },
      picks:{ blue:['Garen','Malphite'], red:['Nasus','Ashe'] },
    };
  }
  let G = freshGame();

  /* ── Переключатели вариантов (панель сверху) ── */
  const OPTS = {
    bg:{label:'Фон (под стекло)', val:'thresh', items:[
      {v:'thresh', t:'Thresh'},
      {v:'lux',    t:'Lux'},
      {v:'yasuo',  t:'Yasuo'},
      {v:'ahri',   t:'Ahri'},
      {v:'zed',    t:'Zed'},
      {v:'brand',  t:'Бренд'},
    ]},
    ctrlpos:{label:'Кнопки управления', val:'corner', items:[
      {v:'corner', t:'В углу шапки'},
      {v:'dock',   t:'Док снизу'},
      {v:'rail',   t:'Рельс сбоку'},
      {v:'menu',   t:'Меню «⋯»'},
      {v:'split',  t:'Разнесённые'},
      {v:'topbar', t:'Верхняя панель'},
    ]},
    pool:{label:'Пул чемпионов', val:'center', items:[
      {v:'center', t:'Центр'},
      {v:'bottom', t:'Полоса снизу'},
      {v:'roles',  t:'Центр + роли'},
      {v:'fav',    t:'Центр + избранное'},
    ]},
    pickslot:{label:'Слоты пиков', val:'rows', items:[
      {v:'rows',     t:'Строки'},
      {v:'cards',    t:'Карточки'},
      {v:'cardswr',  t:'Карточки + WR'},
      {v:'polaroid', t:'Полароид'},
    ]},
    timer:{label:'Таймер', val:'capsule', items:[
      {v:'capsule', t:'Капсула'},
      {v:'ring',    t:'Кольцо'},
      {v:'bar',     t:'Полоса'},
      {v:'mini',    t:'Мини'},
    ]},
    glass:{label:'Стиль стекла', val:'dense', items:[
      {v:'light', t:'Лёгкое'},
      {v:'dense', t:'Плотное'},
      {v:'neon',  t:'Неон-кант'},
      {v:'tint',  t:'Тонирование'},
    ]},
    turnfx:{label:'Подсветка хода', val:'pulse', items:[
      {v:'pulse',  t:'Пульс рамки'},
      {v:'runner', t:'Бегущая линия'},
      {v:'dim',    t:'Затемнение'},
      {v:'badge',  t:'Бейдж хода'},
    ]},
    bans:{label:'Баны', val:'incol', items:[
      {v:'incol',  t:'В колонке'},
      {v:'bar',    t:'Полоса под шапкой'},
      {v:'corner', t:'В углах капитанов'},
    ]},
    density:{label:'Плотность', val:'normal', items:[
      {v:'cozy',    t:'Просторно'},
      {v:'normal',  t:'Средне'},
      {v:'compact', t:'Плотно'},
    ]},
    pshape:{label:'Форма портретов', val:'rounded', items:[
      {v:'rounded',  t:'Скруглённые'},
      {v:'circle',   t:'Круг'},
      {v:'squircle', t:'Squircle'},
      {v:'hex',      t:'Сота'},
    ]},
    cellname:{label:'Имя в пуле', val:'under', items:[
      {v:'under', t:'Под портретом'},
      {v:'hover', t:'На ховере'},
      {v:'hide',  t:'Скрыть'},
    ]},
    lockstyle:{label:'Кнопка фиксации', val:'fill', items:[
      {v:'fill',    t:'Заливка'},
      {v:'outline', t:'Контур'},
      {v:'neon',    t:'Неон'},
    ]},
    scrim:{label:'Затемнение фона', val:'medium', items:[
      {v:'light',  t:'Лёгкое'},
      {v:'medium', t:'Среднее'},
      {v:'strong', t:'Сильное'},
    ]},
  };
  const S = {};
  Object.keys(OPTS).forEach(k=>S[k]=OPTS[k].val);
  S.sound = true;
  S.paused = false;
  S.roleFilter = 'Соло';   // дефолт фильтра пула = Top
  S.champSize = 'm';       // пользовательская настройка (через ⚙ внутри драфтера)
  let _settingsOpen = false;

  const $  = s => document.querySelector(s);
  const frame = $('#dlFrame');
  let toastT;
  function toast(msg){
    const el = $('#dlToast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(()=>el.classList.remove('show'), 1600);
  }

  /* ══════════════ ПАНЕЛЬ УПРАВЛЕНИЯ ══════════════ */
  function buildControls(){
    const c = $('#dlControls');
    let h = '';
    for(const key of Object.keys(OPTS)){
      const o = OPTS[key];
      h += `<div class="dl-group"><span class="dl-glabel">${o.label}</span><div class="dl-seg" data-opt="${key}">`;
      h += o.items.map(it=>`<button data-v="${it.v}" class="${it.v===S[key]?'on':''}">${it.t}</button>`).join('');
      h += `</div></div>`;
    }
    h += `<div class="dl-group"><span class="dl-glabel">Демо</span><div class="dl-seg"><button id="dlReset">↺ Сбросить драфт</button></div></div>`;
    c.innerHTML = h;

    c.querySelectorAll('.dl-seg[data-opt]').forEach(seg=>{
      seg.addEventListener('click', e=>{
        const b = e.target.closest('button[data-v]'); if(!b) return;
        const key = seg.dataset.opt;
        S[key] = b.dataset.v;
        seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on', x===b));
        applyVariants();
      });
    });
    $('#dlReset').onclick = ()=>{ G = freshGame(); render(); toast('Драфт сброшен'); };
  }

  function applyVariants(){
    frame.dataset.ctrlpos  = S.ctrlpos;
    frame.dataset.pool     = S.pool;
    frame.dataset.pickslot = S.pickslot;
    frame.dataset.timer    = S.timer;
    frame.dataset.glass    = S.glass;
    frame.dataset.turnfx   = S.turnfx;
    frame.dataset.bans     = S.bans;
    frame.dataset.density  = S.density;
    frame.dataset.pshape   = S.pshape;
    frame.dataset.cellname = S.cellname;
    frame.dataset.lockstyle= S.lockstyle;
    frame.dataset.champsize= S.champSize;
    updateBg();
    render();
  }

  /* ══════════════ ВЫЧИСЛЕНИЯ ══════════════ */
  function step(){ return SEQ[G.turnIndex] || null; }
  function isDone(){ return G.turnIndex >= SEQ_LEN; }
  function activeSide(){ const s = step(); return s ? s.side : null; }
  function usedSet(){
    const u = new Set(GLOBAL_BANS);
    ['blue','red'].forEach(side=>{
      (G.bans[side]||[]).forEach(n=>u.add(n));
      (G.picks[side]||[]).forEach(n=>u.add(n));
    });
    if(G.hover) u.add(G.hover);
    return u;
  }

  /* ══════════════ РЕНДЕР ══════════════ */
  function render(){
    const s = step();
    frame.dataset.activeSide = s ? s.side : 'none';
    frame.dataset.phase = isDone() ? 'done' : (s ? s.action : '');

    frame.innerHTML =
        headerHtml()
      + bansBarHtml()        // показывается только при bans=bar (CSS)
      + `<div class="dl-board">`
      +   sidePanelHtml('blue')
      +   centerHtml()
      +   sidePanelHtml('red')
      + `</div>`
      + poolBottomHtml()     // показывается только при pool=bottom (CSS)
      + ctrlsHtml()
      + footerHtml()
      + settingsHtml();

    wire();
  }

  /* ── Фон-слой (ФИКСИРОВАННЫЙ на весь экран, НЕ скролится; стекло его фростит) ── */
  function updateBg(){
    const bg = document.getElementById('dlBg');
    if(!bg) return;
    const isArt = S.bg !== 'brand';
    bg.className = 'dl-bg' + (isArt?' art':'') + ' scrim-' + S.scrim;
    bg.style.backgroundImage = SPLASHES[S.bg] || SPLASHES.thresh;
  }

  /* ── Шапка: капитан · таймер · капитан · (кнопки в углу через CSS) ── */
  function headerHtml(){
    const s = step();
    return `<div class="dl-hdr">`
      + capHtml('blue')
      + `<div class="dl-hdr-center">`
      +   timerHtml()
      +   `<div class="dl-turn">${turnText()}</div>`
      + `</div>`
      + capHtml('red')
      + `</div>`
      + `<div class="dl-timerbar"><i style="width:${s?'62%':'0'}"></i></div>`; // для timer=bar
  }

  function capHtml(side){
    const t = TEAMS[side];
    const s = step();
    const active = s && s.side === side;
    const cornerBans = (G.bans[side]||[]).map(n=>port(n,'mini')).join('')
      + Array.from({length:Math.max(0,5-(G.bans[side]||[]).length)}).map(()=>`<span class="dl-port mini empty">✕</span>`).join('');
    return `<div class="dl-cap dl-cap-${side}${active?' active':''}">`
      + `<div class="dl-cap-info">`
      +   `<div class="dl-cap-team">${t.name}</div>`
      +   `<div class="dl-cap-nick">${t.cap}</div>`
      + `</div>`
      + `<div class="dl-cap-score">${t.score}</div>`
      + `<div class="dl-cap-minitimer">${fmtTime()}</div>`   // для timer=mini
      + `<div class="dl-cap-cornerbans">${cornerBans}</div>` // для bans=corner
      + `</div>`;
  }

  function turnText(){
    if(isDone()) return 'Драфт завершён';
    const s = step();
    const who = s.side === 'blue' ? TEAMS.blue.name : TEAMS.red.name;
    const act = s.action === 'ban' ? 'бан' : 'выбор';
    return `Ход: ${who} · ${act}`;
  }

  function fmtTime(){ return isDone() ? '0:00' : '0:24'; }
  function timerHtml(){
    return `<div class="dl-timer">`
      + `<svg class="dl-timer-ring" viewBox="0 0 100 100" aria-hidden="true"><circle class="bg" cx="50" cy="50" r="45"/><circle class="fg" cx="50" cy="50" r="45"/></svg>`
      + `<span class="dl-timer-num">${fmtTime()}</span>`
      + `</div>`;
  }

  /* ── Полоса банов под шапкой (вариант bans=bar) ── */
  function bansBarHtml(){
    const s = step();
    function row(side){
      let out = '';
      for(let i=0;i<5;i++){
        const n = (G.bans[side]||[])[i];
        const activeBan = s && !isDone() && s.side===side && s.action==='ban' && s.idx===i;
        const showHover = activeBan && G.hover;
        out += `<div class="dl-bb-slot${activeBan?' active':''}">`
          + (n ? port(n,'mini') : (showHover ? port(G.hover,'mini ghost') : `<span class="dl-x">✕</span>`))
          + `</div>`;
      }
      return `<div class="dl-bb-side dl-bb-${side}">${out}</div>`;
    }
    return `<div class="dl-bansbar"><span class="dl-bb-lbl">Баны</span>${row('blue')}<span class="dl-bb-vs">5×5</span>${row('red')}<span class="dl-bb-lbl">Баны</span></div>`;
  }

  /* ── Боковая панель команды: баны (в колонке) + слоты пиков ── */
  function sidePanelHtml(side){
    const picks = G.picks[side] || [];
    const bans  = G.bans[side]  || [];
    const s = step();

    // баны «в колонке» (CSS прячет при bans!=incol)
    let banRow = `<div class="dl-bans">`;
    for(let i=0;i<5;i++){
      const n = bans[i];
      const activeBan = s && !isDone() && s.side===side && s.action==='ban' && s.idx===i;
      const showHover = activeBan && G.hover;
      banRow += `<div class="dl-ban${activeBan?' active':''}">`
        + (n ? port(n) : (showHover ? port(G.hover,'ghost') : `<span class="dl-x">✕</span>`))
        + `</div>`;
    }
    banRow += `</div>`;

    // слоты пиков
    let pickRows = `<div class="dl-picks">`;
    for(let i=0;i<5;i++){
      const n = picks[i];
      const activePick = s && !isDone() && s.side===side && s.action==='pick' && s.idx===i;
      const showHover = activePick && G.hover;
      const champ = n || (showHover ? G.hover : null);
      const c = champ ? CMAP[champ] : null;
      const wr = c ? c.wr : 50;
      pickRows += `<div class="dl-pick${activePick?' active':''}${showHover?' ghost':''}">`
        + (champ ? port(champ) : `<span class="dl-pick-num">${i+1}</span>`)
        + `<div class="dl-pick-meta"><span class="dl-pick-name">${champ||'—'}</span><span class="dl-pick-role">${ROLES[i]}</span></div>`
        + `<div class="dl-pick-wr"><i style="width:${champ?(wr+'%'):'0'}"></i></div>`
        + `</div>`;
    }
    pickRows += `</div>`;

    return `<div class="dl-side dl-side-${side}">`
      + `<div class="dl-side-head"><span class="dl-side-dot"></span>${side==='blue'?'Синяя':'Красная'} · ${TEAMS[side].name}</div>`
      + banRow
      + pickRows
      + `</div>`;
  }

  /* ── Центр: глоб.баны + поиск + сетка пула + кнопка фиксации ── */
  function centerHtml(){
    return `<div class="dl-center">`
      + globalBansHtml()
      + (S.pool==='roles' ? rolesFilterHtml() : '')
      + `<div class="dl-pool-wrap">`
      +   (S.pool==='fav' ? favStripHtml() : '')
      +   `<div class="dl-pool-main">`
      +     `<div class="dl-search">🔍 <input type="text" placeholder="Поиск чемпиона…" id="dlSearch"></div>`
      +     `<div class="dl-grid" id="dlGrid">${gridHtml()}</div>`
      +     lockBtnHtml()
      +   `</div>`
      + `</div>`
      + `</div>`;
  }

  function globalBansHtml(){
    if(!GLOBAL_BANS.length) return '';
    return `<div class="dl-gbans">`
      + `<span class="dl-gbans-lbl">⛔ Баны серии</span>`
      + GLOBAL_BANS.map(n=>port(n,'gban')).join('')
      + `</div>`;
  }

  function rolesFilterHtml(){
    return `<div class="dl-roles">`
      + ROLE_TABS.map(rt=>`<button class="${rt.k===S.roleFilter?'on':''}" data-role="${rt.k}">${rt.t}</button>`).join('')
      + `</div>`;
  }

  function favStripHtml(){
    const fav = ['Garen','Ahri','Jhin','Leona','Vi','Zed'];
    return `<div class="dl-fav"><div class="dl-fav-h">Мета / избранное</div>`
      + fav.map(n=>`<div class="dl-fav-item">${port(n,'mini')}<span>${n}</span><b>${CMAP[n].wr}%</b></div>`).join('')
      + `</div>`;
  }

  function gridHtml(){
    const used = usedSet();
    const s = step();
    const canPick = !isDone() && s;
    const list = (S.pool==='roles') ? CHAMPS.filter(c=>c.role===S.roleFilter) : CHAMPS;
    return list.map(c=>{
      const isUsed = used.has(c.n) && c.n !== G.hover;
      const sel = c.n === G.hover;
      const cls = 'dl-cell' + (isUsed?' used':'') + (sel?' sel':'') + (canPick&&!isUsed?'':' nolink');
      return `<div class="${cls}" data-champ="${c.n}" data-role="${c.role}" title="${c.n} · ${c.role} · ${c.wr}% WR">`
        + port(c.n)
        + `<span class="dl-cell-name">${c.n}</span>`
        + `</div>`;
    }).join('');
  }

  function lockBtnHtml(){
    const s = step();
    if(isDone()) return `<button class="dl-lock done" disabled>✓ Драфт завершён</button>`;
    const label = s.action==='ban' ? 'Забанить' : 'Зафиксировать';
    const ready = !!G.hover;
    return `<button class="dl-lock${ready?' ready':''}" id="dlLock"${ready?'':' disabled'}>${G.hover?(label+' · '+G.hover):('Выбери чемпиона — '+label.toLowerCase())}</button>`;
  }

  /* ── Пул снизу (вариант pool=bottom) — дублирующая полоса, CSS решает что видно ── */
  function poolBottomHtml(){
    if(S.pool!=='bottom') return '';
    // в режиме bottom центр уже не содержит сетку — рисуем её здесь
    return ''; // сетка остаётся в центре; CSS растягивает .dl-center в полную ширину снизу
  }

  /* ── Кнопки управления (один блок, CSS позиционирует по data-ctrlpos) ── */
  function ctrlsHtml(){
    const btn = (k,ic,title,prio)=>`<button class="dl-cbtn${prio?' prio':''}" data-k="${k}" title="${title}">${ic}</button>`;
    const soundIc = S.sound ? '🔊' : '🔇';
    const pauseIc = S.paused ? '▶' : '⏸';
    return `<div class="dl-ctrls" id="dlCtrls">`
      + `<button class="dl-ctrls-toggle" id="dlCtrlsToggle" title="Меню">⋯</button>`
      + `<div class="dl-ctrls-list">`
      +   btn('chat','💬','Чат лобби')
      +   btn('sound',soundIc,'Звук')
      +   btn('assist','🤖','Драфт-помощник')
      +   btn('spec','👁 3','Зрители')
      +   btn('settings','⚙','Настройки')
      +   btn('pause',pauseIc,'Пауза',true)
      +   btn('close','✕','Закрыть',true)
      + `</div>`
      + `</div>`;
  }

  /* ── Низ: бейдж хода (turnfx=badge) ── */
  function footerHtml(){
    return `<div class="dl-turnbadge"><span class="dl-tb-dot"></span>${turnText()}</div>`;
  }

  /* ── ⚙ Пользовательские настройки ВНУТРИ драфтера (НЕ верхняя dev-панель) ── */
  function settingsHtml(){
    if(!_settingsOpen) return '';
    function seg(key, items){
      return `<div class="dl-set-seg" data-set="${key}">`
        + items.map(it=>`<button data-v="${it.v}" class="${S[key]===it.v?'on':''}">${it.t}</button>`).join('')
        + `</div>`;
    }
    return `<div class="dl-settings-mask" id="dlSetMask">`
      + `<div class="dl-settings">`
      +   `<div class="dl-settings-h"><span>⚙ Настройки</span><button class="dl-settings-x" id="dlSetX">✕</button></div>`
      +   `<div class="dl-set-row"><span>Размер чемпионов</span>${seg('champSize',[{v:'s',t:'S'},{v:'m',t:'M'},{v:'l',t:'L'}])}</div>`
      +   `<div class="dl-set-row"><span>Имя чемпиона</span>${seg('cellname',[{v:'under',t:'Видно'},{v:'hover',t:'Ховер'},{v:'hide',t:'Скрыть'}])}</div>`
      +   `<div class="dl-set-row"><span>Форма портретов</span>${seg('pshape',[{v:'rounded',t:'Скругл'},{v:'circle',t:'Круг'},{v:'squircle',t:'Squircle'}])}</div>`
      +   `<div class="dl-set-row"><span>Звук</span>${seg('sound',[{v:true,t:'Вкл'},{v:false,t:'Выкл'}])}</div>`
      +   `<div class="dl-set-note">Это настройки игрока (в боевом — в шестерёнке драфтера). Верхняя панель — наша, для подбора дизайна.</div>`
      + `</div>`
      + `</div>`;
  }

  /* ══════════════ СОБЫТИЯ ══════════════ */
  function wire(){
    // выбор чемпа из пула
    const grid = $('#dlGrid');
    if(grid){
      grid.querySelectorAll('.dl-cell:not(.used)').forEach(cell=>{
        cell.onclick = ()=>{
          if(isDone()) return;
          G.hover = (G.hover === cell.dataset.champ) ? null : cell.dataset.champ;
          render();
        };
      });
    }
    // поиск (фильтр в сетке)
    const search = $('#dlSearch');
    if(search){
      search.oninput = ()=>{
        const q = search.value.trim().toLowerCase();
        grid.querySelectorAll('.dl-cell').forEach(c=>{
          c.style.display = c.dataset.champ.toLowerCase().includes(q) ? '' : 'none';
        });
      };
    }
    // фильтр ролей (Top/Jng/Mid/Adc/Sup) — пересобирает сетку под выбранную роль
    frame.querySelectorAll('.dl-roles button').forEach(b=>{
      b.onclick = ()=>{ S.roleFilter = b.dataset.role; render(); };
    });
    // фиксация
    const lock = $('#dlLock');
    if(lock) lock.onclick = lockIn;
    // кнопки управления
    frame.querySelectorAll('.dl-cbtn').forEach(b=>{
      b.onclick = ()=>handleCtrl(b.dataset.k);
    });
    // меню «⋯»
    const tg = $('#dlCtrlsToggle');
    if(tg) tg.onclick = ()=>$('#dlCtrls').classList.toggle('open');
    // ⚙ пользовательские настройки
    const setMask = $('#dlSetMask');
    if(setMask){
      setMask.onclick = e=>{ if(e.target===setMask){ _settingsOpen=false; render(); } };
      const sx = $('#dlSetX'); if(sx) sx.onclick = ()=>{ _settingsOpen=false; render(); };
      frame.querySelectorAll('.dl-set-seg').forEach(seg=>{
        seg.addEventListener('click', e=>{
          const b = e.target.closest('button[data-v]'); if(!b) return;
          let v = b.dataset.v;
          if(v==='true') v=true; else if(v==='false') v=false;
          S[seg.dataset.set] = v;
          applyVariants();   // применяет data-* + перерисовка (попап остаётся открыт)
          buildControls();   // синхронизируем верхнюю панель (общие настройки)
        });
      });
    }
  }

  function lockIn(){
    if(isDone() || !G.hover) return;
    const s = step();
    if(s.action==='ban'){ G.bans[s.side][s.idx] = G.hover; }
    else { G.picks[s.side][s.idx] = G.hover; }
    G.hover = null;
    G.turnIndex++;
    if(S.sound) beep();
    render();
    if(isDone()) toast('Драфт завершён 🎉');
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

  /* мини-бип на фиксацию (как в боевом, WebAudio) */
  let _ac=null;
  function beep(){
    try{
      const AC = window.AudioContext||window.webkitAudioContext; if(!AC) return;
      _ac = _ac || new AC();
      const o=_ac.createOscillator(), g=_ac.createGain();
      o.type='triangle'; o.frequency.value=720;
      g.gain.setValueAtTime(0.0001,_ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.14,_ac.currentTime+0.01);
      g.gain.exponentialRampToValueAtTime(0.0001,_ac.currentTime+0.12);
      o.connect(g).connect(_ac.destination); o.start(); o.stop(_ac.currentTime+0.14);
    }catch(e){}
  }

  /* ══════════════ INIT ══════════════ */
  $('#dlMinBtn').onclick = ()=>{
    document.body.classList.toggle('dl-min');
    $('#dlMinBtn').textContent = document.body.classList.contains('dl-min') ? 'Развернуть панель' : 'Свернуть панель';
  };
  buildControls();
  applyVariants();
})();
