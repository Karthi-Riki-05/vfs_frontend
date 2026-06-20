import { test, expect, Page } from "@playwright/test";
import { execSync } from "node:child_process";

/**
 * Web Upgrade Gate — a free web user must NOT be able to enter the Pro app.
 *
 * STRICT BUSINESS RULE (2026-06-18). An unentitled web user trying to reach the
 * Pro app is HARD-REDIRECTED to the $5 Pro upgrade page — they never see or
 * enter the Pro shell. Two layers enforce this:
 *
 *   CLIENT (this suite's focus):
 *   1. The website Pro switcher (Sidebar.tsx `switchToApp`) navigates to
 *      /dashboard/pro, and the /?app=pro deep-link redirects there too.
 *   2. ProGuard, for a non-WebView visitor with no Pro entitlement, performs a
 *      hard `window.location.href = '/upgrade-pro'` redirect and blocks render
 *      of the Pro shell (ProGuard.tsx). It auto-grants ONLY inside the genuine
 *      Flutter WebView (isProWebView()); vc_device_mode is no longer trusted,
 *      so the /?app=pro hack can no longer self-grant Pro.
 *
 *   SERVER (defense-in-depth, GATE-04):
 *   3. `enforceProContext` rejects any request claiming `X-App-Context: pro`
 *      from a non-entitled user with 403 / UPGRADE_REQUIRED.
 *   4. `/pro/grant-from-mobile` is guarded by `mobileAppOnly`.
 *
 * GATE-02 and GATE-03 assert the redirect to /upgrade-pro AND that Pro is never
 * granted. GATE-04 asserts the server-side boundary.
 *
 * Auth: a single login runs in gate.setup.ts and is reused via storageState
 * (keeps the suite under the backend auth rate limiter, 10 / 15 min). Run with
 * the dedicated config that skips the shared (broken) global-setup:
 *
 *   npx playwright test --config=playwright.gate.config.ts
 */

// mry@test.com is a FREE account (DB: has_pro=f, pro_purchased_at=NULL) despite
// the "Team+Pro" label in CLAUDE.md — so it is correctly subject to the gate.
const TEST_USER = {
  email: "mry@test.com",
  password: "test1234",
};

// The /?app=pro hack can grant Pro to this shared user (the bug under test), so
// every test starts and ends by resetting the account to a free state. Runs
// against the local Docker `db` service; best-effort (warns, never throws) so a
// non-Docker runner still executes the assertions.
function resetUserToFree(email: string) {
  try {
    execSync(
      `docker compose exec -T db psql -U admin -d value_charts_db ` +
        `-c "UPDATE users SET has_pro=false, pro_purchased_at=NULL, ` +
        `last_active_pro_team_id=NULL WHERE email='${email}' AND has_pro=true;"`,
      { cwd: "..", stdio: "pipe" },
    );
  } catch (e: any) {
    console.warn(
      `[web-upgrade-gate] could not reset ${email} to free (manual cleanup may be needed):`,
      e?.message,
    );
  }
}

// Reads the live Pro entitlement from the same endpoint the app uses.
async function getHasPro(page: Page): Promise<boolean> {
  return page.evaluate(async () => {
    const r = await fetch("/api/pro/app-status");
    const j = await r.json();
    const data = j?.data ?? j;
    return Boolean(data?.hasPro);
  });
}

const switcher = (page: Page) => page.getByTestId("app-switcher");

test.describe("Web Upgrade Gate (free web user → Pro)", () => {
  test.beforeEach(async () => {
    // Guarantee a clean free account before each test (auth comes from the
    // shared storageState). The /?app=pro hack under test can grant Pro, so a
    // prior test must never leak entitlement into the next one.
    resetUserToFree(TEST_USER.email);
  });

  test.afterAll(() => {
    resetUserToFree(TEST_USER.email);
  });

  test("GATE-01: free web user lands on the default (team/free) dashboard with the app switcher visible", async ({
    page,
  }) => {
    // Default landing, no ?app= param → the team/free dashboard. (Navigate
    // directly rather than via the "/" client-side router.replace redirect,
    // which is flaky to wait on while a cold dev server compiles routes.)
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    expect(page.url()).not.toContain("?app=");
    expect(page.url()).not.toContain("/dashboard/pro");

    // The cross-app switcher is shown only on the website (web context).
    await expect(switcher(page)).toBeVisible({ timeout: 30_000 });
    await expect(switcher(page).getByText("Value Charts")).toBeVisible();
    await expect(switcher(page).getByText("PRO", { exact: true })).toBeVisible();

    // Free account — not entitled to Pro.
    expect(await getHasPro(page)).toBe(false);

    await page.screenshot({ path: "test-results/gate-01-team-dashboard.png" });
  });

  test("GATE-02: clicking the Pro switcher hard-redirects an unentitled web user to /upgrade-pro and does NOT grant Pro", async ({
    page,
  }) => {
    await page.goto("/dashboard/team");
    await page.waitForLoadState("networkidle");
    await expect(switcher(page)).toBeVisible();

    // Click the PRO entry. The onClick lives on the parent row; clicking the
    // badge bubbles to it. The handler does window.location.href='/dashboard/pro',
    // where ProGuard detects an unentitled web visitor and bounces to the
    // upgrade page.
    await switcher(page).getByText("PRO", { exact: true }).click();

    // STRICT RULE: the user is hard-redirected to the $5 Pro upgrade page and
    // never lands inside the Pro app. (Don't wait for networkidle — the upgrade
    // page fetches live pricing/status; wait for its purchase CTA instead.)
    await page.waitForURL(/\/upgrade-pro/, { timeout: 30_000 });
    await expect(
      page.getByRole("button", { name: /Purchase Pro/i }),
    ).toBeVisible({ timeout: 30_000 });

    expect(page.url()).toMatch(/\/upgrade-pro/);
    expect(page.url()).not.toContain("/dashboard/pro");

    // The Pro shell is never shown — only the upgrade page.
    await expect(page.getByText(/Good morning/i)).toHaveCount(0);

    // ...and the user is NEVER granted Pro.
    expect(await getHasPro(page)).toBe(false);

    await page.screenshot({
      path: "test-results/gate-02-upgrade-redirect.png",
    });
  });

  test("GATE-03: URL hack /?app=pro hard-redirects to /upgrade-pro and must NOT grant Pro", async ({
    page,
  }) => {
    // Direct deep-link with ?app=pro — the classic 'just append the param' hack.
    // It redirects to /dashboard/pro, where ProGuard detects a non-WebView
    // visitor with no entitlement and bounces to the upgrade page. (ProGuard no
    // longer trusts vc_device_mode, so the hack can no longer self-grant Pro.)
    await page.goto("/?app=pro");

    // STRICT RULE: the hack lands on the $5 Pro upgrade page, never inside Pro.
    // (Don't wait for networkidle — the upgrade page fetches live pricing/status;
    // wait for its purchase CTA instead.)
    await page.waitForURL(/\/upgrade-pro/, { timeout: 30_000 });
    await expect(
      page.getByRole("button", { name: /Purchase Pro/i }),
    ).toBeVisible({ timeout: 30_000 });

    expect(page.url()).toMatch(/\/upgrade-pro/);
    expect(page.url()).not.toContain("/dashboard/pro");

    // The Pro shell is never shown — only the upgrade page.
    await expect(page.getByText(/Good morning/i)).toHaveCount(0);

    // THE INVARIANT: a free web session must never become Pro-entitled.
    expect(await getHasPro(page)).toBe(false);

    await page.screenshot({ path: "test-results/gate-03-url-hack.png" });
  });

  test("GATE-04: server-side gate — Pro-scoped API returns 403 UPGRADE_REQUIRED with X-App-Context: pro", async ({
    page,
  }) => {
    await page.goto("/dashboard/team");
    await page.waitForLoadState("networkidle");

    // Baseline: the default (team/free) context is served normally.
    const teamCtx = await page.evaluate(async () => {
      const r = await fetch("/api/flows");
      return { status: r.status };
    });
    expect(teamCtx.status).toBe(200);

    // The authoritative boundary: claiming the Pro context as a non-entitled
    // user is rejected — Pro data never loads, no matter the client-side state.
    const proCtx = await page.evaluate(async () => {
      const r = await fetch("/api/flows", {
        headers: { "X-App-Context": "pro" },
      });
      let body: any = null;
      try {
        body = await r.json();
      } catch {
        /* non-JSON */
      }
      return { status: r.status, code: body?.error?.code ?? null };
    });
    expect(proCtx.status).toBe(403);
    expect(proCtx.code).toBe("UPGRADE_REQUIRED");
  });
});
