"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { Badge, Spin, Button, message } from "antd";
import { confirmDialog } from "@/components/common/ConfirmDialog";
import { toast } from "sonner";
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
  Smile,
  Pencil,
} from "lucide-react";
import api from "@/lib/axios";
import { upload } from "@/lib/axios";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { useAuth } from "@/hooks/useAuth";
import { useAppContext } from "@/context/AppContext";
import { usePro } from "@/hooks/usePro";
import { useSocket } from "@/hooks/useSocket";
import { usePresence } from "@/hooks/usePresence";

const PRIMARY = "#3CB371";
const TEXT = "#1A1A2E";
const TEXT_SECONDARY = "#8C8C8C";
const BORDER = "#F0F0F0";
const TEAM_AVATAR_BG = "#7C3AED";
const CONTACT_AVATAR_BG = "#3B82F6";
const INPUT_BG = "#F8F9FA";
const COLUMN_WIDTH = 430;
const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

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
  // Subtitles a DM in the thread header — a member count is meaningless for a
  // two-person conversation.
  otherUserEmail?: string | null;
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
  // Owner/admin-only group creation (CSV-51): false in a joined-team workspace
  // where the caller is a plain member — the "+ Create Group" button is hidden
  // (the backend enforces it regardless). Undefined/true → button shown.
  canCreateGroups?: boolean;
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
  linkPreview?: {
    url?: string;
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
  } | null;
  _status?: "sending" | "sent" | "failed";
  _tempId?: string;
  editedAt?: string;
  deletedAt?: string;
  reactions?: Array<{ emoji: string; userId: string }>;
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

// Bug-059: plain chat text was never auto-linkified — any pasted URL just
// sat there as inert text. Split on URLs and wrap each match in a real
// anchor (target=_blank) while leaving the surrounding text untouched.
const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;
function linkifyText(text: string): React.ReactNode[] {
  // One capturing group means String.split() interleaves the matched URLs
  // at odd indices — no need to re-run the (stateful, global-flag) regex.
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        style={{ color: "inherit", textDecoration: "underline" }}
      >
        {part}
      </a>
    ) : (
      part
    ),
  );
}

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
  } = useUnreadCount(currentApp === "pro" ? "pro" : "team");
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
  // B45: image lightbox target (null = closed)
  const [imagePreview, setImagePreview] = useState<{
    url: string;
    name: string;
    msg: ChatMessage;
    own: boolean;
  } | null>(null);
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

  // Typing indicator
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Read receipts: messageId -> userIds who have read it
  const [readReceipts, setReadReceipts] = useState<Map<string, string[]>>(
    new Map(),
  );
  // Mirror of `messages` so socket handlers read the latest without
  // re-subscribing on every message.
  const messagesRef = useRef<ChatMessage[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Stable ref to fetchSidebar so socket handlers can call it without being
  // listed as a dependency — prevents all socket listeners from detaching and
  // re-attaching every time the workspace context changes.
  const fetchSidebarRef = useRef<() => void>(() => {});

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  // Which message's action bar (react / edit / delete) is open. Tap-driven so
  // it works on touch devices (the old hover-only reveal was invisible on
  // mobile and easy to miss on desktop).
  const [activeMsgId, setActiveMsgId] = useState<string | null>(null);

  // Reactions: messageId -> { emoji -> userIds[] }
  const [reactions, setReactions] = useState<
    Map<string, Record<string, string[]>>
  >(new Map());

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

  // Keep the ref in sync so socket handlers always call the latest version
  // without needing fetchSidebar in their dependency arrays.
  useEffect(() => {
    fetchSidebarRef.current = fetchSidebar;
  }, [fetchSidebar]);

  useEffect(() => {
    fetchSidebar();
    // Poll every 60 s as a fallback for missed socket events (group renames,
    // members added by others, etc.). Real-time updates come via Socket.IO so
    // the interval is a safety net, not the primary path — 60 s is enough.
    const interval = setInterval(fetchSidebar, 60000);
    return () => clearInterval(interval);
    // Re-fetch when the workspace context flips (personal ↔ team A ↔ team B).
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
      // B15: seed the reactions map from the persisted reactions now returned
      // by getMessages, so existing reactions render on load/refresh (not only
      // via the live socket echo).
      const seeded = new Map<string, Record<string, string[]>>();
      for (const m of newMessages) {
        if (Array.isArray(m.reactions) && m.reactions.length) {
          const byEmoji: Record<string, string[]> = {};
          for (const r of m.reactions) {
            (byEmoji[r.emoji] = byEmoji[r.emoji] || []).push(r.userId);
          }
          seeded.set(m.id, byEmoji);
        }
      }
      setReactions(seeded);
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

  // NOTE: no message polling — Socket.IO delivers new messages in real time
  // via the "message:new" event. A setInterval here caused the entire message
  // list to re-render every 5 s (full array replacement) and was the primary
  // source of the visible UI flickering while a conversation was open.

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
        // A delivered message means that sender is no longer typing.
        const senderId =
          data.senderId || data.userId || data.user?.id || data.sender?.id;
        if (senderId) {
          setTypingUsers((prev) => {
            if (!prev.has(senderId)) return prev;
            const n = new Set(prev);
            n.delete(senderId);
            return n;
          });
          const t = typingTimeouts.current.get(senderId);
          if (t) clearTimeout(t);
          typingTimeouts.current.delete(senderId);
        }
      }
      // Update the sidebar last-message preview inline — no HTTP round-trip.
      // A full fetchSidebar() here caused one API request per received message,
      // making the sidebar re-render on every chat event (the main flicker source).
      if (msgGroupId) {
        const lastMsg = {
          message: data.message,
          createdAt: data.createdAt,
          type: data.type,
        };
        setSidebarData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            teams: prev.teams.map((t) =>
              t.conversationId === msgGroupId
                ? { ...t, lastMessage: lastMsg }
                : t,
            ),
            groups: prev.groups.map((g) =>
              g.id === msgGroupId ? { ...g, lastMessage: lastMsg } : g,
            ),
            contacts: prev.contacts.map((c) =>
              c.conversationId === msgGroupId
                ? { ...c, lastMessage: lastMsg }
                : c,
            ),
            allGroups: prev.allGroups.map((g) =>
              g.id === msgGroupId ? { ...g, lastMessage: lastMsg } : g,
            ),
          };
        });
      }
      refetchUnread();
    };

    const onTypingStart = ({
      groupId,
      userId,
    }: {
      groupId: string;
      userId: string;
    }) => {
      if (groupId !== selectedGroupIdRef.current) return;
      setTypingUsers((prev) => new Set(prev).add(userId));
      // Safety timeout — clear if no typing:stop / message arrives.
      const existing = typingTimeouts.current.get(userId);
      if (existing) clearTimeout(existing);
      typingTimeouts.current.set(
        userId,
        setTimeout(() => {
          setTypingUsers((prev) => {
            const n = new Set(prev);
            n.delete(userId);
            return n;
          });
          typingTimeouts.current.delete(userId);
        }, 5000),
      );
    };

    const onTypingStop = ({
      groupId,
      userId,
    }: {
      groupId: string;
      userId: string;
    }) => {
      if (groupId !== selectedGroupIdRef.current) return;
      setTypingUsers((prev) => {
        const n = new Set(prev);
        n.delete(userId);
        return n;
      });
      const t = typingTimeouts.current.get(userId);
      if (t) clearTimeout(t);
      typingTimeouts.current.delete(userId);
    };

    const onGroupDeleted = (data: { groupId: string }) => {
      if (selectedGroupIdRef.current === data.groupId) {
        backToList();
      }
      fetchSidebarRef.current();
    };

    // Link previews are resolved server-side after the message is stored and
    // pushed out on this event. Merge the preview into the matching message.
    const onLinkPreview = (data: {
      messageId: string;
      linkPreview: ChatMessage["linkPreview"];
    }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId ? { ...m, linkPreview: data.linkPreview } : m,
        ),
      );
    };

    const onMessageRead = ({
      groupId,
      userId,
    }: {
      groupId: string;
      userId: string;
    }) => {
      if (groupId !== selectedGroupIdRef.current) return;
      // Mark the latest message as read by this user.
      const msgs = messagesRef.current;
      if (msgs.length === 0) return;
      const lastId = msgs[msgs.length - 1].id;
      setReadReceipts((prev) => {
        const map = new Map(prev);
        const readers = map.get(lastId) || [];
        if (!readers.includes(userId)) {
          map.set(lastId, [...readers, userId]);
        }
        return map;
      });
    };

    const onMessageEdited = ({
      messageId,
      content,
      editedAt,
    }: {
      messageId: string;
      content: string;
      editedAt?: string;
    }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, message: content, editedAt } : m,
        ),
      );
    };

    const onMessageDeleted = ({ messageId }: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                message: "This message was deleted",
                deletedAt: new Date().toISOString(),
              }
            : m,
        ),
      );
    };

    const onReaction = ({
      messageId,
      emoji,
      userId,
      action,
    }: {
      messageId: string;
      emoji: string;
      userId: string;
      action: "add" | "remove";
    }) => {
      setReactions((prev) => {
        const map = new Map(prev);
        const forMsg = { ...(map.get(messageId) || {}) };
        const users = forMsg[emoji] ? [...forMsg[emoji]] : [];
        if (action === "add") {
          if (!users.includes(userId)) users.push(userId);
        } else {
          const idx = users.indexOf(userId);
          if (idx !== -1) users.splice(idx, 1);
        }
        if (users.length > 0) forMsg[emoji] = users;
        else delete forMsg[emoji];
        map.set(messageId, forMsg);
        return map;
      });
    };

    // Refresh sidebar when added to a new group by someone else
    const onGroupCreated = () => {
      fetchSidebarRef.current();
    };

    socket.on("message:new", onNewMessage);
    socket.on("group:deleted", onGroupDeleted);
    socket.on("group:created", onGroupCreated);
    socket.on("message:link-preview", onLinkPreview);
    socket.on("typing:start", onTypingStart);
    socket.on("typing:stop", onTypingStop);
    socket.on("message:read", onMessageRead);
    socket.on("message:edited", onMessageEdited);
    socket.on("message:deleted", onMessageDeleted);
    socket.on("message:reaction", onReaction);

    return () => {
      socket.off("message:new", onNewMessage);
      socket.off("group:deleted", onGroupDeleted);
      socket.off("group:created", onGroupCreated);
      socket.off("message:link-preview", onLinkPreview);
      socket.off("typing:start", onTypingStart);
      socket.off("typing:stop", onTypingStop);
      socket.off("message:read", onMessageRead);
      socket.off("message:edited", onMessageEdited);
      socket.off("message:deleted", onMessageDeleted);
      socket.off("message:reaction", onReaction);
    };
    // fetchSidebar intentionally omitted — accessed via fetchSidebarRef so the
    // socket listeners don't detach/re-attach on every workspace context change.
  }, [socket, refetchUnread]);

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
    // B39/B43/B46: ensure the socket is in this conversation's room so live
    // messages/reactions/images arrive without a refresh. The socket only
    // auto-joins rooms at connect, so a group opened/created afterwards needs
    // an explicit join here.
    socket?.emit("chat:join-group", { groupId });
  };

  const backToList = () => {
    setView("list");
    setSelectedGroupId(null);
    setMessages([]);
    setMessageInput("");
    setActiveMsgId(null);
  };

  const handleSend = async () => {
    if (!messageInput.trim() || !selectedGroupId) return;
    const text = messageInput.trim();
    setMessageInput("");
    setSendingMessage(true);

    // Stop the typing indicator the moment a message is sent.
    if (socket && selectedGroupId) {
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
      socket.emit("typing:stop", { groupId: selectedGroupId });
    }

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
      // No fetchSidebar() — the socket "message:new" event updates the sidebar
      // last-message preview inline, avoiding a redundant HTTP request here.
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m._tempId === tempId ? { ...m, _status: "failed" } : m,
        ),
      );
      toast.error("Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  const startEdit = (msg: ChatMessage) => {
    setEditingId(msg.id);
    setEditingText(msg.message || msg.content || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  const saveEdit = async (msg: ChatMessage) => {
    const content = editingText.trim();
    if (!content) return;
    if (content === (msg.message || msg.content || "")) {
      cancelEdit();
      return;
    }
    try {
      const res = await api.put(`/chat/messages/${msg.id}`, { content });
      const updated = res.data?.data;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id
            ? { ...m, message: content, editedAt: updated?.editedAt }
            : m,
        ),
      );
    } catch {
      toast.error("Failed to edit message");
    } finally {
      cancelEdit();
    }
  };

  const handleDeleteMessage = async (msg: ChatMessage) => {
    try {
      await api.delete(`/chat/messages/${msg.id}`);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id
            ? {
                ...m,
                message: "This message was deleted",
                deletedAt: new Date().toISOString(),
              }
            : m,
        ),
      );
    } catch {
      toast.error("Failed to delete message");
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    // The server emits message:reaction to the whole room (incl. sender),
    // so state updates arrive via the socket listener.
    try {
      await api.post(`/chat/messages/${messageId}/reactions`, { emoji });
    } catch {
      toast.error("Failed to react");
    }
  };

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedGroupId) return;
    e.target.value = "";

    if (file.size > 25 * 1024 * 1024) {
      toast.error("File exceeds 25MB limit");
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
        // Message was created server-side; socket "message:new" will append it.
        // fetchMessages would replace the whole list — avoid it.
      } else if (data?.url) {
        // File uploaded, create message manually; socket handles the update.
        const fileType = file.type.startsWith("image/") ? "image" : "docs";
        await api.post(`/chat/groups/${selectedGroupId}/messages`, {
          message: file.name,
          type: fileType,
          attachPath: data.url,
        });
      }
      // No fetchSidebar() — socket "message:new" updates sidebar inline.
    } catch {
      toast.error(`Failed to upload ${file.name}`);
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
      toast.error("Failed to create team chat");
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
      toast.error("Failed to start conversation");
    } finally {
      setCreating(false);
    }
  };

  // Delete group
  const handleDeleteGroup = async (groupId: string) => {
    try {
      await api.delete(`/chat/groups/${groupId}`);
      toast.success("Group deleted");
      if (selectedGroupId === groupId) backToList();
      fetchSidebar();
    } catch {
      toast.error("Failed to delete group");
    }
  };

  // Leave group
  const handleLeaveGroup = async (groupId: string) => {
    try {
      await api.post(`/chat/groups/${groupId}/leave`);
      toast.success("Left group");
      if (selectedGroupId === groupId) backToList();
      fetchSidebar();
    } catch {
      toast.error("Failed to leave group");
    }
  };

  // Create group
  const handleCreateGroup = async () => {
    const name = createGroupName.trim();
    if (!name) {
      toast.error("Please enter a group name");
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
      toast.success("Group created");
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
        toast.error(apiMsg);
      } else {
        toast.error("Failed to create group");
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
      toast.error(apiMsg || "Failed to load available members");
      setAddMembersOpen(false);
    } finally {
      setAddMembersLoading(false);
    }
  };

  const handleAddMembers = async () => {
    if (!selectedGroupId) return;
    const userIds = Array.from(addMembersSelected);
    if (userIds.length === 0) {
      toast.warning("Select at least one member");
      return;
    }
    setAddingMembers(true);
    try {
      const res = await api.post(
        `/chat/groups/${selectedGroupId}/members/batch`,
        { userIds },
      );
      const data = res.data?.data;
      toast.success(
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
      toast.error(apiMsg || "Failed to add members");
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

  // Presence: subscribe to online status for all contacts so the list shows
  // live green dots. Keyed on the stable set of contact user-ids.
  const contactUserIds = useMemo(
    () => (sidebarData?.contacts || []).map((c) => c.id),
    [sidebarData?.contacts],
  );
  const { isOnline } = usePresence(contactUserIds);

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

  // B45: clicking a chat image used to `window.open` it — with the backend now
  // serving images `inline` that shows a bare image in a new tab, with no way
  // to download or delete it ("image action options missing"). Open a proper
  // lightbox instead, with Open / Download / Delete (own messages only).
  const openImagePreview = (
    url: string,
    name: string,
    msg: ChatMessage,
    own: boolean,
  ) => setImagePreview({ url, name, msg, own });

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
          <img
            src={imgSrc}
            alt={msgText || "Image"}
            style={{
              maxWidth: "100%",
              maxHeight: 200,
              borderRadius: 8,
              cursor: "pointer",
              display: "block",
            }}
            onClick={() =>
              openImagePreview(imgSrc, msgText || "Image", msg, own)
            }
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='60'%3E%3Crect fill='%23f0f0f0' width='100' height='60'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='10'%3EImage%3C/text%3E%3C/svg%3E";
            }}
          />
        </div>
      );
    }

    // Files attached
    if (files.length > 0) {
      return (
        <div>
          {msgType === "text" && msgText && (
            <div style={{ marginBottom: 4 }}>{linkifyText(msgText)}</div>
          )}
          {files.map((file) => {
            const isImage =
              file.fileType?.startsWith("image/") ||
              /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.fileName || "");
            const fileUrl = buildFileUrl(file);

            if (isImage) {
              return (
                <div key={file.id} style={{ marginTop: 4 }}>
                  <img
                    src={fileUrl}
                    alt={file.fileName || "Image"}
                    style={{
                      maxWidth: "100%",
                      maxHeight: 200,
                      borderRadius: 8,
                      cursor: "pointer",
                      display: "block",
                    }}
                    onClick={() =>
                      openImagePreview(
                        fileUrl,
                        file.fileName || "Image",
                        msg,
                        own,
                      )
                    }
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='60'%3E%3Crect fill='%23f0f0f0' width='100' height='60'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='10'%3EImage%3C/text%3E%3C/svg%3E";
                    }}
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

    // Plain text — linkify any URLs so they're clickable / open in a new tab.
    return <div>{linkifyText(msgText)}</div>;
  };

  // ===============================================================
  // UNIFIED .tw RENDERERS (new_design prototype — both breakpoints)
  // ===============================================================

  const TABS_DEF: Array<{ id: "team" | "group" | "direct"; label: string }> = [
    { id: "team", label: "Teams" },
    { id: "group", label: "Group" },
    { id: "direct", label: "Personal" },
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
        className="flex-1 min-w-0 bg-transparent outline-none text-sm border-0 p-0"
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
            <button
              title="Leave group"
              className="w-8 h-8 rounded-lg border-0 cursor-pointer flex items-center justify-center appearance-none"
              style={{ background: "#eff6ff", color: "#006AA8" }}
              onClick={() =>
                confirmDialog({
                  title: "Leave this group?",
                  confirmLabel: "Leave",
                  onConfirm: opts.onLeave,
                })
              }
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
          {opts.onDelete && (
            <button
              title="Delete group"
              className="w-8 h-8 rounded-lg border-0 cursor-pointer flex items-center justify-center appearance-none"
              style={{ background: "#fef2f2", color: "#F85729" }}
              onClick={() =>
                confirmDialog({
                  title: "Delete this group?",
                  confirmLabel: "Delete",
                  danger: true,
                  onConfirm: opts.onDelete,
                })
              }
            >
              <Trash2 className="w-4 h-4" />
            </button>
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
              online: isOnline(contact.id),
              onClick: () => handleContactChatOpen(contact),
            });
          })
        );
    }

    return (
      <div className="px-4 pt-3">
        {twSearch()}
        {twTabs()}
        {tab === "group" && sidebarData?.canCreateGroups !== false && (
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

  // Link preview card (rendered under a message bubble when resolved)
  const twLinkPreview = (msg: ChatMessage) => {
    const lp = msg.linkPreview;
    if (!lp || (!lp.title && !lp.description && !lp.image)) return null;
    return (
      <a
        href={lp.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 block max-w-[80%] overflow-hidden rounded-2xl border border-border bg-card no-underline"
      >
        {lp.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={lp.image}
            alt={lp.title || "link preview"}
            className="max-h-40 w-full object-cover"
          />
        )}
        <div className="p-3">
          {lp.title && (
            <div className="truncate text-[13px] font-semibold text-foreground">
              {lp.title}
            </div>
          )}
          {lp.description && (
            <div className="mt-0.5 truncate text-[12px] text-muted-foreground">
              {lp.description}
            </div>
          )}
          <div className="mt-1 truncate text-[11px] text-primary">
            {lp.siteName || lp.url}
          </div>
        </div>
      </a>
    );
  };

  // Always-visible trigger that opens a message's action bar on tap/click.
  const twActionTrigger = (msg: ChatMessage) => {
    const open = activeMsgId === msg.id;
    return (
      <button
        onClick={() => setActiveMsgId(open ? null : msg.id)}
        title="React / message actions"
        aria-label="Message actions"
        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-transparent border-0 cursor-pointer transition-colors ${
          open
            ? "text-primary bg-secondary"
            : "text-muted-foreground hover:text-primary hover:bg-secondary"
        }`}
      >
        <Smile className="w-4 h-4" />
      </button>
    );
  };

  // Expandable action bar (emoji reactions + edit/delete). Rendered as its own
  // wrapping row below the bubble so it never overflows on narrow screens.
  const twActionBar = (
    msg: ChatMessage,
    canModify: boolean,
    align: "start" | "end",
  ) => {
    if (activeMsgId !== msg.id) return null;
    return (
      <div
        className={`flex flex-wrap items-center gap-1 mt-1 ${
          align === "end" ? "justify-end mr-1" : "ml-1"
        }`}
      >
        {REACTION_EMOJIS.map((e) => (
          <button
            key={e}
            onClick={() => {
              toggleReaction(msg.id, e);
              setActiveMsgId(null);
            }}
            title={`React ${e}`}
            className="text-base leading-none px-1 py-0.5 rounded-full hover:bg-secondary bg-transparent border-0 cursor-pointer hover:scale-110 transition-transform"
          >
            {e}
          </button>
        ))}
        {canModify && (
          <>
            <button
              onClick={() => {
                startEdit(msg);
                setActiveMsgId(null);
              }}
              title="Edit"
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary bg-secondary rounded-full px-2 py-0.5 border-0 cursor-pointer"
            >
              <Pencil className="w-3 h-3" /> Edit
            </button>
            <button
              title="Delete"
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-red-500 bg-secondary rounded-full px-2 py-0.5 border-0 cursor-pointer"
              onClick={() =>
                confirmDialog({
                  title: "Delete this message?",
                  confirmLabel: "Delete",
                  danger: true,
                  onConfirm: () => {
                    handleDeleteMessage(msg);
                    setActiveMsgId(null);
                  },
                })
              }
            >
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          </>
        )}
      </div>
    );
  };

  // Reaction count chips shown under a message
  const twReactionChips = (msg: ChatMessage, align: "start" | "end") => {
    const r = reactions.get(msg.id);
    if (!r) return null;
    const entries = Object.entries(r).filter(([, u]) => u.length > 0);
    if (entries.length === 0) return null;
    return (
      <div
        className={`flex flex-wrap gap-1 mt-1 ${
          align === "end" ? "justify-end mr-1" : "ml-1"
        }`}
      >
        {entries.map(([emoji, users]) => {
          const mine = user?.id ? users.includes(user.id) : false;
          return (
            <button
              key={emoji}
              onClick={() => toggleReaction(msg.id, emoji)}
              className={`text-[11px] px-1.5 py-0.5 rounded-full border cursor-pointer ${
                mine
                  ? "bg-primary-tint border-primary text-primary-deep"
                  : "bg-secondary border-border text-muted-foreground"
              }`}
            >
              {emoji} {users.length}
            </button>
          );
        })}
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
      const isDeleted = !!msg.deletedAt;
      const canModify =
        !isDeleted &&
        msg._status !== "sending" &&
        msg._status !== "failed" &&
        (msg.type || "text") === "text" &&
        !(msg.files && msg.files.length > 0);

      // Inline edit mode
      if (editingId === msg.id) {
        return (
          <div key={msg.id} className="flex flex-col items-end">
            <div className="max-w-[78%] w-full flex flex-col gap-2 bg-card border border-border px-3 py-2 rounded-2xl">
              <input
                autoFocus
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveEdit(msg);
                  if (e.key === "Escape") cancelEdit();
                }}
                className="bg-transparent outline-none text-sm border-0 p-0 text-foreground"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={cancelEdit}
                  className="text-[11px] text-muted-foreground bg-transparent border-0 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => saveEdit(msg)}
                  className="text-[11px] text-primary font-semibold bg-transparent border-0 cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div key={msg.id} className="flex flex-col items-end">
          <div className="flex items-center gap-1">
            {!isDeleted && twActionTrigger(msg)}
            <div
              className={`min-w-0 max-w-[78%] px-4 py-3 rounded-2xl rounded-br-md text-[14px] leading-snug break-all [overflow-wrap:anywhere] ${
                isDeleted
                  ? "bg-secondary text-muted-foreground italic"
                  : "bg-primary text-white"
              }`}
            >
              {isDeleted
                ? "This message was deleted"
                : renderMessageContent(msg, true)}
            </div>
          </div>
          {!isDeleted && twActionBar(msg, canModify, "end")}
          {twLinkPreview(msg)}
          {twReactionChips(msg, "end")}
          <div className="text-[10px] text-muted-foreground mt-1 mr-1">
            {time}
            {msg.editedAt && !isDeleted && " (edited)"}
            {msg._status === "sending" && " ⏳"}
            {msg._status === "failed" && " ❌"}
          </div>
          {(readReceipts.get(msg.id)?.length ?? 0) > 0 && (
            <span className="text-[10px] text-muted-foreground mr-1">
              ✓✓ Seen
            </span>
          )}
        </div>
      );
    }
    const who = getSenderName(msg);
    const otherDeleted = !!msg.deletedAt;
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
            <div className="flex items-center gap-1">
              <div
                className={`min-w-0 max-w-[80%] border border-border px-4 py-3 rounded-2xl rounded-tl-md text-[14px] leading-snug break-all [overflow-wrap:anywhere] ${
                  otherDeleted
                    ? "bg-secondary text-muted-foreground italic"
                    : "bg-card text-foreground"
                }`}
              >
                {otherDeleted
                  ? "This message was deleted"
                  : renderMessageContent(msg, false)}
              </div>
              {!otherDeleted && twActionTrigger(msg)}
            </div>
            {!otherDeleted && twActionBar(msg, false, "start")}
            {twLinkPreview(msg)}
            {twReactionChips(msg, "start")}
            <div className="text-[10px] text-muted-foreground mt-1 ml-1">
              {time}
              {msg.editedAt && !otherDeleted && " (edited)"}
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
          onChange={(e) => {
            setMessageInput(e.target.value);
            if (socket && selectedGroupId) {
              socket.emit("typing:start", { groupId: selectedGroupId });
              if (typingDebounceRef.current)
                clearTimeout(typingDebounceRef.current);
              typingDebounceRef.current = setTimeout(() => {
                socket.emit("typing:stop", { groupId: selectedGroupId });
              }, 2500);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          disabled={sendingMessage || uploading}
          className="flex-1 min-w-0 bg-transparent outline-none text-sm border-0 p-0"
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
    // A DM is a conversation with ONE person, so it is subtitled with their
    // email — never a member count. The backend counts both participants, so
    // an unconditional count rendered "2 members" on every direct message,
    // which reads as a group. `isDirect` is already computed server-side (it
    // drives the avatar, the title and the add-members button); the header was
    // the one place that ignored it.
    const isDirectThread = !!openedGroup?.isDirect;
    const memberCount = isDirectThread
      ? null
      : (openedGroup?.memberCount ??
        openedGroup?._count?.members ??
        openedGroup?.members?.length);
    const directSubtitle = isDirectThread
      ? openedGroup?.otherUserEmail ||
        openedGroup?.members?.find((m) => m.id === openedGroup?.otherUserId)
          ?.email ||
        null
      : null;

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
            {directSubtitle ? (
              <div className="text-[11px] text-muted-foreground truncate">
                {directSubtitle}
              </div>
            ) : (
              memberCount != null && (
                <div className="text-[11px] text-muted-foreground">
                  {memberCount} member{memberCount === 1 ? "" : "s"}
                </div>
              )
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
          {typingUsers.size > 0 && (
            <div className="px-1 py-1 text-xs text-muted-foreground italic">
              {typingUsers.size === 1
                ? "Someone is typing…"
                : `${typingUsers.size} people are typing…`}
            </div>
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

  // ---- RENDER: B45 image lightbox (open / download / delete) ----
  const renderImagePreview = () => {
    if (!imagePreview) return null;
    const { url, name, msg, own } = imagePreview;
    const close = () => setImagePreview(null);
    const btn: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "8px 14px",
      borderRadius: 10,
      border: "none",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600,
      background: "rgba(255,255,255,0.14)",
      color: "#fff",
    };
    return (
      <div
        onClick={close}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.82)",
          zIndex: 3000,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 24,
        }}
      >
        <div
          style={{
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            maxWidth: "80vw",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={name}
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: "90vw",
            maxHeight: "72vh",
            objectFit: "contain",
            borderRadius: 10,
            background: "#fff",
          }}
        />
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
        >
          <button style={btn} onClick={() => window.open(url, "_blank")}>
            Open in new tab
          </button>
          {/* ?download=1 makes the backend send Content-Disposition: attachment
              (images are served inline by default since B45). */}
          <a
            href={`${url}${url.includes("?") ? "&" : "?"}download=1`}
            download={name}
            style={{ ...btn, textDecoration: "none" }}
          >
            Download
          </a>
          {own && (
            <button
              style={{ ...btn, background: "rgba(239,68,68,0.85)" }}
              onClick={async () => {
                await handleDeleteMessage(msg);
                close();
              }}
            >
              Delete
            </button>
          )}
          <button style={btn} onClick={close}>
            Close
          </button>
        </div>
      </div>
    );
  };

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
                // Flat deduplicated user list — no team grouping headers
                (() => {
                  const seen = new Set<string>();
                  const flatUsers = createGroupMembers
                    .flatMap((tg) => tg.members)
                    .filter((m) => {
                      if (seen.has(m.userId)) return false;
                      seen.add(m.userId);
                      return true;
                    });
                  return flatUsers.map((m) => {
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
                  });
                })()
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
              // Flat deduplicated user list — no team grouping headers
              (() => {
                const seen = new Set<string>();
                const flatUsers = addMembersGroups
                  .flatMap((tg) => tg.members)
                  .filter((m) => {
                    if (seen.has(m.userId)) return false;
                    seen.add(m.userId);
                    return true;
                  });
                return flatUsers.map((m) => {
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
                          picked ? "bg-primary border-primary" : "border-border"
                        }`}
                      >
                        {picked && <Check className="w-3.5 h-3.5 text-white" />}
                      </span>
                    </button>
                  );
                });
              })()
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
        {renderImagePreview()}
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
        {renderImagePreview()}
      </>
    );
  }

  // MESSAGE VIEW
  return (
    <div className="tw right-chat-column w-full h-full flex flex-col overflow-hidden border-l border-border bg-background">
      {renderTwThread(true)}
      {renderCreateModal()}
        {renderImagePreview()}
      {renderAddMembersModal()}
    </div>
  );
}
