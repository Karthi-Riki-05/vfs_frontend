"use client";

import React from 'react';
import { Card, Button, Typography, Dropdown } from 'antd';
import {
  EditOutlined, DeleteOutlined, CopyOutlined, StarOutlined, StarFilled,
  MoreOutlined, ProjectOutlined, UndoOutlined
} from '@ant-design/icons';

const { Text } = Typography;

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} mins Ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hours Ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} days Ago`;
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface FlowCardProps {
  flow: {
    id: string;
    name: string;
    description?: string;
    thumbnail?: string;
    updatedAt: string;
    deletedAt?: string | null;
    isPublic?: boolean;
    isFavorite?: boolean;
  };
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onFavorite?: (id: string) => void;
  onRestore?: (id: string) => void;
  onPermanentDelete?: (id: string) => void;
  variant?: 'default' | 'trash';
  placeholderColor?: string;
}

export default function FlowCard({
  flow, onEdit, onDelete, onDuplicate, onFavorite, onRestore, onPermanentDelete,
  variant = 'default', placeholderColor
}: FlowCardProps) {
  const isTrash = variant === 'trash';
  const prefix = isTrash ? 'Deleted' : 'Edited';

  const moreItems = [
    { key: 'edit', label: 'Edit', icon: <EditOutlined />, onClick: () => onEdit?.(flow.id) },
    {
      key: 'favorite',
      label: flow.isFavorite ? 'Remove Favorite' : 'Mark as Favorite',
      icon: flow.isFavorite ? <StarFilled style={{ color: '#FAAD14' }} /> : <StarOutlined />,
      onClick: () => onFavorite?.(flow.id),
    },
    ...(onDuplicate ? [{ key: 'duplicate', label: 'Duplicate', icon: <CopyOutlined />, onClick: () => onDuplicate(flow.id) }] : []),
    { type: 'divider' as const },
    { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true, onClick: () => onDelete?.(flow.id) },
  ];

  return (
    <Card
      hoverable
      className="flow-card"
      style={{
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid #F0F0F0',
      }}
      styles={{ body: { padding: '12px 16px' } }}
      cover={
        <div
          style={{
            height: 160,
            background: placeholderColor || '#F8F9FA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            cursor: 'pointer',
          }}
          onClick={() => onEdit?.(flow.id)}
        >
          {flow.thumbnail ? (
            <img
              alt={flow.name}
              src={flow.thumbnail}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <ProjectOutlined style={{ fontSize: 48, color: '#BFBFBF' }} />
          )}
          {flow.isFavorite && !isTrash && (
            <StarFilled style={{
              position: 'absolute', top: 8, right: 8,
              fontSize: 18, color: '#FAAD14',
            }} />
          )}
        </div>
      }
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Text strong style={{ fontSize: 14, color: '#1A1A2E', display: 'block' }} ellipsis>
            {flow.name}
          </Text>
          <Text style={{ fontSize: 12, color: '#8C8C8C' }}>
            {prefix} {timeAgo(flow.deletedAt || flow.updatedAt)}
          </Text>
        </div>
        {isTrash ? (
          <div style={{ display: 'flex', gap: 4 }}>
            <Button
              type="text" size="small"
              icon={<UndoOutlined style={{ color: '#3CB371' }} />}
              onClick={() => onRestore?.(flow.id)}
              title="Restore"
            />
            <Button
              type="text" size="small" danger
              icon={<DeleteOutlined />}
              onClick={() => onPermanentDelete?.(flow.id)}
              title="Delete permanently"
            />
          </div>
        ) : (
          <Dropdown menu={{ items: moreItems }} trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />} size="small" />
          </Dropdown>
        )}
      </div>
    </Card>
  );
}
