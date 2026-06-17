import { chromium } from "@playwright/test";

const BASE = "http://localhost:3002";
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

async function login() {
  for (let attempt = 1; attempt <= 6; attempt++) {
    await page.goto(`${BASE}/login`);
    await page.fill('input[type="email"]', "prouser@valueflowtest.com");
    await page.fill('input[placeholder="Enter your password"]', "Test@1234");
    await page.locator('button:has-text("Login")').first().click();
    try {
      await page.waitForURL(/\/dashboard/, { timeout: 12000 });
      console.log("logged in on attempt", attempt);
      return;
    } catch {
      console.log("login attempt", attempt, "failed, waiting 30s (rate limit)");
      await page.waitForTimeout(30000);
    }
  }
  throw new Error("login failed after retries");
}
await login();

// Create 3 temp flows + favourite them via the same proxy the app uses.
const favIds = await page.evaluate(async () => {
  const created = [];
  const names = [
    "[SHOT] Quarterly Revenue Optimization Flow",
    "[SHOT] Mobile Onboarding",
    "[SHOT] Org Chart",
  ];
  for (const name of names) {
    const r = await fetch("/api/flows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name }),
    });
    const j = await r.json();
    const f = j.data?.flow || j.data || j.flow;
    if (f?.id) {
      await fetch(`/api/flows/${f.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isFavorite: true }),
      });
      created.push(f.id);
    }
  }
  return created;
});
console.log("favourited:", favIds);

async function shoot(route, view) {
  for (const [w, h, tag] of [
    [1440, 900, "desktop"],
    [390, 844, "mobile"],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(`${BASE}/dashboard/${route}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `/tmp/${route}-${view}-${tag}.png` });
    console.log("shot", route, view, tag);
  }
}

await shoot("favourites", "grid");

// switch to LIST view, then screenshot
for (const [w, h, tag] of [
  [1440, 900, "desktop"],
  [390, 844, "mobile"],
]) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto(`${BASE}/dashboard/favourites`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  // ViewToggle lives in the page header; its first button = list view
  await page
    .locator(".inline-flex.bg-secondary button")
    .first()
    .click()
    .catch(() => {});
  await page.waitForTimeout(600);
  await page.screenshot({ path: `/tmp/favourites-list-${tag}.png` });
  console.log("shot favourites list", tag);
}

// cleanup: permanently delete temp flows
await page.evaluate(async (ids) => {
  for (const id of ids) {
    await fetch(`/api/flows/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    await fetch(`/api/flows/${id}/permanent`, {
      method: "DELETE",
      credentials: "include",
    });
  }
}, favIds);
console.log("cleaned up:", favIds);
await browser.close();
console.log("DONE");
