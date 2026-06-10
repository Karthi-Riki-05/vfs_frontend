"use client";

import { useEffect, useState } from "react";
import { Button } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { DashGreeting } from "@/components/dashboard/DashGreeting";
import { DashKPICards } from "@/components/dashboard/DashKPICards";
import { DashActivityChart } from "@/components/dashboard/DashActivityChart";
import { DashRecentFlows } from "@/components/dashboard/DashRecentFlows";
import { TeamActivityFeed } from "@/components/dashboard/TeamActivityFeed";
import SubscriptionWidget from "@/components/dashboard/SubscriptionWidget";
import { useDashboard } from "@/hooks/useDashboard";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/useMediaQuery";

export default function TeamDashboardPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [subStatus, setSubStatus] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    fetch("/api/subscription/status")
      .then((r) => r.json())
      .then((d) => setSubStatus(d?.data?.status ?? null))
      .catch(() => {});
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

  const { stats, activity, recentFlows, teamActivity, loading } = useDashboard({
    fetchTeamActivity: true,
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

      {/* NO FlowUsageBar — team app does not use flow limits */}

      <DashKPICards stats={stats} loading={loading} showTeamMembers={true} />

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

      {/* Team activity feed — always shown in team dashboard */}
      <TeamActivityFeed activity={teamActivity} loading={loading} />
    </div>
  );
}
