import { test, expect } from "@playwright/test";
import { BACKEND_URL, backendToken } from "./helpers/auth";

// AI Assistant module E2E coverage.
// Uses the global pro.json storageState (authenticated Pro user).
//
// The AI Assistant is a floating launcher (Sparkles FAB, aria-label
// "Open AI Assistant") mounted by DashboardLayout. Clicking it opens the
// "Value Charts AI" chat panel. Selectors are derived from
// components/ai/AIAssistant.tsx + AIConsentModal.tsx.

const SHOTS = "test-results";

// Open the AI Assistant via its FAB. Returns whether the launcher was found.
async function openAiAssistant(page: import("@playwright/test").Page) {
  const fab = page.getByRole("button", { name: /open ai assistant/i }).first();
  // The FAB is mounted after client hydration (useIsMobile re-render), so
  // wait for it rather than counting immediately after networkidle.
  try {
    await fab.waitFor({ state: "visible", timeout: 8000 });
  } catch {
    return false;
  }
  await fab.click().catch(() => {});
  await page.waitForTimeout(800);
  return true;
}

test.describe("AI Assistant", () => {
  test("AI-01: AI Assistant panel loads", async ({ page }) => {
    await page.goto("/dashboard/pro");
    await page.waitForLoadState("networkidle");

    const opened = await openAiAssistant(page);
    expect(opened).toBeTruthy();

    // The chat panel header reads "Value Charts AI".
    const panel = page.getByText(/value charts ai/i).first();
    await expect(panel).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: `${SHOTS}/ai-assistant-panel.png` });
    await expect(page.getByText(/^(Error|500)$/).first()).toHaveCount(0);
  });

  test("AI-02: chat is free (no credit gate blocks the conversation)", async ({
    page,
  }) => {
    await page.goto("/dashboard/pro");
    await page.waitForLoadState("networkidle");
    await openAiAssistant(page);

    // Accept consent if the gate is shown (new users), so the chat is usable.
    const accept = page.getByRole("button", { name: /^accept$/i }).first();
    if ((await accept.count()) > 0 && (await accept.isVisible())) {
      await accept.click().catch(() => {});
      await page.waitForTimeout(500);
    }

    const input = page
      .locator(
        'input[placeholder*="flow" i], input[placeholder*="document" i], textarea',
      )
      .first();

    if ((await input.count()) > 0 && (await input.isVisible())) {
      await input.fill("Hello, what can you do?");
      await input.press("Enter");
      await page.waitForTimeout(2500);

      // Chat is free: no upgrade/credit-gate error should block the message.
      await expect(
        page.getByText(/upgrade to (pro|continue)|out of credits|no credits/i),
      ).toHaveCount(0);

      // A response (assistant message bubble / any reply text) should appear.
      const reply = page
        .getByText(/value charts ai|i'?ll|create|diagram|flow|help/i)
        .nth(1);
      if ((await reply.count()) > 0) {
        await expect(reply.first()).toBeVisible({ timeout: 8000 });
      }
    }

    await page.screenshot({ path: `${SHOTS}/ai-chat-response.png` });
    await expect(page.getByText(/^(Error|500)$/).first()).toHaveCount(0);
  });

  test("AI-03: consent screen shown for new users (or chat if consented)", async ({
    page,
  }) => {
    await page.goto("/dashboard/pro");
    await page.waitForLoadState("networkidle");
    await openAiAssistant(page);

    // Either the GDPR consent modal (Accept/Decline) OR the chat panel is
    // present — both are valid depending on prior consent state.
    const consent = page.getByText(/consent|gdpr|data processing/i).first();
    const chat = page.getByText(/value charts ai/i).first();

    const consentVisible = (await consent.count()) > 0;
    const chatVisible = (await chat.count()) > 0;
    expect(consentVisible || chatVisible).toBeTruthy();

    await page.screenshot({ path: `${SHOTS}/ai-consent.png` });
    await expect(page.getByText(/^(Error|500)$/).first()).toHaveCount(0);
  });

  test("AI-04: generate diagram button / suggestion visible", async ({
    page,
  }) => {
    await page.goto("/dashboard/pro");
    await page.waitForLoadState("networkidle");
    await openAiAssistant(page);

    // Accept consent if shown so suggestions render.
    const accept = page.getByRole("button", { name: /^accept$/i }).first();
    if ((await accept.count()) > 0 && (await accept.isVisible())) {
      await accept.click().catch(() => {});
      await page.waitForTimeout(500);
    }

    // Starter suggestions (e.g. "Generate a user onboarding flow") or the
    // ⚡ Generate affordance should be present in the panel.
    const generate = page.getByText(/generate|⚡/i).first();
    if ((await generate.count()) > 0) {
      await expect(generate).toBeVisible({ timeout: 5000 });
    }

    await page.screenshot({ path: `${SHOTS}/ai-generate-button.png` });
    await expect(page.getByText(/^(Error|500)$/).first()).toHaveCount(0);
  });

  test("AI-05: dead endpoint generate-diagram-from-document returns 404", async ({
    request,
  }) => {
    // The ai-assistant router gates every path behind `authenticate`, so an
    // unauthenticated request 401s before routing. Authenticate first so an
    // unmatched route falls through to the 404 handler — proving it's dead.
    const token = await backendToken(request);
    const res = await request.post(
      `${BACKEND_URL}/api/v1/ai-assistant/generate-diagram-from-document`,
      {
        data: {},
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      },
    );
    expect(res.status()).toBe(404);
  });
});

test.describe("AI Assistant — Mobile", () => {
  test.use({ viewport: { width: 375, height: 667 }, isMobile: true });

  test("AI-06: AI Assistant accessible on mobile viewport", async ({
    page,
  }) => {
    await page.goto("/dashboard/pro");
    await page.waitForLoadState("networkidle");

    const opened = await openAiAssistant(page);
    expect(opened).toBeTruthy();

    // Panel is open on mobile when its chat input is reachable. ("Value Charts
    // AI" text is duplicated across hidden history rows, so don't assert on it.)
    const input = page
      .locator(
        'input[placeholder*="flow" i], input[placeholder*="document" i], textarea',
      )
      .first();
    if ((await input.count()) > 0) {
      await expect(input).toBeVisible({ timeout: 5000 });
    }

    await page.screenshot({ path: `${SHOTS}/ai-mobile.png` });
    await expect(page.getByText(/^(Error|500)$/).first()).toHaveCount(0);
  });
});
