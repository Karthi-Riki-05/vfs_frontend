"use client";

import React, { useState } from 'react';
import { Layout } from 'antd';
import { usePathname } from 'next/navigation';
import Header from './Header';
import Sidebar from './Sidebar';

const { Content } = Layout;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  // Flow editor pages: /dashboard/flows/SOME_ID (but NOT /dashboard/flows or /dashboard/flows/new)
  const isEditorPage = /^\/dashboard\/flows\/(?!new$)[a-zA-Z0-9_-]+$/.test(pathname);

  // Editor page: render full-screen without sidebar/header
  if (isEditorPage) {
    return (
      <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
        {children}
      </div>
    );
  }

  // Normal pages: render with sidebar + header
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
