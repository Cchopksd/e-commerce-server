import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { FavoriteService } from './favorite.service';
import { CreateFavoriteDto } from './dto/createFavorite.dto';

@Controller('favorite')
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Post()
  createFavorite(@Body() createFavoriteDto: CreateFavoriteDto) {
    return this.favoriteService.createFavorite(createFavoriteDto);
  }

  @Get('by-user/:user_id')
  getFavoriteByUser(@Param('user_id') user_id: string) {
    return this.favoriteService.getFavoriteByUser(user_id);
  }

  @Get('by-product/:product_id')
  getFavorite(@Param('product_id') product_id: string) {
    return this.favoriteService.getFavoriteByProduct(product_id);
  }
}
