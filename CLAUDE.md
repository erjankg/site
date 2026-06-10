
## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health

## Правила лабов и UI (применять ВСЕГДА, без напоминаний)

Песочницы — папки `lab-*/` (демо-страницы, noindex, не на боевом). Эржан в них подбирает дизайн, потом выбранное переносим в боевой. См. память `project_sandboxes`, `feedback_glass_standard`.

### Два вида настроек — не путать, всегда разделять
1. **Дизайн-полоса лаба** — ВСЕГДА сверху, горизонтальная сворачиваемая полоса (механизм `*-min`, кнопка «Свернуть настройки»). Это для нас (подбор дизайна): варианты раскладок/эффектов/видов. На боевой НЕ переносится — переносим только выбранный вариант, остальное выкидываем/фиксируем в дефолт.
2. **⚙ Настройки юзера** — ВНУТРИ контента, под кнопкой-шестерёнкой ⚙, попап в стекле. Это для реального посетителя: шрифт, плотность, размер, сила стекла и т.п. На боевом живут в ⚙.
   Правило: пока подбираем — всё в верхней полосе; финалим вариант → решаем какие 2-3 параметра станут пользовательскими (в ⚙), остальное = фиксированный дефолт.

### Стекло + фон (стандарт сайта)
- **Любая модалка/окно = стекло** (матовое полупрозрачное + `backdrop-filter: blur`). Без исключений.
- **Стекло размывает то, что ЗА ним** — значит за стеклом ВСЕГДА должно лежать что размывать. Пустая тёмная панель = баг (стекла не видно).
- **За стеклом — ОДИН сплэш-арт на весь сайт**, выбранный глобально (одна картинка на ВСЕ модалки), а НЕ свой арт у каждой модалки. Арт — это сплэш чемпа (напр. Brand), НЕ градиент. (Разные арты по чемпам = временные заглушки для проверки механизма.)
- **Цветовой ореол/фон не должен меняться рывком** при переходе между окнами одного потока (карточка → сравнение → пикер). Первый кадр сразу правильный (см. `feedback_no_flash`).

### Скроллы (см. `feedback_no_ugly_scrollbar`, `feedback_no_layout_jerk`)
- Никогда не оставлять жирный дефолтный ползунок. Контент вписывать (flex), скролл — тонкий/стилизованный.
- Фуллскрин-модалки — без скролла страницы.
- Переключатели/фильтры НЕ меняют размер/положение блока (фикс. габариты + внутренний скролл).

### Кэш лабов
После правок файлов лаба ВСЕГДА бампить `?v=N` на `<link>`/`<script>` в его `index.html` — Эржан открывает локальные файлы и часто не делает Ctrl+F5.
