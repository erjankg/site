/* check-parse.mjs — сверка разбора с ИСХОДНЫМ текстом (глазами Эржана).
   Запуск: node data-pipeline/check-parse.mjs Sion Ahri Ezreal            */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseSpell, champLean } from './parse-abilities.mjs';

const DIR = dirname(fileURLToPath(import.meta.url));
const rd = f => JSON.parse(readFileSync(join(DIR, f), 'utf8'));
const abil = rd('abilities.json').champions;
const base = rd('base-stats.json').champions;
const ruN = rd('ability-names-ru.json').champions;
const enA = rd('abilities-en.json').champions;

const RU_F = {
  ad: 'AD', bonusAd: 'бонус-AD', ap: 'AP', bonusAp: 'бонус-AP',
  selfMaxHp: '%своего макс.HP', selfBonusHp: '%своего бонус-HP',
  targetMaxHp: '%макс.HP ЦЕЛИ', targetCurHp: '%тек.HP ЦЕЛИ', targetMissHp: '%потерянного HP ЦЕЛИ',
  armor: 'броня', bonusArmor: 'бонус-броня', mr: 'MR', bonusMr: 'бонус-MR',
  crit: 'крит-шанс', as: 'скор.атаки', asPer1: 'за 1% скор.атаки', ms: 'скор.бега', mana: 'мана',
};
const DTRU = { phys: 'физ', magic: 'маг', true: 'ЧИСТЫЙ' };
const arr = a => '[' + a.map(v => v == null ? '—' : (typeof v === 'number' ? +v.toFixed(4) : v)).join(' / ') + ']';

for (const name of process.argv.slice(2)) {
  const c = abil.find(x => x.nameEN === name);
  const b = base.find(x => x.nameEN === name);
  if (!c || !b) { console.log('НЕ НАЙДЕН', name); continue; }
  const lean = champLean(c.spells);
  const ru = ruN[name] || {};
  const en = (enA.find(x => x.slug === name.toLowerCase()) || {}).abilities || [];
  console.log('\n' + '█'.repeat(78));
  console.log(`█ ${name}  (AD база ${b.AD_Base} · HP база ${b.HP_Base} · броня ${b.Armor_Base} · MR ${b.MR_Base}) · уклон=${lean}`);
  console.log('█'.repeat(78));

  for (const sp of c.spells) {
    const p = parseSpell(sp, b, { lean });
    const rn = ru[sp.slot] || {};
    const ename = (en.find(a => a.slot === sp.slot) || {}).name || '';
    console.log(`\n┌─ ${sp.slot.toUpperCase()} · RU «${rn.ru || '—'}» · EN «${ename || rn.en || '—'}» · CN «${sp.name}»` +
      (rn.match === 'approx' ? '   ⚠ имя ddragon≠WR, сверить' : ''));
    console.log('│ ИСХОДНИК R1: ' + ((sp.detail && sp.detail[0]) || sp.desc || '').slice(0, 300));
    if (sp.detail && sp.detail[1]) console.log('│ ИСХОДНИК R2: ' + sp.detail[1].slice(0, 160));
    console.log('│ ── РАЗОБРАНО ─────────────────────────────────────────────────');
    if (p.onHit) console.log('│ ⚡ ОН-ХИТ: да (施加攻击特效)');
    const V = p.vars;
    if (V.cd) console.log('│ КД: ' + arr(V.cd) + (V.cost ? '  · стоимость: ' + arr(V.cost) : ''));
    const show = (list, tag) => list.forEach((d, i) => {
      console.log(`│ ${tag}${list.length > 1 ? "#"+(i+1) : ""} [${d.dmgType ? DTRU[d.dmgType] : "—"}]${d.role&&d.role!=="main"&&d.role!==d.kind?" («"+(d.role==="chargeMin"?"мин.заряд":d.role==="chargeMax"?"макс.заряд":d.role)+"»)":""}  база ${arr(d.base)}`);
      for (const f of Object.keys(RU_F)) if (d[f]) console.log(`│      ${RU_F[f]}: ${arr(d[f])}`);
      if (d.pctPer) for (const f in d.pctPer) console.log(`│      +% за единицу ${RU_F[f] || f}: ${arr(d.pctPer[f])}`);
      const oks = d.ok.filter(v => v !== null);
      const good = oks.length && oks.every(Boolean);
      console.log(`│      сверка с текстом: показано ${arr(d.shown)} · посчитано ${arr(d.calc)} → ${oks.length ? (good ? '✅ сходится' : '❌ РАСХОЖДЕНИЕ') : '⚪ зависит от цели'}`);
      if (d.flags.length) console.log(`│      флаги: ${d.flags.join(', ')}`);
    });
    show(p.dmg, 'УРОН'); show(p.shield, 'ЩИТ'); show(p.heal, 'ЛЕЧЕНИЕ');
    const skip = new Set(['cd', 'cost', 'baseDmg']);
    const rest = Object.keys(V).filter(k => !skip.has(k));
    if (rest.length) console.log('│ из vars: ' + rest.map(k => `${k}=${arr(V[k])}`).join(' · '));
    if (p.varsUnmapped.length) console.log('│ ⚠ НЕ РАЗОБРАНО (ручное): ' + p.varsUnmapped.map(v => `${v.type}=${v.value}`).join(' · '));
    if (!p.dmg.length && !p.shield.length && !p.heal.length) console.log('│ (числовых эффектов в тексте нет)');
  }
}
