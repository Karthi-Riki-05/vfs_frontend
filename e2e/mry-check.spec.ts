import { test } from "@playwright/test";
import fs from "fs";

const SHOTS = "/private/tmp/claude-501/-Users-webronicdesigner-Webronic-Docker-projects-vfs-value-charts/04a77834-7120-4114-932e-01665031ab7f/scratchpad/screenshots";
fs.mkdirSync(SHOTS, { recursive: true });

test("mry login check", async ({ page }) => {
  // login
  await page.goto("http://localhost:3002/login");
  const csrf = await page.evaluate(async () => (await (await fetch("/api/auth/csrf")).json()).csrfToken);
  await page.evaluate(async ({ csrf }) => {
    await fetch("/api/auth/callback/credentials?", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken: csrf, email: "mry@test.com", password: "test1234", json: "true" }).toString(),
    });
  }, { csrf });

  // wait for session
  for (let i = 0; i < 20; i++) {
    const s = await page.evaluate(() => fetch("/api/auth/session").then(r => r.json()));
    if (s?.user?.email) { console.log("SESSION:", JSON.stringify(s.user)); break; }
    await page.waitForTimeout(500);
  }

  await page.goto("http://localhost:3002/dashboard");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${SHOTS}/mry-dashboard.png` });

  await page.goto("http://localhost:3002/dashboard/teams");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SHOTS}/mry-teams.png` });

  await page.goto("http://localhost:3002/dashboard/settings");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${SHOTS}/mry-settings.png` });
});
