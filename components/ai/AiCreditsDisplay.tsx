"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Tooltip } from "antd";
import { ThunderboltFilled } from "@ant-design/icons";
import { aiApi } from "@/api/ai.api";
import { useAppContext } from "@/context/AppContext";

interface CreditBalance {
  planCredits: number;
  addonCredits: number;
  totalCredits: number;
  planResetsAt: string | null;
  source?: "self" | "team";
}

export default function AiCreditsDisplay({ compact = false }: { compact?: boolean }) {
  const { activeTeamId } = useAppContext();
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBalance = useCallback(async () => {
    try {
      const res = await aiApi.getCredits();
      const data = res.data?.data || res.data;
      setBalance(data);
    } catch {
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch whenever the workspace context changes — the same user can
  // see different balances in personal vs each team context.
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance, activeTeamId]);

  useEffect(() => {
    const handler = () => fetchBalance();
    window.addEventListener("aiCreditsChanged", handler);
    return () => window.removeEventListener("aiCreditsChanged", handler);
  }, [fetchBalance]);

  if (loading || !balance) {
    return null;
  }

  const total = balance.totalCredits;
  let color = "#3CB371";
  if (total < 5) color = "#FF4D4F";
  else if (total <= 10) color = "#FA8C16";

  const resetDate = balance.planResetsAt
    ? new Date(balance.planResetsAt).toLocaleDateString()
    : "—";

  const tooltipContent = (
    <div style={{ fontSize: 12, lineHeight: 1.6 }}>
      <div>Plan credits: {balance.planCredits}</div>
      <div>Addon credits: {balance.addonCredits}</div>
      <div>Resets: {resetDate}</div>
    </div>
  );

  return (
    <Tooltip title={tooltipContent} placement="bottom">
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: compact ? 4 : 6,
          padding: compact ? "4px 8px" : "4px 10px",
          borderRadius: 16,
          background: `${color}15`,
          border: `1px solid ${color}40`,
          fontSize: compact ? 12 : 13,
          fontWeight: 600,
          color,
          cursor: "default",
          userSelect: "none",
        }}
      >
        <ThunderboltFilled style={{ fontSize: compact ? 11 : 12 }} />
        <span>{compact ? total : `AI Credits: ${total}`}</span>
      </div>
    </Tooltip>
  );
}
