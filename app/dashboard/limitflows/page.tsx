"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowLeft, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { flowsApi } from "@/api/flows.api";
import { useAppContext } from "@/context/AppContext";
import { useLockState } from "@/hooks/useFlows";

import MiniFlow from "@/components/dashboard/MiniFlow";
import { BRAND_GREEN } from "@/lib/theme";

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

interface PickerFlow {
  id: string;
  name: string;
  thumbnail: string | null;
  updatedAt: string;
  createdAt: string;
}

export default function LimitFlowsPage() {
  const router = useRouter();
  const { hydrated } = useAppContext();
  const { lockState, fetchLockState } = useLockState();
  // Use appType from the backend response — avoids race with personalPlan refresh
  const resolvedAppType: "pro" | "team" = lockState.appType ?? "pro";

  const limit = lockState.totCount ?? (resolvedAppType === "pro" ? 10 : 50);

  const [flows, setFlows] = useState<PickerFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const fetchPicker = useCallback(async () => {
    setLoading(true);
    try {
      const res = await flowsApi.getFlowsForPicker();
      const list: PickerFlow[] = res.data?.data || res.data || [];
      setFlows(list);
      // Pre-select the most recent N flows (already sorted by updatedAt DESC)
      setSelected(new Set(list.slice(0, limit).map((f) => f.id)));
    } catch {
      toast.error("Failed to load flows");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchPicker();
  }, [fetchPicker]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= limit) {
          toast.error(`You can only keep ${limit} flows. Unselect one first.`);
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (selected.size === 0) {
      toast.error("Select at least 1 flow to keep.");
      return;
    }
    setSaving(true);
    try {
      await flowsApi.resolveOverLimit(resolvedAppType, Array.from(selected));
      await fetchLockState();
      toast.success(`${selected.size} flows unlocked successfully.`);
      router.push("/dashboard/flows");
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const overLimit = selected.size > limit;
  const atLimit = selected.size === limit;
  const countColor = overLimit
    ? "text-red-500"
    : atLimit
      ? "text-emerald-600"
      : "text-foreground";

  if (!hydrated) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/flows")}
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-border bg-secondary cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-foreground">
              Limit your flows
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Select {limit} flows to keep — the rest stay locked
            </p>
          </div>
          {/* Counter chip */}
          <div
            className={`flex items-center gap-1 px-3 h-8 rounded-full border text-sm font-bold transition-colors ${
              overLimit
                ? "border-red-300 bg-red-50 text-red-500"
                : atLimit
                  ? "border-emerald-300 bg-emerald-50 text-emerald-600"
                  : "border-border bg-secondary text-foreground"
            }`}
          >
            <span className={countColor}>{selected.size}</span>
            <span className="text-muted-foreground font-normal">/ {limit}</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-2xl mx-auto px-4 py-5">
        {/* Info banner */}
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 mb-5">
          <Lock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800 leading-relaxed">
            Your{" "}
            <span className="font-semibold">
              {resolvedAppType === "pro" ? "Pro" : "Team"}
            </span>{" "}
            plan allows <span className="font-semibold">{limit} flows</span>.
            The {flows.length - limit > 0 ? flows.length - limit : 0} unselected
            flows will remain locked. You can unlock them anytime by upgrading
            your plan.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-border border-t-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Loading your flows…</p>
          </div>
        ) : flows.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-sm">No flows found.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {flows.map((flow) => {
              const isSelected = selected.has(flow.id);
              const isDisabled = !isSelected && selected.size >= limit;
              return (
                <button
                  key={flow.id}
                  onClick={() => !isDisabled && toggle(flow.id)}
                  disabled={isDisabled}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all cursor-pointer appearance-none ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : isDisabled
                        ? "border-border bg-card cursor-not-allowed"
                        : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  {/* Thumbnail */}
                  <div
                    className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
                    style={{ background: `${BRAND_GREEN}14` }}
                  >
                    {flow.thumbnail ? (
                      <img
                        src={flow.thumbnail}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <MiniFlow color={BRAND_GREEN} />
                    )}
                    {!isSelected && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 rounded-xl">
                        <Lock className="w-5 h-5 text-white drop-shadow" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div
                    className={`flex-1 min-w-0 ${isDisabled ? "opacity-40" : ""}`}
                  >
                    <p className="font-semibold text-sm truncate text-foreground">
                      {flow.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      Edited {timeAgo(flow.updatedAt)}
                    </p>
                  </div>

                  {/* Checkbox */}
                  <div
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? "border-primary bg-primary"
                        : "border-border bg-background"
                    }`}
                  >
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-4 z-10">
        <div className="max-w-2xl mx-auto flex flex-col gap-2">
          {selected.size > 0 && selected.size < limit && (
            <p className="text-[11px] text-center text-amber-600 font-medium">
              {limit - selected.size} more flow
              {limit - selected.size !== 1 ? "s" : ""} can be selected
            </p>
          )}
          <button
            onClick={handleSave}
            disabled={saving || selected.size === 0 || overLimit}
            className="w-full h-12 rounded-2xl font-bold text-sm text-white border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            style={{ background: "#34A881" }}
          >
            {saving
              ? "Saving…"
              : `Unlock ${selected.size} selected flow${selected.size !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>

      {/* Bottom padding so content isn't hidden behind footer */}
      <div className="h-28" />
    </div>
  );
}
