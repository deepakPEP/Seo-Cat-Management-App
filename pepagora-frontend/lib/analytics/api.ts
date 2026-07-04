import axiosInstance from '@/lib/axiosInstance';
import type { BreakdownResponse, NodeType, Top5Item, Top5Level } from './types';
import { unwrapApiData } from './types';

export async function fetchBreakdown(
  nodeType: NodeType,
  nodeId: string,
  signal?: AbortSignal,
): Promise<BreakdownResponse> {
  const res = await axiosInstance.get('/analytics/breakdown', {
    params: { nodeType, nodeId },
    signal,
  });
  return unwrapApiData<BreakdownResponse>(res);
}

export async function fetchListCounts(
  level: Top5Level,
  parentId?: string | null,
  signal?: AbortSignal,
): Promise<{ nodeId: string; paidClients: number; freeClients: number }[]> {
  const params: Record<string, string> = { level };
  if (parentId) params.parentId = parentId;
  const res = await axiosInstance.get('/analytics/list-counts', { params, signal });
  const data = unwrapApiData<{ nodeId: string; paidClients: number; freeClients: number }[]>(res);
  return Array.isArray(data) ? data : [];
}

export async function fetchTop5(
  level: Top5Level,
  parentId?: string | null,
  signal?: AbortSignal,
): Promise<Top5Item[]> {
  const params: Record<string, string> = { level };
  if (parentId) params.parentId = parentId;
  const res = await axiosInstance.get('/analytics/top5', { params, signal });
  const data = unwrapApiData<Top5Item[]>(res);
  return Array.isArray(data) ? data : [];
}
