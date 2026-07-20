"use client";

import { ReactNode, useState } from "react";
import { createRoot } from "react-dom/client";
import { ModalShell } from "./Modal";

/**
 * Tailwind / new_design replacement for AntD's `<Modal>` confirm dialogs and the
 * imperative `Modal.confirm({...})` API. Built on the shared `ModalShell`
 * (portal, ESC-to-close, scroll-lock). Use the `<ConfirmDialog>` component for
 * state-driven dialogs, or `confirmDialog({...})` for the drop-in imperative
 * replacement of `Modal.confirm`.
 */

export interface ConfirmDialogProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  icon?: ReactNode;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  icon,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <ModalShell open={open} onClose={onCancel}>
      <div className="p-5">
        <div className="flex items-start gap-3">
          {icon && <div className="shrink-0 mt-0.5">{icon}</div>}
          <div className="font-bold text-base">{title}</div>
        </div>
        {description && (
          <div className="mt-2 text-sm text-muted-foreground">
            {description}
          </div>
        )}
      </div>
      <div className="p-5 pt-0 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="appearance-none cursor-pointer h-11 px-5 rounded-xl border border-border bg-card font-semibold text-sm"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={
            danger
              ? "appearance-none cursor-pointer h-11 px-5 rounded-xl border-2 border-coral bg-transparent text-coral font-bold text-sm inline-flex items-center justify-center gap-2 hover:bg-coral/10 disabled:opacity-60 disabled:cursor-not-allowed"
              : "appearance-none cursor-pointer border-0 h-11 px-5 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
          }
        >
          {loading ? "…" : confirmLabel}
        </button>
      </div>
    </ModalShell>
  );
}

export interface ConfirmOptions {
  title: ReactNode;
  /** Body text/markup. (Named `content` to match AntD's Modal.confirm API.) */
  content?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  icon?: ReactNode;
  /**
   * Optional async work to run while the confirm button shows a loading state.
   * If it throws, the dialog stays open and the error propagates to the caller.
   */
  onConfirm?: () => void | Promise<void>;
}

/**
 * Imperative drop-in for `Modal.confirm`. Resolves `true` if the user confirms
 * (after `onConfirm` resolves, if provided), `false` if they cancel/dismiss.
 *
 *   if (await confirmDialog({ title: "Delete?", danger: true })) { ... }
 */
export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(false);
      return;
    }
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const finish = (result: boolean) => {
      root.unmount();
      container.remove();
      resolve(result);
    };

    function Host() {
      const [loading, setLoading] = useState(false);
      const handleConfirm = async () => {
        if (opts.onConfirm) {
          try {
            setLoading(true);
            await opts.onConfirm();
          } catch {
            setLoading(false);
            return; // keep dialog open on failure
          }
        }
        finish(true);
      };
      return (
        <ConfirmDialog
          open
          title={opts.title}
          description={opts.content}
          confirmLabel={opts.confirmLabel}
          cancelLabel={opts.cancelLabel}
          danger={opts.danger}
          icon={opts.icon}
          loading={loading}
          onConfirm={handleConfirm}
          onCancel={() => finish(false)}
        />
      );
    }

    root.render(<Host />);
  });
}
