import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ReviewDocument = HydratedDocument<Review>;

@Schema({ timestamps: true })
export class Review {
  @Prop({ required: true })
  product_id: string;

  @Prop({ required: true })
  user_id: string;

  @Prop({ required: true })
  score: number;

  @Prop()
  comment: string;

  @Prop({ required: true, default: false })
  reviewed: boolean;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);
