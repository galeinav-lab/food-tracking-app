# ui-check — screenshot tooling for UI work

Dev-only scripts for checking UI changes visually without a backend, a login, or real data.
They are **not** imported by the app and not part of any build. Node 22+ (built-in `fetch` and
`WebSocket`), Google Chrome; no npm dependencies.

| File | What it does |
|---|---|
| `mock-api.mjs` | Mock NutriTrack API on `:5055` returning canned sample data in the `{ success, data }` envelope (goals, day view, deficit, summaries, water, exercise, weight, strength list, saved foods, onboarding). Login always answers 401 so the form's error state can be captured. `GET /__slow?ms=N` delays every response (loading states). |
| `shoot.mjs` | Opens the running frontend in headless Chrome, seeds a fake session in localStorage, runs each job (viewport, route, optional clicks/actions/scroll/CSS) and saves PNGs at 2× scale. |
| `contact.mjs` | Builds a labelled grid ("contact sheet") from a list of PNGs. |
| `compare.mjs` | Pixel-diffs `P-current.png` vs `P-proposed.png` pairs and writes side-by-side composites. |
| `audit.mjs` | Per job: every on-screen element with a `backdrop-filter`, and WCAG contrast of every visible text against its *rendered* background (text hidden, worst pixel inside each glyph box; covered and disabled text skipped). `node tools/ui-check/audit.mjs tools/ui-check/jobs/audit.json` |
| `runner.mjs` | The job runner shared by `shoot.mjs` and `audit.mjs` (session, viewport, route, actions, CSS, scroll). |
| `check-action-menu.mjs` | Drives `<ActionMenu>` with real mouse/keyboard events (open, ↑/↓/Home/End, Escape, outside tap, Tab, Enter) and prints the ARIA + focus state after each step. |
| `cdp.mjs` | Shared Chrome DevTools Protocol client: reuses Chrome on `:9333` or starts a headless one. |
| `jobs/*.json` | `audit.json` (every route + menu/sheet/toast states, glow frozen at its peak), `pages.json`, `forms.json`, `dashboard-secondary.json`, `dashboard-core.json`, `blur-compare.json`, `glow-compare.json`. |

## Run

From the repo root, in three terminals (PowerShell shown; in bash use `VAR=value npm start`):

```powershell
node tools/ui-check/mock-api.mjs
```

```powershell
cd frontend; $env:BROWSER="none"; $env:REACT_APP_API_URL="http://localhost:5055/api"; npm start
```

```powershell
node tools/ui-check/shoot.mjs tools/ui-check/out/forms tools/ui-check/jobs/forms.json
node tools/ui-check/contact.mjs tools/ui-check/out/forms-375.png 5 300 (Get-ChildItem tools/ui-check/out/forms/*375*.png).FullName
```

Output goes to `tools/ui-check/out/` (git-ignored). Override `CHROME_PATH`, `APP_URL`, `MOCK_URL`
or `CDP_PORT` via environment variables when the defaults don't fit.

## Job format

```json
{ "name": "login-error", "width": 375, "height": 812, "path": "/login",
  "session": "none", "wait": 1800, "slow": 0,
  "actions": "set('#login-email','a@b.test'); click('button[type=submit]');", "afterWait": 1200,
  "click": ".history-row", "scroll": "text-under-nav", "css": ".x { … }" }
```

- `session`: `"none"` logged out · `"new"` logged in, not onboarded · omitted = onboarded user.
- `actions`: async JS run in the page with helpers `set(selector, value)` (fires React's input
  event), `click(selector, index?)`, `sleep(ms)`, `slow(ms)` (toggle the mock's delay mid-job).
- `slow`: mock delay applied before the route loads (capture skeletons with a short `wait`).
- `scroll`: a pixel offset, a CSS selector (that element is scrolled to the top of the screen),
  `"text-under-nav"` (meal rows behind the bottom nav), or `"keep"` (wherever `actions` scrolled).
- `css`: injected after load (e.g. to A/B a style for `compare.mjs`).

The mock data and the fake session never touch the real backend or database.
