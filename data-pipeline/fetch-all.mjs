// ───────────────────────────────────────────────────────────────────────────
// Пакетная загрузка ГАЙДОВ по всем чемпионам с wildriftallstats.ru.
// Берёт список чемпионов из их sitemap.xml, тянет каждый гайд, пишет guides/<slug>.json
// + сводный guides/_index.json. Вежливо: по 4 за раз, с паузами.
//
//   Запуск:  node data-pipeline/fetch-all.mjs
// ───────────────────────────────────────────────────────────────────────────

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchGuide, writeGuide } from './fetch-guide.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONCURRENCY = 4;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getSlugs() {
  const res = await fetch('https://wildriftallstats.ru/sitemap.xml', { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const xml = await res.text();
  const slugs = [...xml.matchAll(/guides\/([a-z0-9-]+)/g)].map((m) => m[1]);
  return [...new Set(slugs)];
}

async function main() {
  const LIMIT = +process.argv[2] || Infinity; // node fetch-all.mjs 5 — только первые 5 (для проверки)
  let slugs = await getSlugs();
  if (LIMIT !== Infinity) slugs = slugs.slice(0, LIMIT);
  console.log(`→ Чемпионов к загрузке: ${slugs.length}`);
  mkdirSync(`${__dirname}/guides`, { recursive: true });

  const index = [];
  const failed = [];
  let done = 0;

  // простой пул на CONCURRENCY параллельных задач
  const queue = [...slugs];
  async function worker() {
    while (queue.length) {
      const slug = queue.shift();
      try {
        const out = await fetchGuide(slug);
        writeGuide(out);
        index.push({ slug: out.slug, name: out.name, role: out.role, tier: out.tier });
      } catch (e) {
        failed.push(slug);
        process.stdout.write(`\n✗ ${slug}: ${e.message}`);
      }
      done++;
      if (done % 10 === 0) process.stdout.write(`\r  …${done}/${slugs.length}`);
      await sleep(150); // вежливая пауза
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // защита: если развалилось больше 30% — источник, видимо, сломан/блокирует; не трогаем оглавление
  if (failed.length > slugs.length * 0.3) {
    throw new Error(`Слишком много сбоев (${failed.length}/${slugs.length}) — источник недоступен/изменился. Оглавление НЕ обновлял. Сбои: ${failed.slice(0, 10).join(', ')}…`);
  }

  index.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  writeFileSync(`${__dirname}/guides/_index.json`, JSON.stringify({ updated: new Date().toISOString(), count: index.length, champions: index }, null, 2), 'utf8');

  console.log(`\n✓ Готово: ${index.length} гайдов записано в data-pipeline/guides/`);
  if (failed.length) console.log(`⚠ Не удалось (${failed.length}): ${failed.join(', ')}`);
}

main().catch((e) => { console.error('✗ Ошибка:', e.message); process.exit(1); });
