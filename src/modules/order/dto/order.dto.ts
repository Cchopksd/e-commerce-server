import {
  IsNotEmpty,
  IsEnum,
  IsMongoId,
  IsNumber,
  Min,
  IsString,
} from 'class-validator';
import { OrderStatus } from '../enums/status';

export class CreateOrderDto {
  @IsNotEmpty()
  @IsString()
  user_id: string;

  @IsNotEmpty()
  @IsString()
  payment_id: string;

  product_info: any;

  @IsNotEmpty()
  @IsString()
  shipping_address: string;

  @IsEnum(OrderStatus)
  order_status: OrderStatus;
}
