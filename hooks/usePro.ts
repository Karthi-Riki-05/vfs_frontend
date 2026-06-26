"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { proApi } from "@/api/pro.api";
import { onWorkspaceFlush } from "@/lib/workspaceCache";

interface ProFlows {
  used: number;
  max: number;
  baseLimit: number;
  extraPurchased: number;
}

interface ProStatus {
  currentApp: "free" | "pro";
  hasPro: boolean;
  isUnlimited: boolean;
  proPurchasedAt: string | null;
  proFlows: ProFlows;
}

export function usePro() {
  const { data: session, status: sessionStatus } = useSession();
  const [status, setStatus] = useState<ProStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  // Must start as null on both server and client — any other initial value
  // causes a React hydration mismatch (server renders null, client reads
  // sessionStorage and gets 'pro'/'team'). The useEffect below populates it
  // after hydration, which is safe and SSR-correct.
  const [forcedMode, setForcedMode] = useState<"team" | "pro" | null>(null);

  useEffect(() => {
    try {
      // forcedMode = "we are inside a forced mobile app shell" (hides the
      // app switcher). The ONLY reliable signal is `vc_app_param`, which
      // app/page.tsx sets ONLY when the URL carries an explicit ?app=team
      // or ?app=pro (i.e. the Flutter WebView). It is removed on plain web
      // visits, so it stays null on the website.
      //
      // Do NOT read `vc_app_context` here — that key defaults to "team" even
      // for plain web visits, so it can never distinguish web from the team
      // mobile app and would wrongly hide the switcher on the website.
      let stored = sessionStorage.getItem("vc_app_param");
      if (!stored) {
        // Migrate from legacy vc_forced_app_mode (set by upgrade-pro page).
        stored = sessionStorage.getItem("vc_forced_app_mode");
        if (stored === "pro" || stored === "team") {
          sessionStorage.setItem("vc_app_param", stored);
          sessionStorage.removeItem("vc_forced_app_mode");
        }
      }
      if (stored === "team" || stored === "pro") setForcedMode(stored);
    } catch {
      // sessionStorage blocked
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    setFetchError(false);
    try {
      const res = await proApi.getAppStatus();
      const data = res.data?.data || res.data;
      setStatus(data);
    } catch (err: any) {
      console.error(
        "[usePro] fetchStatus error:",
        err?.response?.status,
        err?.message,
      );
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Use a STABLE primitive as the effect key. NextAuth replaces the
  // `session` object identity on every silent refresh; depending on the
  // object here caused /api/v1/pro/app-status to be polled every few
  // seconds (hit rate-limit).
  const userKey =
    (session?.user as any)?.id || (session?.user as any)?.email || null;
  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (userKey) {
      fetchStatus();
    } else {
      setLoading(false);
    }
  }, [userKey, sessionStatus, fetchStatus]);

  // Re-scope on workspace switch: clear the previous workspace's Pro/flow
  // status so any UI gated on proFlows can't bleed across, then refetch under
  // the new X-Team-Context. Mirrors useFlows' onWorkspaceFlush handling.
  useEffect(
    () =>
      onWorkspaceFlush(() => {
        setStatus(null);
        setLoading(true);
        fetchStatus();
      }),
    [fetchStatus],
  );

  const switchApp = useCallback(async (app: "free" | "pro") => {
    try {
      const res = await proApi.switchApp(app);
      const data = res.data?.data || res.data;

      // Backend returns { requiresPurchase: true, url } when the user
      // hasn't bought Pro yet — Pro is a separate one-time $1 product
      // that team-plan owners must buy explicitly. Redirect to checkout.
      if (data?.requiresPurchase && data?.url) {
        window.location.href = data.url;
        return false;
      }

      // Pro and Team are different apps — leaving Pro mode shouldn't
      // keep the user inside a Team workspace context (that would render
      // the Team dashboard view inside the Pro app). Reset to personal.
      try {
        const STORAGE_KEY = "vc_active_context";
        const next = { type: "personal" };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(
          new CustomEvent("vc:context-change", { detail: next }),
        );
      } catch {
        /* localStorage may be blocked */
      }

      // Keep X-App-Context header in sync with the new app mode so all
      // subsequent API calls hit the correct server-side appContext bucket.
      // Write to sessionStorage (per-tab) — does not affect sibling tabs (Fix 2).
      try {
        if (app === "pro") {
          sessionStorage.setItem("vc_app_context", "pro");
        } else {
          sessionStorage.removeItem("vc_app_context");
        }
      } catch {
        /* sessionStorage may be blocked in restricted WebViews */
      }

      setStatus((prev) => (prev ? { ...prev, currentApp: app } : prev));
      return true;
    } catch {
      return false;
    }
  }, []);

  const purchasePro = useCallback(async () => {
    try {
      const res = await proApi.purchasePro();
      const data = res.data?.data || res.data;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      throw err;
    }
  }, []);

  const buyFlows = useCallback(async (flowPackage: "50" | "unlimited") => {
    try {
      const res = await proApi.buyFlows(flowPackage);
      const data = res.data?.data || res.data;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      throw err;
    }
  }, []);

  const hasPro = status?.hasPro ?? false;
  const proPurchasedAt = status?.proPurchasedAt ?? null;

  return {
    status,
    loading,
    fetchError,
    hasPro,
    proPurchasedAt,
    isProOwner: hasPro && proPurchasedAt !== null,
    currentApp: status?.currentApp ?? "free",
    proFlows: status?.proFlows ?? null,
    forcedMode,
    switchApp,
    purchasePro,
    buyFlows,
    refresh: fetchStatus,
  };
}
