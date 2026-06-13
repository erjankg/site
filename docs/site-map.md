# Site Map — Wild Rift Stats (PRO-WILDRIFT)

> Reference for the codebase at `d:\Flutter ERjanKG\site`. Built by reading the actual
> code on 2026-06-12. Mark stale spots and re-verify before trusting old details.

## Overview

- **What it is:** "Wild Rift Stats" / brand **PRO-WILDRIFT** (`pro-wildrift.com`, CNAME confirmed)
  — a static, vanilla-JS single-page app: champion stats reference for the game Wild Rift.
  Dark theme. RU-first (some EN via i18n).
- **Entry:** `index.html` (~225 KB, one big HTML file with all modal skeletons inline).
- **Core runtime:** `app.js` (6575 lines).
- **Backend:** Firebase **compat SDK v10.12.2** (Auth/Google, Firestore, Storage) loaded from `gstatic.com`.
- **Champion data:** primary source is `data-pipeline/base-stats.json` (robot-updated daily);
  **fallback** is a published Google Sheet TSV (`G_URL`). Champion icons from Riot **Data Dragon** (`ddragon` 14.24.1).
- **Hosting/deploy:** GitHub Pages-style static (CNAME present); deploy is manual (per CI comment).
- **Design tokens:** in `styles.css` `:root` — accent cyan, gold, dark bg. Manifest `theme_color` is `#6d3ff5` (purple); the CLAUDE.md cyan/gold tokens are the in-app accent set.

---

## 1. Files & layout (root)

### Production HTML/CSS/JS (root)
| File | Lines/size | Role |
|------|-----------|------|
| `index.html` | ~225 KB | SPA shell + all modal skeletons inline. |
| `styles.css` | ~250 KB | All app styles, `:root` design tokens. |
| `app.js` | 6575 | Core: stat table, WinRate view, modals, auth, profile, chat, lazy-loader. |
| `cms.js` | 5114 | Admin/CMS editors; champion-name mapping (CN→DDragon). |
| `cybersport.js` | 1853 | Tournaments/cybersport (lazy-loaded). |
| `draft.js` | 3962 | Co-op draft series UI/networking (lazy-loaded). |
| `draft-logic.js` | 99 | Pure draft logic, dual-export for Vitest. (starting context said ~5752 bytes / "logic" — verified 99 lines.) |
| `share.js` | 364 | Canvas share-image generation. |
| `i18n.js` | 817 | RU/EN strings + `t()`. |
| `tab-pill.js` | 95 | Sliding pill tab component. |
| `anim-perf.js` | 92 | Animation/perf helpers (deferred). |
| `layout-editor.js` (+`.css`) | 350 | Admin drag position/size editor (lazy, admin-only). |
| `lab-settings.js` | 143 | Shared helper for lab sandbox design-strip settings. |
| `sw.js` | 154 | Service Worker (PWA). |

### Migration / one-off scripts (root, not loaded by the app)
`migrate.js`, `migrate-winrates.js`, `migrate-physical-items.js`, `migrate-translations.js`
— Firestore data migration utilities (run manually). Not in the page load path.

### Generated SEO static pages (PRODUCTION, indexed)
Directories of pre-rendered `index.html` pages emitted by `seo/generate.mjs`:
- `champions/<slug>/index.html` — **137** champion pages
- `items/<slug>/index.html` — **100** item pages
- `runes/<slug>/index.html` — **55** rune pages
- `tier-list/` (+ `top/ jungle/ mid/ bot/ support/`)
- `drafter/`, `damage-calculator/`, `map-strategy/`, `coaching/` — landing pages
Each is a static, indexable URL that links back into the SPA. (~300+ URLs total.)

### Other root assets
`manifest.webmanifest`, `robots.txt`, `sitemap.xml` (~46 KB), `icon.svg`, `preview.jpg/svg`,
`firestore.rules`, `CNAME`, `preview-design.html`, `web.p/` (rank badge webp images),
`image/`, `.hover-lab-serve.mjs` (tiny local static server for hover lab).

### Lab sandbox folders (SANDBOX — noindex, not production)
`lab-main/`, `lab-hover/`, `lab-hover-reveal/`, `lab-metahub/`, `lab-youtube/`,
`lab-champ-picker/`, `lab-champion-card/`, `lab-drafter/` — each has its own `index.html`,
CSS, JS. (See §5.) Design playgrounds; only selected variants get ported to production.
> Note: `lab-profile/` and `lab-sidebar/` were **deleted** (git status shows `D`), so the
> live folder set is the 8 above. (Starting context still listed profile/sidebar — stale.)

### Real feature folder (PRODUCTION, BETA)
`tactics-board/` — `index.html`, `board.js`, `style.css`, `assets/`. Title: "Тактическая доска — Wild Rift Stats (BETA)". A real tactics-board feature (not a lab).

### Tooling / infra dirs
`test/` (Vitest), `.github/workflows/` (3 workflows), `seo/` (generator),
`data-pipeline/` (data robots), `node_modules/`, `.gstack/`, `.gstack-design-audit/`, `.claude/`.

---

## 2. Production JS files (purpose & ownership)

### `app.js` (6575) — core runtime
- **Boot/data load:** `loadData()` fetches `data-pipeline/base-stats.json` first; on failure
  falls back to the Google Sheet TSV (`G_URL`). Parses into `raw[]`, exposes
  `window._champsRaw`, `window._champIcon`, dispatches `document` event `champsLoaded`.
- **Stat table & WinRate (`wrpr`) view**, skeleton overlay, ruler (levels 1–15).
- **Modal system:** `openModal(id)` / `closeM()`, a `_modalStack`, base z-index 8100,
  `OVERLAY_MODALS` whitelist (stack on top vs replace), and `history` integration (back button).
- **Sidebar dispatcher:** `window.sidebarOpen(what)` → `switch` mapping (see §4).
- **Lazy loader:** `_lazyScript(src)` / `_lazyStub(src,name)` — defers heavy scripts.
  Stubs registered for `cybersport.js` (`openCybersport`, `openCybersportTournament`),
  `draft.js` (`openDraftCoop`); `layout-editor.js` via `_openLayoutEditor`. draft.js is also
  **background-loaded** for logged-in users (idle callback / auth state).
- **Auth/profile/social** (Firestore `users`, `influencers`), **global chat** (`globalChat`).
- **DDragon icon helper:** `champKey(name)` + `champIcon(name)` →
  `https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion/<Key>.png`
  (with `_sp` special-cases e.g. Norra/Mel, and per-name fallback URL lists).

### `cms.js` (5114) — admin / CMS
Admin editors for items, runes, winrates, patchnotes, changelog, site icons/config,
categories. Champion-name mapping (CN → DDragon → ALL_CHAMPIONS). Firestore-heavy (see §3).

### `cybersport.js` (1853) — tournaments (lazy)
Tournament/team/match management & display. Firestore: `tournaments` (+ subcollections
`teams`, `matches`). Entry points stubbed in app.js until first open.

### `draft.js` (3962) — co-op draft series (lazy)
Cooperative pick/ban draft lobbies. Firestore: `draftLobbies`, `draftInvites`, `users`.
Background-loaded for logged-in users so captain auto-redirect works.

### `draft-logic.js` (99) — pure logic
Counter/synergy/team-strength logic with no DOM/Firebase, dual-exported for Vitest
(`test/draft-logic.test.js`). Loaded directly in index.html.

### `share.js` (364) — canvas share images
Generates share/OG images on a `<canvas>`.

### `i18n.js` (817) — localization
RU/EN dictionary and `t()`. Loaded **first** in `<head>` so strings are ready early.

### `tab-pill.js` (95), `anim-perf.js` (92)
Sliding pill tabs; animation/perf helpers (`anim-perf.js` is `defer`).

### `layout-editor.js` (350) + `layout-editor.css`
Admin-only drag editor for element position/size; lazy-loaded, exports `window.LayoutEditor`.

### `lab-settings.js` (143)
Shared JS for lab design-strip settings (sandbox-only).

### `sw.js` (154) — Service Worker
`VERSION = 'wrs-v2.<timestamp>'` (bumped on deploy). Strategy:
- **network-first (3s timeout)** for same-origin HTML/CSS/JS (consistent fresh bundle; cache = offline fallback).
- **stale-while-revalidate** for images (own + CDN).
- **network-only** for Firebase/Google API hosts (auth/Firestore/presence untouched).
- Precaches core files; deletes old caches on `activate`; handles `SKIP_WAITING`/`GET_VERSION` messages.

---

## 3. Data flow

### Champion data
1. `loadData()` in app.js fetches `data-pipeline/base-stats.json` (`cache:'no-cache'`); expects
   `json.champions` (array, ≥100). Carries `json.ddragonVersion`.
2. On failure → fallback `fetch(G_URL)` where
   `G_URL = window.G_URL || 'https://docs.google.com/spreadsheets/d/e/2PACX-...pub?gid=0&single=true&output=tsv'`
   (published Google Sheet, tab-separated). Guards against HTML-instead-of-TSV.
3. Rows mapped to objects (`name`, AD/HP/Mana/Armor/MR base+growth, range, AS, MS, regen,
   `res`, role flags `is.{Top,Jungle,Mid,ADC,Support}`).
4. **Globals/events:** `window._champsRaw`, `window._champIcon`, custom event `champsLoaded`
   (other modules — draft.js etc. — wait on it).

### Pipeline robots (`data-pipeline/`, run by GitHub Actions daily)
- `fetch-wr-stats.mjs` → `wr-stats.json` (WR/PR/BR/tier; source Tencent CN `mlol.qt.qq.com`).
- `fetch-base-stats.mjs` → `base-stats.json` (base stats; Tencent `game.gtimg.cn` + DDragon for range/AS).
- `fetch-guide.mjs` (one champ) / `fetch-all.mjs` (all ~138) → `guides/<champ>.json` + `guides/_index.json` (matchups/builds/runes/spells/leveling).

### Firestore collections (verified via `.collection(...)` calls)
| Collection | Used in | Notes |
|-----------|---------|-------|
| `users` | app.js, draft.js, cms.js | profiles/auth; **known HIGH issue**: email readable by any auth user (`firestore.rules:69`, per security memory — verify). |
| `globalChat` | app.js | global chat messages. |
| `influencers` | app.js | influencer/social cards. |
| `tournaments` (+ `teams`, `matches` subcollections) | cybersport.js | cybersport. |
| `draftLobbies`, `draftInvites` | draft.js | co-op draft series. |
| `items`, `runes`, `winrates`, `patchnotes`, `changelog`, `siteConfig`, `siteIcons` | cms.js | CMS-managed content. |

Auth: Firebase Google sign-in; presence/Firestore snapshots are network-only in SW.
Rules live in `firestore.rules` (~20 KB).

### Icons
DDragon base `…/cdn/14.24.1/img/champion/<Key>.png`. `champKey()` maps RU/WR names →
DDragon keys; `_sp` and per-name fallback arrays cover oddballs (Norra, Mel, Nilah, etc.).

---

## 4. Sidebar & modals

### Sidebar `.side-btn` buttons (from `index.html`, `onclick`)
1. `sidebarOpen('sideChamps')` — Champions
2. `sidebarOpen('calc')` — Damage Calculator
3. `sidebarOpen('items')` — Items
4. `sidebarOpen('runes')` — Runes
5. `sidebarOpen('draft')` — Draft (solo drafter)
6. `sidebarOpen('draftCoop')` — Draft Series (co-op)
7. `cmsOpenCategoriesEditor()` — Categories (**admin-only**, `#sideBtnCategories`)
8. `sidebarOpen('changes')` — Changes editor (**admin-only**)
9. `sidebarOpen('globalChat')` — Global Chat
10. `sidebarOpen('cybersport')` — Cybersport

> Tier List and Tactics Board are reached via other entry points (e.g. main-view switch /
> tier menu, and the `tactics-board/` page), not a top-level `.side-btn onclick` in this set.
> The previous "15 side-btn" / explicit Tier+Tactics sidebar items are **not** all literal
> `sidebarOpen` buttons in current `index.html` — treat the old count as stale.

### `sidebarOpen(what)` switch targets (app.js)
`sideChamps, calc, itemCalcMenu, items, runes, draft, draftCoop, cybersport,
tierChamps, tierItems, tierRunes, tierMenu, globalChat, users, wrpr, changes`.

### Modals — `.m-mask` skeletons in `index.html` (23 masks; ids)
`mMask` (main champions grid/detail host), `calcMask`, `itemsMask`, `runesMask`,
`tierlistMask`, `sideChampsMask`, `champDetailMask`, `runeDetailModal`, `itemDetailModal`,
`itemSubModal`, `itemCalcMenuMask`, `draftMask`, `draftCoopMask`, `champPickerModal`,
`tierlistMenuMask`, `changesMask`, `chatSystemMask`, `profileSetupMask`, `socialPickerMask`,
`socialLinkConfirmMask`, `userCardMask`, `influencerMask`, `cybersportMask`.

**Overlay modals** (stack on top instead of replacing), from `OVERLAY_MODALS`:
`champDetailMask, itemDetailModal, runeDetailModal, itemSubModal, champPickerModal,
influencerMask, tierlistMask, profileSetupMask, userCardMask, socialPickerMask,
socialLinkConfirmMask`. The rest are "main" modals that replace the whole stack.

---

## 5. Lab sandboxes (SANDBOX, noindex)

Folders `lab-*/` are design playgrounds — not on production; only the chosen variant gets
ported. Each has `index.html` + its own CSS/JS. After edits, bump `?v=N` on lab links/scripts.

| Folder | Title / purpose |
|--------|-----------------|
| `lab-main/` | "Main-Lab · песочница главного экрана" — homepage layouts/views (A–G). |
| `lab-hover/` | "Hover-Lab · песочница hover-анимаций" — hover animation variants. |
| `lab-hover-reveal/` | "Песочница Hover-раскрытие" — expanding/fan card (god-tier, slated for metahub). |
| `lab-metahub/` | "Lab · Мета-хаб (бенто, стекло)" — bento meta-hub in glass. |
| `lab-youtube/` | "Песочница видео сильных игроков" — pro-player video widget. |
| `lab-champ-picker/` | "Champ Picker Lab" — champion-picker modal variants. |
| `lab-champion-card/` | "Песочница карточки чемпиона" — champion-card variants. |
| `lab-drafter/` | "Drafter-Lab · песочница драфтера" — drafter UI variants. |

> `lab-profile/` and `lab-sidebar/` are **deleted** in the working tree (git status `D`).
> `tactics-board/` looks lab-shaped but is a real BETA feature (§1).

---

## 6. Infra / build / deploy

### npm scripts (`package.json`)
- `npm test` → `vitest run`
- `npm run test:watch` → `vitest`
- `npm run seo` → `node seo/generate.mjs`
(devDependency: `vitest ^2.1.8`.)

### Tests
`test/draft-logic.test.js` (Vitest) against the pure `draft-logic.js`.

### CI/CD — `.github/workflows/`
- **`ci.yml`** — on push/PR to `main`: `npm ci`, `node --check` over
  `app.js draft.js draft-logic.js share.js cms.js cybersport.js i18n.js sw.js migrate.js migrate-winrates.js`,
  validate `package.json`/`manifest.webmanifest`/`sitemap.xml`, then `npm test`.
  Deploy stays manual.
- **`seo.yml`** — weekly (Mon 04:17 UTC) + manual: runs `seo/generate.mjs`, commits changed
  `champions items runes tier-list drafter damage-calculator map-strategy coaching sitemap.xml`.
- **`update-data.yml`** — daily (03:23 UTC) + manual: runs `fetch-wr-stats.mjs`,
  `fetch-base-stats.mjs`, `fetch-all.mjs`; commits `data-pipeline/wr-stats.json`,
  `base-stats.json`, `guides/`. Both data/SEO workflows use `[skip ci]`.

### SEO generator — `seo/generate.mjs` (734)
Reads app data, emits static `index.html` per champion/item/rune + landing dirs
(tier-list, drafter, damage-calculator, map-strategy, coaching) and rewrites `sitemap.xml`.
Filters broken descriptions out of the source data.

### PWA / Service Worker
`manifest.webmanifest` (standalone, shortcuts to Tier/Draft/WinRate via `?view=`),
`sw.js` (§2) — **bump `VERSION` on every static deploy** (timestamped, may be automated by a hook).

### SEO meta
`robots.txt`, `sitemap.xml`, JSON-LD + canonical/OG tags in `index.html` and generated pages.

---

## 7. External libraries (versions)

From `index.html`:
- **Firebase compat 10.12.2** (gstatic, SRI-pinned): `firebase-app-compat`, `-auth-compat`,
  `-firestore-compat`, `-storage-compat`.
- **SortableJS 1.15.6** (jsDelivr, SRI-pinned) — drag-and-drop.
- **GSAP 3.12.5** (jsDelivr, SRI-pinned) — animation.
- **Riot Data Dragon** `14.24.1` (CDN, for champion icons; not an npm dep).

Build/test deps (`package.json` / lockfile): **Vitest 2.1.8** (+ its transitive deps:
esbuild, rollup, postcss, etc. under `node_modules/`). No bundler/build step for the app
itself — it ships raw files.

### Script load order in `index.html`
`i18n.js` (head) → Firebase compat ×4 (head) → … → `share.js` → `cms.js` → `app.js`
→ `tab-pill.js` → `draft-logic.js` → `anim-perf.js` (defer).
Lazy at runtime: `cybersport.js`, `draft.js`, `layout-editor.js`.

---

## Deltas vs. prior notes / things to recheck
- **Primary champion data is now `data-pipeline/base-stats.json`**, not the Google Sheet —
  the Sheet (`G_URL`) is only a fallback. (Old notes implied Sheet-first.)
- **`lab-profile/` and `lab-sidebar/` deleted** in working tree; live labs = the 8 in §5.
- **Sidebar `.side-btn` buttons are 10** literal entries here (not 15); Tier List & Tactics
  Board are not in that literal `onclick` set — reached via menu / `tactics-board/` page. (unverified whether a 15-button variant exists elsewhere.)
- `draft-logic.js` is **99 lines** (small pure module), as expected for the test target.
- Three GitHub workflows exist (ci, seo, **update-data**) — the daily data robot is real.
- Manifest `theme_color`/`background_color` are purple (`#6d3ff5`/`#0a0318`); the cyan/gold
  tokens cited in CLAUDE.md are the in-app accent palette in `styles.css` (verify exact hex there if needed — (unverified) precise `:root` values not re-read here).
