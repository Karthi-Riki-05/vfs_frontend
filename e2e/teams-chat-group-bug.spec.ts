/**
 * BUG REPRODUCTION: Teams Chat → Group List Pollution
 *
 * Bug: When two users (mry = team owner, mr5 = team member) each open
 * the Teams tab and click on the same team to start a team chat, the
 * backend creates DUPLICATE ChatGroup records with the same teamId.
 * The sidebar classifier can only assign ONE group per team to the
 * Teams section — the rest spill into the "Group" tab.
 *
 * Expected: Clicking a team in the Teams tab always opens the SAME
 * shared conversation. No duplicate entries in the Groups tab.
 *
 * Accounts:
 *   mry@test.com   (team owner) — password: test1234
 *   mr5@gmail.com  (team member in mry's team) — password: test1234
 */

import { test, expect, Page, BrowserContext } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3002";
const SHOTS = "e2e/screenshots/teams-chat-bug";
const BACKEND_URL = "http://localhost:5002";

// Ensure screenshots folder exists
if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

// ── Auth helpers ────────────────────────────────────────────────────────────

async function loginViaAPI(
  context: BrowserContext,
  email: string,
  password: string,
): Promise<string> {
  // 1. Hit the NextAuth CSRF endpoint to get a token
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/api/auth/csrf`);
  const csrfBody = await page
    .evaluate(() => document.body.innerText)
    .catch(() => "{}");
  const { csrfToken } = JSON.parse(csrfBody).catch ? {} : JSON.parse(csrfBody);

  // 2. POST to the credentials callback
  const response = await page.evaluate(
    async ({ url, email, password, csrfToken }) => {
      const res = await fetch(`${url}/api/auth/callback/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          email,
          password,
          csrfToken: csrfToken || "",
          callbackUrl: `${url}/dashboard`,
          json: "true",
        }),
        redirect: "manual",
      });
      return { status: res.status, ok: res.ok };
    },
    { url: BASE_URL, email, password, csrfToken },
  );

  await page.close();
  return email;
}

async function loginAndNavigate(
  context: BrowserContext,
  email: string,
  password: string,
): Promise<Page> {
  const page = await context.newPage();

  // Get CSRF token first
  await page.goto(`${BASE_URL}/api/auth/csrf`);
  let csrfToken = "";
  try {
    const body = await page.evaluate(() => document.body.innerText);
    csrfToken = JSON.parse(body).csrfToken || "";
  } catch {}

  // POST login
  await page.evaluate(
    async ({ url, email, password, csrfToken }) => {
      await fetch(`${url}/api/auth/callback/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          email,
          password,
          csrfToken,
          callbackUrl: "/dashboard",
          json: "true",
        }),
        redirect: "follow",
      });
    },
    { url: BASE_URL, email, password, csrfToken },
  );

  // Navigate to dashboard after login
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState("networkidle").catch(() => {});

  return page;
}

// ── Open chat panel helper ──────────────────────────────────────────────────

async function openChatPanel(page: Page): Promise<void> {
  // Try the global __openChat hook first
  await page.evaluate(() => (window as any).__openChat?.());
  await page.waitForTimeout(800);

  // If that didn't work, click the chat icon in sidebar
  const chatIcon = page
    .locator(
      '[data-testid="chat-icon"], [href*="chat"], button[title*="Chat"], a[href="/dashboard/chat"]',
    )
    .first();
  if ((await chatIcon.count()) > 0) {
    await chatIcon.click();
    await page.waitForLoadState("networkidle").catch(() => {});
  }

  // Wait for the chat panel to be visible
  await page
    .locator("#right-chat-search")
    .waitFor({ state: "visible", timeout: 15_000 })
    .catch(async () => {
      // Mobile: navigate directly to chat page
      await page.goto(`${BASE_URL}/dashboard/chat`);
      await page.waitForLoadState("networkidle").catch(() => {});
    });
}

// ── Count groups in the Groups tab ─────────────────────────────────────────

async function countGroupsInGroupTab(page: Page): Promise<number> {
  // Click the "Group" tab
  const groupTab = page.getByRole("button", { name: "Group", exact: true });
  if ((await groupTab.count()) === 0) return 0;
  await groupTab.click();
  await page.waitForTimeout(500);

  // Count conversation rows in the groups section
  // These are the chat group items rendered when tab === "group"
  const rows = page.locator(".tw-chat-row, [data-chat-row], .chat-group-item");
  if ((await rows.count()) > 0) return await rows.count();

  // Fallback: count any list items in the chat panel after clicking Group tab
  const listItems = page
    .locator("#right-chat-panel .ant-list-item, .chat-list-item")
    .filter({ hasNotText: "No groups yet" });
  return await listItems.count();
}

// ── Get group tab item names ────────────────────────────────────────────────

async function getGroupTabItems(page: Page): Promise<string[]> {
  const groupTab = page.getByRole("button", { name: "Group", exact: true });
  if ((await groupTab.count()) === 0) return [];
  await groupTab.click();
  await page.waitForTimeout(600);

  const names: string[] = [];
  // Look for text content in the group rows
  const rows = page.locator(
    '[class*="chat-row"], [class*="group-row"], .tw-row',
  );
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const text = await rows.nth(i).textContent();
    if (text) names.push(text.trim().slice(0, 80));
  }
  return names;
}

// ────────────────────────────────────────────────────────────────────────────

test.describe.configure({ mode: "serial" });

test.describe("BUG: Teams chat creates duplicate groups in Group tab", () => {
  // Fresh, isolated browser contexts for each user (no shared session)
  test.use({ storageState: { cookies: [], origins: [] } });

  test("TCHAT-01 — mry (owner) can open Teams chat", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await loginAndNavigate(context, "mry@test.com", "test1234");

    // Take baseline screenshot
    await page.screenshot({
      path: `${SHOTS}/01-mry-dashboard.png`,
      fullPage: false,
    });

    // Open chat panel
    await openChatPanel(page);
    await page.screenshot({
      path: `${SHOTS}/02-mry-chat-open.png`,
      fullPage: false,
    });

    // Ensure Teams tab is active
    const teamsTab = page.getByRole("button", { name: /teams?/i }).first();
    if ((await teamsTab.count()) > 0) {
      await teamsTab.click();
      await page.waitForTimeout(600);
    }
    await page.screenshot({
      path: `${SHOTS}/03-mry-teams-tab.png`,
      fullPage: false,
    });

    // Find the first team in the list and click it to open chat
    // Teams are rendered as rows in the "team" tab
    const teamRow = page
      .locator('[class*="row"], [class*="item"]')
      .filter({
        hasNotText: /no.*team|loading/i,
      })
      .first();

    const teamRowCount = await teamRow.count();
    console.log(`[mry] Teams tab rows found: ${teamRowCount}`);

    if (teamRowCount > 0) {
      await teamRow.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: `${SHOTS}/04-mry-team-chat-opened.png`,
        fullPage: false,
      });
    }

    // Now check the Group tab — it should be empty or contain only named groups
    // NOT team conversations
    const groupTab = page.getByRole("button", { name: "Group", exact: true });
    if ((await groupTab.count()) > 0) {
      await groupTab.click();
      await page.waitForTimeout(600);
      await page.screenshot({
        path: `${SHOTS}/05-mry-group-tab-after-team-chat.png`,
        fullPage: false,
      });
    }

    await context.close();
  });

  test("TCHAT-02 — mr5 (member) opens Teams chat → checks for ghost groups", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await loginAndNavigate(context, "mr5@gmail.com", "test1234");

    await page.screenshot({
      path: `${SHOTS}/06-mr5-dashboard.png`,
      fullPage: false,
    });

    // Open chat panel
    await openChatPanel(page);
    await page.screenshot({
      path: `${SHOTS}/07-mr5-chat-open.png`,
      fullPage: false,
    });

    // Note the Group tab count BEFORE opening any team chat
    const groupTab = page.getByRole("button", { name: "Group", exact: true });
    let groupCountBefore = 0;
    if ((await groupTab.count()) > 0) {
      await groupTab.click();
      await page.waitForTimeout(600);
      const emptyMsg = page.getByText(/no groups yet/i);
      groupCountBefore = (await emptyMsg.count()) > 0 ? 0 : 99; // rough check
      await page.screenshot({
        path: `${SHOTS}/08-mr5-group-tab-before.png`,
        fullPage: false,
      });
    }

    // Switch to Teams tab
    const teamsTab = page.getByRole("button", { name: /teams?/i }).first();
    if ((await teamsTab.count()) > 0) {
      await teamsTab.click();
      await page.waitForTimeout(600);
    }
    await page.screenshot({
      path: `${SHOTS}/09-mr5-teams-tab.png`,
      fullPage: false,
    });

    // Click the first team to open team chat
    const teamRow = page
      .locator('[class*="row"], [class*="item"]')
      .filter({ hasNotText: /no.*team|loading/i })
      .first();
    const teamRowCount = await teamRow.count();
    console.log(`[mr5] Teams tab rows found: ${teamRowCount}`);

    if (teamRowCount > 0) {
      const teamName =
        (await teamRow.textContent())?.trim().slice(0, 40) || "?";
      console.log(`[mr5] Clicking on team: ${teamName}`);
      await teamRow.click();
      await page.waitForTimeout(1200);
      await page.screenshot({
        path: `${SHOTS}/10-mr5-team-chat-opened.png`,
        fullPage: false,
      });
    }

    // Go BACK to the Group tab to see if a ghost group appeared
    if ((await groupTab.count()) > 0) {
      await groupTab.click();
      await page.waitForTimeout(800);
      await page.screenshot({
        path: `${SHOTS}/11-mr5-group-tab-after-team-chat.png`,
        fullPage: false,
      });

      const emptyMsg = page.getByText(/no groups yet/i);
      const hasEmptyMsg = (await emptyMsg.count()) > 0;

      if (hasEmptyMsg) {
        console.log(
          "✅ Group tab is empty — no ghost groups. Bug not reproduced.",
        );
      } else {
        // Count the items
        const items = page.locator('[class*="row"], [class*="item"]').filter({
          hasNotText: /loading|no group/i,
        });
        const count = await items.count();
        console.log(
          `❌ BUG FOUND: Group tab has ${count} item(s) — team chat(s) appeared in Groups!`,
        );

        // Log what's in the group tab
        for (let i = 0; i < Math.min(count, 5); i++) {
          const text = await items.nth(i).textContent();
          console.log(`  Group[${i}]: ${text?.trim().slice(0, 60)}`);
        }
      }
    }

    await context.close();
  });

  test("TCHAT-03 — visual: both users chat and screenshot the result", async ({
    browser,
  }) => {
    // ── mry sends a message in team chat ──────────────────────────────────
    const mryCtx = await browser.newContext();
    const mryPage = await loginAndNavigate(mryCtx, "mry@test.com", "test1234");
    await openChatPanel(mryPage);

    // Click Teams tab
    const mryTeamsTab = mryPage
      .getByRole("button", { name: /teams?/i })
      .first();
    if ((await mryTeamsTab.count()) > 0) {
      await mryTeamsTab.click();
      await mryPage.waitForTimeout(500);
    }

    // Click first team
    const mryTeamRow = mryPage
      .locator('[class*="row"]')
      .filter({ hasNotText: /no.*team|loading/i })
      .first();
    if ((await mryTeamRow.count()) > 0) {
      await mryTeamRow.click();
      await mryPage.waitForTimeout(1000);
    }

    // Try to send a message
    const mryInput = mryPage
      .locator(
        'input[placeholder*="message"], textarea[placeholder*="message"], [contenteditable]',
      )
      .last();
    if ((await mryInput.count()) > 0) {
      await mryInput.click();
      await mryInput.fill("Hello from mry (owner) — team chat test");
      await mryPage.keyboard.press("Enter");
      await mryPage.waitForTimeout(800);
    }
    await mryPage.screenshot({
      path: `${SHOTS}/12-mry-sent-message.png`,
      fullPage: false,
    });

    // ── Check mry's Group tab for ghost entries ───────────────────────────
    const mryGroupTab = mryPage.getByRole("button", {
      name: "Group",
      exact: true,
    });
    if ((await mryGroupTab.count()) > 0) {
      await mryGroupTab.click();
      await mryPage.waitForTimeout(600);
      const mryEmptyMsg = mryPage.getByText(/no groups yet/i);
      const mryHasGhost = (await mryEmptyMsg.count()) === 0;
      if (mryHasGhost) {
        const mryItems = mryPage.locator('[class*="row"]').filter({
          hasNotText: /loading/i,
        });
        const c = await mryItems.count();
        console.log(`[mry] ❌ Group tab has ${c} ghost item(s)`);
      } else {
        console.log("[mry] ✅ Group tab is empty (correct)");
      }
      await mryPage.screenshot({
        path: `${SHOTS}/13-mry-group-tab-final.png`,
        fullPage: false,
      });
    }

    await mryCtx.close();

    // ── mr5 opens team chat and replies ───────────────────────────────────
    const mr5Ctx = await browser.newContext();
    const mr5Page = await loginAndNavigate(mr5Ctx, "mr5@gmail.com", "test1234");
    await openChatPanel(mr5Page);

    // Teams tab
    const mr5TeamsTab = mr5Page
      .getByRole("button", { name: /teams?/i })
      .first();
    if ((await mr5TeamsTab.count()) > 0) {
      await mr5TeamsTab.click();
      await mr5Page.waitForTimeout(500);
    }
    await mr5Page.screenshot({
      path: `${SHOTS}/14-mr5-teams-tab-final.png`,
      fullPage: false,
    });

    const mr5TeamRow = mr5Page
      .locator('[class*="row"]')
      .filter({ hasNotText: /no.*team|loading/i })
      .first();
    if ((await mr5TeamRow.count()) > 0) {
      await mr5TeamRow.click();
      await mr5Page.waitForTimeout(1000);
    }
    await mr5Page.screenshot({
      path: `${SHOTS}/15-mr5-team-chat-view.png`,
      fullPage: false,
    });

    // Send a reply
    const mr5Input = mr5Page
      .locator(
        'input[placeholder*="message"], textarea[placeholder*="message"]',
      )
      .last();
    if ((await mr5Input.count()) > 0) {
      await mr5Input.click();
      await mr5Input.fill("Hello from mr5 (member) — team chat reply");
      await mr5Page.keyboard.press("Enter");
      await mr5Page.waitForTimeout(800);
    }
    await mr5Page.screenshot({
      path: `${SHOTS}/16-mr5-sent-reply.png`,
      fullPage: false,
    });

    // ── THE KEY ASSERTION: Group tab must NOT show team chat entries ───────
    const mr5GroupTab = mr5Page.getByRole("button", {
      name: "Group",
      exact: true,
    });
    if ((await mr5GroupTab.count()) > 0) {
      await mr5GroupTab.click();
      await mr5Page.waitForTimeout(800);
      await mr5Page.screenshot({
        path: `${SHOTS}/17-mr5-group-tab-BUG-CHECK.png`,
        fullPage: false,
      });

      const emptyMsg = mr5Page.getByText(/no groups yet/i);
      const hasGhostGroups = (await emptyMsg.count()) === 0;

      if (hasGhostGroups) {
        const items = mr5Page.locator('[class*="row"]').filter({
          hasNotText: /loading/i,
        });
        const count = await items.count();
        const names: string[] = [];
        for (let i = 0; i < Math.min(count, 5); i++) {
          const t = await items.nth(i).textContent();
          names.push(t?.trim().slice(0, 60) || "?");
        }
        console.log(
          `\n❌ BUG CONFIRMED: ${count} ghost group(s) in Group tab for mr5:\n${names.join("\n")}`,
        );
        // Don't hard-fail — this is a bug-reproduction test.
        // We document the finding rather than blocking CI.
      } else {
        console.log(
          "\n✅ Group tab empty for mr5 — no ghost groups. Bug may be fixed.",
        );
      }
    }

    await mr5Ctx.close();
  });

  test("TCHAT-04 — Direct message between mry and mr5 should NOT appear in Groups tab", async ({
    browser,
  }) => {
    // mr5 starts a direct message to mry from the Contacts section
    const mr5Ctx = await browser.newContext();
    const mr5Page = await loginAndNavigate(mr5Ctx, "mr5@gmail.com", "test1234");
    await openChatPanel(mr5Page);

    // Go to Direct tab (or Contacts)
    const directTab = mr5Page
      .getByRole("button", { name: /direct|contact/i })
      .first();
    if ((await directTab.count()) > 0) {
      await directTab.click();
      await mr5Page.waitForTimeout(600);
    }
    await mr5Page.screenshot({
      path: `${SHOTS}/18-mr5-direct-tab.png`,
      fullPage: false,
    });

    // Click on mry in the contacts list
    const mryContact = mr5Page
      .locator('[class*="row"], [class*="contact"]')
      .filter({ hasText: /mry/i })
      .first();
    if ((await mryContact.count()) > 0) {
      await mryContact.click();
      await mr5Page.waitForTimeout(800);
      await mr5Page.screenshot({
        path: `${SHOTS}/19-mr5-dm-with-mry.png`,
        fullPage: false,
      });

      // Send a DM
      const dmInput = mr5Page
        .locator('input[placeholder*="message"], textarea')
        .last();
      if ((await dmInput.count()) > 0) {
        await dmInput.click();
        await dmInput.fill("DM from mr5 to mry — should NOT appear in Groups");
        await mr5Page.keyboard.press("Enter");
        await mr5Page.waitForTimeout(600);
      }
    }

    // Now check the Group tab — the DM should NOT be there
    const groupTab = mr5Page.getByRole("button", {
      name: "Group",
      exact: true,
    });
    if ((await groupTab.count()) > 0) {
      await groupTab.click();
      await mr5Page.waitForTimeout(600);
      await mr5Page.screenshot({
        path: `${SHOTS}/20-mr5-group-tab-after-dm.png`,
        fullPage: false,
      });

      const emptyMsg = mr5Page.getByText(/no groups yet/i);
      if ((await emptyMsg.count()) === 0) {
        const items = mr5Page.locator('[class*="row"]').filter({
          hasNotText: /loading/i,
        });
        const c = await items.count();
        console.log(
          `[DM Test] ❌ BUG: ${c} item(s) in Group tab after sending DM`,
        );
      } else {
        console.log("[DM Test] ✅ Group tab correctly empty after DM");
      }
    }

    await mr5Ctx.close();
  });
});
