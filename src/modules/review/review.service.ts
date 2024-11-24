import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Review, ReviewDocument } from './schema/review.schema';
import { Model } from 'mongoose';
import { CreateReviewDto } from './dto/create-review';
import { ProductService } from '../product/product.service';

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
        user: createReviewDto.user_id,
        score: createReviewDto.score,
        comment: createReviewDto?.comment ?? '',
        reviewed: true,
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

  async getByProduct(product_id: string) {
    try {
      const reviews = await this.reviewModel
        .find({ product: product_id })
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
}
