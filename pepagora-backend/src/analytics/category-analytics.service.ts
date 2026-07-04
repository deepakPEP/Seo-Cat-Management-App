import { Injectable } from '@nestjs/common';
import { SupplierAnalyticsService } from './supplier-analytics.service';

/** @deprecated Use SupplierAnalyticsService — kept for backward compatibility */
@Injectable()
export class CategoryAnalyticsService extends SupplierAnalyticsService {}
