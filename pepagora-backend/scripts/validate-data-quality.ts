/**
 * Validates MongoDB field types and match patterns for analytics/marketing queries.
 */
import { config } from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import * as path from 'path';

config({ path: path.join(__dirname, '../.env') });

async function main() {
  const uri = process.env.ANALYTICS_DB_URI_PROD?.trim();
  if (!uri) {
    console.error('ANALYTICS_DB_URI_PROD not set');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('pepagoraDb');

  const bp = await db.collection('businessprofiles').findOne({ 'categories.0': { $exists: true } });
  const lp = await db.collection('liveproducts').findOne({ status: 'live' });
  const pc = await db.collection('productcategories').findOne({});
  const sub = await db.collection('subcategories').findOne({});

  const catId = bp?.categories?.[0]?._id;
  const pcId = lp?.productCategory?._id;
  const parentId = pc?.parentId;

  console.log('=== Field types ===');
  console.log('bp.categories[0]._id type:', catId?.constructor?.name, String(catId));
  console.log('lp.productCategory._id type:', pcId?.constructor?.name, String(pcId));
  console.log('pc.parentId type:', parentId?.constructor?.name, String(parentId));
  console.log('lp.status values:', await db.collection('liveproducts').distinct('status'));
  console.log('live products total:', await db.collection('liveproducts').countDocuments());
  console.log('live status=live:', await db.collection('liveproducts').countDocuments({ status: 'live' }));

  if (catId) {
    const oid = catId instanceof ObjectId ? catId : new ObjectId(String(catId));
    const matchOid = await db.collection('businessprofiles').countDocuments({ 'categories._id': oid });
    const matchStr = await db.collection('businessprofiles').countDocuments({ 'categories._id': String(catId) });
    console.log('bp match categories._id as ObjectId:', matchOid);
    console.log('bp match categories._id as String:', matchStr);
  }

  if (pcId && pc) {
    const oid = pc._id;
    const matchOid = await db.collection('liveproducts').countDocuments({ 'productCategory._id': oid });
    const matchStr = await db.collection('liveproducts').countDocuments({ 'productCategory._id': String(oid) });
    const matchPcId = await db.collection('liveproducts').countDocuments({ 'productCategory._id': pcId });
    console.log('lp match productCategory._id with pc._id ObjectId:', matchOid);
    console.log('lp match productCategory._id as String:', matchStr);
    console.log('lp match productCategory._id from sample lp:', matchPcId);
  }

  if (sub) {
    const subOid = sub._id;
    const countOid = await db.collection('productcategories').countDocuments({ parentId: subOid });
    const countStr = await db.collection('productcategories').countDocuments({ parentId: String(subOid) });
    console.log('pc parentId match ObjectId:', countOid, 'as String:', countStr);
  }

  const hasIndustry = await db.collection('businessprofiles').countDocuments({ industry: { $exists: true } });
  const hasCategories = await db.collection('businessprofiles').countDocuments({ 'categories.0': { $exists: true } });
  console.log('bp with industry:', hasIndustry, 'with categories:', hasCategories);

  const user = await db.collection('users').findOne({ businessId: { $exists: true } });
  console.log('users.businessId type:', user?.businessId?.constructor?.name);

  const bpWithUser = await db
    .collection('businessprofiles')
    .aggregate([
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'businessId',
          as: 'u',
        },
      },
      { $project: { _id: 1, userCount: { $size: '$u' } } },
    ])
    .toArray();
  console.log('lookup _id->businessId samples:', JSON.stringify(bpWithUser));

  // Sample breakdown for first category
  const category = await db.collection('categories').findOne({});
  if (category) {
    const cid = category._id;
    const clientOid = await db.collection('businessprofiles').countDocuments({ 'categories._id': cid });
    const clientStr = await db.collection('businessprofiles').countDocuments({ 'categories._id': String(cid) });
    const prodLive = await db.collection('liveproducts').countDocuments({ status: 'live', 'category._id': cid });
    const prodAll = await db.collection('liveproducts').countDocuments({ 'category._id': cid });
    console.log(`Category ${category.name}: clients(oid)=${clientOid} clients(str)=${clientStr} products(live)=${prodLive} products(all)=${prodAll}`);

    const clientIndustry = await db.collection('businessprofiles').countDocuments({ 'industry._id': cid });
    const clientIndustryStr = await db.collection('businessprofiles').countDocuments({ 'industry._id': String(cid) });
    const clientIndustryFlat = await db.collection('businessprofiles').countDocuments({ industry: cid });
    console.log(`  industry._id ObjectId=${clientIndustry} industry._id String=${clientIndustryStr} industry flat=${clientIndustryFlat}`);
  }

  // Tier lookup: $expr vs string businessId
  const exprLookup = await db
    .collection('businessprofiles')
    .aggregate([
      { $limit: 100 },
      {
        $lookup: {
          from: 'users',
          let: { bid: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$businessId', '$$bid'] },
              },
            },
          ],
          as: 'userPlanExpr',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'businessId',
          as: 'userPlanLocal',
        },
      },
      {
        $project: {
          exprHits: { $size: '$userPlanExpr' },
          localHits: { $size: '$userPlanLocal' },
        },
      },
      {
        $group: {
          _id: null,
          exprTotal: { $sum: '$exprHits' },
          localTotal: { $sum: '$localHits' },
          docsWithExpr: { $sum: { $cond: [{ $gt: ['$exprHits', 0] }, 1, 0] } },
          docsWithLocal: { $sum: { $cond: [{ $gt: ['$localHits', 0] }, 1, 0] } },
        },
      },
    ])
    .toArray();
  console.log('Tier lookup expr vs local (100 bp sample):', JSON.stringify(exprLookup[0]));

  const exprLookupFixed = await db
    .collection('businessprofiles')
    .aggregate([
      { $limit: 100 },
      {
        $lookup: {
          from: 'users',
          let: { bid: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$businessId', '$$bid'] },
              },
            },
          ],
          as: 'userPlan',
        },
      },
      {
        $group: {
          _id: null,
          hits: { $sum: { $size: '$userPlan' } },
          docs: { $sum: { $cond: [{ $gt: [{ $size: '$userPlan' }, 0] }, 1, 0] } },
        },
      },
    ])
    .toArray();
  console.log('Tier lookup with $toString fix (100 bp sample):', JSON.stringify(exprLookupFixed[0]));

  const sampleIndustry = await db.collection('businessprofiles').findOne({ industry: { $exists: true } });
  if (sampleIndustry) {
    console.log('sample industry field:', JSON.stringify(sampleIndustry.industry));
  }

  // subCategories / productCategories id types
  const bpSub = await db.collection('businessprofiles').findOne({ 'subCategories.0': { $exists: true } });
  const bpPc = await db.collection('businessprofiles').findOne({ 'productCategories.0': { $exists: true } });
  if (bpSub?.subCategories?.[0]) {
    console.log('subCategories[0]._id type:', bpSub.subCategories[0]._id?.constructor?.name);
  }
  if (bpPc?.productCategories?.[0]) {
    console.log('productCategories[0]._id type:', bpPc.productCategories[0]._id?.constructor?.name);
  }

  // liveproducts category id string vs oid
  const live = db.collection('liveproducts');
  for (const f of ['category._id', 'subCategory._id', 'productCategory._id']) {
    const o = await live.countDocuments({ [f]: { $type: 'objectId' } });
    const s = await live.countDocuments({ [f]: { $type: 'string' } });
    console.log(`liveproducts ${f} ObjectId:`, o, 'String:', s);
  }

  // businesses with industry but no categories
  const industryOnly = await db.collection('businessprofiles').countDocuments({
    industry: { $exists: true },
    'categories.0': { $exists: false },
  });
  console.log('bp industry-only (no categories array):', industryOnly);

  const bpCol = db.collection('businessprofiles');
  for (const f of ['categories._id', 'subCategories._id', 'productCategories._id', 'industry._id']) {
    const o = await bpCol.countDocuments({ [f]: { $type: 'objectId' } });
    const s = await bpCol.countDocuments({ [f]: { $type: 'string' } });
    console.log(`businessprofiles ${f} docs with ObjectId:`, o, 'String:', s);
  }

  // Combined category client count for Electronics
  if (category) {
    const cid = category._id;
    const combined = await db.collection('businessprofiles').countDocuments({
      $or: [
        { 'categories._id': cid },
        { 'categories._id': String(cid) },
        { 'industry._id': cid },
        { 'industry._id': String(cid) },
      ],
    });
    console.log(`Combined client match for ${category.name}:`, combined);
  }

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
