'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchTop5 } from '@/lib/analytics/api';
import type { Top5Item, Top5Level } from '@/lib/analytics/types';

export function useTop5(level: Top5Level, parentId?: string | null) {
  const [data, setData] = useState<Top5Item[]>([]);
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
      const result = await fetchTop5(level, parentId ?? undefined, controller.signal);
      if (!controller.signal.aborted) setData(result);
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Failed to load top 5');
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
    const map = new Map<string, Top5Item>();
    data.forEach((item) => map.set(item.nodeId, item));
    return map;
  }, [data]);

  return { data, dataMap, loading, error, refetch: fetchData };
}
