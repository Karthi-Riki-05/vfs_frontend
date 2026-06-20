import { defineConfig, devices } from "@playwright/test";

// Dedicated config for the app-switcher parity spec. Reuses the shared Pro
// session in ./e2e/.auth/pro.json (kept fresh by the main suite's global-setup)
// so the spec performs ZERO logins — per-test logins trip the auth rate limiter
// (10 / 15min) and the client signIn() CSRF path is broken locally. Desktop +
// mobile viewports are driven by test.use() inside the spec.
//
// If pro.json is ever stale, refresh it once with:
//   npx playwright test --config=playwright.app-switcher.config.ts \
//     --project=setup        # logs in & rewrites pro.json (rate-limit window permitting)
//
//   npx playwright test --config=playwright.app-switcher.config.ts
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3002",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    storageState: "./e2e/.auth/pro.json",
  },

  projects: [
    {
      name: "setup",
      testMatch: "app-switcher.setup.ts",
      use: { storageState: undefined },
    },
    {
      name: "chromium",
      testMatch: "app-switcher.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
