import { test, expect } from "@playwright/test";

/**
 * BUG-001 — TC2: a normal (web UA) browser visiting /?app=pro must NOT route
 * into the Pro dashboard. UA is the sole app-type signal; the legacy ?app=
 * param is ignored on web. Uses the shared Pro storageState (authenticated),
 * but runs under a real Desktop Chrome UA (no native ValueChartsMobile token).
 */
test("BUG-001 TC2: web UA + ?app=pro does not route to /dashboard/pro", async ({
  page,
}) => {
  await page.goto("/?app=pro");

  // Let the root-page useEffect run its router.replace().
  await page.waitForLoadState("networkidle");
  await expect
    .poll(() => new URL(page.url()).pathname, { timeout: 15_000 })
    .not.toBe("/dashboard/pro");

  const pathname = new URL(page.url()).pathname;
  // Must have left "/" and must not be the Pro dashboard.
  expect(pathname).not.toBe("/dashboard/pro");
  expect(pathname).not.toBe("/");
  // Should land on the generic/team dashboard per the UA-only contract.
  expect(["/dashboard", "/dashboard/team"]).toContain(pathname);
});
