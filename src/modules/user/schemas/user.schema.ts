import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}

@Schema({ timestamps: true })
export class User {
  @Prop()
  profile_image: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  first_name: string;

  @Prop({ required: true })
  last_name: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  age: number;

  @Prop({
    type: String,
    enum: UserRole,
    default: UserRole.GUEST,
    required: true,
  })
  role: UserRole;
}

// Create the schema
export const UserSchema = SchemaFactory.createForClass(User);
