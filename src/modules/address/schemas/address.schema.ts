import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

import { User } from '../../user/schemas/user.schema';

export type AddressDocument = HydratedDocument<Address>;

@Schema({ timestamps: true })
export class Address {
  @Prop({ required: true })
  name: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true })
  user_id: User;

  @Prop({ required: true })
  province: string;

  @Prop({ required: true })
  district: string;

  @Prop({ required: true })
  subdistrict: string;

  @Prop({ required: true })
  post_id: number;

  @Prop({ required: true })
  detail: string;

  @Prop({ required: true, default: false })
  default: boolean;
}

export const AddressSchema = SchemaFactory.createForClass(Address);
