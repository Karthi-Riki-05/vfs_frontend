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
 * App Store Connect under subscription group "TEAM PLANS" (created
 * 2026-08-19). Supersedes LEGACY_IOS_TEAM_PLANS for iOS — existing
 * subscribers on the old 4 legacy ids keep working unaffected (the backend's
 * IAP_PRODUCTS map and renewal handling for those ids are untouched), this
 * only changes what NEW purchases are offered. Android stays on
 * LEGACY_ANDROID_TEAM_PLANS below until its own new-catalog products exist
 * in Play Console.
 */
export const IOS_TEAM_PLANS: LegacyTeamPlan[] = IAP_TEAM_TIERS.flatMap(
  (seats) =>
    (["monthly", "yearly"] as const).map((period) => ({
      productId: teamProductId(seats, period),
      seats,
      period,
    })),
);

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
 * PHASE 1 TESTING — Pro flow add-ons.
 *
 * The `addon_flows_*_monthly` ids belong to the future 18-product catalog and
 * do NOT exist in any store yet, so querying them returns an empty price (the
 * on-device log showed `notFound: [addon_flows_standard_monthly,
 * addon_flows_unlimited_monthly]`). These are the REAL products the published
 * Pro apps own, both monthly:
 *   ltd     → limited flow allowance  (maps to the `standard` addon plan)
 *   unltd   → unlimited flows         (maps to the `unlimited` addon plan)
 * Mirrors backend/src/config/iapProducts.js.
 *
 * IDs differ per store — Android kept the original short names (verified
 * 2026-07-31 via the Play Developer API); the iOS App Store Connect entries
 * were created 2026-08-12 with a `_flows` suffix (subscription group "Value
 * Charts Pro Subscription", both Approved). Confirmed from the live App
 * Store Connect product ID column — do not assume the two stores share a
 * string here, unlike the rest of this file's catalog.
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
export const IOS_PRO_ADDONS: Record<"standard" | "unlimited", string> = {
  standard: "addon_flows_standard_monthly",
  unlimited: "addon_flows_unlimited_monthly",
};

/**
 * Real store product id for a Pro flow-addon plan on the CURRENT platform.
 * iOS uses the catalog ids; Android its legacy short names.
 */
export function findLegacyProAddon(
  plan: "standard" | "unlimited",
): string | undefined {
  return getNativePlatform() === "ios"
    ? IOS_PRO_ADDONS[plan]
    : ANDROID_PRO_ADDONS[plan];
}

/** All legacy Pro addon ids to price-check on this platform. */
export function legacyProAddonIds(): string[] {
  return Object.values(
    getNativePlatform() === "ios" ? IOS_PRO_ADDONS : ANDROID_PRO_ADDONS,
  );
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
 * The team plans to OFFER for purchase on whichever platform this device is.
 * iOS: the new 10-tier catalog (IOS_TEAM_PLANS), live since 2026-08-19.
 * Android: still the 4 legacy ids until its own new-catalog products exist
 * in Play Console. Falls back to Android's set if the platform flag hasn't
 * landed yet (matches the shell's own default — see kAppVariant).
 */
export function getLegacyTeamPlans(): LegacyTeamPlan[] {
  return getNativePlatform() === "ios"
    ? IOS_TEAM_PLANS
    : LEGACY_ANDROID_TEAM_PLANS;
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
 * Sends the store's proof of purchase to the backend, which verifies it with
 * Google/Apple and grants the entitlement. Idempotent (backend dedup), so a
 * duplicate send is harmless. Returns true when the grant is confirmed.
 */
export async function validateWithBackend(result: IapResult): Promise<boolean> {
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
    });
    const data = res.data?.data || res.data;
    if (data?.granted) return true;
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
      detail.verificationData
    ) {
      void validateWithBackend(detail);
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
export async function iapPurchase(productId: string): Promise<IapResult> {
  installGlobalValidator();
  const pending = waitForResult("purchase", 5 * 60_000);
  if (!post(`iap-purchase:${productId}`)) {
    return {
      action: "purchase",
      status: "error",
      code: "bridge_unavailable",
      message: "Native bridge not available",
      productId,
    };
  }
  const result = await pending;
  if (result.status === "success") {
    result.granted = await validateWithBackend(result);
  }
  return result;
}

/** Localized store prices keyed by productId (empty map on failure). */
export async function iapPrices(
  productIds: string[],
): Promise<Record<string, IapPrice>> {
  const requested = new Set(productIds);
  // Disambiguate from any OTHER concurrent iapPrices() call's response (see
  // waitForResult) — a response actually answering this request will echo
  // at least one of the ids we asked for, in either products or notFound.
  const pending = waitForResult("prices", 20_000, (detail) => {
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
 * (Play RTDN / App Store Server Notification). Calls [refresh] on a short
 * escalating schedule so the UI flips as soon as the backend has processed it.
 */
export async function waitThenRefresh(
  refresh: () => void | Promise<unknown>,
  delaysMs: number[] = [2000, 4000, 8000],
): Promise<void> {
  for (const delay of delaysMs) {
    await new Promise((r) => setTimeout(r, delay));
    try {
      await refresh();
    } catch {
      /* transient refresh failure — next attempt covers it */
    }
  }
}
