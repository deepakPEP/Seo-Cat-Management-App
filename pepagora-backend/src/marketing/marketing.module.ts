import { Module } from '@nestjs/common';
// @ts-ignore - TypeScript resolver does not recognize .ts during lint phase
import { MarketingController } from './marketing.controller';
// @ts-ignore - TypeScript resolver does not recognize .ts during lint phase
import { MarketingService } from './marketing.service';

@Module({
  controllers: [MarketingController],
  providers: [MarketingService],
  exports: [MarketingService],
})
export class MarketingModule {}
