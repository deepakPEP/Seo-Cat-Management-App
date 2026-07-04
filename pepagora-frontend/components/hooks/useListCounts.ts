'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axiosInstance from '@/lib/axiosInstance';
import type { Top5Level } from '@/lib/analytics/types';
import { unwrapApiData } from '@/lib/analytics/types';

export type ListCountItem = {
  nodeId: string;
  paidClients: number;
  freeClients: number;
};

export function useListCounts(level: Top5Level, parentId?: string | null) {
  const [data, setData] = useState<ListCountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { level };
      if (parentId) params.parentId = parentId;
      const res = await axiosInstance.get('/analytics/list-counts', {
        params,
        signal: controller.signal,
      });
      const result = unwrapApiData<ListCountItem[]>(res);
      if (!controller.signal.aborted) {
        setData(Array.isArray(result) ? result : []);
      }
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Failed to load counts');
      setData([]);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [level, parentId]);

  useEffect(() => {
    fetchData();
    return () => abortRef.current?.abort();
  }, [fetchData]);

  const dataMap = useMemo(() => {
    const map = new Map<string, ListCountItem>();
    data.forEach((item) => map.set(item.nodeId, item));
    return map;
  }, [data]);

  return { data, dataMap, loading, error };
}
