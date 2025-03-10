import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Product } from '@/modules/product/schemas/product.schema';
import { Order } from './order.schema';

export type OrderItemsDocument = HydratedDocument<OrderItems>;

@Schema({ timestamps: true })
export class OrderItems {
  _id: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Order' })
  order_id: Order;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Product' })
  product_id: Product;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  price_at_purchase: number;
}

export const OrderItemsSchema = SchemaFactory.createForClass(OrderItems);
