import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { ConfigModule } from '@nestjs/config';
import { CartModule } from '../cart/cart.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { WebhookController } from './webhook.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
    ConfigModule,
    CartModule,
  ],
  controllers: [PaymentController, WebhookController],
  providers: [PaymentService],
})
export class PaymentModule {}
