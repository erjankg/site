// Минимальный статик-сервер для локальной проверки лабов/боевого.
// Запуск: node tools/serve.mjs [root=.] [port=8777]
//
// Кроме статики умеет ОДНО: POST /save — записать файл в пределах root.
// Нужен инструментам-лабам, которые пишут знания на диск (вычитка матчапов,
// фидбэк по ходам ИИ-кэпа). Без него лаб мог бы только скачивать файл в
// «Загрузки», а владельцу пришлось бы раскладывать его руками.
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = path.resolve(process.argv[2] || '.');
const port = +(process.argv[3] || 8777);
const T = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.mjs':'text/javascript',
  '.css':'text/css', '.json':'application/json', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
  '.png':'image/png', '.svg':'image/svg+xml', '.webp':'image/webp', '.ico':'image/x-icon',
  '.txt':'text/plain; charset=utf-8', '.md':'text/plain; charset=utf-8' };

// Писать разрешено ТОЛЬКО данные-знания: текст и json. Ни кода, ни разметки —
// чтобы страница не могла переписать саму себя или скрипт сервера.
const WRITABLE = new Set(['.txt', '.json', '.md']);

function save(req, res) {
  let body = '';
  req.on('data', (c) => { body += c; if (body.length > 8e6) req.destroy(); });
  req.on('end', () => {
    const fail = (code, msg) => {
      res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: msg }));
    };
    let j;
    try { j = JSON.parse(body); } catch { return fail(400, 'тело не JSON'); }
    if (!j || typeof j.file !== 'string' || typeof j.content !== 'string') return fail(400, 'нужны {file, content}');
    const fp = path.resolve(root, j.file.replace(/^[\/\\]+/, ''));
    if (fp !== root && !fp.startsWith(root + path.sep)) return fail(403, 'путь вне корня');
    const rel = path.relative(root, fp).replace(/\\/g, '/');
    if (/(^|\/)\.git(\/|$)/.test(rel)) return fail(403, '.git не трогаем');
    if (!WRITABLE.has(path.extname(fp).toLowerCase())) return fail(403, 'писать можно только .txt/.json/.md');
    try {
      fs.mkdirSync(path.dirname(fp), { recursive: true });
      fs.writeFileSync(fp, j.content, 'utf8');
    } catch (e) { return fail(500, String(e.message || e)); }
    const bytes = Buffer.byteLength(j.content, 'utf8');
    console.log(`save: ${rel} (${bytes} б)`);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, file: rel, bytes: bytes }));
  });
}

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (req.method === 'POST' && p === '/save') return save(req, res);
  if (p.endsWith('/')) p += 'index.html';
  const fp = path.join(root, p);
  if (!fp.startsWith(root)) { res.writeHead(403); return res.end('403'); }
  fs.readFile(fp, (e, d) => {
    if (e) { res.writeHead(404); return res.end('404 ' + p); }
    res.writeHead(200, { 'Content-Type': T[path.extname(fp).toLowerCase()] || 'application/octet-stream' });
    res.end(d);
  });
}).listen(port, () => console.log(`serve: ${root} → http://localhost:${port}  (POST /save включён)`));
