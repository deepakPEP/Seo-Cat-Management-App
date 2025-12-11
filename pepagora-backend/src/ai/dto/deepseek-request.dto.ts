import { IsString, IsEnum, IsNotEmpty } from 'class-validator';

export enum PageType {
  Product = 'Product',
  Subcategory = 'Subcategory',
  Category = 'Category',
}

export class DeepSeekRequestDto {
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsEnum(PageType)
  pageType: PageType;
}

