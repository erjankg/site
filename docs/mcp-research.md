# MCP Connectors for Wild Rift Stats (pro-wildrift.com)

Research date: 2026-06-12 — targeted at THIS stack: vanilla-JS static SPA, Firebase
(Auth + Firestore + Storage), a Google Sheet (TSV) as the champion data source, PWA +
Service Worker, Vitest, GitHub Actions CI, static SEO generator, manual deploy via
Firebase Hosting/Console. Dev box: Windows 10 / PowerShell / VS Code. Owner is not a
programmer, prefers simple, reliable, official tooling.

> Note on what is intentionally NOT here: Claude Code already has native filesystem
> access plus built-in WebFetch/WebSearch, so the Anthropic reference `filesystem` and
> `fetch` MCP servers are redundant and were dropped. Generic "do everything" Google
> Workspace mega-servers were also dropped in favour of a narrow, read-only Sheets server.

---

## Ranked summary

| # | Connector | Maintainer | Why it helps THIS site | Priority |
|---|-----------|-----------|------------------------|----------|
| 1 | **Firebase MCP** (`firebase-tools experimental:mcp`) | Official — Google/Firebase | Query/inspect Firestore (patch notes, CMS, chat, draft series), Auth users, Storage, security rules, deploy — the entire backend | **MUST** |
| 2 | **GitHub MCP** | Official — GitHub | PRs, issues, Actions CI runs/logs, releases for the repo | **MUST** |
| 3 | **Chrome DevTools MCP** | Official — Google / Chrome team | Real Chrome: performance traces, console errors, network, Lighthouse — QA the PWA + SW | **MUST** |
| 4 | **Context7 MCP** | Vendor — Upstash | Up-to-date, version-pinned docs for Firebase 10.12.2, GSAP, SortableJS, Vitest | **NICE** |
| 5 | **Playwright MCP** | Official — Microsoft | Scripted browser automation / cross-page user-flow testing (alt/complement to Chrome DevTools MCP) | **NICE** |
| 6 | **Sentry MCP** (remote) | Official — Sentry | Pull live production JS errors into Claude — **only if you actually run Sentry** | **NICE (conditional)** |
| 7 | **mcp-google-sheets** | Community (xing5, ~900★) | Read the champion-data Google Sheet directly to debug TSV parsing | **NICE (read-only)** |

Reference `filesystem` / `fetch` (Anthropic) → **SKIP** (Claude Code already does this natively).

---

## 1. Firebase MCP — MUST

- **Maintainer:** Official, Google/Firebase (ships inside `firebase-tools` CLI). Currently
  labelled **experimental**.
- **What it does:** Exposes 30+ tools over your Firebase project: Firestore (document CRUD,
  list collections, manage databases & composite indexes), Authentication (read/update users,
  enable/disable accounts, custom claims), Storage (object access/download URLs), security
  rules, App Hosting logs, Cloud Functions logs, Remote Config, and Crashlytics.
- **Why it helps THIS site:** This is the backend. Patch notes, CMS content, chat, and draft
  series all live in **Firestore**; logins are **Firebase Auth**; uploads are **Firebase
  Storage**. Claude can inspect real documents, check the shape of CMS/draft data, validate
  `firestore.rules` (remember the known HIGH finding — readable user emails), and assist
  deploys — instead of you copy-pasting from the Firebase Console.
- **Install (PowerShell, non-plugin / explicit — recommended so you control flags):**

  ```powershell
  claude mcp add firebase --scope project -- cmd /c npx -y firebase-tools@latest experimental:mcp --dir "d:\Flutter ERjanKG\site"
  ```

  Or as a `.mcp.json` snippet committed to the repo:

  ```json
  {
    "mcpServers": {
      "firebase": {
        "command": "cmd",
        "args": ["/c", "npx", "-y", "firebase-tools@latest", "experimental:mcp",
                 "--dir", "d:\\Flutter ERjanKG\\site"]
      }
    }
  }
  ```

  - `--dir` points it at the folder holding `firebase.json` (so it finds the right project).
  - Limit scope with `--only firestore,auth,storage` to reduce surface area.
- **Auth:** Uses the Firebase CLI's existing login — run once:
  `npx -y firebase-tools@latest login`. No API key stored in config; it reuses your CLI
  credentials / Application Default Credentials.
- **Windows gotcha:** wrap `npx` with `cmd /c` (npx on Windows is `npx.cmd`; without the
  wrapper Claude Code sometimes can't spawn it).
- **Security caveat:** This has **full read/write to your real Firebase project** (it can
  modify Firestore docs and Auth users). Treat it as production access. Use `--only` to
  restrict tool groups, and review any write the agent proposes before approving. Experimental
  status means tool names/behaviour may change.
- **Source:** https://firebase.google.com/docs/ai-assistance/mcp-server ·
  https://firebase.blog/posts/2025/05/firebase-mcp-server/

## 2. GitHub MCP — MUST

- **Maintainer:** Official — GitHub (`github/github-mcp-server`).
- **What it does:** Read repos/files, manage issues & PRs, read Actions workflow runs and
  logs, manage releases — over natural language.
- **Why it helps THIS site:** You run **GitHub Actions CI** and ship via Git. Claude can open
  PRs, read failing CI logs, triage issues, and check the repo without leaving the terminal —
  directly supports the `/ship` and `/review` workflows in your project.
- **Install — remote HTTP (recommended, no Docker needed). On Windows/PowerShell use the
  legacy transport form (the `add-json` form can return `Invalid input` in PS):**

  ```powershell
  claude mcp add --transport http github https://api.githubcopilot.com/mcp --header "Authorization: Bearer YOUR_GITHUB_PAT"
  ```

  Local Docker alternative (only if you prefer self-hosted and have Docker running):

  ```powershell
  claude mcp add github -e GITHUB_PERSONAL_ACCESS_TOKEN=YOUR_GITHUB_PAT -- docker run -i --rm -e GITHUB_PERSONAL_ACCESS_TOKEN ghcr.io/github/github-mcp-server
  ```
- **Auth:** GitHub **Personal Access Token (PAT)** with at least `repo` scope (add `workflow`
  if you want Actions control). Fine-grained tokens scoped to just this repo are safest.
- **Security caveat:** A PAT is a credential — scope it to the single repo, keep it out of
  committed config (put it in user-scope settings, not the repo `.mcp.json`).
- **Source:** https://github.com/github/github-mcp-server/blob/main/docs/installation-guides/install-claude.md

## 3. Chrome DevTools MCP — MUST

- **Maintainer:** Official — Google / Chrome DevTools team (`ChromeDevTools/chrome-devtools-mcp`, ~43k★, Apache-2.0).
- **What it does:** Drives a real Chrome via the DevTools Protocol — 29 tools: performance
  traces & insights, Lighthouse audits, network request inspection, console messages with
  source-mapped stack traces, and DOM interaction.
- **Why it helps THIS site:** Your site is a performance-sensitive **PWA with a Service
  Worker** and a ~6400-line `app.js`. Real Chrome lets Claude catch runtime console errors,
  inspect SW/cache behaviour, profile load time, and run Lighthouse — exactly the QA your
  `/qa`, `/benchmark`, and `/canary` skills want, but in real Chrome rather than headless.
- **Install (PowerShell):**

  ```powershell
  claude mcp add chrome-devtools --scope user -- cmd /c npx -y chrome-devtools-mcp@latest
  ```
- **Auth:** None.
- **Windows gotcha:** needs Chrome (or Chrome for Testing) installed; wrap with `cmd /c`.
  If launch is slow, raise the startup timeout. Sends trace URLs to Google's CrUX API and
  emits usage telemetry by default.
- **Source:** https://github.com/ChromeDevTools/chrome-devtools-mcp ·
  https://developer.chrome.com/docs/devtools/agents/get-started

## 4. Context7 MCP — NICE

- **Maintainer:** Vendor — Upstash (`upstash/context7`).
- **What it does:** Serves fresh, version-specific library documentation into the model on demand.
- **Why it helps THIS site:** You pin specific library versions — **Firebase 10.12.2 compat**,
  **GSAP**, **SortableJS**, **Vitest**. Context7 pulls the matching docs so Claude writes code
  against the exact API you use instead of guessing from memory.
- **Install (PowerShell, user scope; API key optional for higher limits):**

  ```powershell
  claude mcp add context7 --scope user -- cmd /c npx -y @upstash/context7-mcp --api-key YOUR_KEY
  ```

  (Drop `--api-key ...` to run keyless at lower rate limits.)
- **Auth:** Optional API key from context7.com/dashboard (only for rate limits). No access to your data.
- **Security caveat:** Read-only docs fetcher; low risk.
- **Source:** https://github.com/upstash/context7 · https://context7.com/docs/clients/claude-code

## 5. Playwright MCP — NICE

- **Maintainer:** Official — Microsoft (`microsoft/playwright-mcp`, `@playwright/mcp`).
- **What it does:** Browser automation via accessibility-tree snapshots (no vision model);
  scripted multi-step flows, forms, navigation.
- **Why it helps THIS site:** Good for repeatable **user-flow tests** (login, open a champion
  page, run a draft series) and structured assertions. Overlaps with Chrome DevTools MCP —
  pick Chrome DevTools for perf/console/network debugging, Playwright for deterministic
  click-through flow tests. Install one first; add this only if you want scripted E2E.
- **Install (PowerShell):**

  ```powershell
  claude mcp add playwright --scope user -- cmd /c npx -y @playwright/mcp@latest
  ```
- **Auth:** None. Requires Node 18+ (you have it).
- **Source:** https://github.com/microsoft/playwright-mcp · https://playwright.dev/docs/getting-started-mcp

## 6. Sentry MCP (remote) — NICE (conditional)

- **Maintainer:** Official — Sentry (`getsentry/sentry-mcp`, hosted at `mcp.sentry.dev`).
- **What it does:** Pulls Sentry issues, error events, traces, and performance data into Claude
  for debugging.
- **Why it helps THIS site:** If you adopt Sentry for front-end error tracking, Claude could
  read a live production stack trace and jump straight to the offending line in `app.js`.
  **Only worth installing if you actually run Sentry** — your stack does not include it today,
  so this is conditional/future.
- **Install (PowerShell, remote + OAuth):**

  ```powershell
  claude mcp add --transport http sentry https://mcp.sentry.dev/mcp
  ```

  Then authenticate via `/mcp` (OAuth browser flow).
- **Auth:** OAuth to your Sentry org (no manual key). Read access to your error data.
- **Source:** https://mcp.sentry.dev/ · https://github.com/getsentry/sentry-mcp

## 7. mcp-google-sheets — NICE (read-only)

- **Maintainer:** **Community** — `xing5` (~904★, last release v0.6.3 on 2026-05-14). Not official Google.
- **What it does:** Read/create/modify Google Sheets and Drive files via the Sheets/Drive API.
- **Why it helps THIS site:** Your champion data is a **Google Sheet exported as TSV and parsed
  at runtime**. Claude could read the live sheet to debug parsing mismatches (wrong columns,
  bad rows, encoding) instead of you exporting and pasting. Use a **service account with
  read-only (Viewer) sharing** on just that one sheet.
- **Install (PowerShell, needs `uv`/`uvx`):**

  ```powershell
  claude mcp add gsheets --scope project -- cmd /c uvx mcp-google-sheets@latest
  ```

  (Provide credentials via env vars — service-account JSON path + the sheet/folder ID — per
  the repo README.)
- **Auth:** Google **service account** (recommended) or OAuth. Share only the one data sheet
  with the service account as **Viewer** for read-only.
- **Security caveat:** **Community server that touches your Google account — supply-chain risk.**
  Mitigate: pin a version (don't float `@latest` blindly), use a **dedicated service account
  with access to only the single champion sheet**, never your whole Drive. There is no official
  Google "just a Sheet" MCP today; the official Google Workspace remote connectors are broad
  (Drive/Gmail/etc.) and OAuth-scoped to your whole account, so the narrow service-account
  route here is actually lower-blast-radius for this one use case.
- **Source:** https://github.com/xing5/mcp-google-sheets

---

## Recommended to install first (shortlist)

Run these three; they cover backend, repo/CI, and QA — the core of this stack.

```powershell
# 1) Firebase — your whole backend (Firestore/Auth/Storage). Log in once first:
npx -y firebase-tools@latest login
claude mcp add firebase --scope project -- cmd /c npx -y firebase-tools@latest experimental:mcp --dir "d:\Flutter ERjanKG\site"

# 2) GitHub — PRs, issues, CI logs (needs a PAT with repo scope):
claude mcp add --transport http github https://api.githubcopilot.com/mcp --header "Authorization: Bearer YOUR_GITHUB_PAT"

# 3) Chrome DevTools — real-Chrome QA, console errors, perf, Lighthouse:
claude mcp add chrome-devtools --scope user -- cmd /c npx -y chrome-devtools-mcp@latest
```

Optional next: **Context7** (library docs), and **Playwright** if you want scripted E2E.

### Needs auth / a key from you
- **Firebase MCP:** one-time `firebase login` (reuses CLI credentials; no key in config). **Full prod read/write — high trust.**
- **GitHub MCP:** a **Personal Access Token** (`repo` scope; add `workflow` for Actions). Keep it in user settings, not the committed repo config.
- **Context7:** optional API key (rate limits only).
- **Sentry MCP:** OAuth to Sentry (only if you run Sentry).
- **mcp-google-sheets:** a **Google service-account JSON**, with the data sheet shared as Viewer only.

### No key needed
- Chrome DevTools MCP, Playwright MCP.
