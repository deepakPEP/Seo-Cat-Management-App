/** Quick benchmark for top5 after tier-cache fix */
import { config } from 'dotenv';
import { MongoClient } from 'mongodb';
import * as path from 'path';
import { BusinessTierCache } from '../src/analytics/utils/business-tier.cache';
import { countTiersFromBusinessIds, toProductCountFields } from '../src/analytics/utils/tier.util';

config({ path: path.join(__dirname, '../.env') });

async function main() {
  const uri = process.env.ANALYTICS_DB_URI_PROD?.trim();
  if (!uri) process.exit(1);

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('pepagoraDb');
  const cache = new BusinessTierCache();

  const t0 = Date.now();
  const tierMap = await cache.getMap(db);
  console.log(`tier map: ${tierMap.size} entries in ${Date.now() - t0}ms`);

  const t1 = Date.now();
  const rows = await db
    .collection('liveproducts')
    .aggregate(
      [
        { $match: { status: 'live' } },
        {
          $addFields: {
            _normId: { $toString: '$category._id' },
            _nodeName: '$category.name',
            _bizId: { $toString: '$businessOf' },
          },
        },
        { $match: { _normId: { $nin: [null, '', 'null'] } } },
        {
          $group: {
            _id: '$_normId',
            name: { $first: '$_nodeName' },
            businessIds: { $push: '$_bizId' },
            productCount: { $sum: 1 },
          },
        },
        { $sort: { productCount: -1 } },
        { $limit: 5 },
      ],
      { allowDiskUse: true, maxTimeMS: 90_000 },
    )
    .toArray();

  const enriched = rows.map((row) => ({
    name: row.name,
    productCount: row.productCount,
    ...toProductCountFields(countTiersFromBusinessIds(row.businessIds, tierMap)),
  }));

  console.log(`product top5 categories in ${Date.now() - t1}ms:`, JSON.stringify(enriched, null, 2));
  await client.close();
}

main().catch(console.error);
