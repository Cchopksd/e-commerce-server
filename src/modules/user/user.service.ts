import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, UpdateUserPasswordDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/modules/user/schemas/user.schema';
import { Model } from 'mongoose';
import { hashPassword, verifyPassword } from 'src/utils/password.util';
import { Address, AddressDocument } from '../address/schemas/address.schema';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Address.name) private addressModel: Model<AddressDocument>,
    private cloudinaryService: CloudinaryService,
  ) {}
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

  async findAll() {
    const users = await this.userModel.find().exec();
    return {
      message: 'Get all users successfully',
      statusCode: HttpStatus.OK,
      detail: users,
    };
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

  async findUserDetail(id: string) {
    const user = await this.findOne(id);
    const address = await this.addressModel.find({ user_id: id });
    return {
      message: 'Get user detail successfully',
      statusCode: HttpStatus.OK,
      detail: { user, address },
    };
  }

  findByEmail(email: string): Promise<UserDocument | undefined> {
    const user = this.userModel.findOne({ email: email });
    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    return user;
  }

  async update(
    user_id: string,
    updateUserDto: UpdateUserDto,
    files: { images?: Express.Multer.File },
  ) {
    try {
      Number(updateUserDto.age);

      const user = await this.userModel.findById({ _id: user_id });
      if (!user) {
        throw new BadRequestException('User not found');
      }

      if (user.profile_image && user.profile_image.length > 0) {
        const { result } = await this.cloudinaryService.deleteImage(
          user.profile_image[0].public_id,
        );
        if (!result) {
          throw new Error('Failed to delete old profile image');
        }
      }

      let image = null;
      if (files?.images) {
        image = await this.cloudinaryService.uploadImage(
          files.images[0],
          'profiles',
        );
      }

      const updateUser = await this.userModel.updateOne(
        { _id: new Object(user_id) },
        {
          $set: {
            ...updateUserDto,
            profile_image: image ? [image] : user.profile_image,
          },
        },
      );

      if (updateUser.modifiedCount === 0) {
        throw new BadRequestException('Failed to update user information');
      }

      return {
        message: 'User information updated successfully',
        statusCode: HttpStatus.OK,
      };
    } catch (error) {
      console.error(error);
      throw new Error('Failed to update user');
    }
  }

  async updatePassword(
    user_id: string,
    updateUserPasswordDto: UpdateUserPasswordDto,
  ) {
    try {
      const user = await this.userModel.findById({ _id: new Object(user_id) });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      const matched = await verifyPassword(
        updateUserPasswordDto.old_password,
        user.password,
      );

      if (!matched) {
        throw new BadRequestException('Old password is incorrect');
      }

      const hashedPassword = await hashPassword(
        updateUserPasswordDto.new_password,
      );

      const updateUserPassword = await this.userModel.updateOne(
        { _id: new Object(user_id) },
        {
          $set: { password: hashedPassword },
        },
      );

      if (updateUserPassword.modifiedCount === 0) {
        throw new BadRequestException('Failed to update password');
      }

      return {
        message: 'Password updated successfully',
        statusCode: HttpStatus.OK,
      };
    } catch (error) {
      console.error(error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new Error('Failed to update user password');
    }
  }

  async remove(id: string) {
    const result = await this.userModel.deleteOne({ _id: id }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return `This action removes a user with ID #${id}`;
  }
}
