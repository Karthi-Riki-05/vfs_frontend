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

import { usePro } from "../usePro";

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
});
