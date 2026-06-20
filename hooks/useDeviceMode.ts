"use client";

import { useEffect, useState } from "react";
import { getClientAppType, type AppType } from "@/lib/detectWebView";

/**
 * useDeviceMode — explicit "web vs mobile app" signal, plus the resolved
 * `appType` ('pro' | 'team' | 'web').
 *
 * Primary signal is the native shell's User-Agent (`ValueChartsMobile/Pro-App`
 * / `ValueChartsMobile/Team-App`) via `getClientAppType()`, which also folds in
 * the legacy `?app=` query param and the persisted `vc_app_param`. The older
 * `vc_device_mode` sessionStorage flag (written by app/page.tsx) is kept as a
 * backward-compat fallback so nothing breaks mid-rollout and restricted
 * WebViews that block storage still resolve from the UA.
 *
 * Initial state is null on both server and client to avoid a hydration
 * mismatch; the effect populates it after mount and defaults to 'web'.
 */
export function useDeviceMode() {
  const [deviceMode, setDeviceMode] = useState<"web" | "mobile" | null>(null);
  const [appType, setAppType] = useState<AppType | null>(null);

  useEffect(() => {
    // UA-driven (with ?app=/vc_app_param fallback) — the canonical signal.
    const resolved = getClientAppType();

    // Backward-compat: honour the legacy vc_device_mode flag too, so an older
    // page.tsx write or a non-UA entry still flips us to mobile.
    let storedMobile = false;
    try {
      storedMobile = sessionStorage.getItem("vc_device_mode") === "mobile";
    } catch {
      // sessionStorage blocked (restricted WebView) — rely on UA only.
    }

    const isMobile = resolved !== "web" || storedMobile;
    setAppType(resolved);
    setDeviceMode(isMobile ? "mobile" : "web");
  }, []);

  return {
    deviceMode,
    appType,
    isWeb: deviceMode === "web",
    isMobileApp: deviceMode === "mobile",
  };
}
