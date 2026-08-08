"use client";

import React from "react";
import { Avatar, Spin } from "antd";
import {
  CheckOutlined,
  TeamOutlined,
  ThunderboltFilled,
} from "@ant-design/icons";
import { useAiBilling, type BillingOption } from "@/context/AiBillingContext";

// Account/team switcher rendered at the top of the profile dropdown. Selecting
// a row calls AiBillingContext.switchBilling(teamId), which re-scopes BOTH the
// billed AI-credit pool AND the workspace data: it flushes the workspace cache,
// sets the scoped X-Workspace-Context header, and fires vc:workspace-switch so
// flows/chat/dashboard follow the selection. DATA-LOSS-001 still holds — rows
// stay {ownerId, teamId}-bounded, so the bucket changes, not the owner bound.
// (Corrected: the "billing-only, data never changes" claim (TCS-C1) was false.)
export default function TeamContextSwitcher() {
  const { options, activeBillingTeamId, hasTeams, loading, switchBilling } =
    useAiBilling();

  // Nothing to switch between if the user belongs to no teams.
  if (!hasTeams && !loading) return null;

  return (
    <div style={{ padding: "8px 0 4px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 16px 6px",
        }}
      >
        <ThunderboltFilled style={{ color: "#3CB371", fontSize: 12 }} />
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.4,
            textTransform: "uppercase",
            color: "#8C8C8C",
          }}
        >
          Bill AI credits to
        </span>
      </div>

      {loading ? (
        <div style={{ padding: "8px 16px" }}>
          <Spin size="small" />
        </div>
      ) : (
        options.map((opt) => (
          <BillingRow
            key={opt.teamId || "personal"}
            opt={opt}
            active={opt.teamId === activeBillingTeamId}
            onSelect={() => switchBilling(opt.teamId)}
          />
        ))
      )}

      <div
        style={{ height: 1, background: "#F0F0F0", margin: "6px 0" }}
        aria-hidden
      />
    </div>
  );
}

function BillingRow({
  opt,
  active,
  onSelect,
}: {
  opt: BillingOption;
  active: boolean;
  onSelect: () => void;
}) {
  const isPersonal = opt.teamId === null;
  const remaining = opt.aiCredits?.total ?? null;
  const creditColor =
    remaining == null
      ? "#8C8C8C"
      : remaining > 10
        ? "#3CB371"
        : remaining > 5
          ? "#FA8C16"
          : "#FF4D4F";

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 16px",
        background: active ? "#F0FAF4" : "transparent",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        touchAction: "manipulation",
      }}
    >
      <Avatar
        size={32}
        style={{
          flexShrink: 0,
          background: isPersonal ? "#E6F7EE" : "#E6F0FA",
          color: isPersonal ? "#3CB371" : "#1677FF",
          fontWeight: 700,
        }}
      >
        {opt.avatar ||
          opt.label?.[0]?.toUpperCase() ||
          (isPersonal ? "U" : "T")}
      </Avatar>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#262626",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {opt.label}
          {!isPersonal && (
            <TeamOutlined
              style={{ marginLeft: 6, color: "#1677FF", fontSize: 11 }}
            />
          )}
        </div>
        {remaining != null && (
          <div style={{ fontSize: 11, color: creditColor, marginTop: 1 }}>
            {remaining} AI credits left
          </div>
        )}
      </div>

      {active && <CheckOutlined style={{ color: "#3CB371", flexShrink: 0 }} />}
    </button>
  );
}
