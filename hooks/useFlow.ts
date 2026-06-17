"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { flowsApi } from "@/api/flows.api";
import { onWorkspaceFlush } from "@/lib/workspaceCache";
import { message } from "antd";

export function useFlow(id: string) {
  const [flow, setFlow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<NodeJS.Timeout>();

  const fetchFlow = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await flowsApi.get(id);
      setFlow(res.data?.data || res.data);
    } catch {
      message.error("Failed to load flow");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchFlow();
  }, [fetchFlow]);

  // Clear the loaded flow on workspace switch so a flow from the previous
  // bucket can't linger if the new context can't access the same id.
  useEffect(() => onWorkspaceFlush(() => setFlow(null)), []);

  const updateFlow = useCallback(
    async (data: any) => {
      try {
        setSaving(true);
        const res = await flowsApi.update(id, data);
        setFlow(res.data?.data || res.data);
        message.success("Saved");
      } catch {
        message.error("Failed to save");
      } finally {
        setSaving(false);
      }
    },
    [id],
  );

  // Auto-save with debounce
  const autoSave = useCallback(
    (data: any) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => updateFlow(data), 2000);
    },
    [updateFlow],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  return { flow, loading, saving, fetchFlow, updateFlow, autoSave };
}
