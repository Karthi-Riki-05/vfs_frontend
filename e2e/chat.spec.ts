import { test, expect, Page } from "@playwright/test";

/**
 * Chat E2E suite (Phase 2 surface).
 *
 * Auth: reuses the shared Pro storageState (pro.json, prouser@valueflowtest.com)
 * created once in global-setup. Chat is a team feature — for a Pro user it is
 * unlocked by entering the Pro app shell via the `/?app=pro` deep link (sets
 * `vc_app_param=pro`, so the server reports `currentApp:"pro"` → hasChatAccess).
 *
 * The chat panel is opened through the documented global `window.__openChat()`
 * (DashboardLayout exposes it; the Header/Sidebar chat icons call it).
 *
 * CHAT-05 is a pure API test: a free, team-less user hitting the chat API must
 * be rejected by `requireTeamChatEntitlement` with 403 / UPGRADE_REQUIRED.
 */

const SHOTS = "e2e/screenshots";

// Open the chat panel for the (entitled) Pro storageState user.
async function openChat(page: Page) {
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle").catch(() => {});
  // Chat is a team feature; the frontend gate (`hasChatAccess`) requires the
  // Pro app shell (`currentApp === "pro"`). The entitled Pro user enters it by
  // clicking the PRO app-mode tab — the chat icon unlocks afterwards.
  const proTab = page.getByRole("tab", { name: /pro/i });
  if (await proTab.count()) {
    await proTab.first().click();
    await page.waitForLoadState("networkidle").catch(() => {});
  }
  await page.evaluate(() => (window as any).__openChat?.());
  // The in-panel search box only renders when the panel is open AND unlocked.
  await expect(page.locator("#right-chat-search")).toBeVisible({
    timeout: 20_000,
  });
}

test.describe("Chat panel", () => {
  test("CHAT-01 — chat panel opens", async ({ page }) => {
    await openChat(page);
    await expect(page.locator("#right-chat-search")).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/chat-panel.png` });
  });

  test("CHAT-02 — Teams tab shows (not Projects)", async ({ page }) => {
    await openChat(page);
    await expect(
      page.getByRole("button", { name: "Teams", exact: true }),
    ).toBeVisible();
    // The prototype renamed the legacy "Projects" tab to "Teams".
    await expect(
      page.getByRole("button", { name: "Projects", exact: true }),
    ).toHaveCount(0);
    await page.screenshot({ path: `${SHOTS}/chat-teams-tab.png` });
  });

  test("CHAT-03 — Group tab shows Create Group", async ({ page }) => {
    await openChat(page);
    await page.getByRole("button", { name: "Group", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Create Group", exact: true }),
    ).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/chat-group-tab.png` });
  });

  test("CHAT-04 — Personal tab visible", async ({ page }) => {
    await openChat(page);
    const personal = page.getByRole("button", {
      name: "Personal",
      exact: true,
    });
    await expect(personal).toBeVisible();
    await personal.click();
    // Tab content (the conversation list region) stays mounted after switching.
    await expect(page.locator("#right-chat-search")).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/chat-personal-tab.png` });
  });
});

test.describe("Chat auth gate (API)", () => {
  // Start from a clean, unauthenticated context — this test logs in as its own
  // free user rather than reusing the shared Pro session.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("CHAT-05 — free, team-less user → 403 UPGRADE_REQUIRED", async ({
    page,
  }) => {
    const FREE_USER = {
      email: "freeuser@valueflowtest.com",
      password: "Test@1234",
    };

    // NextAuth credentials login over the HTTP API (the client signIn() path is
    // broken locally — see global-setup.ts).
    await page.goto("/login");
    const csrfToken: string = await page.evaluate(
      async () => (await (await fetch("/api/auth/csrf")).json()).csrfToken,
    );
    const loginStatus: number = await page.evaluate(
      async ({ csrfToken, email, password }) => {
        const body = new URLSearchParams({
          csrfToken,
          email,
          password,
          json: "true",
        });
        const r = await fetch("/api/auth/callback/credentials?", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        });
        return r.status;
      },
      { csrfToken, ...FREE_USER },
    );
    expect(loginStatus).toBe(200);

    // The chat API is gated by requireTeamChatEntitlement: a free user who is
    // not in any team is rejected with 403 / UPGRADE_REQUIRED. The frontend
    // proxy forwards /api/chat/groups → backend /api/v1/chat/groups with the
    // session JWT attached.
    const res = await page.evaluate(async () => {
      const r = await fetch("/api/chat/groups");
      let body: any = null;
      try {
        body = await r.json();
      } catch {
        /* non-JSON */
      }
      return { status: r.status, code: body?.error?.code ?? null };
    });

    expect(res.status).toBe(403);
    expect(res.code).toBe("UPGRADE_REQUIRED");
  });
});

test.describe("Chat mobile", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("CHAT-06 — mobile chat renders full screen", async ({ page }) => {
    await page.goto("/dashboard/chat");
    await page.waitForLoadState("networkidle").catch(() => {});
    // The mobile chat page mounts RightChatColumn full-screen; its search box
    // is the stable in-panel signal.
    await expect(page.locator("#right-chat-search")).toBeVisible({
      timeout: 20_000,
    });
    await page.screenshot({ path: `${SHOTS}/chat-mobile.png` });
  });
});
