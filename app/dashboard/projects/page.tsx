"use client";

import React, { useState } from 'react';
import { Row, Col, Spin, Button, Card, Typography, Modal, Input, message, Dropdown } from 'antd';
import {
  FolderOutlined, PlusOutlined, MoreOutlined,
  EditOutlined, DeleteOutlined,
} from '@ant-design/icons';
import SectionHeader from '@/components/common/SectionHeader';
import EmptyState from '@/components/common/EmptyState';
import { useProjects } from '@/hooks/useProjects';
import { useRouter } from 'next/navigation';

const { Text } = Typography;

export default function ProjectsPage() {
  const { projects, loading, createProject, deleteProject, updateProject } = useProjects();
  const router = useRouter();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState(false);
  const [renameModal, setRenameModal] = useState<{ open: boolean; id: string; name: string }>({
    open: false, id: '', name: '',
  });

  const handleCreate = async () => {
    if (!newProjectName.trim()) return;
    setCreating(true);
    const project = await createProject(newProjectName.trim());
    setCreating(false);
    if (project) {
      setCreateModalOpen(false);
      setNewProjectName('');
    }
  };

  const handleRename = async () => {
    if (!renameModal.name.trim()) return;
    await updateProject(renameModal.id, { name: renameModal.name.trim() });
    setRenameModal({ open: false, id: '', name: '' });
  };

  const handleDelete = (id: string, name: string) => {
    Modal.confirm({
      title: `Delete "${name}"?`,
      content: 'Flows in this project will not be deleted — they will become individual flows.',
      okText: 'Delete',
      okType: 'danger',
      onOk: () => deleteProject(id),
    });
  };

  return (
    <div style={{ padding: 24 }}>
      <SectionHeader
        title="ALL PROJECTS"
        right={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ borderRadius: 8 }}
            onClick={() => setCreateModalOpen(true)}
          >
            New Project
          </Button>
        }
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" />
        </div>
      ) : projects.length > 0 ? (
        <Row gutter={[16, 16]}>
          {projects.map((project) => (
            <Col xs={24} sm={12} md={8} lg={6} key={project.id}>
              <Card
                hoverable
                style={{
                  borderRadius: 12,
                  border: '1px solid #F0F0F0',
                  textAlign: 'center',
                  cursor: 'pointer',
                }}
                styles={{ body: { padding: '28px 16px' } }}
                onClick={() => router.push(`/dashboard/projects/${project.id}`)}
              >
                <div style={{ position: 'absolute', top: 8, right: 8 }} onClick={(e) => e.stopPropagation()}>
                  <Dropdown
                    menu={{
                      items: [
                        {
                          key: 'rename',
                          label: 'Rename',
                          icon: <EditOutlined />,
                          onClick: () => setRenameModal({ open: true, id: project.id, name: project.name }),
                        },
                        { type: 'divider' },
                        {
                          key: 'delete',
                          label: 'Delete',
                          icon: <DeleteOutlined />,
                          danger: true,
                          onClick: () => handleDelete(project.id, project.name),
                        },
                      ],
                    }}
                    trigger={['click']}
                  >
                    <Button type="text" icon={<MoreOutlined />} size="small" />
                  </Dropdown>
                </div>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: '#FFF8E1', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <FolderOutlined style={{ fontSize: 28, color: '#FFC107' }} />
                </div>
                <Text strong style={{ fontSize: 14, color: '#1A1A2E', display: 'block', marginBottom: 4 }} ellipsis>
                  {project.name}
                </Text>
                <Text style={{ fontSize: 12, color: '#8C8C8C' }}>
                  {project.flowCount} {project.flowCount === 1 ? 'flow' : 'flows'}
                </Text>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <EmptyState
          title="No projects yet"
          description="Organize your flows into projects"
          actionText="New Project"
          onAction={() => setCreateModalOpen(true)}
        />
      )}

      {/* Create Project Modal */}
      <Modal
        title="New Project"
        open={createModalOpen}
        onCancel={() => { setCreateModalOpen(false); setNewProjectName(''); }}
        onOk={handleCreate}
        okText="Create"
        confirmLoading={creating}
        okButtonProps={{ disabled: !newProjectName.trim() }}
      >
        <Input
          placeholder="Project name"
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          onPressEnter={handleCreate}
          maxLength={255}
          autoFocus
        />
      </Modal>

      {/* Rename Project Modal */}
      <Modal
        title="Rename Project"
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
    </div>
  );
}
