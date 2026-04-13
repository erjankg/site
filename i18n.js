// ═══════════════════════════════════════════
// Wild Rift Stats — i18n (RU/EN)
// ═══════════════════════════════════════════
(function(){
var _lang = localStorage.getItem('wr_lang') || 'ru';

// ═══ ITEM NAME MAP (tooltip name → EN) ═══
var _itemName = {
'Чёрный тесак':'Black Cleaver','Клинок Погибшего Короля':'Blade of the Ruined King',
'Кровожадный':'Bloodthirster','Цепной меч в стиле хемпанк':'Chempunk Chainsword',
'Танец смерти':"Death's Dance",'Божественный Разрушитель':'Divine Sunderer',
'Сумеречный клинок Драктарра':'Duskblade of Draktharr','Затмение':'Eclipse',
'Край ночи':'Edge of Night','Похититель Сущности':'Essence Reaver',
'Экспериментальная Гексплатина':'Experimental Hexplate','Ангел-хранитель':'Guardian Angel',
'Клинок ярости Гинсу':"Guinsoo's Rageblade",'Разрушитель корпуса':'Hullbreaker',
'Бессмертный Щитовой Лук':'Immortal Shieldbow','Грань Бесконечности':'Infinity Edge',
'Убийца Кракена':'Kraken Slayer','Магнитный бластер':'Magnetic Blaster',
'Манамуне':'Manamune','Пасть Мальмортиуса':'Maw of Malmortius',
'Смертельное напоминание':'Mortal Reminder','Мурамана':'Muramana',
'Зуб Нашора':"Nashor's Tooth",'Навори Квикблейдс':'Navori Quickblades',
'Призрачный Танцор':'Phantom Dancer','Ураган Рунаана':"Runaan's Hurricane",
'Змеиный клык':"Serpent's Fang",'Обида Серильды':"Serylda's Grudge",
'Передача души':'Soul Transfer','Копьё Сёдзина':'Spear of Shojin',
'Штормрейзор':'Stormrazor','Терминал':'Terminus','Коллекционер':'The Collector',
'Тринити Форс':'Trinity Force','Конец остроумия':"Wit's End",
'Призрачный клинок Йомуу':"Youmuu's Ghostblade",
'Мучения Лиандри':"Liandry's Torment",'Разломовластитель':'Riftmaker',
'Смертельная поганка Рабадона':"Rabadon's Deathcap",'Посох пустоты':'Void Staff',
'Эхо Людена':"Luden's Echo",'Корона Разрушенной Королевы':'Crown of the Shattered Queen',
'Космический привод':'Cosmic Drive','Посох Архангела':"Archangel's Staff",
'Мореллономикон':'Morellonomicon','Лич Бэйн':'Lich Bane',
'Хрустальный скипетр Рилая':"Rylai's Crystal Scepter",
'Объятия Серафима':"Seraph's Embrace",'Жезл веков':'Rod of Ages',
'Зловредность':'Malignance','Горизонт фокус':'Horizon Focus',
'Сфера Бесконечности':'Infinity Orb','Похититель душ Меджая':"Mejai's Soulstealer",
'Пробуждённый Похититель Душ':'Awakened Soulstealer','Бандл Фэнтези':'Bandle Fantasy',
'Трезубец Океаниды':"Oceanid's Trident",'Психический проектор':'Psychic Projector',
'Шипованный доспех':'Thornmail','Эгида Солнечного огня':'Sunfire Aegis',
'Замороженное сердце':'Frozen Heart','Броня мертвеца':"Dead Man's Plate",
'Сила природы':'Force of Nature','Рассветная завеса':'Dawnshroud',
'Фимбулвинтер':'Fimbulwinter','Сердце стали':'Heartsteel',
'Кровавая почта Повелителя':"Overlord's Bloodmail",'Сияющая Добродетель':'Radiant Virtue',
'Стерак':"Sterak's Gage",'Титаник Гидра':'Titanic Hydra',
'Вестник зимы':"Winter's Approach",'Ловушка йордла':'Yordle Trap',
'Двойная стража Амаранта':"Amaranth's Twinguard",'Каэник Рукерн':'Kaenic Rookern',
'Полое сияние':'Hollow Radiance',
'Пылающая кадильница':'Ardent Censer','Гармоническое эхо':'Harmonic Echo',
'Имперский мандат':'Imperial Mandate','Рыцарский обет':"Knight's Vow",
'Искупление':'Redemption','Персонал Текучих Вод':'Staff of Flowing Water',
'Медальон Железной Солари':'Locket of the Iron Solari',
'Реликвийный щит':'Relic Shield','Спектральный серп':'Spectral Sickle',
'Берцы берсерка':"Berserker's Greaves",'Ртутные сапоги воина':"Mercury's Treads",
'Ботинки стойкости':'Plated Steelcaps','Сапоги ясности':'Ionian Boots of Lucidity',
'Ботинки маны':'Boots of Mana','Обжорские сапоги':'Gluttonous Greaves',
'Гейлфорс':'Galeforce','Великолепное очарование':'Glorious',
'Горедринкер':'Goredrinker','Зачарование медальона':'Locket Enchant',
'Проторемень':'Protobelt','Ртутное зачарование':'Quicksilver',
'Зачарование стазиса':'Stasis','Каменная гаргулья':'Gargoyle',
'Костолом':'Stridebreaker','Зачарование Баньши':"Banshee's Veil"
};

// ═══ ALT TEXT OVERRIDES (when img alt differs from tooltip name) ═══
var _altName = {
'Смертная шапка Рабадона':"Rabadon's Deathcap",'Эхо Лудена':"Luden's Echo",
'Корона разбитой королевы':'Crown of the Shattered Queen',
'Космический разгон':'Cosmic Drive','Посох архангела':"Archangel's Staff",
'Морелломиконом':'Morellonomicon','Лихорадка личей':'Lich Bane',
'Хрустальный скипетр Рилай':"Rylai's Crystal Scepter",
'Ледяное сердце':'Frozen Heart','Плита мертвеца':"Dead Man's Plate",
'Двойная защита Амарант':"Amaranth's Twinguard"
};

// ═══ RUNE NAME MAP ═══
var _runeName = {
'Электрокут':'Electrocute','Пушинка':'Summon Aery','Завоеватель':'Conqueror',
'Лавирование':'Fleet Footwork','Хватка нежити':'Grasp of the Undying',
'Афтершок':'Aftershock','Смертельный темп':'Lethal Tempo',
'Первый удар':'First Strike','Ледяной нарост':'Glacial Augment',
'Комета':'Arcane Comet','Тёмная жатва':'Dark Harvest','Фазовый рывок':'Phase Rush',
'Усиление':'Empowerment','Цепная атака':'Chain Assault',
'Внезапный удар':'Sudden Impact','Психическая волна':'Psychic Wave',
'Ожог':'Scorch','Удар щитом':'Shield Bash','Цепной штурм':'Chain Storm',
'Дешёвый удар':'Cheap Shot','Усиленная атака':'Empowered Attack',
'Тиран':'Tyrant','Коллекция глаз':'Eyeball Collection',
'Искусный охотник':'Ingenious Hunter','Зомби-вард':'Zombie Ward',
'Жестокий удар':'Brutal','Надвигающаяся буря':'Gathering Storm',
'Триумф':'Triumph','Удар милосердия':'Coup de Grace',
'Убийца Великанов':'Giant Slayer','Последний бой':'Last Stand',
'Легенда: Скорость':'Legend: Alacrity','Легенда: Родословная':'Legend: Bloodline',
'Отвага Колосса':'Courage of the Colossus','Источник жизни':'Font of Life',
'Аннулирующий шар':'Nullifying Orb','Непоколебимый':'Conditioning',
'Костяная пластина':'Bone Plating','Верность':'Loyalty',
'Второе дыхание':'Second Wind','Чрезмерный рост':'Overgrowth',
'Упорство':'Tenacity','Оживить':'Revitalize',
'Снос':'Demolish','Хексфлэш':'Hexflash','Создание предметов':'Item Crafting',
'Сладкоежка':'Sweet Tooth','Аксиома Арканист':'Axiom Arcanist',
'Скорость':'Celerity','Рынок будущего':"Future's Market",
'Трансцендентность':'Transcendence','Банка семян':'Ixtali Seedjar',
'Браслет маны':'Manaflow Band','Плащ Нимбуса':'Nimbus Cloak'
};

// ═══ RUNE TYPE MAP ═══
var _runeType = {
'Ключевая':'Keystone','Доминация':'Domination','Точность':'Precision',
'Стойкость':'Resolve','Вдохновение':'Inspiration'
};

// ═══ STAT TERM REPLACEMENTS (ordered: longer first) ═══
var _statTerms = [
['Сила атаки','Attack Damage'],['Сила умений','Ability Power'],
['Ускорение умений','Ability Haste'],['Уск. Ум.','Ability Haste'],
['Уск. Умений','Ability Haste'],['Скорость атаки','Attack Speed'],
['Шанс крита','Crit Chance'],['Сопротивление магии','Magic Resist'],
['Маг. Проникновение','Magic Pen'],['Маг. Проникн.','Magic Pen'],
['Пробиваемость брони','Armor Pen'],['Исцеление и Защита','Heal & Shield Power'],
['Физический вампир','Physical Vamp'],['Омни Вамп','Omnivamp'],
['Восстановление HP','HP Regen'],['Здоровье','Health'],['Броня','Armor'],
['Магрез','Magic Resist'],['Мана','Mana'],['Скорость','MS']
];

// ═══ GAME TERM REPLACEMENTS FOR DESCRIPTIONS ═══
var _gameTerms = [
// multi-word phrases first
['Тяжкие раны','Grievous Wounds'],['Тяжких ран','Grievous Wounds'],
['базовые атаки','basic attacks'],['Базовые атаки','Basic attacks'],
['базовая атака','basic attack'],['Базовая атака','Basic attack'],
['базовых атак','basic attacks'],['базовых ударов','basic attacks'],
['базовыми атаками','basic attacks'],
['вражеским чемпионам','enemy champions'],['вражеских чемпионов','enemy champions'],
['вражескому чемпиону','an enemy champion'],['вражеского чемпиона','an enemy champion'],
['вражеским чемпионом','an enemy champion'],['вражеские чемпионы','enemy champions'],
['физического урона','physical damage'],['физический урон','physical damage'],
['физ. урон','physical damage'],['физ. урона','physical damage'],
['магического урона','magic damage'],['магический урон','magic damage'],
['маг. урон','magic damage'],['маг. урона','magic damage'],
['чистый урон','true damage'],['чистого урона','true damage'],
['адаптивного урона','adaptive damage'],['адаптивный урон','adaptive damage'],
['скорость передвижения','movement speed'],['скорости передвижения','movement speed'],
['максимального здоровья','max health'],['максимальное здоровье','max health'],
['макс. здоровья','max health'],['макс. HP','max HP'],
['текущему здоровью','current health'],['текущего здоровья','current health'],
['текущее здоровье','current health'],['тек. HP','current HP'],
['недостающего здоровья','missing health'],['недостающее здоровье','missing health'],
['недостающего HP','missing HP'],
['бонусного AD','bonus AD'],['бонусный AD','bonus AD'],
['бонусного урона от атаки','bonus AD'],['бонусную силу атаки','bonus AD'],
['базового AD','base AD'],['базовый AD','base AD'],
['бонусной Брони','bonus Armor'],['бонусной брони','bonus Armor'],
['бонусного HP','bonus HP'],['бонусный HP','bonus HP'],
['бонусного сопротивления магии','bonus MR'],
['силы умений','Ability Power'],['силу умений','Ability Power'],
['Сила умений','Ability Power'],
['силы атаки','Attack Damage'],['Сила атаки','Attack Damage'],
['урона от атаки','Attack Damage'],['урон от атаки','Attack Damage'],
['Урона от атаки','Attack Damage'],
['скорость атаки','attack speed'],['скорости атаки','attack speed'],
['Скорость атаки','Attack speed'],
['пробиваемости брони','armor penetration'],['пробивания брони','armor penetration'],
['пробивание брони','armor penetration'],['пробив. брони','armor pen'],
['пробивания магии','magic penetration'],['пробиванию магии','magic penetration'],
['пробивание магии','magic penetration'],
['физического вампиризма','physical vamp'],['физический вампиризм','physical vamp'],
['магического вампиризма','magic vamp'],['магический вампиризм','magic vamp'],
['всестороннего вампиризма','omnivamp'],['всесторонний вампиризм','omnivamp'],
['максимального запаса маны','max mana'],['максимальным количеством','maximum number'],
['Время восстановления','Cooldown'],['Время перезарядки','Cooldown'],
['время восстановления','cooldown'],['время перезарядки','cooldown'],
['перезарядка','cooldown'],['Перезарядка','Cooldown'],
['ускорение умений','Ability Haste'],['ускорения умений','Ability Haste'],
['ускорения способностей','Ability Haste'],['ускорение способностей','Ability Haste'],
['ускорение перезарядки способностей','Ability Haste'],
['ускорения перезарядки умений','Ability Haste'],
['в течение','for'],['в течении','for'],
['в зависимости от уровня','based on level'],
['зависит от уровня','scales with level'],
['при повышении уровня','as you level up'],
['суммируется','stacks'],['суммируясь','stacking'],
['при попадании','on hit'],['при атаке','on attack'],
['ближний бой','melee'],['ближнего боя','melee'],
['дальний бой','ranged'],['дальнего боя','ranged'],
['дальнем бою','ranged'],['ближнем бою','melee'],
['чемпионам','champions'],['чемпионов','champions'],
['чемпиону','champion'],['чемпиона','champion'],['чемпионы','champions'],
['чемпион','champion'],
['монстрам','monsters'],['монстров','monsters'],['монстрами','monsters'],
['миньонам','minions'],['миньонов','minions'],
['строениям','structures'],['строения','structures'],
['восстанавливает','restores'],['восстанавливаете','you restore'],
['восстановление','restoration'],['восстанавливайте','restore'],
['замедление','slow'],['замедляет','slows'],['замедлению','slow'],
['замедлится','is slowed'],['замедлённых','slowed'],
['обездвиживание','immobilize'],['обездвижив','immobiliz'],
['обездвиженности','immobilized'],['обездвиживании','immobilized'],
['Обездвиживание','Immobilizing'],
['исцеление','healing'],['Исцеление','Healing'],
['исцеляет','heals'],['исцеляете','you heal'],
['Нанесение урона','Dealing damage'],['нанесение урона','dealing damage'],
['наносит','deals'],['нанося','dealing'],['наносят','deal'],
['Получение урона','Taking damage'],['получение урона','taking damage'],
['получает','gains'],['получаете','you gain'],['получаешь','you gain'],
['Получите','Gain'],['получите','gain'],['получи','gain'],
['Получает','Gains'],['Получаете','You gain'],
['увеличивает','increases'],['увеличивается','is increased'],
['увеличивающегося','scaling up'],['увеличиваются','are increased'],
['снижает','reduces'],['снижается','is reduced'],['снижение','reduction'],
['снижении','reduction'],['снижена','reduced'],
['уменьшает','reduces'],['уменьшается','is reduced'],
['расходует','consumes'],['расходуются','are consumed'],
['расходуемых','consumed'],
['применение','casting'],['применения','casting'],
['способностями','abilities'],['способности','abilities'],
['способность','ability'],['способностей','abilities'],['способностям','abilities'],
['ультимативной способности','ultimate ability'],
['ультимативную способность','ultimate ability'],
['ультимейта','ultimate'],
['Пассивное умение','Passive'],
['заклинания призывателя','summoner spell'],['заклинание призывателя','summoner spell'],
['заклинаний призывателя','summoner spells'],
['Нанесение','Dealing'],
['секунд','s'],['секунды','s'],['секунду','s'],
['единиц','units'],['единицы','units'],
['каждую секунду','per second'],['каждые','every'],['каждая','every'],['каждый','every'],
['навсегда','permanently'],['дополнительный','bonus'],['дополнительного','bonus'],
['дополнительно','additionally'],['дополнительн','bonus'],
['в виде','as'],['в радиусе','within'],
['поблизости','nearby'],['рядом','nearby'],['вокруг','around'],
['против','against'],['между','between'],['после','after'],
['перед','before'],['через','after'],['более','more than'],
['менее','less than'],['ниже','below'],['выше','above'],
['также','also'],['только','only'],['всего','total'],
['минимум','minimum'],['максимум','maximum'],['макс.','max'],
['эффект','effect'],['эффекты','effects'],
['Активация','Activating'],['активация','activating'],
['срабатывает','triggers'],['Срабатывает','Triggers'],
['Убийство','Killing'],['убийство','killing'],['убийства','kill'],
['Уничтожение','Destroying'],['уничтожении','destroying'],
['уничтожения','destruction'],
['щит','shield'],['щита','shield'],['щитов','shields'],['щиты','shields'],
['урона','damage'],['урон','damage'],['урону','damage'],
['здоровья','health'],['здоровье','health'],
['брони','armor'],['броня','armor'],['Броня','Armor'],['броню','armor'],
['атак','attacks'],['атаки','attacks'],['атака','attack'],['атакой','attack'],
['удар','hit'],['удары','hits'],['ударов','hits'],['ударами','hits'],
['бонус','bonus'],['бонуса','bonus'],['бонусы','bonuses'],
['стак','stack'],['стака','stacks'],['стаков','stacks'],['стаки','stacks'],
['заряд','charge'],['заряда','charges'],['зарядов','charges'],['заряды','charges'],
['зарядах','charges'],['зарядами','charges'],
['маны','mana'],['мана','mana'],['ману','mana'],
['энергии','energy'],['энергию','energy'],
['скорости','speed'],['скорость','speed'],
['золота','gold'],['золотых','gold'],['золото','gold'],
['уровня','level'],['уровне','level'],['уровень','level'],
['Уровень','Level'],['уровнем','level'],
['минут','min'],['минуты','min'],
['вражеский','enemy'],['вражеского','enemy'],['вражескому','enemy'],
['вражеским','enemy'],['вражеских','enemy'],['вражескими','enemy'],
['вражеские','enemy'],['вражескую','enemy'],
['союзника','ally'],['союзником','ally'],['союзнику','ally'],
['союзники','allies'],['союзников','allies'],['союзникам','allies'],
['союзных','allied'],['союзный','allied'],['союзные','allied'],
['Пока','While'],['пока','while'],
['эпическим монстрам','epic monsters'],['эпических монстров','epic monsters'],
['вампиризма','vamp'],['вампиризм','vamp'],
['Ваши','Your'],['ваши','your'],['Вашей','your'],['вашей','your'],
['Ваша','Your'],['ваша','your'],['Ваш','Your'],['ваш','your'],
['Вы','You'],['вам','you'],['вас','you'],['вами','you'],['вы','you'],
['тебе','you'],['тебя','you'],['твой','your'],['свой','your'],
['себя','yourself'],['себе','yourself'],
['Если','If'],['если','if'],['когда','when'],['Когда','When'],
['При','When'],['при','when'],
['его','their'],['её','their'],['их','their'],['ему','them'],
['раз','time'],['не чаще','at most'],
['не более','at most'],['не менее','at least'],
// cost
[' г¦',' g¦']
];

// ═══ SECTION LABEL TRANSLATIONS ═══
var _sectionLabels = {
'⚔ Физические':'⚔ Physical','🔮 Магические':'🔮 Magic',
'🛡 Защитные':'🛡 Defensive','💛 Поддержка':'💛 Support',
'👟 Ботинки':'👟 Boots','✨ Зачарования ботинок':'✨ Boot Enchantments',
'Можно добавить к любым ботинкам':'Can be added to any boots',
'⭐ ОСНОВНЫЕ РУНЫ':'⭐ KEYSTONE RUNES','🔴 ДОМИНАЦИЯ':'🔴 DOMINATION',
'🟡 ТОЧНОСТЬ':'🟡 PRECISION','🟢 СТОЙКОСТЬ':'🟢 RESOLVE',
'🔵 ВДОХНОВЕНИЕ':'🔵 INSPIRATION'
};

// ═══ HTML TRANSLATIONS (innerHTML) ═══
var _uiHtml = {
'welcome-compare':'Compare <b style="color:#e8820a;">AD</b>, <b style="color:#2ecc71;">HP</b>, <b style="color:#5dade2;">Mana</b>, <b style="color:#f1c40f;">Armor</b> and <b style="color:var(--accent);">MS</b> at any level from 1 to 15.'
};

// ═══ UI STRING TRANSLATIONS ═══
var _ui = {
// Header / level
'УРОВЕНЬ':'LEVEL',
// WinRate
'обновлено 04.04.2026':'updated 04.04.2026','Чемпион':'Champion',
'Данные для этого ранга скоро появятся':'Data for this rank coming soon',
// Search
'🔍 Поиск...':'🔍 Search...','🔍 Поиск чемпиона...':'🔍 Search champion...',
// Calculator
'⚔ Калькулятор урона':'⚔ Damage Calculator',
'🟢 МОЙ ЧЕМПИОН':'🟢 MY CHAMPION','🔴 ЦЕЛЬ':'🔴 TARGET',
'📊 РЕЗУЛЬТАТ':'📊 RESULT','🪆 Манекен':'🪆 Dummy',
'% Проб.':'% Pen','Броня':'Armor','Тек. HP':'Cur. HP',
'Эфф. броня':'Eff. Armor','Снижение урона':'Damage Reduction',
'✅ Нанесено урона':'✅ Damage Dealt',
'🟢 Мой чемпион':'🟢 My champion','🔴 Цель':'🔴 Target',
'Сменить чемпиона':'Change champion',
// Items modal
'📦 Предметы Wild Rift':'📦 Wild Rift Items',
'🧮 Калькулятор':'🧮 Calculator',
// Runes modal
'💎 Руны Wild Rift':'💎 Wild Rift Runes',
'Наведи — описание':'Hover for description',
'💎 Руна':'💎 Rune',
// Sidebar
'Инструменты':'Tools','Чемпионы':'Champions','Калькулятор урона':'Damage Calculator',
'Предметы':'Items','Руны':'Runes','Драфт-помощник':'Draft Assistant',
'Тир-лист':'Tier List','Сообщество':'Community','Чат':'Chat',
'справочник чемпионов':'champion reference','Поддержать проект':'Support Project',
'💎 Поддержать проект':'💎 Support Project',
// Welcome
'📊 Что это?':'📊 What is this?',
'Справочник базовых характеристик всех чемпионов Wild Rift.':'A reference for base stats of all Wild Rift champions.',
'🎮 Как пользоваться?':'🎮 How to use?',
'Понятно, начать →':'Got it, start →',
// Draft
'📋 Драфт-помощник':'📋 Draft Assistant',
'Выбери чемпиона':'Choose a champion',
'🔵 МОЯ КОМАНДА':'🔵 MY TEAM','🔴 ПРОТИВНИКИ':'🔴 ENEMIES',
// Champion detail
'⚔ Чемпион':'⚔ Champion','Информация о чемпионе':'Champion information',
'Скоро будет!':'Coming soon!','👥 Чемпионы':'👥 Champions',
// Tier lists
'✏ Изменить':'✏ Edit','✓ Готово':'✓ Done','Тир':'Tier',
'support-text':'Guys, the site is completely free for everyone.<br><br>I\'d be very grateful for your support — it\'s a huge motivation for me to keep developing the project.<br><br>Plans: add HP regen, winrate/pickrate, mana regen stats, a special column for junglers: full clear timer, gank potential, difficulty, and champion impact, champion images, and keep the site regularly updated.',
'🏆 Тир-листы':'🏆 Tier Lists',
'Тир-лист чемпионов':'Champion Tier List','Лучшие чемпы по ролям':'Best champions by role',
'Тир-лист предметов':'Item Tier List','Самые эффективные предметы':'Most effective items',
'Тир-лист рун':'Rune Tier List','Топовые руны мета':'Top meta runes',
// Chat
'💬 Чат':'💬 Chat',
'👥 Пользователи':'👥 Users','Загрузка...':'Loading...',
'Написать сообщение...':'Write a message...',
'Войди через Google чтобы писать в чат':'Sign in with Google to chat',
'🎬 Инфл.':'🎬 Infl.',
// Profile
'👤 Мой профиль':'👤 My Profile','Профиль':'Profile','📋 Данные':'📋 Data',
'ОСНОВНАЯ РОЛЬ':'MAIN ROLE','МАКСИМАЛЬНЫЙ РАНГ':'MAX RANK',
'СОЦИАЛЬНЫЕ СЕТИ':'SOCIAL NETWORKS','✓ Сохранить':'✓ Save',
'Добавить соцсеть':'Add social network',
'Назад':'Back','Перейти →':'Open →',
// Item calc menu
'🧮 Калькулятор предметов':'🧮 Item Calculator',
'Шипованный доспех':'Thornmail','Отражённый маг. урон':'Reflected magic damage',
'Клинок Погибшего Короля':'Blade of the Ruined King',
'% HP врага + симулятор боя':'% enemy HP + combat sim',
'Эгида Солнечного огня':'Sunfire Aegis','Маг. урон/с':'Magic dmg/s',
'Мучения Лиандри':"Liandry's Torment",'% макс. HP ожог':'% max HP burn',
'Божественный Разрушитель':'Divine Sunderer','Физ. удар + хил':'Phys hit + heal',
// Item sub calc
'⚔ Ближний':'⚔ Melee','🏹 Дальний':'🏹 Ranged',
'🟢 МОИ ДАННЫЕ':'🟢 MY DATA','🔴 ДАННЫЕ ВРАГА':'🔴 ENEMY DATA',
'% УРОНА ОТ МАКС HP / СЕК':'% DMG FROM MAX HP / SEC',
'⚔ Ударить':'⚔ Hit','↺ Сброс':'↺ Reset',
'💚 Исцеление':'💚 Healing','📦 Предмет':'📦 Item',
'⚔ Выбери чемпиона':'⚔ Choose champion',
'0 ударов':'0 hits',
// Influencers
'🎬 Инфлюенсеры Wild Rift':'🎬 Wild Rift Influencers',
'Данные загружаются из Firebase. Нажми на карточку для подробностей.':'Data loads from Firebase. Click a card for details.',
'Загрузка инфлюенсеров...':'Loading influencers...',
'Пока нет инфлюенсеров':'No influencers yet',
'🏅 ДОСТИЖЕНИЯ':'🏅 ACHIEVEMENTS','🏆 ТИР-ЛИСТ':'🏆 TIER LIST',
'🔴 КОНТР-ПИКИ':'🔴 COUNTER-PICKS','🟢 КОМБО':'🟢 COMBOS',
'Этот инфлюенсер пока не добавил свои тир-листы и контр-пики.':'This influencer hasn\'t added their tier lists and counter-picks yet.',
'← Назад':'← Back','🔗 Открыть канал':'🔗 Open channel',
'Не указана':'Not specified',
// Auth
'Войти через Google':'Sign in with Google','Выйти':'Sign out',
'👤 Мой профиль':'👤 My Profile','🔄 Синхронизировать':'🔄 Sync','🚪 Выйти':'🚪 Sign out',
'Меню':'Menu'
};

// ═══ DYNAMIC JS STRING TRANSLATIONS ═══
var _dyn = {
'Ничего не найдено':'Nothing found',
'Не удалось загрузить данные':'Failed to load data',
'Ошибка: ':'Error: ',
'Нажми «Применить» — данные перепишутся в свои':'Click "Apply" — data will be overwritten',
'Профиль':'Profile',
'Войти через Google':'Sign in with Google',
'уже добавлен':'already added',
'Вставь ссылку на свой ':'Paste your link to ',
'Выбери роль и ранг':'Choose role and rank',
'Выбери роль':'Choose role',
'Выбери ранг':'Choose rank',
'Перейти: ':'Open: ',
'Покинуть сайт?':'Leave site?',
'Перейти на ':'Open ',
'🟢 Онлайн':'🟢 Online',
'⚫ Оффлайн':'⚫ Offline',
'Оффлайн':'Offline',
'Нет пользователей':'No users',
'Войди в аккаунт чтобы писать':'Sign in to write',
'🙈 Игрок скрыл свои данные':'🙈 Player hid their data',
'Суверен':'Sovereign','Челленджер':'Challenger','Грандмастер':'Grandmaster',
'Мастер':'Master','Бриллиант':'Diamond',
'Тир-лист':'Tier List','Контр-пики':'Counter-picks','Комбо':'Combos',
'Свои данные':'Own data',
'👁  Видно всем':'👁  Visible to all','🙈  Скрыто':'🙈  Hidden',
'ВИДИМОСТЬ ДАННЫХ':'DATA VISIBILITY','ИСТОЧНИК ДАННЫХ':'DATA SOURCE',
'Применить':'Apply','Точно?':'Sure?',
'× Удалить':'× Delete','✓ Подтвердить удаление':'✓ Confirm deletion',
'Нажми на пользователя в списке → Скопировать данные, чтобы добавить набор.':'Click a user → Copy data to add a dataset.',
'буквы, цифры, пробел, 3–20 символов':'letters, digits, space, 3–20 characters',
'Введи ник...':'Enter nickname...',
'Минимум 3 символа':'Minimum 3 characters','Максимум 20 символов':'Maximum 20 characters',
'Только буквы, цифры и пробел':'Only letters, digits and spaces',
'✓ Сохранить ник':'✓ Save nickname',
'⏳ Сохраняем...':'⏳ Saving...','✓ Сохранено!':'✓ Saved!',
'✓ Профиль сохранён!':'✓ Profile saved!',
'Ошибка сохранения: ':'Save error: ',
'Firebase не подключён':'Firebase not connected',
'Данные не найдены':'Data not found',
'Данные дефолта не найдены':'Default data not found',
'✓ Дефолт применён — данные ERjanKG скопированы в свои':'✓ Default applied — ERjanKG data copied',
'Ошибка загрузки дефолта: ':'Default load error: ',
'✓ Настройки видимости сохранены':'✓ Visibility settings saved',
'✓ Сохранено':'✓ Saved',
'✓ Активированы свои данные':'✓ Own data activated',
'✓ Активированы данные ':'✓ Activated data from ',
'✓ Ник обновлён!':'✓ Nickname updated!',
'Ссылка должна начинаться с https://':'Link must start with https://',
'Войди в аккаунт':'Sign in',
'Нет доступа к чату. Проверьте Firestore Rules.':'No chat access. Check Firestore Rules.',
'Чат: требуется индекс Firestore. Проверь консоль.':'Chat: Firestore index required. Check console.',
'Ошибка чата: ':'Chat error: ',
'Напиши первым! 💬':'Be the first to write! 💬',
'Ошибка отправки: ':'Send error: ',
'Firebase не загружен. Проверьте подключение к интернету.':'Firebase not loaded. Check your internet connection.',
'Ошибка авторизации: ':'Auth error: ',
'Выйти из аккаунта?':'Sign out?','Данные не потеряются':'Your data will be preserved',
'Сохранено ✓':'Saved ✓','Данные по умолчанию загружены ✓':'Default data loaded ✓',
'Загружено ✓':'Loaded ✓',
'Сначала войдите в аккаунт':'Please sign in first',
'📋 Скопировать данные':'📋 Copy data','✕ Закрыть':'✕ Close',
'Не указана':'Not specified',
' онлайн':' online',
'Моя броня':'My Armor','Мой бонусный HP':'My Bonus HP','МС врага':'Enemy MR',
'Отражённый маг. урон (после МС)':'Reflected magic damage (after MR)',
'Сырой: ':'Raw: ',' после ':' after ',
'% текущего HP врага (физ.)':'% current enemy HP (phys.)',
'Текущий HP цели':'Target current HP','Броня врага':'Enemy Armor',
'% пробив. брони':'% Armor Pen',
'Дальний 7%':'Ranged 7%','Ближний 10%':'Melee 10%',
'Маг. урон/с рядом с врагами':'Magic dmg/s near enemies',
'Стаки (0-4)':'Stacks (0-4)','Уровень врага':'Enemy Level',
'Маг. урон/сек (после МС)':'Magic dmg/sec (after MR)',
'% макс. HP/с маг. ожог (скейлится до 3%)':'% max HP/s magic burn (scales to 3%)',
'Макс HP цели':'Target Max HP',
'Физ. удар + хил':'Phys hit + heal',
'Мой базовый AD':'My Base AD',
'Дальн.':'Ranged','Ближн.':'Melee',
' (после брони)':' (after armor)',
'🟢 БАФФ':'🟢 BUFF','🔴 НЕРФ':'🔴 NERF','🟡 КОРРЕКТИРОВКА':'🟡 ADJUST',
'📝 Патч-нот':'📝 Patch Note','Тип изменения':'Change Type','Описание изменения':'Change Description',
'Версия патча':'Patch Version','Бафф':'Buff','Нерф':'Nerf','Корректировка':'Adjust',
'Патч-нот добавлен!':'Patch note added!','Патч-нот обновлён!':'Patch note updated!','Патч-нот удалён':'Patch note removed',
'Загрузить файл':'Upload File','Загрузка...':'Uploading...','Файл загружен!':'File uploaded!',
'⚙ Настройки лейаута':'⚙ Layout Settings','Десктоп':'Desktop','Мобильный':'Mobile',
'Размер кнопок сайдбара':'Sidebar Button Size','Отступ секций':'Section Spacing',
'Размер шрифта заголовков':'Header Font Size','Настройки сохранены!':'Settings saved!',
'Порядок секций':'Section Order',
'📋 История изменений':'📋 Changelog','⚙ Настройки лейаута':'⚙ Layout Settings',
'🧹 Очистить все патч-ноты':'🧹 Clear All Patch Notes',
'Настройки лейаута':'Layout Settings','Сохранить':'Save',
'Закреплён (нажми чтобы снять)':'Pinned (click to unpin)',
'Нажми чтобы закрепить':'Click to pin',
'нажми для выбора':'click to select',
' за уровень':' per level',' ударов':' hits',
'☠ УБИТ за ':'☠ KILLED in ',
'Все':'All','Физические':'Physical','Магические':'Magic','Защитные':'Defensive',
'Поддержка':'Support','Ботинки':'Boots','Зачарования':'Enchantments',
'Основные':'Keystone','Второстепенные':'Secondary',
'🏆 Тир-лист чемпионов':'🏆 Champion Tier List',
'⚙ Тир-лист предметов':'⚙ Item Tier List',
'✨ Тир-лист рун':'✨ Rune Tier List',
'Тир-лист':'Tier List',
'⚔ СИЛЁН ПРОТИВ':'⚔ STRONG AGAINST','⚔ Силён против':'⚔ Strong against',
'💀 СЛАБ ПРОТИВ':'💀 WEAK AGAINST','💀 Слаб против':'💀 Weak against',
'🤝 КОМБО':'🤝 COMBOS','🤝 Комбо с':'🤝 Combos with',
'Firebase не загружен. Проверьте подключение к интернету.':'Firebase not loaded. Check your internet connection.',
'Ошибка авторизации: ':'Auth error: ',
'Выйти из аккаунта?':'Sign out?','Данные не потеряются':'Your data will be preserved',
'Сначала войдите в аккаунт':'Please sign in first',
'Сохранено ✓':'Saved ✓','Данные по умолчанию загружены ✓':'Default data loaded ✓',
'Загружено ✓':'Loaded ✓',
'Нет доступа к чату. Проверьте Firestore Rules.':'No chat access. Check Firestore Rules.',
'Чат: требуется индекс Firestore. Проверь консоль.':'Chat: Firestore index required. Check console.',
'Ошибка чата: ':'Chat error: ',
'Напиши первым! 💬':'Be the first to write! 💬',
'Аноним':'Anonymous',
'Войди в аккаунт чтобы писать':'Sign in to write',
'Firebase не подключён':'Firebase not connected',
'Ошибка отправки: ':'Send error: ',
'✓ Дефолт применён — данные ERjanKG скопированы в свои':'✓ Default applied — ERjanKG data copied',
'Ошибка загрузки дефолта: ':'Default load error: ',
'ВИДИМОСТЬ ДАННЫХ':'DATA VISIBILITY',
'👁  Видно всем':'👁  Visible to all','🙈  Скрыто':'🙈  Hidden',
'ИСТОЧНИК ДАННЫХ':'DATA SOURCE',
'Свои данные':'Own data','Применить':'Apply','Точно?':'Sure?',
'✓ Настройки видимости сохранены':'✓ Visibility settings saved',
'✓ Сохранено':'✓ Saved',
'✓ Активированы свои данные':'✓ Own data activated',
'✓ Активированы данные ':'✓ Activated data from ',
'× Удалить':'× Delete','✓ Подтвердить удаление':'✓ Confirm deletion',
'Нажми на пользователя в списке → Скопировать данные, чтобы добавить набор.':'Click a user → Copy data to add a dataset.',
'Изменить ник':'Change nickname','Дефолт':'Default','Удар #':'Hit #',
'Неизвестная':'Unknown','Удалить ':'Remove ',
' МС: ':' MR: ','. Тяжкие раны 60% 3с':'. Grievous Wounds 60% 3s',
' → эфф. броня ':' → eff. armor ',' → урон: ':' → damage: ',
'буквы, цифры, пробел, 3–20 символов':'letters, digits, space, 3–20 characters',
'Введи ник...':'Enter nickname...',
'Отмена':'Cancel','✓ Сохранить ник':'✓ Save nickname',
'Минимум 3 символа':'Minimum 3 characters','Максимум 20 символов':'Maximum 20 characters',
'Только буквы, цифры и пробел':'Only letters, digits and spaces',
'✓ Ник обновлён!':'✓ Nickname updated!',
'Добавить соцсеть':'Add social network','Выбери соцсеть':'Choose platform',
'уже добавлен':'already added',
'Вставь ссылку на свой ':'Paste link to your ',
'Добавить':'Add','← Назад':'← Back',
'Ссылка должна начинаться с https://':'Link must start with https://',
'Перейти: ':'Open: ','Покинуть сайт?':'Leave site?','Перейти на ':'Open ',
'Войди в аккаунт':'Sign in','Выбери роль и ранг':'Choose role and rank',
'Выбери роль':'Choose role','Выбери ранг':'Choose rank',
'⏳ Сохраняем...':'⏳ Saving...','✓ Сохранено!':'✓ Saved!',
'✓ Профиль сохранён!':'✓ Profile saved!',
'Ошибка сохранения: ':'Save error: ',
'🟢 Онлайн':'🟢 Online','Оффлайн':'Offline','⚫ Оффлайн':'⚫ Offline',
' онлайн':' online','Нет пользователей':'No users',
'📋 Скопировать данные':'📋 Copy data','✕ Закрыть':'✕ Close',
'🙈 Игрок скрыл свои данные':'🙈 Player hid their data',
'✓ Скопировано в слот ':'✓ Copied to slot ',
'Данные дефолта не найдены':'Default data not found',
'Ошибка: ':'Error: ',
// Item calc labels
'🛡 Шипованный доспех':'🛡 Thornmail',
'Отражает маг. урон атакующему + Тяжкие раны':'Reflects magic damage + Grievous Wounds',
'Моя броня':'My Armor','Мой бонусный HP':'My Bonus HP','МС врага':'Enemy MR',
'Отражённый маг. урон (после МС)':'Reflected magic damage (after MR)',
'Сырой: ':'Raw: ',' после ':' after ',
'⚔ Клинок Погибшего Короля':'⚔ Blade of the Ruined King',
'% текущего HP врага (физ.)':'% current enemy HP (phys.)',
'Текущий HP цели':'Target current HP','Броня врага':'Enemy Armor',
'% пробив. брони':'% Armor Pen',
'Дальний 7%':'Ranged 7%','Ближний 10%':'Melee 10%',
'🔥 Эгида Солнечного огня':'🔥 Sunfire Aegis',
'Маг. урон/с рядом с врагами':'Magic dmg/s near enemies',
'Стаки (0-4)':'Stacks (0-4)','Уровень врага':'Enemy Level',
'Маг. урон/сек (после МС)':'Magic dmg/sec (after MR)',
'🔮 Мучения Лиандри':'🔮 Liandry\'s Torment',
'% макс. HP/с маг. ожог (скейлится до 3%)':'% max HP/s magic burn (scales to 3%)',
'Макс HP цели':'Target Max HP',
'⚡ Божественный Разрушитель':'⚡ Divine Sunderer',
'Физ. удар после способности + хил':'Phys hit after ability + heal',
'Мой базовый AD':'My Base AD',
'Дальн.':'Ranged','Ближн.':'Melee',
' (после брони)':' (after armor)',
// Rank labels
'Суверен':'Sovereign','Челленджер':'Challenger','Грандмастер':'Grandmaster',
'Мастер':'Master','Бриллиант':'Diamond',
'Топ':'Top','Лес':'Jungle','Мид':'Mid','АДК':'ADC','Сап':'Support',
'ГМ':'GM','Чалик':'Challenger',
// Welcome details
'Слайдер':'Slider','выбери уровень 1–15':'choose level 1–15',
'выбери кого сравнивать':'choose who to compare',
'Столбцы':'Columns','нажми чтобы отсортировать':'click to sort',
'Иконка чемпа':'Champ icon','полная инфа и график роста':'full info and growth chart',
// Profile data
'Тир-лист':'Tier List','Контр-пики':'Counter-picks','Комбо':'Combos',
'Профиль':'Profile',
// Support text
'Ребята, сайт абсолютно бесплатен для всех.':'Hey, the site is completely free for everyone.',
'Буду очень благодарен за поддержку, для меня это мощная мотивация развивать проект.':'I would really appreciate your support — it motivates me to keep developing the project.',
'Поддержать проект':'Support Project'
};

// ═══ TRANSLATE TOOLTIP TEXT ═══
function translateTip(tip) {
    if (!tip) return tip;
    var parts = tip.split('\u00A6');
    // Translate name
    var name = parts[0];
    if (_itemName[name]) parts[0] = _itemName[name];
    else if (_runeName[name]) parts[0] = _runeName[name];
    // Translate rune type
    if (parts[1] && _runeType[parts[1]]) parts[1] = _runeType[parts[1]];
    // Translate cost: "3000 г" → "3000 g"
    if (parts[1] && /\d+\s*г/.test(parts[1])) parts[1] = parts[1].replace(/\s*г/, ' g');
    // Translate stats and description
    for (var i = 2; i < parts.length; i++) {
        parts[i] = translateText(parts[i]);
    }
    return parts.join('\u00A6');
}

function translateText(text) {
    if (!text) return text;
    // Word-boundary aware replacement
    // Matches term only when NOT surrounded by Cyrillic/Latin letters
    function replaceWhole(str, from, to) {
        // Escape regex special chars in the search term
        var escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Use lookbehind/lookahead for word boundaries (Cyrillic-aware)
        var re = new RegExp('(?<![а-яёА-ЯЁa-zA-Z])' + escaped + '(?![а-яёА-ЯЁa-zA-Z])', 'g');
        return str.replace(re, to);
    }
    // Stat terms
    for (var i = 0; i < _statTerms.length; i++) {
        text = replaceWhole(text, _statTerms[i][0], _statTerms[i][1]);
    }
    // Game terms
    for (var i = 0; i < _gameTerms.length; i++) {
        text = replaceWhole(text, _gameTerms[i][0], _gameTerms[i][1]);
    }
    return text;
}

// ═══ t() — translate dynamic strings ═══
function t(s) {
    if (_lang === 'ru') return s;
    return _dyn[s] !== undefined ? _dyn[s] : s;
}

// ═══ APPLY LANGUAGE TO PAGE ═══
function applyLang() {
    // 1. Update lang button
    var btn = document.getElementById('langLabel');
    if (btn) btn.textContent = _lang === 'ru' ? 'EN' : 'RU';

    // 2. html lang attribute
    document.documentElement.lang = _lang === 'ru' ? 'ru' : 'en';

    // 3. Static elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
        var key = el.getAttribute('data-i18n');
        var isPlaceholder = el.getAttribute('data-i18n-attr') === 'placeholder';
        var isTitle = el.getAttribute('data-i18n-attr') === 'title';
        if (_lang === 'en') {
            if (!el._origText) {
                el._origText = isPlaceholder ? el.placeholder : (isTitle ? el.title : el.textContent);
            }
            var tr = _ui[key] || _dyn[key] || key;
            if (isPlaceholder) el.placeholder = tr;
            else if (isTitle) el.title = tr;
            else el.textContent = tr;
        } else {
            if (el._origText !== undefined) {
                if (isPlaceholder) el.placeholder = el._origText;
                else if (isTitle) el.title = el._origText;
                else el.textContent = el._origText;
            }
        }
    });

    // 4. Item tooltips
    document.querySelectorAll('.item-card[data-tip]').forEach(function(card) {
        if (_lang === 'en') {
            if (!card._tipRu) card._tipRu = card.getAttribute('data-tip');
            card.setAttribute('data-tip', translateTip(card._tipRu));
            // Update alt text
            var img = card.querySelector('img');
            if (img) {
                if (!img._altRu) img._altRu = img.alt;
                img.alt = _itemName[img._altRu] || _altName[img._altRu] || img._altRu;
            }
        } else {
            if (card._tipRu) card.setAttribute('data-tip', card._tipRu);
            var img = card.querySelector('img');
            if (img && img._altRu) img.alt = img._altRu;
        }
    });

    // 5. Rune tooltips and names
    document.querySelectorAll('.rune-card[data-tip]').forEach(function(card) {
        var nameEl = card.querySelector('.rune-card-name');
        if (_lang === 'en') {
            if (!card._tipRu) card._tipRu = card.getAttribute('data-tip');
            card.setAttribute('data-tip', translateTip(card._tipRu));
            if (nameEl) {
                if (!nameEl._origText) nameEl._origText = nameEl.textContent;
                nameEl.textContent = _runeName[nameEl._origText] || nameEl._origText;
            }
            var img = card.querySelector('img');
            if (img) {
                if (!img._altRu) img._altRu = img.alt;
                img.alt = _runeName[img._altRu] || img._altRu;
            }
        } else {
            if (card._tipRu) card.setAttribute('data-tip', card._tipRu);
            if (nameEl && nameEl._origText) nameEl.textContent = nameEl._origText;
            var img = card.querySelector('img');
            if (img && img._altRu) img.alt = img._altRu;
        }
    });

    // 6. Section labels
    document.querySelectorAll('.items-section-label, .items-section-sublabel, .side-section').forEach(function(el) {
        if (_lang === 'en') {
            if (!el._origText) el._origText = el.textContent;
            el.textContent = _sectionLabels[el._origText] || _ui[el._origText] || el._origText;
        } else {
            if (el._origText) el.textContent = el._origText;
        }
    });

    // 7. HTML-content elements (data-i18n-html)
    document.querySelectorAll('[data-i18n-html]').forEach(function(el) {
        var key = el.getAttribute('data-i18n-html');
        if (_lang === 'en') {
            if (!el._origHtml) el._origHtml = el.innerHTML;
            if (_uiHtml[key]) el.innerHTML = _uiHtml[key];
        } else {
            if (el._origHtml !== undefined) el.innerHTML = el._origHtml;
        }
    });

    // 9. Sidebar buttons
    document.querySelectorAll('.side-btn').forEach(function(btn) {
        var icon = btn.querySelector('.side-icon');
        if (!icon) return;
        // Get text node after icon
        var nodes = btn.childNodes;
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].nodeType === 3 && nodes[i].textContent.trim()) {
                if (_lang === 'en') {
                    if (!nodes[i]._orig) nodes[i]._orig = nodes[i].textContent;
                    var txt = nodes[i]._orig.trim();
                    nodes[i].textContent = _ui[txt] || _dyn[txt] || txt;
                } else {
                    if (nodes[i]._orig) nodes[i].textContent = nodes[i]._orig;
                }
            }
        }
    });
}

// ═══ TOGGLE LANGUAGE ═══
function toggleLang() {
    _lang = _lang === 'ru' ? 'en' : 'ru';
    localStorage.setItem('wr_lang', _lang);
    window._lang = _lang;
    applyLang();
}

// ═══ EXPORTS ═══
window.t = t;
window.applyLang = applyLang;
window.toggleLang = toggleLang;
window._i18nLang = function() { return _lang; };
window._lang = _lang;
window._itemNameEN = _itemName;
window._altNameEN = _altName;
window._runeNameEN = _runeName;
window._uiEN = _ui;
window._dynEN = _dyn;

// ═══ AUTO-APPLY ON LOAD ═══
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        if (_lang !== 'ru') applyLang();
    });
} else {
    if (_lang !== 'ru') applyLang();
}

})();
