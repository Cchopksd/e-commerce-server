import {
  IsOptional,
  IsString,
  IsArray,
  IsNumber,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @IsOptional()
  price?: number;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @IsOptional()
  discount?: number;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  detail?: string;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @IsOptional()
  amount?: number;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @IsOptional()
  sale_out?: number;
}

export class UpdateProductFormDataDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsNotEmpty()
  price: string;

  @IsNumber()
  @IsNotEmpty()
  discount: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  detail: string;

  @IsNumber()
  @IsNotEmpty()
  amount: string;

  @IsNumber()
  @IsNotEmpty()
  sale_out: string;
}
