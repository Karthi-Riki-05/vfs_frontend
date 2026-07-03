"use client";

import React, { useState, useEffect, useCallback, type ReactNode } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  MoreHorizontal,
  Workflow,
  ChevronRight,
  List as ListIcon,
  LayoutGrid,
  Lock,
  X,
} from "lucide-react";
import api from "@/lib/axios";
import { useLockState } from "@/hooks/useFlows";
import MiniFlow from "@/components/dashboard/MiniFlow";
import { useAppContext } from "@/context/AppContext";
import { onWorkspaceFlush } from "@/lib/workspaceCache";
import { BRAND_GREEN } from "@/lib/theme";
import FlowMenuModal from "@/components/flows/FlowMenuModal";
import ShareFlowModal from "@/components/flows/ShareFlowModal";
import AssignProjectModal from "@/components/flows/AssignProjectModal";
import {
  ModalShell,
  ModalHeader,
  ModalFooter,
} from "@/components/common/Modal";
import { Field, FieldInput } from "@/components/common/Field";

// ─── Design tokens ───────────────────────────────────────────────────────────
const FLOW_COLORS = [
  "#34A881",
  "#006AA8",
  "#FF9A30",
  "#F85729",
  "#1F7D5E",
  "#6B7280",
];

const MOBILE_THUMB_GRADIENTS = [
  "linear-gradient(135deg, #E7F6F0 0%, #CFEDE0 100%)",
  "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)",
  "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)",
];

// ─── Date grouping helpers ────────────────────────────────────────────────────
type DateGroup = "Today" | "Yesterday" | "This Week" | "Earlier";
const DATE_GROUP_ORDER: DateGroup[] = [
  "Today",
  "Yesterday",
  "This Week",
  "Earlier",
];

function groupFlowsByDate(flows: any[]): Record<DateGroup, any[]> {
  const groups: Record<DateGroup, any[]> = {
    Today: [],
    Yesterday: [],
    "This Week": [],
    Earlier: [],
  };
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const startOfWeek = startOfToday - 6 * 24 * 60 * 60 * 1000;
  flows.forEach((f) => {
    const t = new Date(f.updatedAt).getTime();
    if (t >= startOfToday) groups.Today.push(f);
    else if (t >= startOfYesterday) groups.Yesterday.push(f);
    else if (t >= startOfWeek) groups["This Week"].push(f);
    else groups.Earlier.push(f);
  });
  return groups;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} mins ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Local atom components ────────────────────────────────────────────────────

function SearchBar({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 h-11 px-3 rounded-2xl bg-card border border-border mb-4">
      <Search className="w-4 h-4 text-muted-foreground" />
      <input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="flex-1 bg-transparent outline-none text-sm border-0 p-0 appearance-none"
      />
      <button
        type="button"
        aria-label="Filter"
        className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center bg-transparent border-0 p-0 appearance-none cursor-pointer"
      >
        <Filter className="w-3.5 h-3.5 text-primary" />
      </button>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mt-5 mb-2">
      {children}
    </div>
  );
}

function ViewToggleLocal({
  view,
  onChange,
}: {
  view: "list" | "grid";
  onChange: (v: "list" | "grid") => void;
}) {
  return (
    <div className="inline-flex p-1 rounded-xl bg-secondary">
      <button
        onClick={() => onChange("list")}
        aria-label="List view"
        aria-pressed={view === "list"}
        className={`w-9 h-8 rounded-lg flex items-center justify-center bg-transparent border-0 p-0 appearance-none cursor-pointer ${view === "list" ? "bg-card shadow-sm text-primary" : "text-muted-foreground"}`}
      >
        <ListIcon className="w-4 h-4" />
      </button>
      <button
        onClick={() => onChange("grid")}
        aria-label="Grid view"
        aria-pressed={view === "grid"}
        className={`w-9 h-8 rounded-lg flex items-center justify-center bg-transparent border-0 p-0 appearance-none cursor-pointer ${view === "grid" ? "bg-card shadow-sm text-primary" : "text-muted-foreground"}`}
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
    </div>
  );
}

function ListItem({
  title,
  subtitle,
  color,
  onClick,
  onMenu,
  locked,
}: {
  title: string;
  subtitle: string;
  color: string;
  onClick?: () => void;
  onMenu?: () => void;
  locked?: boolean;
}) {
  return (
    <div className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border mb-2 text-left">
      <button
        onClick={onClick}
        className="flex items-center gap-3 flex-1 min-w-0 text-left bg-transparent border-0 p-0 appearance-none cursor-pointer"
      >
        <div
          className="relative w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${color}1a` }}
        >
          <Workflow className="w-5 h-5" style={{ color }} />
          {locked && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
              <Lock className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{title}</div>
          <div className="text-[11px] text-muted-foreground truncate">
            {subtitle}
          </div>
        </div>
      </button>
      {onMenu ? (
        <button
          type="button"
          aria-label="More options"
          onClick={onMenu}
          className="w-9 h-9 rounded-lg hover:bg-secondary flex items-center justify-center bg-transparent border-0 p-0 appearance-none cursor-pointer"
        >
          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
        </button>
      ) : (
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function RecentsPage() {
  const router = useRouter();
  const { activeTeamId, hydrated } = useAppContext();
  const [flows, setFlows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "grid">("list");
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const { lockState } = useLockState();
  const isLocked = lockState.overLimitLocked;
  const [query, setQuery] = useState("");

  const [flowMenu, setFlowMenu] = useState<{ open: boolean; flow: any | null }>(
    {
      open: false,
      flow: null,
    },
  );
  const [shareModal, setShareModal] = useState<{
    open: boolean;
    flow: any | null;
  }>({
    open: false,
    flow: null,
  });
  const [assignModal, setAssignModal] = useState<{
    open: boolean;
    flowId: string | null;
    currentProjectId?: string | null;
  }>({ open: false, flowId: null });
  const [renameModal, setRenameModal] = useState<{
    open: boolean;
    id: string;
    name: string;
  }>({ open: false, id: "", name: "" });

  const fetchRecentFlows = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/flows");
      const d = response.data?.data || response.data || {};
      const allFlows = d.flows || (Array.isArray(d) ? d : []);
      const sorted = [...allFlows]
        .sort(
          (a: any, b: any) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        .slice(0, 15);
      setFlows(sorted);
    } catch {
      toast.error("Failed to load recent flows");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTeamId]);

  useEffect(() => {
    if (!hydrated) return;
    fetchRecentFlows();
  }, [fetchRecentFlows, hydrated]);

  useEffect(() => onWorkspaceFlush(() => setFlows([])), []);

  const handleEdit = (flow: any) => {
    const flowLocked = isLocked || !!flow?.markedForDowngrade;
    if (flowLocked) {
      setLockModalOpen(true);
      return;
    }
    window.open(`/dashboard/flows/${flow.id}`, "_blank");
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/flows/${id}`);
      setFlows((prev) => prev.filter((f) => f.id !== id));
      toast.success("Flow deleted");
    } catch {
      toast.error("Failed to delete flow");
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await api.post(`/flows/${id}/duplicate`);
      toast.success("Flow duplicated");
      fetchRecentFlows();
    } catch {
      toast.error("Failed to duplicate flow");
    }
  };

  const handleFavorite = async (id: string) => {
    try {
      const flow = flows.find((f) => f.id === id);
      const newState = !flow?.isFavorite;
      await api.put(`/flows/${id}`, { isFavorite: newState });
      setFlows((prev) =>
        prev.map((f) => (f.id === id ? { ...f, isFavorite: newState } : f)),
      );
    } catch {
      toast.error("Failed to update favorite");
    }
  };

  const handleRename = async () => {
    if (!renameModal.name.trim()) return;
    try {
      await api.put(`/flows/${renameModal.id}`, {
        name: renameModal.name.trim(),
      });
      toast.success("Flow renamed");
      setRenameModal({ open: false, id: "", name: "" });
      fetchRecentFlows();
    } catch {
      toast.error("Failed to rename flow");
    }
  };

  const safeFlows = Array.isArray(flows) ? flows : [];
  const q = query.trim().toLowerCase();
  const filteredFlows = q
    ? safeFlows.filter((f) => (f.name || "").toLowerCase().includes(q))
    : safeFlows;
  const grouped = groupFlowsByDate(filteredFlows);

  // ─── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="tw min-h-screen bg-background">
        <div className="px-5 pt-3">
          <div className="h-11 rounded-2xl bg-card border border-border mb-4 animate-pulse" />
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
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

  // ─── Empty state ───────────────────────────────────────────────────────────
  if (!loading && flows.length === 0) {
    return (
      <div className="tw min-h-screen bg-background">
        <div className="px-5 pt-3">
          <SearchBar placeholder="Search recent flows & shapes" />
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-3">🕐</div>
            <div className="text-base font-bold text-foreground mb-1">
              No recent flows
            </div>
            <div className="text-sm text-muted-foreground mb-5">
              Flows you open will appear here
            </div>
            <button
              onClick={() => router.push("/dashboard/flows")}
              className="h-11 px-6 rounded-full text-white text-sm font-bold border-0 appearance-none cursor-pointer"
              style={{ background: "#34A881" }}
            >
              Browse Flows →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="tw min-h-screen bg-background">
      <div className="px-5 pt-3 pb-24">
        {/* Search */}
        <SearchBar
          placeholder="Search recent flows & shapes"
          value={query}
          onChange={setQuery}
        />

        {/* View toggle header + See all */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {DATE_GROUP_ORDER.find((g) => grouped[g].length > 0) || "Recent"}
          </div>
          <div className="flex items-center gap-3">
            {!q && filteredFlows.length > 0 && (
              <button
                onClick={() => router.push("/dashboard/flows")}
                className="h-9 px-4 rounded-xl bg-primary text-white text-xs font-semibold border-0 appearance-none cursor-pointer inline-flex items-center gap-1 shrink-0"
              >
                See all flows <ChevronRight className="w-3 h-3" />
              </button>
            )}
            <ViewToggleLocal view={view} onChange={setView} />
          </div>
        </div>

        {/* Groups */}
        {DATE_GROUP_ORDER.filter((g) => grouped[g].length > 0).map(
          (groupName, groupIdx) => (
            <div key={groupName}>
              {groupIdx > 0 && <SectionLabel>{groupName}</SectionLabel>}

              {view === "list" ? (
                <>
                  {grouped[groupName].map((flow: any) => {
                    const color =
                      FLOW_COLORS[flows.indexOf(flow) % FLOW_COLORS.length];
                    const flowLocked = isLocked || !!flow?.markedForDowngrade;
                    return (
                      <ListItem
                        key={flow.id}
                        title={flow.name}
                        subtitle={`Edited ${timeAgo(flow.updatedAt)}`}
                        color={color}
                        onClick={() => handleEdit(flow)}
                        onMenu={() => setFlowMenu({ open: true, flow })}
                        locked={flowLocked}
                      />
                    );
                  })}
                </>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-3 mb-3">
                  {grouped[groupName].map((flow: any, index: number) => {
                    const flowLocked = isLocked || !!flow?.markedForDowngrade;
                    return (
                      <div
                        key={flow.id}
                        className="relative rounded-2xl bg-card border border-border overflow-hidden shadow-[var(--shadow-card)] hover:-translate-y-0.5 transition"
                      >
                        <button
                          onClick={() => handleEdit(flow)}
                          className="w-full text-left bg-transparent border-0 p-0 appearance-none cursor-pointer"
                        >
                          <div
                            className="h-36 w-full relative overflow-hidden flex items-center justify-center"
                            style={{
                              background:
                                MOBILE_THUMB_GRADIENTS[
                                  index % MOBILE_THUMB_GRADIENTS.length
                                ],
                            }}
                          >
                            {flow.thumbnail ? (
                              <img
                                src={flow.thumbnail}
                                alt=""
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            ) : (
                              <MiniFlow color={BRAND_GREEN} />
                            )}
                            {flowLocked && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                                <div className="flex flex-col items-center gap-1">
                                  <Lock className="w-6 h-6 text-white drop-shadow" />
                                  <span className="text-white text-[10px] font-semibold drop-shadow">
                                    Locked
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="p-3 pr-9 max-lg:pr-13">
                            <div className="font-semibold text-[13px] truncate text-foreground">
                              {flow.name}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              Edited {timeAgo(flow.updatedAt)}
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          aria-label="More options"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFlowMenu({ open: true, flow });
                          }}
                          className="absolute bottom-2 right-2 w-7 h-7 max-lg:w-11 max-lg:h-11 rounded-lg flex items-center justify-center bg-secondary border-0 p-0 appearance-none cursor-pointer"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ),
        )}

        {/* No search results */}
        {q && filteredFlows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <div className="text-sm font-bold text-foreground mb-1">
              No matching flows
            </div>
            <div className="text-sm text-muted-foreground">
              No recent flows match "{query.trim()}"
            </div>
          </div>
        )}
      </div>

      {/* ── Lock modal ── */}
      {lockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="tw w-full max-w-sm bg-card rounded-3xl shadow-2xl border border-border overflow-hidden">
            <div className="flex justify-end px-4 pt-4">
              <button
                onClick={() => setLockModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-secondary border-0 cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col items-center gap-3 px-6 pt-2 pb-5 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-red-50 border border-red-100">
                <Lock className="w-7 h-7 text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-foreground">
                {isLocked ? "Your flows are locked" : "This flow is locked"}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isLocked ? (
                  <>
                    You have{" "}
                    <span className="font-semibold text-foreground">
                      {lockState.flowUsed ?? "—"}
                    </span>{" "}
                    flows but your plan allows{" "}
                    <span className="font-semibold text-foreground">
                      {lockState.totCount ?? "—"}
                    </span>
                    . All flows are locked until you resolve this.
                  </>
                ) : (
                  <>
                    This flow is over your plan&apos;s limit. Upgrade your plan
                    to unlock it.
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-col gap-2 px-6 pb-7">
              <button
                onClick={() => {
                  setLockModalOpen(false);
                  router.push("/dashboard/subscription");
                }}
                className="w-full h-12 rounded-2xl font-bold text-sm text-white border-0 cursor-pointer"
                style={{ background: "#34A881" }}
              >
                Upgrade Plan
              </button>
              {isLocked && (
                <button
                  onClick={() => {
                    setLockModalOpen(false);
                    router.push("/dashboard/limitflows");
                  }}
                  className="w-full h-12 rounded-2xl font-bold text-sm border border-border bg-secondary text-foreground cursor-pointer"
                >
                  Choose flows to keep
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      <FlowMenuModal
        open={flowMenu.open}
        flow={flowMenu.flow}
        onClose={() => setFlowMenu({ open: false, flow: null })}
        locked={isLocked || !!flowMenu.flow?.markedForDowngrade}
        onEdit={() => handleEdit(flowMenu.flow)}
        onToggleFavorite={() => handleFavorite(flowMenu.flow.id)}
        onRename={() =>
          setRenameModal({
            open: true,
            id: flowMenu.flow.id,
            name: flowMenu.flow.name,
          })
        }
        onAssign={() =>
          setAssignModal({
            open: true,
            flowId: flowMenu.flow.id,
            currentProjectId: flowMenu.flow.projectId,
          })
        }
        onShare={() => setShareModal({ open: true, flow: flowMenu.flow })}
        onDuplicate={() => handleDuplicate(flowMenu.flow.id)}
        onDelete={() => handleDelete(flowMenu.flow.id)}
      />

      <ShareFlowModal
        open={shareModal.open}
        flow={shareModal.flow}
        onClose={() => setShareModal({ open: false, flow: null })}
        onSuccess={fetchRecentFlows}
      />

      <AssignProjectModal
        open={assignModal.open}
        flowId={assignModal.flowId}
        currentProjectId={assignModal.currentProjectId}
        onClose={() => setAssignModal({ open: false, flowId: null })}
        onSuccess={fetchRecentFlows}
      />

      <ModalShell
        open={renameModal.open}
        onClose={() => setRenameModal({ open: false, id: "", name: "" })}
      >
        <ModalHeader
          title="Rename Flow"
          close={() => setRenameModal({ open: false, id: "", name: "" })}
        />
        <div className="px-5 pb-5">
          <Field label="New name" required>
            <FieldInput
              autoFocus
              maxLength={255}
              value={renameModal.name}
              onChange={(e) =>
                setRenameModal({ ...renameModal, name: e.target.value })
              }
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
            />
          </Field>
        </div>
        <ModalFooter
          close={() => setRenameModal({ open: false, id: "", name: "" })}
          primary={handleRename}
          primaryLabel="Save"
          disabled={!renameModal.name.trim()}
        />
      </ModalShell>
    </div>
  );
}
