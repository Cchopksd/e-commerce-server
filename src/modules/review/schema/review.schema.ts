import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from 'src/modules/user/schemas/user.schema';

export type ReviewDocument = HydratedDocument<Review>;

@Schema({ timestamps: true })
export class Review {
  @Prop({ required: true })
  product: string;

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
