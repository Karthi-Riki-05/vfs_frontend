"use client";

import { useState, useEffect } from "react";

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

export function usePricing() {
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTestMode, setIsTestMode] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchPricing = async () => {
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const res = await fetch(
          `/api/pricing?timezone=${encodeURIComponent(timezone)}`,
          { cache: "no-store" },
        );
        const data = await res.json();
        if (cancelled) return;
        if (data.success && data.data) {
          // FEAT-010: multi-currency deferred — always display USD in the UI.
          // Backend detection stays intact; we only override the display layer.
          // Reset the WHOLE pricing object (currency, symbol AND prices) to the
          // USD default so local-currency amounts can never leak through.
          const FORCE_USD = true;
          if (FORCE_USD) {
            setPricing(FALLBACK_PRICING);
            return;
          }
          setPricing(data.data);
          setIsTestMode(!!data.data.isTestMode);
        } else {
          setPricing(FALLBACK_PRICING);
        }
      } catch (err) {
        console.error("[usePricing] Error fetching pricing:", err);
        if (!cancelled) setPricing(FALLBACK_PRICING);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPricing();
    return () => {
      cancelled = true;
    };
  }, []);

  return { pricing, loading, isTestMode };
}
