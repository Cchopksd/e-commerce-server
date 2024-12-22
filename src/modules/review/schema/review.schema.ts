import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Order } from 'src/modules/order/schema/order.schema';
import { Product } from 'src/modules/product/schemas/product.schema';
import { User } from 'src/modules/user/schemas/user.schema';

export type ReviewDocument = HydratedDocument<Review>;

@Schema({ timestamps: true })
export class Review {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  })
  product: Product;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  })
  order: Order;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  user: User;

  @Prop({ required: true })
  score: number;

  @Prop()
  comment: string;

  @Prop({ required: true, default: false })
  reviewed: boolean;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);
