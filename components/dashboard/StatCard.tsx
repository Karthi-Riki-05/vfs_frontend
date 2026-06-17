"use client";

import React from "react";

export type StatCardTone = "primary" | "blue" | "orange" | "coral";

/**
 * Dashboard KPI atom: tinted icon tile + big value + label + trend line.
 * Shared by the Pro and Team dashboards. Pure presentational.
 */
export default function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  trend,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  tone: StatCardTone;
  trend: string;
}) {
  const tones: Record<StatCardTone, string> = {
    primary: "bg-secondary text-primary",
    blue: "bg-[#E2EEF8] text-[#006AA8]",
    orange: "bg-[#FFF2E2] text-[#FF9A30]",
    coral: "bg-[#FDE7E0] text-[#F85729]",
  };
  return (
    <div className="rounded-2xl bg-card p-4 border border-border shadow-card">
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center ${tones[tone]}`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="mt-3 text-2xl font-extrabold tracking-tight text-foreground">
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-[10px] font-semibold text-primary mt-1">{trend}</div>
    </div>
  );
}
