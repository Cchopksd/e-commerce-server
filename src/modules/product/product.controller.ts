import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFiles,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Roles } from '../auth/decorator/role.decorator';
import { Role } from '../auth/enums/role.enum';
import { Public } from '../auth/decorator/auth.decorator';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { ImageValidation } from 'src/pipes/ParseFilePipe.pipe';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Roles(Role.ADMIN)
  @Post()
  @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 9 }]))
  create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFiles(new ImageValidation())
    files: { images?: Express.Multer.File[] },
  ) {
    return this.productService.create(createProductDto, files);
  }

  @Public()
  @Get()
  async findAll(@Query('search') search: string, @Query('page') page: number) {
    const items = await this.productService.findAll(search, page);

    return items;
  }

  @Public()
  @Post('by-id')
  async findOneToDisplay(
    @Body('product_id') product_id: string,
    @Body('user_id') user_id: string,
  ) {
    try {
      return await this.productService.findOneDisplay({ product_id, user_id });
    } catch (error) {
      console.error('Error in ProductController.findOne:', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException({
        message: 'An unexpected error occurred while fetching the product',
        statusCode: 400,
      });
    }
  }

  @Public()
  @Get('/trending-product')
  getTrendingProduct() {
    return this.productService.getTrendingProduct();
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productService.update(id, updateProductDto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }
}
