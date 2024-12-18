import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { ProductService } from '../product/product.service';
import { CreateOrderDto } from './dto/order.dto';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Order, OrderDocument } from './schema/order.schema';
import { CreateOrderItemsDTO } from './dto/orderItems.dto';
import { AddressService } from '../address/address.service';
import { OrderItems, OrderItemsDocument } from './schema/orderItems.schema';
import { UpdateOrderDto, UpdateOrderItemsDTO } from './dto/updateOrder.dto';
import { GetAllOrderDto, GetOrderDto } from './dto/getOrder.dto';
import { PaymentService } from '../payment/payment.service';
import { OrderStatus } from './enums/status';
import { ShippingProvider } from './enums/shipping-provider';

export interface OrderResponse {
  message: string;
  statusCode: number;
  detail: any;
}

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(OrderItems.name)
    private orderItemsModel: Model<OrderItemsDocument>,
    @Inject(forwardRef(() => PaymentService))
    private readonly paymentService: PaymentService,
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

  async getOrderItems(order_id: string) {
    try {
      const orderItems = this.orderItemsModel
        .find({ order_id: order_id })
        .exec();
      if (!orderItems) {
        throw new Error('Order not found');
      }
      return orderItems;
    } catch (error) {
      console.log(error);
      throw new error(error);
    }
  }

  async getUserOrder(getOrderDto: GetOrderDto) {
    try {
      const query: any = { user_id: getOrderDto.user_id };

      if (getOrderDto.order_status && getOrderDto.order_status !== 'all') {
        query.status = getOrderDto.order_status;
      }

      const limit = 10;

      const skip = (getOrderDto.page - 1) * limit;

      let ordersQuery = this.orderModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      ordersQuery = ordersQuery.populate({
        path: 'shipping_address',
        match: { status: 'delivered' },
      });

      const totalOrders = await this.orderModel.countDocuments(query).exec();

      const orders = await ordersQuery.exec();

      if (!orders || orders.length === 0) {
        return {
          message: 'No orders found for the given user and status',
          statusCode: HttpStatus.NOT_FOUND,
          detail: [],
        };
      }

      const orderItems = await this.orderItemsModel
        .find({
          order_id: { $in: orders.map((order) => order._id) },
        })
        .populate('product_id')
        .exec();

      const groupedOrders = orders.map((order) => {
        const orderObj = order.toObject();
        const items = orderItems.filter(
          (item) => item.order_id._id.toString() === order._id.toString(),
        );
        return {
          ...orderObj,
          items,
        };
      });

      return {
        message: 'Operation processed successfully',
        statusCode: HttpStatus.OK,
        detail: {
          total_items: totalOrders,
          total_page: Math.ceil(totalOrders / limit),
          page_now: getOrderDto.page,
          orders: groupedOrders,
        },
      };
    } catch (error) {
      console.error('Error in getUserOrder:', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException({
        message: 'Get order failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async getOrderById(order_id: string) {
    const orders = await this.orderModel
      .findById(order_id)
      .populate('user_id')
      .populate('payment_id')
      .populate('shipping_address')
      .exec();

    const payment = await this.paymentService.findOneByChargeId(
      orders.payment_id.charge_id,
    );

    const orderItems = await this.orderItemsModel
      .find({
        order_id: { $in: orders._id },
      })
      .populate('product_id')
      .exec();

    return {
      message: 'Operation processed successfully',
      statusCode: HttpStatus.OK,
      detail: {
        order_detail: orders,
        payment_detail: payment,
        products: orderItems,
      },
    };
  }

  async getAllOrder(getAllOrderDto: GetAllOrderDto) {
    const query: any = {};

    if (getAllOrderDto.order_status && getAllOrderDto.order_status !== 'all') {
      query.status = getAllOrderDto.order_status;
    }

    const limit = 10;

    const skip = (Number(getAllOrderDto.page) - 1) * limit;

    const orders = await this.orderModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const totalOrders = await this.orderModel.countDocuments(query).exec();

    if (!orders || orders.length === 0) {
      return {
        message: 'No orders found for the given user and status',
        statusCode: HttpStatus.NOT_FOUND,
        detail: [],
      };
    }

    const orderItems = await this.orderItemsModel
      .find({
        order_id: { $in: orders.map((order) => order._id) },
      })
      .populate('product_id')
      .exec();

    const groupedOrders = orders.map((order) => {
      const orderObj = order.toObject();
      const items = orderItems.filter(
        (item) => item.order_id._id.toString() === order._id.toString(),
      );
      return {
        ...orderObj,
        items,
      };
    });

    return {
      message: 'Operation processed successfully',
      statusCode: HttpStatus.OK,
      detail: {
        total_items: totalOrders,
        total_page: Math.ceil(totalOrders / limit),
        page_now: Number(getAllOrderDto.page),
        orders: groupedOrders,
      },
    };
  }

  async updateOrderStatus(
    order_id: string,
    updateOrderDto: UpdateOrderDto,
  ): Promise<OrderResponse> {
    if (
      !Object.values(OrderStatus).includes(updateOrderDto.status as OrderStatus)
    ) {
      throw new BadRequestException('Invalid status');
    }

    try {
      const order = await this.orderModel.findById(order_id);

      if (!order) {
        throw new BadRequestException('Order not found');
      }

      if (order.status === updateOrderDto.status) {
        throw new BadRequestException('Order already has this status');
      }

      if (updateOrderDto.status === OrderStatus.Cancelled) {
        const updatedOrder = await this.orderModel.findByIdAndUpdate(
          order_id,
          { status: updateOrderDto.status },
          { new: true },
        );

        if (!updatedOrder) {
          throw new BadRequestException('Failed to update order');
        }

        return {
          message: 'Operation processed successfully',
          statusCode: HttpStatus.OK,
          detail: updatedOrder,
        };
      }

      const validTransitions = {
        [OrderStatus.Unpaid]: [OrderStatus.Paid],
        [OrderStatus.Paid]: [OrderStatus.Preparing],
        [OrderStatus.Preparing]: [OrderStatus.Delivering],
        [OrderStatus.Delivering]: [OrderStatus.Delivered],
        [OrderStatus.Delivered]: [OrderStatus.Successfully],
        [OrderStatus.Refund]: [OrderStatus.Cancelled, OrderStatus.Refunded],
      };

      if (
        !validTransitions[order.status] ||
        !validTransitions[order.status].includes(
          updateOrderDto.status as OrderStatus,
        )
      ) {
        throw new BadRequestException(
          `Cannot transition from ${order.status} to ${updateOrderDto.status}`,
        );
      }

      if (updateOrderDto.status === OrderStatus.Delivering) {
        if (!updateOrderDto.shipping_provider || !updateOrderDto.tracking_id) {
          throw new BadRequestException(
            'Shipping provider and tracking id are required',
          );
        }

        if (
          !Object.values(ShippingProvider).includes(
            updateOrderDto.shipping_provider as ShippingProvider,
          )
        ) {
          throw new BadRequestException('Invalid shipping provider');
        }

        const updatedOrder = await this.orderModel.findByIdAndUpdate(
          order_id,
          {
            status: updateOrderDto.status,
            shipping_provider: updateOrderDto.shipping_provider,
            Tracking_id: updateOrderDto.tracking_id,
          },
          { new: true },
        );

        if (!updatedOrder) {
          throw new BadRequestException('Failed to update order');
        }

        return {
          message: 'Operation processed successfully',
          statusCode: HttpStatus.OK,
          detail: updatedOrder,
        };
      }

      const updatedOrder = await this.orderModel.findByIdAndUpdate(
        order_id,
        { status: updateOrderDto.status },
        { new: true },
      );

      if (!updatedOrder) {
        throw new BadRequestException('Failed to update order');
      }

      return {
        message: 'Operation processed successfully',
        statusCode: HttpStatus.OK,
        detail: updatedOrder,
      };
    } catch (error) {
      console.error('Error updating order status:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException({
        message: 'Failed to update order status',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
