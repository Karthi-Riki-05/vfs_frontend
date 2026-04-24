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
      await proApi.switchApp(app);
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
