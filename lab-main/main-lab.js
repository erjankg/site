/* ══════════════════════════════════════════════════════════
   MAIN-LAB · логика песочницы главного экрана
   ══════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  /* ── Раскладки ── */
  const LAYOUTS = [
    {id:'a', n:'Текущая',         d:'Контент по центру колонкой, сайдбар по бургеру', pic:'overlay'},
    {id:'b', n:'Закреп. сайдбар', d:'Сайдбар всегда слева + контент на всё место ПК', pic:'pinned'},
    {id:'c', n:'Дашборд',         d:'KPI-карточки сверху (в режиме статов)',           pic:'cards'},
    {id:'d', n:'Компакт',         d:'Узкая sticky-шапка с blur, плотнее',              pic:'compact'},
    {id:'e', n:'Неон-киберспорт', d:'Свечение, крупная типографика, рамки',            pic:'neon'},
    {id:'f', n:'Сплит',           d:'Таблица + превью чемпиона справа',                pic:'split'},
  ];

  /* ── Виды главного экрана (вкладки в шапке) ── */
  const VIEWS = [
    {v:'stats', t:'Статы',    ic:'📊'},
    {v:'wrpr',  t:'WinRate',  ic:'🏆'},
    {v:'hub',   t:'Мета-хаб', ic:'🧩'},
    {v:'tier',  t:'Тир-лист', ic:'🎖'},
    {v:'patch', t:'Патч',     ic:'📰'},
  ];

  /* ── Категории опций ── */
  const OPTS = {
    switcher:{label:'Навигация (вкладки)', val:'pill', items:[
      {v:'separate',  t:'Раздельные'},
      {v:'pill',      t:'Пилюля-ползунок'},
      {v:'underline', t:'Подчёркивание'},
      {v:'icons',     t:'Иконки'},
      {v:'capsule',   t:'Капсула-градиент'},
      {v:'glow',      t:'Glow-активная'},
      {v:'segment',   t:'Сегмент-фон'},
    ]},
    level:{label:'Стиль уровня', val:'slider', items:[
      {v:'slider',  t:'Ползунок'},
      {v:'chips',   t:'Чипы 1–15'},
      {v:'stepper', t:'Stepper'},
      {v:'radial',  t:'Радиальный'},
      {v:'dropdown',t:'Дропдаун'},
      {v:'segments',t:'Сегменты'},
      {v:'dots',    t:'Точки'},
    ]},
    tbl:{label:'Стиль таблицы', val:'lines', items:[
      {v:'lines',     t:'Линии'},
      {v:'zebra',     t:'Зебра-фон'},
      {v:'cards',     t:'Карточки-строки'},
      {v:'glass',     t:'Стекло'},
      {v:'compact',   t:'Компакт'},
      {v:'borderless',t:'Без рамок'},
    ]},
    port:{label:'Портрет чемпиона', val:'square', items:[
      {v:'square', t:'Скругл-квадрат'},
      {v:'round',  t:'Круг'},
      {v:'hex',    t:'Шестиугольник'},
      {v:'frame',  t:'Рамка-ранга'},
    ]},
    hover:{label:'Hover строк', val:'glow', items:[
      {v:'glow',    t:'Свечение'},
      {v:'zebra',   t:'Зебра'},
      {v:'lift',    t:'Подъём'},
      {v:'line',    t:'Линия'},
      {v:'zoom',    t:'Зум-портрет'},
      {v:'neon',    t:'Неон-рамка'},
      {v:'shimmer', t:'Шиммер'},
      {v:'focus',   t:'Фокус (туман)'},
    ]},
    anim:{label:'Анимация появления', val:'cascade', items:[
      {v:'cascade', t:'Каскад'},
      {v:'fade',    t:'Фейд'},
      {v:'slide',   t:'Слайд'},
      {v:'zoom',    t:'Зум'},
      {v:'blur',    t:'Blur-in'},
      {v:'wave',    t:'Волна'},
      {v:'none',    t:'Нет'},
    ]},
    bg:{label:'Фон страницы', val:'gradient', items:[
      {v:'gradient', t:'Градиент'},
      {v:'stars',    t:'Звёзды'},
      {v:'grid',     t:'Сетка'},
      {v:'calm',     t:'Спокойный'},
    ]},
  };

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
    {ic:'👥', t:'Чемпионы', active:true},
    {ic:'⚔', t:'Калькулятор урона'},
    {ic:'📦', t:'Предметы'},
    {ic:'💎', t:'Руны'},
    {ic:'📋', t:'Драфт-помощник'},
    {ic:'🎯', t:'Драфт (серии)'},
    {ic:'🏆', t:'Тир-лист'},
    {ic:'🗺', t:'Тактическая доска', beta:true},
    {ic:'💬', t:'Чат'},
  ];
  const COLS = [
    {k:'ad',  t:'AD',   ic:'🗡', sorted:true},
    {k:'hp',  t:'HP',   ic:'➕'},
    {k:'mana',t:'Mana', ic:'💧'},
    {k:'ar',  t:'AR',   ic:'🛡'},
    {k:'mr',  t:'MR',   ic:'✦'},
    {k:'rng', t:'RNG',  ic:'⊘'},
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
  const PATCH = [
    {n:'Garen',   type:'buff',   t:'Базовый урон Q +8%, восстановление HP усилено'},
    {n:'Camille', type:'nerf',   t:'Щит пассивки −10%, перезарядка W +2с'},
    {n:'Ambessa', type:'new',    t:'Новый чемпион добавлен в Wild Rift'},
    {n:'Ahri',    type:'adjust', t:'Дальность E увеличена, урон ульты снижен'},
    {n:'Amumu',   type:'buff',   t:'Базовое HP +40, броня за уровень +1.5'},
    {n:'Lux',     type:'nerf',   t:'Радиус E уменьшен на 5%'},
  ];
  const PBADGE = {buff:{t:'▲ БАФ',c:'buff'},nerf:{t:'▼ НЕРФ',c:'nerf'},new:{t:'✦ НОВЫЙ',c:'new'},adjust:{t:'⚙ ПРАВКА',c:'adjust'}};

  /* ── Состояние ── */
  const S = {
    layout:'b', view:'stats', selRow:0,
    switcher:OPTS.switcher.val, level:OPTS.level.val, tbl:OPTS.tbl.val, port:OPTS.port.val,
    hover:OPTS.hover.val, anim:OPTS.anim.val, bg:OPTS.bg.val,
    speed:1, accent:ACCENTS[0].rgb,
  };

  const $ = s => document.querySelector(s);
  const frame = $('#mlFrame');
  const toast = $('#mlToast');
  let toastT;

  /* ══════════════ CONTROLS ══════════════ */
  function buildControls(){
    const c = $('#mlControls');
    let h = '';
    for(const key of Object.keys(OPTS)){
      const o = OPTS[key];
      h += `<div class="ml-group"><span class="ml-glabel">${o.label}</span><div class="ml-seg" data-opt="${key}">`;
      h += o.items.map(it=>`<button data-v="${it.v}" class="${it.v===S[key]?'on':''}">${it.t}</button>`).join('');
      h += `</div></div>`;
    }
    h += `<div class="ml-group"><span class="ml-glabel">Скорость анимаций</span>
      <div class="ml-speed"><input id="mlSpeed" type="range" min="0.3" max="2" step="0.1" value="1"><span id="mlSpeedVal">1.0×</span></div></div>`;
    h += `<div class="ml-group"><span class="ml-glabel">Акцент</span><div class="ml-swatches" id="mlSw">`;
    h += ACCENTS.map(a=>`<span class="ml-sw ${a.rgb===S.accent?'on':''}" data-rgb="${a.rgb}" style="background:${a.hex}" title="${a.t}"></span>`).join('');
    h += `<label class="ml-custom" title="Свой цвет"><input type="color" id="mlCustom" value="#0bc4e3"></label></div></div>`;
    h += `<div class="ml-group"><span class="ml-glabel">&nbsp;</span><div style="display:flex;gap:10px;">
        <button class="ml-copy" id="mlReplay">↻ Проиграть</button>
        <button class="ml-copy" id="mlCopy">⧉ Скопировать конфиг</button></div></div>`;
    c.innerHTML = h;

    c.querySelectorAll('.ml-seg').forEach(seg=>{
      const key = seg.dataset.opt;
      seg.querySelectorAll('button').forEach(b=>{
        b.onclick = ()=>{
          S[key] = b.dataset.v;
          seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on', x===b));
          applyAttrs();
          if(key==='switcher') positionIndicator();
          if(key==='level'){ renderCentral(); }
          if(key==='anim'||key==='hover'||key==='tbl'||key==='port') replay();
        };
      });
    });
    $('#mlSpeed').oninput = e=>{
      S.speed = +e.target.value;
      $('#mlSpeedVal').textContent = S.speed.toFixed(1)+'×';
      document.documentElement.style.setProperty('--spd', S.speed);
    };
    $('#mlSw').querySelectorAll('.ml-sw').forEach(sw=>{
      sw.onclick = ()=>{ setAccent(sw.dataset.rgb);
        $('#mlSw').querySelectorAll('.ml-sw').forEach(x=>x.classList.toggle('on',x===sw)); };
    });
    $('#mlCustom').oninput = e=>{ setAccent(hexToRgb(e.target.value));
      $('#mlSw').querySelectorAll('.ml-sw').forEach(x=>x.classList.remove('on')); };
    $('#mlReplay').onclick = replay;
    $('#mlCopy').onclick = copyConfig;
  }

  /* ══════════════ LAYOUT MAP ══════════════ */
  function buildLayouts(){
    const wrap = $('#mlLayouts');
    wrap.innerHTML = LAYOUTS.map(l=>`
      <div class="ml-lay ${l.id===S.layout?'on':''}" data-l="${l.id}">
        <div class="ml-lay-pic">${picSchema(l.pic)}</div>
        <div class="ml-lay-name"><b>${l.id.toUpperCase()}</b>${l.n}</div>
        <div class="ml-lay-desc">${l.d}</div>
      </div>`).join('');
    wrap.querySelectorAll('.ml-lay').forEach(el=>{
      el.onclick = ()=>{
        S.layout = el.dataset.l;
        wrap.querySelectorAll('.ml-lay').forEach(x=>x.classList.toggle('on',x===el));
        applyAttrs(); positionIndicator();
      };
    });
  }
  function picSchema(t){
    const m={
      overlay:`<i class="bar" style="opacity:.4"></i><div class="col"><i class="top"></i><i></i></div>`,
      pinned:`<i class="bar"></i><div class="col"><i class="top"></i><i></i></div>`,
      cards:`<i class="bar"></i><div class="col"><i class="top"></i><div class="cards"><i></i><i></i><i></i></div><i></i></div>`,
      compact:`<i class="bar"></i><div class="col"><i class="top" style="flex:0 0 5px"></i><i></i></div>`,
      neon:`<i class="bar" style="box-shadow:0 0 8px var(--acc-glow)"></i><div class="col"><i class="top"></i><i style="box-shadow:0 0 10px var(--acc-glow)"></i></div>`,
      split:`<i class="bar"></i><div class="col"><i class="top"></i><div class="split"><i></i><i class="side"></i></div></div>`,
    };
    return m[t]||'';
  }

  /* ══════════════ FRAME SHELL ══════════════ */
  function buildFrame(){
    const side = `<aside class="f-side">
      <div class="f-brand"><div class="logo">🎮</div><div><b>pro-wildrift</b><span>справочник чемпионов</span></div></div>
      <div class="f-cap">Инструменты</div>
      ${SIDE.map(s=>`<div class="side-btn ${s.active?'active':''}"><span class="ico">${s.ic}</span>${s.t}${s.beta?'<span class="beta">BETA</span>':''}</div>`).join('')}
    </aside>`;
    const head = `<div class="f-head">
      <div class="f-burger" id="fBurger"><span></span><span></span><span></span></div>
      <span class="f-logo">PRO-WILDRIFT</span>
      <div class="f-nav" id="fNav">
        ${VIEWS.map(v=>`<button class="f-tab ${v.v===S.view?'on':''}" data-v="${v.v}" data-ic="${v.ic}">${v.t}</button>`).join('')}
        <span class="f-ind"></span>
      </div>
      <div class="f-h-right"><button class="f-pill-btn">RU</button><div class="f-ava"></div></div>
    </div>`;
    frame.innerHTML = side + `<div class="f-app">${head}<div class="f-central" id="fCentral"></div></div>`;

    frame.querySelectorAll('.f-tab').forEach(b=>{
      b.onclick = ()=>{
        S.view = b.dataset.v;
        frame.querySelectorAll('.f-tab').forEach(x=>x.classList.toggle('on',x===b));
        positionIndicator();
        renderCentral();
      };
    });
    const burger = $('#fBurger');
    if(burger) burger.onclick = ()=> frame.classList.toggle('side-open');
    applyAttrs();
    renderCentral();
  }

  /* ══════════════ CENTRAL CONTENT ══════════════ */
  function renderCentral(){
    const box = $('#fCentral');
    box.innerHTML = ({stats:statsView, wrpr:wrprView, hub:hubView, tier:tierView, patch:patchView}[S.view])();
    if(S.view==='stats'||S.view==='wrpr') wireRows();
    positionIndicator();
    replay();
  }

  function statsView(){
    return `<div class="f-kpis">${kpiCards()}</div>
      <div class="f-lvl">
        <div class="f-lvl-top">
          <span class="f-lvl-lbl">УРОВЕНЬ</span><span class="f-lvl-num">10</span>
          <span class="f-patch">Patch 7.0f</span><span class="f-gear">⚙</span>
        </div>${levelControl()}</div>
      <div class="f-tablewrap"><div class="f-card"><table class="f-tbl">
        <thead><tr><th></th><th class="chmp"><span class="f-chmp-th">⚔ Champions</span></th>
        ${COLS.map(c=>`<th class="${c.sorted?'sorted':''}">${c.ic} ${c.t}<span class="arr">▼</span></th>`).join('')}</tr></thead>
        <tbody>${CH.map((c,i)=>`<tr style="--i:${i}" class="${i===S.selRow?'sel':''}" data-row="${i}">
          <td class="f-num">${i+1}</td>
          <td><div class="f-name-cell"><span class="f-x">✕</span><span class="f-port" style="background:${c.g}">${c.i}</span><span class="f-cname">${c.n}</span></div></td>
          <td class="s-ad">${c.ad}</td><td class="s-hp">${c.hp}</td><td class="s-mana">${c.mana}</td>
          <td class="s-ar">${c.ar}</td><td class="s-mr">${c.mr}</td><td class="s-rng">${c.rng}</td></tr>`).join('')}</tbody>
      </table></div>${preview()}</div>`;
  }

  function wrprView(){
    const ranks=['Все ранги','Бронза','Золото','Платина','Алмаз','Мастер+'];
    const roles=['Все роли','Соло','Лес','Мид','Дракон','Саппорт'];
    const sorted=[...CH].sort((a,b)=>b.wr-a.wr);
    const wrCls=v=>v>=52?'wr-g':v>=50?'wr-m':'wr-b';
    return `<div class="f-wrpr">
      <div class="f-wrpr-head">📊<span class="ttl">WinRate &amp; PickRate</span><span class="upd">обновлено 04.04.2026</span></div>
      <div class="f-filters">${ranks.map((r,i)=>`<span class="f-fchip ${i===0?'on':''}">${r}</span>`).join('')}</div>
      <div class="f-filters">${roles.map((r,i)=>`<span class="f-fchip ${i===0?'on':''}">${r}</span>`).join('')}</div>
      <div class="f-card"><table class="f-tbl">
        <thead><tr><th></th><th class="chmp"><span class="f-chmp-th">⚔ Champions</span></th>
        <th>Тир</th><th class="sorted">WR%<span class="arr">▼</span></th><th>PR%</th><th>BR%</th></tr></thead>
        <tbody>${sorted.map((c,i)=>`<tr style="--i:${i}" data-row="${CH.indexOf(c)}">
          <td class="f-num">${i+1}</td>
          <td><div class="f-name-cell"><span class="f-port" style="background:${c.g}">${c.i}</span><span class="f-cname">${c.n}</span></div></td>
          <td><span class="f-tierbadge tb-${c.tier}">${c.tier.toUpperCase()}</span></td>
          <td class="${wrCls(c.wr)}">${c.wr.toFixed(1)}%</td><td>${c.pr}%</td><td>${c.br}%</td></tr>`).join('')}</tbody>
      </table></div></div>`;
  }

  function hubView(){
    const hero=ch('Garen');
    const tools=[['👥','Чемпионы'],['⚔','Калькулятор'],['📦','Предметы'],['💎','Руны'],['📋','Драфтер'],['🏆','Тир-лист']];
    return `<div class="f-hub">
      <div class="hub-hero">
        <div class="big" style="background:${hero.g}">${hero.i}</div>
        <div class="info">
          <span class="lbl">★ Чемпион дня · Patch 7.0f</span>
          <h2>${hero.n}</h2>
          <div class="row"><span class="tag">🎖 Тир ${hero.tier.toUpperCase()}</span><span class="tag">📈 ${hero.wr}% WR</span><span class="tag">🗺 ${hero.role}</span></div>
          <button class="cta">Открыть гайд →</button>
        </div>
      </div>
      <div class="f-kpis" style="display:flex">${kpiCards()}</div>
      <div class="hub-grid">
        <div class="hub-tools">${tools.map(t=>`<div class="hub-tool"><div class="ti">${t[0]}</div><div class="tn">${t[1]}</div></div>`).join('')}</div>
        <div class="hub-news">
          <h4>📰 Что нового <span class="pill">Patch 7.0f</span></h4>
          <ul>
            <li><span class="d">🟢</span><span><b>Garen</b> усилен — урон Q +8%</span></li>
            <li><span class="d">🔴</span><span><b>Camille</b> ослаблена — щит пассивки −10%</span></li>
            <li><span class="d">✦</span><span>Добавлен новый чемпион <b>Ambessa</b></span></li>
            <li><span class="d">⚙</span><span>Реворк предмета «Кровожадник»</span></li>
          </ul>
        </div>
      </div>
    </div>`;
  }

  function tierView(){
    const tiers=[['s','S'],['a','A'],['b','B'],['c','C']];
    return `<div class="f-tier">${tiers.map(([k,lab])=>{
      const pool=CH.filter(c=>c.tier===k);
      return `<div class="tier-row"><div class="tier-badge tb-${k}">${lab}</div>
        <div class="tier-pool">${pool.map(c=>`<div class="tier-champ"><span class="f-port" style="background:${c.g}">${c.i}</span><span>${c.n}</span></div>`).join('')}</div></div>`;
    }).join('')}</div>`;
  }

  function patchView(){
    return `<div class="f-patchfeed">
      <div class="patch-banner"><span class="v">7.0f</span><span class="t"><b>Обновление меты</b>6 изменений чемпионов · обновлено 04.04.2026</span></div>
      ${PATCH.map((p,i)=>{const c=ch(p.n),b=PBADGE[p.type];
        return `<div class="patch-item" style="--i:${i}"><span class="f-port" style="background:${c.g}">${c.i}</span>
          <div class="pc"><div class="pn">${p.n}<span class="pbadge pb-${b.c}">${b.t}</span></div><div class="pt">${p.t}</div></div></div>`;
      }).join('')}</div>`;
  }

  function kpiCards(){
    return `<div class="f-kpi"><div class="k-lbl">Топ патча 7.0f</div><div class="k-val">Garen</div><div class="k-sub">▲ +4.2% WR</div></div>
      <div class="f-kpi"><div class="k-lbl">Мета-роль</div><div class="k-val">Лес</div><div class="k-sub">52% пиков</div></div>
      <div class="f-kpi"><div class="k-lbl">Самый банимый</div><div class="k-val">Camille</div><div class="k-sub">38% банов</div></div>
      <div class="f-kpi"><div class="k-lbl">Чемпионов</div><div class="k-val">128</div><div class="k-sub">обновлено сегодня</div></div>`;
  }

  function preview(){
    const c = CH[S.selRow] || CH[0];
    return `<div class="f-preview"><div class="big" style="background:${c.g}">${c.i}</div>
      <h3>${c.n}</h3>
      <div class="meta"><span class="tag">⚔ ${c.ad} AD</span><span class="tag">❤ ${c.hp} HP</span><span class="tag">🛡 ${c.ar} AR</span></div>
      <p>Живое превью выбранного чемпиона. Кликни строку слева — карточка обновится. Здесь можно показывать сборку, скилы и краткий обзор.</p></div>`;
  }

  function levelControl(){
    if(S.level==='slider') return `<div class="f-slider"><div class="track"><div class="fill"></div></div><div class="knob"></div></div>`;
    if(S.level==='chips'){let h='<div class="f-chips">';for(let i=1;i<=15;i++)h+=`<div class="f-chip ${i===10?'on':''}">${i}</div>`;return h+'</div>';}
    if(S.level==='stepper'){let b='';for(let i=1;i<=15;i++)b+=`<i class="${i<=10?'f':''}"></i>`;return `<div class="f-stepper"><button>−</button><span class="val">10</span><button>+</button><div class="bars">${b}</div></div>`;}
    if(S.level==='radial') return `<div class="f-radial"><div class="ring"><b>10</b></div><div class="hint">Круговой индикатор уровня. Кольцо заполняется от 1 до 15 — наглядно и компактно.</div></div>`;
    if(S.level==='dropdown') return `<div class="f-lvldd"><span>Уровень</span><span class="v">10</span><span class="ch">▾</span></div>`;
    if(S.level==='segments'){let s='';for(let i=1;i<=15;i++)s+=`<i class="${i<=10?'f':''}"></i>`;return `<div class="f-lvlseg">${s}</div>`;}
    if(S.level==='dots'){let d='';for(let i=1;i<=15;i++)d+=`<i class="${i<=10?'f':''}"></i>`;return `<div class="f-lvldots">${d}</div>`;}
    return '';
  }

  /* ══════════════ EVENTS / APPLY ══════════════ */
  function wireRows(){
    frame.querySelectorAll('.f-tbl tbody tr').forEach(tr=>{
      tr.onclick = ()=>{
        S.selRow = +tr.dataset.row;
        frame.querySelectorAll('.f-tbl tbody tr').forEach(x=>x.classList.toggle('sel',x===tr));
        const pv = frame.querySelector('.f-preview');
        if(pv){const tmp=document.createElement('div');tmp.innerHTML=preview();pv.replaceWith(tmp.firstElementChild);}
      };
    });
  }
  function applyAttrs(){
    frame.dataset.layout=S.layout; frame.dataset.view=S.view;
    frame.dataset.switcher=S.switcher; frame.dataset.tbl=S.tbl;
    frame.dataset.port=S.port; frame.dataset.hover=S.hover;
    frame.dataset.anim=S.anim; frame.dataset.bg=S.bg;
  }
  function positionIndicator(){
    const nav=frame.querySelector('.f-nav'); if(!nav)return;
    const ind=nav.querySelector('.f-ind'), on=nav.querySelector('.f-tab.on');
    if(!ind||!on)return;
    requestAnimationFrame(()=>{ ind.style.width=on.offsetWidth+'px'; ind.style.transform=`translateX(${on.offsetLeft}px)`; });
  }
  function replay(){
    if(S.anim==='none'){frame.classList.remove('anim-run');return;}
    frame.classList.remove('anim-run'); void frame.offsetWidth; frame.classList.add('anim-run');
  }
  function setAccent(rgb){ S.accent=rgb; document.documentElement.style.setProperty('--acc-rgb',rgb); }
  function hexToRgb(hex){const n=parseInt(hex.slice(1),16);return `${(n>>16)&255},${(n>>8)&255},${n&255}`;}

  /* ══════════════ COPY CONFIG ══════════════ */
  function copyConfig(){
    const lay=LAYOUTS.find(l=>l.id===S.layout);
    const view=VIEWS.find(v=>v.v===S.view);
    const nm=(k)=>OPTS[k].items.find(i=>i.v===S[k]).t;
    const acc=ACCENTS.find(a=>a.rgb===S.accent);
    const txt=
`Main-Lab — конфигурация главного экрана
──────────────────────────────────────────────
Раскладка:        ${lay.id.toUpperCase()} · ${lay.n}
Главный вид:      ${view.ic} ${view.t}
Навигация:        ${nm('switcher')}
Стиль уровня:     ${nm('level')}
Стиль таблицы:    ${nm('tbl')}
Портрет:          ${nm('port')}
Hover строк:      ${nm('hover')}
Анимация:         ${nm('anim')}
Фон:              ${nm('bg')}
Скорость:         ${S.speed.toFixed(1)}×
Акцент:           ${acc?acc.hex+' ('+acc.t+')':'rgb('+S.accent+')'}
──────────────────────────────────────────────
data-атрибуты:
 data-layout="${S.layout}" data-view="${S.view}" data-switcher="${S.switcher}"
 data-level="${S.level}" data-tbl="${S.tbl}" data-port="${S.port}"
 data-hover="${S.hover}" data-anim="${S.anim}" data-bg="${S.bg}"`;
    navigator.clipboard.writeText(txt).then(()=>showToast('Конфиг скопирован ✓'))
      .catch(()=>showToast('Не удалось скопировать'));
  }
  function showToast(msg){toast.textContent=msg;toast.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>toast.classList.remove('show'),2000);}

  /* ══════════════ INIT ══════════════ */
  buildControls();
  buildLayouts();
  setAccent(S.accent);
  buildFrame();
  window.addEventListener('resize', positionIndicator);
})();
