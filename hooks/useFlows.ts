"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { flowsApi } from "@/api/flows.api";
import { useDebounce } from "./useDebounce";
import { useAppContext } from "@/context/AppContext";
import { onWorkspaceFlush } from "@/lib/workspaceCache";
import { toast } from "sonner";

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
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [isFavorite, setIsFavorite] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const flowsReadyFiredRef = useRef(false);
  // Guards against setState after unmount (fire-and-forget refetch on nav).
  const mountedRef = useRef(true);

  const debouncedSearch = useDebounce(search, 300);

  const fetchFlows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await flowsApi.list({
        page,
        limit: pageSize,
        search: debouncedSearch,
        sort,
        sortDirection,
        isFavorite: isFavorite || undefined,
        projectId: projectId || undefined,
        teamId: activeTeamId,
      });
      const d = res.data?.data || res.data || {};
      const list = d.flows || (Array.isArray(d) ? d : []);
      if (mountedRef.current) {
        setFlows(list);
        setTotal(d.total || list.length || 0);
        setSharedFlows(Array.isArray(d.shared) ? d.shared : []);
      }
    } catch {
      // Error handled by axios interceptor
    } finally {
      if (mountedRef.current) setLoading(false);
      if (!flowsReadyFiredRef.current) {
        flowsReadyFiredRef.current = true;
        try {
          window.dispatchEvent(new CustomEvent("vc-flows-ready"));
        } catch {}
      }
    }
  }, [
    page,
    pageSize,
    debouncedSearch,
    sort,
    sortDirection,
    isFavorite,
    projectId,
    activeTeamId,
  ]);

  useEffect(() => {
    mountedRef.current = true;
    // Wait for AppContext to hydrate so we don't fire once with teamId=null
    // and then a second time once localStorage is read.
    if (!hydrated) return;
    fetchFlows();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchFlows, hydrated]);

  // Immediately discard stale workspace data when the team context switches.
  // Runs synchronously in the same batch as the switch so users never see
  // ghost-renders of the previous team's flows during the in-flight fetch.
  useEffect(
    () =>
      onWorkspaceFlush(() => {
        if (!mountedRef.current) return;
        setFlows([]);
        setSharedFlows([]);
        setTotal(0);
        setPage(1);
      }),
    [],
  );

  const deleteFlow = async (id: string) => {
    try {
      await flowsApi.delete(id);
      toast.success("Flow deleted");
      fetchFlows();
    } catch {
      toast.error("Failed to delete flow");
    }
  };

  const duplicateFlow = async (id: string) => {
    try {
      await flowsApi.duplicate(id);
      toast.success("Flow duplicated");
      fetchFlows();
    } catch {
      toast.error("Failed to duplicate flow");
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
      toast.error("Failed to update favorite");
    }
  };

  const removeSharedFlow = async (flowId: string, shareId: string) => {
    try {
      await flowsApi.removeShare(flowId, shareId);
      toast.success("Removed from shared");
      fetchFlows();
    } catch {
      toast.error("Failed to remove shared flow");
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
    sortDirection,
    setSortDirection,
    isFavorite,
    setIsFavorite,
    projectId,
    setProjectId,
    fetchFlows,
    deleteFlow,
    duplicateFlow,
    favoriteFlow,
    removeSharedFlow,
  };
}
