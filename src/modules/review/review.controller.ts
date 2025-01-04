import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review';
import { UpdateReviewDto } from './dto/update-review';

@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post('save-review')
  create(@Body() createReviewDto: CreateReviewDto) {
    return this.reviewService.create(createReviewDto);
  }

  @Put('update-review')
  update(@Body() updateReviewDto: UpdateReviewDto) {
    return this.reviewService.update(updateReviewDto);
  }

  @Get('by-product/:product_id')
  findByProduct(@Param('product_id') product_id: string) {
    return this.reviewService.getByProduct(product_id);
  }

  @Get('get-is-no-review-by-user/:user_id')
  getIsNoReviewByOrder(@Param('user_id') user_id: string) {
    return this.reviewService.getIsNoReviewByOrder(user_id);
  }
}
