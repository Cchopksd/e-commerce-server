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
import { ReviewService } from '../review/review.service';

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
    private reviewService: ReviewService,
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
            status: order_status,
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
      const { user_id, order_status, page } = getOrderDto;

      const query: any = { user_id };

      if (order_status && order_status !== 'all') {
        query.status =
          order_status === 'in-process'
            ? [OrderStatus.Paid, OrderStatus.InProcess]
            : order_status;
      }

      const limit = 10;
      const skip = (page - 1) * limit;

      const ordersQuery = await this.orderModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'shipping_address',
          match: { status: 'delivered' },
        })
        .exec();

      const totalOrders = await this.orderModel.countDocuments(query).exec();

      if (!ordersQuery || ordersQuery.length === 0) {
        return {
          message: 'No orders found for the given user and status',
          statusCode: HttpStatus.NOT_FOUND,
          detail: [],
        };
      }

      // Fetch related order items
      const orderItems = await this.orderItemsModel
        .find({
          order_id: { $in: ordersQuery.map((order) => order._id) },
        })
        .populate('product_id')
        .exec();

      // Group orders with items
      const groupedOrders = ordersQuery.map((order) => {
        const orderObj = order.toObject();
        const items = orderItems.filter(
          (item) => item.order_id._id.toString() === order._id.toString(),
        );
        return { ...orderObj, items };
      });

      return {
        message: 'Operation processed successfully',
        statusCode: HttpStatus.OK,
        detail: {
          total_items: totalOrders,
          total_page: Math.ceil(totalOrders / limit),
          page_now: page,
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

  async getOrderById(order_id: string, role: string) {
    const order = await this.orderModel
      .findById(order_id)
      .populate('user_id')
      .populate('payment_id')
      .populate('shipping_address')
      .exec();

    if (!order) {
      throw new Error('Order not found');
    }

    const orderItems = await this.orderItemsModel
      .find({ order_id: order._id })
      .populate('product_id')
      .exec();

    const response: any = {
      message: 'Operation processed successfully',
      statusCode: HttpStatus.OK,
      detail: {
        order_detail: order,
        products: orderItems,
      },
    };

    if (role === 'admin') {
      response.detail.payment_detail =
        await this.paymentService.findOneByChargeId(order.payment_id.charge_id);
    }

    return response;
  }

  async getOrderByUserId(user_id: string, role: string) {
    const order = await this.orderModel
      .findOne({ user_id })
      .populate('user_id')
      .populate('payment_id')
      .populate('shipping_address')
      .exec();

    if (!order) {
      throw new Error('Order not found');
    }

    const orderItems = await this.orderItemsModel
      .find({ order_id: order._id })
      .populate('product_id')
      .exec();

    const response: any = {
      message: 'Operation processed successfully',
      statusCode: HttpStatus.OK,
      detail: {
        order_detail: order,
        products: orderItems,
      },
    };

    if (role === 'admin') {
      response.detail.payment_detail =
        await this.paymentService.findOneByChargeId(order.payment_id.charge_id);
    }

    return response;
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
        [OrderStatus.Paid]: [OrderStatus.InProcess],
        [OrderStatus.InProcess]: [OrderStatus.Delivered],
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

      if (updateOrderDto.status === OrderStatus.Delivered) {
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

  async confirmOrderReceived(order_id: string) {
    try {
      const order = await this.orderModel.findOneAndUpdate(
        { _id: order_id },
        { status: OrderStatus.Successfully },
        { new: true },
      );

      if (!order) {
        throw new BadRequestException('Failed to update order');
      }

      const orderItems = await this.orderItemsModel.find({
        order_id: order._id,
      });

      const reviewPromises = orderItems.map((item) => {
        const reviewItem = {
          product_id: item.product_id.toString(),
          order_id: order._id,
          user_id: order.user_id.toString(),
          score: 0,
          comment: '',
        };

        return this.reviewService.create(reviewItem);
      });
      await Promise.all(reviewPromises);

      return {
        message: 'Operation processed successfully',
        statusCode: HttpStatus.OK,
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
