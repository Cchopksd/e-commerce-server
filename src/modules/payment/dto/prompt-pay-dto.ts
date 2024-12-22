// create-payment.dto.ts
import {
  IsString,
  IsNumber,
  IsPositive,
  IsNotEmpty,
  IsInt,
} from 'class-validator';

export class PromptPayDto {
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  address: string;
}
