import { Body, Controller, Get } from '@nestjs/common';
import { OrderService } from './order.service';

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get('order-user')
  getUserOrder(
    @Body('user_id') user_id: string,
    @Body('order_status') order_status: string,
  ) {
    const result = this.orderService.getUserOrder(user_id, order_status);
    return result;
  }
}
