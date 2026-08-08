"use client";

import React from "react";
import { Edit2, Heart, FolderInput, Share2, Copy, Trash2 } from "lucide-react";
import { ModalShell, ModalHeader } from "@/components/common/Modal";

export interface FlowMenuFlow {
  id: string;
  name: string;
  isFavorite?: boolean;
}

interface FlowMenuModalProps {
  open: boolean;
  flow: FlowMenuFlow | null;
  onClose: () => void;
  onEdit: () => void;
  onToggleFavorite: () => void;
  onRename: () => void;
  onAssign: () => void;
  /** Omit to hide Share entirely (e.g. free tier — no canShareFlows entitlement). */
  onShare?: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  locked?: boolean;
  /**
   * Page-specific entries appended after the standard seven — currently only
   * "Remove from project" on project detail. Kept as an addition rather than a
   * replacement: every page shows the same core options, and a page that has
   * one more thing to offer adds it here instead of forking the menu.
   * Suppressed while `locked`, like everything except Delete.
   */
  extraItems?: {
    key: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    danger?: boolean;
  }[];
}

/**
 * Flow options bottom-sheet — ported from the new_design prototype
 * (FlowMenuModal, lines 1773–1795). Used on mobile flow cards; desktop tables
 * keep the Ant Dropdown (ERP convention).
 */
export default function FlowMenuModal({
  open,
  flow,
  onClose,
  onEdit,
  onToggleFavorite,
  onRename,
  onAssign,
  onShare,
  onDuplicate,
  onDelete,
  locked = false,
  extraItems = [],
}: FlowMenuModalProps) {
  const allItems: {
    I: React.ComponentType<{ className?: string }>;
    n: string;
    action: () => void;
    coral?: boolean;
    danger?: boolean;
  }[] = [
    { I: Edit2, n: "Edit", action: onEdit },
    {
      I: Heart,
      n: flow?.isFavorite ? "Remove Favorite" : "Add Favorite",
      action: onToggleFavorite,
      coral: true,
    },
    { I: Edit2, n: "Rename", action: onRename },
    { I: FolderInput, n: "Assign to Project", action: onAssign },
    ...(onShare ? [{ I: Share2, n: "Share", action: onShare }] : []),
    { I: Copy, n: "Duplicate", action: onDuplicate },
    ...extraItems.map((it) => ({
      I: it.icon,
      n: it.label,
      action: it.onClick,
      danger: it.danger,
    })),
    { I: Trash2, n: "Delete", action: onDelete, danger: true },
  ];

  const items = locked ? allItems.filter((it) => it.n === "Delete") : allItems;

  return (
    <ModalShell open={open} onClose={onClose}>
      <ModalHeader title={flow?.name || "Flow Options"} close={onClose} />
      <div className="px-2 pb-3">
        {items.map((it, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              onClose();
              it.action();
            }}
            className={`appearance-none cursor-pointer outline-none border-0 bg-transparent w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary transition text-left ${
              it.danger || it.coral ? "text-coral" : "text-foreground"
            } ${
              i === items.length - 2
                ? "border-b border-border mb-1 pb-3 rounded-b-none"
                : ""
            }`}
          >
            <it.I className={`w-4 h-4 ${it.coral ? "fill-coral" : ""}`} />
            <span className="text-sm font-semibold">{it.n}</span>
          </button>
        ))}
      </div>
    </ModalShell>
  );
}
