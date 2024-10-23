import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Product } from 'src/modules/product/schemas/product.schema';
import { User } from 'src/modules/user/schemas/user.schema';
import { CartItem } from './cart_item.schema';

export type CartDocument = HydratedDocument<Cart>;

@Schema({ timestamps: true })
export class Cart {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  user_id: User;

  @Prop({ required: true })
  total_price: number;

  @Prop({ required: true })
  total_quantity: number;

  @Prop({ required: true })
  shipping_fee: number;
}

// Create the schema
export const CartSchema = SchemaFactory.createForClass(Cart);
