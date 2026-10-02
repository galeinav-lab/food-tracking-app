# NutriTrack — Design System (MASTER)

> Single source of truth for the redesign. Generated with **ui-ux-pro-max** (palette,
> typography, UX rules from its database), tuned to the brief: **card-based layout, dark
> blue theme, mobile-first**. When building a screen, follow this file.

**Project:** NutriTrack · **Category:** Calorie / habit tracker (mobile) · **Theme:** Dark blue
**Style (skill):** Dark Mode (OLED) · **Fonts (skill):** Geometric Modern — Outfit + Work Sans
**Restyle-only:** no data/logic/Redux/API/recharts-data changes.

---

## 1. Color tokens (deep navy, WCAG AA verified)

Base navy pulled from the skill's dark palette (`#0F172A` family); azure accent + macro
trio chosen for pop + contrast on navy.

| Role | Token | Hex | Contrast vs `--bg` |
|---|---|---|---|
| App background | `--bg` | `#0F172A` | — |
| Card surface | `--surface` | `#172132` | — |
| Elevated (inputs/sheet) | `--surface-2` | `#1E2A40` | — |
| Hover / pressed row | `--surface-3` | `#273550` | — |
| Border / divider | `--border` | `rgba(255,255,255,0.09)` | — |
| Primary text | `--text` | `#F1F5F9` | ~15.7:1 ✅ AAA |
| Secondary text | `--text-muted` | `#94A3B8` | ~6.9:1 ✅ AA |
| Dim/caption | `--text-dim` | `#64748B` | ~4.3:1 (large) |
| Accent (rings/active/center +) | `--accent` | `#3B82F6` | white "+" 3.3:1 ✅ (UI/large) |
| **CTA button bg** | `--accent-cta` | `#2563EB` | white text 4.5:1 ✅ AA |
| Accent pressed | `--accent-press` | `#1D4ED8` | — |
| On accent | `--on-accent` | `#FFFFFF` | — |
| Protein ring | `--macro-protein` | `#F87171` | ~5.0:1 ✅ |
| Carbs ring | `--macro-carbs` | `#FBBF24` | ~10.4:1 ✅ |
| Fat ring | `--macro-fat` | `#34D399` | ~9.4:1 ✅ |
| Success | `--success` | `#34D399` | — |
| Danger | `--danger` | `#F87171` | — |
| Warning (calm) | `--warning` | `#FBBF24` | — |
| Water fill | `--water` | `#38BDF8` | — |
| Ring/bar track | `--ring-track` | `rgba(255,255,255,0.08)` | — |

> One source: these live in `frontend/src/index.css :root`. **No raw hex in components** —
> always `var(--token)`. (Structured so a light theme could be added later.)

---

## 2. Typography (skill: "Geometric Modern")

Outfit for headings + ring numbers, Work Sans for body. System stack as fallback.

```css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Work+Sans:wght@400;500;600&display=swap');
--font-head: 'Outfit', -apple-system, 'Segoe UI', Roboto, sans-serif;
--font-body: 'Work Sans', -apple-system, 'Segoe UI', Roboto, sans-serif;
```

| Token | Size / line / weight / font | Use |
|---|---|---|
| `--font-hero` | 46 / 1.0 / 800 / head | Hero ring number |
| `--font-h1` | 28 / 1.2 / 700 / head | Screen titles |
| `--font-h2` | 19 / 1.3 / 600 / head | Card titles |
| `--font-body` | 15 / 1.5 / 400 / body | Body |
| `--font-label` | 14 / 1.4 / 600 / head | Buttons / nav labels |
| `--font-small` | 13 / 1.4 / 400 / body | Secondary |
| `--font-caption` | 11 / 1.3 / 600 / head, +0.04em, UPPERCASE | Ring/nav labels |

Base body 16px, line-height 1.5. Numbers: `font-variant-numeric: tabular-nums`.

---

## 3. Spacing · radii · effects (skill values, dark-adapted)

**Spacing** `--space-*`: 4 / 8 / 12 / 16 / 24 / 32 / 48.
**Radii:** `--r-sm 12` · `--r-md 16` · `--r-lg 20` · `--r-xl 28` · `--r-pill 999`. Cards 20–28, sheet top 28.
**Shadows (dark) + glow:**
- `--shadow-card: 0 8px 24px rgba(0,0,0,.45)`
- `--shadow-nav: 0 -6px 24px rgba(0,0,0,.5)`
- `--glow-accent: 0 8px 26px rgba(59,130,246,.45)` (center "+", primary CTA)

**Motion:** 150–300ms `cubic-bezier(.4,0,.2,1)`; press scale 0.97 (120ms); sheet slide 280ms; ring fill 600ms (decorative). All under `@media (prefers-reduced-motion: reduce){ transition:none; animation:none; }`.
**Safe area:** bottom nav `padding-bottom: env(safe-area-inset-bottom)`.
**Touch:** targets ≥44×44px, ≥8px apart (skill UX rules 1–2).

---

## 4. Component specs

**Card** — `background:var(--surface); border:1px solid var(--border); border-radius:var(--r-lg); padding:20px; box-shadow:var(--shadow-card);`

**Primary CTA** — `background:var(--accent-cta); color:var(--on-accent); border-radius:var(--r-pill); padding:13px 20px; font:var(--font-label); box-shadow:var(--glow-accent);` press scale.
**Secondary** — `background:var(--surface-2); color:var(--text); border:1px solid var(--border); border-radius:var(--r-pill);`
**Chip (quick-add)** — pill, `--surface-2`, active = `--accent` border + text.
**Input** — `background:var(--surface-2); border:1px solid var(--border); border-radius:var(--r-md); padding:12px 14px; color:var(--text); font-size:16px;` focus → `border-color:var(--accent); box-shadow:0 0 0 3px rgba(59,130,246,.25);`

**Rings — lightweight SVG** (replaces recharts for hero + 3 macros; **same data/props**):
- Two `<circle>`s: track (`--ring-track`) + progress arc (`stroke-dasharray` from `pct`, `stroke-linecap:round`, `rotate(-90)`).
- **Hero:** Ø184, stroke 14, color `--accent`. Center: big **calories LEFT** number (`--font-hero`) + caption "kcal left". (Counts down: `goal − eaten`; if eaten > goal, show `0` and a small "over by N".)
- **Macros:** Ø72, stroke 8, color = macro token. Below: grams + `--font-caption` label.
- Over-target: arc caps at 100%, real number always shown — never an error.

**recharts re-theme** (weekly burn ring, weekly bars, weight line — data unchanged): grids/axes `var(--border)`/`var(--text-dim)`, series use `--accent`/macro tokens, tooltips on `--surface-2`.

**Bottom nav (fixed, native)** — height 60 + safe area, `background:var(--surface)` + `backdrop-filter:blur(12px)`, top hairline, `--shadow-nav`. **5 slots: Home · History · [ + ] · Weight · Settings.** Active = `--accent` icon+label; inactive = `--text-dim`. SVG icons only (no emoji). (Weekly view linked from Home/History.)
**Center "+"** — Ø58 circle raised ~16px above bar, `--accent` bg, white "+", `--glow-accent`; opens the logging sheet.

**Bottom sheet (logging)** — slides up from bottom, `--surface-2`, top corners `--r-xl`, grab handle, backdrop `rgba(0,0,0,.55)`, `max-height:88vh`, scroll. Segments **Food · Exercise · Water** → render existing `FoodLog` / `ExerciseLog` / `Water` forms unchanged.

---

## 5. Dashboard layout (375px-first; fine at 768/1024)

```
Greeting + date
┌ HERO CARD ────────────┐
│        ◯  720         │   calories LEFT (goal − eaten), big & central
│       kcal left       │
└───────────────────────┘
[ ◯P 85g ] [ ◯C 210g ] [ ◯F 60g ]   three macro rings
◀  M  T  W [T] F  S  S  ▶            horizontal week strip (tap → that day)
┌ Weekly burn ◯ │ Water ▭ ┐         existing widgets, re-carded
└──────────────────────────┘
Recently logged
┌ [🍳] 2 eggs · 180 kcal · •P •C •F ┐  meal feed (icon-placeholder thumb)
└──────────────────────────────────┘
        ░░ bottom nav ░░  ⊕
```

- Meal cards: rounded `--surface-3` **thumbnail placeholder** (food glyph) where a photo
  will go later; name, calories, small protein/carbs/fat dots. Uses existing `MealCard` data.
- Date strip uses existing `getDay(date)` (read-only past days).

---

## 6. Anti-patterns (skill) — DO NOT

❌ Pure white/black backgrounds · ❌ Emojis as icons (use SVG: Lucide/Heroicons) ·
❌ Missing `cursor:pointer` · ❌ Layout-shifting hovers · ❌ <4.5:1 text · ❌ Instant
(0ms) state changes · ❌ Invisible focus · ❌ Raw hex in components · ❌ Horizontal scroll on mobile.

## 7. Pre-delivery checklist (skill)

- [ ] Tokens only (no raw hex in components)
- [ ] Text contrast ≥ 4.5:1 (large ≥ 3:1)
- [ ] SVG icons, consistent set; `cursor:pointer` on clickables
- [ ] Transitions 150–300ms; `prefers-reduced-motion` respected
- [ ] Visible focus states (keyboard)
- [ ] Touch targets ≥ 44×44, ≥ 8px apart; center "+" + nav above safe area
- [ ] No overflow at 375 / 768 / 1024px
- [ ] Routes / Redux / API / recharts data unchanged
