"use client";

import { useState, useCallback } from 'react';

export function usePagination(initialPage = 1, initialPageSize = 10) {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [total, setTotal] = useState(0);

  const onChange = useCallback((newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
  }, []);

  const reset = useCallback(() => {
    setPage(initialPage);
  }, [initialPage]);

  return {
    page,
    pageSize,
    total,
    setTotal,
    onChange,
    reset,
    paginationProps: {
      current: page,
      pageSize,
      total,
      onChange,
      showSizeChanger: true,
      showTotal: (t: number) => `Total ${t} items`,
    },
  };
}
