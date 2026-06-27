'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchBreakdown } from '@/lib/analytics/api';
import type { BreakdownResponse, NodeType } from '@/lib/analytics/types';

export function useBreakdown(nodeType: NodeType | null, nodeId: string | null) {
  const [data, setData] = useState<BreakdownResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const canFetch = useMemo(
    () => Boolean(nodeType && nodeId),
    [nodeType, nodeId],
  );

  const fetchData = useCallback(async () => {
    if (!nodeType || !nodeId) {
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const result = await fetchBreakdown(nodeType, nodeId, controller.signal);
      if (!controller.signal.aborted) setData(result);
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Failed to load breakdown');
      setData(null);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [nodeType, nodeId]);

  useEffect(() => {
    fetchData();
    return () => abortRef.current?.abort();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, canFetch };
}
