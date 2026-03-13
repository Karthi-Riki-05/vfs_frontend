"use client";

import React, { useState, useEffect } from 'react';
import { Row, Col, Spin, Typography, Modal, Input } from 'antd';
import { FileAddOutlined, ProjectOutlined, MoreOutlined, FolderOutlined } from '@ant-design/icons';
import FlowCard from '@/components/flows/FlowCard';
import AssignProjectModal from '@/components/flows/AssignProjectModal';
import SectionHeader from '@/components/common/SectionHeader';
import ViewToggle from '@/components/common/ViewToggle';
import EmptyState from '@/components/common/EmptyState';
import { useFlows } from '@/hooks/useFlows';
import { useRouter } from 'next/navigation';
import { createNewFlow } from '@/lib/flow';
import api from '@/lib/axios';
import { message, Dropdown, Button } from 'antd';
import {
  EditOutlined, DeleteOutlined, CopyOutlined, StarOutlined, StarFilled, HeartOutlined, HeartFilled,
  FormOutlined, FolderAddOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

const PLACEHOLDER_COLORS = [
  '#E8F5E9', '#E3F2FD', '#FFF3E0', '#F3E5F5', '#E0F7FA', '#FFF8E1',
];

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} mins ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function RecentDocuments() {
  const { flows, loading, fetchFlows, deleteFlow, duplicateFlow, favoriteFlow } = useFlows();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const router = useRouter();

  // Rename state
  const [renameModal, setRenameModal] = useState<{ open: boolean; id: string; name: string }>({
    open: false, id: '', name: '',
  });

  // Assign to project state
  const [assignModal, setAssignModal] = useState<{ open: boolean; flowId: string | null; currentProjectId?: string | null }>({
    open: false, flowId: null,
  });

  // Load saved preference
  useEffect(() => {
    const saved = localStorage.getItem('dashboard_view_mode');
    if (saved === 'grid' || saved === 'list') setView(saved);
  }, []);

  const handleViewChange = (newView: 'grid' | 'list') => {
    setView(newView);
    localStorage.setItem('dashboard_view_mode', newView);
  };

  const handleEdit = (id: string) => {
    window.open(`/dashboard/flows/${id}`, '_blank');
  };

  const handleDelete = async (id: string) => { await deleteFlow(id); };
  const handleDuplicate = async (id: string) => { await duplicateFlow(id); };
  const handleFavorite = async (id: string) => { await favoriteFlow(id); };

  const handleRename = async () => {
    if (!renameModal.name.trim()) return;
    try {
      await api.put(`/flows/${renameModal.id}`, { name: renameModal.name.trim() });
      message.success('Flow renamed');
      setRenameModal({ open: false, id: '', name: '' });
      fetchFlows();
    } catch {
      message.error('Failed to rename flow');
    }
  };

  const handleCreateNew = () => {
    createNewFlow();
  };

  // List view menu items
  const getMoreItems = (flow: any) => [
    { key: 'edit', label: 'Edit', icon: <EditOutlined />, onClick: () => handleEdit(flow.id) },
    {
      key: 'favorite',
      label: flow.isFavorite ? 'Remove Favorite' : 'Mark as Favorite',
      icon: flow.isFavorite ? <HeartFilled style={{ color: '#FF4D6A' }} /> : <HeartOutlined />,
      onClick: () => handleFavorite(flow.id),
    },
    { key: 'rename', label: 'Rename', icon: <FormOutlined />, onClick: () => setRenameModal({ open: true, id: flow.id, name: flow.name }) },
    { key: 'assign-project', label: 'Assign to Project', icon: <FolderAddOutlined />, onClick: () => setAssignModal({ open: true, flowId: flow.id, currentProjectId: flow.projectId }) },
    { key: 'duplicate', label: 'Duplicate', icon: <CopyOutlined />, onClick: () => handleDuplicate(flow.id) },
    { type: 'divider' as const },
    { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true, onClick: () => handleDelete(flow.id) },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <Spin size="large" />
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
          icon={<FileAddOutlined style={{ fontSize: 48, color: '#3CB371' }} />}
        />
      ) : view === 'grid' ? (
        <Row gutter={[24, 24]}>
          {flows.map((flow: any, index: number) => (
            <Col xs={24} sm={12} md={8} lg={6} key={flow.id}>
              <FlowCard
                flow={flow}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onFavorite={handleFavorite}
                onRename={(id, name) => setRenameModal({ open: true, id, name })}
                onAssignProject={(id) => setAssignModal({ open: true, flowId: id, currentProjectId: flow.projectId })}
                variant="default"
                placeholderColor={PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length]}
              />
            </Col>
          ))}
        </Row>
      ) : (
        /* List View */
        <div style={{ border: '1px solid #F0F0F0', borderRadius: 8, overflow: 'hidden' }}>
          {flows.map((flow: any) => (
            <div
              key={flow.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '12px 16px', borderBottom: '1px solid #F0F0F0',
                cursor: 'pointer', transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#FAFAFA'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              onClick={() => handleEdit(flow.id)}
            >
              <div style={{
                width: 48, height: 40, borderRadius: 6, background: '#F8F9FA',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', flexShrink: 0,
              }}>
                {flow.thumbnail ? (
                  <img src={flow.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <ProjectOutlined style={{ fontSize: 20, color: '#BFBFBF' }} />
                )}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Text strong ellipsis style={{ fontSize: 14, color: '#1A1A2E' }}>{flow.name}</Text>
                  {flow.isFavorite && <HeartFilled style={{ fontSize: 12, color: '#FF4D6A' }} />}
                </div>
                {flow.projectName && (
                  <Text style={{ fontSize: 11, color: '#8C8C8C' }}>
                    <FolderOutlined style={{ marginRight: 4 }} />{flow.projectName}
                  </Text>
                )}
              </div>
              <Text style={{ fontSize: 12, color: '#8C8C8C', flexShrink: 0 }}>
                Edited {timeAgo(flow.updatedAt)}
              </Text>
              <div onClick={(e) => e.stopPropagation()}>
                <Dropdown menu={{ items: getMoreItems(flow) }} trigger={['click']}>
                  <Button type="text" icon={<MoreOutlined />} size="small" />
                </Dropdown>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rename Modal */}
      <Modal
        title="Rename Flow"
        open={renameModal.open}
        onCancel={() => setRenameModal({ open: false, id: '', name: '' })}
        onOk={handleRename}
        okText="Save"
        okButtonProps={{ disabled: !renameModal.name.trim() }}
      >
        <Input
          value={renameModal.name}
          onChange={(e) => setRenameModal({ ...renameModal, name: e.target.value })}
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
    </div>
  );
}
