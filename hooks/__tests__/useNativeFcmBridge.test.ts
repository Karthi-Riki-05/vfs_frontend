import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

  // bug-027: re-registration on foreground return, not just cold start.
  describe("visibility resume (bug-027)", () => {
    function setVisibility(state: "visible" | "hidden") {
      Object.defineProperty(document, "visibilityState", {
        value: state,
        configurable: true,
      });
    }

    afterEach(() => {
      vi.useRealTimers();
    });

    it("re-registers the SAME token on resume (bypasses the dedupe guard)", async () => {
      vi.useFakeTimers();
      (window as any).flutterDeviceToken = TOKEN;
      renderHook(() => useNativeFcmBridge());
      await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(1));

      // Past the cooldown so this resume isn't throttled against the
      // cold-start registration that just happened.
      await act(async () => {
        vi.advanceTimersByTime(60_001);
      });
      setVisibility("visible");
      await act(async () => {
        document.dispatchEvent(new Event("visibilitychange"));
      });
      expect(post).toHaveBeenCalledTimes(2);
      expect(post).toHaveBeenLastCalledWith("/auth/mobile/fcm-token", {
        fcmToken: TOKEN,
      });
    });

    it("does NOT re-register when the tab goes hidden", async () => {
      (window as any).flutterDeviceToken = TOKEN;
      renderHook(() => useNativeFcmBridge());
      await waitFor(() => expect(post).toHaveBeenCalledTimes(1));

      setVisibility("hidden");
      await act(async () => {
        document.dispatchEvent(new Event("visibilitychange"));
      });
      expect(post).toHaveBeenCalledTimes(1);
    });

    it("throttles rapid resume events within the cooldown window", async () => {
      vi.useFakeTimers();
      (window as any).flutterDeviceToken = TOKEN;
      renderHook(() => useNativeFcmBridge());
      await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(1));

      // Past the cooldown so the FIRST resume below is allowed.
      await act(async () => {
        vi.advanceTimersByTime(60_001);
      });
      setVisibility("visible");
      await act(async () => {
        document.dispatchEvent(new Event("visibilitychange"));
      });
      expect(post).toHaveBeenCalledTimes(2);

      // Immediate second resume, no time advance — should be throttled.
      await act(async () => {
        document.dispatchEvent(new Event("visibilitychange"));
      });
      expect(post).toHaveBeenCalledTimes(2);
    });

    it("allows another resume registration after the cooldown expires", async () => {
      vi.useFakeTimers();
      (window as any).flutterDeviceToken = TOKEN;
      renderHook(() => useNativeFcmBridge());
      await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(1));

      await act(async () => {
        vi.advanceTimersByTime(60_001);
      });
      setVisibility("visible");
      await act(async () => {
        document.dispatchEvent(new Event("visibilitychange"));
      });
      expect(post).toHaveBeenCalledTimes(2);

      await act(async () => {
        vi.advanceTimersByTime(60_001);
      });
      await act(async () => {
        document.dispatchEvent(new Event("visibilitychange"));
      });
      expect(post).toHaveBeenCalledTimes(3);
    });

    it("does nothing on resume outside the WebView shell", async () => {
      isNativeAppWebView.mockReturnValue(false);
      renderHook(() => useNativeFcmBridge());
      setVisibility("visible");
      await act(async () => {
        document.dispatchEvent(new Event("visibilitychange"));
      });
      expect(post).not.toHaveBeenCalled();
    });
  });
});
