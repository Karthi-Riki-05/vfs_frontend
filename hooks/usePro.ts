"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { proApi } from "@/api/pro.api";

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

  const fetchStatus = useCallback(async () => {
    console.log("[usePro] fetchStatus called");
    setFetchError(false);
    try {
      const res = await proApi.getAppStatus();
      const data = res.data?.data || res.data;
      console.log("[usePro] fetchStatus response:", JSON.stringify(data));
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

  return {
    status,
    loading,
    fetchError,
    hasPro: status?.hasPro ?? false,
    currentApp: status?.currentApp ?? "free",
    proFlows: status?.proFlows ?? null,
    switchApp,
    purchasePro,
    buyFlows,
    refresh: fetchStatus,
  };
}
