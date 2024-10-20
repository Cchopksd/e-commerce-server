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
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const items = await this.productService.findAll(page, limit);
    const count = await this.productService.countPage();

    return {
      ...count,
      page,
      limit,
      items,
    };
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
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
