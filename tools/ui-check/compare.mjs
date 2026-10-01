// Pixel-diff screenshot pairs and build labelled side-by-side composites.
// usage: node compare.mjs <shotsDir> <outDir> <prefix...>
//   for each prefix P: compares P-current.png with P-proposed.png and writes
//   P-compare.png. Stats split the image into content and the bottom 64 CSS px
//   (the nav band); deltas are 0–255 per channel.
import fs from "node:fs";
import path from "node:path";
import { openPage, sleep } from "./cdp.mjs";

const [, , shotsDir, outDir, ...prefixes] = process.argv;
fs.mkdirSync(outDir, { recursive: true });
const { send, evaluate, shootDocument, close } = await openPage();
const dataUrl = (f) => "data:image/png;base64," + fs.readFileSync(path.join(shotsDir, f)).toString("base64");

await send("Page.navigate", { url: "about:blank" });
await sleep(300);

const report = [];
for (const p of prefixes) {
    const a = dataUrl(`${p}-current.png`);
    const b = dataUrl(`${p}-proposed.png`);
    const stats = await evaluate(`(async () => {
        const load = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
        const [A, B] = await Promise.all([load(${JSON.stringify(a)}), load(${JSON.stringify(b)})]);
        const W = A.width, H = A.height;
        const px = (img) => { const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d"); x.drawImage(img, 0, 0); return x.getImageData(0, 0, W, H).data; };
        const da = px(A), db = px(B);
        const navTop = H - 64 * 2; // screenshots are taken at 2x
        const acc = { content: { n: 0, changed: 0, sum: 0, max: 0 }, nav: { n: 0, changed: 0, sum: 0, max: 0 } };
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const i = (y * W + x) * 4;
            const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
            const k = y >= navTop ? acc.nav : acc.content;
            k.n++; k.sum += d; if (d > 2) k.changed++; if (d > k.max) k.max = d;
        }
        const f = (k) => ({ changedPct: +(100 * k.changed / k.n).toFixed(2), meanDelta: +(k.sum / k.n).toFixed(2), maxDelta: k.max });
        return { W, H, content: f(acc.content), nav: f(acc.nav) };
    })()`);
    report.push({ pair: p, ...stats });

    const w = stats.W / 2;
    const html = `<body style="margin:0;background:#0b0e09;font:600 15px system-ui;color:#eee">
      <div style="display:flex;gap:16px;padding:16px">
        ${[[`${p}-current`, a], [`${p}-proposed`, b]].map(([t, s]) =>
            `<div><div style="margin-bottom:8px">${t}</div><img src="${s}" style="width:${w}px;display:block;border:1px solid #333"></div>`).join("")}
      </div>
      <div style="padding:0 16px 16px">Bottom 104px (nav band), 2× zoom — current above, proposed below
        ${[a, b].map((s) => `<div style="width:${w * 2 + 16}px;height:${(64 + 40) * 2}px;overflow:hidden;margin-top:8px;border:1px solid #333">
           <img src="${s}" style="width:${w * 2}px;display:block;margin-top:-${(stats.H / 2 - 64 - 40) * 2}px"></div>`).join("")}
      </div></body>`;
    const tmp = path.resolve(outDir, `${p}.html`);
    fs.writeFileSync(tmp, html);
    await send("Page.navigate", { url: "file:///" + tmp.replace(/\\/g, "/") });
    await sleep(800);
    fs.writeFileSync(path.join(outDir, `${p}-compare.png`), await shootDocument());
    fs.unlinkSync(tmp);
}
console.log(JSON.stringify(report, null, 1));
close();
