// Minimal Chrome DevTools Protocol client shared by the ui-check scripts.
// Reuses a headless Chrome already listening on PORT, else starts one (and
// stops it again on close). No npm dependencies: Node 22+ fetch + WebSocket.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = Number(process.env.CDP_PORT ?? 9333);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function openPage() {
    const up = () => fetch(`http://127.0.0.1:${PORT}/json/version`).then(() => true, () => false);
    const chrome = (await up())
        ? null
        : spawn(CHROME, [
              "--headless=new", `--remote-debugging-port=${PORT}`, "--hide-scrollbars", "--no-first-run",
              `--user-data-dir=${path.join(HERE, "chrome-profile")}`, "about:blank",
          ], { stdio: "ignore" });

    let targets;
    for (let i = 0; i < 150 && !targets; i++) {
        try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); } catch { await sleep(200); }
    }
    if (!targets) throw new Error(`Chrome did not open port ${PORT} (set CHROME_PATH?)`);

    const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
    await new Promise((r) => ws.addEventListener("open", r, { once: true }));
    let seq = 0;
    const pending = new Map();
    ws.addEventListener("message", (ev) => {
        const m = JSON.parse(ev.data);
        if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
        const id = ++seq;
        pending.set(id, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
        ws.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async (expression) =>
        (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result.value;

    // Screenshot the current document at its full size (for composite pages).
    const shootDocument = async () => {
        const size = await evaluate("({ w: document.body.scrollWidth, h: document.body.scrollHeight })");
        await send("Emulation.setDeviceMetricsOverride", { width: size.w, height: size.h, deviceScaleFactor: 1, mobile: false });
        await sleep(300);
        const shot = await send("Page.captureScreenshot", { format: "png" });
        await send("Emulation.clearDeviceMetricsOverride");
        return Buffer.from(shot.data, "base64");
    };

    const close = () => { ws.close(); chrome?.kill(); };
    return { send, evaluate, shootDocument, close };
}
