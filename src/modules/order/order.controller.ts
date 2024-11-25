import { Body, Controller, Get, Post } from '@nestjs/common';
import { OrderService } from './order.service';
import { GetOrderDto } from './dto/getOrder.dto';

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('order-user')
  async getUserOrder(@Body() getOrderDto: GetOrderDto) {
    const result = await this.orderService.getUserOrder(getOrderDto);
    return result;
  }
}
