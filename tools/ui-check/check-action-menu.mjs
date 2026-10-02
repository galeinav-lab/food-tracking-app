// Behavioural a11y check of <ActionMenu> with real (CDP) mouse + keyboard input.
// Needs the mock API + dev server running (see README). Prints the trigger/menu/focus state per step.
import { openPage, sleep } from "./cdp.mjs";
const { send, evaluate, close } = await openPage();
const APP = "http://localhost:3000";
const user = { _id: "u1", firstName: "Dana", lastName: "T", email: "m@e.test", goals: {}, preferences: { units: "metric", timezone: "Asia/Jerusalem" }, onboardingCompleted: true, waterTargetMl: 2500, createdAt: "", updatedAt: "" };
await send("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 1, mobile: false });
await send("Emulation.setFocusEmulationEnabled", { enabled: true });
await send("Page.navigate", { url: APP + "/login" }); await sleep(2000);
await evaluate(`localStorage.setItem("ft_token","t"); localStorage.setItem("ft_user", ${JSON.stringify(JSON.stringify(user))}); 1`);
await send("Page.navigate", { url: APP + "/" }); await sleep(3500);
await evaluate(`(() => { const l = document.querySelector(".meal-list"); window.scrollTo(0, l.getBoundingClientRect().top + scrollY - 16); return 1; })()`);
await sleep(400);

const state = () => evaluate(`(() => {
  const t = document.querySelector(".meal-list .amenu .btn");
  const m = document.querySelector(".amenu-pop");
  const a = document.activeElement;
  return { expanded: t.getAttribute("aria-expanded"), haspopup: t.getAttribute("aria-haspopup"), label: t.getAttribute("aria-label"),
    menu: m ? { role: m.getAttribute("role"), label: m.getAttribute("aria-label"), items: [...m.children].map(c => c.getAttribute("role") + ":" + c.textContent) } : null,
    focus: a === t ? "TRIGGER" : a?.getAttribute("role") === "menuitem" ? "item:" + a.textContent : a?.tagName };
})()`);
const center = () => evaluate(`(() => { const r = document.querySelector(".meal-list .amenu .btn").getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
const tap = async (x, y) => {
  for (const type of ["mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
  await sleep(350);
};
const key = async (k, code, keyCode) => {
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: keyCode, ...(k === "Enter" ? { text: String.fromCharCode(13) } : {}) });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: keyCode });
  await sleep(250);
};
const log = (label, s) => console.log(label.padEnd(26), JSON.stringify(s));

log("closed", await state());
let c = await center(); await tap(c.x, c.y);            log("tap trigger", await state());
await key("ArrowDown", "ArrowDown", 40);                 log("ArrowDown", await state());
await key("ArrowDown", "ArrowDown", 40);                 log("ArrowDown x2", await state());
await key("ArrowDown", "ArrowDown", 40);                 log("ArrowDown x3 (wrap?)", await state());
await key("End", "End", 35);                             log("End", await state());
await key("Home", "Home", 36);                           log("Home", await state());
await key("ArrowUp", "ArrowUp", 38);                     log("ArrowUp (wrap?)", await state());
await key("Escape", "Escape", 27);                       log("Escape", await state());
c = await center(); await tap(c.x, c.y);                 log("re-open", await state());
await tap(40, 40);                                       log("tap outside", await state());
c = await center(); await tap(c.x, c.y);
await key("Tab", "Tab", 9);                              log("Tab out of menu", await state());
c = await center(); await tap(c.x, c.y); await key("End", "End", 35); await key("ArrowUp", "ArrowUp", 38);
log("End, ArrowUp → Edit?", await state());
await key("Escape", "Escape", 27); c = await center(); await tap(c.x, c.y);
await key("Enter", "Enter", 13);                         log("Enter on 'Save as food'", await state());
await sleep(1500);                                       log("…after the save finished", await state());
close();
