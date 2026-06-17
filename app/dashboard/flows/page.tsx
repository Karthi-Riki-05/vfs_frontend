"use client";

import React, { useEffect, useState } from "react";
import {
  Row,
  Col,
  Input,
  Select,
  Pagination,
  Spin,
  Table,
  Button,
  Dropdown,
  Typography,
  Tag,
} from "antd";
import {
  ModalShell,
  ModalHeader,
  ModalFooter,
} from "@/components/common/Modal";
import { Field, FieldInput } from "@/components/common/Field";
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  StarOutlined,
  StarFilled,
  CopyOutlined,
  DeleteOutlined,
  MoreOutlined,
  FormOutlined,
  FolderAddOutlined,
  FolderOutlined,
  ShareAltOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import {
  MoreHorizontal,
  List as ListIcon,
  LayoutGrid,
  Search,
  Filter,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import SectionHeader from "@/components/common/SectionHeader";
import EmptyState from "@/components/common/EmptyState";
import FlowCard from "@/components/flows/FlowCard";
import ShareFlowModal from "@/components/flows/ShareFlowModal";
import AssignProjectModal from "@/components/flows/AssignProjectModal";
import FlowMenuModal from "@/components/flows/FlowMenuModal";
import { useFlows } from "@/hooks/useFlows";
import { useTabFocus } from "@/hooks/useTabFocus";
import { createNewFlow } from "@/lib/flow";
import api from "@/lib/axios";
import { message } from "antd";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { TEMPLATE_CATEGORIES } from "@/lib/templateCategories";
import TemplateBrowser from "@/components/templates/TemplateBrowser";
import FlowPackBanner from "@/components/flows/FlowPackBanner";

const { Text } = Typography;

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

const TEMPLATE_CHIP_BG: Record<string, string> = {
  flowchart: "#E7F6F0",
  mindmap: "#f5f3ff",
  charts: "#fef3c7",
  business: "#eff6ff",
  software: "#fef2f2",
  wireframe: "#f3f4f6",
};

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

/* ── Local Atoms (defined here to avoid collision with parallel agents) ── */

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
    <div className="flex p-1 rounded-2xl bg-secondary">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex-1 h-10 rounded-xl text-sm font-semibold transition bg-transparent border-0 p-0 appearance-none cursor-pointer ${
            value === t.id
              ? "bg-card text-primary shadow-sm"
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
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex items-center gap-2 h-11 px-3 rounded-2xl bg-card border border-border mb-4">
      <Search className="w-4 h-4 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
    fetchFlows,
    deleteFlow,
    duplicateFlow,
    favoriteFlow,
    removeSharedFlow,
  } = useFlows();
  useTabFocus(fetchFlows);
  const router = useRouter();
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [tab, setTab] = useState<"templates" | "all">("all");
  const [templateBrowserOpen, setTemplateBrowserOpen] = useState(false);
  const [templateBrowserCategory, setTemplateBrowserCategory] = useState("All");

  const displayFlows = Array.isArray(flows) ? flows : [];

  // Rename state
  const [renameModal, setRenameModal] = React.useState<{
    open: boolean;
    id: string;
    name: string;
  }>({ open: false, id: "", name: "" });

  // Assign to project state
  const [assignModal, setAssignModal] = React.useState<{
    open: boolean;
    flowId: string | null;
    currentProjectId?: string | null;
  }>({ open: false, flowId: null });

  // Share state
  const [shareModal, setShareModal] = React.useState<{
    open: boolean;
    flow: any | null;
  }>({ open: false, flow: null });

  // Mobile flow-options bottom-sheet state
  const [flowMenu, setFlowMenu] = React.useState<{
    open: boolean;
    flow: any | null;
  }>({ open: false, flow: null });

  // Load saved view mode
  useEffect(() => {
    const saved = localStorage.getItem("flows_view_mode");
    if (saved === "grid" || saved === "list") setViewMode(saved);
  }, []);

  const handleViewChange = (v: "grid" | "list") => {
    setViewMode(v);
    localStorage.setItem("flows_view_mode", v);
  };

  const handleEdit = (id: string) => {
    window.open(`/dashboard/flows/${id}`, "_blank");
  };

  const handleNewFlow = () => {
    createNewFlow();
  };

  const handleRename = async () => {
    if (!renameModal.name.trim()) return;
    try {
      await api.put(`/flows/${renameModal.id}`, {
        name: renameModal.name.trim(),
      });
      message.success("Flow renamed");
      setRenameModal({ open: false, id: "", name: "" });
      fetchFlows();
    } catch {
      message.error("Failed to rename flow");
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
      onClick: () => favoriteFlow(flow.id),
    },
    {
      key: "rename",
      label: "Rename",
      icon: <FormOutlined />,
      onClick: () =>
        setRenameModal({ open: true, id: flow.id, name: flow.name }),
    },
    {
      key: "assign-project",
      label: "Assign to Project",
      icon: <FolderAddOutlined />,
      onClick: () =>
        setAssignModal({
          open: true,
          flowId: flow.id,
          currentProjectId: flow.projectId,
        }),
    },
    {
      key: "share",
      label: "Share",
      icon: <ShareAltOutlined />,
      onClick: () => setShareModal({ open: true, flow }),
    },
    {
      key: "duplicate",
      label: "Duplicate",
      icon: <CopyOutlined />,
      onClick: () => duplicateFlow(flow.id),
    },
    { type: "divider" as const },
    {
      key: "delete",
      label: "Delete",
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => deleteFlow(flow.id),
    },
  ];

  const getSharedMenuItems = (flow: any) => {
    const items: any[] = [];
    if (flow.accessType === "edit") {
      items.push({
        key: "edit",
        label: "Edit",
        icon: <EditOutlined />,
        onClick: () => handleEdit(flow.id),
      });
    } else {
      items.push({
        key: "open",
        label: "Open (view only)",
        icon: <EyeOutlined />,
        onClick: () => handleEdit(flow.id),
      });
    }
    items.push({
      key: "favorite",
      label: flow.isFavorite ? "Remove Favorite" : "Mark as Favorite",
      icon: flow.isFavorite ? (
        <StarFilled style={{ color: "#FAAD14" }} />
      ) : (
        <StarOutlined />
      ),
      onClick: () => favoriteFlow(flow.id),
    });
    if (flow.accessType === "edit") {
      items.push({
        key: "duplicate",
        label: "Duplicate",
        icon: <CopyOutlined />,
        onClick: () => duplicateFlow(flow.id),
      });
    }
    items.push({ type: "divider" as const });
    if (flow.shareId) {
      items.push({
        key: "remove-shared",
        label: "Remove from Shared",
        icon: <ShareAltOutlined />,
        danger: true,
        onClick: () => removeSharedFlow(flow.id, flow.shareId),
      });
    }
    return items;
  };

  const listColumns = [
    {
      title: "",
      dataIndex: "thumbnail",
      key: "thumbnail",
      width: 60,
      render: (thumb: string, record: any) => (
        <div
          style={{
            width: 48,
            height: 36,
            borderRadius: 6,
            overflow: "hidden",
            background: "#F8F9FA",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
          onClick={() => handleEdit(record.id)}
        >
          {thumb ? (
            <img
              src={thumb}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span style={{ fontSize: 16, color: "#BFBFBF" }}>&#9633;</span>
          )}
        </div>
      ),
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name: string, record: any) => (
        <div
          style={{ cursor: "pointer" }}
          onClick={() => handleEdit(record.id)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Text strong style={{ fontSize: 14 }}>
              {name}
            </Text>
            {record.isFavorite && (
              <StarFilled style={{ color: "#FAAD14", fontSize: 14 }} />
            )}
            {(record.shareCount ?? 0) > 0 && (
              <Tag color="green" style={{ fontSize: 11 }}>
                <ShareAltOutlined /> Shared with {record.shareCount}
              </Tag>
            )}
          </div>
          {record.projectName && (
            <Text style={{ fontSize: 11, color: "#8C8C8C" }}>
              <FolderOutlined style={{ marginRight: 4 }} />
              {record.projectName}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: "Last Modified",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 180,
      render: (d: string) => (
        <Text type="secondary" style={{ fontSize: 13 }}>
          {timeAgo(d)}
        </Text>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 50,
      render: (_: any, record: any) => (
        <Dropdown menu={{ items: getMenuItems(record) }} trigger={["click"]}>
          <Button
            type="text"
            icon={<MoreOutlined />}
            size="small"
            onClick={(e) => e.stopPropagation()}
          />
        </Dropdown>
      ),
    },
  ];

  const sharedListColumns = [
    {
      title: "",
      dataIndex: "thumbnail",
      key: "thumbnail",
      width: 60,
      render: (thumb: string, record: any) => (
        <div
          style={{
            width: 48,
            height: 36,
            borderRadius: 6,
            overflow: "hidden",
            background: "#F8F9FA",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
          onClick={() => handleEdit(record.id)}
        >
          {thumb ? (
            <img
              src={thumb}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span style={{ fontSize: 16, color: "#BFBFBF" }}>&#9633;</span>
          )}
        </div>
      ),
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name: string, record: any) => (
        <div
          style={{ cursor: "pointer" }}
          onClick={() => handleEdit(record.id)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Text strong style={{ fontSize: 14 }}>
              {name}
            </Text>
            <Tag
              color={record.accessType === "edit" ? "green" : "blue"}
              style={{ fontSize: 11 }}
            >
              {record.accessType === "edit" ? "Can edit" : "View only"}
            </Tag>
          </div>
          {record.sharedByName && (
            <Text style={{ fontSize: 11, color: "#1890FF" }}>
              <ShareAltOutlined style={{ marginRight: 4 }} />
              Shared by {record.sharedByName}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: "Last Modified",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 180,
      render: (d: string) => (
        <Text type="secondary" style={{ fontSize: 13 }}>
          {timeAgo(d)}
        </Text>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 50,
      render: (_: any, record: any) => (
        <Dropdown
          menu={{ items: getSharedMenuItems(record) }}
          trigger={["click"]}
        >
          <Button
            type="text"
            icon={<MoreOutlined />}
            size="small"
            onClick={(e) => e.stopPropagation()}
          />
        </Dropdown>
      ),
    },
  ];

  const handleTemplateInsert = async (xml: string, name: string) => {
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
      message.error("Failed to create flow from template");
    }
  };

  return (
    <div className="tw">
      {/* ══════════ MOBILE (<1024px) — prototype design ══════════ */}
      <div className="lg:hidden px-5 pt-3 pb-28 min-h-screen bg-background">
        {/* Search bar */}
        <LocalSearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search flows and templates"
        />

        {/* New Flow CTA */}
        <button
          onClick={handleNewFlow}
          className="w-full mb-3 h-12 rounded-2xl bg-primary text-white font-bold text-sm inline-flex items-center justify-center gap-2 shadow-[var(--shadow-fab)] bg-transparent border-0 p-0 appearance-none cursor-pointer"
          style={{ background: "var(--color-primary, #34A881)", color: "#fff" }}
        >
          <Plus className="w-4 h-4" /> New Flow
        </button>

        {/* Tabs: Templates | All Flows */}
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

        {/* Templates tab */}
        {tab === "templates" ? (
          <>
            <div className="flex items-center justify-between mt-4 mb-3">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                START FROM A TEMPLATE
              </span>
              <button
                onClick={() => {
                  setTemplateBrowserCategory("All");
                  setTemplateBrowserOpen(true);
                }}
                className="text-xs font-semibold text-primary bg-transparent border-0 p-0 appearance-none cursor-pointer"
              >
                Browse All →
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {TEMPLATE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setTemplateBrowserCategory(cat.category);
                    setTemplateBrowserOpen(true);
                  }}
                  className="rounded-2xl bg-card border border-border overflow-hidden text-left shadow-[var(--shadow-card)] active:scale-[0.98] transition bg-transparent p-0 appearance-none cursor-pointer"
                >
                  <div
                    className="h-28 relative flex items-center justify-center"
                    style={{
                      background:
                        (TEMPLATE_CHIP_BG[cat.id] || cat.color) + "30",
                    }}
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
        ) : /* All Flows tab */ loading ? (
          <div className="flex items-center justify-center py-16">
            <Spin size="large" />
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
                      className="w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
                      style={{
                        background:
                          MOBILE_THUMB_GRADIENTS[
                            displayFlows.indexOf(flow) %
                              MOBILE_THUMB_GRADIENTS.length
                          ],
                      }}
                    >
                      {flow.thumbnail ? (
                        <img
                          src={flow.thumbnail}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl">📄</span>
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
                      className="w-9 h-9 rounded-lg flex items-center justify-center border-0 p-0 appearance-none cursor-pointer"
                      style={{
                        background: "var(--color-secondary, #E7F6F0)",
                      }}
                    >
                      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-3">
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
                        className="h-24 flex items-center justify-center text-3xl"
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
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          "📄"
                        )}
                      </div>
                      <div className="p-3 pr-9">
                        <div className="font-semibold text-[13px] truncate text-foreground">
                          {flow.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Edited {timeAgo(flow.updatedAt)}
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFlowMenu({ open: true, flow });
                      }}
                      className="absolute bottom-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center border-0 p-0 appearance-none cursor-pointer"
                      style={{
                        background: "var(--color-secondary, #E7F6F0)",
                      }}
                    >
                      <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ))}
                {/* Dashed "New Flow" card */}
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

            {total > pageSize && (
              <div className="text-center mt-5">
                <Pagination
                  current={page}
                  pageSize={pageSize}
                  total={total}
                  onChange={(p, ps) => {
                    setPage(p);
                    setPageSize(ps);
                  }}
                  size="small"
                />
              </div>
            )}
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
              className="h-11 px-6 rounded-full font-bold text-sm text-white shadow-[var(--shadow-fab)] bg-transparent border-0 p-0 appearance-none cursor-pointer"
              style={{
                background: "var(--color-primary, #34A881)",
                color: "#fff",
                padding: "0 24px",
              }}
            >
              + Create Flow
            </button>
          </div>
        )}
      </div>

      {/* ══════════ DESKTOP (≥1024px) ══════════ */}
      <div className="hidden lg:block" style={{ padding: isMobile ? 16 : 24 }}>
        <FlowPackBanner />
        <SectionHeader
          title="MY FLOWS"
          right={
            <>
              <Input
                prefix={<SearchOutlined style={{ color: "#8C8C8C" }} />}
                placeholder="Search flows..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                allowClear
                style={{
                  width: isMobile ? "100%" : 220,
                  backgroundColor: "#F8F9FA",
                  borderRadius: 8,
                  border: "none",
                }}
                variant="borderless"
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: isMobile ? "100%" : "auto",
                  marginBottom: isMobile ? 4 : 0,
                }}
              >
                <Select
                  aria-label="Sort flows"
                  value={sort}
                  onChange={setSort}
                  style={{
                    width: isMobile ? "100%" : 150,
                    flex: isMobile ? 1 : "none",
                  }}
                  options={[
                    { label: "Last Modified", value: "updatedAt" },
                    { label: "Name", value: "name" },
                    { label: "Created", value: "createdAt" },
                  ]}
                />
                <div style={{ flexShrink: 0 }}>
                  <LocalViewToggle
                    view={viewMode}
                    onChange={handleViewChange}
                  />
                </div>
              </div>
              <button
                onClick={handleNewFlow}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: isMobile ? "8px 16px" : "6px 16px",
                  backgroundColor: "#34A881",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                  width: isMobile ? "100%" : "auto",
                  justifyContent: "center",
                  minHeight: 44,
                }}
              >
                <PlusOutlined /> New Flow
              </button>
            </>
          }
        />

        {/* Template Section */}
        {/* TODO: Owner decided 2026-06-15 — ALIGN desktop to prototype
            Templates/All-Flows tabs + MiniFlow template cards ("Nk uses").
            This ERP category-icon row is the interim model until that screen
            port lands (queued as its own screen task). See DESIGN.md §7.3/§7.4. */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <Text
              strong
              style={{
                fontSize: 12,
                color: "#8C8C8C",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              START FROM A TEMPLATE
            </Text>
            <button
              onClick={() => {
                setTemplateBrowserCategory("All");
                setTemplateBrowserOpen(true);
              }}
              style={{
                fontSize: 12,
                color: "#34A881",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
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

          {/* Desktop: 6-col grid with bigger cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: 14,
            }}
          >
            {TEMPLATE_CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                onClick={() => {
                  setTemplateBrowserCategory(cat.category);
                  setTemplateBrowserOpen(true);
                }}
                style={{
                  padding: "20px 8px 14px",
                  borderRadius: 16,
                  background: cat.color + "30",
                  border: "1px solid transparent",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 16px rgba(0,0,0,0.1)";
                  e.currentTarget.style.borderColor = "#E0E0E0";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.borderColor = "transparent";
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 18,
                    background: cat.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "transform 0.2s",
                  }}
                >
                  <div style={{ width: 36, height: 36 }}>
                    {cat.icon(cat.iconColor)}
                  </div>
                </div>
                <Text
                  strong
                  style={{ fontSize: 12, color: "#333", whiteSpace: "nowrap" }}
                >
                  {cat.label}
                </Text>
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "100px 0" }}>
            <Spin size="large" />
          </div>
        ) : displayFlows.length > 0 ? (
          <>
            {viewMode === "grid" ? (
              <Row gutter={[16, 16]}>
                {displayFlows.map((flow: any, index: number) => (
                  <Col xs={24} sm={12} md={8} lg={6} key={flow.id}>
                    <FlowCard
                      flow={flow}
                      onEdit={handleEdit}
                      onDelete={deleteFlow}
                      onDuplicate={duplicateFlow}
                      onFavorite={favoriteFlow}
                      onRename={(id, name) =>
                        setRenameModal({ open: true, id, name })
                      }
                      onAssignProject={(id) =>
                        setAssignModal({
                          open: true,
                          flowId: id,
                          currentProjectId: flow.projectId,
                        })
                      }
                      onShare={(f) => setShareModal({ open: true, flow: f })}
                      variant="default"
                      placeholderColor={
                        PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length]
                      }
                    />
                  </Col>
                ))}
              </Row>
            ) : (
              <div
                style={{
                  overflowX: "auto",
                  background: "#fff",
                  borderRadius: 12,
                }}
              >
                <Table
                  dataSource={Array.isArray(displayFlows) ? displayFlows : []}
                  columns={listColumns}
                  rowKey="id"
                  pagination={false}
                  size="middle"
                  scroll={{ x: 600 }}
                />
              </div>
            )}
            {total > pageSize && (
              <div
                style={{
                  textAlign: "center",
                  marginTop: 24,
                  overflowX: "auto",
                }}
              >
                <Pagination
                  current={page}
                  pageSize={pageSize}
                  total={total}
                  onChange={(p, ps) => {
                    setPage(p);
                    setPageSize(ps);
                  }}
                  showSizeChanger
                  size={isMobile ? "small" : "default"}
                />
              </div>
            )}
          </>
        ) : (
          <EmptyState
            title="No flows yet"
            description="Use the New Flow button above to create your first flow"
          />
        )}

        {/* Shared With Me Section */}
        {Array.isArray(sharedFlows) && sharedFlows.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <SectionHeader title="SHARED WITH ME" />
            {viewMode === "grid" ? (
              <Row gutter={[16, 16]}>
                {sharedFlows.map((flow: any, index: number) => (
                  <Col xs={24} sm={12} md={8} lg={6} key={flow.id}>
                    <FlowCard
                      flow={flow}
                      onEdit={handleEdit}
                      onFavorite={favoriteFlow}
                      onDuplicate={duplicateFlow}
                      onRemoveShared={removeSharedFlow}
                      variant="shared"
                      placeholderColor={
                        PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length]
                      }
                    />
                  </Col>
                ))}
              </Row>
            ) : (
              <div
                style={{
                  overflowX: "auto",
                  background: "#fff",
                  borderRadius: 12,
                }}
              >
                <Table
                  dataSource={Array.isArray(sharedFlows) ? sharedFlows : []}
                  columns={sharedListColumns}
                  rowKey="id"
                  pagination={false}
                  size="middle"
                  scroll={{ x: 600 }}
                />
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

      {/* Rename Modal — new_design ModalShell (prototype 1798–1808) */}
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

      {/* Assign to Project Modal */}
      <AssignProjectModal
        open={assignModal.open}
        flowId={assignModal.flowId}
        currentProjectId={assignModal.currentProjectId}
        onClose={() => setAssignModal({ open: false, flowId: null })}
        onSuccess={fetchFlows}
      />

      {/* Share Flow Modal */}
      <ShareFlowModal
        open={shareModal.open}
        flow={shareModal.flow}
        onClose={() => setShareModal({ open: false, flow: null })}
        onSuccess={fetchFlows}
      />

      {/* Mobile flow-options bottom-sheet (new_design FlowMenuModal 1773–1795) */}
      <FlowMenuModal
        open={flowMenu.open}
        flow={flowMenu.flow}
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
    </div>
  );
}
