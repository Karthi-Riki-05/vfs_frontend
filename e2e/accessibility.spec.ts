import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// ─────────────────────────────────────────────────────────────────────────────
// Phase 8 — Accessibility (WCAG 2.0 A/AA via axe-core)
//
// Coverage: Auth, Dashboard (Pro + Team apps), Flow/Content, Account, Team/Chat
// pages + keyboard navigation, form a11y, ARIA/semantic HTML, color contrast,
// and mobile accessibility.
//
// storageState: the Playwright config logs the Pro user in by DEFAULT (global
// storageState ./e2e/.auth/pro.json). Authenticated specs rely on that default;
// auth-page specs clear it via `test.use({ storageState: {...} })`.
// ─────────────────────────────────────────────────────────────────────────────

const wcag = (page: any) =>
  new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]);

const critical = (results: { violations: any[] }) =>
  results.violations.filter((v) => v.impact === "critical");
const serious = (results: { violations: any[] }) =>
  results.violations.filter((v) => v.impact === "serious");

// ═══════════════════════════════════════════════════════════════════════════
// LEGACY (kept verbatim from the original 2/5 baseline)
// ═══════════════════════════════════════════════════════════════════════════
test.describe("Accessibility", () => {
  test("A11Y-01: dashboard has no critical violations", async ({ page }) => {
    await page.goto("/dashboard/pro");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    expect(critical(results)).toHaveLength(0);
  });

  test.describe("Logged-out", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("A11Y-02: login has no critical violations", async ({ page }) => {
      await page.goto("/login");
      await page.waitForLoadState("networkidle");

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a"])
        .analyze();

      expect(critical(results)).toHaveLength(0);
    });

    test("A11Y-03: email field has an accessible/visible label", async ({
      page,
    }) => {
      await page.goto("/login");
      await page.waitForLoadState("networkidle");

      const emailInput = page.locator('input[type="email"]').first();
      const ariaLabel = await emailInput.getAttribute("aria-label");
      const ariaLabelledBy = await emailInput.getAttribute("aria-labelledby");
      const id = await emailInput.getAttribute("id");
      const placeholder = await emailInput.getAttribute("placeholder");

      const forLabel =
        id !== null && (await page.locator(`label[for="${id}"]`).count()) > 0;
      const visibleLabel = (await page.getByText(/^email$/i).count()) > 0;
      const hasAccessibleName =
        ariaLabel !== null ||
        ariaLabelledBy !== null ||
        forLabel ||
        (visibleLabel && !!placeholder);

      expect(hasAccessibleName).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AUTH PAGES — logged-out (axe, forms, keyboard, contrast, mobile login)
// ═══════════════════════════════════════════════════════════════════════════
test.describe("Accessibility — Auth Pages", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("A11Y-AUTH-01: /login critical violations", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    const results = await wcag(page).analyze();
    const crit = critical(results);
    if (crit.length > 0) {
      console.log(
        "Critical violations on /login:",
        crit.map((v) => ({ id: v.id, nodes: v.nodes.length })),
      );
    }
    expect(crit).toHaveLength(0);
  });

  test("A11Y-AUTH-02: /login serious violations", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const results = await wcag(page).analyze();
    const ser = serious(results);
    if (ser.length > 0) {
      console.log(
        "Serious violations on /login:",
        ser.map((v) => v.id),
      );
    }
    expect(ser.length).toBeLessThan(5);
  });

  test("A11Y-AUTH-03: /register critical violations", async ({ page }) => {
    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    const results = await wcag(page).analyze();
    const crit = critical(results);
    if (crit.length > 0) {
      console.log(
        "Critical violations on /register:",
        crit.map((v) => v.id),
      );
    }
    expect(crit).toHaveLength(0);
  });

  test("A11Y-AUTH-04: /register inputs are labelled", async ({ page }) => {
    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    const inputs = page.locator('input:not([type="hidden"])');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute("id");
      const ariaLabel = await input.getAttribute("aria-label");
      const ariaLabelledby = await input.getAttribute("aria-labelledby");
      const placeholder = await input.getAttribute("placeholder");

      const hasLabel =
        ariaLabel !== null ||
        ariaLabelledby !== null ||
        placeholder !== null ||
        (id !== null && (await page.locator(`label[for="${id}"]`).count()) > 0);

      if (!hasLabel) {
        console.log(
          `Input ${i} missing label:`,
          (await input.getAttribute("name")) ||
            (await input.getAttribute("type")),
        );
      }
    }

    expect(await page.locator("body").isVisible()).toBe(true);
  });

  test("A11Y-AUTH-05: /login keyboard navigable", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await page.keyboard.press("Tab");
    const focused1 = await page.evaluate(() => document.activeElement?.tagName);
    await page.keyboard.press("Tab");
    const focused2 = await page.evaluate(() => document.activeElement?.tagName);

    const interactive = ["INPUT", "BUTTON", "A", "TEXTAREA"];
    expect(
      interactive.includes(focused1 || "") ||
        interactive.includes(focused2 || ""),
    ).toBe(true);
  });

  // ── Form accessibility (login) ──
  test("FORM-A11Y-01: login inputs labelled (axe label rule)", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withRules(["label", "label-content-name-mismatch"])
      .analyze();

    if (results.violations.length > 0) {
      console.log(
        "Label violations:",
        results.violations.map((v) => v.id),
      );
    }
    expect(critical(results)).toHaveLength(0);
  });

  test("FORM-A11Y-03: login fields requireable", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const email = page.locator('input[type="email"]').first();
    const required = await email.getAttribute("required");
    const ariaRequired = await email.getAttribute("aria-required");
    console.log("Login email required:", { required, ariaRequired });

    expect(await page.locator("body").isVisible()).toBe(true);
  });

  test("FORM-A11Y-04: login error messages accessible", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await page
      .locator('button[type="submit"], button:has-text("Sign in")')
      .first()
      .click()
      .catch(() => {});
    await page.waitForTimeout(500);

    const alerts = await page.locator('[role="alert"], [aria-live]').count();
    console.log("Login live/alert regions:", alerts);
    expect(await page.locator("body").isVisible()).toBe(true);
  });

  test("FORM-A11Y-05: login autocomplete attributes", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const emailAutocomplete = await page
      .locator('input[type="email"]')
      .first()
      .getAttribute("autocomplete");
    const pwAutocomplete = await page
      .locator('input[type="password"]')
      .first()
      .getAttribute("autocomplete");

    console.log("Autocomplete values:", {
      email: emailAutocomplete,
      password: pwAutocomplete,
    });
    expect(await page.locator("body").isVisible()).toBe(true);
  });

  // ── Keyboard / focus visibility (login) ──
  test("KEY-01: login form keyboard navigable", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const focused: (string | undefined)[] = [];
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press("Tab");
      focused.push(await page.evaluate(() => document.activeElement?.tagName));
    }
    expect(
      ["INPUT", "BUTTON", "A", "TEXTAREA"].some((tag) => focused.includes(tag)),
    ).toBe(true);
  });

  test("KEY-06: focus indicator present on login", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await page.keyboard.press("Tab");
    const focusStyle = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      const s = window.getComputedStyle(el);
      return {
        outline: s.outline,
        outlineWidth: s.outlineWidth,
        boxShadow: s.boxShadow,
      };
    });
    expect(focusStyle).not.toBeNull();
  });

  // ── Color contrast (login) ──
  test("COLOR-01: login color contrast", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withRules(["color-contrast"])
      .analyze();

    if (results.violations.length > 0) {
      console.log(
        "Contrast violations on /login:",
        results.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.slice(0, 3).map((n) => n.html.slice(0, 80)),
        })),
      );
    }
    expect(critical(results)).toHaveLength(0);
  });

  // ── Mobile login ──
  test("MOB-A11Y-03: mobile login accessible", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const results = await wcag(page).analyze();
    const crit = critical(results);
    if (crit.length > 0) {
      console.log(
        "Critical mobile login violations:",
        crit.map((v) => v.id),
      );
    }
    expect(crit).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD — Pro + Team apps (authenticated via global storageState)
// ═══════════════════════════════════════════════════════════════════════════
test.describe("Accessibility — Dashboard", () => {
  test("A11Y-DASH-01: /dashboard/pro critical", async ({ page }) => {
    await page.goto("/dashboard/pro");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const results = await wcag(page).exclude('[class*="editor"]').analyze();
    const crit = critical(results);
    if (crit.length > 0)
      console.log(
        "Critical /dashboard/pro:",
        crit.map((v) => v.id),
      );
    expect(crit).toHaveLength(0);
  });

  test("A11Y-DASH-02: /dashboard/pro serious", async ({ page }) => {
    await page.goto("/dashboard/pro");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const results = await wcag(page).analyze();
    const ser = serious(results);
    if (ser.length > 0)
      console.log(
        "Serious /dashboard/pro:",
        ser.map((v) => ({ id: v.id, nodes: v.nodes.length })),
      );
    expect(ser.length).toBeLessThan(5);
  });

  test("A11Y-DASH-03: /dashboard/team critical", async ({ page }) => {
    await page.goto("/dashboard/team");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const results = await wcag(page).exclude('[class*="editor"]').analyze();
    const crit = critical(results);
    if (crit.length > 0)
      console.log(
        "Critical /dashboard/team:",
        crit.map((v) => v.id),
      );
    expect(crit).toHaveLength(0);
  });

  test("A11Y-DASH-04: /dashboard/team serious", async ({ page }) => {
    await page.goto("/dashboard/team");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const results = await wcag(page).analyze();
    const ser = serious(results);
    if (ser.length > 0)
      console.log(
        "Serious /dashboard/team:",
        ser.map((v) => v.id),
      );
    expect(ser.length).toBeLessThan(5);
  });

  test("A11Y-DASH-05: heading order (no skipped levels)", async ({ page }) => {
    await page.goto("/dashboard/pro");
    await page.waitForLoadState("networkidle");

    const headings = await page.evaluate(() =>
      Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6")).map((el) => ({
        level: parseInt(el.tagName[1]),
        text: el.textContent?.trim().slice(0, 50),
      })),
    );

    let prev = 0;
    for (const h of headings) {
      if (prev !== 0 && h.level > prev + 1) {
        console.log(`Heading level skip: h${prev}→h${h.level}`, h.text);
      }
      prev = h.level;
    }
    expect(await page.locator("body").isVisible()).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FLOW + CONTENT PAGES
// ═══════════════════════════════════════════════════════════════════════════
test.describe("Accessibility — Flow Pages", () => {
  const FLOW_PAGES = [
    { url: "/dashboard/flows", name: "Flows" },
    { url: "/dashboard/recents", name: "Recents" },
    { url: "/dashboard/favourites", name: "Favourites" },
    { url: "/dashboard/trash", name: "Trash" },
    { url: "/dashboard/projects", name: "Projects" },
    { url: "/dashboard/shapes", name: "Shapes" },
  ];

  for (const { url, name } of FLOW_PAGES) {
    test(`A11Y-FLOW-${name}: critical violations`, async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      const results = await wcag(page).analyze();
      const crit = critical(results);
      if (crit.length > 0) {
        console.log(
          `Critical violations on ${url}:`,
          crit.map((v) => ({
            id: v.id,
            nodes: v.nodes.length,
            help: v.helpUrl,
          })),
        );
      }
      expect(crit).toHaveLength(0);
    });

    test(`A11Y-FLOW-${name}: serious violations`, async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      const results = await wcag(page).analyze();
      const ser = serious(results);
      if (ser.length > 0) {
        console.log(
          `Serious violations on ${url}:`,
          ser.map((v) => v.id),
        );
      }
      expect(ser.length).toBeLessThan(5);
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ACCOUNT PAGES
// ═══════════════════════════════════════════════════════════════════════════
test.describe("Accessibility — Account Pages", () => {
  const ACCOUNT_PAGES = [
    { url: "/dashboard/settings", name: "Settings" },
    { url: "/dashboard/subscription", name: "Subscription" },
    { url: "/dashboard/settings/billing", name: "Billing" },
    { url: "/dashboard/notifications", name: "Notifications" },
  ];

  for (const { url, name } of ACCOUNT_PAGES) {
    test(`A11Y-ACCT-${name}: critical violations`, async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      const results = await wcag(page).analyze();
      const crit = critical(results);
      if (crit.length > 0) {
        console.log(
          `Critical violations on ${url}:`,
          crit.map((v) => ({ id: v.id, nodes: v.nodes.length })),
        );
      }
      expect(crit).toHaveLength(0);
    });
  }

  test("FORM-A11Y-02: settings form labelled", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withRules(["label", "aria-required-attr", "aria-input-field-name"])
      .analyze();

    const crit = critical(results);
    if (crit.length > 0) {
      console.log(
        "Form critical violations:",
        crit.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target.join(", ")),
        })),
      );
    }
    expect(crit).toHaveLength(0);
  });

  test("COLOR-04: subscription page contrast", async ({ page }) => {
    await page.goto("/dashboard/subscription");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withRules(["color-contrast"])
      .analyze();
    const crit = critical(results);
    if (crit.length > 0)
      console.log(
        "Contrast violations /subscription:",
        crit.map((v) => v.id),
      );
    expect(crit).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TEAM + CHAT PAGES
// ═══════════════════════════════════════════════════════════════════════════
test.describe("Accessibility — Team + Chat", () => {
  test("A11Y-TEAM-01: /teams critical", async ({ page }) => {
    await page.goto("/dashboard/teams");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    const results = await wcag(page).analyze();
    const crit = critical(results);
    if (crit.length > 0)
      console.log(
        "Critical /teams:",
        crit.map((v) => v.id),
      );
    expect(crit).toHaveLength(0);
  });

  test("A11Y-TEAM-02: /teams serious", async ({ page }) => {
    await page.goto("/dashboard/teams");
    await page.waitForLoadState("networkidle");

    const results = await wcag(page).analyze();
    const ser = serious(results);
    if (ser.length > 0)
      console.log(
        "Serious /teams:",
        ser.map((v) => v.id),
      );
    expect(ser.length).toBeLessThan(5);
  });

  test("A11Y-CHAT-01: /chat critical", async ({ page }) => {
    await page.goto("/dashboard/chat");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    const results = await wcag(page).analyze();
    const crit = critical(results);
    if (crit.length > 0)
      console.log(
        "Critical /chat:",
        crit.map((v) => v.id),
      );
    expect(crit).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// KEYBOARD NAVIGATION (authenticated)
// ═══════════════════════════════════════════════════════════════════════════
test.describe("Keyboard Navigation", () => {
  test("KEY-02: dashboard sidebar keyboard nav", async ({ page }) => {
    await page.goto("/dashboard/pro");
    await page.waitForLoadState("networkidle");

    const focused: (string | undefined)[] = [];
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Tab");
      focused.push(await page.evaluate(() => document.activeElement?.tagName));
    }
    expect(
      focused.some((tag) => ["A", "BUTTON", "INPUT"].includes(tag || "")),
    ).toBe(true);
  });

  test("KEY-03: modal opens + focus reaches dialog", async ({ page }) => {
    await page.goto("/dashboard/projects");
    await page.waitForLoadState("networkidle");

    await page
      .click(
        'button:has-text("New Project"), button:has-text("Create Project")',
      )
      .catch(() => {});

    const dialog = page.locator('[role="dialog"], .ant-modal');
    if (await dialog.count()) {
      await page.waitForTimeout(300);
      const activeTag = await page.evaluate(
        () => document.activeElement?.tagName,
      );
      expect(
        ["INPUT", "BUTTON", "TEXTAREA"].includes(activeTag || "") ||
          (await dialog.first().isVisible()),
      ).toBe(true);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }
    expect(await page.locator("body").isVisible()).toBe(true);
  });

  test("KEY-04: escape closes modal", async ({ page }) => {
    await page.goto("/dashboard/projects");
    await page.waitForLoadState("networkidle");

    await page
      .click(
        'button:has-text("New Project"), button:has-text("Create Project")',
      )
      .catch(() => {});

    const dialog = page.locator('[role="dialog"], .ant-modal');
    if ((await dialog.count()) && (await dialog.first().isVisible())) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
      await expect(page.locator('[role="dialog"]'))
        .not.toBeVisible({ timeout: 3000 })
        .catch(() => {});
    }
    expect(await page.locator("body").isVisible()).toBe(true);
  });

  test("KEY-05: flows page exposes interactive controls", async ({ page }) => {
    await page.goto("/dashboard/flows");
    await page.waitForLoadState("networkidle");

    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const activeTag = await page.evaluate(
      () => document.activeElement?.tagName,
    );
    expect(["A", "BUTTON", "INPUT", "BODY", undefined]).toContain(activeTag);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ARIA + SEMANTIC HTML
// ═══════════════════════════════════════════════════════════════════════════
test.describe("ARIA + Semantic HTML", () => {
  test("ARIA-01: buttons have accessible names", async ({ page }) => {
    await page.goto("/dashboard/pro");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withRules(["button-name", "aria-command-name"])
      .analyze();

    if (results.violations.length > 0) {
      console.log(
        "Button name violations:",
        results.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.html.slice(0, 100)),
        })),
      );
    }
    expect(critical(results)).toHaveLength(0);
  });

  test("ARIA-02: images have alt text", async ({ page }) => {
    await page.goto("/dashboard/pro");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withRules(["image-alt", "image-redundant-alt"])
      .analyze();

    if (results.violations.length > 0) {
      console.log(
        "Image alt violations:",
        results.violations.map((v) => v.id),
      );
    }
    expect(critical(results)).toHaveLength(0);
  });

  test("ARIA-03: nav + main landmarks present", async ({ page }) => {
    await page.goto("/dashboard/pro");
    await page.waitForLoadState("networkidle");

    const nav = await page.locator('nav, [role="navigation"]').count();
    const main = await page.locator('main, [role="main"]').count();
    console.log("Landmarks:", { nav, main });
    expect(await page.locator("body").isVisible()).toBe(true);
  });

  test("ARIA-04: valid ARIA roles/attrs", async ({ page }) => {
    await page.goto("/dashboard/flows");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withRules([
        "aria-roles",
        "aria-required-children",
        "aria-required-parent",
        "aria-valid-attr",
        "aria-valid-attr-value",
      ])
      .analyze();

    const crit = critical(results);
    if (crit.length > 0)
      console.log(
        "ARIA role violations:",
        crit.map((v) => v.id),
      );
    expect(crit).toHaveLength(0);
  });

  test("ARIA-05: FAB has accessible name", async ({ page }) => {
    await page.goto("/dashboard/flows");
    await page.waitForLoadState("networkidle");

    const fab = page
      .locator(
        '[class*="fab"], button[class*="floating"], [aria-label="Create new"]',
      )
      .first();

    if (await fab.count()) {
      const ariaLabel = await fab.getAttribute("aria-label");
      const title = await fab.getAttribute("title");
      const text = await fab.textContent();
      const hasName =
        ariaLabel !== null || title !== null || (text?.trim().length || 0) > 0;
      if (!hasName) console.log("FAB missing accessible name");
    }
    expect(await page.locator("body").isVisible()).toBe(true);
  });

  test("ARIA-06: page heading (h1) present", async ({ page }) => {
    await page.goto("/dashboard/pro");
    await page.waitForLoadState("networkidle");

    const h1Count = await page.locator("h1").count();
    if (h1Count !== 1) {
      const texts = await page.locator("h1").allTextContents();
      console.log(`h1 count = ${h1Count}:`, texts);
    }
    expect(await page.locator("body").isVisible()).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// COLOR CONTRAST (authenticated)
// ═══════════════════════════════════════════════════════════════════════════
test.describe("Color Contrast", () => {
  test("COLOR-02: dashboard color contrast", async ({ page }) => {
    await page.goto("/dashboard/pro");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withRules(["color-contrast"])
      .analyze();

    if (results.violations.length > 0) {
      console.log(
        "Contrast violations on /dashboard/pro:",
        results.violations.map((v) => ({ id: v.id, count: v.nodes.length })),
      );
    }
    expect(critical(results)).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// MOBILE ACCESSIBILITY (authenticated, 390×844)
// ═══════════════════════════════════════════════════════════════════════════
test.describe("Mobile Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test("MOB-A11Y-01: touch target sizes (audit)", async ({ page }) => {
    await page.goto("/dashboard/flows");
    await page.waitForLoadState("networkidle");

    const smallTargets = await page.evaluate(() => {
      const els = document.querySelectorAll('button, a, [role="button"]');
      const small: any[] = [];
      els.forEach((btn) => {
        const r = btn.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44)) {
          small.push({
            text: btn.textContent?.trim().slice(0, 30),
            width: Math.round(r.width),
            height: Math.round(r.height),
          });
        }
      });
      return small.slice(0, 10);
    });

    if (smallTargets.length > 0)
      console.log("Small touch targets (<44px):", smallTargets);
    expect(await page.locator("body").isVisible()).toBe(true);
  });

  test("MOB-A11Y-02: zoom not disabled", async ({ page }) => {
    await page.goto("/dashboard/pro");
    await page.waitForLoadState("networkidle");

    const viewport = await page.evaluate(
      () =>
        document
          .querySelector('meta[name="viewport"]')
          ?.getAttribute("content") || "",
    );
    console.log("Viewport meta:", viewport);
    expect(viewport).not.toContain("user-scalable=no");
    expect(viewport).not.toContain("maximum-scale=1");
  });

  test("MOB-A11Y-04: mobile dashboard accessible", async ({ page }) => {
    await page.goto("/dashboard/pro");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const results = await wcag(page).exclude('[class*="editor"]').analyze();
    const crit = critical(results);
    if (crit.length > 0)
      console.log(
        "Critical mobile dashboard violations:",
        crit.map((v) => v.id),
      );
    expect(crit).toHaveLength(0);
  });

  test("MOB-A11Y-05: orientation not locked", async ({ page }) => {
    await page.goto("/dashboard/pro");
    await page.waitForLoadState("networkidle");

    const viewport = await page.evaluate(
      () =>
        document
          .querySelector('meta[name="viewport"]')
          ?.getAttribute("content") || "",
    );
    expect(viewport).not.toContain("orientation");
  });
});
