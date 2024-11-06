import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { Model } from 'mongoose';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { InjectModel } from '@nestjs/mongoose';

import { Cart, CartDocument } from './schemas/cart.schema';
import { CartItem, CartItemDocument } from './schemas/cart_item.schema';
import { ProductService } from '../product/product.service';
import { validateObjectId } from 'src/helpers/objectIdHelper';

@Injectable()
export class CartService {
  constructor(
    private productService: ProductService,
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    @InjectModel(CartItem.name) private cartItemModel: Model<CartItemDocument>,
  ) {}
  async addToCart(createCartItemDto: CreateCartItemDto) {
    try {
      validateObjectId(createCartItemDto.user_id, 'User');

      let cart = await this.cartModel.findOne({
        user_id: createCartItemDto.user_id,
      });

      const product = await this.productService.findOne(
        createCartItemDto.product_id,
      );

      if (!cart) {
        cart = await this.cartModel.create({
          user_id: createCartItemDto.user_id,
          total_price: 0,
          shipping_fee: 0,
          total_quantity: 0,
        });
      }

      const actualProductPrice = product.discount || product.price;

      const existingCartItem = await this.cartItemModel.findOne({
        user_id: createCartItemDto.user_id,
        product_id: createCartItemDto.product_id,
      });

      if (existingCartItem) {
        existingCartItem.quantity += createCartItemDto.quantity;
        existingCartItem.subtotal =
          actualProductPrice * existingCartItem.quantity;
        await existingCartItem.save();
      } else {
        const newCartItem = await this.cartItemModel.create({
          cart_id: cart._id,
          user_id: cart.user_id,
          product_id: createCartItemDto.product_id,
          quantity: createCartItemDto.quantity,
          unit_price: actualProductPrice,
          subtotal: actualProductPrice * createCartItemDto.quantity,
        });
      }

      cart.total_price += actualProductPrice * createCartItemDto.quantity;
      cart.total_quantity += createCartItemDto.quantity;
      await cart.save();

      return { cart };
    } catch (error) {
      console.error('Error adding item to cart:', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException('Error adding item to cart');
    }
  }

  async getItemsOnCart(user_id: string) {
    validateObjectId(user_id, 'User');

    try {
      const cart = await this.cartItemModel
        .find({ user_id })
        .populate('product_id');

      return cart;
    } catch (error) {
      console.error('Error fetching cart:', error);
      throw new InternalServerErrorException('Error fetching cart');
    }
  }

  update(id: number, updateCartDto: UpdateCartItemDto) {
    return `This action updates a #${id} cart`;
  } 

  async removeFromCart(createCartItemDto: CreateCartItemDto) {
    validateObjectId(createCartItemDto.user_id, 'User');
    validateObjectId(createCartItemDto.product_id, 'Product');
    try {
      const cart = await this.cartModel.findOne({
        user_id: createCartItemDto.user_id,
      });
      if (!cart) {
        throw new NotFoundException('Cart not found');
      }

      const existingCartItem = await this.cartItemModel.findOne({
        user_id: createCartItemDto.user_id,
        product_id: createCartItemDto.product_id,
      });

      if (!existingCartItem) {
        throw new NotFoundException('Cart item not found');
      }

      if (existingCartItem.quantity > 1 || cart.total_quantity > 1) {
        existingCartItem.quantity -= createCartItemDto.quantity;
        existingCartItem.subtotal =
          existingCartItem.unit_price * existingCartItem.quantity;
        cart.total_price -= existingCartItem.unit_price;
        cart.total_quantity -= createCartItemDto.quantity;
        await existingCartItem.save();
        await cart.save();
      } else {
        await this.cartItemModel.deleteOne({
          user_id: createCartItemDto.user_id,
          product_id: createCartItemDto.product_id,
        });

        await this.cartModel.deleteOne({
          user_id: createCartItemDto.user_id,
        });
        return {
          message: 'Item removed from cart',
        };
      }

      cart.total_price +=
        existingCartItem.unit_price * createCartItemDto.quantity;
      cart.total_quantity += createCartItemDto.quantity;

      return {
        message: 'Item removed from cart',
        cart_item: existingCartItem,
      };
    } catch (error) {
      console.error('Error removing item from cart:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error removing item from cart');
    }
  }
}
