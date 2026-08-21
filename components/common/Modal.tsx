"use client";

import { ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
  // Tell the floating buttons to get out of the way. FloatingActionButton and
  // AIAssistant both already listen for `vc:sheet-open` — nothing ever
  // dispatched it for `.tw` modals, so at an equal z-index (both 1000) DOM
  // order decided and the FAB stack painted over dialogs, covering their
  // primary action.
  useEffect(() => {
    if (!open) return;
    const fire = (v: boolean): void => {
      window.dispatchEvent(new CustomEvent("vc:sheet-open", { detail: v }));
    };
    fire(true);
    return () => fire(false);
  }, [open]);

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

  // Focus management (Ant Modal gave this for free): move focus into the
  // dialog on open, keep Tab/Shift+Tab cycling inside it, and hand focus
  // back to the triggering element on close.
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    const card = cardRef.current;
    const first = card?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? card)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !cardRef.current) return;
      const scope = cardRef.current;
      const nodes = Array.from(
        scope.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (nodes.length === 0) {
        e.preventDefault();
        scope.focus();
        return;
      }
      const firstEl = nodes[0];
      const lastEl = nodes[nodes.length - 1];
      const active = document.activeElement;
      const inside = active instanceof Node && scope.contains(active);
      if (e.shiftKey) {
        if (!inside || active === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else if (!inside || active === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      trigger?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="tw fixed inset-0 z-[1000] flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 animate-in fade-in"
        onClick={disableClose ? undefined : onClose}
      />
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
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
        aria-label="Close"
        className="appearance-none cursor-pointer border-0 bg-transparent w-8 h-8 max-lg:w-11 max-lg:h-11 rounded-full hover:bg-secondary flex items-center justify-center"
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
  // Both buttons use `min-h-10` + `py-2`, never a fixed `h-10`: the mobile
  // readability scale in globals.css raises `.text-sm` to 16px at <=767px, so a
  // two-word-plus label wraps to a second line and used to spill straight out
  // of a 40px-tall box (the "Permanently Delete Account" overlap). Growing the
  // button is the only thing that keeps an arbitrary caller-supplied label
  // inside its own border.
  return (
    <div className="p-5 pt-4 border-t border-border flex justify-end gap-2">
      <button
        type="button"
        onClick={close}
        className="appearance-none cursor-pointer min-h-10 py-2 px-5 rounded-xl border border-border bg-card font-semibold text-sm text-center"
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        onClick={primary}
        disabled={loading || disabled}
        className={
          danger
            ? "appearance-none cursor-pointer min-h-10 py-2 px-5 rounded-xl border-2 border-coral bg-transparent text-coral font-bold text-sm text-center hover:bg-coral/10 disabled:opacity-60 disabled:cursor-not-allowed"
            : "appearance-none cursor-pointer border-0 min-h-10 py-2 px-5 rounded-xl bg-primary text-white font-bold text-sm text-center hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
        }
      >
        {loading ? "…" : primaryLabel}
      </button>
    </div>
  );
}
