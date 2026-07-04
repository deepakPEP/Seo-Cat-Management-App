import { Controller, Get, HttpStatus, Param, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { Roles } from '../auth/roles.decorator';

import { RolesGuard } from '../auth/roles.guard';

import { SupplierAnalyticsService } from './supplier-analytics.service';

import { BreakdownQueryDto, Top5QueryDto, ListCountsQueryDto } from './dto/analytics-query.dto';



@Controller('analytics')

@UseGuards(JwtAuthGuard, RolesGuard)

export class CategoryAnalyticsController {

  constructor(private readonly analyticsService: SupplierAnalyticsService) {}



  @Get('breakdown')

  @Roles('admin', 'category_manager', 'pepagora_manager', 'marketing_team')

  async getBreakdown(@Query() query: BreakdownQueryDto) {

    const data = await this.analyticsService.getBreakdown(query.nodeType, query.nodeId);

    return {

      statusCode: HttpStatus.OK,

      message: 'Breakdown fetched successfully',

      data,

    };

  }



  @Get('top5')

  @Roles('admin', 'category_manager', 'pepagora_manager', 'marketing_team')

  async getTop5(@Query() query: Top5QueryDto) {

    const data = await this.analyticsService.getTop5(query.level, query.parentId);

    return {

      statusCode: HttpStatus.OK,

      message: 'Top 5 fetched successfully',

      data,

    };

  }



  @Get('list-counts')

  @Roles('admin', 'category_manager', 'pepagora_manager', 'marketing_team')

  async getListCounts(@Query() query: ListCountsQueryDto) {

    const data = await this.analyticsService.getListCounts(query.level, query.parentId);

    return {

      statusCode: HttpStatus.OK,

      message: 'List counts fetched successfully',

      data,

    };

  }



  /** Screen 1 — top categories */

  @Get('top-categories')

  @Roles('admin', 'category_manager', 'pepagora_manager', 'marketing_team')

  async getTopCategories(@Query('limit') limit?: string) {

    const n = limit ? Math.min(parseInt(limit, 10) || 5, 20) : 5;

    const data = await this.analyticsService.getTopCategories(n);

    return { statusCode: HttpStatus.OK, message: 'Top categories fetched', data };

  }



  /** Screen 1 — top product categories */

  @Get('top-product-categories')

  @Roles('admin', 'category_manager', 'pepagora_manager', 'marketing_team')

  async getTopProductCategories(@Query('limit') limit?: string) {

    const n = limit ? Math.min(parseInt(limit, 10) || 5, 20) : 5;

    const data = await this.analyticsService.getTopProductCategories(n);

    return { statusCode: HttpStatus.OK, message: 'Top product categories fetched', data };

  }



  /** Screen 1 — combined home dashboard payload */

  @Get('home')

  @Roles('admin', 'category_manager', 'pepagora_manager', 'marketing_team')

  async getHomeAnalytics(@Query('limit') limit?: string) {

    const n = limit ? Math.min(parseInt(limit, 10) || 5, 20) : 5;

    const data = await this.analyticsService.getHomeTopCategories(n);

    return { statusCode: HttpStatus.OK, message: 'Home analytics fetched', data };

  }



  /** Screen 2 — category page */

  @Get('category/:categoryId')

  @Roles('admin', 'category_manager', 'pepagora_manager', 'marketing_team')

  async getCategoryAnalytics(@Param('categoryId') categoryId: string) {

    const data = await this.analyticsService.getCategoryAnalytics(categoryId);

    return { statusCode: HttpStatus.OK, message: 'Category analytics fetched', data };

  }



  /** Screen 2 variant — subcategory page */

  @Get('subcategory/:subCategoryId')

  @Roles('admin', 'category_manager', 'pepagora_manager', 'marketing_team')

  async getSubCategoryAnalytics(@Param('subCategoryId') subCategoryId: string) {

    const data = await this.analyticsService.getSubCategoryAnalytics(subCategoryId);

    return { statusCode: HttpStatus.OK, message: 'SubCategory analytics fetched', data };

  }



  /** Screen 3 — product category leaf */

  @Get('product-category/:productCategoryId')

  @Roles('admin', 'category_manager', 'pepagora_manager', 'marketing_team')

  async getProductCategoryAnalytics(@Param('productCategoryId') productCategoryId: string) {

    const data = await this.analyticsService.getProductCategoryAnalytics(productCategoryId);

    return { statusCode: HttpStatus.OK, message: 'Product category analytics fetched', data };

  }

}

