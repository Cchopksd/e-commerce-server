import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type CoupleDocument = HydratedDocument<Couple>;

@Schema({ timestamps: true })
export class Couple {
  _id: string;
}

// Create the schema
export const CoupleSchema = SchemaFactory.createForClass(Couple);
