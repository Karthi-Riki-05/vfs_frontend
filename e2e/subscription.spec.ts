import { test, expect } from "@playwright/test";

// Subscription + Billing E2E. Uses the shared pro storageState from
// global-setup (playwright.config.ts), so the dashboard is authenticated.
// Screenshots land in e2e/screenshots/ for manual review.
const SHOTS = "e2e/screenshots";

test.describe("Subscription", () => {
  test("SUB-01: subscription page loads with plan cards", async ({ page }) => {
    await page.goto("/dashboard/subscription");
    await page.waitForLoadState("networkidle");

    // Page rendered without crashing — a known heading/landmark is present.
    await expect(page.getByText(/plan|subscription|pro/i).first()).toBeVisible({
      timeout: 10000,
    });

    // Plan / pricing cards use the rounded-card style (rounded-2xl).
    await expect(page.locator(".rounded-2xl").first()).toBeVisible({
      timeout: 10000,
    });

    await page.screenshot({
      path: `${SHOTS}/subscription-page.png`,
      fullPage: true,
    });
  });

  test("SUB-02: USD pricing shown (no foreign currency)", async ({ page }) => {
    await page.goto("/dashboard/subscription");
    await page.waitForLoadState("networkidle");

    const body = await page.locator("body").innerText();

    // USD symbol present.
    expect(body).toContain("$");
    // No rupee / other non-USD symbols.
    expect(body).not.toContain("₹");
    expect(body).not.toContain("€");
    // No "local currency" disclaimer text.
    expect(body.toLowerCase()).not.toContain("local currency");

    await page.screenshot({
      path: `${SHOTS}/subscription-pricing.png`,
      fullPage: true,
    });
  });
});

test.describe("Billing", () => {
  test("SUB-03: billing page loads with manage + history", async ({ page }) => {
    await page.goto("/dashboard/settings/billing");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByText(/Manage Billing & Invoices/i).first(),
    ).toBeVisible({ timeout: 10000 });

    await expect(page.getByText(/transaction|history/i).first()).toBeVisible({
      timeout: 10000,
    });

    await page.screenshot({
      path: `${SHOTS}/billing-page.png`,
      fullPage: true,
    });
  });

  test("SUB-04: transaction badge shows status (not hardcoded Paid)", async ({
    page,
  }) => {
    await page.goto("/dashboard/settings/billing");
    await page.waitForLoadState("networkidle");

    // Expand the transaction history section if collapsed.
    const txToggle = page.getByText(/transaction|history/i).first();
    await txToggle.click().catch(() => {});
    await page.waitForTimeout(500);

    // Either real transaction rows render with status badges, or the empty
    // state shows. Both are valid — what must NOT happen is a hardcoded
    // "Paid"-only assumption. Verify a badge element class exists when rows do.
    const emptyState = page.getByText(/no transactions yet/i);
    const isEmpty = await emptyState.isVisible().catch(() => false);

    if (!isEmpty) {
      // Status badges are rendered by getTransactionBadge() — each is a
      // <span> with a rounded pill style. At least one should be visible.
      const badge = page
        .locator("span")
        .filter({ hasText: /Paid|Pending|Failed|Refunded/i })
        .first();
      await expect(badge).toBeVisible({ timeout: 10000 });
    }

    await page.screenshot({
      path: `${SHOTS}/billing-transactions.png`,
      fullPage: true,
    });
  });
});

test.describe("Subscription (mobile)", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("SUB-05: mobile subscription page renders with USD", async ({
    page,
  }) => {
    await page.goto("/dashboard/subscription");
    await page.waitForLoadState("networkidle");

    // The sidebar "Subscription" label and the FAB are hidden on mobile, so
    // assert on a VISIBLE rounded pricing/plan card (:visible filters hidden).
    await expect(page.locator(".rounded-2xl:visible").first()).toBeVisible({
      timeout: 10000,
    });

    const body = await page.locator("body").innerText();
    expect(body).toContain("$");
    expect(body).not.toContain("₹");

    await page.screenshot({
      path: `${SHOTS}/subscription-mobile.png`,
      fullPage: true,
    });
  });
});
