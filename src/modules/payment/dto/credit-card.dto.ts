// create-payment.dto.ts
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreatePayWithCreditCardDto {
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  @IsNotEmpty()
  customer_id: string;

  @IsString()
  @IsNotEmpty()
  address_id: string;

  @IsString()
  @IsNotEmpty()
  card_id: string;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsOptional()
  couple_name?: string;
}
