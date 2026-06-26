/**
 * teams-ui-verify.spec.ts — Teams UI end-to-end verification
 * Login: mry@test.com (team owner with real teams + members).
 *
 * Order per test: UI action → verify UI response → check network → screenshot.
 */
import { test, expect, chromium } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { dbNode } from "./helpers/db";
import { TEST_USERS } from "./helpers/test-users";

const TEAM_STORAGE = path.resolve(__dirname, ".auth", "team.json");
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3002";
const SHOTS = "test-results";
const MEMBER = TEST_USERS.FREE; // freeuser — seeded as non-owner member

let teamId = "";
let seededMemberId = "";

test.use({ storageState: TEAM_STORAGE });

// ─── Setup / Teardown ────────────────────────────────────────────────────────

test.beforeAll(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ baseURL, storageState: undefined });

  // Reuse existing team.json if still valid — avoids hitting the auth rate limiter.
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
      /* fall through to fresh login */
    }
  }

  // Fresh login via NextAuth CSRF + callback (client signIn() broken locally).
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
    throw new Error(
      `[teams-ui-verify] mry login failed: ${JSON.stringify(session)}`,
    );
  }

  // Find a team mry owns.
  const teamsRes = await (await ctx.request.get(`${baseURL}/api/teams`)).json();
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
    throw new Error("[teams-ui-verify] mry owns no team — cannot run suite");
  }
  teamId = owned.id;

  await ctx.storageState({ path: TEAM_STORAGE });
  await browser.close();

  // Seed freeuser as a non-owner member so the ⋮ actions menu renders.
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

// Navigate to the owned team's detail page and wait for the seeded member.
async function gotoTeamDetail(page: import("@playwright/test").Page) {
  await page.goto(`/dashboard/teams/${teamId}`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(MEMBER.email).first()).toBeAttached({
    timeout: 15000,
  });
}

// ─── TEAMS-UI-01: Teams list page loads ──────────────────────────────────────

test("TEAMS-UI-01: teams list page loads with at least one team card", async ({
  page,
}) => {
  // UI action
  await page.goto("/dashboard/teams");
  await page.waitForLoadState("networkidle");

  // Verify: heading visible
  await expect(page.getByRole("heading", { name: /my teams/i })).toBeVisible({
    timeout: 15000,
  });

  // Verify: at least one team card (rounded card with team initial + name)
  const teamCards = page.locator(".rounded-2xl.bg-card");
  await expect(teamCards.first()).toBeVisible({ timeout: 5000 });
  const count = await teamCards.count();
  expect(count).toBeGreaterThanOrEqual(1);

  await page.screenshot({ path: `${SHOTS}/teams-ui-01-list.png` });
});

// ─── TEAMS-UI-02: Team detail page loads ─────────────────────────────────────

test("TEAMS-UI-02: clicking Manage opens team detail with member list", async ({
  page,
}) => {
  // UI action: land on teams list
  await page.goto("/dashboard/teams");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: /my teams/i })).toBeVisible({
    timeout: 15000,
  });

  // Expand the first team card (click the flex-1 expand button)
  const firstCard = page.locator(".rounded-2xl.bg-card").first();
  await expect(firstCard).toBeVisible({ timeout: 5000 });
  await firstCard
    .locator("button.flex-1, button[class*='flex-1']")
    .first()
    .click();

  // Wait for "Manage team" link to appear in the expanded section
  const manageBtn = page.getByRole("button", { name: /manage team/i }).first();
  await expect(manageBtn).toBeVisible({ timeout: 5000 });

  // UI action: click Manage
  await manageBtn.click();

  // Verify: navigated to team detail
  await page.waitForURL("**/teams/**", { timeout: 10000 });
  await page.waitForLoadState("networkidle");

  // Verify: member list has at least one member (the seeded freeuser)
  await expect(page.getByText(MEMBER.email).first()).toBeAttached({
    timeout: 15000,
  });

  await page.screenshot({ path: `${SHOTS}/teams-ui-02-detail.png` });
});

// ─── TEAMS-UI-03: Member actions menu opens ───────────────────────────────────

test("TEAMS-UI-03: member ⋮ menu opens with role-change and remove options", async ({
  page,
}) => {
  await gotoTeamDetail(page);

  // UI action: click the ⋮ button on the seeded non-owner member row (visible copy)
  const actionsBtn = page.locator("button:has(.anticon-more):visible");
  await expect(actionsBtn.first()).toBeVisible({ timeout: 5000 });
  await actionsBtn.first().click();

  // Verify: dropdown is open
  await expect(page.locator(".ant-dropdown:visible").first()).toBeVisible({
    timeout: 5000,
  });

  // Verify: role-change item present (member starts as MEMBER → label is "Change to Admin")
  const roleItem = page
    .locator(".ant-dropdown-menu-item")
    .filter({ hasText: /Change to (Admin|Member)/i })
    .first();
  await expect(roleItem).toBeVisible({ timeout: 5000 });

  // Verify: remove option present
  await expect(
    page
      .locator(".ant-dropdown-menu-item")
      .filter({ hasText: /Remove member/i })
      .first(),
  ).toBeVisible({ timeout: 3000 });

  await page.screenshot({ path: `${SHOTS}/teams-ui-03-actions-menu.png` });

  // Close dropdown
  await page.keyboard.press("Escape").catch(() => {});
});

// ─── TEAMS-UI-04: Role change API returns 200 and badge updates ───────────────

test("TEAMS-UI-04: role change API call succeeds and badge updates", async ({
  page,
}) => {
  await gotoTeamDetail(page);

  // Open ⋮ dropdown
  const actionsBtn = page.locator("button:has(.anticon-more):visible");
  await expect(actionsBtn.first()).toBeVisible({ timeout: 5000 });
  await actionsBtn.first().click();
  await expect(page.locator(".ant-dropdown:visible").first()).toBeVisible({
    timeout: 5000,
  });

  // Set up network intercept BEFORE clicking
  const roleResponsePromise = page.waitForResponse(
    (r) =>
      r.url().includes("/api/teams/") &&
      r.url().includes("/role") &&
      r.request().method() === "PUT",
  );

  // UI action: click role-change item
  const roleItem = page
    .locator(".ant-dropdown-menu-item")
    .filter({ hasText: /Change to (Admin|Member)/i })
    .first();
  await expect(roleItem).toBeVisible({ timeout: 5000 });
  await roleItem.click();

  // Verify: network — API call returns 200
  const roleResponse = await roleResponsePromise;
  expect(roleResponse.status()).toBe(200);

  // Verify UI: no error modal appeared
  await expect(
    page.locator(".ant-modal-confirm, .ant-modal-error").first(),
  ).toHaveCount(0);

  // Verify UI: role badge updated (page refreshes member list after success)
  await page.waitForLoadState("networkidle");
  // The badge now shows Admin (purple) — confirm the member row no longer shows Member-only color
  const adminBadge = page.getByText("Admin").filter({ visible: true }).first();
  await expect(adminBadge).toBeVisible({ timeout: 8000 });

  await page.screenshot({ path: `${SHOTS}/teams-ui-04-role-change.png` });
});

// ─── TEAMS-UI-05: Settings gear opens modal ──────────────────────────────────

test("TEAMS-UI-05: settings gear opens modal without page navigation", async ({
  page,
}) => {
  await gotoTeamDetail(page);
  const urlBefore = page.url();

  // UI action: click ⚙️ button (owner-only, both mobile + desktop render it)
  const gearBtn = page.locator('button:has-text("⚙️"):visible').first();
  await expect(gearBtn).toBeVisible({ timeout: 5000 });
  await gearBtn.click();

  // Verify: modal opened
  const modal = page
    .locator(".ant-modal")
    .filter({ hasText: /Team Settings/i });
  await expect(modal).toBeVisible({ timeout: 5000 });

  // Verify: URL did NOT change (not a navigation)
  await expect(page).toHaveURL(urlBefore);

  // Verify: Team Name input is present
  await expect(
    modal.locator('input[placeholder*="name" i], input[id*="name"]').first(),
  ).toBeVisible({ timeout: 3000 });

  await page.screenshot({ path: `${SHOTS}/teams-ui-05-settings.png` });
  await page.keyboard.press("Escape").catch(() => {});
});

// ─── TEAMS-UI-06: Pending invites section loads with 200 ─────────────────────

test("TEAMS-UI-06: pending invites section visible and API returns 200", async ({
  page,
}) => {
  // Set up network intercept BEFORE navigation (request fires on page load)
  const invitesResponsePromise = page.waitForResponse(
    (r) =>
      r.url().includes("/api/teams/invites") && r.request().method() === "GET",
  );

  // UI action: navigate to team detail
  await page.goto(`/dashboard/teams/${teamId}`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(MEMBER.email).first()).toBeAttached({
    timeout: 15000,
  });

  // Verify: network — invites API returned 200
  const invitesResponse = await invitesResponsePromise;
  expect(invitesResponse.status()).toBe(200);

  // Verify UI: "Pending Invites" section heading visible
  await expect(
    page
      .getByText(/Pending Invites/i)
      .filter({ visible: true })
      .first(),
  ).toBeVisible({ timeout: 5000 });

  await page.screenshot({ path: `${SHOTS}/teams-ui-06-pending-invites.png` });
});

// ─── TEAMS-UI-07: Cancel invite (conditional) ────────────────────────────────

test("TEAMS-UI-07: cancel invite removes it from the list", async ({
  page,
}) => {
  await gotoTeamDetail(page);

  // Check for visible Cancel buttons in the Pending Invites section.
  const cancelBtn = page.locator('button:has-text("Cancel"):visible').first();
  const hasCancelBtn = (await cancelBtn.count()) > 0;

  if (!hasCancelBtn) {
    test.skip(true, "No pending invites exist — skipping cancel test");
    return;
  }

  const invitesBefore = await page
    .locator('button:has-text("Cancel"):visible')
    .count();

  // Set up network intercept BEFORE clicking
  const deleteResponsePromise = page.waitForResponse(
    (r) =>
      r.url().includes("/api/teams/invites/") &&
      r.request().method() === "DELETE",
  );

  // UI action: click Cancel on first invite
  await cancelBtn.click();

  // Verify: network — DELETE returned 200
  const deleteResponse = await deleteResponsePromise;
  expect(deleteResponse.status()).toBe(200);

  // Verify UI: invite disappears from list
  await page.waitForTimeout(500);
  const invitesAfter = await page
    .locator('button:has-text("Cancel"):visible')
    .count();
  expect(invitesAfter).toBe(invitesBefore - 1);

  await page.screenshot({ path: `${SHOTS}/teams-ui-07-cancel-invite.png` });
});
