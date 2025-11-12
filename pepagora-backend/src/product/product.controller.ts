import { Controller, Post, Get, Put, Delete,Patch, Param, Body, UseGuards,UsePipes } from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { createProductSchema } from './validation/product.zod';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { HttpStatus, HttpCode, Query } from '@nestjs/common';



@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  // @Roles('admin', 'pepagora_manager')
  @Roles('admin', 'pepagora_manager', 'category_manager')

  
  // @UsePipes(new ZodValidationPipe(createProductSchema))
  create(@Body() dto: CreateProductDto) {
    console.log('Creating produfgthyjhgfct with data:', dto);
    return this.productService.create(dto);
  }

  // @Get()
  // findAll() {
  //   return this.productService.findAll();
  // }

    @Get('/count')
async findAllCount() {
  const count = await this.productService.findAllCount();
  console.log(count);
  return {
    message: "Product count fetched successfully",
    count,
  };
}


   
    @Get()
    @Roles('admin', 'pepagora_manager', 'category_manager')
    @HttpCode(HttpStatus.OK)
    async findAll(
      @Query('page') page: number = 1,
      @Query('limit') limit: number = 100,
       @Query('search') search?: string,
        @Query('sortBy') sortBy = 'createdAt',
        @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
    ) {
       page = Math.max(Number(page), 1);
      limit = Math.min(Math.max(Number(limit), 1), 100); // max limit = 100
      const { data, totalCount, totalPages } = await this.productService.findAll(page, limit, search, sortBy, sortOrder);

      return {
        statusCode: HttpStatus.OK,
        message: 'Products fetched successfully',
        data,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
        },
      };
    }

  

    

    
    @Patch(':id')
    @Roles('admin', 'pepagora_manager', 'category_manager')
    update(@Param('id') id: string, @Body() dto: Partial<CreateProductDto>) {
      return this.productService.update(id, dto);
    }
    
  @Delete(':id')
  @Roles('admin', 'pepagora_manager', 'category_manager')
  remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }

  // product.controller.ts
  @Get('filter')
  async getProducts(
    @Query('categories') categories: string,
    @Query('subcategories') subcategories: string,
) {

  console.log('Controller reached /products/filter ✅');
  
  const categoryIds = categories ? categories.split(',') : [];
  const subcategoryIds = subcategories ? subcategories.split(',') : [];
  
  console.log('Controller received categories:', categoryIds);
  console.log('Controller received subcategories:', subcategoryIds);
  const data = await this.productService.findByFilters(categoryIds, subcategoryIds);

  console.log('Controller fetched products:', data);
  return {
        statusCode: HttpStatus.OK,
        message: 'Products fetched successfully',
        data,
        pagination: {
          page: 1,
          limit: 10,
          totalCount: data.length,
          totalPages: Math.ceil(data.length / 10),
        },
      };
}

@Get(':id')
@Roles('admin', 'pepagora_manager', 'category_manager')
findOne(@Param('id') id: string) {
  return this.productService.findOne(id);
}

// @Get(':id')
// findOne(@Param('id') id: string) {
//   return this.productService.findOne(id);
// }
}
