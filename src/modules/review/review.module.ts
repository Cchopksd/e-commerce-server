import { forwardRef, Module } from '@nestjs/common';
import { ReviewController } from './review.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Review, ReviewSchema } from './schema/review.schema';
import { ReviewService } from './review.service';
import { ProductModule } from '../product/product.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Review.name, schema: ReviewSchema }]),
    forwardRef(() => ProductModule),
  ],
  controllers: [ReviewController],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule {}
