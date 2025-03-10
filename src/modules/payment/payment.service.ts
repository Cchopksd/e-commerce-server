import {
  BadRequestException,
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import * as Omise from 'omise';
import { ConfigService } from '@nestjs/config';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';

import { Payment, PaymentDocument } from './schemas/payment.schema';
import { Card, CardDocument } from './schemas/card.schema';

import { OrderStatus } from '../order/enums/status';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import {
  CreateCreditCardDto,
  CreateNewCreditCardDto,
} from './dto/create-credit-card.dto';
import { ItemDto } from './dto/source.dto';

import { CartService } from '../cart/cart.service';
import { ProductService } from '../product/product.service';
import { OrderService } from '../order/order.service';
import {
  CreatePayWithCreditCardDto,
  PayWithCreditCardAgainDto,
} from './dto/credit-card.dto';
import { PromptPayDto } from './dto/prompt-pay-dto';
import { CoupleService } from '../couple/couple.service';

@Injectable()
export class PaymentService {
  private omise: any;
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Card.name) private cardModel: Model<CardDocument>,
    private cartService: CartService,
    private productService: ProductService,
    @Inject(forwardRef(() => OrderService))
    private orderService: OrderService,
    private configService: ConfigService,
    private coupleService: CoupleService,
    @InjectConnection() private readonly connection: Connection,
  ) {
    this.omise = Omise({
      publicKey: this.configService.get<string>('OMISE_PUBLIC_KEY'),
      secretKey: this.configService.get<string>('OMISE_SECRET_KEY'),
    });
  }

  async creditCard(createPayWithCreditCardDto: CreatePayWithCreditCardDto) {
    try {
      const transactionSession = await this.connection.startSession();
      transactionSession.startTransaction();
      let cartId: string = '';

      const cartItems = await this.cartService.getItemsOnCart(
        createPayWithCreditCardDto.user_id,
      );
      if (cartItems.length === 0) {
        throw new BadRequestException('Cart is empty');
      }

      const item = cartItems.map((product) => {
        const productDetails = product.product_id;

        if (!productDetails) {
          throw new BadRequestException('Product not found for item in cart');
        }

        if (product.quantity > productDetails.amount) {
          throw new BadRequestException(
            `Product "${productDetails.name}" exceeds available stock. Only ${productDetails.amount} left.`,
          );
        }

        cartId = product.cart_id.toString();
        return {
          name: productDetails.name,
          amount: productDetails.discount || productDetails.price,
          quantity: product.quantity,
          category: productDetails.category,
        };
      });

      // Step 2: Calculate total amount
      let totalAmount = Math.floor(
        item.reduce((sum, item) => sum + item.amount * 100 * item.quantity, 0),
      );

      if (createPayWithCreditCardDto.couple_name) {
        const couple = await this.coupleService.getCoupleById(
          createPayWithCreditCardDto.couple_name,
        );

        if (!couple) {
          throw new NotFoundException('Couple not found');
        }

        if (couple.validUntil < new Date()) {
          throw new BadRequestException('This couple is expired');
        }

        if (couple.quantity <= 0) {
          throw new BadRequestException(
            'This couple has reached maximum usage limit',
          );
        }

        if (
          couple.user_id &&
          couple.user_id._id.toString() !== createPayWithCreditCardDto.user_id
        ) {
          throw new BadRequestException(
            'This couple is not associated with the given user.',
          );
        }

        item.map((item) => {
          if (item.category !== couple.category) {
            throw new BadRequestException(
              'Couple is not support with this item: ' + item.name,
            );
          }
        });

        await this.coupleService.updateCouple({
          id: couple._id.toString(),
          quantity: couple.quantity - 1,
        });

        const discountAmount = (couple.discount_percentage / 100) * totalAmount;
        totalAmount = totalAmount - discountAmount;
      }

      // Step 3: Create payment
      const creditCard = await this.omise.charges.create({
        amount: totalAmount,
        currency: 'thb',
        customer: createPayWithCreditCardDto.customer_id,
        card: createPayWithCreditCardDto.card_id,
      });

      // Step 4: Update product stock
      for (const product of cartItems) {
        const productDetails = product.product_id;
        await this.productService.update(
          productDetails._id,
          {
            amount: productDetails.amount - product.quantity,
            sale_out: (productDetails.sale_out || 0) + product.quantity,
          },
          transactionSession,
        );
      }

      // Step 6: Record the payment in the database
      const payment = await this.paymentModel.create(
        [
          {
            charge_id: creditCard.id,
            user_id: createPayWithCreditCardDto.user_id,
            amount: creditCard?.amount,
            status:
              creditCard?.status === 'successful'
                ? OrderStatus.Paid
                : OrderStatus.Unpaid,
            payment_method: 'creditCard',
            expires_at: creditCard.expires_at,
          },
        ],
        { session: transactionSession }, // Pass session explicitly here
      );

      // Step 8: Create order
      const prepareOrder = {
        user_id: createPayWithCreditCardDto.user_id,
        payment_id: payment[0]._id.toString(),
        shipping_address: createPayWithCreditCardDto.address_id,
        order_status:
          creditCard?.status === 'successful'
            ? OrderStatus.Paid
            : OrderStatus.Unpaid,
        product_info: cartItems.map((item: any) => ({
          product_id: item.product_id._id,
          quantity: item.quantity,
          price_at_purchase: item.product_id.discount || item.product_id.price,
        })),
      };

      const createOrder = await this.orderService.createOrder(
        prepareOrder,
        transactionSession,
      );

      // Step 9: Destroy cart
      const destroyCart = await this.cartService.destroyCart(
        cartId,
        transactionSession,
      );

      if (destroyCart.statusCode !== HttpStatus.NO_CONTENT) {
        throw new Error('Failed to clear cart');
      }

      // Step 10: Commit transaction
      await transactionSession.commitTransaction();

      return {
        message: 'Payment has been created',
        statusCode: HttpStatus.CREATED,
        detail: {
          order_id: createOrder._id,
          chargeId: creditCard.id,
          amount: creditCard?.amount,
          status:
            creditCard?.status === 'successful'
              ? OrderStatus.Paid
              : OrderStatus.Unpaid,
          return_uri: creditCard.return_uri,
          expires_at: creditCard.expires_at,
        },
      };
    } catch (error) {
      console.error('Error Pay with credit card:', error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error.code && error.message) {
        throw new InternalServerErrorException({
          message: 'Credit card failed due to Omise API error',
          error: error.message,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      throw new InternalServerErrorException({
        message: 'Credit card failed due to an unexpected error',
        error: error.message || 'Unknown error occurred',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async payWithCreditCardAgain({
    creditPaymentDto,
  }: {
    creditPaymentDto: PayWithCreditCardAgainDto;
  }) {
    try {
      const orderDetail = await this.orderService.getOrderById(
        creditPaymentDto.order_id,
        'user',
      );
      const orderItems = await this.orderService.getOrderItems(
        orderDetail.detail.order_detail._id.toString(),
      );

      // Step 2: Calculate total amount
      let totalAmount = Math.floor(
        orderItems.reduce(
          (sum, item) => sum + item.price_at_purchase * 100 * item.quantity,
          0,
        ),
      );

      // Step 3: Create payment
      const creditCard = await this.omise.charges.create({
        amount: totalAmount,
        currency: 'thb',
        customer: creditPaymentDto.customer_id,
        card: creditPaymentDto.card_id,
      });

      if (creditCard.status === 'failed') {
        throw new BadRequestException(creditCard.failure_message);
      }

      if (creditCard.status === 'successful') {
        await this.orderService.updateOrder({
          payment_id: orderDetail.detail.order_detail.payment_id,
          status: OrderStatus.Paid,
        });

        return {
          message: 'payment has been paid successfully',
          statusCode: HttpStatus.OK,
          detail: {
            order_id: orderDetail.detail.order_detail._id,
            amount: creditCard.amount,
            status: creditCard.status,
            return_uri: creditCard.return_uri,
          },
        };
      }
    } catch (error) {
      console.error('Error Pay with credit card:', error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error.code && error.message) {
        throw new InternalServerErrorException({
          message: 'Credit card failed due to Omise API error',
          error: error.message,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      throw new InternalServerErrorException({
        message: 'Credit card failed due to an unexpected error',
        error: error.message || 'Unknown error occurred',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async installment(card: any) {
    try {
      const charge = await this.omise.charges.create({
        amount: card.amount,
        currency: 'thb',
        source: card.source,
        installment_terms: card.terms,
      });

      return {
        message: 'Installment payment created successfully',
        statusCode: HttpStatus.CREATED,
        detail: charge,
      };
    } catch (error) {
      console.error('Error in installment payment:', error);
      throw new InternalServerErrorException({
        message: 'Installment payment failed',
        error: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async promptPay(createSourceDto: PromptPayDto) {
    const transactionSession = await this.connection.startSession();
    transactionSession.startTransaction();
    let cartId: string = '';

    try {
      // Step 1: Get items from the cart
      const cartItems = await this.cartService.getItemsOnCart(
        createSourceDto.user_id,
      );
      if (cartItems.length === 0) {
        throw new BadRequestException('Cart is empty');
      }

      const itemDto = cartItems.map((product) => {
        const productDetails = product.product_id; // Assuming this contains full product details

        if (!productDetails) {
          throw new BadRequestException('Product not found for item in cart');
        }

        if (product.quantity > productDetails.amount) {
          throw new BadRequestException(
            `Product "${productDetails.name}" exceeds available stock. Only ${productDetails.amount} left.`,
          );
        }

        cartId = product.cart_id.toString();
        return {
          name: productDetails.name,
          amount: productDetails.discount || productDetails.price,
          quantity: product.quantity,
          category: productDetails.category,
        };
      });

      // Step 2: Calculate total amount
      let totalAmount = Math.floor(
        itemDto.reduce(
          (sum, item) => sum + item.amount * 100 * item.quantity,
          0,
        ),
      );

      if (totalAmount < 2000) {
        throw new BadRequestException(
          'amount must be greater than or equal to ฿20',
        );
      }

      if (createSourceDto.couple_name) {
        const couple = await this.coupleService.retrieveCoupleByName(
          createSourceDto.couple_name,
        );

        if (!couple) {
          throw new NotFoundException('Couple not found');
        }

        if (couple.validUntil < new Date()) {
          throw new BadRequestException('This couple is expired');
        }

        if (couple.quantity <= 0) {
          throw new BadRequestException(
            'This couple has reached maximum usage limit',
          );
        }

        if (
          couple.user_id &&
          couple.user_id._id.toString() !== createSourceDto.user_id
        ) {
          throw new BadRequestException(
            'This couple is not associated with the given user.',
          );
        }

        await this.coupleService.updateCouple({
          id: couple._id.toString(),
          quantity: couple.quantity - 1,
        });

        itemDto.map((item) => {
          if (item.category !== couple.category) {
            throw new BadRequestException(
              'Couple is not support with this item: ' + item.name,
            );
          }
        });
        const discountAmount = (couple.discount_percentage / 100) * totalAmount;
        totalAmount = totalAmount - discountAmount;
      }

      // Step 3: Prepare charge request
      const charge = {
        type: createSourceDto.type,
        amount: totalAmount,
        currency: 'thb',
        items: itemDto,
        email: createSourceDto.email,
      };

      // Step 4: Create charge source
      const chargeToken = await this.createSource(charge);
      if (!chargeToken || chargeToken.error) {
        throw new BadRequestException(
          'Charge creation failed',
          chargeToken.error,
        );
      }

      // Step 5: Prepare promptPay charge data
      const promptPayData = {
        type: chargeToken.type,
        amount: chargeToken.amount,
        currency: 'thb',
        items: chargeToken.items,
        email: chargeToken.email,
        source: chargeToken.id,
        return_uri: this.configService.get<string>('REDIRECT_URI'),
      };

      const promptPay = await this.createCharge(promptPayData);

      // Step 6: Record the payment in the database
      const payment = await this.paymentModel.create(
        [
          {
            charge_id: promptPay.id,
            user_id: createSourceDto.user_id,
            amount: promptPay?.source?.amount,
            status: promptPay?.status,
            payment_method: 'promptPay',
            expires_at: promptPay.expires_at,
          },
        ],
        { session: transactionSession }, // Pass session explicitly here
      );

      if (!payment) {
        throw new Error('Failed to create payment record');
      }

      // Step 7: Update product stock
      for (const product of cartItems) {
        const productDetails = product.product_id;
        await this.productService.update(
          productDetails._id,
          {
            amount: productDetails.amount - product.quantity,
            sale_out: (productDetails.sale_out || 0) + product.quantity,
          },
          transactionSession,
        );
      }

      // Step 8: Create order
      const prepareOrder = {
        user_id: createSourceDto.user_id,
        payment_id: payment[0]._id.toString(),
        shipping_address: createSourceDto.address,
        order_status: OrderStatus.Unpaid,
        product_info: cartItems.map((item: any) => ({
          product_id: item.product_id._id,
          quantity: item.quantity,
          price_at_purchase: item.product_id.discount || item.product_id.price,
        })),
      };

      const createOrder = await this.orderService.createOrder(
        prepareOrder,
        transactionSession,
      );

      // Step 9: Destroy cart
      const destroyCart = await this.cartService.destroyCart(
        cartId,
        transactionSession,
      ); // Pass session here
      if (destroyCart.statusCode !== HttpStatus.NO_CONTENT) {
        throw new Error('Failed to clear cart');
      }

      // Step 10: Commit transaction
      await transactionSession.commitTransaction();

      // Step 12: Return payment details
      return {
        message: 'Payment has been created',
        statusCode: HttpStatus.CREATED,
        detail: {
          order_id: createOrder._id,
          payment_id: payment[0]._id,
          chargeId: promptPay.id,
          image: promptPay?.source?.scannable_code?.image?.download_uri,
          amount: promptPay?.source?.amount,
          status: promptPay?.status,
          return_uri: promptPay.return_uri,
          expires_at: promptPay.expires_at,
        },
      };
    } catch (error) {
      // Aborting transaction in case of error
      if (transactionSession) {
        await transactionSession.abortTransaction();
      }
      console.error('Error in promptPay:', error);

      if (error) {
        throw new HttpException(
          {
            message: error.response.message,
            error: error.response.error,
            statusCode: error.response.statusCode,
          },
          error.response.status,
        );
      }

      throw new InternalServerErrorException({
        message: 'Payment failed',
        error: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    } finally {
      // Step 11: End session
      await transactionSession.endSession();
    }
  }

  async updatePaymentStatus(charge_id: string, status: string) {
    const session = await this.paymentModel.startSession();
    session.startTransaction();

    try {
      let updatedPayment;

      // Handle order updates based on the payment status
      if (status === 'successful') {
        // Update the payment status

        const charge = await this.findOneByChargeId(charge_id);

        updatedPayment = await this.paymentModel.findOneAndUpdate(
          { charge_id },
          { status: OrderStatus.Paid, paid_at: charge.paid_at },
          { new: true },
        );
        if (!updatedPayment) {
          throw new Error(`Payment with charge_id "${charge_id}" not found`);
        }

        await this.orderService.updateOrder({
          payment_id: updatedPayment._id.toString(),
          status: OrderStatus.Paid,
        });
      } else if (status === 'failed' || status === 'expired') {
        updatedPayment = await this.paymentModel.findOneAndUpdate(
          { charge_id },
          { status: OrderStatus.Cancelled },
          { new: true },
        );

        if (!updatedPayment) {
          throw new Error(`Payment with charge_id "${charge_id}" not found`);
        }

        const order = await this.orderService.updateOrder({
          payment_id: updatedPayment._id.toString(),
          status: OrderStatus.Cancelled,
        });

        const orderItems = await this.orderService.getOrderItems(order._id);

        for (const item of orderItems) {
          await this.productService.updatePaymentFailed({
            id: item.product_id.toString(),
            quantity: item.quantity,
          });
        }

        console.warn(
          `Payment with charge_id "${charge_id}" marked as ${status}.`,
        );
      }

      // Commit the transaction
      await session.commitTransaction();

      return {
        message: 'Payment status has been updated successfully',
        statusCode: HttpStatus.OK,
        detail: updatedPayment,
      };
    } catch (error) {
      // Abort the transaction in case of error
      await session.abortTransaction();
      console.error('Error updating payment status:', error.message);

      throw new InternalServerErrorException(
        'Failed to update payment status',
        error.message,
      );
    } finally {
      // End the session
      session.endSession();
    }
  }

  async getListOfCharges(data: string, order: string) {
    let orderField = '';
    if (order === 'new') {
      orderField = 'asc';
    } else if (order === 'old') {
      orderField = 'desc';
    }
    try {
      const list = await this.omise.charges.list({
        params: {
          ...(data && { filter: data }),
          order: orderField,
        },
      });
      return list;
    } catch (error) {
      console.error('Error response:', error.response.data);
      return {
        message: 'Payment failed',
        error: error.response.data,
        statusCode: error.response.status,
      };
    }
  }

  async findOneByChargeId(charge_id: string) {
    const charge = await this.omise.charges.retrieve(charge_id);
    return charge;
  }

  async getPaymentByPaymentID(payment_id) {
    try {
      const payment = await this.paymentModel.findById(payment_id);
      if (!payment) {
        throw new Error(`Payment with ID ${payment_id} not found`);
      }

      const paymentDetail = await this.omise.charges.retrieve(
        payment.charge_id,
      );

      if (payment.payment_method === 'promptPay') {
        return {
          message: 'Payment retrieved successfully',
          statusCode: HttpStatus.OK,
          detail: {
            payment_id: payment._id,
            amount: paymentDetail.amount,
            currency: 'thb',
            status: paymentDetail.status,
            payment_method: 'promptPay',
            created_at: paymentDetail.created_at,
            transaction_details: {
              charge_id: payment.charge_id,
              image: paymentDetail?.source?.scannable_code?.image?.download_uri,
              status: paymentDetail?.status,
              return_uri: paymentDetail.return_uri,
              expires_at: paymentDetail.expires_at,
            },
            metadata: paymentDetail.metadata || {},
          },
        };
      }

      return {
        payment_id: payment._id,
        amount: paymentDetail.amount,
        currency: 'thb',
        status: paymentDetail.status,
        payment_method: payment.payment_method,
        created_at: paymentDetail.created_at,
        transaction_details: paymentDetail.source || {},
        metadata: paymentDetail.metadata || {},
      };
    } catch (error) {
      console.error('Error retrieving payment details:', error.message);
      if (error.message.includes('not found')) {
        throw new Error('Payment not found in the system');
      }

      throw error;
    }
  }

  private calculateTotalAmount(items: ItemDto[]): number {
    return Math.floor(
      items.reduce((sum, item) => sum + item.amount * 100 * item.quantity, 0),
    );
  }

  async createSource(source: any) {
    try {
      const sources = await this.omise.sources.create(source);
      return sources;
    } catch (error) {
      console.error('Error creating source:', error);
      return { message: 'Source creation failed', error: error.message };
    }
  }

  async createCharge(charges: any) {
    try {
      const chargesData = await this.omise.charges.create(charges);
      return chargesData;
    } catch (error) {
      console.error('Error creating charge:', error);
      return { message: 'Charge creation failed', error: error.message };
    }
  }
}
