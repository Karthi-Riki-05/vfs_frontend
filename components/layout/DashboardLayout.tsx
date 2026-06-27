"use client";

import React, { useState, useEffect, useRef } from "react";
import { Layout } from "antd";
import { usePathname } from "next/navigation";
import Header from "./Header";
import Sidebar from "./Sidebar";
import ProSidebar from "./ProSidebar";
import AIAssistant from "../ai/AIAssistant";
import RightChatColumn from "../chat/RightChatColumn";
import EnableNotificationsBanner from "../common/EnableNotificationsBanner";
import NativeFcmBridge from "../common/NativeFcmBridge";
import FloatingActionButton from "./FloatingActionButton";
import MobileBackButton from "@/components/shared/MobileBackButton";
import { usePro } from "@/hooks/usePro";
import {
  useIsMobile,
  useIsTablet,
  useIsWideMobile,
} from "@/hooks/useMediaQuery";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { AppContextLoader } from "./AppContextLoader";
import { useAppBrand } from "@/hooks/useAppBrand";

const { Content } = Layout;

// Extend window type for global chat toggle
declare global {
  interface Window {
    __toggleChat?: () => void;
    __openChat?: () => void;
    __setChatFullView?: (val: boolean) => void;
  }
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatFullView, setChatFullView] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [isContextReady, setIsContextReady] = useState(false);
  const [isFlowsReady, setIsFlowsReady] = useState(false);
  // Tracks whether the sidebar was auto-collapsed when chat/AI opened so we can
  // restore it when they close without clobbering a user-initiated collapse.
  const sidebarAutoCollapsedRef = useRef(false);
  const aiSidebarAutoCollapsedRef = useRef(false);
  const pathname = usePathname() || "";
  const {
    currentApp,
    forcedMode,
    hasPro,
    proPurchasedAt,
    switchApp,
    loading: proLoading,
  } = usePro();
  const forcedSwitchDone = useRef(false);

  // Listen for context/flows ready signals to drive the AppContextLoader
  useEffect(() => {
    const onContextReady = () => setIsContextReady(true);
    const onFlowsReady = () => setIsFlowsReady(true);
    window.addEventListener("vc-context-ready", onContextReady);
    window.addEventListener("vc-flows-ready", onFlowsReady);
    return () => {
      window.removeEventListener("vc-context-ready", onContextReady);
      window.removeEventListener("vc-flows-ready", onFlowsReady);
    };
  }, []);

  // Auto-switch to the forced app once usePro has resolved.
  // Reads sessionStorage directly (not forcedMode state) to avoid the race
  // where forcedMode state is still null when proLoading first flips to false.
  // forcedMode 'team' → API value 'free' (team shell = the free app).
  // forcedMode 'pro'  → API value 'pro'.
  // Note: Pro grant for ?app=pro users is handled by ProGuard (which runs
  // before this effect), so by the time this effect fires after a grant
  // reload, hasPro will already be true.
  useEffect(() => {
    if (proLoading || forcedSwitchDone.current) return;
    let mode: string | null = null;
    try {
      // sessionStorage is per-tab — reads this tab's app context, not a
      // value potentially overwritten by another tab (Fix 3).
      mode = sessionStorage.getItem("vc_app_context");
    } catch {}
    // console.log("[DashboardLayout] forced-switch effect:", { proLoading, forcedMode: mode, currentApp, hasPro, done: forcedSwitchDone.current });
    if (!mode || (mode !== "team" && mode !== "pro")) return;
    const target = mode === "pro" ? ("pro" as const) : ("free" as const);
    if (target === "pro" && !(hasPro && proPurchasedAt)) {
      // Grant not yet completed — ProGuard is handling it. Skip switch.
      // console.log("[DashboardLayout] skipping pro switch — awaiting Pro grant");
      forcedSwitchDone.current = true;
      return;
    }
    if (currentApp === target) {
      forcedSwitchDone.current = true;
      return;
    }
    forcedSwitchDone.current = true;
    (async () => {
      try {
        const switched = await switchApp(target);
        if (switched) window.location.reload();
      } catch (err) {
        console.error("[DashboardLayout] auto-switch failed:", err);
      }
    })();
  }, [proLoading, hasPro, proPurchasedAt, currentApp, switchApp]);
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isWideMobile = useIsWideMobile();
  // App SHELL brand (WebView UA), read post-mount. Declared here — above the
  // editor-page early return — so the hook order stays stable across renders.
  const brand = useAppBrand();

  // Flow editor pages: /dashboard/flows/SOME_ID (but NOT /dashboard/flows or /dashboard/flows/new)
  const isEditorPage = /^\/dashboard\/flows\/(?!new$)[a-zA-Z0-9_-]+$/.test(
    pathname,
  );

  // Hide chat column on editor/upgrade pages
  const hideChatColumn = isEditorPage || pathname?.includes("/upgrade-pro");
  // Standalone mobile chat page — suppress the floating FAB + AI button there
  // (they'd overlap the chat input/send).
  const isChatPage = pathname.includes("/dashboard/chat");
  // new_design canvas: the whole dashboard sits on the gray --background
  // (#F5F7F6) so white card surfaces gain contrast + elevation depth. Applied
  // app-wide (matches new_design; previously only /dashboard/settings used it).
  const contentBg = "#F5F7F6";

  // Expose toggle/open functions globally so header/sidebar/redirect can call them
  useEffect(() => {
    window.__toggleChat = () => setChatOpen((prev) => !prev);
    window.__openChat = () => setChatOpen(true);
    window.__setChatFullView = (val: boolean) => setChatFullView(val);
    return () => {
      delete window.__toggleChat;
      delete window.__openChat;
      delete window.__setChatFullView;
    };
  }, []);

  // Auto-collapse on tablet
  useEffect(() => {
    if (isTablet) setCollapsed(true);
  }, [isTablet]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // When chat opens on desktop, auto-collapse the sidebar so pages have room.
  // When chat closes, restore only if we were the ones who collapsed it.
  useEffect(() => {
    if (isMobile || isTablet) return;
    if (chatOpen) {
      setCollapsed((prev) => {
        if (!prev) sidebarAutoCollapsedRef.current = true;
        return true;
      });
    } else if (sidebarAutoCollapsedRef.current) {
      sidebarAutoCollapsedRef.current = false;
      setCollapsed(false);
    }
  }, [chatOpen, isMobile, isTablet]);

  // Dispatch chat panel events so FABs and AI button can hide themselves
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(chatOpen ? "chatPanelOpened" : "chatPanelClosed"),
    );
  }, [chatOpen]);

  // Listen to AI panel open/close events to track panel width for content margin
  useEffect(() => {
    const onOpen = () => setAiPanelOpen(true);
    const onClose = () => setAiPanelOpen(false);
    window.addEventListener("aiPanelOpened", onOpen);
    window.addEventListener("aiPanelClosed", onClose);
    return () => {
      window.removeEventListener("aiPanelOpened", onOpen);
      window.removeEventListener("aiPanelClosed", onClose);
    };
  }, []);

  // When AI panel opens on desktop, auto-collapse sidebar for room.
  useEffect(() => {
    if (isMobile || isTablet) return;
    if (aiPanelOpen) {
      setCollapsed((prev) => {
        if (!prev) aiSidebarAutoCollapsedRef.current = true;
        return true;
      });
    } else if (aiSidebarAutoCollapsedRef.current) {
      aiSidebarAutoCollapsedRef.current = false;
      setCollapsed(false);
    }
  }, [aiPanelOpen, isMobile, isTablet]);

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Close chat handlers
  const handleChatClose = () => {
    setChatOpen(false);
    setChatFullView(false);
  };

  const handleChatFullView = () => {
    setChatFullView((prev) => !prev);
  };

  // Editor page: render full-screen without sidebar/header, but include AI + Chat
  if (isEditorPage) {
    const showEditorChat = chatOpen && !isMobile;
    const editorChatWidth = showEditorChat && !chatFullView ? 430 : 0;

    return (
      <div style={{ width: "100vw", height: "100dvh", overflow: "hidden" }}>
        <div
          style={{
            width:
              chatFullView && chatOpen
                ? 0
                : `calc(100% - ${editorChatWidth}px)`,
            height: "100%",
            transition: "width 0.2s",
            overflow: "hidden",
            display: chatFullView && chatOpen ? "none" : undefined,
          }}
        >
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>

        {/* AI Assistant for editor */}
        <AIAssistant contentLeft={0} contentRight={editorChatWidth} />

        {/* Right chat column — normal mode */}
        {showEditorChat && !chatFullView && (
          <div
            style={{
              width: 430,
              height: "100dvh",
              position: "fixed",
              top: 0,
              right: 0,
              zIndex: 50,
            }}
          >
            <RightChatColumn
              onClose={handleChatClose}
              onFullView={handleChatFullView}
              isFullView={false}
            />
          </div>
        )}

        {/* Full view chat */}
        {chatOpen && chatFullView && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 60,
              background: "#fff",
            }}
          >
            <RightChatColumn
              onClose={handleChatClose}
              onFullView={handleChatFullView}
              isFullView={true}
            />
          </div>
        )}
      </div>
    );
  }

  // Choose sidebar based on the app SHELL (branding), NOT billing currentApp.
  // A Pro-entitled user opening the Team app reports currentApp="pro" until the
  // server reconcile completes, which previously rendered the Pro sidebar (and
  // its theme) inside the Team app. The shell type from the WebView UA is the
  // stable brand signal; fall back to currentApp only for genuine web visitors.
  const isProBrand =
    brand === "pro" || (brand === "web" && currentApp === "pro");
  console.log("[DashboardLayout] brand/currentApp:", {
    brand,
    currentApp,
    isProBrand,
  });
  const SidebarComponent = isProBrand ? ProSidebar : Sidebar;

  // Mobile: no fixed sidebar, use drawer. No right chat column on mobile.
  if (isMobile) {
    return (
      <AppContextLoader
        isContextReady={isContextReady}
        isFlowsReady={isFlowsReady}
        appMode={forcedMode}
      >
        <Layout style={{ minHeight: "100dvh" }}>
          <Header onMenuClick={() => setMobileOpen(true)} />

          {/* Mobile sidebar drawer */}
          <div
            className={`sidebar-backdrop ${mobileOpen ? "open" : ""}`}
            onClick={() => setMobileOpen(false)}
          />
          <div className={`sidebar-drawer ${mobileOpen ? "open" : ""}`}>
            <SidebarComponent
              collapsed={false}
              onCollapse={() => {}}
              isMobileDrawer
              onMobileClose={() => setMobileOpen(false)}
            />
          </div>

          <Content
            className="responsive-content bg-background"
            style={{
              padding: "16px",
              paddingTop: 56 + 16,
              paddingBottom: 140,
              minHeight: "calc(100dvh - 56px)",
            }}
          >
            <NativeFcmBridge />
            <EnableNotificationsBanner />
            <MobileBackButton />
            <ErrorBoundary>{children}</ErrorBoundary>
            {!isChatPage && <AIAssistant contentLeft={0} contentRight={0} />}
          </Content>
          <FloatingActionButton hidden={mobileOpen || isChatPage} />
        </Layout>
      </AppContextLoader>
    );
  }

  // Tablet and Desktop. 256px expanded matches the new_design lg:w-64 rail
  // (kept in lockstep with Sider width={256} in Sidebar/ProSidebar).
  const siderWidth = collapsed ? 60 : 256;
  // On tablet: hide right chat column (no room); chat button routes to /dashboard/chat
  const showChatColumn = !hideChatColumn && chatOpen && !isTablet;
  const chatColumnWidth = showChatColumn && !chatFullView ? 430 : 0;
  // Chat is the focus → suppress the floating FAB + AI button so they don't
  // collide with the chat input/send (column open, full view, or the
  // standalone mobile /dashboard/chat page).
  const chatActive = chatOpen || isChatPage;
  // AI panel width — only on desktop when chat is not active
  const aiPanelWidth =
    !chatActive && aiPanelOpen && !isTablet && !hideChatColumn ? 400 : 0;

  return (
    <AppContextLoader
      isContextReady={isContextReady}
      isFlowsReady={isFlowsReady}
      appMode={forcedMode}
    >
      <Layout style={{ minHeight: "100dvh" }}>
        <Header />
        <Layout style={{ marginTop: 56 }}>
          <SidebarComponent collapsed={collapsed} onCollapse={setCollapsed} />

          {/* Main content — hidden when chat is in full view */}
          {!chatFullView && (
            <Content
              className="responsive-content"
              style={{
                marginLeft: siderWidth,
                marginRight: chatColumnWidth + aiPanelWidth,
                padding: isTablet ? "20px 24px" : "24px 32px",
                background: contentBg,
                minHeight: "calc(100dvh - 56px)",
                transition: "margin-left 0.2s, margin-right 0.2s",
              }}
            >
              {/* Cap + center the body (new_design md:max-w-6xl md:mx-auto)
                  so content doesn't sprawl edge-to-edge on ultra-wide monitors. */}
              <div
                data-testid="dashboard-body"
                className="mx-auto w-full max-w-[1152px]"
              >
                <NativeFcmBridge />
                <EnableNotificationsBanner />
                <ErrorBoundary>{children}</ErrorBoundary>
              </div>
              {!chatActive && (
                <AIAssistant contentLeft={siderWidth} contentRight={0} />
              )}
            </Content>
          )}

          <FloatingActionButton hidden={chatActive || aiPanelOpen} />

          {/* Right chat column — normal mode (430px fixed right) */}
          {showChatColumn && !chatFullView && (
            <div
              style={{
                width: 430,
                height: "calc(100dvh - 56px)",
                position: "fixed",
                top: 56,
                right: 0,
                zIndex: 50,
              }}
            >
              <RightChatColumn
                onClose={handleChatClose}
                onFullView={handleChatFullView}
                isFullView={false}
              />
            </div>
          )}

          {/* Full view chat — fills content area (after sidebar) */}
          {!hideChatColumn && chatOpen && chatFullView && (
            <div
              style={{
                position: "fixed",
                top: 56,
                left: siderWidth,
                right: 0,
                bottom: 0,
                zIndex: 60,
                background: "#fff",
                transition: "left 0.2s",
              }}
            >
              <RightChatColumn
                onClose={handleChatClose}
                onFullView={handleChatFullView}
                isFullView={true}
              />
            </div>
          )}
        </Layout>
      </Layout>
    </AppContextLoader>
  );
}
