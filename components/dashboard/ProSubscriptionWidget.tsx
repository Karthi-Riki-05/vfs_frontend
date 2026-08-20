"use client";
import { Skeleton } from "antd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAiBilling } from "@/context/AiBillingContext";
import { useIsMobile } from "@/hooks/useMediaQuery";

export default function ProSubscriptionWidget() {
  const { activeOption, loading } = useAiBilling();
  const isMobile = useIsMobile();
  const planCredits = activeOption?.aiCredits?.planCredits ?? 0;
  const addonCredits = activeOption?.aiCredits?.addonCredits ?? 0;
  const total = planCredits + addonCredits;
  // bug-143: Pro grants 50 credits ONCE (lifetime, never refills) — the old
  // 100 made the bar read half-used at a full balance. The real per-user
  // denominator is the backend's planLimitFor() (seat-aware for teams); it is
  // returned by getBalance but not yet by the billing-options endpoints this
  // widget reads, so a team context still under-reports here.
  const planLimit = 50;

  const used = Math.max(0, Math.min(planLimit, planLimit - planCredits));
  const pct = planLimit > 0 ? Math.min(100, (used / planLimit) * 100) : 0;
  const barColor = pct > 90 ? "#FF4D4F" : pct > 70 ? "#FA8C16" : "#3CB371";

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
        <Skeleton active paragraph={{ rows: 3 }} />
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        border: "1px solid #F0F0F0",
        padding: isMobile ? "16px" : "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 0,
        width: "100%",
        boxSizing: "border-box",
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
        <span
          style={{
            fontSize: 12,
            color: "#8C8C8C",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          AI CREDITS
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "2px 10px",
            borderRadius: 999,
            background: "#F0FFF4",
            color: "#3CB371",
          }}
        >
          Pro
        </span>
      </div>

      {/* Credit count */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 12, color: "#8C8C8C" }}>
          AI Diagram Credits
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#1A1A2E",
                cursor: "default",
              }}
            >
              {total} credits
            </span>
          </TooltipTrigger>
          <TooltipContent className="tw">
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>
              <div>Plan credits: {planCredits}</div>
              <div>Addon credits: {addonCredits}</div>
              <div>Total: {total}</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Progress bar */}
      <div
        style={{
          width: "100%",
          background: "#F5F5F5",
          borderRadius: 999,
          height: 6,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            height: 6,
            borderRadius: 999,
            transition: "width 0.6s ease",
            width: `${pct}%`,
            background: barColor,
          }}
        />
      </div>

      {/* Rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Row label="AI Chat" value="Unlimited" />
        <Row label="Plan" value="Pro" />
      </div>

      <button
        onClick={() => (window.location.href = "/dashboard/subscription")}
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
          background: "#3CB371",
        }}
      >
        Manage Plan
      </button>
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
