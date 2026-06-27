import { config } from 'dotenv';
import { MongoClient } from 'mongodb';
import * as path from 'path';

config({ path: path.join(__dirname, '../.env') });

async function main() {
  const uri = process.env.ANALYTICS_DB_URI_PROD?.trim();
  if (!uri) process.exit(1);

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('pepagoraDb');

  console.log('supplierBadge:', await db.collection('businessprofiles').distinct('supplierBadge'));
  console.log('packageType:', await db.collection('live_catalog').distinct('packageType'));

  const tierFromCatalogLatest = await db
    .collection('businessprofiles')
    .aggregate([
      {
        $lookup: {
          from: 'live_catalog',
          let: { bid: '$_id', bidStr: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [{ $eq: ['$business_id', '$$bid'] }, { $eq: ['$business_id', '$$bidStr'] }],
                },
              },
            },
            { $sort: { updatedAt: -1 } },
            { $limit: 1 },
          ],
          as: 'catalog',
        },
      },
      { $unwind: { path: '$catalog', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          tier: { $toLower: { $ifNull: ['$catalog.packageType', 'free'] } },
        },
      },
      { $group: { _id: '$tier', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])
    .toArray();

  console.log('tier (latest catalog per business, else free):', tierFromCatalogLatest);

  await client.close();
}

main().catch(console.error);
