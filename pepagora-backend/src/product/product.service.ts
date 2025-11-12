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



import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product } from './product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { Subcategory } from '../subcategory/subcategory.schema';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Subcategory.name) private subcategoryModel: Model<Subcategory>,
  ) {}

  // ----------------- CREATE -----------------
  async create(dto: CreateProductDto) {
    const existingProduct = await this.productModel.findOne({
      name: dto.name,
      mappedParent: dto.mappedParent,
    });

    if (existingProduct)
      throw new ConflictException(
        'Product with this name already exists in the subcategory',
      );

    try {
      const newProduct = new this.productModel(dto);
      return await newProduct.save();
    } catch (error) {
      throw new BadRequestException('Failed to create product');
    }
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

      const filter = search ? { name: { $regex: search, $options: 'i' } } : {};

      const sortOrderValue = sortOrder === 'asc' ? 1 : -1;

      const [data, totalCount] = await Promise.all([
        this.productModel
          .find(filter)
          .populate({
            path: 'mappedParent', // populate subcategory
            select: '_id sub_cat_name mappedParent',
            populate: { path: 'mappedParent', model: 'Category', select: '_id main_cat_name' }, // populate category inside subcategory
          })
          .sort({ [sortBy]: sortOrderValue })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.productModel.countDocuments(filter),
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
      throw new BadRequestException('Failed to fetch products');
    }
  }

  // ----------------- FETCH COUNT -----------------
  async findAllCount() {
    return await this.productModel.countDocuments().exec();
  }

  // ----------------- FETCH ONE -----------------
  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid ID');

    const product = await this.productModel
      .findById(id)
      .populate({
        path: 'mappedParent',
        select: '_id sub_cat_name mappedParent',
        populate: { path: 'mappedParent', model: 'Category', select: '_id main_cat_name' },
      });

    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  // ----------------- UPDATE -----------------
  async update(id: string, dto: Partial<CreateProductDto>) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid ID');

    // Remove undefined fields from dto for partial update
    const updateFields: any = {};
    Object.keys(dto).forEach(key => {
      if (dto[key] !== undefined) updateFields[key] = dto[key];
    });

    const updated = await this.productModel
      .findByIdAndUpdate(id, { $set: updateFields }, { new: true })
      .populate({
        path: 'mappedParent',
        select: '_id sub_cat_name mappedParent',
        populate: { path: 'mappedParent', model: 'Category', select: '_id main_cat_name' },
      });

    if (!updated) throw new NotFoundException('Product not found');
    return updated;
  }

  // ----------------- DELETE -----------------
  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid ID');

    const deleted = await this.productModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Product not found');
    return deleted;
  }

  // ----------------- FILTER BY CATEGORY / SUBCATEGORY -----------------
  async findByFilters(categoryIds: string[] = [], subcategoryIds: string[] = []) {
    const query: any = {};

    if (categoryIds.length > 0) {
      // get all subcategories belonging to these categories
      const subcategories = await this.subcategoryModel
        .find({ mappedParent: { $in: categoryIds.map((id) => new Types.ObjectId(id)) } })
        .select('_id')
        .exec() as { _id: Types.ObjectId }[];

      const subIdsFromCategories = subcategories.map((s) => s._id.toString());

      const finalSubIds =
        subcategoryIds.length > 0
          ? [...new Set([...subIdsFromCategories, ...subcategoryIds])]
          : subIdsFromCategories;

      query.mappedParent = { $in: finalSubIds.map((id) => new Types.ObjectId(id)) };
    } else if (subcategoryIds.length > 0) {
      query.mappedParent = { $in: subcategoryIds.map((id) => new Types.ObjectId(id)) };
    }

    // populate subcategory and category
    return await this.productModel
      .find(query)
      .populate({
        path: 'mappedParent',
        select: '_id sub_cat_name mappedParent',
        populate: { path: 'mappedParent', model: 'Category', select: '_id main_cat_name' },
      })
      .exec();
  }
}
