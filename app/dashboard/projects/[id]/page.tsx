"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Row, Col, Spin, Button, Typography, Modal, Input, message, Checkbox } from 'antd';
import {
  ArrowLeftOutlined, PlusOutlined, FileAddOutlined, SearchOutlined,
} from '@ant-design/icons';
import FlowCard from '@/components/flows/FlowCard';
import SectionHeader from '@/components/common/SectionHeader';
import EmptyState from '@/components/common/EmptyState';
import { projectsApi } from '@/api/projects.api';
import { flowsApi } from '@/api/flows.api';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/axios';

const { Title, Text } = Typography;

const PLACEHOLDER_COLORS = ['#E8F5E9', '#E3F2FD', '#FFF3E0', '#F3E5F5', '#E0F7FA', '#FFF8E1'];

interface ProjectFlow {
  id: string;
  name: string;
  thumbnail?: string;
  updatedAt: string;
  isFavorite?: boolean;
  projectId?: string;
  projectName?: string;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;

  const [project, setProject] = useState<any>(null);
  const [flows, setFlows] = useState<ProjectFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [projectName, setProjectName] = useState('');

  // Add existing flow modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [unassignedFlows, setUnassignedFlows] = useState<ProjectFlow[]>([]);
  const [selectedFlowIds, setSelectedFlowIds] = useState<string[]>([]);
  const [addSearch, setAddSearch] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const fetchProject = useCallback(async () => {
    setLoading(true);
    try {
      const res = await projectsApi.get(projectId);
      const d = res.data?.data || res.data;
      setProject(d);
      setProjectName(d.name || '');
      setFlows(d.flows || []);
    } catch {
      message.error('Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  const handleEdit = (id: string) => {
    window.open(`/dashboard/flows/${id}`, '_blank');
  };

  const handleDelete = async (id: string) => {
    try {
      await flowsApi.delete(id);
      message.success('Flow deleted');
      fetchProject();
    } catch {
      message.error('Failed to delete flow');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await flowsApi.duplicate(id);
      message.success('Flow duplicated');
      fetchProject();
    } catch {
      message.error('Failed to duplicate flow');
    }
  };

  const handleFavorite = async (id: string) => {
    try {
      const flow = flows.find(f => f.id === id);
      await flowsApi.toggleFavorite(id, !flow?.isFavorite);
      setFlows(prev => prev.map(f => f.id === id ? { ...f, isFavorite: !f.isFavorite } : f));
    } catch {
      message.error('Failed to update favorite');
    }
  };

  const handleRemoveFromProject = async (flowId: string) => {
    try {
      await projectsApi.unassignFlow(projectId, flowId);
      message.success('Flow removed from project');
      fetchProject();
    } catch {
      message.error('Failed to remove flow');
    }
  };

  const handleSaveName = async () => {
    if (!projectName.trim()) return;
    try {
      await projectsApi.update(projectId, { name: projectName.trim() });
      setEditingName(false);
      fetchProject();
    } catch {
      message.error('Failed to rename project');
    }
  };

  const handleCreateNewFlow = async () => {
    try {
      const res = await api.post('/flows', {
        name: 'Untitled Flow',
        projectId,
      });
      const flow = res.data?.data || res.data;
      if (flow?.id) {
        window.open(`/dashboard/flows/${flow.id}`, '_blank');
        fetchProject();
      }
    } catch {
      message.error('Failed to create flow');
    }
  };

  // Add existing flow modal logic
  const openAddModal = async () => {
    setAddModalOpen(true);
    setAddLoading(true);
    setSelectedFlowIds([]);
    setAddSearch('');
    try {
      const res = await flowsApi.list({ limit: 100 });
      const d = res.data?.data || res.data || {};
      const allFlows: ProjectFlow[] = d.flows || (Array.isArray(d) ? d : []);
      // Only show unassigned flows (no projectId or null projectId)
      setUnassignedFlows(allFlows.filter(f => !f.projectId));
    } catch {
      setUnassignedFlows([]);
    } finally {
      setAddLoading(false);
    }
  };

  const handleAddFlows = async () => {
    if (selectedFlowIds.length === 0) return;
    setAddLoading(true);
    try {
      await Promise.all(selectedFlowIds.map(fid => projectsApi.assignFlow(projectId, fid)));
      message.success(`${selectedFlowIds.length} flow(s) added to project`);
      setAddModalOpen(false);
      fetchProject();
    } catch {
      message.error('Failed to add flows');
    } finally {
      setAddLoading(false);
    }
  };

  const filteredUnassigned = unassignedFlows.filter(f =>
    !addSearch || f.name.toLowerCase().includes(addSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push('/dashboard/projects')}
        />
        {editingName ? (
          <Input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onPressEnter={handleSaveName}
            onBlur={handleSaveName}
            style={{ fontSize: 20, fontWeight: 600, maxWidth: 400 }}
            autoFocus
          />
        ) : (
          <Title
            level={4}
            style={{ margin: 0, cursor: 'pointer' }}
            onClick={() => setEditingName(true)}
          >
            {project?.name || 'Project'}
          </Title>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <Button icon={<FileAddOutlined />} onClick={openAddModal}>
          Add Existing Flow
        </Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateNewFlow}>
          Create New Flow
        </Button>
      </div>

      {/* Flows grid */}
      {flows.length === 0 ? (
        <EmptyState
          title="No flows in this project"
          description="Add existing flows or create new ones"
          actionText="Add Existing Flow"
          onAction={openAddModal}
          icon={<FileAddOutlined style={{ fontSize: 48, color: '#3CB371' }} />}
        />
      ) : (
        <Row gutter={[24, 24]}>
          {flows.map((flow, index) => (
            <Col xs={24} sm={12} md={8} lg={6} key={flow.id}>
              <FlowCard
                flow={flow}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onFavorite={handleFavorite}
                onRemoveFromProject={() => handleRemoveFromProject(flow.id)}
                variant="default"
                placeholderColor={PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length]}
              />
            </Col>
          ))}
        </Row>
      )}

      {/* Add Existing Flow Modal */}
      <Modal
        title="Add Existing Flows"
        open={addModalOpen}
        onCancel={() => setAddModalOpen(false)}
        onOk={handleAddFlows}
        okText={`Add Selected (${selectedFlowIds.length})`}
        okButtonProps={{ disabled: selectedFlowIds.length === 0 }}
        confirmLoading={addLoading}
        width={520}
      >
        <Input
          prefix={<SearchOutlined />}
          placeholder="Search flows..."
          value={addSearch}
          onChange={(e) => setAddSearch(e.target.value)}
          style={{ marginBottom: 16 }}
        />
        {addLoading ? (
          <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
        ) : filteredUnassigned.length === 0 ? (
          <Text type="secondary">No unassigned flows found</Text>
        ) : (
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {filteredUnassigned.map((flow) => (
              <div
                key={flow.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '8px 4px', borderBottom: '1px solid #F0F0F0',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setSelectedFlowIds(prev =>
                    prev.includes(flow.id)
                      ? prev.filter(id => id !== flow.id)
                      : [...prev, flow.id]
                  );
                }}
              >
                <Checkbox checked={selectedFlowIds.includes(flow.id)} />
                <div
                  style={{
                    width: 40, height: 40, borderRadius: 4, background: '#F8F9FA',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', flexShrink: 0,
                  }}
                >
                  {flow.thumbnail ? (
                    <img src={flow.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <FileAddOutlined style={{ color: '#BFBFBF' }} />
                  )}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <Text strong ellipsis style={{ display: 'block', fontSize: 13 }}>{flow.name}</Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {new Date(flow.updatedAt).toLocaleDateString()}
                  </Text>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
