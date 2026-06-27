import { config } from 'dotenv';
import { MongoClient } from 'mongodb';
import * as path from 'path';
import {
  clientCategoryUnwindStages,
  clientGroupFields,
  normalizeClientIdStage,
} from '../src/analytics/pipelines/tier-pipelines';

config({ path: path.join(__dirname, '../.env') });

async function main() {
  const uri = process.env.ANALYTICS_DB_URI_PROD?.trim();
  if (!uri) process.exit(1);

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('pepagoraDb');

  const { groupId, name, uniqueId, idExpr } = clientGroupFields('category');

  const pipeline = [
    ...clientCategoryUnwindStages(),
    normalizeClientIdStage(idExpr),
    {
      $group: {
        _id: groupId,
        name: { $first: name },
        uniqueId: { $first: uniqueId },
        bizIds: { $addToSet: '$_id' },
      },
    },
    { $match: { _id: { $nin: [null, ''] } } },
    { $addFields: { supplierCount: { $size: '$bizIds' } } },
    { $sort: { supplierCount: -1 } },
    { $limit: 5 },
  ];

  console.log('Pipeline groupId:', groupId, 'idExpr:', idExpr);

  try {
    const rows = await db
      .collection('businessprofiles')
      .aggregate(pipeline, { allowDiskUse: true, maxTimeMS: 90_000 })
      .toArray();
    console.log('client top5 category rows:', rows.length);
    console.log(JSON.stringify(rows.slice(0, 3), null, 2));
  } catch (e) {
    console.error('AGG ERROR:', e);
  }

  await client.close();
}

main();
