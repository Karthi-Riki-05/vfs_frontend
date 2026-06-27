"use client";

import React, { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { EditOutlined, HeartFilled } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import {
  Heart,
  MoreHorizontal,
  Workflow,
  ChevronRight,
  List as ListIcon,
  LayoutGrid,
} from "lucide-react";
import { flowsApi } from "@/api/flows.api";
import { timeAgo } from "@/lib/flowUtils";
import { useTabFocus } from "@/hooks/useTabFocus";
import { useAppContext } from "@/context/AppContext";
import { onWorkspaceFlush } from "@/lib/workspaceCache";
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

// ─── Local atom components ────────────────────────────────────────────────────

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
      <Heart className="w-4 h-4 text-[#F85729] fill-[#F85729] shrink-0" />
      {onMenu ? (
        <button
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
export default function FavouritesPage() {
  const router = useRouter();
  const { activeTeamId, hydrated } = useAppContext();
  const [flows, setFlows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "grid">("grid");

  // activeTeamId in deps → re-scopes + refetches the favourites bucket on
  // switch. The X-Team-Context header is attached by the axios interceptor,
  // so the refetch automatically targets the newly active workspace.
  const fetchFavourites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await flowsApi.getFavorites();
      const d = res.data?.data || res.data || {};
      setFlows(d.flows || (Array.isArray(d) ? d : []));
    } catch {
      setFlows([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTeamId]);

  useEffect(() => {
    // Wait for AppContext to hydrate so we don't fire once with teamId=null
    // and then again once localStorage is read.
    if (!hydrated) return;
    fetchFavourites();
  }, [fetchFavourites, hydrated]);
  useTabFocus(fetchFavourites);
  // Drop the previous workspace's favourites the instant the context switches
  // so another bucket's starred flows never flash before the in-place refetch.
  useEffect(() => onWorkspaceFlush(() => setFlows([])), []);

  const handleEdit = (id: string) => {
    window.open(`/dashboard/flows/${id}`, "_blank");
  };

  // All items here are favourites — toggling removes them from the list.
  const toggleFavourite = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await flowsApi.toggleFavorite(id, false);
      setFlows((prev) => prev.filter((f) => f.id !== id));
      toast.success("Removed from favourites");
    } catch {
      toast.error("Failed to update favourite");
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
      key: "unfavorite",
      label: "Remove from Favourites",
      icon: <HeartFilled style={{ color: "#F85729" }} />,
      onClick: () => toggleFavourite(flow.id),
    },
  ];

  // ─── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="tw min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-5 pt-3">
          <div className="h-9 w-48 rounded-lg bg-card border border-border mb-5 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-[150px] rounded-2xl bg-card border border-border animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tw min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-5 pt-3 pb-24">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="min-w-0">
            <h1 className="text-[22px] sm:text-[28px] font-extrabold text-foreground leading-tight">
              Favourites
            </h1>
            <p className="text-sm text-muted-foreground">
              {flows.length} starred {flows.length === 1 ? "flow" : "flows"}
            </p>
          </div>
          {flows.length > 0 && (
            <ViewToggleLocal view={view} onChange={setView} />
          )}
        </div>

        {/* Empty state */}
        {flows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#fef2f2] flex items-center justify-center text-4xl mb-4">
              ❤️
            </div>
            <div className="text-base font-bold text-foreground mb-1">
              No favourites yet
            </div>
            <div className="text-sm text-muted-foreground mb-5">
              Tap the heart on any flow to save it here
            </div>
            <button
              onClick={() => router.push("/dashboard/flows")}
              className="h-11 px-6 rounded-full text-white text-sm font-bold shadow-fab bg-transparent border-0 appearance-none cursor-pointer"
              style={{ background: "linear-gradient(135deg,#34A881,#1F7D5E)" }}
            >
              Browse Flows →
            </button>
          </div>
        ) : view === "grid" ? (
          /* Grid view */
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {flows.map((flow: any, index: number) => {
              const color = FLOW_COLORS[index % FLOW_COLORS.length];
              return (
                <div
                  key={flow.id}
                  className="relative rounded-2xl bg-card border border-border overflow-hidden shadow-card"
                >
                  {/* Thumbnail area */}
                  <div
                    className="h-24 relative overflow-hidden"
                    style={{ background: `${color}14` }}
                  >
                    <button
                      onClick={() => handleEdit(flow.id)}
                      className="w-full h-full block bg-transparent border-0 p-0 appearance-none cursor-pointer"
                      aria-label={`Open ${flow.name}`}
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
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavourite(flow.id, e);
                      }}
                      title="Remove from favourites"
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center border-0 p-0 appearance-none cursor-pointer z-10"
                    >
                      <Heart className="w-3.5 h-3.5 text-[#F85729] fill-[#F85729]" />
                    </button>
                  </div>
                  {/* Info row */}
                  <div className="flex items-center gap-2 px-3 py-2.5 min-w-0">
                    <button
                      onClick={() => handleEdit(flow.id)}
                      className="flex-1 min-w-0 text-left bg-transparent border-0 p-0 appearance-none cursor-pointer overflow-hidden"
                    >
                      <div className="font-semibold text-[13px] truncate leading-tight">
                        {flow.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                        Edited {timeAgo(flow.updatedAt)}
                      </div>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label="More options"
                          onClick={(e) => e.stopPropagation()}
                          className="tw w-8 h-8 shrink-0 rounded-lg hover:bg-secondary flex items-center justify-center border-0 p-0 appearance-none cursor-pointer"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="tw">
                        {(getMenuItems(flow) as any[]).map(
                          (item: any, i: number) => (
                            <DropdownMenuItem
                              key={item.key ?? i}
                              onSelect={item.onClick}
                              className={
                                item.danger
                                  ? "text-destructive focus:text-destructive"
                                  : ""
                              }
                            >
                              {item.icon}
                              {item.label}
                            </DropdownMenuItem>
                          ),
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List view */
          <div>
            {flows.map((flow: any, index: number) => {
              const color = FLOW_COLORS[index % FLOW_COLORS.length];
              return (
                <div
                  key={flow.id}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border mb-2"
                >
                  <button
                    onClick={() => handleEdit(flow.id)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left bg-transparent border-0 p-0 appearance-none cursor-pointer"
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${color}1a` }}
                    >
                      <Workflow className="w-5 h-5" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">
                        {flow.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        Edited {timeAgo(flow.updatedAt)}
                      </div>
                    </div>
                  </button>
                  <Heart className="w-4 h-4 text-[#F85729] fill-[#F85729] shrink-0" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => e.stopPropagation()}
                        className="tw w-9 h-9 rounded-lg hover:bg-secondary flex items-center justify-center bg-transparent border-0 p-0 appearance-none cursor-pointer"
                      >
                        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="tw">
                      {(getMenuItems(flow) as any[]).map(
                        (item: any, i: number) => (
                          <DropdownMenuItem
                            key={item.key ?? i}
                            onSelect={item.onClick}
                            className={
                              item.danger
                                ? "text-destructive focus:text-destructive"
                                : ""
                            }
                          >
                            {item.icon}
                            {item.label}
                          </DropdownMenuItem>
                        ),
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
