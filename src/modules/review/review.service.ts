import {
  BadRequestException,
  forwardRef,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Review, ReviewDocument } from './schema/review.schema';
import { Model } from 'mongoose';
import { CreateReviewDto } from './dto/create-review';
import { UpdateReviewDto } from './dto/update-review';

@Injectable()
export class ReviewService {
  constructor(
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
  ) {}

  async create(createReviewDto: CreateReviewDto) {
    try {
      const review = await this.reviewModel.create({
        product: createReviewDto.product_id,
        order: createReviewDto.order_id,
        user: createReviewDto.user_id,
        score: createReviewDto.score,
        comment: createReviewDto?.comment ?? '',
        reviewed: false,
      });

      return {
        message: 'Review created successfully',
        data: review,
      };
    } catch (error) {
      console.error('Error creating review:', error);
      throw new BadRequestException(
        'Failed to create review: ' + error.message,
      );
    }
  }

  async update(updateReviewDto: UpdateReviewDto) {
    try {
      const hasReviewed = await this.reviewModel.findById(
        updateReviewDto.review_id,
      );

      if (hasReviewed.reviewed == true) {
        throw new BadRequestException(
          'This review has already been submitted.',
        );
      }
      const reviewed = await this.reviewModel.updateOne(
        { _id: updateReviewDto.review_id },
        {
          user: updateReviewDto.user_id,
          score: updateReviewDto.score,
          comment: updateReviewDto?.comment ?? '',
          reviewed: true,
        },
      );
      return {
        message: 'Reviewed successfully',
        statusCode: HttpStatus.OK,
      };
    } catch (error) {
      console.error('Error update review:', error);
      throw new BadRequestException(
        'Failed to update review: ' + error.message,
      );
    }
  }

  async getByProduct(product_id: string) {
    try {
      const reviews = await this.reviewModel
        .find({ product: product_id, reviewed: true })
        .populate('user')
        .exec();

      return reviews;
    } catch (error) {
      console.error('Error fetching reviews:', error);
      throw new BadRequestException(
        'Failed to fetch reviews: ' + error.message,
      );
    }
  }

  async getIsNoReviewByOrder(user_id: string) {
    try {
      const review = await this.reviewModel
        .find({
          user: user_id,
          reviewed: false,
        })
        .exec();

      return review;
    } catch (error) {
      console.error('Error fetching reviews:', error);
      throw new BadRequestException(
        'Failed to fetch reviews: ' + error.message,
      );
    }
  }

  async getReviewByOrder({ order_id }: { order_id: string }) {
    try {
      const review = await this.reviewModel
        .find({
          order: order_id,
        })
        .exec();

      return {
        statusCode: HttpStatus.OK,
        message: 'Review fetched successfully',
        data: review,
      };
    } catch (error) {
      console.error('Error fetching reviews:', error);
      throw new BadRequestException(
        'Failed to fetch reviews: ' + error.message,
      );
    }
  }
}
