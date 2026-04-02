"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Input, Badge, Spin, Button, Form, Modal, Checkbox, message, Popconfirm, Image } from 'antd';
import {
  SearchOutlined,
  TeamOutlined,
  MessageOutlined,
  UserOutlined,
  RightOutlined,
  CloseOutlined,
  SendOutlined,
  ArrowLeftOutlined,
  PlusOutlined,
  CompressOutlined,
  ExpandOutlined,
  PaperClipOutlined,
  PictureOutlined,
  DeleteOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import api from '@/lib/axios';
import { upload } from '@/lib/axios';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';

const PRIMARY = '#3CB371';
const TEXT = '#1A1A2E';
const TEXT_SECONDARY = '#8C8C8C';
const BORDER = '#F0F0F0';
const TEAM_AVATAR_BG = '#7C3AED';
const CONTACT_AVATAR_BG = '#3B82F6';
const INPUT_BG = '#F8F9FA';
const COLUMN_WIDTH = 430;

interface SidebarTeam {
  id: string;
  name?: string;
  ownerId?: string;
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
  conversationId: string | null;
  lastMessage?: { message?: string; createdAt?: string } | null;
  unreadCount: number;
}

interface ChatGroup {
  id: string;
  name?: string;
  title?: string;
  teamId?: string;
  userId?: string;
  messages?: Array<{ message?: string; content?: string }>;
  lastMessage?: { message?: string; content?: string };
  unreadCount?: number;
  members?: Array<{ id: string; name?: string; email?: string }>;
}

interface SidebarData {
  teams: SidebarTeam[];
  groups: ChatGroup[];
  contacts: SidebarContact[];
  allGroups: ChatGroup[];
}

interface ChatFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
}

interface ChatMessage {
  id: string;
  message?: string;
  content?: string;
  senderId?: string;
  sender?: { id?: string; name?: string };
  user?: { id?: string; name?: string };
  userId?: string;
  type?: string;
  attachPath?: string;
  files?: ChatFile[];
  createdAt: string;
  _status?: 'sending' | 'sent' | 'failed';
  _tempId?: string;
}

interface TeamGroup {
  teamId: string;
  teamName: string;
  members: Array<{ userId: string; name: string; email: string }>;
}

interface RightChatColumnProps {
  onClose: () => void;
  onFullView: () => void;
  isFullView?: boolean;
}

const groupName = (g: ChatGroup) => g.title || g.name || 'Unnamed Group';

// Build file URL for display
function buildFileUrl(file: ChatFile): string {
  if (file.id) {
    return `/api/chat/files/${file.id}/serve`;
  }
  return file.filePath || '';
}

// Get file icon based on MIME type
function getFileIcon(fileType?: string) {
  if (fileType?.includes('pdf')) return <FilePdfOutlined style={{ fontSize: 18 }} />;
  if (fileType?.includes('sheet') || fileType?.includes('excel') || fileType?.includes('csv'))
    return <FileExcelOutlined style={{ fontSize: 18 }} />;
  if (fileType?.includes('word') || fileType?.includes('document'))
    return <FileWordOutlined style={{ fontSize: 18 }} />;
  return <FileOutlined style={{ fontSize: 18 }} />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function RightChatColumn({ onClose, onFullView, isFullView = false }: RightChatColumnProps) {
  const { user } = useAuth();
  const { getUnreadCount, markGroupAsRead, refetch: refetchUnread } = useUnreadCount();
  const { socket } = useSocket();

  // View state
  const [view, setView] = useState<'list' | 'messages'>('list');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedGroupName, setSelectedGroupName] = useState('');
  const [selectedGroupAvatarBg, setSelectedGroupAvatarBg] = useState(PRIMARY);
  const selectedGroupIdRef = useRef<string | null>(null);

  // Sidebar data
  const [sidebarData, setSidebarData] = useState<SidebarData | null>(null);
  const [flatGroups, setFlatGroups] = useState<ChatGroup[]>([]);
  const [loadingSidebar, setLoadingSidebar] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    teams: true,
    groups: true,
    members: true,
  });

  // Messages
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Create group modal
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();
  const [createGroupMembers, setCreateGroupMembers] = useState<TeamGroup[]>([]);
  const [createSelectedMemberIds, setCreateSelectedMemberIds] = useState<Set<string>>(new Set());

  // Keep ref in sync
  useEffect(() => {
    selectedGroupIdRef.current = selectedGroupId;
  }, [selectedGroupId]);

  // ---- DATA FETCHING ----

  const fetchSidebar = useCallback(async () => {
    try {
      const res = await api.get('/chat/sidebar');
      const d = res.data?.data || res.data || {};
      if (d.teams !== undefined) {
        setSidebarData(d as SidebarData);
        const allGroups = d.allGroups || d.groups || [];
        setFlatGroups(Array.isArray(allGroups) ? allGroups : []);
      } else {
        const gRes = await api.get('/chat/groups');
        const gd = gRes.data?.data || gRes.data || {};
        const groupList = gd.groups || (Array.isArray(gd) ? gd : []);
        setFlatGroups(groupList);
        setSidebarData(null);
      }
    } catch {
      try {
        const gRes = await api.get('/chat/groups');
        const gd = gRes.data?.data || gRes.data || {};
        const groupList = gd.groups || (Array.isArray(gd) ? gd : []);
        setFlatGroups(groupList);
      } catch {
        // silently fail
      }
    } finally {
      setLoadingSidebar(false);
    }
  }, []);

  useEffect(() => {
    fetchSidebar();
    const interval = setInterval(fetchSidebar, 30000);
    return () => clearInterval(interval);
  }, [fetchSidebar]);

  const fetchMessages = useCallback(async (groupId: string) => {
    setLoadingMessages(true);
    try {
      const res = await api.get(`/chat/groups/${groupId}/messages`);
      const dm = res.data?.data || res.data || {};
      const newMessages = dm.messages || (Array.isArray(dm) ? dm : []);
      setMessages(newMessages);
    } catch {
      // silently fail
    } finally {
      setLoadingMessages(false);
    }
  }, []);

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

  // Polling for new messages
  useEffect(() => {
    if (!selectedGroupId || view !== 'messages') return;
    const interval = setInterval(() => {
      fetchMessages(selectedGroupId);
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedGroupId, view, fetchMessages]);

  // ---- SOCKET.IO ----
  useEffect(() => {
    if (!socket) return;

    const onNewMessage = (data: ChatMessage & { groupId?: string }) => {
      const msgGroupId = data.groupId;
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
      }
      fetchSidebar();
      refetchUnread();
    };

    const onGroupDeleted = (data: { groupId: string }) => {
      if (selectedGroupIdRef.current === data.groupId) {
        backToList();
      }
      fetchSidebar();
    };

    socket.on('message:new', onNewMessage);
    socket.on('group:deleted', onGroupDeleted);

    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('group:deleted', onGroupDeleted);
    };
  }, [socket, fetchSidebar, refetchUnread]);

  // ---- ACTIONS ----

  const openConversation = (groupId: string, name: string, avatarBg: string) => {
    setSelectedGroupId(groupId);
    setSelectedGroupName(name);
    setSelectedGroupAvatarBg(avatarBg);
    setView('messages');
    setMessages([]);
  };

  const backToList = () => {
    setView('list');
    setSelectedGroupId(null);
    setMessages([]);
    setMessageInput('');
  };

  const handleSend = async () => {
    if (!messageInput.trim() || !selectedGroupId) return;
    const text = messageInput.trim();
    setMessageInput('');
    setSendingMessage(true);

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
      fetchSidebar();
    } catch {
      setMessages(prev => prev.map(m =>
        m._tempId === tempId ? { ...m, _status: 'failed' } : m
      ));
      message.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedGroupId) return;
    e.target.value = '';

    if (file.size > 25 * 1024 * 1024) {
      message.error('File exceeds 25MB limit');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('groupId', selectedGroupId);
      const res = await upload('/chat/upload', formData);
      const data = res.data?.data || res.data;
      if (data?.id) {
        // Message was created server-side, refresh
        fetchMessages(selectedGroupId);
      } else if (data?.url) {
        // File uploaded, create message manually
        const fileType = file.type.startsWith('image/') ? 'image' : 'docs';
        await api.post(`/chat/groups/${selectedGroupId}/messages`, {
          message: file.name,
          type: fileType,
          attachPath: data.url,
        });
        fetchMessages(selectedGroupId);
      }
      fetchSidebar();
    } catch {
      message.error(`Failed to upload ${file.name}`);
    } finally {
      setUploading(false);
    }
  };

  // Team chat open
  const handleTeamChatOpen = async (team: SidebarTeam) => {
    if (team.conversationId) {
      openConversation(team.conversationId, team.name || 'Team Chat', TEAM_AVATAR_BG);
      return;
    }
    try {
      setCreating(true);
      const res = await api.post('/chat/groups', {
        title: team.name || 'Team Chat',
        teamId: team.id,
        memberIds: team.members.map(m => m.id),
      });
      const newGroup = res.data?.data;
      if (newGroup?.id) {
        openConversation(newGroup.id, team.name || 'Team Chat', TEAM_AVATAR_BG);
        fetchSidebar();
      }
    } catch {
      message.error('Failed to create team chat');
    } finally {
      setCreating(false);
    }
  };

  // Contact chat open
  const handleContactChatOpen = async (contact: SidebarContact) => {
    if (contact.conversationId) {
      openConversation(contact.conversationId, contact.name || contact.email || 'DM', CONTACT_AVATAR_BG);
      return;
    }
    try {
      setCreating(true);
      const res = await api.post('/chat/groups', {
        title: contact.name || contact.email || 'Direct Message',
        memberIds: [contact.id],
      });
      const newGroup = res.data?.data;
      if (newGroup?.id) {
        openConversation(newGroup.id, contact.name || contact.email || 'DM', CONTACT_AVATAR_BG);
        fetchSidebar();
      }
    } catch {
      message.error('Failed to start conversation');
    } finally {
      setCreating(false);
    }
  };

  // Delete group
  const handleDeleteGroup = async (groupId: string) => {
    try {
      await api.delete(`/chat/groups/${groupId}`);
      message.success('Group deleted');
      if (selectedGroupId === groupId) backToList();
      fetchSidebar();
    } catch {
      message.error('Failed to delete group');
    }
  };

  // Leave group
  const handleLeaveGroup = async (groupId: string) => {
    try {
      await api.post(`/chat/groups/${groupId}/leave`);
      message.success('Left group');
      if (selectedGroupId === groupId) backToList();
      fetchSidebar();
    } catch {
      message.error('Failed to leave group');
    }
  };

  // Create group
  const handleCreateGroup = async () => {
    try {
      const values = await form.validateFields();
      setCreating(true);
      const memberIds = Array.from(createSelectedMemberIds);
      const res = await api.post('/chat/groups', { title: values.name, memberIds });
      const newGroup = res.data?.data;
      message.success('Group created');
      form.resetFields();
      setCreateSelectedMemberIds(new Set());
      setModalOpen(false);
      fetchSidebar();
      if (newGroup?.id) {
        openConversation(newGroup.id, values.name, PRIMARY);
      }
    } catch {
      // validation or API error
    } finally {
      setCreating(false);
    }
  };

  const fetchCreateGroupMembers = useCallback(async () => {
    if (!sidebarData?.teams?.length) return;
    const teamGroups: TeamGroup[] = sidebarData.teams.map(t => ({
      teamId: t.id,
      teamName: t.name || 'Unnamed Team',
      members: (t.members || [])
        .filter(m => m.id !== user?.id)
        .map(m => ({
          userId: m.id,
          name: m.name || 'Unknown',
          email: m.email || '',
        })),
    }));
    setCreateGroupMembers(teamGroups);
  }, [sidebarData, user?.id]);

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ---- FILTERED DATA ----

  const filteredTeams = useMemo(() => {
    if (!sidebarData?.teams) return [];
    if (!searchQuery) return sidebarData.teams;
    const q = searchQuery.toLowerCase();
    return sidebarData.teams.filter(t => (t.name || '').toLowerCase().includes(q));
  }, [sidebarData?.teams, searchQuery]);

  const filteredGroups = useMemo(() => {
    if (!sidebarData?.groups) return [];
    if (!searchQuery) return sidebarData.groups;
    const q = searchQuery.toLowerCase();
    return sidebarData.groups.filter(g => groupName(g).toLowerCase().includes(q));
  }, [sidebarData?.groups, searchQuery]);

  const filteredContacts = useMemo(() => {
    if (!sidebarData?.contacts) return [];
    if (!searchQuery) return sidebarData.contacts;
    const q = searchQuery.toLowerCase();
    return sidebarData.contacts.filter(c =>
      (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q)
    );
  }, [sidebarData?.contacts, searchQuery]);

  const filteredFlatGroups = useMemo(() => {
    if (!searchQuery) return flatGroups;
    const q = searchQuery.toLowerCase();
    return flatGroups.filter(g => groupName(g).toLowerCase().includes(q));
  }, [flatGroups, searchQuery]);

  // ---- HELPERS ----

  const getSenderName = (msg: ChatMessage): string => {
    return msg.sender?.name || msg.user?.name || 'Unknown';
  };

  const isOwnMessage = (msg: ChatMessage): boolean => {
    return (msg.senderId || msg.userId || msg.user?.id || msg.sender?.id) === user?.id;
  };

  // ---- RENDER: Message content (text, images, files) ----
  const renderMessageContent = (msg: ChatMessage, own: boolean) => {
    const files = msg.files || [];
    const msgText = msg.message || msg.content || '';
    const msgType = msg.type || 'text';
    const attachPath = msg.attachPath;

    // Image type with attachPath but no files array
    if ((msgType === 'image') && attachPath && files.length === 0) {
      const imgSrc = attachPath.startsWith('/') ? `/api/chat/files/${attachPath.split('/').pop()}/serve` : attachPath;
      return (
        <div>
          <Image
            src={imgSrc}
            alt={msgText || 'Image'}
            style={{ maxWidth: 200, maxHeight: 200, borderRadius: 8 }}
            fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='60'%3E%3Crect fill='%23f0f0f0' width='100' height='60'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='10'%3EImage%3C/text%3E%3C/svg%3E"
          />
        </div>
      );
    }

    // Files attached
    if (files.length > 0) {
      return (
        <div>
          {msgType === 'text' && msgText && <div style={{ marginBottom: 4 }}>{msgText}</div>}
          {files.map((file) => {
            const isImage = file.fileType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.fileName || '');
            const fileUrl = buildFileUrl(file);

            if (isImage) {
              return (
                <div key={file.id} style={{ marginTop: 4 }}>
                  <Image
                    src={fileUrl}
                    alt={file.fileName || 'Image'}
                    style={{ maxWidth: 200, maxHeight: 200, borderRadius: 8 }}
                    fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='60'%3E%3Crect fill='%23f0f0f0' width='100' height='60'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='10'%3EImage%3C/text%3E%3C/svg%3E"
                  />
                </div>
              );
            }

            return (
              <a
                key={file.id}
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 8px',
                  borderRadius: 6,
                  background: own ? 'rgba(255,255,255,0.15)' : '#F5F5F5',
                  color: own ? '#fff' : TEXT,
                  textDecoration: 'none',
                  fontSize: 11,
                  marginTop: 4,
                }}
              >
                {getFileIcon(file.fileType)}
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.fileName}
                </span>
                <span style={{ fontSize: 10, color: own ? 'rgba(255,255,255,0.6)' : TEXT_SECONDARY, flexShrink: 0 }}>
                  {formatFileSize(file.fileSize)}
                </span>
                <DownloadOutlined style={{ fontSize: 12, flexShrink: 0 }} />
              </a>
            );
          })}
        </div>
      );
    }

    // Plain text
    return <div>{msgText}</div>;
  };

  // ---- RENDER: Section header ----
  const renderSectionHeader = (
    title: string,
    sectionKey: string,
    icon: React.ReactNode,
    count: number,
    action?: { label: string; onClick: () => void },
  ) => (
    <div
      key={`section-${sectionKey}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '6px 12px',
        cursor: 'pointer',
        userSelect: 'none',
        background: '#FAFAFA',
        borderBottom: `1px solid ${BORDER}`,
      }}
      onClick={() => toggleSection(sectionKey)}
    >
      <RightOutlined
        style={{
          fontSize: 9, color: TEXT_SECONDARY, transition: 'transform 0.2s',
          transform: expandedSections[sectionKey] ? 'rotate(90deg)' : 'rotate(0deg)',
          marginRight: 6,
        }}
      />
      {icon}
      <span style={{ fontSize: 11, fontWeight: 600, color: TEXT, marginLeft: 4, flex: 1 }}>{title}</span>
      <span style={{ fontSize: 10, color: TEXT_SECONDARY, marginRight: action ? 6 : 0 }}>{count}</span>
      {action && (
        <span
          onClick={(e) => { e.stopPropagation(); action.onClick(); }}
          style={{ fontSize: 11, color: PRIMARY, cursor: 'pointer', fontWeight: 500 }}
        >
          {action.label}
        </span>
      )}
    </div>
  );

  // ---- RENDER: Conversation list item ----
  const renderItem = (
    key: string,
    name: string,
    subtitle: string,
    avatarBg: string,
    initial: string,
    unread: number,
    onClick: () => void,
    isSelected?: boolean,
    contextActions?: { onDelete?: () => void; onLeave?: () => void },
  ) => (
    <div
      key={key}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        cursor: 'pointer',
        transition: 'background 0.15s',
        background: isSelected ? '#F0FFF0' : 'transparent',
        borderLeft: isSelected ? `3px solid ${PRIMARY}` : '3px solid transparent',
      }}
      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#F8F9FA'; }}
      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: '50%', background: avatarBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 13, fontWeight: 600, flexShrink: 0,
      }}>
        {initial}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {name}
        </div>
        <div style={{ fontSize: 11, color: TEXT_SECONDARY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {subtitle}
        </div>
      </div>
      {unread > 0 && (
        <Badge count={unread} size="small" style={{ backgroundColor: PRIMARY }} />
      )}
      {contextActions && (
        <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          {contextActions.onLeave && (
            <Popconfirm title="Leave this group?" onConfirm={contextActions.onLeave} okText="Leave" cancelText="Cancel">
              <button style={{ width: 22, height: 22, border: 'none', background: 'transparent', cursor: 'pointer', color: TEXT_SECONDARY, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#F5F5F5'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                title="Leave group"
              >
                ↩
              </button>
            </Popconfirm>
          )}
          {contextActions.onDelete && (
            <Popconfirm title="Delete this group?" onConfirm={contextActions.onDelete} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
              <button style={{ width: 22, height: 22, border: 'none', background: 'transparent', cursor: 'pointer', color: '#ff4d4f', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#FFF1F0'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                title="Delete group"
              >
                <DeleteOutlined style={{ fontSize: 11 }} />
              </button>
            </Popconfirm>
          )}
        </div>
      )}
    </div>
  );

  // ---- RENDER: Accordion list ----
  const renderAccordion = (highlightId?: string | null) => {
    if (!sidebarData) {
      if (filteredFlatGroups.length === 0) {
        return (
          <div style={{ padding: 16, fontSize: 12, color: TEXT_SECONDARY, textAlign: 'center' }}>
            No conversations yet
          </div>
        );
      }
      return filteredFlatGroups.map(group => {
        const lastMsg = group.messages?.[0]?.message || group.lastMessage?.message || 'No messages';
        const unread = group.unreadCount || getUnreadCount(group.id);
        const name = groupName(group);
        return renderItem(
          group.id, name, lastMsg, PRIMARY, name.charAt(0).toUpperCase(), unread,
          () => openConversation(group.id, name, PRIMARY),
          highlightId === group.id,
          {
            onLeave: () => handleLeaveGroup(group.id),
            onDelete: group.userId === user?.id ? () => handleDeleteGroup(group.id) : undefined,
          },
        );
      });
    }

    return (
      <>
        {renderSectionHeader('Teams', 'teams', <TeamOutlined style={{ fontSize: 12, color: TEAM_AVATAR_BG }} />, filteredTeams.length)}
        <div style={{ maxHeight: expandedSections.teams ? 9999 : 0, overflow: 'hidden', transition: 'max-height 0.25s ease-in-out' }}>
          {filteredTeams.length === 0 ? (
            <div style={{ padding: '8px 12px', fontSize: 11, color: TEXT_SECONDARY, textAlign: 'center' }}>No teams</div>
          ) : (
            filteredTeams.map(team => {
              const subtitle = team.lastMessage?.message || `${team.memberCount} member${team.memberCount !== 1 ? 's' : ''}`;
              const name = team.name || 'Unnamed Team';
              const cid = team.conversationId || `team-${team.id}`;
              return renderItem(
                cid, name, subtitle, TEAM_AVATAR_BG, name.charAt(0).toUpperCase(), team.unreadCount,
                () => handleTeamChatOpen(team),
                highlightId === cid || highlightId === team.conversationId,
              );
            })
          )}
        </div>

        {renderSectionHeader('Groups', 'groups', <MessageOutlined style={{ fontSize: 12, color: PRIMARY }} />, filteredGroups.length, { label: '+ Create', onClick: () => { setModalOpen(true); fetchCreateGroupMembers(); } })}
        <div style={{ maxHeight: expandedSections.groups ? 9999 : 0, overflow: 'hidden', transition: 'max-height 0.25s ease-in-out' }}>
          {filteredGroups.length === 0 ? (
            <div style={{ padding: '8px 12px', fontSize: 11, color: TEXT_SECONDARY, textAlign: 'center' }}>No groups</div>
          ) : (
            filteredGroups.map(group => {
              const lastMsg = group.messages?.[0]?.message || group.lastMessage?.message || 'No messages';
              const unread = group.unreadCount || getUnreadCount(group.id);
              const name = groupName(group);
              return renderItem(
                group.id, name, lastMsg, PRIMARY, name.charAt(0).toUpperCase(), unread,
                () => openConversation(group.id, name, PRIMARY),
                highlightId === group.id,
                {
                  onLeave: () => handleLeaveGroup(group.id),
                  onDelete: group.userId === user?.id ? () => handleDeleteGroup(group.id) : undefined,
                },
              );
            })
          )}
        </div>

        {renderSectionHeader('Members', 'members', <UserOutlined style={{ fontSize: 12, color: CONTACT_AVATAR_BG }} />, filteredContacts.length)}
        <div style={{ maxHeight: expandedSections.members ? 9999 : 0, overflow: 'hidden', transition: 'max-height 0.25s ease-in-out' }}>
          {filteredContacts.length === 0 ? (
            <div style={{ padding: '8px 12px', fontSize: 11, color: TEXT_SECONDARY, textAlign: 'center' }}>No contacts</div>
          ) : (
            filteredContacts.map(contact => {
              const name = contact.name || contact.email || 'Unknown';
              const subtitle = contact.lastMessage?.message || contact.email || '';
              const cid = contact.conversationId || `contact-${contact.id}`;
              return renderItem(
                cid, name, subtitle, CONTACT_AVATAR_BG, name.charAt(0).toUpperCase(), contact.unreadCount,
                () => handleContactChatOpen(contact),
                highlightId === cid || highlightId === contact.conversationId,
              );
            })
          )}
        </div>
      </>
    );
  };

  // ---- RENDER: Input bar (shared between column and full view) ----
  const renderInputBar = () => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '8px 12px', borderTop: `1px solid ${BORDER}`, flexShrink: 0, background: '#fff',
    }}>
      {/* File attach */}
      <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 6, color: TEXT_SECONDARY, flexShrink: 0 }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#F5F5F5'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        title="Attach file"
      >
        <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} accept="*/*" />
        <PaperClipOutlined style={{ fontSize: 16 }} />
      </label>
      {/* Image upload */}
      <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 6, color: TEXT_SECONDARY, flexShrink: 0 }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#F5F5F5'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        title="Upload image"
      >
        <input type="file" ref={imageInputRef} style={{ display: 'none' }} onChange={handleFileUpload} accept="image/*" />
        <PictureOutlined style={{ fontSize: 16 }} />
      </label>
      {/* Text input */}
      <Input
        placeholder="Type a message..."
        value={messageInput}
        onChange={(e) => setMessageInput(e.target.value)}
        onPressEnter={handleSend}
        size="small"
        style={{ borderRadius: 6, fontSize: 12, flex: 1 }}
        disabled={sendingMessage || uploading}
      />
      {/* Send */}
      <Button
        type="primary" size="small" icon={<SendOutlined />}
        onClick={handleSend} loading={sendingMessage || uploading}
        style={{ background: PRIMARY, borderColor: PRIMARY, borderRadius: 6 }}
      />
    </div>
  );

  // ---- RENDER: Messages area ----
  const renderMessagesArea = () => (
    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', background: isFullView ? '#FAFAFA' : '#fff' }}>
      {loadingMessages ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          <Spin size="small" />
        </div>
      ) : messages.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24, color: TEXT_SECONDARY, fontSize: 12 }}>
          No messages yet. Start the conversation!
        </div>
      ) : (
        messages.map((msg) => {
          const own = isOwnMessage(msg);
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: own ? 'flex-end' : 'flex-start', marginBottom: 6 }}>
              {!own && (
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', background: selectedGroupAvatarBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 10, fontWeight: 600, flexShrink: 0, marginRight: 6, alignSelf: 'flex-end',
                }}>
                  {getSenderName(msg).charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{
                maxWidth: isFullView ? '60%' : '80%',
                background: own ? PRIMARY : INPUT_BG,
                color: own ? '#fff' : TEXT,
                padding: '6px 10px',
                borderRadius: own ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                fontSize: 12, wordBreak: 'break-word',
              }}>
                {!own && (
                  <div style={{ fontSize: 10, fontWeight: 600, color: PRIMARY, marginBottom: 2 }}>
                    {getSenderName(msg)}
                  </div>
                )}
                {renderMessageContent(msg, own)}
                <div style={{
                  fontSize: 9, color: own ? 'rgba(255,255,255,0.6)' : TEXT_SECONDARY,
                  textAlign: 'right', marginTop: 2,
                }}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {msg._status === 'sending' && ' ⏳'}
                  {msg._status === 'failed' && ' ❌'}
                </div>
              </div>
            </div>
          );
        })
      )}
      <div ref={messagesEndRef} />
    </div>
  );

  // ---- RENDER: Header buttons (full view + close) ----
  const renderHeaderButtons = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button onClick={onFullView} title={isFullView ? 'Collapse' : 'Full view'}
        style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: TEXT_SECONDARY }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#F5F5F5'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        {isFullView ? <CompressOutlined style={{ fontSize: 14 }} /> : <ExpandOutlined style={{ fontSize: 14 }} />}
      </button>
      <button onClick={onClose} title="Close chat"
        style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: TEXT_SECONDARY }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#F5F5F5'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <CloseOutlined style={{ fontSize: 13 }} />
      </button>
    </div>
  );

  // ---- RENDER: Create group modal ----
  const renderCreateModal = () => (
    <Modal
      title="Create New Group"
      open={modalOpen}
      onCancel={() => { setModalOpen(false); form.resetFields(); setCreateSelectedMemberIds(new Set()); }}
      onOk={handleCreateGroup}
      confirmLoading={creating}
      okText="Create Group"
      okButtonProps={{ style: { background: PRIMARY, borderColor: PRIMARY } }}
      zIndex={1100}
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
  );

  // ===============================================================
  // FULL VIEW: Two-column layout (list left + messages right)
  // ===============================================================
  if (isFullView) {
    return (
      <>
        <div className="right-chat-column" style={{
          width: '100%', height: '100%', background: '#FFFFFF',
          borderLeft: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Full view header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 16px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <MessageOutlined style={{ fontSize: 15, color: PRIMARY }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>Chat</span>
            </div>
            {renderHeaderButtons()}
          </div>

          {/* Two-column body */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* LEFT: Conversation list */}
            <div style={{
              width: 300, minWidth: 300, borderRight: `1px solid ${BORDER}`,
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
              {/* Search */}
              <div style={{ padding: '8px 12px', flexShrink: 0 }}>
                <Input
                  placeholder="Search..." prefix={<SearchOutlined style={{ color: TEXT_SECONDARY, fontSize: 13 }} />}
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  size="small" style={{ borderRadius: 6, fontSize: 12 }}
                />
              </div>
              {/* Accordion */}
              <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                {loadingSidebar ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spin size="small" /></div>
                ) : (
                  renderAccordion(selectedGroupId)
                )}
              </div>
              {/* New Chat */}
              <div style={{ padding: '8px 12px', borderTop: `1px solid ${BORDER}`, flexShrink: 0 }}>
                <Button type="primary" icon={<PlusOutlined />} block size="small"
                  onClick={() => { setModalOpen(true); fetchCreateGroupMembers(); }}
                  style={{ background: PRIMARY, borderColor: PRIMARY, borderRadius: 6 }}
                >
                  New Chat
                </Button>
              </div>
            </div>

            {/* RIGHT: Messages */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#FAFAFA' }}>
              {!selectedGroupId ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center', color: TEXT_SECONDARY }}>
                    <MessageOutlined style={{ fontSize: 40, color: '#E0E0E0', marginBottom: 12 }} />
                    <div style={{ fontSize: 14, fontWeight: 500 }}>Select a conversation</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>Choose from your chats on the left</div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Message header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 16px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0, background: '#fff',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', background: selectedGroupAvatarBg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 14, fontWeight: 600, flexShrink: 0,
                    }}>
                      {selectedGroupName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{selectedGroupName}</div>
                    </div>
                  </div>
                  {renderMessagesArea()}
                  {renderInputBar()}
                </>
              )}
            </div>
          </div>
        </div>
        {renderCreateModal()}
      </>
    );
  }

  // ===============================================================
  // COLUMN VIEW: Single column (430px)
  // ===============================================================

  // LIST VIEW
  if (view === 'list') {
    return (
      <>
        <div className="right-chat-column" style={{
          width: COLUMN_WIDTH, minWidth: COLUMN_WIDTH, height: '100%',
          background: '#FFFFFF', borderLeft: `1px solid ${BORDER}`,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 12px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <MessageOutlined style={{ fontSize: 15, color: PRIMARY }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>Chat</span>
            </div>
            {renderHeaderButtons()}
          </div>

          {/* Search */}
          <div style={{ padding: '8px 12px', flexShrink: 0 }}>
            <Input
              placeholder="Search..." prefix={<SearchOutlined style={{ color: TEXT_SECONDARY, fontSize: 13 }} />}
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              size="small" style={{ borderRadius: 6, fontSize: 12 }} id="right-chat-search"
            />
          </div>

          {/* Accordion */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            {loadingSidebar ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spin size="small" /></div>
            ) : (
              renderAccordion()
            )}
          </div>

          {/* New Chat */}
          <div style={{ padding: '8px 12px', borderTop: `1px solid ${BORDER}`, flexShrink: 0 }}>
            <Button type="primary" icon={<PlusOutlined />} block size="small"
              onClick={() => { setModalOpen(true); fetchCreateGroupMembers(); }}
              style={{ background: PRIMARY, borderColor: PRIMARY, borderRadius: 6 }}
            >
              New Chat
            </Button>
          </div>
        </div>
        {renderCreateModal()}
      </>
    );
  }

  // MESSAGE VIEW (column)
  return (
    <>
      <div className="right-chat-column" style={{
        width: COLUMN_WIDTH, minWidth: COLUMN_WIDTH, height: '100%',
        background: '#FFFFFF', borderLeft: `1px solid ${BORDER}`,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Message header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0,
        }}>
          <button onClick={backToList}
            style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: TEXT_SECONDARY, flexShrink: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#F5F5F5'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <ArrowLeftOutlined style={{ fontSize: 13 }} />
          </button>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', background: selectedGroupAvatarBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 12, fontWeight: 600, flexShrink: 0,
          }}>
            {selectedGroupName.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selectedGroupName}
            </div>
          </div>
          {renderHeaderButtons()}
        </div>

        {renderMessagesArea()}
        {renderInputBar()}
      </div>
      {renderCreateModal()}
    </>
  );
}
