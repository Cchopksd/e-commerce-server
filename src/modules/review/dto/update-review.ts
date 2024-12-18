import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsNotEmpty,
  IsBoolean,
} from 'class-validator';

export class UpdateReviewDto {
  @IsString()
  @IsNotEmpty()
  review_id: string;

  @IsString()
  @IsNotEmpty()
  user_id: string;

  @IsNumber()
  @IsNotEmpty()
  score: number;

  @IsString()
  @IsOptional()
  comment: string;
}
