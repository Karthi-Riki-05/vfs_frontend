"use client";

import React, { useState, useEffect } from 'react';
import { Modal, Radio, Input, Button, Typography, Spin, Space, message } from 'antd';
import { PlusOutlined, SearchOutlined, FolderOutlined } from '@ant-design/icons';
import { projectsApi } from '@/api/projects.api';
import { flowsApi } from '@/api/flows.api';

const { Text } = Typography;

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

export default function AssignProjectModal({
  open, flowId, currentProjectId, onClose, onSuccess,
}: AssignProjectModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [showCreateInput, setShowCreateInput] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedProjectId(currentProjectId || null);
      setSearch('');
      setShowCreateInput(false);
      setNewProjectName('');
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

    try {
      if (selectedProjectId === null) {
        // Unassign: set projectId to null via flow update
        await flowsApi.update(flowId, { projectId: null } as any);
        message.success('Flow removed from project');
      } else {
        await projectsApi.assignFlow(selectedProjectId, flowId);
        const project = projects.find(p => p.id === selectedProjectId);
        message.success(`Flow assigned to "${project?.name}"`);
      }
      onSuccess();
      onClose();
    } catch {
      message.error('Failed to assign flow');
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
      message.error('Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const filteredProjects = projects.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal
      title="Assign to Project"
      open={open}
      onCancel={onClose}
      onOk={handleAssign}
      okText="Assign"
      width={420}
    >
      <Input
        prefix={<SearchOutlined />}
        placeholder="Search projects..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 16 }}
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
      ) : (
        <Radio.Group
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 280, overflowY: 'auto' }}
        >
          <Radio value={null} style={{ padding: '6px 0' }}>
            <Text>None (Individual flow)</Text>
          </Radio>
          {filteredProjects.map((project) => (
            <Radio key={project.id} value={project.id} style={{ padding: '6px 0' }}>
              <Space size={4}>
                <FolderOutlined style={{ color: '#FFC107' }} />
                <Text>{project.name}</Text>
                {project.id === currentProjectId && (
                  <Text type="secondary" style={{ fontSize: 11 }}>(Current)</Text>
                )}
              </Space>
            </Radio>
          ))}
        </Radio.Group>
      )}

      <div style={{ borderTop: '1px solid #F0F0F0', marginTop: 12, paddingTop: 12 }}>
        {showCreateInput ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <Input
              placeholder="New project name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onPressEnter={handleCreateAndAssign}
              autoFocus
              size="small"
            />
            <Button
              type="primary"
              size="small"
              onClick={handleCreateAndAssign}
              loading={creating}
              disabled={!newProjectName.trim()}
            >
              Create
            </Button>
            <Button
              size="small"
              onClick={() => { setShowCreateInput(false); setNewProjectName(''); }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            type="link"
            icon={<PlusOutlined />}
            onClick={() => setShowCreateInput(true)}
            style={{ padding: 0 }}
          >
            Create New Project
          </Button>
        )}
      </div>
    </Modal>
  );
}
