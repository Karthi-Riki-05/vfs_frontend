import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";

const LIVE = "http://localhost:3002";
const ND = "http://localhost:8081";
const EMAIL = process.env.SHOT_EMAIL || "prouser@valueflowtest.com";
const PASS = "Test@1234";
const OUT = "/tmp/compare";
mkdirSync(OUT, { recursive: true });

const device = devices["Pixel 5"]; // 393x851 mobile

// new_design drawer label -> output key, and live route
const SCREENS = [
  { key: "dashboard", ndLabel: null, live: "/dashboard" },
  { key: "recent", ndLabel: "Recent", live: "/dashboard/recents" },
  { key: "flows", ndLabel: "Flows", live: "/dashboard/flows" },
  { key: "shapes", ndLabel: "Shapes", live: "/dashboard/shapes" },
  { key: "teams", ndLabel: "Teams", live: "/dashboard/teams" },
  { key: "chat", ndLabel: "Chat", live: "/dashboard/chat" },
  { key: "projects", ndLabel: "All Projects", live: "/dashboard/projects" },
  { key: "favourites", ndLabel: "Favourites", live: "/dashboard/favourites" },
  { key: "trash", ndLabel: "Trash", live: "/dashboard/trash" },
];

const browser = await chromium.launch();

/* ---------------- NEW DESIGN ---------------- */
async function captureNewDesign() {
  const ctx = await browser.newContext({ ...device });
  const page = await ctx.newPage();
  await page.goto(ND, { waitUntil: "networkidle" });
  // splash -> login auto after 1.6s
  await page.getByText("Welcome back").waitFor({ timeout: 8000 });
  await page.screenshot({ path: `${OUT}/nd-login.png` });
  console.log("nd-login");

  await page.getByRole("button", { name: "Login", exact: true }).click();
  await page.waitForTimeout(1200); // dashboard

  for (const s of SCREENS) {
    if (s.ndLabel) {
      // open drawer (mobile hamburger) and click nav within the drawer overlay
      await page.locator("button:has(svg.lucide-menu)").first().click();
      const drawer = page.locator("div.slide-in-from-left");
      await drawer.getByText("Create a Flow").waitFor({ timeout: 4000 });
      await drawer.getByText(s.ndLabel, { exact: true }).first().click();
      await page.waitForTimeout(900);
    }
    await page.screenshot({ path: `${OUT}/nd-${s.key}.png` });
    console.log("nd-" + s.key);
  }
  await ctx.close();
}

/* ---------------- LIVE APP ---------------- */
async function captureLive() {
  // logged-out login page
  const anon = await browser.newContext({ ...device });
  const ap = await anon.newPage();
  await ap.goto(`${LIVE}/login`, { waitUntil: "networkidle" });
  await ap.waitForTimeout(1200);
  await ap.screenshot({ path: `${OUT}/live-login.png` });
  console.log("live-login");

  // login
  await ap.fill('input[type="email"]', EMAIL);
  await ap.fill('input[placeholder="Enter your password"]', PASS);
  await ap
    .locator('button:has-text("Login"), button[type="submit"]')
    .first()
    .click();
  try {
    await ap.waitForURL(/\/dashboard/, { timeout: 20000 });
  } catch {
    console.log("WARN: login may have failed");
  }

  for (const s of SCREENS) {
    await ap.goto(`${LIVE}${s.live}`, { waitUntil: "networkidle" });
    await ap.waitForTimeout(1600);
    await ap.screenshot({ path: `${OUT}/live-${s.key}.png` });
    console.log("live-" + s.key);
  }
  await anon.close();
}

await captureNewDesign();
await captureLive();
await browser.close();
console.log("DONE -> " + OUT);
