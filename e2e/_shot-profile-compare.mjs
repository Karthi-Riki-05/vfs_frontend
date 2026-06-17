import { chromium } from "@playwright/test";

const APP = "http://localhost:3002";
const NEW = "http://localhost:8080";
const EMAIL = process.env.SHOT_EMAIL || "prouser@valueflowtest.com";
const PASS = "Test@1234";

const browser = await chromium.launch();

/* ---------- 1) CURRENT APP profile (/dashboard/settings) ---------- */
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();
  let ok = false;
  for (let i = 1; i <= 6 && !ok; i++) {
    await page.goto(`${APP}/login`);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[placeholder="Enter your password"]', PASS);
    await page.locator('button:has-text("Login")').first().click();
    try {
      await page.waitForURL(/\/dashboard/, { timeout: 12000 });
      ok = true;
    } catch {
      console.log("login retry", i);
      await page.waitForTimeout(30000);
    }
  }
  if (!ok) throw new Error("app login failed");
  await page.goto(`${APP}/dashboard/settings`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "/tmp/profile-current.png", fullPage: true });
  // also a viewport-only shot to see the empty whitespace as user sees it
  await page.screenshot({ path: "/tmp/profile-current-viewport.png" });
  console.log("shot current app profile");
  await ctx.close();
}

/* ---------- 2) NEW_DESIGN profile ---------- */
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();
  await page.goto(NEW, { waitUntil: "networkidle" });
  await page.waitForTimeout(2200); // splash -> login
  // login screen: click primary button to reach dashboard
  const loginBtn = page
    .locator(
      'button:has-text("Log In"), button:has-text("Login"), button:has-text("Continue"), button:has-text("Sign In")',
    )
    .first();
  if (await loginBtn.count()) {
    await loginBtn.click().catch(() => {});
  }
  await page.waitForTimeout(1200);
  // click the top-bar avatar -> profile (w-9 h-9 rounded-full bg-primary)
  const avatar = page.locator("button.rounded-full.bg-primary").first();
  if (await avatar.count()) {
    await avatar.click().catch(() => {});
  }
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "/tmp/profile-new.png", fullPage: true });
  await page.screenshot({ path: "/tmp/profile-new-viewport.png" });
  console.log("shot new_design profile");
  await ctx.close();
}

await browser.close();
console.log("DONE");
