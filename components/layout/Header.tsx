"use client";

import React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Layout,
  Space,
  Avatar,
  Badge,
  Dropdown,
  Tag,
  Button,
  Typography,
} from "antd";
import {
  MessageOutlined,
  DownOutlined,
  UserOutlined,
  CrownOutlined,
  LogoutOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import NotificationDropdown from "@/components/common/NotificationDropdown";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { useIsMobile } from "@/hooks/useMediaQuery";

const { Header: AntHeader } = Layout;
const { Text } = Typography;

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();

  const user = session?.user;
  const userName = user?.name || "User";
  const userInitial = userName.charAt(0).toUpperCase();
  const userPlan: string = (user as any)?.plan || "free";
  const { totalUnread } = useUnreadCount();
  const hasUnreadMessages = totalUnread > 0;
  const isPro = userPlan === "pro" || userPlan === "team";

  const dropdownItems: MenuProps["items"] = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Profile",
      onClick: () => router.push("/dashboard/settings"),
    },
    {
      key: "subscription",
      icon: <CrownOutlined />,
      label: "Subscription",
      onClick: () => router.push("/dashboard/subscription"),
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined style={{ color: "#FF4D4F" }} />,
      label: <span style={{ color: "#FF4D4F" }}>Log out</span>,
      onClick: () => signOut(),
    },
  ];

  return (
    <AntHeader
      style={{
        height: 56,
        lineHeight: "56px",
        padding: isMobile ? "0 12px" : "0 24px",
        background: "#FFFFFF",
        borderBottom: "1px solid #F0F0F0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 90,
      }}
    >
      {/* Left side */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Hamburger — mobile only */}
        {isMobile && onMenuClick && (
          <Button
            type="text"
            icon={<MenuOutlined style={{ fontSize: 20 }} />}
            onClick={onMenuClick}
            style={{ padding: 0, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          />
        )}

        {/* Logo */}
        <Link
          href="/dashboard"
          style={{ textDecoration: "none", display: "flex", alignItems: "center" }}
        >
          <img
            src="/images/image.png"
            alt="ValueChart Logo"
            style={{ height: isMobile ? 32 : 40, width: "auto" }}
          />
        </Link>
      </div>

      {/* Right side */}
      <Space size={isMobile ? 8 : 16} align="center">
        {/* Chat Icon — mobile: navigate to /chat, desktop: toggle right column */}
        <div
          onClick={() => {
            if (isMobile) {
              router.push("/dashboard/chat");
            } else {
              (window as any).__toggleChat?.();
            }
          }}
          style={{ display: "flex", alignItems: "center", position: "relative", cursor: "pointer" }}
        >
          <Badge count={totalUnread} size="small" offset={[2, -2]} style={{ backgroundColor: "#3CB371" }}>
            <MessageOutlined style={{ fontSize: 20, color: "#8C8C8C" }} />
          </Badge>
        </div>

        {/* Notification Bell */}
        <NotificationDropdown />

        {/* Plan Badge — hide on mobile */}
        {!isMobile && (
          <span className="plan-badge">
            {isPro ? (
              <Tag color="gold">Pro Plan</Tag>
            ) : (
              <Button
                type="default"
                shape="round"
                size="small"
                onClick={() => router.push("/dashboard/subscription")}
              >
                Upgrade
              </Button>
            )}
          </span>
        )}

        {/* User Dropdown */}
        <Dropdown menu={{ items: dropdownItems }} trigger={["click"]} placement="bottomRight">
          <Space style={{ cursor: "pointer" }} align="center">
            <Avatar
              style={{ backgroundColor: "#3CB371", verticalAlign: "middle" }}
              size="small"
            >
              {userInitial}
            </Avatar>
            {!isMobile && (
              <span className="user-name-text">
                <Text style={{ fontSize: 14 }}>{userName}</Text>
              </span>
            )}
            <DownOutlined style={{ fontSize: 10, color: "#8C8C8C" }} />
          </Space>
        </Dropdown>
      </Space>
    </AntHeader>
  );
};

export default Header;
