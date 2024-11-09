// create-payment.dto.ts
import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsPositive,
  IsNotEmpty,
  IsInt,
  IsEmail,
  ValidateNested,
  IsArray,
  ArrayMinSize,
} from 'class-validator';

export class ItemDto {
  @IsString()
  @IsNotEmpty()
  product_id: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @IsString()
  @IsNotEmpty()
  category: string;
}

export class CreateSourceDto {
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  address: string;
}
