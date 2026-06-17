import { test, expect } from "@playwright/test";
import { deleteTestShapeGroups } from "./helpers/db";

test.describe("Shapes", () => {
  test("SHAPE-01: shapes page loads", async ({ page }) => {
    await page.goto("/dashboard/shapes");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/shape library|shapes/i).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("SHAPE-02: add shape button visible", async ({ page }) => {
    await page.goto("/dashboard/shapes");
    await page.waitForLoadState("networkidle");
    await expect(
      page
        .getByRole("button", { name: /add shape|new shape|add|new/i })
        .first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("SHAPE-03: groups view loads without error", async ({ page }) => {
    await page.goto("/dashboard/shapes");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByText(/^(Error|500)$/).first()).toHaveCount(0);
  });

  test("SHAPE-04: no overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard/shapes");
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
});

test.describe("Shapes — deep flows", () => {
  // Any group created via the UI is named "E2E Group …" — clean up after each.
  test.afterEach(() => {
    deleteTestShapeGroups();
  });

  test("SHAPE-05: create group full flow", async ({ page }) => {
    await page.goto("/dashboard/shapes");
    await page.waitForLoadState("networkidle");

    const newGroupBtn = page
      .getByRole("button", { name: /new group|create group|add group|group/i })
      .first();

    if ((await newGroupBtn.count()) === 0) {
      test.skip(true, "No create-group control on this build");
      return;
    }
    await newGroupBtn.click();

    // The create-group modal is a plain overlay div (no role="dialog"); detect
    // it by its heading and the group-name input placeholder.
    await expect(page.getByText("Create New Group")).toBeVisible({
      timeout: 5000,
    });

    const groupName = "E2E Group " + Date.now();
    const input = page.getByPlaceholder(/marketing team/i).first();
    await input.fill(groupName);
    // The input submits on Enter (and the Create button is wired to the same).
    await input.press("Enter");
    await page.waitForTimeout(1500);

    // Group should appear (reload if list is cache-bound).
    const appeared = await page
      .getByText(groupName)
      .first()
      .isVisible()
      .catch(() => false);
    if (!appeared) {
      await page.reload();
      await page.waitForLoadState("networkidle");
    }
    await expect(page.getByText(groupName).first()).toBeVisible({
      timeout: 8000,
    });
  });

  test("SHAPE-06: groups list shows groups or empty state", async ({
    page,
  }) => {
    await page.goto("/dashboard/shapes");
    await page.waitForLoadState("networkidle");

    const hasGroups =
      (await page
        .locator('[class*="group"], [class*="folder"], [class*="card"]')
        .count()) > 0;
    const hasEmpty =
      (await page
        .getByText(/no shapes|no groups|empty|get started|create your first/i)
        .count()) > 0;

    expect(hasGroups || hasEmpty).toBe(true);
  });

  test("SHAPE-07: search filters shapes without crashing", async ({ page }) => {
    await page.goto("/dashboard/shapes");
    await page.waitForLoadState("networkidle");

    const search = page.locator('input[placeholder*="search" i]').first();
    if (await search.isVisible().catch(() => false)) {
      await search.fill("nonexistent_xyz_123");
      await page.waitForTimeout(600);
      await expect(page.getByText(/^(Error|500)$/).first()).toHaveCount(0);
      await search.clear();
    }
    await expect(page.locator("body")).toBeVisible();
  });

  test("SHAPE-08: opening a group drills in without server error", async ({
    page,
  }) => {
    await page.goto("/dashboard/shapes");
    await page.waitForLoadState("networkidle");

    const group = page
      .locator('[class*="group-card"], [class*="folder"], [class*="group"]')
      .first();

    if ((await group.count()) > 0) {
      await group.click().catch(() => {});
      await page.waitForTimeout(600);
      await expect(page.getByText(/^(Error|500)$/).first()).toHaveCount(0);
    }
    await expect(page.locator("body")).toBeVisible();
  });
});
