import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsUUID,
  IsString,
  Max,
  Min,
  IsDate,
  IsEmpty,
  IsOptional,
} from 'class-validator';

export class UpdateCoupleDto {
  @IsString()
  @IsOptional()
  user_id?: string;

  @IsString()
  @IsOptional()
  product_id?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  quantity?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsNotEmpty()
  @IsOptional()
  discount_percentage?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @Transform(({ value }) => new Date(value))
  @IsDate()
  @IsOptional()
  validUntil?: Date;
}
