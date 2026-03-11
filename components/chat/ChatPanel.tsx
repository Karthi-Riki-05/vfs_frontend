"use client";

import React, { useState, useEffect } from 'react';
import { CloseOutlined } from '@ant-design/icons';

// Lazy import the chat page to avoid circular deps
const ChatPageContent = React.lazy(() => import('@/app/dashboard/chat/page'));

export default function ChatPanel() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const onOpen = (e: Event) => {
      setIsOpen(true);
    };
    const onClose = () => {
      setIsOpen(false);
    };

    window.addEventListener('open-chat-panel', onOpen);
    window.addEventListener('close-chat-panel', onClose);
    return () => {
      window.removeEventListener('open-chat-panel', onOpen);
      window.removeEventListener('close-chat-panel', onClose);
    };
  }, []);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9990,
            background: 'rgba(0,0,0,0.3)',
            transition: 'opacity 0.3s',
          }}
        />
      )}

      {/* Slide-in panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100%',
          width: '100%',
          maxWidth: 420,
          zIndex: 9991,
          background: '#fff',
          boxShadow: isOpen ? '-4px 0 24px rgba(0,0,0,0.15)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease-in-out',
        }}
      >
        {/* Panel header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid #F0F0F0',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 600, color: '#1A1A2E' }}>Chat</span>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid #F0F0F0',
              background: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#8C8C8C',
            }}
          >
            <CloseOutlined style={{ fontSize: 14 }} />
          </button>
        </div>

        {/* Chat content */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {isOpen && (
            <React.Suspense
              fallback={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8C8C8C' }}>
                  Loading...
                </div>
              }
            >
              <div style={{ height: '100%', overflow: 'auto' }}>
                <ChatPageContent panelMode />
              </div>
            </React.Suspense>
          )}
        </div>
      </div>
    </>
  );
}

// Helper functions to open/close the panel from anywhere
export function openChatPanel() {
  window.dispatchEvent(new CustomEvent('open-chat-panel'));
}

export function closeChatPanel() {
  window.dispatchEvent(new CustomEvent('close-chat-panel'));
}
