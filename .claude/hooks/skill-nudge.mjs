// Авто-растяжка скиллов (UserPromptSubmit hook).
// Сканирует сообщение пользователя на ключевые слова и впрыскивает Claude
// напоминание вызвать нужный скилл. Низкий шум: молчит, если совпадений нет.
//
// Вход: JSON на stdin с полем .prompt (текст сообщения юзера).
// Выход: JSON с hookSpecificOutput.additionalContext (или пусто = тишина).

import { readFileSync } from 'node:fs';

let raw = '';
try { raw = readFileSync(0, 'utf8'); } catch { process.exit(0); }

let prompt = '';
try {
  const data = JSON.parse(raw || '{}');
  prompt = String(data.prompt ?? data.user_prompt ?? '');
} catch {
  prompt = raw;
}

const text = prompt.toLowerCase();

// [регэксп ключевых слов, подсказка]. Слова подобраны под реальный язык юзера (RU+EN).
const rules = [
  [/дизайн|выгляд|вариант|раскладк|красив|стекл|\bdesign\b|\blayout\b/,
    '🎨 дизайн/подбор вида → /design-shotgun (показать варианты) или /design-review (полировка живого сайта). НЕ лепи варианты руками.'],
  [/\bбаг|ошибк|не работает|не пашет|сломал|упал[аои]?\b|exception|traceback|stack trace/,
    '🐛 баг/поломка → /investigate (ищем root-cause, не чиним наугад).'],
  [/затест|потест|проверь сайт|\bqa\b|прогон/,
    '🧪 тест/QA → /qa (тест+фикс) или /qa-only (только репорт).'],
  [/задеплой|деплой|запуш|\bпуш\b|релиз|\bship\b|выкат/,
    '🚀 деплой/релиз → /ship (тесты+ревью+PR; подтверждение перед пушем).'],
  [/анимаци|\bgsap\b|плавн|easing|\btween\b/,
    '✨ анимация → задействуй gsap-skills + frontend-design (GSAP у нас на боевом).'],
  [/\bseo\b|индексац|sitemap|метатег|meta.?tag|структурированн.{0,4}данн/,
    '🔎 SEO → /seo.'],
  [/доступн|accessibilit|\ba11y\b|wcag|screen.?reader|контраст/,
    '♿ доступность → /accessibility.'],
  [/безопасн|уязвим|\bдыр[аеоуы]|аудит|secret|owasp|vulnerab/,
    '🔒 безопасность → /cso или /security-review.'],
];

const hits = [];
for (const [re, msg] of rules) {
  if (re.test(text)) hits.push(msg);
}

if (hits.length === 0) process.exit(0);

const context =
  'НАПОМИНАНИЕ (авто-растяжка скиллов): ' + hits.join('  •  ') +
  '  — если задача действительно про это, СНАЧАЛА вызови нужный скилл через Skill tool; если не подходит — скажи вслух, почему пропускаешь.';

process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'UserPromptSubmit',
    additionalContext: context
  }
}));
