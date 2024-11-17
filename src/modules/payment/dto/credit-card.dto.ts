// create-payment.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

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
}
