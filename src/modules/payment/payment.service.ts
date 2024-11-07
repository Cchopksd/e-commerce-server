import { HttpStatus, Injectable } from '@nestjs/common';
import * as Omise from 'omise';
import { ConfigService } from '@nestjs/config';

import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

import { ItemDto } from './dto/source.dto';

import { CartService } from '../cart/cart.service';
import { CreateProductDto } from '../product/dto/create-product.dto';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { CreateCreditCardDto } from './dto/create-credit-card';

@Injectable()
export class PaymentService {
  private omise: any;
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    private cartService: CartService,
    private configService: ConfigService,
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
      console.error('Error creating token:', error);
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
        token: token.id,
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

  async installment(card: any) {
    try {
    } catch (error) {
      return { message: 'Payment failed', error: error.message };
    }
  }

  async createSource(source: any) {
    try {
      const data = await this.omise.sources.create(source);
      // console.log('Source created:', data);
      return data;
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

  async promptPay(createSourceDto: any) {
    try {
      // Get items from the cart
      const cartItem = await this.cartService.getItemsOnCart(
        createSourceDto.user_id,
      );
      let cart_id: string = '';

      if (cartItem.length <= 0) {
        throw new Error('Cart is Empty');
      }
      // Map product items to item DTOs
      const itemDto = cartItem.map((product) => {
        const productDetails = product.product_id; // Assuming product_id contains the full product details
        if (!productDetails) {
          throw new Error('Product details not found for item in cart');
        }
        cart_id = product.cart_id.toString();
        return {
          name: productDetails.name,
          amount: productDetails.discount
            ? productDetails.discount * 100
            : productDetails.price * 100,
          quantity: product.quantity,
          category: productDetails.category,
        };
      });

      // Calculate total amount in THB
      const totalAmount = Math.floor(
        itemDto.reduce((sum, item) => sum + item.amount * item.quantity, 0),
      );

      // Prepare charge request
      const charge = {
        type: createSourceDto.type,
        amount: totalAmount,
        currency: createSourceDto.currency,
        items: itemDto,
        email: createSourceDto.email,
      };

      // Create the source
      const chargeToken = await this.createSource(charge);

      // Handle source creation failure
      if (!chargeToken || chargeToken.error) {
        return {
          message: 'Charge creation failed',
          error: chargeToken.error,
          statusCode: HttpStatus.BAD_REQUEST,
        };
      }

      // Prepare charge parameters
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

      const payment = await this.paymentModel.create({
        charge_id: promptPay.id,
        user_id: createSourceDto.user_id,
        amount: promptPay?.source?.amount,
        status: promptPay?.status,
        payment_method: 'promptPay',
        expires_at: promptPay.expires_at,
      });

      if (!payment) {
        throw new Error('Payment Model cant created');
      }

      const destroyCart = await this.cartService.destroyCart(cart_id);
      console.log(cartItem);

      if (destroyCart.statusCode !== 204) {
        throw new Error('Can not to destroy cart');
      }

      return {
        message: 'Payment has been created',
        statusCode: HttpStatus.CREATED,
        detail: {
          chargeId: promptPay.id,
          image: promptPay?.source?.scannable_code?.image?.download_uri,
          amount: promptPay?.source?.amount,
          status: promptPay?.status,
          return_uri: promptPay.return_uri,
          expires_at: promptPay.expires_at,
        },
      };
    } catch (error) {
      console.error('Error in promptPay:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        return {
          message: 'Payment failed',
          error: error.response.data,
          statusCode: error.response.status,
        };
      }
      return {
        message: 'Payment failed',
        error: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async updatePaymentStatus(charge_id: string, status: string) {
    const updatePayment = await this.paymentModel.findOneAndUpdate(
      { charge_id }, // The filter to find the document
      { status }, // The update to apply
      { new: true }, // Return the updated document
    );
    return {
      message: 'Payment status has been updated',
      statusCode: HttpStatus.OK,
      detail: updatePayment,
    };
  }

  async getListOfCharges() {
    try {
      const list = await this.omise.charges.list();
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

  findOne(id: number) {
    return `This action returns a #${id} payment`;
  }

  update(id: number, updatePaymentDto: UpdatePaymentDto) {
    return `This action updates a #${id} payment`;
  }

  remove(id: number) {
    return `This action removes a #${id} payment`;
  }
}
