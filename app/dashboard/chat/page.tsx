"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input, Button, Spin, Modal, Form, message } from 'antd';
import { SendOutlined, SearchOutlined, PlusOutlined } from '@ant-design/icons';
import api from '@/lib/axios';
import { useAuth } from '@/hooks/useAuth';
import EmptyState from '@/components/common/EmptyState';

// Colors
const PRIMARY = '#3CB371';
const TEXT = '#1A1A2E';
const TEXT_SECONDARY = '#8C8C8C';
const BORDER = '#F0F0F0';
const INPUT_BG = '#F8F9FA';

interface ChatGroup {
  id: string;
  name?: string;
  title?: string;
  memberCount?: number;
  lastMessage?: { message?: string; content?: string; createdAt?: string };
  unreadCount?: number;
  members?: Array<{ id: string; name?: string }>;
}

interface ChatMessage {
  id: string;
  message?: string;
  content?: string;
  senderId?: string;
  sender?: { id?: string; name?: string; image?: string };
  createdAt: string;
}

export default function ChatPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch groups
  const fetchGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const res = await api.get('/chat/groups');
      const d = res.data?.data || res.data || {};
      setGroups(d.groups || (Array.isArray(d) ? d : []));
    } catch {
      // handled by interceptor
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  // Fetch messages for selected group
  const fetchMessages = useCallback(async (groupId: string) => {
    setLoadingMessages(true);
    try {
      const res = await api.get(`/chat/groups/${groupId}/messages`);
      const dm = res.data?.data || res.data || {};
      setMessages(dm.messages || (Array.isArray(dm) ? dm : []));
    } catch {
      // handled by interceptor
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    if (selectedGroupId) {
      fetchMessages(selectedGroupId);
    }
  }, [selectedGroupId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSend = async () => {
    if (!messageInput.trim() || !selectedGroupId) return;
    const text = messageInput.trim();
    setMessageInput('');
    setSendingMessage(true);
    try {
      await api.post(`/chat/groups/${selectedGroupId}/messages`, { message: text });
      fetchMessages(selectedGroupId);
      fetchGroups(); // refresh last message preview
    } catch {
      message.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  // Create group
  const handleCreateGroup = async () => {
    try {
      const values = await form.validateFields();
      setCreating(true);
      await api.post('/chat/groups', { name: values.name });
      message.success('Group created');
      form.resetFields();
      setModalOpen(false);
      fetchGroups();
    } catch {
      // validation or API error
    } finally {
      setCreating(false);
    }
  };

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const groupName = (g: ChatGroup) => g.title || g.name || 'Unnamed';
  const getInitial = (g: ChatGroup) => groupName(g).charAt(0).toUpperCase();

  const filteredGroups = groups.filter((g) =>
    groupName(g).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // No groups at all — show EmptyState
  if (!loadingGroups && groups.length === 0) {
    return (
      <>
        <EmptyState
          title="No conversations"
          description="Start chatting with your team"
          actionText="New Chat"
          onAction={() => setModalOpen(true)}
        />
        <Modal
          title="New Chat"
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          onOk={handleCreateGroup}
          confirmLoading={creating}
        >
          <Form form={form} layout="vertical">
            <Form.Item name="name" label="Group Name" rules={[{ required: true, message: 'Please enter a group name' }]}>
              <Input placeholder="e.g. Project Discussion" />
            </Form.Item>
          </Form>
        </Modal>
      </>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', height: 'calc(100vh - 120px)', borderRadius: 12, overflow: 'hidden', border: `1px solid ${BORDER}`, background: '#fff' }}>
        {/* ---- Left Panel ---- */}
        <div style={{
          width: 280,
          minWidth: 280,
          background: '#fff',
          borderRight: `1px solid ${BORDER}`,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Search */}
          <div style={{ padding: '12px 12px 8px' }}>
            <Input
              prefix={<SearchOutlined style={{ color: TEXT_SECONDARY }} />}
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: INPUT_BG,
                border: 'none',
                borderRadius: 8,
              }}
            />
          </div>

          {/* Conversation list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingGroups ? (
              <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
            ) : (
              filteredGroups.map((group) => {
                const isActive = group.id === selectedGroupId;
                const lastMsg = group.lastMessage?.message || group.lastMessage?.content || 'No messages yet';
                const hasUnread = (group.unreadCount ?? 0) > 0;

                return (
                  <div
                    key={group.id}
                    onClick={() => setSelectedGroupId(group.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      cursor: 'pointer',
                      background: isActive ? '#F0FFF0' : 'transparent',
                      borderLeft: isActive ? `3px solid ${PRIMARY}` : '3px solid transparent',
                      transition: 'background 0.15s',
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: PRIMARY,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                      fontSize: 16,
                      flexShrink: 0,
                    }}>
                      {getInitial(group)}
                    </div>

                    {/* Name + last message */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {groupName(group)}
                        </span>
                        <span style={{ fontSize: 11, color: TEXT_SECONDARY, flexShrink: 0, marginLeft: 4 }}>
                          {formatTime(group.lastMessage?.createdAt)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          fontSize: 12,
                          color: TEXT_SECONDARY,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          flex: 1,
                        }}>
                          {lastMsg}
                        </span>
                        {hasUnread && (
                          <span style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: PRIMARY,
                            flexShrink: 0,
                          }} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* New Chat button */}
          <div style={{ padding: 12, borderTop: `1px solid ${BORDER}` }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              block
              onClick={() => setModalOpen(true)}
              style={{ background: PRIMARY, borderColor: PRIMARY, borderRadius: 8 }}
            >
              New Chat
            </Button>
          </div>
        </div>

        {/* ---- Right Panel ---- */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff' }}>
          {!selectedGroupId ? (
            // Placeholder when nothing is selected
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 16, color: TEXT_SECONDARY }}>Select a conversation</span>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div style={{
                padding: '14px 20px',
                borderBottom: `1px solid ${BORDER}`,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: PRIMARY,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: 15,
                }}>
                  {selectedGroup ? getInitial(selectedGroup) : '?'}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: TEXT }}>
                    {selectedGroup ? groupName(selectedGroup) : 'Chat'}
                  </div>
                  <div style={{ fontSize: 12, color: TEXT_SECONDARY, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: PRIMARY, display: 'inline-block' }} />
                    {selectedGroup?.memberCount ?? selectedGroup?.members?.length ?? 0} member{(selectedGroup?.memberCount ?? selectedGroup?.members?.length ?? 0) !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {/* Messages area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                {loadingMessages ? (
                  <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: TEXT_SECONDARY }}>
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === user?.id || msg.sender?.id === user?.id;
                    const text = msg.message || msg.content || '';

                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: 'flex',
                          justifyContent: isMe ? 'flex-end' : 'flex-start',
                          marginBottom: 12,
                        }}
                      >
                        <div
                          className={isMe ? 'chat-bubble-sent' : 'chat-bubble-received'}
                          style={{
                            maxWidth: '65%',
                            padding: '10px 14px',
                            borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                            background: isMe ? PRIMARY : BORDER,
                            color: isMe ? '#fff' : TEXT,
                            fontSize: 14,
                            lineHeight: 1.5,
                          }}
                        >
                          {!isMe && msg.sender?.name && (
                            <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_SECONDARY, marginBottom: 2 }}>
                              {msg.sender.name}
                            </div>
                          )}
                          <div>{text}</div>
                          <div style={{
                            fontSize: 10,
                            opacity: 0.7,
                            marginTop: 4,
                            textAlign: 'right',
                          }}>
                            {formatTime(msg.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div style={{
                padding: '12px 20px',
                borderTop: `1px solid ${BORDER}`,
                display: 'flex',
                gap: 8,
                alignItems: 'center',
              }}>
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onPressEnter={handleSend}
                  placeholder="Type a message..."
                  style={{
                    flex: 1,
                    borderRadius: 20,
                    background: INPUT_BG,
                    border: `1px solid ${BORDER}`,
                    padding: '8px 16px',
                  }}
                  size="large"
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSend}
                  loading={sendingMessage}
                  size="large"
                  style={{
                    background: PRIMARY,
                    borderColor: PRIMARY,
                    borderRadius: 20,
                    width: 44,
                    height: 44,
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create group modal */}
      <Modal
        title="New Chat"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={handleCreateGroup}
        confirmLoading={creating}
        okButtonProps={{ style: { background: PRIMARY, borderColor: PRIMARY } }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Group Name" rules={[{ required: true, message: 'Please enter a group name' }]}>
            <Input placeholder="e.g. Project Discussion" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
