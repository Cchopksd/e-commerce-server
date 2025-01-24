import {
  BadRequestException,
  HttpCode,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import {
  UpdateProductDto,
  UpdateProductFormDataDto,
} from './dto/update-product.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { Model } from 'mongoose';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { validateObjectId } from 'src/helpers/objectIdHelper';
import { shuffleItems } from 'src/utils/shuffleArray.util';
import { FavoriteService } from '../favorite/favorite.service';
import { ReviewService } from '../review/review.service';
import { GetAllProductDto } from './dto/get-Product.dto';
import { CloudFlareService } from '../cloudflare/cloudflare.service';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private cloudinaryService: CloudinaryService,
    private cloudFlareService: CloudFlareService,
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
        this.cloudFlareService.uploadImage(
          file,
          `products/${createProductDto.category}`,
        ),
      );
      const uploadResults = await Promise.all(uploadImages);

      await this.productModel.create({
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

  async findAll(getAllProductDto: GetAllProductDto) {
    const { search, page, user_id, price } = getAllProductDto;

    const limit = 12; // Items per page
    const skip = (Number(page) - 1) * limit;

    try {
      // Define query for search and amount
      const query: any = {
        amount: { $gt: 0 }, // Only include products with amount > 0
      };

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }

      const sort: any = {};
      if (price) {
        sort.discount = price === 'asc' ? 1 : -1;
      } else if (price === 'desc') {
        sort.price = -1;
      }

      // Calculate total items
      const totalItems = await this.productModel.countDocuments(query).exec();

      const totalPages = Math.ceil(totalItems / limit);

      // Fetch products with pagination and sorting
      const products = await this.productModel
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec();

      if (user_id) {
        const favoriteProducts =
          await this.favoriteService.getFavoriteByUserAndProducts({
            user_id,
            product_ids: products.map((product) => product._id.toString()),
          });

        const productsWithFavorite = products.map((product) => ({
          ...product.toObject(),
          favorite:
            favoriteProducts.detail.find(
              (f) => f.product_id === product._id.toString(),
            )?.is_favorite || false,
        }));

        return {
          total_items: totalItems,
          total_page: totalPages,
          page_now: Number(page),
          items: productsWithFavorite,
        };
      }

      return {
        total_items: totalItems,
        total_page: totalPages,
        page_now: Number(page),
        items: products.map((product) => ({
          ...product.toObject(),
          favorite: false,
        })),
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
        this.favoriteService.getFavoriteByUserAndProducts({
          user_id,
          product_ids: [product_id],
        }),
      ]);

      if (!product) {
        throw new BadRequestException({
          message: 'Cannot find item',
          statusCode: 400,
        });
      }

      return {
        message: 'Get product successfully',
        statusCode: 200,
        detail: {
          product,
          reviews,
          favorite: favorite.detail[0].is_favorite,
        },
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

  async getTrendingProduct({ user_id }: { user_id: string }) {
    try {
      const trendingProducts = await this.productModel
        .find({ amount: { $gt: 0 } })
        .sort({ sale_out: -1 })
        .limit(8);

      if (!user_id) {
        return trendingProducts.map((product) => ({
          ...product.toObject(),
          favorite: false,
        }));
      }

      const favoriteProducts =
        await this.favoriteService.getFavoriteByUserAndProducts({
          user_id,
          product_ids: trendingProducts.map((product) =>
            product._id.toString(),
          ),
        });

      return trendingProducts.map((product) => {
        const favorite =
          favoriteProducts.detail.find(
            (f) => f.product_id === product._id.toString(),
          )?.is_favorite ?? false;
        return {
          ...product.toObject(),
          favorite,
        };
      });
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

    if (updateProductDto.discount >= updateProductDto.price) {
      throw new BadRequestException('Discount is not greater than price');
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

  async updatePaymentFailed({
    id,
    quantity,
  }: {
    id: string;
    quantity: number;
  }) {
    const product = await this.productModel.findById(id);

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    try {
      product.sale_out = product.sale_out - quantity;
      product.amount = product.amount + quantity;
      await product.save();

      return product;
    } catch (error) {
      console.error('Error updating product:', error);

      throw new BadRequestException('Failed to update the product');
    }
  }

  async updateProduct(
    id: string,
    updateProductDto: any,
    files: { images?: Express.Multer.File[] },
  ): Promise<Product> {
    const product = await this.productModel.findById(id);

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const { price, discount, amount, sale_out } = updateProductDto;

    const numericFields = {
      price: Number(price),
      discount: Number(discount),
      amount: Number(amount),
      sale_out: Number(sale_out),
    };

    if (numericFields.discount >= numericFields.price) {
      throw new BadRequestException('Discount must be less than price');
    }

    try {
      const uploadImages = files.images.map((file) =>
        this.cloudFlareService.uploadImage(
          file,
          `products/${updateProductDto.category}`,
        ),
      );
      const uploadResults = await Promise.all(uploadImages);

      Object.assign(product, {
        ...updateProductDto,
        ...numericFields,
        images: uploadResults,
      });

      return await product.save();
    } catch (error) {
      console.error('Error updating product:', error.message);
      throw new BadRequestException('Failed to update the product');
    }
  }

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

  async searchProductSuggestion(search: string) {
    try {
      const products = await this.productModel.aggregate([
        {
          $match: {
            $or: [
              { name: { $regex: search, $options: 'i' }, amount: { $gt: 0 } },
            ],
          },
        },
        {
          $group: {
            _id: '$name', // Group by name
            name: { $first: '$name' }, // Preserve the name field
          },
        },
        {
          $project: {
            _id: 0, // Exclude _id from the result
            name: 1, // Include name in the result
          },
        },
        {
          $sort: { name: 1 },
        },
        { $limit: 10 },
      ]);

      return {
        message: 'Get product suggestion successfully',
        statusCode: HttpStatus.OK,
        detail: products,
      };
    } catch (error) {
      console.error('Error searching product suggestion:', error);
      throw new InternalServerErrorException(
        'Error searching product suggestion',
      );
    }
  }
}
