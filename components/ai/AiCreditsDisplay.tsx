"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThunderboltFilled } from "@ant-design/icons";
import { useAiCredits } from "@/hooks/useAiCredits";
import { useAiBilling } from "@/context/AiBillingContext";

interface CreditBalance {
  planCredits: number;
  addonCredits: number;
  totalCredits: number;
  planResetsAt: string | null;
  source?: "self" | "team";
}

export default function AiCreditsDisplay({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { activeBillingTeamId } = useAiBilling();

  // OPT-3: the fetch lives in the shared store. `activeBillingTeamId` still
  // matters — the same user sees a different balance per billing profile — but
  // the store already invalidates on AI_BILLING_EVENT, so this component no
  // longer needs its own request to follow the switch.
  const {
    data: balance,
    loading,
    reload,
  } = useAiCredits() as {
    data: CreditBalance | null;
    loading: boolean;
    reload: () => void;
  };
  const fetchBalance = useCallback(() => reload(), [reload]);

  // Re-fetch whenever the AI-billing context changes — the same user can see
  // different balances for personal vs each team's shared credit pool.
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance, activeBillingTeamId]);

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
    <Tooltip>
      <TooltipTrigger asChild>
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
          {/* "N credits" in both modes so the editor pill reads the same as
              the AI chat panel's pill. */}
          <span>{`${total} credits`}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent className="tw" side="bottom">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
}
