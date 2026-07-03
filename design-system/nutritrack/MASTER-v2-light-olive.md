# NutriTrack Design System — v2 "Light Olive" (MASTER)

> Source of truth for all UI styling. Replaces v1 (dark navy — archived as `MASTER-v1-dark-navy.md`).
> Generated with ui-ux-pro-max: style base **"Nature Distilled"** + **"Organic Biophilic"**
> (muted earthy olive, organic rounded, natural ease-out — best-for: wellness/organic food apps),
> typography pairing **Lora + Raleway** (calm/wellness/organic; best-for: health apps).
> All hex pairs below verified for WCAG AA on the light surfaces they sit on.

---

## 1. Palette — Light Olive Green

### Surfaces (bright but soft — olive undertones, never stark white)
| Token | Hex | Use |
|---|---|---|
| `--bg` | `#F3F4EA` | App canvas — warm off-white with olive undertone |
| `--surface` / `--card-bg` | `#FBFBF5` | Cards — a touch lighter than canvas (soft lift) |
| `--surface-2` | `#EAEBDD` | Inputs, chips, secondary fills |
| `--surface-3` | `#DEE0CC` | Pressed states, deep tracks, handles |
| `--border` | `rgba(60, 66, 30, 0.14)` | Hairline borders (visible on light) |
| `--border-strong` | `rgba(60, 66, 30, 0.26)` | Hover/focus borders |

### Text (AA on `--surface`/`--bg`)
| Token | Hex | Contrast on card | Use |
|---|---|---|---|
| `--text` | `#252A18` | ≈14:1 | Primary text — deep olive-charcoal |
| `--muted` / `--text-muted` | `#5A6147` | ≈6.2:1 | Secondary text |
| `--text-dim` | `#6E755B` | ≈4.6:1 | Placeholders, faint labels |

### Accent (primary olive — CTAs, rings, center + button)
| Token | Hex | Note |
|---|---|---|
| `--accent` | `#5A6B2F` | Deep olive. White text on it ≈5.8:1 ✓; as text on bg ≈5.3:1 ✓ |
| `--accent-cta` | `#4A5926` | Hover/darker CTA |
| `--accent-press` | `#3D4A1F` | Pressed |
| `--accent-soft` | `rgba(90, 107, 47, 0.12)` | Tint fills (chips, selected states) |
| `--accent-disabled` | `#ADB58E` | Disabled fills (keep label `--on-accent`) |
| `--on-accent` | `#FFFFFF` | Text/icons on accent |

### Macro ring colors (distinct from each other + the olive accent; ≥4.5:1 on cards)
| Token | Hex | |
|---|---|---|
| `--macro-protein` | `#B4472F` | Clay red (Nature Distilled warm-clay family) |
| `--macro-carbs` | `#A16207` | Ochre/amber |
| `--macro-fat` | `#0F766E` | Deep teal |
| `--water` | `#0369A1` | Deep sky blue |
| `--ring-track` | `rgba(60, 66, 30, 0.10)` | Empty ring/bar track |

### State colors (light-base AA)
| Token | Hex | Use |
|---|---|---|
| `--success` | `#2E7D32` | Deficit day bars, "saved" |
| `--warning` | `#B45309` | Surplus day bars, over-goal |
| `--error` / `--danger` | `#B3261E` | Errors, destructive |

> Macro/state colors are always paired with a text label (never color-only) — red/ochre can
> converge for color-blind users.

### Charts (JS mirror in `frontend/src/styles/colors.ts` — recharts can't read CSS vars)
grid `rgba(60,66,30,0.10)` · axis text `#5A6147` · tooltip bg `#FBFBF5` border `rgba(60,66,30,0.14)`.

---

## 2. Typography — "Organic Premium"

```css
@import url('https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=Raleway:wght@400;500;600;700&display=swap');
```

| Token | Stack | Use |
|---|---|---|
| `--font-head` | `'Lora', Georgia, serif` | Headings + hero/ring numbers (organic-premium serif) |
| `--font-body` | `'Raleway', -apple-system, 'Segoe UI', sans-serif` | Body, labels, buttons |

Scale (unchanged from v1): body 16px/1.5; section titles ~1.1–1.3rem 600–700; hero number ~2.8rem 700
(Lora, `font-variant-numeric: tabular-nums` for anything that counts).

---

## 3. Radii & Elevation (light, airy)

Radii (organic-rounded, per Organic Biophilic): `--r-sm: 12px` · `--r-md: 16px` · `--r-lg: 20px` · `--r-xl: 28px` · `--r-pill: 999px`.

Shadows — soft and natural, no heavy dark panels:
| Token | Value |
|---|---|
| `--shadow-card` | `0 1px 2px rgba(58,63,36,0.06), 0 4px 14px rgba(58,63,36,0.08)` |
| `--shadow-raised` | `0 2px 4px rgba(58,63,36,0.08), 0 10px 24px rgba(58,63,36,0.12)` |
| `--shadow-nav` | `0 -4px 16px rgba(58,63,36,0.10)` |
| `--glow-accent` | `0 6px 18px rgba(90,107,47,0.35)` |

Cards = `--surface` + `--border` hairline + `--shadow-card`. Bottom nav = `rgba(251,251,245,0.88)` + blur(14px).

---

## 4. Motion system (the anti-robotic layer)

### Tokens
| Token | Value | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | ALL entrances (natural decelerate) |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Exits only |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Fan-out, playful pops (slight overshoot) |
| `--dur-fast` | `150ms` | Hovers, color shifts |
| `--dur-base` | `200ms` | Most transitions |
| `--dur-slow` | `250ms` | Sheets, larger panels |
| `--dur-press` | `50ms` | Press-down compress |
| `--dur-sweep` | `550ms` | Ring/bar fill sweeps |
| `--stagger` | `40ms` | Between fan-out items / list entrances |

### Rules
1. **Nothing pops.** Every appear/disappear = opacity + small transform (translateY 4–8px or scale 0.96→1), `--dur-base` `--ease-out` in, `--dur-fast` `--ease-in` out.
2. **Press feedback everywhere:** `:active { transform: scale(0.97); }` with `--dur-press`, spring back on release. Applies to every tappable (nav items, day boxes, buttons, cards with actions).
3. **+ fan-out:** options scale 0.5→1 + fade + rise with `--ease-spring`, second item delayed `--stagger`; the + rotates 45°→× over `--dur-base`. Close reverses with `--ease-in` at `--dur-fast`.
4. **Rings/progress sweep** to value on load & change: `--dur-sweep` `--ease-out` on `stroke-dashoffset` / width. Numbers may tween ~400ms.
5. **Logging success:** new card eases in (rule 1) + affected ring sweeps (rule 4). No confetti.
6. **Performance:** animate ONLY `transform` + `opacity` (+ SVG stroke-dashoffset); never top/height/margin. `will-change` sparingly.
7. **`prefers-reduced-motion: reduce`** → transitions collapse to fast opacity fades or none; sweeps render final value instantly. (Global kill-switch stays in `index.css`.)

---

## 5. Component notes (dashboard)
- **Date strip:** selected = accent fill + `--on-accent`; today = accent outline + dot; future = 40% opacity, disabled; boxes press-compress.
- **Hero ring:** accent sweep on `--ring-track`; big Lora number; "kcal left" label `--muted`.
- **Macro rings:** protein/carbs/fat colors above; grams in Lora.
- **Meals/exercise cards:** `--surface` + hairline + `--shadow-card`; chips use `--accent-soft`-style tints of their color.
- **Bottom nav:** blurred light surface, active item `--accent`; center + = accent circle + `--glow-accent`, 4px `--bg` ring.
- **Weekly bars:** `--success`/`--warning`; unlogged = `--ring-track` empty track.

## 6. Anti-patterns (do not)
- Stark `#FFFFFF` canvas or pure-black text; heavy dark panels/shadows.
- Olive-on-olive low-contrast text (the light-theme dark-on-dark); anything below AA.
- Hardcoded per-component colors (tokens only — `index.css` + `styles/colors.ts` mirror).
- Instant show/hide; animating layout properties; ignoring reduced-motion.
