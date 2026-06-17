import { test, expect, Page } from "@playwright/test";

// Visual snapshots do real page loads + settle waits + masked full-page
// screenshots, so the 60s default is tight for heavy dashboard pages. Bump to
// 120s — scoped to this file only (other specs keep the default).
test.describe.configure({ timeout: 120_000 });

// ── Shared mask helper ──
// These regions change every render
// Always mask them for stable snapshots

const DYNAMIC_MASKS = (page: Page) => [
  // Timestamps + time-ago text
  page.locator("text=/\\d+\\s*(min|hour|day|week|month|sec)/i"),
  page.locator("text=/just now|recently/i"),
  page.locator('[class*="time"],[class*="Time"]'),
  page.locator('[class*="ago"],[class*="Ago"]'),
  page.locator('[class*="date"],[class*="Date"]'),

  // Charts + graphs (bar heights change)
  page.locator('[class*="chart"],[class*="Chart"]'),
  page.locator('[class*="bar"],[class*="Bar"]'),
  page.locator("canvas"),
  page.locator('svg[class*="chart"]'),

  // Greeting (changes by time of day)
  page.locator('[class*="greeting"],[class*="Greeting"]'),
  page.locator("text=/good morning|good afternoon|good evening/i"),

  // Dynamic counts (change with data)
  page.locator('[class*="credit"],[class*="Credit"]'),
  page.locator('[class*="badge"],[class*="Badge"]'),
  page.locator('[class*="count"],[class*="Count"]'),
  page.locator('[class*="unread"],[class*="Unread"]'),

  // Skeleton loaders
  page.locator('[class*="skeleton"],[class*="Skeleton"]'),
  page.locator('[class*="loading"],[class*="Loading"]'),

  // Online presence indicators
  page.locator('[class*="online"],[class*="presence"]'),
  page.locator('[class*="dot"][class*="green"]'),
];

const CHAT_MASKS = (page: Page) => [
  ...DYNAMIC_MASKS(page),
  // Chat message content
  page.locator('[class*="message"],[class*="Message"]'),
  page.locator('[class*="bubble"],[class*="Bubble"]'),
  page.locator('[class*="chat-content"]'),
  // Message timestamps
  page.locator('[class*="msg-time"]'),
];

const AI_MASKS = (page: Page) => [
  ...DYNAMIC_MASKS(page),
  // AI response content
  page.locator('[class*="response"],[class*="Response"]'),
  page.locator('[class*="message"],[class*="Message"]'),
  page.locator('[class*="bubble"],[class*="Bubble"]'),
  // Streaming indicator
  page.locator('[class*="stream"],[class*="typing"]'),
  // Recent history (changes)
  page.locator('[class*="history"],[class*="History"]'),
  page.locator('[class*="conversation"]'),
];

const SCREENSHOT_OPTIONS = (page: Page, masks = DYNAMIC_MASKS(page)) => ({
  maxDiffPixels: 300,
  animations: "disabled" as const,
  mask: masks,
});

// ── Helper: wait until page geometry stops changing ──
// The key flake source: the capture fires while the page is still transitioning
// between two distinct full-page states — the "Loading your workspace…" splash
// → real content, or the auth pages' mobile-first layout → desktop two-column
// layout. A one-shot `waitFor({state:"hidden"})` on the splash races (it
// resolves instantly when the splash element hasn't rendered *yet*). Instead we
// poll a geometry signature (scroll size + DOM node count) and only proceed
// once it has been unchanged for several consecutive samples — which naturally
// rides through splash→content and the layout swap.
async function waitForGeometryStable(page: Page) {
  let last: string | null = null;
  let stable = 0;
  for (let i = 0; i < 30; i++) {
    // ~12s ceiling (30 × 400ms)
    const sig = await page
      .evaluate(
        () =>
          `${document.documentElement.scrollHeight}x${document.body.scrollWidth}:` +
          `${document.querySelectorAll("*").length}`,
      )
      .catch(() => "");
    if (sig && sig === last) {
      if (++stable >= 3) return; // unchanged for ~1.2s → settled
    } else {
      stable = 0;
      last = sig;
    }
    await page.waitForTimeout(400);
  }
}

// ── Helper: wait for page stable ──
async function waitForStable(page: Page) {
  // Cap networkidle — chat and other realtime pages keep a Socket.IO/polling
  // connection open, so networkidle never fires and would otherwise eat the
  // whole test budget. Swallow the timeout and continue.
  await page.waitForLoadState("networkidle", { timeout: 6000 }).catch(() => {});

  // Wait for the page geometry to settle (splash→content, mobile→desktop swap).
  await waitForGeometryStable(page);

  // Final guard: if a loading splash is still on screen after geometry settled
  // (checked now, so the element definitely exists if present), wait it out.
  await page
    .locator("text=/loading your workspace/i")
    .waitFor({ state: "hidden", timeout: 8000 })
    .catch(() => {});

  // Web fonts settled — prevents fallback-font reflow diffs.
  await page.evaluate(() => (document as any).fonts?.ready).catch(() => {});

  // Settle entrance animations.
  await page.waitForTimeout(1000);

  // Wait for two animation frames so any in-flight transitions complete.
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
}

// ── DESKTOP SNAPSHOTS (1440×900) ──
test.describe("Visual — Desktop (1440×900)", () => {
  test.use({
    storageState: "e2e/.auth/pro.json",
    viewport: { width: 1440, height: 900 },
  });

  // ── AUTH (no auth needed) ──
  test("VIS-D-LOGIN: login page desktop", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/login");
    await waitForStable(page);

    await expect(page).toHaveScreenshot(
      "login-desktop.png",
      SCREENSHOT_OPTIONS(page),
    );
  });

  test("VIS-D-REGISTER: register page desktop", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/register");
    await waitForStable(page);

    await expect(page).toHaveScreenshot(
      "register-desktop.png",
      SCREENSHOT_OPTIONS(page),
    );
  });

  // ── DASHBOARD ──
  test("VIS-D-DASH-PRO: dashboard pro desktop", async ({ page }) => {
    await page.goto("/dashboard/pro");
    await waitForStable(page);

    await expect(page).toHaveScreenshot(
      "dashboard-pro-desktop.png",
      SCREENSHOT_OPTIONS(page),
    );
  });

  test("VIS-D-DASH-TEAM: dashboard team desktop", async ({ page }) => {
    await page.goto("/dashboard/team");
    await waitForStable(page);

    await expect(page).toHaveScreenshot(
      "dashboard-team-desktop.png",
      SCREENSHOT_OPTIONS(page),
    );
  });

  // ── FLOWS + CONTENT ──
  test("VIS-D-FLOWS: flows page desktop", async ({ page }) => {
    await page.goto("/dashboard/flows");
    await waitForStable(page);

    await expect(page).toHaveScreenshot(
      "flows-desktop.png",
      SCREENSHOT_OPTIONS(page),
    );
  });

  test("VIS-D-RECENTS: recents page desktop", async ({ page }) => {
    await page.goto("/dashboard/recents");
    await waitForStable(page);

    await expect(page).toHaveScreenshot(
      "recents-desktop.png",
      SCREENSHOT_OPTIONS(page),
    );
  });

  test("VIS-D-SHAPES: shapes page desktop", async ({ page }) => {
    await page.goto("/dashboard/shapes");
    await waitForStable(page);

    await expect(page).toHaveScreenshot(
      "shapes-desktop.png",
      SCREENSHOT_OPTIONS(page),
    );
  });

  test("VIS-D-PROJECTS: projects page desktop", async ({ page }) => {
    await page.goto("/dashboard/projects");
    await waitForStable(page);

    await expect(page).toHaveScreenshot(
      "projects-desktop.png",
      SCREENSHOT_OPTIONS(page),
    );
  });

  test("VIS-D-TRASH: trash page desktop", async ({ page }) => {
    await page.goto("/dashboard/trash");
    await waitForStable(page);

    await expect(page).toHaveScreenshot(
      "trash-desktop.png",
      SCREENSHOT_OPTIONS(page),
    );
  });

  test("VIS-D-FAVS: favourites page desktop", async ({ page }) => {
    await page.goto("/dashboard/favourites");
    await waitForStable(page);

    await expect(page).toHaveScreenshot(
      "favourites-desktop.png",
      SCREENSHOT_OPTIONS(page),
    );
  });

  // ── TEAMS + CHAT ──
  test("VIS-D-TEAMS: teams page desktop", async ({ page }) => {
    await page.goto("/dashboard/teams");
    await waitForStable(page);

    await expect(page).toHaveScreenshot(
      "teams-desktop.png",
      SCREENSHOT_OPTIONS(page),
    );
  });

  test("VIS-D-CHAT: chat page desktop", async ({ page }) => {
    await page.goto("/dashboard/chat");
    await waitForStable(page);

    await expect(page).toHaveScreenshot(
      "chat-desktop.png",
      SCREENSHOT_OPTIONS(page, CHAT_MASKS(page)),
    );
  });

  // ── ACCOUNT ──
  test("VIS-D-SETTINGS: settings page desktop", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await waitForStable(page);

    await expect(page).toHaveScreenshot(
      "settings-desktop.png",
      SCREENSHOT_OPTIONS(page),
    );
  });

  test("VIS-D-SUB: subscription page desktop", async ({ page }) => {
    await page.goto("/dashboard/subscription");
    await waitForStable(page);

    await expect(page).toHaveScreenshot(
      "subscription-desktop.png",
      SCREENSHOT_OPTIONS(page),
    );
  });

  test("VIS-D-BILLING: billing page desktop", async ({ page }) => {
    await page.goto("/dashboard/settings/billing");
    await waitForStable(page);

    await expect(page).toHaveScreenshot(
      "billing-desktop.png",
      SCREENSHOT_OPTIONS(page),
    );
  });

  test("VIS-D-NOTIF: notifications desktop", async ({ page }) => {
    await page.goto("/dashboard/notifications");
    await waitForStable(page);

    await expect(page).toHaveScreenshot(
      "notifications-desktop.png",
      SCREENSHOT_OPTIONS(page),
    );
  });

  // ── AI PANEL ──
  test("VIS-D-AI: AI panel desktop", async ({ page }) => {
    await page.goto("/dashboard/pro");
    await waitForStable(page);

    // Open AI panel
    const aiBtn = page
      .locator(
        'button[class*="ai"], ' +
          'button:has-text("✦"), ' +
          '[aria-label*="AI" i]',
      )
      .first();

    if ((await aiBtn.count()) > 0) {
      await aiBtn.click();
      await page.waitForTimeout(1000);
    }

    await expect(page).toHaveScreenshot(
      "ai-panel-desktop.png",
      SCREENSHOT_OPTIONS(page, AI_MASKS(page)),
    );
  });
});

// ── MOBILE SNAPSHOTS (390×844) ──
test.describe("Visual — Mobile (390×844)", () => {
  test.use({
    storageState: "e2e/.auth/pro.json",
    viewport: { width: 390, height: 844 },
  });

  // ── AUTH ──
  test("VIS-M-LOGIN: login page mobile", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/login");
    await waitForStable(page);

    await expect(page).toHaveScreenshot(
      "login-mobile.png",
      SCREENSHOT_OPTIONS(page),
    );
  });

  test("VIS-M-REGISTER: register page mobile", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/register");
    await waitForStable(page);

    await expect(page).toHaveScreenshot(
      "register-mobile.png",
      SCREENSHOT_OPTIONS(page),
    );
  });

  // ── DASHBOARD ──
  test("VIS-M-DASH-PRO: dashboard pro mobile", async ({ page }) => {
    await page.goto("/dashboard/pro");
    await waitForStable(page);

    await expect(page).toHaveScreenshot(
      "dashboard-pro-mobile.png",
      SCREENSHOT_OPTIONS(page),
    );
  });

  test("VIS-M-DASH-TEAM: dashboard team mobile", async ({ page }) => {
    await page.goto("/dashboard/team");
    await waitForStable(page);

    await expect(page).toHaveScreenshot(
      "dashboard-team-mobile.png",
      SCREENSHOT_OPTIONS(page),
    );
  });

  // ── FLOWS + CONTENT ──
  test("VIS-M-FLOWS: flows page mobile", async ({ page }) => {
    await page.goto("/dashboard/flows");
    await waitForStable(page);

    await expect(page).toHaveScreenshot(
      "flows-mobile.png",
      SCREENSHOT_OPTIONS(page),
    );
  });

  test("VIS-M-RECENTS: recents page mobile", async ({ page }) => {
    await page.goto("/dashboard/recents");
    await waitForStable(page);

    await expect(page).toHaveScreenshot(
      "recents-mobile.png",
      SCREENSHOT_OPTIONS(page),
    );
  });

  test("VIS-M-SHAPES: shapes page mobile", async ({ page }) => {
    await page.goto("/dashboard/shapes");
    await waitForStable(page);

    await expect(page).toHaveScreenshot(
      "shapes-mobile.png",
      SCREENSHOT_OPTIONS(page),
    );
  });

  test("VIS-M-PROJECTS: projects mobile", async ({ page }) => {
    await page.goto("/dashboard/projects");
    await waitForStable(page);

    await expect(page).toHaveScreenshot(
      "projects-mobile.png",
      SCREENSHOT_OPTIONS(page),
    );
  });

  test("VIS-M-TRASH: trash page mobile", async ({ page }) => {
    await page.goto("/dashboard/trash");
    await waitForStable(page);

    await expect(page).toHaveScreenshot(
      "trash-mobile.png",
      SCREENSHOT_OPTIONS(page),
    );
  });

  test("VIS-M-FAVS: favourites mobile", async ({ page }) => {
    await page.goto("/dashboard/favourites");
    await waitForStable(page);

    await expect(page).toHaveScreenshot(
      "favourites-mobile.png",
      SCREENSHOT_OPTIONS(page),
    );
  });

  // ── TEAMS + CHAT ──
  test("VIS-M-TEAMS: teams page mobile", async ({ page }) => {
    await page.goto("/dashboard/teams");
    await waitForStable(page);

    await expect(page).toHaveScreenshot(
      "teams-mobile.png",
      SCREENSHOT_OPTIONS(page),
    );
  });

  test("VIS-M-CHAT: chat page mobile", async ({ page }) => {
    await page.goto("/dashboard/chat");
    await waitForStable(page);

    await expect(page).toHaveScreenshot(
      "chat-mobile.png",
      SCREENSHOT_OPTIONS(page, CHAT_MASKS(page)),
    );
  });

  // ── ACCOUNT ──
  test("VIS-M-SETTINGS: settings mobile", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await waitForStable(page);

    await expect(page).toHaveScreenshot(
      "settings-mobile.png",
      SCREENSHOT_OPTIONS(page),
    );
  });

  test("VIS-M-SUB: subscription mobile", async ({ page }) => {
    await page.goto("/dashboard/subscription");
    await waitForStable(page);

    await expect(page).toHaveScreenshot(
      "subscription-mobile.png",
      SCREENSHOT_OPTIONS(page),
    );
  });

  test("VIS-M-BILLING: billing mobile", async ({ page }) => {
    await page.goto("/dashboard/settings/billing");
    await waitForStable(page);

    await expect(page).toHaveScreenshot(
      "billing-mobile.png",
      SCREENSHOT_OPTIONS(page),
    );
  });

  test("VIS-M-NOTIF: notifications mobile", async ({ page }) => {
    await page.goto("/dashboard/notifications");
    await waitForStable(page);

    await expect(page).toHaveScreenshot(
      "notifications-mobile.png",
      SCREENSHOT_OPTIONS(page),
    );
  });

  // ── AI PANEL MOBILE ──
  test("VIS-M-AI: AI panel mobile", async ({ page }) => {
    await page.goto("/dashboard/pro");
    await waitForStable(page);

    const aiBtn = page
      .locator('button[class*="ai"], ' + 'button:has-text("✦")')
      .first();

    if ((await aiBtn.count()) > 0) {
      await aiBtn.click();
      await page.waitForTimeout(1000);
    }

    await expect(page).toHaveScreenshot(
      "ai-panel-mobile.png",
      SCREENSHOT_OPTIONS(page, AI_MASKS(page)),
    );
  });

  // ── MOBILE DRAWER ──
  test("VIS-M-DRAWER: mobile sidebar drawer", async ({ page }) => {
    await page.goto("/dashboard/pro");
    await waitForStable(page);

    // Open drawer
    const hamburger = page
      .locator(
        'button[aria-label*="menu" i], ' +
          '[class*="hamburger"], ' +
          'button:has-text("☰")',
      )
      .first();

    if ((await hamburger.count()) > 0) {
      await hamburger.click();
      await page.waitForTimeout(500);
    }

    await expect(page).toHaveScreenshot(
      "drawer-mobile.png",
      SCREENSHOT_OPTIONS(page),
    );
  });
});

// ── COMPONENT SNAPSHOTS ──
test.describe("Visual — Components", () => {
  test.use({
    storageState: "e2e/.auth/pro.json",
    viewport: { width: 1440, height: 900 },
  });

  test("VIS-C-HEADER-PRO: header pro badge", async ({ page }) => {
    await page.goto("/dashboard/pro");
    await waitForStable(page);

    const header = page
      .locator(
        'header, [class*="header"], ' + '[class*="topbar"], [class*="navbar"]',
      )
      .first();

    if ((await header.count()) > 0) {
      await expect(header).toHaveScreenshot("header-pro.png", {
        maxDiffPixels: 100,
        animations: "disabled",
        mask: DYNAMIC_MASKS(page),
      });
    }
  });

  test("VIS-C-HEADER-TEAM: header team badge", async ({ page }) => {
    await page.goto("/dashboard/team");
    await waitForStable(page);

    const header = page
      .locator(
        'header, [class*="header"], ' + '[class*="topbar"], [class*="navbar"]',
      )
      .first();

    if ((await header.count()) > 0) {
      await expect(header).toHaveScreenshot("header-team.png", {
        maxDiffPixels: 100,
        animations: "disabled",
        mask: DYNAMIC_MASKS(page),
      });
    }
  });

  test("VIS-C-SIDEBAR: desktop sidebar", async ({ page }) => {
    await page.goto("/dashboard/pro");
    await waitForStable(page);

    const sidebar = page
      .locator('[class*="sidebar"], ' + '[class*="sider"], ' + "aside, nav")
      .first();

    if ((await sidebar.count()) > 0) {
      await expect(sidebar).toHaveScreenshot("sidebar-pro.png", {
        maxDiffPixels: 50,
        animations: "disabled",
        mask: DYNAMIC_MASKS(page),
      });
    }
  });

  test("VIS-C-EMPTY-FLOWS: empty flows state", async ({ page }) => {
    await page.goto("/dashboard/flows");
    await waitForStable(page);

    // Check if empty state visible
    const emptyState = page
      .locator('[class*="empty"]')
      .or(page.getByText(/no flows|create your first/i))
      .first();

    if ((await emptyState.count()) > 0) {
      await expect(emptyState).toHaveScreenshot("empty-flows.png", {
        maxDiffPixels: 50,
        animations: "disabled",
      });
    }
  });

  test("VIS-C-EMPTY-TRASH: empty trash state", async ({ page }) => {
    await page.goto("/dashboard/trash");
    await waitForStable(page);

    const emptyState = page
      .locator('[class*="empty"]')
      .or(page.getByText(/trash is empty/i))
      .first();

    if ((await emptyState.count()) > 0) {
      await expect(emptyState).toHaveScreenshot("empty-trash.png", {
        maxDiffPixels: 50,
        animations: "disabled",
      });
    }
  });
});
