"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { Badge, Spin, Button, message, Popconfirm, Image } from "antd";
import {
  ModalShell,
  ModalHeader,
  ModalFooter,
} from "@/components/common/Modal";
import { Field, FieldInput } from "@/components/common/Field";
import {
  SearchOutlined,
  MessageOutlined,
  UserOutlined,
  RightOutlined,
  CloseOutlined,
  SendOutlined,
  ArrowLeftOutlined,
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
  UserAddOutlined,
  LockOutlined,
} from "@ant-design/icons";
import {
  Search,
  Hash,
  Check,
  ArrowLeft,
  Users,
  Paperclip,
  Send,
  Plus,
  UserPlus,
  MessageSquare,
  Lock,
  X,
  Maximize2,
  Minimize2,
  Trash2,
  LogOut,
} from "lucide-react";
import api from "@/lib/axios";
import { upload } from "@/lib/axios";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { useAuth } from "@/hooks/useAuth";
import { useAppContext } from "@/context/AppContext";
import { usePro } from "@/hooks/usePro";
import { useSocket } from "@/hooks/useSocket";

const PRIMARY = "#3CB371";
const TEXT = "#1A1A2E";
const TEXT_SECONDARY = "#8C8C8C";
const BORDER = "#F0F0F0";
const TEAM_AVATAR_BG = "#7C3AED";
const CONTACT_AVATAR_BG = "#3B82F6";
const INPUT_BG = "#F8F9FA";
const COLUMN_WIDTH = 430;

// Mobile redesign tokens (DESIGN.md) — only used when `mobileRestyle` is set
const M_PRIMARY = "#34A881";
const M_TINT = "#E7F6F0";
const M_BG = "#F5F7F6";
const M_BORDER = "#E5EBE8";
const M_TEXT = "#1F2937";
const M_TEXT_SEC = "#6B7280";
const TEAM_COLORS = [
  "#34A881",
  "#006AA8",
  "#FF9A30",
  "#1F7D5E",
  "#F85729",
  "#7C3AED",
];
const hashColor = (s: string) =>
  TEAM_COLORS[
    Array.from(s).reduce((a, c) => a + c.charCodeAt(0), 0) % TEAM_COLORS.length
  ];

// Compact relative time for the mobile list ("2m", "1h", "Mon")
function shortTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  if (hrs < 168) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

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
  lastMessage?: { message?: string; content?: string; createdAt?: string };
  unreadCount?: number;
  members?: Array<{
    id: string;
    name?: string;
    email?: string;
    image?: string;
  }>;
  // Backend-computed per-user fields (sidebar response):
  isDirect?: boolean;
  displayName?: string;
  displayImage?: string | null;
  otherUserId?: string | null;
  memberCount?: number;
  _count?: { members?: number; messages?: number };
}

interface SidebarData {
  teams: SidebarTeam[];
  groups: ChatGroup[];
  contacts: SidebarContact[];
  allGroups: ChatGroup[];
  // Backend sets this to true when the caller is in personal context or
  // isn't a member of the requested team — chat is a team feature, so the
  // UI renders a locked placeholder.
  locked?: boolean;
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
  _status?: "sending" | "sent" | "failed";
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
  /** Mobile (<1024px) redesign — only the standalone /dashboard/chat page
   *  sets this. The unified `.tw` layout renders the same at all widths now,
   *  so this prop no longer changes styling (kept for compatibility). */
  mobileRestyle?: boolean;
}

// Prefer the per-user displayName the backend computes for DM groups
// (so the recipient never sees their own name as the group title).
const groupName = (g: ChatGroup) =>
  g.displayName || g.title || g.name || "Unnamed Group";

// Build file URL for display
function buildFileUrl(file: ChatFile): string {
  if (file.id) {
    return `/api/chat/files/${file.id}/serve`;
  }
  return file.filePath || "";
}

// Get file icon based on MIME type
function getFileIcon(fileType?: string) {
  if (fileType?.includes("pdf"))
    return <FilePdfOutlined style={{ fontSize: 18 }} />;
  if (
    fileType?.includes("sheet") ||
    fileType?.includes("excel") ||
    fileType?.includes("csv")
  )
    return <FileExcelOutlined style={{ fontSize: 18 }} />;
  if (fileType?.includes("word") || fileType?.includes("document"))
    return <FileWordOutlined style={{ fontSize: 18 }} />;
  return <FileOutlined style={{ fontSize: 18 }} />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function RightChatColumn({
  onClose,
  onFullView,
  isFullView = false,
  mobileRestyle = false,
}: RightChatColumnProps) {
  const { user } = useAuth();
  const { activeTeamId, isTeamContext, effectivePlan } = useAppContext();
  const { currentApp } = usePro();
  // Pro app shell, active team context, OR a subscription-aware Team plan
  // grants full chat. The `effectivePlan === "team"` clause covers a Team-plan
  // purchaser who is still in personal context — team OWNERS are excluded from
  // `availableTeams` (the switcher only lists invited teams), so `isTeamContext`
  // stays false for them. Without this clause the chat column rendered a
  // "Chat requires a team" lock while the Sidebar already showed Chat unlocked.
  // Mirrors the Sidebar's `hasTeamFeatures` gate so every chat surface agrees.
  // `hasPro` lifetime is intentionally NOT honored here — it only unlocks chat
  // when the user is currently in the Pro app shell.
  const hasChatAccess =
    currentApp === "pro" || isTeamContext || effectivePlan === "team";
  const {
    getUnreadCount,
    markGroupAsRead,
    refetch: refetchUnread,
  } = useUnreadCount();
  const { socket } = useSocket();

  // View state
  const [view, setView] = useState<"list" | "messages">("list");
  // Conversation tab (prototype Projects/Group/Direct) maps to teams/groups/contacts
  const [tab, setTab] = useState<"team" | "group" | "direct">("team");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedGroupName, setSelectedGroupName] = useState("");
  const [selectedGroupAvatarBg, setSelectedGroupAvatarBg] = useState(PRIMARY);
  const selectedGroupIdRef = useRef<string | null>(null);

  // Sidebar data
  const [sidebarData, setSidebarData] = useState<SidebarData | null>(null);
  const [flatGroups, setFlatGroups] = useState<ChatGroup[]>([]);
  const [loadingSidebar, setLoadingSidebar] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    teams: true,
    groups: true,
    members: true,
  });

  // Messages
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Create group modal
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createGroupName, setCreateGroupName] = useState("");
  const [createGroupMembers, setCreateGroupMembers] = useState<TeamGroup[]>([]);
  const [createSelectedMemberIds, setCreateSelectedMemberIds] = useState<
    Set<string>
  >(new Set());

  // Add-Members-to-existing-group modal state
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [addMembersGroups, setAddMembersGroups] = useState<TeamGroup[]>([]);
  const [addMembersSelected, setAddMembersSelected] = useState<Set<string>>(
    new Set(),
  );
  const [addMembersLoading, setAddMembersLoading] = useState(false);
  const [addingMembers, setAddingMembers] = useState(false);

  // Keep ref in sync
  useEffect(() => {
    selectedGroupIdRef.current = selectedGroupId;
  }, [selectedGroupId]);

  // ---- DATA FETCHING ----

  const fetchSidebar = useCallback(async () => {
    try {
      const res = await api.get("/chat/sidebar", {
        params: activeTeamId ? { teamId: activeTeamId } : undefined,
      });
      const d = res.data?.data || res.data || {};
      if (d.teams !== undefined) {
        setSidebarData(d as SidebarData);
        const allGroups = d.allGroups || d.groups || [];
        setFlatGroups(Array.isArray(allGroups) ? allGroups : []);
      } else {
        const gRes = await api.get("/chat/groups");
        const gd = gRes.data?.data || gRes.data || {};
        const groupList = gd.groups || (Array.isArray(gd) ? gd : []);
        setFlatGroups(groupList);
        setSidebarData(null);
      }
    } catch {
      try {
        const gRes = await api.get("/chat/groups");
        const gd = gRes.data?.data || gRes.data || {};
        const groupList = gd.groups || (Array.isArray(gd) ? gd : []);
        setFlatGroups(groupList);
      } catch {
        // silently fail
      }
    } finally {
      setLoadingSidebar(false);
    }
  }, [activeTeamId]);

  useEffect(() => {
    fetchSidebar();
    const interval = setInterval(fetchSidebar, 30000);
    return () => clearInterval(interval);
    // Re-fetch when the workspace context flips (personal ↔ team A ↔ team B).
    // The axios interceptor sends the new X-Team-Context header automatically.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchSidebar, activeTeamId]);

  // When the workspace context changes, close any open conversation so
  // we don't leave another workspace's thread on screen.
  useEffect(() => {
    setSelectedGroupId(null);
    setSelectedGroupName("");
    setView("list");
    setMessages([]);
  }, [activeTeamId]);

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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Polling for new messages
  useEffect(() => {
    if (!selectedGroupId || view !== "messages") return;
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
        setMessages((prev) => {
          const tempIdx = prev.findIndex(
            (m) => m._tempId && m.message === data.message,
          );
          if (tempIdx !== -1) {
            const updated = [...prev];
            updated[tempIdx] = { ...data, _status: "sent" };
            return updated;
          }
          if (prev.some((m) => m.id === data.id)) return prev;
          return [...prev, { ...data, _status: "sent" }];
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

    socket.on("message:new", onNewMessage);
    socket.on("group:deleted", onGroupDeleted);

    return () => {
      socket.off("message:new", onNewMessage);
      socket.off("group:deleted", onGroupDeleted);
    };
  }, [socket, fetchSidebar, refetchUnread]);

  // ---- ACTIONS ----

  const openConversation = (
    groupId: string,
    name: string,
    avatarBg: string,
  ) => {
    setSelectedGroupId(groupId);
    setSelectedGroupName(name);
    setSelectedGroupAvatarBg(avatarBg);
    setView("messages");
    setMessages([]);
  };

  const backToList = () => {
    setView("list");
    setSelectedGroupId(null);
    setMessages([]);
    setMessageInput("");
  };

  const handleSend = async () => {
    if (!messageInput.trim() || !selectedGroupId) return;
    const text = messageInput.trim();
    setMessageInput("");
    setSendingMessage(true);

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      _tempId: tempId,
      message: text,
      userId: user?.id,
      user: { id: user?.id, name: user?.name },
      type: "text",
      createdAt: new Date().toISOString(),
      _status: "sending",
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await api.post(`/chat/groups/${selectedGroupId}/messages`, {
        message: text,
      });
      const sent = res.data?.data;
      setMessages((prev) =>
        prev.map((m) =>
          m._tempId === tempId
            ? { ...(sent || optimisticMsg), _status: "sent" }
            : m,
        ),
      );
      fetchSidebar();
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m._tempId === tempId ? { ...m, _status: "failed" } : m,
        ),
      );
      message.error("Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedGroupId) return;
    e.target.value = "";

    if (file.size > 25 * 1024 * 1024) {
      message.error("File exceeds 25MB limit");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("groupId", selectedGroupId);
      const res = await upload("/chat/upload", formData);
      const data = res.data?.data || res.data;
      if (data?.id) {
        // Message was created server-side, refresh
        fetchMessages(selectedGroupId);
      } else if (data?.url) {
        // File uploaded, create message manually
        const fileType = file.type.startsWith("image/") ? "image" : "docs";
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
      openConversation(
        team.conversationId,
        team.name || "Team Chat",
        hashColor(team.name || "Team Chat"),
      );
      return;
    }
    try {
      setCreating(true);
      const res = await api.post("/chat/groups", {
        title: team.name || "Team Chat",
        teamId: team.id,
        memberIds: team.members.map((m) => m.id),
      });
      const newGroup = res.data?.data;
      if (newGroup?.id) {
        openConversation(
          newGroup.id,
          team.name || "Team Chat",
          hashColor(team.name || "Team Chat"),
        );
        fetchSidebar();
      }
    } catch {
      message.error("Failed to create team chat");
    } finally {
      setCreating(false);
    }
  };

  // Contact chat open
  const handleContactChatOpen = async (contact: SidebarContact) => {
    const name = contact.name || contact.email || "DM";
    if (contact.conversationId) {
      openConversation(contact.conversationId, name, hashColor(name));
      return;
    }
    try {
      setCreating(true);
      const res = await api.post("/chat/groups", {
        title: contact.name || contact.email || "Direct Message",
        memberIds: [contact.id],
        isDirect: true,
      });
      const newGroup = res.data?.data;
      if (newGroup?.id) {
        openConversation(newGroup.id, name, hashColor(name));
        fetchSidebar();
      }
    } catch {
      message.error("Failed to start conversation");
    } finally {
      setCreating(false);
    }
  };

  // Delete group
  const handleDeleteGroup = async (groupId: string) => {
    try {
      await api.delete(`/chat/groups/${groupId}`);
      message.success("Group deleted");
      if (selectedGroupId === groupId) backToList();
      fetchSidebar();
    } catch {
      message.error("Failed to delete group");
    }
  };

  // Leave group
  const handleLeaveGroup = async (groupId: string) => {
    try {
      await api.post(`/chat/groups/${groupId}/leave`);
      message.success("Left group");
      if (selectedGroupId === groupId) backToList();
      fetchSidebar();
    } catch {
      message.error("Failed to leave group");
    }
  };

  // Create group
  const handleCreateGroup = async () => {
    const name = createGroupName.trim();
    if (!name) {
      message.error("Please enter a group name");
      return;
    }
    try {
      setCreating(true);
      const memberIds = Array.from(createSelectedMemberIds);
      const res = await api.post("/chat/groups", {
        title: name,
        memberIds,
        isDirect: false,
      });
      const newGroup = res.data?.data;
      message.success("Group created");
      setCreateGroupName("");
      setCreateSelectedMemberIds(new Set());
      setModalOpen(false);
      fetchSidebar();
      if (newGroup?.id) {
        openConversation(newGroup.id, name, hashColor(name));
      }
    } catch (err: any) {
      // Surface real errors instead of swallowing them silently
      const apiMsg = err?.response?.data?.error?.message;
      if (apiMsg) {
        message.error(apiMsg);
      } else {
        message.error("Failed to create group");
      }
    } finally {
      setCreating(false);
    }
  };

  const fetchCreateGroupMembers = useCallback(async () => {
    const teamGroups: TeamGroup[] = (sidebarData?.teams || []).map((t) => ({
      teamId: t.id,
      teamName: t.name || "Unnamed Team",
      members: (t.members || [])
        .filter((m) => m.id !== user?.id)
        .map((m) => ({
          userId: m.id,
          name: m.name || "Unknown",
          email: m.email || "",
        })),
    }));
    // Contacts not covered by a visible team (e.g. DM partners) are still
    // valid group members — without this, users whose only team is a hidden
    // system workspace would have nobody to pick.
    const teamMemberIds = new Set(
      teamGroups.flatMap((g) => g.members.map((m) => m.userId)),
    );
    const extraContacts = (sidebarData?.contacts || []).filter(
      (c) => c.id !== user?.id && !teamMemberIds.has(c.id),
    );
    if (extraContacts.length) {
      teamGroups.push({
        teamId: "__contacts__",
        teamName: "Contacts",
        members: extraContacts.map((c) => ({
          userId: c.id,
          name: c.name || c.email || "Unknown",
          email: c.email || "",
        })),
      });
    }
    setCreateGroupMembers(teamGroups);
  }, [sidebarData, user?.id]);

  // Open the "Add Members" modal for the currently-open group.
  // Pulls team-grouped candidates (already filters out current group members).
  const openAddMembersModal = async () => {
    if (!selectedGroupId) return;
    setAddMembersOpen(true);
    setAddMembersSelected(new Set());
    setAddMembersGroups([]);
    setAddMembersLoading(true);
    try {
      const res = await api.get(
        `/chat/groups/${selectedGroupId}/available-members`,
      );
      const data = res.data?.data || res.data || [];
      // Backend returns: [{ teamId, teamName, members:[{userId,name,email,avatar,alreadyInGroup}] }]
      const groups: TeamGroup[] = (Array.isArray(data) ? data : [])
        .map((tg: any) => ({
          teamId: tg.teamId,
          teamName: tg.teamName || "Team",
          members: (tg.members || [])
            .filter((m: any) => !m.alreadyInGroup)
            .map((m: any) => ({
              userId: m.userId,
              name: m.name || m.email || "Unknown",
              email: m.email || "",
            })),
        }))
        .filter((tg: TeamGroup) => tg.members.length > 0);
      setAddMembersGroups(groups);
    } catch (err: any) {
      const apiMsg = err?.response?.data?.error?.message;
      message.error(apiMsg || "Failed to load available members");
      setAddMembersOpen(false);
    } finally {
      setAddMembersLoading(false);
    }
  };

  const handleAddMembers = async () => {
    if (!selectedGroupId) return;
    const userIds = Array.from(addMembersSelected);
    if (userIds.length === 0) {
      message.warning("Select at least one member");
      return;
    }
    setAddingMembers(true);
    try {
      const res = await api.post(
        `/chat/groups/${selectedGroupId}/members/batch`,
        { userIds },
      );
      const data = res.data?.data;
      message.success(
        data?.addedCount
          ? `Added ${data.addedCount} member${data.addedCount === 1 ? "" : "s"}`
          : "Members added",
      );
      setAddMembersOpen(false);
      setAddMembersSelected(new Set());
      fetchSidebar();
      fetchMessages(selectedGroupId);
    } catch (err: any) {
      const apiMsg = err?.response?.data?.error?.message;
      message.error(apiMsg || "Failed to add members");
    } finally {
      setAddingMembers(false);
    }
  };

  // ---- FILTERED DATA ----

  const filteredTeams = useMemo(() => {
    if (!sidebarData?.teams) return [];
    if (!searchQuery) return sidebarData.teams;
    const q = searchQuery.toLowerCase();
    return sidebarData.teams.filter((t) =>
      (t.name || "").toLowerCase().includes(q),
    );
  }, [sidebarData?.teams, searchQuery]);

  const filteredGroups = useMemo(() => {
    if (!sidebarData?.groups) return [];
    if (!searchQuery) return sidebarData.groups;
    const q = searchQuery.toLowerCase();
    return sidebarData.groups.filter((g) =>
      groupName(g).toLowerCase().includes(q),
    );
  }, [sidebarData?.groups, searchQuery]);

  const filteredContacts = useMemo(() => {
    if (!sidebarData?.contacts) return [];
    if (!searchQuery) return sidebarData.contacts;
    const q = searchQuery.toLowerCase();
    return sidebarData.contacts.filter(
      (c) =>
        (c.name || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q),
    );
  }, [sidebarData?.contacts, searchQuery]);

  const filteredFlatGroups = useMemo(() => {
    if (!searchQuery) return flatGroups;
    const q = searchQuery.toLowerCase();
    return flatGroups.filter((g) => groupName(g).toLowerCase().includes(q));
  }, [flatGroups, searchQuery]);

  // ---- HELPERS ----

  const getSenderName = (msg: ChatMessage): string => {
    return msg.sender?.name || msg.user?.name || "Unknown";
  };

  const isOwnMessage = (msg: ChatMessage): boolean => {
    return (
      (msg.senderId || msg.userId || msg.user?.id || msg.sender?.id) ===
      user?.id
    );
  };

  // ---- RENDER: Message content (text, images, files) ----
  const renderMessageContent = (msg: ChatMessage, own: boolean) => {
    const files = msg.files || [];
    const msgText = msg.message || msg.content || "";
    const msgType = msg.type || "text";
    const attachPath = msg.attachPath;

    // Image type with attachPath but no files array
    if (msgType === "image" && attachPath && files.length === 0) {
      const imgSrc = attachPath.startsWith("/")
        ? `/api/chat/files/${attachPath.split("/").pop()}/serve`
        : attachPath;
      return (
        <div>
          <Image
            src={imgSrc}
            alt={msgText || "Image"}
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
          {msgType === "text" && msgText && (
            <div style={{ marginBottom: 4 }}>{msgText}</div>
          )}
          {files.map((file) => {
            const isImage =
              file.fileType?.startsWith("image/") ||
              /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.fileName || "");
            const fileUrl = buildFileUrl(file);

            if (isImage) {
              return (
                <div key={file.id} style={{ marginTop: 4 }}>
                  <Image
                    src={fileUrl}
                    alt={file.fileName || "Image"}
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
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 8px",
                  borderRadius: 6,
                  background: own ? "rgba(255,255,255,0.15)" : "#F5F5F5",
                  color: own ? "#fff" : TEXT,
                  textDecoration: "none",
                  fontSize: 11,
                  marginTop: 4,
                }}
              >
                {getFileIcon(file.fileType)}
                <span
                  style={{
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {file.fileName}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: own ? "rgba(255,255,255,0.6)" : TEXT_SECONDARY,
                    flexShrink: 0,
                  }}
                >
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

  // ===============================================================
  // UNIFIED .tw RENDERERS (new_design prototype — both breakpoints)
  // ===============================================================

  const TABS_DEF: Array<{ id: "team" | "group" | "direct"; label: string }> = [
    { id: "team", label: "Projects" },
    { id: "group", label: "Group" },
    { id: "direct", label: "Direct" },
  ];

  // Colored round avatar with initial (prototype Avatar atom)
  const twAvatar = (name: string, size = 48) => (
    <div
      className="rounded-full overflow-hidden shrink-0 flex items-center justify-center text-white font-bold"
      style={{
        width: size,
        height: size,
        background: hashColor(name || "?"),
        fontSize: Math.round(size * 0.32),
      }}
    >
      {(name || "?").trim().charAt(0).toUpperCase()}
    </div>
  );

  // Locked placeholder (personal context / non-member)
  const twLock = () => (
    <div className="px-5 py-12 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-secondary flex items-center justify-center mb-3">
        <Lock className="w-6 h-6 text-muted-foreground" />
      </div>
      <div className="font-bold text-sm text-foreground mb-1">
        Chat requires a team
      </div>
      <div className="text-xs text-muted-foreground">
        Switch to a team context to start messaging teammates.
      </div>
    </div>
  );

  const twEmpty = (label: string) => (
    <div className="py-10 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );

  // Search bar (prototype SearchBar atom)
  const twSearch = () => (
    <div className="flex items-center gap-2 h-11 px-3 rounded-2xl bg-card border border-border mb-4">
      <Search className="w-4 h-4 text-muted-foreground" />
      <input
        id="right-chat-search"
        placeholder="Search conversations"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="flex-1 bg-transparent outline-none text-sm border-0 p-0"
      />
    </div>
  );

  // Segmented tabs (prototype Tabs atom)
  const twTabs = () => (
    <div className="flex p-1 rounded-2xl bg-secondary">
      {TABS_DEF.map((t) => (
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          className={`flex-1 h-10 rounded-xl text-sm font-semibold transition border-0 cursor-pointer appearance-none ${
            tab === t.id
              ? "bg-card text-primary-deep shadow-sm"
              : "bg-transparent text-muted-foreground"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  // One conversation row (prototype list item)
  const twRow = (opts: {
    key: string;
    name: string;
    subtitle: string;
    time?: string;
    unread?: number;
    hash?: boolean;
    online?: boolean;
    onClick: () => void;
    onLeave?: () => void;
    onDelete?: () => void;
  }) => (
    <div
      key={opts.key}
      onClick={opts.onClick}
      className="group w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-card transition text-left cursor-pointer"
    >
      <div className="relative shrink-0">
        {twAvatar(opts.name)}
        {opts.hash && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary-tint border-2 border-background flex items-center justify-center">
            <Hash className="w-2.5 h-2.5 text-primary-deep" />
          </div>
        )}
        {opts.online && (
          <span
            className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background"
            style={{ background: "#22c55e" }}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="font-semibold text-sm truncate">{opts.name}</div>
          {opts.time && (
            <div className="text-[10px] text-muted-foreground shrink-0">
              {opts.time}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between mt-0.5 gap-2">
          <div className="text-[12px] text-muted-foreground truncate flex-1">
            {opts.subtitle}
          </div>
          {opts.unread ? (
            <span className="ml-2 text-[10px] font-bold bg-primary text-white px-1.5 py-0.5 rounded-full shrink-0">
              {opts.unread}
            </span>
          ) : null}
        </div>
      </div>
      {(opts.onLeave || opts.onDelete) && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="hidden group-hover:flex items-center gap-1 shrink-0"
        >
          {opts.onLeave && (
            <Popconfirm
              title="Leave this group?"
              onConfirm={opts.onLeave}
              okText="Leave"
              cancelText="Cancel"
            >
              <button
                title="Leave group"
                className="w-8 h-8 rounded-lg border-0 cursor-pointer flex items-center justify-center appearance-none"
                style={{ background: "#eff6ff", color: "#006AA8" }}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </Popconfirm>
          )}
          {opts.onDelete && (
            <Popconfirm
              title="Delete this group?"
              onConfirm={opts.onDelete}
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <button
                title="Delete group"
                className="w-8 h-8 rounded-lg border-0 cursor-pointer flex items-center justify-center appearance-none"
                style={{ background: "#fef2f2", color: "#F85729" }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </Popconfirm>
          )}
        </div>
      )}
    </div>
  );

  // Conversation list (search + tabs + rows) — used in column, mobile, and full-view left pane
  const renderTwListInner = () => {
    if (sidebarData?.locked && !hasChatAccess) return twLock();

    // Flat-group fallback (no sidebar payload) — single list, no tabs.
    if (!sidebarData) {
      return (
        <div className="px-4 pt-3">
          {twSearch()}
          {filteredFlatGroups.length === 0 ? (
            twEmpty("No conversations yet")
          ) : (
            <div className="mt-1 space-y-1">
              {filteredFlatGroups.map((group) => {
                const lastMsg =
                  group.messages?.[0]?.message ||
                  group.lastMessage?.message ||
                  "No messages";
                const unread = group.unreadCount || getUnreadCount(group.id);
                const name = groupName(group);
                return twRow({
                  key: group.id,
                  name,
                  subtitle: lastMsg,
                  time: shortTime(group.lastMessage?.createdAt),
                  unread,
                  hash: !group.isDirect,
                  onClick: () =>
                    openConversation(group.id, name, hashColor(name)),
                  onLeave: () => handleLeaveGroup(group.id),
                  onDelete:
                    group.userId === user?.id
                      ? () => handleDeleteGroup(group.id)
                      : undefined,
                });
              })}
            </div>
          )}
        </div>
      );
    }

    // Tabbed (Projects / Group / Direct)
    let rows: React.ReactNode;
    if (tab === "team") {
      rows =
        filteredTeams.length === 0
          ? twEmpty("No projects yet")
          : filteredTeams.map((team) => {
              const name = team.name || "Unnamed Team";
              const subtitle =
                team.lastMessage?.message ||
                `${team.memberCount} member${team.memberCount !== 1 ? "s" : ""}`;
              const cid = team.conversationId || `team-${team.id}`;
              return twRow({
                key: cid,
                name,
                subtitle,
                time: shortTime(team.lastMessage?.createdAt),
                unread: team.unreadCount,
                hash: true,
                onClick: () => handleTeamChatOpen(team),
              });
            });
    } else if (tab === "group") {
      rows =
        filteredGroups.length === 0
          ? twEmpty("No groups yet")
          : filteredGroups.map((group) => {
              const lastMsg =
                group.messages?.[0]?.message ||
                group.lastMessage?.message ||
                "No messages";
              const count =
                group.memberCount ??
                group._count?.members ??
                group.members?.length ??
                0;
              const subtitle = `${count} member${count === 1 ? "" : "s"} · ${lastMsg}`;
              const unread = group.unreadCount || getUnreadCount(group.id);
              const name = groupName(group);
              return twRow({
                key: group.id,
                name,
                subtitle,
                time: shortTime(group.lastMessage?.createdAt),
                unread,
                hash: true,
                onClick: () =>
                  openConversation(group.id, name, hashColor(name)),
                onLeave: () => handleLeaveGroup(group.id),
                onDelete:
                  group.userId === user?.id
                    ? () => handleDeleteGroup(group.id)
                    : undefined,
              });
            });
    } else {
      rows =
        filteredContacts.length === 0 ? (
          <div className="py-8 text-center">
            <div className="text-2xl mb-2">👥</div>
            <div className="text-xs text-muted-foreground mb-3">
              No contacts yet
            </div>
            <button
              onClick={() => {
                window.location.href = "/dashboard/teams";
              }}
              className="inline-flex items-center bg-primary-tint text-primary-deep rounded-full px-3.5 py-1.5 text-[11px] font-bold border-0 cursor-pointer appearance-none"
            >
              Invite Teammate
            </button>
          </div>
        ) : (
          filteredContacts.map((contact) => {
            const name = contact.name || contact.email || "Unknown";
            const subtitle =
              contact.lastMessage?.message || contact.email || "";
            const cid = contact.conversationId || `contact-${contact.id}`;
            return twRow({
              key: cid,
              name,
              subtitle,
              time: shortTime(contact.lastMessage?.createdAt),
              unread: contact.unreadCount,
              hash: false,
              onClick: () => handleContactChatOpen(contact),
            });
          })
        );
    }

    return (
      <div className="px-4 pt-3">
        {twSearch()}
        {twTabs()}
        {tab === "group" && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                setModalOpen(true);
                fetchCreateGroupMembers();
              }}
              className="flex-1 h-11 rounded-2xl bg-primary text-white font-semibold text-sm inline-flex items-center justify-center gap-2 border-0 cursor-pointer appearance-none"
            >
              <Plus className="w-4 h-4" /> Create Group
            </button>
          </div>
        )}
        <div className="mt-4 space-y-1">{rows}</div>
      </div>
    );
  };

  // One message bubble (prototype ChatMsg)
  const twMsg = (msg: ChatMessage) => {
    const own = isOwnMessage(msg);
    const time = new Date(msg.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    if (own) {
      return (
        <div key={msg.id} className="flex flex-col items-end">
          <div className="max-w-[78%] bg-primary text-white px-4 py-3 rounded-2xl rounded-br-md text-[14px] leading-snug break-words">
            {renderMessageContent(msg, true)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-1 mr-1">
            {time}
            {msg._status === "sending" && " ⏳"}
            {msg._status === "failed" && " ❌"}
          </div>
        </div>
      );
    }
    const who = getSenderName(msg);
    return (
      <div key={msg.id}>
        <div className="text-[12px] font-semibold text-muted-foreground ml-11 mb-1">
          {who}
        </div>
        <div className="flex items-start gap-2">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 mt-1"
            style={{ background: selectedGroupAvatarBg }}
          >
            {who.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="max-w-[80%] bg-card border border-border px-4 py-3 rounded-2xl rounded-tl-md text-[14px] leading-snug text-foreground break-words">
              {renderMessageContent(msg, false)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1 ml-1">
              {time}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Input bar (prototype ChatThread footer)
  const renderTwInputBar = () => (
    <div
      className="p-3 border-t border-border bg-card flex items-center gap-2 shrink-0"
      style={{
        paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <label
        className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center cursor-pointer shrink-0"
        title="Attach file"
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileUpload}
          accept="*/*"
        />
        <Paperclip className="w-4 h-4 text-muted-foreground" />
      </label>
      <div className="flex-1 flex items-center gap-2 h-11 px-4 rounded-full bg-secondary">
        <input
          placeholder="Type a message…"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          disabled={sendingMessage || uploading}
          className="flex-1 bg-transparent outline-none text-sm border-0 p-0"
        />
      </div>
      <button
        onClick={handleSend}
        disabled={sendingMessage || uploading}
        className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center border-0 cursor-pointer appearance-none disabled:opacity-60"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );

  // Conversation thread (prototype ChatThread). `withBack` shows the back arrow
  // (single-column: column view + mobile). Full-view keeps the list visible.
  const renderTwThread = (withBack: boolean) => {
    const openedGroup = selectedGroupId
      ? flatGroups.find((g) => g.id === selectedGroupId) ||
        sidebarData?.groups?.find((g) => g.id === selectedGroupId)
      : null;
    const canAddMembers =
      !!selectedGroupId && !!openedGroup && !openedGroup.isDirect;
    const memberCount =
      openedGroup?.memberCount ??
      openedGroup?._count?.members ??
      openedGroup?.members?.length;

    return (
      <div className="h-full flex flex-col bg-background">
        {/* Thread header */}
        <div className="h-16 px-3 flex items-center gap-3 bg-card border-b border-border shrink-0">
          {withBack && (
            <button
              onClick={backToList}
              className="w-9 h-9 rounded-xl hover:bg-secondary flex items-center justify-center bg-transparent border-0 cursor-pointer appearance-none"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0"
            style={{ background: selectedGroupAvatarBg }}
          >
            {selectedGroupName ? (
              <span className="text-sm font-bold">
                {selectedGroupName.charAt(0).toUpperCase()}
              </span>
            ) : (
              <Users className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[15px] truncate">
              {selectedGroupName}
            </div>
            {memberCount != null && (
              <div className="text-[11px] text-muted-foreground">
                {memberCount} member{memberCount === 1 ? "" : "s"}
              </div>
            )}
          </div>
          {canAddMembers && (
            <button
              onClick={openAddMembersModal}
              title="Add members"
              className="w-9 h-9 rounded-xl hover:bg-secondary flex items-center justify-center bg-transparent border-0 cursor-pointer appearance-none"
            >
              <UserPlus className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar bg-background">
          {loadingMessages ? (
            <div className="flex justify-center py-6">
              <Spin size="small" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((msg) => twMsg(msg))
          )}
          <div ref={messagesEndRef} />
        </div>
        {renderTwInputBar()}
      </div>
    );
  };

  // Column header (Chat title + new-group / full-view / close)
  const renderTwColumnHeader = () => (
    <div className="h-14 px-4 flex items-center justify-between bg-card border-b border-border shrink-0">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-[18px] h-[18px] text-primary" />
        <span className="text-base font-bold text-foreground">Chat</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            setModalOpen(true);
            fetchCreateGroupMembers();
          }}
          title="New group"
          className="w-9 h-9 rounded-xl bg-secondary text-primary flex items-center justify-center border-0 cursor-pointer appearance-none hover:bg-primary-tint"
        >
          <Plus className="w-[18px] h-[18px]" />
        </button>
        <button
          onClick={onFullView}
          title={isFullView ? "Collapse" : "Full view"}
          className="w-9 h-9 rounded-xl bg-secondary text-muted-foreground flex items-center justify-center border-0 cursor-pointer appearance-none hover:bg-primary-tint"
        >
          {isFullView ? (
            <Minimize2 className="w-[18px] h-[18px]" />
          ) : (
            <Maximize2 className="w-[18px] h-[18px]" />
          )}
        </button>
        <button
          onClick={onClose}
          title="Close chat"
          className="w-9 h-9 rounded-xl bg-secondary text-muted-foreground flex items-center justify-center border-0 cursor-pointer appearance-none hover:bg-primary-tint"
        >
          <X className="w-[18px] h-[18px]" />
        </button>
      </div>
    </div>
  );

  // ---- RENDER: Create group modal (new_design ModalShell, prototype 1723–1757) ----
  const renderCreateModal = () => {
    const closeCreate = () => {
      setModalOpen(false);
      setCreateGroupName("");
      setCreateSelectedMemberIds(new Set());
    };
    const toggle = (id: string) => {
      const next = new Set(createSelectedMemberIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setCreateSelectedMemberIds(next);
    };
    return (
      <ModalShell open={modalOpen} onClose={closeCreate}>
        <ModalHeader title="Create Group" close={closeCreate} />
        <div className="px-5 pb-5 space-y-4">
          <Field label="Group Name" required>
            <FieldInput
              placeholder="e.g. Launch War Room"
              icon={<Hash className="w-4 h-4" />}
              autoFocus
              value={createGroupName}
              onChange={(e) => setCreateGroupName(e.target.value)}
            />
          </Field>
          <div>
            <label className="text-xs font-semibold">Add members</label>
            <div className="mt-1.5 rounded-xl border border-border overflow-hidden max-h-64 overflow-y-auto">
              {createGroupMembers.length === 0 ? (
                <div className="p-5 text-center text-sm text-muted-foreground">
                  No team members found.
                </div>
              ) : (
                createGroupMembers.map((tg) => (
                  <div key={tg.teamId}>
                    <div className="px-3 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Users className="w-3 h-3" /> {tg.teamName}
                    </div>
                    {tg.members.map((m) => {
                      const picked = createSelectedMemberIds.has(m.userId);
                      return (
                        <button
                          key={m.userId}
                          type="button"
                          onClick={() => toggle(m.userId)}
                          className="appearance-none cursor-pointer outline-none border-0 bg-transparent w-full flex items-center gap-3 p-3 hover:bg-secondary text-left"
                        >
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ background: hashColor(m.name) }}
                          >
                            {(m.name || m.email || "?").charAt(0).toUpperCase()}
                          </div>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-semibold truncate">
                              {m.name}
                            </span>
                            <span className="block text-[11px] text-muted-foreground truncate">
                              {m.email}
                            </span>
                          </span>
                          <span
                            className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${
                              picked
                                ? "bg-primary border-primary"
                                : "border-border"
                            }`}
                          >
                            {picked && (
                              <Check className="w-3.5 h-3.5 text-white" />
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1.5">
              {createSelectedMemberIds.size} selected
            </div>
          </div>
        </div>
        <ModalFooter
          close={closeCreate}
          primary={handleCreateGroup}
          primaryLabel="Create Group"
          loading={creating}
        />
      </ModalShell>
    );
  };

  // ---- RENDER: Add Members modal (new_design ModalShell, prototype 1759–1771) ----
  const renderAddMembersModal = () => {
    const closeAdd = () => {
      setAddMembersOpen(false);
      setAddMembersSelected(new Set());
    };
    const toggle = (id: string) => {
      const next = new Set(addMembersSelected);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setAddMembersSelected(next);
    };
    return (
      <ModalShell open={addMembersOpen} onClose={closeAdd}>
        <ModalHeader
          title={`Add Users to ${selectedGroupName || "Group"}`}
          close={closeAdd}
        />
        <div className="px-5 pb-5 space-y-2">
          <label className="text-xs font-semibold">Select members</label>
          <div className="rounded-xl border border-border overflow-hidden max-h-80 overflow-y-auto">
            {addMembersLoading ? (
              <div className="flex justify-center p-6">
                <Spin size="small" />
              </div>
            ) : addMembersGroups.length === 0 ? (
              <div className="p-5 text-center text-sm text-muted-foreground">
                No additional team members available to add.
              </div>
            ) : (
              addMembersGroups.map((tg) => (
                <div key={tg.teamId}>
                  <div className="px-3 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Users className="w-3 h-3" /> {tg.teamName}
                  </div>
                  {tg.members.map((m) => {
                    const picked = addMembersSelected.has(m.userId);
                    return (
                      <button
                        key={m.userId}
                        type="button"
                        onClick={() => toggle(m.userId)}
                        className="appearance-none cursor-pointer outline-none border-0 bg-transparent w-full flex items-center gap-3 p-3 hover:bg-secondary text-left"
                      >
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ background: hashColor(m.name) }}
                        >
                          {(m.name || m.email || "?").charAt(0).toUpperCase()}
                        </div>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold truncate">
                            {m.name}
                          </span>
                          <span className="block text-[11px] text-muted-foreground truncate">
                            {m.email}
                          </span>
                        </span>
                        <span
                          className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${
                            picked
                              ? "bg-primary border-primary"
                              : "border-border"
                          }`}
                        >
                          {picked && (
                            <Check className="w-3.5 h-3.5 text-white" />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
          <div className="text-[11px] text-muted-foreground">
            New members will see prior messages once they join.
          </div>
        </div>
        <ModalFooter
          close={closeAdd}
          primary={handleAddMembers}
          primaryLabel="Add"
          loading={addingMembers}
          disabled={addMembersSelected.size === 0}
        />
      </ModalShell>
    );
  };

  // ===============================================================
  // FULL VIEW: Two-column layout (list left + thread right)
  // ===============================================================
  if (isFullView) {
    return (
      <>
        <div className="tw right-chat-column w-full h-full bg-card border-l border-border flex flex-col overflow-hidden">
          {renderTwColumnHeader()}
          <div className="flex flex-1 overflow-hidden">
            {/* LEFT: conversation list */}
            <div className="w-[320px] min-w-[320px] border-r border-border flex flex-col overflow-hidden bg-card">
              <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
                {loadingSidebar ? (
                  <div className="flex justify-center py-6">
                    <Spin size="small" />
                  </div>
                ) : (
                  renderTwListInner()
                )}
              </div>
            </div>
            {/* RIGHT: thread */}
            <div className="flex-1 flex flex-col overflow-hidden bg-background">
              {!selectedGroupId ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-secondary flex items-center justify-center mb-3">
                      <MessageSquare className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <div className="text-sm font-semibold text-foreground">
                      Select a conversation
                    </div>
                    <div className="text-xs mt-1">
                      Choose from your chats on the left
                    </div>
                  </div>
                </div>
              ) : (
                renderTwThread(false)
              )}
            </div>
          </div>
        </div>
        {renderCreateModal()}
        {renderAddMembersModal()}
      </>
    );
  }

  // ===============================================================
  // COLUMN / MOBILE — single column (parent sets 430px or full width)
  // ===============================================================

  // LIST VIEW
  if (view === "list") {
    return (
      <>
        <div className="tw right-chat-column w-full h-full bg-background flex flex-col overflow-hidden border-l border-border">
          {renderTwColumnHeader()}
          <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
            {loadingSidebar ? (
              <div className="flex justify-center py-6">
                <Spin size="small" />
              </div>
            ) : (
              renderTwListInner()
            )}
          </div>
        </div>
        {renderCreateModal()}
      </>
    );
  }

  // MESSAGE VIEW
  return (
    <div className="tw right-chat-column w-full h-full flex flex-col overflow-hidden border-l border-border bg-background">
      {renderTwThread(true)}
      {renderCreateModal()}
      {renderAddMembersModal()}
    </div>
  );
}
