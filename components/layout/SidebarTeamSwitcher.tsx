"use client";

import React, { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAiBilling, type BillingOption } from "@/context/AiBillingContext";
import { getClientAppType } from "@/lib/detectWebView";
import { usePro } from "@/hooks/usePro";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────
// SidebarTeamSwitcher — the "TEAM / My Team ▾" card at the top of the rail
// that opens the "SWITCH TEAM" dropdown (My Team · Acme Studio · Beta Labs).
//
// SOURCE OF TRUTH: useAiBilling(). Selecting a row calls switchBilling(teamId),
// which (see AiBillingContext) flushes the workspace cache, sets the scoped
// X-Workspace-Context header, persists server-side, and re-scopes data + AI billing.
// It NEVER mutates the App-switcher state (vc_app_context / PRO_BILLING_KEY vs
// AI_BILLING_KEY are separate per-tab keys in lib/aiBilling.ts), so toggling
// ValueChart ⇄ PRO keeps each app's team selection independent.
//
// Role (Owner / Editor / Viewer) is informational here — it comes straight
// from the backend per option (opt.role) and the server enforces it on every
// request (DATA-LOSS-001). The personal pool has no role; the user owns it, so
// we label it "Owner".
// ─────────────────────────────────────────────────────────────────────────

interface SidebarTeamSwitcherProps {
  /** Rail collapsed → avatar-only trigger. */
  collapsed?: boolean;
  /** navbar = compact pill for the top header bar */
  variant?: "sidebar" | "navbar";
}

function roleLabel(opt: BillingOption): string {
  if (opt.teamId === null) return "Owner";
  if (!opt.role) return "Member";
  return opt.role.charAt(0).toUpperCase() + opt.role.slice(1).toLowerCase();
}

function displayName(opt: BillingOption): string {
  return opt.ownerName || opt.label || "Team";
}

function avatarChar(opt: BillingOption): string {
  return (
    opt.ownerName?.charAt(0).toUpperCase() ||
    opt.avatar?.charAt(0).toUpperCase() ||
    opt.label?.charAt(0).toUpperCase() ||
    "T"
  );
}

const SidebarTeamSwitcher: React.FC<SidebarTeamSwitcherProps> = ({
  collapsed = false,
  variant = "sidebar",
}) => {
  const {
    options,
    activeBillingTeamId,
    activeOption,
    hasTeams,
    loading,
    switchBilling,
  } = useAiBilling();
  // Standalone Pro entitlement — decides whether staying in the Pro app after a
  // workspace switch is viable, or whether ProGuard would bounce them.
  // `loading` matters: usePro starts as { loading: true, hasPro: false }, and
  // treating that initial state as "not Pro" bounced Pro users to the Team app
  // whenever they clicked the switcher before the status resolved.
  const { hasPro, proPurchasedAt, loading: proLoading } = usePro();
  const [open, setOpen] = useState(false);

  // Hide the sidebar variant on web — web uses the header (navbar) switcher instead.
  if (getClientAppType() === "web" && variant === "sidebar") return null;

  // No teams to switch between → don't show the control at all (a lone
  // personal pool has nothing to switch to). Mirrors TeamContextSwitcher.
  if (!hasTeams && !loading) return null;

  const handleSelect = (opt: BillingOption) => {
    setOpen(false);
    if (opt.teamId === activeBillingTeamId) return;
    void switchBilling(opt.teamId);
    // The APP and the WORKSPACE are independent axes: switching workspace must
    // not move you between apps. Data is separated by app_context, so a Pro
    // user switching into someone else's workspace stays in the Pro app and
    // simply sees that workspace's PRO data.
    //
    // This used to redirect to /dashboard/team unconditionally. The reason was
    // real but too broad: ProGuard bounces anyone WITHOUT standalone Pro off
    // /dashboard/pro to /upgrade-pro, so a free member switching workspaces
    // would have been thrown at a purchase page they never asked for. That only
    // applies to users who lack Pro — so the bail-out is now conditional on
    // exactly that, instead of firing for everyone.
    const onProRoute =
      typeof window !== "undefined" &&
      (window.location.pathname === "/dashboard/pro" ||
        window.location.pathname.startsWith("/dashboard/pro/"));
    // Only bail out when we KNOW they lack Pro. While `usePro` is still
    // loading, hasPro is false-by-default — redirecting on that raced the
    // fetch and threw genuine Pro users into the Team app if they clicked
    // early (reproduced in-browser: bounced at ~7s, stayed put at ~20s).
    // Staying is the safe default: a real non-Pro user is still caught by
    // ProGuard on the next render.
    const knownNotPro = !proLoading && !(hasPro && proPurchasedAt);
    if (onProRoute && knownNotPro) {
      window.location.href = "/dashboard/team";
    }
  };

  // Deduplicate by owner — one entry per unique owner.
  // Personal context (teamId=null) is always kept.
  // If user is in 2 teams both owned by Mr Y → show ONE "Mr Y" entry (first team).
  const dedupedOptions = options.reduce<BillingOption[]>((acc, opt) => {
    const key =
      opt.teamId === null
        ? "personal"
        : opt.ownerEmail || opt.ownerName || opt.teamId;
    if (
      !acc.some((o) => {
        const oKey =
          o.teamId === null
            ? "personal"
            : o.ownerEmail || o.ownerName || o.teamId;
        return oKey === key;
      })
    ) {
      acc.push(opt);
    }
    return acc;
  }, []);

  // Active deduped entry — match by teamId (same key used for dedup above).
  const activeDedupedOption =
    dedupedOptions.find((o) =>
      o.teamId === null
        ? activeBillingTeamId === null
        : o.teamId === activeBillingTeamId,
    ) ??
    dedupedOptions[0] ??
    activeOption;

  // Shared dropdown content for both variants
  const dropdownContent = (
    <PopoverContent
      align={variant === "navbar" ? "end" : "start"}
      sideOffset={6}
      className="tw min-w-[200px] p-1.5"
    >
      <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        Switch Team
      </div>
      <div role="listbox" aria-label="Teams">
        {dedupedOptions.map((opt) => {
          const active =
            opt.teamId === null
              ? activeBillingTeamId === null
              : opt.teamId === activeBillingTeamId;
          return (
            <button
              key={opt.teamId || "personal"}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => handleSelect(opt)}
              className={cn(
                "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                active ? "bg-primary-tint" : "hover:bg-secondary/60",
              )}
            >
              <span
                className={cn(
                  "w-8 h-8 shrink-0 rounded-lg font-bold text-sm flex items-center justify-center",
                  active
                    ? "bg-primary/20 text-primary-deep"
                    : "bg-secondary text-primary-deep",
                )}
              >
                {avatarChar(opt)}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-semibold text-foreground truncate leading-tight">
                  {displayName(opt)}
                </span>
                <span className="block text-[11px] text-muted-foreground leading-tight">
                  {roleLabel(opt)}
                </span>
              </span>
              {active && <Check className="w-4 h-4 shrink-0 text-primary" />}
            </button>
          );
        })}
      </div>
    </PopoverContent>
  );

  if (variant === "navbar") {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            data-testid="team-switcher-trigger"
            aria-label="Switch team"
            className="hidden sm:inline-flex items-center gap-2 h-9 px-2.5 rounded-xl border border-border transition hover:bg-secondary/60"
          >
            <span className="w-7 h-7 shrink-0 rounded-lg bg-primary text-white font-bold text-xs flex items-center justify-center">
              {avatarChar(activeDedupedOption)}
            </span>
            <span className="text-[13px] font-semibold text-foreground truncate max-w-[110px]">
              {displayName(activeDedupedOption)}
            </span>
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 text-muted-foreground transition",
                open && "rotate-180",
              )}
            />
          </button>
        </PopoverTrigger>
        {dropdownContent}
      </Popover>
    );
  }

  // Sidebar variant: inline expand/collapse — no Radix portal, WebView-safe.
  // Radix Popover portals render at document.body and can render behind the
  // Flutter WebView drawer overlay (wrong z-index stacking context).
  return (
    <div className="px-3 pb-2 pt-[5px]">
      <button
        type="button"
        data-testid="team-switcher-trigger"
        aria-label="Switch team"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center gap-3 rounded-xl border border-border transition hover:bg-secondary/60",
          collapsed ? "justify-center p-1.5" : "px-3 py-2",
        )}
      >
        <span className="w-9 h-9 shrink-0 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center">
          {avatarChar(activeDedupedOption)}
        </span>
        {!collapsed && (
          <>
            <span className="flex-1 min-w-0 text-left">
              <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground leading-none">
                Team
              </span>
              <span className="block text-[13px] font-semibold text-foreground truncate leading-tight mt-0.5">
                {displayName(activeDedupedOption)}
              </span>
            </span>
            <ChevronDown
              className={cn(
                "w-4 h-4 shrink-0 text-muted-foreground transition",
                open && "rotate-180",
              )}
            />
          </>
        )}
      </button>
      {open && !collapsed && (
        <div className="mt-1.5 rounded-xl border border-border bg-card shadow-md overflow-hidden">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Switch Team
          </div>
          <div role="listbox" aria-label="Teams">
            {dedupedOptions.map((opt) => {
              const active =
                opt.teamId === null
                  ? activeBillingTeamId === null
                  : opt.teamId === activeBillingTeamId;
              return (
                <button
                  key={opt.teamId || "personal"}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => handleSelect(opt)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                    active ? "bg-primary-tint" : "hover:bg-secondary/60",
                  )}
                >
                  <span
                    className={cn(
                      "w-8 h-8 shrink-0 rounded-lg font-bold text-sm flex items-center justify-center",
                      active
                        ? "bg-primary/20 text-primary-deep"
                        : "bg-secondary text-primary-deep",
                    )}
                  >
                    {avatarChar(opt)}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold text-foreground truncate leading-tight">
                      {displayName(opt)}
                    </span>
                    <span className="block text-[11px] text-muted-foreground leading-tight">
                      {roleLabel(opt)}
                    </span>
                  </span>
                  {active && (
                    <Check className="w-4 h-4 shrink-0 text-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SidebarTeamSwitcher;
