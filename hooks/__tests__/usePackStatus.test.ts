import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const packStatus = vi.fn();

vi.mock("@/api/notifications.api", () => ({
  flowPackApi: {
    packStatus: (...a: any[]) => packStatus(...a),
  },
}));

import { usePackStatus } from "../usePackStatus";

const status = (overrides: Record<string, any> = {}) => ({
  data: {
    data: {
      activePackId: "pack-1",
      packType: "standard",
      isUnlimited: false,
      expiresAt: "2026-12-01T00:00:00.000Z",
      gracePeriodEndsAt: null,
      status: "active",
      flowCount: 3,
      flowLimit: 50,
      isInPickerPhase: false,
      daysUntilExpiry: 30,
      ...overrides,
    },
  },
});

describe("usePackStatus", () => {
  beforeEach(() => {
    packStatus.mockReset();
  });

  it("returns the pack status after fetch", async () => {
    packStatus.mockResolvedValue(status());
    const { result } = renderHook(() => usePackStatus());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.status?.activePackId).toBe("pack-1");
  });

  it("detects an active pack", async () => {
    packStatus.mockResolvedValue(status({ status: "active" }));
    const { result } = renderHook(() => usePackStatus());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.status?.status).toBe("active");
  });

  it("detects a cancelling pack", async () => {
    packStatus.mockResolvedValue(status({ status: "cancelling" }));
    const { result } = renderHook(() => usePackStatus());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.status?.status).toBe("cancelling");
  });

  it("detects a past_due pack", async () => {
    packStatus.mockResolvedValue(status({ status: "past_due" }));
    const { result } = renderHook(() => usePackStatus());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.status?.status).toBe("past_due");
  });

  it("returns null when there is no pack (error path)", async () => {
    packStatus.mockRejectedValue(new Error("no pack"));
    const { result } = renderHook(() => usePackStatus());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.status).toBeNull();
  });
});
