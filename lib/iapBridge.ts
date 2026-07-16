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
 * Entitlements are granted server-side by the RevenueCat webhook — a success
 * result here only means "the store accepted payment"; the caller refreshes
 * subscription status until the webhook lands (see waitThenRefresh).
 */

import { useEffect, useState } from "react";
import { getClientAppType } from "./detectWebView";
import { iapApi } from "@/api/iap.api";

// ── Product IDs — MUST mirror backend/src/config/iapProducts.js ────────────

/** In-app team tiers (owner decision 2026-07-04: max 25; 50/75/100 web-only) */
export const IAP_TEAM_TIERS = [5, 10, 15, 20, 25];

export const teamProductId = (seats: number, plan: "monthly" | "yearly") =>
  `team_${seats}_${plan}`;

export const IAP_PRODUCTS = {
  proLifetime: "pro_lifetime",
  flowPack50: "flowpack_50",
  flowPackUnlimited: "flowpack_unlimited",
  addonFlowsStandard: "addon_flows_standard_monthly",
  addonFlowsUnlimited: "addon_flows_unlimited_monthly",
  aiCredits: {
    starter: "aicredits_50",
    standard: "aicredits_100",
    proppack: "aicredits_200",
  } as Record<string, string>,
};

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

export const LEGACY_ANDROID_TEAM_PLANS: LegacyTeamPlan[] = [
  { productId: "com.valuecharts.app.mth_10", seats: 10, period: "monthly" },
  { productId: "com.valuecharts.app.mth_15", seats: 15, period: "monthly" },
  { productId: "com.valuecharts.app.mth_20", seats: 20, period: "monthly" },
  { productId: "com.valuecharts.app.mth_25", seats: 25, period: "monthly" },
];

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
  restoredCount?: number;
  /** Set by the bridge after the backend confirms the grant. */
  granted?: boolean;
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
 * PHASE 1 TESTING: the 4 legacy team plans for whichever platform this
 * device is. Falls back to Android's set if the platform flag hasn't landed
 * yet (matches the shell's own default — see kAppVariant).
 */
export function getLegacyTeamPlans(): LegacyTeamPlan[] {
  return getNativePlatform() === "ios"
    ? LEGACY_IOS_TEAM_PLANS
    : LEGACY_ANDROID_TEAM_PLANS;
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

/** Resolves with the next flutterIap result matching [action]. */
function waitForResult(action: string, timeoutMs: number): Promise<IapResult> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener("flutterIap", handler);
      reject(new Error(`IAP ${action} timed out`));
    }, timeoutMs);
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as IapResult;
      if (!detail || detail.action !== action) return;
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
  if (!result.productId || !result.verificationData || !result.store)
    return false;
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
    return !!data?.granted;
  } catch {
    // Backend down or receipt rejected — the RTDN / notification safety net
    // and the next restore both re-deliver, so don't surface a hard failure.
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
  const pending = waitForResult("prices", 20_000);
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
 * The RevenueCat webhook grants the entitlement a few seconds after the
 * store sheet closes. Calls [refresh] on a short escalating schedule so the
 * UI flips as soon as the backend has processed the purchase.
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
