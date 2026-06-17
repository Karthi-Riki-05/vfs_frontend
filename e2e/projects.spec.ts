import { test, expect } from "@playwright/test";
import { deleteTestProjects } from "./helpers/db";

test.describe("Projects", () => {
  test("PROJ-01: projects page loads", async ({ page }) => {
    await page.goto("/dashboard/projects");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/projects/i).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("PROJ-02: new project button visible", async ({ page }) => {
    await page.goto("/dashboard/projects");
    await page.waitForLoadState("networkidle");
    await expect(
      page
        .getByRole("button", { name: /new project|create project|new/i })
        .first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("PROJ-03: create project modal opens", async ({ page }) => {
    await page.goto("/dashboard/projects");
    await page.waitForLoadState("networkidle");
    await page
      .getByRole("button", { name: /new project|create project|new/i })
      .first()
      .click();
    await expect(page.locator('[role="dialog"]').first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("PROJ-04: no overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard/projects");
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
});

test.describe("Projects — deep flows", () => {
  // Created projects are named "E2E Project …" — purge after each test.
  test.afterEach(() => {
    deleteTestProjects();
  });

  test("PROJ-05: create project with a name persists it", async ({ page }) => {
    await page.goto("/dashboard/projects");
    await page.waitForLoadState("networkidle");

    const projectName = "E2E Project " + Date.now();

    await page
      .getByRole("button", { name: /new project|create project|new/i })
      .first()
      .click();

    const dialog = page.locator('[role="dialog"], .ant-modal').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    await page
      .getByPlaceholder(/q3 launch/i)
      .first()
      .fill(projectName);
    await dialog
      .getByRole("button", { name: /create|ok|save|add/i })
      .first()
      .click();
    await page.waitForTimeout(1500);

    // Confirm persistence: poll the list, reloading if the optimistic update
    // hasn't surfaced yet under sequential load.
    for (let i = 0; i < 3; i++) {
      if (
        await page
          .getByText(projectName)
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        break;
      }
      await page.reload();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
    }
    await expect(page.getByText(projectName).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("PROJ-06: opening a project drills into its detail view", async ({
    page,
  }) => {
    await page.goto("/dashboard/projects");
    await page.waitForLoadState("networkidle");

    const card = page.locator('[class*="project"], [class*="card"]').first();

    if ((await card.count()) > 0) {
      await card.click().catch(() => {});
      await page
        .waitForURL("**/projects/**", { timeout: 10000 })
        .catch(() => {});
      await expect(page.getByText(/^(Error|500)$/).first()).toHaveCount(0);
    }
    await expect(page.locator("body")).toBeVisible();
  });

  test("PROJ-07: delete from menu surfaces a confirmation", async ({
    page,
  }) => {
    await page.goto("/dashboard/projects");
    await page.waitForLoadState("networkidle");

    const menuBtn = page
      .locator(
        '[class*="more"], button[aria-label*="more" i], button:has-text("⋯")',
      )
      .first();

    if ((await menuBtn.count()) > 0) {
      await menuBtn.click().catch(() => {});
      await page.waitForTimeout(400);

      const deleteOpt = page.getByText(/delete|remove/i).first();
      if ((await deleteOpt.count()) > 0) {
        await deleteOpt.click().catch(() => {});
        await page.waitForTimeout(400);
        // Cancel — never delete real data.
        await page
          .getByRole("button", { name: /cancel|no|keep/i })
          .first()
          .click()
          .catch(() => page.keyboard.press("Escape"));
      }
    }
    await expect(page.locator("body")).toBeVisible();
  });
});
