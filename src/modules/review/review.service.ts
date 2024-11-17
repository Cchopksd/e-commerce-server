import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Review, ReviewDocument } from './schema/review.schema';
import { Model } from 'mongoose';
import { CreateReviewDto } from './dto/create-review';
import { ProductService } from '../product/product.service';

@Injectable()
export class ReviewService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    private readonly productService: ProductService,
  ) {}

  async create(CreateReviewDto: CreateReviewDto) {
    try {
      const isHaveProduct = await this.productService.findOne(
        CreateReviewDto.product_id,
      );

      if (!isHaveProduct) {
        throw new BadRequestException();
      }
      const review = await this.reviewModel.create({
        ...CreateReviewDto,
        reviewed: true,
      });

      return {
        message: 'Review created successfully',
        data: review,
      };
    } catch (error) {
      console.error('Error creating review:', error);
      throw new Error('Failed to create review: ' + error.message);
    }
  }
}
