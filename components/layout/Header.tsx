"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Tooltip,
  Modal,
  message,
} from "antd";
import {
  MessageOutlined,
  DownOutlined,
  UserOutlined,
  CrownOutlined,
  LogoutOutlined,
  CreditCardOutlined,
  MenuOutlined,
  TeamOutlined,
  CheckOutlined,
  SwapOutlined,
  LockOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import NotificationDropdown from "@/components/common/NotificationDropdown";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useAppContext, type TeamContextOption } from "@/context/AppContext";
import { usePro } from "@/hooks/usePro";

const { Header: AntHeader } = Layout;
const { Text } = Typography;

const PRIMARY = "#3CB371";

interface HeaderProps {
  onMenuClick?: () => void;
}

function truncateName(name: string | null | undefined, max = 15): string {
  if (!name) return "";
  if (name.length <= max) return name;
  return name.substring(0, max) + "…";
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { data: session } = useSession();
  const router = useRouter();
  const isMobile = useIsMobile();

  const user = session?.user;
  const userName = user?.name || "User";
  const userInitial = userName.charAt(0).toUpperCase();
  const { totalUnread } = useUnreadCount();

  const {
    activeContext,
    availableTeams,
    personalPlan: personalPlanInfo,
    switchToPersonal,
    switchToTeam,
    hydrated,
    effectivePlan,
    isTeamContext,
  } = useAppContext();
  const { currentApp, hasPro } = usePro();

  // Subscription-aware personal plan — wins over the stale JWT/session field.
  // (Backend `getTeamContext` resolves it from the active subscription row.)
  const personalPlan: "free" | "pro" | "team" = personalPlanInfo.currentVersion;

  // Chat-locked subscription popup — same styling as Sidebar's Teams popup
  const [chatLockedOpen, setChatLockedOpen] = useState(false);

  // App-scoped entitlement. Pro lifetime purchase grants Pro features INSIDE
  // Pro app, but does NOT count as a Team-app subscription. So in Team app,
  // the badge/locks must reflect Team-app state only (active team sub or
  // membership), not the Pro flag.
  const isProApp = currentApp === "pro";
  const inAppPlan: "free" | "pro" | "team" = isProApp
    ? // Pro app: Pro entitlement is the only signal
      personalPlanInfo.hasPro
      ? "pro"
      : "free"
    : // Team app: read Team-only signals — active subscription or team
      // context. Personal plan='pro' from a separate Pro purchase is ignored.
      isTeamContext
      ? activeContext.type === "team"
        ? activeContext.plan === "team"
          ? "team"
          : "free"
        : "free"
      : personalPlan === "team"
        ? "team"
        : "free";
  const isPro = inAppPlan === "pro" || inAppPlan === "team";
  const personalActive = activeContext.type === "personal";
  const hasTeamContext = availableTeams.length > 0;
  const activeTeamName =
    activeContext.type === "team" ? activeContext.teamName : "";
  // Chat unlocks for any user with the Pro lifetime entitlement, an
  // active Pro/Team plan in this app, or who's switched into a team
  // context. Pro purchase = all Team features (product spec).
  const hasChatAccess = hasPro || isPro || isTeamContext;

  // ─────────── Switch button click handler ───────────

  const showTeamPicker = () => {
    Modal.confirm({
      title: "Switch to which team?",
      icon: null,
      content: (
        <div>
          {availableTeams.map((team) => (
            <div
              key={team.teamId}
              onClick={() => {
                switchToTeam(team);
                message.success(
                  `Switched to ${team.teamName || "team"} context`,
                );
                Modal.destroyAll();
              }}
              style={{
                padding: "10px 12px",
                cursor: "pointer",
                borderRadius: 6,
                marginBottom: 6,
                border: "1px solid #e8e8e8",
                background: "#fff",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#F8F9FA";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#fff";
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13 }}>
                <TeamOutlined style={{ color: "#7C3AED", marginRight: 6 }} />
                {team.teamName || "Unnamed Team"}
              </div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                {team.owner?.name || "Owner"} ·{" "}
                {team.plan === "team"
                  ? "Team Plan"
                  : team.plan === "pro"
                    ? "Pro Plan"
                    : "Free Plan"}
              </div>
            </div>
          ))}
        </div>
      ),
      footer: null,
      maskClosable: true,
    });
  };

  const handleContextSwitch = () => {
    if (isTeamContext) {
      switchToPersonal();
      message.success("Switched to your personal account");
      return;
    }
    if (availableTeams.length === 1) {
      const only = availableTeams[0];
      switchToTeam(only);
      message.success(`Switched to ${only.teamName || "team"} context`);
      return;
    }
    showTeamPicker();
  };

  // ─────────── Chat icon click handler ───────────

  const handleChatClick = () => {
    if (!hasChatAccess) {
      setChatLockedOpen(true);
      return;
    }
    if (isMobile) {
      router.push("/dashboard/chat");
    } else {
      (window as any).__toggleChat?.();
    }
  };

  // ─────────── Account dropdown items (kept compact) ───────────

  const dropdownItems: MenuProps["items"] = [
    {
      key: "ctx-personal",
      label: (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <UserOutlined />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {truncateName(userName, isMobile ? 12 : 22)}{" "}
              <span style={{ color: "#8C8C8C", fontWeight: 400, fontSize: 11 }}>
                (you)
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#8C8C8C" }}>
              Personal ·{" "}
              {inAppPlan === "team"
                ? "Team Plan"
                : inAppPlan === "pro"
                  ? "Pro Plan"
                  : "Free Plan"}
            </div>
          </div>
          {personalActive && (
            <CheckOutlined style={{ color: PRIMARY, fontSize: 12 }} />
          )}
        </div>
      ),
      onClick: () => {
        if (!personalActive) {
          switchToPersonal();
          message.success("Switched to your personal account");
        }
      },
    },
    ...(availableTeams.length > 0
      ? [
          { type: "divider" as const },
          ...availableTeams.map((t: TeamContextOption) => {
            const isActive =
              activeContext.type === "team" &&
              activeContext.teamId === t.teamId;
            return {
              key: `ctx-team-${t.teamId}`,
              label: (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <TeamOutlined style={{ color: "#7C3AED" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: isMobile ? 140 : 220,
                      }}
                    >
                      {truncateName(t.teamName, isMobile ? 12 : 22)}
                    </div>
                    <div style={{ fontSize: 11, color: "#8C8C8C" }}>
                      {t.plan === "team"
                        ? "Team Plan"
                        : t.plan === "pro"
                          ? "Pro Plan"
                          : "Free Plan"}{" "}
                      · {isActive ? "Active" : "Switch"}
                    </div>
                  </div>
                  {isActive && (
                    <CheckOutlined style={{ color: PRIMARY, fontSize: 12 }} />
                  )}
                </div>
              ),
              onClick: () => {
                if (!isActive) {
                  switchToTeam(t);
                  message.success(
                    `Switched to ${t.teamName || "team"} context`,
                  );
                }
              },
            };
          }),
        ]
      : []),
    { type: "divider" as const },
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
      key: "billing",
      icon: <CreditCardOutlined />,
      label: "Billing & Transactions",
      onClick: () => router.push("/dashboard/settings/billing"),
    },
    { type: "divider" as const },
    {
      key: "logout",
      icon: <LogoutOutlined style={{ color: "#FF4D4F" }} />,
      label: <span style={{ color: "#FF4D4F" }}>Log out</span>,
      onClick: () => signOut(),
    },
  ];

  // ─────────── Render ───────────

  return (
    <>
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
          {isMobile && onMenuClick && (
            <Button
              type="text"
              icon={<MenuOutlined style={{ fontSize: 20 }} />}
              onClick={onMenuClick}
              style={{
                padding: 0,
                width: 40,
                height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            />
          )}

          <Link
            href="/dashboard"
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
            }}
          >
            <img
              src="/images/image.png"
              alt="ValueChart Logo"
              style={{ height: isMobile ? 32 : 40, width: "auto" }}
            />
          </Link>
        </div>

        {/* Right side */}
        <Space size={isMobile ? 8 : 12} align="center">
          {/* Chat icon — locked when no chat access */}
          <Tooltip
            title={
              hasChatAccess
                ? undefined
                : "Chat requires a Team plan — switch to a team context or upgrade"
            }
          >
            <div
              onClick={handleChatClick}
              style={{
                display: "flex",
                alignItems: "center",
                position: "relative",
                cursor: "pointer",
                opacity: hasChatAccess ? 1 : 0.7,
              }}
            >
              <Badge
                count={hasChatAccess ? totalUnread : 0}
                size="small"
                offset={[2, -2]}
                style={{ backgroundColor: PRIMARY }}
              >
                <MessageOutlined style={{ fontSize: 20, color: "#8C8C8C" }} />
              </Badge>
              {!hasChatAccess && (
                <LockOutlined
                  style={{
                    position: "absolute",
                    bottom: -3,
                    right: -6,
                    fontSize: 9,
                    color: "#fff",
                    background: "#FF7875",
                    borderRadius: "50%",
                    padding: 2,
                    lineHeight: 1,
                  }}
                />
              )}
            </div>
          </Tooltip>

          <NotificationDropdown />

          {/* Plan badge — reflects in-app plan (Pro app shows Pro state,
              Team app shows Team-subscription state — they don't bleed).
              Free users see a "Free Plan" tag that links to upgrade. */}
          {!isMobile && (
            <span className="plan-badge">
              {isPro ? (
                <Tag
                  color={hydrated && inAppPlan === "team" ? "purple" : "gold"}
                  style={{ marginRight: 0 }}
                >
                  {hydrated && inAppPlan === "team" ? "Team Plan" : "Pro Plan"}
                </Tag>
              ) : (
                <Tag
                  color="default"
                  style={{ marginRight: 0, cursor: "pointer" }}
                  onClick={() => router.push("/dashboard/subscription")}
                >
                  Free Plan
                </Tag>
              )}
            </span>
          )}

          {/* Switch button removed — context switching lives inside the
              user dropdown (Personal / available teams). */}

          {/* User dropdown — truncated name + tiny "Team context" subtitle */}
          <Dropdown
            menu={{ items: dropdownItems }}
            trigger={["click"]}
            placement={isMobile ? "bottom" : "bottomRight"}
            overlayStyle={{ maxWidth: isMobile ? 'calc(100vw - 24px)' : undefined }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: isMobile ? 4 : 8,
                cursor: "pointer",
              }}
            >
              <Avatar
                style={{ backgroundColor: PRIMARY, verticalAlign: "middle" }}
                size="small"
              >
                {userInitial}
              </Avatar>
              {!isMobile && (
                <div
                  className="user-name-text"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    lineHeight: 1.1,
                    maxWidth: 130,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: 130,
                      fontWeight: 500,
                    }}
                  >
                    {truncateName(userName, 15)}
                  </Text>
                  {hydrated && isTeamContext && (
                    <Text
                      style={{
                        fontSize: 10,
                        color: "#7C3AED",
                        lineHeight: 1,
                        marginTop: 2,
                      }}
                    >
                      {activeTeamName
                        ? `Team: ${truncateName(activeTeamName, 14)}`
                        : "Team context"}
                    </Text>
                  )}
                </div>
              )}
              <DownOutlined style={{ fontSize: 10, color: "#8C8C8C" }} />
            </div>
          </Dropdown>
        </Space>
      </AntHeader>

      <Modal
        open={chatLockedOpen}
        onCancel={() => setChatLockedOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setChatLockedOpen(false)}>
            Cancel
          </Button>,
          hasTeamContext && (
            <Button
              key="switch"
              onClick={() => {
                setChatLockedOpen(false);
                handleContextSwitch();
              }}
            >
              Switch to team
            </Button>
          ),
          <Button
            key="plans"
            type="primary"
            onClick={() => {
              setChatLockedOpen(false);
              router.push("/dashboard/subscription");
            }}
            style={{ backgroundColor: PRIMARY, borderColor: PRIMARY }}
          >
            View Plans
          </Button>,
        ]}
        centered
        width={420}
        zIndex={1200}
      >
        <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
          <MessageOutlined
            style={{ fontSize: 40, color: PRIMARY, marginBottom: 16 }}
          />
          <h3 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 600 }}>
            Chat requires a Team plan
          </h3>
          <p style={{ color: "#595959", margin: 0, fontSize: 14 }}>
            {hasTeamContext
              ? "Switch into your team context to use Chat with team members, or upgrade your personal plan."
              : "Subscribe to a Team plan (or have a team owner invite you) to message members, share flows, and collaborate."}
          </p>
        </div>
      </Modal>
    </>
  );
};

export default Header;
