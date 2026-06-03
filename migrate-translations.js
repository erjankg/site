/**
 * МИГРАЦИЯ: чистые переводы названий и описаний предметов и рун.
 *
 * Зачем: в Firestore у многих предметов и рун битый авто-перевод
 * (латиница слиплась с кириллицей), а name_ru = name_en. Этот скрипт
 * проставляет нормальные русские названия и чистые описания (RU + EN).
 *
 * ЗАПУСК:
 *   1. Открой https://pro-wildrift.com/ и войди под админом
 *   2. F12 → Console
 *   3. Вставь весь файл целиком → Enter
 *   4. Скрипт запустится сам, жди "=== ГОТОВО ==="
 *
 * БЕЗОПАСНО:
 *   - Обновляет только name_ru, name_en, description_ru, description_en
 *   - НЕ трогает cost, stats, category, order, image
 *   - У предметов, где description_ru НЕ передан, описание не меняется
 *     (чтобы не затереть уже хорошие переводы физических предметов)
 *   - Требует _isAdmin === true (иначе правила Firestore отклонят запись)
 */

(async function migrateTranslationsIIFE() {
  if (!window.firebase || !firebase.firestore) { console.error('Firebase не загружен — открой сайт и войди как админ.'); return; }
  if (!window._isAdmin) { console.error('Нужны права админа (_isAdmin !== true).'); return; }
  var db = firebase.firestore();

  // ── ПРЕДМЕТЫ ──────────────────────────────────────────────────────────────
  // Для предметов с уже чистым description_ru передаём только имена.
  var ITEMS = [
    { id: 'amaranths-twinguard', name_ru: 'Близнецовый страж Амаранты', name_en: "Amaranth's Twinguard",
      description_ru: 'Выносливость: в бою накапливает 1 заряд в секунду (макс. 5). При 5 зарядах: +20% стойкости и +30% к бонусной броне и сопротивлению магии. Заряды сбрасываются вне боя.',
      description_en: 'Endurance: In combat, gain 1 stack per second (max 5). At 5 stacks: +20% Tenacity and +30% bonus Armor and Magic Resist. Stacks reset out of combat.' },

    { id: 'archangels-staff', name_ru: 'Посох архангела', name_en: "Archangel's Staff",
      description_ru: 'Благоговение: +1% силы умений от максимального запаса маны. Возвращает 25% потраченной маны.\nЗаряд маны: накапливает заряд каждые 3,3 сек (макс. 3). Трата маны даёт +18 к максимальной мане (до +700). При +700 маны превращается в «Объятия серафима».',
      description_en: 'Awe: +1% AP per max mana. Refunds 25% of mana spent.\nMana Charge: generates a charge every 3.3s (max 3). Spending mana grants +18 max mana (up to 700). Transforms into Seraph\'s Embrace at +700 mana.' },

    { id: 'ardent-censer', name_ru: 'Пылкое кадило', name_en: 'Ardent Censer',
      description_ru: 'Пылкость: +5% скорости передвижения.\nКадило: лечение или щит на союзника усиливает его на 6 сек, давая +15–40% скорости атаки и 16–30 дополнительного магического урона при базовых атаках.',
      description_en: 'Ardent: +5% Move Speed.\nCenser: Healing or shielding an ally empowers them for 6s, granting +15–40% Attack Speed and 16–30 bonus magic damage on basic attacks.' },

    { id: 'awakened-soulstealer', name_ru: 'Пробуждённый похититель душ', name_en: 'Awakened Soulstealer',
      description_ru: 'Охота за душами: +15 к пробиванию магии.\nБлуждающая душа: убийство чемпиона в течение 3 сек после нанесения ему урона снижает перезарядку способностей на 25% и даёт +10% базовой скорости передвижения, а также восстанавливает 50% перезарядки способностей цели до её возрождения.',
      description_en: 'Soul Hunt: +15 Magic Penetration.\nRoaming Soul: Killing a champion within 3s of damaging it reduces ability cooldowns by 25%, grants 10% base Move Speed, and refunds 50% of the target\'s ability cooldowns until it respawns.' },

    { id: 'bandle-fantasy', name_ru: 'Фантазия Бандла', name_en: 'Bandle Fantasy',
      description_ru: 'Огненный цветок: урон способностями по чемпионам вызывает отложенный взрыв, наносящий 105 (+15% силы умений) магического урона. Последующие попадания по цели наносят 20% этого урона.',
      description_en: 'Firebloom: Ability damage to champions causes a delayed blast dealing 105 (+15% AP) magic damage. Subsequent hits on the target deal 20% of that damage.' },

    { id: 'banshees-veil', name_ru: 'Вуаль банши', name_en: "Banshee's Veil",
      description_ru: 'Завеса: накладывает на союзника магический щит на 3 сек. Перезарядка 45 сек.',
      description_en: 'Veil: Grants an ally a magic shield for 3s. 45s cooldown.' },

    { id: 'berserkers-greaves', name_ru: 'Поножи берсерка', name_en: "Berserker's Greaves",
      description_ru: 'Ярость: атаки дают +10% скорости атаки на 3 сек. Макс. 3 заряда.',
      description_en: 'Fury: Attacks grant +10% Attack Speed for 3s. Max 3 stacks.' },

    { id: 'black-cleaver', name_ru: 'Чёрная секира', name_en: 'Black Cleaver' },
    { id: 'blade-of-the-ruined-king', name_ru: 'Клинок Падшего короля', name_en: 'Blade of the Ruined King' },
    { id: 'bloodthirster', name_ru: 'Кровопийца', name_en: 'Bloodthirster' },

    { id: 'boots-of-mana', name_ru: 'Ботинки маны', name_en: 'Boots of Mana',
      description_ru: 'Движение маной: при использовании активного предмета вы получаете +15% скорости передвижения на 2 сек.',
      description_en: 'Mana Movement: Using an item active grants +15% Move Speed for 2s.' },

    { id: 'chempunk-chainsword', name_ru: 'Цепной меч химпанка', name_en: 'Chempunk Chainsword' },

    { id: 'cosmic-drive', name_ru: 'Космический двигатель', name_en: 'Cosmic Drive',
      description_ru: 'Гипердвигатель: +5% скорости передвижения.\nПлетение заклинаний: урон способностями или усиленными атаками по чемпиону даёт +30 (+70% от ускорения умений с предметов) скорости передвижения на 2 сек (перезарядка 1 сек на источник).',
      description_en: 'Hyperdrive: +5% Move Speed.\nSpellweaving: Damaging a champion with an ability or empowered attack grants 30 (+70% of item Ability Haste) Move Speed for 2s (1s cooldown per source).' },

    { id: 'crown-of-the-shattered-queen', name_ru: 'Корона расколотой королевы', name_en: 'Crown of the Shattered Queen',
      description_ru: 'Защита: даёт щит, блокирующий следующую вражескую способность. При его пробитии входящий урон снижается на 40% на 1 сек (перезарядка 40 сек).\nУверенность: пока Защита не на перезарядке — +20 силы умений. Урон способностями по чемпионам снижает перезарядку Защиты на 4 сек.',
      description_en: 'Safeguard: Grants a shield that blocks the next enemy ability. When broken, incoming damage is reduced by 40% for 1s (40s cooldown).\nConfidence: While Safeguard is not on cooldown, gain +20 AP. Damaging champions with abilities reduces Safeguard\'s cooldown by 4s.' },

    { id: 'dawnshroud', name_ru: 'Рассветный покров', name_en: 'Dawnshroud',
      description_ru: 'Рассветный вестник: при обездвиживании врага в радиусе 400 наносит 40 (+2,5% бонусного здоровья) магического урона врагам рядом и раскрывает их на 3 сек. Вы получаете +20% брони и сопротивления магии на 3 сек (перезарядка 3 сек).',
      description_en: 'Dawnbringer: When you immobilize an enemy, deal 40 (+2.5% bonus health) magic damage to nearby enemies within 400 and reveal them for 3s. Gain +20% Armor and Magic Resist for 3s (3s cooldown).' },

    { id: 'dead-mans-plate', name_ru: 'Доспех мертвеца', name_en: "Dead Man's Plate",
      description_ru: 'Неумолимый: +5% скорости передвижения.\nИмпульс: движение накапливает заряды (до 100 = +40 скорости). Сокрушительный удар: атака тратит Импульс, нанося магический урон, равный накопленному Импульсу. При максимальном Импульсе ближние атаки замедляют на 75% на 1 сек.',
      description_en: 'Relentless: +5% Move Speed.\nMomentum: Moving builds charges (up to 100 = +40 Move Speed). Crushing Blow: Attacks spend Momentum to deal magic damage equal to the Momentum spent. At max Momentum, melee attacks slow by 75% for 1s.' },

    { id: 'deaths-dance', name_ru: 'Танец смерти', name_en: "Death's Dance" },
    { id: 'divine-sunderer', name_ru: 'Божественный раскалыватель', name_en: 'Divine Sunderer' },
    { id: 'duskblade-of-draktharr', name_ru: 'Клинок сумерек Драктарра', name_en: 'Duskblade of Draktharr' },
    { id: 'eclipse', name_ru: 'Затмение', name_en: 'Eclipse' },
    { id: 'essence-reaver', name_ru: 'Жнец сущности', name_en: 'Essence Reaver' },
    { id: 'experimental-hexplate', name_ru: 'Экспериментальная гексопластина', name_en: 'Experimental Hexplate' },

    { id: 'fimbulwinter', name_ru: 'Фимбулвинтер', name_en: 'Fimbulwinter',
      description_ru: 'Благоговение: +10% к здоровью от максимального запаса маны. Возвращает 15% потраченной маны.\nЗамороженный колосс: обездвиживание или замедление чемпиона тратит 3% маны, давая щит 90–180 (+4,5% от маны) на 3 сек. Если рядом 2+ врага, щит ×180%. Перезарядка 8 сек. Отключается при мане ниже 20%.',
      description_en: 'Awe: +10% Health from max mana. Refunds 15% of mana spent.\nFrozen Colossus: Immobilizing or slowing a champion spends 3% mana to grant a 90–180 (+4.5% mana) shield for 3s. With 2+ enemies nearby, shield ×180%. 8s cooldown. Disabled below 20% mana.' },

    { id: 'force-of-nature', name_ru: 'Сила природы', name_en: 'Force of Nature',
      description_ru: 'Шторм: +5% скорости передвижения.\nПоглощение: получение урона от способностей даёт заряд «Непоколебимости» (до 4, длится 7 сек). При 4 зарядах: +10% скорости передвижения и −25% получаемого магического урона.',
      description_en: 'Gale: +5% Move Speed.\nAbsorb: Taking ability damage grants a Steadfast stack (up to 4, lasting 7s). At 4 stacks: +10% Move Speed and −25% magic damage taken.' },

    { id: 'frozen-heart', name_ru: 'Ледяное сердце', name_en: 'Frozen Heart',
      description_ru: 'Ласка зимы: базовые атаки и урон способностями накладывают «Озноб» на 3 сек (до 4 зарядов, перезарядка 1 сек на умение). Каждый заряд снижает скорость атаки цели на 9% (макс. −36%).',
      description_en: 'Winter\'s Caress: Basic attacks and ability damage apply Chill for 3s (up to 4 stacks, 1s cooldown per ability). Each stack reduces the target\'s Attack Speed by 9% (max −36%).' },

    { id: 'galeforce', name_ru: 'Шквал', name_en: 'Galeforce',
      description_ru: 'Облачный взрыв: рывок к цели (325), затем 3 снаряда по самому раненому врагу (600). Каждый наносит 13–40 (+45% бонусного AD) физического урона, всего 40–120 (зависит от уровня) (+45% бонусного AD). Перезарядка 50 сек.',
      description_en: 'Cloudburst: Dash toward the cursor (325), then fire 3 missiles at the lowest-health enemy (600). Each deals 13–40 (+45% bonus AD) physical damage, total 40–120 (level-based) (+45% bonus AD). 50s cooldown.' },

    { id: 'gargoyle', name_ru: 'Каменная горгулья', name_en: 'Gargoyle',
      description_ru: 'Каменная броня: щит 15% от макс. здоровья на 4 сек, урон по вам −40%, пока щит активен. +0,1% макс. здоровья за каждую единицу бонусной брони/сопр. магии (макс. 28%). Доп. +5/10/15% здоровья в зависимости от числа врагов рядом. Перезарядка 60 сек.',
      description_en: 'Stoneskin: Shield for 15% max health for 4s, reducing damage taken by 40% while active. +0.1% max health per bonus Armor/Magic Resist (max 28%). Extra +5/10/15% health based on nearby enemies. 60s cooldown.' },

    { id: 'glorious', name_ru: 'Славный амулет', name_en: 'Glorious',
      description_ru: 'Слава: +30% скорости передвижения на 4 сек. При сближении с врагом — ударная волна, замедляющая на 60% на 2 сек. Также +20% стойкости и +20% сопротивления замедлению. Перезарядка 45 сек, дальность 250.',
      description_en: 'Glory: +30% Move Speed for 4s. On reaching an enemy, release a shockwave slowing by 60% for 2s. Also +20% Tenacity and +20% Slow Resist. 45s cooldown, 250 range.' },

    { id: 'gluttonous-greaves', name_ru: 'Поножи прожорливости', name_en: 'Gluttonous Greaves',
      description_ru: 'Даёт +8% всестороннего вампиризма (физический и магический вампиризм) и +35 скорости передвижения.',
      description_en: 'Grants +8% Omnivamp (physical and magic vamp) and +35 Move Speed.' },

    { id: 'goredrinker', name_ru: 'Кровопускатель', name_en: 'Goredrinker',
      description_ru: 'Жаждущий удар: наносит 230% базового AD врагам рядом, восстанавливая 20% AD (+12% недостающего здоровья) за каждого поражённого чемпиона. Перезарядка 15 сек, дальность 400.',
      description_en: 'Thirsting Slash: Deal 230% base AD to nearby enemies, healing for 20% AD (+12% missing health) per champion hit. 15s cooldown, 400 range.' },

    { id: 'guardian-angel', name_ru: 'Ангел-хранитель', name_en: 'Guardian Angel' },
    { id: 'guinsoos-rageblade', name_ru: 'Яростный клинок Гинсу', name_en: "Guinsoo's Rageblade" },

    { id: 'harmonic-echo', name_ru: 'Гармоничное эхо', name_en: 'Harmonic Echo',
      description_ru: 'Гармоничное эхо: движение и способности накапливают заряды (до 100). При максимуме следующее лечение или щит на союзника дополнительно восстанавливает ему 120–180 (+15% силы умений). Если здоровье цели ниже 30% — лечение ×150%.',
      description_en: 'Harmonic Echo: Moving and casting build charges (up to 100). At max, your next heal or shield on an ally also restores 120–180 (+15% AP). If the target is below 30% health, healing ×150%.' },

    { id: 'heartsteel', name_ru: 'Стальное сердце', name_en: 'Heartsteel',
      description_ru: 'Колоссальное поглощение: враги в радиусе 700 накапливают заряды (до 6) за 2,5 сек. Атака по цели с макс. зарядами наносит 140 (+3,5% макс. здоровья) физического урона и даёт постоянное бонусное здоровье (15% макс. здоровья). Перезарядка 20 сек на цель.',
      description_en: 'Colossal Consumption: Enemies within 700 build charges (up to 6) over 2.5s. Attacking a target at max charges deals 140 (+3.5% max health) physical damage and grants permanent bonus health (15% max health). 20s cooldown per target.' },

    { id: 'hollow-radiance', name_ru: 'Полое сияние', name_en: 'Hollow Radiance',
      description_ru: 'Свечение: +10% магического урона по вам отражается по ближайшим врагам после применения контроля. Получаемый магический урон снижен на 10%.',
      description_en: 'Radiance: +10% of magic damage taken is reflected to nearby enemies after applying crowd control. Magic damage taken reduced by 10%.' },

    { id: 'horizon-focus', name_ru: 'Фокус горизонта', name_en: 'Horizon Focus',
      description_ru: 'Гиперснаряд: способность, попавшая с расстояния 600+, наносит чемпиону +9% урона и раскрывает его на 8 сек.\nФокус: применение «Гиперснаряда» раскрывает врагов в радиусе 1200 на 3 сек (перезарядка 12 сек).',
      description_en: 'Hypershot: An ability that hits from 600+ range deals +9% damage to the champion and reveals them for 8s.\nFocus: Triggering Hypershot reveals enemies within 1200 for 3s (12s cooldown).' },

    { id: 'hullbreaker', name_ru: 'Сокрушитель корпусов', name_en: 'Hullbreaker' },
    { id: 'immortal-shieldbow', name_ru: 'Бессмертный лук-щит', name_en: 'Immortal Shieldbow' },

    { id: 'imperial-mandate', name_ru: 'Имперский указ', name_en: 'Imperial Mandate',
      description_ru: 'Скоординированный огонь: замедление или обездвиживание чемпиона наносит 47–75 дополнительного магического урона и метит его на 4 сек (перезарядка 6 сек на цель). Союзник, атакующий метку, расходует её: 94–150 дополнительного магического урона, и оба получают +20% скорости передвижения на 2 сек.',
      description_en: 'Coordinated Fire: Slowing or immobilizing a champion deals 47–75 bonus magic damage and marks them for 4s (6s cooldown per target). An ally hitting the mark consumes it: 94–150 bonus magic damage, and both gain +20% Move Speed for 2s.' },

    { id: 'infinity-edge', name_ru: 'Бесконечный клинок', name_en: 'Infinity Edge' },

    { id: 'infinity-orb', name_ru: 'Сфера бесконечности', name_en: 'Infinity Orb',
      description_ru: 'Судьба: +5% скорости передвижения.\nБаланс: +15 к пробиванию магии.\nНеизбежная гибель: способности наносят критический урон врагам с здоровьем ниже 35% (+20% урона). Громовой удар: если чемпион погибает в течение 3 сек после «Неизбежной гибели» — молния наносит 50–75 (+10% силы умений) магического урона врагам рядом.',
      description_en: 'Destiny: +5% Move Speed.\nBalance: +15 Magic Penetration.\nInevitable Demise: Abilities critically strike enemies below 35% health (+20% damage). Thunderclap: If a champion dies within 3s of Inevitable Demise, a bolt deals 50–75 (+10% AP) magic damage to nearby enemies.' },

    { id: 'ionian-boots-of-lucidity', name_ru: 'Ионийские ботинки ясности', name_en: 'Ionian Boots of Lucidity',
      description_ru: 'Даёт +10 ускорения умений и +10% к скорости перезарядки заклинаний призывателя.',
      description_en: 'Grants +10 Ability Haste and +10% Summoner Spell cooldown speed.' },

    { id: 'kaenic-rookern', name_ru: 'Кеникский рокерн', name_en: 'Kaenic Rookern',
      description_ru: 'Накопление: получая магический урон (перезарядка 10 сек), накапливаешь щит, равный 25% нанесённого магического урона. Щит активируется через 10 сек вне боя. Не работает при получении контроля.',
      description_en: 'Magic Bulwark: Taking magic damage (10s cooldown) builds a shield equal to 25% of the magic damage taken. The shield activates after 10s out of combat. Disabled while crowd-controlled.' },

    { id: 'knights-vow', name_ru: 'Клятва рыцаря', name_en: "Knight's Vow",
      description_ru: 'Клятва: при покупке назначаешь союзника «Достойным». Жертва: рядом с Достойным 12% получаемого им урона перенаправляется на тебя, а ты восстанавливаешь 10% от урона, нанесённого им чемпионам.',
      description_en: 'Pledge: On purchase, designate an ally as your Worthy. Sacrifice: Near the Worthy, 12% of damage they take is redirected to you, and you heal for 10% of the damage they deal to champions.' },

    { id: 'kraken-slayer', name_ru: 'Убийца кракена', name_en: 'Kraken Slayer' },

    { id: 'liandrys-torment', name_ru: 'Мучения Лиандри', name_en: "Liandry's Torment",
      description_ru: 'Мучения: урон способностями и усиленными атаками поджигает цель, нанося 0,6%–3% от макс. здоровья цели магическим уроном в секунду в течение 3 сек.',
      description_en: 'Torment: Ability and empowered-attack damage burns the target, dealing 0.6%–3% of the target\'s max health as magic damage per second for 3s.' },

    { id: 'lich-bane', name_ru: 'Погибель лича', name_en: 'Lich Bane',
      description_ru: 'Проклятие: +5% скорости передвижения.\nЗаклинатель: после способности следующая атака в течение 10 сек наносит дополнительный магический урон, равный 75% базового AD + 50% силы умений (перезарядка 1,5 сек). Урон по строениям снижен на 50%.',
      description_en: 'Hex: +5% Move Speed.\nSpellblade: After an ability, your next attack within 10s deals bonus magic damage equal to 75% base AD + 50% AP (1.5s cooldown). Damage reduced by 50% against structures.' },

    { id: 'locket-enchant', name_ru: 'Амулет (зачарование)', name_en: 'Locket Enchant',
      description_ru: 'Амулет: защищает вас и ближайших союзников-чемпионов щитом 60–330 (зависит от уровня цели) на 2,5 сек (дальность 1000). Эффект снижается до 50%, если цель уже была защищена Амулетом за последние 20 сек. Перезарядка 60 сек.',
      description_en: 'Locket: Shields you and nearby allied champions for 60–330 (based on target level) for 2.5s (1000 range). Reduced to 50% if the target was shielded by a Locket in the last 20s. 60s cooldown.' },

    { id: 'locket-of-the-iron-solari', name_ru: 'Медальон железных Солари', name_en: 'Locket of the Iron Solari',
      description_ru: 'Щит (актив): даёт вам и ближайшим союзникам щит 80–160 здоровья на 2,5 сек. Перезарядка 90 сек.',
      description_en: 'Shield (active): Grants you and nearby allies an 80–160 health shield for 2.5s. 90s cooldown.' },

    { id: 'ludens-echo', name_ru: 'Эхо Лудена', name_en: "Luden's Echo",
      description_ru: 'Эхо: перемещение и способности накапливают заряды (до 100). При максимуме следующая атакующая способность тратит их, нанося 110 (+10% силы умений) дополнительного магического урона цели и до 3 врагам рядом.',
      description_en: 'Echo: Moving and casting build charges (up to 100). At max, your next damaging ability consumes them, dealing 110 (+10% AP) bonus magic damage to the target and up to 3 nearby enemies.' },

    { id: 'magnetic-blaster', name_ru: 'Магнитный бластер', name_en: 'Magnetic Blaster' },
    { id: 'manamune', name_ru: 'Манамьюн', name_en: 'Manamune' },
    { id: 'maw-of-malmortius', name_ru: 'Пасть Малмортия', name_en: 'Maw of Malmortius' },

    { id: 'malignance', name_ru: 'Злокозненность', name_en: 'Malignance',
      description_ru: 'Презрение: +20 к максимальной скорости передвижения.\nТуман ненависти: урон ультимативной способностью по чемпионам испепеляет землю под ними на 3 сек, нанося 180 (+15% силы умений) магического урона и 15 (+1,25% силы умений) магического урона каждые 0,25 сек, а также снижая сопротивление магии цели на 10 (перезарядка 3 сек на цель).',
      description_en: 'Scorn: +20 max Move Speed.\nHatefog: Ultimate damage to champions scorches the ground beneath them for 3s, dealing 180 (+15% AP) magic damage and 15 (+1.25% AP) magic damage every 0.25s, and reducing the target\'s Magic Resist by 10 (3s cooldown per target).' },

    { id: 'mejais-soulstealer', name_ru: 'Похититель душ Меджая', name_en: "Mejai's Soulstealer",
      description_ru: 'Слава: убийство чемпиона даёт 3 заряда, помощь — 2 заряда (макс. 30). При смерти теряешь 10 зарядов.\nСтрах: +5 силы умений за каждый заряд Славы (макс. +150). При 10+ зарядах +10% скорости передвижения.',
      description_en: 'Glory: Killing a champion grants 3 stacks, an assist 2 (max 30). On death, lose 10 stacks.\nDread: +5 AP per Glory stack (max +150). At 10+ stacks, +10% Move Speed.' },

    { id: 'mercurys-treads', name_ru: 'Сапоги Меркурия', name_en: "Mercury's Treads",
      description_ru: 'Лёгконогость: снижает длительность эффектов контроля на 30%.',
      description_en: 'Lightness: Reduces crowd-control duration by 30%.' },

    { id: 'morellonomicon', name_ru: 'Мореллономикон', name_en: 'Morellonomicon',
      description_ru: 'Наложение: нанесение магического урона чемпионам накладывает 50% тяжких ран на 3 сек (снижает лечение цели).',
      description_en: 'Affliction: Dealing magic damage to champions applies 50% Grievous Wounds for 3s (reduces target healing).' },

    { id: 'mortal-reminder', name_ru: 'Смертельное напоминание', name_en: 'Mortal Reminder' },

    { id: 'muramana', name_ru: 'Мурамана', name_en: 'Muramana' },
    { id: 'nashors-tooth', name_ru: 'Зуб Нашора', name_en: "Nashor's Tooth" },
    { id: 'navori-quickblades', name_ru: 'Быстрые клинки Навори', name_en: 'Navori Quickblades' },

    { id: 'oceanids-trident', name_ru: 'Трезубец океаниды', name_en: "Oceanid's Trident",
      description_ru: 'Смертельное оружие: урон способностями по чемпиону снижает его щиты. Одиночные способности −40% (+5% за 100 силы умений, макс. 60%). Способности по области −25% (+5% за 100 силы умений, макс. 45%).',
      description_en: 'Deadly Weapon: Ability damage to a champion reduces their shields. Single-target abilities −40% (+5% per 100 AP, max 60%). AoE abilities −25% (+5% per 100 AP, max 45%).' },

    { id: 'overlords-bloodmail', name_ru: 'Кровавая кольчуга властелина', name_en: "Overlord's Bloodmail",
      description_ru: 'Тирания: +AD, равный 2,5% от бонусного здоровья.\nВозмездие: +AD до 9% в зависимости от недостающего здоровья (максимум при здоровье ниже 30%).',
      description_en: 'Tyranny: +AD equal to 2.5% of bonus health.\nRetribution: +AD up to 9% based on missing health (max below 30% health).' },

    { id: 'phantom-dancer', name_ru: 'Танцор-фантом', name_en: 'Phantom Dancer',
      description_ru: 'Быстрые ноги: +5% скорости передвижения.\nПризрачный вальс: при попадании атаки дают +25% скорости атаки и +7% скорости передвижения на 6 сек (не суммируется; перезарядка 10 сек, снижается на 1 сек при каждом попадании).',
      description_en: 'Nimble: +5% Move Speed.\nSpectral Waltz: On-hit, attacks grant +25% Attack Speed and +7% Move Speed for 6s (no stacking; 10s cooldown, reduced by 1s per hit).' },

    { id: 'plated-steelcaps', name_ru: 'Стальные набойки', name_en: 'Plated Steelcaps',
      description_ru: 'Стойкость: снижает входящий физический урон от базовых атак на 8%.',
      description_en: 'Plating: Reduces incoming physical damage from basic attacks by 8%.' },

    { id: 'protobelt', name_ru: 'Протопояс', name_en: 'Protobelt',
      description_ru: 'Рывок вперёд с конусом снарядов: каждый снижает сопротивление магии цели на 12% на 3 сек и наносит 70 магического урона. По прибытии +20% скорости передвижения на 3 сек. Перезарядка 50 сек, дальность 325.',
      description_en: 'Dash forward firing a cone of missiles: each reduces the target\'s Magic Resist by 12% for 3s and deals 70 magic damage. On arrival, +20% Move Speed for 3s. 50s cooldown, 325 range.' },

    { id: 'psychic-projector', name_ru: 'Психический проектор', name_en: 'Psychic Projector',
      description_ru: 'Преобразование: +5% силы умений от бонусного здоровья.\nПрогноз: при 950+ бонусного здоровья — +20% силы умений в виде брони и +10% силы умений в виде сопротивления магии (максимум при 400 силы умений).',
      description_en: 'Conversion: +5% AP from bonus health.\nForecast: At 950+ bonus health, gain +20% AP as Armor and +10% AP as Magic Resist (max at 400 AP).' },

    { id: 'quicksilver', name_ru: 'Ртуть', name_en: 'Quicksilver',
      description_ru: 'Ртуть: снимает все эффекты контроля (кроме подброса) и даёт иммунитет к контролю на 0,75 сек. Перезарядка 60 сек.\nСтойкость: длительность контроля снижена на 25%. После Ртути — +30% стойкости и +30% сопротивления замедлению на 1,5 сек.',
      description_en: 'Quicksilver: Removes all crowd control (except Airborne) and grants CC immunity for 0.75s. 60s cooldown.\nTenacity: Crowd-control duration reduced by 25%. After Quicksilver, +30% Tenacity and +30% Slow Resist for 1.5s.' },

    { id: 'rabadons-deathcap', name_ru: 'Смертельная шапка Рабадона', name_en: "Rabadon's Deathcap",
      description_ru: 'Сверхмощность: увеличивает силу умений на 20–45% (зависит от уровня).',
      description_en: 'Overkill: Increases your Ability Power by 20–45% (level-based).' },

    { id: 'radiant-virtue', name_ru: 'Сияющая добродетель', name_en: 'Radiant Virtue',
      description_ru: 'Путеводный свет: после ультимативной способности на 6 сек: +10% макс. здоровья. Каждую секунду вы и союзники рядом восстанавливаете 2,5%/1,25% макс. здоровья (до 17,5%/8,75%). Перезарядка 30 сек, дальность 1200.',
      description_en: 'Guiding Light: After your ultimate, for 6s: +10% max health. Each second, you and nearby allies heal for 2.5%/1.25% max health (up to 17.5%/8.75%). 30s cooldown, 1200 range.' },

    { id: 'redemption', name_ru: 'Искупление', name_en: 'Redemption',
      description_ru: 'Вечность: 15% получаемого от чемпионов урона восстанавливается маной. 20% потраченной маны превращается в здоровье (до 15 здоровья за раз).\nСпасение: каждые 8 сек восстанавливает 40 (+7% бонусного здоровья) здоровья всем союзникам в радиусе 350.',
      description_en: 'Eternity: 15% of damage taken from champions is restored as mana. 20% of mana spent is converted to health (up to 15 health per instance).\nSalvation: Every 8s, heal all allies within 350 for 40 (+7% bonus health).' },

    { id: 'relic-shield', name_ru: 'Реликтовый щит', name_en: 'Relic Shield',
      description_ru: 'Дань: 1 заряд каждые 30 сек (макс. 3). Рядом с союзником трата заряда даёт 65 золота и 20–80 восстановления здоровья. Срабатывает при уроне по чемпионам/строениям и добивании миньонов ниже 65% здоровья. Задание: 750 золота → «Оплот горы».',
      description_en: 'Tribute: 1 charge every 30s (max 3). Near an ally, spending a charge grants 65 gold and 20–80 health. Triggers on damage to champions/structures and on killing minions below 65% health. Quest: 750 gold → Bulwark of the Mountain.' },

    { id: 'riftmaker', name_ru: 'Создатель разлома', name_en: 'Riftmaker',
      description_ru: 'Ассимиляция: в бою вы получаете +2,5% магического урона каждую секунду (макс. +7,5%). На максимуме весь ваш магический урон становится истинным.\n+11% вампиризма от заклинаний.',
      description_en: 'Assimilation: In combat, gain +2.5% magic damage per second (max +7.5%). At max, all your magic damage becomes true damage.\n+11% Omnivamp from abilities.' },

    { id: 'rod-of-ages', name_ru: 'Посох веков', name_en: 'Rod of Ages',
      description_ru: 'Вечность: 15% получаемого от чемпионов урона восстанавливается маной. Трата маны даёт здоровье (до 20% за применение, до 25 здоровья).\nВетеран: каждые 35 сек +25 здоровья, +10 маны, +6 силы умений (макс. 10 зарядов = +250 здоровья, +100 маны, +60 силы умений).',
      description_en: 'Eternity: 15% of damage taken from champions is restored as mana. Spending mana grants health (up to 20% per cast, max 25 health).\nVeteran: Every 35s, +25 health, +10 mana, +6 AP (max 10 stacks = +250 health, +100 mana, +60 AP).' },

    { id: 'runaans-hurricane', name_ru: 'Ураган Рунаана', name_en: "Runaan's Hurricane",
      description_ru: 'Ярость ветра: базовые атаки при попадании выпускают дополнительные снаряды по двум врагам рядом, каждый наносит 55% физического урона от AD, накладывает эффекты при попадании со 100% эффективностью и может нанести критический урон.\nКлинок ветра: базовые атаки наносят +15 физического урона при попадании.',
      description_en: 'Wind\'s Fury: On-hit, basic attacks fire bolts at up to two nearby enemies, each dealing 55% AD physical damage, applying on-hit effects at 100%, and able to critically strike.\nWind\'s Blade: Basic attacks deal +15 physical damage on-hit.' },

    { id: 'rylais-crystal-scepter', name_ru: 'Хрустальный скипетр Рилай', name_en: "Rylai's Crystal Scepter",
      description_ru: 'Ледяной: активные способности, наносящие урон, и усиленные атаки замедляют врагов на 30% на 0,75 сек.',
      description_en: 'Icy: Damaging active abilities and empowered attacks slow enemies by 30% for 0.75s.' },

    { id: 'seraphs-embrace', name_ru: 'Объятия серафима', name_en: "Seraph's Embrace",
      description_ru: 'Благоговение: +3% силы умений от максимального запаса маны. Возвращает 25% потраченной маны.\nСпасательная линия: при здоровье ниже 35% — щит 100 (+15% текущей маны) на 2 сек, тратит 15% маны (перезарядка 90 сек).',
      description_en: 'Awe: +3% AP from max mana. Refunds 25% of mana spent.\nLifeline: Below 35% health, gain a 100 (+15% current mana) shield for 2s, consuming 15% mana (90s cooldown).' },

    { id: 'serpents-fang', name_ru: 'Клык змея', name_en: "Serpent's Fang" },

    { id: 'seryldas-grudge', name_ru: 'Злоба Серильды', name_en: "Serylda's Grudge" },

    { id: 'soul-transfer', name_ru: 'Переход душ', name_en: 'Soul Transfer',
      description_ru: 'Танец теней: критические удары по чемпиону или эпическому монстру призывают Тень на 4 сек, атакующую ближайших врагов. Тень наследует 20% AD и 30% шанса крита как скорость атаки. Можно иметь до двух Теней. Тени на расстоянии более 600 исчезают.',
      description_en: 'Shadow Dance: Critical strikes on a champion or epic monster summon a Shadow for 4s that attacks nearby enemies. It inherits 20% AD and 30% Crit Chance as Attack Speed. Up to two Shadows at once. Shadows beyond 600 range vanish.' },

    { id: 'spear-of-shojin', name_ru: 'Копьё Шоджина', name_en: 'Spear of Shojin',
      description_ru: 'Драконья сила: +25 ускорения базовых способностей.\nСфокусированная воля: урон по монстрам или врагам способностями увеличивает урон от способностей и пассивных умений на 3% на 6 сек (до 4 зарядов).',
      description_en: 'Dragonforce: +25 Basic Ability Haste.\nFocused Will: Damaging monsters or enemies with abilities increases ability and passive damage by 3% for 6s (up to 4 stacks).' },

    { id: 'spectral-sickle', name_ru: 'Призрачный серп', name_en: 'Spectral Sickle',
      description_ru: 'Дань: 1 заряд каждые 30 сек (макс. 3). Рядом с союзником трата заряда даёт 65 золота и 20–80 восстановления здоровья. Срабатывает при уроне по чемпионам/строениям и добивании миньонов ниже 65% здоровья. Задание: 750 золота → «Коса чёрного тумана».',
      description_en: 'Tribute: 1 charge every 30s (max 3). Near an ally, spending a charge grants 65 gold and 20–80 health. Triggers on damage to champions/structures and on killing minions below 65% health. Quest: 750 gold → Black Mist Scythe.' },

    { id: 'staff-of-flowing-water', name_ru: 'Посох текущей воды', name_en: 'Staff of Flowing Water',
      description_ru: 'Стремнина: лечение или щит на союзника даёт вам обоим +10 ускорения умений и 20–40 (зависит от уровня цели) силы умений на 6 сек.',
      description_en: 'Rapids: Healing or shielding an ally grants you both +10 Ability Haste and 20–40 (based on target level) AP for 6s.' },

    { id: 'stasis', name_ru: 'Стазис', name_en: 'Stasis',
      description_ru: 'Стазис: впадаете в стазис на 2,5 сек — неуязвимы и недосягаемы, но не можете действовать. Перезарядка 120 сек.',
      description_en: 'Stasis: Enter stasis for 2.5s — invulnerable and untargetable, but unable to act. 120s cooldown.' },

    { id: 'steraks-gage', name_ru: 'Мерило Стерака', name_en: "Sterak's Gage",
      description_ru: 'Тяжёлая рука: +AD, равный 50% базового AD.\nСпасательная линия: при здоровье ниже 35% — щит 75% бонусного здоровья на 3 сек. Перезарядка 90 сек.\nЯрость Стерака: активация щита даёт увеличение размера и +30% стойкости на 8 сек.',
      description_en: 'The Claws that Catch: +AD equal to 50% base AD.\nLifeline: Below 35% health, gain a shield for 75% bonus health for 3s. 90s cooldown.\nSterak\'s Fury: Triggering the shield grants increased size and +30% Tenacity for 8s.' },

    { id: 'stormrazor', name_ru: 'Грозовая бритва', name_en: 'Stormrazor',
      description_ru: 'Заряд энергии: движение и базовые атаки накапливают заряды энергии (макс. 100).\nГрозовая стрела: при максимуме следующая базовая атака тратит их, нанося 65–135 (зависит от уровня) дополнительного магического урона, замедляя на 50% на 0,75 сек и давая +45 скорости передвижения на 0,75 сек.',
      description_en: 'Energy Charge: Moving and basic attacks build energy charges (max 100).\nStormarrow: At max, your next basic attack consumes them, dealing 65–135 (level-based) bonus magic damage, slowing by 50% for 0.75s and granting +45 Move Speed for 0.75s.' },

    { id: 'stridebreaker', name_ru: 'Сокрушитель шага', name_en: 'Stridebreaker',
      description_ru: 'Сокрушительная ударная волна: рывок к цели (200), 120% физического урона от AD, замедление на 30% на 3 сек. Перезарядка 35 сек, дальность 400.',
      description_en: 'Breaking Shockwave: Dash toward the target (200), dealing 120% AD physical damage and slowing by 30% for 3s. 35s cooldown, 400 range.' },

    { id: 'sunfire-aegis', name_ru: 'Эгида солнечного огня', name_en: 'Sunfire Aegis',
      description_ru: 'Испепеление: в бою наносит (16–25 + 0,8% бонусного здоровья) магического урона в секунду врагам рядом. Урон по чемпионам/монстрам накапливает +11% на 5 сек (до 4 зарядов = +44%). Огненное касание: при максимуме зарядов атаки поджигают врагов вокруг, нанося 50% Испепеления на 3 сек. 130% урона по монстрам, 175–250% по миньонам.',
      description_en: 'Immolate: In combat, deal (16–25 + 0.8% bonus health) magic damage per second to nearby enemies. Damaging champions/monsters stacks +11% for 5s (up to 4 stacks = +44%). Flame Touch: At max stacks, attacks ignite nearby enemies, dealing 50% of Immolate for 3s. 130% damage to monsters, 175–250% to minions.' },

    { id: 'terminus', name_ru: 'Терминус', name_en: 'Terminus',
      description_ru: 'Тень: базовая атака наносит +35 магического урона при попадании.\nСопоставление: базовые атаки по чемпионам чередуют удары Света и Тьмы (бонус 5 сек, до 3 зарядов). Удары Света: +5–8 (зависит от уровня) брони и сопр. магии. Удары Тьмы: +11% пробивания брони и магии. При максимуме обоих — +15–24 брони/сопр. магии и +33% пробивания. Бонус к пробиванию ограничен 40%.',
      description_en: 'Shadow: Basic attacks deal +35 magic damage on-hit.\nJuxtaposition: Basic attacks on champions alternate Light and Dark hits (5s bonus, up to 3 stacks). Light: +5–8 (level-based) Armor and MR. Dark: +11% Armor and Magic Pen. At max of both: +15–24 Armor/MR and +33% Pen. Pen bonus capped at 40%.' },

    { id: 'the-collector', name_ru: 'Коллекционер', name_en: 'The Collector',
      description_ru: 'Убийца: +10 к пробиванию брони.\nСмерть и налоги: урон, снижающий здоровье чемпиона ниже 4% от максимального (+2% от шанса крита), казнит его. За убийство чемпиона вы получаете +25 золота и навсегда повышаете порог казни на 0,1%.',
      description_en: 'Death and Taxes: Damage that reduces a champion below 4% max health (+2% Crit Chance) executes them. Killing a champion grants +25 gold and permanently raises the execute threshold by 0.1%.' },

    { id: 'thornmail', name_ru: 'Шипованная броня', name_en: 'Thornmail',
      description_ru: 'Шипы: при атаке по вам наносит (20 + 6% бонусной брони + 2% бонусного здоровья) магического урона атакующему. Сплетение: накладывает 50% тяжких ран на 3 сек при получении атаки или нанесении урона.',
      description_en: 'Thorns: When attacked, deal (20 + 6% bonus Armor + 2% bonus health) magic damage to the attacker. Weave: Apply 50% Grievous Wounds for 3s when attacked or when dealing damage.' },

    { id: 'titanic-hydra', name_ru: 'Титаническая гидра', name_en: 'Titanic Hydra',
      description_ru: 'Рассечение: следующая атака наносит 25 (+3% бонусного здоровья) физического урона цели и 80 (+10% бонусного здоровья) физического урона в конусе 550. Для дальнего боя — 75%. Перезарядка 1,75 сек.',
      description_en: 'Cleave: Your next attack deals 25 (+3% bonus health) physical damage to the target and 80 (+10% bonus health) in a 550 cone. Ranged: 75%. 1.75s cooldown.' },

    { id: 'trinity-force', name_ru: 'Сила троицы', name_en: 'Trinity Force',
      description_ru: 'Рвение: +5% скорости передвижения.\nЗаклинатель клинков: после способности следующая базовая атака в течение 10 сек наносит +200% базового AD физического урона (перезарядка 1,5 сек). Урон по строениям снижен до 50%.\nДоблесть: базовые атаки дают (20/10) скорости передвижения на 2 сек. Убийство юнита даёт (60/30) скорости. Бонусы не суммируются.',
      description_en: 'Zeal: +5% Move Speed.\nSpellblade: After an ability, your next basic attack within 10s deals +200% base AD physical damage (1.5s cooldown). Reduced to 50% against structures.\nValor: Basic attacks grant (20/10) Move Speed for 2s. Unit takedowns grant (60/30). Bonuses don\'t stack.' },

    { id: 'void-staff', name_ru: 'Посох Бездны', name_en: 'Void Staff',
      description_ru: 'Пробивание Бездны: +40% пробивания магии.',
      description_en: 'Void Pen: +40% Magic Penetration.' },

    { id: 'winters-approach', name_ru: 'Приход зимы', name_en: "Winter's Approach",
      description_ru: 'Благоговение: +8% к здоровью от максимального запаса маны. Возвращает 15% потраченной маны.\nЗаряд маны: +12 к максимальной мане за атаку или трату маны (до 700). Превращается в «Фимбулвинтер».',
      description_en: 'Awe: +8% Health from max mana. Refunds 15% of mana spent.\nMana Charge: +12 max mana per attack or mana spent (up to 700). Transforms into Fimbulwinter.' },

    { id: 'wits-end', name_ru: 'Предел разума', name_en: "Wit's End",
      description_ru: 'На грани отчаяния: базовые атаки наносят 10–55 (зависит от уровня) дополнительного магического урона при попадании. При здоровье ниже 50% от максимального восстанавливаете (100%/33%) урона, который вражеские чемпионы получают от этого эффекта.',
      description_en: 'Fray: Basic attacks deal 10–55 (level-based) bonus magic damage on-hit. Below 50% max health, heal for (100%/33%) of the damage enemy champions take from this effect.' },

    { id: 'yordle-trap', name_ru: 'Ловушка йордла', name_en: 'Yordle Trap',
      description_ru: 'Ловец: попадание способностью движения даёт +30% скорости передвижения на 3 сек и метит цель на 5 сек (−5–12 брони/сопр. магии). Если помеченный погибает — вы и союзники рядом получаете 200–300 золота (раз в 10 сек).',
      description_en: 'Snare: Hitting with a movement ability grants +30% Move Speed for 3s and marks the target for 5s (−5–12 Armor/MR). If the marked target dies, you and nearby allies gain 200–300 gold (once per 10s).' },

    { id: 'youmuus-ghostblade', name_ru: 'Призрачный клинок Юму', name_en: "Youmuu's Ghostblade",
      description_ru: 'Срез: +15 к пробиванию брони.\nИмпульс: движение накапливает заряды Импульса (тратятся базовыми атаками; исчезают при замедлении). Каждый заряд = +0,4 скорости передвижения (макс. 100 = +40).\nПризрачная скорость: атаки при максимальном Импульсе дают +25% скорости атаки на 4 сек.',
      description_en: 'Haunt: +15 Armor Penetration.\nMomentum: Moving builds Momentum charges (spent by basic attacks; lost when slowed). Each charge = +0.4 Move Speed (max 100 = +40).\nWraith Speed: Attacking at max Momentum grants +25% Attack Speed for 4s.' },
  ].filter(function (x) { return !x.skip; });

  // ── РУНЫ ──────────────────────────────────────────────────────────────────
  var RUNES = [
    { id: 'aftershock', name_ru: 'Подземный толчок', name_en: 'Aftershock',
      description_ru: 'Обездвиживание вражеского чемпиона даёт +50 брони (+80% бонусной брони) и +50 сопротивления магии (+80% бонусного сопр. магии) на 2,5 сек. По истечении времени вы выпускаете ударную волну, наносящую 25–125 (зависит от уровня) (+3% от вашего макс. здоровья) магического урона врагам рядом. Перезарядка 35 сек.',
      description_en: 'Immobilizing an enemy champion grants +50 Armor (+80% bonus Armor) and +50 Magic Resist (+80% bonus MR) for 2.5s. Afterwards, release a shockwave dealing 25–125 (level-based) (+3% max health) magic damage to nearby enemies. 35s cooldown.' },

    { id: 'arcane-comet', name_ru: 'Чародейская комета', name_en: 'Arcane Comet',
      description_ru: 'Нанесение урона чемпиону способностью запускает в его местоположение комету. При попадании кометы по чемпиону урон следующей кометы увеличивается. Урон: 18–95 (+3 за каждое попадание по чемпионам) (+35% бонусного AD) (+20% силы умений). Перезарядка 16–8 сек.',
      description_en: 'Damaging a champion with an ability launches a comet at their location. When it hits a champion, the next comet\'s damage increases. Damage: 18–95 (+3 per hit on champions) (+35% bonus AD) (+20% AP). 16–8s cooldown.' },

    { id: 'axiom-arcanist', name_ru: 'Аксиома чародея', name_en: 'Axiom Arcanist',
      description_ru: 'Урон, лечение и щит от вашей ультимативной способности увеличены на 10% (урон по области — на 5%). Убийство вражеского чемпиона снижает оставшуюся перезарядку ультимативной способности на 7%.',
      description_en: 'Your ultimate\'s damage, healing and shielding are increased by 10% (AoE damage by 5%). Killing an enemy champion reduces your ultimate\'s remaining cooldown by 7%.' },

    { id: 'bone-plating', name_ru: 'Костяная броня', name_en: 'Bone Plating',
      description_ru: 'Блокирует часть урона от следующей атаки чемпиона, вызвавшей срабатывание, а также от двух последующих атак.',
      description_en: 'Blocks a portion of damage from the next champion attack that triggers it, plus the following two attacks.' },

    { id: 'brutal', name_ru: 'Жестокость', name_en: 'Brutal',
      description_ru: 'Базовые атаки наносят 7–21 дополнительного физического или магического урона при попадании по чемпионам (адаптивно).',
      description_en: 'Basic attacks deal 7–21 bonus physical or magic damage on-hit to champions (adaptive).' },

    { id: 'celerity', name_ru: 'Стремительность', name_en: 'Celerity',
      description_ru: 'Увеличивает скорость передвижения на 2%. Все бонусы к скорости передвижения также увеличены на 7%.',
      description_en: 'Increases Move Speed by 2%. All Move Speed bonuses are also increased by 7%.' },

    { id: 'chain-assault', name_ru: 'Цепная атака', name_en: 'Chain Assault',
      description_ru: 'Два удара по чемпиону рядом с союзником дают +30% скорости атаки и +30 скорости передвижения на 3 сек, а следующий удар наносит +125% AD физического урона. Перезарядка 7 сек.',
      description_en: 'Two hits on a champion near an ally grant +30% Attack Speed and +30 Move Speed for 3s, and your next hit deals +125% AD physical damage. 7s cooldown.' },

    { id: 'chain-storm', name_ru: 'Цепная буря', name_en: 'Chain Storm',
      description_ru: 'Попадание по вражескому чемпиону активной способностью накладывает метку. Ваши следующие 2 атаки или применения активной способности по нему наносят 20–35 дополнительного адаптивного урона (+5% бонусного AD) (+2,5% бонусной силы умений). Перезарядка 15 сек.',
      description_en: 'Hitting an enemy champion with an active ability applies a mark. Your next 2 attacks or active-ability casts on them deal 20–35 bonus adaptive damage (+5% bonus AD) (+2.5% bonus AP). 15s cooldown.' },

    { id: 'cheap-shot', name_ru: 'Удар исподтишка', name_en: 'Cheap Shot',
      description_ru: 'Наносит 10–45 дополнительного истинного урона врагам, чья скорость передвижения замедлена. Перезарядка 7 сек.',
      description_en: 'Deals 10–45 bonus true damage to enemies whose Move Speed is impaired. 7s cooldown.' },

    { id: 'conditioning', name_ru: 'Закалка', name_en: 'Conditioning',
      description_ru: '+5% брони и сопротивления магии. За каждого вражеского чемпиона рядом — дополнительно +4% брони и сопр. магии. Если рядом максимум врагов (3), вы также получаете +20% сопротивления замедлению.',
      description_en: '+5% Armor and Magic Resist. For each nearby enemy champion, an additional +4% Armor and MR. With the max number of enemies nearby (3), also gain +20% Slow Resist.' },

    { id: 'conqueror', name_ru: 'Завоеватель', name_en: 'Conqueror',
      description_ru: 'Базовые атаки и способности накапливают заряды Завоевателя на поражённых чемпионах (до одного за атаку или применение). Каждый заряд длится 6 сек и даёт 3–7 (зависит от уровня) бонусного AD или 4–11 силы умений (адаптивно), до 6 зарядов (макс. +12–36 AD или +18–54 силы умений). При полном накоплении вы получаете 8% физического и магического вампиризма в ближнем бою (5% в дальнем).',
      description_en: 'Basic attacks and abilities build Conqueror stacks on champions hit (up to one per attack or cast). Each stack lasts 6s and grants 3–7 (level-based) bonus AD or 4–11 AP (adaptive), up to 6 stacks (max +12–36 AD or +18–54 AP). At full stacks, gain 8% physical and magic vamp in melee (5% ranged).' },

    { id: 'coup-de-grace', name_ru: 'Удар милосердия', name_en: 'Coup de Grace',
      description_ru: 'Когда у врага остаётся менее 40% здоровья, вы наносите ему +8% адаптивного урона.',
      description_en: 'When an enemy is below 40% health, deal 8% bonus adaptive damage to them.' },

    { id: 'courage-of-the-colossus', name_ru: 'Мужество колосса', name_en: 'Courage of the Colossus',
      description_ru: 'Обездвиживание врага даёт щит, поглощающий 25–45 (+1% от макс. здоровья) на 3 сек. Перезарядка 10 сек.',
      description_en: 'Immobilizing an enemy grants a shield absorbing 25–45 (+1% max health) for 3s. 10s cooldown.' },

    { id: 'dark-harvest', name_ru: 'Тёмная жатва', name_en: 'Dark Harvest',
      description_ru: 'Урон по чемпиону со здоровьем ниже 50% наносит адаптивный урон и собирает его душу, навсегда увеличивая урон Тёмной жатвы на 10. Урон: 40 (+10 за душу) (+25% бонусного AD) (+15% бонусной силы умений). Перезарядка 20 сек, снижается до 1,5 сек после убийства.',
      description_en: 'Damaging a champion below 50% health deals adaptive damage and harvests their soul, permanently increasing Dark Harvest\'s damage by 10. Damage: 40 (+10 per soul) (+25% bonus AD) (+15% bonus AP). 20s cooldown, reduced to 1.5s after a takedown.' },

    { id: 'demolish', name_ru: 'Снос', name_en: 'Demolish',
      description_ru: 'Находясь в радиусе 550 от турели, зарядите атаку за 3 сек. Атака по турели наносит 200 (+30% от макс. здоровья) дополнительного адаптивного урона. Перезарядка 30 сек.',
      description_en: 'Within 550 of a turret, charge up an attack over 3s. The attack on the turret deals 200 (+30% max health) bonus adaptive damage. 30s cooldown.' },

    { id: 'electrocute', name_ru: 'Электрошок', name_en: 'Electrocute',
      description_ru: 'Базовые атаки и способности накапливают заряды на поражённых чемпионах (до одного за атаку или применение). 3 заряда на цели за 3 сек вызывают удар молнии, наносящий 40–194 (зависит от уровня) (+35% бонусного AD) (+20% силы умений) адаптивного урона. Перезарядка 20–13 сек.',
      description_en: 'Basic attacks and abilities build charges on champions hit (up to one per attack or cast). 3 charges on a target within 3s trigger a bolt dealing 40–194 (level-based) (+35% bonus AD) (+20% AP) adaptive damage. 20–13s cooldown.' },

    { id: 'empowered-attack', name_ru: 'Усиленная атака', name_en: 'Empowered Attack',
      description_ru: 'Каждые 8 сек следующая атака усиливается, нанося 35–50 дополнительного адаптивного урона. Дальние чемпионы наносят 80% урона.',
      description_en: 'Every 8s, your next attack is empowered, dealing 35–50 bonus adaptive damage. Ranged champions deal 80%.' },

    { id: 'empowerment', name_ru: 'Усиление', name_en: 'Empowerment',
      description_ru: 'Три последовательные атаки по вражескому чемпиону наносят 40–180 дополнительного адаптивного урона и делают цель уязвимой, увеличивая весь получаемый ею урон на 9% на 6 сек. В состоянии уязвимости ваши атаки по цели наносят 8–24 дополнительного истинного урона. По окончании уязвимости цель 4 сек невосприимчива к повторному эффекту.',
      description_en: 'Three consecutive attacks on an enemy champion deal 40–180 bonus adaptive damage and make the target vulnerable, increasing all damage they take by 9% for 6s. While vulnerable, your attacks deal 8–24 bonus true damage. When it ends, the target is immune to the effect for 4s.' },

    { id: 'eyeball-collection', name_ru: 'Коллекция глаз', name_en: 'Eyeball Collection',
      description_ru: 'Убийство врага даёт 1 единицу урона или 2 силы умений (до 20 зарядов), а также бонус +10 урона или +20 силы умений при достижении 20 зарядов.',
      description_en: 'Killing an enemy grants 1 Attack Damage or 2 Ability Power (up to 20 stacks), plus a bonus of +10 AD or +20 AP at 20 stacks.' },

    { id: 'first-strike', name_ru: 'Первый удар', name_en: 'First Strike',
      description_ru: 'Через 0,25 сек после начала боя с вражеским чемпионом нанесение ему урона приносит 10 золота и эффект «Первый удар» на 3 сек, позволяющий наносить ему +7% истинного урона. По окончании эффекта вы получаете золото в размере нанесённого бонусного урона (ближний бой 100% / дальний 85%). Перезарядка 20–13 сек.',
      description_en: '0.25s after starting combat with an enemy champion, damaging them grants 10 gold and First Strike for 3s, letting you deal +7% true damage to them. When it ends, gain gold equal to the bonus damage dealt (melee 100% / ranged 85%). 20–13s cooldown.' },

    { id: 'fleet-footwork', name_ru: 'Стремительный шаг', name_en: 'Fleet Footwork',
      description_ru: 'Перемещение, атаки и применение заклинаний накапливают заряды энергии. При 100 зарядах следующая атака получает +100% скорости атаки, лечит вас на 15–85 (+30% бонусного AD) (+30% силы умений) и даёт +20% скорости передвижения на 1 сек. При атаке по чемпиону восстанавливает 8% недостающей маны или энергии. Лечение от атак по миньонам/монстрам: 35% (ближний) / 15% (дальний).',
      description_en: 'Moving, attacking and casting build energy. At 100 stacks, your next attack gains +100% Attack Speed, heals for 15–85 (+30% bonus AD) (+30% AP) and grants +20% Move Speed for 1s. On hitting a champion, restore 8% missing mana or energy. Healing is 35% (melee) / 15% (ranged) on minions/monsters.' },

    { id: 'font-of-life', name_ru: 'Источник жизни', name_en: 'Font of Life',
      description_ru: 'Попадание по вражескому чемпиону атакой или способностью метит его. Когда вы или союзники наносите урон помеченным врагам, вы лечите этих союзников и себя. Каждый союзник лечится один раз за метку. Лечение союзников: 3% макс. здоровья + 15% силы умений. Самолечение: 1% макс. здоровья + 5% AD.',
      description_en: 'Hitting an enemy champion with an attack or ability marks them. When you or allies damage marked enemies, those allies and you are healed. Each ally heals once per mark. Ally heal: 3% max health + 15% AP. Self heal: 1% max health + 5% AD.' },

    { id: 'futures-market', name_ru: 'Рынок будущего', name_en: "Future's Market",
      description_ru: 'Вы можете покупать предметы в кредит. Лимит кредита: 145 (+7 за минуту). Покупка в кредит доступна через 2 минуты после начала игры.',
      description_en: 'You can buy items on credit. Credit limit: 145 (+7 per minute). Available 2 minutes into the game.' },

    { id: 'gathering-storm', name_ru: 'Надвигающаяся буря', name_en: 'Gathering Storm',
      description_ru: 'Каждые 3 минуты получайте 2 AD или 4 силы умений, затем 5/10, 9/18, 14/28 (адаптивно, по нарастающей).',
      description_en: 'Every 3 minutes, gain 2 AD or 4 AP, then 5/10, 9/18, 14/28 (adaptive, increasing).' },

    { id: 'giant-slayer', name_ru: 'Убийца гигантов', name_en: 'Giant Slayer',
      description_ru: 'Наносит бонусный урон в зависимости от бонусного здоровья вражеского чемпиона — до +16% урона при 1600 бонусного здоровья у цели.',
      description_en: 'Deals bonus damage based on the enemy champion\'s bonus health — up to +16% damage at 1600 bonus health.' },

    { id: 'glacial-augment', name_ru: 'Ледниковое усиление', name_en: 'Glacial Augment',
      description_ru: 'Попадание по вражескому чемпиону снижает его скорость передвижения на 20% на 1,5 сек (раз в 10 сек на цель). Обездвиживание чемпиона создаёт 3 ледяных луча и замороженную область на 3 сек: скорость передвижения врагов в ней снижена на (1,5% макс. здоровья + 20)%, а наносимый ими урон — на 12%. Перезарядка 20 сек.',
      description_en: 'Hitting an enemy champion slows them by 20% for 1.5s (once per 10s per target). Immobilizing a champion creates 3 icy rays and a frozen zone for 3s: enemies in it are slowed by (1.5% max health + 20)% and deal 12% less damage. 20s cooldown.' },

    { id: 'grasp-of-the-undying', name_ru: 'Хватка бессмертного', name_en: 'Grasp of the Undying',
      description_ru: 'Вступление в бой даёт 1 заряд в секунду в течение 3 сек. После 4 зарядов следующая базовая атака по вражескому чемпиону (в течение 6 сек) тратит их, нанося 2% от вашего макс. здоровья магическим уроном, восстанавливая 2,5% макс. здоровья и навсегда давая +10 здоровья. У дальних чемпионов все эффекты снижены на 40%.',
      description_en: 'Entering combat grants 1 stack per second for 3s. After 4 stacks, your next basic attack on an enemy champion (within 6s) consumes them, dealing 2% max health magic damage, healing 2.5% max health and permanently granting +10 health. Ranged champions get 40% reduced effects.' },

    { id: 'hexflash', name_ru: 'Гекс-рывок', name_en: 'Hexflash',
      description_ru: 'Заменяет «Скачок» на Гекс-рывок, пока «Скачок» на перезарядке. После 2 сек подготовки вы телепортируетесь в новое место. Если подготовка длилась менее 1 сек, рывок будет такой же дальности, как при полной 1-секундной подготовке. Перезарядка 25 сек.',
      description_en: 'Replaces Flash with Hexflash while Flash is on cooldown. After 2s of channeling, teleport to a new location. If channeled less than 1s, dash as far as a full 1s channel. 25s cooldown.' },

    { id: 'ingenious-hunter', name_ru: 'Изобретательный охотник', name_en: 'Ingenious Hunter',
      description_ru: 'Даёт +20 ускорения умений от предметов. Получает +5 ускорения за каждое первое убийство уникального вражеского чемпиона (до 5 зарядов).',
      description_en: 'Grants +20 item Ability Haste. Gains +5 Haste per unique enemy champion takedown (up to 5 stacks).' },

    { id: 'item-crafting', name_ru: 'Создание предметов', name_en: 'Item Crafting',
      description_ru: 'Раз в 3 минуты можно купить 1 предмет вне фонтана, но он будет стоить на 5 золота дороже.',
      description_en: 'Every 3 minutes, you can buy 1 item outside the fountain, but it costs 5 extra gold.' },

    { id: 'ixtali-seedjar', name_ru: 'Семенной кувшин Икстали', name_en: 'Ixtali Seedjar',
      description_ru: 'Растения, по которым вы или союзники наносите удар, сбрасывают семена. Подобранное семя заменяет аксессуар на 60 сек и даёт скорость передвижения. Семя созревает через 1 сек после посадки. Семена доступны через 2 минуты после начала игры. Бонус скорости: 40% (спадает за 2,5 сек). У каждого растения своя перезарядка 45 сек.',
      description_en: 'Plants you or allies hit drop seeds. A picked-up seed replaces your trinket for 60s and grants Move Speed. The seed matures 1s after planting. Seeds available 2 minutes into the game. Move Speed bonus: 40% (decays over 2.5s). Each plant has its own 45s cooldown.' },

    { id: 'last-stand', name_ru: 'Последний рубеж', name_en: 'Last Stand',
      description_ru: 'При здоровье ниже 60% ваши атаки по вражеским чемпионам наносят +5–11% адаптивного урона.',
      description_en: 'Below 60% health, your attacks on enemy champions deal +5–11% adaptive damage.' },

    { id: 'legend-alacrity', name_ru: 'Легенда: проворство', name_en: 'Legend: Alacrity',
      description_ru: '+3% скорости атаки за убийство монстров, вражеских чемпионов и миньонов (до +20% при максимуме зарядов).',
      description_en: '+3% Attack Speed per takedown of monsters, enemy champions and minions (up to +20% at max stacks).' },

    { id: 'legend-bloodline', name_ru: 'Легенда: родословная', name_en: 'Legend: Bloodline',
      description_ru: '+1% физического и магического вампиризма за убийство монстров, вражеских чемпионов и миньонов (до +7% при максимуме зарядов).',
      description_en: '+1% physical and magic vamp per takedown of monsters, enemy champions and minions (up to +7% at max stacks).' },

    { id: 'lethal-tempo', name_ru: 'Смертельный темп', name_en: 'Lethal Tempo',
      description_ru: 'Атаки по вражеским чемпионам накапливают скорость атаки (до 6 зарядов). При максимуме вы получаете бонус к дальности атаки и можете превысить лимит скорости атаки. Каждый заряд даёт +8–16% (ближний) или +3–12% (дальний) скорости атаки на 6 сек. При максимуме: +50 (ближний) или +75 (дальний) дальности атаки.',
      description_en: 'Attacking enemy champions builds Attack Speed (up to 6 stacks). At max, gain bonus attack range and can exceed the Attack Speed cap. Each stack grants +8–16% (melee) or +3–12% (ranged) Attack Speed for 6s. At max: +50 (melee) or +75 (ranged) attack range.' },

    { id: 'loyalty', name_ru: 'Верность', name_en: 'Loyalty',
      description_ru: 'Вы получаете +2 брони и +5 сопротивления магии. Ближайший союзник-чемпион получает +5 брони и +2 сопротивления магии (суммируется).',
      description_en: 'You gain +2 Armor and +5 Magic Resist. Your nearest allied champion gains +5 Armor and +2 Magic Resist (stacks).' },

    { id: 'manaflow-band', name_ru: 'Лента потока маны', name_en: 'Manaflow Band',
      description_ru: 'Попадание по вражескому чемпиону способностью или усиленной атакой увеличивает максимальный запас маны на 30 (до +300).',
      description_en: 'Hitting an enemy champion with an ability or empowered attack increases your max mana by 30 (up to +300).' },

    { id: 'nimbus-cloak', name_ru: 'Плащ нимба', name_en: 'Nimbus Cloak',
      description_ru: 'Применение заклинания призывателя даёт +10–40% скорости передвижения (в зависимости от перезарядки заклинания) на 3 сек.',
      description_en: 'Casting a Summoner Spell grants +10–40% Move Speed (based on the spell\'s cooldown) for 3s.' },

    { id: 'nullifying-orb', name_ru: 'Нейтрализующая сфера', name_en: 'Nullifying Orb',
      description_ru: 'Если урон от чемпиона снижает ваше здоровье ниже 35%, вы получаете щит, поглощающий 60–190 урона (зависит от уровня) на 4 сек. Перезарядка 60 сек.',
      description_en: 'If champion damage drops you below 35% health, gain a shield absorbing 60–190 damage (level-based) for 4s. 60s cooldown.' },

    { id: 'overgrowth', name_ru: 'Буйный рост', name_en: 'Overgrowth',
      description_ru: 'За убийство 1 монстра или 2 миньонов рядом навсегда получаете +3 к макс. здоровью. Максимальное здоровье можно увеличивать бесконечно. При 30 зарядах даётся бонус +3% к макс. здоровью.',
      description_en: 'Killing 1 monster or 2 minions nearby permanently grants +3 max health. Max health can grow indefinitely. At 30 stacks, gain a +3% max health bonus.' },

    { id: 'phase-rush', name_ru: 'Фазовый рывок', name_en: 'Phase Rush',
      description_ru: '3 отдельных попадания или атаки по чемпиону за 3 сек дают +40–60% / +30–50% скорости передвижения (ближний/дальний), +25% ускорения умений и снижают перезарядку текущей базовой способности на 20%. Перезарядка 12 сек.',
      description_en: '3 separate hits or attacks on a champion within 3s grant +40–60% / +30–50% Move Speed (melee/ranged), +25% Ability Haste, and reduce your current basic ability\'s cooldown by 20%. 12s cooldown.' },

    { id: 'psychic-wave', name_ru: 'Психическая волна', name_en: 'Psychic Wave',
      description_ru: 'Следующая атака в течение 4 сек после урона способностью (или следующая способность после урона атакой) вызывает взрыв, наносящий адаптивный урон (22–50 + 15% бонусного AD + 7,5% силы умений) в небольшой области. Дальние чемпионы наносят 70% урона. Перезарядка 6 сек.',
      description_en: 'Your next attack within 4s of dealing ability damage (or your next ability after an attack) triggers a blast dealing adaptive damage (22–50 + 15% bonus AD + 7.5% AP) in a small area. Ranged champions deal 70%. 6s cooldown.' },

    { id: 'revitalize', name_ru: 'Оживление', name_en: 'Revitalize',
      description_ru: 'Лечение и щиты усилены на 5%. Если здоровье цели ниже 40%, эффект усилен дополнительно на 10%.',
      description_en: 'Healing and shielding are increased by 5%. If the target is below 40% health, the effect is increased by an extra 10%.' },

    { id: 'scorch', name_ru: 'Опаление', name_en: 'Scorch',
      description_ru: 'Урон способностью по чемпиону дополнительно наносит 21–49 магического урона через 1 сек. Перезарядка 8 сек.',
      description_en: 'Damaging a champion with an ability deals an extra 21–49 magic damage after 1s. 8s cooldown.' },

    { id: 'second-wind', name_ru: 'Второе дыхание', name_en: 'Second Wind',
      description_ru: 'Восстанавливает 5 здоровья каждые 5 сек. После получения урона от вражеского чемпиона восстанавливает 6 здоровья (+2% недостающего здоровья) в течение следующих 5 сек. Эффект удвоен для ближних чемпионов.',
      description_en: 'Restore 5 health every 5s. After taking damage from an enemy champion, restore 6 health (+2% missing health) over the next 5s. Doubled for melee champions.' },

    { id: 'shield-bash', name_ru: 'Удар щитом', name_en: 'Shield Bash',
      description_ru: 'После получения лечения или щита ваша следующая атака по вражескому чемпиону усилена, нанося +15–50 (+15% бонусного AD) (+10% адаптивной силы умений). Перезарядка 7 сек.',
      description_en: 'After receiving a heal or shield, your next attack on an enemy champion is empowered, dealing +15–50 (+15% bonus AD) (+10% adaptive AP). 7s cooldown.' },

    { id: 'sudden-impact', name_ru: 'Внезапный удар', name_en: 'Sudden Impact',
      description_ru: 'Урон по вражескому чемпиону наносит +10–80 истинного урона после использования рывка, прыжка, телепортации или выхода из невидимости (в течение 4 сек). Ур. 5: +10 истинного урона. Ур. 9: +20 истинного урона и +10% скорости передвижения на 1,5 сек. Перезарядка 10 сек.',
      description_en: 'Damaging an enemy champion deals +10–80 true damage after using a dash, leap, blink, or leaving stealth (within 4s). Lvl 5: +10 true damage. Lvl 9: +20 true damage and +10% Move Speed for 1.5s. 10s cooldown.' },

    { id: 'summon-aery', name_ru: 'Призыв Эйри', name_en: 'Summon Aery',
      description_ru: 'Атаки и способности по вражескому чемпиону отправляют к нему Эйри, нанося 10–60 (зависит от уровня) (+20% бонусного AD) (+10% силы умений) адаптивного урона. Лечение, щит или усиление союзника отправляют к нему Эйри со щитом 20–120 (зависит от уровня) (+40% бонусного AD) (+20% силы умений) на 2 сек. Эйри задерживается на цели 2 сек, затем возвращается к вам и не может быть отправлена снова, пока не вернётся.',
      description_en: 'Attacks and abilities on an enemy champion send Aery to them, dealing 10–60 (level-based) (+20% bonus AD) (+10% AP) adaptive damage. Healing, shielding or buffing an ally sends Aery to them with a 20–120 (level-based) (+40% bonus AD) (+20% AP) shield for 2s. Aery lingers on the target for 2s, then returns and cannot be sent again until it does.' },

    { id: 'sweet-tooth', name_ru: 'Сладкоежка', name_en: 'Sweet Tooth',
      description_ru: 'Увеличивает лечение от медовых фруктов на 20%, а каждый съеденный фрукт приносит 15 золота.',
      description_en: 'Increases Honeyfruit healing by 20%, and each fruit eaten grants 15 gold.' },

    { id: 'tenacity', name_ru: 'Стойкость', name_en: 'Tenacity',
      description_ru: 'Повышает стойкость на 10%. В обездвиженном состоянии получаете +16–30 брони и сопротивления магии на 1,5 сек. Длительность эффекта обновляется при повторном обездвиживании.',
      description_en: 'Increases Tenacity by 10%. While immobilized, gain +16–30 Armor and Magic Resist for 1.5s. Duration refreshes on repeated immobilization.' },

    { id: 'transcendence', name_ru: 'Превосходство', name_en: 'Transcendence',
      description_ru: 'Бонусы при достижении уровней: Ур. 1: +6 ускорения умений. Ур. 5: ещё +6 ускорения умений. Ур. 9: после попадания базовой способностью по цели перезарядка способностей снижается на 10% (перезарядка 8 сек).',
      description_en: 'Bonuses at level milestones: Lvl 1: +6 Ability Haste. Lvl 5: another +6 Ability Haste. Lvl 9: after hitting a target with a basic ability, reduce ability cooldowns by 10% (8s cooldown).' },

    { id: 'triumph', name_ru: 'Триумф', name_en: 'Triumph',
      description_ru: 'Убийство чемпионов восстанавливает 10% потерянного здоровья, а также 10% от максимального запаса маны и энергии.',
      description_en: 'Champion takedowns restore 10% of missing health, plus 10% of max mana and energy.' },

    { id: 'tyrant', name_ru: 'Тиран', name_en: 'Tyrant',
      description_ru: 'Урон по чемпиону со здоровьем ниже 50% наносит +30–50 адаптивного урона (+7,5% AD) (+3,5% силы умений). Перезарядка 10 сек.',
      description_en: 'Damaging a champion below 50% health deals +30–50 adaptive damage (+7.5% AD) (+3.5% AP). 10s cooldown.' },

    { id: 'zombie-ward', name_ru: 'Зомби-тотем', name_en: 'Zombie Ward',
      description_ru: 'После уничтожения вражеского варда на его месте появляется зомби-вард, дающий обзор на 120 сек. Также +3 AD или +6 силы умений (до 5 зарядов). При 5 зарядах — бонус +10 AD или +20 силы умений.',
      description_en: 'After destroying an enemy ward, a Zombie Ward appears in its place, granting vision for 120s. Also +3 AD or +6 AP (up to 5 stacks). At 5 stacks, a +10 AD or +20 AP bonus.' },
  ];

  async function applyAll(col, arr) {
    var ok = 0, miss = 0, fail = 0;
    for (var i = 0; i < arr.length; i++) {
      var e = arr[i];
      var patch = { name_ru: e.name_ru, name_en: e.name_en };
      if (e.description_ru) patch.description_ru = e.description_ru;
      if (e.description_en) patch.description_en = e.description_en;
      try {
        var ref = db.collection(col).doc(e.id);
        var snap = await ref.get();
        if (!snap.exists) { console.warn('  нет в базе:', col, e.id); miss++; continue; }
        await ref.update(patch);
        ok++;
      } catch (err) { console.error('  ошибка', col, e.id, err && err.message); fail++; }
    }
    console.log('=== ' + col + ': обновлено ' + ok + ', нет в базе ' + miss + ', ошибок ' + fail + ' ===');
  }

  console.log('=== СТАРТ миграции переводов ===');
  await applyAll('items', ITEMS);
  await applyAll('runes', RUNES);
  console.log('=== ГОТОВО ===');
})();
