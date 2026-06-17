"use client";

import React, { useState, useEffect } from "react";
import { Modal, Dropdown } from "antd";
import { Folder, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  ModalShell,
  ModalHeader,
  ModalFooter,
} from "@/components/common/Modal";
import { Field, FieldInput } from "@/components/common/Field";
import { useProjects } from "@/hooks/useProjects";
import { useTabFocus } from "@/hooks/useTabFocus";
import { useRouter } from "next/navigation";
import { timeAgo } from "@/lib/flowUtils";

/* tone cycle — derives a deterministic colour per project (prototype look) */
const TONES = [
  {
    tile: "bg-primary-tint",
    icon: "var(--primary-deep)",
    badge: "bg-primary-tint text-primary-deep",
  },
  {
    tile: "bg-[#E2EEF8]",
    icon: "var(--blue)",
    badge: "bg-[#E2EEF8] text-[var(--blue)]",
  },
  {
    tile: "bg-[#FFF2E2]",
    icon: "var(--orange)",
    badge: "bg-[#FFF2E2] text-[var(--orange)]",
  },
  {
    tile: "bg-[#FDE7E0]",
    icon: "var(--coral)",
    badge: "bg-[#FDE7E0] text-[var(--coral)]",
  },
];
const toneFor = (name: string) =>
  TONES[(name?.charCodeAt(0) || 0) % TONES.length];

export default function ProjectsPage() {
  const {
    projects,
    loading,
    fetchProjects,
    createProject,
    deleteProject,
    updateProject,
  } = useProjects();
  useTabFocus(fetchProjects);
  const router = useRouter();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // FAB "New Project" entry point: open the create modal when ?create=1, then
  // strip the param so a refresh/back doesn't reopen it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("create") === "1") {
      setCreateModalOpen(true);
      router.replace("/dashboard/projects");
    }
  }, [router]);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [renameModal, setRenameModal] = useState<{
    open: boolean;
    id: string;
    name: string;
  }>({ open: false, id: "", name: "" });

  const handleCreate = async () => {
    if (!newProjectName.trim()) return;
    setCreating(true);
    const project = await createProject(
      newProjectName.trim(),
      newProjectDesc.trim() || undefined,
    );
    setCreating(false);
    if (project) {
      setCreateModalOpen(false);
      setNewProjectName("");
      setNewProjectDesc("");
    }
  };

  const handleRename = async () => {
    if (!renameModal.name.trim()) return;
    await updateProject(renameModal.id, { name: renameModal.name.trim() });
    setRenameModal({ open: false, id: "", name: "" });
  };

  const handleDelete = (id: string, name: string) => {
    Modal.confirm({
      title: `Delete "${name}"?`,
      content:
        "Flows in this project will not be deleted — they will become individual flows.",
      okText: "Delete",
      okType: "danger",
      onOk: () => deleteProject(id),
    });
  };

  const projectMenu = (project: any) => ({
    items: [
      {
        key: "rename",
        label: "Rename",
        icon: <Pencil className="w-3.5 h-3.5" />,
        onClick: () =>
          setRenameModal({ open: true, id: project.id, name: project.name }),
      },
      { type: "divider" as const },
      {
        key: "delete",
        label: "Delete",
        icon: <Trash2 className="w-3.5 h-3.5" />,
        danger: true,
        onClick: () => handleDelete(project.id, project.name),
      },
    ],
  });

  return (
    <div className="tw min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-5 lg:px-8 pt-6 pb-28">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-6">
          <div className="min-w-0">
            <h1 className="text-[26px] lg:text-[32px] font-extrabold text-foreground leading-tight">
              All Projects
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {projects.length} {projects.length === 1 ? "project" : "projects"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="shrink-0 h-10 px-4 rounded-full bg-primary hover:bg-[#1F7D5E] text-white font-semibold text-sm inline-flex items-center gap-2 shadow-[var(--shadow-fab)] border-0 appearance-none cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" /> New Project
          </button>
        </div>

        {/* Loading skeletons */}
        {loading && projects.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[88px] rounded-2xl bg-card border border-border shadow-[var(--shadow-card)] animate-pulse"
              />
            ))}
          </div>
        ) : projects.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-primary-tint flex items-center justify-center mb-4">
              <Folder className="w-7 h-7 text-primary-deep" />
            </div>
            <div className="text-lg font-bold text-foreground">
              No projects yet
            </div>
            <div className="text-sm text-muted-foreground mt-1 mb-6">
              Organize your flows into projects
            </div>
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="h-11 px-6 rounded-full bg-gradient-to-br from-primary to-primary-deep text-white font-bold text-sm inline-flex items-center gap-2 shadow-[var(--shadow-fab)] border-0 appearance-none cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Project
            </button>
          </div>
        ) : (
          /* Project grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => {
              const tone = toneFor(project.name);
              return (
                <div
                  key={project.id}
                  onClick={() =>
                    router.push(`/dashboard/projects/${project.id}`)
                  }
                  className="group relative rounded-2xl bg-card border border-border shadow-[var(--shadow-card)] p-4 flex items-center gap-3 cursor-pointer hover:border-primary/40 transition-colors"
                >
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${tone.tile}`}
                    style={{ color: tone.icon }}
                  >
                    <Folder className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[15px] text-foreground truncate">
                      {project.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Updated {timeAgo(project.updatedAt)}
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${tone.badge}`}
                  >
                    {project.flowCount}{" "}
                    {project.flowCount === 1 ? "flow" : "flows"}
                  </span>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Dropdown menu={projectMenu(project)} trigger={["click"]}>
                      <button
                        type="button"
                        aria-label="Project actions"
                        className="w-9 h-9 rounded-lg hover:bg-secondary flex items-center justify-center bg-transparent border-0 p-0 appearance-none cursor-pointer"
                      >
                        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </Dropdown>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Project Modal — new_design ModalShell (prototype 1692–1707) */}
      <ModalShell
        open={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setNewProjectName("");
          setNewProjectDesc("");
        }}
      >
        <ModalHeader
          title="Create Project"
          close={() => {
            setCreateModalOpen(false);
            setNewProjectName("");
            setNewProjectDesc("");
          }}
        />
        <div className="px-5 pb-5 space-y-4">
          <Field label="Project Name" required>
            <FieldInput
              placeholder="e.g. Q3 Launch"
              autoFocus
              maxLength={255}
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </Field>
          <div>
            <label className="text-xs font-semibold">Description</label>
            <textarea
              placeholder="What's this project about?"
              value={newProjectDesc}
              onChange={(e) => setNewProjectDesc(e.target.value)}
              className="mt-1.5 w-full min-h-20 rounded-xl border border-border bg-background p-3 text-sm font-sans outline-none resize-none"
            />
          </div>
        </div>
        <ModalFooter
          close={() => {
            setCreateModalOpen(false);
            setNewProjectName("");
            setNewProjectDesc("");
          }}
          primary={handleCreate}
          primaryLabel="Create"
          loading={creating}
          disabled={!newProjectName.trim()}
        />
      </ModalShell>

      {/* Rename Project Modal — new_design ModalShell (prototype 1798–1808) */}
      <ModalShell
        open={renameModal.open}
        onClose={() => setRenameModal({ open: false, id: "", name: "" })}
      >
        <ModalHeader
          title="Rename Project"
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
