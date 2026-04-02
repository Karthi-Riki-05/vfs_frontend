"use client";

import React, { useState, useEffect } from 'react';
import { Row, Col, Spin, Table, Button, Dropdown, Typography, message } from 'antd';
import { EditOutlined, StarOutlined, StarFilled, CopyOutlined, DeleteOutlined, MoreOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import SectionHeader from '@/components/common/SectionHeader';
import ViewToggle from '@/components/common/ViewToggle';
import EmptyState from '@/components/common/EmptyState';
import FlowCard from '@/components/flows/FlowCard';
import api from '@/lib/axios';

const { Text } = Typography;
const PLACEHOLDER_COLORS = ['#E8F5E9', '#E3F2FD', '#FFF3E0', '#F3E5F5', '#E0F7FA', '#FFF8E1'];

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} mins ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

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
    window.open(`/dashboard/flows/${id}`, '_blank');
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/flows/${id}`);
      setFlows(flows.filter(f => f.id !== id));
      message.success('Flow deleted');
    } catch (error) {
      message.error('Failed to delete flow');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await api.post(`/flows/${id}/duplicate`);
      message.success('Flow duplicated');
      fetchRecentFlows();
    } catch (error) {
      message.error('Failed to duplicate flow');
    }
  };

  const handleFavorite = async (id: string) => {
    try {
      const flow = flows.find(f => f.id === id);
      const newState = !flow?.isFavorite;
      await api.put(`/flows/${id}`, { isFavorite: newState });
      setFlows(flows.map(f => f.id === id ? { ...f, isFavorite: newState } : f));
    } catch (error) {
      message.error('Failed to update favorite');
    }
  };

  const getMenuItems = (flow: any) => [
    { key: 'edit', label: 'Edit', icon: <EditOutlined />, onClick: () => handleEdit(flow.id) },
    {
      key: 'favorite',
      label: flow.isFavorite ? 'Remove Favorite' : 'Mark as Favorite',
      icon: flow.isFavorite ? <StarFilled style={{ color: '#FAAD14' }} /> : <StarOutlined />,
      onClick: () => handleFavorite(flow.id),
    },
    { key: 'duplicate', label: 'Duplicate', icon: <CopyOutlined />, onClick: () => handleDuplicate(flow.id) },
    { type: 'divider' as const },
    { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true, onClick: () => handleDelete(flow.id) },
  ];

  const listColumns = [
    {
      title: '',
      dataIndex: 'thumbnail',
      key: 'thumbnail',
      width: 60,
      render: (thumb: string, record: any) => (
        <div
          style={{ width: 48, height: 36, borderRadius: 6, overflow: 'hidden', background: '#F8F9FA', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          onClick={() => handleEdit(record.id)}
        >
          {thumb ? <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 16, color: '#BFBFBF' }}>&#9633;</span>}
        </div>
      ),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => handleEdit(record.id)}>
          <Text strong style={{ fontSize: 14 }}>{name}</Text>
          {record.isFavorite && <StarFilled style={{ color: '#FAAD14', fontSize: 14 }} />}
        </div>
      ),
    },
    {
      title: 'Last Modified',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (d: string) => <Text type="secondary" style={{ fontSize: 13 }}>{timeAgo(d)}</Text>,
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_: any, record: any) => (
        <Dropdown menu={{ items: getMenuItems(record) }} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} size="small" onClick={(e) => e.stopPropagation()} />
        </Dropdown>
      ),
    },
  ];

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
      ) : view === 'grid' ? (
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
      ) : (
        <Table
          dataSource={flows}
          columns={listColumns}
          rowKey="id"
          pagination={false}
          size="middle"
          style={{ background: '#fff', borderRadius: 12 }}
        />
      )}
    </div>
  );
}
