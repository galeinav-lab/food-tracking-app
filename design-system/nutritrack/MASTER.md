# NutriTrack Design System — v3.1 "Dark Lime — Ambient Glass" (MASTER)

> Source of truth for all UI styling. Palette-only revision of v2 (archived as
> `MASTER-v2-light-olive.md`; v1 dark navy as `MASTER-v1-dark-navy.md`).
> **Everything except color is inherited from v2 unchanged:** typography (Lora + Raleway),
> radii, spacing, the entire motion system (§4 of v2 — sweeps, spring fan-out,
> press-compress, ease tokens), component structure.
> Style base: ui-ux-pro-max **"Dark Mode (OLED)"** — dark surfaces, vibrant neon accent,
> minimal glow, high contrast, `color-scheme: dark`. All pairs below AA-checked.

---

## 1. Palette — deep green darks + vivid lime

### Surfaces (green-tinted darks — not neutral gray, not pure black)
| Token | Hex | Use |
|---|---|---|
| `--bg` | `#10140D` | Canvas — near-black charcoal with green undertone |
| `--surface` / `--card-bg` | `#181F13` | Cards — lifted dark green (elevation via lightness) |
| `--surface-2` | `#212B1A` | Inputs, chips, secondary fills |
| `--surface-3` | `#2B3722` | Pressed states, handles, deep fills |
| `--border` | `rgba(214, 255, 170, 0.10)` | Faint lime-tinted hairlines (kept subtle — lightness does the elevation) |
| `--border-strong` | `rgba(214, 255, 170, 0.20)` | Hover/focus borders |

### Text (light on dark; AA/AAA)
| Token | Hex | Contrast on card | Use |
|---|---|---|---|
| `--text` | `#F2F5EC` | ≈15:1 | Primary — warm green-tinted off-white |
| `--muted` / `--text-muted` | `#B4BFA4` | ≈7.8:1 | Secondary |
| `--text-dim` | `#86937A` | ≈4.6:1 | Placeholders, faint labels |

### Accent — vivid lime (the energy; glows on the dark base)
| Token | Hex | Note |
|---|---|---|
| `--accent` | `#A3E635` | Lime — CTAs, ring fills, active nav, selected states. ≈11:1 on cards |
| `--accent-cta` | `#84CC16` | Hover / secondary emphasis |
| `--accent-press` | `#65A30D` | Pressed |
| `--accent-disabled` | `#3F4A26` | Disabled fills |
| `--accent-soft` | `rgba(163, 230, 53, 0.12)` | Lime sheen tints (hero, chips, selected) |
| `--on-accent` | **`#16200A`** | ⚠️ **DARK text on lime** — white-on-lime fails (~1.5:1); dark-on-lime ≈12:1 ✓ |
| `--glow-accent` | `0 6px 20px rgba(163, 230, 53, 0.35)` | + button / key highlights |

### Macro trio (distinct from each other AND from lime; ≥4.5:1 on cards)
| Token | Hex | |
|---|---|---|
| `--macro-protein` | `#FB7185` | Rose |
| `--macro-carbs` | `#FBBF24` | Amber |
| `--macro-fat` | `#2DD4BF` | Teal |
| `--macro-fiber` | `#C084FC` | Violet |
| `--water` | `#38BDF8` | Sky |
| `--ring-track` | `rgba(214, 255, 170, 0.08)` | Empty ring/bar track |

### State colors (deficit green ≠ lime accent — deliberately separated)
| Token | Hex | Note |
|---|---|---|
| `--success` | `#4ADE80` | Spring green (hue ~142°) — clearly "green" where lime (~80°) reads "yellow-green"; ≈9.5:1 |
| `--warning` | `#F59E0B` | Surplus / over-goal |
| `--error` / `--danger` | `#F87171` | Errors, destructive (≈5.9:1) |

> Success vs lime: different hue family + different contexts (bars/labels vs CTAs/rings), and
> values are always labeled — never color-only.

### Charts (mirror in `frontend/src/styles/colors.ts`)
grid/track `rgba(214,255,170,0.08)` · axis text `#B4BFA4` · tooltip bg `#212B1A`, border
`rgba(214,255,170,0.10)`, text `#F2F5EC` · bars: success/warning above · lines/rings: lime + macro trio.

---

## 2. Everything inherited from v2 (unchanged)
- **Typography:** Lora (headings/big numbers) + Raleway (body/labels). Same scale, `tabular-nums`.
- **Radii:** 12 / 16 / 20 / 28 / pill.
- **Motion system:** `--ease-out cubic-bezier(0.22,1,0.36,1)`, `--ease-in`, `--ease-spring`,
  durations fast 150 / base 200 / slow 250 / press 50 / sweep 550, stagger 40ms; press-compress
  on every tappable; ring/bar sweeps; spring fan-out with quick ease-in close; reduced-motion collapse.
- **Structure rules:** tokens only (index.css + colors.ts mirror), transform/opacity-only animation.

### Dark-theme deltas (shadows & chrome)
| Token | Value |
|---|---|
| `--shadow-card` | `0 8px 24px rgba(0, 0, 0, 0.45)` |
| `--shadow-raised` | `0 10px 28px rgba(0, 0, 0, 0.55)` |
| `--shadow-nav` | `0 -6px 24px rgba(0, 0, 0, 0.5)` |
| Bottom nav | `rgba(24, 31, 19, 0.85)` + blur(14px) |
| Scrims (sheet/fan backdrop) | `rgba(6, 8, 4, 0.55)` |
| `color-scheme` | `dark` (native controls, autofill, scrollbars re-dark) |

---

## 3. Contrast rules (the dark-theme traps)
1. **No dark-on-dark:** all text on surfaces uses the text tokens above (≥4.5:1). Inputs =
   `--surface-2` bg + `--text` + visible `--border`; placeholders `--text-dim`.
2. **Lime is a FILL color:** lime fills carry **dark** `--on-accent` text; lime as text only on
   dark surfaces; never lime text on lime tints.
3. Sheens (`--accent-soft`) stay ≤12% opacity — glow, not neon-everywhere.
4. AA minimum everywhere; key text aims 7:1+ (OLED style guidance).

## 3.5 — Ambient backdrop + glass (v3.1, revised in v3.2)

### Ambient background
Two fixed, full-screen decorative layers (`z-index: -1`, `pointer-events: none`, `aria-hidden`):
- **Base (static, every in-app page):** `.ambient` in Layout.css, rendered once by `Layout` when the
  app shell shows. `radial-gradient(ellipse at 50% 32%, --ambient-mid → --ambient-deep → --bg)`.
  Never animated. The glass cards read as glass only because this shows through their tint.
- **Bloom (animated, dashboard only):** `.home-ambient` / `.home-ambient-bloom` in Home.css, on top
  of the base. A lime radial that "breathes" (22s alternate loop, **only `opacity` + `transform:
  scale`**). Paused via `visibilitychange`, static under `prefers-reduced-motion`.

| Token | Value |
|---|---|
| `--ambient-mid` | `#3F5A25` |
| `--ambient-deep` | `#202D14` |
| `--ambient-bloom` | `rgba(163, 230, 53, 0.55)` |

### Glass tiers (index.css)
Cards carry **no `backdrop-filter`**: over the smooth ambient gradient a blur is visually a no-op
(measured on Home at 375/412px: mean per-pixel change ≈0.3/255), and the animated bloom made every
blurred card re-blur each frame. The glass look = translucent tint + light border + top highlight.

| Tier | Class / surface | Treatment |
|---|---|---|
| Card | `.glass` | `--glass-bg` tint + `--glass-border` + `--shadow-card, --glass-highlight`. No blur. |
| Inset | `.glass-inset` | `--glass-inset-bg` — a recessed well *inside* a card (e.g. History's day detail). No blur. |
| Float | + menu, sheets, toasts | Near-opaque, no blur (moves onto this tier in the dashboard/nav phase). |
| Nav | `.bottomnav` | **The only blurred surface:** `.72` tint + `blur(var(--glass-blur))` (10px), `--glass-bg-solid` fallback. Applied in the dashboard/nav phase; until then it is `.85` + 14px. |

| Token | Value |
|---|---|
| `--glass-bg` | `rgba(24, 31, 19, 0.55)` |
| `--glass-inset-bg` | `rgba(16, 20, 13, 0.55)` |
| `--glass-bg-solid` | `rgba(24, 31, 19, 0.94)` (nav fallback) |
| `--glass-blur` | `10px` (nav only) |
| `--glass-border` | `rgba(214, 255, 170, 0.18)` |
| `--glass-highlight` | `inset 0 1px 0 rgba(214, 255, 170, 0.12)` |

Rules: doubled selectors (`.glass.glass`) so they beat component backgrounds regardless of bundle
order; radius/padding stay with the component. Max blurred layers on any screen: **1** (the nav).
Contrast: removing blur doesn't change it (blur keeps average luminance). Muted text on a card is
≈6.3:1 over the base gradient's brightest point; over the Home bloom core at full intensity it
computes to ≈3.9:1 — pre-existing, to fix with the dashboard phase.

## 3.6 — v3.2 additions: semantic tokens + shared building blocks

Values above are unchanged; v3.2 adds names for ROLES so components stop picking raw numbers.

| Group | Tokens |
|---|---|
| Radius roles | `--r-control` (=r-sm, inputs/buttons/chips) · `--r-card` (=r-md) · `--r-raised` (=r-lg, hero) · `--r-sheet` (=r-xl) |
| Type scale | `--text-xs .72` · `--text-sm .85` · `--text-base .95` · `--text-md 1.1` · `--text-lg 1.3` · `--text-display 2.8` (rem) |
| Elevation / chrome | `--shadow-sheet` · `--scrim` · `--danger-soft` |
| Motion | `--ease-in-out` · `--dur-pulse` (skeleton loop) |

**Shared building blocks — use these, never a per-screen copy:**
- **Buttons** — `.btn` + one variant `.btn-primary` / `.btn-secondary` / `.btn-danger`, optional
  `.btn-sm` / `.btn-block` (index.css). Includes press-compress, focus ring, hover gated to
  `(hover: hover)`. Component CSS may add layout only.
- **Bottom sheet** — `<Sheet title ariaLabel onClose>` (`components/sheet/`): scrim, slide-up panel,
  handle, header + close. Every sheet/panel renders it; content styles stay with the feature.
- **Loading** — `<Skeleton shape="line|block|circle">` inside `<SkeletonGroup label>`
  (`components/skeleton/`) instead of "Loading…" text. Opacity-only pulse. A `block` is drawn as
  the glass card it stands in for.
- **Entrances** — `.rise-in` (one element) and `.stagger` (on a list: children cascade by
  `--stagger`, capped at the 8th child) using the shared `rise-in` keyframe (index.css).

Motion rule: entrance keyframes never use `animation-fill-mode: forwards/both` — a held
`transform` on an ancestor turns it into the containing block for `position: fixed` children.

## 4. Anti-patterns (do not)
- Pure black `#000` canvas or neutral-gray darks (the green undertone is the identity).
- White text on lime fills; lime-on-lime; heavy borders instead of lightness elevation.
- Leftover v1 navy blues or v2 light-olive values anywhere (incl. recharts + var() fallbacks).
- Hardcoded per-component colors; layout-property animation; ignoring reduced-motion.
