import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const getCurrent = vi.fn();
const getStatus = vi.fn();
const getPlans = vi.fn();
// bug-091: named so the error-path tests can reject them.
const cancelApi = vi.fn();
const reactivateApi = vi.fn();

vi.mock("@/api/subscriptions.api", () => ({
  subscriptionsApi: {
    getCurrent: (...a: any[]) => getCurrent(...a),
    getStatus: (...a: any[]) => getStatus(...a),
    getPlans: (...a: any[]) => getPlans(...a),
    subscribe: vi.fn(),
    createCheckout: vi.fn(),
    changePlan: vi.fn(),
    cancel: (...a: any[]) => cancelApi(...a),
    reactivate: (...a: any[]) => reactivateApi(...a),
    activateNow: vi.fn(),
    cancelScheduled: vi.fn(),
  },
}));

vi.mock("antd", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    },
  };
});

// bug-091: assert on the toast the user actually sees.
const toastError = vi.fn();
const toastWarning = vi.fn();
const toastSuccess = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (...a: any[]) => toastError(...a),
    warning: (...a: any[]) => toastWarning(...a),
    success: (...a: any[]) => toastSuccess(...a),
    info: vi.fn(),
  },
}));

import { useSubscription } from "../useSubscription";

const statusOf = (status: string | null, hasSubscription = true) => ({
  data: {
    data: {
      hasSubscription,
      plan: "monthly",
      status,
      teamMemberLimit: 5,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    },
  },
});

describe("useSubscription", () => {
  beforeEach(() => {
    getCurrent.mockReset().mockResolvedValue({ data: { data: null } });
    getStatus.mockReset().mockResolvedValue(statusOf("active"));
    getPlans.mockReset().mockResolvedValue({ data: { data: { plans: [] } } });
  });

  it("returns status after fetch", async () => {
    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.status?.hasSubscription).toBe(true);
  });

  it("handles no subscription (null current)", async () => {
    getCurrent.mockResolvedValue({ data: null });
    getStatus.mockResolvedValue({
      data: { data: { hasSubscription: false, plan: null, status: null } },
    });
    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.subscription).toBeNull();
    expect(result.current.status?.hasSubscription).toBe(false);
  });

  it("detects an active status", async () => {
    getStatus.mockResolvedValue(statusOf("active"));
    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.status?.status).toBe("active");
  });

  it("detects a past_due status", async () => {
    getStatus.mockResolvedValue(statusOf("past_due"));
    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.status?.status).toBe("past_due");
  });

  it("detects an expired/canceled status", async () => {
    getStatus.mockResolvedValue(statusOf("canceled", false));
    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.status?.status).toBe("canceled");
  });

  it("resolves loading=false even when every fetch fails", async () => {
    getCurrent.mockRejectedValue(new Error("x"));
    getStatus.mockRejectedValue(new Error("x"));
    getPlans.mockRejectedValue(new Error("x"));
    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.status).toBeNull();
  });
});

// ── bug-091 ──────────────────────────────────────────────────────────────
// cancel/reactivate/activateNow/cancelScheduledChange used bare `catch {}`
// plus a hardcoded string, which DISCARDED the server's message. That threw
// away MANAGED_BY_STORE — the one error that tells a Play/App Store
// subscriber where they can actually manage their plan.
describe("useSubscription — MANAGED_BY_STORE surfacing (bug-091)", () => {
  const storeErr = {
    response: {
      status: 409,
      data: {
        error: {
          code: "MANAGED_BY_STORE",
          message:
            "This subscription is managed by Google Play, so it cannot be changed here. Open your subscription settings in Google Play to cancel.",
        },
      },
    },
  };

  beforeEach(() => {
    getCurrent.mockReset().mockResolvedValue({ data: { data: null } });
    getStatus.mockReset().mockResolvedValue(statusOf("active"));
    getPlans.mockReset().mockResolvedValue({ data: { data: { plans: [] } } });
    cancelApi.mockReset().mockResolvedValue({ data: {} });
    reactivateApi.mockReset().mockResolvedValue({ data: {} });
    toastError.mockReset();
    toastWarning.mockReset();
    toastSuccess.mockReset();
  });

  it("BUG091-FE01: cancel() shows the API's store message, not 'Failed to cancel'", async () => {
    cancelApi.mockRejectedValue(storeErr);
    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.cancel();

    expect(toastWarning).toHaveBeenCalledWith(
      expect.stringContaining("Google Play"),
      expect.objectContaining({ duration: 10000 }),
    );
    expect(toastError).not.toHaveBeenCalled();
  });

  it("BUG091-FE02: reactivate() surfaces it too", async () => {
    reactivateApi.mockRejectedValue(storeErr);
    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.reactivate();

    expect(toastWarning).toHaveBeenCalledWith(
      expect.stringContaining("Google Play"),
      expect.anything(),
    );
  });

  it("BUG091-FE03: an unrelated failure still shows the generic fallback", async () => {
    cancelApi.mockRejectedValue({ response: { status: 500, data: {} } });
    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.cancel();

    expect(toastError).toHaveBeenCalledWith("Failed to cancel subscription");
  });

  it("BUG091-FE04: managedByStore/storeName reach the consumer", async () => {
    getStatus.mockResolvedValue({
      data: {
        data: {
          ...statusOf("active").data.data,
          managedByStore: true,
          storeName: "Google Play",
        },
      },
    });
    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.status?.managedByStore).toBe(true);
    expect(result.current.status?.storeName).toBe("Google Play");
  });
});
