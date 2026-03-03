"use client";

import React, { useEffect, useState } from 'react';
import { Row, Col, Spin, Button, Modal, message } from 'antd';
import { DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import SectionHeader from '@/components/common/SectionHeader';
import EmptyState from '@/components/common/EmptyState';
import FlowCard from '@/components/flows/FlowCard';
import api from '@/lib/axios';

const PLACEHOLDER_COLORS = ['#E8F5E9', '#E3F2FD', '#FFF3E0', '#F3E5F5', '#E0F7FA', '#FFF8E1'];

export default function TrashPage() {
  const [flows, setFlows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrash = async () => {
    setLoading(true);
    try {
      const res = await api.get('/flows/trash');
      const d1 = res.data?.data || res.data || {};
      setFlows(d1.flows || (Array.isArray(d1) ? d1 : []));
    } catch {
      try {
        const res = await api.get('/flows?deleted=true');
        const d2 = res.data?.data || res.data || {};
        setFlows(d2.flows || (Array.isArray(d2) ? d2 : []));
      } catch {
        setFlows([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  const handleRestore = async (id: string) => {
    try {
      await api.post(`/flows/${id}/restore`);
      message.success('Flow restored');
      setFlows((prev) => prev.filter((f) => f.id !== id));
    } catch {
      message.error('Failed to restore flow');
    }
  };

  const handlePermanentDelete = (id: string) => {
    Modal.confirm({
      title: 'Permanently delete this flow?',
      icon: <ExclamationCircleOutlined />,
      content: 'This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await api.delete(`/flows/${id}/permanent`);
          message.success('Flow permanently deleted');
          setFlows((prev) => prev.filter((f) => f.id !== id));
        } catch {
          message.error('Failed to delete flow');
        }
      },
    });
  };

  const handleEmptyTrash = () => {
    Modal.confirm({
      title: 'Empty trash?',
      icon: <ExclamationCircleOutlined />,
      content: 'All flows in the trash will be permanently deleted. This action cannot be undone.',
      okText: 'Empty Trash',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await api.delete('/flows/trash');
          message.success('Trash emptied');
          setFlows([]);
        } catch {
          message.error('Failed to empty trash');
        }
      },
    });
  };

  return (
    <div style={{ padding: 24 }}>
      <SectionHeader
        title="TRASH"
        right={
          flows.length > 0 ? (
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={handleEmptyTrash}
            >
              Empty Trash
            </Button>
          ) : null
        }
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
                variant="trash"
                onRestore={handleRestore}
                onPermanentDelete={handlePermanentDelete}
                placeholderColor={PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length]}
              />
            </Col>
          ))}
        </Row>
      ) : (
        <EmptyState
          title="Trash is empty"
          description="Deleted flows will appear here for 30 days"
        />
      )}
    </div>
  );
}
