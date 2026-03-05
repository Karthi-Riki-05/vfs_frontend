"use client";

import React, { useState } from 'react';
import {
  Row,
  Col,
  Button,
  Modal,
  Form,
  Input,
  Spin,
  Avatar,
  Typography,
  Tag,
  Dropdown,
  message,
} from 'antd';
import {
  PlusOutlined,
  TeamOutlined,
  UserOutlined,
  CrownOutlined,
  SendOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import SectionHeader from '@/components/common/SectionHeader';
import EmptyState from '@/components/common/EmptyState';
import api from '@/lib/axios';
import { useAuth } from '@/hooks/useAuth';
import { useTeams } from '@/hooks/useTeams';
import { teamsApi } from '@/api/teams.api';

const { Text } = Typography;

export default function TeamsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { teams, loading, createTeam, deleteTeam, fetchTeams } = useTeams();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [inviteTeamId, setInviteTeamId] = useState<string | null>(null);
  const [createForm] = Form.useForm();
  const [inviteForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState(false);

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      setCreating(true);
      await createTeam(values);
      createForm.resetFields();
      setCreateModalOpen(false);
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async () => {
    try {
      const values = await inviteForm.validateFields();
      setInviting(true);
      const emailList = values.emails
        .split(',')
        .map((e: string) => e.trim())
        .filter((e: string) => e);

      // Basic email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalid = emailList.filter((e: string) => !emailRegex.test(e));
      if (invalid.length > 0) {
        message.error(`Invalid email format: ${invalid.join(', ')}`);
        setInviting(false);
        return;
      }

      await api.post('/teams/invite', {
        teamId: inviteTeamId,
        emails: emailList,
      });
      message.success(`Invitation${emailList.length > 1 ? 's' : ''} sent`);
      inviteForm.resetFields();
      setInviteModalOpen(false);
      fetchTeams();
    } catch (err: any) {
      const errMsg = err?.response?.data?.error?.message || err?.response?.data?.message || 'Failed to send invitation';
      message.error(errMsg);
    } finally {
      setInviting(false);
    }
  };

  const openInviteModal = (teamId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setInviteTeamId(teamId);
    setInviteModalOpen(true);
  };

  const openCreateModal = () => {
    setCreateModalOpen(true);
  };

  const openEditModal = (team: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTeam(team);
    editForm.setFieldsValue({ name: team.name || '', description: team.description || '' });
    setEditModalOpen(true);
  };

  const handleEdit = async () => {
    try {
      const values = await editForm.validateFields();
      setEditing(true);
      await teamsApi.update(editingTeam.id, values);
      message.success('Team updated');
      editForm.resetFields();
      setEditModalOpen(false);
      setEditingTeam(null);
      fetchTeams();
    } catch {
      message.error('Failed to update team');
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = (team: any, e: React.MouseEvent) => {
    e.stopPropagation();
    Modal.confirm({
      title: `Delete "${team.name || 'this team'}"?`,
      icon: <ExclamationCircleOutlined />,
      content: 'This will permanently delete the team and remove all members. This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        await deleteTeam(team.id);
      },
    });
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
      <SectionHeader
        title="MY TEAMS"
        right={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateModal}
            style={{
              backgroundColor: '#3CB371',
              borderColor: '#3CB371',
              borderRadius: 8,
              fontWeight: 600,
            }}
          >
            Create Team
          </Button>
        }
      />

      {teams.length > 0 ? (
        <Row gutter={[20, 20]}>
          {teams.map((team: any) => {
            const memberCount =
              team._count?.members || team.members?.length || 0;
            const isOwner =
              team.teamOwnerId === user?.id || team.ownerId === user?.id || team.owner?.id === user?.id;
            const members = team.members || [];

            const teamMenuItems = [
              { key: 'edit', label: 'Edit', icon: <EditOutlined />, onClick: (info: any) => { info.domEvent.stopPropagation(); openEditModal(team, info.domEvent); } },
              { type: 'divider' as const },
              { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true, onClick: (info: any) => { info.domEvent.stopPropagation(); handleDelete(team, info.domEvent); } },
            ];

            return (
              <Col xs={24} sm={12} md={8} key={team.id}>
                <div
                  onClick={() => router.push(`/dashboard/teams/${team.id}`)}
                  style={{
                    background: '#fff',
                    borderRadius: 12,
                    border: '1px solid #F0F0F0',
                    padding: '24px',
                    cursor: 'pointer',
                    transition: 'box-shadow 0.2s, transform 0.2s',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow =
                      '0 8px 24px rgba(0,0,0,0.08)';
                    (e.currentTarget as HTMLDivElement).style.transform =
                      'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                    (e.currentTarget as HTMLDivElement).style.transform = 'none';
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 17,
                          fontWeight: 700,
                          color: '#1A1A2E',
                          display: 'block',
                          marginBottom: 4,
                        }}
                      >
                        {team.name || `Team #${team.id.slice(-6)}`}
                      </Text>
                      {team.description && (
                        <Text
                          type="secondary"
                          style={{
                            fontSize: 13,
                            display: 'block',
                            marginBottom: 8,
                          }}
                        >
                          {team.description}
                        </Text>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      {isOwner && (
                        <Tag
                          icon={<CrownOutlined />}
                          color="gold"
                          style={{ borderRadius: 20, marginLeft: 8 }}
                        >
                          Owner
                        </Tag>
                      )}
                      {isOwner && (
                        <Dropdown menu={{ items: teamMenuItems }} trigger={['click']}>
                          <Button
                            type="text"
                            icon={<MoreOutlined />}
                            size="small"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Dropdown>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 'auto',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar.Group
                        max={{
                          count: 4,
                          style: {
                            backgroundColor: '#3CB371',
                            fontSize: 12,
                            width: 32,
                            height: 32,
                          },
                        }}
                        size={32}
                      >
                        {members.length > 0 ? (
                          members.map((member: any, idx: number) => (
                            <Avatar
                              key={member.id || idx}
                              src={member.user?.image || member.image}
                              icon={<UserOutlined />}
                              style={{ backgroundColor: '#3CB371' }}
                            />
                          ))
                        ) : (
                          <Avatar
                            icon={<TeamOutlined />}
                            style={{ backgroundColor: '#3CB371' }}
                          />
                        )}
                      </Avatar.Group>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        {memberCount} {memberCount === 1 ? 'member' : 'members'}
                      </Text>
                    </div>

                    <Button
                      type="text"
                      size="small"
                      icon={<SendOutlined />}
                      onClick={(e) => openInviteModal(team.id, e)}
                      style={{
                        color: '#3CB371',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      Invite
                    </Button>
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>
      ) : (
        <EmptyState
          title="No teams yet"
          description="Create a team to collaborate with others on value charts"
          actionText="Create Team"
          onAction={openCreateModal}
        />
      )}

      {/* Create Team Modal */}
      <Modal
        title="Create Team"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          createForm.resetFields();
        }}
        onOk={handleCreate}
        confirmLoading={creating}
        okButtonProps={{
          style: { backgroundColor: '#3CB371', borderColor: '#3CB371' },
        }}
        okText="Create"
      >
        <Form form={createForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="Team Name"
            rules={[{ required: true, message: 'Please enter a team name' }]}
          >
            <Input
              placeholder="e.g. Design Team"
              size="large"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea
              placeholder="What does this team work on?"
              rows={3}
              style={{ borderRadius: 8 }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Team Modal */}
      <Modal
        title="Edit Team"
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false);
          editForm.resetFields();
          setEditingTeam(null);
        }}
        onOk={handleEdit}
        confirmLoading={editing}
        okButtonProps={{
          style: { backgroundColor: '#3CB371', borderColor: '#3CB371' },
        }}
        okText="Save"
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="Team Name"
            rules={[{ required: true, message: 'Please enter a team name' }]}
          >
            <Input
              placeholder="e.g. Design Team"
              size="large"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea
              placeholder="What does this team work on?"
              rows={3}
              style={{ borderRadius: 8 }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Invite Member Modal */}
      <Modal
        title="Invite Member"
        open={inviteModalOpen}
        onCancel={() => {
          setInviteModalOpen(false);
          inviteForm.resetFields();
        }}
        onOk={handleInvite}
        confirmLoading={inviting}
        okButtonProps={{
          style: { backgroundColor: '#3CB371', borderColor: '#3CB371' },
        }}
        okText="Send Invite"
      >
        <Form form={inviteForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="emails"
            label="Email Addresses"
            rules={[
              { required: true, message: 'Please enter at least one email address' },
            ]}
            extra="Separate multiple emails with commas"
          >
            <Input.TextArea
              placeholder="colleague1@company.com, colleague2@company.com"
              rows={3}
              style={{ borderRadius: 8 }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
