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
      display: "$1",
      amount: 1,
      currency: "USD",
      usdCents: 100,
    },
    pro_yearly: {
      display: "$1",
      amount: 1,
      currency: "USD",
      usdCents: 100,
    },
    team_monthly: {
      display: "$1",
      amount: 1,
      currency: "USD",
      usdCents: 100,
    },
    team_yearly: {
      display: "$7.20",
      amount: 7.2,
      currency: "USD",
      usdCents: 720,
    },
    addon_starter: {
      display: "$1.99",
      amount: 1.99,
      currency: "USD",
      usdCents: 199,
    },
    addon_standard: {
      display: "$3.99",
      amount: 3.99,
      currency: "USD",
      usdCents: 399,
    },
    addon_proppack: {
      display: "$7.99",
      amount: 7.99,
      currency: "USD",
      usdCents: 799,
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
