"use client";

import { useState, useEffect, useCallback } from "react";
import { flowsApi } from "@/api/flows.api";
import { useDebounce } from "./useDebounce";
import { useAppContext } from "@/context/AppContext";
import { message } from "antd";

export function useFlows() {
  const { activeTeamId, hydrated } = useAppContext();
  const [flows, setFlows] = useState<any[]>([]);
  const [sharedFlows, setSharedFlows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState("updatedAt");

  const debouncedSearch = useDebounce(search, 300);

  const fetchFlows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await flowsApi.list({
        page,
        limit: pageSize,
        search: debouncedSearch,
        sort,
        teamId: activeTeamId,
      });
      const d = res.data?.data || res.data || {};
      const list = d.flows || (Array.isArray(d) ? d : []);
      setFlows(list);
      setTotal(d.total || list.length || 0);
      setSharedFlows(Array.isArray(d.shared) ? d.shared : []);
    } catch {
      // Error handled by axios interceptor
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, sort, activeTeamId]);

  useEffect(() => {
    // Wait for AppContext to hydrate so we don't fire once with teamId=null
    // and then a second time once localStorage is read.
    if (!hydrated) return;
    fetchFlows();
  }, [fetchFlows, hydrated]);

  const deleteFlow = async (id: string) => {
    try {
      await flowsApi.delete(id);
      message.success("Flow deleted");
      fetchFlows();
    } catch {
      message.error("Failed to delete flow");
    }
  };

  const duplicateFlow = async (id: string) => {
    try {
      await flowsApi.duplicate(id);
      message.success("Flow duplicated");
      fetchFlows();
    } catch {
      message.error("Failed to duplicate flow");
    }
  };

  const favoriteFlow = async (id: string) => {
    try {
      const flow = flows.find((f) => f.id === id);
      const newState = !flow?.isFavorite;
      await flowsApi.toggleFavorite(id, newState);
      setFlows((prev) =>
        prev.map((f) => (f.id === id ? { ...f, isFavorite: newState } : f)),
      );
    } catch {
      message.error("Failed to update favorite");
    }
  };

  const removeSharedFlow = async (flowId: string, shareId: string) => {
    try {
      await flowsApi.removeShare(flowId, shareId);
      message.success("Removed from shared");
      fetchFlows();
    } catch {
      message.error("Failed to remove shared flow");
    }
  };

  return {
    flows,
    sharedFlows,
    loading,
    search,
    setSearch,
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    sort,
    setSort,
    fetchFlows,
    deleteFlow,
    duplicateFlow,
    favoriteFlow,
    removeSharedFlow,
  };
}
