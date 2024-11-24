import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review';

@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post('save-review')
  create(@Body() createReviewDto: CreateReviewDto) {
    return this.reviewService.create(createReviewDto);
  }

  @Get('by-product/:product_id')
  findByProduct(@Param('product_id') product_id: string) {
    return this.reviewService.getByProduct(product_id);
  }
}
