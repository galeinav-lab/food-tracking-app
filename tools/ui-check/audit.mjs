// Visual audit per job: (1) every on-screen element with a backdrop-filter,
// (2) WCAG text contrast measured against the RENDERED background.
// usage: node audit.mjs <jobs.json> [--all]   (--all lists passing texts too)
//
// Contrast method: record every visible text run (colour, size, weight, effective
// opacity, glyph boxes), then hide all text, screenshot, and take the worst
// background pixel inside each text's own boxes (the brightest pixel for light
// text, the darkest for dark text). Text that is covered by something else
// (e.g. page text under a sheet's scrim) and disabled controls are skipped.
// Thresholds: 4.5:1, or 3:1 for large text (>= 24px, or >= 18.66px bold).
import fs from "node:fs";
import { openPage } from "./cdp.mjs";
import { finish, prepare, runJob } from "./runner.mjs";

const [, , jobsFile, flag] = process.argv;
const jobs = JSON.parse(fs.readFileSync(jobsFile, "utf8"));
const page = await openPage();
await prepare(page);

const COLLECT = `(() => {
  const vh = innerHeight, vw = innerWidth;
  const vis = (el) => el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
  const blur = [...document.querySelectorAll("*")].filter((el) => {
    const cs = getComputedStyle(el);
    const bf = cs.backdropFilter && cs.backdropFilter !== "none" ? cs.backdropFilter : cs.webkitBackdropFilter;
    if (!bf || bf === "none") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < vh && vis(el);
  }).map((el) => "." + String(el.className).trim().split(/\\s+/).join("."));

  const texts = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || !n.textContent.trim() || !vis(el)) continue;
    const box = el.getBoundingClientRect();
    if (box.width <= 1 || box.height <= 1) continue; // visually-hidden (sr-only) text
    const range = document.createRange();
    range.selectNodeContents(n);
    const rects = [...range.getClientRects()]
      .map((r) => ({ l: Math.max(0, r.left), t: Math.max(0, r.top), r: Math.min(vw, r.right), b: Math.min(vh, r.bottom) }))
      .filter((r) => r.r - r.l > 2 && r.b - r.t > 2);
    if (!rects.length) continue;
    const c = rects[0];
    const hit = document.elementFromPoint((c.l + c.r) / 2, (c.t + c.b) / 2);
    if (!hit || !(el.contains(hit) || hit.contains(el))) continue; // covered (scrim, nav, popover…)
    let op = 1;
    for (let a = el; a; a = a.parentElement) op *= parseFloat(getComputedStyle(a).opacity);
    const cs = getComputedStyle(el);
    const svg = el instanceof SVGElement; // chart labels: colour comes from fill, not color
    texts.push({ text: n.textContent.trim().replace(/\\s+/g, " ").slice(0, 42), color: svg ? cs.fill : cs.color,
      size: parseFloat(cs.fontSize), weight: parseInt(cs.fontWeight, 10), opacity: op,
      disabled: !!el.closest(":disabled, [aria-disabled='true']"),
      where: svg ? "svg:" + el.tagName : String(el.className || el.tagName).split(" ")[0], rects });
  }
  return { blur, texts };
})()`;

const HIDE_TEXT = `(() => { const s = document.createElement("style"); s.id = "audit-hide";
  s.textContent = "*,*::before,*::after{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important}"
    + "::placeholder{color:transparent!important}"
    + "svg text,svg tspan{fill:transparent!important;stroke:transparent!important}";
  document.head.appendChild(s); return true; })()`;

const MEASURE = (png, texts) => `(async () => {
  const img = await new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = "data:image/png;base64,${png}"; });
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
  const x = c.getContext("2d"); x.drawImage(img, 0, 0);
  const px = x.getImageData(0, 0, c.width, c.height).data;
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const parse = (s) => s.match(/[\\d.]+/g).map(Number);
  return ${JSON.stringify(texts)}.map((t) => {
    const [tr, tg, tb, ta = 1] = parse(t.color);
    let max = null, min = null;
    for (const q of t.rects) for (let yy = Math.floor(q.t); yy < Math.ceil(q.b); yy++) for (let xx = Math.floor(q.l); xx < Math.ceil(q.r); xx++) {
      const i = (yy * c.width + xx) * 4, l = L(px[i], px[i + 1], px[i + 2]);
      if (!max || l > max[0]) max = [l, px[i], px[i + 1], px[i + 2]];
      if (!min || l < min[0]) min = [l, px[i], px[i + 1], px[i + 2]];
    }
    const light = L(tr, tg, tb) > (max[0] + min[0]) / 2;
    const bg = light ? max : min; // worst case for this text
    const a = ta * t.opacity; // translucent text blends with what's behind it
    const fr = tr * a + bg[1] * (1 - a), fg = tg * a + bg[2] * (1 - a), fb = tb * a + bg[3] * (1 - a);
    const lt = L(fr, fg, fb), lb = bg[0];
    const ratio = (Math.max(lt, lb) + 0.05) / (Math.min(lt, lb) + 0.05);
    const large = t.size >= 24 || (t.size >= 18.66 && t.weight >= 700);
    return { text: t.text, where: t.where, size: t.size, ratio: +ratio.toFixed(2), need: large ? 3 : 4.5,
      disabled: t.disabled, color: t.color, bg: "rgb(" + bg.slice(1).join(",") + ")" };
  });
})()`;

let failures = 0;
for (const job of jobs) {
    const y = await runJob(page, job, { dpr: 1 });
    const { blur, texts } = await page.evaluate(COLLECT);
    await page.evaluate(HIDE_TEXT);
    await new Promise((r) => setTimeout(r, 150));
    const shot = await page.send("Page.captureScreenshot", { format: "png" });
    const results = await page.evaluate(MEASURE(shot.data, texts));
    const bad = results.filter((r) => !r.disabled && r.ratio < r.need).sort((a, b) => a.ratio - b.ratio);
    failures += bad.length;
    console.log(`\n## ${job.name}  (scrollY ${y})  blurred layers: ${blur.length}${blur.length ? "  " + blur.join(", ") : ""}`);
    console.log(`   texts checked: ${results.filter((r) => !r.disabled).length}, below threshold: ${bad.length}, lowest: ${Math.min(...results.filter((r) => !r.disabled).map((r) => r.ratio))}`);
    for (const r of flag === "--all" ? results : bad)
        console.log(`   ${r.ratio < r.need ? "FAIL" : "ok  "} ${String(r.ratio).padStart(5)}:1 (need ${r.need})  ${r.size}px  "${r.text}"  [${r.where}]  text ${r.color} on ${r.bg}`);
}
console.log(`\nTotal below threshold: ${failures}`);
await finish();
page.close();
