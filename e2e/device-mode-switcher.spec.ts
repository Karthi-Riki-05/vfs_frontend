import { test, expect, Page } from "@playwright/test";

/**
 * Device mode & app-switcher visibility.
 *
 * `vc_device_mode` (sessionStorage) is the explicit web-vs-mobile signal,
 * written by app/page.tsx:
 *   - no ?app=        → 'web'    → app switcher VISIBLE
 *   - ?app=team|pro   → 'mobile' → app switcher HIDDEN
 *
 * The switcher is rendered with data-testid="app-switcher" and its visibility
 * is driven by useDeviceMode().isWeb.
 *
 * Auth: logs in via the NextAuth CSRF endpoint directly (the React client
 * signIn() path is currently broken in the local env). Run with the dedicated
 * config so the shared (broken) global-setup is skipped:
 *
 *   npx playwright test device-mode-switcher --config=playwright.switcher.config.ts
 */

const TEST_USER = {
  email: "prouser@valueflowtest.com",
  password: "Test@1234",
};

async function login(page: Page) {
  await page.goto("/login");
  const csrfToken = await page.evaluate(
    async () => (await (await fetch("/api/auth/csrf")).json()).csrfToken,
  );
  const status = await page.evaluate(
    async ({ csrfToken, email, password }) => {
      const body = new URLSearchParams({
        csrfToken,
        email,
        password,
        json: "true",
      });
      const r = await fetch("/api/auth/callback/credentials?", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      return r.status;
    },
    { csrfToken, ...TEST_USER },
  );
  expect(status).toBe(200);
  const sess = await page.evaluate(() =>
    fetch("/api/auth/session").then((r) => r.json()),
  );
  expect(sess?.user?.email).toBe(TEST_USER.email);
}

const readDeviceMode = (page: Page) =>
  page.evaluate(() => sessionStorage.getItem("vc_device_mode"));

test.describe("Device Mode & App Switcher", () => {
  const switcher = (page: Page) => page.getByTestId("app-switcher");

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("TC1: Website (no ?app=) — deviceMode=web, switcher VISIBLE", async ({
    page,
  }) => {
    // Go through the root page so app/page.tsx writes vc_device_mode.
    await page.goto("/");
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
    await page.waitForLoadState("networkidle");

    expect(page.url()).not.toContain("?app=");
    expect(await readDeviceMode(page)).toBe("web");

    await expect(switcher(page)).toBeVisible();
    await expect(switcher(page).getByText("TEAM")).toBeVisible();
    await expect(switcher(page).getByText("PRO")).toBeVisible();

    await page.screenshot({
      path: "test-results/website-switcher-visible.png",
    });
  });

  test("TC2: Team app (?app=team) — deviceMode=mobile, switcher HIDDEN", async ({
    page,
  }) => {
    await page.goto("/?app=team");
    await page.waitForURL(/\/dashboard\/team/, { timeout: 30_000 });
    await page.waitForLoadState("networkidle");

    expect(await readDeviceMode(page)).toBe("mobile");
    await expect(switcher(page)).toHaveCount(0);

    await page.screenshot({
      path: "test-results/team-app-switcher-hidden.png",
    });
  });

  test("TC3: Pro app (?app=pro) — deviceMode=mobile, switcher HIDDEN", async ({
    page,
  }) => {
    await page.goto("/?app=pro");
    await page.waitForURL(/\/dashboard\/pro/, { timeout: 30_000 });
    await page.waitForLoadState("networkidle");

    expect(await readDeviceMode(page)).toBe("mobile");
    await expect(switcher(page)).toHaveCount(0);

    await page.screenshot({
      path: "test-results/pro-app-switcher-hidden.png",
    });
  });
});
