# TOKENS-SPEC.md — полный дизайн-токен-инвентарь (спек для токен-лаба)

Источник: субагент-аудит 2026-07-31 (читал lab-main ЭТАЛОН, DESIGN.md канон, styles.css 8337 строк, calc-app).
Цель: ~600 захардкоженных значений в 5+ КОНФЛИКТУЮЩИХ системах токенов → **~152 токена в ОДНОМ namespace**.
После утверждения в токен-лабе → `canon-tokens.css`, все лабы+боевой импортируют, хардкод = падение линтера.

## 🔴 ГЛАВНАЯ БОЛЕЗНЬ: одно имя = разное в разных файлах
| Имя | Значение A | Значение B | Где |
|---|---|---|---|
| `--sel-*` | СИНЯЯ (`--sel-rgb:0,90,200`, ~35 токенов) | БЕЛАЯ (канон `--sel-05..45`) | styles.css:456 vs DESIGN.md |
| `--good` | #2ECC71 | #4ade80 | styles.css:8111 vs lab-main:58 |
| `--ds-r` | 16px | 15px (канон) | styles.css:7572 vs DESIGN.md:23 |
| `--accent` / `--acc` | дубль | дубль | styles.css:392 vs :8109 |
| отступы | `--s-1..8` | `--sp-1..6` / `--pad/--gap` | 3 системы |
| easing | 9 easings, 3 системы | | |
Драфтер (styles.css:8109-8113) переобъявляет ЦЕЛЫЙ приватный namespace — удалить.

## 2 ГЛАВНЫХ УДАЛЕНИЯ (максимум пользы)
1. Синий блок `--sel-*` (styles.css:456-493, ~35 токенов) → снести, оставить белую канон-шкалу.
2. Приватный набор драфтера (styles.css:8109-8113) → снести, наследовать.
2 конфликта чинить на месте: `--ds-r:16` (7572→15), `--good:#2ECC71` (8111→#4ade80).

---

## 1. SPACING `--sp-*` (11 токенов ← ~150 raw + 3 шкалы)
`--sp-px:1` `--sp-0:2` `--sp-1:4` `--sp-2:6` `--sp-3:8` `--sp-4:12`(10→12) `--sp-5:16`(14→16)
`--sp-6:24` `--sp-7:32` `--sp-8:48` `--sp-9:64`. *Решение лаба: снапить 10→12 и 14→16 или оставить свои рунги.*

## 2. TYPOGRAPHY (21 ← ~60 размеров+13 lh+6 весов)
`--fs-2xs:10 --fs-xs:11 --fs-sm:12 --fs-base:13 --fs-md:14 --fs-lg:15 --fs-xl:17 --fs-2xl:20 --fs-3xl:24 --fs-4xl:28 --fs-5xl:36`
Веса: `--fw-normal:400 --fw-med:500 --fw-semi:600 --fw-bold:700 --fw-black:800` (900→800).
Line-height: `--lh-tight:1.15 --lh-snug:1.35 --lh-normal:1.5 --lh-relaxed:1.6`.
`--font-ui: system-ui,-apple-system,"Segoe UI",Roboto,sans-serif`.

## 3. RADII `--r-*` (8 ← ~30, + фикс --ds-r)
`--r-xs:6 --r-sm:8 --r-md:11 --r-lg:15(=--ds-r канон) --r-xl:20 --r-2xl:24 --r-pill:999 --r-full:50%`.
`--ds-r` = алиас→`--r-lg`. Фикс дрейфа 16px на styles.css:7572.

## 4. WIDTHS (14 ← ~40) — ЛЕЧИТ «фулл-ширина растягивает кнопку»
`--content-max:1400`(было none — ЭТО убивает растяжку) `--content-max-narrow:920`
`--rail-w:235 --rail-min:64 --rail-inset:14 --rail-gap:18 --shell-left:calc --header-h:64`
`--tbl-w:1050 --card-w:300 --pick-w:330 --sidecard-reserve:348`
`--modal-sm:400 --modal-md:520 --modal-lg:760` (← ~30 raw max-width).

## 5. COLORS (~55 ← ~120 hex + 2 воюющие системы). CHROME=белое, ДАННЫЕ=цвет.
**Текст `--txt-*`:** `--txt:#fff --txt-dim:#cfe4f0 --txt-mute:rgba(255,255,255,.72) --txt-faint:rgba(255,255,255,.42) --txt-shadow:0 2px 14px rgba(1,10,19,.8) --on-accent:#0a1016`. (Убить `--text-*`, `--t1..t4`.)
**Chrome `--sel-*` (БЕЛАЯ, удалить синюю):** `--sel-05:.06 --sel-09:.09 --sel-12:.12 --sel-18:.18 --sel-45:.45 --sel-bd:rgba(255,255,255,.5)` — все rgba(255,255,255,α).
**Акцент — БЕЛЫЙ, без вариантов (2026-08-07):** `--accent:#ffffff --accent-rgb:255,255,255 --accent-glow:rgba(...,.45) --accent-dim:rgba(...,.15)`. Убить `--acc*`. Выбора акцента в ⚙ НЕТ — циан и золото удалены.
**WinRate `--data-*`:** `--data-good:#4ade80 --data-good-soft:#7fdca4 --data-bad:#ff5470 --data-bad-soft:#ff8080`.
**Тиры `--tier-*`:** `s-plus:#ff3a3a s:#ff5470 a:#ffb454 b:#ffd700 c:#4ade80 d:#7aa2c4` (лаб утверждает рампу глазами).
**Урон `--dmg-*`:** `phys:#f0a43c magic:#29b6f6 true:#fff onhit:#B48CFF mixed:#ffd66b`.
**Статы `--stat-*`:** `ad:#8B5E3C ap:#B48CFF hp:#27AE60 mana:#5dade2 armor:#D4AC00 mr:var(--accent) as:#f0a43c ms:#7fdca4 crit:#ff5470`.
**Роли `--role-*` (нет сейчас):** `top:#e8935a jungle:#4ade80 mid:#5dade2 adc:#ff5470 support:#c88bff`.
**Статус `--status-*`:** `online:#4ade80 ingame:var(--accent) away:#ffb454 offline:#8b8ba0`.
**Золото:** `--gold:#C89B3C --gold-glow`. Дедуп 3 hex золота.

## 6. GLASS `--glass-*` (10, канон) — список для полноты. Убить `--glass-bd/--glass-bg` драфтера.
`--glass-tint:255,255,255 --glass-op:0 --glass-blur:8px --glass-sat:1.6 --glass-dark:.46 --glass-dark-strong:.60 --glass-bd-c:var(--sel-12) --grain:0 --sh-k:1 --bg-blur:0`.

## 7. SHADOWS `--sh-*` (6 ← 94 строки box-shadow)
`--sh-sm:0 2px 8px rgba(0,0,0,.3) --sh-md:0 8px 24px rgba(0,0,0,.4) --sh-lg:0 16px 48px rgba(0,0,0,.5)`
`--sh-lift:0 12px 32px rgba(0,0,0,.45),0 0 0 1px var(--sel-12) --sh-glow:0 0 24px var(--accent-glow) --sh-inset:inset 0 1px 0 rgba(255,255,255,.08)`.

## 8. Z-INDEX `--z-*` (11 ← 44 значения от −1 до 999999)
`--z-base:0 --z-raised:1 --z-rail:10 --z-sticky:20 --z-dropdown:30 --z-scrim:40 --z-modal:50 --z-overlay-modal:60 --z-toast:70 --z-tooltip:80 --z-devstrip:90`. Всё ≥8000 схлопывается.

## 9. MOTION (8 ← 54 длительности + 9 easings)
`--dur-fast:130ms --dur-base:200ms --dur-slow:280ms --dur-slower:500ms --stagger:45ms` (`--anim-dur:.30s`=алиас→base).
`--ease-out-expo:cubic-bezier(.16,1,.3,1)`(появление) `--ease-standard:cubic-bezier(.4,0,.2,1)`(UI) `--ease-overshoot:cubic-bezier(.34,1.56,.64,1)`(нажатие). Убить остальные 6, смапить.

## 10. ICON SIZES `--ic-*` / `--ava-*` (8 ← ~13)
`--ic-xs:14 --ic-sm:16 --ic-md:20 --ic-lg:24 --ic-xl:44 --ava-sm:30 --ava-md:54 --ava-lg:88`.

---
## ИТОГО: ~600 захардкоженных значений + 187 конфликтующих имён → **~152 токена в одном namespace.**
Миграция: алиасы сначала (--ds-r→--r-lg, --anim-dur→--dur-base, --s-N→--sp-N), удаление потом.
Off-scale (10/14px, вес 900) снапятся к ближайшему рунгу при порте (принудительная канонизация) — лаб даёт подтвердить снап.
