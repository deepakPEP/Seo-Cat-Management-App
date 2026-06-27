export type NodeType = 'category' | 'subcategory' | 'product_category';

export type Top5Level = 'category' | 'subcategory' | 'product_category';



export interface TierCounts {

  paidTotal: number;

  explore: number;

  grow: number;

  scale: number;

  global: number;

  free: number;

  total: number;

}



export interface BreakdownResponse {

  clients: TierCounts;

  products: TierCounts;

}



export interface Top5Item {

  nodeId: string;

  name: string;

  uniqueId: string;

  rank: number;

  paidClients: number;

  exploreClients: number;

  growClients: number;

  scaleClients: number;

  globalClients: number;

  freeClients: number;

  paidProducts: number;

  exploreProducts: number;

  growProducts: number;

  scaleProducts: number;

  globalProducts: number;

  freeProducts: number;

}



/** Unwrap nested API response from axios + ResponseInterceptor */

export function unwrapApiData<T>(res: { data?: unknown }): T {

  const d = res.data as Record<string, unknown> | undefined;

  if (!d) return [] as T;

  const inner = d.data as Record<string, unknown> | undefined;

  if (inner?.data !== undefined) return inner.data as T;

  if (inner !== undefined && !('statusCode' in (inner || {}))) return inner as T;

  if (d.data !== undefined) return d.data as T;

  return d as T;

}



export function formatCount(n: number): string {

  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;

  return String(n);

}


