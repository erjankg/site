/**
 * МИГРАЦИЯ: Обновление всех физических предметов в Firestore с rich-text разметкой
 *
 * ЗАПУСК — автоматический:
 *   1. Открой сайт https://pro-wildrift.com/ и войди под админом
 *   2. F12 → Console
 *   3. Вставь весь файл целиком (Ctrl+A в редакторе → Ctrl+C → в консоли Ctrl+V → Enter)
 *   4. Скрипт сам запустит миграцию (не нужно вызывать функцию вручную)
 *   5. Дождись "=== ГОТОВО ===" — в логе будет видно сколько обновлено
 *
 * БЕЗОПАСНОСТЬ:
 *   - Обновляет только: name_ru, name_en, cost, stats, description_ru, description_en
 *   - Не трогает поля category, order, image
 *   - Если предмет не найден в Firestore — пропустит и сообщит в логе
 *   - Требует _isAdmin === true (иначе Firestore правила отклонят запись)
 */

(async function migratePhysicalItemsIIFE() {
  // ═══════════════════════════════════════════════════════════════
  // ДАННЫЕ — физические предметы
  // ═══════════════════════════════════════════════════════════════

  var PHYSICAL_ITEMS = [
  {
    id: 'black-cleaver',
    name_ru: 'Чёрная Секира',
    name_en: 'Black Cleaver',
    cost: '3000 gold',
    stats: '[icon:ad]+40 Сила Атаки  |  [icon:usk]+20 Ускорение Умений  |  [icon:hp]+400 Здоровья',
    description_ru: 'Раскол : Нанесение [физического урона|ad] вражескому чемпиону снижает [icon:arm][броню|armor] на [6%|ms] в течение [6 секунд|ms], эффект обновляется при последующих попаданиях и суммируется [до 4 раз|ms], снижая [icon:arm][броню|armor] на [24%|ms].\n\nПреследование : Базовые атаки при попадании дают [(20/10)|ms] бонус к скорости передвижения на [2 секунды|ms]. Вы также получаете [(40/20)|ms] бонус к скорости передвижения по врагам с максимальным количеством стаков «Раскола».',
    description_en: 'Carve : Dealing [physical damage|ad] to enemy champions reduces their [icon:arm][Armor|armor] by [6%|ms] for [6 seconds|ms], refreshing on subsequent hits and stacking [up to 4 times|ms] for [24%|ms] total Armor reduction.\n\nRage : On-hit basic attacks grant [(20/10)|ms] bonus movement speed for [2 seconds|ms]. You also gain [(40/20)|ms] bonus movement speed against enemies at max Carve stacks.'
  },
  {
    id: 'blade-of-the-ruined-king',
    name_ru: 'Клинок Падшего Короля',
    name_en: 'Blade of the Ruined King',
    cost: '3200 gold',
    stats: '[icon:ad]+25 Сила Атаки  |  [icon:as]+35% Скорость Атаки',
    description_ru: 'Жажда : [+10%|ms] [всестороннего вампиризма|vamp].\n\nИспорченные удары : Базовые атаки наносят [дополнительный физический урон|ad], равный [(10%/7%)|hp] [текущего здоровья цели|hp], минимум [15|ad], максимум [60|ad] по монстрам.\n\nИстощение : 3 базовых удара или способности по чемпиону за [2 секунды|ms] наносят [30–100|magic] (зависит от уровня) [магического урона|magic] и замедляют цель на [25%|ms] на [2 секунды|ms], а вы получаете [25%|ms] бонуса к скорости передвижения на тот же период [(перезарядка 60 секунд)|ms].',
    description_en: 'Thirst : Gain [+10%|ms] [Omnivamp|vamp].\n\nSiphon : Basic attacks deal bonus [physical damage|ad] equal to [(10%/7%)|hp] of the [target current Health|hp], minimum [15|ad], capped at [60|ad] vs monsters.\n\nDrain : 3 basic attacks or abilities on a champion within [2 seconds|ms] deal [30-100|magic] (level-based) [magic damage|magic] and slow target by [25%|ms] for [2 seconds|ms], while granting you [25%|ms] bonus movement speed for the same duration [(60 second cooldown)|ms].'
  },
  {
    id: 'bloodthirster',
    name_ru: 'Кровопийца',
    name_en: 'Bloodthirster',
    cost: '3100 gold',
    stats: '[icon:ad]+55 Сила Атаки  |  [icon:krit]+25% Шанс Крита  |  [icon:hp]+250 Здоровья',
    description_ru: 'Кровавый : Получаете [+8%|ms] [физического вампиризма|vamp]. Критические удары получают [+4%|ms] [физического вампиризма|vamp].',
    description_en: 'Bloodthirst : You gain [+8%|ms] [Physical Vamp|vamp]. Critical strikes gain [+4%|ms] [Physical Vamp|vamp].'
  },
  {
    id: 'chempunk-chainsword',
    name_ru: 'Нож-Пила Химпанк',
    name_en: 'Chempunk Chainsword',
    cost: '2800 gold',
    stats: '[icon:ad]+45 Сила Атаки  |  [icon:usk]+15 Ускорение Умений  |  [icon:hp]+250 Здоровья',
    description_ru: 'Наказание : Нанесение [физического урона|ad] вражеским чемпионам накладывает [50%|ms] [Тяжких ран|dmg] на [3 секунды|ms].',
    description_en: 'Punishment : Dealing [physical damage|ad] to enemy champions inflicts [50%|ms] [Grievous Wounds|dmg] for [3 seconds|ms].'
  },
  {
    id: 'deaths-dance',
    name_ru: 'Танец Смерти',
    name_en: "Death's Dance",
    cost: '3000 gold',
    stats: '[icon:ad]+35 Сила Атаки  |  [icon:usk]+15 Ускорение Умений  |  [icon:arm]+40 Броня',
    description_ru: 'Прижигание : [(27%/12%)|ms] [физического|ad] и [магического урона|magic] от чемпионов превращается в [чистый урон|true] в течение [3 секунд|ms] (треть каждую секунду).\n\nОтрицание : Убийства чемпионов снимают весь накопленный урон от Прижигания и восстанавливают [10%|ms] от [максимального здоровья|hp] за [2 секунды|ms].',
    description_en: 'Ignore Pain : [(27%/12%)|ms] of [physical|ad] and [magic damage|magic] from champions is converted to [true damage|true] over [3 seconds|ms] (one third per second).\n\nDefy : Champion takedowns remove all stored Ignore Pain damage and restore [10%|ms] of [max Health|hp] over [2 seconds|ms].'
  },
  {
    id: 'divine-sunderer',
    name_ru: 'Божественный Разрушитель',
    name_en: 'Divine Sunderer',
    cost: '3400 gold',
    stats: '[icon:ad]+25 Сила Атаки  |  [icon:usk]+25 Ускорение Умений  |  [icon:hp]+425 Здоровья',
    description_ru: 'Заклинатель : После способности следующая базовая атака за [10 секунд|ms] наносит [доп. физ. урон|ad], равный [(10%/7%)|hp] [макс. здоровья цели|hp], минимум [125% базового AD|ad], максимум по монстрам [225% базового AD|ad] [(перезарядка 1,5с)|ms]. Против чемпионов восстанавливает [(6%/2,5%)|hp] [макс. здоровья цели|hp], минимум [(90%/50%) базового AD|ad]. Урон по строениям снижен на [50%|ms].',
    description_en: 'Spellblade : After using an ability, your next basic attack within [10 seconds|ms] deals bonus [physical damage|ad] equal to [(10%/7%)|hp] of the [target max Health|hp], minimum [125% base AD|ad], capped at [225% base AD|ad] vs monsters [(1.5s cooldown)|ms]. Against champions it heals you for [(6%/2.5%)|hp] of [target max Health|hp], minimum [(90%/50%) base AD|ad]. Damage to structures reduced by [50%|ms].'
  },
  {
    id: 'duskblade-of-draktharr',
    name_ru: 'Сумеречный Клинок Драктарра',
    name_en: 'Duskblade of Draktharr',
    cost: '3000 gold',
    stats: '[icon:ad]+55 Сила Атаки  |  [icon:usk]+10 Ускорение Умений',
    description_ru: 'Бритва : [+18|armor] к [пробиванию брони|armor].\n\nНочной охотник : Следующая базовая атака по вражескому чемпиону наносит [60–160|ad] (зависит от уровня) [доп. физ. урона|ad] и замедляет на [99%|ms] на [0,35 секунды|ms] [(перезарядка 10 секунд)|ms]. Убийство чемпиона сбрасывает перезарядку.',
    description_en: 'Razor : Gain [+18|armor] [Armor Penetration|armor].\n\nNightstalker : Your next basic attack against an enemy champion deals [60-160|ad] (level-based) bonus [physical damage|ad] and slows them by [99%|ms] for [0.35 seconds|ms] [(10 second cooldown)|ms]. Champion takedowns reset the cooldown.'
  },
  {
    id: 'eclipse',
    name_ru: 'Затмение',
    name_en: 'Eclipse',
    cost: '3000 gold',
    stats: '[icon:ad]+65 Сила Атаки  |  [icon:usk]+20 Ускорение Умений',
    description_ru: 'Вечная восходящая луна : При попадании по вражескому чемпиону накладывается стак на [1,8 секунды|ms] (не чаще 1 раза за атаку/способность на каждого чемпиона). При [2 стаках|ms]: наносит [доп. физ. урон|ad] [(6%/3%)|hp] [макс. здоровья цели|hp], даёт [щит|heal] [(140/70)|heal] + [(35%/18%) бонусного AD|ad] на [2 секунды|ms] [(перезарядка 6 секунд)|ms]. Учитываются атаки, способности, предметы, КК и периодический урон.',
    description_en: 'Ever Rising Moon : Hitting an enemy champion applies a stack for [1.8 seconds|ms] (max once per attack/ability per champion). At [2 stacks|ms]: deals bonus [physical damage|ad] equal to [(6%/3%)|hp] of [target max Health|hp], and grants a [shield|heal] of [(140/70)|heal] + [(35%/18%) bonus AD|ad] for [2 seconds|ms] [(6 second cooldown)|ms]. Counts attacks, abilities, items, CC and periodic damage.'
  },
  {
    id: 'edge-of-night',
    name_ru: 'Грань Ночи',
    name_en: 'Edge of Night',
    cost: '3150 gold',
    stats: '[icon:ad]+50 Сила Атаки  |  [icon:hp]+250 Здоровья',
    description_ru: 'Пробитие брони : [+8|armor] к [бронепробиваемости|armor].\n\nАннулирование : Даёт магический щит, блокирующий следующую вражескую способность.',
    description_en: 'Annul : Gain [+8|armor] [Armor Penetration|armor].\n\nNullify : Grants a magic shield that blocks the next enemy ability.'
  },
  {
    id: 'essence-reaver',
    name_ru: 'Похититель Сущности',
    name_en: 'Essence Reaver',
    cost: '3000 gold',
    stats: '[icon:ad]+35 Сила Атаки  |  [icon:usk]+20 Ускорение Умений  |  [icon:krit]+25% Шанс Крита',
    description_ru: 'Заклинатель : Применение способностей генерирует заряд на [10 секунд|ms] (обновляется, макс. [3 стака|ms], каждая уникальная способность раз в [2 секунды|ms]). Базовые атаки расходуют заряд: наносят [90% бонусного AD|ad] [физ. урона|ad] и дают [40 скорости передвижения|ms] на [2 секунды|ms]. Урон зависит от [критического удара|crit].\n\nПоглощение маны : Базовые атаки восстанавливают [3%|mana] [недостающей маны|mana].',
    description_en: 'Spellblade : Casting abilities generates a charge for [10 seconds|ms] (refreshing, max [3 stacks|ms], each unique ability once per [2 seconds|ms]). Basic attacks consume a charge: dealing [90% bonus AD|ad] [physical damage|ad] and granting [40 movement speed|ms] for [2 seconds|ms]. Damage scales with [Critical Strike|crit].\n\nMana Siphon : Basic attacks restore [3%|mana] of [missing Mana|mana].'
  },
  {
    id: 'experimental-hexplate',
    name_ru: 'Экспериментальная Гексплатина',
    name_en: 'Experimental Hexplate',
    cost: '3000 gold',
    stats: '[icon:hp]+400 Здоровья  |  [icon:ad]+35 Сила Атаки  |  [icon:as]+20% Скорость Атаки',
    description_ru: 'Заряженный : Получите [20 единиц|ms] [ускорения ультимативной способности|usk].\n\nПерегрузка : После ультимативной способности получаете [40%|ms] ([20%|ms] для дальнего боя) [скорости атаки|as] и [20%|ms] ([10%|ms] для дальнего боя) скорости передвижения на [8 секунд|ms] [(перезарядка 30 секунд)|ms].',
    description_en: 'Capacitor : Gain [20|ms] [Ultimate Haste|usk].\n\nOverdrive : After casting your Ultimate, gain [40%|ms] ([20%|ms] ranged) [Attack Speed|as] and [20%|ms] ([10%|ms] ranged) movement speed for [8 seconds|ms] [(30 second cooldown)|ms].'
  },
  {
    id: 'guardian-angel',
    name_ru: 'Ангел-Хранитель',
    name_en: 'Guardian Angel',
    cost: '3400 gold',
    stats: '[icon:ad]+40 Сила Атаки  |  [icon:arm]+40 Броня',
    description_ru: 'Воскрешение : После получения смертельного урона переходите в стазис на [4 секунды|ms] [(перезарядка 210 секунд)|ms]. После этого восстанавливаете [50%|ms] от [базового здоровья|hp] и [30%|ms] от [максимального запаса маны|mana].',
    description_en: 'Rebirth : Upon taking lethal damage, enter stasis for [4 seconds|ms] [(210 second cooldown)|ms]. After stasis ends, restore [50%|ms] of [base Health|hp] and [30%|ms] of [maximum Mana|mana].'
  },
  {
    id: 'guinsoos-rageblade',
    name_ru: 'Клинок Ярости Гинсу',
    name_en: "Guinsoo's Rageblade",
    cost: '3100 gold',
    stats: '[icon:as]+30% Скорость Атаки',
    description_ru: 'Всплеск : [+5%|ms] к скорости передвижения.\n\nХаос : Получите [25|ad] [Урона от атаки|ad] или [50|ap] [Силы умений|ap] (адаптивно).\n\nГнев : Атаки наносят на [30%|ms] больше [магического урона|magic], но больше не являются критическими. За каждый [1%|crit] [шанса крита|crit] от предметов — [магический урон|magic] увеличивается на [1,5|magic] (макс. [+75|magic] при [50% крита|crit]).\n\nКипящий удар : Атаки дают [8%|as] к [скорости атаки|as] (макс. [4 стака|ms] = [32%|as]). При максимуме каждые 3 атаки дополнительно активируют эффекты при попадании.',
    description_en: "Burst : [+5%|ms] movement speed.\n\nChaos : Gain [25|ad] [Attack Damage|ad] or [50|ap] [Ability Power|ap] (adaptive).\n\nRage : Attacks deal [30%|ms] more [magic damage|magic] but can no longer crit. For every [1%|crit] [Crit Chance|crit] from items, [magic damage|magic] increases by [1.5|magic] (max [+75|magic] at [50% crit|crit]).\n\nSeething Strike : Attacks grant [8%|as] [Attack Speed|as] (max [4 stacks|ms] = [32%|as]). At max stacks, every 3rd attack additionally triggers on-hit effects."
  },
  {
    id: 'hullbreaker',
    name_ru: 'Разрушитель Корпуса',
    name_en: 'Hullbreaker',
    cost: '3100 gold',
    stats: '[icon:ad]+55 Сила Атаки  |  [icon:hp]+325 Здоровья',
    description_ru: 'Отплытие : [+5%|ms] бонус к скорости передвижения.\n\nШкипер : Базовые атаки генерируют до [4 зарядов|ms], расходуемых на [доп. физ. урон|ad] ([40%|ms] для стрелков). По чемпионам/эпическим монстрам: [160% базового AD|ad] + [5% макс. здоровья|hp]. По башням: [240% базового AD|ad] + [9% макс. здоровья|hp].\n\nАбордажная группа : Пока нет союзных чемпионов рядом — получаете [(4–50/2–25)|armor] [бонусной брони|armor], [(4–20/2–10)|magic] [магрез|magic] и наносите на [20%|ms] больше урона по башням. Ближайшие осадные и суперминьоны получают [(40–170/20–80)|armor] [брони|armor], [(20–85/10–40)|magic] [магрез|magic], [+10%|ms] размера и [+200%|ms] урона по башням.',
    description_en: 'Set Sail : [+5%|ms] bonus movement speed.\n\nSkipper : Basic attacks generate up to [4 stacks|ms], spent on bonus [physical damage|ad] ([40%|ms] for ranged). Against champions/epic monsters: [160% base AD|ad] + [5% max Health|hp]. Against towers: [240% base AD|ad] + [9% max Health|hp].\n\nBoarding Party : While no allied champions are nearby — gain [(4-50/2-25)|armor] bonus [Armor|armor], [(4-20/2-10)|magic] [Magic Resist|magic] and deal [20%|ms] more damage to towers. Nearby siege and super minions gain [(40-170/20-80)|armor] [Armor|armor], [(20-85/10-40)|magic] [Magic Resist|magic], [+10%|ms] size, and [+200%|ms] damage to towers.'
  },
  {
    id: 'immortal-shieldbow',
    name_ru: 'Бессмертный Щитовой Лук',
    name_en: 'Immortal Shieldbow',
    cost: '3000 gold',
    stats: '[icon:ad]+40 Сила Атаки  |  [icon:as]+15% Скорость Атаки  |  [icon:krit]+25% Шанс Крита  |  +5% [Физ. Вампиризм|vamp]',
    description_ru: 'Спасательная линия : При получении урона, снижающего [здоровье|hp] ниже [35%|hp] от максимального, сначала получаете [щит|heal] [250–550|heal] (зависит от уровня) на [5 секунд|ms] [(перезарядка 90 секунд)|ms].\n\nБоевая ярость : Активация «Ловушки жизни» даёт [8%|ms] [физического вампиризма|vamp] на [8 секунд|ms].',
    description_en: 'Lifeline : Upon taking damage that reduces [Health|hp] below [35%|hp] of maximum, first gain a [shield|heal] of [250-550|heal] (level-based) for [5 seconds|ms] [(90 second cooldown)|ms].\n\nFury : Triggering Lifeline grants [8%|ms] [Physical Vamp|vamp] for [8 seconds|ms].'
  },
  {
    id: 'infinity-edge',
    name_ru: 'Грань Бесконечности',
    name_en: 'Infinity Edge',
    cost: '3400 gold',
    stats: '[icon:ad]+60 Сила Атаки  |  [icon:krit]+25% Шанс Крита',
    description_ru: 'Бесконечность : [+30%|crit] к [урону от критических ударов|crit].\n\nПредел прорыва : Каждый [1%|crit] [шанса крита|crit] свыше [100%|crit] преобразуется в [0,6%|crit] [урона от критического удара|crit].',
    description_en: 'Infinity : [+30%|crit] [Critical Damage|crit].\n\nBreakpoint : Each [1%|crit] of [Critical Chance|crit] above [100%|crit] converts to [0.6%|crit] [Critical Damage|crit].'
  },
  {
    id: 'kraken-slayer',
    name_ru: 'Убийца Кракена',
    name_en: 'Kraken Slayer',
    cost: '3000 gold',
    stats: '[icon:ad]+40 Сила Атаки  |  [icon:as]+30% Скорость Атаки',
    description_ru: 'Облачная походка : [+5%|ms] к скорости передвижения.\n\nСокруши его : Каждая третья атака наносит [120–160|ad] ([110–150|ad] для дальнего боя) [доп. физ. урона|ad] (зависит от уровня), увеличивающегося до [50%|hp] от [недостающего здоровья цели|hp].',
    description_en: 'Cloud Walking : [+5%|ms] movement speed.\n\nBring It Down : Every third attack deals [120-160|ad] ([110-150|ad] for ranged) bonus [physical damage|ad] (level-based), increasing up to [50%|hp] based on [target missing Health|hp].'
  },
  {
    id: 'magnetic-blaster',
    name_ru: 'Магнитный Бластер',
    name_en: 'Magnetic Blaster',
    cost: '3000 gold',
    stats: '[icon:ad]+25 Сила Атаки  |  [icon:as]+25% Скорость Атаки  |  [icon:krit]+25% Шанс Крита',
    description_ru: 'Овердрайв : [+5%|ms] к скорости передвижения.\n\nМощный взрыв : Перемещение и атака генерируют Энергетические атаки. Они увеличивают дальность на [100|ms] ([50|ms] для ближнего боя), наносят [40–100|magic] [доп. маг. урона|magic] и дают [60|ms] скорости передвижения на [0,75 секунды|ms]. Урон отражается от 5 ближайших врагов, может быть [критическим|crit]. ([50%–80%|ms] [доп. урона миньонам|dmg])',
    description_en: 'Overdrive : [+5%|ms] movement speed.\n\nPower Burst : Moving and attacking generate Energized attacks. They increase range by [100|ms] ([50|ms] for melee), deal [40-100|magic] bonus [magic damage|magic] and grant [60|ms] movement speed for [0.75 seconds|ms]. Damage bounces to 5 nearby enemies, can [crit|crit]. ([50%-80%|ms] bonus [damage to minions|dmg])'
  },
  {
    id: 'manamune',
    name_ru: 'Манамуне',
    name_en: 'Manamune',
    cost: '2700 gold',
    stats: '[icon:ad]+25 Сила Атаки  |  [icon:usk]+20 Ускорение Умений  |  [icon:mana]+300 Маны',
    description_ru: 'Благоговение : [Бонус к урону от атаки|ad] = [1,5%|mana] от [макс. маны|mana]. Возвращает [15%|mana] потраченной маны.\n\nЗаряд маны : Генерирует заряд каждые [3,3 секунды|ms] (макс. [3 заряда|ms]). Базовая атака или расход маны потребляет заряд и даёт [+18 маны|mana] (макс. [700 маны|mana]). Превращается в Мурамана при [+700 маны|mana].',
    description_en: 'Awe : [Bonus Attack Damage|ad] = [1.5%|mana] of [max Mana|mana]. Refunds [15%|mana] of Mana spent.\n\nMana Charge : Generates a charge every [3.3 seconds|ms] (max [3 charges|ms]). Basic attacks or Mana spend consume a charge and grant [+18 Mana|mana] (max [700 Mana|mana]). Transforms into Muramana at [+700 Mana|mana].'
  },
  {
    id: 'maw-of-malmortius',
    name_ru: 'Пасть Мальмортиуса',
    name_en: 'Maw of Malmortius',
    cost: '3000 gold',
    stats: '[icon:ad]+55 Сила Атаки  |  [icon:usk]+10 Ускорение Умений  |  [icon:mrez]+45 Сопротивление Магии',
    description_ru: 'Спасательная линия : При получении [магического урона|magic], снижающего [здоровье|hp] ниже [35%|hp], получаете [10%|ms] [всестороннего вампиризма|vamp] до конца боя и [магический щит|heal] [220–530|heal] на [3 секунды|ms] [(перезарядка 90 секунд)|ms].',
    description_en: 'Lifeline : Upon taking [magic damage|magic] that reduces [Health|hp] below [35%|hp], gain [10%|ms] [Omnivamp|vamp] until the end of combat and a [magic shield|heal] of [220-530|heal] for [3 seconds|ms] [(90 second cooldown)|ms].'
  },
  {
    id: 'mortal-reminder',
    name_ru: 'Смертельное Напоминание',
    name_en: 'Mortal Reminder',
    cost: '3300 gold',
    stats: '[icon:ad]+25 Сила Атаки  |  [icon:as]+15% Скорость Атаки  |  [icon:krit]+25% Шанс Крита',
    description_ru: 'Последний шёпот : [+30%|armor] к [пробиванию брони|armor]. Критические удары получают [+6%|armor] к [пробиванию брони|armor].\n\nСепсис : Нанесение [физического урона|ad] вражеским чемпионам накладывает [50%|ms] [Тяжких ран|dmg] на [3 секунды|ms].',
    description_en: 'Last Whisper : [+30%|armor] [Armor Penetration|armor]. Critical strikes gain [+6%|armor] [Armor Penetration|armor].\n\nSepsis : Dealing [physical damage|ad] to enemy champions inflicts [50%|ms] [Grievous Wounds|dmg] for [3 seconds|ms].'
  },
  {
    id: 'muramana',
    name_ru: 'Мурамана',
    name_en: 'Muramana',
    cost: '2700 gold',
    stats: '[icon:ad]+25 Сила Атаки  |  [icon:usk]+20 Ускорение Умений  |  [icon:mana]+1000 Маны',
    description_ru: 'Благоговение : [Бонус к урону от атаки|ad] = [2%|mana] от [макс. маны|mana]. Возвращает [15%|mana] потраченной маны.\n\nШок : Базовые атаки по чемпионам наносят [доп. физ. урон|ad] = [2,5%|mana] [текущей маны|mana] и расходуют ту же ману. Урон способностей по чемпионам наносит [доп. физ. урон|ad] = [4%|mana] [текущей маны|mana] + [6% AD|ad] и расходует ту же ману. Срабатывает раз за сеанс при мане [>20%|mana].',
    description_en: 'Awe : [Bonus Attack Damage|ad] = [2%|mana] of [max Mana|mana]. Refunds [15%|mana] of Mana spent.\n\nShock : Basic attacks against champions deal bonus [physical damage|ad] = [2.5%|mana] of [current Mana|mana] and consume that Mana. Ability damage against champions deals bonus [physical damage|ad] = [4%|mana] of [current Mana|mana] + [6% AD|ad] and consumes that Mana. Triggers once per cast at Mana [>20%|mana].'
  },
  {
    id: 'navori-quickblades',
    name_ru: 'Навори Квикблейдс',
    name_en: 'Navori Quickblades',
    cost: '3000 gold',
    stats: '[icon:ad]+40 Сила Атаки  |  [icon:as]+15% Скорость Атаки  |  [icon:krit]+25% Шанс Крита',
    description_ru: 'Ловкие удары : [Критические удары|crit] базовыми атаками уменьшают оставшееся время восстановления базовых способностей на [15%|usk].\n\nНепостоянство : Ваши способности наносят от [0%|ms] до [9%|ms] [доп. урона|dmg] (в зависимости от [шанса крита|crit]).',
    description_en: 'Deft Strikes : [Critical strike|crit] basic attacks reduce remaining cooldown of your basic abilities by [15%|usk].\n\nImpermanence : Your abilities deal [0%|ms] to [9%|ms] bonus [damage|dmg] (scaling with [Critical Chance|crit]).'
  },
  {
    id: 'phantom-dancer',
    name_ru: 'Призрачный Танцор',
    name_en: 'Phantom Dancer',
    cost: '2900 gold',
    stats: '[icon:ad]+20 Сила Атаки  |  [icon:as]+40% Скорость Атаки  |  [icon:krit]+25% Шанс Крита',
    description_ru: 'Быстрые ноги : [+5%|ms] к скорости передвижения.\n\nПризрачный вальс : При попадании атаки дают [25%|as] к [скорости атаки|as] и [7%|ms] к скорости передвижения на [6 секунд|ms] (эффекты не суммируются; [перезарядка 10 секунд|ms], уменьшается на [1 секунду|ms] при каждом попадании).',
    description_en: 'Lightfoot : [+5%|ms] movement speed.\n\nSpectral Waltz : On-hit attacks grant [25%|as] [Attack Speed|as] and [7%|ms] movement speed for [6 seconds|ms] (does not stack; [10 second cooldown|ms], reduced by [1 second|ms] on each hit).'
  },
  {
    id: 'runaans-hurricane',
    name_ru: 'Ураган Рунаана',
    name_en: "Runaan's Hurricane",
    cost: '3000 gold',
    stats: '[icon:as]+35% Скорость Атаки  |  [icon:krit]+25% Шанс Крита',
    description_ru: 'Ярость Ветра : Базовые атаки при попадании выпускают доп. снаряды по двум врагам перед вами, каждый наносит [55% физ. урона от AD|ad], накладывает эффекты при попадании со [100% эффективностью|ms] и подвержен модификаторам [крита|crit].\n\nКлинок Ветра : Базовые атаки наносят [15|ad] [доп. физ. урона|ad] при попадании.',
    description_en: "Wind's Fury : On-hit basic attacks fire bolts at up to 2 nearby enemies, each dealing [55% AD physical damage|ad], applying on-hit effects at [100% effectiveness|ms] and able to [critically strike|crit].\n\nWind's Edge : Basic attacks deal [15|ad] bonus [physical damage|ad] on hit."
  },
  {
    id: 'serpents-fang',
    name_ru: 'Змеиный Клык',
    name_en: "Serpent's Fang",
    cost: '2800 gold',
    stats: '[icon:ad]+50 Сила Атаки  |  [icon:usk]+10 Ускорение Умений',
    description_ru: 'Колющий удар : [+15|armor] к [пробиванию брони|armor].\n\nПохититель щитов : Нанесение урона вражескому чемпиону накладывает эффект на [3 секунды|ms], уменьшая силу его активного [щита|heal] и [щитов|heal], которые он получает. Ближний бой: [40%|heal] (+ [10%|heal] за каждые [100 бонусного AD|ad]), макс. [60%|heal]. Дальний бой: [25%|heal] (+ [10%|heal] за каждые [100 бонусного AD|ad]), макс. [45%|heal].',
    description_en: 'Pierce : Gain [+15|armor] [Armor Penetration|armor].\n\nShield Reaver : Damaging an enemy champion applies an effect for [3 seconds|ms], reducing the power of their active [shield|heal] and any [shields|heal] they gain. Melee: [40%|heal] (+ [10%|heal] per [100 bonus AD|ad]), max [60%|heal]. Ranged: [25%|heal] (+ [10%|heal] per [100 bonus AD|ad]), max [45%|heal].'
  },
  {
    id: 'seryldas-grudge',
    name_ru: 'Обида Серильды',
    name_en: "Serylda's Grudge",
    cost: '3300 gold',
    stats: '[icon:ad]+40 Сила Атаки  |  [icon:usk]+15 Ускорение Умений',
    description_ru: 'Последний шёпот : [+33%|armor] [пробивания брони|armor].\n\nЛедяной : Урон от способностей и усиленные атаки замедляют на [30%|ms] на [1 секунду|ms].\n\nЛедяной укус : Ледяной эффект накладывает стак на [6 секунд|ms] (макс. [3 стака|ms]). При [3 стаках|ms] расходуется: наносит [12–40|ad] (зависит от уровня) [(+40% бонусного AD)|ad] [физ. урона|ad] каждые [0,25 секунды|ms] в течение [2 секунд|ms] и [50%|ms] [Тяжких ран|dmg] на [3 секунды|ms] [(перезарядка 5 секунд)|ms].',
    description_en: 'Last Whisper : [+33%|armor] [Armor Penetration|armor].\n\nIcy : Ability damage and empowered attacks slow by [30%|ms] for [1 second|ms].\n\nFrostbite : Icy effect applies a stack for [6 seconds|ms] (max [3 stacks|ms]). At [3 stacks|ms] consume them: deals [12-40|ad] (level-based) [(+40% bonus AD)|ad] [physical damage|ad] every [0.25 seconds|ms] for [2 seconds|ms] and inflicts [50%|ms] [Grievous Wounds|dmg] for [3 seconds|ms] [(5 second cooldown)|ms].'
  },
  {
    id: 'soul-transfer',
    name_ru: 'Передача Души',
    name_en: 'Soul Transfer',
    cost: '3200 gold',
    stats: '[icon:ad]+25 Сила Атаки  |  [icon:as]+30% Скорость Атаки  |  [icon:krit]+25% Шанс Крита',
    description_ru: 'Танец теней : [Критические удары|crit] по чемпиону или эпическому монстру призывают Тень на [4 секунды|ms], атакующую ближайших врагов. Она наследует [20% AD|ad] и [30% шанса крита|crit] как [скорость атаки|as]. Можно иметь до [двух Теней|ms]. Тени на расстоянии [>600 единиц|ms] исчезают.',
    description_en: 'Shadow Dance : [Critical strikes|crit] against champions or epic monsters summon a Shadow for [4 seconds|ms] that attacks nearby enemies. It inherits [20% AD|ad] and [30% Crit Chance|crit] as [Attack Speed|as]. Can have up to [2 Shadows|ms]. Shadows beyond [600 units|ms] disappear.'
  },
  {
    id: 'spear-of-shojin',
    name_ru: 'Копьё Сёдзина',
    name_en: 'Spear of Shojin',
    cost: '3100 gold',
    stats: '[icon:ad]+45 Сила Атаки  |  [icon:hp]+450 Здоровья',
    description_ru: 'Драконья сила : Получите [25 единиц|ms] [ускорения базовых способностей|usk].\n\nСфокусированная воля : Нанесение урона монстрам или врагам способностями увеличивает [урон от способностей|dmg] и пассивных умений на [3%|ms] на [6 секунд|ms] (суммируется [4 раза|ms]).',
    description_en: 'Dragonforce : Gain [25|ms] [Basic Ability Haste|usk].\n\nFocused Will : Dealing damage with abilities to monsters or enemies increases your [ability and passive damage|dmg] by [3%|ms] for [6 seconds|ms] (stacks [4 times|ms]).'
  },
  {
    id: 'stormrazor',
    name_ru: 'Штормрейзор',
    name_en: 'Stormrazor',
    cost: '3000 gold',
    stats: '[icon:ad]+40 Сила Атаки  |  [icon:as]+20% Скорость Атаки  |  [icon:krit]+25% Шанс Крита',
    description_ru: 'Заряд энергии : Движения и базовые атаки генерируют заряды энергии (макс. [100|ms]).\n\nГромострел : При максимальных зарядах следующая базовая атака расходует их: наносит [65–135|magic] (зависит от уровня) [доп. маг. урона|magic], замедляет на [50%|ms] на [0,75 секунды|ms] и даёт [45 доп. скорости передвижения|ms] на [0,75 секунды|ms].',
    description_en: 'Energized : Moving and basic attacks generate Energized charges (max [100|ms]).\n\nStormarrow : At max charges, your next basic attack consumes them: dealing [65-135|magic] (level-based) bonus [magic damage|magic], slowing by [50%|ms] for [0.75 seconds|ms] and granting [45 bonus movement speed|ms] for [0.75 seconds|ms].'
  },
  {
    id: 'terminus',
    name_ru: 'Терминус',
    name_en: 'Terminus',
    cost: '3400 gold',
    stats: '[icon:ad]+35 Сила Атаки  |  [icon:as]+30% Скорость Атаки',
    description_ru: 'Тень : Базовая атака наносит [35|magic] [доп. магического урона|magic] при попадании.\n\nСопоставление : Базовые атаки по чемпионам чередуются между ударами Света и Тьмы (бонус [5 секунд|ms], макс. [3 стака|ms]). Удары Света: [5–8|armor] (зависит от уровня) [брони|armor] и [магрез|magic]. Удары Тьмы: [11%|armor] [пробивания брони|armor] и [магрез пробивания|magic]. При максимуме обоих — [15–24|armor] [брони|armor]/[магрез|magic] и [33%|armor] [пробивания|armor]. Бонус к пробиванию ограничен [40%|armor].',
    description_en: 'Shadow : On-hit basic attacks deal [35|magic] bonus [magic damage|magic].\n\nJuxtaposition : Basic attacks against champions alternate between Light and Dark stacks ([5 seconds|ms] duration, max [3 stacks|ms]). Light: [5-8|armor] (level-based) [Armor|armor] and [Magic Resist|magic]. Dark: [11%|armor] [Armor Penetration|armor] and [Magic Penetration|magic]. At max of both — [15-24|armor] [Armor|armor]/[Magic Resist|magic] and [33%|armor] [Penetration|armor]. Penetration capped at [40%|armor].'
  },
  {
    id: 'the-collector',
    name_ru: 'Коллекционер',
    name_en: 'The Collector',
    cost: '2900 gold',
    stats: '[icon:ad]+45 Сила Атаки  |  [icon:krit]+25% Шанс Крита',
    description_ru: 'Убийца : [+10|armor] к [пробиванию брони|armor].\n\nСмерть и налоги : Урон, снижающий [здоровье|hp] чемпиона ниже [4%|hp] от максимального [(+2% от шанса крита)|crit] — казнит его. За убийство чемпиона получаете [+25|ms] золота и навсегда увеличиваете порог казни на [0,1%|ms].',
    description_en: 'Death Mark : Gain [+10|armor] [Armor Penetration|armor].\n\nDeath and Taxes : Damage that reduces an enemy champion\'s [Health|hp] below [4%|hp] of maximum [(+2% per Crit Chance)|crit] executes them. Killing a champion grants [+25|ms] gold and permanently increases the execute threshold by [0.1%|ms].'
  },
  {
    id: 'trinity-force',
    name_ru: 'Тринити Форс',
    name_en: 'Trinity Force',
    cost: '3333 gold',
    stats: '[icon:ad]+30 Сила Атаки  |  [icon:usk]+25 Ускорение Умений  |  [icon:as]+30% Скорость Атаки  |  [icon:hp]+250 Здоровья',
    description_ru: 'Рвение : [+5%|ms] к скорости передвижения.\n\nЗаклинатель клинков : После способности следующая базовая атака за [10 секунд|ms] наносит [доп. физ. урон|ad] = [200% базового AD|ad] [(перезарядка 1,5с)|ms]. Урон снижен до [50%|ms] по строениям.\n\nДоблесть : Базовые атаки дают [(20/10)|ms] скорости передвижения на [2 секунды|ms]. Убийство юнита даёт [(60/30)|ms] скорости. Бонусы не суммируются.',
    description_en: 'Zeal : [+5%|ms] movement speed.\n\nSpellblade : After casting an ability, your next basic attack within [10 seconds|ms] deals bonus [physical damage|ad] = [200% base AD|ad] [(1.5s cooldown)|ms]. Damage reduced to [50%|ms] against structures.\n\nValor : Basic attacks grant [(20/10)|ms] movement speed for [2 seconds|ms]. Unit kills grant [(60/30)|ms] movement speed. Bonuses do not stack.'
  },
  {
    id: 'wits-end',
    name_ru: 'Конец Остроумия',
    name_en: "Wit's End",
    cost: '2800 gold',
    stats: '[icon:mrez]+45 Сопротивление Магии  |  [icon:as]+45% Скорость Атаки',
    description_ru: 'На грани отчаяния : Базовые атаки наносят [10–55|magic] (зависит от уровня) [доп. магического урона|magic] при попадании. Пока [здоровье|hp] ниже [50%|hp] от максимального, восстанавливаете [(100%/33%)|heal] урона, который вражеские чемпионы получают от этого эффекта.',
    description_en: 'Edge of Insanity : Basic attacks deal [10-55|magic] (level-based) bonus [magic damage|magic] on hit. While [Health|hp] is below [50%|hp] of maximum, restore [(100%/33%)|heal] of the damage enemy champions take from this effect.'
  },
  {
    id: 'youmuus-ghostblade',
    name_ru: 'Призрачный Клинок Йомуу',
    name_en: "Youmuu's Ghostblade",
    cost: '3000 gold',
    stats: '[icon:ad]+55 Сила Атаки  |  [icon:usk]+15 Ускорение Умений',
    description_ru: 'Срез : [+15|armor] к [пробиванию брони|armor].\n\nИмпульс : Движение генерирует заряды Импульса (расходуются базовыми атаками; исчезают при замедлении). Каждый заряд = [0,4 скорости передвижения|ms] (макс. [100 зарядов|ms] = [40 скорости|ms]).\n\nПризрачная скорость : Атаки при максимальном Импульсе дают [25%|as] к [скорости атаки|as] на [4 секунды|ms].',
    description_en: 'Haunt : Gain [+15|armor] [Armor Penetration|armor].\n\nWraith : Movement generates Wraith stacks (consumed by basic attacks; lost when slowed). Each stack = [0.4 movement speed|ms] (max [100 stacks|ms] = [40 movement speed|ms]).\n\nSpectral Speed : Attacks at max Wraith grant [25%|as] [Attack Speed|as] for [4 seconds|ms].'
  },
  {
    id: 'steraks-gage',
    name_ru: 'Стерак',
    name_en: "Sterak's Gage",
    cost: '3200 gold',
    stats: '[icon:hp]+400 Здоровья',
    description_ru: 'Тяжёлая рука : [+AD|ad] = [50% базового AD|ad].\n\nСпасательная линия : При [HP|hp] [<35%|hp] — [щит|heal] [75% бонусного HP|heal] на [3 секунды|ms] [(перезарядка 90 секунд)|ms].\n\nЯрость Стерака : Активация щита → +размер и [+30%|ms] стойкости на [8 секунд|ms].',
    description_en: "Heavy Hand : Gain [+AD|ad] = [50% base AD|ad].\n\nLifeline : At [HP|hp] [<35%|hp] — [shield|heal] of [75% bonus HP|heal] for [3 seconds|ms] [(90 second cooldown)|ms].\n\nSterak's Fury : Triggering the shield → +size and [+30%|ms] Tenacity for [8 seconds|ms]."
  },
  {
    id: 'titanic-hydra',
    name_ru: 'Титаник Гидра',
    name_en: 'Titanic Hydra',
    cost: '3000 gold',
    stats: '[icon:ad]+40 Сила Атаки  |  [icon:hp]+450 Здоровья',
    description_ru: 'Рассечение : Следующая атака наносит [25|ad] [(+ 3% бонусного HP)|hp] [физ. урона|ad] цели + [80|ad] [(+ 10% бонусного HP)|hp] [физ. урона|ad] в конусе [550|ms]. Дальние: [75%|ms]. [(Перезарядка 1,75с)|ms].',
    description_en: 'Cleave : Your next attack deals [25|ad] [(+ 3% bonus HP)|hp] [physical damage|ad] to the target + [80|ad] [(+ 10% bonus HP)|hp] [physical damage|ad] in a [550|ms] cone. Ranged: [75%|ms]. [(1.75s cooldown)|ms].'
  }
  ];

  // ═══════════════════════════════════════════════════════════════
  // АВТО-ЗАПУСК
  // ═══════════════════════════════════════════════════════════════

  if (!window.firebase || !firebase.firestore) {
    console.error('❌ Firebase не загружен. Открой главную страницу сайта сначала.');
    return;
  }
  if (!window._isAdmin) {
    console.error('❌ Ты не админ (_isAdmin = ' + window._isAdmin + '). Firestore правила отклонят запись.');
    console.error('   Восстанови isAdmin: true в users/<твой uid> через Firebase Console.');
    return;
  }

  var db = firebase.firestore();
  var updated = 0;
  var skipped = 0;
  var errors = 0;

  console.log('═══════════════════════════════════════');
  console.log('🚀 МИГРАЦИЯ ФИЗИЧЕСКИХ ПРЕДМЕТОВ');
  console.log('═══════════════════════════════════════');
  console.log('В очереди: ' + PHYSICAL_ITEMS.length + ' предметов');

  for (var i = 0; i < PHYSICAL_ITEMS.length; i++) {
    var item = PHYSICAL_ITEMS[i];
    try {
      var docRef = db.collection('items').doc(item.id);
      var snap = await docRef.get();
      if (!snap.exists) {
        console.warn('  ⊘ ' + item.id + ' — не найден в Firestore, пропускаю');
        skipped++;
        continue;
      }
      await docRef.update({
        name_ru: item.name_ru,
        name_en: item.name_en,
        cost: item.cost,
        stats: item.stats,
        description_ru: item.description_ru,
        description_en: item.description_en
      });
      console.log('  ✓ [' + (i + 1) + '/' + PHYSICAL_ITEMS.length + '] ' + item.id + ' — ' + item.name_ru);
      updated++;
    } catch (err) {
      console.error('  ✗ ' + item.id + ' — ошибка: ' + err.message);
      errors++;
    }
  }

  console.log('═══════════════════════════════════════');
  console.log('✅ === ГОТОВО ===');
  console.log('   Обновлено: ' + updated);
  console.log('   Пропущено: ' + skipped);
  console.log('   Ошибок:    ' + errors);
  console.log('   Всего:     ' + PHYSICAL_ITEMS.length);
  console.log('═══════════════════════════════════════');
  console.log('🔄 Обнови страницу (Ctrl+R) чтобы увидеть изменения.');
})();
