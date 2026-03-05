"use client";

import React from 'react';
import { Card, Typography, Button, Table, Tag, Space, Descriptions, Empty, Spin, Divider } from 'antd';
import { CrownOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useSubscription } from '@/hooks/useSubscription';
import { paymentsApi } from '@/api/payments.api';
import { useState, useEffect } from 'react';

const { Title, Text } = Typography;

export default function BillingPage() {
  const { subscription, plans, loading, cancel } = useSubscription();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(true);

  useEffect(() => {
    paymentsApi.getTransactions()
      .then(res => {
        const data = res.data?.data?.transactions || res.data?.data || res.data;
        setTransactions(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => setTxLoading(false));
  }, []);

  const columns = [
    { title: 'Date', dataIndex: 'createdAt', key: 'date', render: (d: string) => new Date(d).toLocaleDateString() },
    { title: 'Description', dataIndex: 'description', key: 'desc' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (a: number) => `$${(a / 100).toFixed(2)}` },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'succeeded' ? 'green' : 'orange'}>{s}</Tag> },
  ];

  if (loading) return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Billing</Title>
        <Text type="secondary">Manage your subscription and billing</Text>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Space>
              <CrownOutlined style={{ fontSize: 24, color: '#4F46E5' }} />
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  {subscription?.plan?.name || 'Free Plan'}
                </Title>
                <Text type="secondary">
                  {subscription ? `Renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}` : 'No active subscription'}
                </Text>
              </div>
            </Space>
          </div>
          <Space>
            {subscription && (
              <Button danger onClick={cancel}>Cancel Subscription</Button>
            )}
            <Button type="primary" href="/dashboard/subscription">
              {subscription ? 'Change Plan' : 'Upgrade'}
            </Button>
          </Space>
        </div>

        {subscription?.plan && (
          <>
            <Divider />
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Plan">{subscription.plan.name}</Descriptions.Item>
              <Descriptions.Item label="Price">${(subscription.plan.price / 100).toFixed(2)}/mo</Descriptions.Item>
              <Descriptions.Item label="Status"><Tag color="green">{subscription.status}</Tag></Descriptions.Item>
              <Descriptions.Item label="Started">{new Date(subscription.createdAt).toLocaleDateString()}</Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Card>

      <Card title="Transaction History">
        <Table
          dataSource={transactions}
          columns={columns}
          rowKey="id"
          loading={txLoading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: <Empty description="No transactions yet" /> }}
        />
      </Card>
    </div>
  );
}
