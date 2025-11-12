import { IsArray, IsOptional, IsString,IsMongoId } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  main_cat_name: string;

  @IsOptional()
  @IsString()
  uniqueId?: string;

  @IsOptional()
  @IsString()
  liveUrl?: string;

  @IsOptional()
  @IsString()
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaKeyword?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

   @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })   // ✅ Ensures every element is a valid ObjectId
  mappedChildren?: string[];

}
