/**
 * Free → Team Upgrade Data Persistence Test
 *
 * Tests the full lifecycle:
 *   1. New user (free tier, team app)
 *   2. Create flows + shape as free user (teamId = NULL on all rows)
 *   3. Upgrade: team + teamMember created, user.currentVersion = 'team'
 *   4. Verify ALL pre-upgrade data is still visible in team context
 *
 * Guards the shape.service + project.service fix:
 *   NULL-teamId data created as a free user must remain visible after upgrade
 *   creates a team and the frontend starts sending X-Team-Context.
 *
 * Auth strategy: login ONCE per phase and reuse storageState to avoid
 * tripping the auth rate limiter (10 attempts / 15 min per email).
 */

import { test, expect, type BrowserContext } from "@playwright/test";
import { dbNode } from "./helpers/db";

const MRY_EMAIL = "mry@test.com";
const MRY_PASSWORD = "test1234";
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3002";

test.use({ storageState: { cookies: [], origins: [] } });
test.setTimeout(120_000);

// ─── DB helpers ──────────────────────────────────────────────────────────────

function deleteMryUser() {
  dbNode(`
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    (async () => {
      const user = await p.user.findFirst({ where: { email: '${MRY_EMAIL}' }, select: { id: true } });
      if (!user) { console.log('not found'); await p.$disconnect(); return; }
      const uid = user.id;
      await p.subscription.deleteMany({ where: { userId: uid } });
      await p.subscriptionHistory.deleteMany({ where: { userId: uid } });
      await p.teamMember.deleteMany({ where: { userId: uid } });
      await p.team.deleteMany({ where: { teamOwnerId: uid } });
      await p.user.delete({ where: { id: uid } });
      console.log('deleted:' + uid);
      await p.$disconnect();
    })().catch(e => { console.error(e.message); process.exit(1); });
  `);
}

function createMryUser(): string {
  const out = dbNode(`
    const { PrismaClient } = require('@prisma/client');
    const argon2 = require('argon2');
    const { createId } = require('@paralleldrive/cuid2');
    const p = new PrismaClient();
    (async () => {
      const hash = await argon2.hash('${MRY_PASSWORD}');
      const user = await p.user.create({
        data: {
          id: createId(),
          name: 'Mry Test',
          email: '${MRY_EMAIL}',
          password: hash,
          currentVersion: 'free',
          emailVerified: new Date(),
        },
      });
      console.log('USERID:' + user.id);
      await p.$disconnect();
    })().catch(e => { console.error(e.message); process.exit(1); });
  `);
  const line = out.split("\n").find((l) => l.startsWith("USERID:"));
  if (!line) throw new Error(`createMryUser failed:\n${out}`);
  return line.slice(7).trim();
}

function getMryVersion(): string {
  const out = dbNode(`
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    p.user.findFirst({ where: { email: '${MRY_EMAIL}' }, select: { currentVersion: true } })
      .then(u => { console.log('VER:' + (u?.currentVersion ?? 'null')); return p.$disconnect(); })
      .catch(e => { console.error(e.message); process.exit(1); });
  `);
  const line = out.split("\n").find((l) => l.startsWith("VER:"));
  return line ? line.slice(4).trim() : "unknown";
}

function simulateTeamUpgrade(userId: string): string {
  const out = dbNode(`
    const { PrismaClient } = require('@prisma/client');
    const { createId } = require('@paralleldrive/cuid2');
    const p = new PrismaClient();
    (async () => {
      const team = await p.team.create({
        data: {
          id: createId(),
          name: "Mry's Team",
          teamOwnerId: '${userId}',
          appContext: 'team',
        },
      });
      await p.teamMember.create({
        data: { teamId: team.id, userId: '${userId}', role: 'owner' },
      });
      await p.user.update({
        where: { id: '${userId}' },
        data: { currentVersion: 'team' },
      });
      console.log('TEAMID:' + team.id);
      await p.$disconnect();
    })().catch(e => { console.error(e.message); process.exit(1); });
  `);
  const line = out.split("\n").find((l) => l.startsWith("TEAMID:"));
  if (!line) throw new Error(`simulateTeamUpgrade failed:\n${out}`);
  return line.slice(7).trim();
}

// ─── Auth helper — login ONCE, return saved storageState ─────────────────────

async function loginAndSaveState(browser: import("@playwright/test").Browser) {
  const ctx = await browser.newContext();
  const req = ctx.request;
  const csrfRes = await req.get(`${BASE_URL}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  await req.post(`${BASE_URL}/api/auth/callback/credentials`, {
    form: {
      csrfToken,
      email: MRY_EMAIL,
      password: MRY_PASSWORD,
      json: "true",
      callbackUrl: BASE_URL,
    },
  });
  const session = await req
    .get(`${BASE_URL}/api/auth/session`)
    .then((r) => r.json());
  if (!session?.user?.email) {
    await ctx.close();
    throw new Error(`loginMry failed: ${JSON.stringify(session)}`);
  }
  const state = await ctx.storageState();
  await ctx.close();
  return state;
}

// ─── API helpers — use pre-saved storageState ─────────────────────────────────

async function withCtx<T>(
  browser: import("@playwright/test").Browser,
  state: object,
  fn: (ctx: BrowserContext) => Promise<T>,
): Promise<T> {
  const ctx = await browser.newContext({ storageState: state as never });
  try {
    return await fn(ctx);
  } finally {
    await ctx.close();
  }
}

async function apiPost(
  ctx: BrowserContext,
  path: string,
  body: object,
  teamId?: string,
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-App-Context": "team",
  };
  if (teamId) headers["X-Team-Context"] = teamId;
  return ctx.request
    .post(`${BASE_URL}${path}`, { data: body, headers })
    .then((r) => r.json());
}

async function apiGet(ctx: BrowserContext, path: string, teamId?: string) {
  const headers: Record<string, string> = { "X-App-Context": "team" };
  if (teamId) headers["X-Team-Context"] = teamId;
  return ctx.request
    .get(`${BASE_URL}${path}`, { headers })
    .then((r) => r.json());
}

// ═══════════════════════════════════════════════════════════════════════════
// Test Suite
// ═══════════════════════════════════════════════════════════════════════════

test.describe("Free → Team Upgrade: Data Persistence", () => {
  let userId = "";
  let teamId = "";
  let freeState: object; // session cookies as free user
  let teamState: object; // session cookies after upgrade

  // ── SETUP ─────────────────────────────────────────────────────────────────

  test.beforeAll(async ({ browser }) => {
    deleteMryUser();
    userId = createMryUser();
    // Login once — reused by all free-tier tests (avoids rate limiter)
    freeState = await loginAndSaveState(browser);
  });

  test.afterAll(() => {
    deleteMryUser();
  });

  // ── Part 1: Verify free status ────────────────────────────────────────────

  test("P1-01: login succeeds", async ({ browser }) => {
    await withCtx(browser, freeState, async (ctx) => {
      const session = await ctx.request
        .get(`${BASE_URL}/api/auth/session`)
        .then((r) => r.json());
      expect(session?.user?.email).toBe(MRY_EMAIL);
    });
  });

  test("P1-02: user is free tier (DB check)", () => {
    expect(getMryVersion()).toBe("free");
  });

  test("P1-03: dashboard loads without redirect to login", async ({
    browser,
  }) => {
    await withCtx(browser, freeState, async (ctx) => {
      const page = await ctx.newPage();
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState("networkidle");
      await expect(page).not.toHaveURL(/login/);
    });
  });

  // ── Part 2: Create data as free user (teamId = NULL on all rows) ──────────

  test("P2-01: create Flow 1 as free user", async ({ browser }) => {
    await withCtx(browser, freeState, async (ctx) => {
      const res = await apiPost(ctx, "/api/flows", {
        name: "[E2E] Free Tier Flow 1",
      });
      const id = res?.data?.id ?? res?.id;
      expect(id, `Flow 1 create failed: ${JSON.stringify(res)}`).toBeTruthy();
      const check = await apiGet(ctx, `/api/flows/${id}`);
      expect(check?.data?.teamId ?? check?.teamId ?? null).toBeNull();
    });
  });

  test("P2-02: create Flow 2 as free user", async ({ browser }) => {
    await withCtx(browser, freeState, async (ctx) => {
      const res = await apiPost(ctx, "/api/flows", {
        name: "[E2E] Free Tier Flow 2",
      });
      const id = res?.data?.id ?? res?.id;
      expect(id, `Flow 2 create failed: ${JSON.stringify(res)}`).toBeTruthy();
    });
  });

  test("P2-03: create Shape Group as free user (workspace_team_id = NULL)", async ({
    browser,
  }) => {
    await withCtx(browser, freeState, async (ctx) => {
      const res = await apiPost(ctx, "/api/shape-groups", {
        name: "[E2E] Free Tier Shape",
      });
      const id = res?.data?.id ?? res?.id;
      expect(
        id,
        `Shape group create failed: ${JSON.stringify(res)}`,
      ).toBeTruthy();
      const groups = await apiGet(ctx, "/api/shape-groups");
      const list = groups?.data ?? groups ?? [];
      const saved = list.find((g: { id: string }) => g.id === id);
      expect(saved, "New shape group must appear in list").toBeTruthy();
      // workspace_team_id must be null — no team exists yet for this user
      expect(saved?.teamId ?? null).toBeNull();
    });
  });

  test("P2-04: both flows and shape visible before upgrade", async ({
    browser,
  }) => {
    await withCtx(browser, freeState, async (ctx) => {
      const flowsRes = await apiGet(ctx, "/api/flows");
      const flowList =
        flowsRes?.data?.flows ?? flowsRes?.flows ?? flowsRes?.data ?? [];
      const e2eFlows = flowList.filter((f: { name: string }) =>
        f.name.startsWith("[E2E]"),
      );
      expect(e2eFlows.length, "Should see 2 pre-upgrade flows").toBe(2);

      const shapesRes = await apiGet(ctx, "/api/shape-groups");
      const shapeList = shapesRes?.data ?? shapesRes ?? [];
      const e2eShapes = shapeList.filter((s: { name: string }) =>
        s.name.startsWith("[E2E]"),
      );
      expect(e2eShapes.length, "Should see 1 pre-upgrade shape group").toBe(1);
    });
  });

  test("P2-05: subscription page loads and shows plans", async ({
    browser,
  }) => {
    await withCtx(browser, freeState, async (ctx) => {
      const page = await ctx.newPage();
      await page.goto(`${BASE_URL}/dashboard/subscription`);
      await page.waitForLoadState("networkidle");
      await expect(page.getByText(/plan|monthly|team/i).first()).toBeVisible({
        timeout: 10000,
      });
    });
  });

  // ── Part 3: Upgrade ───────────────────────────────────────────────────────

  test("P3-01: simulate team upgrade — team created, user = team tier", async ({
    browser,
  }) => {
    teamId = simulateTeamUpgrade(userId);
    expect(teamId, "Team ID must be created").toBeTruthy();
    // Login again after upgrade — JWT now carries team-tier data
    teamState = await loginAndSaveState(browser);
  });

  test("P3-02: user currentVersion is now team (DB check)", () => {
    expect(getMryVersion()).toBe("team");
  });

  // ── Part 4: Create chat group (post-upgrade, with teamId) ─────────────────

  test("P4-01: create chat group after upgrade", async ({ browser }) => {
    await withCtx(browser, teamState, async (ctx) => {
      const res = await apiPost(
        ctx,
        "/api/chat/groups",
        { title: "[E2E] Test Group", teamId },
        teamId,
      );
      const id = res?.data?.id ?? res?.id;
      expect(
        id,
        `Chat group create failed: ${JSON.stringify(res)}`,
      ).toBeTruthy();
    });
  });

  // ── Part 5: Verify pre-upgrade data still visible ─────────────────────────

  test("P5-01: flows visible in team context (API) — flow.service", async ({
    browser,
  }) => {
    await withCtx(browser, teamState, async (ctx) => {
      const res = await apiGet(ctx, "/api/flows", teamId);
      const list = res?.data?.flows ?? res?.flows ?? res?.data ?? [];
      const e2e = list.filter((f: { name: string }) =>
        f.name.startsWith("[E2E]"),
      );
      expect(
        e2e.length,
        `Expected 2 pre-upgrade flows with X-Team-Context. ` +
          `Got: ${JSON.stringify(list.map((f: { name: string }) => f.name))}`,
      ).toBe(2);
    });
  });

  test("P5-02: shapes visible in team context (API) — shape.service fix", async ({
    browser,
  }) => {
    await withCtx(browser, teamState, async (ctx) => {
      const res = await apiGet(ctx, "/api/shape-groups", teamId);
      const list = res?.data ?? res ?? [];
      const e2e = list.filter((s: { name: string }) =>
        s.name.startsWith("[E2E]"),
      );
      expect(
        e2e.length,
        `Shape created BEFORE upgrade must still be visible AFTER upgrade with X-Team-Context. ` +
          `This is the core regression for shape.service isOwnTeamAppTeam fix. ` +
          `Got: ${JSON.stringify(list.map((s: { name: string }) => s.name))}`,
      ).toBeGreaterThanOrEqual(1);
    });
  });

  test("P5-03: flows page shows pre-upgrade flows in browser UI", async ({
    browser,
  }) => {
    await withCtx(browser, teamState, async (ctx) => {
      const page = await ctx.newPage();
      await page.goto(`${BASE_URL}/dashboard`);
      await page.evaluate(
        (tid) => localStorage.setItem("vc_ai_billing_team", tid),
        teamId,
      );
      await page.goto(`${BASE_URL}/dashboard/flows`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      const body = await page.locator("body").innerText();
      expect(body, "Flow 1 must be visible in UI after upgrade").toContain(
        "[E2E] Free Tier Flow 1",
      );
      expect(body, "Flow 2 must be visible in UI after upgrade").toContain(
        "[E2E] Free Tier Flow 2",
      );
    });
  });

  test("P5-04: shapes page shows pre-upgrade shape in browser UI", async ({
    browser,
  }) => {
    await withCtx(browser, teamState, async (ctx) => {
      const page = await ctx.newPage();
      await page.goto(`${BASE_URL}/dashboard`);
      await page.evaluate(
        (tid) => localStorage.setItem("vc_ai_billing_team", tid),
        teamId,
      );
      await page.goto(`${BASE_URL}/dashboard/shapes`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      const body = await page.locator("body").innerText();
      expect(
        body,
        "Free-tier shape must be visible in UI after upgrade (shape.service fix)",
      ).toContain("[E2E] Free Tier Shape");
    });
  });

  test("P5-05: chat group visible after upgrade", async ({ browser }) => {
    await withCtx(browser, teamState, async (ctx) => {
      const res = await apiGet(ctx, "/api/chat/groups", teamId);
      const list: { title?: string }[] = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
          ? res
          : [];
      const e2e = list.find((g) => g.title?.includes("[E2E] Test Group"));
      expect(
        e2e,
        "Chat group created post-upgrade must be visible",
      ).toBeTruthy();
    });
  });

  test("P5-06: no data loss — 2 flows + 1 shape + 1 chat all present", async ({
    browser,
  }) => {
    await withCtx(browser, teamState, async (ctx) => {
      const [flowsRes, shapesRes, chatRes] = await Promise.all([
        apiGet(ctx, "/api/flows", teamId),
        apiGet(ctx, "/api/shape-groups", teamId),
        apiGet(ctx, "/api/chat/groups", teamId),
      ]);

      const flowArr: { name: string }[] = Array.isArray(flowsRes?.data?.flows)
        ? flowsRes.data.flows
        : Array.isArray(flowsRes?.flows)
          ? flowsRes.flows
          : Array.isArray(flowsRes?.data)
            ? flowsRes.data
            : [];
      const flows = flowArr.filter((f) => f.name.startsWith("[E2E]"));

      const shapeArr: { name: string }[] = Array.isArray(shapesRes?.data)
        ? shapesRes.data
        : Array.isArray(shapesRes)
          ? shapesRes
          : [];
      const shapes = shapeArr.filter((s) => s.name.startsWith("[E2E]"));

      const chatArr: { title?: string }[] = Array.isArray(chatRes?.data)
        ? chatRes.data
        : Array.isArray(chatRes)
          ? chatRes
          : [];
      const chats = chatArr.filter((g) => g.title?.includes("[E2E]"));

      expect(flows.length, "2 pre-upgrade flows must survive upgrade").toBe(2);
      expect(
        shapes.length,
        "1 pre-upgrade shape must survive upgrade",
      ).toBeGreaterThanOrEqual(1);
      expect(chats.length, "1 post-upgrade chat must exist").toBe(1);
    });
  });
});
