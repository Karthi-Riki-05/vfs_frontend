"use client";

import React, { useState, useEffect } from 'react';
import { Card, Table, Typography, Tag, Select, Input, Avatar, Space, message } from 'antd';
import { UserOutlined, SearchOutlined } from '@ant-design/icons';
import { adminApi } from '@/api/admin.api';

const { Title } = Typography;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminApi.listUsers({ search: search || undefined });
      const data = res.data?.data?.users || res.data?.data || res.data;
      setUsers(Array.isArray(data) ? data : []);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [search]);

  const handleRoleChange = async (id: string, role: string) => {
    try {
      await adminApi.updateUser(id, { role });
      message.success('Role updated');
      fetchUsers();
    } catch {
      message.error('Failed to update role');
    }
  };

  const columns = [
    {
      title: 'User',
      key: 'user',
      render: (_: any, r: any) => (
        <Space>
          <Avatar icon={<UserOutlined />} src={r.image} size="small" />
          <div>
            <div style={{ fontWeight: 500 }}>{r.name}</div>
            <div style={{ fontSize: 12, color: '#999' }}>{r.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string, record: any) => (
        <Select
          value={role}
          size="small"
          style={{ width: 100 }}
          onChange={(v) => handleRoleChange(record.id, v)}
          options={[
            { label: 'User', value: 'USER' },
            { label: 'Admin', value: 'ADMIN' },
          ]}
        />
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'status',
      render: (active: boolean) => <Tag color={active !== false ? 'green' : 'red'}>{active !== false ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Joined',
      dataIndex: 'createdAt',
      key: 'joined',
      render: (d: string) => d ? new Date(d).toLocaleDateString() : '-',
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>User Management</Title>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 250 }}
          allowClear
        />
      </div>
      <Card>
        <Table dataSource={users} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 15, showSizeChanger: true }} />
      </Card>
    </div>
  );
}
