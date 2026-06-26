"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  notificationsApi,
  type NotificationItem,
} from "@/api/notifications.api";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mt-5 mb-2">
      {children}
    </div>
  );
}

const RESET =
  "appearance-none cursor-pointer outline-none border-0 bg-transparent";

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
  flow_picker_required: { I: FileText, ...CORAL, kind: "Action" },
  flows_restored: { I: Workflow, ...GREEN, kind: "Flows" },
  flow_share: { I: Workflow, ...GREEN, kind: "Shared" },
  subscription_activated: { I: CheckCircle2, ...GREEN, kind: "Plan" },
  subscription_granted: { I: CheckCircle2, ...GREEN, kind: "Plan" },
  subscription_cancelled: { I: XCircle, ...ORANGE, kind: "Plan" },
  subscription_expired: { I: AlertTriangle, ...CORAL, kind: "Plan" },
  subscription_expiry: { I: AlertTriangle, ...ORANGE, kind: "Plan" },
  subscription_deleted: { I: XCircle, ...CORAL, kind: "Plan" },
  team_invite: { I: UserPlus, ...BLUE, kind: "Invite" },
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

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

function groupKey(dateStr: string): "Today" | "This week" | "Earlier" {
  const now = new Date();
  const d = new Date(dateStr);
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  if (d >= startOfToday) return "Today";
  if (now.getTime() - d.getTime() < 7 * 24 * 60 * 60 * 1000) return "This week";
  return "Earlier";
}

const GROUP_ORDER = ["Today", "This week", "Earlier"] as const;

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    notificationsApi
      .list(false, 50)
      .then((res) => {
        const d = res.data?.data || res.data || [];
        const list = Array.isArray(d) ? d : d.notifications || [];
        setItems(Array.isArray(list) ? list : []);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unread = items.filter((n) => !n.isRead).length;

  const handleMarkAll = () => {
    if (unread === 0) return;
    notificationsApi.markAllRead().catch(() => {});
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    notificationsApi.deleteOne(id).catch(() => {});
    setItems((prev) => prev.filter((n) => n.id !== id));
  };

  const handleDeleteAll = () => {
    notificationsApi.deleteAll().catch(() => {});
    setItems([]);
  };

  const handleClick = (n: NotificationItem) => {
    if (!n.isRead) {
      notificationsApi.markRead(n.id).catch(() => {});
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)),
      );
    }
    if (n.actionUrl) {
      if (n.actionUrl.startsWith("http")) window.location.href = n.actionUrl;
      else router.push(n.actionUrl);
    }
  };

  const grouped = GROUP_ORDER.map((label) => ({
    label,
    items: items.filter((n) => groupKey(n.createdAt) === label),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="tw min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-5 pt-3 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-foreground">
              Notifications
            </h1>
            <div className="text-xs text-muted-foreground">
              Updates, plans and announcements
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <button
                className={`${RESET} text-xs font-bold text-primary-deep`}
                onClick={handleMarkAll}
              >
                Mark all read
              </button>
            )}
            {items.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="h-9 px-3 rounded-xl border-2 border-[var(--coral)] text-[var(--coral)] font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-colors hover:bg-[var(--coral)]/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete all
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2 mt-5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[72px] rounded-2xl bg-card border border-border animate-pulse"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-4">
              <Bell className="w-7 h-7 text-primary" />
            </div>
            <div className="font-bold text-foreground">
              No notifications yet
            </div>
            <div className="text-sm text-muted-foreground mt-1 max-w-xs">
              You&apos;ll see alerts here when your flow packs are expiring or
              your plan changes.
            </div>
          </div>
        ) : (
          grouped.map((g) => (
            <div key={g.label}>
              <SectionLabel>{g.label}</SectionLabel>
              {g.items.map((n) => {
                const s = styleFor(n.type);
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 p-3 rounded-2xl border border-border mb-2 transition-colors ${
                      n.isRead ? "bg-card" : "bg-accent/40"
                    }`}
                  >
                    <button
                      onClick={() => handleClick(n)}
                      className={`${RESET} flex items-start gap-3 flex-1 min-w-0 text-left`}
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
                        </div>
                        <div className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
                          {n.message}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {timeAgo(n.createdAt)}
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={(e) => handleDelete(n.id, e)}
                      aria-label="Delete notification"
                      className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-[var(--coral)]/10 hover:text-[var(--coral)] transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
