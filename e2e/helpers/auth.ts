import { Page, APIRequestContext } from "@playwright/test";
import { TEST_USERS } from "./test-users";

const PRO_USER_EMAIL = TEST_USERS.PRO.email;
const PRO_USER_PASSWORD = TEST_USERS.PRO.password;

const BACKEND_URL =
  process.env.PLAYWRIGHT_BACKEND_URL || "http://localhost:5002";

/** UI login as the Pro test user via the credentials form. */
export async function loginAsProUser(page: Page): Promise<void> {
  await page.goto("/login");
  await page.fill('input[type="email"]', PRO_USER_EMAIL);
  await page.fill(
    'input[placeholder="Enter your password"]',
    PRO_USER_PASSWORD,
  );
  await page
    .locator(
      'button[type="submit"], button:has-text("Sign In"), button:has-text("Login")',
    )
    .first()
    .click();
  await page.waitForURL(/\/dashboard/, { timeout: 25_000 });
}

/** Bearer token for direct backend API calls (Express, port 5002).
 *  Cached per worker — the auth limiter allows only 10 logins / 15 min. */
let cachedToken: string | null = null;

export async function backendToken(
  request: APIRequestContext,
): Promise<string> {
  if (cachedToken) return cachedToken;
  const res = await request.post(`${BACKEND_URL}/api/v1/auth/validate`, {
    data: { email: PRO_USER_EMAIL, password: PRO_USER_PASSWORD },
  });
  const body = await res.json();
  const token = body?.data?.token;
  if (!token) throw new Error(`Login failed: ${JSON.stringify(body)}`);
  cachedToken = token;
  return token;
}

export { BACKEND_URL };
