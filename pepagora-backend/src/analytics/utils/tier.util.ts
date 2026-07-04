/**
 * Pepagora supplier tier helpers.
 *
 * Tier source (verified on pepagoraDb):
 * - businessprofiles.supplierBadge → certification labels (TruBasic, TruAccess, …) — NOT subscription tier
 * - live_catalog.packageType → explore | grow | scale | global | free — used for P/F analytics
 *
 * Recommended indexes:
 * - businessprofiles: { "categories._id": 1 }, { "subCategories._id": 1 }, { "productCategories._id": 1 }, { "industry._id": 1 }
 * - liveproducts: { status: 1, "category._id": 1 }, { status: 1, "subCategory._id": 1 }, { status: 1, "productCategory._id": 1 }, { businessOf: 1 }
 * - live_catalog: { business_id: 1, updatedAt: -1 }
 */

export const PAID_TIERS = ['explore', 'grow', 'scale', 'global'] as const;
export const FREE_TIER = 'free';
export type PaidTier = (typeof PAID_TIERS)[number];
export type SupplierTier = PaidTier | typeof FREE_TIER;

export interface TierCounts {
  paidTotal: number;
  explore: number;
  grow: number;
  scale: number;
  global: number;
  free: number;
  total: number;
}

export const EMPTY_TIER_COUNTS: TierCounts = {
  paidTotal: 0,
  explore: 0,
  grow: 0,
  scale: 0,
  global: 0,
  free: 0,
  total: 0,
};

export function normalizeTier(raw: string | null | undefined): SupplierTier {
  const t = (raw ?? FREE_TIER).toLowerCase().trim();
  if ((PAID_TIERS as readonly string[]).includes(t)) return t as PaidTier;
  return FREE_TIER;
}

/** Parse $group rows: { _id: tier, count } */
export function parseTierCounts(
  aggResult: { _id?: string | null; count?: number }[],
): TierCounts {
  const find = (tier: string) =>
    aggResult.find((row) => normalizeTier(row._id ?? undefined) === tier)?.count ?? 0;

  const explore = find('explore');
  const grow = find('grow');
  const scale = find('scale');
  const global = find('global');
  const free = find('free');
  const paidTotal = explore + grow + scale + global;
  return { paidTotal, explore, grow, scale, global, free, total: paidTotal + free };
}

export function tierCountsFromGroupedRow(row: Record<string, number | undefined>): TierCounts {
  const explore = row.exploreClients ?? row.exploreProducts ?? row.explore ?? 0;
  const grow = row.growClients ?? row.growProducts ?? row.grow ?? 0;
  const scale = row.scaleClients ?? row.scaleProducts ?? row.scale ?? 0;
  const global = row.globalClients ?? row.globalProducts ?? row.global ?? 0;
  const free = row.freeClients ?? row.freeProducts ?? row.free ?? 0;
  const paidTotal = row.paidClients ?? row.paidProducts ?? explore + grow + scale + global;
  return { paidTotal, explore, grow, scale, global, free, total: paidTotal + free };
}

export function paidPercent(counts: TierCounts): number {
  if (counts.total === 0) return 0;
  return Math.round((counts.paidTotal / counts.total) * 100);
}

/** Count tier buckets from a list of business IDs (one entry = one supplier or one product row). */
export function countTiersFromBusinessIds(
  businessIds: Iterable<string | { toString(): string } | null | undefined>,
  tierMap: Map<string, string>,
): TierCounts {
  const counts = { ...EMPTY_TIER_COUNTS };
  for (const id of businessIds) {
    if (id == null) {
      counts.free++;
      continue;
    }
    const tier = tierMap.get(String(id)) ?? FREE_TIER;
    switch (tier) {
      case 'explore':
        counts.explore++;
        break;
      case 'grow':
        counts.grow++;
        break;
      case 'scale':
        counts.scale++;
        break;
      case 'global':
        counts.global++;
        break;
      default:
        counts.free++;
    }
  }
  counts.paidTotal = counts.explore + counts.grow + counts.scale + counts.global;
  counts.total = counts.paidTotal + counts.free;
  return counts;
}

export function toClientCountFields(counts: TierCounts) {
  return {
    paidClients: counts.paidTotal,
    exploreClients: counts.explore,
    growClients: counts.grow,
    scaleClients: counts.scale,
    globalClients: counts.global,
    freeClients: counts.free,
  };
}

export function toProductCountFields(counts: TierCounts) {
  return {
    paidProducts: counts.paidTotal,
    exploreProducts: counts.explore,
    growProducts: counts.grow,
    scaleProducts: counts.scale,
    globalProducts: counts.global,
    freeProducts: counts.free,
  };
}
