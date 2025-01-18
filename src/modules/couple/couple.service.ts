import {
  BadRequestException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Couple, CoupleDocument } from './schema/couple.schema';
import { Model } from 'mongoose';
import { CreateCoupleDto } from './dto/create-couple';
import { UpdateCoupleDto } from './dto/update-couple.dto';

@Injectable()
export class CoupleService {
  constructor(
    @InjectModel(Couple.name) private coupleModel: Model<CoupleDocument>,
  ) {}
  async createCouple(createCoupleDto: CreateCoupleDto) {
    try {
      const ExistCouple = await this.coupleModel.findOne({
        name: createCoupleDto.name,
      });

      if (ExistCouple) {
        throw new BadRequestException('Couple already exists');
      }

      const createdCouple = await this.coupleModel.create(createCoupleDto);
      return {
        message: 'Couple created successfully',
        statusCode: HttpStatus.CREATED,
        detail: createdCouple,
      };
    } catch (error) {
      console.error('Error creating couple:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create couple');
    }
  }

  async removeCoupleById(id: string) {
    try {
      const removedCouple = this.coupleModel.findByIdAndDelete(id);

      return removedCouple;
    } catch (error) {
      console.error('Error removing couple:', error);
      throw new InternalServerErrorException('Failed to remove couple');
    }
  }

  async updateCouple(updateCoupleDto: UpdateCoupleDto) {
    try {
      const updatedCouple = this.coupleModel.findOneAndUpdate(
        { _id: updateCoupleDto.id },
        { $set: { ...updateCoupleDto } },
        { new: true },
      );
      return updatedCouple;
    } catch (error) {
      console.error('Error updating couple:', error);
      throw new InternalServerErrorException('Failed to update couple');
    }
  }

  async retrieveCoupleByName(name: string) {
    try {
      const couple = this.coupleModel.findOne({ name: name });
      if (!couple) {
        throw new BadRequestException('Couple is not defined');
      }
      return couple;
    } catch (error) {
      console.error('Error getting couple:', error);
      throw new InternalServerErrorException('Failed to get couple');
    }
  }

  async getCoupleById(id: string) {
    try {
      const couple = this.coupleModel.findById(id);
      return couple;
    } catch (error) {
      console.error('Error getting couple:', error);
      throw new InternalServerErrorException('Failed to get couple');
    }
  }

  async getAllCouplesWithoutSpecialCouple() {
    try {
      const couples = this.coupleModel.find({ user_id: { $exists: false } });
      return couples;
    } catch (error) {
      console.error('Error getting couples:', error);
      throw new InternalServerErrorException('Failed to get couples');
    }
  }
}
