import { test as setup, expect } from "@playwright/test";

/**
 * Single login for the Web Upgrade Gate suite. Runs once (Playwright "setup"
 * project) and persists the NextAuth session to storageState, which the gate
 * spec reuses. This keeps the suite under the backend auth rate limiter
 * (10 / 15 min) — per-test logins blow that budget fast. See web-upgrade-gate.spec.ts.
 *
 * Auth uses the NextAuth CSRF endpoint directly (the React client signIn() path
 * is broken locally — mismatched CSRF token, rejected with ?csrf=true).
 */
const TEST_USER = {
  email: "mry@test.com",
  password: "test1234",
};

const authFile = "e2e/.auth/gate.json";

setup("authenticate", async ({ page }) => {
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

  // Poll generously — on a cold dev server the NextAuth route compiles on first
  // hit, so the session cookie can lag the callback by several seconds.
  let email: string | undefined;
  for (let i = 0; i < 40; i++) {
    const sess = await page.evaluate(() =>
      fetch("/api/auth/session").then((r) => r.json()),
    );
    email = sess?.user?.email;
    if (email) break;
    await page.waitForTimeout(500);
  }
  expect(email).toBe(TEST_USER.email);

  await page.context().storageState({ path: authFile });
});
