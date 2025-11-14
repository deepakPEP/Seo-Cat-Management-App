import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Db, ObjectId } from 'mongodb';

type CategoryDocument = {
  _id: ObjectId;
  name?: string;
  main_cat_name?: string;
  mappedChildren?: (string | ObjectId)[];
};

type SubcategoryDocument = {
  _id: ObjectId;
  name?: string;
  sub_cat_name?: string;
  mappedChildren?: (string | ObjectId)[];
  parentId?: string | ObjectId;
};

type ProductCategoryDocument = {
  _id: ObjectId;
  name?: string;
  product_category_name?: string;
  parentId?: string | ObjectId;
};

type LiveProductDocument = {
  _id: ObjectId;
  productName?: string;
  productCategory?: {
    _id?: ObjectId;
  };
};

@Injectable()
export class MarketingService {
  private readonly metaDb: Db;

  constructor(@InjectConnection() private readonly connection: Connection) {
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
      throw new Error('MongoDB client not available from connection');
    }
    
    this.metaDb = client.db('metaData');
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
      return await liveProductsCollection.countDocuments();
    } catch (error) {
      throw new BadRequestException('Failed to fetch live products count');
    }
  }

  // Get all categories (for marketing team view)
  async getCategoriesForMarketing() {
    try {
      const categoriesCollection = this.metaDb.collection<CategoryDocument>('categories');
      const categories = await categoriesCollection
        .find({}, { projection: { name: 1, main_cat_name: 1 } })
        .sort({ name: 1, main_cat_name: 1 })
        .toArray();

      return categories.map((cat) => ({
        _id: cat._id.toString(),
        name: this.getCategoryName(cat),
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

      const category = await categoriesCollection.findOne({ _id: categoryObjectId });
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

      const subcategoryObjectId = this.toObjectId(subcategoryId);
      if (!subcategoryObjectId) throw new BadRequestException('Invalid subcategory ID');

      const subcategory = await subcategoriesCollection.findOne({ _id: subcategoryObjectId });
      if (!subcategory) throw new BadRequestException('Subcategory not found');

      const productCategories = await productCategoriesCollection
        .find({ parentId: subcategoryObjectId }, { projection: { name: 1 } })
        .sort({ name: 1 })
        .toArray();

      const category = await categoriesCollection.findOne({
        mappedChildren: { $in: [subcategory._id.toString()] },
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
        },
        productCategories: productCategories.map((pc) => ({
          _id: pc._id.toString(),
          name: this.getProductCategoryName(pc),
        })),
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

      const productCategory = await productCategoriesCollection.findOne({ _id: productCategoryObjectId });
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
        .find(
          { 'productCategory._id': productCategoryObjectId },
          { projection: { productName: 1 } },
        )
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
        },
        products: products.map((product) => ({
          _id: product._id.toString(),
          productName: product.productName ?? 'Unnamed Product',
        })),
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch live products');
    }
  }

  // Generate Excel report data
  async generateExcelReportData(): Promise<any[]> {
    try {
      const categoriesCollection = this.metaDb.collection<CategoryDocument>('categories');
      const subcategoriesCollection = this.metaDb.collection<SubcategoryDocument>('subcategories');
      const productCategoriesCollection = this.metaDb.collection<ProductCategoryDocument>('productcategories');
      const liveProductsCollection = this.metaDb.collection<LiveProductDocument>('liveproducts');

      const categories = await categoriesCollection
        .find({}, { projection: { name: 1, main_cat_name: 1, mappedChildren: 1 } })
        .toArray();

      const subcategories = await subcategoriesCollection
        .find({}, { projection: { name: 1, sub_cat_name: 1, mappedChildren: 1 } })
        .toArray();

      const productCategories = await productCategoriesCollection
        .find({}, { projection: { name: 1, product_category_name: 1 } })
        .toArray();

      const subcatById = new Map<string, SubcategoryDocument>();
      subcategories.forEach((subcat) => {
        subcatById.set(subcat._id.toString(), subcat);
      });

      const prodcatById = new Map<string, ProductCategoryDocument>();
      productCategories.forEach((prodcat) => {
        prodcatById.set(prodcat._id.toString(), prodcat);
      });

      const hierarchy: any[] = [];

      for (const category of categories) {
        const categoryName = this.getCategoryName(category);
        const mappedChildren = Array.isArray(category.mappedChildren)
          ? category.mappedChildren
          : [];

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
          const mappedProductChildren = Array.isArray(subcat.mappedChildren)
            ? subcat.mappedChildren
            : [];

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

            const productCount = productCategoryObjectId
              ? await liveProductsCollection.countDocuments({
                  'productCategory._id': productCategoryObjectId,
                })
              : 0;

            let sampleProducts = '';
            if (productCategoryObjectId && productCount > 0) {
              const products = await liveProductsCollection
                .find({ 'productCategory._id': productCategoryObjectId }, { projection: { productName: 1 } })
                .limit(10)
                .toArray();
              sampleProducts = products
                .map((product) => product.productName ?? 'Unnamed Product')
                .join(', ');
            }

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
      throw new BadRequestException('Failed to generate report');
    }
  }
}
