"use client";

import React, { useState, useEffect, type ReactNode } from "react";
import { Dropdown, message } from "antd";
import {
  EditOutlined,
  StarOutlined,
  StarFilled,
  CopyOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  MoreHorizontal,
  Workflow,
  ChevronRight,
  List as ListIcon,
  LayoutGrid,
} from "lucide-react";
import api from "@/lib/axios";
import MiniFlow from "@/components/dashboard/MiniFlow";

// ─── Design tokens ───────────────────────────────────────────────────────────
const FLOW_COLORS = [
  "#34A881",
  "#006AA8",
  "#FF9A30",
  "#F85729",
  "#1F7D5E",
  "#6B7280",
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

function SearchBar({ placeholder }: { placeholder: string }) {
  return (
    <div className="flex items-center gap-2 h-11 px-3 rounded-2xl bg-card border border-border mb-4">
      <Search className="w-4 h-4 text-muted-foreground" />
      <input
        placeholder={placeholder}
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
}: {
  title: string;
  subtitle: string;
  color: string;
  onClick?: () => void;
  onMenu?: () => void;
}) {
  return (
    <div className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border mb-2 text-left">
      <button
        onClick={onClick}
        className="flex items-center gap-3 flex-1 min-w-0 text-left bg-transparent border-0 p-0 appearance-none cursor-pointer"
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${color}1a` }}
        >
          <Workflow className="w-5 h-5" style={{ color }} />
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
  const [flows, setFlows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "grid">("list");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  useEffect(() => {
    fetchRecentFlows();
  }, []);

  const fetchRecentFlows = async () => {
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
        .slice(0, 20);
      setFlows(sorted);
    } catch {
      message.error("Failed to load recent flows");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id: string) => {
    window.open(`/dashboard/flows/${id}`, "_blank");
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/flows/${id}`);
      setFlows((prev) => prev.filter((f) => f.id !== id));
      message.success("Flow deleted");
    } catch {
      message.error("Failed to delete flow");
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await api.post(`/flows/${id}/duplicate`);
      message.success("Flow duplicated");
      fetchRecentFlows();
    } catch {
      message.error("Failed to duplicate flow");
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
      message.error("Failed to update favorite");
    }
  };

  const getMenuItems = (flow: any) => [
    {
      key: "edit",
      label: "Edit",
      icon: <EditOutlined />,
      onClick: () => handleEdit(flow.id),
    },
    {
      key: "favorite",
      label: flow.isFavorite ? "Remove Favorite" : "Mark as Favorite",
      icon: flow.isFavorite ? (
        <StarFilled style={{ color: "#FAAD14" }} />
      ) : (
        <StarOutlined />
      ),
      onClick: () => handleFavorite(flow.id),
    },
    {
      key: "duplicate",
      label: "Duplicate",
      icon: <CopyOutlined />,
      onClick: () => handleDuplicate(flow.id),
    },
    { type: "divider" as const },
    {
      key: "delete",
      label: "Delete",
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => handleDelete(flow.id),
    },
  ];

  const grouped = groupFlowsByDate(Array.isArray(flows) ? flows : []);

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
              className="h-11 px-6 rounded-full bg-primary text-white text-sm font-bold shadow-fab bg-transparent border-0 appearance-none cursor-pointer"
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
        <SearchBar placeholder="Search recent flows & shapes" />

        {/* View toggle header */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {DATE_GROUP_ORDER.find((g) => grouped[g].length > 0) || "Recent"}
          </div>
          <ViewToggleLocal view={view} onChange={setView} />
        </div>

        {/* Groups */}
        {DATE_GROUP_ORDER.filter((g) => grouped[g].length > 0).map(
          (groupName, groupIdx) => (
            <div key={groupName}>
              {groupIdx > 0 && <SectionLabel>{groupName}</SectionLabel>}

              {view === "list" ? (
                <>
                  {grouped[groupName].map((flow: any, idx: number) => {
                    const color =
                      FLOW_COLORS[flows.indexOf(flow) % FLOW_COLORS.length];
                    return (
                      <Dropdown
                        key={flow.id}
                        menu={{ items: getMenuItems(flow) }}
                        trigger={["click"]}
                        open={menuOpenId === flow.id}
                        onOpenChange={(open) =>
                          setMenuOpenId(open ? flow.id : null)
                        }
                      >
                        <div>
                          <ListItem
                            title={flow.name}
                            subtitle={`Edited ${timeAgo(flow.updatedAt)}`}
                            color={color}
                            onClick={() => handleEdit(flow.id)}
                            onMenu={() =>
                              setMenuOpenId(
                                menuOpenId === flow.id ? null : flow.id,
                              )
                            }
                          />
                        </div>
                      </Dropdown>
                    );
                  })}
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {grouped[groupName].map((flow: any) => {
                    const color =
                      FLOW_COLORS[flows.indexOf(flow) % FLOW_COLORS.length];
                    return (
                      <div
                        key={flow.id}
                        className="relative rounded-2xl bg-card border border-border overflow-hidden shadow-card"
                      >
                        <button
                          onClick={() => handleEdit(flow.id)}
                          className="w-full text-left bg-transparent border-0 p-0 appearance-none cursor-pointer"
                        >
                          <div
                            className="h-24"
                            style={{ background: `${color}14` }}
                          >
                            {flow.thumbnail ? (
                              <img
                                src={flow.thumbnail}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <MiniFlow color={color} />
                            )}
                          </div>
                          <div className="p-3 pr-9">
                            <div className="font-semibold text-[13px] truncate">
                              {flow.name}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              Edited {timeAgo(flow.updatedAt)}
                            </div>
                          </div>
                        </button>
                        <Dropdown
                          menu={{ items: getMenuItems(flow) }}
                          trigger={["click"]}
                        >
                          <button
                            type="button"
                            aria-label="More options"
                            onClick={(e) => e.stopPropagation()}
                            className="absolute bottom-2 right-2 w-7 h-7 rounded-lg bg-secondary flex items-center justify-center bg-transparent border-0 p-0 appearance-none cursor-pointer"
                            style={{ background: "var(--secondary, #E7F6F0)" }}
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                        </Dropdown>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ),
        )}
      </div>
    </div>
  );
}
