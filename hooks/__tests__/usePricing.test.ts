import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { usePricing } from "../usePricing";

const mockFetch = (payload: any, reject = false) => {
  global.fetch = vi.fn(() =>
    reject
      ? Promise.reject(new Error("network"))
      : Promise.resolve({ json: () => Promise.resolve(payload) } as Response),
  );
};

const usdPricing = {
  countryCode: "US",
  currency: "USD",
  symbol: "$",
  isTestMode: false,
  prices: {
    team_monthly: { display: "$2", amount: 2, currency: "USD", usdCents: 200 },
    team_yearly: {
      display: "$20",
      amount: 20,
      currency: "USD",
      usdCents: 2000,
    },
  },
};

describe("usePricing", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns pricing data from the API", async () => {
    mockFetch({ success: true, data: usdPricing });
    const { result } = renderHook(() => usePricing());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.pricing?.currency).toBe("USD");
  });

  it("exposes the team monthly price correctly", async () => {
    mockFetch({ success: true, data: usdPricing });
    const { result } = renderHook(() => usePricing());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.pricing?.prices.team_monthly.amount).toBe(2);
    expect(result.current.pricing?.prices.team_yearly.usdCents).toBe(2000);
  });

  it("handles a different currency", async () => {
    mockFetch({
      success: true,
      data: { ...usdPricing, currency: "EUR", symbol: "€", countryCode: "DE" },
    });
    const { result } = renderHook(() => usePricing());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.pricing?.currency).toBe("EUR");
    expect(result.current.pricing?.symbol).toBe("€");
  });

  it("falls back to USD pricing on fetch error", async () => {
    mockFetch(null, true);
    const { result } = renderHook(() => usePricing());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.pricing?.currency).toBe("USD");
    expect(result.current.pricing?.prices.team_monthly.amount).toBe(2);
  });
});
