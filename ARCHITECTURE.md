# NutriTrack — Architecture & Context

> **Read this first** before adding or changing a feature. It's a high-level orientation map:
> where things live, how data flows, and the rules that must not be broken. For specifics,
> open the file it points to. Structure is kept accurate; fine details may drift — trust the code.

---

## 1. Overview

A mobile-first nutrition tracker. A user onboards (body stats + weight goal), the app uses AI
to set daily nutrition **goals**, then they **log meals** (parsed by AI), **exercise**, **water**,
and **weight**. The dashboard shows the day's calories/macros vs goals, a **weekly calorie-deficit**
ring, and history.

Alongside the nutrition side sits a **strength-training list**: the user's lifts, one tab per muscle
group, edited in place as they get stronger. It is a *living list*, not a log, and it is deliberately
isolated from everything energy-related (§7.2).

**Core flow:** Register → Onboarding (AI computes goals) → Dashboard (log meal/exercise/water via
the `+` button, pick a day in the week strip) → Track daily goals + weekly deficit → History.

**Navigation:** a fixed bottom nav with five slots — **Home · History · `+` (logging sheet) ·
Lifts (strength list) · Settings**. Weight is *not* in the nav: it lives behind a **Track Weight**
row in Settings (§6).

---

## 2. Tech stack

- **Frontend:** Create React App + TypeScript, React 19, react-router v7, **Redux Toolkit (auth only)**,
  **recharts** (charts/rings), axios. Dark green + lime "ambient glass" theme via CSS custom properties
  (`design-system/nutritrack/MASTER.md`).
- **Backend:** Node + Express 5 + TypeScript (OOP, class-based), **Mongoose** (MongoDB), JWT auth,
  bcrypt, helmet, express-rate-limit, Joi validation.
- **External:** **Anthropic API** (Claude) for food parsing + goal calculation.
- **Hosting:** MongoDB **Atlas** (db) · **Render** (backend) · **Vercel** (frontend).

---

## 3. Repo layout (monorepo)

```
food-track-project/
├── backend/          Express API (compiles to dist/ via tsc; run: npm run dev | build+start)
│   └── src/
│       ├── models/       Mongoose schemas + the shared error classes (client-error.ts) + enums
│       ├── services/     Business logic (the real work) — one class per domain
│       ├── controllers/  Thin HTTP layer: read req, call service, send envelope
│       ├── routes/       Express routers; map URL → controller method
│       ├── middleware/    auth (token), validation (Joi), errors, rate-limit, admin, logger
│       ├── validation/   Joi schemas per domain
│       ├── types/        Backend-only TS interfaces (inputs, results)
│       ├── utils/        energy.ts (BMR/deficit math), date-tz.ts (tz-safe dates), app-config.ts
│       ├── views/        error-report-view.ts (HTML admin inbox as a string)
│       ├── config/       db.ts (Mongo connect)
│       ├── app.ts        Express app: middleware order + route mounts + error handlers
│       └── server.ts     connectDB() then app.listen(PORT)
├── frontend/         CRA app (builds to build/)
│   └── src/
│       ├── components/   One folder per component (Component.tsx + Component.css)
│       ├── services/     API layer (http-client + one *.service.ts per domain) + seams
│       ├── models/       TS interfaces mirroring backend responses
│       ├── store/        Redux Toolkit (auth slice, typed hooks, store, auth-bridge)
│       ├── context/      refresh-context.tsx (selectedDate + refresh signal — NOT Redux)
│       ├── styles/       colors.ts (JS mirror of CSS tokens for recharts/SVG, incl. chart motion)
│       └── utils/        date.ts (tz-safe dates, mirrors backend date-tz.ts)
├── design-system/    nutritrack/MASTER.md — tokens, glass tiers, shared UI blocks (source of truth)
└── tools/ui-check/   Dev-only screenshot tooling (mock API + headless Chrome); not part of any build
```

---

## 4. Backend architecture

**Layering (strict):** `route → controller → service → model`.

- **`BaseController`** (`controllers/base-controller.ts`) — every controller extends it; owns the
  response **envelope**: success = `{ success:true, data }`, error = `{ success:false, error, status }`.
- **`BaseService<T>`** (`services/base-service.ts`) — abstract generic repository (findById/create/
  deleteById); domain services extend it and pass their Mongoose model to `super()`.
- **Controllers are thin** — parse `req`, call a service, `sendSuccess`, `catch → next(err)`. No business logic.
- **Services hold all logic** and are exported as singletons (e.g. `foodService`).
- **Middleware** (`middleware/`): `tokenMiddleware.validateToken` (JWT gate, sets `req.user`),
  `validateBody(schema)` (Joi, strips unknown keys), `errorMiddleware.catchAll` (global handler,
  registered LAST), `authLimiter` (rate-limit on auth), `adminMiddleware` (error-inbox key), `logger`,
  and — scoped to the `/api/saved-foods/scan-label` path **only** — a 10mb `express.json()` parser
  registered *before* the default one (the default 100kb limit would 413 a label photo before any
  handler runs; body-parser marks the body read, so the default parser below it skips that path).
  **Replicate this for any future image-upload endpoint** — and keep the large limit path-scoped, never
  global.

**Request lifecycle (typical authed call):**
`helmet → cors → express.json → logger → router → tokenMiddleware (401 if bad JWT) →
validateBody (400 if invalid) → controller → service → model/Mongo → sendSuccess`.
Any throw / `next(err)` → `errorMiddleware.catchAll` (logs 5xx fully; in prod hides 5xx detail).

**Mounts** (`app.ts`): `/api/auth`, `/api/food`, `/api/goals`, `/api/onboarding`, `/api/weight`,
`/api/user`, `/api/exercise`, `/api/water`, `/api/saved-foods`, `/api/strength`, `/api/error-report`,
plus public `/api/health`.

⚠️ **`/api/exercise` and `/api/strength` are different features** — burn log vs strength list. See §7.3
before touching either.

**`/api/strength`** (strength list) mirrors the standard shape: the whole router is behind
`tokenMiddleware`, `GET /` returns the user's lifts (optional `?muscleGroup=` filter, validated in the
controller since `validateBody` only covers bodies), `POST /` creates, `PATCH /:id` partially updates
any of name/sets/reps/weightKg/muscleGroup, `DELETE /:id` removes. Ownership uses one shared gate —
400 on a malformed id, 404 when missing, 403 when it belongs to someone else.

---

## 5. Data models (`backend/src/models/`)

| Model | Collection | Purpose & non-obvious fields |
|---|---|---|
| **User** | `users` | Account + `preferences.timezone` (default `Asia/Jerusalem`), onboarding `profile` (weightKg/heightCm/age/sex), `goalType`, `targetWeightKg`, `timeframeMonths`, `activityLevel`, computed `bmr` + `maintenanceCalories`, `waterTargetMl`, `onboardingCompleted`. `passwordHash` is **`select:false`** (never returned unless explicitly asked). `toSafeObject()` strips the hash. ⚠️ The embedded **`goals`** field is **vestigial** — real goals live in the `Goal` collection (see below). |
| **Goal** | `goals` | **The source of truth for daily targets** (calories/protein/carbs/fat/fiber). One per user (`userId` unique). Onboarding + Settings write here via `goalsService`; the dashboard reads here. |
| **FoodLog** | `food_logs` | One logged meal: `description`, `items[]` (AI-parsed, `_id:false` subdocs), `totals` (nutrition), `date` (**Date/instant**). Compound index `{userId, date:-1}`. |
| **DailySummary** | `daily_summaries` | **Pre-computed per-user/day rollup**: `totals`, `logCount`, `exerciseBurned`, `goalSnapshot`. `date` is a **`YYYY-MM-DD` string** (calendar day, not instant). Exists only for days **with food logs** — that's the "logged day" signal. Rebuilt from source (never hand-edited) — see recompute below. |
| **SavedFood** | `saved_foods` | A reusable food the user can re-log without an AI call: macros stored **per 100** units of its `baseUnit` (`g`/`ml`), scaled by `amount / 100` when logged. `source` records the origin (`manual` / `ai` from a parsed log / `label` from a scanned nutrition label). Index `{userId, name}`. |
| **NutritionCache** | `nutrition_caches` | Caches AI food results by a normalized key. `unique` key; **TTL index** auto-deletes after 90 days; `hitCount`. |
| **ExerciseEntry** | `exercise_entries` | ⚠️ The calorie-**BURN** log (not the strength list): `type`, `caloriesBurned`, optional `durationMin`/`note`, `date` (`YYYY-MM-DD` string). Multiple per day allowed. Feeds `DailySummary` + the deficit. |
| **StrengthExercise** | `strength_exercises` | ⚠️ **Not a log — a living list.** One row per lift the user keeps: `muscleGroup` (enum: back/chest/biceps/triceps/shoulders/abs/legs), `name`, `sets`, `reps`, `weightKg` (default 0 = bodyweight; decimals allowed for 2.5 kg plates). **No `date` field** — rows are overwritten in place as the user gets stronger. `MUSCLE_GROUPS` is exported from this model and is the **single source** for the schema enum, the Joi validator and the controller's `?muscleGroup=` check (`frontend/src/models/strength.ts` mirrors it). Index `{userId, muscleGroup}`. |
| **WaterDay** | `water_days` | Running daily total `waterMl`. **Unique compound `{userId,date}`** → safe upsert+`$inc`. |
| **WeightEntry** | `weight_entries` | `weightKg`, `date` (`YYYY-MM-DD`). **Unique `{userId,date}`** → one per day (re-log overwrites). |
| **ErrorReport** | `error_reports` | Friends-and-family crash inbox: short `errorId`, source, message/stack, screen/route, apiUrl/status, backend error, userNote, user id/email. Secrets scrubbed before save. |

**Key design choice — DailySummary + recompute:** `foodService.recomputeDailySummary(userId, dateString, tz)`
is the **single source of truth**. It re-sums a day's `FoodLog`s + `ExerciseEntry`s from scratch and
upserts the summary (deletes it if zero logs). Every food **log/edit/delete** and every exercise
**add/remove** calls it, so summaries can never drift. Read paths trust the summary.

---

## 6. Key flows / business logic

- **AI food parsing** — `services/ai-service.ts` `analyzeFood()`. Cache-aside: normalize description →
  check `NutritionCache` → on miss call Claude with a strict JSON-only **system prompt** → **parse +
  runtime type-guard** the JSON (never trust the LLM) → write back to cache. Edits pass previous
  description as context and **bypass cache**.
- **Saved foods + label scanning** — a `SavedFood` holds macros **per 100** units, so re-logging costs
  no AI call: `POST /api/food/log-saved` scales `per100 × amount/100` into a normal one-item `FoodLog`.
  They're created by hand, from an already-logged AI meal (`/saved-foods/from-log/:logId` — needs the
  amount that meal represented; infers it from the log's items when they're all g/ml, else **400s asking**
  rather than guessing), or from a label photo: `POST /api/saved-foods/scan-label` →
  `aiService.readNutritionLabel()`, a **vision** call with the same JSON-only prompt + runtime
  type-guard discipline as `analyzeFood`. The scan **saves nothing** — nutrients it couldn't read come
  back `null` (never invented), a per-serving label with an unknown serving size comes back
  `needsServingSize` for the UI to resolve, and the user confirms/edits in `SavedFoodForm` before the
  normal create endpoint stores it.
- **BMR / maintenance** — `utils/energy.ts` **only**. `calculateBmr` (Mifflin-St Jeor), `calculateMaintenance`
  (BMR × activity factor from `ACTIVITY_FACTORS`), `calculateEnergy` returns both rounded. Persisted onto
  the user at onboarding / activity change.
- **Onboarding goal calc** — `services/onboarding-service.ts`: AI computes goals (`aiService.calculateGoals`,
  clamped server-side to safe bounds), profile saved on User, deterministic BMR/maintenance computed via
  `energy.ts`, goals written to the **Goal collection** via `goalsService.setGoals`.
- **Strength list** — `services/strength-service.ts` is plain CRUD over `strength_exercises` and
  nothing else: no dates, no recompute, no energy math (§7.2). `GET /api/strength` returns all of a
  user's lifts sorted `createdAt` **asc**, so the list keeps the order they built it in and editing a
  row never reshuffles it. Weights are rounded to 2dp on write.
- **Strength page** — routed at **`/strength`** (component `components/strength/`). It fetches
  **every** exercise once on mount and filters per muscle-group tab **in memory**, so switching tabs
  is instant and never re-hits
  the network; create/edit/delete patch the local list rather than refetching. The core action is
  bumping a weight: the card's −/+ updates state immediately and fires a **debounced** `PATCH`
  (~600 ms after the last tap) — a stale-response guard drops a reply that a newer tap has superseded,
  and any queued bump is flushed on unmount so navigating away mid-tap can't lose it.
- **Weight tracking** — the `/weight` page (log form + actual-vs-target chart + history) is routed and
  works as it always did, but it is **no longer in the bottom nav**; its entry point is the
  **Track Weight** row in Settings. Two pieces live outside the page so they exist exactly once:
  `utils/weight-chart.ts` (`buildWeightChart` — the trajectory series, y-domain and progress summary)
  and `components/weight-entry/WeightEntry.tsx` (**the only weight form in the app**). Reuse those
  rather than re-deriving the trajectory or hand-rolling a second form.
- **Weekly deficit** — pure math in `utils/energy.ts` (`computeDailyDeficit`, `computeWeeklyDeficit`);
  data gathering in `foodService.getWeeklyDeficit(userId, anchorDate?)`, exposed at
  **`GET /api/food/deficit?date=YYYY-MM-DD`**. Model: `dailyDeficit = maintenance + exerciseThatDay − eatenThatDay`
  (**signed** — surplus is negative). `weeklyDeficit` = Σ over the **Sun–Sat** week, **logged days only**
  (un-logged and exercise-only days are excluded, not treated as zero-intake). `projectedKg = weeklyDeficit/7700`.
  Week bounds via `getWeekRange` (`utils/date-tz.ts`). Maintenance source: persisted `user.maintenanceCalories`,
  else recomputed from profile via `energy.ts`.

---

## 7. Conventions & invariants (do not break)

1. **Deficit = one source of truth.** The backend `/api/food/deficit` endpoint is authoritative.
   The frontend (`WeeklyRing`, `WeeklyCalories`) does **no deficit math** — it only renders the response.
2. **The strength feature is ISOLATED from the energy system.** `StrengthExercise` has **no date
   field**, and `strength-service.ts` touches **only** the `strength_exercises` collection. It must
   never read or write `ExerciseEntry`, `DailySummary`, `recomputeDailySummary`, the `/deficit`
   endpoint or `utils/energy.ts`, and nothing in it may ever be wired into deficit/calorie math.
   Sets, reps and kilos are not energy — it is a living list of lifts, not a log of workouts.
3. **Don't confuse the two "exercise" features.** They are unrelated, and the names are close enough
   to cause real damage:
   - `/api/exercise` + **`ExerciseEntry`** (`exercise_entries`) — **dated calorie-BURN entries**;
     feed `DailySummary` and the deficit. Frontend: `components/exercise-list/` (dashboard section).
   - `/api/strength` + **`StrengthExercise`** (`strength_exercises`) — the **undated strength list**;
     isolated per §7.2. Frontend: `components/strength/`, routed at `/strength`.
4. **Dates are `YYYY-MM-DD` calendar strings**, computed with the shared tz-safe helpers
   (`backend/src/utils/date-tz.ts` ⇆ mirrored in `frontend/src/utils/date.ts`). Weeks are **Sunday→Saturday**
   via `getWeekRange`; both sides must use it so the strip and deficit always agree. Default tz `Asia/Jerusalem`.
5. **BMR/maintenance formula exists in exactly one place** (`utils/energy.ts`). Never re-implement it.
6. **Goals live in the `Goal` collection**, read/written via `goalsService`. Don't read `User.goals`.
7. **Only auth is in Redux.** Server data (day, summaries, deficit, water, exercise) is fetched **on demand**
   in components; the day/refresh signal lives in `refresh-context` (`selectedDate` + `refreshKey`, not Redux).
8. **Ownership checks** on edit/delete: services verify the doc's `userId === req.user._id` (403 otherwise).
9. **Secrets only in env vars** (never committed). Login errors are generic ("invalid email or password") to
   avoid user enumeration.
10. **Express route order:** specific routes before parameterized ones (e.g. `/deficit` must precede any `/:id`).
11. **After backend changes, rebuild** — `npm start` runs compiled `dist/`; use `npm run dev` (ts-node) locally
   or `npm run build` before `npm start`.

---

## 8. Environment / config

**Backend** (`backend/.env`, see `.env.example`; read in `utils/app-config.ts`):

| Var | Purpose |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string (with db name). |
| `ANTHROPIC_API_KEY` | Claude API key (food parsing + goals). |
| `JWT_SECRET` | Signs/verifies JWTs. |
| `PORT` | Server port (Render injects; local default 3000/use 5000). |
| `CLIENT_URL` | Allowed CORS origin(s) — the Vercel URL (comma-separated ok). localhost:3000 always allowed. |
| `NODE_ENV` | `production` hides internal 5xx detail (still logged). |
| `ADMIN_REPORT_KEY` | Unlocks the crash inbox (`GET /api/error-report`); unset = locked. |

**Frontend** (`frontend/.env`, `REACT_APP_` prefix; **baked in at BUILD time** — change ⇒ redeploy/rebuild):

| Var | Purpose |
|---|---|
| `REACT_APP_API_URL` | Backend base URL incl. `/api` (e.g. Render URL). Dev default `http://localhost:5000/api`. |
| `REACT_APP_TESTING` | `true` enables the crash reporter, friendly toasts, and the "Report a problem" button. |

---

## 9. How to add a feature

**Backend (per domain):**
1. **Model** — `models/x.ts` (schema + interface; add indexes; `YYYY-MM-DD` string dates for day-keyed data).
2. **Types** — `types/x.ts` (input/result interfaces, no `any`).
3. **Validation** — `validation/x.validation.ts` (Joi schema).
4. **Service** — `services/x-service.ts` (extend `BaseService` if CRUD; all logic here; ownership checks;
   call `recomputeDailySummary` if it affects a day's totals).
5. **Controller** — `controllers/x-controller.ts` (thin; extend `BaseController`; `sendSuccess` / `next(err)`).
6. **Route** — `routes/x.routes.ts` (`router.use(tokenMiddleware…)`; **specific routes before `/:id`**),
   then mount in `app.ts`.
7. **Rebuild** before running the compiled server.

**Frontend:**
1. **Model** — `models/x.ts` mirroring the response shape.
2. **Service fn** — add to the relevant `services/*.service.ts` (uses `http` from `http-client.ts`).
3. **Component** — `components/x/X.tsx` + `X.css`; `function X(): JSX.Element` (import `type JSX` — React 19).
   Read `selectedDate`/`refreshKey` from `useRefresh()`; fetch on demand with loading/error states; use
   design tokens (no hardcoded colors); recharts colors come from `styles/colors.ts`. Reuse the shared
   UI blocks rather than restyling your own: `.btn` + variant, `.field`/`.input`/`.form-error`,
   `.card-list`/`.chip` (index.css), `<Sheet>` for any bottom sheet, `<ActionMenu>` for a card's
   actions, `<Skeleton>`/`<SkeletonGroup>` for loading (see `design-system/nutritrack/MASTER.md` §3.6).
4. **Check it visually** — `tools/ui-check/` runs the frontend against a mock API (sample data, no
   backend, no login) and screenshots routes/states at phone widths in headless Chrome; `audit.mjs`
   there checks text contrast against the rendered background and counts blurred layers. Dev-only:
   nothing in the app imports it. Usage and job format in `tools/ui-check/README.md`.

**Gotchas:** use the shared date helpers (never `new Date("YYYY-MM-DD")`); keep deficit math server-side;
respect Express route order; call the recompute helper on any change to a day's food/exercise.

---

## 10. Known gaps / TODOs (intentionally incomplete)

- **No automated tests.** Only CRA's default `App.test.tsx`; no backend tests. Pure functions in
  `energy.ts`/`date-tz.ts` are the easiest first targets.
- **Crash-reporting is a testing-phase feature** behind `REACT_APP_TESTING` + `ADMIN_REPORT_KEY`; turn off
  for real production.
- **`User.goals` is vestigial** — the `Goal` collection is authoritative; the embedded field could be removed.
- **Orphaned files:** `components/layout/header/` (the top Header, replaced by the bottom nav) still
  exists and is imported nowhere; `mysql2` sits in backend deps as an unused template leftover.
- **Comments:** most files carry explanatory + concept ("learning") comments; a one-time "strip all comments"
  request did not fully run, so comments remain.
- **Weekly components** (`WeeklyRing`, `WeeklyCalories`) already migrated to the `/deficit` endpoint (no local
  math) and the date strip is a fixed Sun–Sat week with prev/next/Today nav — done, noted for context.

---

_Last updated: 2026-08. Keep this file's structure current when architecture changes; let details live in code._
