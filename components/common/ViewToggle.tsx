"use client";

/**
 * The ONE grid/list toggle.
 *
 * Was AntD `Button.Group` with `AppstoreOutlined`/`UnorderedListOutlined`, used
 * only by the dashboard's Recent Documents while four other pages carried
 * private Tailwind copies under three different names (`LocalViewToggle`,
 * `ViewToggleLocal` ×2, plus inline buttons on project detail). This is now the
 * flows-page design — the reference — and every flow surface imports it.
 *
 * Order is list-then-grid, matching the reference. The AntD version was
 * grid-then-list, so Recent Documents' two buttons swap places; that is the
 * intended correction, not a regression.
 */

import React from "react";
import { List as ListIcon, LayoutGrid } from "lucide-react";

export type FlowView = "grid" | "list";

interface ViewToggleProps {
  view: FlowView;
  onChange: (view: FlowView) => void;
}

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  const btn = (active: boolean) =>
    `w-9 h-8 rounded-lg flex items-center justify-center bg-transparent border-0 p-0 appearance-none cursor-pointer ${
      active ? "bg-card shadow-sm text-primary" : "text-muted-foreground"
    }`;

  return (
    <div className="inline-flex p-1 rounded-xl bg-secondary">
      <button
        onClick={() => onChange("list")}
        aria-label="List view"
        aria-pressed={view === "list"}
        className={btn(view === "list")}
      >
        <ListIcon className="w-4 h-4" />
      </button>
      <button
        onClick={() => onChange("grid")}
        aria-label="Grid view"
        aria-pressed={view === "grid"}
        className={btn(view === "grid")}
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
    </div>
  );
}
