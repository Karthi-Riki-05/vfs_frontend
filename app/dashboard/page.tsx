"use client";

import { useEffect, useState } from "react";
import { Button, message } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import SubscriptionWidget from "@/components/dashboard/SubscriptionWidget";
import { DashGreeting } from "@/components/dashboard/DashGreeting";
import { FlowUsageBar } from "@/components/dashboard/FlowUsageBar";
import { DashKPICards } from "@/components/dashboard/DashKPICards";
import { DashActivityChart } from "@/components/dashboard/DashActivityChart";
import { DashRecentFlows } from "@/components/dashboard/DashRecentFlows";
import { TeamActivityFeed } from "@/components/dashboard/TeamActivityFeed";
import { aiApi } from "@/api/ai.api";
import { useAuth } from "@/hooks/useAuth";
import { usePro } from "@/hooks/usePro";
import { useDashboard } from "@/hooks/useDashboard";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/useMediaQuery";

// ──────── Main Dashboard ────────

export default function DashboardPage() {
  const { user } = useAuth();
  const { currentApp, proFlows, status } = usePro();
  const { stats, activity, recentFlows, teamActivity, loading } =
    useDashboard();
  const router = useRouter();
  const isMobile = useIsMobile();

  const isProApp = currentApp === "pro";
  const isUnlimited = status?.isUnlimited ?? false;

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
      } else {
        message.error(data.error?.message || "Could not open billing portal");
      }
    } catch {
      message.error("Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const success = params.get("addon_success");
    const cancelled = params.get("addon_cancelled");

    if (success === "true") {
      const credits = params.get("credits");
      const sessionId = params.get("session_id");
      window.history.replaceState({}, "", "/dashboard");
      // Verify the Stripe session server-side — this also GRANTS the credits
      // when the webhook hasn't reached the backend (idempotent, so it's
      // safe when the webhook already processed it).
      const finish = async () => {
        if (sessionId) {
          try {
            await aiApi.verifyAddonPurchase(sessionId);
          } catch {
            // Silent — webhook may have already credited
          }
        }
        message.success(
          credits
            ? `${credits} AI credits added to your account!`
            : "AI credits added to your account!",
        );
        window.dispatchEvent(new CustomEvent("aiCreditsChanged"));
      };
      finish();
    } else if (cancelled === "true") {
      message.info("Credit purchase cancelled");
      window.history.replaceState({}, "", "/dashboard");
    }
  }, []);

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
      {isProApp && (
        <FlowUsageBar
          proFlows={proFlows}
          isUnlimited={isUnlimited}
          onBuyMore={() => router.push("/dashboard/subscription")}
        />
      )}
      <DashKPICards stats={stats} loading={loading} />
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
      <TeamActivityFeed activity={teamActivity} loading={loading} />
    </div>
  );
}
