// Shared job runner: seeds a fake session, sets the viewport, loads the route,
// runs clicks/actions, injects CSS and scrolls — everything a job describes up to
// the moment something is measured or captured. Used by shoot.mjs and audit.mjs.
import { sleep } from "./cdp.mjs";

export const APP = process.env.APP_URL ?? "http://localhost:3000";
export const MOCK = process.env.MOCK_URL ?? "http://localhost:5055";

const user = {
    _id: "u1", firstName: "Dana", lastName: "Test", email: "mock@example.test",
    goals: { calories: 2000, protein: 150, carbs: 200, fat: 65, fiber: 30 },
    preferences: { units: "metric", timezone: "Asia/Jerusalem" },
    onboardingCompleted: true, waterTargetMl: 2500, maintenanceCalories: 2300,
    goalType: "lose", targetWeightKg: 74, timeframeMonths: 6,
    createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
};

// session: "none" = logged out, "new" = logged in but not onboarded, default = onboarded.
const sessionJs = (kind) =>
    kind === "none"
        ? "localStorage.clear(); true"
        : `localStorage.setItem("ft_token","mock-token"); localStorage.setItem("ft_user", ${JSON.stringify(JSON.stringify({ ...user, onboardingCompleted: kind !== "new" }))}); true`;

// Helpers available to job.actions (React-controlled inputs need the native setter + an input event).
const HELPERS = `const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const set = (sel, v) => { const el = document.querySelector(sel); const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v); el.dispatchEvent(new Event("input", { bubbles: true })); };
const click = (sel, i = 0) => document.querySelectorAll(sel)[i].click();
const slow = (ms) => fetch("${MOCK}/__slow?ms=" + ms);`;

// Same-origin visit first so the fake (mock-only) session can be seeded in localStorage.
export async function prepare({ send }) {
    await send("Page.enable");
    await send("Emulation.setFocusEmulationEnabled", { enabled: true });
    await send("Page.navigate", { url: `${APP}/login` });
    await sleep(2500);
}

// Returns the final scrollY.
export async function runJob({ send, evaluate }, job, { dpr = 2 } = {}) {
    await send("Emulation.setDeviceMetricsOverride", { width: job.width, height: job.height, deviceScaleFactor: dpr, mobile: true });
    await fetch(`${MOCK}/__slow?ms=${job.slow ?? 0}`);
    await fetch(`${MOCK}/__broken?on=${job.broken ? 1 : 0}`); // ErrorBoundary screen
    await evaluate(sessionJs(job.session));
    await send("Page.navigate", { url: APP + job.path });
    await sleep(job.wait ?? 3500); // data + entrance animations settle
    if (job.click) { await evaluate(`document.querySelector(${JSON.stringify(job.click)})?.click(); true`); await sleep(800); }
    if (job.actions) {
        await evaluate(`(async () => { ${HELPERS}\n${job.actions}\n return true; })()`);
        await sleep(job.afterWait ?? 700);
    }
    await evaluate(`(() => { let s = document.getElementById("cmp"); if (!s) { s = document.createElement("style"); s.id = "cmp"; document.head.appendChild(s); } s.textContent = ${JSON.stringify(job.css ?? "")}; return true; })()`);
    let y = 0;
    if (job.scroll === "keep") {
        // Leave the page wherever job.actions scrolled it.
        y = await evaluate("Math.round(scrollY)");
    } else if (job.scroll === "text-under-nav") {
        // Put a meal's item rows (dense text) right behind the bottom nav.
        y = await evaluate(`(() => { const it = document.querySelectorAll(".meal-item")[1]; if (!it) return 0; const r = it.getBoundingClientRect(); return Math.max(0, Math.round(r.top + scrollY - (innerHeight - 50))); })()`);
    } else if (typeof job.scroll === "string" && job.scroll !== "top") {
        // A CSS selector: bring that element to 16px below the top of the viewport.
        y = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(job.scroll)}); if (!el) return 0; return Math.max(0, Math.round(el.getBoundingClientRect().top + scrollY - 16)); })()`);
    } else if (typeof job.scroll === "number") y = job.scroll;
    await evaluate(`window.scrollTo(0, ${y}); true`);
    await sleep(600);
    return evaluate("Math.round(scrollY)");
}

export async function finish() {
    await fetch(`${MOCK}/__slow?ms=0`).catch(() => {});
}
