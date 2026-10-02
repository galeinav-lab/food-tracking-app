// Screenshots of the running frontend in headless Chrome (see README.md).
// usage: node shoot.mjs <outDir> <jobs.json>
import fs from "node:fs";
import path from "node:path";
import { openPage } from "./cdp.mjs";
import { finish, prepare, runJob } from "./runner.mjs";

const [, , outDir, jobsFile] = process.argv;
const jobs = JSON.parse(fs.readFileSync(jobsFile, "utf8"));
fs.mkdirSync(outDir, { recursive: true });

const page = await openPage();
await prepare(page);
for (const job of jobs) {
    const y = await runJob(page, job);
    const shot = await page.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(outDir, job.name + ".png"), Buffer.from(shot.data, "base64"));
    console.log("saved", job.name, "scrollY=" + y);
}
await finish();
page.close();
