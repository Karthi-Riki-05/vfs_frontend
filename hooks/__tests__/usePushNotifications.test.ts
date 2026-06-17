import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const isPushSupported = vi.fn();
const currentPermission = vi.fn();
const requestNotificationPermission = vi.fn();
const onForegroundMessage = vi.fn();

vi.mock("@/lib/firebase", () => ({
  isPushSupported: () => isPushSupported(),
  currentPermission: () => currentPermission(),
  requestNotificationPermission: () => requestNotificationPermission(),
  onForegroundMessage: (...a: any[]) => onForegroundMessage(...a),
}));

import { usePushNotifications } from "../usePushNotifications";

describe("usePushNotifications", () => {
  beforeEach(() => {
    isPushSupported.mockReset().mockReturnValue(true);
    currentPermission.mockReset().mockReturnValue("default");
    requestNotificationPermission
      .mockReset()
      .mockResolvedValue("fcm-token-123");
    onForegroundMessage.mockReset().mockResolvedValue(() => {});
  });

  it("reports whether push is supported", () => {
    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.isSupported).toBe(true);
  });

  it("reflects the current permission after mount", async () => {
    currentPermission.mockReturnValue("granted");
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.permission).toBe("granted"));
    expect(result.current.isPermissionGranted).toBe(true);
  });

  it("requestPermission returns true when a token is obtained", async () => {
    currentPermission.mockReturnValueOnce("default").mockReturnValue("granted");
    const { result } = renderHook(() => usePushNotifications());

    let granted: boolean | undefined;
    await act(async () => {
      granted = await result.current.requestPermission();
    });
    expect(granted).toBe(true);
    expect(requestNotificationPermission).toHaveBeenCalled();
  });

  it("requestPermission returns false when permission is denied (no token)", async () => {
    requestNotificationPermission.mockResolvedValue(null);
    currentPermission.mockReturnValue("denied");
    const { result } = renderHook(() => usePushNotifications());

    let granted: boolean | undefined;
    await act(async () => {
      granted = await result.current.requestPermission();
    });
    expect(granted).toBe(false);
  });

  it("does not crash when a granted-permission token refresh errors", async () => {
    currentPermission.mockReturnValue("granted");
    requestNotificationPermission.mockRejectedValue(new Error("firebase down"));
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.permission).toBe("granted"));
    // Mount effect catches the rejection — hook stays usable.
    expect(result.current.isSupported).toBe(true);
  });
});
