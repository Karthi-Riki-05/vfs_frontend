"use client";

import React, { useState, useEffect } from 'react';
import { Layout } from 'antd';
import { usePathname } from 'next/navigation';
import Header from './Header';
import Sidebar from './Sidebar';
import ProSidebar from './ProSidebar';
import AIAssistant from '../ai/AIAssistant';
import RightChatColumn from '../chat/RightChatColumn';
import { usePro } from '@/hooks/usePro';
import { useIsMobile, useIsTablet } from '@/hooks/useMediaQuery';

const { Content } = Layout;

// Extend window type for global chat toggle
declare global {
  interface Window {
    __toggleChat?: () => void;
    __openChat?: () => void;
    __setChatFullView?: (val: boolean) => void;
  }
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatFullView, setChatFullView] = useState(false);
  const pathname = usePathname() || '';
  const { currentApp } = usePro();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  // Flow editor pages: /dashboard/flows/SOME_ID (but NOT /dashboard/flows or /dashboard/flows/new)
  const isEditorPage = /^\/dashboard\/flows\/(?!new$)[a-zA-Z0-9_-]+$/.test(pathname);

  // Hide chat column on editor/upgrade pages
  const hideChatColumn = isEditorPage || pathname?.includes('/upgrade-pro');

  // Expose toggle/open functions globally so header/sidebar/redirect can call them
  useEffect(() => {
    window.__toggleChat = () => setChatOpen(prev => !prev);
    window.__openChat = () => setChatOpen(true);
    window.__setChatFullView = (val: boolean) => setChatFullView(val);
    return () => {
      delete window.__toggleChat;
      delete window.__openChat;
      delete window.__setChatFullView;
    };
  }, []);

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

  // Close chat handlers
  const handleChatClose = () => {
    setChatOpen(false);
    setChatFullView(false);
  };

  const handleChatFullView = () => {
    setChatFullView(prev => !prev);
  };

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

  // Mobile: no fixed sidebar, use drawer. No right chat column on mobile.
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
          <AIAssistant contentLeft={0} contentRight={0} />
        </Content>
      </Layout>
    );
  }

  // Tablet and Desktop
  const siderWidth = collapsed ? 60 : 220;
  const showChatColumn = !hideChatColumn && chatOpen && !isTablet;
  const chatColumnWidth = showChatColumn && !chatFullView ? 430 : 0;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header />
      <Layout style={{ marginTop: 56 }}>
        <SidebarComponent collapsed={collapsed} onCollapse={setCollapsed} />

        {/* Main content — hidden when chat is in full view */}
        {!chatFullView && (
          <Content
            className="responsive-content"
            style={{
              marginLeft: siderWidth,
              marginRight: chatColumnWidth,
              padding: isTablet ? '20px 24px' : '24px 32px',
              background: '#FFFFFF',
              minHeight: 'calc(100vh - 56px)',
              transition: 'margin-left 0.2s, margin-right 0.2s',
            }}
          >
            {children}
            <AIAssistant contentLeft={siderWidth} contentRight={chatColumnWidth} />
          </Content>
        )}

        {/* Right chat column — normal mode (430px fixed right) */}
        {showChatColumn && !chatFullView && (
          <div style={{
            width: 430,
            height: 'calc(100vh - 56px)',
            position: 'fixed',
            top: 56,
            right: 0,
            zIndex: 50,
          }}>
            <RightChatColumn
              onClose={handleChatClose}
              onFullView={handleChatFullView}
              isFullView={false}
            />
          </div>
        )}

        {/* Full view chat — fills content area (after sidebar) */}
        {!hideChatColumn && chatOpen && chatFullView && (
          <div style={{
            position: 'fixed',
            top: 56,
            left: siderWidth,
            right: 0,
            bottom: 0,
            zIndex: 60,
            background: '#fff',
            transition: 'left 0.2s',
          }}>
            <RightChatColumn
              onClose={handleChatClose}
              onFullView={handleChatFullView}
              isFullView={true}
            />
          </div>
        )}
      </Layout>
    </Layout>
  );
}
