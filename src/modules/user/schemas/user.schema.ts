import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

@Schema({ timestamps: true })
export class User {
  _id: string;

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

  @Prop({
    required: true,
    validate: {
      validator: function (value: string) {
        return value.length === 10;
      },
      message: 'Phone number must be exactly 10 characters.',
    },
  })
  phone: string;

  @Prop({ required: true })
  age: number;

  @Prop({
    type: String,
    enum: UserRole,
    default: UserRole.USER,
    required: true,
  })
  role: UserRole;
}

// Create the schema
export const UserSchema = SchemaFactory.createForClass(User);
