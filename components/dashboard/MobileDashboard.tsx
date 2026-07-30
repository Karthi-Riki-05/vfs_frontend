"use client";

import React from "react";
import { TeamActivityFeed } from "@/components/dashboard/TeamActivityFeed";

// Design tokens from DESIGN.md (new_design)
const SHADOW_CARD =
  "0 1px 2px rgba(16,40,32,0.04), 0 8px 24px -8px rgba(16,40,32,0.08)";
const SHADOW_FAB = "0 10px 24px -6px rgba(31,125,94,0.45)";
const TEXT = "#1F2937";
const TEXT_SECONDARY = "#6B7280";
const BORDER = "#E5EBE8";
const GREEN = "#34A881";
const GREEN_DEEP = "#1F7D5E";
const GREEN_TINT = "#E7F6F0";
const BLUE_BAR = "#93c5fd";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.8,
  color: TEXT_SECONDARY,
};

const cardStyle: React.CSSProperties = {
  background: "#FFFFFF",
  borderRadius: 16,
  padding: 12,
  border: `1px solid ${BORDER}`,
  boxShadow: SHADOW_CARD,
};

interface MobileDashboardProps {
  variant: "pro" | "team";
  userName?: string | null;
  stats: any;
  activity: Array<{ label: string; created: number; edited: number }>;
  recentFlows: Array<{
    id: string;
    name: string;
    thumbnail: string | null;
    updatedAt: string;
  }>;
  teamActivity?: any[];
  loading: boolean;
  proFlows?: any;
  isUnlimited?: boolean;
  aiCredits?: number;
  onBuyMoreFlows?: () => void;
  onManagePlan?: () => void;
  onViewAllFlows: () => void;
  onOpenFlow: (id: string) => void;
}

export function MobileDashboard({
  variant,
  userName,
  stats,
  activity,
  recentFlows,
  teamActivity = [],
  loading,
  proFlows,
  isUnlimited = false,
  aiCredits = 0,
  onBuyMoreFlows,
  onManagePlan,
  onViewAllFlows,
  onOpenFlow,
}: MobileDashboardProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const firstName = userName?.split(" ")[0] || "there";
  const hour = mounted ? new Date().getHours() : 12;
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const today = mounted
    ? new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const isLimited = !isUnlimited && proFlows?.max > 0;
  const usagePercent = isLimited
    ? Math.min(100, Math.round((proFlows.used / proFlows.max) * 100))
    : 0;

  const maxActivity = Math.max(
    1,
    ...activity.map((d) => Math.max(d.created, d.edited)),
  );

  const kpis =
    variant === "pro"
      ? [
          { label: "Total Flows", icon: "📄", value: stats?.totalFlows ?? 0 },
          {
            label: "Edited Month",
            icon: "✏️",
            value: stats?.editedThisMonth ?? 0,
          },
          { label: "Shared Flows", icon: "🔗", value: stats?.sharedFlows ?? 0 },
          { label: "AI Credits", icon: "⚡", value: aiCredits, green: true },
        ]
      : [
          { label: "Total Flows", icon: "📄", value: stats?.totalFlows ?? 0 },
          {
            label: "Edited Month",
            icon: "✏️",
            value: stats?.editedThisMonth ?? 0,
          },
          { label: "Shared Flows", icon: "🔗", value: stats?.sharedFlows ?? 0 },
          {
            label: "Team Members",
            icon: "👥",
            value: stats?.teamMembers ?? 0,
            green: true,
          },
        ];

  return (
    <div
      style={{
        background: "#F5F7F6",
        paddingBottom: 100,
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: 12,
      }}
    >
      {/* SECTION 1 — Greeting */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: TEXT_SECONDARY }}>
          {greeting},
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: TEXT,
            lineHeight: 1.2,
          }}
        >
          {firstName}!
        </div>
        <div style={{ fontSize: 11, color: TEXT_SECONDARY, marginTop: 2 }}>
          {today}
        </div>
      </div>

      {/* SECTION 2 — Flow Usage Bar (only when usage data exists) */}
      {proFlows && (
        <div style={{ ...cardStyle, marginBottom: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <span style={sectionLabelStyle}>Flow Usage</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: TEXT }}>
              {isUnlimited
                ? "∞ Unlimited"
                : `${proFlows.used} / ${proFlows.max} flows used`}
            </span>
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 9999,
              background: BORDER,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: isUnlimited ? "100%" : `${usagePercent}%`,
                borderRadius: 9999,
                background: `linear-gradient(90deg, ${GREEN}, ${GREEN_DEEP})`,
              }}
            />
          </div>
          {!isUnlimited && onBuyMoreFlows && (
            <button
              onClick={onBuyMoreFlows}
              style={{
                marginTop: 12,
                width: "100%",
                height: 44,
                borderRadius: 9999,
                background: GREEN,
                border: "none",
                color: "#FFFFFF",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: SHADOW_FAB,
              }}
            >
              Buy More Flows
            </button>
          )}
        </div>
      )}

      {/* SECTION 3 — KPI Grid (2×2) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 12,
        }}
      >
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            style={{
              ...cardStyle,
              background: kpi.green ? GREEN_TINT : "#FFFFFF",
            }}
          >
            <div style={{ fontSize: 18 }}>{kpi.icon}</div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: TEXT,
                marginTop: 4,
                lineHeight: 1.1,
              }}
            >
              {loading ? "—" : kpi.value.toLocaleString()}
            </div>
            <div style={{ ...sectionLabelStyle, marginTop: 2 }}>
              {kpi.label}
            </div>
          </div>
        ))}
      </div>

      {/* SECTION 4 — Activity Chart */}
      <div style={{ ...cardStyle, marginBottom: 12 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <span style={sectionLabelStyle}>Flow Activity (Last 7 Days)</span>
          <span
            style={{
              display: "flex",
              gap: 8,
              fontSize: 9,
              color: TEXT_SECONDARY,
            }}
          >
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 3 }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: GREEN,
                }}
              />
              Created
            </span>
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 3 }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: BLUE_BAR,
                }}
              />
              Edited
            </span>
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 6,
            height: 72,
          }}
        >
          {activity.map((day) => (
            <div
              key={day.label}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                height: "100%",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  gap: 2,
                  flex: 1,
                }}
              >
                <div
                  style={{
                    width: 6,
                    borderRadius: 3,
                    background: GREEN,
                    height: `${Math.max(4, (day.created / maxActivity) * 100)}%`,
                  }}
                />
                <div
                  style={{
                    width: 6,
                    borderRadius: 3,
                    background: BLUE_BAR,
                    height: `${Math.max(4, (day.edited / maxActivity) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          {activity.map((day) => (
            <div
              key={day.label}
              style={{
                flex: 1,
                textAlign: "center",
                fontSize: 9,
                color: TEXT_SECONDARY,
              }}
            >
              {day.label}
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 5 — AI Credits Card (PRO only) */}
      {variant === "pro" && (
        <div
          style={{
            background: "linear-gradient(135deg, #f0faf5, #E7F6F0)",
            border: "1.5px solid #c6e8d5",
            borderRadius: 16,
            padding: 14,
            marginBottom: 12,
            boxShadow: SHADOW_CARD,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <span style={{ ...sectionLabelStyle, color: GREEN_DEEP }}>
              ⚡ AI Credits
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#FFFFFF",
                background: "linear-gradient(135deg, #FF9A30, #F59E0B)",
                borderRadius: 9999,
                padding: "2px 10px",
              }}
            >
              Pro
            </span>
          </div>
          {[
            {
              label: "AI Diagram Credits",
              value: loading ? "—" : `${aiCredits.toLocaleString()} remaining`,
            },
            { label: "AI Chat", value: "Unlimited" },
            { label: "Plan", value: "Pro ✓" },
          ].map((row) => (
            <div
              key={row.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
                fontSize: 12,
              }}
            >
              <span style={{ color: TEXT_SECONDARY, fontWeight: 500 }}>
                {row.label}
              </span>
              <span style={{ color: TEXT, fontWeight: 700 }}>{row.value}</span>
            </div>
          ))}
          {onManagePlan && (
            <button
              onClick={onManagePlan}
              style={{
                marginTop: 10,
                width: "100%",
                height: 42,
                borderRadius: 9999,
                background: GREEN,
                border: "none",
                color: "#FFFFFF",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: SHADOW_FAB,
              }}
            >
              Manage Plan
            </button>
          )}
        </div>
      )}

      {/* SECTION 6 — Recent Flows */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>
          Recent Flows
        </span>
        <button
          onClick={onViewAllFlows}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            fontSize: 12,
            fontWeight: 600,
            color: GREEN_DEEP,
            cursor: "pointer",
          }}
        >
          View All →
        </button>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginBottom: 12,
        }}
      >
        {recentFlows.length === 0 && !loading && (
          <div
            style={{
              ...cardStyle,
              borderRadius: 12,
              textAlign: "center",
              fontSize: 12,
              color: TEXT_SECONDARY,
            }}
          >
            No flows yet
          </div>
        )}
        {recentFlows.map((flow) => (
          <div
            key={flow.id}
            onClick={() => onOpenFlow(flow.id)}
            style={{
              background: "#FFFFFF",
              borderRadius: 12,
              padding: "10px 12px",
              border: `1px solid ${BORDER}`,
              boxShadow: SHADOW_CARD,
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 9,
                background: GREEN_TINT,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {flow.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={flow.thumbnail}
                  alt={flow.name}
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              ) : (
                <span style={{ fontSize: 16 }}>📄</span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: TEXT,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {flow.name}
              </div>
              <div
                style={{ fontSize: 10, color: TEXT_SECONDARY, marginTop: 2 }}
              >
                {timeAgo(flow.updatedAt)}
              </div>
            </div>
            <span style={{ fontSize: 18, color: TEXT_SECONDARY }}>›</span>
          </div>
        ))}
      </div>

      {/* SECTION 7 — Team Activity (TEAM only) */}
      {variant === "team" && (
        <TeamActivityFeed activity={teamActivity} loading={loading} />
      )}
    </div>
  );
}
