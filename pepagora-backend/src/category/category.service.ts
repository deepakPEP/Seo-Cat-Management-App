import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Category } from './category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoryService {
  constructor(@InjectModel(Category.name) private categoryModel: Model<Category>) {}

  async create(dto: CreateCategoryDto) {
    // Check for duplicate category name
    const existingCategory = await this.categoryModel.findOne({ name: dto.main_cat_name });
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
async findAll(page = 1, limit = 100, search?: string, sortBy: string = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc') {
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
      const updatedCategory = await this.categoryModel.findByIdAndUpdate(id, dto, {
        new: true,
        runValidators: true, // Enforce schema validation
      });
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
}
