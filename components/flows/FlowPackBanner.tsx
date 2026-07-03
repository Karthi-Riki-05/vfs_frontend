"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Zap, Clock, TrendingUp } from "lucide-react";
import { usePackStatus } from "@/hooks/usePackStatus";
import FlowPickerModal from "./FlowPickerModal";

// ── Shared atoms ──────────────────────────────────────────────────────────────

function BannerCard({
  children,
  bg,
  borderColor,
  sticky,
}: {
  children: React.ReactNode;
  bg: string;
  borderColor: string;
  sticky?: boolean;
}) {
  return (
    <div
      className={`tw rounded-2xl p-4 mb-5 flex items-start justify-between gap-3 flex-wrap shadow-[var(--shadow-card)] ${sticky ? "sticky top-0 z-10" : ""}`}
      style={{ background: bg, border: `1px solid ${borderColor}` }}
    >
      {children}
    </div>
  );
}

function IconChip({
  icon: Icon,
  color,
}: {
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div
      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
      style={{ background: `${color}18` }}
    >
      <Icon className="w-4 h-4" style={{ color }} />
    </div>
  );
}

function Btn({
  children,
  onClick,
  variant = "solid",
  color,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "solid" | "outline";
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className="h-9 px-4 rounded-xl text-sm font-semibold shrink-0 appearance-none cursor-pointer border-0"
      style={
        variant === "solid"
          ? { background: color, color: "#fff" }
          : {
              background: "transparent",
              border: `1.5px solid ${color}`,
              color,
            }
      }
    >
      {children}
    </button>
  );
}

// ── Banner ────────────────────────────────────────────────────────────────────

export default function FlowPackBanner() {
  const router = useRouter();
  const { status, refresh, isTeamApp, effectiveLimit, effectiveUnlimited } =
    usePackStatus();
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!status) return null;

  // ── Picker phase (Pro) ──────────────────────────────────────────────────────
  if (status.isInPickerPhase) {
    return (
      <>
        <BannerCard bg="#FFF1F0" borderColor="#FFA39E" sticky>
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <IconChip icon={Zap} color="#F85729" />
            <div>
              <div className="text-sm font-bold text-[#CF1322]">
                Action required: select 10 flows to keep
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Your flow pack expired and you have {status.flowCount} flows.
                Pick 10 — the rest will move to trash for 30 days.
              </div>
            </div>
          </div>
          <Btn color="#F85729" onClick={() => setPickerOpen(true)}>
            Open Flow Selector
          </Btn>
        </BannerCard>
        <FlowPickerModal
          open={pickerOpen}
          maxKeep={10}
          pickerType="pro"
          onConfirm={() => {
            setPickerOpen(false);
            refresh();
            router.refresh();
          }}
        />
      </>
    );
  }

  // ── Picker phase (Team) ─────────────────────────────────────────────────────
  if (status.isInTeamPickerPhase) {
    return (
      <>
        <BannerCard bg="#FFF1F0" borderColor="#FFA39E" sticky>
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <IconChip icon={Zap} color="#F85729" />
            <div>
              <div className="text-sm font-bold text-[#CF1322]">
                Team subscription expired — select 50 flows to keep
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                You have {status.flowCount} team flows. Pick 50 — the rest will
                move to trash for 30 days.
              </div>
            </div>
          </div>
          <Btn color="#F85729" onClick={() => setPickerOpen(true)}>
            Open Flow Selector
          </Btn>
        </BannerCard>
        <FlowPickerModal
          open={pickerOpen}
          maxKeep={50}
          pickerType="team"
          onConfirm={() => {
            setPickerOpen(false);
            refresh();
            router.refresh();
          }}
        />
      </>
    );
  }

  // ── Grace period ────────────────────────────────────────────────────────────
  if (status.status === "grace" && status.gracePeriodEndsAt) {
    const days = Math.max(
      0,
      Math.ceil(
        (new Date(status.gracePeriodEndsAt).getTime() - Date.now()) /
          (24 * 3600 * 1000),
      ),
    );
    return (
      <BannerCard bg="#FFF7E6" borderColor="#FFD591">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <IconChip icon={AlertTriangle} color="#FF9A30" />
          <div>
            <div className="text-sm font-bold text-[#D46B08]">
              Flow pack expired — {days} day{days === 1 ? "" : "s"} left to
              renew
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Renew now to avoid the flow picker step.
            </div>
          </div>
        </div>
        <Btn
          color="#D46B08"
          onClick={() => router.push("/dashboard/subscription")}
        >
          Renew Now
        </Btn>
      </BannerCard>
    );
  }

  // ── Expiring soon (≤7 days) ─────────────────────────────────────────────────
  if (
    status.status === "active" &&
    status.daysUntilExpiry !== null &&
    status.daysUntilExpiry <= 7 &&
    status.daysUntilExpiry >= 0
  ) {
    const label = status.isUnlimited ? "Unlimited Flows" : "50 Flows";
    return (
      <BannerCard bg="#FFFBE6" borderColor="#FFE58F">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <IconChip icon={Clock} color="#FAAD14" />
          <div>
            <div className="text-sm font-bold text-[#AD6800]">
              Your {label} pack expires in {status.daysUntilExpiry} day
              {status.daysUntilExpiry === 1 ? "" : "s"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Renew to keep all flows beyond the {effectiveLimit}-flow free
              limit.
            </div>
          </div>
        </div>
        <Btn
          color="#FAAD14"
          onClick={() => router.push("/dashboard/subscription")}
        >
          Renew Now
        </Btn>
      </BannerCard>
    );
  }

  // ── At limit, no pack ───────────────────────────────────────────────────────
  if (
    !status.activePackId &&
    !effectiveUnlimited &&
    effectiveLimit > 0 &&
    status.flowCount >= effectiveLimit
  ) {
    return (
      <BannerCard bg="#E6F4FF" borderColor="#91CAFF">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <IconChip icon={TrendingUp} color="#006AA8" />
          <div className="text-sm font-semibold text-[#0050B3] mt-1">
            You've reached your {effectiveLimit}-flow limit.
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isTeamApp ? (
            <Btn
              color="#006AA8"
              onClick={() => router.push("/dashboard/subscription")}
            >
              Upgrade to Team — unlimited flows
            </Btn>
          ) : (
            <>
              <Btn
                color="#006AA8"
                onClick={() => router.push("/dashboard/subscription")}
              >
                Subscribe Standard — 100 Flows
              </Btn>
              <Btn
                color="#006AA8"
                variant="outline"
                onClick={() => router.push("/dashboard/subscription")}
              >
                Subscribe Unlimited flows
              </Btn>
            </>
          )}
        </div>
      </BannerCard>
    );
  }

  return null;
}
