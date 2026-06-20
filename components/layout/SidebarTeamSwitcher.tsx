"use client";

import React, { useState } from "react";
import { ChevronDown, Check, Users } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAiBilling, type BillingOption } from "@/context/AiBillingContext";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────
// SidebarTeamSwitcher — the "TEAM / My Team ▾" card at the top of the rail
// that opens the "SWITCH TEAM" dropdown (My Team · Acme Studio · Beta Labs).
//
// SOURCE OF TRUTH: useAiBilling(). Selecting a row calls switchBilling(teamId),
// which (see AiBillingContext) flushes the workspace cache, sets the scoped
// X-Team-Context header, persists server-side, and re-scopes data + AI billing.
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
}

function roleLabel(opt: BillingOption): string {
  if (opt.teamId === null) return "Owner"; // personal pool — user owns it
  if (!opt.role) return "Member";
  return opt.role.charAt(0).toUpperCase() + opt.role.slice(1).toLowerCase();
}

function avatarChar(opt: BillingOption): string {
  return (
    opt.avatar?.charAt(0).toUpperCase() ||
    opt.label?.charAt(0).toUpperCase() ||
    "T"
  );
}

const SidebarTeamSwitcher: React.FC<SidebarTeamSwitcherProps> = ({
  collapsed = false,
}) => {
  const {
    options,
    activeBillingTeamId,
    activeOption,
    hasTeams,
    loading,
    switchBilling,
  } = useAiBilling();
  const [open, setOpen] = useState(false);

  // No teams to switch between → don't show the control at all (a lone
  // personal pool has nothing to switch to). Mirrors TeamContextSwitcher.
  if (!hasTeams && !loading) return null;

  const handleSelect = (opt: BillingOption) => {
    setOpen(false);
    if (opt.teamId === activeBillingTeamId) return; // no-op re-select
    // Fire-and-forget: switchBilling persists server-side but updates local
    // state synchronously, so the UI reflects the new team immediately.
    void switchBilling(opt.teamId);
  };

  return (
    <div className="px-3 pb-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            data-testid="team-switcher-trigger"
            aria-label="Switch team"
            className={cn(
              "w-full flex items-center gap-2.5 rounded-2xl border border-border bg-card transition hover:bg-secondary/50",
              collapsed ? "justify-center p-1.5" : "px-2.5 py-2",
            )}
          >
            <span className="w-8 h-8 shrink-0 rounded-full bg-primary/15 text-primary-deep font-bold text-sm flex items-center justify-center">
              {avatarChar(activeOption)}
            </span>
            {!collapsed && (
              <>
                <span className="flex-1 min-w-0 text-left">
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground leading-none">
                    Team
                  </span>
                  <span className="block text-[13px] font-semibold text-foreground truncate leading-tight mt-0.5">
                    {activeOption.label}
                  </span>
                </span>
                <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
              </>
            )}
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-[var(--radix-popover-trigger-width)] min-w-[200px] p-1.5"
        >
          <div className="flex items-center gap-1.5 px-2 pt-1 pb-2">
            <Users className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Switch Team
            </span>
          </div>

          <div role="listbox" aria-label="Teams">
            {options.map((opt) => {
              const active = opt.teamId === activeBillingTeamId;
              return (
                <button
                  key={opt.teamId || "personal"}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => handleSelect(opt)}
                  className={cn(
                    "w-full flex items-center gap-2.5 rounded-xl px-2 py-2 text-left transition",
                    active ? "bg-primary/10" : "hover:bg-secondary/60",
                  )}
                >
                  <span
                    className={cn(
                      "w-8 h-8 shrink-0 rounded-full font-bold text-sm flex items-center justify-center",
                      active
                        ? "bg-primary/20 text-primary-deep"
                        : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {avatarChar(opt)}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold text-foreground truncate leading-tight">
                      {opt.label}
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
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default SidebarTeamSwitcher;
