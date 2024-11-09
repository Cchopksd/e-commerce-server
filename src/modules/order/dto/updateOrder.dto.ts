import { IsNotEmpty, IsNumber, IsMongoId } from 'class-validator';
import { OrderStatus } from '../enums/status';

export class UpdateOrderItemsDTO {
  @IsMongoId()
  @IsNotEmpty()
  payment_id: string;

  @IsMongoId()
  @IsNotEmpty()
  status: OrderStatus;
}
