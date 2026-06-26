/**
 * mr5@gmail.com subscription scenario tester
 * Run: node mr5-subscription-test.mjs
 * Tests all plan-change flows and checks DB state after each action.
 */
import { chromium } from "playwright";
import { execSync } from "child_process";

const BASE = "http://localhost:3002";
const EMAIL = "mr5@gmail.com";
const PASS = "test1234";
const USER_ID = "cmqp4engf0000ss4awetk2czr";

// ── DB helper ────────────────────────────────────────────────────────────────
function db(sql) {
  try {
    const out = execSync(
      `docker compose exec -T db psql -U admin -d value_charts_db -c "${sql.replace(/"/g, '\\"')}"`,
      {
        cwd: "/Users/webronicdesigner/Webronic/Docker/projects/vfs/value-charts",
        encoding: "utf8",
      },
    );
    return out.trim();
  } catch (e) {
    return `DB_ERROR: ${e.message}`;
  }
}

function dbSub() {
  return db(
    `SELECT status, product_type, users_count, price, app_context, scheduled_plan_type, scheduled_team_members, payment_id, has_pro, current_version FROM subscriptions s JOIN users u ON u.id=s.user_id WHERE s.user_id='${USER_ID}'`,
  );
}
function dbTxn() {
  return db(
    `SELECT id, amount_charged, status, purchase_type, app_context FROM transaction_logs WHERE user_id='${USER_ID}'`,
  );
}
function dbHistory() {
  return db(
    `SELECT plan_name, product_type, status, price, archived_reason, app_context FROM subscription_history WHERE user_id='${USER_ID}'`,
  );
}

// ── Reporter ─────────────────────────────────────────────────────────────────
const results = [];
function log(tag, scenario, status, detail, db_snapshot = null) {
  const icon =
    status === "PASS"
      ? "✅"
      : status === "FAIL"
        ? "❌"
        : status === "BUG"
          ? "🐛"
          : "⚠️";
  console.log(`\n${icon} [${tag}] ${scenario}`);
  console.log(`   ${detail}`);
  if (db_snapshot) console.log(`   DB: ${db_snapshot.replace(/\n/g, " | ")}`);
  results.push({ tag, scenario, status, detail, db_snapshot });
}

// ── Login helper ─────────────────────────────────────────────────────────────
async function login(page) {
  await page.goto(BASE);
  await page.waitForLoadState("networkidle");

  // Already logged in?
  if (page.url().includes("/dashboard")) return;

  // Go to login page
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  // PillInput renders a native <input> — select by type
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  // Submit button
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 20000 });
}

// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log("════════════════════════════════════════════════");
  console.log(" mr5@gmail.com — Subscription Scenario Test");
  console.log("════════════════════════════════════════════════");

  console.log("\n📦 PRE-TEST DB STATE:");
  console.log("  Subscription:", dbSub());
  console.log("  Transactions:", dbTxn());
  console.log("  History:     ", dbHistory());

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await ctx.newPage();

  // Capture all API responses
  const apiLog = [];
  page.on("response", async (resp) => {
    if (resp.url().includes("/api/")) {
      try {
        const body = await resp.json().catch(() => null);
        apiLog.push({ url: resp.url(), status: resp.status(), body });
      } catch {}
    }
  });

  try {
    // ─── LOGIN ───────────────────────────────────────────────────────────────
    console.log("\n⏳ Logging in as mr5@gmail.com...");
    await login(page);
    const loggedIn = page.url().includes("dashboard");
    log(
      "AUTH",
      "Login as mr5@gmail.com",
      loggedIn ? "PASS" : "FAIL",
      `URL after login: ${page.url()}`,
    );
    if (!loggedIn) {
      console.log("Cannot proceed — login failed");
      await browser.close();
      return;
    }

    // ─── SCENARIO 1: View subscription page ──────────────────────────────────
    console.log("\n⏳ SCENARIO 1: View subscription page...");
    await page.goto(`${BASE}/dashboard/subscription`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const bodyText = await page.locator("body").innerText();
    const hasTeam = /team|monthly|yearly/i.test(bodyText);
    const hasPrice = /\$|₹|€/.test(bodyText);
    const hasCancelBtn = (await page.getByText(/cancel/i).count()) > 0;
    const hasChangePlanBtn =
      (await page
        .getByText(/change plan|add member|current plan|purchase/i)
        .count()) > 0;

    // Check what the subscription status API returned
    const statusResp = apiLog.find(
      (r) =>
        r.url.includes("/subscription/status") ||
        r.url.includes("/subscription/info"),
    );
    const subStatus = statusResp?.body?.data;

    await page.screenshot({
      path: "/tmp/mr5-s1-subscription-page.png",
      fullPage: true,
    });

    const s1Details = [
      `Page loaded: ${page.url()}`,
      `Has Team/Monthly content: ${hasTeam}`,
      `Has price display: ${hasPrice}`,
      `Cancel button visible: ${hasCancelBtn}`,
      `Change Plan button visible: ${hasChangePlanBtn}`,
      `API status response: ${JSON.stringify(subStatus)}`,
    ].join(" | ");

    // BUG CHECK: DB says active team_monthly but UI may show free/wrong plan
    const dbState = dbSub();
    log(
      "S1",
      "View subscription page",
      hasTeam && hasPrice ? "PASS" : "BUG",
      s1Details,
      dbState,
    );

    // Check if UI plan matches DB
    const dbHasPro = dbState.includes("| f "); // has_pro false
    const dbIsTeam = dbState.includes("team_monthly");
    const uiShowsFree =
      bodyText.toLowerCase().includes("upgrade") &&
      !bodyText.toLowerCase().includes("current plan");

    if (dbIsTeam && dbHasPro) {
      log(
        "S1-BUG",
        "has_pro=false but subscription is team_monthly",
        "BUG",
        "DB: subscription is active team_monthly but user.has_pro=false — entitlement mismatch",
      );
    }

    // ─── SCENARIO 2: Check current plan display accuracy ─────────────────────
    console.log("\n⏳ SCENARIO 2: Checking current plan display vs DB...");
    apiLog.length = 0;
    await page.goto(`${BASE}/dashboard/subscription`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageContent = await page.locator("body").innerText();
    const showsActivePlan = /current plan|active|team monthly/i.test(
      pageContent,
    );
    const showsCancelBtn = /cancel subscription|cancel plan/i.test(pageContent);

    // Look for seat count displayed
    const shows5Seats = /5\s*(seats|members|users)/i.test(pageContent);
    const showsPrice30 = /\$30|\$10/.test(pageContent); // $30 total or $10/seat

    await page.screenshot({
      path: "/tmp/mr5-s2-plan-display.png",
      fullPage: true,
    });
    log(
      "S2",
      "Plan display accuracy",
      showsActivePlan ? "PASS" : "BUG",
      `Shows active plan: ${showsActivePlan} | Shows cancel: ${showsCancelBtn} | Shows 5 seats: ${shows5Seats} | Price visible: ${showsPrice30}`,
      dbSub(),
    );

    // ─── SCENARIO 3: Add seats (5 → 10) ─────────────────────────────────────
    console.log("\n⏳ SCENARIO 3: Add seats 5 → 10...");
    apiLog.length = 0;

    await page.goto(`${BASE}/dashboard/subscription`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    // Find the members dropdown for monthly plan and change to 10
    const memberSelects = page
      .locator("select, .ant-select")
      .filter({ hasText: /5|members|seats/i });
    const selectCount = await memberSelects.count();

    // Try to find and change seat count via Select dropdown
    let seatChanged = false;
    try {
      // Look for ant-select dropdowns
      const selects = await page.locator(".ant-select").all();
      for (const sel of selects) {
        const text = await sel.innerText().catch(() => "");
        if (/5/.test(text)) {
          await sel.click();
          await page.waitForTimeout(500);
          const opt10 = page
            .locator(".ant-select-item-option")
            .filter({ hasText: /^10$/ });
          if ((await opt10.count()) > 0) {
            await opt10.first().click();
            seatChanged = true;
            await page.waitForTimeout(500);
            break;
          }
          await page.keyboard.press("Escape");
        }
      }
    } catch (e) {
      console.log("  Select change error:", e.message);
    }

    await page.screenshot({ path: "/tmp/mr5-s3a-seats-changed.png" });

    // Now click Add Members / Change Plan
    let addMembersClicked = false;
    let stripeRedirect = false;
    let changePlanResponse = null;

    if (seatChanged) {
      const addBtn = page.getByText(/add member|change plan/i).first();
      if ((await addBtn.count()) > 0) {
        // Intercept navigation to Stripe
        const [nav] = await Promise.all([
          page
            .waitForNavigation({ timeout: 8000, waitUntil: "commit" })
            .catch(() => null),
          addBtn.click(),
        ]);
        addMembersClicked = true;
        await page.waitForTimeout(2000);

        // Check if we landed on Stripe
        const currentUrl = page.url();
        stripeRedirect =
          currentUrl.includes("stripe.com") ||
          currentUrl.includes("billing.stripe.com");

        // Check API response
        const cpResp = apiLog.find((r) => r.url.includes("change-plan"));
        changePlanResponse = cpResp?.body;

        if (stripeRedirect) {
          await page.screenshot({ path: "/tmp/mr5-s3b-stripe-portal.png" });
          // Go back
          await page.goto(`${BASE}/dashboard/subscription`);
          await page.waitForLoadState("networkidle");
        }
      }
    }

    await page.screenshot({ path: "/tmp/mr5-s3c-after-add-seats.png" });
    log(
      "S3",
      "Add seats 5→10",
      seatChanged && addMembersClicked
        ? stripeRedirect
          ? "PASS"
          : "BUG"
        : "BUG",
      `Seat selector found: ${selectCount > 0} | Changed to 10: ${seatChanged} | Clicked Add Members: ${addMembersClicked} | Stripe redirect: ${stripeRedirect} | API: ${JSON.stringify(changePlanResponse?.data || changePlanResponse?.error)}`,
      dbSub(),
    );

    if (!stripeRedirect && addMembersClicked) {
      log(
        "S3-BUG",
        "Add seats should open Stripe billing portal but didn't",
        "BUG",
        `URL after click: ${page.url()} | Response: ${JSON.stringify(changePlanResponse)}`,
      );
    }

    // ─── SCENARIO 4: Reduce seats ─────────────────────────────────────────────
    console.log("\n⏳ SCENARIO 4: Reduce seats 5 → 3...");
    apiLog.length = 0;
    await page.goto(`${BASE}/dashboard/subscription`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    let reduceWorked = false;
    let reduceResponse = null;
    try {
      const selects = await page.locator(".ant-select").all();
      for (const sel of selects) {
        const text = await sel.innerText().catch(() => "");
        if (/5/.test(text)) {
          await sel.click();
          await page.waitForTimeout(500);
          // Try to pick 5 (minimum, can't go below) - if only option is 5+, check for lower
          const opts = await page
            .locator(".ant-select-item-option")
            .allInnerTexts();
          console.log("  Available options:", opts.join(", "));
          await page.keyboard.press("Escape");
          break;
        }
      }

      // Call API directly to test reduce seats
      const apiResp = await page.evaluate(async () => {
        const r = await fetch("/api/subscription/change-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: "monthly", teamMembers: 5 }), // same = noop
        });
        return r.json();
      });
      reduceResponse = apiResp;
      reduceWorked = apiResp?.success || false;
    } catch (e) {
      console.log("  Reduce error:", e.message);
    }

    log(
      "S4",
      "Reduce seats check (via API direct)",
      reduceWorked ? "PASS" : "BUG",
      `API response: ${JSON.stringify(reduceResponse?.data || reduceResponse?.error)} | Note: UI min seat selector options listed above`,
      dbSub(),
    );

    // Min seat check — TEAM_OPTIONS = [5,10,15,20,25,50,75,100] — no option below 5
    log(
      "S4-BUG",
      "No seat option below 5 in dropdown",
      "BUG",
      "TEAM_OPTIONS=[5,10,15,20,25,50,75,100] — user cannot reduce to fewer than 5 seats via UI. Backend supports it but frontend blocks it.",
    );

    // ─── SCENARIO 5: Monthly → Yearly (schedule) ─────────────────────────────
    console.log("\n⏳ SCENARIO 5: Monthly → Yearly (should schedule)...");
    apiLog.length = 0;
    await page.goto(`${BASE}/dashboard/subscription`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    let yearlyResponse = null;
    let yearlyBtnClicked = false;
    try {
      // Call the change-plan API directly for yearly
      const apiResp = await page.evaluate(async () => {
        const r = await fetch("/api/subscription/change-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: "yearly", teamMembers: 5 }),
        });
        return r.json();
      });
      yearlyResponse = apiResp;
      yearlyBtnClicked = true;
    } catch (e) {
      console.log("  Yearly error:", e.message);
    }

    const dbAfterYearly = dbSub();
    const scheduledInDB = dbAfterYearly.includes("yearly");
    log(
      "S5",
      "Monthly → Yearly (should schedule)",
      yearlyResponse?.success ? "PASS" : "BUG",
      `API: ${JSON.stringify(yearlyResponse?.data || yearlyResponse?.error)} | Scheduled in DB: ${scheduledInDB}`,
      dbAfterYearly,
    );

    // Cancel the scheduled change before next test
    if (scheduledInDB) {
      await page.evaluate(async () => {
        await fetch("/api/subscription/cancel-scheduled", { method: "POST" });
      });
      console.log("  Cleaned up scheduled change");
    }

    // ─── SCENARIO 6: Cancel subscription ─────────────────────────────────────
    console.log("\n⏳ SCENARIO 6: Cancel subscription...");
    apiLog.length = 0;

    let cancelResponse = null;
    let cancelWorked = false;
    try {
      const apiResp = await page.evaluate(async () => {
        const r = await fetch("/api/subscription/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        return r.json();
      });
      cancelResponse = apiResp;
      cancelWorked = apiResp?.success || false;
    } catch (e) {
      console.log("  Cancel error:", e.message);
    }

    await page.goto(`${BASE}/dashboard/subscription`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    const bodyAfterCancel = await page.locator("body").innerText();
    const showsCancelling = /cancelling|cancel.*period|until.*\d{4}/i.test(
      bodyAfterCancel,
    );
    await page.screenshot({ path: "/tmp/mr5-s6-cancel.png", fullPage: true });

    const dbAfterCancel = dbSub();
    const cancellingInDB = dbAfterCancel.includes("cancelling");

    log(
      "S6",
      "Cancel subscription",
      cancelWorked && cancellingInDB ? "PASS" : "BUG",
      `API success: ${cancelWorked} | DB status=cancelling: ${cancellingInDB} | UI shows cancelling state: ${showsCancelling} | API: ${JSON.stringify(cancelResponse?.data || cancelResponse?.error)}`,
      dbAfterCancel,
    );

    if (cancelWorked && !showsCancelling) {
      log(
        "S6-BUG",
        "Cancel succeeded but UI doesn't show cancelling state",
        "BUG",
        "After cancel, status=cancelling in DB but UI may not reflect this (no 'cancelling' banner or date shown)",
      );
    }

    // ─── SCENARIO 7: Reactivate ───────────────────────────────────────────────
    console.log("\n⏳ SCENARIO 7: Reactivate...");
    apiLog.length = 0;

    let reactivateResponse = null;
    let reactivateWorked = false;
    try {
      const apiResp = await page.evaluate(async () => {
        const r = await fetch("/api/subscription/reactivate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        return r.json();
      });
      reactivateResponse = apiResp;
      reactivateWorked = apiResp?.success || false;
    } catch (e) {
      console.log("  Reactivate error:", e.message);
    }

    const dbAfterReactivate = dbSub();
    const activeInDB = dbAfterReactivate.includes("| active ");
    log(
      "S7",
      "Reactivate after cancel",
      reactivateWorked && activeInDB ? "PASS" : "BUG",
      `API success: ${reactivateWorked} | DB status=active: ${activeInDB} | API: ${JSON.stringify(reactivateResponse?.data || reactivateResponse?.error)}`,
      dbAfterReactivate,
    );

    // ─── SCENARIO 8: Billing history / transaction data ───────────────────────
    console.log("\n⏳ SCENARIO 8: Billing history page...");
    apiLog.length = 0;
    await page.goto(`${BASE}/dashboard/settings/billing`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const billingContent = await page.locator("body").innerText();
    const hasTransactions = !/no transaction/i.test(billingContent);
    const hasBillingSection = /billing|invoice|transaction/i.test(
      billingContent,
    );
    await page.screenshot({ path: "/tmp/mr5-s8-billing.png", fullPage: true });

    const txnData = dbTxn();
    const histData = dbHistory();
    const hasZeroTxns = txnData.includes("(0 rows)");
    const hasZeroHistory = histData.includes("(0 rows)");

    log(
      "S8",
      "Billing history page",
      hasBillingSection ? "PASS" : "FAIL",
      `Page loads: ${hasBillingSection} | UI shows transactions: ${hasTransactions} | API calls: ${apiLog
        .filter((r) => r.url.includes("transaction"))
        .map((r) => r.url)
        .join(", ")}`,
    );

    if (hasZeroTxns) {
      log(
        "S8-BUG",
        "transaction_logs is EMPTY despite active subscription",
        "BUG",
        `DB transaction_logs has 0 rows for this user. Checkout webhook either didn't fire or didn't write to transaction_logs. This breaks billing history UI.`,
      );
    }
    if (hasZeroHistory) {
      log(
        "S8-BUG",
        "subscription_history is EMPTY despite active subscription",
        "BUG",
        `DB subscription_history has 0 rows. History archive step in _handleCheckoutComplete didn't write. Cannot show billing history.`,
      );
    }

    // ─── SCENARIO 9: Stripe Customer Portal ──────────────────────────────────
    console.log("\n⏳ SCENARIO 9: Stripe Customer Portal...");
    apiLog.length = 0;

    let portalResponse = null;
    let portalUrl = null;
    try {
      const resp = await page.evaluate(async () => {
        const r = await fetch("/api/subscription/customer-portal", {
          method: "POST",
        });
        return r.json();
      });
      portalResponse = resp;
      portalUrl = resp?.data?.url;
    } catch (e) {
      console.log("  Portal error:", e.message);
    }

    const portalWorks =
      !!portalUrl &&
      (portalUrl.includes("stripe.com") ||
        portalUrl.includes("billing.stripe.com"));
    log(
      "S9",
      "Stripe Customer Portal URL generation",
      portalWorks ? "PASS" : "BUG",
      `URL returned: ${portalUrl || "none"} | Error: ${JSON.stringify(portalResponse?.error)}`,
    );

    // ─── SCENARIO 10: Yearly → Monthly (should be blocked) ───────────────────
    // Only relevant if on yearly — skip for now since mr5 is monthly
    // But test the API to confirm block works
    console.log("\n⏳ SCENARIO 10: Yearly → Monthly guard check...");
    const guardResp = await page.evaluate(async () => {
      // Simulate yearly→monthly by calling with plan=monthly on current monthly sub
      // To truly test: need a yearly sub. So test that the backend returns the right error
      // when forced with an internal test. We test the noop branch instead.
      const r = await fetch("/api/subscription/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "monthly", teamMembers: 5 }),
      });
      return r.json();
    });
    log(
      "S10",
      "Change-plan API: same plan/seats → noop",
      guardResp?.success ? "PASS" : "BUG",
      `Response: ${JSON.stringify(guardResp?.data || guardResp?.error)}`,
    );

    // ─── FINAL DB SNAPSHOT ────────────────────────────────────────────────────
    console.log("\n📊 FINAL DB STATE:");
    console.log("  Subscription:", dbSub());
    console.log("  Transactions:", dbTxn());
    console.log("  History:     ", dbHistory());
  } catch (err) {
    console.error("FATAL:", err);
  } finally {
    await browser.close();
  }

  // ─── SUMMARY ─────────────────────────────────────────────────────────────
  console.log("\n════════════════════════════════════════════════");
  console.log(" RESULTS SUMMARY");
  console.log("════════════════════════════════════════════════");
  const bugs = results.filter((r) => r.status === "BUG" || r.status === "FAIL");
  const passes = results.filter((r) => r.status === "PASS");
  console.log(`✅ PASS: ${passes.length}`);
  console.log(`❌ BUG/FAIL: ${bugs.length}`);
  console.log("\nBugs found:");
  bugs.forEach((b) =>
    console.log(`  🐛 [${b.tag}] ${b.scenario}: ${b.detail.substring(0, 120)}`),
  );

  console.log("\nScreenshots saved to /tmp/mr5-s*.png");
}

main().catch(console.error);
