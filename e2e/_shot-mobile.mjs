import { chromium, devices } from "@playwright/test";

const BASE = "http://localhost:3002";
const EMAIL = process.env.SHOT_EMAIL || "teamowner@valueflowtest.com";
const PASS = "Test@1234";

const browser = await chromium.launch();
// Simulate a mobile WebView: iPhone-ish viewport + Android `wv` UA token.
const ctx = await browser.newContext({
  ...devices["Pixel 5"],
  userAgent:
    "Mozilla/5.0 (Linux; Android 13; Pixel 5; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36",
});
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
      console.log("login attempt", attempt, "failed, waiting 30s");
      await page.waitForTimeout(30000);
    }
  }
  throw new Error("login failed after retries");
}
await login();

await page.goto(`${BASE}/dashboard/team`, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
await page.screenshot({ path: "/tmp/mobile-navbar.png" });
console.log("shot mobile navbar");

// Open the drawer (hamburger)
await page.locator('[aria-label="Open menu"]').first().click();
await page.waitForTimeout(900);
await page.screenshot({ path: "/tmp/mobile-drawer.png", fullPage: true });
console.log("shot mobile drawer");

await browser.close();
console.log("DONE");
