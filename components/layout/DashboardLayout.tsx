"use client";

import React, { useState, useEffect } from 'react';
import { Layout } from 'antd';
import { usePathname } from 'next/navigation';
import Header from './Header';
import Sidebar from './Sidebar';
import ProSidebar from './ProSidebar';
import { usePro } from '@/hooks/usePro';
import { useIsMobile, useIsTablet } from '@/hooks/useMediaQuery';

const { Content } = Layout;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname() || '';
  const { currentApp } = usePro();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  // Flow editor pages: /dashboard/flows/SOME_ID (but NOT /dashboard/flows or /dashboard/flows/new)
  const isEditorPage = /^\/dashboard\/flows\/(?!new$)[a-zA-Z0-9_-]+$/.test(pathname);

  // Auto-collapse on tablet
  useEffect(() => {
    if (isTablet) setCollapsed(true);
  }, [isTablet]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // Editor page: render full-screen without sidebar/header
  if (isEditorPage) {
    return (
      <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
        {children}
      </div>
    );
  }

  // Choose sidebar based on current app
  const SidebarComponent = currentApp === 'pro' ? ProSidebar : Sidebar;

  // Mobile: no fixed sidebar, use drawer
  if (isMobile) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header onMenuClick={() => setMobileOpen(true)} />

        {/* Mobile sidebar drawer */}
        <div
          className={`sidebar-backdrop ${mobileOpen ? 'open' : ''}`}
          onClick={() => setMobileOpen(false)}
        />
        <div className={`sidebar-drawer ${mobileOpen ? 'open' : ''}`}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid #F0F0F0',
          }}>
            <img src="/images/image.png" alt="ValueChart" style={{ height: 32 }} />
            <button
              onClick={() => setMobileOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 20,
                cursor: 'pointer',
                padding: 8,
                color: '#8C8C8C',
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
          <SidebarComponent
            collapsed={false}
            onCollapse={() => {}}
            isMobileDrawer
            onMobileClose={() => setMobileOpen(false)}
          />
        </div>

        <Content
          className="responsive-content"
          style={{
            padding: '16px',
            paddingTop: 56 + 16,
            background: '#FFFFFF',
            minHeight: 'calc(100vh - 56px)',
          }}
        >
          {children}
        </Content>
      </Layout>
    );
  }

  // Tablet and Desktop
  const siderWidth = collapsed ? 60 : 220;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header />
      <Layout style={{ marginTop: 56 }}>
        <SidebarComponent collapsed={collapsed} onCollapse={setCollapsed} />
        <Content
          className="responsive-content"
          style={{
            marginLeft: siderWidth,
            padding: isTablet ? '20px 24px' : '24px 32px',
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
