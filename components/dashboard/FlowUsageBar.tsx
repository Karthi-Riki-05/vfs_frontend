"use client";

import { Zap } from "lucide-react";

const RESET = "appearance-none cursor-pointer outline-none border-0";

interface FlowUsageBarProps {
  proFlows: any;
  isUnlimited: boolean;
  onBuyMore: () => void;
}

export function FlowUsageBar({
  proFlows,
  isUnlimited,
  onBuyMore,
}: FlowUsageBarProps) {
  if (!proFlows) return null;

  const isLimited = !isUnlimited && proFlows.max > 0;
  const percent = isLimited
    ? Math.min(Math.round((proFlows.used / proFlows.max) * 100), 100)
    : 0;
  const isNearLimit = percent >= 80;
  const isFull = percent >= 100;

  return (
    <div className="tw">
      <div className="rounded-2xl bg-card border border-border p-4 mb-5 shadow-[var(--shadow-card)]">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-primary-deep" />
            <span className="text-[11px] font-bold uppercase tracking-wide text-primary-deep">
              Flow Usage
            </span>
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            {isUnlimited
              ? `${proFlows.used} used · Unlimited`
              : `${proFlows.used} / ${proFlows.max}`}
          </span>
        </div>

        {/* Progress bar */}
        {isLimited && (
          <div className="w-full h-2 rounded-full bg-secondary overflow-hidden mb-3">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${percent}%`,
                background: isFull
                  ? "#F85729"
                  : isNearLimit
                    ? "#FF9A30"
                    : "#34A881",
              }}
            />
          </div>
        )}

        {/* Buy more */}
        {!isUnlimited && (
          <button
            onClick={onBuyMore}
            className={`${RESET} w-full h-9 rounded-xl bg-primary text-white text-sm font-semibold`}
          >
            Buy More Flows
          </button>
        )}
      </div>
    </div>
  );
}
