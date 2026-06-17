import { chromium } from "@playwright/test";

const CURRENT = "http://localhost:3002";
const OUT = "/tmp/drawer-verify";
const VP = { width: 390, height: 844 };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: VP, deviceScaleFactor: 2 });
const page = await ctx.newPage();

for (let a = 1; a <= 6; a++) {
  await page.goto(`${CURRENT}/login`);
  await page.fill('input[type="email"]', "prouser@valueflowtest.com");
  await page.fill('input[placeholder="Enter your password"]', "Test@1234");
  await page.locator('button:has-text("Login")').first().click();
  try {
    await page.waitForURL(/\/dashboard/, { timeout: 12000 });
    break;
  } catch {
    console.log("login retry", a);
    await page.waitForTimeout(20000);
  }
}
await page
  .goto(`${CURRENT}/dashboard/pro`, { waitUntil: "networkidle" })
  .catch(() => {});
await page.waitForTimeout(2500);

await page
  .locator('[aria-label="Open menu"]')
  .click({ timeout: 8000 })
  .catch(async () => {
    await page
      .locator("button:has(svg.lucide-menu), .anticon-menu")
      .first()
      .click()
      .catch(() => {});
  });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/pro-drawer.png` });
console.log("captured pro-drawer.png");
await ctx.close();
await browser.close();
console.log("DONE");
