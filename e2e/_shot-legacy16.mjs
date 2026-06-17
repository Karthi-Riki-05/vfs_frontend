import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";
const LIVE = "http://localhost:3002";
const OUT = "/tmp/compare16";
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const p = await (await browser.newContext({ ...devices["Pixel 5"] })).newPage();
await p.goto(`${LIVE}/login`, { waitUntil: "networkidle" });
await p.fill('input[type="email"]', "prouser@valueflowtest.com");
await p.fill('input[placeholder="Enter your password"]', "Test@1234");
await p
  .locator('button:has-text("Login"), button[type="submit"]')
  .first()
  .click();
await p.waitForURL(/\/dashboard/, { timeout: 20000 }).catch(() => {});
for (const [k, r] of [
  ["settings", "/dashboard/settings"],
  ["subscription", "/dashboard/subscription"],
  ["support", "/dashboard/support"],
]) {
  await p.goto(`${LIVE}${r}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(1600);
  await p.screenshot({ path: `${OUT}/legacy16-${k}.png` });
  console.log("legacy16-" + k);
}
await browser.close();
console.log("DONE");
