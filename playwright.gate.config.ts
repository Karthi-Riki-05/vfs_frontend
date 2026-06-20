import { defineConfig, devices } from "@playwright/test";

// Dedicated config for the Web Upgrade Gate spec. Like the switcher config, it
// intentionally does NOT use the shared global-setup / storageState (the client
// signIn() CSRF path is broken in the local env) — the spec logs in via the
// NextAuth CSRF endpoint itself. See web-upgrade-gate.spec.ts.
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
  },

  projects: [
    // Logs in ONCE and saves storageState — keeps the suite under the backend
    // auth rate limiter (10 / 15 min).
    {
      name: "setup",
      testMatch: "gate.setup.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Desktop Chrome — a plain web browser, NOT the Flutter WebView. No
      // ?app= param and no vc_device_mode=mobile marker is set by the harness.
      name: "chromium",
      testMatch: "web-upgrade-gate.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/gate.json",
      },
      dependencies: ["setup"],
    },
  ],
});
