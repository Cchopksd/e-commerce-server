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
  Put,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import {
  UpdateProductDto,
  UpdateProductFormDataDto,
} from './dto/update-product.dto';
import { Roles } from '../auth/decorator/role.decorator';
import { Role } from '../auth/enums/role.enum';
import { Public } from '../auth/decorator/auth.decorator';
import {
  FileFieldsInterceptor,
  FileInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';
import { ImageValidation } from 'src/pipes/ParseFilePipe.pipe';
import { GetAllProductDto } from './dto/get-Product.dto';

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
  async findAll(@Query() getAllProductDto: GetAllProductDto) {
    const items = await this.productService.findAll(getAllProductDto);

    return items;
  }

  @Public()
  @Post('by-id/:product_id')
  async findOneToDisplay(
    @Param('product_id') product_id: string,
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
  getTrendingProduct(@Query('user_id') user_id: string) {
    return this.productService.getTrendingProduct({ user_id });
  }

  @Roles(Role.ADMIN)
  @Put('update/:id')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 9 }]))
  update(
    @Param('id') id: string,
    @Body() updateProductDto: any,
    @UploadedFiles() files: { images?: Express.Multer.File[] },
  ) {
    return this.productService.updateProduct(id, updateProductDto, files);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }

  @Public()
  @Post('search-product-suggestion')
  searchProductSuggestion(@Body('search') search: string) {
    return this.productService.searchProductSuggestion(search);
  }
}
