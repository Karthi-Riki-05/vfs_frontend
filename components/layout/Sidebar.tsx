"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { logout } from "@/lib/logout";
import { Layout } from "antd";
import {
  Home,
  Clock,
  Workflow,
  Shapes as ShapesIcon,
  Users,
  User,
  MessageCircle,
  FolderKanban,
  Star,
  Trash2,
  CreditCard,
  Settings,
  HelpCircle,
  Plus,
  Crown,
  LogOut,
  Sparkles,
  X,
} from "lucide-react";
import { aiApi } from "@/api/ai.api";
import api from "@/lib/axios";
import { usePathname, useRouter } from "next/navigation";
import { createNewFlow } from "@/lib/flow";
import { usePro } from "@/hooks/usePro";
import { useDeviceMode } from "@/hooks/useDeviceMode";
import { useAppContext } from "@/context/AppContext";
import { useIsMobile, useIsTablet } from "@/hooks/useMediaQuery";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { getLogoForApp } from "@/lib/getLogo";
import TeamUpgradeModal from "@/components/common/TeamUpgradeModal";
import NavTile from "./NavTile";
import SidebarTeamSwitcher from "./SidebarTeamSwitcher";

const { Sider } = Layout;

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
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const { currentApp, loading: proLoading } = usePro();
  const { isWeb, isMobileApp } = useDeviceMode();
  const { isTeamContext, effectivePlan } = useAppContext();
  const { data: session } = useSession();
  const { totalUnread } = useUnreadCount(currentApp === "pro" ? "pro" : "team");
  const sessionHasTeamAccess = (session?.user as any)?.hasTeamAccess ?? false;

  // Lock is driven by the ACTIVE context, not by whether invitations exist.
  // (See product spec in git history — Pro lifetime does NOT unlock Team app
  // chat; access requires an active team subscription or a team context.)
  const isProApp = currentApp === "pro";
  const hasTeamFeatures =
    proLoading ||
    isProApp ||
    isTeamContext ||
    effectivePlan === "team" ||
    sessionHasTeamAccess;

  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<"teams" | "chat">(
    "teams",
  );
  const [checkingTeamsAccess, setCheckingTeamsAccess] = useState(false);

  const getSelectedKey = () => {
    if (pathname.startsWith("/dashboard/recents")) return "recents";
    if (pathname.startsWith("/dashboard/favourites")) return "favourites";
    if (pathname.startsWith("/dashboard/flows")) return "flows";
    if (pathname.startsWith("/dashboard/shapes")) return "shapes";
    if (pathname.startsWith("/dashboard/teams")) return "teams";
    if (pathname.startsWith("/dashboard/chat")) return "chat";
    if (pathname.startsWith("/dashboard/projects")) return "projects";
    if (pathname.startsWith("/dashboard/trash")) return "trash";
    if (pathname.startsWith("/dashboard/support")) return "support";
    if (pathname.startsWith("/dashboard/subscription")) return "subscription";
    if (pathname.startsWith("/dashboard/settings/billing")) return "billing";
    if (pathname.startsWith("/dashboard/settings")) return "settings";
    if (pathname === "/dashboard" || pathname === "/dashboard/team")
      return "dashboard";
    return "";
  };
  const sel = getSelectedKey();

  const handleNavClick = () => {
    if (isMobileDrawer && onMobileClose) onMobileClose();
  };

  const handleCreateFlow = () => {
    createNewFlow();
    handleNavClick();
  };

  // App-switcher (Team ⇄ Pro). A bare router.push can't switch apps here —
  // the sidebar/data scope is driven by sessionStorage `vc_app_context`, which
  // DashboardLayout reconciles into `currentApp` on load. So we set the context
  // first, then do a full navigation so the reconcile effect runs fresh.
  const switchToApp = (mode: "team" | "pro") => {
    // No-op if already in this app — avoids a redundant full-page reload.
    if (mode === (isProApp ? "pro" : "team")) return;
    try {
      sessionStorage.setItem("vc_app_context", mode);
    } catch {
      /* sessionStorage may be blocked in restricted WebViews */
    }
    window.location.href =
      mode === "pro" ? "/dashboard/pro" : "/dashboard/team";
  };

  const handleTeamsClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Pro app shell or active team context = full team access.
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
      if (
        subData?.hasSubscription &&
        (subData?.status === "active" || subData?.status === "cancelling")
      ) {
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

  const handleChatClick = (e: React.MouseEvent) => {
    e.preventDefault();
    handleNavClick();
    if (hasTeamFeatures) {
      // Mobile/tablet have no docked chat column — go to the full-screen page.
      if (isMobile || isTablet) router.push("/dashboard/chat");
      else (window as any).__toggleChat?.();
    } else {
      setUpgradeFeature("chat");
      setSubscriptionModalOpen(true);
    }
  };

  const variant: "desktop" | "drawer" = isMobileDrawer ? "drawer" : "desktop";
  const railCollapsed = !isMobileDrawer && collapsed;

  // Drawer hero: live AI-credit balance for the plan pill (drawer only).
  const [credits, setCredits] = useState<number | null>(null);
  useEffect(() => {
    if (!isMobileDrawer) return;
    const fetchCredits = async () => {
      try {
        const res = await aiApi.getCredits();
        const d = res.data?.data || res.data || {};
        const total =
          d.totalCredits ?? d.balance?.totalCredits ?? d.credits ?? null;
        if (typeof total === "number") setCredits(total);
      } catch {
        /* keep last known value */
      }
    };
    fetchCredits();
    window.addEventListener("aiCreditsChanged", fetchCredits);
    return () => window.removeEventListener("aiCreditsChanged", fetchCredits);
  }, [isMobileDrawer]);

  const planLabel = effectivePlan === "team" ? "Team Plan" : "Free Plan";

  // Drawer avatar: the uploaded profile photo lives on the user record, not in
  // the NextAuth JWT — so the session image goes stale after an avatar change.
  // Seed from the session, then fetch the live value and refresh on the
  // `userAvatarChanged` event the Settings page dispatches after an upload.
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    (session?.user?.image as string) || null,
  );
  useEffect(() => {
    if (!isMobileDrawer) return;
    const fetchAvatar = async () => {
      try {
        const res = await api.get("/users/me");
        const d = res.data?.data || res.data || {};
        const url = d.image || d.avatar || d.photo || null;
        if (url) setAvatarUrl(url);
      } catch {
        /* keep last known value */
      }
    };
    fetchAvatar();
    const onChange = (e: Event) => {
      const url = (e as CustomEvent<{ url?: string }>).detail?.url;
      if (url) setAvatarUrl(url);
      else fetchAvatar();
    };
    window.addEventListener("userAvatarChanged", onChange);
    return () => window.removeEventListener("userAvatarChanged", onChange);
  }, [isMobileDrawer]);
  const hasAvatar =
    typeof avatarUrl === "string" && avatarUrl.trim().length > 0;

  // ─────────── Create-a-Flow pill ───────────
  const createPill = (
    <button
      type="button"
      onClick={handleCreateFlow}
      className="w-full h-11 rounded-2xl bg-primary text-white font-bold text-sm inline-flex items-center justify-center gap-2 shadow-[var(--shadow-fab)] hover:scale-[1.02] transition"
      aria-label="Create a Flow"
    >
      <Plus className="w-4 h-4" />
      {!railCollapsed && <span>Create a Flow</span>}
    </button>
  );

  // ─────────── App switcher (ValueChart ↔ PRO) ───────────
  // Segmented toggle matching new_design SideNav (two equal tab buttons).
  // Shown ONLY on a real desktop web browser. Hidden inside the native mobile
  // app. `useDeviceMode` is now the single source of truth: it resolves the
  // native shell from the `ValueChartsMobile/*` User-Agent signature (with the
  // legacy `?app=`/vc_device_mode flag folded in as a backward-compat fallback,
  // covering restricted WebViews where sessionStorage is blocked).
  // Visibility: ANY web browser — desktop AND mobile web. The Team|Pro
  // directory switcher must stay reachable on small screens for mobile-web
  // users (they are NOT in the native app). It is hidden ONLY inside the native
  // mobile app shell (locked to a single variant) and when the rail is
  // collapsed. On mobile web the sidebar renders as a drawer (isMobileDrawer),
  // so railCollapsed is false and the switcher shows there too.
  const isMobileAppShell = isMobileApp;
  const isWebBrowser = isWeb && !isMobileAppShell;
  const proTeamSwitcher =
    !railCollapsed && isWebBrowser ? (
      <div data-testid="app-switcher" className="px-3 pt-3 pb-1">
        <div
          className="flex items-center gap-1 p-1 rounded-2xl bg-secondary/70 border border-border"
          role="tablist"
          aria-label="App mode"
        >
          {/* TEAM / ValueChart */}
          <button
            type="button"
            onClick={() => switchToApp("team")}
            title="Team"
            role="tab"
            aria-selected={!isProApp}
            className={`flex-1 h-9 rounded-xl text-[12px] font-bold inline-flex items-center justify-center gap-1.5 transition ${
              !isProApp
                ? "bg-card text-primary-deep shadow"
                : "bg-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Team
          </button>
          {/* PRO */}
          <button
            type="button"
            onClick={() => switchToApp("pro")}
            title="ValueChart Pro"
            role="tab"
            aria-selected={isProApp}
            className={`flex-1 h-9 rounded-xl text-[12px] font-bold inline-flex items-center justify-center gap-1.5 transition ${
              isProApp
                ? "bg-[var(--orange)] text-white shadow"
                : "bg-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="w-3.5 h-3.5" /> PRO
          </button>
        </div>
      </div>
    ) : null;

  // ─────────── Nav rows ───────────
  const nav = (
    <nav className="flex-1 overflow-y-auto hide-scrollbar px-2 pb-3 pt-2">
      <NavTile
        icon={Home}
        label="Dashboard"
        href="/dashboard/team"
        active={sel === "dashboard"}
        collapsed={railCollapsed}
        variant={variant}
        onClick={handleNavClick}
      />
      <NavTile
        icon={Clock}
        label="Recent"
        href="/dashboard/recents"
        active={sel === "recents"}
        collapsed={railCollapsed}
        variant={variant}
        onClick={handleNavClick}
      />
      <NavTile
        icon={Workflow}
        label="Flows"
        href="/dashboard/flows"
        active={sel === "flows"}
        collapsed={railCollapsed}
        variant={variant}
        onClick={handleNavClick}
      />
      <NavTile
        icon={ShapesIcon}
        label="Shapes"
        href="/dashboard/shapes"
        active={sel === "shapes"}
        collapsed={railCollapsed}
        variant={variant}
        onClick={handleNavClick}
      />
      <NavTile
        icon={Users}
        label="Teams"
        active={sel === "teams"}
        collapsed={railCollapsed}
        variant={variant}
        locked={!hasTeamFeatures}
        onClick={handleTeamsClick}
        title={checkingTeamsAccess ? "Checking access…" : "Teams"}
      />
      <NavTile
        icon={MessageCircle}
        label="Chat"
        active={sel === "chat"}
        collapsed={railCollapsed}
        variant={variant}
        locked={!hasTeamFeatures}
        badge={hasTeamFeatures ? totalUnread : undefined}
        onClick={handleChatClick}
      />
      <NavTile
        icon={FolderKanban}
        label="All Projects"
        href="/dashboard/projects"
        active={sel === "projects"}
        collapsed={railCollapsed}
        variant={variant}
        onClick={handleNavClick}
      />
      <NavTile
        icon={Star}
        label="Favourites"
        href="/dashboard/favourites"
        active={sel === "favourites"}
        collapsed={railCollapsed}
        variant={variant}
        onClick={handleNavClick}
      />
      <NavTile
        icon={Trash2}
        label="Trash"
        href="/dashboard/trash"
        active={sel === "trash"}
        collapsed={railCollapsed}
        variant={variant}
        onClick={handleNavClick}
      />
      <NavTile
        icon={CreditCard}
        label="Subscription"
        href="/dashboard/subscription"
        active={sel === "subscription"}
        collapsed={railCollapsed}
        variant={variant}
        onClick={handleNavClick}
      />
      <NavTile
        icon={CreditCard}
        label="Billing"
        href="/dashboard/settings/billing"
        active={sel === "billing"}
        collapsed={railCollapsed}
        variant={variant}
        onClick={handleNavClick}
      />
      <NavTile
        icon={Settings}
        label="Settings"
        href="/dashboard/settings"
        active={sel === "settings"}
        collapsed={railCollapsed}
        variant={variant}
        onClick={handleNavClick}
      />
      <NavTile
        icon={HelpCircle}
        label="Get Support"
        href="/dashboard/support"
        active={sel === "support"}
        collapsed={railCollapsed}
        variant={variant}
        onClick={handleNavClick}
      />
    </nav>
  );

  // ─────────── Log-out footer (new_design SideNav foot) ───────────
  const footer = (
    <div className="border-t border-border p-2">
      <button
        type="button"
        onClick={() => logout({ callbackUrl: "/login" })}
        title="Log out"
        className="appearance-none cursor-pointer border-0 bg-transparent w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-secondary/60 transition"
      >
        <div className="w-9 h-9 shrink-0 rounded-xl bg-secondary text-[var(--coral)] flex items-center justify-center">
          <LogOut className="w-4 h-4" />
        </div>
        {!railCollapsed && (
          <span className="text-[14px] font-medium text-foreground">
            Log out
          </span>
        )}
      </button>
    </div>
  );

  // ─────────── Mobile drawer ───────────
  if (isMobileDrawer) {
    const name = session?.user?.name || "User";
    const email = session?.user?.email || "";
    return (
      <>
        <div className="tw flex flex-col bg-card h-full">
          {/* Gradient profile hero (prototype Drawer head) */}
          <div
            className="bg-gradient-to-br from-primary to-primary-deep p-5 text-white shrink-0"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 28px)" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-full bg-white/15 ring-2 ring-white/30 flex items-center justify-center text-white font-bold text-lg shrink-0 overflow-hidden">
                  {hasAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl as string}
                      alt={name}
                      className="w-full h-full object-cover"
                      onError={() => setAvatarUrl(null)}
                    />
                  ) : (
                    name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-[15px] truncate">{name}</div>
                  <div className="text-xs text-white/80 truncate">{email}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={onMobileClose}
                aria-label="Close menu"
                className="appearance-none cursor-pointer border-0 w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 text-xs font-semibold">
              <Crown className="w-3.5 h-3.5 text-[#FFD27A]" /> {planLabel}
              {credits != null && ` · ${credits} AI credits`}
            </div>
          </div>

          {proTeamSwitcher}
          <SidebarTeamSwitcher />
          {/* No create button here on mobile — the FAB (bottom-right) is the
              single create entry point on mobile/PWA. */}
          {nav}

          {/* Log out + version footer (prototype Drawer foot) */}
          <div className="border-t border-border">
            <button
              type="button"
              onClick={() => logout({ callbackUrl: "/login" })}
              className="appearance-none cursor-pointer border-0 bg-transparent hover:bg-secondary/60 w-full flex items-center gap-3 px-5 py-3 text-left transition"
            >
              <div className="w-9 h-9 rounded-xl bg-secondary text-[var(--coral)] flex items-center justify-center">
                <LogOut className="w-4 h-4" />
              </div>
              <span className="text-[14px] font-medium text-foreground">
                Log out
              </span>
            </button>
            <div className="hidden lg:block px-5 pb-4 pt-1 text-[11px] text-muted-foreground">
              Value Charts · v1.0.0 ·{" "}
              <span className="text-primary-deep font-semibold">
                We Add Value To Your Business
              </span>
            </div>
          </div>
        </div>

        <TeamUpgradeModal
          open={subscriptionModalOpen}
          onClose={() => setSubscriptionModalOpen(false)}
          feature={upgradeFeature}
        />
      </>
    );
  }

  // ─────────── Desktop / tablet rail (keep Ant Sider for layout math) ───────────
  return (
    <Sider
      width={256}
      collapsedWidth={60}
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      trigger={null}
      style={{
        background: "#FFFFFF",
        borderRight: "1px solid #E5EBE8",
        height: "calc(100dvh - 56px)",
        position: "fixed",
        top: 56,
        left: 0,
        zIndex: 50,
        overflow: "hidden",
      }}
    >
      <div className="tw flex flex-col h-full bg-card">
        {proTeamSwitcher}
        <div className={`p-3 ${railCollapsed ? "px-2" : ""}`}>{createPill}</div>
        {nav}
        {footer}
      </div>

      <TeamUpgradeModal
        open={subscriptionModalOpen}
        onClose={() => setSubscriptionModalOpen(false)}
        feature={upgradeFeature}
      />
    </Sider>
  );
};

export default Sidebar;
