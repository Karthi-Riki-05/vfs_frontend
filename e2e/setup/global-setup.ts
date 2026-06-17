import { chromium } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import {
  resetProUser,
  deleteTestFlows,
  PRO_USER_EMAIL,
  PRO_USER_PASSWORD,
} from "../helpers/db";

export const STORAGE_STATE = path.resolve(__dirname, "..", ".auth", "pro.json");

async function globalSetup() {
  console.log("[E2E setup] Resetting Pro test user + deleting [E2E] flows...");
  resetProUser();
  deleteTestFlows();

  // Login ONCE and persist the session — per-test UI logins are slow and
  // trip the auth rate limiter.
  //
  // The client signIn() credentials flow does not complete locally (it
  // bounces back to /login?callbackUrl=...). We instead drive NextAuth's
  // credentials provider directly over its HTTP API: fetch the CSRF token,
  // then POST to /api/auth/callback/credentials. context.request shares its
  // cookie jar with the browser context, so the resulting
  // next-auth.session-token lands in the saved storageState.
  console.log("[E2E setup] Logging in once (API) for storageState...");
  fs.mkdirSync(path.dirname(STORAGE_STATE), { recursive: true });
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3002";
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });

  const csrfRes = await context.request.get(`${baseURL}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  await context.request.post(`${baseURL}/api/auth/callback/credentials`, {
    form: {
      csrfToken,
      email: PRO_USER_EMAIL,
      password: PRO_USER_PASSWORD,
      json: "true",
      callbackUrl: baseURL,
    },
  });

  // Sanity check: the session endpoint should now return the Pro user.
  const sessionRes = await context.request.get(`${baseURL}/api/auth/session`);
  const session = await sessionRes.json();
  if (!session?.user) {
    await browser.close();
    throw new Error(
      `[E2E setup] Login did not establish a session: ${JSON.stringify(session)}`,
    );
  }

  await context.storageState({ path: STORAGE_STATE });
  await browser.close();
  console.log(`[E2E setup] Done (session for ${session.user.email}).`);
}

export default globalSetup;
