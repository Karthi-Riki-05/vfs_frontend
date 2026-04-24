"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Layout, Menu, Typography, Modal, Button, message } from "antd";
import {
  CrownOutlined,
  ClockCircleOutlined,
  PlusSquareOutlined,
  FileTextOutlined,
  FolderOutlined,
  DeleteOutlined,
  QuestionCircleOutlined,
  StarFilled,
  HeartFilled,
  ApartmentOutlined,
  AppstoreOutlined,
  TeamOutlined,
  LockOutlined,
} from "@ant-design/icons";
import { Tag, Tooltip } from "antd";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createNewFlow } from "@/lib/flow";
import { flowsApi } from "@/api/flows.api";
import { proApi } from "@/api/pro.api";
import { usePro } from "@/hooks/usePro";
import { useAppContext } from "@/context/AppContext";

const { Sider } = Layout;
const { Text } = Typography;

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  isMobileDrawer?: boolean;
  onMobileClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onCollapse,
  isMobileDrawer,
  onMobileClose,
}) => {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { hasPro, currentApp } = usePro();
  const { isTeamContext, effectivePlan, availableTeams } = useAppContext();
  // "Team-grade" features (Teams page, Chat) are unlocked when:
  //   - personal account is Pro/Team, OR
  //   - user has switched into a team context, OR
  //   - user belongs to at least one team (so they can switch in).
  const hasTeamFeatures =
    hasPro ||
    isTeamContext ||
    effectivePlan === "pro" ||
    effectivePlan === "team" ||
    availableTeams.length > 0;
  const [starredFlows, setStarredFlows] = useState<any[]>([]);
  const [switching, setSwitching] = useState(false);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [checkingTeamsAccess, setCheckingTeamsAccess] = useState(false);

  const fetchStarred = useCallback(async () => {
    try {
      const res = await flowsApi.getFavorites();
      const d = res.data?.data || res.data;
      setStarredFlows(Array.isArray(d) ? d : []);
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchStarred();
  }, [fetchStarred]);

  const getSelectedKey = () => {
    if (pathname.startsWith("/dashboard/recents")) return "recents";
    if (pathname.startsWith("/dashboard/flows")) return "flows";
    if (pathname.startsWith("/dashboard/shapes")) return "shapes";
    if (pathname.startsWith("/dashboard/teams")) return "teams";
    if (pathname.startsWith("/dashboard/drafts")) return "drafts";
    if (pathname.startsWith("/dashboard/projects")) return "projects";
    if (pathname.startsWith("/dashboard/trash")) return "trash";
    if (pathname.startsWith("/dashboard/support")) return "support";
    return "";
  };

  const handleNavClick = () => {
    if (isMobileDrawer && onMobileClose) {
      onMobileClose();
    }
  };

  const handleAppSwitch = async (targetApp: "free" | "pro") => {
    if (switching) return;
    if (targetApp === "pro" && !hasPro) {
      router.push("/upgrade-pro");
      handleNavClick();
      return;
    }
    setSwitching(true);
    try {
      await proApi.switchApp(targetApp);
      window.location.reload();
    } catch {
      message.error("Failed to switch app");
      setSwitching(false);
    }
  };

  const handleTeamsClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // PRO app with Pro access: always allow
    if (currentApp === "pro" && hasPro) {
      router.push("/dashboard/teams");
      handleNavClick();
      return;
    }

    // ValueChart: check subscription first
    setCheckingTeamsAccess(true);
    try {
      const res = await fetch("/api/subscription/status");
      const data = await res.json();
      const subData = data.data || data;
      if (subData?.hasSubscription && subData?.status === "active") {
        router.push("/dashboard/teams");
        handleNavClick();
      } else {
        setSubscriptionModalOpen(true);
      }
    } catch {
      setSubscriptionModalOpen(true);
    } finally {
      setCheckingTeamsAccess(false);
    }
  };

  const starredChildren =
    starredFlows.length > 0
      ? starredFlows.map((flow) => ({
          key: `starred-${flow.id}`,
          icon: <HeartFilled style={{ color: "#FF4D6A", fontSize: 12 }} />,
          label: (
            <span
              onClick={(e) => {
                e.preventDefault();
                window.open(`/dashboard/flows/${flow.id}`, "_blank");
                handleNavClick();
              }}
              style={{ cursor: "pointer", fontSize: 13 }}
            >
              {flow.name}
            </span>
          ),
        }))
      : [
          {
            key: "starred-placeholder",
            label: (
              <Text type="secondary" style={{ fontSize: 13 }}>
                No favorites yet
              </Text>
            ),
            disabled: true,
          },
        ];

  const menuItems = [
    {
      key: "recents",
      icon: <ClockCircleOutlined />,
      label: (
        <Link href="/dashboard/recents" onClick={handleNavClick}>
          Recents
        </Link>
      ),
    },
    {
      key: "create-flow",
      icon: <PlusSquareOutlined style={{ color: "#3CB371" }} />,
      label: <span style={{ color: "#3CB371" }}>Create a Flow</span>,
      onClick: () => {
        createNewFlow();
        handleNavClick();
      },
    },
    {
      type: "divider" as const,
      key: "divider-1",
    },
    {
      key: "flows",
      icon: <ApartmentOutlined />,
      label: (
        <Link href="/dashboard/flows" onClick={handleNavClick}>
          Flows
        </Link>
      ),
    },
    {
      key: "shapes",
      icon: <AppstoreOutlined />,
      label: (
        <Link href="/dashboard/shapes" onClick={handleNavClick}>
          Shapes
        </Link>
      ),
    },
    {
      key: "teams",
      icon: hasTeamFeatures ? (
        <TeamOutlined />
      ) : (
        <span style={{ position: "relative", display: "inline-block" }}>
          <TeamOutlined />
          <LockOutlined
            style={{
              position: "absolute",
              bottom: -4,
              right: -6,
              fontSize: 9,
              color: "#fff",
              background: "#FF7875",
              borderRadius: "50%",
              padding: 1,
              lineHeight: 1,
            }}
          />
        </span>
      ),
      label: (
        <span
          onClick={handleTeamsClick}
          style={{
            cursor: checkingTeamsAccess ? "wait" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <span>Teams</span>
          {!hasTeamFeatures && (
            <Tooltip title="Switch to a team context or upgrade to access Teams">
              <Tag
                color="orange"
                style={{
                  fontSize: 9,
                  padding: "0 4px",
                  marginLeft: 6,
                  lineHeight: "14px",
                }}
              >
                PRO
              </Tag>
            </Tooltip>
          )}
        </span>
      ),
    },
    {
      type: "divider" as const,
      key: "divider-2",
    },
    {
      key: "drafts",
      icon: <FileTextOutlined />,
      label: (
        <Link href="/dashboard/drafts" onClick={handleNavClick}>
          Drafts
        </Link>
      ),
    },
    {
      key: "projects",
      icon: <FolderOutlined style={{ color: "#FFC107" }} />,
      label: (
        <Link href="/dashboard/projects" onClick={handleNavClick}>
          All Projects
        </Link>
      ),
    },
    {
      key: "trash",
      icon: <DeleteOutlined />,
      label: (
        <Link href="/dashboard/trash" onClick={handleNavClick}>
          Trash
        </Link>
      ),
    },
    {
      type: "divider" as const,
      key: "divider-3",
    },
    {
      type: "group" as const,
      key: "starred-group",
      label: (
        <span
          style={{
            textTransform: "uppercase",
            fontSize: 11,
            color: "#BFBFBF",
            fontWeight: 600,
            paddingLeft: 0,
          }}
        >
          Favorites
        </span>
      ),
      children: starredChildren,
    },
  ];

  // Mobile drawer mode: render without Sider wrapper
  if (isMobileDrawer) {
    return (
      <>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "calc(100% - 57px)",
          }}
        >
          {/* App Switch or Upgrade */}
          <div style={{ padding: "12px 16px 0" }}>
            {hasPro ? (
              <div
                style={{
                  display: "flex",
                  borderRadius: 8,
                  border: "1px solid #E8E8E8",
                  overflow: "hidden",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    textAlign: "center",
                    padding: "6px 0",
                    cursor: currentApp === "free" ? "default" : "pointer",
                    background: currentApp === "free" ? "#3CB371" : "#fff",
                    color: currentApp === "free" ? "#fff" : "#595959",
                    transition: "all 0.2s",
                  }}
                  onClick={() =>
                    currentApp !== "free" && handleAppSwitch("free")
                  }
                >
                  ValueChart
                </div>
                <div
                  style={{
                    flex: 1,
                    textAlign: "center",
                    padding: "6px 0",
                    cursor: currentApp === "pro" ? "default" : "pointer",
                    background: currentApp === "pro" ? "#F59E0B" : "#fff",
                    color: currentApp === "pro" ? "#fff" : "#595959",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                  }}
                  onClick={() => currentApp !== "pro" && handleAppSwitch("pro")}
                >
                  <CrownOutlined style={{ fontSize: 11 }} />
                  PRO
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  borderRadius: 8,
                  border: "1px solid #E8E8E8",
                  overflow: "hidden",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    textAlign: "center",
                    padding: "6px 0",
                    background: "#3CB371",
                    color: "#fff",
                  }}
                >
                  ValueChart
                </div>
                <div
                  onClick={() => {
                    router.push("/upgrade-pro");
                    handleNavClick();
                  }}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    padding: "6px 0",
                    cursor: "pointer",
                    background: "linear-gradient(135deg, #F59E0B, #D97706)",
                    color: "#fff",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                  }}
                >
                  <CrownOutlined style={{ fontSize: 11 }} />
                  PRO
                </div>
              </div>
            )}
          </div>

          {/* Navigation Menu */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            <Menu
              mode="inline"
              selectedKeys={[getSelectedKey()]}
              items={menuItems}
              style={{
                border: "none",
                background: "transparent",
              }}
            />
          </div>

          {/* Bottom: Get Support */}
          <div style={{ borderTop: "1px solid #F0F0F0", padding: "12px 16px" }}>
            <Link
              href="/dashboard/support"
              onClick={handleNavClick}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#3CB371",
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              <QuestionCircleOutlined
                style={{ color: "#3CB371", fontSize: 16 }}
              />
              <span>Get Support</span>
            </Link>
          </div>
        </div>

        <Modal
          open={subscriptionModalOpen}
          onCancel={() => setSubscriptionModalOpen(false)}
          footer={[
            <Button
              key="cancel"
              onClick={() => setSubscriptionModalOpen(false)}
            >
              Cancel
            </Button>,
            <Button
              key="plans"
              type="primary"
              onClick={() => {
                setSubscriptionModalOpen(false);
                router.push("/dashboard/subscription");
                handleNavClick();
              }}
              style={{ backgroundColor: "#3CB371", borderColor: "#3CB371" }}
            >
              View Plans
            </Button>,
          ]}
          centered
          width={420}
          zIndex={1200}
        >
          <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
            <TeamOutlined
              style={{ fontSize: 40, color: "#3CB371", marginBottom: 16 }}
            />
            <h3 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 600 }}>
              Teams requires a subscription
            </h3>
            <p style={{ color: "#595959", margin: 0, fontSize: 14 }}>
              Subscribe to a Team plan to create and manage teams, invite
              members, and collaborate on value charts.
            </p>
          </div>
        </Modal>

        <style jsx global>{`
          .sidebar-drawer .ant-menu-item {
            height: 44px !important;
            line-height: 44px !important;
            font-size: 14px !important;
            margin: 0 !important;
            border-radius: 0 !important;
            width: 100% !important;
          }
          .sidebar-drawer .ant-menu-item:hover {
            background: #f8f9fa !important;
          }
          .sidebar-drawer .ant-menu-item-selected {
            color: #3cb371 !important;
            background: #f0fff4 !important;
          }
          .sidebar-drawer .ant-menu-item-selected a {
            color: #3cb371 !important;
          }
          .sidebar-drawer .ant-menu-item a {
            color: inherit;
            text-decoration: none;
          }
        `}</style>
      </>
    );
  }

  // Desktop/Tablet: Ant Design Sider
  return (
    <Sider
      width={220}
      collapsedWidth={60}
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      trigger={null}
      style={{
        background: "#FFFFFF",
        borderRight: "1px solid #F0F0F0",
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 56px)",
        position: "fixed",
        top: 56,
        left: 0,
        zIndex: 50,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        {/* Top: App Switch or Upgrade */}
        {!collapsed && (
          <div style={{ padding: "12px 16px 0" }}>
            {hasPro ? (
              <div
                style={{
                  display: "flex",
                  borderRadius: 8,
                  border: "1px solid #E8E8E8",
                  overflow: "hidden",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    textAlign: "center",
                    padding: "6px 0",
                    cursor: currentApp === "free" ? "default" : "pointer",
                    background: currentApp === "free" ? "#3CB371" : "#fff",
                    color: currentApp === "free" ? "#fff" : "#595959",
                    transition: "all 0.2s",
                  }}
                  onClick={() =>
                    currentApp !== "free" && handleAppSwitch("free")
                  }
                >
                  ValueChart
                </div>
                <div
                  style={{
                    flex: 1,
                    textAlign: "center",
                    padding: "6px 0",
                    cursor: currentApp === "pro" ? "default" : "pointer",
                    background: currentApp === "pro" ? "#F59E0B" : "#fff",
                    color: currentApp === "pro" ? "#fff" : "#595959",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                  }}
                  onClick={() => currentApp !== "pro" && handleAppSwitch("pro")}
                >
                  <CrownOutlined style={{ fontSize: 11 }} />
                  PRO
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  borderRadius: 8,
                  border: "1px solid #E8E8E8",
                  overflow: "hidden",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    textAlign: "center",
                    padding: "6px 0",
                    background: "#3CB371",
                    color: "#fff",
                  }}
                >
                  ValueChart
                </div>
                <div
                  onClick={() => router.push("/upgrade-pro")}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    padding: "6px 0",
                    cursor: "pointer",
                    background: "linear-gradient(135deg, #F59E0B, #D97706)",
                    color: "#fff",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                  }}
                >
                  <CrownOutlined style={{ fontSize: 11 }} />
                  PRO
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation Menu */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <Menu
            mode="inline"
            selectedKeys={[getSelectedKey()]}
            items={menuItems}
            style={{
              border: "none",
              background: "transparent",
            }}
          />
        </div>

        {/* Bottom: Get Support */}
        <div
          style={{
            borderTop: "1px solid #F0F0F0",
            padding: collapsed ? "12px 0" : "12px 16px",
          }}
        >
          <Link
            href="/dashboard/support"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "#3CB371",
              fontSize: 14,
              textDecoration: "none",
              justifyContent: collapsed ? "center" : "flex-start",
            }}
          >
            <QuestionCircleOutlined
              style={{ color: "#3CB371", fontSize: 16 }}
            />
            {!collapsed && <span>Get Support</span>}
          </Link>
        </div>
      </div>

      <Modal
        open={subscriptionModalOpen}
        onCancel={() => setSubscriptionModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setSubscriptionModalOpen(false)}>
            Cancel
          </Button>,
          <Button
            key="plans"
            type="primary"
            onClick={() => {
              setSubscriptionModalOpen(false);
              router.push("/dashboard/subscription");
            }}
            style={{ backgroundColor: "#3CB371", borderColor: "#3CB371" }}
          >
            View Plans
          </Button>,
        ]}
        centered
        width={420}
        zIndex={1200}
      >
        <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
          <TeamOutlined
            style={{ fontSize: 40, color: "#3CB371", marginBottom: 16 }}
          />
          <h3 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 600 }}>
            Teams requires a subscription
          </h3>
          <p style={{ color: "#595959", margin: 0, fontSize: 14 }}>
            Subscribe to a Team plan to create and manage teams, invite members,
            and collaborate on value charts.
          </p>
        </div>
      </Modal>

      <style jsx global>{`
        .ant-layout-sider .ant-menu-item {
          height: 40px !important;
          line-height: 40px !important;
          font-size: 14px !important;
          margin: 0 !important;
          border-radius: 0 !important;
          width: 100% !important;
        }
        .ant-layout-sider .ant-menu-item:hover {
          background: #f8f9fa !important;
        }
        .ant-layout-sider .ant-menu-item-selected {
          color: #3cb371 !important;
          background: #f0fff4 !important;
        }
        .ant-layout-sider .ant-menu-item-selected a {
          color: #3cb371 !important;
        }
        .ant-layout-sider .ant-menu-item a {
          color: inherit;
          text-decoration: none;
        }
      `}</style>
    </Sider>
  );
};

export default Sidebar;
