"use client";

import React from "react";
import { ArrowLeft } from "lucide-react";

/**
 * The ONE back button. Every back affordance in the app renders through this so
 * the size can never drift again.
 *
 * History (2026-08-14): there were two competing designs — the global
 * MobileBackButton at 48×48 with a 20px glyph, and page-local copies in
 * Settings (×3), Billing and Project detail at 36×36 with a 16px glyph. Billing
 * therefore looked visibly different from Teams/Trash/Notifications, and the
 * 36px variants also missed the 44px touch-target floor.
 *
 * Size is fixed at 48×48 (the larger of the two) because it is a primary
 * navigation control on a phone.
 */
export default function BackButton({
  onClick,
  label = "Go back",
  className = "",
}: {
  onClick: () => void;
  /** Accessible name — say where it goes when that is not obvious. */
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`appearance-none cursor-pointer outline-none p-0 w-12 h-12 shrink-0 rounded-full bg-card border border-border flex items-center justify-center transition-colors hover:bg-secondary ${className}`}
    >
      <ArrowLeft className="w-5 h-5 text-foreground" />
    </button>
  );
}
