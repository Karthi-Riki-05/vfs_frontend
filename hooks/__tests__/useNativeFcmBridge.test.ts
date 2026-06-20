import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const post = vi.fn();
const isNativeAppWebView = vi.fn();

vi.mock("@/lib/axios", () => ({
  default: { post: (...a: any[]) => post(...a) },
}));

vi.mock("@/lib/detectWebView", () => ({
  isNativeAppWebView: () => isNativeAppWebView(),
}));

import { useNativeFcmBridge } from "../useNativeFcmBridge";

const TOKEN = "a".repeat(142); // mirrors the 142-char native FCM token

describe("useNativeFcmBridge", () => {
  beforeEach(() => {
    post.mockReset().mockResolvedValue({ data: { success: true } });
    isNativeAppWebView.mockReset().mockReturnValue(true);
    delete (window as any).flutterDeviceToken;
    delete (window as any).onFlutterDeviceToken;
  });

  it("does nothing outside the WebView shell", async () => {
    isNativeAppWebView.mockReturnValue(false);
    (window as any).flutterDeviceToken = TOKEN;
    renderHook(() => useNativeFcmBridge());
    await new Promise((r) => setTimeout(r, 0));
    expect(post).not.toHaveBeenCalled();
  });

  it("registers a token already injected before mount", async () => {
    (window as any).flutterDeviceToken = TOKEN;
    renderHook(() => useNativeFcmBridge());
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("/auth/mobile/fcm-token", {
        fcmToken: TOKEN,
      }),
    );
  });

  it("registers a token delivered via the global callback", async () => {
    renderHook(() => useNativeFcmBridge());
    await act(async () => {
      (window as any).onFlutterDeviceToken(TOKEN);
    });
    expect(post).toHaveBeenCalledWith("/auth/mobile/fcm-token", {
      fcmToken: TOKEN,
    });
  });

  it("registers a token delivered via the flutterDeviceToken CustomEvent", async () => {
    renderHook(() => useNativeFcmBridge());
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent("flutterDeviceToken", { detail: { token: TOKEN } }),
      );
    });
    expect(post).toHaveBeenCalledWith("/auth/mobile/fcm-token", {
      fcmToken: TOKEN,
    });
  });

  it("does not re-post the same token twice", async () => {
    (window as any).flutterDeviceToken = TOKEN;
    renderHook(() => useNativeFcmBridge());
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    await act(async () => {
      (window as any).onFlutterDeviceToken(TOKEN);
    });
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("allows a retry after a non-auth failure", async () => {
    post.mockRejectedValueOnce({ response: { status: 500 } });
    renderHook(() => useNativeFcmBridge());
    await act(async () => {
      (window as any).onFlutterDeviceToken(TOKEN);
    });
    await act(async () => {
      (window as any).onFlutterDeviceToken(TOKEN);
    });
    expect(post).toHaveBeenCalledTimes(2);
  });

  it("removes the global callback on unmount", async () => {
    const { unmount } = renderHook(() => useNativeFcmBridge());
    expect(typeof (window as any).onFlutterDeviceToken).toBe("function");
    unmount();
    expect((window as any).onFlutterDeviceToken).toBeUndefined();
  });
});
