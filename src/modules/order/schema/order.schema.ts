import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Address } from '@/modules/address/schemas/address.schema';
import { User } from '@/modules/user/schemas/user.schema';
import { OrderStatus } from '../enums/status';
import { Payment } from '@/modules/payment/schemas/payment.schema';
import { ShippingProvider } from '../enums/shipping-provider';

export type OrderDocument = HydratedDocument<Order>;

@Schema({ timestamps: true })
export class Order {
  _id: string;
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user_id: User;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Payment' })
  payment_id: Payment;

  @Prop({
    type: String,
    enum: OrderStatus,
    default: OrderStatus.Unpaid,
    required: true,
  })
  status: OrderStatus;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Address' })
  shipping_address: Address;

  @Prop({ type: String, enum: ShippingProvider })
  shipping_provider?: ShippingProvider;

  @Prop({ type: String })
  tracking_id?: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
