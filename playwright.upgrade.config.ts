/**
 * Dedicated Playwright config for the free→team upgrade data-persistence test.
 * Skips the shared global-setup (which logs in as prouser and consumes a
 * rate-limit slot) — this test manages its own auth inside beforeAll.
 */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/free-to-team-upgrade.spec.ts",
  timeout: 120_000,
  retries: 0, // no retries — each retry would rerun beforeAll and consume rate-limit slots
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3002",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    storageState: { cookies: [], origins: [] },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // No globalSetup — this test handles its own auth to avoid consuming
  // rate-limit slots from the shared prouser login in global-setup.ts
});
