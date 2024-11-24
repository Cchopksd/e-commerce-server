import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { Model } from 'mongoose';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { validateObjectId } from 'src/helpers/objectIdHelper';
import { shuffleItems } from 'src/utils/shuffleArray.util';
import { FavoriteService } from '../favorite/favorite.service';
import { ReviewService } from '../review/review.service';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private cloudinaryService: CloudinaryService,
    private favoriteService: FavoriteService,
    private reviewService: ReviewService,
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

  async findAll(search: string, page: number, limit: number = 12) {
    try {
      // Define query based on the search parameter
      const query = search
        ? {
            $or: [
              { name: { $regex: search, $options: 'i' } },
              { description: { $regex: search, $options: 'i' } },
            ],
          }
        : {};

      // Calculate skip value for pagination
      const skip = (page - 1) * limit;

      // Calculate total items matching the query
      const totalItems = await this.productModel.countDocuments(query).exec();

      // Calculate total pages
      const totalPages = Math.ceil(totalItems / limit);

      // Fetch products from the database
      const products = await this.productModel
        .find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .exec();

      const shuffleProducts = await shuffleItems(products);

      return {
        total_items: totalItems,
        total_page: totalPages,
        page_now: page,
        items: shuffleProducts,
      };
    } catch (error) {
      console.error('Error fetching products:', error);
      throw new InternalServerErrorException('Error fetching products');
    }
  }

  async countPage() {
    const total_items = await this.productModel.countDocuments().exec();
    const total_page = Math.ceil(total_items / 10);

    const result = { total_items, total_page };
    return result;
  }

  async findOne(id: string) {
    validateObjectId(id, 'Product');

    try {
      const product = await this.productModel.findById(id);
      if (!product) {
        throw new BadRequestException({
          message: 'Cannot find item',
          statusCode: 400,
        });
      }
      return product;
    } catch (error) {
      console.error('Error fetching product:', error);

      // Re-throw known exceptions
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Handle unexpected exceptions
      throw new InternalServerErrorException({
        message: 'Error fetching product',
        statusCode: 500,
      });
    }
  }

  async findOneDisplay({
    product_id,
    user_id,
  }: {
    product_id: string;
    user_id: string;
  }) {

    validateObjectId(product_id, 'Product');

    try {
      const [product, reviews, favorite] = await Promise.all([
        this.productModel.findById(product_id),
        this.reviewService.getByProduct(product_id),
        this.favoriteService.getFavoriteByUserAndProduct({
          user_id,
          product_id,
        }),
      ]);

      if (!product) {
        throw new BadRequestException({
          message: 'Cannot find item',
          statusCode: 400,
        });
      }

      return {
        product,
        reviews: reviews,
        favorite: favorite.detail,
      };
    } catch (error) {
      console.error('Error fetching product:', error);

      // Re-throw known exceptions
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Handle unexpected exceptions
      throw new InternalServerErrorException({
        message: 'Error fetching product',
        statusCode: 500,
      });
    }
  }

  async getTrendingProduct() {
    try {
      // Fetch the top 4 products sorted by the 'sale_out' field in descending order
      const trendingProducts = await this.productModel
        .find()
        .sort({ sale_out: -1 })
        .limit(8);

      return trendingProducts;
    } catch (error) {
      console.error('Error fetching trending products:', error);
      throw new InternalServerErrorException({
        message: 'Error fetching trending products',
        statusCode: 500,
      });
    }
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    session?: any,
  ): Promise<Product> {
    const product = await this.productModel.findById(id);

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    Object.assign(product, updateProductDto);

    try {
      const updatedProduct = await product.save({ session });

      return updatedProduct;
    } catch (error) {
      console.error('Error updating product:', error);

      throw new BadRequestException('Failed to update the product');
    }
  }

  // async update(
  //   id: string,
  //   updateProductDto: UpdateProductDto,
  //   session?: any, // เพิ่ม parameter สำหรับ session
  // ): Promise<Product> {
  //   const product = await this.productModel.findById(id);

  //   if (!product) {
  //     throw new NotFoundException(`Product with ID ${id} not found`);
  //   }

  //   Object.assign(product, updateProductDto);

  //   try {
  //     // หากมี session ให้ใช้ session ในการทำการบันทึก
  //     const updatedProduct = await product.save({ session });

  //     // หากมี session ต้องทำการ commit ธุรกรรม
  //     if (session) {
  //       await session.commitTransaction();
  //     }

  //     return updatedProduct;
  //   } catch (error) {
  //     console.error('Error updating product:', error);
  //     // หากมี session ต้องทำการ rollback ในกรณีที่เกิดข้อผิดพลาด
  //     if (session) {
  //       await session.abortTransaction();
  //     }
  //     throw new BadRequestException('Failed to update the product');
  //   }
  // }

  async remove(id: string) {
    validateObjectId(id, 'Product');

    const product = await this.productModel.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    try {
      const removeImagePromises = product.images.map(async (file) => {
        await this.cloudinaryService.deleteImage(file.public_id);
      });

      await Promise.all(removeImagePromises);

      await this.productModel.findByIdAndDelete(id);

      return `This action removes a product with ID #${id}`;
    } catch (error) {
      console.error('Error removing product:', error);
      throw new InternalServerErrorException('Error removing product');
    }
  }
}
