import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Category } from '../category/category.schema';

@Schema({ timestamps: true })
export class Subcategory extends Document {
  @Prop({ required: true })
  sub_cat_name: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  mappedParent: Category;

    @Prop({ type: [Types.ObjectId], ref: 'Product', default: [] })
  mappedChildren: Types.ObjectId[];
   
  // @Prop({ type: Types.ObjectId, ref: 'Product' })
  // mappedChildren: Types.ObjectId[];

  @Prop()
  uniqueId?:string;
  @Prop()
  liveUrl?:string;  

  @Prop()
  metaTitle: string;

  @Prop()
  metaKeyword: string;

  @Prop()
  metaDescription: string;

 @Prop()
  sub_cat_img_url?: string;
  
  @Prop({ type: String })
  description?: string;
}

export const SubcategorySchema = SchemaFactory.createForClass(Subcategory);
