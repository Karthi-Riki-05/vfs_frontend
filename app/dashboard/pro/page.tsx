"use client";

import { useEffect, useState } from "react";
import { Button, message } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { DashGreeting } from "@/components/dashboard/DashGreeting";
import { FlowUsageBar } from "@/components/dashboard/FlowUsageBar";
import { DashKPICards } from "@/components/dashboard/DashKPICards";
import { DashActivityChart } from "@/components/dashboard/DashActivityChart";
import { DashRecentFlows } from "@/components/dashboard/DashRecentFlows";
import SubscriptionWidget from "@/components/dashboard/SubscriptionWidget";
import { useDashboard } from "@/hooks/useDashboard";
import { usePro } from "@/hooks/usePro";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useRouter } from "next/navigation";

export default function ProDashboardPage() {
  const { user } = useAuth();
  const { proFlows, status } = usePro();
  const router = useRouter();
  const isMobile = useIsMobile();

  const isUnlimited = status?.isUnlimited ?? false;

  const [subStatus, setSubStatus] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    fetch("/api/subscription/status")
      .then((r) => r.json())
      .then((d) => setSubStatus(d?.data?.status ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const success = params.get("addon_success");
    const cancelled = params.get("addon_cancelled");

    if (success === "true") {
      const credits = params.get("credits");
      message.success(
        credits
          ? `${credits} AI credits added to your account!`
          : "AI credits added to your account!",
      );
      window.dispatchEvent(new CustomEvent("aiCreditsChanged"));
      window.history.replaceState({}, "", "/dashboard/pro");
    } else if (cancelled === "true") {
      message.info("Credit purchase cancelled");
      window.history.replaceState({}, "", "/dashboard/pro");
    }
  }, []);

  const openCustomerPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/subscription/customer-portal", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success && data.data?.url) {
        window.location.href = data.data.url;
      }
    } finally {
      setPortalLoading(false);
    }
  };

  const { stats, activity, recentFlows, loading } = useDashboard({
    fetchTeamActivity: false,
  });

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: isMobile ? "0 16px" : "0 24px",
      }}
    >
      <DashGreeting userName={user?.name} />

      {subStatus === "past_due" && (
        <div
          style={{
            background: "#fff2f0",
            border: "1px solid #ffccc7",
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <ExclamationCircleOutlined
            style={{ color: "#ff4d4f", fontSize: 16, flexShrink: 0 }}
          />
          <span style={{ color: "#cf1322", fontSize: 13, flex: 1 }}>
            <strong>Payment Failed:</strong> Update your payment method to keep
            your subscription active.
          </span>
          <Button
            size="small"
            type="primary"
            danger
            onClick={openCustomerPortal}
            loading={portalLoading}
          >
            Update Card
          </Button>
        </div>
      )}

      {/* Flow usage bar — always shown in pro dashboard */}
      <FlowUsageBar
        proFlows={proFlows}
        isUnlimited={isUnlimited}
        onBuyMore={() => router.push("/dashboard/subscription")}
      />

      <DashKPICards stats={stats} loading={loading} showTeamMembers={false} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
          gap: 16,
          marginBottom: isMobile ? 20 : 28,
        }}
      >
        <div style={{ gridColumn: isMobile ? "1" : "1 / 3" }}>
          <DashActivityChart activity={activity} loading={loading} />
        </div>
        <SubscriptionWidget />
      </div>

      <DashRecentFlows flows={recentFlows} loading={loading} />

      {/* NO TeamActivityFeed — pro is a solo app */}
    </div>
  );
}
