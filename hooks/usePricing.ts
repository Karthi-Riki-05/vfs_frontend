"use client";

import { createSharedResource } from "@/lib/sharedResource";

export interface PriceInfo {
  display: string;
  amount: number;
  currency: string;
  usdCents: number;
}

export interface PricingData {
  countryCode: string;
  currency: string;
  symbol: string;
  prices: {
    pro_monthly: PriceInfo;
    pro_yearly: PriceInfo;
    team_monthly: PriceInfo;
    team_yearly: PriceInfo;
    addon_starter: PriceInfo;
    addon_standard: PriceInfo;
    addon_proppack: PriceInfo;
  };
  detectedCountry?: string;
  detectionMethod?: string;
  isTestMode?: boolean;
  note?: string;
}

const FALLBACK_PRICING: PricingData = {
  countryCode: "US",
  currency: "USD",
  symbol: "$",
  prices: {
    pro_monthly: {
      display: "$5",
      amount: 5,
      currency: "USD",
      usdCents: 500,
    },
    pro_yearly: {
      display: "$5",
      amount: 5,
      currency: "USD",
      usdCents: 500,
    },
    team_monthly: {
      display: "$2",
      amount: 2,
      currency: "USD",
      usdCents: 200,
    },
    team_yearly: {
      display: "$20",
      amount: 20,
      currency: "USD",
      usdCents: 2000,
    },
    addon_starter: {
      display: "$5",
      amount: 5,
      currency: "USD",
      usdCents: 500,
    },
    addon_standard: {
      display: "$8",
      amount: 8,
      currency: "USD",
      usdCents: 800,
    },
    addon_proppack: {
      display: "$15",
      amount: 15,
      currency: "USD",
      usdCents: 1500,
    },
  },
};

// OPT-3 (2026-08-08): one shared fetch for all consumers.
//
// This hook is called from the subscription page, the upgrade page and the
// credits-exhausted modal, and each instance ran its own request — 4 × GET
// /pricing on a plain dashboard load, for a value that is the same for
// everybody and changes about never.
//
// Note FORCE_USD below: while it is on, the response is DISCARDED and the
// fallback table is displayed. The request is still worth deduping rather than
// deleting — the backend keeps currency detection alive behind it, and the
// display override is meant to be temporary (FEAT-010).
const pricingResource = createSharedResource<{
  pricing: PricingData;
  isTestMode: boolean;
}>("pricing", async () => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const res = await fetch(
    `/api/pricing?timezone=${encodeURIComponent(timezone)}`,
    { cache: "no-store" },
  );
  const data = await res.json();
  if (data?.success && data?.data) {
    // FEAT-010: multi-currency deferred — always display USD in the UI.
    // Backend detection stays intact; we only override the display layer.
    // Reset the WHOLE pricing object (currency, symbol AND prices) to the USD
    // default so local-currency amounts can never leak through.
    const FORCE_USD = true;
    if (FORCE_USD) return { pricing: FALLBACK_PRICING, isTestMode: false };
    return { pricing: data.data, isTestMode: !!data.data.isTestMode };
  }
  return { pricing: FALLBACK_PRICING, isTestMode: false };
});

export function usePricing() {
  // A single constant key: pricing is not per-user, so every consumer in the
  // app shares one entry for the life of the page.
  const { data, loading, error } = pricingResource.use("global");
  return {
    // On failure the store keeps `data` null, so fall back here — callers render
    // prices unconditionally and a null would blank the paywall.
    pricing: data?.pricing || (error ? FALLBACK_PRICING : data?.pricing || null),
    loading,
    isTestMode: data?.isTestMode ?? false,
  };
}

export const __pricingResource = pricingResource;
