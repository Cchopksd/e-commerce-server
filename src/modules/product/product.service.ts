import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { Model } from 'mongoose';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { NotFoundError } from 'rxjs';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async create(
    createProductDto: CreateProductDto,
    files: { images?: Express.Multer.File[] },
  ) {
    try {
      if (!files.images || files.images.length === 0) {
        throw new BadRequestException('No images were uploaded');
      }

      const uploadImages = files.images.map((file) =>
        this.cloudinaryService.uploadImage(
          file,
          `e-commerce/products/${createProductDto.category}`,
        ),
      );
      const uploadResults = await Promise.all(uploadImages);

      const newProduct = await this.productModel.create({
        ...createProductDto,
        images: uploadResults,
      });

      return {
        message: 'Product created successfully',
        statusCode: 201,
      };
    } catch (error) {
      console.error('Error creating product:', error);
      throw new Error('Failed to create product: ' + error.message);
    }
  }

  async findAll() {
    const product = await this.productModel.find();
    return product;
  }

  async findOne(id: string) {
    const product = await this.productModel.findById(id);
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.productModel.findById(id);
    return `This action updates a #${id} product`;
  }

  async remove(id: string) {
    const product = await this.productModel.findById(id);

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const removeImagePromises = product.images.map(async (file) => {
      await this.cloudinaryService.deleteImage(file.public_id);
    });

    const removeImageResults = await Promise.all(removeImagePromises);
    console.log(removeImageResults);

    const result = await this.productModel.findByIdAndDelete(id);
    console.log(result);

    return `This action removes a product with ID #${id}`;
  }
}
