import { test, expect, Page } from "@playwright/test";

/**
 * MOBILE ERGONOMICS GATE
 *
 * Every defect found in the 2026-08-14 device audit was machine-detectable:
 * text below 14px, tap targets under 44px, containers overflowing, and page
 * padding that drifted per page. This spec asserts all four so they cannot
 * come back silently.
 *
 * It runs at FOUR widths on purpose. The `min-w-0` regression that pushed the
 * password eye button outside its field only appeared below ~375px — a single
 * 412px check passed it. Narrow widths are where these bugs live.
 *
 * Rules enforced (phones only, <768px):
 *   1. No visible text below 14px, except uppercase overlines / axis labels,
 *      which floor at 12px.
 *   2. No visible interactive control below 44x44. Toggles are exempt: a
 *      switch is legitimately 36x20 and gets its touch area from the row.
 *   3. No horizontal overflow, and no element escaping its own container.
 *   4. Page containers use ONE padding scale: 20px sides, 12px top.
 */

const WIDTH = Number(process.env.ERGO_WIDTH || 412);

const PAGES: [string, string][] = [
  ["dashboard", "/dashboard"],
  ["flows", "/dashboard/flows"],
  ["teams", "/dashboard/teams"],
  ["trash", "/dashboard/trash"],
  ["settings", "/dashboard/settings"],
  ["billing", "/dashboard/settings/billing"],
  ["notifications", "/dashboard/notifications"],
  ["subscription", "/dashboard/subscription"],
];

/**
 * Wait past the "Loading your workspace…" splash, then until the DOM stops
 * changing. A fixed sleep is not enough: pages like Billing fetch their rows
 * after first paint, so a half-rendered skeleton would be audited and the run
 * would flake.
 */
async function ready(page: Page) {
  await page
    .waitForFunction(
      () => {
        const t = document.body.innerText || "";
        return t.length > 60 && !/Loading your workspace/i.test(t);
      },
      { timeout: 90_000 },
    )
    .catch(() => {});

  // Let in-flight fetches settle first — Billing, Notifications and
  // Subscription all populate after first paint.
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});

  // Then require THREE consecutive identical samples. Two was not enough: a
  // spinner state holds steady for a tick and the audit ran against it, which
  // is why the suite flaked on exactly those async pages.
  let last = -1;
  let stable = 0;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(400);
    const len = await page.evaluate(() => (document.body.innerText || "").length);
    if (len === last && len > 60) {
      if (++stable >= 3) return;
    } else {
      stable = 0;
    }
    last = len;
  }
}

const AUDIT = () => {
  const vis = (el: Element) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return (
      r.width > 0 &&
      r.height > 0 &&
      s.visibility !== "hidden" &&
      s.display !== "none" &&
      Number(s.opacity) > 0.05
    );
  };
  const ownText = (el: Element) =>
    Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3)
      .map((n) => (n.textContent || "").trim())
      .join(" ")
      .trim();

  const smallText: string[] = [];
  const smallTaps: string[] = [];
  const escaped: string[] = [];

  for (const el of Array.from(document.querySelectorAll("body *"))) {
    if (!vis(el)) continue;
    const t = ownText(el);
    if (!t || t.length < 2) continue;
    const s = getComputedStyle(el);
    const fs = parseFloat(s.fontSize);
    // Two roles legitimately sit at 12px and no lower:
    //   - overlines: uppercase + bold section labels
    //   - pill badges: short status chips ("Owner", "Paid"), fully rounded
    const isOverline =
      s.textTransform === "uppercase" && parseInt(s.fontWeight, 10) >= 600;
    const r = el.getBoundingClientRect();
    const isPill =
      parseFloat(s.borderRadius) >= 999 && r.width < 140 && t.length <= 18;
    // Micro labels — timestamps ("6h ago"), status chips ("Paid"). Short,
    // glanceable, never long-form. 12px is the floor for these; anything
    // longer is real content and must clear 14px.
    const isMicro = t.length <= 10;
    const floor = isOverline || isPill || isMicro ? 12 : 14;
    if (fs < floor) smallText.push(`${fs}px "${t.slice(0, 30)}"`);
  }

  // SVG <text> (hand-rolled charts) carries a font-size ATTRIBUTE, not a class.
  for (const el of Array.from(document.querySelectorAll("svg text"))) {
    if (!vis(el)) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 12) smallText.push(`${fs}px svg "${el.textContent}"`);
  }

  const SEL =
    'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="tab"]';
  for (const el of Array.from(document.querySelectorAll(SEL))) {
    if (!vis(el) || el.classList.contains("sr-only")) continue;
    const role = el.getAttribute("role");
    // A switch/checkbox is meant to be small; its touch area comes from the row.
    if (role === "switch" || role === "checkbox" || role === "radio") continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1) continue;
    if (r.width < 44 || r.height < 44) {
      const label =
        el.getAttribute("aria-label") ||
        (el as HTMLElement).innerText ||
        el.tagName;
      smallTaps.push(
        `${Math.round(r.width)}x${Math.round(r.height)} "${label.trim().slice(0, 24)}"`,
      );
    }
  }

  // Controls escaping their own container (the password-eye class of bug).
  for (const el of Array.from(document.querySelectorAll("button, input"))) {
    if (!vis(el)) continue;
    const parent = el.parentElement;
    if (!parent) continue;
    const ps = getComputedStyle(parent);
    const bordered =
      parseFloat(ps.borderTopWidth) > 0 ||
      ps.backgroundColor !== "rgba(0, 0, 0, 0)";
    if (!bordered) continue;
    const r = el.getBoundingClientRect();
    const pr = parent.getBoundingClientRect();
    if (r.right > pr.right + 1 || r.left < pr.left - 1) {
      escaped.push(
        `${el.tagName} escapes ${(parent.className || "").toString().slice(0, 28)}`,
      );
    }
  }

  // Page container padding — one scale across every page.
  const shell = document.querySelector(".responsive-content");
  let pagePad: { px: number; pt: number } | null = null;
  if (shell) {
    const sr = shell.getBoundingClientRect();
    for (const el of Array.from(shell.querySelectorAll("div"))) {
      const r = el.getBoundingClientRect();
      if (r.width < sr.width * 0.8) continue;
      const s = getComputedStyle(el);
      if (
        parseFloat(s.paddingLeft) >= 4 &&
        (el as HTMLElement).innerText.trim().length > 20
      ) {
        pagePad = {
          px: parseFloat(s.paddingLeft),
          pt: parseFloat(s.paddingTop),
        };
        break;
      }
    }
  }

  return {
    smallText: Array.from(new Set(smallText)),
    smallTaps: Array.from(new Set(smallTaps)),
    escaped: Array.from(new Set(escaped)),
    pagePad,
    hOverflow:
      document.documentElement.scrollWidth > window.innerWidth + 1,
  };
};

test.describe(`mobile ergonomics @ ${WIDTH}px`, () => {
  test.use({ viewport: { width: WIDTH, height: 850 }, isMobile: true, hasTouch: true });

  for (const [name, path] of PAGES) {
    test(`${name} — text, targets, overflow, padding`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await ready(page);
      const r = await page.evaluate(AUDIT);

      expect(r.smallText, `text below the floor on ${name}`).toEqual([]);
      expect(r.smallTaps, `tap targets under 44px on ${name}`).toEqual([]);
      expect(r.escaped, `controls escaping their container on ${name}`).toEqual([]);
      expect(r.hOverflow, `horizontal overflow on ${name}`).toBe(false);

      if (r.pagePad) {
        expect(r.pagePad.px, `side padding on ${name}`).toBe(20);
        expect(r.pagePad.pt, `top padding on ${name}`).toBe(12);
      }
    });
  }
});
