"use client";

import React, { useEffect } from 'react';
import { Layout, Menu, Typography, Avatar, Space } from 'antd';
import {
  DashboardOutlined, UserOutlined, CrownOutlined, DollarOutlined,
  TransactionOutlined, MessageOutlined, GiftOutlined, ArrowLeftOutlined
} from '@ant-design/icons';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const { Sider, Content, Header } = Layout;
const { Title, Text } = Typography;

const menuItems = [
  { key: '/admin', icon: <DashboardOutlined />, label: <Link href="/admin">Dashboard</Link> },
  { key: '/admin/users', icon: <UserOutlined />, label: <Link href="/admin/users">Users</Link> },
  { key: '/admin/plans', icon: <CrownOutlined />, label: <Link href="/admin/plans">Plans</Link> },
  { key: '/admin/subscriptions', icon: <DollarOutlined />, label: <Link href="/admin/subscriptions">Subscriptions</Link> },
  { key: '/admin/transactions', icon: <TransactionOutlined />, label: <Link href="/admin/transactions">Transactions</Link> },
  { key: '/admin/feedback', icon: <MessageOutlined />, label: <Link href="/admin/feedback">Feedback</Link> },
  { key: '/admin/offers', icon: <GiftOutlined />, label: <Link href="/admin/offers">Offers</Link> },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isAdmin, isLoading, router]);

  if (isLoading) return null;
  if (!isAdmin) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={220} style={{ background: '#111827' }}>
        <div style={{ padding: '16px 16px 8px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.65)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 12 }}>
            <ArrowLeftOutlined /> Back to App
          </Link>
          <Title level={5} style={{ color: '#fff', margin: 0 }}>Admin Panel</Title>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[pathname || '']}
          items={menuItems}
          style={{ background: 'transparent', borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <Space>
            <Text>{user?.name}</Text>
            <Avatar icon={<UserOutlined />} src={user?.image} size="small" />
          </Space>
        </Header>
        <Content style={{ padding: 24, background: '#f5f5f5' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
