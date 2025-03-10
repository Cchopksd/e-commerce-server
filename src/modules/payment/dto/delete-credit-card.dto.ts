// create-payment.dto.ts
import {
  IsString,
  IsNumber,
  IsPositive,
  IsNotEmpty,
  IsInt,
  IsEmail,
  IsBoolean,
} from 'class-validator';

export class DeleteCreditCardDto {
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  @IsNotEmpty()
  cust_id: string;

  @IsString()
  @IsNotEmpty()
  card_id: string;
}
