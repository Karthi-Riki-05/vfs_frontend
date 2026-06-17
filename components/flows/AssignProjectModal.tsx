"use client";

import React, { useState, useEffect } from "react";
import { message } from "antd";
import { Search, Plus, FolderKanban, Check, FolderInput } from "lucide-react";
import {
  ModalShell,
  ModalHeader,
  ModalFooter,
} from "@/components/common/Modal";
import { Field, FieldInput } from "@/components/common/Field";
import { projectsApi } from "@/api/projects.api";
import { flowsApi } from "@/api/flows.api";

interface Project {
  id: string;
  name: string;
  flowCount: number;
}

interface AssignProjectModalProps {
  open: boolean;
  flowId: string | null;
  currentProjectId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

// Deterministic tile tone per project name (matches prototype coloured tiles).
const TONES = ["#34A881", "#006AA8", "#FF9A30", "#F85729"];
const toneFor = (name: string) =>
  TONES[(name?.charCodeAt(0) || 0) % TONES.length];

export default function AssignProjectModal({
  open,
  flowId,
  currentProjectId,
  onClose,
  onSuccess,
}: AssignProjectModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [showCreateInput, setShowCreateInput] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedProjectId(currentProjectId || null);
      setSearch("");
      setShowCreateInput(false);
      setNewProjectName("");
      fetchProjects();
    }
  }, [open, currentProjectId]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await projectsApi.list();
      const d = res.data?.data || res.data;
      setProjects(Array.isArray(d) ? d : []);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!flowId) return;
    setAssigning(true);
    try {
      if (selectedProjectId === null) {
        await flowsApi.update(flowId, { projectId: null } as any);
        message.success("Flow removed from project");
      } else {
        await projectsApi.assignFlow(selectedProjectId, flowId);
        const project = projects.find((p) => p.id === selectedProjectId);
        message.success(`Flow assigned to "${project?.name}"`);
      }
      onSuccess();
      onClose();
    } catch {
      message.error("Failed to assign flow");
    } finally {
      setAssigning(false);
    }
  };

  const handleCreateAndAssign = async () => {
    if (!newProjectName.trim() || !flowId) return;
    setCreating(true);
    try {
      const res = await projectsApi.create({ name: newProjectName.trim() });
      const project = res.data?.data || res.data;
      if (project?.id) {
        await projectsApi.assignFlow(project.id, flowId);
        message.success(`Flow assigned to "${project.name}"`);
        onSuccess();
        onClose();
      }
    } catch {
      message.error("Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  const filteredProjects = projects.filter(
    (p) => !search || p.name.toLowerCase().includes(search.toLowerCase()),
  );

  const Row = ({
    id,
    name,
    color,
    current,
  }: {
    id: string | null;
    name: string;
    color?: string;
    current?: boolean;
  }) => {
    const selected = selectedProjectId === id;
    return (
      <button
        type="button"
        onClick={() => setSelectedProjectId(id)}
        className="appearance-none cursor-pointer outline-none border-0 bg-transparent w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-secondary text-left"
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={
            color
              ? { background: `${color}1f`, color }
              : {
                  background: "var(--secondary)",
                  color: "var(--muted-foreground)",
                }
          }
        >
          {color ? (
            <FolderKanban className="w-4 h-4" />
          ) : (
            <FolderInput className="w-4 h-4" />
          )}
        </div>
        <span className="flex-1 min-w-0 text-sm font-semibold truncate">
          {name}
          {current && (
            <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
              (Current)
            </span>
          )}
        </span>
        <span
          className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 ${
            selected ? "bg-primary border-primary" : "border-border"
          }`}
        >
          {selected && <Check className="w-3.5 h-3.5 text-white" />}
        </span>
      </button>
    );
  };

  return (
    <ModalShell open={open} onClose={onClose}>
      <ModalHeader title="Assign to Project" close={onClose} />
      <div className="px-5 pb-3 space-y-3">
        <Field label="Search">
          <FieldInput
            placeholder="Search projects…"
            icon={<Search className="w-4 h-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Field>
        <div className="-mx-2 max-h-72 overflow-y-auto px-2">
          {loading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : (
            <>
              <Row id={null} name="None (Individual flow)" />
              {filteredProjects.map((p) => (
                <Row
                  key={p.id}
                  id={p.id}
                  name={p.name}
                  color={toneFor(p.name)}
                  current={p.id === currentProjectId}
                />
              ))}
            </>
          )}
        </div>
        <div className="border-t border-border pt-3">
          {showCreateInput ? (
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <FieldInput
                  placeholder="New project name"
                  autoFocus
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleCreateAndAssign()
                  }
                />
              </div>
              <button
                type="button"
                onClick={handleCreateAndAssign}
                disabled={!newProjectName.trim() || creating}
                className="appearance-none cursor-pointer outline-none border-0 h-11 px-4 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-60"
              >
                {creating ? "…" : "Create"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCreateInput(true)}
              className="appearance-none cursor-pointer outline-none border-0 bg-transparent inline-flex items-center gap-2 text-sm font-bold text-primary-deep"
            >
              <Plus className="w-4 h-4" /> Create New Project
            </button>
          )}
        </div>
      </div>
      <ModalFooter
        close={onClose}
        primary={handleAssign}
        primaryLabel="Assign"
        loading={assigning}
      />
    </ModalShell>
  );
}
