import { chromium } from "@playwright/test";
const BASE = "http://localhost:3002";
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
async function login() {
  for (let a = 1; a <= 6; a++) {
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', "mry@test.com");
    await page.fill('input[placeholder="Enter your password"]', "test1234");
    await page.locator('button:has-text("Login")').first().click();
    try {
      await page.waitForURL(/\/dashboard/, { timeout: 12000 });
      return;
    } catch {
      console.log("retry", a);
      await page.waitForTimeout(20000);
    }
  }
  throw new Error("login failed");
}
await login();
await page.waitForTimeout(2500);
for (const [w, h, tag] of [
  [390, 844, "m390"],
  [360, 640, "m360"],
]) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto(`${BASE}/dashboard/pro`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.locator('[aria-label="Open menu"]').click({ timeout: 6000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `/tmp/audit/drawer-${tag}.png` });
  console.log("drawer", tag);
}
await browser.close();
console.log("DONE");
