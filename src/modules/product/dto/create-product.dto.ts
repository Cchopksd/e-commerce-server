import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsNotEmpty,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  price: string;

  @IsOptional()
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
