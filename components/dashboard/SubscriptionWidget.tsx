'use client';
import { useEffect, useState } from 'react';
import { Skeleton, Typography } from 'antd';

const { Text } = Typography;

interface SubInfo {
  plan: string;
  is_active: boolean;
  is_pro?: boolean;
  expires_at: string | null;
  billing_period_days?: number;
  messages_used?: number;
  messages_limit?: number;
  storage_used_mb?: number;
  storage_limit_mb?: number;
  notifications_count?: number;
}

export default function SubscriptionWidget() {
  const [sub, setSub] = useState<SubInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/subscription/info')
      .then(r => r.json())
      .then(data => setSub(data.data || data))
      .catch(() => setSub({ plan: 'Free', is_active: true, expires_at: null }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #F0F0F0', padding: 20 }}>
        <Skeleton active paragraph={{ rows: 4 }} />
      </div>
    );
  }
  if (!sub) return null;

  const expiryDate = sub.expires_at ? new Date(sub.expires_at) : null;
  const daysLeft = expiryDate
    ? Math.ceil((expiryDate.getTime() - Date.now()) / 86400000)
    : null;

  const status = (() => {
    if (!sub.is_active || (daysLeft !== null && daysLeft <= 0))
      return { label: 'Expired', color: '#FF4D4F', bg: '#FFF1F0', border: '#FFA39E' };
    if (daysLeft !== null && daysLeft <= 7)
      return { label: 'Expiring Soon', color: '#FA8C16', bg: '#FFF7E6', border: '#FFD591', pulse: true };
    if (daysLeft !== null && daysLeft <= 30)
      return { label: 'Active', color: '#1890FF', bg: '#E6F7FF', border: '#91D5FF' };
    return { label: 'Active', color: '#3CB371', bg: '#F0FFF4', border: '#B7EB8F' };
  })();

  const msgPct = (sub.messages_limit && sub.messages_used !== undefined)
    ? Math.min(100, (sub.messages_used / sub.messages_limit) * 100)
    : null;

  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      border: '1px solid #F0F0F0',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Text strong style={{ fontSize: 12, color: '#8C8C8C', textTransform: 'uppercase', letterSpacing: 1 }}>
          SUBSCRIPTION
        </Text>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 999,
          background: status.bg, color: status.color,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          {status.pulse && (
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: status.color,
              animation: 'subPulse 1.5s ease infinite',
            }}/>
          )}
          {status.label}
        </span>
      </div>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Row label="Plan" value={
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {sub.plan || 'Free'}
            {sub.is_pro && (
              <span style={{
                fontSize: 9, fontWeight: 700, background: '#FEF3C7', color: '#D97706',
                padding: '1px 6px', borderRadius: 999,
              }}>PRO</span>
            )}
          </span>
        }/>

        {expiryDate && (
          <Row label="Expires" value={
            <span style={{
              color: daysLeft !== null && daysLeft <= 7 ? '#FF4D4F'
                   : daysLeft !== null && daysLeft <= 30 ? '#FA8C16' : undefined,
              fontWeight: daysLeft !== null && daysLeft <= 30 ? 600 : undefined,
            }}>
              {expiryDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
              {daysLeft !== null && (
                <span style={{ marginLeft: 4, fontWeight: 400, color: '#8C8C8C', fontSize: 11 }}>
                  {daysLeft > 0 ? `(${daysLeft}d left)` : '(Expired)'}
                </span>
              )}
            </span>
          }/>
        )}

        {sub.messages_used !== undefined && (
          <div>
            <Row label="AI Messages" value={`${sub.messages_used} / ${sub.messages_limit ?? '\u221E'}`}/>
            {msgPct !== null && (
              <div style={{ marginTop: 6, width: '100%', background: '#F5F5F5', borderRadius: 999, height: 6 }}>
                <div style={{
                  height: 6, borderRadius: 999, transition: 'width 0.6s ease',
                  width: `${msgPct}%`,
                  background: msgPct > 90 ? '#FF4D4F' : msgPct > 70 ? '#FA8C16' : '#3CB371',
                }}/>
              </div>
            )}
          </div>
        )}

        {sub.storage_used_mb !== undefined && (
          <Row label="Storage" value={`${sub.storage_used_mb} MB / ${sub.storage_limit_mb ?? '\u221E'} MB`}/>
        )}

        {sub.notifications_count !== undefined && sub.notifications_count > 0 && (
          <Row label="Notifications" value={`${sub.notifications_count} unread`}/>
        )}
      </div>

      {/* CTA */}
      {(daysLeft !== null && daysLeft <= 30 || !sub.is_active) && (
        <button
          onClick={() => { window.location.href = '/dashboard/subscription'; }}
          style={{
            marginTop: 16, width: '100%', padding: '10px 0', fontSize: 12, fontWeight: 700,
            borderRadius: 8, border: 'none', cursor: 'pointer', color: '#fff',
            background: !sub.is_active || (daysLeft !== null && daysLeft <= 0) ? '#FF4D4F'
              : daysLeft !== null && daysLeft <= 7 ? '#FA8C16' : '#3CB371',
          }}
        >
          {!sub.is_active || (daysLeft !== null && daysLeft <= 0) ? 'Renew Subscription'
            : daysLeft !== null && daysLeft <= 7 ? 'Renew Now' : 'Manage Subscription'}
        </button>
      )}

      <style>{`
        @keyframes subPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 12, color: '#8C8C8C' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#1A1A2E' }}>{value}</span>
    </div>
  );
}
