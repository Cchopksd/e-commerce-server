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

    const isHasFavorite = await this.favoriteModel.findOne({
      user_id: createFavoriteDto.user_id,
      product_id: createFavoriteDto.product_id,
    });

    if (isHasFavorite) {
      try {
        const favorite = await this.favoriteModel.updateOne(
          { _id: new Object(isHasFavorite._id) },
          { $set: { is_favorite: createFavoriteDto.is_favorite } },
        );
        return {
          message: 'Favorite updated successfully',
          statusCode: 200,
        };
      } catch (error) {
        return {
          message: 'Failed to update favorite',
          statusCode: 500,
          error: error.message,
        };
      }
    }
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
      const favorite = await this.favoriteModel
        .find({ user_id })
        .populate('product_id');
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

  async getFavoriteByUserAndProducts({
    product_ids,
    user_id,
  }: {
    product_ids: string[];
    user_id: string;
  }) {
    try {
      const favorites = await this.favoriteModel
        .find({
          user_id,
          product_id: { $in: product_ids },
        })
        .select('product_id is_favorite');

      const result = product_ids.map((id) => ({
        product_id: id,
        is_favorite: favorites.some(
          (f) => f.product_id.toString() === id && f.is_favorite,
        ),
      }));

      return {
        message: 'Favorites fetched successfully',
        statusCode: 200,
        detail: result,
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
