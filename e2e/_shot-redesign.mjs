import { chromium } from "@playwright/test";

const BASE = "http://localhost:3002";
const EMAIL = process.env.SHOT_EMAIL || "teamowner@valueflowtest.com";
const PASS = "Test@1234";

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
      console.log("logged in on attempt", attempt);
      return;
    } catch {
      console.log("login attempt", attempt, "failed, waiting 30s (rate limit)");
      await page.waitForTimeout(30000);
    }
  }
  throw new Error("login failed after retries");
}
await login();

await page.setViewportSize({ width: 1440, height: 900 });

// 1) Dashboard with new sidebar + navbar
await page.goto(`${BASE}/dashboard/team`, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
await page.screenshot({ path: "/tmp/redesign-dashboard.png" });
console.log("shot dashboard");

// 2) FAB create menu open
const fab = page.locator('[aria-label="Create new"]');
await fab.scrollIntoViewIfNeeded().catch(() => {});
await fab.click();
await page.waitForTimeout(800);
await page.screenshot({ path: "/tmp/redesign-fab.png" });
console.log("shot fab menu");
// close
await page.keyboard.press("Escape").catch(() => {});
await page.waitForTimeout(300);

// 3) Context-switcher pill dropdown (if present)
const pill = page.locator('[aria-label="Switch billing context"]');
if (await pill.count()) {
  await pill.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: "/tmp/redesign-switcher.png" });
  console.log("shot context switcher");
  await page.keyboard.press("Escape").catch(() => {});
} else {
  console.log("no context-switcher pill (user has no teams)");
}

await browser.close();
console.log("DONE");
