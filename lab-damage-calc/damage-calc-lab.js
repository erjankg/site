/* ════════════════════════════════════════════════════════════════
   Песочница «Калькулятор урона».
   Модель урона портирована из боевого app.js (calcRun + openItemCalc):
     итог = сырой_урон × 100/(100+эфф.защита),  эфф = защита×(1−%проб) − флат
   Демо-чемпионы со статами/способностями — на боевом подтянутся из
   data-pipeline/Google-таблицы (см. project_data_source / site_structure).
   ════════════════════════════════════════════════════════════════ */

/* ── Демо-чемпионы: база+рост статов (как поля raw боевого) + способности ──
   ratio adR считается от ПОЛНОГО AD, apR — от AP. Цифры демо/правдоподобны. */
const DD_VER = '14.24.1';
const CHAMPS = [
  { name:'Ривен',   dd:'Riven',  ranged:false, ad_b:64, ad_g:3,   hp_b:630, hp_g:105, ar_b:33, ar_g:4.4, mr_b:32, mr_g:1.3,
    abils:[
      {k:'Q',name:'Сломанные крылья', dt:'phys', lo:30, hi:75,  adR:.45, apR:0, hits:3},
      {k:'W',name:'Ки-вспышка',       dt:'phys', lo:50, hi:130, adR:1.0, apR:0, hits:1},
      {k:'R',name:'Клинок изгнанника', dt:'phys', lo:80, hi:260, adR:.6,  apR:0, hits:1},
    ]},
  { name:'Гарен',   dd:'Garen',  ranged:false, ad_b:66, ad_g:4.5, hp_b:690, hp_g:98,  ar_b:36, ar_g:4.5, mr_b:32, mr_g:1.3,
    abils:[
      {k:'Q',name:'Решающий удар',     dt:'phys', lo:30, hi:170, adR:.5,  apR:0, hits:1},
      {k:'E',name:'Правосудие',        dt:'phys', lo:14, hi:50,  adR:.36, apR:0, hits:4},
      {k:'R',name:'Правосудие Демасии', dt:'true', lo:150,hi:400, adR:0,   apR:0, hits:1},
    ]},
  { name:'Дариус',  dd:'Darius', ranged:false, ad_b:64, ad_g:5,   hp_b:650, hp_g:100, ar_b:39, ar_g:4.6, mr_b:32, mr_g:1.3,
    abils:[
      {k:'Q',name:'Калечащий удар',    dt:'phys', lo:40, hi:180, adR:1.0, apR:0, hits:1},
      {k:'W',name:'Сокрушение',        dt:'phys', lo:0,  hi:0,   adR:.4,  apR:0, hits:1},
      {k:'R',name:'Гильотина Ноксуса',  dt:'true', lo:100,hi:400, adR:0,   apR:0, hits:1},
    ]},
  { name:'Зед',     dd:'Zed',    ranged:false, ad_b:63, ad_g:3.4, hp_b:654, hp_g:99,  ar_b:32, ar_g:4.7, mr_b:32, mr_g:1.3,
    abils:[
      {k:'Q',name:'Сюрикен смерти',    dt:'phys', lo:60, hi:200, adR:1.0, apR:0, hits:1},
      {k:'E',name:'Тень клинка',       dt:'phys', lo:65, hi:125, adR:.8,  apR:0, hits:1},
      {k:'R',name:'Предсмертная метка',  dt:'phys', lo:100,hi:250, adR:.4,  apR:0, hits:1},
    ]},
  { name:'Ли Син',  dd:'LeeSin', ranged:false, ad_b:70, ad_g:3.7, hp_b:645, hp_g:108, ar_b:36, ar_g:4.5, mr_b:32, mr_g:2.05,
    abils:[
      {k:'Q',name:'Волна звука',       dt:'phys', lo:55, hi:175, adR:1.0, apR:0, hits:1},
      {k:'E',name:'Вихрь тэмпеста',    dt:'magic',lo:60, hi:160, adR:1.0, apR:0, hits:1},
      {k:'R',name:'Удар дракона',      dt:'phys', lo:150,hi:400, adR:2.0, apR:0, hits:1},
    ]},
  { name:'Ари',     dd:'Ahri',   ranged:true,  ad_b:53, ad_g:3,   hp_b:590, hp_g:96,  ar_b:21, ar_g:4.7, mr_b:30, mr_g:1.3,
    abils:[
      {k:'Q',name:'Орб обмана',        dt:'magic',lo:40, hi:160, adR:0,   apR:.9, hits:2},
      {k:'W',name:'Лисье пламя',       dt:'magic',lo:40, hi:110, adR:0,   apR:.4, hits:3},
      {k:'R',name:'Порыв духа',        dt:'magic',lo:60, hi:180, adR:0,   apR:.35,hits:3},
    ]},
  { name:'Люкс',    dd:'Lux',    ranged:true,  ad_b:54, ad_g:3.3, hp_b:580, hp_g:99,  ar_b:21, ar_g:4.7, mr_b:30, mr_g:1.3,
    abils:[
      {k:'Q',name:'Световой захват',   dt:'magic',lo:50, hi:240, adR:0,   apR:.6, hits:1},
      {k:'E',name:'Сингулярность',     dt:'magic',lo:60, hi:280, adR:0,   apR:.6, hits:1},
      {k:'R',name:'Финальная вспышка',  dt:'magic',lo:100,hi:400, adR:0,   apR:1.0,hits:1},
    ]},
  { name:'Джинкс',  dd:'Jinx',   ranged:true,  ad_b:59, ad_g:3.4, hp_b:630, hp_g:105, ar_b:28, ar_g:4.7, mr_b:30, mr_g:1.3,
    abils:[
      {k:'W',name:'Зап!',              dt:'phys', lo:10, hi:170, adR:1.4, apR:0, hits:1},
      {k:'E',name:'Зыкс-капкан',       dt:'magic',lo:70, hi:170, adR:0,   apR:1.0,hits:1},
      {k:'R',name:'Супер-ракета',      dt:'phys', lo:250,hi:500, adR:1.5, apR:0, hits:1},
    ]},
  { name:'Вейгар',  dd:'Veigar', ranged:true,  ad_b:52, ad_g:3,   hp_b:540, hp_g:95,  ar_b:18, ar_g:4.5, mr_b:30, mr_g:1.3,
    stack:{ label:'Злоба — стаки AP', per:{ap:1}, max:120, def:60 },
    abils:[
      {k:'Q',name:'Кара',              dt:'magic',lo:80, hi:260, adR:0, apR:.6, hits:1},
      {k:'W',name:'Тёмная материя',    dt:'magic',lo:100,hi:350, adR:0, apR:1.0,hits:1},
      {k:'R',name:'Первобытный взрыв', dt:'magic',lo:150,hi:450, adR:0, apR:.75,hits:1},
    ]},
  { name:'Сион',    dd:'Sion',   ranged:false, ad_b:68, ad_g:4,   hp_b:655, hp_g:124, ar_b:36, ar_g:4.6, mr_b:32, mr_g:1.3,
    stack:{ label:'Души — стаки HP', per:{hp:5}, max:200, def:40 },
    abils:[
      {k:'Q',name:'Раскол земли',      dt:'phys', lo:40, hi:160, adR:.6, apR:0, hits:1},
      {k:'E',name:'Крик души',         dt:'magic',lo:65, hi:185, adR:0, apR:.4, hits:1},
      {k:'R',name:'Несокрушимое буйство',dt:'phys',lo:150,hi:300,adR:.4, apR:0, hits:1},
    ]},
  { name:'Сенна',   dd:'Senna',  ranged:true,  ad_b:48, ad_g:2,   hp_b:530, hp_g:89,  ar_b:28, ar_g:4.5, mr_b:30, mr_g:1.3,
    stack:{ label:'Души — AD+крит', per:{ad:1.5,crit:0.4}, max:40, def:15 },
    abils:[
      {k:'Q',name:'Гнётущая тьма',     dt:'phys', lo:40, hi:160, adR:.5, apR:0, hits:1},
      {k:'W',name:'Последний свет',    dt:'magic',lo:70, hi:150, adR:.4, apR:0, hits:1},
      {k:'R',name:'Венец рассвета',    dt:'phys', lo:250,hi:500, adR:.7, apR:0, hits:1},
    ]},
  { name:'Треш',    dd:'Thresh', ranged:false, ad_b:56, ad_g:2.2, hp_b:560, hp_g:93,  ar_b:30, ar_g:0,   mr_b:30, mr_g:1.3,
    stack:{ label:'Души — броня+AP', per:{armor:1,ap:1}, max:100, def:30 },
    abils:[
      {k:'Q',name:'Смертный приговор', dt:'magic',lo:80, hi:260, adR:0, apR:.7, hits:1},
      {k:'E',name:'Распятие',          dt:'magic',lo:60, hi:180, adR:0, apR:.5, hits:1},
      {k:'R',name:'Коробка',           dt:'magic',lo:120,hi:300, adR:0, apR:.9, hits:1},
    ]},
  { name:"Чо'Гат",  dd:'Chogath',ranged:false, ad_b:69, ad_g:4.2, hp_b:644, hp_g:104, ar_b:38, ar_g:4.5, mr_b:32, mr_g:1.3,
    stack:{ label:'Пожиратель — HP', per:{hp:8}, max:40, def:20 },
    abils:[
      {k:'Q',name:'Разлом',            dt:'magic',lo:80, hi:300, adR:0, apR:.8, hits:1},
      {k:'W',name:'Крик ужаса',        dt:'magic',lo:75, hi:225, adR:0, apR:.7, hits:1},
      {k:'R',name:'Пожрать',           dt:'true', lo:300,hi:1000,adR:0, apR:0,  hits:1},
    ]},
];

/* руны-осколки (только статы; кейстоны-уроном — позже). Демо-значения. */
const SHARDS=[
  {row:0,key:'s_ad',label:'+ Сила атаки',stat:{ad:9}},
  {row:0,key:'s_ap',label:'+ Сила умений',stat:{ap:15}},
  {row:0,key:'s_as',label:'+ Скор. атаки',stat:{as:10}},
  {row:1,key:'f_adapt',label:'+ Адаптивно',stat:{ad:6}},
  {row:1,key:'f_armor',label:'+ Броня',stat:{armor:6}},
  {row:1,key:'f_mr',label:'+ МС',stat:{mr:8}},
  {row:2,key:'d_hp',label:'+ Здоровье',stat:{hp:65}},
  {row:2,key:'d_armor',label:'+ Броня',stat:{armor:6}},
  {row:2,key:'d_mr',label:'+ МС',stat:{mr:8}},
];
function statName(k){ return {ad:'AD',ap:'AP',hp:'HP',armor:'броня',mr:'МС',crit:'крит',as:'ск.ат.',ah:'AH',ms:'ск.бега'}[k]||k; }

/* линейный рост базы способности по уровню 1..15 */
function abilLerp(lo,hi,lvl){ return lo + (hi-lo)*(lvl-1)/14; }
/* рост стата база+рост×(уровень−1), как f() в боевом */
function statAt(b,g,lvl){ return Math.round(b + (lvl-1)*g); }
function champIcon(dd){ return `https://ddragon.leagueoflegends.com/cdn/${DD_VER}/img/champion/${dd}.png`; }

/* ── Калькулятор предметов — ПОРТ боевых формул (app.js openItemCalc) ── */
const ITEMS = {
  thornmail:{ name:'🛡 Шипованный доспех', img:'thornmail', desc:'Отражает маг. урон атакующему + Тяжкие раны', needsRange:false,
    fields:[ {id:'ic_myArmor',label:'Моя броня',ph:100,side:'my'},
             {id:'ic_myBonusHp',label:'Мой бонусный HP',ph:500,side:'my'},
             {id:'ic_eMR',label:'МС врага',ph:40,side:'enemy'} ],
    calc:v=>{ const a=+v('ic_myArmor')||100,h=+v('ic_myBonusHp')||500,mr=+v('ic_eMR')||40;
      const raw=20+a*0.06+h*0.02, real=raw*100/(100+mr);
      return {label:'Отражённый маг. урон (после МС)',val:Math.round(real),
        formula:`Сырой: ${Math.round(raw)} → после ${mr} МС: ${Math.round(real)}. Тяжкие раны 60% 3с`}; } },
  botrk:{ name:'⚔ Клинок Погибшего Короля', img:'blade-of-the-ruined-king', desc:'Авто = AD + % текущего HP (физ.) + вампиризм. Удары слабеют по мере падения HP', needsRange:true, combat:true,
    fields:[ {id:'ic_botrkAD',label:'Мой AD',ph:180,side:'my'},
             {id:'ic_botrkAS',label:'Скор. атаки (уд/с)',ph:1.0,side:'my',min:0.2,max:2.5,step:0.05},
             {id:'ic_botrkLS',label:'Вампиризм, %',ph:12,side:'my',min:0,max:100},
             {id:'ic_eHpCur',label:'Текущий HP цели',ph:2500,side:'enemy'},
             {id:'ic_eArmor',label:'Броня врага',ph:100,side:'enemy'},
             {id:'ic_ePen',label:'% пробив. брони',ph:0,side:'enemy',min:0,max:100} ],
    calc:(v,rng)=>{ const hp=+v('ic_eHpCur')||2500,ar=+v('ic_eArmor')||100,pen=+v('ic_ePen')||0,ad=+v('ic_botrkAD')||180,ls=+v('ic_botrkLS')||12;
      const pct=rng?0.07:0.10, onHit=Math.max(15,hp*pct);
      const effAr=ar>0?ar*(1-pen/100):ar, mult=effAr>=0?100/(100+effAr):2-100/(100-effAr);
      const adMit=ad*mult, onMit=onHit*mult, perHit=adMit+onMit, heal=perHit*ls/100;
      return {label:(rng?'Дальний 7%':'Ближний 10%')+' — урон за авто (1-й удар)',val:Math.round(perHit),
        formula:`AD ${ad}×${mult.toFixed(2)}=${Math.round(adMit)} + он-хит ${Math.round(onHit)}×${mult.toFixed(2)}=${Math.round(onMit)} → ${Math.round(perHit)} за удар`,
        heal:Math.round(heal)}; } },
  sunfire:{ name:'🔥 Эгида Солнечного огня', img:'sunfire-aegis', desc:'Маг. урон/с рядом с врагами', needsRange:false,
    fields:[ {id:'ic_myBHp2',label:'Мой бонусный HP',ph:1000,side:'my'},
             {id:'ic_stacks',label:'Стаки (0-4)',ph:4,side:'my',min:0,max:4},
             {id:'ic_eLvl',label:'Уровень врага',ph:10,side:'enemy',min:1,max:15},
             {id:'ic_eMR2',label:'МС врага',ph:40,side:'enemy'} ],
    calc:v=>{ const bHp=+v('ic_myBHp2')||1000,st=Math.min(4,+v('ic_stacks')||4),lv=+v('ic_eLvl')||10,mr=+v('ic_eMR2')||40;
      const base=Math.round(16+(30-16)*(lv-1)/14), raw=(base+bHp*0.01)*(1+st*0.11), real=raw*100/(100+mr);
      return {label:'Маг. урон/сек (после МС)',val:Math.round(real),
        formula:`Сырой: ${Math.round(raw)} → после ${mr} МС: ${Math.round(real)}`}; } },
  liandry:{ name:'🔮 Мучения Лиандри', img:'liandrys-torment', desc:'% макс. HP/с маг. ожог', needsRange:false, liandry:true,
    fields:[ {id:'ic_eHpMaxL',label:'Макс HP цели',ph:3000,side:'enemy'},
             {id:'ic_eMR3',label:'МС врага',ph:40,side:'enemy'} ],
    calc:(v,rng,pct)=>{ const hp=+v('ic_eHpMaxL')||3000,mr=+v('ic_eMR3')||40; pct=pct||0.5;
      const raw=hp*(pct/100)*3, real=raw*100/(100+mr);
      return {label:`Ожог ${pct}%/с 3с (после МС)`,val:Math.round(real),
        formula:`${hp}×${pct}%×3с = ${Math.round(raw)} → после ${mr} МС: ${Math.round(real)}`}; } },
  sunderer:{ name:'⚡ Божественный Разрушитель', img:'divine-sunderer', desc:'Физ. удар + хил', needsRange:true,
    fields:[ {id:'ic_myAD2',label:'Мой базовый AD',ph:120,side:'my'},
             {id:'ic_eHpMaxS',label:'Макс HP цели',ph:3000,side:'enemy'},
             {id:'ic_eArmorS',label:'Броня врага',ph:100,side:'enemy'},
             {id:'ic_ePenS',label:'% пробив. брони',ph:0,side:'enemy',min:0,max:100} ],
    calc:(v,rng)=>{ const ad=+v('ic_myAD2')||120,hp=+v('ic_eHpMaxS')||3000,ar=+v('ic_eArmorS')||100,pen=+v('ic_ePenS')||0;
      const pctDmg=hp*(rng?0.07:0.10), minDmg=ad*1.25, raw=Math.max(pctDmg,minDmg);
      const effAr=ar>0?ar*(1-pen/100):ar, real=raw*100/(100+effAr);
      const heal=Math.max(hp*(rng?0.025:0.06),ad*(rng?0.5:0.9));
      return {label:(rng?'Дальн.':'Ближн.')+' (после брони)',val:Math.round(real),
        formula:`Сырой: ${Math.round(raw)} → эфф. броня ${Math.round(effAr)} → урон: ${Math.round(real)}`,
        heal:Math.round(heal)}; } },
};
const ITEM_ORDER = ['thornmail','botrk','sunfire','liandry','sunderer'];

/* ── КАТАЛОГ СНАРЯГИ (демо, правдоподобные статы WR) — даёт +статы в общий лист.
   Предметы/руны/стаки = всё «источники статов» (один источник правды). На боевом
   подтянем реальные из items/ (~100) и data-pipeline. [[feedback_design_system]] ── */
/* slug = иконка с wildriftfire.com (как на боевом index.html). Реальные предметы WR. */
const GEAR = {
  // урон AD / крит / пробивание брони
  ie:{name:'Грань Бесконечности', img:'infinity-edge',     cat:'AD', ad:65, crit:20},
  bt:{name:'Жажда крови',         img:'bloodthirster',     cat:'AD', ad:55, ls:18},
  collector:{name:'Коллекционер', img:'the-collector',     cat:'AD', ad:50, crit:20, arPenFlat:12},
  youmuu:{name:'Призрачный клинок Йоумуу', img:'youmuus-ghostblade', cat:'AD', ad:55, arPenFlat:18, ms:20},
  serylda:{name:'Обида Серильды', img:'seryldas-grudge',   cat:'AD', ad:45, arPenPct:30, ah:15},
  mortal:{name:'Смертельное напоминание', img:'mortal-reminder', cat:'AD', ad:35, crit:20, arPenPct:30},
  bc:{name:'Чёрный разделитель',  img:'black-cleaver',     cat:'AD', ad:40, hp:300, arPenPct:24},
  tri:{name:'Сила Троицы',        img:'trinity-force',     cat:'AD', ad:35, as:30, hp:250, ah:20},
  navori:{name:'Клинки Навори',   img:'navori-quickblades',cat:'AD', ad:60, crit:20, ah:15},
  // урон AP
  luden:{name:'Эхо Людена',       img:'ludens-echo',       cat:'AP', ap:100, ah:20},
  liandryItem:{name:'Мучения Лиандри', img:'liandrys-torment', cat:'AP', ap:95, hp:300},
  lich:{name:'Лезвие лича',       img:'lich-bane',         cat:'AP', ap:80, ah:15, ms:8},
  nashor:{name:'Зуб Нашора',      img:'nashors-tooth',     cat:'AP', ap:85, as:50, ah:15, onhit:{dt:'magic',flat:15,apR:.2}},
  botrk:{name:'Клинок Погибшего Короля', img:'blade-of-the-ruined-king', cat:'AD', ad:30, as:25, ls:8, onhit:{dt:'phys',pctCurHp:.08}},
  wits:{name:'Конец мудрости',    img:'wits-end',          cat:'AD', as:40, mr:40, onhit:{dt:'magic',flat:45}},
  iorb:{name:'Сфера бесконечности', img:'infinity-orb',    cat:'AP', ap:110, hp:200},
  rylai:{name:'Скипетр Рилай',    img:'rylais-crystal-scepter', cat:'AP', ap:75, hp:400},
  // защита (для цели)
  thornmail:{name:'Шипованный доспех', img:'thornmail',    cat:'Защита', armor:55, hp:300},
  sunfire:{name:'Эгида Солнечного огня', img:'sunfire-aegis', cat:'Защита', armor:50, hp:400},
  deadmans:{name:'Хватка мертвеца', img:'dead-mans-plate', cat:'Защита', armor:55, hp:300, ms:15},
  frozen:{name:'Ледяное сердце',  img:'frozen-heart',      cat:'Защита', armor:70, ah:20},
  heartsteel:{name:'Сердце стали', img:'heartsteel',       cat:'Защита', hp:700},
  hollow:{name:'Пустотное сияние', img:'hollow-radiance',  cat:'Защита', mr:45, hp:350},
  force:{name:'Сила природы',     img:'force-of-nature',   cat:'Защита', mr:60, ms:25},
  kaenic:{name:'Каэник Рукерн',   img:'kaenic-rookern',    cat:'Защита', mr:65, hp:350},
  steraks:{name:'Мощь Стерака',   img:'steraks-gage',      cat:'Защита', hp:400},
};
const BOOTS = {
  plated:{name:'Стальные набойки', img:'plated-steelcaps',          boot:true, armor:20},
  merc:{name:'Ртутные ступни',     img:'mercurys-treads',           boot:true, mr:25},
  swift:{name:'Сапоги проворности', img:'boots-of-swiftness',        boot:true, ms:45},
  ionian:{name:'Ионийские сапоги',  img:'ionian-boots-of-lucidity',  boot:true, ah:20},
  sorc:{name:'Магнитный бластер',   img:'magnetic-blaster',          boot:true, mrPenFlat:12},
  glutton:{name:'Прожорливые поножи', img:'gluttonous-greaves',      boot:true, ls:8},
};
/* цена предметов (золото, ~как в WR) — для стоимости билда и урон/золото */
const GOLD = {
  ie:3400, bt:3200, collector:3000, youmuu:3000, serylda:3000, mortal:3000, bc:3000, tri:3333, navori:3000,
  luden:3200, liandryItem:3000, lich:3000, nashor:3000, botrk:3000, wits:2800, iorb:2900, rylai:2900,
  thornmail:2700, sunfire:2700, deadmans:2900, frozen:2700, heartsteel:3000, hollow:2700, force:2900, kaenic:2800, steraks:3000,
  plated:1100, merc:1100, swift:1000, ionian:1000, sorc:1100, glutton:1100,
};
function gearGold(items,boots){ let g=0; (items||[]).forEach(k=>g+=GOLD[k]||3000); if(boots)g+=GOLD[boots]||1100; return g; }
function itemImg(slug){
  return `<img class="dc-ico" src="https://www.wildriftfire.com/images/items/${slug}.png" alt="" loading="lazy"
    onerror="this.classList.add('miss');this.removeAttribute('src')">`;
}
function runeImg(slug){
  return `<img class="dc-ico" src="https://www.wildriftfire.com/images/runes/${slug}.png" alt="" loading="lazy"
    onerror="this.classList.add('miss');this.removeAttribute('src')">`;
}

/* ── КЛЮЧЕВЫЕ РУНЫ Wild Rift (реальные, иконки wildriftfire) ──
   type: proc=доп.урон / mult=множитель / stat=статы. Демо-числа, механики WR. */
const KEYSTONES = {
  none:        { name:'Без руны' },
  electrocute: { name:'Электрокьют',       img:'electrocute',          type:'proc', dt:'magic', lo:30, hi:180, adR:.20, apR:.15, note:'после 3 ударов по чемпиону' },
  comet:       { name:'Тайная комета',      img:'arcane-comet',         type:'proc', dt:'magic', lo:30, hi:100, adR:.10, apR:.20, note:'прок от умений' },
  darkharvest: { name:'Тёмная жатва',       img:'dark-harvest',         type:'proc', dt:'adaptive', lo:20, hi:60, adR:.25, apR:.15, cond:'lowhp', note:'если цель <50% HP' },
  firststrike: { name:'Первый удар',        img:'first-strike',         type:'mult', mult:1.08, note:'+8% ко всему урону' },
  conqueror:   { name:'Завоеватель',        img:'conqueror',            type:'stat', note:'+адаптивная сила (стакается на авто)' },
  lethaltempo: { name:'Смертельный темп',    img:'lethal-tempo',         type:'as',   note:'разгон скор.атаки на авто' },
};
const KS_ORDER = ['none','electrocute','comet','darkharvest','firststrike','conqueror','lethaltempo'];

/* статы от стат-руны (Завоеватель) — адаптивно по типу урона чемпа */
function keystoneStat(key,type){
  if(key!=='conqueror') return {ad:0,ap:0};
  return type==='ap' ? {ad:0,ap:40} : {ad:25,ap:0};
}
function keystoneMult(key){ const k=KEYSTONES[key]; return (k&&k.type==='mult')?k.mult:1; }
/* один прок руны → {dmg, dt} с митигацией; 0 если не подходит */
function keystoneProc(key, A, D, type, tgtHpPct){
  const k=KEYSTONES[key]; if(!k||k.type!=='proc') return null;
  if(k.cond==='lowhp' && tgtHpPct>50) return null;
  let dt=k.dt; if(dt==='adaptive') dt = type==='ap'?'magic':'phys';
  const raw=abilLerp(k.lo,k.hi,A.lvl||11)+k.adR*A.ad+k.apR*A.ap;
  let res;
  if(dt==='phys') res=(D.armor>0?D.armor*A.arFrac:D.armor)-A.arFlat;
  else if(dt==='magic') res=(D.mr>0?D.mr*A.mrFrac:D.mr)-A.mrFlat;
  else return {dmg:raw, dt:'true'};
  return { dmg:raw*mitFromEff(res), dt };
}
function runeSlot(side){
  const cur = side==='my'?state.myKeystone:state.bKeystone;
  const k=KEYSTONES[cur]||KEYSTONES.none;
  return `<div class="dc-runeslot">
    <div class="dc-rune-ico">${k.img?runeImg(k.img):'<span class="dc-rune-none">⛌</span>'}</div>
    <select class="dc-sel" data-rune="${side}">
      ${KS_ORDER.map(id=>`<option value="${id}" ${id===cur?'selected':''}>🔮 ${KEYSTONES[id].name}${KEYSTONES[id].note?' — '+KEYSTONES[id].note:''}</option>`).join('')}
    </select>
  </div>`;
}

/* сложить статы списка снаряги (% пробивания множатся, флат складывается) */
function aggregateList(items, boots){
  const a={ad:0,ap:0,hp:0,armor:0,mr:0,crit:0,as:0,ms:0,ah:0,ls:0,apAmp:0,arPenFrac:1,arPenFlat:0,mrPenFrac:1,mrPenFlat:0};
  const add=g=>{ if(!g)return;
    a.ad+=g.ad||0; a.ap+=g.ap||0; a.hp+=g.hp||0; a.armor+=g.armor||0; a.mr+=g.mr||0;
    a.crit+=g.crit||0; a.as+=g.as||0; a.ms+=g.ms||0; a.ah+=g.ah||0; a.ls+=g.ls||0; a.apAmp+=g.apAmp||0;
    if(g.arPenPct)a.arPenFrac*=(1-g.arPenPct/100); a.arPenFlat+=g.arPenFlat||0;
    if(g.mrPenPct)a.mrPenFrac*=(1-g.mrPenPct/100); a.mrPenFlat+=g.mrPenFlat||0; };
  (items||[]).forEach(k=>add(GEAR[k]));
  add(BOOTS[boots]);
  return a;
}
/* хелперы стороны: my (атакующий) / tgt (цель) / build (сборка) */
function gearArr(side){ return side==='my'?state.myItems : side==='build'?state.bItems : state.tgtItems; }
function getBoots(side){ return side==='my'?state.myBoots : side==='build'?state.bBoots : state.tgtBoots; }
function setBoots(side,v){ if(side==='my')state.myBoots=v; else if(side==='build')state.bBoots=v; else state.tgtBoots=v; }
function aggregateGear(side){ return aggregateList(gearArr(side), getBoots(side)); }
/* мититация по уже-эффективной защите (отриц. защита усиливает урон) */
function mitFromEff(eff){ return eff>=0 ? 100/(100+eff) : 2 - 100/(100-eff); }

/* ── стандартный набор настроек лаба ── */
const DD = 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash';
const SPLASHES = [
  { key:'lux',label:'Lux' },{ key:'thresh',label:'Thresh' },{ key:'ahri',label:'Ahri' },
  { key:'yasuo',label:'Yasuo' },{ key:'jinx',label:'Jinx' },{ key:'brand',label:'Brand' },
];
const SPLASH_IMG = { lux:`url('${DD}/Lux_0.jpg')`, thresh:`url('${DD}/Thresh_0.jpg')`, ahri:`url('${DD}/Ahri_0.jpg')`,
  yasuo:`url('${DD}/Yasuo_0.jpg')`, jinx:`url('${DD}/Jinx_0.jpg')`, brand:`url('${DD}/Brand_0.jpg')` };
const GLASS_POW=[{key:'light',label:'Лёгкое'},{key:'mid',label:'Среднее'},{key:'strong',label:'Сильное'},{key:'ultra',label:'Экстрим'}];
const GLASS_TINTS=[{key:'neutral',label:'Нейтр. (бело-матовое)'},{key:'accent',label:'Акцент (циан)'},{key:'warm',label:'Тёплое'},{key:'cool',label:'Холодное'}];
const GLASS_SAT=[{key:'norm',label:'Обычная'},{key:'rich',label:'Сочная'},{key:'max',label:'Максимум'}];
const GLASS_BORDER=[{key:'thin',label:'Тонкая'},{key:'glow',label:'Свечение'},{key:'none',label:'Без рамки'}];
const BG_DIMS=[{key:'none',label:'Нет',v:0.14},{key:'light',label:'Слабо',v:0.38},{key:'mid',label:'Средне',v:0.60},{key:'strong',label:'Сильно',v:0.82}];

/* акцент + градиент */
const ACCENTS=[{key:'cyan',label:'Циан',c:'#0BC4E3',rgb:'11,196,227'},{key:'gold',label:'Золото',c:'#C89B3C',rgb:'200,155,60'},
  {key:'violet',label:'Фиолет',c:'#8b5cf6',rgb:'139,92,246'},{key:'green',label:'Зелёный',c:'#2ecc71',rgb:'46,204,113'},
  {key:'red',label:'Красный',c:'#e74c3c',rgb:'231,76,60'},{key:'pink',label:'Розовый',c:'#ff5fa2',rgb:'255,95,162'}];

/* ── варианты (для нас) ── */
const LAYOUTS=[
  {id:'duel',   name:'A · Дуэль (атакующий | цель)'},
  {id:'flow',   name:'B · Поток (сверху вниз)'},
  {id:'split',  name:'C · Сплит (атак.|итог|цель)'},
  {id:'bento',  name:'D · Бенто (плитки)'},
  {id:'compact',name:'E · Компакт (узкая колонка)'},
  {id:'pad',    name:'F · Пульт (большой экран)'},
];
const RESVIEWS=[
  {id:'bar',name:'HP-полоса'},{id:'big',name:'Большое число'},
  {id:'ring',name:'Кольцо-прогресс'},{id:'breakdown',name:'Разбивка'},
];
const TABPOS=[{id:'top',name:'Сверху'},{id:'left',name:'Слева (вертик.)'},{id:'seg',name:'Сегмент по центру'}];
const ACTIONPOS=[{id:'inres',name:'В результате'},{id:'head',name:'В шапке окна'},{id:'bottom',name:'Снизу (полоса)'}];

/* ── состояние ── */
const DEFAULTS = {
  lay:'duel', resview:'bar', tabpos:'top', actionpos:'inres',
  bg:'lux', bgdim:'mid',
  accent:'cyan', grad2:'#6D3FF5', angle:160,
  glasspow:'mid', tint:'accent', glasssat:'norm', glassborder:'thin', glassnoise:false,
  radius:16, gap:14,
  showFormula:true, animNum:true,
  // данные расчёта (базовые статы автозаполняются из чемпа/уровня, редактируемы для манекена)
  myChamp:'Ривен', myLvl:11, myBaseAD:100, myBonusAD:0, myAP:0, myCrit:0, myArPen:0, myArPenFlat:0, myMrPen:0, myMrPenFlat:0,
  myItems:['ie','serylda'], myBoots:'plated', myKeystone:'electrocute',
  tgtChamp:'Гарен', tgtLvl:11, tgtArmor:100, tgtMR:40, tgtHpMax:2000, tgtArBonus:0, tgtMrBonus:0, tgtHpBonus:0, tgtHpCurPct:100,
  tgtItems:['thornmail','heartsteel'], tgtBoots:'merc',
  // Сборка (вкладка 3): чемпион + предметы + руны-осколки + стаки → итоговые статы
  bChamp:'Вейгар', bLvl:11, bItems:['luden','nashor'], bBoots:'sorc', bShards:{0:'s_ap',1:'f_adapt',2:'d_hp'}, bStacks:60, bKeystone:'electrocute',
  abilState:{},   // {Q:{on,hits}}
  aaOn:true, aaHits:3,
  tab:'dmg',                 // активная вкладка (dmg|items|build|arena)
  curItem:'botrk',
  itemRange:{}, liandryPct:0.5,
  arena:'duel',              // режим мини-игры
};
let state = JSON.parse(JSON.stringify(DEFAULTS));
let usersetOpen = false;
let gearPick = null;   // открытый пикер снаряги: 'my:items' | 'tgt:boots' | null
let _fightHp = null;   // накопительный HP цели между «Разыграть» (null = с полного)
let _fightKey = '';    // ключ цели — сменился → бой сбрасывается
let LS = null;

function champByName(n){ return CHAMPS.find(c=>c.name===n) || null; }
function accentObj(){ return ACCENTS.find(a=>a.key===state.accent) || ACCENTS[0]; }

/* автозаполнить базовые статы из выбранного чемпа+уровня (для манекена не трогаем — юзер правит сам) */
function syncAutoStats(){
  const c=champByName(state.myChamp);
  if(c) state.myBaseAD=statAt(c.ad_b,c.ad_g,state.myLvl);
  const t=champByName(state.tgtChamp);
  if(t){
    state.tgtArmor=statAt(t.ar_b,t.ar_g,state.tgtLvl);
    state.tgtMR   =statAt(t.mr_b,t.mr_g,state.tgtLvl);
    state.tgtHpMax=statAt(t.hp_b,t.hp_g,state.tgtLvl);
  }
}

/* инициализация abilState для выбранного чемпа */
function ensureAbilState(){
  const c = champByName(state.myChamp);
  const next = {};
  if(c) c.abils.forEach(a=>{
    const prev = state.abilState[a.k];
    next[a.k] = prev ? { on:prev.on, hits:prev.hits } : { on:true, hits:a.hits };
  });
  state.abilState = next;
}

/* ── ОСНОВНОЙ РАСЧЁТ: вернуть {rows[], totalRaw, totalMit, ...} ── */
function compute(){
  const c = champByName(state.myChamp);
  const myG = aggregateGear('my'), tgG = aggregateGear('tgt');

  const ksType = c?champDmgType(c):'ad';
  const ksStat = keystoneStat(state.myKeystone, ksType);   // Завоеватель → +AD/AP до комбо
  const baseAD = +state.myBaseAD||0;
  const totalAD = baseAD + (+state.myBonusAD||0) + myG.ad + ksStat.ad;
  const ap = (((+state.myAP||0) + myG.ap) * (1 + myG.apAmp)) + ksStat.ap;
  const crit = Math.max(0, Math.min(100, (+state.myCrit||0) + myG.crit));

  const armor = (+state.tgtArmor||0) + (+state.tgtArBonus||0) + tgG.armor;
  const mr    = (+state.tgtMR||0)    + (+state.tgtMrBonus||0) + tgG.mr;
  const hpMax = (+state.tgtHpMax||0) + (+state.tgtHpBonus||0) + tgG.hp;
  const hpCur = Math.round(hpMax * (state.tgtHpCurPct/100));

  // пробивание: ручной % × снаряга % (множатся), флат складывается
  const arFrac = (1-(+state.myArPen||0)/100) * myG.arPenFrac;
  const arFlat = (+state.myArPenFlat||0) + myG.arPenFlat;
  const mrFrac = (1-(+state.myMrPen||0)/100) * myG.mrPenFrac;
  const mrFlat = (+state.myMrPenFlat||0) + myG.mrPenFlat;
  const effArmor = (armor>0 ? armor*arFrac : armor) - arFlat;
  const effMR    = (mr>0 ? mr*mrFrac : mr) - mrFlat;
  const multPhys = mitFromEff(effArmor), multMag = mitFromEff(effMR);
  const multOf = dt => dt==='phys'?multPhys : dt==='magic'?multMag : 1;

  const rows = [];
  if(state.aaOn){
    const rawHit = totalAD * (1 + crit/100);             // крит ≈ +100% при 100%
    const hits = Math.max(1, state.aaHits|0);
    rows.push({ key:'AA', name:'Авто-атака', dt:'phys', raw:rawHit*hits, mit:rawHit*hits*multPhys, hits });
  }
  if(c) c.abils.forEach(a=>{
    const st = state.abilState[a.k]; if(!st || !st.on) return;
    const base = abilLerp(a.lo,a.hi,state.myLvl);
    const rawHit = base + a.adR*totalAD + a.apR*ap;
    const hits = Math.max(1, st.hits|0);
    rows.push({ key:a.k, name:a.name, dt:a.dt, raw:rawHit*hits, mit:rawHit*hits*multOf(a.dt), hits });
  });

  // ключевая руна: прок (доп. строка) + множитель «Первого удара»
  const proc = keystoneProc(state.myKeystone, {ad:totalAD,ap,lvl:state.myLvl,arFrac,arFlat,mrFrac,mrFlat}, {armor,mr}, ksType, state.tgtHpCurPct);
  if(proc) rows.push({ key:'★', name:'Руна · '+KEYSTONES[state.myKeystone].name, dt:proc.dt, raw:proc.dmg, mit:proc.dmg, hits:1, rune:true });
  const ksMult = keystoneMult(state.myKeystone);
  if(ksMult!==1) rows.forEach(r=>{ r.raw*=ksMult; r.mit*=ksMult; });

  const totalRaw = rows.reduce((s,r)=>s+r.raw,0);
  const totalMit = rows.reduce((s,r)=>s+r.mit,0);
  const pctHp = hpMax>0 ? Math.min(100, totalMit/hpMax*100) : 0;
  const toKill = totalMit>0 ? Math.ceil(hpCur/totalMit) : '∞';
  const mitPct = totalRaw>0 ? (totalRaw-totalMit)/totalRaw*100 : 0;

  // 🪙 золото + эффективность
  const cost = gearGold(state.myItems, state.myBoots);
  const dmgPerK = cost>0 ? Math.round(totalMit/cost*1000) : 0;

  // 🛡 брейкпоинт выживания: сколько ДОП. сопротивления цели нужно, чтобы пережить комбо
  const comboAt=(arX,mrX)=>{ const mP=mitFromEff((arX>0?arX*arFrac:arX)-arFlat), mM=mitFromEff((mrX>0?mrX*mrFrac:mrX)-mrFlat);
    return rows.reduce((s,r)=> s + (r.rune ? r.mit : r.raw*(r.dt==='phys'?mP:r.dt==='magic'?mM:1)), 0); };
  const physRaw=rows.filter(r=>r.dt==='phys').reduce((s,r)=>s+r.raw,0);
  const magRaw =rows.filter(r=>r.dt==='magic').reduce((s,r)=>s+r.raw,0);
  const bpPhys = physRaw>=magRaw;
  let bpExtra=0, bpSurvives = comboAt(armor,mr) < hpCur;
  if(!bpSurvives){ let lo=0,hi=600; for(let it=0;it<26;it++){ const m=(lo+hi)/2;
    const v=bpPhys?comboAt(armor+m,mr):comboAt(armor,mr+m); if(v<hpCur)hi=m; else lo=m; } bpExtra=Math.ceil(hi); }

  return { rows, totalRaw, totalMit, totalAD, ap, crit, armor, mr, hpMax, hpCur, myG, tgG, keystone:state.myKeystone,
    effArmor:Math.round(effArmor*10)/10, effMR:Math.round(effMR*10)/10, pctHp, toKill, mitPct,
    cost, dmgPerK, bpExtra, bpResist:bpPhys?'брони':'МС', bpSurvives };
}

/* текущий HP цели в бою: накапливается между «Разыграть», авто-сброс при смене цели/HP */
function fightBaseHp(d){
  const key = state.tgtChamp+'|'+state.tgtLvl+'|'+d.hpMax+'|'+state.tgtHpCurPct;
  if(key!==_fightKey){ _fightKey=key; _fightHp=null; }
  return _fightHp!=null ? _fightHp : d.hpCur;
}
function fightReset(){ _fightHp=null; _fightKey=''; }

/* ── снаряга: чипы выбранного + кнопки + сводка статов ── */
function gearReadout(side,g){
  if(side==='build') return '';   // в сборке итоги показывает общий лист статов
  const p=[];
  if(side==='my'){
    if(g.ad)p.push(`+${g.ad} AD`); if(g.ap)p.push(`+${g.ap} AP`);
    if(g.apAmp)p.push(`+${Math.round(g.apAmp*100)}% AP`);
    if(g.crit)p.push(`+${g.crit}% крит`);
    const ar=Math.round((1-g.arPenFrac)*100); if(ar)p.push(`${ar}% проб.брони`);
    if(g.arPenFlat)p.push(`+${g.arPenFlat} флат-проб`);
    const m=Math.round((1-g.mrPenFrac)*100); if(m)p.push(`${m}% проб.МС`);
    if(g.mrPenFlat)p.push(`+${g.mrPenFlat} флат-МС-проб`);
  } else {
    if(g.armor)p.push(`+${g.armor} броня`); if(g.mr)p.push(`+${g.mr} МС`); if(g.hp)p.push(`+${g.hp} HP`);
  }
  return p.length?`<div class="dc-greadout">из снаряги: ${p.join(' · ')}</div>`:'';
}
function gearBlock(side){
  const items = gearArr(side);
  const boots = getBoots(side);
  const chip=(k,boot)=>{ const it=boot?BOOTS[k]:GEAR[k]; if(!it)return'';
    return `<span class="dc-gchip ${boot?'boot':''}" data-rem="${side}:${boot?'boots':'items'}:${k}">${itemImg(it.img)}${it.name}<i>✕</i></span>`; };
  const itemChips = items.map(k=>chip(k,false)).join('');
  const bootChip = boots?chip(boots,true):'';
  return `<div class="dc-loadout">
    <div class="dc-gear-row">${itemChips||'<span class="dc-gmuted">нет предметов</span>'}${bootChip}</div>
    <div class="dc-gear-btns">
      <button class="dc-gbtn" data-pick="${side}:items" ${items.length>=6?'disabled':''}>＋ предмет</button>
      <button class="dc-gbtn boot" data-pick="${side}:boots">${boots?'⤿ сменить ботинки':'＋ ботинки'}</button>
    </div>
    ${gearReadout(side, aggregateGear(side))}
  </div>`;
}
function gearStatLine(v){
  const m=[];
  if(v.ad)m.push(`${v.ad} AD`); if(v.ap)m.push(`${v.ap} AP`); if(v.apAmp)m.push(`+${Math.round(v.apAmp*100)}% AP`);
  if(v.hp)m.push(`${v.hp} HP`); if(v.armor)m.push(`${v.armor} брони`); if(v.mr)m.push(`${v.mr} МС`);
  if(v.crit)m.push(`${v.crit}% крит`); if(v.as)m.push(`${v.as}% AS`); if(v.ah)m.push(`${v.ah} AH`);
  if(v.ms)m.push(`${v.ms} ск.бега`); if(v.ls)m.push(`${v.ls}% вамп`);
  if(v.arPenPct)m.push(`${v.arPenPct}% проб.брони`); if(v.arPenFlat)m.push(`${v.arPenFlat} флат-проб`);
  if(v.mrPenPct)m.push(`${v.mrPenPct}% проб.МС`); if(v.mrPenFlat)m.push(`${v.mrPenFlat} флат-проб.МС`);
  return m.join(' · ');
}
function gearPickerHTML(){
  if(!gearPick) return '';
  const [side,mode]=gearPick.split(':');
  let entries;
  if(mode==='boots') entries=Object.entries(BOOTS);
  else if(side==='build') entries=Object.entries(GEAR);   // в сборке — все предметы
  else entries=Object.entries(GEAR).filter(([k,v])=>{
    const off=v.ad||v.ap||v.crit||v.arPenPct||v.arPenFlat||v.mrPenPct||v.mrPenFlat||v.apAmp;
    const def=v.armor||v.mr||v.hp;
    return side==='my'?off:def; });
  const cur = mode==='boots'?[getBoots(side)]:gearArr(side);
  const sideLabel = side==='my'?'атакующий':side==='build'?'сборка':'цель';
  const cards=entries.map(([k,v])=>`<div class="dc-pcard ${cur.includes(k)?'on':''}" data-gear="${side}:${mode}:${k}">
      ${itemImg(v.img)}<div class="pc-txt"><div class="pc-n">${v.name}</div><div class="pc-s">${gearStatLine(v)}</div></div></div>`).join('');
  return `<div class="dc-gpick-ov" data-gclose>
    <div class="dc-gpick glassy">
      <div class="dc-gpick-h">${mode==='boots'?'🥾 Ботинки':'📦 Предметы'} — ${sideLabel}
        <button class="dc-close" data-gclose>✕</button></div>
      <div class="dc-pgrid">${cards}</div>
    </div></div>`;
}

/* ════════════ РЕНДЕР: панели атакующего/цели ════════════ */
function dtLabel(dt){ return dt==='phys'?'Физ.':dt==='magic'?'Маг.':'Чистый'; }

function panelAttacker(){
  const c = champByName(state.myChamp);
  const baseAD = state.myBaseAD;
  const ava = c
    ? `<img class="dc-ava" src="${champIcon(c.dd)}" alt="${c.name}" onerror="this.classList.add('ph');this.removeAttribute('src');this.textContent='${c.name[0]}'">`
    : `<div class="dc-ava ph">М</div>`;
  return `<div class="dc-panel atk glassy">
    <div class="dc-panel-head">
      <span class="dc-side-tag atk">Атакующий</span>
      ${ava}
      <div class="dc-champ">
        <select class="dc-sel" id="myChamp">
          <option value="">🪆 Манекен (свои числа)</option>
          ${CHAMPS.map(x=>`<option value="${x.name}" ${x.name===state.myChamp?'selected':''}>${x.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="dc-lvl">
      <input type="range" id="myLvl" min="1" max="15" value="${state.myLvl}">
      <span class="dc-lvl-badge">Ур. ${state.myLvl}</span>
    </div>
    <div class="dc-fields">
      <div class="dc-field"><label class="dc-flabel">Базовый AD ${c?'<span class="auto">авто</span>':''}</label>
        <input class="dc-input" id="myBaseAD" type="number" value="${baseAD}" ${c?'readonly':''}></div>
      <div class="dc-field"><label class="dc-flabel">Бонус AD (предметы)</label>
        <input class="dc-input" id="myBonusAD" type="number" value="${state.myBonusAD}"></div>
      <div class="dc-field"><label class="dc-flabel">Сила умений (AP)</label>
        <input class="dc-input" id="myAP" type="number" value="${state.myAP}"></div>
      <div class="dc-field"><label class="dc-flabel">Крит, %</label>
        <input class="dc-input" id="myCrit" type="number" min="0" max="100" value="${state.myCrit}"></div>
      <div class="dc-field"><label class="dc-flabel">Пробив. брони, %</label>
        <input class="dc-input" id="myArPen" type="number" min="0" max="100" value="${state.myArPen}"></div>
      <div class="dc-field"><label class="dc-flabel">Пробив. брони (флат)</label>
        <input class="dc-input" id="myArPenFlat" type="number" min="0" value="${state.myArPenFlat}"></div>
      <div class="dc-field"><label class="dc-flabel">Пробив. МС, %</label>
        <input class="dc-input" id="myMrPen" type="number" min="0" max="100" value="${state.myMrPen}"></div>
      <div class="dc-field"><label class="dc-flabel">Пробив. МС (флат)</label>
        <input class="dc-input" id="myMrPenFlat" type="number" min="0" value="${state.myMrPenFlat}"></div>
    </div>
    ${gearBlock('my')}
    ${runeSlot('my')}
  </div>`;
}

function panelTarget(){
  const tgt = champByName(state.tgtChamp);
  const armor = state.tgtArmor;
  const mr    = state.tgtMR;
  const hp    = state.tgtHpMax;
  const ava = tgt
    ? `<img class="dc-ava" src="${champIcon(tgt.dd)}" alt="${tgt.name}" onerror="this.classList.add('ph');this.removeAttribute('src');this.textContent='${tgt.name[0]}'">`
    : `<div class="dc-ava ph">Ц</div>`;
  return `<div class="dc-panel def glassy">
    <div class="dc-panel-head">
      <span class="dc-side-tag def">Цель</span>
      ${ava}
      <div class="dc-champ">
        <select class="dc-sel" id="tgtChamp">
          <option value="">🪆 Манекен (свои числа)</option>
          ${CHAMPS.map(x=>`<option value="${x.name}" ${x.name===state.tgtChamp?'selected':''}>${x.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="dc-lvl">
      <input type="range" id="tgtLvl" min="1" max="15" value="${state.tgtLvl}">
      <span class="dc-lvl-badge">Ур. ${state.tgtLvl}</span>
    </div>
    <div class="dc-fields">
      <div class="dc-field"><label class="dc-flabel">Броня ${tgt?'<span class="auto">база</span>':''}</label>
        <input class="dc-input" id="tgtArmor" type="number" value="${armor}" ${tgt?'readonly':''}></div>
      <div class="dc-field"><label class="dc-flabel">Броня (предметы)</label>
        <input class="dc-input" id="tgtArBonus" type="number" value="${state.tgtArBonus}"></div>
      <div class="dc-field"><label class="dc-flabel">Сопрот. магии ${tgt?'<span class="auto">база</span>':''}</label>
        <input class="dc-input" id="tgtMR" type="number" value="${mr}" ${tgt?'readonly':''}></div>
      <div class="dc-field"><label class="dc-flabel">МС (предметы)</label>
        <input class="dc-input" id="tgtMrBonus" type="number" value="${state.tgtMrBonus}"></div>
      <div class="dc-field"><label class="dc-flabel">Макс HP ${tgt?'<span class="auto">база</span>':''}</label>
        <input class="dc-input" id="tgtHpMax" type="number" value="${hp}" ${tgt?'readonly':''}></div>
      <div class="dc-field"><label class="dc-flabel">HP (предметы)</label>
        <input class="dc-input" id="tgtHpBonus" type="number" value="${state.tgtHpBonus}"></div>
      <div class="dc-field full"><label class="dc-flabel">Текущий HP цели <span class="auto" id="tgtHpCurLbl">${state.tgtHpCurPct}%</span></label>
        <input type="range" id="tgtHpCur" min="1" max="100" value="${state.tgtHpCurPct}" style="accent-color:var(--accent);width:100%"></div>
    </div>
    ${gearBlock('def')}
  </div>`;
}

function comboPanel(d){
  const c = champByName(state.myChamp);
  const abilRow = (key,name,dt,mit,hits,on) => `
    <div class="dc-abil ${on?'on':''}" data-abil="${key}">
      <span class="dc-abil-key">${key}</span>
      <div class="dc-abil-info">
        <div class="dc-abil-name">${name}<span class="dt ${dt}">${dtLabel(dt)}</span></div>
        <div class="dc-abil-meta">${on?'в комбо':'выкл'}</div>
      </div>
      <div class="dc-hits" data-hits="${key}">
        <button data-d="-1">−</button><span class="n">${hits}</span><button data-d="1">+</button>
      </div>
      <div class="dc-abil-dmg">${on?Math.round(mit):'—'}<small>после защ.</small></div>
    </div>`;
  const byKey = {}; d.rows.forEach(r=>byKey[r.key]=r);
  let html = '';
  // AA
  const aa = byKey['AA'];
  html += abilRow('AA','Авто-атака','phys', aa?aa.mit:0, state.aaHits, state.aaOn);
  if(c) c.abils.forEach(a=>{
    const st = state.abilState[a.k]||{on:false,hits:a.hits};
    const r = byKey[a.k];
    html += abilRow(a.k, a.name, a.dt, r?r.mit:0, st.hits, st.on);
  });
  return `<div class="dc-combo glassy">
    <div class="dc-combo-head">⚔ Комбо — нажми чтобы вкл/выкл, ± меняет число ударов</div>
    <div class="dc-abils">${html}</div>
  </div>`;
}

function resultPanel(d){
  const a = accentObj();
  const cur = fightBaseHp(d);                          // накопительный HP цели
  const toKill = d.totalMit>0 ? Math.ceil(cur/d.totalMit) : '∞';
  const big = `<div class="dc-bignum"><span class="lbl">Урон по цели</span>
    <span class="num" id="dcBigNum">${Math.round(d.totalMit)}</span></div>`;
  const curChip = (_fightHp!=null && cur<d.hpCur)
    ? `<span class="dc-rchip live">❤ осталось <b>${Math.round(cur)}</b> / ${d.hpMax}</span>` : '';
  const chips = `<div class="dc-chips">
    ${curChip}
    <span class="dc-rchip">⛨ эфф. броня <b>${d.effArmor}</b></span>
    <span class="dc-rchip">🔮 эфф. МС <b>${d.effMR}</b></span>
    <span class="dc-rchip">📉 поглощено <b>${d.mitPct.toFixed(1)}%</b></span>
    <span class="dc-rchip">💀 ударов до смерти <b>${toKill}</b></span>
  </div>`;

  let view = '';
  if(state.resview==='bar'){
    view = `<div class="dc-hpbar">
      <div class="dc-hp-track" id="dcHpTrack">
        <div class="dc-hp-cur" id="dcHpCur" style="width:${(cur/d.hpMax*100).toFixed(1)}%"></div>
        <div class="dc-hp-ghost" id="dcHpGhost"></div>
      </div>
      <div class="dc-hp-meta"><span>❤ <b>${Math.round(cur)}</b> / ${d.hpMax} HP</span>
        <span>Комбо = <b>${d.pctHp.toFixed(1)}%</b> макс. HP · жми «▶ Разыграть»</span></div>
    </div>`;
  } else if(state.resview==='ring'){
    const r=46, circ=2*Math.PI*r, off=circ*(1-Math.min(1,d.pctHp/100));
    view = `<div class="dc-ring-wrap">
      <svg class="dc-ring" viewBox="0 0 120 120">
        <defs><linearGradient id="dcGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${a.c}"/><stop offset="1" stop-color="${state.grad2}"/></linearGradient></defs>
        <circle class="bg" cx="60" cy="60" r="${r}"/>
        <circle class="fg" cx="60" cy="60" r="${r}" stroke-dasharray="${circ}" stroke-dashoffset="${off}"/>
      </svg>
      <div class="dc-ring-mid"><div class="p">${d.pctHp.toFixed(0)}%</div><div class="t">макс. HP</div></div>
      <div style="flex:1">${chips}</div>
    </div>`;
  } else if(state.resview==='breakdown'){
    const max = Math.max(1, ...d.rows.map(r=>r.mit));
    view = `<div class="dc-breakdown">
      ${d.rows.map(r=>`<div class="dc-bd-row">
        <span class="dc-bd-name">${r.key==='AA'?'Авто':r.key} ×${r.hits}</span>
        <span class="dc-bd-bar"><span class="dc-bd-fill ${r.dt}" style="width:${r.mit/max*100}%"></span></span>
        <span class="dc-bd-val">${Math.round(r.mit)}</span>
      </div>`).join('') || '<div class="empty-note">Нет активных способностей</div>'}
    </div>`;
  }

  const formula = state.showFormula
    ? `<div class="dc-formula">сырой урон ${Math.round(d.totalRaw)} → после защиты ${Math.round(d.totalMit)} = ${d.pctHp.toFixed(1)}% от ${d.hpMax} HP цели<br>множитель брони = 100/(100+эфф.броня), эфф.броня = броня×(1−%проб)−флат</div>`
    : '';

  // в виде «big» chips идут под числом; в ring — справа от кольца
  const topRow = state.resview==='ring'
    ? view
    : `<div class="dc-result-top">${big}${chips}</div>${view}`;

  const eff = `<div class="dc-effrow">
    <span class="dc-rchip">🪙 билд <b>${d.cost}</b> зол</span>
    <span class="dc-rchip">🎯 урон/1000 зол <b>${d.dmgPerK}</b></span>
    ${d.bpSurvives
      ? `<span class="dc-rchip live">🛡 цель уже переживает комбо</span>`
      : `<span class="dc-rchip">🛡 чтобы пережить: <b>+${d.bpExtra}</b> ${d.bpResist}</span>`}
  </div>`;
  const actions = state.actionpos==='inres' ? `<div class="dc-result-bar">${actionsHTML()}</div>` : '';
  return `<div class="dc-result glassy">
    ${actions}
    <div class="dc-fxlayer" id="dcFx"></div>
    ${topRow}${eff}${formula}</div>`;
}

/* кнопки действий боя (размещаются по actionpos) */
function actionsHTML(){
  return `<div class="dc-actions">
    <button class="dc-playbtn" data-play>▶ Разыграть комбо</button>
    <button class="dc-resetbtn" data-fightreset>↺ Сброс HP</button>
  </div>`;
}

/* ── всплывающая цифра урона (как в игре) ── */
function spawnFloat(layer,o){
  if(!layer) return;
  const el=document.createElement('div');
  el.className='dc-float '+(o.type||'phys')+(o.crit?' crit':'')+(o.big?' big':'');
  el.textContent=o.text!=null?o.text:o.val;
  el.style.left=(o.xPct!=null?o.xPct:50)+'%';
  el.style.top=(o.top!=null?o.top:34)+'%';
  layer.appendChild(el);
  el.addEventListener('animationend',()=>el.remove());
}

/* ── проиграть комбо: цифры по очереди + слив HP + тряска ── */
let _playing=false;
function playCombo(){
  if(_playing) return;
  const d=compute(); if(!d.rows.length) return;
  const fx=document.getElementById('dcFx'); if(!fx) return;
  let start=fightBaseHp(d);
  if(start<=0){ spawnFloat(fx,{text:'цель уже мертва — ↺ Сброс',big:true,xPct:50,top:18}); return; }
  _playing=true;
  const big=document.getElementById('dcBigNum');
  const track=document.getElementById('dcHpTrack');
  const green=document.getElementById('dcHpCur');
  const ghost=document.getElementById('dcHpGhost');
  // развернуть мульти-удары авто-атаки в отдельные «тычки» для игрового ощущения
  const seq=[];
  d.rows.forEach(r=>{
    if(r.key==='AA' && r.hits>1){ const per=r.mit/r.hits; for(let i=0;i<r.hits;i++) seq.push({val:per,dt:r.dt,crit:d.crit>0}); }
    else seq.push({val:r.mit,dt:r.dt,crit:r.key==='AA'&&d.crit>0});
  });
  let remain=start, cum=0, i=0;
  if(green) green.style.transition='width .25s cubic-bezier(.4,0,.2,1)';
  function step(){
    if(i>=seq.length){ _playing=false; _fightHp=Math.max(0,remain);   // накопить остаток для след. комбо
      if(remain<=0) spawnFloat(fx,{text:'УБИТ ☠',big:true,xPct:50,top:18}); return; }
    const s=seq[i++], val=Math.round(s.val);
    spawnFloat(fx,{text:(s.crit?val+'!':String(val)),type:s.dt,crit:s.crit,xPct:32+Math.random()*36});
    if(track){ track.classList.remove('shake'); void track.offsetWidth; track.classList.add('shake'); }
    const lost=Math.min(remain,s.val), newRemain=Math.max(0,remain-s.val);
    if(green) green.style.width=(newRemain/d.hpMax*100).toFixed(1)+'%';
    // красный кусок появляется в зазоре и медленно уезжает к зелёной (как в игре)
    if(ghost){ ghost.style.transition='none'; ghost.style.left=(newRemain/d.hpMax*100)+'%';
      ghost.style.width=(lost/d.hpMax*100)+'%'; ghost.style.opacity='1';
      requestAnimationFrame(()=>{ ghost.style.transition='width .55s ease-out'; ghost.style.width='0%'; }); }
    remain=newRemain; cum+=s.val;
    if(big){ big.textContent=Math.round(cum); big.classList.remove('pop'); void big.offsetWidth; big.classList.add('pop'); }
    setTimeout(step, 240);
  }
  step();
}
function bindActions(){
  const inner=document.getElementById('stageInner'); if(!inner) return;
  const p=inner.querySelector('[data-play]'); if(p) p.onclick=playCombo;
  const r=inner.querySelector('[data-fightreset]'); if(r) r.onclick=()=>{ fightReset(); renderStage(); };
}

/* ════════════ КАЛЬКУЛЯТОР ПРЕДМЕТОВ ════════════ */
function itemsBlock(){
  const cards = ITEM_ORDER.map(k=>{
    const it = ITEMS[k];
    return `<div class="dc-itemcard ${state.curItem===k?'on':''}" data-item="${k}">
      <div class="dc-itemcard-top">${itemImg(it.img)}<span class="ic-name">${it.name}</span></div>
      <span class="ic-desc">${it.desc}</span></div>`;
  }).join('');
  return `<div class="dc-items">
    <div class="dc-itemlist">${cards}</div>
    <div class="dc-itemcalc-wrap" id="dcItemCalc">${itemCalcBlock()}</div>
  </div>`;
}

function itemRangeOn(k){
  if(state.itemRange[k]==null) state.itemRange[k]='melee';
  return state.itemRange[k]==='ranged';
}

/* ════════════ ВКЛАДКА «СБОРКА» ════════════ */
function shardStats(){
  const a={ad:0,ap:0,hp:0,armor:0,mr:0,crit:0,as:0,ah:0,ms:0,ls:0};
  Object.values(state.bShards||{}).forEach(k=>{ const sh=SHARDS.find(s=>s.key===k);
    if(sh) for(const [st,v] of Object.entries(sh.stat)) a[st]=(a[st]||0)+v; });
  return a;
}
function stackStats(){
  const c=champByName(state.bChamp); const a={ad:0,ap:0,hp:0,armor:0,mr:0,crit:0};
  if(c&&c.stack){ const n=state.bStacks||0; for(const [st,v] of Object.entries(c.stack.per)) a[st]=(a[st]||0)+v*n; }
  return a;
}
function buildStats(){
  const c=champByName(state.bChamp), lvl=state.bLvl;
  const base = c ? { ad:statAt(c.ad_b,c.ad_g,lvl), hp:statAt(c.hp_b,c.hp_g,lvl), armor:statAt(c.ar_b,c.ar_g,lvl), mr:statAt(c.mr_b,c.mr_g,lvl) }
                 : { ad:100, hp:1000, armor:30, mr:30 };
  const g=aggregateList(state.bItems,state.bBoots), sh=shardStats(), st=stackStats();
  const ks=keystoneStat(state.bKeystone, c?champDmgType(c):'ad');   // Завоеватель
  return {
    ad:base.ad+g.ad+sh.ad+st.ad+ks.ad, ap:(g.ap+sh.ap+st.ap)*(1+g.apAmp)+ks.ap,
    hp:base.hp+g.hp+sh.hp+st.hp, armor:base.armor+g.armor+sh.armor+st.armor, mr:base.mr+g.mr+sh.mr+st.mr,
    crit:Math.min(100,g.crit+sh.crit+st.crit), as:g.as+sh.as, ah:g.ah+sh.ah, ms:g.ms, ls:g.ls,
    arPenPct:Math.round((1-g.arPenFrac)*100), arPenFlat:g.arPenFlat,
    mrPenPct:Math.round((1-g.mrPenFrac)*100), mrPenFlat:g.mrPenFlat,
    cost:gearGold(state.bItems,state.bBoots),
  };
}
function statSheetHTML(s){
  const tiles=[
    ['🗡 AD',Math.round(s.ad)],['🔮 AP',Math.round(s.ap)],['❤ HP',Math.round(s.hp)],
    ['⛨ Броня',Math.round(s.armor)],['✦ МС',Math.round(s.mr)],['💥 Крит',Math.round(s.crit)+'%'],
    ['⚡ Скор.атаки','+'+Math.round(s.as)+'%'],['⏩ Ускор.умений',Math.round(s.ah)],['👟 Ск.бега','+'+Math.round(s.ms)],
    ['🛡↯ Проб.брони',s.arPenPct+'% +'+s.arPenFlat],['🔮↯ Проб.МС',s.mrPenPct+'% +'+s.mrPenFlat],['🩸 Вампиризм',Math.round(s.ls)+'%'],
    ['🪙 Золото',s.cost],
  ];
  return `<div class="dc-statsheet">${tiles.map(([l,v])=>`<div class="dc-stile"><span class="sl">${l}</span><span class="sv">${v}</span></div>`).join('')}</div>`;
}
function shardShort(o){ const [k,v]=Object.entries(o.stat)[0]; return '+'+v+' '+statName(k); }
function shardsHTML(){
  return [['Атака',0],['Гибкая',1],['Защита',2]].map(([label,row])=>{
    const opts=SHARDS.filter(s=>s.row===row), cur=state.bShards[row];
    return `<div class="dc-shardrow"><div class="dc-shardlbl">${label}</div>
      <div class="dc-irange">${opts.map(o=>`<button data-shard="${row}:${o.key}" class="${cur===o.key?'on':''}">${shardShort(o)}</button>`).join('')}</div></div>`;
  }).join('');
}
function buildBlock(){
  const c=champByName(state.bChamp);
  const ava = c
    ? `<img class="dc-ava" src="${champIcon(c.dd)}" alt="${c.name}" onerror="this.classList.add('ph');this.removeAttribute('src');this.textContent='${c.name[0]}'">`
    : `<div class="dc-ava ph">С</div>`;
  const stacksCol = (c&&c.stack) ? `<div class="dc-bcol glassy"><div class="dc-bcol-t">🔢 Стаки</div>
      <div class="dc-flabel">${c.stack.label} <span class="auto" id="bStacksLbl">${Math.min(state.bStacks,c.stack.max)} / ${c.stack.max}</span></div>
      <input type="range" id="bStacks" min="0" max="${c.stack.max}" value="${Math.min(state.bStacks,c.stack.max)}" style="width:100%;accent-color:var(--accent)">
      <div class="dc-bstack-note">+${Object.entries(c.stack.per).map(([k,v])=>v+' '+statName(k)).join(', ')} за стак</div>
    </div>` : `<div class="dc-bcol glassy dc-bcol-muted"><div class="dc-bcol-t">🔢 Стаки</div><div class="dc-gmuted">У этого чемпиона нет стак-механики</div></div>`;
  return `<div class="dc-build">
    <div class="dc-build-head glassy">
      ${ava}
      <select class="dc-sel" id="bChamp">${CHAMPS.map(x=>`<option value="${x.name}" ${x.name===state.bChamp?'selected':''}>${x.name}${x.stack?' ★':''}</option>`).join('')}</select>
      <div class="dc-lvl" style="flex:1;min-width:160px"><input type="range" id="bLvl" min="1" max="15" value="${state.bLvl}"><span class="dc-lvl-badge">Ур. ${state.bLvl}</span></div>
    </div>
    <div class="dc-build-rune"><span class="dc-bcol-t">🔮 Ключевая руна</span>${runeSlot('build')}</div>
    <div class="dc-build-grid">
      <div class="dc-bcol glassy"><div class="dc-bcol-t">📦 Предметы и ботинки</div>${gearBlock('build')}</div>
      <div class="dc-bcol glassy"><div class="dc-bcol-t">📜 Руны-осколки</div>${shardsHTML()}</div>
      ${stacksCol}
    </div>
    <div class="dc-bcol-t" style="margin-top:2px">📊 Итоговые статы</div>
    <div id="dcStatSheet">${statSheetHTML(buildStats())}</div>
    <button class="dc-loadbtn" data-tobuild>→ Загрузить в «Калькулятор урона» как атакующего</button>
  </div>`;
}
function loadBuildToCalc(){
  state.myChamp=state.bChamp; state.myLvl=state.bLvl;
  state.myItems=state.bItems.slice(); state.myBoots=state.bBoots; state.myKeystone=state.bKeystone;
  const sh=shardStats(), st=stackStats();
  state.myBonusAD = Math.round(sh.ad+st.ad);   // предметы учитываются через aggregateGear; тут осколки+стаки
  state.myAP = Math.round(sh.ap+st.ap);
  state.myCrit = Math.min(100, Math.round(sh.crit+st.crit));
  state.tab='dmg'; fightReset(); syncAutoStats(); ensureAbilState(); renderStage();
}

function itemCalcBlock(){
  const k = state.curItem; const it = ITEMS[k]; if(!it) return '';
  const v = id => { const f = state._itemFields && state._itemFields[id]; return f!=null ? f : (it.fields.find(x=>x.id===id)||{}).ph; };
  const myF = it.fields.filter(f=>f.side==='my');
  const enF = it.fields.filter(f=>f.side==='enemy');
  const field = f => `<div class="dc-field" style="margin-bottom:8px">
    <label class="dc-flabel">${f.label}</label>
    <input class="dc-input" id="${f.id}" type="number" value="${v(f.id)}" ${f.min!=null?`min="${f.min}"`:''} ${f.max!=null?`max="${f.max}"`:''} ${f.step!=null?`step="${f.step}"`:''} data-ifield></div>`;

  const range = it.needsRange ? `<div class="dc-irange">
      <button data-irange="melee" class="${!itemRangeOn(k)?'on':''}">⚔ Ближний</button>
      <button data-irange="ranged" class="${itemRangeOn(k)?'on':''}">🏹 Дальний</button>
    </div>` : '';
  const liandry = it.liandry ? `<div class="dc-irange" style="margin-top:6px">
      ${[0.5,1.0,2.0,3.0].map(p=>`<button data-liandry="${p}" class="${state.liandryPct===p?'on':''}">${p}%/с</button>`).join('')}
    </div>` : '';

  const res = ITEMS[k].calc(v, itemRangeOn(k), state.liandryPct);
  const heal = res.heal!=null ? `<div class="dc-iheal">💚 Хил: ${res.heal}</div>` : '';

  return `<div class="dc-itemcalc glassy">
    <div class="dc-itemcalc-head">${itemImg(it.img)}<div>${it.name}<small>${it.desc}</small></div></div>
    ${range}${liandry}
    <div class="dc-ifields">${it.fields.map(field).join('')}</div>
    <div class="dc-iresult"><span class="v" id="dcItemVal">${res.val}</span><span class="l">${res.label}</span></div>
    ${heal}
    ${state.showFormula?`<div class="dc-iformula">${res.formula}</div>`:''}
    ${it.combat?`<div class="dc-bsim" id="dcBotrkCombat">${botrkCombatHTML()}</div>`:''}
  </div>`;
}

function rerenderItemCalc(){
  const box = document.getElementById('dcItemCalc');
  if(box) box.innerHTML = itemCalcBlock();
  wireItemCalc();
}

/* ── BotRK: симуляция боя (порт боевого icHit + улучшения: AD-удар, вампиризм, время по скор.атаки) ── */
let botrk = { start:0, cur:0, hits:0, heal:0, log:[] };
function botrkReset(){ botrk = { start:0, cur:0, hits:0, heal:0, log:[] }; }
function botrkGV(id){ const el=document.getElementById(id); return el?+el.value||0:0; }
function botrkHit(){
  const rng=itemRangeOn('botrk');
  if(botrk.hits===0) botrk.start = botrk.cur = botrkGV('ic_eHpCur');
  if(botrk.cur<=0){ renderBotrkCombat(); return; }
  const ar=botrkGV('ic_eArmor'), pen=botrkGV('ic_ePen'), ad=botrkGV('ic_botrkAD'), ls=botrkGV('ic_botrkLS');
  const effAr=ar>0?ar*(1-pen/100):ar, mult=effAr>=0?100/(100+effAr):2-100/(100-effAr);
  const pct=rng?0.07:0.10, onHit=Math.max(15, botrk.cur*pct);
  const perHit=(ad+onHit)*mult, heal=perHit*ls/100;
  botrk.cur=Math.max(0, botrk.cur-perHit);
  botrk.hits++; botrk.heal+=heal;
  botrk.log.push({ n:botrk.hits, dmg:Math.round(perHit), hp:Math.round(botrk.cur), heal:Math.round(heal) });
  renderBotrkCombat();
}
function botrkCombatHTML(){
  const as=botrkGV('ic_botrkAS')||1;
  const pct=botrk.start>0?Math.max(0,botrk.cur/botrk.start*100):100;
  const color=pct>60?'#2ecc71':pct>30?'#f1c40f':'#e74c3c';
  const secs=as>0?botrk.hits/as:0;
  const dead=botrk.hits>0&&botrk.cur<=0;
  const ctrl=`<div class="dc-irange dc-bbtns">
      <button data-botrk="hit">⚔ Ударить</button><button data-botrk="reset">↺ Сброс</button></div>`;
  if(!botrk.hits) return ctrl+`<div class="dc-bhint">Жми «Ударить» — каждый авто = AD + % текущего HP. Видно, как удары слабеют по мере падения HP цели.</div>`;
  return ctrl+`
    <div class="dc-bhpbar"><div class="dc-bhpfill" style="width:${pct.toFixed(1)}%;background:${color}"></div></div>
    <div class="dc-bmeta"><span><b>${Math.round(botrk.cur)}</b> / ${botrk.start} HP</span>
      <span>${botrk.hits} ударов ≈ <b>${secs.toFixed(1)} c</b></span>
      <span class="hl">💚 +${Math.round(botrk.heal)} HP</span></div>
    <div class="dc-blog">${botrk.log.map(e=>`<div class="dc-blog-row"><span>Удар #${e.n}</span><span class="d">−${e.dmg}</span><span>${e.hp} HP</span><span class="h">+${e.heal}</span></div>`).join('')}
      ${dead?`<div class="dc-bdead">☠ УБИТ за ${botrk.hits} ударов ≈ ${secs.toFixed(1)} c</div>`:''}</div>`;
}
function renderBotrkCombat(){
  const box=document.getElementById('dcBotrkCombat'); if(!box) return;
  box.innerHTML=botrkCombatHTML();
  const h=box.querySelector('[data-botrk="hit"]'); if(h)h.onclick=botrkHit;
  const r=box.querySelector('[data-botrk="reset"]'); if(r)r.onclick=()=>{ botrkReset(); renderBotrkCombat(); };
}

/* ════════════════════════════════════════════════════════════════
   🎮 АРЕНА — мини-игры на общем движке (4 режима)
   ════════════════════════════════════════════════════════════════ */
const CD = { Q:5, W:8, E:7, R:55 };   // демо-кулдауны способностей (сек)
const ARENA_MODES = [
  {id:'duel', name:'⚔ Дуэль 1v1'},
  {id:'kill', name:'🎯 Добей за минимум'},
  {id:'guess',name:'❓ Викторина «Угадай урон»'},
];

/* боец из набора опций (чемпион+уровень+предметы+бонусы) → полные статы */
function mkFighter(o){
  const c=champByName(o.champ), lvl=o.lvl||11, g=aggregateList(o.items||[], o.boots||null);
  const type=c?champDmgType(c):'ad';
  const ks=keystoneStat(o.keystone||'none', type);   // Завоеватель → +AD/AP
  const base = c ? { ad:statAt(c.ad_b,c.ad_g,lvl), hp:statAt(c.hp_b,c.hp_g,lvl), armor:statAt(c.ar_b,c.ar_g,lvl), mr:statAt(c.mr_b,c.mr_g,lvl) }
                 : { ad:o.baseAD||100, hp:o.hp||1000, armor:o.armor||30, mr:o.mr||30 };
  const ad=base.ad+(o.bonusAD||0)+g.ad+ks.ad, ap=(o.ap||0)+g.ap+ks.ap, crit=Math.min(100,(o.crit||0)+g.crit);
  const hp=base.hp+g.hp+(o.hpBonus||0), armor=base.armor+g.armor+(o.arBonus||0), mr=base.mr+g.mr+(o.mrBonus||0);
  const as=Math.min(2.0, 0.7*(1+(g.as||0)/100));
  const arFrac=(1-(o.arPen||0)/100)*g.arPenFrac, arFlat=(o.arPenFlat||0)+g.arPenFlat;
  const mrFrac=(1-(o.mrPen||0)/100)*g.mrPenFrac, mrFlat=(o.mrPenFlat||0)+g.mrPenFlat;
  return { name:c?c.name:'Манекен', dd:c?c.dd:null, abils:c?c.abils:[], lvl, type, keystone:o.keystone||'none',
    hp, ad, ap, crit, armor, mr, as, ls:g.ls||0, arFrac, arFlat, mrFrac, mrFlat };
}
function fighterStats(side){
  const isMy=side==='my';
  return mkFighter(isMy
    ? {champ:state.myChamp,lvl:state.myLvl,items:state.myItems,boots:state.myBoots,baseAD:state.myBaseAD,keystone:state.myKeystone,
       bonusAD:+state.myBonusAD||0,ap:+state.myAP||0,crit:+state.myCrit||0,
       arPen:+state.myArPen||0,arPenFlat:+state.myArPenFlat||0,mrPen:+state.myMrPen||0,mrPenFlat:+state.myMrPenFlat||0}
    : {champ:state.tgtChamp,lvl:state.tgtLvl,items:state.tgtItems,boots:state.tgtBoots,
       hp:state.tgtHpMax,armor:state.tgtArmor,mr:state.tgtMR,
       hpBonus:+state.tgtHpBonus||0,arBonus:+state.tgtArBonus||0,mrBonus:+state.tgtMrBonus||0});
}
/* урон удара A→D с митигацией защиты D пробиванием A */
function hitDamage(A,D,base,adR,apR,dt){
  const raw=base+adR*A.ad+apR*A.ap;
  if(dt==='true') return raw;
  const res = dt==='magic' ? (D.mr>0?D.mr*A.mrFrac:D.mr)-A.mrFlat : (D.armor>0?D.armor*A.arFrac:D.armor)-A.arFlat;
  return raw*mitFromEff(res);
}
function aaDamage(A,D){ return hitDamage(A,D,0,1,0,'phys')*(1+A.crit/100); }
/* полное комбо с учётом руны (для сравнения/арены) */
function comboTotalKS(A,B){
  let d=0; A.abils.forEach(a=>d+=hitDamage(A,B,abilLerp(a.lo,a.hi,A.lvl),a.adR,a.apR,a.dt)*(a.hits||1));
  d+=aaDamage(A,B);
  const mult=keystoneMult(A.keystone); d*=mult;
  const p=keystoneProc(A.keystone,A,B,A.type,100); if(p)d+=p.dmg*mult;
  return d;
}
/* время до убийства (ротация авто+умения+руна-прок) */
function ttkSim(A,B){
  let cur=B.hp,t=0,aaT=0,acts=0,guard=0; const cd={}; A.abils.forEach(a=>cd[a.k]=0); const dt=0.05, mult=keystoneMult(A.keystone);
  const proc=()=>{ if(++acts%3===0){ const p=keystoneProc(A.keystone,A,B,A.type,cur/B.hp*100); if(p)cur-=p.dmg*mult; } };
  while(cur>0&&t<30&&guard++<3000){ t+=dt;
    for(const a of A.abils){ if(cd[a.k]>0){cd[a.k]-=dt;continue;} cur-=hitDamage(A,B,abilLerp(a.lo,a.hi,A.lvl),a.adR,a.apR,a.dt)*(a.hits||1)*mult; cd[a.k]=CD[a.k]||6; proc(); }
    aaT-=dt; if(aaT<=0){ cur-=aaDamage(A,B)*mult; aaT=1/A.as; proc(); }
  }
  return { t:Math.min(t,30), killed:cur<=0 };
}
/* боец из вкладки «Сборка» (предметы+осколки+стаки+руна) */
function buildFighter(){ const sh=shardStats(), st=stackStats();
  return mkFighter({champ:state.bChamp,lvl:state.bLvl,items:state.bItems,boots:state.bBoots,keystone:state.bKeystone,
    bonusAD:Math.round(sh.ad+st.ad), ap:Math.round(sh.ap+st.ap), crit:Math.round(sh.crit+st.crit), hpBonus:st.hp, arBonus:st.armor, mrBonus:st.mr}); }
function fighterAva(F,fb){
  return F.dd ? `<img class="dc-ava" src="${champIcon(F.dd)}" alt="${F.name}" onerror="this.classList.add('ph');this.removeAttribute('src');this.textContent='${F.name[0]}'">`
              : `<div class="dc-ava ph">${fb}</div>`;
}

/* ── мини-урон-индикатор: летящая цифра в указанный слой ── */
function floatIn(layerId,dmg,dt,crit){
  const fx=document.getElementById(layerId); if(!fx) return;
  spawnFloat(fx,{text:(crit?Math.round(dmg)+'!':String(Math.round(dmg))),type:dt,crit:!!crit,xPct:28+Math.random()*44});
}

/* ════ режим 1: ДУЭЛЬ 1v1 (авто-бой) ════ */
let arenaTimer=null, duel=null, duelWins={A:0,B:0,key:''}, duelSpeed=1;
function duelInit(){
  const A=fighterStats('my'), B=fighterStats('tgt');
  const key=A.name+'|'+B.name;
  if(key!==duelWins.key) duelWins={A:0,B:0,key};   // новые бойцы → счёт с нуля
  const mk=(F)=>{ const cd={}; F.abils.forEach(a=>cd[a.k]=0); return Object.assign({},F,{hpMax:F.hp,cur:F.hp,aaT:0,cd,dealt:0,healed:0,acts:0}); };
  duel={ A:mk(A), B:mk(B), t:0, running:false, winner:null, log:[] };
}
function duelLog(atk,txt){
  if(!duel) return;
  duel.log.unshift({atk,txt});
  if(duel.log.length>40) duel.log.pop();
  const box=document.getElementById('duelLog');
  if(box) box.innerHTML=duel.log.slice(0,14).map(e=>`<div class="dc-dlog-row ${e.atk}"><b>${duel[e.atk].name}</b> ${e.txt}</div>`).join('');
}
function duelHeal(F,dmg){           // вампиризм от физ. урона
  if(F.ls<=0) return;
  const h=dmg*F.ls/100; F.cur=Math.min(F.hpMax,F.cur+h); F.healed+=h;
}
function duelProc(atk,def){           // ключевая руна-прок: каждое 3-е действие
  const F=duel[atk], E=duel[def];
  F.acts++;
  if(F.acts%3!==0 || E.cur<=0) return;
  const p=keystoneProc(F.keystone, F, E, F.type, E.cur/E.hpMax*100);
  if(p && p.dmg>0){ E.cur=Math.max(0,E.cur-p.dmg); F.dealt+=p.dmg;
    floatIn('duel'+def+'fx',p.dmg,p.dt,false);
    duelLog(atk, `<span class="k">★</span> −${Math.round(p.dmg)}`); }
}
function duelStep(atk,def,dt){
  const F=duel[atk], E=duel[def];
  if(F.cur<=0||E.cur<=0) return;
  const mult=keystoneMult(F.keystone);   // «Первый удар» и т.п.
  // способности (как только готовы, в порядке Q→W→E→R)
  for(const a of F.abils){
    if(F.cd[a.k]>0){ F.cd[a.k]-=dt; continue; }
    if(E.cur<=0) break;
    const dmg=hitDamage(F,E,abilLerp(a.lo,a.hi,F.lvl),a.adR,a.apR,a.dt)*(a.hits||1)*mult;
    E.cur=Math.max(0,E.cur-dmg); F.cd[a.k]=CD[a.k]||6; F.dealt+=dmg;
    if(a.dt==='phys') duelHeal(F,dmg);
    floatIn('duel'+def+'fx',dmg,a.dt,false);
    duelLog(atk, `<span class="k">${a.k}</span> −${Math.round(dmg)}`);
    duelProc(atk,def);
  }
  // авто-атака
  F.aaT-=dt;
  if(F.aaT<=0 && E.cur>0){
    const crit=Math.random()*100<F.crit;
    const dmg=F.ad*(crit?2:1)*mitFromEff((E.armor>0?E.armor*F.arFrac:E.armor)-F.arFlat)*mult;
    E.cur=Math.max(0,E.cur-dmg); F.aaT=1/F.as; F.dealt+=dmg; duelHeal(F,dmg);
    floatIn('duel'+def+'fx',dmg,'phys',crit);
    duelLog(atk, `${crit?'крит ':'авто '}−${Math.round(dmg)}`);
    duelProc(atk,def);
  }
}
function duelTick(){
  const dt=0.1*duelSpeed;
  duel.t+=dt;
  duelStep('A','B',dt); duelStep('B','A',dt);
  duelUpdate();
  if(duel.A.cur<=0||duel.B.cur<=0){ duelStop();
    duel.winner = (duel.A.cur<=0&&duel.B.cur<=0)?'draw':(duel.B.cur<=0?'A':'B');
    if(duel.winner!=='draw') duelWins[duel.winner]++;
    const sc=document.getElementById('duelScore'); if(sc)sc.textContent=`${duel.A.name} ${duelWins.A} — ${duelWins.B} ${duel.B.name}`;
    const ban=document.getElementById('duelBanner');
    if(ban){ ban.className='dc-duel-banner show'+(duel.winner==='draw'?' draw':'');
      ban.textContent = duel.winner==='draw' ? '⚖ Ничья!' : '🏆 Победил '+(duel.winner==='A'?duel.A.name:duel.B.name)+' — за '+duel.t.toFixed(1)+' c'; }
    const br=document.getElementById('duelBreak');
    if(br){ const dps=F=>duel.t>0?Math.round(F.dealt/duel.t):0;
      br.classList.add('show');
      br.innerHTML=['A','B'].map(s=>{ const F=duel[s];
        return `<div class="dc-dbreak-row"><span class="nm">${F.name}</span><span>нанёс <b>${Math.round(F.dealt)}</b></span><span>DPS <b>${dps(F)}</b></span>${F.healed>1?`<span class="hl">+${Math.round(F.healed)} хил</span>`:''}</div>`; }).join(''); }
  }
}
function duelUpdate(){
  if(!duel) return;
  ['A','B'].forEach(s=>{ const F=duel[s], pct=Math.max(0,F.cur/F.hpMax*100);
    const fill=document.getElementById('duel'+s+'fill'); if(fill){ fill.style.width=pct.toFixed(1)+'%';
      fill.style.background = pct>50?'linear-gradient(90deg,#2ecc71,#27ae60)':pct>25?'linear-gradient(90deg,#f1c40f,#e1b12c)':'linear-gradient(90deg,#ff6b6b,#e74c3c)'; }
    const hp=document.getElementById('duel'+s+'hp'); if(hp)hp.textContent=Math.round(F.cur)+' / '+Math.round(F.hpMax);
    const cdrow=document.getElementById('duel'+s+'cd');
    if(cdrow) cdrow.innerHTML=F.abils.map(a=>{ const max=CD[a.k]||6, rdy=F.cd[a.k]<=0, p=rdy?100:Math.max(0,(1-F.cd[a.k]/max)*100);
      return `<div class="dc-cd-pip ${rdy?'rdy':''}"><span style="width:${p}%"></span><i>${a.k}</i></div>`; }).join('');
  });
  const tm=document.getElementById('duelTime'); if(tm)tm.textContent=duel.t.toFixed(1)+' c';
}
function duelStart(){ if(!duel||duel.winner)duelInit(); if(duel.running)return; duel.running=true; arenaTimer=setInterval(duelTick,100); }
function duelStop(){ if(arenaTimer){clearInterval(arenaTimer);arenaTimer=null;} if(duel)duel.running=false; }
function duelReset(){ duelStop(); duelInit(); duelUpdate();
  const ban=document.getElementById('duelBanner'); if(ban){ban.className='dc-duel-banner';ban.textContent='';}
  const br=document.getElementById('duelBreak'); if(br){br.className='dc-dbreak';br.innerHTML='';}
  const lg=document.getElementById('duelLog'); if(lg)lg.innerHTML=''; }
function duelFighterHTML(s){
  const F=duel[s];
  const ls=F.ls>0?` · 🩸${Math.round(F.ls)}%`:'';
  return `<div class="dc-duelist">
    <div class="dc-duel-head">${fighterAva(F,s)}<div class="dc-duel-name">${F.name}<small>ур.${F.lvl} · AD ${Math.round(F.ad)} · AP ${Math.round(F.ap)} · ${F.armor|0}бр/${F.mr|0}мс · ${F.as.toFixed(2)} ат/с${ls}</small></div></div>
    <div class="dc-duel-track"><div class="dc-duel-fill" id="duel${s}fill" style="width:100%"></div><div class="dc-duel-fx" id="duel${s}fx"></div></div>
    <div class="dc-duel-hp" id="duel${s}hp">${Math.round(F.hpMax)} / ${Math.round(F.hpMax)}</div>
    <div class="dc-cd-row" id="duel${s}cd"></div>
  </div>`;
}
function duelHTML(){
  if(!duel) duelInit();
  return `<div class="dc-arena-mode">
    <div class="dc-arena-hint">Бойцы = «Атакующий» и «Цель» из вкладки Урон (чемпион + предметы). Жми «Бой» — дерутся сами: авто-атаки по скор.атаки, умения по кулдаунам, вампиризм лечит.</div>
    <div class="dc-duel">
      ${duelFighterHTML('A')}
      <div class="dc-duel-vs">VS<div class="dc-duel-time" id="duelTime">0.0 c</div></div>
      ${duelFighterHTML('B')}
    </div>
    <div class="dc-duel-banner" id="duelBanner"></div>
    <div class="dc-dbreak" id="duelBreak"></div>
    <div class="dc-duel-score" id="duelScore">${duelWins.A||duelWins.B?`${duel.A.name} ${duelWins.A} — ${duelWins.B} ${duel.B.name}`:''}</div>
    <div class="dc-arena-ctrl">
      <button class="dc-playbtn" data-duel="start">▶ Бой</button>
      <button class="dc-resetbtn" data-duel="pause">⏸ Пауза</button>
      <button class="dc-resetbtn" data-duel="reset">↺ Реванш</button>
      <div class="dc-duel-speed">${[0.5,1,2].map(s=>`<button data-duel="speed:${s}" class="${duelSpeed===s?'on':''}">${s}×</button>`).join('')}</div>
    </div>
    <div class="dc-dlog" id="duelLog"></div>
  </div>`;
}

/* ════ режим 2: ДОБЕЙ ЗА МИНИМУМ (TTK + рекорд) ════ */
function killSim(){
  const A=fighterStats('my'), B=fighterStats('tgt');
  let cur=B.hp, t=0, aaT=0, autos=0, casts=0, guard=0; const cd={}; A.abils.forEach(a=>cd[a.k]=0); const dt=0.05;
  while(cur>0 && t<30 && guard++<3000){ t+=dt;
    for(const a of A.abils){ if(cd[a.k]>0){cd[a.k]-=dt;continue;}
      cur-=hitDamage(A,B,abilLerp(a.lo,a.hi,A.lvl),a.adR,a.apR,a.dt)*(a.hits||1); cd[a.k]=CD[a.k]||6; casts++; }
    aaT-=dt; if(aaT<=0){ cur-=aaDamage(A,B); aaT=1/A.as; autos++; }
  }
  return { t:Math.min(t,30), autos, casts, killed:cur<=0, B };
}
function killBestKey(){ return 'dc-kill-best:'+state.tgtChamp+'|'+state.tgtLvl; }
function killHTML(){
  const r=killSim();
  let best=parseFloat(localStorage.getItem(killBestKey())||'');
  let rec='';
  if(r.killed){ if(isNaN(best)||r.t<best){ best=r.t; localStorage.setItem(killBestKey(),String(best)); rec='<span class="dc-kill-rec">🏅 Новый рекорд!</span>'; } }
  const A=fighterStats('my');
  return `<div class="dc-arena-mode">
    <div class="dc-arena-hint">Цель = «${r.B.name}» (${Math.round(r.B.hp)} HP, ${r.B.armor|0} брони). Меняй билд атакующего во вкладке Урон/Сборка и бей рекорд по времени убийства.</div>
    <div class="dc-kill-card glassy">
      <div class="dc-kill-fighter">${fighterAva(A,'A')}<div><b>${A.name}</b><small>vs ${r.B.name}</small></div></div>
      ${r.killed ? `<div class="dc-kill-big"><span class="v">${r.t.toFixed(2)} c</span><span class="l">время до убийства ${rec}</span></div>
        <div class="dc-kill-row"><span>🗡 авто-атак: <b>${r.autos}</b></span><span>✨ умений: <b>${r.casts}</b></span><span>🏅 рекорд: <b>${isNaN(best)?'—':best.toFixed(2)+' c'}</b></span></div>`
        : `<div class="dc-kill-big"><span class="v" style="color:#ff6b6b">не убил</span><span class="l">за 30 c — цель слишком танковая, усиль билд</span></div>`}
    </div>
    <div class="dc-arena-ctrl"><button class="dc-playbtn" data-kill="resim">↻ Пересчитать</button></div>
  </div>`;
}

/* ════ режим 3: ВИКТОРИНА «УГАДАЙ УРОН» (10 вопросов, варианты, рейтинг) ════
   Сценарии РОЛЕ-КОРРЕКТНЫ: AP-чемпам — AP-предметы, AD — AD, цель носит защиту.
   (демо-числа; для боевого/публичного нужны реальные коэффициенты умений) */
const QUIZ_N=10;
const AD_ITEMS=['ie','bt','collector','youmuu','serylda','mortal','bc','tri','navori'];
const AP_ITEMS=['luden','liandryItem','lich','nashor','iorb','rylai'];
const DEF_ITEMS=['thornmail','sunfire','deadmans','frozen','heartsteel','hollow','force','kaenic','steraks'];
const AD_BOOTS=['plated','swift','ionian','merc'], AP_BOOTS=['sorc','ionian','merc'], DEF_BOOTS=['plated','merc'];
function champDmgType(c){ if(!c)return 'ad'; let ad=0,ap=0; c.abils.forEach(a=>{ad+=a.adR;ap+=a.apR;}); return ap>ad?'ap':'ad'; }
function rint(a,b){ return a+Math.floor(Math.random()*(b-a+1)); }
function pickN(arr,n){ const a=arr.slice(),o=[]; while(o.length<n&&a.length)o.push(a.splice(rint(0,a.length-1),1)[0]); return o; }
let quiz=null;
/* ОТНОСИТЕЛЬНЫЕ вопросы (сравнение) — корректны даже на примерных числах */
function comboDamage(A,B){ let d=0; A.abils.forEach(a=>d+=hitDamage(A,B,abilLerp(a.lo,a.hi,A.lvl),a.adR,a.apR,a.dt)*(a.hits||1)); return d+aaDamage(A,B); }
function abilDamage(A,B,a){ return hitDamage(A,B,abilLerp(a.lo,a.hi,A.lvl),a.adR,a.apR,a.dt)*(a.hits||1); }
function fAva2(name,dd){ return dd?`<img class="dc-ava" src="${champIcon(dd)}" alt="${name}" onerror="this.classList.add('ph');this.removeAttribute('src');this.textContent='${name[0]}'">`:`<div class="dc-ava ph">${name[0]}</div>`; }
function ctxHTML(att,tgts){
  const ai=(att.items||[]).map(k=>GEAR[k]?itemImg(GEAR[k].img):'').join('');
  const side=(o,t)=>`<div class="dc-guess-side"><div class="dc-guess-t">${t}</div>${fAva2(o.name,o.dd)}<b>${o.name}</b><small>ур.${o.lvl}</small>${o.items?`<div class="dc-guess-items">${o.items.map(k=>GEAR[k]?itemImg(GEAR[k].img):'').join('')}</div>`:''}${o.def?`<div class="dc-guess-def">${o.armor|0} бр · ${o.mr|0} мс</div>`:''}</div>`;
  return `<div class="dc-guess-row">${side(Object.assign({items:att.items},att),'Атакующий')}<div class="dc-guess-combo">${(att.abilK||[]).map(k=>`<span class="dc-ga-key">${k}</span>`).join('')}</div>${tgts.map(t=>side(t,'Цель')).join('')}</div>`;
}
// Q1: какая способность бьёт больнее по цели
function qAbil(){
  let c; do{ c=CHAMPS[rint(0,CHAMPS.length-1)]; }while(c.abils.length<2);
  const type=champDmgType(c), lvl=rint(10,15);
  const A=mkFighter({champ:c.name,lvl,items:pickN(type==='ap'?AP_ITEMS:AD_ITEMS,2)});
  const tg=CHAMPS[rint(0,CHAMPS.length-1)], tItems=pickN(DEF_ITEMS,1), B=mkFighter({champ:tg.name,lvl:rint(10,15),items:tItems});
  const [a1,a2]=pickN(c.abils,2), d1=abilDamage(A,B,a1), d2=abilDamage(A,B,a2);
  return { ctx:ctxHTML({name:c.name,dd:c.dd,lvl,items:[]},[{name:tg.name,dd:tg.dd,lvl:B.lvl,armor:B.armor,mr:B.mr,def:true,items:tItems}]),
    q:`«${c.name}»: что бьёт больнее по «${tg.name}»?`, opts:[{label:`${a1.k} · ${a1.name}`},{label:`${a2.k} · ${a2.name}`}],
    correct:d1>=d2?0:1, hint:`${a1.k} ${Math.round(d1)} vs ${a2.k} ${Math.round(d2)}`, d1, d2 };
}
// Q2: какой предмет даст больше урона по цели
function qItem(){
  const c=CHAMPS[rint(0,CHAMPS.length-1)], type=champDmgType(c), pool=type==='ap'?AP_ITEMS:AD_ITEMS;
  const [i1,i2]=pickN(pool,2), base=pickN(pool.filter(x=>x!==i1&&x!==i2),1);
  const lvl=rint(10,15), tg=CHAMPS[rint(0,CHAMPS.length-1)], tItems=pickN(DEF_ITEMS,rint(1,2));
  const B=mkFighter({champ:tg.name,lvl:rint(10,15),items:tItems});
  const d1=comboDamage(mkFighter({champ:c.name,lvl,items:[...base,i1]}),B), d2=comboDamage(mkFighter({champ:c.name,lvl,items:[...base,i2]}),B);
  return { ctx:ctxHTML({name:c.name,dd:c.dd,lvl,items:base},[{name:tg.name,dd:tg.dd,lvl:B.lvl,armor:B.armor,mr:B.mr,def:true,items:tItems}]),
    q:`Какой предмет даст «${c.name}» больше урона по «${tg.name}»?`, opts:[{label:GEAR[i1].name,img:i1},{label:GEAR[i2].name,img:i2}],
    correct:d1>=d2?0:1, hint:`${GEAR[i1].name} ${Math.round(d1)} vs ${GEAR[i2].name} ${Math.round(d2)}`, d1, d2 };
}
// Q3: по кому комбо больнее
function qTarget(){
  const c=CHAMPS[rint(0,CHAMPS.length-1)], type=champDmgType(c), lvl=rint(10,15);
  const A=mkFighter({champ:c.name,lvl,items:pickN(type==='ap'?AP_ITEMS:AD_ITEMS,rint(2,3))});
  let t1,t2; do{ t1=CHAMPS[rint(0,CHAMPS.length-1)]; t2=CHAMPS[rint(0,CHAMPS.length-1)]; }while(t1===t2);
  const i1=pickN(DEF_ITEMS,rint(0,2)), i2=pickN(DEF_ITEMS,rint(0,2));
  const B1=mkFighter({champ:t1.name,lvl:rint(10,15),items:i1}), B2=mkFighter({champ:t2.name,lvl:rint(10,15),items:i2});
  const d1=comboDamage(A,B1), d2=comboDamage(A,B2);
  return { ctx:ctxHTML({name:c.name,dd:c.dd,lvl,items:[]},[{name:t1.name,dd:t1.dd,lvl:B1.lvl,armor:B1.armor,mr:B1.mr,def:true,items:i1},{name:t2.name,dd:t2.dd,lvl:B2.lvl,armor:B2.armor,mr:B2.mr,def:true,items:i2}]),
    q:`По кому «${c.name}» нанесёт больше урона комбо?`, opts:[{label:t1.name},{label:t2.name}],
    correct:d1>=d2?0:1, hint:`${t1.name} ${Math.round(d1)} vs ${t2.name} ${Math.round(d2)}`, d1, d2 };
}
// отбраковка ничьих/слишком близких — у вопроса должен быть ЯСНЫЙ победитель
function quizGen(){
  const gens=[qAbil,qItem,qTarget];
  for(let tries=0;tries<40;tries++){
    const q=gens[rint(0,gens.length-1)]();
    if(Math.abs(q.d1-q.d2) >= Math.max(q.d1,q.d2)*0.05 + 8) return q;
  }
  return gens[rint(0,gens.length-1)]();
}
function quizStart(){ const qs=[]; for(let i=0;i<QUIZ_N;i++)qs.push(quizGen());
  quiz={ qs, i:0, score:0, correct:0, picked:null, qStart:performance.now(), done:false, saved:false }; }
function quizAnswer(idx){
  if(!quiz||quiz.done||quiz.picked!=null) return;
  const q=quiz.qs[quiz.i]; quiz.picked=idx;
  const sec=(performance.now()-quiz.qStart)/1000, ok=idx===q.correct;
  q.ok=ok; q.sec=sec;
  if(ok){ quiz.correct++; q.speed=Math.max(0,Math.round(50-sec*4)); quiz.score+=100+q.speed; }
}
function quizNext(){ if(quiz.i<QUIZ_N-1){ quiz.i++; quiz.picked=null; quiz.qStart=performance.now(); } else quiz.done=true; }
function quizLB(){ try{ return JSON.parse(localStorage.getItem('dc-quiz-lb')||'[]'); }catch(e){ return []; } }
function quizSave(name){ const lb=quizLB(); lb.push({name:(name||'Аноним').slice(0,16),score:quiz.score,correct:quiz.correct,date:Date.now()});
  lb.sort((a,b)=>b.score-a.score); localStorage.setItem('dc-quiz-lb',JSON.stringify(lb.slice(0,20))); quiz.saved=true; }
function quizHTML(){
  if(!quiz) quizStart();
  if(quiz.done){
    const lb=quizLB();
    return `<div class="dc-arena-mode"><div class="dc-quiz-end glassy">
      <div class="dc-quiz-end-h">Викторина пройдена!</div>
      <div class="dc-quiz-score"><span class="v">${quiz.correct} / ${QUIZ_N}</span><span class="l">верно · <b>${quiz.score}</b> очков</span></div>
      ${quiz.saved?'<div class="dc-quiz-saved">✓ Результат в рейтинге</div>'
        :`<div class="dc-guess-input"><input class="dc-input" id="quizName" type="text" maxlength="16" placeholder="имя для рейтинга"><button class="dc-playbtn" data-quiz="save">💾 В рейтинг</button></div>`}
      <div class="dc-quiz-lb-t">🏆 Рейтинг</div>
      <div class="dc-quiz-lb">${lb.length?lb.slice(0,8).map((e,i)=>`<div class="dc-quiz-lb-row"><span class="rk">${i+1}</span><span class="nm">${e.name}</span><span>${e.correct}/${QUIZ_N}</span><span class="sc">${e.score}</span></div>`).join(''):'<div class="dc-gmuted">пока пусто — будь первым</div>'}</div>
      <div class="dc-arena-ctrl"><button class="dc-playbtn" data-quiz="restart">↻ Ещё раз</button></div>
    </div></div>`;
  }
  const q=quiz.qs[quiz.i], answered=quiz.picked!=null;
  return `<div class="dc-arena-mode">
    <div class="dc-quiz-top"><span>Вопрос <b>${quiz.i+1}</b> / ${QUIZ_N}</span><span>Очки: <b>${quiz.score}</b></span></div>
    <div class="dc-guess glassy">
      ${q.ctx}
      <div class="dc-quiz-q">${q.q}</div>
      <div class="dc-quiz-opts">${q.opts.map((o,idx)=>{ let cls=''; if(answered){ if(idx===q.correct)cls='right'; else if(idx===quiz.picked)cls='wrong'; }
        return `<button class="dc-quiz-opt opt-txt ${cls}" data-quiz="ans:${idx}" ${answered?'disabled':''}>${o.img?itemImg(GEAR[o.img].img):''}<span>${o.label}</span></button>`; }).join('')}</div>
      ${answered?`<div class="dc-quiz-fb ${q.ok?'ok':'no'}">${q.ok?`✓ Верно! +${100+(q.speed||0)} очк. (${q.speed||0} за скорость)`:`✗ Мимо`} <span class="dc-quiz-hint">${q.hint}</span></div>
        <div class="dc-arena-ctrl"><button class="dc-playbtn" data-quiz="next">${quiz.i<QUIZ_N-1?'→ Дальше':'Итог →'}</button></div>`:''}
    </div>
  </div>`;
}

/* диспетчер вкладки Арена */
function arenaBlock(){
  const chips=ARENA_MODES.map(m=>`<button class="dc-tab dc-arena-chip ${state.arena===m.id?'on':''}" data-arena="${m.id}">${m.name}</button>`).join('');
  let body='';
  if(state.arena==='kill') body=killHTML();
  else if(state.arena==='guess') body=quizHTML();
  else body=duelHTML();
  return `<div class="dc-arena"><div class="dc-arena-tabs">${chips}</div>${body}</div>`;
}

/* ════════════ ВКЛАДКА «🗡 АВТО-АТАКИ» (DPS-симулятор) ════════════ */
let autoT=null, auto=null, autoSteroid=false, autoBuffAS=0;
function autoInit(){ const A=fighterStats('my'), B=fighterStats('tgt');
  auto={ A, B, cur:B.hp, hits:0, t:0, dmg:0, lt:0, conq:0, last:0, running:false, dead:false }; }
function autoAS(){ if(!auto)return 0.7; let as=auto.A.as;
  if(autoSteroid) as*=1.5; as*=(1+autoBuffAS/100);
  if(auto.A.keystone==='lethaltempo') as*=(1+auto.lt*0.08);   // до +48% за 6 стаков
  return Math.min(2.5, as); }
function autoHit(){
  if(!auto||auto.cur<=0){ autoStop(); return; }
  const A=auto.A, B=auto.B;
  const crit=Math.random()*100<A.crit;
  const conqAd = A.keystone==='conqueror' ? auto.conq*(A.type==='ap'?3:2) : 0;
  const ad=A.ad+(A.type==='ap'?0:conqAd), ap=A.ap+(A.type==='ap'?conqAd:0);
  let dmg = ad*(crit?2:1)*mitFromEff((B.armor>0?B.armor*A.arFrac:B.armor)-A.arFlat);
  (state.myItems||[]).forEach(k=>{ const it=GEAR[k]; if(it&&it.onhit){ const o=it.onhit;
    const raw=(o.flat||0)+(o.adR||0)*ad+(o.apR||0)*ap+(o.pctCurHp||0)*auto.cur+(o.pctMaxHp||0)*B.hp;
    const m=o.dt==='magic'?mitFromEff((B.mr>0?B.mr*A.mrFrac:B.mr)-A.mrFlat):o.dt==='true'?1:mitFromEff((B.armor>0?B.armor*A.arFrac:B.armor)-A.arFlat);
    dmg+=raw*m; } });
  if(A.keystone==='lethaltempo' && auto.lt>=6) dmg += (20+0.15*ad)*mitFromEff((B.mr>0?B.mr*A.mrFrac:B.mr)-A.mrFlat);
  auto.cur=Math.max(0,auto.cur-dmg); auto.dmg+=dmg; auto.hits++; auto.last=dmg;
  if(A.keystone==='lethaltempo'&&auto.lt<6) auto.lt++;
  if(A.keystone==='conqueror'&&auto.conq<12) auto.conq++;
  floatIn('autoFx',dmg,'phys',crit);
  const interval=1/autoAS(); auto.t+=interval;
  autoRenderLive();
  if(auto.cur<=0){ auto.dead=true; autoStop(); autoRenderLive(); }
  else autoT=setTimeout(autoHit, interval*1000);
}
function autoStart(){ if(!auto||auto.dead)autoInit(); if(auto.running)return; auto.running=true; autoHit(); }
function autoStop(){ if(autoT){clearTimeout(autoT);autoT=null;} if(auto)auto.running=false; }
function autoReset(){ autoStop(); autoInit(); autoRenderLive(); }
function autoRenderLive(){
  if(!auto) return;
  const set=(id,v)=>{ const e=document.getElementById(id); if(e)e.textContent=v; };
  set('autoAS', autoAS().toFixed(2)+' /сек');
  set('autoDPS', Math.round(auto.dmg/Math.max(auto.t,0.01)));
  set('autoHP', Math.round(auto.cur));
  set('autoHits', auto.hits);
  set('autoPer', auto.last?Math.round(auto.last):'—');
  const fill=document.getElementById('autoFill');
  if(fill){ const pct=Math.max(0,auto.cur/auto.B.hp*100); fill.style.width=pct.toFixed(1)+'%';
    fill.style.background=pct>50?'linear-gradient(90deg,#2ecc71,#27ae60)':pct>25?'linear-gradient(90deg,#f1c40f,#e1b12c)':'linear-gradient(90deg,#ff6b6b,#e74c3c)'; }
  const st=document.getElementById('autoStacks');
  if(st){ const parts=[];
    if(auto.A.keystone==='lethaltempo') parts.push(`⚡ Смертельный темп ${auto.lt}/6`);
    if(auto.A.keystone==='conqueror') parts.push(`🗡 Завоеватель ${auto.conq}/12`);
    st.innerHTML = auto.dead ? `<span class="dc-auto-dead">☠ убит за ${auto.hits} ударов ≈ ${auto.t.toFixed(1)} c</span>` : parts.join(' · '); }
}
function autoBlock(){
  if(!auto) autoInit();
  const A=auto.A, B=auto.B;
  return `<div class="dc-arena-mode">
    <div class="dc-arena-hint">Атакующий и цель = из вкладки «Урон» (чемп+предметы+руна). Жми «Бой» — он авто-атакует в темпе своей скор.атаки; на каждый удар летит урон с он-хитами предметов (ботрак %HP, Зуб Нашора, Конец мудрости), критом и стаками (Смертельный темп разгоняет, Завоеватель копит силу).</div>
    <div class="dc-auto-cfg glassy">
      <label class="toggle"><input type="checkbox" id="autoSter" ${autoSteroid?'checked':''}> Умение скор. атаки (+50%)</label>
      <div class="ctrl" style="flex:1;min-width:200px"><div class="ctrl-label">Доп. бафф скор.атаки <span class="val" id="autoBuffVal">${autoBuffAS}%</span></div><input type="range" id="autoBuff" min="0" max="120" value="${autoBuffAS}"></div>
    </div>
    <div class="dc-auto-stage glassy">
      <div class="dc-auto-fighter">${fighterAva(A,'A')}<div><b>${A.name}</b><small>AD ${Math.round(A.ad)} · крит ${A.crit|0}% · 🔮 ${KEYSTONES[A.keystone].name}</small></div></div>
      <div class="dc-auto-center">
        <div class="dc-auto-as" id="autoAS">${autoAS().toFixed(2)} /сек</div>
        <div class="dc-auto-dps">DPS <b id="autoDPS">0</b></div>
        <div class="dc-auto-ctrl"><button class="dc-playbtn" data-auto="start">▶ Бой</button><button class="dc-resetbtn" data-auto="stop">⏸</button><button class="dc-resetbtn" data-auto="reset">↺</button></div>
      </div>
      <div class="dc-auto-fighter">${fighterAva(B,'B')}<div><b>${B.name}</b><small>${B.armor|0} бр · ${B.mr|0} мс · ${Math.round(B.hp)} HP</small></div></div>
    </div>
    <div class="dc-auto-track"><div class="dc-auto-fill" id="autoFill" style="width:100%"></div><div class="dc-auto-fx" id="autoFx"></div></div>
    <div class="dc-auto-stats"><span>❤ HP: <b id="autoHP">${Math.round(B.hp)}</b></span><span>🗡 ударов: <b id="autoHits">0</b></span><span>💥 за удар: <b id="autoPer">—</b></span><span id="autoStacks"></span></div>
  </div>`;
}

/* ════════════ ВКЛАДКА «⚖ СРАВНЕНИЕ» (A vs B по одной цели) ════════════ */
function compareBlock(){
  const T=fighterStats('tgt');
  const sides=[
    {tag:'A · Атакующий (Урон)', F:fighterStats('my'), items:state.myItems, boots:state.myBoots, ks:state.myKeystone},
    {tag:'B · Сборка',           F:buildFighter(),     items:state.bItems,  boots:state.bBoots,  ks:state.bKeystone},
  ];
  const data=sides.map(s=>{ const dmg=comboTotalKS(s.F,T), cost=gearGold(s.items,s.boots), ttk=ttkSim(s.F,T);
    return Object.assign({},s,{ dmg, pctHp:Math.min(100,dmg/T.hp*100), cost, dmgPerK:cost>0?Math.round(dmg/cost*1000):0, ttk }); });
  const maxDmg=Math.max(...data.map(d=>d.dmg),1);
  const pick=(a,b,more)=> a===b?-1:((more?a>b:a<b)?0:1);
  const dmgWin=pick(data[0].dmg,data[1].dmg,true), goldWin=pick(data[0].cost,data[1].cost,false), effWin=pick(data[0].dmgPerK,data[1].dmgPerK,true);
  const ttkWin=(data[0].ttk.killed||data[1].ttk.killed)?pick(data[0].ttk.t,data[1].ttk.t,false):-1;
  const metric=(lbl,val,win,i)=>`<div class="dc-cmp-metric ${i===win?'w':''}"><span>${lbl}</span><b>${val}</b></div>`;
  const col=(d,i)=>`<div class="dc-cmp-col ${i===dmgWin?'lead':''} glassy">
    <div class="dc-cmp-head">${fighterAva(d.F,i===0?'A':'B')}<div><b>${d.F.name}</b><small>${d.tag}</small></div></div>
    <div class="dc-cmp-items">${(d.items||[]).map(k=>GEAR[k]?itemImg(GEAR[k].img):'').join('')}${d.boots&&BOOTS[d.boots]?itemImg(BOOTS[d.boots].img):''}${KEYSTONES[d.ks]&&KEYSTONES[d.ks].img?runeImg(KEYSTONES[d.ks].img):''}</div>
    <div class="dc-cmp-bigwrap">${metric('💥 Урон комбо',Math.round(d.dmg),dmgWin,i)}<div class="dc-cmp-bar"><span class="b${i}" style="width:${(d.dmg/maxDmg*100).toFixed(0)}%"></span></div></div>
    ${metric('❤ % HP цели', d.pctHp.toFixed(0)+'%', dmgWin, i)}
    ${metric('⏱ Время убийства', d.ttk.killed?d.ttk.t.toFixed(2)+' c':'не убил', ttkWin, i)}
    ${metric('🪙 Золото', d.cost, goldWin, i)}
    ${metric('🎯 Урон / 1000 зол', d.dmgPerK, effWin, i)}
  </div>`;
  return `<div class="dc-cmp">
    <div class="dc-arena-hint">A = «Атакующий» из вкладки Урон, B = «Сборка». Оба бьют по цели «${T.name}» (${Math.round(T.hp)} HP · ${T.armor|0} бр · ${T.mr|0} мс). Меняй билды в их вкладках — сравнение обновится. Зелёным — кто лучше по метрике.</div>
    <div class="dc-cmp-grid">${col(data[0],0)}${col(data[1],1)}</div>
  </div>`;
}

/* ════════════ СБОРКА ВСЕЙ МОДАЛКИ ════════════ */
function modalHTML(){
  const d = compute();
  const onDmg = state.tab==='dmg';
  const calcInner = `
    <div class="dc-grid">
      ${panelAttacker()}
      ${panelTarget()}
      ${comboPanel(d)}
      ${resultPanel(d)}
    </div>`;

  const tabs = `<div class="dc-tabs">
      <button class="dc-tab ${state.tab==='dmg'?'on':''}" data-tab="dmg">⚔ Калькулятор урона</button>
      <button class="dc-tab ${state.tab==='items'?'on':''}" data-tab="items">📦 Калькулятор предметов</button>
      <button class="dc-tab ${state.tab==='build'?'on':''}" data-tab="build">🛠 Сборка</button>
      <button class="dc-tab ${state.tab==='cmp'?'on':''}" data-tab="cmp">⚖ Сравнение</button>
      <button class="dc-tab ${state.tab==='auto'?'on':''}" data-tab="auto">🗡 Авто-атаки</button>
      <button class="dc-tab ${state.tab==='arena'?'on':''}" data-tab="arena">🎮 Арена</button>
    </div>`;

  const bodyInner = state.tab==='build' ? buildBlock()
    : state.tab==='items' ? itemsBlock()
    : state.tab==='cmp' ? compareBlock()
    : state.tab==='auto' ? autoBlock()
    : state.tab==='arena' ? arenaBlock()
    : `<div class="dc-calcwrap">${calcInner}</div>`;
  const bottomActions = (state.actionpos==='bottom' && onDmg) ? `<div class="dc-actionbar glassy">${actionsHTML()}</div>` : '';
  const body = `<div class="dc-body">${bodyInner}</div>${bottomActions}`;

  // расположение вкладок: сверху / слева (вертик.) / сегмент по центру — вкладки те же, меняется обвязка
  const core = state.tabpos==='left'
    ? `<div class="dc-tabwrap-left">${tabs}<div class="dc-leftbody">${body}</div></div>`
    : `${tabs}${body}`;

  const headActions = (state.actionpos==='head' && onDmg) ? actionsHTML() : '';

  return `<div class="dc-modal glassy lay-${state.lay}" data-tabpos="${state.tabpos}" data-actionpos="${state.actionpos}">
    <div class="dc-head">
      <div class="dc-title"><span class="dc-mark">⚔</span>
        <div>Калькулятор урона<div class="dc-sub">Сколько урона ты наносишь по цели с учётом брони, МС и пробивания</div></div>
      </div>
      <div class="dc-head-right">
        ${headActions}
        <button class="dc-gear ${usersetOpen?'on':''}" id="dcGear" title="Настройки">⚙</button>
        ${usersetHTML()}
        <button class="dc-close" title="Закрыть">✕</button>
      </div>
    </div>
    ${core}
    ${gearPickerHTML()}
  </div>`;
}

/* ⚙ настройки юзера */
function usersetHTML(){
  return `<div class="dc-userset glassy ${usersetOpen?'open':''}" id="dcUserset">
    <div class="us-title">Настройки</div>
    <div class="ctrl"><div class="ctrl-label">Сила стекла</div>
      <select id="usGlasspow">${GLASS_POW.map(g=>`<option value="${g.key}" ${g.key===state.glasspow?'selected':''}>${g.label}</option>`).join('')}</select></div>
    <div class="ctrl"><div class="ctrl-label">Плотность <span class="val" id="usGapVal">${state.gap}px</span></div>
      <input type="range" id="usGap" min="6" max="22" value="${state.gap}"></div>
    <div class="ctrl ctrl-toggle"><label class="toggle"><input type="checkbox" id="usFormula" ${state.showFormula?'checked':''}> Показывать формулу</label></div>
    <div class="ctrl ctrl-toggle"><label class="toggle"><input type="checkbox" id="usAnim" ${state.animNum?'checked':''}> Анимация числа урона</label></div>
  </div>`;
}

/* ════════════ ПРИМЕНИТЬ ВНЕШНИЙ ВИД ════════════ */
function applyLook(){
  const b=document.body;
  b.dataset.glass='on'; b.dataset.glasspow=state.glasspow; b.dataset.glasstint=state.tint;
  b.dataset.glasssat=state.glasssat; b.dataset.glassborder=state.glassborder;
  b.dataset.glassnoise=state.glassnoise?'on':'off';
  document.getElementById('labBg').style.backgroundImage = SPLASH_IMG[state.bg]||SPLASH_IMG.lux;
  const dim=BG_DIMS.find(d=>d.key===state.bgdim)||BG_DIMS[2];
  const r=document.documentElement.style;
  r.setProperty('--dim',dim.v);
  r.setProperty('--radius',state.radius+'px');
  r.setProperty('--gap',state.gap+'px');
  const a=accentObj();
  r.setProperty('--accent',a.c); r.setProperty('--grad1',a.c); r.setProperty('--hi',a.key==='cyan'?'255,255,255':a.rgb);
  r.setProperty('--grad2',state.grad2); r.setProperty('--angle',state.angle+'deg');
  r.setProperty('--text',a.c);
}

/* ════════════ АНИМАЦИЯ ЧИСЛА ════════════ */
let _prevNum=0,_raf=null;
function animNum(target){
  const el=document.getElementById('dcBigNum'); if(!el) return;
  const end=Math.round(target);
  if(!state.animNum){ el.textContent=end; _prevNum=end; return; }
  const start=_prevNum; if(_raf)cancelAnimationFrame(_raf);
  if(Math.abs(end-start)<2){ el.textContent=end; _prevNum=end; return; }
  let t0=null;
  function step(ts){ if(!t0)t0=ts; const p=Math.min((ts-t0)/280,1); const e=1-Math.pow(1-p,3);
    el.textContent=Math.round(start+(end-start)*e);
    if(p<1)_raf=requestAnimationFrame(step);
    else{ el.textContent=end; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); _prevNum=end; } }
  _raf=requestAnimationFrame(step);
}

/* ════════════ ПЕРЕСЧЁТ БЕЗ ПОЛНОГО РЕРЕНДЕРА (живой) ════════════ */
function recompute(){
  const d=compute();
  // обновить результат целиком (он зависит от вида)
  const res=document.querySelector('.dc-result');
  if(res){ res.outerHTML=resultPanel(d); }
  bindActions();
  animNum(d.totalMit);
  // обновить числа в комбо
  const byKey={}; d.rows.forEach(r=>byKey[r.key]=r);
  document.querySelectorAll('.dc-abil').forEach(el=>{
    const k=el.dataset.abil, r=byKey[k];
    const dmg=el.querySelector('.dc-abil-dmg');
    const on=el.classList.contains('on');
    if(dmg) dmg.innerHTML=(on&&r?Math.round(r.mit):'—')+'<small>после защ.</small>';
  });
}

/* ════════════ СОБЫТИЯ ════════════ */
function wireModal(){
  const inner=document.getElementById('stageInner');

  // выбор чемпов
  const myC=inner.querySelector('#myChamp');
  if(myC) myC.onchange=e=>{ state.myChamp=e.target.value; syncAutoStats(); ensureAbilState(); renderStage(); };
  const tgC=inner.querySelector('#tgtChamp');
  if(tgC) tgC.onchange=e=>{ state.tgtChamp=e.target.value; syncAutoStats(); renderStage(); };

  // уровни (перерисовка — меняются авто-статы)
  const myL=inner.querySelector('#myLvl');
  if(myL) myL.oninput=e=>{ state.myLvl=+e.target.value; syncAutoStats(); renderStage(); };
  const tgL=inner.querySelector('#tgtLvl');
  if(tgL) tgL.oninput=e=>{ state.tgtLvl=+e.target.value; syncAutoStats(); renderStage(); };

  // числовые поля → живой пересчёт (базовые статы редактируемы только для манекена)
  const bind=id=>{ const el=inner.querySelector('#'+id); if(el && !el.readOnly) el.oninput=e=>{ state[id]=+e.target.value||0; recompute(); }; };
  bind('myBaseAD'); bind('myBonusAD'); bind('myAP'); bind('myCrit');
  bind('myArPen'); bind('myArPenFlat'); bind('myMrPen'); bind('myMrPenFlat');
  bind('tgtArmor'); bind('tgtMR'); bind('tgtHpMax');
  bind('tgtArBonus'); bind('tgtMrBonus'); bind('tgtHpBonus');

  // текущий HP цели
  const hpc=inner.querySelector('#tgtHpCur');
  if(hpc) hpc.oninput=e=>{ state.tgtHpCurPct=+e.target.value; const l=inner.querySelector('#tgtHpCurLbl'); if(l)l.textContent=state.tgtHpCurPct+'%'; recompute(); };

  // комбо: вкл/выкл + hits
  inner.querySelectorAll('.dc-abil').forEach(el=>{
    el.addEventListener('click',e=>{
      if(e.target.closest('.dc-hits')) return;
      const k=el.dataset.abil;
      if(k==='AA') state.aaOn=!state.aaOn;
      else if(state.abilState[k]) state.abilState[k].on=!state.abilState[k].on;
      el.classList.toggle('on');
      recompute();
    });
  });
  inner.querySelectorAll('.dc-hits').forEach(h=>{
    h.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',e=>{
      e.stopPropagation();
      const k=h.dataset.hits, dlt=+btn.dataset.d;
      if(k==='AA') state.aaHits=Math.max(1,Math.min(20,state.aaHits+dlt));
      else if(state.abilState[k]) state.abilState[k].hits=Math.max(1,Math.min(20,state.abilState[k].hits+dlt));
      const n=(k==='AA')?state.aaHits:state.abilState[k].hits;
      h.querySelector('.n').textContent=n;
      recompute();
    }));
  });

  // вкладки урон/предметы/сборка
  inner.querySelectorAll('.dc-tab').forEach(t=>t.addEventListener('click',()=>{ if(!t.dataset.tab)return; state.tab=t.dataset.tab; gearPick=null; renderStage(); }));

  // вкладка «Сборка»
  const bChamp=inner.querySelector('#bChamp');
  if(bChamp) bChamp.onchange=e=>{ state.bChamp=e.target.value; const c=champByName(state.bChamp); if(c&&c.stack)state.bStacks=c.stack.def; renderStage(); };
  const bLvl=inner.querySelector('#bLvl');
  if(bLvl) bLvl.oninput=e=>{ state.bLvl=+e.target.value; const lab=inner.querySelector('.dc-build-head .dc-lvl-badge'); if(lab)lab.textContent='Ур. '+state.bLvl;
    const sheet=inner.querySelector('#dcStatSheet'); if(sheet)sheet.innerHTML=statSheetHTML(buildStats()); };
  const bStacks=inner.querySelector('#bStacks');
  if(bStacks) bStacks.oninput=e=>{ state.bStacks=+e.target.value; const lbl=inner.querySelector('#bStacksLbl'); const c=champByName(state.bChamp);
    if(lbl&&c&&c.stack)lbl.textContent=state.bStacks+' / '+c.stack.max;
    const sheet=inner.querySelector('#dcStatSheet'); if(sheet)sheet.innerHTML=statSheetHTML(buildStats()); };
  inner.querySelectorAll('[data-shard]').forEach(b=>b.addEventListener('click',()=>{ const [row,key]=b.dataset.shard.split(':'); state.bShards[row]=key; renderStage(); }));
  const tobuild=inner.querySelector('[data-tobuild]'); if(tobuild) tobuild.onclick=loadBuildToCalc;

  // 🎮 Арена
  inner.querySelectorAll('[data-arena]').forEach(b=>b.addEventListener('click',()=>{ state.arena=b.dataset.arena; renderStage(); }));
  inner.querySelectorAll('[data-duel]').forEach(b=>b.addEventListener('click',()=>{ const a=b.dataset.duel;
    if(a==='start')duelStart(); else if(a==='pause')duelStop(); else if(a==='reset')duelReset();
    else if(a.startsWith('speed:')){ duelSpeed=+a.slice(6); inner.querySelectorAll('.dc-duel-speed button').forEach(x=>x.classList.toggle('on',x===b)); } }));
  if(state.tab==='arena'&&state.arena==='duel'&&duel) duelUpdate();   // показать кулдаун-пипсы сразу

  // 🗡 Авто-атаки
  inner.querySelectorAll('[data-auto]').forEach(b=>b.addEventListener('click',()=>{ const a=b.dataset.auto;
    if(a==='start')autoStart(); else if(a==='stop')autoStop(); else if(a==='reset')autoReset(); }));
  const ast=inner.querySelector('#autoSter'); if(ast)ast.onchange=e=>{ autoSteroid=e.target.checked; autoRenderLive(); };
  const abf=inner.querySelector('#autoBuff'); if(abf)abf.oninput=e=>{ autoBuffAS=+e.target.value; const v=inner.querySelector('#autoBuffVal'); if(v)v.textContent=autoBuffAS+'%'; autoRenderLive(); };
  const kre=inner.querySelector('[data-kill]'); if(kre) kre.onclick=()=>renderStage();
  inner.querySelectorAll('[data-quiz]').forEach(b=>b.addEventListener('click',()=>{ const v=b.dataset.quiz;
    if(v.startsWith('ans:')){ quizAnswer(+v.slice(4)); renderStage(); }
    else if(v==='next'){ quizNext(); renderStage(); }
    else if(v==='restart'){ quizStart(); renderStage(); }
    else if(v==='save'){ const n=inner.querySelector('#quizName'); quizSave(n?n.value.trim():''); renderStage(); } }));

  // снаряга: открыть пикер / убрать чип / выбрать в пикере / закрыть
  inner.querySelectorAll('[data-pick]').forEach(b=>b.addEventListener('click',()=>{ gearPick=b.dataset.pick; renderStage(); }));
  inner.querySelectorAll('[data-rem]').forEach(b=>b.addEventListener('click',()=>{
    const [side,mode,key]=b.dataset.rem.split(':');
    if(mode==='boots') setBoots(side,null);
    else { const arr=gearArr(side); const i=arr.indexOf(key); if(i>=0)arr.splice(i,1); }
    renderStage();
  }));
  inner.querySelectorAll('[data-gear]').forEach(c=>c.addEventListener('click',()=>{
    const [side,mode,key]=c.dataset.gear.split(':');
    if(mode==='boots'){ setBoots(side, getBoots(side)===key?null:key); }
    else { const arr=gearArr(side); const i=arr.indexOf(key); if(i>=0)arr.splice(i,1); else if(arr.length<6)arr.push(key); }
    renderStage();
  }));
  inner.querySelectorAll('[data-rune]').forEach(sel=>sel.addEventListener('change',e=>{
    if(sel.dataset.rune==='my') state.myKeystone=e.target.value; else state.bKeystone=e.target.value; renderStage(); }));
  inner.querySelectorAll('[data-gclose]').forEach(o=>o.addEventListener('click',e=>{ if(e.target===o||e.target.closest('.dc-close[data-gclose]')){ gearPick=null; renderStage(); } }));
  const gpick=inner.querySelector('.dc-gpick'); if(gpick) gpick.addEventListener('click',e=>{ if(!e.target.closest('[data-gclose]'))e.stopPropagation(); });

  // ⚙ юзер-настройки
  const gear=inner.querySelector('#dcGear'), pop=inner.querySelector('#dcUserset');
  if(gear&&pop){
    gear.addEventListener('click',e=>{ e.stopPropagation(); usersetOpen=!usersetOpen; pop.classList.toggle('open',usersetOpen); gear.classList.toggle('on',usersetOpen); });
    pop.addEventListener('click',e=>e.stopPropagation());
    pop.querySelector('#usGlasspow').onchange=e=>{ state.glasspow=e.target.value; applyLook(); };
    pop.querySelector('#usGap').oninput=e=>{ state.gap=+e.target.value; pop.querySelector('#usGapVal').textContent=state.gap+'px'; applyLook(); };
    pop.querySelector('#usFormula').onchange=e=>{ state.showFormula=e.target.checked; renderStage(); };
    pop.querySelector('#usAnim').onchange=e=>{ state.animNum=e.target.checked; };
  }

  // закрыть (демо — просто мигнуть)
  const close=inner.querySelector('.dc-close');
  if(close) close.addEventListener('click',()=>{ const m=inner.querySelector('.dc-modal'); m.style.transition='.25s'; m.style.opacity='.25'; m.style.transform='scale(.97)'; setTimeout(()=>{m.style.opacity='';m.style.transform='';},260); });

  bindActions();
  wireItemCalc();
}

function wireItemCalc(){
  const inner=document.getElementById('stageInner');
  // выбор предмета
  inner.querySelectorAll('.dc-itemcard').forEach(c=>c.addEventListener('click',()=>{
    state.curItem=c.dataset.item; state._itemFields={}; botrkReset();
    inner.querySelectorAll('.dc-itemcard').forEach(x=>x.classList.toggle('on',x===c));
    rerenderItemCalc();
  }));
  // дальность
  inner.querySelectorAll('[data-irange]').forEach(b=>b.addEventListener('click',()=>{ state.itemRange[state.curItem]=b.dataset.irange; rerenderItemCalc(); }));
  // лиандри %
  inner.querySelectorAll('[data-liandry]').forEach(b=>b.addEventListener('click',()=>{ state.liandryPct=+b.dataset.liandry; rerenderItemCalc(); }));
  // поля предмета → живой пересчёт (без потери фокуса: меняем только число результата + формулу)
  inner.querySelectorAll('[data-ifield]').forEach(f=>f.addEventListener('input',()=>{
    state._itemFields=state._itemFields||{};
    inner.querySelectorAll('[data-ifield]').forEach(x=>{ state._itemFields[x.id]=x.value; });
    const it=ITEMS[state.curItem];
    const v=id=>{ const el=document.getElementById(id); return el?el.value:'0'; };
    const res=it.calc(v,itemRangeOn(state.curItem),state.liandryPct);
    const valEl=document.getElementById('dcItemVal'); if(valEl) valEl.textContent=res.val;
    const fEl=inner.querySelector('.dc-iformula'); if(fEl) fEl.textContent=res.formula;
    const hEl=inner.querySelector('.dc-iheal'); if(hEl&&res.heal!=null) hEl.textContent='💚 Хил: '+res.heal;
  }));
  // BotRK: забиндить кнопки симуляции боя
  if(ITEMS[state.curItem]&&ITEMS[state.curItem].combat) renderBotrkCombat();
}

/* ════════════ РЕНДЕР ════════════ */
function renderStage(){
  if(arenaTimer){ clearInterval(arenaTimer); arenaTimer=null; if(duel)duel.running=false; }
  if(autoT){ clearTimeout(autoT); autoT=null; if(auto)auto.running=false; }
  document.getElementById('stageInner').innerHTML = modalHTML();
  wireModal();
  applyLook();
  _prevNum = Math.round(compute().totalMit);   // чтобы анимация числа не прыгала с нуля
}

/* ── дизайн-полоса (для нас) ── */
function selCtrl(id,label,items,cur){
  return `<div class="ctrl"><div class="ctrl-label">${label}</div>
    <select id="${id}">${items.map(x=>`<option value="${x.key??x.id}" ${(x.key??x.id)===cur?'selected':''}>${x.label??x.name}</option>`).join('')}</select></div>`;
}
function renderSettings(){
  const s=document.getElementById('settings');
  s.innerHTML =
    selCtrl('lay','Раскладка модалки',LAYOUTS,state.lay)+
    selCtrl('resview','Вид результата',RESVIEWS,state.resview)+
    selCtrl('tabpos','Вкладки где',TABPOS,state.tabpos)+
    selCtrl('actionpos','Кнопки боя где',ACTIONPOS,state.actionpos)+
    selCtrl('accent','Акцент',ACCENTS,state.accent)+
    `<div class="ctrl"><div class="ctrl-label">2-й цвет градиента</div>
      <input type="color" id="grad2" value="${state.grad2}" style="width:100%;height:34px;background:transparent;border:1px solid rgba(255,255,255,.16);border-radius:8px;cursor:pointer"></div>`+
    `<div class="ctrl"><div class="ctrl-label">Угол градиента <span class="val">${state.angle}°</span></div>
      <input type="range" id="angle" min="0" max="360" value="${state.angle}"></div>`+
    selCtrl('bg','Арт фона (лаб-превью)',SPLASHES,state.bg)+
    selCtrl('bgdim','Затемнение фона',BG_DIMS,state.bgdim)+
    selCtrl('tint','Стекло: оттенок',GLASS_TINTS,state.tint)+
    selCtrl('glasssat','Стекло: насыщенность',GLASS_SAT,state.glasssat)+
    selCtrl('glassborder','Стекло: граница',GLASS_BORDER,state.glassborder)+
    `<div class="ctrl"><div class="ctrl-label">Скругление <span class="val">${state.radius}px</span></div>
      <input type="range" id="radius" min="0" max="28" value="${state.radius}"></div>`+
    `<div class="ctrl ctrl-toggle"><label class="toggle"><input type="checkbox" id="glassnoise" ${state.glassnoise?'checked':''}> Зерно / шум</label></div>`;

  s.querySelector('#lay').onchange=e=>{ state.lay=e.target.value; renderStage(); };
  s.querySelector('#resview').onchange=e=>{ state.resview=e.target.value; renderStage(); };
  s.querySelector('#tabpos').onchange=e=>{ state.tabpos=e.target.value; renderStage(); };
  s.querySelector('#actionpos').onchange=e=>{ state.actionpos=e.target.value; renderStage(); };
  s.querySelector('#accent').onchange=e=>{ state.accent=e.target.value; applyLook(); renderStage(); };
  s.querySelector('#grad2').oninput=e=>{ state.grad2=e.target.value; applyLook(); };
  s.querySelector('#angle').oninput=e=>{ state.angle=+e.target.value; s.querySelector('#angle').parentNode.querySelector('.val').textContent=state.angle+'°'; applyLook(); };
  s.querySelector('#bg').onchange=e=>{ state.bg=e.target.value; applyLook(); };
  s.querySelector('#bgdim').onchange=e=>{ state.bgdim=e.target.value; applyLook(); };
  s.querySelector('#tint').onchange=e=>{ state.tint=e.target.value; applyLook(); };
  s.querySelector('#glasssat').onchange=e=>{ state.glasssat=e.target.value; applyLook(); };
  s.querySelector('#glassborder').onchange=e=>{ state.glassborder=e.target.value; applyLook(); };
  s.querySelector('#radius').oninput=e=>{ state.radius=+e.target.value; s.querySelector('#radius').parentNode.querySelector('.val').textContent=state.radius+'px'; applyLook(); };
  s.querySelector('#glassnoise').onchange=e=>{ state.glassnoise=e.target.checked; applyLook(); };
}

/* клик вне ⚙ — закрыть */
document.addEventListener('click',()=>{
  if(!usersetOpen) return;
  usersetOpen=false;
  const pop=document.getElementById('dcUserset'), gear=document.getElementById('dcGear');
  if(pop)pop.classList.remove('open'); if(gear)gear.classList.remove('on');
});

/* свернуть полосу */
document.getElementById('toggleBtn').addEventListener('click',()=>{
  const min=document.body.classList.toggle('dc-min');
  document.getElementById('toggleBtn').textContent=min?'▼ Показать настройки':'▲ Свернуть настройки';
});
/* сброс */
document.getElementById('resetBtn').addEventListener('click',()=>{
  state=JSON.parse(JSON.stringify(DEFAULTS));
  if(LS)LS.clearSaved();
  syncAutoStats(); ensureAbilState(); renderSettings(); renderStage(); applyLook();
});

/* старт */
syncAutoStats();
ensureAbilState();
renderSettings();
renderStage();
applyLook();

/* память лаба + код/вставить/пресеты */
if(window.LabSettings){
  LS=LabSettings.attach({
    id:'damage-calc', defaults:DEFAULTS, mount:'#labTools', schema:1,
    getState:()=>state,
    apply:st=>{ state=Object.assign(JSON.parse(JSON.stringify(DEFAULTS)),st); syncAutoStats(); ensureAbilState(); renderSettings(); renderStage(); applyLook(); },
  });
}
