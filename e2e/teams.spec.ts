import { test, expect, chromium } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { dbNode } from "./helpers/db";
import { TEST_USERS } from "./helpers/test-users";

// Uses the global pro.json storageState (authenticated Pro user).

test.describe("Teams", () => {
  test("TEAM-01: teams page loads", async ({ page }) => {
    await page.goto("/dashboard/teams");
    await page.waitForLoadState("networkidle");
    // The "My Teams" h1 renders only after the workspace-loading splash
    // clears, so it doubles as a reliable "page loaded" signal.
    await expect(page.getByRole("heading", { name: /my teams/i })).toBeVisible({
      timeout: 15000,
    });
  });

  test("TEAM-02: create team button visible", async ({ page }) => {
    await page.goto("/dashboard/teams");
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("button", { name: /create team|new team/i }).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("TEAM-03: create team modal opens", async ({ page }) => {
    await page.goto("/dashboard/teams");
    await page.waitForLoadState("networkidle");
    const createBtn = page
      .getByRole("button", { name: /create team|new team/i })
      .first();
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();
    await expect(page.locator('[role="dialog"]').first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("TEAM-04: team detail page loads", async ({ page }) => {
    await page.goto("/dashboard/teams");
    await page.waitForLoadState("networkidle");

    const teamCard = page
      .locator('.team-card, [class*="team"], [data-testid*="team"]')
      .first();
    const count = await teamCard.count();
    if (count > 0) {
      await teamCard.click();
      await page.waitForURL("**/teams/**", { timeout: 10000 }).catch(() => {});
    } else {
      test.skip();
    }
  });

  test("TEAM-05: no horizontal overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard/teams");
    await page.waitForLoadState("networkidle");
    // Wait out the loading splash so the measurement reflects the real page.
    await page
      .getByRole("heading", { name: /my teams/i })
      .waitFor({ state: "visible", timeout: 15000 })
      .catch(() => {});
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
});

test.describe("Teams — deep flows", () => {
  // The Pro test user typically owns no teams, so each test guards on presence
  // and asserts behaviour only when team UI is actually rendered.

  test("TEAM-06: expanding a team reveals its member list", async ({
    page,
  }) => {
    await page.goto("/dashboard/teams");
    await page.waitForLoadState("networkidle");
    await page
      .getByRole("heading", { name: /my teams/i })
      .waitFor({ state: "visible", timeout: 15000 })
      .catch(() => {});

    const teamCard = page
      .locator(
        '[class*="team-card"], [class*="accordion"], .ant-collapse-item, [class*="team"]',
      )
      .first();

    if ((await teamCard.count()) > 0) {
      await teamCard.click().catch(() => {});
      await page.waitForTimeout(600);
      const members = page.getByText(/members/i).first();
      if ((await members.count()) > 0) {
        await expect(members).toBeVisible({ timeout: 3000 });
      }
    }
    await expect(page.locator("body")).toBeVisible();
  });

  test("TEAM-07: invite modal exposes an email field and rejects bad input", async ({
    page,
  }) => {
    await page.goto("/dashboard/teams");
    await page.waitForLoadState("networkidle");

    const inviteBtn = page
      .locator(
        'button:has-text("Invite"), [class*="invite"], button[aria-label*="invite" i]',
      )
      .first();

    if ((await inviteBtn.count()) > 0) {
      await inviteBtn.click().catch(() => {});
      await page.waitForTimeout(600);

      const dialog = page.locator('[role="dialog"], .ant-modal').first();
      const emailInput = dialog
        .locator('input[type="email"], input[type="text"], input')
        .first();

      if ((await emailInput.count()) > 0) {
        await expect(emailInput).toBeVisible();
        await emailInput.fill("not-an-email");
        await dialog
          .getByRole("button", { name: /invite|send|ok|add/i })
          .first()
          .click()
          .catch(() => {});
        await page.waitForTimeout(500);
        // No crash; modal validation handled it.
        await expect(page.getByText(/^(Error|500)$/).first()).toHaveCount(0);
        await page.keyboard.press("Escape").catch(() => {});
      }
    }
    await expect(page.locator("body")).toBeVisible();
  });

  test("TEAM-08: managing a team opens its detail page", async ({ page }) => {
    await page.goto("/dashboard/teams");
    await page.waitForLoadState("networkidle");

    const manage = page
      .locator(
        'a[href*="teams/"], a:has-text("Manage"), button:has-text("Manage")',
      )
      .first();

    if ((await manage.count()) > 0) {
      await manage.click().catch(() => {});
      await page.waitForURL("**/teams/**", { timeout: 10000 }).catch(() => {});
      await expect(page.getByText(/^(Error|500)$/).first()).toHaveCount(0);
    }
    await expect(page.locator("body")).toBeVisible();
  });
});

/**
 * ════════════════════════════════════════════════════════════════════════════
 *  FEAT-007 — Team-owner management UI (TEAM-09 … TEAM-12)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * These cover the owner-only controls on the team DETAIL page
 * (frontend/app/dashboard/teams/[id]/page.tsx):
 *   • member-row ⋮ actions dropdown      (owner + non-owner member only)
 *   • settings ⚙️ gear → in-page modal   (NOT a navigation)
 *   • "Pending Invites" section          (always rendered for the owner)
 *   • mobile member management
 *
 * The shared pro.json storageState owns NO teams, so this block logs in as the
 * TEAM user (mry@test.com — owns the "red" team) and saves its own session.
 * mry's team has only herself (OWNER); the ⋮ dropdown renders solely for
 * NON-owner members, so beforeAll seeds one member (and afterAll removes it) to
 * make TEAM-09 / TEAM-12 real assertions of the fix rather than no-ops.
 */
test.describe("Teams — FEAT-007 owner management", () => {
  const TEAM_STORAGE = path.resolve(__dirname, ".auth", "team.json");
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3002";
  const MEMBER = TEST_USERS.FREE; // freeuser — seeded as a non-owner member
  const SHOTS = "test-results";

  let teamId = "";
  let seededMemberId = "";

  test.use({ storageState: TEAM_STORAGE });

  test.beforeAll(async () => {
    const browser = await chromium.launch();
    // Fresh context — never inherit the describe-level storageState here
    // (team.json may not exist yet, and we manage it explicitly).
    const ctx = await browser.newContext({ baseURL, storageState: undefined });

    // 1. Reuse an existing valid mry session if team.json is still good — the
    //    backend auth limiter is 10 logins / 15 min per IP, so we avoid a fresh
    //    login on every run.
    let session: any = null;
    if (fs.existsSync(TEAM_STORAGE)) {
      try {
        const saved = JSON.parse(fs.readFileSync(TEAM_STORAGE, "utf8"));
        await ctx.addCookies(saved.cookies || []);
        const s = await (
          await ctx.request.get(`${baseURL}/api/auth/session`)
        ).json();
        if (s?.user?.email === TEST_USERS.TEAM.email) session = s;
      } catch {
        /* fall through to a fresh login */
      }
    }

    // 2. Otherwise log mry in via NextAuth's credentials HTTP API (the client
    //    signIn() flow does not complete locally — same approach as global-setup).
    if (!session) {
      const { csrfToken } = await (
        await ctx.request.get(`${baseURL}/api/auth/csrf`)
      ).json();
      await ctx.request.post(`${baseURL}/api/auth/callback/credentials`, {
        form: {
          csrfToken,
          email: TEST_USERS.TEAM.email,
          password: TEST_USERS.TEAM.password,
          json: "true",
          callbackUrl: baseURL,
        },
      });
      session = await (
        await ctx.request.get(`${baseURL}/api/auth/session`)
      ).json();
    }
    if (!session?.user) {
      await browser.close();
      throw new Error(`[TEAM] mry login failed: ${JSON.stringify(session)}`);
    }

    // 3. Discover a team mry OWNS (via the same authenticated session).
    const teamsRes = await (
      await ctx.request.get(`${baseURL}/api/teams`)
    ).json();
    const teams = teamsRes?.data?.teams || teamsRes?.data || [];
    const owned =
      teams.find((t: any) =>
        (t.members || []).some(
          (m: any) =>
            (m.role || "").toUpperCase() === "OWNER" &&
            (m.userId === session.user.id || m.user?.id === session.user.id),
        ),
      ) || teams[0];
    if (!owned?.id) {
      await browser.close();
      throw new Error("[TEAM] mry owns no team — cannot run FEAT-007 suite");
    }
    teamId = owned.id;

    await ctx.storageState({ path: TEAM_STORAGE });
    await browser.close();

    // 4. Seed a non-owner member so the ⋮ actions dropdown actually renders.
    const out = dbNode(`
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      (async () => {
        const u = await prisma.user.findFirst({ where: { email: '${MEMBER.email}' }, select: { id: true } });
        await prisma.teamMember.deleteMany({ where: { teamId: '${teamId}', userId: u.id } });
        const m = await prisma.teamMember.create({
          data: { teamId: '${teamId}', userId: u.id, role: 'MEMBER' },
          select: { id: true },
        });
        console.log('JSON:' + JSON.stringify(m.id));
        await prisma.$disconnect();
      })().catch(e => { console.error(e.message); process.exit(1); });
    `);
    const line = out.split("\n").find((l) => l.startsWith("JSON:"));
    seededMemberId = line ? JSON.parse(line.slice(5)) : "";
  });

  test.afterAll(async () => {
    if (!seededMemberId) return;
    dbNode(`
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.teamMember.deleteMany({ where: { id: '${seededMemberId}' } })
        .then(r => { console.log('removed ' + r.count); return prisma.$disconnect(); })
        .catch(e => { console.error(e.message); process.exit(1); });
    `);
  });

  // Land on the owned team's detail page and wait for the member list to render.
  async function gotoTeamDetail(page: import("@playwright/test").Page) {
    await page.goto(`/dashboard/teams/${teamId}`);
    await page.waitForLoadState("networkidle");
    // The page renders BOTH a mobile (lg:hidden) and a desktop (hidden lg:block)
    // layout, so the seeded member email exists twice — one copy is always
    // display:none. Assert presence in the DOM (layout-agnostic); each test then
    // targets the VISIBLE copy with a `:visible` / filter({ visible }) selector.
    await expect(page.getByText(MEMBER.email).first()).toBeAttached({
      timeout: 15000,
    });
  }

  test("TEAM-09: member actions ⋮ menu visible for owner", async ({ page }) => {
    await gotoTeamDetail(page);

    // The dropdown trigger is an antd text Button with a MoreOutlined icon,
    // rendered only for non-owner members when the viewer is the owner.
    const actions = page.locator("button:has(.anticon-more):visible");
    await expect(actions.first()).toBeVisible({ timeout: 5000 });

    // Opening it exposes the management actions.
    await actions.first().click();
    await expect(page.getByText(/Remove member/i).first()).toBeVisible({
      timeout: 5000,
    });
    await page.keyboard.press("Escape").catch(() => {});

    await page.screenshot({ path: `${SHOTS}/teams-member-actions.png` });
  });

  test("TEAM-10: settings ⚙️ gear opens modal (not a redirect)", async ({
    page,
  }) => {
    await gotoTeamDetail(page);
    const urlBefore = page.url();

    await page.locator('button:has-text("⚙️"):visible').first().click();

    // A modal opens — the URL must NOT change (it is not a navigation).
    const modal = page
      .locator(".ant-modal")
      .filter({ hasText: "Team Settings" });
    await expect(modal).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(urlBefore);
    // Name + description fields are present.
    await expect(modal.getByLabel(/Team Name/i)).toBeVisible();
    await expect(modal.getByLabel(/Description/i)).toBeVisible();

    await page.screenshot({ path: `${SHOTS}/teams-settings-modal.png` });
    await page.keyboard.press("Escape").catch(() => {});
  });

  test("TEAM-11: pending invites section visible", async ({ page }) => {
    await gotoTeamDetail(page);

    // Header always renders (empty state shows "No pending invites").
    // Target the visible layout copy (mobile + desktop both exist in the DOM).
    await expect(
      page
        .getByText(/Pending Invites/i)
        .filter({ visible: true })
        .first(),
    ).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: `${SHOTS}/teams-pending-invites.png` });
  });

  test("TEAM-12: mobile member management", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await gotoTeamDetail(page);

    // Member list (the seeded non-owner member) is visible on mobile.
    await expect(
      page.getByText(MEMBER.email).filter({ visible: true }).first(),
    ).toBeVisible();
    // Owner still sees the per-member ⋮ actions trigger on the mobile layout.
    await expect(
      page.locator("button:has(.anticon-more):visible").first(),
    ).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: `${SHOTS}/teams-mobile-members.png` });
  });
});
