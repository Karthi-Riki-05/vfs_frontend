"use client";

import React, { useState, useEffect } from "react";
import { Popover } from "antd";
import {
  Bell,
  Sparkle,
  Gift,
  Megaphone,
  ShieldCheck,
  Globe,
  FileText,
  Workflow,
  Users,
  UserPlus,
  MessageCircle,
  Crown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import api from "@/lib/axios";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl: string | null;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  const weeks = Math.floor(diffDays / 7);
  return `${weeks}w ago`;
}

/* ---- type → icon / colour / kind label (matches new_design Notifications) ---- */
type TypeStyle = { I: LucideIcon; c: string; bg: string; kind: string };

const GREEN = { c: "#34A881", bg: "#E7F6F0" };
const DEEP = { c: "#1F7D5E", bg: "#E7F6F0" };
const ORANGE = { c: "#FF9A30", bg: "#FFF2E2" };
const CORAL = { c: "#F85729", bg: "#FDE7E0" };
const BLUE = { c: "#006AA8", bg: "#E2EEF8" };
const GREY = { c: "#6B7280", bg: "#EEF1F0" };

const TYPE_STYLES: Record<string, TypeStyle> = {
  flow_addon_grace_expired: { I: Crown, ...CORAL, kind: "Flow Pack" },
  flow_addon_payment_failed: { I: AlertTriangle, ...CORAL, kind: "Flow Pack" },
  flow_pack_expired: { I: Crown, ...CORAL, kind: "Flow Pack" },
  flow_pack_grace: { I: Crown, ...CORAL, kind: "Flow Pack" },
  flow_pack_7day: { I: FileText, ...ORANGE, kind: "Flow Pack" },
  flow_pack_3day: { I: FileText, ...ORANGE, kind: "Flow Pack" },
  flow_pack_1day: { I: FileText, ...CORAL, kind: "Flow Pack" },
  flow_picker_required: { I: FileText, ...CORAL, kind: "Action" },
  flows_restored: { I: Workflow, ...GREEN, kind: "Flows" },
  flow_share: { I: Workflow, ...GREEN, kind: "Shared" },
  flow_updated: { I: Workflow, ...GREEN, kind: "Flows" },
  subscription_activated: { I: CheckCircle2, ...GREEN, kind: "Plan" },
  subscription_granted: { I: CheckCircle2, ...GREEN, kind: "Plan" },
  subscription_cancelled: { I: XCircle, ...ORANGE, kind: "Plan" },
  subscription_expired: { I: AlertTriangle, ...CORAL, kind: "Plan" },
  subscription_expiry: { I: AlertTriangle, ...ORANGE, kind: "Plan" },
  subscription_deleted: { I: XCircle, ...CORAL, kind: "Plan" },
  team_invite: { I: UserPlus, ...BLUE, kind: "Invite" },
  team_invite_declined: { I: XCircle, ...ORANGE, kind: "Team" },
  team_member_joined: { I: UserPlus, ...GREEN, kind: "Team" },
  team_member_added: { I: UserPlus, ...GREEN, kind: "Team" },
  team_member_removed: { I: Users, ...ORANGE, kind: "Team" },
  feature: { I: Sparkle, ...ORANGE, kind: "Feature" },
  promotion: { I: Gift, ...GREEN, kind: "Promotion" },
  announcement: { I: Megaphone, ...BLUE, kind: "News" },
  security: { I: ShieldCheck, ...DEEP, kind: "Update" },
  release: { I: Globe, ...CORAL, kind: "Release" },
  system: { I: Bell, ...GREY, kind: "System" },
};

const PREFIX_STYLES: Array<[string, TypeStyle]> = [
  ["flow_addon", { I: FileText, ...ORANGE, kind: "Flow Pack" }],
  ["flow_pack", { I: FileText, ...ORANGE, kind: "Flow Pack" }],
  ["flow_picker", { I: FileText, ...ORANGE, kind: "Flows" }],
  ["flow", { I: Workflow, ...GREEN, kind: "Flows" }],
  ["subscription", { I: Crown, ...ORANGE, kind: "Plan" }],
  ["team", { I: Users, ...BLUE, kind: "Team" }],
  ["chat", { I: MessageCircle, ...GREEN, kind: "Chat" }],
];

const DEFAULT_STYLE: TypeStyle = { I: Bell, ...GREY, kind: "Update" };

function styleFor(type: string): TypeStyle {
  if (TYPE_STYLES[type]) return TYPE_STYLES[type];
  const hit = PREFIX_STYLES.find(([p]) => type?.startsWith(p));
  return hit ? hit[1] : DEFAULT_STYLE;
}

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile (< 768px) renders a full-screen overlay; desktop keeps the popover.
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Lock body scroll while the full-screen mobile overlay is open.
  useEffect(() => {
    if (isMobile && open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, open]);

  // Poll unread count every 60s. Cheap GET, returns just a number.
  const refreshCount = () => {
    api
      .get("/notifications/count")
      .then((res) => {
        const d = res.data?.data || res.data || {};
        setUnreadCount(d.unread ?? 0);
      })
      .catch(() => {});
  };

  useEffect(() => {
    refreshCount();

    // Real-time: bump instantly when the backend emits notification:new to
    // this user's socket room. The poll below stays as a fallback for when the
    // socket isn't connected. Both paths call refreshCount(), which is scoped
    // server-side by the X-Team-Context / X-App-Context headers, so the badge
    // always reflects the workspace currently being viewed.
    let cleanup: (() => void) | undefined;
    (async () => {
      try {
        const { getSocket } = await import("@/lib/socket");
        const socket = getSocket();
        if (!socket) return;
        const onNew = () => {
          refreshCount();
          if (open) {
            api
              .get("/notifications")
              .then((res) => {
                const d = res.data?.data || res.data || [];
                setNotifications(Array.isArray(d) ? d : d.notifications || []);
              })
              .catch(() => {});
          }
        };
        socket.on("notification:new", onNew);
        cleanup = () => socket.off("notification:new", onNew);
      } catch {
        // socket unavailable — rely on the poll
      }
    })();

    const t = setInterval(refreshCount, 60000);
    return () => {
      clearInterval(t);
      cleanup?.();
    };
    // `open` is intentionally included so the in-place list refresh sees the
    // current popover state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    api
      .get("/notifications")
      .then((res) => {
        const d = res.data?.data || res.data || [];
        setNotifications(Array.isArray(d) ? d : d.notifications || []);
      })
      .catch(() => setNotifications([]));
  }, [open]);

  const markAllRead = () => {
    api.put("/notifications/read-all").catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    api.put(`/notifications/${id}/read`).catch(() => {});
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((c) => {
      const item = notifications.find((n) => n.id === id);
      return item && !item.isRead ? Math.max(0, c - 1) : c;
    });
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    api.delete(`/notifications/${id}`).catch(() => {});
    const item = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((c) => (item && !item.isRead ? Math.max(0, c - 1) : c));
  };

  const handleDeleteAll = () => {
    api.delete("/notifications/delete-all").catch(() => {});
    setNotifications([]);
    setUnreadCount(0);
  };

  const handleClick = async (n: Notification) => {
    if (!n.isRead) {
      api.put(`/notifications/${n.id}/read`).catch(() => {});
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (n.actionUrl) window.location.href = n.actionUrl;
  };

  const emptyState = (
    <div className="flex flex-col items-center justify-center text-center px-6 py-12">
      <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-4">
        <Bell className="w-7 h-7 text-primary" />
      </div>
      <div className="font-bold text-foreground">No notifications yet</div>
      <div className="text-sm text-muted-foreground mt-1 max-w-xs">
        You&apos;ll see alerts here when your flow packs are expiring or your
        plan changes.
      </div>
    </div>
  );

  const renderItem = (n: Notification) => {
    const s = styleFor(n.type);
    return (
      <button
        key={n.id}
        onClick={() => handleClick(n)}
        className={`group w-full text-left flex items-start gap-3 p-3 rounded-2xl border border-border mb-2 transition-colors hover:bg-secondary/40 ${
          n.isRead ? "bg-card" : "bg-accent/40"
        }`}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: s.bg, color: s.c }}
        >
          <s.I className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
              style={{ background: s.bg, color: s.c }}
            >
              {s.kind}
            </span>
            <div className="font-bold text-sm text-foreground truncate">
              {n.title}
            </div>
            {!n.isRead && (
              <span className="w-2 h-2 rounded-full bg-primary shrink-0 ml-auto" />
            )}
            <span
              role="button"
              tabIndex={-1}
              aria-label="Dismiss notification"
              onClick={(e) => handleDismiss(n.id, e)}
              className={`shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition ${
                n.isRead ? "ml-auto" : ""
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </span>
            <span
              role="button"
              tabIndex={-1}
              aria-label="Delete notification"
              onClick={(e) => handleDelete(n.id, e)}
              className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-md text-muted-foreground hover:bg-[var(--coral)]/10 hover:text-[var(--coral)] transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
            {n.message}
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">
            {timeAgo(n.createdAt)}
          </div>
        </div>
      </button>
    );
  };

  const header = (
    <div className="flex items-center justify-between px-1 pb-3">
      <div>
        <h2 className="text-base font-extrabold tracking-tight text-foreground">
          Notifications
        </h2>
        <div className="text-[11px] text-muted-foreground">
          Updates, plans and announcements
        </div>
      </div>
      <div className="flex items-center gap-3">
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs font-bold text-primary-deep"
          >
            Mark all read
          </button>
        )}
        {notifications.length > 0 && (
          <button
            onClick={handleDeleteAll}
            className="inline-flex items-center gap-1 text-xs font-bold text-[var(--coral)]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete all
          </button>
        )}
      </div>
    </div>
  );

  // Desktop popover content — new-design notification cards.
  const content = (
    <div
      className="tw"
      style={{ width: "min(380px, calc(100vw - 24px))", maxWidth: "100vw" }}
    >
      <div className="p-3">
        {header}
        {notifications.length === 0 ? (
          emptyState
        ) : (
          <div className="max-h-[420px] overflow-y-auto no-scrollbar pr-0.5">
            {notifications.slice(0, 8).map(renderItem)}
          </div>
        )}
      </div>
    </div>
  );

  const bell = (
    <div className="tw">
      <span className="relative w-10 h-10 rounded-xl hover:bg-secondary flex items-center justify-center cursor-pointer transition">
        <Bell className="w-5 h-5 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--coral)]" />
        )}
      </span>
    </div>
  );

  // ── Mobile: full-screen overlay with an explicit close (X) ──────────────
  if (isMobile) {
    return (
      <>
        <span onClick={() => setOpen(true)}>{bell}</span>
        {open && (
          <div className="tw fixed inset-0 z-[1200] bg-background flex flex-col">
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5 bg-background/95 backdrop-blur-md border-b border-border">
              <div>
                <h1 className="text-lg font-extrabold tracking-tight text-foreground">
                  Notifications
                </h1>
                <div className="text-[11px] text-muted-foreground">
                  Updates, plans and announcements
                </div>
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs font-bold text-primary-deep px-2"
                  >
                    Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={handleDeleteAll}
                    aria-label="Delete all notifications"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[var(--coral)] px-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete all
                  </button>
                )}
                <button
                  aria-label="Close notifications"
                  onClick={() => setOpen(false)}
                  className="w-10 h-10 rounded-xl hover:bg-secondary flex items-center justify-center text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pt-3 pb-24">
              {notifications.length === 0
                ? emptyState
                : notifications.map(renderItem)}
            </div>
          </div>
        )}
      </>
    );
  }

  // ── Desktop: popover dropdown ───────────────────────────────────────────
  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
      arrow={false}
      rootClassName="vc-notif-popover"
      styles={{
        body: { padding: 0, borderRadius: 16, overflow: "hidden" },
        root: { zIndex: 1100 },
      }}
    >
      {bell}
    </Popover>
  );
}
