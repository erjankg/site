/* ═══════════════════════════════════════════════════════════════════════
   fetch-ability-names-ru.mjs — РУССКИЕ имена умений (официальные, Riot).

   Источник: Data Dragon `ru_RU` (локализация Riot) — берём имена умений
   по слотам passive/q/w/e/r. Параллельно тянем `en_US`, чтобы СВЕРИТЬ:
   если EN-имя ddragon совпало с EN-именем Wild Rift (abilities-en.json) —
   помечаем match:'exact'; если нет (умение переработано в WR) — 'approx',
   RU-имя всё равно даём, но пометка честно говорит «сверить руками».

   Выход: data-pipeline/ability-names-ru.json  (кэш, коммитится)
   Запуск: node data-pipeline/fetch-ability-names-ru.mjs
   ═══════════════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DIR = dirname(fileURLToPath(import.meta.url));
const rd = f => JSON.parse(readFileSync(join(DIR, f), 'utf8'));

const base = rd('base-stats.json');
const abilEn = rd('abilities-en.json').champions;

const SLOTS = ['q', 'w', 'e', 'r'];
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/* ddragon-id отличается от имени WR у горстки чемпионов */
const DD_ID = {
  wukong: 'MonkeyKing', chogath: 'Chogath', drmundo: 'DrMundo', jarvaniv: 'JarvanIV',
  kogmaw: 'KogMaw', leesin: 'LeeSin', masteryi: 'MasterYi', missfortune: 'MissFortune',
  reksai: 'RekSai', tahmkench: 'TahmKench', twistedfate: 'TwistedFate', xinzhao: 'XinZhao',
  aurelionsol: 'AurelionSol', kaisa: 'Kaisa', khazix: 'Khazix', velkoz: 'Velkoz',
  ksante: 'KSante', nunu: 'Nunu', renataglasc: 'Renata', bel: 'Belveth', belveth: 'Belveth',
};

const version = await (await fetch('https://ddragon.leagueoflegends.com/api/versions.json')).json().then(v => v[0]);
const listRu = await (await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/ru_RU/champion.json`)).json();
const ids = new Map(Object.keys(listRu.data).map(k => [norm(k), k]));

const enBySlug = new Map(abilEn.map(c => [c.slug, c]));
const out = { source: 'ddragon ru_RU', version, built: new Date().toISOString().slice(0, 10), champions: {} };
const miss = [];

for (const c of base.champions) {
  const dd = String(c.nameEN || c.Champion).replace(/[^A-Za-z]/g, '');
  const key = DD_ID[norm(dd)] || ids.get(norm(dd));
  if (!key) { miss.push(dd); continue; }
  let ru, en;
  try {
    ru = (await (await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/ru_RU/champion/${key}.json`)).json()).data[key];
    en = (await (await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion/${key}.json`)).json()).data[key];
  } catch (e) { miss.push(dd + ' (fetch)'); continue; }

  const wrEn = enBySlug.get(dd.toLowerCase());
  const wrName = slot => {
    const a = wrEn && wrEn.abilities && wrEn.abilities.find(x => x.slot === slot);
    return a ? a.name : '';
  };
  const rec = {};
  const put = (slot, ruName, enName) => {
    const wr = wrName(slot);
    rec[slot] = {
      ru: ruName, en: enName,
      wrEn: wr,
      match: wr && norm(wr) === norm(enName) ? 'exact' : (wr ? 'approx' : 'noWrName'),
    };
  };
  put('passive', ru.passive.name, en.passive.name);
  SLOTS.forEach((s, i) => { if (ru.spells[i]) put(s, ru.spells[i].name, en.spells[i].name); });
  out.champions[dd] = rec;
  process.stdout.write('.');
}

writeFileSync(join(DIR, 'ability-names-ru.json'), JSON.stringify(out, null, 1), 'utf8');
const all = Object.values(out.champions).flatMap(r => Object.values(r));
console.log(`\nчемпионов: ${Object.keys(out.champions).length} · умений с RU-именем: ${all.length}`);
console.log(`совпало EN 1-в-1: ${all.filter(a => a.match === 'exact').length} · переименовано в WR (сверить): ${all.filter(a => a.match === 'approx').length}`);
if (miss.length) console.log(`НЕ найдено в ddragon: ${miss.join(', ')}`);
