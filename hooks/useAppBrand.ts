"use client";

import { useEffect, useState } from "react";
import { getClientAppType, type AppType } from "@/lib/detectWebView";

/**
 * Branding shell type — "pro" | "team" | "web" — resolved from the native
 * WebView User-Agent (getClientAppType) AFTER mount.
 *
 * BRANDING ≠ BILLING. usePro().currentApp is the BILLING app ("free" | "pro"),
 * and a Pro-entitled user who opens the Team app still reports currentApp="pro"
 * until the server reconcile completes (sometimes longer). Keying the logo /
 * sidebar / theme off currentApp therefore leaked Pro branding into the Team
 * app. The app SHELL type is the correct, stable signal for which brand to
 * show, and getClientAppType() reads it straight from the `ValueChartsMobile/
 * Team-App` UA token (UA wins over the legacy ?app= param / stored value).
 *
 * SSR-safe: returns "web" until mount (navigator is unavailable on the server,
 * so getClientAppType would return "web" there anyway). On the first client
 * render this also returns "web", matching the server HTML — no hydration
 * mismatch — then reactively flips to the real shell type, instantly wiping any
 * Pro remnants in the Team app. Callers should fall back to the billing
 * currentApp ONLY for the "web" case (genuine website visitors).
 */
export function useAppBrand(): AppType {
  const [brand, setBrand] = useState<AppType>("web");
  useEffect(() => {
    setBrand(getClientAppType());
  }, []);
  return brand;
}
