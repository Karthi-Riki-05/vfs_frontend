"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Spin } from "antd";
import { usePro } from "@/hooks/usePro";
import { proApi } from "@/api/pro.api";

const PRO_REDIRECT_KEY = "vc_pro_purchase_redirect";

export function ProGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { hasPro, proPurchasedAt, loading, forcedMode } = usePro();
  const grantAttempted = useRef(false);
  const [granting, setGranting] = useState(false);

  useEffect(() => {
    if (loading || grantAttempted.current) return;
    if (forcedMode !== "pro") return;

    // Always call the grant API for every ?app=pro user — the backend is
    // idempotent and returns { alreadyGranted: true } in <10ms if the Pro
    // credit row already exists.
    //
    // Removing the old `if (hasPro && proPurchasedAt) return` early-return
    // fixes the Team+Pro dual-user bug: Team subscribers have hasPro=true but
    // proPurchasedAt was being set incorrectly by the Team webhook. Even if
    // proPurchasedAt happened to be set, the backend now checks the credit-row
    // existence (not proPurchasedAt), so this guard calls through safely.
    grantAttempted.current = true;
    setGranting(true);

    proApi
      .grantProFromMobile()
      .then((res) => {
        const result = res.data?.data || res.data;

        if (result?.alreadyGranted) {
          // Credits already exist — no DB writes happened, no reload needed.
          // usePro already has hasPro=true, so children render immediately.
          setGranting(false);
        } else {
          // Credits freshly provisioned — reload so usePro picks up
          // proPurchasedAt=true and DashboardLayout triggers switchApp('pro').
          window.location.reload();
        }
      })
      .catch(() => {
        // Unexpected failure — fall back to Stripe payment page
        setGranting(false);
        try {
          sessionStorage.setItem(PRO_REDIRECT_KEY, "/dashboard?app=pro");
        } catch {}
        router.replace("/upgrade-pro?app=pro");
      });
  }, [loading, forcedMode, router]); // hasPro/proPurchasedAt removed — grant always runs once per mount

  // Show spinner while Pro status is loading or while grant is in progress
  if (forcedMode === "pro" && (loading || granting)) {
    return (
      <div style={{ textAlign: "center", paddingTop: 120 }}>
        <Spin size="large" />
      </div>
    );
  }

  // Render nothing while grant is pending (page will reload after success,
  // or redirect to /upgrade-pro on failure)
  if (
    forcedMode === "pro" &&
    !granting &&
    grantAttempted.current &&
    !(hasPro && proPurchasedAt)
  ) {
    return null;
  }

  return <>{children}</>;
}
