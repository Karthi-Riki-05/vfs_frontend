import { chromium } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

/**
 * Login-only setup for the ergonomics gate. Deliberately does NOT touch the
 * database — this suite only reads layout.
 *
 * Uses NextAuth's HTTP API rather than the UI form: the client signIn() flow
 * does not complete locally (it bounces back to /login?callbackUrl=...), and
 * per-test UI logins trip the 10-per-15-min auth rate limiter.
 */
const STORAGE = path.resolve(__dirname, "..", ".auth", "ergonomics.json");

export default async function globalSetup() {
  const baseURL =
    process.env.PLAYWRIGHT_BASE_URL || "http://192.168.0.106:3002";
  const email = process.env.ERGO_EMAIL || "test123@gmail.com";
  const password = process.env.ERGO_PASSWORD || "test1234";

  fs.mkdirSync(path.dirname(STORAGE), { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });

  const csrfRes = await context.request.get(`${baseURL}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  await context.request.post(`${baseURL}/api/auth/callback/credentials`, {
    form: { csrfToken, email, password, callbackUrl: `${baseURL}/dashboard`, json: "true" },
  });

  // Assert the session actually stuck — a silent 200 that redirects back to
  // /login would otherwise make every test "pass" against the login page.
  const page = await context.newPage();
  await page.goto(`${baseURL}/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);
  if (/\/login/.test(page.url())) {
    throw new Error(
      `[ergonomics setup] login failed for ${email} — landed on ${page.url()}. ` +
        `Check NEXTAUTH_URL matches PLAYWRIGHT_BASE_URL.`,
    );
  }

  await context.storageState({ path: STORAGE });
  await browser.close();
  console.log(`[ergonomics setup] session saved for ${email}`);
}
