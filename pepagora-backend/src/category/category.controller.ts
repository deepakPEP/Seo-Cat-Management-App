import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { createCategorySchema } from './validation/category.zod';
import { Query } from '@nestjs/common';


@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @Roles('admin', 'category_manager')
  // @UsePipes(new ZodValidationPipe(createCategorySchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateCategoryDto) {
    console.log('Creating category with data from controller:', dto);
    const category = await this.categoryService.create(dto);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Category created successfully',
      data: category,
    };
  }


@Get()
@HttpCode(HttpStatus.OK)
async findAll(
  @Query('page') page: number = 1,
  @Query('limit') limit: number = 100,
   @Query('search') search?: string,
    @Query('sortBy') sortBy = 'createdAt',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
) {
   page = Math.max(Number(page), 1);
  limit = Math.min(Math.max(Number(limit), 1), 1000); // max limit = 1000
  const { data, totalCount, totalPages } = await this.categoryService.findAll(page, limit, search, sortBy, sortOrder);

  return {
    statusCode: HttpStatus.OK,
    message: 'Categories fetched successfully',
    data,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
    },
  };
}


  

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    const category = await this.categoryService.findOne(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Category fetched successfully',
      data: category,
    };
  }

  @Put(':id')
  @Roles('admin', 'category_manager')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: CreateCategoryDto) {
    const updatedCategory = await this.categoryService.update(id, dto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Category updated successfully',
      data: updatedCategory,
    };
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    await this.categoryService.remove(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Category deleted successfully',
    };
  }
}
