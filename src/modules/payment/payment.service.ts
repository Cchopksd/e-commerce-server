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
import { CreateCreditCardDto } from './dto/create-credit-card.dto';
import { ItemDto } from './dto/source.dto';

import { CartService } from '../cart/cart.service';
import { ProductService } from '../product/product.service';
import { OrderService } from '../order/order.service';
import { CreatePayWithCreditCardDto } from './dto/credit-card.dto';
import { AddressService } from '../address/address.service';

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
    private readonly addressService: AddressService,
    @InjectConnection() private readonly connection: Connection,
  ) {
    this.omise = Omise({
      publicKey: this.configService.get<string>('OMISE_PUBLIC_KEY'),
      secretKey: this.configService.get<string>('OMISE_SECRET_KEY'),
    });
  }

  async createToken(createPaymentDto: CreateCreditCardDto) {
    try {
      const cardDetails = {
        currency: 'thb',
        name: createPaymentDto.name,
        city: createPaymentDto.city,
        country: createPaymentDto.country,
        postal_code: createPaymentDto.postal_code,
        number: createPaymentDto.number,
        expiration_month: createPaymentDto.expiration_month,
        expiration_year: createPaymentDto.expiration_year,
        security_code: createPaymentDto.security_code,
      };

      const token = await this.omise.tokens.create({ card: cardDetails });

      if (!token.id) {
        throw new Error('Failed to create token');
      }
      return token;
    } catch (error) {
      console.error('Error creating token', {
        error: error.message,
        stack: error.stack,
        context: 'PaymentService',
      });
      return { message: 'Token creation failed', error: error.message };
    }
    // try {
    //   const totalAmount = Math.floor(
    //     product.reduce(
    //       (sum, item) =>
    //         sum +
    //         (item.product_id.discount ?? item.product_id.price) * item.quantity,
    //       0,
    //     ),
    //   );
    //   const charge = await this.omise.charges.create({
    //     amount: totalAmount * 100,
    //     currency: createPaymentDto.currency,
    //     card: token.id,
    //   });

    //   return charge;
    // } catch (error) {
    //   return { message: 'Payment failed', error: error.message };
    // }
  }

  async addCustomerAttachCreditCard(createCreditCardDto: CreateCreditCardDto) {
    try {
      const token = await this.createToken(createCreditCardDto);

      const customer = await this.omise.customers.create({
        description: `information about: ${createCreditCardDto.name}`,
        email: createCreditCardDto.email,
        card: token.id,
      });

      this.cardModel.create({
        user_id: createCreditCardDto.user_id,
        cust_id: customer.id,
      });

      return {
        message: 'customer has been created',
        statusCode: HttpStatus.CREATED,
        detail: customer,
      };
    } catch (error) {
      console.error('Error creating customer:', error);
      return { message: 'Customer creation failed', error: error.message };
    }
  }

  async getRetrieveACustomer(user_id: string) {
    try {
      const cust = await this.cardModel.findOne({ user_id });
      if (!cust) {
        throw new NotFoundException({
          message: 'Customer not found',
          statusCode: HttpStatus.NOT_FOUND,
        });
      }

      const customer = await this.omise.customers.retrieve(cust.cust_id);

      return {
        message: 'Customer retrieved successfully',
        statusCode: HttpStatus.OK,
        detail: { customer_id: customer.id, card: customer.cards.data },
      };
    } catch (error) {
      console.error('Error retrieving customer:', error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      if (error.code && error.message) {
        throw new InternalServerErrorException({
          message: 'Customer retrieval failed due to Omise API error',
          error: error.message,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      throw new InternalServerErrorException({
        message: 'Customer retrieval failed due to an unexpected error',
        error: error.message || 'Unknown error occurred',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async createSource(source: any) {
    try {
      const sources = await this.omise.sources.create(source);
      // console.log('Source created:', data);
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
      const totalAmount = Math.floor(
        item.reduce((sum, item) => sum + item.amount * 100 * item.quantity, 0),
      );

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
            status: creditCard?.status,
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
        order_status: OrderStatus.Paid,
        product_info: cartItems.map((item: any) => ({
          product_id: item.product_id._id,
          quantity: item.quantity,
          price_at_purchase: item.product_id.discount ?? item.product_id.price,
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
          status: creditCard?.status,
          return_uri: creditCard.return_uri,
          expires_at: creditCard.expires_at,
        },
      };
    } catch (error) {
      console.error('Error Pay with credit card:', error);

      if (error instanceof NotFoundException) {
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
    } catch (error) {
      return { message: 'Payment failed', error: error.message };
    }
  }

  async promptPay(createSourceDto: any) {
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
      const totalAmount = Math.floor(
        itemDto.reduce(
          (sum, item) => sum + item.amount * 100 * item.quantity,
          0,
        ),
      );

      // Step 3: Prepare charge request
      const charge = {
        type: createSourceDto.type,
        amount: totalAmount,
        currency: createSourceDto.currency,
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
        currency: chargeToken.currency,
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
          price_at_purchase: item.product_id.discount ?? item.product_id.price,
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
        updatedPayment = await this.paymentModel.findOneAndUpdate(
          { charge_id },
          { status: OrderStatus.Paid },
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

        await this.orderService.updateOrder({
          payment_id: updatedPayment._id.toString(),
          status: OrderStatus.Cancelled,
        });

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
            currency: paymentDetail.currency,
            status: paymentDetail.status,
            payment_method: 'promptPay',
            created_at: paymentDetail.created_at,
            transaction_details: {
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
        currency: paymentDetail.currency,
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

  update(id: number, updatePaymentDto: UpdatePaymentDto) {
    return `This action updates a #${id} payment`;
  }

  remove(id: number) {
    return `This action removes a #${id} payment`;
  }
}
