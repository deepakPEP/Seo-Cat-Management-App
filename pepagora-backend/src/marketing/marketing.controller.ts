import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { MarketingService } from './marketing.service';
import { AnalyticsService } from './analytics.service';
import { AnalyticsRequestDto } from './dto/analytics-request.dto';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';

@Controller('marketing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MarketingController {
  constructor(
    private readonly marketingService: MarketingService,
    private readonly analyticsService: AnalyticsService,
  ) {}

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

  // Get all counts (for categories page)
  @Get('counts/all')
  @Roles('admin', 'category_manager', 'pepagora_manager', 'marketing_team')
  async getAllCounts() {
    const counts = await this.marketingService.getAllCounts();
    return {
      statusCode: HttpStatus.OK,
      message: 'All counts fetched successfully',
      data: counts,
    };
  }

  // Get counts by category (for subcategories page)
  @Get('categories/:categoryId/counts')
  @Roles('admin', 'category_manager', 'pepagora_manager', 'marketing_team')
  async getCountsByCategory(@Param('categoryId') categoryId: string) {
    const counts = await this.marketingService.getCountsByCategory(categoryId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Category counts fetched successfully',
      data: counts,
    };
  }

  // Get product count by subcategory (for product categories page)
  @Get('subcategories/:subcategoryId/product-count')
  @Roles('admin', 'category_manager', 'pepagora_manager', 'marketing_team')
  async getProductCountBySubcategory(@Param('subcategoryId') subcategoryId: string) {
    const counts = await this.marketingService.getProductCountBySubcategory(subcategoryId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Subcategory product count fetched successfully',
      data: counts,
    };
  }

  // Search across categories, subcategories and product categories
  @Get('search')
  @Roles('admin', 'category_manager', 'pepagora_manager', 'marketing_team')
  async searchHierarchy(@Query('q') q: string) {
    const results = await this.marketingService.searchHierarchy(q ?? '');
    return {
      statusCode: HttpStatus.OK,
      message: 'Search results fetched successfully',
      data: results,
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

      // OPTIMIZATION: Add data in batches for better performance
      // Process in chunks to avoid memory issues with large datasets
      const BATCH_SIZE = 1000;
      for (let i = 0; i < hierarchy.length; i += BATCH_SIZE) {
        const batch = hierarchy.slice(i, i + BATCH_SIZE);
        batch.forEach((item: any) => {
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
      }

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

  // Category-wise accounts (Free vs Paid) Excel report
  @Get('report/category-accounts/excel')
  @Roles('admin', 'category_manager', 'pepagora_manager', 'marketing_team')
  async generateCategoryAccountsReport(@Res() res: Response) {
    try {
      const { rows, categorySummary, totals } =
        await this.marketingService.generateCategoryAccountsReportData();

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Pepagora Analytics';
      workbook.created = new Date();

      // ─── Palette ──────────────────────────────────────────────────────────
      const NAVY = 'FF1F3864';
      const HEADER_BLUE = 'FF2F5597';
      const BAND = 'FFF2F5FB';
      const FREE_TEXT = 'FF7A6000';
      const PAID_TEXT = 'FF1E6B3A';
      const TOTAL_FILL = 'FFDDE6F4';
      const BORDER = 'FFD0D7E5';

      const thin = { style: 'thin' as const, color: { argb: BORDER } };
      const allBorders = { top: thin, left: thin, bottom: thin, right: thin };

      const COLUMNS = [
        { header: 'Category', key: 'category', width: 34 },
        { header: 'Sub Category', key: 'subCategory', width: 32 },
        { header: 'Product Category', key: 'productCategory', width: 38 },
        { header: 'Free Accounts', key: 'freeAccounts', width: 16 },
        { header: 'Paid Accounts', key: 'paidAccounts', width: 16 },
        { header: 'Total Accounts', key: 'totalAccounts', width: 16 },
      ];
      const lastCol = COLUMNS.length; // 6
      const lastColLetter = String.fromCharCode(64 + lastCol); // 'F'

      // ─── Sheet 1: detail ──────────────────────────────────────────────────
      const ws = workbook.addWorksheet('Category Accounts', {
        views: [{ state: 'frozen', ySplit: 4 }],
      });
      ws.columns = COLUMNS.map((c) => ({ key: c.key, width: c.width }));

      // Title banner
      ws.mergeCells(`A1:${lastColLetter}1`);
      const titleCell = ws.getCell('A1');
      titleCell.value = 'Category-wise Accounts Report';
      titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
      titleCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
      ws.getRow(1).height = 30;

      // Subtitle
      ws.mergeCells(`A2:${lastColLetter}2`);
      const subtitle = ws.getCell('A2');
      subtitle.value = `Each account counted once (in its first-listed product category) — no duplicates  •  Generated ${new Date().toLocaleString('en-IN')}`;
      subtitle.font = { italic: true, size: 10, color: { argb: 'FF5A6B85' } };
      subtitle.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      ws.getRow(2).height = 18;

      // Spacer row 3 (kept thin)
      ws.getRow(3).height = 6;

      // Header row (row 4)
      const headerRow = ws.getRow(4);
      COLUMNS.forEach((c, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = c.header;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BLUE } };
        cell.alignment = {
          horizontal: i < 3 ? 'left' : 'center',
          vertical: 'middle',
          indent: i < 3 ? 1 : 0,
        };
        cell.border = allBorders;
      });
      headerRow.height = 22;

      // Data rows
      rows.forEach((r, idx) => {
        const row = ws.addRow([
          r.category,
          r.subCategory,
          r.productCategory,
          r.freeAccounts,
          r.paidAccounts,
          r.totalAccounts,
        ]);
        row.height = 18;

        const banded = idx % 2 === 1;
        for (let c = 1; c <= lastCol; c++) {
          const cell = row.getCell(c);
          cell.border = allBorders;
          if (banded) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BAND } };
          }
          if (c <= 3) {
            cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
          } else {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.numFmt = '#,##0';
          }
        }
        row.getCell(4).font = { color: { argb: FREE_TEXT } };
        row.getCell(5).font = { color: { argb: PAID_TEXT }, bold: true };
        row.getCell(6).font = { bold: true };
      });

      // Totals row — sum of all rows = unique accounts (each counted once)
      const totalRowValues = [
        'Total (Unique Accounts)',
        '',
        '',
        totals.freeAccounts,
        totals.paidAccounts,
        totals.totalAccounts,
      ];
      const totalRow = ws.addRow(totalRowValues);
      totalRow.height = 20;
      ws.mergeCells(`A${totalRow.number}:C${totalRow.number}`);
      for (let c = 1; c <= lastCol; c++) {
        const cell = totalRow.getCell(c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_FILL } };
        cell.font = { bold: true, size: 11 };
        cell.border = allBorders;
        cell.alignment = {
          horizontal: c <= 3 ? 'left' : 'center',
          vertical: 'middle',
          indent: c <= 3 ? 1 : 0,
        };
        if (c >= 4) cell.numFmt = '#,##0';
      }

      // Autofilter over the header + data
      ws.autoFilter = {
        from: { row: 4, column: 1 },
        to: { row: 4 + rows.length, column: lastCol },
      };

      // ─── Sheet 2: summary by category (distinct accounts) ─────────────────
      const sum = workbook.addWorksheet('Summary by Category', {
        views: [{ state: 'frozen', ySplit: 2 }],
      });
      sum.columns = [
        { key: 'category', width: 40 },
        { key: 'pcCount', width: 20 },
        { key: 'free', width: 16 },
        { key: 'paid', width: 16 },
        { key: 'total', width: 16 },
        { key: 'paidPct', width: 14 },
      ];

      sum.mergeCells('A1:F1');
      const sumTitle = sum.getCell('A1');
      sumTitle.value = 'Accounts Summary by Category';
      sumTitle.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
      sumTitle.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      sumTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
      sum.getRow(1).height = 26;

      const sumHeaders = [
        'Category',
        'Product Categories',
        'Free Accounts',
        'Paid Accounts',
        'Total Accounts',
        'Paid %',
      ];
      const sumHeaderRow = sum.getRow(2);
      sumHeaders.forEach((h, i) => {
        const cell = sumHeaderRow.getCell(i + 1);
        cell.value = h;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BLUE } };
        cell.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle', indent: i === 0 ? 1 : 0 };
        cell.border = allBorders;
      });
      sumHeaderRow.height = 22;

      categorySummary.forEach((agg, idx) => {
        const total = agg.totalAccounts;
        const paidPct = total > 0 ? agg.paidAccounts / total : 0;
        const row = sum.addRow([
          agg.category,
          agg.productCategories,
          agg.freeAccounts,
          agg.paidAccounts,
          total,
          paidPct,
        ]);
        row.height = 18;
        const banded = idx % 2 === 1;
        for (let c = 1; c <= 6; c++) {
          const cell = row.getCell(c);
          cell.border = allBorders;
          if (banded) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BAND } };
          cell.alignment = { horizontal: c === 1 ? 'left' : 'center', vertical: 'middle', indent: c === 1 ? 1 : 0 };
          if (c >= 2 && c <= 5) cell.numFmt = '#,##0';
          if (c === 6) cell.numFmt = '0.0%';
        }
        row.getCell(3).font = { color: { argb: FREE_TEXT } };
        row.getCell(4).font = { color: { argb: PAID_TEXT }, bold: true };
        row.getCell(5).font = { bold: true };
      });

      // Grand total = sum of category rows = unique accounts (already deduplicated).
      const totalPcCount = categorySummary.reduce((acc, a) => acc + a.productCategories, 0);
      const gTotal = totals.totalAccounts;
      const sumTotalRow = sum.addRow([
        'Total (Unique Accounts)',
        totalPcCount,
        totals.freeAccounts,
        totals.paidAccounts,
        gTotal,
        gTotal > 0 ? totals.paidAccounts / gTotal : 0,
      ]);
      sumTotalRow.height = 20;
      for (let c = 1; c <= 6; c++) {
        const cell = sumTotalRow.getCell(c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_FILL } };
        cell.font = { bold: true, size: 11 };
        cell.border = allBorders;
        cell.alignment = { horizontal: c === 1 ? 'left' : 'center', vertical: 'middle', indent: c === 1 ? 1 : 0 };
        if (c >= 2 && c <= 5) cell.numFmt = '#,##0';
        if (c === 6) cell.numFmt = '0.0%';
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const stamp = new Date().toISOString().slice(0, 10);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=category_wise_accounts_${stamp}.xlsx`,
      );
      res.send(buffer);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to generate category accounts report',
      });
    }
  }

  // Get Google Analytics data for a page
  @Post('analytics')
  @Roles('admin', 'category_manager', 'pepagora_manager', 'marketing_team')
  async getAnalytics(@Body() dto: AnalyticsRequestDto) {
    try {
      const { startDate, endDate } = this.analyticsService.getDateRange(
        dto.dateRange,
        dto.customStartDate,
        dto.customEndDate,
      );

      const pageViews = await this.analyticsService.getPageViews(
        dto.pageUrl,
        startDate,
        endDate,
      );

      console.log('[Marketing Controller] Analytics response:', {
        pageUrl: dto.pageUrl,
        pageViews,
        startDate,
        endDate,
      });

      return {
        statusCode: HttpStatus.OK,
        message: 'Analytics data fetched successfully',
        data: {
          pageViews,
          startDate,
          endDate,
          pageUrl: dto.pageUrl,
        },
      };
    } catch (error) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || 'Failed to fetch analytics data',
        data: null,
      };
    }
  }
}
