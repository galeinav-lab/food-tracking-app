// Mock of the NutriTrack API for UI screenshots only: canned sample data, no
// database, no auth. See README.md. Never point a real build at it.
import http from "node:http";

const PORT = 5055;
const ts = "2026-10-01T08:00:00.000Z";
const n = (calories, protein, carbs, fat, fiber) => ({ calories, protein, carbs, fat, fiber });
const item = (name, quantity, unit, nut) => ({ name, quantity, unit, nutrition: nut });
const log = (id, description, items) => {
    const totals = items.reduce(
        (t, i) => n(t.calories + i.nutrition.calories, t.protein + i.nutrition.protein, t.carbs + i.nutrition.carbs, t.fat + i.nutrition.fat, t.fiber + i.nutrition.fiber),
        n(0, 0, 0, 0, 0)
    );
    return { _id: id, userId: "u1", description, items, totals, date: ts, createdAt: ts, updatedAt: ts };
};

const logs = [
    log("l1", "Greek yogurt with granola and blueberries", [
        item("Greek yogurt", 200, "g", n(194, 18, 8, 10, 0)),
        item("Granola", 40, "g", n(180, 4, 26, 7, 3)),
        item("Blueberries", 80, "g", n(46, 1, 12, 0, 2)),
    ]),
    log("l2", "Chicken breast, rice and broccoli", [
        item("Chicken breast", 180, "g", n(297, 56, 0, 6, 0)),
        item("White rice", 150, "g", n(195, 4, 43, 0, 1)),
        item("Broccoli", 120, "g", n(41, 3, 8, 0, 3)),
    ]),
    log("l3", "Apple", [item("Apple", 1, "piece", n(95, 0, 25, 0, 4))]),
    log("l4", "Salmon salad with olive oil", [
        item("Salmon", 150, "g", n(312, 31, 0, 20, 0)),
        item("Mixed greens", 100, "g", n(20, 2, 3, 0, 2)),
        item("Olive oil", 10, "ml", n(88, 0, 0, 10, 0)),
    ]),
    log("l5", "Protein shake", [item("Whey protein", 30, "g", n(120, 24, 3, 2, 0))]),
];
const dayTotals = logs.reduce(
    (t, l) => n(t.calories + l.totals.calories, t.protein + l.totals.protein, t.carbs + l.totals.carbs, t.fat + l.totals.fat, t.fiber + l.totals.fiber),
    n(0, 0, 0, 0, 0)
);

const days = ["2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01"];
const summaries = days.map((d, i) => ({
    _id: "s" + i, userId: "u1", date: d, totals: n(1500 + i * 120, 110, 160, 55, 22),
    logCount: 3 + (i % 3), exerciseBurned: 200, goalSnapshot: { calories: 2000 }, createdAt: ts, updatedAt: ts,
}));

const routes = [
    [/^\/api\/goals$/, () => ({ _id: "g1", userId: "u1", ...n(2000, 150, 200, 65, 30), createdAt: ts, updatedAt: ts })],
    [/^\/api\/food\/day\//, () => ({ logs, summary: { ...summaries[4], totals: dayTotals, logCount: logs.length } })],
    [/^\/api\/food\/deficit/, () => ({
        weekStart: "2026-09-27", weekEnd: "2026-10-03", maintenance: 2300, weeklyDeficit: 2900,
        projectedKg: 0.38, progressToTarget: 0.38, loggedDayCount: 5,
        perDay: ["2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03"].map((d, i) => ({
            date: d, maintenance: 2300, exercise: 200, eaten: i < 5 ? 1900 : null, deficit: i < 5 ? 600 : null, logged: i < 5,
        })),
    })],
    [/^\/api\/food\/summaries/, () => summaries],
    [/^\/api\/water/, (url) => (url.searchParams.has("from") ? days.map((d) => ({ date: d, waterMl: 1500 })) : { date: "2026-10-01", waterMl: 1250 })],
    [/^\/api\/exercise/, () => [
        { _id: "e1", userId: "u1", date: "2026-10-01", type: "Running", caloriesBurned: 320, durationMin: 30, createdAt: ts, updatedAt: ts },
        { _id: "e2", userId: "u1", date: "2026-10-01", type: "Cycling", caloriesBurned: 180, durationMin: 25, createdAt: ts, updatedAt: ts },
    ]],
    [/^\/api\/strength/, () => [
        ["back", "Lat pulldown", 4, 10, 55], ["back", "Seated cable row", 3, 12, 50], ["back", "Pull-ups", 3, 8, 0],
        ["back", "Barbell row (overhand, controlled tempo)", 4, 8, 62.5], ["chest", "Bench press", 4, 8, 70], ["chest", "Incline dumbbell press", 3, 10, 24],
        ["legs", "Squat", 5, 5, 90],
    ].map(([muscleGroup, name, sets, reps, weightKg], i) => ({ _id: "s" + i, userId: "u1", muscleGroup, name, sets, reps, weightKg, createdAt: ts, updatedAt: ts }))],
    [/^\/api\/saved-foods/, () => [
        ["Greek yogurt 5%", "g", n(97, 9, 4, 5, 0)], ["Oat milk (barista)", "ml", n(59, 1, 7, 3, 1)],
        ["Homemade granola", "g", n(450, 10, 64, 17, 7)], ["Chicken breast, grilled", "g", n(165, 31, 0, 4, 0)],
    ].map(([name, baseUnit, per100], i) => ({ _id: "f" + i, userId: "u1", name, baseUnit, per100, source: "manual", createdAt: ts, updatedAt: ts }))],
    [/^\/api\/weight/, () => [80.4, 80.1, 79.9, 79.6, 79.5].map((kg, i) => ({ _id: "w" + i, userId: "u1", weightKg: kg, date: days[i], createdAt: ts, updatedAt: ts }))],
];

let delayMs = 0; // GET /__slow?ms=N to hold responses (skeleton screenshots)
let broken = false; // GET /__broken?on=1: meals arrive without totals, so a render crashes (ErrorBoundary screen)
http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    if (req.method === "OPTIONS") return res.end();
    if (url.pathname === "/__slow") { delayMs = Number(url.searchParams.get("ms") ?? 0); return res.end("ok"); }
    if (url.pathname === "/__broken") { broken = url.searchParams.get("on") === "1"; return res.end("ok"); }
    res.setHeader("Content-Type", "application/json");
    // Login always fails here — used only to screenshot the form's error state.
    if (url.pathname === "/api/auth/login") {
        return setTimeout(() => { res.statusCode = 401; res.end(JSON.stringify({ success: false, error: "Invalid email or password", status: 401 })); }, delayMs);
    }
    if (url.pathname === "/api/onboarding") {
        const data = {
            user: { _id: "u2", firstName: "Dana", lastName: "Test", email: "mock@example.test", goals: n(2000, 150, 200, 65, 30),
                preferences: { units: "metric", timezone: "Asia/Jerusalem" }, onboardingCompleted: true, createdAt: ts, updatedAt: ts },
            goals: n(1950, 145, 190, 62, 30),
            adjustedForSafety: false,
        };
        return setTimeout(() => res.end(JSON.stringify({ success: true, data })), delayMs);
    }
    const hit = routes.find(([re]) => re.test(url.pathname));
    let data = hit ? hit[1](url) : [];
    if (broken && /^\/api\/food\/day\//.test(url.pathname)) data = { ...data, logs: data.logs.map(({ totals, ...l }) => l) };
    setTimeout(() => res.end(JSON.stringify({ success: true, data })), delayMs);
}).listen(PORT, () => console.log("mock api on " + PORT));
