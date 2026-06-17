"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Modal, message } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { RotateCcw, Trash2, Workflow, AlertTriangle } from "lucide-react";
import api from "@/lib/axios";
import { timeAgo } from "@/lib/flowUtils";
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

  // activeTeamId in deps → re-scopes + refetches the trash bucket on switch.
  // The X-Team-Context header is attached by the axios interceptor, so the
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
      message.success("Flow restored");
      setFlows((prev) => prev.filter((f) => f.id !== id));
    } catch {
      message.error("Failed to restore flow");
    }
  };

  const handlePermanentDelete = (id: string) => {
    Modal.confirm({
      title: "Permanently delete this flow?",
      icon: <ExclamationCircleOutlined />,
      content: "This action cannot be undone.",
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await api.delete(`/flows/${id}/permanent`);
          message.success("Flow permanently deleted");
          setFlows((prev) => prev.filter((f) => f.id !== id));
        } catch {
          message.error("Failed to delete flow");
        }
      },
    });
  };

  const handleEmptyTrash = () => {
    Modal.confirm({
      title: "Empty trash?",
      icon: <ExclamationCircleOutlined />,
      content:
        "All flows in the trash will be permanently deleted. This action cannot be undone.",
      okText: "Empty Trash",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await api.delete("/flows/trash");
          message.success("Trash emptied");
          setFlows([]);
        } catch {
          message.error("Failed to empty trash");
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
      <div className="max-w-4xl mx-auto px-5 pt-3 pb-24">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h1 className="text-[22px] sm:text-[28px] font-extrabold text-foreground leading-tight">
              Trash
            </h1>
            <p className="text-[11px] sm:text-sm text-muted-foreground">
              {flows.length} {flows.length === 1 ? "item" : "items"} ·
              auto-delete after 30 days
            </p>
          </div>
          {flows.length > 0 && (
            <button
              onClick={handleEmptyTrash}
              className="h-9 px-4 rounded-xl bg-[#FDE7E0] text-[#F85729] text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 border-0 appearance-none cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Empty Trash
            </button>
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
          flows.map((flow: any, index: number) => {
            const color = FLOW_COLORS[index % FLOW_COLORS.length];
            const daysLeft = daysUntilPurge(flow.deletedAt);
            return (
              <div
                key={flow.id}
                className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border mb-2 opacity-90"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ background: `${color}1a` }}
                >
                  {flow.thumbnail ? (
                    <img
                      src={flow.thumbnail}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Workflow className="w-5 h-5" style={{ color }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">
                    {flow.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Deleted {timeAgo(flow.deletedAt || flow.updatedAt)}
                  </div>
                  <div className="text-[10px] font-semibold text-[#F85729]">
                    Deletes permanently in {daysLeft}{" "}
                    {daysLeft === 1 ? "day" : "days"}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleRestore(flow.id)}
                    title="Restore"
                    className="h-9 px-3 rounded-xl bg-secondary text-[#1F7D5E] text-xs font-bold inline-flex items-center gap-1 border-0 appearance-none cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Restore
                  </button>
                  <button
                    onClick={() => handlePermanentDelete(flow.id)}
                    title="Delete permanently"
                    className="w-9 h-9 rounded-xl bg-[#fef2f2] text-[#F85729] inline-flex items-center justify-center border-0 appearance-none cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
