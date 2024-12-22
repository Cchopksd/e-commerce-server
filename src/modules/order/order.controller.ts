import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { OrderService, OrderResponse } from './order.service';
import { GetAllOrderDto, GetOrderDto } from './dto/getOrder.dto';
import { Roles } from '../auth/decorator/role.decorator';
import { Role } from '../auth/enums/role.enum';
import { UpdateOrderDto } from './dto/updateOrder.dto';

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('order-user')
  async getUserOrder(@Body() getOrderDto: GetOrderDto) {
    const result = await this.orderService.getUserOrder(getOrderDto);
    return result;
  }

  @Roles(Role.ADMIN)
  @Get('all-order')
  async getAllOrder(@Query() getAllOrderDto: GetAllOrderDto) {
    const result = await this.orderService.getAllOrder(getAllOrderDto);
    return result;
  }

  @Get('order-by-id/:id')
  async getOrderById(@Param('id') order_id: string, @Req() req) {
    const user = req.user;
    const result = await this.orderService.getOrderById(order_id, user.role);
    return result;
  }

  @Patch('confirm-order-received')
  async confirmOrderReceived(@Body('order_id') order_id: string) {
    const result = await this.orderService.confirmOrderReceived(order_id);
    return result;
  }

  @Roles(Role.ADMIN)
  @Patch('admin/update-status/:id')
  async updateOrderStatus(
    @Param('id') order_id: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ): Promise<OrderResponse> {
    const result = await this.orderService.updateOrderStatus(
      order_id,
      updateOrderDto,
    );
    return result;
  }
}
