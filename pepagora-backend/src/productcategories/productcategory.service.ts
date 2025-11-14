// import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model, Types } from 'mongoose';
// import { Product } from './product.schema';
// import { CreateProductDto } from './dto/create-product.dto';
// import { Subcategory } from '../subcategory/subcategory.schema';
// import { isValidObjectId } from 'mongoose';

// @Injectable()
// export class ProductService {
//   constructor(
//     @InjectModel(Product.name) private productModel: Model<Product>,
//     @InjectModel(Subcategory.name) private subcategoryModel: Model<Subcategory>,
//   ) {}

//   async create(dto: CreateProductDto) {
//     const existingProduct = await this.productModel.findOne({ name: dto.name, subcategory: dto.mappedParent });
//     if (existingProduct) throw new ConflictException('Product with this name already exists in the subcategory');

//     try {
//       const newProduct = new this.productModel(dto);
//       console.log('Creating product with data:', newProduct);
//       return await newProduct.save();
//     } catch (error) {
//       throw new BadRequestException('Failed to create product');
//     }
//   }

//   // async findAll() {
//   //   return this.productModel.find().populate('subcategory').exec();
//   // }
//   async findAll(page = 1, limit = 100, search?: string, sortBy: string = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc') {
//   try {
//     const skip = (page - 1) * limit;

//     // Prepare filter for search
//     const filter = search ? { name: { $regex: search, $options: 'i' } } : {};

//     // Determine sort order
//     const sortOrderValue = sortOrder === 'asc' ? 1 : -1;

//     // Fetch paginated categories with filters and sorting
//     const [data, totalCount] = await Promise.all([
//       this.productModel
//         .find(filter)
//         .sort({ [sortBy]: sortOrderValue })
//         .skip(skip)
//         .limit(limit)
//         .exec(),
//       this.productModel.countDocuments(filter),
//     ]);

//     const totalPages = Math.ceil(totalCount / limit);

//     return {
//       data,
//       totalCount,
//       totalPages,
//       currentPage: page,
//       pageSize: limit,
//     };
//   } catch (error) {
//     throw new BadRequestException('Failed to fetch categories');
//   }
// }

//     async findAllCount() {
//     return await this.productModel.countDocuments().exec();
//   }

//   async findOne(id: string) {
//     const product = await this.productModel.findById(id).populate('mappedParent');
//     if (!product) throw new NotFoundException('Product not found');
//     return product;
//   }

//   async update(id: string, dto: CreateProductDto) {
//     const updated = await this.productModel.findByIdAndUpdate(id, dto, { new: true });
//     if (!updated) throw new NotFoundException('Product not found');
//     return updated;
//   }

//   async remove(id: string) {
//     const deleted = await this.productModel.findByIdAndDelete(id);
//     if (!deleted) throw new NotFoundException('Product not found');
//     return deleted;
//   }

// // product.service.ts
// async findByFilters(categoryIds: string[], subcategoryIds: string[]) {
//     const query: any = {};
//     // console.log('Fetching subcategories for categories:', categoryIds);

//     if (categoryIds.length > 0) {

//       // get all subcategories belonging to these categories
//       const subcategories = await this.subcategoryModel
//         .find({ mappedParent: { $in: categoryIds.map((id) => new Types.ObjectId(id)) } })
//         .select('_id')
//         .exec();

//       const subIdsFromCategories = subcategories.map((s) => s._id);

//       // merge explicit subcategories with those found via categories
//       const finalSubIds =
//         subcategoryIds.length > 0
//           ? [...new Set([...subIdsFromCategories.map((id: Types.ObjectId) => id.toString()), ...subcategoryIds])]
//           : subIdsFromCategories;

//       query.mappedParent = { $in: finalSubIds };
//     } else if (subcategoryIds.length > 0) {
//       query.mappedParent = { $in: subcategoryIds.map((id) => new Types.ObjectId(id)) };
//     }

//     // ✅ finally return products with populated subcategory
//     const ans=await this.productModel.find(query).exec();

//     // console.log('Fetched products:',ans);
//     return ans;
//     }

//   }

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Db, ObjectId } from 'mongodb';
import { CreateProductDto } from './dto/create-productcategory.dto';

type ProductCategoryDocument = {
  _id: ObjectId;
  name?: string;
  product_category_name?: string;
  parentId?: string | ObjectId;
  uniqueId?: string;
  liveUrl?: string;
  metaTitle?: string;
  metaKeyword?: string;
  metaDescription?: string;
  imageUrl?: string;
  description?: string;
  seoContent?: any;
  createdAt?: Date;
  updatedAt?: Date;
};

type SubcategoryDocument = {
  _id: ObjectId;
  name?: string;
  sub_cat_name?: string;
  parentId?: string | ObjectId;
  mappedChildren?: (string | ObjectId)[];
};

type CategoryDocument = {
  _id: ObjectId;
  name?: string;
  main_cat_name?: string;
  mappedChildren?: (string | ObjectId)[];
};

@Injectable()
export class ProductService {
  private readonly metaDb: Db;

  constructor(@InjectConnection() private readonly connection: Connection) {
    // Access the native MongoDB client from Mongoose connection
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
    if (typeof id === 'string' && ObjectId.isValid(id)) {
      return new ObjectId(id);
    }
    return null;
  }

  private getProductCategoryName(pc: ProductCategoryDocument): string {
    return pc.name ?? pc.product_category_name ?? 'Unnamed Product Category';
  }

  private getSubcategoryName(sub: SubcategoryDocument | null | undefined): string {
    if (!sub) return 'Unknown Subcategory';
    return sub.name ?? sub.sub_cat_name ?? 'Unnamed Subcategory';
  }

  private getCategoryName(cat: CategoryDocument | null | undefined): string {
    if (!cat) return 'Unknown Category';
    return cat.name ?? cat.main_cat_name ?? 'Unnamed Category';
  }

  // ----------------- CREATE -----------------
  async create(dto: CreateProductDto) {
    const productCategoriesCollection = this.metaDb.collection<ProductCategoryDocument>('productcategories');
    const parentId = this.toObjectId(dto.mappedParent);
    
    if (!parentId) {
      throw new BadRequestException('Invalid parent subcategory ID');
    }

    const existingProduct = await productCategoriesCollection.findOne({
      name: dto.name,
      parentId: parentId,
    });

    if (existingProduct)
      throw new ConflictException(
        'Product category with this name already exists in the subcategory',
      );

    try {
      const newProductCategory: Partial<ProductCategoryDocument> = {
        name: dto.name,
        parentId: parentId,
        uniqueId: dto.uniqueId,
        liveUrl: dto.liveUrl,
        metaTitle: dto.metaTitle,
        metaKeyword: dto.metaKeyword,
        metaDescription: dto.metaDescription,
        imageUrl: dto.imageUrl,
        description: dto.description,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await productCategoriesCollection.insertOne(newProductCategory as any);
      const created = await productCategoriesCollection.findOne({ _id: result.insertedId });
      
      // Populate parent subcategory and category
      return await this.populateProductCategory(created);
    } catch (error) {
      throw new BadRequestException('Failed to create product category');
    }
  }

  private async populateProductCategory(pc: ProductCategoryDocument | null) {
    if (!pc) return null;

    const subcategoriesCollection = this.metaDb.collection<SubcategoryDocument>('subcategories');
    const categoriesCollection = this.metaDb.collection<CategoryDocument>('categories');

    const parentId = this.toObjectId(pc.parentId);
    let subcategory: SubcategoryDocument | null = null;
    let category: CategoryDocument | null = null;

    if (parentId) {
      subcategory = await subcategoriesCollection.findOne({ _id: parentId });
      if (subcategory) {
        const subcategoryParentId = this.toObjectId(subcategory.parentId);
        if (subcategoryParentId) {
          category = await categoriesCollection.findOne({ _id: subcategoryParentId });
        }
      }
    }

    return {
      _id: pc._id.toString(),
      name: this.getProductCategoryName(pc),
      uniqueId: pc.uniqueId,
      liveUrl: pc.liveUrl,
      metaTitle: pc.metaTitle,
      metaKeyword: pc.metaKeyword,
      metaDescription: pc.metaDescription,
      imageUrl: pc.imageUrl,
      description: pc.description,
      mappedParent: subcategory ? {
        _id: subcategory._id.toString(),
        sub_cat_name: this.getSubcategoryName(subcategory),
        mappedParent: category ? {
          _id: category._id.toString(),
          main_cat_name: this.getCategoryName(category),
        } : undefined,
      } : undefined,
      createdAt: pc.createdAt,
      updatedAt: pc.updatedAt,
    };
  }

  // ----------------- FETCH ALL (PAGINATED) -----------------
  async findAll(
    page = 1,
    limit = 100,
    search?: string,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    try {
      const skip = (page - 1) * limit;
      const productCategoriesCollection = this.metaDb.collection<ProductCategoryDocument>('productcategories');

      const filter: any = {};
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { product_category_name: { $regex: search, $options: 'i' } },
        ];
      }

      const sortOrderValue = sortOrder === 'asc' ? 1 : -1;
      const sortField = sortBy === 'createdAt' ? '_id' : sortBy; // Use _id for createdAt since it's not always present

      const [data, totalCount] = await Promise.all([
        productCategoriesCollection
          .find(filter)
          .sort({ [sortField]: sortOrderValue })
          .skip(skip)
          .limit(limit)
          .toArray(),
        productCategoriesCollection.countDocuments(filter),
      ]);

      // Populate all product categories
      const populatedData = await Promise.all(
        data.map((pc) => this.populateProductCategory(pc))
      );

      const totalPages = Math.ceil(totalCount / limit);

      return {
        data: populatedData.filter(Boolean),
        totalCount,
        totalPages,
        currentPage: page,
        pageSize: limit,
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch product categories');
    }
  }

  // ----------------- FETCH COUNT -----------------
  async findAllCount() {
    const productCategoriesCollection = this.metaDb.collection<ProductCategoryDocument>('productcategories');
    return await productCategoriesCollection.countDocuments();
  }

  // ----------------- FETCH ONE -----------------
  async findOne(id: string) {
    const productCategoryId = this.toObjectId(id);
    if (!productCategoryId) {
      throw new BadRequestException('Invalid ID');
    }

    const productCategoriesCollection = this.metaDb.collection<ProductCategoryDocument>('productcategories');
    const productCategory = await productCategoriesCollection.findOne({ _id: productCategoryId });

    if (!productCategory) throw new NotFoundException('Product category not found');
    
    return await this.populateProductCategory(productCategory);
  }

  // ----------------- UPDATE -----------------
  async update(id: string, dto: Partial<CreateProductDto>) {
    const productCategoryId = this.toObjectId(id);
    if (!productCategoryId) {
      throw new BadRequestException('Invalid ID');
    }

    const productCategoriesCollection = this.metaDb.collection<ProductCategoryDocument>('productcategories');
    
    // Check if product category exists
    const existing = await productCategoriesCollection.findOne({ _id: productCategoryId });
    if (!existing) {
      throw new NotFoundException('Product category not found');
    }

    // If name or mappedParent is being updated, check for conflicts
    if (dto.name || dto.mappedParent) {
      const parentId = dto.mappedParent ? this.toObjectId(dto.mappedParent) : this.toObjectId(existing.parentId);
      const name = dto.name ?? existing.name;
      
      if (parentId) {
        const conflicting = await productCategoriesCollection.findOne({
          name: name,
          parentId: parentId,
          _id: { $ne: productCategoryId },
        });
        
        if (conflicting) {
          throw new ConflictException('Product category with this name already exists in the subcategory');
        }
      }
    }

    // Build update object
    const updateFields: any = {
      updatedAt: new Date(),
    };

    if (dto.name !== undefined) updateFields.name = dto.name;
    if (dto.mappedParent !== undefined) {
      const parentId = this.toObjectId(dto.mappedParent);
      if (!parentId) {
        throw new BadRequestException('Invalid parent subcategory ID');
      }
      updateFields.parentId = parentId;
    }
    if (dto.uniqueId !== undefined) updateFields.uniqueId = dto.uniqueId;
    if (dto.liveUrl !== undefined) updateFields.liveUrl = dto.liveUrl;
    if (dto.metaTitle !== undefined) updateFields.metaTitle = dto.metaTitle;
    if (dto.metaKeyword !== undefined) updateFields.metaKeyword = dto.metaKeyword;
    if (dto.metaDescription !== undefined) updateFields.metaDescription = dto.metaDescription;
    if (dto.imageUrl !== undefined) updateFields.imageUrl = dto.imageUrl;
    if (dto.description !== undefined) updateFields.description = dto.description;

    await productCategoriesCollection.updateOne(
      { _id: productCategoryId },
      { $set: updateFields }
    );

    const updated = await productCategoriesCollection.findOne({ _id: productCategoryId });
    if (!updated) throw new NotFoundException('Product category not found');
    
    return await this.populateProductCategory(updated);
  }

  // ----------------- DELETE -----------------
  async remove(id: string) {
    const productCategoryId = this.toObjectId(id);
    if (!productCategoryId) {
      throw new BadRequestException('Invalid ID');
    }

    const productCategoriesCollection = this.metaDb.collection<ProductCategoryDocument>('productcategories');
    const deleted = await productCategoriesCollection.findOneAndDelete({ _id: productCategoryId });
    
    if (!deleted) throw new NotFoundException('Product category not found');
    
    return await this.populateProductCategory(deleted);
  }

  // ----------------- FILTER BY CATEGORY / SUBCATEGORY -----------------
  async findByFilters(
    categoryIds: string[] = [],
    subcategoryIds: string[] = [],
  ) {
    const productCategoriesCollection = this.metaDb.collection<ProductCategoryDocument>('productcategories');
    const subcategoriesCollection = this.metaDb.collection<SubcategoryDocument>('subcategories');
    const query: any = {};

    if (categoryIds.length > 0) {
      // Get all subcategories belonging to these categories
      const categoryObjectIds = categoryIds.map((id) => this.toObjectId(id)).filter(Boolean) as ObjectId[];
      
      const subcategories = await subcategoriesCollection
        .find({
          parentId: { $in: categoryObjectIds },
        })
        .toArray();

      const subIdsFromCategories = subcategories.map((s) => s._id.toString());

      const finalSubIds =
        subcategoryIds.length > 0
          ? [...new Set([...subIdsFromCategories, ...subcategoryIds])]
          : subIdsFromCategories;

      const finalSubObjectIds = finalSubIds
        .map((id) => this.toObjectId(id))
        .filter(Boolean) as ObjectId[];

      query.parentId = { $in: finalSubObjectIds };
    } else if (subcategoryIds.length > 0) {
      const subObjectIds = subcategoryIds
        .map((id) => this.toObjectId(id))
        .filter(Boolean) as ObjectId[];
      query.parentId = { $in: subObjectIds };
    }

    // Fetch product categories
    const productCategories = await productCategoriesCollection.find(query).toArray();

    // Populate all product categories
    const populatedData = await Promise.all(
      productCategories.map((pc) => this.populateProductCategory(pc))
    );

    return populatedData.filter(Boolean);
  }
}
