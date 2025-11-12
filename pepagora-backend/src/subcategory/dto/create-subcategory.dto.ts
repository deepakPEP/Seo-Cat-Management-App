import { IsString,IsArray, IsMongoId, IsOptional, IsUrl } from 'class-validator';

export class CreateSubcategoryDto {
  @IsString()
  sub_cat_name: string;

  @IsMongoId()
  mappedParent: string;

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
  @IsUrl({}, { message: 'Image URL must be a valid URL' })
  sub_cat_img_url?: string; // New field for S3 image URL

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    mappedChildren?: string[];

  @IsOptional()
  @IsString()
  description?: string;
}
