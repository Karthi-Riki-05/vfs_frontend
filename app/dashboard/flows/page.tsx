"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  ModalShell,
  ModalHeader,
  ModalFooter,
} from "@/components/common/Modal";
import { Field, FieldInput } from "@/components/common/Field";
import {
  Search,
  Filter,
  Plus,
  MoreHorizontal,
  List as ListIcon,
  LayoutGrid,
  Star,
  Folder,
  Share2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Lock,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import SectionHeader from "@/components/common/SectionHeader";
import EmptyState from "@/components/common/EmptyState";
import ShareFlowModal from "@/components/flows/ShareFlowModal";
import AssignProjectModal from "@/components/flows/AssignProjectModal";
import FlowMenuModal from "@/components/flows/FlowMenuModal";
import { useFlows, useLockState } from "@/hooks/useFlows";
import { useTabFocus } from "@/hooks/useTabFocus";
import { createNewFlow } from "@/lib/flow";
import api from "@/lib/axios";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { TEMPLATE_CATEGORIES } from "@/lib/templateCategories";
import TemplateBrowser from "@/components/templates/TemplateBrowser";
import FlowPackBanner from "@/components/flows/FlowPackBanner";
import { usePackStatus } from "@/hooks/usePackStatus";
import { FlowUsageBar } from "@/components/dashboard/FlowUsageBar";
import { useProjects } from "@/hooks/useProjects";
import MiniFlow from "@/components/dashboard/MiniFlow";
import { BRAND_GREEN } from "@/lib/theme";
import { useAppContext } from "@/context/AppContext";

const PLACEHOLDER_COLORS = [
  "#E8F5E9",
  "#E3F2FD",
  "#FFF3E0",
  "#F3E5F5",
  "#E0F7FA",
  "#FFF8E1",
];

const MOBILE_THUMB_GRADIENTS = [
  "linear-gradient(135deg, #E7F6F0 0%, #CFEDE0 100%)",
  "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)",
  "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)",
];

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

function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sz =
    size === "lg" ? "w-10 h-10" : size === "sm" ? "w-5 h-5" : "w-7 h-7";
  return (
    <div
      className={`${sz} rounded-full border-2 border-border border-t-primary animate-spin`}
    />
  );
}

function Badge({
  children,
  color = "default",
}: {
  children: React.ReactNode;
  color?: "default" | "blue" | "green" | "gray";
}) {
  const cls =
    color === "blue"
      ? "bg-blue-50 text-blue-600 border-blue-200"
      : color === "green"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-secondary text-muted-foreground border-border";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${cls}`}
    >
      {children}
    </span>
  );
}

function SimplePager({
  current,
  pageSize,
  total,
  onChange,
}: {
  current: number;
  pageSize: number;
  total: number;
  onChange: (page: number, size: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  const pages: (number | "…")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - current) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…");
    }
  }
  return (
    <div className="flex items-center justify-center gap-1 mt-6">
      <button
        disabled={current === 1}
        onClick={() => onChange(current - 1, pageSize)}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground border border-border bg-card hover:bg-secondary disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className="w-8 text-center text-muted-foreground">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p as number, pageSize)}
            className={`w-8 h-8 rounded-lg text-sm font-medium cursor-pointer border ${
              p === current
                ? "bg-primary text-white border-primary"
                : "bg-card border-border text-foreground hover:bg-secondary"
            }`}
          >
            {p}
          </button>
        ),
      )}
      <button
        disabled={current === totalPages}
        onClick={() => onChange(current + 1, pageSize)}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground border border-border bg-card hover:bg-secondary disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ── Local Atoms ── */

function LocalTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex p-1 rounded-2xl bg-[#F0F0F0]">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={value === t.id ? { backgroundColor: "#fff" } : {}}
          className={`flex-1 h-10 rounded-xl text-sm font-semibold transition border-0 p-0 appearance-none cursor-pointer ${
            value === t.id
              ? "shadow-sm text-foreground"
              : "text-muted-foreground"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function LocalSearchBar({
  value,
  onChange,
  placeholder,
  onFilterClick,
  filterActive = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onFilterClick?: () => void;
  filterActive?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 h-11 px-3 rounded-2xl bg-card border border-border mb-4">
      <Search className="w-4 h-4 text-muted-foreground shrink-0" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none text-sm border-0 p-0 appearance-none"
      />
      <button
        type="button"
        aria-label="Filter"
        onClick={onFilterClick}
        className="relative w-7 h-7 rounded-lg flex items-center justify-center bg-transparent border-0 p-0 appearance-none cursor-pointer"
      >
        <Filter className="w-3.5 h-3.5 text-primary" />
        {filterActive && (
          <span
            className="absolute top-0 right-0 w-2 h-2 rounded-full"
            style={{ backgroundColor: "#3CB371" }}
          />
        )}
      </button>
    </div>
  );
}

function LocalViewToggle({
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
        className={`w-9 h-8 rounded-lg flex items-center justify-center bg-transparent border-0 p-0 appearance-none cursor-pointer ${
          view === "list"
            ? "bg-card shadow-sm text-primary"
            : "text-muted-foreground"
        }`}
      >
        <ListIcon className="w-4 h-4" />
      </button>
      <button
        onClick={() => onChange("grid")}
        aria-label="Grid view"
        aria-pressed={view === "grid"}
        className={`w-9 h-8 rounded-lg flex items-center justify-center bg-transparent border-0 p-0 appearance-none cursor-pointer ${
          view === "grid"
            ? "bg-card shadow-sm text-primary"
            : "text-muted-foreground"
        }`}
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */

export default function FlowsPage() {
  const {
    flows,
    sharedFlows,
    loading,
    search,
    setSearch,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    sort,
    setSort,
    sortDirection,
    setSortDirection,
    isFavorite,
    setIsFavorite,
    projectId,
    setProjectId,
    fetchFlows,
    deleteFlow,
    duplicateFlow,
    favoriteFlow,
    removeSharedFlow,
  } = useFlows();
  useTabFocus(fetchFlows);
  const router = useRouter();
  const isMobile = useIsMobile();
  const { projects } = useProjects();
  const {
    status: packStatus,
    effectiveLimit: packLimit,
    effectiveUnlimited: packUnlimited,
  } = usePackStatus();
  const { activeTeamId, effectivePlan, hydrated } = useAppContext();
  const resolvedAppType: "pro" | "team" =
    effectivePlan === "pro" ? "pro" : "team";
  const { lockState, lockLoading, markModalShown } = useLockState();
  const isLocked = lockState.overLimitLocked;
  const [lockModalOpen, setLockModalOpen] = useState(false);

  // Show one-time modal when locked and not yet shown this cycle
  useEffect(() => {
    if (!lockLoading && isLocked && !lockState.overLimitModalShown) {
      setLockModalOpen(true);
      markModalShown(resolvedAppType);
    }
  }, [lockLoading, isLocked, lockState.overLimitModalShown]);

  const [masterFlows, setMasterFlows] = useState<any[]>([]);
  const [masterLoading, setMasterLoading] = useState(false);
  useEffect(() => {
    if (!activeTeamId) {
      setMasterFlows([]);
      return;
    }
    setMasterLoading(true);
    api
      .get("/flows/master-view")
      .then((r) => {
        const data = r.data?.data || r.data;
        setMasterFlows(Array.isArray(data?.flows) ? data.flows : []);
      })
      .catch(() => setMasterFlows([]))
      .finally(() => setMasterLoading(false));
  }, [activeTeamId]);

  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("vc:sheet-open", { detail: filterDrawerOpen }),
    );
  }, [filterDrawerOpen]);
  const activeFilterCount =
    (isFavorite ? 1 : 0) +
    (projectId ? 1 : 0) +
    (sort !== "updatedAt" ? 1 : 0) +
    (sortDirection !== "desc" ? 1 : 0);
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [tab, setTab] = useState<"templates" | "all">("all");
  const [templateBrowserOpen, setTemplateBrowserOpen] = useState(false);
  const [templateBrowserCategory, setTemplateBrowserCategory] = useState("All");

  const displayFlows = Array.isArray(flows) ? flows : [];

  const [renameModal, setRenameModal] = React.useState<{
    open: boolean;
    id: string;
    name: string;
  }>({ open: false, id: "", name: "" });

  const [assignModal, setAssignModal] = React.useState<{
    open: boolean;
    flowId: string | null;
    currentProjectId?: string | null;
  }>({ open: false, flowId: null });

  const [shareModal, setShareModal] = React.useState<{
    open: boolean;
    flow: any | null;
  }>({ open: false, flow: null });

  const [flowMenu, setFlowMenu] = React.useState<{
    open: boolean;
    flow: any | null;
  }>({ open: false, flow: null });

  useEffect(() => {
    const saved = localStorage.getItem("flows_view_mode");
    if (saved === "grid" || saved === "list") setViewMode(saved);
  }, []);

  const handleViewChange = (v: "grid" | "list") => {
    setViewMode(v);
    localStorage.setItem("flows_view_mode", v);
  };

  const handleEdit = (id: string) => {
    const flow = [...flows, ...sharedFlows].find((f) => f.id === id);
    const flowLocked = isLocked || !!flow?.markedForDowngrade;
    if (lockLoading || flowLocked) {
      if (flowLocked) setLockModalOpen(true);
      return;
    }
    window.open(`/dashboard/flows/${id}`, "_blank");
  };

  const hasDowngradedFlows = flows.some((f: any) => f.markedForDowngrade);

  const handleNewFlow = () => {
    if (isLocked || hasDowngradedFlows) {
      setLockModalOpen(true);
      return;
    }
    createNewFlow();
  };

  const handleRename = async () => {
    if (!renameModal.name.trim()) return;
    try {
      await api.put(`/flows/${renameModal.id}`, {
        name: renameModal.name.trim(),
      });
      toast.success("Flow renamed");
      setRenameModal({ open: false, id: "", name: "" });
      fetchFlows();
    } catch {
      toast.error("Failed to rename flow");
    }
  };

  const openTemplateBrowser = (category: string = "All") => {
    if (isLocked || hasDowngradedFlows) {
      setLockModalOpen(true);
      return;
    }
    setTemplateBrowserCategory(category);
    setTemplateBrowserOpen(true);
  };

  const handleTemplateInsert = async (xml: string, name: string) => {
    if (isLocked || hasDowngradedFlows) {
      setLockModalOpen(true);
      return;
    }
    setTemplateBrowserOpen(false);
    try {
      const response = await api.post("/flows", {
        name: name || "Untitled Template",
        description: `Created from template: ${name}`,
      });
      const newFlow = response.data?.data || response.data;
      if (!newFlow?.id) throw new Error("No flow ID returned");
      sessionStorage.setItem("ai_generated_xml", xml);
      sessionStorage.setItem("ai_generated_name", name);
      window.open(`/dashboard/flows/${newFlow.id}`, "_blank");
    } catch (error) {
      console.error("Failed to create flow from template:", error);
      toast.error("Failed to create flow from template");
    }
  };

  /* ── Flow action menu (opens FlowMenuModal — same as mobile) ── */
  const renderFlowActions = (flow: any) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setFlowMenu({ open: true, flow });
      }}
      className="w-7 h-7 rounded-lg flex items-center justify-center border-0 cursor-pointer bg-secondary hover:bg-border transition"
    >
      <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
    </button>
  );

  const renderSharedActions = (flow: any) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setFlowMenu({ open: true, flow });
      }}
      className="w-7 h-7 rounded-lg flex items-center justify-center border-0 cursor-pointer bg-secondary hover:bg-border transition"
    >
      <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
    </button>
  );

  if (!hydrated) return null;

  return (
    <div className="tw">
      {/* ══════════ MOBILE (<1024px) ══════════ */}
      <div className="lg:hidden px-5 pt-3 pb-28 min-h-screen bg-background">
        <LocalSearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search flows and templates"
          onFilterClick={() => setFilterDrawerOpen(true)}
          filterActive={activeFilterCount > 0}
        />

        {packStatus && (
          <FlowUsageBar
            proFlows={{ used: packStatus.flowCount, max: packLimit }}
            isUnlimited={packUnlimited}
            onBuyMore={() => router.push("/dashboard/subscription")}
          />
        )}

        <button
          onClick={handleNewFlow}
          className="w-full mb-3 h-12 rounded-2xl font-bold text-sm inline-flex items-center justify-center gap-2 border-0 p-0 appearance-none cursor-pointer"
          style={{ background: "var(--color-primary, #34A881)", color: "#fff" }}
        >
          <Plus className="w-4 h-4" /> New Flow
        </button>

        <LocalTabs
          tabs={[
            { id: "templates", label: "Templates" },
            { id: "all", label: "All Flows" },
          ]}
          value={tab}
          onChange={(t) => setTab(t as "templates" | "all")}
        />

        {tab === "all" && (
          <div className="flex items-center justify-between mt-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              All Flows
            </div>
            <LocalViewToggle view={viewMode} onChange={handleViewChange} />
          </div>
        )}

        {tab === "templates" ? (
          <>
            <div className="flex items-center justify-between mt-4 mb-3">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                START FROM A TEMPLATE
              </span>
              <button
                onClick={() => openTemplateBrowser("All")}
                className="text-xs font-semibold text-primary bg-transparent border-0 p-0 appearance-none cursor-pointer"
              >
                Browse All →
              </button>
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-3">
              {TEMPLATE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => openTemplateBrowser(cat.category)}
                  className="rounded-2xl bg-card border border-border overflow-hidden text-left shadow-[var(--shadow-card)] active:scale-[0.98] transition bg-transparent p-0 appearance-none cursor-pointer"
                >
                  <div
                    className="h-28 relative flex items-center justify-center"
                    style={{ background: (cat.color || "#F0F0F0") + "28" }}
                  >
                    <div className="w-10 h-10">{cat.icon(cat.iconColor)}</div>
                  </div>
                  <div className="p-3">
                    <div className="font-semibold text-[13px] truncate text-foreground">
                      {cat.label}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {cat.category}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : displayFlows.length > 0 ? (
          <>
            {viewMode === "list" ? (
              <div className="mt-3 space-y-2">
                {displayFlows.map((flow: any) => (
                  <div
                    key={flow.id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border shadow-[var(--shadow-card)]"
                  >
                    <div
                      className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center cursor-pointer"
                      style={{
                        background:
                          MOBILE_THUMB_GRADIENTS[
                            displayFlows.indexOf(flow) %
                              MOBILE_THUMB_GRADIENTS.length
                          ],
                      }}
                      onClick={() => handleEdit(flow.id)}
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
                      {(isLocked || !!flow?.markedForDowngrade) && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                          <Lock className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleEdit(flow.id)}
                    >
                      <div className="font-semibold text-sm truncate text-foreground">
                        {flow.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Edited {timeAgo(flow.updatedAt)}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFlowMenu({ open: true, flow });
                      }}
                      className="w-9 h-9 rounded-lg flex items-center justify-center border-0 p-0 appearance-none cursor-pointer bg-secondary"
                    >
                      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mmt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-3">
                {displayFlows.map((flow: any, index: number) => (
                  <div
                    key={flow.id}
                    className="relative rounded-2xl bg-card border border-border overflow-hidden shadow-[var(--shadow-card)]"
                  >
                    <button
                      onClick={() => handleEdit(flow.id)}
                      className="w-full text-left bg-transparent border-0 p-0 appearance-none cursor-pointer"
                    >
                      <div
                        className="h-36 w-full relative overflow-hidden flex items-center justify-center text-3xl"
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
                        {(isLocked || !!flow?.markedForDowngrade) && (
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
                      <div className="p-3 pr-9">
                        <div className="font-semibold text-[13px] truncate text-foreground">
                          {flow.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Edited {timeAgo(flow.updatedAt)}
                        </div>
                        {!flow.createdBySelf && flow.createdByName && (
                          <div
                            className="text-[11px] mt-0.5"
                            style={{ color: "#1890FF" }}
                          >
                            Created by {flow.createdByName}
                          </div>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFlowMenu({ open: true, flow });
                      }}
                      className="absolute bottom-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center border-0 p-0 appearance-none cursor-pointer bg-secondary"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ))}
                <div
                  onClick={handleNewFlow}
                  className="border-2 border-dashed border-border rounded-2xl h-44 flex flex-col items-center justify-center bg-background cursor-pointer gap-1"
                >
                  <span className="text-2xl text-primary font-bold">+</span>
                  <span className="text-sm font-semibold text-primary">
                    New Flow
                  </span>
                </div>
              </div>
            )}

            <SimplePager
              current={page}
              pageSize={pageSize}
              total={total}
              onChange={(p, ps) => {
                setPage(p);
                setPageSize(ps);
              }}
            />
          </>
        ) : (
          <div className="text-center py-12 px-4">
            <div className="text-4xl mb-3">📄</div>
            <div className="text-base font-bold text-foreground mb-1">
              No flows yet
            </div>
            <div className="text-sm text-muted-foreground mb-5">
              Create your first flow or start from a template
            </div>
            <button
              onClick={handleNewFlow}
              className="h-11 px-6 rounded-full font-bold text-sm border-0 appearance-none cursor-pointer"
              style={{
                background: "var(--color-primary, #34A881)",
                color: "#fff",
              }}
            >
              + Create Flow
            </button>
          </div>
        )}
      </div>

      {/* ══════════ DESKTOP (≥1024px) ══════════ */}
      <div className="hidden lg:block md:max-w-6xl md:mx-auto md:px-8 pt-6 pb-10">
        {packStatus && (
          <FlowUsageBar
            proFlows={{ used: packStatus.flowCount, max: packLimit }}
            isUnlimited={packUnlimited}
            onBuyMore={() => router.push("/dashboard/subscription")}
          />
        )}
        <FlowPackBanner />

        {/* ── Title header ── */}
        <div className="mb-4">
          <h1 className="text-2xl font-extrabold text-foreground">Flows</h1>
        </div>

        {/* ── Desktop toolbar ── */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {/* Search */}
          <div className="flex items-center gap-2 h-10 px-3 rounded-xl bg-card border border-border flex-1 min-w-[180px]">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search flows…"
              className="flex-1 bg-transparent outline-none text-sm border-0 p-0 appearance-none min-w-0"
            />
          </div>

          {/* Project filter */}
          <Select
            value={projectId || "all"}
            onValueChange={(v) => setProjectId(v === "all" ? null : v)}
          >
            <SelectTrigger className="w-36 h-10 rounded-xl border-border bg-card text-sm">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {Array.isArray(projects) &&
                projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          {/* Favorites toggle */}
          <button
            onClick={() => setIsFavorite(!isFavorite)}
            aria-label="Show starred only"
            className={`h-10 px-3 rounded-xl border border-border inline-flex items-center gap-2 text-[13px] font-medium transition shrink-0 cursor-pointer ${isFavorite ? "bg-primary/10 text-primary border-primary/30" : "bg-card text-muted-foreground"}`}
          >
            <Star className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
          </button>

          {/* Sort by */}
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-36 h-10 rounded-xl border-border bg-card text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updatedAt">Last Modified</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="createdAt">Created</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort direction */}
          <Select
            value={sortDirection}
            onValueChange={(v) => setSortDirection(v as "asc" | "desc")}
          >
            <SelectTrigger className="w-32 h-10 rounded-xl border-border bg-card text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Newest first</SelectItem>
              <SelectItem value="asc">Oldest first</SelectItem>
            </SelectContent>
          </Select>

          <LocalViewToggle view={viewMode} onChange={handleViewChange} />
        </div>

        {/* ── Template Section ── */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
              Start from a template
            </span>
            <button
              onClick={() => openTemplateBrowser("All")}
              className="flex items-center gap-1 text-xs font-semibold text-primary bg-transparent border-0 p-0 cursor-pointer"
            >
              Browse All
              <svg
                width={12}
                height={12}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-3 2xl:grid-cols-6 gap-3">
            {TEMPLATE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => openTemplateBrowser(cat.category)}
                className="group flex flex-col items-center gap-3 p-4 rounded-2xl bg-card border border-border cursor-pointer text-left transition-all hover:border-primary/60 hover:shadow-md hover:-translate-y-0.5 appearance-none"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105"
                  style={{ background: cat.color || "#F0F0F0" }}
                >
                  <div className="w-8 h-8">{cat.icon(cat.iconColor)}</div>
                </div>
                <span className="text-[12px] font-semibold text-foreground text-center leading-tight">
                  {cat.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Flows grid/list ── */}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
            My Flows
            {total > 0 && (
              <span className="ml-2 font-normal normal-case tracking-normal text-muted-foreground/70">
                ({total})
              </span>
            )}
          </span>
          <button
            onClick={handleNewFlow}
            className="inline-flex items-center gap-2 px-5 h-11 rounded-xl text-sm font-semibold text-white border-0 cursor-pointer shrink-0 shadow-[var(--shadow-fab)]"
            style={{ background: "#34A881" }}
          >
            <Plus className="w-4 h-4" /> New Flow
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Spinner size="lg" />
          </div>
        ) : displayFlows.length > 0 ? (
          <>
            {viewMode === "grid" ? (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                {displayFlows.map((flow: any) => (
                  <div
                    key={flow.id}
                    className="relative rounded-2xl bg-card border border-border overflow-hidden shadow-[var(--shadow-card)] hover:-translate-y-0.5 transition"
                  >
                    <button
                      onClick={() => handleEdit(flow.id)}
                      className="w-full text-left appearance-none border-0 p-0 bg-transparent cursor-pointer"
                    >
                      <div
                        className="h-28 relative flex items-center justify-center overflow-hidden"
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
                        {(isLocked || !!flow?.markedForDowngrade) && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/40 backdrop-blur-[1px]">
                            <Lock className="w-6 h-6 text-white drop-shadow" />
                            <span className="text-white text-[10px] font-semibold drop-shadow">
                              Locked
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-3 pr-10">
                        <div className="font-semibold text-[13px] truncate text-foreground flex items-center gap-1">
                          {flow.name}
                          {flow.isFavorite && (
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 shrink-0" />
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Edited {timeAgo(flow.updatedAt)}
                        </div>
                        {!flow.createdBySelf && flow.createdByName && (
                          <div
                            className="text-[11px] mt-0.5"
                            style={{ color: "#1890FF" }}
                          >
                            Created by {flow.createdByName}
                          </div>
                        )}
                      </div>
                    </button>
                    <div className="absolute bottom-2 right-2">
                      {renderFlowActions(flow)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {displayFlows.map((flow: any) => (
                  <div
                    key={flow.id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border shadow-[var(--shadow-card)]"
                  >
                    <div
                      className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center cursor-pointer"
                      style={{ background: `${BRAND_GREEN}1a` }}
                      onClick={() => handleEdit(flow.id)}
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
                      {(isLocked || !!flow?.markedForDowngrade) && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                          <Lock className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleEdit(flow.id)}
                    >
                      <div className="font-semibold text-sm truncate text-foreground flex items-center gap-1">
                        {flow.name}
                        {flow.isFavorite && (
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 shrink-0" />
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Edited {timeAgo(flow.updatedAt)}
                      </div>
                      {!flow.createdBySelf && flow.createdByName && (
                        <div
                          className="text-[11px] mt-0.5"
                          style={{ color: "#1890FF" }}
                        >
                          Created by {flow.createdByName}
                        </div>
                      )}
                    </div>
                    {renderFlowActions(flow)}
                  </div>
                ))}
              </div>
            )}

            <SimplePager
              current={page}
              pageSize={pageSize}
              total={total}
              onChange={(p, ps) => {
                setPage(p);
                setPageSize(ps);
              }}
            />
          </>
        ) : (
          <EmptyState
            title="No flows yet"
            description="Use the New Flow button above to create your first flow"
          />
        )}

        {/* ── Team master view (§5 owner sees all member flows) ── */}
        {(masterLoading || masterFlows.length > 0) && (
          <div className="mt-12">
            <SectionHeader title="TEAM — ALL FLOWS" />
            {masterLoading ? (
              <div className="flex items-center justify-center py-10">
                <Spinner />
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">
                        Name
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">
                        Project
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-[11px] uppercase tracking-wider w-40">
                        Last Modified
                      </th>
                      <th className="w-20" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {masterFlows.map((flow: any) => (
                      <tr
                        key={flow.id}
                        className="hover:bg-secondary/30 transition"
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">
                            {flow.name}
                          </div>
                          {!flow.createdBySelf && (
                            <Badge color="blue">
                              Created by {flow.createdByName || "member"}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {flow.projectName ? (
                            <span className="inline-flex items-center gap-1">
                              <Folder className="w-3.5 h-3.5" />
                              {flow.projectName}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-[12px]">
                          {timeAgo(flow.updatedAt)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleEdit(flow.id)}
                            className="inline-flex items-center gap-1.5 px-3 h-7 rounded-lg text-xs font-medium border border-border bg-background hover:bg-secondary transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" /> Open
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Shared With Me ── */}
        {Array.isArray(sharedFlows) && sharedFlows.length > 0 && (
          <div className="mt-12">
            <SectionHeader title="SHARED WITH ME" />
            {viewMode === "grid" ? (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                {sharedFlows.map((flow: any) => (
                  <div
                    key={flow.id}
                    className="relative rounded-2xl bg-card border border-border overflow-hidden shadow-[var(--shadow-card)] hover:-translate-y-0.5 transition"
                  >
                    <button
                      onClick={() => handleEdit(flow.id)}
                      className="w-full text-left appearance-none border-0 p-0 bg-transparent cursor-pointer"
                    >
                      <div
                        className="h-28 relative flex items-center justify-center overflow-hidden"
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
                        {(isLocked || !!flow?.markedForDowngrade) && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/40 backdrop-blur-[1px]">
                            <Lock className="w-6 h-6 text-white drop-shadow" />
                            <span className="text-white text-[10px] font-semibold drop-shadow">
                              Locked
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-3 pr-10">
                        <div className="font-semibold text-[13px] truncate text-foreground flex items-center gap-1">
                          {flow.name}
                          {flow.isFavorite && (
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 shrink-0" />
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Edited {timeAgo(flow.updatedAt)}
                        </div>
                        {flow.sharedByName && (
                          <div className="text-[11px] text-blue-500 mt-0.5 flex items-center gap-1">
                            <Share2 className="w-3 h-3" />
                            By {flow.sharedByName}
                          </div>
                        )}
                      </div>
                    </button>
                    <div className="absolute bottom-2 right-2">
                      {renderSharedActions(flow)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">
                        Name
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-[11px] uppercase tracking-wider w-44">
                        Last Modified
                      </th>
                      <th className="w-12" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sharedFlows.map((flow: any) => (
                      <tr
                        key={flow.id}
                        className="hover:bg-secondary/30 transition"
                      >
                        <td
                          className="px-4 py-3 cursor-pointer"
                          onClick={() => handleEdit(flow.id)}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground">
                              {flow.name}
                            </span>
                            <Badge
                              color={
                                flow.accessType === "edit" ? "green" : "blue"
                              }
                            >
                              {flow.accessType === "edit"
                                ? "Can edit"
                                : "View only"}
                            </Badge>
                          </div>
                          {flow.sharedByName && (
                            <div className="flex items-center gap-1 text-[11px] text-blue-500 mt-0.5">
                              <Share2 className="w-3 h-3" />
                              Shared by {flow.sharedByName}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-[12px]">
                          {timeAgo(flow.updatedAt)}
                        </td>
                        <td className="px-4 py-3">
                          {renderSharedActions(flow)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Shared between mobile & desktop ── */}
      <TemplateBrowser
        isOpen={templateBrowserOpen}
        initialCategory={templateBrowserCategory}
        onClose={() => setTemplateBrowserOpen(false)}
        onInsert={handleTemplateInsert}
      />

      {/* Rename Modal */}
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

      <AssignProjectModal
        open={assignModal.open}
        flowId={assignModal.flowId}
        currentProjectId={assignModal.currentProjectId}
        onClose={() => setAssignModal({ open: false, flowId: null })}
        onSuccess={fetchFlows}
      />

      <ShareFlowModal
        open={shareModal.open}
        flow={shareModal.flow}
        onClose={() => setShareModal({ open: false, flow: null })}
        onSuccess={fetchFlows}
      />

      <FlowMenuModal
        open={flowMenu.open}
        flow={flowMenu.flow}
        locked={isLocked || !!flowMenu.flow?.markedForDowngrade}
        onClose={() => setFlowMenu({ open: false, flow: null })}
        onEdit={() => handleEdit(flowMenu.flow.id)}
        onToggleFavorite={() => favoriteFlow(flowMenu.flow.id)}
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
        onDuplicate={() => duplicateFlow(flowMenu.flow.id)}
        onDelete={() => deleteFlow(flowMenu.flow.id)}
      />

      {/* Filter & Sort — mobile bottom sheet */}
      <Sheet open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
        <SheetContent side="bottom" className="tw rounded-t-2xl pb-8">
          <SheetHeader className="mb-6">
            <SheetTitle>Filter &amp; Sort</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-6">
            {/* Favorites */}
            <div className="flex items-center justify-between">
              <Label className="font-semibold">⭐ Favorites only</Label>
              <Switch checked={isFavorite} onCheckedChange={setIsFavorite} />
            </div>

            {/* Project */}
            <div className="flex flex-col gap-2">
              <Label className="font-semibold">📁 Project</Label>
              <Select
                value={projectId || "all"}
                onValueChange={(v) => setProjectId(v === "all" ? null : v)}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {Array.isArray(projects) &&
                    projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort by */}
            <div className="flex flex-col gap-3">
              <Label className="font-semibold">🔃 Sort by</Label>
              <RadioGroup
                value={sort}
                onValueChange={setSort}
                className="grid grid-cols-3 gap-2"
              >
                {[
                  { value: "updatedAt", label: "Modified" },
                  { value: "name", label: "Name" },
                  { value: "createdAt", label: "Created" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center justify-center gap-2 h-9 rounded-xl border text-sm font-medium cursor-pointer transition ${
                      sort === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    <RadioGroupItem value={opt.value} className="sr-only" />
                    {opt.label}
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* Order */}
            <div className="flex flex-col gap-3">
              <Label className="font-semibold">↕️ Order</Label>
              <RadioGroup
                value={sortDirection}
                onValueChange={(v) => setSortDirection(v as "asc" | "desc")}
                className="grid grid-cols-2 gap-2"
              >
                {[
                  { value: "desc", label: "Newest first" },
                  { value: "asc", label: "Oldest first" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center justify-center gap-2 h-9 rounded-xl border text-sm font-medium cursor-pointer transition ${
                      sortDirection === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    <RadioGroupItem value={opt.value} className="sr-only" />
                    {opt.label}
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setIsFavorite(false);
                  setProjectId(null);
                  setSort("updatedAt");
                  setSortDirection("desc");
                  setFilterDrawerOpen(false);
                }}
                className="flex-1 h-11 rounded-xl border border-border bg-card font-semibold text-sm cursor-pointer"
              >
                Clear
              </button>
              <button
                onClick={() => setFilterDrawerOpen(false)}
                className="flex-1 h-11 rounded-xl font-semibold text-sm text-white cursor-pointer border-0"
                style={{ background: "#34A881" }}
              >
                Apply
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Over-limit lock modal ── */}
      {lockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-card rounded-3xl shadow-2xl border border-border overflow-hidden">
            {/* Close button */}
            <div className="flex justify-end px-4 pt-4">
              <button
                onClick={() => setLockModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-secondary border-0 cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Header */}
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

            {/* Actions */}
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
                  className="w-full h-12 rounded-2xl font-semibold text-sm border border-border bg-secondary text-foreground cursor-pointer"
                >
                  Limit to {lockState.totCount ?? "—"} flows
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
