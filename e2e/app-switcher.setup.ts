import { test as setup, expect } from "@playwright/test";

// One-time login for the app-switcher suite. Logging in per-test trips the
// auth rate limiter (10 / 15min), so we authenticate ONCE here via the NextAuth
// CSRF endpoint (the React client signIn() path is broken locally) and persist
// the session; every spec test then reuses this storageState — zero extra
// logins, zero rate-limit flakes.
const TEST_USER = { email: "prouser@valueflowtest.com", password: "Test@1234" };
const STATE = "./e2e/.auth/pro.json";

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
  const sess = await page.evaluate(() =>
    fetch("/api/auth/session").then((r) => r.json()),
  );
  expect(sess?.user?.email).toBe(TEST_USER.email);
  await page.context().storageState({ path: STATE });
});
