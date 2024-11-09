import { IsNotEmpty, IsNumber, IsMongoId } from 'class-validator';

export class CreateOrderItemsDTO {
  @IsMongoId()
  @IsNotEmpty()
  order_id: string;

  @IsMongoId()
  @IsNotEmpty()
  product_info: string[];

  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @IsNumber()
  @IsNotEmpty()
  price_at_purchase: number;
}
