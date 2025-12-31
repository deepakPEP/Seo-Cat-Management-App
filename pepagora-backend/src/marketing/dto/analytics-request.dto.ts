import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DateRangeOption {
  PREVIOUS_WEEK = 'previous_week',
  PREVIOUS_MONTH = 'previous_month',
  PREVIOUS_YEAR = 'previous_year',
  CUSTOM = 'custom',
}

export class AnalyticsRequestDto {
  @ApiProperty({
    description: 'The page URL to fetch analytics for',
    example: 'https://www.pepagora.com/c/industrial-equipment-machinery-mcscfd059v',
  })
  @IsString()
  pageUrl: string;

  @ApiProperty({
    description: 'Date range option',
    enum: DateRangeOption,
    default: DateRangeOption.PREVIOUS_MONTH,
  })
  @IsEnum(DateRangeOption)
  dateRange: DateRangeOption;

  @ApiPropertyOptional({
    description: 'Custom start date (YYYY-MM-DD). Required if dateRange is "custom"',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsString()
  customStartDate?: string;

  @ApiPropertyOptional({
    description: 'Custom end date (YYYY-MM-DD). Required if dateRange is "custom"',
    example: '2024-01-31',
  })
  @IsOptional()
  @IsString()
  customEndDate?: string;
}

