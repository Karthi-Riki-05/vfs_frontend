"use client";

import React, { useState, useEffect } from 'react';
import { Card, Table, Typography, Tag } from 'antd';
import { adminApi } from '@/api/admin.api';

const { Title } = Typography;

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.listSubscriptions()
      .then(res => {
        const data = res.data?.data?.subscriptions || res.data?.data || res.data;
        setSubscriptions(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { title: 'User', dataIndex: ['user', 'name'], key: 'user', render: (n: string, r: any) => n || r.user?.email || r.userId },
    { title: 'Plan', dataIndex: ['plan', 'name'], key: 'plan' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'ACTIVE' ? 'green' : 'orange'}>{s}</Tag> },
    { title: 'Started', dataIndex: 'createdAt', key: 'started', render: (d: string) => d ? new Date(d).toLocaleDateString() : '-' },
    { title: 'Expires', dataIndex: 'currentPeriodEnd', key: 'expires', render: (d: string) => d ? new Date(d).toLocaleDateString() : '-' },
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>Subscriptions</Title>
      <Card>
        <Table dataSource={subscriptions} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 15 }} />
      </Card>
    </div>
  );
}
