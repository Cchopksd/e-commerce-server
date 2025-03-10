import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Product } from '@/modules/product/schemas/product.schema';
import { User } from '@/modules/user/schemas/user.schema';
import { CartItem } from './cart_item.schema';

export type CartDocument = HydratedDocument<Cart>;

@Schema({ timestamps: true })
export class Cart {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  user_id: User;
}

export const CartSchema = SchemaFactory.createForClass(Cart);
