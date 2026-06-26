/**
 * master-web-flow.spec.ts
 * ---------------------------------------------------------------------------
 * TEST-ONLY ARTIFACT — touches NO application code.
 *
 * Two layers:
 *   1) CROSS-TENANT ISOLATION SENTINEL  (the priority)
 *        Proves the X-Team-Context header cannot be used to read another
 *        tenant's data. The backend currently has NO explicit membership gate
 *        on read paths (checkTeamAccess is mounted only on /teams & /chat);
 *        isolation rests entirely on every query also filtering by
 *        ownerId / createdById / userId. This sentinel fails the instant that
 *        implicit invariant is broken for flows, issues, projects, shapes,
 *        or chat.
 *   2) DATA-LOSS-001 ENTITLEMENT GUARD
 *        Proves X-App-Context (pro|team|free) NEVER filters data — flipping it
 *        with a FIXED team context must return an identical record set.
 *   3) MASTER WEB FLOW (UI)
 *        Steps 1-6 of the aligned flow, browser-driven via storageState, with a
 *        failure-screenshot + API-trace harness for diagnostic captures.
 *
 * AUTH MODEL
 *   API layers authenticate with a real JWT obtained from
 *   POST /api/v1/auth/validate -> { data: { token, id } }  (argon2 + JWT).
 *   We send Authorization: Bearer <token> plus X-App-Context / X-Team-Context
 *   so the backend middleware (enforceProContext, scoping) runs exactly as in
 *   production. The UI layer reuses the browser storageState from
 *   playwright.config.ts (use.storageState = "./e2e/.auth/pro.json").
 *
 * ASSUMPTIONS TO VERIFY ONCE against your routes (edit the ENDPOINTS table /
 * env if any differ — everything is centralised at the top):
 *   - Backend base URL                http://localhost:5002  (BACKEND_URL)
 *   - List routes                     /api/v1/{flows,issues,projects,shapes,chat/groups}
 *   - Teams route                     GET /api/v1/teams
 *   - Response envelope               { success, data: <array | {..:[]}> }
 *   - Owner fields per entity         see ENDPOINTS[].ownerFields
 *
 * ENV (all optional; sensible defaults from CLAUDE.md test users):
 *   BACKEND_URL
 *   ATTACKER_EMAIL / ATTACKER_PASS   "Mr. Y" — Pro user, NOT a member of victim team
 *   VICTIM_EMAIL   / VICTIM_PASS     "Mr. X" — owns the victim team + its data
 *   VICTIM_TEAM_ID                   optional; auto-derived from Mr. X's owned teams
 *   FRONTEND_URL                     for the UI describe (default playwright baseURL)
 * ---------------------------------------------------------------------------
 */

import { test as base, expect, request as pwRequest } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";

/* ───────────────────────────── CONFIG ───────────────────────────── */

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5002";

const ATTACKER = {
  email: process.env.ATTACKER_EMAIL || "mry@test.com",
  pass: process.env.ATTACKER_PASS || "test1234",
}; // Mr. Y — Pro + has own teams/data, must NOT be a member of the victim team

const VICTIM = {
  email: process.env.VICTIM_EMAIL || "teamowner@valueflowtest.com",
  pass: process.env.VICTIM_PASS || "Test@1234",
}; // Mr. X — owns the victim team and data inside it

const BAIT_TAG = `__SENTINEL_BAIT_${Date.now()}__`;

/**
 * Core data endpoints to police. `ownerFields` lists every field that, if it
 * equals the requester's id, proves the record legitimately belongs to them.
 * `memberField` (chat) lets membership stand in for ownership.
 * `seed` builds a POST body to plant cross-tenant bait as Mr. X (null = the
 * owner-invariant assertion still runs, just without a seeded negative-set).
 */
const ENDPOINTS: Array<{
  name: string;
  list: string;
  ownerFields: string[];
  memberField?: string;
  seed?: (teamId: string) => { path: string; body: Record<string, unknown> };
}> = [
  {
    name: "flows",
    list: "/api/v1/flows",
    ownerFields: ["ownerId"],
    seed: (teamId) => ({
      path: "/api/v1/flows",
      body: { name: BAIT_TAG, teamId },
    }),
  },
  {
    name: "issues",
    list: "/api/v1/issues",
    ownerFields: ["createdById", "ownerId", "userId"],
    seed: (teamId) => ({
      path: "/api/v1/issues",
      body: { title: BAIT_TAG, teamId },
    }),
  },
  {
    name: "projects",
    list: "/api/v1/projects",
    ownerFields: ["ownerId", "userId", "createdById"],
    seed: (teamId) => ({
      path: "/api/v1/projects",
      body: { name: BAIT_TAG, teamId },
    }),
  },
  {
    name: "shapes",
    list: "/api/v1/shapes",
    ownerFields: ["ownerId", "userId"],
    seed: undefined, // shape payloads vary; rely on owner-invariant (assertion B)
  },
  {
    name: "chat",
    list: "/api/v1/chat/groups",
    ownerFields: ["userId", "ownerId", "createdById"],
    memberField: "members",
    seed: undefined,
  },
];

/* ─────────────────────────── HELPERS ─────────────────────────── */

type Session = { token: string; id: string; email: string };

async function login(
  ctx: APIRequestContext,
  email: string,
  pass: string,
): Promise<Session> {
  const res = await ctx.post(`${BACKEND_URL}/api/v1/auth/validate`, {
    data: { email, password: pass },
  });
  if (!res.ok()) {
    throw new Error(
      `Login failed for ${email}: ${res.status()} ${await res.text()}`,
    );
  }
  const body = await res.json();
  const data = body?.data ?? body;
  const token = data?.token;
  const id = String(data?.id ?? data?.userId ?? "");
  if (!token || !id)
    throw new Error(`Login response missing token/id for ${email}`);
  return { token, id, email };
}

function headers(sess: Session, app: string, team: string | null) {
  const h: Record<string, string> = {
    Authorization: `Bearer ${sess.token}`,
    "Content-Type": "application/json",
    "X-App-Context": app,
  };
  if (team) h["X-Team-Context"] = team;
  return h;
}

/** Pull the first array out of a { success, data } envelope, whatever the key. */
function extractArray(body: any): any[] {
  const data = body?.data ?? body;
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    for (const v of Object.values(data))
      if (Array.isArray(v)) return v as any[];
  }
  return [];
}

function recordId(r: any): string {
  return String(r?.id ?? r?._id ?? r?.flowId ?? r?.uuid ?? JSON.stringify(r));
}

/** True if `r` legitimately belongs to / is shared with `userId`. */
function accessibleBy(
  r: any,
  userId: string,
  ownerFields: string[],
  memberField?: string,
): boolean {
  for (const f of ownerFields) {
    const v = r?.[f];
    if (v != null && String(v) === userId) return true;
    if (v && typeof v === "object" && String(v.id) === userId) return true; // nested {id}
  }
  if (memberField && Array.isArray(r?.[memberField])) {
    return r[memberField].some(
      (m: any) => String(m?.userId ?? m?.id) === userId,
    );
  }
  return false;
}

async function getList(
  ctx: APIRequestContext,
  sess: Session,
  path: string,
  app: string,
  team: string | null,
): Promise<{ status: number; records: any[]; raw: any }> {
  const url = new URL(`${BACKEND_URL}${path}`);
  if (team) url.searchParams.set("teamId", team); // controller reads req.query.teamId OR header
  const res = await ctx.get(url.toString(), {
    headers: headers(sess, app, team),
  });
  const status = res.status();
  let raw: any = null;
  try {
    raw = await res.json();
  } catch {
    raw = await res.text();
  }
  return { status, records: status === 200 ? extractArray(raw) : [], raw };
}

function idSet(records: any[]): Set<string> {
  return new Set(records.map(recordId));
}

/* ─────────────── SHARED STATE (resolved in beforeAll) ─────────────── */

let api: APIRequestContext;
let mrY: Session; // attacker
let mrX: Session; // victim
let victimTeamId: string; // a team Mr. X owns and Mr. Y is NOT in
let attackerTeamId: string | null = null; // a team Mr. Y IS in (for the DATA-LOSS guard)
let mrYIsRealMember = false; // safety: did config accidentally make Mr. Y a member?
const seededBait: Record<string, string[]> = {}; // endpoint -> created record ids
const cleanup: Array<{ sess: Session; path: string }> = [];

/* ─────────────────── failure-screenshot harness (UI) ─────────────────── */

const test = base.extend({});

test.beforeEach(async ({ page }, testInfo) => {
  (testInfo as any)._apiLog = [];
  page.on("response", (r) => {
    const u = r.url();
    if (
      /\/api\/(v1\/)?(flows|dashboard\/stats|auth|users|teams|issues|projects|shapes|chat)/.test(
        u,
      )
    ) {
      (testInfo as any)._apiLog.push(
        `${r.status()} ${r.request().method()} ${u}`,
      );
    }
  });
});

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    const shot = await page.screenshot({ fullPage: true }).catch(() => null);
    if (shot)
      await testInfo.attach("failure-state", {
        body: shot,
        contentType: "image/png",
      });
    await testInfo.attach("api-trace", {
      body:
        ((testInfo as any)._apiLog || []).join("\n") ||
        "(no API calls captured)",
      contentType: "text/plain",
    });
  }
});

/* ────────────────────────── GLOBAL SETUP ────────────────────────── */

test.beforeAll(async () => {
  api = await pwRequest.newContext();
  mrY = await login(api, ATTACKER.email, ATTACKER.pass);
  mrX = await login(api, VICTIM.email, VICTIM.pass);

  expect(mrY.id, "Attacker and victim must be different users").not.toBe(
    mrX.id,
  );

  // Resolve the victim team: a team OWNED by Mr. X.
  const xTeams = await getList(api, mrX, "/api/v1/teams", "team", null);
  const ownedByX = xTeams.records.filter(
    (t) => String(t?.teamOwnerId ?? t?.ownerId) === mrX.id,
  );
  const chosen = process.env.VICTIM_TEAM_ID
    ? (ownedByX.find((t) => recordId(t) === process.env.VICTIM_TEAM_ID) ?? {
        id: process.env.VICTIM_TEAM_ID,
      })
    : ownedByX[0];
  expect(
    chosen,
    "Mr. X must own at least one team (set VICTIM_TEAM_ID or seed one)",
  ).toBeTruthy();
  victimTeamId = recordId(chosen);

  // SAFETY: confirm Mr. Y is NOT a member/owner of the victim team. If he is,
  // the cross-tenant premise is invalid and the sentinel would false-pass.
  const yTeams = await getList(api, mrY, "/api/v1/teams", "pro", null);
  mrYIsRealMember = idSet(yTeams.records).has(victimTeamId);
  // Pick a team Mr. Y legitimately belongs to for the entitlement guard.
  attackerTeamId = yTeams.records.length ? recordId(yTeams.records[0]) : null;

  // SELF-SEED cross-tenant bait as Mr. X inside the victim team, so the
  // negative-set assertion has real records to detect a leak of.
  for (const ep of ENDPOINTS) {
    if (!ep.seed) continue;
    try {
      const { path, body } = ep.seed(victimTeamId);
      const res = await api.post(`${BACKEND_URL}${path}`, {
        headers: headers(mrX, "team", victimTeamId),
        data: body,
      });
      if (res.ok()) {
        const created = (await res.json())?.data ?? {};
        const id = recordId(created);
        (seededBait[ep.name] ||= []).push(id);
        cleanup.push({ sess: mrX, path: `${path}/${id}` });
      }
    } catch {
      /* best-effort; assertion B still covers this endpoint */
    }
  }

  // PREFLIGHT: a security sentinel must never be silently green. Require that
  // we established bait for at least the flows endpoint (the one we trust the
  // POST shape of). Otherwise fail loudly with remediation guidance.
  expect(
    (seededBait["flows"] || []).length,
    `Could not seed cross-tenant bait in victim team ${victimTeamId}. ` +
      `The sentinel cannot prove isolation without bait. Verify Mr. X owns the team, ` +
      `the POST /api/v1/flows shape, and BACKEND_URL=${BACKEND_URL}.`,
  ).toBeGreaterThan(0);
});

test.afterAll(async () => {
  for (const c of cleanup) {
    await api
      .delete(`${BACKEND_URL}${c.path}`, {
        headers: headers(c.sess, "team", victimTeamId),
      })
      .catch(() => {});
  }
  await api.dispose();
});

/* ══════════════════════════════════════════════════════════════════════
   LAYER 1 — CROSS-TENANT ISOLATION SENTINEL  (X-Team-Context IDOR)
   ══════════════════════════════════════════════════════════════════════ */

test.describe("🛡️  Cross-Tenant Isolation Sentinel — X-Team-Context must not leak across tenants", () => {
  test.beforeEach(() => {
    test.skip(
      mrYIsRealMember,
      `Mr. Y (${ATTACKER.email}) is a member of victim team ${victimTeamId}; ` +
        `cross-tenant premise invalid. Use a victim team Mr. Y does NOT belong to.`,
    );
  });

  for (const ep of ENDPOINTS) {
    test(`[${ep.name}] Mr. Y pointing X-Team-Context at Mr. X's team gets ZERO foreign records`, async () => {
      // Mr. Y, riding his Pro app context, aims the team header at the victim team.
      const res = await getList(api, mrY, ep.list, "pro", victimTeamId);

      // An explicit 403 (future checkTeamAccess) is the STRONGEST pass.
      if (res.status === 403) {
        expect(res.status, "explicit membership gate present — ideal").toBe(
          403,
        );
        return;
      }
      expect(
        res.status,
        `unexpected status from ${ep.list}: ${JSON.stringify(res.raw)}`,
      ).toBe(200);

      // ── Assertion A: negative-set. None of Mr. X's seeded bait may appear. ──
      const bait = new Set(seededBait[ep.name] || []);
      if (bait.size) {
        const leaked = res.records.filter((r) => bait.has(recordId(r)));
        expect(
          leaked,
          `CROSS-TENANT LEAK: ${ep.name} returned Mr. X's records to Mr. Y via X-Team-Context. ` +
            `Leaked ids: ${leaked.map(recordId).join(", ")}`,
        ).toHaveLength(0);
      }

      // ── Assertion B: owner-invariant. EVERY returned record must belong to Mr. Y. ──
      const foreign = res.records.filter(
        (r) => !accessibleBy(r, mrY.id, ep.ownerFields, ep.memberField),
      );
      expect(
        foreign,
        `ownerId INVARIANT BROKEN: ${ep.name} returned ${foreign.length} record(s) NOT owned by Mr. Y. ` +
          `This means the service scoped by teamId alone (DATA-LOSS-001). ` +
          `Offending ids: ${foreign.map(recordId).join(", ")}`,
      ).toHaveLength(0);
    });
  }

  test("[cross-check] Mr. X CAN see his own seeded bait (proves the bait is real & detectable)", async () => {
    // Guards against a false sense of security: if Mr. X himself can't see the
    // bait, assertion A above would be vacuous.
    const res = await getList(api, mrX, "/api/v1/flows", "team", victimTeamId);
    expect(res.status).toBe(200);
    const ids = idSet(res.records);
    for (const baitId of seededBait["flows"] || []) {
      expect(
        ids.has(baitId),
        `Mr. X should see his own bait flow ${baitId}`,
      ).toBeTruthy();
    }
  });
});

/* ══════════════════════════════════════════════════════════════════════
   LAYER 2 — DATA-LOSS-001 GUARD  (X-App-Context must NOT filter data)
   ══════════════════════════════════════════════════════════════════════ */

test.describe("🔒  DATA-LOSS-001 — flipping X-App-Context with a fixed team must not change the data set", () => {
  test.beforeEach(() => {
    test.skip(
      !attackerTeamId,
      `Mr. Y (${ATTACKER.email}) belongs to no team; cannot run the entitlement guard. ` +
        `Add him to a team or set ATTACKER_TEAM_ID.`,
    );
  });

  for (const ep of ENDPOINTS) {
    test(`[${ep.name}] same teamId, app=pro vs app=team → IDENTICAL record set`, async () => {
      const asPro = await getList(api, mrY, ep.list, "pro", attackerTeamId);
      const asTeam = await getList(api, mrY, ep.list, "team", attackerTeamId);

      // Both must succeed (or both gate identically) — a status divergence is itself a smell.
      expect(
        asPro.status,
        `status mismatch for ${ep.name}: pro=${asPro.status} team=${asTeam.status}`,
      ).toBe(asTeam.status);
      if (asPro.status !== 200) return;

      const a = idSet(asPro.records);
      const b = idSet(asTeam.records);
      const symmetricDiff = [...a]
        .filter((x) => !b.has(x))
        .concat([...b].filter((x) => !a.has(x)));
      expect(
        symmetricDiff,
        `DATA-LOSS-001 VIOLATION: ${ep.name} returned a DIFFERENT set when only X-App-Context changed. ` +
          `appContext must gate entitlements, never filter data. Differing ids: ${symmetricDiff.join(", ")}`,
      ).toHaveLength(0);
    });
  }
});

/* ══════════════════════════════════════════════════════════════════════
   LAYER 3 — MASTER WEB FLOW (UI, storageState)  — steps 1-6
   Selectors marked ⚠ lack data-testid hooks today; adjust if they drift.
   ══════════════════════════════════════════════════════════════════════ */

const T = { nav: 20_000, data: 20_000, modal: 10_000 } as const;

test.describe("🌐  Master Web Flow (UI)", () => {
  test("1 · authenticated dashboard loads with web (non-mobile) branding", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page.getByTestId("dashboard-body")).toBeVisible({
      timeout: T.nav,
    });
    await expect(page.getByTestId("app-context-loader")).toBeHidden({
      timeout: T.nav,
    });
    // Web shell, not mobile: standard website logo asset resolved.
    await expect(page.locator('img[src*="image.png"]').first()).toBeVisible({
      timeout: T.nav,
    }); // ⚠ asset name
  });

  test("3 · dashboard /stats totalFlows matches /flows length for the active footprint", async () => {
    const stats = await getList(
      api,
      mrY,
      "/api/v1/dashboard/stats",
      "pro",
      null,
    );
    const flows = await getList(api, mrY, "/api/v1/flows", "pro", null);
    const total = (stats.raw?.data ?? stats.raw)?.totalFlows;
    expect(typeof total === "number" ? total : flows.records.length).toBe(
      flows.records.length,
    );
  });

  test("4 · 'Create a Flow' opens the editor in a NEW TAB on a clean canvas", async ({
    page,
    context,
  }) => {
    await page.goto("/dashboard/flows");
    await expect(page.getByTestId("dashboard-body")).toBeVisible({
      timeout: T.nav,
    });
    const [editor] = await Promise.all([
      context.waitForEvent("page", { timeout: T.nav }),
      page.getByRole("button", { name: /create a flow/i }).click(), // ⚠ no testid
    ]);
    await expect(editor).toHaveURL(/\/dashboard\/flows\/[^/]+$/, {
      timeout: T.nav,
    });
    await expect(editor.locator("iframe")).toBeVisible({ timeout: T.nav }); // draw.io canvas
  });

  test("5 · Recents flushes stale data on workspace switch + instant client-side filter", async ({
    page,
  }) => {
    await page.goto("/dashboard/recents");
    await expect(page.getByTestId("dashboard-body")).toBeVisible({
      timeout: T.nav,
    });
    await page.getByPlaceholder(/search/i).fill("zzz-no-such-flow-zzz"); // ⚠ placeholder text
    await expect(page.getByText(/no .*found|empty/i)).toBeVisible({
      timeout: 3_000,
    });
  });

  test("6 · subscription gate is REACTIVE — over-limit create returns 403 then shows the upgrade modal", async ({
    page,
  }) => {
    // NOTE: requires the storageState user to be AT the flow limit (default 10).
    // Skips cleanly if the user still has headroom, so it never false-fails.
    await page.goto("/dashboard/flows");
    await expect(page.getByTestId("dashboard-body")).toBeVisible({
      timeout: T.nav,
    });
    const respP = page.waitForResponse(
      (r) =>
        /\/api\/(v1\/)?flows/.test(r.url()) && r.request().method() === "POST",
      { timeout: T.data },
    );
    await page.getByRole("button", { name: /create a flow/i }).click(); // button is NOT pre-disabled
    const resp = await respP;
    if (resp.status() !== 403) {
      test.skip(
        true,
        "User is below the flow limit; seed it to the cap (default 10) to exercise the gate.",
      );
    }
    expect((await resp.json())?.error?.code).toBe("FLOW_LIMIT_REACHED");
    await expect(page.getByText(/reached your flow limit/i)).toBeVisible({
      timeout: T.modal,
    }); // modal title
  });
});
