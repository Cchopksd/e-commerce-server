import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/modules/user/schemas/user.schema';
import { Model } from 'mongoose';
import { hashPassword } from 'src/utils/password.util';
import { Address, AddressDocument } from '../address/schemas/address.schema';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}
  async create(createUserDto: CreateUserDto) {
    const emailExist = await this.findByEmail(createUserDto.email);
    if (emailExist) {
      throw new ConflictException({
        message: 'email already existed',
        statusCode: 409,
      });
    }

    const hashedPassword = await hashPassword(createUserDto.password);

    const user = this.userModel.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return user;
  }

  findAll() {
    return this.userModel.find().exec();
  }

  async findOne(id: string) {
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      throw new BadRequestException({
        message: 'Invalid user ID format',
        statusCode: 400,
      });
    }
    const userInfo = await this.userModel.findById(id);
    if (!userInfo) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return userInfo;
  }

  findByEmail(email: string): Promise<UserDocument | undefined> {
    const user = this.userModel.findOne({ email: email });
    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    return user;
  }

  update(id: string, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  async remove(id: string) {
    const result = await this.userModel.deleteOne({ _id: id }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return `This action removes a user with ID #${id}`;
  }
}
