import { Module } from '@nestjs/common';
import { CategoryAnalyticsController } from './category-analytics.controller';
import { CategoryAnalyticsService } from './category-analytics.service';
import { SupplierAnalyticsService } from './supplier-analytics.service';
import { MarketingModule } from '../marketing/marketing.module';

@Module({
  imports: [MarketingModule],
  controllers: [CategoryAnalyticsController],
  providers: [
    SupplierAnalyticsService,
    { provide: CategoryAnalyticsService, useExisting: SupplierAnalyticsService },
  ],
  exports: [SupplierAnalyticsService, CategoryAnalyticsService],
})
export class CategoryAnalyticsModule {}
