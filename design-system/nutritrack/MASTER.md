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

## 3.5 — v3.1 additions: ambient glow + frosted glass

### Ambient background (dashboard canvas)
Fixed full-screen decorative layer behind the dashboard (`.home-ambient` in Home.css,
`z-index: -1`, `pointer-events: none`, `aria-hidden`). Two layers:
- **Base (static):** `radial-gradient(ellipse at 50% 32%, --ambient-mid → --ambient-deep → --bg)` —
  lime-adjacent mid greens easing to the near-black edges that frame the screen.
- **Bloom (animated):** a separate lime radial (`--ambient-bloom` core, ≤20% opacity — a
  diffused bloom, never a hard disc) that "breathes": 22s `ease-in-out` alternate loop tweening
  **only `opacity` (0.65→1) + `transform: scale(1→1.07)`** — never gradient stops/size.
  Paused via `visibilitychange` (class toggle → `animation-play-state: paused`) and static
  under `prefers-reduced-motion` (plus the global kill-switch).

| Token | Value |
|---|---|
| `--ambient-mid` | `#2E401D` |
| `--ambient-deep` | `#1A2412` |
| `--ambient-bloom` | `rgba(163, 230, 53, 0.34)` |

### Frosted-glass cards (`.glass` utility, index.css)
Applied to the dashboard cards (hero, macro cards, fiber, weekly ring, water, meal/exercise
cards). Semi-OPAQUE tint + MODEST blur — glass look, readable text, GPU-sane with many cards.

| Token | Value |
|---|---|
| `--glass-bg` | `rgba(24, 31, 19, 0.60)` |
| `--glass-bg-solid` | `rgba(24, 31, 19, 0.94)` (no-`backdrop-filter` fallback) |
| `--glass-blur` | `10px` (do not crank) |
| `--glass-border` | `rgba(214, 255, 170, 0.18)` |
| `--glass-highlight` | `inset 0 1px 0 rgba(214, 255, 170, 0.12)` (top glass edge) |

Rules: base `.glass` = solid fallback; `@supports (backdrop-filter)` upgrades to real blur.
Doubled selector (`.glass.glass`) so it beats component backgrounds regardless of bundle order.
Text on glass must stay AA over BOTH the bloom center and dark edges (the 72% tint guarantees
the effective backdrop stays dark; verified ≈13:1 primary / ≈6.5:1 muted at the brightest point).

## 4. Anti-patterns (do not)
- Pure black `#000` canvas or neutral-gray darks (the green undertone is the identity).
- White text on lime fills; lime-on-lime; heavy borders instead of lightness elevation.
- Leftover v1 navy blues or v2 light-olive values anywhere (incl. recharts + var() fallbacks).
- Hardcoded per-component colors; layout-property animation; ignoring reduced-motion.
