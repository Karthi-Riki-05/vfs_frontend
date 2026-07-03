import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = __dirname;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
});
const page = await ctx.newPage();

// Capture all console errors
page.on("console", (msg) => {
  if (msg.type() === "error") console.log("BROWSER ERROR:", msg.text());
});
page.on("requestfailed", (req) => {
  console.log("REQUEST FAILED:", req.url(), req.failure()?.errorText);
});
page.on("response", async (res) => {
  if (res.status() >= 400 && res.url().includes("/api/")) {
    let body = "";
    try {
      body = await res.text();
    } catch {}
    console.log(`API ${res.status()} ${res.url()} — ${body.slice(0, 200)}`);
  }
});

// 1. Login
console.log("Logging in...");
await page.goto("http://localhost:3002/login", { waitUntil: "networkidle" });
await page.fill(
  'input[type="email"], input[name="email"]',
  "valuestream@gmail.com",
);
await page.fill('input[type="password"], input[name="password"]', "test1234");
await page.click('button[type="submit"]');
await page.waitForURL("**/dashboard**", { timeout: 20000 });
console.log("Logged in:", page.url());
await page.waitForTimeout(1500);

// Screenshot after login (team tab)
await page.screenshot({ path: `${outDir}/01-after-login.png` });
console.log("Saved 01-after-login.png");

// 2. Look for pro tab / context switcher and click it
console.log("Looking for Pro tab...");
const proTabSel = [
  'button:has-text("Pro")',
  '[data-value="pro"]',
  'a:has-text("Pro")',
  'li:has-text("Pro")',
  '[aria-label*="pro" i]',
];
let proTabFound = false;
for (const sel of proTabSel) {
  const el = page.locator(sel).first();
  if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
    console.log("  Found Pro tab with selector:", sel);
    await el.click();
    await page.waitForTimeout(1500);
    proTabFound = true;
    break;
  }
}
if (!proTabFound)
  console.log("  Pro tab NOT found — staying on current context");

await page.screenshot({ path: `${outDir}/02-after-pro-switch.png` });
console.log("Saved 02-after-pro-switch.png");

// 3. Go to flows
console.log("Going to flows page...");
await page.goto("http://localhost:3002/dashboard/flows", {
  waitUntil: "networkidle",
});
await page.waitForTimeout(2500);
await page.screenshot({ path: `${outDir}/03-flows-page.png`, fullPage: false });
console.log("Saved 03-flows-page.png");

const lockModal = await page.locator("text=Your flows are locked").isVisible();
const lockBadge = await page.locator('[data-testid="lock-badge"]').count();
const lockIcons = await page.locator("svg.lucide-lock").count();
console.log("Lock modal visible:", lockModal);
console.log("Lock icons visible:", lockIcons);

// 4. Try clicking first flow card (if any)
console.log("Trying to click first flow card...");
const flowCard = page
  .locator('[data-testid="flow-card"], .flow-card, [class*="flow-item"]')
  .first();
if (await flowCard.isVisible({ timeout: 2000 }).catch(() => false)) {
  await flowCard.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${outDir}/04-after-flow-click.png` });
  console.log("Saved 04-after-flow-click.png, URL:", page.url());
} else {
  console.log("No flow card found with known selectors");
  await page.screenshot({ path: `${outDir}/04-no-flow-card.png` });
}

await browser.close();
console.log("Done.");
