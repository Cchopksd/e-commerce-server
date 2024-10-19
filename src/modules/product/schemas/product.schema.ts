import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;

@Schema()
export class Product {
  @Prop({ required: true })
  user_id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  images: string[];

  @Prop({ required: true })
  price: number;

  @Prop()
  discount: number;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true })
  detail: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  sale_out: number;
}

// Create the schema
export const ProductSchema = SchemaFactory.createForClass(Product);
