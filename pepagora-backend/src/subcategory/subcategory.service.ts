import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Subcategory } from './subcategory.schema';
import { CreateSubcategoryDto } from './dto/create-subcategory.dto';

@Injectable()
export class SubcategoryService {
  constructor(@InjectModel(Subcategory.name) private subcategoryModel: Model<Subcategory>) {}

  async create(dto: CreateSubcategoryDto) {
    const existingSubcategory = await this.subcategoryModel.findOne({ name: dto.sub_cat_name, mappedParent: dto.mappedParent });
    if (existingSubcategory) {
      throw new ConflictException('Subcategory with this name already exists in the selected category');
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
  return this.subcategoryModel.find({ mappedParent: { $in: categoryIds } }).exec();
}


  // async findAll() {
  //   return this.subcategoryModel.find().populate('category').exec();
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
    const subcategory = await this.subcategoryModel.findById(id).populate('mappedParent');
    if (!subcategory) throw new NotFoundException('Subcategory not found');
    return subcategory;
  }

  async update(id: string, dto: CreateSubcategoryDto) {
    const subcategory = await this.subcategoryModel.findByIdAndUpdate(id, dto, { new: true });
    if (!subcategory) throw new NotFoundException('Subcategory not found');
    return subcategory;
  }

  async remove(id: string) {
    const subcategory = await this.subcategoryModel.findByIdAndDelete(id);
    if (!subcategory) throw new NotFoundException('Subcategory not found');
    return subcategory;
  }

}
