"use client";

import React, { useState, useEffect } from "react";
import { Badge, Popover, List, Avatar, Typography, Button, Empty } from "antd";
import {
  BellOutlined,
  FileTextOutlined,
  TeamOutlined,
  MessageOutlined,
  CrownOutlined,
  CloseOutlined,
  UserAddOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import api from "@/lib/axios";

const { Text } = Typography;

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
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

const iconMap: Record<string, React.ReactNode> = {
  flow_pack_7day: <FileTextOutlined style={{ color: "#FAAD14" }} />,
  flow_pack_3day: <FileTextOutlined style={{ color: "#FF7A45" }} />,
  flow_pack_1day: <FileTextOutlined style={{ color: "#cf1322" }} />,
  flow_pack_grace: <CrownOutlined style={{ color: "#cf1322" }} />,
  flow_pack_expired: <CrownOutlined style={{ color: "#cf1322" }} />,
  flow_picker_required: <FileTextOutlined style={{ color: "#cf1322" }} />,
  flows_restored: <FileTextOutlined style={{ color: "#3CB371" }} />,
  flow: <FileTextOutlined style={{ color: "#3CB371" }} />,
  team: <TeamOutlined style={{ color: "#1890FF" }} />,
  team_invite: <TeamOutlined style={{ color: "#1890FF" }} />,
  team_member_joined: <UserAddOutlined style={{ color: "#3CB371" }} />,
  chat: <MessageOutlined style={{ color: "#3CB371" }} />,
  subscription: <CrownOutlined style={{ color: "#FAAD14" }} />,
  subscription_activated: <CheckCircleOutlined style={{ color: "#3CB371" }} />,
  subscription_cancelled: <CloseCircleOutlined style={{ color: "#FA8C16" }} />,
  subscription_expired: (
    <ExclamationCircleOutlined style={{ color: "#cf1322" }} />
  ),
  system: <BellOutlined style={{ color: "#8C8C8C" }} />,
};

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
    const t = setInterval(refreshCount, 60000);
    return () => clearInterval(t);
  }, []);

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
    setNotifications([]);
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
    <div style={{ padding: "40px 16px", textAlign: "center" }}>
      <BellOutlined
        style={{ fontSize: 32, color: "#BFBFBF", marginBottom: 12 }}
      />
      <div>
        <Text type="secondary" style={{ display: "block", marginBottom: 4 }}>
          No notifications yet
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          You&apos;ll see alerts here when your flow packs are expiring or your
          plan changes.
        </Text>
      </div>
    </div>
  );

  const renderItem = (item: Notification) => (
    <List.Item
      onClick={() => handleClick(item)}
      style={{
        padding: "12px 16px",
        background: item.isRead ? "transparent" : "#F0FFF4",
        cursor: "pointer",
        borderBottom: "1px solid #F0F0F0",
        alignItems: "flex-start",
      }}
    >
      <List.Item.Meta
        avatar={
          <Avatar
            size={36}
            style={{ background: "#F8F9FA" }}
            icon={iconMap[item.type] || iconMap.system}
          />
        }
        title={
          <Text style={{ fontSize: 13, fontWeight: item.isRead ? 400 : 600 }}>
            {item.title}
          </Text>
        }
        description={
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {item.message}
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: 11 }}>
              {timeAgo(item.createdAt)}
            </Text>
          </div>
        }
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexShrink: 0,
          marginLeft: 8,
        }}
      >
        {!item.isRead && (
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#3CB371",
              flexShrink: 0,
            }}
          />
        )}
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined style={{ fontSize: 10 }} />}
          onClick={(e) => handleDismiss(item.id, e)}
          style={{
            color: "#BFBFBF",
            padding: 2,
            minWidth: 20,
            height: 20,
            lineHeight: 1,
          }}
        />
      </div>
    </List.Item>
  );

  const actionLinks = (
    <div style={{ display: "flex", gap: 4 }}>
      {unreadCount > 0 && (
        <Button
          type="link"
          size="small"
          onClick={markAllRead}
          style={{ color: "#3CB371", padding: "0 4px" }}
        >
          Mark all read
        </Button>
      )}
      {notifications.length > 0 && (
        <Button
          type="link"
          size="small"
          onClick={markAllRead}
          style={{ color: "#8C8C8C", padding: "0 4px" }}
        >
          Clear all
        </Button>
      )}
    </div>
  );

  // Desktop popover content (unchanged layout).
  const content = (
    <div style={{ width: "min(360px, calc(100vw - 24px))", maxWidth: "100vw" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          borderBottom: "1px solid #F0F0F0",
        }}
      >
        <Text strong style={{ fontSize: 16 }}>
          Notifications
        </Text>
        {actionLinks}
      </div>
      {notifications.length === 0 ? (
        emptyState
      ) : (
        <List
          dataSource={notifications.slice(0, 8)}
          style={{ maxHeight: 400, overflowY: "auto" }}
          renderItem={renderItem}
        />
      )}
    </div>
  );

  const bell = (
    <Badge count={unreadCount} size="small">
      <BellOutlined
        style={{ fontSize: 20, color: "#8C8C8C", cursor: "pointer" }}
      />
    </Badge>
  );

  // ── Mobile: full-screen overlay with an explicit close (X) ──────────────
  if (isMobile) {
    return (
      <>
        <span onClick={() => setOpen(true)}>{bell}</span>
        {open && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1200,
              background: "#fff",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                borderBottom: "1px solid #F0F0F0",
                position: "sticky",
                top: 0,
                background: "#fff",
                zIndex: 1,
              }}
            >
              <Text strong style={{ fontSize: 18 }}>
                Notifications
              </Text>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {unreadCount > 0 && (
                  <Button
                    type="link"
                    size="small"
                    onClick={markAllRead}
                    style={{ color: "#3CB371", padding: "0 4px" }}
                  >
                    Mark all read
                  </Button>
                )}
                <Button
                  type="text"
                  shape="circle"
                  aria-label="Close notifications"
                  onClick={() => setOpen(false)}
                  icon={<CloseOutlined style={{ fontSize: 18 }} />}
                  style={{ width: 40, height: 40 }}
                />
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {notifications.length === 0 ? (
                emptyState
              ) : (
                <List dataSource={notifications} renderItem={renderItem} />
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  // ── Desktop: keep the existing popover dropdown ─────────────────────────
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
        body: { padding: 0, borderRadius: 12, overflow: "hidden" },
        root: { zIndex: 1100 },
      }}
    >
      {bell}
    </Popover>
  );
}
