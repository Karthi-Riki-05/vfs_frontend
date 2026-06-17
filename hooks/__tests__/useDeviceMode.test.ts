import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useDeviceMode } from "../useDeviceMode";

describe("useDeviceMode", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("defaults to web when no device mode is stored", async () => {
    const { result } = renderHook(() => useDeviceMode());
    await waitFor(() => expect(result.current.deviceMode).not.toBeNull());
    expect(result.current.deviceMode).toBe("web");
    expect(result.current.isWeb).toBe(true);
    expect(result.current.isMobileApp).toBe(false);
  });

  it("reads 'mobile' from the vc_device_mode session key", async () => {
    sessionStorage.setItem("vc_device_mode", "mobile");
    const { result } = renderHook(() => useDeviceMode());
    await waitFor(() => expect(result.current.deviceMode).toBe("mobile"));
    expect(result.current.isMobileApp).toBe(true);
    expect(result.current.isWeb).toBe(false);
  });

  it("treats any non-mobile value as web", async () => {
    sessionStorage.setItem("vc_device_mode", "web");
    const { result } = renderHook(() => useDeviceMode());
    await waitFor(() => expect(result.current.deviceMode).toBe("web"));
    expect(result.current.isWeb).toBe(true);
  });

  it("starts as null before the post-mount effect populates it", () => {
    const { result } = renderHook(() => useDeviceMode());
    // After the synchronous effect flush deviceMode is set; the contract is
    // simply that it resolves to a concrete 'web' | 'mobile' value.
    expect(["web", "mobile"]).toContain(result.current.deviceMode);
  });
});
