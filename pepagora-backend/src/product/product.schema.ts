import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Subcategory } from '../subcategory/subcategory.schema';

@Schema({ timestamps: true })
export class Product extends Document {
  @Prop({ required: true })
  name: string;


  @Prop({ type: Types.ObjectId, ref: 'Subcategory', required: true })
  mappedParent?: Subcategory;
   
 @Prop()
 uniqueId?:string;
 @Prop()
 liveUrl?:string;  
  @Prop()
  metaTitle?: string;

  @Prop()
  metaKeyword?: string;

  @Prop()
  metaDescription?: string;
  
 @Prop()
  imageUrl?: string;

  @Prop({ type: String })
  description?: string;
  

}

export const ProductSchema = SchemaFactory.createForClass(Product);



