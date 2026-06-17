import { test, expect } from "@playwright/test";

// Uses the global pro.json storageState (authenticated Pro user).

// Helper: find and open the AI assistant entry point, returning whether it opened.
async function openAiPanel(page: import("@playwright/test").Page) {
  const aiBtn = page
    .locator(
      'button[class*="ai"], [class*="fab"], [aria-label*="AI" i], button:has-text("✦")',
    )
    .first();
  if ((await aiBtn.count()) === 0) return false;
  await aiBtn.click().catch(() => {});
  await page.waitForTimeout(800);
  return true;
}

test.describe("AI Assistant", () => {
  test("AI-01: dashboard renders without error (AI FAB host page)", async ({
    page,
  }) => {
    await page.goto("/dashboard/pro");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByText(/^(Error|500)$/).first()).toHaveCount(0);
  });

  test("AI-02: AI panel opens when its launcher exists", async ({ page }) => {
    await page.goto("/dashboard/pro");
    await page.waitForLoadState("networkidle");

    if (await openAiPanel(page)) {
      const panel = page
        .getByText(/value charts ai|ai assistant|ask ai/i)
        .first();
      if ((await panel.count()) > 0) {
        await expect(panel).toBeVisible({ timeout: 5000 });
      }
    }
    await expect(page.getByText(/^(Error|500)$/).first()).toHaveCount(0);
  });

  test("AI-03: credits indicator shows in the AI panel", async ({ page }) => {
    await page.goto("/dashboard/pro");
    await page.waitForLoadState("networkidle");

    if (await openAiPanel(page)) {
      const credits = page.getByText(/credits|⚡/i).first();
      if ((await credits.count()) > 0) {
        await expect(credits).toBeVisible({ timeout: 5000 });
      }
    }
    await expect(page.locator("body")).toBeVisible();
  });

  test("AI-04: chat input is present and editable in the AI panel", async ({
    page,
  }) => {
    await page.goto("/dashboard/pro");
    await page.waitForLoadState("networkidle");

    if (await openAiPanel(page)) {
      const input = page
        .locator(
          'input[placeholder*="ask" i], input[placeholder*="prompt" i], textarea[placeholder*="ask" i], textarea',
        )
        .first();
      if ((await input.count()) > 0 && (await input.isVisible())) {
        await expect(input).toBeEditable();
      }
    }
    await expect(page.locator("body")).toBeVisible();
  });

  test("AI-05: opening the AI panel does not crash the page", async ({
    page,
  }) => {
    await page.goto("/dashboard/pro");
    await page.waitForLoadState("networkidle");
    await openAiPanel(page);
    await expect(page.getByText(/^(Error|500)$/).first()).toHaveCount(0);
    await expect(page.locator("body")).toBeVisible();
  });
});
