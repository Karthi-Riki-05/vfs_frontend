/**
 * Dashboard Layout & Main Container Body — structural / responsive / visual audit.
 *
 * Audits the production dashboard shell (`components/layout/DashboardLayout.tsx`)
 * against the `new_design` reference app (http://localhost:3003,
 * `new_design/src/routes/index.tsx`) across Desktop Chrome (`chromium`) and
 * Pixel 7 (`mobile`, touch enabled). Auth comes from the shared storageState
 * (e2e/.auth/pro.json) minted once in global-setup — no per-test login.
 *
 * Reference blueprint (measured from new_design source + :3003):
 *   • App shell:      min-h-screen, md:flex (sidebar + flex-1 content column)
 *   • Side nav:       <aside> lg:w-64 (256px) / md:w-20 (80px), sticky h-screen,
 *                     bg-card (#fff), border-r border-border
 *   • Top bar:        h-14 (56px) fixed row
 *   • Content body:   md:max-w-6xl (1152px) md:mx-auto md:px-8 (32px) — CENTERED + CAPPED
 *   • Scroll physics: inner `overflow-y-auto` container — content scrolls,
 *                     chrome stays put
 *   • Canvas colour:  --background #f5f7f6 (gray) with white (--card) cards
 *   • Mobile:         no persistent sidebar; left drawer w-[82%] + black/40 backdrop
 *
 * Production shell (DashboardLayout.tsx):
 *   • Header 56px · Sider 220px (60 collapsed) · content padding 24px 32px
 *     (desktop) / 20px 24px (tablet) / 16px (mobile, pt 72, pb 140)
 *   • content bg HARD-CODED #FFFFFF (gray #F5F7F6 only on /dashboard/settings)
 *   • minHeight calc(100dvh - 56px), marginLeft = siderWidth, NO max-width cap
 *
 * Most checks are `expect.soft` + annotations so a single run yields the full
 * deviation report rather than bailing on the first mismatch.
 */
import { test, expect, Locator, Page } from "@playwright/test";

const NEW_DESIGN_URL = process.env.NEW_DESIGN_URL || "http://localhost:3003";

// Shared design tokens (identical in frontend/app/globals.css and
// new_design/src/styles.css).
const BG_CANVAS = "rgb(245, 247, 246)"; // --background #f5f7f6 (gray)
const CARD_WHITE = "rgb(255, 255, 255)"; // --card #ffffff

const isMobile = () => test.info().project.name === "mobile";

function header(page: Page) {
  return page.locator("header:visible").first();
}
function content(page: Page) {
  return page.locator(".responsive-content").first();
}
function sider(page: Page) {
  // antd Sider (desktop/tablet persistent sidebar).
  return page.locator(".ant-layout-sider").first();
}

async function box(loc: Locator) {
  return loc.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      top: r.top,
      left: r.left,
      bottom: r.bottom,
      right: r.right,
      paddingTop: cs.paddingTop,
      paddingRight: cs.paddingRight,
      paddingBottom: cs.paddingBottom,
      paddingLeft: cs.paddingLeft,
      marginLeft: cs.marginLeft,
      marginRight: cs.marginRight,
      background: cs.backgroundColor,
      position: cs.position,
      overflowY: cs.overflowY,
      minHeight: cs.minHeight,
      borderRadius: cs.borderRadius,
      boxShadow: cs.boxShadow,
    };
  });
}

/** Page-level horizontal overflow probe — the #1 responsive breakage. */
async function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const de = document.documentElement;
    return {
      scrollWidth: de.scrollWidth,
      clientWidth: de.clientWidth,
      overflow: de.scrollWidth - de.clientWidth,
    };
  });
}

/** Sign in on the new_design prototype (it boots to a login screen and drives
 *  screens via internal state, not URLs). Mirrors header-navbar.spec.ts. */
async function signInNewDesign(page: Page) {
  await page.goto(NEW_DESIGN_URL);
  const loginBtns = page.getByRole("button", { name: /sign in|^login$/i });
  await expect(loginBtns.first()).toBeAttached({ timeout: 30_000 });
  for (let i = 0; i < (await loginBtns.count()); i++) {
    if (await loginBtns.nth(i).isVisible()) {
      await loginBtns.nth(i).click();
      return;
    }
  }
  throw new Error("no visible Sign In / Login button on :3003");
}

/* ======================================================================== *
 *  1. DESKTOP — global layout & grid structure
 * ======================================================================== */
test.describe("Desktop — layout & grid structure", () => {
  test.skip(isMobile, "desktop-only structural audit");

  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    // Mobile/tablet (<1024px) sits behind the AppContextLoader splash
    // (visibility:hidden until ready, up to an 8s safety net) — wait it out.
    await expect(content(page)).toBeVisible({ timeout: 15_000 });
  });

  test("header is anchored to the top at 56px full width", async ({ page }) => {
    const h = await box(header(page));
    expect.soft(Math.round(h.height), "header height = 56px").toBe(56);
    expect.soft(Math.round(h.top), "header anchored to top (y=0)").toBe(0);
    const vw = page.viewportSize()!.width;
    expect
      .soft(Math.round(h.width), "header spans the full viewport width")
      .toBe(vw);
  });

  test("sidebar is placed left and the content is offset by the sidebar width", async ({
    page,
  }) => {
    await expect(sider(page)).toBeVisible();
    const s = await box(sider(page));
    const c = await box(content(page));

    expect.soft(Math.round(s.left), "sidebar flush to the left edge").toBe(0);
    // Production Sider = 256px expanded (new_design lg:w-64 parity), 60 when
    // collapsed on the tablet auto-collapse path.
    expect
      .soft([256, 60], `sidebar width is 256 (or 60 collapsed), got ${s.width}`)
      .toContain(Math.round(s.width));

    // The content column must start exactly where the sidebar ends — no gap,
    // no overlap. Production sets marginLeft = siderWidth on the Content.
    expect
      .soft(
        Math.round(parseFloat(c.marginLeft)),
        "content marginLeft equals the sidebar width",
      )
      .toBe(Math.round(s.width));
  });

  test("main content padding matches the 24px / 32px blueprint", async ({
    page,
  }) => {
    const c = await box(content(page));
    // Desktop = 24px (top/bottom) 32px (left/right). Tablet auto-collapse path
    // uses 20px 24px — accept either since the viewport governs which fires.
    const pl = Math.round(parseFloat(c.paddingLeft));
    const pt = Math.round(parseFloat(c.paddingTop));
    expect.soft([32, 24], `content padding-left, got ${pl}`).toContain(pl);
    expect.soft([24, 20], `content padding-top, got ${pt}`).toContain(pt);
    // px-8 (32px) horizontal padding is the new_design parity target.
    if (pl !== 32) {
      test.info().annotations.push({
        type: "deviation",
        description: `content horizontal padding is ${pl}px; new_design uses px-8 (32px). Likely the tablet-collapsed path on a narrow desktop viewport.`,
      });
    }
  });

  test("content area fills the viewport height (min-height = 100dvh - header)", async ({
    page,
  }) => {
    const c = await box(content(page));
    const vh = page.viewportSize()!.height;
    // minHeight: calc(100dvh - 56px) → content tall enough to fill the shell.
    expect
      .soft(c.height, "content fills at least viewport height minus header")
      .toBeGreaterThanOrEqual(vh - 56 - 1);
  });

  test("no unwanted horizontal scrollbar on desktop", async ({ page }) => {
    const o = await horizontalOverflow(page);
    expect
      .soft(
        o.overflow,
        `horizontal overflow ${o.overflow}px (scrollWidth ${o.scrollWidth} vs ${o.clientWidth})`,
      )
      .toBeLessThanOrEqual(1);
  });

  test("main body is capped at max-w-[1152px] and centered (new_design parity)", async ({
    page,
  }) => {
    // new_design wraps the body in `md:max-w-6xl md:mx-auto` (1152px centered).
    // Production now mirrors this with an inner `max-w-[1152px] mx-auto w-full`
    // wrapper inside the full-width Content (DashboardLayout.tsx). Verified via
    // computed style so it's deterministic regardless of the current viewport
    // width (the cap only visibly engages when available width > 1152px).
    const body = page.getByTestId("dashboard-body");
    await expect(body, "centered body wrapper exists").toBeVisible();
    const cs = await body.evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        maxWidth: s.maxWidth,
        marginLeft: s.marginLeft,
        marginRight: s.marginRight,
      };
    });
    expect.soft(cs.maxWidth, "body capped at 1152px").toBe("1152px");
    // mx-auto → equal auto margins center the body once it hits the cap.
    expect
      .soft(cs.marginLeft, "body is horizontally centered (mx-auto)")
      .toBe(cs.marginRight);
  });

  test("dashboard canvas uses the gray #f5f7f6 background (new_design parity)", async ({
    page,
  }) => {
    // new_design paints the whole app on --background (#f5f7f6) so white cards
    // pop. Production now defaults the Content bg to #F5F7F6 app-wide (was
    // hard-coded #FFFFFF except on /dashboard/settings) — matching the
    // reference canvas everywhere.
    const c = await box(content(page));
    expect
      .soft(c.background, "dashboard canvas matches new_design --background")
      .toBe(BG_CANVAS);
  });
});

/* ======================================================================== *
 *  2. DESKTOP — main container body style + scroll physics
 * ======================================================================== */
test.describe("Desktop — body style & scroll physics", () => {
  test.skip(isMobile, "desktop-only style audit");

  test("settings route DOES use the new_design gray canvas (#f5f7f6)", async ({
    page,
  }) => {
    await page.goto("/dashboard/settings");
    // Mobile/tablet (<1024px) sits behind the AppContextLoader splash
    // (visibility:hidden until ready, up to an 8s safety net) — wait it out.
    await expect(content(page)).toBeVisible({ timeout: 15_000 });
    const c = await box(content(page));
    expect
      .soft(c.background, "settings canvas matches new_design --background")
      .toBe(BG_CANVAS);
  });

  test("chrome stays fixed while the content scrolls independently", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(header(page)).toBeVisible();
    const before = await box(header(page));

    // Drive a scroll; mimic the new_design inner overflow-y-auto UX where the
    // header/sidebar stay put while the body moves.
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(150);

    const after = await box(header(page));
    expect
      .soft(
        Math.round(after.top),
        "header stays pinned to the top after scroll",
      )
      .toBe(0);
    expect
      .soft(Math.round(after.top), "header did not move with the scroll")
      .toBe(Math.round(before.top));

    // The sidebar should likewise stay anchored.
    const s = await box(sider(page));
    expect
      .soft(Math.round(s.top), "sidebar stays anchored below the header")
      .toBeLessThanOrEqual(56);
  });

  test("the dashboard renders cards on the canvas (white card surfaces present)", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    // Mobile/tablet (<1024px) sits behind the AppContextLoader splash
    // (visibility:hidden until ready, up to an 8s safety net) — wait it out.
    await expect(content(page)).toBeVisible({ timeout: 15_000 });
    // At least one elevated/white card-like surface should exist inside the body
    // — the building block new_design renders on the gray canvas.
    const cards = content(page).locator(
      '.ant-card, [class*="rounded"], .ant-statistic',
    );
    expect
      .soft(await cards.count(), "content area renders card surfaces")
      .toBeGreaterThan(0);
  });
});

/* ======================================================================== *
 *  3. MOBILE — responsive fluid behaviour (Pixel 7)
 * ======================================================================== */
test.describe("Mobile — responsive fluid behaviour", () => {
  test.skip(() => !isMobile(), "mobile-only responsive audit");

  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    // Mobile/tablet (<1024px) sits behind the AppContextLoader splash
    // (visibility:hidden until ready, up to an 8s safety net) — wait it out.
    await expect(content(page)).toBeVisible({ timeout: 15_000 });
  });

  test("no persistent sidebar — drawer is hidden until opened", async ({
    page,
  }) => {
    // Below 767px DashboardLayout drops the fixed Sider for a drawer.
    expect.soft(await sider(page).count(), "no antd Sider on mobile").toBe(0);
    const drawer = page.locator(".sidebar-drawer");
    await expect(drawer).toHaveCount(1);
    // Hidden by default (transform: translateX(-100%), visibility hidden).
    const visible = await drawer.evaluate(
      (el) => getComputedStyle(el).visibility,
    );
    expect
      .soft(visible, "drawer hidden until the hamburger is tapped")
      .toBe("hidden");
  });

  test("content stretches to full width with 16px gutters", async ({
    page,
  }) => {
    const c = await box(content(page));
    const vw = page.viewportSize()!.width;
    expect
      .soft(Math.round(c.width), "content spans full viewport width")
      .toBe(vw);
    expect
      .soft(Math.round(parseFloat(c.paddingLeft)), "16px left gutter")
      .toBe(16);
    expect
      .soft(Math.round(parseFloat(c.paddingRight)), "16px right gutter")
      .toBe(16);
  });

  test("no horizontal scrollbar / overflow on mobile", async ({ page }) => {
    const o = await horizontalOverflow(page);
    expect
      .soft(
        o.overflow,
        `horizontal overflow ${o.overflow}px — broken right margin / clipped element`,
      )
      .toBeLessThanOrEqual(1);
  });

  test("content clears the sticky header (not clipped behind it)", async ({
    page,
  }) => {
    const h = await box(header(page));
    const c = await box(content(page));
    // paddingTop = 56 (header) + 16 → first content row sits below the bar.
    expect
      .soft(
        Math.round(parseFloat(c.paddingTop)),
        "top padding clears the 56px header",
      )
      .toBeGreaterThanOrEqual(Math.round(h.height));
  });

  test("content reserves bottom clearance for the floating buttons (≥140px)", async ({
    page,
  }) => {
    const c = await box(content(page));
    // Mobile reserves 140px (FAB 48 + AI 48 + gap + safe-area) so the last row
    // is never trapped behind the floating action buttons.
    expect
      .soft(parseFloat(c.paddingBottom), "bottom padding ≥ 140px for FABs")
      .toBeGreaterThanOrEqual(140);
  });
});

/* ======================================================================== *
 *  4. new_design parity — reference fingerprint vs production
 * ======================================================================== */
test.describe("new_design parity (localhost:3003)", () => {
  test("DESKTOP shell fingerprint: sidebar width, canvas colour, capped body", async ({
    page,
  }) => {
    test.skip(isMobile(), "desktop reference comparison");

    // ---- Production fingerprint ----
    await page.goto("/dashboard");
    // Mobile/tablet (<1024px) sits behind the AppContextLoader splash
    // (visibility:hidden until ready, up to an 8s safety net) — wait it out.
    await expect(content(page)).toBeVisible({ timeout: 15_000 });
    const prodSider = Math.round(
      await sider(page).evaluate((el) => el.getBoundingClientRect().width),
    );
    // The capped, centered inner body wrapper (new_design parity). Captured
    // BEFORE navigating to :3003 (dashboard-body only exists in production).
    const prodBody = await box(page.getByTestId("dashboard-body"));
    const prodMaxWidth = await page
      .getByTestId("dashboard-body")
      .evaluate((el) => getComputedStyle(el).maxWidth);

    // ---- new_design reference fingerprint ----
    await signInNewDesign(page);
    const refAside = page.locator("aside").first();
    await expect(
      refAside,
      "new_design side nav mounts after sign-in",
    ).toBeVisible({
      timeout: 15_000,
    });
    const ref = await box(refAside);
    const refSiderWidth = Math.round(ref.width);
    // Inner body wrapper: md:max-w-6xl md:mx-auto md:px-8
    const refBody = page.locator("div.md\\:max-w-6xl").first();
    const refBodyExists = (await refBody.count()) > 0;

    // ---- Parity assertions ----
    // Production Sider now matches the reference lg:w-64 (256px) rail exactly.
    expect
      .soft(
        prodSider,
        `sidebar width parity — production ${prodSider}px vs reference ${refSiderWidth}px`,
      )
      .toBe(refSiderWidth);
    expect.soft(prodSider, "production sidebar widened to 256px").toBe(256);

    expect
      .soft(ref.background, "reference side nav is bg-card white")
      .toBe(CARD_WHITE);

    // Capped, centered body — both surfaces bound the inner body. The exact
    // pixel widths differ with viewport, but both must cap rather than sprawl.
    expect
      .soft(refBodyExists, "reference body uses a max-w-6xl wrapper")
      .toBe(true);
    expect
      .soft(prodMaxWidth, "production body capped at max-w-[1152px]")
      .toBe("1152px");
    // The body never exceeds the available column width (sidebar-offset aware).
    const availableWidth = page.viewportSize()!.width - prodSider;
    expect
      .soft(
        Math.round(prodBody.width),
        `body width (${Math.round(prodBody.width)}px) stays within the available column`,
      )
      .toBeLessThanOrEqual(Math.round(availableWidth) + 1);
  });

  test("MOBILE shell fingerprint: no persistent sidebar, left drawer + backdrop", async ({
    page,
  }) => {
    test.skip(!isMobile(), "mobile reference comparison");

    // ---- Production ----
    await page.goto("/dashboard");
    // Mobile/tablet (<1024px) sits behind the AppContextLoader splash
    // (visibility:hidden until ready, up to an 8s safety net) — wait it out.
    await expect(content(page)).toBeVisible({ timeout: 15_000 });
    const prodHasSider = await sider(page).count();
    const prodDrawerWidth = await page
      .locator(".sidebar-drawer")
      .evaluate((el) => getComputedStyle(el).width);

    // ---- new_design reference ----
    await signInNewDesign(page);
    // On mobile the reference hides the <aside> (md:flex only) and uses a drawer.
    const refAsideVisible = await page
      .locator("aside")
      .first()
      .isVisible()
      .catch(() => false);

    expect
      .soft(prodHasSider, "no persistent Sider on mobile (production)")
      .toBe(0);
    expect
      .soft(
        refAsideVisible,
        "reference side nav is hidden on mobile (drawer instead)",
      )
      .toBe(false);
    // Production drawer 82% (max 340px); reference drawer w-[82%]. Width parity
    // by ratio — both are 82% of the device width.
    const vw = page.viewportSize()!.width;
    const ratio = parseFloat(prodDrawerWidth) / vw;
    expect
      .soft(
        ratio,
        `production drawer ≈ 82% of viewport (got ${(ratio * 100).toFixed(0)}%)`,
      )
      .toBeGreaterThanOrEqual(0.78);
  });
});
