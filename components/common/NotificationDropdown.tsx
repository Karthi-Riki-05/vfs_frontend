"use client";

import React, { useState, useEffect } from 'react';
import { Badge, Popover, List, Avatar, Typography, Button, Empty } from 'antd';
import { BellOutlined, FileTextOutlined, TeamOutlined, MessageOutlined, CrownOutlined } from '@ant-design/icons';
import api from '@/lib/axios';

const { Text } = Typography;

interface Notification {
  id: string;
  type: 'flow' | 'team' | 'chat' | 'subscription' | 'system';
  title: string;
  description: string;
  read: boolean;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

const iconMap: Record<string, React.ReactNode> = {
  flow: <FileTextOutlined style={{ color: '#3CB371' }} />,
  team: <TeamOutlined style={{ color: '#1890FF' }} />,
  chat: <MessageOutlined style={{ color: '#3CB371' }} />,
  subscription: <CrownOutlined style={{ color: '#FAAD14' }} />,
  system: <BellOutlined style={{ color: '#8C8C8C' }} />,
};

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      api.get('/notifications').then(res => {
        const d = res.data?.data || res.data || {};
        setNotifications(d.notifications || (Array.isArray(d) ? d : []));
      }).catch(() => {
        // API may not exist yet — use empty state
        setNotifications([]);
      });
    }
  }, [open]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    api.put('/notifications/read-all').catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const content = (
    <div style={{ width: 360 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', borderBottom: '1px solid #F0F0F0',
      }}>
        <Text strong style={{ fontSize: 16 }}>Notifications</Text>
        {unreadCount > 0 && (
          <Button type="link" size="small" onClick={markAllRead} style={{ color: '#3CB371' }}>
            Mark all as read
          </Button>
        )}
      </div>
      {notifications.length === 0 ? (
        <div style={{ padding: '40px 16px', textAlign: 'center' }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<Text type="secondary">No notifications yet</Text>}
          />
        </div>
      ) : (
        <List
          dataSource={notifications.slice(0, 8)}
          style={{ maxHeight: 400, overflowY: 'auto' }}
          renderItem={(item) => (
            <List.Item
              style={{
                padding: '12px 16px',
                background: item.read ? 'transparent' : '#F0FFF4',
                cursor: 'pointer',
                borderBottom: '1px solid #F0F0F0',
              }}
            >
              <List.Item.Meta
                avatar={
                  <Avatar
                    size={36}
                    style={{ background: '#F8F9FA' }}
                    icon={iconMap[item.type] || iconMap.system}
                  />
                }
                title={<Text style={{ fontSize: 13, fontWeight: item.read ? 400 : 600 }}>{item.title}</Text>}
                description={
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>{item.description}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 11 }}>{timeAgo(item.createdAt)}</Text>
                  </div>
                }
              />
              {!item.read && (
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#3CB371', flexShrink: 0,
                }} />
              )}
            </List.Item>
          )}
        />
      )}
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
      arrow={false}
      overlayInnerStyle={{ padding: 0, borderRadius: 12, overflow: 'hidden' }}
    >
      <Badge count={unreadCount} size="small">
        <BellOutlined style={{ fontSize: 20, color: '#8C8C8C', cursor: 'pointer' }} />
      </Badge>
    </Popover>
  );
}
