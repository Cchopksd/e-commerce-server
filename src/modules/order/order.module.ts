import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schema/order.schema';
import { ConfigModule } from '@nestjs/config';
import { CartModule } from '../cart/cart.module';
import { Product, ProductSchema } from '../product/schemas/product.schema';
import { ProductModule } from '../product/product.module';
import { OrderItems, OrderItemsSchema } from './schema/orderItems.schema';
import { AddressModule } from '../address/address.module';
import { PaymentModule } from '../payment/payment.module';
import { forwardRef, Inject } from '@nestjs/common';

@Module({
  imports: [
    forwardRef(() => PaymentModule),
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    MongooseModule.forFeature([
      { name: OrderItems.name, schema: OrderItemsSchema },
    ]),
    ConfigModule,
    CartModule,
    ProductModule,
    AddressModule,
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
