import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";

const LIVE = "http://localhost:3002";
const EMAIL = "prouser@valueflowtest.com";
const PASS = "Test@1234";
const OUT = process.env.OUT || "/tmp/compare16";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["Pixel 5"] });
const p = await ctx.newPage();
await p.goto(`${LIVE}/login`, { waitUntil: "networkidle" });
await p.fill('input[type="email"]', EMAIL);
await p.fill('input[placeholder="Enter your password"]', PASS);
await p
  .locator('button:has-text("Login"), button[type="submit"]')
  .first()
  .click();
await p.waitForURL(/\/dashboard/, { timeout: 20000 }).catch(() => {});

const ROUTES = [
  ["dashboard", "/dashboard"],
  ["flows", "/dashboard/flows"],
  ["teams", "/dashboard/teams"],
  ["chat", "/dashboard/chat"],
];
const prefix = process.env.PREFIX || "live16";
for (const [k, r] of ROUTES) {
  await p.goto(`${LIVE}${r}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(1600);
  await p.screenshot({ path: `${OUT}/${prefix}-${k}.png` });
  console.log(`${prefix}-${k}`);
}
await browser.close();
console.log("DONE");
