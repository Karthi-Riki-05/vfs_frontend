"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RightChatColumn from '@/components/chat/RightChatColumn';

/**
 * /dashboard/chat
 * - Mobile (< 768px): full-screen single-column chat (list → messages with back button)
 * - Desktop: opens the right chat column and redirects to /dashboard
 */
export default function ChatPage() {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);
    setReady(true);

    if (!mobile) {
      (window as any).__openChat?.();
      router.replace('/dashboard');
    }
  }, [router]);

  if (!ready || !isMobile) return null;

  // Mobile: full-screen chat using single-column mode (isFullView=false)
  // CSS override forces the 430px column to fill the screen width
  return (
    <div style={{
      position: 'fixed',
      top: 56,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 80,
      background: '#fff',
    }}>
      <style>{`
        .mobile-chat-wrap .right-chat-column {
          width: 100% !important;
          min-width: 100% !important;
          border-left: none !important;
        }
        /* Hide the expand/fullview button on mobile — not relevant as standalone page */
        .mobile-chat-wrap button[title="Full view"],
        .mobile-chat-wrap button[title="Collapse"] {
          display: none !important;
        }
      `}</style>
      <div className="mobile-chat-wrap" style={{ width: '100%', height: '100%' }}>
        <RightChatColumn
          onClose={() => router.back()}
          onFullView={() => {}}
          isFullView={false}
        />
      </div>
    </div>
  );
}
