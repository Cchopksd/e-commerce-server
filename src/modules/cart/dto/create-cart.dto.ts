import { IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class CreateCartDto {
  @IsNotEmpty()
  user_id: string; 

  @IsNumber()
  @IsPositive()
  total_price: number;

  @IsNumber()
  @IsPositive()
  shipping_fee: number;
}
