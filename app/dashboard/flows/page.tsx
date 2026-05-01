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
  Modal,
  Tag,
} from "antd";
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
  LockOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import SectionHeader from "@/components/common/SectionHeader";
import ViewToggle from "@/components/common/ViewToggle";
import EmptyState from "@/components/common/EmptyState";
import FlowCard from "@/components/flows/FlowCard";
import ShareFlowModal from "@/components/flows/ShareFlowModal";
import AssignProjectModal from "@/components/flows/AssignProjectModal";
import { useFlows } from "@/hooks/useFlows";
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
  const router = useRouter();
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [templateBrowserOpen, setTemplateBrowserOpen] = useState(false);
  const [templateBrowserCategory, setTemplateBrowserCategory] = useState("All");

  // Drafts have been removed — show every flow returned by the API.
  const displayFlows = flows || [];

  // Rename state
  const [renameModal, setRenameModal] = React.useState<{
    open: boolean;
    id: string;
    name: string;
  }>({
    open: false,
    id: "",
    name: "",
  });

  // Assign to project state
  const [assignModal, setAssignModal] = React.useState<{
    open: boolean;
    flowId: string | null;
    currentProjectId?: string | null;
  }>({
    open: false,
    flowId: null,
  });

  // Share state
  const [shareModal, setShareModal] = React.useState<{
    open: boolean;
    flow: any | null;
  }>({
    open: false,
    flow: null,
  });

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
    <div style={{ padding: isMobile ? 16 : 24 }}>
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
            <Select
              value={sort}
              onChange={setSort}
              style={{ width: isMobile ? "100%" : 150 }}
              options={[
                { label: "Last Modified", value: "updatedAt" },
                { label: "Name", value: "name" },
                { label: "Created", value: "createdAt" },
              ]}
            />
            <ViewToggle view={viewMode} onChange={handleViewChange} />
            <button
              onClick={handleNewFlow}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: isMobile ? "8px 16px" : "6px 16px",
                backgroundColor: "#3CB371",
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
              color: "#3CB371",
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
        {!isMobile && (
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
        )}

        {/* Mobile: 2-col card grid (was 3-col, but too cramped) */}
        {isMobile && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 10,
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
                  padding: "16px 6px 12px",
                  borderRadius: 14,
                  background: cat.color + "30",
                  border: "1px solid #F0F0F0",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: cat.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div style={{ width: 28, height: 28 }}>
                    {cat.icon(cat.iconColor)}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#333",
                    whiteSpace: "nowrap",
                  }}
                >
                  {cat.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <TemplateBrowser
        isOpen={templateBrowserOpen}
        initialCategory={templateBrowserCategory}
        onClose={() => setTemplateBrowserOpen(false)}
        onInsert={handleTemplateInsert}
      />

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
            <div style={{ overflowX: "auto", background: "#fff", borderRadius: 12 }}>
              <Table
                dataSource={displayFlows}
                columns={listColumns}
                rowKey="id"
                pagination={false}
                size="middle"
                style={{ minWidth: isMobile ? 600 : "auto" }}
              />
            </div>
          )}
          {total > pageSize && (
            <div style={{ textAlign: "center", marginTop: 24 }}>
              <Pagination
                current={page}
                pageSize={pageSize}
                total={total}
                onChange={(p, ps) => {
                  setPage(p);
                  setPageSize(ps);
                }}
                showSizeChanger
              />
            </div>
          )}
        </>
      ) : (
        <EmptyState
          title="No flows yet"
          description="Create your first flow to get started"
          actionText="Create Flow"
          onAction={handleNewFlow}
        />
      )}

      {/* Shared With Me Section */}
      {sharedFlows.length > 0 && (
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
            <div style={{ overflowX: "auto", background: "#fff", borderRadius: 12 }}>
              <Table
                dataSource={sharedFlows}
                columns={sharedListColumns}
                rowKey="id"
                pagination={false}
                size="middle"
                style={{ minWidth: isMobile ? 600 : "auto" }}
              />
            </div>
          )}
        </div>
      )}

      {/* Rename Modal */}
      <Modal
        title="Rename Flow"
        open={renameModal.open}
        onCancel={() => setRenameModal({ open: false, id: "", name: "" })}
        onOk={handleRename}
        okText="Save"
        okButtonProps={{ disabled: !renameModal.name.trim() }}
      >
        <Input
          value={renameModal.name}
          onChange={(e) =>
            setRenameModal({ ...renameModal, name: e.target.value })
          }
          onPressEnter={handleRename}
          maxLength={255}
          autoFocus
        />
      </Modal>

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
    </div>
  );
}
