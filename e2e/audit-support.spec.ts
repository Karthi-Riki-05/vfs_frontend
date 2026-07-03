import { test } from "@playwright/test";
import path from "path";

const AUTH_FILE = path.join(__dirname, ".auth/pro.json");

test.use({ storageState: AUTH_FILE });

test("support page desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://localhost:3002/dashboard/support");
  await page.waitForSelector("h1", { timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: "/private/tmp/claude-501/-Users-webronicdesigner-Webronic-Docker-projects-vfs-value-charts/8734ee73-79a2-46fa-a70c-a8a4e3e00387/scratchpad/support-desktop.png",
    fullPage: true,
  });
});

test("support page mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:3002/dashboard/support");
  await page.waitForSelector("h1", { timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: "/private/tmp/claude-501/-Users-webronicdesigner-Webronic-Docker-projects-vfs-value-charts/8734ee73-79a2-46fa-a70c-a8a4e3e00387/scratchpad/support-mobile.png",
    fullPage: true,
  });
});

test("team page desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://localhost:3002/dashboard/team");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: "/private/tmp/claude-501/-Users-webronicdesigner-Webronic-Docker-projects-vfs-value-charts/8734ee73-79a2-46fa-a70c-a8a4e3e00387/scratchpad/team-desktop.png",
    fullPage: true,
  });
});

test("team page mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:3002/dashboard/team");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: "/private/tmp/claude-501/-Users-webronicdesigner-Webronic-Docker-projects-vfs-value-charts/8734ee73-79a2-46fa-a70c-a8a4e3e00387/scratchpad/team-mobile.png",
    fullPage: true,
  });
});

test("support search and button interaction", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://localhost:3002/dashboard/support");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  // Test search input
  const searchInput = page.locator(
    'input[placeholder="Search for help articles..."]',
  );
  const searchVisible = await searchInput.isVisible();
  console.log("Search input visible:", searchVisible);

  if (searchVisible) {
    await searchInput.fill("getting started");
    await page.waitForTimeout(500);
    await page.screenshot({
      path: "/private/tmp/claude-501/-Users-webronicdesigner-Webronic-Docker-projects-vfs-value-charts/8734ee73-79a2-46fa-a70c-a8a4e3e00387/scratchpad/support-search-filled.png",
    });

    // Try clicking search button
    const searchBtn = page.locator('button:has-text("Search")');
    const btnVisible = await searchBtn.isVisible();
    console.log("Search button visible:", btnVisible);
    if (btnVisible) {
      await searchBtn.click();
      await page.waitForTimeout(500);
    }
  }

  // Check help card links are clickable
  const cards = page.locator("a[href]");
  const count = await cards.count();
  console.log("Clickable card links count:", count);

  // Hover first card to check hover effect
  if (count > 0) {
    await cards.first().hover();
    await page.waitForTimeout(300);
    await page.screenshot({
      path: "/private/tmp/claude-501/-Users-webronicdesigner-Webronic-Docker-projects-vfs-value-charts/8734ee73-79a2-46fa-a70c-a8a4e3e00387/scratchpad/support-card-hover.png",
    });
  }
});
