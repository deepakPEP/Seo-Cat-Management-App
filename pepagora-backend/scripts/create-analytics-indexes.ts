/**
 * Create analytics indexes on pepagoraDb.
 * Usage: npx ts-node scripts/create-analytics-indexes.ts
 */
import { config } from 'dotenv';
import { MongoClient } from 'mongodb';
import * as path from 'path';

config({ path: path.join(__dirname, '../.env') });

const DB_NAME = 'pepagoraDb';

const INDEXES: { collection: string; key: Record<string, 1 | -1>; name: string }[] = [
  { collection: 'businessprofiles', key: { 'productCategories._id': 1 }, name: 'analytics_pc_id' },
  { collection: 'businessprofiles', key: { 'categories._id': 1 }, name: 'analytics_cat_id' },
  { collection: 'businessprofiles', key: { 'subCategories._id': 1 }, name: 'analytics_subcat_id' },
  {
    collection: 'users',
    key: { businessId: 1, 'currentPlan.isActive': 1, 'currentPlan.planId': 1 },
    name: 'analytics_business_plan',
  },
  {
    collection: 'users',
    key: { 'currentPlan.planId': 1, 'currentPlan.isActive': 1 },
    name: 'analytics_plan_active',
  },
  {
    collection: 'liveproducts',
    key: { status: 1, 'productCategory._id': 1, businessOf: 1 },
    name: 'analytics_live_pc_biz',
  },
  { collection: 'liveproducts', key: { status: 1, 'subCategory._id': 1 }, name: 'analytics_live_subcat' },
  { collection: 'liveproducts', key: { status: 1, 'category._id': 1 }, name: 'analytics_live_cat' },
  { collection: 'liveproducts', key: { businessOf: 1 }, name: 'analytics_live_biz' },
];

async function main() {
  const uri = process.env.ANALYTICS_DB_URI_PROD;
  if (!uri) {
    console.error('ANALYTICS_DB_URI_PROD not set — skipping index creation.');
    process.exit(0);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(DB_NAME);

  for (const { collection, key, name } of INDEXES) {
    try {
      const result = await db.collection(collection).createIndex(key, { name, background: true });
      console.log(`✓ ${collection}.${name} -> ${result}`);
    } catch (err) {
      console.warn(`⚠ ${collection}.${name}:`, (err as Error).message);
    }
  }

  await client.close();
  console.log('Index creation complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
