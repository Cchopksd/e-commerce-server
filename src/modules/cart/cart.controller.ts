import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CreateCartItemDto } from './dto/create-cart-item.dto';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('add-item')
  addToCart(@Body() createCartDto: CreateCartItemDto) {
    return this.cartService.addToCart(createCartDto);
  }

  @Get('user_id/:user_id')
  getItemsOnCart(@Param('user_id') user_id: string) {
    return this.cartService.getItemsOnCart2(user_id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ) {
    return this.cartService.update(+id, updateCartItemDto);
  }

  @Post('remove-item')
  removeFromCart(@Body() createCartDto: CreateCartItemDto) {
    return this.cartService.removeFromCart(createCartDto);
  }
}
