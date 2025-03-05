import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Omise from 'omise';

@Injectable()
export class CardService {
  private omise: any;

  constructor(private readonly configService: ConfigService) {
    this.omise = Omise({
      publicKey: this.configService.get<string>('OMISE_PUBLIC_KEY'),
      secretKey: this.configService.get<string>('OMISE_SECRET_KEY'),
    });
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
