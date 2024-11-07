// payment.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PaymentDocument = Payment & Document;

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCESSFUL = 'successful',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

@Schema({ timestamps: true })
export class Payment {
  @Prop({ required: true })
  charge_id: string;

  @Prop({ required: true })
  user_id: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  status: string;

  @Prop()
  payment_method: string; // promptpay, installment, credit_card, truemoney

  @Prop()
  expires_at?: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
