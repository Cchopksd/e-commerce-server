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

class ItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

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
  @IsPositive()
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  items: ItemDto[];
}
