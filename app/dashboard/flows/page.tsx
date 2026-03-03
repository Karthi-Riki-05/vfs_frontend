"use client";

import React from 'react';
import { Row, Col, Input, Select, Pagination, Spin } from 'antd';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import SectionHeader from '@/components/common/SectionHeader';
import ViewToggle from '@/components/common/ViewToggle';
import EmptyState from '@/components/common/EmptyState';
import FlowCard from '@/components/flows/FlowCard';
import { useFlows } from '@/hooks/useFlows';

const PLACEHOLDER_COLORS = [
  '#E8F5E9', '#E3F2FD', '#FFF3E0', '#F3E5F5', '#E0F7FA', '#FFF8E1',
];

export default function FlowsPage() {
  const {
    flows, loading, search, setSearch, page, setPage,
    pageSize, setPageSize, total, sort, setSort,
    deleteFlow, duplicateFlow,
  } = useFlows();
  const router = useRouter();
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');

  const handleEdit = (id: string) => {
    router.push(`/dashboard/flows/${id}`);
  };

  const handleNewFlow = () => {
    router.push('/dashboard/flows/new');
  };

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
          <Row gutter={[16, 16]}>
            {flows.map((flow: any, index: number) => (
              <Col xs={24} sm={12} md={8} lg={6} key={flow.id}>
                <FlowCard
                  flow={flow}
                  onEdit={handleEdit}
                  onDelete={deleteFlow}
                  onDuplicate={duplicateFlow}
                  onFavorite={() => {}}
                  variant="default"
                  placeholderColor={PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length]}
                />
              </Col>
            ))}
          </Row>
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
