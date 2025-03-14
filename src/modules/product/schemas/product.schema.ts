import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;

class image {
  split(arg0: string) {
    throw new Error('Method not implemented.');
  }
  image_url: string;
  public_id: string;
}

@Schema({ timestamps: true })
export class Product {
  _id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  images: image[];

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
