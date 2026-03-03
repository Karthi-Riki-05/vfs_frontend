"use client";

import { useState, useEffect, useCallback } from 'react';
import { flowsApi } from '@/api/flows.api';
import { useDebounce } from './useDebounce';
import { message } from 'antd';

export function useFlows() {
  const [flows, setFlows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState('updatedAt');

  const debouncedSearch = useDebounce(search, 300);

  const fetchFlows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await flowsApi.list({ page, limit: pageSize, search: debouncedSearch, sort });
      const d = res.data?.data || res.data || {};
      const list = d.flows || (Array.isArray(d) ? d : []);
      setFlows(list);
      setTotal(d.total || list.length || 0);
    } catch {
      // Error handled by axios interceptor
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, sort]);

  useEffect(() => { fetchFlows(); }, [fetchFlows]);

  const deleteFlow = async (id: string) => {
    try {
      await flowsApi.delete(id);
      message.success('Flow deleted');
      fetchFlows();
    } catch {
      message.error('Failed to delete flow');
    }
  };

  const duplicateFlow = async (id: string) => {
    try {
      await flowsApi.duplicate(id);
      message.success('Flow duplicated');
      fetchFlows();
    } catch {
      message.error('Failed to duplicate flow');
    }
  };

  return {
    flows, loading, search, setSearch, page, setPage,
    pageSize, setPageSize, total, sort, setSort,
    fetchFlows, deleteFlow, duplicateFlow,
  };
}
