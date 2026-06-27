"use client";

import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Shared modal shell ported from the new_design prototype (DESIGN.md §4 Modals,
 * prototype lines 1647–1675). Bottom-sheet on mobile (<640px), centered card on
 * desktop. Portaled to <body> so it escapes the dashboard layout stacking
 * context — root carries `.tw` because preflight is off outside .tw trees.
 * Adds the behaviour Ant Modal gave for free: ESC-to-close + body scroll-lock.
 */
export function ModalShell({
  open = true,
  children,
  onClose,
  size = "md",
  disableClose = false,
}: {
  open?: boolean;
  children: ReactNode;
  onClose: () => void;
  /** Desktop max-width of the centered card. Default "md" (28rem). */
  size?: "md" | "lg" | "xl" | "wide";
  /** When true, ESC and backdrop-click are suppressed (forced-action dialogs). */
  disableClose?: boolean;
}) {
  const maxW =
    size === "wide"
      ? "sm:max-w-[1080px]"
      : size === "xl"
        ? "sm:max-w-xl"
        : size === "lg"
          ? "sm:max-w-lg"
          : "sm:max-w-md";
  useEffect(() => {
    if (!open || disableClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, disableClose]);

  useEffect(() => {
    if (!open || !disableClose) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, disableClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="tw fixed inset-0 z-[1000] flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 animate-in fade-in"
        onClick={disableClose ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full sm:w-[92%] ${maxW} bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom max-h-[88vh] overflow-y-auto`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function ModalHeader({
  title,
  close,
}: {
  title: string;
  close: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-5 pb-3">
      <div className="font-bold text-base">{title}</div>
      <button
        type="button"
        onClick={close}
        className="appearance-none cursor-pointer outline-none border-0 bg-transparent w-8 h-8 max-lg:w-11 max-lg:h-11 rounded-full hover:bg-secondary flex items-center justify-center"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );
}

export function ModalFooter({
  close,
  primary,
  primaryLabel = "Create",
  cancelLabel = "Cancel",
  loading,
  disabled,
  danger = false,
}: {
  close: () => void;
  primary: () => void;
  primaryLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  /** Render the primary button as a destructive (coral) action. */
  danger?: boolean;
}) {
  return (
    <div className="p-5 pt-4 border-t border-border flex justify-end gap-2">
      <button
        type="button"
        onClick={close}
        className="appearance-none cursor-pointer outline-none h-10 px-5 rounded-xl border border-border bg-card font-semibold text-sm"
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        onClick={primary}
        disabled={loading || disabled}
        className={
          danger
            ? "appearance-none cursor-pointer outline-none h-10 px-5 rounded-xl border-2 border-coral bg-transparent text-coral font-bold text-sm hover:bg-coral/10 disabled:opacity-60 disabled:cursor-not-allowed"
            : "appearance-none cursor-pointer outline-none border-0 h-10 px-5 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
        }
      >
        {loading ? "…" : primaryLabel}
      </button>
    </div>
  );
}
