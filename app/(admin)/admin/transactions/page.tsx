"use client";

import React, { useState, useEffect } from 'react';
import { Card, Table, Typography, Tag } from 'antd';
import { adminApi } from '@/api/admin.api';

const { Title } = Typography;

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.listTransactions()
      .then(res => {
        const data = res.data?.data?.transactions || res.data?.data || res.data;
        setTransactions(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { title: 'User', dataIndex: ['user', 'name'], key: 'user', render: (n: string, r: any) => n || r.user?.email || r.userId },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (a: number) => `$${(a / 100).toFixed(2)}` },
    { title: 'Description', dataIndex: 'description', key: 'desc' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'succeeded' ? 'green' : 'orange'}>{s}</Tag> },
    { title: 'Date', dataIndex: 'createdAt', key: 'date', render: (d: string) => d ? new Date(d).toLocaleDateString() : '-' },
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>Transactions</Title>
      <Card>
        <Table dataSource={transactions} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 15 }} />
      </Card>
    </div>
  );
}
