"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { VCShimmerSkeleton } from "@/components/ui/VCShimmerSkeleton";
import { usePro } from "@/hooks/usePro";
import { proApi } from "@/api/pro.api";
import { isProWebView } from "@/lib/detectWebView";
import { getAiBillingTeamId, setAiBillingTeamId } from "@/lib/aiBilling";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

// Where unentitled website visitors are sent to buy Pro. Lives OUTSIDE the
// /dashboard subtree, so redirecting here does not re-enter ProGuard (no loop).
const PRO_UPGRADE_URL = "/upgrade-pro";

export function ProGuard({ children }: { children: React.ReactNode }) {
  const { hasPro, proPurchasedAt, loading, forcedMode } = usePro();
  const pathname = usePathname();
  const grantAttempted = useRef(false);
  const [granting, setGranting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  // True while we poll for a late-arriving WebView signal before deciding to
  // redirect. Keeps the skeleton up so the Pro shell never flashes meanwhile.
  const [resolving, setResolving] = useState(false);
  // Post-hydration gate. isProWebView() reads navigator.userAgent, which is
  // unavailable during SSR (always returns false on the server). Evaluating it
  // in the render body on the FIRST client render produced a different gate
  // result than the server inside the Flutter WebView (server → skeleton,
  // client → Pro shell), throwing a React hydration mismatch. We therefore
  // pin the render-time WebView read to `false` until after mount so the
  // hydration render matches the server HTML; the effect below flips `mounted`
  // and the real UA value is used on the next render.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Is the user trying to be inside the Pro app? Two ways in, both of which
  // land on /dashboard/pro:
  //   • ?app=pro deep-link  → forcedMode === 'pro' (from vc_app_param)
  //   • website Pro switcher → /dashboard/pro, but sets NO vc_app_param
  // So the route is the reliable, switcher-and-deep-link-covering signal;
  // forcedMode alone would miss the switcher path.
  const inProApp =
    forcedMode === "pro" ||
    pathname === "/dashboard/pro" ||
    (pathname?.startsWith("/dashboard/pro/") ?? false);

  useEffect(() => {
    if (loading || grantAttempted.current) return;

    // Only act inside the Pro app. Everywhere else, render children untouched.
    if (!inProApp) return;

    // PRIORITY 1: Already purchased Pro → straight through to the dashboard.
    if (hasPro && proPurchasedAt) {
      grantAttempted.current = true;
      // Restore proTeamId into the billing key so axios sends X-Team-Context
      // on the first flow query. localStorage may be cleared between sessions
      // (iOS WebView kills storage on app restart) without this the first
      // query has no header and leaks free flows into the Pro app (race
      // condition). Only pin if the billing key is currently empty — don't
      // overwrite a valid team selection the user made in this session.
      try {
        const storedProTeamId = localStorage.getItem("vc_pro_team_id");
        if (storedProTeamId && !getAiBillingTeamId()) {
          setAiBillingTeamId(storedProTeamId);
        }
      } catch {
        // localStorage blocked in restricted WebView — AiBillingContext.refresh()
        // will reconcile from the server context endpoint on mount.
      }
      return;
    }

    // PRIORITY 2: In the Pro app but not entitled yet.
    //
    // SECURITY + STRICT UX (2026-06-18): the ONLY context allowed to enter the
    // Pro app without an existing entitlement is the genuine Flutter WebView,
    // where the App Store / Play Store has already collected payment. Detect it
    // with isProWebView() (UA / native app token / Flutter-injected meta) — and
    // ONLY that. We must NOT trust vc_device_mode here: the /?app=pro URL hack
    // sets it to "mobile" from a plain browser, which is exactly how a web
    // visitor used to self-grant lifetime Pro for free (GATE-03). The server's
    // mobileAppOnly + enforceProContext guards remain the authoritative gate;
    // this client block is defense-in-depth/UX only.
    const runMobileGrant = () => {
      setResolving(false);
      setGranting(true);

      proApi
        .grantProFromMobile()
        .then((res) => {
          const result = res.data?.data || res.data;

          // Pro personal workspace = the user's own Pro team. Persist its id and
          // make it the active billing/data context so Pro flows land in the
          // isolated Pro team rather than a NULL-team personal bucket.
          if (result?.proTeamId) {
            try {
              localStorage.setItem("vc_pro_team_id", result.proTeamId);
            } catch {
              // localStorage blocked in restricted WebView — non-fatal.
            }
            // Pin as the active billing/data context immediately so the axios
            // interceptor sends X-Team-Context=proTeamId on all subsequent
            // requests without waiting for AiBillingContext.refresh().
            setAiBillingTeamId(result.proTeamId);
            // Non-blocking: best-effort persist of active context server-side.
            // appMode:'pro' is required — this raw fetch bypasses the axios
            // interceptor that normally attaches X-App-Context, so without it the
            // backend would write the proTeamId into the Team app's context.
            fetch("/api/users/active-context", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                teamId: result.proTeamId,
                appMode: "pro",
              }),
            }).catch(() => {});
          }

          if (result?.alreadyGranted) {
            // Credits already exist — no DB writes, no reload needed.
            setGranting(false);
          } else {
            // Freshly provisioned — reload so usePro picks up proPurchasedAt and
            // DashboardLayout triggers switchApp('pro').
            window.location.reload();
          }
        })
        .catch(() => {
          // The App Store purchase already happened — never drop a Pro-app user
          // on the payment page. Let them through even if the grant call failed.
          setGranting(false);
        });
    };

    // PRIORITY 3: not entitled, and isProWebView() was false on first pass.
    // A website visitor (NOT the mobile app) on the Pro route may NOT see or
    // enter the Pro app — hard-redirect them to the $5 Pro upgrade page. Only a
    // successful purchase (→ hasPro + proPurchasedAt → PRIORITY 1) lets them in.
    const redirectToUpgrade = () => {
      setResolving(false);
      setRedirecting(true);
      try {
        // Drop the Pro context markers first. They were set by the switcher
        // (vc_app_context) or the ?app=pro entry page (vc_app_param), but the
        // user is NOT entitled to Pro — leaving them set would (a) make axios
        // send X-App-Context: pro and earn a 403 on the upgrade page's own
        // queries, and (b) make the upgrade page think this is a genuine Pro-app
        // user and bounce them straight back to /dashboard.
        sessionStorage.removeItem("vc_app_context");
        sessionStorage.removeItem("vc_app_param");
      } catch {
        // sessionStorage blocked — non-fatal; the redirect still proceeds.
      }
      window.location.href = PRO_UPGRADE_URL;
    };

    grantAttempted.current = true;

    // Genuine WebView detected synchronously → grant immediately.
    if (isProWebView()) {
      runMobileGrant();
      return;
    }

    // First-pass WebView check was negative. This is EITHER a real browser
    // (→ must redirect) OR a genuine Flutter WebView whose x-app-source meta
    // tag has not been injected yet (a few frames after mount). The redirect
    // below is irreversible (window.location), so poll isProWebView() across a
    // short grace window first, keeping the skeleton up. A real browser never
    // gains the WebView signal, so it still redirects → GATE-02/03 stay green.
    // We deliberately do NOT consult vc_device_mode (the /?app=pro hack sets it
    // to "mobile" from a plain browser — that is the GATE-03 exploit).
    setResolving(true);
    let elapsed = 0;
    const STEP_MS = 150;
    const MAX_WAIT_MS = 900;
    const timer = setInterval(() => {
      if (isProWebView()) {
        clearInterval(timer);
        runMobileGrant();
        return;
      }
      elapsed += STEP_MS;
      if (elapsed >= MAX_WAIT_MS) {
        clearInterval(timer);
        redirectToUpgrade();
      }
    }, STEP_MS);
    return () => clearInterval(timer);
  }, [loading, inProApp, hasPro, proPurchasedAt]);

  // Never flash the Pro shell to a visitor on the Pro route before entitlement
  // is resolved. Block render with a skeleton while:
  //   • a mobile grant is in flight (granting), or
  //   • the hard redirect to the upgrade page is running (redirecting), or
  //   • the entitlement status is still loading for a NON-WebView visitor —
  //     this is the window in which an unentitled web user would otherwise see
  //     the Pro shell before the effect bounces them to /upgrade-pro.
  // Genuine WebView users skip the loading-gate so the Pro dashboard renders
  // immediately (the X-Team-Context header is available from frame 1).
  // Only consult the UA AFTER hydration (mounted) — see the `mounted` note
  // above. On the hydration render this is `false`, matching the server.
  const webViewDetected = mounted && isProWebView();
  if (
    inProApp &&
    (granting || redirecting || resolving || (loading && !webViewDetected))
  ) {
    return (
      <div style={{ padding: "40px 24px" }}>
        <VCShimmerSkeleton variant="list" count={4} />
      </div>
    );
  }

  return <ErrorBoundary>{children}</ErrorBoundary>;
}
