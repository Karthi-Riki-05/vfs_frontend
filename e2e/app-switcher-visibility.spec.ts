import { test, expect, Page } from "@playwright/test";

/**
 * App-switcher visibility.
 *
 * The cross-app switcher (data-testid="app-switcher") must appear ONLY on the
 * website (no ?app= param) and be hidden inside the Flutter WebView shells
 * (?app=team / ?app=pro). Visibility is driven by usePro().forcedMode, which
 * reads sessionStorage `vc_app_param` — set by app/page.tsx ONLY when the URL
 * carries an explicit ?app=team|pro.
 *
 * Auth: this spec logs in via the NextAuth CSRF endpoint directly (the React
 * client signIn() path is currently broken in the local env — it submits with
 * a mismatched CSRF token and NextAuth rejects it with ?csrf=true). The manual
 * CSRF dance below establishes a real next-auth.session-token cookie. Run with
 * the dedicated config so the shared (broken) global-setup is skipped:
 *
 *   npx playwright test --config=playwright.switcher.config.ts
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
  // Confirm the session is real before proceeding.
  const sess = await page.evaluate(() =>
    fetch("/api/auth/session").then((r) => r.json()),
  );
  expect(sess?.user?.email).toBe(TEST_USER.email);
}

test.describe("App Switcher Visibility", () => {
  const switcher = (page: Page) => page.getByTestId("app-switcher");

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("TC1: Website (no ?app=) — switcher SHOULD be visible", async ({
    page,
  }) => {
    await page.goto("/dashboard/team");
    await page.waitForLoadState("networkidle");

    expect(page.url()).not.toContain("?app=");
    await expect(switcher(page)).toBeVisible();

    // Both stacked entries are present (Team + Pro badges).
    await expect(switcher(page).getByText("Value Charts")).toBeVisible();
    await expect(switcher(page).getByText("PRO", { exact: true })).toBeVisible();

    await page.screenshot({
      path: "test-results/website-switcher-visible.png",
    });
  });

  test("TC2: Team app (?app=team) — switcher should be HIDDEN", async ({
    page,
  }) => {
    await page.goto("/?app=team");
    await page.waitForURL(/\/dashboard\/team/, { timeout: 30_000 });
    await page.waitForLoadState("networkidle");

    await expect(switcher(page)).toHaveCount(0);

    await page.screenshot({
      path: "test-results/team-app-switcher-hidden.png",
    });
  });

  test("TC3: Pro app (?app=pro) — switcher should be HIDDEN", async ({
    page,
  }) => {
    await page.goto("/?app=pro");
    await page.waitForURL(/\/dashboard\/pro/, { timeout: 30_000 });
    await page.waitForLoadState("networkidle");

    await expect(switcher(page)).toHaveCount(0);

    await page.screenshot({
      path: "test-results/pro-app-switcher-hidden.png",
    });
  });
});
