import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Omise from 'omise';
import {
  CreateCreditCardDto,
  CreateNewCreditCardDto,
} from './dto/create-credit-card.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Card, CardDocument } from './schemas/card.schema';
import { Model } from 'mongoose';

@Injectable()
export class CardService {
  private omise: any;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Card.name) private cardModel: Model<CardDocument>,
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
        default: true,
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

  async attachACardToCustomer(createCreditCardDto: CreateNewCreditCardDto) {
    try {
      const user = await this.cardModel.findOne({
        user_id: createCreditCardDto.user_id,
      });

      const token = await this.createToken(createCreditCardDto);

      const customer = await this.omise.customers.update(user.cust_id, {
        card: token.id,
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

  async deleteCreditCard({
    cust_id,
    card_id,
  }: {
    cust_id: string;
    card_id: string;
  }) {
    try {
      const deletedCard = await new Promise((resolve, reject) => {
        this.omise.customers.destroyCard(cust_id, card_id, (err, res) => {
          if (err) reject(err);
          resolve(res);
        });
      });
      return deletedCard;
    } catch (error) {
      throw new Error(`Failed to delete card: ${error.message}`);
    }
  }
}
