import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ProductService } from '../product/product.service';
import { CreateOrderDto } from './dto/order.dto';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Order, OrderDocument } from './schema/order.schema';
import { CreateOrderItemsDTO } from './dto/orderItems.dto';
import { AddressService } from '../address/address.service';
import { OrderItems, OrderItemsDocument } from './schema/orderItems.schema';
import { UpdateOrderItemsDTO } from './dto/updateOrder.dto';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(OrderItems.name)
    private orderItemsModel: Model<OrderItemsDocument>,
  ) {}

  async createOrder(createOrderDto: CreateOrderDto, session: any) {
    const {
      user_id,
      payment_id,
      shipping_address,
      order_status,
      product_info,
    } = createOrderDto;

    try {
      const order = await this.orderModel.create(
        [
          {
            user_id,
            payment_id,
            order_status,
            shipping_address,
          },
        ],
        { session: session },
      );

      if (!order || !order[0]) {
        throw new Error('Failed to create order');
      }

      const orderItemsToCreate = product_info.map((item) => ({
        order_id: order[0]._id.toString(),
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_purchase: item.price_at_purchase,
      }));

      const orderItems = await this.orderItemsModel.create(orderItemsToCreate, {
        session: session,
      });

      if (!orderItems || orderItems.length !== product_info.length) {
        throw new Error('Failed to create all order items');
      }

      return {
        ...order[0].toObject(),
        items: orderItems.map((item) => item.toObject()),
      };
    } catch (error) {
      console.log(error);
      throw new error(error);
    }
  }

  async updateOrder(updateOrderDto: UpdateOrderItemsDTO) {
    try {
      const order = this.orderModel
        .findOneAndUpdate(
          {
            payment_id: updateOrderDto.payment_id,
          },
          { $set: { status: updateOrderDto.status } },
          { new: true },
        )
        .populate('payment_id')
        .exec();
      if (!order) {
        throw new Error('Order not found');
      }
      return order;
    } catch (error) {
      console.log(error);
      throw new error(error);
    }
  }

  async getUserOrder(user_id: string, order_status: string) {
    try {
      const orders = await this.orderModel
        .find({
          user_id: user_id,
          status: { $in: order_status },
        })
        .exec();

      const orderItems = await this.orderItemsModel
        .find({
          order_id: { $in: orders.map((order) => order._id) },
        })
        .populate('order_id')
        .populate('product_id')
        .exec();

      if (!orders || orders.length === 0) {
        return {
          message: 'No orders found for the given user and status',
          statusCode: HttpStatus.NOT_FOUND,
          detail: [],
        };
      }

      return {
        message: 'Operation processed successfully',
        statusCode: HttpStatus.OK,
        detail: orderItems,
      };
    } catch (error) {
      console.error('Error in getUserOrder:', error);

      // Handle generic MongoDB or internal errors
      if (error instanceof Error) {
        throw new InternalServerErrorException({
          message: 'Get order failed',
          error: error.message,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }
    }
  }
}
