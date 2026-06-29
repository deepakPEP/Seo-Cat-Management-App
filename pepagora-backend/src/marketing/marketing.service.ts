import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Db, ObjectId, MongoClient } from 'mongodb';

type CategoryDocument = {
  _id: ObjectId;
  name?: string;
  main_cat_name?: string;
  mappedChildren?: (string | ObjectId)[];
  liveUrl?: string;
};

type SubcategoryDocument = {
  _id: ObjectId;
  name?: string;
  sub_cat_name?: string;
  mappedChildren?: (string | ObjectId)[];
  parentId?: string | ObjectId;
  liveUrl?: string;
};

type ProductCategoryDocument = {
  _id: ObjectId;
  name?: string;
  product_category_name?: string;
  parentId?: string | ObjectId;
  liveUrl?: string;
};

type LiveProductDocument = {
  _id: ObjectId;
  productName?: string;
  liveUrl?: string;
  status?: string;
  productCategory?: {
    _id?: ObjectId | string;
  };
};

type BusinessProfileAccountDoc = {
  _id: ObjectId;
  createdBy?: ObjectId | string;
  productCategories?: { _id?: ObjectId | string }[];
};

type UserPlanDoc = {
  _id: ObjectId | string;
  currentPlan?: { planNo?: number };
};

export type CategoryAccountRow = {
  category: string;
  subCategory: string;
  productCategory: string;
  freeAccounts: number;
  paidAccounts: number;
  totalAccounts: number;
};

@Injectable()
export class MarketingService {
  private readonly metaDb: Db;

  constructor(@InjectConnection('analytics') private readonly connection: Connection) {
    // Access the native MongoDB client from Mongoose connection
    // Try multiple ways to get the client depending on Mongoose version
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
    
    this.metaDb = client.db('pepagoraDb');
  }

  private toObjectId(id: string | ObjectId | undefined | null): ObjectId | null {
    if (!id) return null;
    if (id instanceof ObjectId) return id;
    if (!ObjectId.isValid(id)) return null;
    return new ObjectId(id);
  }

  private getCategoryName(category: CategoryDocument | null | undefined): string {
    if (!category) return 'Unnamed Category';
    return category.name ?? category.main_cat_name ?? 'Unnamed Category';
  }

  private getSubcategoryName(subcategory: SubcategoryDocument | null | undefined): string {
    if (!subcategory) return 'Unnamed Subcategory';
    return subcategory.name ?? subcategory.sub_cat_name ?? 'Unnamed Subcategory';
  }

  private getProductCategoryName(productCategory: ProductCategoryDocument | null | undefined): string {
    if (!productCategory) return 'Unnamed Product Category';
    return productCategory.name ?? productCategory.product_category_name ?? 'Unnamed Product Category';
  }

  /** parentId may be stored as ObjectId or string in productcategories. */
  private parentIdFilter(parentId: ObjectId) {
    const str = parentId.toString();
    return { $or: [{ parentId }, { parentId: str }] };
  }

  private parentIdInFilter(parentIds: ObjectId[]) {
    const variants = parentIds.flatMap((id) => [id, id.toString()]);
    return { parentId: { $in: variants } };
  }

  private expandIdVariants(ids: ObjectId[]): (ObjectId | string)[] {
    return ids.flatMap((id) => [id, id.toString()]);
  }

  /** Live products only; productCategory._id may be ObjectId or string. */
  private liveProductCategoryFilter(productCategoryIds: ObjectId[]) {
    return {
      status: 'live',
      'productCategory._id': { $in: this.expandIdVariants(productCategoryIds) },
    };
  }

  private matchSingleProductCategoryId(productCategoryId: ObjectId) {
    const str = productCategoryId.toString();
    return {
      status: 'live',
      $or: [{ 'productCategory._id': productCategoryId }, { 'productCategory._id': str }],
    };
  }

  private async aggregateLiveProductCountsByCategory(productCategoryIds: ObjectId[]) {
    const liveProductsCollection = this.metaDb.collection<LiveProductDocument>('liveproducts');
    const counts = new Map<string, number>();
    const samples = new Map<string, string>();
    if (productCategoryIds.length === 0) return { counts, samples };

    const rows = await liveProductsCollection
      .aggregate<{ _id: string; count: number; sampleProducts?: string[] }>([
        { $match: this.liveProductCategoryFilter(productCategoryIds) },
        { $addFields: { _pcId: { $toString: '$productCategory._id' } } },
        {
          $group: {
            _id: '$_pcId',
            count: { $sum: 1 },
            sampleProducts: { $push: { $ifNull: ['$productName', 'Unnamed Product'] } },
          },
        },
      ])
      .toArray();

    for (const row of rows) {
      counts.set(row._id, row.count);
      if (row.sampleProducts) {
        samples.set(row._id, row.sampleProducts.slice(0, 5).join(', '));
      }
    }
    return { counts, samples };
  }

  // Get counts for dashboard
  async getProductCategoryCount(): Promise<number> {
    try {
      const productCategoriesCollection = this.metaDb.collection<ProductCategoryDocument>('productcategories');
      return await productCategoriesCollection.countDocuments();
    } catch (error) {
      throw new BadRequestException('Failed to fetch product category count');
    }
  }

  async getLiveProductsCount(): Promise<number> {
    try {
      const liveProductsCollection = this.metaDb.collection<LiveProductDocument>('liveproducts');
      return await liveProductsCollection.countDocuments({ status: 'live' });
    } catch (error) {
      throw new BadRequestException('Failed to fetch live products count');
    }
  }

  // Get total counts for all categories (for categories page)
  async getAllCounts() {
    try {
      const subcategoriesCollection = this.metaDb.collection<SubcategoryDocument>('subcategories');
      const productCategoriesCollection = this.metaDb.collection<ProductCategoryDocument>('productcategories');
      const liveProductsCollection = this.metaDb.collection<LiveProductDocument>('liveproducts');

      const [subcategoriesCount, productCategoriesCount, productsCount] = await Promise.all([
        subcategoriesCollection.countDocuments(),
        productCategoriesCollection.countDocuments(),
        liveProductsCollection.countDocuments({ status: 'live' }),
      ]);

      return {
        subcategoriesCount,
        productCategoriesCount,
        productsCount,
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch all counts');
    }
  }

  // Get counts for a specific category (for subcategories page)
  async getCountsByCategory(categoryId: string) {
    try {
      const categoriesCollection = this.metaDb.collection<CategoryDocument>('categories');
      const subcategoriesCollection = this.metaDb.collection<SubcategoryDocument>('subcategories');
      const productCategoriesCollection = this.metaDb.collection<ProductCategoryDocument>('productcategories');
      const liveProductsCollection = this.metaDb.collection<LiveProductDocument>('liveproducts');

      const categoryObjectId = this.toObjectId(categoryId);
      if (!categoryObjectId) throw new BadRequestException('Invalid category ID');

      const category = await categoriesCollection.findOne({ _id: categoryObjectId });
      if (!category) throw new BadRequestException('Category not found');

      // Get all subcategories for this category
      const mappedChildren = Array.isArray(category.mappedChildren)
        ? category.mappedChildren
        : [];

      const subcategoryObjectIds = mappedChildren
        .map((child) => this.toObjectId(child as string | ObjectId))
        .filter((id): id is ObjectId => id !== null);

      // Get all product categories for these subcategories
      const productCategories = subcategoryObjectIds.length
        ? await productCategoriesCollection.find(this.parentIdInFilter(subcategoryObjectIds)).toArray()
        : [];

      const productCategoryObjectIds = productCategories.map((pc) => pc._id);

      const productsCount = productCategoryObjectIds.length
        ? await liveProductsCollection.countDocuments(
            this.liveProductCategoryFilter(productCategoryObjectIds),
          )
        : 0;

      return {
        productCategoriesCount: productCategories.length,
        productsCount,
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch counts by category');
    }
  }

  // Get product count for a specific subcategory (for product categories page)
  async getProductCountBySubcategory(subcategoryId: string) {
    try {
      const subcategoriesCollection = this.metaDb.collection<SubcategoryDocument>('subcategories');
      const productCategoriesCollection = this.metaDb.collection<ProductCategoryDocument>('productcategories');
      const liveProductsCollection = this.metaDb.collection<LiveProductDocument>('liveproducts');

      const subcategoryObjectId = this.toObjectId(subcategoryId);
      if (!subcategoryObjectId) throw new BadRequestException('Invalid subcategory ID');

      const subcategory = await subcategoriesCollection.findOne({ _id: subcategoryObjectId });
      if (!subcategory) throw new BadRequestException('Subcategory not found');

      // Get all product categories for this subcategory
      const productCategories = await productCategoriesCollection
        .find(this.parentIdFilter(subcategoryObjectId))
        .toArray();

      const productCategoryObjectIds = productCategories.map((pc) => pc._id);

      const productsCount = productCategoryObjectIds.length
        ? await liveProductsCollection.countDocuments(
            this.liveProductCategoryFilter(productCategoryObjectIds),
          )
        : 0;

      return {
        productsCount,
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch product count by subcategory');
    }
  }

  // Get all categories (for marketing team view)
  async getCategoriesForMarketing() {
    try {
      const categoriesCollection = this.metaDb.collection<CategoryDocument>('categories');
      const categories = await categoriesCollection
        .find({})
        .sort({ name: 1, main_cat_name: 1 })
        .toArray();

      return categories.map((cat) => ({
        _id: cat._id.toString(),
        name: this.getCategoryName(cat),
        liveUrl: cat.liveUrl || null,
      }));
    } catch (error) {
      throw new BadRequestException('Failed to fetch categories');
    }
  }

  // Get subcategories by category ID
  async getSubcategoriesByCategory(categoryId: string) {
    try {
      const categoriesCollection = this.metaDb.collection<CategoryDocument>('categories');
      const subcategoriesCollection = this.metaDb.collection<SubcategoryDocument>('subcategories');

      const categoryObjectId = this.toObjectId(categoryId);
      if (!categoryObjectId) throw new BadRequestException('Invalid category ID');

      const category = await categoriesCollection.findOne(
        { _id: categoryObjectId }
        // Don't use projection to ensure we get all fields including liveUrl
      );
      if (!category) throw new BadRequestException('Category not found');

      const mappedChildren = Array.isArray(category.mappedChildren)
        ? category.mappedChildren
        : [];

      const subcategoryObjectIds = mappedChildren
        .map((child) => this.toObjectId(child as string | ObjectId))
        .filter((id): id is ObjectId => id !== null);

      const subcategories = subcategoryObjectIds.length
        ? await subcategoriesCollection
            .find({ _id: { $in: subcategoryObjectIds } }, { projection: { name: 1, sub_cat_name: 1 } })
            .sort({ name: 1, sub_cat_name: 1 })
            .toArray()
        : [];

      return {
        category: {
          _id: categoryObjectId.toString(),
          name: this.getCategoryName(category),
          liveUrl: category.liveUrl || null,
        },
        subcategories: subcategories.map((sub) => ({
          _id: sub._id.toString(),
          name: this.getSubcategoryName(sub),
        })),
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch subcategories');
    }
  }

  // Get product categories by subcategory ID
  async getProductCategoriesBySubcategory(subcategoryId: string) {
    try {
      const subcategoriesCollection = this.metaDb.collection<SubcategoryDocument>('subcategories');
      const categoriesCollection = this.metaDb.collection<CategoryDocument>('categories');
      const productCategoriesCollection = this.metaDb.collection<ProductCategoryDocument>('productcategories');
      const liveProductsCollection = this.metaDb.collection<LiveProductDocument>('liveproducts');

      const subcategoryObjectId = this.toObjectId(subcategoryId);
      if (!subcategoryObjectId) throw new BadRequestException('Invalid subcategory ID');

      const subcategory = await subcategoriesCollection.findOne(
        { _id: subcategoryObjectId }
        // Don't use projection to ensure we get all fields including liveUrl
      );
      if (!subcategory) throw new BadRequestException('Subcategory not found');

      const productCategories = await productCategoriesCollection
        .find(this.parentIdFilter(subcategoryObjectId), { projection: { name: 1 } })
        .sort({ name: 1 })
        .toArray();

      const category = await categoriesCollection.findOne({
        mappedChildren: { $in: [subcategory._id.toString()] },
      });

      const productCategoryIds = productCategories.map((pc) => pc._id);
      const { counts: productCountsMap } = await this.aggregateLiveProductCountsByCategory(productCategoryIds);

      // Map product categories with pre-fetched counts
      const productCategoriesWithCounts = productCategories.map((pc) => {
        const productCount = productCountsMap.get(pc._id.toString()) || 0;
        return {
          _id: pc._id.toString(),
          name: this.getProductCategoryName(pc),
          productCount,
        };
      });

      return {
        category: category
          ? {
              _id: category._id.toString(),
              name: this.getCategoryName(category),
            }
          : null,
        subcategory: {
          _id: subcategory._id.toString(),
          name: this.getSubcategoryName(subcategory),
          liveUrl: subcategory.liveUrl || null,
        },
        productCategories: productCategoriesWithCounts,
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch product categories');
    }
  }

  // Get live products by product category ID
  async getLiveProductsByProductCategory(productCategoryId: string) {
    try {
      const productCategoriesCollection = this.metaDb.collection<ProductCategoryDocument>('productcategories');
      const subcategoriesCollection = this.metaDb.collection<SubcategoryDocument>('subcategories');
      const categoriesCollection = this.metaDb.collection<CategoryDocument>('categories');
      const liveProductsCollection = this.metaDb.collection<LiveProductDocument>('liveproducts');

      const productCategoryObjectId = this.toObjectId(productCategoryId);
      if (!productCategoryObjectId) {
        throw new BadRequestException('Invalid product category ID');
      }

      const productCategory = await productCategoriesCollection.findOne(
        { _id: productCategoryObjectId }
        // Don't use projection to ensure we get all fields including liveUrl
      );
      if (!productCategory) {
        throw new BadRequestException('Product category not found');
      }

      const subcategoryObjectId = this.toObjectId(productCategory.parentId);
      const subcategory = subcategoryObjectId
        ? await subcategoriesCollection.findOne({ _id: subcategoryObjectId })
        : null;

      const category = subcategory
        ? await categoriesCollection.findOne({ mappedChildren: { $in: [subcategory._id.toString()] } })
        : null;

      const products = await liveProductsCollection
        .find(this.matchSingleProductCategoryId(productCategoryObjectId), {
          projection: { productName: 1, liveUrl: 1 },
        })
        .sort({ productName: 1 })
        .toArray();

      return {
        category: category
          ? {
              _id: category._id.toString(),
              name: this.getCategoryName(category),
            }
          : null,
        subcategory: subcategory
          ? {
              _id: subcategory._id.toString(),
              name: this.getSubcategoryName(subcategory),
            }
          : null,
        productCategory: {
          _id: productCategory._id.toString(),
          name: this.getProductCategoryName(productCategory),
          liveUrl: productCategory.liveUrl || null,
        },
        products: products.map((product) => ({
          _id: product._id.toString(),
          productName: product.productName ?? 'Unnamed Product',
          liveUrl: product.liveUrl ?? '',
        })),
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch live products');
    }
  }

  // Generate Excel report data - OPTIMIZED VERSION
  async generateExcelReportData(): Promise<any[]> {
    try {
      const categoriesCollection = this.metaDb.collection<CategoryDocument>('categories');
      const subcategoriesCollection = this.metaDb.collection<SubcategoryDocument>('subcategories');
      const productCategoriesCollection = this.metaDb.collection<ProductCategoryDocument>('productcategories');
      const liveProductsCollection = this.metaDb.collection<LiveProductDocument>('liveproducts');

      // Fetch all data in parallel
      const [categories, subcategories, productCategories] = await Promise.all([
        categoriesCollection
          .find({}, { projection: { name: 1, main_cat_name: 1, mappedChildren: 1 } })
          .toArray(),
        subcategoriesCollection
          .find({}, { projection: { name: 1, sub_cat_name: 1, mappedChildren: 1 } })
          .toArray(),
        productCategoriesCollection
          .find({}, { projection: { name: 1, product_category_name: 1 } })
          .toArray(),
      ]);

      // Create lookup maps
      const subcatById = new Map<string, SubcategoryDocument>();
      subcategories.forEach((subcat) => {
        subcatById.set(subcat._id.toString(), subcat);
      });

      const prodcatById = new Map<string, ProductCategoryDocument>();
      productCategories.forEach((prodcat) => {
        prodcatById.set(prodcat._id.toString(), prodcat);
      });

      // Collect all product category IDs for batch query
      const allProductCategoryIds: ObjectId[] = [];
      for (const category of categories) {
        const mappedChildren = Array.isArray(category.mappedChildren) ? category.mappedChildren : [];
        for (const subcatId of mappedChildren) {
          const subcat = subcatById.get(subcatId.toString());
          if (!subcat) continue;
          const mappedProductChildren = Array.isArray(subcat.mappedChildren) ? subcat.mappedChildren : [];
          for (const prodcatId of mappedProductChildren) {
            const prodcatObjectId = this.toObjectId(prodcatId as string | ObjectId);
            if (prodcatObjectId) {
              allProductCategoryIds.push(prodcatObjectId);
            }
          }
        }
      }

      const { counts: productCountsMap, samples: sampleProductsMap } =
        await this.aggregateLiveProductCountsByCategory(allProductCategoryIds);

      // Build hierarchy with pre-fetched data
      const hierarchy: any[] = [];

      for (const category of categories) {
        const categoryName = this.getCategoryName(category);
        const mappedChildren = Array.isArray(category.mappedChildren) ? category.mappedChildren : [];

        if (mappedChildren.length === 0) {
          hierarchy.push({
            category: categoryName,
            subcategory: '',
            productCategory: '',
            productCount: '',
            sampleProducts: '',
          });
          continue;
        }

        for (const subcatId of mappedChildren) {
          const subcat = subcatById.get(subcatId.toString());
          if (!subcat) continue;

          const subcategoryName = this.getSubcategoryName(subcat);
          const mappedProductChildren = Array.isArray(subcat.mappedChildren) ? subcat.mappedChildren : [];

          if (mappedProductChildren.length === 0) {
            hierarchy.push({
              category: categoryName,
              subcategory: subcategoryName,
              productCategory: '',
              productCount: '',
              sampleProducts: '',
            });
            continue;
          }

          for (const prodcatId of mappedProductChildren) {
            const prodcat = prodcatById.get(prodcatId.toString());
            if (!prodcat) continue;

            const productCategoryName = this.getProductCategoryName(prodcat);
            const productCategoryObjectId = this.toObjectId(prodcatId as string | ObjectId);

            if (!productCategoryObjectId) {
              continue;
            }

            const productCategoryIdStr = productCategoryObjectId.toString();
            const productCount = productCountsMap.get(productCategoryIdStr) || 0;
            const sampleProducts = sampleProductsMap.get(productCategoryIdStr) || '';

            hierarchy.push({
              category: categoryName,
              subcategory: subcategoryName,
              productCategory: productCategoryName,
              productCount: productCount > 0 ? productCount : '',
              sampleProducts,
            });
          }
        }
      }

      return hierarchy;
    } catch (error) {
      console.error('[Marketing Service] Error generating Excel report:', error);
      throw new BadRequestException('Failed to generate report');
    }
  }

  /**
   * Category-wise accounts report (port of category_wise_Acct.py).
   *
   * For every product category, counts the distinct businesses (by createdBy)
   * split into Free vs Paid using users.currentPlan.planNo (planNo === 1 → Free,
   * planNo > 1 → Paid). Resolves the SubCategory and Category names via parentId.
   */
  async generateCategoryAccountsReportData(): Promise<CategoryAccountRow[]> {
    try {
      const categoriesCollection = this.metaDb.collection<CategoryDocument>('categories');
      const subcategoriesCollection = this.metaDb.collection<SubcategoryDocument>('subcategories');
      const productCategoriesCollection =
        this.metaDb.collection<ProductCategoryDocument>('productcategories');
      const businessProfilesCollection =
        this.metaDb.collection<BusinessProfileAccountDoc>('businessprofiles');
      const usersCollection = this.metaDb.collection<UserPlanDoc>('users');

      // 1) categoryId -> name
      const categories = await categoriesCollection
        .find({}, { projection: { name: 1, main_cat_name: 1 } })
        .toArray();
      const categoryNameById = new Map<string, string>();
      for (const cat of categories) {
        categoryNameById.set(cat._id.toString(), this.getCategoryName(cat));
      }

      // 2) subCategoryId -> { name, parentId }
      const subcategories = await subcategoriesCollection
        .find({}, { projection: { name: 1, sub_cat_name: 1, parentId: 1 } })
        .toArray();
      const subcatById = new Map<string, { name: string; parentId: string | null }>();
      for (const sub of subcategories) {
        subcatById.set(sub._id.toString(), {
          name: this.getSubcategoryName(sub),
          parentId: sub.parentId != null ? sub.parentId.toString() : null,
        });
      }

      // 3) product categories (stable order by _id, like the Python script)
      const productCategories = await productCategoriesCollection
        .find({}, { projection: { name: 1, product_category_name: 1, parentId: 1 } })
        .sort({ _id: 1 })
        .toArray();

      // 4) productCategoryId -> Set<createdBy> (distinct businesses per product category)
      const pcUsers = new Map<string, Set<string>>();
      const bpCursor = businessProfilesCollection.find(
        {},
        { projection: { createdBy: 1, productCategories: 1 } },
      );
      for await (const bp of bpCursor) {
        const createdBy = bp.createdBy;
        if (!createdBy) continue;
        const createdByStr = createdBy.toString();
        const pcs = Array.isArray(bp.productCategories) ? bp.productCategories : [];
        for (const pc of pcs) {
          const pcId = pc?._id != null ? pc._id.toString() : null;
          if (!pcId) continue;
          let set = pcUsers.get(pcId);
          if (!set) {
            set = new Set<string>();
            pcUsers.set(pcId, set);
          }
          set.add(createdByStr);
        }
      }

      // 5) gather all referenced user ids
      const allUserIds = new Set<string>();
      for (const set of pcUsers.values()) {
        for (const id of set) allUserIds.add(id);
      }

      // 6) userId -> planNo (handle _id stored as ObjectId or string)
      const planNoByUser = new Map<string, number>();
      if (allUserIds.size > 0) {
        const idVariants: (ObjectId | string)[] = [];
        for (const id of allUserIds) {
          idVariants.push(id);
          const oid = this.toObjectId(id);
          if (oid) idVariants.push(oid);
        }
        const usersCursor = usersCollection.find(
          { _id: { $in: idVariants } },
          { projection: { 'currentPlan.planNo': 1 } },
        );
        for await (const user of usersCursor) {
          planNoByUser.set(user._id.toString(), user.currentPlan?.planNo ?? 1);
        }
      }

      // 7) assemble rows
      const rows: CategoryAccountRow[] = [];
      for (const pc of productCategories) {
        const pcId = pc._id.toString();
        const usersForPc = pcUsers.get(pcId);

        let free = 0;
        let paid = 0;
        if (usersForPc) {
          for (const userId of usersForPc) {
            if (!planNoByUser.has(userId)) continue; // user record missing — skip (matches script)
            const planNo = planNoByUser.get(userId) ?? 1;
            if (planNo > 1) paid++;
            else free++;
          }
        }

        const sub = pc.parentId != null ? subcatById.get(pc.parentId.toString()) : undefined;
        const subCategoryName = sub?.name ?? '';
        const categoryName = sub?.parentId ? categoryNameById.get(sub.parentId) ?? '' : '';

        rows.push({
          category: categoryName,
          subCategory: subCategoryName,
          productCategory: this.getProductCategoryName(pc),
          freeAccounts: free,
          paidAccounts: paid,
          totalAccounts: free + paid,
        });
      }

      return rows;
    } catch (error) {
      console.error('[Marketing Service] Error generating category accounts report:', error);
      throw new BadRequestException('Failed to generate category accounts report');
    }
  }
}
