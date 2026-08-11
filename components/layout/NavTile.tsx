"use client";

import React from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavTileProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  /** Desktop collapsed rail — render the icon tile only. */
  collapsed?: boolean;
  /** Orange-accent treatment (Value Charts AI). */
  accent?: "orange";
  /** Show an amber lock badge (gated feature). */
  locked?: boolean;
  /** Optional pill badge (e.g. unread count). */
  badge?: number | string;
  /** Layout variant — desktop rail vs. mobile drawer. */
  variant?: "desktop" | "drawer";
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
}

/**
 * New-design sidebar nav row: rounded icon tile + label, with active / locked /
 * badge / orange-accent states. Shared by Sidebar (Team) and ProSidebar.
 * Must be rendered inside a `.tw` root (Tailwind is scoped — preflight is off).
 */
export default function NavTile({
  icon: Icon,
  label,
  active = false,
  collapsed = false,
  accent,
  locked = false,
  badge,
  variant = "desktop",
  href,
  onClick,
  title,
}: NavTileProps) {
  const isDrawer = variant === "drawer";

  const rowCls = [
    // `!transition`: Tailwind v4 utilities live in a cascade @layer, but Ant
    // Design's reset emits an UNLAYERED `a { transition: color .3s }`, which
    // always beats layered rules. Without `!` the row would only animate color,
    // not background-color (visible on <a>/Link rows; <button> rows are unaffected
    // since antd has no anchor-equivalent button reset). The important modifier
    // outranks antd's non-important unlayered rule. We use the broad `transition`
    // (not `transition-colors`) to match the new_design SideNav blueprint exactly.
    "w-full flex items-center gap-3 text-left !transition border-0",
    isDrawer ? "px-5 py-3" : "px-3 py-2.5 my-0.5 rounded-xl",
    collapsed ? "justify-center" : "",
    // Same cascade story for the background: antd's unlayered
    // `a { background-color: transparent }` overrides Tailwind's layered
    // bg utilities on <a> rows, killing both the active pill and the hover
    // highlight. `!bg-*` / `hover:!bg-*` restore them. No-op for <button> rows.
    active ? "!bg-primary-tint" : "bg-transparent hover:!bg-secondary/60",
  ].join(" ");

  const tileCls = [
    "relative w-9 h-9 shrink-0 rounded-xl flex items-center justify-center",
    accent === "orange"
      ? "bg-[#FFF2E2] text-[var(--orange)]"
      : active
        ? "bg-primary text-white"
        : "bg-secondary text-primary-deep",
  ].join(" ");

  const hasBadge = badge != null && badge !== 0;

  const labelCls = [
    "text-[14px] flex-1 truncate",
    active ? "font-bold text-primary-deep" : "font-medium text-foreground",
  ].join(" ");

  const inner = (
    <>
      <div className={tileCls}>
        <Icon className="w-4 h-4" />
        {/* Collapsed rail: the full pill has no room, so show a small unread
            dot on the icon corner instead — otherwise the unread indicator
            disappears entirely whenever the rail collapses (e.g. when the chat
            panel opens). Expanded rail keeps the numeric pill below. */}
        {collapsed && hasBadge && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--coral)] border-2 border-background" />
        )}
      </div>
      {!collapsed && <span className={labelCls}>{label}</span>}
      {!collapsed && hasBadge && (
        <span className="text-[10px] font-bold bg-[var(--coral)] text-white px-1.5 rounded-full">
          {badge}
        </span>
      )}
      {!collapsed && locked && (
        <Lock className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={rowCls}
        title={title || label}
        onClick={onClick}
      >
        {inner}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      // appearance-none strips native button chrome (border/inset shadow);
      // bg handled by rowCls above.
      className={`appearance-none ${rowCls}`}
      title={title || label}
    >
      {inner}
    </button>
  );
}
