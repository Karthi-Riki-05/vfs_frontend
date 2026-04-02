"use client";

import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Table, Modal, Form, Input, Select, Avatar, Space, Tag, Popconfirm, message, Spin } from 'antd';
import { UserOutlined, PlusOutlined, DeleteOutlined, MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { teamsApi } from '@/api/teams.api';
import { useParams, useRouter } from 'next/navigation';

const { Title, Text } = Typography;

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params?.id as string;
  const [team, setTeam] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!teamId) return;
    Promise.all([
      teamsApi.get(teamId),
      teamsApi.listMembers(teamId),
    ]).then(([teamRes, membersRes]) => {
      const teamData = teamRes.data?.data || teamRes.data;
      setTeam(teamData);
      const mData = membersRes.data?.data || membersRes.data;
      setMembers(Array.isArray(mData) ? mData : []);
    }).catch(() => message.error('Failed to load team'))
      .finally(() => setLoading(false));
  }, [teamId]);

  const handleInvite = async () => {
    try {
      const values = await form.validateFields();
      setInviting(true);
      await teamsApi.invite({ email: values.email, teamId });
      message.success('Invitation sent');
      form.resetFields();
      setInviteOpen(false);
      // Refresh members
      const res = await teamsApi.listMembers(teamId);
      const mData = res.data?.data || res.data;
      setMembers(Array.isArray(mData) ? mData : []);
    } catch (err: any) {
      const errMsg = err?.response?.data?.error?.message || err?.response?.data?.message || 'Failed to invite';
      message.error(errMsg);
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await teamsApi.removeMember(teamId, userId);
      message.success('Member removed');
      setMembers(prev => prev.filter(m => m.userId !== userId && m.id !== userId));
    } catch {
      message.error('Failed to remove member');
    }
  };

  const columns = [
    {
      title: 'Member',
      dataIndex: 'user',
      key: 'member',
      render: (user: any, record: any) => (
        <Space>
          <Avatar icon={<UserOutlined />} src={user?.image} size="small" />
          <div>
            <Text strong>{user?.name || record.email}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{user?.email || record.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const displayRole = role || 'MEMBER';
        const color = displayRole === 'OWNER' ? 'gold' : displayRole === 'ADMIN' ? 'blue' : 'default';
        return <Tag color={color}>{displayRole}</Tag>;
      },
    },
    {
      title: 'Joined',
      dataIndex: 'createdAt',
      key: 'joined',
      render: (d: string) => d ? new Date(d).toLocaleDateString() : '-',
    },
    {
      title: '',
      key: 'actions',
      render: (_: any, record: any) => (record.role || 'MEMBER') !== 'OWNER' && (
        <Popconfirm title="Remove this member?" onConfirm={() => handleRemove(record.userId || record.id)}>
          <Button type="text" danger icon={<DeleteOutlined />} size="small" />
        </Popconfirm>
      ),
    },
  ];

  if (loading) return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 16px' }}>
      <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => router.push('/dashboard/teams')} style={{ marginBottom: 16 }}>
        Back to Teams
      </Button>

      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Title level={3} style={{ margin: 0 }}>{team?.name || `Team #${team?.id?.slice(-6) || ''}`}</Title>
            <Text type="secondary">{team?.description || 'No description'}</Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setInviteOpen(true)}>
            Invite Member
          </Button>
        </div>
      </Card>

      <Card title={`Members (${members.length})`}>
        <div style={{ overflowX: 'auto' }}>
          <Table
            dataSource={members}
            columns={columns}
            rowKey={(r) => r.userId || r.id}
            pagination={false}
          />
        </div>
      </Card>

      <Modal
        title="Invite Member"
        open={inviteOpen}
        onCancel={() => setInviteOpen(false)}
        onOk={handleInvite}
        confirmLoading={inviting}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="email" label="Email Address" rules={[{ required: true, type: 'email', message: 'Please enter a valid email address' }]}>
            <Input prefix={<MailOutlined />} placeholder="member@example.com" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
