import { test } from "@playwright/test";
import path from "path";

const AUTH_FILE = path.join(__dirname, ".auth/pro.json");

test.use({ storageState: AUTH_FILE });

test("support mobile viewport only", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:3002/dashboard/support");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  // viewport only — no fullPage — shows exactly what the user sees
  await page.screenshot({
    path: "/private/tmp/claude-501/-Users-webronicdesigner-Webronic-Docker-projects-vfs-value-charts/8734ee73-79a2-46fa-a70c-a8a4e3e00387/scratchpad/support-mobile-viewport.png",
    fullPage: false,
  });
});

test("support mobile scrolled mid", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:3002/dashboard/support");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(300);
  await page.screenshot({
    path: "/private/tmp/claude-501/-Users-webronicdesigner-Webronic-Docker-projects-vfs-value-charts/8734ee73-79a2-46fa-a70c-a8a4e3e00387/scratchpad/support-mobile-scrolled.png",
    fullPage: false,
  });
});

test("support mobile bottom", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:3002/dashboard/support");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  await page.screenshot({
    path: "/private/tmp/claude-501/-Users-webronicdesigner-Webronic-Docker-projects-vfs-value-charts/8734ee73-79a2-46fa-a70c-a8a4e3e00387/scratchpad/support-mobile-bottom.png",
    fullPage: false,
  });
});
