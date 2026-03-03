"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { flowsApi } from '@/api/flows.api';
import { message } from 'antd';

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
      setFlow(res.data);
    } catch {
      message.error('Failed to load flow');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchFlow(); }, [fetchFlow]);

  const updateFlow = async (data: any) => {
    try {
      setSaving(true);
      const res = await flowsApi.update(id, data);
      setFlow(res.data);
      message.success('Saved');
    } catch {
      message.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Auto-save with debounce
  const autoSave = useCallback((data: any) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => updateFlow(data), 2000);
  }, [id]);

  useEffect(() => {
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, []);

  return { flow, loading, saving, fetchFlow, updateFlow, autoSave };
}
