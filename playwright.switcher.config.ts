import { defineConfig, devices } from "@playwright/test";

// Dedicated config for the app-switcher visibility spec. It intentionally does
// NOT use the shared global-setup / storageState (the client signIn() CSRF path
// is broken in the local env), nor a baseline storageState — each test logs in
// via the NextAuth CSRF endpoint itself. See app-switcher-visibility.spec.ts.
export default defineConfig({
  testDir: "./e2e",
  testMatch: "app-switcher-visibility.spec.ts",
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3002",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
