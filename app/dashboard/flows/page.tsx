"use client";

import React from 'react';
import { Row, Col, Input, Select, Pagination, Spin, Table, Button, Dropdown, Typography } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, StarOutlined, StarFilled, CopyOutlined, DeleteOutlined, MoreOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import SectionHeader from '@/components/common/SectionHeader';
import ViewToggle from '@/components/common/ViewToggle';
import EmptyState from '@/components/common/EmptyState';
import FlowCard from '@/components/flows/FlowCard';
import { useFlows } from '@/hooks/useFlows';
import { createNewFlow } from '@/lib/flow';

const { Text } = Typography;

const PLACEHOLDER_COLORS = [
  '#E8F5E9', '#E3F2FD', '#FFF3E0', '#F3E5F5', '#E0F7FA', '#FFF8E1',
];

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

export default function FlowsPage() {
  const {
    flows, loading, search, setSearch, page, setPage,
    pageSize, setPageSize, total, sort, setSort,
    deleteFlow, duplicateFlow, favoriteFlow,
  } = useFlows();
  const router = useRouter();
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');

  const handleEdit = (id: string) => {
    window.open(`/dashboard/flows/${id}`, '_blank');
  };

  const handleNewFlow = () => {
    createNewFlow();
  };

  const getMenuItems = (flow: any) => [
    { key: 'edit', label: 'Edit', icon: <EditOutlined />, onClick: () => handleEdit(flow.id) },
    {
      key: 'favorite',
      label: flow.isFavorite ? 'Remove Favorite' : 'Mark as Favorite',
      icon: flow.isFavorite ? <StarFilled style={{ color: '#FAAD14' }} /> : <StarOutlined />,
      onClick: () => favoriteFlow(flow.id),
    },
    { key: 'duplicate', label: 'Duplicate', icon: <CopyOutlined />, onClick: () => duplicateFlow(flow.id) },
    { type: 'divider' as const },
    { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true, onClick: () => deleteFlow(flow.id) },
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

  return (
    <div style={{ padding: 24 }}>
      <SectionHeader
        title="MY FLOWS"
        right={
          <>
            <Input
              prefix={<SearchOutlined style={{ color: '#8C8C8C' }} />}
              placeholder="Search flows..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              style={{
                width: 220,
                backgroundColor: '#F8F9FA',
                borderRadius: 8,
                border: 'none',
              }}
              variant="borderless"
            />
            <Select
              value={sort}
              onChange={setSort}
              style={{ width: 150 }}
              options={[
                { label: 'Last Modified', value: 'updatedAt' },
                { label: 'Name', value: 'name' },
                { label: 'Created', value: 'createdAt' },
              ]}
            />
            <ViewToggle view={viewMode} onChange={setViewMode} />
            <button
              onClick={handleNewFlow}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 16px',
                backgroundColor: '#3CB371',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <PlusOutlined />
              New Flow
            </button>
          </>
        }
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" />
        </div>
      ) : flows.length > 0 ? (
        <>
          {viewMode === 'grid' ? (
            <Row gutter={[16, 16]}>
              {flows.map((flow: any, index: number) => (
                <Col xs={24} sm={12} md={8} lg={6} key={flow.id}>
                  <FlowCard
                    flow={flow}
                    onEdit={handleEdit}
                    onDelete={deleteFlow}
                    onDuplicate={duplicateFlow}
                    onFavorite={favoriteFlow}
                    variant="default"
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
          {total > pageSize && (
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <Pagination
                current={page}
                pageSize={pageSize}
                total={total}
                onChange={(p, ps) => { setPage(p); setPageSize(ps); }}
                showSizeChanger
              />
            </div>
          )}
        </>
      ) : (
        <EmptyState
          title="No flows yet"
          description="Create your first flow to get started"
          actionText="Create Flow"
          onAction={handleNewFlow}
        />
      )}
    </div>
  );
}
