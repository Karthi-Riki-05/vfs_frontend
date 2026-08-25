"use client";

import { useCallback, useEffect, useState } from "react";
import { createSharedResource } from "@/lib/sharedResource";
import { flowPackApi } from "@/api/notifications.api";
import { flowsApi } from "@/api/flows.api";
import { onWorkspaceFlush } from "@/lib/workspaceCache";
import { appTypeFromUserAgent } from "@/lib/detectWebView";
import { IAP_GRANTED_EVENT } from "@/lib/iapBridge";

export interface PackStatus {
  activePackId: string | null;
  packType: string | null;
  isUnlimited: boolean;
  expiresAt: string | null;
  gracePeriodEndsAt: string | null;
  status: string | null;
  flowCount: number;
  flowLimit: number;
  isInPickerPhase: boolean;
  isInTeamPickerPhase: boolean;
  teamFlowLimit: number;
  teamUnlimitedFlows: boolean;
  daysUntilExpiry: number | null;
}

// The Team app folds Free users into the 50-flow team allowance
// (`teamFlowLimit`); the Pro app uses the 10-flow `proFlowLimit` base. We MUST
// resolve the surface exactly like the axios interceptor (lib/axios.tsx) does,
// because that defaulted value is the `X-App-Context` the backend enforces the
// limit against. Order: stored key → legacy key → UA → default "team" (website
// default). A literal `=== "team"` check is WRONG: on the website (no stored
// key) the backend treats the request as team (limit 50) while a literal check
// would fall back to the Pro 10 — the exact "1/10 in the Team app" bug.
function readIsTeamApp(): boolean {
  try {
    let mode =
      sessionStorage.getItem("vc_app_context") ||
      sessionStorage.getItem("vc_forced_app_mode");
    if (mode !== "pro" && mode !== "team") {
      const fromUa = appTypeFromUserAgent(
        typeof navigator !== "undefined" ? navigator.userAgent : null,
      );
      mode = fromUa === "pro" || fromUa === "team" ? fromUa : "team";
    }
    return mode === "team";
  } catch {
    // sessionStorage blocked (restricted WebView) — match the interceptor's
    // "team" default.
    return true;
  }
}

// OPT-4 (2026-08-08): shared store + a guarded expiry check.
//
// Two components on the Team dashboard call this hook (the page itself and
// FlowUsageBar), and the flows page adds FlowPackBanner on top. Each instance
// ran its own POST /flows/check-expiry FOLLOWED BY a GET /flows/pack-status —
// measured 4 of each per dashboard load, on a page that lists no flows.
//
// `check-expiry` is the worse of the two: it is a WRITE that applies pack
// expiry server-side. Firing it once per component mount is not a freshness
// strategy, it is the same maintenance action repeated.
let lastExpiryCheck = 0;
const EXPIRY_CHECK_INTERVAL_MS = 60_000;

const packResource = createSharedResource<PackStatus>(
  "flows/pack-status",
  async () => {
    // Still run the expiry check before reading status — a pack that lapsed
    // while the tab was open must not be reported as active — but at most once
    // per window, however many components ask.
    const now = Date.now();
    if (now - lastExpiryCheck > EXPIRY_CHECK_INTERVAL_MS) {
      lastExpiryCheck = now;
      await flowsApi.checkExpiry().catch(() => {});
    }
    const res = await flowPackApi.packStatus();
    return res.data?.data || res.data;
  },
  // A purchase or a flow-limit change makes the held value wrong immediately.
  ["vc:flow-pack-changed"],
);

export function usePackStatus() {
  const { data: status, loading, reload } = packResource.use("global");
  const [isTeamApp, setIsTeamApp] = useState(false);

  const refresh = useCallback(async () => {
    await packResource.load("global", true);
  }, []);

  useEffect(() => {
    setIsTeamApp(readIsTeamApp());
  }, []);

  // bug-155: refetch when iapBridge confirms a store grant, so a flow pack or
  // add-on bought on a screen the user has since left still shows up here
  // without a full reload.
  useEffect(() => {
    const onGranted = () => void refresh();
    window.addEventListener(IAP_GRANTED_EVENT, onGranted);
    return () => window.removeEventListener(IAP_GRANTED_EVENT, onGranted);
  }, [refresh]);

  // Re-scope on workspace switch: drop the previous workspace's pack/limit
  // state immediately so a stale "at-limit" banner can't bleed across, then
  // refetch under the new X-Workspace-Context. Mirrors useFlows' flush handling.
  // Also re-read the app surface so the effective limit follows a context flip.
  useEffect(
    () =>
      onWorkspaceFlush(() => {
        setIsTeamApp(readIsTeamApp());
        // A workspace switch is a genuine change of scope — expiry is re-checked
        // and the status refetched, bypassing the once-per-window guard.
        lastExpiryCheck = 0;
        packResource.reset();
        void packResource.load("global", true);
      }),
    [],
  );

  // Context-aware limit: backend returns BOTH pro (`flowLimit`) and team
  // (`teamFlowLimit`) values regardless of surface — the surface picks. Without
  // this, Team-app Free users wrongly saw the 10-flow Pro base. (-1 = unlimited.)
  const effectiveUnlimited = status
    ? isTeamApp
      ? status.teamUnlimitedFlows
      : status.isUnlimited
    : false;
  const effectiveLimit = !status
    ? 0
    : effectiveUnlimited
      ? -1
      : isTeamApp
        ? status.teamFlowLimit
        : status.flowLimit;

  return {
    status,
    loading,
    refresh,
    isTeamApp,
    effectiveLimit,
    effectiveUnlimited,
  };
}

/**
 * Test seam. The store is module state, so it survives between test cases —
 * without this, case 2 reads case 1's snapshot and its own mock is never
 * consulted. (`usePro` carries the same escape hatch for the same reason.)
 */
export function __resetPackStatus() {
  lastExpiryCheck = 0;
  packResource.reset();
}
