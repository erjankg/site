/* ═══════════════════════════════════════════════════════════════════════
   build-champion-tags.mjs — ТЕГИ МЕХАНИК чемпионов Wild Rift.

   Зачем: гибрид матчапов (см. DRAFT-AI.md, раздел «ИСТОЧНИК МАТЧАПОВ — ГИБРИД»).
   ПАРЫ «кто кого контрит» берём скрейпом, а ТЕКСТ «почему» — отсюда.
   Эти же теги кормят 6 функций состава для ИИ-судьи драфта.

   ИСТОЧНИКИ (все локальные, сеть не нужна):
     abilities.json          — CN-текст умений Tencent (главный источник тегов)
     base-stats.json         — дальность атаки, роли/линии
     champion-qualities.json — оси survive/damage (танк ли это)
     champion-abilities.json — разобранные компоненты (onHit, тип урона)

   ЧЕСТНОСТЬ: каждый авто-тег несёт `src` — ЦИТАТУ из умения, откуда он взялся.
   Нет цитаты → тег производный, в `src` написано из чего выведен.
   Чего в тексте нет — не придумываем: `antishield` в WR предметный, не чемпионский.

   ⚠️ СЛОВАРЬ WR ≠ СЛОВАРЬ LoL PC. Грабли, на которых уже поймались:
     · стан пишется ТРЕМЯ способами: 晕眩 (22 чемпа) · 眩晕 (14) · 击晕 (13);
     · замедление чаще пишут словами 移速降低 (82 чемпа), чем термином 减速 (46);
     · «其2%最大生命值» — местоимение отделено от «макс.HP» процентом;
     · 攻击速度降低 — это замедление атаки ВРАГУ, а не бафф себе;
     · у Brand процент фуллвидтный «％».
   Поэтому регексы держим широкими, а отрицания (降低) проверяем ОТДЕЛЬНО, а не в lookahead.
   ═══════════════════════════════════════════════════════════════════════ */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));

const AB = read('abilities.json');
const BS = read('base-stats.json');
const QL = read('champion-qualities.json');
const CA = read('champion-abilities.json');

const bs = {}; for (const c of BS.champions) bs[c.Champion] = c;
const ql = {}; for (const c of QL.champions) ql[c.name] = c;
/* ⚠️ abilities.json держит КОРОТКИЕ имена («Au. Sol», «Trynda», «Mundo»), а
   champion-abilities.json — полные ddragon-имена. Сшивать их по имени НЕЛЬЗЯ:
   ~11 чемпионов молча теряли ru/dd/lean. Единственный надёжный ключ — heroId. */
const caById = {}; for (const c of CA.champions) caById[c.id] = c;
const ca = {};
for (const c of AB.champions) { const m = caById[c.heroId]; if (m) ca[c.Champion] = m; }

/* ── СЛОВАРЬ: тег ← регекс по CN-тексту умения ───────────────────────────
   `no` — отрицательный регекс: если совпал, тег НЕ ставится (ловушки вида
   «攻击速度降低» = дебафф врагу, а не бафф себе). */
const RX = {
  // ── контроль ──
  cc_hard:      { re: /晕眩|眩晕|击晕|昏迷|嘲讽|压制|魅惑|恐惧|沉睡|冰冻|石化|变形/ },
  cc_knockup:   { re: /击飞|浮空|挑飞|震向/ },
  cc_knockback: { re: /击退|推开|推离/ },
  cc_pull:      { re: /拉(向|拽|扯)|勾(中|住)|牵引|拖拽/ },
  cc_root:      { re: /禁锢|定身|束缚|缠绕/ },
  cc_slow:      { re: /减速|移速降低|降低.{0,8}移速|移动速度降低|降低.{0,10}移动速度/ },
  cc_silence:   { re: /沉默/ },

  // ── защита / выживание ──
  dodge_auto:   { re: /闪避(所有)?(袭来的)?普通攻击|格挡.{0,12}普通攻击|致盲|失明|普通攻击.{0,8}(落空|未命中)/ },
  block_proj:   { re: /阻挡.{0,12}(飞行道具|投射物|技能)/ },
  shield:       { re: /护盾|吸收.{0,6}伤害/ },
  heal_sustain: { re: /治疗|回复.{0,6}生命|吸血|生命偷取|全能吸血/, no: /治疗效果.{0,10}降低|降低.{0,10}治疗效果|重伤/ },
  dmg_reduction:{ re: /(受到|承受).{0,12}伤害.{0,8}(降低|减免)|伤害减免|减免.{0,8}伤害/ },
  cc_immune:    { re: /免疫(所有)?控制|霸体|净化|解除.{0,8}(控制|减益)|韧性/ },
  untargetable: { re: /无法被选中|不可被选取|无法被选取/ },

  // ── пробой / урон ──
  antiheal:     { re: /重伤|治疗效果.{0,10}降低|降低.{0,10}治疗效果/ },
  // «其2%最大生命值» — число между местоимением и «макс.HP»; ％ фуллвидтный (Brand)
  pct_maxhp:    { re: /(目标|敌人|敌方英雄|对方|其)[\d.%％]*最大生命值.{0,16}伤害|相当于其[\d.]+[%％]生命值.{0,10}伤害|造成.{0,12}目标[\d.%％]*最大生命值/ },
  execute:      { re: /处决|斩杀|已损失(的)?生命值.{0,16}伤害|当前生命值.{0,16}伤害/ },
  true_dmg:     { re: /真实伤害/ },
  shred_resist: { re: /护甲穿透|法术穿透|(降低|削弱).{0,10}(护甲|魔法抗性)/ },

  // ── автоатака ──
  crit_scaling: { re: /暴击/ },
  as_scaling:   { re: /攻击速度|攻速/, no: /^(?:(?!攻(击)?速(度)?加成|获得[\d.%％]*攻).)*(攻击速度降低|降低.{0,8}攻击速度|攻速降低)/ },
  empower_aa:   { re: /强化(下一次)?普(通攻击|攻)|下一次普通攻击/ },

  // ── карта / инфо ──
  dash:         { re: /冲刺|突进|跃(向|至|到)|闪烁|翻滚|位移|冲向/ },
  gap_close:    { re: /(跃向|突进|冲(向|刺)至?|闪现到).{0,14}(目标|敌人|敌方英雄)|朝(敌方英雄|目标).{0,6}冲刺/ },
  stealth:      { re: /隐形|隐身|潜行|伪装|不可见/ },
  global_reach: { re: /全球|全图|传送/ },
  vision:       { re: /视野|显露/ },
  waveclear:    { re: /对小兵造成|小兵.{0,10}伤害|范围内的(所有)?敌人.{0,12}伤害|对(附近|周围)(所有)?敌人造成.{0,10}伤害/ },
};

/* способ ДОСТАВКИ контроля — решает, чем от него спасаются.
   Без него метод врал: стена Ясуо «блокировала» стан Джакса, который бьёт вокруг себя. */
const DELIVERY = {
  cc_proj:     /发射|抛掷|投掷|射出|飞行道具|掷出|扔出|弹射/,
  cc_self_aoe: /周围|附近|身边|以自身为中心|范围内的敌人/,
  cc_point:    /对目标|指定.{0,4}敌|目标敌方英雄|跃向目标|突进.{0,4}目标/,
};

/* человекочитаемые имена — идут в JSON, чтобы UI не держал свой словарь */
export const TAG_RU = {
  cc_hard: 'жёсткий контроль', cc_knockup: 'подброс', cc_knockback: 'отбрасывание',
  cc_pull: 'притягивание', cc_root: 'обездвиживание', cc_slow: 'замедление',
  cc_silence: 'немота', cc_proj: 'контроль-снаряд', cc_self_aoe: 'контроль вокруг себя',
  cc_point: 'точечный контроль', dodge_auto: 'уклонение/слепота от автоатак',
  block_proj: 'блок снарядов', shield: 'щит', heal_sustain: 'сустейн/хил',
  dmg_reduction: 'снижение получаемого урона', cc_immune: 'иммунитет/чистка контроля',
  untargetable: 'нельзя выбрать целью', antiheal: 'антихил', pct_maxhp: '%HP-урон (антитанк)',
  execute: 'добивание', true_dmg: 'чистый урон', shred_resist: 'пробитие/срез резистов',
  crit_scaling: 'скейл от крита', as_scaling: 'скейл от скор.атаки',
  empower_aa: 'усиленная автоатака', dash: 'дэш/мобильность', gap_close: 'дэш-вход на цель',
  stealth: 'невидимость', global_reach: 'глобалка/телепорт', vision: 'обзор/ревил',
  waveclear: 'вейвклир', melee: 'ближний', ranged: 'дальний', immobile: 'неподвижный',
  auto_carry: 'авто-керри', frontline: 'танк/фронтлайн', poke_ranged: 'дальний поук',
  dive_assassin: 'дайв-ассасин',
};

/* ── РУЧНАЯ РАЗМЕТКА ──────────────────────────────────────────────────────
   Механики-однодневки, которые словарём не берутся (как «ручные» у парсера).
   Каждая строка = тег + ПОЧЕМУ, сверено по тексту умения глазами.
   Помечаются в JSON как manual:true — чтобы было видно, что это не автомат. */
const MANUAL = {
  Nidalee: {
    transform: 'R 美洲狮形态: смена формы человек↔пума, два разных набора умений',
    poke_ranged: 'Q 标枪投掷: копьё бьёт тем сильнее, чем дальше летит (90→225)',
  },
  Shyvana: { transform: 'R 魔龙降世: форма дракона, умения меняют поведение' },
  Nasus:   { scaling_infinite: 'Q 汲魂痛击: урон растёт НАВСЕГДА за добивания (+5 за цель)' },
  Katarina:{ reset_on_kill: 'P 贪婪: убийство сбрасывает КД всех умений на 15с' },
  Akali:   { energy_user: 'W 霞阵: даёт 100 энергии — ресурс вместо маны, ограничивает серию' },
  Irelia:  { reset_on_kill: 'Q 利刃冲击: добил/по метке — КД обнуляется, серия рывков' },
  Kennen:  { stack_stun: 'P 雷缚印: стан только на 3-м стаке метки, не с первого удара' },
  Brand:   { stack_burst: 'P 炽热之焰: 3 стака → взрыв на 10% макс.HP по площади' },
};
Object.assign(TAG_RU, {
  transform: 'смена формы', scaling_infinite: 'бесконечный скейл',
  reset_on_kill: 'сброс КД за добивание', energy_user: 'на энергии',
  stack_stun: 'контроль через стаки', stack_burst: 'взрыв через стаки',
});

/* ── ПРОИЗВОДНЫЕ ТЕГИ (из статов и сочетаний, не из текста) ────────────── */
function derive(name, tags, src) {
  const b = bs[name], q = ql[name];
  if (!b) return;
  const add = (t, why) => { if (!tags.has(t)) { tags.add(t); src[t] = why; } };
  const ranged = b.Range_Base >= 450;
  add(ranged ? 'ranged' : 'melee', 'дальность атаки ' + b.Range_Base);

  if (tags.has('crit_scaling') && (tags.has('as_scaling') || tags.has('empower_aa') || b.Is_Adc))
    add('auto_carry', 'крит + скор.атаки/роль стрелка');
  if (b.Is_Adc && tags.has('as_scaling')) add('auto_carry', 'роль стрелка + скейл скор.атаки');
  if (tags.has('as_scaling') && tags.has('empower_aa') && (ca[name]?.abilities || []).some((a) => a.onHit))
    add('auto_carry', 'on-hit + скор.атаки + усиленная автоатака');

  // танк — по осям качеств: базовые HP/броня ближних НЕ отличают танка от брузера
  // (Jax HP690/бр46 и Malphite HP690/бр49 неразличимы, а роли разные)
  if (q && q.survive >= 3 && q.damage <= 2 && !ranged)
    add('frontline', 'качества: живучесть=' + q.survive + ', урон=' + q.damage);

  if (b.Range_Base >= 525 && !tags.has('gap_close')) add('poke_ranged', 'дальность ' + b.Range_Base + ' без входа на цель');
  if (!tags.has('dash') && !tags.has('global_reach')) add('immobile', 'в наборе умений нет рывка');
  if (tags.has('gap_close') && (tags.has('execute') || tags.has('true_dmg') || tags.has('stealth')))
    add('dive_assassin', 'вход на цель + добивание/чистый урон/невидимость');
}

/* ── 6 ФУНКЦИЙ СОСТАВА (DRAFT-AI.md) ─────────────────────────────────────
   0/1 — закрывает ли чемп функцию. 6-я (баланс AD/AP) считается не по чемпу,
   а по команде, поэтому здесь отдаём `lean` (ad/ap) как сырьё для неё. */
function funcs(name, tags) {
  const b = bs[name], has = (t) => tags.has(t);
  return {
    frontline: has('frontline') ? 1 : 0,
    engage:    (has('cc_hard') || has('cc_knockup')) && (has('gap_close') || has('frontline')) ? 1 : 0,
    carry:     has('auto_carry') || (b?.Is_Mid && has('execute')) ? 1 : 0,
    waveclear: has('waveclear') ? 1 : 0,
    peel:      has('cc_knockback') || has('shield') || has('cc_root') || has('cc_immune') ? 1 : 0,
    lean:      ca[name]?.lean || null,   // сырьё для 6-й функции «баланс AD/AP»
  };
}

/* ── СБОРКА ──────────────────────────────────────────────────────────────── */
const champions = {};
let autoTags = 0, manualTags = 0;

for (const c of AB.champions) {
  const name = c.Champion;
  const tags = new Set(); const src = {}; const manual = [];

  for (const sp of c.spells) {
    const text = (sp.desc || '') + ' ' + (sp.detail || []).join(' ');
    const label = sp.slot.toUpperCase() + ' «' + sp.name + '»';
    let hasCC = false;

    for (const [tag, def] of Object.entries(RX)) {
      const m = text.match(def.re);
      if (!m) continue;
      if (def.no && def.no.test(text)) continue;     // ловушка-отрицание
      if (tag.startsWith('cc_')) hasCC = true;
      tags.add(tag);
      if (!src[tag]) src[tag] = label + ': ' + m[0];  // ЦИТАТА из умения
    }
    if (hasCC) {
      for (const [tag, re] of Object.entries(DELIVERY)) {
        const m = text.match(re);
        if (!m) continue;
        tags.add(tag);
        if (!src[tag]) src[tag] = label + ': ' + m[0];
      }
    }
  }

  autoTags += tags.size;
  derive(name, tags, src);

  for (const [tag, why] of Object.entries(MANUAL[name] || {})) {
    tags.add(tag); src[tag] = why; manual.push(tag); manualTags++;
  }

  champions[name] = {
    ru: ca[name]?.ru || null,
    dd: ca[name]?.dd || name,
    lanes: ['Top', 'Jungle', 'Mid', 'Adc', 'Support'].filter((L) => bs[name]?.['Is_' + L]),
    tags: [...tags].sort(),
    src,
    ...(manual.length ? { manual } : {}),
    funcs: funcs(name, tags),
  };
}

const out = {
  built: new Date().toISOString().slice(0, 10),
  source: 'abilities.json (Tencent CN) + base-stats.json + champion-qualities.json',
  note: 'Теги механик для (а) текста «почему» в матчапах, (б) 6 функций состава ИИ-судьи. '
      + 'Каждый тег несёт src — цитату из умения. manual:[...] = размечено руками (механика-однодневка). '
      + 'ПАРЫ «кто кого контрит» здесь НЕ живут — они в counters.json (скрейп). См. DRAFT-AI.md.',
  tagNames: TAG_RU,
  count: Object.keys(champions).length,
  champions,
};

fs.writeFileSync(path.join(DIR, 'champion-tags.json'), JSON.stringify(out, null, 1));

/* ── отчёт в консоль ─────────────────────────────────────────────────────── */
const sizes = Object.values(champions).map((c) => c.tags.filter((t) => !['melee', 'ranged', 'immobile'].includes(t)).length);
const poor = Object.entries(champions).filter(([, c]) => c.tags.filter((t) => !['melee', 'ranged', 'immobile'].includes(t)).length <= 2);
console.log('✓ champion-tags.json — чемпионов: ' + out.count);
console.log('  тегов авто: ' + autoTags + ' · вручную: ' + manualTags
  + ' · в среднем механик на чемпа: ' + (sizes.reduce((a, b) => a + b, 0) / sizes.length).toFixed(1));
console.log('  бедных (≤2 механики): ' + poor.length + (poor.length ? ' → ' + poor.map((p) => p[0]).join(', ') : ''));
