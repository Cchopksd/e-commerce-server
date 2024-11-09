import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
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
    const limit = await this.addressModel.find({
      user_id: createAddressDto.user_id,
    });

    const isDuplicate = limit.some(
      (limit) => limit.name === createAddressDto.name,
    );

    if (isDuplicate) {
      throw new ConflictException(
        'Address name already exists. Please choose a different name.',
      );
    }

    if (limit.length >= 3) {
      throw new ConflictException('You can only have up to 3 addresses.');
    }

    const address = await this.addressModel.create(createAddressDto);

    return address;
  }

  async getUserAddress(user_id: any) {
    try {
      const address = await this.addressModel.find(user_id)
      return address;
    } catch (error) {
      console.error('Error fetching user address:', error);
      throw error;
    }
  }

  async findOne(id: string) {
    const userInfo = await this.addressModel.findById(id);
    if (!userInfo) {
      throw new NotFoundException(`Address with ID ${id} not found`);
    }
    return userInfo;
  }

  update(id: number, updateAddressDto: UpdateAddressDto) {
    return `This action updates a #${id} address`;
  }

  remove(id: number) {
    return `This action removes a #${id} address`;
  }

  async getPostsWithUsers() {
    return this.addressModel
      .aggregate([
        {
          $lookup: {
            from: 'users', // The collection name
            localField: 'user', // Field in the Post collection
            foreignField: '_id', // Field in the User collection
            as: 'userDetails',
          },
        },
      ])
      .exec();
  }

  async getProvinces(): Promise<any> {
    const url =
      'https://raw.githubusercontent.com/kongvut/thai-province-data/master/api_province_with_amphure_tambon.json';

    try {
      const response = await lastValueFrom(
        this.httpService.get(url).pipe(
          map((res) => res.data),
          catchError(() => {
            throw new HttpException(
              'Failed to fetch provinces data',
              HttpStatus.INTERNAL_SERVER_ERROR,
            );
          }),
        ),
      );
      return response;
    } catch (error) {
      throw new HttpException(
        'Failed to fetch provinces data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
