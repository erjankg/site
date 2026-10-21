# DESIGN-TOOLCHAIN.md — полный инструментарий «вайб → варианты → выбор → сайт»
Собрано ресёрчем 2026-08-29. Многоразовое — переносить на любой проект (Эржан планирует сотни сайтов).

## Твой сценарий словами
«Сказал вайб (стекло как в айфоне) → инструмент показал ВАРИАНТЫ → ткнул что нравится → стало сайтом.»
Это называется **vibe design**. Ниже — ВСЕ инструменты по СТАДИЯМ цикла: что делает, форма вариантов, цена, кому.

## Стадия 0 — БРИФ/ЦЕЛЬ (перед картинками)
- Claude + скилл **office-hours** (что за продукт, для кого, зачем) / **design-consultation** (делает DESIGN.md). Free, уже есть.

## Стадия 1 — ВАЙБ → ВАРИАНТЫ → ВЫБОР («покажи варианты, я тыкну»)
| Инструмент | Что даёт | Форма | Цена | Кому |
|---|---|---|---|---|
| **design-shotgun** (наш скилл, УЖЕ есть) | несколько РЕАЛЬНЫХ рендер-вариантов UI, доска сравнения, тык → итерация | живые HTML | free | старт прямо сейчас, без установок |
| **SuperDesign** (open-source, В Claude Code/Cursor) | форкает НЕСКОЛЬКО направлений параллельно на бескон. холсте, выдаёт РЕАЛЬНЫЙ код (React/Tailwind/CSS), сравнил → выбрал | варианты+код | free | ★ ровно твой сценарий, в нашем стеке |
| **Google Stitch** | «чистейший vibe design»: вайб → дизайн, голос + бескон. холст | макеты | free | чистое исследование вайба |
| **Figma Make** | описал → рабочее приложение внутри Figma | макет→код | подписка Figma | если живёшь в Figma |
| **v0** (Vercel) | текст → React-компоненты (shadcn+Tailwind) + визуальный редактор | код+превью | free tier/$ | React-стек |
| **Midjourney / Nano Banana Pro / FLUX** | буквально ФОТО-макеты вайба, потом кодишь по картинке | картинки | $10+/мес | если хочешь именно ФОТО-варианты |

★ Под «стекло как в айфоне → варианты → выбор»: **SuperDesign** (наш стек, выдаёт код) или **Stitch** (free);
именно ФОТО → **Midjourney/Nano Banana**; прямо сейчас без установок → наш **design-shotgun**.

## Стадия 2 — ЗАФИКСИРОВАТЬ СИСТЕМУ (чтобы варианты были консистентны)
- **frontend-design** (есть) — стиль+токены+СИГНАТУРА · **canon-tokens.css** (наш токен-слой) ·
  **Design Tokens / Design System Architect** скиллы (OKLCH, 4px-сетка, авто-светлая/тёмная тема).

## Стадия 3 — ПРЕВРАТИТЬ В КОД
- **shadcn/ui MCP · Magic UI MCP · 21st.dev** (React-компоненты) · **v0** · **Claude Code** (наш, любой стек) ·
  SuperDesign (выдаёт код сам).

## Стадия 4 — АССЕТЫ (арт/видео/иконки)
- **Midjourney** ($10, лучший арт 9.3/10) · **Higgsfield** ($19, видео/кинематик) · **Canva** ($15, графика/шаблоны) ·
  **SVGMaker** (free tier, иконки/лого/вектор) · **Adobe Firefly** (IP-безопасно).

## Стадия 5 — АНИМАЦИЯ/ОТКРЫВАЛКИ
- **web-animation-skills** (`npx skills add iart-ai/web-animation-skills`) · **gsap-skills** (есть) ·
  freshtechbro/claudedesignskills (3D/Framer Motion/Lottie/anime.js).

## Стадия 6 — ТЕСТ/QA/ПОЛИРОВКА
- **Playwright MCP** (юзер-флоу) · **chrome-devtools MCP** (есть) · скиллы **/qa**, **/design-review** (есть) ·
  Web Quality (Core Web Vitals/a11y/SEO).

## Стадия 7 — ★ ЧТО СТРОИМ МЫ САМИ (не только чужие тулзы)
Я не ограничен готовым — под повторяющиеся нужды делаю СВОЁ:
- **Скиллы/слэш-команды** (`.claude/skills/*/SKILL.md`, `.claude/commands/*.md`) — напр. `/wr-screen`
  (собирает экран нашим каноном одной командой).
- **Субагенты** (`.claude/agents/*.md`) — фокус-эксперты (канон-ревьюер, портер-лаба).
- **Свои программы** — УЖЕ построены: `tools/canon-lint.mjs` (линтер канона), `lab-morph.js` (анти-дёрганье),
  lab-tokens (утверждалка токенов). Могу ещё: генератор вариантов, нормализатор имён, `serve.mjs`+CDP-прогон.
- **Свой MCP-сервер** — если нужного инструмента нет, пишу собственный под нашу задачу.
→ Для «сотен сайтов» это ГЛАВНЫЙ рычаг: один раз строим свои скиллы/линтеры/шаблоны → каждый след. сайт
  стартует с них, не с нуля.

## Многоразовое ЯДРО под масштаб (сотни сайтов)
Стек, который переезжает из проекта в проект:
**SuperDesign** (вариации) → **frontend-design** (стиль+сигнатура) → **свой токен-слой** на проект (как canon-tokens)
→ **shadcn** (если React) → **Midjourney** (арт) → **web-animation-skills** (мотион) → **Playwright** (тест)
→ **НАШИ скиллы/линтеры/шаблоны**. Плюс базовый порядок 0-7 из плана (goal→сигнатура→макет-до-кода→этапы).

## Источники
[SuperDesign](https://superdesign.dev/blog/2026-ai-design-stack) · [SuperDesign open-source](https://www.geeky-gadgets.com/superdesign-open-source-ai-design-agent/) · [Google Stitch / vibe design](https://www.nxcode.io/resources/news/vibe-design-tools-compared-stitch-v0-lovable-2026) · [custom skills/subagents](https://alexop.dev/posts/claude-code-customization-guide-claudemd-skills-subagents/) · [MCP servers 2026](https://www.builder.io/blog/best-mcp-servers-2026) · [frontend-design toolkit](https://github.com/wilwaldon/Claude-Code-Frontend-Design-Toolkit) · [web-animation-skills](https://github.com/iart-ai/web-animation-skills)
