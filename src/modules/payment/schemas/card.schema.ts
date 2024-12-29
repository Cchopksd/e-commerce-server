import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CardDocument = HydratedDocument<Card>;

@Schema({ timestamps: true })
export class Card {
  @Prop({ required: true })
  user_id: string;

  @Prop({ required: true })
  cust_id: string;

  @Prop({ required: true })
  default: boolean;
}

export const CardSchema = SchemaFactory.createForClass(Card);
