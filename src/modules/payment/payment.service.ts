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
    const cardDetails = {
      amount: createPaymentDto.amount,
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
    const charge = {
      type: createSourceDto.type,
      amount: createSourceDto.amount,
      currency: createSourceDto.currency,
      items: createSourceDto.items,
      email: createSourceDto.email,
    };
    console.log(charge);
    const sourceToken = await this.createSource(charge);
    console.log(sourceToken);

    if (!sourceToken || sourceToken.error) {
      return {
        message: 'Source creation failed',
        error: sourceToken.error
      };
    }

    const charges = {
      type: createSourceDto.type,
      amount: createSourceDto.amount,
      currency: createSourceDto.currency,
      items: sourceToken.items,
      email: sourceToken.email,
      source: sourceToken.id,
      return_uri: this.configService.get<string>('REDIRECT_URI'),
    };

    try {
      const result = await this.omise.charges.create(charges);
      // console.log('Charge created:', result);

      return {
        chargeId: result.id,
        image: result.source.scannable_code.image.download_uri,
        amount: result.amount,
        status: result.status,
        items: result.source.items,
        email: result.source.email,
        return_uri: result.return_uri,
        expires_at: result.expires_at,
        net: result.net,
        fee: result.fee,
        fee_vat: result.fee_vat,
      };
    } catch (error) {
      console.error('Error creating charge:', error);
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
