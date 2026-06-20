import { test, expect } from "@playwright/test";

/**
 * Mobile drawer sidebar parity audit — BOTH app variants.
 *
 * Runs under the dedicated `mobile` project in playwright.config.ts (Pixel 7,
 * 412×915 — below the 767px breakpoint so the hamburger renders). For each
 * variant we force the app context, mount the matching drawer, open it, and
 * verify the mobile fixes + the NavTile `!`-cascade, then snapshot the nav
 * region for visual regression.
 *
 *   Team  → Sidebar.tsx     · Create-a-Flow pill HIDDEN (FAB is sole entry)
 *   Pro   → ProSidebar.tsx  · Create-a-Flow pill PRESENT (by design)
 *
 * The `!`-cascade (Tailwind v4 `!` modifier beating Ant's unlayered <a> reset)
 * lives in the shared NavTile.tsx, so it is asserted for both drawers.
 *
 * Auth: inherits storageState ./e2e/.auth/pro.json from playwright.config.ts.
 */

interface Variant {
  app: "team" | "pro";
  home: string;
  /** Whether the Create-a-Flow pill should exist in this drawer. */
  createPillPresent: boolean;
  /** Pro hero avatar is initial-only (no <img> branch). */
  avatarCanBeImage: boolean;
}

const VARIANTS: Variant[] = [
  {
    app: "team",
    home: "/dashboard/team",
    createPillPresent: false,
    avatarCanBeImage: true,
  },
  {
    app: "pro",
    home: "/dashboard/pro",
    createPillPresent: true,
    avatarCanBeImage: false,
  },
];

for (const v of VARIANTS) {
  test(`mobile drawer [${v.app}]: fixes + NavTile cascade`, async ({
    page,
  }) => {
    // Force the app context BEFORE any app script runs so DashboardLayout
    // mounts the correct sidebar (currentApp drives Sidebar vs ProSidebar).
    await page.addInitScript((mode) => {
      try {
        sessionStorage.setItem("vc_app_context", mode as string);
      } catch {
        /* restricted WebView — ignore */
      }
    }, v.app);

    await page.goto(v.home, { waitUntil: "networkidle" });

    // The mobile AppContextLoader splash (z-index 9999, ≥1.2s, shown once per
    // app-context) overlays the header and would intercept the hamburger tap.
    // Wait for it to detach before interacting — otherwise the first click is
    // swallowed by the overlay (the source of the prior Pro-case flake).
    await page
      .locator('[data-testid="app-context-loader"]')
      .waitFor({ state: "detached", timeout: 12_000 })
      .catch(() => {
        /* splash may already be gone (already-loaded context) — fine */
      });

    // Hamburger only mounts below 767px — proves the mobile layout is active.
    const hamburger = page.getByRole("button", { name: "Open menu" });
    await expect(
      hamburger,
      "hamburger should render on mobile viewport",
    ).toBeVisible();

    // ── Open the drawer ──
    await hamburger.click();
    const drawer = page.locator(".sidebar-drawer");
    await expect(drawer).toHaveClass(/open/);
    const drawerBody = drawer.locator(".tw").first();
    await expect(drawerBody).toBeVisible();
    await expect(
      drawer.getByRole("button", { name: "Close menu" }),
    ).toBeVisible();

    // ── FIX 1: Create-a-Flow pill — hidden on Team, present on Pro ──
    const createPill = drawer.getByRole("button", { name: "Create a Flow" });
    if (v.createPillPresent) {
      await expect(
        createPill,
        "Pro drawer keeps the Create-a-Flow pill by design",
      ).toHaveCount(1);
    } else {
      await expect(
        createPill,
        "Team drawer must hide the Create-a-Flow pill (FAB is the entry point)",
      ).toHaveCount(0);
    }

    // ── FIX 2: avatar renders an <img> OR a clean initial fallback ──
    // Hero avatar = the round 48px box at the top of the drawer.
    const avatar = drawer.locator("div.rounded-full").first();
    await expect(avatar).toBeVisible();
    const avatarBox = await avatar.boundingBox();
    expect(avatarBox, "avatar should occupy layout space").not.toBeNull();
    expect(avatarBox!.width).toBeGreaterThanOrEqual(40);
    expect(avatarBox!.height).toBeGreaterThanOrEqual(40);

    const img = avatar.locator("img");
    const hasImg = (await img.count()) > 0;
    if (hasImg) {
      const decoded = await img.evaluate(
        (el: HTMLImageElement) => el.complete && el.naturalWidth > 0,
      );
      expect(decoded, "avatar <img> must decode without a broken layout").toBe(
        true,
      );
    } else {
      const initial = (await avatar.innerText()).trim();
      expect(initial.length).toBeGreaterThan(0);
    }
    if (!v.avatarCanBeImage) {
      expect(hasImg, "Pro hero avatar is initial-only (no <img> branch)").toBe(
        false,
      );
    }
    console.log(
      `[${v.app}][avatar] mode=${hasImg ? "image" : "initial-fallback"}`,
    );

    // ── FIX 3: NavTile `!`-cascade on every nav row ──
    const rows = drawer.locator("nav a, nav button");
    const count = await rows.count();
    console.log(`[${v.app}][nav] drawer nav rows = ${count}`);
    expect(
      count,
      "drawer should render the full nav set",
    ).toBeGreaterThanOrEqual(13);

    let activeSeen = 0;
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const cs = await row.evaluate((el) => {
        const s = getComputedStyle(el);
        return {
          transitionProperty: s.transitionProperty,
          transitionDuration: s.transitionDuration,
          label: (el.textContent || "").trim().slice(0, 24),
        };
      });

      // `!transition` must cover background-color with a non-zero duration —
      // Ant's unlayered `a{transition:color .3s}` would otherwise limit it.
      const coversBg =
        cs.transitionProperty === "all" ||
        /background-color|background/.test(cs.transitionProperty);
      expect(
        coversBg,
        `[${v.app}] row "${cs.label}" transition must include background-color (got "${cs.transitionProperty}")`,
      ).toBe(true);
      expect(
        parseFloat(cs.transitionDuration) > 0,
        `[${v.app}] row "${cs.label}" must have a non-zero transition duration`,
      ).toBe(true);

      const isActive = await row.evaluate((el) =>
        el.className.includes("!bg-primary-tint"),
      );
      if (isActive) activeSeen++;
    }

    // Exactly the Dashboard row should be active on each app's home route.
    expect(activeSeen, "exactly one active nav row expected").toBe(1);

    // ── Cascade proof #1 (runtime): the ACTIVE row is an <a> (Link). Ant's
    // unlayered `a{background-color:transparent}` would kill its pill; seeing a
    // non-transparent tint on an <a> proves `!bg-primary-tint` wins. This is
    // the mobile-correct equivalent of the desktop hover test — :hover never
    // paints on a touch viewport, so the active/tap state is the real signal.
    const activeRow = drawer.locator("nav a.\\!bg-primary-tint").first();
    await expect(activeRow).toBeVisible();
    const activeInfo = await activeRow.evaluate((el) => ({
      tag: el.tagName.toLowerCase(),
      bg: getComputedStyle(el).backgroundColor,
    }));
    console.log(
      `[${v.app}][cascade] active row <${activeInfo.tag}> bg=${activeInfo.bg}`,
    );
    expect(activeInfo.tag, "active row should be an anchor (Link)").toBe("a");
    expect(activeInfo.bg).not.toMatch(/rgba?\(0, 0, 0, 0\)|transparent/);

    // ── Cascade proof #2 (stylesheet): the hover tint shipped as `!important`,
    // which is what lets it out-rank antd's unlayered reset (hover can't be
    // exercised live on a touch viewport, so verify the rule exists in the CSS).
    const hoverRuleImportant = await page.evaluate(() => {
      for (const sheet of Array.from(document.styleSheets)) {
        let rules: CSSRuleList;
        try {
          rules = sheet.cssRules;
        } catch {
          continue; // cross-origin sheet — skip
        }
        for (const r of Array.from(rules)) {
          const cssText = (r as CSSStyleRule).cssText || "";
          if (
            cssText.includes(":hover") &&
            /background-color/.test(cssText) &&
            /!important/.test(cssText) &&
            /secondary/.test(cssText)
          ) {
            return true;
          }
        }
      }
      return false;
    });
    expect(
      hoverRuleImportant,
      "hover:!bg-secondary tint must ship as !important to beat antd's reset",
    ).toBe(true);

    // ── Visual regression: snapshot the (stable) nav region. The hero is
    // excluded because its credits pill / email are dynamic; the 14 nav rows
    // are deterministic and are what the cascade fixes actually style.
    await expect(drawer.locator("nav")).toHaveScreenshot(
      `drawer-nav-${v.app}.png`,
      { maxDiffPixelRatio: 0.02 },
    );
  });
}
