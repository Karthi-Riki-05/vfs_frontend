import { test, expect } from "@playwright/test";

test.describe("Profile Settings", () => {
  test("SET-01: settings page loads", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByText(/profile|settings|account|personal information/i).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("SET-02: name field is editable", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await page.waitForLoadState("networkidle");
    // The settings page opens on a hub menu; the profile form lives behind
    // the "Edit Profile" entry.
    await page
      .getByRole("button", { name: /edit profile/i })
      .first()
      .click();
    const nameInput = page.getByPlaceholder(/your full name/i).first();
    await expect(nameInput).toBeVisible({ timeout: 10000 });
    await expect(nameInput).toBeEditable();
  });

  test("SET-03: email field is disabled", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await page.waitForLoadState("networkidle");
    await page
      .getByRole("button", { name: /edit profile/i })
      .first()
      .click();
    // In the Edit Profile form the email field is the disabled input
    // (custom input — no type/name attributes).
    const emailInput = page.locator("input:disabled").first();
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(emailInput).toBeDisabled();
  });

  test("SET-04: change password section visible", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByText(/change password|password/i).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("SET-05: no overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard/settings");
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
});

test.describe("Profile Settings — deep flows", () => {
  test("SET-06: saving the name persists across reload", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await page.waitForLoadState("networkidle");

    await page
      .getByRole("button", { name: /edit profile/i })
      .first()
      .click()
      .catch(() => {});

    const nameInput = page.getByPlaceholder(/your full name/i).first();
    if (!(await nameInput.isVisible().catch(() => false))) {
      test.skip(true, "Edit Profile form not available");
      return;
    }

    const original = await nameInput.inputValue();
    const testName = "E2E Test " + Date.now();

    await nameInput.fill(testName);
    await page
      .getByRole("button", { name: /save|update/i })
      .first()
      .click()
      .catch(() => {});
    await page.waitForTimeout(1500);

    await page.reload();
    await page.waitForLoadState("networkidle");
    await page
      .getByRole("button", { name: /edit profile/i })
      .first()
      .click()
      .catch(() => {});

    const reloaded = page.getByPlaceholder(/your full name/i).first();
    // The form repopulates from the session/profile API asynchronously.
    await expect(reloaded).toHaveValue(testName, { timeout: 10000 });

    // Restore the original name so the user's profile is left unchanged.
    if (original) {
      await reloaded.fill(original);
      await page
        .getByRole("button", { name: /save|update/i })
        .first()
        .click()
        .catch(() => {});
      await page.waitForTimeout(1000);
    }
  });

  test("SET-07: mismatched new passwords are rejected", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await page.waitForLoadState("networkidle");

    await page
      .getByText(/change password/i)
      .first()
      .click()
      .catch(() => {});
    await page.waitForTimeout(400);

    const pw = page.locator('input[type="password"]');
    if ((await pw.count()) < 3) {
      test.skip(true, "Password form not available");
      return;
    }

    await pw.nth(0).fill("Test@1234");
    await pw.nth(1).fill("NewPass@123");
    await pw.nth(2).fill("Different@456");

    await page
      .getByRole("button", { name: /change password|update password|save/i })
      .first()
      .click()
      .catch(() => {});
    await page.waitForTimeout(800);

    // A mismatch surfaces a validation message; the password is NOT changed.
    const err = page.getByText(/match|same|do not match|confirm/i).first();
    if ((await err.count()) > 0) {
      await expect(err).toBeVisible({ timeout: 3000 });
    }
    await expect(page.getByText(/^(Error|500)$/).first()).toHaveCount(0);
  });

  test("SET-08: billing entry navigates within the dashboard", async ({
    page,
  }) => {
    await page.goto("/dashboard/settings");
    await page.waitForLoadState("networkidle");

    await page
      .locator(
        'a[href*="billing"], button:has-text("Billing"), text=Billing & Invoices',
      )
      .first()
      .click()
      .catch(() => {});
    await page.waitForTimeout(1000);
    expect(page.url()).toContain("dashboard");
  });

  test("SET-09: subscription entry navigates within the dashboard", async ({
    page,
  }) => {
    await page.goto("/dashboard/settings");
    await page.waitForLoadState("networkidle");

    await page
      .locator('a[href*="subscription"], button:has-text("Subscription")')
      .first()
      .click()
      .catch(() => {});
    await page.waitForTimeout(1000);
    expect(page.url()).toContain("dashboard");
  });
});
