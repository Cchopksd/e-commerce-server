import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsNotEmpty,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  @Type(() => Number)
  @Min(20, { message: 'Price must be greater than or equal 20.' })
  price: string;

  @IsOptional()
  @Type(() => Number)
  @Min(20, { message: 'Discount must be greater than or equal 20.' })
  discount?: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  detail: string;

  @IsNotEmpty()
  amount: string;

  @IsNotEmpty()
  sale_out: string;
}
