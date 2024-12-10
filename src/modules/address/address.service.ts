import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { map, catchError } from 'rxjs/operators';
import { lastValueFrom, Observable } from 'rxjs';

import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { UserService } from '../user/user.service';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { isValidObjectId, Model } from 'mongoose';
import { Address, AddressDocument } from './schemas/address.schema';
import { User, UserDocument } from '../user/schemas/user.schema';
import { Types } from 'mongoose';

@Injectable()
export class AddressService {
  constructor(
    @InjectModel(Address.name) private addressModel: Model<AddressDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly httpService: HttpService,
    private readonly userService: UserService,
  ) {}

  async create(createAddressDto: CreateAddressDto) {
    const addresses = await this.addressModel.find({
      user_id: createAddressDto.user_id,
    });

    // const isDuplicate = addresses.some(
    //   (address) => address.name === createAddressDto.name,
    // );

    // if (isDuplicate) {
    //   throw new ConflictException('Address name already exists');
    // }

    if (addresses.length >= 3) {
      throw new ConflictException('You can only have up to 3 addresses.');
    }

    if (createAddressDto.default) {
      await this.addressModel.updateMany(
        { user_id: createAddressDto.user_id },
        { default: false },
      );
    }

    return await this.addressModel.create(createAddressDto);
  }

  async getUserAddress(user_id: string) {
    if (!isValidObjectId(user_id)) {
      throw new BadRequestException('Invalid user ID');
    }

    try {
      const addresses = await this.addressModel
        .find({ user_id })
        .sort({ default: -1, createdAt: -1 });

      if (!addresses.length) {
        throw new NotFoundException(`No addresses found for user ${user_id}`);
      }

      return {
        message: 'Addresses retrieved successfully',
        statusCode: HttpStatus.OK,
        detail: addresses,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error fetching user addresses:', error);
      throw new InternalServerErrorException('Failed to fetch user addresses');
    }
  }

  async getUserAddressOnCart(user_id: string): Promise<any | string> {
    try {
      const address = await this.addressModel
        .findOne({ user_id, default: true })
        .populate('user_id');

      return address || [];
    } catch (error) {
      console.error('Error fetching user address:', error.message);
      throw new InternalServerErrorException('Unable to fetch user address');
    }
  }

  async findOne(user_id: string) {
    const userInfo = await this.addressModel.find({ user_id: user_id });
    if (!userInfo) {
      throw new NotFoundException(
        `Address with User ID ${{ user_id: user_id }} not found`,
      );
    }
    return userInfo;
  }

  async update(id: string, updateAddressDto: UpdateAddressDto) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid address ID');
    }

    const address = await this.addressModel.findById(id);
    if (!address) {
      throw new NotFoundException('Address not found');
    }

    if (updateAddressDto.default) {
      await this.addressModel.updateMany(
        { user_id: address.user_id },
        { default: false },
      );
    }

    return await this.addressModel.findByIdAndUpdate(id, updateAddressDto, {
      new: true,
    });
  }

  async remove(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid address ID');
    }

    const address = await this.addressModel.findById(id);
    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return await this.addressModel.findByIdAndDelete(id);
  }

  async getPostsWithUsers() {
    return this.addressModel
      .aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'userDetails',
          },
        },
      ])
      .exec();
  }
}
