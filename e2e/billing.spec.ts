import { test, expect } from "@playwright/test";

test.describe("Billing", () => {
  test("BILL-01: billing page loads", async ({ page }) => {
    await page.goto("/dashboard/settings/billing");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/billing|account/i).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("BILL-02: renders ONCE not twice", async ({ page }) => {
    await page.goto("/dashboard/settings/billing");
    await page.waitForLoadState("networkidle");
    // The page heading must appear exactly once — a past bug double-rendered
    // the whole billing view.
    await expect(page.locator("h1", { hasText: /billing/i })).toHaveCount(1);
  });

  test("BILL-03: transaction history visible", async ({ page }) => {
    await page.goto("/dashboard/settings/billing");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/transaction|history/i).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("BILL-04: no overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto("/dashboard/settings/billing");
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
});
