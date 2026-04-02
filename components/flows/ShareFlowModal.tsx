"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Input, Select, Button, Avatar, Typography, Spin, Empty, Divider, message } from 'antd';
import {
  SearchOutlined, UserOutlined, LockOutlined, EditOutlined,
  DeleteOutlined, ShareAltOutlined,
} from '@ant-design/icons';
import { flowsApi } from '@/api/flows.api';

const { Text } = Typography;

interface ShareFlowModalProps {
  open: boolean;
  flow: { id: string; name: string } | null;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ShareMember {
  id: string;
  name: string;
  email: string;
  image?: string;
}

interface ExistingShare {
  id: string;
  permission: string;
  sharedWith: ShareMember;
  createdAt: string;
}

export default function ShareFlowModal({ open, flow, onClose, onSuccess }: ShareFlowModalProps) {
  const [shares, setShares] = useState<ExistingShare[]>([]);
  const [allMembers, setAllMembers] = useState<ShareMember[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [sharingUser, setSharingUser] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    if (!flow) return;
    setLoading(true);
    try {
      const [sharesRes, membersRes] = await Promise.all([
        flowsApi.getShares(flow.id),
        flowsApi.getAvailableShareMembers(),
      ]);
      const sharesList = sharesRes.data?.data || [];
      setShares(Array.isArray(sharesList) ? sharesList : []);
      const membersList = membersRes.data?.data || [];
      setAllMembers(Array.isArray(membersList) ? membersList : []);
    } catch {
      message.error('Failed to load share data');
    } finally {
      setLoading(false);
    }
  }, [flow]);

  useEffect(() => {
    if (open && flow) {
      loadData();
      setSearch('');
      setPermissions({});
    }
  }, [open, flow, loadData]);

  const sharedIds = new Set(shares.map(s => s.sharedWith?.id));
  const availableMembers = allMembers.filter(m => !sharedIds.has(m.id));
  const filteredMembers = availableMembers.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleShare = async (userId: string) => {
    if (!flow) return;
    const perm = permissions[userId] || 'view';
    setSharingUser(userId);
    try {
      await flowsApi.shareFlow(flow.id, [{ userId, permission: perm }]);
      message.success('Flow shared');
      await loadData();
      onSuccess?.();
    } catch {
      message.error('Failed to share flow');
    } finally {
      setSharingUser(null);
    }
  };

  const handleChangePermission = async (shareId: string, newPermission: string) => {
    if (!flow) return;
    try {
      await flowsApi.updateShare(flow.id, shareId, newPermission);
      message.success('Permission updated');
      await loadData();
    } catch {
      message.error('Failed to update permission');
    }
  };

  const handleRemove = async (shareId: string) => {
    if (!flow) return;
    try {
      await flowsApi.removeShare(flow.id, shareId);
      message.success('Access removed');
      await loadData();
      onSuccess?.();
    } catch {
      message.error('Failed to remove access');
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShareAltOutlined style={{ color: '#3CB371' }} />
          <span>Share &quot;{flow?.name}&quot;</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={520}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
      ) : (
        <>
          {/* Search and available members */}
          <Text strong style={{ display: 'block', marginBottom: 8 }}>Share with team members:</Text>
          <Input
            prefix={<SearchOutlined style={{ color: '#8C8C8C' }} />}
            placeholder="Search members..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            allowClear
            style={{ marginBottom: 12 }}
          />

          <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 16 }}>
            {filteredMembers.length === 0 ? (
              <Empty description="No team members available" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              filteredMembers.map(member => (
                <div
                  key={member.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', borderRadius: 8, marginBottom: 4,
                    background: '#FAFAFA',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar src={member.image} icon={<UserOutlined />} size={32} />
                    <div>
                      <Text style={{ fontSize: 13, display: 'block' }}>{member.name || 'Unknown'}</Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>{member.email}</Text>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Select
                      size="small"
                      value={permissions[member.id] || 'view'}
                      onChange={v => setPermissions(p => ({ ...p, [member.id]: v }))}
                      style={{ width: 85 }}
                      options={[
                        { label: 'View', value: 'view' },
                        { label: 'Edit', value: 'edit' },
                      ]}
                    />
                    <Button
                      type="primary"
                      size="small"
                      loading={sharingUser === member.id}
                      onClick={() => handleShare(member.id)}
                      style={{ backgroundColor: '#3CB371', borderColor: '#3CB371' }}
                    >
                      Share
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Currently shared */}
          {shares.length > 0 && (
            <>
              <Divider style={{ margin: '12px 0' }}>Currently shared with</Divider>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {shares.map(share => (
                  <div
                    key={share.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', borderRadius: 8, marginBottom: 4,
                      background: '#F6FFED',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar src={share.sharedWith?.image} icon={<UserOutlined />} size={32} />
                      <div>
                        <Text style={{ fontSize: 13, display: 'block' }}>{share.sharedWith?.name || 'Unknown'}</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {share.permission === 'edit' ? (
                            <><EditOutlined /> Can edit</>
                          ) : (
                            <><LockOutlined /> View only</>
                          )}
                        </Text>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Select
                        size="small"
                        value={share.permission}
                        onChange={v => handleChangePermission(share.id, v)}
                        style={{ width: 85 }}
                        options={[
                          { label: 'View', value: 'view' },
                          { label: 'Edit', value: 'edit' },
                        ]}
                      />
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemove(share.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </Modal>
  );
}
