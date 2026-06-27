import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { NodeType, Top5Level } from '../types/analytics.types';

export class BreakdownQueryDto {
  @IsEnum(['category', 'subcategory', 'product_category'])
  nodeType: NodeType;

  @IsMongoId()
  nodeId: string;
}

export class Top5QueryDto {
  @IsEnum(['category', 'subcategory', 'product_category'])
  level: Top5Level;

  @IsOptional()
  @IsMongoId()
  parentId?: string;
}

export class ListCountsQueryDto {
  @IsEnum(['category', 'subcategory', 'product_category'])
  level: Top5Level;

  @IsOptional()
  @IsMongoId()
  parentId?: string;
}
