import { execSync } from "child_process";
import * as path from "path";
import { TEST_USERS } from "./test-users";

// Repo root (docker-compose.yml lives here) — helpers sit at frontend/e2e/helpers.
const ROOT = path.resolve(__dirname, "..", "..", "..");

export const PRO_USER_EMAIL = TEST_USERS.PRO.email;
export const PRO_USER_PASSWORD = TEST_USERS.PRO.password;

/** Run a Node script inside the backend container and return stdout.
 *  Script is piped via stdin — avoids all shell quoting/expansion issues
 *  ($disconnect, newlines, quotes). */
export function dbNode(script: string): string {
  return execSync(`docker compose exec -T backend node`, {
    cwd: ROOT,
    input: script,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

/** Update the Pro test user. `data` values must be JSON-serializable; ISO
 *  strings in `dateFields` are revived to Date objects. */
export function setUserState(
  data: Record<string, unknown>,
  dateFields: string[] = [],
): void {
  dbNode(`
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const data = ${JSON.stringify(data)};
    for (const f of ${JSON.stringify(dateFields)}) {
      if (data[f]) data[f] = new Date(data[f]);
    }
    prisma.user.update({ where: { email: '${PRO_USER_EMAIL}' }, data })
      .then(() => { console.log('OK'); return prisma.$disconnect(); })
      .catch(e => { console.error(e.message); process.exit(1); });
  `);
}

export function getUserState(fields: string[]): Record<string, unknown> {
  const select = fields.map((f) => `${f}: true`).join(", ");
  const out = dbNode(`
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    prisma.user.findFirst({ where: { email: '${PRO_USER_EMAIL}' }, select: { ${select} } })
      .then(u => { console.log('JSON:' + JSON.stringify(u)); return prisma.$disconnect(); });
  `);
  const line = out.split("\n").find((l) => l.startsWith("JSON:"));
  return JSON.parse(line!.slice(5));
}

/** Create N personal Pro flows ([E2E] prefix) for the Pro test user. */
export function createTestFlows(count: number): string[] {
  const out = dbNode(`
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    (async () => {
      const user = await prisma.user.findFirst({ where: { email: '${PRO_USER_EMAIL}' }, select: { id: true } });
      const ids = [];
      for (let i = 0; i < ${count}; i++) {
        const f = await prisma.flow.create({ data: {
          name: '[E2E] Flow ' + (i + 1),
          diagramData: '<mxGraphModel/>',
          ownerId: user.id,
          teamId: null,
          appContext: 'pro',
        }, select: { id: true } });
        ids.push(f.id);
      }
      console.log('JSON:' + JSON.stringify(ids));
      await prisma.$disconnect();
    })().catch(e => { console.error(e.message); process.exit(1); });
  `);
  const line = out.split("\n").find((l) => l.startsWith("JSON:"));
  return JSON.parse(line!.slice(5));
}

/** Create one soft-deleted (trashed) [E2E] flow for the Pro user. Returns id. */
export function createTrashedTestFlow(): string {
  const out = dbNode(`
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    (async () => {
      const user = await prisma.user.findFirst({ where: { email: '${PRO_USER_EMAIL}' }, select: { id: true } });
      const f = await prisma.flow.create({ data: {
        name: '[E2E] Trashed Flow',
        diagramData: '<mxGraphModel/>',
        ownerId: user.id,
        teamId: null,
        appContext: 'pro',
        deletedAt: new Date(),
      }, select: { id: true } });
      console.log('JSON:' + JSON.stringify(f.id));
      await prisma.$disconnect();
    })().catch(e => { console.error(e.message); process.exit(1); });
  `);
  const line = out.split("\n").find((l) => l.startsWith("JSON:"));
  return JSON.parse(line!.slice(5));
}

/** Create one favourited [E2E] flow for the Pro user. Returns id. */
export function createFavouriteTestFlow(): string {
  const out = dbNode(`
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    (async () => {
      const user = await prisma.user.findFirst({ where: { email: '${PRO_USER_EMAIL}' }, select: { id: true } });
      const f = await prisma.flow.create({ data: {
        name: '[E2E] Fav Flow',
        diagramData: '<mxGraphModel/>',
        ownerId: user.id,
        teamId: null,
        appContext: 'pro',
        isFavorite: true,
      }, select: { id: true } });
      console.log('JSON:' + JSON.stringify(f.id));
      await prisma.$disconnect();
    })().catch(e => { console.error(e.message); process.exit(1); });
  `);
  const line = out.split("\n").find((l) => l.startsWith("JSON:"));
  return JSON.parse(line!.slice(5));
}

/** Hard-delete every [E2E]-prefixed flow owned by the Pro test user. */
export function deleteTestFlows(): void {
  dbNode(`
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    prisma.flow.deleteMany({ where: { name: { startsWith: '[E2E]' }, owner: { email: '${PRO_USER_EMAIL}' } } })
      .then(r => { console.log('deleted ' + r.count); return prisma.$disconnect(); });
  `);
}

/** Hard-delete every [E2E]/E2E-prefixed shape group owned by the Pro user. */
export function deleteTestShapeGroups(): void {
  dbNode(`
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    prisma.shapeGroup.deleteMany({ where: { name: { startsWith: 'E2E' }, user: { email: '${PRO_USER_EMAIL}' } } })
      .then(r => { console.log('deleted ' + r.count); return prisma.$disconnect(); })
      .catch(e => { console.error(e.message); process.exit(1); });
  `);
}

/** Hard-delete every E2E-prefixed project created by the Pro user. */
export function deleteTestProjects(): void {
  dbNode(`
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    prisma.project.deleteMany({ where: { name: { startsWith: 'E2E' }, creator: { email: '${PRO_USER_EMAIL}' } } })
      .then(r => { console.log('deleted ' + r.count); return prisma.$disconnect(); })
      .catch(e => { console.error(e.message); process.exit(1); });
  `);
}

/** Baseline: Pro user with base 10 flows, no packs, no picker, no add-on. */
export function resetProUser(): void {
  setUserState({
    hasPro: true,
    currentVersion: "pro",
    proFlowLimit: 10,
    proAdditionalFlowsPurchased: 0,
    proUnlimitedFlows: false,
    flowAddonStatus: null,
    flowAddonPlan: null,
    flowAddonStripeSubId: null,
    flowAddonCurrentPeriodEnd: null,
    flowAddonGracePeriodEnd: null,
    isInFlowPickerPhase: false,
    activeFlowPackId: null,
    flowPackExpiresAt: null,
  });
  // proPurchasedAt must be set for add-on endpoints (PRO_REQUIRED guard)
  dbNode(`
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    prisma.user.update({ where: { email: '${PRO_USER_EMAIL}' }, data: { proPurchasedAt: new Date() } })
      .then(() => { console.log('OK'); return prisma.$disconnect(); });
  `);
}

/** Invoke the past_due grace cron logic directly (CRON_SECRET unset locally). */
export function runPastDueGraceCheck(): {
  reduced: number;
  pickerTriggered: number;
} {
  const out = dbNode(`
    const { checkPastDueGrace } = require('./src/services/flowPackExpiry.service');
    checkPastDueGrace().then(s => { console.log('JSON:' + JSON.stringify(s)); process.exit(0); })
      .catch(e => { console.error(e.message); process.exit(1); });
  `);
  const line = out.split("\n").find((l) => l.startsWith("JSON:"));
  return JSON.parse(line!.slice(5));
}
