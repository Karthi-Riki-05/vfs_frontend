/**
 * In-app purchase bridge — web side of the NativeBridge IAP protocol.
 * Full contract: flutter_webview-main/IAP_CONTRACT.md
 *
 * STORE POLICY (Apple 3.1.1 / Play Payments): inside the native shells,
 * digital goods may ONLY be sold through the store. The rules every purchase
 * surface must follow:
 *   - native shell + IAP available  → purchase via iapPurchase() (store sheet)
 *   - native shell + IAP unavailable → hide ALL purchase UI; show neutral
 *     "manage on the web" copy with NO link to web payment (no steering)
 *   - web browser                    → Stripe checkout, unchanged
 *
 * Entitlements are granted server-side only, by POST /iap/validate, which
 * verifies the store's proof directly with Google/Apple (RevenueCat was rejected
 * 2026-07-21). A `status: "success"` result here means ONLY "the store accepted
 * payment" — `granted` is what says the entitlement exists. Callers must branch
 * on `granted`, then refresh subscription status (see waitThenRefresh) because
 * the store's server-to-server notification can also arrive moments later.
 */

import { useEffect, useState } from "react";
import { getClientAppType } from "./detectWebView";
import { iapApi } from "@/api/iap.api";

// ── Product IDs — MUST mirror backend/src/config/iapProducts.js ────────────

/** Team tiers (owner decision 2026-07-23: max 25 on ALL platforms; 50/75/100 retired) */
export const IAP_TEAM_TIERS = [5, 10, 15, 20, 25];

export const teamProductId = (seats: number, plan: "monthly" | "yearly") =>
  `team_${seats}_${plan}`;

export const IAP_PRODUCTS = {
  proLifetime: "pro_lifetime",
  flowPack50: "flowpack_50",
  flowPackUnlimited: "flowpack_unlimited",
  addonFlowsStandard: "addon_flows_standard_monthly",
  addonFlowsUnlimited: "addon_flows_unlimited_monthly",
  /**
   * TEAM-app credit pack ids. The Pro app sells the same three packs under
   * `_pro`-suffixed ids — always resolve through aiCreditProductId() rather
   * than reading this map directly.
   */
  aiCredits: {
    starter: "aicredits_50",
    standard: "aicredits_100",
    proppack: "aicredits_200",
  } as Record<string, string>,
};

/**
 * Store id for an AI credit pack in the CURRENT shell.
 *
 * The Pro and Team apps sell the same three packs, but Apple scopes a product
 * id to the DEVELOPER TEAM rather than the app: once the Team app claimed
 * `aicredits_50`, the Pro app could never use that string (App Store Connect
 * refuses it outright). Play would have allowed reuse, but the `_pro` suffix
 * is used on BOTH stores so this stays keyed on variant alone — a
 * variant × platform matrix would be far easier to get wrong.
 *
 * The variant comes from the User-Agent the shell stamps, so no Flutter-side
 * change is involved. On web (`getClientAppType() === "web"`) the un-suffixed
 * ids are returned; nothing native reads them there.
 *
 * Both id sets map to the same entitlement in backend iapProducts.js.
 */
export function aiCreditProductId(packType: string): string {
  const base = IAP_PRODUCTS.aiCredits[packType];
  if (!base) return base;
  return getClientAppType() === "pro" ? `${base}_pro` : base;
}

/** Every AI credit pack id to price-check in the current shell. */
export function aiCreditProductIds(): string[] {
  return Object.keys(IAP_PRODUCTS.aiCredits).map(aiCreditProductId);
}

/**
 * PHASE 1 TESTING ONLY: the 4 legacy team products already live in each
 * store (owner decision — test with these before the 18 new products are
 * created). Each store only recognizes its own IDs, so the web page must
 * show the right 4 depending on platform — see getNativePlatform() below.
 * Mirrors backend/src/config/iapProducts.js and
 * flutter_webview-main/lib/subscription_plans.dart.
 */
export interface LegacyTeamPlan {
  productId: string;
  seats: number;
  period: "monthly" | "yearly";
}

export const LEGACY_IOS_TEAM_PLANS: LegacyTeamPlan[] = [
  { productId: "com.valuecharts.app.mon_5", seats: 5, period: "monthly" },
  { productId: "com.valuecharts.app.mon_10", seats: 10, period: "monthly" },
  { productId: "com.valuecharts.app.year_5", seats: 5, period: "yearly" },
  { productId: "com.valuecharts.app.year_10", seats: 10, period: "yearly" },
];

/**
 * The full 10-tier team catalog (5/10/15/20/25 × monthly/yearly), live in
 * BOTH stores since 2026-08-19: App Store Connect group "TEAM PLANS", and Play
 * package `com.valuecharts.app` (verified ACTIVE via the Play Developer API —
 * note Play's base plan ids are `team{N}-monthly-subscription` /
 * `team{N}-annual-subscription`, which arrive appended as `productId:basePlanId`
 * and are stripped by the backend's resolveIapProduct()).
 *
 * Supersedes the LEGACY_* sets for NEW purchases on both platforms. Existing
 * subscribers on the old 4 ids per store keep working unaffected — the backend
 * still maps them, so renewals and restores resolve as before.
 */
export const TEAM_PLANS: LegacyTeamPlan[] = IAP_TEAM_TIERS.flatMap(
  (seats) =>
    (["monthly", "yearly"] as const).map((period) => ({
      productId: teamProductId(seats, period),
      seats,
      period,
    })),
);

/** @deprecated Name kept for existing imports; the catalog is store-agnostic. */
export const IOS_TEAM_PLANS = TEAM_PLANS;

// Confirmed 2026-07-16 from the live native Android app's own Kotlin source
// (skuTeamMth5/Mth10/Yr5/Yr10 constants) — mirrors the iOS 4-tier pattern
// (mon_5/mon_10/year_5/year_10) with Android's mth_/yr_ naming. Earlier
// mth_10/15/20/25 guess (read off a Play Console screenshot) was wrong — Play
// Console can list legacy/unused products the shipped app never references.
export const LEGACY_ANDROID_TEAM_PLANS: LegacyTeamPlan[] = [
  { productId: "com.valuecharts.app.mth_5", seats: 5, period: "monthly" },
  { productId: "com.valuecharts.app.mth_10", seats: 10, period: "monthly" },
  { productId: "com.valuecharts.app.yr_5", seats: 5, period: "yearly" },
  { productId: "com.valuecharts.app.yr_10", seats: 10, period: "yearly" },
];

/**
 * LEGACY Pro flow add-ons — no longer offered, retained because the backend
 * maps them so existing subscribers keep renewing.
 *
 * Both are monthly:
 *   ltd     → limited flow allowance  (maps to the `standard` addon plan)
 *   unltd   → unlimited flows         (maps to the `unlimited` addon plan)
 *
 * Note the ids differ per store — Android kept the original short names
 * (verified 2026-07-31 via the Play Developer API), while App Store Connect
 * carries a `_flows` suffix (created 2026-08-12, group "Value Charts Pro
 * Subscription"). That per-store divergence is exactly what PRO_ADDONS below
 * replaces: the catalog ids are identical on both stores.
 */
export const ANDROID_PRO_ADDONS: Record<"standard" | "unlimited", string> = {
  standard: "com.valuecharts.pro.ltd",
  unlimited: "com.valuecharts.pro.unltd",
};

export const LEGACY_IOS_PRO_ADDONS: Record<"standard" | "unlimited", string> = {
  standard: "com.valuecharts.pro.ltd_flows",
  unlimited: "com.valuecharts.pro.unltd_flows",
};

/**
 * The catalog-named Pro add-ons, created in App Store Connect 2026-08-19 under
 * subscription group "PRO PLANS" (unlimited = level 1, standard = level 2).
 * Supersedes LEGACY_IOS_PRO_ADDONS for iOS — same two entitlements, catalog
 * naming. Existing subscribers on the `_flows` ids keep working unaffected
 * (the backend maps BOTH sets, and renewal handling for the old ids is
 * untouched); this only changes what NEW purchases are offered.
 *
 * Android stays on ANDROID_PRO_ADDONS until the same two ids exist under
 * `com.valuecharts.pro` in Play Console — querying ids a store doesn't have
 * returns them in `notFound` and the add-on section renders with no price.
 */
export const PRO_ADDONS: Record<"standard" | "unlimited", string> = {
  standard: "addon_flows_standard_monthly",
  unlimited: "addon_flows_unlimited_monthly",
};

/** @deprecated Name kept for existing imports; the ids are store-agnostic. */
export const IOS_PRO_ADDONS = PRO_ADDONS;

/**
 * Real store product id for a Pro flow-addon plan. Both stores now carry the
 * catalog ids — App Store Connect group "PRO PLANS" and Play package
 * `com.valuecharts.pro` (both 2026-08-19, Play verified ACTIVE via the
 * Developer API) — so this no longer branches on platform.
 *
 * LEGACY_IOS_PRO_ADDONS / ANDROID_PRO_ADDONS stay exported: the backend maps
 * those ids, so existing subscribers keep renewing. They are simply not
 * offered for new purchases.
 */
export function findProAddon(
  plan: "standard" | "unlimited",
): string | undefined {
  return PRO_ADDONS[plan];
}

/** @deprecated Kept so existing call sites compile — use findProAddon(). */
export function findLegacyProAddon(
  plan: "standard" | "unlimited",
): string | undefined {
  return findProAddon(plan);
}

/** All Pro addon ids to price-check. */
export function legacyProAddonIds(): string[] {
  return Object.values(PRO_ADDONS);
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface IapPrice {
  productId: string;
  priceString: string;
  price: number;
  currencyCode: string;
  title: string;
}

export interface IapResult {
  action: "login" | "purchase" | "prices" | "restore";
  status: "success" | "restored" | "cancelled" | "error";
  code?: string;
  message?: string;
  productId?: string;
  transactionId?: string;
  /** Store proof of purchase — Play purchaseToken / Apple base64 receipt.
   * MUST be sent to POST /iap/validate; entitlement is granted server-side. */
  verificationData?: string;
  store?: "google_play" | "app_store";
  packageName?: string;
  products?: IapPrice[];
  /** Requested product ids the store didn't recognise — "prices" action only. */
  notFound?: string[];
  restoredCount?: number;
  /** Set by the bridge after the backend confirms the grant. */
  granted?: boolean;
  /** Why the grant did NOT happen, when `granted` is false. The store has taken
   * the money at this point, so callers MUST surface this rather than report
   * success — otherwise the user sees "purchase successful" beside an unchanged
   * plan, with nothing anywhere naming the cause. */
  validationCode?: string;
  validationError?: string;
}

// ── Environment detection ───────────────────────────────────────────────────

/** True inside either native shell (Pro or Team app). */
export function isNativeShell(): boolean {
  return typeof window !== "undefined" && getClientAppType() !== "web";
}

/** Synchronous read of the shell-injected availability flag. */
export function isIapAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    (window as any).flutterIapAvailable === true
  );
}

/**
 * Reactive availability: the shell injects the flag on page load, which can
 * land after React mounts — so listen for the event as well as reading it.
 */
export function useIapAvailable(): boolean {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    // Any purchase surface may receive crash-replayed purchases from the
    // shell — make sure the backend-validation safety net is listening.
    installGlobalValidator();
    setAvailable(isIapAvailable());
    const handler = (e: Event) =>
      setAvailable((e as CustomEvent).detail === true);
    window.addEventListener("flutterIapAvailable", handler);
    return () => window.removeEventListener("flutterIapAvailable", handler);
  }, []);
  return available;
}

/**
 * 'ios' | 'android' | null — injected by the shell (webview_native.dart
 * _injectIapAvailability). The shell's User-Agent is IDENTICAL on both
 * platforms by design, so this flag is the ONLY way the web page can tell
 * which store a purchase must target.
 */
export function getNativePlatform(): "ios" | "android" | null {
  if (typeof window === "undefined") return null;
  const p = (window as any).flutterPlatform;
  return p === "ios" || p === "android" ? p : null;
}

/**
 * The team plans to OFFER for purchase. Both stores now hold the full 10-tier
 * catalog, so the platform split is gone: App Store Connect group "TEAM PLANS"
 * (2026-08-19) and Play package `com.valuecharts.app` (2026-08-19, verified
 * ACTIVE via the Play Developer API). The seat ceiling is finally the intended
 * 25 on both platforms rather than the effective 10 the legacy ids imposed.
 *
 * LEGACY_IOS_TEAM_PLANS / LEGACY_ANDROID_TEAM_PLANS are retained deliberately:
 * the backend still maps those ids, so an existing subscriber's renewals and
 * restores keep resolving. They are simply no longer OFFERED for new purchases.
 */
export function getTeamPlans(): LegacyTeamPlan[] {
  return TEAM_PLANS;
}

/** @deprecated Kept so existing call sites compile — use getTeamPlans(). */
export function getLegacyTeamPlans(): LegacyTeamPlan[] {
  return getTeamPlans();
}

/** Legacy team plans for the current platform, filtered to one billing
 * period. Mirrors subscription_plans.dart's plansForPeriod(). Drives the
 * native "Team Members" dropdown options. */
export function legacyTeamPlansForPeriod(
  period: "monthly" | "yearly",
): LegacyTeamPlan[] {
  return getLegacyTeamPlans().filter((p) => p.period === period);
}

/** Resolves the real legacy store plan matching a seats+period combo, or
 * undefined if no such product exists for this platform (e.g. Android has
 * no yearly team products today — caller must disable purchase, not crash). */
export function findLegacyTeamPlan(
  seats: number,
  period: "monthly" | "yearly",
): LegacyTeamPlan | undefined {
  return legacyTeamPlansForPeriod(period).find((p) => p.seats === seats);
}

// ── Bridge plumbing ─────────────────────────────────────────────────────────

function post(message: string): boolean {
  try {
    const bridge = (window as any).NativeBridge;
    if (!bridge?.postMessage) return false;
    bridge.postMessage(message);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves with the next flutterIap result matching [action] — and, when
 * given, satisfying [matches] too.
 *
 * bug: two concurrent calls of the same action (e.g. this page's own legacy
 * team-plan price query AND CreditAddOns' AI-credits price query, both
 * "prices") used to race here. `window.addEventListener` broadcasts to every
 * attached listener, so whichever native response landed FIRST resolved
 * BOTH pending promises — the second (correct) response then arrived with
 * every listener already removed and was silently dropped, which is exactly
 * why the AI-credits pack showed a permanent "•••" price. `matches` lets a
 * caller that knows which product ids it asked for reject a same-action
 * response that isn't actually for it, instead of accepting any response
 * with a matching `action` string.
 */
function waitForResult(
  action: string,
  timeoutMs: number,
  matches?: (detail: IapResult) => boolean,
): Promise<IapResult> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener("flutterIap", handler);
      reject(new Error(`IAP ${action} timed out`));
    }, timeoutMs);
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as IapResult;
      if (!detail || detail.action !== action) return;
      if (matches && !matches(detail)) return;
      clearTimeout(timer);
      window.removeEventListener("flutterIap", handler);
      resolve(detail);
    };
    window.addEventListener("flutterIap", handler);
  });
}

// ── Backend validation ──────────────────────────────────────────────────────

/**
 * Product ids with a page-level iapPurchase() promise currently awaiting them.
 *
 * bug-155: one `flutterIap` event reaches BOTH listeners — the window-level
 * installGlobalValidator AND iapPurchase's own waitForResult — so every
 * foreground purchase used to be validated TWICE: two `iap-prices` bridge
 * round-trips and two POST /iap/validate calls, each re-verifying with Google
 * Play / Apple and re-acknowledging. Harmless (the backend dedup ledger holds,
 * and `granted` is true on `duplicate`) but it doubled the wait the user sees
 * and the store-API load. The global validator now stands down for any product
 * a foreground purchase already owns; it still covers exactly what it was
 * built for — crash-replayed and restored transactions nobody is awaiting.
 */
const pendingPurchaseIds = new Set<string>();

/**
 * Window event fired once a grant is CONFIRMED by the backend, from the
 * window-level bridge rather than any component.
 *
 * bug-155: the post-purchase refresh used to live entirely inside the page's
 * own promise chain, so navigating away mid-purchase unmounted the only code
 * that would have updated the UI — the entitlement landed server-side and
 * every surface stayed stale until a full reload. This survives client-side
 * navigation, so whichever surface is mounted when the grant lands refetches.
 */
export const IAP_GRANTED_EVENT = "vc:iap-granted";

function announceGrant(result: IapResult) {
  try {
    window.dispatchEvent(
      new CustomEvent(IAP_GRANTED_EVENT, { detail: { ...result } }),
    );
    // Credit balances are read from a separate shared store that already
    // listens on this channel (see CreditAddOns) — keep it in sync too.
    window.dispatchEvent(new Event("aiCreditsChanged"));
  } catch {
    /* no-op */
  }
}

/**
 * How long a purchase may wait on the localized-price lookup before the
 * receipt is sent WITHOUT it.
 *
 * bug-155: the price is display metadata only — the backend treats it as "sets
 * the recorded amount, never an entitlement" (iap.controller.js) — yet the
 * grant call was queued behind it with the full 20s price timeout. Worse, that
 * timeout was reachable: waitForResult's matcher only accepts a response
 * echoing the requested id in `products` or `notFound`, and the shell's
 * `_error` / `_disabled` price shapes (iap_service.dart) carry NEITHER field,
 * so one flaky queryProductDetails after a purchase meant 20 seconds of
 * spinner before the receipt was even sent. Callers that already hold the
 * store price (every purchase surface fetches it to render the button) should
 * pass it to iapPurchase() and skip this wait entirely.
 */
const PRICE_LOOKUP_BUDGET_MS = 3_000;


/**
 * Sends the store's proof of purchase to the backend, which verifies it with
 * Google/Apple and grants the entitlement. Idempotent (backend dedup), so a
 * duplicate send is harmless. Returns true when the grant is confirmed.
 */
export async function validateWithBackend(
  result: IapResult,
  priceInfo?: IapPrice,
): Promise<boolean> {
  if (!result.productId || !result.verificationData || !result.store) {
    result.validationCode = "MISSING_PROOF";
    result.validationError = "The store did not return a usable receipt.";
    return false;
  }
  try {
    const res = await iapApi.validatePurchase({
      store: result.store,
      productId: result.productId,
      ...(result.store === "google_play"
        ? {
            purchaseToken: result.verificationData,
            packageName: result.packageName,
          }
        : { receiptData: result.verificationData }),
      // Forward the localized price the store showed the buyer so the backend
      // records the true amount + currency (Google's server API omits it).
      ...(priceInfo && typeof priceInfo.price === "number" && priceInfo.price > 0
        ? { priceAmount: priceInfo.price, currency: priceInfo.currencyCode }
        : {}),
    });
    const data = res.data?.data || res.data;
    if (data?.granted) {
      announceGrant(result);
      return true;
    }
    // 2xx but no grant — shouldn't happen, so don't let it read as success.
    result.validationCode = "NOT_GRANTED";
    result.validationError =
      "The server accepted the receipt but granted nothing.";
    return false;
  } catch (err: unknown) {
    // The store has already charged the user, so the reason must not be
    // swallowed: the RTDN / App Store notification safety net and the next
    // restore do re-deliver, but that is invisible and can take minutes. Record
    // the backend's own code/message (errorHandler.js shape:
    // `{success, error:{code, message}}`) so the caller can show it and it
    // lands in the WebView console for remote debugging.
    const body = (err as any)?.response?.data?.error;
    result.validationCode = body?.code || "VALIDATION_FAILED";
    result.validationError =
      body?.message || (err as any)?.message || "Could not reach the server.";
    console.error(
      `[IAP] validate rejected ${result.store}/${result.productId}: ` +
        `${result.validationCode} — ${result.validationError}`,
    );
    return false;
  }
}

/**
 * Global safety net: validates every successful/restored purchase the shell
 * forwards — including transactions replayed after a crash or a "Restore
 * purchases" run, which no page-level promise is waiting for. Installed once
 * per page load.
 */
function installGlobalValidator() {
  if (typeof window === "undefined") return;
  const w = window as any;
  if (w.__vcIapValidatorInstalled) return;
  w.__vcIapValidatorInstalled = true;
  window.addEventListener("flutterIap", (e: Event) => {
    const detail = (e as CustomEvent).detail as IapResult;
    if (
      detail?.action === "purchase" &&
      (detail.status === "success" || detail.status === "restored") &&
      detail.verificationData &&
      // bug-155: an awaited foreground purchase validates itself — don't
      // duplicate the store verification and the acknowledge.
      !(detail.productId && pendingPurchaseIds.has(detail.productId))
    ) {
      // Look up the localized store price for THIS product before validating so
      // restored/background-delivered rows record the real amount + currency
      // (e.g. ₹499 INR) instead of the USD fallback — matching iapPurchase().
      // Best-effort: a missing productId or a failed lookup just omits it.
      void (async () => {
        let priceInfo: IapPrice | undefined;
        try {
          if (detail.productId) {
            priceInfo = (
              await iapPrices([detail.productId], PRICE_LOOKUP_BUDGET_MS)
            )[detail.productId];
          }
        } catch {
          /* price lookup is non-critical — fall back to server-side pricing */
        }
        await validateWithBackend(detail, priceInfo);
      })();
    }
  });
}

// ── API ─────────────────────────────────────────────────────────────────────

let lastLoginUserId: string | null = null;

/**
 * Binds store purchases to the ValueChart account. REQUIRED before any
 * purchase — the backend webhook attributes entitlements by this id.
 * Idempotent per userId.
 */
export async function iapLogin(userId: string): Promise<boolean> {
  if (!userId || lastLoginUserId === userId) return lastLoginUserId === userId;
  const pending = waitForResult("login", 15_000);
  if (!post(`iap-login:${userId}`)) return false;
  try {
    const result = await pending;
    if (result.status === "success") {
      lastLoginUserId = userId;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Opens the native store payment sheet. Long timeout — the user may sit in
 * the store UI (payment methods, family approval) for minutes.
 * On success the store proof is validated with the backend before resolving;
 * `granted: true` on the result means the entitlement is confirmed live.
 */
export async function iapPurchase(
  productId: string,
  /**
   * The localized store price this surface ALREADY fetched to render its
   * button. Pass it and the grant call goes out the moment the sheet closes;
   * omit it and we spend up to PRICE_LOOKUP_BUDGET_MS looking it up.
   */
  knownPrice?: IapPrice,
): Promise<IapResult> {
  installGlobalValidator();
  pendingPurchaseIds.add(productId);
  const pending = waitForResult("purchase", 5 * 60_000);
  if (!post(`iap-purchase:${productId}`)) {
    pendingPurchaseIds.delete(productId);
    return {
      action: "purchase",
      status: "error",
      code: "bridge_unavailable",
      message: "Native bridge not available",
      productId,
    };
  }
  let result: IapResult;
  try {
    result = await pending;
  } catch (err) {
    // The 5-minute waitForResult timeout. Release the claim so a late
    // delivery still reaches the global validator, and hand the caller an
    // IapResult instead of a rejection — three of the four purchase surfaces
    // had no try/catch, so a throw here left the button spinning forever.
    pendingPurchaseIds.delete(productId);
    return {
      action: "purchase",
      status: "error",
      code: "timeout",
      message:
        (err as Error)?.message ||
        "The store did not respond. If you were charged, your purchase will " +
          "activate on its own shortly.",
      productId,
    };
  }
  try {
    if (result.status === "success") {
      // The backend records the real amount + currency (e.g. ₹499 INR) rather
      // than the fixed USD fallback when it gets a price. Never let that hold
      // up the grant, though — see PRICE_LOOKUP_BUDGET_MS.
      let priceInfo: IapPrice | undefined = knownPrice;
      if (!priceInfo) {
        try {
          priceInfo = (
            await iapPrices([productId], PRICE_LOOKUP_BUDGET_MS)
          )[productId];
        } catch {
          /* price lookup is non-critical — fall back to server-side pricing */
        }
      }
      result.granted = await validateWithBackend(result, priceInfo);
    }
  } finally {
    pendingPurchaseIds.delete(productId);
  }
  return result;
}

/** Localized store prices keyed by productId (empty map on failure). */
export async function iapPrices(
  productIds: string[],
  timeoutMs = 20_000,
): Promise<Record<string, IapPrice>> {
  const requested = new Set(productIds);
  // Disambiguate from any OTHER concurrent iapPrices() call's response (see
  // waitForResult) — a response actually answering this request will echo
  // at least one of the ids we asked for, in either products or notFound.
  const pending = waitForResult("prices", timeoutMs, (detail) => {
    const returned = [
      ...(detail.products || []).map((p) => p.productId),
      ...(detail.notFound || []),
    ];
    return returned.some((id) => requested.has(id));
  });
  const map: Record<string, IapPrice> = {};
  if (!post(`iap-prices:${productIds.join(",")}`)) return map;
  try {
    const result = await pending;
    (result.products || []).forEach((p) => {
      map[p.productId] = p;
    });
    return map;
  } catch {
    return map;
  }
}

/** Replays completed store transactions (mandatory "Restore" UI on iOS).
 * Each restored purchase arrives as its own event and is validated by the
 * global validator; the returned summary carries the count. */
export async function iapRestore(): Promise<IapResult> {
  installGlobalValidator();
  const pending = waitForResult("restore", 60_000);
  if (!post("iap-restore")) {
    return {
      action: "restore",
      status: "error",
      code: "bridge_unavailable",
      message: "Native bridge not available",
    };
  }
  return pending;
}

/**
 * A grant can land slightly after the store sheet closes — either from
 * /iap/validate finishing or from the store's server-to-server notification
 * (Play RTDN / App Store Server Notification). Calls [refresh] on an
 * escalating schedule until it reports the entitlement is live.
 *
 * bug-155: this used to be a FIXED timer — sleep 2s, refresh, sleep 4s,
 * refresh, sleep 8s, refresh — with the first refresh 2 seconds in and no way
 * to stop early. Callers `await` it before clearing their loading flag, so
 * every purchase held the button on "Loading…" for the full 14 seconds of
 * sleeping even when the grant was already live before the first tick; and
 * when the grant took longer than 14s the button reverted to its idle label
 * with the plan still not showing, which is exactly how it was reported.
 *
 * Now: refresh IMMEDIATELY (delay 0), stop as soon as [refresh] returns true,
 * and keep a longer tail for the slow case. A `refresh` that returns nothing
 * behaves like the old fixed schedule, minus the leading 2-second dead wait.
 */
export async function waitThenRefresh(
  /** Return `true` once the entitlement is confirmed live to stop polling. */
  refresh: () => boolean | void | Promise<boolean | void>,
  delaysMs: number[] = [0, 1500, 2500, 4000, 6000, 8000],
): Promise<void> {
  for (const delay of delaysMs) {
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    try {
      if ((await refresh()) === true) return;
    } catch {
      /* transient refresh failure — next attempt covers it */
    }
  }
}
