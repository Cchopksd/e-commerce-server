import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Product } from 'src/modules/product/schemas/product.schema';
import { User } from 'src/modules/user/schemas/user.schema';

export type CoupleDocument = HydratedDocument<Couple>;

@Schema({ timestamps: true })
export class Couple {
  _id: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  user_id: User;

  @Prop({ type: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' } })
  product_id: Product;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true, min: 0 })
  quantity: number;

  @Prop({ required: true, min: 0, max: 100 })
  discount_percentage: number;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: true })
  validUntil: Date;

  @Prop({ default: true })
  isActive: boolean;
}

export const CoupleSchema = SchemaFactory.createForClass(Couple);
