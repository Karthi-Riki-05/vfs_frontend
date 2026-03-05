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
  Tooltip,
  Typography,
} from "antd";
import {
  MessageOutlined,
  DownOutlined,
  UserOutlined,
  CrownOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import NotificationDropdown from "@/components/common/NotificationDropdown";
import { useUnreadCount } from "@/hooks/useUnreadCount";

const { Header: AntHeader } = Layout;
const { Text } = Typography;

const Header: React.FC = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();

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
        padding: "0 24px",
        background: "#FFFFFF",
        borderBottom: "1px solid #F0F0F0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Left side - Logo */}
      <Link
        href="/dashboard"
        style={{ textDecoration: "none", display: "flex", alignItems: "center" }}
      >
        <img
          src="/images/image.png"
          alt="ValueChart Logo"
          style={{ height: 40, width: "auto" }}
        />
      </Link>

      {/* Right side */}
      <Space size={16} align="center">
        {/* AI Sparkle Button */}
        <Tooltip title="AI Assistant">
          <Button
            type="text"
            style={{ padding: 0, width: 32, height: 32 }}
            icon={
              <span style={{ color: "#3CB371", fontSize: 18, fontWeight: "bold" }}>
                &#10022;
              </span>
            }
          />
        </Tooltip>

        {/* Chat Icon */}
        <Link href="/dashboard/chat" style={{ display: "flex", alignItems: "center", position: "relative" }}>
          <Badge count={totalUnread} size="small" offset={[2, -2]} style={{ backgroundColor: "#3CB371" }}>
            <MessageOutlined style={{ fontSize: 20, color: "#8C8C8C" }} />
          </Badge>
        </Link>

        {/* Notification Bell */}
        <NotificationDropdown />

        {/* Plan Badge */}
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

        {/* User Dropdown */}
        <Dropdown menu={{ items: dropdownItems }} trigger={["click"]} placement="bottomRight">
          <Space style={{ cursor: "pointer" }} align="center">
            <Avatar
              style={{ backgroundColor: "#3CB371", verticalAlign: "middle" }}
              size="small"
            >
              {userInitial}
            </Avatar>
            <span className="user-name-text">
              <Text style={{ fontSize: 14 }}>{userName}</Text>
            </span>
            <DownOutlined style={{ fontSize: 10, color: "#8C8C8C" }} />
          </Space>
        </Dropdown>
      </Space>

      {/* Responsive styles */}
      <style jsx global>{`
        @media (max-width: 767px) {
          .user-name-text {
            display: none !important;
          }
          .plan-badge {
            display: none !important;
          }
        }
      `}</style>
    </AntHeader>
  );
};

export default Header;
