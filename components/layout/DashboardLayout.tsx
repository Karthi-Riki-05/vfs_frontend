"use client";

import React, { useState } from 'react';
import { Layout } from 'antd';
import Header from './Header';
import Sidebar from './Sidebar';

const { Content } = Layout;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header />
      <Layout>
        <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
        <Content
          style={{
            marginLeft: collapsed ? 60 : 220,
            padding: '24px 32px',
            background: '#FFFFFF',
            minHeight: 'calc(100vh - 56px)',
            transition: 'margin-left 0.2s',
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
