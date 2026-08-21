import { defineConfig } from "@playwright/test";

/**
 * Mobile ergonomics gate — runs the SAME spec at four phone widths.
 *
 * Separate from playwright.config.ts on purpose: that config's globalSetup
 * resets the Pro user and deletes flows, which is far too destructive for a
 * read-only layout check. This one only logs in.
 *
 *   npx playwright test -c playwright.ergonomics.config.ts
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: /mobile-ergonomics\.spec\.ts/,
  timeout: 120_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://192.168.0.106:3002",
    headless: true,
    screenshot: "only-on-failure",
    storageState: "./e2e/.auth/ergonomics.json",
  },
  globalSetup: "./e2e/setup/ergonomics-setup.ts",
  // 320 is the floor we support; 360/393 are the common Android widths (the
  // min-w-0 regression only showed below 375); 412 is the Pixel class.
  projects: [320, 360, 393, 412].map((w) => ({
    name: `${w}px`,
    use: { viewport: { width: w, height: 850 }, isMobile: true, hasTouch: true },
  })),
});
