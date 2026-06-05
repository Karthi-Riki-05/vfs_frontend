"use client";
import { useEffect, useRef, useState } from "react";
import { Spin } from "antd";
import { usePro } from "@/hooks/usePro";
import { proApi } from "@/api/pro.api";
import { getAiBillingTeamId, setAiBillingTeamId } from "@/lib/aiBilling";

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
          fetch("/api/users/active-context", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ teamId: result.proTeamId }),
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

  // Show a spinner while Pro status is loading or while the grant is running.
  // After that, always render children — a ?app=pro user never sees payment.
  if (forcedMode === "pro" && (loading || granting)) {
    return (
      <div style={{ textAlign: "center", paddingTop: 120 }}>
        <Spin size="large" />
      </div>
    );
  }

  return <>{children}</>;
}
