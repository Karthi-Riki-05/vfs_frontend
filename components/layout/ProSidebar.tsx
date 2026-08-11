"use client";

import React, { useState, useEffect } from "react";
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
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { logout } from "@/lib/logout";
import { aiApi } from "@/api/ai.api";
import { createNewFlow } from "@/lib/flow";
import { useDeviceMode } from "@/hooks/useDeviceMode";
import { useIsChatColumnHidden } from "@/hooks/useMediaQuery";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { usePro } from "@/hooks/usePro";
import { useAiCredits } from "@/hooks/useAiCredits";
import NavTile from "./NavTile";
import SidebarTeamSwitcher from "./SidebarTeamSwitcher";

const { Sider } = Layout;

interface ProSidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  isMobileDrawer?: boolean;
  onMobileClose?: () => void;
}

const ProSidebar: React.FC<ProSidebarProps> = ({
  collapsed,
  onCollapse,
  isMobileDrawer,
  onMobileClose,
}) => {
  const pathname = usePathname() || "";
  const router = useRouter();
  const chatColumnHidden = useIsChatColumnHidden();
  const { data: session } = useSession();
  const { isWeb, isMobileApp } = useDeviceMode();
  // ProSidebar renders ONLY in the Pro app (DashboardLayout: isProBrand ?
  // ProSidebar : Sidebar), so its badge must read the PRO unread store. The
  // bare useUnreadCount() defaulted to "team": the Pro sidebar showed the TEAM
  // store's count and never cleared when the user read PRO chats (RightChatColumn
  // marks read in the "pro" store) — the two badges were reading different
  // stores. See bug-132.
  const { totalUnread } = useUnreadCount("pro");

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
    if (pathname === "/dashboard" || pathname === "/dashboard/pro")
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

  const handleChatClick = (e: React.MouseEvent) => {
    e.preventDefault();
    handleNavClick();
    // Below 1180px there's no docked chat column — go to the full-screen page.
    if (chatColumnHidden) router.push("/dashboard/chat");
    else (window as any).__toggleChat?.();
  };

  // App-switcher (Team ⇄ Pro) — the Pro app's copy of the Sidebar switcher.
  // Keep the two in step: this is the Pro→Team half of the same control.
  //
  // Order is load-bearing: SWITCH FIRST, then navigate ONCE. Navigating first
  // and letting DashboardLayout's reconcile effect notice the mismatch cost a
  // SECOND full page load ~12s later (measured: 4 navigations and 92 requests
  // for one Pro→Team click), which is the double skeleton flash and, after a
  // few toggles, "Too many requests" from the 600-req/2-min limiter.
  const switchToApp = async (mode: "team" | "pro") => {
    // Already in the Pro app — clicking PRO is a no-op (avoids a reload).
    if (mode === "pro") return;
    if (switchingApp) return; // ignore double-clicks while the PUT is in flight
    setSwitchingApp(true);
    try {
      // Team is the API's "free" app. switchApp also resets the workspace to
      // personal and rewrites vc_app_context.
      const ok = await switchApp("free");
      if (!ok) {
        setSwitchingApp(false);
        return;
      }
    } catch {
      setSwitchingApp(false);
      return;
    }
    try {
      sessionStorage.setItem("vc_app_context", "team");
    } catch {
      /* sessionStorage may be blocked in restricted WebViews */
    }
    window.location.href = "/dashboard/team";
  };

  const variant: "desktop" | "drawer" = isMobileDrawer ? "drawer" : "desktop";
  const railCollapsed = !isMobileDrawer && collapsed;

  // Drawer hero: live AI-credit balance for the plan pill (drawer only).
  const { switchApp } = usePro();
  // True while the switch PUT is in flight — keeps the toggle from looking
  // frozen and blocks the double-click that would queue two switches.
  const [switchingApp, setSwitchingApp] = useState(false);
  // OPT-3: shared store (see hooks/useAiCredits) — this was the Pro-app twin of
  // the Sidebar's identical fetch.
  const { total: credits } = useAiCredits();

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

  // Segmented toggle matching new_design SideNav (two equal tab buttons).
  // Shown ONLY on a real desktop web browser. Hidden inside the native mobile
  // app. `useDeviceMode` is the single source of truth: it resolves the native
  // shell from the `ValueChartsMobile/*` User-Agent signature (with the legacy
  // `?app=`/vc_device_mode flag folded in as a backward-compat fallback,
  // covering restricted WebViews where sessionStorage is blocked).
  // Visibility: ANY web browser — desktop AND mobile web. Mobile-web users must
  // be able to switch directories from the Pro app back to Team. Hidden ONLY
  // inside the native mobile app shell and when the rail is collapsed.
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
            disabled={switchingApp}
            title="Team"
            role="tab"
            aria-selected={false}
            aria-busy={switchingApp}
            className={`flex-1 h-9 rounded-xl text-[12px] font-bold inline-flex items-center justify-center gap-1.5 transition disabled:cursor-wait ${
              switchingApp
                ? "bg-card text-primary-deep shadow"
                : "bg-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Team
          </button>
          {/* PRO (active) */}
          <button
            type="button"
            onClick={() => switchToApp("pro")}
            title="ValueChart Pro"
            role="tab"
            aria-selected={true}
            className="flex-1 h-9 rounded-xl text-[12px] font-bold inline-flex items-center justify-center gap-1.5 transition bg-[var(--orange)] text-white shadow"
          >
            <User className="w-3.5 h-3.5" /> PRO
          </button>
        </div>
      </div>
    ) : null;

  const nav = (
    <nav className="flex-1 overflow-y-auto hide-scrollbar px-2 pb-3 pt-2">
      <NavTile
        icon={Home}
        label="Dashboard"
        href="/dashboard/pro"
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
        href="/dashboard/teams"
        active={sel === "teams"}
        collapsed={railCollapsed}
        variant={variant}
        onClick={handleNavClick}
      />
      <NavTile
        icon={MessageCircle}
        label="Chat"
        active={sel === "chat"}
        collapsed={railCollapsed}
        variant={variant}
        // bug-133: gate REMOVED. The old `session.hasTeamAccess` was a PERSONAL
        // signal (the bug-106 class): a member — or a Pro owner who doesn't own a
        // team — had it false, so the Pro sidebar showed NO chat badge while the
        // header's chat icon (gated on the workspace's answer) showed the green
        // unread dot for the same messages. In the Pro app chat is always
        // available — Sidebar's workspace-based `hasTeamFeatures` is true here via
        // its `isProApp` term — so the badge simply tracks unread. NavTile hides
        // it at 0.
        badge={totalUnread}
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

  if (isMobileDrawer) {
    const name = session?.user?.name || "User";
    const email = session?.user?.email || "";
    return (
      <div className="tw flex flex-col bg-card h-full">
        {/* Gradient profile hero (prototype Drawer head — Pro orange brand) */}
        <div
          className="bg-gradient-to-br from-[var(--orange)] to-[#D97706] p-5 text-white shrink-0"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 28px)" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {(session?.user as any)?.image ? (
                <img
                  src={(session?.user as any).image}
                  alt={name}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-white/30 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white/15 ring-2 ring-white/30 flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
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
            <Crown className="w-3.5 h-3.5 text-[#FFD27A]" /> Pro Plan
            {credits != null && ` · ${credits} AI credits`}
          </div>
        </div>

        {proTeamSwitcher}
        <SidebarTeamSwitcher />
        {!isMobileApp && <div className="px-3 pt-3">{createPill}</div>}
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
    );
  }

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
        {/* Manual collapse/expand toggle — see Sidebar.tsx: the Sider has
            trigger={null} and collapse is otherwise automatic only, so a
            tablet-width rail was stuck icon-only with no way to expand. */}
        <div
          className={`flex ${railCollapsed ? "justify-center px-2" : "justify-end px-3"} pt-2`}
        >
          <button
            type="button"
            onClick={() => onCollapse(!collapsed)}
            aria-label={railCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!railCollapsed}
            title={railCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="appearance-none cursor-pointer border-0 bg-transparent w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary/60 transition"
          >
            {railCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>
        {proTeamSwitcher}
        <SidebarTeamSwitcher collapsed={railCollapsed} />
        {!isMobileApp && (
          <div className={`p-3 ${railCollapsed ? "px-2" : ""}`}>
            {createPill}
          </div>
        )}
        {nav}
        {footer}
      </div>
    </Sider>
  );
};

export default ProSidebar;
