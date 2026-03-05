"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input, Button, Spin, Modal, Form, message, Image, Progress, Badge, Tooltip } from 'antd';
import {
  SendOutlined,
  SearchOutlined,
  PlusOutlined,
  PaperClipOutlined,
  PictureOutlined,
  FileOutlined,
  DownloadOutlined,
  AudioOutlined,
  VideoCameraOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  LinkOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  WifiOutlined,
  DisconnectOutlined,
  LoadingOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import api from '@/lib/axios';
import { upload } from '@/lib/axios';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { usePresence } from '@/hooks/usePresence';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import EmptyState from '@/components/common/EmptyState';

// Colors
const PRIMARY = '#3CB371';
const TEXT = '#1A1A2E';
const TEXT_SECONDARY = '#8C8C8C';
const BORDER = '#F0F0F0';
const INPUT_BG = '#F8F9FA';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

interface ChatGroup {
  id: string;
  name?: string;
  title?: string;
  memberCount?: number;
  _count?: { messages?: number; members?: number };
  messages?: Array<{ message?: string; content?: string; createdAt?: string; type?: string }>;
  lastMessage?: { message?: string; content?: string; createdAt?: string };
  unreadCount?: number;
  members?: Array<{ id: string; name?: string }>;
  userId?: string;
}

interface ChatFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
}

interface LinkPreview {
  url: string;
  title: string;
  description: string;
  image: string;
  siteName: string;
}

interface ChatMessage {
  id: string;
  message?: string;
  content?: string;
  senderId?: string;
  sender?: { id?: string; name?: string; image?: string };
  user?: { id?: string; name?: string; image?: string };
  userId?: string;
  type?: string;
  attachPath?: string;
  files?: ChatFile[];
  linkPreview?: LinkPreview;
  msgUsers?: Array<{ receiverId: string; isRead: boolean }>;
  createdAt: string;
  _status?: 'sending' | 'sent' | 'failed'; // optimistic UI status
  _tempId?: string;
}

// Helper: format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Helper: get file icon based on type
function getFileIcon(type?: string, mimeType?: string) {
  if (type === 'audio') return <AudioOutlined style={{ fontSize: 20 }} />;
  if (type === 'video') return <VideoCameraOutlined style={{ fontSize: 20 }} />;
  if (mimeType?.includes('pdf')) return <FilePdfOutlined style={{ fontSize: 20 }} />;
  if (mimeType?.includes('sheet') || mimeType?.includes('excel') || mimeType?.includes('csv'))
    return <FileExcelOutlined style={{ fontSize: 20 }} />;
  if (mimeType?.includes('word') || mimeType?.includes('document'))
    return <FileWordOutlined style={{ fontSize: 20 }} />;
  return <FileOutlined style={{ fontSize: 20 }} />;
}

export default function ChatPage() {
  const { user } = useAuth();
  const { socket, status: connectionStatus, reconnect } = useSocket();
  const { totalUnread, getUnreadCount, markGroupAsRead, refetch: refetchUnread } = useUnreadCount();
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
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [typingUsers, setTypingUsers] = useState<Record<string, Set<string>>>({});
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageTimestampRef = useRef<string | null>(null);
  const selectedGroupIdRef = useRef<string | null>(null);

  // Keep ref in sync
  useEffect(() => {
    selectedGroupIdRef.current = selectedGroupId;
  }, [selectedGroupId]);

  // Request desktop notification permission
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Get unique member userIds for presence tracking
  const memberUserIds = groups.reduce<string[]>((acc, g) => {
    if (g.userId && !acc.includes(g.userId)) acc.push(g.userId);
    return acc;
  }, []);
  const { isOnline, getLastSeen } = usePresence(memberUserIds);

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
  const fetchMessages = useCallback(async (groupId: string, after?: string) => {
    if (!after) setLoadingMessages(true);
    try {
      const params: any = {};
      if (after) params.after = after;
      const res = await api.get(`/chat/groups/${groupId}/messages`, { params });
      const dm = res.data?.data || res.data || {};
      const newMessages = dm.messages || (Array.isArray(dm) ? dm : []);

      if (after) {
        // Append new messages (deduplicate by id)
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const unique = newMessages.filter((m: ChatMessage) => !existingIds.has(m.id));
          return [...prev, ...unique];
        });
      } else {
        setMessages(newMessages);
      }

      if (newMessages.length > 0) {
        lastMessageTimestampRef.current = newMessages[newMessages.length - 1].createdAt;
      }
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
      // Mark as read when opening a conversation
      api.put(`/chat/groups/${selectedGroupId}/read`).catch(() => {});
      markGroupAsRead(selectedGroupId);
    }
  }, [selectedGroupId, fetchMessages, markGroupAsRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- Socket.IO Event Listeners ---
  useEffect(() => {
    if (!socket) return;

    const onNewMessage = (data: ChatMessage & { groupId?: string }) => {
      const msgGroupId = data.groupId;

      // Update group list (move group to top, update last message)
      setGroups(prev => {
        const idx = prev.findIndex(g => g.id === msgGroupId);
        if (idx === -1) return prev;
        const updated = [...prev];
        const group = { ...updated[idx] };
        group.messages = [{ message: data.message, createdAt: data.createdAt, type: data.type }];
        if (selectedGroupIdRef.current !== msgGroupId) {
          group.unreadCount = (group.unreadCount || 0) + 1;
        }
        updated.splice(idx, 1);
        return [group, ...updated];
      });

      // If viewing this group, append the message
      if (selectedGroupIdRef.current === msgGroupId) {
        setMessages(prev => {
          // Deduplicate / replace optimistic messages
          const tempIdx = prev.findIndex(m => m._tempId && m.message === data.message);
          if (tempIdx !== -1) {
            const updated = [...prev];
            updated[tempIdx] = { ...data, _status: 'sent' };
            return updated;
          }
          if (prev.some(m => m.id === data.id)) return prev;
          return [...prev, { ...data, _status: 'sent' }];
        });

        // Mark as read
        api.put(`/chat/groups/${msgGroupId}/read`).catch(() => {});
        socket.emit('message:mark-read', { groupId: msgGroupId });
      } else {
        // Desktop notification
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
          const senderName = data.user?.name || data.sender?.name || 'Someone';
          new Notification(`New message from ${senderName}`, {
            body: data.message || 'Sent a file',
            icon: '/images/image.png',
          });
        }
      }
    };

    const onTypingStart = (data: { groupId: string; userId: string }) => {
      if (data.userId === user?.id) return;
      setTypingUsers(prev => {
        const groupTypers = new Set(prev[data.groupId] || []);
        groupTypers.add(data.userId);
        return { ...prev, [data.groupId]: groupTypers };
      });
    };

    const onTypingStop = (data: { groupId: string; userId: string }) => {
      setTypingUsers(prev => {
        const groupTypers = new Set(prev[data.groupId] || []);
        groupTypers.delete(data.userId);
        return { ...prev, [data.groupId]: groupTypers };
      });
    };

    const onMessageRead = (data: { groupId: string; userId: string }) => {
      if (selectedGroupIdRef.current === data.groupId) {
        setMessages(prev => prev.map(msg => {
          if (!msg.msgUsers) return msg;
          return {
            ...msg,
            msgUsers: msg.msgUsers.map(mu =>
              mu.receiverId === data.userId ? { ...mu, isRead: true } : mu
            ),
          };
        }));
      }
    };

    const onLinkPreview = (data: { messageId: string; linkPreview: LinkPreview }) => {
      setMessages(prev => prev.map(msg =>
        msg.id === data.messageId ? { ...msg, linkPreview: data.linkPreview } : msg
      ));
    };

    // Handle reconnection: fetch missed messages
    const onReconnect = () => {
      if (selectedGroupIdRef.current && lastMessageTimestampRef.current) {
        fetchMessages(selectedGroupIdRef.current, lastMessageTimestampRef.current);
      }
      refetchUnread();
    };

    socket.on('message:new', onNewMessage);
    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop', onTypingStop);
    socket.on('message:read', onMessageRead);
    socket.on('message:link-preview', onLinkPreview);
    socket.io.on('reconnect', onReconnect);

    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop', onTypingStop);
      socket.off('message:read', onMessageRead);
      socket.off('message:link-preview', onLinkPreview);
      socket.io.off('reconnect', onReconnect);
    };
  }, [socket, user?.id, fetchMessages, refetchUnread]);

  // --- Typing indicator emit ---
  const emitTyping = useCallback((groupId: string) => {
    if (!socket) return;
    socket.emit('typing:start', { groupId });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', { groupId });
    }, 2000);
  }, [socket]);

  // Send message with optimistic UI
  const handleSend = async () => {
    if (!messageInput.trim() || !selectedGroupId) return;
    const text = messageInput.trim();
    setMessageInput('');
    setSendingMessage(true);

    // Stop typing indicator
    if (socket) socket.emit('typing:stop', { groupId: selectedGroupId });

    // Optimistic: add message immediately
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      _tempId: tempId,
      message: text,
      userId: user?.id,
      user: { id: user?.id, name: user?.name },
      type: 'text',
      createdAt: new Date().toISOString(),
      _status: 'sending',
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const res = await api.post(`/chat/groups/${selectedGroupId}/messages`, { message: text });
      const sent = res.data?.data;
      // Replace optimistic message
      setMessages(prev => prev.map(m =>
        m._tempId === tempId ? { ...(sent || optimisticMsg), _status: 'sent' } : m
      ));
      fetchGroups(); // refresh last message preview
    } catch {
      // Mark as failed
      setMessages(prev => prev.map(m =>
        m._tempId === tempId ? { ...m, _status: 'failed' } : m
      ));
      message.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  // Retry failed message
  const handleRetry = async (msg: ChatMessage) => {
    if (!selectedGroupId || !msg.message) return;
    setMessages(prev => prev.map(m =>
      m._tempId === msg._tempId ? { ...m, _status: 'sending' } : m
    ));
    try {
      const res = await api.post(`/chat/groups/${selectedGroupId}/messages`, { message: msg.message });
      const sent = res.data?.data;
      setMessages(prev => prev.map(m =>
        m._tempId === msg._tempId ? { ...(sent || m), _status: 'sent' } : m
      ));
    } catch {
      setMessages(prev => prev.map(m =>
        m._tempId === msg._tempId ? { ...m, _status: 'failed' } : m
      ));
    }
  };

  // Upload file and send as message
  const handleFileUpload = async (files: FileList | File[]) => {
    if (!selectedGroupId) return;
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      if (file.size > MAX_FILE_SIZE) {
        message.error(`${file.name} exceeds 25MB limit`);
        continue;
      }

      setUploading(true);
      setUploadProgress(0);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('groupId', selectedGroupId);
        const uploadRes = await upload('/chat/upload', formData, (percent) => {
          setUploadProgress(percent);
        });
        const data = uploadRes.data?.data || uploadRes.data;
        if (data) {
          // If backend returned a full message (groupId was sent), just refresh
          if (data.id) {
            // Message was already created and emitted via socket
          } else {
            // Fallback: send as message manually
            await api.post(`/chat/groups/${selectedGroupId}/messages`, {
              message: file.name,
              type: data.type || 'docs',
              attachPath: data.url,
            });
          }
          fetchGroups();
        }
      } catch {
        message.error(`Failed to upload ${file.name}`);
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) handleFileUpload(files);
    e.target.value = '';
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  // Clipboard paste handler (Ctrl+V for images)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      handleFileUpload(imageFiles);
    }
  };

  // Create group
  const handleCreateGroup = async () => {
    try {
      const values = await form.validateFields();
      setCreating(true);
      await api.post('/chat/groups', {
        title: values.name,
        memberIds: values.memberIds || [],
      });
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
    if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatLastSeen = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Get typing indicator text for a group
  const getTypingText = (groupId: string) => {
    const typers = typingUsers[groupId];
    if (!typers || typers.size === 0) return null;
    const count = typers.size;
    if (count === 1) return 'typing...';
    return `${count} people typing...`;
  };

  // Message status indicator
  const renderMessageStatus = (msg: ChatMessage) => {
    if (msg._status === 'sending') {
      return <ClockCircleOutlined style={{ fontSize: 11, marginLeft: 4 }} />;
    }
    if (msg._status === 'failed') {
      return <ExclamationCircleOutlined style={{ fontSize: 11, marginLeft: 4, color: '#ff4d4f' }} />;
    }
    // Delivered/read check marks
    if (msg.msgUsers && msg.msgUsers.length > 0) {
      const allRead = msg.msgUsers.every(mu => mu.isRead);
      if (allRead) {
        return (
          <span style={{ marginLeft: 4, color: '#52c41a' }}>
            <CheckOutlined style={{ fontSize: 9 }} />
            <CheckOutlined style={{ fontSize: 9, marginLeft: -4 }} />
          </span>
        );
      }
      return (
        <span style={{ marginLeft: 4, opacity: 0.6 }}>
          <CheckOutlined style={{ fontSize: 9 }} />
          <CheckOutlined style={{ fontSize: 9, marginLeft: -4 }} />
        </span>
      );
    }
    // Single check (sent)
    return <CheckOutlined style={{ fontSize: 9, marginLeft: 4, opacity: 0.6 }} />;
  };

  // Connection status banner
  const renderConnectionBanner = () => {
    if (connectionStatus === 'connected') return null;
    const config: Record<string, { bg: string; icon: React.ReactNode; text: string }> = {
      connecting: { bg: '#FFF7E6', icon: <LoadingOutlined style={{ color: '#FA8C16' }} />, text: 'Connecting...' },
      reconnecting: { bg: '#FFF7E6', icon: <LoadingOutlined style={{ color: '#FA8C16' }} />, text: 'Reconnecting...' },
      disconnected: { bg: '#FFF1F0', icon: <DisconnectOutlined style={{ color: '#FF4D4F' }} />, text: 'Connection lost.' },
    };
    const c = config[connectionStatus] || config.disconnected;
    return (
      <div style={{
        padding: '6px 16px',
        background: c.bg,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 13,
      }}>
        {c.icon}
        <span>{c.text}</span>
        {connectionStatus === 'disconnected' && (
          <Button type="link" size="small" icon={<ReloadOutlined />} onClick={reconnect}>
            Retry
          </Button>
        )}
      </div>
    );
  };

  // Render link preview card
  const renderLinkPreview = (preview: LinkPreview, isMe: boolean) => (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        gap: 10,
        padding: 10,
        background: isMe ? 'rgba(255,255,255,0.15)' : '#F8F9FA',
        borderRadius: 8,
        textDecoration: 'none',
        color: isMe ? '#fff' : TEXT,
        marginTop: 6,
        borderLeft: `3px solid ${isMe ? 'rgba(255,255,255,0.4)' : PRIMARY}`,
      }}
    >
      {preview.image && (
        <img
          src={preview.image}
          alt=""
          style={{ width: 60, height: 60, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {preview.title}
        </div>
        <div style={{ fontSize: 11, opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
          {preview.description}
        </div>
        <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
          <LinkOutlined style={{ fontSize: 10 }} />
          {preview.siteName}
        </div>
      </div>
    </a>
  );

  // No groups — show EmptyState
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
              style={{ background: INPUT_BG, border: 'none', borderRadius: 8 }}
            />
          </div>

          {/* Conversation list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingGroups ? (
              <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
            ) : (
              filteredGroups.map((group) => {
                const isActive = group.id === selectedGroupId;
                const lastMsgObj = group.messages?.[0] || group.lastMessage;
                const lastMsg = lastMsgObj?.message || lastMsgObj?.content || 'No messages yet';
                const unread = group.unreadCount || getUnreadCount(group.id);
                const hasUnread = unread > 0;
                const typingText = getTypingText(group.id);
                const groupCreatorOnline = group.userId ? isOnline(group.userId) : false;

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
                    {/* Avatar with presence dot */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
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
                      }}>
                        {getInitial(group)}
                      </div>
                      {/* Presence dot */}
                      <span style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: groupCreatorOnline ? '#52c41a' : '#D9D9D9',
                        border: '2px solid #fff',
                      }} />
                    </div>

                    {/* Name + last message */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          fontWeight: hasUnread ? 700 : 600,
                          fontSize: 14,
                          color: TEXT,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {groupName(group)}
                        </span>
                        <span style={{ fontSize: 11, color: TEXT_SECONDARY, flexShrink: 0, marginLeft: 4 }}>
                          {formatTime(lastMsgObj?.createdAt)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          fontSize: 12,
                          color: typingText ? PRIMARY : TEXT_SECONDARY,
                          fontStyle: typingText ? 'italic' : 'normal',
                          fontWeight: hasUnread ? 600 : 400,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          flex: 1,
                        }}>
                          {typingText || lastMsg}
                        </span>
                        {hasUnread && (
                          <Badge
                            count={unread}
                            size="small"
                            style={{ backgroundColor: PRIMARY }}
                          />
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
        <div
          style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', position: 'relative' }}
          onDragOver={selectedGroupId ? handleDragOver : undefined}
          onDragLeave={selectedGroupId ? handleDragLeave : undefined}
          onDrop={selectedGroupId ? handleDrop : undefined}
        >
          {/* Drag overlay */}
          {isDragging && (
            <div style={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              background: 'rgba(60, 179, 113, 0.1)',
              border: `2px dashed ${PRIMARY}`,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              color: PRIMARY,
              fontWeight: 600,
              pointerEvents: 'none',
            }}>
              Drop files here to upload
            </div>
          )}

          {/* Connection banner */}
          {renderConnectionBanner()}

          {!selectedGroupId ? (
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
                <div style={{ position: 'relative' }}>
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
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: TEXT }}>
                    {selectedGroup ? groupName(selectedGroup) : 'Chat'}
                  </div>
                  <div style={{ fontSize: 12, color: TEXT_SECONDARY, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {selectedGroup?.userId && isOnline(selectedGroup.userId) ? (
                      <>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#52c41a', display: 'inline-block' }} />
                        Online
                      </>
                    ) : selectedGroup?.userId && getLastSeen(selectedGroup.userId) ? (
                      <>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D9D9D9', display: 'inline-block' }} />
                        Last seen {formatLastSeen(getLastSeen(selectedGroup.userId))}
                      </>
                    ) : (
                      <>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: PRIMARY, display: 'inline-block' }} />
                        {selectedGroup?._count?.members || selectedGroup?.memberCount || 0} member{(selectedGroup?._count?.members || selectedGroup?.memberCount || 0) !== 1 ? 's' : ''}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }} onPaste={handlePaste}>
                {loadingMessages ? (
                  <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: TEXT_SECONDARY }}>
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.userId === user?.id || msg.senderId === user?.id || msg.sender?.id === user?.id || msg.user?.id === user?.id;
                    const text = msg.message || msg.content || '';
                    const senderName = msg.sender?.name || msg.user?.name;
                    const isImage = msg.type === 'image';
                    const isFile = msg.type === 'docs' || msg.type === 'others' || msg.type === 'audio' || msg.type === 'video';
                    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
                    const file = msg.files?.[0];
                    const isFailed = msg._status === 'failed';

                    return (
                      <div
                        key={msg.id || msg._tempId}
                        style={{
                          display: 'flex',
                          justifyContent: isMe ? 'flex-end' : 'flex-start',
                          marginBottom: 12,
                          opacity: msg._status === 'sending' ? 0.7 : 1,
                        }}
                      >
                        <div
                          style={{
                            maxWidth: '65%',
                            padding: '10px 14px',
                            borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                            background: isFailed ? '#FFF1F0' : isMe ? PRIMARY : BORDER,
                            color: isFailed ? '#FF4D4F' : isMe ? '#fff' : TEXT,
                            fontSize: 14,
                            lineHeight: 1.5,
                          }}
                        >
                          {!isMe && senderName && (
                            <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_SECONDARY, marginBottom: 2 }}>
                              {senderName}
                            </div>
                          )}

                          {/* Image message */}
                          {isImage && (msg.attachPath || file?.filePath) ? (
                            <div style={{ marginBottom: 4 }}>
                              <img
                                src={`${backendUrl}${msg.attachPath || file?.filePath}`}
                                alt={text}
                                style={{ maxWidth: '100%', borderRadius: 8, maxHeight: 250, cursor: 'pointer' }}
                                onClick={() => setLightboxImage(`${backendUrl}${msg.attachPath || file?.filePath}`)}
                              />
                            </div>
                          ) : isFile && (msg.attachPath || file?.filePath) ? (
                            /* File message */
                            <a
                              href={`${backendUrl}${msg.attachPath || file?.filePath}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '8px 12px',
                                background: isMe ? 'rgba(255,255,255,0.15)' : '#fff',
                                borderRadius: 8,
                                textDecoration: 'none',
                                color: isMe ? '#fff' : TEXT,
                                marginBottom: 4,
                              }}
                            >
                              {getFileIcon(msg.type, file?.fileType)}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {text}
                                </div>
                                {file && (
                                  <div style={{ fontSize: 11, opacity: 0.7 }}>
                                    {formatFileSize(file.fileSize)}
                                  </div>
                                )}
                              </div>
                              <DownloadOutlined />
                            </a>
                          ) : (
                            /* Text message */
                            <div>{text}</div>
                          )}

                          {/* Link preview */}
                          {msg.linkPreview && renderLinkPreview(msg.linkPreview, isMe)}

                          {/* Timestamp + status */}
                          <div style={{
                            fontSize: 10,
                            opacity: 0.7,
                            marginTop: 4,
                            textAlign: 'right',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                          }}>
                            {isFailed && (
                              <span
                                style={{ cursor: 'pointer', marginRight: 6, textDecoration: 'underline' }}
                                onClick={() => handleRetry(msg)}
                              >
                                Tap to retry
                              </span>
                            )}
                            {formatTime(msg.createdAt)}
                            {isMe && renderMessageStatus(msg)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Typing indicator */}
                {selectedGroupId && getTypingText(selectedGroupId) && (
                  <div style={{ display: 'flex', marginBottom: 12 }}>
                    <div style={{
                      padding: '8px 14px',
                      borderRadius: '14px 14px 14px 4px',
                      background: BORDER,
                      color: TEXT_SECONDARY,
                      fontSize: 13,
                      fontStyle: 'italic',
                    }}>
                      {getTypingText(selectedGroupId)}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Upload progress */}
              {uploading && (
                <div style={{ padding: '4px 20px' }}>
                  <Progress percent={uploadProgress} size="small" strokeColor={PRIMARY} />
                </div>
              )}

              {/* Input area */}
              <div style={{
                padding: '12px 20px',
                borderTop: `1px solid ${BORDER}`,
                display: 'flex',
                gap: 8,
                alignItems: 'center',
              }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={onFileSelect}
                  multiple
                  style={{ display: 'none' }}
                />
                <input
                  type="file"
                  ref={imageInputRef}
                  accept="image/*"
                  onChange={onFileSelect}
                  multiple
                  style={{ display: 'none' }}
                />
                <Button
                  type="text"
                  icon={<PaperClipOutlined />}
                  onClick={() => fileInputRef.current?.click()}
                  loading={uploading}
                  style={{ color: TEXT_SECONDARY, fontSize: 18 }}
                  title="Attach file (max 25MB)"
                />
                <Button
                  type="text"
                  icon={<PictureOutlined />}
                  onClick={() => imageInputRef.current?.click()}
                  loading={uploading}
                  style={{ color: TEXT_SECONDARY, fontSize: 18 }}
                  title="Send image"
                />
                <Input
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value);
                    if (selectedGroupId && e.target.value) emitTyping(selectedGroupId);
                  }}
                  onPressEnter={handleSend}
                  onPaste={handlePaste}
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

      {/* Image lightbox */}
      {lightboxImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          onClick={() => setLightboxImage(null)}
        >
          <img
            src={lightboxImage}
            alt="Preview"
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8 }}
            onClick={(e) => e.stopPropagation()}
          />
          <a
            href={lightboxImage}
            download
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              color: '#fff',
              fontSize: 24,
              background: 'rgba(255,255,255,0.2)',
              width: 40,
              height: 40,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DownloadOutlined />
          </a>
        </div>
      )}

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
