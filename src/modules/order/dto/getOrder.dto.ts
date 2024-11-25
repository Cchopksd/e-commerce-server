import {
  IsNotEmpty,
  IsEnum,
  IsMongoId,
  IsNumber,
  Min,
  IsString,
} from 'class-validator';
import { OrderStatus } from '../enums/status';

export class GetOrderDto {
  @IsNotEmpty()
  @IsMongoId()
  user_id: string;

  @IsEnum(OrderStatus)
  order_status: OrderStatus;
}
