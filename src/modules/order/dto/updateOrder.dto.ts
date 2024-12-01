import {
  IsNotEmpty,
  IsNumber,
  IsMongoId,
  IsString,
  IsOptional,
} from 'class-validator';
import { OrderStatus } from '../enums/status';
import { ShippingProvider } from '../enums/shipping-provider';

export class UpdateOrderItemsDTO {
  @IsMongoId()
  @IsNotEmpty()
  payment_id: string;

  @IsMongoId()
  @IsNotEmpty()
  status: OrderStatus;
}

export class UpdateOrderDto {
  @IsString()
  @IsNotEmpty()
  status: OrderStatus;

  @IsString()
  @IsOptional()
  shipping_provider?: ShippingProvider;

  @IsString()
  @IsOptional()
  tracking_id?: string;
}
