import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Db, ObjectId } from 'mongodb';
import {
  clientGroupFields,
  clientUnwindStages,
  levelToParentClientMatch,
  matchLiveProductRef,
  nodeTypeToClientMatch,
  nodeTypeToProductMatch,
  normalizeClientIdStage,
} from './pipelines/tier-pipelines';
import {
  BreakdownResponse,
  CategoryScreenAnalytics,
  HomeTopCategoriesResponse,
  NodeType,
  ProductCategoryScreenAnalytics,
  SubCategoryScreenAnalytics,
  Top5Item,
  Top5Level,
} from './types/analytics.types';
import { BusinessTierCache } from './utils/business-tier.cache';
import {
  countTiersFromBusinessIds,
  EMPTY_TIER_COUNTS,
  paidPercent,
  toClientCountFields,
  toProductCountFields,
} from './utils/tier.util';

const AGG_OPTS = { allowDiskUse: true, maxTimeMS: 90_000 } as const;

@Injectable()
export class SupplierAnalyticsService implements OnModuleInit {
  private readonly db: Db;
  private readonly logger = new Logger(SupplierAnalyticsService.name);
  private readonly tierCache = new BusinessTierCache();

  constructor(@InjectConnection('analytics') private readonly connection: Connection) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let client: any;
    if (typeof (this.connection as any).getClient === 'function') {
      client = (this.connection as any).getClient();
    } else if ((this.connection as any).client) {
      client = (this.connection as any).client;
    } else if ((this.connection as any).db?.client) {
      client = (this.connection as any).db.client;
    } else if ((this.connection as any).db?.db?.client) {
      client = (this.connection as any).db.db.client;
    }

    if (!client) {
      throw new Error('MongoDB client not available from analytics connection');
    }

    this.db = client.db('pepagoraDb');
  }

  async onModuleInit(): Promise<void> {
    try {
      const started = Date.now();
      const map = await this.tierCache.getMap(this.db);
      this.logger.log(`Tier cache warmed: ${map.size} businesses in ${Date.now() - started}ms`);
    } catch (err) {
      this.logger.warn(`Tier cache warm-up failed: ${(err as Error).message}`);
    }
  }

  parseObjectId(id: string, fieldName: string): ObjectId {
    if (!id || !ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${fieldName}: must be a valid ObjectId`);
    }
    return new ObjectId(id);
  }

  // ─── Screen 1 ───────────────────────────────────────────────────────────────

  async getTopCategories(limit = 5): Promise<Top5Item[]> {
    return this.getTop5('category', undefined, limit);
  }

  async getTopProductCategories(limit = 5): Promise<Top5Item[]> {
    return this.getTop5('product_category', undefined, limit);
  }

  async getHomeTopCategories(limit = 5): Promise<HomeTopCategoriesResponse> {
    const [topCategories, topProductCategories] = await Promise.all([
      this.getTopCategories(limit),
      this.getTopProductCategories(limit),
    ]);
    return { topCategories, topProductCategories };
  }

  // ─── Screen 2 — Category ────────────────────────────────────────────────────

  async getCategoryAnalytics(categoryId: string): Promise<CategoryScreenAnalytics> {
    const oid = this.parseObjectId(categoryId, 'categoryId');
    const [breakdown, top5SubCategories, subCategoryList, name] = await Promise.all([
      this.getBreakdown('category', categoryId),
      this.getTop5('subcategory', categoryId, 5),
      this.getListCounts('subcategory', categoryId),
      this.resolveNodeName('categories', oid),
    ]);

    return {
      nodeId: categoryId,
      nodeType: 'category',
      name,
      clients: breakdown.clients,
      products: breakdown.products,
      top5SubCategories,
      subCategoryList,
    };
  }

  // ─── Screen 2 variant — SubCategory ─────────────────────────────────────────

  async getSubCategoryAnalytics(subCategoryId: string): Promise<SubCategoryScreenAnalytics> {
    const oid = this.parseObjectId(subCategoryId, 'subCategoryId');
    const [breakdown, top5ProductCategories, productCategoryList, name] = await Promise.all([
      this.getBreakdown('subcategory', subCategoryId),
      this.getTop5('product_category', subCategoryId, 5),
      this.getListCounts('product_category', subCategoryId),
      this.resolveNodeName('subcategories', oid),
    ]);

    return {
      nodeId: subCategoryId,
      nodeType: 'subcategory',
      name,
      clients: breakdown.clients,
      products: breakdown.products,
      top5ProductCategories,
      productCategoryList,
    };
  }

  // ─── Screen 3 — Product Category (leaf) ─────────────────────────────────────

  async getProductCategoryAnalytics(productCategoryId: string): Promise<ProductCategoryScreenAnalytics> {
    const oid = this.parseObjectId(productCategoryId, 'productCategoryId');
    const [breakdown, name] = await Promise.all([
      this.getBreakdown('product_category', productCategoryId),
      this.resolveNodeName('productcategories', oid),
    ]);

    const paidPct = paidPercent(breakdown.clients);
    return {
      nodeId: productCategoryId,
      nodeType: 'product_category',
      name,
      clients: breakdown.clients,
      products: breakdown.products,
      paidPercent: paidPct,
      freePercent: 100 - paidPct,
    };
  }

  // ─── Existing API surface (used by frontend hooks) ─────────────────────────

  async getBreakdown(nodeType: NodeType, nodeId: string): Promise<BreakdownResponse> {
    const oid = this.parseObjectId(nodeId, 'nodeId');
    this.logger.log(`breakdown nodeType=${nodeType} nodeId=${nodeId}`);
    try {
      const [clients, products] = await Promise.all([
        this.runClientBreakdown(nodeType, oid),
        this.runProductBreakdown(nodeType, oid),
      ]);
      return { clients, products };
    } catch (err) {
      this.logger.error(`breakdown failed: ${(err as Error).message}`);
      return { clients: { ...EMPTY_TIER_COUNTS }, products: { ...EMPTY_TIER_COUNTS } };
    }
  }

  async getTop5(level: Top5Level, parentId?: string, limit = 5): Promise<Top5Item[]> {
    const parentOid = parentId ? this.parseObjectId(parentId, 'parentId') : undefined;
    const started = Date.now();

    try {
      const tierMap = await this.tierCache.getMap(this.db);
      let clientRows: Record<string, unknown>[] = [];
      let productRows: Record<string, unknown>[] = [];

      try {
        clientRows = await this.runClientTop5(level, parentOid, limit, tierMap);
      } catch (clientErr) {
        this.logger.warn(`client top5 failed (level=${level}): ${(clientErr as Error).message}`);
      }

      if (limit > 0) {
        try {
          productRows = await this.runProductTop5(level, parentOid, tierMap);
        } catch (productErr) {
          this.logger.warn(`product top5 failed (level=${level}): ${(productErr as Error).message}`);
        }
      }

      const result = this.mergeTop5Results(clientRows, productRows, limit);
      this.logger.log(`top5 level=${level} done in ${Date.now() - started}ms (${result.length} rows)`);
      return result;
    } catch (err) {
      this.logger.error(`top5 failed level=${level}: ${(err as Error).message}`);
      return [];
    }
  }

  async getListCounts(
    level: Top5Level,
    parentId?: string,
  ): Promise<{ nodeId: string; paidClients: number; freeClients: number }[]> {
    const parentOid = parentId ? this.parseObjectId(parentId, 'parentId') : undefined;
    const started = Date.now();

    try {
      const tierMap = await this.tierCache.getMap(this.db);
      const rows = await this.runClientTop5(level, parentOid, 0, tierMap);
      this.logger.log(`list-counts level=${level} done in ${Date.now() - started}ms`);
      return rows.map((r) => ({
        nodeId: String(r._id),
        paidClients: (r.paidClients as number) ?? 0,
        freeClients: (r.freeClients as number) ?? 0,
      }));
    } catch (err) {
      this.logger.error(`list-counts failed level=${level}: ${(err as Error).message}`);
      return [];
    }
  }

  // ─── Private aggregation runners ────────────────────────────────────────────

  private async resolveNodeName(collection: string, id: ObjectId): Promise<string | null> {
    const doc = await this.db.collection(collection).findOne(
      { _id: id },
      { projection: { name: 1, main_cat_name: 1, sub_cat_name: 1, product_category_name: 1 } },
    );
    if (!doc) return null;
    return (
      (doc as { name?: string }).name ??
      (doc as { main_cat_name?: string }).main_cat_name ??
      (doc as { sub_cat_name?: string }).sub_cat_name ??
      (doc as { product_category_name?: string }).product_category_name ??
      null
    );
  }

  private async runClientBreakdown(nodeType: NodeType, nodeId: ObjectId) {
    try {
      const match = nodeTypeToClientMatch(nodeType, nodeId);
      const tierMap = await this.tierCache.getMap(this.db);
      const businesses = await this.db
        .collection('businessprofiles')
        .find(match, { projection: { _id: 1 } })
        .maxTimeMS(60_000)
        .toArray();

      return countTiersFromBusinessIds(
        businesses.map((b) => b._id),
        tierMap,
      );
    } catch (err) {
      this.logger.warn(`client breakdown failed: ${(err as Error).message}`);
      return { ...EMPTY_TIER_COUNTS };
    }
  }

  private async runProductBreakdown(nodeType: NodeType, nodeId: ObjectId) {
    try {
      const match = nodeTypeToProductMatch(nodeType, nodeId);
      const tierMap = await this.tierCache.getMap(this.db);
      const products = await this.db
        .collection('liveproducts')
        .find(match, { projection: { businessOf: 1 } })
        .maxTimeMS(90_000)
        .toArray();

      return countTiersFromBusinessIds(
        products.map((p) => (p as { businessOf?: unknown }).businessOf as string),
        tierMap,
      );
    } catch (err) {
      this.logger.warn(`product breakdown failed: ${(err as Error).message}`);
      return { ...EMPTY_TIER_COUNTS };
    }
  }

  private async runClientTop5(
    level: Top5Level,
    parentOid: ObjectId | undefined,
    limit: number,
    tierMap: Map<string, string>,
  ) {
    const matchStages: object[] = [];
    if (parentOid && level !== 'category') {
      matchStages.push({ $match: levelToParentClientMatch(level, parentOid) });
    }

    const { name, uniqueId, idExpr } = clientGroupFields(level);

    const pipeline: object[] = [
      ...matchStages,
      ...clientUnwindStages(level),
      normalizeClientIdStage(idExpr),
      { $match: { _normId: { $nin: ['', null] } } },
      {
        $group: {
          _id: '$_normId',
          name: { $first: name },
          uniqueId: { $first: uniqueId },
          bizIds: { $addToSet: '$_id' },
        },
      },
      { $match: { _id: { $nin: [null, ''] } } },
      { $addFields: { supplierCount: { $size: '$bizIds' } } },
      { $sort: { supplierCount: -1 } },
    ];

    if (limit > 0) {
      pipeline.push({ $limit: limit * 3 });
    }

    const rows = await this.db
      .collection('businessprofiles')
      .aggregate<{
        _id: string;
        name?: string;
        uniqueId?: string;
        bizIds: { toString(): string }[];
      }>(pipeline, AGG_OPTS)
      .toArray();

    return rows
      .map((row) => {
        const counts = countTiersFromBusinessIds(row.bizIds, tierMap);
        return {
          _id: row._id,
          name: row.name,
          uniqueId: row.uniqueId,
          ...toClientCountFields(counts),
        };
      })
      .sort(
        (a, b) =>
          ((b.paidClients as number) ?? 0) - ((a.paidClients as number) ?? 0) ||
          ((b.freeClients as number) ?? 0) - ((a.freeClients as number) ?? 0),
      );
  }

  private async runProductTop5(
    level: Top5Level,
    parentOid: ObjectId | undefined,
    tierMap: Map<string, string>,
  ) {
    const fieldMap: Record<Top5Level, { id: string; name: string; uniqueId: string }> = {
      category: { id: 'category._id', name: 'category.name', uniqueId: 'category.uniqueId' },
      subcategory: { id: 'subCategory._id', name: 'subCategory.name', uniqueId: 'subCategory.uniqueId' },
      product_category: {
        id: 'productCategory._id',
        name: 'productCategory.name',
        uniqueId: 'productCategory.uniqueId',
      },
    };

    const fields = fieldMap[level];
    const matchStages: object[] = [];

    if (parentOid && level === 'subcategory') {
      matchStages.push({ $match: matchLiveProductRef('category', parentOid) });
    } else if (parentOid && level === 'product_category') {
      matchStages.push({ $match: matchLiveProductRef('subCategory', parentOid) });
    } else {
      matchStages.push({ $match: { status: 'live' } });
    }

    const pipeline = [
      ...matchStages,
      {
        $addFields: {
          _normId: { $toString: `$${fields.id}` },
          _nodeName: `$${fields.name}`,
          _nodeUniqueId: `$${fields.uniqueId}`,
          _bizId: { $toString: '$businessOf' },
        },
      },
      { $match: { _normId: { $nin: [null, '', 'null'] } } },
      {
        $group: {
          _id: '$_normId',
          name: { $first: '$_nodeName' },
          uniqueId: { $first: '$_nodeUniqueId' },
          businessIds: { $push: '$_bizId' },
          productCount: { $sum: 1 },
        },
      },
      { $sort: { productCount: -1 } },
      { $limit: 25 },
    ];

    const rows = await this.db
      .collection('liveproducts')
      .aggregate<{
        _id: string;
        name?: string;
        uniqueId?: string;
        businessIds: string[];
      }>(pipeline, AGG_OPTS)
      .toArray();

    return rows.map((row) => {
      const counts = countTiersFromBusinessIds(row.businessIds, tierMap);
      return {
        _id: row._id,
        name: row.name,
        uniqueId: row.uniqueId,
        ...toProductCountFields(counts),
      };
    });
  }

  private mergeTop5Results(
    clientRows: Record<string, unknown>[],
    productRows: Record<string, unknown>[],
    limit: number,
  ): Top5Item[] {
    const productMap = new Map<string, Record<string, unknown>>();
    for (const row of productRows) {
      if (row._id) productMap.set(String(row._id), row);
    }

    const allIds = new Set<string>();
    clientRows.forEach((r) => r._id && allIds.add(String(r._id)));
    productRows.forEach((r) => r._id && allIds.add(String(r._id)));

    const score = (id: string) => {
      const c = clientRows.find((r) => String(r._id) === id);
      const p = productMap.get(id);
      const clientTotal = ((c?.paidClients as number) ?? 0) + ((c?.freeClients as number) ?? 0);
      const productTotal = ((p?.paidProducts as number) ?? 0) + ((p?.freeProducts as number) ?? 0);
      return clientTotal + productTotal;
    };

    const topIds = [...allIds].sort((a, b) => score(b) - score(a)).slice(0, limit);

    return topIds.map((id, index) => {
      const c = clientRows.find((r) => String(r._id) === id) ?? {};
      const p = productMap.get(id) ?? {};
      return {
        nodeId: id,
        name: String(c.name ?? p.name ?? 'Unknown'),
        uniqueId: String(c.uniqueId ?? p.uniqueId ?? ''),
        rank: index + 1,
        paidClients: (c.paidClients as number) ?? 0,
        exploreClients: (c.exploreClients as number) ?? 0,
        growClients: (c.growClients as number) ?? 0,
        scaleClients: (c.scaleClients as number) ?? 0,
        globalClients: (c.globalClients as number) ?? 0,
        freeClients: (c.freeClients as number) ?? 0,
        paidProducts: (p.paidProducts as number) ?? 0,
        exploreProducts: (p.exploreProducts as number) ?? 0,
        growProducts: (p.growProducts as number) ?? 0,
        scaleProducts: (p.scaleProducts as number) ?? 0,
        globalProducts: (p.globalProducts as number) ?? 0,
        freeProducts: (p.freeProducts as number) ?? 0,
      };
    });
  }
}
