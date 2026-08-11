"use client";

import React, { useState, useEffect } from "react";
import { Row, Col, Typography } from "antd";
import { toast } from "sonner";
import {
  ModalShell,
  ModalHeader,
  ModalFooter,
} from "@/components/common/Modal";
import { Field, FieldInput } from "@/components/common/Field";
import { VCShimmerSkeleton } from "@/components/ui/VCShimmerSkeleton";
import {
  FileAddOutlined,
  ProjectOutlined,
  MoreOutlined,
  FolderOutlined,
} from "@ant-design/icons";
import FlowCollection from "@/components/flows/FlowCollection";
import { useFlowView } from "@/hooks/useFlowView";
import { useFlowActions } from "@/hooks/useFlowActions";
import SectionHeader from "@/components/common/SectionHeader";
import ViewToggle from "@/components/common/ViewToggle";
import EmptyState from "@/components/common/EmptyState";
import { useFlows, useLockState } from "@/hooks/useFlows";
import FlowListLockModal from "@/components/flows/FlowListLockModal";
import { useRouter } from "next/navigation";
import { createNewFlow } from "@/lib/flow";
import api from "@/lib/axios";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  StarOutlined,
  StarFilled,
  HeartOutlined,
  HeartFilled,
  FormOutlined,
  FolderAddOutlined,
} from "@ant-design/icons";

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
  if (diffMins < 60)
    return `${diffMins} ${diffMins === 1 ? "min" : "mins"} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24)
    return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function RecentDocuments() {
  const {
    flows,
    loading,
    fetchFlows,
    deleteFlow,
    duplicateFlow,
    favoriteFlow,
  } = useFlows();
  const [view, handleViewChange] = useFlowView("grid");
  const router = useRouter();
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const { lockState } = useLockState();
  const isLocked = lockState.overLimitLocked;

  // Rename state
  const [renameModal, setRenameModal] = useState<{
    open: boolean;
    id: string;
    name: string;
  }>({
    open: false,
    id: "",
    name: "",
  });

  // Assign to project state
  const [assignModal, setAssignModal] = useState<{
    open: boolean;
    flowId: string | null;
    currentProjectId?: string | null;
  }>({
    open: false,
    flowId: null,
  });

  const handleEdit = (id: string, flow?: any) => {
    if (isLocked || !!flow?.markedForDowngrade) {
      setLockModalOpen(true);
      return;
    }
    window.open(`/dashboard/flows/${id}`, "_blank");
  };

  // Same seven options as /dashboard/flows. This block previously rendered
  // whatever `FlowCard` built in grid view and a different inline menu in list
  // view, so the dashboard's own two views disagreed with each other.
  const actions = useFlowActions({
    onChanged: fetchFlows,
    onEdit: (id, flow) => handleEdit(id, flow),
    isLocked,
  });

  const handleDelete = async (id: string) => {
    await deleteFlow(id);
  };
  const handleDuplicate = async (id: string) => {
    await duplicateFlow(id);
  };
  const handleFavorite = async (id: string) => {
    await favoriteFlow(id);
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

  const handleCreateNew = () => {
    if (isLocked) {
      setLockModalOpen(true);
      return;
    }
    createNewFlow();
  };

  // List view menu items
  const getMoreItems = (flow: any) => [
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
        <HeartFilled style={{ color: "#FF4D6A" }} />
      ) : (
        <HeartOutlined />
      ),
      onClick: () => handleFavorite(flow.id),
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

  if (loading) {
    return (
      <div style={{ marginTop: 8 }}>
        <VCShimmerSkeleton variant="card" count={4} />
      </div>
    );
  }

  return (
    <div style={{ marginTop: 8 }}>
      <SectionHeader
        title="MY FLOWS"
        right={<ViewToggle view={view} onChange={handleViewChange} />}
      />

      {flows.length === 0 ? (
        <EmptyState
          title="No flows yet"
          description="Create your first flow to get started. Choose a template above or start from scratch."
          actionText="Create New Flow"
          onAction={handleCreateNew}
          icon={<FileAddOutlined style={{ fontSize: 48, color: "#3CB371" }} />}
        />
      ) : (
        <FlowCollection
          flows={flows}
          view={view}
          onOpen={(id, flow) => handleEdit(id, flow)}
          onMenu={actions.openMenu}
          isLocked={isLocked}
        />
      )}

      {actions.modals}

      <FlowListLockModal
        open={lockModalOpen}
        onClose={() => setLockModalOpen(false)}
        isLocked={isLocked}
        flowUsed={lockState.flowUsed}
        totCount={lockState.totCount}
      />
    </div>
  );
}
