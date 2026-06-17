import { chromium, devices } from "@playwright/test";

const LIVE = "http://localhost:3002";
const ND = "http://localhost:8081";
const EMAIL = "prouser@valueflowtest.com";
const PASS = "Test@1234";
const device = devices["Pixel 5"];

const browser = await chromium.launch();

function box(el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return {
    tag: el.tagName.toLowerCase(),
    w: Math.round(r.width),
    h: Math.round(r.height),
    x: Math.round(r.x),
    pad: cs.padding,
    margin: cs.margin,
    font: cs.fontSize,
    text: (el.textContent || "").trim().slice(0, 30),
  };
}

async function measure(page, label) {
  return await page.evaluate(() => {
    function box(el) {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        w: Math.round(r.width),
        h: Math.round(r.height),
        x: Math.round(r.x),
        pad: cs.padding,
        margin: cs.margin,
        font: cs.fontSize,
        text: (el.textContent || "").trim().slice(0, 28),
      };
    }
    const vis = (el) => el && el.getBoundingClientRect().height > 0;
    const heading = [...document.querySelectorAll("h1,h2")].find(vis);
    const btn = [...document.querySelectorAll("button,a")].find(
      (b) => vis(b) && /new|create|login|sign/i.test(b.textContent || ""),
    );
    const input = [...document.querySelectorAll("input")].find(vis);
    const header =
      document.querySelector("header") ||
      [...document.querySelectorAll("div")].find(
        (d) =>
          vis(d) &&
          d.getBoundingClientRect().top < 5 &&
          d.getBoundingClientRect().height < 90 &&
          d.getBoundingClientRect().width > 300,
      );
    return {
      docFont: getComputedStyle(document.documentElement).fontSize,
      bodyFont: getComputedStyle(document.body).fontSize,
      heading: box(heading),
      primaryBtn: box(btn),
      firstInput: box(input),
      header: box(header),
    };
  });
}

// ---- new_design (flows) ----
const ndCtx = await browser.newContext({ ...device });
const ndPage = await ndCtx.newPage();
await ndPage.goto(ND, { waitUntil: "networkidle" });
await ndPage.getByText("Welcome back").waitFor({ timeout: 8000 });
await ndPage.getByRole("button", { name: "Login", exact: true }).click();
await ndPage.waitForTimeout(1000);
await ndPage.locator("button:has(svg.lucide-menu)").first().click();
const ndDrawer = ndPage.locator("div.slide-in-from-left");
await ndDrawer.getByText("Create a Flow").waitFor({ timeout: 4000 });
await ndDrawer.getByText("Flows", { exact: true }).first().click();
await ndPage.waitForTimeout(800);
console.log("=== NEW_DESIGN /flows ===");
console.log(JSON.stringify(await measure(ndPage), null, 2));
await ndCtx.close();

// ---- live (flows) ----
const ctx = await browser.newContext({ ...device });
const page = await ctx.newPage();
await page.goto(`${LIVE}/login`, { waitUntil: "networkidle" });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[placeholder="Enter your password"]', PASS);
await page
  .locator('button:has-text("Login"), button[type="submit"]')
  .first()
  .click();
await page.waitForURL(/\/dashboard/, { timeout: 20000 }).catch(() => {});
await page.goto(`${LIVE}/dashboard/flows`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
console.log("=== LIVE /dashboard/flows ===");
console.log(JSON.stringify(await measure(page), null, 2));
await ctx.close();

await browser.close();
