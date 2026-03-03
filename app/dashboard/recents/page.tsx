"use client";

import React, { useState, useEffect } from 'react';
import { Row, Col, Spin, message } from 'antd';
import { useRouter } from 'next/navigation';
import SectionHeader from '@/components/common/SectionHeader';
import ViewToggle from '@/components/common/ViewToggle';
import EmptyState from '@/components/common/EmptyState';
import FlowCard from '@/components/flows/FlowCard';
import api from '@/lib/axios';

const PLACEHOLDER_COLORS = ['#E8F5E9', '#E3F2FD', '#FFF3E0', '#F3E5F5', '#E0F7FA', '#FFF8E1'];

export default function RecentsPage() {
  const router = useRouter();
  const [flows, setFlows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetchRecentFlows();
  }, []);

  const fetchRecentFlows = async () => {
    setLoading(true);
    try {
      const response = await api.get('/flows');
      const d = response.data?.data || response.data || {};
      const allFlows = d.flows || (Array.isArray(d) ? d : []);
      const sorted = [...allFlows]
        .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 12);
      setFlows(sorted);
    } catch (error) {
      console.error('Failed to load recent flows', error);
      message.error('Failed to load recent flows');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id: string) => {
    router.push(`/dashboard/flows/${id}`);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/flows/${id}`);
      setFlows(flows.filter(f => f.id !== id));
      message.success('Flow deleted');
    } catch (error) {
      console.error('Failed to delete flow', error);
      message.error('Failed to delete flow');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const response = await api.post(`/flows/${id}/duplicate`);
      setFlows([response.data, ...flows]);
      message.success('Flow duplicated');
    } catch (error) {
      console.error('Failed to duplicate flow', error);
      message.error('Failed to duplicate flow');
    }
  };

  const handleFavorite = async (id: string) => {
    try {
      const flow = flows.find(f => f.id === id);
      await api.patch(`/flows/${id}`, { isFavorite: !flow?.isFavorite });
      setFlows(flows.map(f => f.id === id ? { ...f, isFavorite: !f.isFavorite } : f));
    } catch (error) {
      console.error('Failed to toggle favorite', error);
      message.error('Failed to update favorite');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <SectionHeader title="RECENTS" right={<ViewToggle view={view} onChange={setView} />} />
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <SectionHeader
        title="RECENTS"
        right={<ViewToggle view={view} onChange={setView} />}
      />

      {flows.length === 0 ? (
        <EmptyState
          title="No recent activity"
          description="Your recently edited flows will appear here"
        />
      ) : (
        <Row gutter={[16, 16]}>
          {flows.map((flow, index) => (
            <Col xs={24} sm={12} md={8} lg={6} key={flow.id}>
              <FlowCard
                flow={flow}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onFavorite={handleFavorite}
                placeholderColor={PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length]}
              />
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
