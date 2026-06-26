/**
 * teams-verify.spec.ts — Teams E2E verification suite
 * Uses mry@test.com (TEAM user) who owns real teams.
 * Requires team.json storageState (created by FEAT-007 beforeAll or global-setup).
 */
import { test, expect, chromium } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { dbNode } from "./helpers/db";
import { TEST_USERS } from "./helpers/test-users";

const TEAM_STORAGE = path.resolve(__dirname, ".auth", "team.json");
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3002";
const SHOTS = "test-results";
const MEMBER = TEST_USERS.FREE; // freeuser seeded as non-owner

let teamId = "";
let seededMemberId = "";

test.use({ storageState: TEAM_STORAGE });

test.beforeAll(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ baseURL, storageState: undefined });

  // Reuse existing team.json session if still valid — avoids auth rate limiter.
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

  // Fresh login via NextAuth CSRF+callback (client signIn() broken locally).
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
      `[teams-verify] mry login failed: ${JSON.stringify(session)}`,
    );
  }

  // Discover a team mry owns.
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
    throw new Error("[teams-verify] mry owns no team — cannot run suite");
  }
  teamId = owned.id;

  await ctx.storageState({ path: TEAM_STORAGE });
  await browser.close();

  // Seed a non-owner member so the ⋮ actions dropdown renders.
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

async function gotoTeamDetail(page: import("@playwright/test").Page) {
  await page.goto(`/dashboard/teams/${teamId}`);
  await page.waitForLoadState("networkidle");
  // Both mobile+desktop layouts render the member email — wait for DOM attach.
  await expect(page.getByText(MEMBER.email).first()).toBeAttached({
    timeout: 15000,
  });
}

// ─── VERIFY-01: Team page loads ───────────────────────────────────────────────
test("VERIFY-01: team page loads and shows teams list", async ({ page }) => {
  await page.goto("/dashboard/teams");
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("heading", { name: /my teams/i })).toBeVisible({
    timeout: 15000,
  });

  await page.screenshot({ path: `${SHOTS}/verify-teams-list.png` });
});

// ─── VERIFY-02: Team detail page loads ───────────────────────────────────────
test("VERIFY-02: team detail page loads and shows member list", async ({
  page,
}) => {
  await gotoTeamDetail(page);

  // Member list area is present (seeded member email is in the DOM).
  await expect(page.getByText(MEMBER.email).first()).toBeAttached();
  // No error message visible.
  await expect(page.getByText(/^(Error|500)$/).first()).toHaveCount(0);

  await page.screenshot({ path: `${SHOTS}/verify-team-detail.png` });
});

// ─── VERIFY-03: Member actions ⋮ button visible ───────────────────────────────
test("VERIFY-03: member actions ⋮ button visible on member rows", async ({
  page,
}) => {
  await gotoTeamDetail(page);

  const actionsBtn = page.locator("button:has(.anticon-more):visible");
  await expect(actionsBtn.first()).toBeVisible({ timeout: 5000 });

  await page.screenshot({ path: `${SHOTS}/verify-member-actions.png` });
});

// ─── VERIFY-04: Role change works ────────────────────────────────────────────
test("VERIFY-04: role change works without error", async ({ page }) => {
  await gotoTeamDetail(page);

  const actionsBtn = page.locator("button:has(.anticon-more):visible");
  await actionsBtn.first().click();

  // Wait for the dropdown to fully render.
  await expect(page.locator(".ant-dropdown:visible").first()).toBeVisible({
    timeout: 5000,
  });

  // The seeded member has role MEMBER, so the label is "Change to Admin".
  const roleItem = page
    .locator(".ant-dropdown-menu-item")
    .filter({ hasText: /Change to (Admin|Member)/i })
    .first();
  await expect(roleItem).toBeVisible({ timeout: 5000 });
  await roleItem.click();

  // Assert the role updated: the dropdown menu should now offer the REVERSE label,
  // meaning the member list refreshed with the new role.
  // Wait for network idle (member list reload) then reopen to confirm.
  await page.waitForLoadState("networkidle");

  // No error modal must have appeared.
  await expect(
    page.locator(".ant-modal-confirm, .ant-modal-error").first(),
  ).toHaveCount(0);

  // Re-open the ⋮ menu and verify the role toggled (label is now the opposite).
  await actionsBtn.first().click();
  await expect(page.locator(".ant-dropdown:visible").first()).toBeVisible({
    timeout: 5000,
  });
  const reverseItem = page
    .locator(".ant-dropdown-menu-item")
    .filter({ hasText: /Change to (Admin|Member)/i })
    .first();
  await expect(reverseItem).toBeVisible({ timeout: 5000 });
  // The label must have changed (confirming round-trip success).
  const labelAfter = await reverseItem.textContent();
  // After "Change to Admin" was clicked, the new label must be "Change to Member".
  expect(labelAfter).toMatch(/Change to Member/i);
  await page.keyboard.press("Escape").catch(() => {});

  await page.screenshot({ path: `${SHOTS}/verify-role-change.png` });
});

// ─── VERIFY-05: Settings gear opens modal ────────────────────────────────────
test("VERIFY-05: settings gear opens modal with team name field", async ({
  page,
}) => {
  await gotoTeamDetail(page);
  const urlBefore = page.url();

  // Owner sees a ⚙️ settings button in both mobile + desktop layouts.
  const gearBtn = page
    .locator(
      'button:has-text("⚙️"):visible, button[aria-label*="settings" i]:visible',
    )
    .first();
  await expect(gearBtn).toBeVisible({ timeout: 5000 });
  await gearBtn.click();

  // Modal opens — URL must NOT change.
  const modal = page
    .locator(".ant-modal")
    .filter({ hasText: /Team Settings/i });
  await expect(modal).toBeVisible({ timeout: 5000 });
  await expect(page).toHaveURL(urlBefore);

  // Team name input is visible inside the modal.
  const nameInput = modal
    .locator('input[id*="name"], input[placeholder*="name" i], input')
    .first();
  await expect(nameInput).toBeVisible({ timeout: 3000 });

  await page.screenshot({ path: `${SHOTS}/verify-settings-modal.png` });
  await page.keyboard.press("Escape").catch(() => {});
});

// ─── VERIFY-06: Pending invites section visible ───────────────────────────────
test("VERIFY-06: pending invites section is visible", async ({ page }) => {
  await gotoTeamDetail(page);

  await expect(
    page
      .getByText(/Pending Invites/i)
      .filter({ visible: true })
      .first(),
  ).toBeVisible({ timeout: 5000 });

  await page.screenshot({ path: `${SHOTS}/verify-pending-invites.png` });
});

// ─── VERIFY-07: Cancel invite (conditional) ──────────────────────────────────
test("VERIFY-07: cancel invite removes it from pending list", async ({
  page,
}) => {
  await gotoTeamDetail(page);

  // Check for cancel buttons in the pending invites section.
  const cancelBtn = page.locator('button:has-text("Cancel"):visible').first();

  const hasCancelBtn = (await cancelBtn.count()) > 0;
  if (!hasCancelBtn) {
    test.skip(true, "No pending invites to cancel");
    return;
  }

  // Count invites before cancellation.
  const invitesBefore = await page
    .locator('button:has-text("Cancel"):visible')
    .count();

  await cancelBtn.click();

  // Success message appears.
  await expect(
    page
      .locator(".ant-message-notice, .ant-notification-notice")
      .filter({ hasText: /cancel|success/i })
      .first(),
  ).toBeVisible({ timeout: 5000 });

  // List shrinks by 1.
  await page.waitForTimeout(500);
  const invitesAfter = await page
    .locator('button:has-text("Cancel"):visible')
    .count();
  expect(invitesAfter).toBe(invitesBefore - 1);

  await page.screenshot({ path: `${SHOTS}/verify-cancel-invite.png` });
});
