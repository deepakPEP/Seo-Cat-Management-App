import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
// @ts-ignore - TypeScript resolver does not recognize .ts during lint phase
import { MarketingController } from './marketing.controller';
// @ts-ignore - TypeScript resolver does not recognize .ts during lint phase
import { MarketingService } from './marketing.service';
// @ts-ignore - TypeScript resolver does not recognize .ts during lint phase
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [
    // Create a separate MongoDB connection for analytics database
    MongooseModule.forRootAsync({
      connectionName: 'analytics',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('ANALYTICS_DB_URI_PROD'),
      }),
    }),
  ],
  controllers: [MarketingController],
  providers: [MarketingService, AnalyticsService],
  exports: [MarketingService, AnalyticsService],
})
export class MarketingModule {}
