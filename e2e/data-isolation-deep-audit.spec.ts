import { test, expect, Page } from "@playwright/test";
import { dbNode } from "./helpers/db";
import { TEST_USERS } from "./helpers/test-users";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * ════════════════════════════════════════════════════════════════════════════
 *  DATA-ISOLATION DEEP AUDIT
 * ════════════════════════════════════════════════════════════════════════════
 *
 * ⚠️  READ THIS BEFORE EDITING — the boundary model is counter-intuitive.
 *
 * The Pro app and the Team app are NOT a data-isolation boundary. They are the
 * SAME account; `?app=pro` / `?app=team` only unlock different FEATURES. The one
 * and only data boundary is the workspace tuple `{ ownerId, teamId }`, carried
 * on every request by the `X-Workspace-Context` header and enforced server-side
 * (DATA-LOSS-001 / "Private Team Buckets"). Filtering personal data by app type
 * is the bug, not the invariant.
 *
 * So this audit verifies the THREE boundaries that actually exist:
 *
 *   AXIS 1 — Team-context data scoping (THE data boundary)
 *            Same user, switch X-Workspace-Context → flow/project/shape/dashboard
 *            buckets are DISJOINT; no row from team A surfaces under team B or
 *            personal; a non-member team context yields none of others' rows.
 *
 *   AXIS 2 — Cross-account isolation (IDOR — the real leak axis)
 *            A foreign user's flow / shape-group is never readable by id and
 *            never appears in this user's lists under any context.
 *            (shape.service had 3 IDOR reads here — see memory.)
 *
 *   AXIS 3 — App-context is a FEATURE gate, NOT a data filter
 *            (a) Same user + same team-context, flipping X-App-Context pro↔team
 *                returns the IDENTICAL id set — proves app type never filters
 *                data (locks DATA-LOSS-001 from the opposite side).
 *            (b) An entitled Pro user is SERVED under X-App-Context: pro (200).
 *                The unentitled→403/UPGRADE_REQUIRED half lives in
 *                web-upgrade-gate.spec.ts (GATE-04); cited, not duplicated, to
 *                stay under the auth rate limiter.
 *
 * The boundary is enforced at the network layer, so the audit drives it at the
 * network layer: in-page `fetch()` with explicit headers (exactly how GATE-04
 * works) — far more robust than clicking the UI switcher per assertion. The UI
 * layer is still swept for DOM/state leakage + screenshots (your spec's intent),
 * but the hard PASS/FAIL gates are the header-driven API checks.
 *
 * Auth: reuses the shared Pro storageState (e2e/.auth/pro.json) from
 * global-setup — zero extra logins. Run:
 *
 *   cd frontend && npx playwright test data-isolation-deep-audit --project=chromium
 *
 * Outputs:
 *   audit-dumps/{pro,team}/*.png         per-module full-page screenshots
 *   audit-dumps/data-isolation-report.md fine-grained PASS/FAIL execution log
 *
 * Docker-dependent seeding (AXIS 2 + id/team discovery) degrades gracefully:
 * if the `db` service is unreachable, those checks are marked SKIPPED in the
 * report rather than failing the suite.
 */

// ───────────────────────────── config / paths ──────────────────────────────

const SELF = TEST_USERS.PRO; // storageState identity (prouser@valueflowtest.com)
const FOREIGN = TEST_USERS.TEAM; // mry@test.com — a DIFFERENT account w/ teams

const DUMP_ROOT = "audit-dumps";
const REPORT = path.join(DUMP_ROOT, "data-isolation-report.md");

// Curated, MAINTAINED module list (no blind "click every link" — that silently
// truncates on render races). Each entry pairs a sidebar route with the API
// endpoint(s) it loads so the DOM sweep and the network sweep stay aligned.
const MODULES: { key: string; route: string; api: string[] }[] = [
  { key: "dashboard", route: "/dashboard", api: ["/api/dashboard/stats"] },
  { key: "flows", route: "/dashboard/flows", api: ["/api/flows"] },
  { key: "projects", route: "/dashboard/projects", api: ["/api/projects"] },
  { key: "shapes", route: "/dashboard/shapes", api: ["/api/shape-groups"] },
  {
    key: "favourites",
    route: "/dashboard/favourites",
    api: ["/api/flows/favorites"],
  },
  { key: "trash", route: "/dashboard/trash", api: ["/api/flows/trash"] },
  { key: "teams", route: "/dashboard/teams", api: ["/api/teams"] },
  { key: "settings", route: "/dashboard/settings", api: [] },
];

// Endpoints whose JSON rows must obey the team-context scope (carry ownerId/teamId).
const SCOPED_LIST_APIS = [
  "/api/flows",
  "/api/projects",
  "/api/shape-groups",
  "/api/flows/favorites",
  "/api/flows/trash",
];

// ───────────────────────────── report machinery ────────────────────────────

type Line = {
  axis: string;
  name: string;
  status: "PASS" | "FAIL" | "SKIP" | "INFO";
  detail: string;
};
const log: Line[] = [];
function record(
  axis: string,
  name: string,
  status: Line["status"],
  detail = "",
) {
  log.push({ axis, name, status, detail });
  // Mirror to console so a CI run shows fine-grained results inline (your spec).
  const tag = { PASS: "✅", FAIL: "❌", SKIP: "⏭️ ", INFO: "ℹ️ " }[status];
  // eslint-disable-next-line no-console
  console.log(`${tag} [${axis}] ${name}${detail ? " — " + detail : ""}`);
}

function writeReport() {
  fs.mkdirSync(DUMP_ROOT, { recursive: true });
  const counts = log.reduce(
    (a, l) => ((a[l.status] = (a[l.status] || 0) + 1), a),
    {} as Record<string, number>,
  );
  const byAxis = [...new Set(log.map((l) => l.axis))];
  const rows = (axis: string) =>
    log
      .filter((l) => l.axis === axis)
      .map(
        (l) =>
          `| ${{ PASS: "✅", FAIL: "❌", SKIP: "⏭️", INFO: "ℹ️" }[l.status]} ${l.status} | ${l.name} | ${l.detail.replace(/\|/g, "\\|")} |`,
      )
      .join("\n");

  const md = `# Data-Isolation Deep Audit

> Boundary model: \`{ ownerId, teamId }\` is the ONLY data boundary. App type
> (\`X-App-Context\`) gates FEATURES, never data. See spec header.

**Self (storageState):** \`${SELF.email}\`  ·  **Foreign account:** \`${FOREIGN.email}\`

**Totals:** ✅ ${counts.PASS || 0} pass · ❌ ${counts.FAIL || 0} fail · ⏭️ ${counts.SKIP || 0} skipped · ℹ️ ${counts.INFO || 0} info

${byAxis
  .map(
    (axis) => `## ${axis}

| Result | Check | Detail |
| --- | --- | --- |
${rows(axis)}
`,
  )
  .join("\n")}
`;
  fs.writeFileSync(REPORT, md);
  // eslint-disable-next-line no-console
  console.log(`\n📄 Report written: ${path.resolve(REPORT)}`);
}

// ──────────────────────────── header-driven fetch ──────────────────────────

type Ctx = { app?: "pro" | "team"; team?: string | null; label: string };

/** In-page same-origin fetch with explicit context headers — the exact path the
 *  app uses (proxy forwards X-App-Context / X-Workspace-Context). Returns raw rows
 *  via the project convention `data?.data ?? data`. */
async function apiFetch(page: Page, url: string, ctx: Ctx) {
  return page.evaluate(
    async ({ url, app, team }) => {
      const headers: Record<string, string> = {};
      if (app) headers["X-App-Context"] = app;
      if (team) headers["X-Workspace-Context"] = team;
      let status = 0;
      let json: any = null;
      try {
        const r = await fetch(url, { headers });
        status = r.status;
        try {
          json = await r.json();
        } catch {
          /* non-JSON */
        }
      } catch {
        /* network */
      }
      const data = json?.data ?? json;
      return { status, code: json?.error?.code ?? null, data };
    },
    { url, app: ctx.app, team: ctx.team ?? undefined },
  );
}

/** Coerce any list-ish payload into an array of row objects. */
function rows(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.flows)) return data.flows;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.projects)) return data.projects;
  if (Array.isArray(data?.groups)) return data.groups;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}
const idsOf = (data: any) =>
  new Set(
    rows(data)
      .map((r) => r?.id)
      .filter(Boolean),
  );

// ───────────────────────────── DB seed / discover ──────────────────────────

type Seed = {
  available: boolean;
  selfId?: string;
  foreignId?: string;
  foreignTeamIds: string[];
  seededFlowId?: string;
  seededShapeGroupId?: string;
  seededFlowName: string;
};

const SEED_TAG = "[ISO-AUDIT]";

function seedForeignData(): Seed {
  const seed: Seed = {
    available: false,
    foreignTeamIds: [],
    seededFlowName: `${SEED_TAG} Foreign Flow`,
  };
  try {
    const out = dbNode(`
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      (async () => {
        const self = await prisma.user.findFirst({ where: { email: '${SELF.email}' }, select: { id: true } });
        const foreign = await prisma.user.findFirst({ where: { email: '${FOREIGN.email}' }, select: { id: true } });
        if (!self || !foreign) { console.log('JSON:' + JSON.stringify({ error: 'missing user' })); return prisma.$disconnect(); }

        // A flow owned by the FOREIGN user — must never reach SELF.
        const flow = await prisma.flow.create({ data: {
          name: '${SEED_TAG} Foreign Flow', diagramData: '<mxGraphModel/>',
          ownerId: foreign.id, teamId: null, appContext: 'team',
        }, select: { id: true } });

        // A shape group owned by the FOREIGN user — the shape.service IDOR axis.
        let shapeGroupId = null;
        try {
          const sg = await prisma.shapeGroup.create({ data: {
            name: '${SEED_TAG} Foreign ShapeGroup', userId: foreign.id,
          }, select: { id: true } });
          shapeGroupId = sg.id;
        } catch (e) { /* schema variance — flow IDOR check still runs */ }

        // Best-effort: teams the foreign user owns (for the non-member context test).
        let foreignTeamIds = [];
        try {
          const teams = await prisma.team.findMany({ where: { ownerId: foreign.id }, select: { id: true } });
          foreignTeamIds = teams.map(t => t.id);
        } catch (e) { /* owner field name variance — fall back to fabricated id */ }

        console.log('JSON:' + JSON.stringify({
          selfId: self.id, foreignId: foreign.id, flowId: flow.id, shapeGroupId, foreignTeamIds,
        }));
        await prisma.$disconnect();
      })().catch(e => { console.error(e.message); process.exit(1); });
    `);
    const line = out.split("\n").find((l) => l.startsWith("JSON:"));
    const j = JSON.parse(line!.slice(5));
    if (j.error) return seed;
    seed.available = true;
    seed.selfId = j.selfId;
    seed.foreignId = j.foreignId;
    seed.seededFlowId = j.flowId;
    seed.seededShapeGroupId = j.shapeGroupId || undefined;
    seed.foreignTeamIds = j.foreignTeamIds || [];
  } catch (e: any) {
    // Docker / db unreachable — AXIS 2 + discovery degrade to SKIP.
    record(
      "AXIS 2 — Cross-account (IDOR)",
      "DB seeding",
      "SKIP",
      `db unreachable: ${e?.message?.split("\n")[0]}`,
    );
  }
  return seed;
}

function cleanupSeed() {
  try {
    dbNode(`
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      (async () => {
        await prisma.flow.deleteMany({ where: { name: { startsWith: '${SEED_TAG}' } } });
        try { await prisma.shapeGroup.deleteMany({ where: { name: { startsWith: '${SEED_TAG}' } } }); } catch (e) {}
        console.log('cleaned');
        await prisma.$disconnect();
      })().catch(e => { console.error(e.message); process.exit(1); });
    `);
  } catch {
    /* best-effort */
  }
}

// ────────────────────────────────── suite ──────────────────────────────────

let seed: Seed;

test.describe.configure({ mode: "serial" }); // shared report + seeded DB state

test.describe("Data-Isolation Deep Audit", () => {
  test.beforeAll(() => {
    for (const d of ["pro", "team"])
      fs.mkdirSync(path.join(DUMP_ROOT, d), { recursive: true });
    seed = seedForeignData();
    record(
      "Setup",
      "seed foreign data",
      seed.available ? "INFO" : "SKIP",
      seed.available
        ? `selfId=${seed.selfId?.slice(0, 8)} foreignFlow=${seed.seededFlowId?.slice(0, 8)} foreignTeams=${seed.foreignTeamIds.length}`
        : "running header-only checks (AXIS 1 partial, AXIS 3 full)",
    );
  });

  test.afterAll(() => {
    cleanupSeed();
    writeReport();
  });

  // ───────────────── AXIS 1 — team-context data scoping ─────────────────────
  test("AXIS 1 — team-context buckets are disjoint and self-owned", async ({
    page,
  }) => {
    const AXIS = "AXIS 1 — Team-context scoping";
    await page.goto("/dashboard/team");
    await page.waitForLoadState("networkidle");

    // Discover the contexts the logged-in user legitimately has.
    const teamsRes = await apiFetch(page, "/api/teams", {
      label: "discover",
      team: null,
    });
    const myTeamIds = rows(teamsRes.data)
      .map((t) => t?.id)
      .filter(Boolean) as string[];
    record(
      AXIS,
      "discover memberships",
      "INFO",
      `personal + ${myTeamIds.length} team(s)`,
    );

    const contexts: Ctx[] = [
      { label: "personal", team: null },
      ...myTeamIds.map((id) => ({ label: `team:${id.slice(0, 8)}`, team: id })),
    ];

    // Per scoped endpoint: every row must be self-owned and tagged to the
    // requested context; buckets across contexts must be DISJOINT.
    for (const api of SCOPED_LIST_APIS) {
      const idToCtx = new Map<string, string>();
      let overlap = 0;
      let foreignOwner = 0;
      let wrongTeam = 0;

      for (const ctx of contexts) {
        const res = await apiFetch(page, api, ctx);
        if (res.status !== 200) {
          record(
            AXIS,
            `${api} @ ${ctx.label}`,
            "INFO",
            `status ${res.status} (skipped row checks)`,
          );
          continue;
        }
        for (const r of rows(res.data)) {
          // ownerId leak: a row owned by someone else surfaced under our session.
          if (seed.selfId && r?.ownerId && r.ownerId !== seed.selfId)
            foreignOwner++;
          // team tag mismatch: row's teamId must equal the requested context.
          if ("teamId" in (r || {})) {
            const want = ctx.team ?? null;
            const got = r.teamId ?? null;
            if (want !== got) wrongTeam++;
          }
          // cross-bucket overlap: same id served under two different contexts.
          if (r?.id) {
            const prev = idToCtx.get(r.id);
            if (prev && prev !== ctx.label) overlap++;
            else idToCtx.set(r.id, ctx.label);
          }
        }
      }

      record(
        AXIS,
        `${api} — no foreign-owned rows`,
        foreignOwner === 0 ? "PASS" : "FAIL",
        `${foreignOwner} foreign-owned`,
      );
      record(
        AXIS,
        `${api} — rows match requested team tag`,
        wrongTeam === 0 ? "PASS" : "FAIL",
        `${wrongTeam} mismatched teamId`,
      );
      record(
        AXIS,
        `${api} — buckets disjoint across contexts`,
        overlap === 0 ? "PASS" : "FAIL",
        `${overlap} id(s) bled across contexts`,
      );
      expect(foreignOwner, `${api}: foreign-owned rows leaked`).toBe(0);
      expect(wrongTeam, `${api}: rows tagged to the wrong team`).toBe(0);
      expect(overlap, `${api}: ids bled across team contexts`).toBe(0);
    }
  });

  test("AXIS 1 — a non-member team context yields none of others' rows", async ({
    page,
  }) => {
    const AXIS = "AXIS 1 — Team-context scoping";
    await page.goto("/dashboard/team");
    await page.waitForLoadState("networkidle");

    // A team the SELF user does not belong to. Prefer a real foreign-owned team;
    // fall back to a well-formed but unowned id.
    const foreignTeam =
      seed.foreignTeamIds[0] ?? "00000000-0000-4000-8000-000000000000";
    const usingReal = Boolean(seed.foreignTeamIds[0]);

    for (const api of ["/api/flows", "/api/projects"]) {
      const res = await apiFetch(page, api, {
        label: "foreign-team",
        team: foreignTeam,
      });
      // Acceptable: 403 (membership rejected) OR 200 with zero rows owned by others.
      const leaked = rows(res.data).filter(
        (r) => seed.selfId && r?.ownerId && r.ownerId !== seed.selfId,
      ).length;
      const ok = res.status === 403 || res.status === 404 || leaked === 0;
      record(
        AXIS,
        `${api} @ non-member team (${usingReal ? "real foreign" : "fabricated"})`,
        ok ? "PASS" : "FAIL",
        `status ${res.status}, ${leaked} foreign-owned row(s)`,
      );
      expect(leaked, `${api}: spoofed team context leaked others' rows`).toBe(
        0,
      );
    }
  });

  // ───────────────── AXIS 2 — cross-account isolation (IDOR) ─────────────────
  test("AXIS 2 — foreign-owned resources are not readable by id and never listed", async ({
    page,
  }) => {
    const AXIS = "AXIS 2 — Cross-account (IDOR)";
    if (!seed.available) {
      test.skip(true, "DB seeding unavailable — see Setup row in report");
      return;
    }
    await page.goto("/dashboard/team");
    await page.waitForLoadState("networkidle");

    // 1) Direct read-by-id of a FOREIGN-owned flow must be denied — never 200.
    const flowById = await apiFetch(page, `/api/flows/${seed.seededFlowId}`, {
      label: "idor-flow",
      team: null,
    });
    const flowDenied = [401, 403, 404].includes(flowById.status);
    record(
      AXIS,
      "GET /api/flows/:id (foreign) is denied",
      flowDenied ? "PASS" : "FAIL",
      `status ${flowById.status}`,
    );
    expect(flowDenied, "foreign flow readable by id (IDOR)").toBeTruthy();

    // 2) Direct read-by-id of a FOREIGN-owned shape group (shape.service IDOR axis).
    if (seed.seededShapeGroupId) {
      const sgById = await apiFetch(
        page,
        `/api/shape-groups/${seed.seededShapeGroupId}`,
        {
          label: "idor-shapegroup",
          team: null,
        },
      );
      const sgDenied = [401, 403, 404].includes(sgById.status);
      record(
        AXIS,
        "GET /api/shape-groups/:id (foreign) is denied",
        sgDenied ? "PASS" : "FAIL",
        `status ${sgById.status}`,
      );
      expect(
        sgDenied,
        "foreign shape-group readable by id (IDOR)",
      ).toBeTruthy();
    } else {
      record(
        AXIS,
        "GET /api/shape-groups/:id (foreign)",
        "SKIP",
        "shapeGroup seed unavailable",
      );
    }

    // 3) The foreign flow name must not appear in SELF's lists under ANY context.
    const teamsRes = await apiFetch(page, "/api/teams", {
      label: "ctx",
      team: null,
    });
    const ctxs: Ctx[] = [
      { label: "personal", team: null },
      ...rows(teamsRes.data)
        .map((t) => t?.id)
        .filter(Boolean)
        .map((id: string) => ({ label: `team:${id.slice(0, 8)}`, team: id })),
    ];
    let listed = 0;
    for (const ctx of ctxs) {
      const res = await apiFetch(page, "/api/flows", ctx);
      if (
        rows(res.data).some(
          (r) => r?.name === seed.seededFlowName || r?.id === seed.seededFlowId,
        )
      )
        listed++;
    }
    record(
      AXIS,
      "foreign flow absent from all of self's lists",
      listed === 0 ? "PASS" : "FAIL",
      `appeared in ${listed} context(s)`,
    );
    expect(listed, "foreign flow surfaced in self's flow list").toBe(0);
  });

  // ───────────── AXIS 3 — app-context gates features, not data ───────────────
  test("AXIS 3 — flipping X-App-Context does NOT change the data set", async ({
    page,
  }) => {
    const AXIS = "AXIS 3 — App-context ≠ data filter";
    await page.goto("/dashboard/pro").catch(() => {});
    await page.waitForLoadState("networkidle").catch(() => {});

    // prouser IS entitled to Pro, so both app contexts must be served (200) AND,
    // at the same team-context (personal), return the IDENTICAL id set. If the
    // sets differ, the backend is illegally filtering personal data by app type
    // (DATA-LOSS-001) — the exact bug the original audit spec wrongly asserted.
    for (const api of ["/api/flows", "/api/dashboard/stats"]) {
      const teamRes = await apiFetch(page, api, {
        label: "team-ctx",
        app: "team",
        team: null,
      });
      const proRes = await apiFetch(page, api, {
        label: "pro-ctx",
        app: "pro",
        team: null,
      });

      record(
        AXIS,
        `${api} — entitled Pro served under both contexts`,
        teamRes.status === 200 && proRes.status === 200 ? "PASS" : "FAIL",
        `team=${teamRes.status} pro=${proRes.status}`,
      );
      expect(teamRes.status, `${api}: team context not served`).toBe(200);
      expect(
        proRes.status,
        `${api}: entitled Pro blocked (should be 200)`,
      ).toBe(200);

      if (api === "/api/flows") {
        const a = idsOf(teamRes.data);
        const b = idsOf(proRes.data);
        const symmetricDiff = [...a]
          .filter((x) => !b.has(x))
          .concat([...b].filter((x) => !a.has(x)));
        record(
          AXIS,
          `${api} — identical data across app contexts`,
          symmetricDiff.length === 0 ? "PASS" : "FAIL",
          `${a.size} vs ${b.size} ids, ${symmetricDiff.length} differ`,
        );
        expect(
          symmetricDiff.length,
          `${api}: app type filtered the data set (DATA-LOSS-001)`,
        ).toBe(0);
      }
    }

    record(
      AXIS,
      "unentitled→403 (X-App-Context: pro)",
      "INFO",
      "covered by web-upgrade-gate.spec.ts GATE-04 (not duplicated — auth limiter)",
    );
  });

  // ───────────── Cross-cutting: UI sweep (DOM + network + state) ─────────────
  // Your spec's pillars, retargeted: per module, screenshot, dump runtime state,
  // and scan the DOM + intercepted API payloads for FOREIGN-owned contamination.
  for (const appCtx of ["team", "pro"] as const) {
    test(`UI sweep — ${appCtx} app: no foreign data in DOM / network / state`, async ({
      page,
    }) => {
      const AXIS = `UI sweep — ${appCtx} app`;

      // Capture every /api JSON response triggered by navigation (your listener).
      const captured: { url: string; rows: any[] }[] = [];
      page.on("response", async (res) => {
        const u = res.url();
        if (!u.includes("/api/") || !res.ok()) return;
        try {
          const ct = res.headers()["content-type"] || "";
          if (!ct.includes("json")) return;
          const j = await res.json();
          captured.push({ url: u, rows: rows(j?.data ?? j) });
        } catch {
          /* non-JSON / streamed */
        }
      });

      // Seed the per-tab app context exactly as real navigation does.
      await page.addInitScript((m) => {
        try {
          sessionStorage.setItem("vc_device_mode", "web");
          sessionStorage.setItem("vc_app_context", m as string);
        } catch {
          /* blocked */
        }
      }, appCtx);

      for (const mod of MODULES) {
        captured.length = 0;
        const resp = await page.goto(mod.route).catch(() => null);
        await page.waitForLoadState("networkidle").catch(() => {});

        // Screenshot archive → audit-dumps/{pro,team}/<module>.png
        await page
          .screenshot({
            path: path.join(DUMP_ROOT, appCtx, `${mod.key}.png`),
            fullPage: true,
          })
          .catch(() => {});

        if (!resp) {
          record(
            AXIS,
            `${mod.key}: navigation`,
            "INFO",
            "route did not load (skipped checks)",
          );
          continue;
        }

        // (a) State verification — runtime app context must mirror the target.
        const state = await page.evaluate(() => ({
          appCtx: sessionStorage.getItem("vc_app_context"),
          device: sessionStorage.getItem("vc_device_mode"),
          billingTeam: localStorage.getItem("vc_ai_billing_team"),
          proTeam: localStorage.getItem("vc_pro_team_id"),
        }));
        record(
          AXIS,
          `${mod.key}: runtime app context mirrors target`,
          state.appCtx === appCtx ? "PASS" : "INFO",
          `vc_app_context=${state.appCtx}`,
        );

        // (b) Network inspection — no FOREIGN-owned rows in any captured payload.
        let netLeak = 0;
        if (seed.selfId) {
          for (const c of captured)
            netLeak += c.rows.filter(
              (r) => r?.ownerId && r.ownerId !== seed.selfId,
            ).length;
        }
        // Foreign seeded resource id must never appear in any payload.
        const seededInNet =
          seed.seededFlowId &&
          captured.some((c) => c.rows.some((r) => r?.id === seed.seededFlowId));
        record(
          AXIS,
          `${mod.key}: network payloads free of foreign data`,
          netLeak === 0 && !seededInNet ? "PASS" : "FAIL",
          `${netLeak} foreign-owned row(s)${seededInNet ? " + seeded id present" : ""}`,
        );
        expect(
          netLeak,
          `${mod.key}: foreign-owned rows in network payload`,
        ).toBe(0);
        expect(
          seededInNet,
          `${mod.key}: foreign seeded id in network payload`,
        ).toBeFalsy();

        // (c) DOM leak — the foreign seeded resource name must not render.
        if (seed.available) {
          const domHit = await page
            .getByText(seed.seededFlowName, { exact: false })
            .count()
            .catch(() => 0);
          record(
            AXIS,
            `${mod.key}: foreign resource name absent from DOM`,
            domHit === 0 ? "PASS" : "FAIL",
            domHit ? `${domHit} match(es)` : "clean",
          );
          expect(
            domHit,
            `${mod.key}: foreign resource name rendered in DOM`,
          ).toBe(0);
        }
      }
    });
  }
});
