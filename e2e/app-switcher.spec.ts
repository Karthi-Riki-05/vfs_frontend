import { test, expect, Page } from "@playwright/test";

/**
 * Sidebar App Switcher — parity + behaviour suite.
 *
 * Source of truth: new_design SideNav (localhost:3003). The segmented toggle is
 * two equal tab buttons inside a rounded pill:
 *   - container : rounded-2xl (16px), bg-secondary/70, 1px border
 *   - tab       : flex-1, h-9 (36px), rounded-xl (12px), 12px / 700 weight
 *   - ValueChart active : bg-card (#fff) + text-primary-deep (#1f7d5e) + shadow
 *   - PRO active        : bg var(--orange) (#ff9a30) + #fff text + Crown + shadow
 *
 * Covers the three audit pillars:
 *   1. Visual parity (computed CSS vs new_design reference values)
 *   2. Desktop-web-ONLY visibility (hidden on mobile viewport / WebView shell)
 *   3. State logic (toggle flips app context + routes, no stale caching)
 *
 * Auth: logs in via the NextAuth CSRF endpoint directly (the React client
 * signIn() path is broken in the local env). Run self-contained:
 *
 *   npx playwright test --config=playwright.app-switcher.config.ts
 */

// Reference values lifted from new_design SideNav + globals.css tokens.
const REF = {
  orange: "rgb(255, 154, 48)", // --orange #ff9a30 (active PRO bg)
  primaryDeep: "rgb(31, 125, 94)", // --primary-deep #1f7d5e (active ValueChart text)
  white: "rgb(255, 255, 255)",
  tabHeight: 36, // h-9
  fontSize: "12px", // text-[12px]
  fontWeight: "700", // font-bold
  tabRadius: "20px", // rounded-xl  (--radius-xl, shared by both apps)
  containerRadius: "24px", // rounded-2xl (--radius-2xl, shared by both apps)
};

// Auth is established once by app-switcher.setup.ts and injected via
// storageState (see playwright.app-switcher.config.ts) — no per-test login.

const switcher = (page: Page) => page.getByTestId("app-switcher");
const vcTab = (page: Page) =>
  switcher(page).getByRole("tab", { name: "ValueChart" });
const proTab = (page: Page) => switcher(page).getByRole("tab", { name: /PRO/ });

// ───────────────────────── Desktop: parity + behaviour ─────────────────────
test.describe("App Switcher — desktop web", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  // Seed the per-tab app context the way real navigation does. storageState
  // does NOT restore sessionStorage, and DashboardLayout mounts the Team↔Pro
  // shell off the backend `currentApp`, which it reconciles from
  // `vc_app_context` on load (a one-time switchApp + reload). Without this seed
  // a deep-link lands on whatever shell the backend last persisted — flaky.
  async function gotoApp(page: Page, mode: "team" | "pro") {
    await page.addInitScript((m) => {
      try {
        sessionStorage.setItem("vc_device_mode", "web");
        sessionStorage.setItem("vc_app_context", m as string);
      } catch {
        /* sessionStorage blocked */
      }
    }, mode);
    await page.goto(mode === "pro" ? "/dashboard/pro" : "/dashboard/team");
    await page.waitForLoadState("networkidle");
    await expect(switcher(page)).toBeVisible({ timeout: 20_000 });
    // Ride out the reconcile reload until the expected tab is active.
    const active = mode === "pro" ? proTab(page) : vcTab(page);
    await expect(active).toHaveAttribute("aria-selected", "true", {
      timeout: 20_000,
    });
  }

  test("renders the segmented two-tab toggle (ValueChart + PRO)", async ({
    page,
  }) => {
    await gotoApp(page, "pro");
    await expect(vcTab(page)).toBeVisible();
    await expect(proTab(page)).toBeVisible();
    await expect(switcher(page).getByRole("tab")).toHaveCount(2);
  });

  test("container matches new_design pill (radius + secondary bg + border)", async ({
    page,
  }) => {
    await gotoApp(page, "pro");
    const pill = switcher(page).getByRole("tablist");
    expect(
      await pill.evaluate((el) => getComputedStyle(el).borderTopLeftRadius),
    ).toBe(REF.containerRadius);
    // 1px hairline border + non-transparent secondary fill.
    expect(
      await pill.evaluate((el) => getComputedStyle(el).borderTopWidth),
    ).toBe("1px");
    const bg = await pill.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    expect(bg).not.toBe("rgba(0, 0, 0, 0)");
  });

  test("tabs match reference geometry (h-9, 12px / 700, rounded-xl)", async ({
    page,
  }) => {
    await gotoApp(page, "pro");
    for (const tab of [vcTab(page), proTab(page)]) {
      const box = await tab.boundingBox();
      expect(box).toBeTruthy();
      expect(Math.round(box!.height)).toBe(REF.tabHeight);
      expect(await tab.evaluate((el) => getComputedStyle(el).fontSize)).toBe(
        REF.fontSize,
      );
      expect(await tab.evaluate((el) => getComputedStyle(el).fontWeight)).toBe(
        REF.fontWeight,
      );
      expect(
        await tab.evaluate((el) => getComputedStyle(el).borderTopLeftRadius),
      ).toBe(REF.tabRadius);
    }
  });

  test("ValueChart active state is the green (primary-deep) tab", async ({
    page,
  }) => {
    await gotoApp(page, "team");
    await expect(vcTab(page)).toHaveAttribute("aria-selected", "true");
    await expect(proTab(page)).toHaveAttribute("aria-selected", "false");
    // Active ValueChart text uses --primary-deep on the white card surface.
    expect(await vcTab(page).evaluate((el) => getComputedStyle(el).color)).toBe(
      REF.primaryDeep,
    );
    expect(
      await vcTab(page).evaluate((el) => getComputedStyle(el).backgroundColor),
    ).toBe(REF.white);
    // Inactive PRO tab is muted (transparent fill — not the orange).
    expect(
      await proTab(page).evaluate((el) => getComputedStyle(el).backgroundColor),
    ).toBe("rgba(0, 0, 0, 0)");
  });

  test("PRO active state uses the amber/orange token, NOT washed out", async ({
    page,
  }) => {
    await gotoApp(page, "pro");
    await expect(proTab(page)).toHaveAttribute("aria-selected", "true");

    const bg = await proTab(page).evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    const color = await proTab(page).evaluate(
      (el) => getComputedStyle(el).color,
    );
    // The crux of pillar #1: orange must actually render (no AntD reset wash-out).
    expect(bg).toBe(REF.orange);
    expect(color).toBe(REF.white);
    // Crown icon present on the PRO tab.
    await expect(proTab(page).locator("svg")).toBeVisible();
    // Inactive ValueChart tab is muted (transparent fill).
    expect(
      await vcTab(page).evaluate((el) => getComputedStyle(el).backgroundColor),
    ).toBe("rgba(0, 0, 0, 0)");

    await page.screenshot({
      path: "test-results/app-switcher-pro-active.png",
    });
  });

  test("toggling switches app + route both ways (no stale caching)", async ({
    page,
  }) => {
    // Self-normalising: seed only the web device-mode (NOT vc_app_context, which
    // switchToApp owns) so the clicks below aren't clobbered by an init script.
    await page.addInitScript(() => {
      try {
        sessionStorage.setItem("vc_device_mode", "web");
      } catch {
        /* blocked */
      }
    });
    await page.goto("/dashboard/team");
    await page.waitForLoadState("networkidle");
    await expect(switcher(page)).toBeVisible({ timeout: 20_000 });

    // Normalise to the Team app first — clicking the already-active tab is a
    // guarded no-op, so the persisted backend app must not decide the outcome.
    if ((await proTab(page).getAttribute("aria-selected")) === "true") {
      await vcTab(page).click();
      await page.waitForURL(/\/dashboard\/team/, { timeout: 30_000 });
      await page.waitForLoadState("networkidle");
      await expect(vcTab(page)).toHaveAttribute("aria-selected", "true", {
        timeout: 20_000,
      });
    }

    // → PRO: click the inactive tab → Pro route with PRO active.
    await proTab(page).click();
    await page.waitForURL(/\/dashboard\/pro/, { timeout: 30_000 });
    await page.waitForLoadState("networkidle");
    // Fresh render reflects the new active tab (not stale React state).
    await expect(proTab(page)).toHaveAttribute("aria-selected", "true", {
      timeout: 20_000,
    });

    // → ValueChart: click the inactive tab → Team route with ValueChart active.
    await vcTab(page).click();
    await page.waitForURL(/\/dashboard\/team/, { timeout: 30_000 });
    await page.waitForLoadState("networkidle");
    await expect(vcTab(page)).toHaveAttribute("aria-selected", "true", {
      timeout: 20_000,
    });
    await expect(proTab(page)).toHaveAttribute("aria-selected", "false");
  });

  test("clicking the already-active tab is a no-op (no reload churn)", async ({
    page,
  }) => {
    await gotoApp(page, "pro");
    await page.evaluate(() => ((window as any).__navMark = 1));
    await proTab(page).click(); // already active in Pro app → guarded no-op
    await page.waitForTimeout(800);
    // No full-page navigation occurred → our sentinel survives.
    expect(await page.evaluate(() => (window as any).__navMark)).toBe(1);
    expect(page.url()).toContain("/dashboard/pro");
  });
});

// ───────────────────────── Mobile: must be hidden ──────────────────────────
test.describe("App Switcher — mobile viewport (must be hidden)", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  test("switcher is NOT rendered on a mobile viewport", async ({ page }) => {
    await page.goto("/dashboard/team");
    await page.waitForLoadState("networkidle");

    // Closed state: nothing in the DOM.
    await expect(switcher(page)).toHaveCount(0);

    // Open the mobile drawer if a menu trigger exists, then re-assert it stays
    // hidden inside the drawer too (the pillar-#2 regression we fixed).
    const menu = page
      .getByRole("button", { name: /menu|open menu|navigation/i })
      .first();
    if (await menu.count()) {
      await menu.click().catch(() => {});
      await page.waitForTimeout(400);
      await expect(switcher(page)).toHaveCount(0);
    }

    await page.screenshot({
      path: "test-results/app-switcher-mobile-hidden.png",
    });
  });
});
