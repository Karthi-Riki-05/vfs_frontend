"use client";

import React, { useEffect, useState } from "react";
import { Button, Progress, Typography, Skeleton, message } from "antd";
import {
  FileTextOutlined,
  EditOutlined,
  TeamOutlined,
  ShareAltOutlined,
  HeartFilled,
  ProjectOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import SubscriptionWidget from "@/components/dashboard/SubscriptionWidget";
import { useAuth } from "@/hooks/useAuth";
import { usePro } from "@/hooks/usePro";
import { useDashboard } from "@/hooks/useDashboard";
import { useRouter } from "next/navigation";
import { useIsMobile, useIsWideMobile } from "@/hooks/useMediaQuery";

const { Text } = Typography;

function FlowUsageBar({
  proFlows,
  isUnlimited,
  onBuyMore,
}: {
  proFlows: any;
  isUnlimited: boolean;
  onBuyMore: () => void;
}) {
  const isMobile = useIsMobile();

  if (!proFlows) return null;
  const isLimited = !isUnlimited && proFlows.max > 0;
  const percent = isLimited
    ? Math.round((proFlows.used / proFlows.max) * 100)
    : 0;
  const isNearLimit = percent >= 80;

  return (
    <div
      style={{
        background: "#FAFAFA",
        borderRadius: 12,
        border: "1px solid #E8E8E8",
        padding: isMobile ? "12px 16px" : "16px 20px",
        marginBottom: isMobile ? 20 : 28,
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "stretch" : "center",
        gap: isMobile ? 12 : 16,
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8,
            flexWrap: "wrap",
            gap: 4,
          }}
        >
          <Text strong style={{ fontSize: 14 }}>
            FLOW USAGE
          </Text>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {isUnlimited
              ? `${proFlows.used} flows used (Unlimited)`
              : `${proFlows.used} / ${proFlows.max} flows used`}
          </Text>
        </div>
        {isLimited && (
          <Progress
            percent={percent}
            showInfo={false}
            strokeColor={isNearLimit ? "#FF4D4F" : "#3CB371"}
            trailColor="#E8E8E8"
            size="small"
          />
        )}
      </div>
      {!isUnlimited && (
        <Button
          type="primary"
          onClick={onBuyMore}
          block={isMobile}
          style={{
            backgroundColor: "#3CB371",
            borderColor: "#3CB371",
            borderRadius: 8,
            fontWeight: 600,
          }}
        >
          Buy More Flows
        </Button>
      )}
    </div>
  );
}

// ──────── KPI Cards ────────

const KPI_CONFIG = [
  {
    key: "totalFlows",
    label: "Total Flows",
    icon: <FileTextOutlined />,
    color: "#3CB371",
    bg: "#F0FFF4",
  },
  {
    key: "editedThisMonth",
    label: "Edited This Month",
    icon: <EditOutlined />,
    color: "#1890FF",
    bg: "#E6F7FF",
  },
  {
    key: "teamMembers",
    label: "Team Members",
    icon: <TeamOutlined />,
    color: "#722ED1",
    bg: "#F9F0FF",
  },
  {
    key: "sharedFlows",
    label: "Shared Flows",
    icon: <ShareAltOutlined />,
    color: "#FA8C16",
    bg: "#FFF7E6",
  },
];

function KPICards({ stats, loading }: { stats: any; loading: boolean }) {
  const isMobile = useIsMobile();
  const isWideMobile = useIsWideMobile();

  // On very narrow screens, 2 cols. On wide mobile (Fold unfolded) and above, 4 cols.
  const columns = (isMobile && !isWideMobile) ? "repeat(2, 1fr)" : "repeat(4, 1fr)";
  const gap = (isMobile && !isWideMobile) ? 10 : 16;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: columns,
        gap: gap,
        marginBottom: isMobile ? 20 : 28,
      }}
    >
      {KPI_CONFIG.map((kpi) => (
        <div
          key={kpi.key}
          style={{
            background: "#fff",
            borderRadius: 12,
            border: "1px solid #F0F0F0",
            padding: isMobile ? "14px 12px" : "20px 20px",
            display: "flex",
            alignItems: "center",
            gap: isMobile ? 10 : 14,
          }}
        >
          <div
            style={{
              width: isMobile ? 36 : 44,
              height: isMobile ? 36 : 44,
              borderRadius: 10,
              background: kpi.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: isMobile ? 16 : 20,
              color: kpi.color,
              flexShrink: 0,
            }}
          >
            {kpi.icon}
          </div>
          <div>
            {loading ? (
              <Skeleton.Input
                active
                size="small"
                style={{ width: 40, height: 28 }}
              />
            ) : (
              <div
                style={{
                  fontSize: isMobile ? 20 : 26,
                  fontWeight: 700,
                  lineHeight: 1.1,
                  color: "#1A1A2E",
                }}
              >
                {stats?.[kpi.key] ?? 0}
              </div>
            )}
            <div
              style={{
                fontSize: isMobile ? 11 : 12,
                color: "#8C8C8C",
                marginTop: 2,
              }}
            >
              {kpi.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ──────── Activity Chart (SVG) ────────

function ActivityChart({
  activity,
  loading,
}: {
  activity: any[];
  loading: boolean;
}) {
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #F0F0F0",
          padding: 20,
        }}
      >
        <Skeleton active paragraph={{ rows: 4 }} />
      </div>
    );
  }

  if (!activity || activity.length === 0) return null;

  const maxVal = Math.max(...activity.map((d) => d.created + d.edited), 1);
  const chartH = isMobile ? 100 : 140;
  const barW = isMobile ? 24 : 40;
  const gap = isMobile ? 8 : 16;
  const totalW = activity.length * (barW + gap) - gap;

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        border: "1px solid #F0F0F0",
        padding: isMobile ? "16px 12px" : "20px 24px",
      }}
    >
      <Text
        strong
        style={{
          fontSize: 12,
          color: "#8C8C8C",
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        FLOW ACTIVITY (LAST 7 DAYS)
      </Text>
      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "center",
          marginTop: 4,
          marginBottom: 12,
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            color: "#8C8C8C",
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: "#3CB371",
              display: "inline-block",
            }}
          />{" "}
          Created
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            color: "#8C8C8C",
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: "#1890FF",
              display: "inline-block",
            }}
          />{" "}
          Edited
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <svg
          width={totalW}
          height={chartH + 24}
          viewBox={`0 0 ${totalW} ${chartH + 24}`}
        >
          {activity.map((day, i) => {
            const x = i * (barW + gap);
            const createdH = (day.created / maxVal) * chartH;
            const editedH = (day.edited / maxVal) * chartH;
            const totalH = createdH + editedH;
            return (
              <g key={day.date}>
                {/* Edited (bottom) */}
                <rect
                  x={x}
                  y={chartH - totalH}
                  width={barW}
                  height={editedH}
                  rx={4}
                  fill="#1890FF"
                  opacity={0.8}
                />
                {/* Created (top) */}
                <rect
                  x={x}
                  y={chartH - createdH}
                  width={barW}
                  height={createdH}
                  rx={4}
                  fill="#3CB371"
                />
                {/* Label */}
                <text
                  x={x + barW / 2}
                  y={chartH + 16}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#8C8C8C"
                >
                  {day.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ──────── Recent Flows ────────

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

function RecentFlowsSection({
  flows,
  loading,
}: {
  flows: any[];
  loading: boolean;
}) {
  const isMobile = useIsMobile();
  const router = useRouter();

  if (loading) {
    return (
      <div style={{ marginBottom: isMobile ? 20 : 28 }}>
        <Text
          strong
          style={{
            fontSize: 12,
            color: "#8C8C8C",
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          RECENT FLOWS
        </Text>
        <div style={{ marginTop: 12 }}>
          <Skeleton active paragraph={{ rows: 3 }} />
        </div>
      </div>
    );
  }

  if (!flows || flows.length === 0) return null;

  return (
    <div style={{ marginBottom: isMobile ? 20 : 28 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <Text
          strong
          style={{
            fontSize: 12,
            color: "#8C8C8C",
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          RECENT FLOWS
        </Text>
        <button
          onClick={() => router.push("/dashboard/flows")}
          style={{
            fontSize: 12,
            color: "#3CB371",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
            fontFamily: "Inter, sans-serif",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.textDecoration = "underline")
          }
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
        >
          View All
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          paddingBottom: 4,
        }}
      >
        {flows.map((flow) => (
          <div
            key={flow.id}
            onClick={() => window.open(`/dashboard/flows/${flow.id}`, "_blank")}
            style={{
              minWidth: isMobile ? 140 : 180,
              width: isMobile ? 140 : 180,
              background: "#fff",
              borderRadius: 12,
              border: "1px solid #F0F0F0",
              cursor: "pointer",
              overflow: "hidden",
              transition: "all 0.2s",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {/* Thumbnail */}
            <div
              style={{
                height: isMobile ? 80 : 100,
                background: "#F8F9FA",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {flow.thumbnail ? (
                <img
                  src={flow.thumbnail}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <ProjectOutlined style={{ fontSize: 28, color: "#D9D9D9" }} />
              )}
            </div>
            {/* Info */}
            <div style={{ padding: "10px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Text
                  strong
                  ellipsis
                  style={{ fontSize: 13, color: "#1A1A2E", flex: 1 }}
                >
                  {flow.name}
                </Text>
                {flow.isFavorite && (
                  <HeartFilled style={{ fontSize: 11, color: "#FF4D6A" }} />
                )}
              </div>
              <Text style={{ fontSize: 11, color: "#8C8C8C" }}>
                {timeAgo(flow.updatedAt)}
              </Text>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────── Team Activity Feed ────────

function TeamActivityFeed({
  activity,
  loading,
}: {
  activity: any[];
  loading: boolean;
}) {
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div style={{ marginBottom: isMobile ? 20 : 28 }}>
        <Text
          strong
          style={{
            fontSize: 12,
            color: "#8C8C8C",
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          TEAM ACTIVITY
        </Text>
        <div style={{ marginTop: 12 }}>
          <Skeleton active paragraph={{ rows: 3 }} />
        </div>
      </div>
    );
  }

  if (!activity || activity.length === 0) return null;

  return (
    <div style={{ marginBottom: isMobile ? 20 : 28 }}>
      <Text
        strong
        style={{
          fontSize: 12,
          color: "#8C8C8C",
          textTransform: "uppercase",
          letterSpacing: 1,
          display: "block",
          marginBottom: 12,
        }}
      >
        TEAM ACTIVITY
      </Text>

      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #F0F0F0",
          overflow: "hidden",
        }}
      >
        {activity.slice(0, 5).map((item, i) => (
          <div
            key={`${item.id}-${i}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              borderBottom:
                i < Math.min(activity.length, 5) - 1
                  ? "1px solid #F5F5F5"
                  : "none",
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "#F0FFF4",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                overflow: "hidden",
              }}
            >
              {item.userImage ? (
                <img
                  src={item.userImage}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <TeamOutlined style={{ fontSize: 14, color: "#3CB371" }} />
              )}
            </div>
            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text ellipsis style={{ fontSize: 13, color: "#1A1A2E" }}>
                <strong>{item.userName}</strong>{" "}
                {item.action === "created" ? "created" : "edited"}{" "}
                <span style={{ color: "#3CB371" }}>{item.flowName}</span>
              </Text>
            </div>
            {/* Time */}
            <Text style={{ fontSize: 11, color: "#BFBFBF", flexShrink: 0 }}>
              {timeAgo(item.timestamp)}
            </Text>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────── Greeting ────────

function Greeting({ userName }: { userName: string | null }) {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const firstName = userName?.split(" ")[0] || "there";

  // Avoid hydration mismatch: render neutral text on server, time-aware on client
  let greeting = "Welcome";
  let dateStr = "";
  if (mounted) {
    const hour = new Date().getHours();
    greeting =
      hour < 12
        ? "Good morning"
        : hour < 17
          ? "Good afternoon"
          : "Good evening";
    dateStr = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div style={{ marginBottom: isMobile ? 16 : 20, padding: isMobile ? "0 16px" : 0 }}>
      <h1
        style={{
          fontSize: isMobile ? 20 : 26,
          fontWeight: 700,
          color: "#1A1A2E",
          margin: 0,
          fontFamily: "Inter, sans-serif",
        }}
      >
        {greeting}, {firstName}
      </h1>
      {dateStr && (
        <Text style={{ fontSize: 13, color: "#8C8C8C" }}>{dateStr}</Text>
      )}
    </div>
  );
}

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
      message.success(
        credits
          ? `${credits} AI credits added to your account!`
          : "AI credits added to your account!",
      );
      window.dispatchEvent(new CustomEvent("aiCreditsChanged"));
      window.history.replaceState({}, "", "/dashboard");
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
      <Greeting userName={user?.name} />
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
      <KPICards stats={stats} loading={loading} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
          gap: 16,
          marginBottom: isMobile ? 20 : 28,
        }}
      >
        <div style={{ gridColumn: isMobile ? "1" : "1 / 3" }}>
          <ActivityChart activity={activity} loading={loading} />
        </div>
        <SubscriptionWidget />
      </div>
      <RecentFlowsSection flows={recentFlows} loading={loading} />
      <TeamActivityFeed activity={teamActivity} loading={loading} />
    </div>
  );
}
