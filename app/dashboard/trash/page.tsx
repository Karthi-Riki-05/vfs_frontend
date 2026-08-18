"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { confirmDialog } from "@/components/common/ConfirmDialog";
import { RotateCcw, Trash2, Workflow, AlertTriangle } from "lucide-react";
import api from "@/lib/axios";
import FlowCollection, { timeAgo } from "@/components/flows/FlowCollection";
import ViewToggle from "@/components/common/ViewToggle";
import { useFlowView } from "@/hooks/useFlowView";
import { useAppContext } from "@/context/AppContext";
import { onWorkspaceFlush } from "@/lib/workspaceCache";

// ─── Design tokens ───────────────────────────────────────────────────────────
const FLOW_COLORS = [
  "#006AA8",
  "#34A881",
  "#FF9A30",
  "#F85729",
  "#1F7D5E",
  "#6B7280",
];

function daysUntilPurge(deletedAt: string | null | undefined): number {
  if (!deletedAt) return 30;
  const deleted = new Date(deletedAt).getTime();
  if (isNaN(deleted)) return 30;
  const elapsedDays = (Date.now() - deleted) / 86400000;
  return Math.max(0, Math.ceil(30 - elapsedDays));
}

export default function TrashPage() {
  const { activeTeamId, hydrated } = useAppContext();
  const [flows, setFlows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Trash had no view toggle at all — list only — while every sibling page
  // offered both. It now follows the same shared preference.
  const [view, setView] = useFlowView("grid");

  // activeTeamId in deps → re-scopes + refetches the trash bucket on switch.
  // The X-Workspace-Context header is attached by the axios interceptor, so the
  // refetch automatically targets the newly active workspace.
  const fetchTrash = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/flows/trash");
      const d1 = res.data?.data || res.data || {};
      setFlows(d1.flows || (Array.isArray(d1) ? d1 : []));
    } catch {
      try {
        const res = await api.get("/flows?deleted=true");
        const d2 = res.data?.data || res.data || {};
        setFlows(d2.flows || (Array.isArray(d2) ? d2 : []));
      } catch {
        setFlows([]);
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTeamId]);

  useEffect(() => {
    // Wait for AppContext to hydrate so we don't fire once with teamId=null
    // and then again once localStorage is read.
    if (!hydrated) return;
    fetchTrash();
  }, [fetchTrash, hydrated]);
  // Empty the trash list immediately on workspace switch so the previous
  // bucket's deleted flows don't ghost-render before the in-place refetch.
  useEffect(() => onWorkspaceFlush(() => setFlows([])), []);

  const handleRestore = async (id: string) => {
    try {
      await api.post(`/flows/${id}/restore`);
      toast.success("Flow restored");
      setFlows((prev) => prev.filter((f) => f.id !== id));
    } catch {
      toast.error("Failed to restore flow");
    }
  };

  const handlePermanentDelete = (id: string) => {
    confirmDialog({
      title: "Permanently delete this flow?",
      content: "This action cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/flows/${id}/permanent`);
          toast.success("Flow permanently deleted");
          setFlows((prev) => prev.filter((f) => f.id !== id));
        } catch {
          toast.error("Failed to delete flow");
        }
      },
    });
  };

  const handleEmptyTrash = () => {
    confirmDialog({
      title: "Empty trash?",
      content:
        "All flows in the trash will be permanently deleted. This action cannot be undone.",
      confirmLabel: "Empty Trash",
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete("/flows/trash");
          toast.success("Trash emptied");
          setFlows([]);
        } catch {
          toast.error("Failed to empty trash");
        }
      },
    });
  };

  // ─── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="tw min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-5 pt-3">
          <div className="h-9 w-40 rounded-lg bg-card border border-border mb-4 animate-pulse" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[72px] rounded-2xl bg-card border border-border animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tw min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-5 pt-3 pb-24 max-[767px]:pb-0">
        {/* Header */}
        {/* Phones stack the header: the controls below are `shrink-0` and claim
            ~300px, which on a 412px screen left the title ~60px — the h1 (no
            truncate) overflowed and the toggle painted over it. */}
        <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[22px] sm:text-[28px] font-extrabold text-foreground leading-tight truncate">
              Trash
            </h1>
            <p className="text-[11px] sm:text-sm text-muted-foreground">
              {flows.length} {flows.length === 1 ? "item" : "items"} ·
              auto-delete after 30 days
            </p>
          </div>
          {flows.length > 0 && (
            <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-end">
              <ViewToggle view={view} onChange={setView} />
              <button
                onClick={handleEmptyTrash}
                className="h-9 max-lg:h-11 px-4 rounded-xl bg-[#FDE7E0] text-[#F85729] text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 border-0 appearance-none cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Empty Trash
              </button>
            </div>
          )}
        </div>

        {/* Warning banner */}
        {flows.length > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#FDE7E0] border border-[#F85729]/20 text-xs text-[#7a2710] mb-4">
            <AlertTriangle className="w-4 h-4 shrink-0 text-[#F85729]" />
            Items in Trash are permanently deleted after 30 days.
          </div>
        )}

        {/* Empty state */}
        {flows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-4xl mb-4">
              🗑️
            </div>
            <div className="text-base font-bold text-foreground mb-1">
              Trash is empty
            </div>
            <div className="text-sm text-muted-foreground">
              Deleted flows will appear here for 30 days
            </div>
          </div>
        ) : (
          <FlowCollection
            flows={flows}
            view={view}
            // Trash rows are not editable — clicking one does nothing rather
            // than opening a deleted flow in the editor.
            onOpen={() => {}}
            metaLabel={(flow) =>
              `Deleted ${timeAgo(flow.deletedAt || flow.updatedAt)} · ${daysUntilPurge(
                flow.deletedAt,
              )} ${daysUntilPurge(flow.deletedAt) === 1 ? "day" : "days"} left`
            }
            // Restore / Delete forever replace the ⋯ menu: none of the seven
            // standard options apply to a deleted flow.
            renderActions={(flow) => (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRestore(flow.id);
                  }}
                  title="Restore"
                  aria-label={`Restore ${flow?.name || "flow"}`}
                  className="w-8 h-8 rounded-lg bg-secondary text-[#1F7D5E] inline-flex items-center justify-center border-0 p-0 appearance-none cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePermanentDelete(flow.id);
                  }}
                  title="Delete permanently"
                  aria-label={`Delete ${flow?.name || "flow"} permanently`}
                  className="w-8 h-8 rounded-lg bg-[#fef2f2] text-[#F85729] inline-flex items-center justify-center border-0 p-0 appearance-none cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          />
        )}
      </div>
    </div>
  );
}
