"use client";

import React, { useState } from 'react';
import { Row, Col, Spin } from 'antd';
import { FileAddOutlined } from '@ant-design/icons';
import FlowCard from '@/components/flows/FlowCard';
import SectionHeader from '@/components/common/SectionHeader';
import ViewToggle from '@/components/common/ViewToggle';
import EmptyState from '@/components/common/EmptyState';
import { useFlows } from '@/hooks/useFlows';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { message } from 'antd';

const PLACEHOLDER_COLORS = [
  '#E8F5E9',
  '#E3F2FD',
  '#FFF3E0',
  '#F3E5F5',
  '#E0F7FA',
  '#FFF8E1',
];

export default function RecentDocuments() {
  const { flows, loading, fetchFlows, deleteFlow, duplicateFlow } = useFlows();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const router = useRouter();

  const handleEdit = (id: string) => {
    window.open(`/dashboard/flows/${id}`, '_blank');
  };

  const handleDelete = async (id: string) => {
    await deleteFlow(id);
  };

  const handleDuplicate = async (id: string) => {
    await duplicateFlow(id);
  };

  const handleFavorite = async (id: string) => {
    try {
      await api.patch(`/flows/${id}/favorite`);
      fetchFlows();
    } catch {
      message.error('Failed to update favorite');
    }
  };

  const handleCreateNew = () => {
    router.push('/dashboard/flows/new');
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ marginTop: 8 }}>
      <SectionHeader
        title="MY FLOWS"
        right={<ViewToggle view={view} onChange={setView} />}
      />

      {flows.length === 0 ? (
        <EmptyState
          title="No flows yet"
          description="Create your first flow to get started. Choose a template above or start from scratch."
          actionText="Create New Flow"
          onAction={handleCreateNew}
          icon={<FileAddOutlined style={{ fontSize: 48, color: '#3CB371' }} />}
        />
      ) : (
        <Row gutter={[24, 24]}>
          {flows.map((flow: any, index: number) => (
            <Col
              xs={24}
              sm={12}
              md={8}
              lg={6}
              key={flow.id}
            >
              <FlowCard
                flow={flow}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onFavorite={handleFavorite}
                variant="default"
                placeholderColor={PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length]}
              />
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
