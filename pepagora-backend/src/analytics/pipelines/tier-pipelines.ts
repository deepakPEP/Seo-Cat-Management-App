import { ObjectId } from 'mongodb';
import { FREE_TIER, PAID_TIERS } from '../utils/tier.util';

const PAID_TIER_LIST = [...PAID_TIERS];

/** Match ObjectId or legacy string storage for the same id value. */
export function matchEmbeddedId(field: string, id: ObjectId) {
  const str = id.toString();
  return {
    $or: [{ [field]: id }, { [field]: str }],
  };
}

/** Category-level clients: categories[] OR primary industry field (per pepagoraDb schema). */
export function matchCategoryClient(id: ObjectId) {
  const str = id.toString();
  return {
    $or: [
      { 'categories._id': id },
      { 'categories._id': str },
      { 'industry._id': id },
      { 'industry._id': str },
    ],
  };
}

/** Live product match on embedded category ref with status filter. */
export function matchLiveProductRef(refKey: 'category' | 'subCategory' | 'productCategory', id: ObjectId) {
  const field = `${refKey}._id`;
  const str = id.toString();
  return {
    status: 'live' as const,
    $or: [{ [field]: id }, { [field]: str }],
  };
}

export function clientCategoryUnwindStages(): object[] {
  return [
    {
      $addFields: {
        _catRefs: {
          $cond: [
            { $gt: [{ $size: { $ifNull: ['$categories', []] } }, 0] },
            '$categories',
            {
              $cond: [
                { $ne: [{ $ifNull: ['$industry', null] }, null] },
                ['$industry'],
                [],
              ],
            },
          ],
        },
      },
    },
    { $unwind: '$_catRefs' },
  ];
}

export function clientUnwindStages(level: string): object[] {
  if (level === 'category') return clientCategoryUnwindStages();
  return [{ $unwind: levelToUnwindField(level) }];
}

export function clientGroupFields(level: string): {
  groupId: string;
  name: string;
  uniqueId: string;
  idExpr: string;
} {
  if (level === 'category') {
    return {
      groupId: '$_normId',
      name: '$_catRefs.name',
      uniqueId: '$_catRefs.uniqueId',
      idExpr: '$_catRefs._id',
    };
  }
  const prefix = levelToIdPrefix(level);
  return {
    groupId: '$_normId',
    name: `$${prefix}.name`,
    uniqueId: `$${prefix}.uniqueId`,
    idExpr: `$${prefix}._id`,
  };
}

export function normalizeClientIdStage(idExpr: string): object {
  const field = idExpr;
  return {
    $addFields: {
      _normId: {
        $convert: {
          input: {
            $cond: {
              if: { $isArray: field },
              then: { $arrayElemAt: [field, 0] },
              else: field,
            },
          },
          to: 'string',
          onError: '',
          onNull: '',
        },
      },
    },
  };
}

/**
 * Resolve supplier tier from live_catalog.packageType (latest catalog per business).
 * businessprofiles.supplierBadge is certification only — not used for P/F tier.
 */
export function tierLookupFromBusinessId(businessIdField = '$_id'): object[] {
  return [
    {
      $lookup: {
        from: 'live_catalog',
        let: { bid: businessIdField, bidStr: { $toString: businessIdField } },
        pipeline: [
          {
            $match: {
              $expr: {
                $or: [
                  { $eq: ['$business_id', '$$bid'] },
                  { $eq: ['$business_id', '$$bidStr'] },
                ],
              },
            },
          },
          { $sort: { updatedAt: -1 } },
          { $limit: 1 },
        ],
        as: 'catalog',
      },
    },
    {
      $addFields: {
        supplierTier: {
          $toLower: {
            $ifNull: [{ $arrayElemAt: ['$catalog.packageType', 0] }, FREE_TIER],
          },
        },
      },
    },
  ];
}

export const tierLookupFromBusinessProfile = () => tierLookupFromBusinessId('$_id');
export const tierLookupFromLiveProduct = () => tierLookupFromBusinessId('$businessOf');

/** Client pipeline $group with DISTINCT business counts via $addToSet. */
export function clientDistinctGroupStage(groupId: string | null, nameField: string, uniqueIdField: string) {
  return {
    $group: {
      _id: groupId,
      name: { $first: nameField },
      uniqueId: { $first: uniqueIdField },
      paidBizIds: {
        $addToSet: {
          $cond: [{ $in: ['$supplierTier', PAID_TIER_LIST] }, '$_id', '$$REMOVE'],
        },
      },
      exploreBizIds: {
        $addToSet: {
          $cond: [{ $eq: ['$supplierTier', 'explore'] }, '$_id', '$$REMOVE'],
        },
      },
      growBizIds: {
        $addToSet: {
          $cond: [{ $eq: ['$supplierTier', 'grow'] }, '$_id', '$$REMOVE'],
        },
      },
      scaleBizIds: {
        $addToSet: {
          $cond: [{ $eq: ['$supplierTier', 'scale'] }, '$_id', '$$REMOVE'],
        },
      },
      globalBizIds: {
        $addToSet: {
          $cond: [{ $eq: ['$supplierTier', 'global'] }, '$_id', '$$REMOVE'],
        },
      },
      freeBizIds: {
        $addToSet: {
          $cond: [{ $eq: ['$supplierTier', FREE_TIER] }, '$_id', '$$REMOVE'],
        },
      },
    },
  };
}

export const clientSizeFieldsStage = {
  $addFields: {
    paidClients: {
      $size: {
        $setUnion: ['$exploreBizIds', '$growBizIds', '$scaleBizIds', '$globalBizIds'],
      },
    },
    exploreClients: { $size: '$exploreBizIds' },
    growClients: { $size: '$growBizIds' },
    scaleClients: { $size: '$scaleBizIds' },
    globalClients: { $size: '$globalBizIds' },
    freeClients: { $size: '$freeBizIds' },
  },
};

/** Product pipeline $group — sum by supplier tier. */
export function productGroupStage(groupId: string | null = null) {
  return {
    $group: {
      _id: groupId,
      paidProducts: {
        $sum: { $cond: [{ $in: ['$supplierTier', PAID_TIER_LIST] }, 1, 0] },
      },
      exploreProducts: { $sum: { $cond: [{ $eq: ['$supplierTier', 'explore'] }, 1, 0] } },
      growProducts: { $sum: { $cond: [{ $eq: ['$supplierTier', 'grow'] }, 1, 0] } },
      scaleProducts: { $sum: { $cond: [{ $eq: ['$supplierTier', 'scale'] }, 1, 0] } },
      globalProducts: { $sum: { $cond: [{ $eq: ['$supplierTier', 'global'] }, 1, 0] } },
      freeProducts: { $sum: { $cond: [{ $eq: ['$supplierTier', FREE_TIER] }, 1, 0] } },
    },
  };
}

export function breakdownFromClientRow(row: Record<string, number | undefined>) {
  const explore = row.exploreClients ?? 0;
  const grow = row.growClients ?? 0;
  const scale = row.scaleClients ?? 0;
  const global = row.globalClients ?? 0;
  const free = row.freeClients ?? 0;
  const paidTotal = row.paidClients ?? explore + grow + scale + global;
  return { paidTotal, explore, grow, scale, global, free, total: paidTotal + free };
}

export function breakdownFromProductRow(row: Record<string, number | undefined>) {
  const explore = row.exploreProducts ?? 0;
  const grow = row.growProducts ?? 0;
  const scale = row.scaleProducts ?? 0;
  const global = row.globalProducts ?? 0;
  const free = row.freeProducts ?? 0;
  const paidTotal = row.paidProducts ?? explore + grow + scale + global;
  return { paidTotal, explore, grow, scale, global, free, total: paidTotal + free };
}

export function nodeTypeToClientMatch(nodeType: string, nodeId: ObjectId) {
  switch (nodeType) {
    case 'category':
      return matchCategoryClient(nodeId);
    case 'subcategory':
      return matchEmbeddedId('subCategories._id', nodeId);
    case 'product_category':
      return matchEmbeddedId('productCategories._id', nodeId);
    default:
      throw new Error(`Invalid nodeType: ${nodeType}`);
  }
}

export function nodeTypeToProductMatch(nodeType: string, nodeId: ObjectId) {
  switch (nodeType) {
    case 'category':
      return matchLiveProductRef('category', nodeId);
    case 'subcategory':
      return matchLiveProductRef('subCategory', nodeId);
    case 'product_category':
      return matchLiveProductRef('productCategory', nodeId);
    default:
      throw new Error(`Invalid nodeType: ${nodeType}`);
  }
}

export function levelToUnwindField(level: string): string {
  switch (level) {
    case 'category':
      return '$categories';
    case 'subcategory':
      return '$subCategories';
    case 'product_category':
      return '$productCategories';
    default:
      throw new Error(`Invalid level: ${level}`);
  }
}

export function levelToIdPrefix(level: string): string {
  switch (level) {
    case 'category':
      return 'categories';
    case 'subcategory':
      return 'subCategories';
    case 'product_category':
      return 'productCategories';
    default:
      throw new Error(`Invalid level: ${level}`);
  }
}

export function levelToParentClientMatch(level: string, parentId: ObjectId) {
  switch (level) {
    case 'subcategory':
      return matchCategoryClient(parentId);
    case 'product_category':
      return matchEmbeddedId('subCategories._id', parentId);
    default:
      return {};
  }
}

export function levelToParentProductMatch(level: string, parentId: ObjectId) {
  switch (level) {
    case 'subcategory':
      return matchLiveProductRef('category', parentId);
    case 'product_category':
      return matchLiveProductRef('subCategory', parentId);
    default:
      return { status: 'live' as const };
  }
}

/** Product top5 $group stage fields using supplierTier. */
export function productTop5GroupStage() {
  return {
    paidProducts: {
      $sum: { $cond: [{ $in: ['$supplierTier', PAID_TIER_LIST] }, 1, 0] },
    },
    exploreProducts: { $sum: { $cond: [{ $eq: ['$supplierTier', 'explore'] }, 1, 0] } },
    growProducts: { $sum: { $cond: [{ $eq: ['$supplierTier', 'grow'] }, 1, 0] } },
    scaleProducts: { $sum: { $cond: [{ $eq: ['$supplierTier', 'scale'] }, 1, 0] } },
    globalProducts: { $sum: { $cond: [{ $eq: ['$supplierTier', 'global'] }, 1, 0] } },
    freeProducts: { $sum: { $cond: [{ $eq: ['$supplierTier', FREE_TIER] }, 1, 0] } },
  };
}
