import { defineConfig, devices } from "@playwright/test";

// Flow-pack E2E suite. Legacy spec in tests/ (pro-purchase.spec.ts) is NOT
// picked up — it targets seed users / port 3000 that don't exist locally.
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 1,
  workers: 1, // tests mutate shared DB state — must run sequentially
  reporter: [["list"]],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3002",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    // Session created once in global-setup — avoids 22 UI logins and the
    // auth rate limiter.
    storageState: "./e2e/.auth/pro.json",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  globalSetup: "./e2e/setup/global-setup.ts",
  globalTeardown: "./e2e/setup/global-teardown.ts",
});
