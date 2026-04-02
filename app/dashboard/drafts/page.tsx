"use client";

import React, { useEffect, useState } from 'react';
import { Spin, message, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { isFlowEmpty, timeAgo } from '@/lib/flowUtils';

const { Text } = Typography;

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchDrafts() {
      try {
        // Try draftsOnly param first
        const res = await api.get('/flows?draftsOnly=true');
        const d = res.data?.data || res.data || {};
        const all = d.flows || (Array.isArray(d) ? d : []);
        setDrafts(all.filter((f: any) => isFlowEmpty(f)));
      } catch {
        // Fallback: fetch all and filter client-side
        try {
          const res = await api.get('/flows');
          const d = res.data?.data || res.data || {};
          const all = d.flows || (Array.isArray(d) ? d : []);
          setDrafts(all.filter((f: any) => isFlowEmpty(f)));
        } catch {
          setDrafts([]);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchDrafts();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.delete(`/flows/${id}`);
      setDrafts(prev => prev.filter(d => d.id !== id));
      message.success('Draft deleted');
    } catch {
      message.error('Failed to delete draft');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, background: '#FFFBEB',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width={20} height={20} fill="none" stroke="#F59E0B" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1A1A2E' }}>Drafts</h1>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Flows created but not yet edited
            {!loading && ` \u00B7 ${drafts.length} draft${drafts.length !== 1 ? 's' : ''}`}
          </Text>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <Spin size="large" />
        </div>
      ) : drafts.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '96px 0', textAlign: 'center',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, background: '#FFFBEB',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <svg width={32} height={32} fill="none" stroke="#FCD34D" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#333', margin: '0 0 4px' }}>No drafts</p>
          <p style={{ fontSize: 13, color: '#999', maxWidth: 260 }}>
            Flows you create but haven&apos;t edited yet will appear here
          </p>
          <button
            onClick={() => router.push('/dashboard/flows')}
            style={{
              marginTop: 20, padding: '10px 20px', background: '#3CB371', color: '#fff',
              fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 12, cursor: 'pointer',
            }}
          >
            Go to Flows
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 16,
        }}>
          {drafts.map(draft => (
            <div
              key={draft.id}
              onClick={() => window.open(`/dashboard/flows/${draft.id}`, '_blank')}
              style={{
                background: '#fff', border: '2px dashed #E5E7EB', borderRadius: 16,
                padding: 16, cursor: 'pointer', transition: 'all 0.2s', position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3CB371';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                const del = e.currentTarget.querySelector('[data-delete]') as HTMLElement;
                if (del) del.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E5E7EB';
                e.currentTarget.style.boxShadow = 'none';
                const del = e.currentTarget.querySelector('[data-delete]') as HTMLElement;
                if (del) del.style.opacity = '0';
              }}
            >
              {/* Delete button */}
              <button
                data-delete
                onClick={(e) => handleDelete(draft.id, e)}
                title="Delete draft"
                style={{
                  position: 'absolute', top: 12, right: 12, width: 28, height: 28,
                  borderRadius: 8, opacity: 0, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', background: 'transparent', border: 'none',
                  cursor: 'pointer', color: '#ccc', transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#EF4444'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ccc'; }}
              >
                <svg width={14} height={14} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>

              {/* Icon */}
              <div style={{
                width: 40, height: 40, borderRadius: 12, background: '#FFFBEB',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
              }}>
                <svg width={20} height={20} fill="none" stroke="#FBBF24" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>

              {/* Info */}
              <Text strong ellipsis style={{ fontSize: 14, color: '#1A1A2E', display: 'block', paddingRight: 24 }}>
                {draft.name || 'Untitled'}
              </Text>
              <Text type="secondary" style={{ fontSize: 12, marginTop: 2, display: 'block' }}>
                Created {timeAgo(draft.createdAt || draft.created_at)}
              </Text>

              {/* Badge */}
              <div style={{ marginTop: 12 }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, background: '#FFFBEB', color: '#D97706',
                  padding: '2px 8px', borderRadius: 999,
                }}>
                  Empty &middot; Click to edit
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
