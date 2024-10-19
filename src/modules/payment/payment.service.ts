import { Injectable } from '@nestjs/common';
import * as Omise from 'omise';
import { ConfigService } from '@nestjs/config';

import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentService {
  private omise: any;
  constructor(private configService: ConfigService) {
    this.omise = Omise({
      publicKey: this.configService.get<string>('OMISE_PUBLIC_KEY'),
      secretKey: this.configService.get<string>('OMISE_SECRET_KEY'),
    });
  }

  async createToken(createPaymentDto: any) {
    try {
      console.log({ card: createPaymentDto });
      const token = await this.omise.tokens.create('card', {
        card: createPaymentDto,
      });

      if (!token.id) {
        throw new Error('Failed to create token');
      }
      const charge = await this.omise.charges.create({
        amount: createPaymentDto.amount * 100,
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

  create(createPaymentDto: CreatePaymentDto) {
    return 'This action adds a new payment';
  }

  findAll() {
    return `This action returns all payment`;
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
