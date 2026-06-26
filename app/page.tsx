"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getClientAppType } from "@/lib/detectWebView";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Canonical app type: native-shell User-Agent signature ONLY. The legacy
    // `?app=` query param is intentionally ignored — UA is the sole app-type
    // signal (parity with postLoginRedirect.ts / getClientAppType). This stops
    // a normal browser at /?app=pro from routing into the Pro dashboard (BUG-001)
    // and closes the front door of the Pro self-grant bypass.
    const appType = getClientAppType();
    // `app` keeps the old "pro" | "team" | null contract the code below uses.
    const app = appType === "web" ? null : appType;

    // Persist app context to storage. localStorage persists through same-origin
    // redirects, so writing here survives the /dashboard → /login middleware redirect.
    // The try guards against restricted WebViews where storage access throws.
    try {
      // Explicit device mode: 'mobile' iff the native shell's UA marks this as
      // the Pro/Team app, otherwise 'web'. Drives app-switcher visibility
      // (switcher shown only on web — see useDeviceMode). Per-tab sessionStorage
      // so app context in one tab can't hide the switcher on the website.
      const isMobileApp = app === "team" || app === "pro";
      sessionStorage.setItem("vc_device_mode", isMobileApp ? "mobile" : "web");

      // Default context is 'team'. Only upgrade to 'pro' for the Pro native UA.
      const appContext = app === "pro" ? "pro" : "team";
      // sessionStorage is per-tab — prevents cross-tab collisions.
      sessionStorage.setItem("vc_app_context", appContext);

      // Store the resolved app type separately (vc_app_context defaults to
      // "team" even for plain web visits, so it can't distinguish web vs the
      // team mobile app). LoginForm uses this to land on /dashboard/pro or
      // /dashboard/team directly after login — avoids the team→pro data flash.
      if (app === "pro" || app === "team") {
        sessionStorage.setItem("vc_app_param", app);
      } else {
        sessionStorage.removeItem("vc_app_param");
      }

      if (app === "pro") {
        // Clear any team-app billing teamId so the axios interceptor doesn't
        // send the old X-Team-Context on the first Pro app requests. ProGuard
        // will restore the correct proTeamId synchronously before the first
        // render (vc_pro_team_id → vc_ai_billing_team via setAiBillingTeamId).
        localStorage.removeItem("vc_ai_billing_team");
      } else {
        // Entering team app — clear stale Pro team id so the Pro billing context
        // doesn't bleed into team app requests if the user switches apps.
        localStorage.removeItem("vc_pro_team_id");
      }
    } catch {
      // localStorage may be blocked in restricted WebViews
    }

    // Route to the app-specific dashboard. If unauthenticated, middleware
    // redirects to /login — localStorage is already written by then.
    if (app === "pro") {
      router.replace("/dashboard/pro");
    } else if (app === "team") {
      router.replace("/dashboard/team");
    } else {
      router.replace("/dashboard/team");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Return an empty fragment — NOT null.
  // Next.js App Router treats return null as "no page" and serves the
  // notFound slot instead, which prevents the JS bundle from loading
  // and kills the useEffect redirect entirely.
  return <></>;
}
