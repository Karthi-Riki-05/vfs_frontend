"use client";
import { useEffect, useRef, useState } from "react";
import { VCShimmerSkeleton } from "@/components/ui/VCShimmerSkeleton";
import { usePro } from "@/hooks/usePro";
import { proApi } from "@/api/pro.api";
import { getAiBillingTeamId, setAiBillingTeamId } from "@/lib/aiBilling";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

export function ProGuard({ children }: { children: React.ReactNode }) {
  const { hasPro, proPurchasedAt, loading, forcedMode } = usePro();
  const grantAttempted = useRef(false);
  const [granting, setGranting] = useState(false);

  useEffect(() => {
    if (loading || grantAttempted.current) return;

    // Only act inside the Pro app (?app=pro → forcedMode='pro'). Everywhere
    // else, render children untouched.
    if (forcedMode !== "pro") return;

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

    // PRIORITY 2: In the Pro app but not granted yet. The ?app=pro context is
    // trusted as proof the user came from the App Store / Play Store (product
    // decision), so auto-grant Pro and NEVER show the payment page — no WebView
    // detection. The backend grant is idempotent: one 200-credit grant per
    // account, re-grant is a no-op, addon credits are preserved.
    grantAttempted.current = true;
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
            body: JSON.stringify({ teamId: result.proTeamId, appMode: "pro" }),
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
  }, [loading, forcedMode, hasPro, proPurchasedAt]);

  // Only block render while the grant API is in-flight. usePro.loading is no
  // longer gating the Spin — with sync proTeamId init (AiBillingContext lazy
  // state), the correct X-Team-Context header is available from frame 1, so
  // we can render the dashboard immediately and let billing fill in async.
  // First-time grants (granting=true) still show a spinner because the reload
  // they trigger is needed to pick up proPurchasedAt.
  if (forcedMode === "pro" && granting) {
    return (
      <div style={{ padding: "40px 24px" }}>
        <VCShimmerSkeleton variant="list" count={4} />
      </div>
    );
  }

  return <ErrorBoundary>{children}</ErrorBoundary>;
}
