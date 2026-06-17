import { chromium } from "@playwright/test";

const CURRENT = "http://localhost:3002";
const NEWDES = "http://localhost:5180";
const OUT = "/tmp/sidebar-compare";
const VP = { width: 390, height: 844 };

const browser = await chromium.launch();

/* ---------- 1. CURRENT FRONTEND (Next.js, localhost:3002) ---------- */
async function shootCurrent() {
  const ctx = await browser.newContext({ viewport: VP, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  // login
  for (let a = 1; a <= 6; a++) {
    await page.goto(`${CURRENT}/login`);
    await page.fill('input[type="email"]', "prouser@valueflowtest.com");
    await page.fill('input[placeholder="Enter your password"]', "Test@1234");
    await page.locator('button:has-text("Login")').first().click();
    try {
      await page.waitForURL(/\/dashboard/, { timeout: 12000 });
      break;
    } catch {
      console.log("current login retry", a);
      await page.waitForTimeout(30000);
    }
  }
  await page
    .goto(`${CURRENT}/dashboard/pro`, { waitUntil: "networkidle" })
    .catch(() => {});
  await page.waitForTimeout(1500);
  // open mobile drawer
  await page
    .locator('[aria-label="Open menu"]')
    .click({ timeout: 8000 })
    .catch(async () => {
      await page
        .locator('button:has(svg[data-icon="menu"]), .anticon-menu')
        .first()
        .click()
        .catch(() => {});
    });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/current-sidebar.png` });
  console.log("captured current-sidebar.png");
  await ctx.close();
}

/* ---------- 2. NEW_DESIGN (TanStack, localhost:5180) ---------- */
async function shootNewDesign() {
  const ctx = await browser.newContext({ viewport: VP, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(NEWDES, { waitUntil: "networkidle" });
  // splash auto-advances to login after 1.6s
  await page.waitForTimeout(2200);
  // click Login -> dashboard
  await page
    .locator('button:has-text("Login")')
    .first()
    .click({ timeout: 8000 });
  await page.waitForTimeout(1000);
  // open drawer via hamburger (first md:hidden button in TopBar)
  await page.locator("button.md\\:hidden").first().click({ timeout: 8000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/newdesign-sidebar.png` });
  console.log("captured newdesign-sidebar.png");
  await ctx.close();
}

await shootCurrent().catch((e) => console.log("CURRENT ERR", e.message));
await shootNewDesign().catch((e) => console.log("NEWDESIGN ERR", e.message));
await browser.close();
console.log("DONE");
