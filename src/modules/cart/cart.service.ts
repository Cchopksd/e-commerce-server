import {
  BadRequestException,
  HttpStatus,
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
import { AddressService } from '../address/address.service';

@Injectable()
export class CartService {
  constructor(
    private readonly productService: ProductService,
    private readonly addressService: AddressService,
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

      if (createCartItemDto.quantity > product.amount) {
        throw new BadRequestException(
          `Requested quantity of ${createCartItemDto.quantity} exceeds available stock of ${product.amount} for product "${product.name}".`,
        );
      }

      if (!cart) {
        cart = await this.cartModel.create({
          user_id: createCartItemDto.user_id,
        });
      }

      const existingCartItem = await this.cartItemModel.findOne({
        user_id: createCartItemDto.user_id,
        product_id: createCartItemDto.product_id,
      });

      if (existingCartItem) {
        // ตรวจสอบว่า quantity รวมเกิน stock หรือไม่
        const totalQuantity =
          existingCartItem.quantity + createCartItemDto.quantity;
        if (totalQuantity > product.amount) {
          throw new BadRequestException(
            `Cannot add ${product.name} to the cart. Only ${product.amount} are available in stock.`,
          );
        }

        existingCartItem.quantity = totalQuantity;
        await existingCartItem.save();
      } else {
        await this.cartItemModel.create({
          cart_id: cart._id,
          user_id: cart.user_id,
          product_id: createCartItemDto.product_id,
          quantity: createCartItemDto.quantity,
        });
      }

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
      let cart = await this.cartItemModel
        .find({ user_id })
        .populate('product_id');

      const address = await this.addressService.getUserAddress(user_id);

      const cartWithAddress = cart.map((item) => ({
        ...item.toObject(),
        address,
      }));

      return cart;
    } catch (error) {
      console.error('Error fetching cart:', error);
      throw new InternalServerErrorException('Error fetching cart');
    }
  }

  async getItemsOnCart2(user_id: string) {
    validateObjectId(user_id, 'User');

    try {
      let cart = await this.cartItemModel
        .find({ user_id })
        .sort({ createdAt: -1 })
        .populate('product_id');

      const address = await this.addressService.getUserAddressOnCart(user_id);

      return { cart, address };
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

      if (existingCartItem.quantity > 1) {
        existingCartItem.quantity -= createCartItemDto.quantity;
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

  async destroyCart(cart_id: string, session?: any) {
    validateObjectId(cart_id, 'User');

    try {
      // ลบสินค้าทั้งหมดในตะกร้า โดยใช้ session ถ้ามี
      const cartItem = await this.cartItemModel.deleteMany(
        { cart_id },
        session ? { session } : {}, // ใช้ session ถ้ามี
      );

      // ลบตะกร้าเอง โดยใช้ session ถ้ามี
      const cart = await this.cartModel.deleteMany(
        { _id: cart_id },
        session ? { session } : {}, // ใช้ session ถ้ามี
      );

      return {
        message: 'Cart has been destroyed',
        statusCode: HttpStatus.NO_CONTENT,
      };
    } catch (error) {
      console.error('Error fetching cart:', error);
      throw new InternalServerErrorException('Error fetching cart');
    }
  }
}
