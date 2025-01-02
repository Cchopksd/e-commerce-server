import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule, InjectConnection } from '@nestjs/mongoose';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { ConfigModule } from '@nestjs/config';
import { CartModule } from '../cart/cart.module';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { WebhookController } from './webhook.controller';
import { ProductModule } from '../product/product.module';
import { OrderModule } from '../order/order.module';
import { Card, CardSchema } from './schemas/card.schema';
import { AddressModule } from '../address/address.module';
import { ReviewModule } from '../review/review.module';
import { PaymentGateway } from './payment.gateway';
import { CoupleModule } from '../couple/couple.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
    MongooseModule.forFeature([{ name: Card.name, schema: CardSchema }]),
    ConfigModule,
    CartModule,
    ProductModule,
    forwardRef(() => OrderModule),
    AddressModule,
    ReviewModule,
    CoupleModule,
  ],
  controllers: [PaymentController, WebhookController],
  providers: [PaymentService, PaymentGateway],
  exports: [PaymentService],
})
export class PaymentModule {}
