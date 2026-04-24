"use client";

import React, { useEffect, useState } from "react";
import {
  Layout,
  Menu,
  Typography,
  Avatar,
  Space,
  Tag,
  Button,
  Drawer,
} from "antd";
import {
  DashboardOutlined,
  TeamOutlined,
  DollarOutlined,
  RobotOutlined,
  FileSearchOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
  LogoutOutlined,
  ArrowLeftOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useIsMobile } from "@/hooks/useMediaQuery";

const { Sider, Content } = Layout;
const { Text } = Typography;

const PRIMARY = "#3CB371";
const PRIMARY_BG = "#F0FFF4";
const SIDEBAR_W = 220;
const TOPBAR_H = 56;

const menuItems = [
  {
    key: "/super-admin/dashboard",
    icon: <DashboardOutlined />,
    label: "Dashboard",
  },
  { key: "/super-admin/users", icon: <TeamOutlined />, label: "Users" },
  {
    key: "/super-admin/subscriptions",
    icon: <DollarOutlined />,
    label: "Subscriptions",
  },
  { key: "/super-admin/ai-usage", icon: <RobotOutlined />, label: "AI Usage" },
  {
    key: "/super-admin/logs",
    icon: <FileSearchOutlined />,
    label: "System Logs",
  },
  {
    key: "/super-admin/settings",
    icon: <SettingOutlined />,
    label: "Settings",
  },
];

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname() || "";
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const role = (session?.user as any)?.role;
  const isSuperAdmin = role === "super_admin";
  const isLoginPage = pathname === "/super-admin/login";

  useEffect(() => {
    if (status === "loading") return;
    if (isLoginPage) return;
    if (!session) {
      router.push("/super-admin/login");
      return;
    }
    if (!isSuperAdmin) {
      router.push("/dashboard");
    }
  }, [status, session, isSuperAdmin, router, isLoginPage]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  if (isLoginPage) return <>{children}</>;
  if (status === "loading" || !session || !isSuperAdmin) return null;

  const selectedKey =
    menuItems
      .map((m) => m.key)
      .sort((a, b) => b.length - a.length)
      .find((k) => pathname.startsWith(k)) || "/super-admin/dashboard";

  // ───────────── Sidebar body (shared between desktop Sider + mobile Drawer)
  const renderSidebarBody = (onClick?: () => void) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#FFFFFF",
      }}
    >
      {/* Back-to-app strip (only on mobile drawer — desktop has the main logo in header) */}
      {isMobile && (
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid #F0F0F0",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/image.png"
            alt="ValueCharts"
            style={{ height: 32, width: "auto" }}
          />
          <Tag color={PRIMARY} style={{ fontSize: 10, fontWeight: 600 }}>
            ADMIN
          </Tag>
        </div>
      )}

      <div
        style={{
          padding: "12px 16px 8px",
          borderBottom: isMobile ? "none" : "1px solid #F0F0F0",
        }}
      >
        <Link
          href="/dashboard"
          onClick={onClick}
          style={{
            color: "#8C8C8C",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            textDecoration: "none",
          }}
        >
          <ArrowLeftOutlined style={{ fontSize: 11 }} /> Back to App
        </Link>
      </div>

      {/* Menu */}
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        items={menuItems.map((m) => ({
          ...m,
          label: (
            <Link href={m.key} onClick={onClick}>
              {m.label}
            </Link>
          ),
        }))}
        style={{
          background: "transparent",
          borderRight: 0,
          flex: 1,
          marginTop: 8,
        }}
        className="vc-sa-menu"
      />

      {/* Footer — signed-in identity + logout */}
      <div
        style={{
          padding: 12,
          borderTop: "1px solid #F0F0F0",
          background: "#FAFAFA",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <Avatar src={session.user?.image || undefined} size={32}>
            {session.user?.name?.[0]}
          </Avatar>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "#1A1A2E",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {session.user?.name || "Admin"}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#8C8C8C",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {session.user?.email}
            </div>
          </div>
        </div>
        <Button
          block
          size="small"
          icon={<LogoutOutlined />}
          onClick={() => signOut({ callbackUrl: "/super-admin/login" })}
        >
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFB" }}>
      {/* ─────────── Fixed top bar (full width) ─────────── */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: TOPBAR_H,
          background: "#FFFFFF",
          borderBottom: "1px solid #F0F0F0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isMobile ? "0 12px" : "0 20px",
          zIndex: 100,
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}
      >
        {/* Left: hamburger (mobile) + logo + Admin tag */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isMobile ? 8 : 14,
            minWidth: 0,
          }}
        >
          {isMobile && (
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setDrawerOpen(true)}
              style={{ width: 36, height: 36 }}
            />
          )}

          {/* ValueCharts logo — same asset as user dashboard */}
          <Link
            href="/super-admin/dashboard"
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/image.png"
              alt="ValueCharts"
              style={{ height: isMobile ? 30 : 36, width: "auto" }}
            />
          </Link>

          {!isMobile && (
            <>
              <div
                style={{
                  width: 1,
                  height: 24,
                  background: "#E8E8E8",
                }}
              />
              <Space size={8}>
                <SafetyCertificateOutlined
                  style={{ color: PRIMARY, fontSize: 16 }}
                />
                <Text
                  strong
                  style={{
                    fontSize: 14,
                    color: "#1A1A2E",
                    letterSpacing: 0.2,
                  }}
                >
                  Super Admin
                </Text>
              </Space>
            </>
          )}

          <Tag
            color={PRIMARY}
            style={{
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 10,
              lineHeight: "18px",
              padding: "0 8px",
              marginRight: 0,
            }}
          >
            ADMIN MODE
          </Tag>
        </div>

        {/* Right: identity */}
        {!isMobile && (
          <Space size="middle" align="center">
            <div style={{ textAlign: "right", lineHeight: 1.2 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#1A1A2E" }}>
                {session.user?.name}
              </div>
              <div style={{ fontSize: 11, color: "#8C8C8C" }}>
                {session.user?.email}
              </div>
            </div>
            <Avatar src={session.user?.image || undefined} size={32}>
              {session.user?.name?.[0]}
            </Avatar>
          </Space>
        )}
      </header>

      {/* ─────────── Fixed sidebar (desktop only) ─────────── */}
      {!isMobile && (
        <Sider
          width={SIDEBAR_W}
          theme="light"
          style={{
            background: "#FFFFFF",
            borderRight: "1px solid #F0F0F0",
            position: "fixed",
            top: TOPBAR_H,
            left: 0,
            height: `calc(100vh - ${TOPBAR_H}px)`,
            zIndex: 50,
            overflow: "auto",
          }}
        >
          {renderSidebarBody()}
        </Sider>
      )}

      {/* ─────────── Mobile drawer ─────────── */}
      {isMobile && (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={260}
          closable={false}
          bodyStyle={{ padding: 0 }}
          headerStyle={{ display: "none" }}
        >
          {renderSidebarBody(() => setDrawerOpen(false))}
        </Drawer>
      )}

      {/* ─────────── Main content ─────────── */}
      <main
        style={{
          marginLeft: isMobile ? 0 : SIDEBAR_W,
          paddingTop: TOPBAR_H,
          minHeight: "100vh",
        }}
      >
        <Content
          style={{
            padding: isMobile ? 14 : 24,
            background: "#F8FAFB",
            minHeight: `calc(100vh - ${TOPBAR_H}px)`,
          }}
        >
          {children}
        </Content>
      </main>

      {/* ─────────── Global super-admin theming (menu + tables + cards) ─────────── */}
      <style>{`
        /* Menu — white sidebar with green selected state */
        .vc-sa-menu .ant-menu-item {
          margin: 4px 8px !important;
          border-radius: 8px !important;
          height: 40px !important;
          line-height: 40px !important;
          font-size: 13px !important;
          color: #595959 !important;
        }
        .vc-sa-menu .ant-menu-item a {
          color: inherit !important;
          text-decoration: none !important;
        }
        .vc-sa-menu .ant-menu-item:hover {
          background: #F5F7FA !important;
          color: ${PRIMARY} !important;
        }
        .vc-sa-menu .ant-menu-item-selected {
          background: ${PRIMARY_BG} !important;
          color: ${PRIMARY} !important;
          font-weight: 600 !important;
        }
        .vc-sa-menu .ant-menu-item-selected a { color: ${PRIMARY} !important; }
        .vc-sa-menu .ant-menu-item .anticon { font-size: 15px !important; }

        /* Tables — cleaner spacing, softer header, hover + zebra rows */
        main .ant-table-wrapper .ant-table {
          border-radius: 12px;
          overflow: hidden;
        }
        main .ant-table-wrapper .ant-table-thead > tr > th {
          background: #F8FAFB !important;
          color: #595959 !important;
          font-weight: 600 !important;
          font-size: 12px !important;
          text-transform: uppercase !important;
          letter-spacing: 0.4px !important;
          padding: 14px 16px !important;
          border-bottom: 1px solid #EAECF0 !important;
        }
        main .ant-table-wrapper .ant-table-thead > tr > th::before {
          display: none !important;
        }
        main .ant-table-wrapper .ant-table-tbody > tr > td {
          padding: 14px 16px !important;
          border-bottom: 1px solid #F5F5F5 !important;
          font-size: 13px !important;
        }
        main .ant-table-wrapper .ant-table-tbody > tr:nth-child(even) > td {
          background: #FCFCFD;
        }
        main .ant-table-wrapper .ant-table-tbody > tr:hover > td {
          background: ${PRIMARY_BG} !important;
        }
        main .ant-table-wrapper .ant-table-tbody > tr:last-child > td {
          border-bottom: none !important;
        }
        main .ant-table-wrapper .ant-pagination {
          padding: 14px 16px;
          margin: 0 !important;
          background: #FAFAFA;
          border-top: 1px solid #F0F0F0;
        }

        /* Cards — subtle lift, consistent radius */
        main .ant-card {
          border-radius: 12px;
          border-color: #EAECF0;
        }
        main .ant-card-head {
          border-bottom-color: #F0F0F0;
          min-height: 44px;
        }

        /* Tags — slightly more padding */
        main .ant-tag {
          border-radius: 6px;
          padding: 0 8px;
          line-height: 22px;
          font-size: 11px;
          font-weight: 500;
        }

        /* Buttons — match user dashboard */
        main .ant-btn-primary {
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
