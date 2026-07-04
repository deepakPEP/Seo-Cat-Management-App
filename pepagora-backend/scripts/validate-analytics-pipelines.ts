/**
 * Validate analytics pipelines with explain('executionStats').
 * Usage: npx ts-node scripts/validate-analytics-pipelines.ts
 */
import { config } from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import * as path from 'path';

config({ path: path.join(__dirname, '../.env') });

const DB_NAME = 'pepagoraDb';

async function explainPipeline(
  db: import('mongodb').Db,
  name: string,
  collection: string,
  pipeline: object[],
) {
  try {
    const cursor = db.collection(collection).aggregate(pipeline);
    const explained = await cursor.explain('executionStats');
    const stats = (explained as { executionStats?: { executionTimeMillis?: number } }).executionStats;
    const time = stats?.executionTimeMillis ?? -1;
    console.log(`[${name}] ${collection} — ${time}ms`);
    return time;
  } catch (err) {
    console.warn(`[${name}] failed:`, (err as Error).message);
    return -1;
  }
}

async function main() {
  const uri = process.env.ANALYTICS_DB_URI_PROD;
  if (!uri) {
    console.log('ANALYTICS_DB_URI_PROD not set — skip pipeline validation.');
    return;
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(DB_NAME);

  const samplePc = await db.collection('productcategories').findOne({});
  const sampleCat = await db.collection('categories').findOne({});
  const pcId = samplePc?._id ?? new ObjectId();
  const catId = sampleCat?._id ?? new ObjectId();

  const pipelines: { name: string; collection: string; pipeline: object[] }[] = [
    {
      name: 'client-leaf',
      collection: 'businessprofiles',
      pipeline: [{ $match: { 'productCategories._id': pcId } }, { $limit: 1 }],
    },
    {
      name: 'client-category',
      collection: 'businessprofiles',
      pipeline: [{ $match: { 'categories._id': catId } }, { $limit: 1 }],
    },
    {
      name: 'product-leaf',
      collection: 'liveproducts',
      pipeline: [{ $match: { status: 'live', 'productCategory._id': pcId } }, { $limit: 1 }],
    },
    {
      name: 'product-category',
      collection: 'liveproducts',
      pipeline: [{ $match: { status: 'live', 'category._id': catId } }, { $limit: 1 }],
    },
  ];

  for (const p of pipelines) {
    await explainPipeline(db, p.name, p.collection, p.pipeline);
  }

  await client.close();
  console.log('Pipeline validation complete.');
}

main().catch(console.error);
