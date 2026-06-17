import { chromium } from "@playwright/test";

const BASE = "http://localhost:3002";
const OUT = "/tmp/audit";
import { mkdirSync } from "fs";
mkdirSync(OUT, { recursive: true });

const EMAIL = process.env.AUDIT_EMAIL || "mry@test.com";
const PASS = process.env.AUDIT_PASS || "test1234";

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

async function login() {
  for (let attempt = 1; attempt <= 6; attempt++) {
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[placeholder="Enter your password"]', PASS);
    await page.locator('button:has-text("Login")').first().click();
    try {
      await page.waitForURL(/\/dashboard/, { timeout: 12000 });
      console.log("logged in on attempt", attempt, "->", page.url());
      return;
    } catch {
      console.log("login attempt", attempt, "failed, waiting 20s (rate limit)");
      await page.waitForTimeout(20000);
    }
  }
  throw new Error("login failed after retries");
}
await login();
await page.waitForTimeout(2500); // let context loader settle

const VIEWS = [
  [1440, 900, "desktop"],
  [390, 844, "m390"],
  [360, 640, "m360"],
];

const ROUTES = [
  "pro",
  "recents",
  "flows",
  "shapes",
  "teams",
  "projects",
  "favourites",
  "trash",
  "notifications",
  "settings",
  "subscription",
];

async function shoot(route) {
  for (const [w, h, tag] of VIEWS) {
    await page.setViewportSize({ width: w, height: h });
    try {
      await page.goto(`${BASE}/dashboard/${route}`, {
        waitUntil: "networkidle",
        timeout: 25000,
      });
    } catch {
      await page.goto(`${BASE}/dashboard/${route}`, {
        waitUntil: "domcontentloaded",
      });
    }
    await page.waitForTimeout(1800);
    await page.screenshot({
      path: `${OUT}/${route}-${tag}.png`,
      fullPage: false,
    });
    console.log("shot", route, tag);
  }
}

for (const r of ROUTES) await shoot(r);

// Mobile drawer open (hamburger) on a list route
for (const [w, h, tag] of [
  [390, 844, "m390"],
  [360, 640, "m360"],
]) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto(`${BASE}/dashboard/pro`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  // hamburger is the first header button on mobile
  const burger = page.locator('header button, [aria-label*="menu" i]').first();
  try {
    await burger.click({ timeout: 4000 });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/drawer-${tag}.png` });
    console.log("shot drawer", tag);
  } catch (e) {
    console.log("drawer open failed", tag, e.message);
  }
}

// Shapes: try to drill into a group if any group/folder element exists
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${BASE}/dashboard/shapes`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/shapes-detail-m390.png` });

await browser.close();
console.log("DONE ->", OUT);
