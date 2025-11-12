import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Subcategory, SubcategorySchema } from './subcategory.schema';
import { SubcategoryController } from './subcategory.controller';
import { SubcategoryService } from './subcategory.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Subcategory.name, schema: SubcategorySchema }])],
  controllers: [SubcategoryController],
  providers: [SubcategoryService],
  exports: [SubcategoryService,MongooseModule],
})
export class SubcategoryModule {}
