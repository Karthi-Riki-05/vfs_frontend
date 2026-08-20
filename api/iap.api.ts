import api from "@/lib/axios";

/**
 * In-app purchase validation — the ONLY place an entitlement is granted for
 * a native store purchase. The shell hands the web app the store's proof of
 * purchase (Play purchaseToken / Apple receipt) via the flutterIap event;
 * this call sends it to the backend, which verifies it with Google/Apple
 * directly. Idempotent — safe to re-send the same purchase.
 */
export interface IapValidatePayload {
  store: "google_play" | "app_store";
  productId: string;
  /** Google Play only */
  purchaseToken?: string;
  /** Google Play only — shell package name */
  packageName?: string;
  /** App Store only — base64 app receipt */
  receiptData?: string;
  /** Localized store price the buyer saw (from iapPrices) — Google's server API
   * doesn't return it, so we forward it to record the true amount + currency
   * (e.g. 499 / "INR") instead of the USD fallback. */
  priceAmount?: number;
  currency?: string;
}

export const iapApi = {
  validatePurchase: (data: IapValidatePayload) =>
    api.post("/iap/validate", data),
};
