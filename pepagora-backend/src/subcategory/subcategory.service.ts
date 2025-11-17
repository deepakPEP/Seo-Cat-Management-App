import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { Db, ObjectId } from 'mongodb';
import { Subcategory } from './subcategory.schema';
import { CreateSubcategoryDto } from './dto/create-subcategory.dto';

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
};

type ProductCategoryDocument = {
  _id: ObjectId;
  name?: string;
  product_category_name?: string;
  parentId?: string | ObjectId;
};

@Injectable()
export class SubcategoryService {
  private readonly metaDb: Db;

  constructor(
    @InjectModel(Subcategory.name) private subcategoryModel: Model<Subcategory>,
    @InjectConnection() private readonly connection: Connection,
  ) {
    // Access the native MongoDB client from Mongoose connection (same as marketing service)
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

  async create(dto: CreateSubcategoryDto) {
    const existingSubcategory = await this.subcategoryModel.findOne({
      name: dto.sub_cat_name,
      mappedParent: dto.mappedParent,
    });
    if (existingSubcategory) {
      throw new ConflictException(
        'Subcategory with this name already exists in the selected category',
      );
    }

    try {
      const newSubcategory = new this.subcategoryModel(dto);
      return await newSubcategory.save();
    } catch (error) {
      throw new BadRequestException('Failed to create subcategory');
    }
  }
  async findAllCount() {
    return await this.subcategoryModel.countDocuments().exec();
  }

  // subcategory.service.ts
  async findByCategories(categoryIds: string[]) {
    return this.subcategoryModel
      .find({ mappedParent: { $in: categoryIds } })
      .exec();
  }

  // async findAll() {
  //   return this.subcategoryModel.find().populate('category').exec();
  // }

  async findAll(
    page = 1,
    limit = 100,
    search?: string,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    try {
      const skip = (page - 1) * limit;

      // Prepare filter for search
      const filter = search ? { name: { $regex: search, $options: 'i' } } : {};

      // Determine sort order
      const sortOrderValue = sortOrder === 'asc' ? 1 : -1;

      // Fetch paginated categories with filters and sorting
      const [data, totalCount] = await Promise.all([
        this.subcategoryModel
          .find(filter)
          .sort({ [sortBy]: sortOrderValue })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.subcategoryModel.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        data,
        totalCount,
        totalPages,
        currentPage: page,
        pageSize: limit,
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch categories');
    }
  }

  async findOne(id: string) {
    const subcategory = await this.subcategoryModel
      .findById(id)
      .populate('mappedParent');
    if (!subcategory) throw new NotFoundException('Subcategory not found');
    return subcategory;
  }

  async update(id: string, dto: CreateSubcategoryDto) {
    const subcategory = await this.subcategoryModel.findByIdAndUpdate(id, dto, {
      new: true,
    });
    if (!subcategory) throw new NotFoundException('Subcategory not found');
    return subcategory;
  }

  async remove(id: string) {
    const subcategory = await this.subcategoryModel.findByIdAndDelete(id);
    if (!subcategory) throw new NotFoundException('Subcategory not found');
    return subcategory;
  }

  // Get product categories by subcategory ID (hierarchical endpoint - matching marketing service)
  async getProductCategoriesBySubcategory(subcategoryId: string) {
    try {
      const subcategoriesCollection = this.metaDb.collection<SubcategoryDocument>('subcategories');
      const categoriesCollection = this.metaDb.collection<CategoryDocument>('categories');
      const productCategoriesCollection = this.metaDb.collection<ProductCategoryDocument>('productcategories');

      const subcategoryObjectId = this.toObjectId(subcategoryId);
      if (!subcategoryObjectId) throw new BadRequestException('Invalid subcategory ID');

      const subcategory = await subcategoriesCollection.findOne({ _id: subcategoryObjectId });
      if (!subcategory) throw new BadRequestException('Subcategory not found');

      // Use parentId field like marketing service (line 176 of marketing.service.ts)
      const productCategories = await productCategoriesCollection
        .find({ parentId: subcategoryObjectId }, { projection: { name: 1 } })
        .sort({ name: 1 })
        .toArray();

      // Find the parent category
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
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch product categories');
    }
  }
}
