# NutriTrack Design System — v4 "Light" (MASTER)

> Source of truth for all UI styling. **v4 is the light theme** and replaces the dark theme
> entirely (no dark mode). Earlier versions are archived: `MASTER-v3-dark-lime.md` (v3.2 dark lime,
> where the shared building blocks, motion rules and contrast floor below were introduced),
> `MASTER-v2-light-olive.md`, `MASTER-v1-dark-navy.md`.
> **Style:** clean and minimal on a light grey canvas, white cards with soft shadows, near-black type
> and big bold numbers, generous roundness, lime as the fill accent with dark text on it.
> Tokens live in `frontend/src/index.css`; `frontend/src/styles/colors.ts` mirrors the ones charts need.

---

## 1. Palette

### Surfaces
| Token | Value | Use |
|---|---|---|
| `--bg` | `#E9E9EE` | Canvas — light grey, clearly darker than white so cards lift off it |
| `--surface` / `--card-bg` | `#FFFFFF` | Cards, sheets, menus, fields placed directly on the canvas |
| `--surface-2` | `#F2F2F5` | Inputs, chips, secondary buttons (inside white containers) |
| `--surface-3` | `#E5E5EA` | Pressed fills, handles, stepper buttons |
| `--border` | `rgba(17, 18, 20, 0.08)` | Hairlines |
| `--border-strong` | `rgba(17, 18, 20, 0.16)` | Hover borders, float-tier edges, skeleton lines |

### Text
| Token | Value | Use |
|---|---|---|
| `--text` | `#111214` | Primary text and key numbers (near-black) |
| `--muted` | `#575B63` | Secondary text, labels, idle nav (≥ 6.5:1 on white) |
| `--text-dim` | `#8B9099` | **Placeholders and disabled states only** — never real text (≈3:1) |

### Accent — lime as a FILL, olive as INK
| Token | Value | Use |
|---|---|---|
| `--accent` | `#A3E635` | **Fill only:** + button, primary buttons, selected day, active tab, progress fills, toast strip, camera frame |
| `--accent-cta` / `--accent-press` | `#84CC16` / `#65A30D` | Primary hover / pressed fills |
| `--accent-disabled` | `#E3E8D6` | Disabled primary fill (label turns `--muted`) |
| `--accent-soft` | `rgba(132, 204, 22, 0.16)` | Lime tint behind ink (selected toggles, accent chip, meal thumb, focus ring) |
| `--on-accent` | `#1A2E05` | Text/icons **on** a lime fill (≈11:1). Never white on lime. |
| `--on-accent-soft` | `rgba(26, 46, 5, 0.12)` | Badges sitting on a lime fill |
| `--accent-ink` | `#3F6212` | Every accent **text, icon, outline and border** (active nav, links, "Show macros", focus rings) — 7.6:1 on white |
| `--shadow-accent` | `0 6px 16px rgba(101, 163, 13, 0.30)` | Soft lime shadow under lime fills (+ button, shutter) |

Rule: `background` uses `--accent`; `color`, `stroke`, `outline` and `border` use `--accent-ink`
(exception: a border that matches its own lime fill).

### Macros
| Role | Protein | Carbs | Fat | Fiber |
|---|---|---|---|---|
| Hue (rings, swatches) `--macro-*` | `#F43F5E` | `#F59E0B` | `#14B8A6` | `#A855F7` |
| Ink (chip text, icons) `--macro-*-ink` | `#BE123C` | `#92400E` | `#0F766E` | — |
| Tint (chip/thumb bg) `--macro-*-soft` | rose 12% | amber 14% | teal 13% | — |

Chips layer their tint over an opaque `--surface`, so their contrast never depends on what's behind.

### States & data
| Token | Value | Note |
|---|---|---|
| `--success` | `#15803D` | Text-safe green (≠ lime accent) |
| `--warning` | `#B45309` | Surplus / over goal |
| `--error` | `#B91C1C` | Errors, destructive |
| `--danger-soft` | `rgba(185, 28, 28, 0.08)` | Destructive hover tint |
| `--water` | `#0EA5E9` | Water fill |
| `--ring-track` | `rgba(17, 18, 20, 0.07)` | Empty ring/bar track |
| `--scrim` | `rgba(17, 18, 20, 0.32)` | Behind sheets and the + menu |

### Charts (`styles/colors.ts`)
recharts and SVG need literal colours, so `colors.ts` mirrors the tokens:
- Ring arcs (hero, weekly ring): `accent` `#84CC16` — one step deeper than the fill so the stroke
  holds up on white. Macro rings: the macro hues.
- Weight trend line: `accentLine` `#4D7C0F` (data line ≥ 3:1 on white); target dashed `muted`.
- Weekly bars: `barDeficit` `#16A34A` / `barSurplus` `#D97706` (graphics ≥ 3:1).
- Axis text `muted`, grid/track `rgba(17,18,20,0.07)`, hover cursor and empty-day column
  `rgba(17,18,20,0.04)`, tooltip white with `0 8px 24px rgba(17,18,20,0.12)`.

---

## 2. Typography, shape, elevation

- **Font:** Inter (Google Fonts, weights 400–800) for headings, body and numbers
  (`--font-head` = `--font-body`).
- **Big bold numbers:** hero number `--text-display` 3.2rem at weight 800 with
  `--tracking-display` (-0.035em); ring/macro/preview numbers weight 800 with `--tracking-tight`
  (-0.02em); headings use `--tracking-tight`. `tabular-nums` for figures.
- **Type scale:** `--text-xs .72` · `--text-sm .85` · `--text-base .95` · `--text-md 1.1` ·
  `--text-lg 1.3` · `--text-xl 1.75` · `--text-display 3.2` (rem). Form controls `--text-input`
  1rem (never below 16px: iOS zooms on focus).
- **Radii (generous):** `--r-control` 14 (inputs, chips) · `--r-card` 22 · `--r-raised` 28 (hero) ·
  `--r-sheet` 32 · `--r-pill`. **Buttons are pills**; icon buttons are circles.
- **Elevation (soft, low):** `--shadow-card` `0 1px 2px rgba(17,18,20,.04), 0 8px 24px rgba(17,18,20,.06)` ·
  `--shadow-raised` `0 2px 6px …/.06, 0 16px 40px …/.12` · `--shadow-sheet` `0 -8px 32px …/.12` ·
  `--shadow-nav` a 1px hairline.
- **Spacing:** `--space-*` 4/8/12/16/24/32 for padding/margin/gap. Allowed literals: optical
  micro-spacing ≤ 5px inside chips/steppers/badges, negative optical offsets, fluid `clamp()` gutters.
- `color-scheme: light`; browser chrome (`theme-color`, manifest colours) = `--bg`.

---

## 3. Surface tiers

| Tier | Class / surface | Treatment |
|---|---|---|
| Card | `.glass` | `--glass-bg` white + `--glass-border` hairline + `--shadow-card`. Solid, **no blur**. |
| Inset | `.glass-inset` | `--glass-inset-bg` `#F7F7F9` — a recessed well *inside* a card or sheet (History day detail, picker items, preview). |
| Float | `.glass-float` | `--glass-float-bg` white + `--border-strong` + `--shadow-raised`, no blur. `<ActionMenu>`, the + menu, `<Sheet>` (upward `--shadow-sheet`, no bottom border), toasts, chart tooltips. |
| Nav | `.bottomnav` | **The only blurred surface:** `--glass-nav-bg` (white 72%) + `blur(var(--glass-blur))` 10px; `--glass-bg-solid` (white 96%) without `backdrop-filter`. |

Doubled selectors (`.glass.glass` …) beat component backgrounds regardless of bundle order;
radius/padding stay with the component. The canvas is flat: no gradient, no glow layers.

Context rules:
- Fields and secondary/destructive buttons that sit **directly on the canvas** (Saved foods search,
  today's weight, Log out) use a white fill — the grey control fill would match the canvas.
- Skeleton blocks are white card shapes on the canvas and grey (`--surface-2`) inside white
  containers (`.glass`, `.sheet`).

---

## 4. Shared building blocks — use these, never a per-screen copy

- **Buttons** — `.btn` + `.btn-primary` (lime fill, dark text) / `.btn-secondary` / `.btn-danger`,
  optional `.btn-sm` / `.btn-block` / `.btn-icon`. Press-compress, focus ring in `--accent-ink`,
  hover gated to `(hover: hover)`. Toggles: `.btn-secondary` + `aria-pressed="true"`. Waiting on the
  server: `.btn-loading` + `disabled` + `aria-busy` (transform-only spinner). Only `transform` is
  transitioned.
- **Form fields** — `.field` > `.field-label` + `.input` (`.input-sm` next to `.btn-sm`), errors as
  `<p class="form-error" role="alert">`. Focus = ink border + soft lime ring; `aria-invalid="true"`
  gives the error border.
- **Bottom sheet** — `<Sheet title ariaLabel onClose>` (`components/sheet/`).
- **Loading** — `<Skeleton shape="line|block|circle">` in `<SkeletonGroup label>`; opacity-only pulse.
- **Lists & chips** — `.card-list` + `.stagger`; `.chip` + `.chip-accent` / `-protein` / `-carbs` /
  `-fat` / `-burn`.
- **Card actions** — `<ActionMenu label items busy>`: "⋯" trigger, float-tier menu, WAI-ARIA menu
  keyboard pattern, focus returns to the trigger, opens upward near the nav.
- **Entrances** — `.rise-in`, `.stagger` (cascade capped at the 8th child), `.fade-in` (opacity only).
- **Toasts with an action** — `toastBus.show({ …, action: { label, onAction }, durationMs })` renders
  a `.btn-sm` (e.g. "Undo" after adding water, 5s) that runs the action and dismisses.

---

## 5. Motion

- Tokens: `--ease-out` / `--ease-in` / `--ease-spring` / `--ease-in-out`; `--dur-fast` 150,
  `--dur-base` 200, `--dur-slow` 250, `--dur-press` 50, `--dur-sweep` 550, `--dur-pulse` 1100,
  `--stagger` 40ms.
- **Transform/opacity only.** Entrance keyframes never use `animation-fill-mode: forwards/both` — a
  held `transform` on an ancestor captures `position: fixed` children.
- Page transition: `Main` keys a wrapper by pathname with `.fade-in`.
- **Allowed exception:** the shared `Ring` sweeps by transitioning `stroke-dashoffset`
  (`--dur-sweep`, `--ease-out`) — a small SVG arc, once per value change.
- Charts: recharts animates in JS; `chartTheme.animation` mirrors `--dur-sweep` / `--ease-out` and
  turns animation off under `prefers-reduced-motion` (the CSS kill-switch can't reach it).

---

## 6. Contrast & verification

- Text ≥ 4.5:1 everywhere (3:1 for large text); data graphics ≥ 3:1.
- Lime is never text: text/icons on lime use `--on-accent`; accent text uses `--accent-ink`.
- `--text-dim` is for placeholders/disabled only.
- **Verified** with `tools/ui-check/audit.mjs` (46 screen states at 375 and 412px — every route, the
  + menu, all logging sheets, a toast, the report panel, the crash screen): **0 texts below
  threshold, lowest 4.52:1**; blurred layers = 1 (the nav) on every in-app screen, 0 on auth,
  onboarding and the crash screen. Re-run it after any colour change.

## 7. Anti-patterns (do not)
- Lime as text or icon colour (use `--accent-ink`); white text on lime.
- Grey controls directly on the grey canvas; white skeletons inside white cards.
- Blur on anything but the nav; heavy dark shadows; gradients or glows behind content.
- Hex/rgb/ms literals outside `index.css` and the `colors.ts` mirror; layout-property animation.
