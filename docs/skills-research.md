# Claude Code Skills & Plugins — Research for Wild Rift Stats

Researched: 2026-06-12. Target stack: vanilla-JS SPA (no bundler), Firebase (Auth/Firestore/Storage),
Google Sheet TSV data source, PWA + Service Worker, Vitest, GitHub Actions CI, SEO static-page generator,
manual Firebase Hosting deploy. Dev on Windows 10 / PowerShell.

**Important:** This project already has the full **gstack** skill pack (investigate, qa, review, ship,
design-review, design-consultation, cso/security, health, benchmark, browse, canary, retro, checkpoint,
codex, land-and-deploy, document-release, plan-* reviews, etc.). The recommendations below are **only the
gaps** gstack does not cover. Where gstack already wins, it is called out so we don't double up.

---

## Ranked summary

| # | Skill / Plugin | Source | Why us (the gap) | Priority |
|---|----------------|--------|------------------|----------|
| 1 | **firebase** (Firebase MCP) | Official — Google/Firebase team | Live Firestore queries, **security-rules validation**, deploy, auth users — straight at our backend. gstack has none of this. | **MUST** |
| 2 | **web-quality-skills** (accessibility, seo, best-practices) | Community — Addy Osmani (Google Chrome), MIT, 2.3k★ | Real **a11y/WCAG + SEO + best-practices** audits. gstack `design-review` is visual taste, `benchmark` is load-time only — neither does WCAG or SEO crawlability. | **MUST** |
| 3 | **typescript-lsp** (or just enables JS diagnostics) | Official Anthropic marketplace | Auto type/import/syntax diagnostics after every edit — huge for our 6400-line `app.js` / 5100-line `cms.js`. | **MUST** |
| 4 | **commit-commands** | Official Anthropic marketplace | Lightweight git commit/push/PR if you ever want it without the full gstack `ship`. Mostly redundant with gstack — see note. | NICE |
| 5 | **security-guidance** | Official Anthropic marketplace | Inline per-edit vuln review as Claude writes. Complements gstack `cso` (audit-on-demand) with continuous coverage. | NICE |
| 6 | An **image-optimization** skill (sharp / webp / avif) | Community (several; vet first) | Batch-convert champion splash/icon assets to WebP/AVIF, srcset, lazy-load. Niche but real for our Storage/DDragon assets. | NICE |
| 7 | An **i18n / hardcoded-string scan** skill | Community (better-i18n etc.) | Find hardcoded RU/EN strings if we ever localize. Speculative today. | SKIP (for now) |
| 8 | **claude-plugins-community** marketplace (the catalog itself) | Official Anthropic | Adds a screened catalog to browse — not a skill, but the safe front door to community plugins. | NICE |

---

## 1. Firebase MCP plugin — **MUST**

- **Source:** Official, maintained by the Firebase team. Repo: `firebase/firebase-tools` (`src/mcp`).
  Listed in the official Anthropic marketplace and on `claude.com/plugins/firebase`.
- **What it does (one line):** Gives Claude live Firebase tools — Firestore document/query/list ops,
  Auth user management, Storage, Cloud Functions logs, Remote Config, **and security-rules syntax/validation**,
  plus a `firebase:deploy` workflow.
- **Why us / why gstack doesn't cover it:** Our entire backend is Firebase, and we have a live HIGH security
  finding in `firestore.rules` (per project memory). gstack has nothing Firebase-aware — it can read the rules
  file as text, but this plugin can actually *validate* rules and *query real Firestore* with our own auth
  scope (it respects security rules, so it only sees what our account may see). Directly accelerates the
  Firestore CMS work (`project_cms_progress`) and rules hardening.
- **Install (pick one):**
  - Plugin (recommended): `/plugin install firebase@claude-plugins-official`
  - Or via Firebase docs: `claude plugin install firebase@firebase`
  - Manual MCP: `claude mcp add firebase npx -- -y firebase-tools@latest mcp`
  - After install: `/reload-plugins`
- **Windows note:** npx-based, cross-platform; needs Node/npm (already present). Auth uses your existing
  Firebase CLI login / Application Default Credentials. No PowerShell-specific gotchas.
- **Trust / caveat:** Highest possible — first-party Google. The only caveat is generic: it can read/write
  your real Firestore under your credentials, so treat it like the Firebase CLI (don't point it at prod and
  run destructive queries casually). Pair with gstack `careful`/`guard` when touching prod data.

## 2. web-quality-skills (accessibility + SEO + best-practices) — **MUST**

- **Source:** Community, by **Addy Osmani** (Google Chrome engineering lead). `github.com/addyosmani/web-quality-skills`.
  MIT license, ~2.3k stars. High-trust individual; widely referenced.
- **What it does (one line):** A bundle of framework-agnostic skills based on Lighthouse + Core Web Vitals:
  `web-quality-audit`, `performance`, `core-web-vitals`, `accessibility`, `seo`, `best-practices`.
- **Why us / why gstack doesn't cover it:** This is the clearest gap.
  - **accessibility / WCAG** — gstack `design-review` checks visual taste/consistency, NOT WCAG (contrast,
    ARIA, keyboard nav, screen-reader). Our glass/dark-esports UI with custom dropdowns and modals is exactly
    where a11y bugs hide.
  - **seo** — we ship a static SEO-page generator (`npm run seo`, ~303 URLs). gstack has no SEO skill at all;
    this one checks crawlability, structured data, meta — perfect to audit those generated pages.
  - **best-practices** — modern-API / security hygiene at the page level.
  - **Overlap to avoid:** its `performance` / `core-web-vitals` skills overlap with gstack `benchmark`.
    Use gstack `benchmark` for the regression/baseline tracking (it's wired to the browse daemon and per-PR
    diffs); use this pack's **accessibility / seo / best-practices** which gstack lacks.
- **Install (pick one):**
  - Plugin marketplace (recommended on Windows): `/plugin marketplace add addyosmani/web-quality-skills`
    then `/plugin` → Discover → install the skills you want → `/reload-plugins`.
  - CLI alt: `npx add-skill addyosmani/web-quality-skills` (see Windows note below).
- **Windows note:** Prefer the `/plugin marketplace add` route. The `npx add-skill` / `npx skills add` family
  has a known path-mismatch bug where skills land in `~/.agents/skills/` instead of `~/.claude/skills/` and
  need a manual symlink — awkward on Windows (symlinks need admin/dev-mode). The plugin route avoids this
  entirely.
- **Trust / caveat:** Community code that runs locally (it can run Lighthouse/headless Chrome and read your
  files). Trust is high given the author and MIT license, but it *is* third-party — review the SKILL.md files
  once after install. This is the one "needs your OK to trust a community source" item, and it's a strong yes.

## 3. typescript-lsp (code-intelligence) — **MUST**

- **Source:** Official Anthropic marketplace (`claude-plugins-official`), `code-intelligence` category.
- **What it does (one line):** Wires the TypeScript/JavaScript Language Server so Claude gets **automatic
  diagnostics after every edit** (type errors, missing imports, syntax) and precise go-to-definition /
  find-references instead of grep guessing.
- **Why us / why gstack doesn't cover it:** Our files are enormous — `app.js` ~6400 lines, `cms.js` ~5100
  lines — and there's no bundler/type-checker catching mistakes. LSP diagnostics let Claude notice and fix a
  broken reference in the same turn, and navigate the giant files by symbol. gstack has no LSP/code-intel
  capability; `health` runs your existing linters but doesn't give per-edit feedback.
- **Install:** `/plugin install typescript-lsp@claude-plugins-official` then `/reload-plugins`.
- **Windows note:** Requires the `typescript-language-server` binary on PATH:
  `npm install -g typescript typescript-language-server`. If you see `Executable not found in $PATH` in the
  `/plugin` Errors tab, that's the missing binary. Memory note: the LSP can use significant RAM on large
  files — if it gets heavy, `/plugin disable typescript-lsp`.
- **Trust / caveat:** First-party + the language server is the same OSS that powers VS Code. Very safe.

## 4. commit-commands — NICE (mostly redundant)

- **Source:** Official Anthropic marketplace (demo `claude-code-plugins` / official).
- **What it does:** Slash skills for git commit / push / PR creation.
- **Why us / overlap:** gstack `ship` + `land-and-deploy` already do commit → test → review → PR → merge →
  canary, which is *more* than this. Only worth it if you want a quick bare commit without the full gstack
  ceremony. **Likely SKIP** unless you find gstack `ship` too heavy for tiny commits.
- **Install:** `/plugin install commit-commands@claude-plugins-official` → `/reload-plugins`.
- **Trust:** First-party, safe.

## 5. security-guidance — NICE

- **Source:** Official Anthropic marketplace.
- **What it does:** Reviews each change Claude makes for common vulns and tells Claude to fix them in the
  same session (continuous, inline).
- **Why us / overlap:** gstack `cso` is a deep on-demand audit (and already covers skill supply-chain, OWASP,
  STRIDE). `security-guidance` is the *continuous* counterpart — catches issues as code is written rather than
  in a periodic sweep. Complementary, low context cost. Optional given we already run `cso`.
- **Install:** `/plugin install security-guidance@claude-plugins-official` → `/reload-plugins`.
- **Trust:** First-party, safe.

## 6. Image-optimization skill (sharp / WebP / AVIF) — NICE

- **Source:** Community, several options (no single dominant repo). Examples seen: `secondsky/claude-skills`
  (has a `web-performance` skill; MIT, ~169★, individual maintainer), `jezweb/claude-skills` design-assets
  image-processing, and various standalone "sharp image processing" / "image-optimizer" skills on skill
  marketplaces.
- **What it does (one line):** Batch-convert/resize images to WebP/AVIF with JPEG/PNG fallbacks, generate
  responsive `srcset`, strip metadata, optimize file size — via the `sharp` library.
- **Why us / why gstack doesn't cover it:** We serve champion splash art + DDragon icons (PWA, perf-sensitive).
  gstack has no asset-optimization skill. This is a real but narrow win — only worth installing when we
  actually do an asset pass.
- **Install:** depends on the chosen repo, e.g. `/plugin marketplace add secondsky/claude-skills` then
  `/plugin install <skill>@claude-skills`. Requires `sharp` (`npm i sharp`), which has native binaries —
  generally fine on Windows but heavier than a pure-JS tool.
- **Trust / caveat:** **Lower trust** — these are smaller individual repos. Read the SKILL.md before
  installing, and prefer one with stars/recent commits. Don't install blindly; an image skill that shells out
  is a plausible supply-chain vector. Decide per-repo when the need arises.

## 7. i18n / hardcoded-string scan — SKIP for now

- **Source:** Community (e.g. `better-i18n/skills`, various `/i18n-scan` / `/i18n-extract` skills).
- **What it does:** Scans source for hardcoded user-facing strings and extracts them to translation keys.
- **Why us:** The site is currently effectively single-language (RU). No active i18n plan. **SKIP** until/unless
  localization becomes a goal — then revisit `better-i18n`.

## 8. claude-plugins-community marketplace — NICE (infrastructure, not a skill)

- **Source:** Official Anthropic catalog of *screened* third-party plugins (`anthropics/claude-plugins-community`),
  each pinned to a commit SHA after automated safety screening.
- **Why us:** It's the safe front door for discovering community plugins (image-opt, etc.) without trusting
  random GitHub repos directly. Adding the catalog installs nothing by itself.
- **Install:** `/plugin marketplace add anthropics/claude-plugins-community` then browse
  `/plugin install <name>@claude-community`.
- **Trust:** Anthropic-screened + SHA-pinned, safer than raw `owner/repo` marketplaces.

---

## Where gstack already wins (do NOT add these)

- **Performance regression / web vitals tracking** → gstack `benchmark` (browse-daemon baselines, per-PR diffs).
  Use Osmani's `core-web-vitals` only for one-off optimization guidance, not as the tracker.
- **QA / browser testing / screenshots** → gstack `qa`, `qa-only`, `browse`, `canary`.
- **Security audit** → gstack `cso` (OWASP, STRIDE, supply-chain, skill scanning). `security-guidance` is only
  the continuous-inline complement.
- **Code review / PR review** → gstack `review`, `codex`, plus official `pr-review-toolkit` would be redundant.
- **Ship / deploy / merge** → gstack `ship` + `land-and-deploy` + `setup-deploy`.
- **Docs after shipping** → gstack `document-release`.
- **Design system / visual polish** → gstack `design-consultation`, `design-review`, `design-shotgun`.
- **Code quality dashboard** → gstack `health` (wraps your linters/Vitest).

---

## Security reality (read once)

Plugins and skills are **highly trusted components that can execute arbitrary code on your machine with your
user privileges** (Anthropic's own warning). Anthropic does not vet what MCP servers/files a plugin includes.
Rules of thumb for this project:
1. Prefer **first-party** (Anthropic official marketplace, Google Firebase) — items 1, 3, 4, 5, 8.
2. For community items, prefer **reputable author + stars + recent activity + MIT** and **read the SKILL.md**
   before enabling — item 2 (Osmani) is the clear yes; item 6 (image) is per-repo judgment.
3. The `/plugin` Discover tab shows a **Will install** list (commands/skills/hooks/MCP) and a **context cost**
   before you commit — review it.
4. gstack `cso` includes **skill supply-chain scanning** — run it after adding any community skill.

---

## Recommended to install first (shortlist with exact commands)

Run these inside Claude Code, then `/reload-plugins` after each batch.

```text
# 1. Firebase (official, first-party) — our backend
/plugin install firebase@claude-plugins-official

# 2. TypeScript/JS code intelligence (official) — for the huge app.js / cms.js
/plugin install typescript-lsp@claude-plugins-official
#    then in PowerShell, install the language server binary:
#    npm install -g typescript typescript-language-server

# 3. Web quality: accessibility + SEO + best-practices (Addy Osmani, MIT, 2.3k stars)
/plugin marketplace add addyosmani/web-quality-skills
#    then /plugin -> Discover -> install: accessibility, seo, best-practices
#    (skip its performance/core-web-vitals — gstack benchmark already owns that)

# optional, low-cost:
/plugin install security-guidance@claude-plugins-official
/plugin marketplace add anthropics/claude-plugins-community

# finally:
/reload-plugins
```

**One decision needed from you:** approving trust of the **community** source in #3
(`addyosmani/web-quality-skills`). It's MIT and by a Google Chrome engineer, so the recommendation is a
confident yes — but it is third-party code that runs locally, so the call is yours.

---

## Sources

- Discover & install plugins (official docs): https://code.claude.com/docs/en/discover-plugins
- Official marketplace repo: https://github.com/anthropics/claude-plugins-official
- Firebase plugin (Anthropic): https://claude.com/plugins/firebase
- Firebase MCP server (Google docs): https://firebase.google.com/docs/ai-assistance/mcp-server
- Firebase MCP source: https://github.com/firebase/firebase-tools/tree/main/src/mcp
- Addy Osmani web-quality-skills: https://github.com/addyosmani/web-quality-skills
- Extend Claude with skills (skill file locations): https://code.claude.com/docs/en/skills
- npx skills path-mismatch issue: https://github.com/vercel-labs/skills/issues/851
- awesome-claude-code: https://github.com/hesreallyhim/awesome-claude-code
- secondsky/claude-skills (community image/perf): https://github.com/secondsky/claude-skills
- better-i18n skills: https://github.com/better-i18n/skills
