// ───────────────────────────────────────────────────────────────────────────
// Сборщик АНГЛИЙСКИХ умений + ИКОНОК + ВИДЕО с ОФИЦИАЛЬНОГО сайта Riot Wild Rift.
//
//   Источник: https://wildrift.leagueoflegends.com/en-us/champions/<slug>/
//   Данные лежат в <script id="__NEXT_DATA__"> → props.pageProps.page.blades[]
//   → блок type:'iconTab' → groups[] (по одному на умение, порядок: пассивка, Q, W, E, R).
//   У каждой группы:
//     • content.title           → имя умения (EN)
//     • content.subtitle        → слот (PASSIVE / 1ST ABILITY / …)
//     • content.description.body→ полное EN-описание (HTML, чистим)
//     • thumbnail.url           → иконка умения
//     • content.media.sources[].src (.mp4) → ВИДЕО умения
//
//   Числа/коэффициенты по рангам берём отдельно из Tencent (fetch-abilities.mjs).
//   Слияние EN-текста ↔ китайских чисел — по нормализованному имени (см. merge-abilities при надобности).
//
//   Запуск:  node data-pipeline/fetch-abilities-en.mjs        (все)
//            node data-pipeline/fetch-abilities-en.mjs 5       (первые 5 — для проверки)
//   Выход:   data-pipeline/abilities-en.json
// ───────────────────────────────────────────────────────────────────────────

import { writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const LIST = 'https://wildrift.leagueoflegends.com/en-us/champions/';
const PAGE = (slug) => `https://wildrift.leagueoflegends.com/en-us/champions/${slug}/`;
const SLOTS = ['passive', 'q', 'w', 'e', 'r'];
const CONCURRENCY = 4;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stripHTML = (s) => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

async function getHTML(url, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      if (i === tries) throw new Error(`${url} → ${e.message} (после ${tries} попыток)`);
      await sleep(i * 1200);
    }
  }
}

function nextData(html) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('нет __NEXT_DATA__');
  return JSON.parse(m[1]);
}

async function getSlugs() {
  const j = nextData(await getHTML(LIST));
  const str = JSON.stringify(j);
  const slugs = [...new Set((str.match(/\/champions\/([a-z0-9-]+)\//g) || []).map((x) => x.replace(/\/champions\/|\//g, '')))];
  return slugs.filter(Boolean);
}

function abilitiesFromPage(html) {
  const j = nextData(html);
  const blades = j.props?.pageProps?.page?.blades || [];
  const blade = blades.find((b) => Array.isArray(b.groups) && b.groups.some((g) => g.content && g.content.title));
  if (!blade) return null;
  return blade.groups.map((g, idx) => {
    const c = g.content || {};
    const vid = (c.media && c.media.type === 'video' && c.media.sources && c.media.sources[0]) ? c.media.sources[0].src : '';
    return {
      slot: SLOTS[idx] || ('x' + idx),
      name: c.title || g.label || '',
      subtitle: c.subtitle || '',
      desc: stripHTML(c.description && c.description.body),
      icon: (g.thumbnail && g.thumbnail.url) || '',
      video: vid,
    };
  });
}

async function main() {
  const LIMIT = +process.argv[2] || Infinity;
  console.log('→ Тяну список чемпионов с офиц. сайта Riot WR…');
  let slugs = await getSlugs();
  if (LIMIT !== Infinity) slugs = slugs.slice(0, LIMIT);
  console.log(`  Чемпионов к загрузке: ${slugs.length}`);

  const champions = [];
  const failed = [];
  let withVideo = 0, totalAb = 0;
  const queue = [...slugs];
  let done = 0;
  async function worker() {
    while (queue.length) {
      const slug = queue.shift();
      try {
        const abilities = abilitiesFromPage(await getHTML(PAGE(slug)));
        if (!abilities || !abilities.length) throw new Error('умения не распознаны');
        abilities.forEach((a) => { totalAb++; if (a.video) withVideo++; });
        champions.push({ slug, abilities });
      } catch (e) {
        failed.push(slug);
        process.stdout.write(`\n✗ ${slug}: ${e.message}`);
      }
      if (++done % 10 === 0) process.stdout.write(`\r  …${done}/${slugs.length}`);
      await sleep(150);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // защита: больше 30% сбоев → источник сломан/блокирует, не затираем старый файл
  if (failed.length > slugs.length * 0.3) {
    throw new Error(`Слишком много сбоев (${failed.length}/${slugs.length}) — НЕ перезаписываю abilities-en.json. Примеры: ${failed.slice(0, 8).join(', ')}`);
  }

  champions.sort((a, b) => a.slug.localeCompare(b.slug));
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const outPath = `${__dirname}/abilities-en.json`;
  writeFileSync(outPath, JSON.stringify({ count: champions.length, totalAbilities: totalAb, withVideo, champions }, null, 2), 'utf8');

  console.log(`\n✓ Готово. Чемпионов: ${champions.length}, умений: ${totalAb}, с видео: ${withVideo}`);
  console.log(`✓ Записано: ${outPath}`);
  if (failed.length) console.log(`⚠ Не удалось (${failed.length}): ${failed.join(', ')}`);
  const zed = champions.find((c) => c.slug === 'zed');
  if (zed) console.log('Пример (Zed passive):', JSON.stringify(zed.abilities[0]).slice(0, 260));
}

main().catch((e) => { console.error('✗ Ошибка:', e.message); process.exit(1); });
