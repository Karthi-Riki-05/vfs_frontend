"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { projectsApi } from "@/api/projects.api";
import { useAppContext } from "@/context/AppContext";
import { onWorkspaceFlush } from "@/lib/workspaceCache";
import { message } from "antd";

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  coverImage?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  flowCount: number;
}

export function useProjects() {
  const { activeTeamId, hydrated } = useAppContext();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  // Guards against setState after unmount (fire-and-forget refetch on nav).
  const mountedRef = useRef(true);

  // activeTeamId in deps → re-scopes + refetches the project bucket on switch.
  const fetchProjects = useCallback(
    async (search?: string) => {
      setLoading(true);
      try {
        const res = await projectsApi.list({ search });
        const d = res.data?.data || res.data;
        if (mountedRef.current) setProjects(Array.isArray(d) ? d : []);
      } catch {
        if (mountedRef.current) setProjects([]);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTeamId],
  );

  useEffect(() => {
    mountedRef.current = true;
    if (!hydrated) return;
    fetchProjects();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchProjects, hydrated]);

  // Synchronously drop the previous workspace's projects on team switch so
  // the old bucket never ghost-renders during the in-flight refetch.
  useEffect(
    () =>
      onWorkspaceFlush(() => {
        if (!mountedRef.current) return;
        setProjects([]);
      }),
    [],
  );

  const createProject = async (name: string, description?: string) => {
    try {
      const res = await projectsApi.create({ name, description });
      const project = res.data?.data || res.data;
      message.success("Project created");
      fetchProjects();
      return project;
    } catch {
      message.error("Failed to create project");
      return null;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await projectsApi.delete(id);
      message.success("Project deleted");
      fetchProjects();
    } catch {
      message.error("Failed to delete project");
    }
  };

  const updateProject = async (
    id: string,
    data: { name?: string; description?: string | null },
  ) => {
    try {
      await projectsApi.update(id, data);
      message.success("Project updated");
      fetchProjects();
    } catch {
      message.error("Failed to update project");
    }
  };

  return {
    projects,
    loading,
    fetchProjects,
    createProject,
    deleteProject,
    updateProject,
  };
}
