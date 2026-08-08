import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// usePro derives everything from proApi.getAppStatus() (fetched after auth),
// NOT from session fields. Mock both next-auth and the pro API.
const getAppStatus = vi.fn();

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { id: "user-1", email: "pro@test.com" } },
    status: "authenticated",
  }),
}));

vi.mock("@/api/pro.api", () => ({
  proApi: {
    getAppStatus: () => getAppStatus(),
    switchApp: vi.fn(),
    purchasePro: vi.fn(),
    buyFlows: vi.fn(),
  },
}));

import { usePro, __resetProStore } from "../usePro";

const PRO_STATUS = {
  currentApp: "pro" as const,
  hasPro: true,
  isUnlimited: false,
  proPurchasedAt: "2026-01-01T00:00:00.000Z",
  proFlows: { used: 3, max: 10, baseLimit: 10, extraPurchased: 0 },
};

describe("usePro hook", () => {
  beforeEach(() => {
    getAppStatus.mockReset();
    sessionStorage.clear();
    // usePro now shares one module-level snapshot across all consumers, so it
    // outlives a single renderHook — clear it or case N reads case N-1's data.
    __resetProStore();
  });

  it("exposes pro status after fetch resolves", async () => {
    getAppStatus.mockResolvedValue({ data: { data: PRO_STATUS } });
    const { result } = renderHook(() => usePro());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasPro).toBe(true);
    expect(result.current.currentApp).toBe("pro");
    expect(result.current.isProOwner).toBe(true);
    expect(result.current.proFlows?.max).toBe(10);
  });

  it("defaults to free/non-owner when status has no pro", async () => {
    getAppStatus.mockResolvedValue({
      data: {
        data: {
          currentApp: "free",
          hasPro: false,
          proPurchasedAt: null,
          proFlows: null,
        },
      },
    });
    const { result } = renderHook(() => usePro());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasPro).toBe(false);
    expect(result.current.currentApp).toBe("free");
    expect(result.current.isProOwner).toBe(false);
    expect(result.current.proFlows).toBeNull();
  });

  it("sets fetchError when the API call fails", async () => {
    getAppStatus.mockRejectedValue(new Error("500"));
    const { result } = renderHook(() => usePro());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.fetchError).toBe(true);
  });

  it("reads forcedMode from the vc_app_param session key", async () => {
    sessionStorage.setItem("vc_app_param", "pro");
    getAppStatus.mockResolvedValue({ data: { data: PRO_STATUS } });
    const { result } = renderHook(() => usePro());

    await waitFor(() => expect(result.current.forcedMode).toBe("pro"));
  });

  it("leaves forcedMode null on a plain web visit (no app param)", async () => {
    getAppStatus.mockResolvedValue({ data: { data: PRO_STATUS } });
    const { result } = renderHook(() => usePro());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.forcedMode).toBeNull();
  });

  // ── SHARED: one request for N consumers ──────────────────────────────────
  // The hook has 16 call sites and `useAppBrand` adds 7 more indirectly, so as
  // a per-instance hook it fired GET /pro/app-status once PER CONSUMER —
  // measured 6 per Team page load and 23 per Pro one, doubled by the app
  // switch's two page loads, which is what tripped the 600-req/2-min limiter.
  it("SHARED-P01: many consumers mounting together cause ONE request", async () => {
    getAppStatus.mockResolvedValue({ data: { data: PRO_STATUS } });

    const hooks = Array.from({ length: 6 }, () => renderHook(() => usePro()));
    await waitFor(() =>
      hooks.forEach((h) => expect(h.result.current.loading).toBe(false)),
    );

    expect(getAppStatus).toHaveBeenCalledTimes(1);
    // …and every consumer sees the same data, not just the one that fetched.
    hooks.forEach((h) => expect(h.result.current.hasPro).toBe(true));
  });

  it("SHARED-P02: a consumer mounting later reuses the snapshot, no refetch", async () => {
    getAppStatus.mockResolvedValue({ data: { data: PRO_STATUS } });
    const first = renderHook(() => usePro());
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    expect(getAppStatus).toHaveBeenCalledTimes(1);

    // Client-side navigation mounts another consumer — must not re-fetch.
    const later = renderHook(() => usePro());
    await waitFor(() => expect(later.result.current.loading).toBe(false));

    expect(getAppStatus).toHaveBeenCalledTimes(1);
    expect(later.result.current.currentApp).toBe("pro");
  });

  it("SHARED-P03: refresh() forces a real refetch", async () => {
    getAppStatus.mockResolvedValue({ data: { data: PRO_STATUS } });
    const { result } = renderHook(() => usePro());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getAppStatus).toHaveBeenCalledTimes(1);

    await result.current.refresh();
    expect(getAppStatus).toHaveBeenCalledTimes(2);
  });
});
