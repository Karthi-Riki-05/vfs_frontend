"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Modal, Input, message, Checkbox, Dropdown } from "antd";
import {
  ArrowLeft,
  Plus,
  FilePlus2,
  Search,
  Workflow,
  MoreHorizontal,
  Pencil,
  ExternalLink,
  X,
} from "lucide-react";
import { projectsApi } from "@/api/projects.api";
import { flowsApi } from "@/api/flows.api";
import { useRouter, useParams } from "next/navigation";
import api from "@/lib/axios";
import { timeAgo } from "@/lib/flowUtils";

interface ProjectFlow {
  id: string;
  name: string;
  thumbnail?: string;
  updatedAt: string;
  isFavorite?: boolean;
  projectId?: string;
  projectName?: string;
}

/* tone cycle for the flow row icon tiles */
const ROW_TONES = [
  "var(--primary-deep)",
  "var(--blue)",
  "var(--orange)",
  "var(--coral)",
];

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;

  const [project, setProject] = useState<any>(null);
  const [flows, setFlows] = useState<ProjectFlow[]>([]);
  const [loading, setLoading] = useState(true);

  // Rename project modal
  const [renameOpen, setRenameOpen] = useState(false);
  const [projectName, setProjectName] = useState("");

  // Add existing flow modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [unassignedFlows, setUnassignedFlows] = useState<ProjectFlow[]>([]);
  const [selectedFlowIds, setSelectedFlowIds] = useState<string[]>([]);
  const [addSearch, setAddSearch] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  const fetchProject = useCallback(async () => {
    setLoading(true);
    try {
      const res = await projectsApi.get(projectId);
      const d = res.data?.data || res.data;
      setProject(d);
      setProjectName(d.name || "");
      setFlows(Array.isArray(d.flows) ? d.flows : []);
    } catch {
      message.error("Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const handleEdit = (id: string) => {
    window.open(`/dashboard/flows/${id}`, "_blank");
  };

  const handleRemoveFromProject = async (flowId: string) => {
    try {
      await projectsApi.unassignFlow(projectId, flowId);
      message.success("Flow removed from project");
      fetchProject();
    } catch {
      message.error("Failed to remove flow");
    }
  };

  const handleSaveName = async () => {
    if (!projectName.trim()) return;
    try {
      await projectsApi.update(projectId, { name: projectName.trim() });
      setRenameOpen(false);
      fetchProject();
    } catch {
      message.error("Failed to rename project");
    }
  };

  const handleCreateNewFlow = async () => {
    try {
      const res = await api.post("/flows", {
        name: "Untitled Flow",
        projectId,
      });
      const flow = res.data?.data || res.data;
      if (flow?.id) {
        window.open(`/dashboard/flows/${flow.id}`, "_blank");
        fetchProject();
      }
    } catch {
      message.error("Failed to create flow");
    }
  };

  // Add existing flow modal logic
  const openAddModal = async () => {
    setAddModalOpen(true);
    setAddLoading(true);
    setSelectedFlowIds([]);
    setAddSearch("");
    try {
      const res = await flowsApi.list({ limit: 100 });
      const d = res.data?.data || res.data || {};
      const allFlows: ProjectFlow[] = d.flows || (Array.isArray(d) ? d : []);
      setUnassignedFlows(allFlows.filter((f) => !f.projectId));
    } catch {
      setUnassignedFlows([]);
    } finally {
      setAddLoading(false);
    }
  };

  const handleAddFlows = async () => {
    if (selectedFlowIds.length === 0) return;
    setAddLoading(true);
    const results = await Promise.allSettled(
      selectedFlowIds.map((fid) => projectsApi.assignFlow(projectId, fid)),
    );
    const failures = results.filter(
      (r) => r.status === "rejected",
    ) as PromiseRejectedResult[];
    const succeeded = results.length - failures.length;

    if (succeeded > 0) message.success(`${succeeded} flow(s) added to project`);
    if (failures.length > 0) {
      const mismatch = failures.find(
        (f) => f.reason?.response?.data?.error?.code === "CONTEXT_MISMATCH",
      );
      if (mismatch) {
        message.error(
          `${failures.length} flow(s) couldn't be added — they belong to a different workspace (team vs. personal).`,
        );
      } else {
        const apiMsg = failures[0]?.reason?.response?.data?.error?.message;
        message.error(apiMsg || `Failed to add ${failures.length} flow(s)`);
      }
    }

    if (succeeded > 0) {
      setAddModalOpen(false);
      fetchProject();
    }
    setAddLoading(false);
  };

  const filteredUnassigned = unassignedFlows.filter(
    (f) => !addSearch || f.name.toLowerCase().includes(addSearch.toLowerCase()),
  );

  const flowMenu = (flow: ProjectFlow) => ({
    items: [
      {
        key: "open",
        label: "Open in editor",
        icon: <ExternalLink className="w-3.5 h-3.5" />,
        onClick: () => handleEdit(flow.id),
      },
      { type: "divider" as const },
      {
        key: "remove",
        label: "Remove from project",
        icon: <X className="w-3.5 h-3.5" />,
        danger: true,
        onClick: () => handleRemoveFromProject(flow.id),
      },
    ],
  });

  return (
    <div className="tw min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-5 lg:px-8 pt-6 pb-28 space-y-4">
        {/* Back row */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard/projects")}
            aria-label="Back to projects"
            className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center bg-transparent p-0 appearance-none cursor-pointer hover:bg-secondary"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Project
          </div>
        </div>

        {/* Gradient hero */}
        <div className="rounded-3xl bg-gradient-to-br from-primary to-primary-deep p-5 text-white relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
          <div className="flex items-start justify-between gap-3 relative">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
              <Workflow className="w-5 h-5" />
            </div>
            <button
              type="button"
              onClick={() => {
                setProjectName(project?.name || "");
                setRenameOpen(true);
              }}
              aria-label="Rename project"
              className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center bg-transparent border-0 p-0 appearance-none cursor-pointer"
            >
              <Pencil className="w-4 h-4 text-white" />
            </button>
          </div>
          <div className="mt-3 text-2xl font-extrabold tracking-tight">
            {project?.name || "Project"}
          </div>
          {project?.description ? (
            <div className="text-xs text-white/85 mt-1">
              {project.description}
            </div>
          ) : (
            <div className="text-xs text-white/85 mt-1">
              Updated {timeAgo(project?.updatedAt)}
            </div>
          )}
          <div className="mt-4 flex items-center gap-3 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-white/15 font-bold">
              {flows.length} {flows.length === 1 ? "flow" : "flows"}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleCreateNewFlow}
            className="flex-1 h-12 rounded-2xl bg-primary hover:bg-[#1F7D5E] text-white font-bold text-sm inline-flex items-center justify-center gap-2 shadow-[var(--shadow-fab)] border-0 appearance-none cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Flow
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="flex-1 h-12 rounded-2xl bg-card border border-border text-primary-deep font-bold text-sm inline-flex items-center justify-center gap-2 appearance-none cursor-pointer hover:bg-secondary"
          >
            <FilePlus2 className="w-4 h-4" /> Add Existing
          </button>
        </div>

        {/* Flows in this project */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Flows in this project
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[72px] rounded-2xl bg-card border border-border animate-pulse"
                />
              ))}
            </div>
          ) : flows.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-14 rounded-2xl bg-card border border-border">
              <div className="w-14 h-14 rounded-2xl bg-primary-tint flex items-center justify-center mb-3">
                <Workflow className="w-6 h-6 text-primary-deep" />
              </div>
              <div className="text-base font-bold text-foreground">
                No flows in this project
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Add a new flow or assign an existing one
              </div>
            </div>
          ) : (
            flows.map((flow, index) => {
              const color = ROW_TONES[index % ROW_TONES.length];
              return (
                <div
                  key={flow.id}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border mb-2"
                >
                  <button
                    type="button"
                    onClick={() => handleEdit(flow.id)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left bg-transparent border-0 p-0 appearance-none cursor-pointer"
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: `color-mix(in srgb, ${color} 12%, transparent)`,
                      }}
                    >
                      <Workflow className="w-5 h-5" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-foreground truncate">
                        {flow.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        Edited {timeAgo(flow.updatedAt)}
                      </div>
                    </div>
                  </button>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Dropdown menu={flowMenu(flow)} trigger={["click"]}>
                      <button
                        type="button"
                        aria-label="Flow actions"
                        className="w-9 h-9 rounded-lg hover:bg-secondary flex items-center justify-center bg-transparent border-0 p-0 appearance-none cursor-pointer"
                      >
                        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </Dropdown>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Rename Project Modal */}
      <Modal
        title="Rename Project"
        open={renameOpen}
        onCancel={() => setRenameOpen(false)}
        onOk={handleSaveName}
        okText="Save"
        okButtonProps={{
          disabled: !projectName.trim(),
          style: { background: "#34A881", borderColor: "#34A881" },
        }}
      >
        <Input
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          onPressEnter={handleSaveName}
          maxLength={255}
          autoFocus
        />
      </Modal>

      {/* Add Existing Flow Modal */}
      <Modal
        title="Add Existing Flows"
        open={addModalOpen}
        onCancel={() => setAddModalOpen(false)}
        onOk={handleAddFlows}
        okText={`Add Selected (${selectedFlowIds.length})`}
        okButtonProps={{
          disabled: selectedFlowIds.length === 0,
          style: { background: "#34A881", borderColor: "#34A881" },
        }}
        confirmLoading={addLoading}
        width={520}
        centered
      >
        <Input
          prefix={<Search className="w-4 h-4 text-muted-foreground" />}
          placeholder="Search flows..."
          value={addSearch}
          onChange={(e) => setAddSearch(e.target.value)}
          style={{ marginBottom: 16 }}
        />
        {addLoading ? (
          <div style={{ textAlign: "center", padding: 32 }}>Loading…</div>
        ) : filteredUnassigned.length === 0 ? (
          <div style={{ color: "#6B7280" }}>No unassigned flows found</div>
        ) : (
          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {filteredUnassigned.map((flow) => (
              <div
                key={flow.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "8px 4px",
                  borderBottom: "1px solid #F0F0F0",
                  cursor: "pointer",
                }}
                onClick={() =>
                  setSelectedFlowIds((prev) =>
                    prev.includes(flow.id)
                      ? prev.filter((id) => id !== flow.id)
                      : [...prev, flow.id],
                  )
                }
              >
                <Checkbox checked={selectedFlowIds.includes(flow.id)} />
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: "#F8F9FA",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  {flow.thumbnail ? (
                    <img
                      src={flow.thumbnail}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <Workflow
                      className="w-4 h-4"
                      style={{ color: "#BFBFBF" }}
                    />
                  )}
                </div>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 13,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {flow.name}
                  </div>
                  <div style={{ fontSize: 11, color: "#8C8C8C" }}>
                    {new Date(flow.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
