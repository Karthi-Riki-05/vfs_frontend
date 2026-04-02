"use client";

import { useState, useEffect, useCallback } from 'react';
import { projectsApi } from '@/api/projects.api';
import { message } from 'antd';

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async (search?: string) => {
    setLoading(true);
    try {
      const res = await projectsApi.list({ search });
      const d = res.data?.data || res.data;
      setProjects(Array.isArray(d) ? d : []);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const createProject = async (name: string) => {
    try {
      const res = await projectsApi.create({ name });
      const project = res.data?.data || res.data;
      message.success('Project created');
      fetchProjects();
      return project;
    } catch {
      message.error('Failed to create project');
      return null;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await projectsApi.delete(id);
      message.success('Project deleted');
      fetchProjects();
    } catch {
      message.error('Failed to delete project');
    }
  };

  const updateProject = async (id: string, data: { name?: string; description?: string | null }) => {
    try {
      await projectsApi.update(id, data);
      message.success('Project updated');
      fetchProjects();
    } catch {
      message.error('Failed to update project');
    }
  };

  return {
    projects, loading, fetchProjects,
    createProject, deleteProject, updateProject,
  };
}
