import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, isValidObjectId, Types, Connection } from 'mongoose';
import { Db, ObjectId } from 'mongodb';
import { Category } from './category.schema';
import { Subcategory } from '../subcategory/subcategory.schema';
import { CreateCategoryDto } from './dto/create-category.dto';

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

@Injectable()
export class CategoryService {
  private readonly metaDb: Db;

  constructor(
    @InjectModel(Category.name) private categoryModel: Model<Category>,
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

  async create(dto: CreateCategoryDto) {
    // Check for duplicate category name
    const existingCategory = await this.categoryModel.findOne({
      name: dto.main_cat_name,
    });
    if (existingCategory) {
      throw new ConflictException('Category with this name already exists');
    }

    try {
      const newCategory = new this.categoryModel(dto);
      console.log('Creating category with data from service:', newCategory);
      return await newCategory.save();
    } catch (error) {
      throw new BadRequestException('Failed to create category');
    }
  }

  // async findAll() {
  //   try {
  //     return await this.categoryModel.find().sort({ createdAt: -1 }).exec(); // Sorted by latest
  //   } catch (error) {
  //     throw new BadRequestException('Failed to fetch categories');
  //   }
  // }
  //   async findAll(page = 1, limit = 10) {
  //   try {
  //     const skip = (page - 1) * limit;

  //     // Fetch paginated categories
  //     const [data, totalCount] = await Promise.all([
  //       this.categoryModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
  //       this.categoryModel.countDocuments()
  //     ]);

  //     const totalPages = Math.ceil(totalCount / limit);

  //     return { data, totalCount, totalPages };
  //   } catch (error) {
  //     throw new BadRequestException('Failed to fetch categories');
  //   }
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
        this.categoryModel
          .find(filter)
          .sort({ [sortBy]: sortOrderValue })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.categoryModel.countDocuments(filter),
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
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid category ID');
    }

    const category = await this.categoryModel.findById(id);
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return category;
  }

  async update(id: string, dto: CreateCategoryDto) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid category ID');
    }

    try {
      const updatedCategory = await this.categoryModel.findByIdAndUpdate(
        id,
        dto,
        {
          new: true,
          runValidators: true, // Enforce schema validation
        },
      );
      if (!updatedCategory) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }
      return updatedCategory;
    } catch (error) {
      throw new BadRequestException('Failed to update category');
    }
  }

  async remove(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid category ID');
    }

    try {
      const deletedCategory = await this.categoryModel.findByIdAndDelete(id);
      if (!deletedCategory) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }
      return deletedCategory;
    } catch (error) {
      throw new BadRequestException('Failed to delete category');
    }
  }

  // Get subcategories by category ID (hierarchical endpoint - matching marketing service)
  async getSubcategoriesByCategory(categoryId: string) {
    try {
      const categoriesCollection = this.metaDb.collection<CategoryDocument>('categories');
      const subcategoriesCollection = this.metaDb.collection<SubcategoryDocument>('subcategories');

      const categoryObjectId = this.toObjectId(categoryId);
      if (!categoryObjectId) throw new BadRequestException('Invalid category ID');

      const category = await categoriesCollection.findOne({ _id: categoryObjectId });
      if (!category) throw new BadRequestException('Category not found');

      // Get mappedChildren like marketing service (line 132 of marketing.service.ts)
      const mappedChildren = Array.isArray(category.mappedChildren)
        ? category.mappedChildren
        : [];

      // Convert to ObjectIds like marketing service (line 136-138)
      const subcategoryObjectIds = mappedChildren
        .map((child) => this.toObjectId(child as string | ObjectId))
        .filter((id): id is ObjectId => id !== null);

      // Fetch subcategories like marketing service (line 140-145)
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
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch subcategories');
    }
  }
}
