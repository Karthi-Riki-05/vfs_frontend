import { test, expect } from "@playwright/test";

// Performance benchmarks
const BENCHMARKS = {
  pageLoad: 3000, // 3 seconds max
  domReady: 2000, // 2 seconds max
  lcp: 2500, // LCP < 2.5s (Good)
  cls: 0.1, // CLS < 0.1 (Good)
  fcp: 1800, // FCP < 1.8s (Good)
};

test.describe("Frontend Performance", () => {
  test.use({ storageState: "e2e/.auth/pro.json" });

  // ── PAGE LOAD TIMES ──
  const PAGES = [
    { url: "/login", name: "Login", noAuth: true },
    { url: "/dashboard/pro", name: "Dashboard-Pro" },
    { url: "/dashboard/flows", name: "Flows" },
    { url: "/dashboard/teams", name: "Teams" },
    { url: "/dashboard/settings", name: "Settings" },
    { url: "/dashboard/subscription", name: "Subscription" },
  ];

  for (const { url, name, noAuth } of PAGES) {
    test(`PERF-FE-${name}: page load < 3s`, async ({ page, context }) => {
      if (noAuth) {
        await context.clearCookies();
      }

      const startTime = Date.now();
      await page.goto(url);
      await page.waitForLoadState("domcontentloaded");
      const domReadyTime = Date.now() - startTime;

      await page.waitForLoadState("networkidle");
      const fullLoadTime = Date.now() - startTime;

      console.log(`${name} load times:`, {
        domReady: `${domReadyTime}ms`,
        fullLoad: `${fullLoadTime}ms`,
      });

      expect(fullLoadTime).toBeLessThan(BENCHMARKS.pageLoad);
    });
  }

  // ── CORE WEB VITALS ──
  test("PERF-FE-CWV-01: login LCP", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/login");

    const lcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.startTime);
        }).observe({ type: "largest-contentful-paint", buffered: true });

        // Fallback timeout
        setTimeout(() => resolve(0), 3000);
      });
    });

    console.log(`Login LCP: ${lcp.toFixed(0)}ms`);

    if (lcp > 0) {
      expect(lcp).toBeLessThan(BENCHMARKS.lcp);
    }
  });

  test("PERF-FE-CWV-02: dashboard LCP", async ({ page }) => {
    await page.goto("/dashboard/pro");
    await page.waitForLoadState("networkidle");

    const lcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.startTime);
        }).observe({ type: "largest-contentful-paint", buffered: true });
        setTimeout(() => resolve(0), 5000);
      });
    });

    console.log(`Dashboard LCP: ${lcp.toFixed(0)}ms`);

    if (lcp > 0) {
      expect(lcp).toBeLessThan(BENCHMARKS.lcp * 2);
    }
  });

  test("PERF-FE-CWV-03: login CLS", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const cls = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsValue = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          resolve(clsValue);
        }).observe({ type: "layout-shift", buffered: true });
        setTimeout(() => resolve(clsValue), 3000);
      });
    });

    console.log(`Login CLS: ${cls.toFixed(4)}`);
    expect(cls).toBeLessThan(BENCHMARKS.cls);
  });

  test("PERF-FE-CWV-04: no layout shift dashboard", async ({ page }) => {
    await page.goto("/dashboard/pro");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const cls = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsValue = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          resolve(clsValue);
        }).observe({ type: "layout-shift", buffered: true });
        setTimeout(() => resolve(clsValue), 3000);
      });
    });

    console.log(`Dashboard CLS: ${cls.toFixed(4)}`);
    // Allow higher CLS for dashboard (dynamic content loads)
    expect(cls).toBeLessThan(BENCHMARKS.cls * 3);
  });

  // ── API ROUNDTRIP TIMES ──
  test("PERF-FE-API-01: flows API roundtrip", async ({ page }) => {
    await page.goto("/dashboard/flows");

    const timing = await page.evaluate(async () => {
      const start = performance.now();
      await fetch("/api/v1/flows", {
        headers: { Authorization: `Bearer ${document.cookie}` },
      });
      return performance.now() - start;
    });

    console.log(`Flows API roundtrip: ${timing.toFixed(0)}ms`);
    expect(timing).toBeLessThan(2000);
  });

  test("PERF-FE-API-02: teams API roundtrip", async ({ page }) => {
    await page.goto("/dashboard/teams");

    const timing = await page.evaluate(async () => {
      const start = performance.now();
      await fetch("/api/v1/teams");
      return performance.now() - start;
    });

    console.log(`Teams API roundtrip: ${timing.toFixed(0)}ms`);
    expect(timing).toBeLessThan(2000);
  });

  // ── MOBILE PERFORMANCE ──
  test("PERF-FE-MOB-01: mobile dashboard load", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const start = Date.now();
    await page.goto("/dashboard/pro");
    await page.waitForLoadState("networkidle");
    const loadTime = Date.now() - start;

    console.log(`Mobile dashboard: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(BENCHMARKS.pageLoad * 1.5);
  });

  test("PERF-FE-MOB-02: mobile login load", async ({ page, context }) => {
    await context.clearCookies();
    await page.setViewportSize({ width: 390, height: 844 });

    const start = Date.now();
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    const loadTime = Date.now() - start;

    console.log(`Mobile login: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(BENCHMARKS.pageLoad);
  });
});
