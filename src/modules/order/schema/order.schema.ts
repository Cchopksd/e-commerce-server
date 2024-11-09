import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Address } from 'src/modules/address/schemas/address.schema';
import { User } from 'src/modules/user/schemas/user.schema';
import { OrderStatus } from '../enums/status';
import { Payment } from 'src/modules/payment/schemas/payment.schema';

export type OrderDocument = HydratedDocument<Order>;

@Schema({ timestamps: true })
export class Order {
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

  @Prop()
  shipping_provider?: string;

  @Prop()
  Tracking_id?: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
