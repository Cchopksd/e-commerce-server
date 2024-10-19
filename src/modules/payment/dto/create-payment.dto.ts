// create-payment.dto.ts
import { IsString, IsNumber, IsPositive, IsNotEmpty, IsInt } from 'class-validator';

export class CreatePaymentDto {
  @IsPositive()
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsNotEmpty()
  name: string;

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
