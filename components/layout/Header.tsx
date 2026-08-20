"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getLogoForApp, getForcedMode } from "@/lib/getLogo";
import { useAppBrand } from "@/hooks/useAppBrand";
import api from "@/lib/axios";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Tag, Button } from "antd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  ModalShell,
  ModalHeader,
  ModalFooter,
} from "@/components/common/Modal";
import {
  MessageOutlined,
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
import NotificationDropdown from "@/components/common/NotificationDropdown";
import { useCurrentUser, resolveAvatar } from "@/hooks/useCurrentUser";
import { useEntitlements } from "@/hooks/useEntitlements";
import SidebarTeamSwitcher from "@/components/layout/SidebarTeamSwitcher";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { useIsMobile, useIsChatColumnHidden } from "@/hooks/useMediaQuery";
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
  const chatColumnHidden = useIsChatColumnHidden();
  const user = session?.user;
  const userName = user?.name || "User";
  const userInitial = userName.charAt(0).toUpperCase();

  // Navbar avatar: the uploaded profile photo lives on the user record, not in
  // the NextAuth JWT — so the session image goes stale after an avatar change.
  // Seed from the session, then fetch the live value and refresh on the
  // `userAvatarChanged` event the Settings page dispatches after an upload.
  // (Mirrors the Sidebar drawer avatar, Sidebar.tsx:196-220.)
  //
  // OPT-3 (2026-08-08): the fetch moved into the SHARED `useCurrentUser` store.
  // This component and the Sidebar each ran their own identical GET /users/me —
  // 6 per dashboard load between them. They now share one request and one
  // snapshot, and the store handles the `userAvatarChanged` invalidation for
  // both, so an upload still lands here immediately.
  const { data: currentUser } = useCurrentUser();
  // The event carries the new url, so the header updates without waiting for
  // the refetch to come back. Falls back to the store, then to the session.
  const [optimisticAvatar, setOptimisticAvatar] = useState<string | null>(null);
  useEffect(() => {
    const onChange = (e: Event) => {
      const url = (e as CustomEvent<{ url?: string }>).detail?.url;
      if (url) setOptimisticAvatar(url);
    };
    window.addEventListener("userAvatarChanged", onChange);
    return () => window.removeEventListener("userAvatarChanged", onChange);
  }, []);
  const avatarUrl =
    optimisticAvatar ||
    resolveAvatar(currentUser) ||
    (session?.user?.image as string) ||
    null;
  const hasAvatar =
    typeof avatarUrl === "string" && avatarUrl.trim().length > 0;
  // Kept so the <img onError> path can still fall back to initials.
  const [avatarFailed, setAvatarFailed] = useState(false);

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
  const { totalUnread } = useUnreadCount(currentApp === "pro" ? "pro" : "team");
  const sessionHasTeamAccess = (session?.user as any)?.hasTeamAccess ?? false;

  // AI-billing / team-context switcher — surfaced as a standalone navbar pill
  // (moved out of the account dropdown; the avatar now navigates to Profile).
  useAiBilling();

  // Subscription-aware personal plan — wins over the stale JWT/session field.
  // (Backend `getTeamContext` resolves it from the active subscription row.)
  const personalPlan: "free" | "pro" | "team" = personalPlanInfo.currentVersion;

  // Chat-locked subscription popup — same styling as Sidebar's Teams popup
  const [chatLockedOpen, setChatLockedOpen] = useState(false);
  const [teamPickerOpen, setTeamPickerOpen] = useState(false);

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
  // Logo brand follows the app SHELL (WebView UA), not billing currentApp — a
  // Pro-entitled user opening the Team app reports currentApp="pro" until the
  // reconcile lands, which leaked the Pro logo into the Team app. Web visitors
  // (brand="web") keep the currentApp-derived logo.
  const brand = useAppBrand();
  const logoApp = brand === "web" ? currentApp : brand;
  // Logo click lands on the app-specific home (matches post-login redirect).
  // The default context is Team (getPostLoginDashboardUrl's fallback), so an
  // unresolved app mode goes to /dashboard/team — never the bare /dashboard
  // generic shell, which the post-login flow deliberately avoids.
  const logoHref =
    isProApp || forcedAppMode === "pro" ? "/dashboard/pro" : "/dashboard/team";
  // bug-106 (2026-08-08): in the Team app the badge follows the WORKSPACE's
  // tier, not the caller's own receipt. A member inside test123's paid
  // workspace was shown "Free Plan" while spending that workspace's Team AI
  // credits on the same screen — `/entitlements` (workspace-aware, and what the
  // route guards enforce) said `team`. Falls back to the previous personal
  // signals while entitlements is null (loading / failed), so the owner's own
  // screen never flashes the wrong badge.
  const { entitlements } = useEntitlements();
  const workspaceTier = entitlements?.tier ?? null;
  const inAppPlan: "free" | "pro" | "team" = isProApp
    ? // Pro app: Pro entitlement is the only signal
      personalPlanInfo.hasPro
      ? "pro"
      : "free"
    : // Team app: read Team-only signals — active subscription or team
      // context. Personal plan='pro' from a separate Pro purchase is ignored.
      workspaceTier === "team"
      ? "team"
      : isTeamContext
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
    // bug-106: the workspace's own answer, same as Sidebar.hasTeamFeatures.
    !!entitlements?.modules?.includes("chat") ||
    isTeamContext ||
    effectivePlan === "team" ||
    sessionHasTeamAccess;

  // ─────────── Switch button click handler ───────────

  const showTeamPicker = () => setTeamPickerOpen(true);

  const handleContextSwitch = () => {
    if (isTeamContext) {
      switchToPersonal();
      toast.success("Switched to your personal account");
      return;
    }
    if (availableTeams.length === 1) {
      const only = availableTeams[0];
      switchToTeam(only);
      toast.success(`Switched to ${only.teamName || "team"} context`);
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
    // Below 1180px (mobile, tablet, narrow desktop): navigate to the full-screen
    // chat page — the docked column can't coexist with the sidebar + content.
    if (chatColumnHidden) {
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
            {/* Below 430px the full lockup (mark + wordmark + tagline) ate ~320
                of a 390px bar and the tagline was far too small to read, which
                is what squeezed the header icons. The asset is 500×150 with the
                shield in the left ~30%, so the wrapper simply crops to the mark
                on small phones. Inline width/maxWidth are required: the
                UNLAYERED `img { max-width: 100% }` in globals.css beats any
                layered Tailwind utility (same cascade story as the avatars). */}
            {/* 36px is measured, not guessed: at height 48 the asset renders
                160px wide and the shield ends at ~36px — 38px+ starts showing a
                sliver of the "V". */}
            <span className="block overflow-hidden h-12 w-40 max-[430px]:w-9">
              <img
                src={getLogoForApp(logoApp)}
                alt="ValueChart Logo"
                // 48px tall so it fills the 56px navbar and its width lines the
                // Profile divider up with the 220px sidebar border.
                className="object-contain"
                style={{
                  height: 48,
                  width: 160,
                  maxWidth: "none",
                  objectPosition: "left center",
                }}
              />
            </span>
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
          <Tooltip>
            <TooltipTrigger asChild>
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
            </TooltipTrigger>
            {!hasChatAccess && (
              <TooltipContent className="tw">
                Chat requires a Team plan — switch to a team context or upgrade
              </TooltipContent>
            )}
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

          {/* Team switcher — new_design style, shown in navbar for desktop */}
          <SidebarTeamSwitcher variant="navbar" />

          {/* User avatar — plain round button → Profile (new_design TopBar L274).
              No name/caret/dropdown; account actions live in the sidebar
              (Subscription / Billing / Settings) and on the Profile page. */}
          <button
            onClick={() => router.push("/dashboard/settings")}
            aria-label="Open profile"
            // `p-0` is load-bearing: this is a <button>, and Chrome's UA
            // stylesheet gives buttons `padding: 1px 6px`. Tailwind's preflight
            // would normally zero that, but preflight is SCOPED TO `.tw` here
            // (it is kept off the global sheet so it cannot fight AntD) and the
            // header sits outside it. The 36px circle therefore had a 24px-wide
            // content box, `img { max-width: 100% }` clamped the photo to 24px,
            // and the avatar showed as a square floating in a ring of green
            // background instead of filling the circle.
            className="ml-1 w-9 h-9 p-0 rounded-full bg-primary ring-2 ring-primary/20 flex items-center justify-center text-white text-sm font-bold cursor-pointer border-0 appearance-none overflow-hidden hover:ring-primary/40 transition"
          >
            {hasAvatar && !avatarFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl as string}
                alt={userName}
                // Sized INLINE, in px, to match the w-9/h-9 button exactly.
                // `w-full h-full` did not fill it: globals.css carries an
                // UNLAYERED `img { max-width: 100%; height: auto }`, and an
                // unlayered rule beats every @layer — including Tailwind's
                // utilities — so `h-full` lost and the photo rendered 24×24
                // inside the 36px circle, leaving a green ring of background
                // around a square. An inline style outranks the global.
                style={{ width: 36, height: 36 }}
                className="rounded-full object-cover shrink-0"
                onError={() => setAvatarFailed(true)}
              />
            ) : (
              userInitial
            )}
          </button>
        </div>
      </header>

      {/* Chat locked — requires Team plan */}
      <ModalShell
        open={chatLockedOpen}
        onClose={() => setChatLockedOpen(false)}
      >
        <ModalHeader
          title="Chat requires a Team plan"
          close={() => setChatLockedOpen(false)}
        />
        <div className="tw px-5 pb-5 text-center">
          <MessageOutlined
            style={{ fontSize: 40, color: PRIMARY, marginBottom: 12 }}
          />
          <p className="text-sm text-muted-foreground mt-2">
            {hasTeamContext
              ? "Switch into your team context to use Chat with team members, or upgrade your personal plan."
              : "Subscribe to a Team plan (or have a team owner invite you) to message members, share flows, and collaborate."}
          </p>
        </div>
        <div className="tw px-5 pb-5 flex justify-end gap-2 flex-wrap border-t border-border pt-4">
          <button
            type="button"
            onClick={() => setChatLockedOpen(false)}
            className="appearance-none cursor-pointer outline-none h-10 px-5 rounded-xl border border-border bg-card font-semibold text-sm"
          >
            Cancel
          </button>
          {hasTeamContext && (
            <button
              type="button"
              onClick={() => {
                setChatLockedOpen(false);
                handleContextSwitch();
              }}
              className="appearance-none cursor-pointer outline-none h-10 px-5 rounded-xl border border-border bg-card font-semibold text-sm"
            >
              Switch to team
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setChatLockedOpen(false);
              router.push("/dashboard/subscription");
            }}
            className="appearance-none cursor-pointer outline-none border-0 h-10 px-5 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90"
          >
            View Plans
          </button>
        </div>
      </ModalShell>

      {/* Team picker */}
      <ModalShell
        open={teamPickerOpen}
        onClose={() => setTeamPickerOpen(false)}
      >
        <ModalHeader
          title="Switch to which team?"
          close={() => setTeamPickerOpen(false)}
        />
        <div className="tw px-5 pb-5 space-y-2">
          {availableTeams.map((team) => (
            <button
              key={team.teamId}
              type="button"
              onClick={() => {
                switchToTeam(team);
                toast.success(`Switched to ${team.teamName || "team"} context`);
                setTeamPickerOpen(false);
              }}
              className="appearance-none border border-border bg-card cursor-pointer w-full text-left rounded-xl px-3 py-2.5 hover:bg-secondary transition"
            >
              <div className="font-semibold text-sm flex items-center gap-1.5">
                <TeamOutlined style={{ color: "#7C3AED" }} />
                {team.teamName || "Unnamed Team"}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {team.owner?.name || "Owner"} ·{" "}
                {team.plan === "team"
                  ? "Team Plan"
                  : team.plan === "pro"
                    ? "Pro Plan"
                    : "Free Plan"}
              </div>
            </button>
          ))}
        </div>
      </ModalShell>
    </>
  );
};

export default Header;
