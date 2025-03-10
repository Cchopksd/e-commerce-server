import {
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Omise from 'omise';
import {
  CreateCreditCardDto,
  CreateNewCreditCardDto,
} from './dto/create-credit-card.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Card, CardDocument } from './schemas/card.schema';
import { Model } from 'mongoose';
import { DeleteCreditCardDto } from './dto/delete-credit-card.dto';

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
      const customer_card = customer.cards.data;

      return {
        message: 'Customer retrieved successfully',
        statusCode: HttpStatus.OK,
        detail: {
          card: customer_card.map((items: any) => ({
            cust_id: cust.cust_id,
            card_id: items.id,
            name: items.name,
            brand: items.brand,
            last_digits: items.last_digits,
            expiration_month: items.expiration_month,
            expiration_year: items.expiration_year,
            is_default: items.default,
          })),
        },
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
      const user = await this.cardModel.findOne({
        user_id: createCreditCardDto.user_id,
      });

      if (user) {
        try {
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

  async deleteCreditCard(deleteCreditCardDto: DeleteCreditCardDto) {
    try {
      const deletedCard = await this.omise.customers.destroyCard(
        deleteCreditCardDto.cust_id,
        deleteCreditCardDto.card_id,
      );

      return {
        message: 'Card has been deleted',
        statusCode: HttpStatus.OK,
        detail: deletedCard,
      };
    } catch (error) {
      if (error && error.code === 'not_found') {
        throw new NotFoundException({
          message: 'Card not found',
          statusCode: HttpStatus.NOT_FOUND,
        });
      }
      throw new Error(`Failed to delete card: ${error.message}`);
    }
  }
}
