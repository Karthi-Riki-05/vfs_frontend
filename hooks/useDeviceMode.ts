"use client";

import { useEffect, useState } from "react";

/**
 * useDeviceMode — explicit "web vs mobile app" signal.
 *
 * `vc_device_mode` is written by app/page.tsx on every entry:
 *   - 'mobile'  → opened via the Flutter WebView (?app=team / ?app=pro)
 *   - 'web'     → plain website visit (no ?app= param)
 *
 * Stored in sessionStorage (per-tab) — matching every other app-mode signal
 * here (vc_app_context, vc_app_param). localStorage would leak across tabs:
 * opening the mobile app URL in one tab would wrongly flip the website tab to
 * 'mobile' and hide the app switcher there.
 *
 * Initial state is null on both server and client to avoid a hydration
 * mismatch; the effect populates it after mount and defaults to 'web'.
 */
export function useDeviceMode() {
  const [deviceMode, setDeviceMode] = useState<"web" | "mobile" | null>(null);

  useEffect(() => {
    try {
      const mode = sessionStorage.getItem("vc_device_mode");
      setDeviceMode(mode === "mobile" ? "mobile" : "web");
    } catch {
      // sessionStorage blocked (restricted WebView) — assume web.
      setDeviceMode("web");
    }
  }, []);

  return {
    deviceMode,
    isWeb: deviceMode === "web",
    isMobileApp: deviceMode === "mobile",
  };
}
