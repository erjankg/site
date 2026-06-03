// Авто-бамп версии Service Worker.
// Запускается хуком PostToolUse после Edit/Write/MultiEdit.
// Если отредактирован файл из precache-списка sw.js (и это не сам sw.js) —
// переписывает строку const VERSION = '...' на свежую метку времени,
// чтобы у посетителей сбросился кэш и подтянулись новые статические файлы.

import { readFileSync, writeFileSync } from 'node:fs';
import { basename, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

function out(obj) { process.stdout.write(JSON.stringify(obj)); }

let raw = '';
try { raw = readFileSync(0, 'utf8'); } catch { process.exit(0); }

let data = {};
try { data = JSON.parse(raw || '{}'); } catch { process.exit(0); }

const ti = data.tool_input || {};
const tr = data.tool_response || {};
const filePath = ti.file_path || ti.filePath || tr.filePath || '';
if (!filePath) process.exit(0);

const name = basename(filePath).toLowerCase();
if (name === 'sw.js') process.exit(0);

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const swPath = join(root, 'sw.js');

let sw;
try { sw = readFileSync(swPath, 'utf8'); } catch { process.exit(0); }

// Список кэшируемых файлов берём прямо из PRECACHE_URLS внутри sw.js,
// чтобы хук сам подхватывал новые файлы, если их туда добавят.
const cached = new Set();
for (const m of sw.matchAll(/'\.\/([^']+)'/g)) {
  const b = basename(m[1]).toLowerCase();
  if (b) cached.add(b);
}
if (!cached.has(name)) process.exit(0);

const d = new Date();
const p = (n) => String(n).padStart(2, '0');
const stamp = `wrs-v2.${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;

const re = /(const VERSION\s*=\s*')[^']*(';)/;
if (!re.test(sw)) process.exit(0);

const updated = sw.replace(re, `$1${stamp}$2`);
if (updated === sw) process.exit(0);

writeFileSync(swPath, updated);
out({ systemMessage: `🔄 Версия Service Worker обновлена → ${stamp} (из-за правки ${basename(filePath)})`, suppressOutput: true });
