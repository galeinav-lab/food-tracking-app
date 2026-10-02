# NutriTrack Design System — v3.2 "Dark Lime — Ambient Glass" (MASTER)

> Source of truth for all UI styling. v3.1 was a palette-only revision of v2 (archived as
> `MASTER-v2-light-olive.md`; v1 dark navy as `MASTER-v1-dark-navy.md`).
> **v3.2 (the ui-refresh branch)** keeps the palette and adds the system on top: semantic
> radius/type/spacing tokens, glass tiers with blur on the nav only, shared building blocks
> (`.btn`, `.field`/`.input`, `<Sheet>`, `<Skeleton>`, `<ActionMenu>`, `.chip`, `.card-list`), the
> motion rules and a measured contrast floor. **§3.5 and §3.6 supersede earlier sections where
> they differ.** Typography (Lora + Raleway) and the base motion system are inherited from v2.
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
- **Structure rules:** tokens only (index.css + colors.ts mirror), transform/opacity-only animation
  (one documented exception: the Ring sweep, §3.6).

### Dark-theme deltas (shadows & chrome)
| Token | Value |
|---|---|
| `--shadow-card` | `0 8px 24px rgba(0, 0, 0, 0.45)` |
| `--shadow-raised` | `0 10px 28px rgba(0, 0, 0, 0.55)` |
| `--shadow-nav` | `0 -6px 24px rgba(0, 0, 0, 0.5)` |
| Bottom nav | `--glass-nav-bg` (.72) + blur(10px) — see §3.5 |
| Scrims (sheet/fan backdrop) | `--scrim` = `rgba(6, 8, 4, 0.55)` |
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
- **Base (static, every screen):** `.ambient` in Layout.css, rendered once by `Layout`. `radial-gradient(ellipse at 50% 32%, --ambient-mid → --ambient-deep → --bg)`.
  Never animated. The glass cards read as glass only because this shows through their tint.
- **Bloom (animated, dashboard only):** `.home-ambient` / `.home-ambient-bloom` in Home.css, on top
  of the base. A lime radial that "breathes" (22s alternate loop, **only `opacity` + `transform:
  scale`**). Paused via `visibilitychange`, static under `prefers-reduced-motion`.

| Token | Value |
|---|---|
| `--ambient-mid` | `#3F5A25` |
| `--ambient-deep` | `#202D14` |
| `--ambient-bloom` | `rgba(163, 230, 53, 0.30)` — bloom core |
| `--ambient-bloom-mid` | `rgba(163, 230, 53, 0.12)` — bloom at 45% of its radius |

**Bloom strength is capped by contrast.** At the bloom's brightest frame (opacity 1, scale 1.09),
grey text on glass cards and directly on the gradient must stay ≥ 4.5:1. Measured with
`tools/ui-check/audit.mjs`: .55/.22 → 3.82:1 (30 failures on Home), .42 → 4.23, .36 → 4.42,
**.30/.12 → 4.61:1, 0 failures**. Don't raise it without re-running the audit.

### Glass tiers (index.css)
Cards carry **no `backdrop-filter`**: over the smooth ambient gradient a blur is visually a no-op
(measured on Home at 375/412px: mean per-pixel change ≈0.3/255), and the animated bloom made every
blurred card re-blur each frame. The glass look = translucent tint + light border + top highlight.

| Tier | Class / surface | Treatment |
|---|---|---|
| Card | `.glass` | `--glass-bg` tint + `--glass-border` + `--shadow-card, --glass-highlight`. No blur. |
| Inset | `.glass-inset` | `--glass-inset-bg` — a recessed well *inside* a card (e.g. History's day detail). No blur. |
| Float | `.glass-float` | `--glass-float-bg` (.98 — at .94 bright text behind ghosted through) + `--border-strong` + raised shadow, no blur. `<ActionMenu>`, the + menu, `<Sheet>` (upward `--shadow-sheet`, no bottom border), toasts, chart tooltips. |
| Nav | `.bottomnav` | **The only blurred surface:** `--glass-nav-bg` (.72) + `blur(var(--glass-blur))` (10px); `--glass-bg-solid` when `backdrop-filter` is unsupported. |

| Token | Value |
|---|---|
| `--glass-bg` | `rgba(24, 31, 19, 0.55)` |
| `--glass-inset-bg` | `rgba(16, 20, 13, 0.55)` |
| `--glass-nav-bg` | `rgba(24, 31, 19, 0.72)` (nav, over its blur) |
| `--glass-bg-solid` | `rgba(24, 31, 19, 0.94)` (nav fallback) |
| `--glass-float-bg` | `rgba(24, 31, 19, 0.98)` (float tier) |
| `--glass-blur` | `10px` (nav only) |
| `--glass-border` | `rgba(214, 255, 170, 0.18)` |
| `--glass-highlight` | `inset 0 1px 0 rgba(214, 255, 170, 0.12)` |

Rules: doubled selectors (`.glass.glass`) so they beat component backgrounds regardless of bundle
order; radius/padding stay with the component.

**Verified** (`audit.mjs`, 42 screen states at 375 and 412px — every route, the + menu, all four
logging sheets, a toast): blurred layers = **1 (the nav)** on every in-app screen, 0 on auth; text
contrast ≥ 4.5:1 everywhere (lowest 4.61, at the bloom's peak). Rules that keep it that way:
- Chips layer their tint over an opaque `--surface`; `.btn-danger` has an opaque fill — nothing
  translucent sits between coloured text and the glow.
- `--text-dim` is for placeholders and disabled states only; real text (meta, nav labels,
  counts) uses `--muted`.

## 3.6 — v3.2 additions: semantic tokens + shared building blocks

Values above are unchanged; v3.2 adds names for ROLES so components stop picking raw numbers.

| Group | Tokens |
|---|---|
| Radius roles | `--r-control` (=r-sm, inputs/buttons/chips) · `--r-card` (=r-md) · `--r-raised` (=r-lg, hero) · `--r-sheet` (=r-xl) |
| Type scale | `--text-xs .72` · `--text-sm .85` · `--text-base .95` · `--text-md 1.1` · `--text-lg 1.3` · `--text-xl 1.75` · `--text-display 2.8` (rem). Pick by role: hints/errors sm, meta xs, values base, glyph buttons lg |
| Layout | `--nav-clearance 96px` — screen bottom the fixed nav covers (content padding, popover flip) |
| Form controls | `--text-input 1rem` — every input/select/textarea is ≥16px (iOS Safari zooms on focus below that); outside the type scale on purpose |
| Elevation / chrome | `--shadow-sheet` · `--scrim` · `--danger-soft` |
| Tints | `--macro-protein-soft` · `--macro-carbs-soft` · `--macro-fat-soft` (14% chips/thumbs) · `--on-accent-soft` (badges on lime) |
| Motion | `--ease-in-out` · `--dur-pulse` (skeleton loop) · `--dur-ambient` (22s glow loop) |

**Shared building blocks — use these, never a per-screen copy:**
- **Buttons** — `.btn` + one variant `.btn-primary` / `.btn-secondary` / `.btn-danger`, optional
  `.btn-sm` / `.btn-block` (index.css). Includes press-compress, focus ring, hover gated to
  `(hover: hover)`. Component CSS may add layout only. Choice/toggle buttons use `.btn-secondary` +
  `aria-pressed="true"` for the selected look. A submit waiting on the server adds `.btn-loading`
  (+ `disabled`, `aria-busy`): a small transform-only spinner before the label. Only `transform`
  is transitioned; colour changes are instant.
- **Form fields** — `.field` > `.field-label` + `.input`, errors as `<p class="form-error"
  role="alert">` (index.css). Focus = accent border + soft ring; `aria-invalid="true"` gives the
  error border. Login, Register and Onboarding use these; older screens migrate in later phases.
- **Bottom sheet** — `<Sheet title ariaLabel onClose>` (`components/sheet/`): scrim, slide-up panel,
  handle, header + close. Every sheet/panel renders it; content styles stay with the feature.
- **Loading** — `<Skeleton shape="line|block|circle">` inside `<SkeletonGroup label>`
  (`components/skeleton/`) instead of "Loading…" text. Opacity-only pulse. A `block` is drawn as
  the glass card it stands in for.
- **Lists & cards** — `.card-list` (vertical stack, `--space-md` gap) + `.stagger`; macro/duration
  labels are `.chip` + `.chip-accent` / `-protein` / `-carbs` / `-fat` / `-burn`.
- **Card actions** — `<ActionMenu label items busy>` (`components/action-menu/`): a `.btn-icon` "⋯"
  trigger opening a float-tier menu; closes on outside tap / Escape / pick, spinner while busy;
  opens upward when it would otherwise land within `--nav-clearance` of the bottom.
  Use it when inline buttons would squeeze a card's title. `.input-sm` pairs inputs with `.btn-sm`.
- **Entrances** — `.rise-in` (one element) and `.stagger` (on a list: children cascade by
  `--stagger`, capped at the 8th child) using the shared `rise-in` keyframe (index.css). `.fade-in` is the opacity-only
  variant (step changes, scrims).

Spacing: padding/margin/gap use the `--space-*` scale (4/8/12/16/24/32) everywhere. Snapped once,
app-wide: 6→8, 10/11→12, 14/18→16, 20→24, 28→32. Allowed literals: optical micro-spacing ≤ 5px
inside chips/steppers/badges, negative optical offsets, and the fluid `clamp()` page gutters.

Literals policy: no hex/rgb or ms literals outside `index.css` (`styles/colors.ts` is the JS mirror
for recharts). Literal px remain only for dimensions (icon/thumb/button sizes), 1px borders, 2px
focus outlines, the + menu's fan coordinates, and the micro/optical cases above.

Page transition: `Main` keys a wrapper by pathname with `.fade-in` (opacity only, no held
fill-mode, so the page's fixed layers — Home's glow, the strength editor sheet — are never captured
by a transformed ancestor).

Motion rule: entrance keyframes never use `animation-fill-mode: forwards/both` — a held
`transform` on an ancestor turns it into the containing block for `position: fixed` children.

**Allowed exception:** the shared `Ring` fills by transitioning `stroke-dashoffset`
(`--dur-sweep`, `--ease-out`) — paint, not transform/opacity. Kept on purpose: a small SVG arc that
animates once per value change; a transform-based rewrite isn't worth it. Nothing else animates a
paint or layout property.

Charts: recharts animates in JS, outside CSS. `chartTheme.animation` (styles/colors.ts) mirrors
`--dur-sweep` / `--ease-out` for every series (Weight lines, Weekly bars, the weekly ring) and turns
animation off under `prefers-reduced-motion`, which the CSS kill-switch can't reach.

## 4. Anti-patterns (do not)
- Pure black `#000` canvas or neutral-gray darks (the green undertone is the identity).
- White text on lime fills; lime-on-lime; heavy borders instead of lightness elevation.
- Leftover v1 navy blues or v2 light-olive values anywhere (incl. recharts + var() fallbacks).
- Hardcoded per-component colors; layout-property animation; ignoring reduced-motion.
