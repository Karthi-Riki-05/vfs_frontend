/**
 * Header Navbar — design + data-sync parity audit.
 *
 * Audits the production Header (`components/layout/Header.tsx`) against the
 * `new_design` reference TopBar (running on http://localhost:3003,
 * `new_design/src/routes/index.tsx`) across Desktop Chrome (`chromium`
 * project) and Pixel 7 (`mobile` project, touch enabled).
 *
 * Three parts:
 *   1. Layout & element audit — every navbar control is present, visible,
 *      non-transparent, and reacts to hover/active with a real transition.
 *   2. new_design parity — structural fingerprint of the reference TopBar
 *      matches the production Header (bar height, chat/bell icons, circular
 *      primary-tinted avatar).
 *   3. Profile avatar data-sync — the CRITICAL check: when the user has an
 *      uploaded photo, the navbar avatar must render a native <img>, not the
 *      "M"/initial placeholder, and must update reactively on the
 *      `userAvatarChanged` event (the one the Settings page dispatches after
 *      an upload — see settings/page.tsx:213) WITHOUT a page reload.
 *
 * Runs under BOTH the `chromium` and `mobile` projects (wired in
 * playwright.config.ts). Auth comes from the shared storageState
 * (e2e/.auth/pro.json) created once in global-setup — no per-test login,
 * so the auth rate limiter is never tripped.
 */
import { test, expect, Locator, Page } from "@playwright/test";
import { setUserState, getUserState } from "./helpers/db";

const NEW_DESIGN_URL = process.env.NEW_DESIGN_URL || "http://localhost:3003";

// new_design primary token (#34A881) — both surfaces tint the avatar with it.
const PRIMARY_RGB = "rgb(52, 168, 129)";

// Two valid, distinct 1×1 PNG data URIs (~108 chars, under the photo 500-char
// cap). Used as stand-in "uploaded profile pictures".
const PHOTO_A =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGO4o6EBAAMQAS0ujiXaAAAAAElFTkSuQmCC";
const PHOTO_B =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGPQiLoDAAIMAV9Wszw4AAAAAElFTkSuQmCC";

const isMobile = () => test.info().project.name === "mobile";

/** Computed-style snapshot used to flag transparent / collapsed / broken
 *  controls. */
async function styleProbe(loc: Locator) {
  return loc.evaluate((el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      opacity: cs.opacity,
      visibility: cs.visibility,
      display: cs.display,
      pointerEvents: cs.pointerEvents,
      transitionDuration: cs.transitionDuration,
      cursor: cs.cursor,
      backgroundColor: cs.backgroundColor,
      boxShadow: cs.boxShadow,
      width: r.width,
      height: r.height,
    };
  });
}

/** Assert a control is actually rendered & interactable — not transparent,
 *  not zero-size, not display:none. */
async function expectRenderedNotTransparent(loc: Locator, label: string) {
  await expect(loc, `${label} should be visible`).toBeVisible();
  const s = await styleProbe(loc);
  expect.soft(Number(s.opacity), `${label} opacity > 0`).toBeGreaterThan(0);
  expect.soft(s.visibility, `${label} visibility`).not.toBe("hidden");
  expect.soft(s.display, `${label} not display:none`).not.toBe("none");
  expect.soft(s.width, `${label} has width`).toBeGreaterThan(0);
  expect.soft(s.height, `${label} has height`).toBeGreaterThan(0);
}

function header(page: Page) {
  // DashboardLayout mounts two <header>s (a mobile-path and a desktop-path
  // copy); only one is visible per viewport. Pick the visible one.
  return page.locator("header:visible").first();
}

// The notification bell renders as a lucide <Bell> icon (no aria-label /
// testid in the live DOM — the `notif-dropdown` testid only exists in the
// Header unit-test mock). Target the icon class, which both surfaces share.
function bell(page: Page) {
  return header(page).locator("svg.lucide-bell").first();
}

test.describe("Header Navbar — layout & element audit", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await expect(header(page)).toBeVisible();
  });

  test("core navbar elements are present, visible and non-transparent", async ({
    page,
  }) => {
    const h = header(page);

    // Branding / logo
    await expectRenderedNotTransparent(
      h.getByAltText("ValueChart Logo"),
      "logo",
    );

    // Chat action
    await expectRenderedNotTransparent(
      h.getByRole("button", { name: /open chat/i }),
      "chat button",
    );

    // Notification bell (lucide <Bell> icon)
    await expectRenderedNotTransparent(bell(page), "notification bell");

    // Profile avatar
    await expectRenderedNotTransparent(
      h.getByRole("button", { name: /open profile/i }),
      "profile avatar",
    );

    // The fixed bar must be 56px (h-14) on both viewports.
    const barHeight = await h.evaluate(
      (el) => el.getBoundingClientRect().height,
    );
    expect.soft(Math.round(barHeight)).toBe(56);
  });

  test("viewport-specific controls render (hamburger on mobile, plan badge on desktop)", async ({
    page,
  }) => {
    const h = header(page);
    if (isMobile()) {
      await expectRenderedNotTransparent(
        h.getByRole("button", { name: /open menu/i }),
        "mobile hamburger",
      );
    } else {
      // Plan badge is desktop-only (hidden on mobile by the component).
      await expectRenderedNotTransparent(
        h.locator(".plan-badge"),
        "plan badge",
      );
    }
  });

  test("interactive controls have a hover transition and stay non-transparent", async ({
    page,
  }) => {
    // Touch devices (Pixel 7 `mobile` project) have no :hover state — the
    // hover audit only applies to the pointer-driven desktop viewport.
    test.skip(isMobile(), "hover states do not apply on touch devices");
    const h = header(page);
    const controls: Array<[Locator, string]> = [
      [h.getByRole("button", { name: /open chat/i }), "chat button"],
      [h.getByRole("button", { name: /open profile/i }), "profile avatar"],
    ];

    for (const [loc, label] of controls) {
      const before = await styleProbe(loc);
      // A configured transition is what makes hover/active states smooth
      // rather than "breaking"/snapping. duration must be > 0s.
      const durMs = before.transitionDuration
        .split(",")
        .map((d) => parseFloat(d) * (d.includes("ms") ? 1 : 1000))
        .reduce((a, b) => Math.max(a, b), 0);
      expect
        .soft(durMs, `${label} has a non-zero transition-duration`)
        .toBeGreaterThan(0);
      expect.soft(before.cursor, `${label} is pointer-cursor`).toBe("pointer");

      // Simulate the precise pointer action and confirm a visible :hover state
      // renders rather than staying transparent/identical. The chat button
      // shifts its background (hover:bg-secondary); the avatar lights its ring
      // (hover:ring-primary/40 → box-shadow). Either change proves the state.
      await loc.hover();
      await page.waitForTimeout(250); // let the transition settle
      const after = await styleProbe(loc);
      const changed =
        after.backgroundColor !== before.backgroundColor ||
        after.boxShadow !== before.boxShadow;
      expect
        .soft(changed, `${label} shows a visible :hover state (bg or ring)`)
        .toBe(true);
      expect
        .soft(Number(after.opacity), `${label} not transparent on hover`)
        .toBeGreaterThan(0);
    }
  });

  test("DEVIATION: requested Search bar is not implemented in the navbar", async ({
    page,
  }) => {
    // The audit brief lists a "Search bar" as a header element. Neither the
    // production Header nor the new_design TopBar implement one (the desktop
    // TopBar shows a page-title label instead). Asserting current reality and
    // annotating the gap rather than failing on an element that was never
    // designed.
    const search = header(page).locator(
      'input[type="search"], input[placeholder*="earch" i]',
    );
    await expect(search).toHaveCount(0);
    test.info().annotations.push({
      type: "deviation",
      description:
        "No search bar exists in the navbar (production Header or new_design TopBar). Brief requested one; not part of current design.",
    });
  });
});

test.describe("new_design reference parity (localhost:3003)", () => {
  test("reference TopBar fingerprint matches the production Header", async ({
    page,
  }) => {
    // ---- Production Header fingerprint ----
    await page.goto("/dashboard");
    const h = header(page);
    await expect(h).toBeVisible();
    const prod = {
      barHeight: Math.round(
        await h.evaluate((el) => el.getBoundingClientRect().height),
      ),
      avatarBg: await h
        .getByRole("button", { name: /open profile/i })
        .evaluate((el) => getComputedStyle(el).backgroundColor),
      hasChat: await h.getByRole("button", { name: /open chat/i }).count(),
    };

    // ---- new_design reference fingerprint ----
    // The prototype boots to a login screen; its dashboard TopBar only mounts
    // after Sign In (it drives screens via internal state, not URLs).
    await page.goto(NEW_DESIGN_URL);
    // The prototype ships two responsive login forms ("Login" + "Sign In");
    // which one is visible depends on the viewport. Click whichever is shown.
    const loginBtns = page.getByRole("button", { name: /sign in|^login$/i });
    await expect(loginBtns.first()).toBeAttached({ timeout: 30_000 });
    let clicked = false;
    for (let i = 0; i < (await loginBtns.count()); i++) {
      if (await loginBtns.nth(i).isVisible()) {
        await loginBtns.nth(i).click();
        clicked = true;
        break;
      }
    }
    expect(clicked, "a visible Sign In / Login button on :3003").toBe(true);

    // The reference bar uses the same h-14 (56px) fixed top bar — a flex row
    // with justify-between (distinguishes it from the h-14 logo <img>).
    const refBar = page.locator("div.h-14.justify-between").first();
    await expect(
      refBar,
      "new_design TopBar should mount after Sign In on :3003",
    ).toBeVisible({ timeout: 15_000 });
    const refBarHeight = Math.round(
      await refBar.evaluate((el) => el.getBoundingClientRect().height),
    );
    // Circular avatar = the rounded-full primary-tinted control in the bar.
    const refAvatar = refBar.locator("button.rounded-full").first();
    await expect(refAvatar, "reference avatar (rounded-full)").toBeVisible();
    const refAvatarBg = await refAvatar.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    // chat (message-circle) + bell icons live as svgs inside the right cluster.
    const refIcons = await refBar.locator("svg").count();
    const refHasBell = await refBar.locator("svg.lucide-bell").count();

    // ---- Parity assertions ----
    expect.soft(prod.barHeight, "bar height parity (56px)").toBe(refBarHeight);
    expect.soft(prod.barHeight).toBe(56);
    expect
      .soft(prod.avatarBg, "production avatar uses primary token")
      .toBe(PRIMARY_RGB);
    expect
      .soft(refAvatarBg, "reference avatar uses primary token")
      .toBe(PRIMARY_RGB);
    expect.soft(prod.hasChat, "production has chat control").toBeGreaterThan(0);
    expect
      .soft(refIcons, "reference TopBar renders chat + bell + menu icons")
      .toBeGreaterThanOrEqual(2);
    expect
      .soft(refHasBell, "reference TopBar renders a bell icon (parity)")
      .toBeGreaterThan(0);
  });
});

test.describe("Profile avatar data-sync (CRITICAL)", () => {
  // Snapshot whatever the Pro user's photo is now, so we can restore it.
  let originalPhoto: string | null = null;

  test.beforeAll(() => {
    const cur = getUserState(["photo"]) as { photo: string | null };
    originalPhoto = cur.photo ?? null;
  });

  test.afterAll(() => {
    setUserState({ photo: originalPhoto });
  });

  test.beforeEach(() => {
    // Precondition: the user HAS a valid uploaded profile picture.
    setUserState({ photo: PHOTO_A });
  });

  test("navbar avatar renders the uploaded <img> (not the letter placeholder)", async ({
    page,
  }) => {
    test.info().annotations.push({
      type: "known-defect",
      description:
        "Header.tsx renders ONLY the name initial — it never reads user.photo/image, so the navbar avatar stays on the placeholder even when a photo is uploaded (Sidebar/Settings already render the <img>). This test goes green once the Header mirrors the Sidebar avatar logic.",
    });
    await page.goto("/dashboard");
    const avatar = header(page).getByRole("button", { name: /open profile/i });
    await expect(avatar).toBeVisible();

    const img = avatar.locator("img");
    // The avatar must switch to the native <img> source — the same way the
    // Sidebar drawer (Sidebar.tsx:455-470) and Settings page already render it.
    await expect(
      img,
      "navbar avatar must render an <img> when a profile photo exists",
    ).toBeVisible({ timeout: 10_000 });

    const src = await img.getAttribute("src");
    expect(src, "avatar <img> src is the uploaded photo").toContain(
      "data:image/png",
    );

    // And it must NOT be stuck on the single-letter initial placeholder.
    const visibleInitial = await avatar.evaluate((el) => {
      const t = (el.textContent || "").trim();
      return /^[A-Za-z]$/.test(t) ? t : "";
    });
    expect(
      visibleInitial,
      "avatar should not show a letter initial once a photo is set",
    ).toBe("");
  });

  test("navbar avatar updates reactively on `userAvatarChanged` (no reload)", async ({
    page,
  }) => {
    test.info().annotations.push({
      type: "known-defect",
      description:
        "Header.tsx has no `userAvatarChanged` listener (the Sidebar drawer does, Sidebar.tsx:213). After an upload the navbar avatar will not refresh without a hard reload. Goes green once the Header subscribes to the event like the Sidebar.",
    });
    await page.goto("/dashboard");
    const avatar = header(page).getByRole("button", { name: /open profile/i });
    await expect(avatar).toBeVisible();

    // Dispatch the exact event the Settings page fires after an upload
    // (settings/page.tsx:213) with a DIFFERENT photo, WITHOUT reloading.
    await page.evaluate((url) => {
      window.dispatchEvent(
        new CustomEvent("userAvatarChanged", { detail: { url } }),
      );
    }, PHOTO_B);

    const img = avatar.locator("img");
    await expect(
      img,
      "navbar avatar must react to userAvatarChanged without a reload",
    ).toBeVisible({ timeout: 10_000 });
    await expect(img).toHaveAttribute("src", PHOTO_B, { timeout: 10_000 });
  });
});
