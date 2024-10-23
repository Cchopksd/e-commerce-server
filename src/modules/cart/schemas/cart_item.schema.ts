import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Product } from 'src/modules/product/schemas/product.schema';
import { Cart } from './cart.schema';
import { User } from 'src/modules/user/schemas/user.schema';

export type CartItemDocument = HydratedDocument<CartItem>;

@Schema({ timestamps: true })
export class CartItem {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user_id: User;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Product' })
  product_id: Product;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  unit_price: number;

  @Prop({ required: true })
  subtotal: number;
}

// Create the schema
export const CartItemSchema = SchemaFactory.createForClass(CartItem);
