import { test, expect, Page } from "@playwright/test";

/**
 * CSS Override Audit — runtime computed-style trace.
 *
 * Guards the two style-pollution regressions where global/legacy CSS leaked
 * onto the ported shadcn/Tailwind (`.tw`) design system:
 *
 *   1. Green focus ring on inputs — an UNLAYERED `*:focus-visible { outline:
 *      2px solid #3cb371 }` in globals.css beat every @layer (incl. utilities),
 *      overriding shadcn's own `focus-visible:outline-none`. Fixed by moving it
 *      into @layer base and scoping it out of `.tw` (:not(.tw, .tw *)).
 *
 *   2. Native bevel border/shadow under buttons + washed-out inputs — the `.tw`
 *      scoped base reset omitted `border-width:0; border-style:solid` and native
 *      form-control `appearance`, so UA button/input chrome bled through (no
 *      global preflight is imported, to protect Ant Design). Fixed by extending
 *      the `.tw` @layer base reset with the preflight form-control subset.
 *
 * The legacy green is rgb(60, 179, 113) (#3cb371). The intended design ring is
 * --primary #34a881 = rgb(52, 168, 129), applied as a 1px shadcn ring, NOT a 2px
 * offset outline.
 *
 * Run with the app up: PLAYWRIGHT_BASE_URL=http://localhost:3002 (default).
 */

const LEGACY_GREEN = "rgb(60, 179, 113)"; // #3cb371 — must never appear on .tw

type Computed = Record<string, string>;

/** Read a set of computed style props off a focused/element handle in-page. */
async function computedOf(
  page: Page,
  selector: string,
  props: string[],
): Promise<Computed> {
  return page.$eval(
    selector,
    (el, p) => {
      const cs = getComputedStyle(el as Element);
      const out: Record<string, string> = {};
      for (const k of p as string[]) out[k] = cs.getPropertyValue(k);
      return out;
    },
    props,
  );
}

function trace(title: string, c: Computed) {
  // Surface the full computed trace in the Playwright `list` reporter output.
  // eslint-disable-next-line no-console
  console.log(`\n── CSS trace: ${title} ──\n` + JSON.stringify(c, null, 2));
}

// ───────────────────────────── Login page (unauthenticated) ────────────────
test.describe("CSS override audit — login inputs", () => {
  // Login must be reached with a clean context (global storageState is pro.json).
  test.use({ storageState: { cookies: [], origins: [] } });

  test("focused email input has no leaked legacy green outline", async ({
    page,
  }) => {
    await page.goto("/login");

    const email = page.locator('input[type="email"]').first();
    await expect(email).toBeVisible();

    // Keyboard focus so :focus-visible matches the way the user triggers it.
    await email.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await email.focus();

    const props = [
      "outline-color",
      "outline-width",
      "outline-style",
      "box-shadow",
      "border-color",
    ];
    const c = await computedOf(page, 'input[type="email"]', props);
    trace("login email (focused)", c);

    // Regression #1: the legacy 2px green offset outline must be gone.
    expect(c["outline-color"]).not.toBe(LEGACY_GREEN);
    // shadcn inputs declare `outline-none` → transparent/none, never a 2px solid green.
    const isLeak =
      c["outline-style"] === "solid" &&
      c["outline-width"] === "2px" &&
      c["outline-color"] === LEGACY_GREEN;
    expect(
      isLeak,
      "legacy *:focus-visible green outline leaked onto .tw input",
    ).toBe(false);
  });

  test("login submit button has stripped native chrome (preflight reset active)", async ({
    page,
  }) => {
    await page.goto("/login");

    const submit = page.getByRole("button", { name: /sign in|login/i }).first();
    await expect(submit).toBeVisible();

    const props = [
      "appearance",
      "-webkit-appearance",
      "border-top-style",
      "border-top-width",
      "border-radius",
      "box-shadow",
      "background-color",
    ];
    const handle = await submit.elementHandle();
    const c = (await handle!.evaluate((el, p) => {
      const cs = getComputedStyle(el as Element);
      const out: Record<string, string> = {};
      for (const k of p as string[]) out[k] = cs.getPropertyValue(k);
      return out;
    }, props)) as Computed;
    trace("login submit button", c);

    // Regression #2: scoped preflight must have neutralized native button chrome.
    expect(c["appearance"]).toBe("none");
    expect(c["border-top-style"]).toBe("solid");
    // No leftover UA bevel border (utilities add border only where intended).
    expect(c["border-top-width"]).toBe("0px");
    // The intended soft shadow / radius from the design tokens is present.
    expect(c["border-radius"]).not.toBe("0px");
  });
});

// ───────────────────────────── Dashboard (authenticated, pro.json) ─────────
test.describe("CSS override audit — dashboard buttons & inputs", () => {
  test("Create-Flow / primary buttons under .tw show no native bevel", async ({
    page,
  }) => {
    await page.goto("/dashboard/flows");
    await page.waitForLoadState("networkidle");

    // Any button inside the migrated `.tw` subtree must have the reset applied.
    const btn = page.locator(".tw button").first();
    await expect(btn).toBeVisible();

    const props = [
      "appearance",
      "border-top-style",
      "border-top-width",
      "border-left-width",
    ];
    const handle = await btn.elementHandle();
    const c = (await handle!.evaluate((el, p) => {
      const cs = getComputedStyle(el as Element);
      const out: Record<string, string> = {};
      for (const k of p as string[]) out[k] = cs.getPropertyValue(k);
      return out;
    }, props)) as Computed;
    trace("dashboard .tw button", c);

    expect(c["appearance"]).toBe("none");
    expect(c["border-top-style"]).toBe("solid");
  });

  test("focused dashboard input has no legacy green outline", async ({
    page,
  }) => {
    await page.goto("/dashboard/flows");
    await page.waitForLoadState("networkidle");

    const input = page.locator(".tw input:visible").first();
    if ((await input.count()) === 0)
      test.skip(true, "no .tw input on this view");
    await input.scrollIntoViewIfNeeded();
    await input.focus();

    const handle = await input.elementHandle();
    const c = (await handle!.evaluate((el) => {
      const cs = getComputedStyle(el as Element);
      return {
        "outline-color": cs.outlineColor,
        "outline-width": cs.outlineWidth,
        "outline-style": cs.outlineStyle,
      } as Record<string, string>;
    })) as Computed;
    trace("dashboard .tw input (focused)", c);

    const isLeak =
      c["outline-style"] === "solid" &&
      c["outline-width"] === "2px" &&
      c["outline-color"] === LEGACY_GREEN;
    expect(isLeak, "legacy green outline leaked onto .tw dashboard input").toBe(
      false,
    );
  });
});
