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
} from "lucide-react";
import api from "@/lib/axios";
import { useLockState } from "@/hooks/useFlows";
import MiniFlow from "@/components/dashboard/MiniFlow";
import { useAppContext } from "@/context/AppContext";
import { onWorkspaceFlush } from "@/lib/workspaceCache";
import { BRAND_GREEN } from "@/lib/theme";
import FlowMenuModal from "@/components/flows/FlowMenuModal";
import FlowCollection from "@/components/flows/FlowCollection";
import FlowListLockModal from "@/components/flows/FlowListLockModal";
import ViewToggle from "@/components/common/ViewToggle";
import { useFlowView } from "@/hooks/useFlowView";
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
        className="flex-1 min-w-0 bg-transparent outline-none text-sm border-0 p-0 appearance-none"
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
  const [view, setView] = useFlowView("grid");
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
      // Ask for the 15 this page shows. It called `/flows` with NO params, so
      // the backend applied its default `limit = 10` — the client-side sort and
      // `.slice(0, 15)` below could then never see more than 10 rows, and
      // "Recents" silently capped at 10 no matter how many flows existed. The
      // sort was redundant too: getAllFlows already orders updatedAt desc.
      const response = await api.get("/flows", {
        params: { limit: 15, sort: "updatedAt", sortDirection: "desc" },
      });
      const d = response.data?.data || response.data || {};
      setFlows(d.flows || (Array.isArray(d) ? d : []));
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
      <div className="px-5 pt-3 pb-24 max-[767px]:pb-0">
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
            <ViewToggle view={view} onChange={setView} />
          </div>
        </div>

        {/* Groups */}
        {DATE_GROUP_ORDER.filter((g) => grouped[g].length > 0).map(
          (groupName, groupIdx) => (
            <div key={groupName}>
              {groupIdx > 0 && <SectionLabel>{groupName}</SectionLabel>}

              <FlowCollection
                flows={grouped[groupName]}
                view={view}
                onOpen={(_id, flow) => handleEdit(flow)}
                onMenu={(flow) => setFlowMenu({ open: true, flow })}
                isLocked={isLocked}
              />
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

      <FlowListLockModal
        open={lockModalOpen}
        onClose={() => setLockModalOpen(false)}
        isLocked={isLocked}
        flowUsed={lockState.flowUsed}
        totCount={lockState.totCount}
      />

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
