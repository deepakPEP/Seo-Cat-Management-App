import {
  Controller,
  Get,
  Param,
  UseGuards,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { MarketingService } from './marketing.service';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';

@Controller('marketing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  // Dashboard counts
  @Get('dashboard/counts')
  @Roles('admin', 'category_manager', 'pepagora_manager', 'marketing_team')
  async getDashboardCounts() {
    const [productCategoryCount, liveProductsCount] = await Promise.all([
      this.marketingService.getProductCategoryCount(),
      this.marketingService.getLiveProductsCount(),
    ]);

    return {
      statusCode: HttpStatus.OK,
      message: 'Dashboard counts fetched successfully',
      data: {
        productCategoryCount,
        liveProductsCount,
      },
    };
  }

  // View-only endpoints for marketing team
  @Get('categories')
  @Roles('admin', 'category_manager', 'pepagora_manager', 'marketing_team')
  async getCategories() {
    const categories = await this.marketingService.getCategoriesForMarketing();
    return {
      statusCode: HttpStatus.OK,
      message: 'Categories fetched successfully',
      data: categories,
    };
  }

  @Get('categories/:categoryId/subcategories')
  @Roles('admin', 'category_manager', 'pepagora_manager', 'marketing_team')
  async getSubcategoriesByCategory(@Param('categoryId') categoryId: string) {
    const result =
      await this.marketingService.getSubcategoriesByCategory(categoryId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Subcategories fetched successfully',
      data: result.subcategories,
      category: result.category,
    };
  }

  @Get('subcategories/:subcategoryId/productcategories')
  @Roles('admin', 'category_manager', 'pepagora_manager', 'marketing_team')
  async getProductCategoriesBySubcategory(
    @Param('subcategoryId') subcategoryId: string,
  ) {
    const result =
      await this.marketingService.getProductCategoriesBySubcategory(
        subcategoryId,
      );
    return {
      statusCode: HttpStatus.OK,
      message: 'Product categories fetched successfully',
      data: result.productCategories,
      category: result.category,
      subcategory: result.subcategory,
    };
  }

  @Get('productcategories/:productCategoryId/products')
  @Roles('admin', 'category_manager', 'pepagora_manager', 'marketing_team')
  async getLiveProductsByProductCategory(
    @Param('productCategoryId') productCategoryId: string,
  ) {
    const result =
      await this.marketingService.getLiveProductsByProductCategory(
        productCategoryId,
      );
    return {
      statusCode: HttpStatus.OK,
      message: 'Products fetched successfully',
      data: result.products,
      category: result.category,
      subcategory: result.subcategory,
      productCategory: result.productCategory,
    };
  }

  // Excel report generation
  @Get('report/excel')
  @Roles('admin', 'category_manager', 'pepagora_manager', 'marketing_team')
  async generateExcelReport(@Res() res: Response) {
    try {
      const hierarchy = await this.marketingService.generateExcelReportData();

      // Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Product Hierarchy');

      // Define styles
      const headerFill = {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: 'FF366092' },
      };
      const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };

      const categoryFill = {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: 'FFD9E1F2' },
      };
      const categoryFont = { bold: true, size: 11 };

      const subcategoryFill = {
        type: 'pattern' as const,
        pattern: 'solid' as const,
        fgColor: { argb: 'FFE7E6E6' },
      };
      const subcategoryFont = { bold: true, size: 10 };

      // Headers
      worksheet.columns = [
        { width: 30 },
        { width: 30 },
        { width: 35 },
        { width: 15 },
        { width: 60 },
      ];

      const headers = [
        'Category',
        'Subcategory',
        'Product Category',
        'Product Count',
        'Sample Products',
      ];
      worksheet.addRow(headers);

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = headerFont;
      headerRow.fill = headerFill;
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

      // Add data
      hierarchy.forEach((item: any) => {
        const row = worksheet.addRow([
          item.category,
          item.subcategory,
          item.productCategory,
          item.productCount,
          item.sampleProducts,
        ]);

        // Style rows
        const categoryCell = row.getCell(1);
        if (item.category) {
          categoryCell.font = categoryFont;
          categoryCell.fill = categoryFill;
        }

        const subcategoryCell = row.getCell(2);
        if (item.subcategory) {
          subcategoryCell.font = subcategoryFont;
          subcategoryCell.fill = subcategoryFill;
        }
      });

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=pepagora_hierarchy.xlsx',
      );

      res.send(buffer);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to generate Excel report',
      });
    }
  }
}
