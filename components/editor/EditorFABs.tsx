'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/useMediaQuery';

declare global {
  interface Window {
    __toggleChat?: () => void;
  }
}

export default function EditorFABs() {
  const { data: session } = useSession();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [unreadCount, setUnreadCount] = useState(0);
  const [aiOpen, setAiOpen] = useState(false);

  // Poll unread count every 30s for badge
  useEffect(() => {
    async function fetchUnread() {
      try {
        const res = await fetch('/api/chat/unread-count');
        const json = await res.json();
        const count = json.data?.totalUnread ?? json.totalUnread ?? 0;
        setUnreadCount(count);
      } catch {
        // fail silently — badge just shows 0
      }
    }
    if (session) {
      fetchUnread();
      const t = setInterval(fetchUnread, 30000);
      return () => clearInterval(t);
    }
  }, [session]);

  // Listen for AI panel open/close to hide/show FABs
  useEffect(() => {
    function onAiOpen() { setAiOpen(true); }
    function onAiClose() { setAiOpen(false); }
    window.addEventListener('aiPanelOpened', onAiOpen);
    window.addEventListener('aiPanelClosed', onAiClose);
    return () => {
      window.removeEventListener('aiPanelOpened', onAiOpen);
      window.removeEventListener('aiPanelClosed', onAiClose);
    };
  }, []);

  function handleChatClick() {
    if (window.innerWidth < 1024) {
      router.push('/dashboard/chat');
    } else {
      window.__toggleChat?.();
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: isMobile ? 84 : 28,
        right: isMobile ? 20 : 28,
        zIndex: 500,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        opacity: aiOpen ? 0 : 1,
        transform: aiOpen ? 'scale(0.8) translateY(20px)' : 'scale(1) translateY(0)',
        pointerEvents: aiOpen ? 'none' : 'auto',
        transition: 'opacity 0.25s ease, transform 0.25s ease',
      }}
    >
      {/* Chat FAB — only FAB on desktop editor */}
      <Fab
        onClick={handleChatClick}
        color="#1a73e8"
        tooltip="Chat"
        badge={unreadCount}
        icon={
          <svg width={20} height={20} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        }
      />
    </div>
  );
}

// Reusable FAB button
function Fab({ onClick, color, tooltip, icon, badge = 0, pulse = false }: {
  onClick: () => void;
  color: string;
  tooltip: string;
  icon: React.ReactNode;
  badge?: number;
  pulse?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      {/* Tooltip — appears to the left on hover */}
      <div
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          right: '100%',
          marginRight: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          background: '#1f1f1f',
          color: '#fff',
          fontSize: 12,
          fontWeight: 500,
          padding: '5px 10px',
          borderRadius: 8,
          whiteSpace: 'nowrap',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 150ms',
        }}
      >
        {tooltip}
        {/* Arrow pointing right */}
        <span style={{
          position: 'absolute',
          left: '100%',
          top: '50%',
          transform: 'translateY(-50%)',
          border: '4px solid transparent',
          borderLeftColor: '#1f1f1f',
        }} />
      </div>

      {/* Button */}
      <button
        onClick={onClick}
        aria-label={tooltip}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          width: 48,
          height: 48,
          borderRadius: '50%',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          cursor: 'pointer',
          backgroundColor: color,
          boxShadow: hovered
            ? '0 8px 24px rgba(0,0,0,0.25)'
            : '0 4px 12px rgba(0,0,0,0.15)',
          transform: hovered ? 'scale(1.1)' : 'scale(1)',
          transition: 'all 200ms',
        }}
      >
        {icon}

        {/* Pulse ring (AI only) */}
        {pulse && (
          <span
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              backgroundColor: color,
              opacity: 0.25,
              animation: 'fab-ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Unread badge (chat only) */}
        {badge > 0 && (
          <span style={{
            position: 'absolute',
            top: -4,
            right: -4,
            minWidth: 18,
            height: 18,
            padding: '0 4px',
            background: '#ef4444',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            borderRadius: 9,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #fff',
          }}>
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </button>

      {/* Keyframe animation for pulse */}
      {pulse && (
        <style>{`
          @keyframes fab-ping {
            75%, 100% { transform: scale(1.6); opacity: 0; }
          }
        `}</style>
      )}
    </div>
  );
}
