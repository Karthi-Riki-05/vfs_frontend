import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const apiGet = vi.fn();

vi.mock("@/lib/axios", () => ({
  default: { get: (...a: any[]) => apiGet(...a) },
}));

// getSocket returns null so the hook falls back to REST polling (no socket).
vi.mock("@/lib/socket", () => ({
  getSocket: () => null,
}));

import { useUnreadCount } from "../useUnreadCount";

describe("useUnreadCount", () => {
  beforeEach(() => {
    apiGet.mockReset();
  });

  it("returns the unread count from the API", async () => {
    apiGet.mockResolvedValue({
      data: { data: { totalUnread: 4, perGroup: { g1: 4 } } },
    });
    const { result } = renderHook(() => useUnreadCount());
    await waitFor(() => expect(result.current.totalUnread).toBe(4));
    expect(result.current.getUnreadCount("g1")).toBe(4);
  });

  it("returns 0 when there are no unread messages", async () => {
    apiGet.mockResolvedValue({
      data: { data: { totalUnread: 0, perGroup: {} } },
    });
    const { result } = renderHook(() => useUnreadCount());
    await waitFor(() => expect(apiGet).toHaveBeenCalled());
    expect(result.current.totalUnread).toBe(0);
  });

  it("handles an API error gracefully (stays at 0)", async () => {
    apiGet.mockRejectedValue(new Error("403"));
    const { result } = renderHook(() => useUnreadCount());
    await waitFor(() => expect(apiGet).toHaveBeenCalled());
    expect(result.current.totalUnread).toBe(0);
  });

  it("markGroupAsRead clears a group's unread count", async () => {
    apiGet.mockResolvedValue({
      data: { data: { totalUnread: 5, perGroup: { g1: 5 } } },
    });
    const { result } = renderHook(() => useUnreadCount());
    await waitFor(() => expect(result.current.totalUnread).toBe(5));

    act(() => {
      result.current.markGroupAsRead("g1");
    });
    expect(result.current.getUnreadCount("g1")).toBe(0);
    expect(result.current.totalUnread).toBe(0);
  });
});
