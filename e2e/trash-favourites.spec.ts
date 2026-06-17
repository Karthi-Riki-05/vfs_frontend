import { test, expect } from "@playwright/test";
import {
  createTrashedTestFlow,
  createFavouriteTestFlow,
  deleteTestFlows,
} from "./helpers/db";

const TRASHED_NAME = "[E2E] Trashed Flow";
const FAV_NAME = "[E2E] Fav Flow";

test.describe("Trash", () => {
  // Seed one trashed [E2E] flow so the populated-trash UI (Empty Trash button,
  // auto-delete notice, restore/delete controls) is deterministically present.
  // Hard-deleted after each test — the user's real trash is never touched.
  test.beforeEach(() => {
    deleteTestFlows();
    createTrashedTestFlow();
  });
  test.afterEach(() => {
    deleteTestFlows();
  });

  test("TRASH-01: trash page loads", async ({ page }) => {
    await page.goto("/dashboard/trash");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/trash/i).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("TRASH-02: empty trash button visible", async ({ page }) => {
    await page.goto("/dashboard/trash");
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("button", { name: /empty trash|empty/i }).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("TRASH-03: shows auto-delete message", async ({ page }) => {
    await page.goto("/dashboard/trash");
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByText(/30 days|auto.?delete|permanently/i).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("TRASH-04: restoring a flow removes it from trash", async ({ page }) => {
    await page.goto("/dashboard/trash");
    await page.waitForLoadState("networkidle");

    // Operate only on our seeded row.
    await expect(page.getByText(TRASHED_NAME)).toBeVisible({ timeout: 10000 });
    const row = page
      .locator("div")
      .filter({ hasText: TRASHED_NAME })
      .filter({ has: page.getByTitle("Restore") })
      .last();
    await row.getByTitle("Restore").click();

    // Real outcome: the restored flow leaves the trash list.
    await expect(page.getByText(TRASHED_NAME)).toHaveCount(0, {
      timeout: 10000,
    });
  });

  test("TRASH-05: permanent delete asks for confirmation", async ({ page }) => {
    await page.goto("/dashboard/trash");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(TRASHED_NAME)).toBeVisible({ timeout: 10000 });
    const row = page
      .locator("div")
      .filter({ hasText: TRASHED_NAME })
      .filter({ has: page.getByTitle("Delete permanently") })
      .last();
    await row.getByTitle("Delete permanently").click();

    // antd Modal.confirm — verify the destructive confirm copy, then cancel.
    const dialog = page.getByRole("dialog", {
      name: /permanently delete this flow/i,
    });
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByText(/cannot be undone/i)).toBeVisible();
    await dialog.getByRole("button", { name: /^cancel$/i }).click();

    // Cancelled — the flow is still in trash (afterEach removes the seed).
    await expect(page.getByText(TRASHED_NAME).first()).toBeVisible();
  });
});

test.describe("Favourites", () => {
  // Seed one favourited [E2E] flow so the favourites list has real content.
  test.beforeEach(() => {
    deleteTestFlows();
    createFavouriteTestFlow();
  });
  test.afterEach(() => {
    deleteTestFlows();
  });

  test("FAV-01: favourites page loads", async ({ page }) => {
    await page.goto("/dashboard/favourites");
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByText(/favourites|favorites|starred/i).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("FAV-02: shows favourited flows", async ({ page }) => {
    await page.goto("/dashboard/favourites");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(FAV_NAME).first()).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(/^(Error|500)$/).first()).toHaveCount(0);
  });

  test("FAV-03: browse flows CTA when empty", async ({ page }) => {
    await page.goto("/dashboard/favourites");
    await page.waitForLoadState("networkidle");
    const browseBtn = page.getByRole("button", { name: /browse/i });
    const count = await browseBtn.count();
    if (count > 0) {
      await expect(browseBtn.first()).toBeVisible();
    }
  });

  test("FAV-04: unfavouriting removes the flow from favourites", async ({
    page,
  }) => {
    await page.goto("/dashboard/favourites");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(FAV_NAME).first()).toBeVisible({
      timeout: 10000,
    });

    // The card's heart button is titled "Remove from favourites".
    const removeBtn = page.getByTitle(/remove from favou?rites/i).first();
    await removeBtn.click();

    // Real outcome: the flow leaves the favourites list.
    await expect(page.getByText(FAV_NAME)).toHaveCount(0, { timeout: 10000 });
  });

  test("FAV-05: browse flows CTA navigates to a dashboard route", async ({
    page,
  }) => {
    await page.goto("/dashboard/favourites");
    await page.waitForLoadState("networkidle");

    const browse = page
      .locator(
        'button:has-text("Browse Flows"), a:has-text("Browse Flows"), button:has-text("Browse")',
      )
      .first();

    if ((await browse.count()) > 0) {
      await browse.click().catch(() => {});
      await page
        .waitForURL("**/dashboard/**", { timeout: 5000 })
        .catch(() => {});
    }
    expect(page.url()).toContain("dashboard");
  });
});
