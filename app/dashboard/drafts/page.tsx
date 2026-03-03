"use client";

import React, { useEffect, useState } from 'react';
import { Row, Col, Spin, message } from 'antd';
import SectionHeader from '@/components/common/SectionHeader';
import ViewToggle from '@/components/common/ViewToggle';
import EmptyState from '@/components/common/EmptyState';
import FlowCard from '@/components/flows/FlowCard';
import api from '@/lib/axios';
import { useRouter } from 'next/navigation';

const PLACEHOLDER_COLORS = ['#E8F5E9', '#E3F2FD', '#FFF3E0', '#F3E5F5', '#E0F7FA', '#FFF8E1'];

export default function DraftsPage() {
  const [flows, setFlows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const router = useRouter();

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/flows?status=draft');
      const d1 = res.data?.data || res.data || {};
      setFlows(d1.flows || (Array.isArray(d1) ? d1 : []));
    } catch {
      try {
        const res = await api.get('/flows');
        const d2 = res.data?.data || res.data || {};
        const all = d2.flows || (Array.isArray(d2) ? d2 : []);
        setFlows(all.filter((f: any) => f.isPublic === false));
      } catch {
        setFlows([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

  const handleEdit = (id: string) => {
    router.push(`/dashboard/flows/${id}`);
  };

  const handleView = (id: string) => {
    window.open(`/viewer/${id}`, '_blank');
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/flows/${id}`);
      message.success('Draft deleted');
      setFlows((prev) => prev.filter((f) => f.id !== id));
    } catch {
      message.error('Failed to delete draft');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await api.post(`/flows/${id}/duplicate`);
      message.success('Draft duplicated');
      fetchDrafts();
    } catch {
      message.error('Failed to duplicate draft');
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <SectionHeader
        title="DRAFTS"
        right={<ViewToggle view={view} onChange={setView} />}
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" />
        </div>
      ) : flows.length > 0 ? (
        <Row gutter={[16, 16]}>
          {flows.map((flow: any, index: number) => (
            <Col xs={24} sm={12} md={8} lg={6} key={flow.id}>
              <FlowCard
                flow={flow}
                onEdit={handleEdit}
                onView={handleView}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                placeholderColor={PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length]}
              />
            </Col>
          ))}
        </Row>
      ) : (
        <EmptyState
          title="No drafts"
          description="Your unpublished flows will appear here"
        />
      )}
    </div>
  );
}
