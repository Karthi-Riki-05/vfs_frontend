"use client";

import { useCallback, useEffect, useState } from "react";
import { flowPackApi } from "@/api/notifications.api";
import { flowsApi } from "@/api/flows.api";
import { onWorkspaceFlush } from "@/lib/workspaceCache";
import { appTypeFromUserAgent } from "@/lib/detectWebView";

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

export function usePackStatus() {
  const [status, setStatus] = useState<PackStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTeamApp, setIsTeamApp] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await flowPackApi.packStatus();
      const data = res.data?.data || res.data;
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsTeamApp(readIsTeamApp());
    // Check and apply expiry in real-time on mount, then load fresh pack status.
    flowsApi
      .checkExpiry()
      .catch(() => {})
      .finally(() => refresh());
  }, [refresh]);

  // Re-scope on workspace switch: drop the previous workspace's pack/limit
  // state immediately so a stale "at-limit" banner can't bleed across, then
  // refetch under the new X-Team-Context. Mirrors useFlows' flush handling.
  // Also re-read the app surface so the effective limit follows a context flip.
  useEffect(
    () =>
      onWorkspaceFlush(() => {
        setIsTeamApp(readIsTeamApp());
        setStatus(null);
        setLoading(true);
        refresh();
      }),
    [refresh],
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
