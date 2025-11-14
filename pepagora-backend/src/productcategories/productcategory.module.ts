import { Module } from '@nestjs/common';
import { ProductController } from './productcategory.controller';
import { ProductService } from './productcategory.service';

@Module({
  imports: [],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
