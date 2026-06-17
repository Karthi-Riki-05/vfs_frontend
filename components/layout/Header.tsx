"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getLogoForApp, getForcedMode } from "@/lib/getLogo";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Dropdown, Tag, Button, Tooltip, Modal, message } from "antd";
import {
  MessageOutlined,
  DownOutlined,
  UserOutlined,
  CrownOutlined,
  LogoutOutlined,
  CreditCardOutlined,
  TeamOutlined,
  CheckOutlined,
  SwapOutlined,
  LockOutlined,
} from "@ant-design/icons";
// New-design TopBar uses lucide icons (not Ant) — see new_design/src/routes/index.tsx.
import { Menu as MenuIcon, MessageCircle } from "lucide-react";
import type { MenuProps } from "antd";
import NotificationDropdown from "@/components/common/NotificationDropdown";
import TeamContextSwitcher from "@/components/layout/TeamContextSwitcher";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import {
  useIsMobile,
  useIsTablet,
  useIsWideMobile,
} from "@/hooks/useMediaQuery";
import { useAppContext, type TeamContextOption } from "@/context/AppContext";
import { usePro } from "@/hooks/usePro";
import { useAiBilling } from "@/context/AiBillingContext";

// New-design primary (#34A881) — see DESIGN.md token table.
const PRIMARY = "#34A881";

interface HeaderProps {
  onMenuClick?: () => void;
}

function truncateName(name: string | null | undefined, max = 15): string {
  if (!name) return "";
  if (name.length <= max) return name;
  return name.substring(0, max) + "…";
}

// New-design TopBar shows the current screen name on desktop (prototype L264).
// Map the route → human title. Order matters: most-specific prefix first.
function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/dashboard/settings/billing")) return "Billing";
  if (pathname.startsWith("/dashboard/settings")) return "Profile";
  if (pathname.startsWith("/dashboard/recents")) return "Recent";
  if (pathname.startsWith("/dashboard/flows")) return "Flows";
  if (pathname.startsWith("/dashboard/shapes")) return "Shapes";
  if (pathname.startsWith("/dashboard/teams")) return "Teams";
  if (pathname.startsWith("/dashboard/chat")) return "Chat";
  if (pathname.startsWith("/dashboard/projects")) return "All Projects";
  if (pathname.startsWith("/dashboard/favourites")) return "Favourites";
  if (pathname.startsWith("/dashboard/trash")) return "Trash";
  if (pathname.startsWith("/dashboard/subscription")) return "Subscription";
  if (pathname.startsWith("/dashboard/support")) return "Get Support";
  if (pathname.startsWith("/dashboard/notifications")) return "Notifications";
  if (pathname.startsWith("/dashboard")) return "Dashboard";
  return "";
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname() || "";
  const pageTitle = getPageTitle(pathname);
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isWideMobile = useIsWideMobile();

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
  const { currentApp, loading: proLoading } = usePro();
  const sessionHasTeamAccess = (session?.user as any)?.hasTeamAccess ?? false;

  // AI-billing / team-context switcher — surfaced as a standalone navbar pill
  // (moved out of the account dropdown; the avatar now navigates to Profile).
  const {
    options: billingOptions,
    activeBillingTeamId,
    hasTeams: hasBillingTeams,
  } = useAiBilling();
  const activeBilling =
    billingOptions.find((o) => o.teamId === activeBillingTeamId) ||
    billingOptions[0];

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
  // Forced app mode (sessionStorage) — read after mount to avoid an SSR
  // hydration mismatch on the logo Link href.
  const [forcedAppMode, setForcedAppMode] = useState<"pro" | "team" | null>(
    null,
  );
  useEffect(() => {
    setForcedAppMode(getForcedMode());
  }, []);
  // Logo click lands on the app-specific home (matches post-login redirect).
  const logoHref =
    isProApp || forcedAppMode === "pro"
      ? "/dashboard/pro"
      : forcedAppMode === "team"
        ? "/dashboard/team"
        : "/dashboard";
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
  // Same gate as Sidebar's hasTeamFeatures — keeps both surfaces consistent.
  // hasPro (lifetime $1) is excluded: Pro lifetime only unlocks Pro-app features,
  // not Team-app chat. Team-app chat access requires isTeamContext, an active
  // team subscription (effectivePlan === "team"), or a JWT-cached team flag.
  const hasChatAccess =
    proLoading ||
    isProApp ||
    isTeamContext ||
    effectivePlan === "team" ||
    sessionHasTeamAccess;

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
    // Mobile AND tablet: navigate to full-screen chat page
    // (chat column is hidden on tablet — no room with sidebar + content)
    if (isMobile || isTablet) {
      router.push("/dashboard/chat");
    } else {
      (window as any).__toggleChat?.();
    }
  };

  // ─────────── Render ───────────

  return (
    <>
      {/* Ported from new_design TopBar (prototype L242–270). Tailwind .tw shell,
          production logic preserved. Fixed 56px (h-14) to match DashboardLayout
          marginTop/paddingTop math. Desktop keeps the logo because the migrated
          Sidebar has no logo block yet (see DESIGN.md §4 shell note). */}
      <header className="tw fixed top-0 left-0 right-0 h-14 z-[90] flex items-center justify-between px-3 md:px-6 bg-card border-b border-border">
        {/* Left side — hamburger (mobile) + logo */}
        <div className="flex items-center gap-2 min-w-0">
          {isMobile && onMenuClick && (
            <button
              onClick={onMenuClick}
              aria-label="Open menu"
              className="md:hidden w-10 h-10 rounded-xl bg-transparent border-0 p-0 appearance-none cursor-pointer hover:bg-secondary flex items-center justify-center transition"
            >
              <MenuIcon className="w-5 h-5 text-foreground" />
            </button>
          )}

          <Link href={logoHref} className="flex items-center no-underline">
            <img
              src={getLogoForApp(currentApp)}
              alt="ValueChart Logo"
              // Logo bumped to 48px so it fills the 56px navbar and its width
              // lines the Profile divider up with the 220px sidebar border.
              className="h-12 w-auto object-contain"
              style={{ objectPosition: "left center", maxHeight: 48 }}
            />
          </Link>

          {/* Current-screen title — new_design TopBar (prototype L264). Desktop
              only; mobile keeps the logo alone. */}
          {pageTitle && (
            <span className="hidden md:block ml-3 pl-3 border-l border-border text-sm font-semibold text-foreground truncate">
              {pageTitle}
            </span>
          )}
        </div>

        {/* Right side — chat, notifications, plan badge, account */}
        <div className="flex items-center gap-0.5 md:gap-1 ml-auto">
          {/* Chat icon — locked when no chat access */}
          <Tooltip
            title={
              hasChatAccess
                ? undefined
                : "Chat requires a Team plan — switch to a team context or upgrade"
            }
          >
            <button
              onClick={handleChatClick}
              aria-label="Open chat"
              className="relative w-10 h-10 rounded-xl bg-transparent border-0 p-0 appearance-none cursor-pointer hover:bg-secondary flex items-center justify-center transition"
              style={{ opacity: hasChatAccess ? 1 : 0.7 }}
            >
              <MessageCircle className="w-5 h-5 text-foreground" />
              {hasChatAccess && totalUnread > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
              )}
              {!hasChatAccess && (
                <LockOutlined
                  style={{
                    position: "absolute",
                    bottom: 4,
                    right: 4,
                    fontSize: 9,
                    color: "#fff",
                    background: "#F85729",
                    borderRadius: "50%",
                    padding: 2,
                    lineHeight: 1,
                  }}
                />
              )}
            </button>
          </Tooltip>

          {/* Notifications — bell + dropdown (own component) */}
          <div className="flex items-center">
            <NotificationDropdown />
          </div>

          {/* Plan badge — reflects in-app plan (Pro app shows Pro state,
              Team app shows Team-subscription state — they don't bleed).
              Free users see a "Free Plan" tag that links to upgrade.
              Skeleton shown while proLoading to prevent Free Plan flash (Fix 5). */}
          {!isMobile && (
            <span className="plan-badge ml-1">
              {proLoading ? (
                <div className="inline-block w-[68px] h-[22px] rounded bg-[#f0f0f0]" />
              ) : isPro ? (
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

          {/* Context-switcher pill — moved out of the account dropdown so the
              avatar can navigate straight to Profile (new_design TopBar). Only
              shown when the user belongs to ≥1 team. Switching here changes the
              billed AI-credit pool only — never the data shown (DATA-LOSS-001). */}
          {hasBillingTeams && (
            <Dropdown
              trigger={["click"]}
              placement={isMobile ? "bottom" : "bottomRight"}
              dropdownRender={() => (
                <div
                  style={{
                    background: "#FFFFFF",
                    borderRadius: 8,
                    boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
                    overflow: "hidden",
                    minWidth: 240,
                  }}
                >
                  <TeamContextSwitcher />
                </div>
              )}
            >
              <button
                aria-label="Switch billing context"
                className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-primary-tint text-primary-deep text-xs font-semibold cursor-pointer border-0 appearance-none hover:opacity-90 transition"
              >
                <span className="truncate max-w-[120px]">
                  {activeBilling?.label || "Personal"}
                </span>
                <DownOutlined style={{ fontSize: 9 }} />
              </button>
            </Dropdown>
          )}

          {/* User avatar — plain round button → Profile (new_design TopBar L274).
              No name/caret/dropdown; account actions live in the sidebar
              (Subscription / Billing / Settings) and on the Profile page. */}
          <button
            onClick={() => router.push("/dashboard/settings")}
            aria-label="Open profile"
            className="ml-1 w-9 h-9 rounded-full bg-primary ring-2 ring-primary/20 flex items-center justify-center text-white text-sm font-bold cursor-pointer border-0 appearance-none hover:ring-primary/40 transition"
          >
            {userInitial}
          </button>
        </div>
      </header>

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
        width={
          isMobile
            ? Math.min(
                420,
                typeof window !== "undefined" ? window.innerWidth * 0.92 : 360,
              )
            : 420
        }
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
