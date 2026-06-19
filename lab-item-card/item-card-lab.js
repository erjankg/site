/* ════════════════════════════════════════════════════════════════
   Песочница: ПИКЕР предметов/рун → открытие КАРТОЧКИ (3 вкладки).
   Карточка = дефолтное стекло, за ней фон главного экрана.
   Данные = реальные WR-предметы. Чистый JS.
   ════════════════════════════════════════════════════════════════ */
(function(){
'use strict';

/* ── иконки ── */
function wfUrl(slug){ return 'https://www.wildriftfire.com/images/items/'+slug+'.png'; }
function compImg(id){ return 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/item/'+id+'.png'; }
function champIcon(key){ return 'https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/'+key+'.png'; }
var PERK='https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/';

/* ── фон главного экрана за стеклом (ОДИН арт) ── */
var DDS='https://ddragon.leagueoflegends.com/cdn/img/champion/splash';
var SPLASHES=[['lux','Lux'],['veigar','Veigar'],['ahri','Ahri'],['zed','Zed'],['jhin','Jhin'],['kaisa',"Kai'Sa"],
  ['yasuo','Yasuo'],['katarina','Katarina'],['senna','Senna'],['darius','Darius'],['ezreal','Ezreal'],['brand','Brand']];
var SPLASH_KEY={lux:'Lux_0',veigar:'Veigar_0',ahri:'Ahri_0',zed:'Zed_0',jhin:'Jhin_0',kaisa:'Kaisa_0',
  yasuo:'Yasuo_0',katarina:'Katarina_0',senna:'Senna_0',darius:'Darius_0',ezreal:'Ezreal_0',brand:'Brand_0'};
function splashUrl(k){ return DDS+'/'+(SPLASH_KEY[k]||'Lux_0')+'.jpg'; }

/* ── статы ── */
var STAT={ ad:['⚔','AD'], ap:['🔮','Сила умений'], hp:['❤','Здоровье'], armor:['🛡','Броня'], mr:['✦','Сопр. магии'],
  crit:['💥','Крит'], as:['⚡','Скор. атаки'], ah:['⏩','Ускор. умений'], ms:['👟','Скор. бега'],
  ls:['🩸','Вампиризм'], arPenFlat:['🗡↯','Проб. брони'], arPenPct:['🗡↯','Проб. брони'],
  mrPenFlat:['🔮↯','Проб. сопр.'], mrPenPct:['🔮↯','Проб. сопр.'] };
var PCT={crit:1,as:1,ls:1,arPenPct:1,mrPenPct:1};
function statStr(k,v){ return '+'+v+(PCT[k]?'%':''); }
/* золотая ценность статов — WILD RIFT (базовые предметы 500 зол; диип-ресёрч 2026-06-15) */
var GOLD={ ad:41.7, ap:20, hp:3.33, armor:25, mr:25, crit:33.3, as:33.3, ah:30, ms:12, ls:70,
  mrPenFlat:0, arPenFlat:0, arPenPct:0, mrPenPct:0 };
function goldValue(it){ var g=0; (it.stats||[]).forEach(function(s){ g+=(GOLD[s[0]]||0)*s[1]; }); return Math.round(g); }
function efficiency(it){ if(!it.cost) return 0; return Math.round(goldValue(it)/it.cost*100); }
var CAT_COLOR={ 'AD':'#e8820a', 'AP':'#8b5cf6', 'Защита':'#2ecc71', 'Ботинки':'#0BC4E3' };

/* ════════════════════════════════════════════════════════════════
   КАТАЛОГ ПРЕДМЕТОВ (реальные WR + демо цена/пассивка/путь/чемпы/спайк)
   ════════════════════════════════════════════════════════════════ */
function C(id,name){ return {id:id,name:name}; }
var ITEMS={
  ie:{name:'Грань Бесконечности',slug:'infinity-edge',cat:'AD',cost:3400,stats:[['ad',65],['crit',20]],
    passive:'При крит. шансе ≥60% критические удары наносят на 35% больше урона.',
    comp:[C(1038,'B.F. Меч'),C(1037,'Кирка'),C(1018,'Плащ ловкости')],
    champs:['Jhin','Caitlyn','Tristana'],spike:'3-й предмет (крит-спайк)',tip:'Нужен крит-шанс рядом, иначе пассив спит.'},
  collector:{name:'Коллекционер',slug:'the-collector',cat:'AD',cost:3000,stats:[['ad',50],['crit',20],['arPenFlat',12]],
    passive:'Добивает врагов с HP <5%, за убийство даёт бонусное золото.',
    comp:[C(3133,'Молот Колфилда'),C(1018,'Плащ ловкости'),C(1037,'Кирка')],
    champs:['Zed','Talon','Jhin'],spike:'1-2 предмет (бурст)',tip:'Для убийц на пробивание и добивание.'},
  bt:{name:'Жажда крови',slug:'bloodthirster',cat:'AD',cost:3400,stats:[['ad',55],['ls',18]],
    passive:'Избыток вампиризма копится в щит (до 50–350 HP).',
    comp:[C(1038,'B.F. Меч'),C(1053,'Скипетр вампира'),C(1036,'Длинный меч')],
    champs:['Yasuo','Yone','Vayne'],spike:'2-3 предмет (устойчивость)',tip:'Топ против поке — щит держит хп.'},
  youmuu:{name:'Призрачный клинок Йоумуу',slug:'youmuus-ghostblade',cat:'AD',cost:2900,stats:[['ad',55],['arPenFlat',18],['ms',20]],
    passive:'Актив: всплеск скорости бега. Стаки скорости вне боя.',
    comp:[C(3133,'Молот Колфилда'),C(1036,'Длинный меч'),C(1018,'Плащ ловкости')],
    champs:['Zed','Talon','Qiyana'],spike:'1-й предмет (роуминг)',tip:'Мобильность + пробивание для убийц.'},
  bc:{name:'Чёрный разделитель',slug:'black-cleaver',cat:'AD',cost:3100,stats:[['ad',40],['hp',300],['arPenPct',24]],
    passive:'Удары срезают броню цели стаками. Даёт скорость бега при попадании.',
    comp:[C(3133,'Молот Колфилда'),C(1011,'Пояс великана'),C(1029,'Тканевая броня')],
    champs:['Garen','Darius','Renekton'],spike:'2 предмет (бруизер)',tip:'Хорош в команду с физ-уроном (срез брони общий).'},
  serylda:{name:'Обида Серильды',slug:'seryldas-grudge',cat:'AD',cost:3200,stats:[['ad',45],['arPenPct',30],['ah',15]],
    passive:'Замедляет целей с HP ниже 50%.',
    comp:[C(3133,'Молот Колфилда'),C(1037,'Кирка'),C(1036,'Длинный меч')],
    champs:['Jhin','Kaisa','Lucian'],spike:'3-4 предмет (против танков)',tip:'Берётся против бронированной команды.'},
  luden:{name:'Эхо Людена',slug:'ludens-echo',cat:'AP',cost:3200,stats:[['ap',100],['ah',20]],
    passive:'Умения наносят доп. урон по области и дают всплеск скорости.',
    comp:[C(1058,'Большой жезл'),C(1026,'Жезл усиления'),C(3067,'Камень очага')],
    champs:['Lux','Veigar','Brand'],spike:'1-й предмет (волна+бурст)',tip:'Топ первый предмет на бурст-магов.'},
  nashor:{name:'Зуб Нашора',slug:'nashors-tooth',cat:'AP',cost:3000,stats:[['ap',85],['as',50],['ah',15]],
    passive:'Автоатаки наносят доп. магический урон (15 + 20% от силы умений).',
    comp:[C(1043,'Перевёрнутый лук'),C(1026,'Жезл усиления'),C(1052,'Том усиления')],
    champs:['Teemo','Kennen','Diana'],spike:'2 предмет (он-хит)',tip:'Для магов на автоатаках.'},
  liandryItem:{name:'Мучения Лиандри',slug:'liandrys-torment',cat:'AP',cost:3200,stats:[['ap',95],['hp',300]],
    passive:'Урон умениями поджигает: жжёт % макс. HP во времени.',
    comp:[C(1058,'Большой жезл'),C(1028,'Рубиновый кристалл'),C(1052,'Том усиления')],
    champs:['Brand','Cassiopeia','Teemo'],spike:'2-3 предмет (против танков)',tip:'Топ против HP-команд (жжёт %HP).'},
  iorb:{name:'Сфера бесконечности',slug:'infinity-orb',cat:'AP',cost:3200,stats:[['ap',110],['hp',200]],
    passive:'Доп. магический урон по целям с HP <35%, гарант. крит умений.',
    comp:[C(1058,'Большой жезл'),C(1026,'Жезл усиления'),C(1028,'Рубиновый кристалл')],
    champs:['Lux','Syndra','Veigar'],spike:'2 предмет (добивание)',tip:'Усиливает добивание умениями.'},
  rylai:{name:'Скипетр Рилай',slug:'rylais-crystal-scepter',cat:'AP',cost:2600,stats:[['ap',75],['hp',400]],
    passive:'Урон умениями замедляет цель на 30%.',
    comp:[C(1026,'Жезл усиления'),C(1028,'Рубиновый кристалл'),C(1052,'Том усиления')],
    champs:['Brand','Morgana','Vladimir'],spike:'3 предмет (контроль)',tip:'Кайт и склейка комбо замедлением.'},
  lich:{name:'Лезвие лича',slug:'lich-bane',cat:'AP',cost:3000,stats:[['ap',80],['ah',15],['ms',8]],
    passive:'После умения следующая автоатака бьёт всплеском магического урона.',
    comp:[C(1026,'Жезл усиления'),C(3057,'Камень очага'),C(1052,'Том усиления')],
    champs:['Diana','Ekko','Akali'],spike:'2 предмет (спелл-блейд)',tip:'Для магов с быстрым каст→автоатака.'},
  thornmail:{name:'Шипованный доспех',slug:'thornmail',cat:'Защита',cost:2700,stats:[['armor',55],['hp',300]],
    passive:'Получив автоатаку — магический урон + анти-хил по атакующему.',
    comp:[C(1031,'Кольчуга'),C(1029,'Тканевая броня'),C(1028,'Рубиновый кристалл')],
    champs:['Malphite','Leona','Rammus'],spike:'2 предмет (против АД-кэрри)',tip:'Берётся против вампиризма и автоатак.'},
  sunfire:{name:'Эгида Солнечного огня',slug:'sunfire-aegis',cat:'Защита',cost:2800,stats:[['armor',50],['hp',400]],
    passive:'Поджигает врагов вокруг, урон растёт в бою.',
    comp:[C(1031,'Кольчуга'),C(3067,'Камень очага'),C(1028,'Рубиновый кристалл')],
    champs:['Malphite','Sett','Ornn'],spike:'1-2 предмет (вейвклир)',tip:'Танк-фронтлайн с аурой урона.'},
  force:{name:'Сила природы',slug:'force-of-nature',cat:'Защита',cost:2900,stats:[['mr',60],['ms',25]],
    passive:'Стаки от магического урона дают сопр. магии и скорость бега.',
    comp:[C(1057,'Плащ негатрона'),C(1033,'Мантия нуля'),C(1006,'Свиток реген.')],
    champs:['Malphite','Ornn','Sion'],spike:'3 предмет (против магов)',tip:'Топ против тяжёлой АП-команды.'},
  hollow:{name:'Пустотное сияние',slug:'hollow-radiance',cat:'Защита',cost:2700,stats:[['mr',45],['hp',350]],
    passive:'Аура жжёт врагов вокруг магическим уроном.',
    comp:[C(1057,'Плащ негатрона'),C(1028,'Рубиновый кристалл'),C(3067,'Камень очага')],
    champs:['Amumu','Sion','Malphite'],spike:'2 предмет (МС+аура)',tip:'Сопр. магии + вейвклир танкам.'},
  frozen:{name:'Ледяное сердце',slug:'frozen-heart',cat:'Защита',cost:2700,stats:[['armor',70],['ah',20]],
    passive:'Аура замедляет скор. атаки врагов вокруг.',
    comp:[C(1031,'Кольчуга'),C(1029,'Тканевая броня'),C(3067,'Камень очага')],
    champs:['Malphite','Nautilus','Sion'],spike:'3 предмет (против автоатак)',tip:'Душит АД-кэрри замедлением атаки.'},
  steraks:{name:'Мощь Стерака',slug:'steraks-gage',cat:'Защита',cost:2900,stats:[['ad',45],['hp',400]],
    passive:'При большом уроне даёт щит от макс. HP.',
    comp:[C(1011,'Пояс великана'),C(3052,'Топор'),C(1028,'Рубиновый кристалл')],
    champs:['Sett','Renekton','Camille'],spike:'3 предмет (выживание)',tip:'Бруизерам — щит спасает в замесе.'}
};
/* оценка золота за пассив/актив (демо-экспертная — у пассивок НЕТ офиц. цены; это и есть «недостающие» % до 100) */
var PASSIVE_GOLD={ ie:600,collector:500,bt:550,youmuu:450,bc:700,serylda:500,luden:650,nashor:700,
  liandryItem:800,iorb:650,rylai:600,lich:750,thornmail:650,sunfire:700,force:650,hollow:600,frozen:600,steraks:750 };
Object.keys(ITEMS).forEach(function(k){ ITEMS[k].pg=PASSIVE_GOLD[k]||0; });
var ITEM_ORDER=Object.keys(ITEMS);

/* ── РУНЫ (кейстоуны) ── */
function R(url,name){ return {icon:PERK+url,name:name}; }
var RUNES={
  electro:{name:'Электрокьют',cat:'Доминирование',color:'#d44242',icon:PERK+'Domination/Electrocute/Electrocute.png',
    desc:'3 отдельные атаки или умения по чемпиону за 3 сек наносят всплеск адаптивного урона.',
    slots:[R('Domination/CheapShot/CheapShot.png','Дешёвый выстрел'),R('Domination/EyeballCollection/EyeballCollection.png','Коллекция глаз'),R('Domination/UltimateHunter/UltimateHunter.png','Охотник за ультой')],
    champs:['Zed','Lux','Ahri'],spike:'С 1 уровня (бурст-комбо)',tip:'Для бурст-чемпов с 3 быстрыми тычками.'},
  conqueror:{name:'Завоеватель',cat:'Точность',color:'#c8aa6e',icon:PERK+'Precision/Conqueror/Conqueror.png',
    desc:'Атаки и умения по чемпионам копят адаптивную силу; на макс. стаках лечит от нанесённого урона.',
    slots:[R('Precision/Triumph/Triumph.png','Триумф'),R('Precision/LegendAlacrity/LegendAlacrity.png','Проворность'),R('Precision/LastStand/LastStand.png','Последний рубеж')],
    champs:['Garen','Yasuo','Jax'],spike:'Затяжной бой (бруизеры)',tip:'Топ для долгих разменов и бруизеров.'},
  aery:{name:'Стремительная Аэри',cat:'Колдовство',color:'#9faafc',icon:PERK+'Sorcery/SummonAery/SummonAery.png',
    desc:'Атаки и умения шлют Аэри: по врагу — урон, по союзнику — щит.',
    slots:[R('Sorcery/ManaflowBand/ManaflowBand.png','Лента маны'),R('Sorcery/Transcendence/Transcendence.png','Превосходство'),R('Sorcery/Scorch/Scorch.png','Опаление')],
    champs:['Lux','Morgana','Sona'],spike:'Лейн-поке/щиты',tip:'Для поке-магов и энчантеров.'},
  comet:{name:'Чародейская комета',cat:'Колдовство',color:'#9faafc',icon:PERK+'Sorcery/ArcaneComet/ArcaneComet.png',
    desc:'Урон умением призывает комету в цель; кулдаун снижается уроном умений.',
    slots:[R('Sorcery/ManaflowBand/ManaflowBand.png','Лента маны'),R('Sorcery/Transcendence/Transcendence.png','Превосходство'),R('Sorcery/GatheringStorm/GatheringStorm.png','Шторм')],
    champs:['Veigar','Xerath','Syndra'],spike:'Поке на дистанции',tip:'Для дальнобойных магов на скилл-шотах.'},
  grasp:{name:'Хватка бессмертных',cat:'Доблесть',color:'#a1d586',icon:PERK+'Resolve/GraspOfTheUndying/GraspOfTheUndying.png',
    desc:'Раз в ~4 сек в бою следующая атака бьёт по % макс. HP, лечит и даёт перм. HP.',
    slots:[R('Resolve/Demolish/Demolish.png','Снос'),R('Resolve/SecondWind/SecondWind.png','Второе дыхание'),R('Resolve/Overgrowth/Overgrowth.png','Разрастание')],
    champs:['Malphite','Sett','Ornn'],spike:'Топлейн-танки',tip:'Для танков-топов с автоатаками в лейне.'},
  darkharvest:{name:'Жатва тьмы',cat:'Доминирование',color:'#d44242',icon:PERK+'Domination/DarkHarvest/DarkHarvest.png',
    desc:'Поражение чемпиона с HP <50% наносит доп. урон и копит стаки навсегда.',
    slots:[R('Domination/SuddenImpact/SuddenImpact.png','Внезапный удар'),R('Domination/ZombieWard/ZombieWard.png','Вард-зомби'),R('Domination/UltimateHunter/UltimateHunter.png','Охотник за ультой')],
    champs:['Veigar','Thresh','Senna'],spike:'Скейл (стаки в лейте)',tip:'Для скейл-чемпов: чем дольше игра, тем больнее.'}
};
var RUNE_ORDER=Object.keys(RUNES);

/* ── нормализованная сущность (предмет/руна) ── */
function compMap(comp){ return comp.map(function(c){ return {icon:compImg(c.id),name:c.name}; }); }
function entOfItem(it){
  return { kind:'item', name:it.name, icon:wfUrl(it.slug), catLabel:it.cat, catColor:CAT_COLOR[it.cat]||'#0BC4E3',
    cost:it.cost, stats:it.stats, passive:it.passive, comps:compMap(it.comp||[]), champs:it.champs||[],
    spike:it.spike, tip:it.tip, eff:efficiency(it), gold:goldValue(it), pg:it.pg||0 };
}
function entOfRune(r){
  return { kind:'rune', name:r.name, icon:r.icon, catLabel:r.cat, catColor:r.color, cost:null, stats:null,
    passive:r.desc, comps:r.slots.map(function(s){ return {icon:s.icon,name:s.name}; }), champs:r.champs||[],
    spike:r.spike, tip:r.tip, eff:0, gold:0, round:true };
}

/* ════════════════════════════════════════════════════════════════
   Состояние
   ════════════════════════════════════════════════════════════════ */
var DEFAULTS={
  ptype:'item', curItem:'luden', curRune:'electro', open:true, tab:'stats',
  iconSize:'md',                                   // ⚙ ЮЗЕР-настройка размера иконок пикера
  blur:'mid', scrim:'soft', splash:'lux',
  accent:'#0BC4E3', grad2:'#6D3FF5', angle:150, radius:18, density:'normal'
};
var S=Object.assign({},DEFAULTS);
var LS=null, gearOpen=false;

var BLUR_MAP={light:'6px',mid:'10px',strong:'16px',ultra:'24px'};
var SCRIM_MAP={off:0.15,soft:0.35,med:0.55,strong:0.78};
var PAD_MAP={air:'22px',normal:'16px',dense:'11px'};

/* ── дизайн-полоса (для НАС) ── */
var CTRLS=[
  {k:'blur',label:'Сила стекла',type:'seg',opts:[['light','Лёгк'],['mid','Сред'],['strong','Сильн'],['ultra','Экстр']]},
  {k:'scrim',label:'Затемнение фона',type:'seg',opts:[['off','Нет'],['soft','Слабо'],['med','Средн'],['strong','Сильн']]},
  {k:'splash',label:'Фон страницы (за стеклом)',type:'seg',opts:SPLASHES},
  {k:'accent',label:'Акцент',type:'color',sw:['#0BC4E3','#C89B3C','#8b5cf6','#2ecc71','#e74c3c','#ff5fa2']},
  {k:'grad2',label:'Градиент 2',type:'color',sw:['#6D3FF5','#011520','#010A13','#0094cc','#e74c3c']},
  {k:'angle',label:'Угол',type:'range',min:0,max:360,step:5,unit:'°'},
  {k:'radius',label:'Скругление',type:'range',min:0,max:34,step:2,unit:'px'},
  {k:'density',label:'Плотность',type:'seg',opts:[['air','Просторно'],['normal','Средне'],['dense','Плотно']]}
];

function buildSettings(){
  var box=document.getElementById('settings');
  box.innerHTML=CTRLS.map(function(c){
    var inner='';
    if(c.type==='seg'){
      inner='<div class="seg">'+c.opts.map(function(o){
        return '<button data-k="'+c.k+'" data-o="'+o[0]+'" class="'+(S[c.k]===o[0]?'on':'')+'">'+o[1]+'</button>';
      }).join('')+'</div>';
    } else if(c.type==='color'){
      inner='<div class="color-row"><input type="color" data-k="'+c.k+'" value="'+S[c.k]+'">'+
        '<div class="swatches">'+(c.sw||[]).map(function(sw){
          return '<span class="swatch" data-k="'+c.k+'" data-sw="'+sw+'" style="background:'+sw+'"></span>';
        }).join('')+'</div></div>';
    } else if(c.type==='range'){
      inner='<input type="range" data-k="'+c.k+'" min="'+c.min+'" max="'+c.max+'" step="'+c.step+'" value="'+S[c.k]+'">';
    }
    var val=c.type==='range'?'<span class="ctrl-val" id="val-'+c.k+'">'+S[c.k]+(c.unit||'')+'</span>':'';
    return '<div class="ctrl"><div class="ctrl-label">'+c.label+val+'</div>'+inner+'</div>';
  }).join('');
  box.querySelectorAll('.seg button[data-k]').forEach(function(b){
    b.onclick=function(){ S[b.dataset.k]=b.dataset.o; buildSettings(); render(); };
  });
  box.querySelectorAll('input[type=color]').forEach(function(inp){
    inp.oninput=function(){ S[inp.dataset.k]=inp.value; applyVars(); };
  });
  box.querySelectorAll('.swatch').forEach(function(sw){
    sw.onclick=function(){ S[sw.dataset.k]=sw.dataset.sw; buildSettings(); applyVars(); };
  });
  box.querySelectorAll('input[type=range]').forEach(function(inp){
    inp.oninput=function(){
      S[inp.dataset.k]=+inp.value;
      var c=CTRLS.find(function(x){return x.k===inp.dataset.k;})||{};
      var badge=document.getElementById('val-'+inp.dataset.k); if(badge) badge.textContent=inp.value+(c.unit||'');
      applyVars();
    };
  });
}

function applyVars(){
  var r=document.documentElement.style;
  r.setProperty('--accent',S.accent); r.setProperty('--grad2',S.grad2);
  r.setProperty('--angle',S.angle+'deg'); r.setProperty('--radius',S.radius+'px');
  r.setProperty('--blur',BLUR_MAP[S.blur]||'10px');
  r.setProperty('--scrim',String(SCRIM_MAP[S.scrim]!=null?SCRIM_MAP[S.scrim]:0.55));
  r.setProperty('--pad',PAD_MAP[S.density]||'16px');
  var bg=document.getElementById('labBg');
  if(bg) bg.style.backgroundImage='linear-gradient(rgba(1,10,19,var(--scrim)),rgba(1,10,19,var(--scrim))),url('+splashUrl(S.splash)+')';
}

/* ════════════════════════════════════════════════════════════════
   Куски карточки
   ════════════════════════════════════════════════════════════════ */
function catTag(e){ return '<span class="ic-cat" style="--cc:'+e.catColor+'">'+e.catLabel+'</span>'; }
function costTag(e){ return e.cost?'<span class="ic-cost">🪙 '+e.cost+'</span>':''; }
function iconTag(e,cls){ return '<img class="ic-img '+(cls||'')+(e.round?' round':'')+'" src="'+e.icon+'" alt="" loading="lazy" onerror="this.classList.add(\'miss\');this.removeAttribute(\'src\')">'; }
function statsHTML(e){
  if(!e.stats) return '';
  return '<div class="ic-stats">'+e.stats.map(function(s){
    return '<div class="ic-stat"><span class="sl">'+STAT[s[0]][0]+' '+STAT[s[0]][1]+'</span><span class="sv">'+statStr(s[0],s[1])+'</span></div>';
  }).join('')+'</div>';
}
function passiveHTML(e){
  if(!e.passive) return '';
  return '<div class="ic-passive"><span class="ic-ptag">'+(e.kind==='rune'?'Эффект':'Пассив')+'</span>'+e.passive+'</div>';
}
function tabDefs(e){
  return e.kind==='rune'
    ? [['stats','Эффект'],['build','Дерево руны'],['champs','Кому брать']]
    : [['stats','Характеристики'],['build','Из чего'],['champs','Кому брать + золото']];
}
function tabPane(e){
  if(S.tab==='build')  return buildPane(e);
  if(S.tab==='champs') return champsPane(e);
  return statsHTML(e)+passiveHTML(e);
}
function buildPane(e){
  if(!e.comps||!e.comps.length) return '<div class="ic-empty">нет данных о сборке</div>';
  if(e.kind==='rune'){
    return '<div class="ic-runetree"><div class="ic-rt-h" style="color:'+e.catColor+'">'+e.catLabel+'</div>'+
      e.comps.map(function(c){return '<div class="ic-rt-row"><img src="'+c.icon+'" onerror="this.style.visibility=\'hidden\'"><span>'+c.name+'</span></div>';}).join('')+'</div>';
  }
  var parts=e.comps.map(function(c,i){
    return (i?'<div class="ic-bt-plus">+</div>':'')+
      '<div class="ic-bt-comp"><img src="'+c.icon+'" onerror="this.style.visibility=\'hidden\'"><span>'+c.name+'</span></div>';
  }).join('');
  return '<div class="ic-buildtree">'+parts+'<div class="ic-bt-eq">=</div>'+
    '<div class="ic-bt-comp result"><img src="'+e.icon+'" onerror="this.style.opacity=.2"><span>'+e.name+'</span></div></div>'+
    '<div class="ic-bt-cost">💰 Полная стоимость: <b>'+(e.cost||0)+'</b> зол.</div>';
}
function champsPane(e){
  var champs = (e.champs&&e.champs.length)
    ? '<div class="ic-rblock"><span class="ic-rlbl">👤 Кому брать</span><div class="ic-champs">'+
        e.champs.map(function(k){return '<img src="'+champIcon(k)+'" alt="'+k+'" title="'+k+'" onerror="this.style.opacity=.2">';}).join('')+'</div></div>'
    : '';
  var spike = e.spike?'<div class="ic-rblock"><span class="ic-rlbl">🔥 Спайк</span><span class="ic-rtext">'+e.spike+'</span></div>':'';
  var tip   = e.tip?'<div class="ic-rblock"><span class="ic-rlbl">💡 Когда брать</span><span class="ic-rtext">'+e.tip+'</span></div>':'';
  var eff='';
  if(e.kind==='item'&&e.cost){
    var rows=e.stats.map(function(s){ var g=Math.round((GOLD[s[0]]||0)*s[1]);
      return '<div class="ic-effrow"><span>'+STAT[s[0]][0]+' '+statStr(s[0],s[1])+' '+STAT[s[0]][1]+'</span><b>'+(g?g+' зол':'—')+'</b></div>';
    }).join('');
    if(e.pg) rows+='<div class="ic-effrow passive"><span>✨ Пассив / эффект <i>(оценка)</i></span><b>'+e.pg+' зол</b></div>';
    var totalGold=e.gold+(e.pg||0), effTot=Math.round(totalGold/e.cost*100);
    var pct=Math.min(140,effTot), col=effTot>=100?'#2ecc71':effTot>=85?'#f1c40f':'#e8820a';
    eff='<div class="ic-rblock"><span class="ic-rlbl">💰 Золотоэффективность</span>'+
      '<div class="ic-effchips"><span class="ic-effchip">по статам <b>'+e.eff+'%</b></span>'+
        '<span class="ic-effchip total" style="border-color:'+col+'">с пассивом <b style="color:'+col+'">'+effTot+'%</b></span></div>'+
      '<div class="ic-effrows">'+rows+'</div>'+
      '<div class="ic-effbar"><i style="width:'+(pct/140*100)+'%;background:'+col+'"></i></div>'+
      '<div class="ic-effsub">статы '+e.gold+' + пассив '+(e.pg||0)+' = '+totalGold+' зол · предмет '+e.cost+' зол'+
        '<br>золото по базовым предметам Wild Rift (500 зол) · цена пассива = экспертная оценка</div></div>';
  }
  var body=champs+eff+spike+tip;
  return '<div class="ic-rich">'+(body||'<div class="ic-empty">нет данных</div>')+'</div>';
}
function cardHTML(e){
  var tabs=tabDefs(e);
  if(!tabs.some(function(t){return t[0]===S.tab;})) S.tab='stats';
  var bar=tabs.map(function(t){ return '<button class="ic-tab'+(S.tab===t[0]?' on':'')+'" data-tab="'+t[0]+'">'+t[1]+'</button>'; }).join('');
  return '<div class="ic-card kind-'+e.kind+'" id="icCard" style="--cc:'+e.catColor+'">'+
    '<div class="ic-cardhead">'+iconTag(e,'ic-headicon')+
      '<div class="ic-headmeta"><div class="ic-namerow">'+catTag(e)+costTag(e)+'</div>'+
      '<div class="ic-name">'+e.name+'</div></div></div>'+
    '<div class="ic-tabs">'+bar+'</div>'+
    '<div class="ic-tabpane">'+tabPane(e)+'</div>'+
  '</div>';
}

/* ════════════════════════════════════════════════════════════════
   ПИКЕР (сетка иконок) → клик открывает карточку
   ════════════════════════════════════════════════════════════════ */
function pickerHTML(){
  if(S.ptype==='rune'){
    return RUNE_ORDER.map(function(k){ var r=RUNES[k];
      return '<button class="ic-pcell rune'+(S.open&&S.curRune===k?' on':'')+'" data-open="'+k+'" title="'+r.name+'">'+
        '<img src="'+r.icon+'" alt="" loading="lazy" onerror="this.style.opacity=.2">'+
        '<span class="pc-name">'+r.name+'</span></button>';
    }).join('');
  }
  return ITEM_ORDER.map(function(k){ var it=ITEMS[k];
    return '<button class="ic-pcell'+(S.open&&S.curItem===k?' on':'')+'" data-open="'+k+'" title="'+it.name+'">'+
      '<img src="'+wfUrl(it.slug)+'" alt="" loading="lazy" onerror="this.style.opacity=.2">'+
      '<i class="pc-cat" style="background:'+(CAT_COLOR[it.cat]||'#0BC4E3')+'"></i>'+
      '<span class="pc-name">'+it.name+'</span></button>';
  }).join('');
}
function gearPopHTML(){
  if(!gearOpen) return '';
  var sizes=[['sm','Маленькие'],['md','Средние'],['lg','Крупные']];
  return '<div class="ic-gearpop glassy" id="icGearPop">'+
    '<div class="gp-h">⚙ Настройки</div>'+
    '<div class="gp-row"><span class="gp-lbl">Размер иконок</span>'+
      '<div class="seg gp-seg">'+sizes.map(function(o){return '<button data-size="'+o[0]+'" class="'+(S.iconSize===o[0]?'on':'')+'">'+o[1]+'</button>';}).join('')+'</div></div>'+
  '</div>';
}
function overlayHTML(){
  if(!S.open) return '';
  var e = S.ptype==='rune' ? entOfRune(RUNES[S.curRune]||RUNES.electro) : entOfItem(ITEMS[S.curItem]||ITEMS.luden);
  return '<div class="ic-overlay" id="icOverlay"><div class="ic-ovback" data-close="1"></div>'+
    '<div class="ic-cardwrap">'+cardHTML(e)+'<button class="ic-close" data-close="1" title="Закрыть">✕</button></div></div>';
}
function modalHTML(){
  return '<div class="ic-modal glassy">'+
    '<div class="ic-modal-head">'+
      '<div class="ic-ptoggle">'+
        '<button data-ptype="item" class="'+(S.ptype==='item'?'on':'')+'">Предметы</button>'+
        '<button data-ptype="rune" class="'+(S.ptype==='rune'?'on':'')+'">Руны</button>'+
      '</div>'+
      '<button class="ic-gear" id="icGear" title="Настройки размера">⚙</button>'+
    '</div>'+
    gearPopHTML()+
    '<div class="ic-picker size-'+S.iconSize+'">'+pickerHTML()+'</div>'+
    overlayHTML()+
  '</div>';
}

function render(){
  applyVars();
  document.getElementById('stageInner').innerHTML=modalHTML();
  wire();
}
function wire(){
  var host=document.getElementById('stageInner');
  host.querySelectorAll('[data-ptype]').forEach(function(b){ b.onclick=function(){ S.ptype=b.dataset.ptype; S.open=false; render(); }; });
  host.querySelectorAll('[data-open]').forEach(function(b){ b.onclick=function(){
    if(S.ptype==='rune') S.curRune=b.dataset.open; else S.curItem=b.dataset.open;
    S.open=true; S.tab='stats'; render();
  };});
  host.querySelectorAll('[data-close]').forEach(function(b){ b.onclick=function(){ S.open=false; render(); }; });
  host.querySelectorAll('[data-tab]').forEach(function(b){ b.onclick=function(){ S.tab=b.dataset.tab; render(); }; });
  var gear=document.getElementById('icGear'); if(gear) gear.onclick=function(){ gearOpen=!gearOpen; render(); };
  host.querySelectorAll('[data-size]').forEach(function(b){ b.onclick=function(){ S.iconSize=b.dataset.size; render(); }; });
}

/* ── сворачивание полосы + сброс ── */
document.getElementById('toggleBtn').onclick=function(){
  var s=document.getElementById('settings'); s.classList.toggle('settings-min');
  this.textContent=s.classList.contains('settings-min')?'▼ Развернуть настройки':'▲ Свернуть настройки';
};
document.getElementById('resetBtn').onclick=function(){
  S=Object.assign({},DEFAULTS); gearOpen=false; if(LS) LS.clearSaved(); buildSettings(); render();
};

function start(){
  buildSettings(); render();
  if(window.LabSettings){
    LS=LabSettings.attach({ id:'item-card', defaults:DEFAULTS, mount:'#labTools',
      getState:function(){ return S; },
      apply:function(st){ S=Object.assign({},DEFAULTS,st); buildSettings(); render(); } });
  }
}
start();

})();
