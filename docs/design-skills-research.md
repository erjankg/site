# Design Skills & Plugins Research for Claude Code
*Project: Wild Rift Stats (pro-wildrift.com) — vanilla JS, plain CSS, glassmorphism, GSAP, dark esports aesthetic*
*Research date: 2026-06-12. Researcher: Claude Code (claude-sonnet-4-6)*

---

## Scope of this document

gstack already ships a strong design suite (design-shotgun, design-review, design-consultation, plan-design-review, design-html). This document looks only for **gaps** — narrow capabilities those skills do NOT cover, specifically relevant to this project's stack: vanilla CSS, GSAP animations, glassmorphism effects, dark esports aesthetic, and the lab-variant workflow.

Figma and anything Figma-related is explicitly out of scope (owner designs in code, not Figma).

---

## Quick verdict table

| Skill / Plugin | Source | Why this project | Priority |
|---|---|---|---|
| **frontend-design** | Official Anthropic (`claude-plugins-official`) | Adds a taste-layer forcing vanilla CSS toward intentional aesthetics; explicitly supports glassmorphism; gstack does NOT include it | **MUST** |
| **gsap-skills** | Official GreenSock (`greensock/gsap-skills`, MIT, 9k+ stars) | Official GSAP AI skill; covers vanilla JS timelines, ScrollTrigger, SplitText, Draggable; zero React dependency | **MUST** |
| **hallmark** | Community (`Nutlope/hallmark`, MIT, 3.1k stars) | Anti-AI-slop rules + 20 themes; vanilla HTML/CSS output; `study` verb extracts design DNA from screenshots | **NICE** |
| **freshtechbro/claudedesignskills** | Community (MIT, 270 stars) | GSAP-scrolltrigger + locomotive-scroll + animejs bundles; but React-heavy, low stars, Nov-2025 vintage | SKIP |
| **hyperframes** | Official Anthropic (`claude-plugins-official`) | GSAP mentioned but it's a video-to-HTML tool (HeyGen); not useful for site animation work | SKIP |
| **aio-design-system** | Community marketplace | Generic design system skill; no esports/glassmorphism specifics | SKIP |
| **animation-helper (community)** | Community marketplace | React+Remotion focused; not vanilla JS | SKIP |

**gstack already covers:** design-review, design-shotgun, design-consultation, plan-design-review, design-html — do not re-install these.

---

## Detail: MUST installs

---

### 1. frontend-design — Official Anthropic plugin

**Source:** `claude-plugins-official` (built into Claude Code's default marketplace)
**URL:** https://claude.com/plugins/frontend-design — https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md
**Installs:** 867,000+ (as of 2026-06)
**Status:** Anthropic-verified, maintained by Anthropic, always current

**What it does:**
Adds a ~400-token SKILL.md that fires whenever Claude writes frontend code. It forces Claude to commit to a deliberate aesthetic direction BEFORE writing a single line — typography pairing, color logic, motion choreography, atmospheric backgrounds. Explicitly bans generic defaults (Inter/Roboto, purple gradients on white, bento-card scaffolding). Supports dark themes and glassmorphism as named styles.

**Why this project specifically:**
- Explicitly lists glassmorphism as a supported aesthetic direction
- CSS-only animation path for vanilla HTML (no React/bundler required)
- Dark mode as a named style — directly relevant to `#010A13` base + cyan/gold palette
- gstack's `design-shotgun` generates image mockups, `design-html` converts them to code, but **neither one encodes permanent taste rules that fire on every frontend edit** — that's the gap this fills
- The lab-variant workflow benefits: when generating new lab variants Claude will already apply intentional design judgment by default

**Overlap with gstack:** Partial. `design-review` catches problems after the fact; `frontend-design` prevents them at generation time. Complementary, not redundant.

**Install command:**
```
/plugin install frontend-design@claude-plugins-official
```
Scope recommendation: **user scope** (applies to all projects).

**Security:** Official Anthropic, pinned SHA, audited. No supply-chain concern.

---

### 2. gsap-skills — Official GreenSock GSAP AI skills

**Source:** `greensock/gsap-skills` (GitHub, MIT license)
**URL:** https://github.com/greensock/gsap-skills
**Stars:** 9,000+ | **Forks:** 557 | **Maintained by:** GreenSock (official)

**What it does:**
8 skill modules that teach Claude correct GSAP usage — the kind of errors Claude typically makes (wrong cleanup, wrong plugin loading order, ScrollTrigger gotchas) are encoded as explicit rules. Modules:

- `gsap-core` — `to/from/fromTo`, easing, stagger
- `gsap-timeline` — sequencing, playback control
- `gsap-scrolltrigger` — scroll-linked animations
- `gsap-plugins` — SplitText, Draggable, Flip, MorphSVG (all now free since Webflow acquisition)
- `gsap-utils` — helper functions
- `gsap-performance` — optimization, `will-change`, `force3D`
- `gsap-react` — React-specific (skip for this project)
- `gsap-frameworks` — Vue/Svelte (skip)

**Why this project specifically:**
- This site already uses GSAP. Claude currently hallucinates GSAP 3 API details, forgets `gsap.context()` cleanup, and misuses ScrollTrigger's `scrub` parameter
- Modules are à la carte — install only `gsap-core`, `gsap-scrolltrigger`, `gsap-plugins`, `gsap-performance` (skip React/frameworks)
- Vanilla JS is explicitly covered; no framework dependency
- gstack has zero GSAP-specific knowledge. This is a clean gap.
- Post-Webflow acquisition: SplitText, MorphSVG, DrawSVG, Flip are now all free — this skill covers those too

**Overlap with gstack:** None. gstack has no animation skill whatsoever.

**Install command:**
```
/plugin marketplace add greensock/gsap-skills
/plugin install gsap-core@gsap-skills
/plugin install gsap-scrolltrigger@gsap-skills
/plugin install gsap-plugins@gsap-skills
/plugin install gsap-performance@gsap-skills
```

Alternative (npx installer, installs into `.claude/skills/` locally):
```
npx skills add https://github.com/greensock/gsap-skills
```

**Windows/PowerShell note:** The `npx` method writes to `.claude/skills/` in your project directory. Works on Windows without issues. Prefer the `/plugin marketplace add` method for user-scope installation.

**Security:** Official GreenSock repository, MIT license, 9k+ stars, actively maintained by the library authors. Low supply-chain risk — same people who wrote the library.

---

## Detail: NICE to have

---

### 3. hallmark — Anti-AI-slop design skill

**Source:** `Nutlope/hallmark` (GitHub, MIT, by Hassan El Mghari / Together AI)
**URL:** https://github.com/Nutlope/hallmark — https://usehallmark.com
**Stars:** 3,100+ | **Launched:** May 2026
**Works with:** Claude Code, Cursor, Codex

**What it does:**
Encodes 57 "slop-test gates" — explicit checks against AI-typical visual patterns. Produces HTML/tokens.css output (no framework dependency). Ships 20 named themes across four genres: editorial, modern-minimal, atmospheric, playful. The `study` verb is unique: point it at any screenshot or URL and it extracts the design DNA (color ratios, spacing rhythm, type scale) as a portable `design.md`.

**Why this project specifically:**
- Vanilla HTML/CSS output — directly compatible
- The `study` verb could extract design DNA from competitor sites (e.g., U.GG, Mobafire) as inspiration for new lab variants
- "Atmospheric" genre overlaps with the site's dark, immersive esports look
- Complements `design-shotgun` (which generates image mockups) with text-based design rules that fire on every generation — similar role to `frontend-design` but with the `study` verb as unique differentiator

**Overlap with gstack:** `design-consultation` builds a DESIGN.md; Hallmark's `study` verb does the same from existing screenshots. Mild overlap, but `study` is a distinct capability gstack doesn't have.

**Why NICE not MUST:** There is already `frontend-design` filling the "taste rules on every generation" slot. Hallmark's only unique value over `frontend-design` is the `study` verb. Useful, not essential.

**Install command:**
```
npx skills add nutlope/hallmark
```

Or via marketplace:
```
/plugin marketplace add Nutlope/hallmark
/plugin install hallmark@hallmark
```

**Windows/PowerShell note:** `npx skills add` requires Node.js in PATH — should already be present if the project uses npm. Run from the project directory.

**Security:** MIT license, 3.1k stars, active author. Community supply-chain risk is non-zero (runs arbitrary skill files). Read the SKILL.md before installing: https://github.com/Nutlope/hallmark/blob/main/.claude/skills/hallmark/SKILL.md — it should contain only markdown, no executable code. Standard caution applies.

---

## Skipped candidates and why

### freshtechbro/claudedesignskills (270 stars, Nov 2025)
Has a GSAP-scrolltrigger skill, but: (a) gsap-skills from GreenSock is official and has 9k+ stars vs 270; (b) this repo is React/Three.js heavy; (c) last updated Nov 2025, before GSAP went fully free. **Superseded by gsap-skills.**

### hyperframes (Anthropic official)
Mentions GSAP but it's a video composition tool (HTML-to-video via HeyGen). Not relevant for site animation work. **Skip.**

### aio-design-system (community)
Generic UI/UX skill, no specifics for glassmorphism, dark themes, or esports. Adds noise without precision. **Skip.**

### animation-helper (community)
Framer Motion + Remotion focused. React-only. **Skip.**

### accessibility plugins (a11y-fixer, accessibility-audit, accessibility-test)
The task brief notes `addyosmani/web-quality-skills` is already being added, which covers this. **Skip.**

### figma plugin (Anthropic official)
Owner explicitly does not use Figma. **Skip.**

---

## Honest verdict

**gstack's design suite is strong but has two genuine gaps for this project:**

1. **GSAP** — gstack has zero knowledge of GSAP. The site already uses it heavily. `gsap-skills` from GreenSock is the highest-quality, most trustworthy fill for this gap: 9k stars, official, vanilla-JS capable, à la carte modules.

2. **Taste rules at generation time** — gstack's design tools are planning/review/critique oriented. None of them embed persistent design rules that fire whenever Claude writes frontend code. `frontend-design` from Anthropic fills exactly this gap, is free, official, and already explicitly covers glassmorphism and dark themes.

Beyond these two, there is genuinely little worth adding. `hallmark` is a NICE upgrade primarily for its `study` verb (extract design DNA from screenshots), but it overlaps significantly with `frontend-design` in daily use. If the owner finds they want to reverse-engineer competitor site aesthetics into `design.md` files, add it then.

**The bloated-list trap:** Several community repos (claudedesignskills, aio-design-system, animation-helper) appear relevant by name but are either React-only, low-quality, or superseded by better options. They are correctly excluded.

**Bottom line:** Add 2 things. `frontend-design` + `gsap-skills`. Everything else is covered by gstack or not worth the supply-chain risk / context overhead.

---

## Sources

- https://claude.com/plugins — Official Anthropic plugin directory
- https://code.claude.com/docs/en/discover-plugins — Official plugin marketplace docs
- https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md — frontend-design SKILL.md source
- https://claude.com/blog/improving-frontend-design-through-skills — Anthropic blog on frontend-design skill
- https://github.com/greensock/gsap-skills — Official GreenSock GSAP AI skills
- https://github.com/Nutlope/hallmark — Hallmark design skill
- https://mer.vin/2026/05/hallmark-design-skill-anti-ai-slop-ui-for-claude-code-and-cursor/ — Hallmark overview
- https://github.com/freshtechbro/claudedesignskills — claudedesignskills (evaluated, skipped)
- https://github.com/garrytan/gstack/blob/main/docs/skills.md — gstack skills list (confirmed no GSAP, no frontend-design)
- https://github.com/hesreallyhim/awesome-claude-code — awesome-claude-code curated list
- https://github.com/anthropics/claude-plugins-community — Community marketplace
