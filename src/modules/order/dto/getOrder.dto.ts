import {
  IsNotEmpty,
  IsEnum,
  IsMongoId,
  IsNumber,
  Min,
  IsString,
  IsOptional,
} from 'class-validator';
import { OrderStatus } from '../enums/status';
import { Transform } from 'class-transformer';

export class GetOrderDto {
  @IsNotEmpty()
  @IsMongoId()
  user_id: string;

  @IsEnum(OrderStatus)
  order_status: OrderStatus;

  @IsNumber()
  page: number;
}

export class GetAllOrderDto {
  @IsEnum(OrderStatus)
  order_status: OrderStatus;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @IsOptional()
  page: number;
}
