/**
 * Read-only schema introspection for pepagoraDb analytics collections.
 * Usage: npx ts-node scripts/schema-audit.ts
 */
import { config } from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';

config({ path: path.join(__dirname, '../.env') });

const DB_NAME = 'pepagoraDb';
const COLLECTIONS = [
  'businessprofiles',
  'users',
  'liveproducts',
  'categories',
  'subcategories',
  'productcategories',
] as const;

function sampleKeys(doc: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(doc)) {
    const full = prefix ? `${prefix}.${k}` : k;
    keys.push(full);
    if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof ObjectId) && !(v instanceof Date)) {
      keys.push(...sampleKeys(v as Record<string, unknown>, full));
    }
    if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object' && v[0] !== null) {
      keys.push(...sampleKeys(v[0] as Record<string, unknown>, `${full}[]`));
    }
  }
  return keys;
}

async function main() {
  const uri = process.env.ANALYTICS_DB_URI_PROD;
  if (!uri) {
    console.error('ANALYTICS_DB_URI_PROD not set — writing audit with expected schema only.');
    writeAuditDoc({ connected: false, error: 'ANALYTICS_DB_URI_PROD missing' });
    process.exit(0);
  }

  const client = new MongoClient(uri);
  const report: Record<string, unknown> = { connected: true, db: DB_NAME, collections: {} };

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    for (const name of COLLECTIONS) {
      const col = db.collection(name);
      const count = await col.estimatedDocumentCount();
      const sample = await col.findOne({});
      const indexes = await col.indexes();

      (report.collections as Record<string, unknown>)[name] = {
        count,
        indexes: indexes.map((i) => ({ name: i.name, key: i.key })),
        sampleKeys: sample ? [...new Set(sampleKeys(sample as Record<string, unknown>))].sort() : [],
        sample: sample ? JSON.parse(JSON.stringify(sample)) : null,
      };
    }

    const bp = db.collection('businessprofiles');
    const users = db.collection('users');
    const live = db.collection('liveproducts');

    report.audits = {
      businessProfilesWithoutProductCategories: await bp.countDocuments({
        'productCategories.0': { $exists: false },
      }),
      liveProductStatuses: await live.distinct('status'),
      userPlanIds: await users.distinct('currentPlan.planId'),
      businessIdTypeCheck: await checkBusinessIdTypes(db),
    };

    writeAuditDoc(report);
    console.log('Schema audit written to docs/schema-audit.md');
  } finally {
    await client.close();
  }
}

async function checkBusinessIdTypes(db: import('mongodb').Db) {
  const bp = await db.collection('businessprofiles').findOne({});
  const user = await db.collection('users').findOne({ businessId: { $exists: true } });
  return {
    businessprofiles_id: bp?._id != null ? typeof bp._id : 'missing',
    users_businessId: user?.businessId != null ? typeof user.businessId : 'missing',
    liveproducts_businessOf: (
      await db.collection('liveproducts').findOne({ businessOf: { $exists: true } })
    )?.businessOf != null
      ? 'present'
      : 'missing',
  };
}

function writeAuditDoc(report: Record<string, unknown>) {
  const outDir = path.join(__dirname, '../../docs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const expected = `
## Expected schema (Implementation Plan v2)

| Collection | Fields used in analytics |
|------------|-------------------------|
| businessprofiles | _id, categories[{_id,name,uniqueId}], subCategories[], productCategories[] |
| users | businessId, currentPlan.planId, isActive, isTrial, endDate |
| liveproducts | status, businessOf, category._id, subCategory._id, productCategory._id |
`;

  const content = `# Schema Audit — pepagoraDb

Generated: ${new Date().toISOString()}

## Connection
- Connected: ${report.connected}
${report.error ? `- Error: ${report.error}` : ''}

${expected}

## Live audit results

\`\`\`json
${JSON.stringify(report, null, 2)}
\`\`\`
`;

  fs.writeFileSync(path.join(outDir, 'schema-audit.md'), content);
}

main().catch((err) => {
  console.error(err);
  writeAuditDoc({ connected: false, error: String(err) });
  process.exit(1);
});
