import { Db } from 'mongodb';
import { FREE_TIER, normalizeTier } from './tier.util';

const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Loads businessId → packageType once and caches it.
 * Avoids per-document $lookup into live_catalog (which hung on 187k+ liveproducts).
 */
export class BusinessTierCache {
  private cache: Map<string, string> | null = null;
  private loadedAt = 0;
  private loading: Promise<Map<string, string>> | null = null;

  async getMap(db: Db): Promise<Map<string, string>> {
    if (this.cache && Date.now() - this.loadedAt < CACHE_TTL_MS) {
      return this.cache;
    }

    if (!this.loading) {
      this.loading = this.load(db).finally(() => {
        this.loading = null;
      });
    }

    return this.loading;
  }

  invalidate(): void {
    this.cache = null;
    this.loadedAt = 0;
  }

  private async load(db: Db): Promise<Map<string, string>> {
    const rows = await db
      .collection('live_catalog')
      .aggregate<{ _id: string; packageType?: string }>(
        [
          { $sort: { updatedAt: -1 } },
          {
            $group: {
              _id: { $toString: '$business_id' },
              packageType: { $first: '$packageType' },
            },
          },
        ],
        { allowDiskUse: true, maxTimeMS: 120_000 },
      )
      .toArray();

    const map = new Map<string, string>();
    for (const row of rows) {
      if (row._id) map.set(row._id, normalizeTier(row.packageType));
    }

    this.cache = map;
    this.loadedAt = Date.now();
    return map;
  }
}

export function tierForBusiness(
  businessId: string | undefined | null,
  tierMap: Map<string, string>,
): string {
  if (!businessId) return FREE_TIER;
  return tierMap.get(String(businessId)) ?? FREE_TIER;
}
