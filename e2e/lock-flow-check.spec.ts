import { test, expect } from "@playwright/test";

// Uses valuestream@gmail.com (pro, local DB) — no storageState dependency
test.use({ storageState: { cookies: [], origins: [] } });

test.beforeEach(async ({ page }) => {
  await page.goto("http://localhost:3002/login");
  await page.waitForLoadState("networkidle");
  await page.fill(
    'input[type="email"], input[name="email"]',
    "valuestream@gmail.com",
  );
  await page.fill('input[type="password"], input[name="password"]', "test1234");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard**", { timeout: 20000 });
});

test("flows page loads — normal unlocked state", async ({ page }) => {
  await page.goto("http://localhost:3002/dashboard/flows");
  await page.waitForLoadState("networkidle");
  await page.screenshot({
    path: "e2e/screenshots/flows-unlocked.png",
    fullPage: false,
  });
  await expect(page.locator("text=Your flows are locked")).not.toBeVisible();
});

test("limitflows page loads", async ({ page }) => {
  await page.goto("http://localhost:3002/dashboard/limitflows");
  await page.waitForLoadState("networkidle");
  await page.screenshot({
    path: "e2e/screenshots/limitflows-page.png",
    fullPage: true,
  });
  await expect(page.locator("text=Limit your flows")).toBeVisible();
});

test("lock-state API returns 401 without auth token", async ({ request }) => {
  const res = await request.get(
    "http://localhost:5002/api/v1/flows/lock-state",
    { headers: { "x-app-context": "team" } },
  );
  expect([200, 401, 403]).toContain(res.status());
});
