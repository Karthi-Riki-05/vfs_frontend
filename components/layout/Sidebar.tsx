"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Layout, Menu, Typography, message } from "antd";
import {
  CrownOutlined,
  ClockCircleOutlined,
  PlusSquareOutlined,
  FolderOutlined,
  DeleteOutlined,
  QuestionCircleOutlined,
  StarFilled,
  HeartFilled,
  ApartmentOutlined,
  AppstoreOutlined,
  TeamOutlined,
  HomeOutlined,
  MessageOutlined,
  LockOutlined,
} from "@ant-design/icons";
import { Tooltip } from "antd";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createNewFlow } from "@/lib/flow";
import { flowsApi } from "@/api/flows.api";
import { usePro } from "@/hooks/usePro";
import { useAppContext } from "@/context/AppContext";
import TeamUpgradeModal from "@/components/common/TeamUpgradeModal";

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
  const { hasPro, currentApp, switchApp, loading: proLoading } = usePro();
  const { isTeamContext, effectivePlan } = useAppContext();
  // Lock is driven by the ACTIVE context, not by whether invitations exist.
  // Spec:
  //   • Pro app                                       → never locked
  //   • Team app + personal context + free            → locked
  //   • Team app + personal context + active Team sub → unlocked
  //   • Team app + team context (switched into team)  → unlocked
  // Holding a Pro lifetime entitlement (`hasPro`) does NOT unlock Team
  // app features — Pro and Team are separate workspaces. Likewise, simply
  // being invited to a team does NOT unlock the menu in personal context;
  // the user must actually switch into the team context first.
  const isProApp = currentApp === "pro";
  // Pro lifetime entitlement grants access to ALL Team features (per the
  // product spec: "$1 one-time, lifetime access to all Pro & Team
  // features"). So `hasPro=true` unlocks Teams/Chat in any app shell.
  // "Pro vs Team separation" applies to BILLING only (transactions,
  // workspaces) — never to feature gating.
  // While usePro is still loading, optimistically treat as having access so
  // we don't flash a "Pro" lock tag on the very first render
  // (DashboardLayout swaps to ProSidebar once the hook resolves for Pro).
  // In the Team app (ValueChart shell), `hasPro` lifetime DOES NOT unlock
  // Teams/Chat — access requires an active team subscription or being inside
  // a team context. `hasPro` only matters when the user is in the Pro app.
  const hasTeamFeatures =
    proLoading || isProApp || isTeamContext || effectivePlan === "team";
  const [starredFlows, setStarredFlows] = useState<any[]>([]);
  const [switching, setSwitching] = useState(false);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<"teams" | "chat">(
    "teams",
  );
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
    if (pathname.startsWith("/dashboard/projects")) return "projects";
    if (pathname.startsWith("/dashboard/trash")) return "trash";
    if (pathname.startsWith("/dashboard/support")) return "support";
    if (pathname === "/dashboard") return "dashboard";
    return "";
  };

  const handleNavClick = () => {
    if (isMobileDrawer && onMobileClose) {
      onMobileClose();
    }
  };

  const handleAppSwitch = async (targetApp: "free" | "pro") => {
    if (switching) return;
    setSwitching(true);
    try {
      // Use the hook's switchApp — it handles the requiresPurchase redirect
      // (team-plan owners who haven't bought the standalone $1 Pro product
      // get redirected to Stripe checkout) and resets workspace context.
      const switched = await switchApp(targetApp);
      if (switched) {
        window.location.reload();
      } else {
        // Either redirected to Stripe (no need to reset) or an error happened.
        // The hook handles the redirect; just clear local switching state.
        setSwitching(false);
      }
    } catch {
      message.error("Failed to switch app");
      setSwitching(false);
    }
  };

  const handleTeamsClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Pro app shell or active team context = full team access.
    // `hasPro` (lifetime $1) is intentionally NOT checked here — the Team app
    // requires a Team subscription. Pro lifetime only unlocks Teams when the
    // user is actively in the Pro app shell.
    if (currentApp === "pro" || isTeamContext) {
      router.push("/dashboard/teams");
      handleNavClick();
      return;
    }

    // Team app users in personal context: require an active team subscription.
    setCheckingTeamsAccess(true);
    try {
      const res = await fetch("/api/subscription/status");
      const data = await res.json();
      const subData = data.data || data;
      if (subData?.hasSubscription && subData?.status === "active") {
        router.push("/dashboard/teams");
        handleNavClick();
      } else {
        setUpgradeFeature("teams");
        setSubscriptionModalOpen(true);
      }
    } catch {
      setUpgradeFeature("teams");
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
      key: "dashboard",
      icon: <HomeOutlined />,
      label: (
        <Link href="/dashboard" onClick={handleNavClick}>
          Dashboard
        </Link>
      ),
    },
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
      icon: <TeamOutlined />,
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
            <Tooltip title="Subscription required">
              <LockOutlined
                style={{
                  fontSize: 12,
                  color: "#F59E0B",
                  marginLeft: 6,
                }}
              />
            </Tooltip>
          )}
        </span>
      ),
    },
    {
      key: "chat",
      icon: <MessageOutlined />,
      label: (
        <span
          onClick={(e) => {
            e.preventDefault();
            handleNavClick();
            if (hasTeamFeatures) {
              (window as any).__toggleChat?.();
            } else {
              setUpgradeFeature("chat");
              setSubscriptionModalOpen(true);
            }
          }}
          style={{
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <span>Chat</span>
          {!hasTeamFeatures && (
            <Tooltip title="Subscription required">
              <LockOutlined
                style={{
                  fontSize: 12,
                  color: "#F59E0B",
                  marginLeft: 6,
                }}
              />
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

        <TeamUpgradeModal
          open={subscriptionModalOpen}
          onClose={() => setSubscriptionModalOpen(false)}
          feature={upgradeFeature}
        />

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

      <TeamUpgradeModal
        open={subscriptionModalOpen}
        onClose={() => setSubscriptionModalOpen(false)}
        feature={upgradeFeature}
      />

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
