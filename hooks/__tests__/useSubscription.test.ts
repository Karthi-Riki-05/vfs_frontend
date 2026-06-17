import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const getCurrent = vi.fn();
const getStatus = vi.fn();
const getPlans = vi.fn();

vi.mock("@/api/subscriptions.api", () => ({
  subscriptionsApi: {
    getCurrent: (...a: any[]) => getCurrent(...a),
    getStatus: (...a: any[]) => getStatus(...a),
    getPlans: (...a: any[]) => getPlans(...a),
    subscribe: vi.fn(),
    createCheckout: vi.fn(),
    changePlan: vi.fn(),
    cancel: vi.fn(),
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
