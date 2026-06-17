import { test, expect } from "@playwright/test";
import { backendToken, BACKEND_URL } from "./helpers/auth";
import { PRO_USER_EMAIL, PRO_USER_PASSWORD } from "./helpers/db";
import {
  setUserState,
  getUserState,
  createTestFlows,
  deleteTestFlows,
  resetProUser,
  runPastDueGraceCheck,
} from "./helpers/db";

// Sequential suite (workers: 1) — every scenario mutates the same Pro test
// user (prouser@valueflowtest.com), so each block resets state it relies on.

test.afterEach(() => {
  deleteTestFlows();
});

// ─── SCENARIO 1: Base Pro user (10 flow limit) ─────────────────────────────
test.describe("S1: base Pro user (10 flow limit)", () => {
  test.beforeEach(() => resetProUser());

  test("FP-01: FlowUsageBar shows /10 and Buy More Flows on Pro dashboard", async ({
    page,
  }) => {
    await page.goto("/dashboard/pro");
    await expect(page.getByText("FLOW USAGE")).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/\/\s*10\b/).first()).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Buy More Flows").first()).toBeVisible();
  });

  test("FP-02: creating flow #11 is blocked with FLOW_LIMIT_REACHED", async ({
    request,
  }) => {
    createTestFlows(10);
    const token = await backendToken(request);
    const res = await request.post(`${BACKEND_URL}/api/v1/flows`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: "[E2E] Blocked Flow 11" },
    });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error?.code).toBe("FLOW_LIMIT_REACHED");
    expect(body.error?.message).toContain("(10)");
  });

  test("FP-03: subscription page offers Standard + Unlimited packs", async ({
    page,
  }) => {
    await page.goto("/dashboard/subscription");
    await expect(page.getByText("Standard — 100 Flows").first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("Unlimited Flows").first()).toBeVisible();
    await expect(
      page.locator("button", { hasText: /\$10\/month|\$20\/month/ }).first(),
    ).toBeVisible();
  });
});

// ─── SCENARIO 2: Standard add-on active (100 flows) ────────────────────────
test.describe("S2: Standard add-on active (100 flows)", () => {
  test.beforeEach(() => {
    resetProUser();
    setUserState(
      {
        proFlowLimit: 100,
        flowAddonStatus: "active",
        flowAddonPlan: "standard_100",
        flowAddonStripeSubId: "sub_e2e_standard",
        flowAddonCurrentPeriodEnd: new Date(
          Date.now() + 30 * 24 * 3600 * 1000,
        ).toISOString(),
      },
      ["flowAddonCurrentPeriodEnd"],
    );
  });

  test("FP-04: Pro dashboard shows /100 usage", async ({ page }) => {
    await page.goto("/dashboard/pro");
    await expect(page.getByText("FLOW USAGE")).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/\/\s*100\b/).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("FP-05: flow #11 creation is allowed", async ({ request }) => {
    createTestFlows(10);
    const token = await backendToken(request);
    const res = await request.post(`${BACKEND_URL}/api/v1/flows`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: "[E2E] Flow 11 allowed" },
    });
    expect(res.status()).not.toBe(403);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test("FP-06: subscription page shows the active add-on card", async ({
    page,
  }) => {
    await page.goto("/dashboard/subscription");
    await expect(
      page.getByText("Flow Add-on: Standard — 100 Flows"),
    ).toBeVisible({ timeout: 20000 });
    await expect(page.getByText("Active").first()).toBeVisible();
    await expect(
      page.locator("button", { hasText: "Cancel Subscription" }).first(),
    ).toBeVisible();
  });

  test("FP-07: Upgrade to Unlimited button shown on active Standard card", async ({
    page,
  }) => {
    await page.goto("/dashboard/subscription");
    await expect(
      page.getByText("Flow Add-on: Standard — 100 Flows"),
    ).toBeVisible({ timeout: 20000 });
    await expect(
      page.locator("button", { hasText: "Upgrade to Unlimited" }).first(),
    ).toBeVisible();
  });
});

// ─── SCENARIO 3: Unlimited add-on ───────────────────────────────────────────
test.describe("S3: Unlimited add-on active", () => {
  test.beforeEach(() => {
    resetProUser();
    setUserState({
      proUnlimitedFlows: true,
      flowAddonStatus: "active",
      flowAddonPlan: "unlimited",
      flowAddonStripeSubId: "sub_e2e_unlimited",
    });
  });

  test("FP-08: dashboard shows Unlimited instead of a numeric cap", async ({
    page,
  }) => {
    await page.goto("/dashboard/pro");
    await expect(page.getByText("FLOW USAGE")).toBeVisible({ timeout: 20000 });
    await expect(
      page.getByText(/flows used \(Unlimited\)/).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("FP-09: creating flows beyond 10 succeeds without limit error", async ({
    request,
  }) => {
    createTestFlows(15);
    const token = await backendToken(request);
    const res = await request.post(`${BACKEND_URL}/api/v1/flows`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: "[E2E] Flow 16 unlimited" },
    });
    expect(res.status()).not.toBe(403);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ─── SCENARIO 4: cancellation + picker phase ───────────────────────────────
test.describe("S4: cancellation and flow picker", () => {
  test("FP-10: picker banner shown on flows page when in picker phase", async ({
    page,
  }) => {
    resetProUser();
    createTestFlows(15);
    setUserState({
      flowAddonStatus: "cancelled",
      isInFlowPickerPhase: true,
    });

    await page.goto("/dashboard/flows");
    await expect(page.getByText(/Pick/i).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test("FP-11: re-subscribe restores limits and clears picker", async ({
    page,
  }) => {
    resetProUser();
    createTestFlows(5);
    setUserState({ isInFlowPickerPhase: true });

    expect(getUserState(["isInFlowPickerPhase"]).isInFlowPickerPhase).toBe(
      true,
    );

    // Simulate the re-subscribe webhook outcome (Phase 1 Fix 3 behavior)
    setUserState({
      proFlowLimit: 100,
      flowAddonStatus: "active",
      flowAddonPlan: "standard_100",
      isInFlowPickerPhase: false,
    });

    await page.goto("/dashboard/pro");
    await expect(page.getByText("FLOW USAGE")).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/\/\s*100\b/).first()).toBeVisible();
    await expect(page.getByText(/Pick 10/i)).toHaveCount(0);
  });
});

// ─── SCENARIO 5: System A + System B isolation ─────────────────────────────
test.describe("S5: System A / System B isolation", () => {
  test("FP-12: one-time pack (System A) raises effective limit to 110", async ({
    request,
  }) => {
    resetProUser();
    setUserState({ proAdditionalFlowsPurchased: 100 });
    createTestFlows(10);

    const token = await backendToken(request);
    const res = await request.post(`${BACKEND_URL}/api/v1/flows`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: "[E2E] System A flow 11" },
    });
    expect(res.status()).not.toBe(403);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test("FP-13: System A purchase blocked while add-on is active", async ({
    request,
  }) => {
    resetProUser();
    setUserState({
      flowAddonStatus: "active",
      flowAddonPlan: "standard_100",
      proFlowLimit: 100,
    });

    const token = await backendToken(request);
    const res = await request.post(`${BACKEND_URL}/api/v1/pro/buy-flows`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { package: "50" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error?.code).toBe("ADDON_SUBSCRIPTION_ACTIVE");
    // System A is soft-retired — deprecation headers present
    expect(res.headers()["deprecation"]).toBe("true");
    expect(res.headers()["sunset"]).toContain("2026");
  });
});

// ─── SCENARIO 6: past_due grace period ─────────────────────────────────────
test.describe("S6: past_due grace period", () => {
  test("FP-14: limits kept at 100 during grace", async ({ page }) => {
    resetProUser();
    setUserState(
      {
        proFlowLimit: 100,
        flowAddonStatus: "past_due",
        flowAddonPlan: "standard_100",
        flowAddonGracePeriodEnd: new Date(
          Date.now() + 3 * 24 * 3600 * 1000,
        ).toISOString(),
      },
      ["flowAddonGracePeriodEnd"],
    );

    await page.goto("/dashboard/pro");
    await expect(page.getByText("FLOW USAGE")).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/\/\s*100\b/).first()).toBeVisible();
  });

  test("FP-15: subscription page shows payment-failed warning", async ({
    page,
  }) => {
    resetProUser();
    setUserState(
      {
        proFlowLimit: 100,
        flowAddonStatus: "past_due",
        flowAddonPlan: "standard_100",
        flowAddonGracePeriodEnd: new Date(
          Date.now() + 2 * 24 * 3600 * 1000,
        ).toISOString(),
      },
      ["flowAddonGracePeriodEnd"],
    );

    await page.goto("/dashboard/subscription");
    await expect(page.getByText("Payment failed").first()).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.getByText(/Update your payment method within 3 days/).first(),
    ).toBeVisible();
  });

  test("FP-16: expired grace reduces limit to 10 via cron", async () => {
    resetProUser();
    setUserState(
      {
        proFlowLimit: 100,
        flowAddonStatus: "past_due",
        flowAddonPlan: "standard_100",
        flowAddonGracePeriodEnd: new Date(
          Date.now() - 24 * 3600 * 1000,
        ).toISOString(),
      },
      ["flowAddonGracePeriodEnd"],
    );

    const summary = runPastDueGraceCheck();
    expect(summary.reduced).toBeGreaterThanOrEqual(1);

    const state = getUserState([
      "proFlowLimit",
      "proUnlimitedFlows",
      "flowAddonGracePeriodEnd",
    ]);
    expect(state.proFlowLimit).toBe(10);
    expect(state.proUnlimitedFlows).toBe(false);
    expect(state.flowAddonGracePeriodEnd).toBeNull();
  });
});

// ─── SCENARIO 7: Standard → Unlimited upgrade ──────────────────────────────
test.describe("S7: upgrade / downgrade gating", () => {
  test("FP-17: upgrade path opens (not ALREADY_SUBSCRIBED)", async ({
    request,
  }) => {
    resetProUser();
    setUserState({
      proFlowLimit: 100,
      flowAddonStatus: "active",
      flowAddonPlan: "standard_100",
      flowAddonStripeSubId: "sub_e2e_fake",
    });

    const token = await backendToken(request);
    const res = await request.post(
      `${BACKEND_URL}/api/v1/pro/flow-addon/checkout`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: { plan: "unlimited" },
      },
    );
    const body = await res.json();
    expect(body.error?.code).not.toBe("ALREADY_SUBSCRIBED");
    // Gate opened: either a real upgrade or a Stripe error on the fake sub id
    const upgradeAttempted =
      body.data?.upgraded === true ||
      /no such subscription/i.test(body.error?.message || "");
    expect(upgradeAttempted).toBe(true);
  });

  test("FP-18: downgrade Unlimited → Standard is rejected", async ({
    request,
  }) => {
    resetProUser();
    setUserState({
      proUnlimitedFlows: true,
      flowAddonStatus: "active",
      flowAddonPlan: "unlimited",
      flowAddonStripeSubId: "sub_e2e_fake",
    });

    const token = await backendToken(request);
    const res = await request.post(
      `${BACKEND_URL}/api/v1/pro/flow-addon/checkout`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: { plan: "standard" },
      },
    );
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error?.code).toBe("DOWNGRADE_NOT_ALLOWED");
  });
});

// ─── SCENARIO 8: app-context isolation ─────────────────────────────────────
test.describe("S8: Pro app context", () => {
  test.beforeEach(() => resetProUser());

  test("FP-19: Pro dashboard shows flow usage, no team activity feed", async ({
    page,
  }) => {
    await page.goto("/dashboard/pro");
    await expect(page.getByText("FLOW USAGE")).toBeVisible({ timeout: 20000 });
    expect(page.url()).toContain("/dashboard/pro");
    await expect(page.getByText(/Team Activity/i)).toHaveCount(0);
  });
});

// FP-20 needs a FRESH unauthenticated session (tests the login→Pro redirect)
test.describe("S8b: ?app=pro routing (fresh session)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("FP-20: ?app=pro lands on the Pro dashboard after login", async ({
    page,
  }) => {
    resetProUser();
    await page.goto("/?app=pro");
    // Unauthenticated → login form (either on / or /login)
    const emailField = page.locator('input[type="email"]').first();
    try {
      await emailField.waitFor({ timeout: 8000 });
    } catch {
      await page.goto("/login?app=pro");
      await emailField.waitFor({ timeout: 8000 });
    }
    await emailField.fill(PRO_USER_EMAIL);
    await page.fill(
      'input[placeholder="Enter your password"]',
      PRO_USER_PASSWORD,
    );
    await page
      .locator(
        'button[type="submit"], button:has-text("Sign In"), button:has-text("Login")',
      )
      .first()
      .click();
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
    await page.waitForTimeout(2500); // allow ProGuard/app-context redirect
    expect(page.url()).toContain("/dashboard/pro");
  });
});

// ─── SCENARIO 9: subscription page UI ──────────────────────────────────────
test.describe("S9: subscription page UI", () => {
  test("FP-21: no horizontal overflow at 360px", async ({ browser }) => {
    resetProUser();
    const context = await browser.newContext({
      viewport: { width: 360, height: 740 },
      storageState: "./e2e/.auth/pro.json",
    });
    const page = await context.newPage();
    await page.goto("/dashboard/subscription");
    await page.waitForLoadState("networkidle");

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 1,
    );
    expect(overflow).toBe(false);
    await context.close();
  });

  test("FP-22: current plan card reflects active Standard add-on", async ({
    page,
  }) => {
    resetProUser();
    setUserState({
      proFlowLimit: 100,
      flowAddonStatus: "active",
      flowAddonPlan: "standard_100",
      flowAddonStripeSubId: "sub_e2e_standard",
    });

    await page.goto("/dashboard/subscription");
    await expect(
      page.getByText("Flow Add-on: Standard — 100 Flows"),
    ).toBeVisible({ timeout: 20000 });
    await expect(page.getByText("Active").first()).toBeVisible();
  });
});
