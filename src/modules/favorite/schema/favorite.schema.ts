import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Product } from '@/modules/product/schemas/product.schema';
import { User } from '@/modules/user/schemas/user.schema';

export type FavoriteDocument = HydratedDocument<Favorite>;

@Schema({ timestamps: true })
export class Favorite {
  _id: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  user_id: User;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Product' })
  product_id: Product;

  @Prop({ required: true })
  is_favorite: boolean;
}

// Create the schema
export const FavoriteSchema = SchemaFactory.createForClass(Favorite);
