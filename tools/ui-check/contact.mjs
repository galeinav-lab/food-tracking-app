// Labelled contact sheet (grid) of screenshots, rendered in headless Chrome.
// usage: node contact.mjs <out.png> <cols> <thumbWidth> <img1.png> <img2.png> ...
import fs from "node:fs";
import path from "node:path";
import { openPage, sleep } from "./cdp.mjs";

const [, , out, cols, thumbW, ...imgs] = process.argv;
const { send, shootDocument, close } = await openPage();

const cells = imgs.map((f) => {
    const src = "data:image/png;base64," + fs.readFileSync(f).toString("base64");
    return `<figure style="margin:0"><figcaption style="margin-bottom:6px">${path.basename(f, ".png")}</figcaption><img src="${src}" style="width:${thumbW}px;display:block;border:1px solid #333"></figure>`;
}).join("");
const tmp = path.resolve(path.dirname(out), "contact-tmp.html");
fs.writeFileSync(tmp, `<body style="margin:0;background:#0b0e09;color:#ddd;font:600 14px system-ui">
  <div style="display:grid;grid-template-columns:repeat(${cols},${thumbW}px);gap:18px;padding:18px;width:max-content">${cells}</div></body>`);

await send("Page.navigate", { url: "file:///" + tmp.replace(/\\/g, "/") });
await sleep(1200);
fs.writeFileSync(out, await shootDocument());
fs.unlinkSync(tmp);
console.log("saved", out);
close();
