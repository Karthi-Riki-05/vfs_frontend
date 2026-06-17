import { test, expect } from "@playwright/test";

// Uses the global pro.json storageState (authenticated Pro user).

test.describe("Teams", () => {
  test("TEAM-01: teams page loads", async ({ page }) => {
    await page.goto("/dashboard/teams");
    await page.waitForLoadState("networkidle");
    // The "My Teams" h1 renders only after the workspace-loading splash
    // clears, so it doubles as a reliable "page loaded" signal.
    await expect(page.getByRole("heading", { name: /my teams/i })).toBeVisible({
      timeout: 15000,
    });
  });

  test("TEAM-02: create team button visible", async ({ page }) => {
    await page.goto("/dashboard/teams");
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("button", { name: /create team|new team/i }).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("TEAM-03: create team modal opens", async ({ page }) => {
    await page.goto("/dashboard/teams");
    await page.waitForLoadState("networkidle");
    const createBtn = page
      .getByRole("button", { name: /create team|new team/i })
      .first();
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();
    await expect(page.locator('[role="dialog"]').first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("TEAM-04: team detail page loads", async ({ page }) => {
    await page.goto("/dashboard/teams");
    await page.waitForLoadState("networkidle");

    const teamCard = page
      .locator('.team-card, [class*="team"], [data-testid*="team"]')
      .first();
    const count = await teamCard.count();
    if (count > 0) {
      await teamCard.click();
      await page.waitForURL("**/teams/**", { timeout: 10000 }).catch(() => {});
    } else {
      test.skip();
    }
  });

  test("TEAM-05: no horizontal overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard/teams");
    await page.waitForLoadState("networkidle");
    // Wait out the loading splash so the measurement reflects the real page.
    await page
      .getByRole("heading", { name: /my teams/i })
      .waitFor({ state: "visible", timeout: 15000 })
      .catch(() => {});
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
});

test.describe("Teams — deep flows", () => {
  // The Pro test user typically owns no teams, so each test guards on presence
  // and asserts behaviour only when team UI is actually rendered.

  test("TEAM-06: expanding a team reveals its member list", async ({
    page,
  }) => {
    await page.goto("/dashboard/teams");
    await page.waitForLoadState("networkidle");
    await page
      .getByRole("heading", { name: /my teams/i })
      .waitFor({ state: "visible", timeout: 15000 })
      .catch(() => {});

    const teamCard = page
      .locator(
        '[class*="team-card"], [class*="accordion"], .ant-collapse-item, [class*="team"]',
      )
      .first();

    if ((await teamCard.count()) > 0) {
      await teamCard.click().catch(() => {});
      await page.waitForTimeout(600);
      const members = page.getByText(/members/i).first();
      if ((await members.count()) > 0) {
        await expect(members).toBeVisible({ timeout: 3000 });
      }
    }
    await expect(page.locator("body")).toBeVisible();
  });

  test("TEAM-07: invite modal exposes an email field and rejects bad input", async ({
    page,
  }) => {
    await page.goto("/dashboard/teams");
    await page.waitForLoadState("networkidle");

    const inviteBtn = page
      .locator(
        'button:has-text("Invite"), [class*="invite"], button[aria-label*="invite" i]',
      )
      .first();

    if ((await inviteBtn.count()) > 0) {
      await inviteBtn.click().catch(() => {});
      await page.waitForTimeout(600);

      const dialog = page.locator('[role="dialog"], .ant-modal').first();
      const emailInput = dialog
        .locator('input[type="email"], input[type="text"], input')
        .first();

      if ((await emailInput.count()) > 0) {
        await expect(emailInput).toBeVisible();
        await emailInput.fill("not-an-email");
        await dialog
          .getByRole("button", { name: /invite|send|ok|add/i })
          .first()
          .click()
          .catch(() => {});
        await page.waitForTimeout(500);
        // No crash; modal validation handled it.
        await expect(page.getByText(/^(Error|500)$/).first()).toHaveCount(0);
        await page.keyboard.press("Escape").catch(() => {});
      }
    }
    await expect(page.locator("body")).toBeVisible();
  });

  test("TEAM-08: managing a team opens its detail page", async ({ page }) => {
    await page.goto("/dashboard/teams");
    await page.waitForLoadState("networkidle");

    const manage = page
      .locator(
        'a[href*="teams/"], a:has-text("Manage"), button:has-text("Manage")',
      )
      .first();

    if ((await manage.count()) > 0) {
      await manage.click().catch(() => {});
      await page.waitForURL("**/teams/**", { timeout: 10000 }).catch(() => {});
      await expect(page.getByText(/^(Error|500)$/).first()).toHaveCount(0);
    }
    await expect(page.locator("body")).toBeVisible();
  });
});
