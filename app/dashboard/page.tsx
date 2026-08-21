"use client";

import { useEffect, useState } from "react";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { Button } from "antd";
import { toast } from "sonner";
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
import { useLockState } from "@/hooks/useFlows";
import FlowListLockModal from "@/components/flows/FlowListLockModal";
import { useRouter } from "next/navigation";
import { useIsMobile, useIsTablet } from "@/hooks/useMediaQuery";

// ──────── Main Dashboard ────────

export default function DashboardPage() {
  const { user } = useAuth();
  const { currentApp, proFlows, status } = usePro();
  const { stats, activity, recentFlows, teamActivity, loading } =
    useDashboard();
  const router = useRouter();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  // Stack the widgets grid on mobile AND tablet — a 3-column row squeezes the
  // activity chart once the sidebar rail eats into the tablet content width.
  const stackWidgets = isMobile || isTablet;

  const isProApp = currentApp === "pro";
  const isUnlimited = status?.isUnlimited ?? false;

  const [lockModalOpen, setLockModalOpen] = useState(false);
  const { lockState } = useLockState();
  const isLocked = lockState.overLimitLocked;
  const openFlow = (flow: any) => {
    if (isLocked || !!flow?.markedForDowngrade) {
      setLockModalOpen(true);
      return;
    }
    window.open(`/dashboard/flows/${flow.id}`, "_blank");
  };

  // OPT-3: shared store — the Team and Pro dashboards both read this.
  const { status: subStatus } = useSubscriptionStatus();
  const [portalLoading, setPortalLoading] = useState(false);

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
        toast.error(data.error?.message || "Could not open billing portal");
      }
    } catch {
      toast.error("Failed to open billing portal");
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
        toast.success(
          credits
            ? `${credits} AI credits added to your account!`
            : "AI credits added to your account!",
        );
        window.dispatchEvent(new CustomEvent("aiCreditsChanged"));
      };
      finish();
    } else if (cancelled === "true") {
      toast.info("Credit purchase cancelled");
      window.history.replaceState({}, "", "/dashboard");
    }
  }, []);

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        // Page-container scale, shared with every other dashboard page:
        // 20px sides / 12px top on phones. Bottom stays 0 — `.responsive-content`
        // already reserves 140px there.
        padding: isMobile ? "12px 20px 0" : "0 24px",
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
      {(isProApp || (!isProApp && subStatus !== "active")) && (
        <FlowUsageBar
          proFlows={
            isProApp ? proFlows : { used: stats?.totalFlows ?? 0, max: 50 }
          }
          isUnlimited={isProApp ? isUnlimited : false}
          onBuyMore={() => router.push("/dashboard/subscription")}
        />
      )}
      <DashKPICards stats={stats} loading={loading} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: stackWidgets ? "1fr" : "1fr 1fr 1fr",
          gap: 16,
          marginBottom: isMobile ? 20 : 28,
        }}
      >
        <div style={{ gridColumn: stackWidgets ? "1" : "1 / 3" }}>
          <DashActivityChart activity={activity} loading={loading} />
        </div>
        <SubscriptionWidget />
      </div>
      <DashRecentFlows
        flows={recentFlows}
        loading={loading}
        onOpen={openFlow}
      />
      <TeamActivityFeed activity={teamActivity} loading={loading} />

      <FlowListLockModal
        open={lockModalOpen}
        onClose={() => setLockModalOpen(false)}
        isLocked={isLocked}
        flowUsed={lockState.flowUsed}
        totCount={lockState.totCount}
      />
    </div>
  );
}
