"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Spin } from "antd";
import { usePro } from "@/hooks/usePro";

const PRO_REDIRECT_KEY = "vc_pro_purchase_redirect";

export function ProGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { hasPro, proPurchasedAt, loading, forcedMode } = usePro();
  const redirected = useRef(false);

  useEffect(() => {
    if (loading || redirected.current) return;
    if (forcedMode !== "pro") return;

    const isProOwner = hasPro && proPurchasedAt !== null;
    if (!isProOwner) {
      redirected.current = true;
      try {
        sessionStorage.setItem(PRO_REDIRECT_KEY, "/dashboard?app=pro");
      } catch {}
      router.replace("/upgrade-pro?app=pro");
    }
  }, [loading, hasPro, proPurchasedAt, forcedMode, router]);

  // Block render while checking Pro ownership in forced-pro mode
  if (forcedMode === "pro" && loading) {
    return (
      <div style={{ textAlign: "center", paddingTop: 120 }}>
        <Spin size="large" />
      </div>
    );
  }

  // Render nothing while redirecting unauthorized pro user
  if (forcedMode === "pro" && !loading && !(hasPro && proPurchasedAt)) {
    return null;
  }

  return <>{children}</>;
}
