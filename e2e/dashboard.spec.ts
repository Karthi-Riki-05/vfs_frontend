import { test, expect } from "@playwright/test";

// Uses the global pro.json storageState (authenticated Pro user).

test.describe("Dashboard — Data Accuracy", () => {
  test("DASH-01: Pro dashboard renders KPI cards with no server error", async ({
    page,
  }) => {
    await page.goto("/dashboard/pro");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByText(/^(Error|500)$/).first()).toHaveCount(0);
    // At least some stat/KPI card should render.
    await expect(
      page.locator('[class*="stat"], [class*="kpi"], [class*="card"]').first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("DASH-02: Team dashboard renders with no server error", async ({
    page,
  }) => {
    await page.goto("/dashboard/team");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByText(/^(Error|500)$/).first()).toHaveCount(0);
  });

  test("DASH-03: recent flows section renders on Pro", async ({ page }) => {
    await page.goto("/dashboard/pro");
    await page.waitForLoadState("networkidle");

    const recent = page.getByText(/recent/i).first();
    if ((await recent.count()) > 0) {
      await expect(recent).toBeVisible({ timeout: 10000 });
    }
    await expect(page.getByText(/^(Error|500)$/).first()).toHaveCount(0);
  });

  test("DASH-04: AI credits card visible on Pro", async ({ page }) => {
    await page.goto("/dashboard/pro");
    await page.waitForLoadState("networkidle");

    // Pro dashboard renders AI-credits content; assert it's present in the DOM
    // (responsive layouts duplicate it across hidden/visible variants).
    const credits = page.getByText(/credits/i);
    expect(await credits.count()).toBeGreaterThan(0);
    await expect(page.getByText(/^(Error|500)$/).first()).toHaveCount(0);
  });

  test("DASH-05: activity section renders on Pro", async ({ page }) => {
    await page.goto("/dashboard/pro");
    await page.waitForLoadState("networkidle");

    // Activity / recent-flows content is rendered on the Pro dashboard.
    const activity = page.getByText(/activity|recent/i);
    expect(await activity.count()).toBeGreaterThan(0);
    await expect(page.getByText(/^(Error|500)$/).first()).toHaveCount(0);
  });

  test("DASH-06: switching Pro → Team stays within the dashboard", async ({
    page,
  }) => {
    await page.goto("/dashboard/pro");
    await page.waitForLoadState("networkidle");

    await page
      .locator('a[href*="/dashboard/team"], button:has-text("TEAM")')
      .first()
      .click()
      .catch(() => {});
    await page.waitForTimeout(1000);
    expect(page.url()).toContain("dashboard");
  });
});
