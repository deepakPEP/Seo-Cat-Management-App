import type { TierCounts } from '../utils/tier.util';
import { EMPTY_TIER_COUNTS } from '../utils/tier.util';

export type { TierCounts } from '../utils/tier.util';
export { EMPTY_TIER_COUNTS, PAID_TIERS, FREE_TIER, parseTierCounts, paidPercent } from '../utils/tier.util';

export type NodeType = 'category' | 'subcategory' | 'product_category';
export type Top5Level = 'category' | 'subcategory' | 'product_category';

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

export interface ListCountItem {
  nodeId: string;
  paidClients: number;
  freeClients: number;
}

export interface ScreenAnalyticsBase {
  nodeId: string;
  nodeType: NodeType;
  name: string | null;
  clients: TierCounts;
  products: TierCounts;
}

export interface CategoryScreenAnalytics extends ScreenAnalyticsBase {
  top5SubCategories: Top5Item[];
  subCategoryList: ListCountItem[];
}

export interface SubCategoryScreenAnalytics extends ScreenAnalyticsBase {
  top5ProductCategories: Top5Item[];
  productCategoryList: ListCountItem[];
}

export interface ProductCategoryScreenAnalytics extends ScreenAnalyticsBase {
  paidPercent: number;
  freePercent: number;
}

export interface HomeTopCategoriesResponse {
  topCategories: Top5Item[];
  topProductCategories: Top5Item[];
}
