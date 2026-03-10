"use client";

import React from 'react';
import { Card, Button, Typography, Dropdown, Tag } from 'antd';
import {
  EditOutlined, DeleteOutlined, CopyOutlined, StarOutlined, StarFilled,
  MoreOutlined, ProjectOutlined, UndoOutlined, FormOutlined,
  FolderOutlined, FolderAddOutlined, DisconnectOutlined,
  ShareAltOutlined, EyeOutlined, LockOutlined,
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
    projectId?: string | null;
    projectName?: string | null;
    accessType?: string;
    shareCount?: number;
    sharedByName?: string;
    shareId?: string;
  };
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onFavorite?: (id: string) => void;
  onRestore?: (id: string) => void;
  onPermanentDelete?: (id: string) => void;
  onRename?: (id: string, currentName: string) => void;
  onAssignProject?: (id: string) => void;
  onRemoveFromProject?: () => void;
  onShare?: (flow: any) => void;
  onRemoveShared?: (flowId: string, shareId: string) => void;
  variant?: 'default' | 'trash' | 'shared';
  placeholderColor?: string;
}

export default function FlowCard({
  flow, onEdit, onDelete, onDuplicate, onFavorite, onRestore, onPermanentDelete,
  onRename, onAssignProject, onRemoveFromProject, onShare, onRemoveShared,
  variant = 'default', placeholderColor
}: FlowCardProps) {
  const isTrash = variant === 'trash';
  const isShared = variant === 'shared';
  const isOwner = !isShared && !isTrash;
  const prefix = isTrash ? 'Deleted' : 'Edited';

  // Menu items for owned flows
  const ownerItems: any[] = [
    { key: 'edit', label: 'Edit', icon: <EditOutlined />, onClick: () => onEdit?.(flow.id) },
    {
      key: 'favorite',
      label: flow.isFavorite ? 'Remove Favorite' : 'Mark as Favorite',
      icon: flow.isFavorite ? <StarFilled style={{ color: '#FAAD14' }} /> : <StarOutlined />,
      onClick: () => onFavorite?.(flow.id),
    },
    ...(onRename ? [{
      key: 'rename', label: 'Rename', icon: <FormOutlined />,
      onClick: () => onRename(flow.id, flow.name),
    }] : []),
    ...(onAssignProject ? [{
      key: 'assign-project', label: 'Assign to Project', icon: <FolderAddOutlined />,
      onClick: () => onAssignProject(flow.id),
    }] : []),
    ...(onRemoveFromProject ? [{
      key: 'remove-project', label: 'Remove from Project', icon: <DisconnectOutlined />,
      onClick: () => onRemoveFromProject(),
    }] : []),
    ...(onShare ? [{
      key: 'share', label: 'Share', icon: <ShareAltOutlined />,
      onClick: () => onShare(flow),
    }] : []),
    ...(onDuplicate ? [{ key: 'duplicate', label: 'Duplicate', icon: <CopyOutlined />, onClick: () => onDuplicate(flow.id) }] : []),
    { type: 'divider' as const },
    { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true, onClick: () => onDelete?.(flow.id) },
  ];

  // Menu items for shared flows
  const sharedViewItems: any[] = [
    { key: 'open', label: 'Open (view only)', icon: <EyeOutlined />, onClick: () => onEdit?.(flow.id) },
    {
      key: 'favorite',
      label: flow.isFavorite ? 'Remove Favorite' : 'Mark as Favorite',
      icon: flow.isFavorite ? <StarFilled style={{ color: '#FAAD14' }} /> : <StarOutlined />,
      onClick: () => onFavorite?.(flow.id),
    },
    { type: 'divider' as const },
    ...(onRemoveShared && flow.shareId ? [{
      key: 'remove-shared', label: 'Remove from Shared', icon: <ShareAltOutlined />, danger: true,
      onClick: () => onRemoveShared(flow.id, flow.shareId!),
    }] : []),
  ];

  const sharedEditItems: any[] = [
    { key: 'edit', label: 'Edit', icon: <EditOutlined />, onClick: () => onEdit?.(flow.id) },
    {
      key: 'favorite',
      label: flow.isFavorite ? 'Remove Favorite' : 'Mark as Favorite',
      icon: flow.isFavorite ? <StarFilled style={{ color: '#FAAD14' }} /> : <StarOutlined />,
      onClick: () => onFavorite?.(flow.id),
    },
    ...(onDuplicate ? [{ key: 'duplicate', label: 'Duplicate', icon: <CopyOutlined />, onClick: () => onDuplicate(flow.id) }] : []),
    { type: 'divider' as const },
    ...(onRemoveShared && flow.shareId ? [{
      key: 'remove-shared', label: 'Remove from Shared', icon: <ShareAltOutlined />, danger: true,
      onClick: () => onRemoveShared(flow.id, flow.shareId!),
    }] : []),
  ];

  const moreItems = isShared
    ? (flow.accessType === 'edit' ? sharedEditItems : sharedViewItems)
    : ownerItems;

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
          {isShared && (
            <Tag
              color={flow.accessType === 'edit' ? 'green' : 'blue'}
              style={{ position: 'absolute', top: 8, left: 8, fontSize: 11 }}
            >
              {flow.accessType === 'edit' ? 'Can edit' : 'View only'}
            </Tag>
          )}
        </div>
      }
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Text strong style={{ fontSize: 14, color: '#1A1A2E', display: 'block' }} ellipsis>
            {flow.name}
          </Text>
          {flow.projectName && (
            <Text style={{ fontSize: 11, color: '#8C8C8C', display: 'block' }}>
              <FolderOutlined style={{ marginRight: 4, fontSize: 10 }} />
              {flow.projectName}
            </Text>
          )}
          {/* Share badge for owned flows */}
          {isOwner && (flow.shareCount ?? 0) > 0 && (
            <Text style={{ fontSize: 11, color: '#3CB371', display: 'block' }}>
              <ShareAltOutlined style={{ marginRight: 4, fontSize: 10 }} />
              Shared with {flow.shareCount}
            </Text>
          )}
          {/* Shared by info for received flows */}
          {isShared && flow.sharedByName && (
            <Text style={{ fontSize: 11, color: '#1890FF', display: 'block' }}>
              <ShareAltOutlined style={{ marginRight: 4, fontSize: 10 }} />
              Shared by {flow.sharedByName}
            </Text>
          )}
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
