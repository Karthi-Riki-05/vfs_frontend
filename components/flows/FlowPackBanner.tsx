"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "antd";
import { usePackStatus } from "@/hooks/usePackStatus";
import FlowPickerModal from "./FlowPickerModal";

// Banner above the flows list that mirrors the pack lifecycle:
//   • >7 days remaining          → no banner (clean UI)
//   • ≤7 days remaining          → yellow renew nudge
//   • expired, in 3-day grace    → orange urgent renew + picker option
//   • picker phase active        → red sticky "select 10 flows" CTA
//   • no pack, on free 10-limit  → blue upsell when at the limit
export default function FlowPackBanner() {
  const router = useRouter();
  const { status, refresh } = usePackStatus();
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!status) return null;

  // Picker phase = required action — sticky red banner.
  if (status.isInPickerPhase) {
    return (
      <>
        <div
          style={{
            background: "#FFF1F0",
            border: "1px solid #FFA39E",
            borderRadius: 8,
            padding: "14px 18px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            position: "sticky",
            top: 0,
            zIndex: 5,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, color: "#cf1322" }}>
              Action required: select 10 flows to keep
            </div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
              Your flow pack expired and you have {status.flowCount} flows. Pick
              10 — the rest will move to trash for 30 days.
            </div>
          </div>
          <Button type="primary" danger onClick={() => setPickerOpen(true)}>
            Open Flow Selector
          </Button>
        </div>
        <FlowPickerModal
          open={pickerOpen}
          onConfirm={() => {
            setPickerOpen(false);
            refresh();
            // Reload page to refresh flows list with the new selection.
            router.refresh();
          }}
        />
      </>
    );
  }

  // Grace period.
  if (status.status === "grace" && status.gracePeriodEndsAt) {
    const days = Math.max(
      0,
      Math.ceil(
        (new Date(status.gracePeriodEndsAt).getTime() - Date.now()) /
          (24 * 3600 * 1000),
      ),
    );
    return (
      <div
        style={{
          background: "#FFF7E6",
          border: "1px solid #FFD591",
          borderRadius: 8,
          padding: "14px 18px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontWeight: 700, color: "#D46B08" }}>
            🔴 Flow pack expired — {days} day{days === 1 ? "" : "s"} left to
            renew
          </div>
          <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
            Renew now to avoid the flow picker step.
          </div>
        </div>
        <Button
          type="primary"
          onClick={() => router.push("/dashboard/subscription")}
          style={{ background: "#D46B08", borderColor: "#D46B08" }}
        >
          Renew Now
        </Button>
      </div>
    );
  }

  // Active pack, ≤7 days remaining.
  if (
    status.status === "active" &&
    status.daysUntilExpiry !== null &&
    status.daysUntilExpiry <= 7 &&
    status.daysUntilExpiry >= 0
  ) {
    const label = status.isUnlimited ? "Unlimited Flows" : "50 Flows";
    return (
      <div
        style={{
          background: "#FFFBE6",
          border: "1px solid #FFE58F",
          borderRadius: 8,
          padding: "14px 18px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontWeight: 700, color: "#AD6800" }}>
            ⚠️ Your {label} pack expires in {status.daysUntilExpiry} day
            {status.daysUntilExpiry === 1 ? "" : "s"}
          </div>
          <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
            Renew to keep all flows beyond the 10-flow free limit.
          </div>
        </div>
        <Button
          type="primary"
          onClick={() => router.push("/dashboard/subscription")}
          style={{ background: "#FAAD14", borderColor: "#FAAD14" }}
        >
          Renew Now
        </Button>
      </div>
    );
  }

  // No pack + at-limit upsell.
  if (
    !status.activePackId &&
    !status.isUnlimited &&
    status.flowLimit > 0 &&
    status.flowCount >= status.flowLimit
  ) {
    return (
      <div
        style={{
          background: "#E6F7FF",
          border: "1px solid #91D5FF",
          borderRadius: 8,
          padding: "14px 18px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontWeight: 600, color: "#0050B3" }}>
          You've reached your {status.flowLimit}-flow limit.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            type="primary"
            onClick={() => router.push("/dashboard/subscription")}
          >
            Subscribe 50 Flows — $5/mo
          </Button>
          <Button onClick={() => router.push("/dashboard/subscription")}>
            Subscribe Unlimited — $10/mo
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
