# SITE-SKELETON.md — ВЕСЬ боевой сайт + что портится + что остаётся нетронутым

Единая карта (собрана из чтения кода 2026-07-31). Отвечает: (1) весь скелет боевого, (2) какой лаб заменяет
что, (3) что остаётся в боевом нетронутым. Связано: MASTERPLAN (этапы), LAB-PARITY (фичи по лабам),
PORT-BACKLOG (жёсткая карта порт/удаление), LAB-CHOICES (выборы Эржана).

---

## 1️⃣ ВЕСЬ СКЕЛЕТ БОЕВОГО (как есть сейчас)

### A. ГЛАВНЫЙ ЭКРАН (Home) — верхние вкладки-виды
`switchMainView` (app.js:6601), правая колонка свапается (data-rightcol):
| Вид | id | Правая колонка | Что внутри |
|---|---|---|---|
| Статс | main | ПИКЕР чемпов (#statsChampPanel) | таблица статов 137 чемпов + уровень + тултипы роста + сортировка |
| WinRate | wrpr | КАРТОЧКА чемпа | винрейты по рангам (wr-stats.json), фильтры ранга/роли |
| Метахаб | hub | — | ~11 блоков: лидер/KPI/веер/топы/сборка дня/контры/турниры/патч |
| Тир-лист | tier | — | drag-n-drop тир-борд (чемпы/предметы/руны) |
| **Карта** (Э1.8, 2026-08-21) | map | — | под-вкладки инлайн: **[Карта]** экономика ущелья (арт + 14 объектов + ползунок минуты + дез-таймер + полоса золота, `jungle-economy.json`) · **[Страта]** тактич-доска (`strata-board.js`, лениво) |

### B. РЕЛЬС (сайдбар) — 9 кнопок (side-btn)
| Кнопка | открывает | что это |
|---|---|---|
| Чемпионы | sideChampsMask | грид всех чемпов → клик → карточка чемпа |
| Калькулятор урона | calcMask | калькулятор (старый, → уходит в calc-app) |
| Предметы | itemsMask + itemDetailModal | магазин предметов + карточка (3 вкладки) |
| Руны | runesMask + runeDetailModal | руны + карточка руны |
| Драфтер | drafterHubMask → draftMask/draftCoopMask | соло-тренировка + серии/кооп |
| Категории | cmsOpenCategoriesEditor | админка категорий чемпов |
| Изменения | changesMask | лента патч-изменений |
| Чат | globalChat/chatSystemMask | глобальный чат |
| Киберспорт | cybersportMask + influencerMask | турнирные сетки + инфлюенсеры |

### C. МОДАЛКИ (~24, MODAL_IDS app.js:47)
mMask(пикер чемпов drawM) · calcMask · itemsMask · runesMask · tierlistMask · tierlistMenuMask ·
sideChampsMask · champDetailMask(карточка чемпа) · itemDetailModal · itemSubModal · runeDetailModal ·
itemCalcMenuMask · draftMask · draftCoopMask · champPickerModal · influencerMask · chatSystemMask ·
profileSetupMask · userCardMask · socialPickerMask · socialLinkConfirmMask · changesMask · cybersportMask · drafterHubMask.

### D. SEO — статические страницы
`champions/<name>/index.html` × ~139 (генерит seo/generate.mjs) — для Гугла.

### E. ДАННЫЕ
- **data-pipeline (реальные, робот):** wr-stats.json (винрейты Tencent) · base-stats.json · abilities.json (умения) ·
  champion-abilities.json · champion-tags.json · matchups (3 слоя) · jungle-economy.json · guides/*.json · champion-qualities.json.
- **Firestore (юзер/контент):** items · runes · siteIcons · patchnotes · changesFeed · changelog · users ·
  globalChat · draftLobbies · influencers · tournaments · categories.

### F. JS-ФАЙЛЫ
app.js (455КБ, ядро+5 IIFE) · cms.js (194КБ, админка) · draft.js (199КБ, кооп-драфт) ·
cybersport.js (86КБ, сетки) · index.html (221КБ) · share.js · i18n.js · sw.js · calc-app/* ·
strata-board.js (тактич-доска вида «Карта», грузится лениво при первом открытии Страты) ·
layout-editor.js (админ-редактор позиций; его же лениво тянет Страта).

---

## 2️⃣ КАКОЙ ЛАБ ЗАМЕНЯЕТ ЧТО (порт в Э1)
| Боевой кусок | ← заменяет лаб | выбор Эржана |
|---|---|---|
| Оболочка Home + виды | **lab-main (ЭТАЛОН)** | ✅ выбран |
| Метахаб (hub) | lab-metahub | ✅ выбран |
| Тир-лист | lab-main (вид) | — |
| Карточка чемпа (champDetail) → **СТРАНИЦА чемпа** | из lab-main (не «карточка»!) | ✅ page |
| Предметы/Руны (карточка) | из lab-main (магазин WR) | 🔧 переделка |
| Калькулятор | **calc-app** (главный) | 🔧 доводка |
| Чат | lab-chat | ✅ выбран |
| Драфтер + кооп + мини-игра | lab-drafter | ✅ выбран |
| Изменения/Патч (рельс) | lab-patch | ⏳ ждёт выбора |
| Карта+Страта | lab-map | ✅ портнут (Э1.8) |
| Киберспорт → **Турниры Wild Rift** | lab-tournaments | ⏳ ждёт выбора |
| Профиль (userCard) | lab-profile | ⏳ ждёт выбора |
| YouTube+стримы | блок ВНУТРИ страницы чемпа | — |
| ВСЕ токены/стекло/цвета | **lab-tokens → canon-tokens.css** | 🔧 утверждается |

Дёрганье лечит `lab-morph.js` (в боевой одной строкой). Каркас = ленивый+кэш (мгновенное переключение).

---

## 3️⃣ ЧТО ОСТАЁТСЯ В БОЕВОМ НЕТРОНУТЫМ (логика — только «переодеть в канон»)
Эти вещи РАБОТАЮТ и переписывать НЕ надо — только привести вид к канону (через переменные):
- **Киберспорт-движок** (cybersport.js): генераторы сеток SE/DE/группы/плей-офф, подсчёт таблиц, проброс. Логику НЕ трогать.
- **Кооп-драфт транзакции** (draft.js/draft-logic.js): лобби, ходы, lock-in, клетка. Логику НЕ трогать (вид — канон).
- **CMS/админка** (cms.js): загрузка иконок, категории, патч-ноты, редактирование. Работает.
- **Auth** (Google) + presence (онлайн-статус). Не трогать.
- **SEO-генератор** (seo/generate.mjs) — перегенерить страницы из новой карточки, но механизм тот же.
- **data-pipeline** (все fetch-*.mjs) — реальные данные, работают. Робот обновляет.
- **PWA/Service Worker** (sw.js) — бампать VERSION при деплое.
- **Firestore-правила** (после фикса дыры + деплоя).

## 🗑 ЧТО СНОСИТСЯ (не портится, из PORT-BACKLOG)
Старое хардкод-стекло/анимации/цвета · синий блок `--sel-*` · приватные токены драфтера · старые модалки
(`.m-mask`/`_modalStack` → единая оболочка) · old.html калькулятора · лабы-мусор (sidebar-views/glass/hover/champ-picker удалены).

---

## ПОРЯДОК Э1 (из Э1-PLAN)
Э1.0 токены ✅ → **Э1.1 каркас из lab-main + canon-tokens.css + lab-morph + ⚙** → виды по одному
(WinRate пилот → Статс → метахаб → тир → карта) → инструменты рельса → драфтер → уборка веса.
Всё через canon-tokens.css. Ни одна кнопка не отличается.
