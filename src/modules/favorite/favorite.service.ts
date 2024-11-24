import { HttpCode, Injectable } from '@nestjs/common';
import { Favorite, FavoriteDocument } from './schema/favorite.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateFavoriteDto } from './dto/createFavorite.dto';
import { validateObjectId } from 'src/helpers/objectIdHelper';

@Injectable()
export class FavoriteService {
  constructor(
    @InjectModel(Favorite.name) private favoriteModel: Model<FavoriteDocument>,
  ) {}

  async createFavorite(createFavoriteDto: CreateFavoriteDto) {
    validateObjectId(createFavoriteDto.user_id, 'User');
    validateObjectId(createFavoriteDto.product_id, 'Product');

    try {
      const favorite = await this.favoriteModel.create(createFavoriteDto);
      return {
        message: 'Favorite created successfully',
        statusCode: 200,
      };
    } catch (error) {
      return {
        message: 'Failed to create favorite',
        statusCode: 500,
        error: error.message,
      };
    }
  }

  async getFavoriteByUser(user_id: string) {
    try {
      const favorite = await this.favoriteModel.find({ user_id });
      return {
        message: 'Favorite fetched successfully',
        statusCode: 200,
        favorite,
      };
    } catch (error) {
      return {
        message: 'Failed to fetch favorites',
        statusCode: 500,
        error: error.message,
      };
    }
  }

  async getFavoriteByUserAndProduct({
    product_id,
    user_id,
  }: {
    product_id: string;
    user_id: string;
  }) {
    try {
      const favorite = await this.favoriteModel
        .findOne({
          user_id,
          product_id,
        })
        .select('is_favorite');
      
      return {
        message: 'Favorite fetched successfully',
        statusCode: 200,
        detail: favorite ? favorite.is_favorite : false,
      };
    } catch (error) {
      return {
        message: 'Failed to fetch favorites',
        statusCode: 500,
        error: error.message,
      };
    }
  }

  async getFavoriteByProduct(product_id: string) {
    try {
      const favorite = await this.favoriteModel.find({ product_id });
      return {
        message: 'Favorite fetched successfully',
        statusCode: 200,
        detail: favorite,
      };
    } catch (error) {
      return {
        message: 'Failed to fetch favorites',
        statusCode: 500,
        error: error.message,
      };
    }
  }
}
