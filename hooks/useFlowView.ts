"use client";

/**
 * One grid/list preference for every flow surface.
 *
 * Before this there were two persisted keys (`flows_view_mode` on
 * `/dashboard/flows`, `dashboard_view_mode` on Recent Documents) and three
 * pages — favourites, recents, project detail — that persisted nothing at all
 * and reset on every navigation. Their defaults also disagreed: flows and
 * favourites opened in grid, recents and project detail in list.
 *
 * Owner decision (2026-08-09): the flow design is the same everywhere, so the
 * choice is one preference. Picking list on `/dashboard/flows` now means list
 * in trash, favourites, recents, project detail and the dashboard.
 *
 * Same-tab syncing goes through a custom event because `storage` only fires in
 * OTHER tabs — without it, two mounted surfaces (the dashboard lists flows in
 * two places) would disagree until remount.
 */

import { useCallback, useEffect, useState } from "react";
import type { FlowView } from "@/components/common/ViewToggle";

const KEY = "flows_view_mode";
const LEGACY_KEY = "dashboard_view_mode";
const EVENT = "vc:flow-view-change";

function read(): FlowView | null {
  try {
    const v = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
    return v === "grid" || v === "list" ? v : null;
  } catch {
    return null;
  }
}

export function useFlowView(fallback: FlowView = "grid") {
  // Always start at `fallback` so server and first client render agree; the
  // stored value is applied in the effect below. Reading localStorage during
  // render would hydration-mismatch.
  const [view, setView] = useState<FlowView>(fallback);

  useEffect(() => {
    const stored = read();
    if (stored) setView(stored);

    const onChange = (e: Event) => {
      const next = (e as CustomEvent<FlowView>).detail;
      if (next === "grid" || next === "list") setView(next);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) {
        const stored = read();
        if (stored) setView(stored);
      }
    };
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const change = useCallback((next: FlowView) => {
    setView(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // private mode / quota — the choice just won't survive a reload
    }
    try {
      window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
    } catch {}
  }, []);

  return [view, change] as const;
}
