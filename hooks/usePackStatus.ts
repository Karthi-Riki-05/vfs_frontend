"use client";

import { useCallback, useEffect, useState } from "react";
import { flowPackApi } from "@/api/notifications.api";

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
  daysUntilExpiry: number | null;
}

export function usePackStatus() {
  const [status, setStatus] = useState<PackStatus | null>(null);
  const [loading, setLoading] = useState(true);

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
    refresh();
  }, [refresh]);

  return { status, loading, refresh };
}
