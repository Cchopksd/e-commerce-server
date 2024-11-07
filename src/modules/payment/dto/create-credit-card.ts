// create-payment.dto.ts
import {
  IsString,
  IsNumber,
  IsPositive,
  IsNotEmpty,
  IsInt,
  IsEmail,
} from 'class-validator';

export class CreateCreditCardDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  street1: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsInt()
  @IsNotEmpty()
  postal_code: number;

  @IsString()
  @IsNotEmpty()
  number: string;

  @IsNumber()
  expiration_month: number;

  @IsNumber()
  expiration_year: number;

  @IsNumber()
  security_code: number;
}
