"use client";
import { useEffect, useState } from "react";
import { Skeleton, Typography } from "antd";
import { aiApi } from "@/api/ai.api";

const { Text } = Typography;

interface AiCredits {
  planCredits: number;
  addonCredits: number;
  totalCredits: number;
  planResetsAt: string | null;
  appContext?: "free" | "pro" | "team";
}

// Matches backend PLAN_CREDITS (aiCredit.service.js)
const PLAN_LIMITS: Record<string, number> = { free: 20, pro: 100, team: 300 };

interface SubInfo {
  plan: string;
  is_active: boolean;
  is_pro?: boolean;
  expires_at: string | null;
  billing_period_days?: number;
  messages_used?: number;
  messages_limit?: number;
  storage_used_mb?: number;
  storage_limit_mb?: number;
  notifications_count?: number;
}

export default function SubscriptionWidget() {
  const [sub, setSub] = useState<SubInfo | null>(null);
  const [aiCredits, setAiCredits] = useState<AiCredits | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCredits = () => {
    aiApi
      .getCredits()
      .then((res) => {
        const d = res.data?.data || res.data;
        if (d) setAiCredits(d);
      })
      .catch(() => setAiCredits(null));
  };

  useEffect(() => {
    fetch("/api/subscription/info")
      .then((r) => r.json())
      .then((data) => setSub(data.data || data))
      .catch(() => setSub({ plan: "Free", is_active: true, expires_at: null }))
      .finally(() => setLoading(false));
    fetchCredits();
  }, []);

  useEffect(() => {
    const handler = () => fetchCredits();
    window.addEventListener("aiCreditsChanged", handler);
    return () => window.removeEventListener("aiCreditsChanged", handler);
  }, []);

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
  if (!sub) return null;

  const expiryDate = sub.expires_at ? new Date(sub.expires_at) : null;
  const daysLeft = expiryDate
    ? Math.ceil((expiryDate.getTime() - Date.now()) / 86400000)
    : null;

  const status = (() => {
    if (!sub.is_active || (daysLeft !== null && daysLeft <= 0))
      return {
        label: "Expired",
        color: "#FF4D4F",
        bg: "#FFF1F0",
        border: "#FFA39E",
      };
    if (daysLeft !== null && daysLeft <= 7)
      return {
        label: "Expiring Soon",
        color: "#FA8C16",
        bg: "#FFF7E6",
        border: "#FFD591",
        pulse: true,
      };
    if (daysLeft !== null && daysLeft <= 30)
      return {
        label: "Active",
        color: "#1890FF",
        bg: "#E6F7FF",
        border: "#91D5FF",
      };
    return {
      label: "Active",
      color: "#3CB371",
      bg: "#F0FFF4",
      border: "#B7EB8F",
    };
  })();

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        border: "1px solid #F0F0F0",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
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
          SUBSCRIPTION
        </Text>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "2px 10px",
            borderRadius: 999,
            background: status.bg,
            color: status.color,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {status.pulse && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: status.color,
                animation: "subPulse 1.5s ease infinite",
              }}
            />
          )}
          {status.label}
        </span>
      </div>

      {/* Rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Row
          label="Plan"
          value={
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {sub.plan || "Free"}
              {sub.is_pro && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    background: "#FEF3C7",
                    color: "#D97706",
                    padding: "1px 6px",
                    borderRadius: 999,
                  }}
                >
                  PRO
                </span>
              )}
            </span>
          }
        />

        {expiryDate && (
          <Row
            label="Expires"
            value={
              <span
                style={{
                  color:
                    daysLeft !== null && daysLeft <= 7
                      ? "#FF4D4F"
                      : daysLeft !== null && daysLeft <= 30
                        ? "#FA8C16"
                        : undefined,
                  fontWeight:
                    daysLeft !== null && daysLeft <= 30 ? 600 : undefined,
                }}
              >
                {expiryDate.toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
                {daysLeft !== null && (
                  <span
                    style={{
                      marginLeft: 4,
                      fontWeight: 400,
                      color: "#8C8C8C",
                      fontSize: 11,
                    }}
                  >
                    {daysLeft > 0 ? `(${daysLeft}d left)` : "(Expired)"}
                  </span>
                )}
              </span>
            }
          />
        )}

        {aiCredits &&
          (() => {
            // Derive the user's plan tier from the balance's appContext
            // (falls back to is_pro so free + legacy pro records still work).
            const tier = aiCredits.appContext || (sub.is_pro ? "pro" : "free");
            const planLimit = PLAN_LIMITS[tier] ?? PLAN_LIMITS.free;
            // If planCredits > planLimit (admin grant / extra top-up),
            // cap "used" at 0 so the progress bar doesn't break.
            const used = Math.max(
              0,
              Math.min(planLimit, planLimit - aiCredits.planCredits),
            );
            const pct =
              planLimit > 0 ? Math.min(100, (used / planLimit) * 100) : 0;
            // Show "{planCredits} credits" (no denominator) when balance
            // exceeds the normal plan cap — prevents the nonsensical
            // "296 / 100" display.
            const exceedsCap = aiCredits.planCredits > planLimit;
            return (
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ fontSize: 12, color: "#8C8C8C" }}>
                    AI Diagram Credits
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#1A1A2E",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {exceedsCap
                      ? `${aiCredits.planCredits} credits`
                      : `${aiCredits.planCredits} / ${planLimit}`}
                    {aiCredits.addonCredits > 0 && (
                      <span style={{ fontSize: 10, color: "#3CB371" }}>
                        +{aiCredits.addonCredits} addon
                      </span>
                    )}
                    {!sub.is_pro && (
                      <a
                        href="/upgrade-pro"
                        style={{
                          fontSize: 10,
                          color: "#3CB371",
                          marginLeft: 4,
                          textDecoration: "none",
                          fontWeight: 600,
                        }}
                      >
                        Upgrade ↗
                      </a>
                    )}
                  </span>
                </div>
                <div
                  style={{
                    marginTop: 6,
                    width: "100%",
                    background: "#F5F5F5",
                    borderRadius: 999,
                    height: 6,
                  }}
                >
                  <div
                    style={{
                      height: 6,
                      borderRadius: 999,
                      transition: "width 0.6s ease",
                      width: `${pct}%`,
                      background:
                        pct > 90 ? "#FF4D4F" : pct > 70 ? "#FA8C16" : "#3CB371",
                    }}
                  />
                </div>
              </div>
            );
          })()}
        <Row label="AI Chat" value="Unlimited" />

        {sub.storage_used_mb !== undefined && (
          <Row
            label="Storage"
            value={`${sub.storage_used_mb} MB / ${sub.storage_limit_mb ?? "\u221E"} MB`}
          />
        )}

        {sub.notifications_count !== undefined &&
          sub.notifications_count > 0 && (
            <Row
              label="Notifications"
              value={`${sub.notifications_count} unread`}
            />
          )}
      </div>

      {/* CTA */}
      {((daysLeft !== null && daysLeft <= 30) || !sub.is_active) && (
        <button
          onClick={() => {
            window.location.href = "/dashboard/subscription";
          }}
          style={{
            marginTop: 16,
            width: "100%",
            padding: "10px 0",
            fontSize: 12,
            fontWeight: 700,
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            color: "#fff",
            background:
              !sub.is_active || (daysLeft !== null && daysLeft <= 0)
                ? "#FF4D4F"
                : daysLeft !== null && daysLeft <= 7
                  ? "#FA8C16"
                  : "#3CB371",
          }}
        >
          {!sub.is_active || (daysLeft !== null && daysLeft <= 0)
            ? "Renew Subscription"
            : daysLeft !== null && daysLeft <= 7
              ? "Renew Now"
              : "Manage Subscription"}
        </button>
      )}

      <style>{`
        @keyframes subPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <span style={{ fontSize: 12, color: "#8C8C8C" }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#1A1A2E" }}>
        {value}
      </span>
    </div>
  );
}
