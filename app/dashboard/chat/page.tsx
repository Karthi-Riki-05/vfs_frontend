"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Input, Button, Spin, Modal, Form, message, Image, Progress, Badge, Tooltip, Checkbox, Drawer } from 'antd';
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
  TeamOutlined,
  UserOutlined,
  MessageOutlined,
  RightOutlined,
  MoreOutlined,
  InfoCircleOutlined,
  UserAddOutlined,
  LogoutOutlined,
  DeleteOutlined,
  EditOutlined,
  StopOutlined,
  CloseOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
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
const TEAM_AVATAR_BG = '#7C3AED';
const CONTACT_AVATAR_BG = '#3B82F6';

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
  members?: Array<{ id: string; name?: string; email?: string; image?: string }>;
  userId?: string;
  teamId?: string;
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
  _status?: 'sending' | 'sent' | 'failed';
  _tempId?: string;
}

interface SidebarTeam {
  id: string;
  name?: string;
  description?: string;
  ownerId: string;
  ownerName?: string;
  memberCount: number;
  members: Array<{ id: string; name?: string; email?: string; image?: string }>;
  conversationId: string | null;
  lastMessage?: { message?: string; createdAt?: string } | null;
  unreadCount: number;
}

interface SidebarContact {
  id: string;
  name?: string;
  email?: string;
  image?: string;
  conversationId: string | null;
  lastMessage?: { message?: string; createdAt?: string } | null;
  unreadCount: number;
}

interface SidebarData {
  teams: SidebarTeam[];
  groups: ChatGroup[];
  contacts: SidebarContact[];
  allGroups: ChatGroup[];
}

interface TeamMemberOption {
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  alreadyInGroup: boolean;
}

interface TeamGroup {
  teamId: string;
  teamName: string;
  members: TeamMemberOption[];
}

interface GroupInfoData {
  id: string;
  title: string;
  createdBy: { id: string; name?: string; email?: string; image?: string };
  createdAt: string;
  memberCount: number;
  isAdmin: boolean;
  members: Array<{ id: string; name?: string; email?: string; image?: string; role: string; joinedAt?: string }>;
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

// Helper: resolve file URL — prefer proxy for files with IDs, fallback to backend URL
function resolveFileUrl(attachPath?: string, file?: ChatFile): string {
  if (file?.id) {
    return `/api/chat/files/${file.id}/serve`;
  }
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || '';
  return `${backendUrl}${attachPath || file?.filePath || ''}`;
}

export default function ChatPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { socket, status: connectionStatus, reconnect } = useSocket();
  const { totalUnread, getUnreadCount, markGroupAsRead, refetch: refetchUnread } = useUnreadCount();
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [sidebarData, setSidebarData] = useState<SidebarData | null>(null);
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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    teams: true,
    groups: false,
    members: true,
  });
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ id: string; type: 'team' | 'group' | 'member'; x: number; y: number; data: any } | null>(null);
  // Add Members modal
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [addMemberGroupId, setAddMemberGroupId] = useState<string | null>(null);
  const [availableMembers, setAvailableMembers] = useState<TeamGroup[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [addMemberSearch, setAddMemberSearch] = useState('');
  const [loadingAvailableMembers, setLoadingAvailableMembers] = useState(false);
  const [addingMembers, setAddingMembers] = useState(false);
  // Group Info drawer
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [groupInfo, setGroupInfo] = useState<GroupInfoData | null>(null);
  const [loadingGroupInfo, setLoadingGroupInfo] = useState(false);
  const [editingGroupName, setEditingGroupName] = useState(false);
  const [editGroupNameValue, setEditGroupNameValue] = useState('');
  // Create group modal — member picker
  const [createGroupMembers, setCreateGroupMembers] = useState<TeamGroup[]>([]);
  const [createSelectedMemberIds, setCreateSelectedMemberIds] = useState<Set<string>>(new Set());
  const [createMemberSearch, setCreateMemberSearch] = useState('');
  const [loadingCreateMembers, setLoadingCreateMembers] = useState(false);

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
  const memberUserIds = useMemo(() => {
    if (sidebarData?.contacts) {
      return sidebarData.contacts.map(c => c.id);
    }
    return groups.reduce<string[]>((acc, g) => {
      if (g.userId && !acc.includes(g.userId)) acc.push(g.userId);
      return acc;
    }, []);
  }, [sidebarData?.contacts, groups]);

  const { isOnline, getLastSeen } = usePresence(memberUserIds);

  // Fetch sidebar data (replaces fetchGroups)
  const fetchSidebar = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const res = await api.get('/chat/sidebar');
      const d = res.data?.data || res.data || {};
      if (d.teams !== undefined) {
        setSidebarData(d as SidebarData);
        // Set flat groups for backward compat
        const allGroups = d.allGroups || d.groups || [];
        setGroups(Array.isArray(allGroups) ? allGroups : []);
      } else {
        // Fallback: sidebar endpoint not available, use groups endpoint
        const gRes = await api.get('/chat/groups');
        const gd = gRes.data?.data || gRes.data || {};
        const groupList = gd.groups || (Array.isArray(gd) ? gd : []);
        setGroups(groupList);
        setSidebarData(null);
      }
    } catch {
      // Fallback to groups endpoint
      try {
        const gRes = await api.get('/chat/groups');
        const gd = gRes.data?.data || gRes.data || {};
        const groupList = gd.groups || (Array.isArray(gd) ? gd : []);
        setGroups(groupList);
      } catch {
        // handled by interceptor
      }
      setSidebarData(null);
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
    fetchSidebar();
  }, [fetchSidebar]);

  useEffect(() => {
    if (selectedGroupId) {
      fetchMessages(selectedGroupId);
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

      if (selectedGroupIdRef.current === msgGroupId) {
        setMessages(prev => {
          const tempIdx = prev.findIndex(m => m._tempId && m.message === data.message);
          if (tempIdx !== -1) {
            const updated = [...prev];
            updated[tempIdx] = { ...data, _status: 'sent' };
            return updated;
          }
          if (prev.some(m => m.id === data.id)) return prev;
          return [...prev, { ...data, _status: 'sent' }];
        });

        api.put(`/chat/groups/${msgGroupId}/read`).catch(() => {});
        socket.emit('message:mark-read', { groupId: msgGroupId });
      } else {
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

    if (socket) socket.emit('typing:stop', { groupId: selectedGroupId });

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
      setMessages(prev => prev.map(m =>
        m._tempId === tempId ? { ...(sent || optimisticMsg), _status: 'sent' } : m
      ));
    } catch {
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
          if (data.id) {
            // Message was already created and emitted via socket
          } else {
            await api.post(`/chat/groups/${selectedGroupId}/messages`, {
              message: file.name,
              type: data.type || 'docs',
              attachPath: data.url,
            });
          }
          fetchSidebar();
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
      const memberIds = Array.from(createSelectedMemberIds);
      await api.post('/chat/groups', {
        title: values.name,
        memberIds,
      });
      message.success('Group created');
      form.resetFields();
      setCreateSelectedMemberIds(new Set());
      setCreateMemberSearch('');
      setModalOpen(false);
      fetchSidebar();
    } catch {
      // validation or API error
    } finally {
      setCreating(false);
    }
  };

  // Fetch team members for create group modal
  const fetchCreateGroupMembers = useCallback(async () => {
    setLoadingCreateMembers(true);
    try {
      // Use sidebar data to get team members
      if (!sidebarData?.teams?.length) return;
      const teamGroups: TeamGroup[] = sidebarData.teams.map(t => ({
        teamId: t.id,
        teamName: t.name || 'Unnamed Team',
        members: t.members
          .filter(m => m.id !== user?.id)
          .map(m => ({
            userId: m.id,
            name: m.name || m.email || '',
            email: m.email || '',
            avatar: m.image,
            alreadyInGroup: false,
          })),
      })).filter(t => t.members.length > 0);
      setCreateGroupMembers(teamGroups);
    } finally {
      setLoadingCreateMembers(false);
    }
  }, [sidebarData?.teams, user?.id]);

  // Fetch available members for add member modal
  const fetchAvailableMembers = useCallback(async (groupId: string) => {
    setLoadingAvailableMembers(true);
    try {
      const res = await api.get(`/chat/groups/${groupId}/available-members`);
      const data = res.data?.data || res.data || [];
      setAvailableMembers(Array.isArray(data) ? data : []);
    } catch {
      message.error('Failed to load team members');
    } finally {
      setLoadingAvailableMembers(false);
    }
  }, []);

  // Open add member modal
  const openAddMemberModal = useCallback((groupId: string) => {
    setAddMemberGroupId(groupId);
    setSelectedMemberIds(new Set());
    setAddMemberSearch('');
    setAddMemberModalOpen(true);
    fetchAvailableMembers(groupId);
  }, [fetchAvailableMembers]);

  // Add selected members
  const handleAddMembers = async () => {
    if (!addMemberGroupId || selectedMemberIds.size === 0) return;
    setAddingMembers(true);
    try {
      await api.post(`/chat/groups/${addMemberGroupId}/members/batch`, {
        userIds: Array.from(selectedMemberIds),
      });
      message.success(`${selectedMemberIds.size} member(s) added`);
      setAddMemberModalOpen(false);
      setSelectedMemberIds(new Set());
      fetchSidebar();
      if (selectedGroupId === addMemberGroupId) {
        fetchMessages(addMemberGroupId);
      }
      // Refresh group info if open
      if (groupInfoOpen && groupInfo?.id === addMemberGroupId) {
        fetchGroupInfo(addMemberGroupId);
      }
    } catch {
      message.error('Failed to add members');
    } finally {
      setAddingMembers(false);
    }
  };

  // Fetch group info
  const fetchGroupInfo = useCallback(async (groupId: string) => {
    setLoadingGroupInfo(true);
    try {
      const res = await api.get(`/chat/groups/${groupId}/info`);
      setGroupInfo(res.data?.data || res.data);
    } catch {
      message.error('Failed to load group info');
    } finally {
      setLoadingGroupInfo(false);
    }
  }, []);

  // Open group info
  const openGroupInfo = useCallback((groupId: string) => {
    setGroupInfoOpen(true);
    setEditingGroupName(false);
    fetchGroupInfo(groupId);
  }, [fetchGroupInfo]);

  // Update group name
  const handleUpdateGroupName = async () => {
    if (!groupInfo || !editGroupNameValue.trim()) return;
    try {
      await api.put(`/chat/groups/${groupInfo.id}`, { title: editGroupNameValue.trim() });
      message.success('Group name updated');
      setEditingGroupName(false);
      fetchGroupInfo(groupInfo.id);
      fetchSidebar();
    } catch {
      message.error('Failed to update group name');
    }
  };

  // Remove member from group
  const handleRemoveMember = async (groupId: string, memberId: string) => {
    try {
      await api.delete(`/chat/groups/${groupId}/members/${memberId}`);
      message.success('Member removed');
      fetchGroupInfo(groupId);
      fetchSidebar();
      if (selectedGroupId === groupId) fetchMessages(groupId);
    } catch {
      message.error('Failed to remove member');
    }
  };

  // Leave group
  const handleLeaveGroup = async (groupId: string) => {
    Modal.confirm({
      title: 'Leave Group',
      content: 'Are you sure you want to leave this group?',
      okText: 'Leave',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await api.post(`/chat/groups/${groupId}/leave`);
          message.success('Left the group');
          if (selectedGroupId === groupId) setSelectedGroupId(null);
          fetchSidebar();
        } catch {
          message.error('Failed to leave group');
        }
      },
    });
  };

  // Delete group
  const handleDeleteGroup = async (groupId: string) => {
    Modal.confirm({
      title: 'Delete Group',
      content: 'Are you sure you want to delete this group? This cannot be undone.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await api.delete(`/chat/groups/${groupId}`);
          message.success('Group deleted');
          if (selectedGroupId === groupId) setSelectedGroupId(null);
          fetchSidebar();
          if (groupInfoOpen) setGroupInfoOpen(false);
        } catch {
          message.error('Failed to delete group');
        }
      },
    });
  };

  // Context menu handler
  const handleContextAction = (action: string, data: any) => {
    setContextMenu(null);
    switch (action) {
      case 'viewTeamDetails':
        router.push(`/dashboard/teams/${data.id}`);
        break;
      case 'groupInfo':
        openGroupInfo(data.id || data.conversationId);
        break;
      case 'addMember':
        openAddMemberModal(data.id || data.conversationId);
        break;
      case 'leaveGroup':
        handleLeaveGroup(data.id || data.conversationId);
        break;
      case 'deleteGroup':
        handleDeleteGroup(data.id || data.conversationId);
        break;
      case 'viewProfile':
        // Could navigate to profile page if available
        message.info(`Profile: ${data.name || data.email}`);
        break;
      case 'blockUser':
        message.info('Block user feature coming soon');
        break;
      case 'deleteChat':
        if (data.conversationId) {
          handleDeleteGroup(data.conversationId);
        }
        break;
    }
  };

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  // Handle team chat open — select existing convo or create one
  const handleTeamChatOpen = async (team: SidebarTeam) => {
    if (team.conversationId) {
      setSelectedGroupId(team.conversationId);
      return;
    }
    // Auto-create a chat group for this team
    try {
      setCreating(true);
      const res = await api.post('/chat/groups', {
        title: team.name || 'Team Chat',
        teamId: team.id,
        memberIds: team.members.map(m => m.id),
      });
      const newGroup = res.data?.data;
      if (newGroup?.id) {
        setSelectedGroupId(newGroup.id);
        fetchSidebar();
      }
    } catch {
      message.error('Failed to create team chat');
    } finally {
      setCreating(false);
    }
  };

  // Handle contact chat open — select existing 1:1 or create one
  const handleContactChatOpen = async (contact: SidebarContact) => {
    if (contact.conversationId) {
      setSelectedGroupId(contact.conversationId);
      return;
    }
    // Auto-create a 1:1 chat
    try {
      setCreating(true);
      const res = await api.post('/chat/groups', {
        title: contact.name || contact.email || 'Direct Message',
        memberIds: [contact.id],
      });
      const newGroup = res.data?.data;
      if (newGroup?.id) {
        setSelectedGroupId(newGroup.id);
        fetchSidebar();
      }
    } catch {
      message.error('Failed to start conversation');
    } finally {
      setCreating(false);
    }
  };

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const groupName = (g: ChatGroup) => g.title || g.name || 'Unnamed';
  const getInitial = (name: string) => (name || '?').charAt(0).toUpperCase();

  // Determine if the selected conversation is a DM (individual chat).
  // A DM is ONLY a group that a sidebar contact explicitly links to via conversationId.
  // A manually-created group with 2 members is still a group, NOT a DM.
  const dmOtherUser = useMemo(() => {
    if (!selectedGroup || selectedGroup.teamId) return null;
    if (!sidebarData?.contacts) return null;
    const contact = sidebarData.contacts.find(c => c.conversationId === selectedGroup.id);
    return contact || null;
  }, [selectedGroup, sidebarData?.contacts]);

  const selectedIsDm = !!dmOtherUser;

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

  const getTypingText = (groupId: string) => {
    const typers = typingUsers[groupId];
    if (!typers || typers.size === 0) return null;
    const count = typers.size;
    if (count === 1) return 'typing...';
    return `${count} people typing...`;
  };

  const renderMessageStatus = (msg: ChatMessage) => {
    if (msg._status === 'sending') {
      return <ClockCircleOutlined style={{ fontSize: 11, marginLeft: 4 }} />;
    }
    if (msg._status === 'failed') {
      return <ExclamationCircleOutlined style={{ fontSize: 11, marginLeft: 4, color: '#ff4d4f' }} />;
    }
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
    return <CheckOutlined style={{ fontSize: 9, marginLeft: 4, opacity: 0.6 }} />;
  };

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

  // Toggle accordion section
  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Accordion section header
  const renderSectionHeader = (
    title: string,
    sectionKey: string,
    icon: React.ReactNode,
    count: number,
    action?: { label: string; onClick: () => void }
  ) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        cursor: 'pointer',
        userSelect: 'none',
        background: '#FAFAFA',
        borderBottom: `1px solid ${BORDER}`,
      }}
      onClick={() => toggleSection(sectionKey)}
    >
      <RightOutlined
        style={{
          fontSize: 10,
          color: TEXT_SECONDARY,
          transition: 'transform 0.2s',
          transform: expandedSections[sectionKey] ? 'rotate(90deg)' : 'rotate(0deg)',
          marginRight: 8,
        }}
      />
      {icon}
      <span style={{ fontSize: 12, fontWeight: 600, color: TEXT, marginLeft: 6, flex: 1 }}>
        {title}
      </span>
      <span style={{ fontSize: 11, color: TEXT_SECONDARY, marginRight: action ? 8 : 0 }}>
        {count}
      </span>
      {action && (
        <span
          onClick={(e) => { e.stopPropagation(); action.onClick(); }}
          style={{ fontSize: 11, color: PRIMARY, cursor: 'pointer', fontWeight: 500 }}
        >
          + Create
        </span>
      )}
    </div>
  );

  // Filter sidebar data based on search
  const filteredTeams = useMemo(() => {
    if (!sidebarData?.teams) return [];
    if (!searchQuery) return sidebarData.teams;
    const q = searchQuery.toLowerCase();
    return sidebarData.teams.filter(t =>
      (t.name || '').toLowerCase().includes(q)
    );
  }, [sidebarData?.teams, searchQuery]);

  const filteredSidebarGroups = useMemo(() => {
    if (!sidebarData?.groups) return [];
    if (!searchQuery) return sidebarData.groups;
    const q = searchQuery.toLowerCase();
    return sidebarData.groups.filter(g =>
      groupName(g).toLowerCase().includes(q)
    );
  }, [sidebarData?.groups, searchQuery]);

  const filteredContacts = useMemo(() => {
    if (!sidebarData?.contacts) return [];
    if (!searchQuery) return sidebarData.contacts;
    const q = searchQuery.toLowerCase();
    return sidebarData.contacts.filter(c =>
      (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q)
    );
  }, [sidebarData?.contacts, searchQuery]);

  // Fallback: flat group list when sidebar endpoint not available
  const filteredFlatGroups = useMemo(() => {
    if (!searchQuery) return groups;
    const q = searchQuery.toLowerCase();
    return groups.filter(g => groupName(g).toLowerCase().includes(q));
  }, [groups, searchQuery]);

  // Render context menu dropdown
  const renderContextMenu = () => {
    if (!contextMenu) return null;
    const { type, x, y, data } = contextMenu;
    const menuStyle: React.CSSProperties = {
      position: 'fixed',
      top: y,
      left: x,
      zIndex: 1050,
      background: '#fff',
      borderRadius: 8,
      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
      padding: '4px 0',
      minWidth: 160,
    };
    const itemStyle: React.CSSProperties = {
      padding: '8px 16px',
      fontSize: 13,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      border: 'none',
      background: 'none',
      width: '100%',
      textAlign: 'left',
      color: TEXT,
    };
    const dangerStyle: React.CSSProperties = { ...itemStyle, color: '#ff4d4f' };

    return (
      <div style={menuStyle} onClick={(e) => e.stopPropagation()}>
        {type === 'team' && (
          <button style={itemStyle} onMouseEnter={(e) => (e.currentTarget.style.background = '#F5F5F5')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => handleContextAction('viewTeamDetails', data)}>
            <EyeOutlined /> View Team Details
          </button>
        )}
        {type === 'group' && (
          <>
            <button style={itemStyle} onMouseEnter={(e) => (e.currentTarget.style.background = '#F5F5F5')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => handleContextAction('groupInfo', data)}>
              <InfoCircleOutlined /> Group Info
            </button>
            <button style={itemStyle} onMouseEnter={(e) => (e.currentTarget.style.background = '#F5F5F5')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => handleContextAction('addMember', data)}>
              <UserAddOutlined /> Add Member
            </button>
            <button style={itemStyle} onMouseEnter={(e) => (e.currentTarget.style.background = '#F5F5F5')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => handleContextAction('leaveGroup', data)}>
              <LogoutOutlined /> Leave Group
            </button>
            {data.userId === user?.id && (
              <button style={dangerStyle} onMouseEnter={(e) => (e.currentTarget.style.background = '#FFF1F0')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => handleContextAction('deleteGroup', data)}>
                <DeleteOutlined /> Delete Group
              </button>
            )}
          </>
        )}
        {type === 'member' && (
          <>
            <button style={itemStyle} onMouseEnter={(e) => (e.currentTarget.style.background = '#F5F5F5')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => handleContextAction('viewProfile', data)}>
              <EyeOutlined /> View Profile
            </button>
            <button style={itemStyle} onMouseEnter={(e) => (e.currentTarget.style.background = '#F5F5F5')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => handleContextAction('blockUser', data)}>
              <StopOutlined /> Block User
            </button>
            <button style={dangerStyle} onMouseEnter={(e) => (e.currentTarget.style.background = '#FFF1F0')} onMouseLeave={(e) => (e.currentTarget.style.background = 'none')} onClick={() => handleContextAction('deleteChat', data)}>
              <DeleteOutlined /> Delete Chat
            </button>
          </>
        )}
      </div>
    );
  };

  // Render sidebar item (shared style)
  const renderSidebarItem = (
    id: string,
    name: string,
    subtitle: string,
    avatarBg: string,
    unread: number,
    onClick: () => void,
    presenceUserId?: string,
    contextType?: 'team' | 'group' | 'member',
    contextData?: any,
  ) => {
    const isActive = id === selectedGroupId;
    const hasUnread = unread > 0;
    const online = presenceUserId ? isOnline(presenceUserId) : false;

    return (
      <div
        key={id}
        onClick={onClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 12px',
          cursor: 'pointer',
          background: isActive ? '#F0FFF0' : 'transparent',
          borderLeft: isActive ? `3px solid ${PRIMARY}` : '3px solid transparent',
          transition: 'background 0.15s',
          position: 'relative',
        }}
        className="sidebar-item"
      >
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: avatarBg,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: 14,
          }}>
            {getInitial(name)}
          </div>
          {presenceUserId && (
            <span style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: online ? '#52c41a' : '#D9D9D9',
              border: '2px solid #fff',
            }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{
              fontWeight: hasUnread ? 700 : 500,
              fontSize: 13,
              color: TEXT,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {name}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontSize: 11,
              color: TEXT_SECONDARY,
              fontWeight: hasUnread ? 600 : 400,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1,
            }}>
              {subtitle}
            </span>
            {hasUnread && (
              <Badge count={unread} size="small" style={{ backgroundColor: PRIMARY }} />
            )}
          </div>
        </div>
        {contextType && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              setContextMenu({
                id,
                type: contextType,
                x: rect.right - 160,
                y: rect.bottom + 4,
                data: contextData || {},
              });
            }}
            style={{
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4,
              flexShrink: 0,
              opacity: 0.5,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = '#E8E8E8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.background = 'none'; }}
          >
            <MoreOutlined style={{ fontSize: 14 }} />
          </div>
        )}
      </div>
    );
  };

  // Render the accordion sidebar content
  const renderAccordionSidebar = () => {
    if (!sidebarData) {
      // Fallback: flat list (original behavior)
      return filteredFlatGroups.map((group) => {
        const lastMsgObj = group.messages?.[0] || group.lastMessage;
        const lastMsg = lastMsgObj?.message || lastMsgObj?.content || 'No messages yet';
        const unread = group.unreadCount || getUnreadCount(group.id);
        const typingText = getTypingText(group.id);

        return renderSidebarItem(
          group.id,
          groupName(group),
          typingText || lastMsg,
          PRIMARY,
          unread,
          () => setSelectedGroupId(group.id),
          group.userId,
        );
      });
    }

    return (
      <>
        {/* Teams Section */}
        {renderSectionHeader(
          'Teams',
          'teams',
          <TeamOutlined style={{ fontSize: 13, color: TEAM_AVATAR_BG }} />,
          filteredTeams.length,
        )}
        <div style={{
          maxHeight: expandedSections.teams ? 999 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.25s ease-in-out',
        }}>
          {filteredTeams.length === 0 ? (
            <div style={{ padding: '12px', fontSize: 12, color: TEXT_SECONDARY, textAlign: 'center' }}>
              No teams yet
            </div>
          ) : (
            filteredTeams.map(team => {
              const subtitle = team.lastMessage?.message
                ? team.lastMessage.message
                : `${team.memberCount} member${team.memberCount !== 1 ? 's' : ''}`;
              return renderSidebarItem(
                team.conversationId || `team-${team.id}`,
                team.name || 'Unnamed Team',
                subtitle,
                TEAM_AVATAR_BG,
                team.unreadCount,
                () => handleTeamChatOpen(team),
                undefined,
                'team',
                team,
              );
            })
          )}
        </div>

        {/* Groups Section */}
        {renderSectionHeader(
          'Groups',
          'groups',
          <MessageOutlined style={{ fontSize: 13, color: PRIMARY }} />,
          filteredSidebarGroups.length,
          { label: '+ Create', onClick: () => { setModalOpen(true); fetchCreateGroupMembers(); } },
        )}
        <div style={{
          maxHeight: expandedSections.groups ? 999 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.25s ease-in-out',
        }}>
          {filteredSidebarGroups.length === 0 ? (
            <div style={{ padding: '12px', fontSize: 12, color: TEXT_SECONDARY, textAlign: 'center' }}>
              No groups yet
            </div>
          ) : (
            filteredSidebarGroups.map(group => {
              const lastMsgObj = group.messages?.[0] || group.lastMessage;
              const lastMsg = lastMsgObj?.message || lastMsgObj?.content || 'No messages yet';
              const unread = group.unreadCount || getUnreadCount(group.id);
              const typingText = getTypingText(group.id);

              return renderSidebarItem(
                group.id,
                groupName(group),
                typingText || lastMsg,
                PRIMARY,
                unread,
                () => setSelectedGroupId(group.id),
                undefined,
                'group',
                group,
              );
            })
          )}
        </div>

        {/* Members/Contacts Section */}
        {renderSectionHeader(
          'Members',
          'members',
          <UserOutlined style={{ fontSize: 13, color: CONTACT_AVATAR_BG }} />,
          filteredContacts.length,
        )}
        <div style={{
          maxHeight: expandedSections.members ? 999 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.25s ease-in-out',
        }}>
          {filteredContacts.length === 0 ? (
            <div style={{ padding: '12px', fontSize: 12, color: TEXT_SECONDARY, textAlign: 'center' }}>
              No contacts yet
            </div>
          ) : (
            filteredContacts.map(contact => {
              const subtitle = contact.lastMessage?.message || contact.email || '';
              return renderSidebarItem(
                contact.conversationId || `contact-${contact.id}`,
                contact.name || contact.email || 'Unknown',
                subtitle,
                CONTACT_AVATAR_BG,
                contact.unreadCount,
                () => handleContactChatOpen(contact),
                contact.id,
                'member',
                contact,
              );
            })
          )}
        </div>
      </>
    );
  };

  // No groups and no sidebar data — show EmptyState
  if (!loadingGroups && groups.length === 0 && (!sidebarData || (sidebarData.teams.length === 0 && sidebarData.contacts.length === 0))) {
    return (
      <>
        <EmptyState
          title="No conversations"
          description="Start chatting with your team"
          actionText="New Chat"
          onAction={() => setModalOpen(true)}
        />
        <Modal
          title="Create New Group"
          open={modalOpen}
          onCancel={() => { setModalOpen(false); form.resetFields(); setCreateSelectedMemberIds(new Set()); }}
          onOk={handleCreateGroup}
          confirmLoading={creating}
          okText="Create Group"
          okButtonProps={{ style: { background: PRIMARY, borderColor: PRIMARY } }}
          afterOpenChange={(open) => { if (open) fetchCreateGroupMembers(); }}
        >
          <Form form={form} layout="vertical">
            <Form.Item name="name" label="Group Name" rules={[{ required: true, message: 'Please enter a group name' }]}>
              <Input placeholder="e.g. Project Discussion" />
            </Form.Item>
          </Form>
          <div style={{ marginBottom: 8, fontWeight: 500, fontSize: 14 }}>Add Members from Teams:</div>
          <div style={{ maxHeight: 250, overflowY: 'auto', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 8 }}>
            {createGroupMembers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: TEXT_SECONDARY, fontSize: 13 }}>No team members found.</div>
            ) : (
              createGroupMembers.map(tg => (
                <div key={tg.teamId} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: TEXT_SECONDARY, padding: '4px 0' }}>
                    <TeamOutlined style={{ fontSize: 11, marginRight: 4 }} /> {tg.teamName}
                  </div>
                  {tg.members.map(m => (
                    <label key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', cursor: 'pointer', borderRadius: 6 }}>
                      <Checkbox
                        checked={createSelectedMemberIds.has(m.userId)}
                        onChange={(e) => {
                          const next = new Set(createSelectedMemberIds);
                          if (e.target.checked) next.add(m.userId); else next.delete(m.userId);
                          setCreateSelectedMemberIds(next);
                        }}
                      />
                      <span style={{ fontSize: 13 }}>{m.name} <span style={{ color: TEXT_SECONDARY }}>— {m.email}</span></span>
                    </label>
                  ))}
                </div>
              ))
            )}
          </div>
        </Modal>
      </>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', height: 'calc(100vh - 120px)', borderRadius: 12, overflow: 'hidden', border: `1px solid ${BORDER}`, background: '#fff' }}>
        {/* ---- Left Panel: Accordion Sidebar ---- */}
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
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: INPUT_BG, border: 'none', borderRadius: 8 }}
            />
          </div>

          {/* Accordion content */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingGroups ? (
              <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
            ) : (
              renderAccordionSidebar()
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
                    background: selectedIsDm ? CONTACT_AVATAR_BG : selectedGroup?.teamId ? TEAM_AVATAR_BG : PRIMARY,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: 15,
                  }}>
                    {selectedIsDm && dmOtherUser
                      ? getInitial(dmOtherUser.name || dmOtherUser.email || '?')
                      : selectedGroup ? getInitial(groupName(selectedGroup)) : '?'}
                  </div>
                  {/* Online indicator for DMs */}
                  {selectedIsDm && dmOtherUser && (
                    <span style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: isOnline(dmOtherUser.id) ? '#52c41a' : '#D9D9D9',
                      border: '2px solid #fff',
                    }} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: TEXT }}>
                    {selectedIsDm && dmOtherUser
                      ? (dmOtherUser.name || dmOtherUser.email || 'Unknown')
                      : selectedGroup ? groupName(selectedGroup) : 'Chat'}
                  </div>
                  <div style={{ fontSize: 12, color: TEXT_SECONDARY, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {selectedIsDm && dmOtherUser ? (
                      // DM: show other user's online/offline status
                      isOnline(dmOtherUser.id) ? (
                        <>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#52c41a', display: 'inline-block' }} />
                          Online
                        </>
                      ) : getLastSeen(dmOtherUser.id) ? (
                        <>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D9D9D9', display: 'inline-block' }} />
                          Last seen {formatLastSeen(getLastSeen(dmOtherUser.id))}
                        </>
                      ) : (
                        <>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D9D9D9', display: 'inline-block' }} />
                          Offline
                        </>
                      )
                    ) : (
                      // Team/Group: show member count
                      <>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: PRIMARY, display: 'inline-block' }} />
                        {selectedGroup?._count?.members || selectedGroup?.memberCount || 0} member{(selectedGroup?._count?.members || selectedGroup?.memberCount || 0) !== 1 ? 's' : ''}
                      </>
                    )}
                  </div>
                </div>
                {/* Header context menu button */}
                {selectedGroup && (() => {
                  const isTeamLinked = !!selectedGroup.teamId;
                  const headerType = isTeamLinked ? 'team' : selectedIsDm ? 'member' : 'group';
                  const teamData = isTeamLinked ? sidebarData?.teams?.find(t => t.conversationId === selectedGroup.id) : null;
                  const ctxData = isTeamLinked && teamData ? teamData : selectedIsDm && dmOtherUser ? dmOtherUser : selectedGroup;
                  return (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setContextMenu({
                          id: selectedGroup.id,
                          type: headerType,
                          x: rect.right - 160,
                          y: rect.bottom + 4,
                          data: ctxData,
                        });
                      }}
                      style={{
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 6,
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#F0F0F0'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                    >
                      <MoreOutlined style={{ fontSize: 18 }} />
                    </div>
                  );
                })()}
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
                    const file = msg.files?.[0];
                    const fileUrl = resolveFileUrl(msg.attachPath, file);
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
                                src={fileUrl}
                                alt={text}
                                style={{ maxWidth: '100%', borderRadius: 8, maxHeight: 250, cursor: 'pointer' }}
                                onClick={() => setLightboxImage(fileUrl)}
                                onError={(e) => {
                                  const img = e.target as HTMLImageElement;
                                  // Try fallback URL if proxy fails
                                  const fallbackUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL || ''}${msg.attachPath || file?.filePath || ''}`;
                                  if (img.src !== fallbackUrl && fallbackUrl !== img.src) {
                                    img.src = fallbackUrl;
                                  } else {
                                    img.style.display = 'none';
                                    img.parentElement!.innerHTML = '<div style="padding: 8px; color: #999; font-size: 12px;">Image unavailable</div>';
                                  }
                                }}
                              />
                            </div>
                          ) : isFile && (msg.attachPath || file?.filePath) ? (
                            /* File message */
                            <a
                              href={fileUrl}
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
        title="Create New Group"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); setCreateSelectedMemberIds(new Set()); setCreateMemberSearch(''); }}
        onOk={handleCreateGroup}
        confirmLoading={creating}
        okText="Create Group"
        okButtonProps={{ style: { background: PRIMARY, borderColor: PRIMARY } }}
        afterOpenChange={(open) => { if (open) fetchCreateGroupMembers(); }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Group Name" rules={[{ required: true, message: 'Please enter a group name' }]}>
            <Input placeholder="e.g. Project Discussion" />
          </Form.Item>
        </Form>
        <div style={{ marginBottom: 8, fontWeight: 500, fontSize: 14 }}>Add Members from Teams:</div>
        <Input
          prefix={<SearchOutlined style={{ color: TEXT_SECONDARY }} />}
          placeholder="Search team members..."
          value={createMemberSearch}
          onChange={(e) => setCreateMemberSearch(e.target.value)}
          style={{ marginBottom: 12, background: INPUT_BG, borderRadius: 8 }}
        />
        <div style={{ maxHeight: 250, overflowY: 'auto', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 8 }}>
          {loadingCreateMembers ? (
            <div style={{ textAlign: 'center', padding: 20 }}><Spin size="small" /></div>
          ) : createGroupMembers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: TEXT_SECONDARY, fontSize: 13 }}>No team members found. Join a team first.</div>
          ) : (
            createGroupMembers.map(tg => {
              const filteredMembers = createMemberSearch
                ? tg.members.filter(m => m.name.toLowerCase().includes(createMemberSearch.toLowerCase()) || m.email.toLowerCase().includes(createMemberSearch.toLowerCase()))
                : tg.members;
              if (filteredMembers.length === 0) return null;
              return (
                <div key={tg.teamId} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: TEXT_SECONDARY, padding: '4px 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <TeamOutlined style={{ fontSize: 11 }} /> {tg.teamName} ({filteredMembers.length})
                  </div>
                  {filteredMembers.map(m => (
                    <label key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', cursor: 'pointer', borderRadius: 6, background: createSelectedMemberIds.has(m.userId) ? '#F0FFF0' : 'transparent' }}>
                      <Checkbox
                        checked={createSelectedMemberIds.has(m.userId)}
                        onChange={(e) => {
                          const next = new Set(createSelectedMemberIds);
                          if (e.target.checked) next.add(m.userId); else next.delete(m.userId);
                          setCreateSelectedMemberIds(next);
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: TEXT_SECONDARY }}>{m.email}</div>
                      </div>
                    </label>
                  ))}
                </div>
              );
            })
          )}
        </div>
        {createSelectedMemberIds.size > 0 && (
          <div style={{ marginTop: 8, fontSize: 12, color: PRIMARY, fontWeight: 500 }}>
            Selected: {createSelectedMemberIds.size} member{createSelectedMemberIds.size !== 1 ? 's' : ''}
          </div>
        )}
      </Modal>

      {/* Add Members modal */}
      <Modal
        title="Add Members to Group"
        open={addMemberModalOpen}
        onCancel={() => { setAddMemberModalOpen(false); setSelectedMemberIds(new Set()); setAddMemberSearch(''); }}
        onOk={handleAddMembers}
        confirmLoading={addingMembers}
        okText={`Add Selected (${selectedMemberIds.size})`}
        okButtonProps={{ disabled: selectedMemberIds.size === 0, style: { background: PRIMARY, borderColor: PRIMARY } }}
      >
        <Input
          prefix={<SearchOutlined style={{ color: TEXT_SECONDARY }} />}
          placeholder="Search team members..."
          value={addMemberSearch}
          onChange={(e) => setAddMemberSearch(e.target.value)}
          style={{ marginBottom: 12, background: INPUT_BG, borderRadius: 8 }}
        />
        <div style={{ maxHeight: 350, overflowY: 'auto', border: `1px solid ${BORDER}`, borderRadius: 8, padding: 8 }}>
          {loadingAvailableMembers ? (
            <div style={{ textAlign: 'center', padding: 20 }}><Spin size="small" /></div>
          ) : availableMembers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: TEXT_SECONDARY, fontSize: 13 }}>No team members available to add.</div>
          ) : (
            availableMembers.map(tg => {
              const filteredMembers = addMemberSearch
                ? tg.members.filter(m => m.name.toLowerCase().includes(addMemberSearch.toLowerCase()) || m.email.toLowerCase().includes(addMemberSearch.toLowerCase()))
                : tg.members;
              if (filteredMembers.length === 0) return null;
              return (
                <div key={tg.teamId} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: TEXT_SECONDARY, padding: '4px 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <TeamOutlined style={{ fontSize: 11 }} /> {tg.teamName} ({filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''})
                  </div>
                  {filteredMembers.map(m => (
                    <label key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', cursor: m.alreadyInGroup ? 'default' : 'pointer', borderRadius: 6, background: selectedMemberIds.has(m.userId) ? '#F0FFF0' : 'transparent', opacity: m.alreadyInGroup ? 0.6 : 1 }}>
                      <Checkbox
                        checked={m.alreadyInGroup || selectedMemberIds.has(m.userId)}
                        disabled={m.alreadyInGroup}
                        onChange={(e) => {
                          if (m.alreadyInGroup) return;
                          const next = new Set(selectedMemberIds);
                          if (e.target.checked) next.add(m.userId); else next.delete(m.userId);
                          setSelectedMemberIds(next);
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>
                          {m.name}
                          {m.alreadyInGroup && <span style={{ fontSize: 11, color: TEXT_SECONDARY, marginLeft: 8 }}>Already added</span>}
                        </div>
                        <div style={{ fontSize: 11, color: TEXT_SECONDARY }}>{m.email}</div>
                      </div>
                    </label>
                  ))}
                </div>
              );
            })
          )}
        </div>
        {selectedMemberIds.size > 0 && (
          <div style={{ marginTop: 8, fontSize: 12, color: PRIMARY, fontWeight: 500 }}>
            Selected: {selectedMemberIds.size} member{selectedMemberIds.size !== 1 ? 's' : ''}
          </div>
        )}
      </Modal>

      {/* Group Info Drawer */}
      <Drawer
        title="Group Info"
        open={groupInfoOpen}
        onClose={() => { setGroupInfoOpen(false); setEditingGroupName(false); }}
        width={360}
      >
        {loadingGroupInfo ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : groupInfo ? (
          <div>
            {/* Group name */}
            <div style={{ marginBottom: 16 }}>
              {editingGroupName && groupInfo.isAdmin ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <Input
                    value={editGroupNameValue}
                    onChange={(e) => setEditGroupNameValue(e.target.value)}
                    onPressEnter={handleUpdateGroupName}
                    autoFocus
                  />
                  <Button type="primary" size="small" onClick={handleUpdateGroupName} style={{ background: PRIMARY, borderColor: PRIMARY }}>Save</Button>
                  <Button size="small" onClick={() => setEditingGroupName(false)}>Cancel</Button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 600 }}>{groupInfo.title}</span>
                  {groupInfo.isAdmin && (
                    <EditOutlined
                      style={{ cursor: 'pointer', color: TEXT_SECONDARY, fontSize: 14 }}
                      onClick={() => { setEditingGroupName(true); setEditGroupNameValue(groupInfo.title); }}
                    />
                  )}
                </div>
              )}
              <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginTop: 4 }}>
                Created by {groupInfo.createdBy.name || groupInfo.createdBy.email}
              </div>
              <div style={{ fontSize: 12, color: TEXT_SECONDARY }}>
                {groupInfo.createdAt ? new Date(groupInfo.createdAt).toLocaleDateString() : ''}
              </div>
            </div>

            {/* Members */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Members ({groupInfo.memberCount})</span>
              <Button
                type="link"
                size="small"
                icon={<UserAddOutlined />}
                onClick={() => openAddMemberModal(groupInfo.id)}
                style={{ color: PRIMARY, padding: 0 }}
              >
                Add Member
              </Button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {groupInfo.members.map(member => (
                <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${BORDER}` }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: member.role === 'admin' ? TEAM_AVATAR_BG : CONTACT_AVATAR_BG,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: 14,
                    flexShrink: 0,
                  }}>
                    {getInitial(member.name || member.email || '?')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {member.name || member.email}
                      <span style={{
                        fontSize: 10,
                        padding: '1px 6px',
                        borderRadius: 4,
                        background: member.role === 'admin' ? '#F0E6FF' : '#F0F0F0',
                        color: member.role === 'admin' ? '#7C3AED' : TEXT_SECONDARY,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                      }}>
                        {member.role}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: TEXT_SECONDARY }}>{member.email}</div>
                  </div>
                  {groupInfo.isAdmin && member.id !== user?.id && (
                    <Tooltip title="Remove member">
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<CloseOutlined style={{ fontSize: 12 }} />}
                        onClick={() => {
                          Modal.confirm({
                            title: 'Remove Member',
                            content: `Remove ${member.name || member.email} from the group?`,
                            okText: 'Remove',
                            okButtonProps: { danger: true },
                            onOk: () => handleRemoveMember(groupInfo.id, member.id),
                          });
                        }}
                      />
                    </Tooltip>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* Context menu portal */}
      {renderContextMenu()}
    </>
  );
}
