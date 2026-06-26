/**
 * getPostLoginDashboardUrl()
 *
 * Priority order:
 * 1. callbackUrl deep-link (same-origin + /dashboard guard)
 * 2. UA detection → pro=/dashboard/pro, team=/dashboard/team
 * 3. Default → /dashboard/team
 *
 * ?app= param and vc_app_param are fully removed.
 * UA is the only app-type signal.
 */

import { getClientAppType } from "@/lib/detectWebView";

export function getPostLoginDashboardUrl(): string {
  try {
    // Priority 1: deep-link callbackUrl
    const params = new URLSearchParams(window.location.search);
    const callbackUrl = params.get("callbackUrl");
    if (callbackUrl) {
      const u = new URL(callbackUrl, window.location.origin);
      if (
        u.origin === window.location.origin &&
        u.pathname.startsWith("/dashboard")
      ) {
        return u.pathname + u.search;
      }
    }

    // Priority 2: UA detection
    const appType = getClientAppType();
    if (appType === "pro") return "/dashboard/pro";
    if (appType === "team") return "/dashboard/team";
  } catch {
    // URL parse failed or restricted WebView
  }

  // Priority 3: default
  return "/dashboard/team";
}
