import { test, expect, Page } from "@playwright/test";
import fs from "fs";

const SHOTS =
  "/private/tmp/claude-501/-Users-webronicdesigner-Webronic-Docker-projects-vfs-value-charts/04a77834-7120-4114-932e-01665031ab7f/scratchpad/screenshots";

async function shot(page: Page, name: string) {
  fs.mkdirSync(SHOTS, { recursive: true });
  const p = `${SHOTS}/${name}.png`;
  await page.screenshot({ path: p, fullPage: false });
  console.log(`SCREENSHOT: ${p}`);
}

const TEST_USER = { email: "mry@test.com", password: "test1234" };

async function login(page: Page) {
  await page.goto("/login");
  const csrfToken = await page.evaluate(
    async () => (await (await fetch("/api/auth/csrf")).json()).csrfToken,
  );
  const status = await page.evaluate(
    async ({ csrfToken, email, password }) => {
      const body = new URLSearchParams({
        csrfToken,
        email,
        password,
        json: "true",
      });
      const r = await fetch("/api/auth/callback/credentials?", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      return r.status;
    },
    { csrfToken, ...TEST_USER },
  );
  console.log("Login callback status:", status);
  let emailFound: string | undefined;
  for (let i = 0; i < 30; i++) {
    const sess = await page.evaluate(() =>
      fetch("/api/auth/session").then((r) => r.json()),
    );
    emailFound = sess?.user?.email;
    if (emailFound) break;
    await page.waitForTimeout(500);
  }
  console.log("Logged in as:", emailFound);
}

test("card management — full UI check (mry@test.com)", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  // STEP 1: Login
  await login(page);
  await shot(page, "01-logged-in");

  // STEP 2: Settings page
  await page.goto("/dashboard/settings");
  await page.waitForLoadState("networkidle");
  await shot(page, "02-settings-page");

  // STEP 3: Payment Methods link present?
  const pmLink = page
    .locator('a[href*="payment-methods"]')
    .or(page.getByText(/payment methods/i))
    .first();
  const pmLinkVisible = await pmLink.isVisible().catch(() => false);
  console.log("Payment Methods link visible:", pmLinkVisible);
  if (pmLinkVisible) {
    await pmLink.scrollIntoViewIfNeeded();
    await shot(page, "03-payment-methods-link-visible");
  } else {
    await shot(page, "03-payment-methods-link-MISSING");
  }

  // STEP 4: Go to Payment Methods page
  await page.goto("/dashboard/settings/payment-methods");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);
  await shot(page, "04-payment-methods-page");

  const title = await page
    .locator("h1, h2, h3, h4")
    .first()
    .textContent()
    .catch(() => "not found");
  console.log("Page heading:", title);

  // STEP 5: Saved cards
  const cardRows = page.locator(".ant-list-item");
  const cardCount = await cardRows.count();
  console.log("Card list rows:", cardCount);
  const pageBodyText = await page.locator("body").textContent();
  const hasMasked = /••••|\*{4}/i.test(pageBodyText || "");
  console.log("Has masked card digits:", hasMasked);
  await shot(page, "05-saved-cards");

  // STEP 6: Add Card section
  const addCardBtn = page
    .locator("button")
    .filter({ hasText: /add card|add new/i });
  const addBtnCount = await addCardBtn.count();
  console.log("Add Card buttons:", addBtnCount);

  const iframeCount = await page.locator("iframe").count();
  console.log("Total iframes on page:", iframeCount);
  const iframeSrcs = await page
    .locator("iframe")
    .evaluateAll((els) =>
      els.map(
        (e) =>
          (e as HTMLIFrameElement).src ||
          (e as HTMLIFrameElement).name ||
          "no-src",
      ),
    );
  console.log("Iframe srcs:", JSON.stringify(iframeSrcs));

  const stripeFrames = page.frames().filter((f) => f.url().includes("stripe"));
  console.log("Stripe frames:", stripeFrames.length);
  await shot(page, "06-add-card-form");

  // STEP 7: Default / Remove buttons
  const defaultBtns = await page
    .locator("button")
    .filter({ hasText: /set default|make default/i })
    .count();
  const removeBtns = await page
    .locator("button")
    .filter({ hasText: /remove|delete/i })
    .count();
  const iconBtns = await page
    .locator(
      '[aria-label*="default"], [title*="default"], [aria-label*="remove"], [title*="remove"]',
    )
    .count();
  console.log("Set Default buttons:", defaultBtns);
  console.log("Remove buttons:", removeBtns);
  console.log("Icon action buttons:", iconBtns);

  // Click Add Card if present
  if (addBtnCount > 0) {
    await addCardBtn.first().click();
    await page.waitForTimeout(2000);
    await shot(page, "07-after-add-card-click");
    const iframesAfter = await page.locator("iframe").count();
    console.log("Iframes after Add Card click:", iframesAfter);
  }

  // Scroll bottom
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await shot(page, "08-scrolled-bottom");

  console.log(
    "Console errors:",
    errors.length ? errors.slice(0, 5).join(" | ") : "none",
  );

  expect(title).not.toBe("not found");
  const jsErrors = errors.filter((e) =>
    /TypeError|ReferenceError|cannot read/i.test(e),
  );
  if (jsErrors.length) console.warn("JS ERRORS:", jsErrors.join("\n"));
  expect(jsErrors).toHaveLength(0);
});
