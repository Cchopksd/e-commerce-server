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

  async createToken(createPaymentDto: any) {
    const product = await this.cartService.getItemsOnCart(
      createPaymentDto.user_id,
    );
    const cardDetails = {
      currency: createPaymentDto.currency,
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

    try {
      const totalAmount = Math.floor(
        product.reduce(
          (sum, item) =>
            sum +
            (item.product_id.discount ?? item.product_id.price) * item.quantity,
          0,
        ),
      );
      const charge = await this.omise.charges.create({
        amount: totalAmount * 100,
        currency: createPaymentDto.currency,
        card: token.id,
      });

      return charge;
    } catch (error) {
      return { message: 'Payment failed', error: error.message };
    }
  }

  async installment(card: any) {
    try {
    } catch (error) {
      return { message: 'Payment failed', error: error.message };
    }
  }

  async createSource(charge: any) {
    try {
      const data = await this.omise.sources.create(charge);
      // console.log('Source created:', data);
      return data;
    } catch (error) {
      console.error('Error creating source:', error);
      return { message: 'Source creation failed', error: error.message };
    }
  }

  async promptPay(createSourceDto: any) {
    try {
      // Get items from the cart
      const product = await this.cartService.getItemsOnCart(
        createSourceDto.user_id,
      );

      // Map product items to item DTOs
      const itemDto = product.map((productItem) => {
        const productDetails = productItem.product_id; // Assuming product_id contains the full product details
        if (!productDetails) {
          throw new Error('Product details not found for item in cart');
        }

        return {
          name: productDetails.name,
          amount: productDetails.discount
            ? productDetails.discount * 100
            : productDetails.price * 100,
          quantity: productItem.quantity,
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
      const sourceToken = await this.createSource(charge);

      // Handle source creation failure
      if (!sourceToken || sourceToken.error) {
        return {
          message: 'Source creation failed',
          error: sourceToken.error,
          statusCode: HttpStatus.BAD_REQUEST,
        };
      }

      // Prepare charge parameters
      const charges = {
        type: sourceToken.type,
        amount: sourceToken.amount,
        currency: sourceToken.currency,
        items: sourceToken.items,
        email: sourceToken.email,
        source: sourceToken.id,
        return_uri: this.configService.get<string>('REDIRECT_URI'),
      };

      const omiseCharge = await this.omise.charges.create(charges);

      await this.paymentModel.create({
        charge_id: omiseCharge.id,
        user_id: createSourceDto.user_id,
        amount: omiseCharge?.source?.amount,
        status: omiseCharge?.status,
        payment_method: 'promptPay',
      });
      console.log();
      return {
        chargeId: omiseCharge.id,
        image: omiseCharge?.source?.scannable_code?.image?.download_uri,
        amount: omiseCharge?.source?.amount,
        status: omiseCharge?.status,
        return_uri: omiseCharge.return_uri,
        expires_at: omiseCharge.expires_at,
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
    return this.paymentModel.findOneAndUpdate(
      { charge_id }, // The filter to find the document
      { status }, // The update to apply
      { new: true }, // Return the updated document
    );
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
