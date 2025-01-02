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
  IsOptional, // Use IsOptional instead of IsEmpty for optional fields
} from 'class-validator';

export class CreateCoupleDto {
  @IsString()
  @IsOptional()
  user_id?: string;

  @IsString()
  @IsOptional()
  product_id?: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  quantity: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsNotEmpty()
  discount_percentage: number;

  @IsString()
  @IsOptional()
  description?: string;

  @Transform(({ value }) => new Date(value))
  @IsDate()
  @IsNotEmpty()
  validUntil: Date;
}
