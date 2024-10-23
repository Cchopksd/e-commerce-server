import { IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class CreateCartItemDto {
  @IsNotEmpty()
  user_id: string;

  @IsNotEmpty()
  product_id: string;

  @IsNumber()
  @IsPositive()
  quantity: number;
}
